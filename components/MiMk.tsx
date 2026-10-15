"use client";
import Link from "next/link";
import { useState } from "react";
import { Mark } from "@/components/board/icons";
import { BP } from "@/lib/basepath";
import "./mimk.css";
const Chev = () => <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d="M4 6l4 4 4-4" /></svg>;
export function MiNav() {
  return <header className="mk-nav"><Link href="/" className="mk-logo"><Mark size={40} />MiroIsDead</Link>
    <nav aria-label="Main"><a href={BP + "/#product"}>Product <Chev /></a><a href={BP + "/#templates"}>Use Cases <Chev /></a><a href={BP + "/#solutions"}>Solutions <Chev /></a><a href={BP + "/#resources"}>Resources <Chev /></a><a href={BP + "/#pricing"}>Pricing</a></nav>
    <div className="mk-act"><Link href="/login" className="mk-login">Login</Link><a className="mk-ghost" href="https://github.com/tommy-muckstack/miroisdead">View source</a><Link className="mk-cta" href="/signup">Get started free</Link></div></header>;
}
const Card = ({ x, y, w, children, t }: { x: number; y: number; w: number; children?: React.ReactNode; t: string }) => <div className="mk-c" style={{ left: x, top: y, width: w }}><span className="mk-ct">{t}</span><div className="mk-cb">{children}</div></div>;
export function HeroArt() {
  return <div className="mk-art" aria-hidden>
    <svg className="mk-lines" viewBox="0 0 1440 640" preserveAspectRatio="none"><path d="M335 240 C 400 240, 420 540, 490 540" /><path d="M335 590 C 400 590, 420 540, 490 540" /><path d="M850 540 C 920 540, 940 400, 1010 400" /><circle cx="335" cy="240" r="5" /><circle cx="490" cy="540" r="5" /><circle cx="850" cy="540" r="5" /><circle cx="1010" cy="400" r="5" /></svg>
    <Card t="Customer feedback" x={26} y={208} w={320}><div className="mk-tbl">{[0, 1, 2, 3].map(i => <div key={i}><i /><b /><em className={"s" + i} /></div>)}</div></Card>
    <Card t="Flow process" x={150} y={520} w={170}><div className="mk-doc"><b /><i /><i /><i /><i /><i /></div></Card>
    <Card t="Process diagram" x={1100} y={260} w={420}><div className="mk-flow"><div className="n a" /><div className="n b" /><div className="n c" /><div className="d" /></div></Card>
    <div className="mk-prompt"><div className="mk-ic"><span style={{ background: "#ff7a45" }} /><span style={{ background: "#1c1c1e" }} /><span style={{ background: "#6b8cff" }} /><span style={{ background: "#7d5cff" }} /></div>
      <div className="mk-pbox"><p>Map this process as a workflow diagram so the whole team can follow it</p><div className="mk-pr"><span>+</span><span className="go">↑</span></div></div></div>
  </div>;
}
export function HeroForm() {
  return <form className="mk-form" action={BP + "/signup"}><input aria-label="Work email" placeholder="Enter your work email" /><button type="submit">Get Started Free</button></form>;
}
export function JoinBar() {
  const [open, setOpen] = useState(true); if (!open) return null;
  return <div className="mk-join"><b>Free, open source, no seats</b><div><Link className="mk-ghost2" href="/login">Try the demo</Link><Link className="mk-cta" href="/signup">Get started free</Link><button aria-label="Close" onClick={() => setOpen(false)}>✕</button></div></div>;
}
