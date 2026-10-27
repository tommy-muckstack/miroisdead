"use client";
import Link from "next/link";
import { useState } from "react";
import { MATRIX } from "@/lib/pricing-matrix";
import "./mipricing.css";

const Chev = ({ open = false }: { open?: boolean }) => <svg className={"mpr-chev" + (open ? " open" : "")} width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#1c1c1e" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 6l4 4 4-4" /></svg>;
const Right = () => <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M6 3l5 5-5 5" /></svg>;
const Ic = ({ list }: { list: [string, string][] }) => <div className="mpr-ics">{list.map(([c, t], i) => <span key={i} style={{ color: c }}>{t}</span>)}<span className="more">…</span></div>;
const AI: [string, string][] = [["#e2562b", "Cl"], ["#1c1c1e", "Gp"], ["#1c1c1e", "Cx"]];
const APPS: [string, string][] = [["#2f7cf6", "Jr"], ["#e0287d", "As"], ["#1c1c1e", "No"], ["#e44a4a", "Td"], ["#0078d4", "Az"]];
const DOCS: [string, string][] = [["#2b6df0", "Ms"], ["#e0287d", "Sl"], ["#4a8af4", "Go"], ["#e03e2f", "Ad"]];

type Item = { t: string; d?: string; ics?: [string, string][]; vid?: boolean; ent?: boolean };
/** One-line descriptions under each feature (Miro shows these; ours describe what the plan line means). */
const DESC: Record<string, string> = {
  "3 boards": "Create up to 3 boards, shared with your team",
  "Templates": "Start from ready-made boards for workshops, planning and diagrams",
  "Formats incl. Docs, Tables, Slides, and Kanban": "Switch between canvas, documents, tables, slides and kanban",
  "Explore AI": "Try AI features with a monthly allowance of credits",
  "250+ integrations": "Connect the tools your team already uses",
  "Unlimited & private boards": "No board limit, and boards only you and invitees can open",
  "Visitor editing": "People without an account can edit via a link",
  "High-resolution exports": "Full-quality PDF and image exports",
  "Unlimited project spaces & blueprints": "Organise boards into spaces with reusable blueprints",
  "Timer and voting": "Run timed sessions and dot-voting on the board",
  "25 AI credits/member/month": "A monthly allowance for AI actions per member",
  "500 MCP calls per day": "Connect your own AI agents to boards",
  "Custom fonts & styles": "Upload fonts and set brand styles",
  "Unlimited workspaces": "Separate workspaces for teams and clients",
  "Unlimited guests": "Invite anyone to collaborate at no cost",
  "Visualize processes & technical systems": "Advanced diagramming shapes and packs",
  "Data tables for roadmapping, projects, & more": "Structured tables that stay in sync with the canvas",
  "Engage activities incl. polls and 2x2 matrix": "Facilitation tools for live sessions",
  "Interactive prototypes": "Click-through prototypes on the canvas",
  "AI workflows & agents": "Automate multi-step work with agents",
  "50 AI credits/member/month": "Twice the monthly AI allowance of Starter",
  "2,000 MCP calls per day": "More capacity for agent integrations",
  "Two-way integrations": "Sync items with work-tracking tools both ways",
  "User groups": "Manage access by group instead of per person",
  "Single Sign-On (SSO)": "Sign in with your identity provider",
  "Licenses built for Enterprise scale": "Flexible licensing across the organisation",
  "Enterprise-grade security": "Advanced security controls and audit logs",
  "Regional data hosting": "Choose where board data is stored",
  "Centralized user management & analytics": "Admin console with usage reporting",
  "Admin controls for AI": "Decide which AI features teams can use",
  "Starts from 2500 credits per month": "Pooled AI allowance for the organisation",
  "10,000 MCP calls per day": "Highest agent-integration capacity",
  "SCIM provisioning": "Automate user provisioning from your directory",
  "Org-wide controls for third party integrations": "Approve which integrations teams can install",
  "Sandbox": "A safe environment to test changes",
  "Customer success program": "A dedicated team to help you roll out",
};
type Plan = { name: string; desc: string; price: string; sub?: string; cta: string; href: string; head: string; items: Item[]; extra?: Item[]; tag?: string; id: string };
const PLANS: Plan[] = [
  { id: "free", name: "Free", desc: "For small teams getting started with Miro", price: "$0", cta: "Start for free", href: "/signup", head: "Key features:", items: [{ t: "3 boards" }, { t: "Templates" }, { t: "Formats incl. Docs, Tables, Slides, and Kanban" }, { t: "Explore AI" }, { t: "250+ integrations", ics: DOCS }] },
  { id: "starter", name: "Starter", desc: "For small teams collaborating regularly with unlimited boards", price: "$8", sub: "/month per member, billed yearly", cta: "Buy this plan", href: "/signup", head: "Everything in Free, plus:", items: [{ t: "Unlimited & private boards" }, { t: "Visitor editing" }, { t: "High-resolution exports" }, { t: "Unlimited project spaces & blueprints" }, { t: "Timer and voting" }, { t: "25 AI credits/member/month" }, { t: "500 MCP calls per day", ics: AI }, { t: "Custom fonts & styles" }] },
  { id: "business", name: "Business", tag: "Best for teams and consultants", desc: "For growing organizations and consultants to streamline workflows with AI", price: "$20", sub: "/month per member, billed yearly", cta: "Buy now", href: "/signup", head: "Everything in Starter, plus:", items: [{ t: "Unlimited workspaces" }, { t: "Unlimited guests" }, { t: "Visualize processes & technical systems" }, { t: "Data tables for roadmapping, projects, & more" }, { t: "Engage activities incl. polls and 2x2 matrix", vid: true }, { t: "Interactive prototypes", vid: true }, { t: "AI workflows & agents", vid: true }, { t: "50 AI credits/member/month" }, { t: "2,000 MCP calls per day", ics: AI }, { t: "Two-way integrations", ics: [["#2f7cf6", "Jr"], ["#e0472f", "Az"], ["#1c1c1e", "No"], ["#e03e6f", "As"], ["#2b6df0", "Li"]] }, { t: "User groups" }, { t: "Single Sign-On (SSO)" }] },
  { id: "enterprise", name: "Enterprise", desc: "For large organizations that need security, governance, and AI at scale", price: "", cta: "Contact sales", href: "https://yourappisdead.com", head: "Everything in Business, plus:", items: [{ t: "Licenses built for Enterprise scale" }, { t: "Enterprise-grade security" }, { t: "Regional data hosting" }, { t: "Centralized user management & analytics" }, { t: "Admin controls for AI" }, { t: "Starts from 2500 credits per month" }, { t: "10,000 MCP calls per day", ics: AI }, { t: "SCIM provisioning" }, { t: "Org-wide controls for third party integrations" }, { t: "Sandbox" }, { t: "Customer success program" }], extra: [{ t: "Add Enterprise Guard" }, { t: "Add Premium support" }] },
];

function PlanCard({ p }: { p: Plan }) {
  const [open, setOpen] = useState(false);
  const biz = p.id === "business";
  return <div className={"mpr-plan" + (biz ? " biz" : "") + (open ? " open" : "")} id={"mp-" + p.id}>
    {p.tag && <span className="mpr-tag">{p.tag}</span>}
    <h3>{p.name}</h3><p className="d">{p.desc}</p>
    <div className="mpr-price">{p.id === "enterprise" ? <span className="cust">Custom pricing—from <b>30 members</b></span> : <><span className="n">{p.price}</span>{p.sub && <span className="s">/month per <u>member</u>, billed yearly</span>}</>}</div>
    {p.href.startsWith("http") ? <a className="mpr-btn" href={p.href}>{p.cta}</a> : <Link className={"mpr-btn" + (biz ? " pri" : "")} href={p.href}>{biz ? <><span className="mpr-dsk">Try for free</span><span className="mpr-mob">Buy now</span></> : p.cta}</Link>}
    {biz && <p className="mpr-try">or <Link href="/signup"><span className="mpr-dsk">buy now</span><span className="mpr-mob">try for free</span></Link></p>}
    <button className="mpr-show" onClick={() => setOpen(!open)} aria-expanded={open}>{open ? "Hide" : "Show"} key features</button>
    <div className="mpr-feats">
      <div className="mpr-head"><b>{p.head}</b><Chev /></div>
      <ul>{p.items.map(i => <li key={i.t}><Right /><span>{i.t}{i.vid && <i className="vid">▣</i>}</span>{(i.d ?? DESC[i.t]) && <small className="mpr-desc">{i.d ?? DESC[i.t]}</small>}{i.ics && <Ic list={i.ics} />}</li>)}</ul>
      {p.extra && <ul className="ex">{p.extra.map(i => <li key={i.t}><Right /><span>{i.t}</span><em>$</em></li>)}</ul>}
    </div>
  </div>;
}

const FAQ: [string, string][] = [
  ["Are these MiroIsDead's prices?", "No. The plans above are Miro's, shown for comparison. MiroIsDead has no paid plans: every feature is free for everyone."],
  ["Is MiroIsDead free? What are the limits?", "Yes, it is free. There are no plans, seats, trials or paid add-ons."],
  ["Do I need a credit card?", "No. There is no checkout and no payment form."],
  ["Does MiroIsDead have AI features or integrations?", "No. It is a whiteboard: stickies, shapes, text, pen, frames and connectors, with templates and PNG, PDF, CSV or JSON export."],
  ["Where are my boards stored?", "Signed-in boards autosave to Firestore through the server, locked to your account, with a copy in your browser as an offline fallback. The demo account stays in your browser."],
  ["Is it open source?", "Yes. The code is Apache-2.0 on GitHub, so you can read exactly how boards are stored."],
];
const SEC: [string, string, string][] = [["Open source", "Read every line of code on GitHub", "Apache-2.0"], ["Owner-only boards", "Database rules lock each board to its owner", "Firestore"], ["Offline fallback", "A copy of your boards is kept in your browser", "Local"]];
const cell = (v: string) => v === "Included" ? <span className="ck">✓</span> : v === "Not included" ? null : v === "Paid add-on" ? <span className="pa">Paid add-on</span> : v;

export function MiPricing() {
  const [yearly, setYearly] = useState(true);
  const [cmp, setCmp] = useState(true);
  const [faq, setFaq] = useState(0);
  return <main className="mpr">
    <header className="mpr-h"><h1>Miro&apos;s plans, for comparison</h1></header>
    <div className="mpr-tog"><button className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button><button className={yearly ? "on" : ""} onClick={() => setYearly(true)}>Yearly (save 20%)</button></div>
    <section className="mpr-plans">{PLANS.map(p => <PlanCard key={p.id} p={p} />)}</section>
    <section className="mpr-wrap">
      <div className="mpr-guard"><h2>Enterprise Guard</h2><p>Miro sells Enterprise Guard as a security and governance add-on. MiroIsDead has no paid add-ons.</p><div><a className="mpr-btn pri sm" href="https://yourappisdead.com">Contact us</a><a className="mpr-btn sm" href="https://github.com/tommy-muckstack/miroisdead">Learn more</a></div></div>
      <div className="mpr-cmp">
        <button className="mpr-cmph" onClick={() => setCmp(!cmp)} aria-expanded={cmp}>Compare all features<svg className={"mpr-chev" + (cmp ? " up" : "")} width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4-4 4 4" /></svg></button>
        {cmp && <div className="mpr-mx">
          <div className="mpr-sel"><span>Select plan</span>
            <div className="c"><b>Free</b><Link className="mpr-btn sm" href="/signup">Start for free</Link></div><div className="c"><b>Starter</b><Link className="mpr-btn sm" href="/signup">Buy this plan</Link></div><div className="c"><b>Business</b><Link className="mpr-btn pri sm" href="/signup">Try for free</Link></div><div className="c"><b>Enterprise ⓘ</b><a className="mpr-btn sm" href="https://yourappisdead.com">Contact sales</a></div></div>
          {MATRIX.map(([g, hh, rows]) => <div key={g} className="mpr-g"><div className="gh" style={{ height: hh }}><b>{g}</b></div>
            {rows.map(r => { const h = Number(r[5]); return <div key={String(r[0])} className="row" style={{ height: h < 50 ? 48.2 : h }}><span className="l">{r[0]}</span>{r.slice(1, 5).map((v, i) => <span key={i} className="v">{cell(String(v))}</span>)}</div>; })}</div>)}
          <p className="note">Plans, prices and limits in this table are Miro&apos;s, shown for comparison. MiroIsDead is free, with no plans or paid add-ons.</p>
        </div>}
      </div>
      <div className="mpr-trust"><h2>Built in the open</h2><div className="lg"><span>Free</span><span>Open source</span><span>Apache-2.0</span><span>No plans</span><span>No card</span></div></div>
      <div className="mpr-sec"><h2>Security</h2><p>MiroIsDead holds no security certifications. It is open source, so you can check how your boards are stored.</p><a className="mpr-btn sm" href="https://github.com/tommy-muckstack/miroisdead/blob/main/SECURITY.md">Learn more</a>
        <div className="g">{SEC.map(([t, s, b]) => <div key={t} className="card"><i>{b}</i><h3>{t}</h3><p>{s}</p></div>)}</div></div>
      <div className="mpr-faq"><h2>Frequently asked questions</h2>
        <div className="l"><div className={"q" + (faq === 0 ? " open" : "")}><button onClick={() => setFaq(faq === 0 ? -1 : 0)}><span>Which plan do I need?</span><em>{faq === 0 ? "−" : "+"}</em></button>{faq === 0 && <div className="a"><p>There is nothing to pick. MiroIsDead is free for everyone, with no plans, seats or trials. The plans on this page are Miro&apos;s, shown for comparison.</p></div>}</div>
          {FAQ.map(([q, a], i) => <div key={q} className={"q" + (faq === i + 1 ? " open" : "")}><button onClick={() => setFaq(faq === i + 1 ? -1 : i + 1)}><span>{q}</span><em>{faq === i + 1 ? "−" : "+"}</em></button>{faq === i + 1 && <div className="a"><p>{a}</p></div>}</div>)}</div></div>
    </section>
  </main>;
}
