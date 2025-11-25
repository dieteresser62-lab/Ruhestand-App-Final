# Simulator-App – Modulübersicht

Die Simulator-App ist inzwischen in mehrere spezialisierte ES6-Module zerlegt. Die zentralen Abläufe (Monte-Carlo, Sweep, Backtests, Pflege-UI) leben nicht mehr als Monolith in `simulator-main.js`, sondern wurden in klar abgegrenzte Dateien ausgelagert. Dieses Dokument beschreibt Zweck, Haupt-Exports, Einbindungspunkte und die gewünschte Aufteilung neuer Features.

---

## 1. `simulator-main.js` (~600 Zeilen)
UI-Orchestrierung und Klammer um die ausgelagerten Feature-Module. Registriert Event-Handler, lädt/persistiert Eingaben und ruft die spezialisierten Startpunkte auf.

**Hauptaufgaben / Exporte:**
- `initializeUI()` – UI-Bootstrap: verbindet Buttons mit `runMonteCarlo`, `runBacktest`, `runParameterSweep`, setzt Debug-Toggles, lädt letzte Detailstufe für Logs.
- Weiterleitung der Kern-Handler: Buttons und Hotkeys rufen direkt Funktionen aus `simulator-monte-carlo.js`, `simulator-backtest.js` und `simulator-sweep.js` auf.
- Drehscheibe für gemeinsame Hilfsfunktionen (`simulator-main-helpers.js`) und Shared-Kontext (`WORST_LOG_DETAIL_KEY` aus `simulator-results.js`).

**Einbindung:** Wird von `Simulator.html` geladen und importiert alle übrigen Simulator-Module. Neue UI-Buttons sollten hier mit dem passenden Fachmodul verdrahtet werden.

---

## 2. `simulator-monte-carlo.js` (~780 Zeilen)
Ausgelagerter Startpunkt für Monte-Carlo-Simulationen inkl. Szenario-Logging.

**Hauptfunktionen / Exporte:**
- `runMonteCarlo()` – validiert UI-Parameter (Seed, Dauer, Methode), baut Stress-Kontext und startet die Simulation.
- `readMonteCarloParameters()` – defensives Auslesen der UI-Inputs.

**Einbindung:** Wird von `simulator-main.js` importiert und im UI-Bootstrap an den Start-Button (`#mcButton`) gekoppelt. Alle Monte-Carlo-spezifischen Anpassungen sollten hier erfolgen, damit `simulator-main.js` schlank bleibt.

**Dependencies:** `simulator-engine.js`, `simulator-portfolio.js`, `simulator-results.js`, `simulator-sweep-utils.js`, `simulator-utils.js`, `simulator-data.js`, `cape-utils.js`.

---

## 3. `simulator-sweep.js` (~360 Zeilen)
Sweep-spezifische Logik mit Guardrails für Partner:innen-Felder und Heatmap-Ausgabe.

**Hauptfunktionen / Exporte:**
- `runParameterSweep()` – iteriert über Whitelist-Parameter, führt Mini-Monte-Carlo aus und leitet Ergebnisse an die Heatmap weiter.
- `displaySweepResults()` – rendert Sweep-KPIs und Statushinweise.
- `initSweepDefaultsWithLocalStorageFallback()` – lädt Sweep-Voreinstellungen und setzt Dev-Mode-Defaults.

**Einbindung:** Button-Hooks in `initializeUI()` (Sweep-Tab). Nutzt `simulator-sweep-utils.js` für Whitelist/Clone-Logik und `simulator-heatmap.js` für das Rendering.

**Dependencies:** `simulator-monte-carlo.js` (Mini-Läufe), `simulator-heatmap.js`, `simulator-results.js`, `simulator-sweep-utils.js`, `simulator-utils.js`.

---

## 4. `simulator-sweep-utils.js` (~220 Zeilen)
Gemeinsame Helfer für Sweep, Rente-2-Schutz und Deep-Clones.

**Hauptfunktionen / Exporte:**
- `normalizeWidowOptions()` / `computeMarriageYearsCompleted()` – Abgleich von Hinterbliebenen-Optionen.
- `deepClone()` / `cloneStressContext()` – Side-Effect-freie Kopien für Sweep-Zellen.
- `setNested()` / `withNoLSWrites()` – Hilfsfunktionen für sichere Mutationen.

**Einbindung:** Genutzt von `simulator-sweep.js`, `simulator-main.js` (Renten-Invarianz-Checks) und `simulator-monte-carlo.js`.

**Dependencies:** keine externen Module, nur Standard-APIs.

---

## 5. `simulator-backtest.js` (~360 Zeilen)
Historische Backtests inkl. UI-Integration und Log-Export.

**Hauptfunktionen / Exporte:**
- `initializeBacktestUI()` – verdrahtet UI-Buttons und persistiert Nutzereinstellungen.
- `runBacktest()` – führt Jahres-Simulation mit echten Daten aus.
- `renderBacktestLog()` / `exportBacktestLogData()` – Darstellung und CSV-Download.

**Einbindung:** Wird in `initializeUI()` importiert und an die Backtest-Controls gekoppelt. Nutzt `simulator-main-helpers.js` für Formatierung/Export.

**Dependencies:** `simulator-engine.js`, `simulator-portfolio.js`, `simulator-main-helpers.js`, `simulator-utils.js`, `simulator-data.js`.

---

## 6. `simulator-main-helpers.js` (~280 Zeilen)
Formatierungs- und Export-Helfer, damit Tabellen-/KPI-Aufbereitung nicht in `simulator-main.js` landet.

**Hauptfunktionen / Exporte:**
- `computeAdjPctForYear()` / `applyPensionTax()` – Renten-spezifische Hilfen für Berechnungen und Steuerung.
- `formatCellForDisplay()` / `formatColumnValue()` / `prepareRowsForExport()` – Tabellengenerierung und CSV-Helpers.
- `triggerDownload()` – generischer Download-Wrapper.

**Einbindung:** Von `simulator-main.js`, `simulator-backtest.js` und `simulator-results.js` genutzt. Neue UI-nahe Helfer sollten hier statt in `simulator-main.js` landen.

**Dependencies:** `simulator-utils.js`.

---

## 7. `simulator-ui-pflege.js` (~180 Zeilen)
Pflege-spezifische UI-Initialisierung (Presets, Badges, Toggles).

**Hauptfunktionen / Exporte:**
- `initializePflegeUIControls()` – richtet alle Pflege-Listener ein (Preset-Auswahl, Info-Badges, Panels sichtbar/unsichtbar).
- `applyPflegeKostenPreset()` / `updatePflegePresetHint()` / `updatePflegeUIInfo()` – UI-Verhalten bei Presets und Kontext-Hinweisen.

**Einbindung:** Wird in `initializeUI()` aufgerufen, bevor Simulationen gestartet werden. Erwartet vorhandene DOM-IDs aus dem Pflege-Panel. Pflege-spezifische UI-Erweiterungen gehören hierher, nicht in `simulator-main.js`.

**Dependencies:** `simulator-utils.js`, `simulator-data.js`.

---

## 8. `simulator-ui-rente.js` (~240 Zeilen)
Persistenz und Migration der Renten-Eingaben (Person 1 & 2) inklusive Legacy-Felder.

**Hauptfunktionen / Exporte:**
- `initRente2ConfigWithLocalStorage()` – liest/wartet Rentenfelder, migriert alte Keys, synchronisiert Partner-UI.

**Einbindung:** Direkt aus `initializeUI()` aufgerufen, damit vor Monte-Carlo/Sweep alle Rentenfelder konsistent geladen sind.

**Dependencies:** keine externen Module.

---

## 9. `simulator-engine.js` (~1.080 Zeilen)
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

## 10. `simulator-results.js` (~640 Zeilen)
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

## 11. `simulator-portfolio.js` (~510 Zeilen)
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

## 12. `simulator-heatmap.js` (~480 Zeilen)
SVG-Rendering für Parameter-Sweeps und Heatmaps.

**Hauptfunktionen:**
- `renderHeatmapSVG()` – erzeugt SVG-Heatmap mit Farbskala
- `getColorForValue()` – Farbzuordnung nach Metrik
- `renderParameterSweepResults()` – vollständige Sweep-Ergebnisdarstellung

**Dependencies:** `simulator-utils.js`

---

## 13. `simulator-utils.js` (~320 Zeilen)
Zufallszahlen, Statistik und Formatierung.

**Hauptfunktionen:**
- `rng(seed)` – Seeded PRNG mit `.fork()` für unabhängige Streams
- `quantile()` / `mean()` / `sum()` – Statistikfunktionen
- `formatCurrency()` / `formatCurrencyShortLog()` – Währungsformatierung
- `shortenText()` – Text auf Maximallänge kürzen

**Dependencies:** keine

---

## 14. `simulator-data.js` (~190 Zeilen)
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
  ├─ simulator-monte-carlo.js
  │    ├─ simulator-engine.js
  │    │    ├─ simulator-utils.js
  │    │    └─ simulator-data.js
  │    ├─ simulator-portfolio.js
  │    │    └─ simulator-data.js
  │    ├─ simulator-results.js
  │    │    ├─ simulator-heatmap.js
  │    │    └─ simulator-utils.js
  │    ├─ simulator-sweep-utils.js
  │    ├─ simulator-utils.js
  │    └─ simulator-data.js
  ├─ simulator-sweep.js
  │    ├─ simulator-monte-carlo.js (Mini-Läufe)
  │    ├─ simulator-heatmap.js
  │    ├─ simulator-results.js
  │    ├─ simulator-sweep-utils.js
  │    └─ simulator-utils.js
  ├─ simulator-backtest.js
  │    ├─ simulator-engine.js
  │    ├─ simulator-portfolio.js
  │    └─ simulator-main-helpers.js
  ├─ simulator-ui-pflege.js
  ├─ simulator-ui-rente.js
  ├─ simulator-main-helpers.js
  ├─ simulator-results.js
  ├─ simulator-portfolio.js
  ├─ simulator-heatmap.js
  ├─ simulator-utils.js
  └─ simulator-data.js
```

---

## Datenfluss & Startpunkte

### Monte-Carlo-Simulation
1. `simulator-main.js`: UI-Bootstrap ruft `runMonteCarlo` aus `simulator-monte-carlo.js` auf.
2. `simulator-portfolio.js`: `initializePortfolio()` erstellt Anfangszustand / Stress-Kontext.
3. `simulator-engine.js`: Jahr-für-Jahr-Simulation mit Pflegefall-Logik.
4. `simulator-monte-carlo.js`: Aggregiert Ergebnisse, identifiziert charakteristische Szenarien.
5. `simulator-results.js`: `displayMonteCarloResults()` zeigt Ergebnisse und Szenario-Logs.

### Parameter-Sweep
1. `simulator-main.js`: Sweep-Button bindet `runParameterSweep()` aus `simulator-sweep.js`.
2. `simulator-sweep.js`: Iteriert über Whitelist-Parameter, ruft Mini-Monte-Carlo aus `simulator-monte-carlo.js`.
3. `simulator-heatmap.js`: `renderHeatmapSVG()` visualisiert Ergebnisse.

### Backtest
1. `simulator-main.js`: Backtest-Controls triggern `runBacktest()` aus `simulator-backtest.js`.
2. `simulator-engine.js`: Jahr-für-Jahr mit echten historischen Daten.
3. `simulator-backtest.js`: `renderBacktestLog()` zeigt Jahresprotokoll.

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

## Init-Pfade & erwartete Schnittstellen

- **App-Bootstrap:** `initializeUI()` in `simulator-main.js` bindet Buttons/Hotkeys und ruft alle Setup-Funktionen. Erwartet, dass DOM-IDs aus `Simulator.html` existieren.
- **Pflege-UI:** `initializePflegeUIControls()` in `simulator-ui-pflege.js` setzt Preset-/Badge-Logik auf. Erwartet Felder `pflegeStufe*`, `pflegeMaxFloor`, `pflegeKostenStaffelPreset` und zeigt/hide Panels per Checkbox `pflegefallLogikAktivieren`.
- **Renten-Persistenz:** `initRente2ConfigWithLocalStorage()` in `simulator-ui-rente.js` liest/migriert Rentenfelder, schaltet Partner-Section (`chkPartnerAktiv`, `sectionRente2`) und schreibt zurück in `localStorage`.
- **Sweep-Voreinstellungen:** `initSweepDefaultsWithLocalStorageFallback()` in `simulator-sweep.js` lädt Dev/Prod-Defaults, liest `localStorage` und setzt Guardrails (Whitelist/Blocklist). Erwartet Zugriff auf Sweep-Formularfelder und das Dev-Mode-Toggle.
- **Backtest-Setup:** `initializeBacktestUI()` in `simulator-backtest.js` verknüpft Zeitraum-/Startknöpfe, ruft `runBacktest()` und nutzt `renderBacktestLog()`/`exportBacktestLogData()` für Ausgabe. Erwartet vorhandene DOM-IDs des Backtest-Tabs.
- **Monte-Carlo-Start:** `runMonteCarlo()` in `simulator-monte-carlo.js` liest `mcAnzahl`, `mcDauer`, `mcBlockSize`, `mcSeed`, `mcMethode` sowie Progress-UI (`mc-progress-bar*`). Liefert nach Abschluss aggregierte Ergebnisse an `displayMonteCarloResults()`.

---

## Platzierung neuer Features & Helfer

- **UI-spezifische Logik (Formular, Presets, Tooltips):** In thematischen UI-Modulen (`simulator-ui-pflege.js`, `simulator-ui-rente.js`) oder generisch in `simulator-main-helpers.js`. `simulator-main.js` sollte nur die Verkabelung übernehmen.
- **Simulation / Domain-Logik:** Pflege-/Renten-/Stressberechnungen gehören in `simulator-engine.js` oder `simulator-portfolio.js`. Monte-Carlo-spezifische Steuerparameter in `simulator-monte-carlo.js`. Sweep-spezifische Regeln in `simulator-sweep.js` bzw. `simulator-sweep-utils.js`.
- **Rendering & Exporte:** Tabellen-/CSV-/Heatmap-Aufbereitung in `simulator-results.js`, `simulator-heatmap.js` oder `simulator-main-helpers.js` (falls UI-nah). Backtest-Ausgaben in `simulator-backtest.js`.
- **Gemeinsame Utilitys:** Statistik/Formatierung bleiben in `simulator-utils.js`. Objekt-Transforms/Clones mit Bezug zu Sweeps oder Renten-Invarianz in `simulator-sweep-utils.js`.
- **Neue Buttons/Flows:** Im UI-Bootstrap (`initializeUI()`) verdrahten und direkt den passenden Modul-Export aufrufen, statt Logik-Blöcke in `simulator-main.js` zu platzieren.

---

## Entwicklungstipps

1. **Neue Features:** Direkt im passenden Fachmodul implementieren (siehe oben) und nur über `initializeUI()` verkabeln.
2. **Pflege-Logik:** In `simulator-engine.js` (`makeDefaultCareMeta`, `updateCareMeta`, `calcCareCost`). UI-Anteile nach `simulator-ui-pflege.js` auslagern.
3. **Neue KPIs:** In `simulator-results.js` (`displayMonteCarloResults`, `createKpiCard`) oder bei Sweep-spezifischen KPIs in `simulator-heatmap.js`.
4. **Persistenz/Helper:** Gemeinsame Formatter/Downloads in `simulator-main-helpers.js`, Sweep-Clones in `simulator-sweep-utils.js`.
5. **Tests:** `test-dual-care.js` für Pflege-Logik, `sim-parity-smoketest.js` für Regressionstests.
6. **Dev-Modus:** `localStorage.setItem('sim.devMode', '1')` für erweiterte Diagnosen.

---

**Last Updated:** 2025-12-04
