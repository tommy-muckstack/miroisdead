// Miro list prices, read from miro.com/pricing on 2026-10-14 (yearly billing, per member per month). Update when Miro changes them.
export const MIRO = { asOf: "Oct 14, 2026", starter: 8, business: 20, freeEditableBoards: 3 } as const;
export type MiroPlan = "starter" | "business";
export const miroYearly = (seats: number, plan: MiroPlan) => Math.max(0, Math.floor(seats)) * MIRO[plan] * 12;
/** Rows from Miro's plan-comparison table; `plan` is the cheapest plan that includes it. Everything is free in MiroIsDead. */
export const FEATURES: { name: string; plan: string; ours: string }[] = [
  { name: "Unlimited editable boards", plan: "Starter (Free keeps 3 editable)", ours: "No board limit" },
  { name: "Private boards", plan: "Starter", ours: "Every board is private to your account" },
  { name: "Full-resolution board export", plan: "Starter (Free is low-res only)", ours: "SVG and JSON file" },
  { name: "Manual board backup", plan: "Starter", ours: "Export and import a .json file" },
  { name: "Starter templates", plan: "Free", ours: "5 built-in templates" },
  { name: "Layers (z-order)", plan: "Free", ours: "Bring to front, send to back" },
  { name: "Basic diagramming shapes", plan: "Free", ours: "Rectangle, rounded, ellipse, diamond, triangle" },
];
