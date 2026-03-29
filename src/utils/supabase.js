// ============================================================
// SUPABASE CLIENT + HELPERS
// ============================================================

const SB_URL = import.meta.env.VITE_SB_URL;
const SB_KEY = import.meta.env.VITE_SB_KEY;

/**
 * Základní fetch wrapper pro Supabase REST API.
 * Timeout: 10 s (AbortController).
 */
export const sb = async (path, options = {}) => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 10_000);
  try {
    const res = await fetch(`${SB_URL}/rest/v1/${path}`, {
      signal: controller.signal,
      headers: {
        "apikey": SB_KEY,
        "Authorization": `Bearer ${SB_KEY}`,
        "Content-Type": "application/json",
        "Prefer": options.prefer || "return=representation",
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) { const e = await res.text(); throw new Error(e); }
    const text = await res.text();
    return text ? JSON.parse(text) : [];
  } catch (e) {
    if (e.name === "AbortError") throw new Error("Připojení k DB selhalo (timeout 10s)");
    throw e;
  } finally {
    clearTimeout(timer);
  }
};

/**
 * Upsert do tabulky nastaveni — PATCH pokud řádek existuje, POST pokud ne.
 */
export const sbUpsertNastaveni = async (klic, hodnota) => {
  const res = await sb(`nastaveni?klic=eq.${klic}`, {
    method: "PATCH",
    body: JSON.stringify({ hodnota }),
  });
  if (!res || (Array.isArray(res) && res.length === 0)) {
    await sb("nastaveni", {
      method: "POST",
      body: JSON.stringify({ klic, hodnota }),
      prefer: "return=minimal",
    });
  }
};

/**
 * Zapíše záznam do log_aktivit.
 * Demo uživatel se do logu nezapisuje.
 */
export const logAkce = async (uzivatel, akce, detail = "") => {
  if (uzivatel === "demo") return;
  try {
    await sb("log_aktivit", {
      method: "POST",
      body: JSON.stringify({ uzivatel, akce, detail }),
      prefer: "return=minimal",
    });
  } catch (e) {
    console.warn("Log chyba:", e);
  }
};
