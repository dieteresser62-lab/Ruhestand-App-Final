# Simulator-App – Modulübersicht

Die Simulator-App ist inzwischen in mehrere spezialisierte ES6-Module zerlegt. Die zentralen Abläufe (Monte-Carlo, Sweep, Backtests, Pflege-UI) leben nicht mehr als Monolith in `simulator-main.js`, sondern wurden in klar abgegrenzte Dateien ausgelagert. Dieses Dokument beschreibt Zweck, Haupt-Exports, Einbindungspunkte und die gewünschte Aufteilung neuer Features.

**Stand:** 2026-07-17 (einschliesslich Langlebigkeit, Stationary Bootstrap, Tail-Risk-Overlay und Realentnahmevertrag)

**Pfadkonvention:** Simulator-Module liegen unter `app/simulator/`, Profilmodule unter `app/profile/`, Shared-Utilities unter `app/shared/`, Tranchen-Status unter `app/tranches/`. Im Dokument werden Dateinamen aus Lesbarkeit meist ohne Präfix genannt.

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
- `simulator-input-validation.js` – DOM-freie Validierung gemeinsamer Simulator-Inputs, aktuell `minimumFlexAnnual <= startFlexBedarf` sowie Tail-Risk-Parameter und Horizont-Kompatibilitaet
- `simulator-main-reset.js` – Reset-Button
- `simulator-main-stress.js` – Stress-Preset-Select
- `simulator-main-partner.js` – Partner-UI Toggle
- `simulator-main-sweep-selftest.js` – Sweep-Selbsttest (Dev)

---

## 2. `simulator-monte-carlo.js` (~220 Zeilen)
Koordiniert die Monte-Carlo-Simulation und verbindet DOM-Interaktion mit der reinen Simulationslogik.

**Hauptfunktionen / Exporte:**
- `runMonteCarlo()` – liest UI-Parameter, orchestriert `monte-carlo-runner.js` und Web-Worker-Jobs und aktualisiert Progress/UI (Default: 8 Worker, 500 ms Job-Budget).
- Validiert vor dem Start, dass `Mindest-Flex p.a.` den `Flex-Bedarf p.a.` nicht uebersteigt und optionale Tail-Risk-Parameter innerhalb des freigegebenen Contracts liegen.

**Einbindung:** Wird von `simulator-main.js` importiert und im UI-Bootstrap an den Start-Button (`#mcButton`) gekoppelt. Alle Monte-Carlo-spezifischen Anpassungen sollten hier erfolgen, damit `simulator-main.js` schlank bleibt.

**Dependencies:** `monte-carlo-runner.js`, `monte-carlo-ui.js`, `scenario-analyzer.js`, `simulator-portfolio.js`, `simulator-results.js`, `simulator-sweep-utils.js`, `simulator-utils.js`, `simulator-data.js`, `cape-utils.js`.

---

## 3. `monte-carlo-runner.js`
DOM-freie Simulation, die alle Runs, KPI-Arrays, Pflegemetriken und Pflegebucket-Metriken berechnet.

**Hauptfunktionen / Exporte:**
- `runMonteCarloSimulation()` – Führt die komplette Simulation aus, sammelt Worst-Run-Logs, Pflege-KPIs, Pflegebucket-KPIs und aggregierte Kennzahlen.
- Verarbeitet die `isRuin`-Rückgabe des direkten Jahreslaufs und den
  Ansparphase-Übergang. Davon getrennt markiert die Ergebnisaggregation einen
  fehlgeschlagenen Lauf oder Aktien-plus-Gold von höchstens 100 Euro als
  Depoterschöpfung; freie Liquidität und Pflegebucket gehören nicht zu dieser
  Teilmetrik.
- Aggregiert zusätzlich `taxSavedByLossCarry` (gesamt und pro Run), damit Steuerersparnis aus Verlustvorträgen auswertbar bleibt.
- Wendet optional das Tail-Risk-Overlay nicht-mutierend auf gezogene Jahresdaten an; die Schedule ist an den absoluten `runIdx` und den per-run Seed gekoppelt.

**Einbindung:** Wird ausschließlich aus `simulator-monte-carlo.js` aufgerufen. Erwartet fertige Eingaben und Callbacks (Progress, Szenario-Analyzer) und nutzt `simulator-engine-wrapper.js` (delegiert an Direct Engine) für die Jahr-für-Jahr-Logik.

**Dependencies:** `mc-run-context.js`, `mc-year-sampling.js`, `mc-life-events.js`, `mc-stress-tracker.js`, `mc-log-builder.js`, `mc-run-metrics.js`, `simulator-engine-wrapper.js`, `simulator-portfolio.js`, `simulator-health-bucket.js`, `simulator-results.js` (Portfolio-Helpers), `simulator-sweep-utils.js`, `simulator-utils.js`, `simulator-data.js`.

## 3g. `tail-risk-contract.js` und `tail-risk-overlay.js`
DOM-freier Contract und Overlay fuer seltene Fat-Tail-/Crash-Ereignisse in Monte Carlo.

**Hauptfunktionen / Exporte:**
- `normalizeTailRiskConfig()` – normalisiert Opt-in und Parametergrenzen ohne stilles Klemmen ungueltiger User-Werte.
- `validateTailRiskHorizonCompatibility()` – blockiert Ereignisdauern, die den Simulationshorizont ueberschreiten.
- `createTailRiskSchedule()` – erzeugt deterministische Ereignisfenster aus Run-Seed, Wahrscheinlichkeit, Dauer und Cooldown.
- `applyTailRiskOverlay()` – erzeugt effektive Jahresdaten ohne Mutation der historischen Quelle und skippt historische Krisenjahre.

**Einbindung:** `simulator-portfolio-inputs.js` liest die UI-Felder und nutzt den Contract, `simulator-input-validation.js` blockiert ungueltige Werte, `monte-carlo-runner.js` wendet das Overlay im Jahresloop an, `mc-run-metrics.js` und `monte-carlo-aggregates.js` liefern `extraKPI.tailRisk`.

## 3a. `mc-run-context.js`
DOM-freie Chunk-Kontext-Erzeugung fuer den Monte-Carlo-Runner.

**Hauptfunktionen / Exporte:**
- `createMonteCarloRunContext()` – bereitet RunRange, RNG-Modus, Legacy-RNG, Stress-Master, Buffers, Progress-Intervall, LogIndexSet und Sampling-Konfiguration vor.

**Einbindung:** Wird von `monte-carlo-runner.js` vor der Run-Schleife genutzt. Sampling-Algorithmen bleiben im Runner, damit der erste Refactoring-Slice keine Startjahr-Logik verschiebt.

## 3b. `mc-year-sampling.js`
DOM-freie Startjahr- und CAPE-Sampling-Logik fuer Monte-Carlo.

**Hauptfunktionen / Exporte:**
- `buildStartYearCdf()` / `pickStartYearIndex()` – CDF-Aufbau und deterministische Startjahrwahl fuer FILTER/RECENCY/UNIFORM.
- `buildYearSamplingConfig()` – gewichtete Sampling-Konfiguration fuer Startjahr und laufende Jahresdaten.
- `pickMonteCarloStartYearIndex()` – per-Run-Auswahl inklusive CAPE-Kandidaten und Fallback.

**Einbindung:** Wird von `mc-run-context.js` fuer die Sampling-Konfiguration und von `monte-carlo-runner.js` fuer die Startjahrwahl je Run genutzt.

## 3c. `mc-life-events.js`
DOM-freie Life-State-Initialisierung fuer Monte-Carlo.

**Hauptfunktionen / Exporte:**
- `createMonteCarloLifeState()` – erzeugt Care-Meta, Partnerstatus, Care-RNGs, Alive-Initialwerte und HouseholdContext fuer einen Run.
- `updateMonteCarloLifeEventsForYear()` – testbarer Jahresupdate-Helper fuer Pflege-/Sterblichkeitslogik; im produktiven Runner wird die Jahreslogik aktuell aus Performance-Gruenden weiterhin lokal im Hot Path ausgefuehrt.

**Einbindung:** `monte-carlo-runner.js` nutzt die State-Initialisierung vor der Jahresschleife. Der erzeugte `householdContext.care`-Block transportiert `careMetaP1` und `careMetaP2` fuer Pflegebucket-Trigger ohne Signaturaenderung von `simulateOneYear()`. Weitere Life-Events-Extraktion muss den Monte-Carlo-Benchmark bestehen.

## 3d. `mc-stress-tracker.js`
DOM-freie Stress-Metrik-Kapselung fuer Monte-Carlo.

**Hauptfunktionen / Exporte:**
- `createMonteCarloStressTracker()` – initialisiert Stress-Jahre, Portfolio-Serie, Cut-Year-Zaehler, Real-Withdrawal-Liste und Recovery-Status.
- `recordMonteCarloStressYear()` – schreibt pro Simulationsjahr nur bei aktivem Stress die Stress-Metriken fort.
- `writeMonteCarloStressMetrics()` – schreibt die bestehenden Stress-Buffer (`stress_maxDrawdowns`, `stress_timeQuoteAbove45`, `stress_cutYears`, `stress_CaR_P10_Real`, `stress_recoveryYears`).

**Einbindung:** Wird von `monte-carlo-runner.js` pro Run initialisiert und nach erfolgreichem Jahreslauf bzw. beim finalen Buffer-Schreiben genutzt. Worker-Payloads bleiben unveraendert.

## 3e. `mc-log-builder.js`
DOM-freie Logzeilen-Builder fuer Monte-Carlo.

**Hauptfunktionen / Exporte:**
- `buildMonteCarloRuinLogRow()` – baut die Ruin-Logzeile mit stabilen Legacy-, Alive- und Care-Feldern.
- `buildMonteCarloYearLogRow()` – erweitert normale Jahres-Logdaten um Alive-, Care-, VPW- und Payout-Erklaerfelder.
- `buildMonteCarloDeathLogRow()` – baut den finalen Todesfall-Logeintrag inklusive Portfolio-Snapshot.

**Einbindung:** Wird von `monte-carlo-runner.js` nur bei aktivem `currentRunLog` genutzt. Feldnamen und Worst-Run-/CSV-kompatible Shapes bleiben stabil. Entnahme-/Payout-/VPW-Felder werden additiv transportiert und im UI nur bei detailliertem Log sichtbar gemacht.

## 3f. `mc-run-metrics.js`
DOM-freie Run-Ende-Metrikfortschreibung fuer Monte-Carlo.

**Hauptfunktionen / Exporte:**
- `createMonteCarloRunMetrics()` – initialisiert Pflege-Listen, Care-Year-Arrays, Worst-Run-Container, `runMeta` und globale Zaehler.
- `recordMonteCarloRunOutcome()` – schreibt pro Run Ergebnisbuffer, Pflege-Listen, Pflegebucket-Nutzung/Erschoepfung, Safety-Run-Zaehler, Worst-Run-Auswahl und `runMeta` fort.
- `finalizeMonteCarloRunMetrics()` – baut die bestehenden `totals`, `lists`, Worst-Runs, `allRealWithdrawalsSample` und `runMeta` inklusive Pflegebucket- und Tail-Risk-Zaehlern fuer die Chunk-Rueckgabe.

**Einbindung:** Wird von `monte-carlo-runner.js` am Run-Ende genutzt. Buffer-Namen, Worker-Payloads, Aggregat-Shape und `runMeta` bleiben kompatibel; Pflegebucket-Metriken sind additive Felder.

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
- Führt pro Run `taxSavedByLossCarry` mit, damit Sweep-Metriken auch den Verlusttopf-Effekt abbilden.

**Einbindung:** Genutzt von `simulator-sweep.js`, `simulator-main.js` (Renten-Invarianz-Checks) und `simulator-monte-carlo.js`.

**Dependencies:** keine externen Module, nur Standard-APIs.

---

## 8. `simulator-backtest.js` (~360 Zeilen)
Historische Backtests inkl. UI-Integration und Log-Export.

**Hauptfunktionen / Exporte:**
- `initializeBacktestUI()` – verdrahtet UI-Buttons und persistiert Nutzereinstellungen.
- `runBacktest()` – führt Jahres-Simulation mit echten Daten aus.
- `renderBacktestLog()` / `exportBacktestLogData()` – Darstellung und CSV-Download.
- Backtest-Logs zeigen Mindest-Flex-Betrag und Status; im Detailmodus zusaetzlich Blockgrund und effektiven Mindest-Flex-Wert nach der Policy.

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
- `resolveSimulatorCumulativeInflationFactor()` / `advanceSimulatorCumulativeInflationFactor()` (Helpers) – lesen den App-eigenen Faktor mit Legacy-Fallback und schreiben ihn für das Folgejahr genau einmal fort.
- Der kanonische Faktor liegt auf `simState.cumulativeInflationFactor`; `simulator-engine-direct.js` spiegelt ihn für Realvermögen und Real-Drawdown in den Engine-`lastState`.
- Recompute-Pfad für Notfallverkäufe: kombiniert reguläre + Notfall-Rohaggregate und rechnet Settlement mit `taxStatePrev` neu.
- Pflegebucket-Pfad: nutzt `simulator-health-bucket.js` nach der Engine-Entscheidung und vor `applyForcedSaleLiquidityCoverage()`, damit zweckgebundene Geldmarkt-/Cash-Reserve Pflege-Liquiditätslücken deckt, bevor Risikoanlagen notverkauft werden.
- `sampleNextYearData()` (Helpers) – sampelt nächstes Jahr (historisch/Regime/Block)
- `makeDefaultCareMeta()` / `updateCareMeta()` (Helpers) – Pflegefall-Zustandsmaschine
- `calcCareCost()` (Helpers) – berechnet Pflege-Kosten nach Grad
- `computeCareMortalityMultiplier()` (Helpers) – erhöhte Sterblichkeit bei Pflege
- `computeHouseholdFlexFactor()` (Helpers) – Flex-Reduktion bei Pflege
- `initMcRunState()` (Helpers) – initialisiert Zustand für einen MC-Lauf

**Ausgelagerte Jahreslogik:**
- `simulator-year-portfolio.js` – DOM-freie Markt-/Portfoliofortschreibung, Renditen und Marktfenster.
- `simulator-household-pension.js` – DOM-freie Renten-/Haushaltsberechnung inklusive Witwenrente.
- `simulator-engine-input.js` – DOM-freies Mapping von Simulator-Jahreswerten auf den `EngineAPI.simulateSingleYear()`-Input.
- `minimumFlexAnnual` wird wie `startFlexBedarf` als nominal fortgeschriebener Jahreswert in den Engine-Input gemappt und im Jahresstate inflationiert.
- `simulator-accumulation-year.js` – DOM-freier frueher Rueckgabepfad fuer Ansparjahre inklusive Sparrate, Cash-Zins, Anspar-Rebalancing, Logdaten und Fortschreibung des kumulierten Inflationsfaktors trotz Entnahme null.
- `simulator-tax-recompute.js` – DOM-freie Normalisierung von Tax-Rohaggregaten und finales Settlement-Recompute nach Simulator-Zusatzverkaeufen. Skaliert die regulaere Cash-Reserve konsistent, kumuliert Forced-Sale-Reserven und liefert die genau einmal cashwirksame Differenz zur finalen Jahressteuer; Reserveunterdeckungen unter -0,01 EUR sind Contract-Fehler.
- `simulator-forced-sale.js` – DOM-freie Forced-Sale-Liquiditaetsdeckung vor/nach Auszahlung inklusive Forced-Sale-Scale, skalierter Plansteuerreserve ohne erneuten SPB, Bond-Verkaufsdelta, Payout-Fallback und FIFO-Fallback.
- `simulator-health-bucket.js` – DOM-freier Pflegebucket-Trigger, Deckungsbedarf, Verbrauch, Verzinsung, Zieldeckungsdiagnose und Warnungsweitergabe.
- `simulator-bond-refill.js` – DOM-freie Bond-Refill-/3-Bucket-Nachsteuerung fuer gute Jahre inklusive Auto-Bond-Tranche, Equity-Verkauf und Refill-Deltas.
- `simulator-year-result.js` – DOM-freier Builder fuer finalen Rueckgabewert, naechsten State, UI-Payload, Jahreslog, 3-Bucket-Logshape sowie flache Entnahme-/Payout-/VPW-Erklaerfelder. `jahresentnahme_real` ist die effektive Auszahlung geteilt durch den aktuellen Faktor; erst der Folgejahresstate erhält den einmal mit der Jahresinflation fortgeschriebenen Faktor. Die FlowDelta-Bilanz umfasst die nach Auszahlung gebuchte Steuer-Reconciliation.

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
- Detailspalten fuer Entnahme-/Payout-/VPW-Transparenz (`EntPlan`, `EntEff`, `VPW€`, `VPWFlex`, `StatFlex`, `Liq>P`, `Liq<P`, `Liq>Z`, `Port>P`, `PortEnd`)
- Mindest-Flex-Spalten: `MinFlex€`, `MinFSt` sowie im Detailmodus `MinFBlock` und `MinFEff`
- JSON/CSV-Export für ausgewählte Szenarien
- Pflege-KPI-Dashboard mit Dual-Care-Metriken
- enthält zusätzlich Metriken für `taxSavedByLossCarry` aus Sweep/MC-Ergebnissen
- enthält zusätzlich Pflegebucket-KPIs aus MC-Ergebnissen: Nutzungsquote, Erschoepfungsquote, Median-/P90-Nutzung, Median-Restbucket, Zieldeckung und Zielluecke
- enthält bei aktivem Tail-Risk-Overlay zusaetzliche KPI-Karten fuer aktive/applizierte Runs, aktive/applizierte Jahresanteile und historische Krisen-Skips; Scenario-Log-JSON/CSV exportiert die Tail-Event-Felder unverkuerzt aus den Row-Daten.

**Dependencies:** `simulator-utils.js`, `simulator-heatmap.js`, `simulator-data.js`, `results-metrics.js`, `results-renderers.js`, `results-formatting.js`.

---

## 14. `results-metrics.js` (~200 Zeilen)
Berechnet alle KPIs (Perzentile, Quoten, Pflege-Kosten/Overlap, Shortfall-Deltas) ohne DOM-Zugriffe.

**Hauptfunktionen:**
- `computeKpiCards()` / `computeScenarioSummary()` – strukturierte KPI-Objekte für Renderer.
- Rendert u. a. die KPI `Ø Steuerersparnis Verlusttopf` auf Basis von `extraKPI.lossCarryTaxSavings.perRunMean`.
- Rendert Pflegebucket-Kennzahlen, wenn `extraKPI.healthBucket` vorhanden ist.

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
Auto-Optimierung für Parameter (LHS + Verfeinerung) und UI-Bedienung. Details siehe: `docs/reference/AUTO_OPTIMIZE_DETAILS.md`.

**Hauptfunktionen / Exporte:**
- `runAutoOptimize()` – Orchestriert den mehrphasigen Prozess (LHS-Kandidaten -> Quick-Filter -> volle Evaluation -> Refinement -> Validierung).
- UI-Integration in `auto_optimize_ui.js` als Fassade fuer Initialisierung, Event-Wiring, Run-Flow und Parameter-Management.

**Modul-Split:**
Die Logik wurde in spezialisierte Module zerlegt, um Wartbarkeit und Testbarkeit zu erhöhen:

- `auto-optimize-worker.js` – Der Worker-To-Main-Adapter. Nutzt den gemeinsamen `workers/mc-worker.js`-Jobtyp `job`, merged MC-Buffers/Heatmap/Totals/Listen fuer Kandidaten-Evaluationen und faellt bei Worker-Fehlern auf seriell zurueck.
- `auto-optimize-evaluate.js` – Bewertet Kandidaten anhand der Zielfunktion (Score-Berechnung).
- `auto-optimize-metrics.js` – Definiert Metriken (Success Rate, Median End Wealth) und Constraints.
- `auto-optimize-sampling.js` – Algorithmen für die Kandidatengenerierung (Latin Hypercube, Nachbarschaft).
- `auto-optimize-utils.js` – Hilfsfunktionen (Caching, Logging, ID-Generierung).
- `auto-optimize-params.js` – Definition der Parameter-Räume und Mapping (UI <-> Intern).
- `auto-optimize-presets.js` – DOM-freie Preset-Definitionen fuer die UI.
- `auto-optimize-param-meta.js` – Parameter-Optionen, Labels, Units, Dynamic-Flex-Keys und Apply-Mapping.
- `auto-optimize-config-ui.js` – Liest und validiert die UI-Konfiguration fuer `runAutoOptimize()`.
- `auto-optimize-renderer.js` – Rendert Parameterbloecke, Progress-Texte, Ergebnis-HTML und Apply-Erfolgsmeldung.
- `auto-optimize-apply.js` – Uebernimmt Champion-Parameter in die Simulator-Formularfelder.

**Dependencies:** `simulator-portfolio.js`, `monte-carlo-runner.js`, `simulator-engine-helpers.js`, `workers/worker-pool.js`.

---

## 17. `results-formatting.js` (~160 Zeilen)
Hält Formatierungs-Utilities und kleine Adapter, um Renderer und Metriken von DOM-Details zu entkoppeln.

**Hauptfunktionen / Exporte:**
- `formatCurrencySafe()` – Währungsformat mit Fallback
- `formatNumberWithUnit()` / `formatPercentage()` – Zahlen-/Prozent-Formatter
- `sanitizeDescription()` – Text-Sanitizing für KPI-Labels

**Dependencies:** `app/shared/shared-formatting.js`.

---

## 18. `app/shared/shared-formatting.js` (~140 Zeilen)
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
- Re-export aller Formatter aus `app/shared/shared-formatting.js`

**Dependencies:** `app/shared/shared-formatting.js`

---

## 20. `simulator-portfolio.js` (Fassade)
Portfolio-Initialisierung, Renten- und Stress-Kontexte.

**Hauptfunktionen:**
- `getCommonInputs()` – liest alle Portfolio-/Strategie-Inputs
- `updateStartPortfolioDisplay()` – UI-Display für Start-Allokation
- `initializePortfolio()` / `initializePortfolioDetailed()` – Tranchen-Setup inklusive optionalem Pflegebucket-Carve-Out nach Profilverbund-Merge
- `computeRentAdjRate()` / `computePensionNext()` – Rentenanpassungslogik
- `buildStressContext()` / `applyStressOverride()` – Stresstest-Szenarien

**Helper-Module (ausgelagert):**
- `simulator-portfolio-inputs.js` – DOM-Input-Parsing
- `simulator-portfolio-display.js` – Start-Portfolio-UI
- `simulator-portfolio-init.js` – Portfolio-Tranchen und Pflegebucket-Carve-Out aus Geldmarkt-Tranchen, ungetranchtem Geldmarkt und Tagesgeld
- `simulator-portfolio-historical.js` – Regime-Daten vorbereiten
- `simulator-portfolio-pension.js` – Rentenberechnungen
- `simulator-portfolio-stress.js` – Stress-Presets/Overrides
- `simulator-portfolio-tranches.js` – FIFO/Tax/Portfolio-Updates
- `simulator-portfolio-format.js` – Zahlformatierung

**Pflegebucket-Contract in `simulator-portfolio-init.js`:**
- Der Carve-Out läuft erst auf dem aggregierten Haushaltsportfolio, nicht pro Einzelprofil.
- Quellenreihenfolge: `depotTranchesGeldmarkt` per FIFO, danach ungetranchter `geldmarktEtf`, danach `tagesgeld`.
- Fehlende Kaufdaten unterstuetzter Legacy-Lots verwenden einen stabilen FIFO-Fallback. Syntaktisch oder fachlich korrupte Profilpayloads erreichen die Portfolioinitialisierung nicht.
- `geldmarktEtf`, `tagesgeld` und `liquiditaet` werden konsistent reduziert.
- `healthBucketGeldmarkt`, `healthBucketTranches`, `healthBucketCashAmount` und `healthBucketMeta.warnings` dokumentieren die Ausgliederung und eventuelle Kappung.

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
Zufallszahlen und Statistik (Formatierung wird aus `app/shared/shared-formatting.js` re-exportiert).

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
- `buildSimulatorInputsFromProfileData()` – liest Profildaten aus der Profilregistry hinter der zentralen Persistenz-Facade und baut vollständige Simulator-Inputs
- `combineSimulatorProfiles()` – aggregiert mehrere Profile zu einem kombinierten Input-Objekt (1–2 Personen)

**Besonderheiten:**
- Gold-Validierung: `goldAktiv` nur true wenn `goldZielProzent > 0`
- Tranchen-Aggregation: Fügt detaillierte Tranchen aller Profile zusammen, versieht IDs mit Profilpräfix und setzt `sourceProfileId`
- Verkaufs-Herkunft: Engine-`breakdown[]` bewahrt `sourceProfileId`; Portfolio-Reduktionen laufen ueber die profilbezogene `trancheId`, damit identische Positionen aus verschiedenen Profilen nicht vermischt werden
- Referenzisolation: Profilinputs werden vor Haushaltsmerge und Portfolioinitialisierung tiefenkopiert. Teilverkaeufe reduzieren Stueckzahl, Marktwert und Cost Basis proportional; simulierte Kaeufe erzeugen eigene `simlot:`-Lots.
- Tranchensummen: Valide Detailtranchen bestimmen `startVermoegen` zusammen mit Liquiditaet und ersetzen ueberlappende Aggregate. Korrupte oder widerspruechliche Payloads blockieren fail-closed.
- Pflegebucket: liest `profile_health_bucket`, normalisiert die Definition und nutzt bei Multi-Profil-Setups das Primary-Profil als Haushaltsdefinition. Abweichende sekundäre Definitionen werden als Warnung transportiert.
- Fallback-Logik: Nutzt Balance-Werte wenn Simulator-Felder leer sind
- Mindest-Flex bleibt profilbezogen: `minimumFlexAnnual` wird aus Profil-Simulatorwerten oder Balance-Fallbacks gelesen, im kombinierten Haushaltslauf addiert und als `minimumFlexProfiles` nachvollziehbar transportiert.
- Gewichtete Mittelung für Steuersätze, Aktienquote und Rebalancing-Parameter

**Dependencies:** `simulator-data.js`, `balance-config.js`

---

## 25. `profile-storage.js` / `profile-key-policy.js` / `profile-registry.js` / `profile-live-storage.js` / `profile-bundle-io.js`
Profil-Registry und Persistenz-Layer für Multi-User-Verwaltung. `profile-storage.js` bleibt die kompatible Fassade; `profile-key-policy.js` kapselt die Erkennung profilbezogener Persistenz-Keys; `profile-registry.js` kapselt Registry-Parsing, Current-Profile-Key, Metadaten, CRUD und Profildaten-Merge; `profile-live-storage.js` kapselt Snapshot, Clear, Load und Live-Data-Erkennung; `profile-bundle-io.js` kapselt zentralen Bundle-Import/-Export und `window.name`-Transfer.

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

**Dependencies:** `profile-state.js`, `profile-key-policy.js`, `profile-registry.js`, `profile-live-storage.js`, `profile-bundle-io.js`

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
- `extraKPI.lossCarryTaxSavings`: `total`, `perRunMean`
- `extraKPI.healthBucket`: Nutzungs-/Erschoepfungsquote, Nutzungssummen, Restbucket, Zieldeckung, Zielluecke und Bucket-Zinsen
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
app/simulator/simulator-main.js
  ├─ app/simulator/simulator-monte-carlo.js
  │    ├─ monte-carlo-ui.js
  │    ├─ app/simulator/monte-carlo-runner.js
  │    │    ├─ app/simulator/simulator-engine-wrapper.js
  │    │    │    ├─ app/simulator/simulator-engine-direct.js
  │    │    │    └─ app/simulator/simulator-engine-helpers.js
  │    │    ├─ app/simulator/simulator-portfolio.js
  │    │    │    └─ app/simulator/simulator-data.js
  │    │    ├─ app/simulator/simulator-results.js
  │    │    │    ├─ results-metrics.js
  │    │    │    ├─ results-renderers.js
  │    │    │    ├─ results-formatting.js
  │    │    │    └─ app/simulator/simulator-utils.js
  │    │    ├─ app/simulator/simulator-sweep-utils.js
  │    │    ├─ app/simulator/simulator-utils.js
  │    │    └─ app/simulator/simulator-data.js
  │    ├─ app/simulator/scenario-analyzer.js
  │    └─ app/shared/cape-utils.js
  ├─ app/simulator/simulator-sweep.js
  │    ├─ app/simulator/monte-carlo-runner.js (Mini-Läufe)
  │    ├─ app/simulator/simulator-heatmap.js
  │    ├─ app/simulator/simulator-results.js
  │    ├─ app/simulator/simulator-sweep-utils.js
  │    └─ app/simulator/simulator-utils.js
  ├─ app/simulator/simulator-backtest.js
  │    ├─ app/simulator/simulator-engine-wrapper.js
  │    ├─ app/simulator/simulator-portfolio.js
  │    └─ app/simulator/simulator-main-helpers.js
  ├─ app/simulator/simulator-ui-pflege.js
  ├─ app/simulator/simulator-ui-rente.js
  ├─ app/simulator/simulator-main-helpers.js
  ├─ app/simulator/simulator-results.js
  ├─ app/simulator/simulator-portfolio.js
  ├─ app/simulator/simulator-heatmap.js
  ├─ app/simulator/simulator-utils.js
  └─ app/simulator/simulator-data.js
```

---

## Datenfluss & Startpunkte

### Monte-Carlo-Simulation
1. `simulator-main.js`: UI-Bootstrap ruft `runMonteCarlo` aus `simulator-monte-carlo.js` auf.
2. `simulator-monte-carlo.js`: Erstellt die UI-Fassade, normalisiert Eingaben/Witwen-Optionen und delegiert an den Runner.
3. `mc-run-context.js`: Bereitet Chunk-Kontext, RNG, Buffers, Sampling-Konfiguration und Progress-Intervall vor.
4. `mc-year-sampling.js`: Liefert Startjahr-/CAPE-Sampling und CDF-/Sampler-Helfer.
5. `mc-life-events.js`: Initialisiert den Run-Life-State fuer Care-Meta, Partnerstatus, Care-RNGs und HouseholdContext.
6. `tail-risk-overlay.js`: Wendet bei explizitem Opt-in ein deterministisches Tail-Risk-Ereignisfenster auf die gezogenen Jahresdaten an, ohne historische Daten zu mutieren.
6. `mc-stress-tracker.js`: Kapselt Stress-Metrik-Initialisierung, Jahresfortschreibung und Buffer-Schreibung.
7. `mc-log-builder.js`: Baut Ruin-, Jahres- und Todesfall-Logzeilen mit zentralen Alive-/Care-Feldern.
8. `mc-run-metrics.js`: Schreibt Run-Ende-KPIs, Pflege-Listen, Worst-Runs und `runMeta` fort.
9. `monte-carlo-runner.js`: Führt die reinen Simulationen durch (inkl. Pflege-KPIs) und nutzt `simulator-engine-wrapper.js` für die Jahresschleifen.
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
- Detaillierter Logmodus zeigt additive Entnahme-/Payout-/VPW-Spalten. Normalmodus und bestehende Export-Shapes bleiben kompatibel.

---

## Init-Pfade & erwartete Schnittstellen

- **App-Bootstrap:** `initializeUI()` in `simulator-main.js` bindet Buttons/Hotkeys und ruft alle Setup-Funktionen. Erwartet, dass DOM-IDs aus `Simulator.html` existieren.
- **Pflege-UI:** `initializePflegeUIControls()` in `simulator-ui-pflege.js` setzt Preset-/Badge-Logik auf. Erwartet Felder `pflegeStufe*`, `pflegeMaxFloor`, `pflegeKostenStaffelPreset` und zeigt/hide Panels per Checkbox `pflegefallLogikAktivieren`.
- **Renten-Persistenz:** `initRente2ConfigWithLocalStorage()` in `simulator-ui-rente.js` liest/migriert Rentenfelder, schaltet Partner-Section (`chkPartnerAktiv`, `sectionRente2`) und schreibt zurück in `localStorage`.
- **Sweep-Voreinstellungen:** `initSweepDefaultsWithLocalStorageFallback()` in `simulator-sweep.js` lädt Defaults, liest `localStorage` und setzt Guardrails (Whitelist/Blocklist). Erwartet Zugriff auf Sweep-Formularfelder und das Toggle.
- **Backtest-Setup:** `initializeBacktestUI()` in `simulator-backtest.js` verknüpft Zeitraum-/Startknöpfe, ruft `runBacktest()` und nutzt `renderBacktestLog()`/`exportBacktestLogData()` für Ausgabe. Erwartet vorhandene DOM-IDs des Backtest-Tabs.
- **Monte-Carlo-Start:** `runMonteCarlo()` in `simulator-monte-carlo.js` liest `mcAnzahl`, `mcDauer`, `mcBlockSize`, `mcSeed`, `mcMethode`, `mcStartYearMode`, `mcStartYearFilter`, `mcStartYearHalfLife` sowie Progress-UI (`mc-progress-bar*`). Liefert nach Abschluss aggregierte Ergebnisse an `displayMonteCarloResults()`.
- **Startjahr-Sampling:** `mc-run-context.js` bereitet die Sampling-Konfiguration vor; `mc-year-sampling.js` kapselt `FILTER` (harte Grenze), `RECENCY` (Half-Life), `UNIFORM` und CAPE-Kandidaten. Die Gewichtung wirkt auf Startjahr und laufende Jahresdaten; CAPE-Sampling hat Vorrang vor Gewichtung.
- **Life-State:** `mc-life-events.js` initialisiert Care-Meta, Partnerstatus, Care-RNGs und HouseholdContext. Die Jahreslogik bleibt im Runner-Hot-Path, bis eine vollstaendige Extraktion den Benchmark stabil erfuellt.
- **Stress-Metriken:** `mc-stress-tracker.js` kapselt Portfolio-Drawdown, Quote-Above-4.5, Cut-Years, Real-CaR und Recovery-Years fuer Stress-Presets. Die bestehenden Worker-Buffer und Aggregatnamen bleiben stabil.
- **Logzeilen:** `mc-log-builder.js` vereinheitlicht Ruin-, Jahres- und Todesfall-Logs. Builder laufen nur fuer tatsaechlich geloggte Runs. Backtest-Logs und Monte-Carlo-Scenario-Logs verwenden dieselbe Semantik fuer Entnahme-/Payout-/VPW-Felder.
- **Run-Metriken:** `mc-run-metrics.js` kapselt Ergebnisbuffer, Pflege-Listen, Safety-Run-Zaehler, Worst-Run-Auswahl und `runMeta` am Run-Ende.

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

**Last Updated:** 2026-06-01
