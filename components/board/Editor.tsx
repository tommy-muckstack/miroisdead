"use client";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Board, Box, Doc, End, Id, Obj, Pt, Side, View, ShapeObj, StickyObj, ConnectorStyle } from "@/lib/canvas/types";
import { STICKY_COLORS, isBox } from "@/lib/canvas/types";
import { DIR, OPPOSITE, anchorPoint, boxOf, normBox, simplify, snapBox, unionBox, type Guide } from "@/lib/canvas/geometry";
import { addObjects, align, bringToFront, cloneObjects, connector, createConnected, distribute, frame, frameAround, moveObjects, nid, pasteObjects, pen, removeObjects, resizeObject, sendToBack, shape, sticky, textObj, updateObjects, withFrameChildren, type Align } from "@/lib/canvas/doc";
import { boundsOf, resolveConnector, routeConnector } from "@/lib/canvas/connectors";
import { hitTest, marquee } from "@/lib/canvas/hit";
import { LINE_HEIGHT, fitFontSize, wrapText } from "@/lib/canvas/text";
import { checkpoint, commit, createHistory, redo, replace, undo, canRedo, canUndo, type History } from "@/lib/canvas/history";
import { MAX_ZOOM, MIN_ZOOM, fitView, panBy, screenToWorld, worldToScreen, zoomAt } from "@/lib/canvas/viewport";
import { describeScene } from "@/lib/canvas/scene";
import { serialize } from "@/lib/canvas/board";
import { KEY_TO_TOOL, TOOLS, type Tool } from "@/lib/shortcuts";
import type { BoardStore } from "@/lib/store";
import { Defs, Scene, shapePath, penPath } from "./Scene";
import { boardToSvg } from "./exportSvg";
import { I } from "./icons";
import { X } from "@/components/mxi";
import "@/components/miboard.css";
import { SelectionToolbar } from "./SelectionToolbar";
import { Minimap } from "./Minimap";
import { ShortcutSheet } from "./ShortcutSheet";

type Gesture =
  | { k: "pan"; sx: number; sy: number; v: View }
  | { k: "move"; ids: Id[]; start: Doc; w0: Pt; cp: boolean; dup: boolean; clickId: Id | null; shift: boolean; moved: boolean }
  | { k: "resize"; id: Id; h: string; start: Doc; b0: Box; cp: boolean }
  | { k: "marquee"; w0: Pt; base: Id[] }
  | { k: "draw"; tool: Tool; w0: Pt }
  | { k: "pen"; pts: Pt[] }
  | { k: "conn"; from: End; fromPt: Pt; dot: { id: Id; side: Side } | null; moved: boolean }
  | { k: "cend"; id: Id; which: "from" | "to"; cp: boolean }
  | { k: "erase"; cp: boolean; start: Doc };
type Draft = { kind: "box"; tool: Tool; box: Box } | { kind: "pen"; pts: Pt[] } | { kind: "conn"; a: Pt; b: Pt } | null;
type Edit = { id: Id; isNew: boolean } | null;
type Status = "saved" | "saving" | "device" | "error";
type Last = { stickyColor: string; fill: string; stroke: string; penColor: string; penWidth: number; textColor: string; connectorStyle: ConnectorStyle; shape: ShapeObj["shape"]; arrow: boolean; line: string };

const HANDLES = ["nw", "n", "ne", "e", "se", "s", "sw", "w"];
const handlePt = (b: Box, h: string): Pt => ({ x: h.includes("w") ? b.x : h.includes("e") ? b.x + b.w : b.x + b.w / 2, y: h.includes("n") ? b.y : h.includes("s") ? b.y + b.h : b.y + b.h / 2 });
const CURSOR: Record<string, string> = { nw: "nwse-resize", se: "nwse-resize", ne: "nesw-resize", sw: "nesw-resize", n: "ns-resize", s: "ns-resize", e: "ew-resize", w: "ew-resize" };
const textual = (o: Obj) => o.type === "sticky" || o.type === "shape" || o.type === "text" || o.type === "frame" || o.type === "connector";
const textOf = (o: Obj) => (o.type === "frame" ? o.name : o.type === "connector" ? o.label : "text" in o ? o.text : "");
const download = (name: string, mime: string, data: string) => { const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([data], { type: mime })); a.download = name; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 1000); };
const textHeight = (text: string, w: number, size: number, bold: boolean) => Math.max(size * 1.6, wrapText(text || " ", w, size, undefined, bold).length * size * LINE_HEIGHT + 8);

export function Editor({ initial, store, who, signOutAction }: { initial: Board; store: BoardStore; who: string; signOutAction?: () => void | Promise<void> }) {
  const [hist, setHist] = useState<History<Doc>>(() => createHistory(initial.doc));
  const [view, setView] = useState<View>(initial.view);
  const [title, setTitle] = useState(initial.title);
  const [sel, setSel] = useState<Id[]>([]);
  const [tool, setTool] = useState<Tool>("select");
  const [edit, setEdit] = useState<Edit>(null);
  const [size, setSize] = useState({ w: 1200, h: 800 });
  const [draft, setDraft] = useState<Draft>(null);
  const [marq, setMarq] = useState<Box | null>(null);
  const [guides, setGuides] = useState<Guide[]>([]);
  const [status, setStatus] = useState<Status>("saved");
  const [help, setHelp] = useState(false);
  const [map, setMap] = useState(false);
  const [menu, setMenu] = useState(false);
  const [space, setSpace] = useState(false);
  const [toast, setToast] = useState("");
  const [banner, setBanner] = useState(true);
  const [fly, setFly] = useState<"" | "shapes" | "more">("");
  const [share, setShare] = useState<"" | "Invite" | "Embed" | "Publish" | "AI">("");
  const [prof, setProf] = useState(false);
  const [chips, setChips] = useState(true);
  const doc = hist.present;

  const box = useRef<HTMLDivElement>(null);
  const g = useRef<Gesture | null>(null);
  const R = useRef({ doc, view, sel, tool, size, edit, title, space });
  R.current = { doc, view, sel, tool, size, edit, title, space };
  const clip = useRef<Obj[]>([]);
  const pasteN = useRef(0);
  const last = useRef<Last>({ stickyColor: STICKY_COLORS[0], fill: "#FFFFFF", stroke: "#1C1C1E", penColor: "#1C1C1E", penWidth: 3, textColor: "#1C1C1E", connectorStyle: "elbow", shape: "rect", arrow: true, line: "Elbow arrow" });
  const lastClick = useRef({ t: 0, id: "" });

  // ---- size ----
  useLayoutEffect(() => {
    const el = box.current!; const ro = new ResizeObserver(() => setSize({ w: el.clientWidth, h: el.clientHeight })); ro.observe(el); setSize({ w: el.clientWidth, h: el.clientHeight }); return () => ro.disconnect();
  }, []);
  const flash = (m: string) => { setToast(m); setTimeout(() => setToast(""), 1800); };

  // ---- history helpers ----
  const commitDoc = useCallback((next: Doc) => setHist(h => commit(h, next)), []);
  const liveDoc = useCallback((next: Doc) => setHist(h => replace(h, next)), []);
  const begin = useCallback(() => setHist(h => checkpoint(h)), []);
  const doUndo = () => { setEdit(null); setHist(h => undo(h)); };
  const doRedo = () => { setEdit(null); setHist(h => redo(h)); };
  // drop selection ids that no longer exist (after undo/delete)
  useEffect(() => { setSel(s => { const f = s.filter(i => doc.objects[i]); return f.length === s.length ? s : f; }); if (edit && !doc.objects[edit.id]) setEdit(null); }, [doc, edit]);

  // ---- autosave ----
  const first = useRef(true);
  const board = useMemo<Board>(() => ({ ...initial, title, doc, view, updatedAt: Date.now() }), [initial, title, doc, view]);
  const boardRef = useRef(board); boardRef.current = board;
  const saveNow = useCallback(async () => {
    setStatus("saving");
    try { await store.save({ ...boardRef.current, updatedAt: Date.now() }); setStatus("saved"); }
    catch { setStatus(store.kind === "cloud" ? "device" : "error"); }
  }, [store]);
  useEffect(() => { if (first.current) { first.current = false; return; } setStatus("saving"); const t = setTimeout(saveNow, 600); return () => clearTimeout(t); }, [doc, title, view, saveNow]);
  useEffect(() => { const f = () => { void store.save({ ...boardRef.current, updatedAt: Date.now() }).catch(() => {}); }; window.addEventListener("pagehide", f); const v = () => document.visibilityState === "hidden" && f(); document.addEventListener("visibilitychange", v); return () => { window.removeEventListener("pagehide", f); document.removeEventListener("visibilitychange", v); }; }, [store]);

  // ---- coordinates ----
  const rect = () => box.current!.getBoundingClientRect();
  const toWorld = (e: { clientX: number; clientY: number }): Pt => { const r = rect(); return screenToWorld(R.current.view, R.current.size, { x: e.clientX - r.left, y: e.clientY - r.top }); };
  const tol = () => 6 / R.current.view.zoom;

  // ---- actions ----
  const selectOnly = (ids: Id[]) => setSel(ids);
  const startEdit = (id: Id, isNew = false) => { setEdit({ id, isNew }); setSel([id]); };
  const backToSelect = () => setTool("select");
  const patchSel = (p: Partial<Obj> | ((o: Obj) => Partial<Obj>), remember?: Record<string, unknown>) => { commitDoc(updateObjects(R.current.doc, R.current.sel, p)); if (remember) Object.assign(last.current, remember); };
  const del = () => { const { doc: d, sel: s } = R.current; if (!s.length) return; commitDoc(removeObjects(d, s)); setSel([]); };
  const dup = () => { const { doc: d, sel: s } = R.current; if (!s.length) return; const c = cloneObjects(d, s); commitDoc(addObjects(d, c.objs)); setSel(c.ids); };
  const copy = (cut: boolean) => { const { doc: d, sel: s } = R.current; if (!s.length) return; const set = new Set(s); clip.current = d.order.filter(i => set.has(i)).map(i => d.objects[i]); pasteN.current = 0; navigator.clipboard?.writeText("MiroIsDead board objects").catch(() => {}); if (cut) del(); else flash(`Copied ${s.length} object${s.length > 1 ? "s" : ""}`); };
  const paste = () => { if (!clip.current.length) return false; pasteN.current++; const o = 24 * pasteN.current; const r = pasteObjects(R.current.doc, clip.current, o, o); commitDoc(r.doc); setSel(r.ids); return true; };
  const fitAll = () => { const { doc: d, size: s } = R.current; setView(fitView(unionBox(d.order.map(i => boundsOf(d, d.objects[i]))), s)); };
  const fitSel = () => { const { doc: d, size: s, sel: ss } = R.current; const b = unionBox(ss.map(i => d.objects[i]).filter(Boolean).map(o => boundsOf(d, o))); if (b) setView(fitView(b, s)); };
  const zoomBy = (f: number) => setView(v => zoomAt(v, R.current.size, { x: R.current.size.w / 2, y: R.current.size.h / 2 }, v.zoom * f));
  const frameSel = () => { const { doc: d, sel: s } = R.current; const r = frameAround(d, s.filter(i => d.objects[i]?.type !== "frame")); if (r) { commitDoc(r.doc); setSel([r.id]); } };
  const newFrom = (x: number, y: number, kind: Tool): Obj => {
    const L = last.current;
    if (kind === "sticky") return sticky(x - 90, y - 90, { color: L.stickyColor });
    if (kind === "text") return textObj(x, y - 18, { color: L.textColor });
    const sh = kind === "ellipse" ? "ellipse" : kind === "diamond" ? "diamond" : L.shape === "triangle" ? "triangle" : "rect";
    return shape(x - 80, y - 55, { shape: sh, fill: L.fill, stroke: L.stroke });
  };
  const sizeFor = (o: Obj, b: Box): Obj => (isBox(o) ? ({ ...o, x: b.x, y: b.y, w: b.w, h: b.h } as Obj) : o);

  const finishEdit = (text: string, then?: "tab" | "shifttab") => {
    const e = R.current.edit; if (!e) return; const d = R.current.doc, o = d.objects[e.id]; setEdit(null);
    if (!o) return;
    const apply = e.isNew ? liveDoc : commitDoc;
    if (o.type === "text") {
      if (!text.trim()) { if (e.isNew) setHist(h => ({ past: h.past.slice(0, -1), present: removeObjects(d, [o.id]), future: [] })); else commitDoc(removeObjects(d, [o.id])); setSel([]); return; }
      apply(updateObjects(d, [o.id], { text, h: textHeight(text, o.w, o.fontSize, o.bold) }));
    } else if (o.type === "frame") apply(updateObjects(d, [o.id], { name: text.trim() || "Frame" }));
    else if (o.type === "connector") apply(updateObjects(d, [o.id], { label: text.trim() }));
    else apply(updateObjects(d, [o.id], { text }));
    if (then && (o.type === "sticky" || o.type === "shape")) {
      const nd = then === "tab" ? { x: o.x + o.w + 24, y: o.y } : { x: o.x, y: o.y + o.h + 24 };
      const clone = { ...o, id: nid(), text: "", ...nd } as Obj; // same size/colour; the previous edit is already committed above
      setHist(h => commit(h, addObjects(h.present, [clone])));
      setEdit({ id: clone.id, isNew: true }); setSel([clone.id]);
    }
  };

  // ---- pointer ----
  const onPointerDown = (e: React.PointerEvent) => {
    if ((e.target as Element).closest("[data-ui]")) return;
    box.current!.focus({ preventScroll: true });
    if (R.current.edit) { /* blur of the editor commits */ (document.activeElement as HTMLElement)?.blur?.(); }
    if (e.button === 2) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { doc: d, tool: t, view: v, sel: s } = R.current, w = toWorld(e);
    if (e.button === 1 || t === "hand" || R.current.space) { g.current = { k: "pan", sx: e.clientX, sy: e.clientY, v }; return; }
    const h = (e.target as Element).closest("[data-h]")?.getAttribute("data-h");
    if (t === "select" && h) {
      if (h.startsWith("dot:")) { const side = h.slice(4) as Side, id = s[0]; const o = d.objects[id]; g.current = { k: "conn", from: { id, side }, fromPt: anchorPoint(boxOf(o as any), side), dot: { id, side }, moved: false }; return; }
      if (h === "ca" || h === "cb") { g.current = { k: "cend", id: s[0], which: h === "ca" ? "from" : "to", cp: false }; return; }
      g.current = { k: "resize", id: s[0], h, start: d, b0: boxOf(d.objects[s[0]] as any), cp: false }; return;
    }
    if (t === "select") {
      const id = hitTest(d, w, tol());
      const now = Date.now(), dbl = e.detail >= 2 || (lastClick.current.id === id && now - lastClick.current.t < 350 && id);
      lastClick.current = { t: now, id: id ?? "" };
      if (id && dbl && textual(d.objects[id])) { g.current = null; startEdit(id); return; }
      if (id) {
        const shift = e.shiftKey || e.metaKey || e.ctrlKey;
        let ids = s;
        if (shift) { ids = s.includes(id) ? s.filter(i => i !== id) : [...s, id]; setSel(ids); if (!ids.includes(id)) { g.current = null; return; } }
        else if (!s.includes(id)) { ids = [id]; setSel(ids); }
        g.current = { k: "move", ids: withFrameChildren(d, ids), start: d, w0: w, cp: false, dup: e.altKey, clickId: id, shift, moved: false };
      } else { g.current = { k: "marquee", w0: w, base: e.shiftKey ? s : [] }; if (!e.shiftKey) setSel([]); }
      return;
    }
    if (t === "pen") { g.current = { k: "pen", pts: [w] }; setDraft({ kind: "pen", pts: [w] }); return; }
    if (t === "eraser") { g.current = { k: "erase", cp: false, start: d }; return; }
    if (t === "connector") {
      const id = hitTest(d, w, tol(), new Set(d.order.filter(i => { const o = d.objects[i]; return o.type === "connector" || o.type === "pen" || o.type === "frame"; })));
      const from: End = id ? { id } : { x: w.x, y: w.y };
      g.current = { k: "conn", from, fromPt: w, dot: null, moved: false }; setDraft({ kind: "conn", a: w, b: w }); return;
    }
    if (t === "sticky" || t === "text") { const o = newFrom(w.x, w.y, t); commitDoc(addObjects(d, [o])); startEdit(o.id, true); backToSelect(); return; }
    g.current = { k: "draw", tool: t, w0: w }; setDraft({ kind: "box", tool: t, box: { x: w.x, y: w.y, w: 0, h: 0 } });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const gg = g.current; if (!gg) return;
    const { doc: d, view: v } = R.current;
    if (gg.k === "pan") { setView(panBy(gg.v, e.clientX - gg.sx, e.clientY - gg.sy)); return; }
    const w = toWorld(e);
    switch (gg.k) {
      case "move": {
        let dx = w.x - gg.w0.x, dy = w.y - gg.w0.y;
        if (!gg.moved && Math.hypot(dx, dy) * v.zoom < 3) return;
        if (!gg.cp) {
          gg.cp = true; gg.moved = true;
          if (gg.dup) { const c = cloneObjects(gg.start, gg.ids, 0, 0); gg.start = addObjects(gg.start, c.objs); gg.ids = c.ids; setSel(c.ids.filter(i => gg.start.objects[i].type !== "connector" || true)); }
          begin();
        }
        const movingSet = new Set(gg.ids);
        const moving = unionBox(gg.ids.map(i => gg.start.objects[i]).filter(o => o && isBox(o)).map(o => boxOf(o as any)));
        let gl: Guide[] = [];
        if (moving && !e.metaKey && !e.ctrlKey) {
          const others = gg.start.order.filter(i => !movingSet.has(i) && gg.start.objects[i].type !== "connector" && gg.start.objects[i].type !== "frame").map(i => boxOf(gg.start.objects[i] as any));
          const r = snapBox({ ...moving, x: moving.x + dx, y: moving.y + dy }, others, 6 / v.zoom); dx += r.dx; dy += r.dy; gl = r.guides;
        }
        setGuides(gl); liveDoc(moveObjects(gg.start, gg.ids, dx, dy)); return;
      }
      case "resize": {
        const dx = w.x - handlePt(gg.b0, gg.h).x, dy = w.y - handlePt(gg.b0, gg.h).y;
        if (!gg.cp) { gg.cp = true; begin(); }
        let { x, y, w: bw, h: bh } = gg.b0;
        if (gg.h.includes("e")) bw += dx; if (gg.h.includes("s")) bh += dy; if (gg.h.includes("w")) { x += dx; bw -= dx; } if (gg.h.includes("n")) { y += dy; bh -= dy; }
        if (e.shiftKey && gg.h.length === 2 && gg.b0.w && gg.b0.h) { const r = gg.b0.w / gg.b0.h; if (bw / bh > r) bh = bw / r; else bw = bh * r; if (gg.h.includes("w")) x = gg.b0.x + gg.b0.w - bw; if (gg.h.includes("n")) y = gg.b0.y + gg.b0.h - bh; }
        liveDoc(resizeObject(gg.start, gg.id, { x, y, w: bw, h: bh })); return;
      }
      case "marquee": { const b = normBox(gg.w0, w); setMarq(b); const hit = marquee(d, b); setSel([...new Set([...gg.base, ...hit])]); return; }
      case "draw": setDraft({ kind: "box", tool: gg.tool, box: normBox(gg.w0, w) }); return;
      case "pen": gg.pts.push(w); setDraft({ kind: "pen", pts: gg.pts.slice() }); return;
      case "conn": {
        if (!gg.moved && Math.hypot(w.x - gg.fromPt.x, w.y - gg.fromPt.y) * v.zoom < 5) return; gg.moved = true;
        setDraft({ kind: "conn", a: gg.fromPt, b: w }); return;
      }
      case "cend": {
        if (!gg.cp) { gg.cp = true; begin(); }
        const id = hitTest(d, w, tol(), new Set([gg.id]));
        const tgt = id && isBox(d.objects[id]) && d.objects[id].type !== "pen" && d.objects[id].type !== "frame" ? id : null;
        liveDoc(updateObjects(d, [gg.id], { [gg.which]: tgt ? { id: tgt } : { x: w.x, y: w.y } } as Partial<Obj>)); return;
      }
      case "erase": {
        const id = hitTest(d, w, tol() + 2); if (!id) return;
        if (!gg.cp) { gg.cp = true; begin(); }
        liveDoc(removeObjects(d, [id])); return;
      }
    }
  };

  const onPointerUp = (e: React.PointerEvent) => {
    const gg = g.current; g.current = null; if (!gg) return;
    const { doc: d, view: v } = R.current, w = toWorld(e);
    setGuides([]); setMarq(null);
    switch (gg.k) {
      case "move": if (!gg.moved && !gg.shift && R.current.sel.length > 1 && gg.clickId) setSel([gg.clickId]); return;
      case "draw": {
        setDraft(null);
        const b = normBox(gg.w0, w), tiny = b.w * v.zoom < 8 && b.h * v.zoom < 8;
        let o: Obj;
        if (gg.tool === "frame") { const fb = tiny ? { x: gg.w0.x - 240, y: gg.w0.y - 160, w: 480, h: 320 } : b; o = frame(fb.x, fb.y, fb.w, fb.h, `Frame ${d.order.filter(i => d.objects[i].type === "frame").length + 1}`); commitDoc(addObjects(d, [o])); setSel([o.id]); startEdit(o.id, true); backToSelect(); return; }
        o = newFrom(gg.w0.x, gg.w0.y, gg.tool); if (!tiny) o = sizeFor(o, { x: b.x, y: b.y, w: Math.max(40, b.w), h: Math.max(30, b.h) });
        commitDoc(addObjects(d, [o])); startEdit(o.id, true); backToSelect(); return;
      }
      case "pen": {
        setDraft(null); const pts = simplify(gg.pts, 1.2 / v.zoom);
        if (pts.length < 2 && gg.pts.length < 2) { const o = pen([w, { x: w.x + 0.1, y: w.y }], last.current.penColor, last.current.penWidth); commitDoc(addObjects(d, [o])); return; }
        const o = pen(pts.length < 2 ? gg.pts : pts, last.current.penColor, last.current.penWidth); commitDoc(addObjects(d, [o])); setSel([o.id]); return;
      }
      case "conn": {
        setDraft(null);
        const skip = new Set(d.order.filter(i => { const o = d.objects[i]; return o.type === "connector" || o.type === "pen" || o.type === "frame"; }));
        const id = hitTest(d, w, tol(), skip);
        if (gg.dot && !gg.moved) { const r = createConnected(d, gg.dot.id, gg.dot.side); if (r) { commitDoc(r.doc); startEdit(r.id, true); } return; }
        const to: End = id ? (gg.dot && id === gg.dot.id ? { x: w.x, y: w.y } : { id }) : { x: w.x, y: w.y };
        if (gg.dot && !id) { // dragged into empty space: drop a connected clone there (Miro's picker, "same object" choice)
          const src = d.objects[gg.dot.id] as Obj; if (isBox(src)) { const c = { ...src, id: nid(), text: "", x: w.x - src.w / 2, y: w.y - src.h / 2 } as Obj; const k = connector({ id: gg.dot.id, side: gg.dot.side }, { id: c.id }, { style: last.current.connectorStyle }); commitDoc(addObjects(d, [c, k])); startEdit(c.id, true); } return;
        }
        if (!("id" in gg.from) && !("id" in to) && Math.hypot(w.x - gg.fromPt.x, w.y - gg.fromPt.y) * v.zoom < 10) return;
        const k = connector(gg.from, to, { style: last.current.connectorStyle, endArrow: last.current.arrow }); commitDoc(addObjects(d, [k])); setSel([k.id]); backToSelect(); return;
      }
      default: return;
    }
  };

  // wheel: ⌘/ctrl = zoom (also trackpad pinch), otherwise pan
  useEffect(() => {
    const el = box.current!;
    const f = (e: WheelEvent) => {
      if ((e.target as Element).closest("[data-ui]")) return; e.preventDefault();
      const r = el.getBoundingClientRect(), at = { x: e.clientX - r.left, y: e.clientY - r.top };
      if (e.ctrlKey || e.metaKey) setView(v => zoomAt(v, R.current.size, at, v.zoom * Math.exp(-e.deltaY * 0.01)));
      else setView(v => panBy(v, -e.deltaX, -e.deltaY));
    };
    el.addEventListener("wheel", f, { passive: false }); return () => el.removeEventListener("wheel", f);
  }, []);

  // ---- keyboard ----
  const keys = useRef<(e: KeyboardEvent) => void>(() => {});
  keys.current = (e: KeyboardEvent) => {
    const t = e.target as HTMLElement;
    if (t.closest("input,textarea,select,[contenteditable]")) return;
    const { sel: s, doc: d } = R.current, mod = e.metaKey || e.ctrlKey, k = e.key.toLowerCase();
    if (e.code === "Space" && !mod) { e.preventDefault(); setSpace(true); return; }
    if (mod && k === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
    if (mod && k === "y") { e.preventDefault(); doRedo(); return; }
    if (mod && k === "s") { e.preventDefault(); void saveNow(); flash("Saved"); return; }
    if (mod && k === "a") { e.preventDefault(); setSel(d.order.slice()); return; }
    if (mod && k === "d") { e.preventDefault(); dup(); return; }
    if (mod && k === "c") { copy(false); return; }
    if (mod && k === "x") { e.preventDefault(); copy(true); return; }
    if (mod && k === "v") { if (paste()) e.preventDefault(); return; }
    if (mod && e.key === "]") { e.preventDefault(); commitDoc(bringToFront(d, s)); return; }
    if (mod && e.key === "[") { e.preventDefault(); commitDoc(sendToBack(d, s)); return; }
    if (mod && (e.key === "=" || e.key === "+")) { e.preventDefault(); zoomBy(1.25); return; }
    if (mod && e.key === "-") { e.preventDefault(); zoomBy(0.8); return; }
    if (mod && e.key === "0") { e.preventDefault(); setView(v => zoomAt(v, R.current.size, { x: R.current.size.w / 2, y: R.current.size.h / 2 }, 1)); return; }
    if (mod) return;
    if (e.key === "Escape") { if (g.current) { g.current = null; setDraft(null); setMarq(null); } else if (R.current.tool !== "select") setTool("select"); else setSel([]); setHelp(false); setMenu(false); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); del(); return; }
    if (e.key === "?") { setHelp(h => !h); return; }
    if (e.key === "Enter" && s.length === 1 && textual(d.objects[s[0]])) { e.preventDefault(); startEdit(s[0]); return; }
    if (e.key === "Tab" && s.length === 1) {
      const o = d.objects[s[0]]; if (o && (o.type === "sticky" || o.type === "shape")) { e.preventDefault(); const side: Side = e.shiftKey ? "s" : "e"; const r = createConnected(d, o.id, side); if (r) { commitDoc(r.doc); startEdit(r.id, true); } return; }
    }
    if (e.key.startsWith("Arrow") && s.length) { e.preventDefault(); const n = e.shiftKey ? 10 : 1; commitDoc(moveObjects(d, withFrameChildren(d, s), e.key === "ArrowLeft" ? -n : e.key === "ArrowRight" ? n : 0, e.key === "ArrowUp" ? -n : e.key === "ArrowDown" ? n : 0)); return; }
    if (e.key === "!" || (e.shiftKey && e.code === "Digit1")) { fitAll(); return; }
    if (e.key === "@" || (e.shiftKey && e.code === "Digit2")) { fitSel(); return; }
    if (e.key === "+" || e.key === "=") { zoomBy(1.25); return; }
    if (e.key === "-") { zoomBy(0.8); return; }
    if (k === "m" && !e.shiftKey) { setMap(m => !m); return; }
    if (k === "f" && s.length > 1) { frameSel(); return; }
    if (KEY_TO_TOOL[k] && !e.shiftKey && !e.altKey) { setTool(KEY_TO_TOOL[k]); setEdit(null); }
  };
  useEffect(() => {
    const d = (e: KeyboardEvent) => keys.current(e);
    const u = (e: KeyboardEvent) => { if (e.code === "Space") setSpace(false); };
    const p = (e: ClipboardEvent) => { // external text paste → sticky at the view centre
      if ((e.target as HTMLElement).closest("input,textarea,[contenteditable]") || R.current.edit) return;
      const text = e.clipboardData?.getData("text/plain")?.trim(); if (!text || text === "MiroIsDead board objects") return;
      e.preventDefault(); const c = R.current.view, o = sticky(c.x - 90, c.y - 90, { text: text.slice(0, 2000), color: last.current.stickyColor });
      commitDoc(addObjects(R.current.doc, [o])); setSel([o.id]);
    };
    window.addEventListener("keydown", d); window.addEventListener("keyup", u); window.addEventListener("paste", p);
    return () => { window.removeEventListener("keydown", d); window.removeEventListener("keyup", u); window.removeEventListener("paste", p); };
  }, [commitDoc]);

  // ---- derived UI ----
  const selObjs = sel.map(i => doc.objects[i]).filter(Boolean);
  const selBounds = unionBox(selObjs.map(o => boundsOf(doc, o)));
  const z = view.zoom, px = (n: number) => n / z;
  const one = selObjs.length === 1 ? selObjs[0] : null;
  const sBox = selBounds ? (() => { const a = worldToScreen(view, size, { x: selBounds.x, y: selBounds.y }); return { x: a.x, y: a.y, w: selBounds.w * z, h: selBounds.h * z }; })() : null;
  const hint = edit ? "Esc to finish · Tab for the next sticky · ⇧Tab places it below" : tool !== "select" ? TOOLS.find(t => t.tool === tool)!.hint : one && (one.type === "sticky" || one.type === "shape") ? "Enter to edit · Tab adds a connected one · drag a blue dot to connect" : selObjs.length > 1 ? "Align and distribute from the toolbar · F frames the selection · ⌘D duplicates" : "Scroll to pan · ⌘ + scroll to zoom · N for a sticky · ? for all shortcuts";
  const cursor = g.current?.k === "pan" || (space && true) ? "grab" : tool === "hand" ? "grab" : tool === "select" ? "default" : tool === "eraser" ? "cell" : "crosshair";
  const gridSize = 80 * z, bgPos = `${size.w / 2 - view.x * z}px ${size.h / 2 - view.y * z}px`;
  const statusText = status === "saving" ? "Saving…" : status === "saved" ? (store.kind === "cloud" ? "Saved to your account" : "Saved on this device") : status === "device" ? "Saved on this device · sync failed" : "Couldn't save";

  return <div className="mi-app" data-testid="board-editor">
    {banner && <div className="mx-banner" data-ui role="status"><span className="mx-banner-i">{X.info}</span><span>Never miss an important update.</span><a href="#notifications" onClick={e => { e.preventDefault(); setBanner(false); }}>Turn on real-time notifications</a><button aria-label="Dismiss" className="mx-banner-x" onClick={() => setBanner(false)}>{X.close}</button></div>}
    <header className="mb-tl" data-ui style={{ top: banner ? 66 : 10 }}>
      <Link href="/app" className="mb-i" aria-label="Back to boards" title="Back to boards">{X.panel}</Link>
      <Link href="/app" className="mb-logo hm" aria-label="MiroIsDead home">miro</Link>
      <button className="mb-i hm" aria-label="Reactions" onClick={() => flash("Reactions are for live sessions")}>{X.smile}</button>
      <input className="mb-title" aria-label="Board title" value={title} placeholder="Untitled" onChange={e => setTitle(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
      <span className="mi-menuwrap hm"><button className="mb-i" aria-label="Board options" aria-haspopup="menu" onClick={() => setMenu(m => !m)}>{X.kebab}</button></span>
      <div className="mi-menuwrap">
        <button className="mb-i" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-haspopup="menu" aria-label="Export" title="Export">{X.upload}</button>
        {menu && <div className="mi-menu mb-menu" role="menu" onPointerDown={e => e.stopPropagation()}>
          <div className="mb-menu-h">{statusText}</div>
          <button role="menuitem" onClick={() => { download(`${title || "board"}.svg`, "image/svg+xml", boardToSvg(doc)); setMenu(false); }}>Download SVG</button>
          <button role="menuitem" onClick={() => { download(`${title || "board"}.miroisdead.json`, "application/json", serialize(boardRef.current)); setMenu(false); }}>Download board file (.json)</button>
          <button role="menuitem" onClick={() => { navigator.clipboard?.writeText(JSON.stringify(describeScene(boardRef.current), null, 2)).then(() => flash("Scene JSON copied"), () => flash("Couldn't copy")); setMenu(false); }}>Copy scene JSON for an AI agent</button>
        </div>}
      </div>
      <button className="mb-plan hm" onClick={() => flash("MiroIsDead is free and open source")}><b>Free</b> plan {X.chev}</button>
      <span className="mx-sr" data-testid="save-status" role="status">{statusText}</span>
    </header>
    <div className="mb-tr" data-ui style={{ top: banner ? 66 : 10 }}>
      <button className="mb-i wide hm" aria-label="Timer and voting" onClick={() => flash("Timer and voting are for live sessions")}>{X.timer}</button>
      <button className="mb-i hm" aria-label="Comments" onClick={() => flash("Comments aren't in MiroIsDead yet")}>{X.chat}</button>
      <button className="mb-i hm" aria-label="Start a call" onClick={() => flash("Calls aren't part of MiroIsDead")}>{X.video}</button>
      <span className="mi-menuwrap"><button className="mb-av" aria-label="Account" aria-expanded={prof} onClick={() => setProf(p => !p)}><i>{(who.split("@")[0][0] ?? "T").toUpperCase()}</i>{X.chev}</button>
        {prof && <div className="mi-menu mb-menu" role="menu" style={{ right: 0 }} onPointerDown={e => e.stopPropagation()}><div className="mb-menu-h">{who}</div>
          <Link href="/app" role="menuitem" className="mb-link">All boards</Link>
          {signOutAction && <form action={signOutAction}><button role="menuitem">Sign out</button></form>}</div>}</span>
      <button className="mb-play hm" aria-label="Present" onClick={() => flash("Presentation mode isn't in MiroIsDead yet")}>{X.play}</button>
      <button className="mb-sharebtn" onClick={() => setShare("Invite")} data-testid="share">Share</button>
    </div>

    <nav className="mb-rail" data-ui aria-label="Tools" style={{ top: banner ? 130 : 80 }}>
      <div className="mb-pill">
        <button className="mb-t ai" aria-label="Create with AI" title="Create with AI" onClick={() => { setFly(""); flash("Copy scene JSON in Export to use your own AI agent"); }}>{X.sparkle}</button>
      </div>
      <div className="mb-pill main">
        {([["select", X.select, "Select"], [null, X.notes, "Notes and docs"], [null, X.tpl, "Templates"], ["sticky", X.sticky, "Sticky note"], ["text", X.text, "Text"]] as [Tool | null, React.ReactNode, string][]).map(([t, ic, label]) => t
          ? <button key={t} className={"mb-t" + (tool === t ? " on" : "")} aria-pressed={tool === t} title={`${label} (${TOOLS.find(x => x.tool === t)!.key.toUpperCase()})`} aria-label={label} data-tool={t} onClick={() => { setTool(t); setEdit(null); setFly(""); }}>{ic}</button>
          : <button key={label} className="mb-t" title={label} aria-label={label} onClick={() => { setFly(""); flash(`${label} aren't in MiroIsDead yet`); }}>{ic}</button>)}
        <button className={"mb-t" + (fly === "shapes" || ["rect", "ellipse", "diamond", "connector"].includes(tool) ? " on" : "")} aria-label="Shapes and lines" title="Shapes and lines" aria-expanded={fly === "shapes"} onClick={() => setFly(f => f === "shapes" ? "" : "shapes")}>{X.shapes}</button>
        <button className={"mb-t" + (tool === "pen" ? " on" : "")} aria-pressed={tool === "pen"} title="Pen (P)" aria-label="Pen" data-tool="pen" onClick={() => { setTool("pen"); setEdit(null); setFly(""); }}>{X.pen}</button>
        <button className={"mb-t" + (tool === "frame" ? " on" : "")} aria-pressed={tool === "frame"} title="Frame (F)" aria-label="Frame" data-tool="frame" onClick={() => { setTool("frame"); setEdit(null); setFly(""); }}>{X.frame}</button>
        <button className="mb-t" title="Stickers and icons" aria-label="Stickers and icons" onClick={() => { setFly(""); flash("Stickers aren't in MiroIsDead yet"); }}>{X.palette}</button>
        <button className="mb-t" title="Comment" aria-label="Comment" onClick={() => { setFly(""); flash("Comments aren't in MiroIsDead yet"); }}>{X.comment}</button>
        <button className={"mb-t" + (fly === "more" || tool === "hand" || tool === "eraser" ? " on" : "")} aria-label="More tools" title="More tools" aria-expanded={fly === "more"} onClick={() => setFly(f => f === "more" ? "" : "more")}>{X.plus}</button>
      </div>
      <div className="mb-pill hist">
        <button className="mb-t" disabled={!canUndo(hist)} onClick={doUndo} title="Undo (⌘Z)" aria-label="Undo">{X.undo}</button>
        <button className="mb-t" disabled={!canRedo(hist)} onClick={doRedo} title="Redo (⇧⌘Z)" aria-label="Redo">{X.redo}</button>
      </div>
      <div className={"mb-fly shapes" + (fly === "shapes" ? " open" : "")} role="menu">
        {([["Line", X.line, "connector", "L", { style: "straight", arrow: false }], ["Arrow", X.arrow, "connector", "", { style: "straight", arrow: true }], ["Elbow arrow", X.elbow, "connector", "C", { style: "elbow", arrow: true }], ["Block arrow", X.blockArrow, null, "", null]] as [string, React.ReactNode, Tool | null, string, { style: ConnectorStyle; arrow: boolean } | null][]).map(([label, ic, t, k, cfg]) =>
          <button key={label} role="menuitem" className={"mb-f" + (t === "connector" && tool === "connector" && cfg && last.current.line === label ? " on" : "")} data-tool={label === "Elbow arrow" ? "connector" : undefined} aria-pressed={label === "Elbow arrow" ? tool === "connector" : undefined} onClick={() => { if (!t || !cfg) { flash("Block arrows aren't in MiroIsDead yet"); return; } last.current.connectorStyle = cfg.style; last.current.arrow = cfg.arrow; last.current.line = label; setTool("connector"); setEdit(null); setFly(""); }}><span className="ic">{ic}</span>{label}<kbd>{k}</kbd></button>)}
        <hr />
        {([["Rectangle", X.rect, "rect", "R", "rect"], ["Oval", X.oval, "ellipse", "O", "rect"], ["Rhombus", X.rhombus, "diamond", "D", "rect"], ["Triangle", X.triangle, "rect", "", "triangle"]] as [string, React.ReactNode, Tool, string, ShapeObj["shape"]][]).map(([label, ic, t, k, sh]) =>
          <button key={label} role="menuitem" className={"mb-f" + (tool === t && (label === "Triangle" ? last.current.shape === "triangle" : t !== "rect" || last.current.shape !== "triangle") ? " on" : "")} data-tool={label === "Rectangle" ? "rect" : label === "Oval" ? "ellipse" : label === "Rhombus" ? "diamond" : undefined} aria-pressed={label === "Rectangle" ? tool === "rect" : label === "Oval" ? tool === "ellipse" : label === "Rhombus" ? tool === "diamond" : undefined} onClick={() => { last.current.shape = sh; setTool(t); setEdit(null); setFly(""); }}><span className="ic">{ic}</span>{label}<kbd>{k}</kbd></button>)}
        <button role="menuitem" className="mb-f" onClick={() => { setFly(""); flash("Divider isn't in MiroIsDead yet"); }}><span className="ic">{X.divider}</span>Divider</button>
        <button role="menuitem" className="mb-f plain" onClick={() => { setFly(""); flash("More shapes are coming. Contributions welcome.") }}>More shapes</button>
        <hr />
        <button role="menuitem" className="mb-f" onClick={() => { setFly(""); flash("Diagramming from text isn't in MiroIsDead yet"); }}><span className="ic">{X.diagram}</span>Diagram</button>
      </div>
      <div className={"mb-fly more" + (fly === "more" ? " open" : "")} role="menu">
        <button role="menuitem" className={"mb-f" + (tool === "hand" ? " on" : "")} data-tool="hand" aria-pressed={tool === "hand"} onClick={() => { setTool("hand"); setEdit(null); setFly(""); }}><span className="ic">{X.hand}</span>Hand<kbd>H</kbd></button>
        <button role="menuitem" className={"mb-f" + (tool === "eraser" ? " on" : "")} data-tool="eraser" aria-pressed={tool === "eraser"} onClick={() => { setTool("eraser"); setEdit(null); setFly(""); }}><span className="ic">{X.eraser}</span>Eraser<kbd>E</kbd></button>
        <hr />
        <button role="menuitem" className="mb-f" onClick={() => { setMap(m => !m); setFly(""); }}><span className="ic">{X.map}</span>Minimap<kbd>M</kbd></button>
        <button role="menuitem" className="mb-f" onClick={() => { setHelp(true); setFly(""); }}><span className="ic">{X.keys}</span>Keyboard shortcuts<kbd>?</kbd></button>
      </div>
    </nav>

    <div ref={box} className="mi-canvas" tabIndex={0} data-testid="canvas" style={{ cursor, backgroundSize: `${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, ${gridSize * 3}px ${gridSize * 3}px, ${gridSize * 3}px ${gridSize * 3}px`, backgroundPosition: bgPos }}
      onMouseDown={e => { if (!(e.target as Element).closest("[data-ui]")) e.preventDefault(); }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onContextMenu={e => e.preventDefault()}>
      <svg width={size.w} height={size.h} style={{ display: "block", overflow: "hidden" }}>
        <Defs />
        <g transform={`translate(${size.w / 2 - view.x * z} ${size.h / 2 - view.y * z}) scale(${z})`}>
          <Scene doc={doc} editing={edit?.id} />
          {/* selection chrome */}
          {tool === "select" && selObjs.map(o => { const b = boundsOf(doc, o); return o.type === "connector" ? <path key={o.id} d={routeConnector(doc, o).path} fill="none" stroke="#4262FF" strokeWidth={px(5)} opacity={0.25} /> : <rect key={o.id} x={b.x - px(2)} y={b.y - px(2)} width={b.w + px(4)} height={b.h + px(4)} fill="none" stroke="#4262FF" strokeWidth={px(1.5)} />; })}
          {tool === "select" && selObjs.length > 1 && selBounds && <rect x={selBounds.x - px(6)} y={selBounds.y - px(6)} width={selBounds.w + px(12)} height={selBounds.h + px(12)} fill="none" stroke="#4262FF" strokeWidth={px(1)} strokeDasharray={`${px(5)} ${px(4)}`} />}
          {tool === "select" && one && isBox(one) && !edit && <>
            {HANDLES.map(h => { const p = handlePt(boxOf(one), h), edge = h.length === 1; return <circle key={h} data-h={h} data-testid={`handle-${h}`} cx={p.x} cy={p.y} r={px(edge ? 7 : 6.5)} fill={one.type === "sticky" && edge ? "transparent" : "#fff"} stroke={one.type === "sticky" && edge ? "transparent" : "#8E8E93"} strokeWidth={px(2)} style={{ cursor: CURSOR[h] }} />; })}
            {(one.type === "sticky" || one.type === "shape") && (["n", "e", "s", "w"] as Side[]).map(sd => { const a = anchorPoint(boxOf(one), sd), off = px(22); return <g key={sd} data-h={`dot:${sd}`} data-testid={`dot-${sd}`} style={{ cursor: "copy" }}><circle cx={a.x + DIR[sd].x * off} cy={a.y + DIR[sd].y * off} r={px(9)} fill="transparent" /><circle cx={a.x + DIR[sd].x * off} cy={a.y + DIR[sd].y * off} r={px(3.5)} fill="#4262FF" /></g>; })}
          </>}
          {tool === "select" && one?.type === "connector" && !edit && (() => { const r = resolveConnector(doc, one); return [["ca", r.a], ["cb", r.b]].map(([id, p]) => <circle key={id as string} data-h={id as string} data-testid={`conn-${id}`} cx={(p as Pt).x} cy={(p as Pt).y} r={px(7)} fill="#fff" stroke="#4262FF" strokeWidth={px(2)} style={{ cursor: "grab" }} />); })()}
          {/* snapping guides, marquee, drafts */}
          {guides.map((gd, i) => gd.axis === "x" ? <line key={i} x1={gd.at} x2={gd.at} y1={gd.from - px(12)} y2={gd.to + px(12)} stroke="#E0457B" strokeWidth={px(1)} strokeDasharray={`${px(5)} ${px(4)}`} /> : <line key={i} y1={gd.at} y2={gd.at} x1={gd.from - px(12)} x2={gd.to + px(12)} stroke="#E0457B" strokeWidth={px(1)} strokeDasharray={`${px(5)} ${px(4)}`} />)}
          {marq && <rect x={marq.x} y={marq.y} width={marq.w} height={marq.h} fill="rgba(66,98,255,.08)" stroke="#4262FF" strokeWidth={px(1)} />}
          {draft?.kind === "box" && (draft.tool === "frame" ? <rect {...draft.box} fill="rgba(255,255,255,.5)" stroke="#4262FF" strokeWidth={px(1.5)} strokeDasharray={`${px(6)} ${px(4)}`} /> : draft.tool === "sticky" || draft.tool === "text" ? null : <g transform={`translate(${draft.box.x} ${draft.box.y})`}><path d={shapePath(draft.tool === "ellipse" ? "ellipse" : draft.tool === "diamond" ? "diamond" : "rect", draft.box.w, draft.box.h)} fill="rgba(66,98,255,.08)" stroke="#4262FF" strokeWidth={px(1.5)} strokeDasharray={`${px(6)} ${px(4)}`} /></g>)}
          {draft?.kind === "pen" && <path d={penPath(draft.pts)} fill="none" stroke={last.current.penColor} strokeWidth={last.current.penWidth} strokeLinecap="round" strokeLinejoin="round" />}
          {draft?.kind === "conn" && <path d={`M${draft.a.x} ${draft.a.y}L${draft.b.x} ${draft.b.y}`} stroke="#4262FF" strokeWidth={px(2)} strokeDasharray={`${px(6)} ${px(4)}`} fill="none" />}
        </g>
      </svg>
      {edit && doc.objects[edit.id] && <TextEditor key={edit.id} doc={doc} id={edit.id} view={view} size={size} onDone={finishEdit} />}
      {sBox && !edit && !g.current && tool === "select" && <SelectionToolbar doc={doc} ids={sel} screenBox={sBox} canvas={size} patch={patchSel} onDelete={del} onDuplicate={dup} onFront={() => commitDoc(bringToFront(doc, sel))} onBack={() => commitDoc(sendToBack(doc, sel))} onFrame={frameSel} onAlign={(a: Align) => commitDoc(align(doc, sel, a))} onDistribute={a => commitDoc(distribute(doc, sel, a))} />}
    </div>

    {(edit || tool !== "select" || sel.length > 0 || doc.order.length === 0) && <div className={"mi-hint" + (doc.order.length === 0 && chips && !edit ? " hi" : "")} data-ui data-testid={doc.order.length === 0 && !edit ? "empty-hint" : "hint"}>{hint}</div>}
    {chips && doc.order.length === 0 && !edit && <div className="mb-chips" data-ui>
      <button onClick={() => flash("AI board starters aren't in MiroIsDead yet")}><i className="c1" />Prep a workshop</button><button onClick={() => flash("AI board starters aren't in MiroIsDead yet")}><i className="c2" />Map a process</button><button onClick={() => flash("AI board starters aren't in MiroIsDead yet")}><i className="c3" />Build a roadmap</button>
      <button className="x" aria-label="Dismiss suggestions" onClick={() => setChips(false)}>{X.close}</button></div>}
    <div className="mb-ai" data-ui onClick={() => flash("Use “Copy scene JSON for an AI agent” in Export to bring your own AI")}>{X.plusS}<span>Where shall we start?</span>{X.mic}</div>
    <div className="mb-zoom" data-ui>
      <button className="mb-t sm" onClick={fitAll} aria-label="Fit all" title="Fit all (⇧1)">{X.fit}</button>
      <button className="mb-t sm" onClick={() => zoomBy(0.8)} aria-label="Zoom out" title="Zoom out (−)">{X.minus}</button>
      <button className="mb-zv" onClick={() => setView(v => zoomAt(v, size, { x: size.w / 2, y: size.h / 2 }, 1))} title="Reset to 100% (⌘0)" data-testid="zoom-level">{Math.round(z * 100)}%</button>
      <button className="mb-t sm" onClick={() => zoomBy(1.25)} aria-label="Zoom in" title="Zoom in (+)">{X.plusS}</button>
      <button className="mb-t sm" onClick={() => setHelp(true)} aria-label="Keyboard shortcuts" title="Keyboard shortcuts (?)">{X.help}</button>
    </div>
    {status !== "saved" && <div className="mb-save" data-ui>{statusText}</div>}
    {share && <ShareModal tab={share} setTab={setShare} onClose={() => setShare("")} who={who} onCopy={() => { navigator.clipboard?.writeText(location.href).then(() => flash("Link copied"), () => flash("Couldn't copy")); }} onExportSvg={() => { download(`${title || "board"}.svg`, "image/svg+xml", boardToSvg(doc)); }} onExportJson={() => download(`${title || "board"}.miroisdead.json`, "application/json", serialize(boardRef.current))} />}
    {map && <Minimap doc={doc} view={view} size={size} onJump={(x, y) => setView(v => ({ ...v, x, y }))} />}
    {help && <ShortcutSheet onClose={() => setHelp(false)} />}
    {toast && <div className="mi-toast" role="status">{toast}</div>}
  </div>;
}

/** In-place text editing over the object (stickies shrink-to-fit live while you type). */
function TextEditor({ doc, id, view, size, onDone }: { doc: Doc; id: Id; view: View; size: { w: number; h: number }; onDone: (text: string, then?: "tab" | "shifttab") => void }) {
  const o = doc.objects[id]!; const ref = useRef<HTMLDivElement>(null); const [text, setText] = useState(textOf(o)); const done = useRef(false);
  useLayoutEffect(() => { const el = ref.current!; el.textContent = textOf(o); el.focus(); const r = document.createRange(); r.selectNodeContents(el); r.collapse(false); const s = getSelection(); s?.removeAllRanges(); s?.addRange(r); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  const z = view.zoom, to = (p: Pt) => worldToScreen(view, size, p);
  let b: Box, fs: number, align: "center" | "left" = "center", weight = 400, pad = 14, color = "#1C1C1E", bg = "transparent", singleLine = false;
  if (o.type === "connector") { const c = routeConnector(doc, o).label; b = { x: c.x - 70, y: c.y - 13, w: 140, h: 26 }; fs = 13; singleLine = true; bg = "#fff"; pad = 4; }
  else if (o.type === "frame") { b = { x: o.x, y: o.y - 30, w: Math.max(200, Math.min(o.w, 360)), h: 26 }; fs = 14; weight = 600; align = "left"; singleLine = true; pad = 0; color = "#555A6A"; }
  else { b = boxOf(o as any); if (o.type === "sticky") fs = o.fontSize === "auto" ? fitFontSize(text, o.w, o.h) : o.fontSize; else if (o.type === "shape") fs = o.fontSize; else if (o.type === "text") { fs = o.fontSize; align = "left"; pad = 0; weight = o.bold ? 700 : 400; color = o.color; } else fs = 16; }
  if (o.type === "shape") { const tw = o.shape === "diamond" ? 0.55 : o.shape === "triangle" ? 0.5 : o.shape === "ellipse" ? 0.78 : 0.9; b = { x: o.x + (o.w * (1 - tw)) / 2, y: o.y + 6, w: o.w * tw, h: o.h - 12 }; pad = 2; }
  const p = to({ x: b.x, y: b.y });
  const finish = (then?: "tab" | "shifttab") => { if (done.current) return; done.current = true; onDone(ref.current?.innerText.replace(/\n$/, "") ?? text, then); };
  return <div className="mi-editor" data-ui style={{ left: p.x, top: p.y, width: b.w * z, height: Math.max(b.h * z, fs * z * 1.6), display: "flex", alignItems: o.type === "text" || o.type === "frame" ? "flex-start" : "center", justifyContent: align === "center" ? "center" : "flex-start" }}>
    <div ref={ref} contentEditable suppressContentEditableWarning role="textbox" aria-label="Edit text" data-testid="text-editor" spellCheck={false}
      style={{ width: "100%", outline: "none", textAlign: align, fontSize: fs * z, lineHeight: LINE_HEIGHT, fontWeight: weight, padding: pad * z, color, background: bg, whiteSpace: singleLine ? "nowrap" : "pre-wrap", overflowWrap: "anywhere", fontFamily: "var(--ids-font-sans)", caretColor: "#4262FF", borderRadius: 4 }}
      onInput={e => setText((e.target as HTMLElement).innerText)} onBlur={() => finish()}
      onPaste={e => { e.preventDefault(); document.execCommand("insertText", false, e.clipboardData.getData("text/plain")); }}
      onKeyDown={e => {
        e.stopPropagation();
        if (e.key === "Escape") { e.preventDefault(); finish(); }
        else if (e.key === "Enter" && (e.metaKey || e.ctrlKey || singleLine)) { e.preventDefault(); finish(); }
        else if (e.key === "Tab" && (o.type === "sticky" || o.type === "shape")) { e.preventDefault(); finish(e.shiftKey ? "shifttab" : "tab"); }
        else if (e.key === "Tab") e.preventDefault();
      }} />
  </div>;
}

function ShareModal({ tab, setTab, onClose, who, onCopy, onExportSvg, onExportJson }: { tab: "Invite" | "Embed" | "Publish" | "AI"; setTab: (t: "Invite" | "Embed" | "Publish" | "AI") => void; onClose: () => void; who: string; onCopy: () => void; onExportSvg: () => void; onExportJson: () => void }) {
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [onClose]);
  return <div className="mb-scrim" data-ui onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="mb-share" role="dialog" aria-label="Share board" data-testid="share-modal">
      <div className="mb-tabs" role="tablist">{(["Invite", "Embed", "Publish", "AI"] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}{t === "AI" && <span className="mb-aiic"><i className="a" /><i className="b" /><i className="c" /><em>+</em></span>}</button>)}</div>
      {tab === "Invite" && <>
        <label className="mb-mail">{X.invite}<input autoFocus placeholder="Enter emails or invite from Slack, Google or Microsoft" /></label>
        <div className="mb-linkrow">{X.link}<span className="url">{typeof location !== "undefined" ? location.href : ""}</span><button className="mb-can">Can edit {X.chev}</button><button className="mb-copy" onClick={onCopy}>Copy team invite link</button></div>
        <div className="mb-acc">Board access</div>
        <div className="mb-who"><i>{(who[0] ?? "T").toUpperCase()}</i>You haven&apos;t invited anyone to your team yet {X.info}</div>
        <div className="mb-any">{X.globe}<span>Anyone with the link</span><button>No access {X.chev}</button></div>
      </>}
      {tab === "Embed" && <p className="mb-note">Boards in MiroIsDead are private to your account, so there is nothing to embed yet. Export an SVG to drop the board into a doc or a slide.</p>}
      {tab === "Publish" && <div className="mb-note"><p>Take a copy of this board with you.</p><div className="mb-exp"><button className="mb-copy" onClick={onExportSvg}>Download SVG</button><button className="mb-can" onClick={onExportJson}>Download board file (.json)</button></div></div>}
      {tab === "AI" && <p className="mb-note">Bring your own AI: use Export, then “Copy scene JSON for an AI agent”, and paste it into any assistant.</p>}
    </div>
  </div>;
}
