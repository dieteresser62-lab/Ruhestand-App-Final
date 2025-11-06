# 💰 Ruhestand-App Suite

**Professionelle Finanzplanungs-Tools für Ihren Ruhestand**

Eine vollständig modularisierte Suite von Webanwendungen zur Portfolioverwaltung und Ruhestandsplanung mit Monte-Carlo-Simulationen, Backtesting und intelligenten Entnahmestrategien.

[![Version](https://img.shields.io/badge/Version-6.0-blue.svg)](https://github.com)
[![ES6 Modules](https://img.shields.io/badge/ES6-Modules-green.svg)](https://github.com)
[![License](https://img.shields.io/badge/License-Proprietary-red.svg)](https://github.com)

---

## 🚀 Schnellstart

### 🌐 Apps öffnen

1. **Landing Page** - Öffnen Sie `index.html` für eine Übersicht aller Apps
2. **Balance-App** - `Balance.html` für Portfolio-Management
3. **Simulator** - `Simulator.html` für Monte-Carlo-Analysen

```bash
# Im Browser öffnen
open index.html

# Oder direkt eine spezifische App
open Balance.html
open Simulator.html
```

**Empfohlene Browser:** Chrome, Edge, Firefox, Safari (mit ES6-Modul-Support)

---

## 📦 Projektstruktur

```
Ruhestand-App-Final/
├── 🏠 index.html                   # Landing Page (274 Zeilen)
│
├── 📁 css/
│   └── balance.css                # Balance-App Styles (516 Zeilen)
│
├── ⚖️ Balance-App
│   ├── Balance.html               # HTML (255 Zeilen, vorher 2.411!)
│   ├── balance-main.js            # Orchestrierung (256 Zeilen)
│   ├── balance-renderer.js        # Output-Layer (486 Zeilen)
│   ├── balance-binder.js          # Event-Handling (442 Zeilen)
│   ├── balance-storage.js         # Persistierung (233 Zeilen)
│   ├── balance-config.js          # Konfiguration (124 Zeilen)
│   ├── balance-reader.js          # Input-Layer (97 Zeilen)
│   └── balance-utils.js           # Utilities (32 Zeilen)
│
├── 📊 Simulator-App
│   ├── Simulator.html             # HTML mit Tab-UI (364 Zeilen, vorher 2.380!)
│   ├── simulator.css              # Styles (122 Zeilen)
│   ├── simulator-main.js          # Monte-Carlo & Backtest (931 Zeilen)
│   ├── simulator-engine.js        # Jahres-Simulationslogik (411 Zeilen)
│   ├── simulator-heatmap.js       # Heatmap-Visualisierung (471 Zeilen)
│   ├── simulator-portfolio.js     # Portfolio-Management (343 Zeilen)
│   ├── simulator-results.js       # Ergebnis-Rendering (336 Zeilen)
│   ├── simulator-utils.js         # Hilfsfunktionen (308 Zeilen)
│   ├── simulator-data.js          # Historische Daten (84 Zeilen)
│   └── sim-parity-smoketest.js    # Parity-Tests (318 Zeilen)
│
├── 🔧 Gemeinsame Engine
│   └── engine.js                  # Berechnungs-Engine v31.0 (959 Zeilen)
│
└── 📚 Dokumentation
    ├── README.md                  # Diese Datei
    └── BALANCE_MODULES_README.md  # Balance-Module Details
```

**Gesamtstatistik:** ~9.300 Zeilen Code, vollständig modularisiert

---

## 🎯 Die Anwendungen im Detail

### ⚖️ Balance-App - Portfolio-Management

**Tägliches Portfolio-Controlling mit intelligenter Entnahmestrategie**

Die Balance-App ist Ihr Cockpit für die jährliche Portfolioverwaltung mit automatisierter Entnahmeplanung und Rebalancing-Empfehlungen.

#### ✨ Features

- **📊 Portfolio-Tracking**: Verwaltung von Tagesgeld, ETFs, Aktien (Alt/Neu), Gold
- **📈 Marktdaten-Import**: CSV-Import für historische Kurse und Marktindikatoren
- **💸 Intelligente Entnahmeplanung**:
  - Floor-Bedarf vs. Flex-Bedarf mit Guardrails
  - Inflationsanpassung und Entnahmeraten-Monitoring
  - Alarm-System bei kritischen Schwellwerten
- **🔄 Rebalancing-Engine**: Steueroptimierte Verkaufsempfehlungen
- **🧪 Diagnose-Panel**: Detaillierter Entscheidungsbaum im Debug-Modus
- **🌙 Dark Mode**: Augenfreundliche Darstellung
- **💾 Import/Export**: JSON-basierte Datensicherung

#### 🗂️ Module-Architektur

| Modul | Zeilen | Verantwortung |
|-------|--------|---------------|
| `balance-renderer.js` | 486 | Output-Layer (Daten → DOM) |
| `balance-binder.js` | 442 | Event-Handling & User-Interaktionen |
| `balance-main.js` | 256 | Orchestrierung & Update-Loop |
| `balance-storage.js` | 233 | LocalStorage & File API |
| `balance-config.js` | 124 | Konfiguration & Error-Handling |
| `balance-reader.js` | 97 | Input-Layer (DOM → Daten) |
| `balance-utils.js` | 32 | Formatierungs-Utilities |

#### ⌨️ Tastaturkürzel

- **Alt + J** - Jahresabschluss erstellen
- **Alt + E** - Export
- **Alt + I** - Import
- **Alt + N** - Marktdaten nachrücken
- **Alt + D** - Dark-Mode umschalten
- **CTRL + Shift + D** - Debug-Modus umschalten

---

### 📊 Simulator-App - Monte-Carlo-Ruhestandssimulator

**Langfristige Portfolionachhaltigkeits-Modellierung mit stochastischen Szenarien**

Der Simulator ermöglicht fundierte Zukunftsanalysen durch Monte-Carlo-Simulationen, historisches Backtesting und systematische Parameteroptimierung.

#### ✨ Features

- **🎲 Monte-Carlo-Engine**:
  - 1000+ Simulationen über 35+ Jahre
  - 3 Sampling-Methoden (Regime-Sampling, Block-Bootstrap, Hybrid)
  - Stressszenario-Tests (Finanzkrise, Rezession, Stagflation)
- **📉 Backtesting**: Historische Szenarien (Dot-Com, 2008, COVID-19)
- **🔥 Parameter-Sweep**:
  - 2D-Grid-Exploration für systematische Parametervariation
  - Heatmap-Visualisierung (SVG)
  - Echtzeit-Erfolgswahrscheinlichkeiten
- **🏥 Pflegefall-Szenarien**: Kostenmodellierung für Langzeitpflege
- **📊 Visualisierung**:
  - Perzentil-Charts (P10, P50, P90)
  - Heatmaps für Parameter-Sweeps
  - Erfolgsprognosen und Wahrscheinlichkeitsverteilungen
- **🔧 Dev-Mode**:
  - Parity-Tests zur Engine-Validierung
  - Debug-Funktionen und Logging

#### 🗂️ Module-Architektur

| Modul | Zeilen | Verantwortung |
|-------|--------|---------------|
| `simulator-main.js` | 931 | Monte-Carlo, Backtest, Parameter-Sweep |
| `simulator-heatmap.js` | 471 | SVG-Heatmap-Generierung |
| `simulator-engine.js` | 411 | Jahres-Simulationslogik & State Management |
| `simulator-portfolio.js` | 343 | Portfolio-Initialisierung & -Verwaltung |
| `simulator-results.js` | 336 | Ergebnis-Rendering & Visualisierung |
| `simulator-utils.js` | 308 | RNG, Quantile, Formatierung |
| `simulator-data.js` | 84 | Historische Daten & Konstanten |

#### 🎨 Moderne Tab-Navigation

Der Simulator bietet eine übersichtliche Tab-basierte UI mit vier Hauptbereichen:

1. **Rahmendaten** - Startportfolio & Bedarfsparameter
2. **Monte-Carlo** - Stochastische Simulationen
3. **Backtesting** - Historische Szenarien
4. **Parameter-Sweep** - Systematische Parameteroptimierung

#### ⌨️ Tastaturkürzel

- **CTRL + Shift + D** - Dev-Modus umschalten (zeigt Parity-Tests)

---

### 🔧 Engine.js - Gemeinsame Berechnungs-Engine

**Version 31.0 - Core-Business-Logic für beide Apps**

Die Engine ist das Herzstück der Berechnungen und wird von beiden Apps verwendet.

#### 📦 Module

| Modul | Verantwortung |
|-------|---------------|
| **InputValidator** | Eingabevalidierung & Sanitization |
| **MarketAnalyzer** | Marktregime-Klassifikation (7 Szenarien) |
| **SpendingPlanner** | Intelligente Entnahmeplanung mit Guardrails |
| **TransactionEngine** | Steueroptimiertes Rebalancing & Verkaufslogik |

#### 🔍 Marktregime (7 Szenarien)

1. **peak_hot** - Allzeithoch mit starkem Momentum
2. **peak_stable** - Allzeithoch, stabil
3. **recovery** - Starke Erholung nach Korrektur
4. **corr_young** - Junge Korrektur
5. **side_long** - Seitwärtskonsolidierung
6. **bear_deep** - Tiefe Korrektur (>20% vom ATH)
7. **recovery_in_bear** - Rally im Bärenmarkt

---

## 🏠 Landing Page (index.html)

Eine moderne, responsive Übersichtsseite mit:

- Eleganter Card-basierter UI
- Direkt-Links zu beiden Apps
- Feature-Übersichten
- Responsive Design (Mobile-First)

---

## 🛠️ Modularisierungs-Historie

### ⚖️ Balance-App: Von Monolith zu Modulen

| Metrik | Vorher | Nachher | Verbesserung |
|--------|--------|---------|-------------|
| **HTML-Zeilen** | 2.411 | 255 | **-89%** |
| **Architektur** | Monolithisch | 7 ES6-Module | ✅ |
| **CSS** | Inline | `css/balance.css` (516 Zeilen) | ✅ |
| **JavaScript** | ~1.946 Zeilen inline | 1.670 Zeilen in Modulen | ✅ |

**Resultat:** Balance.html ist von **2.411** auf **255 Zeilen** geschrumpft!

### 📊 Simulator: Von Monolith zu Modulen

| Metrik | Vorher | Nachher | Verbesserung |
|--------|--------|---------|-------------|
| **HTML-Zeilen** | 2.380 | 364 | **-85%** |
| **Architektur** | Monolithisch | 7 ES6-Module | ✅ |
| **CSS** | Inline | `simulator.css` (122 Zeilen) | ✅ |
| **JavaScript** | ~2.138 Zeilen inline | 3.232 Zeilen in Modulen | ✅ |
| **UI** | Einfaches Layout | Tab-Navigation | ✅ |

**Resultat:** Simulator.html ist von **2.380** auf **364 Zeilen** geschrumpft!

### ✨ Vorteile der Modularisierung

| Vorteil | Beschreibung |
|---------|-------------|
| 🔍 **Übersichtlichkeit** | Jede Datei hat eine klar definierte Verantwortung (Single Responsibility) |
| 🔧 **Wartbarkeit** | CSS/JS können unabhängig vom HTML geändert werden |
| ⚡ **Performance** | Browser-Caching für CSS/JS-Module |
| ♻️ **Wiederverwendung** | Gemeinsame Engine (engine.js) wird von beiden Apps genutzt |
| 🧪 **Testing** | Module können isoliert getestet werden |
| 📦 **Deployment** | Einfacheres Dependency Management |

---

## 📚 Verwendung & Workflows

### 💾 Datenspeicherung

Die Apps nutzen **Browser LocalStorage** für persistente Datenhaltung:

- ✅ Automatisches Speichern bei jeder Änderung
- ✅ Export/Import als JSON-Datei
- ✅ Jahresabschluss-Snapshots (Balance-App)
- ✅ Sweep-Einstellungen (Simulator)

**Wichtig:** Daten bleiben lokal im Browser und werden nicht in die Cloud übertragen.

### 🔄 Typischer Balance-App Workflow

1. **Portfolio eingeben** - Aktuelle Vermögenswerte erfassen
2. **Marktdaten importieren** - CSV-Import für Kurse und Indizes
3. **Entnahmeplan prüfen** - Floor/Flex-Bedarf und Guardrails kontrollieren
4. **Rebalancing durchführen** - Empfehlungen umsetzen
5. **Jahresabschluss** (Alt + J) - Snapshot für Archivierung

### 🔬 Typischer Simulator Workflow

1. **Rahmendaten setzen** - Startportfolio und Bedarf definieren
2. **Monte-Carlo laufen lassen** - 1000+ Simulationen durchführen
3. **Ergebnisse analysieren** - Perzentile und Erfolgswahrscheinlichkeiten prüfen
4. **Parameter optimieren** - Parameter-Sweep für beste Strategie
5. **Backtesting** - Historische Validierung der Strategie  

### 🔥 Parameter-Sweep im Detail

Der **Parameter-Sweep** ist ein leistungsstarkes Werkzeug zur systematischen Parameteroptimierung:

#### Features

- **2D-Parameter-Grid**: Variieren Sie zwei Parameter gleichzeitig (z.B. Floor-Bedarf vs. Flex-Bedarf)
- **Heatmap-Visualisierung**: Interaktive SVG-Heatmaps zeigen Erfolgswahrscheinlichkeiten
- **Flexible Ranges**: Definieren Sie Min/Max/Schrittweite für jeden Parameter
- **Grid-Size-Counter**: Live-Anzeige der Anzahl zu berechnender Simulationen
- **localStorage-Persistenz**: Sweep-Einstellungen bleiben erhalten
- **Mehrere Metriken**: Überlebensrate, Endvermögen, Entnahmerate, etc.

#### Workflow

1. Wechseln Sie zum **Parameter-Sweep-Tab**
2. Wählen Sie zwei Parameter (z.B. `startFloorBedarf` und `startFlexBedarf`)
3. Definieren Sie Min/Max/Schrittweite für jeden Parameter
4. Klicken Sie auf **"Run Sweep"**
5. Analysieren Sie die Heatmap mit verschiedenen Metriken

**Tipp:** Der Grid-Size-Counter zeigt die Anzahl der Simulationen an. Große Grids (>100 Kombinationen) können mehrere Minuten dauern.

### 🐛 Debug-Modus & Dev-Modus

#### Balance-App Debug-Modus (CTRL + Shift + D)

- 🔍 Erweiterte Diagnose-Informationen
- 🌳 Visualisierung von Entscheidungsbäumen
- 📊 Interne Berechnungsdetails
- 🎯 Guardrail-Schwellwerte und Trigger

#### Simulator Dev-Modus (CTRL + Shift + D)

- 🧪 **Parity SmokeTest** - Vergleicht Simulator-Engine mit Haupt-Engine
- 📈 Erweiterte Logging-Funktionen
- 🔬 Debug-Buttons für einzelne Simulationen
- ⚙️ Inspizierung von Zwischenergebnissen

---

## 🧪 Technische Details

### Architektur-Diagramme

#### Balance-App Datenfluss

```
┌─────────────────────────────────────────┐
│          Balance.html (UI)              │
├─────────────────────────────────────────┤
│  - HTML-Struktur (255 Zeilen)          │
│  - Lädt: css/balance.css               │
│  - Lädt: balance-main.js (Module)      │
│  - Lädt: engine.js                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      balance-main.js (Entry)            │
├─────────────────────────────────────────┤
│  - Update-Loop Orchestrierung          │
│  - Engine-Handshake                    │
│  - Module-Initialisierung              │
└─────────────────────────────────────────┘
         ↓              ↓            ↓
    ┌────────┐   ┌──────────┐  ┌─────────┐
    │ reader │   │ renderer │  │ binder  │
    │  (97)  │   │  (486)   │  │  (442)  │
    └────────┘   └──────────┘  └─────────┘
         ↓              ↓            ↓
    ┌────────┐   ┌──────────┐  ┌─────────┐
    │ utils  │   │ storage  │  │ config  │
    │  (32)  │   │  (233)   │  │  (124)  │
    └────────┘   └──────────┘  └─────────┘
                        ↓
              ┌────────────────┐
              │   engine.js    │
              │  (v31.0 API)   │
              └────────────────┘
```

#### Simulator-App Datenfluss

```
┌─────────────────────────────────────────┐
│        Simulator.html (UI)              │
├─────────────────────────────────────────┤
│  - HTML mit Tab-Navigation (364)       │
│  - Lädt: simulator.css                 │
│  - Lädt: simulator-main.js (Module)    │
│  - Lädt: engine.js                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│      simulator-main.js (Entry)          │
├─────────────────────────────────────────┤
│  - Monte-Carlo-Orchestrierung          │
│  - Backtest-Runner                     │
│  - Parameter-Sweep                     │
│  - Progress-Tracking                   │
└─────────────────────────────────────────┘
         ↓              ↓            ↓
    ┌────────┐   ┌──────────┐  ┌─────────┐
    │ engine │   │portfolio │  │ results │
    │ (411)  │   │  (343)   │  │  (336)  │
    └────────┘   └──────────┘  └─────────┘
         ↓              ↓            ↓
    ┌────────┐   ┌──────────┐  ┌─────────┐
    │ utils  │   │ heatmap  │  │  data   │
    │ (308)  │   │  (471)   │  │  (84)   │
    └────────┘   └──────────┘  └─────────┘
```

### Guardrails & Schwellwerte

Die Entnahme-Leitplanken schützen vor übermäßiger Portfolioentnahme:

```javascript
THRESHOLDS: {
    ALARM: {
        withdrawalRate: 5.5%,    // Kritische Entnahmerate → Alarm
        realDrawdown: 25%        // Kritischer Drawdown → Alarm
    },
    CAUTION: {
        withdrawalRate: 4.5%,    // Vorsichtige Entnahmerate
        inflationCap: 3%         // Inflations-Cap bei Vorsicht
    }
}
```

**Alarm-Zustand** wird ausgelöst bei:
- Entnahmerate > 5.5%
- Drawdown > 25% vom Allzeithoch

**Vorsicht-Zustand** wird ausgelöst bei:
- Entnahmerate > 4.5%
- Inflation wird auf max. 3% gedeckelt

---

## 🚧 Roadmap & Nächste Schritte

### ✅ Abgeschlossen

- [x] Balance-App modularisieren (ES6-Module)
- [x] Simulator modularisieren (ES6-Module)
- [x] Tab-Navigation im Simulator
- [x] Parameter-Sweep mit Heatmaps
- [x] Debug-Modi für beide Apps
- [x] Landing Page (index.html)
- [x] LocalStorage-Persistenz

### 🎯 Kurzfristig (Quick Wins)

- [ ] **Shared CSS-Variablen**: Gemeinsame Farben/Styles in `css/shared.css` auslagern
- [ ] **Gemeinsame Utilities**: `formatCurrency()` und andere Helpers in `js/shared/` vereinheitlichen
- [ ] **Mobile-Optimierung**: Touch-Gesten und responsive Breakpoints verbessern
- [ ] **Accessibility**: ARIA-Labels und Keyboard-Navigation erweitern

### 🔨 Mittelfristig

- [ ] **Build-System**: Vite oder esbuild für Bundle-Optimierung
- [ ] **Testing**: Jest/Vitest für Unit-Tests einrichten
- [ ] **TypeScript**: Migration zu TypeScript für Type-Safety
- [ ] **Linting**: ESLint + Prettier für Code-Qualität
- [ ] **Documentation**: JSDoc für alle Module

### 🚀 Langfristig

- [ ] **Web Workers**: Parallelisierung der Monte-Carlo-Simulationen
- [ ] **PWA**: Progressive Web App (offline-fähig, installierbar)
- [ ] **Chart-Library**: Chart.js oder Plotly für bessere Visualisierungen
- [ ] **State Management**: Zustand/Jotai für komplexe State-Logik
- [ ] **Backend**: Optional: Node.js-Backend für Portfolio-Tracking und Cloud-Sync
- [ ] **Multi-User**: Authentifizierung und Portfolio-Sharing

---

## 📝 Versionshistorie

### v6.0 (2025-11-06) - 🎉 UI-Redesign & Stabilisierung

**Highlights:**
- 🎨 **Tab-Navigation**: Simulator erhält moderne Tab-basierte UI mit 4 Tabs
- 🗑️ **Legacy-Cleanup**: Entfernung veralteter Felder (z.B. "Stand" im Jahres-Update)
- 📏 **Sweep-Defaults**: Optimierte Standard-Parameter für 18 Grid-Kombinationen
- 📖 **README-Überarbeitung**: Vollständig modernisierte Dokumentation

**Änderungen:**
- Tab-UI für Simulator (Rahmendaten, Monte-Carlo, Backtesting, Parameter-Sweep)
- Bereinigung des Jahres-Update TabStrips
- Verbesserte Sweep-Konfiguration mit sinnvollen Defaults
- Aktualisierte Zeilenzahlen und Projektstruktur

### v5.2 (2025-01-07) - Parameter Sweep Verbesserungen

- ✅ Sweep-Defaults und Placeholders hinzugefügt
- ✅ localStorage-Persistenz für Sweep-Einstellungen
- ✅ Verbesserte Heatmap-Visualisierung mit TDZ-Fehlerkorrektur
- ✅ Range-Validierung mit Grid-Size-Counter

### v5.1 (2025-01-06) - Debug-Features & Dev-Modus

- ✅ Debug-Modus (CTRL+Shift+D) für Balance-App
- ✅ Dev-Modus-Toggle für Simulator mit erweiterten Debug-Funktionen
- ✅ Parity SmokeTest-Button für Engine-Validierung
- ✅ Kompakte Debug-Button-Layouts

### v5.0 (2025-01-05) - Parameter Sweep & Heatmap

- ✅ Parameter-Sweep-Funktion mit 2D-Grid-Exploration
- ✅ Heatmap-Visualisierung (SVG) für Sweep-Ergebnisse
- ✅ Flexible Parameter-Ranges mit Min/Max/Schrittweite
- ✅ Mehrere Metriken zur Analyse

### v4.0 (2025-01-05) - Balance ES6-Modularisierung

- ✅ Balance-App auf ES6-Module umgestellt
- ✅ Balance-JavaScript in 7 Module aufgeteilt (~1.670 Zeilen)
- ✅ Dependency-Injection-Pattern für Testbarkeit
- ✅ BALANCE_MODULES_README.md erstellt

### v3.0 (2025-01-04) - Simulator-Modularisierung

- ✅ Simulator.html modularisiert (2.380 → 364 Zeilen)
- ✅ Simulator-JavaScript in 7 ES6-Module aufgeteilt
- ✅ Simulator-CSS in separate Datei ausgelagert
- ✅ README.md mit Simulator-Dokumentation aktualisiert

### v2.0 (2025-01-03) - Basis-Modularisierung

- ✅ Balance.html CSS/JS ausgelagert (2.411 → 255 Zeilen, -89%)
- ✅ Ordnerstruktur angelegt (css/, js/)
- ✅ README.md erstellt

### v1.0 (Original) - Monolithische Apps

- Balance-App (v21.1) - Monolithisch, ~2.400 Zeilen
- Simulator-App (v5) - Monolithisch, ~2.400 Zeilen
- Engine API v31.0

---

## 🤝 Beiträge & Contributors

### Aktuelle Architektur

✅ **Vollständig modularisiert** - Beide Apps nutzen ES6-Module
✅ **Shared Engine** - Gemeinsame Berechnungs-Engine (engine.js v31.0)
✅ **Landing Page** - Moderne Übersichtsseite (index.html)

### Wie Sie beitragen können

1. **Code-Improvements**: Siehe Roadmap für Feature-Ideen
2. **Testing**: Unit-Tests für Module schreiben
3. **Dokumentation**: JSDoc-Kommentare hinzufügen
4. **Bug-Reports**: Issues über GitHub melden

### Entwickler-Setup

```bash
# Projekt klonen
git clone <repo-url>
cd Ruhestand-App-Final

# Im Browser öffnen (kein Build-Schritt erforderlich!)
open index.html
```

**Hinweise:**
- Keine Dependencies - reines ES6-Projekt
- Kein Build-Schritt - direkt im Browser ausführbar
- LocalStorage für Datenpersistenz

---

## 📄 Lizenz

Proprietary - Alle Rechte vorbehalten

---

## 📚 Weiterführende Dokumentation

- **[BALANCE_MODULES_README.md](BALANCE_MODULES_README.md)** - Detaillierte Balance-Module-Dokumentation
- **engine.js** - API-Dokumentation in Kommentaren (v31.0)

---

**💡 Tipp:** Die Original-Dateien wurden als Backups gesichert (`Balance.html.backup`, `simulator.js`)
