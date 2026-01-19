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

## 2. `simulator-monte-carlo.js` (~220 Zeilen)
Koordiniert die Monte-Carlo-Simulation und verbindet DOM-Interaktion mit der reinen Simulationslogik.

**Hauptfunktionen / Exporte:**
- `runMonteCarlo()` – liest UI-Parameter, orchestriert `monte-carlo-runner.js` und Web-Worker-Jobs und aktualisiert Progress/UI (Default: 8 Worker, 500 ms Job-Budget).

**Einbindung:** Wird von `simulator-main.js` importiert und im UI-Bootstrap an den Start-Button (`#mcButton`) gekoppelt. Alle Monte-Carlo-spezifischen Anpassungen sollten hier erfolgen, damit `simulator-main.js` schlank bleibt.

**Dependencies:** `monte-carlo-runner.js`, `monte-carlo-ui.js`, `scenario-analyzer.js`, `simulator-portfolio.js`, `simulator-results.js`, `simulator-sweep-utils.js`, `simulator-utils.js`, `simulator-data.js`, `cape-utils.js`.

---

## 3. `monte-carlo-runner.js` (~420 Zeilen)
DOM-freie Simulation, die alle Runs, KPI-Arrays und Pflegemetriken berechnet.

**Hauptfunktionen / Exporte:**
- `runMonteCarloSimulation()` – führt die komplette Simulation aus, sammelt Worst-Run-Logs, Pflege-KPIs und aggregierte Kennzahlen.

**Einbindung:** Wird ausschließlich aus `simulator-monte-carlo.js` aufgerufen. Erwartet fertige Eingaben und Callbacks (Progress, Szenario-Analyzer) und nutzt `simulator-engine-wrapper.js` für die Jahr-für-Jahr-Logik.

**Dependencies:** `simulator-engine-wrapper.js`, `simulator-portfolio.js`, `simulator-results.js` (Portfolio-Helpers), `simulator-sweep-utils.js`, `simulator-utils.js`, `simulator-data.js`, `cape-utils.js`.

---

## 4. `monte-carlo-ui.js` (~150 Zeilen)
Kapselt DOM-Zugriffe für Monte-Carlo (Progressbar, Checkboxen, Parameter-Inputs) und liefert eine UI-Fassade zurück.

**Hauptfunktionen / Exporte:**
- `createMonteCarloUI()` – erzeugt ein UI-Objekt mit Methoden `disableStart()`, `showProgress()`, `updateProgress()`, `finishProgress()`, `readUseCapeSampling()`.
- `readMonteCarloParameters()` – defensives Auslesen der Eingabefelder (Anzahl, Dauer, Blocksize, Seed, Methode).

**Einbindung:** Von `simulator-monte-carlo.js` genutzt. UI-bezogene Änderungen sollten hier gebündelt werden.

---

## 5. `scenario-analyzer.js` (~140 Zeilen)
Sammelt und sortiert Szenarien (Worst, Perzentile, Pflege, Zufalls-Samples) während der Simulation.

**Hauptfunktionen / Exporte:**
- `ScenarioAnalyzer` – Klasse mit `trackScenario()`/`buildScenarioLogs()`, die Metadaten und Logzeilen für 30 Szenarien zurückliefert.

**Einbindung:** Von `simulator-monte-carlo.js` instanziiert und als Callback an den Runner übergeben.

---

## 6. `simulator-sweep.js` (~360 Zeilen)
Sweep-spezifische Logik mit Guardrails für Partner:innen-Felder und Heatmap-Ausgabe.

**Hauptfunktionen / Exporte:**
- `runParameterSweep()` – iteriert über Whitelist-Parameter, nutzt Worker-Jobs (Fallback seriell) und leitet Ergebnisse an die Heatmap weiter.
- `displaySweepResults()` – rendert Sweep-KPIs und Statushinweise.
- `initSweepDefaultsWithLocalStorageFallback()` – lädt Sweep-Voreinstellungen und setzt Defaults.

**Einbindung:** Button-Hooks in `initializeUI()` (Sweep-Tab). Nutzt `simulator-sweep-utils.js` für Whitelist/Clone-Logik und `simulator-heatmap.js` für das Rendering.

**Dependencies:** `monte-carlo-runner.js` (Mini-Läufe), `simulator-heatmap.js`, `simulator-results.js`, `simulator-sweep-utils.js`, `simulator-utils.js`, `simulator-data.js`.

---

## 7. `simulator-sweep-utils.js` (~220 Zeilen)
## 8. `sweep-runner.js` (neu)
DOM-freier Sweep-Runner fuer Worker-Jobs (Combos + RunRanges) mit deterministischer Seeding-Logik.
Gemeinsame Helfer für Sweep, Rente-2-Schutz und Deep-Clones.

**Hauptfunktionen / Exporte:**
- `normalizeWidowOptions()` / `computeMarriageYearsCompleted()` – Abgleich von Hinterbliebenen-Optionen.
- `deepClone()` / `cloneStressContext()` – Side-Effect-freie Kopien für Sweep-Zellen.
- `setNested()` / `withNoLSWrites()` – Hilfsfunktionen für sichere Mutationen.

**Einbindung:** Genutzt von `simulator-sweep.js`, `simulator-main.js` (Renten-Invarianz-Checks) und `simulator-monte-carlo.js`.

**Dependencies:** keine externen Module, nur Standard-APIs.

---

## 8. `simulator-backtest.js` (~360 Zeilen)
Historische Backtests inkl. UI-Integration und Log-Export.

**Hauptfunktionen / Exporte:**
- `initializeBacktestUI()` – verdrahtet UI-Buttons und persistiert Nutzereinstellungen.
- `runBacktest()` – führt Jahres-Simulation mit echten Daten aus.
- `renderBacktestLog()` / `exportBacktestLogData()` – Darstellung und CSV-Download.

**Einbindung:** Wird in `initializeUI()` importiert und an die Backtest-Controls gekoppelt. Nutzt `simulator-main-helpers.js` für Formatierung/Export.

**Dependencies:** `simulator-engine-wrapper.js`, `simulator-portfolio.js`, `simulator-main-helpers.js`, `simulator-utils.js`, `simulator-data.js`.

---

## 9. `simulator-main-helpers.js` (~280 Zeilen)
Formatierungs- und Export-Helfer, damit Tabellen-/KPI-Aufbereitung nicht in `simulator-main.js` landet.

**Hauptfunktionen / Exporte:**
- `computeAdjPctForYear()` / `applyPensionTax()` – Renten-spezifische Hilfen für Berechnungen und Steuerung.
- `formatCellForDisplay()` / `formatColumnValue()` / `prepareRowsForExport()` – Tabellengenerierung und CSV-Helpers.
- `triggerDownload()` – generischer Download-Wrapper.

**Einbindung:** Von `simulator-main.js`, `simulator-backtest.js` und `simulator-results.js` genutzt. Neue UI-nahe Helfer sollten hier statt in `simulator-main.js` landen.

**Dependencies:** `simulator-utils.js`.

---

## 10. `simulator-ui-pflege.js` (~180 Zeilen)
Pflege-spezifische UI-Initialisierung (Presets, Badges, Toggles).

**Hauptfunktionen / Exporte:**
- `initializePflegeUIControls()` – richtet alle Pflege-Listener ein (Preset-Auswahl, Info-Badges, Panels sichtbar/unsichtbar).
- `applyPflegeKostenPreset()` / `updatePflegePresetHint()` / `updatePflegeUIInfo()` – UI-Verhalten bei Presets und Kontext-Hinweisen.

**Einbindung:** Wird in `initializeUI()` aufgerufen, bevor Simulationen gestartet werden. Erwartet vorhandene DOM-IDs aus dem Pflege-Panel. Pflege-spezifische UI-Erweiterungen gehören hierher, nicht in `simulator-main.js`.

**Dependencies:** `simulator-utils.js`, `simulator-data.js`.

---

## 11. `simulator-ui-rente.js` (~240 Zeilen)
Persistenz und Migration der Renten-Eingaben (Person 1 & 2) inklusive Legacy-Felder.

**Hauptfunktionen / Exporte:**
- `initRente2ConfigWithLocalStorage()` – liest/wartet Rentenfelder, migriert alte Keys, synchronisiert Partner-UI.

**Einbindung:** Direkt aus `initializeUI()` aufgerufen, damit vor Monte-Carlo/Sweep alle Rentenfelder konsistent geladen sind.

**Dependencies:** keine externen Module.

---

## 12. `simulator-engine-direct.js` & `simulator-engine-helpers.js`
Kernlogik für Jahr-für-Jahr-Simulation (Direct Engine).

**Hauptfunktionen:**
- `simulateSingleYear()` (Direct) – simuliert ein Jahr via EngineAPI
- `sampleNextYearData()` (Helpers) – sampelt nächstes Jahr (historisch/Regime/Block)
- `makeDefaultCareMeta()` / `updateCareMeta()` (Helpers) – Pflegefall-Zustandsmaschine
- `calcCareCost()` (Helpers) – berechnet Pflege-Kosten nach Grad
- `computeCareMortalityMultiplier()` (Helpers) – erhöhte Sterblichkeit bei Pflege
- `computeHouseholdFlexFactor()` (Helpers) – Flex-Reduktion bei Pflege
- `initMcRunState()` (Helpers) – initialisiert Zustand für einen MC-Lauf

**Dependencies:** `simulator-utils.js`, `simulator-data.js`, `EngineAPI` (engine.js)

---

## 13. `simulator-results.js` (~320 Zeilen)
Aggregation der Monte-Carlo-Ausgabe, Orchestrierung von KPI-Berechnung und Rendering.

**Hauptfunktionen:**
- `displayMonteCarloResults()` – zeigt MC-Ergebnisse mit Szenario-Log-Auswahl
- `renderWorstRunLog()` – rendert Jahresprotokoll als HTML-Tabelle
- `getWorstRunColumnDefinitions()` – Spaltenkonfiguration für Log-Tabellen
- `loadDetailLevel()` / `persistDetailLevel()` – Detail-Einstellungen speichern
- leitet an `results-metrics.js` (Berechnungen) und `results-renderers.js` (DOM)

**Features:**
- Dropdown für 30 Szenario-Logs (charakteristische + zufällige)
- Checkboxen für Pflege-Details und detailliertes Log
- JSON/CSV-Export für ausgewählte Szenarien
- Pflege-KPI-Dashboard mit Dual-Care-Metriken

**Dependencies:** `simulator-utils.js`, `simulator-heatmap.js`, `simulator-data.js`, `results-metrics.js`, `results-renderers.js`, `results-formatting.js`.

---

## 14. `results-metrics.js` (~200 Zeilen)
Berechnet alle KPIs (Perzentile, Quoten, Pflege-Kosten/Overlap, Shortfall-Deltas) ohne DOM-Zugriffe.

**Hauptfunktionen:**
- `computeKpiCards()` / `computeScenarioSummary()` – strukturierte KPI-Objekte für Renderer.

**Dependencies:** `results-formatting.js`, `simulator-utils.js`.

---

## 15. `results-renderers.js` (~240 Zeilen)
Rendering-Layer für KPI-Karten, Tabellen und Badges.

**Hauptfunktionen:**
- `renderKpiCards()` – erzeugt HTML für KPI-Dashboard.
- `renderScenarioSelector()` – baut die Szenario-Dropdowns auf.

**Dependencies:** `results-formatting.js`, `simulator-utils.js`.

---

## 16. `results-formatting.js` (~160 Zeilen)
Hält Formatierungs-Utilities und kleine Adapter, um Renderer und Metriken von DOM-Details zu entkoppeln.

**Hauptfunktionen / Exporte:**
- `formatKpiValue()` / `formatPct()` / `formatCurrency()` – zentrale Formatter für KPI-Ausgaben.

**Dependencies:** `simulator-utils.js`.

---

## 17. `simulator-portfolio.js` (~510 Zeilen)
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

## 18. `simulator-heatmap.js` (~480 Zeilen)
SVG-Rendering für Parameter-Sweeps und Heatmaps.

**Hauptfunktionen:**
- `renderHeatmapSVG()` – erzeugt SVG-Heatmap mit Farbskala
- `getColorForValue()` – Farbzuordnung nach Metrik
- `renderParameterSweepResults()` – vollständige Sweep-Ergebnisdarstellung

**Dependencies:** `simulator-utils.js`

---

## 19. `simulator-utils.js` (~320 Zeilen)
Zufallszahlen, Statistik und Formatierung.

**Hauptfunktionen:**
- `rng(seed)` – Seeded PRNG mit `.fork()` für unabhängige Streams
- `quantile()` / `mean()` / `sum()` – Statistikfunktionen
- `formatCurrency()` / `formatCurrencyShortLog()` – Währungsformatierung
- `shortenText()` – Text auf Maximallänge kürzen

**Dependencies:** keine

---

## 20. `simulator-data.js` (~190 Zeilen)
Historische Daten, Mortalitätstafeln, Stress-Presets.

**Exporte:**
- `HISTORICAL_DATA` – historische Marktdaten (MSCI, Gold, Inflation)
- `MORTALITY_TABLE` – Sterbetafeln nach Geschlecht und Alter
- `CARE_ENTRY_PROB` – Pflegeeintrittswahrscheinlichkeiten (BARMER)
- `STRESS_PRESETS` – Stresstest-Szenarien (GFC, Stagflation, Lost Decade, System-Krise etc.)

**Dependencies:** keine

---

## 21. `simulator-profile-inputs.js` (~430 Zeilen)
Aggregiert Profildaten zu Simulator-Inputs für Multi-Profil-Setups.

**Hauptfunktionen:**
- `buildSimulatorInputsFromProfileData()` – liest Profildaten (localStorage) und baut vollständige Simulator-Inputs
- `combineSimulatorProfiles()` – aggregiert mehrere Profile zu einem kombinierten Input-Objekt (1–2 Personen)

**Besonderheiten:**
- Gold-Validierung: `goldAktiv` nur true wenn `goldZielProzent > 0`
- Tranchen-Aggregation: Fügt detaillierte Tranchen aller Profile zusammen
- Fallback-Logik: Nutzt Balance-Werte wenn Simulator-Felder leer sind
- Gewichtete Mittelung für Steuersätze, Aktienquote und Rebalancing-Parameter

**Dependencies:** `simulator-data.js`, `balance-config.js`

---

## 22. `profile-storage.js` (~290 Zeilen)
Profil-Registry und Persistenz-Layer für Multi-User-Verwaltung.

**Hauptfunktionen:**
- `listProfiles()` / `getProfileMeta()` / `getProfileData()` – Profil-Registry-Zugriff
- `createProfile()` / `renameProfile()` / `deleteProfile()` – CRUD-Operationen
- `switchProfile()` – Wechselt aktives Profil (speichert aktuelles, lädt neues)
- `saveCurrentProfileFromLocalStorage()` – Speichert profilspezifische Keys in Registry
- `exportProfilesBundle()` / `importProfilesBundle()` – Backup/Restore aller Profile

**Profilspezifische Keys:**
- `balance_data` (Balance-App Inputs)
- `depot_tranchen` (Depot-Positionen)
- Alle Keys mit Prefix `sim_` (Simulator-Inputs)
- Snapshots mit Prefix `rs_snapshot_`

**Dependencies:** `balance-config.js`

---

## 23. `profile-manager.js` (~190 Zeilen)
UI-Steuerung für Profilverwaltung (index.html).

**Hauptfunktionen:**
- `renderProfiles()` – Zeigt Profilliste mit Checkboxen
- `refreshPrimaryOptions()` – Aktualisiert Primary-Profil Dropdown
- Event-Handler für Erstellen, Umbenennen, Löschen, Aktivieren, Export, Import

**Dependencies:** `profile-storage.js`

---

## Modulabhängigkeiten

```
simulator-main.js
  ├─ simulator-monte-carlo.js
  │    ├─ monte-carlo-ui.js
  │    ├─ monte-carlo-runner.js
  │    │    ├─ simulator-engine-wrapper.js
  │    │    │    ├─ simulator-engine-direct.js
  │    │    │    └─ simulator-engine-helpers.js
  │    │    ├─ simulator-portfolio.js
  │    │    │    └─ simulator-data.js
  │    │    ├─ simulator-results.js
  │    │    │    ├─ results-metrics.js
  │    │    │    ├─ results-renderers.js
  │    │    │    ├─ results-formatting.js
  │    │    │    └─ simulator-utils.js
  │    │    ├─ simulator-sweep-utils.js
  │    │    ├─ simulator-utils.js
  │    │    └─ simulator-data.js
  │    ├─ scenario-analyzer.js
  │    └─ cape-utils.js
  ├─ simulator-sweep.js
  │    ├─ monte-carlo-runner.js (Mini-Läufe)
  │    ├─ simulator-heatmap.js
  │    ├─ simulator-results.js
  │    ├─ simulator-sweep-utils.js
  │    └─ simulator-utils.js
  ├─ simulator-backtest.js
  │    ├─ simulator-engine-wrapper.js
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
2. `simulator-monte-carlo.js`: Erstellt die UI-Fassade, normalisiert Eingaben/Witwen-Optionen und delegiert an den Runner.
3. `monte-carlo-runner.js`: Führt die reinen Simulationen durch (inkl. Pflege-KPIs) und nutzt `simulator-engine-wrapper.js` für die Jahresschleifen.
4. `scenario-analyzer.js`: Zeichnet Worst/Perzentil-/Pflege-/Zufalls-Szenarien während der Runs auf.
5. `simulator-results.js`: `displayMonteCarloResults()` zeigt Aggregationen und Szenario-Logs an.

### Parameter-Sweep
1. `simulator-main.js`: Sweep-Button bindet `runParameterSweep()` aus `simulator-sweep.js`.
2. `simulator-sweep.js`: Iteriert über Whitelist-Parameter, nutzt Worker-Jobs (Fallback seriell).
3. `simulator-heatmap.js`: `renderHeatmapSVG()` visualisiert Ergebnisse.

### Backtest
1. `simulator-main.js`: Backtest-Controls triggern `runBacktest()` aus `simulator-backtest.js`.
2. `simulator-engine-wrapper.js`: Jahr-für-Jahr mit echten historischen Daten.
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
- **Sweep-Voreinstellungen:** `initSweepDefaultsWithLocalStorageFallback()` in `simulator-sweep.js` lädt Defaults, liest `localStorage` und setzt Guardrails (Whitelist/Blocklist). Erwartet Zugriff auf Sweep-Formularfelder und das Toggle.
- **Backtest-Setup:** `initializeBacktestUI()` in `simulator-backtest.js` verknüpft Zeitraum-/Startknöpfe, ruft `runBacktest()` und nutzt `renderBacktestLog()`/`exportBacktestLogData()` für Ausgabe. Erwartet vorhandene DOM-IDs des Backtest-Tabs.
- **Monte-Carlo-Start:** `runMonteCarlo()` in `simulator-monte-carlo.js` liest `mcAnzahl`, `mcDauer`, `mcBlockSize`, `mcSeed`, `mcMethode` sowie Progress-UI (`mc-progress-bar*`). Liefert nach Abschluss aggregierte Ergebnisse an `displayMonteCarloResults()`.

---

## Platzierung neuer Features & Helfer

- **UI-spezifische Logik (Formular, Presets, Tooltips):** In thematischen UI-Modulen (`simulator-ui-pflege.js`, `simulator-ui-rente.js`) oder generisch in `simulator-main-helpers.js`. `simulator-main.js` sollte nur die Verkabelung übernehmen.
- **Simulation / Domain-Logik:** Pflege-/Renten-/Stressberechnungen gehören in `simulator-engine-helpers.js`, `simulator-engine-direct.js` oder `simulator-portfolio.js`. Monte-Carlo-spezifische Steuerparameter in `simulator-monte-carlo.js`. Sweep-spezifische Regeln in `simulator-sweep.js` bzw. `simulator-sweep-utils.js`.
- **Rendering & Exporte:** Tabellen-/CSV-/Heatmap-Aufbereitung in `simulator-results.js`, `simulator-heatmap.js` oder `simulator-main-helpers.js` (falls UI-nah). Backtest-Ausgaben in `simulator-backtest.js`.
- **Gemeinsame Utilitys:** Statistik/Formatierung bleiben in `simulator-utils.js`. Objekt-Transforms/Clones mit Bezug zu Sweeps oder Renten-Invarianz in `simulator-sweep-utils.js`.
- **Neue Buttons/Flows:** Im UI-Bootstrap (`initializeUI()`) verdrahten und direkt den passenden Modul-Export aufrufen, statt Logik-Blöcke in `simulator-main.js` zu platzieren.

---

## Entwicklungstipps

1. **Neue Features:** Direkt im passenden Fachmodul implementieren (siehe oben) und nur über `initializeUI()` verkabeln.
2. **Pflege-Logik:** In `simulator-engine-helpers.js`. UI-Anteile nach `simulator-ui-pflege.js` auslagern.
3. **Neue KPIs:** In `simulator-results.js` (`displayMonteCarloResults`, `createKpiCard`) oder bei Sweep-spezifischen KPIs in `simulator-heatmap.js`.
4. **Persistenz/Helper:** Gemeinsame Formatter/Downloads in `simulator-main-helpers.js`, Sweep-Clones in `simulator-sweep-utils.js`.
5. **Tests:** `npm test` für Regressionstests und Pflege-Logik.
6. **

---

**Last Updated:** 2025-12-19
