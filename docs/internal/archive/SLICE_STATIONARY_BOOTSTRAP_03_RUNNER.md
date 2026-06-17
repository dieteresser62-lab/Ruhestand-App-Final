# Slice Stationary Bootstrap 03: Runner

**Feature-Branch:** `codex/stationary-bootstrap`  
**GitHub-Status:** lokal angelegt, noch nicht veroeffentlicht  
**Status:** freigegeben  
**Startdatum:** 2026-06-16  
**Uebergeordneter Plan:** `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md`

## Ziel

Dieser Slice integriert die Methode `stationary` in den seriellen Monte-Carlo-Runner. Der DOM-freie Sampler aus Slice 2 wird pro MC-Run isoliert initialisiert und liefert die historischen Jahresdaten fuer die Simulation. Worker-Payload, UI und Persistenz bleiben Folge-Slices.

## Akzeptanzkriterien

- `methode === 'stationary'` laeuft im seriellen Runner ohne DOM-Zugriff.
- Der Sampler-State wird pro Run neu erstellt und nicht zwischen Runs geteilt.
- `blockSize` wird als `expectedBlockLength` an den Sampler uebergeben.
- CAPE hat bei neuen Blockstarts Vorrang vor FILTER/RECENCY.
- FILTER/RECENCY wirken nur auf neue Blockstarts; Blockfortsetzung bleibt sequenziell.
- Bestehende Methoden, insbesondere `block`, bleiben unveraendert.
- Full-Run und gesplittete Chunks liefern fuer `stationary` bei gleichem Seed gleiche Aggregate.
- Worker-Payload und UI werden in diesem Slice nicht geaendert.

## Scope

- `app/simulator/monte-carlo-runner.js`
- ggf. `app/simulator/mc-year-sampling.js` fuer wiederverwendbare Start-Sampler-Hilfen
- fokussierte Tests fuer serielle Runner-Integration
- Rueckdokumentation im Arbeitsplan

## Nicht-Scope

- Keine Worker-Payload- oder Worker-Paritaets-Aenderung.
- Keine UI-/Persistenz-Aenderung.
- Keine Aenderung der bestehenden Methode `block`.
- Keine Anpassung von `engine.js`, `dist/` oder Release-Artefakten.
- Keine Aenderung vorhandener `node_modules`-Aenderungen.

## Git-Status Vor Start

Branch:

```text
codex/stationary-bootstrap
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

- `docs/internal/SLICE_STATIONARY_BOOTSTRAP_03_RUNNER.md`
- `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md`
- `app/simulator/monte-carlo-runner.js`
- ggf. `app/simulator/mc-year-sampling.js`
- `tests/simulator-monte-carlo.test.mjs`

Voraussichtliche Änderungstiefe:

- mittel

Gefährdete bestehende Tests:

- `tests/stationary-bootstrap-sampler.test.mjs`
- `tests/monte-carlo-sampling.test.mjs`
- `tests/monte-carlo-startyear.test.mjs`
- `tests/simulator-monte-carlo.test.mjs`

Nicht anfassen:

- `engine.js`
- `dist/`
- `RuheStandSuite.exe`
- Worker-Payload
- UI/Persistenz
- bestehende `block`-Sampling-Semantik
- vorhandene `node_modules`-Aenderungen

Rollback-Strategie:

- Geaenderte bestehende Dateien: `git checkout -- docs/internal/STATIONARY_BOOTSTRAP_PLAN.md app/simulator/monte-carlo-runner.js app/simulator/mc-year-sampling.js tests/simulator-monte-carlo.test.mjs`
- Neue Datei nach Rueckfrage entfernen: `docs/internal/SLICE_STATIONARY_BOOTSTRAP_03_RUNNER.md`

## Geplante Tests

- `node tests/run-single.mjs tests/stationary-bootstrap-sampler.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs`
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `npm test`

## Durchgefuehrte Aenderungen

- `app/simulator/monte-carlo-runner.js` importiert den Stationary-Bootstrap-Contract und den DOM-freien Sampler aus Slice 2.
- Fuer `methode === 'stationary'` wird pro MC-Run ein eigener Sampler-State unter `simState.samplerState.stationaryBootstrap` erstellt.
- `blockSize` wird als erwartete Blocklaenge an `createStationaryBootstrapSampler()` durchgereicht.
- CAPE-Startkandidaten haben bei neuen Blockstarts Vorrang vor FILTER/RECENCY; bei fehlenden CAPE-Kandidaten faellt die Auswahl auf den vorhandenen Startjahr-Pool zurueck.
- FILTER/RECENCY verwenden fuer neue Blockstarts den bestehenden `yearSamplingConfig.allSampler`; Blockfortsetzungen laufen ueber den Sampler sequenziell.
- Bestehende Methoden laufen weiterhin ueber `sampleNextYearData()`.
- `tests/simulator-monte-carlo.test.mjs` um serielle `stationary`-Runner-Tests fuer Determinismus und Full-vs-Split-Chunking erweitert.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
  - Ergebnis: gruen, 95 Assertions.
- `node tests/run-single.mjs tests/stationary-bootstrap-sampler.test.mjs`
  - Ergebnis: gruen, 20 Assertions.
- `node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs`
  - Ergebnis: gruen, 6 Assertions.
- `node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs`
  - Ergebnis: gruen, 112 Assertions.
- `npm test`
  - Ergebnis: gruen, 99 Testdateien, 2854 Assertions, 0 fehlgeschlagene Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.

## Abweichungen Vom Plan

- Keine fachliche Abweichung. Worker-Payload, UI und Persistenz bleiben bewusst Folge-Slices.

## Offene Risiken

- Worker-Paritaet ist bewusst erst Slice 4.
- UI/Persistenz kann die Methode erst nach Slice 5 auswaehlen.

## Rueckdokumentation

- `docs/internal/STATIONARY_BOOTSTRAP_PLAN.md` dokumentiert Slice 3 als implementiert mit ausstehendem Review.

## Freigabestatus

freigegeben

## Review-Feedback von Gemini

### 1. Korrektheit
- **Erfüllung der Akzeptanzkriterien**: Alle Kriterien für Slice 3 sind vollständig umgesetzt.
- **Stress-Bootstrap-Vorrang**: Der bedingte Stress-Bootstrap (z. B. Great Depression) hat korrekten Vorrang vor dem Stationary Sampler, was durch `TEST 9c` und den Code-Check verifiziert wurde.
- **Chunking-Kompatibilität**: Die Tests `TEST 9a` und `TEST 9b` belegen, dass die Berechnungen unabhängig von der Aufteilung in Chunks absolut deterministisch sind.

### 2. Vertragstreue
- **Bestehende Pfade**: Klassischer Block-Bootstrap und IID-Pfade verhalten sich unverändert.
- **Parameterübergabe**: `blockSize` wird sauber an den Sampler übergeben.

### 3. Fehlerbehandlung
- **Robuste Fallbacks**: Bei fehlendem `yearSamplingConfig` oder unvollständigen Eingabeparametern greifen in `buildStationaryBootstrapStartOptions` sichere Fallbacks auf das globale `annualData`.

### 4. Seiteneffekte
- **Isolierung**: Es gibt keine negativen Seiteneffekte auf den restlichen Codebase-Zustand. Die gesamte Testsuite läuft einwandfrei durch.

### 5. Was könnte brechen?
- **Worker-Paritäts-Divergenz**: Da die Worker in diesem Slice 3 noch nicht integriert sind, würde ein Aufruf über den Worker-Pfad (sobald er aktiv geschaltet wird) divergieren. Dies ist jedoch expliziter Nicht-Scope dieses Slices und wird in Slice 4 behoben.

## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken: keine (Divergenz zum Worker-Pfad ist planmäßig und wird in Slice 4 aufgelöst).
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein neues stochastisches Overlay-Modell (ähnlich dem Stress-Preset) wird eingeführt und vergisst, die Priorisierung im Runner-Loop explizit abzustimmen, wodurch der Stationary Sampler fälschlicherweise das Overlay überschreibt.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | - | - | - |
