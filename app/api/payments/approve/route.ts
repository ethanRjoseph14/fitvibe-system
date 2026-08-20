import { NextRequest, NextResponse } from "next/server";
import { db } from "@/db/client";
import { payments, creditPacks, membershipPlans } from "@/db/schema";
import { eq } from "drizzle-orm";
import { randomUUID } from "crypto";
import { addDays } from "date-fns";

/**
 * v1 manual payment approval flow (DuitNow / bank transfer), per the
 * confirmed plan: member submits a payment reference, admin reviews the
 * proof and approves here, which then tops up (or creates) a credit pack.
 *
 * Architected so a future online gateway (e.g. Billplz) can call this same
 * "approve" logic automatically from a webhook instead of a human click —
 * swap the manual admin trigger for a webhook handler, schema unchanged.
 */
export async function POST(req: NextRequest) {
  const { paymentId, membershipPlanId, approvedByAdminId } = await req.json();

  const [payment] = await db.select().from(payments).where(eq(payments.id, paymentId)).limit(1);
  if (!payment) {
    return NextResponse.json({ error: "Payment not found" }, { status: 404 });
  }
  if (payment.status === "approved") {
    return NextResponse.json({ error: "Already approved" }, { status: 409 });
  }

  const [plan] = await db
    .select()
    .from(membershipPlans)
    .where(eq(membershipPlans.id, membershipPlanId))
    .limit(1);
  if (!plan) {
    return NextResponse.json({ error: "Membership plan not found" }, { status: 404 });
  }

  await db
    .update(payments)
    .set({ status: "approved", approvedAt: new Date(), approvedByAdminId })
    .where(eq(payments.id, paymentId));

  const packId = randomUUID();
  await db.insert(creditPacks).values({
    id: packId,
    memberId: payment.memberId,
    membershipPlanId: plan.id,
    creditsTotal: plan.creditsIncluded,
    creditsRemaining: plan.creditsIncluded,
    expiresAt: addDays(new Date(), plan.validityDays),
    status: "active",
    paymentId: payment.id,
  });

  return NextResponse.json({ ok: true, creditPackId: packId });
}
