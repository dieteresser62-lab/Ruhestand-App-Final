# Slice 05: Outcome- und Horizontvertrag

**Stand:** 2026-07-19  
**Status:** implementiert; externes Review ausstehend
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 01-02 und Entscheidungen D-01/D-02

## Ziel

Jeder Run erhaelt genau einen terminalen Zustand. Horizontende, Tod,
Depotunterschreitung und technischer Fehler werden nicht mehr zu einer
mehrdeutigen Erfolgsquote verdichtet. Dauer-, Alters- und Buffergrenzen werden
explizit validiert.

## Akzeptanzkriterien

- `ruin`, `all_dead`, `horizon_exhausted` und `technical_error` sind disjunkt
  und vollstaendig; ihre Summe entspricht der angeforderten Runzahl.
- Technische Fehler erscheinen separat und zaehlen nie als fachlicher Erfolg.
- Sobald mindestens ein `technical_error` vorliegt, werden Floor-Deckungsquote
  und Intervall fuer den Gesamtbatch fail-closed `null`; das Outcome-Inventar
  bleibt zur Diagnose sichtbar. Bei fehlerfreiem Batch ist
  `all_dead + horizon_exhausted` der Zaehler und `requestedRuns` der Nenner.
- Terminale Auswahl folgt einer getesteten Jahreschronologie: technischer
  Fehler invalidiert; Ruin in einem begonnenen Finanzjahr bleibt Ruin;
  `all_dead` gilt nur vor der naechsten finanziellen Verpflichtung ohne
  vorherigen Ruin; Horizontende ist der letzte Fallback fuer lebende Runs.
- Falls ein Adapter widerspruechliche Terminalflags ausserhalb dieser
  Chronologie liefert, entsteht `technical_error` statt stiller Reparatur.
- Bei Horizontende lebende Faelle werden als zensiert/`horizon_exhausted`
  ausgewiesen.
- UI und Export verwenden die in D-01 beschlossene Bezeichnung.
- Erschoepfungsalter und Laufdauer koennen alle zulaessigen Werte ohne
  `Uint8`-Ueberlauf oder mehrdeutigen Sentinel abbilden.
- Mortalitaet ausserhalb des Tabellenbereichs wird in allen Simulatorpfaden
  identisch und fail-closed behandelt; keine stillen gegensaetzlichen Fallbacks.
- Grenzen bei Alter 110, maximalem Horizont und Tod im letzten Jahr sind durch
  Golden Cases belegt.
- Ein Post-Slice-05-Snapshot und Delta-Ledger dokumentieren das erwartete
  Outcome-/Bufferdelta; die Pre-Hardening-Referenz bleibt unveraendert.

## Scope

- terminale Zustandsmaschine und Inventar,
- Run-Metrikbuffer fuer Dauer/Alter/Outcome,
- Simulatorseitige Mortalitaetsgrenzen,
- Ergebnisaggregation und -darstellung.

## Nicht-Scope

- keine Aenderung der Mortalitaetstabelle oder ihrer empirischen Kalibrierung,
- keine Engine-Semantikaenderung,
- keine neue Lebenserwartungsmodellierung.

## Geplante Dateien

- `app/simulator/monte-carlo-runner.js`,
- `app/simulator/mc-run-metrics.js`,
- `app/simulator/monte-carlo-aggregates.js`,
- `app/simulator/monte-carlo-chunk-result.js`,
- `app/simulator/results-metrics.js`,
- optional `app/simulator/results-renderers.js`,
- optional gemeinsamer Simulator-Mortalitaetshelfer,
- Tests/Fixtures.

Produktive Programmdateien: **maximal 7**.

## Diff-Risiko vor Coding

- Branch vor Coding: `codex/simulator-monte-carlo-gap-plan`.
- Status vor Coding: ausschliesslich bereits vorgefundene unversionierte
  Playwright-Paketdateien unter `node_modules/`; keine versionierte Aenderung.
- Geplante Programmdateien:
  - `app/simulator/monte-carlo-runner.js`,
  - `app/simulator/monte-carlo-runner-utils.js`,
  - `app/simulator/monte-carlo-aggregates.js`,
  - `app/simulator/monte-carlo-chunk-result.js`,
  - `app/simulator/results-metrics.js`,
  - `app/simulator/mc-life-events.js`,
  - `app/simulator/sweep-runner.js`.
- Geplante Test-/Fixturedateien: fokussierter Outcome-/Horizontvertrag,
  bestehende Runner-/Chunk-/Results-/Sweep-/Worker-Tests sowie
  `tests/fixtures/monte-carlo-measurement/post-slice-05-v1.json` und das
  Delta-Ledger.
- Aenderungstiefe: riskant; Headline-KPI, Bufferbreite, terminale Klassifikation
  und Mortalitaetsgrenze sind betroffen.
- Gefaehrdete Tests/Snapshots: Runner, Results, Worker-Paritaet, Sweep-/MC-
  Grenzfaelle, Messsnapshots und Backtests bei gemeinsamem Helfer.
- Nicht anfassen: Engine, Mortalitaetsdaten, Sampling, generierte Artefakte,
  fremde Playwright-Dateien unter `node_modules/`.
- Rollback: `git checkout -- app/simulator/monte-carlo-runner.js
  app/simulator/monte-carlo-runner-utils.js
  app/simulator/monte-carlo-aggregates.js
  app/simulator/monte-carlo-chunk-result.js app/simulator/results-metrics.js
  app/simulator/mc-life-events.js app/simulator/sweep-runner.js`; neue
  Test-/Fixturedateien nur nach Freigabe entfernen. Bei unerwarteter Snapshot-,
  Backtest- oder FlowDelta-Abweichung sofort stoppen.

## Geplante Tests

- je ein deterministischer Fall pro terminalem Zustand,
- Ruin und Todesstatus im selben begonnenen Finanzjahr, Tod vor Jahrespflicht
  sowie widerspruechliche Adapterflags,
- Invariante `sum(outcomes) === requestedRuns`,
- Alters-/Dauergrenzen und Sentinel-Migration,
- MC-/Sweep-Fallback-Paritaet, sofern derselbe Simulatorcontract gilt,
- Worker-Paritaet, Results-Tests und `npm test`.

## Durchgefuehrte Aenderungen

- `MonteCarloOutcomeInventoryV1` klassifiziert `ruin`, `all_dead`,
  `horizon_exhausted` und `technical_error` exhaustiv. Der Chunkvertrag gleicht
  Codes, finanzielle Outcome-Zaehler, `failCount` und technische Missingness
  ab; die Summe muss der angeforderten Runzahl entsprechen.
- `resolveMonteCarloTerminalOutcomeV1()` bildet die Jahreschronologie ab. Ruin
  in einem begonnenen Finanzjahr bleibt vor spaeterem Tod Ruin; Tod vor der
  naechsten finanziellen Verpflichtung ist `all_dead`; widerspruechliche oder
  unvollstaendige Flags werden mit stabilen Codes als `technical_error`
  abgewiesen.
- Die UI-Headline heisst „Floor-Deckung im gewaehlten Horizont“. Der Zaehler
  ist `all_dead + horizon_exhausted`, der Nenner `requestedRuns`. Ein Batch mit
  technischem Fehler liefert `null` und den Missingness-Grund
  `technical_error_in_batch`; das Outcome-Inventar bleibt in Resultat und
  sichtbarer Fehlerdiagnose erhalten.
- `kpiLebensdauer` und `alterBeiErschoepfung` sind `Uint32Array`.
  `alterBeiErschoepfungMissingness` ersetzt den mehrdeutigen 255-Sentinel.
  Startalter plus Horizont wird vor dem Lauf gegen den `Uint32`-Bereich
  validiert und nie still geklemmt.
- `resolveSimulatorMortalityProbability()` vereinheitlicht Monte Carlo,
  Life-Event-Helfer und Sweep. Alter ausserhalb der Tabelle wird fail-closed mit
  Todeswahrscheinlichkeit 1 behandelt; die Mortalitaetsdaten selbst blieben
  unveraendert.
- `post-slice-05-v1.json` dokumentiert Outcome-Codes, Zaehler, Inventar und den
  Bufferanstieg von 68 auf 75 Byte pro Run. Zwei neue Delta-Ledger-Eintraege
  trennen Outcome-/Headline-Semantik von Buffer-/Mortalitaetsgrenzen; alle
  frueheren Snapshots bleiben unveraendert.
- README und aktive Architektur-/Technikreferenzen verwenden den neuen
  Outcome- und Headlinevertrag.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/monte-carlo-outcome-horizon.test.mjs`:
  23/23 Assertions gruen.
- `node tests/run-single.mjs tests/monte-carlo-chunk-result.test.mjs`:
  33/33 Assertions gruen.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`:
  156/156 Assertions gruen.
- `node tests/run-single.mjs tests/results-metrics.test.mjs`: 35/35 Assertions
  gruen.
- `node tests/run-single.mjs tests/monte-carlo-measurement-contract.test.mjs`:
  653/653 Assertions gruen.
- `node tests/run-single.mjs tests/mc-worker-contract.test.mjs`: 34/34
  Assertions gruen.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`: 379/379 Assertions
  gruen.
- `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`:
  10/10 Assertions gruen.
- `node tests/run-single.mjs tests/simulator-sweep.test.mjs`: 107/107
  Assertions gruen.
- `node tests/run-single.mjs tests/care-meta.test.mjs`: 21/21 Assertions gruen.
- `node tests/run-single.mjs tests/monte-carlo-care-kpi.test.mjs`: 28/28
  Assertions gruen.
- Fokussierte Summe: 1479/1479 Assertions gruen.
- `npm test`: 6494/6495 Assertions gruen. Einzige Abweichung ist der bereits
  vor Slice 01 dokumentierte fremde `architecture-evidence`-Fehler mit sechs
  toten Links auf zwei verschobene Forschungsdokumente. Alle uebrigen 122
  Testdateien sind gruen; keine neue Snapshot-, Backtest-, Worker- oder
  FlowDelta-Abweichung.

## Abweichungen vom Plan

- Der geplante optionale `results-renderers.js`-Eingriff war nicht noetig; das
  bestehende neutrale View-Model rendert die neuen Summary-Karten ohne
  Renderer-Sonderfall.
- Der gemeinsame Mortalitaetshelfer wurde im bereits vorhandenen
  `mc-life-events.js` abgelegt. Dadurch blieb der produktive Scope bei exakt
  sieben Programmdateien.

## Offene Risiken

- Die Prioritaetsregel behauptet nicht, Ruin verursache Tod; sie ordnet nur
  bereits phasenweise festgestellte Terminalereignisse deterministisch zu.
- Die `Uint32`-Grenze ist ein Speicher-/Formvertrag, keine Empfehlung fuer
  praktisch sinnvolle Laufdauern. Produktnahe Ressourcenlimits, Warnungen und
  UI-Validierung bleiben Slice 10.
- Sweep besitzt weiterhin seinen eigenen Erfolgsmetrikvertrag; Slice 05
  vereinheitlicht dort nur die Mortalitaetsgrenze. Die Migration seiner
  Erfolgsbezeichnung darf nicht still aus diesem Slice abgeleitet werden.
- Der vorbestehende Architektur-Linkfehler bleibt ausserhalb des Slice-Scope.

## Rueckdokumentation und Freigabe

Outcome-Inventar, UI-Begriff, Bufferentscheidung, Snapshotdelta und Grenztests
sind im Hauptplan und in der GAP-Matrix dokumentiert. Implementierung:
abgeschlossen. Freigaben: Gemini-/Nutzerreview ausstehend; Codex erteilt keine
eigene Freigabe und erstellt keinen Commit.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 05 löst P0-GAP MC-05 und MC-07 vollständig.
  - **MC-05 (Outcome-Inventar & Horizont):** Jeder Run endet in genau einem der 4 Zustände: `ruin`, `all_dead`, `horizon_exhausted`, `technical_error`. Jahreschronologie schützt vor Konflikten (Ruin im begonnenen Finanzjahr schlägt späteren Tod). Im Falle eines technischen Fehlers wird die Floor-Deckung fail-closed als `null` unterdrückt, während das Inventar sichtbar bleibt.
  - **MC-07 (Mortalitäts- & Buffergrenzen):** `resolveSimulatorMortalityProbability` liefert bei Alter >= 110 konsistent 1.0 (sicherer Tod). Parität zwischen MC und Sweep bei Sterbetafelgrenzen ist wiederhergestellt. `alterBeiErschoepfung` nutzt explizite Missingness statt 255.
* **Vertragstreue:** `MonteCarloOutcomeInventoryV1` in `monte-carlo-aggregates.js` definiert den kanonischen Outcome-Vertrag.
* **Fehlerbehandlung:** 23 dedizierte Contract-Tests in `tests/monte-carlo-outcome-horizon.test.mjs` und 35 UI-Contract-Tests in `tests/results-metrics.test.mjs` belegen Fail-Closed-Verhalten bei chronologischen Konflikten oder technischen Fehlern.
* **Seiteneffekte:** Punktgenau **7 produktive Programmdateien** verändert (`mc-life-events.js`, `monte-carlo-aggregates.js`, `monte-carlo-chunk-result.js`, `monte-carlo-runner-utils.js`, `monte-carlo-runner.js`, `results-metrics.js`, `sweep-runner.js`). Alle Dokumentationen (`README.md`, `ARCHITEKTUR_UND_FACHKONZEPT.md`, `TECHNICAL.md`, Hauptplan, GAP-Analyse, Slice-Dokument) wurden konsistent aktualisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Aufklärung des Nutzers bezüglich zensierter Pfade (`horizon_exhausted`) vs. echter Sterblichkeit (`all_dead`).

### 2. Nummerierte Findings
* **Finding G-01-S5 (Chronologische Outcome-Priorität):** Ruin im begonnenen Jahr schlägt ein am Jahresende gemeldetes Todesflag. Dadurch wird vermieden, dass verarmte Haushalte fälschlich als `all_dead` umklassifiziert werden.
* **Finding G-02-S5 (Fail-Closed-Deckung bei technischen Fehlern):** Wenn ein technischer Fehler im Batch auftritt, schützt `floorCoveragePct = null` das UI vor falschen Erfolgsversprechen.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre eine Fehlinterpretation von `horizon_exhausted` bei zu kurz gewählten Simulationszeiträumen. Abgesichert durch den aktualisierten Tooltip ("Horizontende ist ein zensierter, kein vollständiger Lebenszeitpfad") und die getrennt ausgewiesenen Outcome-Karten.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Aufklärung des Nutzers bezüglich zensierter Pfade (`horizon_exhausted`) vs. echter Sterblichkeit (`all_dead`).
  2. Bekannte fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 05 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S5 | Gemini | Chronologische Outcome-Priorität | angenommen | In `resolveMonteCarloTerminalOutcomeV1` und Tests umgesetzt |
| G-02-S5 | Gemini | Fail-Closed Deckung bei Fehlern | angenommen | In `buildSummaryData` und UI umgesetzt |
| G-03 | Gemini | Ruin/Tod-Prioritaet unklar | angenommen mit Phasenpraezisierung | Jahreschronologie und Konflikttests ergaenzt |
| C-04 | Claude | Snapshotdrift | angenommen | Post-Slice-Snapshot/Delta-Ledger ergaenzt |
| C-05 | Claude | Gemini-Blocker formal offen | angenommen | D-02 und Akzeptanzkriterien konkretisiert |
