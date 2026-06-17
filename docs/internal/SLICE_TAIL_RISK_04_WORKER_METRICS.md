# Slice Tail Risk 04: Worker Metrics

**Feature-Branch:** `codex/fat-tail-crash-modell`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Status:** freigegeben  
**Startdatum:** 2026-06-17  
**Uebergeordneter Plan:** `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`

## Ziel

Dieser Slice schliesst die Tail-Risk-Integration fuer Worker- und Merge-Pfade ab. Tail-Risk-Metriken werden aus den Runner-Logs in Chunk-Totals ueberfuehrt, im Worker-Merge aufsummiert und in `aggregatedResults.extraKPI.tailRisk` sichtbar gemacht. Full-Run, gesplittete Chunks und echter Worker-Entrypoint muessen bei aktivem Tail-Risk gleiche Ergebnisse liefern.

## Akzeptanzkriterien

- Tail-Risk-Config wird im Worker-Pfad nicht verloren, weil der Worker die kompilierten Scenario-Inputs nutzt.
- Tail-Risk-Totals werden pro Chunk berechnet und ueber Worker-Merge additiv zusammengefuehrt.
- `aggregatedResults.extraKPI.tailRisk` enthaelt mindestens Runs-/Jahresanteile, aktive/applizierte/skipped Jahre und Event-Anzahl.
- Full-Run und gesplittete Worker-aehnliche Chunks liefern fuer Tail-Risk identische Totals und Aggregates.
- Der echte MC-Worker-Entrypoint verarbeitet Tail-Risk ohne Transferable-/Payload-Fehler.
- Bestehende Methoden ohne Tail-Risk bleiben mit neutralen Tail-KPIs stabil.

## Scope

- `app/simulator/mc-run-metrics.js`
- `app/simulator/monte-carlo-aggregates.js`
- `app/simulator/simulator-monte-carlo.js`
- `tests/worker-parity.test.mjs`
- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`
- `docs/internal/SLICE_TAIL_RISK_04_WORKER_METRICS.md`

## Nicht-Scope

- Keine UI-/Persistenz-Eingabefelder.
- Keine Export-Aenderung.
- Keine fachliche Aenderung am Tail-Risk-Overlay.
- Keine Aenderung an `engine/`, `engine.js`, `dist/` oder Release-Artefakten.
- Keine Aenderung vorhandener `node_modules`-Aenderungen.

## Git-Status Vor Start

Branch:

```text
codex/fat-tail-crash-modell
```

Status:

```text
 M node_modules/.package-lock.json
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/
```

Hinweis: Die `node_modules`-Aenderungen waren vor Slice-Start vorhanden und werden nicht angefasst.

## Diff-Risiko

Geplante Dateien:

- `docs/internal/SLICE_TAIL_RISK_04_WORKER_METRICS.md`
- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`
- `app/simulator/mc-run-metrics.js`
- `app/simulator/monte-carlo-aggregates.js`
- `app/simulator/simulator-monte-carlo.js`
- `tests/worker-parity.test.mjs`

Voraussichtliche Aenderungstiefe:

- mittel

Gefaehrdete bestehende Tests:

- `tests/worker-parity.test.mjs`
- `tests/mc-worker-contract.test.mjs`
- `tests/simulator-monte-carlo.test.mjs`
- `tests/tail-risk-overlay.test.mjs`

Nicht anfassen:

- `workers/mc-worker.js`, solange der bestehende Entrypoint den Chunk-Result unveraendert durchreichen kann.
- UI/Persistenz/Export.
- `engine/`, `engine.js`, `dist/`, `RuheStandSuite.exe`.
- vorhandene `node_modules`-Aenderungen.

Rollback-Strategie:

- Geaenderte bestehende Dateien: `git checkout -- docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md app/simulator/mc-run-metrics.js app/simulator/monte-carlo-aggregates.js app/simulator/simulator-monte-carlo.js tests/worker-parity.test.mjs`
- Neue Slice-Datei nach Rueckfrage entfernen: `docs/internal/SLICE_TAIL_RISK_04_WORKER_METRICS.md`

## Stop-Regel-Freigabe

Die Umsetzung beruehrt voraussichtlich 6 Dateien und ueberschreitet damit die 5-Dateien-Stop-Regel. Der Nutzer hat am 2026-06-17 die Fortsetzung mit diesem Scope ausdruecklich freigegeben.

## Geplante Tests

- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `node tests/run-single.mjs tests/mc-worker-contract.test.mjs`
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `node tests/run-single.mjs tests/tail-risk-overlay.test.mjs`
- `npm test`

## Durchgefuehrte Aenderungen

- `app/simulator/monte-carlo-runner.js` sammelt Tail-Risk-Overlay-Ergebnisse pro Run log-unabhaengig in `tailRiskEntriesThisRun`, damit Worker-Chunks ohne vollstaendige Logausgabe trotzdem korrekte Tail-Totals liefern.
- `app/simulator/mc-run-metrics.js` fasst die Tail-Risk-Entries pro Run ueber `summarizeTailRiskEvents()` zusammen und schreibt additive Totals:
  - `tailRiskRunsActiveCount`
  - `tailRiskRunsAppliedCount`
  - `tailRiskEventCount`
  - `tailRiskEvaluatedYears`
  - `tailRiskActiveYears`
  - `tailRiskAppliedYears`
  - `tailRiskSkippedHistoricalCrisisYears`
- `app/simulator/monte-carlo-aggregates.js` stellt `aggregatedResults.extraKPI.tailRisk` mit Run-Raten, Jahresanteilen und Zaehlern bereit. Jahresanteile nutzen `tailRiskEvaluatedYears` als eigenen Nenner.
- `app/simulator/simulator-monte-carlo.js` merged die neuen Tail-Risk-Totals im Worker-Pfad additiv ueber alle Chunks.
- `tests/worker-parity.test.mjs` erweitert die generischen MC-Total-Contracts um Tail-Risk-Felder und fuegt einen aktiven Tail-Risk-Full-vs-Split-Paritaetsfall hinzu.
- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md` dokumentiert Slice 4 als implementiert mit ausstehendem Review.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/worker-parity.test.mjs`
  - Ergebnis: gruen, 354 Assertions.
- `node tests/run-single.mjs tests/mc-worker-contract.test.mjs`
  - Ergebnis: gruen, 31 Assertions.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
  - Ergebnis: gruen, 110 Assertions.
- `node tests/run-single.mjs tests/tail-risk-overlay.test.mjs`
  - Ergebnis: gruen, 31 Assertions.
- `npm test`
  - Ergebnis: gruen, 101 Testdateien, 2988 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.

## Abweichungen Vom Plan

- `workers/mc-worker.js` musste nicht geaendert werden. Der bestehende Entrypoint reicht `runMonteCarloChunk()`-Resultate inklusive `totals` bereits durch und transferiert nur TypedArray-Buffer.
- `tests/mc-worker-contract.test.mjs` wurde nicht geaendert, aber ausgefuehrt. Der echte Worker-Entrypoint blieb mit den erweiterten Totals transfer- und payloadstabil.

## Offene Risiken

- UI-Opt-in, Exportfelder, Nutzerwarnhinweis und Doku-Vergleich folgen erst in Slice 5.
- `aggregatedResults.extraKPI.tailRisk` ist technisch vorhanden, aber noch nicht sichtbar gerendert.
- Die bekannte nicht-monotone Skip-Klippe an der historischen Krisenschwelle bleibt fachlich unveraendert.

## Rueckdokumentation

- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md` markiert Slice 4 als implementiert mit ausstehendem Review und haelt Slice 5 fuer UI/Export/Doku offen.

## Freigabestatus

- Codex-Implementierung abgeschlossen; Review durch Gemini/Nutzer steht aus. Codex markiert den Slice nicht als freigegeben.

## Review-Feedback von Gemini

- **Status:** freigegeben
- **Blocker:** keine
- **Findings & Analysen:**
  - **TR-04-01 (Log-unabhängige Akkumulation):** Die Einführung von `tailRiskEntriesThisRun` in `monte-carlo-runner.js` stellt sicher, dass die Totals pro Chunk im Worker-Betrieb korrekt gezählt werden, selbst wenn die Logzeilen-Generierung (zur RAM-Schonung) deaktiviert ist.
  - **TR-04-02 (Worker-Parität):** Der neue Integrationstest (`Test 8`) in `tests/worker-parity.test.mjs` verifiziert erfolgreich, dass der Full-Run und gesplittete Chunks für alle addierten Zähler und Raten exakt identisch sind.
  - **TR-04-03 (Robuste Ratenberechnung):** Die Aggregierung in `monte-carlo-aggregates.js` fängt Divisionen durch Null und unerwartete Typen (durch Absicherung auf `totalRuns > 0` und `tailRiskEvaluatedYears > 0`) sicher ab.
- **Restrisiken:**
  - Rendering-Fehler im UI (Slice 5), falls die neuen KPI-Strukturen dort fehlerhaft gebunden werden.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| TR-04-01 | Gemini | Stummer Informationsverlust im Worker-Pfad (ohne Logs) | Geprüft & Freigegeben | Gelöst durch separate Akkumulation in `tailRiskEntriesThisRun` |
| TR-04-02 | Gemini | Worker-Parität bei aktivem Tail-Risk gefährdet | Geprüft & Freigegeben | Nachgewiesen durch Paritätstest `Test 8` |
| TR-04-03 | Gemini | Division-by-Zero bei 0 evaluierten Jahren | Geprüft & Freigegeben | Abgesichert über `tailRiskEvaluatedYears > 0` Gate in aggregates.js |

