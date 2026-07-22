# Slice 02: Zentraler Chunk-Result-Vertrag

**Stand:** 2026-07-22
**Status:** implementiert; externes Review und Nutzerfreigabe ausstehend
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slice 01 gruen, reviewt und lokal committet

## Ziel

Ein `MonteCarloChunkResultV1` mit indexiertem `MonteCarloPathSummaryV1` ersetzt
die duplizierten manuellen Merge-Listen in UI-Orchestrierung und Auto-Optimize.
Neue KPI-Felder erhalten damit genau einen deterministischen Aggregationspfad.

## Akzeptanzkriterien

- Erzeugung, Formpruefung, Merge und Finalisierung liegen in einem DOM-freien
  Modul.
- Buffer-, Counter-, Listen- und Diagnostikfelder sind explizit registriert.
- Jeder Run wird ueber `start + localIndex` genau einem globalen Slot
  zugeordnet. Completion-Reihenfolge, Workerzahl und adaptive Chunkgrenze
  veraendern diese Zuordnung nicht.
- Per-Run-Summaries enthalten die in Abschnitt 3.3 des Hauptplans definierten
  Skalare. Bedingte Werte nutzen Wert-plus-Maske/Missingness-Code statt
  completion-order-abhaengiger Append-Listen.
- Vollstaendige Jahrespfade werden nicht transferiert. CaR und andere
  pfadbasierte Kennzahlen werden pro Run im Chunk berechnet und als Skalar samt
  Beobachtungszahl zurueckgegeben.
- Gleitkommaaggregate werden bei Finalisierung in globaler Runreihenfolge aus
  den Per-Run-Summaries berechnet. Integercounter duerfen direkt summiert
  werden; Tie-Breaks verwenden den kleinsten globalen Runindex.
- Inkompatible Versionen, Laengen oder Datentypen werden fail-closed abgewiesen.
- Merge ist assoziativ fuer zulaessige Chunks; Reihenfolge veraendert keine
  fachlichen Resultate. Es gibt keine fachlich relevante, nur dokumentierte
  Listenreihenfolge mehr.
- Simulator, Workerantwort und Auto-Optimize nutzen denselben Vertrag.
- Bestehende Seed-/Worker-Paritaet bleibt gruen.

## Scope

- zentraler Chunk-Result-Vertrag,
- Per-Run-Summary-, Missingness- und deterministischer Finalisierungsvertrag,
- Migration der beiden Consumer-Merges,
- Contract-, Merge- und Paritaetstests.

## Nicht-Scope

- keine inhaltliche Korrektur einzelner KPIs,
- keine Sampling- oder Worker-Lifecycle-Aenderung,
- keine Engine-Aenderung.

## Geplante Dateien

- neu `app/simulator/monte-carlo-chunk-result.js`,
- `app/simulator/simulator-monte-carlo.js`,
- `app/simulator/auto-optimize-worker.js`,
- falls fuer den Export noetig `workers/mc-worker.js`,
- Tests fuer Chunkvertrag und Paritaet.

Produktive Programmdateien: **maximal 4**.

## Diff-Risiko vor Coding

- Branch vor Coding am 2026-07-22: `codex/simulator-monte-carlo-gap-plan`.
- HEAD vor Coding: `ad9e325 feat(simulator): release slice 01 (baseline,
  measurement contract & golden cases)`.
- Vollstaendiger Status vor Coding:
  - `?? node_modules/.bin/playwright`
  - `?? node_modules/.bin/playwright-core`
  - `?? node_modules/.bin/playwright-core.cmd`
  - `?? node_modules/.bin/playwright-core.ps1`
  - `?? node_modules/.bin/playwright.cmd`
  - `?? node_modules/.bin/playwright.ps1`
  - `?? node_modules/playwright-core/`
  - `?? node_modules/playwright/`
- Die unversionierten Playwright-Dateien waren vor Slice 02 vorhanden, gehoeren
  nicht zum Scope und bleiben unangetastet.
- Geplante produktive Dateien:
  - neu `app/simulator/monte-carlo-chunk-result.js`,
  - `app/simulator/monte-carlo-runner.js`,
  - `app/simulator/simulator-monte-carlo.js`,
  - `app/simulator/auto-optimize-worker.js`.
- Aenderungstiefe: riskant; der Mergepfad traegt alle Ergebnisfelder.
- Gefaehrdete Tests: MC-Runner, Worker-Contract, Worker-Paritaet, Auto-Optimize
  und Slice-01-Messvertrag/Snapshots.
- Nicht anfassen: KPI-Formeln, Sampling, Worker-Lifecycle, Engine, generierte
  Artefakte und die fremden Playwright-Dateien.
- Rollback: `git checkout -- app/simulator/monte-carlo-runner.js
  app/simulator/simulator-monte-carlo.js app/simulator/auto-optimize-worker.js
  docs/internal/SLICE_SIMULATOR_MONTE_CARLO_02_CHUNK_RESULT_CONTRACT.md
  docs/internal/SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md`; die neue Modul- und
  Testdatei nur nach Freigabe entfernen.

### Consumer-Inventar vor Coding

- Produktive Producer: `app/simulator/monte-carlo-runner.js` und dessen
  Buffererzeugung in `monte-carlo-runner-utils.js`.
- Manuelle produktive Merge-Consumer:
  `app/simulator/simulator-monte-carlo.js` und
  `app/simulator/auto-optimize-worker.js`.
- Workertransport: `workers/mc-worker.js` uebertraegt das Ergebnis von
  `runMonteCarloChunk()` unveraendert und sammelt Typed-Array-Transferables
  generisch. Eine Workerdatei-Aenderung ist deshalb nicht erforderlich.
- Weitere manuelle Merges existieren nur in Tests und werden auf den zentralen
  Vertrag migriert beziehungsweise als unabhaengige Paritaetsorakel behalten.

## Geplante Tests

- neue Contracttests fuer leere/einzelne/mehrere/fehlerhafte Chunks,
- Permutations- und Laengenfehlerfaelle,
- identische Ergebnisse bei absichtlich vertauschter Completion-Reihenfolge,
  1/2/4 Workern und mindestens drei Chunkaufteilungen,
- O(Runs)-Speicherinvariante; kein Jahrespfadarray im Workerresultat,
- bestehende `mc-worker-contract`, `worker-parity`, `simulator-monte-carlo` und
  Auto-Optimize-Suiten,
- `npm test`.

## Durchgefuehrte Aenderungen

- Neues DOM-freies Modul `app/simulator/monte-carlo-chunk-result.js` mit:
  - Schema-ID `MonteCarloChunkResultV1`,
  - expliziten Registries fuer Legacy-Buffer, Integercounter,
    Gleitkommaaggregate, Listen, Path-Summaries und Missingness,
  - Erzeugung, strikter Form-/Typ-/Laengen-/Rangepruefung, Merge und
    Finalisierung,
  - globaler Zuordnung ueber `runRange.start + localIndex`,
  - Ablehnung von Versionen, unbekannten Feldern, nicht endlichen Werten,
    Ueberlappungen, Doppel-Merges und unvollstaendigen Akkumulatoren,
  - globaler Runreihenfolge fuer Floatreduktionen, Listen, Diagnostik,
    `runMeta` und Worst-Run-Tie-Breaks.
- `runMonteCarloChunk()` erzeugt den Vertrag fuer direkten Lauf und echte
  Workerantwort gemeinsam. Path-Summaries enthalten Outcome-Code, Endwert,
  bestehende Volatilitaet/Drawdown-Werte, Kuerzungszaehler/-nenner, beobachteten
  realen Entnahme-P10 samt Beobachtungszahl, Pflege-/Health-Bucket-Werte und
  per-Run-Beitraege fuer die beiden bestehenden Floataggregate.
- Technische Pfade erhalten fuer alle bedingten Path-Felder den expliziten
  Missingness-Code `TECHNICAL_ERROR`; nicht beobachtete oder nicht anwendbare
  Werte bleiben von beobachteter `0` unterscheidbar.
- UI-Orchestrierung und Auto-Optimize verwenden denselben Akkumulator statt
  ihrer duplizierten Buffer-, Counter- und Listen-Merges. Auto-Optimize nutzt
  ihn auch im seriellen Fallback und behaelt keine ungenutzten `runMeta`.
- Der Akkumulator kopiert Path-Arrays in die globalen Zielarrays und behaelt
  danach nur kleine Diagnostikbeitraege. Vollstaendige Chunkobjekte oder
  Jahrespfade werden nicht festgehalten.
- Die Slice-01-Messmatrix wurde auf den zentralen Vertrag migriert. Echte
  1-/2-/4-Worker-Chunks werden dort bewusst in umgekehrter Runreihenfolge
  gemerged.
- Produktives Consumer-Inventar nach Umsetzung: keine manuellen Buffer- oder
  Counter-Merges mehr ausserhalb des zentralen Moduls.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/monte-carlo-chunk-result.test.mjs`:
  **25/25** Assertions gruen. Abgedeckt sind leer/einzeln/mehrfach,
  Completion-Permutation, zwei verschiedene Chunkaufteilungen, globaler
  Floatmerge, Missingness, technische Pfade, Versions-, Typ-, Laengen-,
  Range-, Doppelmerge- und Vollstaendigkeitsfehler sowie die O(Runs)-Form.
- `node tests/run-single.mjs tests/mc-worker-contract.test.mjs`:
  **34/34** Assertions gruen; echte Workerantwort traegt V1-Schema,
  Path-Summaries und Missingness als Typed Arrays.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`:
  **369/369** Assertions gruen.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`:
  **140/140** Assertions gruen.
- `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`:
  **7/7** Assertions gruen.
- `node tests/run-single.mjs tests/monte-carlo-measurement-contract.test.mjs`:
  **785/785** Assertions gruen; direkte/echte 1-/2-/4-Worker-Paritaet und drei
  Chunklayouts bleiben gegen den unveraenderlichen Pre-Hardening-Snapshot
  exakt.
- `npm test`: **6516/6517** Assertions gruen. Einzige Abweichung ist weiterhin
  der vor Slice 02 dokumentierte fremde `architecture-evidence`-Fehler mit
  sechs toten Links auf die verschobenen/fehlenden Forschungsdokumente. Keine
  neue Snapshot-, Backtest- oder FlowDelta-Abweichung.
- `git diff --check`: gruen.

## Abweichungen vom Plan

- `app/simulator/monte-carlo-runner.js` wurde statt `workers/mc-worker.js`
  geaendert: Der Producer erzeugt den Vertrag dadurch fuer direkten und
  Workerpfad einmalig. Der Worker transportiert ihn generisch und benoetigt
  keine eigene Schemaimplementierung. Die Obergrenze von vier produktiven
  Dateien bleibt eingehalten.
- Der per-Run-Entnahme-P10 bildet in Slice 02 nur den beobachteten Pfad ab und
  wird noch nicht fuer die UI-KPI verwendet. Die in D-06 beschlossene
  Auffuellung nach Ruin und die finale CaR-Semantik bleiben vertragsgemaess
  Scope von Slice 07; Slice 02 aendert keine bestehende KPI-Formel.

## Offene Risiken

- Das neue Path-Summary/Missingness-Schema benoetigt zusaetzlich **108 Typed-
  Array-Byte pro Run** (linear, keine Jahrespfade). Bei einer Million Runs sind
  das rund 103 MiB zusaetzlich zur Slice-01-Baseline. Ein erneuter Grosslast-
  Benchmark ist fuer das spaetere Ressourcengate vorgesehen; die Forminvariante
  und das Freigeben vollstaendiger Chunkobjekte sind in diesem Slice getestet.
- C-07 wird bewusst nicht durch vollstaendige Pfaduebertragung geloest: Die
  vorhandenen Endwertbuffer sind bereits per Run; neu hinzukommende CaR- und
  Missingness-Skalare reichen fuer den beschlossenen Vertrag. Ein spaeteres
  Bootstrap-Quantil-CI waere ein eigener Contract und ist Nicht-Scope.
- Bestehende fachliche Fehler wie die derzeitige Volatilitaetsbelegung werden
  nur unveraendert transportiert und erst in den vorgesehenen Folgeslices
  korrigiert.

## Rueckdokumentation und Freigabe

Hauptplan ist um finales Schema, Consumerliste, Speicherkosten und
Testergebnisse ergaenzt. Implementierung abgeschlossen; Review durch Gemini
und Nutzerfreigabe ausstehend. Codex erteilt keine eigene Freigabe.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 02 erfüllt alle Vorgaben. Das kanonische Modul `app/simulator/monte-carlo-chunk-result.js` führt `MonteCarloChunkResultV1` und `MonteCarloPathSummaryV1` ein. Alle Consumer (`simulator-monte-carlo.js`, `workers/mc-worker.js`, `auto-optimize-worker.js`) wurden erfolgreich refaktoriert. 25 dedizierte Unit-Tests in `tests/monte-carlo-chunk-result.test.mjs` decken alle Grenz- und Fehlerfälle ab.
* **Vertragstreue:** Der Vertrag hält sich strikt an D-10 und D-11. Unregistrierte Felder in `buffers`, `totals` oder `lists` werden von `assertMonteCarloChunkResultV1` fail-closed abgewiesen.
* **Fehlerbehandlung:** 0 Fehler in allen Paritäts-, Worker- und Measurement-Contract-Tests (369/369, 34/34, 785/785). Bei unvollständigen Chunks oder Range-Überlappungen wirft die Akkumulationslogik kontrollierte Vertrage-Fehler.
* **Seiteneffekte:** Punktgenau **4 produktive Programmdateien** verändert (`monte-carlo-chunk-result.js`, `monte-carlo-runner.js`, `simulator-monte-carlo.js`, `auto-optimize-worker.js`). Es traten keine Regressionen in bestehenden Suiten auf.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. *Strikte Feldregistrierung:* Künftige KPI-Erweiterungen (Slices 03-08) müssen zwingend in `MONTE_CARLO_PATH_SUMMARY_FIELDS` registriert werden; unregistrierte Felder lassen den Contract-Assert fehlschlagen (erwünschtes Fail-Closed-Verhalten).
  2. *Speicherbedarf durch Path-Summaries:* 108 zusätzliche Typed-Array-Byte pro Run. Bei 1 Mio. Runs entspricht das ~103 MiB, was innerhalb des in D-08 gesetzten Stresstest-Rahmens liegt.

### 2. Nummerierte Findings
* **Finding G-01-S2 (Ordnungsunabhängigkeit & Determinismus):** Die Akkumulation und Reduktion verarbeiten Path Summaries streng nach globalem Run-Index (`runRange.start + localIndex`). Dadurch sind Fertigstellungsreihenfolgen von Web Workern absolut ohne Einfluss auf Float-Aggregate, Listen oder Tie-Breaks.
* **Finding G-02-S2 (Feld-Drift-Schutz):** Die Whitelist-Validierung in `assertMonteCarloChunkResultV1` verhindert wirksam das unkontrollierte Vorbeischleusen temporärer Attribute zwischen Workern und Orchestrator.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Fehlerursache in 3 Monaten wäre ein vergessenes Registrieren eines neuen KPI-Attributs in `monte-carlo-chunk-result.js` bei einem schnellen Feature-Einbau, was von den Contract-Tests sofort abgefangen wird.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Einhaltung der Registrierungsdisziplin für neue KPI-Felder in Slices 03-08.
  2. Bekannte fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 02 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S2 | Gemini | Worker-Reihenfolge-Determinismus | angenommen | In `finalizeMonteCarloChunkAccumulatorV1` umgesetzt |
| G-02-S2 | Gemini | Feld-Drift-Schutz | angenommen | In Whitelist-Assertions von `assertMonteCarloChunkResultV1` umgesetzt |
| C-01 | Claude | Aggregationsreihenfolge workerabhaengig | angenommen | global indexierte Summaries/Finalisierung umgesetzt |
| C-07 | Claude | Pfadgranularitaet unklar | angenommen mit Praezisierung | Per-Run-Skalare und Missingness umgesetzt; keine Jahrespfade |
| C-09 | Claude | Snapshot-Workerconfig fehlt | angenommen | echte 1-/2-/4-Worker und drei Chunklayouts gruen |
