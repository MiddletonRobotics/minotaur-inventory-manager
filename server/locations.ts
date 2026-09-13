"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "./audit";
import prisma from "@/prisma/prisma";
import { authenticate, Session } from "@/server/session";

const LocationSchema = z.object({
    name: z.string().trim().min(1, "Location name is required.").max(80, "Location name is too long."),
});

export type LocationActionState = { error?: string; success?: string } | undefined;

async function requireInventoryManager() {
    const session = await authenticate();

    if (!session) redirect("/login");
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") redirect("/");

    return session;
}

function revalidateLocations() {
    revalidatePath("/settings/inventory");
    revalidatePath("/inventory/[id]", "page");
    revalidatePath("/audit");
}

export async function createStorageLocation(_previousState: LocationActionState, formData: FormData): Promise<LocationActionState> {
    const session: Session = await requireInventoryManager();
    const performedById = Number(session.user.id);

    const parsed = LocationSchema.safeParse({
        name: formData.get("name"),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid location." };
    }

    const name = parsed.data.name;
    const parentValue = formData.get("parentId")?.toString().trim() ?? "";

    let parentId: number | null = null;
    let parentName: | string | null = null;

    if (parentValue !== "") {
        parentId = Number(parentValue);

        if (!Number.isInteger(parentId)) {
            return { error: "Invalid parent location." };
        }

        const parent = await prisma.storageLocation.findUnique({
            where: { id: parentId },
            include: {
                _count: {
                    select: { items: true },
                },
            },
        });

        if (!parent || !parent.active) {
            return { error: "Selected parent location does not exist." };
        }

        if (parent.parentId !== null) {
            return { error: "A child location cannot contain another location." };
        }

        if (parent._count.items > 0) {
            return { error: "Parts are stored directly in this location. Move them before adding a child location." };
        }

        parentName = parent.name;
    }

    const existing = await prisma.storageLocation.findFirst({
        where: {
            name: {
                equals: name,
                mode: "insensitive",
            },
        },
    });

    if (existing) {
        if (existing.active) {
            return { error: "That storage location already exists." };
        }

        if (existing.parentId !== parentId) {
            return { error: "An inactive location with that name already exists under a different parent." };
        }

        await prisma.$transaction(async (tx) => {
        await tx.storageLocation.update({
            where: { id: existing.id },
            data: { active: true },
        });

        await writeAuditLog(tx, {
            action: "LOCATION_REACTIVATED",
            entityId: existing.id,
            entityName: existing.name,
            summary: existing.parentId ? `Reactivated storage location "${existing.name}" under "${parentName}".` : `Reactivated storage location "${existing.name}".`,
            performedById,
            details: {
                parentId: existing.parentId,
                parentName,
            },
        });
    });

        revalidateLocations();

        return { success: `${existing.name} was restored.` };
    }

    await prisma.$transaction(async (tx) => {
        const location = await tx.storageLocation.create({
            data: { name, parentId },
        });

        await writeAuditLog(tx, {
            action: "LOCATION_CREATED",
            entityId: location.id,
            entityName: location.name,
            summary: parentName ? `Created storage location "${location.name}" under "${parentName}".` : `Created storage location "${location.name}".`,
            performedById,
            details: { parentId, parentName },
        });
    });

    revalidateLocations();

    return { success: `${name} was added.` };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deactivateStorageLocation(locationId: number, _previousState: LocationActionState, _formData: FormData): Promise<LocationActionState> {
    const session: Session = await requireInventoryManager();
    const performedById = Number(session.user.id);

    const location = await prisma.storageLocation.findUnique({
        where: { id: locationId },
        include: {
            parent: {
                select: {
                    id: true,
                    name: true,
                }
            },
            children: {
                select: {
                    id: true,
                    name: true,
                    active: true,
                    _count: {
                        select: { items: true },
                    },
                },
            },
            _count: {
                select: { items: true },
            },
        },
    });

    if (!location) {
        return { error: "Storage location does not exist." };
    }

    if (!location.active) {
        return { success: "Storage location is already inactive." };
    }

    if (location._count.items > 0) {
        return { error: `${location.name} cannot be removed because ${location._count.items} ${location._count.items === 1 ? "part uses" : "parts use"} this location.` };
    }

    const activeChildren = location.children.filter((child) => child.active);

    if (activeChildren.length > 0) {
        return { error: "This location cannot be removed because it still has active child locations." };
    }

    const childWithParts = location.children.find((child) => child._count.items > 0);

    if (childWithParts) {
        return { error: `${childWithParts.name} still contains parts. Move those parts before removing ${location.name}.` };
    }

    await prisma.$transaction(async (tx) => {
        await tx.storageLocation.update({
            where: { id: location.id },
            data: { active: false },
        });

        await writeAuditLog(tx, {
            action: "LOCATION_DEACTIVATED",
            entityId: location.id,
            entityName: location.name,
            summary: location.parent ? `Deactivated storage location "${location.parent.name} / ${location.name}".` : `Deactivated storage location "${location.name}".`,
            performedById,
            details: {
                parentId: location.parentId,
                parentName: location.parent ?.name ?? null,
            },
        });
    });

    revalidateLocations();

    return { success: `${location.name} was removed.` };
}
