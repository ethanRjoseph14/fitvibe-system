import Image from "next/image";
import NavBar from "@/components/NavBar";
import { db } from "@/db/client";
import { members, creditPacks, accessCredentials, bookings, classSessions } from "@/db/schema";
import { eq, and, gt, desc } from "drizzle-orm";
import { formatShortDate, formatDateTime } from "@/lib/tz";

export const dynamic = "force-dynamic";

async function getMemberDashboard(email: string) {
  const [member] = await db.select().from(members).where(eq(members.email, email)).limit(1);
  if (!member) return null;

  const packs = await db
    .select()
    .from(creditPacks)
    .where(and(eq(creditPacks.memberId, member.id), eq(creditPacks.status, "active")));

  const totalCredits = packs.reduce((sum, p) => sum + p.creditsRemaining, 0);
  const nextExpiry = packs.sort((a, b) => (a.expiresAt > b.expiresAt ? 1 : -1))[0]?.expiresAt;

  const [credential] = await db
    .select()
    .from(accessCredentials)
    .where(and(eq(accessCredentials.memberId, member.id), eq(accessCredentials.status, "active")))
    .limit(1);

  const now = new Date();
  const upcoming = await db
    .select({ booking: bookings, session: classSessions })
    .from(bookings)
    .innerJoin(classSessions, eq(bookings.classSessionId, classSessions.id))
    .where(and(eq(bookings.memberId, member.id), gt(classSessions.startTime, now)))
    .orderBy(classSessions.startTime)
    .limit(5);

  return { member, totalCredits, nextExpiry, credential, upcoming };
}

export default async function MemberPortalPage({
  searchParams,
}: {
  searchParams: Promise<{ email?: string; join?: string }>;
}) {
  const { email } = await searchParams;

  if (!email) {
    return (
      <div className="min-h-screen bg-warm-beige text-charcoal">
        <NavBar />
        <section className="mx-auto max-w-3xl px-6 py-24 grid sm:grid-cols-[1fr_180px] gap-8 items-center">
          <div className="max-w-md">
            <h1 className="text-3xl mb-2 text-center">Member Portal</h1>
            <p className="text-charcoal/70 mb-8 text-center">
              Prototype login — enter the email you registered with. (Demo data: try{" "}
              <code className="text-evergreen">siti.aminah@example.com</code>.) Production
              build needs real auth (magic link or password) before go-live.
            </p>
            <form action="/member" className="flex gap-2">
              <input
                name="email"
                type="email"
                required
                placeholder="you@example.com"
                className="flex-1 rounded-full border border-tan bg-off-white px-4 py-2.5 focus:outline-none focus:border-evergreen"
              />
              <button className="rounded-full bg-vitality-orange text-charcoal px-5 py-2.5 font-semibold hover:bg-warm-amber transition-colors">
                Enter
              </button>
            </form>
          </div>
          <div className="relative hidden sm:block w-full aspect-[3/4] rounded-2xl overflow-hidden border border-tan/60">
            <Image
              src="/images/member-login-accent.webp"
              alt="Portrait of a Fitvibe member"
              fill
              sizes="180px"
              className="object-cover"
            />
          </div>
        </section>
      </div>
    );
  }

  const dash = await getMemberDashboard(email);

  if (!dash) {
    return (
      <div className="min-h-screen bg-warm-beige text-charcoal">
        <NavBar />
        <section className="mx-auto max-w-md px-6 py-24">
          <p>No member found for {email}. This is demo data only.</p>
          <a href="/member" className="text-vitality-orange font-semibold">← Back</a>
        </section>
      </div>
    );
  }

  const { member, totalCredits, nextExpiry, credential, upcoming } = dash;

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-4xl px-6 py-12 grid md:grid-cols-[1fr_320px] gap-8">
        <div>
          <h1 className="text-3xl mb-1">Welcome back, {member.fullName.split(" ")[0]}</h1>
          <p className="text-charcoal/60 mb-8 capitalize">Status: {member.status}</p>

          <div className="rounded-2xl bg-off-white border border-tan/60 p-6 mb-6">
            <h2 className="text-lg text-evergreen mb-1">Credit Balance</h2>
            <p className="text-4xl font-semibold mb-1">{totalCredits} credits</p>
            {nextExpiry && (
              <p className="text-sm text-mid-gray">
                Next batch expires {formatShortDate(new Date(nextExpiry))}
              </p>
            )}
          </div>

          <div className="rounded-2xl bg-off-white border border-tan/60 p-6">
            <h2 className="text-lg text-evergreen mb-3">Upcoming Bookings</h2>
            {upcoming.length === 0 && <p className="text-charcoal/60">No upcoming bookings yet.</p>}
            <div className="space-y-2">
              {upcoming.map((u) => (
                <div key={u.booking.id} className="flex justify-between text-sm border-b border-tan/40 pb-2">
                  <span>{u.session.title}</span>
                  <span className="text-mid-gray">{formatDateTime(new Date(u.session.startTime))}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Digital membership card */}
        <div>
          <div className="rounded-2xl bg-charcoal text-off-white p-6 sticky top-24">
            <p className="font-section-header text-xs uppercase tracking-widest text-warm-amber mb-1">Fitvibe Member</p>
            <h3 className="text-xl mb-4">{member.fullName}</h3>
            {credential ? (
              <>
                <img
                  src={`/api/qr/${credential.credentialToken}`}
                  alt="Membership QR code"
                  className="rounded-xl bg-warm-beige w-full mb-3"
                />
                <p className="font-caption text-xs text-off-white/60 text-center">
                  Show this at the door scanner for entry
                </p>
              </>
            ) : (
              <p className="font-caption text-sm text-off-white/70">No access credential issued yet — see front desk.</p>
            )}
          </div>
        </div>
      </section>
    </div>
  );
}
