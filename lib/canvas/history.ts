// Undo/redo as snapshots of an immutable value (Doc objects share structure, so this is cheap).
export interface History<T> { past: T[]; present: T; future: T[] }
export const LIMIT = 200;
export const createHistory = <T,>(present: T): History<T> => ({ past: [], present, future: [] });
/** Record the current value as an undo step, then set a new present. */
export function commit<T>(h: History<T>, next: T): History<T> {
  if (next === h.present) return h;
  return { past: [...h.past, h.present].slice(-LIMIT), present: next, future: [] };
}
/** Replace the present without adding an undo step (live drags, typing); call `checkpoint` first at gesture start. */
export const replace = <T,>(h: History<T>, next: T): History<T> => (next === h.present ? h : { ...h, present: next });
/** Push the present onto the undo stack without changing it (gesture start); the gesture's `replace` calls then build on it. */
export const checkpoint = <T,>(h: History<T>): History<T> => ({ past: [...h.past, h.present].slice(-LIMIT), present: h.present, future: [] });
/** Drop a checkpoint that turned out to change nothing (click without a drag). */
export const dropCheckpoint = <T,>(h: History<T>, same: (a: T, b: T) => boolean = Object.is): History<T> =>
  h.past.length && same(h.past[h.past.length - 1], h.present) ? { ...h, past: h.past.slice(0, -1) } : h;
export const canUndo = <T,>(h: History<T>) => h.past.length > 0;
export const canRedo = <T,>(h: History<T>) => h.future.length > 0;
export function undo<T>(h: History<T>): History<T> { if (!h.past.length) return h; return { past: h.past.slice(0, -1), present: h.past[h.past.length - 1], future: [h.present, ...h.future] }; }
export function redo<T>(h: History<T>): History<T> { if (!h.future.length) return h; return { past: [...h.past, h.present], present: h.future[0], future: h.future.slice(1) }; }
