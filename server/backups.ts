import "server-only";

import { execFile } from "child_process";
import { access, lstat, readdir } from "fs/promises";
import path from "path";
import { promisify } from "util";

const backupDirectory = process.env.BACKUP_DIRECTORY ?? "";
const backupFilePattern = /^minomanager-(\d{4})-(\d{2})-(\d{2})T(\d{2})-(\d{2})-(\d{2})Z\.dump$/;
const execFileAsync = promisify(execFile);
const backupScript = path.join(process.cwd(), "scripts", "backup-database.sh");

export type DatabaseBackup = { fileName: string; createdAt: Date; sizeBytes: number; };
export type CreateDatabaseBackupResult = { created: boolean; backup: DatabaseBackup | null; };
type DatabaseBackupFile = DatabaseBackup & { filePath: string; };

function parseBackupDate(fileName: string): Date | null {
    const match = backupFilePattern.exec(fileName);

    if (!match) return null;

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = Number(match[3]);
    const hour = Number(match[4]);
    const minute = Number(match[5]);
    const second = Number(match[6]);

    const date = new Date(Date.UTC(
        year,
        month - 1,
        day,
        hour,
        minute,
        second,
    ));

    if (date.getUTCFullYear() !== year || date.getUTCMonth() !== month - 1 || date.getUTCDate() !== day || date.getUTCHours() !== hour || date.getUTCMinutes() !== minute || date.getUTCSeconds() !== second) return null;
    return date;
}

export function isValidBackupFileName(fileName: string): boolean {
    return (path.basename(fileName) === fileName && parseBackupDate(fileName) !== null);
}

export async function getDatabaseBackups(): Promise<DatabaseBackup[]> {
    let files;

    try {
        files = await readdir(backupDirectory, { withFileTypes: true });
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return [];
        throw error;
    }

    const backups = await Promise.all(
        files.filter((file) => file.isFile() && isValidBackupFileName(file.name)).map(async (file) => {
            const createdAt = parseBackupDate(file.name);

            if (!createdAt) return null;

            const filePath = path.join(backupDirectory, file.name);
            const fileStats = await lstat(filePath);

            if (!fileStats.isFile()) return null;

            return {
                fileName: file.name,
                createdAt,
                sizeBytes: fileStats.size,
            };
        }),
    );

    return backups
        .filter((backup): backup is DatabaseBackup => backup !== null)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getDatabaseBackupFile(fileName: string): Promise<DatabaseBackupFile | null> {
    if (!isValidBackupFileName(fileName)) return null;

    const createdAt = parseBackupDate(fileName);

    if (!createdAt) return null;

    const filePath = path.join(backupDirectory, fileName);

    try {
        const fileStats = await lstat(filePath);

        if (!fileStats.isFile()) return null;

        return {
            fileName,
            filePath,
            createdAt,
            sizeBytes: fileStats.size,
        };
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
        throw error;
    }
}

export async function createDatabaseBackup(): Promise<CreateDatabaseBackupResult> {
    await access(backupScript);

    const previousBackup = (await getDatabaseBackups())[0] ?? null;

    try {
        await execFileAsync(backupScript, [], {
            cwd: process.cwd(),
            timeout: 120_000,
            maxBuffer: 1024 * 1024,
            env: process.env,
        });
    } catch (error) {
        console.error("Database backup script failed:", error);
        throw new Error("The database backup could not be created.");
    }

    const newestBackup = (await getDatabaseBackups())[0] ?? null;

    if (!newestBackup || newestBackup.fileName === previousBackup?.fileName) {
        return {
            created: false,
            backup: newestBackup,
        };
    }

    return {
        created: true,
        backup: newestBackup,
    };
}