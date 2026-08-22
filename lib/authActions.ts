"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { MEMBER_COOKIE, ADMIN_COOKIE } from "@/lib/session";

export async function memberLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(MEMBER_COOKIE);
  redirect("/member/login");
}

export async function adminLogout() {
  const cookieStore = await cookies();
  cookieStore.delete(ADMIN_COOKIE);
  redirect("/admin/login");
}
