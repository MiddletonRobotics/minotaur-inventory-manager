"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "./audit";
import { createActionLogger } from "@/server/action-logger";

import { authenticate, Session } from "@/server/session";
import prisma from "@/prisma/prisma";

const categoryLogger = createActionLogger("categories");
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
    revalidatePath("/audit");
}

export async function createCategory(_previousState: CategoryActionState, formData: FormData): Promise<CategoryActionState> {
    const session: Session = await requireInventoryManager();

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
        categoryLogger.rejected(session, "Category creation", "category_name_not_unique", {
            categoryId: existingCategory.id,
            categoryName: existingCategory.name
        });

        return { error: "A category with that name already exists." };
    }

    let parentName: string | null = null;
    let resolvedParentId: number | null = null;

    if (level === "SUBCATEGORY") {
        const parsedParentId = Number(parentId);

        if (!Number.isInteger(parsedParentId)) {
            categoryLogger.rejected(session, "Category creation", "category_name_not_unique", {
                targetCategoryId: parsedParentId
            });

            return { error: "Invalid parent category." };
        }

        const parent = await prisma.category.findUnique({
            where: { id: parsedParentId },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        });

        if (!parent) {
            categoryLogger.rejected(session, "Category creation", "category_does_not_exist", {
                targetUserId: session.user.id
            });

            return { error: "Parent category does not exist." };
        }

        if (parent.parentId !== null) {
            categoryLogger.rejected(session, "Category creation", "subcategories_cannot_be_nested", {
                categoryId: parent.id,
                categoryName: parent.name,
            });

            return { error: "Subcategories cannot contain other subcategories." };
        }

        resolvedParentId = parent.id;
        parentName = parent.name;
    }

    await prisma.$transaction(async (tx) => {
        const category = await tx.category.create({
            data: {
                name,
                parentId: resolvedParentId,
            },
        });

        const isSubcategory = level === "SUBCATEGORY";

        await writeAuditLog(tx, {
            action: isSubcategory ? "SUBCATEGORY_CREATED" : "CATEGORY_CREATED",
            entityId: category.id,
            entityName: category.name,
            summary: isSubcategory ? `Created subcategory "${category.name}" under "${parentName}".` : `Created category "${category.name}".`,
            performedById: Number(session.user.id),
            details: isSubcategory ? { parentId: resolvedParentId!,  parentName: parentName! } : { level: "CATEGORY" },
        });

        categoryLogger.completed(session, "Category creation", {
            categoryId: category.id,
            categoryName: category.name,
        });
    });

    revalidateInventoryPaths();

    return { success: level === "CATEGORY" ? `${name} was created successfully.` : `${name} was created successfully as a subcategory.` };
}

export async function deleteCategory(categoryId: number): Promise<void> {
    const session: Session = await requireInventoryManager();

    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        include: {
            parent: {
                select: {
                    name: true,
                },
            },
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
        categoryLogger.rejected(session, "Category deletion", "category_contains_parts", {
            categoryId: category.id,
            categoryName: category.name,
        });

        throw new Error("A category containing subcategories cannot be deleted.");
    }

    if (category._count.items > 0) {
        categoryLogger.rejected(session, "Category deletion", "subcategory_contains_parts", {
            categoryId: category.id,
            categoryName: category.name,
        });

        throw new Error("A subcategory containing inventory items cannot be deleted.");
    }

    await prisma.$transaction(async (tx) => {
        const isSubcategory = category.parentId !== null;

        await writeAuditLog(tx, {
            action: isSubcategory ? "SUBCATEGORY_DELETED" : "CATEGORY_DELETED",
            entityId: category.id,
            entityName: category.name,
            summary: isSubcategory ? `Deleted subcategory "${category.name}" from "${category.parent?.name}".` : `Deleted category "${category.name}".`,
            performedById: Number(session.user.id),
            details: isSubcategory
                ? {
                      parentName: category.parent?.name ?? "",
                  }
                : {
                      level: "CATEGORY",
                  },
        });

        await tx.category.delete({
            where: { id: category.id },
        });
    });

    categoryLogger.completed(session, "Category deletion", {
        categoryId: category.id,
        categoryName: category.name,
    });

    revalidateInventoryPaths();
}

export async function relocateSubcategory(subcategoryId: number, _previousState: CategoryBulkActionState, formData: FormData): Promise<CategoryBulkActionState> {
    const session = await requireInventoryManager();
    const newParentId = Number(formData.get("parentId"));

    if (!Number.isInteger(newParentId)) {
        await categoryLogger.rejected(session, "Subcategory relocation", "invalid_parent_id", {
            subcategoryId,
        });

        return { error:"Select a valid parent category." };
    }

    const [subcategory, newParent] = await Promise.all([
        prisma.category.findUnique({
            where: {
                id: subcategoryId,
            },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        }),

        prisma.category.findUnique({
            where: {
                id: newParentId,
            },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        }),
    ]);

    if (!subcategory || subcategory.parentId === null) {
        await categoryLogger.rejected(session, "Subcategory relocation", "invalid_subcategory", {
            subcategoryId,
            newParentId,
        });

        return { error: "Only subcategories can be relocated." };
    }

    if (!newParent || newParent.parentId !== null) {
        await categoryLogger.rejected(session, "Subcategory relocation", "invalid_destination_parent", {
            subcategoryId,
            newParentId,
        });

        return { error: "The new parent must be a top-level category" };
    }

    if (subcategory.parentId === newParent.id) {
        return { error: `${subcategory.name} is already under ${newParent.name}.` };
    }

    const previousParentId = subcategory.parentId;

    await prisma.category.update({
        where: {
            id: subcategory.id,
        },
        data: {
            parentId: newParent.id,
        },
    });

    await categoryLogger.completed(session, "Subcategory relocation", {
        subcategoryId: subcategory.id,
        previousParentId,
        newParentId: newParent.id,
    });

    revalidateInventoryPaths();

    return { success: `${subcategory.name} was moved under ${newParent.name}` };
}

export async function moveAllItems(sourceSubcategoryId: number, _previousState: CategoryBulkActionState, formData: FormData): Promise<CategoryBulkActionState> {
    const session = await requireInventoryManager();
    const targetSubcategoryId = Number(formData.get("targetCategoryId"));

    if (!Number.isInteger(targetSubcategoryId)) {
        await categoryLogger.rejected(session, "Bulk part move", "invalid_destination", {
            sourceSubcategoryId,
        }); 

        return { error: "Select a valid destination subcategory" };
    }

    if (sourceSubcategoryId === targetSubcategoryId) {
        await categoryLogger.rejected(session, "Bulk part move", "same_source_and_destination", { sourceSubcategoryId });
        return { error: "Source and destination subcategories must be different" };
    }

    const [source, target] = await Promise.all([
        prisma.category.findUnique({
            where: {
                id: sourceSubcategoryId,
            },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        }),

        prisma.category.findUnique({
            where: {
                id: targetSubcategoryId,
            },
            select: {
                id: true,
                name: true,
                parentId: true,
            },
        }),
    ]);

    if (!source || source.parentId === null) {
        await categoryLogger.rejected(session, "Bulk part move", "invalid_source", {
            sourceSubcategoryId,
            targetSubcategoryId,
        });

        return { error: "The source must be a subcategory" };
    }

    if (!target || target.parentId === null) {
        await categoryLogger.rejected(session, "Bulk part move", "invalid_destination", {
            sourceSubcategoryId,
            targetSubcategoryId,
        });

        return { error: "The destination must be a subcategory" };
    }

    const result = await prisma.item.updateMany({
        where: {
            categoryId: source.id,
        },
        data: {
            categoryId: target.id,
        },
    });

    await categoryLogger.completed(session, "Bulk part move", {
        sourceCategoryId: source.id,
        destinationCategoryId: target.id,
        itemsMoved: result.count,
    });

    revalidateInventoryPaths();

    return { success: result.count === 0 ? `${source.name} did not contain any parts to move.` : `${result.count} ${result.count === 1 ? "part was" : "parts were"} moved from ${source.name} to ${target.name}.` };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteAllItems(sourceSubcategoryId: number, _previousState: CategoryBulkActionState, _formData: FormData): Promise<CategoryBulkActionState> {
    const session: Session = await requireInventoryManager();

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
        await categoryLogger.rejected(session, "Bulk part deletion", "invalid_source", { sourceSubcategoryId });
        return { error: "Only subcategories can directly contain parts" };
    }

    if (source._count.items === 0) {
        return { success: `${source.name} does not contain any parts` };
    }

    const itemWithHistory = await prisma.item.findFirst({
        where: {
            categoryId: source.id,
            OR: [
                {
                    checkouts: { some: {} },
                },
                {
                    adjustments: { some: {} },
                },
            ],
        },
        select: { id: true },
    });

    if (itemWithHistory) {
        await categoryLogger.rejected(session, "Bulk part deletion", "inventory_history_exists", {
            sourceSubcategoryId: source.id,
            blockingItemId: itemWithHistory.id,
        });

        return { error: "These parts cannot be deleted because one or more have inventory or project history." };
    }

    const items = await prisma.item.findMany({
        where: { categoryId: source.id },
        select: {
            id: true,
            name: true,
            partNumber: true,
            quantity: true,
        },
    });

    const result = await prisma.$transaction(async (tx) => {
        for (const item of items) {
            await writeAuditLog(tx, {
                action: "PART_DELETED",
                entityId: item.id,
                entityName: item.name,
                summary: `Deleted part "${item.name}" (${item.partNumber}) from ${source.name}.`,
                performedById: Number(session.user.id),
                details: {
                    partNumber: item.partNumber,
                    quantity: item.quantity,
                    categoryId: source.id,
                    category: source.name,
                },
            });
        }

        return tx.item.deleteMany({
            where: {
                categoryId: source.id,
            },
        });
    });

    await categoryLogger.completed(session, "Bulk part deletion", {
        sourceSubcategoryId: source.id,
        itemsDeleted: result.count,
    });

    revalidateInventoryPaths();

    return { success: `${result.count} ${result.count === 1 ? "part was" : "parts were"} deleted from ${source.name}.` };
}
