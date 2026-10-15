import { describe, it, expect } from "vitest";
import { routeElbow, routeConnector, roundedPath, resolveConnector } from "@/lib/canvas/connectors";
import { snapBox, simplify, normBox, unionBox, sideToward, distToPolyline } from "@/lib/canvas/geometry";
import { addObjects, align, bringToFront, cloneObjects, connector, createConnected, distribute, frame, frameAround, frameChildren, makeDoc, moveObjects, pasteObjects, pen, removeObjects, renderOrder, resizeObject, shape, sticky, textObj, updateObjects, withFrameChildren } from "@/lib/canvas/doc";
import { hitTest, marquee } from "@/lib/canvas/hit";
import { fitFontSize, wrapText } from "@/lib/canvas/text";
import { checkpoint, commit, createHistory, dropCheckpoint, redo, replace, undo } from "@/lib/canvas/history";
import { fitView, screenToWorld, worldToScreen, zoomAt, MAX_ZOOM } from "@/lib/canvas/viewport";
import type { Pt } from "@/lib/canvas/types";

const approx = (text: string, size: number) => text.length * size * 0.56;
const orthogonal = (pts: Pt[]) => pts.every((p, i) => i === 0 || Math.abs(p.x - pts[i - 1].x) < 0.01 || Math.abs(p.y - pts[i - 1].y) < 0.01);

describe("elbow routing", () => {
  it("is always orthogonal, for every pair of sides", () => {
    const sides = ["n", "e", "s", "w"] as const;
    for (const sa of sides) for (const sb of sides) for (const b of [{ x: 300, y: 200 }, { x: -300, y: 200 }, { x: 300, y: -200 }, { x: 5, y: 5 }, { x: 0, y: 0 }]) {
      const pts = routeElbow({ x: 0, y: 0 }, sa, b, sb);
      expect(orthogonal(pts), `${sa}->${sb} ${JSON.stringify(b)}`).toBe(true);
      expect(pts[0]).toEqual({ x: 0, y: 0 }); expect(pts[pts.length - 1]).toEqual(b);
    }
  });
  it("makes a single-bend L for e → n when the target is down-right", () => {
    expect(routeElbow({ x: 0, y: 0 }, "e", { x: 200, y: 100 }, "n")).toEqual([{ x: 0, y: 0 }, { x: 200, y: 0 }, { x: 200, y: 100 }]);
  });
  it("rounds corners with quadratic arcs", () => { expect(roundedPath([{ x: 0, y: 0 }, { x: 100, y: 0 }, { x: 100, y: 100 }], 10)).toBe("M0 0L90 0Q100 0 100 10L100 100"); });
  it("reroutes live when a bound object moves", () => {
    const a = shape(0, 0, { id: "a" }), b = shape(400, 0, { id: "b" });
    const c = connector({ id: "a", side: "e" }, { id: "b", side: "w" }, { id: "c" });
    let doc = makeDoc([a, b, c]);
    const before = routeConnector(doc, c).points;
    doc = moveObjects(doc, ["b"], 0, 300);
    const after = routeConnector(doc, doc.objects["c"] as typeof c).points;
    expect(after).not.toEqual(before); expect(orthogonal(after)).toBe(true);
    expect(after[after.length - 1]).toEqual({ x: 400, y: 355 });
  });
  it("auto side picks the facing side", () => {
    const a = shape(0, 0, { id: "a" }), b = shape(0, 400, { id: "b" });
    const r = resolveConnector(makeDoc([a, b]), connector({ id: "a" }, { id: "b" }));
    expect(r.sa).toBe("s"); expect(r.sb).toBe("n");
  });
  it("straight and curve styles end on the anchors", () => {
    const doc = makeDoc([shape(0, 0, { id: "a" }), shape(400, 0, { id: "b" })]);
    for (const style of ["straight", "curve"] as const) { const r = routeConnector(doc, connector({ id: "a" }, { id: "b" }, { style })); expect(r.points[0]).toEqual({ x: 160, y: 55 }); expect(r.points.at(-1)).toEqual({ x: 400, y: 55 }); }
  });
});

describe("geometry", () => {
  it("snaps edges and centres within the threshold and reports guides", () => {
    const r = snapBox({ x: 103, y: 0, w: 50, h: 50 }, [{ x: 100, y: 200, w: 80, h: 80 }], 6);
    expect(r.dx).toBe(-3); expect(r.guides[0]).toMatchObject({ axis: "x", at: 100 });
    expect(snapBox({ x: 120, y: 0, w: 50, h: 50 }, [{ x: 100, y: 200, w: 80, h: 80 }], 3).dx).toBe(0);
  });
  it("simplifies a noisy straight stroke to its endpoints", () => {
    const pts = Array.from({ length: 50 }, (_, i) => ({ x: i * 4, y: Math.sin(i) * 0.4 }));
    expect(simplify(pts, 1)).toHaveLength(2);
  });
  it("box helpers", () => {
    expect(normBox({ x: 10, y: 10 }, { x: 0, y: 30 })).toEqual({ x: 0, y: 10, w: 10, h: 20 });
    expect(unionBox([{ x: 0, y: 0, w: 10, h: 10 }, { x: 20, y: 20, w: 5, h: 5 }])).toEqual({ x: 0, y: 0, w: 25, h: 25 });
    expect(sideToward({ x: 0, y: 0, w: 100, h: 100 }, { x: 500, y: 20 })).toBe("e");
    expect(distToPolyline({ x: 5, y: 5 }, [{ x: 0, y: 0 }, { x: 10, y: 0 }])).toBe(5);
  });
});

describe("document operations", () => {
  const base = () => makeDoc([sticky(0, 0, { id: "s1" }), sticky(300, 0, { id: "s2" }), sticky(700, 40, { id: "s3" }), connector({ id: "s1" }, { id: "s2" }, { id: "k" })]);
  it("is immutable", () => { const d = base(); const frozen = JSON.stringify(d); moveObjects(d, ["s1"], 5, 5); removeObjects(d, ["s1"]); updateObjects(d, ["s1"], { text: "x" }); expect(JSON.stringify(d)).toBe(frozen); });
  it("removing an object detaches its connectors at the last position instead of deleting them", () => {
    const d = removeObjects(base(), ["s2"]);
    expect(d.order).toEqual(["s1", "s3", "k"]);
    const k = d.objects["k"] as ReturnType<typeof connector>;
    expect(k.to).toEqual({ x: 300, y: 90 }); expect("id" in k.from).toBe(true);
  });
  it("moving a free connector shifts its free ends only", () => {
    const d = makeDoc([connector({ x: 0, y: 0 }, { x: 10, y: 10 }, { id: "k" })]);
    expect((moveObjects(d, ["k"], 5, 7).objects["k"] as any).to).toEqual({ x: 15, y: 17 });
  });
  it("aligns left/middle and distributes evenly", () => {
    const d = makeDoc([sticky(0, 0, { id: "a" }), sticky(300, 50, { id: "b" }), sticky(500, 200, { id: "c" }), sticky(1000, 10, { id: "d" })]);
    expect((align(d, ["a", "b", "c"], "left").objects["c"] as any).x).toBe(0);
    expect((align(d, ["a", "b"], "bottom").objects["a"] as any).y).toBe(50);
    const e = distribute(d, ["a", "b", "c", "d"], "h"); const xs = ["a", "b", "c", "d"].map(i => (e.objects[i] as any).x);
    const gaps = [xs[1] - xs[0] - 180, xs[2] - xs[1] - 180, xs[3] - xs[2] - 180]; expect(gaps.every(g => Math.abs(g - gaps[0]) < 1e-9)).toBe(true);
  });
  it("frames: wrap, contents move with the frame, frames render behind", () => {
    let d = base(); const f = frameAround(d, ["s1", "s2"], "Group")!; d = f.doc;
    expect(frameChildren(d, f.id).sort()).toEqual(["s1", "s2"]);
    expect(withFrameChildren(d, [f.id]).sort()).toEqual([f.id, "s1", "s2"].sort());
    expect(renderOrder(d)[0]).toBe(f.id);
    expect(bringToFront(d, [f.id]).order.at(-1)).toBe(f.id); expect(renderOrder(bringToFront(d, [f.id]))[0]).toBe(f.id);
  });
  it("clone/paste remaps connector ends and drops half-selected connectors", () => {
    const d = base();
    const both = cloneObjects(d, ["s1", "s2", "k"]); const k = both.objs.find(o => o.type === "connector") as any;
    expect(both.objs).toHaveLength(3); expect(k.from.id).not.toBe("s1"); expect(both.ids).toContain(k.from.id);
    expect(cloneObjects(d, ["s1", "k"]).objs.some(o => o.type === "connector")).toBe(false);
    const p = pasteObjects(d, both.objs, 10, 10); expect(p.doc.order).toHaveLength(d.order.length + 3);
  });
  it("quick-create makes a connected clone beside the source", () => {
    const r = createConnected(makeDoc([shape(0, 0, { id: "a", shape: "ellipse", fill: "#E5E2FF" })]), "a", "e")!;
    const n = r.doc.objects[r.id] as any; expect(n.shape).toBe("ellipse"); expect(n.x).toBe(250); expect(n.text).toBe("");
    const c = r.doc.objects[r.connId] as any; expect(c.from).toEqual({ id: "a", side: "e" }); expect(c.to).toEqual({ id: r.id, side: "w" });
  });
  it("resizing scales pen points and enforces a minimum", () => {
    const p = pen([{ x: 0, y: 0 }, { x: 100, y: 50 }]); const d = resizeObject(makeDoc([p]), p.id, { x: 0, y: 0, w: 200, h: 100 });
    expect((d.objects[p.id] as any).points[1]).toEqual({ x: 200, y: 100 });
    expect((resizeObject(makeDoc([sticky(0, 0, { id: "s" })]), "s", { x: 0, y: 0, w: 2, h: 2 }).objects["s"] as any).w).toBe(24);
  });
});

describe("hit testing and marquee", () => {
  const d = makeDoc([frame(-50, -50, 600, 400, "F", { id: "f" }), sticky(0, 0, { id: "s" }), shape(300, 0, { id: "sh", filled: false }), connector({ id: "s" }, { id: "sh" }, { id: "k" }), pen([{ x: 0, y: 300 }, { x: 200, y: 300 }], "#000", 4, { id: "p" })]);
  it("picks topmost, hits unfilled shapes inside, ignores a frame's interior", () => {
    expect(hitTest(d, { x: 90, y: 90 }, 6)).toBe("s");
    expect(hitTest(d, { x: 380, y: 50 }, 6)).toBe("sh");
    expect(hitTest(d, { x: 250, y: 250 }, 6)).toBe(null);
    expect(hitTest(d, { x: -50, y: 100 }, 6)).toBe("f");
    expect(hitTest(d, { x: -40, y: -60 }, 6)).toBe("f"); // title tab
    expect(hitTest(d, { x: 100, y: 302 }, 6)).toBe("p");
    expect(hitTest(d, { x: 235, y: 55 }, 6)).toBe("k");
  });
  it("marquee takes intersecting objects, frames only when enclosed", () => {
    expect(marquee(d, { x: -10, y: -10, w: 100, h: 100 })).toEqual(["s"]);
    expect(marquee(d, { x: -100, y: -100, w: 800, h: 600 })).toContain("f");
  });
});

describe("text fitting", () => {
  it("wraps words, breaks overlong words and honours newlines", () => {
    expect(wrapText("aaa bbb ccc", 20, 10, approx)).toEqual(["aaa", "bbb", "ccc"]);
    expect(wrapText("a\n\nb", 100, 10, approx)).toEqual(["a", "", "b"]);
    expect(wrapText("x".repeat(40), 56, 10, approx).every(l => l.length <= 10)).toBe(true);
  });
  it("auto size shrinks as text grows but never below 10", () => {
    const short = fitFontSize("Hi", 180, 180, approx), long = fitFontSize("lorem ipsum dolor sit amet ".repeat(16), 180, 180, approx), huge = fitFontSize("word ".repeat(2000), 180, 180, approx);
    expect(short).toBe(28); expect(long).toBeLessThan(short); expect(huge).toBe(10);
  });
});

describe("history", () => {
  it("undo/redo, gesture checkpoints and a no-op gesture dropping its step", () => {
    let h = createHistory(1); h = commit(h, 2); h = commit(h, 3);
    expect(undo(h).present).toBe(2); expect(redo(undo(h)).present).toBe(3); expect(undo(undo(undo(h))).present).toBe(1);
    h = checkpoint(h); h = replace(h, 4); h = replace(h, 5); expect(undo(h).present).toBe(3); // whole drag = one step
    expect(commit(undo(h), 9).future).toEqual([]);
    const g = dropCheckpoint(checkpoint(createHistory(1))); expect(g.past).toEqual([]);
  });
});

describe("viewport", () => {
  const s = { w: 1000, h: 600 };
  it("round-trips screen/world and keeps the cursor point fixed while zooming", () => {
    const v = { x: 120, y: -40, zoom: 1.5 }, p = { x: 321, y: 77 };
    const w = screenToWorld(v, s, p); const back = worldToScreen(v, s, w); expect(back.x).toBeCloseTo(p.x); expect(back.y).toBeCloseTo(p.y);
    const z = zoomAt(v, s, p, 3); const w2 = screenToWorld(z, s, p); expect(w2.x).toBeCloseTo(w.x); expect(w2.y).toBeCloseTo(w.y);
    expect(zoomAt(v, s, p, 999).zoom).toBe(MAX_ZOOM);
  });
  it("fit never zooms past 100%", () => { expect(fitView({ x: 0, y: 0, w: 100, h: 100 }, s).zoom).toBe(1); expect(fitView({ x: 0, y: 0, w: 5000, h: 100 }, s).zoom).toBeLessThan(0.25); });
});
