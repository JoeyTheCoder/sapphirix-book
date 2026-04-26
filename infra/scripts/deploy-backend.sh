#!/usr/bin/env bash

set -euo pipefail

APP_ROOT="${APP_ROOT:-/var/www/fadeflow/app/current}"
SERVICE_NAME="${SERVICE_NAME:-fadeflow-backend}"

cd "$APP_ROOT"

pnpm install --frozen-lockfile
pnpm --filter backend build
pnpm --filter backend db:migrate
sudo systemctl restart "$SERVICE_NAME"
sudo systemctl status "$SERVICE_NAME" --no-pager