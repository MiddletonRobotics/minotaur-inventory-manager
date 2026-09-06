"use server";

import "dotenv/config";
import { compare, hash } from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { authenticate } from "@/server/session";
import prisma from "@/prisma/prisma";

/**
 * Super jank solution but it works to get an env field as only a string instead of string | undefined
 * @param name Name of the field in the .env file
 * @returns
 */

function getRequiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(`${name} is required`);
    }

    return value;
}

const standardUserPassword = getRequiredEnv("TEAM_PASSWORD");

if (!standardUserPassword) {
    throw new Error("A team password is required");
}

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

export type CreateUserState = { error?: string; success?: string } | undefined;
export type ReactivateUserState = { error?: string; success?: string } | undefined;
export type PromoteUserState = { error?: string; success?: string } | undefined;

async function requireAdministrator() {
    const session = await authenticate();

    if (!session) {
        redirect("/login");
    }

    if (session.user.role !== "ADMINISTRATOR") {
        redirect("/");
    }

    return session;
}

export async function createUser(_previousState: CreateUserState, formData: FormData): Promise<CreateUserState> {
    await requireAdministrator();

    const parsed = CreateUserSchema.safeParse({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        role: formData.get("role"),
        password: formData.get("password") ?? "",
    });

    if (!parsed.success) {
        return {
            error: parsed.error.issues[0]?.message ?? "Invalid user information.",
        };
    }

    const { firstName, lastName, role, password } = parsed.data;

    if (role === "MANAGER" && password === standardUserPassword) {
        return {
            error: "Managers cannot use the standard team password.",
        };
    }

    if (role === "MANAGER") {
        const privilegedUsers = await prisma.user.findMany({
            where: {
                type: { in: ["MANAGER", "ADMINISTRATOR"] },
                active: true,
            },
            select: { pwdHash: true },
        });

        for (const user of privilegedUsers) {
            if (await compare(password, user.pwdHash)) {
                return { error: "Manager passwords must be unique." };
            }
        }
    }

    const passwordToHash = role === "STANDARD" ? standardUserPassword : password;
    const pwdHash = await hash(passwordToHash, 12);
    const existingUser = await prisma.user.findUnique({
        where: {
            firstName_lastName: { firstName, lastName },
        },
    });

    if (existingUser) {
        return { error: existingUser.active ? "A user with that name already exists." : "A deactivated user with that name already exists. Reactivate that account instead." };
    }

    await prisma.user.create({
        data: {
            firstName,
            lastName,
            type: role,
            pwdHash,
        },
    });

    revalidatePath("/settings/accounts");

    return { success: `${firstName} ${lastName} was created successfully.` };
}

export async function deactivateUser(userId: number): Promise<void> {
    await requireAdministrator();

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            type: true,
            active: true,
        },
    });

    if (!user || !user.active) {
        return;
    }

    if (user.type === "ADMINISTRATOR") {
        return;
    }

    await prisma.user.update({
        where: { id: userId },
        data: { active: false },
    });

    revalidatePath("/settings/accounts");
}

export async function reactivateUser(userId: number, _previousState: ReactivateUserState, formData: FormData): Promise<ReactivateUserState> {
    await requireAdministrator();

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
        return { error: "User does not exist." };
    }

    if (user.active) {
        return { error: "This user is already active." };
    }

    if (user.type === "ADMINISTRATOR") {
        return { error: "Administrator accounts cannot be reactivated here." };
    }

    let passwordToHash: string;

    if (user.type === "STANDARD") {
        passwordToHash = standardUserPassword;
    } else {
        const password = formData.get("password");

        if (typeof password !== "string" || password.length < 8) {
            return { error: "Managers must have a password of at least 8 characters." };
        }

        if (password === standardUserPassword) {
            return { error: "Managers cannot use the standard team password." };
        }

        const privilegedUsers = await prisma.user.findMany({
            where: {
                active: true,
                type: { in: ["MANAGER", "ADMINISTRATOR"] },
            },
            select: { pwdHash: true },
        });

        for (const privilegedUser of privilegedUsers) {
            const passwordAlreadyUsed = await compare(password, privilegedUser.pwdHash);

            if (passwordAlreadyUsed) {
                return { error: "Manager passwords must be unique." };
            }
        }

        passwordToHash = password;
    }

    const pwdHash = await hash(passwordToHash, 12);

    await prisma.user.update({
        where: { id: user.id },
        data: { active: true, pwdHash },
    });

    revalidatePath("/settings/accounts");

    return { success: `${user.firstName} ${user.lastName} was reactivated.` };
}

export async function promoteUser(userId: number, _previousState: PromoteUserState, formData: FormData): Promise<PromoteUserState> {
    await requireAdministrator();

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
        return { error: "User does not exist or is deactivated." };
    }

    if (user.type === "ADMINISTRATOR") {
        return { error: "Administrator roles cannot be changed here." };
    }

    if (user.type === "MANAGER") {
        return { error: "This user is already a Manager." };
    }

    const password = formData.get("password");

    if (typeof password !== "string" || password.length < 8 || password.length > 100) {
        return { error: "Managers must have a password between 8 and 100 characters." };
    }

    if (password === standardUserPassword) {
        return { error: "Managers cannot use the standard team password." };
    }

    if (await isPrivilegedPasswordInUse(password)) {
        return { error: "Manager passwords must be unique." };
    }

    const pwdHash = await hash(password, 12);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            type: "MANAGER",
            pwdHash,
        },
    });

    revalidatePath("/settings/accounts");

    return { success: `${user.firstName} ${user.lastName} was promoted to Manager.` };
}

export async function demoteUser(userId: number): Promise<void> {
    await requireAdministrator();

    const user = await prisma.user.findUnique({
        where: { id: userId },
        select: {
            id: true,
            type: true,
            active: true,
        },
    });

    if (!user || !user.active || user.type !== "MANAGER") {
        return;
    }

    const pwdHash = await hash(standardUserPassword, 12);

    await prisma.user.update({
        where: { id: user.id },
        data: {
            type: "STANDARD",
            pwdHash,
        },
    });

    revalidatePath("/settings/accounts");
}

async function isPrivilegedPasswordInUse(password: string, excludedUserId?: number): Promise<boolean> {
    const privilegedUsers = await prisma.user.findMany({
        where: {
            active: true,
            type: { in: ["MANAGER", "ADMINISTRATOR"] },
            ...(excludedUserId === undefined
                ? {}
                : {
                      id: { not: excludedUserId },
                  }),
        },
        select: { pwdHash: true },
    });

    for (const user of privilegedUsers) {
        if (await compare(password, user.pwdHash)) {
            return true;
        }
    }

    return false;
}
