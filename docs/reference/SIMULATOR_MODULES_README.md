# Simulator-App – Modulübersicht

Die Simulator-App ist inzwischen in mehrere spezialisierte ES6-Module zerlegt. Die zentralen Abläufe (Monte-Carlo, Sweep, Backtests, Pflege-UI) leben nicht mehr als Monolith in `simulator-main.js`, sondern wurden in klar abgegrenzte Dateien ausgelagert. Dieses Dokument beschreibt Zweck, Haupt-Exports, Einbindungspunkte und die gewünschte Aufteilung neuer Features.

**Stand:** 2026-07-22 (einschliesslich Langlebigkeit, Stationary Bootstrap, Tail-Risk-Overlay, Realentnahmevertrag, getrennter Pflege-KPI-Semantik sowie vollstaendigem historischen Backtest-Contract)

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
- `runMonteCarlo()` – liest UI-Parameter, orchestriert `monte-carlo-runner.js` und Web-Worker-Jobs, aktualisiert Progress/UI und publiziert nach dem Lauf den versionierten V1-JSON-Download (Default: 8 Worker, 500 ms Job-Budget).
- Validiert vor dem Start, dass `Mindest-Flex p.a.` den `Flex-Bedarf p.a.` nicht uebersteigt und optionale Tail-Risk-Parameter innerhalb des freigegebenen Contracts liegen.

**Einbindung:** Wird von `simulator-main.js` importiert und im UI-Bootstrap an den Start-Button (`#mcButton`) gekoppelt. Alle Monte-Carlo-spezifischen Anpassungen sollten hier erfolgen, damit `simulator-main.js` schlank bleibt.

**Dependencies:** `monte-carlo-runner.js`, `monte-carlo-ui.js`, `monte-carlo-contracts.js`, `monte-carlo-export.js`, `scenario-analyzer.js`, `simulator-portfolio.js`, `simulator-results.js`, `simulator-sweep-utils.js`, `simulator-utils.js`, `simulator-data.js`, `cape-utils.js`.

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
- Ermittelt ab der ersten Dekumulationsverpflichtung genau einen realen Depotentnahme-P10-Skalar je Run. Bei Ruin werden weitere Verpflichtungsjahre bis Tod oder Horizont ohne zusaetzliche Marktziehungen mit 0 Euro erfasst.

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
- `resolveMonteCarloSamplingContractV1()` / `pickMonteCarloStartYearIndex()` – versionierte Praezedenzaufloesung und per-Run-Auswahl inklusive CAPE-Kandidaten, methodenspezifischer Jahr-1-Regel und sichtbarem Fallback.
- `createMonteCarloSamplingDiagnosticsV1()` / `recordMonteCarloSampledYearV1()` / `mergeMonteCarloSamplingDiagnosticsV1()` – kompakte Startjahr-, Jahres-, Quellen-, Regime-, Stationary- und Tail-Risk-Zaehler mit Datenfingerprints.

**Einbindung:** Wird von `mc-run-context.js` fuer die Basiskonfiguration, vom Runner fuer die einmalige Vertragsaufloesung und Startjahrwahl sowie vom Chunkresultat fuer Validierung und reihenfolgeunabhaengiges Merge genutzt.

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
- `recordMonteCarloStressYear()` – schreibt pro Simulationsjahr nur bei aktivem Stress die Stress-Metriken fort; Ansparjahre gehen nicht in die reale Depotentnahme ein.
- `recordMonteCarloStressZeroWithdrawal()` – ergaenzt nach Ruin Nullentnahmen nur innerhalb des festen Stressfensters.
- `writeMonteCarloStressMetrics()` – schreibt die bestehenden Stress-Buffer (`stress_maxDrawdowns`, `stress_timeQuoteAbove45`, `stress_cutYears`, `stress_CaR_P10_Real`, `stress_recoveryYears`).

**Einbindung:** Wird von `monte-carlo-runner.js` pro Run initialisiert und nach erfolgreichem Jahreslauf, bei der Nullauffuellung nach Ruin sowie beim finalen Buffer-Schreiben genutzt. Der V1-Path-Summary transportiert P10, Beobachtungszahl und Missingness indexiert je Run.

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
- `createMonteCarloCareNeedTracker()` / `recordMonteCarloCareNeedYear()` – summieren den modellierten P1-/P2-Zusatzbedarf pro Run nominal und real zur Preisbasis des Simulationsstarts; gleichzeitiger Bedarf ist die Jahressumme P1 plus P2.
- `createMonteCarloRunMetrics()` – initialisiert getrennte P1-/P2-/Haushaltslisten, Worst-Run-Container, `runMeta` und globale Zaehler.
- `recordMonteCarloRunOutcome()` – schreibt pro Run getrennte Pflegeeintritte und -jahre ohne Null-Sentinels, reale Pflege-Mehrbedarfe, Pflegebucket-Nutzung/Erschoepfung, Safety-Run-Zaehler, Worst-Run-Auswahl und `runMeta` fort.
- `finalizeMonteCarloRunMetrics()` – baut `totals`, `lists`, Worst-Runs, `allRealWithdrawalsSample` und `runMeta` inklusive P1-/P2-, Pflegebucket- und Tail-Risk-Zaehlern fuer die Chunk-Rueckgabe.

**Einbindung:** Wird von `monte-carlo-runner.js` im Jahresloop und am Run-Ende genutzt. Der V1-Path-Summary-Contract traegt reale und explizit mit `NominalEur` benannte nominale Pflegefelder; eine kausale Depotkosten-Zurechnung wird nicht behauptet.

## 3h. `monte-carlo-statistics.js`
Reine Statistikhelfer fuer Monte-Carlo-Anteils- und Quantilschaetzer.

**Hauptfunktionen / Exporte:**
- `calculateWilson95Interval()` – berechnet das Wilson-95-Prozent-Intervall fuer einen binaeren Anteil einschliesslich der Randfaelle `0/n` und `n/n`.
- `buildBinaryProportionEstimate()` – liefert Punktschaetzer, Zaehler, Nenner, Runzahl, Intervall und eine sichtbare Klein-Stichproben-Warnung unter 1.000 Runs; technische Batchfehler unterdruecken Schaetzer und Intervall fail-closed.
- `summarizePerRunRealWithdrawalP10()` – aggregiert genau einen realen Depotentnahme-P10-Skalar je auswertbarem Run und liefert P10, P50, Stichprobengroesse sowie Missingness-Inventar. Ein Konfidenzintervall fuer das Quantil wird nicht behauptet.

**Einbindung:** `monte-carlo-chunk-result.js` baut den Floor-Schaetzer, `monte-carlo-aggregates.js` aggregiert die global indexierten Per-Run-Skalare und `results-metrics.js` projiziert Interpretation, Stichprobengroesse und Warnungen.

## 3i. `monte-carlo-contracts.js` und `monte-carlo-export.js`
DOM-freier, versionierter Raw-Vertrag fuer einen vollstaendigen Monte-Carlo-Lauf.

**Hauptfunktionen / Exporte:**
- `createMonteCarloRunRequestV1()` / `validateMonteCarloRunRequestV1()` – normalisieren und validieren Seed, Methoden, Szenario, Datenfingerprint, Worker-/Chunkkonfiguration und Snapshotpolicy; lokale Pfade, Secret-Felder und nicht endliche Zahlen werden abgewiesen.
- `createMonteCarloRunResultV1()` / `validateMonteCarloRunResultV1()` – projizieren Outcome-Inventar, kanonische KPIs mit expliziten `NominalEur`-/`RealEur`-Namen, Unsicherheit, Missingness, Warnungen und Diagnostik ohne Displayformatierung.
- `extractMonteCarloReplayArgsV1()` – rekonstruiert die DOM-freien Runnerargumente fuer einen deterministischen Re-Run.
- `buildMonteCarloExportV1()` / `readMonteCarloExportV1()` / `createMonteCarloExportDownload()` – erzeugen und lesen `MonteCarloExportV1` mit SHA-256-Runfingerprint, App-/Engineprovenienz, Forward-Policy, deprecated Alias-Telemetrie und eindeutigem sicheren Dateinamen.

**Einbindung:** `simulator-monte-carlo.js` erzeugt Request und Resultat direkt aus den tatsaechlich verwendeten Laufdaten. `monte-carlo-ui.js` stellt den Download erst danach bereit; es gibt keine automatische Persistenz oder Uebertragung.

---

## 4. `monte-carlo-ui.js`
Kapselt DOM-Zugriffe für Monte-Carlo (Progressbar, Checkboxen, Parameter-Inputs und expliziter V1-JSON-Download) und liefert eine UI-Fassade zurück.

**Hauptfunktionen / Exporte:**
- `createMonteCarloUI()` – erzeugt ein UI-Objekt mit Methoden `disableStart()`, `showProgress()`, `updateProgress()`, `finishProgress()`, `readUseCapeSampling()`.
- `readMonteCarloParameters()` – defensives Auslesen der Eingabefelder (Anzahl, Dauer, Blocksize, Seed, Methode).
- `triggerMonteCarloDownload()` – erzeugt Blob/Objekt-URL nur nach Buttonaktion, setzt den sicheren Dateinamen und raeumt die URL wieder auf.

**Einbindung:** Von `simulator-monte-carlo.js` genutzt. UI-bezogene Änderungen sollten hier gebündelt werden.

---

## 5. `scenario-analyzer.js`
Sammelt und sortiert Szenarien (Worst, Perzentile, Pflege, Zufalls-Samples) während der Simulation.

**Hauptfunktionen / Exporte:**
- `ScenarioAnalyzer` – Klasse mit `trackScenario()`/`buildScenarioLogs()`, die Metadaten und Logzeilen fuer charakteristische und zufaellige Szenarien zurueckliefert. Pflegefaelle werden nach fruehestem P1-/P2-Eintritt und hoechstem realen Mehrbedarf getrennt ausgewaehlt.

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

## 8. Backtest-Module

### `historical-backtest-contract.js`

DOM-freier, im historischen Produktbacktest aktivierter Daten- und Jahrescontract. Er
validiert `HISTORICAL_DATA_MANIFEST` und den kanonischen SHA-256-Fingerprint
einmal je Revision/Hash, baut einen immutable Lookup von
`HistoricalYearRecordV1` und stellt Einzelpfad-/Cohort-Batch-Preflights bereit.
Jeder Record trennt ex-post `realized` von `decisionAsOf` und traegt
`sourceYear`, `asOfYear`, Einheit, Ableitung und Qualitaetsstatus. Die aktive
Konvention `realized_t_decision_t_minus_1_v1` verwendet realisierte Werte aus
`t` und CAPE decision-as-of aus `t-1`.

**Hauptfunktionen / Exporte:**
- `createHistoricalBacktestContractProvider()` – gecachter Datasetvalidator und immutable Provider mit abgeleiteten Bounds sowie `preparePeriod()`/`prepareBatch()`.
- `buildHistoricalYearRecord()` / `validateHistoricalYearRecord()` – V1-Builder und strukturierte Recordvalidierung.
- `validateHistoricalDataManifest()` / `computeHistoricalDatasetHash()` – Manifest- und kanonischer SHA-256-Vertrag.
- `HISTORICAL_TEMPORAL_CONVENTION_ID` – stabile ID der aktiven Backtest-Zeitachse.
- `HISTORICAL_ASSIGNMENT_INVENTORY_V1` – maschinenlesbarer Vergleich von Legacy-Backtest, aktivem Monte-Carlo-`annualData`, alternativem Builder und kanonischem D-01-Zielcontract.

**Einbindung:** `simulator-backtest.js` erzeugt einen gecachten Provider und
uebergibt ihn an den produktiven `historical-backtest-runner.js`. Monte Carlo,
Sweep und Worker importieren den Backtestcontract weiterhin nicht.

**Dependencies:** `simulator-data.js`; keine DOM-, Persistenz-, Engine- oder Worker-Abhaengigkeit.

### `historical-backtest-runner.js`

DOM-freier historischer Jahresrunner mit expliziten Dependencies. `runHistoricalBacktest()` akzeptiert normalisierte Inputs, `{ startYear, endYear }`, einen Historical-Data-Provider, additive Engineprovenienz sowie die injizierten Funktionen `simulateYear`, `initializePortfolio`, `computeAdjustmentPct`, `resolveHorizon` und `totalPortfolio`. Der Runner liest weder Browserglobals noch Persistenz.

Vor dem Lauf konsumiert der Runner genau einen vollstaendigen Provider-Preflight.
Er baut jedes `yearData` ausschliesslich aus validierten Records, uebernimmt die
initiale Vierjahres-Markthistorie aus dem Contract und gibt bei einer Luecke
`incomplete` zurueck, bevor die Jahresschleife beginnt. Request und Ergebnis
tragen Dataset-, Manifest-, Temporal-, Engine-Build- und Config-Provenienz.

`BacktestRunResultV1` ist tief eingefroren und enthaelt `BacktestRequestV1`, diskriminiertes Outcome, Warnungen/sichere Fehlerdaten, unverkuerzte `rows`, `requestedYears`, wirtschaftlich erfolgreiche `completedYears`, erste/letzte Laufjahre, kanonische Start-/Endportfolio-Snapshots, Historical-Year-Records, `HistoricalBacktestMetricsV1`, Summary sowie die Legacy-Aliase. Caller-Inputs, Partner-/Tranchenobjekte und historische Records werden vor dem Lauf in eigene Kopien ueberfuehrt; `undefined`, `Date`, `RegExp`, Prototypen und zyklische Referenzen bleiben dabei runnerintern erhalten.

### `historical-backtest-metrics.js`

DOM-freies Metrikwoerterbuch und reine Ableitung fuer das kanonische
`BacktestRunResultV1`.

**Hauptfunktionen / Exporte:**
- `HISTORICAL_BACKTEST_METRIC_DESCRIPTORS` – versionierte Definitionen fuer 24 Metriken mit Einheit, nominal/real-Basis, Aggregation, Nenner, Rundung, Missingness, Outcome-Regel und Rohquelle.
- `deriveHistoricalBacktestMetrics()` – leitet das unverkuerzte `HistoricalBacktestMetricsV1` aus Jahreszeilen und Outcome ab; Summary und Export konsumieren dieselben Werte ohne zweite Berechnung.
- `FLEX_REDUCTION_THRESHOLD_PCT` / `FLEX_REDUCTION_OPERATOR` – gemeinsamer inklusiver `>= 10 %`-Vertrag fuer ID, Label, UI und Export.

### `historical-backtest-cohorts.js`

DOM-freier Diagnose-Runner fuer ueberlappende historische Fenster mit fester,
inklusiver Horizontlaenge (`end = start + horizon - 1`).

**Hauptfunktionen / Exporte:**
- `runHistoricalBacktestCohorts()` – bildet alle Kandidaten, konsumiert genau einen Provider-Batch-Preflight und startet je geeignetem Fenster denselben Single-Path-Runner mit unveraenderten Inputs und `yearIndex=0`.
- `HistoricalBacktestCohortsV1` – inventarisiert `completed`, `ruin`, `incomplete`, `technical_error`, `cancelled` und `insufficient_horizon`; Nullnenner bleiben `null`.
- Jeder Request und Descriptor kennzeichnet die Fenster als ueberlappende historische In-sample-Diagnose, nicht als unabhaengige Stichprobe oder Erfolgswahrscheinlichkeit.

### `historical-backtest-export.js`

DOM-freier, versionierter Exportadapter fuer genau eine kanonische `BacktestRunResultV1`-Instanz.

**Hauptfunktionen / Exporte:**
- `buildHistoricalBacktestRawExport()` / `serializeHistoricalBacktestJson()` – erzeugen `HistoricalBacktestExportV1` mit vollständigem Request-/Resultmanifest, echten JSON-Zahlen und optionalem Cohort-Inventar.
- `serializeHistoricalBacktestCsv()` – projiziert feste technische Jahresfelder ohne Displayformatter; Semikolon, Punktdezimalen, LF, leere Missingness und Formel-Injektionsschutz sind Teil des Contracts.
- `captureHistoricalBacktestEngineProvenance()` – erfasst Engine-API-/Build-ID und einen kanonischen SHA-256-Config-Fingerprint zum Laufzeitpunkt.
- `createHistoricalBacktestDownload()` – liefert Dateiname, Inhalt, MIME-Typ und Fingerprint; schreibt oder uebertraegt selbst nichts.

Der Result-Fingerprint umfasst Schema, Request und kanonisches Ergebnis. `exportedAt`, generierte IDs, Exportmetadaten und interne Diagnostik sind ausgeschlossen. Der Dateiname enthaelt Zeitraum, die ersten 12 Hashzeichen und den Exportzeitpunkt.

### `historical-backtest-ui.js`

DOM-naher, aber rechensemantikfreier UI-/Accessibility-Vertrag fuer historische Backtests.

**Hauptfunktionen / Exporte:**
- `configureHistoricalBacktestControls()` / `validateHistoricalBacktestPeriod()` – projizieren Provider-Bounds in die Felder und validieren leere, nicht-finite, nicht-ganzzahlige, rueckwaertige und ausserhalb liegende Perioden sowie den optionalen Cohort-Horizont.
- `describeHistoricalBacktestResult()` / `renderHistoricalBacktestStatus()` – unterscheiden fachliche Outcomes und sanitizieren Nutzertexte auf stabilen Code, Ursache und Handlungsoption ohne Stack-/Pfaddetails.
- `summarizeHistoricalBacktestDataQuality()` / `renderHistoricalBacktestNotices()` – zaehlen kanonische Observation-Qualitaetsmarker und zeigen die In-sample-Aussagegrenze.
- `createImmutableCohortInventory()` / `renderHistoricalBacktestCohorts()` – teilen denselben tief eingefrorenen Inventarsnapshot mit UI und JSON-Export; Null-Eligible-Raten bleiben `null`/`—` statt `NaN`.
- `buildAccessibleBacktestTableHtml()` – erzeugt Caption, `scope="col"`, verstaendliche Headernamen und escaped Zellwerte.

### `simulator-backtest.js`

UI-Adapter, Rendering und expliziter Download fuer historische Backtests.

**Hauptfunktionen / Exporte:**
- `initializeBacktestUI()` – verdrahtet Start-, Detail-, Cohort- und Downloadcontrols genau einmal und persistiert nur die bestehende Detailstufe.
- `runBacktest()` – liest und validiert DOM-Inputs, delegiert an `runHistoricalBacktest()` und optional `runHistoricalBacktestCohorts()` und legt das immutable `BacktestRunResultV1` gemeinsam mit derselben Row-Referenz im `backtest_ui_state_v1` ab. Injektionsoptionen dienen deterministischen Browser-Gates; der Standardpfad nutzt die produktiven Dependencies.
- `renderBacktestLog()` / `exportBacktestLogData()` – lokalisierte semantische Tabelle beziehungsweise JSON-/CSV-Download ueber den Raw-Serializer; JSON erhaelt bei aktivierter Diagnose exakt das angezeigte Cohort-Inventar.
- Backtest-Logs zeigen Mindest-Flex-Betrag und Status; im Detailmodus zusaetzlich Blockgrund und effektiven Mindest-Flex-Wert nach der Policy.

**Einbindung:** Wird in `initializeUI()` importiert und bindet den Startbutton ohne Inline-Handler an die Backtest-Controls. Nutzt `historical-backtest-runner.js` fuer die DOM-freie Jahresschleife, `historical-backtest-ui.js` fuer UI/A11y, `historical-backtest-export.js` fuer Raw-Downloads und `simulator-main-helpers.js` nur fuer die Displayprojektion.

**Dependencies:** `historical-backtest-runner.js`, `historical-backtest-cohorts.js`, `historical-backtest-ui.js`, `historical-backtest-export.js`, `simulator-engine-wrapper.js`, `simulator-portfolio.js`, `simulator-main-helpers.js`, `simulator-utils.js`, `simulator-data.js`.

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
- Dropdown fuer bis zu 31 Szenario-Logs (bis zu 16 charakteristische + 15 zufaellige)
- Checkboxen für Pflege-Details und detailliertes Log
- Detailspalten fuer Entnahme-/Payout-/VPW-Transparenz (`EntPlan`, `EntEff`, `VPW€`, `VPWFlex`, `StatFlex`, `Liq>P`, `Liq<P`, `Liq>Z`, `Port>P`, `PortEnd`)
- Mindest-Flex-Spalten: `MinFlex€`, `MinFSt` sowie im Detailmodus `MinFBlock` und `MinFEff`
- JSON/CSV-Export für ausgewählte Szenarien
- Pflege-KPI-Dashboard mit getrennten P1-/P2-Verteilungen, Stichprobengroessen, nullable bedingten Kennzahlen und realen Haushalts-Mehrbedarfen
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
- `buildKpiDashboard()` bezeichnet `depotErschoepfungsQuote` sichtbar als
  „Ruin oder Aktien/Gold ≤ 100 €“ und stellt klar, dass freie Liquidität und
  Pflegebucket nicht zur 100-Euro-Schwelle gehören; technischer Key und
  Aggregation bleiben unverändert.

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
- `Float32Array`: `cutYearShareRatio`, kpiKuerzungsjahre,
  kpiMaxKuerzung, volatilities, maxDrawdowns, etc. Der kanonische
  `cutYearShareRatio` verwendet bei fehlendem Nenner einen endlichen
  0-Platzhalter; `cutYearShareMissingness` unterscheidet ihn zwingend von einem
  beobachteten Nullanteil. JSON serialisiert Missingness als `null`.
- `Uint8Array`: zusaetzlich `cutYearShareMissingness` mit den V1-Codes fuer
  beobachtet, nicht beobachtbar und technischer Fehler
- `Uint8Array`: kpiLebensdauer, depotErschoepft, alterBeiErschoepfung

`MonteCarloPathSummaryV1` ergaenzt `Float64Array`-Werte fuer den realen
Depotentnahme-P10 je Run, `Uint32Array`-Beobachtungszahlen und getrennte
`Uint8Array`-Missingness fuer Haupt- und Stresspfad. Der registrierte
Transferbedarf steigt dadurch von 75 auf 93 Byte pro Run; volle Jahresreihen
und die fruehere `runIdx % 100`-Stichprobe werden nicht uebertragen.

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
- `cutYearSharePct`: P50, `sampleSize`, ausgeschlossene Runs, inklusive
  10-Prozent-Schwelle und expliziter Zaehler-/Nennervertrag. Der alte
  `kpiKuerzungsjahre`-P50 bleibt nur als deprecated absoluter Jahreszaehler bis
  maximal Slice 11 erhalten.
- `kpiMaxKuerzung`: P50
- `depotErschoepfungsQuote`: Anteil der Läufe mit `isRuin` oder
  Aktien-plus-Gold-Endbestand ≤ 100 Euro;
  `alterBeiErschoepfung`: P50 des ersten entsprechenden Ereignisalters
- `volatilities`: P50 der Stichproben-Standardabweichung (N-1) jaehrlicher
  Portfolio-Renditen ohne zusaetzlichen Annualisierungsfaktor;
  `maxDrawdowns`: davon getrennte P50-/P90-Drawdowns
- `realWithdrawalP10`: kanonischer runbasierter P10/P50-Vertrag mit `sampleSize`, ausgeschlossenen Runs und Missingness-Inventar. `extraKPI.consumptionAtRiskP10Real` bleibt nur als befristeter skalarer Read-Alias fuer bestehende Consumer erhalten.
- `extraKPI.lossCarryTaxSavings`: `total`, `perRunMean`
- `extraKPI.healthBucket`: Nutzungs-/Erschoepfungsquote, Nutzungssummen, Restbucket, Zieldeckung, Zielluecke und Bucket-Zinsen
- `stressKPI`: maxDD, timeShareAbove45, cutYears, `realWithdrawalP10`, recoveryYears; der alte CaR-Skalar bleibt als befristeter Read-Alias markiert
- `extraKPI.pflege.p1` / `.p2`: getrennte Eintrittsquoten mit Zaehler/Nenner sowie bedingte P50-Werte fuer Eintrittsalter, Pflegejahre und realen Mehrbedarf; leere Stichproben sind `null` mit `sampleSize=0` und Missingness-Grund
- `extraKPI.pflege.household`: Pflegequote, simultane Pflegejahre, realer gesamter und maximaler jaehrlicher P1-plus-P2-Mehrbedarf, reale Endvermoegens-Gruppenmediane und bedingte Shortfall-Raten
- `extraKPI.pflege.comparison`: `endWealthNoCareMinusCareRealEur` als ungepaarte, nicht-kausale Gruppenmedian-Differenz; UI-Geldwerte sind real zur Startpreisbasis, nominale Path-Felder tragen `NominalEur`

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
  │    ├─ app/simulator/historical-backtest-runner.js
  │    ├─ app/simulator/simulator-engine-wrapper.js (injiziert)
  │    ├─ app/simulator/simulator-portfolio.js (Initialisierung injiziert)
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
3. `mc-run-context.js`: Bereitet Chunk-Kontext, RNG, Buffers, Sampling-Basiskonfiguration und Progress-Intervall vor.
4. `mc-year-sampling.js`: Loest `MonteCarloSamplingContractV1` einmal je Chunk auf und liefert Startjahr-/CAPE-Sampling sowie die merge-invariante Ziehungsdiagnostik.
5. `mc-life-events.js`: Initialisiert den Run-Life-State fuer Care-Meta, Partnerstatus, Care-RNGs und HouseholdContext.
6. `tail-risk-overlay.js`: Wendet bei explizitem Opt-in ein deterministisches Tail-Risk-Ereignisfenster auf die gezogenen Jahresdaten an, ohne historische Daten zu mutieren.
6. `mc-stress-tracker.js`: Kapselt Stress-Metrik-Initialisierung, Jahresfortschreibung und Buffer-Schreibung.
7. `mc-log-builder.js`: Baut Ruin-, Jahres- und Todesfall-Logzeilen mit zentralen Alive-/Care-Feldern.
8. `mc-run-metrics.js`: Summiert im Jahresloop reale/nominale Pflege-Mehrbedarfe und schreibt am Run-Ende getrennte P1-/P2-/Haushalts-KPIs, Worst-Runs und `runMeta` fort.
9. `monte-carlo-runner.js`: Führt die reinen Simulationen durch (inkl. Pflege-KPIs) und nutzt `simulator-engine-wrapper.js` für die Jahresschleifen.
10. `monte-carlo-statistics.js` und `monte-carlo-aggregates.js`: Berechnen Wilson-Unsicherheit und reduzieren die global indexierten Depotentnahme-P10-Skalare in Runindex-Reihenfolge.
11. `scenario-analyzer.js`: Zeichnet Worst/Perzentil-/Pflege-/Zufalls-Szenarien waehrend der Runs auf; fruehe Pflege wird fuer P1 und P2 separat ermittelt.
12. `monte-carlo-contracts.js` und `monte-carlo-export.js`: Bauen den tief eingefrorenen Request-/Result-/Provenienzvertrag aus genau diesem Lauf; der Reader prueft Versionen, Pflichtfelder und Fingerprints fail-closed.
13. `monte-carlo-ui.js`: Schaltet den V1-JSON-Download fuer die explizite Nutzeraktion frei.
14. `simulator-results.js`: `displayMonteCarloResults()` zeigt Aggregationen und Szenario-Logs an.

### Parameter-Sweep
1. `simulator-main.js`: Sweep-Button bindet `runParameterSweep()` aus `simulator-sweep.js`.
2. `simulator-sweep.js`: Iteriert über Whitelist-Parameter, nutzt Worker-Jobs (Fallback seriell).
3. `simulator-heatmap.js`: `renderHeatmapSVG()` visualisiert Ergebnisse.

### Backtest
1. `simulator-main.js`: Backtest-Controls triggern `runBacktest()` aus `simulator-backtest.js`.
2. `historical-backtest-ui.js`: Projiziert Provider-Bounds, validiert Periode/Cohort-Horizont und aktualisiert Status-/Fehlerregionen.
3. `simulator-backtest.js`: Liest normalisierte DOM-Inputs und nutzt den gecachten Historical-Data-Provider.
4. `historical-backtest-runner.js`: Fuehrt die DOM-freie Jahresschleife mit eigenen Laufkopien und injiziertem `simulateOneYear()` aus; optional erzeugt `historical-backtest-cohorts.js` das feste Fensterinventar.
5. `simulator-backtest.js`: Haelt das immutable Resultat und dieselbe Row-Instanz fuer Summary, Tabelle und Export; `historical-backtest-ui.js` projiziert Status, Warnungen, Cohorts und Tabellensemantik.
6. `historical-backtest-export.js`: Erzeugt nach explizitem Klick das versionierte Raw-JSON oder die feste technische CSV-Projektion ohne Abhaengigkeit vom sichtbaren Detailmodus.

---

## Szenario-Log-System

Nach jeder Monte-Carlo-Simulation werden bis zu 31 Szenarien gespeichert:

### Bis zu 16 Charakteristische Szenarien
- **Vermögensbasiert:** Worst, P5, P10, P25, Median, P75, P90, P95, Best
- **Pflege-spezifisch:** Worst mit Pflege, laengste Pflegedauer, hoechster realer Pflege-Mehrbedarf sowie fruehester Eintritt P1 und P2 (soweit beobachtet)
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
- **Backtest-Setup:** `initializeBacktestUI()` in `simulator-backtest.js` verknuepft Zeitraum-, Start-, Cohort-, Detail- und Raw-Downloadcontrols per idempotenter Modulbindung. `historical-backtest-ui.js` erwartet die Status-, Hint-, Fehler-, Notice-, Cohort- und Tabellen-DOM-IDs des Backtest-Tabs; die Jahresschleife selbst liegt in `historical-backtest-runner.js` und ist DOM-/Persistenz-frei.
- **Monte-Carlo-Start:** `runMonteCarlo()` in `simulator-monte-carlo.js` liest `mcAnzahl`, `mcDauer`, `mcBlockSize`, `mcSeed`, `mcMethode`, `mcStartYearMode`, `mcStartYearFilter`, `mcStartYearHalfLife` sowie Progress-UI (`mc-progress-bar*`). Liefert nach Abschluss aggregierte Ergebnisse an `displayMonteCarloResults()`.
- **Startjahr-Sampling:** `mc-run-context.js` bereitet die Basiskonfiguration vor; `mc-year-sampling.js` kapselt `FILTER` (harte Grenze), `RECENCY` (Half-Life), `UNIFORM`, CAPE-Kandidaten und `MonteCarloSamplingContractV1`. CAPE hat vor Gewichtung Vorrang. Das gewaehlte Startjahr ist fuer Fixed-/Stationary-Block sowie Markov/IID das erste tatsaechliche Marktjahr; ignorierte Optionen und Fallbacks bleiben im Vertrag sichtbar.
- **Samplingdiagnostik:** Direktlauf und Worker transportieren `MonteCarloSamplingDiagnosticsV1` mit Samplingvertrag, Datenfingerprints, Startjahr-/Jahres-, Quellen-, Regime-, Stationary- und Tail-Risk-Zaehlern. `monte-carlo-chunk-result.js` validiert und merged diese Zaehler unabhaengig von Chunkreihenfolge.
- **Life-State:** `mc-life-events.js` initialisiert Care-Meta, Partnerstatus, Care-RNGs und HouseholdContext. Die Jahreslogik bleibt im Runner-Hot-Path, bis eine vollstaendige Extraktion den Benchmark stabil erfuellt.
- **Schaetzer und reale Depotentnahme:** `monte-carlo-statistics.js` liefert Wilson-95-Prozent-Intervalle fuer die binaere Floor-Deckung sowie die laufgewichtete Aggregation eines realen Depotentnahme-P10-Skalars je auswertbarem Run. Direkter und Workerpfad transportieren P10, Beobachtungszahl und Missingness indexiert; eine volle Jahresreihe wird nicht gemerged.
- **Stress-Metriken:** `mc-stress-tracker.js` kapselt Portfolio-Drawdown, Quote-Above-4.5, Cut-Years, runbasierte reale Depotentnahme P10 und Recovery-Years fuer Stress-Presets. Nullauffuellung nach Ruin endet am Stressfenster beziehungsweise am Tod des Haushalts.
- **Logzeilen:** `mc-log-builder.js` vereinheitlicht Ruin-, Jahres- und Todesfall-Logs. Builder laufen nur fuer tatsaechlich geloggte Runs. Backtest-Logs und Monte-Carlo-Scenario-Logs verwenden dieselbe Semantik fuer Entnahme-/Payout-/VPW-Felder.
- **Run-Metriken:** `mc-run-metrics.js` kapselt Ergebnisbuffer, getrennte Pflege-Listen und -Zaehler, den realen/nominalen Pflege-Mehrbedarf, Safety-Run-Zaehler, Worst-Run-Auswahl und `runMeta`.

---

## Platzierung neuer Features & Helfer

- **UI-spezifische Logik (Formular, Presets, Tooltips):** In thematischen UI-Modulen (`simulator-ui-pflege.js`, `simulator-ui-rente.js`) oder generisch in `simulator-main-helpers.js`. `simulator-main.js` sollte nur die Verkabelung übernehmen.
- **Simulation / Domain-Logik:** Pflege-/Renten-/Stressberechnungen gehören in `simulator-engine-helpers.js`, `simulator-engine-direct.js` oder `simulator-portfolio.js`. Monte-Carlo-spezifische Steuerparameter in `simulator-monte-carlo.js`. Sweep-spezifische Regeln in `simulator-sweep.js` bzw. `simulator-sweep-utils.js`.
- **Rendering & Exporte:** Tabellen-/CSV-/Heatmap-Aufbereitung in `simulator-results.js`, `simulator-heatmap.js` oder `simulator-main-helpers.js` (falls UI-nah). Backtest-Display in `simulator-backtest.js`; versionierte Backtest-Rohvertraege ausschliesslich in `historical-backtest-export.js`.
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

**Last Updated:** 2026-07-18
