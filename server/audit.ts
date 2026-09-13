import type { Prisma } from "@/prisma/generated/client";
import type { AuditAction } from "@/prisma/generated/client";

type AuditTransaction = Pick<Prisma.TransactionClient, "auditLog">;
type AuditLogInput = {
    action: AuditAction;
    entityId?: number | null;
    entityName: string;
    summary: string;
    performedById: number;
    details?: Prisma.InputJsonValue;
};

export async function writeAuditLog(tx: AuditTransaction, input: AuditLogInput) {
    await tx.auditLog.create({
        data: {
            action: input.action,
            entityId: input.entityId ?? null,
            entityName: input.entityName,
            summary: input.summary,
            performedById: input.performedById,
            ...(input.details !== undefined ? { details: input.details } : {}),
        },
    });
}
