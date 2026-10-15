"use client";
import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import type { Board, Box, Doc, End, Id, Obj, Pt, Side, View, ShapeObj, StickyObj, ConnectorStyle, CommentObj, BoardAccess, ImageObj } from "@/lib/canvas/types";
import { ShareModal, type ShareTab } from "./ShareModal";
import { STICKY_COLORS, isBox } from "@/lib/canvas/types";
import { DIR, OPPOSITE, anchorPoint, boxOf, normBox, simplify, snapBox, unionBox, type Guide } from "@/lib/canvas/geometry";
import { prepareImage, isImageFile } from "@/lib/image";
import { StickerPanel } from "./Stickers";
import { track, EVENTS } from "@/lib/analytics";
import { STICKY_SIZE, addObjects, align, bringToFront, cloneObjects, connector, createConnected, distribute, frame, frameAround, groupObjects, moveObjects, nid, pasteObjects, pen, removeObjects, resizeObject, sendToBack, shape, sticky, textObj, ungroupObjects, updateObjects, withFrameChildren, withGroups, type Align } from "@/lib/canvas/doc";
import { boundsOf, resolveConnector, routeConnector } from "@/lib/canvas/connectors";
import { hitTest, marquee } from "@/lib/canvas/hit";
import { LINE_HEIGHT, fitFontSize, wrapText } from "@/lib/canvas/text";
import { checkpoint, commit, createHistory, redo, replace, undo, canRedo, canUndo, type History } from "@/lib/canvas/history";
import { MAX_ZOOM, MIN_ZOOM, fitView, panBy, screenToWorld, worldToScreen, zoomAt } from "@/lib/canvas/viewport";
import { describeScene } from "@/lib/canvas/scene";
import { serialize, sanitizeDoc } from "@/lib/canvas/board";
import { KEY_TO_TOOL, TOOLS, type Tool } from "@/lib/shortcuts";
import type { BoardStore } from "@/lib/store";
import { Defs, Scene, shapePath, penPath } from "./Scene";
import { boardToSvg } from "./exportSvg";
import { I, Mark } from "./icons";
import { X } from "@/components/mxi";
import { BP } from "@/lib/basepath";
import "@/components/miboard.css";
import { SelectionToolbar } from "./SelectionToolbar";
import { Minimap } from "./Minimap";
import { CommandPalette, PresentBar, type Command, ContextMenu, EmojiPicker, ExportMenu, FramesPanel, HelpMenu, MainMenu, ShortcutsPanel, StickyPicker, ToolsPanel, ZoomMenu, type ToolEntry } from "./Menus";
import { svgToPngBlob, boardToCsv, saveCustomTemplate, openPrintWindow } from "./exportMore";
import { CommentThread, CommentsPanel } from "./Comments";
import { LiveChannel, PEER_COLORS, type LiveMsg, type Peer } from "@/lib/live";
import { RtcMesh } from "@/lib/rtc";
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import { PeerCursors, PeerAvatars, type PeerState } from "./Live";
import { FacilitationPopover, Reactions, TimerPanel, TimerChip, VotingPanel, NotePanel, type Timer, type Voting } from "./Facilitation";

type Gesture =
  | { k: "pan"; sx: number; sy: number; v: View }
  | { k: "move"; ids: Id[]; start: Doc; w0: Pt; cp: boolean; dup: boolean; clickId: Id | null; shift: boolean; moved: boolean; was: boolean }
  | { k: "resize"; id: Id; h: string; start: Doc; b0: Box; cp: boolean }
  | { k: "rot"; id: Id; c: Pt; a0: number; r0: number; start: Doc; cp: boolean }
  | { k: "gresize"; ids: Id[]; h: string; start: Doc; b0: Box; cp: boolean }
  | { k: "grot"; ids: Id[]; c: Pt; a0: number; start: Doc; cp: boolean; last: number }
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

export function Editor({ initial, store, who, signOutAction, readOnly = false, guest = false, embed = false, startFrame, rtc = null }: { initial: Board; store: BoardStore; who: string; signOutAction?: () => void | Promise<void>; readOnly?: boolean; guest?: boolean; embed?: boolean; startFrame?: string; rtc?: FirebaseClientConfig | null }) {
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
  const [banner, setBanner] = useState(false); // the "turn on notifications" banner is gone by owner request
  const [access, setAccess] = useState<BoardAccess>(initial.access ?? "none");
  const [fly, setFly] = useState<"" | "shapes" | "more">("");
  const [firstRun, setFirstRun] = useState(false); // tool hints are onboarding only: shown until the first board has 8 objects, then never again
  useEffect(() => { try { setFirstRun(localStorage.getItem("mi-onboarded") !== "1"); } catch { /* ignore */ } }, []);
  useEffect(() => { if (!fly) return; const f = (e: PointerEvent) => { const t = e.target as Element; if (!t.closest(".mb-fly") && !t.closest('[aria-label="Shapes and lines"]')) setFly(""); }; window.addEventListener("pointerdown", f, true); return () => window.removeEventListener("pointerdown", f, true); }, [fly]);
  const [share, setShare] = useState<"" | ShareTab>("");
  const [titlePrompt, setTitlePrompt] = useState<string | null>(null); // "Give your board a title" before the first Share (Miro)
  const [imgOpts, setImgOpts] = useState<null | { area: "board" | "selection"; quality: "small" | "medium" | "large"; bg: boolean }>(null);
  useEffect(() => { if (location.hash === "#share" && !guest) { setShare("Invite"); history.replaceState(null, "", location.pathname + location.search); } }, [guest]); // dashboard row menu › Share
  const [prof, setProf] = useState(false);
  const [chips, setChips] = useState(true);
  const [main, setMain] = useState(false);
  const [zoomMenu, setZoomMenu] = useState(false);
  const [helpMenu, setHelpMenu] = useState(false);
  const [ctx, setCtx] = useState<{ x: number; y: number; id: Id | null } | null>(null);
  const [frames, setFrames] = useState(false);
  const [tools, setTools] = useState(false);
  const [emojiPick, setEmojiPick] = useState(false);
  const [emoji, setEmoji] = useState(initial.emoji ?? "");
  const [grid, setGrid] = useState(true);
  const [snap, setSnap] = useState(true);
  const [dims, setDims] = useState(false);
  const styleClip = useRef<Partial<Obj> | null>(null);
  const [fac, setFac] = useState(false);
  const [thread, setThread] = useState<Id | null>(null);
  const [palette, setPalette] = useState(false);
  const [stickers, setStickers] = useState(false);
  const [dropping, setDropping] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const [, setTick] = useState(0);
  // ---- live session (cursors, presence, document relay) ----
  const me = useRef<Peer>({ id: Math.random().toString(36).slice(2, 10), name: who.split("@")[0] || "Guest", color: PEER_COLORS[Math.floor(Math.random() * PEER_COLORS.length)] });
  const live = useRef<LiveChannel | null>(null);
  const [peers, setPeers] = useState<Record<string, PeerState>>({});
  const remoteRev = useRef(0), localRev = useRef(0), applyingRemote = useRef(false), lastCursor = useRef(0), docTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const proto = location.protocol === "https:" ? "wss:" : "ws:"; const ch = new LiveChannel(`${proto}//${location.host}${BP}/api/live/${initial.id}`, initial.id, me.current); live.current = ch;
    const off = ch.on((m: LiveMsg) => {
      if (m.t === "leave") { const id = m.id ?? m.from?.id; if (id) setPeers(p => { const n = { ...p }; delete n[id]; return n; }); return; }
      const from = m.from; setPeers(p => ({ ...p, [from.id]: { ...from, ...(p[from.id] ?? {}), seen: Date.now(), ...(m.t === "cursor" ? { x: m.x, y: m.y } : {}), ...(m.t === "sel" ? { sel: m.ids } : {}) } }));
      if (m.t === "hello") ch.send({ t: "hello", from: me.current });
      if (m.t === "doc" && m.rev > remoteRev.current) { remoteRev.current = m.rev; applyingRemote.current = true; setHist(h => replace(h, sanitizeDoc(m.doc))); }
    });
    if (rtc) { const mesh = new RtcMesh(initial.id, me.current); void mesh.start(rtc, `${BP}/api/session/token`).then(ok => { if (ok && live.current === ch) ch.attachMesh(mesh); else mesh.close(); }); }
    const sweep = setInterval(() => setPeers(p => { const n: typeof p = {}; for (const k in p) if (Date.now() - p[k].seen < 30000) n[k] = p[k]; return Object.keys(n).length === Object.keys(p).length ? p : n; }), 10000);
    return () => { off(); clearInterval(sweep); ch.close(); live.current = null; };
  }, [initial.id, rtc]);
  useEffect(() => { if (applyingRemote.current) { applyingRemote.current = false; return; } if (first.current) return; if (docTimer.current) clearTimeout(docTimer.current); docTimer.current = setTimeout(() => { localRev.current = Math.max(localRev.current, remoteRev.current) + 1; remoteRev.current = localRev.current; live.current?.send({ t: "doc", from: me.current, doc: hist.present, rev: localRev.current }); }, 150); }, [hist.present]);
  useEffect(() => { live.current?.send({ t: "sel", from: me.current, ids: sel }); }, [sel]);
  useEffect(() => { const i = setInterval(() => live.current?.send({ t: "hello", from: me.current }), 15000); return () => clearInterval(i); }, []);
  const [online, setOnline] = useState(true);
  const [present, setPresent] = useState<{ i: number } | null>(null);
  const [commentsPanel, setCommentsPanel] = useState(false);
  const [hideComments, setHideComments] = useState(false);
  const [timer, setTimer] = useState<Timer>(null);
  const [timerOpen, setTimerOpen] = useState(false);
  const [voting, setVoting] = useState<Voting>(null);
  const [votingOpen, setVotingOpen] = useState(false);
  const [priv, setPriv] = useState(false);
  const [note, setNote] = useState(initial.note ?? "");
  const [noteOpen, setNoteOpen] = useState(false);
  const [reacts, setReacts] = useState<{ id: number; e: string; x: number }[]>([]);
  const react = (e: string) => { track(EVENTS.board_reaction_sent, { emoji: e }); const id = Date.now() + Math.random(); setReacts(r => [...r, { id, e, x: 44 + Math.random() * 12 }]); setTimeout(() => setReacts(r => r.filter(x => x.id !== id)), 2200); };
  const doc = hist.present;

  const box = useRef<HTMLDivElement>(null);
  const g = useRef<Gesture | null>(null);
  const R = useRef({ doc, view, sel, tool, size, edit, title, space, thread });
  R.current = { doc, view, sel, tool, size, edit, title, space, thread };
  const clip = useRef<Obj[]>([]);
  const pasteN = useRef(0);
  const last = useRef<Last>({ stickyColor: STICKY_COLORS[0], fill: "#FFFFFF", stroke: "#1C1C1E", penColor: "#1C1C1E", penWidth: 3, textColor: "#1C1C1E", connectorStyle: "straight", shape: "rect", arrow: true, line: "Elbow arrow" });
  const lastClick = useRef({ t: 0, id: "" });
  const snapRef = useRef(true);
  const votingRef = useRef<Voting>(null); votingRef.current = voting;

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
  const board = useMemo<Board>(() => ({ ...initial, title, doc, view, emoji, note, access, updatedAt: Date.now() }), [initial, title, doc, view, emoji, note, access]);
  const boardRef = useRef(board); boardRef.current = board;
  const saveNow = useCallback(async () => {
    setStatus("saving");
    try { await store.save({ ...boardRef.current, updatedAt: Date.now() }); setStatus("saved"); }
    catch { setStatus(store.kind === "cloud" ? "device" : "error"); }
  }, [store]);
  useEffect(() => { setOnline(navigator.onLine); const on = () => { setOnline(true); void saveNow(); }; const off = () => setOnline(false); window.addEventListener("online", on); window.addEventListener("offline", off); return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); }; }, [saveNow]);
  useEffect(() => { if (first.current) { first.current = false; return; } if (readOnly) return; setStatus("saving"); const t = setTimeout(saveNow, 600); return () => clearTimeout(t); }, [doc, title, view, emoji, note, access, saveNow, readOnly]);
  useEffect(() => { if (!startFrame) return; const d = R.current.doc; const f = d.order.find(i => d.objects[i].type === "frame"); if (f) setView(fitView(boundsOf(d, d.objects[f]), R.current.size, 40)); }, [startFrame]);
  useEffect(() => { const f = () => { void store.save({ ...boardRef.current, updatedAt: Date.now() }).catch(() => {}); }; window.addEventListener("pagehide", f); const v = () => document.visibilityState === "hidden" && f(); document.addEventListener("visibilitychange", v); return () => { window.removeEventListener("pagehide", f); document.removeEventListener("visibilitychange", v); }; }, [store]);

  // ---- coordinates ----
  const rect = () => box.current!.getBoundingClientRect();
  const toWorld = (e: { clientX: number; clientY: number }): Pt => { const r = rect(); return screenToWorld(R.current.view, R.current.size, { x: e.clientX - r.left, y: e.clientY - r.top }); };
  const tol = () => 6 / R.current.view.zoom;

  // ---- actions ----
  const selectOnly = (ids: Id[]) => setSel(ids);
  const startEdit = (id: Id, isNew = false) => { setEdit({ id, isNew }); setSel([id]); };
  const backToSelect = () => setTool("select");
  const convertSel = (t: "sticky" | "shape" | "text") => { const { doc: d, sel: s } = R.current; let nd = d; const ids: Id[] = [];
    for (const id of s) { const o = d.objects[id]; if (!o || !isBox(o) || o.type === t || !(o.type === "sticky" || o.type === "shape" || o.type === "text")) continue; const text = (o as { text?: string }).text ?? "";
      const n: Obj = t === "sticky" ? sticky(o.x, o.y, { w: o.w, h: o.h, text, color: last.current.stickyColor }) : t === "shape" ? shape(o.x, o.y, { w: o.w, h: o.h, text, fill: last.current.fill, stroke: last.current.stroke }) : textObj(o.x, o.y, { w: o.w, text, color: last.current.textColor });
      nd = addObjects(removeObjects(nd, [id]), [n]); ids.push(n.id); }
    if (ids.length) { commitDoc(nd); setSel(ids); } };
  const patchSel = (p: Partial<Obj> | ((o: Obj) => Partial<Obj>), remember?: Record<string, unknown>) => { commitDoc(updateObjects(R.current.doc, R.current.sel, p)); if (remember) Object.assign(last.current, remember); };
  const del = () => { const { doc: d, sel: s } = R.current; if (!s.length) return; commitDoc(removeObjects(d, s)); setSel([]); };
  const regroup = (objs: Obj[]): Obj[] => { const map = new Map<string, string>(); return objs.map(o => { if (!o.group) return o; if (!map.has(o.group)) map.set(o.group, nid()); return { ...o, group: map.get(o.group) } as Obj; }); };
  const dup = () => { const { doc: d, sel: s } = R.current; if (!s.length) return; const c = cloneObjects(d, s); commitDoc(addObjects(d, regroup(c.objs))); setSel([]); };
  const groupSel = () => { const { doc: d, sel: s } = R.current; if (s.length < 2) { flash("Select two or more objects to group"); return; } commitDoc(groupObjects(d, s)); track(EVENTS.board_group_changed, { action: "group", count: s.length }); flash("Grouped"); };
  const ungroupSel = () => { const { doc: d, sel: s } = R.current; if (!s.some(i => d.objects[i]?.group)) return; commitDoc(ungroupObjects(d, s)); track(EVENTS.board_group_changed, { action: "ungroup" }); flash("Ungrouped"); };
  const copy = (cut: boolean) => { const { doc: d, sel: s } = R.current; if (!s.length) return; const set = new Set(s); clip.current = d.order.filter(i => set.has(i)).map(i => d.objects[i]); pasteN.current = 0; navigator.clipboard?.writeText("MiroIsDead board objects").catch(() => {}); if (cut) del(); else flash(`Copied ${s.length} object${s.length > 1 ? "s" : ""}`); };
  const paste = () => { if (!clip.current.length) return false; pasteN.current++; const o = 24 * pasteN.current; const r = pasteObjects(R.current.doc, clip.current, o, o); commitDoc(r.doc); setSel(r.ids); return true; };
  const fitAll = () => { const { doc: d, size: s } = R.current; setView(fitView(unionBox(d.order.map(i => boundsOf(d, d.objects[i]))), s)); };
  const fitSel = () => { const { doc: d, size: s, sel: ss } = R.current; const b = unionBox(ss.map(i => d.objects[i]).filter(Boolean).map(o => boundsOf(d, o))); if (b) setView(fitView(b, s)); };
  const zoomBy = (f: number) => setView(v => zoomAt(v, R.current.size, { x: R.current.size.w / 2, y: R.current.size.h / 2 }, v.zoom * f));
  const zoomTo = (zz: number) => setView(v => zoomAt(v, R.current.size, { x: R.current.size.w / 2, y: R.current.size.h / 2 }, zz));
  const fullscreen = () => { const el = box.current?.closest(".mi-app") as HTMLElement | null; if (document.fullscreenElement) void document.exitFullscreen(); else void el?.requestFullscreen?.(); };
  const jumpTo = (id: Id) => { const o = R.current.doc.objects[id]; if (!o) return; setView(fitView(boundsOf(R.current.doc, o), R.current.size, 120)); setSel([id]); };
  const exportPdf = () => { track(EVENTS.board_exported, { format: "pdf" }); openPrintWindow(title || "board", boardToSvg(doc)); };
  const exportPng = async (o: { area: "board" | "selection"; quality: "small" | "medium" | "large"; bg: boolean } = { area: "board", quality: "medium", bg: true }) => { track(EVENTS.board_exported, { format: "png", area: o.area, quality: o.quality }); try { const src = o.area === "selection" && R.current.sel.length ? (() => { const keep = new Set(withFrameChildren(doc, R.current.sel)); return { ...doc, order: doc.order.filter(i => keep.has(i)) }; })() : doc; const blob = await svgToPngBlob(boardToSvg(src, { background: o.bg ? undefined : null }), { small: 1, medium: 2, large: 4 }[o.quality]); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `${title || "board"}.png`; a.click(); setTimeout(() => URL.revokeObjectURL(a.href), 2000); } catch { flash("Couldn't render the image"); } };
  const exportCsv = () => { track(EVENTS.board_exported, { format: "csv" }); download(`${title || "board"}.csv`, "text/csv", boardToCsv(doc)); };
  const exportBackup = () => { track(EVENTS.board_exported, { format: "json" }); download(`${title || "board"}.miroisdead.json`, "application/json", serialize(boardRef.current)); };
  const saveTemplate = () => { track(EVENTS.board_exported, { format: "template" }); saveCustomTemplate(boardRef.current); flash("Saved as a custom template. Find it under Create ▸ Explore templates."); };
  const copyScene = () => { track(EVENTS.board_exported, { format: "scene_json" }); return navigator.clipboard?.writeText(JSON.stringify(describeScene(boardRef.current), null, 2)).then(() => flash("Scene JSON copied"), () => flash("Couldn't copy")); };
  const copyLink = (id?: Id) => navigator.clipboard?.writeText(location.origin + location.pathname + (id ? `?moveToWidget=${id}` : "")).then(() => flash("Link copied"), () => flash("Couldn't copy"));
  const copyImage = async () => { const { doc: d, sel: s } = R.current; if (!s.length) return; const set = new Set(s); const sub = { objects: Object.fromEntries(s.map(i => [i, d.objects[i]])), order: d.order.filter(i => set.has(i)) }; try { const blob = await svgToPngBlob(boardToSvg(sub as Doc), 2); await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]); flash("Copied as image"); } catch { flash("Couldn't copy the image here"); } };
  const copyStyle = () => { const o = R.current.doc.objects[R.current.sel[0]]; if (!o) return; const p: Record<string, unknown> = {}; for (const k of ["color", "fill", "stroke", "filled", "dashed", "fontSize", "bold", "width", "style"]) if (k in o) p[k] = (o as unknown as Record<string, unknown>)[k]; styleClip.current = p as Partial<Obj>; flash("Style copied"); };
  const pasteStyle = () => { const p = styleClip.current; if (!p) return; patchSel(o => Object.fromEntries(Object.entries(p).filter(([k]) => k in o)) as Partial<Obj>); };
  const clearContent = () => patchSel(o => (o.type === "frame" ? { name: "Frame" } : o.type === "connector" ? { label: "" } : "text" in o ? { text: "" } : {}) as Partial<Obj>);
  const toggleLock = () => patchSel(o => ({ locked: !("locked" in o && (o as { locked?: boolean }).locked) }) as Partial<Obj>);
  const forward = () => { const { doc: d, sel: s } = R.current; const set = new Set(s); const order = d.order.slice(); for (let i = order.length - 2; i >= 0; i--) if (set.has(order[i]) && !set.has(order[i + 1])) [order[i], order[i + 1]] = [order[i + 1], order[i]]; commitDoc({ ...d, order }); };
  const backward = () => { const { doc: d, sel: s } = R.current; const set = new Set(s); const order = d.order.slice(); for (let i = 1; i < order.length; i++) if (set.has(order[i]) && !set.has(order[i - 1])) [order[i], order[i - 1]] = [order[i - 1], order[i]]; commitDoc({ ...d, order }); };
  const addImages = async (files: File[], at?: Pt) => {
    const list = files.filter(isImageFile).slice(0, 10); if (!list.length) { flash("Drop PNG, JPEG, WebP or GIF images"); return; }
    const c = at ?? { x: R.current.view.x, y: R.current.view.y }; const objs: Obj[] = []; let i = 0;
    for (const f of list) { try { const im = await prepareImage(f); const scale = Math.min(1, 480 / Math.max(im.w, im.h)); const w = Math.round(im.w * scale), h = Math.round(im.h * scale); objs.push({ id: nid(), type: "image", x: c.x - w / 2 + i * 24, y: c.y - h / 2 + i * 24, w, h, src: im.src, alt: f.name.replace(/\.[^.]+$/, "") } as ImageObj); i++; } catch (err) { flash(`Couldn't read ${f.name}: ${(err as Error).message}`); } }
    if (objs.length) { commitDoc(addObjects(R.current.doc, objs)); setSel(objs.map(o => o.id)); if (JSON.stringify(R.current.doc).length > 700_000) flash("This board is getting large; very big images may not sync to the cloud"); }
  };
  const addSticker = (emoji: string) => { setStickers(false); if (!emoji) { flash("GIF and sticker packs need a paid API; emoji are free"); return; } const c = R.current.view; const o = textObj(c.x - 40, c.y - 40, { text: emoji, fontSize: 64, w: 84, h: 84 }); commitDoc(addObjects(R.current.doc, [o])); setSel([o.id]); };
  const createFrame = () => { const c = R.current.view, f = frame(c.x - 400, c.y - 225, 800, 450, `Frame ${R.current.doc.order.filter(i => R.current.doc.objects[i].type === "frame").length + 1}`); commitDoc(addObjects(R.current.doc, [f])); setSel([f.id]); };
  const toolEntries: ToolEntry[] = [
    { id: "text", icon: X.text, label: "Text", desc: "Selects text creation tool", onPick: () => { setTool("text"); setEdit(null); } },
    { id: "shapes", icon: X.shapes, label: "Shapes and lines", desc: "Shapes and lines", onPick: () => setFly("shapes") },
    { id: "pen", icon: X.pen, label: "Pen", desc: "Create freehand drawings", onPick: () => { setTool("pen"); setEdit(null); } },
    { id: "frame", icon: X.frame, label: "Frame", desc: "Add structure to the board", onPick: () => { setTool("frame"); setEdit(null); } },
    { id: "stickers", icon: X.palette, label: "Stickers, Emoji and GIFs", desc: "Add visual flair", onPick: () => setStickers(true) },
    { id: "upload", icon: X.image, label: "Upload", desc: "Add images from your device (or drop / paste them)", onPick: () => fileInput.current?.click() },
    { id: "comment", icon: X.comment, label: "Comment", desc: "Leave a comment on the board (C)", onPick: () => { setTool("comment"); setEdit(null); } },
    { id: "hand", icon: X.hand, label: "Hand", desc: "Pan the canvas (H, or hold Space)", onPick: () => { setTool("hand"); setEdit(null); } },
    { id: "eraser", icon: X.eraser, label: "Eraser", desc: "Drag across objects to delete them", onPick: () => { setTool("eraser"); setEdit(null); } },
    { id: "connector", icon: X.elbow, label: "Connection line", desc: "Connect objects with lines and arrows", onPick: () => { setTool("connector"); setEdit(null); } },
    { id: "minimap", icon: X.map, label: "Minimap", desc: "Overview of the whole board (M)", onPick: () => setMap(m => !m) },
    { id: "keys", icon: X.keys, label: "Keyboard shortcuts", desc: "Every shortcut on one sheet (?)", onPick: () => setHelp(true) },
  ];
  const compact = size.h < 820; // the full rail (AI + 11 tools + undo/redo + bottom bar) needs ~820px; below that Miro collapses it too
  const frameIds = () => R.current.doc.order.filter(i => R.current.doc.objects[i].type === "frame");
  const fitFrame = (b: Box) => { const sz = R.current.size, pad = 48; const zoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, Math.min((sz.w - pad * 2) / Math.max(1, b.w), (sz.h - pad * 2) / Math.max(1, b.h)))); setView({ zoom, x: b.x + b.w / 2, y: b.y + b.h / 2 }); };
  const presentGo = (dir: number) => setPresent(p => { if (!p) return p; const fs = frameIds(); const i = Math.max(0, Math.min(fs.length - 1, p.i + dir)); if (fs[i]) fitFrame(boundsOf(R.current.doc, R.current.doc.objects[fs[i]])); return { i }; });
  const startPresent = () => { const fs = frameIds(); track(EVENTS.board_present_started, { frames: fs.length }); setSel([]); setEdit(null); setTool("select"); setPresent({ i: 0 }); if (fs[0]) fitFrame(boundsOf(R.current.doc, R.current.doc.objects[fs[0]])); else fitAll(); const el = box.current?.closest(".mi-app") as HTMLElement | null; void el?.requestFullscreen?.().catch(() => {}); };
  const exitPresent = () => { setPresent(null); if (document.fullscreenElement) void document.exitFullscreen().catch(() => {}); };
  useEffect(() => { const f = () => { if (!document.fullscreenElement) setPresent(null); }; document.addEventListener("fullscreenchange", f); return () => document.removeEventListener("fullscreenchange", f); }, []);
  const frameSel = () => { const { doc: d, sel: s } = R.current; const r = frameAround(d, s.filter(i => d.objects[i]?.type !== "frame")); if (r) { commitDoc(r.doc); setSel([r.id]); } };
  const newFrom = (x: number, y: number, kind: Tool): Obj => {
    const L = last.current;
    if (kind === "sticky") return sticky(x - STICKY_SIZE / 2, y - STICKY_SIZE / 2, { color: L.stickyColor, ...(priv ? { private: true } : {}) } as Partial<StickyObj>);
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
    setFly("");
    box.current!.focus({ preventScroll: true });
    if (R.current.edit) { /* blur of the editor commits */ (document.activeElement as HTMLElement)?.blur?.(); }
    if (e.button === 2) return;
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    const { doc: d, tool: t, view: v, sel: s } = R.current, w = toWorld(e);
    if (e.button === 1 || t === "hand" || R.current.space) { g.current = { k: "pan", sx: e.clientX, sy: e.clientY, v }; return; }
    if (readOnly) { const id = hitTest(d, w, tol()); if (id && d.objects[id].type === "comment") setThread(id); else setThread(null); setSel(id ? [id] : []); if (!id) g.current = { k: "pan", sx: e.clientX, sy: e.clientY, v }; return; }
    const h = (e.target as Element).closest("[data-h]")?.getAttribute("data-h");
    if (t === "select" && h) {
      if (h.startsWith("dot:")) { const side = h.slice(4) as Side, id = s[0]; const o = d.objects[id]; g.current = { k: "conn", from: { id, side }, fromPt: anchorPoint(boxOf(o as any), side), dot: { id, side }, moved: false }; return; }
      if (h === "ca" || h === "cb") { g.current = { k: "cend", id: s[0], which: h === "ca" ? "from" : "to", cp: false }; return; }
      if (h.startsWith("g:")) { const b = unionBox(s.map(i => boundsOf(d, d.objects[i]))); if (!b) return; g.current = { k: "gresize", ids: s.slice(), h: h.slice(2), start: d, b0: b, cp: false }; return; }
      if (h === "grot") { const b = unionBox(s.map(i => boundsOf(d, d.objects[i]))); if (!b) return; const c = { x: b.x + b.w / 2, y: b.y + b.h / 2 }; g.current = { k: "grot", ids: s.slice(), c, a0: Math.atan2(w.y - c.y, w.x - c.x), start: d, cp: false, last: 0 }; return; }
      if (h === "rot") { const o = d.objects[s[0]] as Obj & Box & { rot?: number }; const c = { x: o.x + o.w / 2, y: o.y + o.h / 2 }; g.current = { k: "rot", id: s[0], c, a0: Math.atan2(w.y - c.y, w.x - c.x), r0: o.rot ?? 0, start: d, cp: false }; return; }
      g.current = { k: "resize", id: s[0], h, start: d, b0: boxOf(d.objects[s[0]] as any), cp: false }; return;
    }
    if (t === "select") {
      const id = hitTest(d, w, tol());
      const now = Date.now(), dbl = e.detail >= 2 || (lastClick.current.id === id && now - lastClick.current.t < 350 && id);
      lastClick.current = { t: now, id: id ?? "" };
      if (id && votingRef.current?.running) { g.current = null; const v = votingRef.current; const used = Object.values(v.votes).reduce((a, b) => a + b, 0); const cur = v.votes[id] ?? 0; if (cur > 0 && e.altKey) setVoting({ ...v, votes: { ...v.votes, [id]: cur - 1 } }); else if (used < v.perPerson) setVoting({ ...v, votes: { ...v.votes, [id]: cur + 1 } }); else flash("No votes left. Alt-click removes a vote."); return; }
      if (id && dbl && textual(d.objects[id])) { g.current = null; startEdit(id); return; }
      if (id && d.objects[id].type === "comment") setThread(id); else if (R.current.thread) setThread(null);
      if (id) {
        const shift = e.shiftKey || e.metaKey || e.ctrlKey; const was = s.includes(id);
        let ids = s;
        if (shift) { ids = s.includes(id) ? s.filter(i => i !== id) : [...s, id]; setSel(ids); if (!ids.includes(id)) { g.current = null; return; } }
        else if (!s.includes(id)) { ids = withGroups(d, [id]); setSel(ids); }
        const movable = withFrameChildren(d, ids).filter(i => !(d.objects[i] as { locked?: boolean }).locked); if (!movable.length) { g.current = null; return; } g.current = { k: "move", ids: movable, start: d, w0: w, cp: false, dup: e.altKey, clickId: id, shift, moved: false, was };
      } else { g.current = { k: "marquee", w0: w, base: e.shiftKey ? s : [] }; if (!e.shiftKey) setSel([]); }
      return;
    }
    if (t === "pen") { g.current = { k: "pen", pts: [w] }; setDraft({ kind: "pen", pts: [w] }); return; }
    if (t === "eraser") { g.current = { k: "erase", cp: false, start: d }; return; }
    if (t === "connector") {
      const id = hitTest(d, w, tol(), new Set(d.order.filter(i => { const o = d.objects[i]; return o.type === "connector" || o.type === "pen" || o.type === "frame" || o.type === "comment"; })));
      const from: End = id ? { id } : { x: w.x, y: w.y };
      g.current = { k: "conn", from, fromPt: w, dot: null, moved: false }; setDraft({ kind: "conn", a: w, b: w }); return;
    }
    if (t === "comment") { const c: CommentObj = { id: nid(), type: "comment", x: w.x, y: w.y - 36, w: 40, h: 36, thread: [] }; commitDoc(addObjects(d, [c])); setSel([c.id]); setThread(c.id); setHideComments(false); backToSelect(); return; }
    if (t === "sticky" || t === "text") { const o = newFrom(w.x, w.y, t); commitDoc(addObjects(d, [o])); startEdit(o.id, true); backToSelect(); return; }
    g.current = { k: "draw", tool: t, w0: w }; setDraft({ kind: "box", tool: t, box: { x: w.x, y: w.y, w: 0, h: 0 } });
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (live.current && Date.now() - lastCursor.current > 50) { lastCursor.current = Date.now(); const w = toWorld(e); live.current.send({ t: "cursor", from: me.current, x: w.x, y: w.y }); }
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
        if (moving && snapRef.current && !e.metaKey && !e.ctrlKey) {
          const others = gg.start.order.filter(i => !movingSet.has(i) && gg.start.objects[i].type !== "connector" && gg.start.objects[i].type !== "frame").map(i => boxOf(gg.start.objects[i] as any));
          const r = snapBox({ ...moving, x: moving.x + dx, y: moving.y + dy }, others, 6 / v.zoom); dx += r.dx; dy += r.dy; gl = r.guides;
        }
        setGuides(gl); liveDoc(moveObjects(gg.start, gg.ids, dx, dy)); return;
      }
      case "gresize": { // scale every selected box about the opposite corner of the selection
        if (!gg.cp) { gg.cp = true; begin(); }
        const b0 = gg.b0, ax = gg.h.includes("w") ? b0.x + b0.w : b0.x, ay = gg.h.includes("n") ? b0.y + b0.h : b0.y; // anchor (fixed corner)
        let sx = b0.w ? (w.x - ax) / ((gg.h.includes("w") ? b0.x : b0.x + b0.w) - ax) : 1, sy = b0.h ? (w.y - ay) / ((gg.h.includes("n") ? b0.y : b0.y + b0.h) - ay) : 1;
        if (!e.shiftKey) { const k = Math.max(Math.abs(sx), Math.abs(sy)); sx = sy = k; } sx = Math.max(0.05, Math.abs(sx)); sy = Math.max(0.05, Math.abs(sy));
        let nd = gg.start; for (const id of gg.ids) { const o = gg.start.objects[id]; if (!o || !isBox(o)) continue; nd = resizeObject(nd, id, { x: ax + (o.x - ax) * sx, y: ay + (o.y - ay) * sy, w: o.w * sx, h: o.h * sy }); }
        liveDoc(nd); return;
      }
      case "grot": { // rotate the selection as one: each object spins in place and orbits the selection centre
        if (!gg.cp) { gg.cp = true; begin(); }
        let deg = ((Math.atan2(w.y - gg.c.y, w.x - gg.c.x) - gg.a0) * 180) / Math.PI; const snap45 = Math.round(deg / 45) * 45; if (!e.shiftKey && Math.abs(deg - snap45) < 4) deg = snap45;
        const rad = (deg * Math.PI) / 180, cs = Math.cos(rad), sn = Math.sin(rad); let nd = gg.start;
        for (const id of gg.ids) { const o = gg.start.objects[id]; if (!o || !isBox(o) || o.type === "frame") continue; const cx = o.x + o.w / 2 - gg.c.x, cy = o.y + o.h / 2 - gg.c.y; const nx = gg.c.x + cx * cs - cy * sn - o.w / 2, ny = gg.c.y + cx * sn + cy * cs - o.h / 2; const r = ((((o as { rot?: number }).rot ?? 0) + deg) % 360 + 360) % 360; nd = updateObjects(nd, [id], { x: nx, y: ny, rot: r || undefined } as Partial<Obj>); }
        liveDoc(nd); return;
      }
      case "rot": {
        if (!gg.cp) { gg.cp = true; begin(); }
        let deg = gg.r0 + ((Math.atan2(w.y - gg.c.y, w.x - gg.c.x) - gg.a0) * 180) / Math.PI; deg = ((deg % 360) + 360) % 360;
        const snap45 = Math.round(deg / 45) * 45; if (!e.shiftKey && Math.abs(deg - snap45) < 4) deg = snap45 % 360;
        liveDoc(updateObjects(gg.start, [gg.id], { rot: deg || undefined } as Partial<Obj>)); return;
      }
      case "resize": {
        const dx = w.x - handlePt(gg.b0, gg.h).x, dy = w.y - handlePt(gg.b0, gg.h).y;
        if (!gg.cp) { gg.cp = true; begin(); }
        let { x, y, w: bw, h: bh } = gg.b0;
        if (gg.h.includes("e")) bw += dx; if (gg.h.includes("s")) bh += dy; if (gg.h.includes("w")) { x += dx; bw -= dx; } if (gg.h.includes("n")) { y += dy; bh -= dy; }
        if (e.shiftKey && gg.h.length === 2 && gg.b0.w && gg.b0.h) { const r = gg.b0.w / gg.b0.h; if (bw / bh > r) bh = bw / r; else bw = bh * r; if (gg.h.includes("w")) x = gg.b0.x + gg.b0.w - bw; if (gg.h.includes("n")) y = gg.b0.y + gg.b0.h - bh; }
        liveDoc(resizeObject(gg.start, gg.id, { x, y, w: bw, h: bh })); return;
      }
      case "marquee": { const b = normBox(gg.w0, w); setMarq(b); const hit = marquee(d, b); setSel(withGroups(d, [...new Set([...gg.base, ...hit])])); return; }
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
    setGuides([]); setMarq(null); setTick(t => t + 1); // re-render so chrome that hides during a gesture comes back after a plain click
    switch (gg.k) {
      case "move": if (!gg.moved && !gg.shift && gg.was && R.current.sel.length > 1 && gg.clickId) setSel([gg.clickId]); return;
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
        const skip = new Set(d.order.filter(i => { const o = d.objects[i]; return o.type === "connector" || o.type === "pen" || o.type === "frame" || o.type === "comment"; }));
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
    if (readOnly && !(e.code === "Space" || e.key === "Escape" || e.key === "?" || (mod && ["=", "+", "-", "0"].includes(e.key)) || ["+", "=", "-", "m", "g"].includes(k) || e.altKey || e.key.startsWith("Arrow"))) return;
    if (e.code === "Space" && !mod) { e.preventDefault(); setSpace(true); return; }
    if (mod && k === "z") { e.preventDefault(); e.shiftKey ? doRedo() : doUndo(); return; }
    if (mod && k === "y") { e.preventDefault(); doRedo(); return; }
    if (mod && k === "s") { e.preventDefault(); void saveNow(); flash("Saved"); return; }
    if (mod && k === "a") { e.preventDefault(); setFly(""); setSel(d.order.slice()); return; }
    if (mod && k === "d") { e.preventDefault(); dup(); return; }
    if (mod && k === "g") { e.preventDefault(); e.shiftKey ? ungroupSel() : groupSel(); return; }
    if (mod && e.shiftKey && k === "l") { e.preventDefault(); toggleLock(); return; }
    if (mod && k === "k") { e.preventDefault(); setPalette(p => !p); return; }
    if (mod && e.shiftKey && k === "c") { e.preventDefault(); void copyImage(); return; }
    if (mod && k === "c") { copy(false); return; }
    if (mod && k === "x") { e.preventDefault(); copy(true); return; }
    if (mod && k === "v") { if (paste()) e.preventDefault(); return; }
    if (mod && e.key === "]") { e.preventDefault(); commitDoc(bringToFront(d, s)); return; }
    if (mod && e.key === "[") { e.preventDefault(); commitDoc(sendToBack(d, s)); return; }
    if (mod && (e.key === "=" || e.key === "+")) { e.preventDefault(); zoomBy(1.25); return; }
    if (mod && e.key === "-") { e.preventDefault(); zoomBy(0.8); return; }
    if (mod && e.key === "0") { e.preventDefault(); setView(v => zoomAt(v, R.current.size, { x: R.current.size.w / 2, y: R.current.size.h / 2 }, 1)); return; }
    if (mod) return;
    if (e.key === "Escape") { setFly(""); if (g.current) { g.current = null; setDraft(null); setMarq(null); } else if (R.current.tool !== "select") setTool("select"); else setSel([]); setHelp(false); setMenu(false); setCtx(null); setTools(false); setThread(null); setPalette(false); if (present) exitPresent(); return; }
    if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); del(); return; }
    if (e.key === "?") { setHelp(h => !h); return; }
    if (e.shiftKey && k === "c") { e.preventDefault(); setHideComments(h => !h); return; }
    if (e.key === "Enter" && s.length === 1 && d.objects[s[0]]?.type === "comment") { e.preventDefault(); setThread(s[0]); return; }
    if (e.key === "Enter" && s.length === 1 && textual(d.objects[s[0]])) { e.preventDefault(); startEdit(s[0]); return; }
    if (e.key === "Tab" && s.length === 1) {
      const o = d.objects[s[0]]; if (o && (o.type === "sticky" || o.type === "shape")) { e.preventDefault(); const side: Side = e.shiftKey ? "s" : "e"; const r = createConnected(d, o.id, side); if (r) { commitDoc(r.doc); startEdit(r.id, true); } return; }
    }
    if (e.key.startsWith("Arrow") && s.length) { e.preventDefault(); const n = e.shiftKey ? 10 : 1; commitDoc(moveObjects(d, withFrameChildren(d, s), e.key === "ArrowLeft" ? -n : e.key === "ArrowRight" ? n : 0, e.key === "ArrowUp" ? -n : e.key === "ArrowDown" ? n : 0)); return; }
    if (e.altKey && e.code === "Digit1") { e.preventDefault(); fitAll(); return; }
    if (e.altKey && e.code === "Digit2") { e.preventDefault(); fitSel(); return; }
    if (e.altKey && e.code === "Digit3") { e.preventDefault(); zoomTo(20); return; }
    if (e.key === "PageUp" && s.length) { e.preventDefault(); commitDoc(bringToFront(d, s)); return; }
    if (e.key === "PageDown" && s.length) { e.preventDefault(); commitDoc(sendToBack(d, s)); return; }
    if (k === "g" && !e.shiftKey && !e.altKey) { setGrid(g => !g); return; }
    if (e.key === "!" || (e.shiftKey && e.code === "Digit1")) { fitAll(); return; }
    if (e.key === "@" || (e.shiftKey && e.code === "Digit2")) { fitSel(); return; }
    if (e.key === "+" || e.key === "=") { zoomBy(1.25); return; }
    if (e.key === "-") { zoomBy(0.8); return; }
    if (k === "m" && !e.shiftKey) { setMap(m => !m); return; }
    if (k === "f" && s.length > 1) { frameSel(); return; }
    if (k === "s" && !e.shiftKey && !e.altKey) { setFly(f => f === "shapes" ? "" : "shapes"); return; }
    if (present) { if (e.key === "ArrowRight" || e.key === " " || e.key === "PageDown") { e.preventDefault(); presentGo(1); } else if (e.key === "ArrowLeft" || e.key === "PageUp") { e.preventDefault(); presentGo(-1); } return; }
    if (KEY_TO_TOOL[k] && !e.shiftKey && !e.altKey) { setTool(KEY_TO_TOOL[k]); setEdit(null); setFly(""); }
  };
  useEffect(() => {
    const d = (e: KeyboardEvent) => keys.current(e);
    const u = (e: KeyboardEvent) => { if (e.code === "Space") setSpace(false); };
    const p = (e: ClipboardEvent) => { // external text paste → sticky at the view centre
      if ((e.target as HTMLElement).closest("input,textarea,[contenteditable]") || R.current.edit) return;
      const files = [...(e.clipboardData?.files ?? [])].filter(isImageFile); if (files.length) { e.preventDefault(); void addImages(files); return; }
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
  useEffect(() => { if (firstRun && doc.order.length >= 8) { setFirstRun(false); try { localStorage.setItem("mi-onboarded", "1"); } catch { /* ignore */ } } }, [firstRun, doc.order.length]);
  const hint = edit ? (doc.objects[edit.id]?.type === "sticky" ? "Esc to finish · Tab for the next sticky · ⇧Tab places it below" : "") : tool !== "select" ? TOOLS.find(t => t.tool === tool)!.hint : one && (one.type === "sticky" || one.type === "shape") ? "Enter to edit · Tab adds a connected one · drag a blue dot to connect" : selObjs.length > 1 ? "Align and distribute from the toolbar · F frames the selection · ⌘D duplicates" : "Scroll to pan · ⌘ + scroll to zoom · N for a sticky · ? for all shortcuts";
  const cursor = g.current?.k === "pan" || (space && true) ? "grab" : tool === "hand" ? "grab" : tool === "select" ? "default" : tool === "eraser" ? "cell" : "crosshair";
  const gridSize = 80 * z, bgPos = `${size.w / 2 - view.x * z}px ${size.h / 2 - view.y * z}px`;
  const statusText = status === "saving" ? "Saving…" : status === "saved" ? (store.kind === "cloud" ? "Saved to your account" : "Saved on this device") : status === "device" ? "Saved on this device · sync failed" : "Couldn't save";

  // ---- analytics (taxonomy in lib/analytics/taxonomy.ts): new objects by type, tool changes, live peers ----
  const seenIds = useRef<Set<Id> | null>(null);
  useEffect(() => { const prev = seenIds.current; const cur = new Set(doc.order); if (prev) { const counts: Record<string, number> = {}; for (const id of doc.order) if (!prev.has(id)) { const t = doc.objects[id]?.type; if (t) counts[t] = (counts[t] ?? 0) + 1; } for (const [t, n] of Object.entries(counts)) track(EVENTS.board_object_created, { object_type: t, count: n, remote: applyingRemote.current }); } seenIds.current = cur; }, [doc]);
  const firstTool = useRef(true);
  useEffect(() => { if (firstTool.current) { firstTool.current = false; return; } if (tool !== "select") track(EVENTS.board_tool_selected, { tool }); }, [tool]);
  const peerCount = Object.keys(peers).length; const maxPeers = useRef(0);
  useEffect(() => { if (peerCount > maxPeers.current) { maxPeers.current = peerCount; track(EVENTS.board_live_peer_connected, { peers: peerCount }); } }, [peerCount]);
  useEffect(() => { if (guest) track(EVENTS.board_guest_viewed, { access: readOnly ? "view" : "edit", embed }); }, [guest, readOnly, embed]);
  const commands: Command[] = [
    { id: "sticky", label: "Sticky note", kbd: "N", group: "Create", icon: X.sticky, run: () => setTool("sticky") }, { id: "text", label: "Text", kbd: "T", group: "Create", icon: X.text, run: () => setTool("text") }, { id: "rect", label: "Rectangle", kbd: "R", group: "Create", icon: X.rect, run: () => setTool("rect") }, { id: "ellipse", label: "Oval", kbd: "O", group: "Create", icon: X.oval, run: () => setTool("ellipse") }, { id: "diamond", label: "Rhombus", kbd: "D", group: "Create", icon: X.rhombus, run: () => setTool("diamond") }, { id: "line", label: "Connection line", kbd: "L", group: "Create", icon: X.arrow, run: () => setTool("connector") }, { id: "pen", label: "Pen", kbd: "P", group: "Create", icon: X.pen, run: () => setTool("pen") }, { id: "frame", label: "Frame", kbd: "F", group: "Create", icon: X.frame, run: () => setTool("frame") }, { id: "comment", label: "Comment", kbd: "C", group: "Create", icon: X.comment, run: () => setTool("comment") },
    { id: "fit", label: "Zoom to fit", kbd: "⌥1", group: "View", icon: X.fit, run: fitAll }, { id: "100", label: "Zoom to 100%", kbd: "⌘0", group: "View", icon: X.zoomIn, run: () => zoomTo(1) }, { id: "grid", label: grid ? "Hide grid" : "Show grid", kbd: "G", group: "View", icon: X.grid2, run: () => setGrid(g => !g) }, { id: "map", label: map ? "Hide minimap" : "Show minimap", kbd: "M", group: "View", icon: X.map, run: () => setMap(m => !m) }, { id: "full", label: "Enter full screen", group: "View", icon: X.fullscreen, run: fullscreen }, { id: "present", label: "Present", group: "View", icon: X.play, run: startPresent }, { id: "frames", label: "Frames panel", group: "View", icon: X.frame, run: () => setFrames(true) }, { id: "comments", label: "Comments panel", group: "View", icon: X.chat, run: () => setCommentsPanel(true) },
    { id: "group", label: "Group selection", kbd: "⌘G", group: "Edit", run: groupSel }, { id: "ungroup", label: "Ungroup", kbd: "⌘⇧G", group: "Edit", run: ungroupSel }, { id: "lock", label: "Lock / unlock selection", kbd: "⌘⇧L", group: "Edit", icon: X.lock, run: toggleLock }, { id: "dup", label: "Duplicate", kbd: "⌘D", group: "Edit", icon: X.copy, run: dup }, { id: "selall", label: "Select all", kbd: "⌘A", group: "Edit", run: () => setSel(doc.order.slice()) }, { id: "frameSel", label: "Frame the selection", group: "Edit", icon: X.frame, run: frameSel },
    { id: "share", label: "Share board", group: "Board", icon: X.link, run: () => setShare("Invite") }, { id: "pdf", label: "Save as PDF", group: "Board", icon: X.pdf, run: exportPdf }, { id: "png", label: "Export as image", group: "Board", icon: X.image, run: () => void exportPng() }, { id: "csv", label: "Export to spreadsheet (CSV)", group: "Board", icon: X.table, run: exportCsv }, { id: "backup", label: "Download board backup", group: "Board", icon: X.download, run: exportBackup }, { id: "tpl", label: "Save board as template", group: "Board", icon: X.tplS, run: saveTemplate }, { id: "timer", label: "Timer", group: "Facilitation", icon: X.timer, run: () => setTimerOpen(true) }, { id: "vote", label: "Voting", group: "Facilitation", icon: X.vote, run: () => setVotingOpen(true) }, { id: "note", label: "Board note", group: "Facilitation", icon: X.note, run: () => setNoteOpen(true) }, { id: "keys", label: "Keyboard shortcuts", kbd: "?", group: "Help", icon: X.keys, run: () => setHelp(true) },
  ];
  return <div className={"mi-app" + (present ? " presenting" : "")} data-testid="board-editor">
    {banner && !present && <div className="mx-banner" data-ui role="status"><span className="mx-banner-i">{X.info}</span><span>Never miss an important update.</span><a href="#notifications" onClick={e => { e.preventDefault(); setBanner(false); }}>Turn on real-time notifications</a><button aria-label="Dismiss" className="mx-banner-x" onClick={() => setBanner(false)}>{X.close}</button></div>}
    {!online && <div className="mb-ro mb-offline" data-ui role="status">{X.info} You’re offline. Changes are saved on this device and sync when you’re back.</div>}
    {(readOnly || guest) && <div className="mb-ro" data-ui>{X.globe} {readOnly ? "View only" : "Editing as a guest"} · {title || "Untitled"}{guest && <a href={`${BP}/signup`}>Sign up to keep a copy</a>}</div>}
    {!embed && !present && <header className="mb-tl" data-ui style={{ top: banner ? 66 : 10 }}>
      <Link href="/app" className="mb-i" aria-label="Back to boards" title="Back to boards">{X.panel}</Link>
      <Link href="/app" className="mb-logo hm" aria-label="MiroIsDead home"><Mark size={24} />MiroIsDead</Link>
      <button className="mb-i hm" aria-label="Reactions" onClick={() => flash("Reactions are for live sessions")}>{X.smile}</button>
      <span className="mi-menuwrap"><button className={"mb-i mb-emoji" + (emoji ? " has" : "")} aria-label="Choose emoji" title="Choose emoji" onClick={() => setEmojiPick(p => !p)}>{emoji || <span className="mb-emoji-ph" />}</button>{emojiPick && <EmojiPicker onPick={setEmoji} onClose={() => setEmojiPick(false)} />}</span>
      <input className="mb-title" aria-label="Board title" value={title} placeholder="Untitled" readOnly={readOnly} onChange={e => setTitle(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter") (e.target as HTMLInputElement).blur(); }} />
      <span className="mi-menuwrap"><button className="mb-i" aria-label="Main menu" aria-haspopup="menu" aria-expanded={main} onClick={() => setMain(m => !m)}>{X.kebab}</button>
        {main && <MainMenu onClose={() => setMain(false)} a={{ rename: () => (document.querySelector(".mb-title") as HTMLInputElement | null)?.select(), duplicate: () => { const b = { ...boardRef.current, id: nid(), title: `${title} copy`, createdAt: Date.now(), updatedAt: Date.now() }; void store.save(b).then(() => flash("Board duplicated. It's on your dashboard."), () => flash("Couldn't duplicate")); }, back: () => (window.location.href = `${BP}/app`), undo: doUndo, redo: doRedo, canUndo: canUndo(hist), canRedo: canRedo(hist), selectAll: () => setSel(doc.order.slice()), dup, del, hasSel: sel.length > 0, minimap: map, toggleMinimap: () => setMap(m => !m), grid, toggleGrid: () => setGrid(g => !g), fullscreen, fit: fitAll, snap, toggleSnap: () => { snapRef.current = !snap; setSnap(s => !s); }, dims, toggleDims: () => setDims(d => !d), shortcuts: () => setHelp(true), flash }} />}</span>
      <span className="mi-menuwrap">
        <button className="mb-i" onClick={() => setMenu(m => !m)} aria-expanded={menu} aria-haspopup="menu" aria-label="Export this board" title="Export this board">{X.upload}</button>
        {menu && <ExportMenu onClose={() => setMenu(false)} a={{ pdf: exportPdf, image: () => setImgOpts({ area: "board", quality: "medium", bg: true }), template: saveTemplate, csv: exportCsv, backup: exportBackup, embed: () => setShare("Embed"), drive: () => { exportBackup(); flash("Backup downloaded. Upload it to Drive to keep a copy there."); } }} />}
      </span>
      <span className="mx-sr" data-testid="save-status" role="status">{readOnly ? "View only" : statusText}</span>
    </header>}
    {!embed && !present && <div className="mb-tr" data-ui style={{ top: banner ? 66 : 10 }}>
      <TimerChip timer={timer} onClick={() => setTimerOpen(o => !o)} />
      <span className="mi-menuwrap"><button className={"mb-i wide hm" + (fac ? " on" : "")} aria-label="Facilitation tools and reactions" aria-haspopup="menu" aria-expanded={fac} onClick={() => setFac(f => !f)}><span className="mb-facic">{X.timer}{X.vote}<i>✦</i></span></button>
        {fac && <FacilitationPopover onClose={() => setFac(false)} onReact={react} timer={timer} onTimer={() => setTimerOpen(true)} voting={voting} onVoting={() => setVotingOpen(true)} priv={priv} onPrivate={() => { setPriv(p => !p); flash(priv ? "Private mode off: new stickies are visible to everyone" : "Private mode on: new stickies stay hidden until you reveal them"); }} onNote={() => setNoteOpen(true)} />}</span>
      <button className={"mb-i hm" + (commentsPanel ? " on" : "")} aria-label="Comments" aria-expanded={commentsPanel} onClick={() => setCommentsPanel(p => !p)}>{X.chat}{doc.order.some(i => doc.objects[i].type === "comment" && !(doc.objects[i] as CommentObj).resolved) && <i className="mb-badge" />}</button>
      <button className="mb-i hm" aria-label="Start a call" onClick={() => flash("Calls aren't part of MiroIsDead")}>{X.video}</button>
      <span className="mi-menuwrap"><button className="mb-av" aria-label="Account" aria-expanded={prof} onClick={() => setProf(p => !p)}><PeerAvatars peers={Object.values(peers)} me={me.current} />{X.chev}</button>
        {prof && <div className="mi-menu mb-menu" role="menu" style={{ right: 0 }} onPointerDown={e => e.stopPropagation()}><div className="mb-menu-h">{who}</div>
          <Link href="/app" role="menuitem" className="mb-link">All boards</Link>
          {signOutAction && <form action={signOutAction}><button role="menuitem">Sign out</button></form>}</div>}</span>
      <button className="mb-play hm" aria-label="Present" title="Present" onClick={startPresent}>{X.play}</button>
      {!guest && <button className="mb-sharebtn" onClick={() => { if (!title.trim() || title.trim() === "Untitled") { setTitlePrompt(title.trim() === "Untitled" ? "" : title); return; } setShare("Invite"); track(EVENTS.board_share_opened, { tab: "Invite" }); }} data-testid="share">Share</button>}
    </div>}

    {!readOnly && !embed && !present && <nav className="mb-rail" data-ui aria-label="Tools" style={{ top: compact ? (banner ? 120 : 64) : Math.max(banner ? 120 : 64, size.h / 2 - 304 + (banner ? 56 : 0)) }}>
      <div className="mb-pill">
        <button className="mb-t ai" aria-label="Create with AI" title="Create with AI" onClick={() => { setFly(""); setShare("AI"); }}>{X.sparkle}</button>
      </div>
      <div className="mb-pill main">
        {([["select", X.select, "Select"], [null, X.notes, "Formats and Flows"], [null, X.tpl, "Templates"], ["sticky", X.sticky, "Sticky note"], ...(compact ? [] : [["text", X.text, "Text"]])] as [Tool | null, React.ReactNode, string][]).map(([t, ic, label]) => t
          ? <button key={t} className={"mb-t" + (tool === t ? " on" : "")} aria-pressed={tool === t} title={`${label} (${TOOLS.find(x => x.tool === t)!.key.toUpperCase()})`} aria-label={label} data-tool={t} onClick={() => { setTool(t); setEdit(null); setFly(""); }}>{ic}</button>
          : <button key={label} className="mb-t" title={label} aria-label={label} onClick={() => { setFly(""); flash(`${label} aren't in MiroIsDead yet`); }}>{ic}</button>)}
        {!compact && <>
        <button className={"mb-t" + (fly === "shapes" || ["rect", "ellipse", "diamond", "connector"].includes(tool) ? " on" : "")} aria-label="Shapes and lines" title="Shapes and lines (S)" aria-expanded={fly === "shapes"} onClick={() => setFly(f => f === "shapes" ? "" : "shapes")}>{X.shapes}</button>
        <button className={"mb-t" + (tool === "pen" ? " on" : "")} aria-pressed={tool === "pen"} title="Pen (P)" aria-label="Pen" data-tool="pen" onClick={() => { setTool("pen"); setEdit(null); setFly(""); }}>{X.pen}</button>
        <button className={"mb-t" + (tool === "frame" ? " on" : "")} aria-pressed={tool === "frame"} title="Frame (F)" aria-label="Frame" data-tool="frame" onClick={() => { setTool("frame"); setEdit(null); setFly(""); }}>{X.frame}</button>
        <button className={"mb-t" + (stickers ? " on" : "")} title="Stickers, Emoji and GIFs" aria-label="Stickers, Emoji and GIFs" aria-expanded={stickers} onClick={() => { setFly(""); setStickers(s => !s); }}>{X.palette}</button>
        <button className={"mb-t" + (tool === "comment" ? " on" : "")} aria-pressed={tool === "comment"} title="Comment (C)" aria-label="Comment" data-tool="comment" onClick={() => { setTool("comment"); setEdit(null); setFly(""); }}>{X.comment}</button></>}
        <button className={"mb-t" + (tools || (compact && ["rect", "ellipse", "diamond", "connector", "pen", "frame", "text"].includes(tool)) ? " on" : "")} aria-label="Tools, Media and Integrations" title="Tools, Media and Integrations" aria-expanded={tools} onClick={() => { setFly(""); setTools(t => !t); }}>{X.plus}</button>
      </div>
      <div className="mb-pill hist">
        <button className="mb-t" disabled={!canUndo(hist)} onClick={doUndo} title="Undo (⌘Z)" aria-label="Undo">{X.undo}</button>
        <button className="mb-t" disabled={!canRedo(hist)} onClick={doRedo} title="Redo (⇧⌘Z)" aria-label="Redo">{X.redo}</button>
      </div>
      <div className={"mb-fly shapes" + (fly === "shapes" ? " open" : "")} role="menu">
        {([["Line", X.line, "connector", "L", { style: "straight", arrow: false }], ["Arrow", X.arrow, "connector", "", { style: "straight", arrow: true }], ["Elbow arrow", X.elbow, "connector", "", { style: "elbow", arrow: true }], ["Block arrow", X.blockArrow, null, "", null]] as [string, React.ReactNode, Tool | null, string, { style: ConnectorStyle; arrow: boolean } | null][]).map(([label, ic, t, k, cfg]) =>
          <button key={label} role="menuitem" className={"mb-f" + (t === "connector" && tool === "connector" && cfg && last.current.line === label ? " on" : "")} data-tool={label === "Elbow arrow" ? "connector" : undefined} aria-pressed={label === "Elbow arrow" ? tool === "connector" : undefined} onClick={() => { if (!t || !cfg) { flash("Block arrows aren't in MiroIsDead yet"); return; } last.current.connectorStyle = cfg.style; last.current.arrow = cfg.arrow; last.current.line = label; setTool("connector"); setEdit(null); setFly(""); }}><span className="ic">{ic}</span>{label}<kbd>{k}</kbd></button>)}
        <hr />
        {([["Rectangle", X.rect, "rect", "R", "rect"], ["Oval", X.oval, "ellipse", "O", "rect"], ["Rhombus", X.rhombus, "diamond", "", "rect"], ["Triangle", X.triangle, "rect", "", "triangle"]] as [string, React.ReactNode, Tool, string, ShapeObj["shape"]][]).map(([label, ic, t, k, sh]) =>
          <button key={label} role="menuitem" className={"mb-f" + ((tool === t && (label === "Triangle" ? last.current.shape === "triangle" : t !== "rect" || last.current.shape !== "triangle")) || (label === "Rectangle" && !["rect", "ellipse", "diamond", "connector"].includes(tool)) ? " on" : "")} data-tool={label === "Rectangle" ? "rect" : label === "Oval" ? "ellipse" : label === "Rhombus" ? "diamond" : undefined} aria-pressed={label === "Rectangle" ? tool === "rect" : label === "Oval" ? tool === "ellipse" : label === "Rhombus" ? tool === "diamond" : undefined} onClick={() => { last.current.shape = sh; setTool(t); setEdit(null); setFly(""); }}><span className="ic">{ic}</span>{label}<kbd>{k}</kbd></button>)}
        <button role="menuitem" className="mb-f" onClick={() => { setFly(""); flash("Divider isn't in MiroIsDead yet"); }}><span className="ic">{X.divider}</span>Divider</button>
        <button role="menuitem" className="mb-f plain" onClick={() => { setFly(""); flash("More shapes are coming. Contributions welcome.") }}>More shapes</button>
        <hr />
        <button role="menuitem" className="mb-f" onClick={() => { setFly(""); flash("Diagramming from text isn't in MiroIsDead yet"); }}><span className="ic">{X.diagram}</span>Diagram</button>
      </div>
    </nav>}

    <div ref={box} className={"mi-canvas" + (dropping ? " dropping" : "")} tabIndex={0} data-testid="canvas" data-active-tool={tool} onDragOver={e => { if (readOnly) return; e.preventDefault(); setDropping(true); }} onDragLeave={() => setDropping(false)} onDrop={e => { e.preventDefault(); setDropping(false); if (readOnly) return; void addImages([...e.dataTransfer.files], toWorld(e)); }} style={{ cursor, backgroundSize: `${gridSize}px ${gridSize}px, ${gridSize}px ${gridSize}px, ${gridSize * 3}px ${gridSize * 3}px, ${gridSize * 3}px ${gridSize * 3}px`, backgroundPosition: bgPos, backgroundImage: grid ? undefined : "none" }}
      onMouseDown={e => { if (!(e.target as Element).closest("[data-ui]")) e.preventDefault(); }} onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp} onContextMenu={e => { e.preventDefault(); if ((e.target as Element).closest("[data-ui]")) return; const r = rect(), w = toWorld(e); const id = hitTest(R.current.doc, w, tol()); if (id && !R.current.sel.includes(id)) setSel([id]); setCtx({ x: e.clientX - r.left, y: e.clientY - r.top, id }); }}>
      <svg width={size.w} height={size.h} style={{ display: "block", overflow: "hidden" }}>
        <Defs />
        <g transform={`translate(${size.w / 2 - view.x * z} ${size.h / 2 - view.y * z}) scale(${z})`}>
          <Scene doc={doc} editing={edit?.id} comments={hideComments ? "none" : "show"} selected={sel} />
          {/* selection chrome */}
          {tool === "select" && selObjs.filter(o => o.type !== "comment").map(o => { const b = boundsOf(doc, o); const rt = o.type !== "connector" && o.rot ? `rotate(${o.rot} ${o.x + o.w / 2} ${o.y + o.h / 2})` : undefined; return o.type === "connector" ? <path key={o.id} d={routeConnector(doc, o).path} fill="none" stroke="#4262FF" strokeWidth={px(5)} opacity={0.25} /> : <rect key={o.id} transform={rt} x={b.x - px(2)} y={b.y - px(2)} width={b.w + px(4)} height={b.h + px(4)} fill="none" stroke="#4262FF" strokeWidth={px(1.5)} />; })}
          {tool === "select" && selObjs.length > 1 && selBounds && !edit && <g data-testid="multi-box">
            <rect x={selBounds.x} y={selBounds.y} width={selBounds.w} height={selBounds.h} fill="none" stroke="#4262FF" strokeWidth={px(1.5)} />
            {(["nw", "ne", "se", "sw"] as const).map(h => { const p = handlePt(selBounds, h); return <circle key={h} data-h={`g:${h}`} data-testid={`ghandle-${h}`} cx={p.x} cy={p.y} r={px(6.5)} fill="#fff" stroke="#8E8E93" strokeWidth={px(2)} style={{ cursor: CURSOR[h] }} />; })}
            <g data-h="grot" data-testid="ghandle-rot" style={{ cursor: "grab" }} transform={`translate(${selBounds.x - px(18)} ${selBounds.y + selBounds.h + px(18)})`}><circle r={px(10)} fill="#fff" stroke="#8E8E93" strokeWidth={px(1.5)} /><path d={`M${-px(4)} ${-px(1)}a${px(4.5)} ${px(4.5)} 0 1 1 ${px(1.5)} ${px(4)}`} fill="none" stroke="#1C1C1E" strokeWidth={px(1.4)} /><path d={`M${-px(5.5)} ${-px(3.5)}l${px(1.5)} ${px(3)}l${px(3)} ${-px(1)}`} fill="none" stroke="#1C1C1E" strokeWidth={px(1.4)} /></g>
          </g>}
          {tool === "select" && one && isBox(one) && one.type !== "comment" && (!edit || (edit.id === one.id && one.type !== "text")) && !(one as { locked?: boolean }).locked && <g transform={one.rot ? `rotate(${one.rot} ${one.x + one.w / 2} ${one.y + one.h / 2})` : undefined}>
            {one.type !== "frame" && one.type !== "sticky" && <g data-h="rot" data-testid="handle-rot" style={{ cursor: "grab" }} transform={`translate(${one.x - px(18)} ${one.y + one.h + px(18)})`}><circle r={px(10)} fill="#fff" stroke="#8E8E93" strokeWidth={px(1.5)} /><path d={`M${-px(4)} ${-px(1)}a${px(4.5)} ${px(4.5)} 0 1 1 ${px(1.5)} ${px(4)}`} fill="none" stroke="#1C1C1E" strokeWidth={px(1.4)} /><path d={`M${-px(5.5)} ${-px(3.5)}l${px(1.5)} ${px(3)}l${px(3)} ${-px(1)}`} fill="none" stroke="#1C1C1E" strokeWidth={px(1.4)} /></g>}
            {HANDLES.map(h => { const p = handlePt(boxOf(one), h), edge = h.length === 1; return <circle key={h} data-h={h} data-testid={`handle-${h}`} cx={p.x} cy={p.y} r={px(edge ? 7 : 6.5)} fill={one.type === "sticky" && edge ? "transparent" : "#fff"} stroke={one.type === "sticky" && edge ? "transparent" : "#8E8E93"} strokeWidth={px(2)} style={{ cursor: CURSOR[h] }} />; })}
            {(one.type === "sticky" || one.type === "shape") && (["n", "e", "s", "w"] as Side[]).map(sd => { const a = anchorPoint(boxOf(one), sd), off = px(22); return <g key={sd} data-h={`dot:${sd}`} data-testid={`dot-${sd}`} style={{ cursor: "copy" }}><circle cx={a.x + DIR[sd].x * off} cy={a.y + DIR[sd].y * off} r={px(9)} fill="transparent" /><circle cx={a.x + DIR[sd].x * off} cy={a.y + DIR[sd].y * off} r={px(3.5)} fill="#4262FF" /></g>; })}
          </g>}
          {dims && tool === "select" && one && isBox(one) && !edit && <text x={one.x + one.w / 2} y={one.y + one.h + px(18)} textAnchor="middle" fontSize={px(12)} fill="#4262FF" fontFamily="var(--ids-font-sans)" style={{ pointerEvents: "none" }}>{Math.round(one.w)} × {Math.round(one.h)}</text>}
          {tool === "select" && selObjs.some(o => (o as { locked?: boolean }).locked) && selObjs.filter(o => (o as { locked?: boolean }).locked).map(o => { const b = boundsOf(doc, o); return <g key={"lk" + o.id} transform={`translate(${b.x + b.w - px(18)} ${b.y + px(4)}) scale(${px(1)})`} style={{ pointerEvents: "none" }}><rect x="0" y="0" width="16" height="16" rx="4" fill="#fff" stroke="#8E8E93" /><path d="M5 8V6.5a3 3 0 016 0V8M4.5 8h7v5h-7z" fill="none" stroke="#1C1C1E" strokeWidth="1.3" /></g>; })}
          {tool === "select" && one?.type === "connector" && !edit && (() => { const r = resolveConnector(doc, one); return [["ca", r.a], ["cb", r.b]].map(([id, p]) => <circle key={id as string} data-h={id as string} data-testid={`conn-${id}`} cx={(p as Pt).x} cy={(p as Pt).y} r={px(7)} fill="#fff" stroke="#4262FF" strokeWidth={px(2)} style={{ cursor: "grab" }} />); })()}
          {voting && Object.entries(voting.votes).filter(([id, n]) => n > 0 && doc.objects[id]).map(([id, n]) => { const b = boundsOf(doc, doc.objects[id]); return <g key={"vote" + id} transform={`translate(${b.x + b.w - px(14)} ${b.y + b.h - px(14)})`} style={{ pointerEvents: "none" }}><circle r={px(12)} fill="#4262FF" stroke="#fff" strokeWidth={px(2)} /><text textAnchor="middle" dominantBaseline="central" fontSize={px(12)} fontWeight={700} fill="#fff" fontFamily="var(--ids-font-sans)">{n}</text></g>; })}
          {doc.order.filter(i => (doc.objects[i] as { private?: boolean }).private).map(i => { const b = boundsOf(doc, doc.objects[i]); return <g key={"priv" + i} style={{ pointerEvents: "none" }}><rect x={b.x} y={b.y} width={b.w} height={b.h} fill="url(#mi-hatch)" opacity={0.9} /><text x={b.x + b.w / 2} y={b.y + b.h / 2} textAnchor="middle" dominantBaseline="central" fontSize={px(13)} fill="#555A6A" fontFamily="var(--ids-font-sans)">Private</text></g>; })}
          {/* snapping guides, marquee, drafts */}
          {guides.map((gd, i) => gd.axis === "x" ? <line key={i} x1={gd.at} x2={gd.at} y1={gd.from - px(12)} y2={gd.to + px(12)} stroke="#E0457B" strokeWidth={px(1)} strokeDasharray={`${px(5)} ${px(4)}`} /> : <line key={i} y1={gd.at} y2={gd.at} x1={gd.from - px(12)} x2={gd.to + px(12)} stroke="#E0457B" strokeWidth={px(1)} strokeDasharray={`${px(5)} ${px(4)}`} />)}
          {marq && <rect x={marq.x} y={marq.y} width={marq.w} height={marq.h} fill="rgba(66,98,255,.08)" stroke="#4262FF" strokeWidth={px(1)} />}
          {draft?.kind === "box" && (draft.tool === "frame" ? <rect {...draft.box} fill="rgba(255,255,255,.5)" stroke="#4262FF" strokeWidth={px(1.5)} strokeDasharray={`${px(6)} ${px(4)}`} /> : draft.tool === "sticky" || draft.tool === "text" ? null : <g transform={`translate(${draft.box.x} ${draft.box.y})`}><path d={shapePath(draft.tool === "ellipse" ? "ellipse" : draft.tool === "diamond" ? "diamond" : "rect", draft.box.w, draft.box.h)} fill="rgba(66,98,255,.08)" stroke="#4262FF" strokeWidth={px(1.5)} strokeDasharray={`${px(6)} ${px(4)}`} /></g>)}
          {draft?.kind === "pen" && <path d={penPath(draft.pts)} fill="none" stroke={last.current.penColor} strokeWidth={last.current.penWidth} strokeLinecap="round" strokeLinejoin="round" />}
          {draft?.kind === "conn" && <path d={`M${draft.a.x} ${draft.a.y}L${draft.b.x} ${draft.b.y}`} stroke="#4262FF" strokeWidth={px(2)} strokeDasharray={`${px(6)} ${px(4)}`} fill="none" />}
        </g>
      </svg>
      <PeerCursors peers={Object.values(peers)} toScreen={p => worldToScreen(view, size, p)} />
      {Object.values(peers).filter(p => p.sel?.length).map(p => p.sel!.filter(i => doc.objects[i]).map(i => { const b = boundsOf(doc, doc.objects[i]); const a = worldToScreen(view, size, { x: b.x, y: b.y }); return <div key={p.id + i} className="lv-sel" style={{ left: a.x - 2, top: a.y - 2, width: b.w * z + 4, height: b.h * z + 4, borderColor: p.color }} aria-hidden />; }))}
      {edit && doc.objects[edit.id] && <TextEditor key={edit.id} doc={doc} id={edit.id} view={view} size={size} onDone={finishEdit} />}
      {sBox && (!edit || (one && edit.id === one.id && one.type !== "text")) && !g.current && tool === "select" && one?.type !== "comment" && <SelectionToolbar doc={doc} ids={sel} screenBox={sBox} canvas={size} patch={patchSel} onDelete={del} onDuplicate={dup} onFront={() => commitDoc(bringToFront(doc, sel))} onBack={() => commitDoc(sendToBack(doc, sel))} onFrame={frameSel} onAlign={(a: Align) => commitDoc(align(doc, sel, a))} onDistribute={a => commitDoc(distribute(doc, sel, a))} onConvert={convertSel} onGroup={() => (selObjs.some(o => o.group) ? ungroupSel() : groupSel())} />}
    </div>

    {hint && (doc.order.length === 0 || (firstRun && (edit || tool !== "select"))) && <div className={"mi-hint" + (doc.order.length === 0 && chips && !edit ? " hi" : "")} data-ui data-testid={doc.order.length === 0 && !edit ? "empty-hint" : "hint"}>{hint}</div>}
    {chips && !readOnly && doc.order.length === 0 && !edit && <div className="mb-chips" data-ui>
      <button onClick={() => flash("AI board starters aren't in MiroIsDead yet")}><i className="c1" />Prep a workshop</button><button onClick={() => flash("AI board starters aren't in MiroIsDead yet")}><i className="c2" />Map a process</button><button onClick={() => flash("AI board starters aren't in MiroIsDead yet")}><i className="c3" />Build a roadmap</button>
      <button className="x" aria-label="Dismiss suggestions" onClick={() => setChips(false)}>{X.close}</button></div>}
    {!readOnly && !embed && !present && <div className="mb-ai" data-ui onClick={() => setShare("AI")}>{X.plusS}<span>Where shall we start?</span>{X.mic}</div>}
    <div className="mb-zoom" data-ui>
      <button className={"mb-t sm" + (frames ? " on" : "")} onClick={() => setFrames(f => !f)} aria-label="Frames" title="Frames" aria-expanded={frames}>{X.frame}</button>
      <button className="mb-t sm" onClick={() => zoomBy(0.8)} aria-label="Zoom out" title="Zoom out (⌘ −)">{X.minus}</button>
      <span className="mi-menuwrap"><button className={"mb-zv" + (zoomMenu ? " on" : "")} onClick={() => setZoomMenu(m => !m)} title="Zoom and navigation" aria-haspopup="menu" aria-expanded={zoomMenu} data-testid="zoom-level">{Math.round(z * 100)}%</button>
        {zoomMenu && <ZoomMenu onClose={() => setZoomMenu(false)} zoom={z} setZoom={zoomTo} a={{ fullscreen, minimap: map, toggleMinimap: () => setMap(m => !m), grid, toggleGrid: () => setGrid(g => !g), dims, toggleDims: () => setDims(d => !d), fit: fitAll, fitSel, hasSel: sel.length > 0 }} />}</span>
      <button className="mb-t sm" onClick={() => zoomBy(1.25)} aria-label="Zoom in" title="Zoom in (⌘ +)">{X.plusS}</button>
      <span className="mi-menuwrap"><button className={"mb-t sm" + (helpMenu ? " on" : "")} onClick={() => setHelpMenu(m => !m)} aria-label="Help and resources" title="Help and resources" aria-haspopup="menu" aria-expanded={helpMenu}>{X.help}</button>
        {helpMenu && <HelpMenu onClose={() => setHelpMenu(false)} a={{ feedback: () => window.open("https://github.com/tommy-muckstack/miroisdead/issues/new", "_blank"), help: () => window.open("https://github.com/tommy-muckstack/miroisdead#readme", "_blank"), learn: () => window.open(`${BP}/app`, "_self"), news: () => window.open("https://github.com/tommy-muckstack/miroisdead/commits/main", "_blank"), shortcuts: () => setHelp(true) }} />}</span>
    </div>
    {frames && <FramesPanel doc={doc} onClose={() => setFrames(false)} onJump={jumpTo} onCreate={createFrame} onRename={id => startEdit(id)} onPresent={startPresent} />}
    {ctx && <ContextMenu x={ctx.x} y={ctx.y} canvas={size} onClose={() => setCtx(null)} target={ctx.id ? doc.objects[ctx.id] : null} a={{ copy: () => copy(false), copyLink: () => copyLink(ctx.id ?? undefined), copyImage: () => void copyImage(), dup, del, comment: () => { const o = ctx.id ? doc.objects[ctx.id] : null; if (!o || !isBox(o)) return; const c: CommentObj = { id: nid(), type: "comment", x: o.x + o.w - 20, y: o.y - 36, w: 40, h: 36, thread: [] }; commitDoc(addObjects(doc, [c])); setSel([c.id]); setThread(c.id); setHideComments(false); }, copyStyle, pasteStyle, canPasteStyle: !!styleClip.current, clear: clearContent, front: () => commitDoc(bringToFront(doc, sel)), back: () => commitDoc(sendToBack(doc, sel)), forward, backward, link: () => flash("Links on objects aren't in MiroIsDead yet"), lock: toggleLock, locked: !!(ctx.id && (doc.objects[ctx.id] as { locked?: boolean }).locked), frame: frameSel, template: saveTemplate, csv: exportCsv, paste: () => void paste(), canPaste: clip.current.length > 0, selectAll: () => setSel(doc.order.slice()), fit: fitAll, grid: () => setGrid(g => !g), gridOn: grid }} />}
    {tool === "sticky" && <StickyPicker top={compact ? (banner ? 120 : 64) : Math.max(banner ? 120 : 64, size.h / 2 - 250 + (banner ? 56 : 0))} value={last.current.stickyColor} onPick={c => { last.current.stickyColor = c; if (sel.length) patchSel({ color: c } as Partial<Obj>); setTool(t => t); }} />}
    {palette && <CommandPalette commands={commands.map(c => ({ ...c, run: () => { track(EVENTS.board_command_run, { command: c.id }); c.run(); } }))} onClose={() => setPalette(false)} />}
    {present && <PresentBar index={present.i} total={frameIds().length} onPrev={() => presentGo(-1)} onNext={() => presentGo(1)} onExit={exitPresent} title={title || "Untitled"} />}
    <Reactions items={reacts} />
    {thread && doc.objects[thread]?.type === "comment" && <CommentThread c={doc.objects[thread] as CommentObj} view={view} size={size} who={who} onClose={() => setThread(null)}
      onReply={text => { track(EVENTS.board_comment_posted, { reply: (doc.objects[thread] as CommentObj).thread.length > 0 }); commitDoc(updateObjects(doc, [thread], o => ({ thread: [...(o as CommentObj).thread, { by: who, text, at: Date.now() }] }) as Partial<Obj>)); }}
      onResolve={() => commitDoc(updateObjects(doc, [thread], o => ({ resolved: !(o as CommentObj).resolved }) as Partial<Obj>))}
      onDelete={() => { commitDoc(removeObjects(doc, [thread])); setThread(null); setSel([]); }}
      onDeleteReply={i => commitDoc(updateObjects(doc, [thread], o => ({ thread: (o as CommentObj).thread.filter((_, n) => n !== i) }) as Partial<Obj>))} />}
    {commentsPanel && <CommentsPanel doc={doc} onClose={() => setCommentsPanel(false)} onJump={id => { jumpTo(id); setThread(id); }} hidden={hideComments} onToggleHidden={() => setHideComments(h => !h)} />}
    {timerOpen && <TimerPanel timer={timer} setTimer={t => { if (t?.endsAt && !timer?.endsAt) track(EVENTS.board_timer_started, { minutes: Math.round(t.total / 60000) }); setTimer(t); }} onClose={() => setTimerOpen(false)} />}
    {votingOpen && <VotingPanel doc={doc} voting={voting} setVoting={v => { if (v?.running && !voting?.running) track(EVENTS.board_voting_started, { votes_per_person: v.perPerson }); if (v && !v.running && voting?.running) track(EVENTS.board_voting_ended, { votes_cast: Object.values(v.votes).reduce((a, b) => a + b, 0) }); setVoting(v); if (v?.running) setSel([]); }} onClose={() => setVotingOpen(false)} onJump={jumpTo} />}
    {noteOpen && <NotePanel value={note} onChange={setNote} onClose={() => setNoteOpen(false)} />}
    {priv && <div className="mm-privbar" data-ui>{X.privateMode} Private mode: new stickies are hidden from others until revealed <button onClick={() => { commitDoc(updateObjects(doc, doc.order.filter(i => (doc.objects[i] as { private?: boolean }).private), { private: false } as Partial<Obj>)); setPriv(false); flash("Stickies revealed"); }}>Reveal all</button></div>}
    {stickers && <StickerPanel top={compact ? (banner ? 120 : 64) : Math.max(banner ? 120 : 64, size.h / 2 - 304 + (banner ? 56 : 0))} onPick={addSticker} onClose={() => setStickers(false)} />}
    <input ref={fileInput} type="file" accept="image/png,image/jpeg,image/webp,image/gif" multiple hidden data-testid="upload-input" onChange={e => { void addImages([...(e.target.files ?? [])]); e.target.value = ""; }} />
    {tools && <ToolsPanel top={compact ? (banner ? 120 : 64) : Math.max(banner ? 120 : 64, size.h / 2 - 304 + (banner ? 56 : 0))} onClose={() => setTools(false)} tools={toolEntries} />}
    {(status === "device" || status === "error") && <div className="mb-save" data-ui role="status">{statusText}</div>}
    {titlePrompt !== null && <div className="mb-scrim mb-dlg-scrim" data-ui onMouseDown={e => { if (e.target === e.currentTarget) setTitlePrompt(null); }}>
      <form className="mb-dlg" role="dialog" aria-label="Give your board a title" data-testid="title-prompt" onSubmit={e => { e.preventDefault(); const t = titlePrompt.trim(); if (t) { setTitle(t); flash("Saved"); } setTitlePrompt(null); setShare("Invite"); track(EVENTS.board_share_opened, { tab: "Invite" }); }}>
        <h3>Give your board a title</h3><p>A clear name helps your team find it later.</p>
        <input autoFocus value={titlePrompt} onChange={e => setTitlePrompt(e.target.value)} placeholder="Untitled" aria-label="Board title" maxLength={120} onKeyDown={e => e.stopPropagation()} />
        <div className="mb-dlg-acts"><button type="button" className="mb-btn" onClick={() => { setTitlePrompt(null); setShare("Invite"); track(EVENTS.board_share_opened, { tab: "Invite" }); }}>Skip</button><button type="submit" className="mb-btn primary" disabled={!titlePrompt.trim()}>Save</button></div>
      </form></div>}
    {imgOpts && <div className="mb-scrim mb-dlg-scrim" data-ui onMouseDown={e => { if (e.target === e.currentTarget) setImgOpts(null); }}>
      <form className="mb-dlg" role="dialog" aria-label="Export as image" data-testid="export-image" onSubmit={e => { e.preventDefault(); const o = imgOpts; setImgOpts(null); void exportPng(o); }}>
        <h3>Export as image</h3>
        <label className="mb-dlg-row"><span>Area</span><select value={imgOpts.area} onChange={e => setImgOpts({ ...imgOpts, area: e.target.value as "board" | "selection" })}><option value="board">Whole board</option><option value="selection" disabled={!sel.length}>Selected objects{sel.length ? ` (${sel.length})` : ""}</option></select></label>
        <label className="mb-dlg-row"><span>Quality</span><select value={imgOpts.quality} onChange={e => setImgOpts({ ...imgOpts, quality: e.target.value as "small" | "medium" | "large" })}><option value="small">Small (1×)</option><option value="medium">Medium (2×)</option><option value="large">Large (4×)</option></select></label>
        <label className="mb-dlg-row"><span>Background</span><span className="mb-dlg-chk"><input type="checkbox" checked={imgOpts.bg} onChange={e => setImgOpts({ ...imgOpts, bg: e.target.checked })} /> Include board background</span></label>
        <p className="mb-dlg-note">PNG, rendered on this device. Large exports of big boards can take a few seconds.</p>
        <div className="mb-dlg-acts"><button type="button" className="mb-btn" onClick={() => setImgOpts(null)}>Cancel</button><button type="submit" className="mb-btn primary">Export</button></div>
      </form></div>}
    {share && <ShareModal tab={share} setTab={setShare} onClose={() => setShare("")} who={who} doc={doc} title={title} boardId={initial.id} access={access} setAccess={a => { setAccess(a); track(EVENTS.board_share_access_changed, { access: a }); }} canShare={store.kind === "cloud" && !guest} onTemplate={saveTemplate} onScene={() => void copyScene()} flash={flash} />}
    {map && <Minimap doc={doc} view={view} size={size} onJump={(x, y) => setView(v => ({ ...v, x, y }))} />}
    {help && <ShortcutsPanel onClose={() => setHelp(false)} />}
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

