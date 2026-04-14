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

This starts a local PostgreSQL 17 instance on `localhost:5432`.

### 3. Check backend env

File:

```text
apps/backend/.env
```

Current local baseline:

```env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/sapphirix_booking
PORT=3000
```

### 4. Run the apps

```bash
pnpm dev
```

Default local endpoints:

- Frontend: `http://localhost:4200`
- Backend: `http://localhost:3000`
- Health check: `http://localhost:3000/health`

---

## Scripts

From the repository root:

```bash
pnpm dev
pnpm dev:frontend
pnpm dev:backend
pnpm build
```

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