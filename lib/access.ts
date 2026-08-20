import { db } from "@/db/client";
import { accessCredentials, accessLogs, creditPacks, members } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * Door access decision engine.
 *
 * This is the single function a QR scanner / RFID reader / keypad controller
 * calls (via POST /api/access/verify) to decide whether to unlock the door.
 * It is the software half of the "Door access ↔ membership/credit
 * integration" deliverable in the Systems Tracker.
 *
 * ⚠️ HARDWARE FAIL-SAFE — NOT ENFORCEABLE IN SOFTWARE:
 * The discussion brief requires doors to fail UNLOCKED on power/system
 * outage or fire alarm trigger. That is an electrical/hardware wiring
 * requirement (the maglock/strike must be wired "fail-safe", not
 * "fail-secure") — no application code can guarantee it. Flag this
 * explicitly to whoever installs the door hardware; it must be verified
 * during the fire-code inspection, not assumed from this codebase.
 */

export type AccessResult = {
  granted: boolean;
  reason:
    | "active"
    | "unknown_credential"
    | "credential_revoked"
    | "member_not_active"
    | "zero_credit"
    | "manual_override";
  memberName?: string;
};

export async function verifyAccess(
  credentialToken: string,
  direction: "entry" | "exit" = "entry"
): Promise<AccessResult> {
  const [credential] = await db
    .select()
    .from(accessCredentials)
    .where(eq(accessCredentials.credentialToken, credentialToken))
    .limit(1);

  if (!credential) {
    await logAttempt(null, null, direction, "denied", "unknown_credential");
    return { granted: false, reason: "unknown_credential" };
  }

  if (credential.status !== "active") {
    await logAttempt(credential.id, credential.memberId, direction, "denied", "credential_revoked");
    return { granted: false, reason: "credential_revoked" };
  }

  const [member] = await db
    .select()
    .from(members)
    .where(eq(members.id, credential.memberId))
    .limit(1);

  if (!member || member.status !== "active") {
    await logAttempt(credential.id, credential.memberId, direction, "denied", "member_not_active");
    return { granted: false, reason: "member_not_active" };
  }

  // Exit is always granted for an active member — never trap someone inside.
  if (direction === "exit") {
    await logAttempt(credential.id, credential.memberId, direction, "granted", "active");
    return { granted: true, reason: "active", memberName: member.fullName };
  }

  // Entry requires at least one active, unexpired pack with remaining credit.
  const now = new Date();
  const [pack] = await db
    .select()
    .from(creditPacks)
    .where(
      and(
        eq(creditPacks.memberId, member.id),
        eq(creditPacks.status, "active"),
        gt(creditPacks.creditsRemaining, 0),
        gt(creditPacks.expiresAt, now)
      )
    )
    .limit(1);

  if (!pack) {
    await logAttempt(credential.id, credential.memberId, direction, "denied", "zero_credit");
    return { granted: false, reason: "zero_credit" };
  }

  await logAttempt(credential.id, credential.memberId, direction, "granted", "active");
  return { granted: true, reason: "active", memberName: member.fullName };
}

async function logAttempt(
  credentialId: string | null,
  memberId: string | null,
  direction: "entry" | "exit",
  result: "granted" | "denied",
  reason: string
) {
  await db.insert(accessLogs).values({
    id: randomUUID(),
    credentialId,
    memberId,
    direction,
    result,
    reason,
  });
}

/**
 * Auto-revoke sweep: call on a schedule (e.g. nightly cron) to keep door
 * access in sync with membership status even if nobody visits the admin
 * dashboard. Revokes credentials for members who are no longer active.
 */
export async function autoRevokeExpiredAccess() {
  const inactiveMembers = await db
    .select()
    .from(members)
    .where(and(eq(members.status, "expired")));

  let revoked = 0;
  for (const m of inactiveMembers) {
    const creds = await db
      .select()
      .from(accessCredentials)
      .where(and(eq(accessCredentials.memberId, m.id), eq(accessCredentials.status, "active")));
    for (const c of creds) {
      await db
        .update(accessCredentials)
        .set({ status: "revoked", revokedAt: new Date() })
        .where(eq(accessCredentials.id, c.id));
      revoked++;
    }
  }
  return revoked;
}
