# FadeFlow

FadeFlow is a focused multi-tenant salon booking SaaS for the Swiss market.

The MVP has two primary surfaces:

- a public guest booking flow for salon customers
- an authenticated admin workspace for salon staff

This repository is the full application source for the current MVP, including frontend, backend, database migrations, deployment scripts, CI workflows, smoke tests, and production runbook information.

## Product Scope

FadeFlow is intentionally narrow in MVP scope.

- Each salon is a tenant.
- Customers book as guests. There are no customer accounts in the MVP.
- Admins authenticate with Firebase Auth.
- Tenant authorization is enforced in the backend and database access layer.
- The current delivery model is one shared hosted application, starting with a single pilot salon deployment.

### Customer experience

- Open a salon booking page at `https://fadeflow.ch/:salonSlug`
- Review salon details and offered services
- See available booking days and times
- Submit a booking request with name, email, phone, and optional notes

### Admin experience

- Sign in at `https://fadeflow.ch/admin/login`
- Review upcoming bookings and booking calendar data
- Create, edit, confirm, cancel, and delete bookings
- Manage salon profile data, services, opening hours, time-off blocks, staff members, and salon logo
- See in-app notifications for new public booking requests

### Current MVP boundaries

- No outbound email or SMS notifications yet
- No customer self-service account area
- No durable shared rate-limit store yet; the current limiter is single-process memory based
- Turnstile bot protection exists but is controlled entirely through env configuration
- Operational monitoring and alerting are expected to be configured on the VPS at go-live time

## Tech Stack

- Frontend: Angular 21
- UI: PrimeNG
- Styling: Tailwind CSS 4 + custom theme tokens
- Backend: Node.js + Express 5
- Database: PostgreSQL 17
- ORM/query layer: Drizzle ORM
- Admin auth: Firebase Auth + Firebase Admin SDK
- Validation: Zod
- Monorepo: pnpm workspace
- Build/test tooling: TypeScript, Vitest, Supertest, Angular build tools

## Repository Layout

```text
apps/
  backend/      Express API, migrations, scripts, smoke tests
  frontend/     Angular SPA
packages/
  shared/       shared package space for future reuse
infra/
  scripts/      backend deploy and backup scripts
scripts/        repo-level utility scripts
.github/
  workflows/    CI and frontend deploy automation
docker-compose.yml
pnpm-workspace.yaml
```

## Architecture Overview

FadeFlow currently runs as a classic single-page app plus JSON API.

- Angular SPA served as static files
- Express backend serving `/api/v1/*`
- PostgreSQL as the single source of truth
- One database shared across tenants with salon scoping
- Files stored on local disk for now, under the configured uploads directory

### Backend domains

The backend is organized by domain rather than by generic controllers/services split.

- `modules/salons`: public salon and service data
- `modules/bookings`: availability calculation, public booking creation, admin booking management
- `modules/admin`: profile setup, opening hours, time off, services, staff, in-app notifications
- `middleware`: auth, validation, request context, rate limiting, bot protection, error handling
- `db`: Drizzle schema, client, migrations

### Frontend routes

The frontend uses route-level lazy loading to keep the initial bundle smaller.

- `/admin/login`: admin login page
- `/admin`: admin bookings page
- `/admin/settings`: admin setup and configuration page
- `/impressum`, `/datenschutz`, `/agb`, `/kontakt`: legal/support pages
- `/:salonSlug`: public salon booking flow

### Availability model

Available slots are derived from salon configuration and booking data.

- opening hours
- time-off blocks
- existing bookings
- service duration
- salon booking buffer
- booking lead time and booking horizon rules

## Local Development

### Prerequisites

- Node.js 22
- pnpm 10.x
- Docker Desktop or compatible Docker runtime

### 1. Install dependencies

```bash
pnpm install --frozen-lockfile
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts PostgreSQL 17 locally on `localhost:5433` using the config from `docker-compose.yml`.

### 3. Create the root env file

Create a root `.env` file. A minimal local baseline looks like this:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sapphirix_booking
PORT=3000
PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
PUBLIC_ASSET_BASE_URL=http://localhost:3000
PUBLIC_APP_ORIGIN=http://localhost:4200
BOT_PROTECTION_ENABLED=false
PUBLIC_BOT_PROTECTION_ENABLED=false
```

You also need the Firebase backend and frontend values for admin authentication.

### 4. Run the app

```bash
pnpm dev
```

Default local endpoints:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`
- Health: `http://localhost:3000/health`
- Readiness: `http://localhost:3000/ready`

The frontend env file is generated automatically from the root `.env` before frontend start/build commands.

## Environment Variables

The production env shape is:

```env
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://sapphirix_user:change-me@127.0.0.1:5432/sapphirix_booking

PUBLIC_APP_ORIGIN=https://fadeflow.ch
PUBLIC_API_BASE_URL=https://fadeflow.ch/api/v1
PUBLIC_ASSET_BASE_URL=https://fadeflow.ch
UPLOADS_DIR=/var/www/fadeflow/uploads

FIREBASE_PROJECT_ID=
FIREBASE_CLIENT_EMAIL=
FIREBASE_PRIVATE_KEY=

PUBLIC_FIREBASE_API_KEY=
PUBLIC_FIREBASE_AUTH_DOMAIN=
PUBLIC_FIREBASE_PROJECT_ID=
PUBLIC_FIREBASE_APP_ID=

BOT_PROTECTION_ENABLED=false
PUBLIC_BOT_PROTECTION_ENABLED=false
TURNSTILE_SECRET_KEY=
PUBLIC_TURNSTILE_SITE_KEY=

RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_AVAILABILITY_MAX_REQUESTS=60
RATE_LIMIT_BOOKING_MAX_REQUESTS=10
```

### Important env behavior

- `PUBLIC_APP_ORIGIN` is used by the backend CORS policy and should match the real browser origin, for example `https://fadeflow.ch`
- `BOT_PROTECTION_ENABLED` and `PUBLIC_BOT_PROTECTION_ENABLED` should be switched together when enabling Turnstile
- `UPLOADS_DIR` should point outside the release directory in production

## Common Commands

### Root commands

```bash
pnpm env:sync
pnpm db:dump
pnpm db:restore -- ./.backups/your-dump.sql
pnpm provision:dev-admin -- --salon-name "Demo Salon" --salon-slug demo-salon --admin-email owner@example.com --admin-password "ChangeMe123!" --admin-first-name Demo --admin-last-name Owner
pnpm build:frontend
pnpm build:backend
pnpm start:backend
pnpm dev
pnpm dev:frontend
pnpm dev:backend
pnpm build
pnpm test:smoke
```

### Backend workspace commands

```bash
pnpm --filter backend dev
pnpm --filter backend build
pnpm --filter backend start
pnpm --filter backend db:generate
pnpm --filter backend db:migrate
pnpm --filter backend provision:dev-admin
pnpm --filter backend test:smoke
```

### Frontend workspace commands

```bash
pnpm --filter frontend start
pnpm --filter frontend build
pnpm --filter frontend test --watch=false
```

## Database And Data Sync

### Migrations

Schema changes are tracked through SQL migrations in `apps/backend/drizzle`.

Apply migrations with:

```bash
pnpm --filter backend db:migrate
```

### Local dev data sync

For moving local development data between machines:

1. Run `pnpm db:dump` on the source machine
2. Copy the generated SQL dump privately
3. Run `pnpm db:restore -- path/to/dump.sql` on the target machine
4. Run `pnpm --filter backend db:migrate` if the repo revision is newer

Schema stays in Git. Data moves through SQL dumps, not Docker volumes.

## Provisioning A Salon And Admin

Create a salon and matching Firebase-backed admin with:

```bash
pnpm provision:dev-admin -- --salon-name "Demo Salon" --salon-slug demo-salon --admin-email owner@example.com --admin-password "ChangeMe123!" --admin-first-name Demo --admin-last-name Owner
```

Optional fields:

```text
--salon-email
--salon-phone
--salon-description
--timezone
--address-line-1
--address-line-2
--postal-code
--city
--country-code
```

What the script does:

1. Creates the salon row if the slug does not exist
2. Creates the Firebase user if the email does not exist
3. Creates the matching internal admin record linked by Firebase UID

If data already exists, it reuses valid state and stops on inconsistent linkage rather than silently creating broken auth state.

## API Surface

### Health endpoints

- `GET /health`: liveness probe
- `GET /ready`: readiness probe including database check

### Public API

- `GET /api/v1/salons/:slug`
- `GET /api/v1/salons/:slug/services`
- `GET /api/v1/salons/:slug/availability`
- `GET /api/v1/salons/:slug/availability-calendar`
- `POST /api/v1/bookings`

### Admin API

All admin routes are protected by Firebase bearer-token auth.

- `GET /api/v1/admin/me`
- `GET /api/v1/admin/notifications`
- `POST /api/v1/admin/notifications/read`
- `GET/PATCH /api/v1/admin/salon`
- `POST /api/v1/admin/salon/logo`
- `GET/POST/PATCH/DELETE /api/v1/admin/services`
- `GET/PUT /api/v1/admin/opening-hours`
- `GET/POST/DELETE /api/v1/admin/time-off-blocks`
- `GET /api/v1/admin/bookings/upcoming`
- `GET /api/v1/admin/bookings`
- `GET /api/v1/admin/bookings/calendar`
- `GET/POST/PATCH/DELETE /api/v1/admin/bookings`
- `GET/POST/DELETE /api/v1/admin/staff-members`

## Security And Runtime Behavior

### Auth

- Admins authenticate with Firebase Auth on the frontend
- The backend verifies Firebase ID tokens with the Firebase Admin SDK
- Tenant access is enforced using the internal admin record and salon linkage

### CORS

- Browser requests are restricted to `PUBLIC_APP_ORIGIN`
- Origin-less requests such as health checks and direct non-browser clients are still allowed

### Rate limiting

The backend rate-limits public availability and booking endpoints.

- availability endpoints use the availability limit env values
- booking creation uses the booking limit env values
- current implementation uses in-memory process state, which is acceptable for a single-process pilot but not for multi-instance scaling

### Bot protection

Turnstile support exists, but shipping it is an env-level decision.

- backend verification is enabled with `BOT_PROTECTION_ENABLED=true`
- frontend widget exposure is enabled with `PUBLIC_BOT_PROTECTION_ENABLED=true`
- both values should be set together when going live with Turnstile

### Uploads

- salon logos are stored on disk
- production uploads should live outside the app release directory
- recommended production location: `/var/www/fadeflow/uploads`

## Frontend Notes

The Angular app currently uses route-level lazy loading for its major pages.

- this reduced the initial production bundle size significantly versus eager loading
- the current production build still warns because the initial bundle remains slightly above the configured warning budget
- the main remaining bundle pressure comes from feature code and component styling, not just logo images

## Testing And Quality Checks

### Current automated checks

- root workspace build: `pnpm build`
- backend smoke tests: `pnpm test:smoke`
- minimal frontend tests: `pnpm --filter frontend test --watch=false`

### Current CI

GitHub Actions CI runs:

1. checkout
2. `pnpm install --frozen-lockfile`
3. `pnpm build`
4. `pnpm test:smoke`

### Current testing philosophy

- backend smoke tests focus on route-level happy paths
- frontend coverage is intentionally light and mainly protects against obvious regressions in app boot and route shape
- most UX verification is still expected to be done manually during MVP iteration

## Production Deployment

The intended first production target is one Ubuntu VPS.

### Target shape

- one Ubuntu VPS
- Nginx serves Angular static files
- Nginx reverse proxies `/api` to the backend on `127.0.0.1:3000`
- Express runs as a long-running `systemd` service
- PostgreSQL runs on the same VPS
- uploads are stored on local disk under `/var/www/fadeflow/uploads`

### Recommended server paths

```text
/var/www/fadeflow/
  app/current/        checked-out repo
  frontend/current/   deployed Angular browser files
  shared/.env         production env file
  uploads/            salon logos and future small media
```

### VPS preparation

Install the base packages:

```bash
sudo apt update
sudo apt install -y nginx postgresql postgresql-client rsync curl git
curl -fsSL https://get.pnpm.io/install.sh | sh -
```

Install Node.js 22, then create directories:

```bash
sudo mkdir -p /var/www/fadeflow/app /var/www/fadeflow/frontend /var/www/fadeflow/shared /var/www/fadeflow/uploads
sudo chown -R $USER:$USER /var/www/fadeflow
```

### Production env file

Write the real production env to:

```text
/var/www/fadeflow/shared/.env
```

### Database setup

Create the production PostgreSQL user and database, then run migrations after the first checkout:

```bash
pnpm --filter backend db:migrate
```

### Backend service

Create the final `systemd` unit directly on the server, for example:

```text
/etc/systemd/system/fadeflow-backend.service
```

Then enable and start it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable fadeflow-backend
sudo systemctl start fadeflow-backend
sudo systemctl status fadeflow-backend --no-pager
```

Inspect logs with:

```bash
journalctl -u fadeflow-backend -n 200 --no-pager
```

### Nginx

Create the final Nginx config directly on the server.

Recommended behavior:

- `fadeflow.ch` as the primary app origin
- optional `www.fadeflow.ch` redirect to `https://fadeflow.ch`
- static frontend root at `/var/www/fadeflow/frontend/current`
- uploads alias at `/var/www/fadeflow/uploads`
- reverse proxy `/api` to `127.0.0.1:3000`
- HTTPS with Let’s Encrypt
- security headers and cache policy configured on the server

After creating the site config, validate and reload Nginx:

```bash
sudo nginx -t
sudo systemctl reload nginx
```

### Deploy workflow

For backend deploys on the VPS:

```bash
bash infra/scripts/deploy-backend.sh
```

That script:

1. installs dependencies
2. builds the backend
3. runs migrations
4. restarts the backend service

For frontend deploys, GitHub Actions builds the Angular app and uploads `apps/frontend/dist/frontend/browser/` to the VPS over SSH/rsync.

## Operations

### Health checks

- `GET /health`
- `GET /ready`

### Logging

- request IDs are attached to requests
- request completion is logged in structured JSON
- unhandled and server errors are logged centrally in the backend process output

### Backups

The backup script is:

```text
infra/scripts/backup-sapphirix.sh
```

It backs up:

- PostgreSQL
- uploads
- production `.env`

Suggested daily cron:

```bash
0 3 * * * /var/www/fadeflow/app/current/infra/scripts/backup-sapphirix.sh >> /var/log/fadeflow-backup.log 2>&1
```

### Release checklist

Before go-live or deploy, verify at least the following:

- `pnpm install`
- `pnpm build`
- `pnpm test:smoke`
- production env values reviewed
- Firebase values reviewed
- Turnstile values reviewed if enabled
- backend build completed on the VPS
- migrations completed successfully
- frontend files uploaded to `/var/www/fadeflow/frontend/current`
- backend service restarted
- Nginx validated and reloaded
- `/health` and `/ready` both succeed
- public booking page loads
- services load correctly
- availability returns valid slots
- a real test booking can be created
- admin login works
- admin bookings page works
- admin settings page works
- upload flow works for the salon logo
- logs are readable for a normal request and a bad request
- one automated backup has run successfully
- one restore rehearsal has been completed in a safe environment

## CI And Automation

### CI workflow

The CI workflow builds the workspace and runs backend smoke tests on pushes and pull requests.

### Frontend deploy workflow

The frontend deploy workflow:

1. checks out the repo
2. installs dependencies with pnpm
3. builds the frontend
4. prepares the SSH key from GitHub secrets
5. uploads the built frontend files to the configured VPS path with `rsync`

Expected secrets:

- `VPS_SSH_PRIVATE_KEY`
- `VPS_SSH_PORT`
- `VPS_HOST`
- `VPS_USER`
- `VPS_FRONTEND_PATH`

## Current MVP Status

What is already in place:

- public booking flow
- admin login
- admin booking management
- service management
- opening hours and time-off management
- staff member management
- salon logo uploads
- in-app admin notifications for public bookings
- backend smoke coverage
- minimal frontend coverage
- CORS restriction to the configured public app origin
- route-level lazy loading in the frontend

What is intentionally still manual or deferred:

- outbound customer/staff notifications
- production alerting setup
- final VPS monitoring setup
- Turnstile go-live decision
- durable distributed rate limiting
- richer automated frontend coverage

## Development Notes

The MVP was built iteratively, but the repository is now meant to be operated from this README as the single source of project documentation.

Any future documentation should either:

- live directly in this README if it is operationally important, or
- live as code comments close to the implementation if it is implementation-specific