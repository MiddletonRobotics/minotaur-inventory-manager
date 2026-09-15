import type { Instrumentation } from "next";

export async function register() {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;

    const { logger, pruneOldLogs } = await import("@/server/logger");

    const removed = await pruneOldLogs();

    await logger.info("system", "Application server started", {
        environment: process.env.NODE_ENV,
        nodeVersion: process.version,
        pid: process.pid,
        oldLogsRemoved: removed,
    });
}

export const onRequestError: Instrumentation.onRequestError = async (error, request, context) => {
    if (process.env.NEXT_RUNTIME !== "nodejs") return;

    const { logger } = await import("@/server/logger");

    await logger.error("next", "Unhandled server request error", {
        error,
        method: request.method,
        path: request.path,
        routePath: context.routePath,
        routeType: context.routeType,
        routerKind: context.routerKind,
    });
};