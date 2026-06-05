import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const sessionCookieName = "session";
const path = ["/login"];

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("A Session Secret is required");
const encodedKey = new TextEncoder().encode(secret);

async function isValidSession(token: string | undefined) : Promise<boolean> {
    if (!token) return false;

    try {
        const { payload } = await jwtVerify(token, encodedKey, { algorithms: ['HS256'] });
        const expiresAt = payload.expiresAt;

        if (typeof expiresAt !== 'string') return false;
        return new Date(expiresAt) > new Date();
    } catch (error) {
        return false;
    }
}

export async function proxy(request: NextRequest) {
    const { pathname, searchParams } = request.nextUrl;

    const isPublic = path.some((p) => pathname === p || pathname.startsWith(p + "/"));
    const isAddingSession = pathname === "/login" && searchParams.get("addSession") === "1";
    const token = request.cookies.get(sessionCookieName)?.value;
    const authed = await isValidSession(token);

    if (!isPublic && !authed) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";
        return NextResponse.redirect(url);
    }

    if (authed && pathname === "/login" && !isAddingSession) {
        const url = request.nextUrl.clone();
        url.pathname = "/";
        return NextResponse.redirect(url);
    }

    return NextResponse.next();
}

export const config = {
    matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};