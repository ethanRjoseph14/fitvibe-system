"use client";

import { useMemo, useState } from "react";
import { formatTimeRange, isoDateMY, getMYDateParts, formatMonthYear } from "@/lib/tz";

export type CalendarSession = {
  id: string;
  title: string;
  startTime: string; // ISO string
  endTime: string; // ISO string
  capacity: number;
  instructor: string | null;
};

type Kind = "beginner" | "spark" | "forge" | "trial" | "other";

function kindOf(title: string): Kind {
  if (title.startsWith("Beginner")) return "beginner";
  if (title.startsWith("Spark")) return "spark";
  if (title.startsWith("Forge")) return "forge";
  if (title.startsWith("Trial")) return "trial";
  return "other";
}

const KIND_STYLES: Record<Kind, { label: string; dot: string; badge: string }> = {
  beginner: {
    label: "Beginner",
    dot: "bg-warm-amber",
    badge: "bg-warm-amber/15 text-warm-amber border-warm-amber/40",
  },
  spark: {
    label: "Spark",
    dot: "bg-sage",
    badge: "bg-sage/15 text-evergreen border-sage/40",
  },
  forge: {
    label: "Forge",
    dot: "bg-vitality-orange",
    badge: "bg-vitality-orange/10 text-vitality-orange border-vitality-orange/40",
  },
  trial: {
    label: "Trial",
    dot: "bg-evergreen",
    badge: "bg-evergreen/10 text-evergreen border-evergreen/50",
  },
  other: {
    label: "Class",
    dot: "bg-mid-gray",
    badge: "bg-mid-gray/10 text-mid-gray border-mid-gray/30",
  },
};

const WEEKDAY_LABELS = ["S", "M", "T", "W", "T", "F", "S"];

function formatDateKeyLong(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString("en-MY", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default function BookingCalendar({ sessions }: { sessions: CalendarSession[] }) {
  const byDate = useMemo(() => {
    const map = new Map<string, CalendarSession[]>();
    for (const s of sessions) {
      const key = isoDateMY(new Date(s.startTime));
      const arr = map.get(key) ?? [];
      arr.push(s);
      map.set(key, arr);
    }
    for (const arr of map.values()) {
      arr.sort((a, b) => a.startTime.localeCompare(b.startTime));
    }
    return map;
  }, [sessions]);

  const sortedKeys = useMemo(() => Array.from(byDate.keys()).sort(), [byDate]);
  const firstKey = sortedKeys[0] ?? null;

  const initial = firstKey
    ? { year: Number(firstKey.slice(0, 4)), month: Number(firstKey.slice(5, 7)) }
    : getMYDateParts(new Date());

  const [viewYear, setViewYear] = useState(initial.year);
  const [viewMonth, setViewMonth] = useState(initial.month); // 1-12
  const [selectedKey, setSelectedKey] = useState<string | null>(firstKey);

  function shiftMonth(delta: number) {
    const d = new Date(Date.UTC(viewYear, viewMonth - 1 + delta, 1));
    setViewYear(d.getUTCFullYear());
    setViewMonth(d.getUTCMonth() + 1);
  }

  const firstOfMonth = new Date(Date.UTC(viewYear, viewMonth - 1, 1));
  const startWeekday = firstOfMonth.getUTCDay(); // 0 = Sunday
  const daysInMonth = new Date(Date.UTC(viewYear, viewMonth, 0)).getUTCDate();

  const cells: Array<{ key: string; day: number } | null> = [];
  for (let i = 0; i < startWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ key: `${viewYear}-${String(viewMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`, day: d });
  }

  const todayKey = isoDateMY(new Date());
  const monthLabel = formatMonthYear(new Date(Date.UTC(viewYear, viewMonth - 1, 15)));
  const selectedSessions = selectedKey ? byDate.get(selectedKey) ?? [] : [];

  return (
    <div className="grid md:grid-cols-[minmax(0,420px)_1fr] gap-8 items-start">
      {/* Calendar */}
      <div className="rounded-2xl bg-off-white border border-tan/60 p-5">
        <div className="flex items-center justify-between mb-4">
          <button
            type="button"
            onClick={() => shiftMonth(-1)}
            aria-label="Previous month"
            className="w-10 h-10 rounded-full border border-tan/60 hover:border-evergreen hover:text-evergreen flex items-center justify-center text-lg"
          >
            ‹
          </button>
          <p className="font-display text-xl">{monthLabel}</p>
          <button
            type="button"
            onClick={() => shiftMonth(1)}
            aria-label="Next month"
            className="w-10 h-10 rounded-full border border-tan/60 hover:border-evergreen hover:text-evergreen flex items-center justify-center text-lg"
          >
            ›
          </button>
        </div>

        <div className="grid grid-cols-7 gap-1 mb-1 text-center text-xs font-semibold text-mid-gray">
          {WEEKDAY_LABELS.map((w, i) => (
            <div key={i}>{w}</div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {cells.map((cell, i) => {
            if (!cell) return <div key={`empty-${i}`} />;
            const daySessions = byDate.get(cell.key) ?? [];
            const kinds = Array.from(new Set(daySessions.map((s) => kindOf(s.title))));
            const isSelected = cell.key === selectedKey;
            const isToday = cell.key === todayKey;
            const hasClasses = daySessions.length > 0;

            return (
              <button
                type="button"
                key={cell.key}
                onClick={() => setSelectedKey(cell.key)}
                className={[
                  "min-h-14 rounded-xl flex flex-col items-center justify-center gap-1 text-sm transition-colors",
                  isSelected
                    ? "bg-vitality-orange text-off-white font-semibold"
                    : hasClasses
                    ? "bg-warm-beige hover:bg-tan/40 text-charcoal"
                    : "text-mid-gray/60",
                  isToday && !isSelected ? "ring-2 ring-evergreen" : "",
                ].join(" ")}
              >
                <span>{cell.day}</span>
                {hasClasses && (
                  <span className="flex gap-0.5">
                    {kinds.slice(0, 4).map((k) => (
                      <span
                        key={k}
                        className={`w-1.5 h-1.5 rounded-full ${isSelected ? "bg-off-white" : KIND_STYLES[k].dot}`}
                      />
                    ))}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-x-4 gap-y-2 mt-5 pt-4 border-t border-tan/40 text-xs text-charcoal/70">
          {(Object.keys(KIND_STYLES) as Kind[])
            .filter((k) => k !== "other")
            .map((k) => (
              <span key={k} className="flex items-center gap-1.5">
                <span className={`w-2 h-2 rounded-full ${KIND_STYLES[k].dot}`} />
                {KIND_STYLES[k].label}
              </span>
            ))}
        </div>
        <p className="text-xs text-mid-gray mt-3">
          We&apos;re open Monday, Wednesday, Friday &amp; Sunday. Days without a dot are closed.
        </p>
      </div>

      {/* Selected day panel */}
      <div>
        {selectedKey ? (
          <>
            <h2 className="font-display text-2xl mb-1">{formatDateKeyLong(selectedKey)}</h2>
            {selectedSessions.length === 0 ? (
              <div className="rounded-xl bg-off-white border border-tan/60 p-6 mt-4 text-charcoal/70">
                <p className="font-semibold mb-1">We&apos;re closed this day.</p>
                <p className="text-sm">
                  Fitvibe operates Monday, Wednesday, Friday &amp; Sunday. Pick a highlighted
                  date on the calendar to see that day&apos;s classes.
                </p>
              </div>
            ) : (
              <div className="space-y-3 mt-4">
                {selectedSessions.map((s) => {
                  const kind = kindOf(s.title);
                  const style = KIND_STYLES[kind];
                  return (
                    <div
                      key={s.id}
                      className="rounded-xl bg-off-white border border-tan/60 p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"
                    >
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-0.5 rounded-full border ${style.badge}`}>
                            {style.label}
                          </span>
                          <p className="font-semibold">{s.title}</p>
                        </div>
                        <p className="text-sm text-mid-gray">
                          {formatTimeRange(new Date(s.startTime), new Date(s.endTime))} · Up to{" "}
                          {s.capacity} people{s.instructor ? ` · with ${s.instructor}` : ""}
                        </p>
                      </div>
                      <a
                        href="/member"
                        className="shrink-0 rounded-full bg-vitality-orange text-off-white px-5 py-2.5 text-center text-sm font-semibold hover:bg-warm-amber transition-colors"
                      >
                        Book →
                      </a>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          <div className="rounded-xl bg-off-white border border-tan/60 p-6 text-charcoal/70">
            No classes are scheduled yet — check back soon.
          </div>
        )}

        <div className="rounded-xl bg-sage/15 border border-sage/40 p-4 mt-6 text-sm text-charcoal/80">
          <strong className="font-display text-evergreen">New to Fitvibe?</strong> Every
          operation day starts with a Beginner class — the assessment-guided starting point
          before you move into Spark or Forge. Booking requires a member account (see Member
          Portal).
        </div>
      </div>
    </div>
  );
}
