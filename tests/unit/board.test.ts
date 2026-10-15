import { describe, it, expect } from "vitest";
import { describeScene } from "@/lib/canvas/scene";
import { TEMPLATES, boardFromTemplate, templateDoc } from "@/lib/canvas/templates";
import { newBoard, parseBoard, sanitizeDoc, serialize } from "@/lib/canvas/board";
import { LocalBoardStore, CloudBoardStore } from "@/lib/store";
import { MemoryRepo } from "@/lib/server/repo";
import { deleteBoard, getBoard, listBoards, putBoard } from "@/lib/server/boards-api";
import { addObjects, sticky } from "@/lib/canvas/doc";

const mem = () => { const m = new Map<string, string>(); return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), removeItem: (k: string) => void m.delete(k) }; };

describe("templates", () => {
  it("every template is internally consistent (connectors reference real objects)", () => {
    for (const t of TEMPLATES) {
      const d = templateDoc(t.id);
      expect(Object.keys(d.objects).sort()).toEqual([...d.order].sort());
      for (const o of Object.values(d.objects)) if (o.type === "connector") for (const e of [o.from, o.to]) if ("id" in e) expect(d.objects[e.id], `${t.id}:${o.id}`).toBeTruthy();
    }
    expect(templateDoc("welcome").order.length).toBeGreaterThan(10);
  });
});
describe("board envelope", () => {
  it("serialize → parse round-trips content with a fresh id", () => {
    const b = boardFromTemplate("flowchart"); const p = parseBoard(serialize(b));
    expect(p.doc).toEqual(b.doc); expect(p.title).toBe(b.title); expect(p.id).not.toBe(b.id);
  });
  it("rejects other files and sanitizes hostile content", () => {
    expect(() => parseBoard("{nope")).toThrow(/valid JSON/); expect(() => parseBoard('{"format":"other"}')).toThrow(/MiroIsDead/);
    const d = sanitizeDoc({ order: ["a", "b", "c"], objects: { a: { id: "a", type: "sticky", x: "1", w: 1e999, color: "red;background:url(x)", text: "ok", fontSize: 9999 }, b: { id: "b", type: "script" }, c: { id: "c", type: "connector", from: { id: "ghost" }, to: { x: 1, y: 2 } } } });
    expect(d.order).toEqual(["a", "c"]); const a: any = d.objects["a"]; expect(a.x).toBe(0); expect(a.color).toBe("#FFE86D"); expect(a.fontSize).toBeLessThanOrEqual(96); expect(Number.isFinite(a.w)).toBe(true);
    expect((d.objects["c"] as any).from).toEqual({ x: 0, y: 0 });
  });
});
describe("agent scene", () => {
  it("lists objects, frames and explicit connections", () => {
    const s = describeScene(boardFromTemplate("flowchart")); expect(s.format).toBe("miroisdead-canvas-context");
    expect(s.objects.find(o => o.id === "f-q")).toMatchObject({ kind: "shape", shape: "diamond", text: "Is it urgent?" });
    expect(s.connections).toHaveLength(6); expect(s.connections[2]).toMatchObject({ label: "yes", source: { objectId: "f-q" }, target: { objectId: "f-yes" } });
    expect(describeScene(boardFromTemplate("retro")).objects.find(o => o.id === "r-1")?.frame).toBe("r-f1");
  });
});
describe("stores", () => {
  it("LocalBoardStore saves, lists newest first, loads and removes", async () => {
    const s = new LocalBoardStore("u1", mem()); const a = { ...newBoard("A"), updatedAt: 1 }, b = { ...newBoard("B"), updatedAt: 2 };
    await s.save(a); await s.save(b); await s.save({ ...a, title: "A2", updatedAt: 3 });
    expect((await s.list()).map(m => m.title)).toEqual(["A2", "B"]); expect((await s.load(a.id))?.title).toBe("A2");
    await s.remove(a.id); expect(await s.load(a.id)).toBeNull(); expect(await s.list()).toHaveLength(1);
  });
  it("scopes are isolated", async () => { const kv = mem(); await new LocalBoardStore("u1", kv).save(newBoard("x")); expect(await new LocalBoardStore("u2", kv).list()).toEqual([]); });
  it("CloudBoardStore falls back to the device copy when the API is down, and keeps the copy when a sync fails", async () => {
    const cache = new LocalBoardStore("u1", mem()); const down = (async () => new Response("no", { status: 500 })) as typeof fetch;
    const s = new CloudBoardStore("/miroisdead", cache, down); const b = newBoard("Offline");
    await expect(s.save(b)).rejects.toThrow(/sync/); expect((await s.load(b.id))?.title).toBe("Offline"); expect((await s.list())).toHaveLength(1);
  });
});
describe("boards API logic", () => {
  it("isolates users, validates ids, caps size and sanitizes", async () => {
    const repo = new MemoryRepo(); const b = { ...newBoard("Mine", addObjects({ objects: {}, order: [] }, [sticky(1, 2, { id: "s1", text: "hi" })])), id: "board-abc1" };
    expect((await putBoard(repo, "alice", b.id, JSON.stringify(b))).status).toBe(200);
    expect(((await listBoards(repo, "alice")).body as any).boards).toHaveLength(1); expect(((await listBoards(repo, "bob")).body as any).boards).toHaveLength(0);
    expect((await getBoard(repo, "bob", b.id)).status).toBe(404); expect(((await getBoard(repo, "alice", b.id)).body as any).board.doc.objects.s1.text).toBe("hi");
    expect((await putBoard(repo, "alice", "../x", "{}")).status).toBe(400); expect((await putBoard(repo, "alice", b.id, JSON.stringify({ ...b, id: "other-id1" }))).status).toBe(400);
    expect((await putBoard(repo, "alice", b.id, "x".repeat(1_000_000))).status).toBe(413); expect((await putBoard(repo, "alice", b.id, "{bad")).status).toBe(400);
    expect((await deleteBoard(repo, "alice", b.id)).status).toBe(200); expect((await getBoard(repo, "alice", b.id)).status).toBe(404);
  });
});

describe("anyone-with-the-link access", () => {
  it("serves and accepts public reads/writes only as the owner's access setting allows", async () => {
    const { getPublicBoard, putPublicBoard } = await import("@/lib/server/boards-api");
    const repo = new MemoryRepo(); const b = { ...newBoard("Shared", addObjects({ objects: {}, order: [] }, [sticky(1, 2, { id: "s1", text: "hi" })])), id: "board-pub1" };
    await putBoard(repo, "alice", b.id, JSON.stringify(b));
    expect((await getPublicBoard(repo, b.id)).status).toBe(404); // private by default
    await putBoard(repo, "alice", b.id, JSON.stringify({ ...b, access: "view" }));
    const r = await getPublicBoard(repo, b.id); expect(r.status).toBe(200); expect((r.body as any).access).toBe("view");
    expect((await putPublicBoard(repo, b.id, JSON.stringify({ ...b, title: "Hacked" }))).status).toBe(404); // view links cannot write
    await putBoard(repo, "alice", b.id, JSON.stringify({ ...b, access: "edit" }));
    expect((await putPublicBoard(repo, b.id, JSON.stringify({ ...b, title: "Edited by guest", access: "none" }))).status).toBe(200);
    const after = await repo.get("alice", b.id); expect(after?.title).toBe("Edited by guest"); expect(after?.access).toBe("edit"); // guests cannot flip access off
    expect((await getPublicBoard(repo, "nope-0000")).status).toBe(404);
  });
});
