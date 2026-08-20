-- =============================================================
-- FITVIBE — Supabase setup script
-- Paste this WHOLE file into Supabase → SQL Editor → New query,
-- then click Run. Safe to run once on a fresh project.
-- Part 1: creates all tables + enums (from db/schema.ts).
-- Part 2: loads your real membership plan pricing (Spark/Forge/
-- 1-on-1/Founding Member/SJGC) so Programmes page has real data.
-- Class timetable + real member data are NOT included here —
-- ask Eva to generate a fresh batch of class dates when you're
-- ready to open bookings, and handle real member migration
-- separately (see README.md).
-- =============================================================

-- ---- Part 1: schema ----
CREATE TYPE "public"."access_direction" AS ENUM('entry', 'exit');--> statement-breakpoint
CREATE TYPE "public"."access_result" AS ENUM('granted', 'denied');--> statement-breakpoint
CREATE TYPE "public"."admin_role" AS ENUM('owner', 'admin', 'staff');--> statement-breakpoint
CREATE TYPE "public"."booking_status" AS ENUM('booked', 'waitlisted', 'cancelled', 'attended', 'no_show');--> statement-breakpoint
CREATE TYPE "public"."class_status" AS ENUM('scheduled', 'cancelled', 'completed');--> statement-breakpoint
CREATE TYPE "public"."credential_status" AS ENUM('active', 'revoked', 'lost');--> statement-breakpoint
CREATE TYPE "public"."credential_type" AS ENUM('qr', 'rfid', 'pin');--> statement-breakpoint
CREATE TYPE "public"."credit_pack_status" AS ENUM('active', 'expired', 'exhausted');--> statement-breakpoint
CREATE TYPE "public"."member_status" AS ENUM('prospect', 'active', 'expired', 'frozen', 'suspended');--> statement-breakpoint
CREATE TYPE "public"."payment_method" AS ENUM('duitnow', 'bank_transfer', 'cash', 'online_gateway');--> statement-breakpoint
CREATE TYPE "public"."payment_status" AS ENUM('pending', 'approved', 'rejected');--> statement-breakpoint
CREATE TABLE "access_credentials" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"type" "credential_type" DEFAULT 'qr' NOT NULL,
	"credential_token" text NOT NULL,
	"issued_at" timestamp with time zone DEFAULT now() NOT NULL,
	"revoked_at" timestamp with time zone,
	"status" "credential_status" DEFAULT 'active' NOT NULL,
	CONSTRAINT "access_credentials_credential_token_unique" UNIQUE("credential_token")
);
--> statement-breakpoint
CREATE TABLE "access_logs" (
	"id" text PRIMARY KEY NOT NULL,
	"credential_id" text,
	"member_id" text,
	"timestamp" timestamp with time zone DEFAULT now() NOT NULL,
	"direction" "access_direction" DEFAULT 'entry' NOT NULL,
	"result" "access_result" NOT NULL,
	"reason" text
);
--> statement-breakpoint
CREATE TABLE "admin_users" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"role" "admin_role" DEFAULT 'staff' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "admin_users_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "bookings" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"class_session_id" text NOT NULL,
	"credit_pack_id" text,
	"status" "booking_status" DEFAULT 'booked' NOT NULL,
	"booked_at" timestamp with time zone DEFAULT now() NOT NULL,
	"cancelled_at" timestamp with time zone,
	"cancellation_reason" text,
	"late_cancellation" boolean DEFAULT false,
	"management_override" boolean DEFAULT false,
	"override_reason" text
);
--> statement-breakpoint
CREATE TABLE "class_sessions" (
	"id" text PRIMARY KEY NOT NULL,
	"title" text NOT NULL,
	"membership_plan_id" text,
	"start_time" timestamp with time zone NOT NULL,
	"end_time" timestamp with time zone NOT NULL,
	"capacity" integer NOT NULL,
	"instructor" text,
	"recurrence_rule" text,
	"status" "class_status" DEFAULT 'scheduled' NOT NULL
);
--> statement-breakpoint
CREATE TABLE "credit_packs" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"membership_plan_id" text,
	"credits_total" integer NOT NULL,
	"credits_remaining" integer NOT NULL,
	"purchased_at" timestamp with time zone DEFAULT now() NOT NULL,
	"expires_at" timestamp with time zone NOT NULL,
	"status" "credit_pack_status" DEFAULT 'active' NOT NULL,
	"payment_id" text
);
--> statement-breakpoint
CREATE TABLE "members" (
	"id" text PRIMARY KEY NOT NULL,
	"full_name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text NOT NULL,
	"dob" text,
	"gender" text,
	"emergency_contact_name" text,
	"emergency_contact_phone" text,
	"medical_notes" text,
	"chronic_condition_flags" text,
	"waiver_signed_at" timestamp with time zone,
	"waiver_signature_ref" text,
	"pdpa_consent_at" timestamp with time zone,
	"status" "member_status" DEFAULT 'prospect' NOT NULL,
	"status_reason" text,
	"status_updated_at" timestamp with time zone DEFAULT now(),
	"membership_plan_id" text,
	"source" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "members_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "membership_plans" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"class_capacity" integer,
	"price_rm" real NOT NULL,
	"credits_included" integer NOT NULL,
	"validity_days" integer NOT NULL,
	"is_founding_member_offer" boolean DEFAULT false,
	"active" boolean DEFAULT true NOT NULL
);
--> statement-breakpoint
CREATE TABLE "payments" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"amount_rm" real NOT NULL,
	"method" "payment_method" NOT NULL,
	"reference_note" text,
	"proof_url" text,
	"gateway_ref" text,
	"status" "payment_status" DEFAULT 'pending' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"approved_at" timestamp with time zone,
	"approved_by_admin_id" text
);
--> statement-breakpoint
ALTER TABLE "access_credentials" ADD CONSTRAINT "access_credentials_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_credential_id_access_credentials_id_fk" FOREIGN KEY ("credential_id") REFERENCES "public"."access_credentials"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "access_logs" ADD CONSTRAINT "access_logs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_class_session_id_class_sessions_id_fk" FOREIGN KEY ("class_session_id") REFERENCES "public"."class_sessions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "bookings" ADD CONSTRAINT "bookings_credit_pack_id_credit_packs_id_fk" FOREIGN KEY ("credit_pack_id") REFERENCES "public"."credit_packs"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "class_sessions" ADD CONSTRAINT "class_sessions_membership_plan_id_membership_plans_id_fk" FOREIGN KEY ("membership_plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_packs" ADD CONSTRAINT "credit_packs_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_packs" ADD CONSTRAINT "credit_packs_membership_plan_id_membership_plans_id_fk" FOREIGN KEY ("membership_plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "credit_packs" ADD CONSTRAINT "credit_packs_payment_id_payments_id_fk" FOREIGN KEY ("payment_id") REFERENCES "public"."payments"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "members" ADD CONSTRAINT "members_membership_plan_id_membership_plans_id_fk" FOREIGN KEY ("membership_plan_id") REFERENCES "public"."membership_plans"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "payments" ADD CONSTRAINT "payments_approved_by_admin_id_admin_users_id_fk" FOREIGN KEY ("approved_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;

-- ---- Part 2: membership plans (real pricing) ----
INSERT INTO public.membership_plans (id, name, description, class_capacity, price_rm, credits_included, validity_days, is_founding_member_offer, active) VALUES ('268ada73-7e8f-48c4-9172-9bb6991560dd', 'Spark — Starter (6 credits)', 'Small-group mobility & balance sessions, max 4 per class.', 4, 320, 6, 30, false, true);
INSERT INTO public.membership_plans (id, name, description, class_capacity, price_rm, credits_included, validity_days, is_founding_member_offer, active) VALUES ('fd6bcc40-0647-4ffa-91f8-885483db0027', 'Spark — Standard (10 credits)', 'Small-group mobility & balance sessions, max 4 per class.', 4, 500, 10, 60, false, true);
INSERT INTO public.membership_plans (id, name, description, class_capacity, price_rm, credits_included, validity_days, is_founding_member_offer, active) VALUES ('e61a347b-2215-4d72-8314-67bbc8e24346', 'Forge — Standard (10 credits)', 'Group strength training, max 8 per class.', 8, 450, 10, 60, false, true);
INSERT INTO public.membership_plans (id, name, description, class_capacity, price_rm, credits_included, validity_days, is_founding_member_offer, active) VALUES ('528e3142-daed-4a73-9ea5-2b1c41efd684', 'Forge — Extended (20 credits)', 'Group strength training, max 8 per class.', 8, 800, 20, 90, false, true);
INSERT INTO public.membership_plans (id, name, description, class_capacity, price_rm, credits_included, validity_days, is_founding_member_offer, active) VALUES ('49bc97ea-1ed6-402f-894a-0cc36192b3bf', '1-on-1 ForEva Assessment & Training', 'Private specialist sessions with Ethan.', 1, 150, 1, 30, false, true);
INSERT INTO public.membership_plans (id, name, description, class_capacity, price_rm, credits_included, validity_days, is_founding_member_offer, active) VALUES ('723daf91-937d-4102-9739-a4677b516c71', 'Founding Member — Forever Pass', 'Limited to 20 slots. Locked-in rate for life. Sign-up by 30 Sep 2026.', 8, 1200, 30, 90, true, true);
INSERT INTO public.membership_plans (id, name, description, class_capacity, price_rm, credits_included, validity_days, is_founding_member_offer, active) VALUES ('5464de33-8c6d-419a-9abc-3569b38c9cdf', 'SJGC Partner Rate', 'Preferential rate for SJGC / Strong Beyond 50 community members.', 8, 400, 10, 60, false, true);
