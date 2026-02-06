# Architektur und Fachkonzept: Ruhestand-Suite

**Technische Dokumentation der DIY-Software für Ruhestandsplanung**

**Version:** Engine API v31.0, Build 2025-12-22
**Stand:** Februar 2026
**Zuletzt validiert (Codebasis):** 2026-02-06
**Codeumfang:** ~37.000 LOC (JavaScript ES6 Module)
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

*Metriken in dieser Tabelle sind stichtagsbezogene Schätzwerte (validiert am 2026-02-06).*

| Komponente | Zweck | Codeumfang |
|------------|-------|------------|
| **Balance-App** | Jahresplanung: Liquidität, Entnahme, Steuern, Transaktionen, Ausgaben-Check | 28 Module, ~6.100 LOC |
| **Simulator** | Monte-Carlo-Simulation, Parameter-Sweeps, Auto-Optimize | 41 Module, ~14.000 LOC |
| **Engine** | Kern-Berechnungslogik, Guardrails, Steuern | 13 Module, ~3.600 LOC |
| **Workers** | Parallelisierung für MC-Simulation | 3 Module, ~600 LOC |
| **Tests** | Unit- und Integrationstests | 48 Dateien (davon 45 `*.test.mjs`), ~9.500 LOC, 800+ Assertions |
| **Sonstige** | Profile, Tranchen, Utilities | ~20 Module, ~2.500 LOC |

*Hinweis: Code-Zeilenangaben (z.B. `SpendingPlanner.mjs:326`) können bei zukünftigen Änderungen abweichen. Die Algorithmen-Beschreibungen bleiben konzeptionell gültig.*

## Hauptfunktionen

Die Ruhestand-Suite kombiniert folgende Funktionen:

1. **Vollständige deutsche Kapitalertragssteuer** (Abgeltungssteuer, Soli, KiSt, Teilfreistellung, SPB, steueroptimierte Verkaufsreihenfolge)
2. **Dynamische Guardrails** mit 7-stufiger Marktregime-Erkennung
3. **Pflegefall-Modellierung** (PG1-5, Progression, Dual-Care)
4. **Multi-Profil-Unterstützung** für Paare mit getrennten Depots und **Witwenrente**
5. **Tranchen-Management** mit FIFO-Steueroptimierung und Online-Kursaktualisierung
6. **Balance-App** für operative Jahresplanung mit Online-Datenabruf
7. **Simulator** mit Monte-Carlo, historischem Backtest, Parameter-Sweeps und 4-stufiger Auto-Optimierung
8. **Historische Daten ab 1925** mit Stress-Szenarien (Große Depression, WWII)
9. **Optionale Ansparphase** für vollständige Lebenszyklus-Modellierung
10. **Rentensystem** für 1-2 Personen mit verschiedenen Indexierungsarten
11. **Portable Desktop-App** via Tauri für Windows, macOS und Linux
12. **Ausgaben-Check** zur Kontrolle monatlicher Ausgaben gegen das Budget mit CSV-Import, Hochrechnung und Ampel-Visualisierung

## Bekannte Einschränkungen

- Kein Stationary Bootstrap (nur Block-Bootstrap)
- Keine expliziten Fat Tails im Return-Modell
- Keine Verlustverrechnung
- Index-Variante (`msci_eur`) siehe Abschnitt C.3.3

## Anlagephilosophie und Eignung

Die Suite basiert auf einer spezifischen Anlagephilosophie und ist für Nutzer konzipiert, die diesem Ansatz folgen:

### Vorausgesetztes Anlagemodell

| Asset-Klasse | Umsetzung | Rolle im Portfolio |
|--------------|-----------|-------------------|
| **Liquidität** | Geldmarkt-ETF (z.B. €STR-basiert) | Laufende Entnahmen, Notreserve, Runway-Puffer |
| **Aktien** | Breit gestreuter Welt-ETF (z.B. Vanguard FTSE All-World, MSCI World) | Langfristiger Vermögensaufbau und -erhalt |
| **Gold** | Physisch oder ETC | Krisenabsicherung, Rebalancing-Quelle in Bärenmärkten |

### Kernprinzipien

1. **Passive, breit diversifizierte Aktienanlage:** Die Suite geht von einem einzelnen, global gestreuten Aktien-ETF aus – keine Einzelaktien, keine Sektorwetten, keine aktive Titelauswahl.

2. **Liquiditätsmanagement über Geldmarkt-ETF:** Statt klassischem Tagesgeld bei Banken wird Liquidität in Geldmarkt-ETFs gehalten, die täglich handelbar sind und aktuell marktnahe Zinsen bieten.

3. **Gold als antizyklischer Puffer:** Gold dient nicht primär der Rendite, sondern als Stabilitätsanker. In Bärenmärkten, wenn Aktien fallen, kann Gold zur Liquiditätsbeschaffung verkauft werden, ohne Aktien zu ungünstigen Kursen liquidieren zu müssen.

4. **Regelbasierte Entnahme:** Guardrails und Marktregime-Erkennung steuern die Entnahmen automatisch – keine diskretionären Timing-Entscheidungen.

### Für wen die Suite geeignet ist

✅ Passiv-Investoren mit Buy-and-Hold-Strategie
✅ Nutzer von Welt-ETFs (MSCI World, FTSE All-World, ACWI)
✅ Anleger, die Geldmarkt-ETFs als Liquiditätsinstrument nutzen
✅ Investoren mit optionaler Gold-Beimischung zur Diversifikation
✅ Ruheständler, die regelbasierte Entnahmestrategien bevorzugen

### Für wen die Suite nicht geeignet ist

❌ **Einzelaktien-Investoren:** Keine Unterstützung für Stock-Picking oder Dividendenstrategien mit Einzeltiteln
❌ **Anleihen-Portfolios:** Keine Modellierung von Staatsanleihen, Unternehmensanleihen oder Rentenfonds (außer Geldmarkt)
❌ **Immobilien-Investoren:** Keine Integration von Mieteinnahmen oder Immobilienwerten
❌ **Krypto-Anleger:** Keine Unterstützung für Bitcoin, Ethereum oder andere Kryptowährungen
❌ **Aktive Trader:** Keine Unterstützung für Market-Timing, Optionen oder gehebelte Produkte
❌ **Multi-Asset-Strategien:** Keine Modellierung komplexer Portfolios mit vielen Asset-Klassen

### Warum diese Einschränkung?

Die Fokussierung auf ein einfaches, aber robustes Anlagemodell ermöglicht:

- **Präzise Steuerberechnung:** Die deutsche Kapitalertragssteuer wird exakt für ETFs mit Teilfreistellung modelliert
- **Zuverlässige historische Simulation:** Die Monte-Carlo-Daten basieren auf MSCI-World-ähnlichen Renditereihen
- **Klare Entscheidungslogik:** Guardrails und Rebalancing-Regeln sind auf das Drei-Säulen-Modell (Aktien-ETF, Geldmarkt, Gold) abgestimmt
- **Geringere Komplexität:** Weniger Stellschrauben bedeuten weniger Fehlkonfiguration

*Wer einem anderen Anlagemodell folgt, sollte prüfen, ob die Annahmen der Suite auf das eigene Portfolio übertragbar sind.*

## Geltungsbereich und Abgrenzung

- **Monte-Carlo vs. Backtest:** Die MC-Datenbasis reicht bis 1925 zurück; der deterministische Backtest nutzt ein engeres historisches Fenster (siehe Abschnitt C.8).
- **Single vs. Haushalt:** Das Dokument beschreibt sowohl Einzelprofil- als auch Profilverbund-Flows. Aussagen zur Zielgruppe und zu Workflows gelten für beide Modi.
- **Codebezug:** Codezeilen-/LOC-Angaben dienen der Orientierung und sind nicht normativ. Bei Abweichungen gilt immer der aktuelle Code im Repository.
- **Abgrenzung zu `TECHNICAL.md`:** `TECHNICAL.md` dient als kompakte Betriebs- und Entwicklerreferenz. Dieses Dokument enthält die vertiefte fachliche Herleitung, Designentscheidungen und Vergleichskapitel.

## Release-Checkliste (Dokumentpflege)

Vor jedem Release oder größeren Merge diese Punkte aktualisieren:

1. **Metadaten aktualisieren:** `Version`, `Stand`, `Zuletzt validiert`.
2. **Bestandszahlen prüfen:** Modulanzahlen, Testdateien, LOC-Schätzwerte, Build-Hinweise.
3. **Codeverweise verifizieren:** Dateinamen, Funktionsnamen und Modulzuordnungen (insb. bei Refactorings).
4. **Zeitfenster prüfen:** Historische Datenräume in MC/Backtest auf Konsistenz prüfen und klar abgrenzen.
5. **Feature-Delta nachziehen:** Neue Features in `Hauptfunktionen`, Architekturabschnitten und Appendix ergänzen.
6. **Quellenabschnitte aktualisieren:** Externe Vergleiche/Forschung mit Stand und ggf. Versionshinweis versehen.
7. **Smoke-Review durchführen:** Dokument auf doppelte/obsolete Aussagen und widersprüchliche Zahlen durchsuchen.

---

# Technische Architektur

## B.1 Drei-Schichten-Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    PRÄSENTATIONSSCHICHT                     │
├──────────────────────────┬──────────────────────────────────┤
│      Balance-App         │           Simulator              │
│  ┌─────────────────────┐ │  ┌────────────────────────────┐  │
│  │ balance-main.js     │ │  │ simulator-main.js          │  │
│  │ balance-reader.js   │ │  │ simulator-portfolio.js     │  │
│  │ balance-renderer.js │ │  │ simulator-monte-carlo.js   │  │
│  │ balance-binder.js   │ │  │ simulator-sweep.js         │  │
│  │ balance-storage.js  │ │  │ simulator-results.js       │  │
│  └─────────────────────┘ │  └────────────────────────────┘  │
├──────────────────────────┴──────────────────────────────────┤
│                      LOGIKSCHICHT                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    engine.js (Bundle)                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐ │ │
│  │  │ InputValid. │→ │MarketAnalyz.│→ │SpendingPlanner │ │ │
│  │  └─────────────┘  └─────────────┘  └────────────────┘ │ │
│  │                          ↓                             │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │           TransactionEngine                      │  │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │ │
│  │  │  │liquidity │ │ sale-    │ │ gold-rebalance   │ │  │ │
│  │  │  │-planner  │ │ engine   │ │                  │ │  │ │
│  │  │  └──────────┘ └──────────┘ └──────────────────┘ │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   PARALLELISIERUNG                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                 Worker Pool (8 Worker)                 │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│  │  │mc-worker │ │mc-worker │ │mc-worker │ │mc-worker │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## B.1.1 Tauri Desktop-App (Portable EXE)

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

Die Suite wird als **native Desktop-App** für alle Plattformen ausgeliefert (siehe auch B.1.2 für Details zu macOS/Linux):

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
  "identifier": "de.ruhestandsuite.app",
  "build": {
    "frontendDist": "../dist"
  },
  "app": {
    "windows": [{
      "title": "Ruhestand Suite",
      "width": 1400,
      "height": 900,
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

### Build-Prozess

```bash
# Development-Modus (Hot-Reload)
npm run tauri:dev

# Production-Build (für aktuelle Plattform)
npm run tauri:build
```

**Output je nach Plattform:**
- **Windows:** `src-tauri/target/release/RuhestandSuite.exe`
- **macOS:** `src-tauri/target/release/bundle/macos/RuhestandSuite.app`
- **Linux:** `src-tauri/target/release/bundle/appimage/RuhestandSuite.AppImage`

*Für detaillierte Build-Anleitungen aller Plattformen siehe Abschnitt B.1.2.*

### Technische Details

- **Rust-Version:** 1.70+ (für Tauri 2.0)
- **WebView:** Microsoft Edge WebView2 (Windows), WebKit (macOS/Linux)
- **Permissions:** Nur `fs` (Dateizugriff für Snapshots), keine Netzwerk-Permissions
- **Signierung:** Unsigned (Community-Build), kann mit eigenem Zertifikat signiert werden

---

## B.1.2 Plattformunabhängigkeit

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
npm run tauri:build
# Output: src-tauri/target/release/RuhestandSuite.exe (~8 MB)
```

**macOS:**
```bash
npm run tauri:build
# Output: src-tauri/target/release/bundle/macos/RuhestandSuite.app
# Optional: .dmg Installer
```

**Linux:**
```bash
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

| Speicherort | Windows | macOS | Linux |
|-------------|---------|-------|-------|
| **localStorage** | `%APPDATA%/.../LocalStorage` | `~/Library/WebKit/LocalStorage` | `~/.local/share/.../LocalStorage` |
| **Snapshots (Tauri)** | Fenstergröße/Position | Native Dateisystem-Dialoge | XDG-Verzeichnisse |
| **Snapshots (Browser)** | Download-Ordner | Download-Ordner | Download-Ordner |

**Daten-Migration zwischen Plattformen:**
1. Export via "Snapshot erstellen" → JSON-Datei
2. Auf Zielplattform: Import via "Snapshot laden"
3. Alternativ: `localStorage`-Keys manuell über DevTools kopieren

---

## B.2 Balance-App: Detaillierte Modul-Analyse

### B.2.1 Hauptmodule

*LOC-/Zeilenangaben sind stichtagsbezogen (validiert am 2026-02-06).*

| Modul | LOC | Verantwortung | Evidenz |
|-------|-----|---------------|---------|
| `balance-main.js` | 409 | Orchestrierung, Init, Update-Zyklus | `update()` |
| `balance-reader.js` | 278 | DOM-Input-Lesung, Tranchen-Aggregation | `readAllInputs()` |
| `balance-renderer.js` | 156 | Render-Facade, delegiert an Sub-Renderer | `render()` |
| `balance-binder.js` | 244 | Event-Handler, Keyboard-Shortcuts | `bindUI()` |
| `balance-storage.js` | 399 | localStorage, File System API, Snapshots | `createSnapshot()` |

### B.2.2 Update-Zyklus (vereinfachter Pseudocode)

*Hinweis: Der folgende Ablauf ist bewusst vereinfacht und beschreibt die Kernschritte, nicht den exakten Codepfad jeder Hilfsfunktion.*

```javascript
function update() {
    // 1. Read Inputs
    profileSyncHandlers.syncProfileDerivedInputs();
    const inputData = UIReader.readAllInputs();

    // 2. Load State (Guardrail-History)
    const persistentState = StorageManager.loadState();
    const shouldResetState = shouldResetGuardrailState(persistentState.inputs, inputData);

    // 3. Profilverbund (Multi-Profil)
    const profilverbundRuns = (profilverbundProfiles.length > 1)
        ? profilverbundHandlers.runProfilverbundProfileSimulations(...)
        : null;

    // 4. Engine Call
    const lastState = shouldResetState ? null : persistentState.lastState;
    const modelResult = window.EngineAPI.simulateSingleYear(inputData, lastState);
    if (profilverbundRuns) {
        modelResult.ui.action = profilverbundHandlers.mergeProfilverbundActions(profilverbundRuns);
    }

    // 5. Render
    UIRenderer.render({...modelResult.ui, input: inputData});
    UIRenderer.renderDiagnosis(appState.diagnosisData);

    // 6. Persist
    StorageManager.saveState({...persistentState, inputs: inputData, lastState: modelResult.newState});
}
```

### B.2.3 Renderer-Architektur

| Sub-Renderer | Datei | Verantwortung |
|--------------|-------|---------------|
| `SummaryRenderer` | `balance-renderer-summary.js` | Mini-Summary, Liquiditätsbalken, Marktstatus |
| `ActionRenderer` | `balance-renderer-action.js` | Aktionsbox mit Quellen/Verwendungen (496 LOC) |
| `DiagnosisRenderer` | `balance-renderer-diagnosis.js` | Chips, Entscheidungsbaum, Guardrails, KeyParams |

### B.2.4 Diagnose-System

```
DiagnosisRenderer
├── buildDiagnosisChips()      → Status-Badges (Alarm, Vorsicht, Normal)
├── buildDecisionTree()        → Schrittweise Engine-Entscheidungen
├── buildGuardrails()          → Schwellenwert-Visualisierung
├── buildTransactionDiagnostics() → Verkaufsreihenfolge, Steuern
└── buildKeyParams()           → Schlüsselkennzahlen-Grid
```

### B.2.5 Storage & Persistenz

| Feature | Implementierung | Evidenz |
|---------|-----------------|---------|
| **localStorage** | Hauptspeicher für State | `balance-storage.js:73-94` |
| **File System API** | Snapshots in Verzeichnis | `balance-storage.js:304-318` |
| **IndexedDB** | Persistente Directory-Handles | `balance-storage.js:34-61` |
| **Migration** | Bereinigung fehlerhafter Werte | `balance-storage.js:108-122` |

### B.2.6 Online-Daten-Abruf (balance-annual-marketdata.js)

| Datenquelle | API | Fallback |
|-------------|-----|----------|
| ETF-Kurse (VWCE.DE) | Yahoo Finance via lokalem Proxy | Finnhub API |
| Inflation | ECB/World Bank/OECD | Manuell |

### B.2.7 Keyboard-Shortcuts

| Shortcut | Funktion | Evidenz |
|----------|----------|---------|
| `Alt+J` | Jahresabschluss | `balance-binder.js:107-110` |
| `Alt+E` | Export | `balance-binder.js:113-116` |
| `Alt+I` | Import | `balance-binder.js:119-122` |
| `Alt+N` | Marktdaten nachrücken | `balance-binder.js:125-128` |

### B.2.8 Profil-Management-System

Die Suite implementiert ein vollständiges **Profil-Management-System** für Multi-Personen-Haushalte.

**Architektur:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Profil-Storage-Layer                      │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ profile-storage │→ │ profile-manager │→ │ profilverbund│ │
│  │     .js         │  │      .js        │  │ -balance.js  │ │
│  │  (CRUD, I/O)    │  │   (UI-Facade)   │  │ (Aggregation)│ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**CRUD-Operationen** (`profile-storage.js`):

| Operation | Funktion | Beschreibung |
|-----------|----------|--------------|
| **Create** | `createProfile(name)` | Erzeugt neues Profil mit Slug-ID |
| **Read** | `getProfileData(id)` | Lädt Profil-Daten aus Registry |
| **Update** | `saveCurrentProfileFromLocalStorage()` | Speichert aktuellen State |
| **Delete** | `deleteProfile(id)` | Löscht Profil (außer letztes) |
| **Switch** | `switchProfile(id)` | Wechselt aktives Profil |
| **Export** | `exportProfilesBundle()` | JSON-Backup aller Profile |
| **Import** | `importProfilesBundle(bundle)` | Restore aus Backup |

**Profilbezogene Keys** (automatisch isoliert pro Profil):
```javascript
const FIXED_KEYS = new Set([
    'depot_tranchen',           // Tranchen-Daten
    'profile_tagesgeld',        // Cash-Bestände
    'profile_rente_aktiv',      // Renten-Flags
    'profile_rente_monatlich',  // Renten-Beträge
    'profile_gold_aktiv',       // Gold-Konfiguration
    // ... weitere profilspezifische Keys
]);
```

**Profilverbund-Aggregation** (`profilverbund-balance.js`):

Das System aggregiert mehrere Profile zu einem Gesamt-Haushalt:

```javascript
export function aggregateProfilverbundInputs(profileInputs) {
    // Summiert: Floor, Flex, Renten, Depot-Werte
    // Minimiert: Runway-Targets (konservativstes Profil)
    return {
        totalFloor,      // Summe aller Floor-Bedarfe
        totalFlex,       // Summe aller Flex-Bedarfe
        totalRenteJahr,  // Summe aller Renteneinkünfte
        totalAssets,     // Summe aller Vermögenswerte
        netWithdrawal    // Bedarf minus Renten
    };
}
```

**Entnahme-Verteilungsmodi:**

| Modus | Algorithmus | Anwendungsfall |
|-------|-------------|----------------|
| `tax_optimized` | Greedy nach niedrigster Steuerlast | Standard für Steueroptimierung |
| `proportional` | Anteilig nach Vermögen | Gleichmäßige Belastung |
| `runway_first` | Nach Runway-Zielen gewichtet | Liquiditäts-Priorisierung |

---

### B.2.9 Depot-Tranchen-Verwaltung

Die Suite ermöglicht **detailliertes Tranchen-Management** mit FIFO-basierter Steueroptimierung.

**Hauptkomponenten:**

| Datei | LOC | Funktion |
|-------|-----|----------|
| `depot-tranchen-manager.html` | ~400 | Standalone-UI für Tranchenverwaltung |
| `depot-tranchen-status.js` | 432 | Status-Berechnung, Aggregation, UI-Sync |
| `tranche-config-example.js` | ~100 | Beispiel-Konfiguration |

**Tranchen-Datenmodell:**

```javascript
const tranche = {
    id: "uuid",
    name: "VWCE.DE Sparplan Jan 2020",
    type: "aktien_neu",        // oder: aktien_alt, gold, geldmarkt
    category: "equity",        // oder: gold, money_market
    shares: 50,                // Anzahl Anteile
    purchasePrice: 85.00,      // Kaufpreis pro Anteil
    currentPrice: 120.00,      // Aktueller Kurs
    purchaseDate: "2020-01-15",
    marketValue: 6000,         // Marktwert (berechnet oder manuell)
    costBasis: 4250,           // Einstand (berechnet oder manuell)
    tqf: 0.30                  // Teilfreistellung (30% für Aktienfonds)
};
```

**Aggregations-Algorithmus** (`depot-tranchen-status.js:244-310`):

```javascript
export function calculateAggregatedValues(tranches) {
    // Gruppiert nach Kategorie
    let altbestand = { marketValue: 0, costBasis: 0 };
    let neubestand = { marketValue: 0, costBasis: 0 };
    let geldmarkt  = { marketValue: 0, costBasis: 0 };
    let gold       = { marketValue: 0, costBasis: 0 };

    tranches.forEach(t => {
        // Klassifizierung nach type/category/tqf
        if (type === 'aktien_alt' || tqf === 1.0) {
            altbestand.marketValue += mv;
        } else if (type === 'aktien_neu') {
            neubestand.marketValue += mv;
        }
        // ... weitere Kategorien
    });

    return { depotwertAlt, depotwertNeu, geldmarktEtf, goldWert, ... };
}
```

**Online-Aktualisierung der Kurse:**

Die Tranchen-Kurse können über verschiedene Quellen aktualisiert werden:

| Quelle | API | Unterstützte Assets |
|--------|-----|---------------------|
| Yahoo Finance | Lokaler Proxy (`tools/yahoo-proxy.cjs`) | ETFs, Aktien |
| Finnhub | Direkt | ETFs, Aktien (Fallback) |
| Manuell | Eingabefeld | Alle |

**Automatische Synchronisation:**

```javascript
export function initTranchenStatus(containerId) {
    // Initial rendern
    renderTranchenStatusBadge(containerId);
    syncTranchenToInputs({ silent: true });

    // Cross-Tab-Sync via localStorage-Event
    window.addEventListener('storage', (e) => {
        if (e.key === 'depot_tranchen') {
            syncTranchenToInputs({ silent: true });
        }
    });

    // Periodische Aktualisierung (alle 5 Sekunden)
    setInterval(() => renderTranchenStatusBadge(containerId), 5000);
}
```

**Steueroptimierte Verkaufsreihenfolge** (`profilverbund-balance.js:334-373`):

```javascript
export function selectTranchesForSale(tranches, targetAmount, taxRate) {
    const candidates = tranches
        .filter(t => resolveTrancheCategory(t) === 'equity')
        .map(t => ({
            tranche: t,
            taxPerEuro: computeProfitRatio(t) * taxRate,
            purchaseStamp: normalizeTrancheDate(t)
        }));

    // Sortierung: 1. Niedrigste Steuerlast, 2. FIFO (älteste zuerst)
    candidates.sort((a, b) => {
        if (a.taxPerEuro !== b.taxPerEuro) return a.taxPerEuro - b.taxPerEuro;
        return a.purchaseStamp - b.purchaseStamp;
    });

    // Greedy-Auswahl bis Zielbetrag erreicht
    // ...
}
```

---

### B.2.10 Ausgaben-Check (balance-expenses.js)

Das **Ausgaben-Check-Modul** ermöglicht die Kontrolle tatsächlicher monatlicher Ausgaben gegen das geplante Budget. Es schlägt die Brücke zwischen der jährlichen Entnahmeplanung und dem realen Cashflow-Management.

**Architektur:**

```
┌─────────────────────────────────────────────────────────────┐
│                    Ausgaben-Check                            │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────┐ │
│  │ CSV-Import      │→ │ Kategorien-     │→ │ Budget-     │ │
│  │ (Kontoauszüge)  │  │ Aggregation     │  │ Vergleich   │ │
│  └─────────────────┘  └─────────────────┘  └─────────────┘ │
│           ↓                    ↓                    ↓       │
│  ┌─────────────────────────────────────────────────────┐   │
│  │                   Visualisierung                      │   │
│  │  • Jahres-Summary (4 Cards)                          │   │
│  │  • Monats-Tabelle (12 Zeilen × Profile)              │   │
│  │  • Ampel-Farbcodierung (OK/Warnung/Überschritten)    │   │
│  │  • Detail-Dialog (Top-3 + alle Kategorien)           │   │
│  └─────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
```

**Hauptfunktionen:**

| Funktion | Beschreibung | Evidenz |
|----------|--------------|---------|
| `initExpensesTab()` | Initialisierung, Event-Binding, Jahresauswahl | `balance-expenses.js:625-633` |
| `parseCategoryCsv()` | CSV-Parser mit flexiblem Delimiter (`;`, `\t`, `,`) | `balance-expenses.js:175-206` |
| `computeYearStats()` | Berechnet Jahres- und YTD-Statistiken | `balance-expenses.js:291-330` |
| `updateSummary()` | Aktualisiert die 4 Summary-Cards | `balance-expenses.js:219-289` |
| `openDetails()` | Öffnet Detail-Dialog mit Top-3 Kategorien | `balance-expenses.js:483-550` |

**Datenmodell:**

```javascript
const store = {
    version: 1,
    activeYear: 2026,
    years: {
        "2026": {
            months: {
                "1": {  // Januar
                    profiles: {
                        "profil-1": {
                            categories: {
                                "Lebensmittel": 450.00,
                                "Mobilität": 180.00,
                                "Freizeit": 320.00,
                                // ...
                            },
                            updatedAt: "2026-01-31T12:00:00.000Z"
                        }
                    }
                }
            }
        }
    }
};
```

**CSV-Import-Algorithmus:**

```javascript
function parseCategoryCsv(text) {
    // 1. Delimiter erkennen (häufigstes Zeichen: ; | \t | ,)
    const delimiter = detectDelimiter(lines[0]);

    // 2. Header parsen (sucht "Kategorie" und "Betrag")
    const header = splitCsvLine(lines[0], delimiter);
    let categoryIndex = header.findIndex(h => h.includes('kategorie'));
    let amountIndex = header.findIndex(h => h.includes('betrag'));

    // 3. Kategorien aggregieren
    const categories = {};
    for (let i = 1; i < lines.length; i++) {
        const category = row[categoryIndex];
        const amount = parseAmount(row[amountIndex]);  // DE/US-Format
        categories[category] = (categories[category] || 0) + amount;
    }

    return categories;
}
```

**Hochrechnung-Algorithmus (Median-basiert):**

```javascript
function computeYearStats(currentMonth) {
    // Ab 2 Monaten: Median statt Durchschnitt (robust gegen Ausreißer)
    const forecastBase = monthsWithData >= 2 ? medianMonthly : avgMonthly;
    const annualForecast = forecastBase * 12;

    return {
        annualForecast,         // Hochrechnung aufs Jahr
        ytdUsed,                // Verbrauch in Importmonaten
        ytdBudget,              // Soll-Budget für Importmonate
        ytdDelta                // Abweichung vom Soll
    };
}
```

**Ampel-Farbcodierung:**

| Status | Kriterium | CSS-Klasse |
|--------|-----------|------------|
| ✅ Grün | Ausgaben ≤ Budget | `budget-ok` |
| ⚠️ Gelb | Budget < Ausgaben ≤ 105% | `budget-warn` |
| 🔴 Rot | Ausgaben > 105% Budget | `budget-bad` |

**Integration mit Profilverbund:**

Das Modul arbeitet mit dem Profilverbund zusammen:
- Jedes Profil hat eine eigene Spalte in der Monats-Tabelle
- CSV-Import erfolgt pro Profil und Monat
- Die "Gesamt"-Spalte aggregiert alle Profile

**Jahresabschluss-Integration:**

```javascript
export function rollExpensesYear() {
    const nextYear = state.year + 1;
    setYear(nextYear);  // Wechselt zum nächsten Jahr
    return nextYear;
}
```

Wird automatisch vom Jahresabschluss-Handler (`balance-binder-snapshots.js`) aufgerufen.

**Persistenz:**

| Aspekt | Implementierung |
|--------|-----------------|
| Storage-Key | `balance_expenses_v1` |
| Format | JSON mit Versions-Header |
| Scope | Alle Jahre, alle Profile |
| Größe | Typisch 5-20 KB pro Jahr |

---

## B.3 Engine: Detaillierte Modul-Analyse

### B.3.1 Modulstruktur

```
engine/
├── core.mjs              (311 LOC) → Orchestrierung, EngineAPI
├── config.mjs            (274 LOC) → Zentrale Konfiguration (erweitert)
├── errors.mjs            (~50 LOC) → Fehlerklassen
├── validators/
│   └── InputValidator.mjs (140 LOC) → Input-Validierung
├── analyzers/
│   └── MarketAnalyzer.mjs (160 LOC) → Marktregime-Klassifikation
├── planners/
│   └── SpendingPlanner.mjs (1076 LOC) → Guardrails, Flex-Rate, Budget-System (erweitert!)
└── transactions/
    ├── TransactionEngine.mjs (47 LOC) → Facade
    ├── transaction-action.mjs (456 LOC) → Transaktions-Entscheidungslogik
    ├── transaction-opportunistic.mjs (323 LOC) → Opportunistisches Rebalancing
    ├── transaction-surplus.mjs (149 LOC) → Überschuss-Handling
    ├── transaction-utils.mjs (237 LOC) → Transaktions-Hilfsfunktionen
    ├── sale-engine.mjs      (333 LOC) → Verkäufe, Steuern
    └── liquidity-planner.mjs (~150 LOC) → Liquiditäts-Targeting
```

### B.3.2 Engine-Datenfluss (core.mjs:32-228)

```javascript
function _internal_calculateModel(input, lastState) {
    // 1. Validierung
    const validationResult = InputValidator.validate(input);
    if (!validationResult.valid) return { error: new ValidationError(...) };

    // 2. Grundwerte berechnen
    const aktuelleLiquiditaet = input.tagesgeld + input.geldmarktEtf;
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu +
        (input.goldAktiv ? input.goldWert : 0);

    // 3. Marktanalyse
    const market = MarketAnalyzer.analyzeMarket(input);

    // 4. Ausgabenplanung mit Guardrails
    const { spendingResult, newState, diagnosis } = SpendingPlanner.determineSpending({
        market, lastState, inflatedBedarf, runwayMonate, profil, depotwertGesamt, gesamtwert, renteJahr, input
    });

    // 5. Ziel-Liquidität
    const zielLiquiditaet = TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf, input);

    // 6. Transaktions-Bestimmung
    const action = TransactionEngine.determineAction({
        aktuelleLiquiditaet, depotwertGesamt, zielLiquiditaet, market, spending: spendingResult, minGold, profil, input
    });

    return { input, newState, diagnosis, ui: resultForUI };
}
```

### B.3.3 MarketAnalyzer: 7 Szenarien (MarketAnalyzer.mjs:59-152)

| Szenario | Kriterium | Code-Zeile |
|----------|-----------|------------|
| `peak_hot` | ATH erreicht UND 1-Jahres-Performance ≥ 10% | 83 |
| `peak_stable` | ATH erreicht UND 1-Jahres-Performance < 10% | 83 |
| `bear_deep` | ATH-Abstand > 20% | 88 |
| `recovery` | ATH-Abstand > 10% UND 1Y-Perf > 10% UND Monate > 6 | 92 |
| `corr_young` | ATH-Abstand ≤ 15% UND Monate ≤ 6 | 94 |
| `side_long` | Alles andere (Seitwärtsmarkt) | 100 |
| `recovery_in_bear` | Bear/Recovery + (1Y-Perf ≥ 15% ODER Rally ≥ 30%) | 112-118 |

**Zusätzlich:**
- **Stagflation-Erkennung:** Inflation ≥ 4% UND Real-Rendite < 0 (Zeile 122-128)
- **CAPE-Bewertung:** 4 Stufen (günstig/fair/teuer/sehr teuer) mit erwarteten Renditen (Zeile 28-51)

### B.3.4 SpendingPlanner: Guardrail-System (erweitert)

**Hinweis:** Der SpendingPlanner wurde signifikant erweitert (659 → 1076 LOC) mit neuen Algorithmen.

**Alarm-Aktivierung** (SpendingPlanner.mjs:326-341):
```javascript
// Nur im bear_deep aktivieren
const shouldActivateAlarm =
    scenario === 'bear_deep' &&
    ((entnahmequoteDepot > ALARM.withdrawalRate && runwayMonths < 24) ||
     realDrawdown > ALARM.realDrawdown);
```

**Flex-Rate-Glättung** (SpendingPlanner.mjs:389-440):
```javascript
const ALPHA = 0.35;  // Glättungsfaktor
const maxUp = isRecoveryOrPeak ? 4.5 : 2.5;    // pp/Jahr
const maxDown = isBearDeep ? 6.0 : 3.5;        // pp/Jahr (geändert: 10.0 → 6.0, sanfter)

smoothedFlexRate = ALPHA * newRate + (1 - ALPHA) * oldRate;
smoothedFlexRate = clamp(smoothedFlexRate, oldRate - maxDown, oldRate + maxUp);
```

### B.3.5 SpendingPlanner: Neue Algorithmen (Januar 2026)

**1. Wealth-Adjusted Reduction** (config.mjs:106-111):
```javascript
WEALTH_ADJUSTED_REDUCTION: {
    SAFE_WITHDRAWAL_RATE: 0.015,   // Unter 1.5%: keine marktbedingte Reduktion
    FULL_WITHDRAWAL_RATE: 0.035   // Ab 3.5%: volle Reduktion
}
```
*Funktion:* Bei niedriger Entnahmequote (<1.5%) werden Markt-Regime-Kürzungen gedämpft (Smoothstep-Interpolation).

**2. Flex-Budget-System** (config.mjs:112-132):
```javascript
FLEX_BUDGET: {
    ENABLED: true,
    DEFAULT_MAX_YEARS: 5,              // 5-Jahres-"Topf"
    DEFAULT_RECHARGE_FRACTION: 0.7,    // 70% Recharge in guten Zeiten
    ACTIVE_REGIMES: ['bear_deep', 'recovery_in_bear'],
    REGIME_WEIGHTS: { bear_deep: 1.0, recovery_in_bear: 0.5 },
    MIN_RATE_BASE_PCT: { bear_deep: 5, recovery_in_bear: 5 },
    MIN_RATE_FLOOR_SLOPE_PCT: { bear_deep: 60, recovery_in_bear: 60 }
}
```
*Funktion:* Zeit-basierter "Topf" begrenzt kumulative Kürzungen über 5 Jahre, verhindert Überreaktion bei langen Bärenmärkten.

**3. Flex-Share S-Curve** (config.mjs:133-138):
```javascript
FLEX_SHARE_S_CURVE: {
    ENABLED: true,
    K: 0.8,    // Cap-Stärke (0..1)
    A: 14.0,   // Steilheit der S-Kurve
    B: 0.52    // Knickpunkt (Flex-Anteil 0..1)
}
```
*Funktion:* Sigmoid-basierte Dämpfung bei hohem Flex-Anteil. Verhindert extreme Kürzungen wenn Flex > 50% des Gesamtbedarfs ausmacht.

**4. Hard Caps für Flex-Rate** (config.mjs:139-150):
```javascript
FLEX_RATE_HARD_CAPS: {
    BEAR_DEEP_MAX_RATE: 70,           // Max. Flex-Rate im tiefen Bärenmarkt
    FLEX_SHARE_RELIEF_MAX_PP: 15,     // Entlastung bei geringem Flex-Anteil
    RUNWAY_COVERAGE_CAPS: [
        { maxCoverage: 1.20, maxRate: 70 },  // <120% Runway → max 70%
        { maxCoverage: 1.05, maxRate: 60 },  // <105% Runway → max 60%
        { maxCoverage: 0.90, maxRate: 50 }   // <90% Runway  → max 50%
    ]
}
```
*Funktion:* Harte Obergrenzen basierend auf Runway-Deckung. Verhindert zu aggressive Ausgaben bei kritischer Liquidität.

**5. Final Rate Limits** (config.mjs:151-157):
```javascript
FLEX_RATE_FINAL_LIMITS: {
    MAX_UP_PP: 12.0,               // Max. Anstieg nach allen Caps
    MAX_DOWN_PP: 12.0,             // Max. Rückgang nach allen Caps
    MAX_DOWN_IN_BEAR_PP: 10.0,     // Sanfterer Abbau im Bärenmarkt
    RELAX_MAX_DOWN_PP: 20.0        // Max. Relaxierung bei hohem Vermögen
}
```
*Funktion:* Post-Guardrail Rate-Limitierung als letzte Sicherheitsstufe.

---

## B.4 Test-Suite (erweitert Januar 2026)

**Übersicht:** Die Test-Suite wurde signifikant erweitert von 21 auf **47 Testdateien** mit **800+ Assertions**.

### B.4.1 Test-Inventar

| Kategorie | Dateien | LOC | Fokus |
|-----------|---------|-----|-------|
| **Engine Core** | `core-engine.test.mjs`, `engine-robustness.test.mjs` | ~390 | Engine-Orchestrierung, Edge Cases |
| **Transaktionen** | `transaction-*.test.mjs` (5) | ~755 | Verkäufe, ATH, Rebal, Gold, Quantisierung |
| **Steuern** | `transaction-tax.test.mjs` | ~150 | Steuerberechnung |
| **Worker** | `worker-parity.test.mjs`, `worker-pool.test.mjs` | ~820 | Determinismus, Pool-Lifecycle |
| **Spending** | `spending-*.test.mjs` (2) | ~280 | Guardrails, Quantisierung |
| **Monte-Carlo** | `simulator-monte-carlo.test.mjs`, `monte-carlo-*.test.mjs` (2) | ~760 | MC-Kern, Sampling, Startjahr |
| **Pflegefall** | `care-meta.test.mjs` | ~200 | Pflegegrad-Modell |
| **Profilverbund** | `profilverbund-*.test.mjs` (3), `profile-storage.test.mjs` | ~1000 | Multi-Profil, Storage |
| **Balance-App** | `balance-*.test.mjs` (10) | ~2300 | Smoke, Reader, Storage, Diagnosis, Annual |
| **Simulator** | `simulator-*.test.mjs` (4) | ~1000 | Sweep, Backtest, Heatmap, Multi-Profile |
| **Scenarios** | `scenarios.test.mjs`, `scenario-analyzer.test.mjs` | ~245 | Komplexe Lebenspfade |
| **Utilities** | `utils.test.mjs`, `formatting.test.mjs`, `feature-flags.test.mjs` | ~280 | Hilfsfunktionen |

### B.4.2 Neue Test-Kategorien (seit Januar 2026)

| Testdatei | LOC | Neue Abdeckung |
|-----------|-----|----------------|
| `profile-storage.test.mjs` | 540 | Profil-Registry CRUD, Import/Export |
| `simulator-monte-carlo.test.mjs` | 460 | Heatmap Merge, Buffer-Strukturen, Perzentile |
| `simulator-sweep.test.mjs` | 470 | Parameter-Sweep, Whitelist/Blocklist |
| `worker-pool.test.mjs` | 670 | Worker-Lifecycle, Queue, Telemetrie |
| `auto-optimizer.test.mjs` | 500 | LHS, Nachbarschaft, Constraints, Cache |
| `balance-reader.test.mjs` | 640 | DOM-Lesen, Profile-Overrides, Gold-Defaults |
| `balance-storage.test.mjs` | 490 | localStorage, Migrations, Snapshots |

### B.4.3 Worker-Parity-Test

Validiert Determinismus zwischen Main-Thread und Worker:
```javascript
// Gleicher Seed → Gleiche Ergebnisse
const mainResult = runSimulation({ seed: 12345, runs: 100 });
const workerResult = await runInWorker({ seed: 12345, runs: 100 });
assertEqual(mainResult.successRate, workerResult.successRate);
```

### B.4.4 Test-Prioritäten

| Priorität | Kategorie | Kritikalität |
|-----------|-----------|--------------|
| 1 | Finanz-Kern (Spending, Tax, Liquidity) | ⚠️ Kritisch |
| 2 | Algorithmen (MC, Market, Care) | ⚠️ Hoch |
| 3 | Transaktions-Details | Mittel |
| 4 | UI & Persistenz | Mittel |
| 5 | Integration & Parity | Mittel |
| 6 | Utilities & Sweep | Niedrig |

---

# Fachliche Algorithmen

## C.1 Floor-Flex-Guardrail-System

### C.1.1 Grundkonzept

Das Floor-Flex-Modell trennt den Bedarf in zwei Komponenten:

| Komponente | Beschreibung | Beispiel |
|------------|--------------|----------|
| **Floor** | Nicht verhandelbarer Grundbedarf | Miete, Versicherungen, Lebensmittel |
| **Flex** | Optionaler Zusatzbedarf | Reisen, Hobbys, Luxus |

**Implementierung** (SpendingPlanner.mjs:85-120):
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

**Entnahmequoten-Anpassung** (SpendingPlanner.mjs:240-280):
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

**Exponentieller Glättung** (config.mjs:101-107):
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

**ATH-Gap-basierte Kürzung** (config.mjs:147-163):
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

**Eskalations-Logik** (SpendingPlanner.mjs:326-341):
```javascript
function shouldActivateAlarm(context) {
    if (context.scenario !== 'bear_deep') return false;

    const quoteCritical = context.withdrawalRate > 0.055;  // >5.5%
    const runwayCritical = context.runwayMonths < 24;      // <2 Jahre
    const drawdownCritical = context.realDrawdown > 0.25;  // >25%

    return (quoteCritical && runwayCritical) || drawdownCritical;
}
```

**Deeskalations-Logik** (SpendingPlanner.mjs:260-322):
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

---

## C.2 Steuer-Engine

### C.2.1 Implementierte Steuerarten

| Steuerart | Satz | Implementierung |
|-----------|------|-----------------|
| **Abgeltungssteuer** | 25% | `sale-engine.mjs:6` |
| **Solidaritätszuschlag** | 5.5% auf KESt | `sale-engine.mjs:6` |
| **Kirchensteuer** | 8-9% auf KESt | `input.kirchensteuerSatz` |
| **Teilfreistellung** | 30% für Aktienfonds | `tranche.tqf` |
| **Sparer-Pauschbetrag** | 1.000€ (Single) / 2.000€ (Paar) | `input.sparerPauschbetrag` |

### C.2.2 Steuerberechnung pro Tranche

**Vollständiger Algorithmus** (sale-engine.mjs:54-116):
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

**Sortieralgorithmus** (sale-engine.mjs:227-255):
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

---

## C.3 Monte-Carlo-Methodik

### C.3.1 Sampling-Strategien

**Strategie 1: Zufälliges Jahr (UNIFORM)** (monte-carlo-runner.js:190)
```javascript
startYearIndex = Math.floor(rand() * annualData.length);
```

**Strategie 2: CAPE-Sampling** (monte-carlo-runner.js:177-191)
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

**Strategie 4: Regime-basiert** (simulator-data.js:294-320)
```javascript
REGIME_TRANSITIONS = {
    BULL: { BULL: 0.65, BEAR: 0.10, SIDEWAYS: 0.20, STAGFLATION: 0.05 },
    BEAR: { BULL: 0.20, BEAR: 0.40, SIDEWAYS: 0.30, STAGFLATION: 0.10 },
    // ...
};
```

### C.3.1a Neue Startjahr-Sampling-Modi (Januar 2026)

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

### C.3.2 Stress-Presets

**9 vordefinierte Stress-Szenarien** (simulator-data.js:162-290):

| Preset | Typ | Jahre | Parameter |
|--------|-----|-------|-----------|
| `STAGFLATION_70s` | conditional_bootstrap | 7 | Inflation ≥ 7%, Real-Rendite ≤ -2% |
| `DOUBLE_BEAR_00s` | conditional_bootstrap | 6 | Real-Rendite ≤ -8%, Min-Cluster 2 |
| `GREAT_DEPRESSION_29_33` | conditional_bootstrap | 5 | Jahre 1929-1933 (neu!) |
| `WWII_40s` | conditional_bootstrap | 7 | Jahre 1939-1945 (neu!) |
| `STAGFLATION_SUPER` | hybrid | 8 | 70er + künstlich -3% μ |
| `INFLATION_SPIKE_3Y` | parametric | 3 | μ = -5%, σ × 1.5, Inflation ≥ 7% |
| `FORCED_DRAWDOWN_3Y` | parametric_sequence | 3 | -25%, -20%, -15% |
| `LOST_DECADE_12Y` | parametric | 12 | μ = -6%, Gold capped bei +15% |
| `CORRELATION_CRASH_4Y` | parametric | 4 | Aktien -15%, Gold -5%, Inflation 5% |

**Neue historische Stress-Szenarien (ab 1925):**
- **Great Depression (1929-1933):** Bootstrapped aus den historischen Jahren der Weltwirtschaftskrise. Ermöglicht Tests für extreme Deflation und Vermögensvernichtung.
- **Zweiter Weltkrieg (1939-1945):** Bootstrapped aus der Kriegsperiode mit Kapitalverkehrskontrollen, Inflation und Wirtschaftsumstellung.

### C.3.3 Historische Daten

**Datenbasis** (simulator-data.js:56-132):

| Feld | Quelle | Zeitraum |
|------|--------|----------|
| `msci_eur` | MSCI World EUR (rekonstruiert ab 1925) | 1925-2024 |
| `inflation_de` | Statistisches Bundesamt | 1925-2024 |
| `zinssatz_de` | Bundesbank | 1925-2024 |
| `lohn_de` | Lohnentwicklung DE | 1925-2024 |
| `gold_eur_perf` | Gold in EUR | 1961-2024 |
| `cape` | Shiller CAPE | 1925-2024 |

**Daten-Validierung `msci_eur`:**
*   **Zeitraum 2012–2023:** Die Werte stimmen exakt (auf 2 Nachkommastellen) mit dem **MSCI World Net Total Return EUR** überein.
*   **Zeitraum vor 2000:** Die langfristige CAGR (1978–2024) von ~7.8% liegt unter dem typischen langfristigen Total-Return-Schnitt (~10%).
*   **Diagnose:** Es handelt sich um eine **hybride Datenreihe**. Die jüngere Historie ist präzise (Net Return), während die älteren Daten (insb. die Extrapolationen) konservativ modelliert sind (vermutlich Price Index oder starke Währungseffekte).
*   **Bewertung:** Für die Simulation ist dies **vorteilhaft konservativ**. Die "fehlende Rendite" in der Historie wirkt wie ein impliziter Puffer gegen Sequenzrisiken (Sequence of Returns Risk). Ein expliziter Abzug von TER oder Dividenden ist daher **nicht** notwendig, da die Datenbasis bereits eine Sicherheitsmarge enthält.

**Hinweis Balance-App:** In der Balance-App werden reale Depotstände und ETF-Kurse verwendet; TER ist dort bereits im NAV eingepreist. Ein zusätzlicher TER-Abzug wäre doppelt.

**Erweiterte Datenbasis (1925-2024):**
*   **Erweiterung:** Die Daten wurden ab Januar 2026 von 1950 auf **1925** erweitert.
*   **Rekonstruktion 1925-1949:** MSCI-Levels wurden aus US-Marktdaten rekonstruiert und auf den 1950er-Basiswert normalisiert.
*   **Zweck:** Ermöglicht Stress-Tests mit historisch extremen Perioden (Große Depression, Zweiter Weltkrieg).

**Daten-Anomalie 1950-1960 ("Wirtschaftswunder"):**
*   **Beobachtung:** Die Jahre 1950-1960 weisen eine nominale CAGR von **~19.4%** (Real: ~17.4%) auf.
*   **Bewertung:** Dies ist ein historischer Sonderfall (Nachkriegs-Wiederaufbau), der sich so kaum wiederholen lässt.
*   **Risiko:** Da die Monte-Carlo-Simulation zufällige Blöcke aus der Historie zieht, besteht das Risiko, dass "Wirtschaftswunder"-Phasen eine zu optimistische Erwartungshaltung erzeugen.
*   **Empfehlung:** Für eine konservative Planung ("Stress-Test") kann die Datenbasis erst ab **1970** (Beginn Stagflation) oder **1978** (Präzisere Daten) genutzt werden. Die neuen Stress-Presets "Great Depression" und "WWII" bieten zusätzliche Extremszenarien.

**Verteilung der Regime (1925-2024):**

| Regime | Jahre | Anteil |
|--------|-------|--------|
| BULL | 28 | 28% |
| BEAR | 22 | 22% |
| SIDEWAYS | 38 | 38% |
| STAGFLATION | 12 | 12% |

*Hinweis: Die erweiterte Historie (1925-1949) enthält mehr Bärenmarkt- und Stagflationsjahre durch Große Depression und Weltkriege.*

### C.3.4 Determinismus

**Per-Run-Seeding** (simulator-utils.js:96-103):
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

**Quelle:** BARMER Pflegereport 2024 (dokumentiert in simulator-data.js:6-12)

### C.4.2 Altersabhängige Eintrittswahrscheinlichkeiten

| Alter | PG1 | PG2 | PG3 | PG4 | PG5 | Gesamt |
|-------|-----|-----|-----|-----|-----|--------|
| 65 | 1.2% | 0.6% | 0.3% | 0.15% | 0.05% | 2.3% |
| 70 | 2.0% | 1.0% | 0.5% | 0.25% | 0.10% | 3.85% |
| 75 | 3.5% | 1.8% | 0.9% | 0.45% | 0.20% | 6.85% |
| 80 | 5.5% | 3.2% | 1.6% | 0.75% | 0.35% | 11.4% |
| 85 | 8.5% | 5.5% | 3.2% | 1.50% | 0.70% | 19.4% |
| 90 | 12.0% | 8.0% | 5.0% | 2.80% | 1.20% | 29.0% |

**Evidenz:** `simulator-data.js:43-51`

### C.4.3 Progressionsmodell

```javascript
// simulator-data.js:35-41
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

**Separate RNG-Streams** (monte-carlo-runner.js:216-217):
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

---

## C.5 Liquiditäts-Targeting

### C.5.1 Dynamisches Runway-Ziel

**Regime-abhängige Ziel-Runway** (config.mjs:76-89):

| Regime | Ziel-Runway | Begründung |
|--------|-------------|------------|
| `peak` | 48 Monate | 4 Jahre Puffer am ATH |
| `hot_neutral` | 36 Monate | 3 Jahre Standard |
| `bear` | 60 Monate | 5 Jahre im Crash |
| `stagflation` | 60 Monate | 5 Jahre bei Stagflation |
| `recovery_in_bear` | 48 Monate | 4 Jahre in Rally |
| `recovery` | 48 Monate | 4 Jahre in Erholung |

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

**Quantisierung** (config.mjs:115-133):

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

**Implementierung** (simulator-portfolio-inputs.js:180-200):
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

**Während der Ansparphase** (simulator-engine-direct.js:137-210):
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
// monte-carlo-runner.js:453-455
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

**Implementierung** (monte-carlo-runner.js:383-384):
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
| Zeitraum | Beliebig lang | 1951-2024 (begrenzt) |
| Ergebnis | Verteilung (Perzentile) | Ein deterministischer Pfad |
| Anwendung | Risikobewertung | Validierung ("Hätte mein Plan 2008 überlebt?") |

### C.8.2 Implementierung (`simulator-backtest.js`)

**Hauptfunktion:**
```javascript
export function runBacktest() {
    const inputs = getCommonInputs();
    const startJahr = parseInt(document.getElementById('simStartJahr').value);
    const endJahr = parseInt(document.getElementById('simEndJahr').value);

    // Validierung: 1951-2024
    if (startJahr < 1951 || endJahr > 2024 || startJahr >= endJahr) {
        alert('Fehler: Bitte gültigen Zeitraum eingeben.');
        return;
    }

    // Historische Serien aufbauen
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

**Konfigurierbare Parameter** (`simulator-sweep.js:269-277`):

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

**Auto-Optimize** ist ein **4-stufiger Optimierungsalgorithmus**, der automatisch geeignete Parameterkombinationen ermittelt. Im Vergleich zu einem exhaustiven Sweep reduziert er die Anzahl zu prüfender Kombinationen.

**Architektur:**

```
┌─────────────────────────────────────────────────────────────────┐
│                      Auto-Optimize Pipeline                      │
├─────────────────────────────────────────────────────────────────┤
│  Phase 1a: Latin Hypercube Sampling (100 Samples)               │
│      ↓                                                          │
│  Phase 1b: Quick-Filter (200 Runs × 2 Seeds) → Top-50           │
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

**Nachbarschafts-Generierung** (`auto-optimize-sampling.js:80-97`):

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

**Batch-Parallelisierung:**
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

---

# Marktvergleich

## D.1 Kommerzielle Retirement Planner (2025/2026)

### D.1.1 ProjectionLab
rt
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
| **Historischer Backtest** | ✅ 1951-2024 | ⚠️ | ❌ | ✅ | ✅ | ✅ |
| **Dynamische Guardrails** | ✅ 7 Regime | ❌ | ❌ | ⚠️ | ✅ | ❌ |
| **DE-Steuern (vollst.)** | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| **Pflegefall-Modell** | ✅ PG1-5 | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| **Multi-Profil** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Tranchen-Management** | ✅ FIFO+Online | ❌ | ⚠️ | ❌ | ❌ | ❌ |
| **Parameter-Sweeps** | ✅ Heatmap | ❌ | ❌ | ⚠️ | ❌ | ❌ |
| **Auto-Optimize** | ✅ 4-stufig LHS | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Ausgaben-Check** | ✅ CSV+Median | ❌ | ❌ | ❌ | ❌ | ❌ |
| **Offline** | ✅ | ⚠️ ($799) | ❌ | ✅ (Gold) | ✅ | ✅ |
| **Desktop-App** | ✅ Tauri (8 MB) | ❌ | ❌ | ✅ Excel | ❌ | ❌ |
| **Multi-Plattform** | ✅ Win/Mac/Linux | ⚠️ Web only | ⚠️ Web only | ⚠️ Win only | ✅ Web | ✅ Web |
| **Open Source** | ✅ MIT | ❌ | ❌ | ❌ | ✅ | ❌ |

## D.4 Differenzierungsmerkmale (im Vergleich zu analysierten Tools)

*Hinweis: Dieser Vergleich basiert auf einer Recherche der oben genannten Tools (ProjectionLab, Boldin, Pralana, Portfolio Visualizer, FI Calc). Es können weitere Tools existieren, die nicht analysiert wurden.*

1. **Vollständige DE-Kapitalertragssteuer** — Kein anderes verglichenes Tool implementiert Abgeltungssteuer, Soli, KiSt, Teilfreistellung, SPB und steueroptimierte Reihenfolge
2. **Pflegefall-Modellierung mit PG1-5** — Kein anderes verglichenes Tool hat ein deutsches Pflegegrad-Modell mit Progression und Dual-Care
3. **7-stufige Marktregime-Erkennung** — In den betrachteten kostenlosen Tools in dieser Form nicht enthalten
4. **Risk-Based Guardrails** — Implementiert den Kitces-Ansatz statt klassischer Guyton-Klinger
5. **Tranchen-Management mit Online-Kursen** — Einzelpositionen mit FIFO-Steueroptimierung und automatischer Kursabfrage
6. **4-stufige Auto-Optimierung (LHS)** — Latin Hypercube Sampling + Quick-Filter + Lokale Verfeinerung + Train/Test-Validierung
7. **Parameter-Sweep mit Heatmap-Visualisierung** — Sensitivitätsanalyse mit SVG-basierter Viridis-Heatmap und Invarianten-Prüfung
8. **Historischer Backtest mit DE-Daten** — Deterministische Simulation 1951-2024 mit deutscher Inflation und Lohnentwicklung
9. **Portable Tauri-Desktop-App** — ~8 MB EXE, keine Installation, läuft von USB-Stick
10. **Offline-Betrieb und Open Source** — Daten verbleiben lokal auf dem Rechner
11. **Ausgaben-Check mit CSV-Import** — Monatliches Budget-Tracking gegen Floor+Flex, Median-basierte Hochrechnung, Ampel-Visualisierung, Profilverbund-Integration
12. **Echte Multi-Plattform-Unterstützung** — Native Desktop-Apps für Windows (.exe), macOS (.app) und Linux (AppImage/deb) aus einer Codebasis, plus Browser-Fallback mit Start-Scripts

---

# Forschungsabgleich

## E.1 Morningstar 2025: Safe Withdrawal Rates

**Quelle:** [Morningstar: What's a Safe Retirement Spending Rate for 2025?](https://www.morningstar.com/retirement/whats-safe-retirement-spending-rate-2025)

| Strategie | Starting SWR | Morningstar | Ruhestand-Suite |
|-----------|--------------|-------------|-----------------|
| Constant Dollar | 3.9% | ✅ | ✅ Floor |
| Guardrails | 5.2% | ✅ | ✅ Floor + Flex |
| RMD-based | 4.8% | ✅ | ❌ |
| Forgo Inflation | 4.3% | ✅ | ❌ |

**Implementierung:** Floor-Flex implementiert den Guardrails-Ansatz, der laut Morningstar die höchste SWR ermöglicht.

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

## E.4 Bootstrap-Methodik

**Stand der Forschung:** Block-Bootstrap erhält Autokorrelation; Stationary Bootstrap (Politis/Romano) wird in der Literatur häufig als geeignete Alternative eingeordnet.

**Status:** ✅ Block-Bootstrap implementiert, ⚠️ kein Stationary Bootstrap

## E.5 Fat Tails / Regime Switching

**Stand der Forschung:** Student-t oder GARCH erfassen Tail-Risiken besser als Normalverteilung.

**Status:** Regime-Switching via Markov-Chain implementiert; keine expliziten Fat Tails im Return-Modell

---

# Appendix: Modul-Inventar

## Engine-Module (13)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `core.mjs` | 311 | Orchestrierung, EngineAPI |
| `config.mjs` | 274 | Zentrale Konfiguration (erweitert) |
| `errors.mjs` | ~50 | Fehlerklassen |
| `index.mjs` | ~30 | Modul-Exports |
| `InputValidator.mjs` | 140 | Input-Validierung |
| `MarketAnalyzer.mjs` | 160 | Marktregime-Klassifikation |
| `SpendingPlanner.mjs` | **1076** | Guardrails, Flex-Rate, Budget-System **(erweitert!)** |
| `TransactionEngine.mjs` | 47 | Facade für Transaktionen |
| `transaction-action.mjs` | 456 | Transaktions-Entscheidungslogik |
| `transaction-opportunistic.mjs` | 323 | Opportunistisches Rebalancing |
| `transaction-surplus.mjs` | 149 | Überschuss-Handling |
| `transaction-utils.mjs` | 237 | Transaktions-Hilfsfunktionen |
| `sale-engine.mjs` | 333 | Verkäufe, Steuern |

## Simulator-Module (41 Module, Auswahl)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `monte-carlo-runner.js` | ~880 | DOM-freie MC-Simulation (erweitert) |
| `simulator-sweep.js` | ~500 | Parameter-Sweeps |
| `simulator-optimizer.js` | ~500 | 3-stufige Optimierung |
| `simulator-data.js` | ~450 | Historische Daten 1925-2024, 9 Stress-Presets |
| `simulator-utils.js` | 260 | RNG, Quantile, Parser |
| `simulator-portfolio-pension.js` | ~65 | Rentenberechnung, Indexierung |
| `simulator-main-accumulation.js` | ~80 | Ansparphase-Steuerung |
| `simulator-engine-direct.js` | ~350 | Engine-Direktzugriff, Ansparlogik |
| `simulator-ui-rente.js` | ~100 | Renten-UI (Rente1/Rente2) |

## Worker-Module (3)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `worker-pool.js` | ~400 | Worker-Lifecycle, Chunking |
| `mc-worker.js` | ~150 | Monte-Carlo Worker-Thread |
| `auto-optimize-worker.js` | ~80 | Optimizer-Worker |

## Balance-App Module (28 Module, Auswahl)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `balance-main.js` | ~500 | Orchestrierung, Update-Zyklus |
| `balance-reader.js` | ~300 | DOM-Input-Lesung |
| `balance-storage.js` | ~400 | localStorage, Snapshots |
| `balance-expenses.js` | **646** | Ausgaben-Check mit CSV-Import, Budget-Tracking **(neu!)** |
| `balance-guardrail-reset.js` | ~70 | Auto-Reset bei kritischen Änderungen |
| `balance-annual-*.js` (4) | ~400 | Jahresabschluss, Inflation, Marktdaten |
| `balance-diagnosis-*.js` (6) | ~600 | Chips, Entscheidungsbaum, Guardrails |

## Profil- und Tranchen-Module (6)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `profile-storage.js` | 340 | CRUD, Export/Import, Registry-Management |
| `profile-manager.js` | 192 | UI-Facade für Profilverwaltung |
| `profilverbund-balance.js` | 550 | Multi-Profil-Aggregation, Entnahme-Verteilung |
| `depot-tranchen-status.js` | 432 | Aggregation, UI-Sync, Status-Badge |
| `balance-main-profile-sync.js` | ~150 | Cross-App-Synchronisation |
| `tranche-config-example.js` | ~100 | Beispiel-Konfiguration |

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
7. **4-Stage-Optimization** (`simulator-optimizer.js`, `auto-optimize-sampling.js`)
8. **FIFO-Steueroptimierung** (`sale-engine.mjs:getSellOrder`)
9. **Wealth-Adjusted Reduction** (`SpendingPlanner.mjs`)
10. **Flex-Budget-System** (`SpendingPlanner.mjs`)
11. **Flex-Share S-Curve** (`SpendingPlanner.mjs`)
12. **FILTER/RECENCY Sampling** (`monte-carlo-runner.js`)
13. **Ansparphase-Logik** (`simulator-engine-direct.js`, `simulator-main-accumulation.js`)
14. **Renten-Indexierung** (`simulator-portfolio-pension.js:computeRentAdjRate`)
15. **Witwenrente** (`monte-carlo-runner.js:widowBenefitActive`)
16. **Great Depression/WWII Stress-Presets** (`simulator-data.js`)
17. **Latin Hypercube Sampling** (`auto-optimize-sampling.js:latinHypercubeSample`) **(neu!)**
18. **Historischer Backtest** (`simulator-backtest.js:runBacktest`) **(neu!)**
19. **Profilverbund-Aggregation** (`profilverbund-balance.js:aggregateProfilverbundInputs`) **(neu!)**
20. **Tranchen-FIFO-Selektion** (`profilverbund-balance.js:selectTranchesForSale`) **(neu!)**
21. **Multi-Objective-Optimierung** (`simulator-optimizer.js:findBestParametersMultiObjective`) **(neu!)**
22. **Constraint-Based-Optimierung** (`simulator-optimizer.js:findBestParametersWithConstraints`) **(neu!)**
23. **Sweep-Heatmap-Rendering** (`simulator-heatmap.js:renderSweepHeatmapSVG`) **(neu!)**
24. **P2-Invarianz-Prüfung** (`simulator-sweep-utils.js:areP2InvariantsEqual`) **(neu!)**
25. **Ausgaben-Check CSV-Parser** (`balance-expenses.js:parseCategoryCsv`) **(neu!)**
26. **Median-basierte Hochrechnung** (`balance-expenses.js:computeYearStats`) **(neu!)**

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

### Deutsche Quellen
- [BARMER Pflegereport 2024](https://www.barmer.de/pflegereport) (Pflegefall-Daten)
- [BVI Entnahme-Rechner](https://www.bvi.de/en/services/calculators/retirement-calculator/)

---

*Technische Dokumentation der Ruhestand-Suite. Code-Zeilenangaben beziehen sich auf Engine API v31.0 und können bei zukünftigen Änderungen abweichen. Algorithmen-Beschreibungen bleiben konzeptionell gültig. Stand: Februar 2026.*
