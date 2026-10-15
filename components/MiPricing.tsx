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
  { id: "free", name: "Free", desc: "For small teams getting started with MiroIsDead", price: "$0", cta: "Start for free", href: "/signup", head: "Key features:", items: [{ t: "3 boards" }, { t: "Templates" }, { t: "Formats incl. Docs, Tables, Slides, and Kanban" }, { t: "Explore AI" }, { t: "250+ integrations", ics: DOCS }] },
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
  ["Who counts as a paid member?", "Anyone who can edit boards in a paid workspace counts as a member. Visitors and guests do not."],
  ["How does MiroIsDead's pricing work?", "MiroIsDead plans are priced per member per month, billed yearly or monthly."],
  ["Is MiroIsDead free? What are the Free plan's limits?", "Yes. The Free plan includes 3 editable boards and the ability to try AI features."],
  ["What are AI Credits and how are they counted?", "AI credits are used each time you run an AI action. Credits are pooled per member each month."],
  ["What happens if I add or remove members mid-cycle? Or about re-sizing mid-cycle?", "Changes are prorated for the remainder of your billing cycle."],
  ["What payment and billing options do you offer?", "Credit card for Starter and Business; invoicing is available on Enterprise."],
  ["How do I upgrade, downgrade, or cancel?", "Manage your plan from your account's billing settings at any time."],
  ["Do you offer discounts for education or nonprofits?", "Yes, education and nonprofit discounts are available."],
  ["Do you offer discounts for startups?", "Yes, eligible startups can apply for a startup program discount."],
  ["Can I try a paid plan before buying?", "Yes. Try the Business plan free for 14 days."],
  ["Does MiroIsDead work with my other AI tools?", "Yes. Connect Claude, Cursor, Copilot and more via the MCP server."],
  ["How does MiroIsDead handle AI and data security?", "MiroIsDead AI is built with enterprise-grade security, and admins control which AI features are available."],
  ["Does MiroIsDead use my data to train AI?", "No. Your content is not used to train third-party models."],
  ["We need additional help on documentation (like an MSA or security questionnaire). Who can I reach out to?", "Contact our sales team and we will help with any security or legal documentation."],
];
const SEC: [string, string, string][] = [["ISO/IEC 27001", "ISO/IEC Security Management", "bsi"], ["SOC 2 Type II", "SOC for Service Organizations", "AICPA SOC 2"], ["SOC 3", "SOC for Service Organizations", "SOC 3"], ["NIST", "National Institute of Standards and Technology", "NIST"], ["TISAX", "Trusted Information Security Assessment Exchange", "TISAX"], ["GDPR", "General Data Protection Regulation", "★"]];
const cell = (v: string) => v === "Included" ? <span className="ck">✓</span> : v === "Not included" ? null : v === "Paid add-on" ? <span className="pa">Paid add-on</span> : v;

export function MiPricing() {
  const [yearly, setYearly] = useState(true);
  const [cmp, setCmp] = useState(true);
  const [faq, setFaq] = useState(0);
  return <main className="mpr">
    <header className="mpr-h"><h1>Where teams and AI work as one</h1></header>
    <div className="mpr-tog"><button className={!yearly ? "on" : ""} onClick={() => setYearly(false)}>Monthly</button><button className={yearly ? "on" : ""} onClick={() => setYearly(true)}>Yearly (save 20%)</button></div>
    <section className="mpr-plans">{PLANS.map(p => <PlanCard key={p.id} p={p} />)}</section>
    <section className="mpr-wrap">
      <div className="mpr-guard"><h2>Enterprise Guard</h2><p>Enterprise Guard is a security and governance tool for managing sensitive content in MiroIsDead boards.</p><div><a className="mpr-btn pri sm" href="https://yourappisdead.com">Contact us</a><a className="mpr-btn sm" href="https://github.com/tommy-muckstack/miroisdead">Learn more</a></div></div>
      <div className="mpr-cmp">
        <button className="mpr-cmph" onClick={() => setCmp(!cmp)} aria-expanded={cmp}>Compare all features<svg className={"mpr-chev" + (cmp ? " up" : "")} width="18" height="18" viewBox="0 0 16 16" fill="none" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10l4-4 4 4" /></svg></button>
        {cmp && <div className="mpr-mx">
          <div className="mpr-sel"><span>Select plan</span>
            <div className="c"><b>Free</b><Link className="mpr-btn sm" href="/signup">Start for free</Link></div><div className="c"><b>Starter</b><Link className="mpr-btn sm" href="/signup">Buy this plan</Link></div><div className="c"><b>Business</b><Link className="mpr-btn pri sm" href="/signup">Try for free</Link></div><div className="c"><b>Enterprise ⓘ</b><a className="mpr-btn sm" href="https://yourappisdead.com">Contact sales</a></div></div>
          {MATRIX.map(([g, hh, rows]) => <div key={g} className="mpr-g"><div className="gh" style={{ height: hh }}><b>{g}</b></div>
            {rows.map(r => { const h = Number(r[5]); return <div key={String(r[0])} className="row" style={{ height: h < 50 ? 48.2 : h }}><span className="l">{r[0]}</span>{r.slice(1, 5).map((v, i) => <span key={i} className="v">{cell(String(v))}</span>)}</div>; })}</div>)}
          <p className="note">* Existing Enterprise customers on a different license may have varying feature availability. Contact your account team for details.</p>
          <p className="note">** Migration fees apply for existing customers moving from EU to the US, Australia, or Japan data residency.</p>
        </div>}
      </div>
      <div className="mpr-trust"><h2>Trusted by the world&apos;s most innovative companies</h2><div className="lg"><span>asos</span><span>contentful</span><span>UBISOFT</span><span>PEPSICO</span><span>★macy&apos;s</span><span className="f">Whi</span></div></div>
      <div className="mpr-sec"><h2>Security and compliance</h2><p>Rest easy knowing we&apos;re fully certified by numerous organizations.</p><a className="mpr-btn sm" href="https://github.com/tommy-muckstack/miroisdead/blob/main/SECURITY.md">Learn more</a>
        <div className="g">{SEC.map(([t, s, b]) => <div key={t} className="card"><i>{b}</i><h3>{t}</h3><p>{s}</p></div>)}</div></div>
      <div className="mpr-faq"><h2>Frequently asked questions</h2>
        <div className="l"><div className={"q" + (faq === 0 ? " open" : "")}><button onClick={() => setFaq(faq === 0 ? -1 : 0)}><span>How do I pick the right plan?</span><em>{faq === 0 ? "−" : "+"}</em></button>{faq === 0 && <div className="a"><p>Free is for small teams just getting started with MiroIsDead including 3 editable boards and ability to try AI features. Starter adds unlimited boards (including private ones), more AI credits, and visitors who can access boards too without needing an account.</p><p>Business plan is for growing organizations and consultants who want to streamline end-to-end workflows with AI. With the full AI suite, deep two-way integrations, and purpose-built capabilities, it covers the critical workflows including designing user experiences, process and technical system design, and portfolio and program management.</p><p>Enterprise is for larger organizations that need advanced security, compliance, and custom controls in order to scale MiroIsDead and AI across their whole business.</p><p>Still unsure what plan is right for you? Try Business plan free for 14 days and decide from there.</p></div>}</div>
          {FAQ.map(([q, a], i) => <div key={q} className={"q" + (faq === i + 1 ? " open" : "")}><button onClick={() => setFaq(faq === i + 1 ? -1 : i + 1)}><span>{q}</span><em>{faq === i + 1 ? "−" : "+"}</em></button>{faq === i + 1 && <div className="a"><p>{a}</p></div>}</div>)}</div></div>
    </section>
  </main>;
}
