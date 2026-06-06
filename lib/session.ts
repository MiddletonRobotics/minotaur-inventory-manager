import 'server-only';

import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const sessionCookie: string = "session";
const sessionCookieStore: string = "sessions_store";
const sessionDurationMs: number = 7 * 24 * 60 * 60 * 1000;

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("A Session Secret is required");
const encodedKey = new TextEncoder().encode(secret);

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

export type StoredSessionSummary = {
    userId: string,
    firstName: string,
    lastName: string,
    isAdmin: boolean,
    expiresAt: string,
    isValid: boolean,
}

async function encrypt(payload: SessionPayload): Promise<string> {
    return new SignJWT(payload)
        .setProtectedHeader({ alg: "HS256" })
        .setIssuedAt()
        .setExpirationTime("7d")
        .sign(encodedKey);
}

async function decrypt(token: string): Promise<SessionPayload | null> {
    try {
        const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
        return payload as SessionPayload;
    } catch {
        return null;
    }
}

function isPayloadValid(payload: SessionPayload) : boolean {
    return new Date(payload.expiresAt) > new Date();
}

export async function authenticate(): Promise<Session | null> {
    const store = await cookies();
    const token = store.get(sessionCookie)?.value;
    if (!token) return null;

    const payload = await decrypt(token);
    if (!payload || !isPayloadValid(payload)) return null;

    return {
        user: {
            id: payload.userId,
            firstName: payload.firstName,
            lastName: payload.lastName,
            isAdmin: payload.isAdmin
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

    const store = await cookies();
    await upsertStoredSession(token);

    store.set(sessionCookie, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/"
    });
}

export async function deleteSession() : Promise<void> {
    const store = await cookies();
    const activeToken = store.get(sessionCookie)?.value;

    store.delete(sessionCookie);

    if (activeToken) {
        await removeStoredSession(activeToken);
    }
}

async function getStoredTokens(): Promise<string[]> {
    const store = await cookies();
    const raw = store.get(sessionCookieStore)?.value;
    if (!raw) return [];

    try {
        const parsed = JSON.parse(raw);
        return Array.isArray(parsed) ? parsed.filter((t): t is string => typeof t === "string") : [];
    } catch {
        return [];
    }
}

async function setStoredTokens(tokens: string[]): Promise<void> {
    const store = await cookies();

    if (tokens.length === 0) {
        store.delete(sessionCookieStore);
        return;
    }

    let latestExpiry = new Date(Date.now() + sessionDurationMs);

    for (const token of tokens) {
        const payload = await decrypt(token);
        if (!payload) return;

        const exp = new Date(payload.expiresAt);
        if (exp > latestExpiry) latestExpiry = exp;
    }

    store.set(sessionCookieStore, JSON.stringify(tokens), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: latestExpiry,
        path: "/"
    });
}

async function upsertStoredSession(newToken: string): Promise<void> {
    const newPayload = await decrypt(newToken);
    if (!newPayload) return;

    const existing = await getStoredTokens();
    const filtered: string[] = [];

    for (const token of existing) {
        const payload = await decrypt(token);
        if (!payload || !isPayloadValid(payload)) continue;

        if (payload.userId !== newPayload.userId) {
            filtered.push(token);
        }
    }

    filtered.push(newToken);
    await setStoredTokens(filtered);
}

async function removeStoredSession(tokenToRemove: string) : Promise<void> {
    const tokenToRemovePayload = await decrypt(tokenToRemove);
    if (!tokenToRemovePayload) return;

    const existing = await getStoredTokens();
    const filtered: string[] = [];

    for (const token of existing) {
        const payload = await decrypt(token);
        if (!payload || !isPayloadValid(payload)) continue;

        if (payload.userId !== tokenToRemovePayload.userId) {
            filtered.push(token);
        }
    }

    await setStoredTokens(filtered);
}

export async function getStoredSessions(): Promise<StoredSessionSummary[]> {
    const tokens = await getStoredTokens();
    const results: StoredSessionSummary[] = [];

    for (const token of tokens) {
        const payload = await decrypt(token);
        if (!payload) continue;

        results.push({
            userId: payload.userId,
            firstName: payload.firstName,
            lastName: payload.lastName,
            isAdmin: payload.isAdmin,
            expiresAt: payload.expiresAt,
            isValid: isPayloadValid(payload)
        });
    }

    return results;
}

// export async function switchToSession(token: string): Promise<boolean> {
//     const payload = await decrypt(token);
//     if (!payload || !isPayloadValid(payload)) return false;

//     const storedTokens = await getStoredTokens();
//     let matchingStoredToken: string | undefined;

//     for (const storedToken of storedTokens) {
//         const storedPayload = await decrypt(storedToken);
//         if (storedPayload?.userId === payload.userId && isPayloadValid(payload)) {
//             matchingStoredToken = storedToken;
//             break;
//         }
//     }

//     const tokenToActivate = matchingStoredToken ?? token;
//     const expiresAt = new Date(payload.expiresAt);
//     const store = await cookies();

//     store.set(sessionCookie, tokenToActivate, {
//         httpOnly: true,
//         secure: process.env.NODE_ENV === "production",
//         sameSite: "lax",
//         expires: expiresAt,
//         path: "/"
//     });

//     await upsertStoredSession(tokenToActivate);
//     return true;
// }

export async function switchToStoredSession(userId: string): Promise<boolean> {
    const tokens = await getStoredTokens();

    for (const token of tokens) {
        const payload = await decrypt(token);

        if (!payload) continue;
        if (payload.userId !== userId) continue;
        if (new Date(payload.expiresAt) <= new Date()) continue;

        const store = await cookies();
        store.set(sessionCookie, token, {
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            expires: new Date(payload.expiresAt),
            path: "/",
        });

        return true;
    }

    return false;
}