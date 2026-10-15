import Link from "next/link";
import { MiNav, JoinBar } from "@/components/MiMk";
import { MiFooter } from "@/components/MiHome2";
import { PriceCalc } from "@/components/PriceCalc";
import { FEATURES, MIRO } from "@/lib/pricing";
export const metadata = { title: "Pricing | MiroIsDead" };
const plans = [
  ["Free", "$0", "Get started with core features", ["Unlimited boards", "Stickies, shapes, connectors", "Export to SVG"], "Get started free", "mp-free"],
  ["Starter", `$${MIRO.starter}`, "per member / month billed annually (Miro list price)", ["Unlimited editable boards", "Private boards", "Board export"], "Compare", "mp-starter"],
  ["Business", `$${MIRO.business}`, "per member / month billed annually (Miro list price)", ["Everything in Starter", "Advanced security", "Team admin"], "Compare", "mp-business"],
  ["Enterprise", "Custom", "Miro list pricing is by quote", ["Everything in Business", "SSO and SCIM", "Dedicated support"], "Compare", "mp-ent"],
];
export default function Pricing() {
  return <div className="mk">
    <MiNav />
    <section className="mp-hero"><h1>Plans &amp; Pricing</h1><p>Everything a per-seat whiteboard sells, with nothing to pay.</p></section>
    <section className="mp-plans">{plans.map(([n, p, d, f, c, id]) => <div key={n as string} className="mp-plan" id={id as string}><h3>{n}</h3><div className="mp-price">{p}</div><p>{d}</p><Link className={n === "Free" ? "mk-cta" : "mk-ghost"} href="/signup">{c}</Link><ul>{(f as string[]).map(x => <li key={x}>{x}</li>)}</ul></div>)}</section>
    <section className="mp-calc"><h2>What your team is paying for a whiteboard</h2><div style={{ marginTop: 32 }}><PriceCalc /></div>
      <p className="mp-note">Miro list prices, billed yearly, per member, as of {MIRO.asOf}: Free $0 (3 editable boards), Starter ${MIRO.starter}/mo, Business ${MIRO.business}/mo, Enterprise custom.</p>
      <h3>What you&apos;d need a paid plan for, free here</h3>
      <div className="mp-table"><table className="mi-compare" data-testid="feature-table"><thead><tr><th>Feature</th><th>Miro plan you&apos;d need</th><th>MiroIsDead</th></tr></thead>
        <tbody>{FEATURES.map(f => <tr key={f.name}><td>{f.name}</td><td className="plan">{f.plan}</td><td className="ours">✓ {f.ours}</td></tr>)}</tbody></table></div></section>
    <MiFooter /><JoinBar />
  </div>;
}
