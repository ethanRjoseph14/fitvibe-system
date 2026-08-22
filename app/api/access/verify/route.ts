import { NextRequest, NextResponse } from "next/server";
import { verifyAccess } from "@/lib/access";

/**
 * Records this app's OWN view of an entry/token check — used by the member
 * portal and admin panel to show validity + an access history.
 *
 * NOTE (22 Aug 2026): the physical token/card system is now a separate,
 * unlinked vendor system per Ethan's decision — front-desk staff activate
 * validity by hand in both systems, so this endpoint is not currently wired
 * up to call, or be called by, any real door hardware. It's kept ready in
 * case a future vendor's reader can make an HTTPS POST with a scanned
 * token (an ESP32/Raspberry Pi-based reader is the typical low-cost setup
 * that could do this), but don't assume that integration exists yet.
 */
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.token) {
    return NextResponse.json({ granted: false, reason: "missing_token" }, { status: 400 });
  }
  const direction = body.direction === "exit" ? "exit" : "entry";
  const result = await verifyAccess(body.token, direction);
  return NextResponse.json(result);
}
