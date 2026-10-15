"use client";
// Stickers, Emoji and GIFs panel (Miro's "Stickers" tool). Emoji are inserted as large text objects; no third-party GIF API (cost).
import React, { useState } from "react";
import { Pop } from "./Menus";
import { X } from "@/components/mxi";
const SETS: Record<string, string[]> = {
  "Reactions": ["👍", "👎", "❤️", "🔥", "🎉", "👏", "💯", "✅", "❌", "⭐", "💡", "❓", "⚠️", "🚀", "🙌", "👀", "🤔", "😀", "😍", "😅", "🥳", "😎", "🤯", "😴"],
  "Objects": ["📌", "📎", "📝", "📅", "⏰", "📊", "📈", "📉", "🗂️", "🧭", "🎯", "🧩", "🔑", "🔒", "🛠️", "⚙️", "💰", "📣", "🏁", "🏆", "🎨", "🧪", "🧠", "💬"],
  "Arrows & marks": ["➡️", "⬅️", "⬆️", "⬇️", "↩️", "↪️", "🔄", "➕", "➖", "✖️", "➗", "🔴", "🟠", "🟡", "🟢", "🔵", "🟣", "⚫", "⚪", "🟥", "🟦", "🟩", "🟨", "🟧"],
  "People & teams": ["🧑‍💻", "👩‍🎨", "👨‍🔧", "🧑‍🚀", "👩‍⚕️", "🧑‍🏫", "👥", "🤝", "🗣️", "🧑‍🤝‍🧑", "🏃", "🧘", "🙋", "💁", "🙅", "🙆"],
};
export function StickerPanel({ onPick, onClose, top }: { onPick: (emoji: string) => void; onClose: () => void; top: number }) {
  const [q, setQ] = useState("");
  const all = Object.entries(SETS);
  return <Pop className="mm-tools mm-stickers" style={{ top }} onClose={onClose} role="dialog" testid="sticker-panel">
    <label className="mm-search">{X.search}<input autoFocus placeholder="Search stickers and emoji…" value={q} onChange={e => setQ(e.target.value)} /></label>
    <div className="mm-tabs"><button className="on">Emoji</button><button onClick={() => onPick("")}>GIFs</button><button onClick={() => onPick("")}>Stickers</button></div>
    {all.map(([name, list]) => { const l = q ? list.filter(() => name.toLowerCase().includes(q.toLowerCase())) : list; return l.length ? <section key={name}><h4>{name}</h4><div className="mm-emojigrid">{l.map(e => <button key={e} type="button" onClick={() => onPick(e)} aria-label={`Insert ${e}`}>{e}</button>)}</div></section> : null; })}
    <p className="mm-none">GIF search needs a third-party API (not free); paste a GIF or drop an image on the board instead.</p>
  </Pop>;
}
