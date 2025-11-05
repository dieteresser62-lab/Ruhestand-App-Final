# Ruhestand-App - Finanzplanungs-Tool für den Ruhestand

Ein umfassendes Tool zur Portfolioverwaltung und Ruhestandsplanung mit Monte-Carlo-Simulationen.

## 📦 Projektstruktur (Vollständig modularisiert!)

```
Ruhestand-App-Final/
├── css/
│   ├── balance.css              # Balance-App Styles (~530 Zeilen)
│   └── simulator.css            # Simulator Styles (99 Zeilen)
│
├── js/
│   └── shared/
│       └── (für gemeinsame Komponenten - geplant)
│
├── balance-main.js              # Balance Hauptmodul (224 Zeilen)
├── balance-config.js            # Balance Konfiguration (54 Zeilen)
├── balance-storage.js           # Balance Persistierung (233 Zeilen)
├── balance-reader.js            # Balance Input-Layer (97 Zeilen)
├── balance-renderer.js          # Balance Output-Layer (494 Zeilen)
├── balance-binder.js            # Balance Event-Handling (378 Zeilen)
├── balance-utils.js             # Balance Utilities (32 Zeilen)
│
├── simulator-main.js            # Simulator Hauptmodul (559 Zeilen)
├── simulator-engine.js          # Simulations-Engine (411 Zeilen)
├── simulator-results.js         # Ergebnis-Rendering (297 Zeilen)
├── simulator-portfolio.js       # Portfolio-Verwaltung (343 Zeilen)
├── simulator-heatmap.js         # Heatmap-Visualisierung (315 Zeilen)
├── simulator-utils.js           # Hilfsfunktionen (146 Zeilen)
├── simulator-data.js            # Daten-Konstanten (84 Zeilen)
│
├── engine.js                    # Gemeinsame Berechnungs-Engine (959 Zeilen)
├── Balance.html                 # Balance-App (255 Zeilen - vorher 2.411!)
├── Balance.html.backup          # Original-Backup
├── Simulator.html               # Monte-Carlo Simulator (242 Zeilen - vorher 2.380!)
├── BALANCE_MODULES_README.md    # Balance-Module Dokumentation
└── README.md                    # Diese Datei
```

## 🎯 Apps im Projekt

### 1. Balance.html - Portfolio-Balancing-Tool

**Zweck:** Jährliche Portfolioverwaltung mit intelligenter Entnahmeplanung

**Hauptfunktionen:**
- Portfolio-Eingabe (Tagesgeld, ETFs, Aktien Alt/Neu, Gold)
- Marktdatenerfassung mit CSV-Import
- Inflationsanpassungen
- Entnahmeratenberechnung mit Leitplanken (Guardrails)
- Steueroptimierte Verkaufsempfehlungen
- Alarm-System für kritische Marktphasen
- Diagnose-Panel mit detailliertem Entscheidungsbaum
- Dark-Mode-Unterstützung

**Technologie:** HTML5, CSS3, ES6-Module (vollständig modularisiert)

**Module:**
- **balance-main.js** - Hauptorchestrierung & Update-Loop
- **balance-config.js** - Konfiguration & Error-Klassen
- **balance-storage.js** - LocalStorage & File System API
- **balance-reader.js** - Input-Layer (DOM → Daten)
- **balance-renderer.js** - Output-Layer (Daten → DOM)
- **balance-binder.js** - Event-Handling & User-Interaktionen
- **balance-utils.js** - Formatierungs-Utilities

### 2. Simulator.html - Monte-Carlo-Ruhestandssimulator

**Zweck:** Langfristige Portfolionachhaltigkeitsmodellierung mit stochastischen Szenarien

**Hauptfunktionen:**
- 1000+ Monte-Carlo-Simulationen über 35+ Jahre
- 3 Simulationsmethoden (Regime-Sampling, Block-Bootstrap)
- Stressszenario-Tests
- Pflegefall-Szenarien mit Kostenmodellierung
- Detaillierte Wahrscheinlichkeitsmetriken (P10, P50, P90)
- Heatmap-Visualisierungen

**Technologie:** HTML5, CSS3, ES6-Module (vollständig modularisiert)

**Module:**
- **simulator-main.js** - Hauptorchestrierung, Monte-Carlo & Backtest
- **simulator-engine.js** - Jahres-Simulationslogik, State Management
- **simulator-results.js** - Ergebnis-Rendering & Visualisierung
- **simulator-portfolio.js** - Portfolio-Initialisierung & -Verwaltung
- **simulator-heatmap.js** - Heatmap-Generierung & Canvas-Rendering
- **simulator-utils.js** - Hilfsfunktionen (RNG, Quantile, Formatierung)
- **simulator-data.js** - Historische Daten & Konstanten

### 3. engine.js - Gemeinsame Berechnungs-Engine (v31.0)

**Kernmodule:**
- **InputValidator** - Eingabevalidierung
- **MarketAnalyzer** - Marktregime-Klassifikation (7 Szenarien)
- **SpendingPlanner** - Intelligente Entnahmeplanung
- **TransactionEngine** - Steueroptimiertes Rebalancing

## 🚀 Modularisierung - Was wurde gemacht?

### Balance.html - Vorher vs. Nachher

| Vorher | Nachher | Reduktion |
|--------|---------|-----------|
| **2.411 Zeilen** | **255 Zeilen HTML** | **-89%** |
| Monolithisches JavaScript | 7 ES6-Module | ✅ |
| Inline CSS | css/balance.css | ✅ |
| ~1.946 Zeilen JS inline | 1.512 Zeilen verteilt auf Module | ✅ |

**Module-Aufteilung:**
- balance-renderer.js (494) - Output-Layer
- balance-binder.js (378) - Event-Handling
- balance-storage.js (233) - Persistierung
- balance-main.js (224) - Orchestrierung
- balance-reader.js (97) - Input-Layer
- balance-config.js (54) - Konfiguration
- balance-utils.js (32) - Utilities

### Simulator.html - Vorher vs. Nachher

| Vorher | Nachher | Reduktion |
|--------|---------|-----------|
| **2.380 Zeilen** | **242 Zeilen** | **-90%** |
| Monolithisches JavaScript | 7 ES6-Module | ✅ |
| Inline CSS | simulator.css | ✅ |
| ~2.138 Zeilen JS inline | 2.155 Zeilen verteilt auf Module | ✅ |

**Module-Aufteilung:**
- simulator-main.js (559) - Orchestrierung
- simulator-engine.js (411) - Simulationslogik
- simulator-portfolio.js (343) - Portfolio-Management
- simulator-heatmap.js (315) - Visualisierung
- simulator-results.js (297) - Rendering
- simulator-utils.js (146) - Hilfsfunktionen
- simulator-data.js (84) - Konstanten

### Vorteile der neuen Struktur

✅ **Übersichtlichkeit** - Jede Datei hat eine klare Verantwortung  
✅ **Wartbarkeit** - Änderungen an CSS/JS unabhängig von HTML  
✅ **Performance** - Browser kann CSS/JS cachen  
✅ **Wiederverwendung** - Gemeinsame Komponenten können geteilt werden  
✅ **Entwicklung** - Einfacheres Debugging und Testing  

## 🎨 Verwendung

### Apps öffnen

Öffne die gewünschte App in einem modernen Browser:

```bash
# Balance-App (Portfolio-Management)
open Balance.html

# Simulator-App (Monte-Carlo-Analysen)
open Simulator.html

# oder direkt in Browser ziehen
```

**Empfohlene Browser:**
- Chrome/Edge (Chromium-basiert) - empfohlen für ES6-Module
- Firefox
- Safari

### Tastaturkürzel (Balance-App)

- **Alt + J** - Jahresabschluss erstellen
- **Alt + E** - Export
- **Alt + I** - Import
- **Alt + N** - Marktdaten nachrücken
- **Alt + D** - Dark-Mode umschalten

## 💾 Datenspeicherung

Die App speichert Daten im **Browser LocalStorage**:
- Automatisches Speichern bei jeder Änderung
- Export/Import als JSON-Datei
- Jahresabschluss-Snapshots

**Hinweis:** Daten bleiben lokal im Browser und werden nicht in die Cloud übertragen.

## 🔧 Nächste Schritte (Empfohlene Verbesserungen)

### Kurzfristig (Quick Wins)
- [x] ~~Simulator.html modularisieren~~ (✅ Erledigt!)
- [x] ~~Balance-App auf ES6-Module umstellen~~ (✅ Erledigt!)
- [ ] Gemeinsame CSS-Variablen in css/shared.css auslagern
- [ ] Formatierungsfunktionen in js/shared/formatters.js zusammenführen

### Mittelfristig
- [ ] Build-System einführen (Vite/esbuild)
- [ ] Testing-Framework aufsetzen (Jest/Vitest)
- [ ] TypeScript einführen
- [ ] ESLint/Prettier konfigurieren

### Langfristig
- [ ] Web Workers für Simulator-Performance (1000+ Simulationen)
- [ ] PWA-Features (offline-fähig, installierbar)
- [ ] Chart-Bibliothek integrieren (Chart.js/Plotly)
- [ ] Shared State Management (Zustand/Jotai)

## 📊 Technische Details

### Architektur

#### Balance-App (ES6-Module)
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
    │  (97)  │   │  (494)   │  │  (378)  │
    └────────┘   └──────────┘  └─────────┘
         ↓              ↓            ↓
    ┌────────┐   ┌──────────┐  ┌─────────┐
    │ utils  │   │ storage  │  │ config  │
    │  (32)  │   │  (233)   │  │  (54)   │
    └────────┘   └──────────┘  └─────────┘
                        ↓
              ┌────────────────┐
              │   engine.js    │
              │  (v31.0 API)   │
              └────────────────┘
```

#### Simulator-App (ES6-Module)
```
┌─────────────────────────────────────────┐
│        Simulator.html (UI)              │
├─────────────────────────────────────────┤
│  - HTML-Struktur (242 Zeilen)          │
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
│  - Progress-Tracking                   │
└─────────────────────────────────────────┘
         ↓              ↓            ↓
    ┌────────┐   ┌──────────┐  ┌─────────┐
    │ engine │   │portfolio │  │ results │
    │ (411)  │   │  (343)   │  │  (297)  │
    └────────┘   └──────────┘  └─────────┘
         ↓              ↓            ↓
    ┌────────┐   ┌──────────┐  ┌─────────┐
    │ utils  │   │ heatmap  │  │  data   │
    │ (146)  │   │  (315)   │  │  (84)   │
    └────────┘   └──────────┘  └─────────┘
```

### Marktregime (7 Szenarien)

1. **peak_hot** - Allzeithoch mit starkem Momentum
2. **peak_stable** - Allzeithoch, stabil
3. **recovery** - Starke Erholung nach Korrektur
4. **corr_young** - Junge Korrektur
5. **side_long** - Seitwärtskonsolidierung
6. **bear_deep** - Tiefe Korrektur (>20% vom ATH)
7. **recovery_in_bear** - Rally im Bärenmarkt

### Entnahme-Leitplanken (Guardrails)

```javascript
THRESHOLDS: {
    ALARM: {
        withdrawalRate: 5.5%,    // Kritische Entnahmerate
        realDrawdown: 25%        // Kritischer Drawdown
    },
    CAUTION: {
        withdrawalRate: 4.5%,    // Vorsichtige Entnahmerate
        inflationCap: 3%         // Inflations-Cap
    }
}
```

## 📝 Versionshistorie

### v4.0 (2025-01-05) - Balance ES6-Modularisierung
- ✅ Balance-App auf ES6-Module umgestellt (analog zu Simulator)
- ✅ Balance-JavaScript in 7 Module aufgeteilt (1.512 Zeilen)
- ✅ Dependency-Injection-Pattern für bessere Testbarkeit
- ✅ BALANCE_MODULES_README.md erstellt

### v3.0 (2025-01-04) - Simulator-Modularisierung
- ✅ Simulator.html modularisiert (2.380 → 242 Zeilen, -90%)
- ✅ Simulator-JavaScript in 7 ES6-Module aufgeteilt
- ✅ Simulator-CSS in separate Datei ausgelagert
- ✅ README.md mit Simulator-Dokumentation aktualisiert

### v2.0 (2025-01-03) - Basis-Modularisierung
- ✅ Balance.html CSS/JS ausgelagert (2.411 → 255 Zeilen HTML, -89%)
- ✅ CSS in css/balance.css ausgelagert
- ✅ JavaScript in js/balance/balance-app.js ausgelagert
- ✅ Ordnerstruktur angelegt (css/, js/)
- ✅ README.md erstellt

### v1.0 (Original)
- Balance-App (v21.1) - Monolithisch
- Simulator-App (v5) - Monolithisch
- Engine API v31.0

## 🤝 Beiträge

Beide Apps wurden vollständig auf ES6-Module umgestellt!

**Nächste Schritte für Contributors:**
1. ~~Simulator.html modularisieren~~ (✅ Erledigt!)
2. ~~Balance-App auf ES6-Module umstellen~~ (✅ Erledigt!)
3. Gemeinsame Komponenten in js/shared/ auslagern
4. Build-System einrichten (Vite/esbuild)
5. Testing-Framework aufsetzen (Jest/Vitest)
6. TypeScript-Migration planen

## 📄 Lizenz

(Keine Lizenz spezifiziert)

---

**Hinweis:** Die Original-Balance-Datei wurde als `Balance.html.backup` gesichert.
