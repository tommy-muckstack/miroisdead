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

export type Who = { kind: "demo" | "firebase"; uid: string; name: string };
export function makeStore(who: Who): BoardStore { const local = new LocalBoardStore(who.uid); return who.kind === "firebase" ? new CloudBoardStore(BP, local) : local; }
const ago = (t: number) => { const s = Math.max(1, Math.round((Date.now() - t) / 1000)); return s < 60 ? "just now" : s < 3600 ? `${Math.round(s / 60)} min ago` : s < 86400 ? `${Math.round(s / 3600)} h ago` : new Date(t).toLocaleDateString(); };

function Thumb({ store, id }: { store: BoardStore; id: string }) {
  const [svg, setSvg] = useState<string | null>(null);
  useEffect(() => { let off = false; store.load(id).then(b => { if (!off && b && b.doc.order.length) setSvg(boardToSvg(b.doc, { maxW: 320, pad: 20, background: "#FAFAFC" })); }); return () => { off = true; }; }, [store, id]);
  return svg ? <div className="mi-thumb" dangerouslySetInnerHTML={{ __html: svg }} /> : <div className="mi-thumb empty" aria-hidden="true">Empty board</div>;
}

export function Dashboard({ who, signOutAction }: { who: Who; signOutAction: () => void | Promise<void> }) {
  const store = useMemo(() => makeStore(who), [who]);
  const router = useRouter();
  const [boards, setBoards] = useState<BoardMeta[] | null>(null);
  const [err, setErr] = useState("");
  const refresh = () => store.list().then(setBoards, () => setBoards([]));
  useEffect(() => {
    (async () => {
      let list = await store.list().catch(() => []);
      if (who.kind === "demo" && list.length === 0) { await store.save(boardFromTemplate("welcome")); list = await store.list(); }
      setBoards(list);
    })();
  }, [store, who.kind]);
  const open = (id: string) => router.push(`/app/board/${id}`);
  const create = async (t: TemplateId) => { const b = boardFromTemplate(t); await store.save(b).catch(() => {}); open(b.id); };
  const rename = async (m: BoardMeta) => { const t = window.prompt("Rename board", m.title); if (!t?.trim()) return; const b = await store.load(m.id); if (b) { await store.save({ ...b, title: t.trim(), updatedAt: Date.now() }); refresh(); } };
  const copy = async (m: BoardMeta) => { const b = await store.load(m.id); if (b) { await store.save({ ...b, id: nid(), title: `${b.title} copy`, createdAt: Date.now(), updatedAt: Date.now() }); refresh(); } };
  const remove = async (m: BoardMeta) => { if (!window.confirm(`Delete “${m.title}”? This can't be undone.`)) return; await store.remove(m.id).catch(() => setErr("Couldn't delete that board.")); refresh(); };
  const exportJson = async (m: BoardMeta) => { const b = await store.load(m.id); if (!b) return; const a = document.createElement("a"); a.href = URL.createObjectURL(new Blob([serialize(b)], { type: "application/json" })); a.download = `${b.title}.miroisdead.json`; a.click(); };
  const onImport = async (f: File | undefined) => { if (!f) return; setErr(""); try { const b = parseBoard(await f.text()); await store.save(b); open(b.id); } catch (e) { setErr((e as Error).message); } };

  return <div className="mi-dash">
    <header className="mi-dash-top">
      <Link href="/" className="mi-brand"><Mark size={30} /> MiroIsDead</Link><span className="mi-grow" />
      <span className="mi-who">{who.name}{who.kind === "demo" ? " · boards stay on this device" : ""}</span>
      <form action={signOutAction}><button className="ids-btn ids-btn--outline ids-btn--sm">Sign out</button></form>
    </header>
    <main className="mi-dash-main">
      <h1 className="ids-h2">Boards</h1>
      {err && <p role="alert" className="mi-err">{err}</p>}
      <section aria-label="Start a board"><h2 className="mi-h3">Start from a template</h2>
        <div className="mi-tpls">{TEMPLATES.map(t => <button key={t.id} className="mi-tpl" onClick={() => create(t.id)} data-testid={`new-${t.id}`}><b>{t.name}</b><span>{t.blurb}</span></button>)}
          <label className="mi-tpl import"><b>Import a board file</b><span>.json exported from MiroIsDead</span><input type="file" accept="application/json,.json" hidden onChange={e => onImport(e.target.files?.[0])} /></label></div></section>
      <section aria-label="Your boards"><h2 className="mi-h3">Your boards</h2>
        {boards === null ? <p className="ids-muted">Loading…</p> : boards.length === 0 ? <p className="ids-muted">No boards yet. Pick a template above.</p> :
          <div className="mi-boards" data-testid="boards">{boards.map(m => <article key={m.id} className="mi-board" data-testid="board-card">
            <Link href={`/app/board/${m.id}`} className="mi-board-link"><Thumb store={store} id={m.id} /><h3>{m.title}</h3><p>{m.objectCount} object{m.objectCount === 1 ? "" : "s"} · edited {ago(m.updatedAt)}</p></Link>
            <div className="mi-board-actions"><button onClick={() => rename(m)}>Rename</button><button onClick={() => copy(m)}>Duplicate</button><button onClick={() => exportJson(m)}>Export</button><button onClick={() => remove(m)} className="danger">Delete</button></div>
          </article>)}</div>}
      </section>
    </main>
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
