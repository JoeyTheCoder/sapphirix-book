# Salon Booking MVP Implementation Plan

## 1. Purpose

This plan turns the concept into a practical MVP build sequence.

It is designed for a **collaborative workflow**:
- you handle local commands, environment setup, credentials, and manual checks
- GitHub Copilot handles code generation, file edits, structure, reviews, and implementation guidance

The plan assumes a **shared multi-tenant SaaS MVP** with:
- Angular 21 frontend
- Tailwind CSS + PrimeNG for UI
- one Node.js + Express backend application
- PostgreSQL database
- Drizzle as the ORM / query layer
- Firebase Auth for admin identity
- guest customer bookings without customer accounts

The repository baseline is already fixed as a **pnpm monorepo** with `apps/frontend`, `apps/backend`, and `packages/*`, and Docker is part of the setup from week 1.

---

## 2. Collaboration Model

Use this workflow for each step:

1. You tell Copilot which step you want to execute
2. Copilot reads the relevant concept docs and makes the code changes
3. You run the commands locally and report errors or output back
4. Copilot fixes issues, refines the implementation, and prepares the next step

Keep each step small enough that we can fully close it before moving on.

---

## 3. Recommended Step Order

## Step 0 - Confirm the implementation baseline

Goal:
- confirm the already chosen stack and repo baseline before feature work continues

Final decisions:
- frontend: Angular 21
- styling: Tailwind CSS
- UI library: PrimeNG
- backend: Node.js + Express
- database: PostgreSQL
- ORM / query layer: Drizzle
- auth: Firebase Auth for admin login only
- containers: Docker from week 1
- repo shape: pnpm monorepo

Current repo structure:

```text
apps/
	backend/
	frontend/
packages/
	shared/
docker-compose.yml
pnpm-workspace.yaml
```

Expected output:
- one locked implementation baseline
- one confirmed repository structure plan

Prompt for Copilot:

```text
Read the concept docs and confirm that the repository still matches the locked MVP stack: Angular 21, Tailwind CSS, PrimeNG, Node.js + Express, PostgreSQL, Drizzle, Firebase Auth for admin login only, Docker from week 1, and a pnpm monorepo.
```

---

## Step 1 - Scaffold the repository and app shells

Goal:
- create the initial frontend/backend project structure and baseline configuration

Build in this step:
- Angular 21 app shell
- Express backend app shell
- environment config structure
- shared README / setup notes
- Docker and compose files from day one

Expected output:
- project boots locally
- frontend and backend run independently
- PostgreSQL connection strategy is defined
- Drizzle is wired as the database access layer

What you do:
- run the scaffold commands
- install dependencies
- confirm the apps start

Prompt for Copilot:

```text
We are on Step 1 of the MVP plan. Based on the concept docs and the stack we chose, scaffold the repo structure for frontend, backend, and local development. I will run the commands myself, so give me the exact file changes and any commands I need to execute.
```

---

## Step 2 - Implement the tenant foundation

Goal:
- make the app tenant-aware from the start

Build in this step:
- `salons` table/model
- salon slug resolution
- tenant-aware request context
- public salon configuration endpoint
- seed data for one test salon

Expected output:
- one salon can be loaded by slug
- backend queries are structured around `salon_id`

Prompt for Copilot:

```text
We are on Step 2 of the MVP plan. Implement the tenant foundation: salon entity, slug resolution, tenant-aware backend structure, and a first public salon endpoint. Keep it minimal but production-minded.
```

---

## Step 3 - Implement service management

Goal:
- allow each salon to define bookable services

Build in this step:
- `services` table/model
- admin CRUD endpoints for services
- basic Angular admin UI for service list/create/edit
- public endpoint to list bookable services

Expected output:
- services can be managed per salon
- public booking flow can fetch bookable services

Prompt for Copilot:

```text
We are on Step 3 of the MVP plan. Implement service management end to end for one salon: schema, backend endpoints, validation, and a minimal admin UI. Keep tenant scoping correct.
```

---

## Step 4 - Implement availability configuration

Goal:
- define when appointments can happen

Build in this step:
- weekly opening hours
- blocked time ranges
- availability exceptions
- admin UI to manage those settings

Expected output:
- one salon has configurable working hours and blocked times
- data model supports future expansion without rebuilding the core

Prompt for Copilot:

```text
We are on Step 4 of the MVP plan. Implement the availability configuration layer with weekly opening hours, blocked ranges, and exceptions, including backend APIs and a minimal admin UI.
```

---

## Step 5 - Implement availability calculation

Goal:
- return valid slots for a selected service and date

Build in this step:
- slot calculation service
- public availability endpoint
- customer calendar preview with bookable-day hints
- service-duration-aware slot generation
- conflict filtering against blocked ranges and appointments

Expected output:
- frontend can request bookable slots for a date
- frontend gives customers a quick visual preview of bookable days
- backend is the source of truth for slot validity

Prompt for Copilot:

```text
We are on Step 5 of the MVP plan. Implement the availability calculation engine, public availability endpoint, and a lightweight customer calendar preview. The backend must be the final source of truth and must filter by tenant, opening hours, exceptions, blocked times, and existing appointments.
```

---

## Step 6 - Implement booking creation

Goal:
- allow a guest customer to complete a booking

Build in this step:
- `customers` and `appointments` models
- public booking endpoint
- final availability re-check before save
- booking confirmation screen in Angular
- booking status defaults

Expected output:
- a customer can select a slot and create an appointment
- double-booking is prevented at the backend

Prompt for Copilot:

```text
We are on Step 6 of the MVP plan. Implement guest booking creation end to end: customer model, appointment model, public booking API, backend validation, and the Angular confirmation flow. Keep the backend validation authoritative.
```

---

## Step 7 - Implement admin authentication

Goal:
- give salon staff secure admin access

Build in this step:
- Firebase Auth integration in Angular
- backend Firebase token verification
- internal `admin_users` mapping with `firebase_uid` and `salon_id`
- protected admin routes
- current-admin endpoint

Expected output:
- admin can log in
- backend resolves the tenant-aware internal admin record

Prompt for Copilot:

```text
We are on Step 7 of the MVP plan. Implement admin authentication using Firebase Auth for identity and backend-enforced tenant authorization via internal admin records. Add only the minimal login and route protection needed for MVP.
```

---

## Step 8 - Implement appointment management UI

Goal:
- let the salon actually operate the system day to day

Build in this step:
- appointment list for today and upcoming days
- interactive admin calendar view
- appointment detail view
- edit, cancel, and manual-create flows
- basic filters by date and status
- phone-booking-optimized create flow

Expected output:
- salon staff can run the appointment workflow from the admin area
- salon staff can schedule phone bookings directly from the calendar UI
- salon staff can reschedule and confirm bookings without breaking availability rules

Prompt for Copilot:

```text
We are on Step 8 of the MVP plan. Implement the admin appointment workflow: list, interactive calendar, detail view, edit, cancel, and manual appointment creation. Optimize for a simple salon workflow, especially fast phone booking, day planning, and safe rescheduling, not a generic enterprise dashboard.
```

---

## Step 9 - Add public booking protection basics

Goal:
- reduce fake bookings without harming conversion too much

Build in this step:
- request validation
- rate limiting
- duplicate booking checks
- blocked phone list support
- bot protection hook point

Expected output:
- public booking endpoints have a real baseline abuse defense

Prompt for Copilot:

```text
We are on Step 9 of the MVP plan. Add the baseline public booking protection layer: rate limiting, duplicate booking checks, blocked phone handling, and a clean extension point for CAPTCHA or bot protection. Do not add unnecessary complexity.
```

---

## Step 10 - Add notifications

Goal:
- confirm bookings and support salon operations

Build in this step:
- customer confirmation email
- optional admin notification email
- notification service abstraction
- error logging for delivery failures

Expected output:
- successful bookings trigger the first operational notifications

Prompt for Copilot:

```text
We are on Step 10 of the MVP plan. Implement MVP notifications with customer confirmation email and optional admin notification email. Keep the notification layer simple but structured for later SMS support.
```

---

## Step 11 - Add optional SMS verification

Goal:
- support salons that need stronger booking verification

Build in this step:
- verification session model
- SMS code send / confirm flow
- per-salon feature flag
- final booking confirmation after code verification

Expected output:
- selected salons can require guest phone verification without turning the booking flow into full customer auth

Prompt for Copilot:

```text
We are on Step 11 of the MVP plan. Add optional guest SMS verification as a tenant-configurable anti-abuse feature. Keep guests unauthenticated and use the verification flow only as proof of phone ownership during booking.
```

---

## Step 12 - Prepare production readiness

Goal:
- make the app deployable and supportable for real customers

Build in this step:
- health and readiness endpoints
- structured logging
- environment validation
- migration strategy
- seed or provisioning script for a new salon
- deployment notes for staging and production

Expected output:
- a real onboarding and deployment baseline for the first paying salon

Prompt for Copilot:

```text
We are on Step 12 of the MVP plan. Prepare the application for the first production customers with health checks, logging, environment validation, migration strategy, and a tenant provisioning path for onboarding a new salon.
```

---

## 4. Suggested Working Rhythm

Use this rhythm to keep momentum high:

1. Pick one step
2. Ask Copilot to implement it
3. Run the local commands and report the results
4. Ask Copilot to fix issues or complete the missing pieces
5. Only then move to the next step

This prevents half-finished scaffolding from piling up.

---

## 5. How To Prompt During Implementation

When you want tighter collaboration, use prompts like these:

```text
Before editing anything, read the concept docs and tell me the smallest implementation slice for this step.
```

```text
Implement this step directly in the repo and tell me only the commands I need to run locally.
```

```text
I ran the commands and got these errors. Fix the code and keep the implementation aligned with the concept docs.
```

```text
Review the current state of this step and tell me what is still missing before we move on.
```

```text
Keep the implementation minimal and sellable. Do not add optional architecture unless it is needed for the current step.
```

---

## 6. First Recommended Move

Start with **Step 0** and lock the stack before creating files.

If you want the fastest path to a real MVP, the most pragmatic default is usually:
- Angular 21 frontend
- Tailwind CSS + PrimeNG
- Node.js + Express backend
- PostgreSQL
- Drizzle for DB access
- Firebase Auth for admin login only
- Docker from week 1

The stack is already locked, so the practical next move is Step 1 and then tenant foundation work.