"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authenticate } from "@/server/session";
import prisma from "@/prisma/prisma";

const CreateCategorySchema = z
    .object({
        name: z.string().trim().min(1, "Category name is required.").max(80, "Category name is too long."),
        level: z.enum(["CATEGORY", "SUBCATEGORY"]),
        parentId: z.string().optional(),
    })
    .superRefine((data, context) => {
        if (data.level === "SUBCATEGORY" && !data.parentId) {
            context.addIssue({
                code: "custom",
                path: ["parentId"],
                message: "A subcategory must have a parent category.",
            });
        }
    });

export type CategoryActionState = { error?: string; success?: string } | undefined;
export type CategoryBulkActionState = { error?: string; success?: string } | undefined;

async function requireInventoryManager() {
    const session = await authenticate();

    if (!session) {
        redirect("/login");
    }

    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") {
        redirect("/");
    }

    return session;
}

function revalidateInventoryPaths() {
    revalidatePath("/settings/inventory");
    revalidatePath("/inventory");
    revalidatePath("/inventory/[id]", "page");
}

export async function createCategory(_previousState: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
    await requireInventoryManager();

    const parsed = CreateCategorySchema.safeParse({
        name: formData.get("name"),
        level: formData.get("level"),
        parentId: formData.get("parentId") || undefined,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid category information." };
    }

    const { name, level, parentId } = parsed.data;
    const existingCategory = await prisma.category.findUnique({
        where: { name },
    });

    if (existingCategory) {
        return { error: "A category with that name already exists." };
    }

    let resolvedParentId: number | null = null;

    if (level === "SUBCATEGORY") {
        const parsedParentId = Number(parentId);

        if (!Number.isInteger(parsedParentId)) {
            return {
                error: "Invalid parent category.",
            };
        }

        const parent = await prisma.category.findUnique({
            where: { id: parsedParentId },
            select: {
                id: true,
                parentId: true,
            },
        });

        if (!parent) {
            return { error: "Parent category does not exist." };
        }

        if (parent.parentId !== null) {
            return { error: "Subcategories cannot contain other subcategories." };
        }

        resolvedParentId = parent.id;
    }

    await prisma.category.create({
        data: { name, parentId: resolvedParentId },
    });

    revalidateInventoryPaths();

    return { success: level === "CATEGORY" ? `${name} was created successfully.` : `${name} was created successfully as a subcategory.` };
}

export async function deleteCategory(categoryId: number): Promise<void> {
    await requireInventoryManager();

    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
            _count: {
                select: {
                    children: true,
                    items: true,
                },
            },
        },
    });

    if (!category) {
        return;
    }

    if (category._count.children > 0) {
        throw new Error("A category containing subcategories cannot be deleted.");
    }

    if (category._count.items > 0) {
        throw new Error("A subcategory containing inventory items cannot be deleted.");
    }

    await prisma.category.delete({
        where: { id: categoryId },
    });

    revalidateInventoryPaths();
}

export async function relocateSubcategory(subcategoryId: number, _previousState: CategoryBulkActionState, formData: FormData): Promise<CategoryBulkActionState> {
    await requireInventoryManager();
    const newParentId = Number(formData.get("parentId"));

    if (!Number.isInteger(newParentId)) {
        return { error: "Select a valid parent category." };
    }

    const [subcategory, newParent] = await Promise.all([
        prisma.category.findUnique({
            where: { id: subcategoryId },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        }),

        prisma.category.findUnique({
            where: { id: newParentId },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        }),
    ]);

    if (!subcategory || subcategory.parentId === null) {
        return { error: "Only subcategories can be relocated." };
    }

    if (!newParent || newParent.parentId !== null) {
        return { error: "The new parent must be a top-level category" };
    }

    if (subcategory.parentId === newParent.id) {
        return { error: `${subcategory.name} is already under ${newParent.name}.` };
    }

    await prisma.category.update({
        where: { id: subcategory.id },
        data: { parentId: newParent.id },
    });

    revalidateInventoryPaths();

    return { success: `${subcategory.name} was moved under ${newParent.name}` };
}

export async function moveAllItems(sourceSubcategoryId: number, _previousState: CategoryBulkActionState, formData: FormData): Promise<CategoryBulkActionState> {
    await requireInventoryManager();
    const targetSubcategoryId = Number(formData.get("targetCategoryId"));

    if (!Number.isInteger(targetSubcategoryId)) {
        return { error: "Select a valid destination subcategory" };
    }

    if (sourceSubcategoryId === targetSubcategoryId) {
        return { error: "Source and destination subcategories must be different" };
    }

    const [source, target] = await Promise.all([
        prisma.category.findUnique({
            where: { id: sourceSubcategoryId },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        }),

        prisma.category.findUnique({
            where: { id: targetSubcategoryId },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        }),
    ]);

    if (!source || source.parentId === null) {
        return { error: "The source must be a subcategory" };
    }

    if (!target || target.parentId === null) {
        return { error: "The destination must be a subcategory" };
    }

    const result = await prisma.item.updateMany({
        where: { categoryId: source.id },
        data: { categoryId: target.id },
    });

    revalidateInventoryPaths();

    return {
        success: result.count === 0 ? `${source.name} did not contain any parts to move.` : `${result.count} ${result.count === 1 ? "part was" : "parts were"} moved from ${source.name} to ${target.name}.`,
    };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteAllItems(sourceSubcategoryId: number, _previousState: CategoryBulkActionState, _formData: FormData): Promise<CategoryBulkActionState> {
    await requireInventoryManager();

    const source = await prisma.category.findUnique({
        where: { id: sourceSubcategoryId },
        select: {
            id: true,
            name: true,
            parentId: true,
            _count: {
                select: { items: true },
            },
        },
    });

    if (!source || source.parentId === null) {
        return { error: "Only subcategories can directly contain parts" };
    }

    if (source._count.items === 0) {
        return { success: `${source.name} does not contain any parts` };
    }

    const itemWithProjectHistory = await prisma.item.findFirst({
        where: {
            categoryId: source.id,
            checkouts: { some: {} },
        },
        select: { id: true },
    });

    if (itemWithProjectHistory) {
        return { error: "These parts cannot be deleted because one or more have project checkout history. Move the parts to another subcategory instead so project history is preserved." };
    }

    const result = await prisma.item.deleteMany({
        where: { categoryId: source.id },
    });

    revalidateInventoryPaths();

    return { success: `${result.count} ${result.count === 1 ? "part was" : "parts were"} deleted from ${source.name}.` };
}
