"use client";
// Collaborator cursors (Miro-style arrow + name chip) and the avatar stack in the top-right pill.
import React from "react";
import type { Peer } from "@/lib/live";
export type PeerState = Peer & { x?: number; y?: number; seen: number; sel?: string[] };
export function PeerCursors({ peers, toScreen }: { peers: PeerState[]; toScreen: (p: { x: number; y: number }) => { x: number; y: number } }) {
  return <div className="lv-cursors" aria-hidden>{peers.filter(p => p.x !== undefined).map(p => { const s = toScreen({ x: p.x!, y: p.y! }); return <div key={p.id} className="lv-cur" style={{ transform: `translate(${s.x}px, ${s.y}px)`, color: p.color }}><svg width="18" height="18" viewBox="0 0 24 24" fill={p.color} stroke="#fff" strokeWidth="1.5"><path d="M5.5 3.5l14 6.8-5.8 2-2 5.9z" /></svg><span style={{ background: p.color }}>{p.name}</span></div>; })}</div>;
}
export function PeerAvatars({ peers, me }: { peers: PeerState[]; me: Peer }) {
  const all = [me, ...peers];
  return <span className="lv-avs" title={all.map(p => p.name).join(", ")} data-testid="peer-avatars">{all.slice(0, 4).map(p => <i key={p.id} style={{ background: p.color }}>{p.name.slice(0, 1).toUpperCase()}</i>)}{all.length > 1 && <b>{all.length}</b>}</span>;
}
