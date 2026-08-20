import Link from "next/link";
import NavBar from "@/components/NavBar";
import Wordmark from "@/components/Wordmark";
import { coaches } from "@/lib/coaches";

export default function AboutPage() {
  const founder = coaches.find((c) => c.isFounder);

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />

      {/* Intro */}
      <section className="mx-auto max-w-3xl px-6 pt-16 pb-10 text-center">
        <p className="text-sm font-semibold tracking-widest text-evergreen uppercase mb-4">
          Subang Jaya · Specialist Movement Centre
        </p>
        <h1 className="text-5xl mb-6">
          <Wordmark />
        </h1>
        <p className="text-lg text-charcoal/80">
          Fitvibe is not a gym. It&apos;s a specialist movement centre built for adults 50+
          and working professionals managing chronic conditions — people who deserve
          training designed around their body, not adapted from someone else&apos;s.
        </p>
      </section>

      {/* Vision & Mission */}
      <section className="bg-off-white py-14">
        <div className="mx-auto max-w-5xl px-6 grid md:grid-cols-2 gap-10">
          <div>
            <h2 className="font-display text-2xl text-evergreen mb-3">Our Vision</h2>
            <p className="text-charcoal/80">
              A Subang Jaya where growing older never means giving up strength,
              independence, or dignity — where every adult 50+ has a place built
              specifically for their body, not squeezed into someone else&apos;s programme.
            </p>
          </div>
          <div>
            <h2 className="font-display text-2xl text-evergreen mb-3">Our Mission</h2>
            <p className="text-charcoal/80">
              We give adults 50+ and people managing chronic conditions a specialist,
              assessment-led alternative to the generic gym — trained by real coaches,
              grounded in exercise science, one member at a time.
            </p>
          </div>
        </div>
      </section>

      {/* Story */}
      <section className="mx-auto max-w-3xl px-6 py-16">
        <h2 className="font-display text-3xl mb-6 text-center">Our Story</h2>
        <div className="grid sm:grid-cols-[1fr_260px] gap-8 items-start">
          <div className="text-charcoal/80 space-y-4">
            <p>
              Fitvibe started with a simple, personal question: why does &ldquo;getting
              older&rdquo; have to mean giving something up?
            </p>
            <p>
              The ForEva Method carries a personal tribute in its name — ForEva, in memory
              of Eva.
            </p>
            <p className="text-sm text-mid-gray italic border-l-2 border-tan/60 pl-4">
              [Eva note for Ethan: that&apos;s the one detail I know for certain from our
              conversations. The rest of this story — what led you to build Fitvibe, the
              moment it clicked, why Subang Jaya, why this community — is yours to tell.
              Replace this section with it whenever you&apos;re ready; I&apos;ve kept the
              layout ready to receive it, photos included.]
            </p>
          </div>
          <div className="w-full aspect-[4/5] rounded-2xl bg-sage/20 border border-sage/40 flex items-center justify-center text-center text-evergreen text-sm p-4">
            [ Photo — Ethan or the space, see Brand Guidelines §08, Photography Asset
            Library ]
          </div>
        </div>
      </section>

      {/* Founder card */}
      {founder && (
        <section className="bg-off-white py-14">
          <div className="mx-auto max-w-3xl px-6">
            <h2 className="font-display text-2xl text-evergreen mb-6 text-center">
              Meet the Founder
            </h2>
            <Link
              href={`/coaches/${founder.slug}`}
              className="flex flex-col sm:flex-row items-center sm:items-start gap-6 rounded-2xl border border-tan/60 p-6 hover:border-evergreen transition-colors"
            >
              <div className="shrink-0 w-28 h-28 rounded-full bg-sage/20 border border-sage/40 flex items-center justify-center text-xs text-evergreen text-center px-2">
                [ photo ]
              </div>
              <div className="text-center sm:text-left">
                <h3 className="font-display text-xl mb-0.5">{founder.name}</h3>
                <p className="text-sm font-semibold text-vitality-orange mb-2">
                  {founder.title}
                </p>
                <p className="text-sm text-charcoal/70">
                  {founder.bio.split("[Eva note")[0].trim()}
                </p>
                <p className="text-sm text-evergreen font-semibold mt-3">
                  View full profile →
                </p>
              </div>
            </Link>
          </div>
        </section>
      )}

      {/* CTA links */}
      <section className="mx-auto max-w-3xl px-6 py-16 text-center">
        <h2 className="font-display text-2xl mb-6">Go deeper</h2>
        <div className="flex flex-wrap justify-center gap-4">
          <Link
            href="/the-foreva-method"
            className="rounded-full bg-vitality-orange text-charcoal px-6 py-3 font-semibold hover:bg-warm-amber transition-colors"
          >
            The ForEva Method
          </Link>
          <Link
            href="/coaches"
            className="rounded-full border border-charcoal/20 px-6 py-3 font-semibold hover:border-evergreen hover:text-evergreen transition-colors"
          >
            Meet the Coaches
          </Link>
          <Link
            href="/programmes"
            className="rounded-full border border-charcoal/20 px-6 py-3 font-semibold hover:border-evergreen hover:text-evergreen transition-colors"
          >
            Programmes &amp; Pricing
          </Link>
        </div>
      </section>
    </div>
  );
}
