# Sapphirix Book

Online booking software for small salons, built as a focused multi-tenant SaaS.

The goal is simple: a fast public booking flow for customers and a clear admin workspace for salon staff.

---

## Stack

- Frontend: Angular 21
- Styling: Tailwind CSS
- UI: PrimeNG
- Backend: Node.js + Express
- Database: PostgreSQL
- Query layer: Drizzle
- Auth: Firebase Auth for admin login only
- Containers: Docker from day one
- Repo shape: pnpm monorepo

---

## Workspace

```text
apps/
  backend/      Express API
  frontend/     Angular SPA
packages/
  shared/       shared code
concept/        product, MVP, and architecture docs
infra/          infrastructure assets
docker-compose.yml
pnpm-workspace.yaml
```

---

## Quick Start

### 1. Install dependencies

```bash
pnpm install
```

### 2. Start PostgreSQL

```bash
docker compose up -d
```

This starts a local PostgreSQL 17 instance on `localhost:5433`.

### 3. Create the root env file

File:

```text
.env
```

Current local baseline:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5433/sapphirix_booking
PORT=3000
PUBLIC_API_BASE_URL=http://localhost:3000/api/v1
PUBLIC_ASSET_BASE_URL=http://localhost:3000
```

Copy `.env.example` to `.env` at the repository root and fill in the Firebase backend and frontend values there.

### 4. Run the apps

```bash
pnpm dev
```

Default local endpoints:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

The frontend syncs its config from the root `.env` automatically before `pnpm dev:frontend` and `pnpm build`.

---

## Scripts

From the repository root:

```bash
pnpm env:sync
pnpm db:dump
pnpm db:restore -- ./.backups/your-dump.sql
pnpm provision:dev-admin -- --salon-name "Demo Salon" --salon-slug demo-salon --admin-email owner@example.com --admin-password "ChangeMe123!" --admin-first-name Demo --admin-last-name Owner
pnpm dev
pnpm dev:frontend
pnpm dev:backend
pnpm build
```

---

## Dev Data Sync

For local machine-to-machine syncing, treat schema and data separately:

- Schema stays in Git through Drizzle migrations.
- Local dev data moves through SQL dumps, not through the Docker volume.

Recommended flow:

1. On the source machine, run `pnpm db:dump`.
2. Copy the generated `.backups/*.sql` file to your other machine using private storage.
3. On the target machine, start PostgreSQL and run `pnpm db:restore -- path/to/dump.sql`.
4. Run `pnpm --filter backend db:migrate` afterward if the target repo revision is newer.

This is the pragmatic way to keep salon/admin/service/test-booking data aligned across devices while keeping `.env` and Docker volumes local-only.

---

## Provision A Salon And Admin

To create a salon plus a matching Firebase-backed admin user in one step, run:

```bash
pnpm provision:dev-admin -- --salon-name "Demo Salon" --salon-slug demo-salon --admin-email owner@example.com --admin-password "ChangeMe123!" --admin-first-name Demo --admin-last-name Owner
```

Optional fields you can add:

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

What this does:

1. Creates the salon row if the slug does not exist yet.
2. Creates the Firebase Auth user if the email does not exist yet.
3. Creates the matching `admins` table row linked by Firebase UID.

If the salon or Firebase user already exists, the script reuses them. If the existing admin linkage is inconsistent, it stops instead of silently creating broken auth state.

---

## Current Shape

The repository is intentionally lean.

- The frontend is an Angular 21 app with PrimeNG and Tailwind already in place.
- The backend is a minimal Express API with environment loading, CORS, JSON parsing, and a health endpoint.
- PostgreSQL runs through Docker Compose for local parity from the start.
- Drizzle is configured as the schema and query layer for the backend.

---

## Product Direction

This project is built around a shared hosted SaaS model for salons.

- Each salon is a tenant.
- Customers book as guests.
- Admins sign in with Firebase Auth.
- Tenant authorization is enforced in the backend and database layer.

The concept and build plan live in:

- `concept/salon-booking-concept.md`
- `concept/salon-booking-mvp-implementation-plan.md`
- `concept/salon-booking-technical-architecture.md`

---

## Near-Term Build Focus

1. Tenant foundation
2. Service management
3. Availability configuration and slot calculation
4. Guest booking flow
5. Admin authentication and operations UI

The stack is already locked. The next work is feature depth, not more scaffolding.