"use client";
import { useState } from "react";
import Link from "next/link";
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import { signInWithEmail, signUpWithEmail, signInWithGoogle, resetPassword, authErrorMessage } from "@/lib/isdead-auth/client";
import { BP } from "@/lib/basepath";
import { GOOGLE_G_SVG } from "@/vendor/isdead-design/src/google";
import { Mark } from "@/components/board/icons";
import { X } from "@/components/mxi";
import "./miauth.css";
import { track, EVENTS } from "@/lib/analytics";
type Props = { config: FirebaseClientConfig | null; demo: boolean; to: string; mode: "signin" | "signup"; guestUid?: string | null };
const Bld = () => <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="#1c1c1e" strokeWidth="1.4" aria-hidden><rect x="3.5" y="2.5" width="10" height="14" /><path d="M13.5 8.5h3v8h-3M6 5.5h1.5M9.5 5.500H11M6 8.500h1.500M9.5 8.500H11M6 11.500h1.500M9.5 11.500H11" /></svg>;
export function MiAuth({ config, demo, to, mode, guestUid = null }: Props) {
  const su = mode === "signup";
  const [step, setStep] = useState(0), [email, setEmail] = useState(""), [pw, setPw] = useState(""), [rem, setRem] = useState(true), [reset, setReset] = useState(false);
  const [busy, setBusy] = useState(false), [err, setErr] = useState(""), [note, setNote] = useState("");
  const session = `${BP}/api/session`; const done = () => { if (guestUid) { try { localStorage.setItem("miroisdead:migrate-from", guestUid); } catch {} } window.location.assign(to); };
  const authMode = su ? "signup" : "signin";
  const run = async (f: () => Promise<void>, method?: string) => { setBusy(true); setErr(""); setNote(""); if (method) track(EVENTS.auth_started, { method, mode: authMode }); try { await f(); if (method) track(EVENTS.auth_completed, { method, mode: authMode }); } catch (e) { if (method) track(EVENTS.auth_failed, { method, mode: authMode, reason: String((e as { code?: string })?.code ?? "error") }); setErr(authErrorMessage(e)); } finally { setBusy(false); } };
  const submit = (e: React.FormEvent) => { e.preventDefault(); if (!config) { setErr("Sign-in isn't configured on this deployment yet."); return; }
    if (reset) return run(async () => { await resetPassword(config, email); setNote("If that email has an account, a reset link is on its way."); setReset(false); });
    if (step === 0) { if (email) setStep(1); return; }
    run(async () => { if (su) await signUpWithEmail(config, session, email, pw); else await signInWithEmail(config, session, email, pw); done(); }, "email"); };
  const demoLogin = () => run(async () => { const r = await fetch(`${BP}/api/session/demo`, { method: "POST" }); if (!r.ok) throw new Error("Demo sign-in failed"); done(); }, "demo");
  const google = () => config ? run(async () => { await signInWithGoogle(config, session); done(); }, "google") : setErr("Sign-in isn't configured on this deployment yet.");
  const G = <span dangerouslySetInnerHTML={{ __html: GOOGLE_G_SVG }} style={{ display: "inline-flex" }} />;
  const form = <form onSubmit={submit} noValidate={false}>
    <label className="ma-l" htmlFor="ma-email">{su ? "Enter your work email" : "Email"}</label>
    <div className="ma-in"><Bld /><input id="ma-email" type="email" required value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" aria-label="Email" disabled={step > 0} /></div>
    {step === 1 && !reset && <><label className="ma-l" htmlFor="ma-pw" style={{ marginTop: 14 }}>Password</label><div className="ma-in"><input id="ma-pw" type="password" required minLength={6} value={pw} onChange={e => setPw(e.target.value)} autoComplete={su ? "new-password" : "current-password"} autoFocus /></div></>}
    <p className="ma-h">{step === 0 ? (su ? "Use your work email. You'll set a password next." : "Use the email you signed up with.") : "Enter your password to continue."}</p>
    {!su && <label className="ma-ck"><input type="checkbox" checked={rem} onChange={e => setRem(e.target.checked)} /><span /> Remember me</label>}
    <button className="ma-go" disabled={busy}>{reset ? "Email me a reset link" : su ? (step ? "Create my canvas" : "Take me to my canvas") : "Continue with email"}</button>
  </form>;
  return <div className={"ma " + (su ? "ma-su" : "ma-si")}>
    <header className="ma-hd"><Link href="/" className="ma-logo"><Mark size={34} />MiroIsDead</Link><div className="ma-r"><span className="ma-en"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#1c1c1e" strokeWidth="1.6" aria-hidden><circle cx="12" cy="12" r="9" /><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18" /></svg>EN</span><Link className="ma-ob" href={su ? "/login" : "/signup"}>{su ? "Sign in" : "Sign up"}</Link></div></header>
    {su && <FakeBoard />}
    <main className="ma-card">
      <h1>{su ? "Your canvas is ready" : "Sign in to MiroIsDead"}</h1>
      {su && <p className="ma-sub">Start building, collaborating and bringing your ideas to life.</p>}
      {!su && <><button type="button" className="ma-pb ma-full" onClick={google}>{G}Continue with Google</button><hr /></>}
      {form}
      {su && <><div className="ma-or"><span>OR</span></div><button type="button" className="ma-pb ma-full" onClick={google}>{G}Continue with Google</button></>}
      {err && <p role="alert" className="ma-err">{err}</p>}{note && <p role="status" className="ma-note">{note}</p>}
      {su ? <p className="ma-alt">→ <Link href="/login">Already have an account? Sign in</Link></p> : demo ? <p className="ma-alt"><a href="#" onClick={e => { e.preventDefault(); demoLogin(); }}>→ Sign in with the demo account instead</a></p> : null}
      {!su && <p className="ma-trouble"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1c1c1e" strokeWidth="1.6" strokeLinecap="round" aria-hidden><path d="M4 20l5-1 10-10-4-4L5 15zM13 7l4 4M15 3l1 2M20 8l-2 1" /></svg>Trouble signing in? <a href="#" onClick={e => { e.preventDefault(); setReset(!reset); setStep(1); }}>{reset ? "Back to sign in" : "Request a password reset link"}</a></p>}
      {!su && <p className="ma-fine">New to MiroIsDead? <Link href="/signup">Create an account</Link>. No bots, no CAPTCHA.</p>}
      {su && <p className="ma-fine">By signing up, you agree to the <a href="https://github.com/tommy-muckstack/miroisdead/blob/main/LICENSE">license</a>. MiroIsDead is independent and not affiliated with Miro.</p>}
    </main>
    {demo && su && <button type="button" className="ma-demo" disabled={busy} onClick={demoLogin}>Use the demo account</button>}</div>;
}
/** Decorative board chrome behind the sign-up card (matches the editor's header, rail and right pill). */
function FakeBoard() {
  const rail = [X.select, X.notes, X.tpl, X.text, X.sticky, X.shapes, X.pen, X.comment, X.frame, X.diagram];
  return <div className="ma-fake" aria-hidden>
    <div className="ma-ftl"><span className="ma-fi">☰</span><b className="ma-flogo"><Mark size={22} />MiroIsDead</b><i className="ma-fdot" /><span>My first board</span><em>Internal</em><span className="ma-fi">{X.kebab}</span></div>
    <div className="ma-ftr"><span className="ma-fi">{X.timer}</span><span className="ma-fi">{X.chat}</span><span className="ma-fi">{X.video}</span><span className="ma-favs"><i /><i /><i /><i />7 {X.chev}</span><span className="ma-fpres">{X.play} Present</span><span className="ma-fshare">Share</span></div>
    <div className="ma-frail"><span className="ma-fai">{X.sparkle}</span><div className="ma-frl">{rail.map((ic, i) => <span key={i} className={"ma-fi" + (i === 0 ? " on" : "")}>{ic}</span>)}<span className="ma-fi plus">{X.plusS}</span></div><div className="ma-frl sm"><span className="ma-fi">{X.undo}</span><span className="ma-fi">{X.redo}</span></div></div>
  </div>;
}
