"use client";
// Client glue: picks the store (cloud API for Firebase users, device storage for the demo account) and renders the dashboard or the editor.
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Board, BoardMeta } from "@/lib/canvas/types";
import { CloudBoardStore, LocalBoardStore, type BoardStore } from "@/lib/store";
import { boardFromTemplate, TEMPLATES, type TemplateId } from "@/lib/canvas/templates";
import { metaOf, newBoard, parseBoard, serialize } from "@/lib/canvas/board";
import { nid } from "@/lib/canvas/doc";
import { Editor } from "@/components/board/Editor";
import { Mark } from "@/components/board/icons";
import { boardToSvg } from "@/components/board/exportSvg";
import { listCustomTemplates, removeCustomTemplate, type CustomTemplate } from "@/components/board/exportMore";
import { Pop, Item, Hr } from "@/components/board/Menus";
import { BP } from "@/lib/basepath";
import { X } from "@/components/mxi";
import "./midash.css";
import { track, identify, resetIdentity, EVENTS } from "@/lib/analytics";
import { shareLink } from "@/lib/share";

export type Who = { kind: "demo" | "firebase" | "guest"; uid: string; name: string };
export function makeStore(who: Who): BoardStore { const local = new LocalBoardStore(who.uid); return who.kind === "firebase" ? new CloudBoardStore(BP, local) : local; }
/** Miro's "Last opened" column: Today / Yesterday, then a date. */
export const when = (t: number, now = Date.now()) => { const day = (x: number) => { const d = new Date(x); return Math.floor((x - d.getTimezoneOffset() * 60000) / 86400000); }; const diff = day(now) - day(t); if (diff <= 0) return "Today"; if (diff === 1) return "Yesterday"; return new Date(t).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }); };
const fullDate = (t: number) => new Date(t).toLocaleString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit" });
type Dlg = { kind: "rename"; m: BoardMeta } | { kind: "delete"; m: BoardMeta } | { kind: "details"; m: BoardMeta; b: Board | null } | { kind: "space" } | { kind: "moveTeam"; m: BoardMeta };
/** Styled dialog (Miro uses modals, not native prompt/confirm, for board actions). */
function Dialog({ title, onClose, children, testid }: { title: string; onClose: () => void; children: React.ReactNode; testid?: string }) {
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }; window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true); }, [onClose]);
  return <div className="mx-scrim mx-dlg-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="mx-dlg" role="dialog" aria-modal="true" aria-label={title} data-testid={testid}>
      <div className="mx-dlg-h"><h3>{title}</h3><button className="mx-ic sm" aria-label="Close" onClick={onClose}>{X.close}</button></div>
      {children}
    </div>
  </div>;
}
function RenameDialog({ m, onClose, onSave }: { m: BoardMeta; onClose: () => void; onSave: (t: string) => void }) {
  const [t, setT] = useState(m.title);
  return <Dialog title="Rename board" onClose={onClose} testid="rename-dialog">
    <form onSubmit={e => { e.preventDefault(); if (t.trim()) onSave(t.trim()); }}>
      <label className="mx-dlg-field">Board name<input autoFocus value={t} onChange={e => setT(e.target.value)} onFocus={e => e.target.select()} maxLength={120} /></label>
      <div className="mx-dlg-acts"><button type="button" className="mx-btn" onClick={onClose}>Cancel</button><button type="submit" className="mx-btn primary" disabled={!t.trim()}>Save</button></div>
    </form>
  </Dialog>;
}
function NameDialog({ title, label, initial, cta, onClose, onSave }: { title: string; label: string; initial: string; cta: string; onClose: () => void; onSave: (t: string) => void }) {
  const [t, setT] = useState(initial);
  return <Dialog title={title} onClose={onClose} testid="name-dialog">
    <form onSubmit={e => { e.preventDefault(); if (t.trim()) onSave(t.trim()); }}>
      <label className="mx-dlg-field">{label}<input autoFocus value={t} onChange={e => setT(e.target.value)} onFocus={e => e.target.select()} maxLength={80} /></label>
      <div className="mx-dlg-acts"><button type="button" className="mx-btn" onClick={onClose}>Cancel</button><button type="submit" className="mx-btn primary" disabled={!t.trim()}>{cta}</button></div>
    </form>
  </Dialog>;
}
const GREETING = "We’ve got this"; // Miro: one stable line
/** Per-user dashboard preferences (stars, spaces, dismissed banners) on this device. */
type Prefs = { starred: string[]; spaces: { id: string; name: string; emoji?: string }[]; spaceOf: Record<string, string>; banner?: boolean; promo?: boolean; workspace?: string };
const prefsKey = (uid: string) => `miroisdead:v1:${uid}:dash`;
const loadPrefs = (uid: string): Prefs => { try { return { starred: [], spaces: [], spaceOf: {}, ...JSON.parse(localStorage.getItem(prefsKey(uid)) ?? "{}") }; } catch { return { starred: [], spaces: [], spaceOf: {} }; } };

function Thumb({ store, id }: { store: BoardStore; id: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => { let off = false; store.load(id).then(b => { if (!off && b && b.doc.order.length) setSvg(boardToSvg(b.doc, { maxW: 320, pad: 20, background: "#FAFAFC" })); }); return () => { off = true; }; }, [store, id]);
  return svg ? <div className="mi-thumb" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="mi-thumb empty" aria-hidden="true">Empty board</div>;
}

export function Banner({ onClose }: { onClose: () => void }) {
  return <div className="mx-banner" role="status"><span className="mx-banner-i">{X.info}</span><span>Never miss an important update.</span><a href="#notifications" onClick={e => { e.preventDefault(); if (typeof Notification !== "undefined") void Notification.requestPermission?.(); onClose(); }}>Turn on real-time notifications</a><button aria-label="Close banner" className="mx-banner-x" onClick={onClose}>{X.close}</button></div>;
}

// Template previews use random object ids, so render them after mount (avoids a server/client markup mismatch).
function useTplSvg(id: TemplateId, maxW: number) { const [svg, setSvg] = useState(""); useEffect(() => { if (id !== "blank") setSvg(boardToSvg(boardFromTemplate(id).doc, { maxW, pad: 18, background: "#F4F4F8" })); }, [id, maxW]); return svg; }
function TplCard({ id, name, onPick, testid }: { id: TemplateId; name: string; onPick: () => void; testid?: string }) {
  const svg = useTplSvg(id, 220);
  return <button className="mx-tpl" onClick={onPick} data-testid={testid}>
    <span className={"mx-tpl-art" + (id === "blank" ? " blank" : "")}>{id === "blank" ? X.plusS : <span dangerouslySetInnerHTML={{ __html: svg }} />}</span>
    <span className="mx-tpl-name">{name}</span>
  </button>;
}
function CustomTplArt({ t }: { t: CustomTemplate }) { const [svg, setSvg] = useState(""); useEffect(() => { try { const b = parseBoard(t.board); setSvg(boardToSvg(b.doc, { maxW: 300, pad: 18, background: "#F4F4F8" })); } catch { /* ignore */ } }, [t]); return <span dangerouslySetInnerHTML={{ __html: svg }} />; }

function TemplatesModal({ onClose, onPick, onPickCustom }: { onClose: () => void; onPick: (t: TemplateId) => void; onPickCustom: (t: CustomTemplate) => void }) {
  const [q, setQ] = useState(""), [custom, setCustom] = useState<CustomTemplate[]>([]), [side, setSide] = useState<"all" | "ai" | "verse" | "team">("all");
  useEffect(() => { setCustom(listCustomTemplates()); }, []);
  useEffect(() => { const k = (e: KeyboardEvent) => { if (e.key === "Escape") { e.stopPropagation(); onClose(); } }; window.addEventListener("keydown", k, true); return () => window.removeEventListener("keydown", k, true); }, [onClose]);
  const list = TEMPLATES.filter(t => t.id !== "blank" && (t.name + " " + t.blurb + " " + t.tags.join(" ")).toLowerCase().includes(q.toLowerCase()));
  const product = TEMPLATES.filter(t => t.tags.includes("product"));
  const cust = custom.filter(t => t.name.toLowerCase().includes(q.toLowerCase()));
  const cats = ["Meetings & workshops", "Ideation & brainstorming", "Research & design", "Agile workflows", "Strategy & planning", "Diagramming & mapping", "Presentations & slides", "Wireframing & prototyping", "Image creation"];
  return <div className="mx-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="mx-tm" role="dialog" aria-label="Templates" data-testid="templates-modal">
      <button className="mx-tm-x" aria-label="Close" onClick={onClose}>{X.close}</button>
      <aside>
        <a className={side === "all" ? "on" : ""} onClick={() => setSide("all")}>{X.tplS} All templates</a>
        <a className={side === "ai" ? "on" : ""} onClick={() => setSide("ai")}>{X.sparkle2} AI Accelerated <em>New</em></a>
        <a className={side === "verse" ? "on" : ""} onClick={() => setSide("verse")}>{X.verse} MiroIsDeadverse</a>
        <a className={side === "team" ? "on" : ""} onClick={() => setSide("team")}>{X.tplS} Your templates {X.info}</a>
        <h4>Use cases</h4>
        {cats.map(c => <a key={c} className="sm" onClick={() => { setSide("all"); setQ(c.split(" ")[0]); }}>{c}</a>)}
        <h4>Types</h4><a className="sm">Blueprints {X.info}</a><a className="sm">Format templates</a>
      </aside>
      <section>
        <div className="mx-tm-top"><label className="mx-tm-search">{X.search}<input placeholder="Search templates by name, category or company" value={q} onChange={e => setQ(e.target.value)} /></label><label className="mx-tm-check"><input type="checkbox" defaultChecked /> Show when creating a board</label></div>
        <h2>{side === "team" ? "Your templates" : side === "ai" ? "AI Accelerated" : side === "verse" ? "MiroIsDeadverse" : "All templates"}</h2>
        {side !== "team" && <div className="mx-tm-promo"><div><b>{side === "verse" ? "Templates from the community" : "Templates with AI built in"}</b><p>{side === "verse" ? "Boards shared by other MiroIsDead users. Publish your own from Share ▸ Publish." : "Every template is a plain board you can hand to your own AI agent: copy the scene JSON from Share ▸ AI. No setup, no credits."}</p><button className="mx-dark" onClick={() => onPick("blank")}>Start with a blank board</button></div></div>}
        {side !== "team" && <><div className="mx-tm-tabs"><span className="on">For you</span><span>View all</span></div>
          <div className="mx-tm-grid">{list.map(t => <button key={t.id} className="mx-tm-card" onClick={() => onPick(t.id)} data-testid={`tm-${t.id}`}><span className="art"><TplArt id={t.id} /></span><span className="by"><i />MiroIsDead</span><b>{t.name}</b></button>)}</div>
          {!q && side === "all" && <><h3 className="mx-tm-h3">Product team templates</h3><div className="mx-tm-grid">{product.map(t => <button key={"p-" + t.id} className="mx-tm-card" onClick={() => onPick(t.id)}><span className="art"><TplArt id={t.id} /></span><span className="by"><i />MiroIsDead</span><b>{t.name}</b></button>)}</div></>}</>}
        {(side === "team" || cust.length > 0) && <><h3 className="mx-tm-h3">Your templates</h3>
          {cust.length === 0 ? <p className="ids-muted">Save any board as a template from Export ▸ “Save board as template”.</p> : <div className="mx-tm-grid">{cust.map(t => <div key={t.id} className="mx-tm-card custom"><button onClick={() => onPickCustom(t)} data-testid={`tm-custom-${t.id}`}><span className="art"><CustomTplArt t={t} /></span><span className="by"><i />You · {when(t.savedAt)}</span><b>{t.name}</b></button><button className="mx-tm-del" aria-label="Delete template" onClick={() => { removeCustomTemplate(t.id); setCustom(listCustomTemplates()); }}>{X.trash2}</button></div>)}</div>}</>}
      </section>
    </div>
  </div>;
}
function TplArt({ id }: { id: TemplateId }) { const svg = useTplSvg(id, 300); return <span dangerouslySetInnerHTML={{ __html: svg }} />; }

type Nav = "home" | "starred" | "browse" | { space: string };
export function Dashboard({ who, signOutAction }: { who: Who; signOutAction: () => void | Promise<void> }) {
  const store = useMemo(() => makeStore(who), [who]);
  const router = useRouter();
  const [boards, setBoards] = useState<BoardMeta[] | null>(null);
  const [err, setErr] = useState("");
  const [prefs, setPrefsState] = useState<Prefs>({ starred: [], spaces: [], spaceOf: {} });
  const setPrefs = (f: (p: Prefs) => Prefs) => setPrefsState(p => { const n = f(p); try { localStorage.setItem(prefsKey(who.uid), JSON.stringify(n)); } catch { /* quota */ } return n; });
  const [menu, setMenu] = useState<"" | "create" | "profile" | "tplfor">("");
  const [rowMenu, setRowMenu] = useState<string | null>(null);
  const [tm, setTmState] = useState(false); const setTm = (v: boolean) => { if (v) track(EVENTS.app_templates_modal_opened); setTmState(v); };
  const [view, setView] = useState<"list" | "grid">("list");
  const [nav, setNav] = useState<Nav>("home");
  const [q, setQ] = useState("");
  const refresh = () => store.list().then(setBoards, () => setBoards([]));
  useEffect(() => { setPrefsState(loadPrefs(who.uid)); identify(who.uid, { account_type: who.kind }); }, [who.uid, who.kind]);
  useEffect(() => {
    (async () => {
      let list = await store.list().catch(() => []);
      if (who.kind === "firebase") { // carry a guest's on-device boards into the account, once
        let from: string | null = null; try { from = localStorage.getItem("miroisdead:migrate-from"); } catch {}
        if (from && from !== who.uid) { const old = new LocalBoardStore(from); for (const m of await old.list()) { const b = await old.load(m.id); if (b) { await store.save(b); await old.remove(m.id); } }
          try { localStorage.removeItem("miroisdead:migrate-from"); } catch {} list = await store.list(); } }
      if (who.kind !== "firebase" && list.length === 0) { await store.save(boardFromTemplate("welcome")); list = await store.list(); }
      setBoards(list);
    })();
  }, [store, who.kind]);
  useEffect(() => { if (!menu && !rowMenu) return; const f = (e: MouseEvent) => { if (!(e.target as Element).closest("[data-menu]")) { setMenu(""); setRowMenu(null); } }; window.addEventListener("mousedown", f); return () => window.removeEventListener("mousedown", f); }, [menu, rowMenu]);
  const open = (id: string) => router.push(`/app/board/${id}`);
  const create = async (t: TemplateId, space?: string, source = "strip") => { const b = boardFromTemplate(t); await store.save(b).catch(() => {}); if (space) setPrefs(p => ({ ...p, spaceOf: { ...p.spaceOf, [b.id]: space } })); track(EVENTS.app_board_created, { template: t, source, in_space: !!space }); open(b.id); };
  const createCustom = async (t: CustomTemplate) => { try { const b = parseBoard(t.board); b.title = t.name; await store.save(b); track(EVENTS.app_board_created, { template: "custom", source: "custom_template" }); open(b.id); } catch (e) { setErr((e as Error).message); } };
  const [dlg, setDlg] = useState<Dlg | null>(null);
  const [toast, setToast] = useState(""); useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(""), 2200); return () => clearTimeout(t); }, [toast]);
  // The list is updated in state right away (Miro refreshes instantly); refresh() then reconciles with the store.
  const rename = async (m: BoardMeta, title: string) => { setDlg(null); const b = await store.load(m.id); if (!b) return; const n = { ...b, title, updatedAt: Date.now() }; setBoards(l => (l ?? []).map(x => x.id === m.id ? { ...x, title, updatedAt: n.updatedAt } : x)); await store.save(n).catch(() => setErr("Couldn't rename that board.")); track(EVENTS.app_board_renamed); refresh(); };
  const copy = async (m: BoardMeta) => { const b = await store.load(m.id); if (!b) return; const n: Board = { ...b, id: nid(), title: `${b.title} copy`, createdAt: Date.now(), updatedAt: Date.now() }; setBoards(l => [metaOf(n), ...(l ?? [])]); await store.save(n).catch(() => setErr("Couldn't duplicate that board.")); track(EVENTS.app_board_duplicated); refresh(); };
  const remove = async (m: BoardMeta) => { setDlg(null); setBoards(l => (l ?? []).filter(x => x.id !== m.id)); await store.remove(m.id).catch(() => setErr("Couldn't delete that board.")); track(EVENTS.app_board_deleted); refresh(); };
  const copyLink = async (m: BoardMeta) => { const pub = m.access && m.access !== "none"; const u = pub ? `${location.origin}${BP}/b/${m.id}` : `${location.origin}${BP}/app/board/${m.id}`; const r = await shareLink({ title: `${m.title} · MiroIsDead`, text: pub ? `"${m.title}" on MiroIsDead (anyone with the link can ${m.access === "edit" ? "edit" : "view"})` : `"${m.title}" on MiroIsDead`, url: u }); track(EVENTS.board_link_shared, { method: r === "shared" ? "share_sheet" : "clipboard", via: "row_menu", access: m.access ?? "none", result: r }); if (r === "shared") setToast("Shared"); else if (r === "copied") setToast(pub ? "Board link copied" : "Board link copied (turn on link access in Share so others can open it)"); else if (r === "failed") setToast("Couldn't share or copy"); };
  // Invite members: there is no mail service, so the invite is a sign-up link handed over via the OS share sheet (or the clipboard).
  const inviteMembers = async () => { const u = `${location.origin}${BP}/signup`; const r = await shareLink({ title: "Join me on MiroIsDead", text: `${user} invited you to MiroIsDead, a free online whiteboard. Sign up, then open the boards they share with you.`, url: u }); track(EVENTS.app_invite_shared, { method: r === "shared" ? "share_sheet" : "clipboard", source: "header", result: r }); if (r === "shared") setToast("Invite shared"); else if (r === "copied") setToast("Invite link copied. Send it to your teammates; they'll see boards you share with them."); else if (r === "failed") setErr("Couldn't open the share sheet or copy the link."); };
  const setPrivate = async (m: BoardMeta, priv: boolean) => { const b = await store.load(m.id); if (!b) return; const n = { ...b, access: priv ? "none" as const : "view" as const, updatedAt: Date.now() }; setBoards(l => (l ?? []).map(x => x.id === m.id ? { ...x, access: n.access } : x)); await store.save(n).catch(() => setErr("Couldn't update that board.")); setToast(priv ? "Only you can open this board now" : "Anyone with the link can view this board"); refresh(); };
  const details = async (m: BoardMeta) => { setDlg({ kind: "details", m, b: null }); const b = await store.load(m.id); setDlg(d => d?.kind === "details" && d.m.id === m.id ? { ...d, b } : d); };
  const exportJson = async (m: BoardMeta) => { const b = await store.load(m.id); if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([serialize(b)], { type: "application/json" })); a.download = `${b.title}.miroisdead.json`; a.click(); track(EVENTS.app_board_exported, { format: "json" }); };
  const onImport = async (f: File | undefined) => { if (!f) return; setErr(""); try { const b = parseBoard(await f.text()); await store.save(b); track(EVENTS.app_board_created, { template: "import", source: "import" }); open(b.id); } catch (e) { setErr((e as Error).message); } };
  const star = (id: string) => { track(EVENTS.app_board_starred, { starred: !prefs.starred.includes(id) }); setPrefs(p => ({ ...p, starred: p.starred.includes(id) ? p.starred.filter(x => x !== id) : [...p.starred, id] })); };
  const newSpace = () => setDlg({ kind: "space" });
  const createSpace = (name: string, moveBoard?: string) => { setDlg(null); const sp = { id: nid(), name }; setPrefs(p => ({ ...p, spaces: [...p.spaces, sp], spaceOf: moveBoard ? { ...p.spaceOf, [moveBoard]: sp.id } : p.spaceOf })); track(EVENTS.app_space_created); setNav({ space: sp.id }); };
  const moveTo = (bid: string, sid: string | null) => setPrefs(p => { const spaceOf = { ...p.spaceOf }; if (sid) spaceOf[bid] = sid; else delete spaceOf[bid]; return { ...p, spaceOf }; });
  const user = who.name.split("@")[0];
  const initials = (user.slice(0, 2) || "me").toUpperCase();
  const workspace = prefs.workspace ?? `${user.split(" ")[0]}’s team`;
  const spaceName = (id?: string) => prefs.spaces.find(s => s.id === id)?.name ?? "";
  const shown = (boards ?? []).filter(m => (q ? m.title.toLowerCase().includes(q.toLowerCase()) : true)).filter(m => nav === "home" || nav === "browse" ? true : nav === "starred" ? prefs.starred.includes(m.id) : prefs.spaceOf[m.id] === nav.space);
  const title = nav === "home" ? `${GREETING}, ${user}` : nav === "starred" ? "Starred" : nav === "browse" ? "Browse" : spaceName(nav.space);
  const curSpace = typeof nav === "object" ? nav.space : undefined;

  return <div className="mx-dash">
    <div className="mx-shell">
      <aside className="mx-side">
        <div className="mx-ws"><span className="mx-ws-av">{initials}</span><b title="Rename workspace" onDoubleClick={() => { const n = window.prompt("Workspace name", workspace); if (n?.trim()) setPrefs(p => ({ ...p, workspace: n.trim() })); }}>{workspace}</b><button className="mx-sq" aria-label="Create or join a workspace" onClick={() => setErr("MiroIsDead has one workspace per account; use Spaces to organise boards.")}>{X.plusS}</button></div>
        <div className="mx-srch"><label>{X.search}<input placeholder="Search by title or topic" aria-label="Search boards" value={q} onChange={e => setQ(e.target.value)} /></label><button className="mx-sq big" aria-label="Create new" onClick={() => setMenu("create")}>{X.plusS}</button></div>
        <nav><a className={nav === "home" ? "on" : ""} onClick={() => setNav("home")}>{X.home}<span>Home</span></a><a className={nav === "starred" ? "on" : ""} onClick={() => setNav("starred")}>{X.star}<span>Starred</span></a><a className={nav === "browse" ? "on" : ""} onClick={() => setNav("browse")}>{X.browse}<span>Browse</span></a></nav>
        <div className="mx-spaces"><b>Spaces</b><button className="mx-sq" aria-label="Create Space" onClick={newSpace}>{X.plusS}</button></div>
        {prefs.spaces.length > 0 && <nav className="mx-spacelist">{prefs.spaces.map(s => <a key={s.id} className={curSpace === s.id ? "on" : ""} onClick={() => setNav({ space: s.id })}>{X.space}<span>{s.name}</span></a>)}</nav>}
        <div className="mx-grow" />
        {prefs.promo !== false && <div className="mx-promo"><div className="mx-promo-i"><i className="mk">m</i><span>+</span><i className="dot a" /><i className="dot b" /><i className="dot c" /></div><b>Make AI a team sport</b><p>Connect your AI tools with MCPs to collaborate on their outputs.</p><div><a className="mx-dark" href="https://github.com/tommy-muckstack/miroisdead#readme" target="_blank" rel="noreferrer" onClick={() => setPrefs(p => ({ ...p, promo: false }))}>Connect</a><button className="mx-light" onClick={() => setPrefs(p => ({ ...p, promo: false }))}>Not now</button></div></div>}
      </aside>
      <main className="mx-main">
        <header className="mx-bar">
          <Link href="/" className="mx-logo"><Mark size={28} />MiroIsDead</Link><span className="mx-grow" />
          {who.kind === "guest" && <Link href="/login" className="mx-pill mx-save" title="Boards stay in this browser until you sign in">Sign in to save &amp; sync</Link>}
          <button className="mx-pill" onClick={() => void inviteMembers()}>{X.invite} Invite members</button>
          <button className="mx-ic" aria-label="What's new" onClick={() => window.open("https://github.com/tommy-muckstack/miroisdead/commits/main", "_blank")}>{X.gift}</button>
          <button className="mx-ic" aria-label="Feed" title="Feed" onClick={() => setPrefs(p => ({ ...p, banner: true }))}>{X.bell}</button>
          <span data-menu className="mx-menuwrap"><button className="mx-av" aria-label="Account" aria-expanded={menu === "profile"} onClick={() => setMenu(m => m === "profile" ? "" : "profile")}>{initials[0]}</button>
            {menu === "profile" && <div className="mx-pop mx-prof" role="menu"><div className="mx-prof-h"><span className="mx-av sm">{initials[0]}</span><b>{user}</b></div>
              <a role="menuitem">{X.user} Profile</a><a role="menuitem" href="https://github.com/tommy-muckstack/miroisdead#readme" target="_blank" rel="noreferrer">{X.ai} Connect your AI tools</a><a role="menuitem">{X.gear} Admin Console</a><hr />
              <a role="menuitem">{X.trash} Trash</a><a role="menuitem" onClick={() => { void create("welcome"); }}>{X.learn} Learning Center</a><a role="menuitem">{X.apps} iOS, Android, Desktop Apps</a><hr />
              <a role="menuitem" href="https://github.com/tommy-muckstack/miroisdead" target="_blank" rel="noreferrer">{X.dev} Developer Hub</a><a role="menuitem" href="https://github.com/tommy-muckstack/miroisdead" target="_blank" rel="noreferrer">{X.market} MiroIsDead Marketplace</a>              <form action={signOutAction} onSubmit={() => { track(EVENTS.auth_signed_out); resetIdentity(); }}><button role="menuitem">{X.logout} Log out</button></form></div>}
          </span>
        </header>
        <div className="mx-col">
          <h1 className={"mx-hello" + (nav === "home" ? "" : " sm")}>{title}</h1>
          {err && <p role="alert" className="mi-err" onClick={() => setErr("")}>{err}</p>}
          {(nav === "home" || curSpace) && <section aria-label="Start a board">
            <div className="mx-row"><h2>Start something new</h2>
              <span data-menu className="mx-menuwrap"><button className="mx-create" onClick={() => setMenu(m => m === "create" ? "" : "create")} aria-expanded={menu === "create"} data-testid="create-menu">{X.plusS} Create</button>
                {menu === "create" && <div className="mx-pop mx-cr" role="menu">
                  <a role="menuitem" onClick={() => create("blank", curSpace)}>{X.board} Board</a><a role="menuitem" onClick={() => { setMenu(""); setTm(true); }}>{X.fmt} Format <span className="r">{X.chevR}</span></a><a role="menuitem" onClick={() => { setMenu(""); newSpace(); }}>{X.space} Space <span className="r">{X.info}</span></a>
                  <label role="menuitem" className="a">{X.imp} Import <span className="r">{X.chevR}</span><input type="file" accept="application/json,.json" hidden onChange={e => onImport(e.target.files?.[0])} /></label><hr />
                  <a role="menuitem" onClick={() => { setMenu(""); setTm(true); }}>{X.tplS} Explore templates</a><a role="menuitem" onClick={() => { setMenu(""); setTm(true); }}>{X.verse} Explore MiroIsDeadverse</a>
                </div>}
              </span></div>
            <span data-menu className="mx-menuwrap"><p className="mx-tpl-for" onClick={() => setMenu(m => m === "tplfor" ? "" : "tplfor")}>Templates for Product management {X.chev}</p>
              {menu === "tplfor" && <div className="mx-pop mx-cr" role="menu">{["Product management", "Design & UX", "Engineering", "Marketing", "Operations"].map(t => <a key={t} role="menuitem" onClick={() => setMenu("")}>{t}</a>)}</div>}</span>
            <div className="mx-tpls">{TEMPLATES.map(t => <TplCard key={t.id} id={t.id} name={t.name} onPick={() => create(t.id, curSpace)} testid={`new-${t.id}`} />)}
              <a className="mx-tpl mx-tpl-verse" onClick={() => setTm(true)}><span className="mx-tpl-art blank">{X.verse}</span><span className="mx-tpl-name">From MiroIsDeadverse →</span></a>
              <label className="mx-tpl"><span className="mx-tpl-art blank">{X.imp}</span><span className="mx-tpl-name">Import a board file</span><input type="file" accept="application/json,.json" hidden onChange={e => onImport(e.target.files?.[0])} /></label></div></section>}
          <section aria-label="Your boards">
            <div className="mx-row"><h2>{nav === "home" ? "Jump back to recents" : nav === "starred" ? "Starred boards" : nav === "browse" ? "All boards" : "Boards in this space"}</h2><span className="mx-toggle"><button className={view === "grid" ? "on" : ""} aria-label="Grid view" onClick={() => setView("grid")}>{X.grid}</button><button className={view === "list" ? "on" : ""} aria-label="List view" onClick={() => setView("list")}>{X.list}</button></span></div>
            {boards === null ? <p className="ids-muted">Loading…</p> : shown.length === 0 ? <div className="mx-empty"><b>{q ? `No boards match “${q}”` : nav === "starred" ? "No starred boards yet" : curSpace ? "This space is empty" : "No boards yet"}</b><p>{nav === "starred" ? "Hover a board and click the star to keep it here." : curSpace ? "Create a board here or move one in from its ⋯ menu." : "Pick a template above to get started."}</p></div> :
              <div className={"mx-list " + view} data-testid="boards">
                {view === "list" && <div className="mx-th"><span>Name</span><span>Online users</span><span>Space</span><span>Last opened</span><span>Owner</span></div>}
                {shown.map(m => <article key={m.id} className="mx-rowb" data-testid="board-card">
                  <Link href={`/app/board/${m.id}`} className="mx-name" onClick={() => track(EVENTS.app_board_opened, { source: nav === "home" ? "recents" : nav === "starred" ? "starred" : nav === "browse" ? "browse" : "space" })}><span className="mx-bic">{m.emoji ? <span className="mx-emoji">{m.emoji}</span> : view === "grid" ? <Thumb store={store} id={m.id} /> : <span className="mx-bicon" aria-hidden="true">{X.board}</span>}</span><span><b>{m.title}</b><small>Modified by {user}</small></span></Link>
                  <span className="mx-c">{""}</span><span className="mx-c">{spaceName(prefs.spaceOf[m.id])}</span><span className="mx-c">{when(m.updatedAt)}</span><span className="mx-c mx-own" title={who.name}>{user}</span>
                  <div className="mx-acts" data-menu>
                    <button className={"mx-ic sm" + (prefs.starred.includes(m.id) ? " starred" : "")} aria-label={prefs.starred.includes(m.id) ? "Unstar" : "Star"} aria-pressed={prefs.starred.includes(m.id)} onClick={() => star(m.id)}>{X.star}</button>
                    <span className="mx-menuwrap"><button className="mx-ic sm" aria-label="Board options" aria-haspopup="menu" aria-expanded={rowMenu === m.id} onClick={() => setRowMenu(r => r === m.id ? null : m.id)}>{X.kebab}</button>
                      {rowMenu === m.id && <Pop className="mx-rowpop" onClose={() => setRowMenu(null)}>
                        <Item icon={X.board} label="Open in new tab" onClick={() => { window.open(`${BP}/app/board/${m.id}`, "_blank"); setRowMenu(null); }} />
                        <Item icon={X.pen2} label="Rename" onClick={() => { setRowMenu(null); setDlg({ kind: "rename", m }); }} /><Item icon={X.copy} label="Duplicate" onClick={() => { setRowMenu(null); void copy(m); }} />
                        <Item icon={X.info} label="Board details" onClick={() => { setRowMenu(null); void details(m); }} />
                        <Item icon={X.invite} label="Share" onClick={() => { setRowMenu(null); router.push(`/app/board/${m.id}#share`); }} /><Item icon={X.link} label="Copy board link" onClick={() => { setRowMenu(null); copyLink(m); }} />
                        <Item icon={X.lock} label={m.access && m.access !== "none" ? "Make board private" : "Make board public"} onClick={() => { setRowMenu(null); void setPrivate(m, !!m.access && m.access !== "none"); }} />
                        <Item icon={X.star} label={prefs.starred.includes(m.id) ? "Remove from starred" : "Add to starred"} onClick={() => { setRowMenu(null); star(m.id); }} />
                        <Hr />{prefs.spaceOf[m.id] ? <Item icon={X.space} label="Move to Team" onClick={() => { setRowMenu(null); moveTo(m.id, null); }} /> : <Item icon={X.space} label="Move to Space" onClick={() => { setRowMenu(null); setDlg({ kind: "moveTeam", m }); }} />}
                        {prefs.spaces.filter(s => prefs.spaceOf[m.id] !== s.id).map(s => <Item key={s.id} icon={X.space} label={`Move to ${s.name}`} onClick={() => { setRowMenu(null); moveTo(m.id, s.id); }} />)}
                        <Hr /><Item icon={X.download} label="Download board backup" onClick={() => { setRowMenu(null); void exportJson(m); }} /><Item icon={X.trash2} label="Delete" onClick={() => { setRowMenu(null); setDlg({ kind: "delete", m }); }} />
                      </Pop>}</span>
                  </div>
                </article>)}</div>}
          </section>
        </div>
      </main>
    </div>
    {dlg?.kind === "rename" && <RenameDialog m={dlg.m} onClose={() => setDlg(null)} onSave={t => void rename(dlg.m, t)} />}
    {dlg?.kind === "space" && <NameDialog title="Create a space" label="Space name" initial="New space" cta="Create" onClose={() => setDlg(null)} onSave={t => createSpace(t)} />}
    {dlg?.kind === "moveTeam" && (prefs.spaces.length === 0 ? <NameDialog title="Move to a new space" label="Space name" initial="New space" cta="Create and move" onClose={() => setDlg(null)} onSave={t => createSpace(t, dlg.m.id)} /> :
      <Dialog title="Move to Space" onClose={() => setDlg(null)} testid="move-dialog"><div className="mx-dlg-list">{prefs.spaces.map(s => <button key={s.id} className="mx-btn" onClick={() => { moveTo(dlg.m.id, s.id); setDlg(null); }}>{X.space} {s.name}</button>)}</div></Dialog>)}
    {dlg?.kind === "delete" && <Dialog title="Delete board?" onClose={() => setDlg(null)} testid="delete-dialog">
      <p className="mx-dlg-p">“{dlg.m.title}” will be deleted for everyone who has access to it. This can’t be undone, so download a backup first if you might need it later.</p>
      <div className="mx-dlg-acts"><button className="mx-btn" onClick={() => setDlg(null)}>Cancel</button><button className="mx-btn danger" onClick={() => void remove(dlg.m)}>Delete</button></div>
    </Dialog>}
    {dlg?.kind === "details" && <Dialog title="Board details" onClose={() => setDlg(null)} testid="details-dialog">
      <dl className="mx-dlg-dl"><dt>Name</dt><dd>{dlg.m.title}</dd><dt>Owner</dt><dd>{who.name}</dd><dt>Created</dt><dd>{fullDate(dlg.m.createdAt)}</dd><dt>Last modified</dt><dd>{fullDate(dlg.m.updatedAt)}</dd><dt>Space</dt><dd>{spaceName(prefs.spaceOf[dlg.m.id]) || "Team"}</dd><dt>Objects</dt><dd>{dlg.b ? dlg.b.doc.order.length : "…"}</dd><dt>Link access</dt><dd>{dlg.m.access === "edit" ? "Anyone with the link can edit" : dlg.m.access === "view" ? "Anyone with the link can view" : "Only you"}</dd></dl>
      <div className="mx-dlg-acts"><button className="mx-btn primary" onClick={() => setDlg(null)}>Done</button></div>
    </Dialog>}
    {toast && <div className="mx-toast" role="status">{toast}</div>}
    {tm && <TemplatesModal onClose={() => setTm(false)} onPick={t => { setTm(false); void create(t, curSpace); }} onPickCustom={t => { setTm(false); void createCustom(t); }} />}
  </div>;
}

export function BoardPage({ who, id, signOutAction, rtc = null }: { who: Who; id: string; signOutAction: () => void | Promise<void>; rtc?: import("@/lib/isdead-auth/config").FirebaseClientConfig | null }) {
  const store = useMemo(() => makeStore(who), [who]);
  const [board, setBoard] = useState<Board | null | undefined>(undefined);
  useEffect(() => { store.load(id).then(b => setBoard(b), () => setBoard(null)); }, [store, id]);
  if (board === undefined) return <div className="mi-loading">Loading board…</div>;
  if (board === null) return <div className="mi-loading"><h1 className="ids-h2">Board not found</h1><p className="ids-muted">It may have been deleted, or it lives on another device.</p><Link className="ids-btn ids-btn--primary" href="/app">Back to boards</Link></div>;
  return <Editor initial={board} store={store} who={who.name} signOutAction={signOutAction} rtc={who.kind === "firebase" ? rtc : null} />;
}
export { newBoard };
