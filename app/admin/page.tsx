import NavBar from "@/components/NavBar";
import { db } from "@/db/client";
import { members, payments, accessLogs, creditPacks, membershipPlans } from "@/db/schema";
import { eq, desc } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { formatDateTime } from "@/lib/tz";

export const dynamic = "force-dynamic";

async function approvePayment(formData: FormData) {
  "use server";
  const paymentId = formData.get("paymentId") as string;
  const membershipPlanId = formData.get("membershipPlanId") as string;

  const { db } = await import("@/db/client");
  const { payments: paymentsT, creditPacks: creditPacksT, membershipPlans: plansT } = await import("@/db/schema");
  const { eq } = await import("drizzle-orm");
  const { randomUUID } = await import("crypto");
  const { addDays } = await import("date-fns");

  const [payment] = await db.select().from(paymentsT).where(eq(paymentsT.id, paymentId)).limit(1);
  const [plan] = await db.select().from(plansT).where(eq(plansT.id, membershipPlanId)).limit(1);
  if (!payment || !plan) return;

  await db
    .update(paymentsT)
    .set({ status: "approved", approvedAt: new Date() })
    .where(eq(paymentsT.id, paymentId));

  await db.insert(creditPacksT).values({
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

export default async function AdminPage() {
  const allMembers = await db.select().from(members);
  const pendingPayments = await db.select().from(payments).where(eq(payments.status, "pending"));
  const plans = await db.select().from(membershipPlans);
  const recentAccess = await db
    .select()
    .from(accessLogs)
    .orderBy(desc(accessLogs.timestamp))
    .limit(10);
  const packs = await db.select().from(creditPacks);

  const creditsByMember = packs.reduce<Record<string, number>>((acc, p) => {
    if (p.status === "active") acc[p.memberId] = (acc[p.memberId] ?? 0) + p.creditsRemaining;
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-6xl px-6 py-12">
        <h1 className="font-display text-3xl mb-8">Admin Dashboard</h1>

        {/* Pending payments */}
        <div className="mb-10">
          <h2 className="font-display text-xl text-evergreen mb-3">
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
          <h2 className="font-display text-xl text-evergreen mb-3">Members ({allMembers.length})</h2>
          <div className="overflow-x-auto rounded-xl border border-tan/60 bg-off-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left border-b border-tan/60 text-mid-gray">
                  <th className="p-3">Name</th>
                  <th className="p-3">Status</th>
                  <th className="p-3">Credits</th>
                  <th className="p-3">Source</th>
                </tr>
              </thead>
              <tbody>
                {allMembers.map((m) => (
                  <tr key={m.id} className="border-b border-tan/30 last:border-0">
                    <td className="p-3 font-medium">{m.fullName}</td>
                    <td className="p-3 capitalize">
                      <span
                        className={
                          m.status === "active"
                            ? "text-evergreen font-semibold"
                            : "text-mid-gray"
                        }
                      >
                        {m.status}
                      </span>
                    </td>
                    <td className="p-3">{creditsByMember[m.id] ?? 0}</td>
                    <td className="p-3 text-mid-gray">{m.source}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Access log */}
        <div>
          <h2 className="font-display text-xl text-evergreen mb-3">Recent Door Access Events</h2>
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
