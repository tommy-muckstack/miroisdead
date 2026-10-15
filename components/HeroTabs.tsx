"use client";
import { useState } from "react";
import Link from "next/link";
import { BP } from "@/lib/basepath";
import { track, EVENTS } from "@/lib/analytics";
const TABS = [
  { id: "research", label: "Research", img: "research.png", h: "Turn research into shared direction", cta: "Explore research", ps: ["Paste outputs from any research tool or AI assistant onto one canvas", "Review and surface what matters, together", "Flow insights back out to roadmaps, specs, or your next AI prompt"] },
  { id: "roadmap", label: "Roadmap & Planning", img: "roadmap.png", h: "Plan together, and keep it in sync", cta: "Explore roadmaps", ps: ["Bring backlog, priorities and notes onto the canvas as stickies and frames", "Sequence the work and weigh tradeoffs together, from roadmaps to trackers", "Everything autosaves, so plan and delivery never drift apart"] },
  { id: "diagrams", label: "Diagrams", img: "diagrams.png", h: "Map your processes. Make them visible to everyone", cta: "Explore diagrams", ps: ["Describe your workflow to your AI agent and bring it in as a process map", "Swim lanes, decision points, and sequence flows on one canvas", "Spot where things break down and agree on what to fix"] },
  { id: "workshops", label: "Workshops", img: "workshops.png", h: "Run a workshop the whole team leans into", cta: "Explore workshops", ps: ["Start from a ready-to-run board and pre-fill it with context", "Run the session and build shared understanding, together", "Export next steps as SVG or a board file, wherever you track work"] },
];
export function HeroTabs() {
  const [i, setI] = useState(0); const t = TABS[i];
  return <div className="mk-tabs">
    <div className="mk-pill" role="tablist" aria-label="Use cases">{TABS.map((x, n) => <button key={x.id} role="tab" aria-selected={n === i} aria-controls="mi-tabpanel" className={n === i ? "on" : ""} onClick={() => { setI(n); track(EVENTS.site_use_case_tab_selected, { tab: x.id }); }}>{x.label}</button>)}</div>
    <div className="mk-split" id="mi-tabpanel" role="tabpanel" data-testid="tabpanel">
      <div><h2>{t.h}</h2><ul>{t.ps.map(p => <li key={p}>{p}</li>)}</ul><Link className="mk-dark" href="/signup" onClick={() => track(EVENTS.site_cta_clicked, { cta: "use_case_" + t.id })}>{t.cta}</Link></div>
      <img className="mi-shot" src={`${BP}/home/${t.img}`} alt={`A MiroIsDead board for ${t.label.toLowerCase()}`} width={1440} height={900} />
    </div>
  </div>;
}
