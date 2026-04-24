# Production Deploy Guide

This repository is currently prepared for a first pilot release on one Ubuntu VPS.

## Target Shape

- One IONOS Ubuntu VPS
- Nginx serves the Angular frontend static files
- Nginx reverse proxies `/api` to the backend on `127.0.0.1:3000`
- Express backend runs as a long-running `systemd` service
- PostgreSQL runs on the same VPS
- Uploads are stored outside the app release directory at `/var/www/sapphirix/uploads`

## Recommended Server Paths

```text
/var/www/sapphirix/
  app/current/               checked-out repo
  frontend/current/          deployed Angular browser files
  shared/.env                production env file
  uploads/                   salon logos and future small media
```

## 1. Prepare The VPS

Install the basics:

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-client rsync curl git
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Install Node.js 22 with your preferred method, then verify:

```bash
node -v
pnpm -v
```

Create directories:

```bash
sudo mkdir -p /var/www/sapphirix/app /var/www/sapphirix/frontend /var/www/sapphirix/shared /var/www/sapphirix/uploads
sudo chown -R $USER:$USER /var/www/sapphirix
```

## 2. Prepare The Production Env

Use [/.env.production.example](../.env.production.example) as the starting point and write the real values to:

```text
/var/www/sapphirix/shared/.env
```

Important values for the first pilot:

- `NODE_ENV=production`
- `DATABASE_URL`
- `PUBLIC_APP_ORIGIN`
- `PUBLIC_API_BASE_URL`
- `PUBLIC_ASSET_BASE_URL`
- `UPLOADS_DIR=/var/www/sapphirix/uploads`
- Firebase backend credentials
- Firebase public frontend values
- Turnstile values if bot protection is enabled

## 3. Database

Create the production database and user, then grant access.

Run migrations from the app folder after the first checkout:

```bash
pnpm --filter backend db:migrate
```

## 4. Backend Service

Copy [infra/systemd/sapphirix-backend.service](infra/systemd/sapphirix-backend.service) to:

```text
/etc/systemd/system/sapphirix-backend.service
```

Review the paths if your VPS layout differs, then enable it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sapphirix-backend
sudo systemctl start sapphirix-backend
```

Check logs:

```bash
journalctl -u sapphirix-backend -n 200 --no-pager
```

## 5. Frontend Delivery

The intended first-pilot path is:

1. GitHub Actions builds the frontend
2. GitHub Actions uploads `apps/frontend/dist/frontend/browser/` to the VPS
3. Nginx serves `/var/www/sapphirix/frontend/current`

You can also do one manual upload first if needed.

## 6. Nginx

Use [infra/nginx/sapphirix.conf](infra/nginx/sapphirix.conf) as the starting point.

After copying it into `/etc/nginx/sites-available/`, enable and validate:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

Then add HTTPS with your preferred Let’s Encrypt flow.

## 7. Deploy Workflow

For the backend on the VPS:

```bash
bash infra/scripts/deploy-backend.sh
```

That script:

1. installs dependencies
2. builds the backend
3. runs migrations
4. restarts the systemd service

## 8. Backups

Use [infra/scripts/backup-sapphirix.sh](infra/scripts/backup-sapphirix.sh) as the basis for a daily cron job.

It backs up:

- PostgreSQL
- uploads
- production `.env`

Recommended first-pilot cron:

```bash
0 3 * * * /var/www/sapphirix/app/current/infra/scripts/backup-sapphirix.sh >> /var/log/sapphirix-backup.log 2>&1
```

## 9. First Pilot Verification

Use [infra/release-checklist.md](infra/release-checklist.md).