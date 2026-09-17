"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { writeAuditLog } from "./audit";
import { createActionLogger } from "./action-logger";
import prisma from "@/prisma/prisma";
import { authenticate, Session } from "@/server/session";

const vendorLogger = createActionLogger("vendors");
const VendorSchema = z.object({
    name: z.string().trim().min(1, "Vendor name is required.").max(80, "Vendor name is too long."),
});

export type VendorActionState = { error?: string; success?: string } | undefined;

async function requireInventoryManager() {
    const session = await authenticate();

    if (!session) redirect("/login");
    if (session.user.role !== "MANAGER" && session.user.role !== "ADMINISTRATOR") redirect("/");

    return session;
}

function revalidateVendors() {
    revalidatePath("/settings/inventory");
    revalidatePath("/inventory/[id]", "page");
    revalidatePath("/audit");
}

export async function createVendor(_previousState: VendorActionState, formData: FormData): Promise<VendorActionState> {
    const session: Session = await requireInventoryManager();
    const performedById = Number(session.user.id);

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
            await prisma.$transaction(async (tx) => {
                await tx.vendor.update({
                    where: { id: existing.id },
                    data: { active: true },
                });

                await writeAuditLog(tx, {
                    action: "VENDOR_REACTIVATED",
                    entityId: existing.id,
                    entityName: existing.name,
                    summary: `Reactivated vendor "${existing.name}".`,
                    performedById,
                    details: { active: true },
                });

                vendorLogger.completed(session, "Vendor reactivation", {
                    vendorId: existing.id,
                    vendorName: existing.name
                });
            });

            revalidateVendors();

            return { success: `${existing.name} was restored.` };
        }

        return { error: "That vendor already exists." };
    }

    await prisma.$transaction(async (tx) => {
        const vendor = await tx.vendor.create({
            data: { name },
        });

        await writeAuditLog(tx, {
            action: "VENDOR_CREATED",
            entityId: vendor.id,
            entityName: vendor.name,
            summary: `Created vendor "${vendor.name}".`,
            performedById,
        });

        vendorLogger.completed(session, "Vendor creation", {
            vendorId: vendor.id,
            vendorName: vendor.name
        });
    });

    revalidateVendors();

    return { success: `${name} was added.` };
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export async function deactivateVendor(vendorId: number, _previousState: VendorActionState, _formData: FormData): Promise<VendorActionState> {
    const session: Session = await requireInventoryManager();
    const performedById = Number(session.user.id);

    const vendor = await prisma.vendor.findUnique({
        where: { id: vendorId },
    });

    if (!vendor) {
        vendorLogger.rejected(session, "Vendor deactivation", "vendor_does_not_exist", {
            targetUserId: performedById
        });

        return { error: "Vendor does not exist." };
    }

    if (!vendor.active) {
        vendorLogger.debug(session, "Vendor deactivation", {
            vendorId: vendor.id,
            vendorName: vendor.name
        });

        return { success: "Vendor is already inactive." };
    }

    await prisma.$transaction(async (tx) => {
        await tx.vendor.update({
            where: { id: vendor.id },
            data: { active: false },
        });

        await writeAuditLog(tx, {
            action: "VENDOR_DEACTIVATED",
            entityId: vendor.id,
            entityName: vendor.name,
            summary: `Deactivated vendor "${vendor.name}".`,
            performedById,
            details: { active: false },
        });
    });

    vendorLogger.completed(session, "Vendor deactivation", {
        vendorId: vendor.id,
        vendorName: vendor.name
    });

    revalidateVendors();

    return { success: `${vendor.name} was removed from vendor choices.` };
}
