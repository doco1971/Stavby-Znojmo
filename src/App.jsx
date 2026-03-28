import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import * as XLSX from "xlsx";
// BUILD: 2026_03_28_build0244
// Refaktoring: komponenty přesunuty do src/components/, src/hooks/, src/utils/

// ── Utils ──────────────────────────────────────────────────
import { IS_JIHLAVA, TENANT, tc1, tc2, tc1d } from "./utils/tenant";
import { sb, sbUpsertNastaveni, logAkce } from "./utils/supabase";
import { APP_BUILD, COLUMNS, NUM_FIELDS, KAT_FIELDS, DATE_FIELDS, TEXT_FIELDS_EXTRA, FIRMA_COLOR_FALLBACK, inputSx, DEMO_USER, DEMO_FIRMY, DEMO_CISELNIKY, DEMO_MAX_STAVBY_DEFAULT, DEMO_USERS } from "./utils/constants";
import { fmt, fmtN, computeRow, hexToRgb, hexToRgbaGlobal } from "./utils/formatters";

// ── Hooks ──────────────────────────────────────────────────
import { useDraggable, dragHeaderStyle, dragHint } from "./hooks/useDraggable.jsx";
import { useIsMobile } from "./hooks/useIsMobile";

// ── Komponenty ─────────────────────────────────────────────
import { NativeSelect } from "./components/NativeSelect";
import { DatePickerField } from "./components/DatePickerField";
import { Login } from "./components/Login";
import { SummaryCards } from "./components/SummaryCards";
import { StavbaCard } from "./components/StavbaCard";
import { HistorieModal } from "./components/HistorieModal";
import { LogModal } from "./components/LogModal";
import { GrafModal } from "./components/GrafModal";
import { FormModal } from "./components/FormModal";
import { SettingsModal } from "./components/SettingsModal";

// ── Sdílené mini-komponenty (zůstávají v App.jsx) ──────────
function Lbl({ children }) {
  return <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 5, textTransform: "uppercase" }}>{children}</div>;
}

export default function App() {
  const [user, setUser] = useState(null);
  const [users, setUsers] = useState([]);
  const [data, setData] = useState([]);
  const [firmy, setFirmy] = useState([]);
  const [objednatele, setObjednatele] = useState([]);
  const [stavbyvedouci, setStavbyvedouci] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState(null);
  const [filterFirma, setFilterFirma] = useState("Všechny firmy");
  const [filterText, setFilterText] = useState("");
  const [filterObjed, setFilterObjed] = useState("Všichni objednatelé");
  const [filterSV, setFilterSV] = useState("Všichni stavbyvedoucí");
  const [showAdvFilter, setShowAdvFilter] = useState(false);
  const { pos: advFilterPos, onMouseDown: onAdvFilterDragStart } = useDraggable(340, 300);
  const [filterRok, setFilterRok] = useState("");
  const [filterCastkaOd, setFilterCastkaOd] = useState("");
  const [filterCastkaDo, setFilterCastkaDo] = useState("");
  const [filterProslé, setFilterProslé] = useState(false);
  const [filterFakturace, setFilterFakturace] = useState("");
  const [filterKat, setFilterKat] = useState("");
  const [editRow, setEditRow] = useState(null);
  const [adding, setAdding] = useState(false);
  const [slozkaPopup, setSlozkaPopup] = useState(null); // { id, url, x, y }
  const [copyRow, setCopyRow] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const isMobile = useIsMobile(768);
  const [cardView, setCardView] = useState(() => window.matchMedia("(max-width: 767px)").matches);

  const [showSettings, setShowSettings] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const { pos: helpPos, onMouseDown: onHelpDragStart, reset: resetHelp } = useDraggable(680, 500);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  // ── Graf ──────────────────────────────────────────────────
  const [showGraf, setShowGraf] = useState(false);
  // ── Log zakázek ──────────────────────────────────────────
  const [showLog, setShowLog] = useState(false);
  // ── Historie změn ────────────────────────────────────────
  const [historieRow, setHistorieRow] = useState(null);
  // ── Tečka v historii — svítí permanentně pokud má stavba záznamy v logu ──
  const [historieNovinky, setHistorieNovinky] = useState({});
  // logPrecteno: { stavba_id: "ISO timestamp" } — načteno z DB (nastaveni, klic=log_precteno)
  const [logPrecteno, setLogPrecteno] = useState({});
  const checkNovinky = useCallback(async () => {
    if (!user || user.email === "demo") return;
    try {
      const [logRes, prectenoRes] = await Promise.all([
        sb(`log_aktivit?order=cas.desc&limit=5000`),
        sb(`nastaveni?klic=eq.log_precteno`),
      ]);
      // Načti časy přečtení
      let precteno = {};
      if (prectenoRes && prectenoRes[0]) {
        try { precteno = JSON.parse(prectenoRes[0].hodnota); } catch {}
      }
      setLogPrecteno(precteno);
      // Pro každou stavbu zjisti, zda má nepřečtený záznam
      const novinky = {};
      (logRes || []).forEach(r => {
        if (r.hidden) return;
        const match = r.detail?.match(/^ID:\s*(\d+)[,\s]/);
        if (!match) return;
        const sid = match[1];
        // Tečka svítí pokud záznam je novější než poslední přečtení (nebo přečtení neexistuje)
        const prectCas = precteno[sid];
        if (!prectCas || new Date(r.cas) > new Date(prectCas)) {
          novinky[sid] = true;
        }
      });
      setHistorieNovinky(novinky);
    } catch { /* tiché selhání */ }
  }, [user]);
  useEffect(() => { checkNovinky(); }, [checkNovinky]);
  // ── Auto-logout ──────────────────────────────────────────
  const [autoLogoutWarning, setAutoLogoutWarning] = useState(false);
  const [autoLogoutCountdown, setAutoLogoutCountdown] = useState(60);
  const autoLogoutTimer = useRef(null);
  const autoLogoutCountdownTimer = useRef(null);
  const [autoLogoutMinutes, setAutoLogoutMinutes] = useState(15);
  const [appNazev, setAppNazev] = useState("Stavby Znojmo");
  const [deadlineDays, setDeadlineDays] = useState(30);
  const [demoMaxStavby, setDemoMaxStavby] = useState(15);
  // Povinná pole: objekt { cislo_stavby: false, nazev_stavby: true, ukonceni: false, sod: false, ze_dne: false }
  const [povinnaPole, setPovinnaPole] = useState({ cislo_stavby: false, nazev_stavby: true, ukonceni: false, sod: false, ze_dne: false });
  // Prefix číslování
  const [prefixEnabled, setPrefixEnabled] = useState(false);
  const [prefixValue, setPrefixValue] = useState("ZN-");
  // Viditelnost sloupců per role: { key: "user"|"user_e"|"admin"|"superadmin" }
  const [sloupceRole, setSloupceRole] = useState({});
  // ── Browser notifikace ───────────────────────────────────
  const notifPermission = useRef(null);
  const notifSentRef = useRef(false);
  const notifIntervalRef = useRef(null);
  const [tooltip, setTooltip] = useState({ visible: false, text: "", x: 0, y: 0 });
  const tooltipTimer = useRef(null);
  const showTooltip = (e, text) => {
    const r = e.currentTarget.getBoundingClientRect();
    const spaceBelow = window.innerHeight - r.bottom;
    const above = spaceBelow < 40;
    const approxW = Math.max(text.length * 7, 80);
    const xCenter = r.left + r.width / 2;
    const xClamped = Math.max(8, Math.min(xCenter - approxW / 2, window.innerWidth - approxW - 8));
    tooltipTimer.current = setTimeout(() => {
      setTooltip({ visible: true, text, x: xClamped, y: above ? r.top - 34 : r.bottom + 6, above });
    }, 600);
  };
  const hideTooltip = () => { clearTimeout(tooltipTimer.current); setTooltip(t => ({ ...t, visible: false })); };
  // ── inline editing odstraněno – editace přes tlačítko ✏️
  const [showExport, setShowExport] = useState(false);
  const exportBtnRef = useRef(null);
  const [exportPos, setExportPos] = useState({ top: 0, right: 0 });
  const [confirmExport, setConfirmExport] = useState(null); // { type, label }

  // ── Toast notifikace (nahrazuje alert) ────────────────────
  const [toast, setToast] = useState(null);
  const showToast = useCallback((msg, type = "error") => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  const doExportXLSColor = () => {
    const firmaColorMap = Object.fromEntries(firmy.map(f => [f.hodnota, f.barva || TENANT.p2]));
    const cols = COLUMNS.filter(c => c.key !== "id");
    const headers = cols.map(c => `<th style="padding:7px 10px;background:${TENANT.p1deep};color:#fff;border:1px solid ${TENANT.p1};white-space:nowrap;font-size:11px">${c.label}</th>`).join("");
    const rows = filtered.map((row, i) => {
      const hex = firmaColorMap[row.firma] || TENANT.p2;
      const rgb = hexToRgb(hex);
      const bg = i % 2 === 0 ? `rgba(${rgb},0.18)` : `rgba(${rgb},0.07)`;
      const cells = cols.map(c => {
        const v = row[c.key] ?? "";
        const isNum = c.type === "number" && v !== "" && Number(v) !== 0;
        const display = isNum ? Number(v).toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v;
        const color = c.key === "rozdil" ? (Number(v) >= 0 ? "#166534" : "#991b1b") : "#1e293b";
        const align = c.type === "number" ? "right" : ["cislo_stavby","ukonceni","sod","ze_dne","cislo_faktury","splatna"].includes(c.key) ? "center" : "left";
        // Sloupec firma – zvýrazni barvou firmy
        const cellBg = c.key === "firma" ? hex : bg;
        const cellColor = c.key === "firma" ? "#fff" : color;
        const cellWeight = c.key === "firma" ? "700" : "400";
        return `<td style="padding:5px 10px;border:1px solid #E2E8F0;background:${cellBg};color:${cellColor};white-space:nowrap;text-align:${align};font-size:10px;font-weight:${cellWeight}">${display}</td>`;
      }).join("");
      return `<tr>${cells}</tr>`;
    }).join("");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
      <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
    </body></html>`;
    const ts = new Date().toISOString().slice(0,16).replace("T","_").replace(":","-");
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `stavby_znojmo_${ts}.xls`;
    a.click();
  };
  const [logData, setLogData] = useState([]);
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("theme") || "light"; } catch { return "light"; }
  });
  const [themeStrength, setThemeStrength] = useState(() => {
    try { return parseInt(localStorage.getItem("themeStrength") || "50", 10); } catch { return 50; }
  });
  const [liquidGlass, setLiquidGlass] = useState(() => {
    try { return localStorage.getItem("liquidGlass") === "1"; } catch { return false; }
  });
  const liquidGlassRef = useRef(false);
  useEffect(() => { liquidGlassRef.current = liquidGlass; }, [liquidGlass]);
  const [lgStrength, setLgStrength] = useState(() => {
    try { return parseInt(localStorage.getItem("lgStrength") || "60", 10); } catch { return 60; }
  });

  // Univerzální slider — null | "theme" | "lg"
  const [activeSlider, setActiveSlider] = useState(null);
  const sliderTimer = useRef(null);

  const sliderStartTimer = () => {
    if (sliderTimer.current) clearTimeout(sliderTimer.current);
    sliderTimer.current = setTimeout(() => setActiveSlider(null), 2000);
  };
  const sliderResetTimer = () => {
    if (sliderTimer.current) clearTimeout(sliderTimer.current);
    sliderTimer.current = setTimeout(() => setActiveSlider(null), 2000);
  };
  const sliderShow = (type) => {
    setActiveSlider(type);
    if (sliderTimer.current) clearTimeout(sliderTimer.current);
    sliderTimer.current = setTimeout(() => setActiveSlider(null), 2000);
  };

  const changeThemeStrength = (v) => {
    setThemeStrength(v);
    try { localStorage.setItem("themeStrength", String(v)); } catch {}
    sliderResetTimer();
  };
  const changeLgStrength = (v) => {
    setLgStrength(v);
    try { localStorage.setItem("lgStrength", String(v)); } catch {}
    sliderResetTimer();
  };
  const [exportPreview, setExportPreview] = useState(null);

  const isDarkComputed = (t) => t === "dark" || (t === "system" && typeof window !== "undefined" && window.matchMedia("(prefers-color-scheme: dark)").matches);

  const loadLog = useCallback(async (superAdmin = false) => {
    try {
      const hiddenFilter = superAdmin ? "" : "&hidden=eq.false";
      const res = await sb(`log_aktivit?order=cas.desc&limit=1000${hiddenFilter}`);
      setLogData(res);
      return res;
    } catch (e) { console.warn("Log load error:", e); return []; }
  }, []);

  const isAdmin = user?.role === "admin" || user?.role === "superadmin";
  const isSuperAdmin = user?.role === "superadmin";
  const isEditor = user?.role === "user_e" || isAdmin;
  const isDemo = user?.email === "demo";
  const isStaging = typeof window !== "undefined" && (
    window.location.hostname.includes("staging") ||
    window.location.hostname.includes("preview") ||
    window.location.hostname === "localhost"
  );

  // ── Šířky sloupců (jen superadmin) ─────────────────────────
  const [colWidths, setColWidths] = useState({});
  const [appVerze, setAppVerze] = useState("1.0");
  const [appDatum, setAppDatum] = useState("2025");

  // Pořadí sloupců — uloženo v localStorage
  const defaultColOrder = COLUMNS.filter(c => c.key !== "id" && !c.hidden).map(c => c.key);
  const [colOrder, setColOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("colOrder") || "null");
      if (Array.isArray(saved) && saved.length === defaultColOrder.length) return saved;
    } catch {}
    return defaultColOrder;
  });
  const dragColKey = useRef(null);
  const dragOverKey = useRef(null);
  const [dragOverState, setDragOverState] = useState(null); // pro vizuální highlight

  const saveColOrder = (order) => {
    try { localStorage.setItem("colOrder", JSON.stringify(order)); } catch {}
  };
  const resetColOrder = () => {
    setColOrder(defaultColOrder);
    saveColOrder(defaultColOrder);
  };

  // orderedCols — COLUMNS seřazené dle colOrder, filtrované dle role uživatele
  const ROLE_ORDER = ["user", "user_e", "admin", "superadmin"];
  const userRoleIdx = ROLE_ORDER.indexOf(user?.role || "user");
  const orderedCols = colOrder
    .map(key => COLUMNS.find(c => c.key === key))
    .filter(Boolean)
    .filter(c => !c.hidden)
    .filter(c => {
      const minRole = sloupceRole[c.key];
      if (!minRole) return true; // výchozí = vidí všichni
      return userRoleIdx >= ROLE_ORDER.indexOf(minRole);
    });

  useEffect(() => {
    sb("nastaveni?klic=eq.app_info").then(res => {
      if (res && res[0]) {
        try {
          const info = JSON.parse(res[0].hodnota);
          if (info.verze) setAppVerze(info.verze);
          if (info.datum) setAppDatum(info.datum);
        } catch {}
      }
    }).catch(() => {});
  }, []);

  // Notifikační emaily — uloženy v DB pod klicem notify_emails
  const [notifyEmails, setNotifyEmails] = useState("");
  useEffect(() => {
    if (isDemo) return;
    sb("nastaveni?klic=eq.notify_emails").then(res => {
      if (res && res[0]) setNotifyEmails(res[0].hodnota || "");
    }).catch(() => {});
  }, [isDemo]);

  const saveNotifyEmails = async (val) => {
    if (isDemo) return;
    try {
      await sbUpsertNastaveni("notify_emails", val);
      setNotifyEmails(val);
    } catch {}
  };

  // Složka — minimální role pro zobrazení tlačítka 💡
  // Hodnoty: "user" | "user_e" | "admin" | "superadmin" | "none"
  const [slozkaRole, setSlozkaRole] = useState("admin");
  const [autoZaloha, setAutoZaloha] = useState(true);
  const [zalohaRole, setZalohaRole] = useState("superadmin");
  useEffect(() => {
    if (isDemo) return;
    sb("nastaveni?klic=eq.slozka_role").then(res => {
      if (res && res[0]) setSlozkaRole(res[0].hodnota || "admin");
    }).catch(() => {});
    sb("nastaveni?klic=eq.auto_logout_minutes").then(res => {
      if (res && res[0]) { const v = parseInt(res[0].hodnota); if (!isNaN(v) && v > 0) setAutoLogoutMinutes(v); }
    }).catch(() => {});
    sb("nastaveni?klic=eq.app_nazev").then(res => {
      if (res && res[0] && res[0].hodnota) setAppNazev(res[0].hodnota);
    }).catch(() => {});
    sb("nastaveni?klic=eq.deadline_days").then(res => {
      if (res && res[0]) { const v = parseInt(res[0].hodnota); if (!isNaN(v) && v > 0) setDeadlineDays(v); }
    }).catch(() => {});
    sb("nastaveni?klic=eq.demo_max_stavby").then(res => {
      if (res && res[0]) { const v = parseInt(res[0].hodnota); if (!isNaN(v) && v >= 0) setDemoMaxStavby(v); }
    }).catch(() => {});
    sb("nastaveni?klic=eq.povinna_pole").then(res => {
      if (res && res[0]) { try { const v = JSON.parse(res[0].hodnota); setPovinnaPole(prev => ({ ...prev, ...v, nazev_stavby: true })); } catch {} }
    }).catch(() => {});
    sb("nastaveni?klic=eq.cislo_prefix").then(res => {
      if (res && res[0]) { try { const v = JSON.parse(res[0].hodnota); setPrefixEnabled(!!v.enabled); setPrefixValue(v.value || "ZN-"); } catch {} }
    }).catch(() => {});
    sb("nastaveni?klic=eq.sloupce_role").then(res => {
      if (res && res[0]) { try { setSloupceRole(JSON.parse(res[0].hodnota)); } catch {} }
    }).catch(() => {});
  }, [isDemo]);

  const saveZalohaRole = async (val) => {
    setZalohaRole(val);
    if (isDemo) return;
    try { await sbUpsertNastaveni("zaloha_role", val); } catch {}
  };

  const saveAutoLogoutMinutes = async (val) => {
    setAutoLogoutMinutes(val);
    if (isDemo) return;
    try { await sbUpsertNastaveni("auto_logout_minutes", String(val)); } catch {}
  };

  const saveAppNazev = async (val) => {
    setAppNazev(val || "Stavby Znojmo");
    if (isDemo) return;
    try { await sbUpsertNastaveni("app_nazev", val); } catch {}
  };

  const saveDeadlineDays = async (val) => {
    setDeadlineDays(val);
    if (isDemo) return;
    try { await sbUpsertNastaveni("deadline_days", String(val)); } catch {}
  };

  const saveDemoMaxStavby = async (val) => {
    setDemoMaxStavby(val);
    if (isDemo) return;
    try { await sbUpsertNastaveni("demo_max_stavby", String(val)); } catch {}
  };

  const savePovinnaPole = async (pole) => {
    const next = { ...pole, nazev_stavby: true };
    setPovinnaPole(next);
    if (isDemo) return;
    try { await sbUpsertNastaveni("povinna_pole", JSON.stringify(next)); } catch {}
  };

  const saveCisloPrefix = async (enabled, value) => {
    setPrefixEnabled(enabled);
    setPrefixValue(value);
    if (isDemo) return;
    try { await sbUpsertNastaveni("cislo_prefix", JSON.stringify({ enabled, value })); } catch {}
  };

  const saveSloupceRole = async (next) => {
    setSloupceRole(next);
    if (isDemo) return;
    try { await sbUpsertNastaveni("sloupce_role", JSON.stringify(next)); } catch {}
  };

  const saveSlozkaRole = async (val) => {
    if (isDemo) return;
    setSlozkaRole(val);
    try { await sbUpsertNastaveni("slozka_role", val); } catch {}
  };

  // Detekce rozšíření Stavby Znojmo
  const [extensionReady, setExtensionReady] = useState(false);
  const [protokolReady, setProtokolReady] = useState(false);

  // Detekce rozšíření (window message)
  useEffect(() => {
    const handler = (e) => {
      if (e.data && e.data.type === "STAVBY_EXTENSION_READY") setExtensionReady(true);
      if (e.data && e.data.type === "STAVBY_OPEN_FOLDER_RESULT" && e.data.success === false && e.data.fallbackClipboard) {
        // Rozšíření je, ale native host selhal — zkopíruj cestu
        navigator.clipboard.writeText(e.data.path || "")
          .then(() => showToast("📋 Cesta zkopírována (helper selhal — zkontroluj instalaci)", "ok"))
          .catch(() => {});
      }
    };
    window.addEventListener("message", handler);
    return () => window.removeEventListener("message", handler);
  }, []);

  // Detekce localhost helperu — ping každých 30 sekund
  useEffect(() => {
    const checkHelper = () => {
      fetch("http://localhost:47891/ping")
        .then(r => { setProtokolReady(r.ok); })
        .catch(() => { setProtokolReady(false); });
    };
    checkHelper();
    const interval = setInterval(checkHelper, 30000);
    return () => clearInterval(interval);
  }, []);

  // Otevření složky — localhost helper na http://localhost:47891
  // Funguje ve všech prohlížečích, žádné problémy s elevated právy
  const openFolder = (path) => {
    if (!path) return;

    // HTTP/HTTPS odkaz — otevřít přímo v prohlížeči
    if (path.startsWith("http://") || path.startsWith("https://")) {
      window.open(path, "_blank", "noopener");
      return;
    }

    // Metoda 1: localhost helper (timeout 3s)
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3000);
    fetch(`http://localhost:47891/open?path=${encodeURIComponent(path)}`, { signal: controller.signal })
      .then(r => {
        clearTimeout(timer);
        if (r.ok) {
          setProtokolReady(true);
          showToast("📂 Složka otevřena", "ok");
          // Dej focus zpet na okno prohlizece (pomaha v Chrome)
          window.focus();
        } else {
          throw new Error("Helper chyba");
        }
      })
      .catch((e) => {
        clearTimeout(timer);
        if (e.name === "AbortError") {
          // Timeout — helper mozna bezi ale pomalu, nezobrazuj chybu
          return;
        }
        // Metoda 2: rozšíření prohlížeče
        if (extensionReady) {
          window.postMessage({ type: "STAVBY_OPEN_FOLDER", path }, "*");
          return;
        }
        // Metoda 3: clipboard fallback
        navigator.clipboard.writeText(path)
          .then(() => showToast("📋 Cesta zkopírována — nainstalujte Stavby Helper pro přímé otevírání (Nastavení → 💡)", "ok"))
          .catch(() => showToast("Nepodařilo se zkopírovat cestu", "error"));
      });
  };

  // Zobrazit tlačítko 💡 pro aktuálního uživatele?
  const showSlozka = (() => {
    if (slozkaRole === "none") return false;
    if (slozkaRole === "user") return true;
    if (slozkaRole === "user_e") return isEditor;
    if (slozkaRole === "admin") return isAdmin;
    if (slozkaRole === "superadmin") return isSuperAdmin;
    return false;
  })();

  const saveAppInfo = async (verze, datum) => {
    if (isDemo) { setAppVerze(verze); setAppDatum(datum); return; }
    try {
      await sbUpsertNastaveni("app_info", JSON.stringify({ verze, datum }));
      setAppVerze(verze);
      setAppDatum(datum);
    } catch {}
  };
  const dragInfo = useRef(null);

  useEffect(() => {
    if (!isSuperAdmin || isDemo) return;
    sb("nastaveni?klic=eq.col_widths").then(res => {
      if (res && res[0]) {
        try { setColWidths(JSON.parse(res[0].hodnota)); } catch {}
      }
    }).catch(() => {});
  }, [isSuperAdmin, isDemo]);

  const saveColWidths = async (widths) => {
    if (isDemo) return;
    try { await sbUpsertNastaveni("col_widths", JSON.stringify(widths)); } catch {}
  };

  const [editingColWidth, setEditingColWidth] = useState(null);

  const startDrag = (e, colKey, currentWidth) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startWidth = currentWidth;
    let lastWidth = startWidth;
    const onMove = (ev) => {
      ev.preventDefault();
      const diff = ev.clientX - startX;
      lastWidth = Math.max(40, startWidth + diff);
      setColWidths(prev => ({ ...prev, [colKey]: lastWidth }));
    };
    const onUp = (ev) => {
      ev.preventDefault();
      saveColWidths({ ...colWidths, [colKey]: lastWidth });
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
  };

  const getColWidth = (col) => colWidths[col.key] ?? col.width;

  // Drag & drop handlery pro přehazování sloupců
  const handleColDragStart = (e, colKey) => {
    dragColKey.current = colKey;
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", colKey);
  };
  const handleColDragOver = (e, colKey) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (dragOverKey.current !== colKey) {
      dragOverKey.current = colKey;
      setDragOverState(colKey);
    }
  };
  const handleColDragLeave = () => {
    dragOverKey.current = null;
    setDragOverState(null);
  };
  const handleColDrop = (e, targetKey) => {
    e.preventDefault();
    const srcKey = dragColKey.current;
    if (!srcKey || srcKey === targetKey) { setDragOverState(null); return; }
    setColOrder(prev => {
      const next = [...prev];
      const fromIdx = next.indexOf(srcKey);
      const toIdx = next.indexOf(targetKey);
      if (fromIdx === -1 || toIdx === -1) return prev;
      next.splice(fromIdx, 1);
      next.splice(toIdx, 0, srcKey);
      saveColOrder(next);
      return next;
    });
    dragColKey.current = null;
    dragOverKey.current = null;
    setDragOverState(null);
  };
  const handleColDragEnd = () => {
    dragColKey.current = null;
    dragOverKey.current = null;
    setDragOverState(null);
  };

  // ── Načtení dat z Supabase ─────────────────────────────────
  const loadAll = useCallback(async (isDemo = false) => {
    setLoading(true);
    setDbError(null);
    if (isDemo) {
      const dnes = new Date();
      const fmtDate = (d) => `${d.getDate().toString().padStart(2,"0")}.${(d.getMonth()+1).toString().padStart(2,"0")}.${d.getFullYear()}`;
      const za5  = new Date(dnes); za5.setDate(za5.getDate() + 5);
      const za10 = new Date(dnes); za10.setDate(za10.getDate() + 10);
      const za25 = new Date(dnes); za25.setDate(za25.getDate() + 25);
      const za45 = new Date(dnes); za45.setDate(za45.getDate() + 45);
      const pred5  = new Date(dnes); pred5.setDate(pred5.getDate() - 5);
      const pred10 = new Date(dnes); pred10.setDate(pred10.getDate() - 10);
      const pred30 = new Date(dnes); pred30.setDate(pred30.getDate() - 30);
      const pred60 = new Date(dnes); pred60.setDate(pred60.getDate() - 60);
      const demoStavby = [
        computeRow({ id:1, firma:"Elektro s.r.o.",  cislo_stavby:"ZN-I-2025-001",  nazev_stavby:"Rekonstrukce VO Pražská",          ps_i:850000,  snk_i:120000, bo_i:0,      ps_ii:0,      bo_ii:0,      poruch:45000,  vyfakturovano:720000,  ukonceni:fmtDate(za10),  zrealizovano:680000,  sod:"SOD-2025-014", ze_dne:"15.01.2025", objednatel:"Město Znojmo",       stavbyvedouci:"Jan Novák",       nabidkova_cena:1015000, cislo_faktury:"FAK-2025-031", castka_bez_dph:594000,  splatna:"28.02.2025", poznamka:"Práce probíhají dle harmonogramu, zbývá dokončit úsek u náměstí." }),
        computeRow({ id:2, firma:"Stavmont a.s.",   cislo_stavby:"ZN-I-2025-002",  nazev_stavby:"Oprava kanalizace Dvořákova",      ps_i:0,       snk_i:0,      bo_i:320000, ps_ii:0,      bo_ii:180000, poruch:0,      vyfakturovano:0,       ukonceni:fmtDate(pred30), zrealizovano:0,      sod:"SOD-2025-022", ze_dne:"10.02.2025", objednatel:"Jihomoravský kraj",  stavbyvedouci:"Petr Svoboda",    nabidkova_cena:500000,  cislo_faktury:"",             castka_bez_dph:0,       splatna:"",           poznamka:"" }),
        computeRow({ id:3, firma:"VHS Znojmo",      cislo_stavby:"ZN-II-2025-003", nazev_stavby:"Výměna vodovodního řadu Horní",    ps_i:0,       snk_i:0,      bo_i:0,      ps_ii:640000, bo_ii:0,      poruch:95000,  vyfakturovano:640000,  ukonceni:fmtDate(pred5),  zrealizovano:640000,  sod:"SOD-2025-031", ze_dne:"05.03.2025", objednatel:"Město Znojmo",       stavbyvedouci:"Marie Horáková",  nabidkova_cena:735000,  cislo_faktury:"FAK-2025-044", castka_bez_dph:528000,  splatna:"30.04.2025", poznamka:"" }),
        computeRow({ id:4, firma:"Silnice JM",      cislo_stavby:"ZN-I-2025-004",  nazev_stavby:"Oprava komunikace Přímětická",    ps_i:1200000, snk_i:0,      bo_i:85000,  ps_ii:0,      bo_ii:0,      poruch:0,      vyfakturovano:950000,  ukonceni:fmtDate(za25),  zrealizovano:900000,  sod:"SOD-2025-041", ze_dne:"20.03.2025", objednatel:"Správa silnic",      stavbyvedouci:"Tomáš Blaha",     nabidkova_cena:1285000, cislo_faktury:"",             castka_bez_dph:0,       splatna:"",           poznamka:"Pozor — změna trasy v úseku km 1,2–1,8, nutné nové povolení." }),
        computeRow({ id:5, firma:"Elektro s.r.o.",  cislo_stavby:"ZN-II-2025-005", nazev_stavby:"Rozšíření sítě NN Citonice",       ps_i:0,       snk_i:0,      bo_i:0,      ps_ii:380000, bo_ii:210000, poruch:30000,  vyfakturovano:380000,  ukonceni:fmtDate(pred60), zrealizovano:380000,  sod:"SOD-2025-052", ze_dne:"01.01.2025", objednatel:"MO ČR",              stavbyvedouci:"Jan Novák",       nabidkova_cena:620000,  cislo_faktury:"FAK-2025-018", castka_bez_dph:314000,  splatna:"15.02.2025", poznamka:"" }),
        computeRow({ id:6, firma:"Stavmont a.s.",   cislo_stavby:"ZN-I-2025-006",  nazev_stavby:"Revitalizace parku Smetanovo nám.", ps_i:560000, snk_i:75000,  bo_i:0,      ps_ii:0,      bo_ii:0,      poruch:0,      vyfakturovano:0,       ukonceni:fmtDate(za45),  zrealizovano:0,      sod:"SOD-2025-061", ze_dne:"01.04.2025", objednatel:"Město Znojmo",       stavbyvedouci:"Petr Svoboda",    nabidkova_cena:635000,  cislo_faktury:"",             castka_bez_dph:0,       splatna:"",           poznamka:"" }),
        computeRow({ id:7, firma:"VHS Znojmo",      cislo_stavby:"ZN-II-2025-007", nazev_stavby:"ČOV — rozšíření kapacity",         ps_i:0,       snk_i:0,      bo_i:0,      ps_ii:2100000,bo_ii:340000, poruch:180000, vyfakturovano:1800000, ukonceni:fmtDate(za5),   zrealizovano:1750000, sod:"SOD-2025-071", ze_dne:"15.02.2025", objednatel:"Jihomoravský kraj",  stavbyvedouci:"Marie Horáková",  nabidkova_cena:2620000, cislo_faktury:"FAK-2025-056", castka_bez_dph:1487000, splatna:"31.05.2025", poznamka:"Finální přejímka naplánována na konec května." }),
        computeRow({ id:8, firma:"Silnice JM",      cislo_stavby:"ZN-I-2025-008",  nazev_stavby:"SNK Znojmo — sítě pro RD",         ps_i:0,       snk_i:430000, bo_i:0,      ps_ii:0,      bo_ii:0,      poruch:0,      vyfakturovano:430000,  ukonceni:fmtDate(pred10), zrealizovano:430000,  sod:"SOD-2025-082", ze_dne:"10.03.2025", objednatel:"Správa silnic",      stavbyvedouci:"Tomáš Blaha",     nabidkova_cena:430000,  cislo_faktury:"FAK-2025-062", castka_bez_dph:355000,  splatna:"30.04.2025", poznamka:"" }),
      ];
      setData(demoStavby);
      setFirmy(DEMO_FIRMY);
      setObjednatele(DEMO_CISELNIKY.objednatele);
      setStavbyvedouci(DEMO_CISELNIKY.stavbyvedouci);
      setUsers(DEMO_USERS);
      setLoading(false);
      return;
    }
    try {
      const [stavbyRes, ciselnikyRes, uzivRes] = await Promise.all([
        sb("stavby?order=id"),
        sb("ciselniky?order=poradi"),
        sb("uzivatele?order=id"),
      ]);
      setData(stavbyRes.map(computeRow));
      setFirmy(ciselnikyRes.filter(r => r.typ === "firma").map(r => ({ hodnota: r.hodnota, barva: r.barva || "" })));
      setObjednatele(ciselnikyRes.filter(r => r.typ === "objednatel").map(r => r.hodnota));
      setStavbyvedouci(ciselnikyRes.filter(r => r.typ === "stavbyvedouci").map(r => r.hodnota));
      setUsers(uzivRes.map(u => ({ id: u.id, email: u.email, password: u.heslo, role: u.role, name: u.jmeno })));
    } catch (e) {
      setDbError("Chyba připojení k databázi: " + e.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadAll(user?.email === "demo"); }, [loadAll, user?.email]);

  // ── Automatická záloha při prvním spuštění dne ────────────────
  useEffect(() => {
    try {
      const v = localStorage.getItem("autoZaloha");
      if (v === "false") setAutoZaloha(false);
    } catch {}
  }, []);

  useEffect(() => {
    if (!user || user.email === "demo" || !isSuperAdmin || !autoZaloha) return;
    const dnes = new Date().toISOString().slice(0, 10);
    const klic = `lastBackup_${user.email}`;
    try {
      const posledni = localStorage.getItem(klic);
      if (posledni !== dnes) {
        const t = setTimeout(() => {
          zalohaJSON();
          localStorage.setItem(klic, dnes);
        }, 3000);
        return () => clearTimeout(t);
      }
    } catch {}
  }, [user, isSuperAdmin, autoZaloha]);

  // ── Upozornění na blížící se termíny ──────────────────────
  const [deadlineWarnings, setDeadlineWarnings] = useState([]);
  const [showDeadlines, setShowDeadlines] = useState(false);
  const { pos: deadlinesPos, onMouseDown: onDeadlinesDragStart, reset: resetDeadlines } = useDraggable(820, 500);
  const [showOrphanWarning, setShowOrphanWarning] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);
  const [showFilterRow2, setShowFilterRow2] = useState(false);

  const pracovniDny = (from, to) => {
    const d0 = new Date(from); d0.setHours(0,0,0,0);
    const d1 = new Date(to); d1.setHours(0,0,0,0);
    if (d1 <= d0) return 0;
    const totalDays = Math.round((d1 - d0) / 86400000);
    const fullWeeks = Math.floor(totalDays / 7);
    const extra = totalDays % 7;
    const startDay = d0.getDay();
    let extraWork = 0;
    for (let i = 1; i <= extra; i++) {
      const day = (startDay + i) % 7;
      if (day !== 0 && day !== 6) extraWork++;
    }
    return fullWeeks * 5 + extraWork;
  };

  const parseDatum = (s) => {
    if (!s) return null;
    const parts = s.trim().split(".");
    if (parts.length !== 3) return null;
    const d = new Date(`${parts[2]}-${parts[1].padStart(2,"0")}-${parts[0].padStart(2,"0")}`);
    return isNaN(d) ? null : d;
  };

  useEffect(() => {
    if (!data.length) return;
    const dnes = new Date();
    dnes.setHours(0,0,0,0);
    const warnings = data
      .filter(r => r.ukonceni)
      .map(r => {
        const datum = parseDatum(r.ukonceni);
        if (!datum) return null;
        const isFaktura = r.cislo_faktury && r.cislo_faktury.trim() !== "" && Number(r.castka_bez_dph) !== 0 && r.splatna;
        if (datum < dnes) {
          // Prošlý termín — zobrazit jen pokud nemá fakturu
          if (isFaktura) return null;
          const dniPo = pracovniDny(datum, dnes);
          return { ...r, dniDo: -dniPo, datumUkonceni: datum };
        }
        const dni = pracovniDny(dnes, datum);
        if (dni > deadlineDays) return null;
        if (isFaktura) return null;  // vyfakturovaná stavba — nezobrazovat v termínech
        return { ...r, dniDo: dni, datumUkonceni: datum };
      })
      .filter(Boolean)
      .sort((a, b) => a.dniDo - b.dniDo);
    setDeadlineWarnings(warnings);
  }, [data, deadlineDays]);

  const shownDeadlineOnce = useRef(false);
  // Reset při změně uživatele
  useEffect(() => { shownDeadlineOnce.current = false; shownOrphanOnce.current = false; }, [user?.email]);
  useEffect(() => {
    if (user && user.email !== "demo" && !shownDeadlineOnce.current && deadlineWarnings.length > 0) {
      shownDeadlineOnce.current = true;
      resetDeadlines();
      setShowDeadlines(true);
    }
  }, [deadlineWarnings, user]);

  const shownOrphanOnce = useRef(false);
  useEffect(() => {
    if (user && user.email !== "demo" && !shownOrphanOnce.current && data.length > 0 && firmy.length > 0) {
      const firmyNames = firmy.map(f => f.hodnota);
      const orphans = data.filter(s => !s.firma || !firmyNames.includes(s.firma));
      if (orphans.length > 0) {
        shownOrphanOnce.current = true;
        setShowOrphanWarning(true);
      }
    }
  }, [data, firmy, user]);

  useEffect(() => {
    const dark = isDarkComputed(theme);
    document.body.style.background = dark ? TENANT.appDarkBg : TENANT.appLightBg;
    document.body.style.color = dark ? "#e2e8f0" : "#1e293b";
  }, [theme]);

  // ── Auto-logout: 15 min nečinnost ────────────────────────
  useEffect(() => {
    if (!user || isDemo) return;
    const resetTimer = () => {
      if (autoLogoutWarning) return; // neresetuj když countdown běží
      clearTimeout(autoLogoutTimer.current);
      autoLogoutTimer.current = setTimeout(() => {
        setAutoLogoutWarning(true);
        setAutoLogoutCountdown(60);
      }, autoLogoutMinutes * 60 * 1000);
    };
    const events = ["mousemove","keydown","click","scroll","touchstart"];
    events.forEach(e => window.addEventListener(e, resetTimer, { passive: true }));
    resetTimer();
    return () => {
      events.forEach(e => window.removeEventListener(e, resetTimer));
      clearTimeout(autoLogoutTimer.current);
    };
  }, [user, isDemo, autoLogoutWarning]);

  useEffect(() => {
    if (!autoLogoutWarning) { clearInterval(autoLogoutCountdownTimer.current); return; }
    autoLogoutCountdownTimer.current = setInterval(() => {
      setAutoLogoutCountdown(c => {
        if (c <= 1) {
          clearInterval(autoLogoutCountdownTimer.current);
          setAutoLogoutWarning(false);
          setUser(null);
          return 60;
        }
        return c - 1;
      });
    }, 1000);
    return () => clearInterval(autoLogoutCountdownTimer.current);
  }, [autoLogoutWarning]);

  // ── Browser notifikace ───────────────────────────────────
  const sendDeadlineNotifications = useCallback((warnings) => {
    if (!("Notification" in window)) return;
    if (Notification.permission !== "granted") return;
    const urgent = warnings.filter(r => r.dniDo <= 7);
    urgent.forEach(r => {
      new Notification("⚠️ Blížící se termín stavby", {
        body: `${r.cislo_stavby} – ${r.nazev_stavby}\nTermín: ${r.ukonceni} (${r.dniDo} pracovních dní)`,
        icon: "/favicon.ico",
        tag: `stavba-${r.id}`,
      });
    });
  }, []);

  useEffect(() => {
    if (!user || isDemo || !("Notification" in window)) return;
    if (Notification.permission === "default") {
      Notification.requestPermission().then(p => { notifPermission.current = p; });
    } else {
      notifPermission.current = Notification.permission;
    }
  }, [user, isDemo]);

  useEffect(() => {
    if (!user || isDemo || deadlineWarnings.length === 0) return;
    if (!notifSentRef.current) {
      notifSentRef.current = true;
      sendDeadlineNotifications(deadlineWarnings);
    }
    // Opakovat každých 60 minut pouze pokud tab není aktivní
    clearInterval(notifIntervalRef.current);
    notifIntervalRef.current = setInterval(() => {
      if (document.hidden) sendDeadlineNotifications(deadlineWarnings);
    }, 60 * 60 * 1000);
    return () => clearInterval(notifIntervalRef.current);
  }, [deadlineWarnings, user, isDemo, sendDeadlineNotifications]);

  // ── CRUD stavby ────────────────────────────────────────────
  const handleSave = async (updated) => {
    const { id, nabidka, rozdil, ...fields } = updated;
    NUM_FIELDS.forEach(k => { if (fields[k] === "" || fields[k] == null) fields[k] = 0; else fields[k] = Number(fields[k]) || 0; });
    // Okamžitě rozsvítit tečku pro tuto stavbu
    setHistorieNovinky(prev => ({ ...prev, [String(id)]: true }));
    if (isDemo) {
      setData(prev => prev.map(r => r.id === id ? computeRow({ ...r, ...fields }) : r));
      setEditRow(null);
      return;
    }
    try {
      const staryRow = data.find(r => r.id === id) || {};
      const zmeny = Object.keys(fields)
        .filter(k => k !== "id" && String(staryRow[k] ?? "") !== String(fields[k] ?? ""))
        .map(k => ({ pole: k, stare: staryRow[k] ?? "", nove: fields[k] ?? "" }));
      const detailJson = JSON.stringify({ nazev: fields.nazev_stavby, zmeny });
      await sb(`stavby?id=eq.${id}`, { method: "PATCH", body: JSON.stringify(fields) });
      await logAkce(user?.email, "Editace stavby", `ID: ${id}, ${fields.nazev_stavby} ${detailJson}`);
      await loadAll();
    } catch (e) { showToast("Chyba uložení: " + e.message, "error"); }
    setEditRow(null);
  };

  const handleAdd = async (newRow) => {
    const { id, nabidka, rozdil, ...fields } = newRow;
    NUM_FIELDS.forEach(k => { if (fields[k] === "" || fields[k] == null) fields[k] = 0; else fields[k] = Number(fields[k]) || 0; });
    if (isDemo) {
      if (data.length >= demoMaxStavby) {
        showToast(`Demo verze: maximum ${demoMaxStavby} staveb.`, "error");
        return;
      }
      const demoId = data.length > 0 ? data.reduce((m, r) => Math.max(m, r.id), 0) + 1 : 1;
      setData(prev => [...prev, computeRow({ ...fields, id: demoId })]);
      setAdding(false);
      return;
    }
    try {
      await sb("stavby", { method: "POST", body: JSON.stringify(fields) });
      await logAkce(user?.email, "Přidání stavby", fields.nazev_stavby);
      await loadAll();
    } catch (e) { showToast("Chyba přidání: " + e.message, "error"); }
    setAdding(false);
  };

  const handleCopy = (row) => {
    const { id, nabidka, rozdil, cislo_stavby, ...rest } = row;
    setCopyRow({ ...rest, cislo_stavby: (cislo_stavby ? cislo_stavby + " (kopie)" : "(kopie)") });
  };

  const handleCopySave = async (newRow) => {
    const { id, nabidka, rozdil, ...fields } = newRow;
    NUM_FIELDS.forEach(k => { if (fields[k] === "" || fields[k] == null) fields[k] = 0; else fields[k] = Number(fields[k]) || 0; });
    if (isDemo) {
      if (data.length >= demoMaxStavby) {
        showToast(`Demo verze: maximum ${demoMaxStavby} staveb.`, "error");
        return;
      }
      const demoId = data.length > 0 ? data.reduce((m, r) => Math.max(m, r.id), 0) + 1 : 1;
      setData(prev => [...prev, computeRow({ ...fields, id: demoId })]);
      setCopyRow(null);
      showToast("Kopie stavby uložena (demo).", "ok");
      return;
    }
    try {
      await sb("stavby", { method: "POST", body: JSON.stringify(fields) });
      await logAkce(user?.email, "Kopírování stavby", fields.nazev_stavby + (fields.cislo_stavby ? ` (${fields.cislo_stavby})` : ""));
      await loadAll();
      showToast("Kopie stavby byla úspěšně uložena.", "ok");
    } catch (e) { showToast("Chyba kopírování: " + e.message, "error"); }
    setCopyRow(null);
  };

  const handleDelete = async (id) => {
    if (isDemo) {
      setData(prev => prev.filter(r => r.id !== id));
      setDeleteConfirm(null);
      return;
    }
    const row = data.find(r => r.id === id);
    try {
      await sb(`stavby?id=eq.${id}`, { method: "DELETE", prefer: "return=minimal" });
      await logAkce(user?.email, "Smazání stavby", `ID: ${id}, ${row?.nazev_stavby || ""}`);
      await loadAll();
    } catch (e) { showToast("Chyba mazání: " + e.message, "error"); }
    setDeleteConfirm(null);
  };

  // ── CRUD číselníky ─────────────────────────────────────────
  const saveSettings = async (nFirmy, nObjed, nSv) => {
    if (isDemo) {
      // V demo jen aktualizuj lokální state, nepsat do DB
      setFirmy(nFirmy);
      setObjednatele(nObjed);
      setStavbyvedouci(nSv);
      showToast("Demo: změny uloženy jen lokálně", "ok");
      return;
    }
    try {
      await sb("ciselniky?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
      const items = [
        ...nFirmy.map((f, i) => ({ typ: "firma", hodnota: f.hodnota, barva: f.barva || "", poradi: i })),
        ...nObjed.map((h, i) => ({ typ: "objednatel", hodnota: h, barva: "", poradi: i })),
        ...nSv.map((h, i) => ({ typ: "stavbyvedouci", hodnota: h, barva: "", poradi: i })),
      ];
      await sb("ciselniky", { method: "POST", body: JSON.stringify(items) });
      await loadAll();
    } catch (e) { showToast("Chyba uložení číselníků: " + e.message, "error"); }
  };

  // ── CRUD uživatelé ─────────────────────────────────────────
  const saveUsers = async (uList) => {
    if (isDemo) {
      // V demo jen aktualizuj lokální state, nepsat do DB
      setUsers(uList);
      showToast("Demo: změny uloženy jen lokálně", "ok");
      return;
    }
    try {
      await sb("uzivatele?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
      const items = uList.map(u => ({ jmeno: u.name, email: u.email, heslo: u.password, role: u.role }));
      await sb("uzivatele", { method: "POST", body: JSON.stringify(items) });
      await loadAll();
    } catch (e) { showToast("Chyba uložení uživatelů: " + e.message, "error"); }
  };

  const filtered = useMemo(() => data.filter(r => {
    if (filterFirma !== "Všechny firmy" && r.firma !== filterFirma) return false;
    if (filterText && !r.nazev_stavby?.toLowerCase().includes(filterText.toLowerCase()) && !r.cislo_stavby?.toLowerCase().includes(filterText.toLowerCase())) return false;
    if (filterObjed !== "Všichni objednatelé" && filterObjed && r.objednatel !== filterObjed) return false;
    if (filterSV !== "Všichni stavbyvedoucí" && filterSV && r.stavbyvedouci !== filterSV) return false;
    if (filterRok) { if (!((r.ukonceni && r.ukonceni.includes(filterRok)) || (r.ze_dne && r.ze_dne.includes(filterRok)))) return false; }
    if (filterCastkaOd !== "" && Number(r.nabidkova_cena) < Number(filterCastkaOd)) return false;
    if (filterCastkaDo !== "" && Number(r.nabidkova_cena) > Number(filterCastkaDo)) return false;
    if (filterProslé) { const dnes = new Date(); dnes.setHours(0,0,0,0); const isFak = r.cislo_faktury && r.cislo_faktury.trim() !== "" && r.castka_bez_dph && Number(r.castka_bez_dph) !== 0 && r.splatna && r.splatna.trim() !== ""; if (isFak || !r.ukonceni) return false; const [d,m,y] = r.ukonceni.split(".").map(Number); if (new Date(y,m-1,d) >= dnes) return false; }
    if (filterFakturace) { const isFak = r.cislo_faktury && r.cislo_faktury.trim() !== "" && r.castka_bez_dph && Number(r.castka_bez_dph) !== 0 && r.splatna && r.splatna.trim() !== ""; if (filterFakturace === "ano" && !isFak) return false; if (filterFakturace === "ne" && isFak) return false; }
    if (filterKat === "I" && !((Number(r.ps_i)||0)+(Number(r.snk_i)||0)+(Number(r.bo_i)||0) > 0)) return false;
    if (filterKat === "II" && !((Number(r.ps_ii)||0)+(Number(r.bo_ii)||0)+(Number(r.poruch)||0) > 0)) return false;
    return true;
  }), [data, filterFirma, filterText, filterObjed, filterSV, filterRok, filterCastkaOd, filterCastkaDo, filterProslé, filterFakturace, filterKat]);

  const [tableHeight, setTableHeight] = useState(500);

  const headerRef = useRef(null);
  const cardsRef = useRef(null);
  const filtersRef = useRef(null);
  const tableWrapRef = useRef(null);
  const paginationRef = useRef(null);
  const footerRef = useRef(null);

  // PAGE_SIZE: fixní hodnota, uživatel může měnit tlačítky v paginaci — uloženo v localStorage
  const [PAGE_SIZE, setPageSizeState] = useState(() => {
    try { return parseInt(localStorage.getItem("pageSize") || "7", 10); } catch { return 7; }
  });
  const setPageSize = (fn) => {
    setPageSizeState(prev => {
      const next = typeof fn === "function" ? fn(prev) : fn;
      try { localStorage.setItem("pageSize", String(next)); } catch {}
      return next;
    });
  };
  const [viewMode, setViewMode] = useState("page"); // "page" | "scroll"
  const [page, setPage] = useState(0);
  useEffect(() => { setPage(0); }, [filterFirma, filterText, filterObjed, filterSV, filterRok, filterCastkaOd, filterCastkaDo, filterProslé, filterFakturace, filterKat]);
  const totalPages = Math.ceil(filtered.length / PAGE_SIZE);
  const paginated = filtered.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const displayRows = viewMode === "scroll" ? filtered : paginated;



  const exportCSV = () => { setConfirmExport({ type: "csv", label: "CSV (.csv)" }); setShowExport(false); };
  const exportXLS = () => { setConfirmExport({ type: "xls", label: "Excel (.xlsx)" }); setShowExport(false); };
  const exportPDF = () => {
    setShowExport(false);
    const prevTheme = theme;
    const needsSwitch = isDark;
    if (needsSwitch) setTheme("light");
    setTimeout(() => {
      document.documentElement.classList.add("printing");
      window.print();
      setTimeout(() => {
        document.documentElement.classList.remove("printing");
        if (needsSwitch) setTheme(prevTheme);
      }, 1000);
    }, needsSwitch ? 150 : 50); // světlý motiv potřebuje čas na překreslení
  };
  const exportXLSColor = () => { setConfirmExport({ type: "xls-color", label: "Barevný Excel (.xls)" }); setShowExport(false); };

  const exportLog = async () => {
    setShowExport(false);
    // Načti celý log z databáze
    try {
      const res = await sb("log_aktivit?order=cas.desc&limit=10000");
      const rows = res || [];
      const actionColors = { "Přihlášení": "#dbeafe", "Přidání stavby": "#dcfce7", "Editace stavby": "#fef9c3", "Smazání stavby": "#fee2e2", "Nastavení": "#f3e8ff", "Záloha": "#ffedd5" };
      const headers = `<tr><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1}">Datum a čas</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1}">Uživatel</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1}">Akce</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1}">Detail</th></tr>`;
      const dataRows = rows.map((r, i) => {
        const bg = actionColors[r.akce] || (i % 2 === 0 ? "#f8fafc" : "#fff");
        const cas = r.cas ? new Date(r.cas).toLocaleString("cs-CZ") : "";
        return `<tr><td style="padding:5px 10px;border:1px solid #E2E8F0;background:${bg};font-size:10px">${cas}</td><td style="padding:5px 10px;border:1px solid #E2E8F0;background:${bg};font-size:10px">${r.uzivatel||""}</td><td style="padding:5px 10px;border:1px solid #E2E8F0;background:${bg};font-size:10px;font-weight:600">${r.akce||""}</td><td style="padding:5px 10px;border:1px solid #E2E8F0;background:${bg};font-size:10px">${r.detail||""}</td></tr>`;
      }).join("");
      const ts = new Date().toISOString().slice(0,16).replace("T","_").replace(":","-");
      const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table>${headers}${dataRows}</table></body></html>`;
      const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
      const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `log_aktivit_${ts}.xls`; a.click();
    } catch(e) { showToast("Chyba exportu logu: " + e.message, "error"); }
  };

  const zalohaJSON = async () => {
    const now = new Date();
    const datum = now.toISOString().slice(0,16).replace("T","_").replace(":","-");
    const prostrediKratky = (typeof window !== "undefined" && (window.location.hostname.includes("staging") || window.location.hostname.includes("preview") || window.location.hostname === "localhost")) ? "TEST" : "MAIN";
    const tenantKratky = IS_JIHLAVA ? "JI" : "ZN";
    try {
      const [stavbyRes, cisRes, uzRes, logRes, nastaveniRes, dodatkyRes] = await Promise.all([
        sb("stavby?order=id"),
        sb("ciselniky?order=typ,poradi"),
        sb("uzivatele?order=id"),
        sb("log_aktivit?order=id"),
        sb("nastaveni?order=klic"),
        sb("dodatky?order=stavba_id,poradi"),
      ]);
      const prostredi = (typeof window !== "undefined" && (window.location.hostname.includes("staging") || window.location.hostname.includes("preview") || window.location.hostname === "localhost")) ? "STAGING" : "PRODUKCE";
      const payload = {
        version: 3,
        created: new Date().toISOString(),
        prostredi,
        sb_url: SB_URL,
        stavby: stavbyRes || [],
        ciselniky: cisRes || [],
        uzivatele: (uzRes || []).map(u => ({ id: u.id, jmeno: u.jmeno, email: u.email, role: u.role })), // bez hesel
        log_aktivit: logRes || [],
        nastaveni: nastaveniRes || [], // včetně log_precteno — přiznaky přečtení se zálohují
        dodatky: dodatkyRes || [],
      };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = `zaloha_DB_${datum}_${prostrediKratky}_${tenantKratky}.json`;
      a.click();
      logAkce(user?.email, "Záloha", `${payload.stavby.length} staveb + ciselniky + uzivatele + ${payload.log_aktivit.length} logů + nastaveni (JSON v3)`);
    } catch(e) { showToast("Chyba zálohy: " + e.message, "error"); }
  };

  // ── Import původní tabulky (superadmin) ──────────────────────
  const importRef = useRef(null);
  const importRefJI = useRef(null); // JI tabulka import
  const [importJIKatPole, setImportJIKatPole] = useState("ps_i"); // kam jde H (Smluvní cena)
  const [importJIRezim, setImportJIRezim] = useState("nahradit"); // "nahradit" | "pridat"
  const [importJIConfirm, setImportJIConfirm] = useState(null); // { file, stavbyVDB }
  const [importJIConfirmText, setImportJIConfirmText] = useState("");
  const [importLog, setImportLog] = useState(null); // { ok, chyby, zprava }
  const [importConfirm, setImportConfirm] = useState(null); // { payload, fileName, prostrediZalohy, prostrediAktualni, mismatch, stavbyVDB }
  const [importConfirmText, setImportConfirmText] = useState("");
  const [importXLSConfirm, setImportXLSConfirm] = useState(null); // { file, stavbyVDB }
  const [importXLSConfirmText, setImportXLSConfirmText] = useState("");

  const fmtDateFromXls = (v) => {
    if (!v) return "";
    let d;
    if (v instanceof Date) {
      d = v;
    } else if (typeof v === "number") {
      // Excel serial date → JS Date
      d = new Date(Math.round((v - 25569) * 86400 * 1000));
    } else if (typeof v === "string" && v.includes("-")) {
      d = new Date(v);
    } else {
      return String(v);
    }
    if (isNaN(d.getTime())) return String(v);
    const dd = d.getDate().toString().padStart(2,"0");
    const mm = (d.getMonth()+1).toString().padStart(2,"0");
    return `${dd}.${mm}.${d.getFullYear()}`;
  };

  const importRef2 = useRef(null); // JSON import
  const handleImportJSON = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const payload = JSON.parse(ev.target.result);
        if (!payload.stavby || !Array.isArray(payload.stavby)) {
          setImportLog({ ok: 0, chyby: ["Neplatný formát JSON zálohy — chybí pole 'stavby'."] });
          return;
        }
        // Zjisti aktuální prostředí
        const prostrediAktualni = (typeof window !== "undefined" && (window.location.hostname.includes("staging") || window.location.hostname.includes("preview") || window.location.hostname === "localhost")) ? "STAGING" : "PRODUKCE";
        const prostrediZalohy = payload.prostredi || "NEZNÁMÉ";
        const mismatch = prostrediZalohy !== "NEZNÁMÉ" && prostrediZalohy !== prostrediAktualni;
        // Zjisti počet staveb v aktuální DB
        let stavbyVDB = "?";
        try { const res = await sb("stavby?select=id"); stavbyVDB = res.length; } catch {}
        setImportConfirmText("");
        setImportConfirm({ payload, fileName: file.name, prostrediZalohy, prostrediAktualni, mismatch, stavbyVDB });
      } catch(e) {
        setImportLog({ ok: 0, chyby: ["Chyba čtení JSON: " + e.message] });
      }
    };
    reader.readAsText(file);
  };

  const doImportJSON = async () => {
    if (!importConfirm) return;
    const { payload, fileName } = importConfirm;
    setImportConfirm(null);
    setImportConfirmText("");
    try {
      let ok = 0, chyby = [];
      const NUM_FIELDS_IMPORT = ["ps_i","snk_i","bo_i","ps_ii","bo_ii","poruch","nabidkova_cena","vyfakturovano","zrealizovano","castka_bez_dph","castka_bez_dph_2"];
      // Zjisti skutečné sloupce cílové DB
      let dbKolumny = new Set();
      try {
        const schemaRes = await sb("stavby?limit=0");
        // Supabase vrátí prázdné pole — sloupce zjistíme z OPTIONS nebo z prvního záznamu
        // Alternativa: poslat jeden prázdný dotaz a přečíst hlavičky
      } catch {}
      // Spolehlivější: zjistit sloupce z prvního záznamu zálohy a odfiltrovat SKIP_FIELDS
      // + dynamicky ověřit při prvním vložení — pokud selže, vyhodit konkrétní sloupec
      const ALWAYS_SKIP = new Set(["created_at","nabidka","rozdil","bez_dph_2","bez_dph"]); // "id" ZÁMĚRNĚ zachováváme — dodatky na něj odkazují!
      // Smaž stávající stavby
      await sb("stavby?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
      // Zjisti platné sloupce pomocí testovacího vložení prvního záznamu
      let validKolumny = null;
      const cleaned = payload.stavby.map(r => {
        const c = { ...r };
        // Vždy odstraň systémové a known-bad sloupce
        ALWAYS_SKIP.forEach(k => delete c[k]);
        // Fallback: staré názvy → nové
        if ("bez_dph_2" in c && !("castka_bez_dph_2" in c)) { c.castka_bez_dph_2 = c.bez_dph_2; }
        if ("bez_dph" in c && !("castka_bez_dph" in c)) { c.castka_bez_dph = c.bez_dph; }
        ALWAYS_SKIP.forEach(k => delete c[k]); // druhý průchod po fallback
        // Pokud už víme platné sloupce, odfiltruj neznámé
        if (validKolumny) { Object.keys(c).forEach(k => { if (!validKolumny.has(k)) delete c[k]; }); }
        NUM_FIELDS_IMPORT.forEach(k => { if (k in c) c[k] = Number(c[k]) || 0; });
        Object.keys(c).forEach(k => { if (!NUM_FIELDS_IMPORT.includes(k) && (c[k] === null || c[k] === undefined)) c[k] = ""; });
        return c;
      });
      // Vkládej po 50 kusech — při chybě PGRST204 odstraň problematický sloupec a zkus znovu
      for (let i = 0; i < cleaned.length; i += 50) {
        let chunk = cleaned.slice(i, i+50);
        let pokus = 0;
        while (pokus < 10) {
          try {
            await sb("stavby", { method: "POST", body: JSON.stringify(chunk), prefer: "return=minimal" });
            ok += chunk.length;
            // Po prvním úspěšném vložení zapamatuj platné sloupce
            if (!validKolumny) {
              validKolumny = new Set(Object.keys(chunk[0]));
              // Odfiltruj zbytek cleaned podle validKolumny
              cleaned.forEach(r => { Object.keys(r).forEach(k => { if (!validKolumny.has(k)) delete r[k]; }); });
            }
            break;
          } catch(e) {
            const match = e.message.match(/'([^']+)' column of 'stavby'/);
            if (match) {
              const badCol = match[1];
              chunk = chunk.map(r => { const c = { ...r }; delete c[badCol]; return c; });
              pokus++;
            } else {
              chyby.push(`Řádky ${i+1}-${i+chunk.length}: ${e.message}`);
              break;
            }
          }
        }
      }
      await loadAll();
      // Import logů pokud jsou v záloze
      let okLogy = 0;
      if (payload.log_aktivit && Array.isArray(payload.log_aktivit) && payload.log_aktivit.length > 0) {
        try {
          await sb("log_aktivit?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
          const SKIP_LOG = new Set(["id","created_at"]);
          const cleanedLogy = payload.log_aktivit.map(r => {
            const c = { ...r };
            SKIP_LOG.forEach(k => delete c[k]);
            if (c.hidden === null || c.hidden === undefined) c.hidden = false;
            return c;
          });
          for (let i = 0; i < cleanedLogy.length; i += 100) {
            const chunk = cleanedLogy.slice(i, i+100);
            try {
              await sb("log_aktivit", { method: "POST", body: JSON.stringify(chunk), prefer: "return=minimal" });
              okLogy += chunk.length;
            } catch(e) { chyby.push(`Logy řádky ${i+1}-${i+chunk.length}: ${e.message}`); }
          }
        } catch(e) { chyby.push(`Chyba importu logů: ${e.message}`); }
      }
      // Import číselníků (firmy, objednatelé, stavbyvedoucí) pokud jsou v záloze
      let okCis = 0;
      if (payload.ciselniky && Array.isArray(payload.ciselniky) && payload.ciselniky.length > 0) {
        try {
          await sb("ciselniky?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
          const SKIP_CIS = new Set(["id","created_at"]);
          const cleanedCis = payload.ciselniky.map(r => { const c = { ...r }; SKIP_CIS.forEach(k => delete c[k]); return c; });
          for (let i = 0; i < cleanedCis.length; i += 100) {
            const chunk = cleanedCis.slice(i, i+100);
            try {
              await sb("ciselniky", { method: "POST", body: JSON.stringify(chunk), prefer: "return=minimal" });
              okCis += chunk.length;
            } catch(e) { chyby.push(`Číselníky řádky ${i+1}-${i+chunk.length}: ${e.message}`); }
          }
        } catch(e) { chyby.push(`Chyba importu číselníků: ${e.message}`); }
      }
      // Import nastavení pokud je v záloze
      let okNas = 0;
      if (payload.nastaveni && Array.isArray(payload.nastaveni) && payload.nastaveni.length > 0) {
        try {
          // log_precteno se importuje — příznaky přečtení se zachovají ze zálohy
          await sb("nastaveni?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
          const SKIP_NAS = new Set(["id","created_at"]);
          const cleanedNas = payload.nastaveni
            .map(r => { const c = { ...r }; SKIP_NAS.forEach(k => delete c[k]); return c; });
          for (let i = 0; i < cleanedNas.length; i += 100) {
            const chunk = cleanedNas.slice(i, i+100);
            try {
              await sb("nastaveni", { method: "POST", body: JSON.stringify(chunk), prefer: "return=minimal" });
              okNas += chunk.length;
            } catch(e) { chyby.push(`Nastavení řádky ${i+1}-${i+chunk.length}: ${e.message}`); }
          }
        } catch(e) { chyby.push(`Chyba importu nastavení: ${e.message}`); }
      }
      // Import dodatků pokud jsou v záloze
      let okDod = 0;
      if (payload.dodatky && Array.isArray(payload.dodatky) && payload.dodatky.length > 0) {
        try {
          await sb("dodatky?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
          const SKIP_DOD = new Set(["id","created_at"]);
          const cleanedDod = payload.dodatky.map(r => { const c = { ...r }; SKIP_DOD.forEach(k => delete c[k]); return c; });
          for (let i = 0; i < cleanedDod.length; i += 100) {
            const chunk = cleanedDod.slice(i, i+100);
            try {
              await sb("dodatky", { method: "POST", body: JSON.stringify(chunk), prefer: "return=minimal" });
              okDod += chunk.length;
            } catch(e) { chyby.push(`Dodatky řádky ${i+1}-${i+chunk.length}: ${e.message}`); }
          }
        } catch(e) { chyby.push(`Chyba importu dodatků: ${e.message}`); }
      }
      await loadAll();
      // Reset sekvence stavby.id aby nové záznamy nedostaly kolizní ID
      try {
        const maxIdRes = await sb("stavby?select=id&order=id.desc&limit=1");
        const maxId = (maxIdRes && maxIdRes[0]) ? maxIdRes[0].id : 0;
        // Supabase RPC pro reset sekvence — vyžaduje funkci v DB
        // Alternativa: vložit a smazat dummy záznam s vysokým ID
        if (maxId > 0) {
          await sb("rpc/set_stavby_seq", { method: "POST", body: JSON.stringify({ max_id: maxId }), prefer: "return=minimal" }).catch(() => {});
        }
      } catch {}
      logAkce(user?.email, "Import JSON", `${ok} staveb + ${okLogy} logů + ${okCis} číselníků + ${okNas} nastavení + ${okDod} dodatků importováno z ${fileName}`);
      setImportLog({ ok, chyby, zprava: `Importováno ${ok} staveb + ${okCis} číselníků + ${okLogy} logů + ${okDod} dodatků + ${okNas} nastavení z "${fileName}"` });
    } catch(e) {
      setImportLog({ ok: 0, chyby: ["Chyba importu: " + e.message] });
    }
  };

  const handleImport = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    // Zjisti počet staveb v DB a zobraz confirm dialog
    let stavbyVDB = "?";
    try { const res = await sb("stavby?select=id"); stavbyVDB = res.length; } catch {}
    setImportXLSConfirmText("");
    setImportXLSConfirm({ file, stavbyVDB });
  };

  const doImportXLS = () => {
    if (!importXLSConfirm) return;
    const { file } = importXLSConfirm;
    setImportXLSConfirm(null);
    setImportXLSConfirmText("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });

        // ── Detekce listu: buď "Stavby" (záloha DB) nebo první list (původní tabulka) ──
        const isZaloha = wb.SheetNames.includes("Stavby");
        const ws = isZaloha ? wb.Sheets["Stavby"] : wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, cellDates: true });

        let stavbyRows = [];
        let ok = 0, chyby = [];

        if (isZaloha) {
          // Záložní formát — první řádek jsou záhlaví z aplikace
          const headers = raw[0];
          const colIdx = (label) => headers.findIndex(h => h === label);
          const FIELD_MAP = [
            ["Firma", "firma"], ["Č. stavby", "cislo_stavby"], ["Název stavby", "nazev_stavby"],
            ["Plán. stavby I", "ps_i"], ["SNK I", "snk_i"], ["Běžné opravy I", "bo_i"],
            ["Plán. stavby II", "ps_ii"], ["Běžné opravy II", "bo_ii"], ["Poruchy", "poruch"],
            ["Nab. cena", "nabidkova_cena"], ["Vyfakturováno", "vyfakturovano"],
            ["Zrealizováno", "zrealizovano"], ["SOD", "sod"], ["Ze dne", "ze_dne"],
            ["Objednatel", "objednatel"], ["Stavbyvedoucí", "stavbyvedouci"],
            ["Ukončení", "ukonceni"], ["Č. faktury", "cislo_faktury"],
            ["Č. bez DPH", "castka_bez_dph"], ["Splatná", "splatna"],
            ["Č. faktury 2", "cislo_faktury_2"], ["Č. bez DPH 2", "castka_bez_dph_2"], ["Splatná 2", "splatna_2"],
            ["Poznámka", "poznamka"],
          ];
          for (const row of raw.slice(1)) {
            if (!row[colIdx("Název stavby")]) continue;
            const fields = {};
            FIELD_MAP.forEach(([label, key]) => { fields[key] = row[colIdx(label)] ?? ""; });
            stavbyRows.push(fields);
          }
        } else {
          // Původní tabulka — pevné pozice sloupců (řádek 4 = hlavička, data od řádku 5)
          // Col: 0=region,1=firma,2=porč,3=ps_i,4=snk_i,5=bo_i,6=ps_ii,7=bo_ii,8=poruch,
          //      9=č.stavby,10=název,14=ukončení,15=zreal.,16=sod,17=ze_dne,
          //      18=objednatel,19=stavbyved.,20=nab.cena,21=č.fakt.,22=č.bez_dph,23=splatná
          const dataRows = raw.slice(4); // přeskočit řádky 1-4 (hlavička)
          for (const row of dataRows) {
            const nazev = row[10];
            if (!nazev) continue; // přeskočit prázdné řádky
            const numVal = (v) => {
              if (v === null || v === undefined || v === "") return 0;
              if (typeof v === "number") return v;
              const n = parseFloat(String(v).replace(/\s/g,"").replace(",","."));
              return isNaN(n) ? 0 : n;
            };
            stavbyRows.push({
              firma:          String(row[1] || ""),
              cislo_stavby:   String(row[9] || row[2] || ""),
              nazev_stavby:   String(nazev),
              ps_i:           numVal(row[3]),
              snk_i:          numVal(row[4]),
              bo_i:           numVal(row[5]),
              ps_ii:          numVal(row[6]),
              bo_ii:          numVal(row[7]),
              poruch:         numVal(row[8]),
              nabidkova_cena: numVal(row[20]),
              vyfakturovano:  numVal(row[13]),
              zrealizovano:   numVal(row[15]),
              sod:            String(row[16] || ""),
              ze_dne:         fmtDateFromXls(row[17]),
              objednatel:     String(row[18] || ""),
              stavbyvedouci:  String(row[19] || ""),
              ukonceni:       fmtDateFromXls(row[14]),
              cislo_faktury:  String(row[21] || ""),
              castka_bez_dph: numVal(row[22]),
              splatna:        fmtDateFromXls(row[23]),
              poznamka:       "",
            });
          }
        }

        if (stavbyRows.length === 0) {
          setImportLog({ ok: 0, chyby: ["Nenalezena žádná data ke importu."] });
          return;
        }

        // ── Uložit do DB — DELETE vše + POST nové ──
        await sb("stavby?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
        const NUM = ["ps_i","snk_i","bo_i","ps_ii","bo_ii","poruch","nabidkova_cena","vyfakturovano","zrealizovano","castka_bez_dph","castka_bez_dph_2"];
        const cleaned = stavbyRows.map(r => {
          const c = { ...r };
          NUM.forEach(k => { c[k] = Number(c[k]) || 0; });
          Object.keys(c).forEach(k => {
            if (!NUM.includes(k) && (c[k] === null || c[k] === undefined)) c[k] = "";
            if (typeof c[k] === "number" && isNaN(c[k])) c[k] = 0;
          });
          return c;
        });
        // Vkládej po 50 kusech (Supabase limit)
        for (let i = 0; i < cleaned.length; i += 50) {
          const chunk = cleaned.slice(i, i+50);
          try {
            await sb("stavby", { method: "POST", body: JSON.stringify(chunk), prefer: "return=minimal" });
            ok += chunk.length;
          } catch(e) { chyby.push(`Řádky ${i+1}-${i+chunk.length}: ${e.message}`); }
        }

        await loadAll();
        logAkce(user?.email, "Import", `${ok} staveb importováno z ${file.name}`);
        setImportLog({ ok, chyby, zprava: `Importováno ${ok} staveb z "${file.name}"` });
      } catch(e) {
        setImportLog({ ok: 0, chyby: ["Chyba čtení souboru: " + e.message] });
      }
    };
    reader.readAsArrayBuffer(file);
  };


  // ── Import JI tabulky (Jihlava) ──────────────────────────
  const handleImportJI = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    e.target.value = "";
    let stavbyVDB = "?";
    try { const res = await sb("stavby?select=id"); stavbyVDB = res.length; } catch {}
    setImportJIConfirmText("");
    setImportJIConfirm({ file, stavbyVDB });
  };

  const doImportJI = () => {
    if (!importJIConfirm) return;
    const { file } = importJIConfirm;
    const katPole = importJIKatPole;
    const rezim = importJIRezim; // "nahradit" | "pridat"
    setImportJIConfirm(null);
    setImportJIConfirmText("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, cellDates: true });
        const dataRows = raw.slice(1);
        const numVal = (v) => {
          if (v === null || v === undefined || v === "") return 0;
          if (typeof v === "number") return v;
          const n = parseFloat(String(v).replace(/\s/g,"").replace(",","."));
          return isNaN(n) ? 0 : n;
        };
        // Sestavit řádky z Excelu
        let stavbyRows = [];
        const noviSV  = new Set(); // stavbyvedoucí k přidání do číselníku
        const noviObj = new Set(); // objednatelé k přidání do číselníku
        for (const row of dataRows) {
          const nazev = row[3];
          if (!nazev) continue;
          const smlCena = numVal(row[7]);
          const sv  = String(row[12] || "").trim();
          const obj = String(row[6]  || "").trim();
          if (sv)  noviSV.add(sv);
          if (obj) noviObj.add(obj); // Bug2 FIX: G → číselník objednatelů
          const fields = {
            cislo_stavby:   String(row[2] || ""),
            nazev_stavby:   String(nazev),
            sod:            String(row[5] || ""),
            objednatel:     obj,
            nabidkova_cena: smlCena,               // H vždy do nabidkova_cena
            ze_dne:         fmtDateFromXls(row[8]),
            ukonceni:       fmtDateFromXls(row[9]),
            stavbyvedouci:  sv,
            ps_i: 0, snk_i: 0, bo_i: 0, ps_ii: 0, bo_ii: 0, poruch: 0,
            firma: "", vyfakturovano: 0, zrealizovano: 0,
            cislo_faktury: "", castka_bez_dph: 0, splatna: "",
            cislo_faktury_2: "", castka_bez_dph_2: 0, splatna_2: "",
            poznamka: "",
          };
          // H → vybraný kat. sloupec ("nikam" = jen nabidkova_cena, Nabídka zůstane 0)
          if (katPole && katPole !== "nikam") fields[katPole] = smlCena;
          stavbyRows.push(fields);
        }
        if (stavbyRows.length === 0) {
          setImportLog({ ok: 0, chyby: ["Nenalezena žádná data ke importu."] });
          return;
        }
        const NUM = ["ps_i","snk_i","bo_i","ps_ii","bo_ii","poruch","nabidkova_cena","vyfakturovano","zrealizovano","castka_bez_dph","castka_bez_dph_2"];
        let ok = 0, preskoceno = 0, chyby = [];

        if (rezim === "nahradit") {
          // Smazat stavby + log_aktivit, pak vložit vše
          await sb("stavby?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
          await sb("log_aktivit?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
          const cleaned = stavbyRows.map(r => {
            const c = { ...r };
            NUM.forEach(k => { c[k] = Number(c[k]) || 0; });
            Object.keys(c).forEach(k => { if (!NUM.includes(k) && (c[k] === null || c[k] === undefined)) c[k] = ""; });
            return c;
          });
          for (let i = 0; i < cleaned.length; i += 50) {
            const chunk = cleaned.slice(i, i+50);
            try {
              await sb("stavby", { method: "POST", body: JSON.stringify(chunk), prefer: "return=minimal" });
              ok += chunk.length;
            } catch(e) { chyby.push(`Řádky ${i+1}-${i+chunk.length}: ${e.message}`); }
          }
        } else {
          // Přidat nové — načíst stávající čísla staveb
          let existujiciCisla = new Set();
          try {
            const res = await sb("stavby?select=cislo_stavby");
            (res || []).forEach(r => { if (r.cislo_stavby) existujiciCisla.add(String(r.cislo_stavby)); });
          } catch {}
          const noveRows = stavbyRows.filter(r => !existujiciCisla.has(r.cislo_stavby));
          preskoceno = stavbyRows.length - noveRows.length;
          const cleaned = noveRows.map(r => {
            const c = { ...r };
            NUM.forEach(k => { c[k] = Number(c[k]) || 0; });
            Object.keys(c).forEach(k => { if (!NUM.includes(k) && (c[k] === null || c[k] === undefined)) c[k] = ""; });
            return c;
          });
          for (let i = 0; i < cleaned.length; i += 50) {
            const chunk = cleaned.slice(i, i+50);
            try {
              await sb("stavby", { method: "POST", body: JSON.stringify(chunk), prefer: "return=minimal" });
              ok += chunk.length;
            } catch(e) { chyby.push(`Řádky ${i+1}-${i+chunk.length}: ${e.message}`); }
          }
        }

        // Přidat nové stavbyvedoucí do číselníku
        let noviSVPridano = 0;
        if (noviSV.size > 0) {
          try {
            const existRes = await sb("ciselniky?typ=eq.stavbyvedouci&select=hodnota");
            const existSV = new Set((existRes || []).map(r => r.hodnota));
            const toAdd = [...noviSV].filter(sv => !existSV.has(sv));
            if (toAdd.length > 0) {
              const items = toAdd.map((sv, i) => ({ typ: "stavbyvedouci", hodnota: sv, barva: "", poradi: 1000 + i }));
              await sb("ciselniky", { method: "POST", body: JSON.stringify(items), prefer: "return=minimal" });
              noviSVPridano = toAdd.length;
            }
          } catch {}
        }

        // Bug2 FIX: Přidat nové objednatele do číselníku
        let noviObjPridano = 0;
        if (noviObj.size > 0) {
          try {
            const existRes = await sb("ciselniky?typ=eq.objednatel&select=hodnota");
            const existObj = new Set((existRes || []).map(r => r.hodnota));
            const toAdd = [...noviObj].filter(o => !existObj.has(o));
            if (toAdd.length > 0) {
              const items = toAdd.map((o, i) => ({ typ: "objednatel", hodnota: o, barva: "", poradi: 1000 + i }));
              await sb("ciselniky", { method: "POST", body: JSON.stringify(items), prefer: "return=minimal" });
              noviObjPridano = toAdd.length;
            }
          } catch {}
        }

        // Upozornění na stavby bez firmy
        shownOrphanOnce.current = false; // reset aby se znovu zobrazilo

        await loadAll();
        const extraInfo = [
          noviSVPridano > 0 ? `${noviSVPridano} nových stavbyvedoucích` : "",
          noviObjPridano > 0 ? `${noviObjPridano} nových objednatelů` : "",
        ].filter(Boolean).join(", ");
        const zprava = rezim === "nahradit"
          ? `Importováno ${ok} staveb z "${file.name}"${extraInfo ? ` + ${extraInfo}` : ""}`
          : `Přidáno ${ok} nových staveb (${preskoceno} přeskočeno — existují)${extraInfo ? ` + ${extraInfo}` : ""}`;
        logAkce(user?.email, "Import JI", zprava);
        setImportLog({ ok, chyby, zprava });
      } catch(e) {
        setImportLog({ ok: 0, chyby: ["Chyba čtení souboru: " + e.message] });
      }
    };
    reader.readAsArrayBuffer(file);
  };

  const isDark = isDarkComputed(theme);

  // ── Cache barev firem – useMemo, přepočítá se jen při změně firem/tématu ──
  const firmaColorCache = useMemo(() => {
    const cache = {};
    firmy.forEach((firmaObj, idx) => {
      const name = firmaObj.hodnota;
      const hex = (firmaObj.barva && firmaObj.barva !== "")
        ? firmaObj.barva
        : FIRMA_COLOR_FALLBACK[idx % FIRMA_COLOR_FALLBACK.length] || TENANT.p2;
      const parts = hexToRgb(hex).split(",").map(Number);
      const [r, g, b] = parts;
      const br = isDark ? 15 : 241, bg2 = isDark ? 23 : 245, bb = isDark ? 42 : 249;
      const mix = isDark ? 0.18 : 0.15;
      // světlá varianta vždy (pro tisk)
      const mixL = 0.15;
      cache[name] = {
        bg: `rgb(${Math.round(r*mix+br*(1-mix))},${Math.round(g*mix+bg2*(1-mix))},${Math.round(b*mix+bb*(1-mix))})`,
        bgLight: `rgb(${Math.round(r*mixL+241*(1-mixL))},${Math.round(g*mixL+245*(1-mixL))},${Math.round(b*mixL+249*(1-mixL))})`,
        badge: hexToRgbaGlobal(hex, 0.25),
        badgeBorder: hexToRgbaGlobal(hex, 0.6),
        text: hex,
        hex,
      };
    });
    return cache;
  }, [firmy, isDark]);

  // ── firmaColorMap pro exporty ──────────────────────────────
  const firmaColorMapCache = useMemo(() => Object.fromEntries(firmy.map(f => [f.hodnota, f.barva || TENANT.p2])), [firmy]);

    if (loading) return (
    <div style={{ minHeight: "100vh", background: TENANT.appDarkBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: 48, height: 48, border: `3px solid ${tc1(0.3)}`, borderTop: `3px solid ${TENANT.p1}`, borderRadius: "50%", animation: "spin 0.8s linear infinite", margin: "0 auto 16px" }} />
        <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>Načítám data...</div>
      </div>
    </div>
  );

  if (dbError) return (
    <div style={{ minHeight: "100vh", background: TENANT.appDarkBg, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ background: TENANT.modalBg, borderRadius: 16, padding: 32, maxWidth: 480, textAlign: "center", border: "1px solid rgba(239,68,68,0.3)" }}>
        <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
        <h3 style={{ color: "#f87171", margin: "0 0 8px" }}>Chyba připojení</h3>
        <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 13, margin: "0 0 20px" }}>{dbError}</p>
        <button onClick={loadAll} style={{ padding: "10px 24px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Zkusit znovu</button>
      </div>
    </div>
  );

  if (!user) return <Login onLogin={setUser} users={users} onLogAction={logAkce} appNazev={appNazev} />;

  const changeTheme = (t) => {
    setTheme(t);
    try { localStorage.setItem("theme", t); } catch {}
    // Pokud je Liquid Glass zapnutý — vždy vypnout (čteme ref, ne closure)
    if (liquidGlassRef.current) {
      setLiquidGlass(false);
      liquidGlassRef.current = false;
      try { localStorage.setItem("liquidGlass", "0"); } catch {}
    }
    sliderShow("theme");
  };
  const toggleLiquidGlass = () => {
    setLiquidGlass(v => {
      try { localStorage.setItem("liquidGlass", v ? "0" : "1"); } catch {}
      if (!v) {
        sliderShow("lg");
      } else {
        // vypínáme LG — schuj slider pokud zobrazoval lg
        setActiveSlider(a => { if (a === "lg") { if (sliderTimer.current) clearTimeout(sliderTimer.current); return null; } return a; });
      }
      return !v;
    });
  };

  const lgS = liquidGlass ? lgStrength / 100 : 0;
  const themeS = themeStrength / 100; // 0 = nejsvětlejší/nejtmavší, 1 = střední

  // Interpolace barvy pozadí dle themeStrength
  // Tmavý: 0%=#060818 (skoro černá) ↔ 100%=#1e293b (výchozí slate)
  const darkAppBg = lgS > 0 ? (IS_JIHLAVA ? "#0a1506" : "#060d1a") : (() => {
    if (IS_JIHLAVA) {
      const r = Math.round(10 + themeS * (22 - 10));
      const g = Math.round(18 + themeS * (34 - 18));
      const b = Math.round(6 + themeS * (14 - 6));
      return `rgb(${r},${g},${b})`;
    }
    const r = Math.round(6 + themeS * (30 - 6));
    const g = Math.round(8 + themeS * (41 - 8));
    const b = Math.round(24 + themeS * (59 - 24));
    return `rgb(${r},${g},${b})`;
  })();
  // Světlý: 0%=#ffffff (čistě bílá) ↔ 100%=TENANT.appLightBg
  const lightAppBg = lgS > 0 ? (IS_JIHLAVA ? "#e8f0e0" : "#e8edf5") : (() => {
    if (IS_JIHLAVA) {
      const r = Math.round(255 - themeS * (255 - 232));
      const g = Math.round(255 - themeS * (255 - 240));
      const b = Math.round(255 - themeS * (255 - 224));
      return `rgb(${r},${g},${b})`;
    }
    const r = Math.round(255 - themeS * (255 - 208));
    const g = Math.round(255 - themeS * (255 - 216));
    const b = Math.round(255 - themeS * (255 - 232));
    return `rgb(${r},${g},${b})`;
  })();

  const T = isDark ? {
    appBg: darkAppBg,
    headerBg: lgS > 0 ? `rgba(255,255,255,${(0.03 + lgS * 0.07).toFixed(3)})` : "rgba(255,255,255,0.03)",
    headerBorder: lgS > 0 ? `rgba(255,255,255,${(0.08 + lgS * 0.18).toFixed(3)})` : "rgba(255,255,255,0.08)",
    cardBg: lgS > 0 ? `rgba(255,255,255,${(0.04 + lgS * 0.06).toFixed(3)})` : "rgba(255,255,255,0.04)",
    cardBorder: lgS > 0 ? `rgba(255,255,255,${(0.08 + lgS * 0.14).toFixed(3)})` : "rgba(255,255,255,0.08)",
    theadBg: lgS > 0 ? `rgba(255,255,255,${(lgS * 0.07).toFixed(3)})` : TENANT.p1deep,
    cellBorder: lgS > 0 ? `rgba(255,255,255,${(0.07 + lgS * 0.04).toFixed(3)})` : "rgba(255,255,255,0.07)",
    filterBg: lgS > 0 ? `rgba(255,255,255,${(lgS * 0.05).toFixed(3)})` : "rgba(255,255,255,0.02)",
    text: "#e2e8f0", textMuted: "rgba(255,255,255,0.45)", textFaint: "rgba(255,255,255,0.25)",
    inputBg: lgS > 0 ? `rgba(255,255,255,${(lgS * 0.08).toFixed(3)})` : TENANT.inputBg,
    inputBorder: lgS > 0 ? `rgba(255,255,255,${(0.15 + lgS * 0.07).toFixed(3)})` : "rgba(255,255,255,0.15)",
    modalBg: lgS > 0 ? `rgba(8,16,36,${(0.5 + lgS * 0.25).toFixed(3)})` : TENANT.modalBg,
    dropdownBg: lgS > 0 ? `rgba(8,16,36,${(0.7 + lgS * 0.2).toFixed(3)})` : TENANT.modalBg,
    hoverBg: lgS > 0 ? `rgba(255,255,255,${(0.07 + lgS * 0.06).toFixed(3)})` : "rgba(255,255,255,0.07)",
    numColor: TENANT.p4,
    backdropFilter: lgS > 0 ? `blur(${(8 + lgS * 24).toFixed(1)}px) saturate(${(130 + lgS * 80).toFixed(0)}%) brightness(${(1 + lgS * 0.1).toFixed(3)})` : "none",
    boxShadow: lgS > 0 ? `0 2px 0 rgba(255,255,255,${(lgS * 0.14).toFixed(3)}) inset, 0 -1px 0 rgba(0,0,0,0.3) inset, 0 8px 32px rgba(0,0,0,${(0.2 + lgS * 0.3).toFixed(3)})` : "none",
    orbOpacity: lgS,
  } : {
    appBg: lightAppBg,
    headerBg: lgS > 0 ? `rgba(255,255,255,${(0.4 + lgS * 0.22).toFixed(3)})` : "#ffffff",
    headerBorder: lgS > 0 ? `rgba(255,255,255,${(0.5 + lgS * 0.45).toFixed(3)})` : "rgba(0,0,0,0.08)",
    cardBg: lgS > 0 ? `rgba(255,255,255,${(0.35 + lgS * 0.22).toFixed(3)})` : "#ffffff",
    cardBorder: lgS > 0 ? `rgba(255,255,255,${(0.5 + lgS * 0.4).toFixed(3)})` : "rgba(0,0,0,0.08)",
    theadBg: lgS > 0 ? `rgba(255,255,255,${(0.3 + lgS * 0.2).toFixed(3)})` : "#dde3ed",
    cellBorder: lgS > 0 ? `rgba(0,0,0,${Math.max(0.02,(0.06 - lgS * 0.02)).toFixed(3)})` : "rgba(0,0,0,0.07)",
    filterBg: lgS > 0 ? `rgba(255,255,255,${(0.3 + lgS * 0.22).toFixed(3)})` : "#f8fafc",
    text: "#1e293b", textMuted: "rgba(0,0,0,0.5)", textFaint: "rgba(0,0,0,0.3)",
    inputBg: lgS > 0 ? `rgba(255,255,255,${(0.5 + lgS * 0.28).toFixed(3)})` : "#ffffff",
    inputBorder: lgS > 0 ? `rgba(0,0,0,${Math.max(0.06,(0.12 - lgS * 0.04)).toFixed(3)})` : "rgba(0,0,0,0.2)",
    modalBg: lgS > 0 ? `rgba(255,255,255,${(0.55 + lgS * 0.28).toFixed(3)})` : "#ffffff",
    dropdownBg: lgS > 0 ? `rgba(255,255,255,${(0.7 + lgS * 0.25).toFixed(3)})` : "#ffffff",
    hoverBg: lgS > 0 ? `rgba(255,255,255,${(0.4 + lgS * 0.35).toFixed(3)})` : "rgba(0,0,0,0.04)",
    numColor: TENANT.numColor,
    backdropFilter: lgS > 0 ? `blur(${(8 + lgS * 22).toFixed(1)}px) saturate(${(130 + lgS * 60).toFixed(0)}%) brightness(${(1 + lgS * 0.05).toFixed(3)})` : "none",
    boxShadow: lgS > 0 ? `0 2px 0 rgba(255,255,255,${(0.6 + lgS * 0.38).toFixed(3)}) inset, 0 -1px 0 rgba(0,0,0,0.06) inset, 0 4px 24px rgba(0,0,0,${(0.04 + lgS * 0.1).toFixed(3)})` : "none",
    orbOpacity: lgS,
  };

  const nextId = data.length > 0 ? data.reduce((max, r) => Math.max(max, r.id), 0) + 1 : 1;
  const emptyRow = { id: nextId, firma: firmy[0]?.hodnota||"", ps_i: 0, snk_i: 0, bo_i: 0, ps_ii: 0, bo_ii: 0, poruch: 0, cislo_stavby: prefixEnabled ? prefixValue : "", nazev_stavby: "", vyfakturovano: 0, ukonceni: "", zrealizovano: "", sod: "", ze_dne: "", objednatel: "", stavbyvedouci: "", nabidkova_cena: 0, cislo_faktury: "", castka_bez_dph: 0, splatna: "", cislo_faktury_2: "", castka_bez_dph_2: 0, splatna_2: "", poznamka: "" };

  const getFirmaColor = (firmaName) => firmaColorCache[firmaName] || { bg: isDark ? TENANT.p1deep : "#e2e8f0", badge: tc2(0.25), badgeBorder: tc2(0.6), text: TENANT.p2, hex: TENANT.p2 };

  const firmaBadge = (firma) => {
    const exists = firmy.some(f => f.hodnota === firma);
    if (!exists && firma) {
      // Smazaná firma — oranžový pulzující rámeček + přeškrtnutý text
      return { display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(251,146,60,0.15)", color: "#fb923c", border: "2px solid rgba(251,146,60,0.9)", textDecoration: "line-through", animation: "pulse-firma-border 1.4s ease-in-out infinite", cursor: "help" };
    }
    const c = getFirmaColor(firma);
    return { display: "inline-block", padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: c.badge, color: c.text, border: `1px solid ${c.badgeBorder}` };
  };

  const rowBg = (firma) => getFirmaColor(firma).bg;

  return (
    <div style={{ height: "100dvh", maxHeight: "100dvh", background: T.appBg, fontFamily: "'Segoe UI',Tahoma,sans-serif", color: T.text, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative" }}>
      <style>{`
        html,body{overflow:hidden;height:100%;margin:0;padding:0}
        .table-wrapper{-webkit-overflow-scrolling:touch;}
        * { -webkit-tap-highlight-color: transparent; }
        @keyframes spin{to{transform:rotate(360deg)}}
        @keyframes stagingBlink{0%,100%{opacity:1;box-shadow:0 0 8px rgba(220,38,38,0.8)}50%{opacity:0.4;box-shadow:0 0 2px rgba(220,38,38,0.2)}}
        @keyframes stagingPulse{0%,100%{background:rgba(220,38,38,0.95)}50%{background:rgba(185,28,28,0.7)}}
        @keyframes lgOrb1{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(60px,-40px) scale(1.15)}66%{transform:translate(-30px,50px) scale(0.9)}}
        @keyframes lgOrb2{0%,100%{transform:translate(0,0) scale(1)}33%{transform:translate(-80px,30px) scale(0.85)}66%{transform:translate(40px,-60px) scale(1.2)}}
        @keyframes lgOrb3{0%,100%{transform:translate(0,0) scale(1)}50%{transform:translate(50px,40px) scale(1.1)}}
        @keyframes lgShimmer{0%{opacity:0.4;transform:translateX(-100%) skewX(-15deg)}100%{opacity:0;transform:translateX(300%) skewX(-15deg)}}
        .lg-panel{position:relative;overflow:hidden}
        .lg-panel::before{content:'';position:absolute;inset:0;background:linear-gradient(135deg,rgba(255,255,255,0.18) 0%,rgba(255,255,255,0.04) 50%,rgba(255,255,255,0.08) 100%);pointer-events:none;z-index:0}
        .lg-panel::after{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.6),transparent);pointer-events:none;z-index:0}
        .lg-shimmer-bar{content:'';position:absolute;top:0;left:0;width:40%;height:100%;background:linear-gradient(90deg,transparent,rgba(255,255,255,0.07),transparent);animation:lgShimmer 4s ease-in-out infinite;pointer-events:none;z-index:0}
        ${!isDark ? "table td:not(.colored-cell) { color: #1e293b; } table td:not(.colored-cell) input { color: #1e293b; } table td:not(.colored-cell) select { color: #1e293b; }" : ""}

        /* ── TISK / PDF ─────────────────────────────────────── */
        @media print {
          @page { size: A4 landscape; margin: 4mm; }
          .no-print { display: none !important; }
          .print-hide-col { display: none !important; }
          .print-hide-symbol { display: none !important; }
          * { overflow: visible !important; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
          .table-wrapper { overflow: visible !important; width: 100% !important; }
          table { table-layout: auto !important; font-size: 7px !important; zoom: 0.55; }
          td, th { padding: 2px 3px !important; white-space: nowrap !important; }
        }
        /* Světlý motiv při tisku — přepíše tmavý theme */
        html.printing, html.printing body { background: white !important; color: black !important; overflow: visible !important; height: auto !important; }
        html.printing .no-print { display: none !important; }
        html.printing * { color: black !important; border-color: #cccccc !important; overflow: visible !important; }
        /* Řádky tabulky — světlé barvy firem */
        html.printing tr { background: var(--print-bg, #f8fafc) !important; }
        html.printing td { background: transparent !important; }
        html.printing th { background: ${TENANT.p1deep} !important; color: white !important; }
        /* Zachovat barvy firem a zvýraznění buněk — nepřepisovat background */
        html.printing [style*="color:#3b82f6"], html.printing [style*="color: #3b82f6"] { color: ${TENANT.p1dark} !important; }
        html.printing [style*="color:#10b981"], html.printing [style*="color: #10b981"] { color: #047857 !important; }
        html.printing [style*="color:#f59e0b"], html.printing [style*="color: #f59e0b"] { color: #b45309 !important; }
        html.printing [style*="color:#ef4444"], html.printing [style*="color: #ef4444"] { color: #b91c1c !important; }
        html.printing [style*="color:#f87171"], html.printing [style*="color: #f87171"] { color: #b91c1c !important; }
        html.printing [style*="color:#4ade80"], html.printing [style*="color: #4ade80"] { color: #166534 !important; }
        html.printing [style*="color:#fbbf24"], html.printing [style*="color: #fbbf24"] { color: #854d0e !important; }
        html.printing [style*="color:#60a5fa"], html.printing [style*="color: #60a5fa"] { color: ${TENANT.p1dark} !important; }
        /* Firma badge — zachovat barvy */
        html.printing .firma-badge { color: inherit !important; }
        @keyframes pulse-firma-border {
          0%,100% { border-color: rgba(251,146,60,0.9); }
          50% { border-color: rgba(251,146,60,0.2); }
        }
        @keyframes pulse-overdue-row {
          0%,100% { box-shadow: inset 0 0 0 2px rgba(239,68,68,0.85); background: rgba(239,68,68,0.07); }
          50% { box-shadow: inset 0 0 0 2px rgba(239,68,68,0.15); background: rgba(239,68,68,0.02); }
        }
      `}</style>

      {/* Liquid Glass — animované orby na pozadí */}
      {liquidGlass && (
        <div style={{ position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0, overflow: "hidden", opacity: lgS, transition: "opacity 0.3s" }}>
          {/* SVG displacement filter pro refrakci */}
          <svg width="0" height="0" style={{ position: "absolute" }}>
            <defs>
              <filter id="lg-refract">
                <feTurbulence type="fractalNoise" baseFrequency="0.012 0.008" numOctaves="3" seed="5" result="noise"/>
                <feDisplacementMap in="SourceGraphic" in2="noise" scale={isDark ? "8" : "5"} xChannelSelector="R" yChannelSelector="G"/>
              </filter>
              <filter id="lg-glow">
                <feGaussianBlur stdDeviation="40" result="blur"/>
                <feComposite in="SourceGraphic" in2="blur" operator="over"/>
              </filter>
            </defs>
          </svg>
          {/* Orby */}
          {isDark ? (<>
            <div style={{ position: "absolute", width: 600, height: 600, borderRadius: "50%", background: `radial-gradient(circle,${tc2(0.35)} 0%,rgba(99,102,241,0.2) 40%,transparent 70%)`, top: "-100px", left: "-100px", filter: "blur(60px)", animation: "lgOrb1 18s ease-in-out infinite" }}/>
            <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(139,92,246,0.3) 0%,rgba(168,85,247,0.15) 40%,transparent 70%)", bottom: "-80px", right: "-80px", filter: "blur(50px)", animation: "lgOrb2 22s ease-in-out infinite" }}/>
            <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(14,165,233,0.25) 0%,rgba(6,182,212,0.12) 40%,transparent 70%)", top: "40%", left: "45%", filter: "blur(55px)", animation: "lgOrb3 26s ease-in-out infinite" }}/>
            <div style={{ position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,rgba(236,72,153,0.2) 0%,transparent 70%)", top: "20%", right: "20%", filter: "blur(45px)", animation: "lgOrb1 30s ease-in-out infinite reverse" }}/>
          </>) : (<>
            <div style={{ position: "absolute", width: 700, height: 700, borderRadius: "50%", background: `radial-gradient(circle,${tc2(0.25)} 0%,rgba(147,197,253,0.15) 40%,transparent 70%)`, top: "-150px", left: "-150px", filter: "blur(80px)", animation: "lgOrb1 20s ease-in-out infinite" }}/>
            <div style={{ position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,rgba(167,139,250,0.2) 0%,rgba(196,181,253,0.1) 40%,transparent 70%)", bottom: "-100px", right: "-100px", filter: "blur(70px)", animation: "lgOrb2 24s ease-in-out infinite" }}/>
            <div style={{ position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,rgba(52,211,153,0.2) 0%,transparent 70%)", top: "35%", left: "50%", filter: "blur(65px)", animation: "lgOrb3 28s ease-in-out infinite" }}/>
          </>)}
        </div>
      )}
      {toast && (
        <div style={{ position: "fixed", bottom: 24, right: 24, zIndex: 9999, padding: "12px 20px", borderRadius: 10, background: toast.type === "error" ? "#dc2626" : "#16a34a", color: "#fff", fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,0.4)", maxWidth: 360 }}>
          {toast.type === "error" ? "⚠️ " : "✅ "}{toast.msg}
        </div>
      )}
      {isDemo && (
        <div style={{ background: "linear-gradient(90deg,#b45309,#d97706)", color: "#fff", textAlign: "center", padding: "6px 16px", fontSize: 12, fontWeight: 700, letterSpacing: 0.5, flexShrink: 0 }}>
          🎮 DEMO VERZE — plný přístup admin, data se neukládají, maximum {demoMaxStavby} staveb ({data.length}/{demoMaxStavby})
        </div>
      )}
      {isStaging && !isDemo && (
        <div style={{ animation: "stagingPulse 1.5s ease-in-out infinite", color: "#fff", textAlign: "center", padding: "7px 16px", fontSize: 14, fontWeight: 800, letterSpacing: 1, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ animation: "stagingBlink 1.5s ease-in-out infinite", display: "inline-block" }}>⚠️</span>
          TESTOVACÍ PROSTŘEDÍ — změny se ukládají do testovací databáze, nikoliv do ostré produkce
          <span style={{ animation: "stagingBlink 1.5s ease-in-out infinite", display: "inline-block" }}>⚠️</span>
        </div>
      )}

      {/* HEADER */}
      <div ref={headerRef} className={`no-print${liquidGlass ? " lg-panel" : ""}`} style={{ background: T.headerBg, borderBottom: `1px solid ${T.headerBorder}`, padding: isMobile ? "8px 12px" : "11px 18px", display: "flex", alignItems: "center", justifyContent: "space-between", flexShrink: 0, backdropFilter: T.backdropFilter, WebkitBackdropFilter: T.backdropFilter, boxShadow: T.boxShadow, position: "relative", zIndex: 10 }}>
        {liquidGlass && <div className="lg-shimmer-bar" style={{ position: "absolute", top: 0, left: 0, width: "40%", height: "100%", pointerEvents: "none" }} />}
        {/* Levá část: logo */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 8 : 14 }}>
          {IS_JIHLAVA ? (
            <svg width={isMobile ? 36 : 52} height={isMobile ? 36 : 52} viewBox="0 0 100 100" fill="none">
              <line x1="28" y1="92" x2="28" y2="18" stroke="#97C459" strokeWidth="3" strokeLinecap="round"/>
              <line x1="12" y1="28" x2="44" y2="28" stroke="#97C459" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="16" y1="42" x2="40" y2="42" stroke="#97C459" strokeWidth="2" strokeLinecap="round"/>
              <circle cx="13" cy="28" r="3" fill="#C0DD97"/>
              <circle cx="43" cy="28" r="3" fill="#C0DD97"/>
              <circle cx="17" cy="42" r="2.3" fill="#C0DD97"/>
              <circle cx="39" cy="42" r="2.3" fill="#C0DD97"/>
              <line x1="72" y1="92" x2="72" y2="24" stroke="#639922" strokeWidth="2.5" strokeLinecap="round"/>
              <line x1="58" y1="34" x2="86" y2="34" stroke="#639922" strokeWidth="2" strokeLinecap="round"/>
              <line x1="61" y1="47" x2="83" y2="47" stroke="#639922" strokeWidth="1.8" strokeLinecap="round"/>
              <circle cx="59" cy="34" r="2.3" fill="#97C459"/>
              <circle cx="85" cy="34" r="2.3" fill="#97C459"/>
              <circle cx="62" cy="47" r="1.9" fill="#97C459"/>
              <circle cx="82" cy="47" r="1.9" fill="#97C459"/>
              <path d="M13,28 Q40,36 59,34" fill="none" stroke="#C0DD97" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M43,28 Q60,33 85,34" fill="none" stroke="#C0DD97" strokeWidth="1.4" strokeLinecap="round"/>
              <path d="M17,42 Q40,50 62,47" fill="none" stroke="#97C459" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M39,42 Q60,48 82,47" fill="none" stroke="#97C459" strokeWidth="1.1" strokeLinecap="round"/>
            </svg>
          ) : (
            <svg width={isMobile ? 32 : 46} height={isMobile ? 32 : 46} viewBox="0 0 80 80" fill="none">
              <circle cx="40" cy="40" r="38" fill={TENANT.p1deep} />
              <polygon points="47,10 30,42 40,42 33,68 52,36 42,36" fill="#facc15" />
            </svg>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: isMobile ? 15 : 22 }}>{appNazev}</div>
              {!isMobile && <div style={{ color: T.textMuted, fontSize: 16, textAlign: "center", letterSpacing: 1 }}>{TENANT.kategorie}</div>}
            </div>
            {isStaging && !isDemo && (
              <div style={{ animation: "stagingBlink 1.5s ease-in-out infinite", background: "rgba(220,38,38,0.9)", color: "#fff", fontWeight: 800, fontSize: 13, padding: "4px 12px", borderRadius: 6, letterSpacing: 1, border: "1px solid rgba(220,38,38,0.6)", flexShrink: 0 }}>
                ⚠️ TEST
              </div>
            )}
          </div>
        </div>

        {/* Pravá část: desktop = vše, mobil = Termíny + ☰ */}
        <div style={{ display: "flex", alignItems: "center", gap: isMobile ? 6 : 10 }}>
          {!isDemo && deadlineWarnings.length > 0 && (
            <button onClick={() => { resetDeadlines(); setShowDeadlines(true); }} onMouseEnter={e => showTooltip(e, "Zobrazit stavby s blížícím se nebo prošlým termínem ukončení")} onMouseLeave={hideTooltip} style={{ padding: isMobile ? "4px 8px" : "5px 12px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: isMobile ? 11 : 12, fontWeight: 600 }}>⚠️ Termíny ({deadlineWarnings.length})</button>
          )}
          {!isMobile && !isDemo && (() => { const firmyNames = firmy.map(f => f.hodnota); const count = data.filter(s => s.firma && !firmyNames.includes(s.firma)).length; return count > 0 ? <button onClick={() => setShowOrphanWarning(true)} style={{ padding: "5px 12px", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 7, color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🏚️ Bez firmy ({count})</button> : null; })()}
          {!isMobile && <>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ color: T.text, fontSize: 13 }}>{user.name}</span>
            <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: isSuperAdmin ? "rgba(168,85,247,0.2)" : isAdmin ? "rgba(245,158,11,0.2)" : isEditor ? "rgba(34,197,94,0.2)" : "rgba(100,116,139,0.2)", color: isSuperAdmin ? "#c084fc" : isAdmin ? "#fbbf24" : isEditor ? "#4ade80" : "#94a3b8" }}>{isSuperAdmin ? "SUPERADMIN" : isAdmin ? "ADMIN" : isEditor ? "USER EDITOR" : "USER"}</span>
            {isSuperAdmin && <span onMouseEnter={e => showTooltip(e, "Číslo buildu aplikace")} onMouseLeave={hideTooltip} style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: "rgba(168,85,247,0.2)", border: "1px solid rgba(168,85,247,0.5)", color: "#c084fc", letterSpacing: 0.5, cursor: "default", userSelect: "none" }}>{APP_BUILD}</span>}
            <button onClick={() => { resetHelp(); setShowHelp(true); }} onMouseEnter={e => showTooltip(e, "Nápověda k aplikaci")} onMouseLeave={hideTooltip} style={{ padding: "5px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: T.textMuted, cursor: "pointer", fontSize: 12 }}>❓ Nápověda</button>
            {isAdmin && <button onClick={() => { setShowSettings(true); if (!isDemo) loadLog(isSuperAdmin); }} onMouseEnter={e => showTooltip(e, "Nastavení aplikace — firmy, číselníky, uživatelé, emaily")} onMouseLeave={hideTooltip} style={{ padding: "5px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: T.textMuted, cursor: "pointer", fontSize: 12 }}>⚙️ Nastavení</button>}
            {isAdmin && <button onClick={() => setShowLog(true)} onMouseEnter={e => showTooltip(e, "Log aktivit uživatelů")} onMouseLeave={hideTooltip} style={{ padding: "5px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: T.textMuted, cursor: "pointer", fontSize: 12 }}>📜 Log</button>}
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[["🌞","light","Světlý"],["🌙","dark","Tmavý"]].map(([icon, val, label]) => (
                <button key={val} onClick={() => changeTheme(val)} onMouseEnter={e => showTooltip(e, label + " režim")} onMouseLeave={hideTooltip} style={{ padding: "5px 9px", background: theme === val ? (isDark ? tc1(0.3) : tc1(0.15)) : "transparent", border: `1px solid ${theme === val ? tc1(0.5) : "rgba(255,255,255,0.1)"}`, borderRadius: 8, color: theme === val ? TENANT.p3 : T.textMuted, cursor: "pointer", fontSize: 13 }}>{icon}</button>
              ))}
            </div>
            <button onClick={toggleLiquidGlass} onMouseEnter={e => showTooltip(e, liquidGlass ? "Vypnout Liquid Glass" : "Zapnout Liquid Glass")} onMouseLeave={hideTooltip} style={{ padding: "5px 9px", background: liquidGlass ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)", border: `1px solid ${liquidGlass ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, color: liquidGlass ? "#a78bfa" : T.textMuted, cursor: "pointer", fontSize: 14, fontWeight: liquidGlass ? 700 : 400, boxShadow: liquidGlass ? "0 0 12px rgba(139,92,246,0.4)" : "none" }}>💎</button>
            {/* Univerzální slider — zobrazí se mezi 💎 a Odhlásit */}
            {activeSlider === "theme" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: isDark ? "rgba(129,140,248,0.12)" : "rgba(251,191,36,0.12)", border: `1px solid ${isDark ? "rgba(129,140,248,0.3)" : "rgba(251,191,36,0.3)"}`, borderRadius: 8, padding: "3px 8px" }}
                onMouseEnter={() => { if (sliderTimer.current) clearTimeout(sliderTimer.current); }}
                onMouseLeave={sliderStartTimer}
                title={`Intenzita pozadí: ${themeStrength}%`}
              >
                <span style={{ fontSize: 10, color: isDark ? "#818cf8" : "#f59e0b", fontWeight: 700, minWidth: 26, textAlign: "right" }}>{themeStrength}%</span>
                <input type="range" min="0" max="100" step="5" value={themeStrength} onChange={e => changeThemeStrength(Number(e.target.value))} style={{ width: 70, accentColor: isDark ? "#818cf8" : "#f59e0b", cursor: "pointer" }} />
              </div>
            )}
            {activeSlider === "lg" && (
              <div style={{ display: "flex", alignItems: "center", gap: 5, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, padding: "3px 8px" }}
                onMouseEnter={() => { if (sliderTimer.current) clearTimeout(sliderTimer.current); }}
                onMouseLeave={sliderStartTimer}
                title={`Síla Liquid Glass: ${lgStrength}%`}
              >
                <span style={{ fontSize: 10, color: "#a78bfa", fontWeight: 700, minWidth: 26, textAlign: "right" }}>{lgStrength}%</span>
                <input type="range" min="10" max="100" step="5" value={lgStrength} onChange={e => changeLgStrength(Number(e.target.value))} style={{ width: 70, accentColor: "#a78bfa", cursor: "pointer" }} />
              </div>
            )}
            <button onClick={() => setShowLogoutConfirm(true)} style={{ padding: "5px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: T.textMuted, cursor: "pointer", fontSize: 12 }}>Odhlásit</button>
          </>}
          {/* Mobil: hamburger ☰ */}
          {isMobile && (
            <button onClick={() => setShowMobileMenu(v => !v)} style={{ padding: "6px 10px", background: showMobileMenu ? tc1(0.25) : "rgba(255,255,255,0.06)", border: `1px solid ${showMobileMenu ? tc1(0.5) : "rgba(255,255,255,0.12)"}`, borderRadius: 8, color: showMobileMenu ? TENANT.p3 : T.textMuted, cursor: "pointer", fontSize: 18, lineHeight: 1 }}>☰</button>
          )}
        </div>
      </div>

      {/* MOBILE MENU — dropdown pod headerem */}
      {isMobile && showMobileMenu && (
        <div style={{ background: isDark ? TENANT.modalBg : "#fff", border: `1px solid ${T.headerBorder}`, borderTop: "none", padding: "10px 14px", display: "flex", flexDirection: "column", gap: 8, flexShrink: 0, zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, paddingBottom: 8, borderBottom: `1px solid ${T.cellBorder}` }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#4ade80" }} />
            <span style={{ color: T.text, fontSize: 13, fontWeight: 600 }}>{user.name}</span>
            <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: isSuperAdmin ? "rgba(168,85,247,0.2)" : isAdmin ? "rgba(245,158,11,0.2)" : isEditor ? "rgba(34,197,94,0.2)" : "rgba(100,116,139,0.2)", color: isSuperAdmin ? "#c084fc" : isAdmin ? "#fbbf24" : isEditor ? "#4ade80" : "#94a3b8" }}>{isSuperAdmin ? "SUPERADMIN" : isAdmin ? "ADMIN" : isEditor ? "USER EDITOR" : "USER"}</span>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              {[["🌞","light"],["🌙","dark"]].map(([icon, val]) => (
                <button key={val} onClick={() => changeTheme(val)} style={{ padding: "6px 12px", background: theme === val ? tc1(0.3) : "transparent", border: `1px solid ${theme === val ? tc1(0.5) : "rgba(255,255,255,0.1)"}`, borderRadius: 8, color: theme === val ? TENANT.p3 : T.textMuted, cursor: "pointer", fontSize: 14 }}>{icon}</button>
              ))}
            </div>
            <button onClick={toggleLiquidGlass} style={{ padding: "6px 12px", background: liquidGlass ? "rgba(139,92,246,0.25)" : "rgba(255,255,255,0.05)", border: `1px solid ${liquidGlass ? "rgba(139,92,246,0.6)" : "rgba(255,255,255,0.1)"}`, borderRadius: 8, color: liquidGlass ? "#a78bfa" : T.textMuted, cursor: "pointer", fontSize: 14, fontWeight: liquidGlass ? 700 : 400 }}>💎</button>
            {/* Univerzální slider v mobilním menu */}
            {activeSlider === "theme" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: isDark ? "rgba(129,140,248,0.12)" : "rgba(251,191,36,0.12)", border: `1px solid ${isDark ? "rgba(129,140,248,0.3)" : "rgba(251,191,36,0.3)"}`, borderRadius: 8, padding: "6px 10px" }}
                onMouseEnter={() => { if (sliderTimer.current) clearTimeout(sliderTimer.current); }}
                onMouseLeave={sliderStartTimer}
                onTouchStart={() => { if (sliderTimer.current) clearTimeout(sliderTimer.current); }}
                onTouchEnd={sliderStartTimer}
              >
                <span style={{ fontSize: 11, color: isDark ? "#818cf8" : "#f59e0b", fontWeight: 700, minWidth: 30 }}>{themeStrength}%</span>
                <input type="range" min="0" max="100" step="5" value={themeStrength} onChange={e => changeThemeStrength(Number(e.target.value))} style={{ flex: 1, accentColor: isDark ? "#818cf8" : "#f59e0b", cursor: "pointer" }} />
              </div>
            )}
            {activeSlider === "lg" && (
              <div style={{ display: "flex", alignItems: "center", gap: 6, background: "rgba(139,92,246,0.12)", border: "1px solid rgba(139,92,246,0.3)", borderRadius: 8, padding: "6px 10px" }}
                onMouseEnter={() => { if (sliderTimer.current) clearTimeout(sliderTimer.current); }}
                onMouseLeave={sliderStartTimer}
                onTouchStart={() => { if (sliderTimer.current) clearTimeout(sliderTimer.current); }}
                onTouchEnd={sliderStartTimer}
              >
                <span style={{ fontSize: 11, color: "#a78bfa", fontWeight: 700, minWidth: 30 }}>{lgStrength}%</span>
                <input type="range" min="10" max="100" step="5" value={lgStrength} onChange={e => changeLgStrength(Number(e.target.value))} style={{ flex: 1, accentColor: "#a78bfa", cursor: "pointer" }} />
              </div>
            )}
            <button onClick={() => { resetHelp(); setShowHelp(true); setShowMobileMenu(false); }} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: T.textMuted, cursor: "pointer", fontSize: 13 }}>❓ Nápověda</button>
            {isAdmin && <button onClick={() => { setShowSettings(true); setShowMobileMenu(false); if (!isDemo) loadLog(isSuperAdmin); }} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: T.textMuted, cursor: "pointer", fontSize: 13 }}>⚙️ Nastavení</button>}
            {isAdmin && <button onClick={() => { setShowLog(true); setShowMobileMenu(false); }} style={{ padding: "6px 12px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 7, color: T.textMuted, cursor: "pointer", fontSize: 13 }}>📜 Log</button>}
            {!isDemo && (() => { const firmyNames = firmy.map(f => f.hodnota); const count = data.filter(s => s.firma && !firmyNames.includes(s.firma)).length; return count > 0 ? <button onClick={() => { setShowOrphanWarning(true); setShowMobileMenu(false); }} style={{ padding: "6px 12px", background: "rgba(251,191,36,0.15)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 7, color: "#fbbf24", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🏚️ Bez firmy ({count})</button> : null; })()}
            <button onClick={() => { setShowLogoutConfirm(true); setShowMobileMenu(false); }} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Odhlásit</button>
          </div>
        </div>
      )}

      {/* SUMMARY */}
      <div ref={cardsRef} className="no-print"><SummaryCards data={data} firmy={firmy.map(f => f.hodnota)} isDark={isDark} firmaColors={Object.fromEntries(firmy.map(f => [f.hodnota, f.barva || TENANT.p1]))} isMobile={isMobile} /></div>

      {/* FILTERS */}
      <div ref={filtersRef} className={`no-print${liquidGlass ? " lg-panel" : ""}`} style={{ padding: "4px 6px", display: "flex", flexDirection: "column", gap: 3, background: T.filterBg, borderBottom: `1px solid ${T.cellBorder}`, minHeight: 38, backdropFilter: T.backdropFilter, WebkitBackdropFilter: T.backdropFilter, position: "relative", zIndex: 9 }}>
        {/* Řádek 1: hledání + firma + filtr + ▦ */}
        <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "nowrap", overflowX: isMobile ? "visible" : "auto" }}>
          <input placeholder="🔍 Hledat..." onMouseEnter={e => showTooltip(e, "Hledat podle názvu nebo čísla stavby")} onMouseLeave={hideTooltip} value={filterText} onChange={e => setFilterText(e.target.value)} style={{ ...inputSx, width: isMobile ? 110 : 150, minWidth: 80, background: T.inputBg, border: `1px solid ${T.inputBorder}`, color: T.text, padding: "4px 8px", fontSize: 11 }} />
          <NativeSelect value={filterFirma} onChange={setFilterFirma} options={["Všechny firmy", ...firmy.map(f => f.hodnota)]} isDark={isDark} style={{ width: isMobile ? 110 : 130, flexShrink: 0 }} />
          {!isMobile && <NativeSelect value={filterObjed} onChange={setFilterObjed} options={["Všichni objednatelé", ...objednatele]} isDark={isDark} style={{ width: 145, flexShrink: 0 }} />}
          {!isMobile && <NativeSelect value={filterSV} onChange={setFilterSV} options={["Všichni stavbyvedoucí", ...stavbyvedouci]} isDark={isDark} style={{ width: 155, flexShrink: 0 }} />}
          <button onClick={() => setShowAdvFilter(v => !v)} onMouseEnter={e => showTooltip(e, "Rozšířený filtr: rok, částka, prošlé termíny")} onMouseLeave={hideTooltip} style={{ padding: "0 8px", height: 28, background: showAdvFilter ? (filterRok || filterCastkaOd || filterCastkaDo || filterProslé || filterFakturace || filterKat) ? "rgba(239,68,68,0.25)" : tc1(0.25) : (filterRok || filterCastkaOd || filterCastkaDo || filterProslé || filterFakturace || filterKat) ? "rgba(239,68,68,0.18)" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"), border: `1px solid ${(filterRok || filterCastkaOd || filterCastkaDo || filterProslé || filterFakturace || filterKat) ? "rgba(239,68,68,0.7)" : showAdvFilter ? tc1(0.5) : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)")}`, borderRadius: 7, color: (filterRok || filterCastkaOd || filterCastkaDo || filterProslé || filterFakturace || filterKat) ? "#f87171" : showAdvFilter ? TENANT.p3 : T.text, cursor: "pointer", fontSize: 12, fontWeight: (showAdvFilter || filterRok || filterCastkaOd || filterCastkaDo || filterProslé || filterFakturace || filterKat) ? 700 : 400, whiteSpace: "nowrap", flexShrink: 0, boxShadow: (filterRok || filterCastkaOd || filterCastkaDo || filterProslé || filterFakturace || filterKat) ? "0 0 8px rgba(239,68,68,0.4)" : "none" }}>Filtr {showAdvFilter ? "▲" : "▼"}</button>
          {isMobile && (
            <button onClick={() => setCardView(v => !v)} onMouseEnter={e => showTooltip(e, cardView ? "Přepnout na tabulku" : "Přepnout na kartičky")} onMouseLeave={hideTooltip} style={{ padding: "0 8px", height: 28, background: cardView ? tc1(0.25) : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"), border: `1px solid ${cardView ? tc1(0.5) : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)")}`, borderRadius: 7, color: cardView ? TENANT.p3 : T.text, cursor: "pointer", fontSize: 13, fontWeight: cardView ? 700 : 400, flexShrink: 0 }} title={cardView ? "Tabulka" : "Kartičky"}>{cardView ? "☰" : "▦"}</button>
          )}
          {isMobile && (
            <button onClick={() => setShowFilterRow2(v => !v)} style={{ padding: "0 8px", height: 28, background: showFilterRow2 ? tc1(0.25) : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)"), border: `1px solid ${showFilterRow2 ? tc1(0.5) : (isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)")}`, borderRadius: 7, color: showFilterRow2 ? TENANT.p3 : T.text, cursor: "pointer", fontSize: 14, fontWeight: 600, flexShrink: 0 }} title="Více možností">⋯</button>
          )}
          {!isMobile && (
            <>
              <div style={{ display: "flex", gap: 2, flexShrink: 0, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", borderRadius: 7, padding: 2, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}` }}>
                {[["page","📋 Stránky","Stránkované zobrazení s ovládáním počtu řádků"],["scroll","📜 Vše","Zobrazit všechny záznamy najednou se scrollem"]].map(([vm, lbl, tip]) => (
                  <button key={vm} onClick={() => setViewMode(vm)} onMouseEnter={e => showTooltip(e, tip)} onMouseLeave={hideTooltip} style={{ padding: "0 7px", height: 28, background: viewMode === vm ? (isDark ? tc1(0.4) : TENANT.p1) : "transparent", border: "none", borderRadius: 5, color: viewMode === vm ? "#fff" : T.textMuted, cursor: "pointer", fontSize: 11, fontWeight: viewMode === vm ? 700 : 400, whiteSpace: "nowrap" }}>{lbl}</button>
                ))}
              </div>
              <div style={{ marginLeft: "auto", display: "flex", gap: 6, alignItems: "center", flexShrink: 0 }}>
                <span style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)"}`, borderRadius: 7, padding: "0 8px", height: 28, display: "inline-flex", alignItems: "center", color: T.text, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{filtered.length} záz.</span>
                <button onClick={() => setShowGraf(true)} onMouseEnter={e => showTooltip(e, "Sloupcový graf nákladů")} onMouseLeave={hideTooltip} style={{ padding: "0 10px", height: 28, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)"}`, borderRadius: 7, color: T.text, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>📊 Graf</button>
                <NativeSelect value="⬇ Export" onChange={v => { if (v === "📄 CSV (.csv)") exportCSV(); else if (v === "📊 Excel (.xlsx)") exportXLS(); else if (v === "🎨 Barevný Excel") exportXLSColor(); }} options={["⬇ Export", "📄 CSV (.csv)", "📊 Excel (.xlsx)", "🎨 Barevný Excel"]} isDark={isDark} style={{ flexShrink: 0 }} />
                <button onClick={exportPDF} onMouseEnter={e => showTooltip(e, "Tisk / PDF — vytiskne aktuální tabulku")} onMouseLeave={hideTooltip} style={{ padding: "0 10px", height: 28, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)"}`, borderRadius: 7, color: T.text, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap" }}>🖨 Tisk</button>
                {(isSuperAdmin || (isAdmin && ["admin","user_e","user"].includes(zalohaRole)) || (isEditor && ["user_e","user"].includes(zalohaRole)) || zalohaRole === "user") && !isDemo && (
                  <NativeSelect value="🗄 Data" onChange={v => {
                    if (v === "💾 Záloha ( JSON )") zalohaJSON();
                    else if (v === "📥 Obnova zálohy ( JSON )") importRef2.current?.click();
                  }} options={["🗄 Data", "💾 Záloha ( JSON )", "📥 Obnova zálohy ( JSON )"]} isDark={isDark} style={{ flexShrink: 0 }} />
                )}
                <input ref={importRef} type="file" accept=".xlsx,.xls" onChange={handleImport} style={{ display: "none" }} />
                <input ref={importRefJI} type="file" accept=".xlsx,.xls" onChange={handleImportJI} style={{ display: "none" }} />
                <input ref={importRef2} type="file" accept=".json" onChange={handleImportJSON} style={{ display: "none" }} />
                {isEditor && <button onMouseEnter={e => showTooltip(e, "Přidat novou stavbu")} onMouseLeave={hideTooltip} onClick={() => { if (isDemo && data.length >= demoMaxStavby) { showToast(`Demo verze: maximum ${demoMaxStavby} staveb.`, "error"); return; } setAdding(true); }} style={{ padding: "0 14px", height: 28, background: isDemo && data.length >= demoMaxStavby ? "rgba(100,116,139,0.4)" : "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: 7, color: "#fff", cursor: isDemo && data.length >= demoMaxStavby ? "not-allowed" : "pointer", fontSize: 12, fontWeight: 600 }}>{isDemo ? `+ Přidat stavbu (${data.length}/${demoMaxStavby})` : "+ Přidat stavbu"}</button>}
              </div>
            </>
          )}
        </div>
        {/* Řádek 2 (pouze mobil): objednatel + SV + view + počet + graf + export + přidat */}
        {isMobile && showFilterRow2 && (
          <div style={{ display: "flex", gap: 4, alignItems: "center", flexWrap: "nowrap", overflowX: "auto" }}>
            <NativeSelect value={filterObjed} onChange={setFilterObjed} options={["Všichni objednatelé", ...objednatele]} isDark={isDark} style={{ width: 130, flexShrink: 0 }} />
            <NativeSelect value={filterSV} onChange={setFilterSV} options={["Všichni SV", ...stavbyvedouci]} isDark={isDark} style={{ width: 110, flexShrink: 0 }} />
            <div style={{ display: "flex", gap: 2, flexShrink: 0, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", borderRadius: 7, padding: 2, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}` }}>
              {[["page","Str."],["scroll","Vše"]].map(([vm, lbl]) => (
                <button key={vm} onClick={() => setViewMode(vm)} style={{ padding: "0 6px", height: 26, background: viewMode === vm ? (isDark ? tc1(0.4) : TENANT.p1) : "transparent", border: "none", borderRadius: 5, color: viewMode === vm ? "#fff" : T.textMuted, cursor: "pointer", fontSize: 11, fontWeight: viewMode === vm ? 700 : 400, whiteSpace: "nowrap" }}>{lbl}</button>
              ))}
            </div>
            <span style={{ background: isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)"}`, borderRadius: 7, padding: "0 7px", height: 28, display: "inline-flex", alignItems: "center", color: T.text, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{filtered.length} záz.</span>
            <button onClick={() => setShowGraf(true)} style={{ padding: "0 8px", height: 28, background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.15)"}`, borderRadius: 7, color: T.text, cursor: "pointer", fontSize: 12, whiteSpace: "nowrap", flexShrink: 0 }}>📊</button>
            <NativeSelect value="⬇" onChange={v => { if (v === "📄 CSV (.csv)") exportCSV(); else if (v === "📊 Excel (.xlsx)") exportXLS(); else if (v === "🎨 Barevný Excel") exportXLSColor(); else if (v === "🖨️ Tisk") exportPDF(); }} options={["⬇", "📄 CSV (.csv)", "📊 Excel (.xlsx)", "🎨 Barevný Excel", "🖨️ Tisk"]} isDark={isDark} style={{ flexShrink: 0, width: 55 }} />
            {isEditor && (
              <button onClick={() => { if (isDemo && data.length >= demoMaxStavby) { showToast(`Demo: max ${demoMaxStavby} staveb.`, "error"); return; } setAdding(true); }} style={{ marginLeft: "auto", padding: "0 12px", height: 28, background: isDemo && data.length >= demoMaxStavby ? "rgba(100,116,139,0.4)" : "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: 7, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600, whiteSpace: "nowrap", flexShrink: 0 }}>+ Přidat</button>
            )}
          </div>
        )}
      </div>

      {/* CARD VIEW (mobil) */}
      {cardView && (
        <div style={{ overflowY: "auto", flex: 1, minHeight: 0, padding: "10px 10px", display: "flex", flexDirection: "column", gap: 10, background: isDark ? TENANT.appDarkBg : TENANT.appLightBg }}>
          {displayRows.length === 0 && (
            <div style={{ textAlign: "center", padding: 48, color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", fontSize: 14 }}>Žádné záznamy</div>
          )}
          {displayRows.map(row => (
            <StavbaCard
              key={row.id}
              row={row}
              isEditor={isEditor}
              isAdmin={isAdmin}
              isDark={isDark}
              firmy={firmy}
              onEdit={setEditRow}
              onCopy={handleCopy}
              onDelete={(id) => setDeleteConfirm({ id, step: 1 })}
              onHistorie={setHistorieRow}
              showTooltip={showTooltip}
              hideTooltip={hideTooltip}
            />
          ))}
        </div>
      )}

      {/* TABLE */}
      <div ref={tableWrapRef} className="table-wrapper" style={{ display: cardView ? "none" : undefined, overflowX: "auto", overflowY: "auto", flex: 1, minHeight: 0, ...(viewMode === "scroll" ? { overflowY: "auto" } : {}) }}>
        <table style={{ borderCollapse: "collapse", fontSize: 12.5, tableLayout: "fixed", width: "max-content" }}>
          <colgroup>
            <col style={{ width: 40 }} />
            {(isAdmin || isEditor) && <col className="print-hide-col" style={{ width: 90 }} />}
            {orderedCols.map(col => (
              <col key={col.key} style={{ width: getColWidth(col) }} />
            ))}
            {(isAdmin || isEditor) && <col className="print-hide-col" style={{ width: 120 }} />}
          </colgroup>
          <thead>
            <tr style={{ background: T.theadBg }}>
              <th style={{ padding: "9px 11px", textAlign: "center", color: T.textMuted, fontWeight: 700, fontSize: 10.5, letterSpacing: 0.4, whiteSpace: "nowrap", minWidth: 40, position: "sticky", top: 0, background: T.theadBg, zIndex: 10, border: `1px solid ${T.cellBorder}` }}>#</th>
              {(isAdmin || isEditor) && <th className="print-hide-col" style={{ padding: "9px 11px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, position: "sticky", top: 0, background: T.theadBg, zIndex: 10, border: `1px solid ${T.cellBorder}`, textAlign: "center" }}>AKCE</th>}
              {orderedCols.map(col => (
                <th key={col.key}
                  draggable={isSuperAdmin}
                  onDragStart={isSuperAdmin ? e => handleColDragStart(e, col.key) : undefined}
                  onDragOver={isSuperAdmin ? e => handleColDragOver(e, col.key) : undefined}
                  onDragLeave={isSuperAdmin ? handleColDragLeave : undefined}
                  onDrop={isSuperAdmin ? e => handleColDrop(e, col.key) : undefined}
                  onDragEnd={isSuperAdmin ? handleColDragEnd : undefined}
                  style={{ padding: "6px 4px 6px 8px", textAlign: "center", color: T.textMuted, fontWeight: 700, fontSize: 10.5, letterSpacing: 0.4, width: getColWidth(col), minWidth: 0, position: "sticky", top: 0, background: dragOverState === col.key ? (isDark ? tc1(0.25) : tc1(0.12)) : T.theadBg, zIndex: 10, border: `1px solid ${T.cellBorder}`, borderLeft: dragOverState === col.key ? `2px solid ${TENANT.p2}` : `1px solid ${T.cellBorder}`, userSelect: "none", cursor: isSuperAdmin ? "grab" : "default", transition: "background 0.1s, border-left 0.1s" }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2, width: "100%", minWidth: 0 }}>
                    {isSuperAdmin && (
                      <span className="print-hide-symbol" style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)", fontSize: 11, flexShrink: 0, cursor: "grab", lineHeight: 1 }} title="Táhni pro přesun sloupce">⠿</span>
                    )}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1, textAlign: "center", minWidth: 0 }}>{col.label.toUpperCase()}</span>
                    {isSuperAdmin && (
                      editingColWidth === col.key
                        ? <input
                            autoFocus
                            type="number"
                            defaultValue={Math.round(getColWidth(col))}
                            onBlur={e => { const w = Math.max(40, Math.min(2000, parseInt(e.target.value)||40)); setColWidths(prev => { const n = {...prev, [col.key]: w}; saveColWidths(n); return n; }); setEditingColWidth(null); }}
                            onKeyDown={e => { if (e.key === "Enter") e.target.blur(); if (e.key === "Escape") setEditingColWidth(null); }}
                            style={{ width: 50, fontSize: 10, padding: "1px 3px", background: TENANT.p1deep, color: "#fff", border: `1px solid ${TENANT.p3}`, borderRadius: 3, flexShrink: 0 }}
                            onClick={e => e.stopPropagation()}
                          />
                        : <span className="print-hide-symbol"
                            onMouseDown={e => { e.preventDefault(); e.stopPropagation(); startDrag(e, col.key, getColWidth(col)); }}
                            onClick={e => { e.preventDefault(); e.stopPropagation(); setEditingColWidth(col.key); }}
                            style={{ cursor: "col-resize", color: isDark ? "rgba(255,255,255,0.7)" : "rgba(0,0,0,0.5)", fontSize: 12, padding: "1px 3px", userSelect: "none", flexShrink: 0, display: "inline-flex", alignItems: "center", borderRadius: 3, background: isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.07)", lineHeight: 1 }}
                            title={`Táhni = resize | Klik = zadat šířku (nyní: ${Math.round(getColWidth(col))}px)`}
                          >⟺</span>
                    )}
                  </div>
                </th>
              ))}
              {(isAdmin || isEditor) && <th className="print-hide-col" style={{ padding: "9px 11px", color: T.textMuted, fontWeight: 700, fontSize: 10.5, position: "sticky", top: 0, background: T.theadBg, zIndex: 10, border: `1px solid ${T.cellBorder}`, textAlign: "center" }}>AKCE</th>}
            </tr>
          </thead>
          <tbody>
            {displayRows.map((row, i) => {
              const globalIndex = page * PAGE_SIZE + i;
              const isFaktura = row.cislo_faktury && row.cislo_faktury.trim() !== "" && row.castka_bez_dph && Number(row.castka_bez_dph) !== 0 && row.splatna && row.splatna.trim() !== "";
              const isFaktura2 = !!(row.cislo_faktury_2 || row.castka_bez_dph_2 || row.splatna_2);
              const isRowOverdue = !isFaktura && row.ukonceni && (() => { const parts = row.ukonceni.trim().split("."); if (parts.length !== 3) return false; const d = new Date(parts[2]+"-"+parts[1].padStart(2,"0")+"-"+parts[0].padStart(2,"0")); const dnes = new Date(); dnes.setHours(0,0,0,0); return !isNaN(d) && d < dnes; })();
              const baseBg = isFaktura ? "rgba(22,163,74,0.45)" : rowBg(row.firma);
              const printBg = isFaktura ? "#dcfce7" : (getFirmaColor(row.firma).bgLight || "#f8fafc");
              return (
              <tr key={row.id}
                style={{ background: baseBg, transition: "background 0.1s", color: T.text, minHeight: 34, "--print-bg": printBg, animation: isRowOverdue ? "pulse-overdue-row 1.4s ease-in-out infinite" : undefined }}
                onMouseEnter={e => { if (!isRowOverdue) e.currentTarget.style.background = isFaktura ? "rgba(22,163,74,0.60)" : T.hoverBg; }}
                onMouseLeave={e => { if (!isRowOverdue) e.currentTarget.style.background = baseBg; }}
              >
                {/* # číslo řádku */}
                <td style={{ padding: "7px 11px", textAlign: "center", border: `1px solid ${T.cellBorder}` }}>
                  <span style={{ color: T.textMuted, fontSize: 12 }}>{globalIndex + 1}</span>
                </td>
                {/* AKCE vlevo */}
                {(isAdmin || isEditor) && (
                  <td className="print-hide-col" style={{ padding: "7px 11px", whiteSpace: "nowrap", border: `1px solid ${T.cellBorder}`, textAlign: "center" }}>
                    {isAdmin && <button onClick={() => setDeleteConfirm({ id: row.id, step: 1 })} onMouseEnter={e => showTooltip(e, "Smazat stavbu")} onMouseLeave={hideTooltip} style={{ padding: "3px 9px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 5, color: "#f87171", cursor: "pointer", fontSize: 11, marginRight: 5 }}>🗑️</button>}
                    <button onClick={() => setEditRow(row)} onMouseEnter={e => showTooltip(e, "Editovat stavbu")} onMouseLeave={hideTooltip} style={{ padding: "3px 9px", background: tc1(0.2), border: `1px solid ${tc1(0.3)}`, borderRadius: 5, color: TENANT.p3, cursor: "pointer", fontSize: 11 }}>✏️</button>
                    {!isDemo && <button onClick={() => setHistorieRow(row)} onMouseEnter={e => showTooltip(e, historieNovinky[String(row.id)] ? "Historie změn — obsahuje záznamy" : "Historie změn stavby")} onMouseLeave={hideTooltip} style={{ padding: "3px 9px", background: "rgba(168,85,247,0.15)", border: "1px solid rgba(168,85,247,0.3)", borderRadius: 5, color: "#c084fc", cursor: "pointer", fontSize: 11, marginLeft: 5, position: "relative" }}>
                      🕐{historieNovinky[String(row.id)] && <span style={{ position: "absolute", top: -3, right: -3, width: 8, height: 8, borderRadius: "50%", background: "#ef4444", boxShadow: "0 0 6px #ef4444, 0 0 12px rgba(239,68,68,0.7)", display: "block" }}/>}
                    </button>}
                    {showSlozka && (
                      <button
                        onClick={(e) => {
                          if (row.slozka_url) {
                            openFolder(row.slozka_url);
                          } else if (isEditor) {
                            const rect = e.currentTarget.getBoundingClientRect();
                            setSlozkaPopup({ id: row.id, url: "", x: rect.left, y: rect.bottom + 6 });
                          }
                        }}
                        onMouseEnter={e => showTooltip(e, row.slozka_url
                          ? ((protokolReady || extensionReady) ? `Otevřít složku: ${row.slozka_url}` : `Kopírovat cestu: ${row.slozka_url}`)
                          : isEditor ? "Kliknutím nastavit cestu ke složce" : "Složka není nastavena")}
                        onMouseLeave={hideTooltip}
                        style={{ padding: "3px 7px", background: row.slozka_url ? "rgba(251,191,36,0.15)" : "rgba(100,116,139,0.1)", border: `1px solid ${row.slozka_url ? "rgba(251,191,36,0.4)" : "rgba(100,116,139,0.2)"}`, borderRadius: 5, color: row.slozka_url ? "#fbbf24" : isEditor ? "rgba(100,116,139,0.6)" : "rgba(100,116,139,0.3)", cursor: (row.slozka_url || isEditor) ? "pointer" : "default", fontSize: 13, marginLeft: 5 }}
                      >💡</button>
                    )}
                  </td>
                )}
                {orderedCols.map(col => {
                  const centerCols = ["cislo_stavby","ukonceni","sod","ze_dne","cislo_faktury","splatna"];
                  const align = col.type === "number" ? "right" : centerCols.includes(col.key) ? "center" : "left";

                  // Dvojité hodnoty pro faktury
                  const isOverdue = !isFaktura && col.key === "ukonceni" && row.ukonceni && (() => {
                    const s = row.ukonceni.trim();
                    let d;
                    if (/^\d{4}-\d{2}-\d{2}/.test(s)) {
                      d = new Date(s); // ISO: YYYY-MM-DD
                    } else {
                      const p = s.split(".");
                      if (p.length !== 3) return false;
                      d = new Date(`${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`);
                    }
                    const dnes = new Date(); dnes.setHours(0,0,0,0);
                    return !isNaN(d) && d < dnes;
                  })();

                  return (
                    <td key={col.key}
                      className={col.key === "rozdil" || col.type === "number" ? "colored-cell" : ""}
                      style={{ padding: "5px 11px", whiteSpace: "nowrap", textAlign: align, border: `1px solid ${T.cellBorder}`, color: isOverdue ? "#f87171" : col.key === "rozdil" ? (Number(row[col.key]) >= 0 ? "#4ade80" : "#f87171") : col.type === "number" ? T.numColor : T.text, fontWeight: isOverdue ? 700 : "inherit", background: isOverdue ? "rgba(239,68,68,0.18)" : undefined, overflow: col.truncate ? "hidden" : undefined, maxWidth: col.truncate ? getColWidth(col) : undefined }}
                    >
                      <div>
                        <div>
                          {col.key === "firma" ? (() => { const deleted = !firmy.some(f => f.hodnota === row[col.key]) && row[col.key]; return <span className="firma-badge" style={firmaBadge(row[col.key])} title={deleted ? `Firma byla smazána (původně: ${row[col.key]})` : undefined}>{deleted ? `⚠ ${row[col.key]}` : (row[col.key] || "—")}</span>; })()
                          : col.key === "nazev_stavby" ? <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
                              <span style={{ overflow: "hidden", textOverflow: "ellipsis" }}>{row[col.key] ?? ""}</span>
                              {row.poznamka && row.poznamka.trim() !== "" && <span onMouseEnter={e => showTooltip(e, row.poznamka)} onMouseLeave={hideTooltip} style={{ cursor: "help", fontSize: 13, flexShrink: 0 }}>💬</span>}
                            </span>
                          : col.type === "number" ? fmtN(row[col.key])
                          : col.truncate ? <span title={row[col.key] ?? ""} style={{ display: "inline-block", maxWidth: getColWidth(col) - 22, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", verticalAlign: "middle" }}>{row[col.key] ?? ""}</span>
                          : isOverdue ? <span>⚠️ {row[col.key]}</span>
                          : col.key === "cislo_faktury" && row[col.key] ? <span style={{ display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontWeight: 700, fontSize: 13, color: "#ef4444", lineHeight: 1, flexShrink: 0, textShadow: "0 0 6px #ef4444, 0 0 12px rgba(239,68,68,0.7)" }}>e</span>{row[col.key]}</span>
                          : row[col.key] ?? ""}
                        </div>
                        {/* Druhý řádek pro fakturační sloupce */}
                        {col.key === "cislo_faktury" && row.cislo_faktury_2 && (
                          <div style={{ borderTop: `1px dashed ${T.cellBorder}`, marginTop: 2, paddingTop: 2, display: "flex", alignItems: "center", gap: 4 }}><span style={{ fontWeight: 700, fontSize: 13, color: "#facc15", lineHeight: 1, flexShrink: 0, textShadow: "0 0 6px #facc15, 0 0 12px rgba(250,204,21,0.7)" }}>S</span>{row.cislo_faktury_2}</div>
                        )}
                        {col.key === "castka_bez_dph" && row.castka_bez_dph_2 > 0 && (
                          <div style={{ borderTop: `1px dashed ${T.cellBorder}`, marginTop: 2, paddingTop: 2 }}>{fmtN(row.castka_bez_dph_2)}</div>
                        )}
                        {col.key === "splatna" && row.splatna_2 && (
                          <div style={{ borderTop: `1px dashed ${T.cellBorder}`, marginTop: 2, paddingTop: 2 }}>{row.splatna_2}</div>
                        )}

                      </div>
                    </td>
                  );
                })}
                {/* AKCE vpravo */}
                {(isAdmin || isEditor) && (
                  <td className="print-hide-col" style={{ padding: "7px 11px", whiteSpace: "nowrap", border: `1px solid ${T.cellBorder}`, textAlign: "center" }}>
                    <button onClick={() => setEditRow(row)} onMouseEnter={e => showTooltip(e, "Editovat stavbu")} onMouseLeave={hideTooltip} style={{ padding: "3px 9px", background: tc1(0.2), border: `1px solid ${tc1(0.3)}`, borderRadius: 5, color: TENANT.p3, cursor: "pointer", fontSize: 11, marginRight: 5 }}>✏️ Editovat</button>
                    <button onClick={() => handleCopy(row)} onMouseEnter={e => showTooltip(e, "Kopírovat stavbu")} onMouseLeave={hideTooltip} style={{ padding: "3px 9px", background: "rgba(16,185,129,0.15)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 5, color: "#34d399", cursor: "pointer", fontSize: 11, marginRight: isAdmin ? 5 : 0 }}>📋</button>
                    {isAdmin && <button onClick={() => setDeleteConfirm({ id: row.id, step: 1 })} onMouseEnter={e => showTooltip(e, "Smazat stavbu")} onMouseLeave={hideTooltip} style={{ padding: "3px 9px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 5, color: "#f87171", cursor: "pointer", fontSize: 11 }}>🗑️</button>}
                  </td>
                )}
              </tr>
              );
            })}

          </tbody>
        </table>
      </div>

      <div ref={paginationRef} className="no-print" style={{ display: cardView || viewMode === "scroll" ? "none" : "flex", alignItems: "center", justifyContent: "center", gap: 6, padding: "6px 18px", borderTop: `1px solid ${T.cellBorder}`, background: T.filterBg, flexShrink: 0, minHeight: 44 }}>
        {totalPages > 1 && <>
          <button onClick={() => setPage(0)} disabled={page === 0} style={{ padding: "4px 9px", background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 6, color: T.textMuted, cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.4 : 1, fontSize: 13 }}>«</button>
          <button onClick={() => setPage(p => Math.max(0, p - 1))} disabled={page === 0} style={{ padding: "4px 9px", background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 6, color: T.textMuted, cursor: page === 0 ? "default" : "pointer", opacity: page === 0 ? 0.4 : 1, fontSize: 13 }}>‹</button>
          {Array.from({ length: totalPages }, (_, i) => (
            <button key={i} onClick={() => setPage(i)} style={{ padding: "4px 10px", background: page === i ? TENANT.p1 : T.cardBg, border: `1px solid ${page === i ? TENANT.p1 : T.cardBorder}`, borderRadius: 6, color: page === i ? "#fff" : T.textMuted, cursor: "pointer", fontSize: 13, fontWeight: page === i ? 700 : 400 }}>{i + 1}</button>
          ))}
          <button onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))} disabled={page === totalPages - 1} style={{ padding: "4px 9px", background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 6, color: T.textMuted, cursor: page === totalPages - 1 ? "default" : "pointer", opacity: page === totalPages - 1 ? 0.4 : 1, fontSize: 13 }}>›</button>
          <button onClick={() => setPage(totalPages - 1)} disabled={page === totalPages - 1} style={{ padding: "4px 9px", background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 6, color: T.textMuted, cursor: page === totalPages - 1 ? "default" : "pointer", opacity: page === totalPages - 1 ? 0.4 : 1, fontSize: 13 }}>»</button>
          <span style={{ color: T.textMuted, fontSize: 12, marginLeft: 6 }}>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, filtered.length)} z {filtered.length}</span>
        </>}
        <span style={{ display: "flex", alignItems: "center", gap: 3, marginLeft: totalPages > 1 ? 10 : 0, borderLeft: totalPages > 1 ? `1px solid ${T.cellBorder}` : "none", paddingLeft: totalPages > 1 ? 10 : 0 }}>
          <button onClick={() => setPageSize(s => Math.max(3, s - 1))} title="Méně řádků na stránce" style={{ padding: "2px 6px", background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 5, color: T.textMuted, cursor: "pointer", fontSize: 12, lineHeight: 1 }}>−</button>
          <span style={{ color: T.textMuted, fontSize: 11, minWidth: 28, textAlign: "center" }}>{PAGE_SIZE} řád.</span>
          <button onClick={() => setPageSize(s => Math.min(50, s + 1))} title="Více řádků na stránce" style={{ padding: "2px 6px", background: T.cardBg, border: `1px solid ${T.cardBorder}`, borderRadius: 5, color: T.textMuted, cursor: "pointer", fontSize: 12, lineHeight: 1 }}>+</button>
        </span>
      </div>

      <div ref={footerRef} className="no-print" style={{ textAlign: "center", padding: "4px", borderTop: `1px solid ${T.cellBorder}`, color: T.textFaint, fontSize: 11, flexShrink: 0 }}>
        © {appDatum} {appNazev} – Martin Dočekal &amp; Claude AI &nbsp;|&nbsp; v{appVerze}
      </div>

      {/* HELP MODAL */}
      {/* IMPORT RESULT MODAL */}
      {importLog && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1600, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
          <div style={{ background: TENANT.modalBg, borderRadius: 16, width: "min(480px,92vw)", padding: "28px 32px", border: "1px solid rgba(255,255,255,0.15)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
            <div style={{ fontSize: 32, textAlign: "center", marginBottom: 12 }}>{importLog.chyby?.length > 0 ? "⚠️" : "✅"}</div>
            <div style={{ color: "#fff", fontWeight: 700, fontSize: 16, textAlign: "center", marginBottom: 8 }}>
              {importLog.chyby?.length > 0 ? "Import dokončen s chybami" : "Import úspěšný"}
            </div>
            {importLog.zprava && <div style={{ color: "#86efac", fontSize: 13, textAlign: "center", marginBottom: 12 }}>{importLog.zprava}</div>}
            {importLog.chyby?.length > 0 && (
              <div style={{ background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 8, padding: "10px 14px", marginBottom: 14 }}>
                {importLog.chyby.map((c, i) => <div key={i} style={{ color: "#fca5a5", fontSize: 12, marginBottom: 4 }}>• {c}</div>)}
              </div>
            )}
            <div style={{ textAlign: "center", marginTop: 8 }}>
              <button onClick={() => setImportLog(null)} style={{ padding: "9px 28px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Zavřít</button>
            </div>
          </div>
        </div>
      )}

      {showHelp && (
        <div style={{ position: "fixed", inset: 0, zIndex: 1400, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
          <div style={{ position: "fixed", left: helpPos.x, top: helpPos.y, pointerEvents: "all", background: TENANT.modalBg, borderRadius: 16, width: "min(680px,95vw)", maxHeight: "88vh", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.18)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>
            {/* Header — táhlo */}
            <div onMouseDown={onHelpDragStart} style={dragHeaderStyle()}>
              <div>
                <span style={{ color: "#fff", fontWeight: 700, fontSize: 15 }}>❓ Nápověda – {TENANT.nazev}{dragHint}</span>
              </div>
              <button onClick={() => setShowHelp(false)} onMouseDown={e => e.stopPropagation()} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
            </div>
            {/* Obsah */}
            <div id="help-print-content" style={{ overflowY: "auto", padding: "18px 22px", color: "#e2e8f0", fontSize: 13, lineHeight: 1.7 }}>
              {/* Intro */}
              <div style={{ marginBottom: 18, padding: "11px 15px", background: tc1(0.15), border: `1px solid ${tc1(0.35)}`, borderRadius: 10, fontSize: 12, color: TENANT.p4, lineHeight: 1.6 }}>
                <strong style={{ color: TENANT.p3 }}>{TENANT.nazev}</strong> — evidence stavebních zakázek pro kategorie I a II. Každá stavba obsahuje informace o firmě, termínech, fakturaci a realizaci. Změny se automaticky zaznamenávají v historii. Aplikace podporuje role USER, USER EDITOR, ADMIN a SUPERADMIN.
              </div>
              {[
                { role: "editor", icon: "🏗️", title: "Přidání stavby", text: "Klikněte na zelené tlačítko + Přidat stavbu v hlavičce. Vyplňte název stavby (povinný) a ostatní pole dle potřeby. Klávesa Enter přeskočí na další pole ve formuláři. Uložte tlačítkem Uložit — stavba se okamžitě zobrazí v tabulce." },
                { role: "editor", icon: "✏️", title: "Editace stavby", text: "Klikněte na modré tlačítko ✏️ v levém sloupci u řádku stavby. Otevře se formulář s předvyplněnými hodnotami — změňte co potřebujete a uložte. Všechny změny se automaticky zaznamenají do Historie změn." },
                { role: "admin", icon: "🗑️", title: "Smazání stavby", text: "Klikněte na červené tlačítko 🗑️ v levém sloupci. Systém požádá o potvrzení — musíte kliknout dvakrát (ochrana proti náhodnému smazání). Smazanou stavbu nelze obnovit." },
                { role: "editor", icon: "📋", title: "Kopírování stavby", text: "Tlačítko 📋 vedle editace otevře formulář s předvyplněnými daty dané stavby. Číslo stavby dostane příponu \" (kopie)\". Po uložení se vytvoří nový samostatný záznam — původní zůstane nezměněn. Funkce je dostupná pro editory i administrátory." },
                { role: "all", icon: "🕐", title: "Historie změn stavby", text: <span>Fialové tlačítko 🕐 v levém sloupci otevře historii změn. Kdo, kdy a která pole změnil. <span style={{display:"inline-flex",alignItems:"center",gap:2}}>Červená tečka <span style={{display:"inline-block",width:8,height:8,borderRadius:"50%",background:"#ef4444",boxShadow:"0 0 6px #ef4444, 0 0 12px rgba(239,68,68,0.7)",verticalAlign:"middle"}}/>  na ikoně</span> = stavba má záznamy v historii. Export jako Excel nebo PDF.</span> },
                { role: "admin", icon: "📜", title: "Log zakázek a skrývání", text: "Tlačítko 📜 Log v hlavičce (admin+) zobrazí přehled akcí na zakázkách. Admin může záznamy skrýt (✕) — záznamy se fyzicky nemažou, jen skrývají. Superadmin vidí přepínač Aktivní / Skryté / Vše a může záznamy obnovit (↩). Stejné skrývání funguje v Historii změn stavby a Nastavení → Log aktivit." },
                { role: "admin", icon: "💾", title: "Záloha a obnova dat", text: "Tlačítko 💾 Záloha stáhne JSON zálohu celé DB — stavby + číselníky + uživatelé + logy. Kdo může zálohovat se nastavuje v Nastavení → Aplikace → 💾 ZÁLOHA DO JSON (výchozí: superadmin). Automatická záloha se spustí při prvním přihlášení superadmina každý den (pokud je zapnuta). Při odhlášení lze zálohu stáhnout tlačítkem 💾 Zálohovat a odhlásit. Import JSON (superadmin) obnoví celou DB ze zálohy — smaže stávající data. Přenos mezi prostředími: červené varování + nutné napsat POTVRDIT." },
                { role: "all", icon: "💡", title: "Složka zakázky", text: "Tlačítko 💡 v levém sloupci. Šedá = cesta není nastavena — kliknutím otevřete popup pro zadání cesty (U:\\... nebo \\\\server\\...). Žlutá = cesta je nastavena — klik otevře složku přímo v Průzkumníku Windows. Vyžaduje nainstalovaný Stavby Helper (localhost:47891) — ke stažení v Nastavení → Aplikace → 💡. Bez helperu se cesta zkopíruje do schránky. Kdo vidí 💡 se nastavuje v Nastavení → Aplikace → 💡 TLAČÍTKO SLOŽKA." },
                { role: "admin", icon: "⚙️", title: "Nastavení — číselníky", text: "Správa firem (název + barva), objednatelů a stavbyvedoucích. Pořadí položek lze měnit tažením za ikonu ⠿ vlevo od každé položky. Pořadí firem se projeví v kartách nahoře i ve filtru. Admin spravuje uživatele — přidání, změna hesla a role." },
                { role: "all", icon: "💬", title: "Poznámka ke stavbě", text: <span>V editačním formuláři najdete fialovou sekci 💬 POZNÁMKA. Ikona <span style={{fontSize:13}}>💬</span> se zobrazí vedle názvu stavby pokud poznámka existuje — najeďte myší pro zobrazení textu.</span> },
                { role: "all", icon: "🎨", title: "Barevné řádky", text: <span>Každá firma má přiřazenou barvu (nastavitelnou v Nastavení). <span style={{background:"rgba(34,197,94,0.25)",color:"#4ade80",padding:"1px 5px",borderRadius:4,fontWeight:600}}>Zelený řádek</span> = stavba má fakturu, částku i datum splatnosti — kompletně vyfakturována.</span> },
                { role: "all", icon: "⚠️", title: "Termíny ukončení", text: <span>Pole Ukončení se zobrazí <span style={{color:"#f87171",fontWeight:700}}>červeně ⚠️</span> pokud je termín v minulosti a stavba nemá fakturu. Tlačítko <span style={{color:"#f87171",fontWeight:700}}>⚠️ Termíny</span> v hlavičce zobrazí přehled staveb s termínem do 30 dní — včetně zbývajících pracovních dní.</span> },
                { role: "all", icon: "🔍", title: "Filtry a vyhledávání", text: "Vyhledávejte podle názvu nebo čísla stavby (pole Hledat). Filtrujte podle firmy, objednatele nebo stavbyvedoucího. Tlačítko Filtr▼ otevře rozšířený filtr: rok, rozsah částky, prošlé termíny, fakturace, kategorie. Když je filtr aktivní, tlačítko Filtr zčervená — je viditelné i po zavření panelu. Graf 📊 a export vždy pracují jen s aktuálně vyfiltrovanými daty." },
                { role: "all", icon: "🔍", title: "Rozšířený filtr", text: "Tlačítko Filtr ▾ otevře plovoucí panel s rozšířenými možnostmi: rok uvedení do provozu, rozsah nabídkové ceny (od/do), prošlé termíny bez faktury, stav fakturace a kategorie I / II. Panel lze přetáhnout myší kamkoliv na plochu." },
                { role: "all", icon: "📊", title: "Graf nákladů", text: "Tlačítko 📊 Graf ve filtrovací liště otevře interaktivní sloupcový graf. Tři přepínače: 🏢 Firma, 📅 Měsíc, 📂 Kat. I / II (Plán.+SNK+Běžné op. vs. Plán.+Běžné op.+Poruchy). Graf vždy odráží aktuální filtr." },
                { role: "all", icon: "📤", title: "Export dat", text: "CSV — prostá tabulka. Excel (.xlsx) — standardní formát. Barevný Excel (.xls) — se zbarvením firem (potvrďte varování Excelu). PDF — tisk na A4 landscape. Vše pracuje s aktuálním filtrem." },
                { role: "superadmin", icon: "📥", title: "Import staveb", text: "Tlačítko 📥 Import XLS (superadmin) načte stavby z Excelu — původní tabulkový formát i záloha DB. Tlačítko 📥 Import JSON (superadmin) obnoví celou DB ze zálohy JSON — před importem zobrazí potvrzovací dialog." },
                { role: "all", icon: "📋", title: "Dva pohledy — Stránky / Vše", text: "Přepínač 📋 Stránky / 📜 Vše v liště přepíná mezi stránkovaným zobrazením (tlačítka −/+ pro počet řádků na stránce) a plným výpisem všech záznamů s vertikálním scrollem." },
                { role: "superadmin", icon: "↔️", title: "Šířky a pořadí sloupců", text: "Superadmin: Táhněte ikonu ⟺ v záhlaví sloupce pro změnu šířky. Kliknutím na ⟺ zadáte šířku číslem. Táhněte záhlaví za ikonu ⠿ pro změnu pořadí sloupců. Obojí se ukládá automaticky. Reset v Nastavení → Aplikace." },
                { role: "all", icon: "🪟", title: "Plovoucí okna", text: "Všechna okna (formuláře, nastavení, log, nápověda, graf, termíny…) jsou plovoucí — přetáhněte je za záhlaví (⠿ přetáhnout) kamkoliv na plochu. Okno vždy otevře na výchozí pozici uprostřed obrazovky." },
                { role: "all", icon: "🌙", title: "Tmavý / světlý režim + Liquid Glass", text: "Přepínejte mezi 🌞 světlým a 🌙 tmavým režimem. Posuvník intenzity pozadí se zobrazí automaticky. Tlačítko 💎 aktivuje Liquid Glass — průsvitné panely s blur efektem, animovanými orby na pozadí a odlesky ve stylu iOS 26. Posuvník síly efektu (10–100 %). Všechny preference se ukládají v prohlížeči." },
                { role: "all", icon: "🔔", title: "Notifikace v prohlížeči", text: "Aplikace zobrazuje upozornění na blížící se termíny i mimo otevřenou záložku. Po přihlášení prohlížeč zobrazí dialog — klikněte Povolit. Notifikace se odešlou pro stavby s termínem do 7 pracovních dní, opakují každých 60 min pokud záložka není aktivní." },
                { role: "all", icon: "⏱️", title: "Automatické odhlášení", text: "Aplikace se automaticky odhlásí po 15 minutách nečinnosti. Před odhlášením se zobrazí varování s odpočítáváním 60 sekund — klikněte Jsem tady pro pokračování. Neaktivní v demo režimu." },
                { role: "all", icon: "🧾", title: "Označení faktur", text: <span>Červené <span style={{fontWeight:700,color:"#ef4444",textShadow:"0 0 6px #ef4444"}}>e</span> před číslem faktury = E.ON (sdružená dodávka). Žluté <span style={{fontWeight:700,color:"#facc15",textShadow:"0 0 6px #facc15"}}>S</span> před druhým číslem faktury = faktura sdružení. Druhá faktura se zobrazí jako druhý řádek v buňce (přerušovaná čára).</span> },
                { role: "all", icon: "📱", title: "Mobilní zobrazení — kartičky", text: "Na mobilu (šířka < 768px) se automaticky přepne do kartičkového pohledu. Tlačítko ▦/☰ v liště přepíná mezi kartičkami a tabulkou. Každá kartička zobrazuje: firmu (barevná tečka), číslo stavby, název, 3 finanční metriky (nabídka / vyfakturováno / rozdíl), termín s barevným stavem (žlutý = do 10 dní, červený = prošlý, zelený = vyfakturováno), poznámku a faktury. Akce (🕐 hist, 📋 kopie, ✏️ editovat, 🗑️ smazat) jsou dostupné dle role." },
                { role: "all", icon: "☰", title: "Mobilní menu (hamburger)", text: "Na mobilu jsou tlačítka hlavičky (Nastavení, Nápověda, Odhlásit...) skryta za tlačítkem ☰ vpravo nahoře. Kliknutím se rozbalí dropdown s: jménem a rolí uživatele, přepínačem tmavý/světlý režim, Nápovědou, Nastavením (admin), Logem (admin) a tlačítkem Odhlásit." },
                { role: "all", icon: "⋯", title: "Mobilní filtr — rozbalovací řádek", text: "Filtrovací lišta na mobilu má dva řádky. Řádek 1 (vždy viditelný): Hledat · Firmy · Filtr▼ · ▦ (kartičky) · ⋯. Kliknutím na ⋯ se zobrazí řádek 2: Objednatel · Stavbyvedoucí · Stránky/Vše · počet záznamů · 📊 Graf · ⬇ Export · + Přidat stavbu." },

              ].filter(({ role }) => {
                  if (role === "all") return true;
                  if (role === "editor") return isEditor || isAdmin || isSuperAdmin;
                  if (role === "admin") return isAdmin || isSuperAdmin;
                  if (role === "superadmin") return isSuperAdmin;
                  return true;
                }).map(({ icon, title, text }) => {
                const emojiRe = /(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu;
                const glowEmoji = (str) => {
                  if (typeof str !== "string") return str;
                  const parts = [];
                  let last = 0, m;
                  emojiRe.lastIndex = 0;
                  while ((m = emojiRe.exec(str)) !== null) {
                    if (m.index > last) parts.push(str.slice(last, m.index));
                    parts.push(<span key={m.index} style={{ filter: "brightness(1.4) saturate(1.3)", display: "inline-block", fontSize: 15 }}>{m[0]}</span>);
                    last = m.index + m[0].length;
                  }
                  if (last < str.length) parts.push(str.slice(last));
                  return parts.length > 1 ? parts : str;
                };
                const glowNode = (node) => {
                  if (typeof node === "string") return glowEmoji(node);
                  if (!node || typeof node !== "object" || !node.props) return node;
                  const kids = node.props.children;
                  const newKids = Array.isArray(kids) ? kids.map(glowNode) : glowNode(kids);
                  return { ...node, props: { ...node.props, children: newKids } };
                };
                return (
                  <div key={title} style={{ marginBottom: 12, paddingBottom: 12, borderBottom: "1px solid rgba(255,255,255,0.06)" }}>
                    <div style={{ fontWeight: 700, marginBottom: 3, color: TENANT.p3 }}><span style={{ filter: "brightness(1.4) saturate(1.3)", display: "inline-block", fontSize: 16 }}>{icon}</span> {title}</div>
                    <div style={{ color: "rgba(255,255,255,0.62)", fontSize: 12 }}>{typeof text === "string" ? glowEmoji(text) : glowNode(text)}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ padding: "11px 22px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(255,255,255,0.02)" }}>
              <button onClick={() => {
                const helpItems = [
                  ["🏗️","Přidání stavby","Klikněte na zelené tlačítko + Přidat stavbu v hlavičce. Vyplňte název stavby (povinný) a ostatní pole dle potřeby. Klávesa Enter přeskočí na další pole. Uložte tlačítkem Uložit — stavba se okamžitě zobrazí v tabulce."],
                  ["✏️","Editace stavby","Klikněte na modré tlačítko ✏️ v levém sloupci u řádku stavby. Otevře se formulář s předvyplněnými hodnotami — změňte co potřebujete a uložte. Všechny změny se automaticky zaznamenají do Historie změn."],
                  ["🗑️","Smazání stavby","Klikněte na červené tlačítko 🗑️ v levém sloupci. Systém požádá o potvrzení — musíte kliknout dvakrát (ochrana proti náhodnému smazání). Smazanou stavbu nelze obnovit."],
                  ["📋","Kopírování stavby","Tlačítko 📋 vedle editace otevře formulář s předvyplněnými daty dané stavby. Číslo stavby dostane příponu (kopie). Po uložení se vytvoří nový samostatný záznam — původní zůstane nezměněn."],
                  ["🕐","Historie změn stavby","Fialové tlačítko 🕐 v levém sloupci otevře historii změn — kdo, kdy a která pole změnil. Červená tečka na ikoně = stavba má záznamy v historii. Admin může záznamy skrýt (✕), superadmin obnovit (↩). Export jako Excel nebo PDF."],
                  ["📜","Log zakázek","Tlačítko 📜 Log v hlavičce (admin+) zobrazí přehled všech akcí na zakázkách. Superadmin vidí přepínač Aktivní / Skryté / Vše. Záznamy se fyzicky nemažou — pouze skrývají."],
                  ["💬","Poznámka ke stavbě","V editačním formuláři najdete fialovou sekci 💬 POZNÁMKA. Ikona 💬 se zobrazí vedle názvu stavby pokud poznámka existuje — najeďte myší pro zobrazení textu."],
                  ["🎨","Barevné řádky","Každá firma má přiřazenou barvu (nastavitelnou v Nastavení). Zelený řádek = stavba má fakturu, částku i datum splatnosti — kompletně vyfakturována."],
                  ["⚠️","Termíny ukončení","Pole Ukončení se zobrazí červeně ⚠️ pokud je termín v minulosti a stavba nemá fakturu. Tlačítko ⚠️ Termíny v hlavičce zobrazí přehled staveb s termínem do 30 dní."],
                  ["🔍","Filtry a vyhledávání","Vyhledávejte podle názvu nebo čísla stavby. Filtrujte podle firmy, objednatele nebo stavbyvedoucího. Tlačítko Filtr▼ otevře rozšířený filtr: rok, rozsah částky, prošlé termíny, fakturace, kategorie. Červené tlačítko = aktivní filtr."],
                  ["📊","Graf nákladů","Tlačítko 📊 Graf otevře interaktivní sloupcový graf. Tři přepínače: Firma, Měsíc, Kat. I / II. Graf vždy odráží aktuální filtr."],
                  ["📤","Export dat","CSV, Excel, Barevný Excel, PDF. Vše pracuje s aktuálním filtrem. Exportovat lze i log aktivit (admin+)."],
                  ["💾","Záloha a import","Tlačítko 💾 Záloha (superadmin) stáhne zálohu celé DB jako JSON — stavby + číselníky + uživatelé + logy. Automatická záloha se spustí při prvním přihlášení superadmina každý den. Při odhlášení lze zálohu stáhnout tlačítkem 💾 Zálohovat a odhlásit (admin+). Import JSON (superadmin) obnoví celou DB ze zálohy — pozor, smaže stávající data."],
                  ["💡","Složka zakázky","Tlačítko 💡 v levém sloupci tabulky. Šedá = složka není nastavena (klik → popup pro zadání cesty). Žlutá = složka je nastavena (klik → otevře složku nebo zkopíruje cestu). Cesta lze zadat i v editaci stavby (sekce OSTATNÍ). Formát: U:\\Složka\\... nebo \\\\server\\zakazky\\... Pro přímé otevření složek je nutné nainstalovat Chrome/Opera rozšíření — viz Nastavení → Aplikace → 💡 TLAČÍTKO SLOŽKA."],
                  ["↔️","Šířky a pořadí sloupců","Superadmin: Táhněte ⟺ pro změnu šířky, ⠿ v záhlaví pro změnu pořadí sloupců. Ukládá se automaticky. Reset v Nastavení → Aplikace."],
                  ["⚙️","Nastavení — číselníky","Firmy (název + barva), objednatelé, stavbyvedoucí. Pořadí lze měnit tažením za ⠿ vlevo od položky. Pořadí firem se projeví v kartách nahoře i ve filtru."],
                  ["👥","Nastavení — uživatelé","Admin spravuje uživatele: přidání, změna hesla a role. Role: USER (čtení), USER EDITOR (editace), ADMIN (plný přístup), SUPERADMIN (+ nastavení aplikace)."],
                  ["🪟","Plovoucí okna","Všechna okna jsou plovoucí — přetáhněte je za záhlaví kamkoliv na plochu. Po zavření a opětovném otevření se okno vrátí na výchozí pozici uprostřed."],
                  ["🌙","Tmavý / světlý režim","Přepínejte mezi 🌞 světlým a 🌙 tmavým režimem pomocí tlačítek v hlavičce. Posuvník intenzity pozadí se zobrazí automaticky. Tlačítko 💎 aktivuje Liquid Glass efekt (průsvitné panely ve stylu iOS). Vše se ukládá v prohlížeči."],
                  ["⏱️","Automatické odhlášení","Aplikace se odhlásí po 15 minutách nečinnosti. Před odhlášením zobrazí varování s odpočítáváním 60 sekund — klikněte Jsem tady pro pokračování."],
                  ["📱","Mobilní zobrazení","Na mobilu (šířka < 768px) se automaticky zobrazí kartičky místo tabulky. Tlačítko ▦/☰ přepíná mezi kartičkami a tabulkou. Hamburger menu ☰ v pravém rohu obsahuje Nastavení, Nápovědu, Log a Odhlásit."],
                ];
                const rows = helpItems.map(([icon, title, text]) => `
                  <div class="item">
                    <div class="item-title">${icon} ${title}</div>
                    <div class="item-text">${text}</div>
                  </div>`).join("");
                const w = window.open("", "_blank");
                w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Nápověda — ${TENANT.nazev}</title><style>
                  @page { size: A4; margin: 12mm; }
                  body { font-family: Arial, sans-serif; font-size: 11px; color: #1e293b; background: #fff; }
                  h1 { font-size: 16px; margin: 0 0 4px; color: #1e293b; }
                  .subtitle { color: #64748b; font-size: 10px; margin-bottom: 14px; }
                  .item { margin-bottom: 10px; padding-bottom: 10px; border-bottom: 1px solid #e2e8f0; break-inside: avoid; }
                  .item-title { font-weight: 700; font-size: 12px; color: ${TENANT.p1deep}; margin-bottom: 3px; }
                  .item-text { color: #1e293b; font-size: 11px; line-height: 1.6; }
                  @media print { button { display: none; } }
                </style></head><body>
                <h1>❓ Nápověda — ${TENANT.nazev}</h1>
                <div class="subtitle">Vygenerováno: ${new Date().toLocaleDateString("cs-CZ")}</div>
                ${rows}
                <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
                </body></html>`);
                w.document.close();
              }} style={{ padding: "8px 16px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.12)", borderRadius: 8, color: "rgba(255,255,255,0.7)", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🖨️ Tisk nápovědy</button>
              <button onClick={() => setShowHelp(false)} style={{ padding: "8px 20px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Zavřít</button>
            </div>
          </div>
        </div>
      )}

      {/* TOOLTIP */}
      {tooltip.visible && (
        <div style={{ position: "fixed", left: tooltip.x, top: tooltip.y, background: "rgba(15,23,42,0.95)", color: "#e2e8f0", fontSize: 12, padding: "5px 10px", borderRadius: 6, pointerEvents: "none", zIndex: 9999, whiteSpace: "nowrap", border: "1px solid rgba(255,255,255,0.12)", boxShadow: "0 4px 16px rgba(0,0,0,0.4)" }}>
          {tooltip.text}
        </div>
      )}

      {/* LOGOUT CONFIRM */}
      {showLogoutConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: isDark ? TENANT.modalBg : "#fff", borderRadius: 14, padding: "28px 32px", width: 360, textAlign: "center", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>👋</div>
            <div style={{ color: isDark ? "#fff" : "#1e293b", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Odhlásit se?</div>
            <div style={{ color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.5)", fontSize: 13, marginBottom: 22 }}>Budete přesměrováni na přihlašovací obrazovku.</div>
            {isAdmin && !isDemo && (
              <div style={{ marginBottom: 14, padding: "10px 14px", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.25)", borderRadius: 8, fontSize: 12, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)" }}>
                💾 Chcete před odhlášením stáhnout zálohu databáze?
              </div>
            )}
            <div style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => setShowLogoutConfirm(false)} style={{ padding: "9px 16px", background: isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.12)"}`, borderRadius: 8, color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
              {isAdmin && !isDemo && (
                <button onClick={async () => { await zalohaJSON(); setShowLogoutConfirm(false); setUser(null); }} style={{ padding: "9px 16px", background: "linear-gradient(135deg,#059669,#047857)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>💾 Zálohovat a odhlásit</button>
              )}
              <button onClick={() => { setShowLogoutConfirm(false); setUser(null); }} style={{ padding: "9px 16px", background: "linear-gradient(135deg,#ef4444,#dc2626)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Odhlásit se</button>
            </div>
          </div>
        </div>
      )}

      {/* POTVRZOVACÍ DIALOG */}
      {confirmExport && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1300, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
          <div style={{ background: isDark ? TENANT.modalBg : "#fff", borderRadius: 14, padding: "28px 32px", width: 380, border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>📤</div>
            <div style={{ color: isDark ? "#f8fafc" : "#1e293b", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Exportovat data?</div>
            <div style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 13, marginBottom: 24 }}>Bude exportováno <strong>{filtered.length} záznamů</strong> jako <strong>{confirmExport.label}</strong>{confirmExport.type === "xls-color" ? <><br/><span style={{ fontSize: 13, color: "#f97316", marginTop: 8, display: "block", fontWeight: 600 }}>⚠️ Excel zobrazí varování o formátu – klikněte <strong>Ano</strong> pro otevření.</span></> : ""}</div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmExport(null)} style={{ padding: "9px 22px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, color: isDark ? "#fff" : "#1e293b", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
              <button onClick={() => {
                const t = confirmExport.type;
                setConfirmExport(null);
                if (t === "xls-color") { doExportXLSColor(); }
                else { setExportPreview({ type: t }); }
              }} style={{ padding: "9px 22px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>✅ Ano, exportovat</button>
            </div>
          </div>
        </div>
      )}

      {/* EXPORT PREVIEW - sdílená tabulka pro CSV a XLS */}
      {(exportPreview?.type === "csv" || exportPreview?.type === "xls") && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
          <div style={{ background: TENANT.modalBg, borderRadius: 16, width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 16 }}>
                {exportPreview.type === "csv" ? "📄 Export CSV" : "📊 Export Excel"}
              </h3>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
                <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12 }}>{filtered.length} řádků</span>
                <button
                  onClick={() => {
                    const ts = new Date().toISOString().slice(0,16).replace("T","_").replace(":","-");
                    const ws_data = [COLUMNS.map(c => c.label), ...filtered.map(r => COLUMNS.map(c => r[c.key] ?? ""))];
                    if (exportPreview.type === "xls") {
                      const wb = XLSX.utils.book_new();
                      const ws = XLSX.utils.aoa_to_sheet(ws_data);
                      ws["!cols"] = COLUMNS.map(c => ({ wch: Math.max(c.label.length, 14) }));
                      XLSX.utils.book_append_sheet(wb, ws, "Stavby");
                      XLSX.writeFile(wb, `stavby_znojmo_${ts}.xlsx`);
                    } else {
                      const BOM = "\uFEFF";
                      const h = COLUMNS.map(c => `"${c.label}"`).join(";");
                      const rows = filtered.map(r => COLUMNS.map(c => `"${String(r[c.key] ?? "").replace(/"/g, '""')}"`).join(";")).join("\n");
                      const blob = new Blob([BOM + h + "\n" + rows], { type: "text/csv;charset=utf-8;" });
                      const url = URL.createObjectURL(blob);
                      const a = document.createElement("a"); a.href = url; a.download = `stavby_znojmo_${ts}.csv`;
                      document.body.appendChild(a); a.click(); document.body.removeChild(a); URL.revokeObjectURL(url);
                    }
                  }}
                  style={{ padding: "7px 16px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>
                  ⬇ Stáhnout {exportPreview.type === "xls" ? ".xlsx" : ".csv"}
                </button>
                <button onClick={() => setExportPreview(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#fff" }}>
              <div style={{ fontFamily: "Arial,sans-serif", fontSize: 10, color: "#111" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: TENANT.p1deep }}>{TENANT.nazev}</div>
                  <div style={{ fontSize: 10, color: "#666" }}>{TENANT.kategorie} | Export: {new Date().toLocaleDateString("cs-CZ")} | Záznamů: {filtered.length}</div>
                </div>
                <table style={{ borderCollapse: "collapse", width: "100%", fontSize: 9 }}>
                  <thead>
                    <tr style={{ background: TENANT.p1deep }}>
                      {COLUMNS.map(c => <th key={c.key} style={{ color: "#fff", padding: "4px 6px", textAlign: c.key === "id" ? "center" : c.type === "number" ? "right" : "left", whiteSpace: "nowrap", border: `1px solid ${TENANT.p1}`, fontSize: 8 }}>{c.label}</th>)}
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((row, i) => (
                      <tr key={row.id} style={{ background: i % 2 === 0 ? (row.firma === "DUR plus" ? "#eff6ff" : "#fefce8") : "#fff" }}>
                        {COLUMNS.map(c => {
                          const v = row[c.key] ?? "";
                          const isNum = c.type === "number" && v !== "" && Number(v) !== 0;
                          const display = isNum ? Number(v).toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v;
                          const color = c.key === "rozdil" ? (Number(v) >= 0 ? "#166534" : "#991b1b") : "#111";
                          return <td key={c.key} style={{ padding: "3px 6px", border: "1px solid #e2e8f0", whiteSpace: "nowrap", textAlign: c.key === "id" ? "center" : c.type === "number" ? "right" : "left", color, fontSize: 9 }}>{display}</td>;
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {exportPreview?.type === "pdf" && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1200, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
          <div style={{ background: TENANT.modalBg, borderRadius: 16, width: "95vw", maxHeight: "90vh", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.1)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
            <div style={{ padding: "16px 24px", borderBottom: "1px solid rgba(255,255,255,0.08)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <h3 style={{ color: "#fff", margin: 0, fontSize: 16 }}>🖨️ Náhled pro tisk / PDF</h3>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => {
                  const rows = filtered.map((row, i) => {
                    const hex = firmaColorMapCache[row.firma] || TENANT.p2;
                    const rgb = hexToRgb(hex);
                    const bg = i%2===0 ? `rgba(${rgb},0.18)` : `rgba(${rgb},0.07)`;
                    return `<tr>${COLUMNS.map(c => {
                      const v = row[c.key] ?? "";
                      const isNum = c.type === "number" && v !== "" && Number(v) !== 0;
                      const display = isNum ? Number(v).toLocaleString("cs-CZ",{minimumFractionDigits:2,maximumFractionDigits:2}) : v;
                      const color = c.key === "rozdil" ? (Number(v)>=0?"#166534":"#991b1b") : "#111";
                      const cellBg = c.key === "firma" ? hex : bg;
                      const cellColor = c.key === "firma" ? "#fff" : color;
                      const cellWeight = c.key === "firma" ? "700" : "400";
                      return `<td style="padding:3px 6px;border:1px solid #e2e8f0;white-space:nowrap;text-align:${c.key==="id"?"center":c.type==="number"?"right":"left"};color:${cellColor};background:${cellBg};font-size:8px;font-weight:${cellWeight}">${display}</td>`;
                    }).join("")}</tr>`;
                  }).join("");
                  const headers = COLUMNS.map(c => `<th style="color:#fff;padding:4px 6px;text-align:${c.key==="id"?"center":c.type==="number"?"right":"left"};white-space:nowrap;border:1px solid ${TENANT.p1};font-size:8px">${c.label}</th>`).join("");
                  const win = window.open("","_blank");
                  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${TENANT.nazev} – tisk</title>
                  <style>
                    @page { size: A4 landscape; margin: 10mm; }
                    body { font-family: Arial, sans-serif; font-size: 9px; color: #111; margin: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    table { border-collapse: collapse; width: 100%; }
                    thead tr { background: ${TENANT.p1deep}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    td, th { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    h2 { font-size: 13px; margin: 0 0 2px; }
                    .sub { font-size: 9px; color: #666; margin-bottom: 8px; }
                  </style></head><body>
                  <h2>${TENANT.nazev}</h2>
                  <div class="sub">${TENANT.kategorie} | Tisk: ${new Date().toLocaleDateString("cs-CZ")} | Záznamů: ${filtered.length}</div>
                  <table><thead><tr>${headers}</tr></thead><tbody>${rows}</tbody></table>
                  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()};}<\/script>
                  </body></html>`);
                  win.document.close();
                }} style={{ padding: "7px 16px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🖨️ Tisk / Uložit jako PDF</button>
                <button onClick={() => setExportPreview(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>
            </div>
            <div style={{ flex: 1, overflowY: "auto", padding: 24, background: "#fff" }}>
              <div style={{ fontFamily: "Arial,sans-serif", fontSize: 10, color: "#111" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 10 }}>
                  <div style={{ fontWeight: 800, fontSize: 16, color: TENANT.p1deep }}>{TENANT.nazev}</div>
                  <div style={{ fontSize: 10, color: "#666" }}>{TENANT.kategorie} | Export: {new Date().toLocaleDateString("cs-CZ")} | Záznamů: {filtered.length}</div>
                </div>
                <div style={{ overflowX: "auto" }}>
                  <table style={{ borderCollapse: "collapse", fontSize: 9 }}>
                    <thead>
                      <tr style={{ background: TENANT.p1deep }}>
                        {COLUMNS.map(c => <th key={c.key} style={{ color: "#fff", padding: "4px 6px", textAlign: c.key === "id" ? "center" : c.type === "number" ? "right" : "left", whiteSpace: "nowrap", border: `1px solid ${TENANT.p1}`, fontSize: 8 }}>{c.label}</th>)}
                      </tr>
                    </thead>
                    <tbody>
                      {filtered.map((row, i) => {
                        const hex = firmaColorMapCache[row.firma] || TENANT.p2;
                        const rgb = hexToRgb(hex);
                        const bg = i % 2 === 0 ? `rgba(${rgb},0.18)` : `rgba(${rgb},0.07)`;
                        return (
                          <tr key={row.id}>
                            {COLUMNS.map(c => {
                              const v = row[c.key] ?? "";
                              const isNum = c.type === "number" && v !== "" && Number(v) !== 0;
                              const display = isNum ? Number(v).toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : v;
                              const color = c.key === "rozdil" ? (Number(v) >= 0 ? "#166534" : "#991b1b") : "#111";
                              const cellBg = c.key === "firma" ? hex : bg;
                              const cellColor = c.key === "firma" ? "#fff" : color;
                              return <td key={c.key} style={{ padding: "3px 6px", border: "1px solid #e2e8f0", whiteSpace: "nowrap", textAlign: c.key === "id" ? "center" : c.type === "number" ? "right" : "left", color: cellColor, background: cellBg, fontSize: 9, fontWeight: c.key === "firma" ? 700 : 400 }}>{display}</td>;
                            })}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {adding && <FormModal title="➕ Nová stavba" initial={emptyRow} onSave={handleAdd} onClose={() => setAdding(false)} firmy={firmy.map(f => f.hodnota)} objednatele={objednatele} stavbyvedouci={stavbyvedouci} povinnaPole={povinnaPole} />}
      {editRow && <FormModal title={`✏️ Editace stavby #${editRow.id}`} initial={editRow} onSave={handleSave} onClose={() => setEditRow(null)} firmy={firmy.map(f => f.hodnota)} objednatele={objednatele} stavbyvedouci={stavbyvedouci} povinnaPole={povinnaPole} />}
      {copyRow && <FormModal title="📋 Kopírovat stavbu" initial={copyRow} onSave={handleCopySave} onClose={() => setCopyRow(null)} firmy={firmy.map(f => f.hodnota)} objednatele={objednatele} stavbyvedouci={stavbyvedouci} povinnaPole={povinnaPole} />}
      {showSettings && <SettingsModal firmy={firmy} objednatele={objednatele} stavbyvedouci={stavbyvedouci} users={users} onChange={saveSettings} onChangeUsers={saveUsers} onClose={() => setShowSettings(false)} onLoadLog={loadLog} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} isDark={isDark} appVerze={appVerze} appDatum={appDatum} onSaveAppInfo={saveAppInfo} stavbyData={data} onResetColWidths={() => { setColWidths({}); saveColWidths({}); }} onResetColOrder={resetColOrder} isDemo={isDemo} notifyEmails={notifyEmails} onSaveNotifyEmails={saveNotifyEmails} slozkaRole={slozkaRole} onSaveSlozkaRole={saveSlozkaRole} extensionReady={extensionReady} protokolReady={protokolReady} autoZaloha={autoZaloha} onSaveAutoZaloha={(v) => { setAutoZaloha(v); try { localStorage.setItem("autoZaloha", v ? "true" : "false"); } catch {} }} zalohaRole={zalohaRole} onSaveZalohaRole={saveZalohaRole} onImportXLS={() => importRef.current?.click()} onImportJI={(katPole) => { setImportJIKatPole(katPole); importRefJI.current?.click(); }} autoLogoutMinutesProp={autoLogoutMinutes} onSaveAutoLogoutMinutes={saveAutoLogoutMinutes} appNazevProp={appNazev} onSaveAppNazev={saveAppNazev} deadlineDaysProp={deadlineDays} onSaveDeadlineDays={saveDeadlineDays} demoMaxStavbyProp={demoMaxStavby} onSaveDemoMaxStavby={saveDemoMaxStavby} povinnaPole={povinnaPole} onSavePovinnaPole={savePovinnaPole} prefixEnabled={prefixEnabled} prefixValue={prefixValue} onSaveCisloPrefix={saveCisloPrefix} sloupceRole={sloupceRole} onSaveSloupceRole={saveSloupceRole} />}

      {showOrphanWarning && (() => {
        const firmyNames = firmy.map(f => f.hodnota);
        const orphans = data.filter(s => s.firma && !firmyNames.includes(s.firma));
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 2100, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
            <div style={{ background: isDark ? TENANT.modalBg : "#fff", borderRadius: 16, width: 500, maxHeight: "80vh", display: "flex", flexDirection: "column", border: "1px solid rgba(251,191,36,0.4)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
              <div style={{ padding: "18px 24px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(251,191,36,0.08)", borderRadius: "16px 16px 0 0" }}>
                <h3 style={{ color: "#fbbf24", margin: 0, fontSize: 17 }}>🏚️ Stavby bez firmy</h3>
                <button onClick={() => setShowOrphanWarning(false)} style={{ background: "none", border: "none", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontSize: 20, cursor: "pointer" }}>✕</button>
              </div>
              <div style={{ padding: "16px 24px", overflowY: "auto" }}>
                <p style={{ color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontSize: 13, marginTop: 0 }}>
                  Následující stavby mají přiřazenou firmu která již neexistuje v číselníku:
                </p>
                {orphans.map(s => (
                  <div key={s.id} style={{ padding: "8px 12px", marginBottom: 6, background: isDark ? "rgba(251,191,36,0.08)" : "rgba(251,191,36,0.1)", borderRadius: 8, border: "1px solid rgba(251,191,36,0.2)", display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: isDark ? "#e2e8f0" : "#1e293b", fontSize: 13, fontWeight: 600 }}>{s.nazev_stavby || `Stavba #${s.id}`}</span>
                    <span style={{ color: "#fbbf24", fontSize: 12 }}>{s.firma}</span>
                  </div>
                ))}
              </div>
              <div style={{ padding: "14px 24px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, display: "flex", justifyContent: "flex-end" }}>
                <button onClick={() => {
                  const rows = orphans.map((s, i) => {
                    const rowBg = i % 2 === 0 ? "#fefce8" : "#ffffff";
                    return `<tr>
                      <td style="background:${rowBg}">${s.cislo_stavby || ""}</td>
                      <td style="background:${rowBg};font-weight:600">${s.nazev_stavby || ""}</td>
                      <td style="background:#fef3c7;color:#92400e;font-weight:700;text-align:center">${s.firma || ""}</td>
                      <td style="background:${rowBg}">${s.objednatel || ""}</td>
                      <td style="background:${rowBg}">${s.stavbyvedouci || ""}</td>
                    </tr>`;
                  }).join("");
                  const w = window.open("", "_blank");
                  w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Stavby bez firmy</title>
                  <style>
                    @page { size: A4 landscape; margin: 10mm; }
                    body { font-family: Arial,sans-serif; padding: 0; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    h2 { margin: 0 0 4px; font-size: 15px; }
                    p { margin: 0 0 12px; color: #64748b; font-size: 11px; }
                    table { width: 100%; border-collapse: collapse; font-size: 11px; }
                    th { background: ${TENANT.p1deep}; color: #fff; padding: 7px 10px; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    td { padding: 6px 10px; border: 1px solid #e2e8f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                    @media print { button { display: none; } }
                  </style>
                  </head><body>
                  <h2>🏚️ ${TENANT.nazev} – Stavby bez firmy</h2>
                  <p>Vygenerováno: ${new Date().toLocaleDateString("cs-CZ")} &nbsp;|&nbsp; Celkem ${orphans.length} staveb bez přiřazené firmy</p>
                  <table><thead><tr><th>Č. stavby</th><th>Název stavby</th><th>Původní firma</th><th>Objednatel</th><th>Stavbyvedoucí</th></tr></thead>
                  <tbody>${rows}</tbody></table>
                  <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
                  </body></html>`);
                  w.document.close();
                }} style={{ padding: "9px 22px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🖨️ Tisk / PDF</button>
                <button onClick={() => setShowOrphanWarning(false)} style={{ padding: "9px 22px", background: "linear-gradient(135deg,#d97706,#b45309)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Rozumím</button>
              </div>
            </div>
          </div>
        );
      })()}

      {showDeadlines && deadlineWarnings.length > 0 && (
        <div style={{ position: "fixed", inset: 0, zIndex: 2000, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
          <div style={{ position: "fixed", left: deadlinesPos.x, top: deadlinesPos.y, pointerEvents: "all", background: isDark ? TENANT.modalBg : "#fff", borderRadius: 16, width: "min(820px, 96vw)", maxHeight: "88vh", display: "flex", flexDirection: "column", border: "1px solid rgba(239,68,68,0.4)", boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>
            {/* header — táhlo */}
            <div onMouseDown={onDeadlinesDragStart} style={{ padding: "14px 18px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, display: "flex", justifyContent: "space-between", alignItems: "center", background: "rgba(239,68,68,0.1)", borderRadius: "16px 16px 0 0", gap: 10, cursor: "grab", userSelect: "none" }}>
              <div style={{ minWidth: 0 }}>
                <span style={{ color: "#f87171", fontWeight: 700, fontSize: 15 }}>⚠️ Termíny ukončení{dragHint}</span>
                <div style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)", fontSize: 11, marginTop: 3 }}>
                  {deadlineWarnings.filter(w => w.dniDo < 0).length > 0 && <span style={{ color: "#f87171", fontWeight: 700 }}>{deadlineWarnings.filter(w => w.dniDo < 0).length} prošlých</span>}
                  {deadlineWarnings.filter(w => w.dniDo < 0).length > 0 && deadlineWarnings.filter(w => w.dniDo >= 0).length > 0 && " · "}
                  {deadlineWarnings.filter(w => w.dniDo >= 0).length > 0 && <span>{deadlineWarnings.filter(w => w.dniDo >= 0).length} blížících se (do {deadlineDays} dní)</span>}
                </div>
              </div>
              <button onClick={() => setShowDeadlines(false)} onMouseDown={e => e.stopPropagation()} style={{ background: "none", border: "none", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontSize: 22, cursor: "pointer", flexShrink: 0, padding: "0 4px" }}>✕</button>
            </div>
            {/* tabulka */}
            <div style={{ overflowX: "auto", overflowY: "auto", flex: 1, padding: isMobile ? "12px" : 24 }} id="deadline-print-area">
              <div style={{ marginBottom: 16, display: "none" }} className="print-header">
                <div style={{ fontWeight: 800, fontSize: 18 }}>{TENANT.nazev} – Blížící se termíny</div>
                <div style={{ fontSize: 12, color: "#64748b" }}>Vygenerováno: {new Date().toLocaleDateString("cs-CZ")} | Zakázky s termínem do 30 pracovních dní</div>
                <hr style={{ margin: "8px 0" }} />
              </div>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: isDark ? TENANT.p1deep : "#e2e8f0" }}>
                    {["Č. stavby","Název stavby","Termín ukončení","Dní do termínu","Objednatel","Stavbyvedoucí"].map(h => (
                      <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: isDark ? "rgba(255,255,255,0.6)" : "rgba(0,0,0,0.6)", fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, whiteSpace: "nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {deadlineWarnings.map((r, i) => {
                    const isOverdue = r.dniDo < 0;
                    const urgentColor = isOverdue ? "#f87171" : r.dniDo <= 5 ? "#f87171" : r.dniDo <= 15 ? "#fb923c" : "#facc15";
                    const dniLabel = isOverdue ? `${Math.abs(r.dniDo)} dní po termínu` : `${r.dniDo} dní`;
                    return (
                      <tr key={r.id} style={{ background: isOverdue ? (isDark ? "rgba(239,68,68,0.08)" : "rgba(239,68,68,0.05)") : i % 2 === 0 ? (isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)") : "transparent" }}>
                        <td style={{ padding: "8px 12px", color: isDark ? "#e2e8f0" : "#1e293b", fontWeight: 600, whiteSpace: "nowrap", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>{r.cislo_stavby}</td>
                        <td style={{ padding: "8px 12px", color: isDark ? "#e2e8f0" : "#1e293b", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>{r.nazev_stavby}</td>
                        <td style={{ padding: "8px 12px", color: isOverdue ? "#f87171" : (isDark ? "#e2e8f0" : "#1e293b"), fontWeight: isOverdue ? 700 : 400, whiteSpace: "nowrap", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>{r.ukonceni}</td>
                        <td style={{ padding: "8px 12px", whiteSpace: "nowrap", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>
                          <span style={{ background: urgentColor + "22", color: urgentColor, border: `1px solid ${urgentColor}44`, borderRadius: 5, padding: "2px 8px", fontSize: 12, fontWeight: 700 }}>{dniLabel}</span>
                        </td>
                        <td style={{ padding: "8px 12px", color: isDark ? "#e2e8f0" : "#1e293b", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>{r.objednatel}</td>
                        <td style={{ padding: "8px 12px", color: isDark ? "#e2e8f0" : "#1e293b", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"}` }}>{r.stavbyvedouci}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {/* footer */}
            <div style={{ padding: "12px 18px", borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, display: "flex", gap: 8, justifyContent: "flex-end", flexWrap: "wrap" }}>
              <button onClick={() => {
                const firmaColorMap = Object.fromEntries(firmy.map(f => [f.hodnota, f.barva || TENANT.p2]));
                const rows = deadlineWarnings.map((r, i) => {
                  const urgentColor = r.dniDo <= 5 ? "#dc2626" : r.dniDo <= 15 ? "#ea580c" : "#ca8a04";
                  const urgentBg = r.dniDo <= 5 ? "#fee2e2" : r.dniDo <= 15 ? "#ffedd5" : "#fef9c3";
                  const firmaBg = firmaColorMap[r.firma] || TENANT.p2;
                  const rowBg = i % 2 === 0 ? "#f8fafc" : "#ffffff";
                  return `<tr>
                    <td style="background:${rowBg}">${r.cislo_stavby || ""}</td>
                    <td style="background:${rowBg};font-weight:600">${r.nazev_stavby || ""}</td>
                    <td style="background:${firmaBg};color:#fff;font-weight:700;text-align:center">${r.firma || ""}</td>
                    <td style="background:${rowBg}">${r.ukonceni || ""}</td>
                    <td style="background:${urgentBg};color:${urgentColor};font-weight:700;text-align:center">${r.dniDo} dní</td>
                    <td style="background:${rowBg}">${r.objednatel || ""}</td>
                    <td style="background:${rowBg}">${r.stavbyvedouci || ""}</td>
                  </tr>`;
                }).join("");
                const w = window.open("", "_blank");
                w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Blížící se termíny</title>
                <style>
                  @page { size: A4 landscape; margin: 10mm; }
                  body { font-family: Arial,sans-serif; padding: 0; color: #1e293b; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  h2 { margin: 0 0 4px; font-size: 15px; }
                  p { margin: 0 0 12px; color: #64748b; font-size: 11px; }
                  table { width: 100%; border-collapse: collapse; font-size: 11px; }
                  th { background: ${TENANT.p1deep}; color: #fff; padding: 7px 10px; text-align: left; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  td { padding: 6px 10px; border: 1px solid #e2e8f0; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                  @media print { button { display: none; } }
                </style>
                </head><body>
                <h2>⚠️ ${TENANT.nazev} – Blížící se termíny ukončení</h2>
                <p>Vygenerováno: ${new Date().toLocaleDateString("cs-CZ")} &nbsp;|&nbsp; Zakázky s termínem do 30 pracovních dní (${deadlineWarnings.length} zakázek)</p>
                <table><thead><tr><th>Č. stavby</th><th>Název stavby</th><th>Firma</th><th>Termín ukončení</th><th>Dní do termínu</th><th>Objednatel</th><th>Stavbyvedoucí</th></tr></thead>
                <tbody>${rows}</tbody></table>
                <script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script>
                </body></html>`);
                w.document.close();
              }} style={{ padding: "9px 18px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>🖨️ Tisk / PDF</button>
              <button onClick={() => setShowDeadlines(false)} style={{ padding: "9px 18px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, color: isDark ? "#fff" : "#1e293b", cursor: "pointer", fontSize: 13 }}>Zavřít</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: TENANT.modalBg, borderRadius: 14, padding: 28, width: 360, border: "1px solid rgba(255,255,255,0.1)", textAlign: "center" }}>
            <div style={{ fontSize: 32, marginBottom: 12 }}>{deleteConfirm.step === 2 ? "🚨" : "⚠️"}</div>
            <h3 style={{ color: "#fff", margin: "0 0 8px" }}>{deleteConfirm.step === 2 ? "Opravdu smazat?" : "Smazat záznam?"}</h3>
            <p style={{ color: "rgba(255,255,255,0.4)", margin: "0 0 6px", fontSize: 13 }}>
              {deleteConfirm.step === 2
                ? <><span style={{ color: "#f87171", fontWeight: 700 }}>Toto je poslední varování.</span><br />Záznam bude trvale odstraněn.</>
                : "Chystáš se smazat tento záznam."}
            </p>
            <p style={{ color: "rgba(255,255,255,0.25)", margin: "0 0 22px", fontSize: 12 }}>
              {deleteConfirm.step === 2 ? "Krok 2 z 2 – akce je nevratná." : "Krok 1 z 2 – pokračuj pro potvrzení."}
            </p>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setDeleteConfirm(null)} style={{ padding: "9px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer" }}>Zrušit</button>
              {deleteConfirm.step === 1
                ? <button onClick={() => setDeleteConfirm({ id: deleteConfirm.id, step: 2 })} style={{ padding: "9px 18px", background: "linear-gradient(135deg,#d97706,#b45309)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Ano, smazat</button>
                : <button onClick={() => handleDelete(deleteConfirm.id)} style={{ padding: "9px 18px", background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 600 }}>Potvrdit smazání</button>
              }
            </div>
          </div>
        </div>
      )}

      {/* ROZŠÍŘENÝ FILTR — plovoucí overlay */}
      {showAdvFilter && (
        <div style={{ position: "fixed", left: advFilterPos.x, top: advFilterPos.y, zIndex: 500, background: isDark ? TENANT.modalBg : "#fff", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)"}`, borderRadius: 12, boxShadow: "0 8px 32px rgba(0,0,0,0.35)", width: 340, fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
          <div onMouseDown={onAdvFilterDragStart} style={{ padding: "10px 16px", borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, display: "flex", justifyContent: "space-between", alignItems: "center", cursor: "grab", userSelect: "none", borderRadius: "12px 12px 0 0", background: isDark ? tc1(0.15) : tc1(0.08) }}>
            <span style={{ color: isDark ? TENANT.p3 : TENANT.p1, fontWeight: 700, fontSize: 13 }}>🔍 Rozšířený filtr</span>
            <button onClick={() => setShowAdvFilter(false)} onMouseDown={e => e.stopPropagation()} style={{ background: "none", border: "none", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", fontSize: 16, cursor: "pointer", lineHeight: 1, padding: 0 }}>✕</button>
          </div>
          <div style={{ padding: "14px 16px", display: "flex", flexDirection: "column", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 12, width: 100, flexShrink: 0 }}>Rok:</span>
              <input value={filterRok} onChange={e => setFilterRok(e.target.value)} placeholder="např. 2025" style={{ ...inputSx, flex: 1, background: isDark ? TENANT.inputBg : "#f8fafc", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, color: isDark ? "#fff" : "#1e293b", padding: "7px 10px" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 12, width: 100, flexShrink: 0 }}>Nab. cena od:</span>
              <input value={filterCastkaOd} onChange={e => setFilterCastkaOd(e.target.value)} placeholder="0" type="number" style={{ ...inputSx, flex: 1, background: isDark ? TENANT.inputBg : "#f8fafc", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, color: isDark ? "#fff" : "#1e293b", padding: "7px 10px" }} />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 12, width: 100, flexShrink: 0 }}>Nab. cena do:</span>
              <input value={filterCastkaDo} onChange={e => setFilterCastkaDo(e.target.value)} placeholder="∞" type="number" style={{ ...inputSx, flex: 1, background: isDark ? TENANT.inputBg : "#f8fafc", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, color: isDark ? "#fff" : "#1e293b", padding: "7px 10px" }} />
            </div>
            <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
              <input type="checkbox" checked={filterProslé} onChange={e => setFilterProslé(e.target.checked)} style={{ width: 15, height: 15, cursor: "pointer", accentColor: "#ef4444", flexShrink: 0 }} />
              <span style={{ color: isDark ? "#e2e8f0" : "#1e293b", fontSize: 13 }}>⚠️ Jen prošlé termíny bez faktury</span>
            </label>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 12, width: 100, flexShrink: 0 }}>Fakturace:</span>
              <select value={filterFakturace} onChange={e => setFilterFakturace(e.target.value)} style={{ ...inputSx, flex: 1, background: isDark ? TENANT.inputBg : "#f8fafc", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, color: isDark ? "#fff" : "#1e293b", padding: "7px 10px" }}>
                <option value="">Vše</option>
                <option value="ano">✅ Vyfakturováno</option>
                <option value="ne">❌ Nevyfakturováno</option>
              </select>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 12, width: 100, flexShrink: 0 }}>Kategorie:</span>
              <select value={filterKat} onChange={e => setFilterKat(e.target.value)} style={{ ...inputSx, flex: 1, background: isDark ? TENANT.inputBg : "#f8fafc", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, color: isDark ? "#fff" : "#1e293b", padding: "7px 10px" }}>
                <option value="">Vše</option>
                <option value="I">Kategorie I</option>
                <option value="II">Kategorie II</option>
              </select>
            </div>
            {(filterRok || filterCastkaOd || filterCastkaDo || filterProslé || filterFakturace || filterKat) && (
              <div style={{ paddingTop: 8, borderTop: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>
                <button onClick={() => { setFilterRok(""); setFilterCastkaOd(""); setFilterCastkaDo(""); setFilterProslé(false); setFilterFakturace(""); setFilterKat(""); }} style={{ padding: "6px 14px", background: "rgba(239,68,68,0.15)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 12, width: "100%" }}>✕ Vymazat rozšířené filtry</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* LOG MODAL */}
      {showLog && <LogModal isDark={isDark} firmy={firmy} onClose={() => setShowLog(false)} isDemo={isDemo} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} />}

      {/* HISTORIE MODAL */}
      {historieRow && <HistorieModal row={historieRow} isDark={isDark} onClose={() => setHistorieRow(null)} isDemo={isDemo} isAdmin={isAdmin} isSuperAdmin={isSuperAdmin} onAllHidden={(rowId) => setHistorieNovinky(prev => { const n = {...prev}; delete n[String(rowId)]; return n; })} onPrecteno={async (rowId) => { if (isDemo) return; try { const sid = String(rowId); const updated = { ...logPrecteno, [sid]: new Date().toISOString() }; await sbUpsertNastaveni("log_precteno", JSON.stringify(updated)); setLogPrecteno(updated); setHistorieNovinky(prev => { const n = { ...prev }; delete n[sid]; return n; }); } catch {} }} />}

      {/* GRAF MODAL */}
      {showGraf && <GrafModal data={filtered} firmy={firmy} isDark={isDark} onClose={() => setShowGraf(false)} />}

      {/* POPUP — zadání cesty ke složce */}
      {slozkaPopup && (
        <div style={{ position: "fixed", inset: 0, zIndex: 8000, pointerEvents: "none" }} onClick={() => setSlozkaPopup(null)}>
          <div
            style={{ position: "fixed", left: Math.min(slozkaPopup.x, window.innerWidth - 380), top: slozkaPopup.y, width: 370, background: isDark ? TENANT.modalBg : "#fff", border: "1px solid rgba(251,191,36,0.5)", borderRadius: 10, boxShadow: "0 8px 32px rgba(0,0,0,0.4)", padding: "12px 14px", pointerEvents: "all", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 12, marginBottom: 8 }}>💡 Cesta ke složce zakázky</div>
            <input
              autoFocus
              type="text"
              value={slozkaPopup.url}
              onChange={e => setSlozkaPopup(p => ({ ...p, url: e.target.value }))}
              placeholder="U:\Dočekal\2025\ZN-001 nebo \\server\..."
              style={{ width: "100%", padding: "8px 10px", background: isDark ? TENANT.inputBg : "#f8fafc", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 7, color: isDark ? "#fff" : "#1e293b", fontSize: 12, outline: "none", boxSizing: "border-box", marginBottom: 8 }}
              onKeyDown={async e => {
                if (e.key === "Enter") {
                  const url = slozkaPopup.url.trim();
                  if (!url) { setSlozkaPopup(null); return; }
                  if (!isDemo) await sb(`stavby?id=eq.${slozkaPopup.id}`, { method: "PATCH", body: JSON.stringify({ slozka_url: url }), prefer: "return=minimal" });
                  setData(prev => prev.map(r => r.id === slozkaPopup.id ? { ...r, slozka_url: url } : r));
                  setSlozkaPopup(null);
                  showToast("Cesta ke složce uložena ✅", "ok");
                }
                if (e.key === "Escape") setSlozkaPopup(null);
              }}
            />
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
              <button onClick={() => setSlozkaPopup(null)} style={{ padding: "6px 12px", background: "transparent", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 6, color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", cursor: "pointer", fontSize: 12 }}>Zrušit</button>
              <button onClick={async () => {
                const url = slozkaPopup.url.trim();
                if (!url) { setSlozkaPopup(null); return; }
                if (!isDemo) await sb(`stavby?id=eq.${slozkaPopup.id}`, { method: "PATCH", body: JSON.stringify({ slozka_url: url }), prefer: "return=minimal" });
                setData(prev => prev.map(r => r.id === slozkaPopup.id ? { ...r, slozka_url: url } : r));
                setSlozkaPopup(null);
                showToast("Cesta ke složce uložena ✅", "ok");
              }} style={{ padding: "6px 14px", background: "linear-gradient(135deg,#d97706,#b45309)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💾 Uložit</button>
            </div>
            <div style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.3)", fontSize: 10, marginTop: 6 }}>Enter = uložit · Esc = zrušit</div>
          </div>
        </div>
      )}

      {/* IMPORT XLS — POTVRZOVACÍ DIALOG */}
      {importXLSConfirm && (() => {
        const { file, stavbyVDB } = importXLSConfirm;
        const prostrediAktualni = (typeof window !== "undefined" && (window.location.hostname.includes("staging") || window.location.hostname.includes("preview") || window.location.hostname === "localhost")) ? "STAGING" : "PRODUKCE";
        const confirmed = importXLSConfirmText.trim().toUpperCase() === "POTVRDIT";
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9100, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
            <div style={{ background: TENANT.modalBg, borderRadius: 16, padding: "28px 32px", width: 440, border: "1px solid rgba(251,191,36,0.4)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
              <div style={{ fontSize: 36, textAlign: "center", marginBottom: 10 }}>⚠️</div>
              <h3 style={{ color: "#fff", margin: "0 0 18px", fontSize: 16, textAlign: "center" }}>Potvrdit import z původní tabulky XLS</h3>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px 16px", marginBottom: 14, fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Soubor:</span>
                  <span style={{ color: "#e2e8f0" }}>{file.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Aktuální prostředí:</span>
                  <span style={{ color: prostrediAktualni === "PRODUKCE" ? "#4ade80" : TENANT.p3, fontWeight: 700 }}>{prostrediAktualni}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Staveb aktuálně v DB:</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{stavbyVDB}</span>
                </div>
              </div>
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#fca5a5" }}>
                ⚠️ Všechna stávající data v DB budou <strong>trvale smazána</strong> a nahrazena daty ze souboru. Tato akce je <strong>nevratná</strong>.
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>Pro pokračování napište <strong style={{ color: "#fbbf24" }}>POTVRDIT</strong>:</div>
                <input
                  value={importXLSConfirmText}
                  onChange={e => setImportXLSConfirmText(e.target.value)}
                  placeholder="POTVRDIT"
                  autoFocus
                  style={{ width: "100%", padding: "9px 12px", background: TENANT.inputBg, border: `1px solid ${confirmed ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.15)"}`, borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: 2, fontWeight: 700 }}
                />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setImportXLSConfirm(null); setImportXLSConfirmText(""); }} style={{ flex: 1, padding: "10px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
                <button
                  onClick={doImportXLS}
                  disabled={!confirmed}
                  style={{ flex: 1, padding: "10px 0", background: confirmed ? "linear-gradient(135deg,#d97706,#b45309)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, color: confirmed ? "#fff" : "rgba(255,255,255,0.2)", cursor: confirmed ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, transition: "all 0.15s" }}>
                  ✅ Importovat
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* IMPORT JI — POTVRZOVACÍ DIALOG */}
      {importJIConfirm && (() => {
        const { file, stavbyVDB } = importJIConfirm;
        const prostrediAktualni = (typeof window !== "undefined" && (window.location.hostname.includes("staging") || window.location.hostname.includes("preview") || window.location.hostname === "localhost")) ? "STAGING" : "PRODUKCE";
        const confirmed = importJIConfirmText.trim().toUpperCase() === "POTVRDIT";
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9100, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
            <div style={{ background: TENANT.modalBg, borderRadius: 16, padding: "28px 32px", width: 460, border: "1px solid rgba(99,153,34,0.4)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
              <div style={{ fontSize: 36, textAlign: "center", marginBottom: 10 }}>⚠️</div>
              <h3 style={{ color: "#fff", margin: "0 0 18px", fontSize: 16, textAlign: "center" }}>Import Jihlava tabulky XLS</h3>
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px 16px", marginBottom: 14, fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Soubor:</span>
                  <span style={{ color: "#e2e8f0" }}>{file.name}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Prostředí:</span>
                  <span style={{ color: prostrediAktualni === "PRODUKCE" ? "#4ade80" : TENANT.p3, fontWeight: 700 }}>{prostrediAktualni}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Staveb v DB:</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{stavbyVDB}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>H (Smluvní cena) → pole:</span>
                  <select value={importJIKatPole} onChange={e => setImportJIKatPole(e.target.value)}
                    style={{ padding: "5px 8px", background: TENANT.inputBg, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, color: "#e2e8f0", fontSize: 12 }}>
                    <option value="ps_i">Plán. stavby I</option>
                    <option value="snk_i">SNK I</option>
                    <option value="bo_i">Běžné opravy I</option>
                    <option value="ps_ii">Plán. stavby II</option>
                    <option value="bo_ii">Běžné opravy II</option>
                    <option value="poruch">Poruchy</option>
                    <option value="nikam">Nikam (jen Nab. cena)</option>
                  </select>
                </div>
              </div>
              {/* Výběr režimu */}
              <div style={{ display: "flex", gap: 6, marginBottom: 14 }}>
                {[["nahradit","🔄 Nahradit vše","rgba(239,68,68,0.15)","rgba(239,68,68,0.4)","#f87171"],["pridat","➕ Přidat nové","rgba(34,197,94,0.1)","rgba(34,197,94,0.4)","#4ade80"]].map(([val, lbl, bg, brd, clr]) => (
                  <button key={val} onClick={() => setImportJIRezim(val)}
                    style={{ flex: 1, padding: "8px 0", background: importJIRezim === val ? bg : "rgba(255,255,255,0.04)", border: `1px solid ${importJIRezim === val ? brd : "rgba(255,255,255,0.1)"}`, borderRadius: 8, color: importJIRezim === val ? clr : "rgba(255,255,255,0.4)", cursor: "pointer", fontSize: 12, fontWeight: importJIRezim === val ? 700 : 400 }}>
                    {lbl}
                  </button>
                ))}
              </div>
              {importJIRezim === "nahradit" && (
                <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#fca5a5" }}>
                  ⚠️ Všechna stávající data + log budou <strong>trvale smazána</strong>. Akce je <strong>nevratná</strong>.
                </div>
              )}
              {importJIRezim === "pridat" && (
                <div style={{ background: "rgba(34,197,94,0.06)", border: "1px solid rgba(34,197,94,0.2)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#86efac" }}>
                  ℹ️ Přidají se jen stavby s novým číslem stavby. Existující zůstanou beze změny.
                </div>
              )}
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>Pro pokračování napište <strong style={{ color: "#fbbf24" }}>POTVRDIT</strong>:</div>
                <input value={importJIConfirmText} onChange={e => setImportJIConfirmText(e.target.value)} placeholder="POTVRDIT" autoFocus
                  style={{ width: "100%", padding: "9px 12px", background: TENANT.inputBg, border: `1px solid ${confirmed ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.15)"}`, borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: 2, fontWeight: 700 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setImportJIConfirm(null); setImportJIConfirmText(""); }} style={{ flex: 1, padding: "10px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
                <button onClick={doImportJI} disabled={!confirmed}
                  style={{ flex: 1, padding: "10px 0", background: confirmed ? "linear-gradient(135deg,#059669,#047857)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, color: confirmed ? "#fff" : "rgba(255,255,255,0.2)", cursor: confirmed ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700 }}>
                  ✅ {importJIRezim === "nahradit" ? "Nahradit vše" : "Přidat nové"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* IMPORT JSON — POTVRZOVACÍ DIALOG */}
      {importConfirm && (() => {
        const { payload, fileName, prostrediZalohy, prostrediAktualni, mismatch, stavbyVDB } = importConfirm;
        const fmtCreated = payload.created ? new Date(payload.created).toLocaleString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "?";
        const confirmed = importConfirmText.trim().toUpperCase() === "POTVRDIT";
        const borderColor = mismatch ? "rgba(239,68,68,0.5)" : "rgba(251,191,36,0.4)";
        const accentColor = mismatch ? "#f87171" : "#fbbf24";
        return (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", zIndex: 9100, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
            <div style={{ background: TENANT.modalBg, borderRadius: 16, padding: "28px 32px", width: 440, border: `1px solid ${borderColor}`, boxShadow: "0 24px 60px rgba(0,0,0,0.7)" }}>
              <div style={{ fontSize: 36, textAlign: "center", marginBottom: 10 }}>{mismatch ? "🚨" : "⚠️"}</div>
              <h3 style={{ color: "#fff", margin: "0 0 18px", fontSize: 16, textAlign: "center" }}>
                {mismatch ? "Neshoda prostředí — opravdu importovat?" : "Potvrdit import zálohy"}
              </h3>

              {/* Info tabulka */}
              <div style={{ background: "rgba(255,255,255,0.04)", borderRadius: 10, padding: "14px 16px", marginBottom: 14, fontSize: 13, display: "flex", flexDirection: "column", gap: 8 }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Prostředí zálohy:</span>
                  <span style={{ color: prostrediZalohy === "PRODUKCE" ? "#4ade80" : TENANT.p3, fontWeight: 700 }}>{prostrediZalohy}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Aktuální prostředí:</span>
                  <span style={{ color: prostrediAktualni === "PRODUKCE" ? "#4ade80" : TENANT.p3, fontWeight: 700 }}>{prostrediAktualni}</span>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Datum zálohy:</span>
                  <span style={{ color: "#e2e8f0" }}>{fmtCreated}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Staveb v záloze:</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{payload.stavby.length}</span>
                </div>
                {payload.log_aktivit && (
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span style={{ color: "rgba(255,255,255,0.45)" }}>Logů v záloze:</span>
                    <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{payload.log_aktivit.length}</span>
                  </div>
                )}
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "rgba(255,255,255,0.45)" }}>Staveb aktuálně v DB:</span>
                  <span style={{ color: "#e2e8f0", fontWeight: 700 }}>{stavbyVDB}</span>
                </div>
                <div style={{ borderTop: "1px solid rgba(255,255,255,0.07)", paddingTop: 8 }}>
                  <span style={{ color: "rgba(255,255,255,0.45)", fontSize: 12 }}>Soubor: </span>
                  <span style={{ color: "rgba(255,255,255,0.6)", fontSize: 12 }}>{fileName}</span>
                </div>
              </div>

              {/* Varování */}
              {mismatch && (
                <div style={{ background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.35)", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 12, color: "#fca5a5" }}>
                  🚨 <strong>Záloha pochází z jiného prostředí ({prostrediZalohy}) než je aktuální ({prostrediAktualni})!</strong> Importovat do špatné DB může způsobit vážné problémy.
                </div>
              )}
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#fca5a5" }}>
                ⚠️ Všechna stávající data v DB budou <strong>trvale smazána</strong> a nahrazena daty ze zálohy. Tato akce je <strong>nevratná</strong>.
              </div>

              {/* Pole POTVRDIT */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>Pro pokračování napište <strong style={{ color: accentColor }}>POTVRDIT</strong>:</div>
                <input
                  value={importConfirmText}
                  onChange={e => setImportConfirmText(e.target.value)}
                  placeholder="POTVRDIT"
                  autoFocus
                  style={{ width: "100%", padding: "9px 12px", background: TENANT.inputBg, border: `1px solid ${confirmed ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.15)"}`, borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: 2, fontWeight: 700 }}
                />
              </div>

              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setImportConfirm(null); setImportConfirmText(""); }} style={{ flex: 1, padding: "10px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
                <button
                  onClick={doImportJSON}
                  disabled={!confirmed}
                  style={{ flex: 1, padding: "10px 0", background: confirmed ? (mismatch ? "linear-gradient(135deg,#dc2626,#b91c1c)" : "linear-gradient(135deg,#d97706,#b45309)") : "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, color: confirmed ? "#fff" : "rgba(255,255,255,0.2)", cursor: confirmed ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700, transition: "all 0.15s" }}>
                  {mismatch ? "🚨 Přesto importovat" : "✅ Importovat"}
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* AUTO-LOGOUT VAROVÁNÍ */}
      {autoLogoutWarning && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", zIndex: 9000, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
          <div style={{ background: isDark ? TENANT.modalBg : "#fff", borderRadius: 16, padding: "32px 36px", width: 360, textAlign: "center", border: "1px solid rgba(239,68,68,0.4)", boxShadow: "0 24px 60px rgba(0,0,0,0.6)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⏱️</div>
            <h3 style={{ color: isDark ? "#fff" : "#1e293b", margin: "0 0 8px", fontSize: 18 }}>Automatické odhlášení</h3>
            <p style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", margin: "0 0 6px", fontSize: 14 }}>
              Detekována nečinnost ({autoLogoutMinutes} minut).
            </p>
            <div style={{ fontSize: 48, fontWeight: 800, color: autoLogoutCountdown <= 10 ? "#f87171" : "#fbbf24", margin: "16px 0", fontVariantNumeric: "tabular-nums" }}>
              {autoLogoutCountdown}
            </div>
            <p style={{ color: isDark ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.4)", margin: "0 0 24px", fontSize: 13 }}>
              Budete odhlášeni za <strong>{autoLogoutCountdown}</strong> {autoLogoutCountdown === 1 ? "sekundu" : autoLogoutCountdown < 5 ? "sekundy" : "sekund"}.
            </p>
            <button
              onClick={() => {
                setAutoLogoutWarning(false);
                clearInterval(autoLogoutCountdownTimer.current);
                clearTimeout(autoLogoutTimer.current);
                autoLogoutTimer.current = setTimeout(() => {
                  setAutoLogoutWarning(true);
                  setAutoLogoutCountdown(60);
                }, autoLogoutMinutes * 60 * 1000);
              }}
              style={{ padding: "11px 28px", background: TENANT.btnBg, border: "none", borderRadius: 10, color: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 700 }}
            >
              ✅ Jsem tady – pokračovat
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
