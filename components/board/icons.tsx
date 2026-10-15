import React from "react";
const S = (p: { children: React.ReactNode; size?: number }) => <svg width={p.size ?? 20} height={p.size ?? 20} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{p.children}</svg>;
export const I = {
  select: <S><path d="M5 3l14 7-6 2-2 6z" /></S>,
  hand: <S><path d="M8 13V6a1.5 1.5 0 013 0v5m0-6a1.5 1.5 0 013 0v6m0-4.5a1.5 1.5 0 013 0V15a6 6 0 01-6 6h-1a6 6 0 01-5-3l-2-4a1.5 1.5 0 012.5-1.5L8 14" /></S>,
  sticky: <S><path d="M4 4h16v10l-6 6H4z" /><path d="M14 20v-6h6" /></S>,
  rect: <S><rect x="4" y="6" width="16" height="12" rx="2" /></S>,
  ellipse: <S><ellipse cx="12" cy="12" rx="8" ry="6" /></S>,
  diamond: <S><path d="M12 3l9 9-9 9-9-9z" /></S>,
  text: <S><path d="M5 6V5h14v1M12 5v14M9 19h6" /></S>,
  pen: <S><path d="M4 20l4-1L19 8l-3-3L5 16z" /><path d="M14 7l3 3" /></S>,
  connector: <S><circle cx="5" cy="6" r="2" /><circle cx="19" cy="18" r="2" /><path d="M7 6h6a3 3 0 013 3v7" /></S>,
  frame: <S><path d="M7 3v18M17 3v18M3 7h18M3 17h18" /></S>,
  eraser: <S><path d="M7 20h12M5 15l8-9 6 6-6 8H8z" /></S>,
  undo: <S><path d="M9 14L4 9l5-5" /><path d="M4 9h10a6 6 0 010 12h-3" /></S>,
  redo: <S><path d="M15 14l5-5-5-5" /><path d="M20 9H10a6 6 0 000 12h3" /></S>,
  trash: <S><path d="M4 7h16M10 11v6M14 11v6M6 7l1 13h10l1-13M9 7V4h6v3" /></S>,
  copy: <S><rect x="8" y="8" width="12" height="12" rx="2" /><path d="M16 8V5a1 1 0 00-1-1H5a1 1 0 00-1 1v10a1 1 0 001 1h3" /></S>,
  back: <S><path d="M15 5l-7 7 7 7" /></S>,
  help: <S><circle cx="12" cy="12" r="9" /><path d="M9.5 9.5a2.5 2.5 0 114 2c-.9.6-1.5 1-1.5 2M12 17h.01" /></S>,
  download: <S><path d="M12 4v11M7 11l5 5 5-5M5 20h14" /></S>,
  plus: <S><path d="M12 5v14M5 12h14" /></S>,
  minus: <S><path d="M5 12h14" /></S>,
  fit: <S><path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" /></S>,
  map: <S><path d="M3 6l6-2 6 2 6-2v14l-6 2-6-2-6 2z" /><path d="M9 4v14M15 6v14" /></S>,
  front: <S><rect x="8" y="3" width="13" height="13" rx="2" fill="currentColor" fillOpacity=".15" /><rect x="3" y="8" width="13" height="13" rx="2" /></S>,
  back2: <S><rect x="3" y="8" width="13" height="13" rx="2" fill="currentColor" fillOpacity=".15" /><rect x="8" y="3" width="13" height="13" rx="2" /></S>,
};
export const Mark = ({ size = 28 }: { size?: number }) => <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden="true"><rect width="32" height="32" rx="8" fill="#FDE050" /><path d="M7 21l5-9 4 6 3-4 6 7" fill="none" stroke="#1C1C1E" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /><circle cx="22" cy="10" r="2.4" fill="#4262FF" /></svg>;
