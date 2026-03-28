// ============================================================
// useIsMobile — detekce mobilního zobrazení přes matchMedia
// ============================================================
import { useState, useEffect } from "react";

/**
 * @param {number} breakpoint — šířka v px; pod tuto hranici = mobile (výchozí 768)
 * @returns {boolean}
 */
export function useIsMobile(breakpoint = 768) {
  const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
  const [isMobile, setIsMobile] = useState(() => mq.matches);
  useEffect(() => {
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}
