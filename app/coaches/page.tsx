import Link from "next/link";
import NavBar from "@/components/NavBar";
import { coaches } from "@/lib/coaches";

export default function CoachesPage() {
  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="max-w-2xl mx-auto text-center mb-14">
          <h1 className="font-display text-4xl mb-3">Meet the Coaches</h1>
          <p className="text-charcoal/70">
            Every class at Fitvibe is led by a real coach, not a class-in-a-box program.
            Here&apos;s who you&apos;ll train with.
          </p>
        </div>

        <div className="grid sm:grid-cols-2 gap-6">
          {coaches.map((coach) => (
            <Link
              key={coach.slug}
              href={`/coaches/${coach.slug}`}
              className="rounded-2xl bg-off-white border border-tan/60 p-6 flex gap-5 hover:border-evergreen transition-colors"
            >
              <div className="shrink-0 w-20 h-20 rounded-full bg-sage/20 border border-sage/40 flex items-center justify-center text-xs text-evergreen text-center px-1">
                [ photo ]
              </div>
              <div>
                <h2 className="font-display text-xl mb-0.5">{coach.name}</h2>
                <p className="text-sm font-semibold text-vitality-orange mb-2">{coach.title}</p>
                <p className="text-sm text-charcoal/70 line-clamp-2">
                  {coach.active ? coach.bio : "Joins the teaching roster soon."}
                </p>
              </div>
            </Link>
          ))}
        </div>

        <p className="text-sm text-mid-gray mt-10 text-center">
          Coach photos are placeholders for now — see Brand Guidelines §08, Photography
          Asset Library, once real photos are ready.
        </p>
      </section>
    </div>
  );
}
