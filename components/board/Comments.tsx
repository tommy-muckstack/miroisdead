"use client";
// Comment pins and threads (Miro: Comment tool C, pin bubbles on the canvas, thread popover, comments panel, shift+C to hide).
import React, { useEffect, useRef, useState } from "react";
import type { CommentObj, Doc, Id, View } from "@/lib/canvas/types";
import { worldToScreen } from "@/lib/canvas/viewport";
import { X } from "@/components/mxi";

const ago = (t: number) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 60 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : new Date(t).toLocaleDateString(); };
export const initials = (n: string) => (n.split("@")[0].slice(0, 2) || "me").toUpperCase();

/** Pin bubble drawn in the SVG scene layer (world coordinates). */
export function CommentPin({ c, selected, hidden }: { c: CommentObj; selected?: boolean; hidden?: boolean }) {
  if (hidden) return null;
  const n = c.thread.length; const who = c.thread[0]?.by ?? "?";
  return <g data-obj={c.id} transform={`translate(${c.x} ${c.y})`} style={{ cursor: "pointer" }} opacity={c.resolved ? 0.45 : 1}>
    <path d="M0 0 C0 -18 0 -32 16 -32 H 20 A 16 16 0 1 1 20 0 H 16 C 4 0 0 0 0 0 Z" fill={selected ? "#4262FF" : "#fff"} stroke={selected ? "#4262FF" : "#1C1C1E"} strokeWidth={1.5} transform="translate(0 0) scale(1.1)" />
    <circle cx="22" cy="-17" r="11" fill={c.resolved ? "#8E8E93" : "#4262FF"} />
    <text x="22" y="-17" textAnchor="middle" dominantBaseline="central" fontSize="9" fontWeight={700} fill="#fff" fontFamily="var(--ids-font-sans)">{n > 1 ? n : initials(who)}</text>
  </g>;
}

export function CommentThread({ c, view, size, who, onClose, onReply, onResolve, onDelete, onDeleteReply }: { c: CommentObj; view: View; size: { w: number; h: number }; who: string; onClose: () => void; onReply: (text: string) => void; onResolve: () => void; onDelete: () => void; onDeleteReply: (i: number) => void }) {
  const [text, setText] = useState(""); const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => { ref.current?.focus(); }, []);
  const p = worldToScreen(view, size, { x: c.x, y: c.y });
  const left = Math.min(Math.max(8, p.x + 36), size.w - 340), top = Math.min(Math.max(8, p.y - 40), size.h - 320);
  const send = () => { const t = text.trim(); if (!t) return; onReply(t); setText(""); };
  return <div className="mc-thread" data-ui data-testid="comment-thread" style={{ left, top }} onPointerDown={e => e.stopPropagation()}>
    <header><span>{c.resolved ? "Resolved" : "Comment"}</span><span className="acts"><button className="mm-x" title={c.resolved ? "Reopen" : "Resolve"} aria-label={c.resolved ? "Reopen" : "Resolve"} onClick={onResolve}>{X.check}</button><button className="mm-x" title="Delete thread" aria-label="Delete thread" onClick={onDelete}>{X.trash2}</button><button className="mm-x" aria-label="Close" onClick={onClose}>{X.close}</button></span></header>
    <ol className="mc-list">{c.thread.map((m, i) => <li key={i}><i className="mc-av">{initials(m.by)}</i><div><b>{m.by.split("@")[0]}</b> <small>{ago(m.at)}</small><p>{m.text}</p></div>{i > 0 && <button className="mc-del" aria-label="Delete reply" onClick={() => onDeleteReply(i)}>{X.close}</button>}</li>)}</ol>
    <div className="mc-compose"><i className="mc-av">{initials(who)}</i><textarea ref={ref} rows={2} placeholder={c.thread.length ? "Reply…" : "Add a comment…"} value={text} onChange={e => setText(e.target.value)} onKeyDown={e => { e.stopPropagation(); if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } if (e.key === "Escape") onClose(); }} /><button className="mc-send" aria-label="Send" disabled={!text.trim()} onClick={send}>↑</button></div>
  </div>;
}

export function CommentsPanel({ doc, onClose, onJump, hidden, onToggleHidden }: { doc: Doc; onClose: () => void; onJump: (id: Id) => void; hidden: boolean; onToggleHidden: () => void }) {
  const [tab, setTab] = useState<"open" | "resolved">("open");
  const all = doc.order.map(i => doc.objects[i]).filter((o): o is CommentObj => o.type === "comment");
  const list = all.filter(c => (tab === "resolved") === !!c.resolved);
  return <aside className="mm-frames mc-panel" data-ui data-testid="comments-panel" onPointerDown={e => e.stopPropagation()}>
    <header><b>Comments</b><span><button className="mm-x" title={hidden ? "Show comments on board" : "Hide comments on board"} aria-label="Toggle comments on board" onClick={onToggleHidden}>{X.eye}</button><button className="mm-x" aria-label="Close" onClick={onClose}>{X.close}</button></span></header>
    <div className="mm-tabs mc-tabs"><button className={tab === "open" ? "on" : ""} onClick={() => setTab("open")}>Open ({all.filter(c => !c.resolved).length})</button><button className={tab === "resolved" ? "on" : ""} onClick={() => setTab("resolved")}>Resolved ({all.filter(c => c.resolved).length})</button></div>
    {list.length === 0 ? <div className="mm-frames-empty"><h3>{tab === "open" ? "No open comments" : "Nothing resolved yet"}</h3><p>Press C and click anywhere on the board to start a thread.</p></div>
      : <ol>{list.map(c => <li key={c.id}><button onClick={() => onJump(c.id)}><i className="mc-av">{initials(c.thread[0]?.by ?? "?")}</i><span className="t"><b>{c.thread[0]?.by.split("@")[0]}</b> <small>{ago(c.thread[0]?.at ?? Date.now())}</small><em>{c.thread[0]?.text}</em>{c.thread.length > 1 && <small> · {c.thread.length - 1} repl{c.thread.length > 2 ? "ies" : "y"}</small>}</span></button></li>)}</ol>}
  </aside>;
}
