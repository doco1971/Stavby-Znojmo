import { useState, useEffect, useRef } from "react";
import { TENANT, tc1 } from "../utils/tenant";
import { sb } from "../utils/supabase";
import { inputSx, NUM_FIELDS, DATE_FIELDS, KAT_FIELDS } from "../utils/constants";
import { computeRow, fmt } from "../utils/formatters";
import { useDraggable, dragHeaderStyle, dragHint } from "../hooks/useDraggable.jsx";
import { DatePickerField } from "./DatePickerField";
import { NativeSelect } from "./NativeSelect";

function Lbl({ children }) {
  return <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 5, textTransform: "uppercase" }}>{children}</div>;
}

function FormField({ label, value, onChange, full, type, fieldKey, isInvalid }) {
  const [err, setErr] = useState("");
  const displayValue = type === "number" && (value === 0 || value === "0") ? "" : (value ?? "");

  const handleChange = (v) => {
    if (type === "number") {
      if (v !== "" && v !== "-" && isNaN(v.replace(",", "."))) setErr("Zadejte číslo");
      else setErr("");
    } else if (type === "date") {
      if (v !== "" && !/^\d{0,2}\.?\d{0,2}\.?\d{0,4}$/.test(v)) setErr("Formát: DD.MM.RRRR");
      else setErr("");
    }
    onChange(v);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      const modal = e.target.closest("[data-modal]");
      if (!modal) return;
      const inputs = Array.from(modal.querySelectorAll("input:not([disabled]), select:not([disabled])"));
      const idx = inputs.indexOf(e.target);
      if (e.key === "Enter") { e.preventDefault(); if (idx < inputs.length - 1) inputs[idx + 1].focus(); }
    }
  };

  const borderColor = isInvalid ? "#ef4444" : err ? "#f87171" : "rgba(255,255,255,0.15)";
  const animation   = isInvalid ? "pulse-border 1s ease-in-out infinite" : "none";

  return (
    <div style={full ? { gridColumn: "1 / -1" } : {}}>
      <Lbl>{label}{type === "number" && <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, marginLeft: 4 }}>123</span>}{type === "date" && <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, marginLeft: 4 }}>DD.MM.RRRR</span>}</Lbl>
      {type === "date" ? (
        <div data-field={fieldKey} style={{ animation }}>
          <DatePickerField value={displayValue} onChange={handleChange} style={{ borderColor }} />
        </div>
      ) : (
        <input
          type="text"
          data-field={fieldKey}
          value={displayValue}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ ...inputSx, borderColor, animation }}
        />
      )}
      {(err || isInvalid) && <div style={{ color: "#f87171", fontSize: 11, marginTop: 3 }}>{err || "Povinné pole"}</div>}
    </div>
  );
}

function FormSelectField({ label, value, onChange, options, allowEmpty }) {
  return (
    <div>
      <Lbl>{label}</Lbl>
      <NativeSelect value={value ?? ""} onChange={onChange} options={allowEmpty ? ["", ...options] : options} />
    </div>
  );
}

export function FormModal({ title, initial, onSave, onClose, firmy, objednatele, stavbyvedouci: svList, povinnaPole = {} }) {
  const [form, setForm]             = useState({ ...initial });
  const [saveErr, setSaveErr]       = useState("");
  const [katErr, setKatErr]         = useState("");
  const [invalidFields, setInvalidFields] = useState(new Set()); // blikající pole při validaci

  const stavbaId       = initial?.id || null;
  const KAT_POLE_LIST  = ["ps_i","snk_i","bo_i","ps_ii","bo_ii","poruch"];

  const [dodatky, setDodatky]                     = useState([]);
  const [zakladRec, setZakladRec]                 = useState(null);
  const [dodatkyLoading, setDodatkyLoading]       = useState(false);
  const [vybranyDodatek, setVybranyDodatek]       = useState("zaklad");
  const [novyDodatekNazev, setNovyDodatekNazev]   = useState("");
  const [novyDodatekCena, setNovyDodatekCena]     = useState("");
  const [novyDodatekTermin, setNovyDodatekTermin] = useState("");
  const [pridatDodatek, setPridatDodatek]         = useState(false);
  const [smazatDodatekId, setSmazatDodatekId]     = useState(null);
  const [editDodatekId, setEditDodatekId]         = useState(null);
  const [editDodatekNazev, setEditDodatekNazev]   = useState("");
  const [editDodatekCena, setEditDodatekCena]     = useState("");
  const [editDodatekTermin, setEditDodatekTermin] = useState("");

  const { pos, onMouseDown: onDragStart } = useDraggable(1100, 560);
  const modalRef   = useRef(null);
  const nazevRef   = useRef(null);

  useEffect(() => {
    if (!stavbaId) return;
    setDodatkyLoading(true);
    sb(`dodatky?stavba_id=eq.${stavbaId}&order=poradi`).then(res => {
      const vse     = res || [];
      const zRec    = vse.find(d => d.poradi === -1);
      const normalni = vse.filter(d => d.poradi >= 0);
      if (zRec) {
        const pole = zRec.nazev.replace("__zaklad__", "");
        setZakladRec({ pole, hodnota: Number(zRec.zmena_ceny) || 0, termin: zRec.novy_termin || "" });
      }
      setDodatky(normalni);
      if (normalni.length > 0) setVybranyDodatek(String(normalni.length - 1));
    }).catch(() => {}).finally(() => setDodatkyLoading(false));
  }, [stavbaId]);

  const getZaklad = () => {
    if (zakladRec) return zakladRec;
    const pole = KAT_POLE_LIST.find(k => Number(form[k]) !== 0 && form[k] != null && form[k] !== "") || null;
    return { pole, hodnota: pole ? Number(form[pole]) || 0 : 0, termin: form.ukonceni || "" };
  };

  const getCenaTermin = (dod, doIdx) => {
    const z = getZaklad();
    let cena = z.hodnota, termin = z.termin;
    for (let i = 0; i <= doIdx && i < dod.length; i++) {
      cena += Number(dod[i].zmena_ceny) || 0;
      if (dod[i].novy_termin) termin = dod[i].novy_termin;
    }
    return { cena: Math.round(cena * 100) / 100, termin };
  };

  const aktualniCenaTermin = () => {
    const z = getZaklad();
    if (vybranyDodatek === "zaklad" || dodatky.length === 0) return { cena: z.hodnota, termin: z.termin };
    return getCenaTermin(dodatky, parseInt(vybranyDodatek));
  };

  const aplikujDodatkyNaStavbu = async (noveDodatky, aktZaklad) => {
    const z = aktZaklad || getZaklad();
    const suma = noveDodatky.reduce((s, d) => s + (Number(d.zmena_ceny) || 0), 0);
    const novaCena = Math.round((z.hodnota + suma) * 100) / 100;
    const novyTermin = noveDodatky.reduce((t, d) => d.novy_termin || t, z.termin);
    const patch = { nabidkova_cena: novaCena, ukonceni: novyTermin };
    if (z.pole) patch[z.pole] = novaCena;
    try {
      await sb(`stavby?id=eq.${stavbaId}`, { method: "PATCH", body: JSON.stringify(patch), prefer: "return=minimal" });
      setForm(prev => ({ ...prev, nabidkova_cena: String(novaCena), ukonceni: novyTermin, ...(z.pole ? { [z.pole]: String(novaCena) } : {}) }));
    } catch(e) { alert("Chyba uložení do DB: " + e.message); }
  };

  const handlePridatDodatek = async () => {
    const nazev = novyDodatekNazev.trim();
    if (!nazev) return;
    const zmena = Number(novyDodatekCena.replace(",", ".").replace(/\s+/g, "")) || 0;
    const termin = novyDodatekTermin.trim();
    try {
      let aktZaklad = zakladRec;
      if (!zakladRec) {
        const z = getZaklad();
        await sb("dodatky", { method: "POST", body: JSON.stringify({ stavba_id: stavbaId, nazev: `__zaklad__${z.pole || "nabidkova_cena"}`, zmena_ceny: z.hodnota, novy_termin: z.termin || null, poradi: -1 }), prefer: "return=minimal" });
        aktZaklad = z;
        setZakladRec(z);
      }
      const res = await sb("dodatky", { method: "POST", body: JSON.stringify({ stavba_id: stavbaId, nazev, zmena_ceny: zmena, novy_termin: termin || null, poradi: dodatky.length }), prefer: "return=representation" });
      const noveDodatky = [...dodatky, ...(res || [])];
      setDodatky(noveDodatky);
      setVybranyDodatek(String(noveDodatky.length - 1));
      await aplikujDodatkyNaStavbu(noveDodatky, aktZaklad);
      setNovyDodatekNazev(""); setNovyDodatekCena(""); setNovyDodatekTermin("");
      setPridatDodatek(false);
    } catch(e) { alert("Chyba přidání dodatku: " + e.message); }
  };

  const handleSmazatDodatek = async (id) => {
    try {
      await sb(`dodatky?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
      const noveDodatky = dodatky.filter(d => d.id !== id);
      setDodatky(noveDodatky);
      setVybranyDodatek(noveDodatky.length > 0 ? String(noveDodatky.length - 1) : "zaklad");
      if (noveDodatky.length === 0 && zakladRec) {
        await sb(`dodatky?stavba_id=eq.${stavbaId}&poradi=eq.-1`, { method: "DELETE", prefer: "return=minimal" });
        const patch = { nabidkova_cena: zakladRec.hodnota, ukonceni: zakladRec.termin };
        if (zakladRec.pole) patch[zakladRec.pole] = zakladRec.hodnota;
        await sb(`stavby?id=eq.${stavbaId}`, { method: "PATCH", body: JSON.stringify(patch), prefer: "return=minimal" });
        setForm(prev => ({ ...prev, nabidkova_cena: String(zakladRec.hodnota), ukonceni: zakladRec.termin, ...(zakladRec.pole ? { [zakladRec.pole]: String(zakladRec.hodnota) } : {}) }));
        setZakladRec(null);
      } else {
        await aplikujDodatkyNaStavbu(noveDodatky);
      }
      setSmazatDodatekId(null);
    } catch(e) { alert("Chyba smazání: " + e.message); }
  };

  const handleEditDodatek = (d) => {
    setEditDodatekId(d.id);
    setEditDodatekNazev(d.nazev);
    setEditDodatekCena(d.zmena_ceny !== 0 ? String(d.zmena_ceny) : "");
    setEditDodatekTermin(d.novy_termin || "");
  };

  const handleUlozitEditDodatek = async () => {
    const nazev = editDodatekNazev.trim();
    if (!nazev) return;
    const zmena = Number(editDodatekCena.replace(",", ".").replace(/\s+/g, "")) || 0;
    const termin = editDodatekTermin.trim();
    try {
      await sb(`dodatky?id=eq.${editDodatekId}`, { method: "PATCH", body: JSON.stringify({ nazev, zmena_ceny: zmena, novy_termin: termin || null }), prefer: "return=minimal" });
      const noveDodatky = dodatky.map(d => d.id === editDodatekId ? { ...d, nazev, zmena_ceny: zmena, novy_termin: termin || null } : d);
      setDodatky(noveDodatky);
      await aplikujDodatkyNaStavbu(noveDodatky);
      setEditDodatekId(null);
    } catch(e) { alert("Chyba úpravy: " + e.message); }
  };

  const set = (k, v) => {
    // Vyčisti chybu pro toto pole při psaní
    if (invalidFields.has(k)) setInvalidFields(prev => { const next = new Set(prev); next.delete(k); return next; });
    if (KAT_FIELDS.includes(k) && v !== "" && v !== "0" && Number(v) !== 0) {
      setForm(f => {
        const occupied = KAT_FIELDS.filter(fk => fk !== k && Number(f[fk]) !== 0 && f[fk] !== "" && f[fk] != null);
        if (occupied.length > 0) { setKatErr("Lze vyplnit pouze jedno pole z Kategorií I a II."); return f; }
        setKatErr(""); return { ...f, [k]: v };
      });
    } else {
      if (KAT_FIELDS.includes(k)) setKatErr("");
      setForm(f => ({ ...f, [k]: v }));
    }
  };

  const computed = computeRow(form);

  const handleSave = () => {
    const chyby = new Set();

    // Validace číselných polí
    for (const k of NUM_FIELDS) {
      const v = form[k];
      if (v !== "" && v != null && isNaN(String(v).replace(",", "."))) {
        setSaveErr(`Pole "${k}" musí být číslo!`); chyby.add(k);
      }
    }
    // Validace datumových polí
    for (const k of DATE_FIELDS) {
      const v = form[k];
      if (v && !/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(v.trim())) {
        setSaveErr(`Pole "${k}" musí být datum ve formátu DD.MM.RRRR`); chyby.add(k);
      }
    }
    // Validace povinných polí
    const povinnaLabels = { cislo_stavby: "Číslo stavby", nazev_stavby: "Název stavby", ukonceni: "Ukončení", sod: "SOD", ze_dne: "Ze dne" };
    for (const [k, label] of Object.entries(povinnaLabels)) {
      if (k === "nazev_stavby" || povinnaPole[k]) {
        if (!form[k] || !String(form[k]).trim()) {
          if (chyby.size === 0) setSaveErr(`Pole "${label}" je povinné!`);
          chyby.add(k);
        }
      }
    }

    if (chyby.size > 0) {
      setInvalidFields(chyby);
      // Skočit kurzorem na první chybné pole
      setTimeout(() => {
        const modal = document.querySelector("[data-modal]");
        if (!modal) return;
        const inputs = Array.from(modal.querySelectorAll("input:not([disabled]), select:not([disabled]), textarea:not([disabled])"));
        // Pořadí polí podle jejich klíče — najdeme první chybné v DOM pořadí
        const prvniChybny = inputs.find(inp => {
          const name = inp.getAttribute("data-field");
          return name && chyby.has(name);
        });
        if (prvniChybny) prvniChybny.focus();
      }, 50);
      return;
    }

    setInvalidFields(new Set());
    setSaveErr("");
    onSave(computeRow(form));
  };

  const inputStyle = { padding: "5px 7px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#fff", fontSize: 12, boxSizing: "border-box", width: "100%" };
  const firmaOptions = firmy.map ? firmy.map(f => (typeof f === "string" ? f : f.hodnota)) : firmy;

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <style>{`
        @keyframes pulse-border {
          0%,100% { border-color: #ef4444; box-shadow: 0 0 0 0 rgba(239,68,68,0); }
          50%      { border-color: #ef4444; box-shadow: 0 0 0 3px rgba(239,68,68,0.35); }
        }
      `}</style>
      <div ref={modalRef} data-modal style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "all", background: TENANT.modalBg, borderRadius: 14, width: "min(1400px, 96vw)", maxHeight: "96vh", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>

        {/* Header */}
        <div onMouseDown={onDragStart} style={dragHeaderStyle({ gap: 16 })}>
          <h3 style={{ color: "#fff", margin: 0, fontSize: 16, flexShrink: 0 }}>{title}{dragHint}</h3>
          <input onMouseDown={e => e.stopPropagation()}
            ref={nazevRef}
            data-field="nazev_stavby"
            value={form["nazev_stavby"] ?? ""}
            onChange={e => set("nazev_stavby", e.target.value)}
            placeholder="Název stavby..."
            onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const modal = modalRef.current; if (modal) { const inputs = Array.from(modal.querySelectorAll("input:not([disabled]),select:not([disabled])")); const idx = inputs.indexOf(e.target); if (idx < inputs.length - 1) inputs[idx + 1].focus(); } } }}
            style={{ flex: 1, padding: "7px 14px", background: "rgba(255,255,255,0.07)", border: `1px solid ${invalidFields.has("nazev_stavby") ? "#ef4444" : "rgba(255,255,255,0.15)"}`, borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 600, outline: "none", cursor: "text", animation: invalidFields.has("nazev_stavby") ? "pulse-border 1s ease-in-out infinite" : "none" }} />
          <button onClick={onClose} onMouseDown={e => e.stopPropagation()} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", flexShrink: 0 }}>✕</button>
        </div>

        {/* Body */}
        <div style={{ padding: "8px 14px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>

          {/* LEVÝ SLOUPEC */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: TENANT.p3, fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: `3px solid ${TENANT.p3}`, paddingLeft: 8 }}>ZÁKLADNÍ INFORMACE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <FormField label="Číslo stavby" fieldKey="cislo_stavby" isInvalid={invalidFields.has("cislo_stavby")} value={form["cislo_stavby"]} onChange={v => set("cislo_stavby", v)} />
                <FormSelectField label="Firma" value={form["firma"]} onChange={v => set("firma", v)} options={firmaOptions} />
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: `1px solid ${katErr ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.07)"}` }}>
              <div style={{ color: "#818cf8", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #818cf8", paddingLeft: 8 }}>KATEGORIE I</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <FormField label="Plán. stavby I"  value={form["ps_i"]}  onChange={v => set("ps_i", v)}  type="number" />
                <FormField label="SNK I"            value={form["snk_i"]} onChange={v => set("snk_i", v)} type="number" />
                <FormField label="Běžné opravy I"  value={form["bo_i"]}  onChange={v => set("bo_i", v)}  type="number" />
              </div>
            </div>

            {katErr && <div style={{ color: "#f87171", fontSize: 12, padding: "6px 10px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 7 }}>⚠ {katErr}</div>}

            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: `1px solid ${katErr ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.07)"}` }}>
              <div style={{ color: "#fb923c", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #fb923c", paddingLeft: 8 }}>KATEGORIE II</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <FormField label="Plán. stavby II"  value={form["ps_ii"]}  onChange={v => set("ps_ii", v)}  type="number" />
                <FormField label="Běžné opravy II"  value={form["bo_ii"]}  onChange={v => set("bo_ii", v)}  type="number" />
                <FormField label="Poruchy"           value={form["poruch"]} onChange={v => set("poruch", v)} type="number" />
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#f472b6", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #f472b6", paddingLeft: 8 }}>OSTATNÍ</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <FormField label="SOD"              fieldKey="sod"     isInvalid={invalidFields.has("sod")}     value={form["sod"]}          onChange={v => set("sod", v)} />
                <FormField label="Ze dne"           fieldKey="ze_dne"  isInvalid={invalidFields.has("ze_dne")}  value={form["ze_dne"]}       onChange={v => set("ze_dne", v)}       type="date" />
                <FormSelectField label="Objednatel"    value={form["objednatel"]}   onChange={v => set("objednatel", v)}   options={objednatele} allowEmpty />
                <FormSelectField label="Stavbyvedoucí" value={form["stavbyvedouci"]} onChange={v => set("stavbyvedouci", v)} options={svList}       allowEmpty />
              </div>
              <div style={{ marginTop: 10 }}>
                <Lbl>💡 Cesta ke složce <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>\\\\server\\zakazky\\... nebo http://...</span></Lbl>
                <input type="text" value={form["slozka_url"] || ""} onChange={e => set("slozka_url", e.target.value)} placeholder="\\server\zakazky\ZN-2025-001 nebo http://..." style={{ ...inputSx, width: "100%", boxSizing: "border-box" }} />
              </div>
            </div>
          </div>

          {/* PRAVÝ SLOUPEC */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#34d399", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #34d399", paddingLeft: 8 }}>REALIZACE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <FormField label="Vyfakturováno" value={form["vyfakturovano"]} onChange={v => set("vyfakturovano", v)} type="number" />
                <FormField label="Ukončení"      fieldKey="ukonceni" isInvalid={invalidFields.has("ukonceni")} value={form["ukonceni"]}     onChange={v => set("ukonceni", v)}     type="date" />
                <FormField label="Zrealizováno"  value={form["zrealizovano"]} onChange={v => set("zrealizovano", v)} type="number" />
              </div>
              <div style={{ marginTop: 10, background: tc1(0.08), border: `1px solid ${tc1(0.2)}`, borderRadius: 8, padding: "8px 14px", display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Nabídka: </span><span style={{ color: TENANT.p3, fontWeight: 700 }}>{fmt(computed.nabidka)}</span></div>
                <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Rozdíl: </span><span style={{ color: computed.rozdil >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{fmt(computed.rozdil)}</span></div>
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #fbbf24", paddingLeft: 8 }}>FAKTURA 1</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                <FormField label="Nabídková cena" value={form["nabidkova_cena"]} onChange={v => set("nabidkova_cena", v)} type="number" />
                <FormField label="Číslo faktury"   value={form["cislo_faktury"]}  onChange={v => set("cislo_faktury", v)} />
                <FormField label="Částka bez DPH"  value={form["castka_bez_dph"]} onChange={v => set("castka_bez_dph", v)} type="number" />
                <FormField label="Splatná"          value={form["splatna"]}        onChange={v => set("splatna", v)}        type="date" />
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #f59e0b", paddingLeft: 8, opacity: 0.7 }}>FAKTURA 2</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <FormField label="Č. faktury 2"    value={form["cislo_faktury_2"]}  onChange={v => set("cislo_faktury_2", v)} />
                <FormField label="Částka bez DPH 2" value={form["castka_bez_dph_2"]} onChange={v => set("castka_bez_dph_2", v)} type="number" />
                <FormField label="Splatná 2"        value={form["splatna_2"]}        onChange={v => set("splatna_2", v)}        type="date" />
              </div>
            </div>

            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #a78bfa", paddingLeft: 8 }}>💬 POZNÁMKA</div>
              <textarea value={form["poznamka"] || ""} onChange={e => set("poznamka", e.target.value)} placeholder="Volný komentář ke stavbě..." rows={2}
                style={{ width: "100%", padding: "7px 10px", background: TENANT.inputBg, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }} />
            </div>

            {/* DODATKY */}
            {stavbaId && (() => {
              const { cena: aktCena, termin: aktTermin } = aktualniCenaTermin();
              return (
                <div style={{ gridColumn: "1 / -1", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(251,191,36,0.2)" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                    <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, borderLeft: "3px solid #fbbf24", paddingLeft: 8, flex: 1 }}>📋 DODATKY</div>
                    {!dodatkyLoading && dodatky.length > 0 && (
                      <select value={vybranyDodatek} onChange={e => setVybranyDodatek(e.target.value)}
                        style={{ padding: "4px 8px", background: TENANT.modalBg, border: "1px solid rgba(251,191,36,0.4)", borderRadius: 7, color: "#e2e8f0", fontSize: 12, cursor: "pointer", outline: "none" }}>
                        <option value="zaklad" style={{ background: TENANT.modalBg }}>📌 Základ: {(() => { const z = getZaklad(); return z.hodnota.toLocaleString("cs-CZ") + " Kč" + (z.termin ? " | " + z.termin : ""); })()}</option>
                        {dodatky.map((d, i) => {
                          const { cena: c, termin: t } = getCenaTermin(dodatky, i);
                          return <option key={d.id} value={String(i)} style={{ background: TENANT.modalBg, color: "#fbbf24" }}>{`📋 Dod.${i+1} ${d.nazev}: ${c.toLocaleString("cs-CZ")} Kč${t ? " | " + t : ""}`}</option>;
                        })}
                      </select>
                    )}
                  </div>
                  <div style={{ display: "flex", gap: 24, marginBottom: 10, padding: "6px 12px", background: "rgba(251,191,36,0.08)", borderRadius: 8, border: "1px solid rgba(251,191,36,0.15)" }}>
                    <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Cena: </span><span style={{ color: "#fbbf24", fontWeight: 700 }}>{aktCena.toLocaleString("cs-CZ")} Kč</span></div>
                    <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Termín: </span><span style={{ color: "#fbbf24", fontWeight: 700 }}>{aktTermin || "—"}</span></div>
                    {vybranyDodatek !== "zaklad" && (() => { const z = getZaklad(); return <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>základ: {z.hodnota.toLocaleString("cs-CZ")} Kč{z.termin ? " | " + z.termin : ""}</div>; })()}
                  </div>
                  {dodatkyLoading ? (
                    <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 8 }}>Načítám...</div>
                  ) : dodatky.length === 0 ? (
                    <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginBottom: 8 }}>Žádné dodatky</div>
                  ) : (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                      {dodatky.map((d, i) => (
                        <div key={d.id}>
                          {editDodatekId === d.id ? (
                            <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: 5, padding: "6px 8px", background: "rgba(251,191,36,0.06)", borderRadius: 7, border: "1px solid rgba(251,191,36,0.3)" }}>
                              <input value={editDodatekNazev}  onChange={e => setEditDodatekNazev(e.target.value)}  placeholder="Název..."  style={inputStyle} />
                              <input value={editDodatekCena}   onChange={e => setEditDodatekCena(e.target.value)}   placeholder="±Kč"      style={inputStyle} />
                              <DatePickerField value={editDodatekTermin} onChange={setEditDodatekTermin} />
                              <button onClick={handleUlozitEditDodatek} style={{ padding: "4px 10px", background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 6, color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✓</button>
                              <button onClick={() => setEditDodatekId(null)} style={{ padding: "4px 8px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12 }}>✕</button>
                            </div>
                          ) : (
                            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)" }}>
                              <span style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                              <span style={{ color: "#e2e8f0", fontSize: 12, flex: 1 }}>{d.nazev}</span>
                              {Number(d.zmena_ceny) !== 0 && <span style={{ color: Number(d.zmena_ceny) >= 0 ? "#4ade80" : "#f87171", fontSize: 12, fontWeight: 600 }}>{Number(d.zmena_ceny) >= 0 ? "+" : ""}{Number(d.zmena_ceny).toLocaleString("cs-CZ")} Kč</span>}
                              {d.novy_termin && <span style={{ color: "#94a3b8", fontSize: 11 }}>→ {d.novy_termin}</span>}
                              {smazatDodatekId === d.id ? (
                                <>
                                  <span style={{ color: "#f87171", fontSize: 11 }}>Smazat?</span>
                                  <button onClick={() => handleSmazatDodatek(d.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✓</button>
                                  <button onClick={() => setSmazatDodatekId(null)}  style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12 }}>✕</button>
                                </>
                              ) : (
                                <>
                                  <button onClick={() => handleEditDodatek(d)}    style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 12 }} title="Upravit">✏️</button>
                                  <button onClick={() => setSmazatDodatekId(d.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)",  cursor: "pointer", fontSize: 13 }} title="Smazat">🗑️</button>
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  {!pridatDodatek ? (
                    <button onClick={() => setPridatDodatek(true)} style={{ padding: "5px 12px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 7, color: "#fbbf24", cursor: "pointer", fontSize: 12 }}>+ Přidat dodatek</button>
                  ) : (
                    <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: 6, alignItems: "end", marginTop: 6 }}>
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginBottom: 3 }}>Název</div>
                        <input value={novyDodatekNazev} onChange={e => setNovyDodatekNazev(e.target.value)} placeholder="Název dodatku..." onKeyDown={e => e.key === "Enter" && handlePridatDodatek()} style={inputStyle} />
                      </div>
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginBottom: 3 }}>Změna ceny (Kč)</div>
                        <input value={novyDodatekCena} onChange={e => setNovyDodatekCena(e.target.value)} placeholder="±částka nebo 0" style={inputStyle} />
                      </div>
                      <div>
                        <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginBottom: 3 }}>Nový termín</div>
                        <DatePickerField value={novyDodatekTermin} onChange={setNovyDodatekTermin} />
                      </div>
                      <button onClick={handlePridatDodatek} style={{ padding: "6px 12px", background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 6, color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✓</button>
                      <button onClick={() => { setPridatDodatek(false); setNovyDodatekNazev(""); setNovyDodatekCena(""); setNovyDodatekTermin(""); }} style={{ padding: "6px 10px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12 }}>✕</button>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>

        {saveErr && <div style={{ padding: "8px 24px", background: "rgba(239,68,68,0.15)", borderTop: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13, animation: "pulse-border 1s ease-in-out infinite" }}>⚠️ {saveErr}</div>}

        <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
          <button onClick={handleSave} style={{ padding: "9px 22px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Uložit</button>
        </div>
      </div>
    </div>
  );
}
