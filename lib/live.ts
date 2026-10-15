// Live session channel: WebSocket relay (/api/live/{board}) when the host supports it, BroadcastChannel for tabs in the
// same browser, and nothing persisted. Messages are plain JSON; `from` identifies the sender so echoes are ignored.
export type Peer = { id: string; name: string; color: string };
export type LiveMsg =
  | { t: "hello"; from: Peer }
  | { t: "cursor"; from: Peer; x: number; y: number }
  | { t: "sel"; from: Peer; ids: string[] }
  | { t: "doc"; from: Peer; doc: unknown; rev: number }
  | { t: "leave"; id?: string; from?: Peer };
export const PEER_COLORS = ["#4262FF", "#DA3B01", "#0A7A3D", "#8A3FFC", "#D17A00", "#0E8F8F", "#C2185B", "#5C6BC0"];
export class LiveChannel {
  /** Optional peer-to-peer mesh (lib/rtc.ts); messages fan out to it too. */
  mesh: { send: (d: string) => void; on: (h: (d: string) => void) => () => void; close: () => void } | null = null;
  private ws: WebSocket | null = null; private bc: BroadcastChannel | null = null; private closed = false; private delay = 1000; private opened = false; private failures = 0;
  private handlers = new Set<(m: LiveMsg) => void>();
  constructor(private url: string, private key: string, public me: Peer) {
    try { this.bc = new BroadcastChannel(`mi-live-${key}`); this.bc.onmessage = e => this.recv(e.data); } catch { /* no BroadcastChannel */ }
    this.connect();
  }
  private connect() {
    if (this.closed || typeof WebSocket === "undefined") return;
    try {
      const ws = new WebSocket(this.url); this.ws = ws;
      ws.onopen = () => { this.delay = 1000; this.opened = true; this.failures = 0; this.send({ t: "hello", from: this.me }); };
      ws.onmessage = e => { try { this.recv(JSON.parse(e.data)); } catch { /* ignore */ } };
      ws.onclose = () => { this.ws = null; if (this.closed) return; if (!this.opened && ++this.failures >= 2) return; /* relay not available here (e.g. local dev): tabs still sync via BroadcastChannel */ setTimeout(() => this.connect(), this.delay); this.delay = Math.min(this.delay * 2, 30000); };
      ws.onerror = () => { try { ws.close(); } catch { /* ignore */ } };
    } catch { this.ws = null; }
  }
  private recv(m: LiveMsg) { if (!m || (m as { from?: Peer }).from?.id === this.me.id) return; for (const h of this.handlers) h(m); }
  on(h: (m: LiveMsg) => void) { this.handlers.add(h); return () => { this.handlers.delete(h); }; }
  send(m: LiveMsg) { const s = JSON.stringify(m); try { this.bc?.postMessage(m); } catch { /* ignore */ } if (this.ws?.readyState === 1) this.ws.send(s); this.mesh?.send(s); }
  attachMesh(mesh: NonNullable<LiveChannel["mesh"]>) { this.mesh = mesh; mesh.on(d => { try { this.recv(JSON.parse(d)); } catch { /* ignore */ } }); }
  get connected() { return this.ws?.readyState === 1; }
  close() { this.closed = true; this.send({ t: "leave", from: this.me }); this.ws?.close(); this.bc?.close(); this.mesh?.close(); }
}
