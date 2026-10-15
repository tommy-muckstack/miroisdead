// MiroIsDead canvas data model. Plain JSON so it round-trips through localStorage, Firestore and the agent-readable scene.
export type Id = string;
export type Pt = { x: number; y: number };
export type Box = { x: number; y: number; w: number; h: number };
export type Side = "n" | "e" | "s" | "w";
export type ShapeKind = "rect" | "round" | "ellipse" | "diamond" | "triangle";
export type ConnectorStyle = "elbow" | "straight" | "curve";

export interface StickyObj extends Box { id: Id; type: "sticky"; text: string; color: string; fontSize: number | "auto"; locked?: boolean; private?: boolean; group?: string; rot?: number }
export interface ShapeObj extends Box { id: Id; type: "shape"; shape: ShapeKind; text: string; fill: string; stroke: string; filled: boolean; dashed: boolean; fontSize: number; locked?: boolean; group?: string; rot?: number }
export interface TextObj extends Box { id: Id; type: "text"; text: string; fontSize: number; color: string; bold: boolean; locked?: boolean; group?: string; rot?: number }
/** points are relative to (x, y), which is the stroke's bounding-box origin. */
export interface PenObj extends Box { id: Id; type: "pen"; points: Pt[]; stroke: string; width: number; locked?: boolean; group?: string; rot?: number }
export interface FrameObj extends Box { id: Id; type: "frame"; name: string; locked?: boolean; group?: string; rot?: number }
/** Picture: `src` is a data URL (compressed client-side) or https URL. Kept inside the board document so no file storage is needed. */
export interface ImageObj extends Box { id: Id; type: "image"; src: string; alt?: string; locked?: boolean; group?: string; rot?: number }
export interface CommentMsg { by: string; text: string; at: number }
/** Comment pin: x,y is the pin anchor (bottom-left of the bubble); w/h are the hit box. */
export interface CommentObj extends Box { id: Id; type: "comment"; thread: CommentMsg[]; resolved?: boolean; locked?: boolean; group?: string; rot?: number }
export type End = { id: Id; side?: Side } | { x: number; y: number };
export interface ConnectorObj { id: Id; type: "connector"; from: End; to: End; style: ConnectorStyle; startArrow: boolean; endArrow: boolean; dashed: boolean; stroke: string; label: string; locked?: boolean; group?: string }

export type BoxObj = StickyObj | ShapeObj | TextObj | PenObj | FrameObj | CommentObj | ImageObj;
export type Obj = BoxObj | ConnectorObj;
export type ObjType = Obj["type"];

/** Objects by id plus z-order (first = back). Frames always render behind everything else. */
export interface Doc { objects: Record<Id, Obj>; order: Id[] }
export interface View { x: number; y: number; zoom: number } // x,y = world point at the screen centre
export interface Board { id: string; title: string; createdAt: number; updatedAt: number; doc: Doc; view: View; emoji?: string; note?: string; access?: BoardAccess }
export type BoardAccess = "none" | "view" | "edit";
export interface BoardMeta { id: string; title: string; createdAt: number; updatedAt: number; objectCount: number; emoji?: string }

export const STICKY_COLORS = ["#FFF8A7", "#FFC9A3", "#FFB8C6", "#D9D2FF", "#BCD4FF", "#B5EEEA", "#C3F4D6", "#E4E6EC"] as const;
export const INK_COLORS = ["#1C1C1E", "#4262FF", "#D6334A", "#067429", "#E0801B", "#8A5CF6", "#555A6A", "#FFFFFF"] as const;
export const SHAPE_FILLS = ["#FFFFFF", "#E5E2FF", "#BCD4FF", "#B5EEEA", "#C3F4D6", "#FFE86D", "#FFC9A3", "#FFB8C6"] as const;
export const DEFAULT_VIEW: View = { x: 0, y: 0, zoom: 1 };
export const isBox = (o: Obj): o is BoxObj => o.type !== "connector";
export const emptyDoc = (): Doc => ({ objects: {}, order: [] });
