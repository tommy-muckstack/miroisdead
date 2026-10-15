// Board envelope: create, serialize (JSON file / API / Firestore payload), validate imported data.
import type { Board, BoardMeta, Doc, Obj, View } from "./types";
import { DEFAULT_VIEW, emptyDoc, isBox } from "./types";
import { nid } from "./doc";

export const FORMAT = "miroisdead-board";
export const MAX_BOARD_BYTES = 900_000; // Firestore documents cap at 1 MiB; keep headroom
export const newBoard = (title = "Untitled board", doc: Doc = emptyDoc(), view: View = DEFAULT_VIEW): Board => { const t = Date.now(); return { id: nid(), title, createdAt: t, updatedAt: t, doc, view }; };
export const metaOf = (b: Board): BoardMeta => ({ id: b.id, title: b.title, createdAt: b.createdAt, updatedAt: b.updatedAt, objectCount: b.doc.order.length, ...(b.emoji ? { emoji: b.emoji } : {}), ...(b.access && b.access !== "none" ? { access: b.access } : {}) });
export const serialize = (b: Board): string => JSON.stringify({ format: FORMAT, version: 1, ...b });

const num = (v: unknown, d = 0) => (typeof v === "number" && Number.isFinite(v) ? v : d);
const str = (v: unknown, d = "", max = 20_000) => (typeof v === "string" ? v.slice(0, max) : d);
const bool = (v: unknown, d = false) => (typeof v === "boolean" ? v : d);
const color = (v: unknown, d: string) => (typeof v === "string" && /^#[0-9a-fA-F]{3,8}$/.test(v) ? v : d);
export const ACCESS = ["none", "view", "edit"];
const SHAPES = ["rect", "round", "ellipse", "diamond", "triangle"], STYLES = ["elbow", "straight", "curve"], SIDES = ["n", "e", "s", "w"];

function cleanEnd(e: any) {
  if (e && typeof e.id === "string") return SIDES.includes(e.side) ? { id: e.id, side: e.side } : { id: e.id };
  return { x: num(e?.x), y: num(e?.y) };
}
/** Accepts anything JSON; returns a safe Doc (unknown types dropped, numbers/colours/enums coerced). */
export function sanitizeDoc(raw: any): Doc {
  const objects: Record<string, Obj> = {}, order: string[] = [];
  const list: any[] = Array.isArray(raw?.order) && raw?.objects ? raw.order.map((id: string) => raw.objects[id]) : [];
  for (const r of list) {
    if (!r || typeof r.id !== "string" || objects[r.id]) continue;
    const base = { id: r.id.slice(0, 64), x: num(r.x), y: num(r.y), w: Math.max(1, num(r.w, 100)), h: Math.max(1, num(r.h, 100)) };
    let o: Obj | null = null;
    switch (r.type) {
      case "sticky": o = { ...base, type: "sticky", text: str(r.text), color: color(r.color, "#FFE86D"), fontSize: r.fontSize === "auto" ? "auto" : Math.min(96, Math.max(8, num(r.fontSize, 16))) }; break;
      case "shape": o = { ...base, type: "shape", shape: SHAPES.includes(r.shape) ? r.shape : "rect", text: str(r.text), fill: color(r.fill, "#FFFFFF"), stroke: color(r.stroke, "#1C1C1E"), filled: bool(r.filled, true), dashed: bool(r.dashed), fontSize: Math.min(96, Math.max(8, num(r.fontSize, 16))) }; break;
      case "text": o = { ...base, type: "text", text: str(r.text), fontSize: Math.min(160, Math.max(8, num(r.fontSize, 20))), color: color(r.color, "#1C1C1E"), bold: bool(r.bold) }; break;
      case "frame": o = { ...base, type: "frame", name: str(r.name, "Frame", 200) }; break;
      case "image": { const src = str(r.src, "", 600_000); if (!/^(data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+|https:\/\/[^\s"'<>]+)$/.test(src)) break; o = { ...base, type: "image", src, ...(typeof r.alt === "string" ? { alt: str(r.alt, "", 200) } : {}) }; break; }
      case "comment": o = { ...base, w: 40, h: 36, type: "comment", thread: (Array.isArray(r.thread) ? r.thread : []).slice(0, 500).map((m: any) => ({ by: str(m?.by, "someone", 120), text: str(m?.text, "", 5000), at: num(m?.at, Date.now()) })), resolved: bool(r.resolved) }; break;
      case "pen": o = { ...base, type: "pen", points: (Array.isArray(r.points) ? r.points : []).slice(0, 5000).map((p: any) => ({ x: num(p?.x), y: num(p?.y) })), stroke: color(r.stroke, "#1C1C1E"), width: Math.min(40, Math.max(1, num(r.width, 3))) }; break;
      case "connector": o = { id: base.id, type: "connector", from: cleanEnd(r.from), to: cleanEnd(r.to), style: STYLES.includes(r.style) ? r.style : "elbow", startArrow: bool(r.startArrow), endArrow: bool(r.endArrow, true), dashed: bool(r.dashed), stroke: color(r.stroke, "#1C1C1E"), label: str(r.label, "", 500) }; break;
    }
    if (o) { if (r.locked === true) (o as { locked?: boolean }).locked = true; if (typeof r.group === "string" && r.group) (o as { group?: string }).group = r.group.slice(0, 64); if (typeof r.rot === "number" && Number.isFinite(r.rot) && r.rot % 360 !== 0 && o.type !== "connector" && o.type !== "comment") (o as { rot?: number }).rot = ((r.rot % 360) + 360) % 360; if (r.private === true && o.type === "sticky") o.private = true; objects[o.id] = o; order.push(o.id); }
  }
  // connectors pointing at objects that don't exist become free-floating
  for (const id of order) { const o = objects[id]; if (o.type !== "connector") continue; for (const k of ["from", "to"] as const) { const e = o[k]; if ("id" in e && !objects[e.id]) o[k] = { x: 0, y: 0 }; } }
  return { objects, order };
}
export function parseBoard(json: string): Board {
  if (json.length > 5_000_000) throw new Error("That file is too large to be a board.");
  let raw: any; try { raw = JSON.parse(json); } catch { throw new Error("That file isn't valid JSON."); }
  if (raw?.format !== FORMAT) throw new Error("That doesn't look like a MiroIsDead board file.");
  const t = Date.now(), v = raw.view ?? {};
  return { id: nid(), title: str(raw.title, "Imported board", 200) || "Imported board", createdAt: t, updatedAt: t, ...(typeof raw.emoji === "string" ? { emoji: str(raw.emoji, "", 8) } : {}), ...(typeof raw.note === "string" ? { note: str(raw.note, "", 20000) } : {}), ...(ACCESS.includes(raw.access) ? { access: raw.access } : {}), doc: sanitizeDoc(raw.doc), view: { x: num(v.x), y: num(v.y), zoom: Math.min(6, Math.max(0.1, num(v.zoom, 1))) } };
}
export { isBox };
