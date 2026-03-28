// ============================================================
// FORMÁTOVACÍ UTILITY
// ============================================================

/**
 * Formátuje číslo na české locale se 2 desetinnými místy.
 * Prázdný string / null → "".
 */
export const fmt = (n) =>
  n == null || n === ""
    ? ""
    : Number(n).toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Jako fmt, ale nula zobrazí jako "".
 */
export const fmtN = (n) =>
  n == null || n === "" || Number(n) === 0 ? "" : fmt(n);

/**
 * Převede hex barvu na "R,G,B" string.
 */
export const hexToRgb = (hex) => {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r
    ? `${parseInt(r[1], 16)},${parseInt(r[2], 16)},${parseInt(r[3], 16)}`
    : "59,130,246";
};

/**
 * Převede hex + alpha na "rgba(R,G,B,a)" string.
 */
export const hexToRgbaGlobal = (hex, alpha) => `rgba(${hexToRgb(hex)},${alpha})`;

/**
 * Přepočítá řádek stavby — dopočítá nabidka a rozdil.
 */
export function computeRow(row) {
  const nabidka =
    (Number(row.ps_i)   || 0) +
    (Number(row.snk_i)  || 0) +
    (Number(row.bo_i)   || 0) +
    (Number(row.ps_ii)  || 0) +
    (Number(row.bo_ii)  || 0) +
    (Number(row.poruch) || 0);
  const rozdil = (Number(row.vyfakturovano) || 0) - nabidka;
  return { ...row, nabidka, rozdil };
}
