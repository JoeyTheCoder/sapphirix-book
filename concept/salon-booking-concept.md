# Salon Booking Onepager — Product Concept

## 1. Vision

Build a **modular one-page web application** for small Swiss coiffeur shops that want a simple, affordable online booking solution without the complexity of large salon platforms.

The product should help salons with three core needs:

1. **Accept bookings online**
2. **Manage appointments in one place**
3. **Offer customers a simple booking experience on mobile and desktop**

The first version is focused on **small to medium local salons** with limited technical knowledge and little or no existing digital presence.

---

## 2. Core Idea

The application is designed as a **single-page app (SPA)** with two main views:

### Customer View
The public-facing booking flow for salon customers.

Customers can:
- Open the booking page from a shared link or embedded website section
- See available services
- Select a date and time
- See which time slots are already unavailable
- Enter their contact details
- Confirm an appointment

### Admin View
The internal salon dashboard for the owner or staff.

Admins can:
- View all appointments
- Confirm, edit, move, or cancel appointments
- Define opening hours and blocked time ranges
- Manage services and appointment durations
- See customer information
- Control what customers can book online

This keeps the product easy to understand:
- **Customers book**
- **Salon staff manage**

---

## 3. Why the Onepager Approach Fits

A one-page application is a strong fit because it gives salons a modern product without forcing them to manage multiple systems.

Benefits:
- Fast and mobile-friendly
- Easy to deploy as a hosted web app
- Can be embedded into a simple website later
- Feels like a product, not a collection of separate tools
- Easier onboarding for non-technical users

The SPA structure also supports future modular growth without changing the core user experience.

---

## 4. Product Principles

The product should follow these principles:

### Simplicity first
The system must be usable by salon owners who are not technical. The booking flow should require very few clicks.

### Modular growth
The first release should be small, but the platform should allow additional modules later.

### Local business friendly
The product should fit the needs of small Swiss salons:
- affordable
- multilingual if needed
- low maintenance
- clear UI
- no unnecessary enterprise features

### Mobile-first
Most salon owners and customers will use the system on phones. Both views should work well on small screens.

---

## 5. Functional Flow

## 5.1 Customer Booking Flow

A typical customer journey:

1. Customer opens the booking page
2. Customer chooses a service
3. Customer picks a date
4. System shows bookable time slots only
5. Already booked slots are hidden or marked unavailable
6. Customer enters name, phone, and optionally email
7. Customer confirms booking
8. Customer gets a confirmation message
9. Admin sees the appointment immediately in the dashboard

This is the most important user flow and should be frictionless.

---

## 5.2 Admin Management Flow

A salon admin journey:

1. Admin logs into the admin area
2. Admin sees today's and upcoming appointments
3. Admin can filter by date, service, or status
4. Admin can add a manual appointment for walk-ins or phone bookings
5. Admin can block times such as lunch or vacation
6. Admin can manage services, durations, and availability
7. Admin can cancel or reschedule appointments

This gives the salon a central scheduling tool, even if some bookings still come by phone.

---

## 6. Initial Modules

The platform should be designed as a modular system, even if only a few modules are enabled at launch.

### Module A — Booking Module
The core booking experience.
- service selection
- date/time selection
- appointment creation
- availability checks

### Module B — Admin Calendar Module
The internal dashboard and appointment list.
- upcoming appointments
- appointment details
- manual edits
- cancellations and rescheduling

### Module C — Service Configuration Module
Lets salons define what customers can book.
- service name
- duration
- optional price display
- bookable / not bookable toggle

### Module D — Availability Module
Controls when appointments can happen.
- opening hours
- closed days
- special blocked slots
- holidays / exceptions

These four modules are enough for a valuable MVP.

---

## 7. Suggested MVP Scope

To avoid overbuilding, the MVP should focus on:

### Customer side
- public booking page
- service selection
- live slot availability
- booking confirmation

### Admin side
- secure login
- appointment overview
- appointment detail page
- add/edit/cancel appointment
- manage services
- manage working hours

### Basic system support
- notifications by email first
- audit-friendly status tracking
- multi-tenant separation between salons

Not included in MVP:
- advanced staff scheduling
- online payments
- loyalty programs
- marketing automation
- analytics dashboards
- POS features

---

## 8. Multi-Tenant Business Model Fit

The platform should support multiple salons from the beginning.

Each salon gets:
- its own booking page
- its own admin access
- its own services
- its own business hours
- its own appointment data

This enables the product to work as a real SaaS platform rather than a one-off custom project per shop.

Example:
- `app.yourbrand.ch/salon-abc`
- `app.yourbrand.ch/salon-xyz`

Later, a custom domain or branded landing page can be added.

---

## 9. Website + Booking Combination

A strong commercial angle is to offer the booking system together with a basic salon website.

The setup can look like this:
- simple landing page with salon info
- service overview
- map/contact details
- integrated booking widget or direct booking route

This helps small salons who currently have no digital presence at all.

In practice, you are not only selling software. You are selling:
- easier scheduling
- fewer phone interruptions
- a more professional online presence
- better customer convenience

---

## 10. Future Modules

After MVP validation, additional modules can be added without changing the foundation.

Possible future modules:
- staff accounts and staff-specific calendars
- automated reminders by SMS or WhatsApp
- customer history
- payment/prepayment support
- coupon and discount logic
- multilingual customer UI
- review requests after appointments
- no-show tracking
- simple reporting

The architecture should treat these as optional modules that can be added per tenant or per pricing plan.

---

## 11. Recommended User Experience Decisions

To keep the product practical:

### For customers
- Avoid forced account creation
- Keep booking steps short
- Show only available slots
- Make confirmation immediate and clear

### For admins
- Default to today's appointments
- Use a very simple dashboard
- Keep forms minimal
- Allow manual override when needed

This is important because salon software often fails by becoming too heavy.

---

## 12. Summary

This project should be positioned as a **modular one-page salon booking platform** with two tightly connected experiences:

- a **customer booking interface** for fast online reservations
- an **admin management interface** for complete appointment control

At launch, it should solve one problem very well:
**making salon appointment booking simple, visible, and manageable for small local businesses.**

The system should be small enough to launch quickly, but structured well enough to grow into a reusable SaaS product for multiple salons.
