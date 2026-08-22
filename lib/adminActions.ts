"use server";

import { randomUUID } from "crypto";
import { eq } from "drizzle-orm";
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
