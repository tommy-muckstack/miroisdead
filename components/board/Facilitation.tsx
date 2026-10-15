"use client";
// Facilitation tools (Miro: reactions, Timer, Voting, Private mode, Note). All free here.
import React, { useEffect, useRef, useState } from "react";
import type { Doc, Id } from "@/lib/canvas/types";
import { X } from "@/components/mxi";
import { Pop, Item, Hr } from "./Menus";

export const REACTIONS = ["👍", "💖", "🔥", "🤯", "🎉", "👋"];
export type Timer = { total: number; endsAt: number | null; left: number } | null;
export type Voting = { perPerson: number; votes: Record<Id, number>; running: boolean; endedAt?: number } | null;

export function FacilitationPopover({ onClose, onReact, timer, onTimer, voting, onVoting, priv, onPrivate, onNote }: { onClose: () => void; onReact: (e: string) => void; timer: Timer; onTimer: () => void; voting: Voting; onVoting: () => void; priv: boolean; onPrivate: () => void; onNote: () => void }) {
  const go = (f: () => void) => () => { onClose(); f(); };
  return <Pop className="mm-fac" onClose={onClose} testid="facilitation-menu">
    <div className="mm-react">{REACTIONS.map(e => <button key={e} type="button" aria-label={`React ${e}`} onClick={() => onReact(e)}>{e}</button>)}</div>
    <Hr />
    <Item icon={X.timer} label={timer ? "Timer (running)" : "Timer"} on={!!timer} onClick={go(onTimer)} />
    <Item icon={X.vote} label={voting?.running ? "Voting (in progress)" : "Voting"} on={!!voting?.running} onClick={go(onVoting)} />
    <Item icon={X.privateMode} label={priv ? "Private mode (on)" : "Private mode"} on={priv} onClick={go(onPrivate)} />
    <Item icon={X.note} label="Note" onClick={go(onNote)} />
  </Pop>;
}

/** Floating reaction that drifts up from the bottom centre and fades (Miro shows the sender's reactions over the canvas). */
export function Reactions({ items }: { items: { id: number; e: string; x: number }[] }) {
  return <div className="mm-reactions" aria-hidden>{items.map(r => <span key={r.id} style={{ left: `${r.x}%` }}>{r.e}</span>)}</div>;
}

const fmt = (ms: number) => { const s = Math.max(0, Math.round(ms / 1000)); return `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`; };
export function TimerPanel({ timer, setTimer, onClose }: { timer: Timer; setTimer: (t: Timer) => void; onClose: () => void }) {
  const [mins, setMins] = useState(5);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!timer?.endsAt) return; const i = setInterval(() => setNow(Date.now()), 250); return () => clearInterval(i); }, [timer?.endsAt]);
  const left = timer ? (timer.endsAt ? Math.max(0, timer.endsAt - now) : timer.left) : mins * 60_000;
  const done = timer?.endsAt && left === 0;
  useEffect(() => { if (done) { try { const ac = new AudioContext(); const o = ac.createOscillator(); const g = ac.createGain(); o.connect(g); g.connect(ac.destination); o.frequency.value = 880; g.gain.value = 0.08; o.start(); o.stop(ac.currentTime + 0.6); } catch { /* no audio */ } } }, [done]);
  const start = () => setTimer({ total: left, endsAt: Date.now() + left, left });
  const pause = () => timer && setTimer({ ...timer, endsAt: null, left });
  const reset = () => setTimer(null);
  return <div className="mm-timer" data-ui data-testid="timer-panel" onPointerDown={e => e.stopPropagation()}>
    <header><b>{X.timer} Timer</b><button className="mm-x" aria-label="Close" onClick={onClose}>{X.close}</button></header>
    <div className={"mm-timer-big" + (done ? " done" : "")}>{fmt(left)}</div>
    {!timer && <div className="mm-timer-presets">{[1, 5, 10, 15, 30].map(m => <button key={m} className={mins === m ? "on" : ""} onClick={() => setMins(m)}>{m} min</button>)}<label><input type="number" min={1} max={180} value={mins} onChange={e => setMins(Math.max(1, Math.min(180, +e.target.value || 1)))} /> min</label></div>}
    <div className="mm-timer-acts">{timer?.endsAt && !done ? <button className="mx-dark" onClick={pause}>Pause</button> : <button className="mx-dark" onClick={start} disabled={!!done}>{timer ? "Resume" : "Start"}</button>}{timer && <button className="mx-light" onClick={reset}>Reset</button>}</div>
    {done && <p className="mm-timer-done">Time's up!</p>}
  </div>;
}
/** Compact running timer shown in the top-right pill area. */
export function TimerChip({ timer, onClick }: { timer: Timer; onClick: () => void }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { if (!timer?.endsAt) return; const i = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(i); }, [timer?.endsAt]);
  if (!timer) return null;
  const left = timer.endsAt ? Math.max(0, timer.endsAt - now) : timer.left;
  return <button className={"mm-timerchip" + (left === 0 ? " done" : "")} onClick={onClick} data-ui data-testid="timer-chip">{X.timer} {fmt(left)}</button>;
}

export function VotingPanel({ doc, voting, setVoting, onClose, onJump }: { doc: Doc; voting: Voting; setVoting: (v: Voting) => void; onClose: () => void; onJump: (id: Id) => void }) {
  const [per, setPer] = useState(voting?.perPerson ?? 10);
  const used = voting ? Object.values(voting.votes).reduce((a, b) => a + b, 0) : 0;
  const results = voting ? Object.entries(voting.votes).filter(([id]) => doc.objects[id]).sort((a, b) => b[1] - a[1]) : [];
  const label = (id: Id) => { const o = doc.objects[id]; if (!o) return id; return o.type === "frame" ? o.name : o.type === "connector" ? o.label || "Connector" : "text" in o && o.text ? o.text.slice(0, 40) : o.type; };
  return <div className="mm-timer mm-voting" data-ui data-testid="voting-panel" onPointerDown={e => e.stopPropagation()}>
    <header><b>{X.vote} Voting</b><button className="mm-x" aria-label="Close" onClick={onClose}>{X.close}</button></header>
    {!voting && <><p>Everyone gets a number of votes. Click stickies, shapes or text to vote; click again to take a vote back.</p><label className="mm-field">Votes per person <input type="number" min={1} max={50} value={per} onChange={e => setPer(Math.max(1, Math.min(50, +e.target.value || 1)))} /></label><div className="mm-timer-acts"><button className="mx-dark" onClick={() => setVoting({ perPerson: per, votes: {}, running: true })}>Start voting</button></div></>}
    {voting?.running && <><p className="mm-votes-left"><b>{Math.max(0, voting.perPerson - used)}</b> of {voting.perPerson} votes left</p><p>Click an object on the board to vote.</p><div className="mm-timer-acts"><button className="mx-dark" onClick={() => setVoting({ ...voting, running: false, endedAt: Date.now() })}>End voting</button><button className="mx-light" onClick={() => setVoting(null)}>Cancel</button></div></>}
    {voting && !voting.running && <><h4>Results</h4>{results.length === 0 ? <p>No votes were cast.</p> : <ol className="mm-results">{results.map(([id, n]) => <li key={id}><button onClick={() => onJump(id)}><span className="t">{label(id)}</span><b>{n}</b></button></li>)}</ol>}<div className="mm-timer-acts"><button className="mx-dark" onClick={() => setVoting({ perPerson: voting.perPerson, votes: {}, running: true })}>New session</button><button className="mx-light" onClick={() => setVoting(null)}>Close session</button></div></>}
  </div>;
}

export function NotePanel({ value, onChange, onClose }: { value: string; onChange: (v: string) => void; onClose: () => void }) {
  const ref = useRef<HTMLTextAreaElement>(null); useEffect(() => { ref.current?.focus(); }, []);
  return <div className="mm-timer mm-note" data-ui data-testid="note-panel" onPointerDown={e => e.stopPropagation()}>
    <header><b>{X.note} Note</b><button className="mm-x" aria-label="Close" onClick={onClose}>{X.close}</button></header>
    <textarea ref={ref} placeholder="Agenda, instructions, links… everyone on the board can read this note." value={value} onChange={e => onChange(e.target.value)} onKeyDown={e => e.stopPropagation()} />
  </div>;
}
