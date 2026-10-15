// Sign-in for MiroIsDead: the shared IsDead Firebase session (lib/isdead-auth) or, in demo mode, a signed demo cookie.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, DEMO_COOKIE, GUEST_COOKIE, verifySessionCookie, verifyDemo, verifyGuest, guestEnabled, revokeSessions, firebaseConfigured } from "@/lib/isdead-auth/server";

export { firebaseConfigured };
export const DEMO_UID = "demo";
export const demoEnabled = () => process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1";
export type Identity = { kind: "demo" | "firebase" | "guest"; uid: string; name: string; email: string | null };

export async function getIdentity(): Promise<Identity | null> {
  const jar = await cookies();
  if (demoEnabled() && verifyDemo(jar.get(DEMO_COOKIE)?.value) === DEMO_UID) return { kind: "demo", uid: DEMO_UID, name: "Demo account", email: null };
  const f = await verifySessionCookie(jar.get(SESSION_COOKIE)?.value);
  if (f) return { kind: "firebase", uid: f.uid, name: f.name ?? f.email?.split("@")[0] ?? "You", email: f.email };
  const g = guestEnabled() ? verifyGuest(jar.get(GUEST_COOKIE)?.value) : null;
  return g ? { kind: "guest", uid: g, name: "Guest", email: null } : null;
}
/** Anyone gets in: visitors without a session are handed a guest session (one redirect hop) and sent back to `next`. */
export async function requireIdentity(next = "/app"): Promise<Identity> {
  const id = await getIdentity(); if (id) return id;
  redirect(guestEnabled() ? `/api/session/guest?next=${encodeURIComponent(next)}` : "/login");
}
/** For features that need a real account (email, sync). */
export const isAccount = (id: Identity | null): id is Identity & { kind: "firebase" } => !!id && id.kind === "firebase";

/** Server-action sign out: clears the shared cookie (all IsDead apps) and revokes Firebase refresh tokens. */
export async function signOut() {
  "use server";
  const jar = await cookies();
  const f = await verifySessionCookie(jar.get(SESSION_COOKIE)?.value);
  if (f) await revokeSessions(f.uid);
  jar.delete({ name: SESSION_COOKIE, path: "/" }); jar.delete({ name: DEMO_COOKIE, path: "/" }); jar.delete({ name: GUEST_COOKIE, path: "/" });
  redirect("/");
}
