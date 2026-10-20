import { redirect } from "next/navigation";
import Callout from "@/components/ui/callout";
import { getDatabaseBackups, type DatabaseBackup } from "@/server/backups";
import CreateBackupButton from "@/components/backup-management";
import { authenticate } from "@/server/session";

function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;

    const kilobytes = bytes / 1024;

    if (kilobytes < 1024) return `${kilobytes.toFixed(1)} KB`;

    const megabytes = kilobytes / 1024;

    if (megabytes < 1024) return `${megabytes.toFixed(1)} MB`;

    const gigabytes = megabytes / 1024;

    return `${gigabytes.toFixed(1)} GB`;
}

function formatBackupDate(backup: DatabaseBackup): string {
    return backup.createdAt.toLocaleString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: "UTC",
        timeZoneName: "short",
    });
}

export default async function BackupSettings() {
    const session = await authenticate();

    if (!session) redirect("/login");
    if (session.user.role !== "ADMINISTRATOR") {
        redirect("/settings/inventory");
    }

    let backups: DatabaseBackup[] = [];
    let backupReadFailed = false;

    try {
        backups = await getDatabaseBackups();
    } catch (error) {
        console.error("Failed to read database backups:", error);
        backupReadFailed = true;
    }

    const latestBackup = backups[0] ?? null;

    return (
        <section className="min-w-0 flex-1">
            <div className="border-b border-border pb-6">
                <h2 className="text-2xl font-semibold text-fg">Backups</h2>
                <p className="mt-1 text-sm text-fg-muted">View and download automatic MinoManager database backups.</p>
            </div>

            <section className="border-b border-border py-8">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                        <h3 className="text-lg font-semibold text-fg">Automatic Database Backups</h3>
                        <p className="mt-1 text-sm text-fg-muted">MinoManager creates a PostgreSQL database backup every hour.</p>
                    </div>
                    <CreateBackupButton />
                </div>

                {backupReadFailed ? (
                    <Callout variant="error" title="Backups could not be read." className="mt-6">
                        MinoManager could not access the server&apos;s backup directory. Check the server logs and backup directory permissions.
                    </Callout>
                ) : latestBackup ? (
                    <div className="mt-6">
                        <p className="text-sm text-fg-muted">Last successful backup</p>
                        <p className="mt-1 font-medium text-fg">{formatBackupDate(latestBackup)}</p>
                    </div>
                ) : (
                    <Callout variant="info" title="No backups are available yet." className="mt-6">
                        No automatic database backup files were found on this server.
                    </Callout>
                )}
            </section>

            <section className="py-8">
                <div>
                    <h3 className="text-lg font-semibold text-fg">Recent Backups</h3>
                    <p className="mt-1 text-sm text-fg-muted">
                        {backups.length} {backups.length === 1 ? "backup" : "backups"} currently stored on the server.
                    </p>
                </div>

                {!backupReadFailed && backups.length > 0 ? (
                    <div className="mt-6 border-b border-border">
                        {backups.map((backup) => (
                            <div key={backup.fileName} className="flex items-center justify-between gap-8 border-t border-border py-4">
                                <div className="min-w-0">
                                    <p className="font-medium text-fg">{formatBackupDate(backup)}</p>
                                    <p className="mt-1 truncate text-xs text-fg-dim">{backup.fileName}</p>
                                </div>

                                <div className="flex shrink-0 items-center gap-6">
                                    <span className="text-sm text-fg-muted">{formatFileSize(backup.sizeBytes)}</span>
                                    <a
                                        href={`/api/backups/${encodeURIComponent(backup.fileName)}`}
                                        className="rounded-md border border-border px-3 py-1.5 text-sm text-fg-muted transition-colors hover:border-border-focus hover:bg-card hover:text-fg"
                                    >
                                        Download
                                    </a>
                                </div>
                            </div>
                        ))}
                    </div>
                ) : null}
            </section>
        </section>
    );
}
