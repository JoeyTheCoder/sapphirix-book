## 1. Admin notifications for new bookings

Goal:
Add a visible notification bell in the admin navbar so salon owners immediately see when a new booking request has arrived.

Desired outcome:
- A bell icon is shown in the admin header.
- New or unread booking events are visible without manually refreshing the bookings page.
- The owner can see what happened directly from the notification UI.

Decisions to make before implementation:
- Trigger source:
	- Only new public booking requests
	- All booking-related events, including confirmations, cancellations, and manual admin bookings
- Delivery mode:
	- Polling every X seconds
	- Real-time via WebSocket / SSE
	- Refresh only when the admin opens the app again
- Notification surface:
	- Simple unread count on the bell only
	- Small dropdown with latest notifications
	- Dedicated notifications page in addition to the bell
- Read state:
	- Mark as read when opening the bell
	- Mark as read only when opening the related booking
	- Keep notifications permanently as history with read/unread status
- Retention:
	- Only recent notifications, e.g. last 7-30 days
	- Full notification history

Recommended default:
- Trigger only for new public booking requests
- Start with polling
- Bell with unread badge and small dropdown
- Mark as read when opening the dropdown
- Keep recent notifications only

## 2. Dark button animation should not hide text

Goal:
Remove or redesign the current dark-blue button interaction effect because it makes labels harder to read during hover/press states.

Desired outcome:
- Primary dark buttons stay readable at all times.
- Hover and active states still feel intentional, but not distracting.
- The fix is applied consistently across admin and public pages.

Decisions to make before implementation:
- Interaction style:
	- Very subtle hover only, e.g. brightness or border change
	- Slight lift/shadow effect
	- No animation at all on dark buttons
- Scope:
	- Only dark primary buttons
	- All buttons across the application
- Motion level:
	- Keep a small transition
	- Remove transitions completely for key actions

Recommended default:
- Keep a subtle hover and active transition
- Remove any effect that overlays, masks, or shifts the text
- Apply the fix to all shared primary dark buttons

## 3. Route naming and generated booking links

Goal:
Adjust the route structure so the admin stays at fadeflow.ch/admin and each salon booking page is created as fadeflow.ch/salon-name.

Desired outcome:
- Admin remains available at /admin
- Public booking pages use /:salonSlug
- All generated booking links and displays in the UI follow the same format

Decisions to make before implementation:
- Final public route format:
	- /:salonSlug
	- /salon/:salonSlug/book
	- /book/:salonSlug
- Slug source:
	- Reuse current salon slug exactly
	- Add stricter slug rules before exposing it publicly
- Compatibility strategy:
	- Replace the old route completely
	- Keep redirects from the old route for compatibility
- Booking URL display:
	- Show full absolute URL in admin settings
	- Show only path and add a copy button

Decisions:
- Use /:salonSlug/
- Reuse the current slug
- Add redirects from the old route if it already exists anywhere public-facing
- Show the full URL plus a copy action in admin settings

## 4. Responsive redesign for admin and booking flows

Goal:
Improve the layout across phone, tablet, laptop, and desktop so the app feels intentional and usable on all screen sizes.

Desired outcome:
- Content stacks cleanly on small screens.
- Navigation, forms, drawers, and booking timelines remain usable on touch devices.
- The admin bookings view becomes easier to scan on mobile.

Decisions to make before implementation:
- Breakpoint strategy:
	- Mobile-first redesign
	- Desktop-first adjustments only
- Admin booking calendar on mobile:
	- Show only yesterday / today / tomorrow with arrows
	- Show 3-4 days centered around today
	- Switch to a list/day-selector pattern instead of a week grid
- Admin settings on mobile:
	- Sidebar becomes top tabs
	- Sidebar becomes a dropdown/select
	- Sidebar stays left but scrolls horizontally
- Drawers and overlays on mobile:
	- Full-screen sheets
	- Bottom sheets
	- Keep right-side drawers
- Public booking flow on mobile:
	- Keep four stacked steps on one page
	- Turn steps into one-step-at-a-time cards
- Minimum supported screen sizes:
	- Phone only for basic usability
	- Fully optimized for phone and tablet

Recommended default:
- Use a mobile-first pass
- Admin bookings mobile view shows a compact 3-day range with arrows
- Admin settings sidebar becomes a top tab row or select on small screens
- Drawers become full-screen on mobile
- Public booking stays step-based but becomes more vertically compact

## Suggested rollout order

1. Fix dark button interaction globally
2. Change public route structure and generated booking links
3. Do the responsive pass
4. Add admin notifications after the layout is stable