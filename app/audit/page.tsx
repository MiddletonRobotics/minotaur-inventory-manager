import { redirect } from "next/navigation";
import AuditHistory, { type AuditHistoryEntry } from "@/components/audit-history";
import Navbar from "@/components/navbar";
import prisma from "@/prisma/prisma";
import { authenticate } from "@/server/session";

export default async function Audit() {
    const session = await authenticate();

    if (!session) redirect("/login");

    const [adjustments, auditLogs] = await Promise.all([
        prisma.inventoryAdjustment.findMany({
            orderBy: { createdAt: "desc" },
            take: 500,
            include: {
                item: {
                    select: {
                        id: true,
                        name: true,
                        partNumber: true,
                        category: {
                            select: {
                                id: true,
                                name: true,
                                parent: {
                                    select: { name: true },
                                },
                            },
                        },
                    },
                },
                adjustedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        type: true,
                    },
                },
            },
        }),

        prisma.auditLog.findMany({
            orderBy: { createdAt: "desc" },
            take: 500,
            include: {
                performedBy: {
                    select: {
                        firstName: true,
                        lastName: true,
                        type: true,
                    },
                },
            },
        }),
    ]);

    const adjustmentEntries: AuditHistoryEntry[] = adjustments.map((adjustment) => ({
        id: `adjustment-${adjustment.id}`,
        action: "INVENTORY_ADJUSTED",
        item: {
            id: adjustment.item.id,
            name: adjustment.item.name,
            partNumber: adjustment.item.partNumber,
            category: adjustment.item.category,
        },
        quantityDelta: adjustment.quantityDelta,
        previousQuantity: adjustment.previousQuantity,
        newQuantity: adjustment.newQuantity,
        reason: adjustment.reason,
        user: {
            firstName: adjustment.adjustedBy.firstName,
            lastName: adjustment.adjustedBy.lastName,
            role: adjustment.adjustedBy.type,
        },
        createdAt: adjustment.createdAt.toISOString(),
    }));

    const generalEntries: AuditHistoryEntry[] = auditLogs.map((entry) => ({
        id: `audit-${entry.id}`,
        action: entry.action,
        entityName: entry.entityName,
        summary: entry.summary,
        user: {
            firstName: entry.performedBy.firstName,
            lastName: entry.performedBy.lastName,
            role: entry.performedBy.type,
        },
        createdAt: entry.createdAt.toISOString(),
    }));

    const entries = [...adjustmentEntries, ...generalEntries].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 500);

    return (
        <>
            <Navbar />
            <main className="min-h-[calc(100vh-80px)] w-full px-4 py-10 font-dmsans sm:px-8">
                <div className="mx-auto max-w-7xl">
                    <div className="mb-8">
                        <h1 className="text-3xl font-semibold text-fg">Audit Log</h1>
                        <p className="mt-2 text-sm text-fg-muted">History of inventory, project, and category management activity.</p>
                    </div>
                    <AuditHistory entries={entries} />
                </div>
            </main>
        </>
    );
}
