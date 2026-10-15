"use client";
import { useState } from "react";
import Link from "next/link";
import { BP } from "@/lib/basepath";
const TABS = [
  { id: "research", label: "Research", img: "research.png", h: "Cluster what you learned", p: "Dump notes onto stickies, drag them into frames and let the themes show up on their own." },
  { id: "roadmap", label: "Roadmap & Planning", img: "roadmap.png", h: "Plan in lanes", p: "Now, next and later frames, with connectors that show what has to land first." },
  { id: "diagrams", label: "Diagrams", img: "diagrams.png", h: "Flows that keep up with you", p: "Shapes snap to guides and rounded connectors reroute while you drag." },
  { id: "workshops", label: "Workshops", img: "workshops.png", h: "A retro in under a minute", p: "Start from a template, chain stickies with Tab, export the board when you're done." },
];
export function HeroTabs() {
  const [i, setI] = useState(0); const t = TABS[i];
  return <div className="mk-tabs">
    <div className="mk-pill" role="tablist" aria-label="Use cases">{TABS.map((x, n) => <button key={x.id} role="tab" aria-selected={n === i} aria-controls="mi-tabpanel" className={n === i ? "on" : ""} onClick={() => setI(n)}>{x.label}</button>)}</div>
    <div className="mk-split" id="mi-tabpanel" role="tabpanel" data-testid="tabpanel">
      <div><h2>{t.h}</h2><ul><li>{t.p}</li><li>Everything saves as you work, with no board limit.</li><li>Export to SVG or a re-importable file.</li></ul><Link className="mk-dark" href="/signup">Explore {t.label.toLowerCase()}</Link></div>
      <img className="mi-shot" src={`${BP}/home/${t.img}`} alt={`A MiroIsDead board for ${t.label.toLowerCase()}`} width={1440} height={900} />
    </div>
  </div>;
}
