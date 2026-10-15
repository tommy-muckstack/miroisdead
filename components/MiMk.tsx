"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Mark } from "@/components/board/icons";
import { BP } from "@/lib/basepath";
import "./mimk.css";
const Chev = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 6l4 4 4-4" /></svg>;
export function MiNav() {
  const [menu, setMenu] = useState(false);
  return <header className="mk-nav"><button className="mk-burger" aria-label="Menu" aria-expanded={menu} onClick={() => setMenu(!menu)}><i /><i /><i /></button><Link href="/" className="mk-logo"><Mark size={40} />MiroIsDead</Link>
    <nav aria-label="Main"><a href={BP + "/#product"}>Product <Chev /></a><a href={BP + "/#templates"}>Use Cases <Chev /></a><a href={BP + "/#solutions"}>Solutions <Chev /></a><a href={BP + "/#resources"}>Resources <Chev /></a><a href={BP + "/pricing"}>Pricing</a></nav>
    <div className="mk-act"><Link href="/login" className="mk-login">Login</Link><a className="mk-ghost" href="https://github.com/tommy-muckstack/miroisdead">View source</a><Link className="mk-cta" href="/signup">Get started free</Link></div>
    {menu && <div className="mk-mmenu"><a href={BP + "/#product"}>Product</a><a href={BP + "/#templates"}>Use Cases</a><a href={BP + "/#solutions"}>Solutions</a><a href={BP + "/#resources"}>Resources</a><a href={BP + "/pricing"}>Pricing</a><Link href="/login">Login</Link><Link className="mk-cta" href="/signup">Get started free</Link></div>}</header>;
}
const Card = ({ x, y, w, children, t, icon }: { x: number; y: number; w: number; children?: React.ReactNode; t: string; icon?: string }) => <div className="mk-c" style={{ left: x, top: y, width: w }}><span className="mk-ct"><i style={{ background: icon ?? "#2e8b57" }} />{t}</span><div className="mk-cb">{children}</div></div>;
/** Collaborator cursor chip (names are placeholders, not real people). */
export const Cursor = ({ name, color, bg, x, y, flip }: { name: string; color: string; bg: string; x: number; y: number; flip?: boolean }) => <span className="mk-cur" style={{ left: x, top: y, color, background: bg, borderColor: color }} aria-hidden>
  <svg className={"mk-cur-a" + (flip ? " flip" : "")} width="14" height="14" viewBox="0 0 24 24" fill={color} stroke="#fff" strokeWidth="1.5"><path d="M5.5 3.5l14 6.8-5.8 2-2 5.9z" /></svg><b /> {name}</span>;
export function HeroArt() {
  return <div className="mk-art" aria-hidden>
    <svg className="mk-lines" viewBox="0 0 1440 640" preserveAspectRatio="none"><path d="M375 143 C 470 143, 440 403, 518 403" /><path d="M355 433 C 430 433, 450 403, 518 403" /><path d="M922 403 C 1000 403, 1060 188, 1150 188" /><rect x="370" y="138" width="10" height="10" transform="rotate(45 375 143)" /><rect x="513" y="398" width="10" height="10" transform="rotate(45 518 403)" /><rect x="350" y="428" width="10" height="10" transform="rotate(45 355 433)" /><rect x="917" y="398" width="10" height="10" transform="rotate(45 922 403)" /><rect x="1145" y="183" width="10" height="10" transform="rotate(45 1150 188)" /></svg>
    <Card t="Customer Feedback" x={26} y={40} w={340} icon="#2e8b57"><div className="mk-tbl"><div className="mk-tbl-h"><span>Feedback</span><span>Category</span><span>Status</span></div>{[["Team caught my issue, but…", "Kudos", "In progress", "s0"], ["Waited weeks for something…", "Complaint", "Behind", "s1"], ["Order status stuck on…", "Bug", "In progress", "s0"], ["While the stock check was fa…", "Kudos", "In review", "s3"]].map(([a, b, c, s]) => <div key={a}><i /><span>{a}</span><span>{b}</span><em className={s}>{c}</em></div>)}</div></Card>
    <Card t="Flow Process" x={160} y={358} w={190} icon="#3b6cf0"><div className="mk-doc"><b>Process outline</b><p>This document outlines the end-to-end workflow for processing customer orders, from initial submission through inventory verification and fulfillment. The process spans three key functional areas (Customer, Sales, and Inventory), each r…</p></div></Card>
    <Card t="BPMN Diagram" x={1158} y={68} w={420} icon="#e8601c"><div className="mk-flow"><div className="lane">Customer</div><div className="lane l2">Sales</div><div className="lane l3">Inventory</div><div className="n a">Order</div><div className="n b">Receive order</div><div className="n c">Check stock</div><div className="d"><span>In stock?</span></div><span className="lbl">Out of stock</span></div></Card>
    <Cursor name="Rae" color="#c45a16" bg="#ffd7bf" x={1100} y={0} flip />
    <Cursor name="Bea" color="#0e8f8f" bg="#c6f3ee" x={1238} y={400} />
    <div className="mk-prompt"><div className="mk-ic"><span style={{ transform: "rotate(-8deg)" }}><i style={{ background: "#ff7a45" }} /></span><span style={{ transform: "rotate(4deg)" }}><i style={{ background: "#1c1c1e", borderRadius: 6 }} /></span><span style={{ transform: "rotate(-3deg)" }}><i style={{ background: "#6b8cff", borderRadius: "50%" }} /></span><span style={{ transform: "rotate(7deg)" }}><i style={{ background: "#7d5cff", borderRadius: 10 }} /></span></div>
      <div className="mk-pbox"><p>Map this process as a workflow diagram so the whole team can follow it</p><div className="mk-pr"><span>+</span><span className="mk-pr-r"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#1c1c1e" strokeWidth="2" strokeLinecap="round"><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M6 11a6 6 0 0012 0M12 17v3" /></svg><span className="go">↑</span></span></div></div></div>
  </div>;
}
export function HeroForm() {
  return <form className="mk-form" action={BP + "/signup"}><input aria-label="Work email" placeholder="Enter your work email" /><button type="submit">Get Started Free</button></form>;
}
/** Cookie notice. MiroIsDead sets no analytics cookies; the choice is stored locally so the banner stays dismissed. */
export function CookieBar() {
  const [open, setOpen] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem("mi_cookie_choice")) setOpen(true); } catch { setOpen(true); } }, []);
  const choose = (v: string) => { try { localStorage.setItem("mi_cookie_choice", v); } catch { } setOpen(false); };
  if (!open) return null;
  return <div className="mk-cookie" role="dialog" aria-label="Cookies"><div className="mk-cookie-t"><h2>Cookies, anyone?</h2><p>By clicking “Accept All Cookies”, you agree to the storing of cookies on your device to enhance site navigation, analyze site usage, and assist in our marketing efforts. MiroIsDead only stores your sign-in session and this choice.</p></div>
    <div className="mk-cookie-b"><button className="plain" onClick={() => choose("reject")}>Reject All</button><button onClick={() => choose("settings")}>Cookies Settings</button><button onClick={() => choose("accept")}>Accept All Cookies</button></div></div>;
}
export function JoinBar() { return <CookieBar />; }
