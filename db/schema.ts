import {
  pgTable,
  text,
  integer,
  real,
  boolean,
  timestamp,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/**
 * FITVIBE — Member, Membership & Door Access data model
 *
 * This schema is the single source of truth referenced throughout the app:
 * the booking system, the credit/payment system, and the door-access system
 * all read/write the SAME member + credential records. This directly satisfies
 * the "no duplicate, driftable databases" requirement from the
 * "Fitvibe — Member Data, Membership & Door Access System" discussion brief
 * (16 Aug 2026).
 *
 * Runs on Postgres (Supabase). Converted from the original SQLite prototype
 * on 19 Aug 2026 once Ethan set up a live Supabase project.
 */

export const adminRoleEnum = pgEnum("admin_role", ["owner", "admin", "staff"]);
export const memberStatusEnum = pgEnum("member_status", [
  "prospect",
  "active",
  "expired",
  "frozen",
  "suspended",
]);
export const creditPackStatusEnum = pgEnum("credit_pack_status", [
  "active",
  "expired",
  "exhausted",
]);
export const paymentMethodEnum = pgEnum("payment_method", [
  "duitnow",
  "bank_transfer",
  "cash",
  "online_gateway",
]);
export const paymentStatusEnum = pgEnum("payment_status", ["pending", "approved", "rejected"]);
export const classStatusEnum = pgEnum("class_status", ["scheduled", "cancelled", "completed"]);
export const bookingStatusEnum = pgEnum("booking_status", [
  "booked",
  "waitlisted",
  "cancelled",
  "attended",
  "no_show",
]);
export const credentialTypeEnum = pgEnum("credential_type", ["qr", "rfid", "pin"]);
export const credentialStatusEnum = pgEnum("credential_status", ["active", "revoked", "lost"]);
export const accessDirectionEnum = pgEnum("access_direction", ["entry", "exit"]);
export const accessResultEnum = pgEnum("access_result", ["granted", "denied"]);
export const complaintStatusEnum = pgEnum("complaint_status", ["open", "resolved"]);
export const checkinTypeEnum = pgEnum("checkin_type", ["initial_assessment", "monthly_checkin"]);

// ---------------------------------------------------------------------------
// Staff / admin users (front desk + Ethan)
// ---------------------------------------------------------------------------
export const adminUsers = pgTable("admin_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: adminRoleEnum("role").notNull().default("staff"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// Members
// ---------------------------------------------------------------------------
export const members = pgTable("members", {
  id: text("id").primaryKey(),
  fullName: text("full_name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  dob: text("dob"),
  gender: text("gender"),

  emergencyContactName: text("emergency_contact_name"),
  emergencyContactPhone: text("emergency_contact_phone"),

  // Member portal login. Nullable — front-desk staff set/reset this from the
  // admin panel (no self-serve signup or email-based password reset yet,
  // since there's no email-sending set up). A member with no password set
  // sees "ask the front desk" on the login page rather than a broken form.
  passwordHash: text("password_hash"),

  // PDPA-sensitive: chronic condition / medical flags captured at registration.
  // Stored as free text + structured flags; access restricted to admin views only.
  medicalNotes: text("medical_notes"),
  chronicConditionFlags: text("chronic_condition_flags"), // JSON array string, e.g. ["hypertension","post-op knee"]

  // Consent / PDPA / waiver — digital e-signature capture per Systems Tracker
  waiverSignedAt: timestamp("waiver_signed_at", { withTimezone: true }),
  waiverSignatureRef: text("waiver_signature_ref"), // pointer to stored signature image/hash
  pdpaConsentAt: timestamp("pdpa_consent_at", { withTimezone: true }),

  // Overall membership status — THE field door access reads to decide entry
  status: memberStatusEnum("status").notNull().default("prospect"),
  statusReason: text("status_reason"), // e.g. "injury pause", "non-renewal"
  statusUpdatedAt: timestamp("status_updated_at", { withTimezone: true }).default(sql`now()`),

  membershipPlanId: text("membership_plan_id").references(() => membershipPlans.id),
  source: text("source"), // e.g. "Strong Beyond 50 migration", "Founding Member", "walk-in"

  createdAt: timestamp("created_at", { withTimezone: true }).notNull().default(sql`now()`),
});

// ---------------------------------------------------------------------------
// Membership plans (Spark / Forge / 1-on-1 / Founding Member / SJGC rate)
// ---------------------------------------------------------------------------
export const membershipPlans = pgTable("membership_plans", {
  id: text("id").primaryKey(),
  name: text("name").notNull(), // "Spark", "Forge", "1-on-1", "Founding Member", "SJGC Rate"
  description: text("description"),
  classCapacity: integer("class_capacity"), // 4 (Spark) or 8 (Forge) per session
  priceRM: real("price_rm").notNull(),
  creditsIncluded: integer("credits_included").notNull(),
  validityDays: integer("validity_days").notNull(), // e.g. 30, 60, 90
  isFoundingMemberOffer: boolean("is_founding_member_offer").default(false),
  active: boolean("active").notNull().default(true),
});

// ---------------------------------------------------------------------------
// Credit packs — a member's purchased batch of session credits
// ---------------------------------------------------------------------------
export const creditPacks = pgTable("credit_packs", {
  id: text("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => members.id),
  membershipPlanId: text("membership_plan_id").references(() => membershipPlans.id),
  creditsTotal: integer("credits_total").notNull(),
  creditsRemaining: integer("credits_remaining").notNull(),
  purchasedAt: timestamp("purchased_at", { withTimezone: true }).notNull().default(sql`now()`),
  expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
  status: creditPackStatusEnum("status").notNull().default("active"),
  paymentId: text("payment_id").references(() => payments.id),
});

// ---------------------------------------------------------------------------
// Payments — v1 is MANUAL logging (DuitNow QR / bank transfer), per the
// confirmed plan. Schema leaves room for a future online gateway (Billplz,
// etc.) via the `method` + `gatewayRef` fields without a rework.
// ---------------------------------------------------------------------------
export const payments = pgTable("payments", {
  id: text("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => members.id),
  amountRM: real("amount_rm").notNull(),
  method: paymentMethodEnum("method").notNull(),
  referenceNote: text("reference_note"), // member-entered bank ref / transaction note
  proofUrl: text("proof_url"), // uploaded screenshot of transfer
  gatewayRef: text("gateway_ref"), // reserved for future Billplz/etc. bill id
  status: paymentStatusEnum("status").notNull().default("pending"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().default(sql`now()`),
  approvedAt: timestamp("approved_at", { withTimezone: true }),
  approvedByAdminId: text("approved_by_admin_id").references(() => adminUsers.id),
});

// ---------------------------------------------------------------------------
// Class sessions (Spark / Forge / 1-on-1 timetable)
// ---------------------------------------------------------------------------
export const classSessions = pgTable("class_sessions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(), // "Spark — Mobility & Balance"
  membershipPlanId: text("membership_plan_id").references(() => membershipPlans.id),
  startTime: timestamp("start_time", { withTimezone: true }).notNull(),
  endTime: timestamp("end_time", { withTimezone: true }).notNull(),
  capacity: integer("capacity").notNull(),
  instructor: text("instructor"),
  recurrenceRule: text("recurrence_rule"), // e.g. "FREQ=WEEKLY;BYDAY=MO,WE,FR"
  status: classStatusEnum("status").notNull().default("scheduled"),
});

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------
export const bookings = pgTable("bookings", {
  id: text("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => members.id),
  classSessionId: text("class_session_id")
    .notNull()
    .references(() => classSessions.id),
  creditPackId: text("credit_pack_id").references(() => creditPacks.id),
  status: bookingStatusEnum("status").notNull().default("booked"),
  bookedAt: timestamp("booked_at", { withTimezone: true }).notNull().default(sql`now()`),
  cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
  cancellationReason: text("cancellation_reason"),
  lateCancellation: boolean("late_cancellation").default(false), // <24h rule
  managementOverride: boolean("management_override").default(false),
  overrideReason: text("override_reason"),
});

// ---------------------------------------------------------------------------
// Access credentials — QR (primary, per Ethan's preference) with room for
// RFID fob as a secondary/legacy method.
// ---------------------------------------------------------------------------
export const accessCredentials = pgTable("access_credentials", {
  id: text("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => members.id),
  type: credentialTypeEnum("type").notNull().default("qr"),
  credentialToken: text("credential_token").notNull().unique(), // signed token encoded in the QR / RFID card no. / PIN hash
  issuedAt: timestamp("issued_at", { withTimezone: true }).notNull().default(sql`now()`),
  revokedAt: timestamp("revoked_at", { withTimezone: true }),
  status: credentialStatusEnum("status").notNull().default("active"),
});

// ---------------------------------------------------------------------------
// Access logs — every door read, for attendance cross-check + security audit
// ---------------------------------------------------------------------------
export const accessLogs = pgTable("access_logs", {
  id: text("id").primaryKey(),
  credentialId: text("credential_id").references(() => accessCredentials.id),
  memberId: text("member_id").references(() => members.id),
  timestamp: timestamp("timestamp", { withTimezone: true }).notNull().default(sql`now()`),
  direction: accessDirectionEnum("direction").notNull().default("entry"),
  result: accessResultEnum("result").notNull(),
  reason: text("reason"), // "active", "validity_expired", "member_not_active", "unknown_credential", "credential_revoked", "manual_override"
});

// ---------------------------------------------------------------------------
// Complaints — a simple log (per Ethan's call: no ticket/status workflow
// beyond open/resolved). memberId is nullable so front desk can log a
// complaint before it's tied to a specific member record, or on behalf of a
// prospect/visitor.
// ---------------------------------------------------------------------------
export const complaints = pgTable("complaints", {
  id: text("id").primaryKey(),
  memberId: text("member_id").references(() => members.id),
  memberNameFreeText: text("member_name_free_text"), // fallback display name if not linked to a member record
  subject: text("subject").notNull(),
  description: text("description").notNull(),
  status: complaintStatusEnum("status").notNull().default("open"),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().default(sql`now()`),
  loggedByAdminId: text("logged_by_admin_id").references(() => adminUsers.id),
  adminNotes: text("admin_notes"),
  resolvedAt: timestamp("resolved_at", { withTimezone: true }),
});

// ---------------------------------------------------------------------------
// Progress check-ins — first assessment + ~monthly follow-ups, shown as a
// compact comparison on the member's own portal page (per Ethan's "enough
// info but not too lengthy" brief). Recorded by a coach/admin, not
// self-reported by the member (painLevel is the one self-reported figure,
// captured by the coach during the check-in).
// ---------------------------------------------------------------------------
export const progressCheckins = pgTable("progress_checkins", {
  id: text("id").primaryKey(),
  memberId: text("member_id")
    .notNull()
    .references(() => members.id),
  type: checkinTypeEnum("type").notNull(),
  recordedAt: timestamp("recorded_at", { withTimezone: true }).notNull().default(sql`now()`),
  weightKg: real("weight_kg"),
  restingHeartRate: integer("resting_heart_rate"),
  mobilityNotes: text("mobility_notes"), // short free text, e.g. "Sit-to-stand: 12 reps/30s"
  strengthNotes: text("strength_notes"), // short free text, e.g. "Leg press: 40kg x10"
  painLevel: integer("pain_level"), // self-reported 0–10
  coachNotes: text("coach_notes"),
  recordedByAdminId: text("recorded_by_admin_id").references(() => adminUsers.id),
});

// ---------------------------------------------------------------------------
// Row types — inferred from the table definitions above, so they always
// stay in sync with the schema. Used by lib/dal.ts and anywhere else that
// needs a typed row rather than raw query results.
// ---------------------------------------------------------------------------
export type Member = typeof members.$inferSelect;
export type AdminUser = typeof adminUsers.$inferSelect;
export type MembershipPlan = typeof membershipPlans.$inferSelect;
export type CreditPack = typeof creditPacks.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type ClassSession = typeof classSessions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;
export type Complaint = typeof complaints.$inferSelect;
export type ProgressCheckin = typeof progressCheckins.$inferSelect;
