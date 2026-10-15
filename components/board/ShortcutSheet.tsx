"use client";
import React from "react";
import { SHORTCUT_GROUPS } from "@/lib/shortcuts";
import { kbd, useMac } from "@/lib/keys";
export function ShortcutSheet({ onClose }: { onClose: () => void }) {
  const mac = useMac();
  return <div className="mi-scrim" onPointerDown={onClose} role="dialog" aria-modal="true" aria-label="Keyboard shortcuts">
    <div className="mi-sheet" onPointerDown={e => e.stopPropagation()} data-testid="shortcut-sheet">
      <header><h2>Keyboard shortcuts</h2><button className="mi-tb" onClick={onClose} aria-label="Close">✕</button></header>
      <div className="mi-sheet-grid">{SHORTCUT_GROUPS.map(g => <section key={g.title}><h3>{g.title}</h3>{g.rows.map(([k, d]) => <div key={k + d} className="mi-keyrow"><kbd>{kbd(k, mac)}</kbd><span>{d}</span></div>)}</section>)}</div>
    </div>
  </div>;
}
