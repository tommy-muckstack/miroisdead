import { NextResponse } from "next/server";
import { getIdentity } from "@/auth";
export const runtime = "nodejs";
/** Mints a Firebase custom token for the signed-in user so the browser can use Firestore for WebRTC signalling (rules require auth). */
export async function POST() {
  const me = await getIdentity();
  if (!me || me.kind !== "firebase") return NextResponse.json({ error: "Sign in to use live sessions" }, { status: 401 });
  const raw = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"]; if (!raw) return NextResponse.json({ error: "Not configured" }, { status: 501 });
  const { initializeApp, getApps, cert } = await import("firebase-admin/app"); const { getAuth } = await import("firebase-admin/auth");
  const sa = JSON.parse(raw); const app = getApps().find(a => a.name === "isdead") ?? initializeApp({ credential: cert(sa), projectId: sa.project_id }, "isdead");
  const token = await getAuth(app).createCustomToken(me.uid, { miroisdead: true });
  return NextResponse.json({ token });
}
