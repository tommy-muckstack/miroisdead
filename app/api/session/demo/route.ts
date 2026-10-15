import { NextResponse } from "next/server";
import { demoEnabled, DEMO_UID } from "@/auth";
import { DEMO_COOKIE, cookieOptions, signDemo } from "@/lib/isdead-auth/server";
export const runtime = "nodejs";
// Demo mode only (no Firebase needed): one demo account, boards stay on this device.
export async function POST() {
  if (!demoEnabled()) return NextResponse.json({ error: "Demo mode is off" }, { status: 404 });
  const res = new NextResponse(null, { status: 204 });
  res.cookies.set(DEMO_COOKIE, signDemo(DEMO_UID), cookieOptions());
  return res;
}
