# Plan: Web Workers fuer MonteCarlo und ParameterSweep

> **Status (Januar 2026):** Die Worker-Parallelisierung ist implementiert und produktiv.
> Dieses Dokument dient als historische Referenz fuer Design-Entscheidungen.

## Ziel
Parallelisierung der Monte-Carlo- und ParameterSweep-Simulationen mit deterministischem Seeding, ohne Semantik-Aenderungen. Fokus auf Browser/TAURI (Web Workers) mit Transferables; worker_threads nur optional fuer Node-CLI.

## Leitprinzipien
- Determinismus: gleiche Seeds und Inputs -> gleiche Ergebnisse, unabhaengig von Worker-Anzahl oder Chunking.
- Kompatibilitaet: Legacy RNG-Stream optional aktivierbar.
- Minimal invasive Diffs: klare Schnittstellen, kleine Payloads, init-once im Worker.
- Keine UI/Logik-Semantik aendern (nur Parallelisierung + deterministische Seeds).
## Nicht-Ziele
- Keine Aenderung am Ergebnisformat fuer UI (nur interner TypedArray-Vertrag).
- Keine Aenderung an Finanzannahmen, Guardrails oder Rebalancing.
- Kein verpflichtender Node-CLI Worker-Support (optional, spaeter).
---

## Bestandsaufnahme (Stand Codebasis)
- RNG per-run-seed ist implementiert (makeRunSeed, RUNIDX_COMBO_SETUP) und in MC/Sweep verwendet.
- compileScenario + getDataVersion existieren (scenarioKey + dataVersion Hashing).
- Feature-Flag useWorkers ist vorhanden, aber nicht an MC/Sweep angebunden.
- WorkerPool existiert, mc-worker.js ist nur Stub (job handling fehlt).
- TypedArray Result-Contract ist noch nicht umgesetzt.
- Auto-Chunking nach Zeitbudget fehlt.
- Sweep Scheduling ueber Worker fehlt.
- Worst-Run Tie-Breaker ist nicht explizit implementiert (nur lowest finalWealth).

## Naechste notwendige Entwicklungen (fuer Funktionalitaet)
1) Worker-Job-Implementierung (MC) inkl. TypedArray-Vertrag
2) MC-Orchestrierung: useWorkers Flag, init/broadcast, Job-Scheduling, Fallback
3) Deterministische Worst-Run Merge inkl. Tie-Breaker
4) Auto-Chunking nach Zeitbudget (ohne RunIdx-Aenderung)
5) Sweep parallelisieren (comboIdx + runRange Jobs)
6) Determinism Tests (Serial vs WorkerCount/ChunkSize)


## Kompatibilitaets-Story (Pflicht)
- Neuer Schalter: `rngMode: "legacy-stream" | "per-run-seed"` (Default: `per-run-seed`).
- Release Note: "MonteCarlo/Sweep Ergebnisse aendern sich ab Version X (per-run-seed), bleiben aber invariant zu Parallelisierung und Chunking."

---

## Implementierungsplan (umsetzbare Reihenfolge)

### 0) Entry Points + Feature Flag
**Dateien**: `simulator-monte-carlo.js`, `simulator-sweep.js`, `feature-flags.js`

**Ziel**
- Zentraler Toggle: `useWorkers` (Default: false) plus `rngMode`.
- Serialer Pfad bleibt unveraendert und ist immer verfuegbar (Fallback bei Worker-Error).

**Status**: Teilweise (useWorkers Flag vorhanden, aber keine MC/Sweep-Wiring)

**Risiko**: Niedrig
**Erwarteter Speedup**: 0x (Enabler)

### 1) RNG-Determinismus: makeRunSeed + per-run RNG
**Dateien**: `simulator-utils.js`, `monte-carlo-runner.js`, `simulator-sweep.js`

**Neue Signaturen**
- `export function makeRunSeed(baseSeed, comboIdx, runIdx)`
- Konstante: `RUNIDX_COMBO_SETUP = 0x7fffffff`
- `rngMode` Flag (Default: `per-run-seed`)

**Seeding-Definition**
- `baseSeed` wird zuerst auf uint32 normalisiert.
- `makeRunSeed` erzeugt einen uint32 Seed.
- Mixer: 32-bit Finalizer (Murmur3-Style) oder BigInt-SplitMix64 intern, Output uint32.

**Umstellung**
- MC: `rand = rng(makeRunSeed(baseSeed, 0, runIdx))`
- Sweep: `rand = rng(makeRunSeed(baseSeed, comboIdx, runIdx))`
- comboRand: `rng(makeRunSeed(baseSeed, comboIdx, RUNIDX_COMBO_SETUP))`

**Status**: Erledigt (MC + Sweep bereits auf per-run-seed umgestellt)

**Risiko**: Mittel (Ergebnisse aendern sich im neuen Modus)
**Erwarteter Speedup**: 0x (Enabler)
**Determinismus-Test**
- Serial wiederholbar (per-run-seed)
- workerCount invariance (1/2/4/8)
- chunkSize invariance (25/100/500)
- legacy-stream reproduziert alte Baseline

---

### 2) compiledScenario + prepareHistoricalData einmal (Cache-Keying)
**Dateien**: `simulator-monte-carlo.js`, `simulator-sweep.js`, `simulator-engine-helpers.js`

**Neue Signaturen**
- `compileScenario(inputs, widowOptions, methode, useCapeSampling, stressPreset)` -> `{ scenarioKey, compiledScenario }`
- `prepareHistoricalDataOnce()`

**Cache-Keying**
- `stableStringify` mit sortierten Keys + konsistenter Behandlung von NaN/Infinity/undefined.
- `scenarioKey = hash(stableStringify({ inputs, widowOptions, methode, useCapeSampling, stressPreset }))`

**Stress-Kontext**
- `stressCtxMaster` pro combo via `comboRand`, pro run per `cloneStressContext`.

**Status**: Teilweise (compileScenario + getDataVersion vorhanden; kein Worker-Cache genutzt)

**Risiko**: Mittel (Cache-Invalidation)
**Erwarteter Speedup**: 0.1-0.3x
**Determinismus-Test**
- Gleiches scenarioKey -> identische Ergebnisse
- Geaenderte Inputs -> neuer Key

---

### 3) TypedArray Result-Contract fixieren
**Dateien**: `monte-carlo-runner.js`, `simulator-results.js`

**Contract (pro Run, length = runsInChunk)**
- `finalWealth: Float64Array`
- `taxTotal: Float64Array` (optional)
- `flags: Uint8Array` (bitmask)
- `ageAtFailure: Uint8Array` nur falls `maxDauer <= 255`, sonst `Uint16Array`

**Flags (Uint8)**
- Bit 0: FAILED
- Bit 1: CARE_TRIGGERED
- Bit 2: SHORTFALL (falls getrennt erfasst)
- Bit 3: ALL_DIED (optional)

**Status**: Offen (nur JS-Arrays + Aggregation im Main Thread)

**Risiko**: Niedrig
**Erwarteter Speedup**: 0x (Enabler)
**Determinismus-Test**
- Serial Aggregation vs TypedArray Aggregation identisch

---

### 4) Worker-API-Vertrag + Worker-Pool (init once, job small)
**Dateien**: `workers/mc-worker.js`, `workers/worker-pool.js`, `simulator-monte-carlo.js`

**Worker API**
- `init`: compiledScenario (einmal), keyed by `scenarioKey`
- `job`: `{ scenarioKey, runRange, baseSeed, maxDauer, blockSize, methode, useCapeSampling }`
- `progress`: `{ done, total, phase }`
- `result`: TypedArrays + worst-run summary
- `error`: message + stack
- `dispose`: Cache leeren

**Versioning/Invalidation**
- `dataVersion` (annualDataHash, regimeHash) ist Pflicht.
- Gleicher key + anderer dataVersion => overwrite + warning.

**Status**: Teilweise (WorkerPool existiert; mc-worker job fehlt; keine init/broadcast Nutzung)

**Risiko**: Mittel
**Erwarteter Speedup**: 2-6x bei grossen Runs
**Determinismus-Test**
- workerCount invariance
- chunkSize invariance

---

### 5) Auto-Chunking nach Zeitbudget
**Dateien**: `simulator-monte-carlo.js`, `workers/worker-pool.js`

**Regel**
- Ziel: 100-300ms CPU-Zeit pro Job.
- Erster Job misst runtime -> chunkSize anpassen.
- Chunking darf runIdx nicht veraendern.

**Status**: Offen

**Risiko**: Niedrig-Mittel
**Erwarteter Speedup**: 1.1-1.4x
**Determinismus-Test**
- chunkSize invariance

---

### 6) Sweep Scheduling: comboIdx + runRange Jobs
**Dateien**: `simulator-sweep.js`, `workers/mc-worker.js`

**Job-Form**
- `{ scenarioKey, comboIdx, runRange, paramsDelta, baseSeed, maxDauer, blockSize, methode }`

**Ziel**
- Gleicher Worker-Path wie MC
- Perfekte Lastverteilung

**Status**: Offen

**Risiko**: Mittel
**Erwarteter Speedup**: 2-6x bei grossen Grids
**Determinismus-Test**
- workerCount invariance
- chunkSize invariance

---

### 7) Worst-Run Merge: deterministische Tie-Breaker
**Dateien**: `monte-carlo-runner.js`, `simulator-monte-carlo.js`

**Tie-Breaker**
1) smallest finalWealth
2) smallest comboIdx
3) smallest runIdx

**Status**: Offen (nur finalWealth Vergleich)

**Risiko**: Niedrig
**Erwarteter Speedup**: 0x
**Determinismus-Test**
- worst-run stabil ueber workerCount/chunkSize
---

## Rollout / Fallback
- Default: Serial (useWorkers=false) bis Tests stabil sind.
- Worker-Fehler -> automatisch Serial fallback + Warnung (nicht still).
- Optional: UI-Schalter (nur wenn gewuenscht).

## Logging/Debug
- Worker-Init/Job-Error mit scenarioKey + dataVersion loggen.
- Debug-Flag: nur Run 0 loggen, nie in Hot Loops.

## Offene Punkte (UNBEKANNT bis geklaert)
- COOP/COEP fuer SharedArrayBuffer in Tauri? (UNBEKANNT)
- Max run count bevor Transferables zu gross werden? (UNBEKANNT)

---

## Worker Runtime Target
- Primary: Web Workers (Browser/TAURI)
- Optional: worker_threads (Node-CLI)

**SharedArrayBuffer**
- Nur falls COOP/COEP aktiviert.
- Default: Transferables (ArrayBuffer) + init-once + job-small.

---

## Determinism Test Checklist (fixe Parameter)

### Monte Carlo
- rngMode: per-run-seed
- seed: 12345
- anzahl: 1000
- maxDauer: 35
- blockSize: 5
- methode: iid
- useCapeSampling: false
- stressPreset: NONE

**Tests**
- Serial Baseline
- WorkerCount 1/2/4/8 (identisch)
- ChunkSize 25/100/500 (identisch)
- Legacy-Stream optional: matches old baseline

### Sweep
- rngMode: per-run-seed
- baseSeed: 12345
- mcAnzahl: 300
- mcDauer: 35
- mcBlockSize: 5
- mcMethode: iid
- Grid:
  - runwayMin: 24,36
  - runwayTarget: 36,48
  - targetEq: 60
  - rebalBand: 5,10
  - maxSkimPct: 10
  - maxBearRefillPct: 5
  - goldTargetPct: 0,7.5
- useCapeSampling: false
- stressPreset: NONE

**Tests**
- Serial Baseline
- WorkerCount 1/2/4/8 (identisch)
- ChunkSize 25/100/500 (identisch)

---

## Definition of Done
- Serial per-run RNG deterministisch wiederholbar
- Parallel invariance: workerCount 1/2/4/8 identisch
- Chunking invariance: 25/100/500 identisch
- Performance: MC 50k Runs mindestens X% schneller (Baseline definieren)
- Memory: Peak RAM unter Y GB (bei Z Runs)