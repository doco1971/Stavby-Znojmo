// ============================================================
// GLOBÁLNÍ KONSTANTY APLIKACE
// ============================================================
import { TENANT } from "./tenant";

export const APP_BUILD = "build0253";

// ── Číselné / datumové / textové pole ─────────────────────
export const NUM_FIELDS = [
  "ps_i","snk_i","bo_i","ps_ii","bo_ii","poruch",
  "vyfakturovano","zrealizovano","nabidkova_cena",
  "castka_bez_dph","castka_bez_dph_2",
];
export const KAT_FIELDS = ["ps_i","snk_i","bo_i","ps_ii","bo_ii","poruch"]; // max 1 pole může být nenulové
export const DATE_FIELDS = ["ukonceni","splatna","ze_dne","splatna_2"];
export const TEXT_FIELDS_EXTRA = ["poznamka"]; // textarea pole – nepatří do NUM ani DATE

// ── Barvy firem — fallback paleta ─────────────────────────
export const FIRMA_COLOR_FALLBACK = [
  TENANT.p2, "#facc15", "#a855f7", "#ef4444",
  "#0ea5e9", "#f97316", "#10b981", "#ec4899",
];

// ── Definice sloupců tabulky ───────────────────────────────
export const COLUMNS = [
  { key: "id",               label: "#",               width: 40 },
  { key: "firma",            label: "Firma",           width: 90 },
  { key: "cislo_stavby",     label: "Č. stavby",       width: 120 },
  { key: "nazev_stavby",     label: "Název stavby",    width: 240 },
  { key: "ps_i",             label: "Plán. stavby I",  width: 105, type: "number" },
  { key: "snk_i",            label: "SNK I",           width: 95,  type: "number" },
  { key: "bo_i",             label: "Běžné opravy I",  width: 105, type: "number" },
  { key: "ps_ii",            label: "Plán. stavby II", width: 105, type: "number" },
  { key: "bo_ii",            label: "Běžné opravy II", width: 105, type: "number" },
  { key: "poruch",           label: "Poruchy",         width: 95,  type: "number" },
  { key: "nabidka",          label: "Nabídka",         width: 105, type: "number", computed: true },
  { key: "rozdil",           label: "Rozdíl",          width: 105, type: "number", computed: true },
  { key: "vyfakturovano",    label: "Vyfakturováno",   width: 105, type: "number" },
  { key: "ukonceni",         label: "Ukončení",        width: 88 },
  { key: "zrealizovano",     label: "Zrealizováno",    width: 105, type: "number" },
  { key: "sod",              label: "SOD",             width: 130 },
  { key: "ze_dne",           label: "Ze dne",          width: 88 },
  { key: "objednatel",       label: "Objednatel",      width: 110, truncate: true },
  { key: "stavbyvedouci",    label: "Stavbyvedoucí",   width: 110, truncate: true },
  { key: "nabidkova_cena",   label: "Nab. cena",       width: 105, type: "number" },
  { key: "cislo_faktury",    label: "Č. faktury",      width: 105 },
  { key: "castka_bez_dph",   label: "Č. bez DPH",      width: 105, type: "number" },
  { key: "splatna",          label: "Splatná",         width: 88 },
  { key: "cislo_faktury_2",  label: "Č. faktury 2",    width: 105, hidden: true },
  { key: "castka_bez_dph_2", label: "Č. bez DPH 2",   width: 105, type: "number", hidden: true },
  { key: "splatna_2",        label: "Splatná 2",       width: 88,  hidden: true },
  { key: "slozka_url",       label: "Složka",          width: 60,  hidden: true },
];

// ── Sdílený styl inputů ────────────────────────────────────
export const inputSx = {
  width: "100%",
  padding: "9px 11px",
  background: TENANT.inputBg,
  border: "1px solid rgba(255,255,255,0.15)",
  borderRadius: 7,
  color: "#fff",
  fontSize: 13,
  outline: "none",
  boxSizing: "border-box",
};

// ── DEMO MODE ──────────────────────────────────────────────
export const DEMO_USER = {
  id: 0, email: "demo", password: "demo", role: "admin", name: "Demo administrátor",
};
export const DEMO_FIRMY = [
  { hodnota: "Elektro s.r.o.", barva: TENANT.p2 },
  { hodnota: "Stavmont a.s.",  barva: "#10b981" },
  { hodnota: "VHS Znojmo",     barva: "#f59e0b" },
  { hodnota: "Silnice JM",     barva: "#8b5cf6" },
];
export const DEMO_CISELNIKY = {
  objednatele:    ["Město Znojmo", "Jihomoravský kraj", "MO ČR", "Správa silnic"],
  stavbyvedouci:  ["Jan Novák", "Petr Svoboda", "Marie Horáková", "Tomáš Blaha"],
};
export const DEMO_MAX_STAVBY_DEFAULT = 15;
export const DEMO_USERS = [
  { id: 1, email: "admin@demo.cz",  password: "demo", role: "admin",      name: "Admin Demo",      heslo: "demo" },
  { id: 2, email: "editor@demo.cz", password: "demo", role: "user_e",     name: "Editor Demo",     heslo: "demo" },
  { id: 3, email: "user@demo.cz",   password: "demo", role: "user",       name: "Čtenář Demo",     heslo: "demo" },
  { id: 4, email: "super@demo.cz",  password: "demo", role: "superadmin", name: "Superadmin Demo", heslo: "demo" },
];
