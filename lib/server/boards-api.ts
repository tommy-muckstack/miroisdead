// Request logic for /api/boards, kept free of Next types so it's unit-testable with a MemoryRepo.
import type { Board } from "../canvas/types";
import { MAX_BOARD_BYTES, sanitizeDoc } from "../canvas/board";
import type { BoardRepo } from "./repo";

export type ApiResult = { status: number; body?: unknown };
const ID = /^[A-Za-z0-9_-]{4,64}$/;

export async function listBoards(repo: BoardRepo, uid: string): Promise<ApiResult> { return { status: 200, body: { boards: await repo.list(uid) } }; }
export async function getBoard(repo: BoardRepo, uid: string, id: string): Promise<ApiResult> {
  if (!ID.test(id)) return { status: 400, body: { error: "Bad board id" } };
  const board = await repo.get(uid, id); return board ? { status: 200, body: { board } } : { status: 404, body: { error: "Not found" } };
}
export async function putBoard(repo: BoardRepo, uid: string, id: string, raw: string): Promise<ApiResult> {
  if (!ID.test(id)) return { status: 400, body: { error: "Bad board id" } };
  if (raw.length > MAX_BOARD_BYTES) return { status: 413, body: { error: "Board too large" } };
  let b: any; try { b = JSON.parse(raw); } catch { return { status: 400, body: { error: "Invalid JSON" } }; }
  if (b?.id !== id) return { status: 400, body: { error: "Board id mismatch" } };
  const num = (v: unknown, d: number) => (typeof v === "number" && Number.isFinite(v) ? v : d);
  const v = b.view ?? {};
  const board: Board = { id, title: String(b.title ?? "Untitled board").slice(0, 200), ...(typeof b.emoji === "string" && b.emoji ? { emoji: String(b.emoji).slice(0, 8) } : {}), ...(typeof b.note === "string" && b.note ? { note: String(b.note).slice(0, 20000) } : {}), createdAt: num(b.createdAt, Date.now()), updatedAt: num(b.updatedAt, Date.now()), doc: sanitizeDoc(b.doc), view: { x: num(v.x, 0), y: num(v.y, 0), zoom: Math.min(6, Math.max(0.1, num(v.zoom, 1))) } };
  await repo.put(uid, board); return { status: 200, body: { ok: true } };
}
export async function deleteBoard(repo: BoardRepo, uid: string, id: string): Promise<ApiResult> {
  if (!ID.test(id)) return { status: 400, body: { error: "Bad board id" } };
  await repo.del(uid, id); return { status: 200, body: { ok: true } };
}
