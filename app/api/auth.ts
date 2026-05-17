import 'server-only';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const sessionCookie = "session";
const sessionDurationMs = 7 * 24 * 60 * 60 * 1000;

const secert = process.env.SESSION_SECERT;
if (!secert) throw new Error("A Session Secret is required");
const encodedKey = new TextEncoder().encode(secert);

export type Session = {
    user: {
        id: string,
        firstName: string,
        lastName: string,
        isAdmin: boolean
    },
    expiresAt: Date
}

type SessionPayload = {
    userId: string,
    firstName: string,
    lastName: string,
    isAdmin: boolean,
    expiresAt: string
}

async function encrypt(payload: SessionPayload) : Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(encodedKey);
}

async function decrypt(token: string) : Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, encodedKey, {
            algorithms: ["HS256"]
        });

        return payload as SessionPayload;
    } catch {
        return null;
    }
}

export async function authenticate() : Promise<Session | null> {
    const theCookieStore = await cookies();
    const token = theCookieStore.get(sessionCookie)?.value;
    if(!token) return null;

    const payload = await decrypt(token);
    if(!payload) return null;

    if (new Date(payload.expiresAt) < new Date()) return null;

    return {
        user: {
            id: payload?.userId,
            firstName: payload?.firstName,
            lastName: payload?.lastName,
            isAdmin: payload?.isAdmin
        },
        expiresAt: new Date(payload.expiresAt)
    }
}

export async function createSession(user: Session["user"]) {
    const expiresAt = new Date(Date.now() + sessionDurationMs);
    const token = await encrypt({
        userId: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        isAdmin: user.isAdmin,
        expiresAt: expiresAt.toISOString()
    });

    const theCookieStore = await cookies();
    theCookieStore.set(sessionCookie, token,{
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/"
    });
}

export async function deleteSession() {
    const theCookiteStore = await cookies();
    theCookiteStore.delete(sessionCookie);
}