import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { verifySessionToken, MEMBER_COOKIE, ADMIN_COOKIE } from "@/lib/session";

/**
 * Route protection for the member portal and admin panel.
 *
 * NOTE: this file is named `proxy.ts`, not `middleware.ts` — Next.js 16
 * renamed the `middleware` file convention to `proxy` (see AGENTS.md at the
 * repo root: this codebase runs a newer Next.js than most training data
 * covers). A `middleware.ts` file here would silently do nothing.
 *
 * This is an "optimistic" check (cookie signature + expiry only, no DB
 * lookup) for fast redirects — the real enforcement is in lib/dal.ts's
 * requireMember()/requireAdmin(), which every protected page also calls.
 * Per Next.js's own auth guide, this file is defense-in-depth, not the only
 * line of defense.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isMemberRoute = pathname.startsWith("/member") && pathname !== "/member/login";
  if (isMemberRoute) {
    const session = verifySessionToken(request.cookies.get(MEMBER_COOKIE)?.value);
    if (!session || session.role !== "member") {
      return NextResponse.redirect(new URL("/member/login", request.url));
    }
  }

  const isAdminRoute = pathname.startsWith("/admin") && pathname !== "/admin/login";
  if (isAdminRoute) {
    const session = verifySessionToken(request.cookies.get(ADMIN_COOKIE)?.value);
    if (!session || session.role !== "admin") {
      return NextResponse.redirect(new URL("/admin/login", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/member/:path*", "/admin/:path*"],
};
