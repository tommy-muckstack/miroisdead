"use client";
// Share modal matched to Miro's Invite / Embed / Publish / AI tabs. Links work for anyone when the owner picks "Can view" or "Can edit".
import React, { useEffect, useState } from "react";
import type { BoardAccess, Doc } from "@/lib/canvas/types";
import { X } from "@/components/mxi";
import { BP } from "@/lib/basepath";
import { shareLink, canUseShareSheet } from "@/lib/share";
import { track, EVENTS } from "@/lib/analytics";
import { boardToSvg } from "./exportSvg";
import { Pop, Item } from "./Menus";

export type ShareTab = "Invite" | "Embed" | "Publish" | "AI";
type Props = { tab: ShareTab; setTab: (t: ShareTab) => void; onClose: () => void; who: string; doc: Doc; title: string; boardId: string; access: BoardAccess; setAccess: (a: BoardAccess) => void; canShare: boolean; onTemplate: () => void; onScene: () => void; flash: (m: string) => void };
const ACCESS_LABEL: Record<BoardAccess, string> = { none: "No access", view: "Can view", edit: "Can edit" };

export function ShareModal({ tab, setTab, onClose, who, doc, title, boardId, access, setAccess, canShare, onTemplate, onScene, flash }: Props) {
  useEffect(() => { const f = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); }; window.addEventListener("keydown", f); return () => window.removeEventListener("keydown", f); }, [onClose]);
  const [accMenu, setAccMenu] = useState(false), [linkMenu, setLinkMenu] = useState(false), [start, setStart] = useState<"board" | "frame">("board"), [viewOnly, setViewOnly] = useState(true), [codeOpen, setCodeOpen] = useState(false), [invite, setInvite] = useState("");
  const origin = typeof location !== "undefined" ? location.origin : "";
  const base = typeof location !== "undefined" ? location.pathname.replace(/\/app\/board\/.*$/, "") : "";
  const publicUrl = `${origin}${base}/b/${boardId}`;
  const link = access === "none" ? (typeof location !== "undefined" ? location.href : "") : publicUrl;
  const copy = (text: string, msg: string) => navigator.clipboard?.writeText(text).then(() => flash(msg), () => flash("Couldn't copy"));
  // Hand the link to a person: OS share sheet where there is one (mobile, Safari, Edge), clipboard elsewhere.
  const send = async (via: "invite_form" | "copy_button", to?: string) => {
    const r = await shareLink({ title: `${title || "Untitled"} · MiroIsDead`, text: access === "none" ? `Join me on MiroIsDead: ${title || "Untitled"}` : `${to ? to + ", you're" : "You're"} invited to "${title || "Untitled"}" on MiroIsDead (${access === "edit" ? "can edit" : "can view"})`, url: link });
    track(EVENTS.app_shared, { object: "board", method: r === "shared" ? "share_sheet" : "clipboard", via, access, result: r });
    if (r === "shared") flash("Shared"); else if (r === "copied") flash(access === "none" ? "Board link copied (only you can open it until link access is on)" : "Team invite link copied. Send it to them; no email leaves MiroIsDead."); else if (r === "failed") flash("Couldn't share or copy");
    if (r !== "dismissed" && via === "invite_form") setInvite("");
  };
  const embedSrc = `${publicUrl}?embed=1${start === "frame" ? "&frame=1" : ""}${viewOnly ? "" : "&edit=1"}`;
  const code = `<iframe width="768" height="432" src="${embedSrc}" frameborder="0" scrolling="no" allow="fullscreen; clipboard-read; clipboard-write" allowfullscreen></iframe>`;
  const [thumb, setThumb] = useState(""); useEffect(() => { setThumb(boardToSvg(doc, { maxW: 480, pad: 30, background: "#F2F2F2" })); }, [doc]);
  const firstFrame = doc.order.map(i => doc.objects[i]).find(o => o.type === "frame");
  const pick = (a: BoardAccess) => { setAccMenu(false); if (!canShare && a !== "none") { flash("Sign in to share this board by link"); return; } setAccess(a); flash(a === "none" ? "Link access turned off" : a === "view" ? "Anyone with the link can view" : "Anyone with the link can edit"); };
  return <div className="mb-scrim" data-ui onMouseDown={e => { if (e.target === e.currentTarget) onClose(); }}>
    <div className="mb-share" role="dialog" aria-label="Share board" data-testid="share-modal">
      <div className="mb-tabs" role="tablist">{(["Invite", "Embed", "Publish", "AI"] as const).map(t => <button key={t} role="tab" aria-selected={tab === t} className={tab === t ? "on" : ""} onClick={() => setTab(t)}>{t}{t === "AI" && <span className="mb-aiic"><i className="a" /><i className="b" /><i className="c" /><em>+</em></span>}</button>)}</div>
      {tab === "Invite" && <>
        <form className="mb-mail" onSubmit={e => { e.preventDefault(); const v = invite.trim(); if (!v) return; void send("invite_form", v); }}>{X.invite}<input autoFocus placeholder="" value={invite} onChange={e => setInvite(e.target.value)} aria-label="Invite by email" />{!invite && <span className="mb-mail-ph" aria-hidden="true">Enter emails or invite from the team,{" "}<u>Slack</u>,{" "}<u>Google</u>{" "}or{" "}<u>Microsoft</u></span>}</form>
        <div className="mb-linkrow">{X.link}<span className="url">{link}</span>
          <span className="mi-menuwrap"><button className="mb-can" aria-haspopup="menu" aria-expanded={linkMenu} onClick={() => setLinkMenu(m => !m)}>{access === "none" ? "Can edit" : ACCESS_LABEL[access]} {X.chev}</button>
            {linkMenu && <Pop className="mb-accpop" onClose={() => setLinkMenu(false)}><Item label="Can edit" on={access === "edit" || access === "none"} onClick={() => { setLinkMenu(false); if (access !== "none") pick("edit"); }} /><Item label="Can view" on={access === "view"} onClick={() => { setLinkMenu(false); if (access !== "none") pick("view"); }} /></Pop>}</span>
          <button className="mb-copy" onClick={() => void send("copy_button")}>{canUseShareSheet() ? "Share team invite link" : "Copy team invite link"}</button></div>
        <div className="mb-acc">Board access</div>
        <div className="mb-who"><span className="mb-avs"><i>{(who[0] ?? "T").toUpperCase()}</i></span><span className="mb-who-t">You haven’t invited anyone to your team yet</span><a className="mb-manage" href="#" onClick={e => { e.preventDefault(); copy(link, "Team invite link copied"); }}>Invite</a></div>
        <div className="mb-any">{X.globe}<span>Anyone with the link</span>
          <span className="mi-menuwrap"><button aria-haspopup="menu" aria-expanded={accMenu} onClick={() => setAccMenu(m => !m)} data-testid="link-access">{ACCESS_LABEL[access]} {X.chev}</button>
            {accMenu && <Pop className="mb-accpop right" onClose={() => setAccMenu(false)}>{(["none", "view", "edit"] as BoardAccess[]).map(a => <Item key={a} label={ACCESS_LABEL[a]} on={access === a} onClick={() => pick(a)} />)}</Pop>}</span></div>
        {!canShare && <p className="mb-signin">{X.lock} This board lives in this browser. <a href={`${BP}/login?callbackUrl=${encodeURIComponent(location.pathname)}`}>Sign in</a> to sync it and share it by link.</p>}
      </>}
      {tab === "Embed" && <>
        {access === "none" ? <div className="mb-notice">{X.lock}<p><b>This board is private.</b> Only you can see it. Change who can see it in the <a href="#" onClick={e => { e.preventDefault(); setTab("Invite"); }}>invite section</a>.</p></div>
          : <div className="mb-notice ok">{X.globe}<p><b>Anyone with the link can {access}.</b> The embed below works wherever you paste it.</p></div>}
        <div className="mb-embedrow"><span>Start view:</span><span className="mb-startview"><button className={start === "board" ? "on" : ""} onClick={() => setStart("board")}>{X.board} Board</button><button className={start === "frame" ? "on" : ""} disabled={!firstFrame} title={firstFrame ? "First frame" : "Add a frame to start from it"} onClick={() => setStart("frame")}>{X.frame} First frame</button></span><label className="mb-viewonly"><input type="checkbox" checked={viewOnly} onChange={e => setViewOnly(e.target.checked)} /> View only</label></div>
        <div className="mb-preview" dangerouslySetInnerHTML={{ __html: thumb }} />
        <button className="mb-codehead" onClick={() => setCodeOpen(o => !o)}>{X.code} <b>Embed code</b> {codeOpen ? X.chevUp : X.chev}<span className="r">{X.help}</span></button>
        {codeOpen && <textarea className="mb-code" readOnly value={code} onFocus={e => e.target.select()} />}
        <div className="mb-exp"><button className="mb-copy mb-copybig" onClick={() => copy(code, "Embed code copied")}>{X.code} Copy code</button><button className="mb-ghostbtn" onClick={() => copy(embedSrc, "Embed link copied")}>{X.link} Copy link</button></div>
      </>}
      {tab === "Publish" && <>
        <div className="mb-pubcard"><span className="ic">{X.verse}</span><div><b>Community template</b><p>Publish as a community template and give everyone access to your ideas. MiroIsDead is open source: templates ship with the app.</p></div><a className="mb-copy" href="https://github.com/tommy-muckstack/miroisdead/issues/new?title=Template%20proposal" target="_blank" rel="noreferrer">Publish template</a></div>
        <div className="mb-pubcard"><span className="ic">{X.tplS}</span><div><b>Custom template</b><p>Save this board as a custom template and reuse it from Create ▸ Explore templates.</p></div><button className="mb-copy" onClick={() => { onTemplate(); onClose(); }}>Save template</button></div>
      </>}
      {tab === "AI" && <div className="mb-pubcard"><span className="ic">{X.ai}</span><div><b>Bring your own AI</b><p>Copy the board as plain scene JSON and paste it into any assistant (Claude, ChatGPT, Gemini…). Nothing is sent anywhere by MiroIsDead.</p></div><button className="mb-copy" onClick={() => { onScene(); onClose(); }}>Copy scene JSON</button></div>}
    </div>
  </div>;
}
