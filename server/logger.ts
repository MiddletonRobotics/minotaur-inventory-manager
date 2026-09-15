import "server-only";

import { appendFile, mkdir, readdir, rm } from "node:fs/promises";
import { join } from "node:path";

export type LogLevel = | "debug" | "info" | "warn" | "error";
export type LogMetadata = Record<string, unknown>;

const levelPriority: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };
const configuredLevel = parseLogLevel(process.env.LOG_LEVEL) ?? (process.env.NODE_ENV === "production" ? "info" : "debug");
const fileLoggingEnabled = process.env.LOG_TO_FILE !== "false" && process.env.NODE_ENV !== "test";
const retentionDays = parsePositiveInteger(process.env.LOG_RETENTION_DAYS) ?? 30;
const logDirectory = join(process.cwd(), "logs");
const sensitiveKeyPattern = /(password|pwdhash|token|authorization|cookie|secret|session)/i;
let directoryReady = false;
let writeQueue: Promise<void> = Promise.resolve();

function parseLogLevel(value: string | undefined): LogLevel | null {
    if (value === "debug" || value === "info" || value === "warn" || value === "error") return value;
    return null;
}

function parsePositiveInteger(value: string | undefined): number | null {
    if (!value) return null;

    const parsed = Number(value);

    if (!Number.isInteger(parsed) || parsed <= 0)  return null;
    
    return parsed;
}

function shouldLog(level: LogLevel) {
    return (levelPriority[level] >= levelPriority[configuredLevel]);
}

async function ensureLogDirectory() {
    if (directoryReady) return;

    await mkdir(logDirectory, { recursive: true, mode: 0o700 });

    directoryReady = true;
}

function sanitize(value: unknown, key?: string, seen = new WeakSet<object>(), depth = 0): unknown {
    if (key && sensitiveKeyPattern.test(key)) return "[REDACTED]";
    if (value === null || typeof value !== "object") {
        if (typeof value === "bigint") return value.toString();
        if (typeof value === "string" && value.length > 5000) return (value.slice(0, 5000) + "...[truncated]");

        return value;
    }

    if (seen.has(value)) return "[Circular]";

    seen.add(value);

    if (depth >= 6) return "[Max depth reached]";
    if (value instanceof Error) {
        return {
            name: value.name,
            message: value.message,
            stack: value.stack,
            cause: value.cause === undefined ? undefined : sanitize(value.cause, "cause", seen, depth + 1,),
        };
    }

    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) {
        return value.map((entry) => sanitize(
            entry,
            undefined,
            seen,
            depth + 1,
        ));
    }

    const result: Record<string, unknown> = {};

    for (const [entryKey, entryValue] of Object.entries(value)) {
        result[entryKey] = sanitize(entryValue, entryKey, seen, depth + 1);
    }

    return result;
}

function formatLine(level: LogLevel, scope: string, message: string, metadata?: LogMetadata) {
    const timestamp = new Date().toISOString();
    const sanitized = metadata ? sanitize(metadata) : undefined;
    const metadataText = sanitized ? ` ${JSON.stringify(sanitized)}` : "";

    return { timestamp, line: `${timestamp} ` + `${level.toUpperCase().padEnd(5)} ` + `[${scope}] ` + `${message}` + metadataText };
}

function writeToTerminal(level: LogLevel, line: string) {
    switch (level) {
        case "debug":
            console.debug(line);
            break;
        case "info":
            console.info(line);
            break;
        case "warn":
            console.warn(line);
            break;
        case "error":
            console.error(line);
            break;
    }
}

function queueFileWrite(line: string, timestamp: string): Promise<void> {
    if (!fileLoggingEnabled) return Promise.resolve();

    const date = timestamp.slice(0, 10);
    const filePath = join(logDirectory, `${date}.log`);

    writeQueue = writeQueue.then(async () => {
        await ensureLogDirectory();

        await appendFile(filePath, `${line}\n`, {
            encoding: "utf8",
            mode: 0o600,
        }); 
    }).catch((error: unknown) => {
        console.error("Failed to write application log:", error);
    });

    return writeQueue;
}

async function log(level: LogLevel, scope: string, message: string, metadata?: LogMetadata) {
    if (!shouldLog(level)) return;

    const { line, timestamp } = formatLine(level, scope, message, metadata);

    writeToTerminal(level, line);
    await queueFileWrite(line, timestamp);
}

export async function pruneOldLogs() {
    if (!fileLoggingEnabled) return 0;

    await ensureLogDirectory();

    const entries = await readdir(logDirectory, { withFileTypes: true });
    const cutoff = Date.now() - retentionDays * 24 * 60 * 60 * 1000;
    let removed = 0;

    for (const entry of entries) {
        if (!entry.isFile()) continue;

        const match = /^(\d{4}-\d{2}-\d{2})\.log$/.exec(entry.name);

        if (!match) continue;
    
        const fileDate = Date.parse(`${match[1]}T00:00:00.000Z`);

        if (Number.isNaN(fileDate) || fileDate >= cutoff) continue;

        await rm(join(logDirectory, entry.name));

        removed++;
    }

    return removed;
}

export const logger = { debug(scope: string, message: string, metadata?: LogMetadata) {
    return log("debug", scope, message, metadata);
}, info(scope: string, message: string, metadata?: LogMetadata) {
    return log("info", scope, message, metadata);
}, warn(scope: string, message: string, metadata?: LogMetadata) {
    return log("warn", scope, message, metadata);
}, error(scope: string, message: string, metadata?: LogMetadata) {
    return log("error", scope, message, metadata);
}, child(scope: string) {
    return {
        debug(message: string, metadata?: LogMetadata) {
            return log("debug", scope, message, metadata);
        },

        info(message: string, metadata?: LogMetadata) {
            return log("info", scope, message, metadata);
        },

        warn(message: string, metadata?: LogMetadata) {
            return log("warn", scope, message, metadata);
        },

        error(message: string, metadata?: LogMetadata) {
            return log("error", scope, message, metadata);
        },
    }},
};