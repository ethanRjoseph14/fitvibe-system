import { db } from "@/db/client";
import { accessCredentials, accessLogs, creditPacks, members } from "@/db/schema";
import { eq, and, gt } from "drizzle-orm";
import { randomUUID } from "crypto";

/**
 * Door / token access decision engine.
 *
 * UPDATED 22 Aug 2026 — per Ethan's decision, the physical token/card system
 * is now a SEPARATE, unlinked vendor system: front-desk staff activate a
 * member's token duration by hand (in whatever software comes with the
 * chosen door hardware) at the same time they activate credits here, rather
 * than the door hardware calling this app live. This function and the
 * /api/access/verify endpoint are kept as this app's OWN record of
 * entry/token validity (so the member portal and admin panel can show
 * "token valid until X" and keep an access history) — they are no longer
 * assumed to be the live gatekeeper a physical reader calls. If a future
 * vendor's hardware CAN call out to an HTTPS endpoint, this is still the
 * right integration point; just don't assume it's wired up yet.
 *
 * Gym entry vs. class access — per Ethan's rule (22 Aug 2026):
 * - Entry to the gym itself only requires the member to be within an active,
 *   unexpired validity window (i.e. they haven't lapsed without renewing).
 *   It does NOT require any credits remaining.
 * - Booking/attending a CLASS additionally requires credits remaining — that
 *   check belongs in the booking flow, not here.
 * This mirrors the real intent: running out of credits should push someone
 * to renew, not lock them out of the building entirely.
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
    | "validity_expired"
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

  // Entry requires the member to be inside an active, unexpired validity
  // window — i.e. at least one credit pack that hasn't expired yet.
  // Deliberately NOT checking creditsRemaining here: a member who has used
  // up all their session credits can still walk in and use the gym: they
  // just can't book/attend a class until they top up. That credit check
  // belongs in the class-booking flow, not door/token entry.
  const now = new Date();
  const [pack] = await db
    .select()
    .from(creditPacks)
    .where(
      and(
        eq(creditPacks.memberId, member.id),
        eq(creditPacks.status, "active"),
        gt(creditPacks.expiresAt, now)
      )
    )
    .limit(1);

  if (!pack) {
    await logAttempt(credential.id, credential.memberId, direction, "denied", "validity_expired");
    return { granted: false, reason: "validity_expired" };
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
