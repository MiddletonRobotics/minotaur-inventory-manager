"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import prisma from "@/prisma/prisma";
import { authenticate } from "@/server/session";

const VendorSchema = z.object({
    name: z.string().trim().min(1, "Vendor name is required.").max(80, "Vendor name is too long."),
});

export type VendorActionState = | { error?: string; success?: string; } | undefined;

async function requireInventoryManager() {
    const session = await authenticate();

    if (!session) redirect("/login");
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") redirect("/");

    return session;
}

function revalidateVendors() {
    revalidatePath("/settings/inventory");
    revalidatePath("/inventory/[id]", "page");
}

export async function createVendor(_previousState: VendorActionState, formData: FormData): Promise<VendorActionState> {
    await requireInventoryManager();

    const parsed = VendorSchema.safeParse({
        name: formData.get("name"),
    });

    if (!parsed.success) {
        return { error: parsed.error.issues[0]?.message ?? "Invalid vendor." };
    }

    const { name } = parsed.data;
    const existing = await prisma.vendor.findFirst({
        where: {
            name: {
                equals: name,
                mode: "insensitive",
            },
        },
    });

    if (existing) {
        if (!existing.active) {
            await prisma.vendor.update({
                where: { id: existing.id },
                data: { active: true },
            });

            revalidateVendors();

            return { success: `${existing.name} was restored.` };
        }

        return { error: "That vendor already exists." };
    }

    await prisma.vendor.create({
        data: { name },
    });

    revalidateVendors();

    return { success: `${name} was added.` };
}

export async function deactivateVendor(vendorId: number, _previousState: VendorActionState, _formData: FormData): Promise<VendorActionState> {
    await requireInventoryManager();

    const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
    });

    if (!vendor) {
        return { error: "Vendor does not exist." };
    }

    await prisma.vendor.update({
        where: { id: vendor.id },
        data: { active: false },
    });

    revalidateVendors();

    return { success: `${vendor.name} was removed from vendor choices.` };
}