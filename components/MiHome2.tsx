"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { BP } from "@/lib/basepath";
import "./mihome2.css";

const FOOT: [string, string[]][] = [
  ["Product", ["Apps & Integrations", "Templates", "Developer Platform", "Devices", "Enterprise Guard", "Accessibility", "Changelog"]],
  ["Solutions", ["AI Platform", "Product Acceleration", "Business Acceleration", "Platform and Capabilities"]],
  ["Tools", ["Agile Tools", "Graphs", "Online Sticky Notes", "Customer Journey Mapping", "Wireframe", "Kanban Board", "Image Color Picker", "AI Prototype Generator", "AI Wireframe Generator", "AI Diagram Generator", "AI Flowchart Generator", "AI Design Generator", "AI Mind Map Generator", "AI Dashboard Generator", "Gradient Generator", "Online Whiteboard", "Diagram Online", "Flowchart Online"]],
  ["Resources", ["Customer Stories", "Academy", "Help Center", "Blog", "Status", "Community", "Events", "Solution Partners", "Security"]],
  ["Company", ["About Us", "Careers", "In the News"]],
  ["Plans & Pricing", ["Pricing", "Business", "Enterprise", "Consultants", "Education", "Startups", "NPOs"]],
];
const GH = "https://github.com/tommy-muckstack/miroisdead";
const SLIDES: [string, string, string][] = [["AI", "Accelerate your team with collaborative AI workflows", ""], ["Intelligent Canvas", "Empower teamwork on one infinite, multiplayer canvas", "Discover, define & deliver on one canvas"], ["Formats", "Work move forward with structured plans and Docs, Tables, Slides", "Move work forward with FORMATS you know"], ["Blueprints", "Automate key processes and your workflows so they are scalable, repeatable and efficient", "Build WORKFLOWS once, use them again and again"], ["Enterprise Security & Scale", "Secure and scalable collaboration on an enterprise-grade platform you can trust", "Your data is SECURED. Period."], ["Integrations", "Connect with 250+ apps so teams stay aligned and productive in one scalable, secure workspace", "Connect to 250+ of your top tools"]];
export function MiNeedle() {
  const cards = [["3.6x", "faster time to market", "linear-gradient(200deg,#3b3a45,#15151a 70%)"], ["50%", "shorter planning process", "linear-gradient(200deg,#8d98b3,#d9dde7 40%,#6d7894)"], ["2x", "faster time to market", "linear-gradient(200deg,#2f4a3c,#10201a 70%)"]];
  return <section className="mh-needle" id="resources">
    <h2>The only thing more important<br />than moving fast is <b>moving the needle</b></h2>
    <p className="mh-sub">See how over 250,000 companies are getting great done</p>
    <div className="mh-cards">{cards.map(([a, b, bg], i) => <div key={a + i} className="mh-card" style={{ background: bg }}><b>{a}</b><span>{b}</span><i className="mh-co">{["acme", "northwind", "globex"][i]}</i></div>)}</div>
    <div className="mh-stats"><div><b>100M+</b><span>people collaborating</span></div><div><b>250+</b><span>apps and integrations</span></div><div><b>6,000+</b><span>templates</span></div></div>
  </section>;
}
export function MiExperience() {
  const pin = useRef<HTMLElement>(null), track = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = () => { const p = pin.current, t = track.current; if (!p || !t) return; const r = p.getBoundingClientRect(); const span = p.offsetHeight - window.innerHeight; const prog = Math.min(1, Math.max(0, -(r.top - 72) / Math.max(1, span))); const max = Math.max(0, t.scrollWidth - (t.parentElement?.clientWidth ?? 0) + 40); t.style.transform = `translateX(${-prog * max}px)`; };
    on(); window.addEventListener("scroll", on, { passive: true }); window.addEventListener("resize", on); return () => { window.removeEventListener("scroll", on); window.removeEventListener("resize", on); };
  }, []);
  return <section className="mh-pin" id="product" ref={pin}><div className="mh-sticky"><div className="mh-exp">
    <h2>Experience<br />the Innovation<br />Workspace</h2>
    <div className="mh-clip"><div className="mh-track" ref={track}>
      {SLIDES.map((sl, i) => <div className="mh-slide" key={sl[0]}>
        <div className={"mh-slide-art mh-sa" + (i % 6)}>{i === 0 ? <div className="mh-ai"><h3>Bring <em>TEAM</em> &amp; artificial intelligence together</h3><div className="mh-ai3"><u>SIDEKICKS<br /><small>Chat-based agents that collaborate with you on the canvas</small></u><u>FLOWS<br /><small>Streamline processes with visual AI workflows</small></u><u>KNOWLEDGE<br /><small>Bring in existing knowledge to better decisions</small></u></div></div> : <div className="mh-ai"><h3>{sl[2]}</h3><div className={"mh-ring r" + (i % 3)} /></div>}</div>
        <h4>{sl[0]}</h4><p>{sl[1]}</p><Link href="/signup" className="mk-dark mh-btn">Learn more</Link></div>)}
    </div></div></div></div></section>;
}
export function MiHelp() {
  const items: [string, string, string, string][] = [["Pricing", "Select a plan", "#d6f5e2", "#0a7a3d"], ["Templates", "Get started fast", "#d3f0f5", "#0a6c7a"], ["Solution Partners", "Explore the network", "#ffe9b8", "#8a5a00"], ["Community", "Connect with Miro users", "#d9f5df", "#136b2a"]];
  return <section className="mh-help"><div className="mh-help-in"><h2>Need help getting started?</h2>
    <div className="mh-hc">{items.map(([tag, t, bg, fg], i) => <Link key={t} href={i === 0 ? "/pricing" : "/signup"} className="mh-hcard"><span className="mh-tag" style={{ background: bg, color: fg }}>{tag}</span><span className="mh-arr">↗</span><b>{t}</b><div className={"mh-hart a" + i} /></Link>)}</div>
    <div className="mh-dots"><span>‹</span><span>›</span></div></div></section>;
}
export function MiFooter() {
  const [open, setOpen] = useState<string | null>(null);
  return <footer className="mh-foot"><div className="mh-foot-in">
    <div className="mh-fcols">{FOOT.map(([t, ls]) => <div key={t} className={open === t ? "open" : ""}><h5 onClick={() => setOpen(open === t ? null : t)}>{t}<i /></h5>{ls.map(l => <a key={l} href={l === "Pricing" ? BP + "/pricing" : "#"}>{l}</a>)}{t === "Plans & Pricing" && <a href={BP + "/signup"} className="mh-fcs">Contact sales →</a>}</div>)}</div>
    <div className="mh-badges"><span>ISO 42001 READY</span><span>ISO 27001 CERTIFIED</span><span>SOC 2 COMPLIANT</span><span>GDPR COMPLIANT</span><b>Capterra ★★★★★</b><b>G2 ★★★★★</b><b>Trustradius ★★★★★</b></div>
    <p className="mh-rev">20,000+ reviews from Capterra, G2 and Trustradius</p>
    <div className="mh-rule" />
    <div className="mh-fmid"><div className="mh-soc"><i>X</i><i>f</i><i>in</i><i>◎</i><i>▶</i><i>r</i><span>English ◍</span></div><div className="mh-store"><span>App Store</span><span>Google Play</span></div></div>
    <div className="mh-legal"><b className="mh-flogo" /> MiroIsDead © 2026 <a href="#">Terms of Service</a><a href="#">Privacy Policy</a><a href="#">Manage Cookies</a><a href={GH}>Source (Apache-2.0)</a></div>
    <p className="mh-disc">MiroIsDead is an independent open-source project. It is not affiliated with, endorsed by or sponsored by RealtimeBoard, Inc. (Miro). Miro is a trademark of its owner.</p>
  </div></footer>;
}
