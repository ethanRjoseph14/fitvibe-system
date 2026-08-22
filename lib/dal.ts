import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db/client";
import { members, adminUsers, type Member, type AdminUser } from "@/db/schema";
import { verifySessionToken, MEMBER_COOKIE, ADMIN_COOKIE } from "@/lib/session";

/**
 * Data Access Layer for auth — the one place that reads the session cookie
 * and looks up the corresponding member/admin row. Every server component,
 * server action, and route handler that needs to know "who is this" should
 * go through here rather than re-reading cookies itself, per Next.js's own
 * auth guide (checks should live close to the data, not just in proxy.ts).
 */

export async function getCurrentMember(): Promise<Member | null> {
  const token = (await cookies()).get(MEMBER_COOKIE)?.value;
  const payload = verifySessionToken(token);
  if (!payload || payload.role !== "member") return null;
  const [member] = await db.select().from(members).where(eq(members.id, payload.sub)).limit(1);
  return member ?? null;
}

/** Use in a member portal page/layout — redirects to login if not signed in. */
export async function requireMember(): Promise<Member> {
  const member = await getCurrentMember();
  if (!member) redirect("/member/login");
  return member;
}

export async function getCurrentAdmin(): Promise<AdminUser | null> {
  const token = (await cookies()).get(ADMIN_COOKIE)?.value;
  const payload = verifySessionToken(token);
  if (!payload || payload.role !== "admin") return null;
  const [admin] = await db.select().from(adminUsers).where(eq(adminUsers.id, payload.sub)).limit(1);
  return admin ?? null;
}

/** Use in an admin panel page/layout — redirects to login if not signed in. */
export async function requireAdmin(): Promise<AdminUser> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}
