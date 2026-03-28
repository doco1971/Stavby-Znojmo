import { useState, useEffect, useRef } from "react";
import { TENANT, IS_JIHLAVA, tc1, tc2 } from "../utils/tenant";
import { sb } from "../utils/supabase";
import { inputSx, COLUMNS } from "../utils/constants";
import { useDraggable, dragHeaderStyle, dragHint } from "../hooks/useDraggable";

// ── Sdílené sub-komponenty ────────────────────────────────
function Lbl({ children }) {
  return <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 5, textTransform: "uppercase" }}>{children}</div>;
}

function ListEditor({ label, color, list, setList, nv, setNv, isDark }) {
  const bg      = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const border  = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textC   = isDark ? "#e2e8f0" : "#1e293b";
  const mutedC  = isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
  const [drag, setDrag] = useState(null);
  const add = () => { const v = nv.trim(); if (v && !list.includes(v)) { setList([...list, v]); setNv(""); } };
  return (
    <div style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ color, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12, borderLeft: `3px solid ${color}`, paddingLeft: 8 }}>{label.toUpperCase()}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input value={nv} onChange={e => setNv(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} placeholder={`Nový ${label.toLowerCase()}...`} style={{ flex: 1, padding: "7px 10px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${border}`, borderRadius: 7, color: textC, fontSize: 12, outline: "none" }} />
        <button onClick={add} style={{ padding: "7px 14px", background: `${color}22`, border: `1px solid ${color}55`, borderRadius: 7, color, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {list.map((item, i) => (
          <div key={i} draggable onDragStart={() => setDrag(i)} onDragOver={e => e.preventDefault()} onDrop={() => { if (drag === null || drag === i) return; const n=[...list]; const [m]=n.splice(drag,1); n.splice(i,0,m); setList(n); setDrag(null); }}
            style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderRadius: 7, border: `1px solid ${border}`, cursor: "grab" }}>
            <span style={{ color: mutedC, fontSize: 13 }}>⠿</span>
            <span style={{ flex: 1, color: textC, fontSize: 13 }}>{item}</span>
            <button onClick={() => setList(list.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>✕</button>
          </div>
        ))}
      </div>
    </div>
  );
}

function FirmyEditor({ list, setList, isDark, onNvChange, stavbyData }) {
  const [nv, setNv]     = useState("");
  const [color, setColor] = useState(TENANT.p2);
  const [drag, setDrag] = useState(null);
  const bg    = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const border= isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const textC = isDark ? "#e2e8f0" : "#1e293b";
  const mutedC= isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)";
  const add = () => {
    const v = nv.trim();
    if (v && !list.find(f => f.hodnota === v)) { setList([...list, { hodnota: v, barva: color }]); setNv(""); onNvChange(""); }
  };
  return (
    <div style={{ flex: 1, background: bg, border: `1px solid ${border}`, borderRadius: 12, padding: 16 }}>
      <div style={{ color: TENANT.p3, fontSize: 12, fontWeight: 700, letterSpacing: 0.5, marginBottom: 12, borderLeft: `3px solid ${TENANT.p1}`, paddingLeft: 8 }}>FIRMY</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input value={nv} onChange={e => { setNv(e.target.value); onNvChange(e.target.value); }} onKeyDown={e => e.key === "Enter" && add()} placeholder="Název firmy..." style={{ flex: 1, padding: "7px 10px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${border}`, borderRadius: 7, color: textC, fontSize: 12, outline: "none" }} />
        <input type="color" value={color} onChange={e => setColor(e.target.value)} style={{ width: 36, height: 34, padding: 2, border: `1px solid ${border}`, borderRadius: 7, background: "transparent", cursor: "pointer" }} />
        <button onClick={add} style={{ padding: "7px 14px", background: `${TENANT.p1}33`, border: `1px solid ${TENANT.p1}66`, borderRadius: 7, color: TENANT.p3, cursor: "pointer", fontSize: 13, fontWeight: 700 }}>+</button>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
        {list.map((firma, i) => {
          const usedCount = stavbyData ? stavbyData.filter(r => r.firma === firma.hodnota).length : 0;
          return (
            <div key={i} draggable onDragStart={() => setDrag(i)} onDragOver={e => e.preventDefault()} onDrop={() => { if (drag===null||drag===i) return; const n=[...list]; const [m]=n.splice(drag,1); n.splice(i,0,m); setList(n); setDrag(null); }}
              style={{ display: "flex", alignItems: "center", gap: 7, padding: "6px 10px", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderRadius: 7, border: `1px solid ${border}`, cursor: "grab" }}>
              <span style={{ color: mutedC, fontSize: 13 }}>⠿</span>
              <div style={{ width: 14, height: 14, borderRadius: "50%", background: firma.barva, flexShrink: 0 }} />
              <span style={{ flex: 1, color: textC, fontSize: 13 }}>{firma.hodnota}</span>
              {usedCount > 0 && <span style={{ color: mutedC, fontSize: 11 }}>{usedCount}×</span>}
              <input type="color" value={firma.barva || "#3b82f6"} onChange={e => setList(list.map((f, j) => j === i ? { ...f, barva: e.target.value } : f))} style={{ width: 28, height: 24, padding: 1, border: "none", borderRadius: 5, background: "transparent", cursor: "pointer" }} />
              <button onClick={() => setList(list.filter((_, j) => j !== i))} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 15, lineHeight: 1 }}>✕</button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Hlavní SettingsModal ──────────────────────────────────
export function SettingsModal({ firmy, objednatele, stavbyvedouci, users, onChange, onChangeUsers, onClose, onLoadLog, isAdmin, isSuperAdmin, isDark, appVerze, appDatum, onSaveAppInfo, stavbyData, onResetColWidths, onResetColOrder, isDemo, notifyEmails, onSaveNotifyEmails, slozkaRole, onSaveSlozkaRole, extensionReady, protokolReady = false, autoZaloha = true, onSaveAutoZaloha, zalohaRole = "superadmin", onSaveZalohaRole, onImportXLS, onImportJI, autoLogoutMinutesProp = 15, onSaveAutoLogoutMinutes, appNazevProp = "Stavby Znojmo", onSaveAppNazev, deadlineDaysProp = 30, onSaveDeadlineDays, demoMaxStavbyProp = 15, onSaveDemoMaxStavby, povinnaPole = {}, onSavePovinnaPole, prefixEnabled = false, prefixValue = "ZN-", onSaveCisloPrefix, sloupceRole = {}, onSaveSloupceRole }) {
  const [tab, setTab] = useState("ciselniky");
  const [importJIKatPoleLocal, setImportJIKatPoleLocal] = useState("ps_i");
  const [f, setF] = useState([...firmy]);
  const [o, setO] = useState([...objednatele]);
  const [s, setS] = useState([...stavbyvedouci]);
  const [newF, setNewF] = useState("");
  const [newO, setNewO] = useState("");
  const [newS, setNewS] = useState("");
  const [pendingWarn, setPendingWarn] = useState(null);
  const [localLogData, setLocalLogData] = useState([]);
  const [logFilterUser, setLogFilterUser] = useState("");
  const [logFilterAkce, setLogFilterAkce] = useState("");
  const [logZobrazit, setLogZobrazit] = useState("aktivni");

  const localLogFiltered = localLogData.filter(r => {
    if (logFilterUser && r.uzivatel !== logFilterUser) return false;
    if (logFilterAkce && r.akce !== logFilterAkce) return false;
    if (logZobrazit === "aktivni") return !r.hidden;
    if (logZobrazit === "skryte") return r.hidden;
    return true;
  });

  const [uList, setUList]           = useState(users.map(u => ({ ...u })));
  const [newEmail, setNewEmail]     = useState("");
  const [newPass, setNewPass]       = useState("");
  const [newRole, setNewRole]       = useState("user");
  const [newName, setNewName]       = useState("");
  const [userErr, setUserErr]       = useState("");
  const [editUserId, setEditUserId] = useState(null);
  const [editUserPass, setEditUserPass] = useState("");
  const [editUserRole, setEditUserRole] = useState("");

  const addUser = () => {
    setUserErr("");
    if (!newEmail.trim() || !newPass.trim() || !newName.trim()) { setUserErr("Vyplň jméno, email a heslo."); return; }
    if (uList.find(u => u.email === newEmail.trim())) { setUserErr("Uživatel s tímto emailem již existuje."); return; }
    const nextId = uList.length > 0 ? Math.max(...uList.map(u => u.id)) + 1 : 1;
    setUList([...uList, { id: nextId, email: newEmail.trim(), password: newPass.trim(), role: newRole, name: newName.trim() }]);
    setNewEmail(""); setNewPass(""); setNewName(""); setNewRole("user");
  };

  const handleLoadLog = async () => {
    if (isDemo) { setLocalLogData([]); return; }
    try { const res = await onLoadLog(isSuperAdmin); setLocalLogData(Array.isArray(res) ? res : []); }
    catch(e) { setLocalLogData([]); }
  };

  const [logDeleteId, setLogDeleteId] = useState(null);
  const [logDeleting, setLogDeleting] = useState(false);

  const handleDeleteLogSettings = async (id) => {
    if (isDemo) return;
    setLogDeleting(true);
    try {
      await sb(`log_aktivit?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ hidden: true }), prefer: "return=minimal" });
      setLocalLogData(prev => prev.map(r => r.id === id ? { ...r, hidden: true } : r));
    } catch(e) { console.warn("Chyba skrytí:", e); }
    finally { setLogDeleting(false); setLogDeleteId(null); }
  };

  const handleUnhideLogSettings = async (id) => {
    if (!isSuperAdmin || isDemo) return;
    try {
      await sb(`log_aktivit?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ hidden: false }), prefer: "return=minimal" });
      setLocalLogData(prev => prev.map(r => r.id === id ? { ...r, hidden: false } : r));
    } catch(e) { console.warn("Chyba obnovení:", e); }
  };

  useEffect(() => { if (tab === "log") handleLoadLog(); }, [tab]);

  const fmtCas = (cas) => new Date(cas).toLocaleString("cs-CZ", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
  const AKCE_COLOR = { "Přihlášení": TENANT.p3, "Přidání stavby":"#4ade80", "Editace stavby":"#fbbf24", "Smazání stavby":"#f87171", "Nastavení":"#c084fc" };

  const tabs = [
    { key: "ciselniky", label: "📋 Číselníky" },
    ...(isAdmin ? [{ key: "uzivatele", label: "👥 Uživatelé" }] : []),
    ...(isAdmin ? [{ key: "log",       label: "📜 Log aktivit" }] : []),
    ...(isSuperAdmin ? [{ key: "aplikace", label: "⚙️ Aplikace" }] : []),
  ];

  const [editVerze, setEditVerze]               = useState(appVerze);
  const [confirmResetCols, setConfirmResetCols] = useState(false);
  const [editDatum, setEditDatum]               = useState(appDatum);
  const [editNotifyEmails, setEditNotifyEmails] = useState(notifyEmails || "");
  const [editSlozkaRole, setEditSlozkaRole]     = useState(slozkaRole || "admin");
  const [editAutoLogout, setEditAutoLogout]     = useState(String(autoLogoutMinutesProp || 15));
  const [editAppNazev, setEditAppNazev]         = useState(appNazevProp || "Stavby Znojmo");
  const [editDeadlineDays, setEditDeadlineDays] = useState(String(deadlineDaysProp || 30));
  const [editDemoMax, setEditDemoMax]           = useState(String(demoMaxStavbyProp ?? 15));
  const [editPovinnaPole, setEditPovinnaPole]   = useState({ ...povinnaPole });
  const [editPrefixEnabled, setEditPrefixEnabled] = useState(prefixEnabled);
  const [editPrefixValue, setEditPrefixValue]   = useState(prefixValue || "ZN-");
  const [editSloupceRole, setEditSloupceRole]   = useState({ ...sloupceRole });

  // Drag & drop karet v záložce Aplikace
  const DEFAULT_CARDS_ORDER = [
    ["slozka","zaloha","viditelnost"],
    ["nazev","timeout","terminy","demo"],
    ["prefix","povinna","email","verze","sirky","import"]
  ];
  const [cardsOrder, setCardsOrder] = useState(() => {
    try { const saved = JSON.parse(localStorage.getItem("aplikace_layout") || "null"); if (Array.isArray(saved) && saved.length > 0 && Array.isArray(saved[0])) return saved; } catch {}
    return DEFAULT_CARDS_ORDER;
  });
  const [appCardsCols, setAppCardsCols] = useState(() => {
    try { const v = parseInt(localStorage.getItem("aplikace_cols") || "3"); return (v >= 1 && v <= 5) ? v : 3; } catch { return 3; }
  });
  const dragCardRef  = useRef(null);
  const dragOverRef  = useRef(null);
  const [dragOverCard, setDragOverCard]     = useState(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  const handleCardDragStart = (e, id) => { dragCardRef.current=id; dragOverRef.current=null; setIsDraggingCard(true); e.dataTransfer.effectAllowed="move"; e.dataTransfer.setData("text/plain",id); };
  const handleCardDragEnter = (e, targetId) => { e.preventDefault(); if (dragCardRef.current && dragCardRef.current !== targetId) { dragOverRef.current=targetId; setDragOverCard(targetId); } };
  const handleCardDragOver  = (e) => { e.preventDefault(); };
  const handleCardDrop = (e, targetId) => {
    e.preventDefault(); e.stopPropagation();
    const srcId = e.dataTransfer.getData("text/plain") || dragCardRef.current;
    dragCardRef.current = null;
    if (!srcId || srcId === targetId) return;
    setCardsOrder(prev => {
      let srcCol=-1, srcIdx=-1, tgtCol=-1, tgtIdx=-1;
      prev.forEach((col, ci) => { const si=col.indexOf(srcId); if(si!==-1){srcCol=ci;srcIdx=si;}; const ti=col.indexOf(targetId); if(ti!==-1){tgtCol=ci;tgtIdx=ti;}; });
      if (srcCol===-1||tgtCol===-1) return prev;
      const next = prev.map(col => [...col]);
      next[srcCol].splice(srcIdx,1);
      const newTgtIdx = next[tgtCol].indexOf(targetId);
      next[tgtCol].splice(newTgtIdx===-1?tgtIdx:newTgtIdx,0,srcId);
      try { localStorage.setItem("aplikace_layout", JSON.stringify(next)); } catch {}
      return next;
    });
    dragOverRef.current=null; setDragOverCard(null); setIsDraggingCard(false);
  };
  const handleCardDragEnd = () => { dragOverRef.current=null; setDragOverCard(null); setIsDraggingCard(false); setTimeout(() => { dragCardRef.current=null; }, 100); };
  const resetCardsOrder = () => { setCardsOrder(DEFAULT_CARDS_ORDER); setAppCardsCols(3); try { localStorage.removeItem("aplikace_layout"); localStorage.setItem("aplikace_cols","3"); } catch {} };

  const modalBg      = isDark ? TENANT.modalBg : "#ffffff";
  const modalBorder  = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const modalText    = isDark ? "#fff" : "#1e293b";
  const modalMuted   = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const modalDivider = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const modalCardBg  = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const settingsWidth = tab === "aplikace" ? Math.max(1000, appCardsCols * 320) : 1000;
  const { pos, onMouseDown: onDragStart, reset: resetSettingsPos } = useDraggable(settingsWidth, 560);
  useEffect(() => { resetSettingsPos(settingsWidth); }, [tab, appCardsCols, settingsWidth]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ position: "fixed", left: pos.x, top: pos.y, pointerEvents: "all", background: modalBg, borderRadius: 16, width: `min(${settingsWidth}px, 98vw)`, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", border: `1px solid ${modalBorder}`, boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>

        <div onMouseDown={onDragStart} style={dragHeaderStyle()}>
          <span style={{ color: modalText, fontWeight: 700, fontSize: 17 }}>⚙️ Nastavení{dragHint}</span>
          <button onClick={onClose} onMouseDown={e => e.stopPropagation()} style={{ background: "none", border: "none", color: modalMuted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        <div onMouseDown={e => e.stopPropagation()} style={{ display: "flex", gap: 4, padding: "10px 24px 0", borderBottom: `1px solid ${modalDivider}` }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "8px 18px", background: tab===t.key ? tc1(0.2) : "transparent", border: "none", borderBottom: tab===t.key ? `2px solid ${TENANT.p1}` : "2px solid transparent", borderRadius: "6px 6px 0 0", color: tab===t.key ? TENANT.p3 : modalMuted, cursor: "pointer", fontSize: 13, fontWeight: tab===t.key ? 700 : 400 }}>{t.label}</button>
          ))}
        </div>

        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1, background: modalBg }}>

          {/* TAB: ČÍSELNÍKY */}
          {tab === "ciselniky" && (
            <div style={{ display: "flex", gap: 20 }}>
              <FirmyEditor list={f} setList={setF} isDark={isDark} onNvChange={v => setNewF(v)} stavbyData={stavbyData} />
              <ListEditor label="Objednatelé"  color="#34d399" list={o} setList={setO} nv={newO} setNv={setNewO} isDark={isDark} />
              <ListEditor label="Stavbyvedoucí" color="#f472b6" list={s} setList={setS} nv={newS} setNv={setNewS} isDark={isDark} />
            </div>
          )}

          {/* TAB: UŽIVATELÉ */}
          {tab === "uzivatele" && (
            <div>
              <div style={{ background: modalCardBg, border: `1px solid ${modalBorder}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ color: TENANT.p3, fontWeight: 700, fontSize: 12, letterSpacing: 0.5, marginBottom: 12, borderLeft: `3px solid ${TENANT.p1}`, paddingLeft: 8 }}>PŘIDAT UŽIVATELE</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px", gap: 10, marginBottom: 10 }}>
                  <div><Lbl>Jméno</Lbl><input value={newName}  onChange={e=>setNewName(e.target.value)}  placeholder="Jan Novák"    style={inputSx}/></div>
                  <div><Lbl>Email</Lbl><input value={newEmail} onChange={e=>setNewEmail(e.target.value)} placeholder="jan@firma.cz" style={inputSx}/></div>
                  <div><Lbl>Heslo</Lbl><input type="password" value={newPass} onChange={e=>setNewPass(e.target.value)} placeholder="••••••••" style={inputSx}/></div>
                  <div>
                    <Lbl>Role</Lbl>
                    <div style={{ position: "relative" }}>
                      <select value={newRole} onChange={e=>setNewRole(e.target.value)} style={{ ...inputSx, appearance:"none", cursor:"pointer" }}>
                        <option value="user"   style={{ background: TENANT.modalBg }}>User</option>
                        <option value="user_e" style={{ background: TENANT.modalBg }}>User Editor</option>
                        <option value="admin"  style={{ background: TENANT.modalBg }}>Admin</option>
                      </select>
                      <span style={{ position:"absolute", right:8, top:"50%", transform:"translateY(-50%)", color:"rgba(255,255,255,0.4)", pointerEvents:"none", fontSize:10 }}>▼</span>
                    </div>
                  </div>
                </div>
                {userErr && <div style={{ color:"#f87171", fontSize:12, marginBottom:8 }}>⚠ {userErr}</div>}
                <button onClick={addUser} style={{ padding:"8px 18px", background:"linear-gradient(135deg,#16a34a,#15803d)", border:"none", borderRadius:7, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>+ Přidat uživatele</button>
              </div>
              <div style={{ color:"rgba(255,255,255,0.4)", fontSize:11, fontWeight:700, letterSpacing:0.8, marginBottom:10 }}>SEZNAM UŽIVATELŮ</div>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {uList.filter(u => !isAdmin||isSuperAdmin ? true : u.role!=="superadmin").map(u => {
                  const roleLabel = u.role==="superadmin"?"SUPERADMIN":u.role==="admin"?"ADMIN":u.role==="user_e"?"USER EDITOR":"USER";
                  const roleColor = u.role==="superadmin"?"#c084fc":u.role==="admin"?"#fbbf24":u.role==="user_e"?"#4ade80":"#94a3b8";
                  const roleBg    = u.role==="superadmin"?"rgba(168,85,247,0.2)":u.role==="admin"?"rgba(245,158,11,0.2)":u.role==="user_e"?"rgba(34,197,94,0.15)":"rgba(100,116,139,0.15)";
                  const icon      = u.role==="superadmin"?"⚡":u.role==="admin"?"👑":u.role==="user_e"?"✏️":"👤";
                  return (
                    <div key={u.id}>
                      <div style={{ display:"flex", alignItems:"center", gap:12, padding:"10px 14px", background:"rgba(255,255,255,0.03)", borderRadius:8, border:"1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ width:32, height:32, borderRadius:"50%", background:roleBg, display:"flex", alignItems:"center", justifyContent:"center", fontSize:14 }}>{icon}</div>
                        <div style={{ flex:1 }}>
                          <div style={{ color:modalText, fontSize:13, fontWeight:600 }}>{u.name}</div>
                          <div style={{ color:"rgba(255,255,255,0.35)", fontSize:11 }}>{u.email}</div>
                        </div>
                        <span style={{ padding:"2px 8px", borderRadius:6, fontSize:11, fontWeight:700, background:roleBg, color:roleColor }}>{roleLabel}</span>
                        <button onClick={() => { setEditUserId(editUserId===u.id?null:u.id); setEditUserPass(""); setEditUserRole(u.role); }} style={{ background:"none", border:"none", color:editUserId===u.id?"#fbbf24":TENANT.p3, cursor:"pointer", fontSize:14, padding:"0 4px" }}>✏️</button>
                        <button onClick={() => setUList(uList.filter(x=>x.id!==u.id))} style={{ background:"none", border:"none", color:"#f87171", cursor:"pointer", fontSize:16, padding:"0 4px" }}>✕</button>
                      </div>
                      {editUserId===u.id && (
                        <div style={{ margin:"4px 0 2px", padding:"10px 14px", background:tc1(0.08), borderRadius:8, border:`1px solid ${tc1(0.2)}`, display:"flex", flexDirection:"column", gap:8 }}>
                          <div style={{ color:TENANT.p3, fontSize:11, fontWeight:700 }}>UPRAVIT UŽIVATELE</div>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <span style={{ color:"rgba(255,255,255,0.4)", fontSize:12, minWidth:70 }}>Nové heslo:</span>
                            <input type="password" value={editUserPass} onChange={e=>setEditUserPass(e.target.value)} placeholder="nové heslo (prázdné = beze změny)" style={{ flex:1, padding:"6px 10px", background:"rgba(255,255,255,0.05)", border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, color:"#fff", fontSize:12 }}/>
                          </div>
                          <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                            <span style={{ color:"rgba(255,255,255,0.4)", fontSize:12, minWidth:70 }}>Role:</span>
                            <select value={editUserRole} onChange={e=>setEditUserRole(e.target.value)} style={{ flex:1, padding:"6px 10px", background:TENANT.modalBg, border:"1px solid rgba(255,255,255,0.15)", borderRadius:6, color:"#fff", fontSize:12 }}>
                              <option value="user">USER</option>
                              <option value="user_e">USER EDITOR</option>
                              <option value="admin">ADMIN</option>
                              {isSuperAdmin && <option value="superadmin">SUPERADMIN</option>}
                            </select>
                          </div>
                          <div style={{ display:"flex", gap:8 }}>
                            <button onClick={() => { setUList(uList.map(x=>x.id===u.id?{...x,password:editUserPass.trim()||x.password,role:editUserRole}:x)); setEditUserId(null); }} style={{ padding:"6px 14px", background:TENANT.btnBg, border:"none", borderRadius:6, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>💾 Uložit</button>
                            <button onClick={() => setEditUserId(null)} style={{ padding:"6px 14px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:6, color:"rgba(255,255,255,0.5)", cursor:"pointer", fontSize:12 }}>Zrušit</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB: APLIKACE */}
          {tab === "aplikace" && isSuperAdmin && (() => {
            const CARDS = {
              slozka: { title: "💡 TLAČÍTKO SLOŽKA", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Kdo vidí tlačítko 💡 u každé stavby pro otevření složky zakázky.</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:12 }}>
                    {[["superadmin","Superadmin"],["admin","Admin+"],["user_e","Editor+"],["user","Všichni"]].map(([val,label]) => (
                      <button key={val} onClick={() => { setEditSlozkaRole(val); onSaveSlozkaRole(val); }} style={{ padding:"6px 11px", background:editSlozkaRole===val?"rgba(251,191,36,0.25)":(isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"), border:`1px solid ${editSlozkaRole===val?"rgba(251,191,36,0.6)":modalBorder}`, borderRadius:7, color:editSlozkaRole===val?"#fbbf24":modalMuted, cursor:"pointer", fontSize:12, fontWeight:editSlozkaRole===val?700:400 }}>{label}</button>
                    ))}
                  </div>
                  <div style={{ padding:"10px 12px", background:protokolReady?"rgba(16,185,129,0.08)":"rgba(251,191,36,0.06)", border:`1px solid ${protokolReady?"rgba(16,185,129,0.3)":"rgba(251,191,36,0.2)"}`, borderRadius:8, marginBottom:8 }}>
                    <div style={{ color:protokolReady?"#34d399":"#fbbf24", fontSize:12, fontWeight:700, marginBottom:4 }}>{protokolReady?"✅ Stavby Helper aktivní":"⚠️ Nutná jednorázová instalace Stavby Helper"}</div>
                    <div style={{ color:modalMuted, fontSize:11, marginBottom:protokolReady?0:10 }}>{protokolReady?"Protokol je nainstalován. Klik na 💡 otevře složku přímo v Průzkumníku Windows.":"Stáhněte ZIP, rozbalte a spusťte install.bat (trvá ~10 sekund). Funguje i přes VPN."}</div>
                    {!protokolReady && <a href="/stavby-helper-installer.zip" download style={{ display:"inline-flex", alignItems:"center", gap:7, padding:"8px 16px", background:"linear-gradient(135deg,#d97706,#b45309)", borderRadius:8, color:"#fff", fontSize:12, fontWeight:700, textDecoration:"none" }}>🖥 Stáhnout instalátor (Windows)</a>}
                    {extensionReady && <div style={{ marginTop:6, color:"#34d399", fontSize:11, fontWeight:600 }}>✅ Rozšíření prohlížeče také aktivní</div>}
                  </div>
                </div>
              )},
              zaloha: { title: "💾 ZÁLOHA DO JSON", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Kdo může stáhnout zálohu celé DB.</div>
                  <div style={{ display:"flex", gap:6, flexWrap:"wrap", marginBottom:14 }}>
                    {[["superadmin","Superadmin"],["admin","Admin+"],["user_e","Editor+"],["user","Všichni"]].map(([val,label]) => (
                      <button key={val} onClick={() => onSaveZalohaRole(val)} style={{ padding:"6px 11px", background:zalohaRole===val?"rgba(5,150,105,0.25)":(isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"), border:`1px solid ${zalohaRole===val?"rgba(5,150,105,0.6)":modalBorder}`, borderRadius:7, color:zalohaRole===val?"#34d399":modalMuted, cursor:"pointer", fontSize:12, fontWeight:zalohaRole===val?700:400 }}>{label}</button>
                    ))}
                  </div>
                  <div style={{ borderTop:`1px solid ${modalBorder}`, paddingTop:12 }}>
                    <div style={{ color:modalMuted, fontSize:11, fontWeight:700, marginBottom:8 }}>AUTOMATICKÁ ZÁLOHA</div>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <button onClick={() => onSaveAutoZaloha(!autoZaloha)} style={{ padding:"7px 14px", background:autoZaloha?"linear-gradient(135deg,#059669,#047857)":"rgba(255,255,255,0.05)", border:`1px solid ${autoZaloha?"#059669":modalBorder}`, borderRadius:8, color:autoZaloha?"#fff":modalMuted, cursor:"pointer", fontSize:12, fontWeight:700 }}>{autoZaloha?"✅ Zapnuta":"⚪ Vypnuta"}</button>
                      <div style={{ color:modalMuted, fontSize:11 }}>Při prvním přihlášení superadmina každý den.</div>
                    </div>
                  </div>
                </div>
              )},
              viditelnost: { title: "👁 VIDITELNOST SLOUPCŮ", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Minimální role která vidí daný sloupec. Výchozí = Všichni.</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
                    {COLUMNS.filter(c => !c.hidden && c.key!=="id").map(col => {
                      const LOCKED = ["firma","cislo_stavby","nazev_stavby"];
                      const isLocked = LOCKED.includes(col.key);
                      const curRole = editSloupceRole[col.key] || "user";
                      return (
                        <div key={col.key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:8, padding:"4px 0", borderBottom:`1px solid ${modalBorder}` }}>
                          <span style={{ color:isDark?"#e2e8f0":"#1e293b", fontSize:12, fontWeight:500, minWidth:130, flexShrink:0 }}>{col.label}</span>
                          {isLocked ? <span style={{ color:modalMuted, fontSize:11, fontStyle:"italic" }}>vždy viditelný</span> : (
                            <div style={{ display:"flex", gap:4 }}>
                              {[["superadmin","SA"],["admin","A+"],["user_e","E+"],["user","Vš"]].map(([val,lbl]) => (
                                <button key={val} onClick={() => { const next={...editSloupceRole}; if(val==="user") delete next[col.key]; else next[col.key]=val; setEditSloupceRole(next); onSaveSloupceRole(next); }} style={{ padding:"3px 8px", background:curRole===val?tc1(0.3):(isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"), border:`1px solid ${curRole===val?tc1(0.6):modalBorder}`, borderRadius:5, color:curRole===val?TENANT.p3:modalMuted, cursor:"pointer", fontSize:11, fontWeight:curRole===val?700:400, minWidth:28 }}>{lbl}</button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                  <button onClick={() => { setEditSloupceRole({}); onSaveSloupceRole({}); }} style={{ marginTop:10, padding:"6px 14px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:7, color:"#f87171", cursor:"pointer", fontSize:11, fontWeight:600 }}>↺ Reset — vše Všichni</button>
                </div>
              )},
              nazev: { title: "🏷️ NÁZEV APLIKACE", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Zobrazí se v hlavičce, na přihlašovací obrazovce a ve footeru.</div>
                  <input value={editAppNazev} onChange={e=>setEditAppNazev(e.target.value)} placeholder="Stavby Znojmo" style={{ width:"100%", padding:"8px 10px", background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", border:`1px solid ${modalBorder}`, borderRadius:7, color:modalText, fontSize:13, boxSizing:"border-box", marginBottom:8 }}/>
                  <button onClick={() => onSaveAppNazev(editAppNazev)} style={{ padding:"8px 16px", background:"linear-gradient(135deg,#7c3aed,#6d28d9)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>💾 Uložit název</button>
                </div>
              )},
              timeout: { title: "⏱️ TIMEOUT ODHLÁŠENÍ", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Automatické odhlášení po nečinnosti (minuty).</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <input type="number" min="1" max="480" value={editAutoLogout} onChange={e=>setEditAutoLogout(e.target.value)} style={{ width:70, padding:"8px 10px", background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", border:`1px solid ${modalBorder}`, borderRadius:7, color:modalText, fontSize:13, boxSizing:"border-box" }}/>
                    <span style={{ color:modalMuted, fontSize:12 }}>minut</span>
                  </div>
                  <button onClick={() => { const v=parseInt(editAutoLogout); if(!isNaN(v)&&v>0) onSaveAutoLogoutMinutes(v); }} style={{ padding:"8px 16px", background:"linear-gradient(135deg,#0ea5e9,#0284c7)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>💾 Uložit</button>
                  <div style={{ color:modalMuted, fontSize:10, marginTop:6 }}>Výchozí: 15 min. Rozsah: 1–480 min.</div>
                </div>
              )},
              terminy: { title: "⚠️ DNY PRO UPOZORNĚNÍ TERMÍNŮ", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Stavby s termínem do N dní se zobrazí v ⚠️ Termíny.</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <input type="number" min="1" max="365" value={editDeadlineDays} onChange={e=>setEditDeadlineDays(e.target.value)} style={{ width:70, padding:"8px 10px", background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", border:`1px solid ${modalBorder}`, borderRadius:7, color:modalText, fontSize:13, boxSizing:"border-box" }}/>
                    <span style={{ color:modalMuted, fontSize:12 }}>dní</span>
                  </div>
                  <button onClick={() => { const v=parseInt(editDeadlineDays); if(!isNaN(v)&&v>0) onSaveDeadlineDays(v); }} style={{ padding:"8px 16px", background:"linear-gradient(135deg,#dc2626,#b91c1c)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>💾 Uložit</button>
                  <div style={{ color:modalMuted, fontSize:10, marginTop:6 }}>Výchozí: 30 dní.</div>
                </div>
              )},
              demo: { title: "🎮 DEMO — MAX. POČET STAVEB", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Maximální počet staveb v demo režimu.</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:8 }}>
                    <input type="number" min="0" max="50" value={editDemoMax} onChange={e=>setEditDemoMax(e.target.value)} style={{ width:70, padding:"8px 10px", background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", border:`1px solid ${modalBorder}`, borderRadius:7, color:modalText, fontSize:13, boxSizing:"border-box" }}/>
                    <span style={{ color:modalMuted, fontSize:12 }}>staveb</span>
                  </div>
                  <button onClick={() => { const v=parseInt(editDemoMax); if(!isNaN(v)&&v>=0&&v<=50) onSaveDemoMaxStavby(v); }} style={{ padding:"8px 16px", background:"linear-gradient(135deg,#d97706,#b45309)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>💾 Uložit</button>
                </div>
              )},
              prefix: { title: "🔢 PREFIX ČÍSLOVÁNÍ STAVEB", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Automaticky předvyplní číslo stavby při přidání nové zakázky.</div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:10 }}>
                    <button onClick={() => { const next=!editPrefixEnabled; setEditPrefixEnabled(next); onSaveCisloPrefix(next,editPrefixValue); }} style={{ padding:"7px 14px", background:editPrefixEnabled?"linear-gradient(135deg,#059669,#047857)":(isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)"), border:`1px solid ${editPrefixEnabled?"#059669":modalBorder}`, borderRadius:7, color:editPrefixEnabled?"#fff":modalMuted, cursor:"pointer", fontSize:12, fontWeight:700 }}>{editPrefixEnabled?"✅ Zapnut":"⚪ Vypnut"}</button>
                  </div>
                  {editPrefixEnabled && (
                    <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                      <input value={editPrefixValue} onChange={e=>setEditPrefixValue(e.target.value)} placeholder="ZN-" style={{ width:90, padding:"8px 10px", background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", border:`1px solid ${modalBorder}`, borderRadius:7, color:modalText, fontSize:13, boxSizing:"border-box" }}/>
                      <button onClick={() => onSaveCisloPrefix(editPrefixEnabled,editPrefixValue)} style={{ padding:"8px 12px", background:"linear-gradient(135deg,#0ea5e9,#0284c7)", border:"none", borderRadius:7, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>💾</button>
                    </div>
                  )}
                </div>
              )},
              povinna: { title: "✅ POVINNÁ POLE", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Název stavby je vždy povinný. Ostatní lze zapnout/vypnout.</div>
                  {[["nazev_stavby","Název stavby",true],["cislo_stavby","Číslo stavby",false],["ukonceni","Ukončení",false],["sod","SOD",false],["ze_dne","Ze dne",false]].map(([key,label,locked]) => (
                    <div key={key} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"5px 0", borderBottom:`1px solid ${modalBorder}` }}>
                      <span style={{ color:locked?modalMuted:modalText, fontSize:12 }}>{label}{locked&&<span style={{ color:modalMuted, fontSize:10, marginLeft:4 }}>(vždy)</span>}</span>
                      <button disabled={locked} onClick={() => { const next={...editPovinnaPole,[key]:!editPovinnaPole[key]}; setEditPovinnaPole(next); onSavePovinnaPole(next); }} style={{ padding:"4px 10px", background:(locked||editPovinnaPole[key])?"linear-gradient(135deg,#059669,#047857)":(isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)"), border:`1px solid ${(locked||editPovinnaPole[key])?"#059669":modalBorder}`, borderRadius:6, color:(locked||editPovinnaPole[key])?"#fff":modalMuted, cursor:locked?"default":"pointer", fontSize:11, fontWeight:600 }}>{(locked||editPovinnaPole[key])?"✅ Ano":"⚪ Ne"}</button>
                    </div>
                  ))}
                </div>
              )},
              email: { title: "📧 EMAIL NOTIFIKACE — TERMÍNY", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Emaily pro denní souhrn termínů. Oddělte čárkou nebo novým řádkem.</div>
                  <textarea value={editNotifyEmails} onChange={e=>setEditNotifyEmails(e.target.value)} placeholder={"jan@firma.cz\neva@firma.cz"} rows={4} style={{ width:"100%", padding:"9px 12px", background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", border:`1px solid ${modalBorder}`, borderRadius:8, color:modalText, fontSize:13, boxSizing:"border-box", resize:"vertical", fontFamily:"monospace" }}/>
                  <button onClick={() => onSaveNotifyEmails(editNotifyEmails)} style={{ marginTop:8, padding:"9px 20px", background:"linear-gradient(135deg,#0ea5e9,#0284c7)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>💾 Uložit emaily</button>
                </div>
              )},
              verze: { title: "VERZE APLIKACE", content: (
                <div>
                  <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:8, marginBottom:10 }}>
                    <div><div style={{ color:modalMuted, fontSize:10, marginBottom:4 }}>VERZE</div><input value={editVerze} onChange={e=>setEditVerze(e.target.value)} placeholder="1.0.0" style={{ width:"100%", padding:"8px 10px", background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", border:`1px solid ${modalBorder}`, borderRadius:7, color:modalText, fontSize:13, boxSizing:"border-box" }}/></div>
                    <div><div style={{ color:modalMuted, fontSize:10, marginBottom:4 }}>ROK / DATUM</div><input value={editDatum} onChange={e=>setEditDatum(e.target.value)} placeholder="2025" style={{ width:"100%", padding:"8px 10px", background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.04)", border:`1px solid ${modalBorder}`, borderRadius:7, color:modalText, fontSize:13, boxSizing:"border-box" }}/></div>
                  </div>
                  <button onClick={() => onSaveAppInfo(editVerze,editDatum)} style={{ padding:"8px 16px", background:"linear-gradient(135deg,#7c3aed,#6d28d9)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:12, fontWeight:600 }}>💾 Uložit verzi</button>
                </div>
              )},
              sirky: { title: "ŠÍŘKY SLOUPCŮ", content: (
                <div>
                  <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                    <button onClick={() => setConfirmResetCols(true)} style={{ padding:"9px 16px", background:"rgba(168,85,247,0.12)", border:"1px solid rgba(168,85,247,0.35)", borderRadius:8, color:"#c084fc", cursor:"pointer", fontSize:12, fontWeight:600 }}>↺ Reset šířek</button>
                    <button onClick={() => onResetColOrder()} style={{ padding:"9px 16px", background:tc2(0.12), border:`1px solid ${tc2(0.35)}`, borderRadius:8, color:TENANT.p3, cursor:"pointer", fontSize:12, fontWeight:600 }}>↺ Reset pořadí</button>
                  </div>
                  <div style={{ color:modalMuted, fontSize:11, marginTop:8 }}>Obnoví původní šířky a pořadí sloupců tabulky.</div>
                </div>
              )},
              import: { title: "📥 IMPORT Z PŮVODNÍ TABULKY (XLS)", content: (
                <div>
                  <div style={{ color:modalMuted, fontSize:11, marginBottom:10 }}>Jednorázový import staveb z původního Excel formátu. Před importem zobrazí potvrzovací dialog.</div>
                  <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                    {!IS_JIHLAVA && (
                      <div>
                        <div style={{ color:modalMuted, fontSize:11, marginBottom:6 }}>DUR — Znojmo formát:</div>
                        <button onClick={() => onImportXLS()} style={{ padding:"9px 16px", background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.35)", borderRadius:8, color:"#f59e0b", cursor:"pointer", fontSize:12, fontWeight:600 }}>📥 Vybrat soubor XLS — <span style={{ color:"#ef4444", fontWeight:700 }}>DUR</span></button>
                      </div>
                    )}
                    {IS_JIHLAVA && (
                      <div>
                        <div style={{ color:modalMuted, fontSize:11, marginBottom:6 }}>Jihlava formát — H (Smluvní cena) importovat do:</div>
                        <div style={{ display:"flex", gap:8, alignItems:"center", flexWrap:"wrap" }}>
                          <select value={importJIKatPoleLocal} onChange={e=>setImportJIKatPoleLocal(e.target.value)} style={{ padding:"6px 10px", background:TENANT.inputBg, border:"1px solid rgba(255,255,255,0.15)", borderRadius:7, color:"#e2e8f0", fontSize:12 }}>
                            <option value="ps_i">Plán. stavby I</option>
                            <option value="snk_i">SNK I</option>
                            <option value="bo_i">Běžné opravy I</option>
                            <option value="ps_ii">Plán. stavby II</option>
                            <option value="bo_ii">Běžné opravy II</option>
                            <option value="poruch">Poruchy</option>
                            <option value="nikam">Nikam (jen Nab. cena)</option>
                          </select>
                          <button onClick={() => onImportJI(importJIKatPoleLocal)} style={{ padding:"9px 16px", background:"rgba(99,153,34,0.15)", border:"1px solid rgba(99,153,34,0.4)", borderRadius:8, color:"#86efac", cursor:"pointer", fontSize:12, fontWeight:600 }}>📥 Vybrat soubor XLS — JI</button>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )},
            };

            const cols = Array.from({ length: appCardsCols }, (_, i) => cardsOrder[i] ? [...cardsOrder[i]] : []);
            const cardStyle = (id) => ({ background:modalCardBg, borderRadius:10, border:`1px solid ${dragOverCard===id?TENANT.p2:modalBorder}`, marginBottom:14, transition:"border-color 0.1s", opacity:dragCardRef.current===id?0.5:1 });

            return (
              <div style={{ padding:"10px 0" }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ color:modalMuted, fontSize:11 }}>Sloupce:</span>
                    <div style={{ display:"flex", background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)", borderRadius:7, overflow:"hidden", border:`1px solid ${modalBorder}` }}>
                      {[1,2,3,4,5].map(n => (
                        <button key={n} onClick={() => { setAppCardsCols(n); try { localStorage.setItem("aplikace_cols",String(n)); } catch {} }} style={{ padding:"4px 10px", background:appCardsCols===n?(isDark?tc1(0.4):tc1(0.15)):"transparent", border:"none", color:appCardsCols===n?TENANT.p3:modalMuted, cursor:"pointer", fontSize:12, fontWeight:appCardsCols===n?700:400, minWidth:28 }}>{n}</button>
                      ))}
                    </div>
                  </div>
                  <button onClick={resetCardsOrder} style={{ padding:"5px 12px", background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.3)", borderRadius:7, color:"#f87171", cursor:"pointer", fontSize:11, fontWeight:600 }}>↺ Obnovit výchozí rozvržení</button>
                </div>
                <div style={{ display:"grid", gridTemplateColumns:`repeat(${appCardsCols}, 1fr)`, gap:16, alignItems:"start" }}>
                  {cols.map((col, ci) => (
                    <div key={ci} style={{ minHeight:80, display:"flex", flexDirection:"column" }}
                      onDragOver={e=>e.preventDefault()}
                      onDragEnter={e => { e.preventDefault(); if (dragCardRef.current&&col.length===0) { dragOverRef.current=`__col_${ci}__`; setDragOverCard(`empty-${ci}`); } }}
                      onDrop={e => { e.preventDefault(); const srcId=e.dataTransfer.getData("text/plain")||dragCardRef.current; if(!srcId||col.length>0) return; setCardsOrder(prev => { const next=prev.map(c=>c.filter(id=>id!==srcId)); while(next.length<=ci) next.push([]); next[ci].push(srcId); try{localStorage.setItem("aplikace_layout",JSON.stringify(next));}catch{} return next; }); dragCardRef.current=null; dragOverRef.current=null; setDragOverCard(null); setIsDraggingCard(false); }}
                    >
                      {col.length===0 && (
                        <div style={{ border:`2px dashed ${dragOverCard===`empty-${ci}`?TENANT.p2:(isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.12)")}`, borderRadius:10, minHeight:80, display:"flex", alignItems:"center", justifyContent:"center", color:dragOverCard===`empty-${ci}`?TENANT.p3:modalMuted, fontSize:12, transition:"all 0.15s", flex:1 }}>⬇ přetáhni sem</div>
                      )}
                      {col.map(id => {
                        const card=CARDS[id]; if(!card) return null;
                        return (
                          <div key={id} style={cardStyle(id)} draggable
                            onDragStart={e=>handleCardDragStart(e,id)} onDragOver={e=>e.preventDefault()}
                            onDragEnter={e=>handleCardDragEnter(e,id)} onDrop={e=>handleCardDrop(e,id)} onDragEnd={handleCardDragEnd}>
                            <div style={{ padding:"9px 14px 8px", borderBottom:`1px solid ${modalBorder}`, display:"flex", alignItems:"center", gap:7, cursor:"grab", userSelect:"none", background:isDark?"rgba(255,255,255,0.04)":"rgba(0,0,0,0.04)", borderRadius:"10px 10px 0 0" }}>
                              <span style={{ color:isDark?"rgba(255,255,255,0.3)":"rgba(0,0,0,0.25)", fontSize:13 }}>⠿</span>
                              <span style={{ color:isDark?"rgba(255,255,255,0.75)":"rgba(0,0,0,0.65)", fontSize:11, fontWeight:700, letterSpacing:0.8 }}>{card.title}</span>
                            </div>
                            <div style={{ padding:"12px 14px" }}>{card.content}</div>
                          </div>
                        );
                      })}
                      {col.length>0 && (
                        <div style={{ minHeight:isDraggingCard?80:16, marginTop:6, borderRadius:8, border:`2px dashed ${dragOverCard===`end-${ci}`?TENANT.p2:isDraggingCard?(isDark?"rgba(255,255,255,0.15)":"rgba(0,0,0,0.15)"):"transparent"}`, display:"flex", alignItems:"center", justifyContent:"center", color:dragOverCard===`end-${ci}`?TENANT.p3:modalMuted, fontSize:12, transition:"all 0.15s", background:dragOverCard===`end-${ci}`?tc1(0.08):"transparent" }}
                          onDragOver={e=>{e.preventDefault();e.stopPropagation();}}
                          onDragEnter={e=>{e.preventDefault();e.stopPropagation();if(dragCardRef.current){dragOverRef.current=`__end_${ci}__`;setDragOverCard(`end-${ci}`);}}}
                          onDrop={e=>{e.preventDefault();e.stopPropagation();const srcId=e.dataTransfer.getData("text/plain")||dragCardRef.current;dragCardRef.current=null;if(!srcId)return;setCardsOrder(prev=>{const next=prev.map(col=>col.filter(id=>id!==srcId));while(next.length<=ci)next.push([]);next[ci].push(srcId);try{localStorage.setItem("aplikace_layout",JSON.stringify(next));}catch{}return next;});dragOverRef.current=null;setDragOverCard(null);setIsDraggingCard(false);}}
                        >{dragOverCard===`end-${ci}`?"⬇ přetáhni sem":isDraggingCard?"⬇":""}</div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {/* TAB: LOG */}
          {tab === "log" && (
            <div>
              {isDemo && (
                <div style={{ marginBottom:14, padding:"12px 16px", background:"rgba(251,191,36,0.12)", border:"1px solid rgba(251,191,36,0.35)", borderRadius:8, color:"#fbbf24", fontSize:12, display:"flex", gap:10, alignItems:"center" }}>
                  <span style={{ fontSize:18 }}>🎮</span>
                  <div><strong>Demo režim</strong> — log aktivit se neukládá do databáze.</div>
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:10, flexWrap:"wrap", gap:8 }}>
                <div style={{ display:"flex", gap:8, flexWrap:"wrap" }}>
                  <select onChange={e=>setLogFilterUser(e.target.value)} style={{ padding:"5px 10px", background:isDark?TENANT.modalBg:"#fff", border:`1px solid ${isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.15)"}`, borderRadius:6, color:isDark?"#e2e8f0":"#1e293b", fontSize:12, cursor:"pointer" }}>
                    <option value="">Všichni uživatelé</option>
                    {[...new Set(localLogData.map(r=>r.uzivatel))].filter(Boolean).map(u=><option key={u} value={u}>{u}</option>)}
                  </select>
                  <select onChange={e=>setLogFilterAkce(e.target.value)} style={{ padding:"5px 10px", background:isDark?TENANT.modalBg:"#fff", border:`1px solid ${isDark?"rgba(255,255,255,0.12)":"rgba(0,0,0,0.15)"}`, borderRadius:6, color:isDark?"#e2e8f0":"#1e293b", fontSize:12, cursor:"pointer" }}>
                    <option value="">Všechny akce</option>
                    {Object.keys(AKCE_COLOR).map(a=><option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                  <span style={{ color:isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.5)", fontSize:12 }}>{localLogFiltered.length} záznamů</span>
                  {isSuperAdmin && (
                    <div style={{ display:"flex", background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)", borderRadius:7, overflow:"hidden", border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}` }}>
                      {[["aktivni","Aktivní"],["skryte","Skryté"],["vse","Vše"]].map(([val,label]) => (
                        <button key={val} onClick={() => setLogZobrazit(val)} style={{ padding:"3px 9px", background:logZobrazit===val?(isDark?tc1(0.4):tc1(0.15)):"transparent", border:"none", color:logZobrazit===val?(isDark?TENANT.p3:TENANT.p1):isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.4)", cursor:"pointer", fontSize:11, fontWeight:logZobrazit===val?700:400 }}>{label}</button>
                      ))}
                    </div>
                  )}
                  <button onClick={handleLoadLog} style={{ padding:"5px 12px", background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)", border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, borderRadius:6, color:isDark?"#fff":"#1e293b", cursor:"pointer", fontSize:12 }}>🔄 Obnovit</button>
                  <button onClick={() => {
                    const akceColors = { "Přihlášení":{bg:"#DBEAFE",color:"#1D4ED8"}, "Přidání stavby":{bg:"#DCFCE7",color:"#166534"}, "Editace stavby":{bg:"#FEF9C3",color:"#854D0E"}, "Smazání stavby":{bg:"#FEE2E2",color:"#991B1B"}, "Nastavení":{bg:"#F3E8FF",color:"#6B21A8"}, "Záloha":{bg:"#FFEDD5",color:"#9A3412"} };
                    const rows = localLogFiltered.map((r,i) => { const c=akceColors[r.akce]||{bg:"#F8FAFC",color:"#334155"}; const bg=i%2===0?c.bg:"#FFFFFF"; return `<tr><td style="padding:6px 10px;border:1px solid #E2E8F0;background:${bg};color:#1E293B;white-space:nowrap">${r.cas?new Date(r.cas).toLocaleString("cs-CZ"):""}</td><td style="padding:6px 10px;border:1px solid #E2E8F0;background:${bg};color:#1E293B">${r.uzivatel||""}</td><td style="padding:6px 10px;border:1px solid #E2E8F0;background:${c.bg};color:${c.color};font-weight:700;text-align:center">${r.akce||""}</td><td style="padding:6px 10px;border:1px solid #E2E8F0;background:${bg};color:#475569">${r.detail||""}</td></tr>`; }).join("");
                    const html=`<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table><thead><tr><th style="padding:8px 10px;background:${TENANT.p1deep};color:#fff;border:1px solid ${TENANT.p1};font-size:12px">Čas</th><th style="padding:8px 10px;background:${TENANT.p1deep};color:#fff;border:1px solid ${TENANT.p1};font-size:12px">Uživatel</th><th style="padding:8px 10px;background:${TENANT.p1deep};color:#fff;border:1px solid ${TENANT.p1};font-size:12px">Akce</th><th style="padding:8px 10px;background:${TENANT.p1deep};color:#fff;border:1px solid ${TENANT.p1};font-size:12px">Detail</th></tr></thead><tbody>${rows}</tbody></table></body></html>`;
                    const blob=new Blob([html],{type:"application/vnd.ms-excel;charset=utf-8"}); const a=document.createElement("a"); a.href=URL.createObjectURL(blob); a.download=`log_aktivit_${new Date().toISOString().slice(0,10)}.xls`; a.click();
                  }} style={{ padding:"5px 12px", background:isDark?"rgba(255,255,255,0.05)":"rgba(0,0,0,0.05)", border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, borderRadius:6, color:isDark?"#fff":"#1e293b", cursor:"pointer", fontSize:12 }}>📥 Export Excel</button>
                </div>
              </div>
              <div style={{ overflowY:"auto", overflowX:"hidden", maxHeight:"calc(90vh - 280px)" }}>
                <table style={{ width:"100%", borderCollapse:"collapse", fontSize:12.5, tableLayout:"fixed" }}>
                  <colgroup><col style={{ width:"14%" }}/><col style={{ width:"14%" }}/><col style={{ width:"16%" }}/><col style={{ width:"auto" }}/>{isSuperAdmin&&!isDemo&&<col style={{ width:40 }}/>}</colgroup>
                  <thead>
                    <tr style={{ background:isDark?TENANT.p1deep:"#e2e8f0" }}>
                      {["Čas","Uživatel","Akce","Detail",...(isSuperAdmin&&!isDemo?[""]:[])].map(h => (
                        <th key={h} style={{ padding:"8px 12px", textAlign:"left", color:isDark?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.5)", fontWeight:700, fontSize:11, borderBottom:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}` }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {localLogFiltered.map((r,i) => (
                      <tr key={r.id} style={{ background:i%2===0?(isDark?"rgba(255,255,255,0.02)":"rgba(0,0,0,0.02)"):"transparent", opacity:r.hidden?0.55:1 }}>
                        <td style={{ padding:"7px 12px", color:isDark?"rgba(255,255,255,0.4)":"rgba(0,0,0,0.5)", whiteSpace:"nowrap", fontSize:11 }}>{fmtCas(r.cas)}</td>
                        <td style={{ padding:"7px 12px", color:isDark?"#e2e8f0":"#1e293b" }}>{r.uzivatel}{r.hidden&&<span style={{ marginLeft:6, fontSize:10, color:"rgba(148,163,184,0.8)", background:"rgba(100,116,139,0.15)", padding:"1px 5px", borderRadius:4, fontWeight:600 }}>skryto</span>}</td>
                        <td style={{ padding:"7px 12px" }}><span style={{ background:(AKCE_COLOR[r.akce]||"#94a3b8")+"22", color:AKCE_COLOR[r.akce]||"#94a3b8", border:`1px solid ${(AKCE_COLOR[r.akce]||"#94a3b8")}44`, borderRadius:5, padding:"2px 8px", fontSize:11, fontWeight:700, whiteSpace:"nowrap" }}>{r.akce}</span></td>
                        <td style={{ padding:"7px 12px", color:isDark?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.5)", fontSize:12, wordBreak:"break-word" }}>{r.detail}</td>
                        {isSuperAdmin&&!isDemo&&(
                          <td style={{ padding:"7px 8px", textAlign:"center" }}>
                            {r.hidden?(
                              <button onClick={()=>handleUnhideLogSettings(r.id)} style={{ background:"none", border:"none", color:"rgba(34,197,94,0.5)", cursor:"pointer", fontSize:13, padding:"0 2px", fontWeight:700 }} onMouseEnter={e=>e.currentTarget.style.color="#4ade80"} onMouseLeave={e=>e.currentTarget.style.color="rgba(34,197,94,0.5)"}>↩</button>
                            ):(
                              <button onClick={()=>setLogDeleteId(r.id)} style={{ background:"none", border:"none", color:"rgba(239,68,68,0.4)", cursor:"pointer", fontSize:13, padding:"0 2px", fontWeight:700 }} onMouseEnter={e=>e.currentTarget.style.color="#f87171"} onMouseLeave={e=>e.currentTarget.style.color="rgba(239,68,68,0.4)"}>✕</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {localLogFiltered.length===0&&<tr><td colSpan={4} style={{ padding:24, textAlign:"center", color:isDark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.3)" }}>Žádné záznamy</td></tr>}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Potvrzení skrytí záznamu logu */}
        {logDeleteId && (
          <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.7)", zIndex:1600, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <div style={{ background:TENANT.modalBg, borderRadius:14, padding:"28px 32px", width:340, border:"1px solid rgba(239,68,68,0.4)", boxShadow:"0 24px 60px rgba(0,0,0,0.7)", textAlign:"center" }}>
              <div style={{ fontSize:28, marginBottom:10 }}>👁️</div>
              <h3 style={{ color:"#fff", margin:"0 0 8px", fontSize:15 }}>Skrýt záznam logu?</h3>
              <p style={{ color:"rgba(255,255,255,0.4)", margin:"0 0 22px", fontSize:13 }}>Záznam bude skryt. Superadmin ho může kdykoli obnovit přes přepínač Skryté.</p>
              <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                <button onClick={()=>setLogDeleteId(null)} disabled={logDeleting} style={{ padding:"9px 20px", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, color:"#fff", cursor:"pointer" }}>Zrušit</button>
                <button onClick={()=>handleDeleteLogSettings(logDeleteId)} disabled={logDeleting} style={{ padding:"9px 20px", background:"linear-gradient(135deg,#d97706,#b45309)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontWeight:700 }}>{logDeleting?"Skrývám...":"Skrýt"}</button>
              </div>
            </div>
          </div>
        )}

        {/* footer */}
        <div style={{ padding:"14px 24px", borderTop:`1px solid ${modalDivider}`, display:"flex", gap:10, justifyContent:"flex-end", background:modalBg }}>
          <button onClick={onClose} style={{ padding:"9px 18px", background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)", border:`1px solid ${modalBorder}`, borderRadius:8, color:modalText, cursor:"pointer", fontSize:13 }}>Zrušit</button>

          {confirmResetCols && (
            <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:1500, display:"flex", alignItems:"center", justifyContent:"center" }}>
              <div style={{ background:isDark?TENANT.modalBg:"#fff", borderRadius:14, padding:"28px 32px", width:360, border:"1px solid rgba(168,85,247,0.3)", boxShadow:"0 24px 60px rgba(0,0,0,0.5)", textAlign:"center" }}>
                <div style={{ fontSize:36, marginBottom:12 }}>↺</div>
                <div style={{ color:isDark?"#f8fafc":"#1e293b", fontSize:16, fontWeight:700, marginBottom:8 }}>Reset šířek sloupců?</div>
                <div style={{ color:isDark?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.5)", fontSize:13, marginBottom:24 }}>Všechny šířky sloupců se obnoví na výchozí hodnoty. Tuto akci nelze vrátit.</div>
                <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
                  <button onClick={()=>setConfirmResetCols(false)} style={{ padding:"9px 20px", background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)", border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, borderRadius:8, color:isDark?"#fff":"#1e293b", cursor:"pointer", fontSize:13 }}>Zrušit</button>
                  <button onClick={()=>{onResetColWidths();setConfirmResetCols(false);onClose();}} style={{ padding:"9px 20px", background:"linear-gradient(135deg,#7c3aed,#6d28d9)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>Ano, resetovat</button>
                </div>
              </div>
            </div>
          )}

          {tab!=="log"&&tab!=="aplikace"&&(
            <button onClick={() => {
              const unfinished=[];
              if(tab==="ciselniky"){if(newF.trim())unfinished.push("Firma");if(newO.trim())unfinished.push("Objednatel");if(newS.trim())unfinished.push("Stavbyvedoucí");}
              if(tab==="uzivatele"){if(newEmail.trim()||newPass.trim()||newName?.trim())unfinished.push("Uživatel");}
              if(unfinished.length>0){setPendingWarn(unfinished);}else{onChange(f,o,s);onChangeUsers(uList);onClose();}
            }} style={{ padding:"9px 22px", background:"linear-gradient(135deg,#16a34a,#15803d)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>Uložit vše</button>
          )}
        </div>
      </div>

      {pendingWarn && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.6)", zIndex:9500, display:"flex", alignItems:"center", justifyContent:"center", pointerEvents:"all" }}>
          <div style={{ background:isDark?TENANT.modalBg:"#fff", borderRadius:14, padding:"28px 32px", width:380, border:`1px solid ${isDark?"rgba(255,165,0,0.3)":"rgba(255,165,0,0.4)"}`, boxShadow:"0 24px 60px rgba(0,0,0,0.5)", textAlign:"center" }}>
            <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
            <div style={{ color:isDark?"#f8fafc":"#1e293b", fontSize:16, fontWeight:700, marginBottom:8 }}>Nevyplněná položka</div>
            <div style={{ color:isDark?"rgba(255,255,255,0.5)":"rgba(0,0,0,0.5)", fontSize:13, marginBottom:24 }}>
              Máš rozepsanou položku <strong>{pendingWarn.join(", ")}</strong> která nebyla přidána.<br/>
              <span style={{ fontSize:12, marginTop:6, display:"block" }}>Chceš ji zahodit a uložit bez ní?</span>
            </div>
            <div style={{ display:"flex", gap:10, justifyContent:"center" }}>
              <button onClick={()=>setPendingWarn(null)} style={{ padding:"9px 20px", background:isDark?"rgba(255,255,255,0.06)":"rgba(0,0,0,0.06)", border:`1px solid ${isDark?"rgba(255,255,255,0.1)":"rgba(0,0,0,0.1)"}`, borderRadius:8, color:isDark?"#fff":"#1e293b", cursor:"pointer", fontSize:13 }}>← Zpět doplnit</button>
              <button onClick={()=>{setPendingWarn(null);onChange(f,o,s);onChangeUsers(uList);onClose();}} style={{ padding:"9px 20px", background:"linear-gradient(135deg,#dc2626,#b91c1c)", border:"none", borderRadius:8, color:"#fff", cursor:"pointer", fontSize:13, fontWeight:600 }}>Zahodit a uložit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
