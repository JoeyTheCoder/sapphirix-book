ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "price_amount" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "services" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'CHF';--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "price_amount" integer NOT NULL DEFAULT 0;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN IF NOT EXISTS "currency" text NOT NULL DEFAULT 'CHF';
