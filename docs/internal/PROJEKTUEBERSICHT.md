# Projektuebersicht RuhestandsApp

**Stand:** 2026-04-30  
**Zweck:** Interne Orientierung fuer Entwicklung, Review, Refactoring und Onboarding in diesem Repository.

## Kurzprofil

Die RuhestandsApp ist eine lokal lauffaehige Browser-/Tauri-Suite fuer Ruhestandsplanung. Sie besteht aus mehreren HTML-Einstiegspunkten, nativen ES-Modulen, einer gemeinsam genutzten Berechnungs-Engine und einer Windows-Desktop-Paketierung per Tauri.

Die Anwendung ist bewusst lokal-first:

- keine serverseitige Fachlogik,
- Persistenz primaer ueber `localStorage` und optionale Dateisnapshots,
- optionale Live-Daten fuer Inflation, CAPE und ETF-Kurse,
- deterministische Kernlogik in `engine/`, `app/simulator/` und `workers/`,
- generierte Artefakte wie `engine.js`, `dist/` und `RuheStandSuite.exe` sind nicht der primaere Bearbeitungsort.

## Einstiegspunkte

| Datei | Rolle |
| --- | --- |
| `index.html` | Start-/Profilverwaltungsseite fuer Haushalts- und Profilverbund-Funktionen |
| `Balance.html` | Balance-App fuer Jahresabschluss, Liquiditaet, Entnahmen, Diagnose und Ausgaben-Check |
| `Simulator.html` | Simulator fuer Monte-Carlo, Backtests, Sweeps, Auto-Optimize, Pflege- und Stress-Szenarien |
| `depot-tranchen-manager.html` | Tranchenverwaltung und Kurs-/Depotpflege |
| `Handbuch.html` | Interaktive Hilfe fuer Nutzer |
| `RuhestandSuite.exe` | Portable Windows-Desktop-App auf Basis von Tauri und `dist/` |

## Repository-Landkarte

| Pfad | Verantwortung |
| --- | --- |
| `app/balance/` | UI-nahe Balance-Logik, Jahreswechsel, Ausgaben-Check, Diagnose, Rendering, Storage |
| `app/simulator/` | Simulator-UI, Monte-Carlo, Backtest, Sweep, Auto-Optimize, Portfolio-/Pflege-/Rentenlogik |
| `app/profile/` | Profil-Registry, Profilwechsel, Bundle-Import/-Export, Profilverbund-Sync |
| `app/tranches/` | Depot-Tranchenstatus, Manager-UI, Kursservice, Renderer und State |
| `app/shared/` | Gemeinsame Formatter, Security-Helfer, Feature-Flags, CAPE-Helfer |
| `engine/` | Deterministische Kern-Engine fuer Validierung, Marktanalyse, Entnahmeplanung, Transaktionen und Steuern |
| `workers/` | Worker-Pool, Monte-Carlo-/Sweep-/Auto-Optimize-Worker und Telemetrie |
| `types/` | Gemeinsame Typ-/Optionsdefinitionen als JS-Module |
| `tests/` | Zero-Dependency-Test-Suite mit eigenem Node-Runner |
| `docs/reference/` | Aktive technische und fachliche Referenzdokumentation |
| `docs/guides/` | Nutzer- und Schritt-fuer-Schritt-Anleitungen |
| `docs/internal/` | Interne Arbeitsdokumente und Archive abgeschlossener Umsetzungen |
| `src-tauri/` | Tauri-Konfiguration, Rust-Shell, integrierter Yahoo-Proxy fuer Desktop |
| `scripts/` | Build-, Sync- und Entwicklungshelfer |
| `dist/` | Generiertes Frontend-Bundle fuer Tauri |

## Zentrale Architektur

Die Suite folgt einem klaren Schichtenmodell:

```text
HTML-Einstiegspunkte
  -> UI-Fassaden und Feature-Module in app/
  -> deterministische Runner und Wrapper
  -> EngineAPI aus engine.js bzw. engine/
  -> lokale Persistenz, Snapshots, Exporte
```

Wichtige Prinzipien:

- UI-Logik und DOM-Zugriffe bleiben in `app/balance/`, `app/simulator/` und spezifischen UI-Modulen.
- Fachliche, testbare Kernlogik liegt in DOM-freien Modulen.
- Die gemeinsame Engine wird aus `engine/` gebaut und als `EngineAPI` verwendet.
- Worker-Jobs nutzen dieselben DOM-freien Runner wie serielle Pfade.
- Profilverbund, Tranchen und Shared-Formatter werden von Balance und Simulator gemeinsam genutzt.

## Engine

Die Engine ist die zentrale Source of Truth fuer ein einzelnes Simulationsjahr. Sie liegt als ES-Modulstruktur unter `engine/` und wird ueber `build-engine.mjs` zu `engine.js` gebuendelt oder in einen Modul-Fallback geschrieben.

Hauptmodule:

- `engine/validators/InputValidator.mjs`: Eingabevalidierung, Wertebereiche, Pflichtfelder, strukturierte Fehler.
- `engine/analyzers/MarketAnalyzer.mjs`: Marktregime, Drawdown, CAPE- und Guardrail-Kennzahlen.
- `engine/planners/SpendingPlanner.mjs`: Entnahmeplanung, Alarm-/Guardrail-Logik, Flex-Rate, VPW/Dynamic-Flex, Budget-Caps.
- `engine/transactions/TransactionEngine.mjs`: Liquiditaetsziele, Verkauf, Rebalancing, Opportunistic Refill, Surplus-Investments.
- `engine/tax-settlement.mjs`: Jahres-Settlement fuer Verlusttopf, Sparer-Pauschbetrag und finale Steuer.
- `engine/core.mjs`: Orchestrierung und oeffentliche `EngineAPI`.
- `engine/config.mjs`: Schwellenwerte, Profile, Engine-Version und Build-ID.

Pipeline:

```text
Inputs
  -> InputValidator.validate
  -> MarketAnalyzer.analyzeMarket
  -> SpendingPlanner.determineSpending
  -> TransactionEngine.calculateTargetLiquidity / determineAction
  -> tax-settlement
  -> UI-/State-/Diagnose-Ergebnis
```

Oeffentliche `EngineAPI`:

- `getVersion()`
- `getConfig()`
- `analyzeMarket()`
- `calculateTargetLiquidity()`
- `simulateSingleYear()`

Bearbeitungsregel: `engine.js` nie manuell editieren. Aenderungen erfolgen in `engine/`, danach `npm run build:engine`.

## Balance-App

Die Balance-App steuert den operativen Jahresprozess: Eingaben lesen, ein Jahr simulieren, Liquiditaet und Entnahmen planen, Diagnose darstellen, Transaktionen vorschlagen, Ausgaben pruefen und Jahreswechsel durchfuehren.

Wichtige Module:

- `balance-main.js`: App-Orchestrator, Engine-Version-Handshake, zentrale `update()`-Pipeline.
- `balance-reader.js`: DOM-Eingaben lesen und Side Effects wie sichtbare Panels anwenden.
- `balance-storage.js`: `localStorage`, Migrationen, Snapshots und Restore.
- `balance-binder.js`: Event-Hub fuer Buttons, Tastenkombinationen, Import/Export und Jahresabschluss.
- `balance-renderer.js`: Haupt-Renderer fuer KPIs, Guardrails, Diagnose, Themes und Toasts.
- `balance-update-pipeline.js`: Last-State, Diagnose-Anreicherung, Persistenzentscheidung und Budgetweitergabe.
- `balance-action-postprocessor.js`: Profilverbund-Action-Merge und 3-Bucket-Postprocessing.
- `balance-annual-*.js`: Jahresupdate, Inflation, ETF-Kurs, CAPE, ATH-Nachruecken und Ergebnisprotokoll.
- `balance-expenses-*.js`: Monatsausgaben, CSV-Import, Metriken, Jahrescontainer und Historie.
- `balance-diagnosis-*.js`: Entscheidungsdiagnose, Guardrails, Transaktionsdiagnostik, Key-Parameter und Chips.

Balance-Datenfluss:

```text
DOM/Input
  -> balance-reader
  -> balance-update-pipeline
  -> EngineAPI.simulateSingleYear
  -> balance-action-postprocessor
  -> balance-renderer
  -> balance-storage / Profilverbund / Ausgabenbudget
```

Besondere Funktionen:

- Jahres-Update mit Inflation, VWCE.DE-Kurs und Auto-CAPE.
- Ausgaben-Check pro Jahr, Monat und Profil mit Median-Hochrechnung.
- Entscheidungsdiagnose statt Blackbox-Erklaerung.
- Profilverbund-Aggregation mit proportionaler, runway-first oder steueroptimierter Entnahmeverteilung.
- Depot-Tranchen-Integration fuer steueroptimierte Verkaeufe.

## Simulator

Der Simulator prueft Strategien gegen historische und stochastische Pfade. Er ist inzwischen stark modularisiert; `simulator-main.js` ist vor allem Fassade und UI-Bootstrap.

Hauptbereiche:

- Monte-Carlo: `simulator-monte-carlo.js`, `monte-carlo-runner.js`, `monte-carlo-ui.js`, `monte-carlo-aggregates.js`.
- MC-Hot-Path-Helfer: `mc-run-context.js`, `mc-year-sampling.js`, `mc-life-events.js`, `mc-stress-tracker.js`, `mc-log-builder.js`, `mc-run-metrics.js`.
- Backtest: `simulator-backtest.js`.
- Sweep: `simulator-sweep.js`, `sweep-runner.js`, `simulator-sweep-utils.js`, `simulator-heatmap.js`.
- Auto-Optimize: `auto_optimize.js`, `auto_optimize_ui.js`, `auto-optimize-*.js`.
- Jahreslogik: `simulator-engine-direct.js`, `simulator-engine-wrapper.js`, `simulator-year-portfolio.js`, `simulator-household-pension.js`, `simulator-engine-input.js`, `simulator-tax-recompute.js`, `simulator-forced-sale.js`, `simulator-bond-refill.js`, `simulator-year-result.js`.
- Portfolio und Inputs: `simulator-portfolio*.js`, `simulator-profile-inputs.js`, `simulator-input-*.js`.
- Ergebnisse: `simulator-results.js`, `results-metrics.js`, `results-renderers.js`, `results-formatting.js`, `scenario-analyzer.js`.
- Pflege/Rente/UI: `simulator-ui-pflege.js`, `simulator-ui-rente.js`, `simulator-main-*.js`.

Monte-Carlo-Datenfluss:

```text
Simulator.html
  -> simulator-main.initializeSimulatorApp
  -> simulator-monte-carlo.runMonteCarlo
  -> monte-carlo-ui / simulator-portfolio
  -> monte-carlo-runner
  -> simulator-engine-wrapper -> simulator-engine-direct -> EngineAPI
  -> monte-carlo-aggregates / scenario-analyzer
  -> simulator-results
```

Wichtige Simulator-Konzepte:

- historische Daten inkl. Erweiterung bis 1925,
- Startjahr-Sampling per uniform, Filter, Recency oder CAPE,
- Dynamic-Flex/VPW mit Profilen und Auto-Optimize-Modi,
- Pflegefall-Logik mit Kostenstaffeln, Pflegegraden und Haushalts-/Partnerstatus,
- Ansparphase mit Uebergang in die Entnahmephase,
- Steuer-Settlement-Recompute bei Notfallverkaeufen,
- Worker-Paritaet durch deterministische Seeds und stabile Chunk-Merges,
- Scenario-Logs mit 30 ausgewaehlten Szenarien.

## Profilverbund

Der Profilverbund verbindet mehrere Profile zu einer gemeinsamen Auswertung. Es gibt keinen separaten Verbund-Tab; die Profilauswahl steuert Balance und Simulator direkt.

Beteiligte Module:

- `app/profile/profile-storage.js`: kompatible Fassade fuer Profilzugriffe.
- `profile-registry.js`: Registry, Current-Profile-Key, Metadaten, CRUD.
- `profile-key-policy.js`: Erkennung profilbezogener Storage-Keys.
- `profile-live-storage.js`: Snapshot, Clear, Load und Live-Daten.
- `profile-bundle-io.js`: Import/Export und `window.name`-Transfer.
- `profile-manager.js`: UI auf `index.html`.
- `profile-bridge.js`: Speichern/Laden beim Seitenwechsel.
- `profilverbund-balance.js`: Aggregation und Entnahmeverteilung in Balance.
- `simulator-profile-inputs.js`: Profilaggregation fuer Simulator-Inputs.

Datenquellen:

- `balance_data`
- `depot_tranchen`
- `sim_*`
- `rs_snapshot_*`
- Profil-Metadaten und Haushaltszuordnung

Balance verteilt Entnahmen je nach Modus auf Profile. Simulator kombiniert Vermoegen, Bedarfe, Renten, Tranchen und Gold-Parameter zu einem gemeinsamen Input-Objekt.

## Tranchen und Steuern

Tranchen sind ein zentrales Bindeglied zwischen UI, Profilverbund, Balance, Simulator und Steuerlogik.

Wichtige Punkte:

- Detailtranchen werden in `depot_tranchen` gespeichert.
- `app/tranches/` verwaltet Seiten-/Modal-State, Rendering, Status und Kursservice.
- Balance nutzt Tranchen fuer steueroptimierte Verkaeufe.
- Simulator fuehrt Tranchen in Profilverbund-Szenarien zusammen.
- Steuerlogik unterscheidet planbare Gewinne, signierte Gewinne/Verluste, Teilfreistellung, Sparer-Pauschbetrag und Verlusttopf.
- Notfallverkaeufe im Simulator werden ueber Gesamt-Settlement-Recompute mit regulaeren Verkaeufen konsistent verrechnet.

## Worker-Architektur

Die Parallelisierung liegt in `workers/`:

- `worker-pool.js`: Pool, Queue, Job-Verteilung, Fehlerersatz, Progress und Telemetrie.
- `mc-worker.js`: Host fuer Monte-Carlo-, Sweep- und Auto-Optimize-Jobs.
- `worker-telemetry.js`: Dev-only Telemetrie.

Worker-Jobs nutzen dieselben DOM-freien Runner wie serielle Pfade. Determinismus wird ueber per-run Seeds gesichert. Legacy-RNG-Streams bleiben seriell, wenn Chunking die Sequenz veraendern wuerde.

Aktivierbare Telemetrie:

- URL-Parameter `?telemetry=true`
- oder `localStorage.setItem('enableWorkerTelemetry','true')`

## Build und Laufzeit

Relevante Skripte aus `package.json`:

| Kommando | Zweck |
| --- | --- |
| `npm test` | gesamte Test-Suite via `node tests/run-tests.mjs` |
| `node tests/run-single.mjs <datei>` | gezielter Einzeltest |
| `npm run test:coverage` | Coverage-Runner |
| `npm run build:engine` | Engine aus `engine/` nach `engine.js` bauen |
| `npm run build:engine:strict` | Strict Engine-Build fuer CI/Release |
| `npm run sync-dist` | Frontend nach `dist/` synchronisieren |
| `npm run tauri:dev` | Tauri-Entwicklung |
| `npm run tauri:build` | Tauri-Build |
| `npm run build-tauri-exe` | Windows-Release-Pfad via PowerShell-Skript |

Browser-Variante:

- `start_suite.cmd` oder `start_suite.ps1` startet lokalen Webserver und Yahoo-Proxy.
- Manuell ist `python dev_server.py --port 8000` vorgesehen, falls vorhanden.
- ETF-Kurse benoetigen in der Browser-Variante den lokalen Node/Yahoo-Proxy.

Desktop-Variante:

- Tauri laedt `dist/` gemaess `src-tauri/tauri.conf.json`.
- Standardfenster: `1920x1080`, resizable.
- Yahoo-Proxy laeuft integriert auf `127.0.0.1:8787`.
- CSP erlaubt lokale Proxy-Ziele, ECB, World Bank, OECD und `r.jina.ai`.

## Tests

Die Tests sind frameworkfrei und laufen mit nativen Node-ESM-Modulen.

Rahmen:

- Runner: `tests/run-tests.mjs`
- Einzelrunner: `tests/run-single.mjs`
- Testdateien: `*.test.mjs`
- Statistik laut `tests/README.md`: 57 Testdateien, 1000+ Assertions

Wichtige Testgruppen:

- Engine und Validierung: `core-engine`, `engine-robustness`, `market-analyzer`, `historical-data-robustness`.
- Spending und Guardrails: `spending-planner`, `spending-quantization`, Balance-Diagnose-Tests.
- Transaktionen und Steuern: `transaction-*`, `tax-settlement`, `core-tax-settlement`, `simulator-tax-settlement`.
- Monte-Carlo und Backtest: `simulator-monte-carlo`, `monte-carlo-sampling`, `monte-carlo-startyear`, `simulator-backtest`, `simulator-headless`.
- Profilverbund: `profile-storage`, `profilverbund-balance`, `simulator-multiprofile-aggregation`.
- Worker und Paritaet: `worker-pool`, `worker-parity`.
- UI-nahe Module: Balance-Reader, Storage, Renderer, Expenses, Heatmap.

Validierungsregel:

- Default nach Codeaenderungen: `npm test`.
- Nach Engine-Aenderungen zusaetzlich `npm run build:engine`.
- Fuer fokussierte Fehlersuche sind Einzeltests erlaubt; dann muss berichtet werden, dass nicht die ganze Suite lief.

## Dokumentation

Aktive Referenzen:

- `README.md`: Produkt- und Funktionsueberblick.
- `docs/reference/TECHNICAL.md`: technische Architektur, Datenfluesse, Laufzeitverhalten.
- `docs/reference/BALANCE_MODULES_README.md`: Balance-Moduluebersicht.
- `docs/reference/SIMULATOR_MODULES_README.md`: Simulator-Moduluebersicht.
- `engine/README.md`: Engine-Module und Build-Prozess.
- `tests/README.md`: Testinfrastruktur und Testgruppen.
- `docs/reference/PROFILVERBUND_FEATURES.md`: Profilverbund-Design.
- `docs/reference/WORKFLOW_PSEUDOCODE.md`: Pseudocode zentraler Workflows.
- `docs/reference/DATA_SOURCES.md`: Datenquellen.

Interne Dokumente:

- `docs/internal/README.md`: interne Doku-Startseite.
- `docs/internal/BALANCE_DIAGNOSIS_UX_SLICE.md`: aktive/interne UX-Slice-Dokumentation.
- `docs/internal/archive/`: abgeschlossene Refactorings, Dynamic-Flex, Profilverbund, Webworker-Rollout, Adapter-Elimination und historische Agenten-/Gemini-Notizen.

Bei Aenderungen an Architektur, Modulzuschnitt, Build-/Startpfaden oder Nutzer-Workflows muessen die betroffenen Referenzen synchronisiert werden.

## Arbeitsregeln fuer Aenderungen

1. In Quellmodulen arbeiten, nicht in generierten Artefakten.
2. `engine.js` nur per `npm run build:engine` erzeugen.
3. `dist/` und `RuheStandSuite.exe` nur anfassen, wenn Build-/Release-Artefakte explizit Teil des Auftrags sind.
4. DOM-freie Kernlogik bevorzugt in Runner-/Engine-/Helper-Module auslagern.
5. UI-Bootstrap-Dateien schlank halten und neue Features an passende Fachmodule delegieren.
6. Shared-Formatter und Feature-Flags in `app/shared/` zentral halten.
7. Profil- und Tranchen-Datenvertraege nicht ohne Tests und Doku-Sync aendern.
8. Keine sensiblen lokalen Finanzdaten, Snapshots oder Exporte in Tests/Doku uebernehmen.

## Hauptrisiken und Review-Fokus

| Bereich | Typische Risiken | Pruefpunkte |
| --- | --- | --- |
| Engine | Regressions in Entnahme-, Guardrail- oder Steuerlogik | Engine-Tests, Settlement-Tests, Build-ID, API-Version |
| Simulator | Nichtdeterminismus, Worker/Seriell-Abweichungen, Logshape-Brueche | `worker-parity`, MC-Tests, Scenario-Logs, Seeds |
| Balance | Persistenz-/Jahreswechsel-Fehler, Diagnose-Missverstaendnisse | Storage-, Annual-, Diagnosis- und Smoke-Tests |
| Profilverbund | Falsche Aggregation, Profilgrenzen bei Transaktionen | Profilverbund-Tests, Tranchensummen, Verteilungsmodus |
| Tranchen/Steuern | FIFO-/TQF-/LossCarry-Fehler | `transaction-tax`, `tax-settlement`, `depot-tranches` |
| Tauri | CSP, fehlende Assets, Proxy-/Live-Daten-Zugriff | `tauri.conf.json`, `sync-dist`, Tauri-Build |
| Doku | Widersprueche zwischen README, Technical und Modul-READMEs | Doku-Sync bei Architektur-/Workflow-Aenderungen |

## Schneller Einstieg fuer neue Arbeit

1. Auftrag einem Bereich zuordnen: Balance, Simulator, Engine, Profil, Tranchen, Worker, Tauri oder Doku.
2. Passende Referenz lesen:
   - Balance: `docs/reference/BALANCE_MODULES_README.md`
   - Simulator: `docs/reference/SIMULATOR_MODULES_README.md`
   - Engine: `engine/README.md`
   - Profilverbund: `docs/reference/PROFILVERBUND_FEATURES.md`
   - Tests: `tests/README.md`
3. Code in den Quellmodulen bearbeiten.
4. Fokussierte Tests fuer den geaenderten Bereich ausfuehren.
5. Bei Shared-/Engine-/Contract-Aenderungen die gesamte Test-Suite und relevante Doku aktualisieren.

## Merksatz

Die App ist eine lokale, modulare Finanzplanungssuite. Balance ist der operative Jahresprozess, Simulator ist die Strategiepruefung, `engine/` ist die gemeinsame deterministische Fachlogik, Profilverbund und Tranchen sind die verbindenden Datenvertraege, und Tests/Doku sichern die fachliche Nachvollziehbarkeit.
