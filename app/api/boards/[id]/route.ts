import { NextRequest, NextResponse } from "next/server";
import { getIdentity } from "@/auth";
import { getRepo } from "@/lib/server/repo";
import { deleteBoard, getBoard, putBoard } from "@/lib/server/boards-api";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
async function who() { const me = await getIdentity(); return me && me.kind === "firebase" ? me : null; }
const unauth = () => NextResponse.json({ error: "Sign in to sync boards" }, { status: 401 });
export async function GET(_: NextRequest, { params }: Ctx) { const me = await who(); if (!me) return unauth(); const r = await getBoard(getRepo(), me.uid, (await params).id); return NextResponse.json(r.body, { status: r.status }); }
export async function PUT(req: NextRequest, { params }: Ctx) { const me = await who(); if (!me) return unauth(); const r = await putBoard(getRepo(), me.uid, (await params).id, await req.text()); return NextResponse.json(r.body, { status: r.status }); }
export async function DELETE(_: NextRequest, { params }: Ctx) { const me = await who(); if (!me) return unauth(); const r = await deleteBoard(getRepo(), me.uid, (await params).id); return NextResponse.json(r.body, { status: r.status }); }
