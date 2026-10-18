"use client";
// Hover mega-menus for the marketing nav, laid out like miro.com's (column groups of links). Links point at the
// matching section, the pricing page or sign-up; nothing here is a paid tier.
import React, { useState } from "react";
import Link from "next/link";
import { BP } from "@/lib/basepath";
import { track, EVENTS } from "@/lib/analytics";
const Chev = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 6l4 4 4-4" /></svg>;
type Col = { title: string; items: [string, string][] };
const MENUS: Record<string, Col[]> = {
  Product: [
    { title: "Intelligent Canvas", items: [["Intelligent Canvas", "/#product"], ["Flows", "/#product"], ["Prototypes & Wireframes", "/#templates"], ["Diagrams", "/#templates"], ["Engage", "/#product"]] },
    { title: "AI", items: [["AI overview", "/#solutions"], ["AI workflows", "/#solutions"], ["Connectors", "/#product"], ["Bring your own agent", "/#product"]] },
    { title: "Platform", items: [["Blueprints", "/#product"], ["Integrations", "/#product"], ["Security", "/pricing#security"], ["Developer platform", "https://github.com/tommy-muckstack/miroisdead"], ["Download apps", "/signup"]] },
    { title: "Formats", items: [["Whiteboard", "/#product"], ["Diagrams", "/#templates"], ["Kanban", "/#templates"], ["Timelines", "/#templates"], ["Tables", "/#product"], ["Docs", "/#product"], ["Slides", "/#product"]] },
  ],
  "Use Cases": [
    { title: "Diagramming & process mapping", items: [["Diagramming", "/#templates"], ["Flowcharts", "/#templates"], ["Process mapping", "/#templates"], ["Technical design", "/#templates"]] },
    { title: "Workshops & collaboration", items: [["Workshops", "/#templates"], ["Brainstorming", "/#templates"], ["Mind maps", "/#templates"], ["Design workshops", "/#templates"]] },
    { title: "Product & planning", items: [["Roadmapping", "/#templates"], ["Planning & delivery", "/#templates"], ["Goal planning", "/#templates"], ["Research synthesis", "/#templates"]] },
    { title: "Templates", items: [["Explore templates", "/signup"], ["Customer journey mapping", "/#templates"], ["Prototypes & wireframes", "/#templates"]] },
  ],
  Solutions: [
    { title: "By team size", items: [["Enterprise", "/pricing"], ["Small businesses", "/pricing"], ["Startups", "/pricing"]] },
    { title: "By industry", items: [["Digital", "/#solutions"], ["Professional services", "/#solutions"], ["Manufacturing", "/#solutions"], ["Retail", "/#solutions"], ["Financial services", "/#solutions"], ["Education", "/#solutions"], ["Government", "/#solutions"]] },
    { title: "By team", items: [["Product management", "/#templates"], ["Design & UX", "/#templates"], ["Engineering", "/#templates"], ["Operations", "/#templates"], ["Marketing", "/#templates"], ["IT", "/#templates"]] },
    { title: "By initiative", items: [["AI transformation", "/#solutions"], ["Ways of working", "/#solutions"], ["Customer experience", "/#solutions"], ["Cloud & software transformation", "/#solutions"]] },
  ],
  Resources: [
    { title: "Learn", items: [["Customer stories", "/#resources"], ["Academy", "/#resources"], ["Webinars", "/#resources"], ["Help center", "https://github.com/tommy-muckstack/miroisdead#readme"]] },
    { title: "Connect", items: [["Community", "https://github.com/tommy-muckstack/miroisdead/discussions"], ["Events", "/#resources"], ["Blog", "/#resources"], ["Changelog", "https://github.com/tommy-muckstack/miroisdead/commits/main"]] },
    { title: "Services", items: [["Solution partners", "/#resources"], ["Professional services", "/#resources"], ["Pricing", "/pricing"]] },
  ],
};
export function MegaNav() {
  const [open, setOpen] = useState<string | null>(null);
  const href = (h: string) => (h.startsWith("http") ? h : BP + h);
  return <nav aria-label="Main" className="mk-mega" onMouseLeave={() => setOpen(null)}>
    {Object.entries(MENUS).map(([name, cols]) => <div key={name} className={"mk-mi" + (open === name ? " open" : "")} onMouseEnter={() => setOpen(name)}>
      <button type="button" aria-haspopup="true" aria-expanded={open === name} onClick={() => setOpen(o => o === name ? null : name)} onFocus={() => setOpen(name)}>{name} <Chev /></button>
      {open === name && <div className="mk-panel" role="menu"><div className="mk-panel-in">{cols.map(c => <div key={c.title} className="mk-col"><h4>{c.title}</h4>{c.items.map(([l, h]) => <a key={l} role="menuitem" href={href(h)} onClick={() => track(EVENTS.landing_nav_clicked, { menu: name, item: l })}>{l}</a>)}</div>)}</div></div>}
    </div>)}
    <Link href="/pricing">Pricing</Link>
  </nav>;
}
