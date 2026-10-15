"use client";
import { useState } from "react";
import { BP } from "@/lib/basepath";
const TABS = [
  { id: "research", label: "Research", img: "research.png", h: "Cluster what you learned", p: "Dump notes onto stickies, drag them into frames and let the themes show up on their own." },
  { id: "roadmap", label: "Roadmap & Planning", img: "roadmap.png", h: "Plan in lanes", p: "Now, next and later frames, with connectors that show what has to land first." },
  { id: "diagrams", label: "Diagrams", img: "diagrams.png", h: "Flows that keep up with you", p: "Shapes snap to guides and rounded connectors reroute while you drag." },
  { id: "workshops", label: "Workshops", img: "workshops.png", h: "A retro in under a minute", p: "Start from a template, chain stickies with Tab, export the board when you're done." },
];
export function HeroTabs() {
  const [i, setI] = useState(0); const t = TABS[i];
  return <div>
    <div className="mi-tabs" role="tablist" aria-label="Use cases">{TABS.map((x, n) => <button key={x.id} role="tab" aria-selected={n === i} aria-controls="mi-tabpanel" className="mi-tab" onClick={() => setI(n)}>{x.label}</button>)}</div>
    <div className="mi-tabpanel" id="mi-tabpanel" role="tabpanel" data-testid="tabpanel">
      <img className="mi-shot" src={`${BP}/home/${t.img}`} alt={`A MiroIsDead board for ${t.label.toLowerCase()}`} width={1440} height={900} />
      <h3>{t.h}</h3><p className="ids-muted" style={{ margin: 0, fontSize: 18 }}>{t.p}</p>
    </div>
  </div>;
}
