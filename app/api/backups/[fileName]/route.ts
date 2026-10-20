import { createReadStream } from "fs";
import { Readable } from "stream";

import { getDatabaseBackupFile } from "@/server/backups";
import { authenticate } from "@/server/session";

export async function GET(_request: Request, { params }: { params: Promise<{ fileName: string }> }) {
    const session = await authenticate();

    if (!session) {
        return new Response("Unauthorized", { status: 401 });
    }

    if (session.user.role !== "ADMINISTRATOR") {
        return new Response("Forbidden", { status: 403 });
    }

    const { fileName } = await params;
    const backup = await getDatabaseBackupFile(fileName);

    if (!backup) {
        return new Response("Backup not found", { status: 404 });
    }

    const nodeStream = createReadStream(backup.filePath);
    const webStream = Readable.toWeb(nodeStream) as ReadableStream<Uint8Array>;

    return new Response(webStream, {
        headers: {
            "Content-Type": "application/octet-stream",
            "Content-Disposition": `attachment; filename="${backup.fileName}"`,
            "Content-Length": String(backup.sizeBytes),
            "Cache-Control": "private, no-store",
            "X-Content-Type-Options": "nosniff",
        },
    });
}
