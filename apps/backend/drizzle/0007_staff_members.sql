-- staff_members table: stores staff/employee names per salon
CREATE TABLE "staff_members" (
  "id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
  "salon_id" uuid NOT NULL REFERENCES "salons"("id") ON DELETE CASCADE,
  "name" text NOT NULL,
  "active" boolean NOT NULL DEFAULT true,
  "sort_order" integer NOT NULL DEFAULT 0,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);

CREATE INDEX "staff_members_salon_id_idx" ON "staff_members" ("salon_id");

-- staff preference field on bookings (customer-expressed preference only, not a hard assignment)
ALTER TABLE "bookings" ADD COLUMN "staff_member_preference" text;
