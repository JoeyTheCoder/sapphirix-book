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

- [ x ] Build the public booking route for one salon slug.
- [ x ] Show bookable services, dates, and valid time slots only.
- [ x ] Show a simple customer calendar preview so available days are easier to understand before picking a slot.
- [ x ] Collect customer details with a short guest form.
- [ x ] Create the appointment with a final backend availability check.
- [ x ] Show a clear booking confirmation screen.

### Simple Implementation Notes

- Public route: Add a public Angular route for one salon slug so each salon gets its own booking page.
- Service selection: Load only that salon's active services and let the customer pick one.
- Availability: Add a public backend endpoint that returns valid slots for a selected service and date.
- Calendar preview: Add a lightweight date calendar that helps the customer understand which days are bookable without turning the flow into a heavy scheduler.
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
- [ ] Calendar preview: Show only the selected day, or a simple month view with bookable-day hints?
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
- simple month view with bookable-day hints
- 10 mins buffer for now, make this a setting in admin page to set
- show them as disabled
- i would say pending and we give feedback once it's been confirmed by the admin
- for now page only will do email or sms later
- one service per booking in MVP

### How To Validate

- Before testing, run `pnpm --filter backend db:migrate` so PostgreSQL gets the new `pending` booking status and the new `booking_buffer_minutes` salon setting.
- Start backend and frontend and make sure both apps boot without errors.
- Open a real public salon URL like `/s/<salonSlug>/book` and confirm the correct salon data and services load.
- Confirm the customer calendar preview loads and visually distinguishes bookable vs non-bookable days for the current range.
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
- A customer can quickly understand bookable days from the calendar preview.
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
- [ ] Add an interactive admin calendar so appointments can be created and reviewed directly in a calendar view.

### In Plain English

- The admin should be able to run the salon day to day without leaving the app.
- The system should support both passive review of bookings and fast active scheduling.
- The calendar is not just visual decoration. It should become the main operating surface for phone bookings, quick reschedules, and understanding the day at a glance.

### What Will Actually Happen In This Phase

- The admin gets a proper bookings workspace, not just a raw upcoming list.
- The app shows a day-first operational calendar with clear appointment blocks.
- The admin can click into a day or time slot and create a booking manually.
- Existing bookings can be opened, confirmed, cancelled, and rescheduled within the agreed scope.
- Any booking change still goes through backend availability validation so the calendar never becomes the source of truth.

### The Main Pieces We Would Build

- Admin bookings data layer:
	list, detail, create, update, confirm, cancel, reschedule.
- Admin calendar UI:
	day or week view with clickable time slots and visible booking blocks.
- Manual booking form:
	service, date/time, customer details, notes, and status.
- Booking detail surface:
	display service, status, customer info, notes, and available actions.
- Filters and navigation:
	day/week switching, date navigation, and simple filtering.
- Validation integration:
	manual changes reuse the same booking rules as the public flow.

### Simple Implementation Notes

- Booking list: Add an admin bookings page or section that shows today's and upcoming bookings first.
- Calendar view: Add an interactive calendar that lets the admin click into a day or time range and create or inspect appointments quickly.
- Filters: Start simple with date and status filters, then add service if needed.
- Detail view: Show booking time, service, status, customer details, and notes in one place.
- Status actions: Allow admins to confirm pending bookings and cancel bookings cleanly.
- Editing: Let admins change the selected time and service with backend validation.
- Manual booking: Reuse the booking rules from the public flow so manual bookings follow the same availability logic.
- Fast scheduling: Optimize the admin flow for phone bookings and day-to-day calendar organization, not just passive booking review.
- Tenant safety: All booking reads and updates must stay scoped to the logged-in salon.

### The First Admin Routes We Intend To Have

- `GET /api/v1/admin/bookings`
	List bookings by date range and optional status filter.
- `GET /api/v1/admin/bookings/:bookingId`
	Load one booking with customer and service details.
- `POST /api/v1/admin/bookings`
	Create a manual booking from the calendar or phone call flow.
- `PATCH /api/v1/admin/bookings/:bookingId`
	Update status, notes, or reschedule details within the agreed scope.
- `GET /api/v1/admin/bookings/calendar`
	Return bookings in a range optimized for calendar rendering.

### The User Experience We Are Aiming For

- The admin lands on a bookings view that makes today immediately understandable.
- Empty slots are easy to scan, and occupied slots are easy to inspect.
- A phone booking can be entered in a few quick steps without switching screens repeatedly.
- Rescheduling should feel operational and safe, not like editing a raw database record.
- The calendar and the list should complement each other: calendar for planning, list for quick filtering and detail review.

### Decisions To Make

- [ ] UI shape: Keep this inside the current admin shell, or add a separate `/admin/bookings` page?
- [ ] Default view: Show only today first, today plus upcoming list, or week view first?
- [ ] Filters: Date + status only, or date + status + service in MVP?
- [ ] Detail view: Inline expand, side drawer, or separate page?
- [ ] Status flow: Can admins move `pending -> confirmed -> completed`, and cancel from both `pending` and `confirmed`?
- [ ] Editing scope: Allow full reschedule in Phase 6, or only confirm/cancel first?
- [ ] Manual booking: Include manual create in Phase 6 MVP, or postpone it?
- [ ] Customer editing: Can admins edit customer contact details from the booking view?
- [ ] Calendar style: Day view only first, or day + week switcher in MVP?
- [ ] Calendar interaction: Click empty slot to create, or click + drag time range to create?
- [ ] Slot resolution: Show 30-minute rows only, or finer visual rows with booking snapping to 30-minute rules?
- [ ] Reschedule UX: Open a form after selecting a new slot, or drag/drop directly in the calendar?
- [ ] Booking cards: Show customer name only, or customer + service + status badge in each block?
- [ ] Manual booking defaults: Should admin-created bookings start as `confirmed` or also `pending`?
- [ ] No-show handling: Ignore for MVP, or include a simple `completed/cancelled` only workflow?

### Decisions

- UI shape: i think the bookings should be one page and in the navbar have a second one titled settings and there we navigate to the current implemented admin shell
- Default view: Todays should be default, make it interactive though so the admin can swith views manually
- Filters: in the MVP let's start with Date
- Detail view: Side drawer
- Status flow: Yes in the MVP let's give them all the control we can
- Editing scope: confirm cancel first
- Manual booking: include it it's an essential part of the mvp
- Customer editing: no let's not give them that option yet
- Calendar style: interactive calendar grid in Phase 6
- Calendar interaction: click
- Slot resolution: 30 minute rows only for now
- Reschedule UX: open a form 
- Booking cards:Use customer + service + status badge in each block.
- Manual booking defaults: confirmed
- No-show handling: ignore

### Recommended Default If You Want To Move Fast

- UI shape:
	keep it inside the current admin shell first.
- Default view:
	show today in calendar view plus a short upcoming list.
- Filters:
	date + status only.
- Detail view:
	side drawer.
- Status flow:
	`pending -> confirmed -> completed`, with cancel allowed from `pending` and `confirmed`.
- Editing scope:
	allow reschedule in Phase 6.
- Manual booking:
	include it now.
- Customer editing:
	yes, but only contact details and notes.
- Calendar style:
	day view first, with week view if it stays simple.
- Calendar interaction:
	click empty slot to create.
- Slot resolution:
	visual rows can be 30 minutes to match the booking rules.
- Reschedule UX:
	select a new slot and confirm in a drawer, not drag/drop yet.
- Booking cards:
	customer name + service + status.
- Manual booking defaults:
	`confirmed` by default for admin-created phone bookings.
- No-show handling:
	skip it for MVP.

### How To Validate

- Log in as an admin and confirm bookings for only that salon are shown.
- Confirm the default bookings view opens in the agreed layout and focuses on the correct date range.
- Confirm the calendar view shows appointments in the expected day or week layout.
- Confirm a pending booking and verify the new status appears after refresh.
- Cancel a booking and verify it no longer blocks that slot.
- Change the booking date or time and verify overlap checks still work.
- Filter by date and status and confirm the list updates correctly.
- Open booking details and confirm customer contact data and service data are correct.
- Create one manual booking, if included, and confirm it appears in the list and blocks the slot.
- Create one phone booking directly from the calendar view and confirm it follows the same overlap rules.
- Try creating a manual booking in a blocked or conflicting slot and confirm the backend rejects it cleanly.
- Reschedule one booking from the calendar flow and confirm the old slot opens up again.
- Try to access or modify another salon's booking and confirm tenant isolation is still enforced.

### Done Means

- Admins can see and find their bookings quickly.
- Admins can organize their day from an interactive calendar instead of only a list.
- Admins can open a booking and understand its current state.
- Admins can confirm, cancel, and update bookings within the agreed scope.
- Manual bookings work too, if included in the phase scope.
- Booking changes stay tenant-safe and keep availability accurate.

## Phase 7 - Protection And Quality

- [ ] As the system, I want rate limiting on booking endpoints so abuse is reduced.
- [ ] As the system, I want bot protection on public booking actions so spam is harder.
- [ ] As a developer, I want basic logging and error handling so issues are easier to diagnose.
- [ ] As a developer, I want smoke tests for critical flows so changes do not break booking or login.

### In Plain English

- We harden the app so random spam, bots, and avoidable mistakes do less damage.
- We make failures easier to understand when something goes wrong in production.
- We add a small but real safety net so future changes do not quietly break login or booking.
- This phase is not about adding shiny features. It is about making the MVP safer to trust.

### What Will Actually Happen In This Phase

- Public booking endpoints get request limits so one person or script cannot hammer them endlessly.
- Public booking actions get a bot-check layer so automated spam becomes much harder.
- The backend starts writing clearer logs for normal requests and for failures.
- Error responses stay clean for the user, while the server keeps more useful details for debugging.
- We add smoke tests for the flows that must never casually break: admin login, public booking load, availability lookup, and booking creation.

### The Main Pieces We Would Build

- Rate limiting:
	protect public routes like availability lookup and booking creation.
- Bot protection:
	add a lightweight challenge such as Cloudflare Turnstile or reCAPTCHA to the booking flow.
- Structured logging:
	log request path, status, timing, and important error context in a consistent format.
- Safer error handling:
	show generic errors to users while keeping detailed logs on the backend.
- Smoke test coverage:
	add a few end-to-end or API-level checks for the critical happy paths.
- Environment switches:
	allow protection settings to be strict in production and lighter during local development.

### Simple Implementation Notes

- Rate limiting should focus on public routes first, not admin routes.
- Booking creation should usually be stricter than simple read endpoints like availability lookup.
- Bot protection should be enforced on the final booking action, not on every page load.
- Local development should have an easy bypass so you can keep building without fighting the protection layer.
- Logs should include enough detail to debug issues without dumping secrets or Firebase tokens.
- Smoke tests should cover only the flows most likely to hurt the MVP if they break.
- If possible, reuse one request ID across logs so a single failing request is easier to trace.

### The First Technical Pieces We Intend To Have

- Public route protection:
	rate limits for `GET /api/v1/public/...availability...` and `POST /api/v1/public/...bookings...`
- Bot verification check:
	server-side verification of the chosen challenge token before creating a booking.
- Logging middleware:
	one place that logs method, route, status code, duration, and request ID.
- Error logging:
	unexpected backend errors are logged with context before the API returns the safe error message.
- Smoke test targets:
	admin login, public salon load, availability response, and successful booking creation.

### The User Experience We Are Aiming For

- Real customers can still book quickly without noticing heavy protection.
- Obvious spam and repeated abuse are slowed down or blocked.
- If booking fails, the customer sees a clear message instead of a broken page.
- If something breaks on the backend, you can actually see what happened from the logs.
- Before a release, you can run a small test set and know the core flows still work.

### Decisions To Make

- [ ] Rate limiting scope: Protect only `POST /bookings`, or also protect availability and salon public-data endpoints?
- [ ] Rate limiting strength: Start with a simple fixed limit per IP, or use separate stricter limits for booking creation vs. read endpoints?
- [ ] Bot protection tool: Cloudflare Turnstile, Google reCAPTCHA, or another option?
- [ ] Bot protection timing: Check only on final booking submit, or also on availability requests?
- [ ] Dev experience: Full local bypass, test keys only, or a toggle in `.env`?
- [ ] Logging style: Simple console JSON logs only, or also write to a file/provider later?
- [ ] Request tracing: Add a request ID now, or keep logging simpler for MVP?
- [ ] Error detail level: Should the frontend always show a generic safe message, or should validation and expected booking conflicts stay specific?
- [ ] Smoke test level: API smoke tests only, or one browser-based booking flow too?
- [ ] Test trigger: Run smoke tests manually before release, or wire them into every build/CI step now?
- [ ] Alerting: Ignore alerts for MVP, or at least prepare one error-reporting hook now?

### Recommended Default If You Want To Move Fast

- Rate limiting scope:
	protect availability and booking creation, but keep the booking-create limit stricter.
- Rate limiting strength:
	simple per-IP limits are enough for MVP.
- Bot protection tool:
	Cloudflare Turnstile is usually a good lightweight default.
- Bot protection timing:
	check only on final booking submit.
- Dev experience:
	use an `.env` toggle so local work stays fast.
- Logging style:
	structured console logs only.
- Request tracing:
	yes, add a request ID now.
- Error detail level:
	keep validation and booking-conflict messages specific, keep unexpected server failures generic.
- Smoke test level:
	API smoke tests first, with one browser booking flow later if needed.
- Test trigger:
	manual local run first, CI later in Phase 8.
- Alerting:
	skip full alerting now, but keep the logging shape compatible with adding it later.

### Decisions

- All default decisions are accepted except:
- Test trigger: implement tests in CI steps now


### How To Validate

- Start backend and frontend and confirm the normal booking flow still works before testing protection.
- Hit the protected availability endpoint repeatedly and confirm rate limiting starts responding once the threshold is crossed.
- Try repeated booking-submit requests and confirm stricter booking limits apply there too.
- Try creating a booking without a valid bot token and confirm the backend rejects it cleanly.
- Try the same request with a valid token and confirm booking still works.
- Confirm local development still works with the agreed bypass or test-key setup.
- Trigger one expected error, like a double-booking conflict, and confirm the customer sees a useful message.
- Trigger one unexpected backend error and confirm the frontend gets a safe generic message while the backend logs the useful details.
- Run the smoke tests and confirm they cover login, public booking load, availability, and booking creation.
- Break one smoke-tested route on purpose or point a test to a wrong URL and confirm the test suite actually fails.

### Done Means

- Public booking routes have real abuse protection.
- The booking flow is still usable for real customers.
- The backend produces useful logs for both normal requests and failures.
- Sensitive internals are not leaked to end users.
- The project has a small reliable smoke test set for the most important flows.
- The MVP is much safer to ship and easier to support.

## Phase 8 - Release Readiness

- [ ] As a developer, I want production env handling defined so deployment is repeatable.
- [ ] As a developer, I want a clean Docker-based deployment path so local and hosted setups stay close.
- [ ] As a product owner, I want the MVP flow reviewed end to end so we know what is ready for first users.

### In Plain English

- We turn the project from a good local MVP into something you can actually prepare for real customer use.
- We make deployment, environment setup, and salon onboarding predictable instead of manual guesswork.
- We check the important user flows from beginning to end so you know what is genuinely ready.
- This phase is about operational clarity, not new product depth.

### What Will Actually Happen In This Phase

- The production environment variables are documented clearly and validated before startup.
- The deployment path is written down and aligned with the Docker-based local setup as much as practical.
- Database migration and provisioning steps are defined for staging and production.
- The team gets a simple release checklist for bootstrapping a new salon and verifying the app after deploy.
- The MVP is reviewed end to end so open gaps are visible before first-user rollout.

### The Main Pieces We Would Build

- Production env checklist:
	define which values are required in local, staging, and production.
- Deployment path:
	document how frontend, backend, database, and uploads are started in a hosted environment.
- Migration workflow:
	make schema rollout explicit so deploys do not depend on memory.
- Provisioning workflow:
	define the exact steps or script inputs for onboarding a new salon.
- Release checklist:
	one repeatable checklist for pre-release and post-release verification.
- Operational review:
	review public booking, admin login, admin operations, and salon setup from a release perspective.

### Simple Implementation Notes

- Keep production env handling centralized at the repo root, just like local development.
- Production should fail fast if critical env values are missing or malformed.
- Docker should stay part of the deployment story when it genuinely reduces drift, but do not force full container orchestration if simple hosting is enough for the MVP.
- File uploads need a release decision: keep local disk only for early hosting, or move to object storage before first real customer.
- Backups and restore steps should be written down even if they stay manual at first.
- The provisioning script should be treated as part of the release workflow, not just a dev helper.
- The end-to-end review should look at user trust too: branding, error messages, access control, and obvious rough edges.

### The First Release Pieces We Intend To Have

- Production env documentation:
	what must exist for backend, frontend sync, Firebase, bot protection, and database access.
- Deployment instructions:
	how to build, migrate, start, and verify the app in a hosted environment.
- Tenant onboarding path:
	how to create a salon and its first admin safely.
- Release verification checklist:
	manual checks for public booking, admin login, admin bookings, setup page, and health endpoints.
- Rollback awareness:
	at minimum, a documented restore path for database and app version rollback.

### The User Experience We Are Aiming For

- A new salon can be onboarded without improvising technical steps.
- A release can be repeated on another machine or host without hidden assumptions.
- The first real customer does not hit obvious setup mistakes like broken env values, missing migrations, or missing assets.
- After deployment, you can quickly confirm whether the app is healthy and usable.

### Decisions To Make

- [ ] Hosting shape: One VPS/server with frontend and backend together, or split hosting for frontend and backend?
- [ ] Database hosting: Keep PostgreSQL self-hosted first, or move to a managed database before first release?
- [ ] Upload storage: Keep local-disk uploads in the first release, or move to cloud/object storage now?
- [ ] Deployment style: Manual deploy script/checklist first, or automated deployment pipeline now?
- [ ] Environments: Local + production only, or add a real staging environment before first customer?
- [ ] Domain shape: Use one shared app domain first, or prepare per-salon custom domains already?
- [ ] Backups: Manual scheduled backups first, or automated backup handling before release?
- [ ] Monitoring: Health endpoints + logs only, or add a hosted error-monitoring tool now?
- [ ] Notification readiness: Is page-only confirmation still enough for first users, or must email notifications land before release?
- [ ] Branding threshold: Is the current UI good enough for a first salon, or should branding polish be part of release readiness?
- [ ] Onboarding flow: Will each new salon be provisioned only by you manually, or do you want a more polished internal onboarding checklist now?
- [ ] Go-live scope: Release to one pilot salon first, or prepare for multiple salons immediately?

### Recommended Default If You Want To Move Fast

- Hosting shape:
	one server/VPS is enough for the first release.
- Database hosting:
	self-hosted PostgreSQL is acceptable if backups are handled, managed DB later.
- Upload storage:
	local disk is acceptable for the first pilot if hosting is simple and backups are covered.
- Deployment style:
	manual but documented deployment first.
- Environments:
	local + production is enough if you stay disciplined, staging later if releases get riskier.
- Domain shape:
	shared app domain first.
- Backups:
	at least automated database dumps before first customer.
- Monitoring:
	health endpoints + structured logs first.
- Notification readiness:
	page-only confirmation can work for a technical pilot, but customer-facing email is strongly worth reconsidering before broader rollout.
- Branding threshold:
	ship only once the booking and admin experience look intentional and trustworthy.
- Onboarding flow:
	manual operator-led onboarding is fine for MVP.
- Go-live scope:
	one pilot salon first.

### Decisions

Hosting shape:
One IONOS Ubuntu VPS for the first pilot.
Frontend is built in GitHub Actions and deployed as static files served by Nginx.
Backend runs as one long-running Express.js service on the VPS.
Nginx handles HTTPS, static frontend delivery, and reverse proxying /api to Express.

Database hosting:
Use PostgreSQL on the same VPS for the first pilot if the VPS has enough RAM and disk.
Prefer host-installed PostgreSQL or one lightweight Docker PostgreSQL container, but avoid running unnecessary extra containers.
If the VPS is very small or already under load, move PostgreSQL to a managed provider earlier.

Upload storage:
Use local disk first for salon logos/assets, but keep uploads small and include them in backups.
Store uploads outside the app release folder, for example /var/www/sapphirix/uploads.
Move to object storage later if multiple salons or larger media uploads become relevant.

Deployment style:
GitHub Actions builds and tests the app.
GitHub Actions builds the Angular frontend and uploads only the static dist files to the VPS.
Backend deployment can be either:
1. SSH pull latest code, install production dependencies, run migrations, restart with systemd/PM2
or
2. build backend artifact in GitHub Actions and upload it to the VPS.
For your VPS, I would start with systemd or PM2 instead of Docker for the Express backend if you want the lowest overhead.

Environments:
Local + production first.
Do not add staging yet unless you start making risky changes while a real salon depends on the app.
Use a separate test salon tenant in production for final checks.

Domain shape:
Use one shared app domain first, for example:
app.yourbrand.ch/s/salon-slug
or
booking.yourbrand.ch/s/salon-slug
Custom domains per salon should wait.

Backups:
Automated PostgreSQL dumps before the first real customer.
Keep at least 7 daily backups.
Also back up uploads and the production env file securely.
Do one restore rehearsal before going live.

Monitoring:
Use /health and /ready endpoints, Nginx logs, backend logs, and a simple external uptime monitor.
Add hosted error tracking later if errors become hard to diagnose.

Notification readiness:
For your barber friend / technical pilot, page-only confirmation can be acceptable.
Before broader real customer use, add at least customer confirmation email and optional admin notification email.

Branding threshold:
The booking page must look trustworthy and intentional before the pilot.
It does not need to be perfect, but it should not feel like a dev prototype.

Onboarding flow:
Manual onboarding by you first.
Use a provisioning script or checklist to create:
- salon
- first admin
- services
- opening hours
- branding
- booking URL

Go-live scope:
One pilot salon first.
Do not optimize for many salons until one salon has used it successfully in real operation.

### How To Validate

- Prepare a fresh host or clean environment and confirm the documented env setup is enough to start the app.
- Run the production build and confirm frontend and backend both start with the production-oriented config.
- Apply migrations on the target environment and confirm the app boots without schema mismatch errors.
- Run the provisioning flow for a new salon and first admin and confirm login works afterward.
- Open the public booking page on the deployed environment and confirm salon data, services, and booking creation work end to end.
- Open the admin area and confirm login, booking management, and settings all work after deploy.
- Verify file uploads or logo rendering on the hosted environment if uploads stay in scope.
- Confirm `/health` and `/ready` behave correctly in the hosted environment.
- Confirm logs are readable enough to diagnose a bad request and an unexpected server failure.
- Perform one backup and one restore rehearsal, even if the restore is only validated in a non-production copy.
- Walk through the release checklist and note any steps that still rely on tribal knowledge or undocumented assumptions.

### Done Means

- Production env handling is clearly defined.
- Deployment can be repeated without guessing hidden steps.
- Migration and provisioning steps are documented and usable.
- The MVP has been reviewed end to end from a release perspective.
- You know what is ready for a pilot salon and what still needs polish before broader rollout.
- The project is no longer just locally functional; it is operationally understandable.

## Open Notes

- Your ideas:
- Questions to settle:
- Features to postpone: