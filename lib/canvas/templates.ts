// Starter boards. Ids are fixed so connectors can reference stickies and shapes.
import type { Board, Doc, Obj } from "./types";
import { addObjects, connector, frame, makeDoc, pen, shape, sticky, textObj } from "./doc";
import { newBoard } from "./board";

const C = { yellow: "#FFE86D", peach: "#FFC9A3", pink: "#FFB8C6", lilac: "#D9D2FF", blue: "#BCD4FF", aqua: "#B5EEEA", green: "#C3F4D6", gray: "#E4E6EC" };
const S = (id: string, x: number, y: number, text: string, color: string, p = {}) => sticky(x, y, { id, text, color, ...p });
const Sh = (id: string, x: number, y: number, text: string, kind: "rect" | "round" | "ellipse" | "diamond", fill: string, p = {}) => shape(x, y, { id, text, shape: kind, fill, ...p });

export type TemplateId = "blank" | "welcome" | "brainstorm" | "flowchart" | "retro" | "roadmap" | "kanban" | "mindmap" | "swot" | "okr" | "storymap" | "weekly";
export type TemplateTag = "product" | "agile" | "strategy" | "ideation" | "diagram" | "planning";
export const TEMPLATES: { id: TemplateId; name: string; blurb: string; tags: TemplateTag[] }[] = [
  { id: "blank", name: "Blank board", blurb: "An empty infinite canvas.", tags: [] },
  { id: "welcome", name: "Welcome tour", blurb: "Every tool in one board, with the shortcuts.", tags: ["ideation"] },
  { id: "brainstorm", name: "Brainstorm", blurb: "A prompt, clusters of stickies and a vote area.", tags: ["ideation", "product"] },
  { id: "flowchart", name: "Flowchart", blurb: "Shapes joined by rounded, rerouting connectors.", tags: ["diagram"] },
  { id: "retro", name: "Retrospective", blurb: "Went well, to improve, actions: three frames.", tags: ["agile"] },
  { id: "roadmap", name: "Quarterly roadmap", blurb: "Now, next, later lanes with themed stickies.", tags: ["product", "planning"] },
  { id: "kanban", name: "Kanban board", blurb: "To do, doing, done lanes with WIP limits.", tags: ["agile", "product"] },
  { id: "mindmap", name: "Mind map", blurb: "A central topic with branches and leaves.", tags: ["ideation", "diagram"] },
  { id: "swot", name: "SWOT analysis", blurb: "Strengths, weaknesses, opportunities, threats.", tags: ["strategy"] },
  { id: "okr", name: "Goal setting (OKR)", blurb: "An objective with three measurable key results.", tags: ["strategy", "planning", "product"] },
  { id: "storymap", name: "User story map", blurb: "Activities, steps and stories by release.", tags: ["product", "agile"] },
  { id: "weekly", name: "Weekly planner", blurb: "Five day columns plus a parking lot.", tags: ["planning"] },
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
      textObj(-590, -300, { id: "b-q", text: "How might we make Monday standups useful?", fontSize: 32, bold: true, w: 1000, h: 48 }),
      frame(-590, -210, 380, 520, "Async updates", { id: "b-f1" }), frame(-190, -210, 380, 520, "Meeting rituals", { id: "b-f2" }), frame(210, -210, 380, 520, "Vote here", { id: "b-f3" }),
      S("b-1", -560, -160, "Post a 3-line update in Slack the night before", C.yellow, { w: 150, h: 150 }), S("b-2", -380, -160, "Auto-pull open PRs", C.yellow, { w: 150, h: 150 }), S("b-3", -560, 20, "Weekly written digest", C.yellow, { w: 150, h: 150 }),
      S("b-4", -160, -160, "Timebox to 10 minutes", C.aqua, { w: 150, h: 150 }), S("b-5", 20, -160, "Only blockers get airtime", C.aqua, { w: 150, h: 150 }), S("b-6", -160, 20, "Rotate the facilitator", C.aqua, { w: 150, h: 150 }),
      S("b-7", 240, -160, "Dot-vote the top three ideas", C.pink, { w: 150, h: 150 }),
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
      textObj(-590, -300, { id: "m-t", text: "Product roadmap", fontSize: 34, bold: true, w: 700, h: 50 }),
      frame(-590, -210, 380, 480, "Now", { id: "m-f1" }), frame(-190, -210, 380, 480, "Next", { id: "m-f2" }), frame(210, -210, 380, 480, "Later", { id: "m-f3" }),
      S("m-1", -560, -160, "Board templates", C.green, { w: 150, h: 130 }), S("m-2", -560, 0, "Export to SVG", C.green, { w: 150, h: 130 }), S("m-3", -380, -160, "Keyboard sheet", C.green, { w: 150, h: 130 }),
      S("m-4", -160, -160, "Real-time cursors", C.blue, { w: 150, h: 130 }), S("m-5", -160, 0, "Comments on objects", C.blue, { w: 150, h: 130 }), S("m-6", 20, -160, "Present frames as slides", C.blue, { w: 150, h: 130 }),
      S("m-7", 240, -160, "Mermaid import", C.lilac, { w: 150, h: 130 }), S("m-8", 420, -160, "Mind-map layout", C.lilac, { w: 150, h: 130 }),
      connector({ id: "m-1", side: "e" }, { id: "m-3", side: "w" }, { id: "mk1", style: "curve" }), connector({ id: "m-3", side: "e" }, { id: "m-4", side: "w" }, { id: "mk2", dashed: true }),
    ]);
    case "kanban": return makeDoc([
      textObj(-590, -300, { id: "k-t", text: "Kanban board", fontSize: 34, bold: true, w: 700, h: 50 }),
      frame(-590, -210, 380, 520, "To do", { id: "k-f1" }), frame(-190, -210, 380, 520, "Doing · WIP 3", { id: "k-f2" }), frame(210, -210, 380, 520, "Done", { id: "k-f3" }),
      S("k-1", -560, -160, "Write the onboarding email", C.yellow, { w: 150, h: 120 }), S("k-2", -380, -160, "Fix the export bug", C.yellow, { w: 150, h: 120 }), S("k-3", -560, -20, "Interview two customers", C.yellow, { w: 150, h: 120 }), S("k-4", -380, -20, "Update pricing page", C.yellow, { w: 150, h: 120 }),
      S("k-5", -160, -160, "Design the share dialog", C.blue, { w: 150, h: 120 }), S("k-6", 20, -160, "Ship the comments API", C.blue, { w: 150, h: 120 }),
      S("k-7", 240, -160, "Set up analytics", C.green, { w: 150, h: 120 }), S("k-8", 420, -160, "Launch the blog", C.green, { w: 150, h: 120 }), S("k-9", 240, -20, "Hire a designer", C.green, { w: 150, h: 120 }),
    ]);
    case "mindmap": return makeDoc([
      Sh("mm-c", -110, -45, "Launch plan", "round", "#FFE86D", { w: 220, h: 90, fontSize: 20 }),
      Sh("mm-1", -520, -260, "Audience", "round", "#BCD4FF", { w: 170, h: 64 }), Sh("mm-2", 350, -260, "Channels", "round", "#C3F4D6", { w: 170, h: 64 }), Sh("mm-3", -520, 190, "Messaging", "round", "#FFB8C6", { w: 170, h: 64 }), Sh("mm-4", 350, 190, "Timeline", "round", "#D9D2FF", { w: 170, h: 64 }),
      Sh("mm-1a", -760, -340, "Early adopters", "rect", "#FFFFFF", { w: 160, h: 50 }), Sh("mm-1b", -760, -250, "Agencies", "rect", "#FFFFFF", { w: 160, h: 50 }),
      Sh("mm-2a", 600, -340, "Newsletter", "rect", "#FFFFFF", { w: 160, h: 50 }), Sh("mm-2b", 600, -250, "Community", "rect", "#FFFFFF", { w: 160, h: 50 }),
      Sh("mm-3a", -760, 180, "One-line pitch", "rect", "#FFFFFF", { w: 160, h: 50 }), Sh("mm-3b", -760, 270, "Proof points", "rect", "#FFFFFF", { w: 160, h: 50 }),
      Sh("mm-4a", 600, 180, "Beta: week 1", "rect", "#FFFFFF", { w: 160, h: 50 }), Sh("mm-4b", 600, 270, "Public: week 6", "rect", "#FFFFFF", { w: 160, h: 50 }),
      connector({ id: "mm-c", side: "w" }, { id: "mm-1", side: "e" }, { id: "mmk1", style: "curve", endArrow: false }), connector({ id: "mm-c", side: "e" }, { id: "mm-2", side: "w" }, { id: "mmk2", style: "curve", endArrow: false }),
      connector({ id: "mm-c", side: "w" }, { id: "mm-3", side: "e" }, { id: "mmk3", style: "curve", endArrow: false }), connector({ id: "mm-c", side: "e" }, { id: "mm-4", side: "w" }, { id: "mmk4", style: "curve", endArrow: false }),
      connector({ id: "mm-1", side: "w" }, { id: "mm-1a", side: "e" }, { id: "mmk5", style: "curve", endArrow: false }), connector({ id: "mm-1", side: "w" }, { id: "mm-1b", side: "e" }, { id: "mmk6", style: "curve", endArrow: false }),
      connector({ id: "mm-2", side: "e" }, { id: "mm-2a", side: "w" }, { id: "mmk7", style: "curve", endArrow: false }), connector({ id: "mm-2", side: "e" }, { id: "mm-2b", side: "w" }, { id: "mmk8", style: "curve", endArrow: false }),
      connector({ id: "mm-3", side: "w" }, { id: "mm-3a", side: "e" }, { id: "mmk9", style: "curve", endArrow: false }), connector({ id: "mm-3", side: "w" }, { id: "mm-3b", side: "e" }, { id: "mmk10", style: "curve", endArrow: false }),
      connector({ id: "mm-4", side: "e" }, { id: "mm-4a", side: "w" }, { id: "mmk11", style: "curve", endArrow: false }), connector({ id: "mm-4", side: "e" }, { id: "mm-4b", side: "w" }, { id: "mmk12", style: "curve", endArrow: false }),
    ]);
    case "swot": return makeDoc([
      textObj(-590, -320, { id: "sw-t", text: "SWOT analysis", fontSize: 34, bold: true, w: 700, h: 50 }),
      frame(-590, -240, 580, 330, "Strengths", { id: "sw-f1" }), frame(10, -240, 580, 330, "Weaknesses", { id: "sw-f2" }), frame(-590, 110, 580, 330, "Opportunities", { id: "sw-f3" }), frame(10, 110, 580, 330, "Threats", { id: "sw-f4" }),
      S("sw-1", -560, -190, "Fast release cadence", C.green, { w: 150, h: 120 }), S("sw-2", -390, -190, "Loyal early users", C.green, { w: 150, h: 120 }),
      S("sw-3", 40, -190, "Small support team", C.peach, { w: 150, h: 120 }), S("sw-4", 210, -190, "No mobile app yet", C.peach, { w: 150, h: 120 }),
      S("sw-5", -560, 160, "Partner integrations", C.blue, { w: 150, h: 120 }), S("sw-6", -390, 160, "Education market", C.blue, { w: 150, h: 120 }),
      S("sw-7", 40, 160, "Bigger incumbents", C.pink, { w: 150, h: 120 }), S("sw-8", 210, 160, "Pricing pressure", C.pink, { w: 150, h: 120 }),
    ]);
    case "okr": return makeDoc([
      textObj(-590, -300, { id: "o-t", text: "Goal setting (OKR)", fontSize: 34, bold: true, w: 700, h: 50 }),
      Sh("o-obj", -590, -220, "Objective: make onboarding effortless this quarter", "round", "#FFE86D", { w: 1180, h: 90, fontSize: 20 }),
      Sh("o-kr1", -590, -80, "KR 1 · Time to first board under 2 minutes", "rect", "#FFFFFF", { w: 370, h: 80 }), Sh("o-kr2", -185, -80, "KR 2 · 60% of sign-ups invite a teammate", "rect", "#FFFFFF", { w: 370, h: 80 }), Sh("o-kr3", 220, -80, "KR 3 · Support tickets about setup down 50%", "rect", "#FFFFFF", { w: 370, h: 80 }),
      S("o-1", -590, 40, "Initiative: welcome template", C.blue, { w: 170, h: 120 }), S("o-2", -400, 40, "Initiative: guided first board", C.blue, { w: 170, h: 120 }),
      S("o-3", -185, 40, "Initiative: invite link in the share dialog", C.green, { w: 170, h: 120 }), S("o-4", 5, 40, "Initiative: team spaces", C.green, { w: 170, h: 120 }),
      S("o-5", 220, 40, "Initiative: in-app help panel", C.lilac, { w: 170, h: 120 }), S("o-6", 410, 40, "Initiative: setup FAQ", C.lilac, { w: 170, h: 120 }),
      connector({ id: "o-obj", side: "s" }, { id: "o-kr1", side: "n" }, { id: "ok1" }), connector({ id: "o-obj", side: "s" }, { id: "o-kr2", side: "n" }, { id: "ok2" }), connector({ id: "o-obj", side: "s" }, { id: "o-kr3", side: "n" }, { id: "ok3" }),
    ]);
    case "storymap": return makeDoc([
      textObj(-590, -320, { id: "u-t", text: "User story map", fontSize: 34, bold: true, w: 700, h: 50 }),
      Sh("u-a1", -590, -240, "Sign up", "rect", "#BCD4FF", { w: 270, h: 60 }), Sh("u-a2", -300, -240, "Create a board", "rect", "#BCD4FF", { w: 270, h: 60 }), Sh("u-a3", -10, -240, "Collaborate", "rect", "#BCD4FF", { w: 270, h: 60 }), Sh("u-a4", 280, -240, "Share results", "rect", "#BCD4FF", { w: 270, h: 60 }),
      frame(-620, -150, 1200, 230, "Release 1", { id: "u-r1" }), frame(-620, 100, 1200, 230, "Release 2", { id: "u-r2" }),
      S("u-1", -590, -100, "Email sign-up", C.yellow, { w: 120, h: 110 }), S("u-2", -450, -100, "Google sign-in", C.yellow, { w: 120, h: 110 }), S("u-3", -300, -100, "Blank board", C.yellow, { w: 120, h: 110 }), S("u-4", -160, -100, "Sticky notes", C.yellow, { w: 120, h: 110 }), S("u-5", -10, -100, "Invite link", C.yellow, { w: 120, h: 110 }), S("u-6", 280, -100, "Export PNG", C.yellow, { w: 120, h: 110 }),
      S("u-7", -590, 150, "Passwordless login", C.aqua, { w: 120, h: 110 }), S("u-8", -300, 150, "Templates", C.aqua, { w: 120, h: 110 }), S("u-9", -10, 150, "Live cursors", C.aqua, { w: 120, h: 110 }), S("u-10", 130, 150, "Comments", C.aqua, { w: 120, h: 110 }), S("u-11", 280, 150, "Public links", C.aqua, { w: 120, h: 110 }),
    ]);
    case "weekly": return makeDoc([
      textObj(-590, -300, { id: "wk-t", text: "Weekly planner", fontSize: 34, bold: true, w: 700, h: 50 }),
      frame(-600, -210, 230, 520, "Monday", { id: "wk-1" }), frame(-355, -210, 230, 520, "Tuesday", { id: "wk-2" }), frame(-110, -210, 230, 520, "Wednesday", { id: "wk-3" }), frame(135, -210, 230, 520, "Thursday", { id: "wk-4" }), frame(380, -210, 230, 520, "Friday", { id: "wk-5" }),
      frame(640, -210, 260, 520, "Parking lot", { id: "wk-p" }),
      S("wk-a", -580, -160, "Team sync 10:00", C.blue, { w: 190, h: 100 }), S("wk-b", -580, -40, "Draft the roadmap", C.yellow, { w: 190, h: 100 }), S("wk-c", -335, -160, "Customer calls", C.green, { w: 190, h: 100 }), S("wk-d", -90, -160, "Design review", C.lilac, { w: 190, h: 100 }), S("wk-e", 155, -160, "Ship release 1.2", C.peach, { w: 190, h: 100 }), S("wk-f", 400, -160, "Retro + demo", C.pink, { w: 190, h: 100 }),
      S("wk-g", 660, -160, "Write the help article", C.gray, { w: 190, h: 100 }), S("wk-h", 660, -40, "Try the new analytics", C.gray, { w: 190, h: 100 }),
    ]);
    case "retro": return makeDoc([
      textObj(-590, -300, { id: "r-t", text: "Sprint retrospective", fontSize: 34, bold: true, w: 700, h: 50 }),
      frame(-590, -210, 380, 480, "Went well", { id: "r-f1" }), frame(-190, -210, 380, 480, "To improve", { id: "r-f2" }), frame(210, -210, 380, 480, "Actions", { id: "r-f3" }),
      S("r-1", -560, -160, "Shipped on time", C.green, { w: 150, h: 150 }), S("r-2", -380, -160, "Great pairing", C.green, { w: 150, h: 150 }),
      S("r-3", -160, -160, "Flaky CI", C.peach, { w: 150, h: 150 }), S("r-4", 20, -160, "Late design handoff", C.peach, { w: 150, h: 150 }),
      S("r-5", 240, -160, "Fix CI flake (Sam)", C.lilac, { w: 150, h: 150 }), S("r-6", 420, -160, "Handoff checklist (Ana)", C.lilac, { w: 150, h: 150 }),
    ]);
  }
}
export const boardFromTemplate = (id: TemplateId): Board => newBoard(TEMPLATES.find(t => t.id === id)?.name ?? "Untitled board", templateDoc(id));
export { pen, addObjects };
export type { Obj };
