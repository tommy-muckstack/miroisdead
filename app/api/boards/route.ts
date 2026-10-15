import { NextResponse } from "next/server";
import { getIdentity } from "@/auth";
import { getRepo } from "@/lib/server/repo";
import { listBoards } from "@/lib/server/boards-api";
export const runtime = "nodejs";
export async function GET() {
  const me = await getIdentity();
  if (!me || me.kind !== "firebase") return NextResponse.json({ error: "Sign in to sync boards" }, { status: 401 });
  const r = await listBoards(getRepo(), me.uid); return NextResponse.json(r.body, { status: r.status });
}
