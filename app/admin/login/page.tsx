import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import NavBar from "@/components/NavBar";
import { db } from "@/db/client";
import { adminUsers } from "@/db/schema";
import { verifyPassword } from "@/lib/passwords";
import { createSessionToken, ADMIN_COOKIE, ADMIN_SESSION_MAX_AGE } from "@/lib/session";

export const dynamic = "force-dynamic";

async function adminLogin(formData: FormData) {
  "use server";
  const email = (formData.get("email") as string)?.trim().toLowerCase();
  const password = formData.get("password") as string;

  if (!email || !password) {
    redirect("/admin/login?error=missing");
  }

  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.email, email)).limit(1);

  if (!admin) {
    redirect("/admin/login?error=invalid");
  }

  const ok = await verifyPassword(password, admin.passwordHash);
  if (!ok) {
    redirect("/admin/login?error=invalid");
  }

  const token = createSessionToken(admin.id, "admin", ADMIN_SESSION_MAX_AGE);
  const cookieStore = await cookies();
  cookieStore.set(ADMIN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: ADMIN_SESSION_MAX_AGE,
  });

  redirect("/admin");
}

const ERROR_MESSAGES: Record<string, string> = {
  missing: "Please enter both your email and password.",
  invalid: "That email and password don't match. Please try again.",
};

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-warm-beige text-charcoal">
      <NavBar />
      <section className="mx-auto max-w-md px-6 py-24">
        <h1 className="text-3xl mb-2 text-center">Admin Login</h1>
        <p className="text-charcoal/70 mb-8 text-center">Staff and owner access only.</p>

        {error && ERROR_MESSAGES[error] && (
          <p className="mb-4 rounded-xl bg-vitality-orange/10 border border-vitality-orange/40 text-vitality-orange text-sm px-4 py-3 text-center">
            {ERROR_MESSAGES[error]}
          </p>
        )}

        <form action={adminLogin} className="flex flex-col gap-3">
          <input
            name="email"
            type="email"
            required
            placeholder="you@fitvibe.my"
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
          <button className="rounded-full bg-evergreen text-off-white px-5 py-2.5 font-semibold hover:opacity-90 transition-opacity">
            Log In
          </button>
        </form>
      </section>
    </div>
  );
}
