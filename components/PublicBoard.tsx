"use client";
// Anyone-with-the-link board: read-only viewer, or editable when the owner chose "Can edit".
import React, { useMemo } from "react";
import type { Board, BoardMeta } from "@/lib/canvas/types";
import type { BoardStore } from "@/lib/store";
import { sanitizeDoc } from "@/lib/canvas/board";
import { Editor } from "@/components/board/Editor";
import { BP } from "@/lib/basepath";

/** Saves through the public endpoint (only accepted when the board is shared as "Can edit"). */
class PublicBoardStore implements BoardStore {
  kind = "cloud" as const;
  constructor(private readOnly: boolean) {}
  async list(): Promise<BoardMeta[]> { return []; }
  async load(id: string): Promise<Board | null> { const r = await fetch(`${BP}/api/public/${id}`); if (!r.ok) return null; const b = (await r.json()).board as Board; return { ...b, doc: sanitizeDoc(b.doc) }; }
  async save(board: Board) { if (this.readOnly) return; const r = await fetch(`${BP}/api/public/${board.id}`, { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify(board) }); if (!r.ok) throw new Error("Could not sync"); }
  async remove() { /* guests cannot delete */ }
}
export function PublicBoardPage({ board, access, who, embed, startFrame, rtc = null, signedIn = false }: { board: Board; access: "view" | "edit"; who: string; embed: boolean; signedIn?: boolean; startFrame?: string; rtc?: import("@/lib/isdead-auth/config").FirebaseClientConfig | null }) {
  const store = useMemo(() => new PublicBoardStore(access === "view"), [access]);
  return <Editor initial={board} store={store} who={who} readOnly={access === "view"} guest visitorSignedIn={signedIn} embed={embed} startFrame={startFrame} rtc={rtc} />;
}
