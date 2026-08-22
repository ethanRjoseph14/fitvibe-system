"use server";

import { randomUUID } from "crypto";
import { eq, and, isNull } from "drizzle-orm";
import { addDays } from "date-fns";
import { revalidatePath } from "next/cache";
import { db } from "@/db/client";
import {
  payments,
  creditPacks,
  membershipPlans,
  members,
  classSessions,
  complaints,
  progressCheckins,
  adminUsers,
  bookings,
  accessLogs,
  accessCredentials,
} from "@/db/schema";
import { hashPassword, generateTempPassword } from "@/lib/passwords";
import { requireAdmin } from "@/lib/dal";

// ---------------------------------------------------------------------------
// Payments — approve a pending payment, issuing the matching credit pack.
// ---------------------------------------------------------------------------
export async function approvePayment(formData: FormData) {
  const admin = await requireAdmin();
  const paymentId = formData.get("paymentId") as string;
  const membershipPlanId = formData.get("membershipPlanId") as string;

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  const [plan] = await db.select().from(membershipPlans).where(eq(membershipPlans.id, membershipPlanId)).limit(1);
  if (!payment || !plan) return;

  await db
    .update(payments)
    .set({ status: "approved", approvedAt: new Date(), approvedByAdminId: admin.id })
    .where(eq(payments.id, paymentId));

  await db.insert(creditPacks).values({
    id: randomUUID(),
    memberId: payment.memberId,
    membershipPlanId: plan.id,
    creditsTotal: plan.creditsIncluded,
    creditsRemaining: plan.creditsIncluded,
    expiresAt: addDays(new Date(), plan.validityDays),
    status: "active",
    paymentId: payment.id,
  });

  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Member accounts — set/reset a member's portal login password. Used from a
// client component via useActionState so the plaintext temp password is
// only ever held in that component's in-memory state, never put in a URL.
// ---------------------------------------------------------------------------
export type ResetPasswordState = {
  password: string | null;
  memberName: string | null;
  error: string | null;
};

export async function resetMemberPassword(
  _prevState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  await requireAdmin();
  const memberId = formData.get("memberId") as string;
  const memberName = (formData.get("memberName") as string) || "this member";
  if (!memberId) {
    return { password: null, memberName: null, error: "Missing member." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);
  await db.update(members).set({ passwordHash }).where(eq(members.id, memberId));
  revalidatePath("/admin");

  return { password: tempPassword, memberName, error: null };
}

// ---------------------------------------------------------------------------
// New member intake — for after an in-person assessment. Creates the member
// record and, if any assessment fields were filled in, logs it as their
// initial_assessment check-in in the same step (so it shows up immediately
// on the member's own portal page under "Your Progress").
// ---------------------------------------------------------------------------
export async function createMemberWithAssessment(formData: FormData) {
  const admin = await requireAdmin();

  const fullName = formData.get("fullName") as string;
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const phone = formData.get("phone") as string;
  if (!fullName || !email || !phone) return;

  const dob = (formData.get("dob") as string) || null;
  const gender = (formData.get("gender") as string) || null;
  const emergencyContactName = (formData.get("emergencyContactName") as string) || null;
  const emergencyContactPhone = (formData.get("emergencyContactPhone") as string) || null;
  const medicalNotes = (formData.get("medicalNotes") as string) || null;
  const source = (formData.get("source") as string) || "Front desk intake";
  const waiverSigned = formData.get("waiverSigned") === "on";
  const pdpaConsent = formData.get("pdpaConsent") === "on";

  const memberId = randomUUID();
  const now = new Date();

  await db.insert(members).values({
    id: memberId,
    fullName,
    email,
    phone,
    dob,
    gender,
    emergencyContactName,
    emergencyContactPhone,
    medicalNotes,
    chronicConditionFlags: "[]",
    waiverSignedAt: waiverSigned ? now : null,
    pdpaConsentAt: pdpaConsent ? now : null,
    status: "active",
    source,
  });

  const weightKgRaw = formData.get("weightKg") as string;
  const mobilityNotes = (formData.get("mobilityNotes") as string) || null;
  const strengthNotes = (formData.get("strengthNotes") as string) || null;
  const painLevelRaw = formData.get("painLevel") as string;
  const coachNotes = (formData.get("coachNotes") as string) || null;

  const hasAssessmentData =
    weightKgRaw || mobilityNotes || strengthNotes || painLevelRaw || coachNotes;

  if (hasAssessmentData) {
    await db.insert(progressCheckins).values({
      id: randomUUID(),
      memberId,
      type: "initial_assessment",
      weightKg: weightKgRaw ? Number(weightKgRaw) : null,
      mobilityNotes,
      strengthNotes,
      painLevel: painLevelRaw ? Number(painLevelRaw) : null,
      coachNotes,
      recordedByAdminId: admin.id,
    });
  }

  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Delete a member — permanently removes their record and everything tied
// only to them (bookings, credit packs, payments, access credentials/logs,
// progress check-ins). Meant for cleaning up test/dummy accounts, not
// routine offboarding of a real member — there's no undo. Use the member's
// `status` field (frozen/suspended/expired) for a real ex-member instead of
// deleting their history. Complaints are kept but detached from the member
// record (memberId cleared, name preserved as free text) since a complaint
// can still matter after the member record is gone.
// ---------------------------------------------------------------------------
export async function deleteMember(formData: FormData) {
  await requireAdmin();
  const memberId = formData.get("memberId") as string;
  if (!memberId) return;

  await db.transaction(async (tx) => {
    const [member] = await tx.select().from(members).where(eq(members.id, memberId)).limit(1);
    if (!member) return;

    await tx.delete(bookings).where(eq(bookings.memberId, memberId));
    await tx.delete(progressCheckins).where(eq(progressCheckins.memberId, memberId));
    await tx.delete(accessLogs).where(eq(accessLogs.memberId, memberId));
    await tx.delete(accessCredentials).where(eq(accessCredentials.memberId, memberId));
    await tx.delete(creditPacks).where(eq(creditPacks.memberId, memberId));
    await tx.delete(payments).where(eq(payments.memberId, memberId));

    // Detach complaints rather than deleting them — fill in the free-text
    // name first for any that don't already have one, then clear memberId.
    await tx
      .update(complaints)
      .set({ memberId: null, memberNameFreeText: member.fullName })
      .where(and(eq(complaints.memberId, memberId), isNull(complaints.memberNameFreeText)));
    await tx
      .update(complaints)
      .set({ memberId: null })
      .where(eq(complaints.memberId, memberId));

    await tx.delete(members).where(eq(members.id, memberId));
  });

  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Classes — create and cancel class sessions. (Coaches claiming/booking
// into these is the phased coach-portal work, not part of this stage.)
// ---------------------------------------------------------------------------
export async function createClassSession(formData: FormData) {
  await requireAdmin();
  const title = formData.get("title") as string;
  const membershipPlanId = (formData.get("membershipPlanId") as string) || null;
  const startTimeRaw = formData.get("startTime") as string; // datetime-local value
  const durationMinutes = Number(formData.get("durationMinutes") || 75);
  const capacity = Number(formData.get("capacity") || 8);
  const instructor = (formData.get("instructor") as string) || null;

  if (!title || !startTimeRaw) return;

  const startTime = new Date(startTimeRaw);
  const endTime = new Date(startTime.getTime() + durationMinutes * 60 * 1000);

  await db.insert(classSessions).values({
    id: randomUUID(),
    title,
    membershipPlanId: membershipPlanId || null,
    startTime,
    endTime,
    capacity,
    instructor,
    status: "scheduled",
  });

  revalidatePath("/admin");
}

export async function cancelClassSession(formData: FormData) {
  await requireAdmin();
  const classSessionId = formData.get("classSessionId") as string;
  if (!classSessionId) return;
  await db.update(classSessions).set({ status: "cancelled" }).where(eq(classSessions.id, classSessionId));
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Complaints — a simple log (submit + resolve), per Ethan's call.
// ---------------------------------------------------------------------------
export async function logComplaint(formData: FormData) {
  const admin = await requireAdmin();
  const memberId = (formData.get("memberId") as string) || null;
  const memberNameFreeText = (formData.get("memberNameFreeText") as string) || null;
  const subject = formData.get("subject") as string;
  const description = formData.get("description") as string;
  if (!subject || !description) return;

  await db.insert(complaints).values({
    id: randomUUID(),
    memberId: memberId || null,
    memberNameFreeText,
    subject,
    description,
    status: "open",
    loggedByAdminId: admin.id,
  });

  revalidatePath("/admin");
}

export async function resolveComplaint(formData: FormData) {
  await requireAdmin();
  const complaintId = formData.get("complaintId") as string;
  if (!complaintId) return;
  await db
    .update(complaints)
    .set({ status: "resolved", resolvedAt: new Date() })
    .where(eq(complaints.id, complaintId));
  revalidatePath("/admin");
}

// ---------------------------------------------------------------------------
// Team accounts — owner-only. A manager can do everything else in the admin
// panel; only the owner can create accounts or change roles (checked here
// server-side, not just hidden in the UI — a client could otherwise submit
// straight to the action).
// ---------------------------------------------------------------------------
export type CreateTeamAccountState = {
  password: string | null;
  accountName: string | null;
  error: string | null;
};

export async function createTeamAccount(
  _prevState: CreateTeamAccountState,
  formData: FormData
): Promise<CreateTeamAccountState> {
  const admin = await requireAdmin();
  if (admin.role !== "owner") {
    return { password: null, accountName: null, error: "Only the owner can create team accounts." };
  }

  const name = formData.get("name") as string;
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const role = formData.get("role") as string;
  if (!name || !email || !["admin", "manager", "staff"].includes(role)) {
    return { password: null, accountName: null, error: "Missing or invalid fields." };
  }

  const tempPassword = generateTempPassword();
  const passwordHash = await hashPassword(tempPassword);

  await db.insert(adminUsers).values({
    id: randomUUID(),
    name,
    email,
    passwordHash,
    role: role as "admin" | "manager" | "staff",
  });

  revalidatePath("/admin");
  return { password: tempPassword, accountName: name, error: null };
}

export async function updateAdminRole(formData: FormData) {
  const admin = await requireAdmin();
  if (admin.role !== "owner") return;

  const targetAdminId = formData.get("adminId") as string;
  const role = formData.get("role") as string;
  if (!targetAdminId || !["admin", "manager", "staff"].includes(role)) return;
  // Don't let the owner change their own role from this form — avoids an
  // accidental self-lockout. Role changes for the owner account itself
  // (or granting a second owner) stay a deliberate Supabase SQL action.
  if (targetAdminId === admin.id) return;

  await db
    .update(adminUsers)
    .set({ role: role as "admin" | "manager" | "staff" })
    .where(eq(adminUsers.id, targetAdminId));

  revalidatePath("/admin");
}
