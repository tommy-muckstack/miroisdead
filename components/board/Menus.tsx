"use client";
// Board chrome menus and panels, matched to Miro's board UI (export, main menu, zoom, help, shortcuts, context menu, frames, sticky picker, tools panel).
import { kbd, useMac } from "@/lib/keys";
import React, { useEffect, useRef, useState } from "react";
import type { Doc, FrameObj, Id, Obj, View } from "@/lib/canvas/types";
import { STICKY_COLORS } from "@/lib/canvas/types";
import { X } from "@/components/mxi";

export const MIRO_STICKY_COLORS = ["#FFF9B1", "#FCF28C", "#FFD8A8", "#FFBFBF", "#FFC7F0", "#F6A5F5", "#C3CBFF", "#D0BDFF", "#B9E6FF", "#9BB9FF", "#B7EFEF", "#9FE1C8", "#CFF4C0", "#D5EB9A", "#E6E6E6", "#2D2D2D"] as const;

/** Keyboard-dismissable popover shell. */
export function Pop({ children, className, style, onClose, role = "menu", testid }: { children: React.ReactNode; className?: string; style?: React.CSSProperties; onClose: () => void; role?: string; testid?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } };
    const d = (e: PointerEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) onClose(); };
    window.addEventListener("keydown", k, true); window.addEventListener("pointerdown", d, true);
    return () => { window.removeEventListener("keydown", k, true); window.removeEventListener("pointerdown", d, true); };
  }, [onClose]);
  return <div ref={ref} className={"mm-pop " + (className ?? "")} style={style} role={role} data-ui data-testid={testid} onPointerDown={e => e.stopPropagation()}>{children}</div>;
}
export const Item = ({ icon, label, kbd: kb, onClick, sub, disabled, info, right, on }: { icon?: React.ReactNode; label: string; kbd?: string; onClick?: () => void; sub?: boolean; disabled?: boolean; info?: boolean; right?: React.ReactNode; on?: boolean }) =>
  <button type="button" role="menuitem" className={"mm-item" + (on ? " on" : "")} disabled={disabled} onClick={onClick}><span className="ic">{icon}</span><span className="lb">{label}</span>{info && <span className="inf">{X.info}</span>}{right}{kb && <kbd>{kbd(kb, useMacCtx())}</kbd>}{sub && <span className="sub">{X.chevR}</span>}</button>;
export const Hr = () => <hr className="mm-hr" />;
// Item is rendered inside menus that are only mounted after hydration, so reading the platform directly is safe here.
const useMacCtx = () => (typeof navigator === "undefined" ? true : /mac|iphone|ipad|ipod/i.test((navigator as { userAgentData?: { platform?: string } }).userAgentData?.platform ?? navigator.platform ?? ""));

// ---------- export ----------
export type ExportActions = { pdf: () => void; image: () => void; template: () => void; csv: () => void; backup: () => void; embed: () => void; drive: () => void };
export function ExportMenu({ onClose, a }: { onClose: () => void; a: ExportActions }) {
  const go = (f: () => void) => () => { onClose(); f(); };
  return <Pop className="mm-export" onClose={onClose} testid="export-menu">
    <Item icon={X.pdf} label="Save as PDF" onClick={go(a.pdf)} />
    <Item icon={X.image} label="Export as image" onClick={go(a.image)} />
    <Item icon={X.tplS} label="Save board as template" onClick={go(a.template)} />
    <Item icon={X.table} label="Export to spreadsheet (CSV)" onClick={go(a.csv)} />
    <Item icon={X.download} label="Download board backup" onClick={go(a.backup)} />
    <Item icon={X.code} label="Embed" onClick={go(a.embed)} />
    <Item icon={X.drive} label="Save to Google Drive" onClick={go(a.drive)} />
  </Pop>;
}

// ---------- main (kebab) menu with submenus ----------
export type MainActions = { rename: () => void; duplicate: () => void; back: () => void; undo: () => void; redo: () => void; canUndo: boolean; canRedo: boolean; selectAll: () => void; dup: () => void; del: () => void; hasSel: boolean; minimap: boolean; toggleMinimap: () => void; grid: boolean; toggleGrid: () => void; fullscreen: () => void; fit: () => void; snap: boolean; toggleSnap: () => void; dims: boolean; toggleDims: () => void; shortcuts: () => void; flash: (m: string) => void };
export function MainMenu({ onClose, a }: { onClose: () => void; a: MainActions }) {
  const [sub, setSub] = useState<"" | "board" | "edit" | "view" | "prefs" | "a11y">("");
  const go = (f: () => void) => () => { onClose(); f(); };
  const Row = ({ k, icon, label }: { k: typeof sub; icon: React.ReactNode; label: string }) => <div onPointerEnter={() => setSub(k)}><Item icon={icon} label={label} sub on={sub === k} /></div>;
  return <Pop className="mm-main" onClose={onClose} testid="main-menu">
    <Row k="board" icon={X.board} label="Board" /><Row k="edit" icon={X.pen2} label="Edit" /><Row k="view" icon={X.eye} label="View" /><Row k="prefs" icon={X.sliders} label="Preferences" /><Row k="a11y" icon={X.a11y} label="Accessibility" />
    <Hr /><Item icon={X.check} label="Assign status" info onClick={go(() => a.flash("Board status is set from the dashboard"))} /><Item icon={X.display} label="Send to interactive display" onClick={go(() => a.flash("No interactive displays are paired"))} />
    {sub && <div className="mm-sub" onPointerLeave={() => setSub("")}>
      {sub === "board" && <><Item icon={X.pen2} label="Rename board" onClick={go(a.rename)} /><Item icon={X.copy} label="Duplicate board" onClick={go(a.duplicate)} /><Item icon={X.board} label="All boards" onClick={go(a.back)} /></>}
      {sub === "edit" && <><Item icon={X.undo} label="Undo" kbd="⌘Z" disabled={!a.canUndo} onClick={go(a.undo)} /><Item icon={X.redo} label="Redo" kbd="⇧⌘Z" disabled={!a.canRedo} onClick={go(a.redo)} /><Hr /><Item label="Select all" kbd="⌘A" onClick={go(a.selectAll)} /><Item label="Duplicate" kbd="⌘D" disabled={!a.hasSel} onClick={go(a.dup)} /><Item label="Delete" kbd="⌫" disabled={!a.hasSel} onClick={go(a.del)} /></>}
      {sub === "view" && <><Item icon={X.fullscreen} label="Enter full screen" onClick={go(a.fullscreen)} /><Item icon={X.map} label={a.minimap ? "Hide minimap" : "Show minimap"} kbd="M" onClick={go(a.toggleMinimap)} /><Item icon={X.grid2} label={a.grid ? "Hide grid" : "Show grid"} kbd="G" onClick={go(a.toggleGrid)} /><Item icon={X.fit} label="Fit to screen" kbd="⌥1" onClick={go(a.fit)} /></>}
      {sub === "prefs" && <><Item label="Snap to objects" right={<Toggle on={a.snap} />} onClick={a.toggleSnap} /><Item label="Object dimensions" right={<Toggle on={a.dims} />} onClick={a.toggleDims} /><Item label="Show grid" right={<Toggle on={a.grid} />} onClick={a.toggleGrid} /></>}
      {sub === "a11y" && <><Item icon={X.keys} label="Keyboard shortcuts" kbd="?" onClick={go(a.shortcuts)} /><Item label="Accessible board overview" onClick={go(() => a.flash("Use Tab / Shift+Tab to walk the objects"))} /></>}
    </div>}
  </Pop>;
}
export const Toggle = ({ on }: { on: boolean }) => <span className={"mm-toggle" + (on ? " on" : "")} aria-hidden><i /></span>;

// ---------- zoom menu ----------
export function ZoomMenu({ onClose, zoom, setZoom, a }: { onClose: () => void; zoom: number; setZoom: (z: number) => void; a: { fullscreen: () => void; minimap: boolean; toggleMinimap: () => void; grid: boolean; toggleGrid: () => void; dims: boolean; toggleDims: () => void; fit: () => void; fitSel: () => void; hasSel: boolean } }) {
  const go = (f: () => void) => () => { onClose(); f(); };
  return <Pop className="mm-zoom" onClose={onClose} testid="zoom-menu">
    <Item icon={X.fullscreen} label="Enter full screen" onClick={go(a.fullscreen)} />
    <Item icon={X.map} label={a.minimap ? "Hide minimap" : "Show minimap"} kbd="M" onClick={go(a.toggleMinimap)} />
    <Item icon={X.grid2} label="Grid" right={<Toggle on={a.grid} />} onClick={a.toggleGrid} />
    <Item icon={X.dims} label="Object dimensions" right={<Toggle on={a.dims} />} onClick={a.toggleDims} />
    <Hr />
    <Item icon={X.dims} label="Fit to screen" kbd="⇧ 1" onClick={go(a.fit)} />
    {a.hasSel && <Item icon={X.fit} label="Zoom to selection" kbd="⇧ 2" onClick={go(a.fitSel)} />}
    {[50, 70, 100, 400, 1200, 2000].map(p => <Item key={p} icon={X.zoomIn} label={`${p}%`} kbd={p === 100 ? "⌘ 0" : p === 2000 ? "⌥ 3" : undefined} on={Math.round(zoom * 100) === p} onClick={go(() => setZoom(p / 100))} />)}
  </Pop>;
}

// ---------- help ----------
export function HelpMenu({ onClose, a }: { onClose: () => void; a: { feedback: () => void; help: () => void; learn: () => void; news: () => void; shortcuts: () => void } }) {
  const go = (f: () => void) => () => { onClose(); f(); };
  return <Pop className="mm-help" onClose={onClose} testid="help-menu">
    <Item icon={X.comment2} label="Send feedback" onClick={go(a.feedback)} /><Item icon={X.book} label="Help center" onClick={go(a.help)} /><Item icon={X.learn2} label="Learning center" onClick={go(a.learn)} /><Item icon={X.gift} label="What’s new" onClick={go(a.news)} /><Item icon={X.keys} label="Keyboard shortcuts" onClick={go(a.shortcuts)} />
  </Pop>;
}

// ---------- shortcuts panel (Miro layout: blue header, icon column) ----------
const SC: { title: string; note?: string; rows: [React.ReactNode | null, string, string][] }[] = [
  { title: "Tools", note: "Use 1 – 9 number keys to switch quickly between the tools on the toolbar.", rows: [[X.select, "V / H", "Select tool / Hand"], [X.text, "T", "Text"], [X.sticky, "N", "Sticky note"], [X.shapes, "S", "Shapes"], [X.rect, "R", "Rectangle"], [X.oval, "O", "Oval"], [X.rhombus, "D", "Rhombus"], [X.arrow, "L", "Connection line, arrow"], [X.pen, "P", "Pen"], [X.eraser, "E", "Eraser"], [X.comment, "C", "Comment"], [X.undo, "⌘ + Z", "Undo"], [X.redo, "⌘ + shift + Z", "Redo"], [X.frame, "F", "Frames"], [X.map, "M", "Minimap"], [X.grid2, "G", "Toggle grid"]] },
  { title: "General", rows: [[null, "⌘ + C  ⌘ + V", "Copy / Paste"], [null, "⌘ + X", "Cut"], [null, "⌘ + D", "Duplicate"], [null, "⌥ + drag", "Duplicate"], [null, "shift + drag", "Multi-select"], [null, "⌘ + click", "Select multiple objects"], [null, "⌘ + A", "Select all"], [null, "enter", "Edit selected object"], [null, "esc", "Deselect, quit edit, switch to cursor"], [null, "backspace", "Delete"], [null, "⌘ + G", "Group"], [null, "⌘ + shift + G", "Ungroup"], [null, "⌘ + shift + L", "Lock / Unlock"], [null, "fn + ↑", "Send to front"], [null, "fn + ↓", "Send to back"], [null, "⌘ + ]  ⌘ + [", "Bring forward / send backward"], [null, "⌘ + K", "Open command palette"], [null, "tab", "Add a connected object to the right"], [null, "shift + tab", "Add a connected object below"]] },
  { title: "Navigation", rows: [[null, "← → ↑ ↓", "Move objects / Canvas"], [null, "⌘ + +", "Zoom in"], [null, "⌘ – –", "Zoom out"], [null, "⌘ + 0", "Zoom to 100%"], [null, "⇧ + 1", "Zoom to fit"], [null, "⇧ + 2", "Zoom to selected object"], [null, "⌥ + 3", "Zoom to 2000%"], [null, "space + drag", "Move canvas"], [null, "⌘ + scroll", "Zoom"], [null, "G", "Toggle grid"]] },
  { title: "Text", rows: [[null, "⌘ + B", "Bold"], [null, "⌘ + enter", "Finish editing"], [null, "esc", "Finish editing"]] },
];
export function ShortcutsPanel({ onClose }: { onClose: () => void }) {
  const mac = useMac();
  return <div className="mi-scrim mm-scrim" onPointerDown={onClose} role="dialog" aria-modal="true" aria-label="Shortcuts" data-ui>
    <div className="mm-sc" onPointerDown={e => e.stopPropagation()} data-testid="shortcut-sheet">
      <header><h2>Shortcuts</h2><button className="mm-x" onClick={onClose} aria-label="Close">{X.close}</button></header>
      <div className="mm-sc-body">{SC.map(g => <section key={g.title}><h3>{g.title}</h3>{g.note && <p>{g.note}</p>}<table><tbody>{g.rows.map(([ic, k, d]) => <tr key={k + d}><td className="ic">{ic}</td><td className="k">{kbd(k, mac)}</td><td>{d}</td></tr>)}</tbody></table></section>)}</div>
    </div>
  </div>;
}

// ---------- context menu ----------
export type CtxActions = { copy: () => void; copyLink: () => void; copyImage: () => void; dup: () => void; del: () => void; comment: () => void; copyStyle: () => void; pasteStyle: () => void; canPasteStyle: boolean; clear: () => void; front: () => void; back: () => void; forward: () => void; backward: () => void; link: () => void; lock: () => void; locked: boolean; frame: () => void; template: () => void; csv: () => void; paste: () => void; canPaste: boolean; selectAll: () => void; fit: () => void; grid: () => void; gridOn: boolean };
export function ContextMenu({ x, y, canvas, onClose, target, a }: { x: number; y: number; canvas: { w: number; h: number }; onClose: () => void; target: Obj | null; a: CtxActions }) {
  const [arr, setArr] = useState(false);
  const go = (f: () => void) => () => { onClose(); f(); };
  const H = target ? 560 : 220, left = Math.min(x, canvas.w - 420), top = Math.min(y, Math.max(8, canvas.h - H));
  return <Pop className="mm-ctx" style={{ left, top }} onClose={onClose} testid="context-menu">
    {target ? <>
      <Item label="Copy" kbd="⌘ + C" onClick={go(a.copy)} /><Item label="Copy link" kbd="⌘ + ⌥ + shift + C" onClick={go(a.copyLink)} /><Item label="Copy as image" kbd="⌘ + shift + C" onClick={go(a.copyImage)} /><Item label="Duplicate" kbd="⌘ + D" onClick={go(a.dup)} /><Item label="Delete" kbd="Delete" onClick={go(a.del)} /><Hr />
      <Item label="Add comment" onClick={go(a.comment)} /><Item label="Copy style" kbd="⌘ + ⌥ + C" onClick={go(a.copyStyle)} /><Item label="Paste style" kbd="⌘ + ⌥ + V" disabled={!a.canPasteStyle} onClick={go(a.pasteStyle)} /><Item label="Clear content" kbd="⌘ + Backspace" onClick={go(a.clear)} /><Hr />
      <div onPointerEnter={() => setArr(true)} onPointerLeave={() => setArr(false)} className="mm-arrwrap"><Item label="Arrange" sub on={arr} />{arr && <div className="mm-sub mm-arr"><Item label="Bring to front" kbd="fn + ↑" onClick={go(a.front)} /><Item label="Bring forward" kbd="⌘ + ]" onClick={go(a.forward)} /><Item label="Send backward" kbd="⌘ + [" onClick={go(a.backward)} /><Item label="Send to back" kbd="fn + ↓" onClick={go(a.back)} /></div>}</div><Hr />
      <Item label="Link to" kbd="⌥ + ⌘ + K" onClick={go(a.link)} /><Item label={a.locked ? "Unlock" : "Lock"} kbd="⌘ + shift + L" onClick={go(a.lock)} /><Item label="Create frame" onClick={go(a.frame)} /><Hr />
      <Item label="Save as template" info onClick={go(a.template)} /><Item label="Export to CSV (Excel)" onClick={go(a.csv)} />
    </> : <>
      <Item label="Paste" kbd="⌘ + V" disabled={!a.canPaste} onClick={go(a.paste)} /><Item label="Select all" kbd="⌘ + A" onClick={go(a.selectAll)} /><Hr /><Item label="Zoom to fit" kbd="⇧ + 1" onClick={go(a.fit)} /><Item label={a.gridOn ? "Hide grid" : "Show grid"} kbd="G" onClick={go(a.grid)} />
    </>}
  </Pop>;
}

// ---------- frames panel ----------
export function FramesPanel({ doc, onClose, onJump, onCreate, onRename, onPresent }: { doc: Doc; onClose: () => void; onJump: (id: Id) => void; onCreate: () => void; onRename: (id: Id) => void; onPresent: () => void }) {
  const frames = doc.order.map(i => doc.objects[i]).filter((o): o is FrameObj => o.type === "frame");
  return <aside className="mm-frames" data-ui data-testid="frames-panel" onPointerDown={e => e.stopPropagation()}>
    <header><b>Frames</b><span><button className="mm-x" aria-label="Frame options" onClick={onPresent} title="Present">{X.kebab}</button><button className="mm-x" aria-label="Close" onClick={onClose}>{X.close}</button></span></header>
    {frames.length === 0 ? <div className="mm-frames-empty"><h3>Prepare a presentation</h3><p>Add frames to organize and present your board</p><button className="mx-dark" onClick={onCreate}>Create frame</button></div>
      : <ol>{frames.map((f, i) => <li key={f.id}><button onClick={() => onJump(f.id)} onDoubleClick={() => onRename(f.id)}><span className="n">{i + 1}</span><span className="t">{f.name || "Frame"}</span></button></li>)}<li className="add"><button onClick={onCreate}>{X.plusS} Create frame</button></li></ol>}
    {frames.length > 0 && <footer><button className="mx-dark" onClick={onPresent}>{X.play} Present</button></footer>}
  </aside>;
}

// ---------- sticky colour picker ----------
export function StickyPicker({ value, onPick, top }: { value: string; onPick: (c: string) => void; top?: number }) {
  const colors = [...MIRO_STICKY_COLORS];
  return <div className="mm-stickypick" data-ui role="group" aria-label="Sticky note colour" style={top !== undefined ? { top } : undefined} onPointerDown={e => e.stopPropagation()}>
    {colors.map(c => <button key={c} type="button" className={"sw" + (value.toLowerCase() === c.toLowerCase() ? " on" : "")} style={{ background: c }} aria-label={`Sticky colour ${c}`} onClick={() => onPick(c)} />)}
  </div>;
}
export { STICKY_COLORS };

// ---------- "+" tools panel (compact rail) ----------
export type ToolEntry = { id: string; icon: React.ReactNode; label: string; desc: string; onPick: () => void };
export function ToolsPanel({ onClose, tools, top }: { onClose: () => void; tools: ToolEntry[]; top?: number }) {
  const [q, setQ] = useState(""), [tab, setTab] = useState<"tools" | "market">("tools");
  const list = tools.filter(t => (t.label + " " + t.desc).toLowerCase().includes(q.toLowerCase()));
  return <Pop className="mm-tools" style={top !== undefined ? { top } : undefined} onClose={onClose} role="dialog" testid="tools-panel">
    <label className="mm-search">{X.search}<input autoFocus placeholder="Search tools…" value={q} onChange={e => setQ(e.target.value)} /></label>
    <div className="mm-tabs"><button className={tab === "tools" ? "on" : ""} onClick={() => setTab("tools")}>Tools</button><button className={tab === "market" ? "on" : ""} onClick={() => setTab("market")}>Marketplace</button></div>
    {tab === "tools" ? <>
      <a className="mm-aiban" href="https://github.com/tommy-muckstack/miroisdead#readme" target="_blank" rel="noreferrer"><span className="mk">m</span><b>+</b><i className="d1" /><i className="d2" /><i className="d3" /><span>Let your AI tools do the building</span></a>
      <h4>Pinned</h4>
      {list.map(t => <button key={t.id} className="mm-tool" onClick={() => { onClose(); t.onPick(); }}><span className="ic">{t.icon}</span><span><b>{t.label}</b><small>{t.desc}</small></span></button>)}
      {list.length === 0 && <p className="mm-none">No tools match “{q}”.</p>}
    </> : <p className="mm-none">MiroIsDead is open source: apps and integrations live in the <a href="https://github.com/tommy-muckstack/miroisdead" target="_blank" rel="noreferrer">GitHub repo</a>. Contributions welcome.</p>}
  </Pop>;
}

/** Board emoji picker (Miro: "Choose emoji" next to the title). */
export function EmojiPicker({ onPick, onClose }: { onPick: (e: string) => void; onClose: () => void }) {
  const E = ["🚀", "💡", "📌", "🎯", "🧭", "📊", "🗺️", "🧩", "🎨", "📝", "🔬", "🛠️", "🌱", "⚡", "🔥", "✅", "🧠", "📅", "💬", "🏁", "🎲", "🔭", "🧪", "🏗️"];
  return <Pop className="mm-emoji" onClose={onClose} role="dialog" testid="emoji-picker">{E.map(e => <button key={e} type="button" onClick={() => { onPick(e); onClose(); }}>{e}</button>)}<button type="button" className="none" onClick={() => { onPick(""); onClose(); }}>Remove</button></Pop>;
}
export type { View };

// ---------- ⌘K command palette ----------
export type Command = { id: string; label: string; kbd?: string; group: string; run: () => void; icon?: React.ReactNode };
export function CommandPalette({ commands, onClose }: { commands: Command[]; onClose: () => void }) {
  const mac = useMac();
  const [q, setQ] = useState(""), [i, setI] = useState(0);
  const filt = (v: string) => commands.filter(c => (c.label + " " + c.group).toLowerCase().includes(v.toLowerCase())).slice(0, 12);
  const list = filt(q);
  useEffect(() => { setI(0); }, [q]);
  const run = (c: Command) => { onClose(); c.run(); };
  return <div className="mi-scrim mm-scrim mm-kscrim" onPointerDown={onClose} data-ui role="dialog" aria-label="Command palette">
    <div className="mm-k" onPointerDown={e => e.stopPropagation()} data-testid="command-palette">
      <label className="mm-search">{X.search}<input autoFocus placeholder="Type what you want to create or do… (e.g. sticky note)" value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === "ArrowDown") { e.preventDefault(); setI(n => Math.min(list.length - 1, n + 1)); } if (e.key === "ArrowUp") { e.preventDefault(); setI(n => Math.max(0, n - 1)); } if (e.key === "Enter") { const cur = filt(e.currentTarget.value); const pick = cur[Math.min(i, cur.length - 1)]; if (pick) run(pick); } if (e.key === "Escape") onClose(); }} /></label>
      <ol>{list.map((c, n) => <li key={c.id}><button className={n === i ? "on" : ""} onMouseEnter={() => setI(n)} onClick={() => run(c)}><span className="ic">{c.icon}</span><span className="lb">{c.label}</span><small>{c.group}</small>{c.kbd && <kbd>{kbd(c.kbd, mac)}</kbd>}</button></li>)}{list.length === 0 && <li className="none">Nothing matches “{q}”</li>}</ol>
    </div>
  </div>;
}

// ---------- presentation mode bar ----------
export function PresentBar({ index, total, onPrev, onNext, onExit, title }: { index: number; total: number; onPrev: () => void; onNext: () => void; onExit: () => void; title: string }) {
  return <div className="mm-present" data-ui data-testid="present-bar">
    <span className="t">{title}</span>
    <button onClick={onPrev} disabled={index <= 0} aria-label="Previous frame">{X.chevR}</button><b>{total ? `${index + 1} / ${total}` : "Fit"}</b><button onClick={onNext} disabled={index >= total - 1} aria-label="Next frame">{X.chevR}</button>
    <button className="x" onClick={onExit}>Exit</button>
  </div>;
}
