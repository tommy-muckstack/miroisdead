import { NextRequest, NextResponse } from "next/server";
import { getIdentity } from "@/auth";
import { BP } from "@/lib/basepath";
import { GUEST_COOKIE, GUEST_MAX_AGE_S, cookieOptions, guestEnabled, newGuestId, signGuest } from "@/lib/isdead-auth/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
// GET ?next=/app → mint a guest session (if there is no session yet) and bounce back into the app.
export async function GET(req: NextRequest) {
  const raw = req.nextUrl.searchParams.get("next") || "/app";
  const next = /^\/(?!\/)[\w\-./?=&%]*$/.test(raw) ? raw : "/app";
  const res = NextResponse.redirect(new URL(BP + next, req.nextUrl.origin), 307);
  if (!guestEnabled()) return NextResponse.redirect(new URL(BP + "/login?callbackUrl=" + encodeURIComponent(next), req.nextUrl.origin), 307);
  if (!(await getIdentity())) res.cookies.set(GUEST_COOKIE, signGuest(newGuestId()), cookieOptions(GUEST_MAX_AGE_S));
  return res;
}
