import { and, eq, gt, lt, asc } from "drizzle-orm";
import { db } from "@/db/client";
import { classSessions } from "@/db/schema";
import { formatClassDay, formatTimeRange, isoDateMY } from "@/lib/tz";

export const dynamic = "force-dynamic";

/**
 * A simple, no-login schedule view for coaches to check on their phone —
 * intentionally NOT linked from the site nav (same pattern as /admin), and
 * shows only class times/instructor, nothing member-related. Interim
 * solution per Ethan's call (22 Aug 2026) ahead of the full coach portal
 * (coach logins, self-booking into slots, attendance) — that's still
 * phased for after 25 Sep. When that's built, this page can either be
 * retired or kept as a plain read-only view alongside it.
 */
export default async function CoachSchedulePage() {
  const now = new Date();
  const twoWeeksOut = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  const upcoming = await db
    .select()
    .from(classSessions)
    .where(
      and(
        eq(classSessions.status, "scheduled"),
        gt(classSessions.startTime, now),
        lt(classSessions.startTime, twoWeeksOut)
      )
    )
    .orderBy(asc(classSessions.startTime));

  const byDay = new Map<string, typeof upcoming>();
  for (const c of upcoming) {
    const key = isoDateMY(new Date(c.startTime));
    if (!byDay.has(key)) byDay.set(key, []);
    byDay.get(key)!.push(c);
  }

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <section className="mx-auto max-w-2xl px-6 py-12">
        <h1 className="text-3xl mb-1">Coach Schedule</h1>
        <p className="text-charcoal/70 mb-8">Next 2 weeks of classes.</p>

        {byDay.size === 0 && (
          <p className="text-charcoal/60">No classes scheduled in the next 2 weeks.</p>
        )}

        <div className="space-y-6">
          {Array.from(byDay.entries()).map(([day, classes]) => (
            <div key={day}>
              <h2 className="text-lg text-evergreen mb-2">{formatClassDay(new Date(classes[0].startTime))}</h2>
              <div className="rounded-2xl bg-off-white border border-tan/60 divide-y divide-tan/30">
                {classes.map((c) => (
                  <div key={c.id} className="p-4 flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="font-medium">{c.title}</p>
                      <p className="text-sm text-mid-gray">
                        {formatTimeRange(new Date(c.startTime), new Date(c.endTime))}
                      </p>
                    </div>
                    <div className="text-sm text-right">
                      <p>{c.instructor || "Unassigned"}</p>
                      <p className="text-mid-gray">Capacity {c.capacity}</p>
                    </div>
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
