import { NextRequest, NextResponse } from "next/server";
import QRCode from "qrcode";

// Renders a member's access credential token as a scannable PNG QR code,
// used for the digital membership card shown in the member portal.
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;
  const png = await QRCode.toBuffer(token, {
    width: 320,
    margin: 2,
    color: { dark: "#2C2C2C", light: "#F2EAD3" }, // Charcoal on Warm Beige, per brand guide
  });
  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store",
    },
  });
}
