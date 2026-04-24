CREATE TYPE "public"."booking_origin" AS ENUM('public', 'admin');--> statement-breakpoint
ALTER TABLE "admins" ADD COLUMN "notifications_read_at" timestamp with time zone DEFAULT now() NOT NULL;--> statement-breakpoint
ALTER TABLE "bookings" ADD COLUMN "origin" "booking_origin" DEFAULT 'public' NOT NULL;--> statement-breakpoint
CREATE INDEX "bookings_salon_origin_created_at_idx" ON "bookings" USING btree ("salon_id","origin","created_at");