import Link from "next/link";
import { notFound } from "next/navigation";
import NavBar from "@/components/NavBar";
import { coaches, getCoachBySlug } from "@/lib/coaches";

export function generateStaticParams() {
  return coaches.map((c) => ({ slug: c.slug }));
}

export default async function CoachDetailPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const coach = getCoachBySlug(slug);
  if (!coach) notFound();

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <Link href="/coaches" className="text-sm text-evergreen font-semibold">
          ← All coaches
        </Link>

        <div className="mt-6 grid sm:grid-cols-[220px_1fr] gap-8 items-start">
          <div className="font-caption w-full aspect-square rounded-2xl bg-sage/20 border border-sage/40 flex items-center justify-center text-center text-evergreen text-sm p-4">
            [ Photo of {coach.name} goes here — see Brand Guidelines §08, Photography Asset
            Library ]
          </div>

          <div>
            {coach.isFounder && (
              <span className="font-section-header text-xs uppercase tracking-wide text-vitality-orange">
                Founder
              </span>
            )}
            <h1 className="text-4xl mt-1 mb-1">{coach.name}</h1>
            <p className="font-section-header text-lg text-evergreen mb-4">{coach.title}</p>

            {!coach.active && (
              <p className="font-caption inline-block text-xs uppercase tracking-wide bg-tan/25 text-charcoal border border-tan/60 rounded-full px-3 py-1 mb-4">
                Joining the teaching roster soon
              </p>
            )}

            {coach.credentials && coach.credentials.length > 0 && (
              <ul className="flex flex-wrap gap-2 mb-5">
                {coach.credentials.map((c) => (
                  <li
                    key={c}
                    className="font-caption text-xs bg-evergreen/10 text-evergreen border border-evergreen/30 rounded-full px-3 py-1"
                  >
                    {c}
                  </li>
                ))}
              </ul>
            )}

            <p className="text-charcoal/80 leading-relaxed">{coach.bio}</p>

            <div className="flex gap-3 mt-8">
              <Link
                href="/book"
                className="rounded-full bg-vitality-orange text-charcoal px-6 py-3 font-semibold hover:bg-warm-amber transition-colors"
              >
                Book a class
              </Link>
              <Link
                href="/the-foreva-method"
                className="rounded-full border border-charcoal/20 px-6 py-3 font-semibold hover:border-evergreen hover:text-evergreen transition-colors"
              >
                The ForEva Method
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
