# Simulator-App – Modulübersicht

Die Simulator-App ist inzwischen in mehrere spezialisierte ES6-Module zerlegt. Die zentralen Abläufe (Monte-Carlo, Sweep, Backtests, Pflege-UI) leben nicht mehr als Monolith in `simulator-main.js`, sondern wurden in klar abgegrenzte Dateien ausgelagert. Dieses Dokument beschreibt Zweck, Haupt-Exports, Einbindungspunkte und die gewünschte Aufteilung neuer Features.

---

## 1. `simulator-main.js` (Fassade)
UI-Orchestrierung und Klammer um die ausgelagerten Feature-Module. Registriert Event-Handler, lädt/persistiert Eingaben und ruft die spezialisierten Startpunkte auf.

**Hauptaufgaben / Exporte:**
- `initializeSimulatorApp()` – UI-Bootstrap: verbindet Buttons mit `runMonteCarlo`, `runBacktest`, `runParameterSweep`, setzt Debug-Toggles, lädt letzte Detailstufe für Logs.
- Weiterleitung der Kern-Handler: Buttons und Hotkeys rufen direkt Funktionen aus `simulator-monte-carlo.js`, `simulator-backtest.js` und `simulator-sweep.js` auf.
- Drehscheibe für gemeinsame Hilfsfunktionen (`simulator-main-helpers.js`) und Shared-Kontext (`WORST_LOG_DETAIL_KEY` aus `simulator-results.js`).

**Einbindung:** Wird von `Simulator.html` geladen und importiert alle übrigen Simulator-Module. Neue UI-Buttons sollten hier mit dem passenden Fachmodul verdrahtet werden.

**Helper-Module (ausgelagert):**
- `simulator-main-init.js` – Bootstrapping & Orchestrierung
- `simulator-main-input-persist.js` – Persistenz + Start-Portfolio-Refresh
- `simulator-main-rent-adjust.js` – Rentenanpassungs-UI
- `simulator-main-accumulation.js` – Ansparphase-UI
- `simulator-main-sweep-ui.js` – Sweep-UI + Grid-Size
- `simulator-main-tabs.js` – Tab-Umschaltung
- `simulator-main-profiles.js` – Profilverbund-Auswahl
- `simulator-main-reset.js` – Reset-Button
- `simulator-main-stress.js` – Stress-Preset-Select
- `simulator-main-partner.js` – Partner-UI Toggle
- `simulator-main-sweep-selftest.js` – Sweep-Selbsttest (Dev)

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
**Hauptfunktionen / Exporte:**
- `runMonteCarloSimulation()` – Führt die komplette Simulation aus, sammelt Worst-Run-Logs, Pflege-KPIs und aggregierte Kennzahlen.
- Implementiert Ruin-Logik (Depot < 100€) und Ansparphase-Übergang.

**Einbindung:** Wird ausschließlich aus `simulator-monte-carlo.js` aufgerufen. Erwartet fertige Eingaben und Callbacks (Progress, Szenario-Analyzer) und nutzt `simulator-engine-wrapper.js` (delegiert an Direct Engine) für die Jahr-für-Jahr-Logik.

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
Gemeinsame Helfer für Sweep, Rente-2-Schutz und Deep-Clones.

---

## 8. `sweep-runner.js`
DOM-freier Sweep-Runner für Worker-Jobs (Combos + RunRanges) mit deterministischer Seeding-Logik.

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

## 16. `auto_optimize.js` & `auto_optimize_ui.js`
Auto-Optimierung für Parameter (LHS + Verfeinerung) und UI-Bedienung. Details siehe: `docs/AUTO_OPTIMIZE_DETAILS.md`.

**Hauptfunktionen / Exporte:**
- `runAutoOptimize()` – Orchestriert den 3-stufigen Prozess (Coarse -> Refinement -> Final).
- UI-Integration (Start, Progress, Ergebnisdarstellung) in `auto_optimize_ui.js`.

**Modul-Split:**
Die Logik wurde in spezialisierte Module zerlegt, um Wartbarkeit und Testbarkeit zu erhöhen:

- `auto-optimize-worker.js` – Der Worker-To-Main-Adapter. Führt Kandidaten-Evaluationen im Worker aus.
- `auto-optimize-evaluate.js` – Bewertet Kandidaten anhand der Zielfunktion (Score-Berechnung).
- `auto-optimize-metrics.js` – Definiert Metriken (Success Rate, Median End Wealth) und Constraints.
- `auto-optimize-sampling.js` – Algorithmen für die Kandidatengenerierung (Latin Hypercube, Nachbarschaft).
- `auto-optimize-utils.js` – Hilfsfunktionen (Caching, Logging, ID-Generierung).
- `auto-optimize-params.js` – Definition der Parameter-Räume und Mapping (UI <-> Intern).

**Dependencies:** `simulator-portfolio.js`, `monte-carlo-runner.js`, `simulator-engine-helpers.js`, `workers/worker-pool.js`.

---

## 17. `results-formatting.js` (~160 Zeilen)
Hält Formatierungs-Utilities und kleine Adapter, um Renderer und Metriken von DOM-Details zu entkoppeln.

**Hauptfunktionen / Exporte:**
- `formatCurrencySafe()` – Währungsformat mit Fallback
- `formatNumberWithUnit()` / `formatPercentage()` – Zahlen-/Prozent-Formatter
- `sanitizeDescription()` – Text-Sanitizing für KPI-Labels

**Dependencies:** `shared-formatting.js`.

---

## 18. `shared-formatting.js` (~140 Zeilen)
Zentrale Formatierer für Währung, Zahlen und Einheiten (Balance + Simulator).

**Hauptfunktionen / Exporte:**
- `formatCurrency()` / `formatCurrencyShortLog()` / `formatCurrencyRounded()` – Währungs-Formatter
- `formatNumber()` – Ganzzahlformatierung
- `formatPercent()` / `formatPercentValue()` / `formatPercentRatio()` – Prozent-Formatter
- `formatMonths()` – Monatswerte
- `formatNumberWithUnit()` / `formatPercentage()` – Zahlen-/Prozent-Formatter

**Dependencies:** keine

---

## 19. `simulator-formatting.js` (~20 Zeilen)
Re-Exports der gemeinsamen Formatter für den Simulator.

**Hauptfunktionen / Exporte:**
- Re-export aller Formatter aus `shared-formatting.js`

**Dependencies:** `shared-formatting.js`

---

## 20. `simulator-portfolio.js` (Fassade)
Portfolio-Initialisierung, Renten- und Stress-Kontexte.

**Hauptfunktionen:**
- `getCommonInputs()` – liest alle Portfolio-/Strategie-Inputs
- `updateStartPortfolioDisplay()` – UI-Display für Start-Allokation
- `initializePortfolio()` / `initializePortfolioDetailed()` – Tranchen-Setup
- `computeRentAdjRate()` / `computePensionNext()` – Rentenanpassungslogik
- `buildStressContext()` / `applyStressOverride()` – Stresstest-Szenarien

**Helper-Module (ausgelagert):**
- `simulator-portfolio-inputs.js` – DOM-Input-Parsing
- `simulator-portfolio-display.js` – Start-Portfolio-UI
- `simulator-portfolio-init.js` – Portfolio-Tranchen
- `simulator-portfolio-historical.js` – Regime-Daten vorbereiten
- `simulator-portfolio-pension.js` – Rentenberechnungen
- `simulator-portfolio-stress.js` – Stress-Presets/Overrides
- `simulator-portfolio-tranches.js` – FIFO/Tax/Portfolio-Updates
- `simulator-portfolio-format.js` – Zahlformatierung

**Dependencies:** `simulator-data.js`

---

## 21. `simulator-heatmap.js` (~480 Zeilen)
SVG-Rendering für Parameter-Sweeps und Heatmaps.

**Hauptfunktionen:**
- `renderHeatmapSVG()` – erzeugt SVG-Heatmap mit Farbskala
- `getColorForValue()` – Farbzuordnung nach Metrik
- `renderParameterSweepResults()` – vollständige Sweep-Ergebnisdarstellung

**Dependencies:** `simulator-utils.js`

---

## 22. `simulator-utils.js` (~320 Zeilen)
Zufallszahlen und Statistik (Formatierung wird aus `shared-formatting.js` re-exportiert).

**Hauptfunktionen:**
- `rng(seed)` – Seeded PRNG mit `.fork()` für unabhängige Streams
- `quantile()` / `mean()` / `sum()` – Statistikfunktionen
- `shortenText()` – Text auf Maximallänge kürzen

**Dependencies:** keine

---

## 23. `simulator-data.js` (~190 Zeilen)
Historische Daten (inkl. 1925-1949 Schwarze-Schwan-Erweiterung), Mortalitätstafeln, Stress-Presets.

**Exporte:**
- `HISTORICAL_DATA` – historische Marktdaten (MSCI, Gold, Inflation)
- `MORTALITY_TABLE` – Sterbetafeln nach Geschlecht und Alter
- `CARE_ENTRY_PROB` – Pflegeeintrittswahrscheinlichkeiten (BARMER)
- `STRESS_PRESETS` – Stresstest-Szenarien (GFC, Stagflation, Lost Decade, System-Krise etc.)

**Dependencies:** keine

---

## 24. `simulator-profile-inputs.js` (~430 Zeilen)
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

## 25. `profile-storage.js` (~290 Zeilen)
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

## 26. `profile-manager.js` (~190 Zeilen)
UI-Steuerung für Profilverwaltung (index.html).

**Hauptfunktionen:**
- `renderProfiles()` – Zeigt Profilliste mit Checkboxen
- `refreshPrimaryOptions()` – Aktualisiert Primary-Profil Dropdown
- Event-Handler für Erstellen, Umbenennen, Löschen, Aktivieren, Export, Import

**Dependencies:** `profile-storage.js`

---

## 27. `profile-bridge.js` (~40 Zeilen)
Synchronisiert Profildaten zwischen Balance und Simulator beim Seitenwechsel.

**Hauptfunktionen:**
- `initProfileBridge()` – Initialisiert Profile beim Laden, speichert bei `beforeunload` und `visibilitychange`

**Verhalten:**
- Lädt das aktuelle Profil aus der Registry, wenn die Seite geladen wird
- Speichert automatisch bei Navigation (Tab-Wechsel, Schließen)
- Stellt Konsistenz zwischen Balance.html und Simulator.html sicher

**Dependencies:** `profile-storage.js`

---

## 28. `simulator-engine-wrapper.js` (~110 Zeilen)
Standardisierte Fassade für die Simulationsengine.

**Hauptfunktionen / Exporte:**
- `simulateOneYear()` – Routet Aufrufe zur Direct-Engine-Implementierung
- `getEngine()` – Liefert passende EngineAPI-Instanz
- `getSimulatorFunction()` – Liefert die aktive Simulator-Funktion
- Re-exportiert `initMcRunState` und andere Helpers aus `simulator-engine-helpers.js`

**Features:**
- Performance-Monitoring via Feature-Flags (Elapsed Time Tracking)
- Debug-Logging bei aktiviertem Flag
- Globale Bereitstellung (`window.simulateOneYear`, `window.simulateOneYearDirect`)

**Dependencies:** `feature-flags.js`, `simulator-engine-direct.js`, `simulator-engine-helpers.js`

---

## 29. `simulator-engine-direct-utils.js` (~140 Zeilen)
Utility-Funktionen für die Direct-Engine-Implementierung.

**Hauptfunktionen / Exporte:**
- `euros(x)` – Stellt sicher, dass ein Wert eine nicht-negative Zahl ist
- `computeLiqNeedForFloor(ctx)` – Berechnet benötigte Liquidität für Floor-Bedarf
- `normalizeHouseholdContext(context)` – Normalisiert Haushaltsdaten (p1Alive, p2Alive, widowBenefits)
- `calculateTargetLiquidityBalanceLike()` – Berechnet Liquiditätsziel analog zur Balance-App
- `buildDetailedTranchesFromPortfolio()` – Extrahiert detaillierte Tranchen aus Portfolio
- `resolveCapeRatio()` – Auflösung des CAPE-Ratio aus verschiedenen Quellen

**Dependencies:** `engine/config.mjs`, `engine/analyzers/MarketAnalyzer.mjs`, `engine/transactions/TransactionEngine.mjs`

---

## 30. `monte-carlo-runner-utils.js` (~40 Zeilen)
Konstanten und Hilfsfunktionen für den Monte-Carlo-Runner.

**Hauptfunktionen / Exporte:**
- `MC_HEATMAP_BINS` – Bin-Grenzen für Heatmap-Visualisierung [0, 3, 3.5, 4, 4.5, 5, 5.5, 6, 7, 8, 10, ∞]
- `pickWorstRun(current, candidate)` – Deterministische Auswahl des schlechtesten Runs
- `createMonteCarloBuffers(runCount)` – Erzeugt typisierte Arrays für MC-Metriken

**Buffer-Typen:**
- `Float64Array`: finalOutcomes, taxOutcomes, stress_CaR_P10_Real
- `Float32Array`: kpiKuerzungsjahre, kpiMaxKuerzung, volatilities, maxDrawdowns, etc.
- `Uint8Array`: kpiLebensdauer, depotErschoepft, alterBeiErschoepfung

**Dependencies:** keine

---

## 31. `monte-carlo-aggregates.js` (~125 Zeilen)
Aggregation aller Monte-Carlo-Ergebnisse nach Abschluss der Simulation.

**Hauptfunktionen / Exporte:**
- `buildMonteCarloAggregates({ inputs, totalRuns, buffers, heatmap, bins, totals, lists, allRealWithdrawalsSample })`

**Aggregierte Metriken:**
- `finalOutcomes`: P10, P50, P90, P50 (nur erfolgreiche)
- `taxOutcomes`: P50
- `kpiLebensdauer`: Mean
- `kpiKuerzungsjahre`, `kpiMaxKuerzung`: P50
- `depotErschoepfungsQuote`, `alterBeiErschoepfung`: P50
- `volatilities`, `maxDrawdowns`: P50, P90
- `extraKPI`: timeShareQuoteAbove45, consumptionAtRiskP10Real, Pflege-KPIs
- `stressKPI`: maxDD, timeShareAbove45, cutYears, CaR, recoveryYears
- `pflegeResults`: entryRate, entryAge, shortfallRate, endWealth, depotCosts, Dual-Care-KPIs

**Dependencies:** `simulator-utils.js`, `simulator-data.js`, `monte-carlo-runner-utils.js`

---

## 32. `simulator-portfolio-care.js` (~50 Zeilen)
Logik für Pflegedauer-Intervalle nach Geschlecht.

**Hauptfunktionen / Exporte:**
- `normalizeCareDurationRange(minYearsRaw, maxYearsRaw, gender)` – Normalisiert Benutzerintervall mit Geschlechts-Defaults

**Default-Werte (CARE_DURATION_DEFAULTS):**
- Männer (m): 5–10 Jahre
- Frauen (w): 6–12 Jahre
- Divers (d): 5–11 Jahre
- Default: 5–10 Jahre

**Verhalten:**
- Werte ≤ 0 oder NaN werden durch Defaults ersetzt
- Falls min > max, wird max = min gesetzt

**Dependencies:** keine (Pure Logic)

---

## 33. `cape-utils.js` (~55 Zeilen)
CAPE-basierte Startjahr-Filterung für Monte-Carlo-Simulationen.

**Hauptfunktionen / Exporte:**
- `getStartYearCandidates(targetCape, data, tolerance)` – Findet historische Jahre mit ähnlichem CAPE-Ratio

**Verhalten:**
- Strenge Toleranz: ±20% um Ziel-CAPE
- Fallback (< 5 Kandidaten): ±50% Toleranz
- Letzter Fallback: Alle validen Jahre

**Dependencies:** `simulator-data.js` (HISTORICAL_DATA)

---

## 34. `simulator-optimizer.js` (~515 Zeilen)
Auto-Parameter-Optimierung für Sweep-Ergebnisse.

**Hauptfunktionen / Exporte:**
- `findBestParameters(sweepResults, metricKey, maximize)` – Findet optimale Parameter aus Sweep
- `shouldMaximizeMetric(metricKey)` – Bestimmt Optimierungsrichtung
- `applyParametersToForm(params)` – Überträgt Parameter ins Hauptformular
- `displayBestParameters(bestResult, metricKey)` – Zeigt Ergebnis in UI
- `findBestParametersMultiObjective(sweepResults, objectives)` – Multi-Objective (Weighted Sum)
- `findBestParametersWithConstraints(sweepResults, objectiveMetricKey, maximize, constraints)` – Constraint-basierte Optimierung
- `displayMultiObjectiveOptimization(objectives)` – Multi-Objective UI
- `displayConstraintBasedOptimization(objectiveMetricKey, maximize, constraints)` – Constraint-Based UI

**Optimierungs-Modi:**
- Single-Objective: Maximiere/Minimiere eine Metrik
- Multi-Objective: Gewichtete Summe normalisierter Metriken
- Constraint-Based: Optimiere unter Nebenbedingungen (≥, >, ≤, <, =)

**Dependencies:** `simulator-results.js`, `simulator-sweep.js`

---

## 35. `simulator-visualization.js` (~365 Zeilen)
Erweiterte Visualisierungen für Parameter-Sweep-Analysen.

**Hauptfunktionen / Exporte:**
- `calculateSensitivity(sweepResults, metricKey)` – Berechnet Parameter-Sensitivity
- `renderSensitivityChart(sensitivity, metricKey)` – Rendert Sensitivity-Balkendiagramm (HTML)
- `calculateParetoFrontier(sweepResults, metricKey1, metricKey2, maximize1, maximize2)` – Berechnet Pareto-Frontier
- `renderParetoFrontier(paretoPoints, allPoints, metricKey1, metricKey2)` – Rendert Scatter-Plot (SVG)
- `displaySensitivityAnalysis()` – UI-Integration Sensitivity
- `displayParetoFrontier()` – UI-Integration Pareto

**Features:**
- Sensitivity Analysis: Impact-Berechnung (0–100%), Range, normalisierte Darstellung
- Pareto Frontier: Multi-objective Optimization, Dominanz-Prüfung, verbundene Punkte

**Dependencies:** `simulator-results.js`, `simulator-formatting.js`

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
- **Monte-Carlo-Start:** `runMonteCarlo()` in `simulator-monte-carlo.js` liest `mcAnzahl`, `mcDauer`, `mcBlockSize`, `mcSeed`, `mcMethode`, `mcStartYearMode`, `mcStartYearFilter`, `mcStartYearHalfLife` sowie Progress-UI (`mc-progress-bar*`). Liefert nach Abschluss aggregierte Ergebnisse an `displayMonteCarloResults()`.
- **Startjahr-Sampling:** `monte-carlo-runner.js` nutzt optional `FILTER` (harte Grenze) oder `RECENCY` (Half-Life). Die Gewichtung wirkt auf Startjahr und laufende Jahresdaten; CAPE-Sampling hat Vorrang vor Gewichtung.

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

**Last Updated:** 2026-01-21
