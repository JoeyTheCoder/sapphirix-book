ALTER TABLE "bookings" ALTER COLUMN "status" SET DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "salons" ADD COLUMN "booking_buffer_minutes" integer DEFAULT 10 NOT NULL;