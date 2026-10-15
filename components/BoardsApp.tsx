"use client";
// Client glue: picks the store (cloud API for Firebase users, device storage for the demo account) and renders the dashboard or the editor.
import React, { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { Board, BoardMeta } from "@/lib/canvas/types";
import { CloudBoardStore, LocalBoardStore, type BoardStore } from "@/lib/store";
import { boardFromTemplate, TEMPLATES, type TemplateId } from "@/lib/canvas/templates";
import { newBoard, parseBoard, serialize } from "@/lib/canvas/board";
import { nid } from "@/lib/canvas/doc";
import { Editor } from "@/components/board/Editor";
import { boardToSvg } from "@/components/board/exportSvg";
import { Mark } from "@/components/board/icons";
import { BP } from "@/lib/basepath";
import { X } from "@/components/mxi";
import "./midash.css";

export type Who = { kind: "demo" | "firebase"; uid: string; name: string };
export function makeStore(who: Who): BoardStore { const local = new LocalBoardStore(who.uid); return who.kind === "firebase" ? new CloudBoardStore(BP, local) : local; }
const ago = (t: number) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 60 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : new Date(t).toLocaleDateString(); };

function Thumb({ store, id }: { store: BoardStore; id: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => { let off = false; store.load(id).then(b => { if (!off && b && b.doc.order.length) setSvg(boardToSvg(b.doc, { maxW: 320, pad: 20, background: "#FAFAFC" })); }); return () => { off = true; }; }, [store, id]);
  return svg ? <div className="mi-thumb" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="mi-thumb empty" aria-hidden="true">Empty board</div>;
}

export function Banner({ onClose }: { onClose: () => void }) {
  return <div className="mx-banner" role="status"><span className="mx-banner-i">{X.info}</span><span>Never miss an important update.</span><a href="#notifications" onClick={e => { e.preventDefault(); if (typeof Notification !== "undefined") void Notification.requestPermission?.(); onClose(); }}>Turn on real-time notifications</a><button aria-label="Dismiss" className="mx-banner-x" onClick={onClose}>{X.close}</button></div>;
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

function TemplatesModal({ onClose, onPick }: { onClose: () => void; onPick: (t: TemplateId) => void }) {
  const [q, setQ] = useState("");
  const list = TEMPLATES.filter(t => t.id !== "blank" && (t.name + " " + t.blurb).toLowerCase().includes(q.toLowerCase()));
  const cats = ["Meetings & workshops", "Ideation & brainstorming", "Research & design", "Agile workflows", "Strategy & planning", "Diagramming & mapping", "Presentations & slides", "Wireframing & prototyping", "Image creation"];
  return <div className="mx-scrim" onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="mx-tm" role="dialog" aria-label="Templates" data-testid="templates-modal">
      <button className="mx-tm-x" aria-label="Close" onClick={onClose}>{X.close}</button>
      <aside>
        <a className="on">{X.tplS} All templates</a>
        <a>{X.sparkle2} AI Accelerated <em>New</em></a>
        <a>{X.verse} Miroverse</a>
        <a>{X.tplS} Product team templates {X.info}</a>
        <h4>Use cases</h4>
        {cats.map(c => <a key={c} className="sm">{c}</a>)}
        <h4>Types</h4><a className="sm">Blueprints {X.info}</a><a className="sm">Format templates</a>
      </aside>
      <section>
        <div className="mx-tm-top"><label className="mx-tm-search"><input placeholder="Search templates by name, category or company" value={q} onChange={e => setQ(e.target.value)} /></label><label className="mx-tm-check"><input type="checkbox" defaultChecked /> Show when creating a board</label></div>
        <h2>All templates</h2>
        <div className="mx-tm-promo"><div><b>Templates built to be forked</b><p>Every template is a plain board. Pick one, then change anything, or send the scene JSON to your own AI agent.</p><button className="mx-dark" onClick={() => onPick("blank")}>Start with a blank board</button></div></div>
        <div className="mx-tm-tabs"><span className="on">For you</span><span>View all</span></div>
        <div className="mx-tm-grid">{list.map(t => <button key={t.id} className="mx-tm-card" onClick={() => onPick(t.id)} data-testid={`tm-${t.id}`}><span className="art"><TplArt id={t.id} /></span><span className="by"><i />MiroIsDead</span><b>{t.name}</b></button>)}</div>
      </section>
    </div>
  </div>;
}
function TplArt({ id }: { id: TemplateId }) { const svg = useTplSvg(id, 300); return <span dangerouslySetInnerHTML={{ __html: svg }} />; }

export function Dashboard({ who, signOutAction }: { who: Who; signOutAction: () => void | Promise<void> }) {
  const store = useMemo(() => makeStore(who), [who]);
  const router = useRouter();
  const [boards, setBoards] = useState<BoardMeta[] | null>(null);
  const [err, setErr] = useState("");
  const [banner, setBanner] = useState(true);
  const [promo, setPromo] = useState(true);
  const [menu, setMenu] = useState<"" | "create" | "profile">("");
  const [tm, setTm] = useState(false);
  const [view, setView] = useState<"list" | "grid">("list");
  const refresh = () => store.list().then(setBoards, () => setBoards([]));
  useEffect(() => {
    (async () => {
      let list = await store.list().catch(() => []);
      if (who.kind === "demo" && list.length === 0) { await store.save(boardFromTemplate("welcome")); list = await store.list(); }
      setBoards(list);
    })();
  }, [store, who.kind]);
  useEffect(() => { if (!menu) return; const f = (e: MouseEvent) => { if (!(e.target as Element).closest("[data-menu]")) setMenu(""); }; window.addEventListener("mousedown", f); return () => window.removeEventListener("mousedown", f); }, [menu]);
  const open = (id: string) => router.push(`/app/board/${id}`);
  const create = async (t: TemplateId) => { const b = boardFromTemplate(t); await store.save(b).catch(() => {}); open(b.id); };
  const rename = async (m: BoardMeta) => { const t = window.prompt("Rename board", m.title); if (!t?.trim()) return; const b = await store.load(m.id); if (b) { await store.save({ ...b, title: t.trim(), updatedAt: Date.now() }); refresh(); } };
  const copy = async (m: BoardMeta) => { const b = await store.load(m.id); if (b) { await store.save({ ...b, id: nid(), title: `${b.title} copy`, createdAt: Date.now(), updatedAt: Date.now() }); refresh(); } };
  const remove = async (m: BoardMeta) => { if (!window.confirm(`Delete “${m.title}”? This can't be undone.`)) return; await store.remove(m.id).catch(() => setErr("Couldn't delete that board.")); refresh(); };
  const exportJson = async (m: BoardMeta) => { const b = await store.load(m.id); if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([serialize(b)], { type: "application/json" })); a.download = `${b.title}.miroisdead.json`; a.click(); };
  const onImport = async (f: File | undefined) => { if (!f) return; setErr(""); try { const b = parseBoard(await f.text()); await store.save(b); open(b.id); } catch (e) { setErr((e as Error).message); } };
  const user = who.name.split("@")[0];
  const initials = (user.slice(0, 2) || "me").toUpperCase();

  return <div className="mx-dash">
    {banner && <Banner onClose={() => setBanner(false)} />}
    <div className="mx-shell">
      <aside className="mx-side">
        <div className="mx-ws"><span className="mx-ws-av">PT</span><b>Product team</b><button className="mx-sq" aria-label="Workspace options">{X.plusS}</button></div>
        <div className="mx-srch"><label>{X.search}<input placeholder="Search by title or topic" aria-label="Search boards" /></label><button className="mx-sq big" aria-label="New" onClick={() => setMenu("create")}>{X.plusS}</button></div>
        <nav><a className="on">{X.home}<span>Home</span></a><a>{X.star}<span>Starred</span></a><a>{X.browse}<span>Browse</span></a></nav>
        <div className="mx-spaces"><b>Spaces</b><button className="mx-sq" aria-label="New space">{X.plusS}</button></div>
        <div className="mx-grow" />
        {promo && <div className="mx-promo"><div className="mx-promo-i"><i className="mk">m</i><span>+</span><i className="dot a" /><i className="dot b" /><i className="dot c" /></div><b>Make AI a team sport</b><p>Connect your AI tools with MCPs to collaborate on their outputs.</p><div><button className="mx-dark" onClick={() => setPromo(false)}>Connect</button><button className="mx-light" onClick={() => setPromo(false)}>Not now</button></div></div>}
      </aside>
      <main className="mx-main">
        <header className="mx-bar">
          <Link href="/" className="mx-logo">miro</Link><span className="mx-plan"><b>Free</b> plan {X.chev}</span><span className="mx-grow" />
          <button className="mx-pill">{X.invite} Invite members</button>
          <button className="mx-blue">Upgrade</button>
          <button className="mx-ic round" aria-label="What's new">{X.gift}</button>
          <button className="mx-ic" aria-label="Notifications">{X.bell}</button>
          <span data-menu className="mx-menuwrap"><button className="mx-av" aria-label="Account" aria-expanded={menu === "profile"} onClick={() => setMenu(m => m === "profile" ? "" : "profile")}>{initials}</button>
            {menu === "profile" && <div className="mx-pop mx-prof" role="menu"><div className="mx-prof-h"><span className="mx-av sm">{initials}</span><b>{user}</b></div>
              <a role="menuitem">{X.user} Profile</a><a role="menuitem">{X.ai} Connect your AI tools</a><a role="menuitem">{X.gear} Admin Console</a><hr />
              <a role="menuitem">{X.trash} Trash<span className="r">{X.upgrade}</span></a><a role="menuitem">{X.learn} Learning Center</a><a role="menuitem">{X.apps} iOS, Android, Desktop Apps</a><hr />
              <a role="menuitem">{X.dev} Developer Hub</a><a role="menuitem" href="https://github.com/tommy-muckstack/miroisdead" target="_blank" rel="noreferrer">{X.market} Miro Marketplace</a><a role="menuitem">{X.upgrade} Upgrade</a>
              <form action={signOutAction}><button role="menuitem">{X.logout} Log out</button></form></div>}
          </span>
        </header>
        <div className="mx-col">
          <h1 className="mx-hello">Together again, {user}</h1>
          {err && <p role="alert" className="mi-err">{err}</p>}
          <section aria-label="Start a board">
            <div className="mx-row"><h2>Start something new</h2>
              <span data-menu className="mx-menuwrap"><button className="mx-create" onClick={() => setMenu(m => m === "create" ? "" : "create")} aria-expanded={menu === "create"} data-testid="create-menu">{X.plusS} Create</button>
                {menu === "create" && <div className="mx-pop mx-cr" role="menu">
                  <a role="menuitem" onClick={() => create("blank")}>{X.board} Board</a><a role="menuitem">{X.fmt} Format <span className="r">{X.chevR}</span></a><a role="menuitem">{X.space} Space <span className="r">{X.info}</span></a>
                  <label role="menuitem" className="a">{X.imp} Import <span className="r">{X.chevR}</span><input type="file" accept="application/json,.json" hidden onChange={e => onImport(e.target.files?.[0])} /></label><hr />
                  <a role="menuitem" onClick={() => { setMenu(""); setTm(true); }}>{X.tplS} Explore templates</a><a role="menuitem" onClick={() => { setMenu(""); setTm(true); }}>{X.verse} Explore Miroverse</a>
                </div>}
              </span></div>
            <p className="mx-tpl-for">Templates for Product management {X.chev}</p>
            <div className="mx-tpls">{TEMPLATES.map(t => <TplCard key={t.id} id={t.id} name={t.name} onPick={() => create(t.id)} testid={`new-${t.id}`} />)}
              <label className="mx-tpl"><span className="mx-tpl-art blank">{X.imp}</span><span className="mx-tpl-name">Import a board file</span><input type="file" accept="application/json,.json" hidden onChange={e => onImport(e.target.files?.[0])} /></label></div></section>
          <section aria-label="Your boards">
            <div className="mx-row"><h2>Jump back to recents</h2><span className="mx-toggle"><button className={view === "grid" ? "on" : ""} aria-label="Grid view" onClick={() => setView("grid")}>{X.grid}</button><button className={view === "list" ? "on" : ""} aria-label="List view" onClick={() => setView("list")}>{X.list}</button></span></div>
            {boards === null ? <p className="ids-muted">Loading…</p> : boards.length === 0 ? <p className="ids-muted">No boards yet. Pick a template above.</p> :
              <div className={"mx-list " + view} data-testid="boards">
                {view === "list" && <div className="mx-th"><span>Name</span><span>Online users</span><span>Space</span><span>Last opened</span><span>Owner</span></div>}
                {boards.map(m => <article key={m.id} className="mx-rowb" data-testid="board-card">
                  <Link href={`/app/board/${m.id}`} className="mx-name"><span className="mx-bic"><Thumb store={store} id={m.id} /></span><span><b>{m.title}</b><small>Modified by {user}</small></span></Link>
                  <span className="mx-c">{""}</span><span className="mx-c">{""}</span><span className="mx-c">{ago(m.updatedAt)}</span><span className="mx-c">{user}</span>
                  <div className="mx-acts"><button onClick={() => rename(m)}>Rename</button><button onClick={() => copy(m)}>Duplicate</button><button onClick={() => exportJson(m)}>Export</button><button onClick={() => remove(m)} className="danger">Delete</button></div>
                </article>)}</div>}
          </section>
        </div>
      </main>
    </div>
    {tm && <TemplatesModal onClose={() => setTm(false)} onPick={t => { setTm(false); void create(t); }} />}
  </div>;
}

export function BoardPage({ who, id, signOutAction }: { who: Who; id: string; signOutAction: () => void | Promise<void> }) {
  const store = useMemo(() => makeStore(who), [who]);
  const [board, setBoard] = useState<Board | null | undefined>(undefined);
  useEffect(() => { store.load(id).then(b => setBoard(b), () => setBoard(null)); }, [store, id]);
  if (board === undefined) return <div className="mi-loading">Loading board…</div>;
  if (board === null) return <div className="mi-loading"><h1 className="ids-h2">Board not found</h1><p className="ids-muted">It may have been deleted, or it lives on another device.</p><Link className="ids-btn ids-btn--primary" href="/app">Back to boards</Link></div>;
  return <Editor initial={board} store={store} who={who.name} signOutAction={signOutAction} />;
}
export { newBoard };
