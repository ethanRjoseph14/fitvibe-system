import NavBar from "@/components/NavBar";
import BookingCalendar from "@/components/BookingCalendar";
import { db } from "@/db/client";
import { classSessions } from "@/db/schema";
import { gt } from "drizzle-orm";

export const dynamic = "force-dynamic";

export default async function BookPage() {
  const now = new Date();
  const sessions = await db
    .select()
    .from(classSessions)
    .where(gt(classSessions.startTime, now))
    .orderBy(classSessions.startTime)
    .limit(600);

  const calendarSessions = sessions.map((s) => ({
    id: s.id,
    title: s.title,
    startTime: new Date(s.startTime).toISOString(),
    endTime: new Date(s.endTime).toISOString(),
    capacity: s.capacity,
    instructor: s.instructor,
  }));

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-6xl px-6 py-16">
        <h1 className="font-display text-4xl mb-2">Class Timetable</h1>
        <p className="text-charcoal/70 mb-10 max-w-2xl">
          We&apos;re open Monday, Wednesday, Friday &amp; Sunday. Every operation day starts
          with a Beginner class, then Spark &amp; Forge run side by side in split areas for
          the rest of the day. Pick a date on the calendar to see what&apos;s on.
        </p>

        <BookingCalendar sessions={calendarSessions} />
      </section>
    </div>
  );
}
