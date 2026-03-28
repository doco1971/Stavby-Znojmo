// ============================================================
// useDraggable — drag & drop hook pro plovoucí modální okna
// ============================================================
import { useState, useEffect, useCallback, useRef } from "react";

/**
 * @param {number} w  — šířka okna v px (pro výpočet středu)
 * @param {number} h  — výška okna v px (zatím nevyužito, rezerva)
 * @returns {{ pos, onMouseDown, reset }}
 */
export function useDraggable(w = 600, h = 500) {
  const calcPos = (overrideW) => {
    const iW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const effectiveW = overrideW ?? w;
    return {
      x: Math.max(10, Math.round(iW / 2 - Math.min(effectiveW, iW * 0.97) / 2)),
      y: 10,
    };
  };

  const [pos, setPos] = useState(calcPos);
  useEffect(() => { setPos(calcPos()); }, []);
  const reset = useCallback((overrideW) => setPos(calcPos(overrideW)), [w]);

  const dragging = useRef(false);
  const offset   = useRef({ x: 0, y: 0 });
  const posRef   = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  const onMove = useCallback((ev) => {
    if (!dragging.current) return;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth  - 60, ev.clientX - offset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - offset.current.y)),
    });
  }, []);

  const onUp = useCallback(() => { dragging.current = false; }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup",   onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup",   onUp);
    };
  }, [onMove, onUp]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragging.current = true;
    offset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  }, []);

  return { pos, onMouseDown, reset };
}

// ── Sdílené styly pro drag hlavičku ───────────────────────
export const dragHeaderStyle = (extraStyle = {}) => ({
  padding: "13px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "grab",
  userSelect: "none",
  background: "rgba(255,255,255,0.03)",
  borderRadius: "16px 16px 0 0",
  ...extraStyle,
});

export const dragHint = (
  <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 400, marginLeft: 8 }}>
    ⠿ přetáhnout
  </span>
);
