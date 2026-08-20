import Image from "next/image";
import Link from "next/link";
import NavBar from "@/components/NavBar";

export default function Home() {
  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-6 pt-20 pb-16 grid md:grid-cols-2 gap-12 items-center">
        <div>
          <p className="font-section-header text-sm text-evergreen tracking-widest uppercase mb-4">
            Subang Jaya · Specialist Movement Centre
          </p>
          <h1 className="text-5xl md:text-6xl leading-tight mb-6">
            Getting Old With A<br /> Stronger Muscle.
          </h1>
          <p className="text-lg text-charcoal/80 max-w-md mb-8">
            Fitvibe is not a gym. It&apos;s a specialist movement centre built around{" "}
            <span className="font-semibold text-evergreen">The ForEva Method</span> — for
            adults 50+ and working professionals managing chronic conditions who deserve
            to move freely, live fully, and age powerfully.
          </p>
          <div className="flex gap-4">
            <Link
              href="/programmes"
              className="rounded-full bg-vitality-orange text-charcoal px-6 py-3 font-semibold hover:bg-warm-amber transition-colors"
            >
              Founding Member offer
            </Link>
            <Link
              href="/the-foreva-method"
              className="rounded-full border border-charcoal/20 px-6 py-3 font-semibold hover:border-evergreen hover:text-evergreen transition-colors"
            >
              The ForEva Method
            </Link>
          </div>
        </div>
        <div className="relative rounded-3xl overflow-hidden border border-sage/40 h-80">
          <Image
            src="/images/home-hero.webp"
            alt="A coach steadying a member's arm as she moves through a stretch"
            fill
            sizes="(min-width: 768px) 50vw, 100vw"
            className="object-cover"
            priority
          />
        </div>
      </section>

      {/* Values */}
      <section className="bg-off-white py-16">
        <div className="mx-auto max-w-6xl px-6 grid md:grid-cols-3 gap-10">
          {[
            {
              title: "Dignity First",
              body: "Every client walks in as a person, not a patient.",
            },
            {
              title: "Evidence Over Trend",
              body: "Programming grounded in exercise science and ACE-certified expertise.",
            },
            {
              title: "Progress, Not Perfection",
              body: "We celebrate 1% better every day — small wins that compound into lasting change.",
            },
          ].map((v) => (
            <div key={v.title}>
              <h3 className="text-xl text-evergreen mb-2">{v.title}</h3>
              <p className="text-charcoal/70">{v.body}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Community strip */}
      <section className="mx-auto max-w-6xl px-6 py-16 grid sm:grid-cols-2 gap-6">
        <div className="relative rounded-2xl overflow-hidden border border-tan/60 aspect-[4/3]">
          <Image
            src="/images/home-community-1.webp"
            alt="A coach supporting a member through a guided squat, dumbbells set out around them"
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
        <div className="relative rounded-2xl overflow-hidden border border-tan/60 aspect-[4/3]">
          <Image
            src="/images/home-community-2.webp"
            alt="Two members smiling together during a partner-assisted stretch"
            fill
            sizes="(min-width: 640px) 50vw, 100vw"
            className="object-cover"
          />
        </div>
      </section>

      {/* Founding member CTA */}
      <section className="mx-auto max-w-6xl px-6 py-20 text-center">
        <h2 className="text-3xl mb-4">Become a Founding Member.</h2>
        <p className="text-charcoal/70 max-w-xl mx-auto mb-8">
          Lock in a rate below our standing Forever Pass price, unlimited across Spark &amp;
          Forge, for 6 or 12 months. This offer closes before our Soft Launch trial begins
          on 14 October 2026.
        </p>
        <Link
          href="/programmes"
          className="rounded-full bg-vitality-orange text-charcoal px-8 py-3 font-semibold hover:bg-warm-amber transition-colors"
        >
          See Founding Member pricing
        </Link>
      </section>

      <footer className="font-caption border-t border-tan/60 py-8 text-center text-sm text-mid-gray">
        Fitvibe — www.fitvibe.my — Subang Jaya, Malaysia
      </footer>
    </div>
  );
}
