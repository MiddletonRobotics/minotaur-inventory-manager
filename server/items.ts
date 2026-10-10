"use server";

import { formatItemFieldValue, itemFieldInputName } from "@/lib/itemFields";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import prisma from "@/prisma/prisma";
import { authenticate, Session } from "@/server/session";
import { writeAuditLog } from "./audit";
import { createActionLogger } from "@/server/action-logger";
import { z } from "zod";

const itemLogger = createActionLogger("items");
const ItemSchema = z.object({
    name: z.string().trim().max(100).optional(),
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

type ParsedItemFieldValue = { fieldDefinitionId: number; value: string };
type ActiveItemField = {
    id: number;
    key: string;
    label: string;
    type: "TEXT" | "INTEGER" | "DECIMAL" | "SELECT";
    required: boolean;
    unit: string | null;
    options: unknown;
};

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
    revalidatePath("/audit");
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

function getSelectOptions(options: unknown): string[] {
    return Array.isArray(options) ? options.filter((option): option is string => typeof option === "string") : [];
}

function parseItemFieldValues(fields: ActiveItemField[], formData: FormData): { values: ParsedItemFieldValue[]; valuesByKey: Map<string, string>; error?: string } {
    const values: ParsedItemFieldValue[] = [];
    const valuesByKey = new Map<string, string>();

    for (const field of fields) {
        const rawValue = formData.get(itemFieldInputName(field.id));
        const value = typeof rawValue === "string" ? rawValue.trim() : "";

        if (!value) {
            if (field.required) {
                return { values, valuesByKey, error: `${field.label} is required.` };
            }

            continue;
        }

        let normalizedValue = value;

        if (field.type === "INTEGER") {
            const number = Number(value);

            if (!Number.isInteger(number)) {
                return { values, valuesByKey, error: `${field.label} must be a whole number.` };
            }

            normalizedValue = String(number);
        } else if (field.type === "DECIMAL") {
            const number = Number(value);

            if (!Number.isFinite(number)) {
                return { values, valuesByKey, error: `${field.label} must be a number.` };
            }

            normalizedValue = String(number);
        } else if (field.type === "SELECT") {
            const options = getSelectOptions(field.options);

            if (!options.includes(value)) {
                return { values, valuesByKey, error: `Select a valid ${field.label.toLowerCase()}.` };
            }
        }

        values.push({ fieldDefinitionId: field.id, value: normalizedValue });
        valuesByKey.set(field.key, normalizedValue);
    }

    return { values, valuesByKey };
}

function buildGeneratedName(template: string, fields: ActiveItemField[], valuesByKey: Map<string, string>): string | null {
    const fieldsByKey = new Map(fields.map((field) => [field.key, field]));

    let complete = true;
    const generatedName = template.replace(/\{([a-z][a-z0-9_]*)\}/g, (_match, key: string) => {
        const field = fieldsByKey.get(key);
        const value = valuesByKey.get(key);

        if (!field || !value) {
            complete = false;
            return "";
        }

        return formatItemFieldValue(value, field.unit);
    });

    if (!complete) return null;

    return generatedName.replace(/\s+/g, " ").trim();
}

function resolveItemName(manualName: string | undefined, nameTemplate: string | null, fields: ActiveItemField[], valuesByKey: Map<string, string>): { name?: string; error?: string } {
    const name = nameTemplate ? buildGeneratedName(nameTemplate, fields, valuesByKey) : manualName?.trim();

    if (!name) {
        return { error: nameTemplate ? "Complete all fields used by the generated part name." : "Part name is required." };
    }

    if (name.length > 100) {
        return { error: "Generated part name cannot exceed 100 characters." };
    }

    return { name };
}

export async function createItem(categoryId: number, _previousState: CreateItemState, formData: FormData): Promise<CreateItemState> {
    const session: Session = await requireInventoryManager();
    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: {
            name: true,
            nameTemplate: true,
            parentId: true,
            parent: {
                select: { name: true },
            },
            itemFields: {
                where: { active: true },
                orderBy: {
                    sortOrder: "asc",
                },
                select: {
                    id: true,
                    key: true,
                    label: true,
                    type: true,
                    required: true,
                    unit: true,
                    options: true,
                },
            },
            _count: {
                select: {
                    children: true,
                },
            },
        },
    });

    if (!category || category.parentId === null || category._count.children > 0) {
        return { error: "Parts can only be added to subcategories." };
    }

    const parsed = CreateItemSchema.safeParse({
        name: formData.get("name") || undefined,
        partNumber: formData.get("partNumber"),
        quantity: formData.get("quantity"),
        vendorId: formData.get("vendorId"),
        locationId: formData.get("locationId") || undefined,
        description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid part information." };
    }

    const customFields = parseItemFieldValues(category.itemFields, formData);

    if (customFields.error) {
        return { error: customFields.error };
    }

    const resolvedName = resolveItemName(parsed.data.name, category.nameTemplate, category.itemFields, customFields.valuesByKey);

    if (!resolvedName.name) {
        return { error: resolvedName.error ?? "Part name is required." };
    }

    const partName = resolvedName.name;
    const { partNumber, quantity, vendorId, locationId, description } = parsed.data;
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

    await prisma.$transaction(async (tx) => {
        const item = await tx.item.create({
            data: {
                name: partName,
                partNumber,
                quantity,
                vendorId: relations.vendorId,
                locationId: relations.locationId,
                categoryId,
                description: description ?? "",
                material: null,
                itemFieldValues: {
                    create: customFields.values,
                },
            },
        });

        const categoryName = category.parent ? `${category.parent.name} / ${category.name}` : category.name;
        await writeAuditLog(tx, {
            action: "PART_CREATED",
            entityId: item.id,
            entityName: item.name,
            summary: `Created part "${item.name}" (${item.partNumber}) with quantity ${item.quantity} in ${categoryName}.`,
            performedById: Number(session.user.id),
            details: {
                partNumber: item.partNumber,
                quantity: item.quantity,
                categoryId,
                category: categoryName,
            },
        });
    });

    revalidateItemPaths(categoryId);
    redirect(`/inventory/${categoryId}`);
}

export async function editItem(itemId: number, categoryId: number, _previousState: ItemActionState, formData: FormData): Promise<ItemActionState> {
    const session = await requireInventoryManager();
    const item = await prisma.item.findUnique({
        where: { id: itemId },
        include: {
            itemFieldValues: true,
            category: {
                select: {
                    nameTemplate: true,
                    itemFields: {
                        where: { active: true },
                        orderBy: {
                            sortOrder: "asc",
                        },
                        select: {
                            id: true,
                            key: true,
                            label: true,
                            type: true,
                            required: true,
                            unit: true,
                            options: true,
                        },
                    },
                },
            },
        },
    });

    if (!item || item.categoryId !== categoryId) {
        await itemLogger.rejected(session, "Part edit", "part_not_found", {
            itemId,
            categoryId,
        });

        return { error: "Part does not exist." };
    }

    const parsed = ItemSchema.safeParse({
        name: formData.get("name") || undefined,
        partNumber: formData.get("partNumber"),
        vendorId: formData.get("vendorId"),
        locationId: formData.get("locationId") || undefined,
        description: formData.get("description") || undefined,
    });

    if (!parsed.success) {
        await itemLogger.rejected(session, "Part edit", "invalid_form_data", {
            itemId,
            categoryId,
        });

        return { error: parsed.error.issues[0]?.message ?? "Invalid part information." };
    }

    const customFields = parseItemFieldValues(item.category.itemFields, formData);

    if (customFields.error) {
        await itemLogger.rejected(session, "Part edit", "invalid_custom_field", {
            itemId,
            categoryId,
        });

        return { error: customFields.error };
    }

    const resolvedName = resolveItemName(parsed.data.name, item.category.nameTemplate, item.category.itemFields, customFields.valuesByKey);

    if (!resolvedName.name) {
        return { error: resolvedName.error ?? "Part name is required." };
    }

    const { partNumber, vendorId, locationId, description } = parsed.data;
    const duplicate = await prisma.item.findFirst({
        where: {
            partNumber,
            id: {
                not: itemId,
            },
        },
    });

    if (duplicate) {
        await itemLogger.rejected(session, "Part edit", "duplicate_part_number", {
            itemId,
            conflictingItemId: duplicate.id,
        });

        return { error: "Another part already uses that part number." };
    }

    const relations = await validateVendorAndLocation(vendorId, locationId);

    if ("error" in relations) {
        await itemLogger.rejected(session, "Part edit", "invalid_relation", {
            itemId,
            vendorId,
            locationId: locationId ?? null,
        });

        return { error: relations.error };
    }

    const nextDescription = description ?? "";
    const changedFields: string[] = [];
    const currentCustomValues = new Map(item.itemFieldValues.map((value) => [value.fieldDefinitionId, value.value]));

    const nextCustomValues = new Map(customFields.values.map((value) => [value.fieldDefinitionId, value.value]));

    const customValuesChanged = item.category.itemFields.some((field) => (currentCustomValues.get(field.id) ?? "") !== (nextCustomValues.get(field.id) ?? ""));

    if (item.name !== resolvedName.name) {
        changedFields.push("name");
    }

    if (item.partNumber !== partNumber) {
        changedFields.push("partNumber");
    }

    if (item.vendorId !== relations.vendorId) {
        changedFields.push("vendorId");
    }

    if (item.locationId !== relations.locationId) {
        changedFields.push("locationId");
    }

    if (item.description !== nextDescription) {
        changedFields.push("description");
    }

    if (customValuesChanged) {
        changedFields.push("partFields");
    }

    await prisma.$transaction(async (tx) => {
        await tx.item.update({
            where: { id: itemId },
            data: {
                name: resolvedName.name,
                partNumber,
                vendorId: relations.vendorId,
                locationId: relations.locationId,
                description: nextDescription,
            },
        });

        for (const field of item.category.itemFields) {
            const value = nextCustomValues.get(field.id);

            if (value === undefined) {
                await tx.itemFieldValue.deleteMany({
                    where: {
                        itemId,
                        fieldDefinitionId: field.id,
                    },
                });
            } else {
                await tx.itemFieldValue.upsert({
                    where: {
                        itemId_fieldDefinitionId: {
                            itemId,
                            fieldDefinitionId: field.id,
                        },
                    },
                    update: { value },
                    create: {
                        itemId,
                        fieldDefinitionId: field.id,
                        value,
                    },
                });
            }
        }
    });

    if (changedFields.length > 0) {
        await itemLogger.completed(session, "Part edit", {
            itemId,
            categoryId,
            changedFields,
        });
    } else {
        await itemLogger.debug(session, "Part edit contained no changes", {
            itemId,
            categoryId,
        });
    }

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

    if (result?.error) {
        await itemLogger.rejected(session, "Quantity adjustment", result.error, {
            itemId,
            categoryId,
            quantityDelta,
        });

        return result;
    }

    revalidateItemPaths(categoryId);

    return result;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deleteItem(itemId: number, categoryId: number, _previousState: ItemActionState, _formData: FormData): Promise<ItemActionState> {
    const session: Session = await requireInventoryManager();

    const item = await prisma.item.findUnique({
        where: { id: itemId },
        select: {
            id: true,
            name: true,
            partNumber: true,
            quantity: true,
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
        await itemLogger.rejected(session, "Part deletion", "part_not_found", {
            itemId,
            categoryId,
        });

        return { error: "This part does not exist in this subcategory." };
    }

    if (item._count.checkouts > 0 || item._count.adjustments > 0) {
        await itemLogger.rejected(session, "Part deletion", "inventory_history_exists", {
            itemId: item.id,
            checkoutCount: item._count.checkouts,
            adjustmentCount: item._count.adjustments,
        });

        return { error: "This part cannot be deleted because it has inventory history." };
    }

    await prisma.$transaction(async (tx) => {
        await writeAuditLog(tx, {
            action: "PART_DELETED",
            entityId: item.id,
            entityName: item.name,
            summary: `Deleted part "${item.name}" (${item.partNumber}), which had a quantity of ${item.quantity}.`,
            performedById: Number(session.user.id),
            details: {
                partNumber: item.partNumber,
                quantity: item.quantity,
                categoryId: item.categoryId,
            },
        });

        await tx.item.delete({
            where: { id: item.id },
        });
    });

    revalidateItemPaths(categoryId);

    return { success: `${item.name} was deleted.` };
}
