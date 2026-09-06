"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/prisma/prisma";
import { authenticate } from "@/server/session";

const CreateItemSchema = z.object({
    name: z.string().trim().min(1, "Part name is required.").max(100),
    partNumber: z.string().trim().min(1, "Part number is required.").max(100),
    quantity: z.coerce.number().int().min(0, "Quantity cannot be negative."),
    location: z.string().trim().max(80).optional(),
    vendor: z.enum(["WCP", "VEX", "ANDYMARK", "THRIFTYBOT", "REV", "CTRE", "MCMASTER", "LIMELIGHT"]),
});

export type CreateItemState = { error?: string } | undefined;
export type DeleteItemState = { error?: string; success?: string } | undefined;

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

export async function createItem(categoryId: number, _previousState: CreateItemState, formData: FormData): Promise<CreateItemState> {
    await requireInventoryManager();

    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: {
            parentId: true,
            _count: {
                select: { children: true },
            },
        },
    });

    if (!category || category.parentId === null || category._count.children > 0) {
        return { error: "Parts can only be added to subcategories." };
    }

    const parsed = CreateItemSchema.safeParse({
        name: formData.get("name"),
        partNumber: formData.get("partNumber"),
        quantity: formData.get("quantity"),
        location: formData.get("location") || undefined,
        vendor: formData.get("vendor"),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid part information." };
    }

    const { name, partNumber, quantity, location, vendor } = parsed.data;
    const existingPart = await prisma.item.findUnique({
        where: { partNumber },
    });

    if (existingPart) {
        return { error: "A part with that part number already exists." };
    }

    if (location) {
        const locationExists = await prisma.storageLocation.findUnique({
            where: { name: location },
            select: { id: true },
        });

        if (!locationExists) {
            return { error: "Select a valid storage location." };
        }
    }

    await prisma.item.create({
        data: {
            name,
            partNumber,
            quantity,
            location: location ?? null,
            vendor,
            categoryId,
            description: "",
            material: null,
        },
    });

    revalidatePath(`/inventory/${categoryId}`);
    revalidatePath("/inventory");
    redirect(`/inventory/${categoryId}`);
}

export async function deleteItem(itemId: number, categoryId: number, _previousState: DeleteItemState, _formData: FormData): Promise<DeleteItemState> {
    await requireInventoryManager();

    const item = await prisma.item.findUnique({
        where: { id: itemId },
        select: {
            id: true,
            name: true,
            categoryId: true,
            _count: {
                select: { checkouts: true },
            },
        },
    });

    if (!item || item.categoryId !== categoryId) {
        return { error: "This part does not exist in this subcategory." };
    }

    if (item._count.checkouts > 0) {
        return { error: "This part cannot be deleted because it has project history." };
    }

    await prisma.item.delete({
        where: { id: item.id },
    });

    revalidatePath(`/inventory/${categoryId}`);
    revalidatePath("/inventory");
    revalidatePath("/settings/inventory");

    return { success: `${item.name} was deleted.` };
}
