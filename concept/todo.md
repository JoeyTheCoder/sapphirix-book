# Project Todo

Short user stories to guide the build step by step.
Use this file as a shared working list: we can reorder stories, split them, or rewrite them as your ideas get sharper.

## How To Use This

- Keep stories small and implementation-focused.
- Add notes under any story when you want to change the direction.
- Mark stories done only when the feature works end to end.

## Phase 1 - Project Setup

- [ x ] As a developer, I want the monorepo structure stable so the project is easy to grow.
- [ x ] As a developer, I want Docker and PostgreSQL running locally so the app has a reliable database from day one.
- [ x ] As a developer, I want backend env files and database config in place so local setup is predictable.
- [ x ] As a developer, I want the Angular app shell ready so new screens can be added quickly.
- [ x ] As a developer, I want Tailwind and PrimeNG wired in so the UI can be built with a consistent style.

## Phase 2 - Backend Foundation

- [ x ] As a developer, I want an Express API base structure so features can be added without rework.
- [ x ] As a developer, I want Drizzle connected to PostgreSQL so data access is typed and simple.
- [ x ] As a developer, I want the first database schema for salons, admins, and bookings so the core domain is modeled early.
- [ x ] As a developer, I want migrations working so schema changes stay controlled.
- [ x ] As a developer, I want shared validation rules for API input so bad data is rejected early.

### In Plain English

- We clean up the backend so it is easy to add features.
- We connect the backend to PostgreSQL for real.
- We create the first useful database tables.
- We add the minimum routes needed to start building real features.

### What We Are Actually Building First

- A better Express structure:
	server start, app setup, routes, validation, and error handling.
- A real database connection:
	Drizzle + PostgreSQL, not just a placeholder schema file.
- A first set of public and admin-ready routes:
	health, salon info, services, bookings.
- A migration flow:
	so database changes are tracked properly.

### The Main Backend Pieces

- App setup:
	`createApp()`, route registration, not-found handler, error handler.
- Config:
	env loading for `PORT`, `DATABASE_URL`, and later Firebase keys.
- Database:
	Drizzle client setup and a database health check.
- Validation:
	shared request validation for create and update endpoints.

### The First Routes We Intend To Have

- `GET /health`
- `GET /ready`
- `GET /api/v1/salons/:slug`
- `GET /api/v1/salons/:slug/services`
- `POST /api/v1/bookings`

### The First Database Tables

- `salons`
	basic salon profile and public identity
- `admins`
	internal admin users linked to Firebase and one salon in the MVP
- `services`
	what a salon offers, with price and duration
- `customers`
	guest customer details used for bookings
- `bookings`
	the actual appointment records
- `opening_hours`
	weekly working hours
- `time_off_blocks`
	manual closures like vacation or blocked time

### The Shape Of The Data

- One salon has many services.
- One salon has many bookings.
- One admin belongs to one salon in the MVP.
- One booking belongs to one salon, one customer, and one service.
- Salon slug must be unique.
- Firebase UID must be unique.

### What I Need You To Be Able To Decide

- Do we keep one salon per account in the MVP, or allow multi-salon admin support now?
- Do we keep bookings tied to one service only in the MVP?
- Do we store customer notes and internal notes from the start?
- Do we want booking status to start simple: `confirmed`, `cancelled`, `completed`?

### Decisions:

- One Salon per Account for MVP
- One Service per booking for MVP yes, I wouldn't focus on services at all in the MVP to be honest
- Yes let's add customer notes and internal notes for now, will recheck with actual customer if needed
- Yes let's keep status simple.

### Done Means

- The backend has a clean structure.
- PostgreSQL is connected through Drizzle.
- The first core tables exist through migrations.
- We can read salon data and create a booking through real API routes.

### How To Validate And Test This Phase

- Start the database:
	`docker compose up -d`
- Start the backend:
	`pnpm --filter backend dev`
- Check that TypeScript still builds:
	`pnpm --filter backend build`
- Check that the database schema is applied:
	`pnpm --filter backend db:migrate`
- Confirm the health route works:
	open `http://localhost:3000/health`
- Confirm the DB readiness route works:
	open `http://localhost:3000/ready`
- Confirm the migration file exists:
	`apps/backend/drizzle/0000_complete_victor_mancha.sql`

#### Manual API Checks

- Get a salon by slug:
	`GET /api/v1/salons/:slug`
- Get services for a salon:
	`GET /api/v1/salons/:slug/services`
- Create a booking:
	`POST /api/v1/bookings`

#### What Success Looks Like

- The backend starts without crashing.
- `/health` returns `ok: true`.
- `/ready` returns a database-ready response.
- The database contains the new Phase 2 tables.
- Invalid booking input returns a validation error instead of crashing.
- Overlapping bookings are rejected.

## Phase 3 - Admin Access

- [ x ] As an admin, I want to log in with Firebase Auth so access to management features is protected.
- [ x ] As a developer, I want Firebase tokens verified in the backend so admin requests are trusted.
- [ x ] As a developer, I want admin records linked to salon data so each admin only sees the right business.
- [ x ] As an admin, I want a basic dashboard shell so I have one place to manage my salon.

### In Plain English

- We add a real admin login flow.
- The frontend signs in with Firebase.
- The backend checks the Firebase token before returning admin-only data.
- Logged-in admins only see their own salon data.

### What Will Actually Happen In This Phase

- Firebase Auth is added for admin sign-in only.
- The Angular app gets a login screen and a protected admin area.
- After login, the frontend sends the Firebase ID token to the backend.
- The backend verifies the token and matches the Firebase user to an internal admin record.
- If the admin is valid, the backend returns admin data for the correct salon.

### The Main Pieces We Would Build

- Frontend login page:
	Email and password sign-in for admins.
- Frontend auth state:
	Keep track of whether the admin is logged in.
- Route protection:
	Block access to admin pages unless logged in.
- Backend token verification:
	Verify Firebase tokens on protected routes.
- Admin lookup:
	Find the matching admin record in PostgreSQL.
- Admin profile route:
	Return the current admin and salon context.

### The First Routes We Intend To Have

- `POST` or Firebase-only login flow on the frontend side
	This depends on the Firebase setup choice below.
- `GET /api/v1/admin/me`
	Returns the logged-in admin and salon context.
- Protected admin routes after that
	These should reject unauthenticated requests.

### The User Experience We Are Aiming For

- Admin opens the login page.
- Admin signs in with Firebase.
- Admin lands in a simple dashboard shell.
- Admin stays signed in until they log out or the session expires.
- If the token is invalid, the admin is pushed back to login.

### What I Need You To Decide

- What Firebase sign-in method do we want for MVP?
	Email/password only, or also Google sign-in?
- Should admins be created manually in Firebase and the database first?
	Or do we want a self-serve invite or signup flow later?
- Should the app keep admins logged in across browser refreshes?
	Usually yes, but it is still a product choice.
- What should happen if a Firebase user exists but no matching admin record exists in our database?
	Show access denied, or show a special onboarding state?
- Do you want a full admin dashboard page in this phase?
	Or just a placeholder protected page that proves auth works?

### Decisions:

- Email/Password is sufficient no google login needed
- Yes let's create them manually (you need to show me how), I don't want them to be able to signup at all they get the initial login from me and can change their password on first login that's it
- Yes across browser refreshes they should
- Show access denied with a hint to contact the system admin (me)
- let's start with a placeholder as we have many decisions to make on what to even enable the admin to do

### Done Means

- An admin can sign in from the frontend.
- The backend can verify the Firebase token.
- `/api/v1/admin/me` only works for valid admins.
- An admin only sees data for their own salon.
- A protected admin page exists and is reachable after login.

### How To Validate And Test This Phase

- Fill the frontend Firebase config in:
	`apps/frontend/src/app/core/firebase-public.config.ts`
- Fill the backend Firebase env values in:
	`apps/backend/.env`
- Start the database:
	`docker compose up -d`
- Start the backend:
	`pnpm --filter backend dev`
- Start the frontend:
	`pnpm --filter frontend start`

#### Manual Admin Setup

- In Firebase Console, enable Email/Password sign-in.
- In Firebase Console, create the admin user manually.
- Copy that user's Firebase UID.
- Insert that UID into the `admins` table with a valid `salon_id`.
- Use a temporary password for the first login.
- After creating the user, send a Firebase password reset email so the admin can choose a private password.

#### Manual API And UI Checks

- Open the login page:
	`http://localhost:4200/admin/login`
- Sign in with the manually created admin user.
- Confirm the app reaches the protected placeholder admin page.
- Refresh the page and confirm the session is still active.
- Call `GET /api/v1/admin/me` with a valid token and confirm it returns the current admin and salon.
- Try the same route without a token and confirm it returns `401`.
- Try the same route with a valid Firebase user that is not linked to an internal admin record and confirm it returns access denied.

#### What Success Looks Like

- Login works.
- Login persists across browser refreshes.
- Invalid or missing tokens are rejected cleanly.
- The correct admin record is resolved from the database.
- The admin area is protected.
- No guest user can access admin routes.
- A Firebase user without an internal admin record sees access denied with a contact-admin hint.

## Phase 4 - Salon Setup

- [ x ] As a salon owner, I want to edit my salon profile so customers see the right business details.
- [ x ] As a salon owner, I want to upload a salon logo so the public profile looks more complete.
- [ x ] As a salon owner, I want to manage bookable offerings so bookings use real duration and price data.
- [ x ] As a salon owner, I want split opening hours per weekday so Swiss morning and afternoon shifts can be modeled.
- [ x ] As a salon owner, I want to block full-day or partial-day time off so unavailable periods cannot be booked.

### What We Are Building In This Phase

- A simple admin area where the salon owner can manage the salon data customers will book against.
- This is where the admin defines the business details, the services, the weekly opening hours, and planned time off.
- The goal is to make the salon data editable without touching the database manually.

### What Will Happen In Practice

- The admin can update the salon profile.
- The admin can add, edit, and remove services.
- The admin can define weekly opening hours.
- The admin can add time-off blocks for holidays, breaks, or special closures.
- All changes are limited to the logged-in admin's own salon.

### The Main Pieces We Intend To Add

- Salon profile form:
	Edit the basic salon information shown to customers.
- Services management:
	Create and update services with name, duration, and price.
- Opening hours management:
	Store normal weekly business hours.
- Time-off management:
	Store one-off unavailable periods that override normal availability.
- Ownership checks:
	Ensure an admin cannot change another salon's data.

### The First Routes We Intend To Have

- `GET /api/v1/admin/salon`
	Returns the current admin's salon profile.
- `PATCH /api/v1/admin/salon`
	Updates the salon profile.
- `GET /api/v1/admin/services`
	Returns services for the current salon.
- `POST /api/v1/admin/services`
	Creates a service for the current salon.
- `PATCH /api/v1/admin/services/:serviceId`
	Updates one service.
- `DELETE /api/v1/admin/services/:serviceId`
	Removes one service.
- `GET /api/v1/admin/opening-hours`
	Returns weekly opening hours.
- `PUT /api/v1/admin/opening-hours`
	Replaces weekly opening hours.
- `GET /api/v1/admin/time-off-blocks`
	Returns time-off blocks for the salon.
- `POST /api/v1/admin/time-off-blocks`
	Creates a new blocked period.
- `DELETE /api/v1/admin/time-off-blocks/:blockId`
	Removes one blocked period.

### The User Experience We Are Aiming For

- Admin signs in and opens the setup area.
- Admin fills in the salon details.
- Admin adds the real services customers can book.
- Admin sets normal opening hours for each weekday.
- Admin blocks dates or time ranges when the salon is unavailable.
- Later booking screens use this saved data instead of hardcoded assumptions.

### What I Need You To Decide

- Which salon fields should be editable in MVP?
	For example: name, slug, phone, email, address, description.
- Should a service be deleted permanently, or just hidden from customers?
	Hidden is usually safer if bookings already exist.
- Do we want one opening-hours entry per weekday only?
	Or do we need support for split shifts like morning and afternoon?
- Should time-off blocks support both full-day and partial-day closures?
	Usually yes, but it is worth confirming.
- Do we need salon image or logo upload in this phase?
	That can be postponed if we want to move faster.

### Decisions:

- i don't know what slug means here, is it necessary? if it's just id let's call it id, the other fields are fine for now
- I think we decided earlier not to differentiate between services and just have plain bookings at first
- let's split them it's common in switzerland to have morning and afternoon shifts
- yes
- yes

### Implementation Notes:

- Slug stays in the system as the public booking identifier, but it is read-only in the admin UI.
- Services are still stored because bookings already depend on them, but the admin UI keeps them simple and flat.
- Removing a service archives it instead of hard-deleting it so old bookings do not break.
- Logo upload currently stores files locally through the backend.

### Done Means

- The admin can read and update the salon profile.
- The admin can manage services for their salon.
- The admin can set weekly opening hours.
- The admin can add and remove time-off blocks.
- All data changes are scoped to the logged-in admin's salon.
- The public booking flow can later use this saved salon setup data.

### How To Validate And Test This Phase

- Start the database:
	`docker compose up -d`
- Start the backend:
	`pnpm --filter backend dev`
- Start the frontend:
	`pnpm --filter frontend start`
- Apply the latest database migration if needed:
	`pnpm --filter backend db:migrate`
- Sign in as an admin with a linked salon.
- Open the salon setup screen.
- Update the salon profile and confirm the changes persist after refresh.
- Upload a logo and confirm it renders after refresh.
- Create, edit, and archive services and confirm the list updates correctly.
- Change opening hours and confirm they reload correctly.
- Add and remove time-off blocks and confirm they reload correctly.
- Call the related admin endpoints directly and confirm they only affect the current salon.
- Try to access or update another salon's data and confirm it is rejected.

### What Success Looks Like

- The salon owner no longer needs manual database edits for normal setup.
- The backend stores all salon setup data cleanly.
- The frontend shows the saved data again after refresh.
- Cross-salon access is blocked.
- The project is ready for the next phase, where booking availability can use this setup data.

## Phase 5 - Booking Flow

- [ ] Build the public booking route for one salon slug.
- [ ] Show bookable services, dates, and valid time slots only.
- [ ] Collect customer details with a short guest form.
- [ ] Create the appointment with a final backend availability check.
- [ ] Show a clear booking confirmation screen.

### Simple Implementation Notes

- Public route: Add a public Angular route for one salon slug so each salon gets its own booking page.
- Service selection: Load only that salon's active services and let the customer pick one.
- Availability: Add a public backend endpoint that returns valid slots for a selected service and date.
- Slot logic: The backend must calculate slots from opening hours, blocked times, and existing appointments.
- Booking form: Keep the form short and guest-only, with no customer login.
- Booking creation: Re-check the slot on the backend right before saving so double bookings are blocked.
- Confirmation: After a successful booking, show a confirmation page with the main booking details.
- Admin visibility: New bookings should appear immediately in the admin area once saved.

### Decisions To Make

- [ ] Route structure: Keep `/s/:salonSlug/book` and `/s/:salonSlug/confirmation`, or use a single booking route only?
- [ ] Flow style: One-page booking flow or step-by-step flow?
- [ ] Required fields: `name + phone`, or `name + email`, or all three?
- [ ] Email field: Optional in MVP or required?
- [ ] SMS verification: Skip it for MVP, or support it as an optional per-salon anti-abuse setting now?
- [ ] Slot interval: 15 min, 30 min, or another value?
- [ ] Minimum lead time: Allow same-minute booking, 1 hour, 2 hours, or another rule?
- [ ] Booking horizon: How far into the future can customers book?
- [ ] Buffer time: No buffer, or add a gap between appointments?
- [ ] Slot display: Hide unavailable slots or show them as disabled?
- [ ] Booking status: Should new bookings start as `confirmed` or `pending`?
- [ ] Confirmation: Page only, or also send email and/or SMS right away?
- [ ] Scope: One service per booking for MVP, or support multiple services in one booking?

### Decisions

- i want it to stay on a single route while booking
- onepage
- all three
- required
- required
- single slot time for now 30 mins only
- 30 min lead time
- will recheck with customer, let's do 4 weeks for now
- 10 mins buffer for now, make this a setting in admin page to set
- show them as disabled
- i would say pending and we give feedback once it's been confirmed by the admin
- for now page only will do email or sms later
- one service per booking in MVP

### How To Validate

- Before testing, run `pnpm --filter backend db:migrate` so PostgreSQL gets the new `pending` booking status and the new `booking_buffer_minutes` salon setting.
- Start backend and frontend and make sure both apps boot without errors.
- Open a real public salon URL like `/s/<salonSlug>/book` and confirm the correct salon data and services load.
- Pick a service and a date and confirm only valid slots are shown.
- Create one booking and confirm the success page shows the right summary.
- Refresh the admin area and confirm the booking appears for the correct salon.
- Try booking the same slot twice and confirm the second request is rejected.
- Add blocked time or change opening hours and confirm slot results change correctly.
- Change the booking buffer in admin, save it, and confirm slot results update after reload.
- Try invalid input or missing fields and confirm the form and API return clear errors.
- Try another salon slug and confirm salon data and bookings stay isolated.

### Done Means

- A customer can finish a booking without admin help.
- The backend is the final source of truth for slot validity.
- Double bookings are blocked on the backend.
- The confirmation screen works.
- New bookings are visible in the admin area.
- Cross-salon access stays blocked.

## Phase 6 - Admin Booking Management

- [ ] Show today and upcoming bookings in the admin area.
- [ ] Add basic filters so admins can find bookings quickly.
- [ ] Add a booking detail view with customer and service data.
- [ ] Let admins confirm, cancel, or update a booking.
- [ ] Let admins create a manual booking for walk-ins or phone calls.

### Simple Implementation Notes

- Booking list: Add an admin bookings page or section that shows today's and upcoming bookings first.
- Filters: Start simple with date and status filters, then add service if needed.
- Detail view: Show booking time, service, status, customer details, and notes in one place.
- Status actions: Allow admins to confirm pending bookings and cancel bookings cleanly.
- Editing: Let admins change the selected time and service with backend validation.
- Manual booking: Reuse the booking rules from the public flow so manual bookings follow the same availability logic.
- Tenant safety: All booking reads and updates must stay scoped to the logged-in salon.

### Decisions To Make

- [ ] UI shape: Keep this inside the current admin shell, or add a separate `/admin/bookings` page?
- [ ] Default view: Show only today first, or today plus upcoming bookings together?
- [ ] Filters: Date + status only, or date + status + service in MVP?
- [ ] Detail view: Inline expand, side drawer, or separate page?
- [ ] Status flow: Can admins move `pending -> confirmed -> completed`, and cancel from both `pending` and `confirmed`?
- [ ] Editing scope: Allow full reschedule in Phase 6, or only confirm/cancel first?
- [ ] Manual booking: Include manual create in Phase 6 MVP, or postpone it?
- [ ] Customer editing: Can admins edit customer contact details from the booking view?
- [ ] Calendar style: Simple list first, or do you want a calendar grid already in Phase 6?

### Decisions

- UI shape:
- Default view:
- Filters:
- Detail view:
- Status flow:
- Editing scope:
- Manual booking:
- Customer editing:
- Calendar style:

### How To Validate

- Log in as an admin and confirm bookings for only that salon are shown.
- Confirm a pending booking and verify the new status appears after refresh.
- Cancel a booking and verify it no longer blocks that slot.
- Change the booking date or time and verify overlap checks still work.
- Filter by date and status and confirm the list updates correctly.
- Open booking details and confirm customer contact data and service data are correct.
- Create one manual booking, if included, and confirm it appears in the list and blocks the slot.
- Try to access or modify another salon's booking and confirm tenant isolation is still enforced.

### Done Means

- Admins can see and find their bookings quickly.
- Admins can open a booking and understand its current state.
- Admins can confirm, cancel, and update bookings within the agreed scope.
- Manual bookings work too, if included in the phase scope.
- Booking changes stay tenant-safe and keep availability accurate.

## Phase 7 - Protection And Quality

- [ ] As the system, I want rate limiting on booking endpoints so abuse is reduced.
- [ ] As the system, I want bot protection on public booking actions so spam is harder.
- [ ] As a developer, I want basic logging and error handling so issues are easier to diagnose.
- [ ] As a developer, I want smoke tests for critical flows so changes do not break booking or login.

## Phase 8 - Release Readiness

- [ ] As a developer, I want production env handling defined so deployment is repeatable.
- [ ] As a developer, I want a clean Docker-based deployment path so local and hosted setups stay close.
- [ ] As a product owner, I want the MVP flow reviewed end to end so we know what is ready for first users.

## Open Notes

- Your ideas:
- Questions to settle:
- Features to postpone: