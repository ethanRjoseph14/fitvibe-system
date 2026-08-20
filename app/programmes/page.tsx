import NavBar from "@/components/NavBar";
import { db } from "@/db/client";
import { membershipPlans } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

const UNLIMITED_THRESHOLD = 9000;

type Plan = Awaited<ReturnType<typeof getPlans>>[number];

async function getPlans() {
  return db.select().from(membershipPlans).where(eq(membershipPlans.active, true));
}

function creditsLabel(p: Plan) {
  if (p.creditsIncluded >= UNLIMITED_THRESHOLD) return "Unlimited classes";
  return `${p.creditsIncluded} credit${p.creditsIncluded === 1 ? "" : "s"}`;
}

function PlanCard({ p }: { p: Plan }) {
  return (
    <div
      className={`rounded-2xl border p-6 bg-off-white flex flex-col text-center ${
        p.isFoundingMemberOffer ? "border-vitality-orange border-2" : "border-tan/60"
      }`}
    >
      {p.isFoundingMemberOffer && (
        <span className="font-section-header text-xs uppercase tracking-wide text-vitality-orange mb-2">
          Founding Member — limited-time pricing
        </span>
      )}
      <h3 className="text-xl mb-1">{p.name}</h3>
      <p className="font-caption text-sm text-charcoal/60 mb-4">{p.description}</p>
      <p className="text-3xl font-semibold mb-1">RM {p.priceRM}</p>
      <p className="font-caption text-sm text-mid-gray mb-6">
        {creditsLabel(p)} · valid {p.validityDays} days
      </p>
      <a
        href={`/member?join=${p.id}`}
        className="mt-auto rounded-full bg-vitality-orange text-charcoal px-5 py-2.5 text-center font-semibold hover:bg-warm-amber transition-colors"
      >
        Get started
      </a>
    </div>
  );
}

export default async function ProgrammesPage() {
  const plans = await getPlans();

  const sparkPackages = plans.filter((p) => p.name.startsWith("Spark —") && !p.name.includes("Walk-In"));
  const forgePackages = plans.filter((p) => p.name.startsWith("Forge —") && !p.name.includes("Walk-In"));
  const walkIns = plans.filter((p) => p.name.includes("Walk-In"));
  const sjgc = plans.filter((p) => p.name.startsWith("SJGC"));
  const passes = plans.filter((p) => p.name === "Forever Pass" || p.name.startsWith("Founding Member"));

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl mx-auto text-center mb-12">
          <h1 className="text-4xl mb-3">Programmes &amp; Pricing</h1>
          <p className="text-charcoal/70">
            Credit-based packs, same logic as Punchpass: buy a pack, book classes with your
            credits, top up when you run low. Spark is small-group mobility &amp; balance
            (max 5 pax). Forge is small-group strength (max 9 pax, provisional — the true
            cap will be confirmed once we&apos;re open and running real classes). Every
            package includes access to our Beginner class — the assessment-guided starting
            point for anyone new to Fitvibe, no separate purchase needed.
          </p>
        </div>

        {sparkPackages.length > 0 && (
          <div className="mb-14">
            <h2 className="text-2xl text-evergreen mb-1 text-center">Spark Credit Packages</h2>
            <p className="font-caption text-sm text-charcoal/60 mb-6 text-center">Small-group mobility &amp; balance, max 5 pax.</p>
            <div className="grid md:grid-cols-3 gap-6">
              {sparkPackages.map((p) => (
                <PlanCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}

        {forgePackages.length > 0 && (
          <div className="mb-14">
            <h2 className="text-2xl text-evergreen mb-1 text-center">Forge Credit Packages</h2>
            <p className="font-caption text-sm text-charcoal/60 mb-6 text-center">Small-group strength, max 9 pax (provisional).</p>
            <div className="grid md:grid-cols-3 gap-6">
              {forgePackages.map((p) => (
                <PlanCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}

        {walkIns.length > 0 && (
          <div className="mb-14">
            <h2 className="text-2xl text-evergreen mb-1 text-center">Sunday Walk-In</h2>
            <p className="font-caption text-sm text-charcoal/60 mb-6 text-center">
              No commitment, pay per class. Sundays only — every other day of the week is
              credit-pack or pass only.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {walkIns.map((p) => (
                <PlanCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}

        {passes.length > 0 && (
          <div className="mb-14">
            <h2 className="text-2xl text-evergreen mb-1 text-center">Unlimited Passes</h2>
            <p className="font-caption text-sm text-charcoal/60 mb-6 text-center">
              Unlimited access across both Spark &amp; Forge. To keep classes fair, pass
              holders are capped at 60% of any class&apos;s seats — the rest are always
              held for paying walk-in/credit members.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {passes.map((p) => (
                <PlanCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}

        {sjgc.length > 0 && (
          <div className="mb-14">
            <h2 className="text-2xl text-evergreen mb-1 text-center">SJGC Members</h2>
            <p className="font-caption text-sm text-charcoal/60 mb-6 text-center">
              For our Strong Beyond 50 community at SJGC. Already have a Forge — Starter
              pack? Your SJGC partner rate is already built into that price — no separate
              sign-up needed.
            </p>
            <div className="grid md:grid-cols-3 gap-6">
              {sjgc.map((p) => (
                <PlanCard key={p.id} p={p} />
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-2 gap-6 mt-4">
          <div className="rounded-2xl bg-warm-amber/15 border border-warm-amber/40 p-6 text-sm text-charcoal/80">
            <strong className="font-section-header text-vitality-orange block mb-1">
              Soft Launch Trial Discount
            </strong>
            10% off every Sunday walk-in rate and every Spark/Forge credit package, for our
            Soft Launch trial window from 14 October to 11 November 2026 — before Hard
            Launch. Discount applies automatically at checkout during that period.
          </div>
          <div className="rounded-2xl bg-sage/15 border border-sage/40 p-6 text-sm text-charcoal/80">
            <strong className="font-section-header text-evergreen block mb-1">Refer a Friend</strong>
            When someone you refer signs up, you get 1 free Forge credit. Simple as that —
            ask us how at the front desk or in the member portal.
          </div>
        </div>

        <div className="mt-6 rounded-2xl bg-sage/15 border border-sage/40 p-6 text-sm text-charcoal/80">
          <strong className="font-section-header text-evergreen">How payment works today:</strong>{" "}
          Pay via DuitNow or bank transfer, then submit your reference number in the member
          portal. We&apos;ll confirm and load your credits within one business day. Online
          card/FPX checkout via Billplz is on the roadmap for a future release.
        </div>
      </section>
    </div>
  );
}
