"use server";

import "server-only";

import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { z } from "zod";

import prisma from "@/prisma/prisma";

import { createActionLogger } from "@/server/action-logger";
import { writeAuditLog } from "@/server/audit";
import { requireAdministrator } from "@/server/users";

const passwordLogger = createActionLogger("passwords");

const PasswordSchema = z.string().min(8, "Password must be at least 8 characters.").max(100, "Password cannot exceed 100 characters.");

const ChangeTeamPasswordSchema = z
    .object({
        newPassword: PasswordSchema,
        confirmPassword: z.string(),
    })
    .refine((data) => data.newPassword === data.confirmPassword, {
        path: ["confirmPassword"],
        message: "Passwords do not match.",
    });

export type PasswordActionState =
    | {
          error?: string;
          success?: string;
      }
    | undefined;

export async function hashPassword(password: string): Promise<string> {
    return hash(password, 12);
}

export async function passwordMatches(password: string, passwordHash: string): Promise<boolean> {
    return compare(password, passwordHash);
}

async function getInitialTeamPasswordHash(): Promise<string> {
    const standardUser = await prisma.user.findFirst({
        where: { type: "STANDARD" },
        select: { pwdHash: true },
    });

    if (standardUser) return standardUser.pwdHash;
    const teamPassword = process.env.TEAM_PASSWORD;

    if (!teamPassword) {
        throw new Error("TEAM_PASSWORD is required when initializing the team password.");
    }

    const parsed = PasswordSchema.safeParse(teamPassword);

    if (!parsed.success) {
        throw new Error(parsed.error.issues[0]?.message ?? "Invalid TEAM_PASSWORD.");
    }

    return hashPassword(teamPassword);
}

export async function getTeamPasswordHash(): Promise<string> {
    const settings = await prisma.systemSettings.findUnique({
        where: { id: 1 },
        select: { teamPasswordHash: true },
    });

    if (settings) return settings.teamPasswordHash;

    const initialHash = await getInitialTeamPasswordHash();
    const createdSettings = await prisma.systemSettings.upsert({
        where: { id: 1 },
        update: {},
        create: {
            id: 1,
            teamPasswordHash: initialHash,
        },
        select: { teamPasswordHash: true },
    });

    return createdSettings.teamPasswordHash;
}

export async function isTeamPassword(password: string): Promise<boolean> {
    const teamPasswordHash = await getTeamPasswordHash();

    return passwordMatches(password, teamPasswordHash);
}

export async function isPrivilegedPasswordInUse(password: string, excludeUserId?: number): Promise<boolean> {
    const users = await prisma.user.findMany({
        where: {
            active: true,
            type: { in: ["MANAGER", "ADMINISTRATOR"] },
            ...(excludeUserId !== undefined
                ? {
                      id: { not: excludeUserId },
                  }
                : {}),
        },
        select: { pwdHash: true },
    });

    for (const user of users) {
        if (await passwordMatches(password, user.pwdHash)) return true;
    }

    return false;
}
export async function changeTeamPassword(_previousState: PasswordActionState, formData: FormData): Promise<PasswordActionState> {
    const session = await requireAdministrator();
    const parsed = ChangeTeamPasswordSchema.safeParse({
        newPassword: formData.get("newPassword"),
        confirmPassword: formData.get("confirmPassword"),
    });

    if (!parsed.success) {
        await passwordLogger.rejected(session, "Team password change", "invalid_form_data");
        return { error: parsed.error.issues[0]?.message ?? "Invalid password." };
    }

    const { newPassword } = parsed.data;

    if (await isTeamPassword(newPassword)) {
        await passwordLogger.rejected(session, "Team password change", "password_unchanged");
        return { error: "The new team password must be different from the current team password." };
    }

    if (await isPrivilegedPasswordInUse(newPassword)) {
        await passwordLogger.rejected(session, "Team password change", "matches_privileged_password");
        return { error: "The team password cannot match a Manager or Administrator password." };
    }

    const newPasswordHash = await hashPassword(newPassword);
    const performedById = Number(session.user.id);
    const updatedStandardUsers = await prisma.$transaction(async (tx) => {
        await tx.systemSettings.upsert({
            where: { id: 1 },
            update: { teamPasswordHash: newPasswordHash },
            create: {
                id: 1,
                teamPasswordHash: newPasswordHash,
            },
        });

        const users = await tx.user.updateMany({
            where: { type: "STANDARD" },
            data: { pwdHash: newPasswordHash },
        });

        await writeAuditLog(tx, {
            action: "TEAM_PASSWORD_CHANGED",
            entityName: "Team Password",
            summary: "Changed the shared team password.",
            performedById,
            details: { standardAccountsUpdated: users.count },
        });

        return users.count;
    });

    await passwordLogger.completed(session, "Team password change", {
        standardAccountsUpdated: updatedStandardUsers,
    });

    revalidatePath("/settings/accounts");
    revalidatePath("/audit");

    return { success: "Team password changed successfully." };
}
