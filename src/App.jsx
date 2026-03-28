import { useState, useMemo, useEffect, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import * as XLSX from "xlsx";
// BUILD: 2026_03_28_build0241
// ============================================================
// POZNÁMKY PRO CLAUDE (čti na začátku každé session)
// ============================================================
// PRAVIDLO #0 — PŘED KAŽDÝM NOVÝM ROZŠÍŘENÍM FUNKCIONALITY:
//   Nejprve důkladně prohledat internet, nabídnout min. 3-5 možností
//   s vysvětlením výhod/nevýhod, teprve pak implementovat zvolenou.
//   NESPOUŠTĚT implementaci bez průzkumu a výběru uživatelem!
//
// PRAVIDLO #1 — POKUD NĚCO NEFUNGUJE:
//   Nejprve důkladně zkontrolovat kód v App.jsx (logika, stavy, podmínky)
//   než se začne cokoliv jiného měnit nebo navrhovat.
//   NEHÁDEJ — ZKONTROLUJ KÓD!
//   Příklad: build číslo "natvrdo" → nekontrolovat = špatné řešení
//            zkontrolovat kód = najít natvrdo → správné řešení = konstanta APP_BUILD
//   PRAVIDLO #1b — KDYŽ OPRAVA NEFUNGUJE PO 2-3 POKUSECH:
//   Je to signál že problém je v ARCHITEKTUŘE, ne v detailech.
//   Zastavit se, přehodnotit, navrhnout správné řešení — NE pokračovat v záplatování!
//
// PRAVIDLO #2 — TEXTY V TABULKÁCH:
//   Nikdy nepoužívat textOverflow:ellipsis tam kde je dost místa.
//   "ellipsis" = trojtečka (...) na konci oříznutého textu.
//   Text se má zobrazit celý (wordBreak:break-word) bez horizontálního scrollbaru.
//   Raději se zeptat na požadovanou šířku než dělat 4 buildy!
//
// PRAVIDLO #3 — VŽDY OVĚŘIT VÝSLEDEK:
//   Po každé změně zkontrolovat že se oprava skutečně projevila v souboru.
//   Nestačí říct "opraveno" — OVĚŘIT kódem (grep/search) že změna je tam.
//   Nelhat! Pokud replace selhal, říct to a opravit znovu.
//
// PRAVIDLO #4 — PŘI KAŽDÉM NOVÉM BUILDU POVINNĚ AKTUALIZOVAT:
//   a) Třetí řádek souboru:  // BUILD: DATUM_buildXXXX
//   b) Řetězec v HISTORY:    BUILD0XXX — popis
//   c) Konstanta APP_BUILD (~řádek 275): const APP_BUILD = "buildXXXX"
//      UI ji zobrazí automaticky — nikde jinde se číslo buildu NEMĚNÍ!
//   + VŽDY vytvořit changelog soubor stavby-app_DATUM_buildXXXX_changelog.txt
//
// DEPLOY: Vercel + GitHub (doco1971/stavby-znojmo)
//   Větve: main (produkce) + staging (testování)
//   Soubor patří do: src/App.jsx
//   Postup: staging první → otestovat → merge do main
//
// TRANSCRIPT: /mnt/transcripts/ — přečíst pro kontext předchozích session
// LOG:        stavby-znojmo-log-2026-03-24.txt — kompletní dokumentace (aktualizováno 24.3.2026)
// NAVOD:      stavby-znojmo-navod-2026-03-23-FINAL.docx — strukturovaná dokumentace projektu
//
// ============================================================
// AKTUÁLNÍ STAV APLIKACE (session 2026-03-28, build0241)
// ============================================================
//
// ZNOJMO:
// ✅ Poslední build staging: build0241 (Znojmo + Jihlava — stejný soubor)
// ✅ Poslední build main (produkce): build0144
// ✅ Supabase staging: wgrdhqkkjhtrkweiqxvo.supabase.co
// ✅ Supabase produkce: cleifbyyhpbdjbrgzrkv.supabase.co
//
// JIHLAVA:
// ✅ Poslední build staging: build0241
// ✅ Poslední build main (produkce): build0144_j (Jihlava varianta)
// ✅ Repo: doco1971/stavby-jihlava (Public)
// ✅ Vercel projekt: stavby-jihlava (Deployment Protection vypnuta)
// ✅ IS_JIHLAVA detekce: hostname.includes("jihlava") || VITE_IS_JIHLAVA=true
//
// TENANT SYSTÉM (build0225+):
// ✅ TENANT objekt: p1/p1dark/p1deep/p2/p3/p4/modalBg/inputBg/appDarkBg/appLightBg
// ✅ tc1/tc2/tc1d helpers — MUSÍ být definovány PŘED TENANT objektem! (jinak bílá obrazovka)
// ✅ Znojmo: modrá (#2563eb), Jihlava: zelená (#3B6D11)
// ✅ IS_JIHLAVA env fallback: VITE_IS_JIHLAVA=true v .env nebo Vercel env vars
//
// SPOLEČNÁ INFRASTRUKTURA:
// ✅ GitHub heartbeat: .github/workflows/supabase-heartbeat.yml
//    Schedule: 45 4 * * * (probouzí SB 15 min před pg_cron emailem)
// ✅ Email notifikace: pg_cron job "stavby-deadline-emails-v3" (jobid=5)
//    Schedule: 0 5 * * * = 5:00 UTC = 6:00 CZ zimní / 7:00 CZ letní
// ✅ Warmup job: "stavby-warmup-edge" (jobid=6)
//    Schedule: 50 4 * * * = 4:50 UTC = probouzí Edge Function runtime
// ✅ vercel.json + index.html no-cache headers
// ✅ Stavby Helper: localhost:47891 (PowerShell, autostart)
//    Port: 47891 (3210 byl obsazen Windows System procesem PID 4)
// ✅ Tisk/PDF: window.print() + @media print (build0180-0186)
//    Před tiskem přepne na světlý motiv, po tisku vrátí zpět
//
// ============================================================
// TLAČÍTKO 💡 — SLOŽKA ZAKÁZKY
// ============================================================
// Umožňuje přiřadit síťovou cestu ke každé stavbě a otevřít ji klikem.
//
// FUNKCE:
//   Šedá 💡 (bez cesty) + klik → popup pro zadání cesty
//   Žlutá 💡 (s cestou) + klik → otevře složku nebo zkopíruje cestu
//   Cesta lze zadat i v editaci stavby (sekce OSTATNÍ)
//   Nastavení kdo vidí 💡: Nastavení → Aplikace → 💡 TLAČÍTKO SLOŽKA
//   Uloženo v DB (tabulka nastaveni, klic=slozka_role)
//   Hodnoty: none | user | user_e | admin | superadmin (výchozí: admin)
//
// FORMÁTY CEST (vše funguje):
//   U:\Dočekal\2025\ZN-001        — lokální/síťový disk
//   \\server\zakazky\ZN-001       — UNC cesta
//   http://server/zakazky/ZN-001  — webový odkaz (otevře prohlížeč)
//
// STAV TESTOVÁNÍ:
//   ✅ Lokální síť (LAN) — Opera + Firefox
//   ⚠️  Chrome — minimalizuje okno (omezení prohlížeče)
//   ⏳ VPN — zatím netestováno
//
// STAVBY HELPER — PowerShell HTTP server na localhost:47891:
//   Soubor:    C:\Stavby\stavby-helper.ps1
//   Autostart: Startup složka Windows
//   Ping:      http://localhost:47891/ping → 'OK'
//   Open:      http://localhost:47891/open?path=CESTA
//   Instalace: Nastavení → 💡 → Stáhnout instalátor → install.bat (bez admin práv)
//
// ============================================================
// EMAIL NOTIFIKACE
// ============================================================
// ✅ Resend.com nakonfigurován, doména zmes.cz ověřena
//   DNS záznamy (přidal IT správce Forpsi):
//     TXT  resend._domainkey.zmes.cz  → DKIM klíč
//     MX   send.zmes.cz               → feedback-smtp.eu-west-1.amazonses.com (priorita 10)
//     TXT  send.zmes.cz               → v=spf1 include:amazonses.com ~all
// ✅ FROM_EMAIL: stavby_znojmo@zmes.cz
// ✅ Edge Function načítá emaily z DB (tabulka nastaveni, klic=notify_emails)
// ✅ Emaily lze spravovat: Nastavení → Aplikace → 📧 EMAIL NOTIFIKACE
//
// SUPABASE SECRETS (Edge Functions → Secrets):
//   RESEND_API_KEY            — API klíč z resend.com
//   FROM_EMAIL                — stavby_znojmo@zmes.cz
//   SUPABASE_URL              — automaticky dostupná
//   SUPABASE_SERVICE_ROLE_KEY — automaticky dostupná
//   ⚠️  POZOR: SUPABASE_SERVICE_ROLE_KEY (ne SERVICE_ROLE_KEY!)
//       Chyba v názvu = žádné emaily (opraveno build0154, 5 dní výpadek)
//
// ============================================================
// TISK / PDF (build0180–0186)
// ============================================================
// Přístup: window.print() + @media print CSS — bez nového okna, bez závislostí
//
// exportPDF() postup:
//   1. Uloží aktuální motiv (prevTheme)
//   2. Pokud tmavý motiv → setTheme("light") — jinak tisk = černé pozadí!
//   3. Počká 150ms → React překreslí světlý motiv
//   4. Přidá třídu "printing" na <html> element
//   5. window.print() → dialog prohlížeče
//   6. Po tisku: odebere třídu + obnoví původní motiv
//
// CSS třídy:
//   .no-print         — header, filtry, pagination, footer (skryto při tisku)
//   .print-hide-col   — sloupce AKCE vlevo+vpravo (col + th + td)
//   .print-hide-symbol — symboly ⠿ (drag) a ⟺ (resize) v hlavičkách
//
// @media print: A4 landscape, margin 4mm, table zoom 0.55, font-size 7px
// firmaColorCache.bgLight = světlá varianta barvy (pro --print-bg CSS var na <tr>)
//
// ============================================================
// SUPABASE — VŠECHNY DB MIGRACE (spustit na obou DB: prod + staging)
// ============================================================
//   ALTER TABLE stavby ADD COLUMN IF NOT EXISTS poznamka TEXT;
//   ALTER TABLE stavby ADD COLUMN IF NOT EXISTS cislo_faktury_2 TEXT;
//   ALTER TABLE stavby ADD COLUMN IF NOT EXISTS castka_bez_dph_2 NUMERIC;
//   ALTER TABLE stavby ADD COLUMN IF NOT EXISTS splatna_2 TEXT;
//   ALTER TABLE stavby ADD COLUMN IF NOT EXISTS slozka_url TEXT;
//   ALTER TABLE log_aktivit ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;
//   UPDATE log_aktivit SET hidden = false WHERE hidden IS NULL;
//   CREATE POLICY "admin_read_all"   ON log_aktivit FOR SELECT USING (true);
//   CREATE POLICY "allow_insert"     ON log_aktivit FOR INSERT WITH CHECK (true);
//   CREATE POLICY "admin_delete_log" ON log_aktivit FOR DELETE USING (true);
//   CREATE POLICY "allow_update_log" ON log_aktivit FOR UPDATE USING (true) WITH CHECK (true);
//
// ============================================================
// TECHNICKÉ DETAILY
// ============================================================
//
// SUPABASE: tabulky stavby, ciselniky, uzivatele, log_aktivit, nastaveni
//   sb() helper — fetch wrapper s Bearer tokenem + AbortController 10s timeout
//   XLSX export: HTML blob (.xls) — NE import("xlsx"), nefunguje v bundlu!
//   XLSX import: XLSX.read(..., { raw: true, cellDates: true }) — raw:true nutné!
//
// ROLE: user (čtení), user_e (editor), admin, superadmin
//   user        — čtení, filtrování, export dat
//   user_e      — vše výše + přidání, editace, kopírování staveb
//   admin       — vše výše + smazání, správa číselníků/uživatelů, log, záloha
//   superadmin  — vše výše + nastavení aplikace, import DB, šířky sloupců
//
// DEMO: email=demo / heslo=demo
//   role=admin, max 15 staveb, jen v paměti — NESMÍ zapisovat do DB!
//
// ZÁLOHA JSON (version:2):
//   stavby + ciselniky + uzivatele (bez hesel) + log_aktivit
//   Automatická záloha: první přihlášení superadmina každý den (po 3s)
//   Import: jen superadmin, smaže celou DB → varování + nutné napsat POTVRDIT
//
// SKRÝVÁNÍ LOGŮ (hidden=true místo DELETE):
//   Záznamy se nikdy fyzicky nemažou
//   superadmin: vidí Aktivní/Skryté/Vše + může obnovit (↩)
//
// useDraggable: vrací { pos, onMouseDown, reset }
//   Memory leak opraven (build0179): useCallback + useEffect cleanup
//   posRef sleduje aktuální pos pro správný offset při dragování
//
// TABULKA — sloupce:
//   Faktura 2 (cislo_faktury_2, castka_bez_dph_2, splatna_2): hidden:true
//   ale zobrazují se jako druhý řádek v buňkách faktury (dashed border)
//   Zelený řádek (isFaktura): č.faktury + castka_bez_dph + splatna vyplněny
//   Červené ukončení (isOverdue): termín v minulosti, jen pokud !isFaktura
//
// ============================================================
// PENDING FUNKCE
// ============================================================
// [HOTOVO] 💡 Otevírání složek — localhost helper port 47891
// [HOTOVO] 🖨️  Tisk/PDF — window.print() + @media print (build0180-0186)
// [HOTOVO] ⚡ sb() timeout + useDraggable memory leak (build0179)
// [HOTOVO] ⚙️  Drag & drop karet v Nastavení — cardsOrder string[][] (build0211)
// [HOTOVO] 💾 Ukládání VŠECH 12 nastavení do DB — sbUpsertNastaveni (build0220)
// [HOTOVO] ✅ Validace kategorií I+II — max 1 nenulové pole z KAT_FIELDS (build0221)
// [HOTOVO] ⚠️  Smazaná firma — oranžový pulsující badge v tabulce (build0222)
// [HOTOVO] ⏰ Popup Termíny — zobrazuje i prošlé termíny bez faktury (build0223)
// [HOTOVO] 🔴 Prošlý termín — pulsující červený rámeček celého řádku (build0224)
//
// PRIORITA 1 — MERGE:
// [PENDING] 🔀 Merge staging (build0224) → main
//   Checklist: přihlášení, tabulka, drag&drop, uložení nastavení, e-mail notifikace
//
// PRIORITA 2 — BEZPEČNOST:
// [PENDING] 🔐 Hesla plain text → Supabase Auth JWT (supabase.auth.signInWithPassword)
//   ℹ Role (admin/user_e...) zůstat v tabulce nastaveni, propojit přes uuid
// [PENDING] 🔐 RLS vypnuto na produkci → Edge Function proxy
//
// PRIORITA 3 — STABILITA:
// [PENDING] 🧹 Refaktoring App.jsx (6100 řádků → komponenty)
//   ℹ Návrh: src/api/db.js, src/utils/formatters.js, src/components/FormModal.jsx,
//            src/components/SettingsModal.jsx, src/components/LogModal.jsx
//   ℹ POZOR: dělat postupně, NIKDY najednou — Pravidlo #1b!
// [PENDING] ⚠️  Race condition při ukládání nastavení — SLEDOVAT
//   ℹ saveSlozkaRole a další dělají setState PŘED await sbUpsertNastaveni
//   ℹ Pokud DB zápis selže, UI ukazuje změnu která se neuložila
//   ℹ Oprava: setState až PO potvrzení + rollback na původní hodnotu při chybě
// [PENDING] ☁️  Přechod Vercel → Cloudflare Pages (Hobby = nekomerční!)
//
// PRIORITA 4 — NOVÉ FUNKCE:
// [PENDING] 📈 Dashboard — KPI karty + grafy
//   ℹ Navrhovány: počet staveb v realizaci, obrat, zisk, marže
//   ℹ Graf cashflow predikce: osa X = měsíce, osa Y = smluvní ceny dle termínu
//   ℹ Základ existuje v GrafModal — rozšířit, ne předělávat
// [PENDING] 🗓️ Kalendářní pohled — termíny ukončení v měsíčním kalendáři
//   ℹ Před implementací průzkum variant — Pravidlo #0! (Gemini zmiňuje FullCalendar)
// [PENDING] 📱 Mobilní "výjezdový" pohled — jen termíny + poznámky pro techniky
//   ℹ isMobile detekce již existuje — využít jako základ
// [PENDING] 💡 VPN — otestovat otevírání složek přes VPN
// [PENDING] 💡 Chrome — fix minimalizace okna při otevírání složek
// [PENDING] 📧 Tlačítko "Odeslat testovací e-mail" v nastavení
// [PENDING] 📦 Hromadné akce — označit více staveb, hromadně změnit technika/stav
//
// JIHLAVA:
// [HOTOVO] 🏙️  Stavby Jihlava — repo doco1971/stavby-jihlava, Vercel projekt, TENANT systém
// [PENDING] 🎨 Preset barevná schémata v Nastavení → Aplikace (superadmin)
//   ℹ Varianta A: 3-5 předvoleb (Znojmo modrá, Jihlava zelená, Fialová, Oranžová...)
//   ℹ Uložit do DB (nastaveni, klic=color_scheme), načíst při startu
//   ℹ POZOR: TENANT je modul-level konstanta — pro přepínání za běhu nutný activeTenant state
//
// ============================================================
// HISTORY BUILDŮ
// ============================================================
// BUILD0025–0145 — viz předchozí session (transcript v /mnt/transcripts/)
// BUILD0146 — Aktualizace hlavičky, nápověda 20 sekcí
// BUILD0147–149 — Tlačítko 💡 složka: popup zadání, drag&drop číselníky
// BUILD0150–151 — FIX: protokol stavby:// zavíral záložku (iframe trick)
// BUILD0152 — Chrome/Opera rozšíření pro otevírání složek
// BUILD0153 — Aktualizace hlavičky + dokumentace
// BUILD0154 — OPRAVA Edge Function: SERVICE_ROLE_KEY → SUPABASE_SERVICE_ROLE_KEY
// BUILD0155 — openFolder: stavby:// protokol jako primární metoda
// BUILD0156 — openFolder: localhost helper (http://localhost:47891/open?path=...)
// BUILD0157 — ping helperu každých 30s, pravidlo #1 do hlavičky
// BUILD0158 — tooltips na toolbar tlačítka
// BUILD0159 — tooltips Stránky/Vše, fix okna přidání stavby
// BUILD0160 — fix useDraggable calcPos, dynamický maxHeight
// BUILD0161 — kompaktní layout editace/přidání stavby
// BUILD0162 — okna vystředěna, maxHeight 90vh
// BUILD0163 — okna: top=10px
// BUILD0164 — Log širší (1100px), bez overflow-x scrollbaru
// BUILD0165 — TEST banner červený+větší, auto záloha přepínač
// BUILD0166 — Log datum zkráceno, přepínač zálohy v Nastavení
// BUILD0167 — Log: table-layout fixed, bez horizontálního scrollbaru
// BUILD0168 — Nastavení: okno 1000px
// BUILD0169 — OPRAVA E-MAILŮ (main): warmup job pg_cron
// BUILD0170 — Log Akce sloupec wider, nowrap
// BUILD0171 — Log sloupce percentuální šířky
// BUILD0172 — Log Detail: celý text (wordBreak), Pravidlo #2
// BUILD0173 — NativeSelect: dropdown nepřesahuje pravý okraj
// BUILD0174 — Nastavení Aplikace: 2 sloupce, záloha role
// BUILD0175 — Nápověda aktualizována, Pravidlo #3
// BUILD0176 — Nápověda filtrována dle role
// BUILD0177 — Odstraněna sekce Oprávnění dle role
// BUILD0178 — Aktualizace hlavičky, update dokumentace
// BUILD0179 — sb() AbortController 10s + useDraggable memory leak + APP_BUILD konstanta
// BUILD0180 — Tisk/PDF: window.print() + @media print (žádné nové okno)
// BUILD0181 — Fix INP issue: setTimeout 50ms před window.print()
// BUILD0182 — Tisk: skryty sloupce AKCE (print-hide-col) + oprava broken build
// BUILD0183 — Tisk: zoom 0.55 (všechny sloupce), skryty symboly ⠿ ⟺
// BUILD0184 — Tisk: obnoveny barvy (odstraněn background-color:transparent)
// BUILD0185 — Tisk: bgLight světlé barvy řádků, td transparent, th modrá
// BUILD0186 — (viz předchozí session)
// BUILD0187–0194 — Nastavení Aplikace: drag&drop, 1-5 sloupců, viditelnost, prefix, povinná pole
// BUILD0195 — FIX: useEffect pořadí + useDraggable reset(overrideW)
// BUILD0196–0210 — FIX (15 buildů): drag&drop placeholder — modulo systém špatný
// BUILD0211 — REFACTOR: cardsOrder string[] → string[][] — FUNKČNÍ
// BUILD0212 — Pravidlo #1b do hlavičky
// BUILD0213–0214 — FIX: saveSlozkaRole, render cols
// BUILD0215–0220 — DEBUG + FIX: sbUpsertNastaveni — ukládání 12 nastavení do DB
// BUILD0221 — Validace: max 1 pole z KAT_FIELDS (Kategorie I+II)
// BUILD0222 — Smazaná firma: oranžový pulzující badge + přeškrtnutý text + tooltip
// BUILD0223 — FIX: Popup Termíny — zobrazuje i prošlé termíny bez faktury
// BUILD0224 — Tabulka: prošlé termíny bez faktury → pulsující červený rámeček řádku
// BUILD0225 — TENANT detekce podle URL: Jihlava=zelená+stožáry, Znojmo=modrá+blesk
// BUILD0226 — Zelené barevné schema pro Jihlavu: všechny modré barvy → TENANT.p1/p2/p3/p4 + tc1/tc2 helpers
// BUILD0241 — NOVÁ FUNKCE: Import JI tabulky (Jihlava XLS), přejmenování DUR, výběr kat. pole pro H
// BUILD0240 — NOVÁ FUNKCE: DatePickerField — 📅 mini picker u všech datumových polí (FormModal + dodatky)
// BUILD0239 — FIX: FormModal přesně centrován CSS translate(-50%,-50%), stejná mezera ze všech stran
// BUILD0238 — UI: FormModal svisle centrován (top:50% translateY), Faktura 1+2 pole na jeden řádek
// BUILD0237 — UI: FormModal rozšířen na 96vw/96vh, Faktura 1+2 sloučeny na jeden řádek, menší padding sekcí
// BUILD0236 — FIX: Dodatky — základ uložen jako poradi=-1 v tabulce dodatky, správný přepočet při smazání
// BUILD0235 — NOVÉ FUNKCE: Záloha+import ciselniky+nastaveni (v3), kontrolka přečtení logu (DB),
//             hromadné přiřazení firmy po smazání, dodatky stavby (nová tabulka dodatky)
// BUILD0234 — CRITICAL FIX: tc1/tc2/tc1d přesunuty před TENANT objekt (ReferenceError = bílá obrazovka)
// BUILD0144_j — Jihlava varianta build0144: texty/barvy Znojmo→Jihlava (bez TENANT systému)
// BUILD0144   — FIX main Znojmo: vyfakturovaná stavba se nezobrazuje v termínech (isFaktura check)
// BUILD0233 — FIX: vyfakturovaná stavba se nezobrazuje v blížících se termínech (isFaktura check)
// BUILD0232 — FIX: appDarkBg Jihlava zesvětlena #070f04 → #0c1808 (podobný jas jako Znojmo #0f172a)
// BUILD0231 — FIX: celé pozadí aplikace zelené pro Jihlavu — darkAppBg, body.background, všechny #0f172a fallbacky → TENANT.appBg
// BUILD0230 — FIX: TENANT.modalBg + TENANT.inputBg — modaly/dropdowny zelené pro Jihlavu; opraveny hardcoded "Stavby Znojmo" texty → TENANT.nazev
// BUILD0229 — FIX: 4x #1a2744 → TENANT.p1deep + IS_JIHLAVA env fallback (VITE_IS_JIHLAVA)
// BUILD0228 — FIX: Jihlava — všechny hardcoded modré → TENANT (tlačítka, headery, náhled tisku, HTML blob tisk, @media print, nápověda)
// BUILD0227 — FIX: SVG atributy stopColor/fill/stroke bez {} + zbývající hardcoded modré v UI
// BUILD0221 — Validace: max 1 pole z Kategorií I+II (KAT_FIELDS)
// BUILD0220 — Odstraněny console.log, ukládání nastavení potvrzeno funkční
// BUILD0219 — DEBUG: console.log v sbUpsertNastaveni
// BUILD0218 — FIX: sbUpsertNastaveni — PATCH vrací [] (ne výjimku) → kontrola res.length
// BUILD0217 — FIX: sbUpsertNastaveni helper — PATCH pokud existuje, POST pokud ne
// BUILD0216 — FIX: všechny save funkce nastaveni — POST merge-duplicates → PATCH
// BUILD0215 — DEBUG: console.log v saveSlozkaRole a saveCisloPrefix
// BUILD0214 — FIX: render cols — normalizovat na appCardsCols bez round-robin
// BUILD0213 — FIX: saveSlozkaRole — setSlozkaRole přesunuto před await (jako ostatní save fce)
// BUILD0212 — Přidáno pravidlo #1b: po 2-3 neúspěšných opravách = architektura
// BUILD0211 — REFACTOR: cardsOrder string[] → string[][] (pole polí), drag&drop bez modulo
// BUILD0210 — FIX: null výplně pro zachování ci = insertAt % appCardsCols při přetečení
// BUILD0209 — FIX: insertAt = countInTargetCol * appCardsCols + ci (dle rady internetu)
// BUILD0208 — FIX: insertAt = indexOf(lastInCol)+1, prázdný sloupec před prvkem sloupce ci+1
// BUILD0207 — FIX: colItems sestaveno z next pomocí colsFromNext algoritmu (stejný jako render)
// BUILD0206 — FIX: colItems počítán z next pomocí appCardsCols (ne z col closure)
// BUILD0205 — DEBUG: log do setCardsOrder, oprava colItems filter
// BUILD0204 — FIX: dragCardRef vyčistit až v onDrop (ne v onDragEnd), setTimeout 100ms
// BUILD0203 — DEBUG: console.log v handleCardDragEnd a placeholder onDrop
// BUILD0202 — FIX: drag&drop — dataTransfer.getData jako záloha, stopPropagation na placeholder
// BUILD0201 — FIX: handleCardDragEnd — cols nedostupné v closure, nahrazeno cardsOrder
// BUILD0200 — FIX: drag&drop karet — isDraggingCard state, placeholder 80px při dragu
// BUILD0199 — FIX: drag&drop karet — DragEnter+DragEnd vzor, dragOverRef, placeholder na konci
// BUILD0198 — FIX: drag&drop karet — sloupec jako drop target, detekce pozice dle Y souřadnice
// BUILD0197 — FIX: drag&drop karet — handleCardDragEnd odložen setTimeout 50ms
// BUILD0196 — Drag&drop karet: drop zóna na konci neprázdného sloupce
// BUILD0195 — FIX: useDraggable reset s overrideW, useEffect pořadí v SettingsModal
// BUILD0194 — Nastavení Aplikace: volitelný počet sloupců 1–5 (localStorage)
// BUILD0193 — Nastavení Aplikace: optimální 3 sloupce, drag&drop karet, reset pořadí
// BUILD0192 — Viditelnost sloupců per role (sloupce_role) v Nastavení → Aplikace
// BUILD0191 — Povinná pole (cislo_stavby, nazev, ukonceni, sod, ze_dne) + Prefix číslování staveb
// BUILD0190 — Název aplikace z DB, počet dní termínů z DB, demo max stavby z DB
// BUILD0189 — Výchozí motiv světlý, timeout odhlášení z DB (auto_logout_minutes)
// BUILD0188 — Nastavení Aplikace: 3 sloupce, Složka role Superadmin+, Import XLS potvrzovací dialog
// BUILD0187 — Toolbar: Export+Tisk odděleny, Data roletka (Záloha+Obnova JSON), Import XLS→Nastavení, Export logu→Log modal, Graf: +Koláč +Trend
// BUILD0186 — Tisk: před tiskem přepnout na světlý motiv, po tisku vrátit zpět
//
// (starý stav session 2026-03-19 odstraněn — viz aktuální stav výše)
//
// ============================================================
// TLAČÍTKO 💡 — SLOŽKA ZAKÁZKY
// ============================================================
// Umožňuje přiřadit síťovou cestu ke každé stavbě a otevřít ji klikem.
//
// FUNKCE:
//   Šedá 💡 (bez cesty) + klik → popup pro zadání cesty
//   Žlutá 💡 (s cestou) + klik → otevře složku nebo zkopíruje cestu
//   Cesta lze zadat i v editaci stavby (sekce OSTATNÍ)
//   Nastavení kdo vidí 💡: Nastavení → Aplikace → 💡 TLAČÍTKO SLOŽKA
//   Uloženo v DB (tabulka nastaveni, klic=slozka_role)
//   Hodnoty: none | user | user_e | admin | superadmin (výchozí: admin)
//
// FORMÁTY CEST (vše funguje):
//   U:\Dočekal\2025\ZN-001        — lokální/síťový disk
//   \\server\zakazky\ZN-001       — UNC cesta
//   http://server/zakazky/ZN-001  — webový odkaz (otevře prohlížeč)
//
// STAV TESTOVÁNÍ:
//   ✅ Lokální síť (LAN) — funguje, Opera + Firefox
//   ⏳ VPN — zatím netestováno, plánováno
//
// PRIORITA OTEVÍRÁNÍ SLOŽKY:
//   1. stavby:// protokol  — nejjednodušší, jen .reg soubor, všechny prohlížeče
//   2. Rozšíření           — Chrome/Opera (trvalé), Firefox (.xpi)
//   3. Clipboard fallback  — zkopíruje cestu (bez instalace čehokoliv)
//
// METODA 1 — vlastní URL protokol stavby:// (DOPORUČENO):
//   Instalace: stavby-protokol.zip → install.bat jako správce (jednorázově na PC)
//   Funguje: Chrome, Opera, Firefox, Edge — BEZ rozšíření prohlížeče
//   Prohlížeč zobrazí dialog "Otevřít Stavby Opener?" → OK → otevře složku
//   Detekce: protokolReady state (ping test při načtení)
//   Soubory: stavby_handler.ps1 + install.bat (PowerShell, žádný Python)
//
// METODA 2 — rozšíření prohlížeče (stavby-rozsireni-v2.zip):
//   Chrome/Opera: trvalé, "Načíst rozbalené" + install.bat
//   Firefox: dočasné (about:debugging) nebo trvalé (.xpi podpis přes Mozilla)
//   Detekce: extensionReady state (window message "STAVBY_EXTENSION_READY")
//   Nastavení → Aplikace → 💡: zobrazuje stav protokolu i rozšíření
//
// ============================================================
// EMAIL NOTIFIKACE
// ============================================================
// ✅ Resend.com nakonfigurován, doména zmes.cz ověřena
//   DNS záznamy (přidal IT správce Forpsi):
//     TXT  resend._domainkey.zmes.cz  → DKIM klíč
//     MX   send.zmes.cz               → feedback-smtp.eu-west-1.amazonses.com (priorita 10)
//     TXT  send.zmes.cz               → v=spf1 include:amazonses.com ~all
// ✅ FROM_EMAIL: stavby_znojmo@zmes.cz (Supabase Secret)
// ✅ Edge Function načítá emaily z DB (tabulka nastaveni, klic=notify_emails)
// ✅ Emaily lze spravovat: Nastavení → Aplikace → 📧 EMAIL NOTIFIKACE
// ✅ OPRAVA 2026-03-19: Edge Function měla špatný název secretu
//    PŘED: Deno.env.get("SERVICE_ROLE_KEY")
//    PO:   Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
//    Příčina: secret nebyl načten → žádné emaily přes notify_emails → nic se neposlalo
//    Výsledek: po opravě emaily okamžitě přišly ✅
//
// SUPABASE SECRETS (Edge Functions → Secrets):
//   RESEND_API_KEY            — API klíč z resend.com
//   FROM_EMAIL                — stavby_znojmo@zmes.cz
//   SUPABASE_URL              — automaticky dostupná
//   SUPABASE_SERVICE_ROLE_KEY — automaticky dostupná (POZOR: ne SERVICE_ROLE_KEY!)
//
// ============================================================
// SUPABASE — VŠECHNY DB MIGRACE (spustit na obou DB: prod + staging)
// ============================================================
//   ALTER TABLE stavby ADD COLUMN IF NOT EXISTS poznamka TEXT;
//   ALTER TABLE stavby ADD COLUMN IF NOT EXISTS cislo_faktury_2 TEXT;
//   ALTER TABLE stavby ADD COLUMN IF NOT EXISTS castka_bez_dph_2 NUMERIC;
//   ALTER TABLE stavby ADD COLUMN IF NOT EXISTS splatna_2 TEXT;
//   ALTER TABLE stavby ADD COLUMN IF NOT EXISTS slozka_url TEXT;
//   ALTER TABLE log_aktivit ADD COLUMN IF NOT EXISTS hidden BOOLEAN DEFAULT false;
//   UPDATE log_aktivit SET hidden = false WHERE hidden IS NULL;
//   CREATE POLICY "admin_read_all"   ON log_aktivit FOR SELECT USING (true);
//   CREATE POLICY "allow_insert"     ON log_aktivit FOR INSERT WITH CHECK (true);
//   CREATE POLICY "admin_delete_log" ON log_aktivit FOR DELETE USING (true);
//   CREATE POLICY "allow_update_log" ON log_aktivit FOR UPDATE USING (true) WITH CHECK (true);
//
// ============================================================
// TECHNICKÉ DETAILY
// ============================================================
//
// SUPABASE: tabulky stavby, ciselniky, uzivatele, log_aktivit, nastaveni
//   sb() helper — fetch wrapper s Bearer tokenem (anon key)
//   XLSX export: HTML blob (.xls) — NE import("xlsx"), nefunguje v bundlu!
//   XLSX import: XLSX.read(..., { raw: true, cellDates: true }) — raw:true nutné!
//
// TABULKA — sloupce:
//   Faktura 2 (cislo_faktury_2, castka_bez_dph_2, splatna_2): hidden:true
//   ale zobrazují se jako druhý řádek v buňkách faktury (stejný font, čára dashed)
//   Zelený řádek (isFaktura): č.faktury + castka_bez_dph + splatna vyplněny → isOverdue=false
//   Červené ukončení (isOverdue): termín v minulosti, jen pokud !isFaktura
//
// ROLE: user (čtení), user_e (editor), admin, superadmin
//
// DEMO: email=demo / heslo=demo
//   role=admin, max 15 staveb, jen v paměti — NESMÍ zapisovat do DB!
//   Demo data: 8 staveb, 4 firmy, DEMO_USERS (4 účty viditelné v Nastavení)
//
// ZÁLOHA JSON (💾, admin+superadmin stáhne, jen superadmin importuje):
//   version: 2 — stavby + ciselniky + uzivatele (bez hesel) + log_aktivit
//   Automatická záloha: první přihlášení superadmina každý den (po 3s)
//   Dialog odhlášení: tlačítko "💾 Zálohovat a odhlásit" (admin+superadmin)
//   Import: jen superadmin, smaže celou DB a nahradí zálohou
//   Přenos mezi prostředími: červené varování + nutné napsat POTVRDIT
//
// SKRÝVÁNÍ LOGŮ (hidden=true místo DELETE):
//   Záznamy se nikdy fyzicky nemažou
//   admin+superadmin: může skrýt v Historii změn + Log zakázek
//   superadmin: vidí přepínač Aktivní/Skryté/Vše ve všech třech lozích
//   superadmin: může obnovit skrytý záznam (↩)
//   non-superadmin: vidí jen hidden=false (filtr v DB dotazu)
//
// PLOVOUCÍ OKNA (useDraggable):
//   useDraggable vrací { pos, onMouseDown, reset }
//   reset() volat při otevření oken definovaných v App (helpPos, deadlinesPos atd.)
//
// ČÍSELNÍKY — drag & drop pořadí:
//   Firmy, Objednatelé, Stavbyvedoucí — tažení za ⠿
//   Pořadí firem se projeví v SummaryCards, filtru i tabulce
//
// MULTI-TENANT ARCHITEKTURA (plán):
//   Hosting: Cloudflare Pages (zdarma, komerční použití povoleno)
//   Vercel Hobby ZAKÁZÁN pro komerční použití — přejít na CF Pages
//   Template: doco1971/stavby-template → forky pro každou firmu
//
// ============================================================
// PENDING FUNKCE
// ============================================================
// [HOTOVO] 💡 Otevírání složek — localhost helper (stavby-helper.ps1, port 47891)
// [PENDING] 💡 Helper — otestovat na Chrome, Firefox, Edge
// [PENDING] 📱 iOS klávesnice — přihlašovací obrazovka se roztáhne při psaní
// [PENDING] 📈 Dashboard — KPI karty + grafy
// [PENDING] 🗓️ Kalendářní pohled — termíny ukončení v měsíčním kalendáři
// [PENDING] ☁️  Přechod Vercel → Cloudflare Pages
// [PENDING] 🔐 Přechod na Supabase Auth (hesla plain text → JWT)
// [PENDING] 🖨️  Tisk/PDF — přepsat na window.print() + css @media print
//
// ============================================================
// INSPIRACE — Kalkulace stavby (Next.js projekt, 20.3.2026)
// ============================================================
// 1. TISK/PDF bez závislostí:
//    document.documentElement.classList.add('printing')
//    window.print()
//    setTimeout(() => document.documentElement.classList.remove('printing'), 1000)
//    + @media print CSS: skrýt .no-print, přepsat tmavé barvy na světlé
//    VÝHODA: žádné závislosti (jsPDF/html2canvas), čisté, funguje vždy
//
// 2. BEZPEČNOST — Supabase Auth:
//    - Nyní: hesla plain text v tabulce uzivatele → RIZIKO!
//    - Cíl: Supabase Auth (JWT, refresh token, session management)
//    - Vytváření uživatelů: server-side API route, SERVICE_ROLE_KEY na serveru
//    - Role zachovat stejné (user/user_e/admin/superadmin) v tabulce profiles
//
// ============================================================
// HISTORY BUILDŮ
// ============================================================
// BUILD0025–0145 — viz předchozí session (transcript v /mnt/transcripts/)
// BUILD0146 — Aktualizace hlavičky, nápověda 20 sekcí
// BUILD0147–149 — Tlačítko 💡 složka: popup zadání, drag&drop číselníky
// BUILD0150–151 — FIX: protokol stavby:// zavíral záložku (iframe trick)
// BUILD0152 — Chrome/Opera rozšíření pro otevírání složek bez zavření záložky
//   Detekce extensionReady, openFolder() s fallback na clipboard
//   stavby-rozsireni.zip: extension + native helper (Python)
// BUILD0186 — Tisk: pred tiskem prepnout na svetly motiv, po tisku vratit zpet
// BUILD0185 — Tisk: svetly vizual - bgLight pro radky, td transparent, th modra
// BUILD0184 — Tisk: obnoveny barvy firem a radku (odstranen background-color:transparent)
// BUILD0183 — Tisk: zoom 0.55 (vsechny sloupce), skryty symboly hlavicek
// BUILD0182 — Tisk: skryty sloupce AKCE (print-hide-col), tabulka na sirku stranky
// BUILD0181 — Fix tisk PDF: setTimeout 50ms před window.print() (INP issue)
// BUILD0180 — Tisk/PDF: window.print() + @media print, žádné nové okno
// BUILD0179 — sb() AbortController timeout 10s + useDraggable memory leak fix
// BUILD0178 — Aktualizace hlavičky: stav aplikace 2026-03-20
// BUILD0177 — Nápověda: odstraněna sekce Oprávnění dle role (redundantní)
// BUILD0176 — Nápověda filtrována dle role přihlášeného uživatele
// BUILD0175 — Nápověda aktualizována: záloha role, složka helper. Pravidlo #3.
// BUILD0174 — Nastavení Aplikace: 2 sloupce, záloha role volba, export dropdown fix
// BUILD0173 — NativeSelect: dropdown nepřesahuje pravý okraj obrazovky
// BUILD0172 — Log Detail: celý text bez ellipsis, wordBreak. Pravidlo #2.
// BUILD0171 — Log v Nastavení: sloupce v procentech, využijí celou šířku
// BUILD0170 — Log v Nastavení: sloupec Akce širší (150px), nowrap
// BUILD0169 — Aktualizace hlavičky: warmup job, email opraven
// BUILD0168 — Nastavení: okno rozšířeno na 1000px, bez scrollbarů
// BUILD0167 — Log: table-layout fixed, bez horizontálního scrollbaru
// BUILD0166 — Log: datum zkráceno+nowrap, přepínač auto zálohy v Nastavení
// BUILD0165 — Log: fix scrollbar, TEST banner červený+větší
// BUILD0164 — Log širší (1100px), Nastavení bez overflow-x scrollbaru
// BUILD0163 — okna: top=10px (horní okraj), left=střed obrazovky
// BUILD0162 — okna vystředěna, maxHeight 90vh
// BUILD0161 — kompaktní layout editace/přidání stavby, Poznámka v gridu
// BUILD0160 — fix useDraggable calcPos, dynamický maxHeight všech oken
// BUILD0159 — tooltips Stránky/Vše
// BUILD0158 — tooltips na toolbar tlačítka (Termíny, Nápověda, Nastavení, Log)
// BUILD0157 — ping helperu každých 30s, pravidlo #1 do hlavičky
// BUILD0156 — openFolder: localhost helper (http://localhost:47891/open?path=...)
//   Nahrazuje stavby:// protokol a rozšíření prohlížeče
//   Funguje ve všech prohlížečích bez problémů s elevated právy
//   Helper: stavby-helper.ps1 (PowerShell, autostart po přihlášení)
//   Instalace: stavby-helper-installer.zip → install.bat (bez admin práv!)
// BUILD0155 — openFolder: stavby:// protokol jako primární metoda
//   Nová priorita: stavby:// protokol → rozšíření → clipboard
//   Detekce protokolu: ping test při načtení stránky
//   Fallback zachován — bez protokolu i bez rozšíření kopíruje do schránky
//   Nastavení → Aplikace → 💡: zobrazuje stav protokolu i rozšíření
//   Viz stavby-protokol.zip pro instalaci (.reg + handler)
// BUILD0154 — Oprava Edge Function: SERVICE_ROLE_KEY → SUPABASE_SERVICE_ROLE_KEY
// BUILD0153 — Aktualizace hlavičky + dokumentace + nápověda
//
// ============================================================
// SUPABASE CONFIG
// ============================================================
// ⚠️ TOTO MĚNIT PŘI KAŽDÉM BUILDU — zobrazuje se v UI u uživatele (superadmin)
const APP_BUILD = "build0241";

// ============================================================
// TENANT DETEKCE — podle URL automaticky Znojmo nebo Jihlava
// Znojmo: modrá (#2563eb), logo blesk, "kategorie 1 & 2"
// Jihlava: zelená (#3B6D11), logo stožáry, "kategorie 2"
// ============================================================
const IS_JIHLAVA = (typeof window !== "undefined" && window.location.hostname.includes("jihlava")) || import.meta.env.VITE_IS_JIHLAVA === "true";
// Helper funkce pro rgba barvy podle tenantu — MUSÍ být před TENANT objektem!
const tc1 = (a) => IS_JIHLAVA ? `rgba(59,109,17,${a})` : `rgba(37,99,235,${a})`;
const tc2 = (a) => IS_JIHLAVA ? `rgba(99,153,34,${a})` : `rgba(59,130,246,${a})`;
const tc1d = (a) => IS_JIHLAVA ? `rgba(27,80,10,${a})` : `rgba(29,78,216,${a})`;
const TENANT = IS_JIHLAVA ? {
  // === JIHLAVA — zelená ===
  nazev: "Stavby Jihlava",
  kategorie: "kategorie 2",
  p1: "#3B6D11",
  p1dark: "#27500A",
  p1deep: "#173404",
  p2: "#639922",
  p3: "#97C459",
  p4: "#C0DD97",
  loginBg: "linear-gradient(135deg,#0a1f0a 0%,#0f2d1a 50%,#071510 100%)",
  btnBg: "linear-gradient(135deg,#3B6D11,#27500A)",
  numColor: "#3B6D11",
  orbColor1: "rgba(57,130,57,0.32)",
  orbColor2: "rgba(80,160,60,0.22)",
  modalBg: "#0d1f08",
  inputBg: "#071004",
  appDarkBg: "#0c1808",
  appLightBg: "#e8f0e0",
} : {
  // === ZNOJMO — modrá ===
  nazev: "Stavby Znojmo",
  kategorie: "kategorie 1 & 2",
  p1: "#2563eb",
  p1dark: "#1d4ed8",
  p1deep: "#1e3a8a",
  p2: "#3b82f6",
  p3: "#60a5fa",
  p4: "#93c5fd",
  loginBg: "linear-gradient(135deg,#0f172a 0%,#1e3a5f 50%,#0f2027 100%)",
  btnBg: "linear-gradient(135deg,#2563eb,#1d4ed8)",
  numColor: "#2563eb",
  orbColor1: `${tc2(0.35)}`,
  orbColor2: "rgba(139,92,246,0.3)",
  modalBg: "#1e293b",
  inputBg: "#0f172a",
  appDarkBg: "#0f172a",
  appLightBg: "#f1f5f9",
};
// tc1/tc2/tc1d jsou definovány před TENANT objektem (viz výše)

const SB_URL = import.meta.env.VITE_SB_URL;
const SB_KEY = import.meta.env.VITE_SB_KEY;

const sb = async (path, options = {}) => {
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

// Upsert do tabulky nastaveni — PATCH pokud řádek existuje, POST pokud ne
const sbUpsertNastaveni = async (klic, hodnota) => {
  const res = await sb(`nastaveni?klic=eq.${klic}`, { method: "PATCH", body: JSON.stringify({ hodnota }) });
  if (!res || (Array.isArray(res) && res.length === 0)) {
    await sb("nastaveni", { method: "POST", body: JSON.stringify({ klic, hodnota }), prefer: "return=minimal" });
  }
};

const logAkce = async (uzivatel, akce, detail = "") => {
  if (uzivatel === "demo") return; // demo — nepsat do DB
  try {
    await sb("log_aktivit", { method: "POST", body: JSON.stringify({ uzivatel, akce, detail }), prefer: "return=minimal" });
  } catch (e) { console.warn("Log chyba:", e); }
};
// ============================================================
// DEMO MODE
// ============================================================
const DEMO_USER = { id: 0, email: "demo", password: "demo", role: "admin", name: "Demo administrátor" };
const DEMO_FIRMY = [
  { hodnota: "Elektro s.r.o.", barva: TENANT.p2 },
  { hodnota: "Stavmont a.s.", barva: "#10b981" },
  { hodnota: "VHS Znojmo", barva: "#f59e0b" },
  { hodnota: "Silnice JM", barva: "#8b5cf6" },
];
const DEMO_CISELNIKY = {
  objednatele: ["Město Znojmo", "Jihomoravský kraj", "MO ČR", "Správa silnic"],
  stavbyvedouci: ["Jan Novák", "Petr Svoboda", "Marie Horáková", "Tomáš Blaha"],
};
const DEMO_MAX_STAVBY_DEFAULT = 15;
const DEMO_USERS = [
  { id: 1, email: "admin@demo.cz",   password: "demo", role: "admin",      name: "Admin Demo",    heslo: "demo" },
  { id: 2, email: "editor@demo.cz",  password: "demo", role: "user_e",     name: "Editor Demo",   heslo: "demo" },
  { id: 3, email: "user@demo.cz",    password: "demo", role: "user",       name: "Čtenář Demo",   heslo: "demo" },
  { id: 4, email: "super@demo.cz",   password: "demo", role: "superadmin", name: "Superadmin Demo", heslo: "demo" },
];

const fmt = (n) => n == null || n === "" ? "" : Number(n).toLocaleString("cs-CZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtN = (n) => (n == null || n === "" || Number(n) === 0) ? "" : fmt(n);

function computeRow(row) {
  const nabidka = (Number(row.ps_i)||0)+(Number(row.snk_i)||0)+(Number(row.bo_i)||0)+(Number(row.ps_ii)||0)+(Number(row.bo_ii)||0)+(Number(row.poruch)||0);
  const rozdil = (Number(row.vyfakturovano)||0) - nabidka;
  return { ...row, nabidka, rozdil };
}

const COLUMNS = [
  { key: "id", label: "#", width: 40 },
  { key: "firma", label: "Firma", width: 90 },
  { key: "cislo_stavby", label: "Č. stavby", width: 120 },
  { key: "nazev_stavby", label: "Název stavby", width: 240 },
  { key: "ps_i", label: "Plán. stavby I", width: 105, type: "number" },
  { key: "snk_i", label: "SNK I", width: 95, type: "number" },
  { key: "bo_i", label: "Běžné opravy I", width: 105, type: "number" },
  { key: "ps_ii", label: "Plán. stavby II", width: 105, type: "number" },
  { key: "bo_ii", label: "Běžné opravy II", width: 105, type: "number" },
  { key: "poruch", label: "Poruchy", width: 95, type: "number" },
  { key: "nabidka", label: "Nabídka", width: 105, type: "number", computed: true },
  { key: "rozdil", label: "Rozdíl", width: 105, type: "number", computed: true },
  { key: "vyfakturovano", label: "Vyfakturováno", width: 105, type: "number" },
  { key: "ukonceni", label: "Ukončení", width: 88 },
  { key: "zrealizovano", label: "Zrealizováno", width: 105, type: "number" },
  { key: "sod", label: "SOD", width: 130 },
  { key: "ze_dne", label: "Ze dne", width: 88 },
  { key: "objednatel", label: "Objednatel", width: 110, truncate: true },
  { key: "stavbyvedouci", label: "Stavbyvedoucí", width: 110, truncate: true },
  { key: "nabidkova_cena", label: "Nab. cena", width: 105, type: "number" },
  { key: "cislo_faktury", label: "Č. faktury", width: 105 },
  { key: "castka_bez_dph", label: "Č. bez DPH", width: 105, type: "number" },
  { key: "splatna", label: "Splatná", width: 88 },
  { key: "cislo_faktury_2", label: "Č. faktury 2", width: 105, hidden: true },
  { key: "castka_bez_dph_2", label: "Č. bez DPH 2", width: 105, type: "number", hidden: true },
  { key: "splatna_2", label: "Splatná 2", width: 88, hidden: true },
  { key: "slozka_url", label: "Složka", width: 60, hidden: true },

];

const inputSx = { width: "100%", padding: "9px 11px", background: TENANT.inputBg, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box" };

// ── Globální sdílené konstanty ─────────────────────────────
const NUM_FIELDS = ["ps_i","snk_i","bo_i","ps_ii","bo_ii","poruch","vyfakturovano","zrealizovano","nabidkova_cena","castka_bez_dph","castka_bez_dph_2"];
const KAT_FIELDS = ["ps_i","snk_i","bo_i","ps_ii","bo_ii","poruch"]; // max 1 pole může být nenulové
const DATE_FIELDS = ["ukonceni","splatna","ze_dne","splatna_2"];
const TEXT_FIELDS_EXTRA = ["poznamka"]; // textarea pole – nepatří do NUM ani DATE
const FIRMA_COLOR_FALLBACK = [TENANT.p2,"#facc15","#a855f7","#ef4444","#0ea5e9","#f97316","#10b981","#ec4899"];
const hexToRgb = hex => { const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex); return r ? `${parseInt(r[1],16)},${parseInt(r[2],16)},${parseInt(r[3],16)}` : "59,130,246"; };
const hexToRgbaGlobal = (hex, alpha) => `rgba(${hexToRgb(hex)},${alpha})`;

// ── useDraggable hook — jednotný drag pro všechna plovoucí okna ───────────────
// w, h = šířka a výška okna v px (pro výpočet středu); lze předat 0 pokud neznáme
function useDraggable(w = 600, h = 500) {
  const calcPos = (overrideW) => {
    const iW = typeof window !== "undefined" ? window.innerWidth : 1200;
    const effectiveW = overrideW ?? w;
    return {
      x: Math.max(10, Math.round(iW / 2 - Math.min(effectiveW, iW * 0.97) / 2)),
      y: 10,
    };
  };
  const [pos, setPos] = useState(calcPos);
  useEffect(() => { setPos(calcPos()); }, []);
  const reset = useCallback((overrideW) => setPos(calcPos(overrideW)), [w]);
  const dragging = useRef(false);
  const offset = useRef({ x: 0, y: 0 });
  const posRef = useRef(pos);
  useEffect(() => { posRef.current = pos; }, [pos]);

  const onMove = useCallback((ev) => {
    if (!dragging.current) return;
    setPos({
      x: Math.max(0, Math.min(window.innerWidth - 60, ev.clientX - offset.current.x)),
      y: Math.max(0, Math.min(window.innerHeight - 40, ev.clientY - offset.current.y)),
    });
  }, []);

  const onUp = useCallback(() => {
    dragging.current = false;
  }, []);

  useEffect(() => {
    window.addEventListener("mousemove", onMove);
    window.addEventListener("mouseup", onUp);
    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseup", onUp);
    };
  }, [onMove, onUp]);

  const onMouseDown = useCallback((e) => {
    if (e.button !== 0) return;
    dragging.current = true;
    offset.current = { x: e.clientX - posRef.current.x, y: e.clientY - posRef.current.y };
  }, []);

  return { pos, onMouseDown, reset };
}

// Sdílený styl pro drag header
const dragHeaderStyle = (extraStyle = {}) => ({
  padding: "13px 20px",
  borderBottom: "1px solid rgba(255,255,255,0.08)",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  cursor: "grab",
  userSelect: "none",
  background: "rgba(255,255,255,0.03)",
  borderRadius: "16px 16px 0 0",
  ...extraStyle,
});

const dragHint = <span style={{ fontSize: 10, color: "rgba(255,255,255,0.2)", fontWeight: 400, marginLeft: 8 }}>⠿ přetáhnout</span>;

function Lbl({ children }) {
  return <div style={{ color: "rgba(255,255,255,0.45)", fontSize: 10, fontWeight: 700, letterSpacing: 0.8, marginBottom: 5, textTransform: "uppercase" }}>{children}</div>;
}

function NativeSelect({ value, onChange, options, style, isDark = true }) {
  const [open, setOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const [dropPos, setDropPos] = useState({ top: 0, left: 0, width: 0 });
  const ref = useRef(null);
  const dropRef = useRef(null);

  // Zavřít při kliknutí mimo
  useEffect(() => {
    const handler = (e) => {
      if (ref.current && ref.current.contains(e.target)) return;
      if (dropRef.current && dropRef.current.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const openDropdown = () => {
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      const estimatedHeight = Math.min(options.length * 38, 280);
      const goUp = spaceBelow < estimatedHeight && spaceAbove > spaceBelow;
      const dropWidth = Math.max(rect.width, 220);
      // Pokud by dropdown přesahoval pravý okraj — zarovnat zprava
      const leftPos = (rect.left + dropWidth > window.innerWidth - 8)
        ? Math.max(8, window.innerWidth - dropWidth - 8)
        : rect.left;
      setDropUp(goUp);
      setDropPos({ top: goUp ? rect.top : rect.bottom, left: leftPos, width: rect.width });
    }
    setOpen(true);
  };

  const handleLeave = (e) => {
    const to = e.relatedTarget;
    if (ref.current && ref.current.contains(to)) return;
    if (dropRef.current && dropRef.current.contains(to)) return;
    setOpen(false);
  };

  const bg = isDark ? TENANT.modalBg : "#fff";
  const border = isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)";
  const textColor = isDark ? "#e2e8f0" : "#1e293b";
  const hoverBg = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.05)";
  const dropBg = isDark ? TENANT.modalBg : "#fff";
  const dropShadow = isDark ? "0 8px 24px rgba(0,0,0,0.5)" : "0 8px 24px rgba(0,0,0,0.12)";

  // Portál — renderuje přímo do body, mimo jakýkoliv overflow/stacking context
  const dropdown = open ? createPortal(
    <div ref={dropRef} onMouseLeave={handleLeave}
      style={{ position: "fixed", top: dropUp ? "auto" : dropPos.top, bottom: dropUp ? window.innerHeight - dropPos.top : "auto", left: dropPos.left, minWidth: Math.max(dropPos.width, 220), background: dropBg, border: `1px solid ${border}`, borderRadius: 8, zIndex: 999999, boxShadow: dropShadow, overflow: "auto", maxHeight: 280, fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      {options.map(o => (
        <div key={o}
          onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); onChange(o); setOpen(false); }}
          style={{ padding: "9px 14px", color: o === value ? (isDark ? TENANT.p3 : TENANT.p1) : textColor, background: o === value ? (isDark ? tc1(0.15) : tc1(0.08)) : "transparent", cursor: "pointer", fontSize: 13, whiteSpace: "nowrap" }}
          onMouseEnter={e => { if (o !== value) e.currentTarget.style.background = hoverBg; }}
          onMouseLeave={e => { if (o !== value) e.currentTarget.style.background = "transparent"; }}
        >{o}</div>
      ))}
    </div>,
    document.body
  ) : null;

  return (
    <div ref={ref} style={{ position: "relative", display: "inline-block", ...style }}
      onMouseEnter={openDropdown}
      onMouseLeave={handleLeave}
    >
      <button onClick={(e) => { e.stopPropagation(); open ? setOpen(false) : openDropdown(); }}
        style={{ width: "auto", padding: "0 20px 0 10px", height: 28, background: bg, border: `1px solid ${border}`, borderRadius: 7, color: textColor, cursor: "pointer", fontSize: 12, textAlign: "left", display: "inline-flex", alignItems: "center", whiteSpace: "nowrap", position: "relative", minWidth: 80 }}>
        <span>{value}</span>
        <span style={{ position: "absolute", right: 6, top: "50%", transform: `translateY(-50%) rotate(${open ? 180 : 0}deg)`, fontSize: 9, color: isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)", pointerEvents: "none", transition: "transform 0.15s" }}>▼</span>
      </button>
      {dropdown}
    </div>
  );
}

// ============================================================
// HISTORIE ZMĚN MODAL
// ============================================================
const FIELD_LABELS = {
  firma: "Firma", cislo_stavby: "Č. stavby", nazev_stavby: "Název stavby",
  ps_i: "Plán. stavby I", snk_i: "SNK I", bo_i: "Běžné opravy I",
  ps_ii: "Plán. stavby II", bo_ii: "Běžné opravy II", poruch: "Poruchy",
  vyfakturovano: "Vyfakturováno", ukonceni: "Ukončení", zrealizovano: "Zrealizováno",
  sod: "SOD", ze_dne: "Ze dne", objednatel: "Objednatel", stavbyvedouci: "Stavbyvedoucí",
  nabidkova_cena: "Nab. cena", cislo_faktury: "Č. faktury", castka_bez_dph: "Č. bez DPH",
  splatna: "Splatná", poznamka: "Poznámka",
};

function HistorieModal({ row, isDark, onClose, isDemo, isAdmin, isSuperAdmin, onAllHidden, onPrecteno }) {
  const [zaznamy, setZaznamy] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteId, setDeleteId] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [zobrazit, setZobrazit] = useState("aktivni"); // "aktivni" | "skryte" | "vse"
  const { pos, onMouseDown: onDragStart } = useDraggable(680, 560);

  useEffect(() => {
    if (isDemo) { setLoading(false); return; }
    const load = async () => {
      try {
        const hiddenFilter = isSuperAdmin ? "" : "&hidden=eq.false";
        const res = await sb(`log_aktivit?order=cas.desc&limit=500${hiddenFilter}`);
        const idStr = String(row.id);
        const filtered = (res || []).filter(r => {
          if (!r.detail) return false;
          if (r.akce === "Přidání stavby" && r.detail === (row.nazev_stavby || "")) return true;
          const match = r.detail.match(/^ID:\s*(\d+)[,\s]/);
          return match && match[1] === idStr;
        });
        setZaznamy(filtered);
        // Označ jako přečtené — zhasne červenou tečku pro tuto stavbu
        if (onPrecteno) onPrecteno(row.id);
      } catch { setZaznamy([]); }
      finally { setLoading(false); }
    };
    load();
  }, [row.id, row.nazev_stavby, isDemo]);

  const fmtCas = (cas) => {
    if (!cas) return "";
    const d = new Date(cas);
    return d.toLocaleString("cs-CZ", { day: "2-digit", month: "2-digit", year: "2-digit", hour: "2-digit", minute: "2-digit" });
  };

  const parseDetail = (detail) => {
    if (!detail) return null;
    try {
      const jsonStart = detail.indexOf("{");
      if (jsonStart === -1) return null;
      return JSON.parse(detail.slice(jsonStart));
    } catch { return null; }
  };

  const handleDelete = async (id) => {
    if (isDemo) return;
    setDeleting(true);
    try {
      await sb(`log_aktivit?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ hidden: true }), prefer: "return=minimal" });
      const updated = zaznamy.map(r => r.id === id ? { ...r, hidden: true } : r);
      setZaznamy(updated);
      // Zhasni tečku pokud nejsou žádné aktivní záznamy
      if (updated.every(r => r.hidden) && onAllHidden) onAllHidden(row.id);
    } catch(e) { console.warn("Chyba skrytí:", e); }
    finally { setDeleting(false); setDeleteId(null); }
  };

  const handleUnhide = async (id) => {
    if (!isSuperAdmin || isDemo) return;
    try {
      await sb(`log_aktivit?id=eq.${id}`, { method: "PATCH", body: JSON.stringify({ hidden: false }), prefer: "return=minimal" });
      setZaznamy(prev => prev.map(r => r.id === id ? { ...r, hidden: false } : r));
    } catch(e) { console.warn("Chyba obnovení:", e); }
  };

  const canDelete = (isAdmin || isSuperAdmin) && !isDemo;

  const zobrazeneZaznamy = zaznamy.filter(r => {
    if (zobrazit === "aktivni") return !r.hidden;
    if (zobrazit === "skryte") return r.hidden;
    return true; // vse
  });

  const AKCE_STYLE = {
    "Přidání stavby":  { bg: "rgba(34,197,94,0.15)",  border: "rgba(34,197,94,0.4)",  color: "#4ade80",  icon: "➕" },
    "Editace stavby":  { bg: "rgba(251,191,36,0.12)",  border: "rgba(251,191,36,0.4)", color: "#fbbf24",  icon: "✏️" },
    "Smazání stavby":  { bg: "rgba(239,68,68,0.12)",   border: "rgba(239,68,68,0.4)",  color: "#f87171",  icon: "🗑️" },
  };

  const modalBg  = isDark ? TENANT.modalBg : "#fff";
  const textC    = isDark ? "#e2e8f0" : "#1e293b";
  const mutedC   = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";
  const borderC  = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1300, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ position: "fixed", left: pos.x, top: pos.y, pointerEvents: "all", background: modalBg, borderRadius: 16, width: "min(680px,96vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}`, boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        {/* header — táhlo */}
        <div onMouseDown={onDragStart} style={dragHeaderStyle()}>
          <div>
            <span style={{ color: isDark ? "#fff" : "#1e293b", fontWeight: 700, fontSize: 15 }}>🕐 Historie změn{dragHint}</span>
            <div style={{ color: mutedC, fontSize: 12, marginTop: 2 }}>{row.cislo_stavby && <span style={{ fontWeight: 700, color: isDark ? TENANT.p3 : TENANT.p1 }}>{row.cislo_stavby} · </span>}{row.nazev_stavby}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {isSuperAdmin && (
              <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 7, overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
                {[["aktivni","Aktivní"],["skryte","Skryté"],["vse","Vše"]].map(([val, label]) => (
                  <button key={val} onClick={() => setZobrazit(val)} style={{ padding: "4px 10px", background: zobrazit === val ? (isDark ? tc1(0.4) : tc1(0.15)) : "transparent", border: "none", color: zobrazit === val ? TENANT.p3 : mutedC, cursor: "pointer", fontSize: 11, fontWeight: zobrazit === val ? 700 : 400 }}>{label}</button>
                ))}
              </div>
            )}
            <button onClick={onClose} onMouseDown={e => e.stopPropagation()} style={{ background: "none", border: "none", color: mutedC, fontSize: 20, cursor: "pointer", lineHeight: 1, marginLeft: 4 }}>✕</button>
          </div>
        </div>

        {/* obsah */}
        <div style={{ overflowY: "auto", flex: 1, padding: "16px 22px" }}>
          {loading && <div style={{ textAlign: "center", color: mutedC, padding: 40 }}>Načítám historii...</div>}
          {!loading && zaznamy.length === 0 && (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>📭</div>
              <div style={{ color: mutedC, fontSize: 14 }}>{isDemo ? "Demo režim — historie se neukládá" : "Žádné záznamy v historii"}</div>
              {isDemo && <div style={{ color: mutedC, fontSize: 12, marginTop: 6 }}>V ostré verzi se zde zobrazí kompletní přehled změn.</div>}
              <div style={{ color: mutedC, fontSize: 12, marginTop: 6 }}>Historie se zapisuje od tohoto buildu.</div>
            </div>
          )}
          {!loading && zaznamy.length > 0 && zobrazeneZaznamy.length === 0 && (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 36, marginBottom: 12 }}>🫙</div>
              <div style={{ color: mutedC, fontSize: 14 }}>
                {zobrazit === "skryte" ? "Žádné skryté záznamy" : "Žádné záznamy"}
              </div>
            </div>
          )}
          {!loading && zobrazeneZaznamy.map((z, i) => {
            const style = AKCE_STYLE[z.akce] || { bg: "rgba(100,116,139,0.1)", border: "rgba(100,116,139,0.3)", color: "#94a3b8", icon: "•" };
            const diff  = parseDetail(z.detail);
            const isHidden = z.hidden;
            return (
              <div key={i} style={{ marginBottom: 12, padding: "12px 14px", background: isHidden ? "rgba(100,116,139,0.06)" : style.bg, border: `1px solid ${isHidden ? "rgba(100,116,139,0.2)" : style.border}`, borderRadius: 10, opacity: isHidden ? 0.6 : 1 }}>
                {/* řádek: ikona akce + čas + uživatel */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: diff ? 10 : 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <span style={{ fontSize: 14 }}>{style.icon}</span>
                    <span style={{ color: isHidden ? mutedC : style.color, fontWeight: 700, fontSize: 13 }}>{z.akce}</span>
                    <span style={{ color: mutedC, fontSize: 12 }}>— {z.uzivatel}</span>
                    {isHidden && <span style={{ fontSize: 10, color: mutedC, background: "rgba(100,116,139,0.15)", padding: "1px 6px", borderRadius: 4, fontWeight: 600 }}>skryto</span>}
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <span style={{ color: mutedC, fontSize: 11, whiteSpace: "nowrap" }}>{fmtCas(z.cas)}</span>
                    {isSuperAdmin && isHidden && !isDemo && (
                      <button onClick={() => handleUnhide(z.id)} title="Obnovit záznam" style={{ background: "none", border: "none", color: "rgba(34,197,94,0.5)", cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 700, transition: "color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#4ade80"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(34,197,94,0.5)"}
                      >↩</button>
                    )}
                    {canDelete && !isHidden && (
                      <button onClick={() => setDeleteId(z.id)} title="Skrýt záznam" style={{ background: "none", border: "none", color: "rgba(239,68,68,0.4)", cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 700, transition: "color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(239,68,68,0.4)"}
                      >✕</button>
                    )}
                  </div>
                </div>
                {/* diff tabulka */}
                {diff && diff.zmeny && diff.zmeny.length > 0 && (
                  <div style={{ marginTop: 8 }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
                      <thead>
                        <tr>
                          {["Pole","Původní hodnota","Nová hodnota"].map(h => (
                            <th key={h} style={{ padding: "4px 8px", textAlign: "left", color: mutedC, fontWeight: 700, fontSize: 10, borderBottom: `1px solid ${borderC}` }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {diff.zmeny.map((z2, j) => (
                          <tr key={j} style={{ borderBottom: `1px solid ${borderC}` }}>
                            <td style={{ padding: "4px 8px", color: mutedC, fontSize: 11, fontWeight: 600, whiteSpace: "nowrap" }}>{FIELD_LABELS[z2.pole] || z2.pole}</td>
                            <td style={{ padding: "4px 8px", color: "#f87171", fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z2.stare === "" || z2.stare == null ? <em style={{ opacity: 0.5 }}>prázdné</em> : String(z2.stare)}</td>
                            <td style={{ padding: "4px 8px", color: "#4ade80", fontSize: 11, maxWidth: 180, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{z2.nove === "" || z2.nove == null ? <em style={{ opacity: 0.5 }}>prázdné</em> : String(z2.nove)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {/* starý formát detailu bez diffu */}
                {!diff && z.detail && <div style={{ color: mutedC, fontSize: 11, marginTop: 4 }}>{z.detail}</div>}
              </div>
            );
          })}
        </div>

        <div style={{ padding: "12px 22px", borderTop: `1px solid ${borderC}`, display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center" }}>
          <div style={{ display: "flex", gap: 8 }}>
            {/* PDF export */}
            <button onClick={() => {
              const rows = zaznamy.map((z, i) => {
                const diff = (() => { try { const s = z.detail?.indexOf("{"); return s >= 0 ? JSON.parse(z.detail.slice(s)) : null; } catch { return null; } })();
                const cas = z.cas ? new Date(z.cas).toLocaleString("cs-CZ") : "";
                const akceColor = z.akce === "Přidání stavby" ? "#166534" : z.akce === "Editace stavby" ? "#854D0E" : z.akce === "Smazání stavby" ? "#991B1B" : "#1e293b";
                const akceBg    = z.akce === "Přidání stavby" ? "#dcfce7" : z.akce === "Editace stavby" ? "#fef9c3" : z.akce === "Smazání stavby" ? "#fee2e2" : "#f8fafc";
                const zmenyHtml = diff?.zmeny?.length ? `<table style="width:100%;border-collapse:collapse;margin-top:6px;font-size:10px"><thead><tr><th style="background:#e2e8f0;padding:3px 6px;text-align:left">Pole</th><th style="background:#e2e8f0;padding:3px 6px;text-align:left;color:#991b1b">Původní</th><th style="background:#e2e8f0;padding:3px 6px;text-align:left;color:#166534">Nová</th></tr></thead><tbody>${diff.zmeny.map(z2 => `<tr><td style="padding:3px 6px;border-bottom:1px solid #e2e8f0">${FIELD_LABELS[z2.pole]||z2.pole}</td><td style="padding:3px 6px;border-bottom:1px solid #e2e8f0;color:#991b1b">${z2.stare??""}</td><td style="padding:3px 6px;border-bottom:1px solid #e2e8f0;color:#166534">${z2.nove??""}</td></tr>`).join("")}</tbody></table>` : "";
                return `<tr><td style="padding:8px 10px;background:${akceBg};border:1px solid #e2e8f0;vertical-align:top;white-space:nowrap;font-size:11px;color:${akceColor};font-weight:700">${z.akce||""}</td><td style="padding:8px 10px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #e2e8f0;vertical-align:top;white-space:nowrap;font-size:11px">${cas}</td><td style="padding:8px 10px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #e2e8f0;vertical-align:top;font-size:11px">${z.uzivatel||""}</td><td style="padding:8px 10px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #e2e8f0;vertical-align:top;font-size:11px">${zmenyHtml || (z.detail||"")}</td></tr>`;
              }).join("");
              const w = window.open("","_blank");
              w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Historie – ${row.nazev_stavby}</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}h2{margin:0 0 2px;font-size:14px}p{margin:0 0 10px;color:#64748b;font-size:10px}table{width:100%;border-collapse:collapse}th{background:${TENANT.p1deep};color:#fff;padding:7px 10px;text-align:left;font-size:11px}@media print{button{display:none}}</style></head><body><h2>🕐 Historie změn – ${row.cislo_stavby||""} ${row.nazev_stavby||""}</h2><p>Vygenerováno: ${new Date().toLocaleDateString("cs-CZ")} | ${zaznamy.length} záznamů</p><table><thead><tr><th>Akce</th><th>Datum a čas</th><th>Uživatel</th><th>Detail změn</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>`);
              w.document.close();
            }} style={{ padding: "7px 14px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🖨️ PDF tisk</button>

            {/* XLSX export — jako HTML tabulka (.xls) */}
            <button onClick={() => {
              const headers = `<tr><th style="background:${TENANT.p1deep};color:#fff;padding:6px 10px;border:1px solid ${TENANT.p1};font-size:10px">Akce</th><th style="background:${TENANT.p1deep};color:#fff;padding:6px 10px;border:1px solid ${TENANT.p1};font-size:10px">Datum a čas</th><th style="background:${TENANT.p1deep};color:#fff;padding:6px 10px;border:1px solid ${TENANT.p1};font-size:10px">Uživatel</th><th style="background:${TENANT.p1deep};color:#fff;padding:6px 10px;border:1px solid ${TENANT.p1};font-size:10px">Detail změn</th></tr>`;
              const AKCE_BG = { "Přidání stavby":"#dcfce7","Editace stavby":"#fef9c3","Smazání stavby":"#fee2e2" };
              const rows = zaznamy.map((z, i) => {
                const cas = z.cas ? new Date(z.cas).toLocaleString("cs-CZ") : "";
                const bg = AKCE_BG[z.akce] || (i%2===0?"#f8fafc":"#fff");
                const diff = (() => { try { const s = z.detail?.indexOf("{"); return s>=0 ? JSON.parse(z.detail.slice(s)) : null; } catch { return null; } })();
                const detail = diff?.zmeny?.map(x => `${FIELD_LABELS[x.pole]||x.pole}: ${x.stare} → ${x.nove}`).join("; ") || z.detail || "";
                return `<tr><td style="padding:5px 8px;background:${bg};border:1px solid #E2E8F0;font-size:10px;font-weight:700">${z.akce||""}</td><td style="padding:5px 8px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #E2E8F0;font-size:10px;white-space:nowrap">${cas}</td><td style="padding:5px 8px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #E2E8F0;font-size:10px">${z.uzivatel||""}</td><td style="padding:5px 8px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #E2E8F0;font-size:10px">${detail}</td></tr>`;
              }).join("");
              const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table><thead>${headers}</thead><tbody>${rows}</tbody></table></body></html>`;
              const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
              a.download = `historie_${row.cislo_stavby||row.id}_${new Date().toISOString().slice(0,10)}.xls`; a.click();
            }} style={{ padding: "7px 14px", background: "rgba(34,197,94,0.12)", border: "1px solid rgba(34,197,94,0.3)", borderRadius: 7, color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📊 Excel</button>
          </div>
          <button onClick={onClose} style={{ padding: "8px 20px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Zavřít</button>
        </div>

        {/* POTVRZENÍ SMAZÁNÍ */}
        {deleteId && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9200, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
            <div style={{ background: TENANT.modalBg, borderRadius: 14, padding: "28px 32px", width: 340, border: "1px solid rgba(239,68,68,0.4)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>👁️</div>
              <h3 style={{ color: "#fff", margin: "0 0 8px", fontSize: 15 }}>Skrýt záznam historie?</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", margin: "0 0 22px", fontSize: 13 }}>Záznam bude skryt. Superadmin ho může kdykoli obnovit.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setDeleteId(null)} disabled={deleting} style={{ padding: "9px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer" }}>Zrušit</button>
                <button onClick={() => handleDelete(deleteId)} disabled={deleting} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#d97706,#b45309)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 700 }}>{deleting ? "Skrývám..." : "Skrýt"}</button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LOG MODAL (kompletní log zakázek pro admina)
// ============================================================
function LogModal({ isDark, firmy, onClose, isDemo, isAdmin, isSuperAdmin }) {
  const [zaznamy, setZaznamy] = useState([]);
  const [loading, setLoading] = useState(true);
  const { pos, onMouseDown: onDragStart } = useDraggable(1100, 580);
  const [filterUser, setFilterUser]   = useState("");
  const [filterAkce, setFilterAkce]   = useState("");
  const [filterOd,   setFilterOd]     = useState("");
  const [filterDo,   setFilterDo]     = useState("");
  const [deleteId, setDeleteId]       = useState(null);
  const [deleting, setDeleting]       = useState(false);
  const [zobrazit, setZobrazit]       = useState("aktivni"); // "aktivni" | "skryte" | "vse"

  const AKCE_ZAKÁZKY = ["Přidání stavby","Editace stavby","Smazání stavby"];
  const [totalLoaded, setTotalLoaded] = useState(0);

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

  const users  = [...new Set(zaznamy.map(r => r.uzivatel).filter(Boolean))];
  const akceList = [...new Set(zaznamy.map(r => r.akce).filter(Boolean))];

  const filtered = zaznamy.filter(r => {
    if (filterUser && r.uzivatel !== filterUser) return false;
    if (filterAkce && r.akce !== filterAkce) return false;
    if (filterOd) { const d = new Date(r.cas); const od = new Date(filterOd); if (d < od) return false; }
    if (filterDo) { const d = new Date(r.cas); const doo = new Date(filterDo); doo.setHours(23,59,59); if (d > doo) return false; }
    if (zobrazit === "aktivni") return !r.hidden;
    if (zobrazit === "skryte") return r.hidden;
    return true;
  });

  const fmtCas = (cas) => cas ? new Date(cas).toLocaleString("cs-CZ", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" }) : "";

  const parseDetail = (detail) => {
    if (!detail) return null;
    try { const s = detail.indexOf("{"); return s >= 0 ? JSON.parse(detail.slice(s)) : null; } catch { return null; }
  };

  const AKCE_STYLE = {
    "Přidání stavby":  { bg: "rgba(34,197,94,0.12)",  border: "rgba(34,197,94,0.35)",  color: "#4ade80",  pdfBg: "#dcfce7", pdfColor: "#166534" },
    "Editace stavby":  { bg: "rgba(251,191,36,0.1)",   border: "rgba(251,191,36,0.35)", color: "#fbbf24",  pdfBg: "#fef9c3", pdfColor: "#854D0E" },
    "Smazání stavby":  { bg: "rgba(239,68,68,0.1)",    border: "rgba(239,68,68,0.35)",  color: "#f87171",  pdfBg: "#fee2e2", pdfColor: "#991B1B" },
  };

  const modalBg = isDark ? TENANT.modalBg : "#fff";
  const textC   = isDark ? "#e2e8f0" : "#1e293b";
  const mutedC  = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.45)";
  const borderC = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
  const inputS  = { padding: "6px 10px", background: isDark ? TENANT.inputBg : "#f8fafc", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, borderRadius: 7, color: textC, fontSize: 12, outline: "none" };

  // ── exporty ──────────────────────────────────────────────
  const doXLSX = () => {
    const headers = `<tr><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Akce</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Datum a čas</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Uživatel</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Název stavby</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Detail změn</th></tr>`;
    const rows = filtered.map((z, i) => {
      const diff = parseDetail(z.detail);
      const zmenyText = diff?.zmeny?.map(x => `${FIELD_LABELS[x.pole]||x.pole}: ${x.stare} → ${x.nove}`).join("; ") || z.detail || "";
      const nazev = diff?.nazev || z.detail?.replace(/^ID:\s*\d+,\s*/,"").split(" {")[0] || "";
      const rowBg = i%2===0 ? "#f8fafc" : "#fff";
      return `<tr><td style="padding:5px 10px;background:${rowBg};border:1px solid #E2E8F0;font-size:10px;font-weight:700">${z.akce||""}</td><td style="padding:5px 10px;background:${rowBg};border:1px solid #E2E8F0;font-size:10px;white-space:nowrap">${fmtCas(z.cas)}</td><td style="padding:5px 10px;background:${rowBg};border:1px solid #E2E8F0;font-size:10px">${z.uzivatel||""}</td><td style="padding:5px 10px;background:${rowBg};border:1px solid #E2E8F0;font-size:10px">${nazev}</td><td style="padding:5px 10px;background:${rowBg};border:1px solid #E2E8F0;font-size:10px">${zmenyText}</td></tr>`;
    }).join("");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table><thead>${headers}</thead><tbody>${rows}</tbody></table></body></html>`;
    const ts = new Date().toISOString().slice(0,10);
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `log_zakazek_${ts}.xls`; a.click();
  };

  const doXLSColor = () => {
    const headers = `<tr><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Akce</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Datum a čas</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Uživatel</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Název stavby</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Detail změn</th></tr>`;
    const rows = filtered.map((z, i) => {
      const st = AKCE_STYLE[z.akce] || {};
      const diff = parseDetail(z.detail);
      const zmenyText = diff?.zmeny?.map(x => `${FIELD_LABELS[x.pole]||x.pole}: ${x.stare} → ${x.nove}`).join("; ") || z.detail || "";
      const nazev = diff?.nazev || z.detail?.replace(/^ID:\s*\d+,\s*/,"").split(" {")[0] || "";
      const rowBg = i%2===0 ? "#f8fafc" : "#fff";
      return `<tr><td style="padding:5px 10px;background:${st.pdfBg||rowBg};color:${st.pdfColor||"#1e293b"};font-weight:700;border:1px solid #E2E8F0;white-space:nowrap;font-size:10px">${z.akce||""}</td><td style="padding:5px 10px;background:${rowBg};border:1px solid #E2E8F0;white-space:nowrap;font-size:10px">${fmtCas(z.cas)}</td><td style="padding:5px 10px;background:${rowBg};border:1px solid #E2E8F0;font-size:10px">${z.uzivatel||""}</td><td style="padding:5px 10px;background:${rowBg};border:1px solid #E2E8F0;font-size:10px">${nazev}</td><td style="padding:5px 10px;background:${rowBg};border:1px solid #E2E8F0;font-size:10px">${zmenyText}</td></tr>`;
    }).join("");
    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table><thead>${headers}</thead><tbody>${rows}</tbody></table></body></html>`;
    const ts = new Date().toISOString().slice(0,10);
    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `log_zakazek_barevny_${ts}.xls`; a.click();
  };

  const doPDF = () => {
    const rows = filtered.map((z, i) => {
      const st = AKCE_STYLE[z.akce] || {};
      const diff = parseDetail(z.detail);
      const zmenyHtml = diff?.zmeny?.length
        ? `<div style="margin-top:4px;font-size:9px">${diff.zmeny.map(x => `<span style="color:#64748b">${FIELD_LABELS[x.pole]||x.pole}:</span> <span style="color:#991b1b">${x.stare}</span> → <span style="color:#166534">${x.nove}</span>`).join(" &nbsp;|&nbsp; ")}</div>`
        : `<div style="color:#64748b;font-size:9px">${z.detail||""}</div>`;
      const nazev = diff?.nazev || z.detail?.replace(/^ID:\s*\d+,\s*/,"").split(" {")[0] || "";
      const rowBg = i%2===0 ? "#f8fafc" : "#fff";
      return `<tr><td style="padding:6px 8px;background:${st.pdfBg||rowBg};color:${st.pdfColor||"#1e293b"};font-weight:700;border:1px solid #e2e8f0;white-space:nowrap;font-size:10px;vertical-align:top">${z.akce||""}</td><td style="padding:6px 8px;background:${rowBg};border:1px solid #e2e8f0;white-space:nowrap;font-size:10px;vertical-align:top">${fmtCas(z.cas)}</td><td style="padding:6px 8px;background:${rowBg};border:1px solid #e2e8f0;font-size:10px;vertical-align:top">${z.uzivatel||""}</td><td style="padding:6px 8px;background:${rowBg};border:1px solid #e2e8f0;font-size:10px;vertical-align:top"><div style="font-weight:600">${nazev}</div>${zmenyHtml}</td></tr>`;
    }).join("");
    const w = window.open("","_blank");
    w.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Log zakázek</title><style>@page{size:A4 landscape;margin:10mm}body{font-family:Arial,sans-serif;font-size:11px;color:#1e293b;-webkit-print-color-adjust:exact;print-color-adjust:exact}h2{margin:0 0 2px;font-size:14px}p{margin:0 0 10px;color:#64748b;font-size:10px}table{width:100%;border-collapse:collapse}th{background:${TENANT.p1deep};color:#fff;padding:7px 10px;text-align:left;font-size:10px}@media print{button{display:none}}</style></head><body><h2>📜 Log zakázek – ${TENANT.nazev}</h2><p>Vygenerováno: ${new Date().toLocaleDateString("cs-CZ")} | ${filtered.length} záznamů${filterUser?" | Uživatel: "+filterUser:""}${filterAkce?" | Akce: "+filterAkce:""}</p><table><thead><tr><th>Akce</th><th>Datum a čas</th><th>Uživatel</th><th>Název stavby / Detail</th></tr></thead><tbody>${rows}</tbody></table><script>window.onload=function(){window.print();window.onafterprint=function(){window.close()}}<\/script></body></html>`);
    w.document.close();
  };

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

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1250, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ position: "fixed", left: pos.x, top: pos.y, pointerEvents: "all", background: modalBg, borderRadius: 16, width: "min(1100px,98vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}`, boxShadow: "0 32px 80px rgba(0,0,0,0.65)" }}>

        {/* header — táhlo */}
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

        {/* RLS varování pokud se zdá že vidíme jen své záznamy */}
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
                  <button onClick={() => { navigator.clipboard.writeText('CREATE POLICY "admin_read_all" ON log_aktivit FOR SELECT USING (true);'); }} style={{ padding: "4px 10px", background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 5, color: "#fbbf24", cursor: "pointer", fontSize: 10, fontWeight: 700, whiteSpace: "nowrap" }}>📋 Kopírovat</button>
                </div>
              </div>
            </div>
          );
          return null;
        })()}

        {/* filtry */}
        <div style={{ padding: "10px 22px", borderBottom: `1px solid ${borderC}`, display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <select value={filterUser} onChange={e => setFilterUser(e.target.value)} style={inputS}>
            <option value="">Všichni uživatelé</option>
            {users.map(u => <option key={u} value={u}>{u}</option>)}
          </select>
          <select value={filterAkce} onChange={e => setFilterAkce(e.target.value)} style={inputS}>
            <option value="">Všechny akce</option>
            {akceList.map(a => <option key={a} value={a}>{a}</option>)}
          </select>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: mutedC, fontSize: 12 }}>Od:</span>
            <input type="date" value={filterOd} onChange={e => setFilterOd(e.target.value)} style={inputS} />
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: mutedC, fontSize: 12 }}>Do:</span>
            <input type="date" value={filterDo} onChange={e => setFilterDo(e.target.value)} style={inputS} />
          </div>
          {(filterUser||filterAkce||filterOd||filterDo) && (
            <button onClick={() => { setFilterUser(""); setFilterAkce(""); setFilterOd(""); setFilterDo(""); }} style={{ padding: "6px 12px", background: "rgba(239,68,68,0.12)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 12 }}>✕ Reset</button>
          )}
          <span style={{ marginLeft: "auto", color: mutedC, fontSize: 12, fontWeight: 600 }}>{filtered.length} záznamů</span>
        </div>

        {/* seznam */}
        <div style={{ overflowY: "auto", flex: 1, padding: "12px 22px" }}>
          {loading && <div style={{ textAlign: "center", color: mutedC, padding: 40 }}>Načítám log...</div>}
          {!loading && filtered.length === 0 && (
            <div style={{ textAlign: "center", padding: 48 }}>
              <div style={{ fontSize: 32, marginBottom: 10 }}>📭</div>
              <div style={{ color: mutedC, fontSize: 14 }}>{isDemo ? "Demo režim — log se neukládá do databáze" : "Žádné záznamy"}</div>
              {isDemo && <div style={{ color: mutedC, fontSize: 12, marginTop: 6 }}>V ostré verzi se zde zobrazí veškeré akce na zakázkách.</div>}
            </div>
          )}
          {!loading && filtered.map((z, i) => {
            const st   = AKCE_STYLE[z.akce] || { bg: "rgba(100,116,139,0.08)", border: "rgba(100,116,139,0.2)", color: "#94a3b8" };
            const diff = parseDetail(z.detail);
            const nazev = diff?.nazev || z.detail?.replace(/^ID:\s*\d+,\s*/,"").split(" {")[0] || "";
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
                      <button onClick={() => handleUnhideLog(z.id)} title="Obnovit záznam" style={{ background: "none", border: "none", color: "rgba(34,197,94,0.5)", cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 700, transition: "color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#4ade80"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(34,197,94,0.5)"}
                      >↩</button>
                    )}
                    {isSuperAdmin && !isHidden && !isDemo && (
                      <button onClick={() => setDeleteId(z.id)} title="Skrýt záznam" style={{ background: "none", border: "none", color: "rgba(239,68,68,0.4)", cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 700, transition: "color 0.15s" }}
                        onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                        onMouseLeave={e => e.currentTarget.style.color = "rgba(239,68,68,0.4)"}
                      >✕</button>
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

        {/* footer — exporty */}
        <div style={{ padding: "12px 22px", borderTop: `1px solid ${borderC}`, display: "flex", gap: 8, justifyContent: "space-between", alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <button onClick={doXLSX}     style={{ padding: "7px 14px", background: "rgba(34,197,94,0.12)",  border: "1px solid rgba(34,197,94,0.3)",  borderRadius: 7, color: "#4ade80", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📊 XLSX</button>
            <button onClick={doXLSColor} style={{ padding: "7px 14px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 7, color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🎨 Barevný Excel</button>
            <button onClick={doPDF}      style={{ padding: "7px 14px", background: "rgba(239,68,68,0.12)",  border: "1px solid rgba(239,68,68,0.3)",  borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>🖨️ PDF tisk</button>
            <button onClick={() => {
              const headers = `<tr><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Akce</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Datum a čas</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Uživatel</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Název stavby</th><th style="background:${TENANT.p1deep};color:#fff;padding:7px 10px;border:1px solid ${TENANT.p1};font-size:11px">Detail změn</th></tr>`;
              const AKCE_BG = { "Přidání stavby":"#dcfce7","Editace stavby":"#fef9c3","Smazání stavby":"#fee2e2" };
              const rows = filtered.map((z, i) => {
                const diff = (() => { try { const s = z.detail?.indexOf("{"); return s>=0 ? JSON.parse(z.detail.slice(s)) : null; } catch { return null; } })();
                const zmenyText = diff?.zmeny?.map(x => `${FIELD_LABELS[x.pole]||x.pole}: ${x.stare} → ${x.nove}`).join("; ") || z.detail || "";
                const nazev = diff?.nazev || z.detail?.replace(/^ID:\s*\d+,\s*/,"").split(" {")[0] || "";
                const bg = AKCE_BG[z.akce] || (i%2===0?"#f8fafc":"#fff");
                const cas = z.cas ? new Date(z.cas).toLocaleString("cs-CZ") : "";
                return `<tr><td style="padding:5px 10px;background:${bg};border:1px solid #E2E8F0;font-size:10px;font-weight:700">${z.akce||""}</td><td style="padding:5px 10px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #E2E8F0;font-size:10px;white-space:nowrap">${cas}</td><td style="padding:5px 10px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #E2E8F0;font-size:10px">${z.uzivatel||""}</td><td style="padding:5px 10px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #E2E8F0;font-size:10px">${nazev}</td><td style="padding:5px 10px;background:${i%2===0?"#f8fafc":"#fff"};border:1px solid #E2E8F0;font-size:10px">${zmenyText}</td></tr>`;
              }).join("");
              const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office"><head><meta charset="utf-8"></head><body><table><thead>${headers}</thead><tbody>${rows}</tbody></table></body></html>`;
              const ts = new Date().toISOString().slice(0,10);
              const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
              const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `log_zakazek_${ts}.xls`; a.click();
            }} style={{ padding: "7px 14px", background: "rgba(96,165,250,0.12)", border: "1px solid rgba(96,165,250,0.3)", borderRadius: 7, color: TENANT.p3, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📜 Export logu</button>
          </div>
          <button onClick={onClose} style={{ padding: "8px 20px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Zavřít</button>
        </div>

        {/* POTVRZENÍ SMAZÁNÍ ZÁZNAMU LOGU */}
        {deleteId && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 9200, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
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

// ============================================================
// GRAF MODAL
// ============================================================
function GrafModal({ data, firmy, isDark, onClose }) {
  const [mode, setMode] = useState("firma"); // "firma" | "mesic" | "kat" | "kolac" | "trend"
  const { pos, onMouseDown: onDragStart } = useDraggable(1400, 700);

  const firmaColorMap = Object.fromEntries(firmy.map(f => [f.hodnota, f.barva || TENANT.p2]));

  // KAT I = ps_i + snk_i + bo_i   |   KAT II = ps_ii + bo_ii + poruch
  const katI  = r => (Number(r.ps_i)||0) + (Number(r.snk_i)||0) + (Number(r.bo_i)||0);
  const katII = r => (Number(r.ps_ii)||0) + (Number(r.bo_ii)||0) + (Number(r.poruch)||0);

  const grafData = useMemo(() => {
    if (mode === "firma") {
      const map = {};
      data.forEach(r => {
        const key = r.firma || "Bez firmy";
        if (!map[key]) map[key] = { name: key, nabidka: 0, vyfakturovano: 0, zrealizovano: 0 };
        map[key].nabidka      += Number(r.nabidka) || 0;
        map[key].vyfakturovano += Number(r.vyfakturovano) || 0;
        map[key].zrealizovano  += Number(r.zrealizovano) || 0;
      });
      return Object.values(map);
    } else if (mode === "mesic") {
      const map = {};
      data.forEach(r => {
        if (!r.ze_dne) return;
        const parts = r.ze_dne.trim().split(".");
        if (parts.length < 3) return;
        const key   = `${parts[2]}-${parts[1].padStart(2,"0")}`;
        const label = `${parts[1]}/${parts[2]}`;
        if (!map[key]) map[key] = { name: label, _sort: key, nabidka: 0, vyfakturovano: 0, zrealizovano: 0 };
        map[key].nabidka      += Number(r.nabidka) || 0;
        map[key].vyfakturovano += Number(r.vyfakturovano) || 0;
        map[key].zrealizovano  += Number(r.zrealizovano) || 0;
      });
      return Object.values(map).sort((a, b) => a._sort.localeCompare(b._sort));
    } else {
      // mode === "kat" — každá firma, rozpad na jednotlivé složky
      const firmaKeys = [...new Set(data.map(r => r.firma || "Bez firmy"))];
      return firmaKeys.map(firma => {
        const rows = data.filter(r => (r.firma || "Bez firmy") === firma);
        return {
          name: firma,
          ps_i:  rows.reduce((s,r) => s+(Number(r.ps_i)||0),  0),
          snk_i: rows.reduce((s,r) => s+(Number(r.snk_i)||0), 0),
          bo_i:  rows.reduce((s,r) => s+(Number(r.bo_i)||0),  0),
          ps_ii: rows.reduce((s,r) => s+(Number(r.ps_ii)||0), 0),
          bo_ii: rows.reduce((s,r) => s+(Number(r.bo_ii)||0), 0),
          poruch:rows.reduce((s,r) => s+(Number(r.poruch)||0),0),
          kat1:  rows.reduce((s,r) => s+katI(r),  0),
          kat2:  rows.reduce((s,r) => s+katII(r), 0),
        };
      });
    }
  }, [data, mode]);

  const fmtTick = (v) => v >= 1000000 ? `${(v/1000000).toFixed(1)}M` : v >= 1000 ? `${(v/1000).toFixed(0)}k` : String(v);
  const fmtVal  = (v) => Number(v).toLocaleString("cs-CZ", { minimumFractionDigits: 0 });

  const modalBg = isDark ? TENANT.modalBg : "#fff";
  const textC   = isDark ? "#e2e8f0" : "#1e293b";
  const mutedC  = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const gridC   = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";

  const renderBars = () => {
    const isKat  = mode === "kat";
    // Kat mode: 2 skupiny sloupků (I a II), každá stacked ze složek
    // Složky Kat. I: ps_i=#818cf8, snk_i=#38bdf8, bo_i=#4ade80
    // Složky Kat. II: ps_ii=#fb923c, bo_ii=#f87171, poruch=#e879f9
    const KAT_I_KEYS   = ["ps_i","snk_i","bo_i"];
    const KAT_II_KEYS  = ["ps_ii","bo_ii","poruch"];
    const KAT_I_COLORS = ["#818cf8","#38bdf8","#4ade80"];
    const KAT_II_COLORS= ["#fb923c","#f87171","#e879f9"];
    const KAT_I_LABELS = ["Plán. I","SNK","Běžné op. I"];
    const KAT_II_LABELS= ["Plán. II","Běžné op. II","Poruchy"];

    const KEYS    = isKat ? ["kat1","kat2"] : ["nabidka","vyfakturovano","zrealizovano"];
    const LABELS  = isKat ? ["Kat. I","Kat. II"] : ["Nabídka","Vyfakturováno","Zrealizováno"];
    const COLORS  = isKat ? ["#818cf8","#fb923c"] : [TENANT.p3,"#4ade80","#fbbf24"];

    const maxVal = Math.max(...grafData.map(d => isKat
      ? Math.max(
          KAT_I_KEYS.reduce((s,k)=>s+(d[k]||0),0),
          KAT_II_KEYS.reduce((s,k)=>s+(d[k]||0),0)
        )
      : Math.max(...KEYS.map(k => d[k] || 0))
    ), 1);

    const W = 700, H = 280, PAD_L = 68, PAD_B = 30, PAD_T = 20, PAD_R = 20;
    const chartW = W - PAD_L - PAD_R;
    const chartH = H - PAD_T - PAD_B;
    const groupW = chartW / Math.max(grafData.length, 1);
    const numBars = isKat ? 2 : KEYS.length;
    const barW = Math.min(Math.max(10, groupW / (numBars + 1) - 2), 36);
    const scaleY = v => PAD_T + chartH - (v / maxVal) * chartH;
    const offsets = Array.from({length: numBars}, (_,ki) => (ki - (numBars-1)/2) * (barW + 4));

    return (
      <>
      <svg viewBox={`0 0 ${W} ${H}`} style={{ width: "100%", height: 280, minWidth: 500 }}>
        {/* grid */}
        {[0, 0.25, 0.5, 0.75, 1].map(p => {
          const y = PAD_T + p * chartH;
          return <g key={p}>
            <line x1={PAD_L} x2={W - PAD_R} y1={y} y2={y} stroke={gridC} strokeWidth={1}/>
            <text x={PAD_L - 6} y={y + 4} textAnchor="end" fill={mutedC} fontSize={9}>{fmtTick(maxVal * (1 - p))}</text>
          </g>;
        })}
        <line x1={PAD_L} x2={W - PAD_R} y1={PAD_T + chartH} y2={PAD_T + chartH} stroke={isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.2)"} strokeWidth={1}/>
        {/* bars */}
        {grafData.map((d, gi) => {
          const cx = PAD_L + gi * groupW + groupW / 2;
          if (isKat) {
            // Stacked bars pro KAT I a KAT II
            return [
              { keys: KAT_I_KEYS,  colors: KAT_I_COLORS,  off: offsets[0] },
              { keys: KAT_II_KEYS, colors: KAT_II_COLORS, off: offsets[1] },
            ].map(({ keys, colors, off }, gi2) => {
              let stackY = PAD_T + chartH;
              return keys.map((k, ki) => {
                const val = d[k] || 0;
                if (val <= 0) return null;
                const bh = Math.max(2, (val / maxVal) * chartH);
                stackY -= bh;
                return <rect key={k} x={cx + off - barW/2} y={stackY} width={barW} height={bh} fill={colors[ki]} rx={ki === keys.length-1 ? 3 : 0} opacity={0.9}/>;
              });
            });
          }
          // Normal grouped bars
          return KEYS.map((k, ki) => {
            const val = d[k] || 0;
            const bh  = Math.max(1, (val / maxVal) * chartH);
            const by  = scaleY(val);
            const bx  = cx + offsets[ki];
            const fill = mode === "firma" && ki === 0 ? (firmaColorMap[d.name] || COLORS[0]) : COLORS[ki];
            return <rect key={k} x={bx - barW/2} y={by} width={barW} height={bh} fill={fill} rx={3} opacity={0.88}/>;
          });
        })}
        {/* x labels */}
        {grafData.map((d, gi) => {
          const cx  = PAD_L + gi * groupW + groupW / 2;
          const lbl = d.name.length > 16 ? d.name.slice(0, 15) + "…" : d.name;
          return <text key={gi} x={cx} y={H - PAD_B + 18} textAnchor="middle" fill={mutedC} fontSize={11} fontWeight={600}>{lbl}</text>;
        })}
        {/* legend */}
        {isKat ? (
          <g>
            {/* legend moved to HTML below SVG */}
          </g>
        ) : null}
      </svg>
      {/* HTML Legend */}
      {isKat ? (
        <div style={{ display: "flex", gap: 24, padding: "10px 16px 4px", flexWrap: "wrap" }}>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? "#818cf8" : "#4f46e5", marginBottom: 5, letterSpacing: 0.5 }}>── KAT. I ──</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {KAT_I_LABELS.map((l,i) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: KAT_I_COLORS[i], flexShrink: 0 }}/>
                  <span style={{ fontSize: 11, color: mutedC }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontSize: 10, fontWeight: 700, color: isDark ? "#fb923c" : "#ea580c", marginBottom: 5, letterSpacing: 0.5 }}>── KAT. II ──</div>
            <div style={{ display: "flex", gap: 14, flexWrap: "wrap" }}>
              {KAT_II_LABELS.map((l,i) => (
                <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                  <div style={{ width: 11, height: 11, borderRadius: 3, background: KAT_II_COLORS[i], flexShrink: 0 }}/>
                  <span style={{ fontSize: 11, color: mutedC }}>{l}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div style={{ display: "flex", gap: 14, padding: "10px 16px 4px", flexWrap: "wrap" }}>
          {LABELS.map((l,i) => (
            <div key={l} style={{ display: "flex", alignItems: "center", gap: 5 }}>
              <div style={{ width: 11, height: 11, borderRadius: 3, background: COLORS[i], flexShrink: 0 }}/>
              <span style={{ fontSize: 11, color: mutedC }}>{l}</span>
            </div>
          ))}
        </div>
      )}
      </>
    );
  };

  // Souhrn pro kat mode — speciální struktura
  const renderTable = () => {
    if (mode === "kat") {
      const cols = [
        { key: "ps_i",   label: "Plán. I",     color: "#818cf8" },
        { key: "snk_i",  label: "SNK",          color: "#38bdf8" },
        { key: "bo_i",   label: "Běžné op. I",  color: "#4ade80" },
        { key: "ps_ii",  label: "Plán. II",     color: "#fb923c" },
        { key: "bo_ii",  label: "Běžné op. II", color: "#f87171" },
        { key: "poruch", label: "Poruchy",       color: "#e879f9" },
      ];
      return (
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 11 }}>
          <thead>
            <tr style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
              <th style={{ padding: "7px 10px", textAlign: "left", color: mutedC, fontWeight: 700, fontSize: 10, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>Firma</th>
              {cols.map(c => (
                <th key={c.key} style={{ padding: "7px 8px", textAlign: "right", color: c.color, fontWeight: 700, fontSize: 10, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}`, whiteSpace: "nowrap" }}>{c.label}</th>
              ))}
              <th style={{ padding: "7px 10px", textAlign: "right", color: "#818cf8", fontWeight: 700, fontSize: 10, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>Kat. I</th>
              <th style={{ padding: "7px 10px", textAlign: "right", color: "#fb923c", fontWeight: 700, fontSize: 10, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>Kat. II</th>
              <th style={{ padding: "7px 10px", textAlign: "right", color: isDark ? TENANT.p4 : TENANT.p1, fontWeight: 700, fontSize: 10, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>Celkem</th>
            </tr>
          </thead>
          <tbody>
            {grafData.map((d, i) => (
              <tr key={i} style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
                <td style={{ padding: "5px 10px", color: textC, fontWeight: 600, whiteSpace: "nowrap" }}>
                  <span style={{ display: "inline-block", width: 8, height: 8, borderRadius: 2, background: firmaColorMap[d.name] || TENANT.p2, marginRight: 6, verticalAlign: "middle" }}/>
                  {d.name}
                </td>
                {cols.map(c => (
                  <td key={c.key} style={{ padding: "5px 8px", textAlign: "right", color: d[c.key] > 0 ? c.color : mutedC, fontFamily: "monospace", fontSize: 11 }}>{d[c.key] > 0 ? fmtVal(d[c.key]) : "—"}</td>
                ))}
                <td style={{ padding: "5px 10px", textAlign: "right", color: "#818cf8", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{fmtVal(d.kat1)}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", color: "#fb923c", fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{fmtVal(d.kat2)}</td>
                <td style={{ padding: "5px 10px", textAlign: "right", color: isDark ? TENANT.p4 : TENANT.p1, fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{fmtVal((d.kat1||0)+(d.kat2||0))}</td>
              </tr>
            ))}
            <tr style={{ background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)" }}>
              <td style={{ padding: "6px 10px", color: textC, fontWeight: 700, fontSize: 11 }}>CELKEM</td>
              {cols.map(c => (
                <td key={c.key} style={{ padding: "6px 8px", textAlign: "right", color: c.color, fontFamily: "monospace", fontSize: 11, fontWeight: 700 }}>{fmtVal(grafData.reduce((s,d)=>s+(d[c.key]||0),0))}</td>
              ))}
              <td style={{ padding: "6px 10px", textAlign: "right", color: "#818cf8", fontFamily: "monospace", fontWeight: 700 }}>{fmtVal(grafData.reduce((s,d)=>s+(d.kat1||0),0))}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", color: "#fb923c", fontFamily: "monospace", fontWeight: 700 }}>{fmtVal(grafData.reduce((s,d)=>s+(d.kat2||0),0))}</td>
              <td style={{ padding: "6px 10px", textAlign: "right", color: isDark ? TENANT.p4 : TENANT.p1, fontFamily: "monospace", fontWeight: 700 }}>{fmtVal(grafData.reduce((s,d)=>s+(d.kat1||0)+(d.kat2||0),0))}</td>
            </tr>
          </tbody>
        </table>
      );
    }
    // standardní tabulka
    return (
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12 }}>
        <thead>
          <tr style={{ background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)" }}>
            {[mode === "firma" ? "Firma" : "Měsíc", "Nabídka", "Vyfakturováno", "Zrealizováno"].map((h, i) => (
              <th key={h} style={{ padding: "7px 12px", textAlign: i === 0 ? "left" : "right", color: mutedC, fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)"}` }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {grafData.map((d, i) => (
            <tr key={i} style={{ borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)"}` }}>
              <td style={{ padding: "6px 12px", color: textC, fontWeight: 600 }}>
                {mode === "firma" && <span style={{ display: "inline-block", width: 10, height: 10, borderRadius: 2, background: firmaColorMap[d.name] || TENANT.p2, marginRight: 7, verticalAlign: "middle" }}/>}
                {d.name}
              </td>
              {["nabidka","vyfakturovano","zrealizovano"].map(k => (
                <td key={k} style={{ padding: "6px 12px", textAlign: "right", color: isDark ? TENANT.p4 : TENANT.p1, fontFamily: "monospace", fontSize: 12 }}>
                  {fmtVal(d[k])}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  };

  const renderKolac = () => {
    const map = {};
    data.forEach(r => {
      const key = r.firma || "Bez firmy";
      if (!map[key]) map[key] = 0;
      map[key] += Number(r.nabidka) || 0;
    });
    const items = Object.entries(map).filter(([,v]) => v > 0).sort((a,b) => b[1]-a[1]);
    const total = items.reduce((s,[,v]) => s+v, 0);
    if (total === 0) return <div style={{ textAlign:"center", color: mutedC, padding: 48 }}>Žádná data k zobrazení</div>;
    const CX = 110, CY = 110, R = 90, IR = 45;
    let angle = -Math.PI / 2;
    const slices = items.map(([name, val]) => {
      const frac = val / total;
      const a1 = angle, a2 = angle + frac * 2 * Math.PI;
      angle = a2;
      const x1 = CX + R * Math.cos(a1), y1 = CY + R * Math.sin(a1);
      const x2 = CX + R * Math.cos(a2), y2 = CY + R * Math.sin(a2);
      const lg = frac > 0.5 ? 1 : 0;
      return { name, val, frac, x1, y1, x2, y2, lg, a1, a2 };
    });
    const colors = items.map(([name]) => firmaColorMap[name] || TENANT.p2);
    return (
      <div style={{ display:"flex", gap: 32, alignItems:"center", flexWrap:"wrap", padding:"8px 0" }}>
        <svg width={220} height={220} viewBox="0 0 220 220" style={{ flexShrink:0 }}>
          {slices.map((s, i) => (
            <path key={i}
              d={`M${CX},${CY} L${s.x1},${s.y1} A${R},${R} 0 ${s.lg},1 ${s.x2},${s.y2} Z`}
              fill={colors[i]} opacity={0.88}
            />
          ))}
          <circle cx={CX} cy={CY} r={IR} fill={modalBg}/>
          <text x={CX} y={CY-6} textAnchor="middle" fontSize={13} fontWeight={600} fill={isDark?"#fff":"#1e293b"}>{fmtTick(total)}</text>
          <text x={CX} y={CY+10} textAnchor="middle" fontSize={10} fill={mutedC}>celkem</text>
        </svg>
        <div style={{ display:"flex", flexDirection:"column", gap:10 }}>
          {items.map(([name, val], i) => (
            <div key={i} style={{ display:"flex", alignItems:"center", gap:10, fontSize:13 }}>
              <div style={{ width:11, height:11, borderRadius:3, background:colors[i], flexShrink:0 }}/>
              <span style={{ color: isDark?"#e2e8f0":"#1e293b", fontWeight:600 }}>{name}</span>
              <span style={{ color: mutedC, marginLeft:"auto", paddingLeft:16 }}>{Math.round((val/total)*100)} % · {fmtTick(val)}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderTrend = () => {
    const map = {};
    data.forEach(r => {
      if (!r.ze_dne) return;
      const parts = r.ze_dne.trim().split(".");
      if (parts.length < 3) return;
      const key = `${parts[2]}-${parts[1].padStart(2,"0")}`;
      const label = `${parts[1]}/${parts[2]}`;
      if (!map[key]) map[key] = { name: label, _sort: key, vyfakturovano: 0, nabidka: 0 };
      map[key].vyfakturovano += Number(r.vyfakturovano) || 0;
      map[key].nabidka += Number(r.nabidka) || 0;
    });
    const pts = Object.values(map).sort((a,b) => a._sort.localeCompare(b._sort));
    if (pts.length < 2) return <div style={{ textAlign:"center", color: mutedC, padding: 48 }}>Nedostatek dat pro trend (potřeba alespoň 2 měsíce s datem SOD)</div>;
    const maxVal = Math.max(...pts.map(p => Math.max(p.vyfakturovano, p.nabidka)), 1);
    const W = 700, H = 240, PL = 70, PB = 30, PT = 20, PR = 20;
    const cW = W - PL - PR, cH = H - PT - PB;
    const xPos = (i) => PL + i * (cW / (pts.length - 1));
    const yPos = (v) => PT + cH - (v / maxVal) * cH;
    const lineD = (key) => pts.map((p,i) => `${i===0?"M":"L"}${xPos(i)},${yPos(p[key])}`).join(" ");
    const gridC = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";
    return (
      <div>
        <svg viewBox={`0 0 ${W} ${H}`} style={{ width:"100%", height:240, minWidth:400 }}>
          {[0,0.25,0.5,0.75,1].map(p => {
            const y = PT + p * cH;
            return <g key={p}>
              <line x1={PL} x2={W-PR} y1={y} y2={y} stroke={gridC} strokeWidth={1}/>
              <text x={PL-6} y={y+4} textAnchor="end" fill={mutedC} fontSize={9}>{fmtTick(maxVal*(1-p))}</text>
            </g>;
          })}
          <line x1={PL} x2={W-PR} y1={PT+cH} y2={PT+cH} stroke={isDark?"rgba(255,255,255,0.2)":"rgba(0,0,0,0.2)"} strokeWidth={1}/>
          {/* area nabídka */}
          <polygon points={pts.map((p,i) => `${xPos(i)},${yPos(p.nabidka)}`).join(" ")+` ${xPos(pts.length-1)},${PT+cH} ${PL},${PT+cH}`}
            fill={TENANT.p3} fillOpacity={0.1}/>
          {/* area vyfakturováno */}
          <polygon points={pts.map((p,i) => `${xPos(i)},${yPos(p.vyfakturovano)}`).join(" ")+` ${xPos(pts.length-1)},${PT+cH} ${PL},${PT+cH}`}
            fill="#4ade80" fillOpacity={0.15}/>
          {/* linie nabídka */}
          <path d={lineD("nabidka")} fill="none" stroke={TENANT.p3} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
          {/* linie vyfakturováno */}
          <path d={lineD("vyfakturovano")} fill="none" stroke="#4ade80" strokeWidth={2} strokeLinejoin="round" strokeLinecap="round"/>
          {/* body */}
          {pts.map((p,i) => <g key={i}>
            <circle cx={xPos(i)} cy={yPos(p.nabidka)} r={3.5} fill={TENANT.p3}/>
            <circle cx={xPos(i)} cy={yPos(p.vyfakturovano)} r={3.5} fill="#4ade80"/>
            <text x={xPos(i)} y={H-PB+16} textAnchor="middle" fill={mutedC} fontSize={10}>{p.name}</text>
          </g>)}
        </svg>
        <div style={{ display:"flex", gap:18, padding:"6px 0 0 70px", flexWrap:"wrap" }}>
          {[[TENANT.p3,"Nabídka"],["#4ade80","Vyfakturováno"]].map(([c,l]) => (
            <div key={l} style={{ display:"flex", alignItems:"center", gap:6 }}>
              <div style={{ width:11, height:11, borderRadius:3, background:c }}/>
              <span style={{ fontSize:12, color:mutedC }}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1200, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ position: "fixed", left: pos.x, top: pos.y, pointerEvents: "all", background: modalBg, borderRadius: 16, width: "min(1100px,97vw)", maxHeight: "90vh", display: "flex", flexDirection: "column", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.12)"}`, boxShadow: "0 32px 80px rgba(0,0,0,0.6)" }}>
        {/* header — táhlo */}
        <div onMouseDown={onDragStart} style={dragHeaderStyle({ flexWrap: "wrap", gap: 10 })}>
          <div>
            <span style={{ color: isDark ? "#fff" : "#1e293b", fontWeight: 700, fontSize: 15 }}>📊 Graf nákladů{dragHint}</span>
            <div style={{ color: mutedC, fontSize: 11, marginTop: 2 }}>
              {mode === "kat" ? "Kat. I (Plán.+SNK+Běžné op.) vs Kat. II (Plán.+Běžné op.+Poruchy)" : mode === "kolac" ? "Podíl firem na celkové nabídce" : mode === "trend" ? "Vývoj vyfakturování v čase (měsíčně)" : "Nabídka · Vyfakturováno · Zrealizováno"}
            </div>
          </div>
          <div onMouseDown={e => e.stopPropagation()} style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, overflow: "hidden" }}>
              {[["firma","🏢 Firma"],["mesic","📅 Měsíc"],["kat","📂 Kat. I / II"],["kolac","🥧 Podíl firem"],["trend","📈 Trend"]].map(([val, lbl]) => (
                <button key={val} onClick={() => setMode(val)} style={{ padding: "6px 13px", background: mode === val ? (isDark ? tc1(0.4) : tc1(0.15)) : "transparent", border: "none", borderRight: `1px solid ${isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)"}`, color: mode === val ? TENANT.p3 : mutedC, cursor: "pointer", fontSize: 12, fontWeight: mode === val ? 700 : 400, transition: "all 0.15s", whiteSpace: "nowrap" }}>{lbl}</button>
              ))}
            </div>
            <button onClick={onClose} style={{ background: "none", border: "none", color: mutedC, fontSize: 20, cursor: "pointer", lineHeight: 1 }}>✕</button>
          </div>
        </div>
        {/* graf */}
        <div style={{ padding: "16px 22px 8px", overflowX: "hidden", overflowY: "hidden", flexShrink: 0 }}>
          {mode === "kolac" ? renderKolac()
          : mode === "trend" ? renderTrend()
          : grafData.length === 0
            ? <div style={{ textAlign: "center", color: mutedC, padding: 48 }}>Žádná data k zobrazení</div>
            : renderBars()
          }
        </div>
        {/* tabulka — skryta pro koláč a trend */}
        {mode !== "kolac" && mode !== "trend" && (
          <div style={{ padding: "0 22px 18px", flex: 1, overflowY: "auto", overflowX: "hidden" }}>
            {renderTable()}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================
// LOGIN
// ============================================================
function Login({ onLogin, users, onLogAction, appNazev = "Stavby Znojmo" }) {
  const [email, setEmail] = useState("");
  const [pass, setPass] = useState("");
  const [err, setErr] = useState("");
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
              {/* levý stožár */}
              <line x1="28" y1="92" x2="28" y2="18" stroke="#97C459" strokeWidth="3" strokeLinecap="round"/>
              {/* levý příčník horní */}
              <line x1="12" y1="28" x2="44" y2="28" stroke="#97C459" strokeWidth="2.5" strokeLinecap="round"/>
              {/* levý příčník dolní */}
              <line x1="16" y1="42" x2="40" y2="42" stroke="#97C459" strokeWidth="2" strokeLinecap="round"/>
              {/* levé izolátory horní */}
              <circle cx="13" cy="28" r="3" fill="#C0DD97"/>
              <circle cx="43" cy="28" r="3" fill="#C0DD97"/>
              {/* levé izolátory dolní */}
              <circle cx="17" cy="42" r="2.3" fill="#C0DD97"/>
              <circle cx="39" cy="42" r="2.3" fill="#C0DD97"/>
              {/* pravý stožár */}
              <line x1="72" y1="92" x2="72" y2="24" stroke="#639922" strokeWidth="2.5" strokeLinecap="round"/>
              {/* pravý příčník horní */}
              <line x1="58" y1="34" x2="86" y2="34" stroke="#639922" strokeWidth="2" strokeLinecap="round"/>
              {/* pravý příčník dolní */}
              <line x1="61" y1="47" x2="83" y2="47" stroke="#639922" strokeWidth="1.8" strokeLinecap="round"/>
              {/* pravé izolátory */}
              <circle cx="59" cy="34" r="2.3" fill="#97C459"/>
              <circle cx="85" cy="34" r="2.3" fill="#97C459"/>
              <circle cx="62" cy="47" r="1.9" fill="#97C459"/>
              <circle cx="82" cy="47" r="1.9" fill="#97C459"/>
              {/* vedení mezi stožáry horní */}
              <path d="M13,28 Q40,36 59,34" fill="none" stroke="#C0DD97" strokeWidth="1.6" strokeLinecap="round"/>
              <path d="M43,28 Q60,33 85,34" fill="none" stroke="#C0DD97" strokeWidth="1.4" strokeLinecap="round"/>
              {/* vedení dolní */}
              <path d="M17,42 Q40,50 62,47" fill="none" stroke="#97C459" strokeWidth="1.3" strokeLinecap="round"/>
              <path d="M39,42 Q60,48 82,47" fill="none" stroke="#97C459" strokeWidth="1.1" strokeLinecap="round"/>
              {/* hvězdičky */}
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

// ============================================================
// SUMMARY CARDS
// ============================================================
function SummaryCards({ data, firmy, isDark, firmaColors, isMobile }) {
  const sum = (firma, fields) => data.filter(r => r.firma === firma).reduce((a, r) => { fields.forEach(f => a += Number(r[f])||0); return a; }, 0);
  const sumAll = (fields) => data.reduce((a, r) => { fields.forEach(f => a += Number(r[f])||0); return a; }, 0);
  const bg = isDark ? TENANT.appDarkBg : TENANT.appLightBg;
  const textMuted = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const textMain = isDark ? "#fff" : "#1e293b";
  const groupBorder = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.08)";

  const totalI = sumAll(["ps_i","snk_i","bo_i"]);
  const totalII = sumAll(["ps_ii","bo_ii","poruch"]);
  const totalCelkem = totalI + totalII;

  if (isMobile) {
    return (
      <div style={{ background: bg, padding: "8px 10px", display: "flex", flexDirection: "column", gap: 6 }}>
        {/* Celkem — kompaktní řádek */}
        <div style={{ background: isDark ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.4)", borderRadius: 10, padding: "8px 12px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ color: "#f97316", fontSize: 11, fontWeight: 700 }}>CELKEM VŠE</span>
          <span style={{ color: textMain, fontSize: 16, fontWeight: 800 }}>{fmt(totalCelkem)}</span>
          <div style={{ display: "flex", gap: 6 }}>
            <span style={{ fontSize: 10, color: "#f97316" }}>I: <strong style={{ color: textMain }}>{fmt(totalI)}</strong></span>
            <span style={{ fontSize: 10, color: "#f97316" }}>II: <strong style={{ color: textMain }}>{fmt(totalII)}</strong></span>
          </div>
        </div>
        {/* Firmy — kompaktní řádky */}
        {firmy.map((firma) => {
          const color = firmaColors[firma] || TENANT.p1;
          const katI = sum(firma, ["ps_i","snk_i","bo_i"]);
          const katII = sum(firma, ["ps_ii","bo_ii","poruch"]);
          const celkem = katI + katII;
          if (celkem === 0) return null;
          return (
            <div key={firma} style={{ background: isDark ? `${color}12` : `${color}10`, border: `1px solid ${color}40`, borderRadius: 10, padding: "7px 12px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, minWidth: 0 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
                <span style={{ color, fontSize: 11, fontWeight: 700, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{firma}</span>
              </div>
              <span style={{ color: textMain, fontSize: 14, fontWeight: 800, flexShrink: 0 }}>{fmt(celkem)}</span>
              <div style={{ display: "flex", gap: 5, flexShrink: 0 }}>
                <span style={{ fontSize: 10, color: textMuted }}>I: <strong style={{ color: textMain }}>{fmt(katI)}</strong></span>
                <span style={{ fontSize: 10, color: textMuted }}>II: <strong style={{ color: textMain }}>{fmt(katII)}</strong></span>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div style={{ overflowX: "auto", background: bg, padding: "10px 18px" }}>
      <div style={{ display: "flex", gap: 6, minWidth: "max-content", alignItems: "stretch" }}>

        {/* CELKEM VŠE */}
        <div style={{ background: isDark ? "rgba(249,115,22,0.1)" : "rgba(249,115,22,0.08)", border: `1px solid rgba(249,115,22,0.4)`, borderRadius: 12, padding: "10px 16px", minWidth: 180, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
          <div style={{ color: "#f97316", fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>CELKEM VŠE</div>
          <div style={{ color: textMain, fontSize: 22, fontWeight: 800, marginBottom: 8 }}>{fmt(totalCelkem)}</div>
          <div style={{ display: "flex", gap: 6 }}>
            <div style={{ background: isDark ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.12)", borderRadius: 6, padding: "4px 10px", textAlign: "center" }}>
              <div style={{ color: "#f97316", fontSize: 9, fontWeight: 700 }}>KAT. I</div>
              <div style={{ color: textMain, fontSize: 13, fontWeight: 700 }}>{fmt(totalI)}</div>
            </div>
            <div style={{ background: isDark ? "rgba(249,115,22,0.15)" : "rgba(249,115,22,0.12)", borderRadius: 6, padding: "4px 10px", textAlign: "center" }}>
              <div style={{ color: "#f97316", fontSize: 9, fontWeight: 700 }}>KAT. II</div>
              <div style={{ color: textMain, fontSize: 13, fontWeight: 700 }}>{fmt(totalII)}</div>
            </div>
          </div>
        </div>

        {/* Separator */}
        <div style={{ width: 2, background: groupBorder, borderRadius: 2, margin: "2px 40px" }} />

        {/* Skupiny firem */}
        {firmy.map((firma) => {
          const color = firmaColors[firma] || TENANT.p1;
          const katI = sum(firma, ["ps_i","snk_i","bo_i"]);
          const katII = sum(firma, ["ps_ii","bo_ii","poruch"]);
          const celkem = katI + katII;
          return (
            <div key={firma} style={{ background: isDark ? `${color}12` : `${color}10`, border: `1px solid ${color}40`, borderRadius: 12, padding: "10px 16px", minWidth: 210, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
              <div style={{ color, fontSize: 11, fontWeight: 700, letterSpacing: 0.5, marginBottom: 6 }}>{firma.toUpperCase()}</div>
              <div style={{ color: textMain, fontSize: 20, fontWeight: 800, marginBottom: 8 }}>{fmt(celkem)}</div>
              <div style={{ display: "flex", gap: 6 }}>
                <div style={{ background: isDark ? `${color}18` : `${color}12`, border: `1px solid ${color}25`, borderRadius: 6, padding: "4px 12px", textAlign: "center" }}>
                  <div style={{ color, fontSize: 9, fontWeight: 700 }}>KAT. I</div>
                  <div style={{ color: textMain, fontSize: 13, fontWeight: 700 }}>{fmt(katI)}</div>
                </div>
                <div style={{ background: isDark ? `${color}18` : `${color}12`, border: `1px solid ${color}25`, borderRadius: 6, padding: "4px 12px", textAlign: "center" }}>
                  <div style={{ color, fontSize: 9, fontWeight: 700 }}>KAT. II</div>
                  <div style={{ color: textMain, fontSize: 13, fontWeight: 700 }}>{fmt(katII)}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ============================================================
// FORM MODAL (Add + Edit)
// ============================================================

// ── DatePickerField — textové pole DD.MM.RRRR + 📅 mini picker ─────────────
function DatePickerField({ label, value, onChange, style: extraStyle }) {
  const [open, setOpen] = useState(false);
  const [viewYear, setViewYear] = useState(() => {
    if (value && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value)) {
      const [,, y] = value.split("."); return parseInt(y);
    }
    return new Date().getFullYear();
  });
  const [viewMonth, setViewMonth] = useState(() => {
    if (value && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value)) {
      const [, m] = value.split("."); return parseInt(m) - 1;
    }
    return new Date().getMonth();
  });
  const wrapRef = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const mesice = ["Leden","Únor","Březen","Duben","Květen","Červen","Červenec","Srpen","Září","Říjen","Listopad","Prosinec"];

  const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
  const getFirstDay = (y, m) => { const d = new Date(y, m, 1).getDay(); return d === 0 ? 6 : d - 1; };

  const pickDay = (day) => {
    const d = String(day).padStart(2, "0");
    const m = String(viewMonth + 1).padStart(2, "0");
    onChange(`${d}.${m}.${viewYear}`);
    setOpen(false);
  };

  const prevMonth = () => {
    if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); }
    else setViewMonth(m => m + 1);
  };

  const today = new Date();
  const selDay = value && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value) ? parseInt(value.split(".")[0]) : null;
  const selMonth = value && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value) ? parseInt(value.split(".")[1]) - 1 : null;
  const selYear = value && /^\d{1,2}\.\d{1,2}\.\d{4}$/.test(value) ? parseInt(value.split(".")[2]) : null;

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  return (
    <div ref={wrapRef} style={{ position: "relative", ...extraStyle }}>
      <div style={{ display: "flex", alignItems: "center", gap: 0 }}>
        <input
          type="text"
          value={value ?? ""}
          onChange={e => onChange(e.target.value)}
          placeholder="DD.MM.RRRR"
          style={{ ...inputSx, borderRadius: "7px 0 0 7px", flex: 1, borderRight: "none" }}
        />
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          style={{ padding: "0 9px", height: 36, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)", borderLeft: "none", borderRadius: "0 7px 7px 0", cursor: "pointer", fontSize: 14, color: "rgba(255,255,255,0.6)", flexShrink: 0 }}
        >📅</button>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 4px)", left: 0, zIndex: 9999, background: TENANT.modalBg, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 10, padding: "10px 12px", boxShadow: "0 8px 32px rgba(0,0,0,0.5)", width: 220 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <button onClick={prevMonth} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>‹</button>
            <span style={{ color: "#e2e8f0", fontSize: 12, fontWeight: 600 }}>{mesice[viewMonth]} {viewYear}</span>
            <button onClick={nextMonth} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 14, padding: "2px 6px" }}>›</button>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, marginBottom: 4 }}>
            {["Po","Út","St","Čt","Pá","So","Ne"].map(d => (
              <div key={d} style={{ textAlign: "center", fontSize: 10, color: "rgba(255,255,255,0.3)", padding: "2px 0" }}>{d}</div>
            ))}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1 }}>
            {cells.map((day, i) => {
              if (!day) return <div key={i} />;
              const isToday = day === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
              const isSel = day === selDay && viewMonth === selMonth && viewYear === selYear;
              return (
                <button key={i} onClick={() => pickDay(day)}
                  style={{ textAlign: "center", fontSize: 12, padding: "4px 2px", borderRadius: 4, border: "none", cursor: "pointer",
                    background: isSel ? TENANT.p2 : isToday ? "rgba(255,255,255,0.1)" : "transparent",
                    color: isSel ? "#fff" : isToday ? TENANT.p3 : "#e2e8f0",
                    fontWeight: isSel || isToday ? 700 : 400 }}
                >{day}</button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function FormField({ label, value, onChange, full, type }) {
  const [err, setErr] = useState("");

  // Číslo 0 zobrazuj jako prázdné pole
  const displayValue = type === "number" && (value === 0 || value === "0") ? "" : (value ?? "");

  const handleChange = (v) => {
    if (type === "number") {
      if (v !== "" && v !== "-" && isNaN(v.replace(",", "."))) {
        setErr("Zadejte číslo");
      } else {
        setErr("");
      }
    } else if (type === "date") {
      if (v !== "" && !/^\d{0,2}\.?\d{0,2}\.?\d{0,4}$/.test(v)) {
        setErr("Formát: DD.MM.RRRR");
      } else {
        setErr("");
      }
    }
    onChange(v);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || (e.key === "Tab" && !e.shiftKey)) {
      // Najdi všechny focusovatelné inputy ve formuláři
      const modal = e.target.closest("[data-modal]");
      if (!modal) return;
      const inputs = Array.from(modal.querySelectorAll("input:not([disabled]), select:not([disabled])"));
      const idx = inputs.indexOf(e.target);
      if (e.key === "Enter") {
        e.preventDefault();
        if (idx < inputs.length - 1) inputs[idx + 1].focus();
      }
      // Tab necháme výchozí chování
    }
  };

  return (
    <div style={full ? { gridColumn: "1 / -1" } : {}}>
      <Lbl>{label}{type === "number" && <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, marginLeft: 4 }}>123</span>}{type === "date" && <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400, marginLeft: 4 }}>DD.MM.RRRR</span>}</Lbl>
      {type === "date" ? (
        <DatePickerField value={displayValue} onChange={handleChange} />
      ) : (
        <input
          type="text"
          value={displayValue}
          onChange={e => handleChange(e.target.value)}
          onKeyDown={handleKeyDown}
          style={{ ...inputSx, borderColor: err ? "#f87171" : "rgba(255,255,255,0.15)" }}
        />
      )}
      {err && <div style={{ color: "#f87171", fontSize: 11, marginTop: 3 }}>{err}</div>}
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

function FormModal({ title, initial, onSave, onClose, firmy, objednatele, stavbyvedouci: svList, povinnaPole = {} }) {
  const [form, setForm] = useState({ ...initial });
  const [saveErr, setSaveErr] = useState("");
  const [katErr, setKatErr] = useState(""); // chyba pro kategorie I/II
  // ── Dodatky ────────────────────────────────────────────────
  // Základ je uložen v DB jako řádek poradi=-1, nazev="__zaklad__<pole>"
  // Nikdy nevycházíme z initial — initial může být již přepočítaná hodnota
  const stavbaId = initial?.id || null;
  const KAT_POLE_LIST = ["ps_i","snk_i","bo_i","ps_ii","bo_ii","poruch"];

  const [dodatky, setDodatky] = useState([]); // pouze poradi >= 0, bez základu
  const [zakladRec, setZakladRec] = useState(null); // { pole, hodnota, termin }
  const [dodatkyLoading, setDodatkyLoading] = useState(false);
  const [vybranyDodatek, setVybranyDodatek] = useState("zaklad");
  const [novyDodatekNazev, setNovyDodatekNazev] = useState("");
  const [novyDodatekCena, setNovyDodatekCena] = useState("");
  const [novyDodatekTermin, setNovyDodatekTermin] = useState("");
  const [pridatDodatek, setPridatDodatek] = useState(false);
  const [smazatDodatekId, setSmazatDodatekId] = useState(null);
  const [editDodatekId, setEditDodatekId] = useState(null);
  const [editDodatekNazev, setEditDodatekNazev] = useState("");
  const [editDodatekCena, setEditDodatekCena] = useState("");
  const [editDodatekTermin, setEditDodatekTermin] = useState("");

  useEffect(() => {
    if (!stavbaId) return;
    setDodatkyLoading(true);
    sb(`dodatky?stavba_id=eq.${stavbaId}&order=poradi`).then(res => {
      const vse = res || [];
      // Oddělit základ (poradi=-1) od normálních dodatků
      const zRec = vse.find(d => d.poradi === -1);
      const normalni = vse.filter(d => d.poradi >= 0);
      if (zRec) {
        // Základ uložen — parsuj pole z nazvu "__zaklad__ps_i"
        const pole = zRec.nazev.replace("__zaklad__", "");
        setZakladRec({ pole, hodnota: Number(zRec.zmena_ceny) || 0, termin: zRec.novy_termin || "" });
      }
      setDodatky(normalni);
      if (normalni.length > 0) setVybranyDodatek(String(normalni.length - 1));
    }).catch(() => {}).finally(() => setDodatkyLoading(false));
  }, [stavbaId]);

  // Základ pro přepočet — buď z DB záznamu nebo z aktuálního form (před prvním dodatkem)
  const getZaklad = () => {
    if (zakladRec) return zakladRec;
    // Základ ještě není uložen — detekuj z aktuálního form
    const pole = KAT_POLE_LIST.find(k => Number(form[k]) !== 0 && form[k] != null && form[k] !== "") || null;
    return {
      pole,
      hodnota: pole ? Number(form[pole]) || 0 : 0,
      termin: form.ukonceni || "",
    };
  };

  // Přepočet ceny a termínu přes seznam dodatků — pro zobrazení v dropdownu
  const getCenaTermin = (dod, doIdx) => {
    const z = getZaklad();
    let cena = z.hodnota;
    let termin = z.termin;
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

  // Aplikuj dodatky na stavbu — PATCH do DB + aktualizuj form
  const aplikujDodatkyNaStavbu = async (noveDodatky, aktZaklad) => {
    const z = aktZaklad || getZaklad();
    const suma = noveDodatky.reduce((s, d) => s + (Number(d.zmena_ceny) || 0), 0);
    const novaCena = Math.round((z.hodnota + suma) * 100) / 100;
    const novyTermin = noveDodatky.reduce((t, d) => d.novy_termin || t, z.termin);
    const patch = { nabidkova_cena: novaCena, ukonceni: novyTermin };
    if (z.pole) patch[z.pole] = novaCena;
    try {
      await sb(`stavby?id=eq.${stavbaId}`, { method: "PATCH", body: JSON.stringify(patch), prefer: "return=minimal" });
      setForm(prev => ({
        ...prev,
        nabidkova_cena: String(novaCena),
        ukonceni: novyTermin,
        ...(z.pole ? { [z.pole]: String(novaCena) } : {}),
      }));
    } catch(e) { alert("Chyba uložení do DB: " + e.message); }
  };

  const handlePridatDodatek = async () => {
    const nazev = novyDodatekNazev.trim();
    if (!nazev) return;
    const zmena = Number(novyDodatekCena.replace(",", ".").replace(/\s+/g, "")) || 0;
    const termin = novyDodatekTermin.trim();
    try {
      // Pokud ještě není základ uložen — uložíme ho jako poradi=-1
      let aktZaklad = zakladRec;
      if (!zakladRec) {
        const z = getZaklad();
        await sb("dodatky", {
          method: "POST",
          body: JSON.stringify({ stavba_id: stavbaId, nazev: `__zaklad__${z.pole || "nabidkova_cena"}`, zmena_ceny: z.hodnota, novy_termin: z.termin || null, poradi: -1 }),
          prefer: "return=minimal"
        });
        aktZaklad = z;
        setZakladRec(z);
      }
      // Přidej nový dodatek
      const res = await sb("dodatky", {
        method: "POST",
        body: JSON.stringify({ stavba_id: stavbaId, nazev, zmena_ceny: zmena, novy_termin: termin || null, poradi: dodatky.length }),
        prefer: "return=representation"
      });
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
        // Smazat základ z DB a vrátit původní hodnoty
        await sb(`dodatky?stavba_id=eq.${stavbaId}&poradi=eq.-1`, { method: "DELETE", prefer: "return=minimal" });
        const patch = { nabidkova_cena: zakladRec.hodnota, ukonceni: zakladRec.termin };
        if (zakladRec.pole) patch[zakladRec.pole] = zakladRec.hodnota;
        await sb(`stavby?id=eq.${stavbaId}`, { method: "PATCH", body: JSON.stringify(patch), prefer: "return=minimal" });
        setForm(prev => ({
          ...prev,
          nabidkova_cena: String(zakladRec.hodnota),
          ukonceni: zakladRec.termin,
          ...(zakladRec.pole ? { [zakladRec.pole]: String(zakladRec.hodnota) } : {}),
        }));
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
      await sb(`dodatky?id=eq.${editDodatekId}`, {
        method: "PATCH",
        body: JSON.stringify({ nazev, zmena_ceny: zmena, novy_termin: termin || null }),
        prefer: "return=minimal"
      });
      const noveDodatky = dodatky.map(d => d.id === editDodatekId
        ? { ...d, nazev, zmena_ceny: zmena, novy_termin: termin || null }
        : d
      );
      setDodatky(noveDodatky);
      await aplikujDodatkyNaStavbu(noveDodatky);
      setEditDodatekId(null);
    } catch(e) { alert("Chyba úpravy: " + e.message); }
  };
  const set = (k, v) => {
    // Validace: max 1 nenulové pole z KAT_FIELDS
    if (KAT_FIELDS.includes(k) && v !== "" && v !== "0" && Number(v) !== 0) {
      setForm(f => {
        const occupied = KAT_FIELDS.filter(fk => fk !== k && Number(f[fk]) !== 0 && f[fk] !== "" && f[fk] != null);
        if (occupied.length > 0) {
          setKatErr("Lze vyplnit pouze jedno pole z Kategorií I a II.");
          return f; // nezměníme form
        }
        setKatErr("");
        return { ...f, [k]: v };
      });
    } else {
      if (KAT_FIELDS.includes(k)) setKatErr("");
      setForm(f => ({ ...f, [k]: v }));
    }
  };
  const computed = computeRow(form);
  const { pos, onMouseDown: onDragStart } = useDraggable(1100, 560);

  const handleSave = () => {
    for (const k of NUM_FIELDS) {
      const v = form[k];
      if (v !== "" && v != null && isNaN(String(v).replace(",", "."))) {
        setSaveErr(`Pole "${k}" musí být číslo!`);
        return;
      }
    }
    for (const k of DATE_FIELDS) {
      const v = form[k];
      if (v && !/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(v.trim())) {
        setSaveErr(`Pole "${k}" musí být datum ve formátu DD.MM.RRRR`);
        return;
      }
    }
    // Povinná pole — vždy nazev_stavby + dynamická konfigurace
    const povinnaLabels = { cislo_stavby: "Číslo stavby", nazev_stavby: "Název stavby", ukonceni: "Ukončení", sod: "SOD", ze_dne: "Ze dne" };
    for (const [k, label] of Object.entries(povinnaLabels)) {
      if (k === "nazev_stavby" || povinnaPole[k]) {
        if (!form[k] || !String(form[k]).trim()) {
          setSaveErr(`Pole "${label}" je povinné!`);
          return;
        }
      }
    }
    setSaveErr("");
    onSave(computeRow(form));
  };

  const modalRef = useRef(null);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1000, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div ref={modalRef} style={{ position: "fixed", left: "50%", top: "50%", transform: "translate(-50%, -50%)", pointerEvents: "all", background: TENANT.modalBg, borderRadius: 14, width: "min(1400px, 96vw)", maxHeight: "96vh", overflow: "hidden", display: "flex", flexDirection: "column", border: "1px solid rgba(255,255,255,0.2)", boxShadow: "0 32px 80px rgba(0,0,0,0.8)" }}>

        {/* Header — táhlo */}
        <div onMouseDown={onDragStart} style={dragHeaderStyle({ gap: 16 })}>
          <h3 style={{ color: "#fff", margin: 0, fontSize: 16, flexShrink: 0 }}>{title}{dragHint}</h3>
          <input onMouseDown={e => e.stopPropagation()} value={form["nazev_stavby"] ?? ""} onChange={e => set("nazev_stavby", e.target.value)} placeholder="Název stavby..." onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); const modal = modalRef.current; if (modal) { const inputs = Array.from(modal.querySelectorAll("input:not([disabled]),select:not([disabled])")); const idx = inputs.indexOf(e.target); if (idx < inputs.length - 1) inputs[idx + 1].focus(); } } }} style={{ flex: 1, padding: "7px 14px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 8, color: "#fff", fontSize: 15, fontWeight: 600, outline: "none", cursor: "text" }} />
          <button onClick={onClose} onMouseDown={e => e.stopPropagation()} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.4)", fontSize: 20, cursor: "pointer", flexShrink: 0 }}>✕</button>
        </div>

        {/* Body – dva sloupce */}
        <div style={{ padding: "8px 14px", overflowY: "auto", display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>

          {/* LEVÝ SLOUPEC */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Základní info */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: TENANT.p3, fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: `3px solid ${TENANT.p3}`, paddingLeft: 8 }}>ZÁKLADNÍ INFORMACE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <FormField label="Číslo stavby" value={form["cislo_stavby"]} onChange={v => set("cislo_stavby", v)} />
                <FormSelectField label="Firma" value={form["firma"]} onChange={v => set("firma", v)} options={firmy} />
              </div>
            </div>

            {/* Kategorie I */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: `1px solid ${katErr ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.07)"}` }}>
              <div style={{ color: "#818cf8", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #818cf8", paddingLeft: 8 }}>KATEGORIE I</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <FormField label="Plán. stavby I" value={form["ps_i"]} onChange={v => set("ps_i", v)} type="number" />
                <FormField label="SNK I" value={form["snk_i"]} onChange={v => set("snk_i", v)} type="number" />
                <FormField label="Běžné opravy I" value={form["bo_i"]} onChange={v => set("bo_i", v)} type="number" />
              </div>
            </div>

            {katErr && <div style={{ color: "#f87171", fontSize: 12, padding: "6px 10px", background: "rgba(248,113,113,0.08)", border: "1px solid rgba(248,113,113,0.3)", borderRadius: 7 }}>⚠ {katErr}</div>}

            {/* Kategorie II */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: `1px solid ${katErr ? "rgba(248,113,113,0.4)" : "rgba(255,255,255,0.07)"}` }}>
              <div style={{ color: "#fb923c", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #fb923c", paddingLeft: 8 }}>KATEGORIE II</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <FormField label="Plán. stavby II" value={form["ps_ii"]} onChange={v => set("ps_ii", v)} type="number" />
                <FormField label="Běžné opravy II" value={form["bo_ii"]} onChange={v => set("bo_ii", v)} type="number" />
                <FormField label="Poruchy" value={form["poruch"]} onChange={v => set("poruch", v)} type="number" />
              </div>
            </div>

            {/* Ostatní */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#f472b6", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #f472b6", paddingLeft: 8 }}>OSTATNÍ</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
                <FormField label="SOD" value={form["sod"]} onChange={v => set("sod", v)} />
                <FormField label="Ze dne" value={form["ze_dne"]} onChange={v => set("ze_dne", v)} type="date" />
                <FormSelectField label="Objednatel" value={form["objednatel"]} onChange={v => set("objednatel", v)} options={objednatele} allowEmpty />
                <FormSelectField label="Stavbyvedoucí" value={form["stavbyvedouci"]} onChange={v => set("stavbyvedouci", v)} options={svList} allowEmpty />
              </div>
              <div style={{ marginTop: 10 }}>
                <Lbl>💡 Cesta ke složce <span style={{ color: "rgba(255,255,255,0.2)", fontWeight: 400 }}>\\\\server\\zakazky\\... nebo http://...</span></Lbl>
                <input
                  type="text"
                  value={form["slozka_url"] || ""}
                  onChange={e => set("slozka_url", e.target.value)}
                  placeholder="\\\\server\zakazky\ZN-2025-001 nebo http://..."
                  style={{ ...inputSx, width: "100%", boxSizing: "border-box" }}
                />
              </div>
            </div>
          </div>

          {/* PRAVÝ SLOUPEC */}
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>

            {/* Realizace */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#34d399", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #34d399", paddingLeft: 8 }}>REALIZACE</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <FormField label="Vyfakturováno" value={form["vyfakturovano"]} onChange={v => set("vyfakturovano", v)} type="number" />
                <FormField label="Ukončení" value={form["ukonceni"]} onChange={v => set("ukonceni", v)} type="date" />
                <FormField label="Zrealizováno" value={form["zrealizovano"]} onChange={v => set("zrealizovano", v)} type="number" />
              </div>
              <div style={{ marginTop: 10, background: tc1(0.08), border: `1px solid ${tc1(0.2)}`, borderRadius: 8, padding: "8px 14px", display: "flex", gap: 24, flexWrap: "wrap" }}>
                <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Nabídka: </span><span style={{ color: TENANT.p3, fontWeight: 700 }}>{fmt(computed.nabidka)}</span></div>
                <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Rozdíl: </span><span style={{ color: computed.rozdil >= 0 ? "#4ade80" : "#f87171", fontWeight: 700 }}>{fmt(computed.rozdil)}</span></div>

              </div>
            </div>

            {/* Faktura 1 */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #fbbf24", paddingLeft: 8 }}>FAKTURA 1</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 6 }}>
                <FormField label="Nabídková cena" value={form["nabidkova_cena"]} onChange={v => set("nabidkova_cena", v)} type="number" />
                <FormField label="Číslo faktury" value={form["cislo_faktury"]} onChange={v => set("cislo_faktury", v)} />
                <FormField label="Částka bez DPH" value={form["castka_bez_dph"]} onChange={v => set("castka_bez_dph", v)} type="number" />
                <FormField label="Splatná" value={form["splatna"]} onChange={v => set("splatna", v)} type="date" />
              </div>
            </div>

            {/* Faktura 2 */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#f59e0b", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #f59e0b", paddingLeft: 8, opacity: 0.7 }}>FAKTURA 2</div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 6 }}>
                <FormField label="Č. faktury 2" value={form["cislo_faktury_2"]} onChange={v => set("cislo_faktury_2", v)} />
                <FormField label="Částka bez DPH 2" value={form["castka_bez_dph_2"]} onChange={v => set("castka_bez_dph_2", v)} type="number" />
                <FormField label="Splatná 2" value={form["splatna_2"]} onChange={v => set("splatna_2", v)} type="date" />
              </div>
            </div>
            {/* Poznámka */}
            <div style={{ background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "6px 10px", border: "1px solid rgba(255,255,255,0.07)" }}>
              <div style={{ color: "#a78bfa", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, marginBottom: 6, borderLeft: "3px solid #a78bfa", paddingLeft: 8 }}>💬 POZNÁMKA</div>
              <textarea
                value={form["poznamka"] || ""}
                onChange={e => set("poznamka", e.target.value)}
                placeholder="Volný komentář ke stavbě..."
                rows={2}
                style={{ width: "100%", padding: "7px 10px", background: TENANT.inputBg, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, color: "#fff", fontSize: 13, outline: "none", boxSizing: "border-box", resize: "vertical", fontFamily: "inherit" }}
              />
            </div>
          </div>

          {/* ── DODATKY — přes celou šířku (gridColumn span 2) ── */}
          {stavbaId && (() => {
            const { cena: aktCena, termin: aktTermin } = aktualniCenaTermin();
            const inputStyle = { padding: "5px 7px", background: "rgba(255,255,255,0.07)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#fff", fontSize: 12, boxSizing: "border-box", width: "100%" };
            return (
            <div style={{ gridColumn: "1 / -1", background: "rgba(255,255,255,0.03)", borderRadius: 10, padding: "10px 14px", border: "1px solid rgba(251,191,36,0.2)" }}>
              {/* Hlavička + dropdown */}
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ color: "#fbbf24", fontWeight: 700, fontSize: 11, letterSpacing: 0.8, borderLeft: "3px solid #fbbf24", paddingLeft: 8, flex: 1 }}>📋 DODATKY</div>
                {!dodatkyLoading && dodatky.length > 0 && (
                  <select value={vybranyDodatek} onChange={e => setVybranyDodatek(e.target.value)}
                    style={{ padding: "4px 8px", background: TENANT.modalBg, border: "1px solid rgba(251,191,36,0.4)", borderRadius: 7, color: "#e2e8f0", fontSize: 12, cursor: "pointer", outline: "none" }}>
                    <option value="zaklad" style={{ background: TENANT.modalBg, color: "#e2e8f0" }}>📌 Základ: {(() => { const z = getZaklad(); return z.hodnota.toLocaleString("cs-CZ") + " Kč" + (z.termin ? " | " + z.termin : ""); })()}</option>
                    {dodatky.map((d, i) => {
                      const { cena: c, termin: t } = getCenaTermin(dodatky, i);
                      return <option key={d.id} value={String(i)} style={{ background: TENANT.modalBg, color: "#fbbf24" }}>
                        {`📋 Dod.${i+1} ${d.nazev}: ${c.toLocaleString("cs-CZ")} Kč${t ? " | " + t : ""}`}
                      </option>;
                    })}
                  </select>
                )}
              </div>

              {/* Aktuální přepočtená hodnota */}
              <div style={{ display: "flex", gap: 24, marginBottom: 10, padding: "6px 12px", background: "rgba(251,191,36,0.08)", borderRadius: 8, border: "1px solid rgba(251,191,36,0.15)" }}>
                <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Cena: </span><span style={{ color: "#fbbf24", fontWeight: 700 }}>{aktCena.toLocaleString("cs-CZ")} Kč</span></div>
                <div><span style={{ color: "rgba(255,255,255,0.4)", fontSize: 11 }}>Termín: </span><span style={{ color: "#fbbf24", fontWeight: 700 }}>{aktTermin || "—"}</span></div>
                {vybranyDodatek !== "zaklad" && (() => { const z = getZaklad(); return <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 11 }}>základ: {z.hodnota.toLocaleString("cs-CZ")} Kč{z.termin ? " | " + z.termin : ""}</div>; })()}
              </div>

              {/* Seznam dodatků */}
              {dodatkyLoading ? (
                <div style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, marginBottom: 8 }}>Načítám...</div>
              ) : dodatky.length === 0 ? (
                <div style={{ color: "rgba(255,255,255,0.25)", fontSize: 12, marginBottom: 8 }}>Žádné dodatky</div>
              ) : (
                <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
                  {dodatky.map((d, i) => (
                    <div key={d.id}>
                      {editDodatekId === d.id ? (
                        /* Inline editace */
                        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: 5, padding: "6px 8px", background: "rgba(251,191,36,0.06)", borderRadius: 7, border: "1px solid rgba(251,191,36,0.3)" }}>
                          <input value={editDodatekNazev} onChange={e => setEditDodatekNazev(e.target.value)} placeholder="Název..." style={inputStyle} />
                          <input value={editDodatekCena} onChange={e => setEditDodatekCena(e.target.value)} placeholder="±Kč" style={inputStyle} />
                          <DatePickerField value={editDodatekTermin} onChange={setEditDodatekTermin} />
                          <button onClick={handleUlozitEditDodatek} style={{ padding: "4px 10px", background: "rgba(251,191,36,0.2)", border: "1px solid rgba(251,191,36,0.4)", borderRadius: 6, color: "#fbbf24", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✓</button>
                          <button onClick={() => setEditDodatekId(null)} style={{ padding: "4px 8px", background: "none", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12 }}>✕</button>
                        </div>
                      ) : (
                        /* Zobrazení řádku */
                        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 10px", background: "rgba(255,255,255,0.04)", borderRadius: 7, border: "1px solid rgba(255,255,255,0.07)" }}>
                          <span style={{ color: "#fbbf24", fontSize: 11, fontWeight: 700, minWidth: 20 }}>{i + 1}.</span>
                          <span style={{ color: "#e2e8f0", fontSize: 12, flex: 1 }}>{d.nazev}</span>
                          {Number(d.zmena_ceny) !== 0 && <span style={{ color: Number(d.zmena_ceny) >= 0 ? "#4ade80" : "#f87171", fontSize: 12, fontWeight: 600 }}>{Number(d.zmena_ceny) >= 0 ? "+" : ""}{Number(d.zmena_ceny).toLocaleString("cs-CZ")} Kč</span>}
                          {d.novy_termin && <span style={{ color: "#94a3b8", fontSize: 11 }}>→ {d.novy_termin}</span>}
                          {smazatDodatekId === d.id ? (
                            <>
                              <span style={{ color: "#f87171", fontSize: 11 }}>Smazat?</span>
                              <button onClick={() => handleSmazatDodatek(d.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 12, fontWeight: 700 }}>✓</button>
                              <button onClick={() => setSmazatDodatekId(null)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.3)", cursor: "pointer", fontSize: 12 }}>✕</button>
                            </>
                          ) : (
                            <>
                              <button onClick={() => handleEditDodatek(d)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.35)", cursor: "pointer", fontSize: 12 }} title="Upravit">✏️</button>
                              <button onClick={() => setSmazatDodatekId(d.id)} style={{ background: "none", border: "none", color: "rgba(255,255,255,0.2)", cursor: "pointer", fontSize: 13 }} title="Smazat">🗑️</button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Přidat dodatek */}
              {!pridatDodatek ? (
                <button onClick={() => setPridatDodatek(true)} style={{ padding: "5px 12px", background: "rgba(251,191,36,0.1)", border: "1px solid rgba(251,191,36,0.3)", borderRadius: 7, color: "#fbbf24", cursor: "pointer", fontSize: 12 }}>+ Přidat dodatek</button>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr auto auto", gap: 6, alignItems: "end", marginTop: 6 }}>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginBottom: 3 }}>Název</div>
                    <input value={novyDodatekNazev} onChange={e => setNovyDodatekNazev(e.target.value)} placeholder="Název dodatku..." onKeyDown={e => e.key === "Enter" && handlePridatDodatek()} style={{ ...inputStyle }} />
                  </div>
                  <div>
                    <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 10, marginBottom: 3 }}>Změna ceny (Kč)</div>
                    <input value={novyDodatekCena} onChange={e => setNovyDodatekCena(e.target.value)} placeholder="±částka nebo 0" style={{ ...inputStyle }} />
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

        {saveErr && <div style={{ padding: "8px 24px", background: "rgba(239,68,68,0.15)", borderTop: "1px solid rgba(239,68,68,0.3)", color: "#f87171", fontSize: 13 }}>⚠️ {saveErr}</div>}

        <div style={{ padding: "14px 24px", borderTop: "1px solid rgba(255,255,255,0.08)", display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
          <button onClick={handleSave} style={{ padding: "9px 22px", background: TENANT.btnBg, border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Uložit</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// SETTINGS MODAL
// ============================================================
function ListEditor({ label, color, list, setList, nv, setNv, isDark }) {
  const add = () => { const v = nv.trim(); if (v && !list.includes(v)) { setList([...list, v]); setNv(""); } };
  const rem = (v) => setList(list.filter(x => x !== v));
  const itemBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const itemBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const itemText = isDark ? "#e2e8f0" : "#1e293b";
  const [dragOver, setDragOver] = useState(null);
  const dragIdx = useRef(null);

  const handleDragStart = (i) => (e) => {
    dragIdx.current = i;
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (i) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOver(i);
  };
  const handleDrop = (i) => (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragIdx.current === null || dragIdx.current === i) { setDragOver(null); return; }
    const next = [...list];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    setList(next);
    dragIdx.current = null;
    setDragOver(null);
  };

  return (
    <div style={{ flex: 1 }}>
      <div style={{ color, fontWeight: 700, fontSize: 12, letterSpacing: 0.5, marginBottom: 10, borderLeft: `3px solid ${color}`, paddingLeft: 8 }}>{label}</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10 }}>
        <input value={nv} onChange={e => setNv(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Přidat..." style={{ ...inputSx, flex: 1, fontSize: 12, background: isDark ? TENANT.inputBg : "#f8fafc", color: itemText, border: `1px solid ${itemBorder}` }} />
        <button onClick={add} style={{ padding: "8px 12px", background: `${color}33`, border: `1px solid ${color}55`, borderRadius: 7, color, cursor: "pointer", fontWeight: 700 }}>+</button>
      </div>
      {list.map((v, i) => (
        <div key={v}
          draggable
          onDragStart={handleDragStart(i)}
          onDragOver={handleDragOver(i)}
          onDragLeave={() => setDragOver(null)}
          onDrop={handleDrop(i)}
          onDragEnd={() => { dragIdx.current = null; setDragOver(null); }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", marginBottom: 5, background: itemBg, borderRadius: 6, border: `1px solid ${dragOver === i ? color : itemBorder}`, borderLeft: dragOver === i ? `3px solid ${color}` : `1px solid ${itemBorder}`, transition: "border 0.1s", cursor: "default" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)", cursor: "grab", fontSize: 13, lineHeight: 1, flexShrink: 0, userSelect: "none" }} title="Přetáhnout pro změnu pořadí">⠿</span>
            <span style={{ color: itemText, fontSize: 13 }}>{v}</span>
          </div>
          <button onClick={() => rem(v)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14 }}>✕</button>
        </div>
      ))}
    </div>
  );
}

function FirmyEditor({ list, setList, isDark, onNvChange, stavbyData }) {
  const [newNazev, setNewNazev] = useState("");
  const [newBarva, setNewBarva] = useState(TENANT.p2);
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [confirmStep2, setConfirmStep2] = useState(false);
  const [priraditFirma, setPriraditFirma] = useState(""); // vybraná nová firma pro hromadné přiřazení
  const [priraditLoading, setPriraditLoading] = useState(false);
  const [dragOver, setDragOver] = useState(null);
  const dragIdx = useRef(null);
  const PRESET_COLORS = [TENANT.p2,"#facc15","#a855f7","#ef4444","#0ea5e9","#f97316","#10b981","#ec4899","#f59e0b","#6366f1"];
  const itemBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const itemBorder = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const itemText = isDark ? "#e2e8f0" : "#1e293b";

  const handleDragStart = (i) => (e) => { dragIdx.current = i; e.dataTransfer.effectAllowed = "move"; };
  const handleDragOver = (i) => (e) => { e.preventDefault(); e.stopPropagation(); setDragOver(i); };
  const handleDrop = (i) => (e) => {
    e.preventDefault(); e.stopPropagation();
    if (dragIdx.current === null || dragIdx.current === i) { setDragOver(null); return; }
    const next = [...list];
    const [moved] = next.splice(dragIdx.current, 1);
    next.splice(i, 0, moved);
    setList(next);
    dragIdx.current = null; setDragOver(null);
  };

  const setNazev = (v) => { setNewNazev(v); onNvChange?.(v); };

  const add = () => {
    const v = newNazev.trim();
    if (v && !list.find(f => f.hodnota === v)) {
      setList([...list, { hodnota: v, barva: newBarva }]);
      setNewNazev(""); onNvChange?.("");
    }
  };

  const tryRem = (hodnota) => {
    const count = (stavbyData || []).filter(s => s.firma === hodnota).length;
    if (count > 0) {
      setConfirmDelete({ hodnota, count });
    } else {
      setList(list.filter(f => f.hodnota !== hodnota));
    }
  };

  const changeBarva = (hodnota, barva) => setList(list.map(f => f.hodnota === hodnota ? { ...f, barva } : f));

  return (
    <div style={{ flex: 1 }}>
      <div style={{ color: TENANT.p3, fontWeight: 700, fontSize: 12, letterSpacing: 0.5, marginBottom: 10, borderLeft: `3px solid ${TENANT.p3}`, paddingLeft: 8 }}>Firmy</div>
      <div style={{ display: "flex", gap: 6, marginBottom: 10, alignItems: "center" }}>
        <input value={newNazev} onChange={e => setNazev(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
          placeholder="Název firmy..." style={{ ...inputSx, flex: 1, fontSize: 12, background: isDark ? TENANT.inputBg : "#f8fafc", color: itemText, border: `1px solid ${itemBorder}` }} />
        <input type="color" value={newBarva} onChange={e => setNewBarva(e.target.value)}
          style={{ width: 36, height: 36, border: "none", borderRadius: 6, cursor: "pointer", background: "none", padding: 2 }} />
        <button onClick={add} style={{ padding: "8px 12px", background: tc1(0.3), border: `1px solid ${tc1(0.5)}`, borderRadius: 7, color: TENANT.p3, cursor: "pointer", fontWeight: 700 }}>+</button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
        {PRESET_COLORS.map(c => (
          <div key={c} onClick={() => setNewBarva(c)} style={{ width: 20, height: 20, borderRadius: 4, background: c, cursor: "pointer", border: newBarva === c ? "2px solid #fff" : "2px solid transparent" }} />
        ))}
      </div>
      {list.map((f, i) => (
        <div key={f.hodnota}
          draggable
          onDragStart={handleDragStart(i)}
          onDragOver={handleDragOver(i)}
          onDragLeave={() => setDragOver(null)}
          onDrop={handleDrop(i)}
          onDragEnd={() => { dragIdx.current = null; setDragOver(null); }}
          style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "6px 10px", marginBottom: 5, background: itemBg, borderRadius: 6, border: `1px solid ${dragOver === i ? TENANT.p3 : itemBorder}`, borderLeft: dragOver === i ? `3px solid ${TENANT.p3}` : `1px solid ${itemBorder}`, transition: "border 0.1s", cursor: "default" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)", cursor: "grab", fontSize: 13, lineHeight: 1, flexShrink: 0, userSelect: "none" }} title="Přetáhnout pro změnu pořadí">⠿</span>
            <div style={{ width: 14, height: 14, borderRadius: 3, background: f.barva || TENANT.p2 }} />
            <span style={{ color: itemText, fontSize: 13 }}>{f.hodnota}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <input type="color" value={f.barva || TENANT.p2} onChange={e => changeBarva(f.hodnota, e.target.value)}
              style={{ width: 28, height: 28, border: "none", borderRadius: 4, cursor: "pointer", background: "none", padding: 1 }} />
            <button onClick={() => tryRem(f.hodnota)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 14 }}>✕</button>
          </div>
        </div>
      ))}

      {/* Dialog 1 – firma má stavby */}
      {confirmDelete && !confirmStep2 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: isDark ? TENANT.modalBg : "#fff", borderRadius: 14, padding: "28px 32px", width: 400, border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: isDark ? "#f8fafc" : "#1e293b", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Firma má přiřazené stavby</div>
            <div style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)", fontSize: 13, marginBottom: 24 }}>
              Firma <strong>{confirmDelete.hodnota}</strong> má <strong>{confirmDelete.count} {confirmDelete.count === 1 ? "stavbu" : confirmDelete.count < 5 ? "stavby" : "staveb"}</strong>.<br/>Opravdu chceš tuto firmu smazat?
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setConfirmDelete(null)} style={{ padding: "9px 20px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, color: isDark ? "#fff" : "#1e293b", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
              <button onClick={() => setConfirmStep2(true)} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Ano, smazat firmu</button>
            </div>
          </div>
        </div>
      )}

      {/* Dialog 2 – co se stavbami */}
      {confirmDelete && confirmStep2 && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: isDark ? TENANT.modalBg : "#fff", borderRadius: 14, padding: "28px 32px", width: 440, border: "1px solid rgba(239,68,68,0.3)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>🏗️</div>
            <div style={{ color: isDark ? "#f8fafc" : "#1e293b", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Co se stavbami?</div>
            <div style={{ color: isDark ? "rgba(255,255,255,0.55)" : "rgba(0,0,0,0.55)", fontSize: 13, marginBottom: 16 }}>
              {confirmDelete.count} {confirmDelete.count === 1 ? "stavba zůstane" : confirmDelete.count < 5 ? "stavby zůstanou" : "staveb zůstane"} v databázi bez přiřazené firmy.
            </div>
            {/* Hromadné přiřazení — výběr nové firmy */}
            <div style={{ marginBottom: 20, textAlign: "left" }}>
              <div style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 11, marginBottom: 6, fontWeight: 600, textTransform: "uppercase", letterSpacing: 0.5 }}>Nebo přiřadit novou firmu:</div>
              <select
                value={priraditFirma}
                onChange={e => setPriraditFirma(e.target.value)}
                style={{ width: "100%", padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.07)" : "#f8fafc", border: `1px solid ${isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)"}`, borderRadius: 7, color: isDark ? "#e2e8f0" : "#1e293b", fontSize: 13, cursor: "pointer" }}
              >
                <option value="">— vyberte firmu —</option>
                {list.filter(f => f.hodnota !== confirmDelete.hodnota).map(f => (
                  <option key={f.hodnota} value={f.hodnota}>{f.hodnota}</option>
                ))}
              </select>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
              <button onClick={() => { setConfirmDelete(null); setConfirmStep2(false); setPriraditFirma(""); }} style={{ padding: "9px 20px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, color: isDark ? "#fff" : "#1e293b", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
              <button onClick={() => {
                setList(list.filter(f => f.hodnota !== confirmDelete.hodnota));
                setConfirmDelete(null); setConfirmStep2(false); setPriraditFirma("");
              }} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#f97316,#ea580c)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Ponechat bez firmy</button>
              {priraditFirma && (
                <button
                  disabled={priraditLoading}
                  onClick={async () => {
                    setPriraditLoading(true);
                    try {
                      // Hromadně přiřadit novou firmu všem stavbám smazané firmy
                      await sb(`stavby?firma=eq.${encodeURIComponent(confirmDelete.hodnota)}`, {
                        method: "PATCH",
                        body: JSON.stringify({ firma: priraditFirma }),
                        prefer: "return=minimal"
                      });
                      setList(list.filter(f => f.hodnota !== confirmDelete.hodnota));
                      setConfirmDelete(null); setConfirmStep2(false); setPriraditFirma("");
                    } catch(e) { alert("Chyba přiřazení: " + e.message); }
                    finally { setPriraditLoading(false); }
                  }}
                  style={{ padding: "9px 20px", background: "linear-gradient(135deg,#059669,#047857)", border: "none", borderRadius: 8, color: "#fff", cursor: priraditLoading ? "wait" : "pointer", fontSize: 13, fontWeight: 600, opacity: priraditLoading ? 0.7 : 1 }}
                >
                  {priraditLoading ? "Přiřazuji…" : `Přiřadit → ${priraditFirma}`}
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsModal({ firmy, objednatele, stavbyvedouci, users, onChange, onChangeUsers, onClose, onLoadLog, isAdmin, isSuperAdmin, isDark, appVerze, appDatum, onSaveAppInfo, stavbyData, onResetColWidths, onResetColOrder, isDemo, notifyEmails, onSaveNotifyEmails, slozkaRole, onSaveSlozkaRole, extensionReady, protokolReady = false, autoZaloha = true, onSaveAutoZaloha, zalohaRole = "superadmin", onSaveZalohaRole, onImportXLS, onImportJI, autoLogoutMinutesProp = 15, onSaveAutoLogoutMinutes, appNazevProp = "Stavby Znojmo", onSaveAppNazev, deadlineDaysProp = 30, onSaveDeadlineDays, demoMaxStavbyProp = 15, onSaveDemoMaxStavby, povinnaPole = {}, onSavePovinnaPole, prefixEnabled = false, prefixValue = "ZN-", onSaveCisloPrefix, sloupceRole = {}, onSaveSloupceRole }) {
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
  const [logZobrazit, setLogZobrazit] = useState("aktivni"); // "aktivni" | "skryte" | "vse"
  const localLogFiltered = localLogData.filter(r => {
    if (logFilterUser && r.uzivatel !== logFilterUser) return false;
    if (logFilterAkce && r.akce !== logFilterAkce) return false;
    if (logZobrazit === "aktivni") return !r.hidden;
    if (logZobrazit === "skryte") return r.hidden;
    return true;
  });

  // Users
  const [uList, setUList] = useState(users.map(u => ({ ...u })));
  const [newEmail, setNewEmail] = useState("");
  const [newPass, setNewPass] = useState("");
  const [newRole, setNewRole] = useState("user");
  const [newName, setNewName] = useState("");
  const [userErr, setUserErr] = useState("");
  const [editUserId, setEditUserId] = useState(null);
  const [editUserPass, setEditUserPass] = useState("");
  const [editUserRole, setEditUserRole] = useState("");

  const add = (list, setList, val, setVal) => { const v = val.trim(); if (v && !list.includes(v)) { setList([...list, v]); setVal(""); } };

  const addUser = () => {
    setUserErr("");
    if (!newEmail.trim() || !newPass.trim() || !newName.trim()) { setUserErr("Vyplň jméno, email a heslo."); return; }
    if (uList.find(u => u.email === newEmail.trim())) { setUserErr("Uživatel s tímto emailem již existuje."); return; }
    const nextId = uList.length > 0 ? Math.max(...uList.map(u => u.id)) + 1 : 1;
    setUList([...uList, { id: nextId, email: newEmail.trim(), password: newPass.trim(), role: newRole, name: newName.trim() }]);
    setNewEmail(""); setNewPass(""); setNewName(""); setNewRole("user");
  };

  const removeUser = (id) => setUList(uList.filter(u => u.id !== id));

  const handleLoadLog = async () => {
    if (isDemo) { setLocalLogData([]); return; }
    try {
      const res = await onLoadLog(isSuperAdmin);
      setLocalLogData(Array.isArray(res) ? res : []);
    } catch(e) { setLocalLogData([]); }
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

  const fmtCas = (cas) => {
    const d = new Date(cas);
    return d.toLocaleString("cs-CZ", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const AKCE_COLOR = { "Přihlášení": TENANT.p3, "Přidání stavby": "#4ade80", "Editace stavby": "#fbbf24", "Smazání stavby": "#f87171", "Nastavení": "#c084fc" };

  const tabs = [
    { key: "ciselniky", label: "📋 Číselníky" },
    ...(isAdmin ? [{ key: "uzivatele", label: "👥 Uživatelé" }] : []),
    ...(isAdmin ? [{ key: "log", label: "📜 Log aktivit" }] : []),
    ...(isSuperAdmin ? [{ key: "aplikace", label: "⚙️ Aplikace" }] : []),
  ];
  const [editVerze, setEditVerze] = useState(appVerze);
  const [confirmResetCols, setConfirmResetCols] = useState(false);
  const [editDatum, setEditDatum] = useState(appDatum);
  const [editNotifyEmails, setEditNotifyEmails] = useState(notifyEmails || "");
  const [editSlozkaRole, setEditSlozkaRole] = useState(slozkaRole || "admin");
  const [editAutoLogout, setEditAutoLogout] = useState(String(autoLogoutMinutesProp || 15));
  const [editAppNazev, setEditAppNazev] = useState(appNazevProp || "Stavby Znojmo");
  const [editDeadlineDays, setEditDeadlineDays] = useState(String(deadlineDaysProp || 30));
  const [editDemoMax, setEditDemoMax] = useState(String(demoMaxStavbyProp ?? 15));
  const [editPovinnaPole, setEditPovinnaPole] = useState({ ...povinnaPole });
  const [editPrefixEnabled, setEditPrefixEnabled] = useState(prefixEnabled);
  const [editPrefixValue, setEditPrefixValue] = useState(prefixValue || "ZN-");
  const [editSloupceRole, setEditSloupceRole] = useState({ ...sloupceRole });

  // Drag & drop pořadí karet v záložce Aplikace
  const DEFAULT_CARDS_ORDER = [
    ["slozka","zaloha","viditelnost"],
    ["nazev","timeout","terminy","demo"],
    ["prefix","povinna","email","verze","sirky","import"]
  ];
  const [cardsOrder, setCardsOrder] = useState(() => {
    try {
      const saved = JSON.parse(localStorage.getItem("aplikace_layout") || "null");
      // Detekuj pole polí (nový formát)
      if (Array.isArray(saved) && saved.length > 0 && Array.isArray(saved[0])) return saved;
    } catch {}
    return DEFAULT_CARDS_ORDER;
  });
  const [appCardsCols, setAppCardsCols] = useState(() => {
    try { const v = parseInt(localStorage.getItem("aplikace_cols") || "3"); return (v >= 1 && v <= 5) ? v : 3; } catch { return 3; }
  });
  const dragCardRef = useRef(null);
  const dragOverRef = useRef(null);
  const [dragOverCard, setDragOverCard] = useState(null);
  const [isDraggingCard, setIsDraggingCard] = useState(false);

  const handleCardDragStart = (e, id) => {
    dragCardRef.current = id;
    dragOverRef.current = null;
    setIsDraggingCard(true);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };

  const handleCardDragEnter = (e, targetId) => {
    e.preventDefault();
    if (dragCardRef.current && dragCardRef.current !== targetId) {
      dragOverRef.current = targetId;
      setDragOverCard(targetId);
    }
  };

  const handleCardDragOver = (e) => { e.preventDefault(); };

  const handleCardDrop = (e, targetId) => {
    e.preventDefault(); e.stopPropagation();
    const srcId = e.dataTransfer.getData("text/plain") || dragCardRef.current;
    dragCardRef.current = null;
    if (!srcId || srcId === targetId) return;
    setCardsOrder(prev => {
      // Najdi sloupec a pozici src a target
      let srcCol = -1, srcIdx = -1, tgtCol = -1, tgtIdx = -1;
      prev.forEach((col, ci) => {
        const si = col.indexOf(srcId); if (si !== -1) { srcCol = ci; srcIdx = si; }
        const ti = col.indexOf(targetId); if (ti !== -1) { tgtCol = ci; tgtIdx = ti; }
      });
      if (srcCol === -1 || tgtCol === -1) return prev;
      const next = prev.map(col => [...col]);
      next[srcCol].splice(srcIdx, 1);
      // Přepočítej tgtIdx po odebrání (pokud ve stejném sloupci)
      const newTgtIdx = next[tgtCol].indexOf(targetId);
      next[tgtCol].splice(newTgtIdx === -1 ? tgtIdx : newTgtIdx, 0, srcId);
      try { localStorage.setItem("aplikace_layout", JSON.stringify(next)); } catch {}
      return next;
    });
    dragOverRef.current = null; setDragOverCard(null); setIsDraggingCard(false);
  };

  const handleCardDragEnd = () => {
    console.log("[DragEnd] srcId=", dragCardRef.current, "targetId=", dragOverRef.current);
    // NEMAŽ dragCardRef zde — onDrop ho ještě potřebuje!
    dragOverRef.current = null;
    setDragOverCard(null); setIsDraggingCard(false);
    // Vyčisti ref až po 100ms — onDrop se volá po onDragEnd
    setTimeout(() => { dragCardRef.current = null; }, 100);
  };
  const resetCardsOrder = () => {
    setCardsOrder(DEFAULT_CARDS_ORDER);
    setAppCardsCols(3);
    try { localStorage.removeItem("aplikace_layout"); localStorage.setItem("aplikace_cols", "3"); } catch {}
  };

  const modalBg = isDark ? TENANT.modalBg : "#ffffff";
  const modalBorder = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const modalText = isDark ? "#fff" : "#1e293b";
  const modalMuted = isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)";
  const modalDivider = isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.08)";
  const modalCardBg = isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)";
  const settingsWidth = tab === "aplikace" ? Math.max(1000, appCardsCols * 320) : 1000;
  const { pos, onMouseDown: onDragStart, reset: resetSettingsPos } = useDraggable(settingsWidth, 560);

  useEffect(() => { resetSettingsPos(settingsWidth); }, [tab, appCardsCols, settingsWidth]);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 1100, pointerEvents: "none", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
      <div style={{ position: "fixed", left: pos.x, top: pos.y, pointerEvents: "all", background: modalBg, borderRadius: 16, width: `min(${settingsWidth}px, 98vw)`, maxHeight: "90vh", overflow: "hidden", display: "flex", flexDirection: "column", border: `1px solid ${modalBorder}`, boxShadow: "0 32px 80px rgba(0,0,0,0.7)" }}>

        {/* header — táhlo */}
        <div onMouseDown={onDragStart} style={dragHeaderStyle()}>
          <span style={{ color: modalText, fontWeight: 700, fontSize: 17 }}>⚙️ Nastavení{dragHint}</span>
          <button onClick={onClose} onMouseDown={e => e.stopPropagation()} style={{ background: "none", border: "none", color: modalMuted, fontSize: 20, cursor: "pointer" }}>✕</button>
        </div>

        {/* tabs */}
        <div onMouseDown={e => e.stopPropagation()} style={{ display: "flex", gap: 4, padding: "10px 24px 0", borderBottom: `1px solid ${modalDivider}` }}>
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)} style={{ padding: "8px 18px", background: tab === t.key ? tc1(0.2) : "transparent", border: "none", borderBottom: tab === t.key ? `2px solid ${TENANT.p1}` : "2px solid transparent", borderRadius: "6px 6px 0 0", color: tab === t.key ? TENANT.p3 : modalMuted, cursor: "pointer", fontSize: 13, fontWeight: tab === t.key ? 700 : 400 }}>
              {t.label}
            </button>
          ))}
        </div>

        {/* body */}
        <div style={{ padding: "16px 24px", overflowY: "auto", flex: 1, background: modalBg }}>
          {tab === "ciselniky" && (
            <div style={{ display: "flex", gap: 20 }}>
              <FirmyEditor list={f} setList={setF} isDark={isDark} onNvChange={v => setNewF(v)} stavbyData={stavbyData} />
              <ListEditor label="Objednatelé" color="#34d399" list={o} setList={setO} nv={newO} setNv={setNewO} isDark={isDark} />
              <ListEditor label="Stavbyvedoucí" color="#f472b6" list={s} setList={setS} nv={newS} setNv={setNewS} isDark={isDark} />
            </div>
          )}

          {tab === "uzivatele" && (
            <div>
              {/* Přidat uživatele */}
              <div style={{ background: modalCardBg, border: `1px solid ${modalBorder}`, borderRadius: 10, padding: 16, marginBottom: 20 }}>
                <div style={{ color: TENANT.p3, fontWeight: 700, fontSize: 12, letterSpacing: 0.5, marginBottom: 12, borderLeft: `3px solid ${TENANT.p1}`, paddingLeft: 8 }}>PŘIDAT UŽIVATELE</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 120px", gap: 10, marginBottom: 10 }}>
                  <div><Lbl>Jméno</Lbl><input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Jan Novák" style={inputSx} /></div>
                  <div><Lbl>Email</Lbl><input value={newEmail} onChange={e => setNewEmail(e.target.value)} placeholder="jan@firma.cz" style={inputSx} /></div>
                  <div><Lbl>Heslo</Lbl><input type="password" value={newPass} onChange={e => setNewPass(e.target.value)} placeholder="••••••••" style={inputSx} /></div>
                  <div>
                    <Lbl>Role</Lbl>
                    <div style={{ position: "relative" }}>
                      <select value={newRole} onChange={e => setNewRole(e.target.value)} style={{ ...inputSx, appearance: "none", cursor: "pointer" }}>
                        <option value="user" style={{ background: TENANT.modalBg }}>User</option>
                        <option value="user_e" style={{ background: TENANT.modalBg }}>User Editor</option>
                        <option value="admin" style={{ background: TENANT.modalBg }}>Admin</option>
                      </select>
                      <span style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%)", color: "rgba(255,255,255,0.4)", pointerEvents: "none", fontSize: 10 }}>▼</span>
                    </div>
                  </div>
                </div>
                {userErr && <div style={{ color: "#f87171", fontSize: 12, marginBottom: 8 }}>⚠ {userErr}</div>}
                <button onClick={addUser} style={{ padding: "8px 18px", background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: 7, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>+ Přidat uživatele</button>
              </div>

              {/* Seznam uživatelů */}
              <div style={{ color: "rgba(255,255,255,0.4)", fontSize: 11, fontWeight: 700, letterSpacing: 0.8, marginBottom: 10 }}>SEZNAM UŽIVATELŮ ({uList.filter(u => !isAdmin || isSuperAdmin ? true : u.role !== "superadmin").length})</div>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {uList.filter(u => !isAdmin || isSuperAdmin ? true : u.role !== "superadmin").map(u => {
                  const roleLabel = u.role === "superadmin" ? "SUPERADMIN" : u.role === "admin" ? "ADMIN" : u.role === "user_e" ? "USER EDITOR" : "USER";
                  const roleColor = u.role === "superadmin" ? "#c084fc" : u.role === "admin" ? "#fbbf24" : u.role === "user_e" ? "#4ade80" : "#94a3b8";
                  const roleBg = u.role === "superadmin" ? "rgba(168,85,247,0.2)" : u.role === "admin" ? "rgba(245,158,11,0.2)" : u.role === "user_e" ? "rgba(34,197,94,0.15)" : "rgba(100,116,139,0.15)";
                  const icon = u.role === "superadmin" ? "⚡" : u.role === "admin" ? "👑" : u.role === "user_e" ? "✏️" : "👤";
                  return (
                    <div key={u.id}>
                      <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", background: "rgba(255,255,255,0.03)", borderRadius: 8, border: "1px solid rgba(255,255,255,0.08)" }}>
                        <div style={{ width: 32, height: 32, borderRadius: "50%", background: roleBg, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>{icon}</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ color: modalText, fontSize: 13, fontWeight: 600 }}>{u.name}</div>
                          <div style={{ color: "rgba(255,255,255,0.35)", fontSize: 11 }}>{u.email}</div>
                        </div>
                        <span style={{ padding: "2px 8px", borderRadius: 6, fontSize: 11, fontWeight: 700, background: roleBg, color: roleColor }}>{roleLabel}</span>
                        <button onClick={() => { setEditUserId(editUserId === u.id ? null : u.id); setEditUserPass(""); setEditUserRole(u.role); }} style={{ background: "none", border: "none", color: editUserId === u.id ? "#fbbf24" : TENANT.p3, cursor: "pointer", fontSize: 14, padding: "0 4px" }} title="Upravit">✏️</button>
                        <button onClick={() => removeUser(u.id)} style={{ background: "none", border: "none", color: "#f87171", cursor: "pointer", fontSize: 16, padding: "0 4px" }} title="Smazat">✕</button>
                      </div>
                      {editUserId === u.id && (
                        <div style={{ margin: "4px 0 2px 0", padding: "10px 14px", background: tc1(0.08), borderRadius: 8, border: `1px solid ${tc1(0.2)}`, display: "flex", flexDirection: "column", gap: 8 }}>
                          <div style={{ color: TENANT.p3, fontSize: 11, fontWeight: 700 }}>UPRAVIT UŽIVATELE</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, minWidth: 70 }}>Nové heslo:</span>
                            <input type="password" value={editUserPass} onChange={e => setEditUserPass(e.target.value)} placeholder="nové heslo (prázdné = beze změny)" style={{ flex: 1, padding: "6px 10px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#fff", fontSize: 12 }} />
                          </div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                            <span style={{ color: "rgba(255,255,255,0.4)", fontSize: 12, minWidth: 70 }}>Role:</span>
                            <select value={editUserRole} onChange={e => setEditUserRole(e.target.value)} style={{ flex: 1, padding: "6px 10px", background: TENANT.modalBg, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 6, color: "#fff", fontSize: 12 }}>
                              <option value="user">USER</option>
                              <option value="user_e">USER EDITOR</option>
                              <option value="admin">ADMIN</option>
                              {isSuperAdmin && <option value="superadmin">SUPERADMIN</option>}
                            </select>
                          </div>
                          <div style={{ display: "flex", gap: 8 }}>
                            <button onClick={() => { setUList(uList.map(x => x.id === u.id ? { ...x, password: editUserPass.trim() || x.password, role: editUserRole } : x)); setEditUserId(null); }} style={{ padding: "6px 14px", background: TENANT.btnBg, border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💾 Uložit</button>
                            <button onClick={() => setEditUserId(null)} style={{ padding: "6px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 6, color: "rgba(255,255,255,0.5)", cursor: "pointer", fontSize: 12 }}>Zrušit</button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

                    {tab === "aplikace" && isSuperAdmin && (() => {
              // Obsah jednotlivých karet
              const CARDS = {
                slozka: {
                  title: "💡 TLAČÍTKO SLOŽKA",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Kdo vidí tlačítko 💡 u každé stavby pro otevření složky zakázky.</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                        {[["superadmin","Superadmin"],["admin","Admin+"],["user_e","Editor+"],["user","Všichni"]].map(([val, label]) => (
                          <button key={val} onClick={() => { setEditSlozkaRole(val); onSaveSlozkaRole(val); }} style={{ padding: "6px 11px", background: editSlozkaRole === val ? "rgba(251,191,36,0.25)" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), border: `1px solid ${editSlozkaRole === val ? "rgba(251,191,36,0.6)" : modalBorder}`, borderRadius: 7, color: editSlozkaRole === val ? "#fbbf24" : modalMuted, cursor: "pointer", fontSize: 12, fontWeight: editSlozkaRole === val ? 700 : 400 }}>{label}</button>
                        ))}
                      </div>
                      <div style={{ padding: "10px 12px", background: protokolReady ? "rgba(16,185,129,0.08)" : "rgba(251,191,36,0.06)", border: `1px solid ${protokolReady ? "rgba(16,185,129,0.3)" : "rgba(251,191,36,0.2)"}`, borderRadius: 8, marginBottom: 8 }}>
                        <div style={{ color: protokolReady ? "#34d399" : "#fbbf24", fontSize: 12, fontWeight: 700, marginBottom: 4 }}>{protokolReady ? "✅ Stavby Helper aktivní — klik otevře složku" : "⚠️ Nutná jednorázová instalace Stavby Helper"}</div>
                        <div style={{ color: modalMuted, fontSize: 11, marginBottom: protokolReady ? 0 : 10 }}>{protokolReady ? "Protokol je nainstalován. Klik na 💡 otevře složku přímo v Průzkumníku Windows." : "Stáhněte ZIP, rozbalte a spusťte install.bat (trvá ~10 sekund). Funguje i přes VPN."}</div>
                        {!protokolReady && (<a href="/stavby-helper-installer.zip" download="stavby-helper-installer.zip" style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 16px", background: "linear-gradient(135deg,#d97706,#b45309)", borderRadius: 8, color: "#fff", fontSize: 12, fontWeight: 700, textDecoration: "none" }}>🖥 Stáhnout instalátor (Windows)</a>)}
                        {extensionReady && <div style={{ marginTop: 6, color: "#34d399", fontSize: 11, fontWeight: 600 }}>✅ Rozšíření prohlížeče také aktivní</div>}
                      </div>
                      <div style={{ color: modalMuted, fontSize: 11 }}>Cesta se zadává kliknutím na šedou 💡 nebo v editaci stavby.</div>
                    </div>
                  )
                },
                zaloha: {
                  title: "💾 ZÁLOHA DO JSON",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Kdo může stáhnout zálohu celé DB (stavby + číselníky + uživatelé + logy).</div>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 14 }}>
                        {[["superadmin","Superadmin"],["admin","Admin+"],["user_e","Editor+"],["user","Všichni"]].map(([val, label]) => (
                          <button key={val} onClick={() => onSaveZalohaRole(val)} style={{ padding: "6px 11px", background: zalohaRole === val ? "rgba(5,150,105,0.25)" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), border: `1px solid ${zalohaRole === val ? "rgba(5,150,105,0.6)" : modalBorder}`, borderRadius: 7, color: zalohaRole === val ? "#34d399" : modalMuted, cursor: "pointer", fontSize: 12, fontWeight: zalohaRole === val ? 700 : 400 }}>{label}</button>
                        ))}
                      </div>
                      <div style={{ borderTop: `1px solid ${modalBorder}`, paddingTop: 12 }}>
                        <div style={{ color: modalMuted, fontSize: 11, fontWeight: 700, marginBottom: 8 }}>AUTOMATICKÁ ZÁLOHA</div>
                        <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                          <button onClick={() => onSaveAutoZaloha(!autoZaloha)} style={{ padding: "7px 14px", background: autoZaloha ? "linear-gradient(135deg,#059669,#047857)" : "rgba(255,255,255,0.05)", border: `1px solid ${autoZaloha ? "#059669" : modalBorder}`, borderRadius: 8, color: autoZaloha ? "#fff" : modalMuted, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{autoZaloha ? "✅ Zapnuta" : "⚪ Vypnuta"}</button>
                          <div style={{ color: modalMuted, fontSize: 11 }}>Při prvním přihlášení superadmina každý den.</div>
                        </div>
                      </div>
                    </div>
                  )
                },
                viditelnost: {
                  title: "👁 VIDITELNOST SLOUPCŮ",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Minimální role která vidí daný sloupec. Výchozí = Všichni.</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
                        {COLUMNS.filter(c => !c.hidden && c.key !== "id").map(col => {
                          const LOCKED_KEYS = ["firma","cislo_stavby","nazev_stavby"];
                          const isLocked = LOCKED_KEYS.includes(col.key);
                          const curRole = editSloupceRole[col.key] || "user";
                          return (
                            <div key={col.key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8, padding: "4px 0", borderBottom: `1px solid ${modalBorder}` }}>
                              <span style={{ color: isDark ? "#e2e8f0" : "#1e293b", fontSize: 12, fontWeight: 500, minWidth: 130, flexShrink: 0 }}>{col.label}</span>
                              {isLocked ? <span style={{ color: modalMuted, fontSize: 11, fontStyle: "italic" }}>vždy viditelný</span> : (
                                <div style={{ display: "flex", gap: 4, flexShrink: 0 }}>
                                  {[["superadmin","SA"],["admin","A+"],["user_e","E+"],["user","Vš"]].map(([val, lbl]) => (
                                    <button key={val} onClick={() => { const next = { ...editSloupceRole }; if (val === "user") delete next[col.key]; else next[col.key] = val; setEditSloupceRole(next); onSaveSloupceRole(next); }} style={{ padding: "3px 8px", background: curRole === val ? tc1(0.3) : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), border: `1px solid ${curRole === val ? tc1(0.6) : modalBorder}`, borderRadius: 5, color: curRole === val ? TENANT.p3 : modalMuted, cursor: "pointer", fontSize: 11, fontWeight: curRole === val ? 700 : 400, minWidth: 28, textAlign: "center" }}>{lbl}</button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                      <button onClick={() => { setEditSloupceRole({}); onSaveSloupceRole({}); }} style={{ marginTop: 10, padding: "6px 14px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>↺ Reset — vše Všichni</button>
                    </div>
                  )
                },
                nazev: {
                  title: "🏷️ NÁZEV APLIKACE",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Zobrazí se v hlavičce, na přihlašovací obrazovce a ve footeru.</div>
                      <input value={editAppNazev} onChange={e => setEditAppNazev(e.target.value)} placeholder="Stavby Znojmo" style={{ width: "100%", padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${modalBorder}`, borderRadius: 7, color: modalText, fontSize: 13, boxSizing: "border-box", marginBottom: 8 }} />
                      <button onClick={() => onSaveAppNazev(editAppNazev)} style={{ padding: "8px 16px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💾 Uložit název</button>
                    </div>
                  )
                },
                timeout: {
                  title: "⏱️ TIMEOUT ODHLÁŠENÍ",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Automatické odhlášení po nečinnosti. Platí okamžitě pro všechny.</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <input type="number" min="1" max="480" value={editAutoLogout} onChange={e => setEditAutoLogout(e.target.value)} style={{ width: 70, padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${modalBorder}`, borderRadius: 7, color: modalText, fontSize: 13, boxSizing: "border-box" }} />
                        <span style={{ color: modalMuted, fontSize: 12 }}>minut</span>
                      </div>
                      <button onClick={() => { const v = parseInt(editAutoLogout); if (!isNaN(v) && v > 0) onSaveAutoLogoutMinutes(v); }} style={{ padding: "8px 16px", background: "linear-gradient(135deg,#0ea5e9,#0284c7)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💾 Uložit</button>
                      <div style={{ color: modalMuted, fontSize: 10, marginTop: 6 }}>Výchozí: 15 min. Rozsah: 1–480 min.</div>
                    </div>
                  )
                },
                terminy: {
                  title: "⚠️ DNY PRO UPOZORNĚNÍ TERMÍNŮ",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Stavby s termínem do N dní se zobrazí v ⚠️ Termíny. Platí okamžitě.</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <input type="number" min="1" max="365" value={editDeadlineDays} onChange={e => setEditDeadlineDays(e.target.value)} style={{ width: 70, padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${modalBorder}`, borderRadius: 7, color: modalText, fontSize: 13, boxSizing: "border-box" }} />
                        <span style={{ color: modalMuted, fontSize: 12 }}>dní</span>
                      </div>
                      <button onClick={() => { const v = parseInt(editDeadlineDays); if (!isNaN(v) && v > 0) onSaveDeadlineDays(v); }} style={{ padding: "8px 16px", background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💾 Uložit</button>
                      <div style={{ color: modalMuted, fontSize: 10, marginTop: 6 }}>Výchozí: 30 dní.</div>
                    </div>
                  )
                },
                demo: {
                  title: "🎮 DEMO — MAX. POČET STAVEB",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Maximální počet staveb v demo režimu.</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                        <input type="number" min="0" max="50" value={editDemoMax} onChange={e => setEditDemoMax(e.target.value)} style={{ width: 70, padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${modalBorder}`, borderRadius: 7, color: modalText, fontSize: 13, boxSizing: "border-box" }} />
                        <span style={{ color: modalMuted, fontSize: 12 }}>staveb</span>
                      </div>
                      <button onClick={() => { const v = parseInt(editDemoMax); if (!isNaN(v) && v >= 0 && v <= 50) onSaveDemoMaxStavby(v); }} style={{ padding: "8px 16px", background: "linear-gradient(135deg,#d97706,#b45309)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💾 Uložit</button>
                      <div style={{ color: modalMuted, fontSize: 10, marginTop: 6 }}>Výchozí: 15. Rozsah: 0–50.</div>
                    </div>
                  )
                },
                prefix: {
                  title: "🔢 PREFIX ČÍSLOVÁNÍ STAVEB",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Automaticky předvyplní číslo stavby při přidání nové zakázky.</div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                        <button onClick={() => { const next = !editPrefixEnabled; setEditPrefixEnabled(next); onSaveCisloPrefix(next, editPrefixValue); }} style={{ padding: "7px 14px", background: editPrefixEnabled ? "linear-gradient(135deg,#059669,#047857)" : (isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)"), border: `1px solid ${editPrefixEnabled ? "#059669" : modalBorder}`, borderRadius: 7, color: editPrefixEnabled ? "#fff" : modalMuted, cursor: "pointer", fontSize: 12, fontWeight: 700 }}>{editPrefixEnabled ? "✅ Zapnut" : "⚪ Vypnut"}</button>
                      </div>
                      {editPrefixEnabled && (
                        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                          <input value={editPrefixValue} onChange={e => setEditPrefixValue(e.target.value)} placeholder="ZN-" style={{ width: 90, padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${modalBorder}`, borderRadius: 7, color: modalText, fontSize: 13, boxSizing: "border-box" }} />
                          <button onClick={() => onSaveCisloPrefix(editPrefixEnabled, editPrefixValue)} style={{ padding: "8px 12px", background: "linear-gradient(135deg,#0ea5e9,#0284c7)", border: "none", borderRadius: 7, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💾</button>
                        </div>
                      )}
                    </div>
                  )
                },
                povinna: {
                  title: "✅ POVINNÁ POLE",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Název stavby je vždy povinný. Ostatní lze zapnout/vypnout.</div>
                      {[["nazev_stavby","Název stavby",true],["cislo_stavby","Číslo stavby",false],["ukonceni","Ukončení",false],["sod","SOD",false],["ze_dne","Ze dne",false]].map(([key, label, locked]) => (
                        <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "5px 0", borderBottom: `1px solid ${modalBorder}` }}>
                          <span style={{ color: locked ? modalMuted : modalText, fontSize: 12 }}>{label}{locked && <span style={{ color: modalMuted, fontSize: 10, marginLeft: 4 }}>(vždy)</span>}</span>
                          <button disabled={locked} onClick={() => { const next = { ...editPovinnaPole, [key]: !editPovinnaPole[key] }; setEditPovinnaPole(next); onSavePovinnaPole(next); }} style={{ padding: "4px 10px", background: (locked || editPovinnaPole[key]) ? "linear-gradient(135deg,#059669,#047857)" : (isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)"), border: `1px solid ${(locked || editPovinnaPole[key]) ? "#059669" : modalBorder}`, borderRadius: 6, color: (locked || editPovinnaPole[key]) ? "#fff" : modalMuted, cursor: locked ? "default" : "pointer", fontSize: 11, fontWeight: 600 }}>{(locked || editPovinnaPole[key]) ? "✅ Ano" : "⚪ Ne"}</button>
                        </div>
                      ))}
                    </div>
                  )
                },
                email: {
                  title: "📧 EMAIL NOTIFIKACE — TERMÍNY",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Emaily pro denní souhrn termínů. Oddělte čárkou nebo novým řádkem.</div>
                      <textarea value={editNotifyEmails} onChange={e => setEditNotifyEmails(e.target.value)} placeholder={"jan@firma.cz\neva@firma.cz"} rows={4} style={{ width: "100%", padding: "9px 12px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${modalBorder}`, borderRadius: 8, color: modalText, fontSize: 13, boxSizing: "border-box", resize: "vertical", fontFamily: "monospace" }} />
                      <button onClick={() => onSaveNotifyEmails(editNotifyEmails)} style={{ marginTop: 8, padding: "9px 20px", background: "linear-gradient(135deg,#0ea5e9,#0284c7)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>💾 Uložit emaily</button>
                      <div style={{ color: modalMuted, fontSize: 10, marginTop: 6 }}>DB: nastaveni, klic = notify_emails</div>
                    </div>
                  )
                },
                verze: {
                  title: "VERZE APLIKACE",
                  content: (
                    <div>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 10 }}>
                        <div>
                          <div style={{ color: modalMuted, fontSize: 10, marginBottom: 4 }}>VERZE</div>
                          <input value={editVerze} onChange={e => setEditVerze(e.target.value)} placeholder="1.0.0" style={{ width: "100%", padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${modalBorder}`, borderRadius: 7, color: modalText, fontSize: 13, boxSizing: "border-box" }}/>
                        </div>
                        <div>
                          <div style={{ color: modalMuted, fontSize: 10, marginBottom: 4 }}>ROK / DATUM</div>
                          <input value={editDatum} onChange={e => setEditDatum(e.target.value)} placeholder="2025" style={{ width: "100%", padding: "8px 10px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.04)", border: `1px solid ${modalBorder}`, borderRadius: 7, color: modalText, fontSize: 13, boxSizing: "border-box" }}/>
                        </div>
                      </div>
                      <button onClick={() => onSaveAppInfo(editVerze, editDatum)} style={{ padding: "8px 16px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>💾 Uložit verzi</button>
                      <div style={{ color: modalMuted, fontSize: 10, marginTop: 6 }}>Footer: © {editDatum} {appNazevProp} – Martin Dočekal & Claude AI | v{editVerze}</div>
                    </div>
                  )
                },
                sirky: {
                  title: "ŠÍŘKY SLOUPCŮ",
                  content: (
                    <div>
                      <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                        <button onClick={() => setConfirmResetCols(true)} style={{ padding: "9px 16px", background: "rgba(168,85,247,0.12)", border: "1px solid rgba(168,85,247,0.35)", borderRadius: 8, color: "#c084fc", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>↺ Reset šířek</button>
                        <button onClick={() => onResetColOrder()} style={{ padding: "9px 16px", background: tc2(0.12), border: `1px solid ${tc2(0.35)}`, borderRadius: 8, color: TENANT.p3, cursor: "pointer", fontSize: 12, fontWeight: 600 }}>↺ Reset pořadí</button>
                      </div>
                      <div style={{ color: modalMuted, fontSize: 11, marginTop: 8 }}>Obnoví původní šířky a pořadí sloupců tabulky.</div>
                    </div>
                  )
                },
                import: {
                  title: "📥 IMPORT Z PŮVODNÍ TABULKY (XLS) — DUR",
                  content: (
                    <div>
                      <div style={{ color: modalMuted, fontSize: 11, marginBottom: 10 }}>Jednorázový import staveb z původního Excel formátu. Před importem zobrazí potvrzovací dialog.</div>
                      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                        <div>
                          <div style={{ color: modalMuted, fontSize: 11, marginBottom: 6 }}>DUR — Znojmo formát:</div>
                          <button onClick={() => onImportXLS()} style={{ padding: "9px 16px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 8, color: "#f59e0b", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📥 Vybrat soubor XLS — <span style={{ color: "#ef4444", fontWeight: 700 }}>DUR</span></button>
                        </div>
                        <div>
                          <div style={{ color: modalMuted, fontSize: 11, marginBottom: 6 }}>Jihlava formát — H (Smluvní cena) importovat do:</div>
                          <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                            <select value={importJIKatPoleLocal} onChange={e => setImportJIKatPoleLocal(e.target.value)} style={{ padding: "6px 10px", background: TENANT.inputBg, border: "1px solid rgba(255,255,255,0.15)", borderRadius: 7, color: "#e2e8f0", fontSize: 12 }}>
                              <option value="ps_i">Plán. stavby I</option>
                              <option value="snk_i">SNK I</option>
                              <option value="bo_i">Běžné opravy I</option>
                              <option value="ps_ii">Plán. stavby II</option>
                              <option value="bo_ii">Běžné opravy II</option>
                              <option value="poruch">Poruchy</option>
                              <option value="nikam">Nikam (jen Nab. cena)</option>
                            </select>
                            <button onClick={() => onImportJI(importJIKatPoleLocal)} style={{ padding: "9px 16px", background: "rgba(99,153,34,0.15)", border: "1px solid rgba(99,153,34,0.4)", borderRadius: 8, color: "#86efac", cursor: "pointer", fontSize: 12, fontWeight: 600 }}>📥 Vybrat soubor XLS — JI</button>
                          </div>
                        </div>
                      </div>
                    </div>
                  )
                },
              };

              // Rozdělení do N sloupců (dle cardsOrder - pole polí)
              const cols = Array.from({ length: appCardsCols }, (_, i) => cardsOrder[i] ? [...cardsOrder[i]] : []);

              const cardStyle = (id) => ({
                background: modalCardBg,
                borderRadius: 10,
                border: `1px solid ${dragOverCard === id ? TENANT.p2 : modalBorder}`,
                marginBottom: 14,
                transition: "border-color 0.1s",
                opacity: dragCardRef.current === id ? 0.5 : 1,
              });

              return (
                <div style={{ padding: "10px 0" }}>
                  {/* Reset tlačítko + přepínač sloupců */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <span style={{ color: modalMuted, fontSize: 11 }}>Sloupce:</span>
                      <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 7, overflow: "hidden", border: `1px solid ${modalBorder}` }}>
                        {[1,2,3,4,5].map(n => (
                          <button key={n} onClick={() => { setAppCardsCols(n); try { localStorage.setItem("aplikace_cols", String(n)); } catch {} }} style={{ padding: "4px 10px", background: appCardsCols === n ? (isDark ? tc1(0.4) : tc1(0.15)) : "transparent", border: "none", color: appCardsCols === n ? TENANT.p3 : modalMuted, cursor: "pointer", fontSize: 12, fontWeight: appCardsCols === n ? 700 : 400, minWidth: 28 }}>{n}</button>
                        ))}
                      </div>
                    </div>
                    <button onClick={resetCardsOrder} style={{ padding: "5px 12px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 7, color: "#f87171", cursor: "pointer", fontSize: 11, fontWeight: 600 }}>↺ Obnovit výchozí rozvržení</button>
                  </div>
                  <div style={{ display: "grid", gridTemplateColumns: `repeat(${appCardsCols}, 1fr)`, gap: 16, alignItems: "start" }}>
                    {cols.map((col, ci) => (
                      <div key={ci}
                        style={{ minHeight: 80, display: "flex", flexDirection: "column" }}
                        onDragOver={e => e.preventDefault()}
                        onDragEnter={e => {
                          e.preventDefault();
                          if (dragCardRef.current && col.length === 0) {
                            dragOverRef.current = `__col_${ci}__`;
                            setDragOverCard(`empty-${ci}`);
                          }
                        }}
                        onDrop={e => {
                          e.preventDefault();
                          const srcId = e.dataTransfer.getData("text/plain") || dragCardRef.current;
                          if (!srcId || col.length > 0) return;
                          setCardsOrder(prev => {
                            const next = prev.map(c => c.filter(id => id !== srcId));
                            while (next.length <= ci) next.push([]);
                            next[ci].push(srcId);
                            try { localStorage.setItem("aplikace_layout", JSON.stringify(next)); } catch {}
                            return next;
                          });
                          dragCardRef.current = null; dragOverRef.current = null;
                          setDragOverCard(null); setIsDraggingCard(false);
                        }}
                      >
                        {col.length === 0 && (
                          <div style={{ border: `2px dashed ${dragOverCard === `empty-${ci}` ? TENANT.p2 : (isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.12)")}`, borderRadius: 10, minHeight: 80, display: "flex", alignItems: "center", justifyContent: "center", color: dragOverCard === `empty-${ci}` ? TENANT.p3 : modalMuted, fontSize: 12, transition: "all 0.15s", flex: 1 }}>
                            ⬇ přetáhni sem
                          </div>
                        )}
                        {col.map(id => {
                          const card = CARDS[id];
                          if (!card) return null;
                          return (
                            <div key={id}
                              style={cardStyle(id)}
                              draggable
                              onDragStart={e => handleCardDragStart(e, id)}
                              onDragOver={e => e.preventDefault()}
                              onDragEnter={e => handleCardDragEnter(e, id)}
                              onDrop={e => handleCardDrop(e, id)}
                              onDragEnd={handleCardDragEnd}
                            >
                              <div style={{ padding: "9px 14px 8px", borderBottom: `1px solid ${modalBorder}`, display: "flex", alignItems: "center", gap: 7, cursor: "grab", userSelect: "none", background: isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)", borderRadius: "10px 10px 0 0" }}>
                                <span style={{ color: isDark ? "rgba(255,255,255,0.3)" : "rgba(0,0,0,0.25)", fontSize: 13 }}>⠿</span>
                                <span style={{ color: isDark ? "rgba(255,255,255,0.75)" : "rgba(0,0,0,0.65)", fontSize: 11, fontWeight: 700, letterSpacing: 0.8 }}>{card.title}</span>
                              </div>
                              <div style={{ padding: "12px 14px" }}>{card.content}</div>
                            </div>
                          );
                        })}
                        {/* Placeholder na konci neprázdného sloupce — drop target */}
                        {col.length > 0 && (
                          <div
                            style={{ minHeight: isDraggingCard ? 80 : 16, marginTop: 6, borderRadius: 8, border: `2px dashed ${dragOverCard === `end-${ci}` ? TENANT.p2 : isDraggingCard ? (isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.15)") : "transparent"}`, display: "flex", alignItems: "center", justifyContent: "center", color: dragOverCard === `end-${ci}` ? TENANT.p3 : modalMuted, fontSize: 12, transition: "all 0.15s", background: dragOverCard === `end-${ci}` ? tc1(0.08) : "transparent" }}
                            onDragOver={e => { e.preventDefault(); e.stopPropagation(); e.dataTransfer.dropEffect = "move"; }}
                            onDragEnter={e => {
                              e.preventDefault(); e.stopPropagation();
                              if (dragCardRef.current) {
                                dragOverRef.current = `__end_${ci}__`;
                                setDragOverCard(`end-${ci}`);
                              }
                            }}
                            onDrop={e => {
                              e.preventDefault(); e.stopPropagation();
                              const srcId = e.dataTransfer.getData("text/plain") || dragCardRef.current;
                              dragCardRef.current = null; // vyčisti okamžitě po přečtení
                              console.log("[Drop-placeholder] ci=", ci, "srcId=", srcId, "getData=", e.dataTransfer.getData("text/plain"));
                              if (!srcId) { console.log("[Drop-placeholder] ABORT - srcId je null"); return; }
                              setCardsOrder(prev => {
                                // Odeber srcId odkudkoliv
                                const next = prev.map(col => col.filter(id => id !== srcId));
                                // Zajisti že sloupec ci existuje
                                while (next.length <= ci) next.push([]);
                                // Přidej na konec sloupce ci
                                next[ci].push(srcId);
                                console.log("[Drop-placeholder] ci=", ci, "result=", next);
                                try { localStorage.setItem("aplikace_layout", JSON.stringify(next)); } catch {}
                                return next;
                              });
                              dragOverRef.current = null; setDragOverCard(null); setIsDraggingCard(false);
                            }}
                          >
                            {dragOverCard === `end-${ci}` ? "⬇ přetáhni sem" : isDraggingCard ? "⬇" : ""}
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}

          {tab === "log" && (
            <div>
              {isDemo && (
                <div style={{ marginBottom: 14, padding: "12px 16px", background: "rgba(251,191,36,0.12)", border: "1px solid rgba(251,191,36,0.35)", borderRadius: 8, color: "#fbbf24", fontSize: 12, display: "flex", gap: 10, alignItems: "center" }}>
                  <span style={{ fontSize: 18 }}>🎮</span>
                  <div><strong>Demo režim</strong> — log aktivit se neukládá do databáze. V ostré verzi se zde zobrazí přihlášení, editace, smazání a veškeré akce všech uživatelů.</div>
                </div>
              )}
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, flexWrap: "wrap", gap: 8 }}>
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {/* Filtr uživatel */}
                  <select onChange={e => setLogFilterUser(e.target.value)} style={{ padding: "5px 10px", background: isDark ? TENANT.modalBg : "#fff", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)"}`, borderRadius: 6, color: isDark ? "#e2e8f0" : "#1e293b", fontSize: 12, cursor: "pointer" }}>
                    <option value="">Všichni uživatelé</option>
                    {[...new Set(localLogData.map(r => r.uzivatel))].filter(Boolean).map(u => (
                      <option key={u} value={u}>{u}</option>
                    ))}
                  </select>
                  {/* Filtr akce */}
                  <select onChange={e => setLogFilterAkce(e.target.value)} style={{ padding: "5px 10px", background: isDark ? TENANT.modalBg : "#fff", border: `1px solid ${isDark ? "rgba(255,255,255,0.12)" : "rgba(0,0,0,0.15)"}`, borderRadius: 6, color: isDark ? "#e2e8f0" : "#1e293b", fontSize: 12, cursor: "pointer" }}>
                    <option value="">Všechny akce</option>
                    {Object.keys(AKCE_COLOR).map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <span style={{ color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)", fontSize: 12 }}>{localLogFiltered.length} záznamů</span>
                  {isSuperAdmin && (
                    <div style={{ display: "flex", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", borderRadius: 7, overflow: "hidden", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}` }}>
                      {[["aktivni","Aktivní"],["skryte","Skryté"],["vse","Vše"]].map(([val, label]) => (
                        <button key={val} onClick={() => setLogZobrazit(val)} style={{ padding: "3px 9px", background: logZobrazit === val ? (isDark ? tc1(0.4) : tc1(0.15)) : "transparent", border: "none", color: logZobrazit === val ? (isDark ? TENANT.p3 : TENANT.p1) : isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.4)", cursor: "pointer", fontSize: 11, fontWeight: logZobrazit === val ? 700 : 400 }}>{label}</button>
                      ))}
                    </div>
                  )}
                  <button onClick={handleLoadLog} style={{ padding: "5px 12px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 6, color: isDark ? "#fff" : "#1e293b", cursor: "pointer", fontSize: 12 }}>🔄 Obnovit</button>
                  <button onClick={() => {
                    const akceColors = {
                      "Přihlášení":    { bg: "#DBEAFE", color: "#1D4ED8" },
                      "Přidání stavby":  { bg: "#DCFCE7", color: "#166534" },
                      "Editace stavby":  { bg: "#FEF9C3", color: "#854D0E" },
                      "Smazání stavby":  { bg: "#FEE2E2", color: "#991B1B" },
                      "Nastavení":     { bg: "#F3E8FF", color: "#6B21A8" },
                      "Záloha":        { bg: "#FFEDD5", color: "#9A3412" },
                    };
                    const rows = localLogFiltered.map((r, i) => {
                      const c = akceColors[r.akce] || { bg: "#F8FAFC", color: "#334155" };
                      const rowBg = i % 2 === 0 ? c.bg : "#FFFFFF";
                      return `<tr>
                        <td style="padding:6px 10px;border:1px solid #E2E8F0;background:${rowBg};color:#1E293B;white-space:nowrap">${r.cas ? new Date(r.cas).toLocaleString("cs-CZ") : ""}</td>
                        <td style="padding:6px 10px;border:1px solid #E2E8F0;background:${rowBg};color:#1E293B">${r.uzivatel || ""}</td>
                        <td style="padding:6px 10px;border:1px solid #E2E8F0;background:${c.bg};color:${c.color};font-weight:700;text-align:center">${r.akce || ""}</td>
                        <td style="padding:6px 10px;border:1px solid #E2E8F0;background:${rowBg};color:#475569">${r.detail || ""}</td>
                      </tr>`;
                    }).join("");
                    const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel"><head><meta charset="utf-8"></head><body>
                      <table><thead><tr>
                        <th style="padding:8px 10px;background:${TENANT.p1deep};color:#fff;border:1px solid ${TENANT.p1};font-size:12px">Čas</th>
                        <th style="padding:8px 10px;background:${TENANT.p1deep};color:#fff;border:1px solid ${TENANT.p1};font-size:12px">Uživatel</th>
                        <th style="padding:8px 10px;background:${TENANT.p1deep};color:#fff;border:1px solid ${TENANT.p1};font-size:12px">Akce</th>
                        <th style="padding:8px 10px;background:${TENANT.p1deep};color:#fff;border:1px solid ${TENANT.p1};font-size:12px">Detail</th>
                      </tr></thead><tbody>${rows}</tbody></table>
                    </body></html>`;
                    const blob = new Blob([html], { type: "application/vnd.ms-excel;charset=utf-8" });
                    const a = document.createElement("a");
                    a.href = URL.createObjectURL(blob);
                    a.download = `log_aktivit_${new Date().toISOString().slice(0,10)}.xls`;
                    a.click();
                  }} style={{ padding: "5px 12px", background: isDark ? "rgba(255,255,255,0.05)" : "rgba(0,0,0,0.05)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 6, color: isDark ? "#fff" : "#1e293b", cursor: "pointer", fontSize: 12 }}>📥 Export Excel</button>
                </div>
              </div>
              <div style={{ overflowY: "auto", overflowX: "hidden", maxHeight: "calc(90vh - 280px)" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 12.5, tableLayout: "fixed" }}>
                  <colgroup>
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "14%" }} />
                    <col style={{ width: "16%" }} />
                    <col style={{ width: "auto" }} />
                    {isSuperAdmin && !isDemo && <col style={{ width: 40 }} />}
                  </colgroup>
                  <thead>
                    <tr style={{ background: isDark ? TENANT.p1deep : "#e2e8f0" }}>
                      {["Čas", "Uživatel", "Akce", "Detail", ...(isSuperAdmin && !isDemo ? [""] : [])].map(h => (
                        <th key={h} style={{ padding: "8px 12px", textAlign: "left", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontWeight: 700, fontSize: 11, borderBottom: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, overflow: "hidden", textOverflow: "ellipsis" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {localLogFiltered.map((r, i) => (
                      <tr key={r.id} style={{ background: i % 2 === 0 ? (isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)") : "transparent", opacity: r.hidden ? 0.55 : 1 }}>
                        <td style={{ padding: "7px 12px", color: isDark ? "rgba(255,255,255,0.4)" : "rgba(0,0,0,0.5)", whiteSpace: "nowrap", fontSize: 11 }}>{fmtCas(r.cas)}</td>
                        <td style={{ padding: "7px 12px", color: isDark ? "#e2e8f0" : "#1e293b" }}>
                          {r.uzivatel}
                          {r.hidden && <span style={{ marginLeft: 6, fontSize: 10, color: "rgba(148,163,184,0.8)", background: "rgba(100,116,139,0.15)", padding: "1px 5px", borderRadius: 4, fontWeight: 600 }}>skryto</span>}
                        </td>
                        <td style={{ padding: "7px 12px" }}>
                          <span style={{ background: (AKCE_COLOR[r.akce] || "#94a3b8") + "22", color: AKCE_COLOR[r.akce] || "#94a3b8", border: `1px solid ${(AKCE_COLOR[r.akce] || "#94a3b8")}44`, borderRadius: 5, padding: "2px 8px", fontSize: 11, fontWeight: 700, whiteSpace: "nowrap" }}>{r.akce}</span>
                        </td>
                        <td style={{ padding: "7px 12px", color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 12, wordBreak: "break-word" }}>{r.detail}</td>
                        {isSuperAdmin && !isDemo && (
                          <td style={{ padding: "7px 8px", textAlign: "center" }}>
                            {r.hidden ? (
                              <button onClick={() => handleUnhideLogSettings(r.id)} title="Obnovit záznam" style={{ background: "none", border: "none", color: "rgba(34,197,94,0.5)", cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 700, transition: "color 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.color = "#4ade80"}
                                onMouseLeave={e => e.currentTarget.style.color = "rgba(34,197,94,0.5)"}
                              >↩</button>
                            ) : (
                              <button onClick={() => setLogDeleteId(r.id)} title="Skrýt záznam" style={{ background: "none", border: "none", color: "rgba(239,68,68,0.4)", cursor: "pointer", fontSize: 13, padding: "0 2px", fontWeight: 700, transition: "color 0.15s" }}
                                onMouseEnter={e => e.currentTarget.style.color = "#f87171"}
                                onMouseLeave={e => e.currentTarget.style.color = "rgba(239,68,68,0.4)"}
                              >✕</button>
                            )}
                          </td>
                        )}
                      </tr>
                    ))}
                    {localLogFiltered.length === 0 && (
                      <tr><td colSpan={4} style={{ padding: 24, textAlign: "center", color: isDark ? "rgba(255,255,255,0.2)" : "rgba(0,0,0,0.3)" }}>Žádné záznamy</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* POTVRZENÍ SMAZÁNÍ ZÁZNAMU LOGU */}
        {logDeleteId && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 1600, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>
            <div style={{ background: TENANT.modalBg, borderRadius: 14, padding: "28px 32px", width: 340, border: "1px solid rgba(239,68,68,0.4)", boxShadow: "0 24px 60px rgba(0,0,0,0.7)", textAlign: "center" }}>
              <div style={{ fontSize: 28, marginBottom: 10 }}>👁️</div>
              <h3 style={{ color: "#fff", margin: "0 0 8px", fontSize: 15 }}>Skrýt záznam logu?</h3>
              <p style={{ color: "rgba(255,255,255,0.4)", margin: "0 0 22px", fontSize: 13 }}>Záznam bude skryt. Superadmin ho může kdykoli obnovit přes přepínač Skryté.</p>
              <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                <button onClick={() => setLogDeleteId(null)} disabled={logDeleting} style={{ padding: "9px 20px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer" }}>Zrušit</button>
                <button onClick={() => handleDeleteLogSettings(logDeleteId)} disabled={logDeleting} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#d97706,#b45309)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontWeight: 700 }}>{logDeleting ? "Skrývám..." : "Skrýt"}</button>
              </div>
            </div>
          </div>
        )}

        {/* footer */}
        <div style={{ padding: "14px 24px", borderTop: `1px solid ${modalDivider}`, display: "flex", gap: 10, justifyContent: "flex-end", background: modalBg }}>
          <button onClick={onClose} style={{ padding: "9px 18px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: `1px solid ${modalBorder}`, borderRadius: 8, color: modalText, cursor: "pointer", fontSize: 13 }}>Zrušit</button>

          {/* Potvrzovací dialog reset šířek */}
          {confirmResetCols && (
            <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 1500, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <div style={{ background: isDark ? TENANT.modalBg : "#fff", borderRadius: 14, padding: "28px 32px", width: 360, border: "1px solid rgba(168,85,247,0.3)", boxShadow: "0 24px 60px rgba(0,0,0,0.5)", textAlign: "center" }}>
                <div style={{ fontSize: 36, marginBottom: 12 }}>↺</div>
                <div style={{ color: isDark ? "#f8fafc" : "#1e293b", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Reset šířek sloupců?</div>
                <div style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 13, marginBottom: 24 }}>Všechny šířky sloupců se obnoví na výchozí hodnoty. Tuto akci nelze vrátit.</div>
                <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
                  <button onClick={() => setConfirmResetCols(false)} style={{ padding: "9px 20px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, color: isDark ? "#fff" : "#1e293b", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
                  <button onClick={() => { onResetColWidths(); setConfirmResetCols(false); onClose(); }} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#7c3aed,#6d28d9)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Ano, resetovat</button>
                </div>
              </div>
            </div>
          )}

          {tab !== "log" && tab !== "aplikace" && <button onClick={() => {
            // Kontrola nevyplněných polí
            const unfinished = [];
            if (tab === "ciselniky") {
              if (newF.trim()) unfinished.push("Firma");
              if (newO.trim()) unfinished.push("Objednatel");
              if (newS.trim()) unfinished.push("Stavbyvedoucí");
            }
            if (tab === "uzivatele") {
              if (newEmail.trim() || newPass.trim() || newName?.trim()) unfinished.push("Uživatel");
            }
            if (unfinished.length > 0) {
              setPendingWarn(unfinished);
            } else {
              onChange(f, o, s); onChangeUsers(uList); onClose();
            }
          }} style={{ padding: "9px 22px", background: "linear-gradient(135deg,#16a34a,#15803d)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Uložit vše</button>}
        </div>
      </div>

      {/* Varování – nevyplněná položka */}
      {pendingWarn && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 9500, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: "'Segoe UI',Tahoma,sans-serif", pointerEvents: "all" }}>
          <div style={{ background: isDark ? TENANT.modalBg : "#fff", borderRadius: 14, padding: "28px 32px", width: 380, border: `1px solid ${isDark ? "rgba(255,165,0,0.3)" : "rgba(255,165,0,0.4)"}`, boxShadow: "0 24px 60px rgba(0,0,0,0.5)", textAlign: "center" }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>⚠️</div>
            <div style={{ color: isDark ? "#f8fafc" : "#1e293b", fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Nevyplněná položka</div>
            <div style={{ color: isDark ? "rgba(255,255,255,0.5)" : "rgba(0,0,0,0.5)", fontSize: 13, marginBottom: 24 }}>
              Máš rozepsanou položku <strong>{pendingWarn.join(", ")}</strong> která nebyla přidána.<br/>
              <span style={{ fontSize: 12, marginTop: 6, display: "block" }}>Chceš ji zahodit a uložit bez ní?</span>
            </div>
            <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
              <button onClick={() => setPendingWarn(null)} style={{ padding: "9px 20px", background: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.06)", border: `1px solid ${isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)"}`, borderRadius: 8, color: isDark ? "#fff" : "#1e293b", cursor: "pointer", fontSize: 13 }}>← Zpět doplnit</button>
              <button onClick={() => { setPendingWarn(null); onChange(f, o, s); onChangeUsers(uList); onClose(); }} style={{ padding: "9px 20px", background: "linear-gradient(135deg,#dc2626,#b91c1c)", border: "none", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13, fontWeight: 600 }}>Zahodit a uložit</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// MOBILE HOOK
// ============================================================
function useIsMobile(breakpoint = 768) {
  const mq = window.matchMedia(`(max-width: ${breakpoint - 1}px)`);
  const [isMobile, setIsMobile] = useState(() => mq.matches);
  useEffect(() => {
    const handler = (e) => setIsMobile(e.matches);
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);
  return isMobile;
}

// ============================================================
// STAVBA CARD (mobilní kartička)
// ============================================================
function StavbaCard({ row, isEditor, isAdmin, isDark, firmy, onEdit, onCopy, onDelete, onHistorie, showTooltip, hideTooltip }) {
  const firmaColor = (firmy.find(f => f.hodnota === row.firma)?.barva) || TENANT.p2;

  const parseDatumCard = (s) => {
    if (!s) return null;
    const p = s.trim().split(".");
    if (p.length !== 3) return null;
    const d = new Date(`${p[2]}-${p[1].padStart(2,"0")}-${p[0].padStart(2,"0")}`);
    return isNaN(d) ? null : d;
  };

  const termínBadge = () => {
    if (!row.ukonceni) return null;
    const datum = parseDatumCard(row.ukonceni);
    if (!datum) return null;
    const dnes = new Date(); dnes.setHours(0,0,0,0);
    const isFak = row.cislo_faktury && row.cislo_faktury.trim() !== "" && Number(row.castka_bez_dph) !== 0 && row.splatna;
    if (isFak) return { label: "vyfakturováno", bg: "rgba(34,197,94,0.15)", color: "#4ade80", border: "rgba(34,197,94,0.4)" };
    if (datum < dnes) return { label: "⚠️ prošlý termín", bg: "rgba(239,68,68,0.15)", color: "#f87171", border: "rgba(239,68,68,0.4)" };
    const diff = Math.round((datum - dnes) / 86400000);
    if (diff <= 10) return { label: `za ${diff} dní`, bg: "rgba(251,191,36,0.15)", color: "#fbbf24", border: "rgba(251,191,36,0.4)" };
    return null;
  };

  const badge = termínBadge();
  const cardBg = isDark ? TENANT.modalBg : "#ffffff";
  const borderC = isDark ? "rgba(255,255,255,0.1)" : "rgba(0,0,0,0.1)";
  const textC = isDark ? "#e2e8f0" : "#1e293b";
  const mutedC = isDark ? "rgba(255,255,255,0.45)" : "rgba(0,0,0,0.45)";
  const metricBg = isDark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.04)";
  const dividerC = isDark ? "rgba(255,255,255,0.07)" : "rgba(0,0,0,0.07)";

  return (
    <div style={{ background: cardBg, borderRadius: 14, border: `1px solid ${borderC}`, fontFamily: "'Segoe UI',Tahoma,sans-serif" }}>

      {/* header */}
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 14px", borderBottom: `1px solid ${dividerC}` }}>
        <div style={{ width: 10, height: 10, borderRadius: "50%", background: firmaColor, flexShrink: 0 }} />
        <span style={{ fontSize: 11, fontWeight: 600, color: firmaColor }}>{row.firma || "—"}</span>
        <span style={{ marginLeft: "auto", fontSize: 11, color: mutedC }}>{row.cislo_stavby || ""}</span>
      </div>

      {/* název */}
      <div style={{ padding: "10px 14px 8px" }}>
        <div style={{ fontSize: 14, fontWeight: 600, color: textC, lineHeight: 1.35, marginBottom: 10 }}>{row.nazev_stavby || "—"}</div>

        {/* metriky */}
        <div style={{ display: "flex", gap: 7, marginBottom: 10 }}>
          {[
            { label: "nabídka", val: row.nabidka },
            { label: "vyfakt.", val: row.vyfakturovano, green: Number(row.vyfakturovano) > 0 },
            { label: "rozdíl", val: row.rozdil, colored: true },
          ].map(m => (
            <div key={m.label} style={{ flex: 1, background: metricBg, borderRadius: 8, padding: "7px 9px" }}>
              <div style={{ fontSize: 10, color: mutedC, marginBottom: 2 }}>{m.label}</div>
              <div style={{ fontSize: 12, fontWeight: 600, color: m.colored ? (Number(m.val) >= 0 ? "#4ade80" : "#f87171") : m.green ? "#4ade80" : textC }}>
                {m.val != null && m.val !== "" && Number(m.val) !== 0 ? Number(m.val).toLocaleString("cs-CZ", { minimumFractionDigits: 0, maximumFractionDigits: 0 }) : "—"}
              </div>
            </div>
          ))}
        </div>

        {/* termín + badge */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <span style={{ fontSize: 11, color: mutedC }}>{row.ukonceni ? `ukončení: ${row.ukonceni}` : "bez termínu"}</span>
          {badge && <span style={{ fontSize: 10, fontWeight: 600, padding: "2px 8px", borderRadius: 20, background: badge.bg, color: badge.color, border: `1px solid ${badge.border}` }}>{badge.label}</span>}
        </div>
      </div>

      {/* poznámka */}
      {row.poznamka && row.poznamka.trim() !== "" && (
        <div style={{ display: "flex", gap: 7, alignItems: "flex-start", padding: "6px 14px", background: isDark ? "rgba(255,255,255,0.02)" : "rgba(0,0,0,0.02)", borderTop: `1px solid ${dividerC}` }}>
          <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>💬</span>
          <span style={{ fontSize: 11, color: mutedC, lineHeight: 1.5 }}>{row.poznamka}</span>
        </div>
      )}

      {/* faktury */}
      {row.cislo_faktury && row.cislo_faktury.trim() !== "" && (
        <div style={{ padding: "7px 14px", background: isDark ? "rgba(255,255,255,0.03)" : "rgba(0,0,0,0.03)", borderTop: `1px solid ${dividerC}` }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 7 }}>
            <span style={{ fontSize: 12, fontWeight: 700, color: "#ef4444", flexShrink: 0, marginTop: 1, textShadow: "0 0 6px rgba(239,68,68,0.5)" }}>e</span>
            <span style={{ fontSize: 11, color: mutedC, lineHeight: 1.6 }}>
              <span style={{ color: textC, fontWeight: 600 }}>{row.cislo_faktury}</span>
              {Number(row.castka_bez_dph) > 0 && <> · {Number(row.castka_bez_dph).toLocaleString("cs-CZ")} Kč</>}
              {row.splatna && <> · spl. {row.splatna}</>}
            </span>
          </div>
          {row.cislo_faktury_2 && row.cislo_faktury_2.trim() !== "" && (
            <div style={{ display: "flex", alignItems: "flex-start", gap: 7, marginTop: 5, paddingTop: 5, borderTop: `1px dashed ${dividerC}` }}>
              <span style={{ fontSize: 12, fontWeight: 700, color: "#facc15", flexShrink: 0, marginTop: 1, textShadow: "0 0 6px rgba(250,204,21,0.5)" }}>S</span>
              <span style={{ fontSize: 11, color: mutedC, lineHeight: 1.6 }}>
                <span style={{ color: textC, fontWeight: 600 }}>{row.cislo_faktury_2}</span>
                {Number(row.castka_bez_dph_2) > 0 && <> · {Number(row.castka_bez_dph_2).toLocaleString("cs-CZ")} Kč</>}
                {row.splatna_2 && <> · spl. {row.splatna_2}</>}
              </span>
            </div>
          )}
        </div>
      )}

      {/* akce */}
      {(isEditor || isAdmin) && (
        <div style={{ display: "flex", gap: 6, padding: "8px 14px", borderTop: `1px solid ${dividerC}`, flexWrap: "wrap" }}>
          <button onClick={() => onHistorie(row)} style={{ padding: "4px 10px", background: "transparent", border: `1px solid ${borderC}`, borderRadius: 6, color: mutedC, cursor: "pointer", fontSize: 11 }}>🕐 hist.</button>
          <button onClick={() => onCopy(row)} style={{ padding: "4px 10px", background: "rgba(16,185,129,0.1)", border: "1px solid rgba(16,185,129,0.3)", borderRadius: 6, color: "#34d399", cursor: "pointer", fontSize: 11 }}>📋</button>
          <button onClick={() => onEdit(row)} style={{ padding: "4px 10px", background: tc1(0.15), border: `1px solid ${tc1(0.3)}`, borderRadius: 6, color: TENANT.p3, cursor: "pointer", fontSize: 11, marginLeft: "auto" }}>✏️ editovat</button>
          {isAdmin && <button onClick={() => onDelete(row.id)} style={{ padding: "4px 10px", background: "rgba(239,68,68,0.1)", border: "1px solid rgba(239,68,68,0.3)", borderRadius: 6, color: "#f87171", cursor: "pointer", fontSize: 11 }}>🗑️</button>}
        </div>
      )}
    </div>
  );
}

// ============================================================
// MAIN APP
// ============================================================
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
      const orphans = data.filter(s => s.firma && !firmyNames.includes(s.firma));
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
  const [importJIConfirm, setImportJIConfirm] = useState(null); // { file, stavbyVDB, katPole }
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
    setImportJIConfirm(null);
    setImportJIConfirmText("");
    const reader = new FileReader();
    reader.onload = async (ev) => {
      try {
        const wb = XLSX.read(ev.target.result, { type: "array", cellDates: true });
        const ws = wb.Sheets[wb.SheetNames[0]];
        const raw = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null, raw: true, cellDates: true });
        // Řádek 0 = hlavička, data od řádku 1
        const dataRows = raw.slice(1);
        const numVal = (v) => {
          if (v === null || v === undefined || v === "") return 0;
          if (typeof v === "number") return v;
          const n = parseFloat(String(v).replace(/\s/g,"").replace(",","."));
          return isNaN(n) ? 0 : n;
        };
        let stavbyRows = [];
        for (const row of dataRows) {
          const nazev = row[3]; // D = Název
          if (!nazev) continue;
          const fields = {
            cislo_stavby:   String(row[2] || ""),       // C = Číslo
            nazev_stavby:   String(nazev),               // D = Název
            sod:            String(row[5] || ""),        // F = Poptávka
            objednatel:     String(row[6] || ""),        // G = Odběratel
            nabidkova_cena: numVal(row[7]),              // H = Smluvní cena → nabidkova_cena
            ze_dne:         fmtDateFromXls(row[8]),      // I = Plán zahájení
            ukonceni:       fmtDateFromXls(row[9]),      // J = Termín
            stavbyvedouci:  String(row[12] || ""),       // M = Jméno zástupce odběratele
            ps_i: 0, snk_i: 0, bo_i: 0, ps_ii: 0, bo_ii: 0, poruch: 0,
            firma: "", vyfakturovano: 0, zrealizovano: 0,
            cislo_faktury: "", castka_bez_dph: 0, splatna: "",
            cislo_faktury_2: "", castka_bez_dph_2: 0, splatna_2: "",
            poznamka: "",
          };
          // H → vybraný kat. sloupec
          if (katPole && katPole !== "nikam") fields[katPole] = numVal(row[7]);
          stavbyRows.push(fields);
        }
        if (stavbyRows.length === 0) {
          setImportLog({ ok: 0, chyby: ["Nenalezena žádná data ke importu."] });
          return;
        }
        let ok = 0, chyby = [];
        await sb("stavby?id=gt.0", { method: "DELETE", prefer: "return=minimal" });
        const NUM = ["ps_i","snk_i","bo_i","ps_ii","bo_ii","poruch","nabidkova_cena","vyfakturovano","zrealizovano","castka_bez_dph","castka_bez_dph_2"];
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
        await loadAll();
        logAkce(user?.email, "Import JI", `${ok} staveb importováno z ${file.name} (${katPole})`);
        setImportLog({ ok, chyby, zprava: `Importováno ${ok} staveb z "${file.name}"` });
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
              <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 8, padding: "10px 14px", marginBottom: 18, fontSize: 12, color: "#fca5a5" }}>
                ⚠️ Všechna stávající data budou <strong>trvale smazána</strong>. Akce je <strong>nevratná</strong>.
              </div>
              <div style={{ marginBottom: 16 }}>
                <div style={{ color: "rgba(255,255,255,0.5)", fontSize: 12, marginBottom: 6 }}>Pro pokračování napište <strong style={{ color: "#fbbf24" }}>POTVRDIT</strong>:</div>
                <input value={importJIConfirmText} onChange={e => setImportJIConfirmText(e.target.value)} placeholder="POTVRDIT" autoFocus
                  style={{ width: "100%", padding: "9px 12px", background: TENANT.inputBg, border: `1px solid ${confirmed ? "rgba(34,197,94,0.5)" : "rgba(255,255,255,0.15)"}`, borderRadius: 8, color: "#fff", fontSize: 14, outline: "none", boxSizing: "border-box", textAlign: "center", letterSpacing: 2, fontWeight: 700 }} />
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button onClick={() => { setImportJIConfirm(null); setImportJIConfirmText(""); }} style={{ flex: 1, padding: "10px 0", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, color: "#fff", cursor: "pointer", fontSize: 13 }}>Zrušit</button>
                <button onClick={doImportJI} disabled={!confirmed}
                  style={{ flex: 1, padding: "10px 0", background: confirmed ? "linear-gradient(135deg,#059669,#047857)" : "rgba(255,255,255,0.05)", border: "none", borderRadius: 8, color: confirmed ? "#fff" : "rgba(255,255,255,0.2)", cursor: confirmed ? "pointer" : "not-allowed", fontSize: 13, fontWeight: 700 }}>
                  ✅ Importovat JI
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
