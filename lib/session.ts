import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';

const sessionCookie: string = "session";
const sessionCookieStore: string = "sessions_store"
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
    token: string
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
        const { payload } = await jwtVerify(token, encodedKey, { algorithms: ["HS256"] });
        return payload as SessionPayload;
    } catch {
        return null;
    }
}

export async function authenticate() : Promise<Session | null> {
    const store = await cookies();
    const token = store.get(sessionCookie)?.value;
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

    const store = await cookies();
    store.set(sessionCookie, token,{
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/"
    });

    await upsertStoredSession(token);
}

export async function deleteSession() {
    const store = await cookies();
    store.delete(sessionCookie);
}

async function getStoredTokens() : Promise<string[]> {
    const store = await cookies();
    const raw = store.get(sessionCookieStore)?.value;
    if(!raw) return [];

    try {
        return JSON.parse(raw) as string[];
    } catch {
        return [];
    }
}

async function setStoredTokens(tokens: string[]) : Promise<void> {
    const store = await cookies();
    const expiresAt = new Date(Date.now() + sessionDurationMs);

    store.set(sessionCookieStore, JSON.stringify(tokens), {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/"
    });
}

async function upsertStoredSession(newToken: string) : Promise<void> {
    const newPayload = await decrypt(newToken);
    if(!newPayload) return;

    const existing = await getStoredTokens();

    const filtered: string[] = [];
    for(const t of existing) {
        const p = await decrypt(t);
        if(!p) continue;
        if(p && p.userId != newPayload.userId) filtered.push(t);
    }

    filtered.push(newToken);
    await setStoredTokens(filtered);
}

export async function getStoredSessions() : Promise<StoredSessionSummary[]> {
    const tokens = await getStoredTokens();
    const results: StoredSessionSummary[] = [];

    for (const token of tokens) {
        const payload = await decrypt(token);
        if (!payload) continue;

        const isValid = new Date(payload.expiresAt) > new Date();
        results.push({
            userId:    payload.userId,
            firstName: payload.firstName,
            lastName:  payload.lastName,
            isAdmin:   payload.isAdmin,
            expiresAt: payload.expiresAt,
            isValid,
            token,
        });
    }

    return results;
}

export async function switchToSession(token: string): Promise<Boolean> {
    const payload = await decrypt(token);
    if (!payload) return false;
    if (new Date(payload.expiresAt) > new Date()) return false;

    const store = await cookies();
    const expiresAt = new Date(payload.expiresAt);

    store.set(sessionCookie, token, {
        httpOnly: true,
        secure: process.env.NODE_ENV == "production",
        sameSite: "lax",
        expires: expiresAt,
        path: "/",
    });

    return true;
}