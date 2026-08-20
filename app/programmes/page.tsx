import NavBar from "@/components/NavBar";
import { db } from "@/db/client";
import { membershipPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function ProgrammesPage() {
  const plans = await db.select().from(membershipPlans).where(eq(membershipPlans.active, true));

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="font-display text-4xl mb-3">Programmes &amp; Pricing</h1>
        <p className="text-charcoal/70 max-w-2xl mb-12">
          Credit-based packs, same logic as Punchpass: buy a pack, book classes with your
          credits, top up when you run low. Spark is small-group mobility &amp; balance
          (max 4). Forge is small-group strength (max 8). 1-on-1 is private ForEva Method
          training with Ethan.
        </p>

        <div className="grid md:grid-cols-3 gap-6">
          {plans.map((p) => (
            <div
              key={p.id}
              className={`rounded-2xl border p-6 bg-off-white flex flex-col ${
                p.isFoundingMemberOffer ? "border-vitality-orange border-2" : "border-tan/60"
              }`}
            >
              {p.isFoundingMemberOffer && (
                <span className="text-xs font-bold uppercase tracking-wide text-vitality-orange mb-2">
                  Founding Member — 20 slots only
                </span>
              )}
              <h3 className="font-display text-xl mb-1">{p.name}</h3>
              <p className="text-sm text-charcoal/60 mb-4">{p.description}</p>
              <p className="text-3xl font-semibold mb-1">RM {p.priceRM}</p>
              <p className="text-sm text-mid-gray mb-6">
                {p.creditsIncluded} credits · valid {p.validityDays} days
              </p>
              <a
                href={`/member?join=${p.id}`}
                className="mt-auto rounded-full bg-vitality-orange text-off-white px-5 py-2.5 text-center font-semibold hover:bg-warm-amber transition-colors"
              >
                Get started
              </a>
            </div>
          ))}
        </div>

        <div className="mt-12 rounded-2xl bg-sage/15 border border-sage/40 p-6 text-sm text-charcoal/80">
          <strong className="font-display text-evergreen">How payment works today:</strong>{" "}
          Pay via DuitNow or bank transfer, then submit your reference number in the member
          portal. We&apos;ll confirm and load your credits within one business day. Online
          card checkout is on the roadmap for a future release.
        </div>
      </section>
    </div>
  );
}
