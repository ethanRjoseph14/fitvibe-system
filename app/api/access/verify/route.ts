import { NextRequest, NextResponse } from "next/server";
import { verifyAccess } from "@/lib/access";

/**
 * Called by the door reader (QR scanner / RFID reader / keypad controller)
 * on every scan attempt. Returns { granted: boolean, reason, memberName }.
 *
 * The physical reader hardware is a separate procurement item (not built
 * here) — this endpoint is the integration point it should call. Any
 * reader that can make an HTTPS POST with a scanned token works:
 * an ESP32/Raspberry Pi-based QR/RFID reader is the typical low-cost setup.
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
