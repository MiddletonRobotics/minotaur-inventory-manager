"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import prisma from "@/prisma/prisma";
import { createActionLogger } from "@/server/action-logger";
import { writeAuditLog } from "@/server/audit";
import { getTeamPasswordHash, hashPassword, isPrivilegedPasswordInUse, isTeamPassword } from "@/server/passwords";
import { authenticate, type Session } from "@/server/session";

const accountLogger = createActionLogger("accounts");

const CreateUserSchema = z
    .object({
        firstName: z.string().trim().min(1).max(50),
        lastName: z.string().trim().min(1).max(50),
        role: z.enum(["STANDARD", "MANAGER"]),
        password: z.string().max(100),
    })
    .superRefine((data, context) => {
        if (data.role === "MANAGER" && data.password.length < 8) {
            context.addIssue({
                code: "custom",
                path: ["password"],
                message: "Managers must have a password of at least 8 characters.",
            });
        }
    });

export type CreateUserState = | { error?: string; success?: string; } | undefined;
export type ReactivateUserState = | { error?: string; success?: string; } | undefined;
export type PromoteUserState = | { error?: string; success?: string; } | undefined;

export async function requireAdministrator(): Promise<Session> {
    const session = await authenticate();

    if (!session) redirect("/login");
    if (session.user.role !== "ADMINISTRATOR") redirect("/");

    return session;
}

function revalidateAccounts() {
    revalidatePath("/settings/accounts");
    revalidatePath("/audit");
}

export async function createUser(_previousState: CreateUserState, formData: FormData): Promise<CreateUserState> {
    const session = await requireAdministrator();
    const performedById = Number(session.user.id);
    const parsed = CreateUserSchema.safeParse({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        role: formData.get("role"),
        password: formData.get("password") ?? "",
    });

    if (!parsed.success) {
        await accountLogger.rejected(session, "User creation", "invalid_form_data");
        return { error: parsed.error.issues[0] ?.message ?? "Invalid user information." };
    }

    const { firstName, lastName, role, password } = parsed.data;
    const existingUser = await prisma.user.findUnique({
        where: {
            firstName_lastName: { firstName, lastName },
        },
    });

    if (existingUser) {
        await accountLogger.rejected(session, "User creation", existingUser.active ? "user_already_exists" : "inactive_user_already_exists", {
            existingUserId: existingUser.id,
            requestedRole: role,
        });

        return { error: existingUser.active ? "A user with that name already exists." : "A deactivated user with that name already exists. Reactivate that account instead." };
    }

    if (role === "MANAGER" && await isTeamPassword(password)) {
        await accountLogger.rejected(session, "User creation", "manager_used_team_password", {
            requestedRole: role,
        });

        return { error: "Managers cannot use the shared team password." };
    }

    if (role === "MANAGER" && await isPrivilegedPasswordInUse(password)) {
        await accountLogger.rejected(session, "User creation", "privileged_password_not_unique", {
            requestedRole: role,
        });

        return { error: "Manager passwords must be unique." };
    }

    const pwdHash = role === "STANDARD" ? await getTeamPasswordHash() : await hashPassword(password);

    await prisma.$transaction(async (tx) => {
        const user = await tx.user.create({
            data: {
                firstName,
                lastName,
                type: role,
                pwdHash,
            },
        });

        const roleName = role === "MANAGER" ? "Manager" : "Standard";
        await writeAuditLog(tx, {
            action: "USER_CREATED",
            entityId: user.id,
            entityName: `${user.firstName} ${user.lastName}`,
            summary: `Created ${roleName} account "${user.firstName} ${user.lastName}".`,
            performedById,
            details: { role },
        });
    });

    await accountLogger.completed(session, "User creation", {
        createdUserName: `${firstName} ${lastName}`,
        createdRole: role,
    });

    revalidateAccounts();

    return { success: `${firstName} ${lastName} was created successfully.` };
}

export async function deactivateUser(userId: number): Promise<void> {
    const session = await requireAdministrator();
    const performedById = Number(session.user.id);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true,
            active: true,
        },
    });

    if (!user) {
        await accountLogger.debug(session, "User deactivation skipped", {
            targetUserId: userId,
            reason: "user_not_found",
        });

        return;
    }

    if (!user.active) {
        await accountLogger.debug(session, "User deactivation skipped", {
            targetUserId: user.id,
            reason: "user_already_inactive",
        });

        return;
    }

    if (user.type === "ADMINISTRATOR") {
        await accountLogger.rejected(session, "User deactivation", "administrator_protected", {
            targetUserId: user.id,
        });

        return;
    }

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: { active: false },
        });

        await writeAuditLog(tx, {
            action: "USER_DEACTIVATED",
            entityId: user.id,
            entityName: `${user.firstName} ${user.lastName}`,
            summary: `Deactivated ${user.type === "MANAGER" ? "Manager" : "Standard"} account "${user.firstName} ${user.lastName}".`,
            performedById,
            details: { role: user.type },
        });
    });

    await accountLogger.completed(session, "User deactivation", {
        targetUserId: user.id,
        targetRole: user.type,
    });

    revalidateAccounts();
}

export async function reactivateUser(userId: number, _previousState: ReactivateUserState, formData: FormData): Promise<ReactivateUserState> {
    const session = await requireAdministrator();
    const performedById = Number(session.user.id);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true,
            active: true,
        },
    });

    if (!user) {
        await accountLogger.rejected(session, "User reactivation", "user_not_found", {
            targetUserId: userId,
        });

        return { error: "User does not exist." };
    }

    if (user.active) {
        await accountLogger.rejected(session, "User reactivation", "user_already_active", {
            targetUserId: user.id,
        });

        return { error: "This user is already active." };
    }

    if (user.type === "ADMINISTRATOR") {
        await accountLogger.rejected(session, "User reactivation", "administrator_protected", {
            targetUserId: user.id,
        });

        return { error: "Administrator accounts cannot be reactivated here." };
    }

    let pwdHash: string;

    if (user.type === "STANDARD") {
        pwdHash = await getTeamPasswordHash();
    } else {
        const password = formData.get("password");

        if (typeof password !== "string" || password.length < 8 || password.length > 100) {
            await accountLogger.rejected(session, "User reactivation", "manager_password_invalid_length", {
                targetUserId: user.id,
            });

            return { error: "Managers must have a password between 8 and 100 characters." };
        }

        if (await isTeamPassword(password)) {
            await accountLogger.rejected(session, "User reactivation", "manager_used_team_password", {
                targetUserId: user.id,
            });

            return { error: "Managers cannot use the shared team password." };
        }

        if (await isPrivilegedPasswordInUse(password, user.id)) {
            await accountLogger.rejected(session, "User reactivation", "privileged_password_not_unique", {
                targetUserId: user.id,
            });

            return { error: "Manager passwords must be unique." };
        }

        pwdHash = await hashPassword(password);
    }

    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: { active: true, pwdHash },
        });

        await writeAuditLog(tx, {
            action: "USER_REACTIVATED",
            entityId: user.id,
            entityName: `${user.firstName} ${user.lastName}`,
            summary: `Reactivated ${user.type === "MANAGER" ? "Manager" : "Standard"} account "${user.firstName} ${user.lastName}".`,
            performedById,
            details: { role: user.type },
        });
    });

    await accountLogger.completed(session, "User reactivation", {
        targetUserId: user.id,
        targetRole: user.type,
    });

    revalidateAccounts();

    return { success: `${user.firstName} ${user.lastName} was reactivated.` };
}

export async function promoteUser(userId: number, _previousState: PromoteUserState, formData: FormData): Promise<PromoteUserState> {
    const session = await requireAdministrator();
    const performedById = Number(session.user.id);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true,
            active: true,
        },
    });

    if (!user || !user.active) {
        await accountLogger.rejected(session, "User promotion", "user_missing_or_inactive", {
            targetUserId: userId,
        });

        return { error: "User does not exist or is deactivated." };
    }

    if (user.type === "ADMINISTRATOR") {
        await accountLogger.rejected(session, "User promotion", "administrator_protected", {
            targetUserId: user.id,
        });

        return { error: "Administrator roles cannot be changed here." };
    }

    if (user.type === "MANAGER") {
        await accountLogger.rejected(session, "User promotion", "already_manager", {
            targetUserId: user.id,
        });

        return { error: "This user is already a Manager." };
    }

    const password = formData.get("password");

    if (typeof password !== "string" || password.length < 8 || password.length > 100) {
        await accountLogger.rejected(session, "User promotion", "manager_password_invalid", {
            targetUserId: user.id,
        });

        return { error: "Managers must have a password between 8 and 100 characters." };
    }

    if (await isTeamPassword(password)) {
        await accountLogger.rejected(session, "User promotion", "manager_used_team_password", {
            targetUserId: user.id,
        });

        return { error: "Managers cannot use the shared team password." };
    }

    if (await isPrivilegedPasswordInUse(password, user.id)) {
        await accountLogger.rejected(session, "User promotion", "privileged_password_not_unique", {
            targetUserId: user.id,
        });

        return { error: "Manager passwords must be unique." };
    }

    const pwdHash = await hashPassword(password);
    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: {
                type: "MANAGER",
                pwdHash,
            },
        });

        await writeAuditLog(tx, {
            action: "USER_PROMOTED",
            entityId: user.id,
            entityName: `${user.firstName} ${user.lastName}`,
            summary: `Promoted "${user.firstName} ${user.lastName}" from Standard to Manager.`,
            performedById,
            details: {
                previousRole: "STANDARD",
                newRole: "MANAGER",
            },
        });
    });

    await accountLogger.completed(session, "User promotion", {
        targetUserId: user.id,
        previousRole: "STANDARD",
        newRole: "MANAGER",
    });

    revalidateAccounts();

    return { success: `${user.firstName} ${user.lastName} was promoted to Manager.` };
}

export async function demoteUser(userId: number): Promise<void> {
    const session = await requireAdministrator();
    const performedById = Number(session.user.id);
    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true,
            active: true,
        },
    });

    if (!user || !user.active || user.type !== "MANAGER") {
        await accountLogger.debug(session, "User demotion skipped", {
            targetUserId: userId,
            reason: "target_not_active_manager",
        });

        return;
    }

    const pwdHash = await getTeamPasswordHash();
    await prisma.$transaction(async (tx) => {
        await tx.user.update({
            where: { id: user.id },
            data: {
                type: "STANDARD",
                pwdHash,
            },
        });

        await writeAuditLog(tx, {
            action: "USER_DEMOTED",
            entityId: user.id,
            entityName: `${user.firstName} ${user.lastName}`,
            summary: `Demoted "${user.firstName} ${user.lastName}" from Manager to Standard.`,
            performedById,
            details: {
                previousRole: "MANAGER",
                newRole: "STANDARD",
            },
        });
    });

    await accountLogger.completed(session, "User demotion", {
        targetUserId: user.id,
        previousRole: "MANAGER",
        newRole: "STANDARD",
    });

    revalidateAccounts();
}