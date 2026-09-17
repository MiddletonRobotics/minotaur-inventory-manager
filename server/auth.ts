"use server";

import { z } from "zod";
import { compare } from "bcryptjs";
import { redirect } from "next/navigation";
import prisma from "../prisma/prisma";
import { authenticate, createSession, deleteSession } from "./session";
import { logger } from "@/server/logger";

const authLog = logger.child("auth");

const LoginSchema = z.object({
    firstName: z.string().trim().min(1).max(50),
    lastName: z.string().trim().min(1).max(50),
    password: z.string().min(8).max(100),
});

export type LoginState = { error?: string } | undefined;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
    const parsed = LoginSchema.safeParse({
        firstName: formData.get("firstName"),
        lastName: formData.get("lastName"),
        password: formData.get("password"),
    });

    if (!parsed.success) {
        await authLog.warn("Login rejected", { reason: "Invalid login form" });
        return { error: "Please fill in all fields." };
    }

    const { firstName, lastName, password } = parsed.data;

    const user = await prisma.user.findUnique({
        where: {
            firstName_lastName: { firstName, lastName },
        },
    });

    if (!user || !user.active) {
        return { error: "Invalid name or password." };
    }

    const passwordMatch = await compare(password, user.pwdHash);

    if (!passwordMatch) {
        return { error: "Invalid name or password." };
    }

    await createSession(String(user.id));
    await authLog.info("Login successful", { userId: user.id, role: user.type });

    redirect("/");
}

export async function logout(): Promise<never> {
    const session = await authenticate();

    await deleteSession();
    await authLog.info("Logout", { userId: session ? Number(session.user.id) : null });

    redirect("/login");
}
