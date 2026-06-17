# Slice Tail Risk 03: Runner-Integration

**Feature-Branch:** `codex/fat-tail-crash-modell`
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht
**Status:** freigegeben
**Startdatum:** 2026-06-17
**Uebergeordneter Plan:** `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`

## Ziel

Dieser Slice integriert das in Slice 2 freigegebene Tail-Risk-Overlay in den seriellen Monte-Carlo-Runner. Pro Run wird aus dem bestehenden per-run Seed eine deterministische Tail-Schedule erzeugt, vor `simulateOneYear()` auf die Jahresdaten angewandt und in den MC-Logs sichtbar gemacht. Worker, UI, Persistenz, Export und Ergebnis-KPIs bleiben Folge-Slices.

## Akzeptanzkriterien

- Bei deaktiviertem Tail-Risk bleiben bestehende MC-Ergebnisse unveraendert.
- `tailRiskAnnualProbabilityPct=0` erzeugt keine aktiven Tail-Logfelder.
- Gleicher Seed, gleicher Run-Index und gleiche Config erzeugen gleiche Tail-Event-Jahre.
- Split-Chunks im seriellen Runner erzeugen fuer gleiche absolute `runIdx` dieselben Tail-Logs wie ein voller Lauf.
- Tail-Overlay wird vor `simulateOneYear()` angewandt, ohne historische Jahresdaten zu mutieren.
- Logzeilen enthalten fuer aktive Events `tailRiskActive`, `tailRiskEventType`, Schockwerte, Effektivwerte und Skip-Grund.
- Historische Krisenjahre behalten den Krisenjahr-Skip aus Slice 2.
- Keine Worker-, UI-, Persistenz-, Export- oder KPI-Aenderung.

## Scope

- `app/simulator/monte-carlo-runner.js`
- `app/simulator/mc-log-builder.js`
- Fokussierte Regressionen in `tests/simulator-monte-carlo.test.mjs`
- Rueckdokumentation im uebergeordneten Arbeitsplan.

## Nicht-Scope

- Keine Worker-Payload-, Worker-Merge- oder Worker-Paritaets-Aenderung.
- Keine UI-/Persistenz-Aenderung.
- Keine Ergebnis-KPI-, Export- oder Vergleichsreport-Aenderung.
- Keine Aenderung an `engine/`, `engine.js`, `dist/` oder Release-Artefakten.

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

- `docs/internal/SLICE_TAIL_RISK_03_RUNNER_INTEGRATION.md`
- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/mc-log-builder.js`
- `tests/simulator-monte-carlo.test.mjs`

Voraussichtliche Aenderungstiefe:

- mittel

Gefaehrdete bestehende Tests:

- `tests/simulator-monte-carlo.test.mjs`
- `tests/tail-risk-overlay.test.mjs`
- `tests/worker-parity.test.mjs`
- `tests/scenario-analyzer.test.mjs`

Nicht anfassen:

- `workers/mc-worker.js`
- UI/Persistenz/Export
- `engine/`, `engine.js`, `dist/`, `RuheStandSuite.exe`
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Geaenderte bestehende Dateien: `git checkout -- docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md app/simulator/monte-carlo-runner.js app/simulator/mc-log-builder.js tests/simulator-monte-carlo.test.mjs`
- Neue Slice-Datei nach Rueckfrage entfernen: `docs/internal/SLICE_TAIL_RISK_03_RUNNER_INTEGRATION.md`

## Geplante Tests

- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `node tests/run-single.mjs tests/tail-risk-overlay.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `node tests/run-single.mjs tests/scenario-analyzer.test.mjs`
- `npm test`

## Durchgefuehrte Aenderungen

- `app/simulator/monte-carlo-runner.js` integriert:
  - pro Run wird `runSeed = makeRunSeed(seed, 0, runIdx)` berechnet,
  - `createTailRiskSchedule(runSeed, inputs, maxDauer)` erzeugt die absolute-run-index-gekoppelte Schedule,
  - jedes gezogene bzw. gestresste historische Jahr wird ueber `applyTailRiskOverlay()` in eine effektive, nicht-mutierende Jahresdatenkopie ueberfuehrt,
  - `simulateOneYear()`, Care-Update, Rentenanpassung und CAPE-Aufloesung laufen auf den effektiven Jahresdaten,
  - Death- und Ruin-Kontexte fuehren das Tail-Overlay fuer Logzwecke mit.
- `app/simulator/mc-log-builder.js` erweitert:
  - normale Jahreslogs, Ruin-Logs und Death-Logs enthalten Tail-Risk-Felder,
  - inaktive Jahre schreiben neutrale Werte (`tailRiskActive=false`, Event-/Effektivwerte `null` bzw. 0),
  - aktive Jahre schreiben Event-Typ, Event-ID, Offset, Return-/Inflationsschock, historische und effektive Werte, Skip-Grund und Krisenjahrgrunde.
- `tests/simulator-monte-carlo.test.mjs` erweitert:
  - deterministischer serieller Tail-Risk-Lauf mit aktivem Event und Logfeld-Pruefung,
  - Full-vs-Split-Chunk-Test fuer Tail-Risk-Logshape bei gleichen absoluten `runIdx`.
- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md` auf Slice-3-Status aktualisiert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
  - Ergebnis: gruen, 110 Assertions.
- `node tests/run-single.mjs tests/tail-risk-overlay.test.mjs`
  - Ergebnis: gruen, 31 Assertions.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
  - Ergebnis: gruen, 353 Assertions.
- `node tests/run-single.mjs tests/scenario-analyzer.test.mjs`
  - Ergebnis: gruen, 23 Assertions.
- `npm test`
  - Ergebnis: gruen, 101 Testdateien, 2987 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.

## Abweichungen Vom Plan

- Keine fachliche Abweichung vom Slice-Ziel.
- Paket 3 wurde bewusst nur anteilig umgesetzt: Serial-MC und Logs sind in Slice 3 erledigt; Worker-Payload, Worker-Merge und Tail-KPIs bleiben wie geplant Slice 4.
- Die Tail-Summary aus `summarizeTailRiskEvents()` wird in diesem Slice noch nicht in Aggregates/KPIs gemerged, weil Ergebnis-KPIs im Scope erst ab Slice 4/5 vorgesehen sind.

## Offene Risiken

- Worker-Payload, Worker-Merge und Worker-Paritaet fuer Tail-Risk folgen erst in Slice 4.
- UI-Opt-in und Nutzerwarnhinweis folgen erst in Slice 5.
- Bei `rngMode='legacy-stream'` bleibt die Marktdatenziehung streambasiert, die Tail-Schedule wird aber bereits pro `runIdx` aus `makeRunSeed()` abgeleitet. Chunking ist fuer Legacy-Stream ohnehin blockiert; fuer neue Worker-Paritaet ist `per-run-seed` massgeblich.
- Die bekannte nicht-monotone Skip-Klippe an der historischen Krisenschwelle aus Slice 1/2 bleibt bestehen und wird durch die Runner-Integration nicht geglaettet.

## Rueckdokumentation

- `docs/internal/FAT_TAIL_CRASH_MODELL_PLAN.md` dokumentiert Slice 3 als implementiert mit ausstehendem Review und haelt Slice 4 fuer Worker/Metrics als Folgescope offen.

## Freigabestatus

- Codex-Implementierung abgeschlossen; Review durch Gemini/Nutzer steht aus. Codex markiert den Slice nicht als freigegeben.

## Review-Feedback von Gemini

- **Status:** freigegeben
- **Blocker:** keine
- **Findings & Analysen:**
  - **TR-03-01 (Deterministische runSeed-Generierung):** Der absolute `runIdx` wird über `makeRunSeed(seed, 0, runIdx)` stabil zur Schedule-Generierung verwendet. Die Unabhängigkeit von den Chunk-Grenzen des seriellen Runners wurde im Regressionstest erfolgreich verifiziert.
  - **TR-03-02 (Stationary Bootstrap & Doppelpessimismus):** Das Overlay wird auf die gezogenen Jahre (egal ob über Standard-Sampling oder Stationary Bootstrap) angewandt. Der Doppelpessimismus-Schutz greift auch hier korrekt über die Krisenjahr-Erkennung im Overlay-Modul.
  - **TR-03-03 (Log-Konsistenz):** Die Logfelder sind in allen MC-Logpfaden (Normaljahr, Ruin, Tod) über den `mc-log-builder.js` konsistent und fehlertolerant integriert.
- **Restrisiken:**
  - Desynchronisation im parallelen Worker-Runner (`mc-worker.js`), wenn dieser in Slice 4 nicht exakt analog integriert wird.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| TR-03-01 | Gemini | Chunk-Unabhängigkeit des Seed-Mappings | Geprüft & Freigegeben | Bestätigt durch Regressionstest (TEST 18) |
| TR-03-02 | Gemini | Doppelpessimismus bei Stationary Bootstrap | Geprüft & Freigegeben | Logische Koppelung über die universelle applyTailRiskOverlay-Schnittstelle gewährleistet |
| TR-03-03 | Gemini | Logfeld-Fehlende in Ruin-/Death-Pfaden | Geprüft & Freigegeben | MC-Log-Builder stellt sichere Defaults bei fehlendem Overlay bereit |

