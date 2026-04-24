# FadeFlow Deployment Runbook

This file is the practical go-live checklist for putting the application online under the `fadeflow.ch` domain.

It assumes the current Phase 8 decisions:

- one Ubuntu VPS for the first pilot
- Nginx serves the frontend and proxies the backend
- Express backend runs as one long-running service
- PostgreSQL runs on the same VPS
- uploads stay on local disk for now
- GitHub Actions builds the frontend and uploads the static files

## Recommended Domain Shape

Use these hostnames:

- `app.fadeflow.ch`
  main application host
- `www.fadeflow.ch`
  optional redirect to `https://app.fadeflow.ch`
- `fadeflow.ch`
  optional redirect to `https://app.fadeflow.ch`

Why this shape:

- it keeps the app URL clean now
- it leaves the root domain free for a future marketing page
- it matches the current route structure well, for example `https://app.fadeflow.ch/demo-salon`

If you want the app directly on `fadeflow.ch`, you can do that too, but `app.fadeflow.ch` is the cleaner long-term default.

## Final URL Shape

Recommended public URLs:

- app: `https://app.fadeflow.ch`
- admin login: `https://app.fadeflow.ch/admin/login`
- public booking example: `https://app.fadeflow.ch/demo-salon`

## 1. Buy And Prepare The VPS

You need one Ubuntu VPS with enough capacity for:

- Node.js backend
- Nginx
- PostgreSQL
- small uploads

For a first pilot salon, a small VPS is usually enough if it has reasonable RAM and SSD storage.

## 2. Point The Domain In Hostpoint

In the Hostpoint DNS panel for `fadeflow.ch`, create these records:

- `A` record for `app.fadeflow.ch` pointing to your VPS public IPv4 address
- optional `A` record for `fadeflow.ch` pointing to the same VPS
- optional `A` record for `www.fadeflow.ch` pointing to the same VPS

If Hostpoint supports `CNAME` for subdomains and you later split services, you can adjust that later. For now, simple `A` records are fine.

After saving the records, verify from your machine:

```bash
nslookup app.fadeflow.ch
```

Do not continue until the domain resolves to the VPS IP.

## 3. Prepare The Server

SSH into the VPS and install the base packages:

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-client rsync curl git
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Install Node.js 22 using your preferred method, then verify:

```bash
node -v
pnpm -v
```

Create the app directories:

```bash
sudo mkdir -p /var/www/sapphirix/app
sudo mkdir -p /var/www/sapphirix/frontend
sudo mkdir -p /var/www/sapphirix/shared
sudo mkdir -p /var/www/sapphirix/uploads
sudo chown -R $USER:$USER /var/www/sapphirix
```

Target layout:

```text
/var/www/sapphirix/
  app/current/
  frontend/current/
  shared/.env
  uploads/
```

## 4. Clone The Repository On The VPS

Clone the repo into the app folder:

```bash
cd /var/www/sapphirix/app
git clone <your-repo-url> current
cd current
pnpm install
```

## 5. Create The Production Env File

Use [/.env.production.example](/.env.production.example) as the template.

Create this file on the VPS:

```text
/var/www/sapphirix/shared/.env
```

Recommended initial values:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://sapphirix_user:strong-password@127.0.0.1:5432/sapphirix_booking

PUBLIC_APP_ORIGIN=https://app.fadeflow.ch
PUBLIC_API_BASE_URL=https://app.fadeflow.ch/api/v1
PUBLIC_ASSET_BASE_URL=https://app.fadeflow.ch
UPLOADS_DIR=/var/www/sapphirix/uploads

FIREBASE_PROJECT_ID=...
FIREBASE_CLIENT_EMAIL=...
FIREBASE_PRIVATE_KEY="..."

PUBLIC_FIREBASE_API_KEY=...
PUBLIC_FIREBASE_AUTH_DOMAIN=...
PUBLIC_FIREBASE_PROJECT_ID=...
PUBLIC_FIREBASE_APP_ID=...

BOT_PROTECTION_ENABLED=false
PUBLIC_BOT_PROTECTION_ENABLED=false
TURNSTILE_SECRET_KEY=
PUBLIC_TURNSTILE_SITE_KEY=

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_AVAILABILITY_MAX_REQUESTS=60
RATE_LIMIT_BOOKING_MAX_REQUESTS=10
```

Notes:

- keep this file only on the server
- do not commit it
- if you enable Turnstile later, set both backend and public keys here

## 6. Create PostgreSQL For Production

Log into PostgreSQL:

```bash
sudo -u postgres psql
```

Then create the DB and user:

```sql
CREATE USER sapphirix_user WITH PASSWORD 'strong-password';
CREATE DATABASE sapphirix_booking OWNER sapphirix_user;
GRANT ALL PRIVILEGES ON DATABASE sapphirix_booking TO sapphirix_user;
```

Exit PostgreSQL, then test the connection from the shell if needed.

## 7. Run The First Backend Build And Migration

From the repo on the VPS:

```bash
cd /var/www/sapphirix/app/current
pnpm --filter backend build
pnpm --filter backend db:migrate
```

If migrations fail here, stop and fix that before continuing.

## 8. Install The Backend Service

Copy the systemd service template from [infra/systemd/sapphirix-backend.service](/infra/systemd/sapphirix-backend.service) to:

```text
/etc/systemd/system/sapphirix-backend.service
```

Then enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable sapphirix-backend
sudo systemctl start sapphirix-backend
sudo systemctl status sapphirix-backend --no-pager
```

Check logs:

```bash
journalctl -u sapphirix-backend -n 200 --no-pager
```

## 9. Configure Nginx For FadeFlow

Use [infra/nginx/sapphirix.conf](/infra/nginx/sapphirix.conf) as the base.

For `fadeflow.ch`, update it to use:

- `server_name app.fadeflow.ch;`
- `root /var/www/sapphirix/frontend/current;`
- uploads alias `/var/www/sapphirix/uploads/`

If you also want redirects from `fadeflow.ch` and `www.fadeflow.ch`, add extra server blocks that redirect to `https://app.fadeflow.ch`.

Copy the final config into:

```text
/etc/nginx/sites-available/sapphirix
```

Enable it:

```bash
sudo ln -s /etc/nginx/sites-available/sapphirix /etc/nginx/sites-enabled/sapphirix
sudo nginx -t
sudo systemctl reload nginx
```

## 10. Add HTTPS

Install Certbot:

```bash
sudo apt install -y certbot python3-certbot-nginx
```

Request the certificate:

```bash
sudo certbot --nginx -d app.fadeflow.ch
```

If you are also serving redirects for the apex and `www`, include them too:

```bash
sudo certbot --nginx -d app.fadeflow.ch -d fadeflow.ch -d www.fadeflow.ch
```

Then verify automatic renewal:

```bash
sudo systemctl status certbot.timer --no-pager
```

## 11. Prepare GitHub Actions Secrets

In GitHub repository settings, add these secrets for the frontend deploy workflow:

- `VPS_HOST`
  your VPS hostname or IP
- `VPS_USER`
  SSH user on the VPS
- `VPS_SSH_PRIVATE_KEY`
  private key used by GitHub Actions to connect
- `VPS_SSH_PORT`
  optional, if not `22`
- `VPS_FRONTEND_PATH`
  recommended: `/var/www/sapphirix/frontend/current`

Your frontend deploy workflow is already in [/.github/workflows/deploy-frontend.yml](/.github/workflows/deploy-frontend.yml).

## 12. Do The First Frontend Upload

You have two options.

Option A: use GitHub Actions now

- push to the configured branch or trigger the workflow manually
- let the workflow build the Angular app and upload `apps/frontend/dist/frontend/browser/`

Option B: do one manual upload first

```bash
pnpm --filter frontend build
rsync -az --delete apps/frontend/dist/frontend/browser/ user@your-vps:/var/www/sapphirix/frontend/current/
```

For the very first go-live, a manual upload is acceptable if you want to reduce moving parts.

## 13. Verify The Backend Is Reachable Through Nginx

Run these checks in a browser or with `curl`:

- `https://app.fadeflow.ch/health` if you expose it directly through the same host root
- `https://app.fadeflow.ch/api/v1/...` through the Nginx proxy
- `https://app.fadeflow.ch/admin/login`
- `https://app.fadeflow.ch/demo-salon`

Your current key health URLs are:

- `https://app.fadeflow.ch/health`
- `https://app.fadeflow.ch/ready`

If the app is only reachable locally and not through Nginx, fix Nginx before continuing.

## 14. Provision The First Pilot Salon

From the VPS app folder:

```bash
cd /var/www/sapphirix/app/current
pnpm provision:dev-admin -- --salon-name "Demo Salon" --salon-slug demo-salon --admin-email owner@example.com --admin-password "ChangeMe123!" --admin-first-name Demo --admin-last-name Owner
```

Because `PUBLIC_APP_ORIGIN` is set, the script output will print the correct production URLs.

Then:

- log in as the admin
- create real services
- set opening hours
- upload the logo
- confirm the booking URL with the salon owner

## 15. Set Up Automated Backups

Use [infra/scripts/backup-sapphirix.sh](/infra/scripts/backup-sapphirix.sh).

Make it executable:

```bash
chmod +x /var/www/sapphirix/app/current/infra/scripts/backup-sapphirix.sh
```

Add a daily cron job:

```bash
crontab -e
```

Recommended entry:

```bash
0 3 * * * /var/www/sapphirix/app/current/infra/scripts/backup-sapphirix.sh >> /var/log/sapphirix-backup.log 2>&1
```

Minimum requirement before go-live:

- database backups run automatically
- uploads are backed up
- production `.env` is backed up securely
- at least one restore rehearsal has been done

## 16. Do The Full Go-Live Verification

Use [infra/release-checklist.md](/infra/release-checklist.md).

At minimum, confirm:

- backend service is running
- `health` and `ready` work
- admin login works
- public booking flow works end to end
- a real test booking can be created
- bookings appear in admin
- uploads render correctly
- logs are readable
- backup script works

## 17. Regular Deploy Flow After Go-Live

For backend changes:

```bash
cd /var/www/sapphirix/app/current
git pull
pnpm install --frozen-lockfile
pnpm --filter backend build
pnpm --filter backend db:migrate
sudo systemctl restart sapphirix-backend
```

For frontend changes:

- use the GitHub Actions frontend deploy workflow
- or manually rebuild and `rsync` the dist files

## 18. Suggested First Real Launch Order

Do the rollout in this order:

1. Get DNS working for `app.fadeflow.ch`
2. Get Nginx + HTTPS working
3. Get backend service + PostgreSQL working
4. Get frontend files deployed
5. Run migrations
6. Provision a test salon
7. Test booking + admin login yourself
8. Test together with your barber friend
9. Enable daily backups
10. Only then treat it as live

## 19. Things Not To Forget

- keep the production `.env` only on the VPS
- keep Firebase admin credentials private
- do not enable bot protection until you have real Turnstile keys ready
- do not skip the restore rehearsal
- do not point a real salon to the system before you have personally completed one full booking and one full admin workflow on the live domain

## 20. Recommended First Public Setup For FadeFlow

If you want the simplest clean first rollout, use:

- app host: `app.fadeflow.ch`
- app origin env values pointing to `https://app.fadeflow.ch`
- root domain `fadeflow.ch` redirecting to `https://app.fadeflow.ch`
- one pilot salon URL such as `https://app.fadeflow.ch/demo-salon`

That is the most pragmatic setup for getting fully online without boxing yourself into the wrong domain shape later.