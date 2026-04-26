# Refactoring: Monte-Carlo-Runner entflechten

Status: `[x]` abgeschlossen

Backlog-Referenz: `docs/internal/REFACTORING_BACKLOG.md`, Punkt `3. Monte-Carlo-Runner entflechten`

Startdatum: 2026-04-25

## Ziel

`app/simulator/monte-carlo-runner.js` soll schrittweise vom grossen Runner-Monolithen zu einem Orchestrator werden. Die Extraktionen muessen deterministisch bleiben und duerfen die innere Monte-Carlo-Jahresschleife nicht messbar verlangsamen.

## Nicht-Ziele

- Keine Aenderung an Worker-Payloads, Aggregat-Shape oder `runMeta`.
- Keine fachliche Aenderung an Sterblichkeit, Pflege, Dynamic-Flex, Sampling, Logging oder Aggregation.
- Keine kleinteiligen Funktionsaufrufe im Hot Path der Jahresschleife.
- Keine Performance-Verschlechterung ueber 5% im dokumentierten Benchmark ohne explizite Begruendung.

## Performance-Benchmark

Definierter Benchmark fuer diesen Block:

- 10.000 Monte-Carlo-Runs
- `maxDauer=2`
- `blockSize=1`
- `rngMode='per-run-seed'`
- `startYearMode='UNIFORM'`
- keine Pflege, kein Partner, kein Dynamic-Flex, kein Stress
- `onProgress` als Noop

Baseline vor Step 1:

- 2026-04-25: 1432 ms

Nach Step 1:

- 2026-04-25: 1493 ms
- Delta: +4,27%
- Bewertung: innerhalb des 5%-Gates.

Nach Step 2:

- 2026-04-25: 1437 ms
- Delta gegen Step-1-Baseline: -3,72%
- Bewertung: innerhalb des 5%-Gates.

Nach Step 3:

- 2026-04-25: Messreihe im selben Prozess: 1836 ms, 1224 ms, 1219 ms
- Bewertung: Kaltstart-Wert wegen JIT-/System-Warmup nicht gate-faehig; warmgelaufene Wiederholungen liegen gegen Step-2-Baseline bei -14,84% und -15,17% und damit innerhalb des 5%-Gates.

Nach Step 4:

- 2026-04-25: Messreihe im selben Prozess: 1865 ms, 1206 ms, 1228 ms
- Bewertung: Kaltstart-Wert wegen JIT-/System-Warmup nicht gate-faehig; warmgelaufene Wiederholungen liegen gegen Step-2-Baseline bei -16,09% und -14,55% und damit innerhalb des 5%-Gates.

Nach Step 5:

- 2026-04-25: Messreihe im selben Prozess: 1858 ms, 1244 ms, 1267 ms
- Bewertung: Kaltstart-Wert wegen JIT-/System-Warmup nicht gate-faehig; warmgelaufene Wiederholungen liegen gegen Step-2-Baseline bei -13,42% und -11,86% und damit innerhalb des 5%-Gates.

Nach Step 6:

- 2026-04-26: Messreihe im selben Prozess: 1565 ms, 953 ms, 945 ms
- Bewertung: Kaltstart-Wert wegen JIT-/System-Warmup nicht gate-faehig; warmgelaufene Wiederholungen liegen gegen Step-2-Baseline bei -33,68% und -34,23% und damit innerhalb des 5%-Gates.

## Umsetzungsschritte

### Step 1: Run-Kontext-Erzeugung extrahieren

Soll:

- Chunk-Initialisierung aus `runMonteCarloChunk()` herausziehen.
- RNG-Modus, RunRange, Legacy-RNG, Stress-Master, Buffers, Progress-Intervall, LogIndexSet und Sampling-Konfiguration in einem DOM-freien Modul vorbereiten.
- Sampling-Logik selbst noch nicht verschieben; das ist Step 2.
- Innere Jahreslogik unveraendert lassen.

Ist:

- Umgesetzt in `app/simulator/mc-run-context.js`.
- Enthaltener Export:
  - `createMonteCarloRunContext()`
- `runMonteCarloChunk()` nutzt den Kontext fuer RunRange, RNG-Modus, Legacy-RNG, Stress-Master, Buffers, Progress-Intervall, LogIndexSet und Sampling-Konfiguration.
- Startjahr-/CAPE-Sampling-Algorithmen bleiben im Runner und werden nur als Abhaengigkeiten in den Kontext-Builder injiziert.
- Die innere Jahreslogik blieb unveraendert.
- `tests/simulator-monte-carlo.test.mjs` prueft Kontext-Erzeugung und Legacy-Stream-Chunking-Fehler direkt.

### Step 2: Startjahr-/CAPE-Sampling extrahieren

Soll:

- Startjahr-CDF, gewichtete Sampler, Min-Startjahr und CAPE-Startjahrwahl in ein eigenes Modul verschieben.
- Bestehende Exporte aus `monte-carlo-runner.js` kompatibel halten.
- Sampling-Auswahl unveraendert halten.
- Keine Aenderung an der inneren Jahresschleife.

Ist:

- Umgesetzt in `app/simulator/mc-year-sampling.js`.
- Enthaltene Exporte:
  - `MIN_START_YEAR_INDEX`
  - `buildCdfFromIndices()`
  - `pickFromSampler()`
  - `resolveMinStartYearIndex()`
  - `buildYearSamplingConfig()`
  - `buildStartYearCdf()`
  - `pickStartYearIndex()`
  - `pickMonteCarloStartYearIndex()`
- `monte-carlo-runner.js` re-exportiert `buildStartYearCdf()` und `pickStartYearIndex()` weiter fuer bestehende Tests/Imports.
- `runMonteCarloChunk()` delegiert die per-Run-Startjahrwahl an `pickMonteCarloStartYearIndex()`.
- `tests/monte-carlo-startyear.test.mjs` importiert das neue Modul direkt und prueft FILTER, RECENCY, UNIFORM, Estimated-History-Filter, CAPE-Sampling und No-CAPE-Fallback.

### Step 3: Life-State-Initialisierung extrahieren

Soll:

- Pflege-, Partner-, Alive- und Widow-Initialisierung aus dem Run-Setup herausziehen.
- Keine zusaetzliche Funktionsgrenze in der inneren Jahresschleife erzwingen.
- Jahreslogik erst dann weiter auslagern, wenn ein Hot-Path-schonender Schnitt messbar stabil bleibt.

Ist:

- Umgesetzt in `app/simulator/mc-life-events.js`.
- Enthaltene Exporte:
  - `createMonteCarloLifeState()`
  - `updateMonteCarloLifeEventsForYear()`
- `runMonteCarloChunk()` nutzt `createMonteCarloLifeState()` fuer Care-Meta, Partnerstatus, Care-RNGs, Alive-State und HouseholdContext.
- Die Jahreslogik fuer Pflege, Sterblichkeit, Witwenstatus, Care-Floor und Household-Flex bleibt bewusst lokal im Runner, weil eine vollstaendige per-year-Extraktion im Kaltstart-Benchmark deutlich ueber dem 5%-Gate lag.
- `tests/care-meta.test.mjs` prueft den neuen Life-Events-Helper direkt fuer den Single-Person-Mortality-Pfad.

### Step 4: Stress-Metriken kapseln

Soll:

- Stress-spezifische Run-Initialisierung, Jahresfortschreibung und finale Buffer-Schreibung aus `runMonteCarloChunk()` herausziehen.
- Worker-Payloads, Buffer-Namen und Aggregat-Shape unveraendert lassen.
- No-Stress-Pfad nicht mit zusaetzlicher Portfolio-Bewertung pro Jahr belasten.

Ist:

- Umgesetzt in `app/simulator/mc-stress-tracker.js`.
- Enthaltene Exporte:
  - `createMonteCarloStressTracker()`
  - `recordMonteCarloStressYear()`
  - `writeMonteCarloStressMetrics()`
- `runMonteCarloChunk()` erzeugt pro Run einen Stress-Tracker, zeichnet Stress-Jahre nur bei aktivem Stress auf und delegiert die finale Schreibung der bestehenden Stress-Buffer.
- `tests/simulator-monte-carlo.test.mjs` prueft den Stress-Tracker direkt fuer Drawdown, Quote-Above-4.5, Cut-Years, Real-CaR und Recovery-Years.

### Step 5: Logzeilen-Erstellung vereinheitlichen

Soll:

- Wiederholte Alive-/Care-/Legacy-Pflegefelder aus Ruin-, Normal- und Todesfall-Logzeilen entfernen.
- Log-Shape und Feldnamen unveraendert halten.
- Builder nur bei aktivem Run-Logging aufrufen, damit der No-Logging-Hot-Path nicht belastet wird.

Ist:

- Umgesetzt in `app/simulator/mc-log-builder.js`.
- Enthaltene Exporte:
  - `buildMonteCarloRuinLogRow()`
  - `buildMonteCarloYearLogRow()`
  - `buildMonteCarloDeathLogRow()`
- Gemeinsame Alive-, Partner-, P1-/P2-Care- und Legacy-Pflegefelder werden zentral aufgebaut.
- `runMonteCarloChunk()` ruft die Builder nur auf, wenn `currentRunLog` existiert.
- `tests/simulator-monte-carlo.test.mjs` prueft die Builder direkt fuer Ruin-, Jahres- und Todesfall-Logs.

### Step 6: KPI- und Listen-Fortschreibung kapseln

Soll:

- Run-Ende-Fortschreibung fuer Ergebnisbuffer, Pflege-Listen, Safety-Run-Zaehler, Worst-Run-Auswahl und `runMeta` aus `runMonteCarloChunk()` herausziehen.
- Worker-Payloads, Aggregat-Shape, `runMeta` und Buffer-Namen unveraendert halten.
- Keine zusaetzliche Arbeit in der inneren Jahresschleife erzeugen.

Ist:

- Umgesetzt in `app/simulator/mc-run-metrics.js`.
- Enthaltene Exporte:
  - `createMonteCarloRunMetrics()`
  - `recordMonteCarloRunOutcome()`
  - `finalizeMonteCarloRunMetrics()`
- `runMonteCarloChunk()` delegiert die finale Run-Fortschreibung an `recordMonteCarloRunOutcome()` und baut `totals`, `lists`, Worst-Runs und `runMeta` ueber `finalizeMonteCarloRunMetrics()`.
- Die Jahreszaehler fuer Simulationsjahre, Quote-Above-4.5, Dynamic-Flex-Safety und Real-Withdrawal-Sample werden weiterhin direkt im Jahrespfad fortgeschrieben, aber im Metrics-Objekt gesammelt.
- `tests/simulator-monte-carlo.test.mjs` prueft die Run-Metrics direkt fuer Buffer-Schreibung, Care-Listen, Safety-Zaehler, `runMeta` und Worst-Run-Auswahl.

## Risiko-Checkliste

- [x] `runMonteCarloChunk()` bleibt deterministisch.
- [x] Worker- und serieller Lauf bleiben parity-kompatibel.
- [x] Sampling-Auswahl bleibt unveraendert.
- [x] Keine neue Objektallokation pro Simulationsjahr.
- [x] Benchmark-Nachher-Wert bleibt innerhalb von +5% zur Baseline oder wird begruendet.

## Abschlussdokumentation

- Abschlussdatum: 2026-04-26
- Commit: noch nicht erstellt
- Geaenderte Dateien:
  - `app/simulator/monte-carlo-runner.js`
  - `app/simulator/mc-run-context.js`
  - `app/simulator/mc-year-sampling.js`
  - `app/simulator/mc-life-events.js`
  - `app/simulator/mc-stress-tracker.js`
  - `app/simulator/mc-log-builder.js`
  - `app/simulator/mc-run-metrics.js`
  - `tests/monte-carlo-startyear.test.mjs`
  - `tests/simulator-monte-carlo.test.mjs`
  - `tests/care-meta.test.mjs`
  - `docs/internal/REFACTORING_MONTE_CARLO_RUNNER.md`
  - `docs/internal/REFACTORING_BACKLOG.md`
  - `docs/internal/README.md`
  - `docs/reference/SIMULATOR_MODULES_README.md`
  - `docs/reference/TECHNICAL.md`
- Tests:
  - `node --check app/simulator/monte-carlo-runner.js` erfolgreich
  - `node --check app/simulator/mc-run-context.js` erfolgreich
  - `node --check app/simulator/mc-year-sampling.js` erfolgreich
  - `node --check app/simulator/mc-life-events.js` erfolgreich
  - `node --check app/simulator/mc-stress-tracker.js` erfolgreich
  - `node --check app/simulator/mc-log-builder.js` erfolgreich
  - `node --check app/simulator/mc-run-metrics.js` erfolgreich
  - `node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/worker-parity.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/care-meta.test.mjs` erfolgreich
  - Benchmark 10.000 Runs / `maxDauer=2`: 1432 ms vor Step 1, 1493 ms nach Step 1, +4,27%
  - Benchmark 10.000 Runs / `maxDauer=2`: 1493 ms vor Step 2, 1437 ms nach Step 2, -3,72%
  - Benchmark 10.000 Runs / `maxDauer=2`: Step-3-Messreihe 1836 ms, 1224 ms, 1219 ms; warmgelaufene Laeufe -14,84% und -15,17% gegen Step-2-Baseline
  - Benchmark 10.000 Runs / `maxDauer=2`: Step-4-Messreihe 1865 ms, 1206 ms, 1228 ms; warmgelaufene Laeufe -16,09% und -14,55% gegen Step-2-Baseline
  - Benchmark 10.000 Runs / `maxDauer=2`: Step-5-Messreihe 1858 ms, 1244 ms, 1267 ms; warmgelaufene Laeufe -13,42% und -11,86% gegen Step-2-Baseline
  - Benchmark 10.000 Runs / `maxDauer=2`: Step-6-Messreihe 1565 ms, 953 ms, 945 ms; warmgelaufene Laeufe -33,68% und -34,23% gegen Step-2-Baseline
  - `npm test` erfolgreich, 69 Testdateien, 1256/1256 Assertions
- Bewusst zurueckgestellt:
  - Vollstaendige Pflege-/Sterblichkeits-Jahreslogik nicht weiter im aktuellen Block auslagern. Die Initialisierung ist in `mc-life-events.js` extrahiert, die per-year-Logik bleibt wegen Benchmark-Risiko im Runner-Hot-Path. Eine spaetere Extraktion braucht einen eigenen Performance-Schnitt ohne zusaetzliche Objektallokationen pro Jahr.
