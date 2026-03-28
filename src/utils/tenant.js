// ============================================================
// TENANT KONFIGURACE — Znojmo vs Jihlava
// KRITICKÉ POŘADÍ: IS_JIHLAVA → tc1/tc2/tc1d → TENANT
// ============================================================

export const IS_JIHLAVA =
  (typeof window !== "undefined" && window.location.hostname.includes("jihlava")) ||
  import.meta.env.VITE_IS_JIHLAVA === "true";

// Helper funkce pro rgba barvy — MUSÍ být před TENANT objektem!
export const tc1  = (a) => IS_JIHLAVA ? `rgba(59,109,17,${a})`  : `rgba(37,99,235,${a})`;
export const tc2  = (a) => IS_JIHLAVA ? `rgba(99,153,34,${a})`  : `rgba(59,130,246,${a})`;
export const tc1d = (a) => IS_JIHLAVA ? `rgba(27,80,10,${a})`   : `rgba(29,78,216,${a})`;

export const TENANT = IS_JIHLAVA
  ? {
      // === JIHLAVA — zelená ===
      nazev:      "Stavby Jihlava",
      kategorie:  "kategorie 2",
      p1:         "#3B6D11",
      p1dark:     "#27500A",
      p1deep:     "#173404",
      p2:         "#639922",
      p3:         "#97C459",
      p4:         "#C0DD97",
      loginBg:    "linear-gradient(135deg,#0a1f0a 0%,#0f2d1a 50%,#071510 100%)",
      btnBg:      "linear-gradient(135deg,#3B6D11,#27500A)",
      numColor:   "#3B6D11",
      orbColor1:  "rgba(57,130,57,0.32)",
      orbColor2:  "rgba(80,160,60,0.22)",
      modalBg:    "#0d1f08",
      inputBg:    "#071004",
      appDarkBg:  "#0c1808",
      appLightBg: "#e8f0e0",
    }
  : {
      // === ZNOJMO — modrá ===
      nazev:      "Stavby Znojmo",
      kategorie:  "kategorie 1 & 2",
      p1:         "#2563eb",
      p1dark:     "#1d4ed8",
      p1deep:     "#1e3a8a",
      p2:         "#3b82f6",
      p3:         "#60a5fa",
      p4:         "#93c5fd",
      loginBg:    "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f2027 100%)",
      btnBg:      "linear-gradient(135deg,#2563eb,#1d4ed8)",
      numColor:   "#2563eb",
      orbColor1:  `rgba(59,130,246,0.35)`,
      orbColor2:  "rgba(139,92,246,0.3)",
      modalBg:    "#1e293b",
      inputBg:    "#0f172a",
      appDarkBg:  "#0f172a",
      appLightBg: "#f1f5f9",
    };
