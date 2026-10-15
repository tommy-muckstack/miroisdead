// Peer-to-peer live session: a WebRTC data-channel mesh between everyone on a board. Firestore carries only the
// signalling (presence doc per peer + a few offer/answer/ICE docs per pair), which stays inside the free tier;
// cursors, presence and document updates then flow directly between browsers at no server cost.
import type { FirebaseClientConfig } from "@/lib/isdead-auth/config";
import type { Peer } from "@/lib/live";

const STUN = [{ urls: ["stun:stun.l.google.com:19302", "stun:stun1.l.google.com:19302"] }];
type FS = typeof import("firebase/firestore");

export class RtcMesh {
  private pcs = new Map<string, RTCPeerConnection>(); private chans = new Map<string, RTCDataChannel>();
  private unsub: (() => void)[] = []; private beat: ReturnType<typeof setInterval> | null = null; private closed = false;
  private handlers = new Set<(data: string) => void>();
  constructor(private board: string, private me: Peer) {}
  on(h: (data: string) => void) { this.handlers.add(h); return () => { this.handlers.delete(h); }; }
  send(data: string) { for (const c of this.chans.values()) if (c.readyState === "open") { try { c.send(data); } catch { /* ignore */ } } }
  get peerCount() { return [...this.chans.values()].filter(c => c.readyState === "open").length; }

  /** Signs the browser into Firebase with a server-minted token and starts signalling. Returns false when live is unavailable. */
  async start(config: FirebaseClientConfig, tokenUrl: string): Promise<boolean> {
    try {
      const r = await fetch(tokenUrl, { method: "POST" }); if (!r.ok) return false; const { token } = await r.json();
      const { initializeApp, getApps } = await import("firebase/app"); const { getAuth, signInWithCustomToken, inMemoryPersistence, setPersistence } = await import("firebase/auth");
      const app = getApps().find(a => a.name === "isdead") ?? initializeApp(config, "isdead"); const auth = getAuth(app); await setPersistence(auth, inMemoryPersistence); await signInWithCustomToken(auth, token);
      const fs: FS = await import("firebase/firestore"); const db = fs.getFirestore(app);
      const peers = fs.collection(db, "miroisdead_live", this.board, "peers"), signals = fs.collection(db, "miroisdead_live", this.board, "signals");
      const mine = fs.doc(peers, this.me.id);
      const heartbeat = () => fs.setDoc(mine, { name: this.me.name, color: this.me.color, at: Date.now() }).catch(() => {});
      await heartbeat(); this.beat = setInterval(heartbeat, 20000);
      this.unsub.push(fs.onSnapshot(fs.query(peers, fs.where("at", ">", Date.now() - 60000)), snap => {
        for (const d of snap.docs) { const id = d.id; if (id === this.me.id || this.pcs.has(id)) continue; const stale = Date.now() - (d.data().at ?? 0) > 60000; if (stale) continue; if (this.me.id > id) void this.offer(id, fs, signals); }
        for (const ch of snap.docChanges()) if (ch.type === "removed") this.drop(ch.doc.id);
      }, () => {}));
      this.unsub.push(fs.onSnapshot(fs.query(signals, fs.where("to", "==", this.me.id)), snap => {
        for (const ch of snap.docChanges()) { if (ch.type !== "added") continue; const s = ch.doc.data() as { from: string; type: string; payload: string }; void this.handleSignal(s, fs, signals).finally(() => fs.deleteDoc(ch.doc.ref).catch(() => {})); }
      }, () => {}));
      window.addEventListener("pagehide", () => { fs.deleteDoc(mine).catch(() => {}); }, { once: true });
      this.unsub.push(() => fs.deleteDoc(mine).catch(() => {}));
      return true;
    } catch { return false; }
  }
  private pc(id: string, fs: FS, signals: ReturnType<FS["collection"]>) {
    let pc = this.pcs.get(id); if (pc) return pc;
    pc = new RTCPeerConnection({ iceServers: STUN }); this.pcs.set(id, pc);
    pc.onicecandidate = e => { if (e.candidate) fs.addDoc(signals, { from: this.me.id, to: id, type: "ice", payload: JSON.stringify(e.candidate), at: Date.now() }).catch(() => {}); };
    pc.ondatachannel = e => this.wire(id, e.channel);
    pc.onconnectionstatechange = () => { if (pc!.connectionState === "failed" || pc!.connectionState === "closed") this.drop(id); };
    return pc;
  }
  private wire(id: string, c: RTCDataChannel) { this.chans.set(id, c); c.onmessage = e => { for (const h of this.handlers) h(e.data); }; c.onclose = () => this.chans.delete(id); }
  private async offer(id: string, fs: FS, signals: ReturnType<FS["collection"]>) {
    const pc = this.pc(id, fs, signals); this.wire(id, pc.createDataChannel("mi", { ordered: true }));
    const offer = await pc.createOffer(); await pc.setLocalDescription(offer);
    await fs.addDoc(signals, { from: this.me.id, to: id, type: "offer", payload: JSON.stringify(offer), at: Date.now() });
  }
  private async handleSignal(s: { from: string; type: string; payload: string }, fs: FS, signals: ReturnType<FS["collection"]>) {
    const pc = this.pc(s.from, fs, signals); const p = JSON.parse(s.payload);
    if (s.type === "offer") { await pc.setRemoteDescription(p); const ans = await pc.createAnswer(); await pc.setLocalDescription(ans); await fs.addDoc(signals, { from: this.me.id, to: s.from, type: "answer", payload: JSON.stringify(ans), at: Date.now() }); }
    else if (s.type === "answer") { if (pc.signalingState === "have-local-offer") await pc.setRemoteDescription(p); }
    else if (s.type === "ice") { try { await pc.addIceCandidate(p); } catch { /* candidate before description */ } }
  }
  private drop(id: string) { this.chans.get(id)?.close(); this.chans.delete(id); this.pcs.get(id)?.close(); this.pcs.delete(id); }
  close() { this.closed = true; if (this.beat) clearInterval(this.beat); for (const u of this.unsub) u(); for (const id of [...this.pcs.keys()]) this.drop(id); }
}
