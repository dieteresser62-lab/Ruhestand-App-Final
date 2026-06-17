# Architektur und Fachkonzept: Ruhestand-Suite

**Technische Dokumentation der DIY-Software für Ruhestandsplanung**

**Dokumentstand:** 2026-06-12
**Geprüfte Codebasis:** lokale Arbeitskopie vom 2026-06-12
**Engine API:** v31.0
**Codeumfang:** Momentaufnahme, siehe Komponenten-Tabelle
**Lizenz:** MIT

---

# Übersicht

## Inhaltsverzeichnis

- [Software-Profil](#software-profil)
- [Komponenten](#komponenten)
- [Hauptfunktionen](#hauptfunktionen)
- [Bekannte Einschränkungen](#bekannte-einschränkungen)
- [Anlagephilosophie und Eignung](#anlagephilosophie-und-eignung)
- [Geltungsbereich und Abgrenzung](#geltungsbereich-und-abgrenzung)
- [Release-Checkliste (Dokumentpflege)](#release-checkliste-dokumentpflege)
- [Technische Architektur](#technische-architektur)
- [Fachliche Algorithmen](#fachliche-algorithmen)
- [Marktvergleich](#marktvergleich)
- [Forschungsabgleich](#forschungsabgleich)
- [Appendix: Modul-Inventar](#appendix-modul-inventar)

## Software-Profil

**Ruhestand-Suite** — DIY-Softwaresuite zur Ruhestandsplanung
- **Sprache:** JavaScript (ES6 Module)
- **Lizenz:** MIT
- **Zielgruppe:** Deutschsprachige Einzelpersonen und Haushalte (inkl. Paare) mit Finanzverständnis

## Komponenten

*Momentaufnahme der lokalen Arbeitskopie vom 2026-06-12. Modul- und Zeilenzahlen sind Orientierungshilfen, nicht normative Architekturgrenzen. Dieses Dokument beschreibt die Architektur und die fachlichen Zusammenhänge eigenständig; spezialisierte Referenzen (`TECHNICAL.md`, Modul-READMEs, `engine/README.md`, `tests/README.md`) dienen als ergänzende Detail- und Exportkataloge.*

| Komponente | Zweck | Momentaufnahme |
|------------|-------|----------------|
| **Balance-App** | Jahresplanung: Liquidität, Entnahme, Steuern, Transaktionen, Ausgaben-Check, Pflegebucket-Diagnose, Jahresabschluss-Snapshots | 35 JS-Module unter `app/balance/` |
| **Simulator** | Monte-Carlo-Simulation, Parameter-Sweeps, Auto-Optimize, Dynamic Flex, Pflegebucket-Wirklogik | 87 JS-Module unter `app/simulator/` |
| **Engine** | Kern-Berechnungslogik, Guardrails, Steuern | 24 MJS-Module unter `engine/`, ca. 4.240 Zeilen |
| **Workers** | Parallelisierung für MC/Sweep/Optimizer-Pfade | 3 JS-Module unter `workers/`, ca. 757 Zeilen |
| **Tests** | Unit-, Integration-, Browser-Smoke- und Coverage-Gates | 91 `*.test.mjs` Dateien; 2382 Assertions im Lauf vom 2026-06-15; Coverage-Baseline 72,25% |
| **Profile, Tranchen, Shared** | Profilverwaltung, Profilverbund, Tranchenstatus, gemeinsame Utilities | JS-Module unter `app/profile/`, `app/tranches/`, `app/shared/`, zusammen ca. 2.959 Zeilen |

*Hinweis: Dieses Dokument beschreibt Konzepte und Architekturentscheidungen. Für konkrete Implementierungsdetails gelten die genannten Module und Tests als Referenz; exakte Code-Zeilen werden bewusst vermieden, weil sie nach Refactorings schnell veralten.*

## Hauptfunktionen

Die Ruhestand-Suite kombiniert folgende Funktionen:

1. **Vollständige deutsche Kapitalertragssteuer** (Abgeltungssteuer, Soli, KiSt, Teilfreistellung, SPB, steueroptimierte Verkaufsreihenfolge, Verlustverrechnungstopf mit jahresübergreifendem Verlustvortrag)
2. **Dynamische Guardrails** mit 7-stufiger Marktregime-Erkennung
3. **Pflegefall-Modellierung** (PG1-5, Progression, Dual-Care)
4. **Multi-Profil-Unterstützung** für Paare mit getrennten Depots und **Witwenrente**
5. **Tranchen-Management** mit FIFO-Steueroptimierung und Online-Kursaktualisierung
6. **Balance-App** für operative Jahresplanung mit Online-Datenabruf
7. **Simulator** mit Monte-Carlo, historischem Backtest, Parameter-Sweeps und mehrphasiger Auto-Optimierung
8. **Historische Daten ab 1925** mit Stress-Szenarien (Große Depression, WWII)
9. **Optionale Ansparphase** für vollständige Lebenszyklus-Modellierung
10. **Rentensystem** für 1-2 Personen mit verschiedenen Indexierungsarten
11. **Portable Desktop-App** via Tauri für Windows, macOS und Linux
12. **Ausgaben-Check** zur Kontrolle monatlicher Ausgaben gegen das Budget mit CSV-Import, Hochrechnung und Ampel-Visualisierung
13. **Dynamic-Flex (VPW)** mit CAPE-basierter Renditeerwartung, Sterbetafeln, konservativen Langlebigkeitsaufschlaegen, EMA-Glättung und Go-Go-Phase; integriert in Balance-App, Backtest, Monte Carlo, Sweep und Auto-Optimize
14. **Auto-CAPE im Jahreswechsel** (US-Shiller-CAPE mit Fallback-Kette und non-blocking Fehlerbehandlung)
15. **Pflegebucket** als gesperrte Geldmarkt-/Cash-Reserve mit Profildefinition, Simulator-Air-Gap, Pflegegrad-Trigger, Monte-Carlo-KPIs und Balance-Diagnose
16. **Mindest-Flex p.a.** als optionale Untergrenze für Flex-Ausgaben in gekürzten Safety-/Guardrail-Jahren; ratenbasiert, validiert gegen den Flex-Bedarf und in Balance, Simulator, Backtest, Monte Carlo, Sweep, Auto-Optimize und Profilverbund integriert
17. **Internes Jahresabschluss-Snapshot-Archiv** mit Pre-Mutation-Snapshots, separatem Browser-/Tauri-Speicher und Standard-Restore mit Profilzuordnungspruefung

## Bekannte Einschränkungen

- Stationary Bootstrap ist implementiert, aber noch ohne explizites Fat-Tail-Overlay
- Keine expliziten Fat Tails im Return-Modell
- Index-Variante (`msci_eur`) siehe Abschnitt C.3.3

## Anlagephilosophie und Eignung

Die Suite basiert auf einer spezifischen Anlagephilosophie und ist für Nutzer konzipiert, die diesem Ansatz folgen:

### Vorausgesetztes Anlagemodell

| Asset-Klasse | Umsetzung | Rolle im Portfolio |
|--------------|-----------|-------------------|
| **Liquidität** | Tagesgeld/Giro-nahe Liquidität und Geldmarkt-ETF (z.B. €STR-basiert) | Laufende Entnahmen, Notreserve, Runway-Puffer |
| **Aktien** | Breit gestreuter Aktien-ETF (z.B. Vanguard FTSE All-World, MSCI World, ACWI) | Langfristiger Vermögensaufbau und -erhalt |
| **Gold** | Physisch, ETC oder vergleichbarer Gold-Baustein | Krisenabsicherung, Rebalancing-Quelle in Bärenmärkten |
| **Bonds / Anleihen** | Optional im Modus **3-Bucket Jilge**: Anleihen-ETF bzw. Bond-Tranchen | Zusätzlicher defensiver Puffer zwischen Liquidität und Aktien; in schlechten Jahren vorrangige Verkaufsquelle, in guten Jahren Zieltopf zum Wiederauffüllen |

Die Grundstrategie bleibt ein einfaches, passives Portfolio aus Liquidität, Aktien-ETF und optional Gold. Der per Strategieauswahl aktivierbare Modus **3-Bucket Jilge** erweitert dieses Modell um einen Bond-/Anleihen-Bucket. Bonds sind damit kein allgemeines Multi-Asset-Modell beliebiger Rentenpapiere, sondern ein regelbasierter Zieltopf innerhalb der Entnahmelogik.

### Kernprinzipien

1. **Passive, breit diversifizierte Aktienanlage:** Die Suite geht von einem oder wenigen global gestreuten Aktien-ETFs aus – keine Einzelaktien, keine Sektorwetten, keine aktive Titelauswahl.

2. **Liquiditätsmanagement über Geldmarkt-ETF:** Statt klassischem Tagesgeld bei Banken wird Liquidität in Geldmarkt-ETFs gehalten, die täglich handelbar sind und aktuell marktnahe Zinsen bieten.

3. **Gold als antizyklischer Puffer:** Gold dient nicht primär der Rendite, sondern als Stabilitätsanker. In Bärenmärkten, wenn Aktien fallen, kann Gold zur Liquiditätsbeschaffung verkauft werden, ohne Aktien zu ungünstigen Kursen liquidieren zu müssen.

4. **Optionaler 3-Bucket-Jilge-Puffer:** Im 3-Bucket-Modus kommen Bonds/Anleihen-ETF als zusätzlicher defensiver Puffer hinzu. Die Logik kann in schlechten Jahren Bond-Bestände statt Aktien heranziehen und in guten Jahren den Bond-Zieltopf wieder auffüllen.

5. **Regelbasierte Entnahme:** Guardrails, Marktregime-Erkennung und optionale 3-Bucket-Regeln steuern die Entnahmen automatisch – keine diskretionären Timing-Entscheidungen.

### Für wen die Suite geeignet ist

✅ Passiv-Investoren mit Buy-and-Hold-Strategie
✅ Nutzer von Welt-ETFs (MSCI World, FTSE All-World, ACWI)
✅ Anleger, die Geldmarkt-ETFs als Liquiditätsinstrument nutzen
✅ Investoren mit optionaler Gold-Beimischung zur Diversifikation
✅ Nutzer, die im 3-Bucket-Jilge-Modus einen defensiven Bond-/Anleihen-ETF-Puffer modellieren möchten
✅ Ruheständler, die regelbasierte Entnahmestrategien bevorzugen

### Für wen die Suite nicht geeignet ist

❌ **Einzelaktien-Investoren:** Keine Unterstützung für Stock-Picking oder Dividendenstrategien mit Einzeltiteln
❌ **Komplexe Anleihen-Portfolios:** Keine detaillierte Modellierung einzelner Staatsanleihen, Unternehmensanleihen, Laufzeiten, Kupons, Duration-Profile oder Zinskurven. Unterstützt ist ein vereinfachter Bond-/Anleihen-ETF-Bucket im 3-Bucket-Jilge-Modus.
❌ **Immobilien-Investoren:** Keine Integration von Mieteinnahmen oder Immobilienwerten
❌ **Krypto-Anleger:** Keine Unterstützung für Bitcoin, Ethereum oder andere Kryptowährungen
❌ **Aktive Trader:** Keine Unterstützung für Market-Timing, Optionen oder gehebelte Produkte
❌ **Freie Multi-Asset-Strategien:** Keine Modellierung komplexer Portfolios mit beliebig vielen Asset-Klassen jenseits der unterstützten Bausteine Liquidität, Aktien-ETF, Gold und optionalem Bond-Bucket.

### Warum diese Einschränkung?

Die Fokussierung auf ein einfaches, aber robustes Anlagemodell ermöglicht:

- **Präzise Steuerberechnung:** Die deutsche Kapitalertragssteuer wird exakt für ETFs mit Teilfreistellung modelliert
- **Zuverlässige historische Simulation:** Die Monte-Carlo-Daten basieren auf MSCI-World-ähnlichen Renditereihen
- **Klare Entscheidungslogik:** Guardrails, Rebalancing- und 3-Bucket-Regeln sind auf wenige Bausteine abgestimmt: Aktien-ETF, Geldmarkt/Liquidität, Gold und optional Bonds
- **Geringere Komplexität:** Weniger Stellschrauben bedeuten weniger Fehlkonfiguration

*Wer einem anderen Anlagemodell folgt, sollte prüfen, ob die Annahmen der Suite auf das eigene Portfolio übertragbar sind.*

## Geltungsbereich und Abgrenzung

- **Monte-Carlo vs. Backtest:** Die MC-Datenbasis reicht bis 1925 zurück; der deterministische Backtest nutzt ein engeres historisches Fenster (siehe Abschnitt C.8).
- **Single vs. Haushalt:** Das Dokument beschreibt sowohl Einzelprofil- als auch Profilverbund-Flows. Aussagen zur Zielgruppe und zu Workflows gelten für beide Modi.
- **Codebezug:** Codezeilen-/LOC-Angaben dienen der Orientierung und sind nicht normativ. Bei Abweichungen gilt immer der aktuelle Code im Repository.
- **Abgrenzung zu `TECHNICAL.md`:** `TECHNICAL.md` dient als kompakte Betriebs- und Entwicklerreferenz. Dieses Dokument enthält die vertiefte fachliche Herleitung, Designentscheidungen und Vergleichskapitel.
- **Doku-Scope:** Dieses Dokument muss als eigenständige Architektur- und Fachlektüre ausreichen. Spezialisierte Referenzen liefern ergänzende Exportlisten, Betriebsdetails und Testinventare, ersetzen aber nicht die konzeptionelle Beschreibung hier.

## Release-Checkliste (Dokumentpflege)

Vor jedem Release oder größeren Merge diese Punkte aktualisieren:

1. **Metadaten aktualisieren:** `Dokumentstand`, `Geprüfte Codebasis`, `Engine API`.
2. **Bestandszahlen prüfen:** Modulanzahlen, Testdateien, LOC-Schätzwerte, Build-Hinweise.
3. **Codeverweise verifizieren:** Dateinamen, Funktionsnamen und Modulzuordnungen (insb. bei Refactorings).
4. **Zeitfenster prüfen:** Historische Datenräume in MC/Backtest auf Konsistenz prüfen und klar abgrenzen.
5. **Feature-Delta nachziehen:** Neue Features in `Hauptfunktionen`, Architekturabschnitten und Appendix ergänzen.
6. **Quellenabschnitte aktualisieren:** Externe Vergleiche/Forschung mit Stand und ggf. Versionshinweis versehen.
7. **Smoke-Review durchführen:** Dokument auf doppelte/obsolete Aussagen und widersprüchliche Zahlen durchsuchen.

Reproduzierbare Inventarpruefung fuer die Komponenten-Tabelle:

```powershell
(Get-ChildItem app\balance -Filter *.js).Count
(Get-ChildItem app\simulator -Filter *.js).Count
(Get-ChildItem engine -Recurse -Filter *.mjs).Count
(Get-ChildItem workers -Filter *.js).Count
Get-ChildItem tests -Filter *.test.mjs | Measure-Object | Select-Object -ExpandProperty Count
Get-ChildItem app\balance -Filter *.js | Get-Content | Measure-Object -Line
Get-ChildItem app\simulator -Filter *.js | Get-Content | Measure-Object -Line
Get-ChildItem engine -Recurse -Filter *.mjs | Get-Content | Measure-Object -Line
Get-ChildItem workers -Filter *.js | Get-Content | Measure-Object -Line
Get-ChildItem app\profile,app\tranches,app\shared -Filter *.js | Get-Content | Measure-Object -Line
```

---

# Technische Architektur

## B.1 Drei-Schichten-Architektur

Die Suite umfasst mehrere HTML-Oberflächen und Begleitmodule: Neben Balance und Simulator gibt es Einstiegsseiten für Profilverwaltung, Tranchenverwaltung und Handbuch; die UI-nahe Logik ist in thematische ES-Module aufgeteilt. Die Engine bildet die gemeinsame deterministische Rechenschicht, `engine.js` ist daraus generiert.

### B.1.0 Aktuelle Top-Level-Struktur

| Bereich | Pfade | Rolle |
|---------|-------|-------|
| **Start- und Oberflächen-HTML** | `index.html`, `Balance.html`, `Simulator.html`, `depot-tranchen-manager.html`, `Handbuch.html` | Einstieg, Profilverwaltung, Jahresplanung, Simulation, Tranchenpflege, lokale Hilfe |
| **Balance-App** | `app/balance/`, `css/balance.css` | Operative Jahresplanung, Diagnose, Jahresupdate, Ausgaben-Check, Profilverbund-Anbindung |
| **Simulator** | `app/simulator/`, `simulator.css` | Monte Carlo, Backtest, Sweep, Auto-Optimize, Pflege/Rente/Portfolio-UI, DOM-freie Jahreslogik |
| **Profil/Verbund/Tranchen** | `app/profile/`, `app/tranches/` | Profilregistry, Profilwechsel, Profilverbund-Aggregation, Tranchenstatus und Tranchenmanager |
| **Shared Utilities** | `app/shared/`, `types/` | Formatter, Feature-Flags, Security-Utilities, PersistenceFacade, SnapshotArchive, gemeinsame Typ-/Contract-Hilfen |
| **Engine-Quellen** | `engine/` | ESM-Quelle für Validierung, Marktanalyse, Spending-Policies, Steuer-/Transaktionslogik |
| **Generierte Engine** | `engine.js` | Browser-Bundle bzw. Modul-Fallback der Engine; nicht manuell bearbeiten |
| **Workers** | `workers/`, `app/simulator/worker-job-runner.js` | Parallele MC-/Sweep-/Optimizer-Jobs mit seriellen Fallbacks |
| **Desktop-Paketierung** | `src-tauri/`, `dist/`, `scripts/` | Tauri-WebView, integrierter Yahoo-Proxy, Sync-/Build-Skripte |
| **Tests und Doku** | `tests/`, `docs/reference/`, `docs/internal/` | Regressionstests, Referenzdoku, interne Arbeitspläne |

### B.1.1 Laufzeitschichten

```
┌─────────────────────────────────────────────────────────────┐
│                    PRÄSENTATIONSSCHICHT                     │
├──────────────┬──────────────┬──────────────┬────────────────┤
│ index.html   │ Balance.html │ Simulator    │ Tranchen/      │
│ Profil- und  │ Jahresplan,  │ Monte Carlo, │ Handbuch       │
│ Startseite   │ Diagnose     │ Backtest     │ Zusatzseiten   │
├──────────────┴──────────────┴──────────────┴────────────────┤
│ app/balance/  app/simulator/  app/profile/  app/tranches/   │
│ app/shared/   types/                                           │
├─────────────────────────────────────────────────────────────┤
│                     ENGINE-SCHICHT                           │
│  engine/ (ESM-Quelle)  ── build-engine.mjs ──>  engine.js     │
│                                                             │
│  InputValidator → MarketAnalyzer → Spending-Policies         │
│        ↓                 ↓                 ↓                 │
│  Tax Settlement ← TransactionEngine ← Sale/3-Bucket-Logik     │
├─────────────────────────────────────────────────────────────┤
│                   PARALLELISIERUNG                          │
│  workers/worker-pool.js  workers/mc-worker.js               │
│  workers/worker-telemetry.js  app/simulator/*worker*        │
│  MC, Sweep und Auto-Optimize nutzen Worker mit Fallbacks     │
├─────────────────────────────────────────────────────────────┤
│                   AUSLIEFERUNG / LAUFZEIT                   │
│  Browser über lokalen Webserver oder Tauri aus dist/         │
│  Optionale Live-Daten: lokaler Yahoo-Proxy + CSP-Allowlist   │
└─────────────────────────────────────────────────────────────┘
```

**Aktuelle Bestandszahlen (2026-06-12):**

- `app/balance/`: 35 JS-Module
- `app/simulator/`: 87 JS-Module
- `engine/`: 24 MJS-Module
- `workers/`: 3 JS-Module
- `tests/`: 91 Testdateien

## B.1.2 Tauri Desktop-App (Portable EXE)

### Was ist Tauri?

**Tauri** ist ein modernes Framework zur Erstellung von Desktop-Anwendungen mit Web-Technologien (HTML/CSS/JavaScript). Im Gegensatz zu Electron verwendet Tauri:

| Aspekt | Tauri | Electron |
|--------|-------|----------|
| **Backend** | Rust (nativ, sicher) | Node.js |
| **WebView** | System-WebView (Edge/WebKit) | Chromium (gebündelt) |
| **Binärgröße** | ~3-10 MB | ~150-200 MB |
| **RAM-Verbrauch** | ~30-50 MB | ~150-300 MB |
| **Sicherheit** | Sandbox, minimale Permissions | Volle Node.js-Rechte |

### Ruhestand-Suite als Desktop-App

Die Suite wird als **native Desktop-App** für alle Plattformen ausgeliefert (siehe auch B.1.3 für Details zu macOS/Linux):

| Plattform | Format | Größe |
|-----------|--------|-------|
| **Windows** | `RuhestandSuite.exe` | ~8 MB |
| **macOS** | `RuhestandSuite.app` / `.dmg` | ~10 MB |
| **Linux** | AppImage / `.deb` | ~12 MB |

**Projektstruktur:**

```
src-tauri/
├── Cargo.toml          # Rust-Abhängigkeiten
├── tauri.conf.json     # App-Konfiguration (Fenster, Permissions)
├── src/
│   ├── main.rs         # Rust-Haupteintrag
│   └── lib.rs          # Tauri-Bindings
└── icons/              # App-Icons
```

**Konfiguration** (`tauri.conf.json`):
```json
{
  "productName": "RuhestandSuite",
  "version": "0.1.0",
  "identifier": "com.dieter.ruhestandsapp",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "security": {
      "csp": {
        "connect-src": "'self' http://127.0.0.1:8787 http://localhost:8787 https://data-api.ecb.europa.eu https://api.worldbank.org https://stats.oecd.org https://r.jina.ai",
        "worker-src": "'self' blob:"
      },
      "dangerousDisableAssetCspModification": true
    },
    "windows": [{
      "title": "RuhestandsApp",
      "width": 1920,
      "height": 1080,
      "resizable": true
    }]
  }
}
```

### Eigenschaften der Desktop-Version

| Aspekt | Beschreibung |
|---------|--------------|
| **Multi-Plattform** | Eine Codebasis für Windows, macOS und Linux |
| **Portable** | Keine Installation nötig, läuft von USB-Stick (AppImage auf Linux) |
| **Offline** | Funktioniert ohne Internetverbindung |
| **Datenschutz** | Keine Daten verlassen den Rechner |
| **Performance** | Natives Fenster, kein Browser-Overhead |
| **Leichtgewichtig** | ~8-12 MB statt ~200 MB bei Electron-Apps |

### Live-Daten in Browser und Tauri

Live-Daten sind optional. Ohne Netzwerk, blockierte Endpunkte oder fehlenden Proxy muss die Suite mit lokalen/manuellen Werten weiterlaufen und Fehler sichtbar protokollieren, statt das Planungsjahr zu blockieren.

| Quelle | Pfad | Laufzeit |
|--------|------|----------|
| Yahoo Finance | lokaler Proxy `http://127.0.0.1:8787` bzw. `http://localhost:8787` | Browser: Node-Proxy aus `start_suite.*`; Tauri: integrierter Rust-Proxy in `src-tauri/src/lib.rs` |
| ECB Data API | `https://data-api.ecb.europa.eu` | direkter Fetch aus Browser/Tauri-WebView |
| World Bank API | `https://api.worldbank.org` | direkter Fetch aus Browser/Tauri-WebView |
| OECD stats | `https://stats.oecd.org` | direkter Fetch aus Browser/Tauri-WebView |
| CAPE/Yale-Mirror | `https://r.jina.ai` | direkter Fetch aus Browser/Tauri-WebView |

Die Tauri-CSP in `src-tauri/tauri.conf.json` muss diese Ziele explizit unter `app.security.csp.connect-src` erlauben. Neue externe Live-Datenquellen müssen gleichzeitig in `docs/reference/DATA_SOURCES.md` dokumentiert und in der CSP ergänzt werden.

### Build-Prozess

```bash
# Windows-Shortcut für den Produktivbuild
build-tauri.bat

# Entspricht intern:
# 1) npm run sync-dist
# 2) dist/ validieren
# 3) npm run tauri:build
# 4) Copy src-tauri/target/release/ruhestand_suite.exe -> RuhestandSuite.exe
```

Der gleiche Build-Pfad ist als npm-Skript verfügbar:

```bash
npm run build-tauri-exe
```

`scripts/build-tauri.ps1` prüft vor dem Build `npm`, Rust/Cargo, den MSVC-Toolchain-Zugriff und nach dem Sync zentrale `dist/`-Assets. Der Build nutzt immer `dist/` als Frontend-Eingang; `scripts/sync-dist.ps1` kopiert die Laufzeitdateien frisch und schließt Entwicklungs-, Test-, Doku- und Release-Artefakte aus. Änderungen an `engine/` müssen vorher mit `npm run build:engine` in `engine.js` übertragen werden; für CI/Release steht `npm run build:engine:strict` bereit.

**Output je nach Plattform:**
- **Windows (Build-Artefakt):** `src-tauri/target/release/ruhestand_suite.exe`
- **Windows (kopiertes Repo-Root-Artefakt):** `RuhestandSuite.exe`
- **macOS:** `src-tauri/target/release/bundle/macos/RuhestandSuite.app`
- **Linux:** `src-tauri/target/release/bundle/appimage/RuhestandSuite.AppImage`

*Für detaillierte Build-Anleitungen aller Plattformen siehe Abschnitt B.1.3.*

### Technische Details

- **Rust-Version:** 1.70+ (für Tauri 2.0)
- **WebView:** Microsoft Edge WebView2 (Windows), WebKit (macOS/Linux)
- **Netzwerkpfade:** Lokaler Yahoo-Proxy in Rust auf `127.0.0.1:8787`; Inflation/CAPE direkt aus der WebView über CSP-Allowlist
- **Build-Input:** Tauri lädt immer den frisch synchronisierten `dist/`-Ordner, nicht die Root-HTML-Dateien direkt
- **Signierung:** Unsigned (Community-Build), kann mit eigenem Zertifikat signiert werden

---

## B.1.3 Plattformunabhängigkeit

Die Ruhestand-Suite ist plattformübergreifend nutzbar und kann auf Windows, macOS und Linux ausgeführt werden. Es gibt drei Ausführungsmethoden mit unterschiedlichen Anforderungen.

### Übersicht der Ausführungsmethoden

| Methode | Windows | macOS | Linux | Voraussetzungen |
|---------|---------|-------|-------|-----------------|
| **Tauri Desktop-App** | ✅ `.exe` | ✅ `.app` | ✅ AppImage/deb | Rust + Tauri CLI |
| **Start-Script** | ✅ `.ps1`/`.cmd` | ✅ `.sh` | ✅ `.sh` | Node.js (optional für Proxy) |
| **Browser direkt** | ✅ | ✅ | ✅ | Python 3 oder Node.js für Webserver |

### Methode 1: Tauri Desktop-App

Die Tauri-Konfiguration (`bundle.targets: "all"`) unterstützt alle Plattformen:

**Windows:**
```bash
npm run build-tauri-exe
# Output: RuhestandSuite.exe im Repo-Root
```

Für reine Tauri-Bundles ohne Kopierschritt kann direkt `npm run sync-dist` und danach `npm run tauri:build` verwendet werden. Das rohe Windows-Build-Artefakt heißt durch den Rust-Crate-Namen `src-tauri/target/release/ruhestand_suite.exe`.

**macOS:**
```bash
npm run sync-dist
npm run tauri:build
# Output: src-tauri/target/release/bundle/macos/RuhestandSuite.app
# Optional: .dmg Installer
```

**Linux:**
```bash
npm run sync-dist
npm run tauri:build
# Output: src-tauri/target/release/bundle/appimage/RuhestandSuite.AppImage
# Alternativ: .deb Paket für Debian/Ubuntu
```

**Build-Voraussetzungen:**

| Plattform | Erforderliche Pakete |
|-----------|---------------------|
| **Windows** | Visual Studio Build Tools, WebView2 Runtime |
| **macOS** | Xcode Command Line Tools, Rust |
| **Linux** | `libwebkit2gtk-4.1-dev`, `libgtk-3-dev`, `libayatana-appindicator3-dev` |

**Linux-Abhängigkeiten (Debian/Ubuntu):**
```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev \
  libayatana-appindicator3-dev librsvg2-dev
```

### Methode 2: Start-Script mit lokalem Webserver

**Windows (PowerShell):**
```powershell
# start_suite.ps1 - Startet HttpListener + Yahoo-Proxy
.\start_suite.ps1
# Öffnet http://localhost:8000/index.html im Browser
```

**macOS / Linux (Bash):**
```bash
#!/bin/bash
# start_suite.sh - Equivalent zum PowerShell-Script

PORT=8000
PROXY_PORT=8787

# Yahoo-Proxy starten (optional, für Online-Kurse)
if [ -f "tools/yahoo-proxy.cjs" ]; then
    node tools/yahoo-proxy.cjs &
    PROXY_PID=$!
    echo "Yahoo-Proxy gestartet (PID: $PROXY_PID)"
fi

# Webserver starten (Python 3)
echo "Starte Webserver auf http://localhost:$PORT/"
python3 -m http.server $PORT &
SERVER_PID=$!

# Browser öffnen
sleep 1
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:$PORT/index.html"  # Linux
elif command -v open &> /dev/null; then
    open "http://localhost:$PORT/index.html"      # macOS
fi

# Cleanup bei Ctrl+C
trap "kill $SERVER_PID $PROXY_PID 2>/dev/null; exit" INT TERM
wait
```

**Alternativ mit Node.js:**
```bash
# Einfacher Webserver mit npx (keine Installation nötig)
npx http-server -p 8000 -c-1
```

### Methode 3: Browser direkt (ohne Script)

Für reine Offline-Nutzung ohne Online-Kursaktualisierung:

```bash
# macOS / Linux
cd /pfad/zur/RuhestandsApp
python3 -m http.server 8000
# Dann im Browser: http://localhost:8000/Balance.html

# Oder mit Node.js
npx serve -p 8000
```

**Hinweis:** Ein lokaler Webserver ist erforderlich, da ES6-Module (`import`/`export`) aus Sicherheitsgründen nicht über `file://`-URLs geladen werden können.

### Plattform-spezifische Hinweise

**macOS:**
- Bei M1/M2-Macs: Tauri-Build erzeugt Universal Binary (ARM + x86)
- Gatekeeper kann unsignierte Apps blockieren → Rechtsklick → "Öffnen"
- WebKit (Safari-Engine) ist systemseitig vorhanden

**Linux:**
- AppImage ist die portabelste Variante (funktioniert ohne Installation)
- Für Wayland: `GDK_BACKEND=x11` vor Start setzen, falls WebView-Probleme
- Auf älteren Distros (z.B. Ubuntu 20.04) ggf. WebKit-Version prüfen

**Chromebook / WSL:**
- Tauri funktioniert in WSL2 mit WSLg (Windows 11)
- Alternativ: Browser-Methode mit localhost-Forwarding

### Datenpersistenz über Plattformen

Die Anwendung nutzt keine serverseitige Fachlogik. Persistenz wird über `app/shared/persistence-facade.js` gekapselt, damit Balance, Simulator und Profilmodule nicht direkt zwischen Browser-IndexedDB, Tauri-Datei oder Legacy-`localStorage` unterscheiden müssen.

| Laufzeit | Live-Daten | Snapshot-Archiv | Rolle von `localStorage` |
|----------|------------|------------------|--------------------------|
| **Browser** | IndexedDB-Datenbank `ruhestand-suite`, Version 2, Store `kv` plus `metadata` | IndexedDB-Store `snapshots` in derselben Datenbank | Legacy-Migration und Fallback, nicht primäre Source of Truth |
| **Tauri Desktop** | App-Daten-Datei `ruhestand_suite_data.json` | separate App-Daten-Datei `ruhestand_suite_snapshots.json` über Target `snapshots` | WebView-Legacy-Migration beim ersten Tauri-Start |
| **localStorage-Fallback** | Storage-like Fallback für einfache Browserläufe | `rs_snapshot_archive_v1` als internes Archiv | Nur Fallback/Kompatibilität |

**Daten-Migration zwischen Plattformen:**
1. Komplettbackup auf der Startseite unter `Profile > Erweitert` exportieren.
2. Auf der Zielplattform denselben Komplettimport verwenden.
3. Jahresabschluss-Snapshots sind interne Sicherungspunkte des jeweiligen Persistenzadapters. Sie sind nicht der primäre Austauschweg zwischen Browser und Tauri.
4. Manuelles Kopieren von `localStorage`-Keys ist nur ein Legacy-/Debug-Pfad und darf nicht als Standardmigration dokumentiert oder empfohlen werden.

---

## B.2 Balance-App: Architektur und Modulzuschnitt

Die Balance-App ist die operative Jahresplanungsoberfläche. Sie beantwortet jedes Jahr dieselbe praktische Frage: Welche Entnahme ist unter den aktuellen Markt-, Steuer-, Liquiditäts- und Profilbedingungen sinnvoll, welche Transaktionen sind dafür nötig und welche Diagnose erklärt die Entscheidung? Dafür liest sie Profil- und UI-Daten, ruft die gemeinsame `EngineAPI` für ein einzelnes Planungsjahr auf, bereitet Handlungsempfehlungen und Diagnose-Payloads auf und persistiert Eingaben, Guardrail-/Steuerzustand, Snapshots und Ausgabenhistorie.

Der Detailkatalog in `docs/reference/BALANCE_MODULES_README.md` ergänzt diese Beschreibung mit Exportlisten. Die fachliche Architektur steht hier: Balance ist eine UI-nahe Orchestrierungsschicht um die deterministische Engine, nicht selbst der Ort für Steuer-, Guardrail- oder Marktregime-Kernlogik.

### B.2.1 Modulcluster

| Cluster | Module | Verantwortung |
|---------|--------|---------------|
| **Bootstrap und Orchestrierung** | `balance-main.js`, `balance-main-profile-sync.js`, `balance-main-profilverbund.js`, `balance-update-pipeline.js`, `balance-action-postprocessor.js` | App-Initialisierung, Engine-Handshake, Update-Zyklus, Profilwerte in Inputs spiegeln, Profilverbund-Läufe, Renderer-/Persistenz-Payloads, Action-Nachbearbeitung |
| **Konfiguration und Utilities** | `balance-config.js`, `balance-utils.js` | App-Konfiguration, Engine-Versionserwartung, Fehlerklassen, Währungs-/Zahlen-/Prozentformatierung, Zugriff auf Engine-Konfiguration |
| **Input und Persistenz** | `balance-reader.js`, `balance-storage.js`, `balance-guardrail-reset.js` | DOM-Input-Lesen, Input-Side-Effects, PersistenceFacade-Anbindung, internes Snapshot-Archiv, Erhalt von `lastState.taxState`, Reset-Erkennung für Guardrail-Historie |
| **Event-Binding und Workflows** | `balance-binder.js`, `balance-binder-annual.js`, `balance-binder-imports.js`, `balance-binder-snapshots.js`, `balance-binder-diagnosis.js` | Event-Hub, Tabs, Keyboard-Shortcuts, Import/Export, Snapshot-Aktionen, Diagnose-Kopie, Jahresabschluss und Jahresupdate |
| **Jahresupdate und Live-Daten** | `balance-annual-inflation.js`, `balance-annual-marketdata.js`, `balance-annual-modal.js`, `balance-annual-orchestrator.js` | Inflation, ETF-/CAPE-Abruf, Marktdaten-Nachrücken, ATH-Aktualisierung, Ergebnis-/Fehlerprotokoll |
| **Rendering** | `balance-renderer.js`, `balance-renderer-summary.js`, `balance-renderer-action.js`, `balance-renderer-diagnosis.js` | Summary, Marktstatus, Liquiditätsbalken, Handlungsempfehlungen, Steuer-/Cash-Aufschlüsselung, Diagnose-Container |
| **Diagnose** | `balance-diagnosis-format.js`, `balance-diagnosis-chips.js`, `balance-diagnosis-decision-tree.js`, `balance-diagnosis-guardrails.js`, `balance-diagnosis-keyparams.js`, `balance-diagnosis-transaction.js` | Diagnose-Payload normalisieren, Status-Chips, Entscheidungsbaum, Guardrail-Karten, VPW-/Key-Parameter, Transaktionsdiagnostik |
| **Ausgaben-Check** | `balance-expenses.js`, `balance-expenses-storage.js`, `balance-expenses-csv.js`, `balance-expenses-metrics.js`, `balance-expenses-renderer.js` | Monatsweise CSV-Importe pro Profil, Budgetvergleich, Median-basierte Jahreshochrechnung, Summary/Tabelle/Detaildialog, Storage `balance_expenses_v1` |
| **Profilverbund-Anbindung** | `app/profile/profilverbund-balance.js`, `app/profile/profilverbund-balance-ui.js`, Profilmodule unter `app/profile/` | Profilauswahl, Multi-Profil-Aggregation, Entnahmeverteilung, Asset-Summaries, Profilwerte in Balance-Inputs |
| **Tranchen-Anbindung** | `app/tranches/depot-tranchen-status.js`, `app/tranches/*manager*.js`, `depot-tranchen-manager.html` | Detailtranchen laden, aggregieren, in Inputs synchronisieren, Kursaktualisierung und Status-Badge bereitstellen |

**Aktueller Bestand (2026-05-23):** 35 JS-Module unter `app/balance/`. Profilverbund-, Profil- und Tranchenmodule liegen bewusst außerhalb dieses Ordners und werden von Balance genutzt.

### B.2.1a Zentrale Modulverantwortung

| Modul | Rolle im System | Wichtigste Verträge |
|-------|-----------------|---------------------|
| `balance-main.js` | Einstiegspunkt der Balance-App | Initialisiert DOM-Referenzen, Storage, Reader, Renderer, Binder und Profilverbund; prüft `EngineAPI.getVersion()` gegen `REQUIRED_ENGINE_API_VERSION_PREFIX`; stellt `update()` und `debouncedUpdate()` bereit |
| `balance-reader.js` | Input-Grenze zwischen DOM und Modell | Normalisiert Währungen, Prozentwerte, Checkboxen und abhängige Panels; liefert ein Engine-kompatibles Inputobjekt; übernimmt gespeicherte Inputs wieder ins Formular |
| `balance-storage.js` | Persistenzgrenze der Jahresplanung | Lädt/speichert Eingaben und `lastState` über die PersistenceFacade; migriert ältere lokale Daten; verwaltet das interne Snapshot-Archiv; erhält `taxState.lossCarry`, damit Verlustvorträge nicht durch Guardrail-Resets verschwinden |
| `balance-update-pipeline.js` | Fachliche UI-Pipeline nach dem Engine-Call | Formt Engine-Ergebnisse in Render-, Diagnose-, Budget- und Persistenzpayloads um; entscheidet, welche Teile persistiert und welche nur angezeigt werden |
| `balance-action-postprocessor.js` | Nachbearbeitung der Handlungsempfehlung | Merged Profilverbund-Actions und ergänzt Single-3-Bucket-Postprocessing, ohne die Engine-Entscheidung selbst zu ersetzen |
| `balance-binder.js` | Event-Hub | Bindet Formularänderungen, Tabs, Reset, Jahresabschluss, Import/Export, Snapshot-Aktionen, Diagnose-Kopie und Jahresupdate-Handler |
| `balance-renderer.js` | Render-Fassade | Verteilt die Darstellung auf Summary, Action und Diagnose; kapselt Toasts, Fehlermeldungen und Theme-Anwendung |

Damit bleibt die Richtung klar: Reader und Storage übersetzen Randbedingungen in Daten, `balance-main.js` orchestriert, die Engine rechnet, Pipeline/Postprocessor bereiten auf, Renderer zeigen an, Binder verdrahtet Nutzeraktionen.

### B.2.2 Update-Zyklus

Der Balance-Update-Zyklus ist in `balance-main.js` und `balance-update-pipeline.js` aufgeteilt. Vereinfacht:

```javascript
function update() {
    syncProfileDerivedInputs();
    const inputData = UIReader.readAllInputs();

    const persistentState = StorageManager.loadState();
    const lastState = shouldResetGuardrailState(persistentState.inputs, inputData)
        ? preserveTaxStateOnly(persistentState.lastState)
        : persistentState.lastState;

    const profilverbundRuns = maybeRunProfilverbundProfiles(inputData);
    const modelResult = window.EngineAPI.simulateSingleYear(inputData, lastState);
    const uiPayload = buildBalanceUiPayload(modelResult, profilverbundRuns);

    UIRenderer.render(uiPayload);
    UIRenderer.renderDiagnosis(uiPayload.diagnosis);
    updateExpensesBudget(uiPayload.budget);
    StorageManager.saveState(buildPersistedState(persistentState, inputData, modelResult));
}
```

Wichtige Verträge:

- `EngineAPI.simulateSingleYear()` bleibt der zentrale Rechenaufruf.
- `balance-update-pipeline.js` bündelt Last-State, Diagnose-, Renderer- und Persistenzentscheidungen.
- `balance-action-postprocessor.js` ergänzt Profilverbund-Action-Merges und Single-3-Bucket-Postprocessing.
- Steuerzustand (`lastState.taxState`, insbesondere `lossCarry`) wird bei Guardrail-Resets erhalten, sofern nur die Guardrail-Historie invalidiert wird.

### B.2.2a Zustands- und Reset-Logik

Balance unterscheidet bewusst zwischen **Eingaben**, **Engine-Folgezustand** und **historischem Steuerzustand**:

- Eingaben beschreiben das aktuelle Planungsjahr: Bedarf, Vermögen, Renten, Tranchen, Marktdaten, Guardrail- und VPW-Parameter.
- `lastState` enthält Engine-Folgewerte aus Vorjahren, z. B. ATH-/Guardrail-Historie, geglättete Dynamic-Flex-Werte und Steuerzustand.
- `balance-guardrail-reset.js` erkennt Eingriffe, die historische Guardrail-Aussagen fachlich entwerten würden, etwa starke Änderungen bei Bedarf, Vermögen, Rentenstatus oder Marktdaten.
- Ein Reset bedeutet nicht automatisch „alles vergessen“: Steuerliche Verlustvorträge bleiben erhalten, weil sie reale, jahresübergreifende Steuerhistorie abbilden.

Diese Trennung ist wichtig, weil die Balance-App operativ genutzt wird: Nutzer können reale Depot- und Bedarfswerte korrigieren, ohne dadurch steuerliche Vorträge oder Snapshots unabsichtlich zu verlieren.

### B.2.3 Rendering und Diagnose

`balance-renderer.js` ist die Fassade. Die eigentliche Darstellung ist auf Summary-, Action- und Diagnosemodule verteilt:

| Bereich | Module | Inhalt |
|---------|--------|--------|
| **Summary** | `balance-renderer-summary.js` | KPIs, Marktstatus, Liquiditätsbalken |
| **Action** | `balance-renderer-action.js` | Quellen/Verwendungen, Transaktionen, Cash-Rebalancing, finale Steuer inklusive Verlusttopf-Effekten |
| **Diagnosis** | `balance-renderer-diagnosis.js`, `balance-diagnosis-*` | Chips, Entscheidungsbaum, Guardrails, KeyParams, Transaktionsdiagnose, kopierbarer Diagnose-Export |

Die Diagnosemodule sind in thematische Untermodule aufgeteilt, um einen großen Renderer-Monolithen zu vermeiden. Neue Diagnosebausteine gehören in ein thematisches `balance-diagnosis-*` Modul; `balance-renderer-diagnosis.js` dient als Integrationsschicht.

Die Diagnose ist fachlich Teil der Entscheidung, nicht bloß Debug-Ausgabe. Sie erklärt:

- warum ein Marktregime gewählt wurde,
- welche Guardrails ausgelöst oder nicht ausgelöst haben,
- wie Floor, Flex, VPW-Rahmen und freigegebener Flex zusammenhängen,
- warum bestimmte Transaktionen geplant oder unterlassen wurden,
- welche Steuer- und Verlusttopf-Effekte in der finalen Handlungsempfehlung stecken.

Für Nutzer ist damit nachvollziehbar, ob die App wegen Liquidität, Marktregime, Steueroptimierung, Gold-/Geldmarktgewichtung oder Budgetgrenzen handelt.

### B.2.4 Persistenz, Snapshots und Importe

| Speicherbereich | Modul(e) | Inhalt |
|-----------------|----------|--------|
| **Live-State** | `balance-storage.js`, `app/shared/persistence-facade.js`, Adapter unter `app/shared/persistence-adapter-*.js` | Eingaben, `lastState`, Profil-/Simulator-/Tranchen-Records und Metadata im aktiven Backend |
| **Snapshot-Archiv** | `app/shared/snapshot-archive.js`, `balance-binder-snapshots.js`, Adapter-Snapshot-Methoden | Jahresabschluss- und manuelle Snapshots im kanonischen Format `persistence-records-v1`, getrennt von Live-Daten |
| **Profil-State** | `app/profile/profile-storage.js`, `profile-key-policy.js`, `profile-live-storage.js`, `profile-bundle-io.js` | Profilregistry, aktive Profile, profilbezogene Live-Daten-Isolation, Bundle-Import/-Export |
| **Ausgaben-State** | `balance-expenses-storage.js` | Jahres-/Monatscontainer je Profil unter `balance_expenses_v1` |
| **Tranchen-State** | `app/tranches/*`, Profilbundle | Depot-Tranchen, Kurs-/Statusdaten, Profilherkunft bei Multi-Profil-Setups |
| **Import/Export** | `balance-binder-imports.js`, `app/shared/persistence-backup.js`, `profile-bundle-io.js` | Komplettbackup/-import, Profilbundle, CSV-Importpfade |

Für CSV-Ausgabenimporte liegt Parsing in `balance-expenses-csv.js`, Kennzahlenberechnung in `balance-expenses-metrics.js` und DOM-Ausgabe in `balance-expenses-renderer.js`.

Die Persistenzschicht ist in drei Ebenen getrennt:

1. **Live-Persistenz:** `PersistenceFacade` hält einen synchron lesbaren In-Memory-Cache und schreibt asynchron über den aktiven Adapter. Browser nutzt IndexedDB `ruhestand-suite` Version 2 mit Store `kv`; Tauri nutzt `ruhestand_suite_data.json`.
2. **Snapshot-Archiv:** `SnapshotArchive` baut und validiert kanonische Snapshots. Browser speichert sie im IndexedDB-Store `snapshots`; Tauri speichert sie in `ruhestand_suite_snapshots.json`; der localStorage-Fallback nutzt `rs_snapshot_archive_v1`. `listSnapshots()` liefert nur Indexdaten ohne `records`.
3. **Komplettbackup/Profilbundle:** Export/Import ist der Austausch- und Recovery-Pfad zwischen Browser und Tauri. Er liest aus der Live-Persistenz, nicht aus alten Snapshot-Keys.

Der Jahresabschluss erzeugt den Snapshot vor Inflation, Altersfortschreibung und Ausgabenjahr-Rollover. Schlaegt der Pre-Flush oder die Snapshot-Erstellung fehl, wird der Jahresabschluss ohne Mutation abgebrochen. Schlaegt erst der Post-Mutation-Flush fehl, bleibt der Pre-Mutation-Snapshot als Recovery-Punkt erhalten und der Fehler wird gemeldet.

Standard-Restore ist bewusst begrenzt. Er schreibt nur erlaubte Live-Records zurueck, erhaelt die Snapshot-Historie, bewahrt die Profil-Registry, setzt `rs_current_profile`/`rs_active_profile` auf das Snapshot-Profil und bricht ab, wenn `snapshot.activeProfileId` in der aktuellen Registry nicht mehr existiert. Er ist kein Profil-Merge und kein Austauschformat zwischen Geraeten.

Legacy-Snapshots mit Prefix `ruhestandsmodell_snapshot_` werden erkannt und in das kanonische Archiv migriert, sofern sie gueltig und standard-restore-faehig sind. Archivdaten duerfen nicht in neue Live-Snapshots eingebettet werden und gehoeren weder in `ruhestand_suite_data.json` noch in normale Komplettbackup-Records.

### B.2.5 Jahresupdate und Live-Daten

Das Jahresupdate ist in separate Module aufgeteilt:

| Modul | Aufgabe |
|-------|---------|
| `balance-annual-inflation.js` | Bedarfe und kumulierte Inflation fortschreiben, Inflationsdaten via ECB -> World Bank -> OECD holen |
| `balance-annual-marketdata.js` | ETF-Kurse über Yahoo-Proxy holen, CAPE via Yale/Mirror/r.jina.ai-Fallback abrufen, ATH/Nachrücken aktualisieren |
| `balance-annual-modal.js` | Ergebnis- und Fehlerprotokoll anzeigen |
| `balance-annual-orchestrator.js` | Jahresupdate sequenzieren: Alter, Inflation, ETF, CAPE, Protokoll |
| `balance-binder-annual.js` | Binder-Integration und Event-Anbindung für die Jahresupdate-Handlers |

Live-Daten bleiben optional. Ohne Netzwerk oder Proxy läuft die Balance-App mit manuellen Eingaben und lokal gespeicherten Werten weiter.

Das Jahresupdate ist als kontrollierter Jahreswechsel gedacht, nicht als automatische Marktmeinung. Es führt mehrere technische Schritte zusammen:

1. Alters- und Jahreswerte werden fortgeschrieben.
2. Bedarfe können über Inflation angepasst werden.
3. ETF- und Tranchenpreise können über den lokalen Proxy aktualisiert werden.
4. CAPE kann für Dynamic Flex automatisch nachgezogen werden.
5. ATH-/Marktdaten werden aktualisiert und protokolliert.

Jeder Abruf hat Fallbacks oder manuelle Alternativen. Fehler in Live-Daten sollen das Planungsjahr nicht blockieren, sondern sichtbar protokolliert werden.

### B.2.6 Profilverbund und Tranchen

Balance nutzt dieselbe Profilbasis wie Simulator und Startseite:

- Die Profilverwaltung liegt unter `app/profile/`; `index.html` ist der zentrale Einstieg für Profil-/Haushaltsverwaltung.
- `balance-main-profile-sync.js` spiegelt Profilwerte in Balance-Inputs.
- `balance-main-profilverbund.js` und `app/profile/profilverbund-balance.js` führen Multi-Profil-Läufe aus, aggregieren Bedarf/Renten/Vermögen und verteilen Entnahmen.
- Detailtranchen ersetzen aggregierte Depotwerte in Asset-Summaries, wenn plausible Tranchen vorhanden sind, damit Werte nicht doppelt gezählt werden.
- Entnahmen nutzen Cash/Geldmarkt vor Detailtranchenauswahl; Detailverkäufe behalten Tranche und Profilherkunft für spätere Steuer-/Portfolio-Pfade.

Die Tranchenverwaltung selbst ist in `depot-tranchen-manager.html` und `app/tranches/` gekapselt. Balance konsumiert den daraus synchronisierten Status und die aggregierten Werte.

**Profilverbund-Aggregation:** Balance führt mehrere Profile zu einem Haushalt zusammen. Dabei werden Bedarfe, Renten und Vermögenswerte addiert; konservative Parameter wie Liquiditätsziele oder Risiko-Defaults dürfen nicht durch einfache Mittelwerte verwässert werden. Für die Entnahmeverteilung stehen fachlich drei Modi im Vordergrund:

| Modus | Prinzip | Zweck |
|-------|---------|-------|
| `tax_optimized` | Profile/Tranchen mit niedriger erwarteter Steuerlast zuerst | Standard für steuerarme Entnahmen |
| `proportional` | Entnahme nach Vermögensanteil | gleichmäßigere Belastung der Profile |
| `runway_first` | Liquiditäts-/Runway-Ziele priorisieren | Haushalte mit unterschiedlich gefüllten Cash-Puffern |

**Tranchen-Contract:** Detailtranchen sind mehr als UI-Komfort. Sie liefern Marktwert, Einstand, Kaufdatum, Kategorie, Teilfreistellung und Profilherkunft. Daraus ergeben sich steueroptimierte Verkaufsreihenfolgen und korrekte Asset-Summaries. Bei mehrprofiligen Haushalten müssen `trancheId` und `sourceProfileId` erhalten bleiben, damit spätere Reduktionen nicht versehentlich Cost-Basis oder Profilherkunft vermischen.

### B.2.7 Ausgaben-Check

Der Ausgaben-Check verbindet Jahresplanung mit tatsächlichen monatlichen Ausgaben:

- CSV-Import pro Profil und Monat.
- Speicherung unter `balance_expenses_v1` mit Jahres- und Monatscontainern.
- Monatliche Ampel mit 5%-Warnschwelle.
- Jahresverbrauch, Restbudget, Soll/Ist für importierte Monate.
- Jahreshochrechnung: ab zwei Datenmonaten Median statt Mittelwert.
- Profilverbund-Ansicht mit Profilspalten und aggregierter Gesamtspalte.
- Jahresabschlussintegration über `rollExpensesYear()`.

Die Modulgrenzen sind bewusst DOM-frei, wo möglich: Parsing und Kennzahlen lassen sich isoliert testen; Rendering und Event-Wiring bleiben in eigenen Modulen.

Der Ausgaben-Check ist fachlich die Brücke zwischen geplanter Jahresentnahme und realem Cashflow. Er ersetzt nicht die Engine-Entnahmeentscheidung, sondern prüft, ob der reale Verbrauch zur geplanten Budgetlogik passt. Die Median-Hochrechnung ist bewusst robuster als ein einfacher Durchschnitt, weil einzelne Sonderausgaben einen Jahresforecast sonst stark verzerren würden.

---

## B.3 Simulator: Architektur und Modulzuschnitt

Der Simulator ist die explorative Oberfläche der Suite. Während die Balance-App ein konkretes Planungsjahr operativ entscheidet, untersucht der Simulator ganze Lebenspfade: stochastisch per Monte Carlo, deterministisch per historischem Backtest, systematisch per Parameter-Sweep und automatisch per Auto-Optimize. Er nutzt dieselbe Engine-API wie Balance, ergänzt aber eigene Jahreslogik für Portfoliofortschreibung, Pflege-/Rentenereignisse, Ansparphase, Forced Sales, 3-Bucket-Bond-Puffer und Ergebnisaggregation.

Der Simulator ist deshalb nicht nur ein UI-Wrapper um `EngineAPI.simulateSingleYear()`. Er baut pro Simulationsjahr den passenden Haushalts-, Portfolio- und Marktkontext, ruft die Engine für die Entnahmeentscheidung auf und verarbeitet danach simulator-spezifische Effekte wie Auszahlung, Notverkäufe, Bond-Refill, Steuer-Recompute und Jahreslog.

### B.3.1 Modulcluster

| Cluster | Module | Verantwortung |
|---------|--------|---------------|
| **Bootstrap und UI-Fassade** | `simulator-main.js`, `simulator-main-init.js`, `simulator-main-tabs.js`, `simulator-main-input-persist.js`, `simulator-main-reset.js` | App-Start, Engine-Handshake, Tab-/Button-Bindings, Persistenz gemeinsamer Eingaben, Reset-Flow |
| **UI-Fachmodule** | `simulator-ui-pflege.js`, `simulator-ui-rente.js`, `simulator-main-partner.js`, `simulator-main-accumulation.js`, `simulator-main-dynamic-flex.js`, `simulator-main-3bucket.js`, `simulator-main-stress.js`, `simulator-main-sweep-ui.js` | Pflege-, Renten-, Partner-, Anspar-, Dynamic-Flex-, 3-Bucket-, Stress- und Sweep-spezifische UI-Logik |
| **Input-Layer** | `simulator-input-dom.js`, `simulator-input-care.js`, `simulator-input-pension.js`, `simulator-input-strategy.js`, `simulator-input-tranches.js`, `simulator-profile-inputs.js` | DOM-Inputs normalisieren, Profilverbund in Simulator-Inputs mappen, Strategie-/Pflege-/Renten-/Tranchenparameter strukturieren |
| **Portfolio und Tranchen** | `simulator-portfolio.js`, `simulator-portfolio-*.js`, `simulator-portfolio-tranches.js`, `simulator-portfolio-chart.js`, `simulator-year-portfolio.js` | Startportfolio, Detailtranchen, Renditefortschreibung, Aktien/Gold/Bonds, Anzeige und Reduktion von Portfolio-Bausteinen |
| **Jahressimulation** | `simulator-engine-wrapper.js`, `simulator-engine-direct.js`, `simulator-engine-input.js`, `simulator-engine-direct-utils.js`, `simulator-year-result.js`, `simulator-household-pension.js`, `simulator-accumulation-year.js` | Jahr-für-Jahr-Simulation, Engine-Input-Mapping, Rente/Witwenlogik, Ansparjahre, Ergebnis- und Logshape |
| **Sondersituationen nach Engine-Call** | `simulator-forced-sale.js`, `simulator-tax-recompute.js`, `simulator-bond-refill.js` | Liquiditätsdeckung nach Auszahlung, Forced Sales, Gesamt-Settlement-Recompute, 3-Bucket-Bond-Verkauf und Wiederauffüllung |
| **Monte Carlo** | `simulator-monte-carlo.js`, `monte-carlo-runner.js`, `monte-carlo-ui.js`, `mc-run-context.js`, `mc-year-sampling.js`, `mc-life-events.js`, `mc-stress-tracker.js`, `mc-log-builder.js`, `mc-run-metrics.js`, `monte-carlo-aggregates.js`, `monte-carlo-runner-utils.js`, `scenario-analyzer.js` | Run-Orchestrierung, deterministische Seeds, Startjahr-/CAPE-Sampling, Life-State, Stressmetriken, Logs, KPIs, Szenarioauswahl |
| **Backtest, Sweep und Optimierung** | `simulator-backtest.js`, `simulator-sweep.js`, `sweep-runner.js`, `simulator-sweep-utils.js`, `simulator-heatmap.js`, `simulator-optimizer.js`, `simulator-visualization.js`, `auto_optimize*.js` | Historische Pfade, Sensitivitätsraster, Worker-kompatible Sweep-Runs, Heatmaps, Sensitivität/Pareto, automatische Parameteroptimierung |
| **Ergebnisdarstellung** | `simulator-results.js`, `results-metrics.js`, `results-renderers.js`, `results-formatting.js`, `simulator-formatting.js`, `simulator-main-helpers.js` | KPI-Karten, Szenario-/Backtest-Logs, CSV/JSON-Export, Spaltenkonfiguration, Formatierung |
| **Daten und Shared Utilities** | `simulator-data.js`, `simulator-utils.js`, `cape-utils.js`, `app/shared/shared-formatting.js` | Historische Daten, Mortalität/Pflege/Stress-Presets, RNG/Statistik, CAPE-Kandidaten, gemeinsame Formatter |

**Aktueller Bestand (2026-05-23):** 87 JS-Module unter `app/simulator/`. Profil-, Tranchen- und Shared-Module liegen teilweise außerhalb des Simulator-Ordners, sind aber Teil des fachlichen Datenflusses.

### B.3.2 Hauptflüsse

Der Simulator hat vier zentrale Ausführungspfade:

1. **Monte Carlo:** Viele Runs über zufällig oder gewichtet gezogene historische Jahre. Ergebnisse sind Verteilungen, Perzentile, Stressmetriken und ausgewählte Szenario-Logs.
2. **Historischer Backtest:** Ein deterministischer Pfad über echte historische Jahre. Ergebnis ist ein nachvollziehbarer Jahreslog für die Frage, ob ein Plan durch konkrete Sequenzen wie 2000-2003 oder 2008 getragen hätte.
3. **Parameter-Sweep:** Systematisches Raster über erlaubte Parameter. Ergebnis sind Sensitivitäten, Heatmaps und Vergleichstabellen.
4. **Auto-Optimize:** Kandidatengenerierung, Bewertung und Verfeinerung zur Suche nach robusten Parameterkombinationen unter Zielmetriken und Constraints.

Alle vier Pfade teilen dieselbe Jahreslogik, soweit möglich. Das reduziert fachliche Drift: Pflege, Rente, Steuer-Recompute, Dynamic Flex, 3-Bucket und Portfoliofortschreibung sollen im Backtest nicht anders funktionieren als in Monte Carlo oder Sweep.

### B.3.3 Jahr-für-Jahr-Pipeline

Die Kernpipeline eines Simulatorjahres sieht konzeptionell so aus:

```javascript
function simulateSimulatorYear(state, inputs, yearData, yearIndex) {
    applyAnnualReturnsToPortfolio(state.portfolio, yearData, inputs.decumulation);
    const household = computeHouseholdPensionAndLifeState(state, inputs, yearData);

    if (isAccumulationYear(state, inputs)) {
        return simulateAccumulationYear(state, inputs, yearData);
    }

    const engineInput = buildEngineInput({
        state, inputs, yearData, household, portfolio: state.portfolio
    });
    const engineResult = EngineAPI.simulateSingleYear(engineInput, state.lastEngineState);

    const payoutResult = applyPayoutAndForcedSales({
        engineResult, portfolio: state.portfolio, inputs, yearData
    });
    const taxResult = recomputeTaxSettlementIfNeeded({
        engineResult, payoutResult, taxStatePrev: state.taxState
    });
    const bondRefill = applyThreeBucketBondRefillIfNeeded({
        engineResult, portfolio: state.portfolio, inputs, yearData
    });

    return buildSimulatorYearResult({
        engineResult, payoutResult, taxResult, bondRefill, household, yearData
    });
}
```

Wichtige Verträge:

- Die Engine entscheidet über Entnahme, Guardrails, Marktregime, Ziel-Liquidität und reguläre Transaktionen.
- Der Simulator führt danach reale Simulationsmechanik aus: Auszahlung, Portfoliofortschreibung, Notverkäufe, Bonds-Puffer, Pflege-/Rentenstatus und Logs.
- Wenn nach dem Engine-Call zusätzliche Verkäufe nötig werden, wird die Steuer aggregiert neu berechnet, damit Sparer-Pauschbetrag und Verlusttopf nicht doppelt verbraucht werden.
- Der Jahreslog enthält additive Erklärfelder zu Entnahme, Payout, Liquidität, VPW, Steuer und 3-Bucket, ohne die Normalansicht zu überfrachten.

### B.3.4 Monte Carlo, Sampling und Workers

Monte Carlo ist in eine UI-Schicht (`simulator-monte-carlo.js`, `monte-carlo-ui.js`) und eine DOM-freie Rechenschicht (`monte-carlo-runner.js` plus `mc-*` Module) getrennt. Pro Run werden Seed, Startjahr, Stresskontext, Pflege-/Partnerstatus und Logauswahl deterministisch initialisiert. Dadurch darf Chunking oder Worker-Aufteilung die Ergebnisse nicht verändern.

Die Sampling-Logik umfasst:

| Modus | Bedeutung |
|-------|-----------|
| `UNIFORM` | Startjahre und Folgejahre historisch gleichgewichtet |
| `CAPE` | Auswahl über CAPE-nahe historische Startjahre mit Fallback-Toleranzen |
| `FILTER` | harte Begrenzung, z. B. Ausschluss früher Nachkriegsjahre |
| `RECENCY` | exponentielle Gewichtung jüngerer Historie über Half-Life |
| `block_bootstrap` | Blöcke zusammenhängender Jahre zur Erhaltung von Autokorrelation |
| `regime` | Markov-artige Regime-Transitions auf Basis historischer Regime |

Workers werden für Monte Carlo, Sweep und Auto-Optimize eingesetzt. `workers/worker-pool.js` steuert Queue, Chunking und Fallbacks; `workers/mc-worker.js` führt Worker-Jobs aus; Telemetrie ist optional und dev-only. Detaillierte Logs werden bewusst nicht für jeden Run im Worker transportiert, sondern nur für ausgewählte Szenarien aufgebaut.

### B.3.5 Portfolio, 3-Bucket und Bonds

Der Simulator modelliert das Portfolio nicht nur als Gesamtwert. Detailtranchen tragen Kategorie, Marktwert, Cost Basis, TQF, Typ und Profilherkunft. Aktien, Gold, Geldmarkt/Liquidität und optional Bonds werden unterschiedlich fortgeschrieben und verkauft.

Der Strategie-Modus `3_bucket_jilge` erweitert die Entnahmelogik um einen Bond-/Anleihen-Bucket:

- In schlechten Jahren können Bond-Tranchen bevorzugt verkauft werden, um Aktienverkäufe zu vermeiden.
- In guten Jahren kann der Bond-Zieltopf wieder aufgefüllt werden.
- `bondTargetFactor` steuert die Zielgröße des Bond-Puffers.
- `bondRefillThreshold` kann eine Wiederauffüllschwelle definieren.
- Logs und CSVs zeigen in diesem Modus Bond-Verkäufe, Bond-Refill und `Bonds/Puffer` separat.

Fachlich ist das kein freies Rentenportfolio mit Duration-/Kuponmodell. Es ist ein defensiver Pufferbaustein innerhalb der Entnahmestrategie. Diese Abgrenzung muss mit dem Anlagemodell in der Übersicht konsistent bleiben.

### B.3.6 Profilverbund, Rente, Pflege und Ansparphase

`simulator-profile-inputs.js` überführt aktive Profile in ein kombiniertes Simulator-Inputobjekt. Dabei werden Bedarfe, Vermögen, Renten, Gold-Parameter und Tranchen zusammengeführt; Tranchen erhalten profilbezogene IDs und `sourceProfileId`, damit Verkäufe später korrekt auf Ursprungsprofile zurückgeführt werden können.

Renten- und Haushaltslogik sind als wiederkehrende Jahreslogik gekapselt:

- Rente 1 und Rente 2 haben eigene Start-, Steuer- und Indexierungsparameter.
- Indexierung kann fix, inflations- oder lohnbezogen erfolgen.
- Witwenrente wird über Haushaltsstatus und Partnerereignisse modelliert.
- Pflegeereignisse haben eigene Eintrittswahrscheinlichkeiten, Progression, Kosten, Dauer und Mortalitätsmultiplikatoren.
- Dual-Care-Metriken erfassen simultane Pflegejahre und maximale/kumulative Pflegekosten.

Die Ansparphase ist ein eigener Vor-Ruhestandsmodus: vor der Transition werden Sparraten und Marktrenditen fortgeschrieben, aber keine regulären Entnahmen gerechnet. Pflegeeintritt kann die Ansparphase vorzeitig beenden und in die Entnahmelogik wechseln.

### B.3.7 Ergebnis- und Logsystem

Ergebnisse sind bewusst mehrschichtig:

- KPI-Karten zeigen robuste Zusammenfassungen wie Erfolgsquote, Perzentile, Kürzungsjahre, Depoterschöpfung, Steuerersparnis aus Verlusttopf und Pflegekennzahlen.
- Szenario-Logs zeigen ausgewählte Runs: Worst, Perzentile, Pflegefälle, lange Lebensdauer, hohe Kürzung und Zufallssamples.
- Backtest-Logs zeigen den deterministischen historischen Jahrespfad.
- Sweep- und Optimizer-Ausgaben zeigen Parameterwirkung, Heatmaps, Sensitivität, Pareto-Frontier und Champion-Parameter.
- Detailmodus ergänzt technische Spalten zu Entnahme/Payout/VPW/Liquidität/Bonds, ohne die Normalansicht zu verändern.

Diese Trennung ist fachlich wichtig: Der Simulator soll nicht nur eine Erfolgsquote liefern, sondern erklären, welche Pfade scheitern, wodurch Kürzungen entstehen und welche Parameter die Robustheit wirklich treiben.

---

## B.4 Engine: Kernlogik und Verträge

Die Engine ist die deterministische Rechenschicht der Suite. Balance und Simulator liefern ihr ein normalisiertes Jahres-Inputobjekt und einen optionalen Vorjahreszustand; die Engine liefert daraus eine einjährige Entnahmeentscheidung, Diagnose, Transaktionsvorschlag, finale Jahressteuer und neuen Folgezustand. Sie besitzt bewusst keine DOM-Abhängigkeiten und wird aus `engine/index.mjs` per `build-engine.mjs` in das Browser-Artefakt `engine.js` gebündelt.

### B.4.1 Modulstruktur

```
engine/
├── config.mjs                         → Schwellen, Profile, Texte, Engine-Version
├── core.mjs                           → Orchestrierung, EngineAPI, Input-Normalisierung, VPW
├── errors.mjs                         → AppError, ValidationError, FinancialCalculationError
├── index.mjs                          → Bundle-/ESM-Entry, Re-Export von EngineAPI
├── tax-settlement.mjs                 → Jahres-Settlement: Verlusttopf, SPB, finale Steuer
├── validators/
│   └── InputValidator.mjs             → Plausibilisierung der Jahresinputs
├── analyzers/
│   └── MarketAnalyzer.mjs             → Marktregime, Stagflation, CAPE-Erwartungsrendite
├── planners/
│   ├── SpendingPlanner.mjs            → Fassade der Entnahmeplanung
│   ├── alarm-policy.mjs               → Alarm-Aktivierung und Deeskalation
│   ├── flex-rate-policy.mjs           → Flex-Rate, Glättung, S-Kurve, harte Caps
│   ├── flex-budget-policy.mjs         → mehrjähriger Flex-Kürzungstopf
│   ├── final-rate-policy.mjs          → finale jährliche Änderungsgrenzen
│   ├── spending-guardrails.mjs        → Recovery-/Caution-Guardrails, Budget-Floor
│   ├── spending-policy-pipeline.mjs   → stabile Reihenfolge der Spending-Regeln
│   ├── spending-diagnosis.mjs         → Diagnose-Shape, Runway-Ziel, Key-Parameter
│   ├── spending-policy-helpers.mjs    → Quantisierung, S-Kurven, Hilfsformeln
│   └── wealth-reduction.mjs           → Dämpfung bei niedriger Entnahmequote
└── transactions/
    ├── TransactionEngine.mjs          → Fassade für Liquidität, Verkäufe, Rebalancing
    ├── transaction-action.mjs         → Entscheidung: Notfüllung, Refill, Verkauf, keine Aktion
    ├── transaction-opportunistic.mjs  → opportunistisches Rebalancing in guten Märkten
    ├── transaction-surplus.mjs        → Anlage überschüssiger Liquidität
    ├── transaction-utils.mjs          → Ziel-Liquidität, Gewichtung, Quantisierung, Mindesttrade
    ├── sale-engine.mjs                → steuerbewusste Verkäufe und Tranchenreihenfolge
    └── three-bucket-logic.mjs         → 3-Bucket-Jilge: Bond-Verkauf und Bond-Refill
```

Ziel-Liquidität und Liquiditäts-Gates liegen in `transaction-utils.mjs` und werden über `TransactionEngine.calculateTargetLiquidity()` aufgerufen.

### B.4.2 Öffentliche API

`EngineAPI` stellt einen kleinen, stabilen Vertrag bereit:

| Methode | Zweck |
|---------|-------|
| `getVersion()` | liefert API-Version und Build-ID |
| `getConfig()` | liefert die zentrale Engine-Konfiguration |
| `analyzeMarket(input)` | führt nur die Marktanalyse aus |
| `calculateTargetLiquidity(profil, market, inflatedBedarf)` | berechnet das Liquiditätsziel für Profil und Marktregime |
| `simulateSingleYear(input, lastState)` | führt die vollständige Jahresrechnung aus |

`simulateSingleYear()` ist der Normalpfad für Balance, Simulator und Tests. Fehler werden als `AppError`-/`ValidationError`-Objekte im Ergebnis zurückgegeben, nicht als ungefangene UI-Ausnahme.

### B.4.3 Jahrespipeline in `core.mjs`

Die Engine normalisiert zuerst Strategie- und VPW-Felder. Das ist wichtig, weil ältere UI-/Testpfade noch Aliaswerte liefern können. `decumulation.mode` wird auf `standard` oder `3_bucket_jilge` begrenzt; `drawdownTrigger`, `bondTargetFactor` und `bondRefillThreshold` erhalten sinnvolle Defaults aus `CONFIG`.

```javascript
function _internal_calculateModel(rawInput, lastState) {
    const input = normalize(rawInput);
    const taxStatePrev = lastState?.taxState ?? { lossCarry: 0 };

    validate(input);
    const profil = resolveRiskProfile(input.risikoprofil);
    const aktuelleLiquiditaet = input.aktuelleLiquiditaet ?? input.tagesgeld + input.geldmarktEtf;
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu + optionalGold(input);
    const market = MarketAnalyzer.analyzeMarket(input);

    const inflatedBedarf = calculateFloorAndFlexAfterPension(input);
    applyDynamicFlexVpwIfEnabled({ input, market, lastState, inflatedBedarf });

    const spending = SpendingPlanner.determineSpending({
        market, lastState, inflatedBedarf, runwayMonate, profil, depotwertGesamt, gesamtwert, renteJahr, input
    });

    const zielLiquiditaet = TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf, input);
    const action = TransactionEngine.determineAction({
        aktuelleLiquiditaet, depotwertGesamt, zielLiquiditaet, market,
        spending: spending.spendingResult, minGold, profil, input
    });

    const taxSettlement = settleTaxYear({
        taxStatePrev,
        rawAggregate: action.taxRawAggregate,
        sparerPauschbetrag: input.sparerPauschbetrag,
        kirchensteuerSatz: input.kirchensteuerSatz
    });

    action.steuer = taxSettlement.taxDue;
    spending.newState.taxState = taxSettlement.taxStateNext;
    updateDynamicFlexSafetyState(spending.newState);

    return { input, newState: spending.newState, diagnosis, ui };
}
```

Die Sale-Engine liefert während der Transaktionsplanung noch eine Plansteuer, damit Nettoverkaufsmengen bestimmt werden können. Die offizielle Jahressteuer entsteht danach zentral im Settlement. Dadurch werden Sparer-Pauschbetrag, Verlustvortrag und mehrere Verkaufsquellen nicht mehrfach oder widersprüchlich verrechnet.

### B.4.4 Marktanalyse

`MarketAnalyzer` klassifiziert ein Jahr in operative Regime. Diese Regime steuern nicht direkt eine starre Entnahme, sondern liefern Kontext für SpendingPlanner, Ziel-Liquidität, Rebalancing und Diagnose.

| Regime | Bedeutung |
|--------|-----------|
| `peak_hot` | neues Hoch mit starker 1-Jahres-Performance |
| `peak_stable` | neues Hoch ohne Überhitzung |
| `bear_deep` | deutlicher realer Drawdown gegenüber ATH |
| `recovery` | Erholung nach Drawdown mit positiver Dynamik |
| `corr_young` | junge Korrektur, noch kein tiefer Bärenmarkt |
| `side_long` | seitwärts/neutral, kein stärkeres Signal |
| `recovery_in_bear` | Erholungsrally innerhalb oder nach Bärenmarkt |

Zusätzlich erkennt die Analyse Stagflation über hohe Inflation bei negativer Realrendite und berechnet aus CAPE-Daten eine erwartete Aktienrendite. Diese erwartete Rendite fließt vor allem in Dynamic Flex/VPW ein.

Kontinuierliche Regime-Signale ergaenzen diese diskreten Labels, ersetzen sie aber nicht. `regime-signals.mjs` berechnet endliche Severity-Werte in `[0, 1]` fuer Drawdown, CAPE und Runway. Die Interpolation ist richtungssensitiv: Drawdown nutzt eine aufsteigende Skala, Runway eine absteigende Skala. Identische Stuetzwerte werden als harte Schwelle behandelt, nicht als Division durch Null. Diese Signale duerfen harte Sicherheitsgrenzen nicht weichzeichnen.

### B.4.5 SpendingPlanner und Dynamic Flex

Der SpendingPlanner führt mehrere Policy-Module in stabiler Reihenfolge aus, wobei `SpendingPlanner.mjs` als Fassade dient:

1. Vorjahreszustand laden oder initialisieren: Flex-Rate, realer Vermögens-Peak, Inflation, Alarmstatus.
2. Alarmbedingungen prüfen: tiefer Bärenmarkt, hohe Entnahmequote, Runway-Stress oder realer Drawdown.
3. Initiale Flex-Rate berechnen: Marktregime, Glättung und Alarmverhalten.
4. Spending-Policy-Pipeline anwenden: Guardrails, Mindest-Flex, Flex-Budget, finale Rate-Limits.
5. Jahresentnahme quantisieren und Diagnose erzeugen.

Dynamic Flex ist ein vorgeschalteter VPW-Pfad. Bei aktivem `dynamicFlex` berechnet die Engine aus Gesamtvermögen, Resthorizont, CAPE-basierter erwarteter Realrendite, Gold-/Safe-Asset-Anteil und optionalem Go-Go-Multiplikator einen dynamischen Flex-Bedarf. Die VPW-Renditeherleitung ist in `engine/planners/vpw-return-policy.mjs` gekapselt: `legacy_step` bleibt Default, `cape_continuous` ist ein expliziter Config-Modus mit robuster CAPE-Normalisierung und separaten Aktien-/Portfolio-Clamps. Der Resthorizont kann optional durch Longevity-Modi konservativer gemacht werden: `none` bleibt Default, `quantile_shift`, `relative_horizon_buffer` und `buffer_years` sind explizite Sicherheitsannahmen. Der Floor bleibt geschützt; VPW ersetzt nur den flexiblen Teil. Eine Sicherheitsstufe kann Go-Go deaktivieren oder Dynamic Flex temporär auf statischen Flex zurücksetzen, wenn Alarm-, Runway- oder Drawdown-Signale zu stark werden.

Der optionale `minimumFlexAnnual` ist kein zweiter Floor und mutiert den Bedarf nicht. Er wird nach den Guardrails als Mindest-Effektivbetrag für den Flex-Anteil interpretiert: Wenn die berechnete Flex-Rate weniger als diesen Betrag freigeben würde, hebt `applyMinimumFlexFloor()` die Rate bis zur erforderlichen Mindest-Flex-Rate an. Danach dürfen Flex-Budget-Cap und finale Rate-Limits die Anhebung weiterhin begrenzen. Notfallbedingungen blockieren die Anhebung bei aktivem Alarm, fehlender Gesamtvermögensdeckung für Floor plus Mindest-Flex oder wenn der Mindest-Runway nach dem Proxy nicht wiederherstellbar wäre.

Die wichtigsten fachlichen Bremsen sind:

| Mechanismus | Zweck |
|-------------|-------|
| Wealth-Adjusted Reduction | geringe Entnahmequoten werden weniger stark gekürzt |
| Mindest-Flex p.a. | optionale Untergrenze für Flex-Ausgaben, ohne den Floor zu verändern |
| Flex-Budget | mehrjähriger Topf begrenzt kumulative Flex-Kürzungen in Stressphasen |
| Flex-Share S-Curve | verhindert überharte Kürzungen, wenn Flex nur einen Teil des Gesamtbedarfs ausmacht |
| Runway-/Hard-Caps | begrenzen Entnahmen bei schwacher Liquiditätsdeckung |
| Final Rate Limits | begrenzen jährliche Sprünge der Flex-Rate nach allen Policies |

### B.4.6 Transaktions- und Steuerlogik

`TransactionEngine` entscheidet nach der Entnahmeplanung, ob eine Handlung nötig ist. Die Reihenfolge ist fachlich wichtig:

- Bei echter Runway- oder Floor-Gefahr darf eine Notfüllung auch Mindesttrade-Grenzen ignorieren.
- Im Bärenmarkt schützt die Logik zuerst Liquidität und kann Gold-Floors für Notverkäufe lockern.
- In Peak-/neutralen Märkten kann opportunistisch Liquidität oder Gold wieder aufgebaut werden.
- Bei überschüssiger Liquidität kann `transaction-surplus.mjs` Investitionsvorschläge erzeugen.
- Wenn keine Schwelle ausgelöst wird, liefert die Engine bewusst `type: 'NONE'`.

Verkäufe laufen über `sale-engine.mjs`. Bei Detailtranchen werden `trancheId`, `sourceProfileId`, `isin`, Kaufdatum, Cost Basis und TQF mitgeführt. Die Reihenfolge ist steuerbewusst:

- Aktien/ETF werden primär nach niedriger effektiver Steuerlast sortiert.
- Gold wird nach Kaufdatum FIFO behandelt und kann nach Spekulationsfrist steuerfrei sein.
- Bonds/Anleihen werden als eigene Kategorie erkannt (`bond`, `bonds`, `anleihe`).
- Im defensiven Kontext können Gold/Bonds vor Aktien genutzt werden.

Die Sale-Engine gibt Rohaggregate (`sumRealizedGainSigned`, `sumTaxableAfterTqfSigned`) zurück. `tax-settlement.mjs` verrechnet diese Rohdaten mit Verlustvortrag und Sparer-Pauschbetrag und schreibt `taxState.lossCarry` in `newState` fort.

### B.4.7 3-Bucket-Jilge in der Engine

Der Strategie-Modus `3_bucket_jilge` ist in der Engine normalisiert und die gemeinsame Bond-Logik liegt in `transactions/three-bucket-logic.mjs`. Fachlich bedeutet das:

- Bonds/Anleihen-Tranchen werden über Typ oder Kategorie erkannt.
- In schlechten Aktienjahren unterhalb des konfigurierten Drawdown-Triggers kann die Logik geplante Aktienverkäufe durch Bond-Verkäufe ersetzen.
- In guten Jahren kann ein Bond-Zieltopf anhand `bondTargetFactor * jahresentnahmeTarget` wieder aufgefüllt werden.
- `bondRefillThreshold` verhindert Kleinstumschichtungen.
- Bond-Verkäufe liefern dieselben Steuer-Rohaggregate wie andere Verkäufe und gehen damit ins Jahres-Settlement ein.

Balance und Simulator nutzen die gleiche Erkennung für Bond-Tranchen. Der Simulator ergänzt nach dem Engine-Call eigene Bond-Refill-/Payout-Mechanik, aber die Klassifikation und Verkaufssystematik bleibt identisch.

---

## B.5 Test-Suite und Validierungsregeln

**Übersicht:** Die Test-Suite umfasst in der geprüften Arbeitskopie **91 `*.test.mjs`-Dateien**. Der Lauf vom 2026-06-15 ergab **2382 Assertions**, alle erfolgreich. Die V8-Coverage-Baseline vom 2026-06-12 liegt bei **72,25%** (19352/26784 ausfuehrbare Zeilen, 162 Projektdateien). Die Tests laufen ohne Jest/Mocha über native Node.js-ESM-Module und eigene globale Assertions (`assert`, `assertEqual`, `assertClose`).

### B.5.1 Test-Inventar

| Kategorie | Repräsentative Dateien | Fokus |
|-----------|------------------------|-------|
| **Engine Core & Validation** | `core-engine.test.mjs`, `engine-robustness.test.mjs`, `market-analyzer.test.mjs`, `regime-signals.test.mjs`, `historical-data-robustness.test.mjs`, `tauri-csp.test.mjs` | EngineAPI-Vertrag, Fehlerrobustheit, Marktregime, kontinuierliche Regime-Signale, historische Daten, Tauri-CSP |
| **Spending, VPW und 3-Bucket** | `spending-planner.test.mjs`, `spending-quantization.test.mjs`, `vpw-dynamic-flex.test.mjs`, `dynamic-flex-horizon.test.mjs`, `3bucket-config.test.mjs`, `3bucket-refill.test.mjs` | Guardrails, Rundung, VPW-Horizonte, Dynamic-Flex-Safety, 3-Bucket-Parameter und Bond-Refill |
| **Transaktionen, Steuern, Tranchen** | `transaction-*.test.mjs`, `tax-settlement.test.mjs`, `core-tax-settlement.test.mjs`, `depot-tranches.test.mjs`, `tranchen-manager-*.test.mjs` | Verkäufe, Rebalancing, Gold/Liquidität, Rohaggregate, Jahres-Settlement, Cost-Basis- und Tranchenverwaltung |
| **Balance-App** | `balance-smoke.test.mjs`, `balance-reader.test.mjs`, `balance-storage*.test.mjs`, `balance-annual-*.test.mjs`, `balance-diagnosis-*.test.mjs`, `balance-expenses.test.mjs`, `balance-renderer-*.test.mjs` | Initialisierung, DOM-Input, Storage/Snapshots, Jahresupdate, CAPE, Diagnose, Ausgaben-Check, Rendering |
| **Simulator, Monte Carlo, Sweep, Optimierung** | `simulation.test.mjs`, `simulator-*.test.mjs`, `monte-carlo-*.test.mjs`, `auto-optimizer.test.mjs`, `auto-optimize-worker-contract.test.mjs`, `scenario-analyzer.test.mjs`, `scenarios.test.mjs`, `care-meta.test.mjs`, `health-bucket.test.mjs`, `portfolio.test.mjs` | Jahresloops, Backtest, MC-Sampling, Worker-Merge, Sweep, mehrphasige Auto-Optimize-Pipeline, Pflege, Pflegebucket, Szenarien, Portfolio |
| **Profile und Profilverbund** | `profile-storage.test.mjs`, `profile-state.test.mjs`, `profile-navigation.test.mjs`, `profile-asset-values.test.mjs`, `profilverbund-*.test.mjs`, `simulator-multiprofile-aggregation.test.mjs` | Profilregistry, Navigation/State, Assetwerte, Multi-Profil-Aggregation, profilbezogene Tranchen |
| **Worker, Utilities und Formatierung** | `worker-parity.test.mjs`, `worker-pool.test.mjs`, `utils.test.mjs`, `formatting.test.mjs`, `feature-flags.test.mjs` | deterministische Worker-Parität, Pool-Lifecycle, RNG/Statistik, Formatter, Feature-Flags |

### B.5.2 Ausführung und Validierung

| Zweck | Kommando | Wann verwenden |
|-------|----------|----------------|
| Gesamtsuite | `npm test` | Default nach Codeänderungen und vor Release/EXE-Build |
| Direkter Runner | `node tests/run-tests.mjs` | Fallback, wenn `npm` lokal defekt ist |
| Einzeltest | `node tests/run-single.mjs <testfile>` | fokussierte Fehlersuche; im Ergebnis berichten, dass nicht die ganze Suite lief |
| Coverage-Baseline | `npm run test:coverage` | Review-/Transparenz-Gate fuer `app/`, `engine/`, `workers/` und `types/`; noch keine harte Mindestschwelle |
| Browser-Smokes | `npm run test:browser` | Playwright-Gate fuer HTML-Einstiege mit lokalem Testserver; getrennt von `npm test` |
| Engine-Bundle | `npm run build:engine` | zusätzlich nach Änderungen an `engine/` oder öffentlicher `EngineAPI` |
| Strict Engine-Build | `npm run build:engine:strict` | CI/Release, damit fehlendes `esbuild` nicht still auf Fallback geht |
| Tauri/Rust-Gate | `npm run tauri:build` | zusätzlich bei Änderungen an `src-tauri/` oder release-nahen Tauri-Pfaden |

Für reine Dokumentationsänderungen ist kein Testlauf erforderlich, sofern keine Code- oder Build-Artefakte geändert wurden. Wenn Dokumentation jedoch konkrete Assertion-Zahlen oder Testausgaben behauptet, müssen diese Zahlen aus einem aktuellen Runner-Lauf stammen oder ausdrücklich als nicht neu verifiziert gekennzeichnet werden.

`QUICK_TESTS=1` ist deprecated. Fuer schnelle Fehlersuche sollen gezielte `run-single`-Läufe oder die im jeweiligen Slice dokumentierten Fokusbefehle verwendet werden.

### B.5.3 Worker-Parity-Test

Validiert Determinismus zwischen Main-Thread und Worker:
```javascript
// Gleicher Seed → Gleiche Ergebnisse
const mainResult = runSimulation({ seed: 12345, runs: 100 });
const workerResult = await runInWorker({ seed: 12345, runs: 100 });
assertEqual(mainResult.successRate, workerResult.successRate);
```

Worker- und Optimizer-Pfade sind kritisch, weil Monte Carlo, Sweep und Auto-Optimize Ergebnisse chunkweise berechnen. `worker-parity.test.mjs` und `auto-optimize-worker-contract.test.mjs` sichern, dass Chunking, Worker-Merge und serielle Ausführung fachlich dieselben Aggregate liefern.

### B.5.4 Test-Prioritäten

| Priorität | Kategorie | Kritikalität |
|-----------|-----------|--------------|
| 1 | Finanz-Kern (Spending, Tax, Liquidity) | ⚠️ Kritisch |
| 2 | EngineAPI, Settlement, 3-Bucket, Dynamic Flex | ⚠️ Hoch |
| 3 | Algorithmen (MC, Market, Care, Sweep, Auto-Optimize) | Hoch |
| 4 | Profilverbund, Profile, Tranchen | Mittel |
| 5 | Balance-/Simulator-UI-Contracts und Persistenz | Mittel |
| 6 | Worker-Parity, Utilities, Formatter, Feature-Flags | Mittel |

---

# Fachliche Algorithmen

## C.1 Floor-Flex-Guardrail-System

### C.1.1 Grundkonzept

Das Floor-Flex-Modell trennt den Bedarf in zwei Komponenten:

| Komponente | Beschreibung | Beispiel |
|------------|--------------|----------|
| **Floor** | Nicht verhandelbarer Grundbedarf | Miete, Versicherungen, Lebensmittel |
| **Flex** | Optionaler Zusatzbedarf | Reisen, Hobbys, Luxus |

**Implementierungskonzept** (siehe `SpendingPlanner.mjs`):
```javascript
const inflatedBedarf = {
    floor: Math.max(0, input.floorBedarf * cumulativeInflationFactor - renteJahr),
    flex: input.flexBedarf * cumulativeInflationFactor
};

// Flex wird mit flexRate (0-100%) multipliziert
const actualFlex = inflatedBedarf.flex * (flexRate / 100);
const totalSpending = inflatedBedarf.floor + actualFlex;
```

### C.1.2 Flex-Rate-Bestimmung

**Marktregime-abhängige Basis-Flex-Rate:**

| Regime | Basis-Flex-Rate | Begründung |
|--------|-----------------|------------|
| `peak_hot` | 100% | Markt überhitzt, aber noch am ATH |
| `peak_stable` | 100% | Stabiles ATH |
| `recovery` | 85-95% | Erholung, aber noch vorsichtig |
| `side_long` | 80-90% | Seitwärtsmarkt |
| `corr_young` | 70-80% | Junge Korrektur |
| `bear_deep` | 50-70% | Tiefer Bärenmarkt |
| `recovery_in_bear` | 60-75% | Rally im Bärenmarkt (Vorsicht!) |

**Entnahmequoten-Anpassung** (konzeptionell, siehe `SpendingPlanner.mjs`):
```javascript
const withdrawalRate = totalSpending / depotValue;

if (withdrawalRate > 0.055) {
    // ALARM: Drastische Kürzung
    flexRate = Math.min(flexRate, 50);
} else if (withdrawalRate > 0.045) {
    // VORSICHT: Moderate Kürzung
    flexRate = Math.min(flexRate, 75);
}
```

### C.1.3 Glättungsalgorithmus

**Exponentielle Glättung** (siehe `config.mjs`):
```javascript
SPENDING_MODEL: {
    FLEX_RATE_SMOOTHING_ALPHA: 0.35,     // Glättungsfaktor
    RATE_CHANGE_MAX_UP_PP: 2.5,          // +2.5pp pro Jahr (konservativ)
    RATE_CHANGE_AGILE_UP_PP: 4.5,        // +4.5pp in Peak/Recovery (agiler)
    RATE_CHANGE_MAX_DOWN_PP: 3.5,        // -3.5pp pro Jahr (normal)
    RATE_CHANGE_MAX_DOWN_IN_BEAR_PP: 6.0,// -6pp im Bärenmarkt (geändert: war 10.0)
    RATE_CHANGE_RELAX_MAX_DOWN_PP: 20.0  // Relaxierung bei hohem Vermögen (neu)
}
```

**Warum diese Werte?**
- α = 0.35: Reagiert auf Marktänderungen, glättet aber Noise
- Max +2.5pp: Verhindert zu schnelles "Hochfahren" nach Krise
- Max -6pp im Bärenmarkt: Sanftere Reduktion (geändert von -10pp), kombiniert mit Flex-Budget-System
- Relaxierung +20pp: Bei niedriger Entnahmequote darf Down-Limit entspannt werden

### C.1.4 Recovery-Guardrail

**ATH-Gap-basierte Kürzung** (siehe `config.mjs`):
```javascript
RECOVERY_GUARDRAILS: {
    CURB_RULES: [
        { minGap: 25, maxGap: Infinity, curbPercent: 25 },  // >25% vom ATH: 25% Kürzung
        { minGap: 15, maxGap: 25, curbPercent: 20 },       // 15-25%: 20% Kürzung
        { minGap: 10, maxGap: 15, curbPercent: 15 },       // 10-15%: 15% Kürzung
        { minGap: 0, maxGap: 10, curbPercent: 10 }         // 0-10%: 10% Kürzung
    ]
}
```

### C.1.5 Alarm-Eskalation und Deeskalation

**Eskalations-Logik** (konzeptionell, siehe `SpendingPlanner.mjs`):
```javascript
function shouldActivateAlarm(context) {
    if (context.scenario !== 'bear_deep') return false;

    const quoteCritical = context.withdrawalRate > 0.055;  // >5.5%
    const runwayCritical = context.runwayMonths < 24;      // <2 Jahre
    const drawdownCritical = context.realDrawdown > 0.25;  // >25%

    return (quoteCritical && runwayCritical) || drawdownCritical;
}
```

**Deeskalations-Logik** (konzeptionell, siehe `SpendingPlanner.mjs`):
```javascript
function shouldDeactivateAlarm(context, alarmHistory) {
    if (context.scenario.startsWith('peak')) {
        return context.withdrawalRate <= 0.055 || context.realDrawdown <= 0.15;
    }

    if (context.scenario === 'recovery') {
        const runwayOk = context.runwayMonths >= context.minRunway + 6;
        const drawdownOk = context.realDrawdown <= 0.20;
        const noNewLows = !alarmHistory.hasNewYearlyLow;
        return runwayOk || (drawdownOk && noNewLows);
    }

    return false;
}
```

### C.1.6 Mindest-Flex p.a.

`Mindest-Flex p.a.` ist eine optionale Untergrenze für flexible Ausgaben in Jahren, in denen Safety-/Guardrail-Regeln den Flex-Anteil stark kürzen würden. Fachlich soll damit ein Mindestmaß an Lebensqualität modelliert werden, ohne den nicht verhandelbaren Floor zu erhöhen.

Eigenschaften:

- Der Wert wird in Balance und Simulator als Jahresbetrag gepflegt und gegen den jeweiligen Flex-Bedarf validiert (`minimumFlexAnnual <= flexBedarf` bzw. `<= startFlexBedarf`).
- Negative Werte werden abgelehnt; ungültige oder leere Werte fallen in Engine-Pfaden defensiv auf 0 zurück.
- Die Engine setzt den Mindest-Flex ratenbasiert um: `requiredRate = minimumFlexAnnual / inflatedBedarf.flex`.
- Der Bedarf selbst bleibt unverändert; Diagnose und Logs zeigen Status, erforderliche Rate, Blockiergrund und effektiven Flex vor/nach dem Policy-Schritt.
- Guardrail-Resets erkennen relevante Änderungen am Mindest-Flex, erhalten aber den steuerlichen Zustand (`lastState.taxState`).
- Profilverbund addiert profilbezogene Mindest-Flex-Werte für den Haushaltslauf und transportiert die Aufschlüsselung in `minimumFlexProfiles`.

Policy-Reihenfolge:

1. Alarm und Guardrails bestimmen zunächst die gekürzte Flex-Rate.
2. Mindest-Flex kann diese Rate anheben, wenn kein Notfallblocker greift.
3. Flex-Budget-Cap und finale Rate-Limits laufen danach weiter und können die Anhebung begrenzen.

Notfallblocker:

| Blocker | Wirkung |
|---------|---------|
| Aktiver Alarm | Mindest-Flex wird nicht angehoben |
| Gesamtvermögen deckt Floor + Mindest-Flex nicht | Blockierstatus `floor_minimum_flex_not_covered` |
| Mindest-Runway wäre nach Proxy nicht wiederherstellbar | Blockierstatus `minimum_runway_not_restorable` |

Backtest- und Monte-Carlo-Logs enthalten `MinFlex€` und `MinFSt`; im Detailmodus zusätzlich `MinFBlock` und `MinFEff`. Gold-bezogene Logspalten werden ausgeblendet, wenn das Goldmodul inaktiv ist.

---

## C.2 Steuer-Engine

### C.2.1 Implementierte Steuerarten

| Steuerart | Satz | Implementierung |
|-----------|------|-----------------|
| **Abgeltungssteuer** | 25% | `sale-engine.mjs` |
| **Solidaritätszuschlag** | 5.5% auf KESt | `sale-engine.mjs` |
| **Kirchensteuer** | 8-9% auf KESt | `input.kirchensteuerSatz` |
| **Teilfreistellung** | 30% für Aktienfonds | `tranche.tqf` |
| **Sparer-Pauschbetrag** | 1.000€ (Single) / 2.000€ (Paar) | `input.sparerPauschbetrag` |

### C.2.2 Steuerberechnung pro Tranche

**Algorithmus** (vereinfacht, siehe `sale-engine.mjs`):
```javascript
function calculateTaxForSale(tranche, sellAmount, input, remainingSPB) {
    // 1. Gewinnquote berechnen
    const marketValue = tranche.marketValue;
    const costBasis = tranche.costBasis;
    const gainFraction = Math.max(0, (marketValue - costBasis) / marketValue);

    // 2. Bruttogewinn aus Verkauf
    const grossGain = sellAmount * gainFraction;

    // 3. Teilfreistellung anwenden (30% für Aktienfonds)
    const taxableBeforeTQF = grossGain;
    const taxableAfterTQF = taxableBeforeTQF * (1 - tranche.tqf);  // tqf = 0.30

    // 4. Sparer-Pauschbetrag abziehen
    const spbUsed = Math.min(remainingSPB, taxableAfterTQF);
    const taxableAfterSPB = taxableAfterTQF - spbUsed;

    // 5. Steuer berechnen
    const kiSt = input.kirchensteuerSatz || 0;
    const effectiveTaxRate = 0.25 * (1 + 0.055 + kiSt);  // ~26.375% ohne KiSt
    const tax = Math.max(0, taxableAfterSPB) * effectiveTaxRate;

    return { tax, spbUsed, netAmount: sellAmount - tax };
}
```

**Beispielrechnung:**

| Schritt | Berechnung | Wert |
|---------|------------|------|
| Verkaufsbetrag | — | 10.000 € |
| Gewinnquote | (10.000 - 7.000) / 10.000 | 30% |
| Bruttogewinn | 10.000 × 30% | 3.000 € |
| Nach TQF (30%) | 3.000 × 70% | 2.100 € |
| Nach SPB (1.000€) | 2.100 - 1.000 | 1.100 € |
| Steuer (26.375%) | 1.100 × 26.375% | 290,13 € |
| **Netto-Erlös** | 10.000 - 290,13 | **9.709,87 €** |

### C.2.3 Steueroptimierte Verkaufsreihenfolge

**Sortieralgorithmus** (vereinfacht, siehe `sale-engine.mjs`):
```javascript
function getSellOrder(tranches, input) {
    return Object.keys(tranches).sort((keyA, keyB) => {
        const a = tranches[keyA];
        const b = tranches[keyB];

        // 1. Effektive Steuerlast berechnen
        const taxRateA = calculateEffectiveTaxRate(a, input);
        const taxRateB = calculateEffectiveTaxRate(b, input);

        // 2. Niedrigste Steuerlast zuerst
        if (taxRateA !== taxRateB) return taxRateA - taxRateB;

        // 3. Bei gleicher Steuerlast: Niedrigste Gewinnquote zuerst
        if (a.gainFraction !== b.gainFraction) return a.gainFraction - b.gainFraction;

        // 4. Tie-Breaker: FIFO (älteste zuerst)
        return a.purchaseDate - b.purchaseDate;
    });
}
```

**Beispiel-Sortierung:**

| Tranche | Gewinnquote | TQF | Eff. Steuerlast | Reihenfolge |
|---------|-------------|-----|-----------------|-------------|
| Verlust-Position | -10% | 30% | 0% | 1. |
| Alt-Depot (2009) | 50% | 30% | 9.2% | 2. |
| Neu-Depot (2020) | 80% | 30% | 14.7% | 3. |
| Gold (steuerfrei) | 100% | 100% | 0% | 1. (wenn > 1 Jahr) |

### C.2.4 Sonderfälle

**Gold nach Spekulationsfrist:**
```javascript
gold: {
    tqf: input.goldSteuerfrei ? 1.0 : 0.0,  // 100% steuerfrei nach 1 Jahr
}
```

**Altbestand vor 2009:**
```javascript
if (purchaseDate < new Date('2009-01-01')) {
    tranche.tqf = 1.0;  // 100% steuerfrei
}
```

### C.2.5 Jahres-Settlement mit Verlustverrechnungstopf

Die finale Steuer eines Jahres wird nicht pro Einzelverkauf bestimmt, sondern durch ein zentrales **Jahres-Settlement** (`tax-settlement.mjs`). Die Sale-Engine liefert dafür nur noch Roh-Aggregate (`realizedGainSigned`, `taxableAfterTqfSigned`) pro Verkauf.

**Verrechnungsreihenfolge** (§ 20 Abs. 6 EStG):

1. **Rohsumme bilden:** Alle Gewinne und Verluste des Jahres nach TQF summieren (`sumTaxableAfterTqfSigned`)
2. **Verlustvortrag verrechnen:** Vorjahres-`lossCarry` von der Summe abziehen
3. **Sparer-Pauschbetrag anwenden:** Nur auf verbleibenden positiven Rest
4. **Steuer berechnen:** KESt + Soli + ggf. KiSt auf finalen Steuerbetrag
5. **Negativen Rest vortragen:** Wird als `lossCarry` ins nächste Jahr übernommen

```javascript
// tax-settlement.mjs (vereinfacht)
function settleTaxYear({ taxStatePrev, rawAggregate, sparerPauschbetrag, kirchensteuerSatz }) {
    const signedAfterCarry = rawAggregate.sumTaxableAfterTqfSigned - taxStatePrev.lossCarry;
    const positiveAfterCarry = Math.max(0, signedAfterCarry);
    const spbUsed = Math.min(sparerPauschbetrag, positiveAfterCarry);
    const taxBase = Math.max(0, positiveAfterCarry - spbUsed);
    const taxDue = taxBase * keSt;
    const lossCarryNext = Math.max(0, -signedAfterCarry);
    return { taxDue, taxStateNext: { lossCarry: lossCarryNext }, details: { ... } };
}
```

**Wichtige Designentscheidungen:**

- **TQF-Symmetrie:** Teilfreistellung wird symmetrisch auf Gewinne und Verluste angewandt (§ 22 InvStG). Eine Verlustposition mit TQF 30% erzeugt nur 70% anrechenbare Verluste.
- **Zwei Gewinnquoten:** `gainQuotePlan` (≥ 0, für Mengenplanung) und `gainQuoteSigned` (mit Vorzeichen, für Roh-Steuerdaten) in der Sale-Engine.
- **SPB nur im Settlement:** Der Sparer-Pauschbetrag wird offiziell nur im Jahres-Settlement verbraucht. Die Sale-Engine nutzt SPB weiterhin zur Mengenplanung, aber nicht als finale Steuerlogik.
- **Kein Feature-Toggle:** `lossCarry = 0` ist der natürliche No-Op-Default.

**State-Persistenz:**

- `lastState.taxState.lossCarry` wird in der Balance-App über `balance-storage.js` persistiert und überlebt Guardrail-Resets.
- Im Simulator wird `taxState` pro Run Jahr-für-Jahr fortgeschrieben. Bei Notfallverkäufen (Forced Sales) wird ein **Gesamt-Settlement-Recompute** durchgeführt, um SPB-Doppelverbrauch zu vermeiden.

**UI-Ausgabe:**

- `action.steuer` enthält die finale Settlement-Steuer (nicht die Plansteuer der Sale-Engine).
- `action.taxSettlement` liefert Details (taxBeforeLossCarry, taxAfterLossCarry, taxSavedByLossCarry, spbUsedThisYear).
- `action.taxRawAggregate` enthält die Roh-Aggregate für Diagnose und Simulator-Recompute.

---

## C.3 Monte-Carlo-Methodik

### C.3.1 Sampling-Strategien

**Strategie 1: Zufälliges Jahr (UNIFORM)**
```javascript
startYearIndex = Math.floor(rand() * annualData.length);
```

**Strategie 2: CAPE-Sampling**
```javascript
if (useCapeSampling && inputs.marketCapeRatio > 0) {
    const candidates = getStartYearCandidates(inputs.marketCapeRatio, annualData);
    if (candidates.length > 0) {
        const chosenYear = candidates[Math.floor(rand() * candidates.length)];
        startYearIndex = annualData.findIndex(d => d.jahr === chosenYear);
    }
}
```

**Strategie 3: Block-Bootstrap**
```javascript
function sampleNextYearData(state, method, blockSize, rand, stressCtx) {
    if (method === 'block_bootstrap') {
        if (state.blockRemaining > 0) {
            state.blockRemaining--;
            return annualData[(state.currentIndex + 1) % annualData.length];
        } else {
            state.currentIndex = Math.floor(rand() * annualData.length);
            state.blockRemaining = blockSize - 1;
            return annualData[state.currentIndex];
        }
    }
}
```

**Strategie 3a: Stationary Bootstrap**

Der Simulator bietet zusaetzlich `stationary` als Stationary Bootstrap nach Politis/Romano an. Das bestehende UI-Feld `mcBlockSize` wird dabei als erwartete Blocklaenge interpretiert. Pro Simulationsjahr wird deterministisch entschieden, ob ein neuer historischer Blockstart gezogen wird (`p = 1 / expectedBlockLength`) oder ob der aktuelle historische Block sequenziell fortgesetzt wird. Am Datenende wird ein neuer Blockstart erzwungen; ein Wrap-around vom letzten zum ersten historischen Jahr findet nicht statt.

Startjahrfilter, Recency-Gewichtung und CAPE-Sampling greifen nur bei neuen Blockstarts. Innerhalb eines laufenden Blocks wird das naechste historische Jahr ohne erneute Gewichtung genutzt, damit lokale Autokorrelation erhalten bleibt. Der Sampler-State wird pro Monte-Carlo-Run initialisiert und ist dadurch mit Worker-Chunks paritaetisch.

**Strategie 4: Regime-basiert**
```javascript
REGIME_TRANSITIONS = {
    BULL: { BULL: 0.65, BEAR: 0.10, SIDEWAYS: 0.20, STAGFLATION: 0.05 },
    BEAR: { BULL: 0.20, BEAR: 0.40, SIDEWAYS: 0.30, STAGFLATION: 0.10 },
    // ...
};
```

### C.3.1a Startjahr-Sampling-Modi

**Strategie 5: FILTER Mode** (monte-carlo-runner.js)
```javascript
// Beschränkt Sampling auf bestimmte Jahre (z.B. ab 1970)
if (samplingMode === 'FILTER') {
    const validIndices = annualData
        .map((d, i) => i)
        .filter(i => annualData[i].jahr >= filterStartYear);
    startYearIndex = validIndices[Math.floor(rand() * validIndices.length)];
}
```
*Anwendung:* Ausschluss des "Wirtschaftswunder"-Bias (1950-1960) für konservativere Simulationen.

**Strategie 6: RECENCY Mode mit Halbwertszeit** (monte-carlo-runner.js)
```javascript
// Exponentiell gewichtetes Sampling - jüngere Jahre bevorzugt
function buildCdfFromIndices(indices, halfLife) {
    const weights = indices.map((_, i) => Math.exp(-i * Math.LN2 / halfLife));
    const total = weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    return weights.map(w => (cumulative += w / total));
}

function pickFromSampler(cdf, rand) {
    const r = rand();
    // Binäre Suche O(log n)
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (cdf[mid] < r) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```
*Anwendung:* Höhere Gewichtung für jüngere Marktdaten (z.B. Halbwertszeit = 20 Jahre).

**Vergleich der Sampling-Modi:**

| Modus | Gewichtung | Anwendungsfall |
|-------|------------|----------------|
| UNIFORM | Gleichverteilt | Standard, historisch neutral |
| CAPE | CAPE-Band-Match | Aktuelle Bewertung berücksichtigen |
| FILTER | Ausschluss Jahre | Konservativ ohne "Golden Age" |
| RECENCY | Exponentiell | Jüngere Marktstruktur bevorzugen |
| BLOCK_BOOTSTRAP | Sequenzielle Blöcke | Autokorrelation und Krisencluster erhalten |

Die Startjahr- und Folgejahrlogik liegt in `mc-year-sampling.js`, `mc-run-context.js` und `monte-carlo-runner.js`. Über `mcExcludeEstimatedHistory` kann die geschätzte Erweiterung 1925-1949 aus dem Monte-Carlo-Sampling ausgeschlossen werden; dann beginnt die gezogene Historie faktisch ab 1950.

### C.3.2 Stress-Presets

**9 vordefinierte Stress-Szenarien** (siehe `simulator-data.js`):

| Preset | Typ | Jahre | Parameter |
|--------|-----|-------|-----------|
| `STAGFLATION_70s` | conditional_bootstrap | 7 | Inflation ≥ 7%, Real-Rendite ≤ -2% |
| `DOUBLE_BEAR_00s` | conditional_bootstrap | 6 | Real-Rendite ≤ -8%, Min-Cluster 2 |
| `GREAT_DEPRESSION_29_33` | conditional_bootstrap | 5 | Jahre 1929-1933 |
| `WWII_40s` | conditional_bootstrap | 7 | Jahre 1939-1945 |
| `STAGFLATION_SUPER` | hybrid | 8 | 70er + künstlich -3% μ |
| `INFLATION_SPIKE_3Y` | parametric | 3 | μ = -5%, σ × 1.5, Inflation ≥ 7% |
| `FORCED_DRAWDOWN_3Y` | parametric_sequence | 3 | -25%, -20%, -15% |
| `LOST_DECADE_12Y` | parametric | 12 | μ = -6%, Gold capped bei +15% |
| `CORRELATION_CRASH_4Y` | parametric | 4 | Aktien -15%, Gold -5%, Inflation 5% |

**Neue historische Stress-Szenarien (ab 1925):**
- **Great Depression (1929-1933):** Bootstrapped aus den historischen Jahren der Weltwirtschaftskrise. Ermöglicht Tests für extreme Deflation und Vermögensvernichtung.
- **Zweiter Weltkrieg (1939-1945):** Bootstrapped aus der Kriegsperiode mit Kapitalverkehrskontrollen, Inflation und Wirtschaftsumstellung.

### C.3.3 Historische Daten

**Datenbasis und Provenienz** (siehe `simulator-data.js` und `DATA_SOURCES.md`):

| Feld | Dokumentierter Status | Zeitraum |
|------|-----------------------|----------|
| `msci_eur` | MSCI-World-EUR-ähnlicher Indexlevel; exakte Variante (`Price`, `Net TR`, `Gross TR`) ist noch nicht vollständig dokumentiert | 1925-2025 |
| `inflation_de` | deutsche Inflationsreihe bzw. Proxy | 1925-2025 |
| `zinssatz_de` | deutscher Kurz-/Zinsproxy | 1925-2025 |
| `lohn_de` | deutsche Lohnentwicklungsreihe bzw. Proxy | 1925-2025 |
| `gold_eur_perf` | Gold-EUR-Performance; frühe Jahre enthalten Null-Fallbacks und müssen quellenfachlich weiter geklärt werden | 1925-2025, belastbarer ab späterer Historie |
| `cape` | CAPE-/Shiller-Bewertungsproxy | 1925-2025 |

**Provenienz-Hinweis `msci_eur`:**
*   Die Reihe wird im Code als MSCI-World-EUR-ähnlicher Proxy behandelt; die genaue Indexvariante ist ausdrücklich noch nicht vollständig belegt.
*   Die Jahre 1925-1949 sind eine geschätzte Erweiterung und auf den 1950er-Basiswert normalisiert. Sie dienen vor allem der Abbildung extremer Sequenzrisiken.
*   Deshalb macht dieses Dokument keine harte Aussage mehr, dass Teilperioden exakt einem bestimmten MSCI-Net-Total-Return-Index entsprechen. Der Klärpunkt steht in `DATA_SOURCES.md`.
*   Für konservative Läufe kann die geschätzte Frühhistorie per Monte-Carlo-Option ausgeschlossen oder über Filter/Recency-Gewichtung schwächer gewichtet werden.

**Hinweis Balance-App:** In der Balance-App werden reale Depotstände und ETF-Kurse verwendet; TER ist dort bereits im NAV eingepreist. Ein zusätzlicher TER-Abzug wäre doppelt.

**Erweiterte Datenbasis (1925-2025):**
*   **Erweiterung:** Die Daten wurden ab Januar 2026 von 1950 auf **1925** erweitert.
*   **Rekonstruktion 1925-1949:** MSCI-Levels wurden aus US-Marktdaten rekonstruiert und auf den 1950er-Basiswert normalisiert.
*   **Zweck:** Ermöglicht Stress-Tests mit historisch extremen Perioden (Große Depression, Zweiter Weltkrieg).

**Daten-Anomalie 1950-1960 ("Wirtschaftswunder"):**
*   **Beobachtung:** Die Jahre 1950-1960 weisen eine nominale CAGR von **~19.4%** (Real: ~17.4%) auf.
*   **Bewertung:** Dies ist ein historischer Sonderfall (Nachkriegs-Wiederaufbau), der sich so kaum wiederholen lässt.
*   **Risiko:** Da die Monte-Carlo-Simulation zufällige Blöcke aus der Historie zieht, besteht das Risiko, dass "Wirtschaftswunder"-Phasen eine zu optimistische Erwartungshaltung erzeugen.
*   **Empfehlung:** Für eine konservative Planung ("Stress-Test") kann die Datenbasis erst ab **1970** (Beginn Stagflation) oder **1978** (Präzisere Daten) genutzt werden. Die neuen Stress-Presets "Great Depression" und "WWII" bieten zusätzliche Extremszenarien.

**Verteilung der Regime (1925-2025):**

| Regime | Jahre | Anteil |
|--------|-------|--------|
| BULL | 28 | 28% |
| BEAR | 22 | 22% |
| SIDEWAYS | 38 | 38% |
| STAGFLATION | 12 | 12% |

*Hinweis: Die erweiterte Historie (1925-1949) enthält mehr Bärenmarkt- und Stagflationsjahre durch Große Depression und Weltkriege.*

### C.3.4 Determinismus

**Per-Run-Seeding** (siehe `simulator-utils.js`):
```javascript
export function makeRunSeed(baseSeed, comboIdx, runIdx) {
    const base = normalizeSeed(baseSeed);
    const combo = normalizeSeed(comboIdx);
    const run = normalizeSeed(runIdx);
    let h = mix32(base ^ mix32(combo + 0x9e3779b9));
    h = mix32(h ^ mix32(run + 0x85ebca6b));
    return h >>> 0;
}
```

---

## C.4 Pflegefall-Modellierung

### C.4.1 Datengrundlage

**Quelle:** BARMER Pflegereport 2024, in `simulator-data.js` als geglättete Pflegegrad-/Altersannahmen dokumentiert.

### C.4.2 Altersabhängige Eintrittswahrscheinlichkeiten

| Alter | PG1 | PG2 | PG3 | PG4 | PG5 | Gesamt |
|-------|-----|-----|-----|-----|-----|--------|
| 65 | 1.2% | 0.6% | 0.3% | 0.15% | 0.05% | 2.3% |
| 70 | 2.0% | 1.0% | 0.5% | 0.25% | 0.10% | 3.85% |
| 75 | 3.5% | 1.8% | 0.9% | 0.45% | 0.20% | 6.85% |
| 80 | 5.5% | 3.2% | 1.6% | 0.75% | 0.35% | 11.4% |
| 85 | 8.5% | 5.5% | 3.2% | 1.50% | 0.70% | 19.4% |
| 90 | 12.0% | 8.0% | 5.0% | 2.80% | 1.20% | 29.0% |

**Evidenz:** `PFLEGE_GRADE_PROBABILITIES` in `simulator-data.js`.

### C.4.3 Progressionsmodell

```javascript
PFLEGE_GRADE_PROGRESSION_PROBABILITIES = {
    1: 0.15,  // PG1 → PG2: 15% pro Jahr
    2: 0.12,  // PG2 → PG3: 12% pro Jahr
    3: 0.10,  // PG3 → PG4: 10% pro Jahr
    4: 0.08,  // PG4 → PG5: 8% pro Jahr
    5: 0.00   // PG5: Keine weitere Verschlechterung
};
```

**Erwartete Zeit bis PG5:**
- Von PG1: ~6-8 Jahre
- Von PG2: ~5-7 Jahre
- Von PG3: ~4-5 Jahre
- Von PG4: ~2-3 Jahre

### C.4.4 Kosten-Modell

```javascript
function calcCareCost(careMeta, inputs) {
    if (!careMeta || !careMeta.active) return { zusatzFloor: 0 };

    const baseCosts = {
        1: inputs.pflegeCostPG1 || 12000,
        2: inputs.pflegeCostPG2 || 18000,
        3: inputs.pflegeCostPG3 || 28000,
        4: inputs.pflegeCostPG4 || 36000,
        5: inputs.pflegeCostPG5 || 44000
    };

    const regionalFactor = 1 + (inputs.pflegeRegionalZuschlag || 0) / 100;
    const rampUpFactor = Math.min(1, careMeta.yearsActive / 2);
    const annualCost = baseCosts[careMeta.grade] * regionalFactor * rampUpFactor;

    return { zusatzFloor: annualCost };
}
```

### C.4.5 Dual-Care für Paare

**Separate RNG-Streams** (konzeptionell, siehe `monte-carlo-runner.js`):
```javascript
const rngCareP1 = rand.fork('CARE_P1');
const rngCareP2 = careMetaP2 ? rand.fork('CARE_P2') : null;
```

**Simultane Pflege-KPIs:**
- `bothCareYears`: Jahre mit gleichzeitiger Pflege beider Partner
- `maxAnnualCareSpend`: Maximale jährliche Pflegekosten
- `totalCareCosts`: Kumulative Pflegekosten über Lebensdauer

### C.4.6 Mortalitäts-Multiplikator

| Pflegegrad | Sterblichkeits-Multiplikator |
|------------|------------------------------|
| PG1 | 1.2× (20% erhöht) |
| PG2 | 1.5× (50% erhöht) |
| PG3 | 2.0× (100% erhöht) |
| PG4 | 2.5× (150% erhöht) |
| PG5 | 3.0× (200% erhöht) |

### C.4.7 Pflegebucket als algorithmische Zweckbindung

Der Pflegebucket erweitert die Pflegefall-Modellierung um eine optionale Selbstversicherungsreserve. Er ist keine zusätzliche Renditestrategie und keine Pflegeversicherung, sondern ein separater Haushalts-State: ein Geldmarkt-/Cash-Betrag, der für die normale Entnahmeplanung gesperrt wird und erst bei schwerem Pflegefall in den Jahreslauf eingreifen darf.

**Fachlicher Zweck:**

- Pflegekosten entstehen sprunghaft und oft spät im Lebenspfad.
- Eine normale Liquiditätsreserve würde VPW, Runway und flexible Entnahmen erhöhen, obwohl der Betrag strategisch nicht konsumierbar ist.
- Die Zweckbindung reduziert die operative Entnahmebasis und senkt damit in normalen Jahren den Konsumspielraum leicht.
- In Pflegejahren kann die Reserve Notverkäufe aus Aktien/Gold vermeiden oder verringern.

**Datenmodell:**

```javascript
healthBucket: {
  enabled: boolean,
  initialAmount: number,
  assetSource: 'money_market_first_then_cash',
  triggerMinGrade: 4,
  triggerMode: 'OR' | 'AND',
  coverageMode: 'care_additional_floor_only' | 'floor_when_care_active',
  returnMode: 'cash_return',
  targetMode: 'inflation_indexed_diagnostic'
}
```

Die Definition liegt in der Profilpflege. Im Profilverbund gilt das Primary-Profil als Haushaltsdefinition; abweichende sekundäre Profildefinitionen werden gewarnt, aber nicht gemischt.

**Carve-Out-Algorithmus:**

1. Profile lesen und zum Haushalt aggregieren.
2. Startportfolio inklusive Detailtranchen initialisieren.
3. Pflegebucket aus cash-nahen Quellen ausgliedern:
   - Geldmarkt-Tranchen per FIFO nach Kaufdatum,
   - bei ungültigem Kaufdatum stabiler Fallback,
   - danach ungetranchter Geldmarkt,
   - danach Tagesgeld/Cash.
4. `healthBucketGeldmarkt`, `healthBucketTranches`, `healthBucketCashAmount` und `healthBucketMeta` setzen.
5. Operative Liquidität, Geldmarkt und Tagesgeld um den ausgegliederten Betrag reduzieren.

Aktien, Gold und Bonds werden in Version 1 nicht automatisch umgeschichtet. Reicht Geldmarkt/Cash nicht aus, wird der Bucket auf den verfügbaren Betrag gekappt und als Warnung in Log und UI transportiert.

**Engine-Air-Gap:**

Der Bucket wird nicht als `aktuelleLiquiditaet` an die Engine gegeben. Dadurch wirken VPW, Guardrails, Runway-Ziel, Ziel-Liquidität und Transaktionslogik nur auf frei verfügbares Vermögen. Fachlich entspricht das einem Liability-Matching-Baustein: Die Pflegeverpflichtung wird vom Konsumportfolio separiert.

**Trigger-Algorithmus:**

```javascript
function isHealthBucketTriggered({ careP1, careP2, minGrade, mode }) {
  const p1 = careP1?.active && careP1?.grade >= minGrade;
  const p2 = careP2?.active && careP2?.grade >= minGrade;
  return mode === 'AND' ? p1 && p2 : p1 || p2;
}
```

Die individuellen Pflege-Metadaten laufen über `householdContext.care.p1` und `.p2`, damit P1/P2-Trigger auch im Mehrpersonen-Haushalt korrekt funktionieren.

**Deckungsalgorithmus:**

Der Standard `care_additional_floor_only` begrenzt die Nutzung auf pflegebedingte Zusatzlücken. Damit wird verhindert, dass der Bucket normale Lebenshaltungskosten quersubventioniert. Der alternative Modus `floor_when_care_active` erlaubt bei aktivem Pflege-Trigger die Deckung des gesamten Floor-Shortfalls, wenn die praktische Trennung zwischen Basisbedarf und Pflegebedarf im Jahr zu grob ist.

Der Einbaupunkt liegt vor der Forced-Sale-Logik. Wenn der Trigger aktiv ist, erhöht der genutzte Bucket-Betrag die operative Liquidität und reduziert den Notverkaufsbedarf. Erst ein verbleibender Shortfall führt zu Verkäufen aus Risikoanlagen.

**Inflationsdiagnose:**

Der Zielbetrag kann inflationsindexiert ausgewiesen werden:

```javascript
targetInflationAdjusted = initialAmount * cumulativeInflationFactor;
realCoveragePct = bucketEnd / targetInflationAdjusted;
targetGap = max(0, targetInflationAdjusted - bucketEnd);
```

Dies ist bewusst eine Diagnose, kein automatisches Refill. Die Suite zeigt Kaufkraftlücke und reale Zieldeckung, schichtet aber nicht automatisch zurück in den Bucket.

**Steuerliche Modellgrenze:**

Version 1 behandelt den Bucket-Verbrauch cash-like. Die ausgegliederten Geldmarkt-Tranchen behalten Herkunft und Cost Basis für Transparenz, aber der Verbrauch erzeugt noch keine eigenen Tax-Aggregate. Das ist eine dokumentierte Vereinfachung; eine spätere Variante kann Bucket-Verkäufe in das bestehende Jahres-Settlement integrieren.

---

## C.5 Liquiditäts-Targeting

### C.5.1 Dynamisches Runway-Ziel

**Regime-abhängige Ziel-Runway** (siehe `config.mjs`):

| Regime | Ziel-Runway | Begründung |
|--------|-------------|------------|
| `peak` | 48 Monate | 4 Jahre Puffer am ATH |
| `hot_neutral` | 36 Monate | 3 Jahre Standard |
| `bear` | 60 Monate | 5 Jahre im Crash |
| `stagflation` | 60 Monate | 5 Jahre bei Stagflation |
| `recovery_in_bear` | 48 Monate | 4 Jahre in Rally |
| `recovery` | 48 Monate | 4 Jahre in Erholung |

Optional kann die TransactionEngine das Runway-Ziel zwischen `hot_neutral` und `bear` interpolieren. Der Default bleibt deaktiviert (`CONFIG.REGIME_SMOOTHING.TARGETS_ENABLED=false`), sodass bestehende Ergebnisse ohne explizite Aktivierung die diskreten Regime-Ziele verwenden. Bei aktivierter Glaettung gilt:

- Drawdown-Severity 0 verwendet das neutrale Ziel, Severity 1 das Stress-Ziel.
- Werte knapp um 10%, 20% und 30% Drawdown bewegen das Ziel monoton und ohne mehrmonatige Schwelle.
- Das geglaettete Ziel bleibt zwischen den Profil-Stuetzwerten und unterschreitet die harte Mindest-Runway nicht.
- Explizite Nutzerziele (`runwayTargetMonths`) umgehen die Zielwert-Glaettung.
- Diagnose und Logs weisen Rohziel, Effektivziel, Severity-Prozent, Stuetzziele, Fallback und harte Mindestgrenze aus.

### C.5.2 Refill-Trigger

**Drei Refill-Trigger:**

1. **Emergency Refill** (Runway < Min):
```javascript
if (runwayMonths < minRunwayMonths) {
    reason = 'emergency';
    targetRefill = (minRunwayMonths - runwayMonths) * monthlyNeed;
}
```

2. **Target Gap Refill** (Runway < 69% Ziel):
```javascript
if (runwayCoverage < 0.69) {
    reason = 'target_gap';
    targetRefill = (targetRunwayMonths * 0.75 - runwayMonths) * monthlyNeed;
}
```

3. **Opportunistic Refill** (Im Peak bei Überschuss):
```javascript
if (scenario.startsWith('peak') && equityOverweight > rebalBand) {
    reason = 'reinvest';
    targetRefill = Math.min(excessEquity, maxSkimAmount);
}
```

### C.5.3 Anti-Pseudo-Accuracy

**Quantisierung** (siehe `config.mjs`):

| Betrag | Rundung |
|--------|---------|
| < 10.000€ | auf 1.000€ |
| 10.000-50.000€ | auf 5.000€ |
| 50.000-200.000€ | auf 10.000€ |
| > 200.000€ | auf 25.000€ |

**Beispiele:**
- 12.341,52 € → 15.000 €
- 86.234,00 € → 90.000 €
- 238.234,00 € → 250.000 €

---

## C.6 Ansparphase (Accumulation)

### C.6.1 Grundkonzept

Die Simulator-Komponente unterstützt eine optionale **Ansparphase** vor dem Ruhestand. Dies ermöglicht die Modellierung des gesamten Lebenszyklus vom Sparbeginn bis zum Lebensende.

**Aktivierung:** Checkbox "Ansparphase aktivieren" im Simulator

### C.6.2 Konfigurationsparameter

| Parameter | Beschreibung | Beispielwert |
|-----------|--------------|--------------|
| `durationYears` | Dauer der Ansparphase in Jahren | 25 |
| `sparrate` | Monatliche Sparrate in € | 2.000 |
| `sparrateIndexing` | Dynamisierung der Sparrate | `inflation`, `wage`, `none` |

**Implementierung** (siehe `simulator-portfolio-inputs.js`):
```javascript
const accumulationPhase = {
    enabled: accumulationPhaseEnabled,
    durationYears: accumulationDurationYears,
    sparrate: accumulationSparrate,
    sparrateIndexing: sparrateIndexing
};
const transitionYear = accumulationPhaseEnabled ? accumulationDurationYears : 0;
```

### C.6.3 Simulationslogik

**Während der Ansparphase** (siehe `simulator-engine-direct.js`):
- Kein Mortalitätsrisiko (Person lebt noch)
- Keine Entnahmen aus dem Depot
- Jährliche Einzahlung = `sparrate × 12`
- Optional: Indexierung der Sparrate (Inflation/Lohn)
- Marktregime = `accumulation` (keine Guardrail-Logik)

**Transition zum Ruhestand:**
```javascript
const effectiveTransitionYear = inputs.transitionYear || 0;
const isAccumulationYear = yearIndex < effectiveTransitionYear;
```

### C.6.4 Sonderfälle

**Pflegeeintritt in Ansparphase:**
- Bei Pflegeeintritt während der Ansparphase wird sofort in den Ruhestand gewechselt
- Die verbleibende Ansparphase wird abgebrochen
- Entnahmelogik übernimmt ab diesem Jahr

```javascript
if (inputs.accumulationPhase?.enabled && simulationsJahr < effectiveTransitionYear) {
    // Sofortiger Wechsel bei Pflegeeintritt
    effectiveTransitionYear = simulationsJahr;
}
```

### C.6.5 Berechnungsbeispiel

| Jahr | Alter | Phase | Depot Anfang | Rendite | Einzahlung | Depot Ende |
|------|-------|-------|--------------|---------|------------|------------|
| 1 | 40 | Anspar | 0 € | — | 24.000 € | 24.000 € |
| 2 | 41 | Anspar | 24.000 € | +7% | 24.000 € | 49.680 € |
| ... | ... | ... | ... | ... | ... | ... |
| 25 | 65 | **Transition** | 950.000 € | +5% | — | 997.500 € |
| 26 | 66 | Ruhestand | 997.500 € | +3% | -48.000 € | 979.725 € |

---

## C.7 Rentensystem (Gesetzliche & Private Rente)

### C.7.1 Grundkonzept

Die Suite modelliert Renteneinkünfte für **1-2 Personen** mit unterschiedlichen Indexierungsarten und optionaler **Witwenrente**.

### C.7.2 Renten-Parameter pro Person

| Parameter | Beschreibung | Beispiel |
|-----------|--------------|----------|
| `renteMonatlich` | Monatliche Bruttorente | 1.500 € |
| `rentAdjMode` | Indexierungsart | `fix`, `wage`, `cpi` |
| `rentAdjPct` | Feste Anpassung (bei `fix`) | 2.0% |
| `steuerquotePct` | Steuersatz auf Rente | 30% |
| `renteStartOffset` | Startjahr der Rente (relativ) | 0 |

**Implementierung** (simulator-portfolio-pension.js):
```javascript
export function computePensionNext(prev, isFirstYear, base, adjPct) {
    if (isFirstYear) return Math.max(0, base);
    return Math.max(0, prev * (1 + adjPct / 100));
}

export function computeRentAdjRate(inputs, yearData) {
    if (inputs.rentAdjMode === 'wage') return yearData.lohn || 0;
    if (inputs.rentAdjMode === 'cpi') return yearData.inflation || 0;
    return inputs.rentAdjPct || 0;
}
```

### C.7.3 Paar-Modellierung (Rente1 + Rente2)

**Separate Renten für Person 1 und Person 2:**

| Feld | Person 1 | Person 2 |
|------|----------|----------|
| Bruttorente | `rente1` | `rente2` |
| Steuerquote | `p1SteuerquotePct` | `partner.steuerquotePct` |
| Startalter | `p1StartAlter` | `partnerStartAlter` |
| Lebenserwartung | `p1LebensErwartung` | `partnerLebensErwartung` |

**Aggregation:**
```javascript
const renteSum = rente1 + rente2;
const floorBedarf = Math.max(0, inflatedFloor - renteSum);
```

### C.7.4 Witwenrente

Nach dem Tod eines Partners kann der Überlebende einen Teil der Partnerrente erhalten.

**Konfiguration:**
- `widowOptions.enabled`: Aktiviert Witwenrente
- `widowOptions.marriageOffsetYears`: Ehe-Unterschied in Jahren
- `widowOptions.benefitFraction`: Anteil der Partnerrente (z.B. 0.55 für 55%)

**Implementierung** (konzeptionell, siehe `monte-carlo-runner.js`):
```javascript
let widowBenefitActiveForP1 = false; // P1 erhält Witwenrente nach P2
let widowBenefitActiveForP2 = false; // P2 erhält Witwenrente nach P1
```

**Berechnungsbeispiel:**

| Jahr | P1 Status | P2 Status | Rente1 | Rente2 | Witwenrente | Gesamt |
|------|-----------|-----------|--------|--------|-------------|--------|
| 1 | lebt | lebt | 1.500 € | 800 € | — | 2.300 € |
| 10 | lebt | **verstorben** | 1.500 € | — | 440 € (55%) | 1.940 € |
| 15 | lebt | — | 1.650 € | — | 484 € | 2.134 € |

### C.7.5 Steuerbehandlung

- **Besteuerungsanteil:** Je nach Renteneintrittsalter (z.B. 2025: 83%)
- **Nettoberechnung:** `renteNetto = renteBrutto × (1 - steuerquotePct / 100)`
- **Witwenrente:** Wird zum steuerpflichtigen Einkommen addiert

**Einschränkungen:**
- Keine detaillierte Steuerprogression für Renten (vereinfachter Steuersatz)
- Keine Modellierung von Hinzuverdienst oder Flexirente

---

## C.8 Historischer Backtest

### C.8.1 Grundkonzept

Neben der Monte-Carlo-Simulation bietet die Suite einen **deterministischen historischen Backtest**, der einen Ruhestandsplan über reale historische Zeiträume simuliert.

**Kernunterschied zu Monte Carlo:**

| Aspekt | Monte Carlo | Historischer Backtest |
|--------|-------------|----------------------|
| Datenquelle | Zufällige Stichproben aus Historie | Exakte historische Sequenz |
| Zeitraum | Simulationsdauer gemäß Eingabe; Sampling aus 1925-2025, optional ohne geschätzte Jahre <1950 | 1951-2025 |
| Ergebnis | Verteilung (Perzentile) | Ein deterministischer Pfad |
| Anwendung | Risikobewertung | Validierung ("Hätte mein Plan 2008 überlebt?") |

Die Abgrenzung ist absichtlich: Die Monte-Carlo-Datenbasis enthält auch die geschätzte Erweiterung 1925-1949. Der Backtest startet dagegen erst 1951, weil er für Renditen, ATH-/Trendkontext und historische Reihen Vorjahreswerte ab 1950 benötigt und einen nachvollziehbaren deterministischen Pfad über die belastbarere Basishistorie zeigen soll.

### C.8.2 Implementierung (siehe `simulator-backtest.js`)

**Hauptfunktion:**
```javascript
export function runBacktest() {
    const inputs = getCommonInputs();
    const startJahr = parseInt(document.getElementById('simStartJahr').value);
    const endJahr = parseInt(document.getElementById('simEndJahr').value);

    // Validierung: 1951-2025
    if (startJahr < 1951 || endJahr > 2025 || startJahr >= endJahr) {
        alert('Fehler: Bitte gültigen Zeitraum eingeben.');
        return;
    }

    // Historische Serien ab 1950 aufbauen; der Simulationspfad startet ab 1951.
    const backtestCtx = {
        series: {
            wageGrowth: histYears.map(y => HISTORICAL_DATA[y].lohn_de),
            inflationPct: histYears.map(y => HISTORICAL_DATA[y].inflation_de)
        }
    };

    // Jahr-für-Jahr-Simulation
    for (let jahr = startJahr; jahr <= endJahr; jahr++) {
        const jahresrenditeAktien = (HISTORICAL_DATA[jahr].msci_eur - dataVJ.msci_eur) / dataVJ.msci_eur;
        const result = simulateOneYear(simState, adjustedInputs, yearData, yearIndex);

        if (result.isRuin) {
            log += `${jahr}: RUIN`;
            if (BREAK_ON_RUIN) break;
        }
        simState = result.newState;
    }
}
```

### C.8.3 Backtest-Ausgabe

**Spalten im Detail-Modus:**

| Spalte | Beschreibung |
|--------|--------------|
| `Jahr` | Simulationsjahr (z.B. 2008) |
| `Entn.` | Jahresentnahme in € |
| `Floor` | Floor-Bedarf (inflationsbereinigt) |
| `Rente1/Rente2` | Renteneinkünfte pro Person |
| `Flex%` | Aktuelle Flex-Rate |
| `WQ%` | Entnahmequote vom Depot |
| `Status` | Marktregime + Aktion |
| `Quote%` | Entnahmequote Ende Jahr |
| `Runway%` | Liquiditäts-Deckungsgrad |
| `Pf.Akt%/Pf.Gld%` | Aktien-/Gold-Rendite |
| `Handl.A/Handl.G` | Netto-Handelsaktivität Aktien/Gold |
| `St.` | Gezahlte Steuern |

### C.8.4 Renten-Indexierung im Backtest

Der Backtest unterstützt dynamische Rentenanpassung basierend auf historischen Daten:

```javascript
export function computeAdjPctForYear(backtestCtx, yearIndex) {
    const { mode, pct } = backtestCtx.inputs.rentAdj;

    if (mode === 'wage') {
        return backtestCtx.series.wageGrowth[yearIndex] || 0;
    }
    if (mode === 'cpi') {
        return backtestCtx.series.inflationPct[yearIndex] || 0;
    }
    return pct || 0;  // Fixe Anpassung
}
```

### C.8.5 Export-Funktionen

| Format | Inhalt |
|--------|--------|
| **JSON** | Vollständige Rohdaten inkl. Metadaten |
| **CSV** | Tabellarisch für Excel/Google Sheets |

---

## C.9 Parameter Sweep (Sensitivitätsanalyse)

### C.9.1 Grundkonzept

Der **Parameter Sweep** ermöglicht die systematische Untersuchung, wie verschiedene Parameterkombinationen die Simulationsergebnisse beeinflussen.

**Anwendungsfälle:**
- Sensitivitätsanalyse: "Wie stark beeinflusst Runway-Min die Erfolgsquote?"
- Trade-off-Analyse: "Wo liegt das Optimum zwischen Erfolgsrate und Endvermögen?"
- Robustheits-Test: "Ist mein Plan sensitiv gegenüber einzelnen Parametern?"

### C.9.2 Sweep-Parameter

**Konfigurierbare Parameter** (siehe `simulator-sweep.js`):

| Parameter | Input-ID | Beschreibung | Beispiel-Range |
|-----------|----------|--------------|----------------|
| `runwayMin` | `sweepRunwayMin` | Minimale Liquiditäts-Monate | 18:6:36 |
| `runwayTarget` | `sweepRunwayTarget` | Ziel-Liquiditäts-Monate | 36:6:60 |
| `targetEq` | `sweepTargetEq` | Ziel-Aktienquote % | 50:5:70 |
| `rebalBand` | `sweepRebalBand` | Rebalancing-Band % | 3:1:7 |
| `maxSkimPct` | `sweepMaxSkimPct` | Max. Abschöpfung im Peak % | 15:5:35 |
| `maxBearRefillPct` | `sweepMaxBearRefillPct` | Max. Nachfüllung im Crash % | 30:10:60 |
| `goldTargetPct` | `sweepGoldTargetPct` | Gold-Zielallokation % | 0:2:10 |

**Range-Syntax:**
- `24` — Einzelwert
- `24,36,48` — Kommaliste
- `18:6:36` — Range (Start:Schritt:Ende)

### C.9.3 Whitelist/Blocklist-System

**Schutzmechanismus** (`simulator-sweep-utils.js`):

```javascript
export const SWEEP_ALLOWED_KEYS = new Set([
    'runwayMinMonths',
    'runwayTargetMonths',
    'targetEq',
    'rebalBand',
    'maxSkimPctOfEq',
    'maxBearRefillPctOfEq',
    'goldZielProzent',
    'goldAktiv'
]);

export function isBlockedKey(key) {
    // Partner-spezifische Keys sind geblockt
    const blocked = ['partnerRente', 'partnerAlter', 'partnerLebenserwartung'];
    return blocked.some(b => key.toLowerCase().includes(b.toLowerCase()));
}
```

**Zweck:** Verhindert versehentliche Variation von Partner-Parametern (Rente 2), die zwischen Profilen konstant bleiben sollten.

### C.9.4 Parallelisierung mit Workers

**Worker-Pool-Architektur:**

```javascript
async function runSweepWithWorkers({ baseInputs, paramCombinations, sweepConfig }) {
    const pool = new WorkerPool({
        workerUrl: new URL('./workers/mc-worker.js', import.meta.url),
        size: workerCount,  // Default: 8
        type: 'module'
    });

    // Broadcast: Initialisiere alle Worker mit Basisdaten
    await pool.broadcast({ type: 'sweep-init', baseInputs, paramCombinations });

    // Adaptive Chunk-Größe (Zeit-Budget: 500ms)
    let chunkSize = initialChunk;
    while (nextComboIdx < totalCombos) {
        const result = await Promise.race(pending);

        // Anpassung basierend auf tatsächlicher Laufzeit
        const targetSize = Math.round(count * (timeBudgetMs / elapsedMs));
        smoothedChunkSize = Math.round(smoothedChunkSize * 0.7 + targetSize * 0.3);
        chunkSize = smoothedChunkSize;
    }
}
```

### C.9.5 Sweep-Runner (`sweep-runner.js`)

**DOM-freie Ausführungslogik** (Worker-kompatibel):

```javascript
export function runSweepChunk({ baseInputs, paramCombinations, comboRange, sweepConfig }) {
    const { anzahlRuns, maxDauer, blockSize, baseSeed, methode } = sweepConfig;

    for (let offset = 0; offset < count; offset++) {
        const comboIdx = start + offset;
        const params = paramCombinations[comboIdx];
        const inputs = buildSweepInputs(baseInputs, params);

        // P2-Invarianz prüfen (Partner-Daten dürfen nicht variieren)
        const p2Invariants = extractP2Invariants(inputs);
        if (!areP2InvariantsEqual(p2Invariants, refP2Invariants)) {
            console.warn('[SWEEP] P2-Basis-Parameter variieren!');
        }

        // Monte-Carlo für diese Kombination
        const runOutcomes = [];
        for (let i = 0; i < anzahlRuns; i++) {
            const rand = rng(makeRunSeed(baseSeed, comboIdx, i));
            // ... Simulation ...
            runOutcomes.push({ finalVermoegen, maxDrawdown, minRunway, failed });
        }

        const metrics = aggregateSweepMetrics(runOutcomes);
        results.push({ comboIdx, params, metrics });
    }
    return { results, p2VarianceCount };
}
```

### C.9.6 Heatmap-Visualisierung

**SVG-basierte Heatmap** (`simulator-heatmap.js`):

```javascript
export function renderSweepHeatmapSVG(sweepResults, metricKey, xParam, yParam, xValues, yValues) {
    // Viridis-Farbpalette für Werte
    const getColor = (value) => {
        const t = (value - minVal) / range;
        return viridis(t);  // Perceptually uniform colormap
    };

    // Zellen mit Tooltip
    for (let yi = 0; yi < yValues.length; yi++) {
        for (let xi = 0; xi < xValues.length; xi++) {
            const value = heatmapData.get(`${xVal}_${yVal}`);
            const color = getColor(value);

            // Warn-Badge bei P2-Varianz
            if (result.metrics.warningR2Varies) {
                cellsHtml += `<text>⚠</text>`;  // Gelber Rand + Symbol
            }
        }
    }
}
```

**Metriken für Heatmap:**

| Metrik | Beschreibung | Optimierungsziel |
|--------|--------------|------------------|
| `successProbFloor` | Erfolgsrate (Floor gedeckt) | Maximieren |
| `medianEndWealth` | Median Endvermögen | Maximieren |
| `p10EndWealth` | 10%-Perzentil Endvermögen | Maximieren |
| `worst5Drawdown` | Schlimmste 5% Drawdowns | Minimieren |
| `minRunwayObserved` | Minimale beobachtete Runway | Maximieren |

---

## C.10 Auto-Optimize (Automatische Parameteroptimierung)

### C.10.1 Grundkonzept

**Auto-Optimize** ist ein **mehrphasiger Optimierungsalgorithmus**, der automatisch geeignete Parameterkombinationen ermittelt. Im Vergleich zu einem exhaustiven Sweep reduziert er die Anzahl zu prüfender Kombinationen durch LHS-Sampling, Quick-Filter, volle Evaluation, lokale Verfeinerung und separate Validierung.

**Architektur:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      Auto-Optimize Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│  Kandidaten: Latin Hypercube Sampling (100 Samples)             │
│      ↓                                                          │
│  Phase 1:  Quick-Filter (200 Runs × 2 Seeds) → Top-50           │
│      ↓                                                          │
│  Phase 2:  Volle Evaluation (Top-50) → Constraint-Check         │
│      ↓                                                          │
│  Phase 3:  Lokale Verfeinerung (Nachbarschaft von Top-5)        │
│      ↓                                                          │
│  Phase 4:  Test-Validierung (Top-3 auf separaten Seeds)         │
│      ↓                                                          │
│  Output:   Champion-Konfiguration + Delta vs. Current           │
└─────────────────────────────────────────────────────────────────┘
```

### C.10.2 Latin Hypercube Sampling (`auto-optimize-sampling.js`)

**Algorithmus:**

```javascript
export function latinHypercubeSample(ranges, n, rand) {
    const params = Object.keys(ranges);
    const samples = [];

    // Permutationen für jede Dimension (Fisher-Yates Shuffle)
    const perms = params.map(() => {
        const perm = Array.from({ length: n }, (_, i) => i);
        for (let i = n - 1; i > 0; i--) {
            const j = Math.floor(rand() * (i + 1));
            [perm[i], perm[j]] = [perm[j], perm[i]];
        }
        return perm;
    });

    for (let i = 0; i < n; i++) {
        const sample = {};
        params.forEach((key, dim) => {
            const { min, max, step } = ranges[key];
            const bin = perms[dim][i];
            const binSize = (max - min) / n;
            const offset = rand() * binSize;  // Jitter innerhalb Bin
            const rawValue = min + bin * binSize + offset;
            sample[key] = Math.round(rawValue / step) * step;  // Snap to grid
        });
        samples.push(sample);
    }
    return samples;
}
```

**Vorteil gegenüber Grid-Sampling:** LHS garantiert gleichmäßige Abdeckung aller Dimensionen mit weniger Samples.

### C.10.3 Optimierungsziele und Constraints

**Konfigurierbare Objectives:**

| Objective | Metrik | Standard |
|-----------|--------|----------|
| Primär | `successProbFloor` | Maximieren |
| Sekundär | `medianEndWealth` | Maximieren |
| Risiko | `worst5Drawdown` | Minimieren |

**Beispiel-Constraints:**
```javascript
const constraints = [
    { metricKey: 'successProbFloor', operator: '>=', value: 95 },
    { metricKey: 'worst5Drawdown', operator: '<=', value: 40 }
];
```

### C.10.4 Lokale Verfeinerung

**Nachbarschafts-Generierung** (siehe `auto-optimize-sampling.js`):

```javascript
export function generateNeighborsReduced(candidate, ranges) {
    const neighbors = [];

    for (const [key, value] of Object.entries(candidate)) {
        const deltas = getParameterDeltas(key, true);  // z.B. [-2, +2]
        for (const delta of deltas) {
            const newVal = value + delta;
            if (newVal >= ranges[key].min && newVal <= ranges[key].max) {
                neighbors.push({ ...candidate, [key]: newVal });
            }
        }
    }
    return neighbors;
}

// Parameter-spezifische Deltas
function getParameterDeltas(key, reduced = false) {
    const deltaMap = {
        runwayMinM: reduced ? [-2, 2] : [-4, -2, 2, 4],
        goldTargetPct: reduced ? [-1, 1] : [-2, -1, 1, 2],
        targetEq: reduced ? [-2, 2] : [-5, -2, 2, 5]
    };
    return deltaMap[key] || [-1, 1];
}
```

### C.10.5 Train/Test-Validierung

**Separate Seeds für Validierung:**

```javascript
// Train-Seeds: Für Optimierung
const trainSeedArray = Array.from({ length: seedsTrain }, (_, i) => 42 + i);

// Test-Seeds: Für finale Validierung (disjunkt!)
const testSeedArray = Array.from({ length: seedsTest }, (_, i) => 420 + i);
```

**Stabilitäts-Metrik:**
```javascript
const stability = Math.min(1, champion.trainObjValue / (champion.testObjValue + 0.0001));
```

### C.10.6 Caching und Parallelisierung

**Kandidaten-Cache** (`auto-optimize-utils.js`):
```javascript
export class CandidateCache {
    constructor() { this.cache = new Map(); }

    has(candidate) {
        return this.cache.has(JSON.stringify(this._normalize(candidate)));
    }

    get(candidate) {
        return this.cache.get(JSON.stringify(this._normalize(candidate)));
    }

    set(candidate, results) {
        this.cache.set(JSON.stringify(this._normalize(candidate)), results);
    }
}
```

**Parallelisierung:**

Auto-Optimize nutzt zwei Ebenen:

1. `auto_optimize.js` bewertet Kandidaten in kleinen Batches per `Promise.all`, damit mehrere Kandidaten parallel laufen können.
2. Die eigentliche Monte-Carlo-Bewertung eines Kandidaten läuft über `auto-optimize-evaluate.js` in `runMonteCarloAutoOptimize()`. Dort nutzt `auto-optimize-worker.js` einen wiederverwendeten `WorkerPool` mit `workers/mc-worker.js`, adaptiver Chunk-Größe und den UI-Werten `mcWorkerCount`/`mcWorkerBudget`.

Wenn Web Worker nicht verfügbar sind oder der Worker-Pfad fehlschlägt, fällt Auto-Optimize auf serielle `runMonteCarloChunk()`-Ausführung zurück. Der Worker-Contract wird über `auto-optimize-worker-contract.test.mjs` abgesichert.

**Nicht optimierbare Sicherheitsparameter:** Longevity-Felder (`longevityMode`, `longevityQuantileShift`, `longevityRelativePct`, `longevityBufferYears`) sind in Version 1 keine Auto-Optimize-Parameter. Der Optimierer bewertet Kandidaten mit den Basisinputs des Nutzers, kann diese Sicherheitsannahmen aber weder über die Parameter-Auswahl noch über Champion-Apply verändern. Damit kann Auto-Optimize niedrigere VPW-Freigaben nicht dadurch "wegoptimieren", dass es den Langlebigkeitspuffer abschaltet.

**Kandidaten-Batches:**
```javascript
const BATCH_SIZE = 4;  // Parallel evaluation

for (let i = 0; i < validCandidates.length; i += BATCH_SIZE) {
    const batch = validCandidates.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
        batch.map(candidate => evaluate(candidate, baseInputs, runs, maxDauer, seeds))
    );
}
```

### C.10.7 Ergebnis-Ausgabe

**Champion-Konfiguration:**
```javascript
return {
    championCfg: champion.candidate,    // Optimale Parameter
    metricsTest: champion.testResults,  // Metriken auf Test-Seeds
    deltaVsCurrent: {                   // Verbesserung vs. aktuelle Einstellungen
        successRate: +2.3,              // +2.3 Prozentpunkte
        drawdownP90: -5.1,              // -5.1 Prozentpunkte (besser!)
        endWealthP50: +45000            // +45.000€ median
    },
    stability: 0.98                     // Train/Test-Konsistenz
};
```

### C.10.8 Optimierungs-Modi (`simulator-optimizer.js`)

**1. Single-Objective:**
```javascript
const best = findBestParameters(sweepResults, 'medianEndWealth', true);
```

**2. Multi-Objective (Weighted Sum):**
```javascript
const objectives = [
    { metricKey: 'medianEndWealth', weight: 0.6, maximize: true },
    { metricKey: 'successProbFloor', weight: 0.4, maximize: true }
];
const best = findBestParametersMultiObjective(sweepResults, objectives);
```

**3. Constraint-Based:**
```javascript
const constraints = [
    { metricKey: 'successProbFloor', operator: '>=', value: 95 }
];
const best = findBestParametersWithConstraints(
    sweepResults, 'medianEndWealth', true, constraints
);
```

### C.10.9 Performance-Vergleich

| Methode | Kombinationen | Evaluationen | Relative Zeit |
|---------|---------------|--------------|---------------|
| Exhaustiver Grid-Sweep (7×7×7) | 343 | 343 × 1000 | 100% |
| Auto-Optimize (LHS + Refine) | ~100 + ~50 | ~150 × 1000 | **~44%** |
| Auto-Optimize (mit Quick-Filter) | ~100 + ~30 | ~50 × 1000 + ~100 × 200 | **~12%** |

## C.11 Dynamic Flex (VPW — Variable Percentage Withdrawal)

### C.11.1 Grundkonzept

Dynamic Flex ersetzt den manuellen Flex-Betrag durch eine **VPW-basierte dynamische Berechnung** (Variable Percentage Withdrawal). Die Entnahme passt sich jährlich an die Restlebenserwartung, erwartete Rendite und Gesamtvermögen an.

**Zentrale Idee:** Statt eines fixen Flex-Betrags berechnet die Engine pro Jahr:
```
flexBedarf = max(0, Gesamtvermögen × VPW-Rate × GoGo-Multiplikator − Floor)
```

**Architekturentscheidung:** Die Horizont-Berechnung (Sterbetafeln) liegt in der App-Schicht (`simulator-engine-helpers.js` und `dynamic-flex-runner-horizon.js`). Die Engine erhält `horizonYears` als effektiven Wert und optionale `longevityHorizonDiagnostics`; sie bleibt damit demographik-agnostisch, kann aber Raw-/Effektivhorizont und Clamp-Gründe anzeigen.

### C.11.2 VPW-Formel (Engine)

Die VPW-Rate ist die PMT-Formel (Annuitätenfaktor) der Finanzmathematik:

```javascript
function _berechneEntnahmeRate(realReturn, horizonYears) {
    if (Math.abs(realReturn) < 0.001) return 1 / horizonYears;  // Fallback
    return realReturn / (1 - Math.pow(1 + realReturn, -horizonYears));
}
```

| Parameter | Beschreibung | Wertebereich |
|-----------|-------------|--------------|
| `realReturn` | Geglättete erwartete Realrendite | 0.00 – 0.05 (0% – 5%) |
| `horizonYears` | Erwartete Restlaufzeit | 1 – 60 Jahre |

**Ergebnis:** Bei `realReturn = 2%` und `horizonYears = 20` ergibt sich eine VPW-Rate von ~6.12%.

### C.11.3 Erwartete Realrendite (Engine)

Die erwartete Realrendite wird als **gewichteter Durchschnitt** der Asset-Klassen berechnet, per EMA geglättet und auf [0%, 5%] geclippt. Die Herleitung erfolgt ueber `engine/planners/vpw-return-policy.mjs`.

Im Default `legacy_step` wird die bisherige CAPE-Stufenlogik weiterverwendet:

```javascript
// 1. Renditekomponenten
const equityReturn = expectedReturnCape - inflation/100;  // CAPE-basiert
const goldReturn   = CONFIG.DYNAMIC_FLEX.GOLD_REAL_RETURN;     // 1.0%
const safeReturn   = CONFIG.DYNAMIC_FLEX.SAFE_ASSET_REAL_RETURN; // 0.5%

// 2. Gewichtung nach Allokation
const rawReturn = equityWeight * equityReturn
                + goldWeight * goldReturn
                + safeWeight * safeReturn;

// 3. EMA-Glättung (Smoothing)
const alpha = CONFIG.DYNAMIC_FLEX.SMOOTHING_ALPHA;  // 0.35
const smoothed = alpha * rawReturn + (1 - alpha) * lastSmoothedReturn;

// 4. Clamping
return clamp(smoothed, MIN_REAL_RETURN, MAX_REAL_RETURN);  // [0%, 5%]
```

**Legacy-CAPE-Rendite-Mapping (`MarketAnalyzer.mjs`):**

| CAPE-Bereich | Erwartete Nominalrendite |
|-------------|-------------------------|
| CAPE ≤ 15 | 8% |
| CAPE 15–20 | 6% |
| CAPE 20–30 | 5% |
| CAPE > 30 | 4% |

Im expliziten Modus `cape_continuous` wird statt der Stufen eine kontinuierliche CAPE-Funktion genutzt:

```javascript
earningsYield = 1 / capeRatioUsed;
rawEquityRealReturn = earningsYield + EQUITY_PREMIUM_ADJUSTMENT;
equityRealReturn = clamp(rawEquityRealReturn, MIN_EQUITY_REAL_RETURN, MAX_EQUITY_REAL_RETURN);
portfolioRealReturn = equityWeight * equityRealReturn
                    + goldWeight * goldRealReturn
                    + safeWeight * safeRealReturn;
expectedRealReturn = clamp(portfolioRealReturn, MIN_REAL_RETURN, MAX_REAL_RETURN);
```

Ungueltige, fehlende, nicht-endliche, negative oder zu hohe CAPE-Werte fallen nicht in einen guenstigen Clamp, sondern auf `DEFAULT_CAPE` zurueck und setzen `capeInputStatus`/`expectedReturnSource` entsprechend.

### C.11.4 Horizont-Berechnung (`simulator-engine-helpers.js`)

Der Horizont wird aus **deutschen Periodensterbetafeln** (`MORTALITY_TABLE` in `simulator-data.js`) berechnet.

**Zwei Methoden:**

| Methode | Funktion | Beschreibung |
|---------|----------|-------------|
| `mean` | `estimateRemainingLifeYears()` | Mittlere Restlebenserwartung |
| `survival_quantile` | `estimateSingleRemainingLifeYearsAtQuantile()` | Alter, bei dem nur noch q% der Kohorte lebt |

**Single-Life vs. Joint-Life:**
- **Single:** Horizont basiert auf Person 1 (oder Person 2, wenn allein)
- **Joint:** Horizont basiert auf dem längsten verbleibenden Leben beider Personen (max)

**Monte-Carlo-Integration:** Im MC-Lauf wird der Horizont **pro Simulationsjahr** neu berechnet:
- Alter steigt je Simulationsjahr
- Bei Tod einer Person: Fallback auf Single-Life-Horizont der überlebenden Person
- Implementierung: `computeDynamicFlexHorizonForYear()` in `monte-carlo-runner.js`, mit gemeinsamer Auflösung über `dynamic-flex-runner-horizon.js`

### C.11.4a Konservative Langlebigkeitsannahmen

Longevity-Adjustments werden nach der normalen Single-/Joint-Horizon-Ableitung angewandt. Bei Paaren gilt: erst finalen Haushalts-Horizont bestimmen, dann den Langlebigkeitsaufschlag genau einmal anwenden. Es gibt keine doppelte Pufferung pro Person.

| Feld | Bedeutung | V1-Grenze |
|------|-----------|-----------|
| `longevityMode` | `none`, `quantile_shift`, `relative_horizon_buffer`, `buffer_years` | Default `none` |
| `longevityQuantileShift` | Erhoeht das Survival-Quantil, z. B. 0,85 -> 0,90 | 0,00 bis 0,10, gekappt bei 0,95 |
| `longevityRelativePct` | Relativer Zuschlag auf den Raw-Horizont | 0,00 bis 0,20 |
| `longevityBufferYears` | Fester Vergleichs-/Expertenpuffer in Jahren | ganze Zahl 0 bis 10 |

`quantile_shift` ist der fachlich bevorzugte Modus, weil er alters- und kohortenabhängig über die Sterbetafel wirkt. `buffer_years` bleibt für Vergleichsrechnungen verfügbar, ist aber nicht der Default. Alle Modi respektieren den bestehenden Max-Horizon von 60 Jahren; wirkungslose Shifts am Quantil-Cap oder Max-Horizon-Clamps werden diagnostiziert.

Beim Monte-Carlo-Übergang von Joint- zu Single-Life kann der effektive Horizont stark fallen. Die Longevity-Pipeline nutzt dafür eine lineare Transition-Floor-Glättung: im ersten Übergangsjahr darf der Horizont nicht stärker als 3 Jahre fallen; der Floor läuft danach über maximal 3 Jahre aus. Die Diagnosefelder `longevityTransitionSmoothingApplied` und `longevityTransitionSmoothingFloor` machen diesen Eingriff sichtbar.

### C.11.5 Go-Go-Phase

Optional erhöhte Entnahme in den ersten Ruhestandsjahren ("Go-Go Years"):

```javascript
vpwTotal = gesamtwert * vpwRate * (goGoActive ? goGoMultiplier : 1.0);
```

| Parameter | Beschreibung | Wertebereich |
|-----------|-------------|--------------|
| `goGoActive` | Go-Go ein/aus | boolean |
| `goGoMultiplier` | Multiplikator | 1.0 – 1.5 |

**Validierung:** `goGoMultiplier > MAX_GO_GO_MULTIPLIER` (1.5) erzeugt einen `ValidationError` — keine stille Clampung.

### C.11.6 Konfiguration (Engine-Konfiguration)

```javascript
DYNAMIC_FLEX: {
    RETURN_POLICY: 'legacy_step',       // legacy_step | cape_continuous
    SAFE_ASSET_REAL_RETURN: 0.005,   // 0.5% p.a.
    GOLD_REAL_RETURN: 0.01,          // 1.0% p.a.
    MIN_HORIZON_YEARS: 1,
    MAX_HORIZON_YEARS: 60,
    FALLBACK_REAL_RETURN: 0.03,      // Ohne CAPE-Daten
    MIN_REAL_RETURN: 0.00,           // Untere Schranke
    MAX_REAL_RETURN: 0.05,           // Obere Schranke (5%)
    SMOOTHING_ALPHA: 0.35,           // EMA-Glättung (35% neuer Wert)
    MAX_GO_GO_MULTIPLIER: 1.5        // Go-Go-Obergrenze
}
```

Die Continuous-Parameter liegen separat unter `CONFIG.CAPE_CONTINUOUS`. Der Default-Wechsel auf `cape_continuous` ist nicht erfolgt; Backtest-Vergleiche zeigen sichtbare Entnahme-/Endvermoegens-Deltas und brauchen fachliche Freigabe.

Longevity-Grenzen werden in `dynamic-flex-longevity-contract.js` und `engine/validators/InputValidator.mjs` validiert. Ungueltige Werte erzeugen Validierungsfehler; insbesondere wird `longevityBufferYears` nicht still gerundet, sondern muss ganzzahlig sein.

### C.11.7 Integration in die Berechnungskette

Dynamic Flex greift **vor** dem SpendingPlanner ein:

```
Input → Validation → Market Analysis → [VPW: Flex-Override] → SpendingPlanner → Transactions
```

1. Die VPW-Berechnung überschreibt `inflatedBedarf.flex` mit dem dynamisch berechneten Wert
2. Der SpendingPlanner behandelt den Wert dann wie einen normalen Flex-Bedarf
3. Alle bestehenden Guardrails (FlexRate 0-100%, Alarm-Modus, Hard Caps) wirken weiterhin auf den VPW-abgeleiteten Flex

**Diagnostik:** Das Ergebnisobjekt enthält immer `ui.vpw` mit:
- `status`: `'active'` | `'disabled'` | `'contract_ready'` | `'safety_static_flex'`
- `vpwRate`, `expectedRealReturn`, `vpwTotal`, `dynamicFlex`, `gesamtwert`
- `horizonYears`, `horizonMethod`, `survivalQuantile`
- `horizonYearsRaw`, `longevityMode`, `longevityAppliedShift`, `longevityAppliedBufferYears`, `longevityRelativePct`, `longevityClampReason`, `survivalQuantileRaw`, `survivalQuantileAdjusted`, `longevityTransitionSmoothingApplied`, `longevityTransitionSmoothingFloor`
- `goGoActive`, `goGoMultiplier`
- `capeRatioUsed`, `expectedReturnCape`
- `returnPolicy`, `expectedReturnSource`, `capeInputStatus`
- `expectedRealReturnRaw`, `expectedRealReturnClamped`, `safeRealReturn`, `safeRealReturnSource`

### C.11.8 UI-Presets (`simulator-main-dynamic-flex.js`)

| Preset | Horizont-Methode | Quantil | Horizont | Go-Go |
|--------|-----------------|---------|----------|-------|
| **Aus** | — | — | — | — |
| **Konservativ** | survival_quantile | 0.90 | 35 J. | Aus |
| **Ausgewogen** | survival_quantile | 0.85 | 30 J. | 1.10 |
| **Offensiv** | mean | — | 25 J. | 1.20 |

Die Presets setzen Longevity bewusst auf `none`. Konservative Langlebigkeitsannahmen sind eine explizite Nutzereinstellung und werden nicht durch Preset-Wechsel heimlich aktiviert.

### C.11.9 Balance-App-Diagnose

Die Balance-App zeigt 8 VPW-Metriken im Diagnose-Panel (`balance-diagnosis-keyparams.js`):

| Metrik | Beschreibung | Warnschwelle |
|--------|-------------|-------------|
| Dynamic Flex (VPW) | Status + Methode | — |
| VPW-Rate | Entnahmesatz | ≥ 6% (erhöht), ≥ 8% (Warnung) |
| VPW-Horizont | Restlaufzeit in Jahren | ≤ 18 J. (kurz), ≤ 12 J. (Warnung) |
| ER(real) | Geglättete Realrendite | < 0% (Warnung) |
| ER(CAPE) | CAPE-basierte Nominalrendite | — |
| Go-Go-Phase | Status + Multiplikator | — |
| VPW-Basisvermögen | Gesamtvermögen für VPW-Formel | — |
| VPW-Rahmen | Vermögen × Rate × Go-Go; maximal freigegebener Rahmen, keine Konsumpflicht | — |
| Flex freigegeben | VPW-Rahmen minus netto Floor, nach Safety-/Reentry-Logik | — |
| Nicht genutzter Rahmen | VPW-Rahmen minus empfohlene Entnahme | — |

Zusaetzlich zeigt der Dynamic-Flex-Copytext bei aktivem Longevity-Modus Raw-Horizont, Effektivhorizont, Modus, angewandten Shift/Puffer, Clamp-Grund und ggf. Transition-Smoothing. Bei `quantile_shift` am Quantil-Cap wird ein wirkungsloser Shift erkennbar statt als Pufferwirkung dargestellt.

**Feature-Gate:** Dynamic Flex wird in der Balance-App nur aktiviert, wenn `capeRatio > 0` (CAPE-Daten müssen vorliegen).

### C.11.10 Sweep- und Optimizer-Integration

**Sweep-fähige Parameter:**
- `horizonYears` — Horizont-Variation
- `survivalQuantile` — Quantil-Variation
- `goGoMultiplier` — Go-Go-Variation

**Nicht sweep-fähig in V1:** `longevityMode`, `longevityQuantileShift`, `longevityRelativePct` und `longevityBufferYears`. Sweep-Kombinationen erben diese Werte aus den Basisinputs, duerfen sie aber nicht pro Zelle verändern. Dadurch bleibt der Langlebigkeitsaufschlag ein fixer Sicherheitsparameter, waehrend klassische VPW-Parameter weiterhin sensitiviert werden koennen.

**Auto-Optimize-Grenzen:**

| Parameter | Min | Max |
|-----------|-----|-----|
| `horizonYears` | 15 | 45 |
| `survivalQuantile` | 0.75 | 0.95 |
| `goGoMultiplier` | 1.0 | 1.35 |

Longevity-Felder sind auch hier nicht optimierbar und werden nicht per Champion-Konfiguration auf Formularfelder angewandt.

---

# Marktvergleich

## D.1 Kommerzielle Retirement Planner (2025/2026)

### D.1.1 ProjectionLab

| Aspekt | Details |
|--------|---------|
| **Preis** | $9/Monat (Premium), $799 Lifetime |
| **Website** | [projectionlab.com](https://projectionlab.com/) |
| **Monte Carlo** | ✅ Ja, mit Multiple Scenarios |
| **Guardrails** | ❌ Nicht dynamisch |
| **DE-Steuern** | ⚠️ Basis-Support für Deutschland |
| **Pflegefall** | ⚠️ Healthcare-Planung, aber kein PG-Modell |
| **Offline** | ✅ Mit Lifetime ($799) |
| **Stärken** | Elegantes UI ("Apple-esque"), Multi-Szenario |
| **Schwächen** | Keine dynamischen Guardrails, teuer für Lifetime |

**Reviewer-Zitat:** "The most beautiful financial planning tool" – RetireBeforeDad

### D.1.2 Boldin (ehemals NewRetirement)

| Aspekt | Details |
|--------|---------|
| **Preis** | Kostenlos (Basic), $144/Jahr (Plus) |
| **Website** | [boldin.com](https://www.boldin.com/) |
| **Monte Carlo** | ✅ 1.000 Szenarien, AAGR-basiert |
| **Guardrails** | ❌ Keine dynamischen Guardrails |
| **DE-Steuern** | ❌ US-fokussiert |
| **Pflegefall** | ⚠️ Basis-Gesundheitskosten |
| **Offline** | ❌ Cloud-basiert |
| **Stärken** | Große Community, Roth-Conversion-Explorer |
| **Schwächen** | US-zentriert, keine DE-Steuern |

### D.1.3 Pralana

| Aspekt | Details |
|--------|---------|
| **Preis** | Kostenlos (Bronze), $99 (Gold), $119/Jahr (Online) |
| **Website** | [pralanaretirementcalculator.com](https://pralanaretirementcalculator.com/) |
| **Monte Carlo** | ✅ + Historical Analysis |
| **Guardrails** | ⚠️ Spending Strategies, aber nicht dynamisch |
| **DE-Steuern** | ❌ US-fokussiert |
| **Pflegefall** | ⚠️ Healthcare-Modul |
| **Offline** | ✅ Gold ist Excel-basiert |
| **Stärken** | "Most feature-rich planner", optimiert SS/Roth |
| **Schwächen** | Hohe Lernkurve, US-Steuersystem |

**Reviewer-Zitat:** "By far the most comprehensive of the 18 retirement calculators I tried" – CanIRetireYet

## D.2 Kostenlose Tools

### D.2.1 Portfolio Visualizer

| Aspekt | Details |
|--------|---------|
| **Website** | [portfoliovisualizer.com](https://www.portfoliovisualizer.com/monte-carlo-simulation) |
| **Monte Carlo** | ✅ 4 Modelle (Historical, Forecast, Statistical, Parameterized) |
| **Guardrails** | ❌ Nein |
| **Withdrawal-Strategien** | Fixed, RMD-based, Custom |
| **Stärken** | Flexibel, viele Asset-Klassen |
| **Schwächen** | Zeigt nominale Dollars (nicht inflationsbereinigt), keine Steuern |

### D.2.2 FI Calc

| Aspekt | Details |
|--------|---------|
| **Website** | [ficalc.app](https://ficalc.app/) |
| **Monte Carlo** | ❌ Historische Simulation (nicht MC) |
| **Guardrails** | ✅ Ja, als Withdrawal-Strategie |
| **Stärken** | 100+ Jahre historische Daten, FIRE-fokussiert |
| **Schwächen** | Keine Monte Carlo, nur historisch |

### D.2.3 Deutsche Tools

| Tool | Fokus | MC | Guardrails | Bewertung |
|------|-------|----|-----------:|-----------|
| **[BVI Entnahme-Rechner](https://www.bvi.de/en/services/calculators/retirement-calculator/)** | Entnahmedauer | ❌ | ❌ | Sehr einfach |
| **[Pensionfriend](https://pensionfriend.de/)** | GRV-Prognose | ❌ | ❌ | Nur Rente |
| **[Hypofriend](https://hypofriend.de/en/retirement-calculator-germany)** | Pension Gap | ❌ | ❌ | Nur Gap |

## D.3 Vergleichsmatrix

| Feature | Ruhestand-Suite | ProjectionLab | Boldin | Pralana | FI Calc | PV |
|---------|----------------|---------------|--------|---------|---------|-----|
| **Preis** | Kostenlos | $9-799 | $0-144 | $0-119 | Kostenlos | Kostenlos |
| **Monte Carlo** | ✅ 4 Methoden | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Historischer Backtest** | ✅ 1951-2025 | ⚠️ | ❌ | ✅ | ✅ | ✅ |
| **Dynamische Guardrails** | ✅ 7 Regime | ❌ | ❌ | ⚠️ | ✅ | ❌ |
| **DE-Steuern (vollst.)** | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| **Pflegefall-Modell** | ✅ PG1-5 | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| **Pflegebucket / Selbstversicherung** | ✅ gesperrte Geldmarkt-/Cash-Reserve | ⚠️ allgemeine Healthcare-Budgets | ⚠️ allgemeine Healthcare-Budgets | ⚠️ Healthcare-Modul | ❌ | ❌ |
| **Multi-Profil** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Tranchen-Management** | ✅ FIFO+Online | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| **Parameter-Sweeps** | ✅ Heatmap | ❌ | ❌ | ⚠️ | ❌ | ❌ |
| **Dynamic Flex (VPW)** | ✅ CAPE+Sterbetafel | ❌ | ❌ | ❌ | ❌ | ⚠️ RMD |
| **Mindest-Flex p.a.** | ⚠️ experimentelle Komfort-Untergrenze | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Auto-Optimize** | ✅ LHS + Quick/Refine/Validate | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Ausgaben-Check** | ✅ CSV+Median | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Offline** | ✅ | ⚠️ ($799) | ❌ | ✅ (Gold) | ✅ | ✅ |
| **Desktop-App** | ✅ Tauri (8 MB) | ❌ | ❌ | ✅ Excel | ❌ | ❌ |
| **Multi-Plattform** | ✅ Win/Mac/Linux | ⚠️ Web only | ⚠️ Web only | ⚠️ Win only | ✅ Web | ✅ Web |
| **Open Source** | ✅ MIT | ❌ | ❌ | ❌ | ✅ | ❌ |

## D.4 Differenzierungsmerkmale (im Vergleich zu analysierten Tools)

*Hinweis: Dieser Vergleich basiert auf einer Recherche der oben genannten Tools (ProjectionLab, Boldin, Pralana, Portfolio Visualizer, FI Calc). Es können weitere Tools existieren, die nicht analysiert wurden.*

1. **Vollständige DE-Kapitalertragssteuer** — Kein anderes verglichenes Tool implementiert Abgeltungssteuer, Soli, KiSt, Teilfreistellung, SPB, steueroptimierte Reihenfolge und jahresübergreifenden Verlustverrechnungstopf
2. **Pflegefall-Modellierung mit PG1-5** — Kein anderes verglichenes Tool hat ein deutsches Pflegegrad-Modell mit Progression und Dual-Care
3. **7-stufige Marktregime-Erkennung** — In den betrachteten kostenlosen Tools in dieser Form nicht enthalten
4. **Risk-Based Guardrails** — Implementiert den Kitces-Ansatz statt klassischer Guyton-Klinger
5. **Tranchen-Management mit Online-Kursen** — Einzelpositionen mit FIFO-Steueroptimierung und automatischer Kursabfrage
6. **Mehrphasige Auto-Optimierung (LHS)** — Latin Hypercube Sampling + Quick-Filter + volle Evaluation + lokale Verfeinerung + Train/Test-Validierung
7. **Parameter-Sweep mit Heatmap-Visualisierung** — Sensitivitätsanalyse mit SVG-basierter Viridis-Heatmap und Invarianten-Prüfung
8. **Historischer Backtest mit DE-Daten** — Deterministische Simulation 1951-2025 mit deutscher Inflation und Lohnentwicklung
9. **Portable Tauri-Desktop-App** — ~8 MB EXE, keine Installation, läuft von USB-Stick
10. **Offline-Betrieb und Open Source** — Daten verbleiben lokal auf dem Rechner
11. **Ausgaben-Check mit CSV-Import** — Monatliches Budget-Tracking gegen Floor+Flex, Median-basierte Hochrechnung, Ampel-Visualisierung, Profilverbund-Integration
12. **Echte Multi-Plattform-Unterstützung** — Native Desktop-Apps für Windows (.exe), macOS (.app) und Linux (AppImage/deb) aus einer Codebasis, plus Browser-Fallback mit Start-Scripts
13. **Dynamic Flex (VPW) mit Sterbetafeln** — Variable Percentage Withdrawal mit CAPE-basierter Renditeerwartung, EMA-Glättung, Mortality-Table-Horizont (Single/Joint, Mean/Quantil) und Go-Go-Phase. Integriert in Balance-App, Backtest, Monte Carlo, Parameter-Sweep und Auto-Optimize. Kein anderes verglichenes Tool kombiniert VPW mit Guardrails und deutscher Steuer.
14. **Pflegebucket mit Engine-Air-Gap** — Zweckgebundene Geldmarkt-/Cash-Reserve wird aus der VPW-/Runway-Basis herausgerechnet, bei Pflegegrad-Triggern freigegeben und in Backtest/Monte Carlo separat ausgewiesen.
15. **Mindest-Flex p.a. als experimentelle Komfort-Policy** — Nutzerdefinierte Untergrenze für flexible Ausgaben in gekürzten Guardrail-/Safety-Jahren. Diese konkrete Regel ist eine Novität der Suite und nicht als wissenschaftlich validierte Entnahmestrategie belegt; sie wird deshalb transparent als nachgelagerte, notfallbegrenzte Policy behandelt.

## D.5 Einordnung des Pflegebuckets

Der Pflegebucket liegt zwischen klassischer Liquiditätsreserve, mentalem Zweckkonto und Versicherungslösung:

| Ansatz | Wirkung | Vorteil | Grenze |
|--------|---------|---------|--------|
| Normale Liquidität | zählt vollständig für Runway/Entnahme | einfach, jederzeit verfügbar | kann Konsumspielraum überschätzen, wenn Geld mental für Pflege reserviert ist |
| Notgroschen | grobe Reserve außerhalb der Planung | robust gegen kurzfristige Schocks | meist nicht mit Pflegegrad, Inflation und Monte Carlo verknüpft |
| Geldmarkt-ETF-Reserve | risikoarm, liquide, verzinst | passt zur Bucket-Quelle | steuerliche Detailbehandlung bei Verkäufen muss modelliert werden |
| Pflegezusatzversicherung | Risikotransfer an Versicherer | kann extreme Pflegekosten abdecken | Prämien, Bedingungen, Annahme-/Leistungsrisiken, keine direkte Portfoliointegration |
| Pflegebucket der Suite | algorithmisch gesperrte Selbstversicherung | Air Gap gegen VPW-Überfreigabe, weniger Forced Sales in Stressjahren | keine Garantie, Opportunitätskosten, Version 1 ohne automatisches Refill |

Die Stärke des Buckets ist nicht, dass er mehr Vermögen erzeugt. Er erhöht Modelltreue, wenn ein Haushalt einen Teil des Geldmarkts strategisch nicht konsumieren will. Bei hohem Gesamtvermögen kann er aus reiner Erfolgsquotensicht unnötig wirken; aus Governance-Sicht kann er dennoch sinnvoll sein, weil er Pflegekosten nicht erst im Krisenjahr aus Risikoanlagen finanzieren muss.

**Trade-offs:**

- Die operative VPW-/Runway-Basis sinkt, dadurch sind normale Flex-Entnahmen etwas niedriger.
- Das Renditepotenzial sinkt gegenüber einer vollständigen Risikoanlage.
- In Pflege- und Crashkombinationen kann die Notverkaufsquote sinken.
- Extreme Pflege-, Langlebigkeits- oder Marktpfade werden nicht garantiert abgefangen.
- Der inflationsindexierte Zielwert verhindert Selbsttäuschung über reale Kaufkraft, löst aber keinen automatischen Nachfüllmechanismus aus.

---

# Forschungsabgleich

## E.1 Morningstar 2025: Safe Withdrawal Rates

**Quelle:** [Morningstar: What's a Safe Retirement Spending Rate for 2025?](https://www.morningstar.com/retirement/whats-safe-retirement-spending-rate-2025)

| Strategie | Starting SWR | Morningstar | Ruhestand-Suite |
|-----------|--------------|-------------|-----------------|
| Constant Dollar | 3.9% | ✅ | ✅ Floor |
| Guardrails | 5.2% | ✅ | ✅ Floor + Flex |
| RMD-based / VPW | 4.8% | ✅ | ✅ Dynamic Flex (VPW) |
| Forgo Inflation | 4.3% | ✅ | ❌ |

**Implementierung:** Floor-Flex implementiert den Guardrails-Ansatz, der laut Morningstar die höchste SWR ermöglicht. Seit Februar 2026 deckt Dynamic Flex (VPW) auch den RMD-basierten Ansatz ab — mit CAPE-basierter Renditeerwartung statt fixer Rate.

## E.2 Kitces 2024: Risk-Based Guardrails

**Quelle:** [Kitces: Why Guyton-Klinger Guardrails Are Too Risky](https://www.kitces.com/blog/guyton-klinger-guardrails-retirement-income-rules-risk-based/)

**Kernaussage:** Klassische Guyton-Klinger-Guardrails führen zu Einkommensreduktionen von bis zu 54% (Stagflation) oder 28% (2008). Risk-Based Guardrails reduzieren dies auf 32% bzw. 3%.

| Aspekt | Guyton-Klinger | Ruhestand-Suite |
|--------|----------------|-----------------|
| Trigger | ±20% Withdrawal Rate | 7 Regime + Schwellen |
| Anpassung | ±10% (fix) | Adaptive Caps (2.5-10 pp) |
| Worst-Case (2008) | -28% Einkommen | -3% Einkommen |
| Worst-Case (Stagflation) | -54% Einkommen | -32% Einkommen |

**Implementierung:** Die Suite implementiert Risk-Based Guardrails:
- Marktregime-Erkennung statt fixer Withdrawal-Rate-Trigger
- Adaptive Rate-Change-Caps (2.5-10 pp) statt fixer ±10%
- Recovery-Guardrails verhindern zu schnelle Erhöhung

## E.3 Morningstar 2025: Flexible Strategies

**Quelle:** [Morningstar: Best Flexible Strategies for Retirement Income](https://www.morningstar.com/retirement/best-flexible-strategies-retirement-income-2)

| Aspekt | Forschung | Suite |
|--------|-----------|-------|
| Guardrails + Social Security | ✅ Empfohlen | ✅ Rente als Floor-Offset |
| Volatility Trade-off | ✅ Dokumentiert | ✅ Flex-Rate-Glättung |
| Lifetime Income | Guardrails #1 | ✅ Implementiert |

## E.4 Mindest-Flex p.a.: Einordnung als nicht validierte Novität

`Mindest-Flex p.a.` ist keine direkt aus der Literatur übernommene Entnahmeregel. Die Policy verbindet mehrere etablierte Konzepte, geht in ihrer konkreten Form aber über den belegten Forschungsstand hinaus:

- **Floor-and-Upside / Floor-Flex:** Die Trennung von nicht verhandelbarem Floor und flexiblem Konsum ist anschlussfähig an Floor-and-Upside-Logik. Mindest-Flex erhöht den Floor jedoch bewusst nicht, sondern definiert nur eine Komfort-Untergrenze für den flexiblen Anteil.
- **Risk-Based Guardrails:** Die Policy wirkt nach den Guardrails und kann sehr starke Flex-Kürzungen abmildern. Sie ersetzt keine Guardrails und bleibt Alarm-, Runway- und Vermögensdeckungsprüfungen untergeordnet.
- **Behavioral Finance und Konsumglättung:** Haushalte akzeptieren Entnahmepläne oft besser, wenn Mindeststandards für Lebensqualität transparent sind. Diese Plausibilität ist verhaltensökonomisch anschlussfähig, aber für die konkrete Regel nicht empirisch validiert.
- **VPW / Dynamic Flex:** Mindest-Flex kann besonders bei VPW- oder Safety-Pfaden als Gegenpol zu sehr niedrigen Flex-Freigaben dienen. Das ist eine Nutzerpräferenz-Kalibrierung, kein Bestandteil klassischer VPW-Modelle.

**Status:** ⚠️ experimentelle, praxisorientierte Policy. Sie darf Flex-Kürzungen abmildern, ist aber keine garantierte Mindestrente, keine Versicherung und kein wissenschaftlich belegter SWR-Verbesserer. Deshalb dokumentiert die Suite Status, Blockiergrund und Effekt im Diagnose-/Logsystem und validiert die Regel gegen den Flex-Bedarf.

## E.5 Bootstrap-Methodik

**Stand der Forschung:** Block-Bootstrap erhält Autokorrelation; Stationary Bootstrap (Politis/Romano) wird in der Literatur häufig als geeignete Alternative eingeordnet.

**Status:** ✅ Block-Bootstrap und Stationary Bootstrap implementiert. Stationary Bootstrap nutzt variable Blocklaengen mit deterministischem per-run Sampler-State; Fat-Tail-/Crash-Overlays bleiben separat.

## E.6 Fat Tails / Regime Switching

**Stand der Forschung:** Student-t oder GARCH erfassen Tail-Risiken besser als Normalverteilung.

**Status:** Regime-Switching via Markov-Chain implementiert; keine expliziten Fat Tails im Return-Modell

## E.7 VPW / Variable Percentage Withdrawal

**Quellen:**
- [Bogleheads: Variable Percentage Withdrawal](https://www.bogleheads.org/wiki/Variable_percentage_withdrawal) — Grundkonzept und PMT-Formel
- McClung, M. (2017): *Living Off Your Money* — VPW als dynamische Entnahmestrategie
- Morningstar 2025: RMD-basierte Strategien erreichen ~4.8% Starting SWR

**Kernaussage:** VPW berechnet jährlich den Entnahmebetrag als Annuität (PMT-Formel) basierend auf Vermögen, erwarteter Rendite und Restlaufzeit. Im Vergleich zu fixen Entnahmeraten passt sich VPW automatisch an Marktschwankungen an und reduziert das Ruinrisiko.

| Aspekt | Klassisches VPW | Ruhestand-Suite |
|--------|----------------|-----------------|
| Renditeerwartung | Fix (z.B. 4%) | CAPE-basiert, EMA-geglättet, [0%-5%] |
| Horizont | Fixe Jahre oder Mean-LE | Mean oder Survival-Quantil aus Sterbetafeln |
| Joint-Life | Selten implementiert | Single + Joint (max beider Horizonte) |
| Guardrails | Keine | ✅ FlexRate 0-100%, Hard Caps, Alarm |
| Go-Go-Phase | Nicht Teil von VPW | ✅ Optionaler Multiplikator (1.0–1.5) |
| Steuer | Nicht integriert | ✅ Vollständige DE-Kapitalertragssteuer |
| MC-Integration | Meist unabhängig | ✅ Dynamischer Horizont pro Simulationsjahr |

**Status:** ✅ VPW implementiert mit CAPE-basierter Rendite, Sterbetafel-Horizont, EMA-Glättung und vollständiger Guardrail-Integration

## E.8 Pflegebucket, Mental Accounting und Self-Insurance

Der Pflegebucket verbindet mehrere Forschungs- und Praxislinien, ohne selbst eine versicherungsmathematisch kalibrierte Pflegeversicherung zu sein.

**Liquiditätsreserven und Sequence-of-Returns-Risk:** In der Entnahmephase reduzieren risikoarme Reserven den Zwang, Risikoanlagen in schlechten Marktphasen zu verkaufen. Der Pflegebucket nutzt diese Logik gezielt für Pflegejahre: Erst wenn ein Pflegegrad-Trigger vorliegt, darf die Reserve Forced Sales ersetzen. Dadurch wirkt er besonders in Pfaden, in denen Pflegekosten und schlechte Märkte zusammenfallen.

**Mental Accounting:** Haushalte reservieren oft mental Kapital für bestimmte Risiken. Wenn eine Simulation dieses Kapital als frei verfügbare Liquidität behandelt, überschätzt sie Flex-Spielraum und VPW-Basis. Der Air-Gap-Ansatz bildet diese Zweckbindung algorithmisch ab: Das Geld existiert im Gesamtvermögen, aber nicht im Konsumportfolio.

**Self-Insurance vs. Versicherung:** Der Bucket ist Selbstversicherung. Er vermeidet Prämien und Vertragsrisiken, aber das Risiko bleibt beim Haushalt. Eine Pflegezusatzversicherung kann Tail-Risiken transferieren; der Bucket kann nur bis zur reservierten Höhe leisten. Für hohe Vermögen kann Selbstversicherung rational sein, wenn die Opportunitätskosten akzeptiert werden. Für kleinere Vermögen kann sie zu viel Kapital binden und dennoch nicht ausreichend schützen.

**Heuristischer Charakter:** Der Startbetrag ist eine Planungsannahme, keine aktuarische Prämienkalkulation. Pflegekosten, Leistungsänderungen der Pflegeversicherung, regionale Heimkosten, Dauer, Steuerlast und familiäre Unterstützung bleiben unsicher. Die Suite macht diese Unsicherheit sichtbar, indem sie Nutzung, Erschöpfung, Zieldeckung und Ziellücke über Monte Carlo ausweist.

**Modellgrenzen in Version 1:**

- Kein automatisches Refill des inflationsindexierten Zielwerts.
- Bucket-Verbrauch wird cash-like vereinfacht und noch nicht als eigener Geldmarkt-ETF-Verkauf im Tax-Settlement verbucht.
- Balance zeigt den Bucket diagnostisch, entsperrt ihn aber nicht automatisch, solange kein aktueller Pflegegrad-Ist-Zustand gepflegt wird.
- Die fachliche Angemessenheit hängt vom Vermögensspielraum ab: Bei sehr hohem Vermögen ist der Bucket eher Governance und Stresshygiene; bei engem Vermögen kann er normale Entnahmen zu stark drücken.

---

# Appendix: Modul-Inventar

*Hinweis: Dieser Appendix wird in den Folgepaketen gegen die spezialisierten Modul-READMEs aktualisiert und neu geclustert. Exakte aktuelle Bestandszahlen stehen in der Komponenten- und B.1-Übersicht.*

## Engine-Module (Auswahl)

| Modul/Gruppe | Funktion |
|--------------|----------|
| `core.mjs` | Orchestrierung, EngineAPI, Input-Normalisierung, Dynamic-Flex/VPW, Steuer-Settlement-Anbindung |
| `config.mjs` | Zentrale Konfiguration für Schwellenwerte, Profile, Texte, Spending-Modell und Build-ID |
| `errors.mjs`, `index.mjs` | Fehlerklassen und Bundle-/ESM-Entry |
| `validators/InputValidator.mjs` | Plausibilisierung von Jahresinputs, Dynamic-Flex-Feldern und persistiertem Steuerzustand |
| `analyzers/MarketAnalyzer.mjs` | Marktregime, Drawdown, Stagflation und CAPE-Erwartungsrendite |
| `planners/SpendingPlanner.mjs` + Policy-Module | Entnahmeplanung aus State, Alarm, Flex-Rate, Guardrails, Flex-Budget, finalen Rate-Limits und Diagnose |
| `transactions/TransactionEngine.mjs` + `transaction-*` | Ziel-Liquidität, Runway-/Floor-Notfüllung, opportunistisches Rebalancing, Surplus-Investments |
| `transactions/sale-engine.mjs` | Steuerbewusste Verkäufe, Tranchenreihenfolge, Rohaggregate für Settlement |
| `transactions/three-bucket-logic.mjs` | 3-Bucket-Jilge: Bond-Erkennung, Bond-Verkauf in schlechten Jahren, Bond-Refill in guten Jahren |
| `tax-settlement.mjs` | Finale Jahressteuer mit Verlustvortrag, Sparer-Pauschbetrag und `taxState.lossCarry` |

## Simulator-Module (Cluster)

| Cluster | Zentrale Module | Funktion |
|---------|-----------------|----------|
| Bootstrap/UI-Fassade | `simulator-main.js`, `simulator-main-init.js`, `simulator-main-tabs.js`, `simulator-main-input-persist.js` | App-Start, Button-/Tab-Verdrahtung, Eingabepersistenz, Engine-Handshake |
| Fach-UI | `simulator-ui-pflege.js`, `simulator-ui-rente.js`, `simulator-main-accumulation.js`, `simulator-main-dynamic-flex.js`, `simulator-main-3bucket.js`, `simulator-main-stress.js` | Pflege-, Renten-, Anspar-, VPW-, 3-Bucket- und Stress-Konfiguration |
| Input-Mapping | `simulator-input-*.js`, `simulator-profile-inputs.js` | DOM-/Profildaten in strukturierte Simulator-Inputs übersetzen |
| Portfolio/Tranchen | `simulator-portfolio*.js`, `simulator-year-portfolio.js`, `simulator-portfolio-tranches.js` | Startportfolio, Detailtranchen, Aktien/Gold/Bonds, Renditefortschreibung und Verkäufe |
| Jahressimulation | `simulator-engine-direct.js`, `simulator-engine-wrapper.js`, `simulator-engine-input.js`, `simulator-household-pension.js`, `simulator-accumulation-year.js`, `simulator-health-bucket.js`, `simulator-year-result.js` | Engine-Aufruf je Jahr, Rente/Witwenlogik, Ansparphase, Pflegebucket, Ergebnis- und Logshape |
| Nachsteuerung | `simulator-forced-sale.js`, `simulator-tax-recompute.js`, `simulator-bond-refill.js` | Forced Sales, Steuer-Recompute nach Zusatzverkäufen, 3-Bucket-Bond-Refill |
| Monte Carlo | `simulator-monte-carlo.js`, `monte-carlo-runner.js`, `mc-*.js`, `monte-carlo-aggregates.js`, `scenario-analyzer.js` | Runs, Sampling, Life-State, Stressmetriken, Logs und Aggregation |
| Backtest/Sweep/Optimize | `simulator-backtest.js`, `simulator-sweep.js`, `sweep-runner.js`, `simulator-heatmap.js`, `auto_optimize*.js`, `simulator-visualization.js` | Historische Pfade, Sensitivitätsraster, Heatmaps, Optimierung, Pareto/Sensitivity |
| Ergebnisdarstellung | `simulator-results.js`, `results-metrics.js`, `results-renderers.js`, `results-formatting.js`, `simulator-main-helpers.js` | KPI-Karten, Szenario-/Backtest-Logs, CSV/JSON-Export, Tabellenformatierung |
| Daten/Utilities | `simulator-data.js`, `simulator-utils.js`, `cape-utils.js` | Historische Daten, Pflege-/Mortalitätsdaten, Stress-Presets, RNG/Statistik, CAPE-Auswahl |

## Worker-Module (3)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `worker-pool.js` | ~400 | Worker-Lifecycle, Chunking |
| `mc-worker.js` | ~150 | Monte-Carlo Worker-Thread |
| `auto-optimize-worker.js` | ~80 | Optimizer-Worker |

## Balance-App Module (Auswahl)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `balance-main.js` | ~500 | Orchestrierung, Update-Zyklus |
| `balance-reader.js` | ~300 | DOM-Input-Lesung |
| `balance-health-bucket.js` | ~120 | Pflegebucket-Diagnose, freie vs. gesperrte Liquidität, diagnostic-only Policy |
| `balance-storage.js` | ~400 | PersistenceFacade-Anbindung, Snapshot-Archiv, Legacy-Migration |
| `balance-expenses.js` | **646** | Ausgaben-Check mit CSV-Import, Budget-Tracking |
| `balance-guardrail-reset.js` | ~70 | Auto-Reset bei kritischen Änderungen |
| `balance-annual-*.js` (4) | ~400 | Jahresabschluss, Inflation, Marktdaten |
| `balance-diagnosis-*.js` (7) | ~840 | Chips, Entscheidungsbaum, Guardrails, VPW-Keyparams **(erweitert!)** |

## Profil- und Tranchen-Module (Auswahl)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `profile-storage.js` | 340 | CRUD, Export/Import, Registry-Management |
| `profile-manager.js` | 192 | UI-Facade für Profilverwaltung |
| `profilverbund-balance.js` | 550 | Multi-Profil-Aggregation, Entnahme-Verteilung |
| `depot-tranchen-status.js` | 432 | Aggregation, UI-Sync, Status-Badge |
| `balance-main-profile-sync.js` | ~150 | Cross-App-Synchronisation |

## Tauri Desktop-App (4 Dateien)

| Datei | Sprache | Funktion |
|-------|---------|----------|
| `src-tauri/src/main.rs` | Rust | Desktop-Eintragspunkt |
| `src-tauri/src/lib.rs` | Rust | Tauri-Bindings |
| `src-tauri/tauri.conf.json` | JSON | App-Konfiguration (Fenster, Permissions) |
| `src-tauri/Cargo.toml` | TOML | Rust-Abhängigkeiten |

**Output:** `RuhestandSuite.exe` (~8 MB, portable)

## Kernalgorithmen

1. **Floor-Flex-Guardrails** (`SpendingPlanner.mjs`)
2. **7-Regime-Klassifikation** (`MarketAnalyzer.mjs`)
3. **Per-Run-Seeding** (`simulator-utils.js:makeRunSeed`)
4. **Block-Bootstrap** (`monte-carlo-runner.js:sampleNextYearData`)
5. **Worker-Pool mit adaptivem Chunking** (`worker-pool.js`)
6. **Pflegegrad-Progression** (`simulator-data.js:PFLEGE_GRADE_PROGRESSION_PROBABILITIES`)
7. **Mehrphasige Auto-Optimize-Pipeline** (`auto_optimize.js`, `auto-optimize-sampling.js`)
8. **FIFO-Steueroptimierung** (`sale-engine.mjs:getSellOrder`)
9. **Wealth-Adjusted Reduction** (`SpendingPlanner.mjs`)
10. **Flex-Budget-System** (`SpendingPlanner.mjs`)
11. **Flex-Share S-Curve** (`SpendingPlanner.mjs`)
12. **FILTER/RECENCY Sampling** (`monte-carlo-runner.js`)
13. **Ansparphase-Logik** (`simulator-engine-direct.js`, `simulator-main-accumulation.js`)
14. **Renten-Indexierung** (`simulator-portfolio-pension.js:computeRentAdjRate`)
15. **Witwenrente** (`monte-carlo-runner.js:widowBenefitActive`)
16. **Great Depression/WWII Stress-Presets** (`simulator-data.js`)
17. **Latin Hypercube Sampling** (`auto-optimize-sampling.js:latinHypercubeSample`)
18. **Historischer Backtest** (`simulator-backtest.js:runBacktest`)
19. **Profilverbund-Aggregation** (`profilverbund-balance.js:aggregateProfilverbundInputs`)
20. **Tranchen-FIFO-Selektion** (`profilverbund-balance.js:selectTranchesForSale`)
21. **Multi-Objective-Optimierung** (`simulator-optimizer.js:findBestParametersMultiObjective`)
22. **Constraint-Based-Optimierung** (`simulator-optimizer.js:findBestParametersWithConstraints`)
23. **Sweep-Heatmap-Rendering** (`simulator-heatmap.js:renderSweepHeatmapSVG`)
24. **Verlustverrechnungstopf** (`tax-settlement.mjs:settleTaxYear`) — Jahres-Settlement mit Verlustvortrag, SPB und Gesamt-Recompute
24. **P2-Invarianz-Prüfung** (`simulator-sweep-utils.js:areP2InvariantsEqual`)
25. **Ausgaben-Check CSV-Parser** (`balance-expenses-csv.js:parseCategoryCsv`)
26. **Median-basierte Hochrechnung** (`balance-expenses-metrics.js:computeYearStats`)
27. **VPW-Annuitätenformel** (`core.mjs:_berechneEntnahmeRate`)
28. **CAPE-basierte Realrendite mit EMA-Glättung** (`core.mjs:_calculateExpectedRealReturn`)
29. **Sterbetafel-Horizont (Single/Joint, Mean/Quantil)** (`simulator-engine-helpers.js`)
30. **Dynamischer MC-Horizont pro Simulationsjahr** (`monte-carlo-runner.js:computeDynamicFlexHorizonForYear`)

---

## Quellen

### Marktvergleich
- [Rob Berger: 5 Best Retirement Calculators](https://robberger.com/best-retirement-calculators/)
- [ProjectionLab](https://projectionlab.com/) | [Review](https://marriagekidsandmoney.com/projectionlab-review/)
- [Boldin](https://www.boldin.com/) | [Review](https://marriagekidsandmoney.com/boldin-review/)
- [Pralana](https://pralanaretirementcalculator.com/) | [Review](https://www.caniretireyet.com/pralana-online-retirement-calculator-review/)
- [Portfolio Visualizer Monte Carlo](https://www.portfoliovisualizer.com/monte-carlo-simulation)
- [FI Calc](https://ficalc.app/)
- [White Coat Investor: Best Retirement Calculators 2025](https://www.whitecoatinvestor.com/best-retirement-calculators-2025/)

### Forschung
- [Morningstar: Safe Withdrawal Rate 2025](https://www.morningstar.com/retirement/whats-safe-retirement-spending-rate-2025)
- [Morningstar: Best Flexible Strategies](https://www.morningstar.com/retirement/best-flexible-strategies-retirement-income-2)
- [Kitces: Why Guyton-Klinger Guardrails Are Too Risky](https://www.kitces.com/blog/guyton-klinger-guardrails-retirement-income-rules-risk-based/)
- [Kitces: Risk-Based Guardrails](https://www.kitces.com/blog/risk-based-monte-carlo-probability-of-success-guardrails-retirement-distribution-hatchet/)
- [Bogleheads: Variable Percentage Withdrawal](https://www.bogleheads.org/wiki/Variable_percentage_withdrawal) (VPW/PMT-Grundlage)

### Deutsche Quellen
- [BARMER Pflegereport 2024](https://www.barmer.de/pflegereport) (Pflegefall-Daten)
- [BVI Entnahme-Rechner](https://www.bvi.de/en/services/calculators/retirement-calculator/)

---

*Technische Dokumentation der Ruhestand-Suite. Algorithmen-Beschreibungen sind konzeptionell; konkrete Implementierungsdetails stehen in den genannten Modulen und Tests. Dokumentstand: 2026-05-23.*
