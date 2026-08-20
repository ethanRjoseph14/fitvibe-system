# Fitvibe — Member, Booking & Door Access System (v0.2)

Built by Eva for Ethan. This addresses the **"Fitvibe — Member Data,
Membership & Door Access System"** discussion brief (16 Aug 2026) and the
**Systems Tracker** deliverables in `Fitvibe_Project_Management_Launch_Sprint_v5`
(Phase 4, target: system go-live **25 Sep 2026**).

v0.2 (19–20 Aug 2026) moved the database from a local SQLite prototype to
your real Supabase Postgres project (`fitvibe-production`).

## First-time setup on YOUR Supabase project

You already created the Supabase project and gave me the connection string,
which is saved in `.env.local` in this zip — the app is already pointed at
your real database. Two things left to do before it's fully live:

1. **Create the tables.** Open your Supabase project → **SQL Editor** → New
   query. Paste in the entire contents of `supabase-setup/01_setup_supabase.sql`
   and click **Run**. This creates all 9 tables plus the enums they use, and
   loads your real membership pricing (Spark/Forge/1-on-1/Founding
   Member/SJGC) so the Programmes page has real data immediately. I
   generated and tested this exact script against a throwaway Postgres
   database before handing it to you, so it should run without errors — if
   it doesn't, send me the error message.
   - It deliberately does NOT include demo/fake members or a class
     timetable — didn't want to pollute your production project with test
     data. Ask me to generate a fresh class timetable when you're ready to
     open real bookings (the dates need to be relative to "now," so I
     generate them fresh rather than reusing old ones).

2. **Run it locally to confirm the connection works:**
   ```bash
   npm install
   npm run dev   # http://localhost:3000
   ```
   The Programmes page should show your 7 real membership plans with real
   pricing. If you see an error instead, it's almost always the
   `DATABASE_URL` in `.env.local` — double check it against Supabase →
   Connect → ORM → Drizzle.

## What's actually working right now

- **Public site**: home, The ForEva Method, Programmes/Pricing (live from
  your Supabase DB), public class timetable — brand colors/type applied
  throughout from `Fitvibe_Brand_Identity_Guidelines_v2.docx`.
- **Member portal**: credit balance, upcoming bookings, digital membership
  card with a real scannable QR code (`/api/qr/[token]`).
- **Admin dashboard**: member list with live status/credit balance, pending
  manual-payment approval queue (approving auto-issues a credit pack), recent
  door-access event log.
- **Door access engine** (`lib/access.ts`, `POST /api/access/verify`): the
  actual grant/deny decision logic a QR/RFID reader would call. It checks
  credential validity → member status → active unexpired credit balance,
  logs every attempt, and always grants **exit** (never traps someone
  inside). Tested end-to-end against a real Postgres database.
- **Data model** (`db/schema.ts`): members (incl. medical/chronic flags,
  waiver + PDPA consent capture), membership plans (Spark/Forge/1-on-1/
  Founding Member/SJGC), credit packs, payments, class sessions, bookings,
  access credentials, access logs — one schema, no duplicate/driftable
  databases, per the brief's core requirement.

## What's intentionally stubbed for v0.2

- **Auth**: the member portal is an email-lookup demo, not real login.
  Supabase (which you already have) includes free auth — wiring up real
  magic-link login is the next priority.
- **Payment**: manual DuitNow/bank-transfer logging only, per your
  confirmed decision — admin manually approves. No online gateway wired up
  yet (schema has a `gateway_ref` field reserved for Billplz or similar
  later).
- **Physical door hardware**: this is software only. You still need to
  choose and install a QR scanner (or RFID reader) at the door that calls
  `POST /api/access/verify` with the scanned token. Any internet-connected
  reader works — an ESP32 or Raspberry Pi with a QR/barcode module is the
  typical low-cost setup (~RM 200–500).
- **⚠️ Fail-safe door wiring**: the brief requires doors to fail UNLOCKED on
  power outage or fire alarm. That's electrical wiring (maglock in
  "fail-safe" mode), not something this codebase can enforce — make sure
  whoever installs the hardware wires it that way, and get it checked in
  your fire-code inspection.
- **Reminders**: WhatsApp/SMS/email renewal + low-credit alerts not built
  yet (Systems Tracker item, currently "not started").
- **PDPA review**: fields exist to capture consent, but the actual consent
  wording and retention policy still needs your legal review before real
  member data goes in — do not skip this per your own tracker.
- **Real class timetable**: seed script generates dates relative to "now,"
  so no live dates are checked in — see setup step 1 above.

## Deploying to Vercel (so www.fitvibe.my can actually point somewhere)

1. Push this project to a GitHub repo (or use Vercel's own Git import).
2. In Vercel, import the project.
3. In Vercel → Project Settings → Environment Variables, add `DATABASE_URL`
   with the exact same value as in your local `.env.local`. Vercel does NOT
   read `.env.local` — you must set it there separately.
4. Deploy. Once it's live on a `*.vercel.app` URL, connect www.fitvibe.my
   under Vercel → Project Settings → Domains, then update your domain
   registrar's DNS records as Vercel instructs.

## Tech choices and why

- **Next.js 16 (App Router) + Tailwind v4** — matches your "custom-coded
  web app" decision. Deploys cleanly to Vercel.
- **Postgres (Supabase) + Drizzle ORM** — chosen over Prisma because the
  sandbox this was built in has no outbound access to Prisma's binary CDN
  (`binaries.prisma.sh`); Drizzle needs no native engine download. Started
  as a local SQLite prototype (v0.1) and moved to your real Supabase
  project in v0.2 — same schema shape, translated to Postgres types.
- **Fonts** load via CSS `@import` rather than `next/font/google`, again
  because the build sandbox can't reach `fonts.googleapis.com` at build
  time. Works fine once deployed anywhere with normal internet access;
  consider self-hosting the font files for performance once live.

## Suggested next steps against your Sep 25 go-live target

1. Run the Supabase setup script (above) and confirm `npm run dev` shows
   real pricing on the Programmes page.
2. Deploy to Vercel and connect www.fitvibe.my.
3. Wire up real member login via Supabase Auth (magic link) — this unblocks
   a real, working member portal instead of the email-lookup demo.
4. Decide on the QR/RFID reader hardware and vendor (still an open decision
   in your discussion brief) — coordinate install timing with the
   renovation window (Sep W1, per the dashboard).
5. Migrate the 27 Strong Beyond 50 members for real once auth is in place.
6. Get the PDPA consent wording reviewed before real medical data is
   entered.
7. Build the reminder system (WhatsApp/SMS/email) — everything else is
   ready to feed it real status/expiry data.
