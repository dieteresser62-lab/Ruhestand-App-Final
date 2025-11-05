# Ruhestand-App - Finanzplanungs-Tool für den Ruhestand

Ein umfassendes Tool zur Portfolioverwaltung und Ruhestandsplanung mit Monte-Carlo-Simulationen.

## 📦 Projektstruktur (Neu modularisiert!)

```
Ruhestand-App-Final/
├── css/
│   └── balance.css              # Balance-App Styles (~530 Zeilen)
│
├── js/
│   ├── balance/
│   │   └── balance-app.js       # Balance-App Logik (~1.944 Zeilen)
│   │
│   ├── simulator/
│   │   └── (noch zu modularisieren)
│   │
│   └── shared/
│       └── (für gemeinsame Komponenten)
│
├── engine.js                    # Gemeinsame Berechnungs-Engine (959 Zeilen)
├── Balance.html                 # Balance-App (255 Zeilen - vorher 2.411!)
├── Balance.html.backup          # Original-Backup
├── Simulator.html               # Monte-Carlo Simulator (2.380 Zeilen)
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

**Zweck:** Langfristige Portfolionachhaltigkeitsmodellierung (noch zu modularisieren)

**Hauptfunktionen:**
- 1000+ Monte-Carlo-Simulationen über 35+ Jahre
- 3 Simulationsmethoden (Regime-Sampling, Block-Bootstrap)
- Stressszenario-Tests
- Pflegefall-Szenarien mit Kostenmodellierung
- Detaillierte Wahrscheinlichkeitsmetriken (P10, P50, P90)
- Heatmap-Visualisierungen

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

### Vorteile der neuen Struktur

✅ **Übersichtlichkeit** - Jede Datei hat eine klare Verantwortung  
✅ **Wartbarkeit** - Änderungen an CSS/JS unabhängig von HTML  
✅ **Performance** - Browser kann CSS/JS cachen  
✅ **Wiederverwendung** - Gemeinsame Komponenten können geteilt werden  
✅ **Entwicklung** - Einfacheres Debugging und Testing  

## 🎨 Verwendung

### Balance-App öffnen

Öffne `Balance.html` in einem modernen Browser:

```bash
# Linux/Mac
open Balance.html

# oder direkt in Browser ziehen
```

**Empfohlene Browser:**
- Chrome/Edge (Chromium-basiert)
- Firefox
- Safari

### Tastaturkürzel

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
- [ ] Simulator.html modularisieren (analog zu Balance.html)
- [ ] Gemeinsame CSS-Variablen in css/shared.css auslagern
- [ ] Formatierungsfunktionen in js/shared/formatters.js

### Mittelfristig
- [ ] Build-System einführen (Vite/esbuild)
- [ ] Testing-Framework aufsetzen (Jest/Vitest)
- [ ] TypeScript einführen
- [ ] ESLint/Prettier konfigurieren

### Langfristig
- [ ] In ES6-Module umwandeln
- [ ] Web Workers für Simulator-Performance
- [ ] PWA-Features (offline-fähig, installierbar)
- [ ] Chart-Bibliothek integrieren (Chart.js)

## 📊 Technische Details

### Architektur

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

### v2.0 (2025-01-XX) - Modularisierung
- ✅ Balance.html modularisiert (2.411 → 255 Zeilen)
- ✅ CSS in separate Datei ausgelagert
- ✅ JavaScript in separate Datei ausgelagert
- ✅ Ordnerstruktur angelegt (css/, js/balance/, js/simulator/, js/shared/)
- ✅ README.md erstellt

### v1.0 (Original)
- Balance-App (v21.1)
- Simulator-App (v5)
- Engine API v31.0

## 🤝 Beiträge

Dieses Projekt wurde modularisiert, um die Wartbarkeit und Erweiterbarkeit zu verbessern.

**Nächste Schritte für Contributors:**
1. Simulator.html modularisieren
2. Gemeinsame Komponenten in js/shared/ auslagern
3. Build-System einrichten
4. Tests hinzufügen

## 📄 Lizenz

(Keine Lizenz spezifiziert)

---

**Hinweis:** Die Original-Datei wurde als `Balance.html.backup` gesichert.
