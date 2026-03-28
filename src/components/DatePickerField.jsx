import { useState, useEffect, useRef } from "react";
import { TENANT } from "../utils/tenant";
import { inputSx } from "../utils/constants";

export function DatePickerField({ label, value, onChange, style: extraStyle }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value)) {
      const [,, y] = value.split("."); return parseInt(y);
    }
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value)) {
      const [, m] = value.split("."); return parseInt(m) - 1;
    }
    return new Date().getMonth();
  });
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const mesice = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay    = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };

  const pickDay = (day) => {
    const d = String(day).padStart(2, "0");
    const m = String(viewMonth + 1).padStart(2, "0");
    onChange(`${d}.${m}.${viewYear}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const today    = new Date();
  const selDay   = value && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value) ? parseInt(value.split(".")[0]) : null;
  const selMonth = value && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value) ? parseInt(value.split(".")[1]) - 1 : null;
  const selYear  = value && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value) ? parseInt(value.split(".")[2]) : null;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay    = getFirstDay(viewYear, viewMonth);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={wrapRef} style={{ position: "relative", ...extraStyle }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <input
          type="text"
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder="DD.MM.RRRR"
          style={{ ...inputSx, borderRadius: "7px 0 0 7px", flex: 1, borderRight: "none" }}
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{ padding: "0 9px", height: 36, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderLeft: "none", borderRadius: "0 7px 7px 0", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.6)", flexShrink: 0 }}
        >📅</button>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 9999, background: TENANT.modalBg, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", width: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>‹</button>
            <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{mesice[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 4 }}>
            {["Po","Út","St","Čt","Pá","So","Ne"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.3)", padding: "2px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isSel   = day === selDay && viewMonth === selMonth && viewYear === selYear;
              return (
                <button key={i} onClick={() => pickDay(day)}
                  style={{ textAlign: "center", fontSize: 12, padding: "4px 2px", borderRadius: 4, border: "none", cursor: "pointer",
                    background: isSel ? TENANT.p2 : isToday ? "rgba(255,255,255,0.1)" : "transparent",
                    color: isSel ? "#fff" : isToday ? TENANT.p3 : "#e2e8f0",
                    fontWeight: isSel || isToday ? 700 : 400 }}
                >{day}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
