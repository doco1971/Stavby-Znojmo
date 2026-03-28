import { TENANT, tc1 } from "../utils/tenant";

export function StavbaCard({ row, isEditor, isAdmin, isDark, firmy, onEdit, onCopy, onDelete, onHistorie, showTooltip, hideTooltip }) {
  const firmaColor = (firmy.find(f => f.hodnota === row.firma)?.barva) || TENANT.p2;

  const parseDatumCard = (s) => {
    if (!s) return null;
    const p = s.trim().split(".");
    if (p.length !== 3) return null;
    const d = new Date(`${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`);
    return isNaN(d) ? null : d;
  };

  const termínBadge = () => {
    if (!row.ukonceni) return null;
    const datum = parseDatumCard(row.ukonceni);
    if (!datum) return null;
    const dnes = new Date(); dnes.setHours(0,0,0,0);
    const isFak = row.cislo_faktury && row.cislo_faktury.trim() !== "" && Number(row.castka_bez_dph) !== 0 && row.splatna;
    if (isFak)        return { label: "vyfakturováno",   bg: "rgba(34,197,94,0.15)",  color: "#4ade80", border: "rgba(34,197,94,0.4)" };
    if (datum < dnes) return { label: "⚠️ prošlý termín", bg: "rgba(239,68,68,0.15)",  color: "#f87171", border: "rgba(239,68,68,0.4)" };
    const diff = Math.round((datum - dnes) / 86400000);
    if (diff <= 10)   return { label: `za ${diff} dní`,  bg: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "rgba(251,191,36,0.4)" };
    return null;
  };

  const badge    = termínBadge();
  const cardBg   = isDark ? TENANT.modalBg : "#ffffff";
  const borderC  = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const textC    = isDark ? "#e2e8f0" : "#1e293b";
  const mutedC   = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const metricBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const dividerC = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <div style={{ background: cardBg, borderRadius: 14, border: `1px solid ${borderC}`, fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", borderBottom: `1px solid ${dividerC}` }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: firmaColor, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: firmaColor }}>{row.firma || "—"}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: mutedC }}>{row.cislo_stavby || ""}</span>
      </div>

      {/* název */}
      <div style={{ padding: "10px 14px 8px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textC, lineHeight: 1.35, marginBottom: 10 }}>{row.nazev_stavby || "—"}</div>

        {/* metriky */}
        <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
          {[
            { label: "nabídka", val: row.nabidka },
            { label: "vyfakt.", val: row.vyfakturovano, green: Number(row.vyfakturovano) > 0 },
            { label: "rozdíl",  val: row.rozdil, colored: true },
          ].map(m => (
            <div key={m.label} style={{ flex: 1, background: metricBg, borderRadius: 8, padding: "7px 9px" }}>
              <div style={{ fontSize: 10, color: mutedC, marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: m.colored ? (Number(m.val) >= 0 ? "#4ade80" : "#f87171") : m.green ? "#4ade80" : textC }}>
                {m.val != null && m.val !== "" && Number(m.val) !== 0 ? Number(m.val).toLocaleString("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—"}
              </div>
            </div>
          ))}
        </div>

        {/* termín + badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: mutedC }}>{row.ukonceni ? `ukončení: ${row.ukonceni}` : "bez termínu"}</span>
          {badge && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.label}</span>}
        </div>
      </div>

      {/* poznámka */}
      {row.poznamka && row.poznamka.trim() !== "" && (
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start", padding: "6px 14px", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderTop: `1px solid ${dividerC}` }}>
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💬</span>
          <span style={{ fontSize: 11, color: mutedC, lineHeight: 1.5 }}>{row.poznamka}</span>
        </div>
      )}

      {/* faktury */}
      {row.cislo_faktury && row.cislo_faktury.trim() !== "" && (
        <div style={{ padding: "7px 14px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderTop: `1px solid ${dividerC}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", flexShrink: 0, marginTop: 1, textShadow: "0 0 6px rgba(239,68,68,0.5)" }}>e</span>
            <span style={{ fontSize: 11, color: mutedC, lineHeight: 1.6 }}>
              <span style={{ color: textC, fontWeight: 600 }}>{row.cislo_faktury}</span>
              {Number(row.castka_bez_dph) > 0 && <> · {Number(row.castka_bez_dph).toLocaleString("cs-CZ")} Kč</>}
              {row.splatna && <> · spl. {row.splatna}</>}
            </span>
          </div>
          {row.cislo_faktury_2 && row.cislo_faktury_2.trim() !== "" && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 5, paddingTop: 5, borderTop: `1px dashed ${dividerC}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#facc15", flexShrink: 0, marginTop: 1, textShadow: "0 0 6px rgba(250,204,21,0.5)" }}>S</span>
              <span style={{ fontSize: 11, color: mutedC, lineHeight: 1.6 }}>
                <span style={{ color: textC, fontWeight: 600 }}>{row.cislo_faktury_2}</span>
                {Number(row.castka_bez_dph_2) > 0 && <> · {Number(row.castka_bez_dph_2).toLocaleString("cs-CZ")} Kč</>}
                {row.splatna_2 && <> · spl. {row.splatna_2}</>}
              </span>
            </div>
          )}
        </div>
      )}

      {/* akce */}
      {(isEditor || isAdmin) && (
        <div style={{ display: "flex", gap: 6, padding: "8px 14px", borderTop: `1px solid ${dividerC}`, flexWrap: "wrap" }}>
          <button onClick={() => onHistorie(row)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${borderC}`, borderRadius: 6, color: mutedC, cursor: "pointer", fontSize: 11 }}>🕐 hist.</button>
          <button onClick={() => onCopy(row)}    style={{ padding: "4px 10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, color: "#34d399", cursor: "pointer", fontSize: 11 }}>📋</button>
          <button onClick={() => onEdit(row)}    style={{ padding: "4px 10px", background: tc1(0.15), border: `1px solid ${tc1(0.3)}`, borderRadius: 6, color: TENANT.p3, cursor: "pointer", fontSize: 11, marginLeft: "auto" }}>✏️ editovat</button>
          {isAdmin && <button onClick={() => onDelete(row.id)} style={{ padding: "4px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, color: "#f87171", cursor: "pointer", fontSize: 11 }}>🗑️</button>}
        </div>
      )}
    </div>
  );
}
