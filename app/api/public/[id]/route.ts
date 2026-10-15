import { NextRequest, NextResponse } from "next/server";
import { getRepo } from "@/lib/server/repo";
import { getPublicBoard, putPublicBoard } from "@/lib/server/boards-api";
export const runtime = "nodejs";
type Ctx = { params: Promise<{ id: string }> };
/** Anyone-with-the-link access (Share ▸ Invite ▸ "Anyone with the link"). No sign-in; the owner's access setting gates it. */
export async function GET(_: NextRequest, { params }: Ctx) { const r = await getPublicBoard(getRepo(), (await params).id); return NextResponse.json(r.body, { status: r.status }); }
export async function PUT(req: NextRequest, { params }: Ctx) { const r = await putPublicBoard(getRepo(), (await params).id, await req.text()); return NextResponse.json(r.body, { status: r.status }); }
