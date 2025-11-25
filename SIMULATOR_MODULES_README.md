# Simulator-App – Modulübersicht

Die Simulator-App besteht aus acht ES6-Modulen für Monte-Carlo-Simulationen, Parameter-Sweeps und Pflegefall-Szenarien. Das folgende Dokument fasst Verantwortung, Hauptfunktionen und Abhängigkeiten zusammen.

---

## 1. `simulator-main.js` (~3.100 Zeilen)
Hauptsteuerung der Simulator-App: Monte-Carlo, Sweep, UI-Handling.

**Hauptfunktionen:**
- `runMonteCarlo()` – führt Monte-Carlo-Simulation durch, sammelt 30 Szenario-Logs
- `runParameterSweep()` – Parameter-Sweep mit Heatmap-Visualisierung
- `getCommonInputs()` – sammelt alle UI-Eingaben in strukturiertes Objekt
- `initializeUI()` – registriert Event-Handler, lädt gespeicherte Werte

**Features:**
- Szenario-Log-Generierung (15 charakteristische + 15 zufällige Szenarien)
- Sweep-Schutz mit Whitelist/Blocklist für Partner-Felder
- Pflege-UI mit Staffel-Presets und regionalen Zuschlägen
- Export-Funktionen für Backtest-Logs

**Dependencies:** `simulator-engine.js`, `simulator-results.js`, `simulator-portfolio.js`, `simulator-heatmap.js`, `simulator-utils.js`, `simulator-data.js`, `simulator-backtest.js`

---

## 2. `simulator-backtest.js` (~550 Zeilen)
Backtest-spezifische Logik, Export und Tabellen-Rendering.

**Hauptfunktionen:**
- `runBacktest()` – historischer Backtest über gewählten Zeitraum
- `renderBacktestLog()` – rendert Jahresprotokoll als HTML-Tabelle
- `exportBacktestLogData()` – exportiert Backtest-Logs als JSON/CSV

**Dependencies:** `simulator-utils.js`, `simulator-data.js`, `simulator-portfolio.js`, `simulator-engine.js`, `simulator-results.js`

---

## 3. `simulator-engine.js` (~1.200 Zeilen)
Kernlogik für Jahr-für-Jahr-Simulation.

**Hauptfunktionen:**
- `sampleNextYearData()` – sampelt nächstes Jahr (historisch/Regime/Block)
- `yearSimulation()` – simuliert ein Jahr mit allen Transaktionen
- `makeDefaultCareMeta()` / `updateCareMeta()` – Pflegefall-Zustandsmaschine
- `calcCareCost()` – berechnet Pflege-Kosten nach Grad
- `computeCareMortalityMultiplier()` – erhöhte Sterblichkeit bei Pflege
- `computeHouseholdFlexFactor()` – Flex-Reduktion bei Pflege
- `initMcRunState()` – initialisiert Zustand für einen MC-Lauf

**Dependencies:** `simulator-utils.js`, `simulator-data.js`

---

## 4. `simulator-results.js` (~800 Zeilen)
Aggregation und Darstellung von Simulationsergebnissen.

**Hauptfunktionen:**
- `displayMonteCarloResults()` – zeigt MC-Ergebnisse mit Szenario-Log-Auswahl
- `renderWorstRunLog()` – rendert Jahresprotokoll als HTML-Tabelle
- `getWorstRunColumnDefinitions()` – Spaltenkonfiguration für Log-Tabellen
- `loadDetailLevel()` / `persistDetailLevel()` – Detail-Einstellungen speichern
- `createKpiCard()` / `createCurrencyKpiCard()` – KPI-Karten erstellen

**Features:**
- Dropdown für 30 Szenario-Logs (charakteristische + zufällige)
- Checkboxen für Pflege-Details und detailliertes Log
- JSON/CSV-Export für ausgewählte Szenarien
- Pflege-KPI-Dashboard mit Dual-Care-Metriken

**Dependencies:** `simulator-utils.js`, `simulator-heatmap.js`, `simulator-data.js`

---

## 5. `simulator-portfolio.js` (~600 Zeilen)
Portfolio-Initialisierung, Renten- und Stress-Kontexte.

**Hauptfunktionen:**
- `initializePortfolio()` – erstellt Portfolio-Struktur mit Tranchen
- `portfolioTotal()` / `sumDepot()` – Vermögensberechnungen
- `computeRentAdjRate()` / `computePensionNext()` – Rentenanpassungslogik
- `normalizeWidowOptions()` – Witwenrenten-Konfiguration
- `buildStressContext()` / `applyStressOverride()` – Stresstest-Szenarien
- `computeMarriageYearsCompleted()` – Ehejahre für Hinterbliebenenrente

**Dependencies:** `simulator-data.js`

---

## 6. `simulator-heatmap.js` (~550 Zeilen)
SVG-Rendering für Parameter-Sweeps und Heatmaps.

**Hauptfunktionen:**
- `renderHeatmapSVG()` – erzeugt SVG-Heatmap mit Farbskala
- `getColorForValue()` – Farbzuordnung nach Metrik
- `renderParameterSweepResults()` – vollständige Sweep-Ergebnisdarstellung

**Dependencies:** `simulator-utils.js`

---

## 7. `simulator-utils.js` (~260 Zeilen)
Zufallszahlen, Statistik und Formatierung.

**Hauptfunktionen:**
- `rng(seed)` – Seeded PRNG mit `.fork()` für unabhängige Streams
- `quantile()` / `mean()` / `sum()` – Statistikfunktionen
- `formatCurrency()` / `formatCurrencyShortLog()` – Währungsformatierung
- `shortenText()` – Text auf Maximallänge kürzen

**Dependencies:** keine

---

## 8. `simulator-data.js` (~330 Zeilen)
Historische Daten, Mortalitätstafeln, Stress-Presets.

**Exporte:**
- `HISTORICAL_DATA` – historische Marktdaten (MSCI, Gold, Inflation)
- `MORTALITY_TABLE` – Sterbetafeln nach Geschlecht und Alter
- `CARE_ENTRY_PROB` – Pflegeeintrittswahrscheinlichkeiten (BARMER)
- `STRESS_PRESETS` – Stresstest-Szenarien (GFC, Stagflation, etc.)

**Dependencies:** keine

---

## Modulabhängigkeiten

```
simulator-main.js
  ├─ simulator-backtest.js
  │    ├─ simulator-utils.js
  │    ├─ simulator-data.js
  │    ├─ simulator-portfolio.js
  │    ├─ simulator-engine.js
  │    └─ simulator-results.js
  ├─ simulator-engine.js
  │    ├─ simulator-utils.js
  │    └─ simulator-data.js
  ├─ simulator-results.js
  │    ├─ simulator-utils.js
  │    ├─ simulator-heatmap.js
  │    └─ simulator-data.js
  ├─ simulator-portfolio.js
  │    └─ simulator-data.js
  ├─ simulator-heatmap.js
  │    └─ simulator-utils.js
  ├─ simulator-utils.js
  └─ simulator-data.js
```

---

## Datenfluss

### Monte-Carlo-Simulation
1. `simulator-main.js`: `runMonteCarlo()` startet Simulation
2. `simulator-portfolio.js`: `initializePortfolio()` erstellt Anfangszustand
3. `simulator-engine.js`: Jahr-für-Jahr-Simulation mit Pflegefall-Logik
4. `simulator-main.js`: Aggregiert Ergebnisse, identifiziert charakteristische Szenarien
5. `simulator-results.js`: `displayMonteCarloResults()` zeigt Ergebnisse und Szenario-Logs

### Parameter-Sweep
1. `simulator-main.js`: `runParameterSweep()` iteriert über Parameter-Kombinationen
2. Für jede Kombination: Mini-Monte-Carlo mit reduzierter Anzahl
3. `simulator-heatmap.js`: `renderHeatmapSVG()` visualisiert Ergebnisse

### Backtest
1. `simulator-main.js`: delegiert Backtests an `simulator-backtest.js`
2. `simulator-backtest.js`: `runBacktest()` orchestriert Simulation und Log-Aufbereitung
3. `simulator-engine.js`: Jahr-für-Jahr mit echten historischen Daten
4. `simulator-backtest.js`: `renderBacktestLog()` zeigt Jahresprotokoll

---

## Szenario-Log-System

Nach jeder Monte-Carlo-Simulation werden 30 Szenarien gespeichert:

### 15 Charakteristische Szenarien
- **Vermögensbasiert:** Worst, P5, P10, P25, Median, P75, P90, P95, Best
- **Pflege-spezifisch:** Worst MIT Pflege, längste Pflegedauer, höchste Kosten, frühester Eintritt
- **Risiko:** Längste Lebensdauer, maximale Kürzung

### 15 Zufällige Szenarien
- Gleichmäßig über alle Runs verteilt
- Zeigen typisches Simulationsverhalten

### Speicherung
- Alle Log-Zeilen pro Szenario
- Metadaten: Endvermögen, Failed-Status, Lebensdauer, Pflege-Status
- Export als JSON/CSV möglich

---

## Entwicklungstipps

1. **Neue Features:** In `simulator-main.js` starten, dann zu spezialisierten Modulen extrahieren
2. **Pflege-Logik:** In `simulator-engine.js` (`makeDefaultCareMeta`, `updateCareMeta`, `calcCareCost`)
3. **Neue KPIs:** In `simulator-results.js` (`displayMonteCarloResults`, `createKpiCard`)
4. **Tests:** `test-dual-care.js` für Pflege-Logik, `sim-parity-smoketest.js` für Regressionstests
5. **Dev-Modus:** `localStorage.setItem('sim.devMode', '1')` für erweiterte Diagnosen

---

**Last Updated:** 2025-11-25
