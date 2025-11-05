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
│   ├── balance/
│   │   └── balance-app.js       # Balance-App Logik (~1.944 Zeilen)
│   │
│   └── shared/
│       └── (für gemeinsame Komponenten)
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

**Technologie:** HTML5, CSS3, Vanilla JavaScript (ES6+)

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
| **2.411 Zeilen** | **255 Zeilen** | **-89%** |
| Alles in einer Datei | Modular aufgeteilt | ✅ |
| ~214 Zeilen CSS inline | css/balance.css | ✅ |
| ~1.946 Zeilen JS inline | js/balance/balance-app.js | ✅ |

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
- [ ] Gemeinsame CSS-Variablen in css/shared.css auslagern
- [ ] Formatierungsfunktionen in js/shared/formatters.js
- [ ] Balance-App auf ES6-Module umstellen (analog zu Simulator)

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

#### Balance-App (Klassisch)
```
┌─────────────────────────────────────────┐
│          Balance.html (UI)              │
├─────────────────────────────────────────┤
│  - HTML-Struktur (255 Zeilen)          │
│  - Lädt: css/balance.css               │
│  - Lädt: js/balance/balance-app.js     │
│  - Lädt: engine.js                     │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│       balance-app.js (Logik)            │
├─────────────────────────────────────────┤
│  - App-Orchestrierung                  │
│  - State Management                    │
│  - StorageManager                      │
│  - UI-Layer (Reader/Renderer/Binder)   │
│  - Test Harness                        │
└─────────────────────────────────────────┘
                    ↓
┌─────────────────────────────────────────┐
│       engine.js (v31.0 API)             │
├─────────────────────────────────────────┤
│  - InputValidator                      │
│  - MarketAnalyzer (7 Regime)           │
│  - SpendingPlanner (Guardrails)        │
│  - TransactionEngine (Steuer-Opt.)     │
└─────────────────────────────────────────┘
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

### v3.0 (2025-01-XX) - Vollständige Modularisierung
- ✅ Simulator.html modularisiert (2.380 → 242 Zeilen, -90%)
- ✅ Simulator-JavaScript in 7 ES6-Module aufgeteilt
- ✅ Simulator-CSS in separate Datei ausgelagert
- ✅ README.md mit Simulator-Dokumentation aktualisiert

### v2.0 (2025-01-XX) - Balance-Modularisierung
- ✅ Balance.html modularisiert (2.411 → 255 Zeilen, -89%)
- ✅ CSS in separate Datei ausgelagert (css/balance.css)
- ✅ JavaScript in separate Datei ausgelagert (js/balance/balance-app.js)
- ✅ Ordnerstruktur angelegt (css/, js/balance/, js/simulator/, js/shared/)
- ✅ README.md erstellt

### v1.0 (Original)
- Balance-App (v21.1) - Monolithisch
- Simulator-App (v5) - Monolithisch
- Engine API v31.0

## 🤝 Beiträge

Beide Apps wurden vollständig modularisiert, um die Wartbarkeit und Erweiterbarkeit zu verbessern.

**Nächste Schritte für Contributors:**
1. ~~Simulator.html modularisieren~~ (✅ Erledigt!)
2. Balance-App auf ES6-Module umstellen (analog zu Simulator)
3. Gemeinsame Komponenten in js/shared/ auslagern
4. Build-System einrichten (Vite/esbuild)
5. Testing-Framework aufsetzen (Jest/Vitest)
6. TypeScript-Migration planen

## 📄 Lizenz

(Keine Lizenz spezifiziert)

---

**Hinweis:** Die Original-Balance-Datei wurde als `Balance.html.backup` gesichert.
