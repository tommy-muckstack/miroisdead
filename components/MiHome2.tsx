"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BP } from "@/lib/basepath";
import { Cursor } from "@/components/MiMk";
import { Mark } from "@/components/board/icons";
import { track, EVENTS } from "@/lib/analytics";
import "./mihome2.css";

const GH = "https://github.com/tommy-muckstack/miroisdead";
/** Footer links go to real places: in-app pages, repo pages, or this site's sections. */
const LINK: Record<string, string> = {
  "Apps & Integrations": GH + "#readme", "Templates": "/app", "Developer Platform": GH + "/blob/main/docs/ANALYTICS.md", "Devices": "/app", "Enterprise Guard": "/pricing", "Accessibility": GH + "/issues", "Changelog": GH + "/commits/main",
  "AI Platform": "/#solutions", "Product Acceleration": "/#product", "Business Acceleration": "/#product", "Platform and Capabilities": "/#product",
  "Agile Tools": "/app", "Graphs": "/app", "Online Sticky Notes": "/app", "Customer Journey Mapping": "/app", "Wireframe": "/app", "Kanban Board": "/app", "Online Whiteboard": "/app", "Diagram Online": "/app", "Flowchart Online": "/app",
  "Customer Stories": GH + "/discussions", "Academy": GH + "#readme", "Help Center": GH + "/issues", "Blog": GH + "/commits/main", "Status": "https://www.vercel-status.com", "Community": GH + "/discussions", "Events": GH + "/discussions", "Solution Partners": GH, "Security": GH + "/security",
  "About Us": GH + "#readme", "In the News": GH + "/discussions",
  "Pricing": "/pricing", "Business": "/pricing#mp-business", "Enterprise": "/pricing#mp-enterprise", "Consultants": "/pricing", "Education": "/pricing", "Startups": "/pricing", "NPOs": "/pricing",
};
const FOOT: [string, string[]][] = [
  ["Product", ["Apps & Integrations", "Templates", "Developer Platform", "Devices", "Enterprise Guard", "Accessibility", "Changelog"]],
  ["Solutions", ["AI Platform", "Product Acceleration", "Business Acceleration", "Platform and Capabilities"]],
  ["Tools", ["Agile Tools", "Graphs", "Online Sticky Notes", "Customer Journey Mapping", "Wireframe", "Kanban Board", "Online Whiteboard", "Diagram Online", "Flowchart Online"]],
  ["Resources", ["Customer Stories", "Academy", "Help Center", "Blog", "Status", "Community", "Events", "Solution Partners", "Security"]],
  ["Company", ["About Us", "In the News"]],
  ["Plans & Pricing", ["Pricing", "Business", "Enterprise", "Consultants", "Education", "Startups", "NPOs"]],
];
// No invented customers: the strip names what MiroIsDead is actually built with (all true, all open or free tiers).
const BUILT = ["Next.js", "React", "TypeScript", "Firebase Auth", "Firestore", "WebRTC", "SVG canvas", "Vercel", "PostHog", "Playwright", "Apache-2.0"];
export function MiLogos() {
  return <section className="mh-logos" aria-label="Built with"><div className="mh-logos-in"><span className="mh-logos-lbl">Built in the open with</span><div className="mh-logos-track">{[...BUILT, ...BUILT].map((l, i) => <span key={l + i}>{l}</span>)}</div></div></section>;
}
const SLIDES: [string, string][] = [["Canvas", "Stickies, shapes, frames and connectors that reroute as you move them"], ["Intelligent Canvas", "Empower teamwork on one, infinite, multiplayer canvas"], ["Templates", "Start from a template for brainstorms, flowcharts, retros, roadmaps, kanban and more"], ["Shortcuts", "Keyboard shortcuts for every tool. Press ? on a board to see them all"], ["Autosave", "Boards save as you work, with a local copy as a fallback when you are offline"], ["Export", "Export any board as SVG or JSON, and import JSON boards back in"]];
export function MiNeedle() {
  const cards = [["$0", "for every feature", "linear-gradient(200deg,#3b3a45,#15151a 70%)"], ["0", "plan gates or trial clocks", "linear-gradient(200deg,#8d98b3,#d9dde7 40%,#6d7894)"], ["100%", "open source", "linear-gradient(200deg,#2f4a3c,#10201a 70%)"]];
  return <section className="mh-needle" id="resources">
    <Cursor name="Aida" color="#b7302f" bg="#ffd0cf" x={210} y={200} flip />
    <h2>The only thing more important<br />than moving fast is moving the needle</h2>
    <p className="mh-sub">Free and open source, with every feature included</p>
    <span className="mk-cur mh-aicur" aria-hidden><svg className="mk-cur-a flip" width="14" height="14" viewBox="0 0 24 24" fill="#8a3ffc" stroke="#fff" strokeWidth="1.5"><path d="M5.5 3.5l14 6.8-5.8 2-2 5.9z" /></svg><em>✦</em> Board AI</span>
    <div className="mh-cards">{cards.map(([a, b, bg], i) => <div key={a + i} className="mh-card" style={{ background: bg }}><b>{a}</b><span>{b}</span><i className="mh-co">{["MiroIsDead", "MiroIsDead", "Apache-2.0"][i]}</i></div>)}</div>
    <div className="mh-stats"><div><b>$0</b><span>per seat</span></div><div><b>12</b><span>board templates</span></div><div><b>Apache-2.0</b><span>open source</span></div></div>
  </section>;
}
const Art = ({ i }: { i: number }) => {
  if (i === 0) return <div className="mh-ai"><h3>Bring your <em>TEAM</em> <span className="mh-avs"><i /><i /><i /></span> together on one canvas</h3><div className="mh-aibar">INFINITE CANVAS</div><div className="mh-ai3"><u>STICKIES<small>eight colours, with text that shrinks to fit</small></u><u>CONNECTORS<small>elbow, straight and curved, rerouted live</small></u><u>FRAMES<small>group work so contents move with the frame</small></u></div><div className="mh-aitrust"><b>OPEN SOURCE</b> Apache-2.0 <i>|</i> Free <i>|</i> No plans</div></div>;
  if (i === 1) return <div className="mh-ai mh-inf"><svg viewBox="0 0 640 300" className="mh-infsvg" aria-hidden><defs><linearGradient id="mhg" x1="0" x2="1"><stop offset="0" stopColor="#ffb13b" /><stop offset=".35" stopColor="#ff6fa6" /><stop offset=".65" stopColor="#4fd1c5" /><stop offset="1" stopColor="#6b5cff" /></linearGradient></defs><path d="M60 150 C 60 60, 230 60, 320 150 S 580 240, 580 150 S 410 60, 320 150 S 60 240, 60 150 Z" fill="none" stroke="url(#mhg)" strokeWidth="46" strokeLinecap="round" /></svg><h3 className="mh-ital">DISCOVER, DEFINE &amp; DELIVER</h3><p>as one team<br />on one canvas</p></div>;
  if (i === 2) return <div className="mh-ai"><h3>Get going with <em className="mh-ital">TEMPLATES</em> you know</h3><div className="mh-fmts">{[["Retro", "#7d5cff"], ["Roadmap", "#e8402f"], ["Flowchart", "#2d8fe0"], ["Kanban", "#1f9d46"]].map(([n, c]) => <div key={n} style={{ color: c }}><span style={{ borderColor: c }} /><b>{n}</b></div>)}</div></div>;
  if (i === 3) return <div className="mh-ai"><h3>Work faster with <em className="mh-ital">SHORTCUTS</em> for every tool</h3><div className="mh-wf"><span className="t1">Board</span><div className="pg" /><div className="pg p2" /><span className="t2">Press ?</span></div></div>;
  if (i === 4) return <div className="mh-ai mh-sec"><h3><i>Your boards,<br /><b>SAVED</b>.<br />As you work.</i></h3><div className="mh-stack"><span className="s1" /><span className="s2" /><span className="s3" /></div></div>;
  return <div className="mh-ai"><h3>Export to <em className="mh-ital">SVG</em><br />or JSON</h3><div className="mh-tiles">{["#1c1c1e", "#2684ff", "#f06a6a", "#0b66e4", "#ff5c5c", "#7f52ff", "#ff7a00", "#f24e1e", "#8b5cf6", "#5059c9", "#2d8cff", "#7b61ff", "#e01e5a", "#1d4ed8"].map((c, n) => <span key={n}><i style={{ background: c }} /></span>)}</div></div>;
};
export function MiExperience() {
  const pin = useRef<HTMLElement>(null), track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => { const p = pin.current, t = track.current; if (!p || !t) return; const r = p.getBoundingClientRect(); const span = p.offsetHeight - window.innerHeight; const prog = Math.min(1, Math.max(0, -(r.top - 72) / Math.max(1, span))); const max = Math.max(0, t.scrollWidth - (t.parentElement?.clientWidth ?? 0) + 40); t.style.transform = `translateX(${-prog * max}px)`; };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on); return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return <section className="mh-pin" id="product" ref={pin}><div className="mh-sticky"><div className="mh-exp">
    <h2>Experience<br />the Innovation<br />Workspace</h2>
    <div className="mh-clipwrap"><div className="mh-check" aria-hidden><span>check this out</span><svg width="30" height="22" viewBox="0 0 30 22" fill="none" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round"><path d="M2 4c8 2 16 8 22 14M18 18l6 1 1-6" /></svg></div>
      <div className="mh-slidespill" aria-hidden><span className="mh-sp-ic" /><b>Slides</b><i>▶</i><i>⤢</i><i>⋮</i></div>
      <div className="mh-clip"><div className="mh-track" ref={track}>
        {SLIDES.map((sl, i) => <div className="mh-slide" key={sl[0]}>
          <div className={"mh-slide-art mh-sa" + i}><Art i={i} />{(i === 2 || i === 4) && <Cursor name="Bea" color="#0e8f8f" bg="#c6f3ee" x={i === 2 ? 240 : 310} y={i === 2 ? 20 : 40} />}</div>
          <h4>{sl[0]}</h4><p>{sl[1]}</p><a href={BP + (i === 0 ? "/#solutions" : i === 1 ? "/app" : i === 2 ? "/#templates" : i === 3 ? "/#product" : "/pricing")} className="mk-dark mh-btn">Learn more</a></div>)}
      </div></div></div></div></div></section>;
}
export function MiFlow() {
  return <section className="mh-mob mh-flow"><h2>Flow from idea<br />to outcome in seconds</h2><div className="mh-flowart" aria-hidden><i /><i /><i /><b /></div></section>;
}
export function MiPlatform() {
  return <section className="mh-plat" id="solutions"><Cursor name="Bea" color="#0e8f8f" bg="#c6f3ee" x={1185} y={70} />
    <h2>The free platform<br />for teamwork</h2><p>An infinite canvas for stickies, shapes and connectors, free and open source</p><Link href="/app" className="mh-plat-btn" onClick={() => track(EVENTS.landing_cta_clicked, { target: "platform_explore" })}>Explore the solution</Link>
    <div className="mh-platart" aria-hidden><div className="mh-pgrid">{Array.from({ length: 9 }, (_, i) => <div key={i} className={"pc c" + (i % 3)} />)}</div><span className="mh-play">▶</span></div></section>;
}
export function MiHelp() {
  const items: [string, string, string, string][] = [["Pricing", "Select a plan", "#e3f8ea", "#0aae3a"], ["Templates", "Get started fast", "#dff3f3", "#187574"], ["Solution Partners", "Explore the network", "#fdf3d2", "#b8961f"], ["Community", "Connect with users", "#e0f4e5", "#067429"], ["Blog", "Dive in to ways of working", "#fde9dc", "#db8641"], ["Academy", "Get started with the canvas", "#e8e6ff", "#655be6"]];
  const [page, setPage] = useState(0);
  return <section className="mh-help"><div className="mh-help-in"><h2>Need help getting started?</h2>
    <div className="mh-hcwrap"><div className="mh-hc" style={{ transform: `translateX(${-page * 606}px)` }}>{items.map(([tag, t, bg, fg], i) => <Link key={t} href={i === 0 ? "/pricing" : "/signup"} className="mh-hcard"><span className="mh-tag" style={{ background: bg, color: fg, borderColor: fg }}>{tag}</span><span className="mh-arr">↗</span><h3>{t}</h3><div className={"mh-hart a" + i} /></Link>)}</div></div>
    <div className="mh-dots"><button aria-label="Previous" disabled={page === 0} onClick={() => setPage(0)}>‹</button><button aria-label="Next" disabled={page === 1} onClick={() => setPage(1)}>›</button></div></div></section>;
}
const SOC = [["X", "M4 4l16 16M20 4L4 20"], ["Facebook", "M14 8h3V4h-3a4 4 0 00-4 4v3H7v4h3v9h4v-9h3l1-4h-4V9a1 1 0 011-1z"], ["LinkedIn", "M4 9h4v12H4zM6 3a2 2 0 110 4 2 2 0 010-4zM10 9h4v2c1-1.5 2.5-2 4-2 3 0 4 2 4 5v7h-4v-6c0-1.5-.5-2.5-2-2.5S14 13.5 14 15v6h-4z"], ["Instagram", "M7 3h10a4 4 0 014 4v10a4 4 0 01-4 4H7a4 4 0 01-4-4V7a4 4 0 014-4zM12 8.5a3.5 3.5 0 100 7 3.5 3.5 0 000-7zM17.5 6.5h.01"], ["YouTube", "M22 8s-.2-1.6-.8-2.3c-.8-.8-1.6-.8-2-.9C16.4 4.6 12 4.6 12 4.6s-4.4 0-7.2.2c-.4.1-1.2.1-2 .9C2.2 6.4 2 8 2 8s-.2 1.9-.2 3.8v1.8c0 1.9.2 3.8.2 3.8s.2 1.6.8 2.3c.8.8 1.8.8 2.3.9 1.6.2 6.9.2 6.9.2s4.4 0 7.2-.2c.4-.1 1.2-.1 2-.9.6-.7.8-2.3.8-2.3s.2-1.9.2-3.8v-1.8C22.2 9.9 22 8 22 8zM10 15V9l5.5 3z"], ["Reddit", "M20 12a2 2 0 00-3.4-1.4A9 9 0 0012.6 9.4l.9-4 2.8.6a1.5 1.5 0 100 .3L13 5.5l-1.1 4.9a9 9 0 00-4.5 1.2A2 2 0 104.9 14.5c0 .3-.1.5-.1.8 0 2.8 3.2 5 7.2 5s7.2-2.2 7.2-5v-.8A2 2 0 0020 12zM9 13a1 1 0 110 2 1 1 0 010-2zm6 0a1 1 0 110 2 1 1 0 010-2zm-6.3 4.2a.5.5 0 01.7-.7c.7.7 2 .8 2.6.8s1.9-.1 2.6-.8a.5.5 0 01.7.7c-.9.9-2.5 1-3.3 1s-2.4-.1-3.3-1z"]];
export function MiFooter() {
  const [open, setOpen] = useState<string | null>(null);
  return <footer className="mh-foot"><div className="mh-foot-in">
    <div className="mh-fcols">{FOOT.map(([t, ls]) => <div key={t} className={open === t ? "open" : ""}><h5 onClick={() => setOpen(open === t ? null : t)}>{t}<i /></h5>{ls.map(l => { const h = LINK[l] ?? GH; const ext = h.startsWith("http"); return <a key={l} href={ext ? h : BP + h} {...(ext ? { target: "_blank", rel: "noreferrer" } : {})}>{l}</a>; })}{t === "Plans & Pricing" && <a href={GH + "/discussions"} className="mh-fcs" target="_blank" rel="noreferrer">Contact us <span>→</span></a>}</div>)}</div>
    <div className="mh-badges">{[["Apache 2.0", "LICENSE"], ["Free forever", "NO PLANS"]].map(([a, b]) => <span key={a} className="mh-badge"><i>{a.split(" ")[0]}<small>{a.split(" ")[1]}</small></i><em>{a}<br />{b}</em></span>)}</div>
    <p className="mh-rev">Free and open source on GitHub</p>
    <div className="mh-rule" />
    <div className="mh-fmid"><div className="mh-soc">{SOC.map(([n, d]) => <a key={n} href={GH} target="_blank" rel="noreferrer" aria-label={`${n} (opens the project on GitHub)`}><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round"><path d={d} /></svg></a>)}<span className="mh-lang"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6"><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>English <i>⌄</i></span></div><div className="mh-store"><span><small>Open it in</small>Your browser</span><span><small>Read it on</small>GitHub</span></div></div>
    <div className="mh-legal"><Mark size={16} /> MiroIsDead © 2026 <a href={BP + "/terms"}>Terms of Service</a><a href={BP + "/privacy"}>Privacy Policy</a><a href={BP + "/privacy#cookies"}>Manage Cookies</a><a href={GH}>Source (Apache-2.0)</a></div>
    <p className="mh-disc">MiroIsDead is an independent open-source project. It is not affiliated with, endorsed by or sponsored by RealtimeBoard, Inc. (Miro). Miro is a trademark of its owner.</p>
  </div></footer>;
}
