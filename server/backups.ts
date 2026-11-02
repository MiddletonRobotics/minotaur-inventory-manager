import "server-only";

import { execFile } from "node:child_process";
import { access, lstat, readdir } from "node:fs/promises";
import path from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const backupDirectory = process.env.BACKUP_DIRECTORY?.trim() || "/var/lib/minotaur/backups/hourly";
const backupScript = path.join(process.cwd(), "scripts", "backup-database.sh");
const backupFilePattern = /^minomanager-[A-Za-z0-9._-]+\.dump$/;

export type DatabaseBackup = {
    fileName: string;
    createdAt: Date;
    sizeBytes: number;
};

type DatabaseBackupFile = DatabaseBackup & { filePath: string; };
export type CreateDatabaseBackupResult = | { status: "created"; backup: DatabaseBackup; } | { status: "busy"; };

export function isValidBackupFileName(fileName: string): boolean {
    return (path.basename(fileName) === fileName && backupFilePattern.test(fileName));
}

async function getBackupMetadata(fileName: string): Promise<DatabaseBackupFile | null> {
    if (!isValidBackupFileName(fileName)) return null;

    const filePath = path.join(backupDirectory, fileName);

    try {
        const fileStats = await lstat(filePath);
        if (!fileStats.isFile()) return null;

        return {
            fileName,
            filePath,
            createdAt: fileStats.mtime,
            sizeBytes: fileStats.size,
        };
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") return null;
        throw error;
    }
}

export async function getDatabaseBackups(): Promise<DatabaseBackup[]> {
    let entries;

    try {
        entries = await readdir(backupDirectory, { withFileTypes: true });
    } catch (error) {
        if (error instanceof Error && "code" in error && error.code === "ENOENT") {
            return [];
        }

        throw error;
    }

    const backups = await Promise.all(
        entries
        	.filter((entry) => entry.isFile() && isValidBackupFileName(entry.name))
            .map((entry) => getBackupMetadata(entry.name)),
        );

    return backups.filter((backup): backup is DatabaseBackupFile => backup !== null).map(({ fileName, createdAt, sizeBytes }) => ({
        fileName,
        createdAt,
        sizeBytes,
    })).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
}

export async function getDatabaseBackupFile(fileName: string): Promise<DatabaseBackupFile | null> {
    return getBackupMetadata(fileName);
}

export async function createDatabaseBackup(): Promise<CreateDatabaseBackupResult> {
    await access(backupScript);

    const { stdout, stderr } = await execFileAsync(backupScript, [], {
            cwd: process.cwd(),
            timeout: 180_000,
            maxBuffer: 1024 * 1024,
            env: { ...process.env, MINOMANAGER_BACKUP_DIR: backupDirectory },
        },
    );

    if (stdout.includes("MINOMANAGER_BACKUP_STATUS=BUSY")) {
        return { status: "busy" };
    }

    const fileMatch = stdout.match(/^MINOMANAGER_BACKUP_FILE=(.+)$/m);

    if (!fileMatch) {
        console.error("Backup script did not report a created backup.", { stdout, stderr });

        throw new Error("Backup script completed without reporting a backup file.");
    }

    const fileName =
        path.basename(fileMatch[1].trim());

    const backup =
        await getBackupMetadata(fileName);

    if (!backup) {
        throw new Error(`Backup was created but could not be found: ${fileName}`);
    }

    return {
        status: "created",
        backup: {
            fileName: backup.fileName,
            createdAt: backup.createdAt,
            sizeBytes: backup.sizeBytes,
        },
    };
}
