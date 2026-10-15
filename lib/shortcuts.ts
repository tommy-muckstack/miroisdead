// Single source for the tool rail, the key handler and the "?" shortcut sheet.
export type Tool = "select" | "hand" | "sticky" | "rect" | "ellipse" | "diamond" | "text" | "pen" | "connector" | "frame" | "eraser" | "comment";
export const TOOLS: { tool: Tool; key: string; label: string; hint: string }[] = [
  { tool: "select", key: "v", label: "Select", hint: "Click to select · drag to box-select · Shift adds · Alt-drag duplicates" },
  { tool: "hand", key: "h", label: "Hand", hint: "Drag to pan · or hold Space with any tool" },
  { tool: "sticky", key: "n", label: "Sticky note", hint: "Click to place a sticky, then type · Tab adds the next one" },
  { tool: "rect", key: "r", label: "Rectangle", hint: "Drag to draw · click for default size · type to label" },
  { tool: "ellipse", key: "o", label: "Ellipse", hint: "Drag to draw · click for default size" },
  { tool: "diamond", key: "d", label: "Diamond", hint: "Drag to draw · good for decisions" },
  { tool: "text", key: "t", label: "Text", hint: "Click to add text · Esc or click away to finish" },
  { tool: "pen", key: "p", label: "Pen", hint: "Draw freehand · strokes are smoothed · Esc to stop" },
  { tool: "connector", key: "l", label: "Connection line", hint: "Drag from one object to another · drop on empty space for a loose end" },
  { tool: "comment", key: "c", label: "Comment", hint: "Click anywhere to start a comment thread · ⇧C hides comments" },
  { tool: "frame", key: "f", label: "Frame", hint: "Drag to draw a frame · with a selection, F wraps it" },
  { tool: "eraser", key: "e", label: "Eraser", hint: "Drag across objects to delete them" },
];
export const KEY_TO_TOOL: Record<string, Tool> = Object.fromEntries(TOOLS.map(t => [t.key, t.tool]));
export const SHORTCUT_GROUPS: { title: string; rows: [string, string][] }[] = [
  { title: "Tools", rows: TOOLS.map(t => [t.key.toUpperCase(), t.label] as [string, string]) },
  { title: "Edit", rows: [["⌘Z / ⇧⌘Z", "Undo / redo"], ["⌘A", "Select all"], ["⌘D", "Duplicate"], ["⌘C ⌘X ⌘V", "Copy, cut, paste"], ["Delete", "Delete selection"], ["Enter", "Edit text of the selected object"], ["Tab", "Add a connected object to the right"], ["⇧C", "Show / hide comments"], ["Arrows", "Nudge (Shift = 10×)"], ["⌘] / ⌘[", "Bring to front / send to back"], ["Esc", "Back to Select / clear selection"]] },
  { title: "While typing", rows: [["Tab", "Commit, new sticky to the right"], ["⇧Tab", "Commit, new sticky below"], ["⌘Enter", "Commit"], ["Esc", "Commit and stop editing"]] },
  { title: "View", rows: [["Space + drag", "Pan"], ["Scroll / pinch", "Pan / zoom (⌘ or Ctrl + scroll zooms)"], ["+ / −", "Zoom in / out"], ["⌘0", "Zoom to 100%"], ["⇧1", "Fit all"], ["⇧2", "Zoom to selection"], ["M", "Toggle minimap"], ["?", "This sheet"]] },
];
