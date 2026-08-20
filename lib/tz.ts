// Fitvibe operates in Malaysia only. The server this app runs on (Vercel's
// serverless functions) executes in UTC, not Malaysia time — so formatting
// a stored timestamptz with a plain date-fns `format()` call renders it in
// whatever timezone the server happens to be in, which silently shows the
// wrong clock time to members (e.g. an 8:00am class showing as "12:00 AM").
//
// These helpers force every date/time shown in the UI to render in
// Asia/Kuala_Lumpur regardless of server timezone.

const TIME_ZONE = "Asia/Kuala_Lumpur";

function formatMY(date: Date, options: Intl.DateTimeFormatOptions): string {
  return new Intl.DateTimeFormat("en-MY", { ...options, timeZone: TIME_ZONE }).format(date);
}

/** e.g. "8:00 AM" */
export function formatClassTime(date: Date): string {
  return formatMY(date, { hour: "numeric", minute: "2-digit", hour12: true });
}

/** e.g. "Wednesday, 14 Oct" */
export function formatClassDay(date: Date): string {
  return formatMY(date, { weekday: "long", day: "numeric", month: "short" });
}

/** e.g. "14 Oct 2026" */
export function formatShortDate(date: Date): string {
  return formatMY(date, { day: "numeric", month: "short", year: "numeric" });
}

/** e.g. "14 Oct, 8:00 AM" */
export function formatDateTime(date: Date): string {
  return formatMY(date, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

/** e.g. "8:00 AM – 9:15 AM" */
export function formatTimeRange(start: Date, end: Date): string {
  return `${formatClassTime(start)} – ${formatClassTime(end)}`;
}

/** e.g. "October 2026" */
export function formatMonthYear(date: Date): string {
  return formatMY(date, { month: "long", year: "numeric" });
}

/** "YYYY-MM-DD" in Malaysia time — safe to use as a calendar-day grouping key. */
export function isoDateMY(date: Date): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

/** { year, month (1-12), day } for `date`, as seen in Malaysia time. */
export function getMYDateParts(date: Date): { year: number; month: number; day: number } {
  const [year, month, day] = isoDateMY(date).split("-").map(Number);
  return { year, month, day };
}
