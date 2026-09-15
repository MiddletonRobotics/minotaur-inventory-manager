import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import prisma from "@/prisma/prisma";
import { logger } from "@/server/logger";

const httpLog = logger.child("http");
const authLog = logger.child("auth");
const sessionCookieName = "session";
const publicPaths = ["/login"];

const secret = process.env.SESSION_SECRET;
if (!secret) throw new Error("A Session Secret is required");
const encodedKey = new TextEncoder().encode(secret);

async function getSessionUserId(token: string | undefined, requestId: string): Promise<number | null> {
    if (!token) return null;

    try {
        const { payload } = await jwtVerify(token, encodedKey, {
            algorithms: ["HS256"],
        });

        const expiresAt = payload.expiresAt;
        const userId = Number(payload.userId);

        if (typeof expiresAt !== "string" || !Number.isInteger(userId)) {
            await authLog.debug("Session rejected", { requestId, reason: "Invalid session payload" });
            return null;
        }

        if (new Date(expiresAt) <= new Date()) {
            await authLog.debug("Session expired", { requestId, userId });
            return null;
        }

        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { active: true },
        });

        if (!user?.active) {
            await authLog.debug("Session rejected", {
                requestId,
                userId,
                reason: "User inactive or missing",
            });

            return null;
        }

        return userId;
    } catch (error) {
        await authLog.debug("Session validation failed", {
            requestId,
            error,
        });

        return null;
    }
}

export async function proxy(request: NextRequest) {
    const requestId = crypto.randomUUID();
    const { pathname, searchParams } = request.nextUrl;
    const isPublic = publicPaths.some((publicPath) => pathname === publicPath || pathname.startsWith(`${publicPath}/`));
    const isAddingSession = pathname === "/login" && searchParams.get("addSession") === "1";
    const token = request.cookies.get(sessionCookieName)?.value;
    const userId = await getSessionUserId(token, requestId);
    const authed = userId !== null;
    const requestMetadata = {
        requestId,
        method: request.method,
        path: pathname,
        userId,
    };

    if (!isPublic && !authed) {
        const url = request.nextUrl.clone();
        url.pathname = "/login";

        await httpLog.warn("Unauthenticated request redirected", requestMetadata);

        const response = NextResponse.redirect(url);

        response.headers.set("x-request-id", requestId);
        return response;
    }

    if (authed && pathname === "/login" && !isAddingSession) {
        const url = request.nextUrl.clone();
        url.pathname = "/";

        await httpLog.debug("Authenticated login request redirected", requestMetadata);

        const response = NextResponse.redirect(url,);
        response.headers.set("x-request-id", requestId);

        return response;
    }

    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-request-id", requestId);

    if (request.method === "GET") {
        await httpLog.debug("Request accepted", requestMetadata);
    } else {
        await httpLog.info("Request accepted", requestMetadata);
    }

    const response = NextResponse.next({
        request: {
            headers: requestHeaders,
        },
    });

    response.headers.set("x-request-id", requestId);
    return response;
}

export const config = {
    matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
