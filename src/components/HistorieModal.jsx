import { useState, useEffect } from "react";
import { TENANT, tc1 } from "../utils/tenant";
import { sb } from "../utils/supabase";
import { useDraggable, dragHeaderStyle, dragHint } from "../hooks/useDraggable.jsx";

const FIELD_LABELS = {
  firma: "Firma", cislo_stavby: "Č. stavby", nazev_stavby: "Název stavby",
  ps_i: "Plán. stavby I", snk_i: "SNK I", bo_i: "Běžné opravy I",
  ps_ii: "Plán. stavby II", bo_ii: "Běžné opravy II", poruch: "Poruchy",
  vyfakturovano: "Vyfakturováno", ukonceni: "Ukončení", zrealizovano: "Zrealizováno",
  sod: "SOD", ze_dne: "Ze dne", objednatel: "Objednatel", stavbyvedouci: "Stavbyvedoucí",
  nabidkova_cena: "Nab. cena", cislo_faktury: "Č. faktury", castka_bez_dph: "Č. bez DPH",
  splatna: "Splatná", poznamka: "Poznámka",
};

export function HistorieModal({ row, isDark, onClose, isDemo, isAdmin, isSuperAdmin, onAllHidden, onPrecteno }) {
  const [zaznamy, setZaznamy]   = useState([]);
  const [loading, setLoading]   = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [zobrazit, setZobrazit] = useState("aktivni");
  const { pos, onMouseDown: onDragStart } = useDraggable(680, 560);

  useEffect(() => {
    if (isDemo) { setLoading(false); return; }
    const load = async () => {
      try {
        const hiddenFilter = isSuperAdmin ? "" : "&hidden=eq.false";
        const res    = await sb(`log_aktivit?order=cas.desc&limit=500${hiddenFilter}`);
        const idStr  = String(row.id);
        const filtered = (res || []).filter(r => {
          if (!r.detail) return false;
          if (r.akce === "Přidání stavby" && r.detail === (row.nazev_stavby || "")) return true;
          const match = r.detail.match(/^ID:\s*(\d+)[,\s]/);
          return match && match[1] === idStr;
        });
        setZaznamy(filtered);
        if (onPrecteno) onPrecteno(row.id);
      } catch { setZaznamy([]); }
      finally { setLoading(false); }
    };
    load();
  }, [row.id, row.nazev_stavby, isDemo]);

  const fmtCas = (cas) => {
    if (!cas) return "";
    return new Date(cas).toLocaleString("cs-CZ", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const parseDetail = (detail) => {
    if (!detail) return null;
    try { const s = detail.indexOf("{"); return s === -1 ? null : JSON.parse(detail.slice(s)); } catch { return null; }
  };

  const handleDelete = async (id) => {
    if (isDemo) return;
    setDeleting(true);
    try {
      await sb(`log_aktivit?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ hidden: true }), prefer: "return=minimal" });
      const updated = zaznamy.map(r => r.id === id ? { ...r, hidden: true } : r);
      setZaznamy(updated);
      if (updated.every(r => r.hidden) && onAllHidden) onAllHidden(row.id);
    } catch(e) { console.warn("Chyba skrytí:", e); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  const handleUnhide = async (id) => {
    if (!isSuperAdmin || isDemo) return;
    try {
      await sb(`log_aktivit?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ hidden: false }), prefer: "return=minimal" });
      setZaznamy(prev => prev.map(r => r.id === id ? { ...r, hidden: false } : r));
    } catch(e) { console.warn("Chyba obnovení:", e); }
  };

  const canDelete = (isAdmin || isSuperAdmin) && !isDemo;
  const zobrazeneZaznamy = zaznamy.filter(r =>
    zobrazit === "aktivni" ? !r.hidden : zobrazit === "skryte" ? r.hidden : true
  );

  const AKCE_STYLE = {
    "Přidání stavby": { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",  color: "#4ade80", icon: "➕" },
    "Editace stavby": { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.4)", color: "#fbbf24", icon: "✏️" },
    "Smazání stavby": { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",  color: "#f87171", icon: "🗑️" },
  };

  const modalBg = isDark ? TENANT.modalBg : "#fff";
  const mutedC  = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";
  const borderC = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1300, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ position: "fixed", left: pos.x, top: pos.y, pointerEvents: "all", background: modalBg, borderRadius: 16, width: "min(680px,96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}`, boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>

        <div onMouseDown={onDragStart} style={dragHeaderStyle()}>
          <div>
            <span style={{ color: isDark ? "#fff" : "#1e293b", fontWeight: 700, fontSize: 15 }}>🕐 Historie změn{dragHint}</span>
            <div style={{ color: mutedC, fontSize: 12, marginTop: 2 }}>
              {row.cislo_stavby && <span style={{ fontWeight: 700, color: isDark ? TENANT.p3 : TENANT.p1 }}>{row.cislo_stavby} · </span>}
              {row.nazev_stavby}
            </div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isSuperAdmin && (
              <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 7, overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
                {[["aktivni","Aktivní"],["skryte","Skryté"],["vse","Vše"]].map(([val, label]) => (
                  <button key={val} onClick={() => setZobrazit(val)} style={{ padding: "4px 10px", background: zobrazit === val ? (isDark ? tc1(0.4) : tc1(0.15)) : "transparent", border: "none", color: zobrazit === val ? TENANT.p3 : mutedC, cursor: "pointer", fontSize: 11, fontWeight: zobrazit === val ? 700 : 400 }}>{label}</button>
                ))}
              </div>
            )}
            <button onClick={onClose} onMouseDown={e => e.stopPropagation()} style={{ background: "none", border: "none", color: mutedC, fontSize: 20, cursor: "pointer", lineHeight: 1, marginLeft: 4 }}>✕</button>
          </div>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "16px 22px" }}>
          {loading && <div style={{ textAlign: "center", color: mutedC, padding: 40 }}>Načítám historii...</div>}
          {!loading && zaznamy.length === 0 && (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <div style={{ color: mutedC, fontSize: 14 }}>{isDemo ? "Demo režim — historie se neukládá" : "Žádné záznamy v historii"}</div>
              {isDemo && <div style={{ color: mutedC, fontSize: 12, marginTop: 6 }}>V ostré verzi se zde zobrazí kompletní přehled změn.</div>}
              <div style={{ color: mutedC, fontSize: 12, marginTop: 6 }}>Historie se zapisuje od tohoto buildu.</div>
            </div>
          )}
          {!loading && zaznamy.length > 0 && zobrazeneZaznamy.length === 0 && (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🫙</div>
              <div style={{ color: mutedC, fontSize: 14 }}>{zobrazit === "skryte" ? "Žádné skryté záznamy" : "Žádné záznamy"}</div>
            </div>
          )}
          {!loading && zobrazeneZaznamy.map((z, i) => {
            const st       = AKCE_STYLE[z.akce] || { bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)", color: "#94a3b8", icon: "•" };
            const diff     = parseDetail(z.detail);
            const isHidden = z.hidden;
            return (
              <div key={i} style={{ marginBottom: 12, padding: "12px 14px", background: isHidden ? "rgba(100,116,139,0.06)" : st.bg, border: `1px solid ${isHidden ? "rgba(100,116,139,0.2)" : st.border}`, borderRadius: 10, opacity: isHidden ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: diff ? 10 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{st.icon}</span>
                    <span style={{ color: isHidden ? mutedC : st.color, fontWeight: 700, fontSize: 13 }}>{z.akce}</span>
                    <span style={{ color: mutedC, fontSize: 12 }}>— {z.uzivatel}</span>
                    {isHidden && <span style={{ fontSize: 10, color: mutedC, background: "rgba(100,116,139,0.15)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>skryto</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ color: mutedC, fontSize: 11, whiteSpace: "nowrap" }}>{fmtCas(z.cas)}</span>
                    {isSuperAdmin && isHidden && !isDemo && (
                      <button onClick={() => handleUnhide(z.id)} title="Obnovit" style={{ background: "none", border: "none", color: "rgba(34,197,94,0.5)", cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 700 }}
                        onMouseEnter={e => e.currentTarget.style.color = "#4ade80"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(34,197,94,0.5)"}
                      >↩</button>
                    )}
                    {canDelete && !isHidden && (
                      <button onClick={() => setDeleteId(z.id)} title="Skrýt" style={{ background: "none", border: "none", color: "rgba(239,68,68,0.4)", cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 700 }}
                        onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(239,68,68,0.4)"}
                      >✕</button>
                    )}
                  </div>
                </div>
                {diff?.zmeny?.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead><tr>{["Pole","Původní hodnota","Nová hodnota"].map(h => <th key={h} style={{ padding: "4px 8px", textAlign: "left", color: mutedC, fontWeight: 700, fontSize: 10, borderBottom: `1px solid ${borderC}` }}>{h}</th>)}</tr></thead>
                      <tbody>
                        {diff.zmeny.map((z2, j) => (
                          <tr key={j} style={{ borderBottom: `1px solid ${borderC}` }}>
                            <td style={{ padding: "4px 8px", color: mutedC, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{FIELD_LABELS[z2.pole] || z2.pole}</td>
                            <td style={{ padding: "4px 8px", color: "#f87171", fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z2.stare == null || z2.stare === "" ? <em style={{ opacity: 0.5 }}>prázdné</em> : String(z2.stare)}</td>
                            <td style={{ padding: "4px 8px", color: "#4ade80", fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z2.nove == null || z2.nove === "" ? <em style={{ opacity: 0.5 }}>prázdné</em> : String(z2.nove)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {!diff && z.detail && <div style={{ color: mutedC, fontSize: 11, marginTop: 4 }}>{z.detail}</div>}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "12px 22px", borderTop: `1px solid ${borderC}`, display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => {
              const rows = zaznamy.map((z, i) => {
                const diff = (() => { try { const s = z.detail?.indexOf("{"); return s >= 0 ? JSON.parse(z.detail.slice(s)) : null; } catch { return null; } })();
                const cas = z.cas ? new Date(z.cas).toLocaleString("cs-CZ") : "";
                const akceColor = z.akce === "Přidání stavby" ? "#166534" : z.akce === "Editace stavby" ? "#854D0E" : "#991B1B";
                const akceBg    = z.akce === "Přidání stavby" ? "#dcfce7" : z.akce === "Editace stavby" ? "#fef9c3" : "#fee2e2";
                const zmenyHtml = diff?.zmeny?.length ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:10px"><thead><tr><th style="background:#e2e8f0;padding:3px 6px;text-align:left">Pole</th><th style="background:#e2e8f0;padding:3px 6px;text-align:left;color:#991b1b">Původní</th><th style="background:#e2e8f0;padding:3px 6px;text-align:left;color:#166534">Nová</th></tr></thead><tbody>${diff.zmeny.map(z2=>`<tr><td style="padding:3px 6px;border-bottom:1px solid #e2e8f0">${FIELD_LABELS[z2.pole]||z2.pole}</td><td style="padding:3px 6px;border-bottom:1px solid #e2e8f0;color:#991b1b">${z2.stare??""}</td><td style="padding:3px 6px;border-bottom:1px solid #e2e8f0;color:#166534">${z2.nove??""}</td></tr>`).join("")}</tbody></table>` : "";
                return `<tr><td style="padding:8px 10px;background:${akceBg};border:1px solid #e2e8f0;vertical-align:top;white-space:nowrap;font-size:11px;color:${akceColor};font-weight:700">${z.akce||""}</td><td style="padding:8px 10px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #e2e8f0;vertical-align:top;white-space:nowrap;font-size:11px">${cas}</td><td style="padding:8px 10px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #e2e8f0;vertical-align:top;font-size:11px">${z.uzivatel||""}</td><td style="padding:8px 10px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #e2e8f0;vertical-align:top;font-size:11px">${zmenyHtml||(z.detail||"")}</td></tr>`;
              }).join("");
              const w = window.open("","_blank");
              w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Historie – ${row.nazev_stavby}</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}table{width:100%;border-collapse:collapse}th{background:${TENANT.p1deep};color:#fff;padding:7px 10px;text-align:left;font-size:11px}@media print{button{display:none}}</style></head><body><h2>🕐 Historie – ${row.cislo_stavby||""} ${row.nazev_stavby||""}</h2><p>Vygenerováno: ${new Date().toLocaleDateString("cs-CZ")} | ${zaznamy.length} záznamů</p><table><thead><tr><th>Akce</th><th>Datum a čas</th><th>Uživatel</th><th>Detail změn</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>`);
              w.document.close();
            }} style={{ padding: "7px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🖨️ PDF tisk</button>
            <button onClick={() => {
              const AKCE_BG = { "Přidání stavby":"#dcfce7","Editace stavby":"#fef9c3","Smazání stavby":"#fee2e2" };
              const rows = zaznamy.map((z, i) => {
                const cas = z.cas ? new Date(z.cas).toLocaleString("cs-CZ") : "";
                const bg = AKCE_BG[z.akce] || (i%2===0?"#f8fafc":"#fff");
                const diff = (() => { try { const s = z.detail?.indexOf("{"); return s>=0 ? JSON.parse(z.detail.slice(s)) : null; } catch { return null; } })();
                const detail = diff?.zmeny?.map(x=>`${FIELD_LABELS[x.pole]||x.pole}: ${x.stare} → ${x.nove}`).join("; ") || z.detail || "";
                return `<tr><td style="padding:5px 8px;background:${bg};border:1px solid #E2E8F0;font-size:10px;font-weight:700">${z.akce||""}</td><td style="padding:5px 8px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #E2E8F0;font-size:10px;white-space:nowrap">${cas}</td><td style="padding:5px 8px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #E2E8F0;font-size:10px">${z.uzivatel||""}</td><td style="padding:5px 8px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #E2E8F0;font-size:10px">${detail}</td></tr>`;
              }).join("");
              const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table><thead><tr><th style="background:${TENANT.p1deep};color:#fff;padding:6px 10px;border:1px solid ${TENANT.p1};font-size:10px">Akce</th><th style="background:${TENANT.p1deep};color:#fff;padding:6px 10px;border:1px solid ${TENANT.p1};font-size:10px">Datum a čas</th><th style="background:${TENANT.p1deep};color:#fff;padding:6px 10px;border:1px solid ${TENANT.p1};font-size:10px">Uživatel</th><th style="background:${TENANT.p1deep};color:#fff;padding:6px 10px;border:1px solid ${TENANT.p1};font-size:10px">Detail změn</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
              const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `historie_${row.cislo_stavby||row.id}_${new Date().toISOString().slice(0,10)}.xls`; a.click();
            }} style={{ padding: "7px 14px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 7, color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📊 Excel</button>
          </div>
          <button onClick={onClose} style={{ padding: "8px 20px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Zavřít</button>
        </div>

        {deleteId && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: TENANT.modalBg, borderRadius: 14, padding: "28px 32px", width: 340, border: "1px solid rgba(239,68,68,0.4)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>👁️</div>
              <h3 style={{ color: "#fff", margin: "0 0 8px", fontSize: 15 }}>Skrýt záznam historie?</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", margin: "0 0 22px", fontSize: 13 }}>Záznam bude skryt. Superadmin ho může kdykoli obnovit.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setDeleteId(null)} disabled={deleting} style={{ padding: "9px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer" }}>Zrušit</button>
                <button onClick={() => handleDelete(deleteId)} disabled={deleting} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#d97706,#b45309)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 700 }}>{deleting ? "Skrývám..." : "Skrýt"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
