# Salon Booking Onepager — Technical Architecture

## 1. Architecture Goal

The system should support a **modular single-page application** with:
- a **customer booking view**
- an **admin management view**
- a backend API
- a persistent data layer
- tenant isolation for multiple salons

The technical design should stay lightweight for an MVP while remaining extensible for future modules.

---

## 2. High-Level Architecture

The platform can be structured into five main layers:

1. **Frontend SPA**
2. **Backend API**
3. **Business logic / scheduling engine**
4. **Database**
5. **Infrastructure / platform services**

### Logical flow

```text
Customer Browser / Admin Browser
        ↓
Angular 21 SPA
        ↓
Node.js + Express API
        ↓
Application Services + Booking Logic
        ↓
PostgreSQL Database
        ↓
Optional Notification / Email Services
```

### Repository shape

The implementation is organized as a **pnpm monorepo**:

```text
apps/
  frontend/   Angular 21 SPA
  backend/    Node.js + Express API
packages/
  shared/     shared types, helpers, or contracts as needed
infra/
  docker/     container-related assets
docker-compose.yml
```

---

## 3. Frontend Architecture

## 3.1 Technology Choice
Recommended:
- **Angular 21** for the SPA
- Angular Router for route separation
- Angular state management kept simple at first
- **PrimeNG** for form, table, overlay, and admin UI components
- **Tailwind CSS** for layout, spacing, responsive utilities, and branding

The frontend should expose separate route groups for public and admin usage.

Example routes:
- `/:salonSlug`
- `/:salonSlug/confirmation`
- `/admin/login`
- `/admin/dashboard`
- `/admin/appointments`
- `/admin/services`
- `/admin/availability`

---

## 3.2 Frontend Modules

### Public Booking Module
Responsibilities:
- load salon-specific public configuration
- list services
- display available dates and slots
- collect booking data
- submit appointment requests

Main components:
- salon header / branding component
- service selector
- date picker
- time slot selector
- booking form
- booking confirmation screen

### Admin Module
Responsibilities:
- authentication
- appointment management
- service management
- availability management

Main components:
- login page
- dashboard page
- appointment list / calendar view
- appointment detail drawer or page
- service config page
- availability config page

### Shared UI Module
Reusable building blocks:
- buttons
- dialogs
- tables
- PrimeNG form controls and feedback components
- date formatting
- validation messages
- API error banners

---

## 3.3 Frontend State Strategy

For MVP, use a pragmatic state model:
- local component state for forms
- shared services for tenant/session state
- route resolvers or guards for protected admin routes

Possible services:
- `AuthService`
- `SalonContextService`
- `BookingApiService`
- `AppointmentsApiService`
- `ServicesApiService`
- `AvailabilityApiService`

If complexity grows later, NgRx or another state layer can be introduced.

---

## 4. Backend Architecture

The backend is fixed as **Node.js + Express**.

Recommended implementation characteristics:
- Express handles the HTTP API and middleware pipeline
- feature modules keep tenant, booking, service, and availability logic separated
- **Drizzle** is the query layer and schema definition source for PostgreSQL
- backend validation and transaction boundaries remain authoritative for booking correctness

This keeps the MVP fast to build while preserving a clean path for future modular growth.

---

## 5. Backend Modules

Structure the backend by domain modules.

### 5.1 Auth Module
Responsibilities:
- admin login
- token verification and session handling
- access checks for admin endpoints
- mapping authenticated users to internal tenant-aware admin records

Entities:
- AdminUser
- Role
- Session/Token metadata

### 5.2 Tenant Module
Responsibilities:
- resolve salon by slug or tenant id
- isolate tenant configuration
- expose salon-specific public settings

Entities:
- Salon
- SalonSettings
- BrandingSettings

### 5.3 Booking Module
Responsibilities:
- create customer appointments
- validate slot availability
- prevent overlaps
- update appointment status

Entities:
- Appointment
- Customer
- AppointmentStatus

### 5.4 Service Module
Responsibilities:
- manage bookable services
- configure durations and pricing visibility

Entities:
- ServiceOffering

### 5.5 Availability Module
Responsibilities:
- opening hours
- exceptions
- blocked times
- holidays

Entities:
- WeeklyOpeningHour
- AvailabilityException
- BlockedTimeRange

### 5.6 Notification Module
Responsibilities:
- send booking confirmations
- send admin alerts
- later send reminders

Integrations:
- SMTP/email provider first
- SMS provider later if business case proves out

### 5.7 Booking Protection Module
Responsibilities:
- rate limiting and abuse detection for public booking endpoints
- optional guest phone verification by SMS
- blocked phone list handling
- risk-based booking controls per salon

Entities:
- BookingVerification
- BlockedPhoneNumber
- BookingRiskEvent

---

## 6. Core Booking Logic

This is the heart of the system.

The availability engine should answer:
- Is a given slot valid for this salon?
- Is the salon open at that time?
- Is the selected service duration compatible with the free window?
- Is the slot already occupied?
- Are there blocked periods or exceptions?

### Slot calculation flow

```text
Input:
- salon
- selected service
- selected date

System checks:
1. salon opening hours for that weekday
2. special exceptions or holiday closures
3. blocked internal periods
4. existing appointments
5. service duration

Output:
- list of available start times
```

### Important rule
The backend must be the final source of truth.
The frontend may display slots, but the backend must re-check availability before saving the booking.

This prevents double booking.

---

## 7. API Design

A REST API is the simplest fit for MVP.

## 7.1 Public Endpoints

```text
GET    /api/public/salons/:slug
GET    /api/public/salons/:slug/services
GET    /api/public/salons/:slug/availability?date=YYYY-MM-DD&serviceId=...
POST   /api/public/salons/:slug/booking-verifications
POST   /api/public/salons/:slug/booking-verifications/:id/confirm
POST   /api/public/salons/:slug/bookings
```

Purpose:
- fetch public salon info
- fetch bookable services
- fetch available slots
- start an optional SMS verification flow
- confirm the verification code and finalize the booking
- create a booking

---

## 7.2 Admin Endpoints

```text
GET    /api/admin/me

GET    /api/admin/appointments
GET    /api/admin/appointments/:id
POST   /api/admin/appointments
PATCH  /api/admin/appointments/:id
DELETE /api/admin/appointments/:id

GET    /api/admin/services
POST   /api/admin/services
PATCH  /api/admin/services/:id
DELETE /api/admin/services/:id

GET    /api/admin/availability
POST   /api/admin/availability/opening-hours
POST   /api/admin/availability/exceptions
POST   /api/admin/availability/blocked-ranges
```

Purpose:
- resolve the authenticated Firebase admin to the internal admin record
- manage appointments
- manage services
- manage availability settings

---

## 8. Data Model

A relational database is the right default choice.

Recommended:
- **PostgreSQL**

### Core tables

#### salons
- id
- name
- slug
- email
- phone
- timezone
- active
- created_at
- updated_at

#### admin_users
- id
- salon_id
- firebase_uid
- email
- role
- active
- created_at
- updated_at

#### customers
- id
- salon_id
- first_name
- last_name
- phone
- email
- phone_verified_at
- notes
- created_at
- updated_at

#### services
- id
- salon_id
- name
- description
- duration_minutes
- price
- is_bookable
- sort_order
- created_at
- updated_at

#### appointments
- id
- salon_id
- customer_id
- service_id
- start_at
- end_at
- status
- source
- notes
- created_at
- updated_at

#### weekly_opening_hours
- id
- salon_id
- weekday
- open_time
- close_time
- is_closed

#### availability_exceptions
- id
- salon_id
- date
- open_time
- close_time
- is_closed
- reason

#### blocked_time_ranges
- id
- salon_id
- start_at
- end_at
- reason
- created_by

#### booking_verifications
- id
- salon_id
- phone_e164
- booking_payload_json
- code_hash
- expires_at
- attempt_count
- verified_at
- status
- created_at

#### blocked_phone_numbers
- id
- salon_id
- phone_e164
- reason
- created_at

#### booking_risk_events
- id
- salon_id
- phone_e164
- ip_country_code
- risk_level
- reason
- created_at

---

## 9. Tenant Isolation

Because this is intended as SaaS, tenant isolation is critical.

Recommended MVP approach:
- single database
- shared schema
- every business row includes `salon_id`

Requirements:
- every query must be tenant-scoped
- admin tokens must carry tenant context
- public route must resolve tenant by slug
- no cross-tenant reads or writes

Later, if required:
- separate schemas per tenant
- or separate databases for larger clients

For MVP, shared schema with strict tenant filtering is enough.

---

## 10. Authentication and Security

### Admin Authentication
Recommended MVP approach:
- Firebase Auth for admin identity
- email + password for salon admins
- Firebase login handled in the Angular admin app
- Firebase ID token sent from SPA to backend
- backend verification with Firebase Admin SDK
- internal `admin_users` record mapped by `firebase_uid` and `salon_id`

Important rule:
Firebase should handle **identity**, but the backend and database must still enforce **tenant authorization**.
The authenticated admin is not trusted until the backend resolves the matching internal admin record and tenant context.

### Customer Side
No login required for MVP.
Customers book as guests.

### Optional Guest Phone Verification
Phone verification can be offered as a configurable anti-abuse feature.

Recommended flow:
1. Customer selects service, date, and slot
2. Customer submits booking details and phone number
3. Backend creates a short-lived verification session
4. System sends an SMS code
5. Customer enters the code
6. Backend verifies the code and re-checks slot availability before saving the appointment

This should not be treated as full customer authentication. It is only a proof that the guest controls the submitted phone number.

### Booking Abuse Prevention
Use layered controls on public booking endpoints:
- input validation on all endpoints
- rate limiting per IP, phone number, and salon
- CAPTCHA or bot protection on suspicious traffic
- duplicate booking detection
- blocked phone number lists per salon
- audit logging for admin actions and booking risk events

Country restrictions should be handled carefully:
- do not rely on IP-based country blocking as the main defense
- treat IP country as a risk signal, not a final decision
- optionally restrict accepted phone country codes per salon
- require stronger checks such as SMS verification for higher-risk bookings

### Security Controls
- CSRF protection if cookie-based sessions are used
- HTTPS only
- secure secret management in deployment

---

## 11. Notifications

For the first version, notifications should be simple.

### Recommended MVP
- customer confirmation email
- optional admin notification email

SMS should be introduced only when needed for guest verification or later reminder flows.

### Later
- reminder emails
- SMS reminders
- cancellation notices
- reschedule notifications

The notification module should be asynchronous where possible, but for MVP a simple queued or fire-and-forget pattern is enough.

---

## 12. Infrastructure

## 12.1 Hosting
A clean deployment setup could be:

- Frontend: Angular static build served from static hosting or CDN-backed app hosting
- Backend: containerized Express service
- Database: managed PostgreSQL
- Email: SMTP provider or transactional mail service

Possible stack:
- Angular app on Vercel, Netlify, Cloudflare Pages, or S3/CloudFront
- API on Fly.io, Railway, Render, or a small cloud VM/container
- PostgreSQL on Neon, Supabase, Railway, or managed cloud DB

Since you also know infrastructure, you can later migrate to AWS/GCP if needed.

### 12.1.1 Commercial Hosting Model
Recommended default:
- one shared production platform operated by you
- one frontend deployment
- one backend deployment
- one PostgreSQL cluster with strict tenant scoping
- separate dedicated deployments only for premium or exceptional customers

For small salons, production setup should usually mean tenant provisioning on the shared platform, not software installation on customer infrastructure.

---

## 12.2 Deployment Strategy
Use containers from day one.

Recommended:
- Docker for frontend and backend packaging
- `docker-compose.yml` for local PostgreSQL and local environment parity
- CI/CD pipeline with test + build + deploy
- separate environments:
  - local
  - staging
  - production

Environment variables:
- DB connection
- Firebase project settings and service account credentials if Firebase Auth is used
- email credentials
- SMS provider credentials if phone verification is enabled
- base URLs
- feature flags

### 12.3 Tenant Provisioning and Onboarding
For each new salon, the production onboarding flow should include:
- create the salon record and slug
- create the Firebase admin user
- create the internal admin record linked by `firebase_uid`
- configure timezone, branding, services, and opening hours
- configure booking protection defaults for that salon
- provide the booking URL and admin access
- optionally configure a custom domain

---

## 13. Observability

Even a small SaaS should have basic visibility.

Recommended:
- structured application logs
- error tracking
- health endpoint
- database backup strategy
- uptime monitoring

Minimum endpoints:
```text
GET /health
GET /ready
```

Track:
- booking creation failures
- availability calculation errors
- auth failures
- email delivery failures
- SMS delivery failures
- booking verification failures
- suspicious booking activity by tenant

---

## 14. Suggested Internal Component Diagram

```text
[ Angular SPA ]
   ├─ Public Booking Module
   ├─ Admin Module
   └─ Shared UI Components
            │
            ▼
[ Backend API ]
   ├─ Auth Module
   ├─ Tenant Module
   ├─ Booking Module
   ├─ Service Module
   ├─ Availability Module
        ├─ Booking Protection Module
   └─ Notification Module
            │
            ▼
[ PostgreSQL ]
   ├─ salons
   ├─ admin_users
   ├─ customers
   ├─ services
   ├─ appointments
   ├─ weekly_opening_hours
   ├─ availability_exceptions
        ├─ blocked_time_ranges
        ├─ booking_verifications
        ├─ blocked_phone_numbers
        └─ booking_risk_events
            │
            ▼
[ External Services ]
   ├─ Email Provider
        ├─ SMS Provider
   ├─ Monitoring
   └─ Hosting / CDN / DNS
```

---

## 15. Recommended MVP Build Order

To reduce risk, build in this order:

1. tenant model and salon configuration
2. service management
3. opening hours and blocked times
4. public availability calculation
5. booking creation
6. basic anti-abuse controls for public bookings
7. admin appointment overview
8. edit/cancel flows
9. email notifications
10. optional SMS verification for higher-risk salons
11. polish and mobile UX

This build order ensures the most important business flow works early.

---

## 16. Summary

The system should be built as a **multi-tenant modular SPA** backed by a single API and relational database.

Core technical ideas:
- Angular 21 frontend with PrimeNG and Tailwind CSS
- one Node.js + Express backend application with domain modules
- Drizzle as the PostgreSQL schema and query layer
- PostgreSQL as the source of truth
- backend-driven slot validation to prevent double bookings
- tenant-aware design from the start
- pnpm monorepo structure so frontend, backend, and shared code evolve together
- modular structure so more features can be added later

This gives you a practical foundation for an MVP that is fast to build, easy to host, and capable of growing into a reusable SaaS platform for local salons.
