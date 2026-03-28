import { useState } from "react";
import { TENANT, IS_JIHLAVA } from "../utils/tenant";
import { DEMO_USER, inputSx } from "../utils/constants";

// Lbl — sdílený label helper (lokální kopie, nebo importovat ze sdíleného souboru)
function Lbl({ children }) {
  return <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 5, textTransform: "uppercase" }}>{children}</div>;
}

export function Login({ onLogin, users, onLogAction, appNazev = "Stavby Znojmo" }) {
  const [email, setEmail]     = useState("");
  const [pass, setPass]       = useState("");
  const [err, setErr]         = useState("");
  const [loading, setLoading] = useState(false);

  const isLoginStaging = typeof window !== "undefined" && (
    window.location.hostname.includes("staging") ||
    window.location.hostname.includes("preview") ||
    window.location.hostname === "localhost"
  );

  const handle = () => {
    setLoading(true);
    setTimeout(() => {
      if (email.trim().toLowerCase() === "demo" && pass === "demo") {
        onLogin(DEMO_USER);
        return;
      }
      const u = users.find(u => u.email === email && u.password === pass);
      if (u) { onLogAction(u.email, "Přihlášení", ""); onLogin(u); }
      else { setErr("Nesprávný email nebo heslo"); setLoading(false); }
    }, 600);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: TENANT.loginBg, display: "flex", alignItems: "flex-start", justifyContent: "center", overflowY: "auto", padding: "clamp(16px,5vh,60px) 0 24px", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <style>{`
        @keyframes loginStagingBlink{0%,100%{opacity:1;box-shadow:0 0 12px rgba(249,115,22,0.9)}50%{opacity:0.45;box-shadow:0 0 3px rgba(249,115,22,0.2)}}
        @keyframes loginStagingPulse{0%,100%{background:rgba(249,115,22,0.95)}50%{background:rgba(234,88,12,0.75)}}
      `}</style>
      {isLoginStaging && (
        <div style={{ position: "fixed", top: 0, left: 0, right: 0, animation: "loginStagingPulse 1.5s ease-in-out infinite", background: "rgba(249,115,22,0.95)", borderBottom: "2px solid rgba(249,115,22,0.6)", color: "#fff", textAlign: "center", padding: "6px 16px", fontSize: 12, fontWeight: 800, letterSpacing: 1, zIndex: 10, display: "flex", alignItems: "center", justifyContent: "center", gap: 10 }}>
          <span style={{ animation: "loginStagingBlink 1.5s ease-in-out infinite", display: "inline-block" }}>⚠️</span>
          TESTOVACÍ PROSTŘEDÍ — přihlašujete se do testovací databáze
          <span style={{ animation: "loginStagingBlink 1.5s ease-in-out infinite", display: "inline-block" }}>⚠️</span>
        </div>
      )}
      <div style={{ background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: isLoginStaging ? "1px solid rgba(249,115,22,0.4)" : "1px solid rgba(255,255,255,0.1)", borderRadius: 20, padding: "clamp(24px,5vw,48px) clamp(18px,5vw,40px)", width: "min(380px, 94vw)", boxShadow: isLoginStaging ? "0 32px 80px rgba(0,0,0,0.5), 0 0 0 2px rgba(249,115,22,0.25)" : "0 32px 80px rgba(0,0,0,0.5)", marginTop: isLoginStaging ? 20 : 0 }}>
        <div style={{ textAlign: "center", marginBottom: 36 }}>
          {IS_JIHLAVA ? (
            <svg width="100" height="100" viewBox="0 0 100 100" fill="none" style={{ display: "block", margin: "0 auto 16px" }}>
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
              <circle cx="55" cy="14" r="1.3" fill="#C0DD97" opacity="0.5"/>
              <circle cx="8" cy="58" r="1.1" fill="#97C459" opacity="0.4"/>
              <circle cx="90" cy="62" r="1.3" fill="#C0DD97" opacity="0.35"/>
              <circle cx="88" cy="18" r="1" fill="#97C459" opacity="0.45"/>
            </svg>
          ) : (
            <svg width="80" height="80" viewBox="0 0 80 80" fill="none" style={{ display: "block", margin: "0 auto 14px" }}>
              <defs>
                <radialGradient id="lgbg" cx="50%" cy="35%" r="70%">
                  <stop offset="0%" stopColor={TENANT.p1} />
                  <stop offset="100%" stopColor="#0f172a" />
                </radialGradient>
              </defs>
              <circle cx="40" cy="40" r="38" fill="url(#lgbg)" stroke={TENANT.p1} strokeWidth="1.5" strokeOpacity="0.5" />
              <polygon points="47,10 30,42 40,42 33,68 52,36 42,36" fill="#facc15" />
              <circle cx="18" cy="24" r="2.2" fill="#facc15" opacity="0.55" />
              <circle cx="62" cy="22" r="1.8" fill="#facc15" opacity="0.45" />
              <circle cx="65" cy="56" r="2" fill="#facc15" opacity="0.4" />
              <circle cx="15" cy="58" r="1.6" fill="#facc15" opacity="0.5" />
            </svg>
          )}
          <h1 style={{ color: "#fff", fontSize: 32, fontWeight: 800, margin: 0 }}>{appNazev}</h1>
          <p style={{ color: "rgba(255,255,255,0.5)", margin: "6px 0 0", fontSize: 15, letterSpacing: 2, textTransform: "uppercase" }}>{TENANT.kategorie}</p>
        </div>

        <div style={{ marginBottom: 14 }}><Lbl>Email</Lbl><input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="vas@email.cz" style={inputSx} onKeyDown={e => e.key === "Enter" && handle()} /></div>
        <div style={{ marginBottom: 22 }}><Lbl>Heslo</Lbl><input type="password" value={pass} onChange={e => setPass(e.target.value)} placeholder="••••••••" style={inputSx} onKeyDown={e => e.key === "Enter" && handle()} /></div>

        {err && <div style={{ color: "#f87171", fontSize: 13, marginBottom: 14, textAlign: "center" }}>{err}</div>}

        <button onClick={handle} disabled={loading} style={{ width: "100%", padding: 14, background: TENANT.btnBg, border: "none", borderRadius: 10, color: "#fff", fontSize: 15, fontWeight: 600, cursor: "pointer", opacity: loading ? 0.7 : 1 }}>
          {loading ? "Přihlašuji..." : "Přihlásit se →"}
        </button>
        <div style={{ marginTop: 16, textAlign: "center", color: "rgba(255,255,255,0.25)", fontSize: 12 }}>
          Zapomenuté heslo? Kontaktuj administrátora.
        </div>
        <div style={{ marginTop: 16, padding: "16px 18px", background: "rgba(251,191,36,0.18)", border: "2px solid rgba(251,191,36,0.7)", borderRadius: 10, textAlign: "center" }}>
          <div style={{ color: "#fbbf24", fontSize: 13, fontWeight: 800, marginBottom: 8, letterSpacing: 0.5 }}>🎮 DEMO PŘÍSTUP</div>
          <div style={{ display: "flex", justifyContent: "center", gap: 20 }}>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 7, padding: "5px 14px" }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, display: "block", marginBottom: 1 }}>email</span>
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>demo</span>
            </div>
            <div style={{ background: "rgba(0,0,0,0.3)", borderRadius: 7, padding: "5px 14px" }}>
              <span style={{ color: "rgba(255,255,255,0.7)", fontSize: 11, display: "block", marginBottom: 1 }}>heslo</span>
              <span style={{ color: "#fff", fontSize: 15, fontWeight: 800, letterSpacing: 1 }}>demo</span>
            </div>
          </div>
          <div style={{ color: "#fde68a", fontSize: 11, marginTop: 8, fontWeight: 600 }}>Plný přístup admin · Data se neukládají · Max 15 staveb</div>
        </div>
      </div>
    </div>
  );
}
