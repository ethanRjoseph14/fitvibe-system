-- =============================================================
-- FITVIBE — Member portal, admin panel & access-rule update (22 Aug 2026)
--
-- What this adds:
--   1. A password column on members, so they can log into the member
--      portal for real (the old prototype just took an email in the URL —
--      no password check at all).
--   2. A "complaints" table — a simple log, not a full ticket system.
--   3. A "progress_checkins" table — initial assessment + monthly
--      check-ins, shown on the member's own portal page.
--
-- This does NOT change the door-access rule below — that's application
-- code (lib/access.ts), not the database. Just a heads-up on what changed
-- alongside this migration: gym entry now only checks that a member's
-- validity window hasn't lapsed, not whether they have credits left.
-- Running out of credits blocks class booking, not the front door.
--
-- Paste this whole file into Supabase → SQL Editor → New query, then
-- click Run. Safe to run once; nothing existing is deleted or altered
-- destructively.
-- =============================================================

BEGIN;

CREATE TYPE "public"."checkin_type" AS ENUM('initial_assessment', 'monthly_checkin');
CREATE TYPE "public"."complaint_status" AS ENUM('open', 'resolved');

CREATE TABLE "complaints" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text,
	"member_name_free_text" text,
	"subject" text NOT NULL,
	"description" text NOT NULL,
	"status" "complaint_status" DEFAULT 'open' NOT NULL,
	"submitted_at" timestamp with time zone DEFAULT now() NOT NULL,
	"logged_by_admin_id" text,
	"admin_notes" text,
	"resolved_at" timestamp with time zone
);

CREATE TABLE "progress_checkins" (
	"id" text PRIMARY KEY NOT NULL,
	"member_id" text NOT NULL,
	"type" "checkin_type" NOT NULL,
	"recorded_at" timestamp with time zone DEFAULT now() NOT NULL,
	"weight_kg" real,
	"resting_heart_rate" integer,
	"mobility_notes" text,
	"strength_notes" text,
	"pain_level" integer,
	"coach_notes" text,
	"recorded_by_admin_id" text
);

ALTER TABLE "members" ADD COLUMN "password_hash" text;

ALTER TABLE "complaints" ADD CONSTRAINT "complaints_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "complaints" ADD CONSTRAINT "complaints_logged_by_admin_id_admin_users_id_fk" FOREIGN KEY ("logged_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "progress_checkins" ADD CONSTRAINT "progress_checkins_member_id_members_id_fk" FOREIGN KEY ("member_id") REFERENCES "public"."members"("id") ON DELETE no action ON UPDATE no action;
ALTER TABLE "progress_checkins" ADD CONSTRAINT "progress_checkins_recorded_by_admin_id_admin_users_id_fk" FOREIGN KEY ("recorded_by_admin_id") REFERENCES "public"."admin_users"("id") ON DELETE no action ON UPDATE no action;

COMMIT;
