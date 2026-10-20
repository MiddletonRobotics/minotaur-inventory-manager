#!/usr/bin/env bash

set -Eeuo pipefail

PROJECT_DIRECTORY="${MINOMANAGER_PROJECT_DIRECTORY:-/home/hecker/minotaur-inventory-manager}"
ENV_FILE="${MINOMANAGER_ENV_FILE:-$PROJECT_DIRECTORY/.env}"
BACKUP_DIRECTORY="${MINOMANAGER_BACKUP_DIRECTORY:-/var/lib/minotaur/backups/hourly}"

# Seven days of hourly backups.
RETENTION_MINUTES="${MINOMANAGER_BACKUP_RETENTION_MINUTES:-10080}"

umask 077

for command_name in pg_dump pg_restore python3 flock; do
    if ! command -v "$command_name" >/dev/null 2>&1; then
        echo "[backup] Required command not found: $command_name" >&2
        exit 1
    fi
done

if [[ ! -r "$ENV_FILE" ]]; then
    echo "[backup] Cannot read environment file: $ENV_FILE" >&2
    exit 1
fi

mkdir -p "$BACKUP_DIRECTORY"
exec 9>"$BACKUP_DIRECTORY/.backup.lock"

if ! flock -n 9; then
    echo "[backup] Another backup is already running."
    exit 0
fi

DIRECT_URL="$(
    python3 - "$ENV_FILE" <<'PY'
from pathlib import Path
import sys

path = Path(sys.argv[1])

for raw_line in path.read_text().splitlines():
    line = raw_line.strip()

    if not line or line.startswith("#"):
        continue

    if line.startswith("export "):
        line = line[7:].lstrip()

    key, separator, value = line.partition("=")

    if separator and key.strip() == "DIRECT_URL":
        value = value.strip()

        if (
            len(value) >= 2
            and value[0] == value[-1]
            and value[0] in {"'", '"'}
        ):
            value = value[1:-1]

        if not value:
            raise SystemExit("DIRECT_URL is empty")

        print(value, end="")
        break
else:
    raise SystemExit("DIRECT_URL was not found")
PY
)"

TIMESTAMP="$(date -u +"%Y-%m-%dT%H-%M-%SZ")"

FINAL_FILE="$BACKUP_DIRECTORY/minomanager-$TIMESTAMP.dump"
TEMP_FILE="$BACKUP_DIRECTORY/.minomanager-$TIMESTAMP.dump.tmp"

cleanup() {
    rm -f "$TEMP_FILE"
}

trap cleanup EXIT
echo "[backup] Starting database backup: $TIMESTAMP"

pg_dump \
    --dbname="$DIRECT_URL" \
    --format=custom \
    --no-owner \
    --no-privileges \
    --file="$TEMP_FILE"

pg_restore --list "$TEMP_FILE" >/dev/null
mv "$TEMP_FILE" "$FINAL_FILE"
trap - EXIT

find "$BACKUP_DIRECTORY" \
    -maxdepth 1 \
    -type f \
    -name "minomanager-*.dump" \
    -mmin "+$RETENTION_MINUTES" \
    -delete

BACKUP_SIZE="$(du -h "$FINAL_FILE" | cut -f1)"

echo "[backup] Backup completed successfully."
echo "[backup] File: $FINAL_FILE"
echo "[backup] Size: $BACKUP_SIZE"