#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/sapphirix/app/current}"
SHARED_ROOT="${SHARED_ROOT:-/var/www/sapphirix/shared}"
BACKUP_ROOT="${BACKUP_ROOT:-/var/backups/sapphirix}"
KEEP_DAYS="${KEEP_DAYS:-7}"

ENV_FILE="${ENV_FILE:-$SHARED_ROOT/.env}"

if [[ ! -f "$ENV_FILE" ]]; then
  echo "Env file not found: $ENV_FILE" >&2
  exit 1
fi

mkdir -p "$BACKUP_ROOT"

timestamp="$(date +%Y%m%d-%H%M%S)"
release_dir="$BACKUP_ROOT/$timestamp"
mkdir -p "$release_dir"

set -a
source "$ENV_FILE"
set +a

if [[ -z "${DATABASE_URL:-}" ]]; then
  echo "DATABASE_URL is missing in $ENV_FILE" >&2
  exit 1
fi

pg_dump "$DATABASE_URL" --clean --if-exists --no-owner --no-privileges > "$release_dir/database.sql"

uploads_dir="${UPLOADS_DIR:-$APP_ROOT/apps/backend/uploads}"

if [[ -d "$uploads_dir" ]]; then
  uploads_parent="$(dirname "$uploads_dir")"
  uploads_name="$(basename "$uploads_dir")"
  tar -czf "$release_dir/uploads.tar.gz" -C "$uploads_parent" "$uploads_name"
fi

cp "$ENV_FILE" "$release_dir/env.backup"

find "$BACKUP_ROOT" -mindepth 1 -maxdepth 1 -type d -mtime +"$KEEP_DAYS" -exec rm -rf {} +

echo "Backup created at $release_dir"