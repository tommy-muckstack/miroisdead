// Client-side board persistence. LocalBoardStore (localStorage) is the fallback and the demo account's home;
// CloudBoardStore talks to the Firestore-backed API and mirrors every save locally so an offline tab loses nothing.
import type { Board, BoardMeta } from "./canvas/types";
import { metaOf, sanitizeDoc } from "./canvas/board";

export interface BoardStore {
  kind: "local" | "cloud";
  list(): Promise<BoardMeta[]>;
  load(id: string): Promise<Board | null>;
  save(board: Board): Promise<void>;
  remove(id: string): Promise<void>;
}
type KV = Pick<Storage, "getItem" | "setItem" | "removeItem">;

export class LocalBoardStore implements BoardStore {
  kind = "local" as const;
  constructor(private scope: string, private kv: KV = globalThis.localStorage) {}
  private k = (s: string) => `miroisdead:v1:${this.scope}:${s}`;
  private index(): BoardMeta[] { try { return JSON.parse(this.kv.getItem(this.k("index")) ?? "[]"); } catch { return []; } }
  async list() { return this.index().sort((a, b) => b.updatedAt - a.updatedAt); }
  async load(id: string): Promise<Board | null> {
    const raw = this.kv.getItem(this.k(`board:${id}`)); if (!raw) return null;
    try { const b = JSON.parse(raw); return { ...b, doc: sanitizeDoc(b.doc) }; } catch { return null; }
  }
  async save(board: Board) {
    this.kv.setItem(this.k(`board:${board.id}`), JSON.stringify(board));
    const idx = this.index().filter(m => m.id !== board.id); idx.push(metaOf(board));
    this.kv.setItem(this.k("index"), JSON.stringify(idx));
  }
  async remove(id: string) { this.kv.removeItem(this.k(`board:${id}`)); this.kv.setItem(this.k("index"), JSON.stringify(this.index().filter(m => m.id !== id))); }
}

export class CloudBoardStore implements BoardStore {
  kind = "cloud" as const;
  constructor(private base: string, private cache: LocalBoardStore, private f: typeof fetch = (...a) => fetch(...a)) {}
  async list(): Promise<BoardMeta[]> {
    try { const r = await this.f(`${this.base}/api/boards`, { cache: "no-store" }); if (!r.ok) throw new Error(String(r.status)); return (await r.json()).boards as BoardMeta[]; }
    catch { return this.cache.list(); }
  }
  async load(id: string): Promise<Board | null> {
    try {
      const r = await this.f(`${this.base}/api/boards/${id}`);
      if (r.status === 404) return this.cache.load(id);
      if (!r.ok) throw new Error(String(r.status));
      const b = (await r.json()).board as Board; return { ...b, doc: sanitizeDoc(b.doc) };
    } catch { return this.cache.load(id); }
  }
  async save(board: Board) {
    await this.cache.save(board); // device copy first, so a failed request never loses work
    const r = await this.f(`${this.base}/api/boards/${board.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(board) });
    if (!r.ok) throw new Error(r.status === 413 ? "Board is too large to sync" : "Could not sync");
  }
  async remove(id: string) { await this.cache.remove(id); const r = await this.f(`${this.base}/api/boards/${id}`, { method: "DELETE" }); if (!r.ok && r.status !== 404) throw new Error("Could not delete"); }
}
