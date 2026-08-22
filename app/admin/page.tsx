import NavBar from "@/components/NavBar";
import ResetPasswordButton from "@/components/ResetPasswordButton";
import DeleteMemberButton from "@/components/DeleteMemberButton";
import CreateTeamAccountForm from "@/components/CreateTeamAccountForm";
import { requireAdmin } from "@/lib/dal";
import { db } from "@/db/client";
import {
  members,
  payments,
  accessLogs,
  creditPacks,
  membershipPlans,
  classSessions,
  bookings,
  complaints,
  adminUsers,
} from "@/db/schema";
import { eq, desc, gt, and, inArray } from "drizzle-orm";
import { formatDateTime, formatShortDate } from "@/lib/tz";
import { adminLogout } from "@/lib/authActions";
import {
  approvePayment,
  createMemberWithAssessment,
  createClassSession,
  cancelClassSession,
  logComplaint,
  resolveComplaint,
  updateAdminRole,
} from "@/lib/adminActions";

export const dynamic = "force-dynamic";

async function getAdminData() {
  const now = new Date();
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const [
    allMembers,
    pendingPayments,
    plans,
    recentAccess,
    packs,
    approvedPayments,
    upcomingClasses,
    allComplaints,
  ] = await Promise.all([
    db.select().from(members),
    db.select().from(payments).where(eq(payments.status, "pending")),
    db.select().from(membershipPlans),
    db.select().from(accessLogs).orderBy(desc(accessLogs.timestamp)).limit(10),
    db.select().from(creditPacks),
    db.select().from(payments).where(eq(payments.status, "approved")),
    db
      .select()
      .from(classSessions)
      .where(and(eq(classSessions.status, "scheduled"), gt(classSessions.startTime, now)))
      .orderBy(classSessions.startTime)
      .limit(60),
    db.select().from(complaints).orderBy(desc(complaints.submittedAt)),
  ]);

  const teamAccounts = await db.select().from(adminUsers).orderBy(adminUsers.name);

  // Per-member computed access: credits remaining + real validity window,
  // derived live from credit packs rather than the admin-set `status` field
  // (nothing auto-flips `status` on expiry yet — see lib/access.ts).
  const creditsByMember: Record<string, number> = {};
  const validUntilByMember: Record<string, Date> = {};
  for (const p of packs) {
    if (p.status !== "active" || p.expiresAt <= now) continue;
    creditsByMember[p.memberId] = (creditsByMember[p.memberId] ?? 0) + p.creditsRemaining;
    if (!validUntilByMember[p.memberId] || p.expiresAt > validUntilByMember[p.memberId]) {
      validUntilByMember[p.memberId] = p.expiresAt;
    }
  }

  const activeAccessCount = Object.keys(validUntilByMember).length;
  const expiringSoonCount = Object.values(validUntilByMember).filter(
    (d) => d <= sevenDaysFromNow
  ).length;
  const expiredCount = allMembers.length - activeAccessCount;

  const totalRevenue = approvedPayments.reduce((sum, p) => sum + p.amountRM, 0);
  const revenueThisMonth = approvedPayments
    .filter((p) => p.approvedAt && p.approvedAt >= startOfMonth)
    .reduce((sum, p) => sum + p.amountRM, 0);
  const creditsSoldThisMonth = packs
    .filter((p) => p.purchasedAt >= startOfMonth)
    .reduce((sum, p) => sum + p.creditsTotal, 0);

  const upcomingClassIds = upcomingClasses.map((c) => c.id);
  const upcomingBookings = upcomingClassIds.length
    ? await db
        .select()
        .from(bookings)
        .where(
          and(
            inArray(bookings.classSessionId, upcomingClassIds),
            inArray(bookings.status, ["booked", "waitlisted"])
          )
        )
    : [];
  const bookedCountByClass: Record<string, number> = {};
  for (const b of upcomingBookings) {
    if (b.status !== "booked") continue;
    bookedCountByClass[b.classSessionId] = (bookedCountByClass[b.classSessionId] ?? 0) + 1;
  }

  return {
    allMembers,
    pendingPayments,
    plans,
    recentAccess,
    creditsByMember,
    validUntilByMember,
    activeAccessCount,
    expiringSoonCount,
    expiredCount,
    totalRevenue,
    revenueThisMonth,
    creditsSoldThisMonth,
    upcomingClasses,
    bookedCountByClass,
    allComplaints,
    teamAccounts,
  };
}

function SnapshotCard({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-xl bg-off-white border border-tan/60 p-4">
      <p className="text-xs text-mid-gray uppercase tracking-wide mb-1">{label}</p>
      <p className="text-2xl font-semibold">{value}</p>
      {sub && <p className="text-xs text-mid-gray mt-0.5">{sub}</p>}
    </div>
  );
}

export default async function AdminPage() {
  const admin = await requireAdmin();
  const data = await getAdminData();
  const {
    allMembers,
    pendingPayments,
    plans,
    recentAccess,
    creditsByMember,
    validUntilByMember,
    activeAccessCount,
    expiringSoonCount,
    expiredCount,
    totalRevenue,
    revenueThisMonth,
    creditsSoldThisMonth,
    upcomingClasses,
    bookedCountByClass,
    allComplaints,
    teamAccounts,
  } = data;

  const isOwner = admin.role === "owner";
  const openComplaints = allComplaints.filter((c) => c.status === "open");
  const resolvedComplaints = allComplaints.filter((c) => c.status === "resolved");

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl mb-1">Admin Dashboard</h1>
            <p className="text-charcoal/60 text-sm">
              Signed in as {admin.name} <span className="capitalize">({admin.role})</span>
            </p>
          </div>
          <form action={adminLogout}>
            <button className="text-sm font-semibold text-charcoal/60 hover:text-vitality-orange transition-colors">
              Log out
            </button>
          </form>
        </div>

        {/* Business snapshot — owner only */}
        {isOwner && (
          <div className="mb-10">
            <h2 className="text-xl text-evergreen mb-3">Business Snapshot</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
              <SnapshotCard label="Revenue (all-time)" value={`RM ${totalRevenue.toLocaleString()}`} />
              <SnapshotCard label="Revenue (this month)" value={`RM ${revenueThisMonth.toLocaleString()}`} />
              <SnapshotCard label="Credits sold (this month)" value={`${creditsSoldThisMonth}`} />
              <SnapshotCard label="Members with active access" value={`${activeAccessCount}`} sub={`of ${allMembers.length} total`} />
              <SnapshotCard label="Expiring within 7 days" value={`${expiringSoonCount}`} />
              <SnapshotCard label="Access expired" value={`${expiredCount}`} />
            </div>
          </div>
        )}

        {/* Team accounts — owner only */}
        {isOwner && (
          <div className="mb-10">
            <h2 className="text-xl text-evergreen mb-3">Team Accounts</h2>
            <div className="overflow-x-auto rounded-xl border border-tan/60 bg-off-white mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-tan/60 text-mid-gray">
                    <th className="p-3">Name</th>
                    <th className="p-3">Email</th>
                    <th className="p-3">Role</th>
                  </tr>
                </thead>
                <tbody>
                  {teamAccounts.map((t) => (
                    <tr key={t.id} className="border-b border-tan/30 last:border-0">
                      <td className="p-3 font-medium">{t.name}</td>
                      <td className="p-3 text-mid-gray">{t.email}</td>
                      <td className="p-3">
                        {t.role === "owner" ? (
                          <span className="capitalize font-semibold">{t.role}</span>
                        ) : (
                          <form action={updateAdminRole} className="flex items-center gap-2">
                            <input type="hidden" name="adminId" value={t.id} />
                            <select
                              name="role"
                              defaultValue={t.role}
                              className="rounded-full border border-tan px-2 py-1 text-xs bg-warm-beige"
                            >
                              <option value="manager">Manager</option>
                              <option value="admin">Admin</option>
                              <option value="staff">Staff</option>
                            </select>
                            <button className="text-xs font-semibold text-evergreen hover:underline">Save</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-mid-gray mb-2">
              A manager can do everything here except manage team accounts or see the Business Snapshot above.
            </p>
            <CreateTeamAccountForm />
          </div>
        )}

        {/* Pending payments */}
        <div className="mb-10">
          <h2 className="text-xl text-evergreen mb-3">
            Pending Payments ({pendingPayments.length})
          </h2>
          {pendingPayments.length === 0 && (
            <p className="text-charcoal/60 text-sm">Nothing waiting on approval.</p>
          )}
          <div className="space-y-3">
            {pendingPayments.map((p) => (
              <form
                action={approvePayment}
                key={p.id}
                className="rounded-xl bg-off-white border border-tan/60 p-4 flex flex-wrap items-center gap-3 justify-between"
              >
                <input type="hidden" name="paymentId" value={p.id} />
                <div className="text-sm">
                  <p className="font-semibold">RM {p.amountRM} · {p.method}</p>
                  <p className="text-mid-gray">{p.referenceNote} — submitted {formatDateTime(new Date(p.submittedAt))}</p>
                </div>
                <div className="flex gap-2 items-center">
                  <select name="membershipPlanId" className="rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige">
                    {plans.map((pl) => (
                      <option key={pl.id} value={pl.id}>{pl.name}</option>
                    ))}
                  </select>
                  <button className="rounded-full bg-evergreen text-off-white px-4 py-1.5 text-sm font-semibold hover:opacity-90">
                    Approve &amp; issue credits
                  </button>
                </div>
              </form>
            ))}
          </div>
        </div>

        {/* Members */}
        <div className="mb-10">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xl text-evergreen">Members ({allMembers.length})</h2>
          </div>

          <details className="rounded-xl bg-off-white border border-tan/60 p-4 mb-4">
            <summary className="cursor-pointer font-semibold text-evergreen">
              + Add new member (after assessment)
            </summary>
            <form action={createMemberWithAssessment} className="mt-4 grid sm:grid-cols-2 gap-3">
              <p className="sm:col-span-2 text-xs text-mid-gray -mt-1">
                Member details
              </p>
              <label className="text-xs text-mid-gray">
                Full name
                <input name="fullName" required className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray">
                Email
                <input name="email" type="email" required className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray">
                Phone
                <input name="phone" required className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray">
                Date of birth
                <input name="dob" type="date" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray">
                Gender
                <input name="gender" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray">
                How they found us
                <input name="source" placeholder="Walk-in, referral, etc." className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray">
                Emergency contact name
                <input name="emergencyContactName" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray">
                Emergency contact phone
                <input name="emergencyContactPhone" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray sm:col-span-2">
                Medical notes / chronic conditions
                <textarea name="medicalNotes" rows={2} className="mt-1 w-full rounded-2xl border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="flex items-center gap-2 text-xs text-mid-gray">
                <input type="checkbox" name="waiverSigned" />
                Waiver signed in person
              </label>
              <label className="flex items-center gap-2 text-xs text-mid-gray">
                <input type="checkbox" name="pdpaConsent" />
                PDPA consent given
              </label>

              <p className="sm:col-span-2 text-xs text-mid-gray mt-2 -mb-1 border-t border-tan/40 pt-3">
                Initial assessment (optional — leave blank to add later)
              </p>
              <label className="text-xs text-mid-gray">
                Weight (kg)
                <input name="weightKg" type="number" step="0.1" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray">
                Pain level (0–10)
                <input name="painLevel" type="number" min="0" max="10" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray">
                Mobility notes
                <input name="mobilityNotes" placeholder="Sit-to-stand: 9 reps/30s" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray">
                Strength notes
                <input name="strengthNotes" placeholder="Leg press: 25kg x8" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>
              <label className="text-xs text-mid-gray sm:col-span-2">
                Coach notes
                <textarea name="coachNotes" rows={2} className="mt-1 w-full rounded-2xl border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
              </label>

              <button className="rounded-full bg-vitality-orange text-charcoal px-5 py-2 text-sm font-semibold hover:bg-warm-amber transition-colors sm:col-span-2 sm:w-fit">
                Add member
              </button>
            </form>
          </details>
          <div className="overflow-x-auto rounded-xl border border-tan/60 bg-off-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-tan/60 text-mid-gray">
                  <th className="p-3">Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Access</th>
                  <th className="p-3">Credits</th>
                  <th className="p-3">Source</th>
                  <th className="p-3">Login</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {allMembers.map((m) => {
                  const validUntil = validUntilByMember[m.id];
                  return (
                    <tr key={m.id} className="border-b border-tan/30 last:border-0">
                      <td className="p-3 font-medium">{m.fullName}</td>
                      <td className="p-3 capitalize">
                        <span className={m.status === "active" ? "text-evergreen font-semibold" : "text-mid-gray"}>
                          {m.status}
                        </span>
                      </td>
                      <td className="p-3">
                        {validUntil ? (
                          <span className="text-evergreen">until {formatShortDate(validUntil)}</span>
                        ) : (
                          <span className="text-vitality-orange font-semibold">expired</span>
                        )}
                      </td>
                      <td className="p-3">{creditsByMember[m.id] ?? 0}</td>
                      <td className="p-3 text-mid-gray">{m.source}</td>
                      <td className="p-3">
                        <ResetPasswordButton memberId={m.id} memberName={m.fullName} />
                      </td>
                      <td className="p-3">
                        <DeleteMemberButton memberId={m.id} memberName={m.fullName} />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>

        {/* Classes */}
        <div className="mb-10">
          <h2 className="text-xl text-evergreen mb-1">Upcoming Classes</h2>
          <p className="text-xs text-mid-gray mb-3">Showing the next 60 scheduled classes.</p>
          <form
            action={createClassSession}
            className="rounded-xl bg-off-white border border-tan/60 p-4 mb-4 grid sm:grid-cols-2 lg:grid-cols-6 gap-2 items-end"
          >
            <label className="text-xs text-mid-gray lg:col-span-2">
              Title
              <input
                name="title"
                required
                placeholder="Spark — Mobility & Balance"
                className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige"
              />
            </label>
            <label className="text-xs text-mid-gray lg:col-span-2">
              Starts
              <input
                type="datetime-local"
                name="startTime"
                required
                className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige"
              />
            </label>
            <label className="text-xs text-mid-gray">
              Duration (min)
              <input
                type="number"
                name="durationMinutes"
                defaultValue={75}
                className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige"
              />
            </label>
            <label className="text-xs text-mid-gray">
              Capacity
              <input
                type="number"
                name="capacity"
                defaultValue={8}
                className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige"
              />
            </label>
            <label className="text-xs text-mid-gray lg:col-span-2">
              Plan
              <select name="membershipPlanId" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige">
                <option value="">— none —</option>
                {plans.map((pl) => (
                  <option key={pl.id} value={pl.id}>{pl.name}</option>
                ))}
              </select>
            </label>
            <label className="text-xs text-mid-gray lg:col-span-2">
              Instructor
              <input name="instructor" placeholder="Ethan" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
            </label>
            <button className="rounded-full bg-vitality-orange text-charcoal px-4 py-2 text-sm font-semibold hover:bg-warm-amber transition-colors lg:col-span-2">
              Add class
            </button>
          </form>

          <div className="overflow-x-auto rounded-xl border border-tan/60 bg-off-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-tan/60 text-mid-gray">
                  <th className="p-3">Class</th>
                  <th className="p-3">When</th>
                  <th className="p-3">Fill</th>
                  <th className="p-3"></th>
                </tr>
              </thead>
              <tbody>
                {upcomingClasses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="p-3 text-mid-gray">No upcoming classes scheduled.</td>
                  </tr>
                )}
                {upcomingClasses.map((c) => (
                  <tr key={c.id} className="border-b border-tan/30 last:border-0">
                    <td className="p-3 font-medium">{c.title}</td>
                    <td className="p-3 text-mid-gray">{formatDateTime(new Date(c.startTime))}</td>
                    <td className="p-3">{bookedCountByClass[c.id] ?? 0} / {c.capacity}</td>
                    <td className="p-3">
                      <form action={cancelClassSession}>
                        <input type="hidden" name="classSessionId" value={c.id} />
                        <button className="text-xs font-semibold text-vitality-orange hover:underline">Cancel</button>
                      </form>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Complaints */}
        <div className="mb-10">
          <h2 className="text-xl text-evergreen mb-3">Complaints</h2>
          <form
            action={logComplaint}
            className="rounded-xl bg-off-white border border-tan/60 p-4 mb-4 grid sm:grid-cols-2 gap-2"
          >
            <label className="text-xs text-mid-gray">
              Member name (if known)
              <input name="memberNameFreeText" className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
            </label>
            <label className="text-xs text-mid-gray">
              Subject
              <input name="subject" required className="mt-1 w-full rounded-full border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
            </label>
            <label className="text-xs text-mid-gray sm:col-span-2">
              Description
              <textarea name="description" required rows={2} className="mt-1 w-full rounded-2xl border border-tan px-3 py-1.5 text-sm bg-warm-beige" />
            </label>
            <button className="rounded-full bg-charcoal text-off-white px-4 py-2 text-sm font-semibold hover:opacity-90 transition-opacity sm:col-span-2 sm:w-fit">
              Log complaint
            </button>
          </form>

          <h3 className="text-sm font-semibold text-mid-gray mb-2">Open ({openComplaints.length})</h3>
          <div className="space-y-2 mb-4">
            {openComplaints.length === 0 && <p className="text-charcoal/60 text-sm">Nothing open.</p>}
            {openComplaints.map((c) => (
              <form
                key={c.id}
                action={resolveComplaint}
                className="rounded-xl bg-off-white border border-tan/60 p-4 flex flex-wrap items-center justify-between gap-3"
              >
                <input type="hidden" name="complaintId" value={c.id} />
                <div className="text-sm">
                  <p className="font-semibold">{c.subject} {c.memberNameFreeText && <span className="text-mid-gray font-normal">— {c.memberNameFreeText}</span>}</p>
                  <p className="text-mid-gray">{c.description}</p>
                  <p className="text-xs text-mid-gray mt-1">Logged {formatDateTime(new Date(c.submittedAt))}</p>
                </div>
                <button className="rounded-full bg-evergreen text-off-white px-4 py-1.5 text-sm font-semibold hover:opacity-90 shrink-0">
                  Mark resolved
                </button>
              </form>
            ))}
          </div>

          {resolvedComplaints.length > 0 && (
            <details className="text-sm">
              <summary className="cursor-pointer text-mid-gray font-semibold">
                Resolved ({resolvedComplaints.length})
              </summary>
              <div className="space-y-2 mt-2">
                {resolvedComplaints.map((c) => (
                  <div key={c.id} className="rounded-xl bg-off-white border border-tan/40 p-4 text-sm opacity-70">
                    <p className="font-semibold">{c.subject} {c.memberNameFreeText && <span className="text-mid-gray font-normal">— {c.memberNameFreeText}</span>}</p>
                    <p className="text-mid-gray">{c.description}</p>
                  </div>
                ))}
              </div>
            </details>
          )}
        </div>

        {/* Access log */}
        <div>
          <h2 className="text-xl text-evergreen mb-3">Recent Access Events</h2>
          <div className="space-y-1 text-sm">
            {recentAccess.map((log) => (
              <div key={log.id} className="flex justify-between border-b border-tan/30 py-2">
                <span>
                  {log.direction} —{" "}
                  <span className={log.result === "granted" ? "text-evergreen" : "text-vitality-orange"}>
                    {log.result}
                  </span>{" "}
                  ({log.reason})
                </span>
                <span className="text-mid-gray">{formatDateTime(new Date(log.timestamp))}</span>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
