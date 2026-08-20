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
  reason: text("reason"), // "active", "expired", "suspended", "zero_credit", "unknown_credential", "manual_override"
});
