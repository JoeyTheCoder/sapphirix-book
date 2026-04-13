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
Angular SPA
        ↓
API Gateway / Backend Application
        ↓
Application Services + Booking Logic
        ↓
PostgreSQL Database
        ↓
Optional Notification / Email Services
```

---

## 3. Frontend Architecture

## 3.1 Technology Choice
Recommended:
- **Angular** for the SPA
- Angular Router for route separation
- Angular state management kept simple at first
- Angular Material or a lightweight component library if needed

The frontend should expose separate route groups for public and admin usage.

Example routes:
- `/s/:salonSlug/book`
- `/s/:salonSlug/confirmation`
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

You mentioned Express and Java. There are two viable options.

## Option A — Simpler MVP
Use **Node.js + Express** for the backend API.

Advantages:
- faster MVP development
- simpler deployment
- good fit for SPA backend and REST endpoints

## Option B — Stronger Domain Core
Use **Java (Spring Boot)** for the core API.

Advantages:
- excellent structure for domain logic
- strong validation and transactional workflows
- good long-term fit if the product becomes larger

## Recommended practical path
- Start with **one backend only**, not both
- If speed matters most: choose **Express**
- If long-term platform structure matters most: choose **Spring Boot**

Do not split business logic across two backends in the first version.

---

## 5. Backend Modules

Regardless of implementation choice, structure the backend by domain modules.

### 5.1 Auth Module
Responsibilities:
- admin login
- JWT/session issuance
- password hashing
- access checks for admin endpoints

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
POST   /api/public/salons/:slug/bookings
```

Purpose:
- fetch public salon info
- fetch bookable services
- fetch available slots
- create a booking

---

## 7.2 Admin Endpoints

```text
POST   /api/admin/auth/login
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
- authenticate admins
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
- email
- password_hash
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
Use:
- email + password
- hashed passwords with bcrypt/argon2
- JWT access token or secure cookie session

### Customer Side
No login required for MVP.
Customers book as guests.

### Security Controls
- input validation on all endpoints
- rate limiting on public booking endpoints
- CSRF protection if cookie-based sessions are used
- audit logging for admin actions
- HTTPS only
- secure secret management in deployment

---

## 11. Notifications

For the first version, notifications should be simple.

### Recommended MVP
- customer confirmation email
- optional admin notification email

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

- Frontend: static hosting or CDN-backed app hosting
- Backend: containerized service
- Database: managed PostgreSQL
- Email: SMTP provider or transactional mail service

Possible stack:
- Angular app on Vercel, Netlify, Cloudflare Pages, or S3/CloudFront
- API on Fly.io, Railway, Render, or a small cloud VM/container
- PostgreSQL on Neon, Supabase, Railway, or managed cloud DB

Since you also know infrastructure, you can later migrate to AWS/GCP if needed.

---

## 12.2 Deployment Strategy
Use containers from day one.

Recommended:
- Docker for frontend and backend packaging
- CI/CD pipeline with test + build + deploy
- separate environments:
  - local
  - staging
  - production

Environment variables:
- DB connection
- JWT secret
- email credentials
- base URLs
- feature flags

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
   └─ blocked_time_ranges
            │
            ▼
[ External Services ]
   ├─ Email Provider
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
6. admin appointment overview
7. edit/cancel flows
8. email notifications
9. polish and mobile UX

This build order ensures the most important business flow works early.

---

## 16. Summary

The system should be built as a **multi-tenant modular SPA** backed by a single API and relational database.

Core technical ideas:
- Angular frontend with customer and admin route areas
- one backend application with domain modules
- PostgreSQL as the source of truth
- backend-driven slot validation to prevent double bookings
- tenant-aware design from the start
- modular structure so more features can be added later

This gives you a practical foundation for an MVP that is fast to build, easy to host, and capable of growing into a reusable SaaS platform for local salons.
