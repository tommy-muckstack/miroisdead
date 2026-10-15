// Starter boards. Ids are fixed so connectors can reference stickies and shapes.
import type { Board, Doc, Obj } from "./types";
import { addObjects, connector, frame, makeDoc, pen, shape, sticky, textObj } from "./doc";
import { newBoard } from "./board";

const C = { yellow: "#FFE86D", peach: "#FFC9A3", pink: "#FFB8C6", lilac: "#D9D2FF", blue: "#BCD4FF", aqua: "#B5EEEA", green: "#C3F4D6", gray: "#E4E6EC" };
const S = (id: string, x: number, y: number, text: string, color: string, p = {}) => sticky(x, y, { id, text, color, ...p });
const Sh = (id: string, x: number, y: number, text: string, kind: "rect" | "round" | "ellipse" | "diamond", fill: string, p = {}) => shape(x, y, { id, text, shape: kind, fill, ...p });

export type TemplateId = "blank" | "welcome" | "brainstorm" | "flowchart" | "retro" | "roadmap";
export const TEMPLATES: { id: TemplateId; name: string; blurb: string }[] = [
  { id: "blank", name: "Blank board", blurb: "An empty infinite canvas." },
  { id: "welcome", name: "Welcome tour", blurb: "Every tool in one board, with the shortcuts." },
  { id: "brainstorm", name: "Brainstorm", blurb: "A prompt, clusters of stickies and a vote area." },
  { id: "flowchart", name: "Flowchart", blurb: "Shapes joined by rounded, rerouting connectors." },
  { id: "retro", name: "Retrospective", blurb: "Went well, to improve, actions: three frames." },
  { id: "roadmap", name: "Quarterly roadmap", blurb: "Now, next, later lanes with themed stickies." },
];

export function templateDoc(id: TemplateId): Doc {
  switch (id) {
    case "blank": return makeDoc([]);
    case "welcome": return makeDoc([
      frame(-520, -300, 1120, 620, "Welcome to MiroIsDead", { id: "w-frame" }),
      textObj(-480, -250, { id: "w-title", text: "Think together on an endless canvas", fontSize: 34, bold: true, w: 700, h: 50 }),
      S("w-1", -480, -170, "Press N, click, and type: that's a sticky note", C.yellow),
      S("w-2", -270, -170, "Select it, then drag a blue dot to add a connected one", C.aqua),
      S("w-3", -60, -170, "Drag empty space to box-select. Hold Shift to add", C.pink),
      S("w-4", 150, -170, "Space + drag (or H) pans. Scroll or pinch to zoom", C.lilac),
      Sh("w-a", -480, 60, "Idea", "round", "#E5E2FF"), Sh("w-b", -200, 60, "Decide?", "diamond", "#FFE86D", { w: 170, h: 130 }), Sh("w-c", 120, 20, "Ship it", "ellipse", "#C3F4D6"), Sh("w-d", 120, 160, "Rethink", "rect", "#FFC9A3"),
      connector({ id: "w-a", side: "e" }, { id: "w-b", side: "w" }, { id: "w-k1" }), connector({ id: "w-b", side: "e" }, { id: "w-c", side: "w" }, { id: "w-k2", label: "yes" }), connector({ id: "w-b", side: "e" }, { id: "w-d", side: "w" }, { id: "w-k3", label: "no" }),
      textObj(330, 30, { id: "w-keys", text: "V select · H hand · N sticky\nR rect · O ellipse · D diamond\nT text · P pen · C connector\nF frame · E eraser\n⌘Z undo · ⌘D duplicate\n⇧1 fit all · ? all shortcuts", fontSize: 15, w: 250, h: 150 }),
    ]);
    case "brainstorm": return makeDoc([
      textObj(-300, -300, { id: "b-q", text: "How might we make Monday standups useful?", fontSize: 32, bold: true, w: 640, h: 48 }),
      frame(-340, -210, 340, 520, "Async updates", { id: "b-f1" }), frame(20, -210, 340, 520, "Meeting rituals", { id: "b-f2" }), frame(380, -210, 340, 520, "Vote here", { id: "b-f3" }),
      S("b-1", -300, -160, "Post a 3-line update in Slack the night before", C.yellow, { w: 140, h: 140 }), S("b-2", -140, -160, "Auto-pull open PRs", C.yellow, { w: 140, h: 140 }), S("b-3", -300, 10, "Weekly written digest", C.yellow, { w: 140, h: 140 }),
      S("b-4", 60, -160, "Timebox to 10 minutes", C.aqua, { w: 140, h: 140 }), S("b-5", 220, -160, "Only blockers get airtime", C.aqua, { w: 140, h: 140 }), S("b-6", 60, 10, "Rotate the facilitator", C.aqua, { w: 140, h: 140 }),
      S("b-7", 420, -160, "Dot-vote the top three ideas", C.pink, { w: 140, h: 140 }),
    ]);
    case "flowchart": return makeDoc([
      Sh("f-start", -80, -260, "Start", "round", "#C3F4D6", { w: 160, h: 70 }),
      Sh("f-in", -100, -140, "New request arrives", "rect", "#FFFFFF", { w: 200, h: 80 }),
      Sh("f-q", -100, -10, "Is it urgent?", "diamond", "#FFE86D", { w: 200, h: 140 }),
      Sh("f-yes", -420, 190, "Page on-call", "rect", "#FFB8C6", { w: 190, h: 80 }), Sh("f-no", 230, 190, "Add to backlog", "rect", "#BCD4FF", { w: 190, h: 80 }),
      Sh("f-end", -80, 360, "Done", "round", "#C3F4D6", { w: 160, h: 70 }),
      connector({ id: "f-start", side: "s" }, { id: "f-in", side: "n" }, { id: "fk1" }), connector({ id: "f-in", side: "s" }, { id: "f-q", side: "n" }, { id: "fk2" }),
      connector({ id: "f-q", side: "w" }, { id: "f-yes", side: "n" }, { id: "fk3", label: "yes" }), connector({ id: "f-q", side: "e" }, { id: "f-no", side: "n" }, { id: "fk4", label: "no" }),
      connector({ id: "f-yes", side: "s" }, { id: "f-end", side: "w" }, { id: "fk5" }), connector({ id: "f-no", side: "s" }, { id: "f-end", side: "e" }, { id: "fk6" }),
    ]);
    case "roadmap": return makeDoc([
      textObj(-500, -300, { id: "m-t", text: "Product roadmap", fontSize: 34, bold: true, w: 500, h: 50 }),
      frame(-520, -220, 340, 480, "Now", { id: "m-f1" }), frame(-160, -220, 340, 480, "Next", { id: "m-f2" }), frame(200, -220, 340, 480, "Later", { id: "m-f3" }),
      S("m-1", -490, -170, "Board templates", C.green, { w: 140, h: 120 }), S("m-2", -490, -30, "Export to SVG", C.green, { w: 140, h: 120 }), S("m-3", -330, -170, "Keyboard sheet", C.green, { w: 140, h: 120 }),
      S("m-4", -130, -170, "Real-time cursors", C.blue, { w: 140, h: 120 }), S("m-5", -130, -30, "Comments on objects", C.blue, { w: 140, h: 120 }), S("m-6", 30, -170, "Present frames as slides", C.blue, { w: 140, h: 120 }),
      S("m-7", 230, -170, "Mermaid import", C.lilac, { w: 140, h: 120 }), S("m-8", 390, -170, "Mind-map layout", C.lilac, { w: 140, h: 120 }),
      connector({ id: "m-1", side: "e" }, { id: "m-3", side: "w" }, { id: "mk1", style: "curve" }), connector({ id: "m-3", side: "e" }, { id: "m-4", side: "w" }, { id: "mk2", dashed: true }),
    ]);
    case "retro": return makeDoc([
      textObj(-480, -320, { id: "r-t", text: "Sprint retrospective", fontSize: 34, bold: true, w: 500, h: 50 }),
      frame(-500, -240, 330, 520, "Went well", { id: "r-f1" }), frame(-150, -240, 330, 520, "To improve", { id: "r-f2" }), frame(200, -240, 330, 520, "Actions", { id: "r-f3" }),
      S("r-1", -470, -190, "Shipped on time", C.green, { w: 130, h: 130 }), S("r-2", -330, -190, "Great pairing", C.green, { w: 130, h: 130 }),
      S("r-3", -120, -190, "Flaky CI", C.peach, { w: 130, h: 130 }), S("r-4", 20, -190, "Late design handoff", C.peach, { w: 130, h: 130 }),
      S("r-5", 230, -190, "Fix CI flake (Sam)", C.lilac, { w: 130, h: 130 }), S("r-6", 370, -190, "Handoff checklist (Ana)", C.lilac, { w: 130, h: 130 }),
    ]);
  }
}
export const boardFromTemplate = (id: TemplateId): Board => newBoard(TEMPLATES.find(t => t.id === id)?.name ?? "Untitled board", templateDoc(id));
export { pen, addObjects };
export type { Obj };
