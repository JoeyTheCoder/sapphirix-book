# Release Checklist

## Before Deploy

- `pnpm install`
- `pnpm build`
- `pnpm test:smoke`
- Root `.env` reviewed for production-safe values
- `.env.production.example` checked against the real VPS env
- Firebase keys verified
- Turnstile keys verified if bot protection is enabled
- Backup script path reviewed

## Deploy

- Latest code is on the VPS
- Production env file exists at `/var/www/sapphirix/shared/.env`
- Backend dependencies installed
- Backend build completed
- `pnpm --filter backend db:migrate` completed successfully
- Frontend static files uploaded to `/var/www/sapphirix/frontend/current`
- Backend service restarted
- Nginx config validated and reloaded

## After Deploy

- `GET /health` returns success
- `GET /ready` returns success
- Public booking page loads for the pilot salon
- Services load correctly
- Availability endpoint returns valid slots
- A real test booking can be created
- Admin login works
- Admin bookings page works
- Admin settings page works
- Logo upload or existing logo rendering works
- Logs are readable for one normal request and one forced bad request

## Pilot Salon Onboarding

- Provision salon and first admin
- Add at least one real service
- Set opening hours
- Add logo / branding
- Confirm final booking URL
- Confirm admin login URL
- Walk through one customer booking with the salon owner

## Backup And Recovery

- One automated backup has run successfully
- One restore rehearsal has been completed in a safe environment
- Upload backup archive is present
- Production env backup is stored securely

## Go-Live Decision

- Booking flow feels trustworthy
- Admin flow is usable for the pilot salon
- Operational steps are documented enough that you are not improvising
- Open issues are known and accepted for a single pilot salon