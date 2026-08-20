import NavBar from "@/components/NavBar";
import { db } from "@/db/client";
import { classSessions } from "@/db/schema";
import { gt } from "drizzle-orm";
import { formatClassDay, formatClassTime } from "@/lib/tz";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const now = new Date();
  const sessions = await db
    .select()
    .from(classSessions)
    .where(gt(classSessions.startTime, now))
    .orderBy(classSessions.startTime)
    .limit(250);

  const byDay = sessions.reduce<Record<string, typeof sessions>>((acc, s) => {
    const day = formatClassDay(new Date(s.startTime));
    (acc[day] ??= []).push(s);
    return acc;
  }, {});

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-4xl px-6 py-16">
        <h1 className="font-display text-4xl mb-2">Class Timetable</h1>
        <p className="text-charcoal/70 mb-10">
          We&apos;re open Monday, Wednesday, Friday &amp; Sunday. Every operation day starts
          with a Beginner class, then Spark &amp; Forge run side by side in split areas for
          the rest of the day. New here? Start with a Beginner class — after your
          assessment, we&apos;ll guide you into Spark or Forge at the right pace for you.
          This page is designed to be embedded on www.fitvibe.my as a public marketing
          surface — booking itself requires a member account (see Member Portal).
        </p>

        <div className="space-y-8">
          {Object.entries(byDay).map(([day, list]) => (
            <div key={day}>
              <h2 className="font-display text-lg text-evergreen mb-3">{day}</h2>
              <div className="grid sm:grid-cols-2 gap-3">
                {list.map((s) => (
                  <div key={s.id} className="rounded-xl bg-off-white border border-tan/60 p-4 flex justify-between items-center">
                    <div>
                      <p className="font-semibold">{s.title}</p>
                      <p className="text-sm text-mid-gray">
                        {formatClassTime(new Date(s.startTime))} · cap {s.capacity} · {s.instructor}
                      </p>
                    </div>
                    <a
                      href="/member"
                      className="text-sm font-semibold text-vitality-orange hover:text-warm-amber"
                    >
                      Book →
                    </a>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
