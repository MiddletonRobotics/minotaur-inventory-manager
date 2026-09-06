import "server-only";

import { cookies } from "next/headers";
import { SignJWT, jwtVerify } from "jose";

import prisma from "@/prisma/prisma";
import type { Role } from "@/prisma/generated/enums";

const sessionCookie = "session";
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

const secret = process.env.SESSION_SECRET;

if (!secret) {
    throw new Error("A Session Secret is required");
}

const encodedKey = new TextEncoder().encode(secret);

export type Session = {
    user: {
        id: string;
        firstName: string;
        lastName: string;
        role: Role;
    };
    expiresAt: Date;
};

type SessionPayload = {
    userId: string;
    expiresAt: string;
};

async function encrypt(payload: SessionPayload): Promise<string> {
    return new SignJWT(payload).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime("7d").sign(encodedKey);
}

async function decrypt(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, encodedKey, {
            algorithms: ["HS256"],
        });

        return payload as SessionPayload;
    } catch {
        return null;
    }
}

export async function authenticate(): Promise<Session | null> {
    const cookieStore = await cookies();
    const token = cookieStore.get(sessionCookie)?.value;

    if (!token) {
        return null;
    }

    const payload = await decrypt(token);

    if (!payload) {
        return null;
    }

    const expiresAt = new Date(payload.expiresAt);

    if (expiresAt < new Date()) {
        return null;
    }

    const userId = Number(payload.userId);

    if (!Number.isInteger(userId)) {
        return null;
    }

    const user = await prisma.user.findUnique({
        where: {
            id: userId,
        },
        select: {
            id: true,
            firstName: true,
            lastName: true,
            type: true,
            active: true,
        },
    });

    if (!user || !user.active) {
        return null;
    }

    return {
        user: {
            id: String(user.id),
            firstName: user.firstName,
            lastName: user.lastName,
            role: user.type,
        },
        expiresAt,
    };
}

export async function createSession(userId: string) {
    const expiresAt = new Date(Date.now() + sessionDurationMs);

    const token = await encrypt({
        userId,
        expiresAt: expiresAt.toISOString(),
    });

    const cookieStore = await cookies();

    cookieStore.set(sessionCookie, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
    });
}

export async function deleteSession() {
    const cookieStore = await cookies();
    cookieStore.delete(sessionCookie);
}
