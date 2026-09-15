import { PrismaClient } from "./generated/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { logger } from "@/server/logger";

const databaseLog = logger.child("database");

function createPrismaClient(): PrismaClient {
    const connectionString = process.env.DATABASE_URL;

    if (!connectionString) throw new Error("DATABASE_URL is required");

    const adapter = new PrismaPg({ connectionString });
    const client = new PrismaClient({
        adapter,
        log: [{
            emit: "event",
            level: "warn",
        },
        {
            emit: "event",
            level: "error",
        }],
    });

    client.$on("warn", (event) => {
        void databaseLog.warn("Prisma warning", {
            message: event.message,
            target: event.target,
        });
    });

    client.$on("error", (event) => {
        void databaseLog.error("Prisma error", {
            message: event.message,
            target: event.target,
        });
    });

    return client;
}

const globalForPrisma = globalThis as unknown as { prisma: | PrismaClient | undefined };
const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;