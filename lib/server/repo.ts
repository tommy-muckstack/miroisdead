// Server-side board repository. Firestore (via firebase-admin) in production, in-memory for tests and local dev without keys.
import type { Board, BoardMeta } from "../canvas/types";
import { MAX_BOARD_BYTES, metaOf, sanitizeDoc } from "../canvas/board";

export interface BoardRepo {
  list(uid: string): Promise<BoardMeta[]>;
  get(uid: string, id: string): Promise<Board | null>;
  put(uid: string, board: Board): Promise<void>;
  del(uid: string, id: string): Promise<void>;
  /** Look a board up by id alone (for anyone-with-the-link access). */
  getPublic(id: string): Promise<{ uid: string; board: Board } | null>;
}
export class MemoryRepo implements BoardRepo {
  private data = new Map<string, Board>();
  async list(uid: string) { return [...this.data.entries()].filter(([k]) => k.startsWith(uid + "/")).map(([, b]) => metaOf(b)).sort((a, b) => b.updatedAt - a.updatedAt); }
  async get(uid: string, id: string) { return this.data.get(`${uid}/${id}`) ?? null; }
  async put(uid: string, b: Board) { this.data.set(`${uid}/${b.id}`, b); }
  async del(uid: string, id: string) { this.data.delete(`${uid}/${id}`); }
  async getPublic(id: string) { for (const [k, b] of this.data) if (k.endsWith("/" + id)) return { uid: k.split("/")[0], board: b }; return null; }
}

/** users/{uid}/miroisdead_boards/{id}: { title, createdAt, updatedAt, objectCount, payload: JSON string of {doc, view} } */
export class FirestoreRepo implements BoardRepo {
  private db = (async () => {
    const raw = process.env["FIREBASE_SERVICE_ACCOUNT_JSON"]; if (!raw) throw new Error("FIREBASE_SERVICE_ACCOUNT_JSON is not set");
    const { initializeApp, getApps, cert } = await import("firebase-admin/app");
    const { getFirestore } = await import("firebase-admin/firestore");
    const sa = JSON.parse(raw);
    return getFirestore(getApps().find(a => a.name === "isdead") ?? initializeApp({ credential: cert(sa), projectId: sa.project_id }, "isdead"));
  })();
  private col = async (uid: string) => (await this.db).collection("users").doc(uid).collection("miroisdead_boards");
  async list(uid: string) {
    const snap = await (await this.col(uid)).orderBy("updatedAt", "desc").limit(500).get();
    return snap.docs.map((d: { id: string; data: () => any }) => { const x = d.data(); return { id: d.id, title: x.title, createdAt: x.createdAt, updatedAt: x.updatedAt, objectCount: x.objectCount ?? 0, ...(x.access && x.access !== "none" ? { access: x.access } : {}), ...(x.emoji ? { emoji: x.emoji } : {}) }; });
  }
  async get(uid: string, id: string) {
    const d = await (await this.col(uid)).doc(id).get(); if (!d.exists) return null;
    return this.fromDoc(id, d.data()!);
  }
  private fromDoc(id: string, x: any): Board { const p = JSON.parse(x.payload); return { id, title: x.title, createdAt: x.createdAt, updatedAt: x.updatedAt, ...(x.emoji ? { emoji: x.emoji } : {}), ...(p.note ? { note: String(p.note).slice(0, 20000) } : {}), ...(x.access && x.access !== "none" ? { access: x.access } : {}), doc: sanitizeDoc(p.doc), view: p.view }; }
  /** Public lookups go through a small top-level map (miroisdead_public/{id} → uid) so no collection-group index is needed. */
  async getPublic(id: string) {
    const m = await (await this.db).collection("miroisdead_public").doc(id).get(); if (!m.exists) return null;
    const uid = String(m.data()?.uid ?? ""); if (!uid) return null;
    const d = await (await this.col(uid)).doc(id).get(); if (!d.exists) return null;
    return { uid, board: this.fromDoc(d.id, d.data()) };
  }
  async put(uid: string, b: Board) {
    const pub = (await this.db).collection("miroisdead_public").doc(b.id);
    if (b.access && b.access !== "none") await pub.set({ uid, access: b.access, updatedAt: b.updatedAt }); else await pub.delete().catch(() => {});
    await (await this.col(uid)).doc(b.id).set({ id: b.id, access: b.access ?? "none", title: b.title, createdAt: b.createdAt, updatedAt: b.updatedAt, objectCount: b.doc.order.length, emoji: b.emoji ?? "", payload: JSON.stringify({ doc: b.doc, view: b.view, ...(b.note ? { note: b.note } : {}) }) });
  }
  async del(uid: string, id: string) { await (await this.col(uid)).doc(id).delete(); await (await this.db).collection("miroisdead_public").doc(id).delete().catch(() => {}); }
}
let repo: BoardRepo | null = null;
export const getRepo = (): BoardRepo => (repo ??= process.env["FIREBASE_SERVICE_ACCOUNT_JSON"] ? new FirestoreRepo() : new MemoryRepo());
export const setRepo = (r: BoardRepo | null) => { repo = r; };
export { MAX_BOARD_BYTES };
