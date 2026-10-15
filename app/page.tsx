import Link from "next/link";
import { Section, Footer } from "@isdead/design";
import { MiNav, HeroArt, HeroForm, JoinBar } from "@/components/MiMk";
import { PriceCalc } from "@/components/PriceCalc";
import { HeroTabs } from "@/components/HeroTabs";
import { FEATURES, MIRO } from "@/lib/pricing";
import { TEMPLATES } from "@/lib/canvas/templates";
import { BP } from "@/lib/basepath";
const GH = "https://github.com/tommy-muckstack/miroisdead";
// Section order follows miro.com's homepage (templates/marketing-site.md): nav → hero + use-case tabs → proof stats → three pillars →
// feature rows → solutions → "get started" cards → pricing → final CTA → footer. Copy, art and screenshots are our own.
const Shot = ({ src, alt }: { src: string; alt: string }) => <img className="mi-shot" src={`${BP}/home/${src}`} alt={alt} width={1440} height={900} loading="lazy" />;
const rows = [
  { id: "product", k: "Infinite canvas", h: "Room for every thought, from 10% to 600%", p: "Scroll to pan, pinch or ⌘-scroll to zoom toward your cursor, press ⇧1 to fit the whole board, and open the minimap when it gets big. Dotted grid, smart guides and nothing to configure.", img: "canvas.png" },
  { id: "stickies", k: "Stickies and shapes", h: "Type as fast as you think", p: "Press N, click, type. Tab drops the next sticky beside it. Text shrinks to fit, and a blue dot on any selected object adds a connected copy in one click.", img: "quick-create.png" },
  { id: "connectors", k: "Connectors", h: "Lines that follow what they connect", p: "Rounded elbow, straight or curved connectors bind to shapes and reroute live as you drag. Add labels and arrowheads from the floating toolbar.", img: "connectors.png" },
  { id: "templates", k: "Frames and templates", h: "Start from a template, organize with frames", p: "Box up a cluster with F, move the frame and everything inside comes along. Five starter boards get a workshop going in seconds.", img: "frames.png" },
];
export default function Home() {
  return <div className="mk">
    <MiNav />
    <section className="mk-hero"><h1>Human collaboration<br />at the speed of AI</h1>
      <p className="sub">The free, open-source canvas where your ideas, notes and diagrams come together.</p>
      <HeroForm /><HeroArt /></section>
    <section className="mk-tabsec" id="templates"><HeroTabs /></section>
    <section className="mk-needle" id="resources"><h2>The only thing more important than moving fast is making it free</h2>
      <p>Everything a per-seat whiteboard sells, with nothing to pay. See what that looks like.</p>
      <div className="mk-big3">
        <div style={{ background: "linear-gradient(160deg,#ffd7a8,#ff9f6b)" }}><b>$0</b><span>per member per month, with no board limit</span></div>
        <div style={{ background: "linear-gradient(160deg,#c6d3ff,#7f97ff)" }}><b>11</b><span>one-key tools, with the shortcut printed on each</span></div>
        <div style={{ background: "linear-gradient(160deg,#c7f3d9,#6fd4a0)" }}><b>600%</b><span>zoom range, with a minimap and fit-to-board</span></div></div>
      <div className="mk-nums"><div><b>0</b><span>seats to buy</span></div><div><b>2</b><span>export formats</span></div><div><b>5</b><span>starter templates</span></div></div></section>
    <Section title="Think, organize, hand off" subtitle="Three things a whiteboard has to do well.">
      <div className="mi-trio">
        <div className="ids-card"><span className="mi-dot" style={{ background: "#FFE86D" }} /><h3>Capture</h3><p className="ids-muted">Stickies, text, shapes and a pen that stays on. New objects open for typing the moment you place them.</p></div>
        <div className="ids-card"><span className="mi-dot" style={{ background: "#BCD4FF" }} /><h3>Organize</h3><p className="ids-muted">Marquee, align, distribute and frame. Multi-select gets a toolbar with every arrange action.</p></div>
        <div className="ids-card"><span className="mi-dot" style={{ background: "#C3F4D6" }} /><h3>Hand off</h3><p className="ids-muted">Export SVG, download the board file, or copy a plain-JSON scene that an AI agent can read.</p></div>
      </div>
    </Section>
    {rows.map((r, i) => <Section key={r.id} id={r.id} style={{ paddingTop: 48, paddingBottom: 48 }}>
      <div className="mi-row" style={{ direction: i % 2 ? "rtl" : "ltr" }}>
        <div style={{ direction: "ltr" }}><span className="ids-pill">{r.k}</span><h2 className="ids-h2" style={{ margin: "16px 0 12px", fontSize: "var(--ids-type-3xl)" }}>{r.h}</h2><p className="ids-muted" style={{ fontSize: 18 }}>{r.p}</p><Link className="ids-btn ids-btn--outline" href="/login" style={{ marginTop: 12 }}>Try it free</Link></div>
        <div style={{ direction: "ltr" }}><Shot src={r.img} alt={r.h} /></div>
      </div></Section>)}
    <Section id="solutions" title="Made for the way teams actually work" subtitle="Workshops, research, planning and diagrams share one canvas.">
      <div className="mi-trio" style={{ gridTemplateColumns: "repeat(auto-fit,minmax(240px,1fr))" }}>
        {[["Product teams", "Roadmaps in lanes, opportunity maps, and sticky-note synthesis."], ["Designers", "Journey maps, boards of pasted text and quick sketches with the pen."], ["Engineers", "Flowcharts and architecture sketches with connectors that stay attached."], ["Facilitators", "Retros, brainstorms and workshops from templates, run with the keyboard."]].map(([h, p]) =>
          <div key={h} className="ids-card"><h3>{h}</h3><p className="ids-muted">{p}</p></div>)}
      </div>
      <p className="ids-muted" style={{ marginTop: 24 }}>Boards are single-user today; real-time multiplayer and comments are on the roadmap, not in the app yet.</p>
    </Section>
    <Section title="Need help getting started?">
      <div className="mi-help">
        <Link href="/login">Start free<span>Use the demo account, or sign up with email or Google.</span></Link>
        <a href={`${BP}/#templates`}>Templates<span>{TEMPLATES.length - 1} starter boards plus a blank canvas.</span></a>
        <a href={`${BP}/#product`}>Keyboard shortcuts<span>Press ? inside any board for the full sheet.</span></a>
        <a href={GH}>Open source<span>Apache-2.0. Fork it, self-host it, change it.</span></a>
      </div>
    </Section>
    <Section id="pricing" title="What your team is paying for a whiteboard">
      <div style={{ marginTop: 32 }}><PriceCalc /></div>
      <p className="ids-muted" style={{ fontSize: 13 }}>Miro list prices, billed yearly, per member, as of {MIRO.asOf}: Free $0 (3 editable boards), Starter ${MIRO.starter}/mo, Business ${MIRO.business}/mo, Enterprise custom. Monthly billing costs more. Hosting your own copy has your own hosting costs; a small instance fits in free tiers.</p>
      <h3 className="ids-h2" style={{ textAlign: "center", margin: "56px 0 24px" }}>What you'd need a paid plan for, free here</h3>
      <div className="ids-card" style={{ padding: 8, overflowX: "auto" }}>
        <table className="mi-compare" data-testid="feature-table"><thead><tr><th>Feature</th><th>Miro plan you'd need</th><th>MiroIsDead</th></tr></thead>
          <tbody>{FEATURES.map(f => <tr key={f.name}><td>{f.name}</td><td className="plan">{f.plan}</td><td className="ours">✓ {f.ours}</td></tr>)}</tbody></table>
      </div>
    </Section>
    <section style={{ margin: "0 16px 16px", borderRadius: 24, background: "var(--ids-gradient-hero)", padding: "96px 24px", textAlign: "center" }}>
      <h2 className="ids-h1" style={{ fontSize: "var(--ids-type-3xl)" }}>Your next idea needs more room</h2>
      <div style={{ marginTop: 28, display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap" }}><Link className="ids-btn ids-btn--primary" href="/login">Get started free</Link><a className="ids-btn ids-btn--outline" href={GH}>View on GitHub</a></div>
    </section>
    <Footer columns={[
      { title: "Product", links: [{ href: BP + "/#product", label: "Canvas" }, { href: BP + "/#stickies", label: "Stickies and shapes" }, { href: BP + "/#connectors", label: "Connectors" }, { href: BP + "/#templates", label: "Templates" }] },
      { title: "Get started", links: [{ href: BP + "/login", label: "Log in" }, { href: BP + "/login", label: "Demo account" }, { href: BP + "/#pricing", label: "Price comparison" }] },
      { title: "Open source", links: [{ href: GH, label: "GitHub" }, { href: GH + "/blob/main/LICENSE", label: "Apache-2.0 license" }] },
      { title: "More IsDead apps", links: [{ href: "/calendlyisdead", label: "CalendlyIsDead" }, { href: "/superhumanisdead", label: "SuperhumanIsDead" }, { href: "/wisprflowisdead", label: "WisprFlowIsDead" }] },
    ]} note="MiroIsDead is an independent open-source project. It is not affiliated with, endorsed by or sponsored by RealtimeBoard, Inc. (Miro). Miro is a trademark of its owner." />
    <JoinBar />
  </div>;
}
