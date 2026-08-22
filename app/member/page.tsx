import { eq, and, gt, lte, desc, asc, inArray } from "drizzle-orm";
import NavBar from "@/components/NavBar";
import { requireMember } from "@/lib/dal";
import { db } from "@/db/client";
import {
  creditPacks,
  bookings,
  classSessions,
  payments,
  progressCheckins,
} from "@/db/schema";
import { formatShortDate, formatDateTime } from "@/lib/tz";
import { memberLogout } from "@/lib/authActions";

export const dynamic = "force-dynamic";

async function getMemberDashboard(memberId: string) {
  const now = new Date();

  const packs = await db.select().from(creditPacks).where(eq(creditPacks.memberId, memberId));
  const validPacks = packs.filter((p) => p.status === "active" && p.expiresAt > now);
  const totalCredits = validPacks.reduce((sum, p) => sum + p.creditsRemaining, 0);
  const accessValidUntil = validPacks.length
    ? validPacks.reduce((latest, p) => (p.expiresAt > latest ? p.expiresAt : latest), validPacks[0].expiresAt)
    : null;

  const upcoming = await db
    .select({ booking: bookings, session: classSessions })
    .from(bookings)
    .innerJoin(classSessions, eq(bookings.classSessionId, classSessions.id))
    .where(
      and(
        eq(bookings.memberId, memberId),
        gt(classSessions.startTime, now),
        inArray(bookings.status, ["booked", "waitlisted"])
      )
    )
    .orderBy(asc(classSessions.startTime))
    .limit(8);

  const history = await db
    .select({ booking: bookings, session: classSessions })
    .from(bookings)
    .innerJoin(classSessions, eq(bookings.classSessionId, classSessions.id))
    .where(and(eq(bookings.memberId, memberId), lte(classSessions.startTime, now)))
    .orderBy(desc(classSessions.startTime))
    .limit(8);

  const purchaseHistory = await db
    .select()
    .from(payments)
    .where(eq(payments.memberId, memberId))
    .orderBy(desc(payments.submittedAt))
    .limit(10);

  const checkins = await db
    .select()
    .from(progressCheckins)
    .where(eq(progressCheckins.memberId, memberId))
    .orderBy(desc(progressCheckins.recordedAt));

  const initialAssessment = checkins.find((c) => c.type === "initial_assessment");
  const monthlyCheckins = checkins.filter((c) => c.type === "monthly_checkin").slice(0, 3);

  return {
    totalCredits,
    accessValidUntil,
    upcoming,
    history,
    purchaseHistory,
    initialAssessment,
    monthlyCheckins,
  };
}

function StatCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: string;
  sub?: string;
  tone?: "default" | "warning";
}) {
  return (
    <div className="rounded-2xl bg-off-white border border-tan/60 p-6">
      <h2 className="text-lg text-evergreen mb-1">{label}</h2>
      <p className={`text-3xl font-semibold mb-1 ${tone === "warning" ? "text-vitality-orange" : ""}`}>
        {value}
      </p>
      {sub && <p className="text-sm text-mid-gray">{sub}</p>}
    </div>
  );
}

export default async function MemberPortalPage() {
  const member = await requireMember();
  const dash = await getMemberDashboard(member.id);
  const {
    totalCredits,
    accessValidUntil,
    upcoming,
    history,
    purchaseHistory,
    initialAssessment,
    monthlyCheckins,
  } = dash;

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-5xl px-6 py-12">
        <div className="flex flex-wrap items-baseline justify-between gap-3 mb-8">
          <div>
            <h1 className="text-3xl mb-1">Welcome back, {member.fullName.split(" ")[0]}</h1>
            <p className="text-charcoal/60 capitalize">Status: {member.status}</p>
          </div>
          <form action={memberLogout}>
            <button className="text-sm font-semibold text-charcoal/60 hover:text-vitality-orange transition-colors">
              Log out
            </button>
          </form>
        </div>

        {/* Stat cards */}
        <div className="grid sm:grid-cols-2 gap-6 mb-6">
          <StatCard label="Credit Balance" value={`${totalCredits} credits`} sub="Needed to book a class" />
          {accessValidUntil ? (
            <StatCard
              label="Gym Access"
              value="Active"
              sub={`Valid until ${formatShortDate(new Date(accessValidUntil))}`}
            />
          ) : (
            <StatCard
              label="Gym Access"
              value="Expired"
              sub="Renew at the front desk to restore gym access"
              tone="warning"
            />
          )}
        </div>

        {totalCredits === 0 && accessValidUntil && (
          <p className="mb-6 rounded-xl bg-vitality-orange/10 border border-vitality-orange/40 text-sm px-4 py-3">
            You&apos;re out of class credits — you can still come in and use the gym, but you&apos;ll
            need to top up before booking another class.
          </p>
        )}

        {/* Upcoming classes */}
        <div className="rounded-2xl bg-off-white border border-tan/60 p-6 mb-6">
          <h2 className="text-lg text-evergreen mb-3">Upcoming Classes</h2>
          {upcoming.length === 0 && <p className="text-charcoal/60 text-sm">No upcoming bookings yet.</p>}
          <div className="space-y-2">
            {upcoming.map((u) => (
              <div key={u.booking.id} className="flex justify-between text-sm border-b border-tan/40 pb-2 last:border-0 last:pb-0">
                <span>{u.session.title}</span>
                <span className="text-mid-gray">{formatDateTime(new Date(u.session.startTime))}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6 mb-6">
          {/* Class history */}
          <div className="rounded-2xl bg-off-white border border-tan/60 p-6">
            <h2 className="text-lg text-evergreen mb-3">Class History</h2>
            {history.length === 0 && <p className="text-charcoal/60 text-sm">No past classes yet.</p>}
            <div className="space-y-2">
              {history.map((h) => (
                <div key={h.booking.id} className="flex justify-between text-sm border-b border-tan/40 pb-2 last:border-0 last:pb-0">
                  <span>
                    {h.session.title}
                    {h.booking.status === "no_show" && (
                      <span className="text-mid-gray"> — no-show</span>
                    )}
                    {h.booking.status === "cancelled" && (
                      <span className="text-mid-gray"> — cancelled</span>
                    )}
                  </span>
                  <span className="text-mid-gray">{formatShortDate(new Date(h.session.startTime))}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Purchase history */}
          <div className="rounded-2xl bg-off-white border border-tan/60 p-6">
            <h2 className="text-lg text-evergreen mb-3">Purchase History</h2>
            {purchaseHistory.length === 0 && (
              <p className="text-charcoal/60 text-sm">No purchases on record yet.</p>
            )}
            <div className="space-y-2">
              {purchaseHistory.map((p) => (
                <div key={p.id} className="flex justify-between text-sm border-b border-tan/40 pb-2 last:border-0 last:pb-0">
                  <span>
                    RM {p.amountRM}
                    <span className="text-mid-gray capitalize"> · {p.method.replace("_", " ")}</span>
                  </span>
                  <span className={p.status === "approved" ? "text-evergreen" : "text-mid-gray capitalize"}>
                    {p.status === "approved" ? formatShortDate(new Date(p.submittedAt)) : p.status}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Progress */}
        {(initialAssessment || monthlyCheckins.length > 0) && (
          <div className="rounded-2xl bg-off-white border border-tan/60 p-6">
            <h2 className="text-lg text-evergreen mb-1">Your Progress</h2>
            <p className="text-sm text-mid-gray mb-4">
              A quick snapshot from your assessment and check-ins with your coach.
            </p>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left border-b border-tan/60 text-mid-gray">
                    <th className="py-2 pr-4">Date</th>
                    <th className="py-2 pr-4">Weight</th>
                    <th className="py-2 pr-4">Mobility</th>
                    <th className="py-2 pr-4">Strength</th>
                    <th className="py-2">Pain (0–10)</th>
                  </tr>
                </thead>
                <tbody>
                  {initialAssessment && (
                    <tr className="border-b border-tan/30">
                      <td className="py-2 pr-4 font-medium">
                        {formatShortDate(new Date(initialAssessment.recordedAt))}
                        <span className="block text-xs text-mid-gray font-normal">Initial assessment</span>
                      </td>
                      <td className="py-2 pr-4">{initialAssessment.weightKg ? `${initialAssessment.weightKg} kg` : "—"}</td>
                      <td className="py-2 pr-4">{initialAssessment.mobilityNotes || "—"}</td>
                      <td className="py-2 pr-4">{initialAssessment.strengthNotes || "—"}</td>
                      <td className="py-2">{initialAssessment.painLevel ?? "—"}</td>
                    </tr>
                  )}
                  {monthlyCheckins.map((c) => (
                    <tr key={c.id} className="border-b border-tan/30 last:border-0">
                      <td className="py-2 pr-4 font-medium">{formatShortDate(new Date(c.recordedAt))}</td>
                      <td className="py-2 pr-4">{c.weightKg ? `${c.weightKg} kg` : "—"}</td>
                      <td className="py-2 pr-4">{c.mobilityNotes || "—"}</td>
                      <td className="py-2 pr-4">{c.strengthNotes || "—"}</td>
                      <td className="py-2">{c.painLevel ?? "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
