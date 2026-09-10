"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import prisma from "@/prisma/prisma";
import { authenticate } from "@/server/session";

const ItemSchema = z.object({
    name: z.string().trim().min(1, "Part name is required.").max(100),
    partNumber: z.string().trim().min(1, "Part number is required.").max(100),
    vendorId: z.coerce.number().int().positive(),
    locationId: z.string().trim().optional(),
    description: z.string().trim().max(500).optional(),
});

const CreateItemSchema = ItemSchema.extend({
    quantity: z.coerce.number().int().min(0, "Quantity cannot be negative."),
});

const AdjustmentSchema = z.object({
    quantityDelta: z.coerce
        .number()
        .int()
        .refine((value) => value !== 0, "Adjustment cannot be zero."),
    reason: z.string().trim().max(300).optional(),
});

export type CreateItemState = { error?: string } | undefined;
export type ItemActionState = { error?: string; success?: string } | undefined;

async function requireInventoryManager() {
    const session = await authenticate();

    if (!session) redirect("/login");
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") redirect("/");

    return session;
}

function revalidateItemPaths(categoryId: number) {
    revalidatePath(`/inventory/${categoryId}`);
    revalidatePath("/inventory");
    revalidatePath("/settings/inventory");
}

async function validateVendorAndLocation(vendorId: number, locationId?: string) {
    const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
    });

    if (!vendor || !vendor.active) {
        return { error: "Select a valid vendor." };
    }

    let parsedLocationId: number | null = null;

    if (locationId) {
        parsedLocationId = Number(locationId);

        if (!Number.isInteger(parsedLocationId)) {
            return { error: "Select a valid storage location." };
        }

        const location = await prisma.storageLocation.findUnique({
            where: { id: parsedLocationId },
        });

        if (!location || !location.active) {
            return { error: "Select a valid storage location." };
        }
    }

    return { vendorId: vendor.id, locationId: parsedLocationId };
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
        vendorId: formData.get("vendorId"),
        locationId: formData.get("locationId") || undefined,
        description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid part information." };
    }

    const { name, partNumber, quantity, vendorId, locationId, description } = parsed.data;
    const existingPart = await prisma.item.findUnique({
        where: { partNumber },
    });

    if (existingPart) {
        return { error: "A part with that part number already exists." };
    }

    const relations = await validateVendorAndLocation(vendorId, locationId);

    if ("error" in relations) {
        return { error: relations.error };
    }

    await prisma.item.create({
        data: {
            name,
            partNumber,
            quantity,
            vendorId: relations.vendorId,
            locationId: relations.locationId,
            categoryId,
            description: description ?? "",
            material: null,
        },
    });

    revalidateItemPaths(categoryId);
    redirect(`/inventory/${categoryId}`);
}

export async function editItem(itemId: number, categoryId: number, _previousState: ItemActionState, formData: FormData): Promise<ItemActionState> {
    await requireInventoryManager();

    const item = await prisma.item.findUnique({
        where: { id: itemId },
    });

    if (!item || item.categoryId !== categoryId) {
        return { error: "Part does not exist." };
    }

    const parsed = ItemSchema.safeParse({
        name: formData.get("name"),
        partNumber: formData.get("partNumber"),
        vendorId: formData.get("vendorId"),
        locationId: formData.get("locationId") || undefined,
        description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid part information." };
    }

    const { name, partNumber, vendorId, locationId, description } = parsed.data;
    const duplicate = await prisma.item.findFirst({
        where: {
            partNumber,
            id: { not: itemId },
        },
    });

    if (duplicate) {
        return { error: "Another part already uses that part number." };
    }

    const relations = await validateVendorAndLocation(vendorId, locationId);

    if ("error" in relations) {
        return { error: relations.error };
    }

    await prisma.item.update({
        where: { id: itemId },
        data: {
            name,
            partNumber,
            vendorId: relations.vendorId,
            locationId: relations.locationId,
            description: description ?? "",
        },
    });

    revalidateItemPaths(categoryId);

    return { success: "Part updated." };
}

export async function adjustItemQuantity(itemId: number, categoryId: number, _previousState: ItemActionState, formData: FormData): Promise<ItemActionState> {
    const session = await requireInventoryManager();
    const parsed = AdjustmentSchema.safeParse({
        quantityDelta: formData.get("quantityDelta"),
        reason: formData.get("reason") || undefined,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid adjustment." };
    }

    const { quantityDelta, reason } = parsed.data;

    const result = await prisma.$transaction(async (tx) => {
        const item = await tx.item.findUnique({
            where: { id: itemId },
            include: {
                checkouts: {
                    where: {
                        project: { status: "ACTIVE" },
                    },
                    select: { quantityCheckedOut: true },
                },
            },
        });

        if (!item || item.categoryId !== categoryId) {
            return { error: "Part does not exist." };
        }

        const newQuantity = item.quantity + quantityDelta;

        if (newQuantity < 0) {
            return { error: "Total quantity cannot be negative." };
        }

        const used = item.checkouts.reduce((total, checkout) => total + checkout.quantityCheckedOut, 0);

        if (newQuantity < used) {
            return { error: `Quantity cannot be below ${used} because that many are currently allocated to active projects.` };
        }

        await tx.item.update({
            where: { id: item.id },
            data: { quantity: newQuantity },
        });

        await tx.inventoryAdjustment.create({
            data: {
                itemId: item.id,
                quantityDelta,
                previousQuantity: item.quantity,
                newQuantity,
                reason: reason ?? null,
                adjustedById: Number(session.user.id),
            },
        });

        return { success: `Quantity changed from ${item.quantity} to ${newQuantity}.` };
    });

    if ("error" in result) {
        return result;
    }

    revalidateItemPaths(categoryId);

    return result;
}

export async function deleteItem(itemId: number, categoryId: number, _previousState: ItemActionState, _formData: FormData): Promise<ItemActionState> {
    await requireInventoryManager();

    const item = await prisma.item.findUnique({
        where: { id: itemId },
        select: {
            id: true,
            name: true,
            categoryId: true,
            _count: {
                select: {
                    checkouts: true,
                    adjustments: true,
                },
            },
        },
    });

    if (!item || item.categoryId !== categoryId) {
        return { error: "This part does not exist in this subcategory." };
    }

    if (item._count.checkouts > 0 || item._count.adjustments > 0) {
        return { error: "This part cannot be deleted because it has inventory history." };
    }

    await prisma.item.delete({
        where: { id: item.id },
    });

    revalidateItemPaths(categoryId);

    return { success: `${item.name} was deleted.` };
}
