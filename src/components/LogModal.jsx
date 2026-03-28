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

const AKCE_ZAKÁZKY = ["Přidání stavby","Editace stavby","Smazání stavby"];

const AKCE_STYLE = {
  "Přidání stavby": { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.35)",  color: "#4ade80", pdfBg: "#dcfce7", pdfColor: "#166534" },
  "Editace stavby": { bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.35)", color: "#fbbf24", pdfBg: "#fef9c3", pdfColor: "#854D0E" },
  "Smazání stavby": { bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.35)",  color: "#f87171", pdfBg: "#fee2e2", pdfColor: "#991B1B" },
};

export function LogModal({ isDark, firmy, onClose, isDemo, isAdmin, isSuperAdmin }) {
  const [zaznamy, setZaznamy]       = useState([]);
  const [loading, setLoading]       = useState(true);
  const [filterUser, setFilterUser] = useState("");
  const [filterAkce, setFilterAkce] = useState("");
  const [filterOd, setFilterOd]     = useState("");
  const [filterDo, setFilterDo]     = useState("");
  const [deleteId, setDeleteId]     = useState(null);
  const [deleting, setDeleting]     = useState(false);
  const [zobrazit, setZobrazit]     = useState("aktivni");
  const [totalLoaded, setTotalLoaded] = useState(0);
  const { pos, onMouseDown: onDragStart } = useDraggable(1100, 580);

  useEffect(() => {
    if (isDemo) { setLoading(false); return; }
    const load = async () => {
      try {
        const hiddenFilter = isSuperAdmin ? "" : "&hidden=eq.false";
        const res = await sb(`log_aktivit?order=cas.desc&limit=10000${hiddenFilter}`);
        const all = res || [];
        setTotalLoaded(all.length);
        setZaznamy(all.filter(r => AKCE_ZAKÁZKY.includes(r.akce)));
      } catch { setZaznamy([]); }
      finally { setLoading(false); }
    };
    load();
  }, [isDemo]);

  const users    = [...new Set(zaznamy.map(r => r.uzivatel).filter(Boolean))];
  const akceList = [...new Set(zaznamy.map(r => r.akce).filter(Boolean))];

  const filtered = zaznamy.filter(r => {
    if (filterUser && r.uzivatel !== filterUser) return false;
    if (filterAkce && r.akce !== filterAkce) return false;
    if (filterOd) { const d = new Date(r.cas), od = new Date(filterOd); if (d < od) return false; }
    if (filterDo) { const d = new Date(r.cas), doo = new Date(filterDo); doo.setHours(23,59,59); if (d > doo) return false; }
    return zobrazit === "aktivni" ? !r.hidden : zobrazit === "skryte" ? r.hidden : true;
  });

  const fmtCas = (cas) => cas ? new Date(cas).toLocaleString("cs-CZ", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "";
  const parseDetail = (d) => { if (!d) return null; try { const s = d.indexOf("{"); return s >= 0 ? JSON.parse(d.slice(s)) : null; } catch { return null; } };

  const handleDeleteLog = async (id) => {
    if (isDemo) return;
    setDeleting(true);
    try {
      await sb(`log_aktivit?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ hidden: true }), prefer: "return=minimal" });
      setZaznamy(prev => prev.map(r => r.id === id ? { ...r, hidden: true } : r));
    } catch(e) { console.warn("Chyba skrytí logu:", e); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  const handleUnhideLog = async (id) => {
    if (!isSuperAdmin || isDemo) return;
    try {
      await sb(`log_aktivit?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ hidden: false }), prefer: "return=minimal" });
      setZaznamy(prev => prev.map(r => r.id === id ? { ...r, hidden: false } : r));
    } catch(e) { console.warn("Chyba obnovení logu:", e); }
  };

  const modalBg = isDark ? TENANT.modalBg : "#fff";
  const textC   = isDark ? "#e2e8f0" : "#1e293b";
  const mutedC  = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";
  const borderC = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const inputS  = { padding: "6px 10px", background: isDark ? TENANT.inputBg : "#f8fafc", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, borderRadius: 7, color: textC, fontSize: 12, outline: "none" };

  const thStyle = (col) => `<th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">${col}</th>`;
  const COLS = ["Akce","Datum a čas","Uživatel","Název stavby","Detail změn"];

  const doXLSX = () => {
    const rows = filtered.map((z, i) => {
      const diff = parseDetail(z.detail);
      const zmeny = diff?.zmeny?.map(x => `${FIELD_LABELS[x.pole]||x.pole}: ${x.stare} → ${x.nove}`).join("; ") || z.detail || "";
      const nazev = diff?.nazev || z.detail?.replace(/^ID:\s*\d+,\s*/,"").split(" {")[0] || "";
      const bg = i%2===0?"#f8fafc":"#fff";
      return `<tr><td style="padding:5px 10px;background:${bg};border:1px solid #E2E8F0;font-size:10px;font-weight:700">${z.akce||""}</td><td style="padding:5px 10px;background:${bg};border:1px solid #E2E8F0;font-size:10px;white-space:nowrap">${fmtCas(z.cas)}</td><td style="padding:5px 10px;background:${bg};border:1px solid #E2E8F0;font-size:10px">${z.uzivatel||""}</td><td style="padding:5px 10px;background:${bg};border:1px solid #E2E8F0;font-size:10px">${nazev}</td><td style="padding:5px 10px;background:${bg};border:1px solid #E2E8F0;font-size:10px">${zmeny}</td></tr>`;
    }).join("");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table><thead><tr>${COLS.map(thStyle).join("")}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `log_zakazek_${new Date().toISOString().slice(0,10)}.xls`; a.click();
  };

  const doXLSColor = () => {
    const rows = filtered.map((z, i) => {
      const st = AKCE_STYLE[z.akce] || {};
      const diff = parseDetail(z.detail);
      const zmeny = diff?.zmeny?.map(x => `${FIELD_LABELS[x.pole]||x.pole}: ${x.stare} → ${x.nove}`).join("; ") || z.detail || "";
      const nazev = diff?.nazev || z.detail?.replace(/^ID:\s*\d+,\s*/,"").split(" {")[0] || "";
      const bg = i%2===0?"#f8fafc":"#fff";
      return `<tr><td style="padding:5px 10px;background:${st.pdfBg||bg};color:${st.pdfColor||"#1e293b"};font-weight:700;border:1px solid #E2E8F0;white-space:nowrap;font-size:10px">${z.akce||""}</td><td style="padding:5px 10px;background:${bg};border:1px solid #E2E8F0;white-space:nowrap;font-size:10px">${fmtCas(z.cas)}</td><td style="padding:5px 10px;background:${bg};border:1px solid #E2E8F0;font-size:10px">${z.uzivatel||""}</td><td style="padding:5px 10px;background:${bg};border:1px solid #E2E8F0;font-size:10px">${nazev}</td><td style="padding:5px 10px;background:${bg};border:1px solid #E2E8F0;font-size:10px">${zmeny}</td></tr>`;
    }).join("");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table><thead><tr>${COLS.map(thStyle).join("")}</tr></thead><tbody>${rows}</tbody></table></body></html>`;
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `log_zakazek_barevny_${new Date().toISOString().slice(0,10)}.xls`; a.click();
  };

  const doPDF = () => {
    const rows = filtered.map((z, i) => {
      const st = AKCE_STYLE[z.akce] || {};
      const diff = parseDetail(z.detail);
      const zmenyHtml = diff?.zmeny?.length
        ? `<div style="margin-top:4px;font-size:9px">${diff.zmeny.map(x=>`<span style="color:#64748b">${FIELD_LABELS[x.pole]||x.pole}:</span> <span style="color:#991b1b">${x.stare}</span> → <span style="color:#166534">${x.nove}</span>`).join(" &nbsp;|&nbsp; ")}</div>`
        : `<div style="color:#64748b;font-size:9px">${z.detail||""}</div>`;
      const nazev = diff?.nazev || z.detail?.replace(/^ID:\s*\d+,\s*/,"").split(" {")[0] || "";
      const bg = i%2===0?"#f8fafc":"#fff";
      return `<tr><td style="padding:6px 8px;background:${st.pdfBg||bg};color:${st.pdfColor||"#1e293b"};font-weight:700;border:1px solid #e2e8f0;white-space:nowrap;font-size:10px;vertical-align:top">${z.akce||""}</td><td style="padding:6px 8px;background:${bg};border:1px solid #e2e8f0;white-space:nowrap;font-size:10px;vertical-align:top">${fmtCas(z.cas)}</td><td style="padding:6px 8px;background:${bg};border:1px solid #e2e8f0;font-size:10px;vertical-align:top">${z.uzivatel||""}</td><td style="padding:6px 8px;background:${bg};border:1px solid #e2e8f0;font-size:10px;vertical-align:top"><div style="font-weight:600">${nazev}</div>${zmenyHtml}</td></tr>`;
    }).join("");
    const w = window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Log zakázek</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}table{width:100%;border-collapse:collapse}th{background:${TENANT.p1deep};color:#fff;padding:7px 10px;text-align:left;font-size:10px}@media print{button{display:none}}</style></head><body><h2>📜 Log zakázek – ${TENANT.nazev}</h2><p>Vygenerováno: ${new Date().toLocaleDateString("cs-CZ")} | ${filtered.length} záznamů</p><table><thead><tr><th>Akce</th><th>Datum a čas</th><th>Uživatel</th><th>Název stavby / Detail</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>`);
    w.document.close();
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1250, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ position: "fixed", left: pos.x, top: pos.y, pointerEvents: "all", background: modalBg, borderRadius: 16, width: "min(1100px,98vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}`, boxShadow: "0 32px 80px rgba(0,0,0,0.65)" }}>

        <div onMouseDown={onDragStart} style={dragHeaderStyle()}>
          <div>
            <span style={{ color: isDark ? "#fff" : "#1e293b", fontWeight: 700, fontSize: 15 }}>📜 Log zakázek{dragHint}</span>
            <div style={{ color: mutedC, fontSize: 12, marginTop: 2 }}>Přidání · Editace · Smazání staveb</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isSuperAdmin && (
              <div style={{ display: "flex", background: "rgba(255,255,255,0.06)", borderRadius: 7, overflow: "hidden", border: "1px solid rgba(255,255,255,0.1)" }}>
                {[["aktivni","Aktivní"],["skryte","Skryté"],["vse","Vše"]].map(([val, label]) => (
                  <button key={val} onClick={() => setZobrazit(val)} onMouseDown={e => e.stopPropagation()} style={{ padding: "4px 10px", background: zobrazit === val ? tc1(0.4) : "transparent", border: "none", color: zobrazit === val ? TENANT.p3 : mutedC, cursor: "pointer", fontSize: 11, fontWeight: zobrazit === val ? 700 : 400 }}>{label}</button>
                ))}
              </div>
            )}
            <button onClick={onClose} onMouseDown={e => e.stopPropagation()} style={{ background: "none", border: "none", color: mutedC, fontSize: 20, cursor: "pointer" }}>✕</button>
          </div>
        </div>

        {/* RLS varování */}
        {!loading && totalLoaded > 0 && zaznamy.length > 0 && (() => {
          const uniqueUsers = new Set(zaznamy.map(r => r.uzivatel).filter(Boolean));
          if (uniqueUsers.size <= 1 && !isSuperAdmin) return (
            <div style={{ margin: "10px 22px 0", padding: "10px 14px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 8, fontSize: 11, color: "#fbbf24", display: "flex", gap: 10, alignItems: "flex-start" }}>
              <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: 700, marginBottom: 4 }}>Vidíte jen záznamy jednoho uživatele — pravděpodobně blokuje RLS v Supabase.</div>
                <div style={{ color: "rgba(251,191,36,0.8)", marginBottom: 6 }}>Spusťte v Supabase Dashboard → SQL Editor:</div>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <code style={{ background: "rgba(0,0,0,0.3)", padding: "4px 10px", borderRadius: 5, fontFamily: "monospace", fontSize: 10, color: "#fff", flex: 1 }}>CREATE POLICY "admin_read_all" ON log_aktivit FOR SELECT USING (true);</code>
                  <button onClick={() => navigator.clipboard.writeText('CREATE POLICY "admin_read_all" ON log_aktivit FOR SELECT USING (true);')} style={{ padding: "4px 10px", background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 5, color: "#fbbf24", cursor: "pointer", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>📋 Kopírovat</button>
                </div>
              </div>
            </div>
          );
          return null;
        })()}

        <div style={{ padding: "10px 22px", borderBottom: `1px solid ${borderC}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={inputS}><option value="">Všichni uživatelé</option>{users.map(u => <option key={u} value={u}>{u}</option>)}</select>
          <select value={filterAkce} onChange={e => setFilterAkce(e.target.value)} style={inputS}><option value="">Všechny akce</option>{akceList.map(a => <option key={a} value={a}>{a}</option>)}</select>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: mutedC, fontSize: 12 }}>Od:</span><input type="date" value={filterOd} onChange={e => setFilterOd(e.target.value)} style={inputS} /></div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}><span style={{ color: mutedC, fontSize: 12 }}>Do:</span><input type="date" value={filterDo} onChange={e => setFilterDo(e.target.value)} style={inputS} /></div>
          {(filterUser||filterAkce||filterOd||filterDo) && (
            <button onClick={() => { setFilterUser(""); setFilterAkce(""); setFilterOd(""); setFilterDo(""); }} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 12 }}>✕ Reset</button>
          )}
          <span style={{ marginLeft: "auto", color: mutedC, fontSize: 12, fontWeight: 600 }}>{filtered.length} záznamů</span>
        </div>

        <div style={{ overflowY: "auto", flex: 1, padding: "12px 22px" }}>
          {loading && <div style={{ textAlign: "center", color: mutedC, padding: 40 }}>Načítám log...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              <div style={{ color: mutedC, fontSize: 14 }}>{isDemo ? "Demo režim — log se neukládá" : "Žádné záznamy"}</div>
            </div>
          )}
          {!loading && filtered.map((z, i) => {
            const st       = AKCE_STYLE[z.akce] || { bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)", color: "#94a3b8" };
            const diff     = parseDetail(z.detail);
            const nazev    = diff?.nazev || z.detail?.replace(/^ID:\s*\d+,\s*/,"").split(" {")[0] || "";
            const isHidden = z.hidden;
            return (
              <div key={i} style={{ marginBottom: 8, padding: "10px 14px", background: isHidden ? "rgba(100,116,139,0.06)" : st.bg, border: `1px solid ${isHidden ? "rgba(100,116,139,0.2)" : st.border}`, borderRadius: 9, opacity: isHidden ? 0.6 : 1 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                    <span style={{ color: isHidden ? mutedC : st.color, fontWeight: 700, fontSize: 12 }}>{z.akce}</span>
                    {nazev && <span style={{ color: textC, fontSize: 12, fontWeight: 600 }}>· {nazev}</span>}
                    <span style={{ color: mutedC, fontSize: 11 }}>— {z.uzivatel}</span>
                    {isHidden && <span style={{ fontSize: 10, color: mutedC, background: "rgba(100,116,139,0.15)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>skryto</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ color: mutedC, fontSize: 11, whiteSpace: "nowrap" }}>{fmtCas(z.cas)}</span>
                    {isSuperAdmin && isHidden && !isDemo && (
                      <button onClick={() => handleUnhideLog(z.id)} style={{ background: "none", border: "none", color: "rgba(34,197,94,0.5)", cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 700 }}
                        onMouseEnter={e => e.currentTarget.style.color="#4ade80"} onMouseLeave={e => e.currentTarget.style.color="rgba(34,197,94,0.5)"}>↩</button>
                    )}
                    {isSuperAdmin && !isHidden && !isDemo && (
                      <button onClick={() => setDeleteId(z.id)} style={{ background: "none", border: "none", color: "rgba(239,68,68,0.4)", cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 700 }}
                        onMouseEnter={e => e.currentTarget.style.color="#f87171"} onMouseLeave={e => e.currentTarget.style.color="rgba(239,68,68,0.4)"}>✕</button>
                    )}
                  </div>
                </div>
                {diff?.zmeny?.length > 0 && (
                  <div style={{ marginTop: 6, display: "flex", flexWrap: "wrap", gap: "4px 14px" }}>
                    {diff.zmeny.map((x, j) => (
                      <span key={j} style={{ fontSize: 11, color: mutedC }}>
                        <span style={{ fontWeight: 600, color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)" }}>{FIELD_LABELS[x.pole]||x.pole}:</span>{" "}
                        <span style={{ color: "#f87171" }}>{String(x.stare||"–")}</span>{" → "}
                        <span style={{ color: "#4ade80" }}>{String(x.nove||"–")}</span>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "12px 22px", borderTop: `1px solid ${borderC}`, display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={doXLSX}     style={{ padding: "7px 14px", background: "rgba(34,197,94,0.12)",  border: "1px solid rgba(34,197,94,0.3)",  borderRadius: 7, color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📊 XLSX</button>
            <button onClick={doXLSColor} style={{ padding: "7px 14px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 7, color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🎨 Barevný Excel</button>
            <button onClick={doPDF}      style={{ padding: "7px 14px", background: "rgba(239,68,68,0.12)",  border: "1px solid rgba(239,68,68,0.3)",  borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🖨️ PDF tisk</button>
          </div>
          <button onClick={onClose} style={{ padding: "8px 20px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Zavřít</button>
        </div>

        {deleteId && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9200, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <div style={{ background: TENANT.modalBg, borderRadius: 14, padding: "28px 32px", width: 340, border: "1px solid rgba(239,68,68,0.4)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)", textAlign: "center" }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>👁️</div>
              <h3 style={{ color: "#fff", margin: "0 0 8px", fontSize: 15 }}>Skrýt záznam logu?</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", margin: "0 0 22px", fontSize: 13 }}>Záznam bude skryt. Superadmin ho může kdykoli obnovit přes přepínač Skryté.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setDeleteId(null)} disabled={deleting} style={{ padding: "9px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer" }}>Zrušit</button>
                <button onClick={() => handleDeleteLog(deleteId)} disabled={deleting} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#d97706,#b45309)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 700 }}>{deleting ? "Skrývám..." : "Skrýt"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
