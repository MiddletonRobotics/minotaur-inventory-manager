"use server";

import { revalidatePath } from "next/cache";
import { createDatabaseBackup } from "@/server/backups";
import { authenticate } from "@/server/session";

export type CreateBackupState = { status: "idle" | "success" | "error"; message: string };

export async function createBackupAction(previousState: CreateBackupState): Promise<CreateBackupState> {
    const session = await authenticate();

    if (!session) {
        return { status: "error", message: "You must be logged in to create a backup." };
    }

    if (session.user.role !== "ADMINISTRATOR") {
        return { status: "error", message: "Only administrators can create database backups." };
    }

    try {
        const result = await createDatabaseBackup();

        if (result.status === "busy") {
            return { status: "error", message: "Another database backup is currently in progress." };
        }

        revalidatePath("/settings/backups");

        return { status: "success", message: "Database backup created successfully." };
    } catch (error) {
        console.error("Failed to create database backup:", error);

        return { status: "error", message: "The database backup could not be created. Check the server logs for details." };
    }
}
