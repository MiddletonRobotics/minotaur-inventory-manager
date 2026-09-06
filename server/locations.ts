"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import prisma from "@/prisma/prisma";
import { authenticate } from "@/server/session";

const LocationSchema = z.object({
    name: z.string().trim().min(1, "Location name is required.").max(80, "Location name is too long."),
});

export type LocationActionState = { error?: string; success?: string } | undefined;

async function requireInventoryManager() {
    const session = await authenticate();

    if (!session) redirect("/login");
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") redirect("/");
}

function revalidateLocations() {
    revalidatePath("/settings/inventory");
    revalidatePath("/inventory/[id]", "page");
}

export async function createStorageLocation(_previousState: LocationActionState, formData: FormData): Promise<LocationActionState> {
    await requireInventoryManager();

    const parsed = LocationSchema.safeParse({ name: formData.get("name") });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid location." };
    }

    const { name } = parsed.data;
    const existing = await prisma.storageLocation.findFirst({
        where: {
            name: {
                equals: name,
                mode: "insensitive",
            },
        },
    });

    if (existing) {
        return { error: "That storage location already exists." };
    }

    await prisma.storageLocation.create({
        data: { name },
    });

    revalidateLocations();

    return { success: `${name} was added.` };
}

export async function deleteStorageLocation(locationId: number, _previousState: LocationActionState, _formData: FormData): Promise<LocationActionState> {
    await requireInventoryManager();

    const location = await prisma.storageLocation.findUnique({
        where: { id: locationId },
    });

    if (!location) {
        return { error: "Storage location does not exist." };
    }

    const partsUsingLocation = await prisma.item.count({
        where: {
            location: location.name,
        },
    });

    if (partsUsingLocation > 0) {
        return { error: `${location.name} cannot be removed because ${partsUsingLocation} ${partsUsingLocation === 1 ? "part uses" : "parts use"} this location.` };
    }

    await prisma.storageLocation.delete({
        where: {
            id: location.id,
        },
    });

    revalidateLocations();

    return { success: `${location.name} was removed.` };
}
