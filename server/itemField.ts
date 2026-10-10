"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import prisma from "@/prisma/prisma";
import { createActionLogger } from "@/server/action-logger";
import { writeAuditLog } from "@/server/audit";
import { authenticate, type Session } from "@/server/session";

const partFieldLogger = createActionLogger("part-fields");
const DraftFieldSchema = z.object({
    id: z.number().int().positive().optional(),
    key: z
        .string()
        .trim()
        .regex(/^[a-z][a-z0-9_]*$/, "Field keys must start with a letter and only contain lowercase letters, numbers, and underscores."),
    label: z.string().trim().min(1, "Field labels are required.").max(50),
    type: z.enum(["TEXT", "INTEGER", "DECIMAL", "SELECT"]),
    required: z.boolean(),
    unit: z.string().trim().max(12).nullable(),
    options: z.array(z.string().trim().min(1).max(50)).max(50),
});

const ConfigurationSchema = z.object({
    nameTemplate: z.string().trim().max(150),
    fields: z.array(DraftFieldSchema).max(20),
});

export type ItemFieldConfigurationState = { error?: string; success?: string } | undefined;

async function requireInventoryManager(): Promise<Session> {
    const session = await authenticate();

    if (!session) redirect("/login");
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") redirect("/");

    return session;
}

function getPlaceholders(template: string): string[] {
    return Array.from(template.matchAll(/\{([a-z][a-z0-9_]*)\}/g), (match) => match[1]);
}

function normalizeOptions(options: string[]): string[] {
    return [...new Set(options.map((option) => option.trim()).filter(Boolean))];
}

export async function savePartFieldConfiguration(categoryId: number, _previousState: ItemFieldConfigurationState, formData: FormData): Promise<ItemFieldConfigurationState> {
    const session = await requireInventoryManager();
    const rawConfiguration = formData.get("configuration");

    if (typeof rawConfiguration !== "string") {
        return { error: "Invalid part form configuration." };
    }

    let decoded: unknown;

    try {
        decoded = JSON.parse(rawConfiguration);
    } catch {
        return { error: "Invalid part form configuration." };
    }

    const parsed = ConfigurationSchema.safeParse(decoded);

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid part form configuration." };
    }

    const category = await prisma.category.findUnique({
        where: { id: categoryId },
        select: {
            id: true,
            name: true,
            parentId: true,
            itemFields: {
                include: {
                    _count: {
                        select: {
                            values: true,
                        },
                    },
                },
            },
        },
    });

    if (!category || category.parentId === null) {
        return { error: "Part fields can only be configured for subcategories." };
    }

    const fields = parsed.data.fields.map((field) => ({
        ...field,
        unit: field.unit || null,
        options: field.type === "SELECT" ? normalizeOptions(field.options) : [],
    }));

    const duplicateKey = fields.find((field, index) => fields.findIndex((other) => other.key === field.key) !== index);

    if (duplicateKey) {
        return { error: `The field key "${duplicateKey.key}" is used more than once.` };
    }

    const invalidSelect = fields.find((field) => field.type === "SELECT" && field.options.length === 0);

    if (invalidSelect) {
        return { error: `${invalidSelect.label} needs at least one select option.` };
    }

    const activeFieldsByKey = new Map(fields.map((field) => [field.key, field]));

    const placeholders = getPlaceholders(parsed.data.nameTemplate);
    const unknownPlaceholder = placeholders.find((key) => !activeFieldsByKey.has(key));

    if (unknownPlaceholder) {
        return { error: `The name format references {${unknownPlaceholder}}, but that field does not exist.` };
    }

    const optionalPlaceholder = placeholders.find((key) => !activeFieldsByKey.get(key)?.required);

    if (optionalPlaceholder) {
        return { error: `Fields used in the generated name must be required. Mark {${optionalPlaceholder}} as required or remove it from the name format.` };
    }

    const existingById = new Map(category.itemFields.map((field) => [field.id, field]));

    const existingByKey = new Map(category.itemFields.map((field) => [field.key, field]));

    for (const field of fields) {
        const existing = field.id ? existingById.get(field.id) : existingByKey.get(field.key);

        if (field.id && !existing) {
            return { error: `The field "${field.label}" no longer exists.` };
        }

        if (!existing) continue;

        if (existing._count.values > 0 && existing.type !== field.type) {
            return { error: `${existing.label} already has saved values, so its data type cannot be changed.` };
        }

        if (field.type === "SELECT" && existing._count.values > 0) {
            const usedValues = await prisma.itemFieldValue.findMany({
                where: { fieldDefinitionId: existing.id },
                distinct: ["value"],
                select: { value: true },
            });

            const removedUsedValue = usedValues.find(({ value }) => !field.options.includes(value));

            if (removedUsedValue) {
                return { error: `${existing.label} cannot remove the option "${removedUsedValue.value}" because an existing part uses it.` };
            }
        }
    }

    await prisma.$transaction(async (tx) => {
        const activeFieldIds: number[] = [];

        for (const [sortOrder, field] of fields.entries()) {
            const existing = field.id ? existingById.get(field.id) : existingByKey.get(field.key);
            const data = {
                key: field.key,
                label: field.label,
                type: field.type,
                required: field.required,
                unit: field.unit,
                ...(field.type === "SELECT" ? { options: field.options } : {}),
                sortOrder,
                active: true,
            };

            if (existing) {
                const updated = await tx.itemFieldDefinition.update({
                    where: { id: existing.id },
                    data,
                    select: { id: true },
                });

                activeFieldIds.push(updated.id);
            } else {
                const created = await tx.itemFieldDefinition.create({
                    data: { categoryId, ...data },
                    select: { id: true },
                });

                activeFieldIds.push(created.id);
            }
        }

        await tx.itemFieldDefinition.updateMany({
            where: {
                categoryId,
                active: true,
                ...(activeFieldIds.length > 0
                    ? {
                          id: {
                              notIn: activeFieldIds,
                          },
                      }
                    : {}),
            },

            data: { active: false },
        });

        await tx.category.update({
            where: { id: categoryId },
            data: {
                nameTemplate: parsed.data.nameTemplate || null,
            },
        });

        await writeAuditLog(tx, {
            action: "PART_FIELD_UPDATED",
            entityId: categoryId,
            entityName: category.name,
            summary: `Updated the custom part form for "${category.name}".`,
            performedById: Number(session.user.id),
            details: {
                fieldCount: fields.length,
                nameTemplate: parsed.data.nameTemplate || null,
            },
        });
    });

    await partFieldLogger.completed(session, "Part form configuration", {
        categoryId,
        fieldCount: fields.length,
        hasNameTemplate: parsed.data.nameTemplate.length > 0,
    });

    revalidatePath("/settings/inventory");
    revalidatePath(`/inventory/${categoryId}`);
    revalidatePath("/audit");

    return { success: "Part form configuration saved." };
}
