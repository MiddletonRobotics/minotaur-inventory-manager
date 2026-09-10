"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import prisma from "@/prisma/prisma";
import { authenticate } from "@/server/session";

const LocationSchema = z.object({
    name: z.string().trim().min(1, "Location name is required.").max(80, "Location name is too long."),
    parentId: z.string().trim().optional(),
});

export type LocationActionState = | { error?: string; success?: string; } | undefined;

async function requireInventoryManager() {
    const session = await authenticate();

    if (!session) redirect("/login")
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") redirect("/");
    
    return session;
}

function revalidateLocations() {
    revalidatePath("/settings/inventory");
    revalidatePath("/inventory/[id]", "page");
}

export async function createStorageLocation(_previousState: LocationActionState, formData: FormData): Promise<LocationActionState> {
    await requireInventoryManager();

    const parsed = LocationSchema.safeParse({
        name: formData.get("name"),
        parentId: formData.get("parentId")?.toString() || undefined,
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid location." };
    }

    const { name, parentId } = parsed.data;

    const existing =
        await prisma.storageLocation.findFirst({
            where: {
                name: {
                    equals: name,
                    mode: "insensitive",
                },
            },
        });

    if (existing) {
        if (!existing.active) {
            await prisma.storageLocation.update({
                where: { id: existing.id },
                data: { active: true },
            });

            revalidateLocations();

            return { success: `${existing.name} was restored.` };
        }

        return { error: "That storage location already exists." };
    }

    let parsedParentId: number | null = null;

    if (parentId) {
        parsedParentId = Number(parentId);

        if (!Number.isInteger(parsedParentId)) {
            return { error: "Invalid parent location." };
        }

        const parent = await prisma.storageLocation.findUnique({
            where: { id: parsedParentId },
            select: {
                id: true,
                active: true,
                parentId: true,
            },
        });

        if (!parent || !parent.active) {
            return { error: "Selected parent location does not exist." };
        }

        if (parent.parentId !== null) {
            return { error: "A child location cannot contain another location." };
        }
    }

    await prisma.storageLocation.create({
        data: { name, parentId: parsedParentId },
    });

    revalidateLocations();

    return { success: `${name} was added.` };
}

export async function deactivateStorageLocation(locationId: number, _previousState: LocationActionState, _formData: FormData): Promise<LocationActionState> {
    await requireInventoryManager();

    const location = await prisma.storageLocation.findUnique({
            where: { id: locationId },
            include: {
                children: {
                    where: { active: true },
                },
            },
        });

    if (!location) {
        return { error: "Storage location does not exist." };
    }

    const partsUsingLocation = await prisma.item.count({
        where: { locationId: location.id },
    });

    if (partsUsingLocation > 0) {
        return {error: `${location.name} cannot be removed because ${partsUsingLocation} ${partsUsingLocation === 1 ? "part uses" : "parts use"} this location.` };
    }

    await prisma.storageLocation.update({
        where: { id: location.id },
        data: { active: false },
    });

    revalidateLocations();

    return { success: `${location.name} was removed from location choices.` };
}