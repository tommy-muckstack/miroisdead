"use client";
import { useState } from "react";
import { MIRO, miroYearly } from "@/lib/pricing";
const usd = (n: number) => n.toLocaleString("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
export function PriceCalc() {
  const [seats, setSeats] = useState(10);
  return <div className="ids-card" style={{ padding: 28, borderRadius: 20 }}>
    <label className="ids-label" htmlFor="seats" style={{ marginTop: 0 }}>Team size: <b data-testid="seats">{seats}</b> {seats === 1 ? "member" : "members"}</label>
    <input id="seats" type="range" min={1} max={200} value={seats} onChange={e => setSeats(Number(e.target.value))} style={{ width: "100%", accentColor: "var(--ids-color-accent)" }} />
    <div className="mi-plans">
      <div className="mi-plan"><span className="ids-muted">Miro Free</span><b data-testid="cost-free">$0</b><small className="ids-muted">{MIRO.freeEditableBoards} editable boards</small></div>
      <div className="mi-plan"><span className="ids-muted">Miro Starter</span><b data-testid="cost-starter">{usd(miroYearly(seats, "starter"))}</b><small className="ids-muted">per year, ${MIRO.starter}/member/mo</small></div>
      <div className="mi-plan"><span className="ids-muted">Miro Business</span><b data-testid="cost-business">{usd(miroYearly(seats, "business"))}</b><small className="ids-muted">per year, ${MIRO.business}/member/mo</small></div>
      <div className="mi-plan ours"><span style={{ fontWeight: 600 }}>MiroIsDead</span><b data-testid="cost-ours">$0</b><small className="ids-muted">forever, unlimited boards, Apache-2.0</small></div>
    </div>
  </div>;
}
