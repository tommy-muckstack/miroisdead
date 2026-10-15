// Sign-in for MiroIsDead: the shared IsDead Firebase session (lib/isdead-auth) or, in demo mode, a signed demo cookie.
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, DEMO_COOKIE, verifySessionCookie, verifyDemo, revokeSessions, firebaseConfigured } from "@/lib/isdead-auth/server";

export { firebaseConfigured };
export const DEMO_UID = "demo";
export const demoEnabled = () => process.env.NODE_ENV !== "production" || process.env.DEMO_MODE === "1";
export type Identity = { kind: "demo" | "firebase"; uid: string; name: string; email: string | null };

export async function getIdentity(): Promise<Identity | null> {
  const jar = await cookies();
  if (demoEnabled() && verifyDemo(jar.get(DEMO_COOKIE)?.value) === DEMO_UID) return { kind: "demo", uid: DEMO_UID, name: "Demo account", email: null };
  const f = await verifySessionCookie(jar.get(SESSION_COOKIE)?.value);
  return f ? { kind: "firebase", uid: f.uid, name: f.name ?? f.email?.split("@")[0] ?? "You", email: f.email } : null;
}
export async function requireIdentity(): Promise<Identity> { const id = await getIdentity(); if (!id) redirect("/login"); return id; }

/** Server-action sign out: clears the shared cookie (all IsDead apps) and revokes Firebase refresh tokens. */
export async function signOut() {
  "use server";
  const jar = await cookies();
  const f = await verifySessionCookie(jar.get(SESSION_COOKIE)?.value);
  if (f) await revokeSessions(f.uid);
  jar.delete({ name: SESSION_COOKIE, path: "/" }); jar.delete({ name: DEMO_COOKIE, path: "/" });
  redirect("/");
}
