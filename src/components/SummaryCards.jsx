import { TENANT } from "../utils/tenant";
import { fmt } from "../utils/formatters";

export function SummaryCards({ data, firmy, isDark, firmaColors, isMobile }) {
  const sum    = (firma, fields) => data.filter(r => r.firma === firma).reduce((a, r) => { fields.forEach(f => a += Number(r[f])||0); return a; }, 0);
  const sumAll = (fields) => data.reduce((a, r) => { fields.forEach(f => a += Number(r[f])||0); return a; }, 0);

  const bg         = isDark ? TENANT.appDarkBg : TENANT.appLightBg;
  const textMuted  = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const textMain   = isDark ? "#fff" : "#1e293b";
  const groupBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";

  const totalI      = sumAll(["ps_i","snk_i","bo_i"]);
  const totalII     = sumAll(["ps_ii","bo_ii","poruch"]);
  const totalCelkem = totalI + totalII;

  if (isMobile) {
    return (
      <div style={{ background: bg, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        <div style={{ background: isDark ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.4)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#f97316", fontSize: 11, fontWeight: 700 }}>CELKEM VŠE</span>
          <span style={{ color: textMain, fontSize: 16, fontWeight: 800 }}>{fmt(totalCelkem)}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, color: "#f97316" }}>I: <strong style={{ color: textMain }}>{fmt(totalI)}</strong></span>
            <span style={{ fontSize: 10, color: "#f97316" }}>II: <strong style={{ color: textMain }}>{fmt(totalII)}</strong></span>
          </div>
        </div>
        {firmy.map((firma) => {
          const color  = firmaColors[firma] || TENANT.p1;
          const katI   = sum(firma, ["ps_i","snk_i","bo_i"]);
          const katII  = sum(firma, ["ps_ii","bo_ii","poruch"]);
          const celkem = katI + katII;
          if (celkem === 0) return null;
          return (
            <div key={firma} style={{ background: isDark ? `${color}12` : `${color}10`, border: `1px solid ${color}40`, borderRadius: 10, padding: "7px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ color, fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firma}</span>
              </div>
              <span style={{ color: textMain, fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{fmt(celkem)}</span>
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: textMuted }}>I: <strong style={{ color: textMain }}>{fmt(katI)}</strong></span>
                <span style={{ fontSize: 10, color: textMuted }}>II: <strong style={{ color: textMain }}>{fmt(katII)}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", background: bg, padding: "10px 18px" }}>
      <div style={{ display: "flex", gap: 6, minWidth: "max-content", alignItems: "stretch" }}>

        {/* CELKEM VŠE */}
        <div style={{ background: isDark ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.08)", border: `1px solid rgba(249,115,22,0.4)`, borderRadius: 12, padding: "10px 16px", minWidth: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#f97316", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>CELKEM VŠE</div>
          <div style={{ color: textMain, fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{fmt(totalCelkem)}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ background: isDark ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.12)", borderRadius: 6, padding: "4px 10px", textAlign: "center" }}>
              <div style={{ color: "#f97316", fontSize: 9, fontWeight: 700 }}>KAT. I</div>
              <div style={{ color: textMain, fontSize: 13, fontWeight: 700 }}>{fmt(totalI)}</div>
            </div>
            <div style={{ background: isDark ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.12)", borderRadius: 6, padding: "4px 10px", textAlign: "center" }}>
              <div style={{ color: "#f97316", fontSize: 9, fontWeight: 700 }}>KAT. II</div>
              <div style={{ color: textMain, fontSize: 13, fontWeight: 700 }}>{fmt(totalII)}</div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: 2, background: groupBorder, borderRadius: 2, margin: "2px 40px" }} />

        {/* Skupiny firem */}
        {firmy.map((firma) => {
          const color  = firmaColors[firma] || TENANT.p1;
          const katI   = sum(firma, ["ps_i","snk_i","bo_i"]);
          const katII  = sum(firma, ["ps_ii","bo_ii","poruch"]);
          const celkem = katI + katII;
          return (
            <div key={firma} style={{ background: isDark ? `${color}12` : `${color}10`, border: `1px solid ${color}40`, borderRadius: 12, padding: "10px 16px", minWidth: 210, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>{firma.toUpperCase()}</div>
              <div style={{ color: textMain, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{fmt(celkem)}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ background: isDark ? `${color}18` : `${color}12`, border: `1px solid ${color}25`, borderRadius: 6, padding: "4px 12px", textAlign: "center" }}>
                  <div style={{ color, fontSize: 9, fontWeight: 700 }}>KAT. I</div>
                  <div style={{ color: textMain, fontSize: 13, fontWeight: 700 }}>{fmt(katI)}</div>
                </div>
                <div style={{ background: isDark ? `${color}18` : `${color}12`, border: `1px solid ${color}25`, borderRadius: 6, padding: "4px 12px", textAlign: "center" }}>
                  <div style={{ color, fontSize: 9, fontWeight: 700 }}>KAT. II</div>
                  <div style={{ color: textMain, fontSize: 13, fontWeight: 700 }}>{fmt(katII)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
