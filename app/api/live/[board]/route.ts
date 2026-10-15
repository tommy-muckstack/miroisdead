import { NextRequest } from "next/server";
import { upgradeWebSocket } from "@vercel/functions";
import type { WebSocket } from "ws";
export const runtime = "nodejs";
export const maxDuration = 300;
/**
 * Live relay for a board (cursors, presence, document updates). Rooms live in this function instance's memory only:
 * nothing is stored, nothing is billed beyond the function itself, and a session ends when the socket closes.
 * Fluid Compute keeps concurrent connections on warm instances, so collaborators normally share one room; the client
 * also mirrors every message over BroadcastChannel for tabs in the same browser and re-syncs through the saved board.
 */
const rooms = new Map<string, Set<WebSocket>>();
const ID = /^[A-Za-z0-9_-]{4,64}$/;
export async function GET(req: NextRequest, { params }: { params: Promise<{ board: string }> }) {
  const { board } = await params;
  if (!ID.test(board)) return new Response("Bad board id", { status: 400 });
  // Capability probe: a plain GET (no Upgrade header) says whether this runtime can upgrade sockets at all, so the
  // client never opens a WebSocket that is bound to fail (a failed WebSocket always logs a console error).
  if (req.headers.get("upgrade")?.toLowerCase() !== "websocket") {
    // Same lookup @vercel/functions' getContext() does (it is not exported from the package index).
    const ctx = (globalThis as unknown as Record<symbol, { get?: () => { upgradeWebSocket?: unknown } } | undefined>)[Symbol.for("@vercel/request-context")]?.get?.();
    const websocket = typeof ctx?.upgradeWebSocket === "function";
    return Response.json({ websocket, fallback: "webrtc-mesh+broadcastchannel" }, { headers: { "cache-control": "no-store" } });
  }
  try {
    return await upgradeWebSocket(ws => {
      const room = rooms.get(board) ?? new Set<WebSocket>(); rooms.set(board, room); room.add(ws);
      const relay = (data: string) => { for (const peer of room) if (peer !== ws && peer.readyState === 1) peer.send(data); };
      ws.on("message", (data: unknown) => { const s = typeof data === "string" ? data : String(data); if (s.length <= 2_000_000) relay(s); });
      const bye = () => { room.delete(ws); if (!room.size) rooms.delete(board); relay(JSON.stringify({ t: "leave", id: (ws as unknown as { miId?: string }).miId })); };
      ws.on("close", bye); ws.on("error", bye);
    }, { maxPayload: 2_000_000 });
  } catch {
    return new Response("WebSocket upgrade is only available on the Vercel runtime; tabs still sync through BroadcastChannel.", { status: 501 });
  }
}
