import Image from "next/image";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import NavBar from "@/components/NavBar";
import { db } from "@/db/client";
import { members } from "@/db/schema";
import { verifyPassword } from "@/lib/passwords";
import { createSessionToken, MEMBER_COOKIE, MEMBER_SESSION_MAX_AGE } from "@/lib/session";

export const dynamic = "force-dynamic";

async function memberLogin(formData: FormData) {
  "use server";
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/member/login?error=missing");
  }

  const [member] = await db.select().from(members).where(eq(members.email, email)).limit(1);

  if (!member) {
    redirect("/member/login?error=invalid");
  }

  if (!member.passwordHash) {
    redirect("/member/login?error=no_password");
  }

  const ok = await verifyPassword(password, member.passwordHash);
  if (!ok) {
    redirect("/member/login?error=invalid");
  }

  const token = createSessionToken(member.id, "member", MEMBER_SESSION_MAX_AGE);
  const cookieStore = await cookies();
  cookieStore.set(MEMBER_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: MEMBER_SESSION_MAX_AGE,
  });

  redirect("/member");
}

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Please enter both your email and password.",
  invalid: "That email and password don't match. Please try again.",
  no_password:
    "No password has been set for this account yet — please ask the front desk to set one up for you.",
};

export default async function MemberLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-3xl px-6 py-24 grid sm:grid-cols-[1fr_180px] gap-8 items-center">
        <div className="max-w-md">
          <h1 className="text-3xl mb-2 text-center">Member Portal</h1>
          <p className="text-charcoal/70 mb-8 text-center">
            Log in with the email and password on your account. New here, or don&apos;t have a
            password yet? Ask the front desk to set one up for you.
          </p>

          {error && ERROR_MESSAGES[error] && (
            <p className="mb-4 rounded-xl bg-vitality-orange/10 border border-vitality-orange/40 text-vitality-orange text-sm px-4 py-3 text-center">
              {ERROR_MESSAGES[error]}
            </p>
          )}

          <form action={memberLogin} className="flex flex-col gap-3">
            <input
              name="email"
              type="email"
              required
              placeholder="you@example.com"
              autoComplete="email"
              className="rounded-full border border-tan bg-off-white px-4 py-2.5 focus:outline-none focus:border-evergreen"
            />
            <input
              name="password"
              type="password"
              required
              placeholder="Password"
              autoComplete="current-password"
              className="rounded-full border border-tan bg-off-white px-4 py-2.5 focus:outline-none focus:border-evergreen"
            />
            <button className="rounded-full bg-vitality-orange text-charcoal px-5 py-2.5 font-semibold hover:bg-warm-amber transition-colors">
              Log In
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
