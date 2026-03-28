import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { TENANT, tc1 } from "../utils/tenant";

export function NativeSelect({ value, onChange, options, style, isDark = true }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const dropRef = useRef(null);

  // Zavřít při kliknutí mimo
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (dropRef.current && dropRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openDropdown = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedHeight = Math.min(options.length * 38, 280);
      const goUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      const dropWidth = Math.max(rect.width, 220);
      // Pokud by dropdown přesahoval pravý okraj — zarovnat zprava
      const leftPos = (rect.left + dropWidth > window.innerWidth - 8)
        ? Math.max(8, window.innerWidth - dropWidth - 8)
        : rect.left;
      setDropUp(goUp);
      setDropPos({ top: goUp ? rect.top : rect.bottom, left: leftPos, width: rect.width });
    }
    setOpen(true);
  };

  const handleLeave = (e) => {
    const to = e.relatedTarget;
    if (ref.current && ref.current.contains(to)) return;
    if (dropRef.current && dropRef.current.contains(to)) return;
    setOpen(false);
  };

  const bg        = isDark ? TENANT.modalBg : "#fff";
  const border    = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)";
  const textColor = isDark ? "#e2e8f0" : "#1e293b";
  const hoverBg   = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const dropBg    = isDark ? TENANT.modalBg : "#fff";
  const dropShadow = isDark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.12)";

  // Portál — renderuje přímo do body, mimo jakýkoliv overflow/stacking context
  const dropdown = open ? createPortal(
    <div ref={dropRef} onMouseLeave={handleLeave}
      style={{ position: "fixed", top: dropUp ? "auto" : dropPos.top, bottom: dropUp ? window.innerHeight - dropPos.top : "auto", left: dropPos.left, minWidth: Math.max(dropPos.width, 220), background: dropBg, border: `1px solid ${border}`, borderRadius: 8, zIndex: 999999, boxShadow: dropShadow, overflow: "auto", maxHeight: 280, fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      {options.map(o => (
        <div key={o}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(o); setOpen(false); }}
          style={{ padding: "9px 14px", color: o === value ? (isDark ? TENANT.p3 : TENANT.p1) : textColor, background: o === value ? (isDark ? tc1(0.15) : tc1(0.08)) : "transparent", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}
          onMouseEnter={e => { if (o !== value) e.currentTarget.style.background = hoverBg; }}
          onMouseLeave={e => { if (o !== value) e.currentTarget.style.background = "transparent"; }}
        >{o}</div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", ...style }}
      onMouseEnter={openDropdown}
      onMouseLeave={handleLeave}
    >
      <button onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openDropdown(); }}
        style={{ width: "auto", padding: "0 20px 0 10px", height: 28, background: bg, border: `1px solid ${border}`, borderRadius: 7, color: textColor, cursor: "pointer", fontSize: 12, textAlign: "left", display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", position: "relative", minWidth: 80 }}>
        <span>{value}</span>
        <span style={{ position: "absolute", right: 6, top: "50%", transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, fontSize: 9, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)", pointerEvents: "none", transition: "transform 0.15s" }}>▼</span>
      </button>
      {dropdown}
    </div>
  );
}
