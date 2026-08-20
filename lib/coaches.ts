// Coach roster. Small, fixed list — a full database table isn't needed yet.
// When Fitvibe has more than a handful of coaches, or wants coaches to
// self-manage their own profiles, this is the natural point to move this
// into the database (a `coaches` table) instead.

export type Coach = {
  slug: string;
  name: string;
  /** Short title shown on cards and in the nav-adjacent byline. */
  title: string;
  isFounder?: boolean;
  /** True once this coach is actively teaching booked classes. */
  active: boolean;
  bio: string;
  credentials?: string[];
  /** Path under /public to this coach's real headshot, once available. */
  photo?: string;
};

export const coaches: Coach[] = [
  {
    slug: "ethan-joseph",
    name: "Ethan Joseph",
    title: "Founder & Movement Specialist",
    isFounder: true,
    active: true,
    photo: "/images/coaches/ethan-joseph.webp",
    bio: "Ethan founded Fitvibe to build the space he wished existed: a specialist movement centre where adults 50+ and people managing chronic conditions are trained with the same rigor as any elite athlete, and treated with the dignity of a person first. He created The ForEva Method — Fitvibe's assessment-led training framework — and personally teaches the majority of classes during Fitvibe's first year. [Eva note: this is a starting draft — replace with your real background, certifications, and the fuller story of why you started Fitvibe. The ForEva Method's name carries personal meaning worth telling here too, whenever you're ready to share it.]",
    credentials: ["Founder, Fitvibe", "Creator, The ForEva Method"],
  },
  {
    slug: "anne-nikko",
    name: "Anne Nikko",
    title: "Coach",
    active: true,
    photo: "/images/coaches/anne-nikko.webp",
    bio: "[Add Coach Anne's background, certifications, and coaching specialties here.]",
  },
  {
    slug: "chan",
    name: "Chan",
    title: "Coach",
    active: true,
    photo: "/images/coaches/chan.webp",
    bio: "[Add Coach Chan's background, certifications, and coaching specialties here.]",
  },
  {
    slug: "lorna",
    name: "Lorna",
    title: "Coach",
    active: false,
    bio: "[Add Coach Lorna's background, certifications, and coaching specialties here.] Lorna joins the teaching roster after launch — for now, Ethan is personally teaching every class.",
  },
];

export function getCoachBySlug(slug: string): Coach | undefined {
  return coaches.find((c) => c.slug === slug);
}

/**
 * Matches a class session's free-text `instructor` field (e.g. "Ethan") to
 * a coach profile, so the timetable can link a name straight to their page.
 * Matches on full name or first name, case-insensitively.
 */
export function findCoachByInstructorName(name: string | null | undefined): Coach | undefined {
  if (!name) return undefined;
  const needle = name.trim().toLowerCase();
  return coaches.find(
    (c) => c.name.toLowerCase() === needle || c.name.split(" ")[0].toLowerCase() === needle
  );
}
