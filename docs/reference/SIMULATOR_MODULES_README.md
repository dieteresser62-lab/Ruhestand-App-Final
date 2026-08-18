# Simulator-App – Modulübersicht

Die Simulator-App ist inzwischen in mehrere spezialisierte ES6-Module zerlegt. Die zentralen Abläufe (Monte-Carlo, Sweep, Backtests, Pflege-UI) leben nicht mehr als Monolith in `simulator-main.js`, sondern wurden in klar abgegrenzte Dateien ausgelagert. Dieses Dokument beschreibt Zweck, Haupt-Exports, Einbindungspunkte und die gewünschte Aufteilung neuer Features.

**Stand:** 2026-08-17 (einschliesslich offener globaler
Aktien-Forschungsproxykette, Langlebigkeit, Stationary Bootstrap,
Tail-Risk-Overlay, Realentnahmevertrag, getrennter Pflege-KPI-Semantik,
vollstaendigem historischen Backtest-Contract, SimulationDataInventoryV1
sowie verlustfreier Profilasset-/Goldzielaggregation und technisch
nachgebesserter, extern noch nicht freigegebener Slice-17-Runway-Semantik
sowie intern validierter, extern noch nicht freigegebener wahrheitsgetreuer
Risikoanzeigen und des Monte-Carlo-Ergebnis-Cockpits)

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
- `simulator-household-needs-persistence.js` – strikter V1-Vertrag fuer manuelle Haushalts-Overrides von Floor, Flex und Mindest-Flex; einmalige `sim_`-Altwertuebernahme, feldbezogene Provenienz, Reset-Marker und kontrollierter Fallback
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

Floor, Flex und Mindest-Flex haben zwei klar getrennte Quellen: Positive, je
Profil in Balance gepflegte Werte bilden den additiven Profilverbund-Default;
bei leeren beziehungsweise als `0` gespeicherten Balance-Feldern bleibt ein
historischer positiver Profilwert der Lesefallback. Manuelle
Änderungen im Simulator werden unter `household_simulator_needs_v1` als globale,
feldbezogene Haushalts-Overrides gespeichert. Beim ersten Start nach Einführung
des Vertrags wird nur im Einprofil-Haushalt ein vollständiges, gültiges und von
den aktuellen Profildefaults abweichendes historisches `sim_`-Trio einmalig
übernommen und sichtbar gemeldet. Im
Mehrprofil-Haushalt bleibt die aggregierte Profilbasis maßgeblich; alte
Einzelprofilwerte werden wegen ihrer nicht beweisbaren Herkunft nicht zum
Haushaltswert befördert. Ein `migration_pending`-Datensatz entkoppelt die
Vertragserstellung vom späteren Profilverbund-Aufbau. Jede Eingabe wird unabhängig
kanonisiert und gespeichert, damit ein leeres Nachbarfeld keine gültige Änderung
verwirft. Für die Flex-/Mindest-Flex-Beziehung dient bei einem gerade leeren
Nachbarfeld dessen letzter wirksamer Profilwert als Prüfbasis. Ungültige
bearbeitete Felder werden über die native Feldvalidierung direkt am Eingabefeld
gemeldet; die Browserblase erscheint erst beim abschließenden `change`, nicht bei
jedem Tastendruck.
Beschädigte V1-Daten heilen nach einer einmaligen Warnung zum Profil-Default;
unbekannte Schemaversionen bleiben dagegen auch bei Eingabeversuchen unverändert
gespeichert; ihre Warnung wird nach einmaliger Anzeige über einen separaten
globalen Marker quittiert. Änderungen erfordern dann einen bewussten Reset.
Der Reset wartet vor dem Reload auf den dauerhaften Flush und zeigt einen
Flush-Fehler an.
Fehlt das Profilverbund-Steuerelement oder scheitert der Profilaufbau, bleibt die
Migration ausstehend und Simulatorläufe werden über den Recovery-Blocker
fail-closed gesperrt.

---

## 2. `simulator-monte-carlo.js` (~220 Zeilen)
Koordiniert die Monte-Carlo-Simulation und verbindet DOM-Interaktion mit der reinen Simulationslogik.

**Hauptfunktionen / Exporte:**
- `runMonteCarlo()` – startet genau einen generationengebundenen Lauf, liest UI-Parameter, orchestriert `monte-carlo-runner.js` und Web-Worker-Jobs, aktualisiert Progress/UI und publiziert nach dem Lauf den versionierten V1-JSON-Download (Default: 8 Worker, 500 ms Job-Budget). Doppelte Starts liefern dasselbe laufende Promise.
- `cancelMonteCarlo()` – ist single-flight, schaltet die UI auf `cancelling`, terminiert die fuer die aktive Generation arbeitenden Worker und verhindert einen seriellen Fallback.
- Validiert vor dem Start, dass `Mindest-Flex p.a.` den `Flex-Bedarf p.a.` nicht uebersteigt, optionale Tail-Risk-Parameter innerhalb des freigegebenen Contracts liegen und `MonteCarloParametersV1` samt Worker-/Budgetvertrag erfuellt ist. Grosslaeufe ueber 100.000 bis maximal 1.000.000 Runs benoetigen eine pro Start verbrauchte Bestaetigung.

**Einbindung:** Wird von `simulator-main.js` importiert und im UI-Bootstrap an den Start-Button (`#mcButton`) gekoppelt. Die Laufzeitbindung des Cancel-Buttons (`#mcCancelButton`) erfolgt ueber die UI-Fassade. Alle Monte-Carlo-spezifischen Anpassungen sollten hier erfolgen, damit `simulator-main.js` schlank bleibt.

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
- `resolveMonteCarloSamplingContractV1()` / `pickMonteCarloStartYearIndex()` – versionierte Praezedenzaufloesung und per-Run-Auswahl inklusive CAPE-Kandidaten, methodenspezifischer Jahr-1-Regel sowie Preflight fuer harte Regime- und historische Stresspools.
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
- `createMonteCarloRunResultV1()` / `validateMonteCarloRunResultV1()` – erhalten den historischen Ergebnisvertrag fuer Reproduzierbarkeit und Replay.
- `createMonteCarloRunResultV2()` / `projectMonteCarloRunResultV2()` / `validateMonteCarloRunResultV2()` – projizieren Outcome-Inventar, Heatmap-Intervalle, explizite Ratio-/Prozentpunktsemantik, Observation-Counts sowie nominalen und realen Maximum-Drawdown fail-closed in den aktuellen Exportvertrag.
- `extractMonteCarloReplayArgsV1()` – rekonstruiert die DOM-freien Runnerargumente fuer einen deterministischen Re-Run.
- `buildMonteCarloExportV2()` / `readMonteCarloExport()` / `createMonteCarloExportDownload()` – schreiben den aktuellen `MonteCarloExportV2` mit SHA-256-Runfingerprint, App-/Engineprovenienz und sicherem Dateinamen. V2 besitzt den expliziten Bezeichner `MONTE_CARLO_EXPORT_V2_VERSION`; der deprecated unqualifizierte Altbezeichner behaelt seine historische V1-Bedeutung. Der Dispatcher liest V1 nur mit Kompatibilitaetswarnung, V2 direkt und weist unbekannte Versionen fail-closed ab. `buildMonteCarloExportV1()` / `readMonteCarloExportV1()` bleiben fuer historische Artefakte erhalten.
- `projectScenarioLogV2()` / `serializeScenarioLogExportV2()` / `serializeScenarioLogCsvV2()` – bilden den gemeinsamen semantischen Projektor fuer Szenario-JSON und -CSV. `ScenarioLogExportV2` typisiert Finanz- und Terminalrecords, trennt Ratio- von Prozentpunktfeldern sowie Post-Policy- von Erfuellungswerten und erzeugt den CSV-Header aus der sortierten Vereinigungsmenge aller Recordschluessel. Akkumulationsjahre markieren Entnahme- und Mindest-Flex-Gruppen als nicht anwendbar, ohne beobachtete Returns zu verwerfen.

**Snapshotlinie:** `MonteCarloSnapshotPolicyV1` trennt die unveraenderliche
Referenz `pre-hardening-v1`, versionierte semantische Post-Slice-Referenzen
und den extern noch nicht freigegebenen Integrationskandidaten
`monte-carlo-v1-final`. Solange kein extern freigegebener Nachfolger
vorliegt, ist die oeffentliche `currentReference` `null`;
`post-backtest-data-07-v1` ist der neueste getrennte, bis zum erneuten
externen Review `pending` markierte Demografie-/Pflege-/Hinterbliebenen-
Messkandidat auf Basis von `post-backtest-data-06-v2`. Der
veraenderliche Zeiger wird aus der eingefrorenen Ergebnisprojektion
ausgeschlossen. Pending Kandidaten werden daher weder zur aktuellen Referenz
erklaert noch wegen einer reinen Zeigeraenderung dupliziert. Fruehere Suite-
und Backtest-Datenreferenzen werden nicht ueberschrieben. Fixture-spezifische
Vergleichsausnahmen stehen nur in der Messfixture, nie im produktiven
Runtimevertrag. Unerklaerte Deltas blockieren die Fortschreibung.

**Einbindung:** `simulator-monte-carlo.js` erzeugt Request und internes Resultat direkt aus den tatsaechlich verwendeten Laufdaten. `monte-carlo-ui.js` stellt den MC-Download erst danach bereit; die V2-Projektion erfolgt an der Exportgrenze. `simulator-results.js` verwendet fuer Szenario-JSON und -CSV denselben V2-Projektor. Es gibt keine automatische Persistenz oder Uebertragung.

---

## 3j. `monte-carlo-parameters.js`
DOM-freier Eingangs- und Ressourcenvertrag fuer alle Monte-Carlo-Consumer.

**Hauptfunktionen / Exporte:**
- `normalizeMonteCarloParametersV1()` – validiert ganze, endliche Werte ohne Suffixe, alle erlaubten Enums und Booleans sowie Run-, Mortalitaetshorizont-, Block-, Seed- und Startjahrabhaengigkeiten; Default sind 10.000 Runs.
- `normalizeMonteCarloResourceConfigV1()` / `resolveMonteCarloWorkerCountV1()` – validieren 0=auto beziehungsweise 1-32 Worker und 50-5.000 ms Jobbudget; auch die Hardware-Automatik endet bei 32 Workern.
- `estimateMonteCarloResourcesV1()` – liefert Run-Jahre, eine auf 978 gerundeten Result-Bytes je Run basierende MiB-Schaetzung (Standardmessung Slice 11: 977,62585 Byte je Run), Speicherklasse, Belastungsstufe und das Bestaetigungsflag oberhalb 100.000 Runs.

**Einbindung:** `monte-carlo-ui.js`, `monte-carlo-runner.js`, `workers/mc-worker.js` und `auto-optimize-worker.js` rufen denselben Contract auf. Kein Consumer darf Parameter per `parseInt` teilakzeptieren oder fachliche Werte still begrenzen.

---

## 4. `monte-carlo-ui.js`
Kapselt DOM-Zugriffe für Monte-Carlo (semantische Progressbar, Live-Status, Fokus, Start-/Cancelzustand, Kostenschaetzung, Grosslastbestaetigung, Parameter-Inputs und expliziter V1-JSON-Download) und liefert eine UI-Fassade zurück.

**Hauptfunktionen / Exporte:**
- `createMonteCarloUI()` – erzeugt ein UI-Objekt mit Methoden fuer `running`/`cancelling`/`idle`, eine idempotent loesbare Cancelbindung, ARIA-Progress/Status, Fokusziele, Grosslastbestaetigung und `readUseCapeSampling()`.
- `readMonteCarloParameters()` – liest die Eingabefelder und delegiert ohne Teilparsing an `normalizeMonteCarloParametersV1()`.
- `initMonteCarloResourceControls()` – aktualisiert Run-Jahre/Speicherklasse ohne automatischen Lauf und verwirft eine Bestaetigung, sobald Runzahl oder Dauer geaendert wird.
- `triggerMonteCarloDownload()` – erzeugt Blob/Objekt-URL nur nach Buttonaktion, setzt den sicheren Dateinamen und raeumt die URL wieder auf.

**Einbindung:** Von `simulator-monte-carlo.js` genutzt. UI-bezogene Änderungen sollten hier gebündelt werden.

---

## 4a. `mc-result-cockpit.js`

Zentrale, rein darstellungsbezogene Zustandsgrenze fuer das Monte-Carlo-
Ergebnis-Cockpit. Sie gruppiert Setup, Laufkopf und Ergebnisnavigation, ohne
Monte-Carlo-, Replay-, Persistenz- oder Exportdaten zu veraendern.

**Hauptfunktionen / Exporte:**

- `initMonteCarloResultCockpit()` – initialisiert je Dokument genau einmal die
  Setup-Zusammenfassung, Recalculate-Delegation, fuenf ARIA-Tabs, Replay-
  Rueckverweise in beide Richtungen und die delegierten Vergleichstabs.
- `activateMonteCarloResultView()` – aktiviert eine Ergebnisansicht anhand
  ihrer View-ID oder eines enthaltenen Zielknotens. Alle programmatischen
  Cockpit-Fokuspfade verwenden diese Grenze vor `focus()`.
- `completeMonteCarloCockpitRun()` – aktualisiert nach Erfolg die
  Setup-Zusammenfassung und schliesst das Setup. Der aufrufende UI-Lifecycle
  aktiviert danach ueber `activateMonteCarloResultView()` den Ueberblick;
  Fehler und Abbruch schliessen das Setup nicht automatisch.
- `updateMonteCarloSetupSummary()` und
  `updateMonteCarloReplayVariantBadge()` – projizieren vorhandene Eingaben
  beziehungsweise die sichtbare Variantenliste rein visuell; sie sind keine
  zweite Validierungs- oder Persistenzquelle. Die drei Replay-Schrittzustaende
  leitet `updateStressReplayStepStates()` in `stress-replay-ui.js` aus
  Workspace, Banner und Fieldset ab.

**DOM- und Fokusvertrag:** Die Cockpit-Navigation verwendet ausschließlich
`.mc-view-*` und kollidiert nicht mit den vier Haupttabs. Inaktive Panels sind
am Bildschirm `hidden`; der Roving-Tabindex unterstuetzt Links/Rechts sowie
Home/End. `#scenarioSelector` bleibt ein einziger stabiler Knoten in der
Ansicht „Szenario-Logs“ direkt vor `#scenarioLogOutput`.
`displayMonteCarloResults()` darf nur dessen dynamischen `#scenarioSelect`-
Inhalt erneuern und projiziert dieselbe Auswahl lesend in Replay-Schritt 1.
Die Rueckverweise zwischen Logs und Replay sowie asynchrone Replay-Abschluesse
aktivieren vor dem Fokus die jeweilige sichtbare Ansicht. Das native Setup-
Disclosure zeigt abhaengig von `[open]` „Setup bearbeiten“ oder „Setup
ausblenden“ samt Chevron. Der eingeklappte kanonische `#mcButton` ist kein Erfolgs-
Fokusziel; „Neu rechnen“ delegiert lediglich seinen Klick.

**Responsive-/Druckvertrag:** Bis 899 CSS-Pixel stapeln Variantenliste und
Editor; lokale Tabellen duerfen horizontal scrollen, die Seite selbst nicht.
Im Druck macht `simulator.css` Setup, alle fuenf MC-Panels, Replay-Details und
alle drei Vergleichssektionen sichtbar, entfernt Navigation und Sticky-
Verhalten und hebt abschneidende Hoehen-/Overflow-Grenzen auf. Der einzige
`#print-footer` steht am Ende des MC-Bereichs; JavaScript fuehrt keinen
separaten Druckzustand.

---

## 5. `scenario-analyzer.js`
Sammelt und sortiert Szenarien (Worst, Perzentile, Pflege, Zufalls-Samples) während der Simulation.

**Hauptfunktionen / Exporte:**
- `ScenarioAnalyzer` – Klasse mit `trackScenario()`/`buildScenarioLogs()`, die Metadaten und Logzeilen fuer charakteristische und zufaellige Szenarien zurueckliefert. Pflegefaelle werden nach fruehestem P1-/P2-Eintritt und hoechstem realen Mehrbedarf getrennt ausgewaehlt.

**Einbindung:** Von `simulator-monte-carlo.js` instanziiert und als Callback an den Runner übergeben.

## 5a. Stress-Pfad-Replay

Das Stress-Pfad-Replay fixiert den exogenen Verlauf eines ausgewaehlten
`per-run-seed`-Monte-Carlo-Runs. Der normale Batch bleibt unveraendert; nur der
explizite serielle Nachlauf fordert fuer den absoluten Run-Index einen
`StressReplayCaptureV1` an. Direkter und workerartig gesplitteter Chunk liefern
fuer denselben absoluten Index identische Log- und Capture-Daten.

**DOM-freie Module:**

- `stress-replay-contract.js` – Schemas, kanonische SHA-256-Fingerprints,
  Whitelist, Varianten-/Workspace-/Vergleichsvalidierung und Groessenlimits.
  Persistierte Varianten dispatchen ueber ihre `whitelistVersion`: V1 bleibt
  unveraendert, V2 ergaenzt `startFloorBedarf`, `startFlexBedarf` und
  `minimumFlexAnnual`. Ein explizites `0` bleibt ein Patchblatt; nur
  wirkungsgleiche Blaetter werden nach der Praesenzpruefung entfernt. Die
  effektive Relation `minimumFlexAnnual <= startFlexBedarf` wird mit Baseline-
  Fallback fail-closed validiert und niemals geklemmt.
  `maxSkimPctOfEq` gilt nur von 0 bis 50, `maxBearRefillPctOfEq` nur von 0 bis
  70; nicht endliche und ausserhalb liegende Werte werden nicht geklemmt. Neue
  Workspaces verwenden `StressReplaySourceIdentityV2`: Struktur und
  Feldpraesenz bleiben exakt, Geld- und Verhaeltniswerte werden nach Reload mit
  denselben Pfadtoleranzen wie die Originalzeilen abgeglichen. Die je Quellzeile
  vorhandenen Reconciliation-Werte sind als kanonische Praesenz-/Werteliste
  kompakt kodiert und durch Descriptor-, Identity- und Workspace-Fingerprints
  gebunden.
- `stress-replay-path-materializer.js` – Quellidentitaet, ScenarioLog-Abgleich,
  vollstaendiger Markt-/Household-Pfad und unabhaengiger Post-Ruin-Shadow-Seed.
  Vor dem ersten Shadow-Jahr ist der kanonische Marktstatus des Ruinjahres
  genau einmal fortgeschrieben.
- `stress-replay-runner.js` – RNG-freier Single-Path-Lauf mit unveraenderter
  Baseline oder validiertem Strategiepatch; Ruin, Tod, Horizont und technischer
  Fehler bleiben getrennte Statuswerte. `ruin` und `all_dead` enden beide mit
  einer expliziten Terminalzeile; `terminal_death` ist kein Finanzjahr.
- `stress-replay-variant.js` – Baseline und maximal drei Alternativen. Erlaubt
  sind nur bestehende Strategieparameter sowie in V2 die drei Ausgangsbedarfe;
  Asset-, Profil- und Tranchenwerte bleiben fixiert. Neue Varianten werden als
  V2 erzeugt, geladene V1-Varianten behalten ihre alten Regeln und Fingerprints.
- `stress-replay-transactions.js` und `stress-replay-comparison.js` – additive
  Transaktionsklassen mit belegten Simulator-Producern, explizite Missingness
  fuer unbekannte Event- und Breakdown-Werte, KPI-Deltas und erste
  Delta-Marker. Mehr-Faktor-Varianten werden sichtbar benannt; ein allgemeines
  Finanzranking und eine Asset-Allokations-Gegenfaktik sind ausgeschlossen.
- `stress-replay-persistence.js` und `stress-replay-export.js` – genau ein
  lokal transaktional gespeicherter Workspace mit Readback/Rollbackvertrag,
  bestaetigtes Ersetzen/Verwerfen, versionierter JSON-Roundtrip und Nur-Lesen-
  Modus bei Kompatibilitaetsabweichung. Die unabhaengig aus den originalen
  ScenarioLog-Zeilen gebildete Herkunftsidentitaet bleibt bei Reload und Import
  erhalten. V1-Herkunftsidentitaeten bleiben byte- und fingerprintstabil
  lesbar, liefern aber `source_identity_refix_required` und werden nicht
  automatisch migriert oder ausgefuehrt. V2 speichert und exportiert fuer den
  gebundenen Source-Praefix die tatsaechlich vorhandenen Reconciliation-Werte
  je Zeile (unter anderem Vermoegen, Renten, Flex-Erfuellung und
  Jahresentnahme), nicht nur einen Hash. Die Privacy-Ausschlussliste bleibt
  konsistent: vollstaendige Source-Scenario-Logs, lokale Dateipfade, Secrets
  und unbeteiligte Speicherrecords werden nicht exportiert. Der Export enthaelt
  dennoch Finanzdaten und ist vertraulich zu behandeln. Der aktive Key
  `sim.stressReplay.active.v1` wird nicht in allgemeine Snapshots aufgenommen.

**UI-Module:** `stress-replay-ui.js` steuert Sitzung, Fixieren, Varianten und
Import/Export; `stress-replay-renderer.js` rendert Patchvorschau, KPIs,
Delta-Timeline und Jahrestabelle. Der fokussierte Editor zeigt Name, Floor,
Flex und Mindest-Flex; die 17 bisherigen Felder liegen in einem initial
geschlossenen, nativen Experten-Disclosure. Leere Bedarfsfelder bedeuten
Baselineuebernahme, `0` bedeutet explizite Null. Statuscopy, Fokus und
Live-Regionen machen deutlich, dass alle Aussagen nur fuer den fixierten Pfad
gelten. Der Zustand `idle | success | error` trennt den neutralen Leerzustand
vom dauerhaften, alert-semantischen Vergleichsfehler. Mutationsmeldungen
behaupten einen Vergleichserfolg nur bei einem tatsaechlich erzeugten
Vergleich. Ein
controllerweiter Busy-Zustand sperrt Fixieren, Variantenmutationen,
Neuberechnung, Import, Export und Verwerfen gegen Parallelaufrufe. KPI-Deltas
verwenden eigene Einheiten fuer Jahre und Prozentpunkte statt der Formatter
der absoluten KPI-Werte. Die drei Vergleichssektionen werden bei jedem
Rendererlauf neu erzeugt und ueber delegierte Kennzahlen-/Delta-/Jahres-Tabs
umgeschaltet. Eine vorangestellte Kernaussage waehlt je vergleichbarer
Alternative hoechstens die erste endliche, materielle Abweichung nach der
festen Prioritaet Mindest-Flex-Luecke, Ruinjahr, reales Endvermoegen,
nominales Endvermoegen. Sie sortiert nicht, empfiehlt keine Strategie und
berechnet keine neue Metrik.

**Performancevertrag:** Der End-to-End-Test misst Baseline plus eine
Alternative auf einem materialisierten 60-Jahres-Pfad. Die eingecheckte
Referenzmessung unter WSL2/Node 22 auf einem Ryzen 7 3700X betraegt 435,858 ms
Median bei fuenf Messungen nach zwei Warmups. Die historische Exportbaseline
umfasst 88.524 Byte; der aktuelle 60-Zeilen-V2-Referenzexport misst 109.472
Byte. Sein relatives Budget liegt bei 110.655 Byte (Faktor 1,25), also bleiben
1.183 Byte beziehungsweise rund 1,1 Prozent Reserve. Die Kompaktkodierung ist
deshalb Teil des Groessenvertrags. Jede Erweiterung von
`SOURCE_IDENTITY_V2_RECONCILIATION_FIELDS` muss den maximalen 60-Zeilen-Export
neu messen; verbleibende Reserve darf nicht vorausgesetzt werden. Das
Laufzeit-Regressionsbudget ist relativ (Faktor 4, mindestens 250 ms) und
priorisiert deterministische fachliche Paritaet vor einer unbelegten absoluten
Durchsatzforderung.

---

## 6. `simulator-sweep.js` (~360 Zeilen)
Sweep-spezifische Logik mit Guardrails für Partner:innen-Felder und Heatmap-Ausgabe.

**Hauptfunktionen / Exporte:**
- `runParameterSweep()` – iteriert über Whitelist-Parameter, nutzt Worker-Jobs (Fallback seriell) und leitet Ergebnisse an die Heatmap weiter.
- `displaySweepResults()` – rendert Sweep-KPIs und Statushinweise.
- `initSweepDefaultsWithLocalStorageFallback()` – lädt Sweep-Voreinstellungen und setzt Defaults.

**Einbindung:** Button-Hooks in `initializeUI()` (Sweep-Tab). Nutzt `simulator-sweep-utils.js` für Whitelist/Clone-Logik und `simulator-heatmap.js` für das Rendering.

**Dependencies:** `monte-carlo-runner.js` (Mini-Läufe), `simulator-heatmap.js`, `simulator-results.js`, `simulator-sweep-utils.js`, `simulator-utils.js`, `simulator-data.js`.

**Interaktiver Parametervertrag:** Die Browseroberflaeche bietet genau sieben
Dimensionen mit geprueftem kanonischem Datenpfad
`sweepLiquidityRunwayYears`, `sweepRebalancingBand`, `sweepMaxSkimPct`,
`sweepMaxBearRefillPct`, `sweepGoldTargetPct`, `sweepSurvivalQuantile` und
`sweepGoGoMultiplier`. Nur `horizonYears` bleibt fuer explizite
programmatische `SweepRequestV1`-Aufrufe verfuegbar, ist aber keine
interaktive Sweepdimension, weil die UI aktuarielle Horizonte verwendet.
Die Matrix prueft Zuordnung, Consumer und Provenienz; sie ist kein
eigenstaendiger Nachweis der KPI-Wirkung.

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
validiert `HISTORICAL_DATA_MANIFEST`, seine geordneten, eindeutigen
Reihendiskontinuitaeten und den kanonischen SHA-256-Fingerprint einmal je
Revision/Hash, baut einen immutable Lookup von
`HistoricalYearRecordV1` und stellt Einzelpfad-/Cohort-Batch-Preflights bereit.
Jeder Record trennt ex-post `realized` von `decisionAsOf` und traegt
`sourceYear`, `asOfYear`, Einheit, Ableitung und Qualitaetsstatus. Die aktive
Konvention `realized_t_decision_t_minus_1_v1` verwendet realisierte Werte aus
`t`. CAPE traegt Beobachtungsjahr `t-1`, Beobachtungsmonat Dezember, As-of-Jahr
`t-1` und Entscheidungsjahr `t` getrennt; die unter `t` gespeicherte
Entscheidungsreihe wird ohne zweiten Lag konsumiert.

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

`BacktestRunResultV1` ist tief eingefroren und enthaelt `BacktestRequestV1`, diskriminiertes Outcome, Warnungen/sichere Fehlerdaten, unverkuerzte `rows`, `requestedYears`, wirtschaftlich erfolgreiche `completedYears`, erste/letzte Laufjahre, kanonische Start-/Endportfolio-Snapshots, Historical-Year-Records, `HistoricalBacktestMetricsV3`, Summary sowie die Legacy-Aliase. Caller-Inputs, Partner-/Tranchenobjekte und historische Records werden vor dem Lauf in eigene Kopien ueberfuehrt; `undefined`, `Date`, `RegExp`, Prototypen und zyklische Referenzen bleiben dabei runnerintern erhalten.

### `historical-backtest-metrics.js`

DOM-freies Metrikwoerterbuch und reine Ableitung fuer das kanonische
`BacktestRunResultV1`.

**Hauptfunktionen / Exporte:**
- `HISTORICAL_BACKTEST_METRIC_DESCRIPTORS` – versionierte Definitionen fuer 29 Metriken mit Einheit, nominal/real-Basis, Aggregation, Nenner, Rundung, Missingness, Outcome-Regel und Rohquelle. V3 behaelt die V2-Trennung von Haushalts-Flexbedarf, Rentenueberschuss, Depot-Flex und erfuelltem Haushalts-Flex bei und bindet Runway-Minimum/-Stress an `after_transaction_before_payout`.
- `deriveHistoricalBacktestMetrics()` – leitet das unverkuerzte `HistoricalBacktestMetricsV3` aus Jahreszeilen und Outcome ab; Summary und Export konsumieren dieselben Werte ohne zweite Berechnung. Alle Entnahmezeilen muessen denselben Vor-Auszahlungs-Phasenvertrag tragen; `null` bei nicht anwendbarer Zieldeckung wird aus dem endlichen Nenner ausgeschlossen, eine fehlende oder falsche Phase invalidiert dagegen beide Runway-Aggregate. Terminale Ruinzeilen und Ansparzeilen gehoeren nicht zu diesem Nenner. Fuer historische Rohzeilen bleibt `entscheidung.kuerzungProzent` ein expliziter Fallback, falls die neue Haushalts-Kuerzungsquote fehlt.
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
- `buildHistoricalBacktestRawExport()` / `serializeHistoricalBacktestJson()` – erzeugen `HistoricalBacktestExportV2` mit vollstaendigem Request-/Resultmanifest, inklusivem Periodenvertrag, echten JSON-Zahlen und optionalem Cohort-Inventar.
- `serializeHistoricalBacktestCsv()` – projiziert den 34-spaltigen `HistoricalBacktestCsvV2`-Vertrag mit fuehrender, Raw-JSON-identischer Run-ID ohne Displayformatter; Semikolon, Punktdezimalen, LF, leere Missingness und Formel-Injektionsschutz sind Teil des Contracts.
- `captureHistoricalBacktestEngineProvenance()` – erfasst Engine-API-/Build-ID, den explizit vor dem Lauf geladenen sauberen Source-Commit, kanonischen SHA-256-Config-Fingerprint und den von der Entnahmelogik konsumierten Quantisierungsvertrag zum Laufzeitpunkt.
- `createHistoricalBacktestDownload()` – liefert Dateiname, Inhalt, MIME-Typ und Fingerprint; schreibt oder uebertraegt selbst nichts.

Der Runner entfernt interne Portfolio-Snapshots bereits aus dem kanonischen Resultat; V2 liefert stattdessen nur gegen einen zweiten, von der primaeren Totalfunktion unabhaengigen Jahreszeilen-Rechenweg reconciliierte, explizit nicht restartfaehige `HistoricalBacktestPortfolioBoundariesV2`. Dessen `totalComposition` nennt aktives Portfolio plus Pflegebucket und markiert den separat sichtbaren Pflegebucket als bereits in Start-/Endvermoegen enthalten. Pflegebucketwerte sind in kanonischer Grenze, Jahreszeile, CSV und Drawdownreihe genau einmal enthalten. `HistoricalBacktestInputSemanticsV2` erklaert die Legacy-/Ableitungsfelder und bindet das Strategie-Liquiditaetsziel an `liquidityRunwayYears` plus die jahresspezifische, post-policy geplante Netto-Portfoliojahresentnahme. `RuntimeBuildProvenanceV1` wird vor dem Lauf ausschliesslich ueber den relativen Same-Origin-Endpunkt `./__build-provenance.json` geladen; der Export kann die dabei gebundene Provenienz nicht ersetzen, und Unterpfad-Auslieferungen bleiben funktionsfaehig. Fehlender/dirty Source-Commit, ein unvollstaendiger Quantisierungsvertrag oder widerspruechliche Portfolio-Grenzen stoppen Raw-JSON fail-closed mit sichtbarem Fehlercode; CSV bleibt als eigenstaendige technische Projektion verfuegbar und traegt dieselbe kanonische Run-ID wie JSON. `sync-dist` verlangt einen sauberen Stand der versionierten Quellen, blockiert unversionierte Runtime-Quelldateien, kopiert ausschliesslich das gefilterte `git ls-files`-Inventar und ignoriert sonstige unversionierte Scratchdateien sowohl fuer die Clean-Pruefung als auch fuer `dist/`. Ein isolierter Test fuehrt das Skript in einem echten Git-Fixture aus und pinnt Pflichtmodul, Scratch-Ausschluss, Provenienz und Rejectpfad. Der Result-Fingerprint umfasst Schema, Request, kanonisches Ergebnis und Semantikvertraege. `exportedAt`, generierte IDs, Exportmetadaten und interne Diagnostik sind ausgeschlossen. Beide Downloadnamen enthalten Zeitraum, denselben 12-stelligen Run-Hashkern und den Exportzeitpunkt; JSON traegt zusaetzlich den Result-Fingerprint, CSV ihren getrennten Byte-Fingerprint.

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
- Backtest-Logs zeigen Haushalts-Flex, finale Haushaltskuerzung, Mindest-Flex-Ziel, final wirksamen Betrag, Fehlbetrag und Status; die Raw-CSV trennt Haushalts-, Renten- und Depotbasis. Die Ergebnisuebersicht bezeichnet den Pflegebucket als bereits im Endvermoegen enthalten, damit der separat sichtbare Diagnosewert nicht addiert wird.

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
- `sampleNextYearData()` (Helpers) – sampelt das nächste kanonische Jahr (historisch/Regime/Block); fehlende Historie, leere effektive Regimepools und unbrauchbare Transitionen scheitern fail-closed statt Null-/SIDEWAYS-Daten zu erfinden oder auf ungefilterte Jahre zurueckzufallen
- `makeDefaultCareMeta()` / `updateCareMeta()` (Helpers) – Pflegefall-Zustandsmaschine
- `calcCareCost()` (Helpers) – berechnet Pflege-Kosten nach Grad
- `computeCareMortalityMultiplier()` (Helpers) – erhöhte Sterblichkeit bei Pflege
- `computeHouseholdFlexFactor()` (Helpers) – Flex-Reduktion bei Pflege
- `initMcRunState()` (Helpers) – initialisiert Zustand für einen MC-Lauf

**Ausgelagerte Jahreslogik:**
- `simulator-year-portfolio.js` – DOM-freie Markt-/Portfoliofortschreibung, Renditen und Marktfenster.
- `simulator-household-pension.js` – DOM-freie Renten-/Haushaltsberechnung inklusive Witwenrente.
- `simulator-engine-input.js` – DOM-freies Mapping von Simulator-Jahreswerten auf den `EngineAPI.simulateSingleYear()`-Input.
- `minimumFlexAnnual` wird wie `startFlexBedarf` als nominal fortgeschriebener Jahreswert in den Engine-Input gemappt und im Jahresstate inflationiert. Die Policy laeuft nach Guardrails und vor Flex-Budget und finaler Glaettung; sie rechnet den Rentenueberschuss nach Floor-Deckung auf das Haushaltsziel an. Erst nach der finalen Monatsquantisierung werden `minimumFlexEffectiveFinal` als Rentenueberschuss plus Depotflex, `minimumFlexShortfallAnnual` und `minimumFlexFulfilled` festgeschrieben. Dieselbe final quantisierte Portfolioauszahlung ist die kanonische Basis fuer Liquiditaetsziel und operative Runway-KPIs; die Dynamic-Flex-Safety behaelt bewusst ihren Rohbedarfsnenner.
- `simulator-accumulation-year.js` – DOM-freier frueher Rueckgabepfad fuer Ansparjahre inklusive Sparrate, Cash-Zins, Anspar-Rebalancing, Logdaten und Fortschreibung des kumulierten Inflationsfaktors trotz Entnahme null.
- `simulator-tax-recompute.js` – DOM-freie Normalisierung von Tax-Rohaggregaten und finales Settlement-Recompute nach Simulator-Zusatzverkaeufen oder einer steuerrelevanten 3-Bucket-Ersetzung. Skaliert die regulaere Cash-Reserve konsistent, kumuliert Forced-Sale-Reserven und liefert die genau einmal cashwirksame Differenz zur finalen Jahressteuer; Reserveunterdeckungen unter -0,01 EUR sind Contract-Fehler. Der vor Ausfuehrung gepruefte Plan bleibt als `plannedActionFlow` erhalten. `SimulatorExecutedTaxContractV1` prueft und dokumentiert die Abweichung zwischen Quellen-Planreserve und dem kompatiblen Top-Level-Feld `action.steuer`, das nach Simulator-Zusatzeffekten die finale Jahressteuer traegt.
- `simulator-forced-sale.js` – DOM-freie Forced-Sale-Liquiditaetsdeckung vor/nach Auszahlung inklusive Forced-Sale-Scale, skalierter Plansteuerreserve ohne erneuten SPB, Bond-Verkaufsdelta, Payout-Fallback und FIFO-Fallback.
- `types/planned-action-contract.js` – gemeinsamer Action-Vertrag fuer Core und Direct: kanonische Typen/Keys, ausgeglichene Quellen und Verwendungen, Brutto-Steuer-Netto, Cash-Kapazitaet, eindeutige Lotzuordnung sowie aus Cost Basis/TQF/Steuerfreiheit abgeleitete signierte Rohsteuerwerte. Das V1-Modell `proportional_market_value_v1` setzt die bestehende proportionale Reduktion von Marktwert und Cost Basis innerhalb jedes Lots voraus und reconciliert die internen Rohwerte mit absolut `1e-7`; centgerundete Fremdadapter oder eine nichtproportionale kuenftige Lotauswahl gehoeren nicht zu diesem V1-Vertrag. `simulator-engine-direct.js` wendet ihn auf den rohen Engine-Plan und erneut auf die 3-Bucket-finalisierte Action an; der rohe Jahressteuerabschluss muss zusaetzlich exakt zu `settleTaxYear()` und `newState.taxState` passen.
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
- Mindest-Flex-Spalten: `MinFlex€`, `MinFIst€`, `MinFGap€`, `MinFSt` sowie im Detailmodus `MinFBlock` und der Policy-Zwischenwert `MinFEff`
- JSON/CSV-Export fuer ausgewaehlte Szenarien als `ScenarioLogExportV2`; beide Formate verwenden dieselbe lazy beim Klick erzeugte validierte Projektion und tragen Contractversionen je Export beziehungsweise CSV-Zeile. Ein Szenariowechsel verwirft den alten Exportzustand vor dem Rendern; Projektionsfehler erzeugen einen sichtbaren Hinweis statt eines alten oder partiellen Downloads.
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
- Entscheidungskritische EUR-Werte einschliesslich der P10/P50/P90-
  Endvermoegens-Summary werden ohne Grobstufenrundung centgenau aus
  `aggregatedResults` projiziert. Zusaetzliche Dezimalstellen werden fuer
  Nutzen abwaerts und fuer Kosten aufwaerts quantisiert. Nominaler und realer
  Maximum-Drawdown werden ohne UI-Neuberechnung als positive Verlustbetraege
  in der Domaene 0 bis 100 Prozent validiert und zur sichtbaren
  Hundertstel-Prozentpunktgrenze aufwaerts quantisiert. Ungueltige, fehlende
  oder nicht anwendbare Werte liefern Gedankenstrich, stabilen Grund und eine
  tatsaechlich vorhandene Beobachtungszahl; andernfalls steht `unbekannt`.
  Bei mehreren Missingness-Ursachen wird der Grund mit dem groessten
  aggregierten Zaehler deterministisch ausgewaehlt.
- Die sichtbare 4,5-Prozent-KPI benennt die realisierte Entnahmequote mit dem
  strikten `>`-Operator und ordnet sie als Berichtsreferenz statt als Alarm-
  oder Guardrail-Schwelle ein. Pflege-Gruppenmediane bleiben sichtbar als
  ungepaarter, nicht kausaler Vergleich gekennzeichnet.

**Dependencies:** `results-formatting.js`, `simulator-utils.js`.

---

## 15. `results-renderers.js` (~240 Zeilen)
Rendering-Layer für KPI-Karten, Tabellen und Badges.

**Hauptfunktionen:**
- `renderKpiCards()` – erzeugt HTML für KPI-Dashboard.
- `renderScenarioSelector()` – baut die Szenario-Dropdowns auf.
- Exaktwertkarten unterstuetzen sichtbare Zweitwerte und Statuszeilen. Alle
  KPI-/Summary-Titel und Werte duerfen umbrechen, sodass auch Pflege-
  Nichtkausalitaet und lange 4,5-Prozent-Titel sichtbar bleiben. Nominale und
  reale Drawdowns erscheinen in einer eigenen Paarmatrix; der
  Berichtsrollenhinweis bleibt auch ausserhalb eingeklappter Detailbereiche
  sichtbar. Bei 320 Pixel bleibt die vollstaendige Simulatorseite ohne
  horizontalen Seitenoverflow; breite Logtabellen scrollen lokal.

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
- `auto-optimize-evaluate.js` – Bewertet Kandidaten anhand gepoolter kanonischer MC-Rohverteilungen. `AutoOptimizeMetricResultV1` weist Endvermoegensquantile, P90-Drawdown, D-14-Entnahmequote, Stichprobengroessen und Missingness aus. `MonteCarloFinancialRunDistributionV1` entfernt technische Pfade aus Endvermoegen und Drawdown, inventarisiert die Ausschluesse und laesst den Optimizer bei technischer Missingness fail-closed abbrechen. D-14 nimmt das tatsaechlich berechnete finale Ruinjahr auf; dessen Quote verwendet nur die tatsaechlich ausgezahlte `jahresEntnahmeEffektiv` und den Depotwert vor Auszahlung. Ein Ruin vor der Auszahlung bleibt als beobachtete Nullauszahlung enthalten. Safety-Penalty und Tiebreaker akzeptieren nur endliche primitive Zahlen aus beidseitig versionierten Resultaten.
- `auto-optimize-metrics.js` – Definiert Objective- und Constraint-Reader fuer den flachen versionierten Metrikshape. Endvermoegensquantile verwenden lineare Interpolation bei `(n-1)q`; fehlende Werte werden niemals als guenstige 0 eingesetzt.
- `auto-optimize-sampling.js` – Algorithmen für die Kandidatengenerierung (Latin Hypercube, Nachbarschaft).
- `auto-optimize-utils.js` – Hilfsfunktionen (Caching, Logging, ID-Generierung) sowie der versionierte Tiebreaker auf Success Rate, realem `worst5Drawdown` und Zeitanteil oberhalb 4,5 Prozent.
- `auto-optimize-params.js` – Definition der Parameter-Räume und Mapping (UI <-> Intern).
- `auto-optimize-presets.js` – DOM-freie Preset-Definitionen fuer die UI.
- `auto-optimize-param-meta.js` – Parameter-Optionen, Labels, Units, Dynamic-Flex-Keys und Apply-Mapping.
- `auto-optimize-config-ui.js` – Liest und validiert die UI-Konfiguration fuer `runAutoOptimize()`.
- `auto-optimize-renderer.js` – Rendert Parameterbloecke, Progress-Texte, Ergebnis-HTML und Apply-Erfolgsmeldung.
- Objective-, Constraint- und Ergebnis-Copy bezeichnet die bestehende
  4,5-Prozent-Metrik als Zeitanteil der realisierten Entnahmequote strikt
  groesser 4,5 Prozent und als reine Berichtsreferenz; die stabilen technischen
  Metric-Keys und ihre Berechnung bleiben unveraendert.
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
- `resolveStressHistoricalPool()` / `buildStressContext()` / `applyStressOverride()` – gepinnte historische Stresspools mit Kalenderjahresclustern und Mindestdiversitaet sowie Stresstest-Szenarien/Overrides; Kontextaufbau und Laufzeit-Schnittmenge erzwingen die Diversitaet zusaetzlich zum Vertragspreflight

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
- Die 4,5-Prozent-Ueberlagerung benennt ihre klassenbedingte `>=`-Semantik
  ausdruecklich und bleibt damit vom strikt-`>`-Gesamt-KPI unterscheidbar.

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

## 23. `simulator-data.js`
Historische Datenprojektion 1925-2025, Re-Exports des
Demografie-/Pflegevertrags und Stress-Presets.
Die Aktienlevels werden nicht mehr als zweite Zahlenreihe gepflegt, sondern
aus `global-equity-research-chain.js` importiert. Die deutschen
Inflationswerte werden ebenso ausschliesslich aus
`german-cpi-chain.js` projiziert. `zinssatz_de` stammt ausschliesslich aus
`german-cash-money-market-chain.js`; `gold_eur_perf` ausschliesslich aus
`gold-german-investor-chain.js`.

**Exporte:**
- `HISTORICAL_DATA` – historische Marktdaten mit dem neutralen Feld
  `global_equity_research_index` sowie Gold, Inflation, Zins, Lohn und CAPE
- `MORTALITY_TABLE` – generierte Periodensterbetafel nach Geschlecht und Alter
- `PFLEGE_GRADE_PROBABILITIES` – explizite Modellannahmen fuer initialen
  Pflegeeintritt in Grad 1 oder 2; keine amtliche Praevalenz
- `STRESS_PRESETS` – Stresstest-Szenarien (GFC, Stagflation, Lost Decade, System-Krise etc.)

**Dependencies:** `global-equity-research-chain.js`, `german-cpi-chain.js`,
`german-cash-money-market-chain.js`, `gold-german-investor-chain.js`,
`german-demography-care-survivor-contract.js`

---

## 23a. `german-demography-care-survivor-contract.js`

Generiertes, tief eingefrorenes Datenartefakt fuer Sterblichkeit,
Pflegebeobachtungen/-modellannahmen und Hinterbliebenengrenzen.

- Destatis `Statistischer Bericht Sterbetafeln 2023/2025` (EVAS 12621),
  Tabellen `12613-b01` und `12613-b02`: amtliche `qx` fuer Mann/Frau und Alter
  18-100; Alter 101-110 ist ein separater Modellrand, `divers` der
  ungewichtete Mittelwert und keine amtliche dritte Tabelle.
- Destatis-Pflegestatistik 2023: Bestandszahlen, Pflegegradanteile und
  alters-/geschlechtsspezifische Pflegequoten nur als
  `context_only_not_runtime_validation_or_transition_probability`; es findet
  keine Laufzeitvalidierung gegen diese Praevalenzen statt.
- Pflegeeintritt Grad 1/2, Progression und Dauer sind getrennte
  Modellannahmen. Die fruehere unbelegte Praevalenz-durch-vier-Herleitung ist
  entfernt.
- Der Hinterbliebenenvertrag beschreibt `percent`/55 als UI-Default und
  grenzt die vereinfachte Cashflow-Logik von einer gesetzlichen
  Anspruchsberechnung ab.
- `monte-carlo-runner.js` exportiert Revision, Hashes und Semantikgrenzen als
  `DemographyCareSurvivorDiagnosticsV1`.
- `post-backtest-data-07-v1` misst mit festem Seed 2.048 Runs ueber 40 Jahre
  und zwei Sweep-Kombinationen. Pflege, Partner und Hinterbliebenen-Cashflow
  sind aktiv; 40 numerische Slice-06-zu-Slice-07-Deltas bleiben bis zum
  externen Review `pending`.

**Build:** `npm run build:german-demography-data`
**Verify:** `npm run verify:german-demography-data`

---

## 23b. `global-equity-research-chain.js`

Generiertes, tief eingefrorenes Datenartefakt fuer die offene
16-Laender-Aktien-Forschungsproxykette. Das Buildskript prueft die Original-
und gefilterten JST-/OECD-/EZB-Eingabehashes, rekonstruiert die Filterung
bytegenau, berechnet Vorjahres-Wirtschaftsgewichte, Waehrungsumrechnungen,
Jahresreturns und die stetige Levelkette. Der USD-Proxy reicht einschliesslich
1950; die deutsche Anlegerwaehrung beginnt erst mit dem Return 1951.

**Exporte:**

- `GLOBAL_EQUITY_RESEARCH_CHAIN` – Version, Quellenhashes,
  Numeraireuebergang, Qualitaetssegmente, Gewichte, Country-Counts, Returns
  und Levels;
- `GLOBAL_EQUITY_RESEARCH_ANNUAL_RETURNS` – 1925-2025-Returnprojektion;
- `GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS` – kanonische Laufzeitlevels.

**Erzeugung:** `npm run build:global-equity-data`. Die JST-abgeleiteten
Datenwerte stehen separat unter `CC BY-NC-SA 4.0`; Details liegen in
`data/historical/global-equity-research-chain/`.

---

## 23c. `german-cpi-chain.js`

Generiertes, tief eingefrorenes Datenartefakt fuer die deutsche
Jahresdurchschnitts-Verbraucherpreisinflation 1925-2025. Das Buildskript
prueft die Hashes des wiederverwendeten JST-R6-Originals, der gepinnten
Destatis-Langreihen-XLSX und des aktuellen Destatis-HTML-Snapshots. Es
berechnet die JST-Levelaenderungen bis 1949, liest die veroeffentlichten
Destatis-Jahresraten ab 1950 und prueft diese gegen aufeinanderfolgende
Jahresdurchschnittslevel mit hoechstens 0,05 Prozentpunkten Abweichung; damit
wird jede Abweichung um einen publizierten Tick von 0,1 Prozentpunkten
abgewiesen. Ein
getrennter Testreader rekonstruiert alle 101 Raten direkt aus den gepinnten
Originalen. Die Integer-Quantisierung 1925-1948, Preisstopp-/Kriegsphase
1936-1948 und der 1949er Waehrungsreform-Splice (`+7,0352` % statt
`-1,0526` % amtlicher Levelalternative) sind maschinenlesbar qualifiziert.
Die separate 100:6,5-Umstellung grosser Reichsmark-Bar- und
Bank-/Sparguthaben (93,5 % nominaler Verlust) wird dem CPI-basierten
Kaufkraftverlust von rund 36,9 % gegenuebergestellt; die Kette ist kein
durchgehender Geldvermoegensdeflator ueber die Reform.
Die Naehte 1950, 1963, 1992 und 2025 bleiben
explizit; HICP/HVPI ist ausgeschlossen.

**Exporte:**

- `GERMAN_CPI_RESEARCH_CHAIN` – Version, Quellenhashes, Auswahl- und
  Nahtregeln, Qualitaetssegmente, Jahresraten und synthetische Indexlevels;
- `GERMAN_CPI_INFLATION_RATES` – kanonische 1925-2025-Laufzeitprojektion;
- `GERMAN_CPI_SYNTHETIC_INDEX_LEVELS` – stetige Diagnoselevel ab Basis 1924.

**Erzeugung:** `npm run build:german-cpi-data`; read-only Gate:
`npm run verify:german-cpi-data`. Die JST-Anteile stehen unter
`CC BY-NC-SA 4.0`, die Destatis-Anteile unter der Datenlizenz Deutschland –
Namensnennung – 2.0. Details liegen in
`data/historical/german-cpi-chain/`.

---

## 23d. `german-cash-money-market-chain.js`

Generiertes, tief eingefrorenes Datenartefakt fuer den deutschen
Cash-/Overnight-Geldmarkt-Bruttoertragsproxy 1925-2025. Das Buildskript
prueft das wiederverwendete JST-R6-Original, die gepinnte
Bundesbank-Langreihen-PDF und den mechanischen Layout-Extrakt. Zusaetzlich
liest es die Primaer-PDF mit Poppler `pdftohtml` ab der kompatiblen
Mindestversion 25.07.0, aufgeloest ueber explizite Umgebungsvariable oder
`PATH`,
rekonstruiert die 77 Bundesbankwerte koordinatenbasiert und verlangt exakte
Uebereinstimmung mit dem Layoutpfad. Ein unabhaengiger Testreader
rekonstruiert alle 101 Werte ohne den Generator direkt aus JST-XLSX und PDF.

Die Segmente bleiben maschinenlesbar getrennt: JST `DEU.stir` 1925-1944 als
Proxy, der offen ausgewiesene 1944-Carry-forward fuer 1945-1948 als
Schaetzung, der Bundesbank-publizierte Frankfurt-Banken-Proxy 1949-1996,
FIBOR 1997-1998, EONIA
1999-2018, der EONIA-/EURSTR-Uebergang 2019 und EURSTR 2020-2025. Der
publizierte Jahresdurchschnitt wird genau einmal als einfacher
Brutto-Jahresertragsproxy verwendet; Produktkosten, Bankmarge und Steuer sind
nicht Bestandteil der Reihe. Negative Raten bleiben signiert. Die
Methodenbrueche 1970 und 1990, der 1948-Waehrungsreformbruch und der
EZB-EURSTR-Disclaimer sind maschinenlesbar.

Der bestehende Laufzeitvertrag heisst `cashBondReturn`: dieselbe Reihe wirkt
auf operative Liquiditaet, Geldmarktpositionen, den cash-nahen Pflegebucket
und Anleihetranchen. Fuer Anleihen ist sie ausdruecklich nur ein
fristigkeitsinkongruenter Modellproxy; Duration, Laufzeitpraemie, Kreditrisiko
und Marktwertbewegungen sind nicht abgebildet. Der 1948-Zinswert bildet die
separate 100:6,5-Abschreibung wesentlicher RM-Geldvermoegen nicht ab.

**Exporte:**

- `GERMAN_CASH_MONEY_MARKET_CHAIN` – Version, Quellenhashes,
  Waehrungsregime, Returnkonvention, Anwendungsbereich, Methoden-/
  Waehrungsbrueche, Disclaimer, Primaer-PDF-Oracle, Qualitaetssegmente,
  Lueckenregel und Jahreswerte;
- `GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS` – kanonische
  1925-2025-Laufzeitprojektion.

**Erzeugung:** `npm run build:german-cash-money-market-data`; read-only Gate:
`npm run verify:german-cash-money-market-data`. Details und Quellenbedingungen
liegen in `data/historical/german-cash-money-market-chain/`.

---

## 23e. `gold-german-investor-chain.js`

Generiertes, tief eingefrorenes Datenartefakt fuer die nominale
Gold-Bruttorendite in deutscher Anlegerwaehrung 1925-2025. Das Buildskript
prueft die gepinnten JST-, Bundesbank- und World-Bank-Quelldateien und
  rekonstruiert die segmentierte Jahresend-/Jahresdurchschnittskette
  fail-closed.

Die Segmente bleiben getrennt: US-Jahresend-Policypreis mal JST-Jahresend-
`DEU.xrusd` 1925-1932 und 1934-1944, offizieller RFC-Jahresendpreis 1933,
eine explizite Nullreturn-Schaetzbruecke 1945-1950, Policypreis mal
JST-Jahresend-FX 1951-1967, Bundesbank-Frankfurt-Fixing in DEM/kg 1968-1998 und
World-Bank-Gold in USD/Feinunze geteilt durch Bundesbank USD/EUR 1999-2025.
1968 ist eine Teiljahresnaht ab 18. Juni; 1999 konvertiert 1998 mit
1,95583 DEM/EUR und 32,15074656862798 Feinunzen/kg. Alle zwoelf literal
verbleibenden Nullreturns sind durch Brueckenklassifikation oder unveraenderte
Quellkomponenten belegt; unklassifizierte Nullen schlagen fail-closed fehl.
Die nominale Bruecke ist real gerichtet, und Proxy-/Brueckenjahre bleiben als
sichtbare Modellgrenze im Legacy-Monte-Carlo-Pool.

**Exporte:**

- `GOLD_GERMAN_INVESTOR_CHAIN` – Version, Quellen- und Wertehashes,
  Waehrungsregime, Returnkonvention, Naehte, Qualitaetssegmente,
  Nullwerterklaerungen und Jahreswerte;
- `GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS` – kanonische
  1925-2025-Laufzeitprojektion.

**Erzeugung:** `npm run build:gold-german-investor-data`; read-only Gate:
`npm run verify:gold-german-investor-data`. Details und Quellenbedingungen
liegen in `data/historical/gold-german-investor-chain/`.

---

## 23f. `german-gross-wage-growth-chain.js`

Generiertes, tief eingefrorenes Datenartefakt fuer den Destatis-Index der
durchschnittlichen Bruttomonatsverdienste ohne Sonderzahlungen. Die
publizierte Veraenderung des Berichtsjahres `t` wird bei
`rentAdjMode=wage` genau einmal im Simulationsjahr `t` angewendet. Der
offizielle Abschnitt umfasst 1947-2025; 1925-1946 wird aus aufeinanderfolgenden
JST-R6-`DEU.wage`-Nominallohnstaenden als Forschungsproxy abgeleitet. Gebiet,
fruehe Quellenpraezision und die amtlichen Methodenbrueche 1991, 2007 und 2022
sind explizite Segmente. Die Reihe ist ein funktionaler Rentenfortschreibungs-
proxy und keine gesetzliche Rentenanpassungsreihe.

**Exporte:** `GERMAN_GROSS_WAGE_GROWTH_CHAIN` und
`GERMAN_GROSS_WAGE_GROWTH_PCT`.

**Erzeugung:** `npm run build:german-gross-wage-data`; read-only Gate:
`npm run verify:german-gross-wage-data`. Quelle, Hash und Lizenz stehen unter
`data/historical/german-gross-wage-growth-chain/`.

---

## 23g. `us-shiller-cape-chain.js`

Generiertes, tief eingefrorenes Datenartefakt fuer Robert J. Shillers
konventionelles Price-CAPE des US-Aktienmarkts. Fuer Returnjahr `t` wird die
Dezemberbeobachtung `t-1` ausgewaehlt und mit Beobachtungs-, As-of- und
Entscheidungsjahr exportiert. Der Runtime-Contract liest den unter `t`
gespeicherten Wert einmal. Total-Return-CAPE sowie globale oder deutsche
Marktinterpretationen sind ausgeschlossen. Fuer den oeffentlichen
Publisherdownload wurde keine ausdrueckliche offene Redistributionserlaubnis
gefunden; diese Nutzungsgrenze bleibt dokumentiert. Die durch interpolierte
Vorkriegsinputs betroffenen Entscheidungsjahre 1925-1935 sind `estimated`,
1936-2025 ist `backtested`.

**Exporte:** `US_SHILLER_CAPE_CHAIN` und
`US_SHILLER_CAPE_BY_RETURN_YEAR`.

**Erzeugung:** `npm run build:us-shiller-cape-data`; read-only Gate:
`npm run verify:us-shiller-cape-data`. Quelle und Nutzungsgrenze stehen unter
`data/historical/us-shiller-cape-chain/`.

---

## 23h. `simulation-data-inventory.js`

DOM-freier, unveraenderlicher Evidenz- und Quell-Gate-Contract fuer
historische Reihen und statische Simulationsdaten. Das Modul ersetzt weder
`simulator-data.js` noch den produktiven `HistoricalDataManifestV1`-
Backtestcontract.

**Exporte:**

- `SIMULATION_DATA_INVENTORY` – `SimulationDataInventoryV1`, Revision
  `2026-08-01.4`, mit sechs reihenspezifischen Historieneintraegen und sieben
  statischen Kategorien;
- `validateSimulationDataInventory()` – prueft Pflichtfelder,
  Evidenzvokabular, lueckenlose 1925-2025-Qualitaetssegmente,
  geordnete und eindeutige Reihendiskontinuitaeten,
  Implementierungsabdeckung sowie fail-closed External-Validation-Gates;
- `computeSimulationDataValueHash()` /
  `assertSimulationDataValueHash()` – kanonischer SHA-256-Abgleich gegen
  `embeddedValueHash`; ein nicht vorhandener externer `rawDataHash` bleibt
  davon getrennt `unresolved`;
- `evaluateSimulationDataSourceGate()` – trennt technische
  Reproduzierbarkeit, externe Validierung und Erlaubnis zum Datenersatz.

`unresolved` bleibt technisch reproduzierbar, darf aber weder eine externe
Validierung noch einen lizenzierten Datenersatz behaupten. Alle sechs
Historienketten besitzen bekannte Quellen- und Lizenz- oder Nutzungsfelder,
bleiben wegen Proxy-/Schaetzsegmenten, CAPE-Nutzungsgrenze und ausstehender
externer Validierung jedoch `not_validated`. Modellannahmen,
Nutzereingaben, Stressparameter, abgeleitete Werte und fehlende Modelle tragen
getrennte Evidenzklassen.

Der Lohnpfad trennt 1945 als `estimated` von den umgebenden JST-Proxydaten
und fuehrt die Jahre 1925 (Startnormalisierung), 1945 (keine
Marktlohnbeobachtung), 1947 (JST-/Destatis-Quellennaht) und 1948
(Waehrungsreformkontext) als maschinenlesbare Diskontinuitaeten.

**Dependencies:** `historical-backtest-contract.js` fuer kanonische
Serialisierung und browserkompatibles SHA-256.

---

## 24. `simulator-profile-inputs.js` (~430 Zeilen)
Aggregiert Profildaten zu Simulator-Inputs für Multi-Profil-Setups.

**Hauptfunktionen:**
- `buildSimulatorInputsFromProfileData()` – liest Profildaten aus der Profilregistry hinter der zentralen Persistenz-Facade und baut vollständige Simulator-Inputs
- `combineSimulatorProfiles()` – aggregiert mehrere Profile zu einem kombinierten Input-Objekt (1–2 Personen)

**Besonderheiten:**
- Goldstrategie: `calculateProfileGoldStrategy()` berechnet Ziel und Floor zuerst je Profil als Eurobetrag auf der reconciliierten frei investierbaren Basis aus Depot inklusive Gold und operativer Liquiditaet. Der Profil-Pflegebucket wird dabei hoechstens bis zur vorhandenen operativen Liquiditaet abgezogen.
- Goldadapter: Absolute Profilziele werden summiert und erst danach in eine Haushaltsquote umgerechnet. `goldZielBetrag`, `goldFloorBetrag` und `goldStrategyDiagnostics` halten den Vertrag nachvollziehbar; `initializePortfolio()` priorisiert das absolute Ziel.
- Tranchen-Aggregation: Fügt detaillierte Tranchen aller Profile zusammen, versieht IDs mit Profilpräfix und setzt `sourceProfileId`
- Verkaufs-Herkunft: Engine-`breakdown[]` bewahrt `sourceProfileId`; Portfolio-Reduktionen laufen ueber die profilbezogene `trancheId`, damit identische Positionen aus verschiedenen Profilen nicht vermischt werden
- Referenzisolation: Profilinputs werden vor Haushaltsmerge und Portfolioinitialisierung tiefenkopiert. Teilverkaeufe reduzieren Stueckzahl, Marktwert und Cost Basis proportional; simulierte Kaeufe erzeugen eigene `simlot:`-Lots.
- Tranchensummen: Valide oder explizit leere Detailtranchen bestimmen die jeweilige Profilrepraesentation. Korrupte oder widerspruechliche Payloads blockieren fail-closed.
- Hybridprovenienz: Existiert eine Detailrepraesentation, blockiert ein weiteres Profil mit positiven Depot-/Geldmarkt-Aggregaten ohne Details mit `SIMULATOR_PROFILE_ASSET_PROVENANCE_MISSING`. Reines Tagesgeld bleibt als separat provenienzfaehige Liquiditaet zulaessig; Aggregate-only Haushalte bleiben kompatibel.
- Pflegebucket: liest `profile_health_bucket`, normalisiert die Definition und nutzt bei Multi-Profil-Setups das Primary-Profil als Haushaltsdefinition. Abweichende sekundäre Definitionen werden als Warnung transportiert.
- Fallback-Logik: Nutzt Balance-Werte wenn Simulator-Felder leer sind
- Mindest-Flex bleibt profilbezogen: `minimumFlexAnnual` wird aus Profil-Simulatorwerten oder Balance-Fallbacks gelesen, im kombinierten Haushaltslauf addiert und als `minimumFlexProfiles` nachvollziehbar transportiert. Jeder Profilwert muss endlich, nicht-negativ und hoechstens so gross wie der jeweilige Profil-Flexbedarf sein; die Summe darf den aggregierten Haushalts-Flexbedarf nicht uebersteigen. Verletzungen blockieren den Lauf fail-closed statt Werte zu kappen oder aus dem Primary-Profil zu uebernehmen.
- Gewichtete Mittelung bleibt fuer Steuersaetze und Aktienquote bestehen; das Gold-Rebalancing-Band wird zielbetragsgewichtet aus den aktiven Goldprofilen abgeleitet.

**Dependencies:** `simulator-data.js`, `balance-config.js`, `app/profile/profile-asset-values.js`

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
2. `simulator-monte-carlo.js`: Erstellt Generation, AbortController und UI-Fassade, normalisiert Eingaben/Witwen-Optionen und delegiert an den Runner. Start und Cancel sind single-flight; User-Cancel darf keinen seriellen Fallback starten.
3. `monte-carlo-parameters.js`: Validiert Parameter und Ressourcen fuer UI, direkten Runner, Worker und Auto-Optimize identisch; die UI zeigt Kosten und verlangt oberhalb 100.000 Runs eine Bestaetigung.
4. `mc-run-context.js`: Bereitet Chunk-Kontext, RNG, Buffers, Sampling-Basiskonfiguration und Progress-Intervall vor.
5. `mc-year-sampling.js`: Loest `MonteCarloSamplingContractV1` einmal je Chunk auf und liefert Startjahr-/CAPE-Sampling sowie die merge-invariante Ziehungsdiagnostik.
6. `mc-life-events.js`: Initialisiert den Run-Life-State fuer Care-Meta, Partnerstatus, Care-RNGs und HouseholdContext.
7. `tail-risk-overlay.js`: Wendet bei explizitem Opt-in ein deterministisches Tail-Risk-Ereignisfenster auf die gezogenen Jahresdaten an, ohne historische Daten zu mutieren.
8. `mc-stress-tracker.js`: Kapselt Stress-Metrik-Initialisierung, Jahresfortschreibung und Buffer-Schreibung.
9. `mc-log-builder.js`: Baut Ruin-, Jahres- und Todesfall-Logzeilen mit zentralen Alive-/Care-Feldern.
10. `mc-run-metrics.js`: Summiert im Jahresloop reale/nominale Pflege-Mehrbedarfe und schreibt am Run-Ende getrennte P1-/P2-/Haushalts-KPIs, Worst-Runs und `runMeta` fort.
11. `monte-carlo-runner.js`: Führt die reinen Simulationen durch (inkl. Pflege-KPIs) und nutzt `simulator-engine-wrapper.js` für die Jahresschleifen.
12. `monte-carlo-statistics.js` und `monte-carlo-aggregates.js`: Berechnen Wilson-Unsicherheit und reduzieren die global indexierten Depotentnahme-P10-Skalare in Runindex-Reihenfolge.
13. `scenario-analyzer.js`: Zeichnet Worst/Perzentil-/Pflege-/Zufalls-Szenarien waehrend der Runs auf; fruehe Pflege wird fuer P1 und P2 separat ermittelt.
14. `monte-carlo-contracts.js` und `monte-carlo-export.js`: Bauen den tief eingefrorenen Request-/Result-/Provenienzvertrag aus genau diesem Lauf; der Reader prueft Versionen, Pflichtfelder und Fingerprints fail-closed.
15. `monte-carlo-ui.js`: Haelt Start waehrend `running`/`cancelling` gesperrt, fuehrt ARIA-/Fokuszustaende und schaltet nach erfolgreichem Abschluss den V1-JSON-Download fuer die explizite Nutzeraktion frei.
16. `simulator-results.js`: `displayMonteCarloResults()` zeigt Aggregationen und Szenario-Logs an, erneuert nur den dynamischen Inhalt des stabilen `#scenarioSelector` und aktiviert anschliessend ueber `mc-result-cockpit.js` den Ueberblick.
17. `mc-result-cockpit.js`: schliesst das Setup nach Erfolg, synchronisiert den Laufkopf und stellt vor dem Ergebnisfokus die sichtbare Cockpit-Ansicht her.

### Parameter-Sweep
1. `simulator-main.js`: Sweep-Button bindet `runParameterSweep()` aus `simulator-sweep.js`.
2. `simulator-sweep.js`: Iteriert über Whitelist-Parameter, nutzt Worker-Jobs (Fallback seriell).
3. `simulator-heatmap.js`: `renderHeatmapSVG()` visualisiert Ergebnisse und
   kennzeichnet Quantilrankings als experimentelle Punktschaetzer.
4. Der Abschlussvertrag ordnet alle sieben sichtbaren Parameter ihrem
   kanonischen Request-Key, Consumer, Wertebereich und Provenienz-Witness zu:
   `liquidityRunwayYears`, `goldRebalancingBand`, `maxSkimPct`,
   `maxBearRefillPct`, `goldTargetPct`, `survivalQuantile` und
   `goGoMultiplier`.
   Dieser Datenpfadnachweis ist kein eigenstaendiger KPI-Wirkungsnachweis.
   Der Browser-Smoke prueft `SweepRequestV1`, `SweepExecutionV2`,
   `SweepMetricsV4` und die Parameterprovenienz eines echten Ein-Zellen-Laufs.
   `minRunwayObserved` ist in V4 das Minimum der kanonischen
   `runway_after_transaction_before_payout_months`; V3 hatte hier trotz der
   Einheit „Monate“ versehentlich `RunwayCoveragePct` in Prozent aggregiert.

### Auto-Optimize

1. `auto_optimize.js` erbt den kanonischen Monte-Carlo-Sampling-, Seed-,
   Startjahrfilter- und CAPE-Vertrag, bewertet Kandidaten mehrphasig und
   veraendert die Eingaben nicht automatisch.
2. Die Ergebnisanzeige enthaelt `AutoOptimizeModelStatusV1` mit
   Evaluation-Modellversion, Jahresdaten-/Regimehash des gesamten
   Datenuniversums, effektiver Startjahr-/Estimated-History-Auswahl,
   `methodClassification=experimental` und getrennten technischen, internen
   und externen Validierungsstatuswerten. Ein Custom-Evaluator wird getrennt
   ausgewiesen und erbt keine eingebauten Datenhashes.
3. Der Champion ist der beste gefundene Szenariokandidat im untersuchten
   Suchraum. Er ist weder ein globales Optimum noch eine fachlich validierte
   Strategie oder Finanzempfehlung.
4. Die interaktive Suche besitzt sechs Dimensionen: Liquiditaets-Runway,
   Goldziel, Gold-Rebalancing-Band, maximale Skim-Quote, Survival-Quantil und
   Go-Go-Multiplikator. `maxBearRefillPct` bleibt eine Sweep-Dimension;
   `targetEq`, `runwayTargetMonths`, `runwayMinMonths` und `rebalBand` sind
   keine aktuellen Optimizerparameter.

### Liquiditaets-Runway

`types/liquidity-runway-contract.js` ist die gemeinsame Quelle fuer Default,
Bereich, Schrittweite, Migration und abgeleitete Policy. UI, Profile, Sweep,
Optimizer und Engine verwenden `liquidityRunwayYears`; Legacy-Daten werden in
der Reihenfolge kanonischer Wert, `runwayTargetMonths`,
`runwayMinMonths`, Default 5 migriert. Dabei werden ganzzahlige Altwerte
der frueheren UI-Domains zuerst auf das naechste Sechsmonatsraster aufgerundet,
sodass kein gespeicherter Puffer verkuerzt wird. Der effektive Nettojahresbedarf
ist die nach allen Spending-Policies und der Monatsquantisierung final geplante
Portfolioauszahlung. Das
Netto-Runway-Ziel wird daraus und `liquidityRunwayYears` berechnet. Unabhaengig
davon bildet `minCashBufferMonths` (0 bis 12, Default 2) eine Brutto-Untergrenze
aus Floor plus Flex vor Rentenverrechnung; das auf volle 100 EUR aufgerundete
Liquiditaetsziel ist das Maximum beider Groessen. Der interne Pre-Policy-Runway
wird an den SpendingPlanner uebergeben. Getrennt davon verwendet die
Dynamic-Flex-Safety nach der Transaktion weiterhin den ungekürzten nominalen
Nettojahresbedarf, damit eine Spending-Kuerzung nicht selbst die gemessene
Safety-Reichweite erhoeht. `dynamicFlexSafetyRunwayBasis` nennt diesen Vertrag
als `pre_policy_annual_net_need`; das historisch benannte Exportfeld
`safety_runway_post_months` transportiert diesen Wert. Das Exportfeld
`safety_runway_pre_months` bezeichnet dagegen den post-policy,
pre-transaction Runway. Jahreslogs, Backtest-KPI und Monte-Carlo-Jahreszeilen
messen den Bestand nach Transaktionen und vor Jahresauszahlung.
`RunwayMeasurementPhase = after_transaction_before_payout`,
`runway_after_transaction_before_payout_months` und `RunwayCoveragePct`
benennen diesen kanonischen Messpunkt. Nicht anwendbare Zieldeckung bleibt
`null`; terminale Ruin-/Todeszeilen erfinden keine Null-Prozent-Beobachtung.
`RunwayCoveragePostPayoutEndOfYearPct`,
`runway_post_payout_end_of_year_months` und `liq_post_payout_end_of_year`
bewahren die Phase nach Auszahlung explizit als Diagnose;
`safety_runway_post_months` und `liqEnd` behalten ihre alte Bedeutung.
Ueberschuesse bedienen das separate
Goldziel und danach Aktien nur bis zum expliziten Skim-Budget, ohne eine feste
Aktienquote wiederherzustellen. VPW gewichtet die tatsaechliche Aktien-, Gold-
und Liquiditaetszusammensetzung.

### Profilverbund und Demografie

Finanzielle Werte ausgewaehlter Profile koennen haushaltsweit aggregiert
werden. Der V1-Demografiecontract modelliert jedoch hoechstens zwei Personen:
ein Primaerprofil und optional ein Sekundaerprofil. Bei mehr als zwei
ausgewaehlten Profilen bleibt die Simulation lauffaehig, zeigt aber die
Warnung, dass die Demografie auf zwei Personen begrenzt ist. Zusaetzliche
Profile sind deshalb keine zusaetzlichen individuellen Mortalitaets-,
Pflege- oder Rentenpfade (D-16).

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
- **Monte-Carlo-Start/Lifecycle:** `runMonteCarlo()` in `simulator-monte-carlo.js` liest `mcAnzahl`, `mcDauer`, `mcBlockSize`, `mcSeed`, `mcMethode`, `mcStartYearMode`, `mcStartYearFilter`, `mcStartYearHalfLife` sowie Progress-UI (`mc-progress-bar*`). Jeder Lauf erhaelt eine eindeutige Generation; `cancelMonteCarlo()` terminiert aktive Slots, verwirft spaete Antworten und laesst Replacement bis zum naechsten Start aus. Nur ein nicht abgebrochener aktueller Lauf liefert aggregierte Ergebnisse an `displayMonteCarloResults()`.
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

**Last Updated:** 2026-08-15
