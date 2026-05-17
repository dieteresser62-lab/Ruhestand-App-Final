# Simulator-/Worker-Paritaet: Umsetzungsplan

**Stand:** 2026-05-11  
**Zweck:** Arbeitsplan fuer die spaetere Umsetzung einer gezielten Absicherung von Simulator-, Worker- und Chunk-Paritaet.  
**Scope:** Monte-Carlo, Parameter-Sweep, Auto-Optimize-nahe Runner, Worker-Payloads, Ergebnisaggregation und Scenario-/Log-Shape.  
**Nicht-Scope:** Fachliche Neugestaltung der Engine, Steuerlogik, UI-Redesign, Tauri-Release-Artefakte.

## Zielbild

Serielle und worker-/chunk-basierte Rechenpfade sollen bei gleichen Inputs, Seeds und Sampling-Modi dieselben Ergebnisformen und fachlich identische Kennzahlen liefern. Abweichungen muessen entweder als erwartete Rundungs-/Sortierabweichung dokumentiert oder durch Tests verhindert werden.

Erfolgreich ist der Slice, wenn:

- Monte-Carlo-Full-Run und gesplittete Chunks dieselben Kernmetriken liefern.
- Sweep-Full-Run und gesplittete Combo-Ranges dieselben Resultate liefern.
- relevante Log- und `runMeta`-Shapes stabil bleiben.
- Auto-Optimize-Worker-Nutzung nicht durch geaenderte Runner-Contracts gebrochen wird.
- die Tests klar benennen, welcher Contract abgesichert wird.

## Relevante Dateien

| Bereich | Dateien |
| --- | --- |
| Monte-Carlo Runner | `app/simulator/monte-carlo-runner.js`, `app/simulator/mc-run-context.js`, `app/simulator/mc-run-metrics.js`, `app/simulator/mc-log-builder.js`, `app/simulator/mc-year-sampling.js` |
| Sweep Runner | `app/simulator/sweep-runner.js`, `app/simulator/simulator-sweep.js`, `app/simulator/simulator-sweep-utils.js` |
| Worker-Orchestrierung | `workers/mc-worker.js`, `app/simulator/worker-job-runner.js`, `workers/worker-pool.js` |
| Auto-Optimize | `app/simulator/auto_optimize.js`, `app/simulator/auto-optimize-worker.js`, `tests/auto-optimizer.test.mjs` |
| Bestehende Tests | `tests/worker-parity.test.mjs`, `tests/simulator-monte-carlo.test.mjs`, `tests/simulator-sweep.test.mjs`, `tests/worker-pool.test.mjs`, `tests/monte-carlo-startyear.test.mjs`, `tests/monte-carlo-sampling.test.mjs`, `tests/scenario-analyzer.test.mjs` |
| Referenzen | `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md` |

## Risiko- und Ertragsbewertung

| Thema | Aufwand | Aenderungsrisiko | Ertrag | Entscheidung |
| --- | --- | --- | --- | --- |
| Tests fuer MC-Chunk-Paritaet erweitern | mittel | niedrig | hoch | zuerst angehen |
| Tests fuer Sweep-Combo-Paritaet erweitern | niedrig-mittel | niedrig | hoch | zuerst angehen |
| Worker-Pool-Integration tiefer pruefen | mittel | mittel | mittel-hoch | nach Runner-Contracts |
| Auto-Optimize-Paritaet pruefen | mittel | mittel | mittel | nur contractnah, kein Algorithmus-Refactor |
| Runner-Code refactoren | hoch | mittel-hoch | unklar | nur bei belegter Luecke |
| UI-Orchestrierung umbauen | hoch | hoch | niedrig fuer dieses Ziel | nicht anfassen |

## Arbeitsprinzipien

1. Erst Contracts und Testluecken erfassen, dann Code aendern.
2. Runner-Tests bevorzugen DOM-freie Pfade; Browser-/UI-Tests nur bei konkretem UI-Contract.
3. Seeds, RunRanges, ComboRanges und Sampling-Modi in jedem Test explizit setzen.
4. Paritaetsvergleiche auf stabile Kennzahlen und Shape-Contracts beschraenken, nicht auf zufaellige Nebenreihenfolgen.
5. Keine produktive Runner-Logik refactoren, solange ein fehlender oder gebrochener Contract nicht reproduzierbar ist.

## Phase 0: Baseline und Arbeitsgrenze

**Ziel:** Istzustand reproduzierbar festhalten.

Arbeitsschritte:

1. `git status --short` pruefen und fremde Aenderungen notieren.
2. Bestehende Simulator-Tests fokussiert ausfuehren:
   - `node tests/run-single.mjs tests/worker-parity.test.mjs`
   - `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
   - `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
   - `node tests/run-single.mjs tests/worker-pool.test.mjs`
   - `node tests/run-single.mjs tests/auto-optimizer.test.mjs`
3. Wenn einer dieser Tests bereits fehlschlaegt, keine neuen Tests schreiben, bevor der Fehler klassifiziert ist:
   - bestehender Defekt,
   - instabile Testannahme,
   - Umgebungsthema,
   - echte Paritaetsluecke.

**Reviewzeitpunkt R0:** Nach der Baseline. Entscheidung: weiter mit Testausbau oder zuerst bestehenden Fehler isolieren.

## Phase 1: Contract-Matrix erstellen

**Ziel:** Explizit festlegen, welche Paritaet spaeter bewiesen werden soll.

Arbeitsschritte:

1. Bestehende `tests/worker-parity.test.mjs` in Contracts zerlegen:
   - MC Full-Chunk vs. Split-Chunks.
   - Sweep Full-Range vs. Split-Ranges.
   - Dynamic-Flex inkl. VPW-Logpayload.
2. Fehlende Contract-Felder erfassen:
   - `runMeta` Laenge, Run-Indizes und Logdatenform.
   - `allRealWithdrawalsSample` Zusammenfuehrung.
   - Heatmap-Bins und Jahreszeilen.
   - Pflege-/Partner-Listen in `lists`.
   - `totalTaxSavedByLossCarry` und Steuerbuffer.
3. Fuer Sweep pruefen:
   - Reihenfolge der `comboIdx`.
   - invalid-combination Shapes.
   - `p2VarianceCount`.
   - Clone-Isolation zwischen Parameterkombinationen.
4. Fuer Worker-Payloads pruefen:
   - `workers/mc-worker.js` Jobtypen `job` und `sweep`.
   - Cache-/Init-Annahmen fuer `scenarioKey`, `compiledScenario` und `dataVersion`.
   - Auto-Optimize als separaten Consumer desselben MC-`job`-Contracts ueber `auto-optimize-worker.js`.

Artefakt:

- kurze Contract-Liste als Kommentarblock oder strukturierter Helper innerhalb der betroffenen Testdatei, falls sie die Tests lesbarer macht.

**Reviewzeitpunkt R1:** Nach der Contract-Matrix. Entscheidung: Welche Contracts werden mit Tests abgesichert, welche bleiben bewusst dokumentiert.

## Phase 2: MC-Paritaet ausbauen

**Ziel:** Monte-Carlo-Chunking gegen realistische Varianten absichern.

Geplante Testfaelle:

1. **Uneven Chunk Split**
   - Full-Run z. B. 37 Runs.
   - Split in ungleiche Chunks, z. B. 0-10, 10-27, 27-37.
   - Erwartung: Aggregierte P10/P50/P90, Ruinquote, Steuerersparnis und zentrale Stress-KPIs identisch.

2. **CAPE-/Startjahr-Sampling**
   - `useCapeSampling: true` oder explizite Sampling-Konfiguration, falls stabil im Testkontext moeglich.
   - Erwartung: Full vs. Split bleibt bei `per-run-seed` identisch.
   - Fallback: Wenn CAPE-Kontext zu schwergewichtig ist, Contract in `monte-carlo-startyear.test.mjs` belassen und im Plan als bewusst ausgelassen markieren.

3. **Care-/Partner-Listen**
   - Pflege oder Partneroptionen aktivieren.
   - Erwartung: Listenaggregation und Trigger-Zaehler bleiben split-unabhaengig.

4. **Logshape-Stabilitaet**
   - `logIndices` fuer mehrere Runs ueber Chunkgrenzen hinweg setzen.
   - Erwartung: `runMeta.index`, `logDataRows`, VPW-/Payout-Felder und Todesfall-/Ruin-Zeilen bleiben strukturell identisch.

Moegliche Dateien:

- bevorzugt `tests/worker-parity.test.mjs`
- nur bei zu grosser Datei: neue Datei `tests/simulator-worker-parity-extended.test.mjs`

**Reviewzeitpunkt R2:** Nach MC-Testausbau, bevor Codefixes erfolgen. Entscheidung: Tests laufen gruen oder zeigen reproduzierbare Luecke.

## Phase 3: Sweep-Paritaet ausbauen

**Ziel:** Parameter-Sweep gegen Chunking, invalid Kombinationen und Clone-Nebenwirkungen absichern.

Geplante Testfaelle:

1. **Uneven Combo Split**
   - 5-7 Parameterkombinationen.
   - Split nicht entlang gleicher Groessen.
   - Erwartung: Ergebnislaenge, `comboIdx`, Metriken und `p2VarianceCount` identisch.

2. **Invalid Combination Shape**
   - Mindestens eine ungueltige Dynamic-Flex- oder Quantile-Kombination.
   - Erwartung: Full und Split liefern dieselbe invalid-Metrikstruktur und denselben Grund.

3. **Input-Isolation**
   - Nach `runSweepChunk` muss `baseInputs` unveraendert bleiben.
   - Erwartung: kein Leak von `taxState`, Portfoliofeldern, Partnerfeldern oder Sweep-Overrides.

4. **Steuer-/LossCarry-Metrik**
   - Szenario mit steuerlich relevanten Depotwerten.
   - Erwartung: `taxSavedByLossCarry` bleibt in Sweep-Metriken split-unabhaengig.

**Reviewzeitpunkt R3:** Nach Sweep-Testausbau. Entscheidung: Nur Testerganzung oder gezielter Fix in `sweep-runner.js`/Aggregation.

## Phase 4: Worker-Pool- und Auto-Optimize-Contracts pruefen

**Ziel:** Sicherstellen, dass echte Worker-Payloads die Runner-Contracts nicht anders benutzen als die DOM-freien Tests.

Arbeitsschritte:

1. `tests/worker-pool.test.mjs` gegen Runner-Contracts lesen.
2. Pruefen, ob `job`, `sweep` und der Auto-Optimize-MC-Consumer mindestens Shape-Assertions haben:
   - MC: `buffers`, `totals`, `elapsedMs`.
   - Sweep: `results`, `p2VarianceCount`.
   - Auto-Optimize: `aggregatedResults`, `failCount` und Merge-Paritaet gegen seriellen MC-Pfad.
3. Nur falls Luecke sichtbar:
   - kleine Assertion ergaenzen, die Payload-Shape sichert.
   - keine echten Performance- oder UI-Tests daraus machen.
4. Auto-Optimize nur contractnah absichern:
   - keine Aenderung am Suchalgorithmus.
   - keine Erwartung auf exakt gleiche Champion-Auswahl, wenn Sortier-/Scoring-Tie nicht stabil dokumentiert ist.

**Reviewzeitpunkt R4:** Nach Worker-/Auto-Optimize-Check. Entscheidung: Abschluss moeglich oder konkrete Contract-Luecke fixen.

## Phase 5: Gezielte Fixes nur bei belegter Luecke

**Ziel:** Falls Tests rot werden, minimalen Fix im passenden Modul setzen.

Moegliche Fix-Kategorien:

| Befund | Wahrscheinlicher Ort | Fix-Richtung |
| --- | --- | --- |
| Full vs. Split unterscheidet sich bei Seeds | `mc-run-context.js`, `monte-carlo-runner.js`, `sweep-runner.js` | Seed aus globalem Run-/Combo-Index ableiten, nicht aus Chunk-Position |
| Listen fehlen nach Merge | `simulator-monte-carlo.js`, Test-Merge-Helper, `mc-run-metrics.js` | Aggregationspfad vervollstaendigen |
| Logshape unterscheidet sich | `mc-log-builder.js`, `mc-run-metrics.js` | additive Felder stabilisieren, keine Umbenennung |
| Sweep mutiert Inputs | `sweep-runner.js`, `simulator-sweep-utils.js` | Clone-Grenze verstaerken |
| Worker-Shape weicht vom Runner ab | `workers/mc-worker.js`, `worker-job-runner.js` | Payload-/Result-Contract angleichen |

**Reviewzeitpunkt R5:** Nach jedem Fix einzeln. Kein zweiter Fix, bevor der erste durch fokussierte Tests bestaetigt ist.

## Phase 6: Dokumentationsabgleich

**Ziel:** Neue oder geaenderte Contracts auffindbar machen.

Zu pruefen:

1. `docs/reference/SIMULATOR_MODULES_README.md`
   - Nur aktualisieren, wenn Runner-/Worker-Contracts oder Modulzustaendigkeiten geaendert wurden.
2. `docs/reference/TECHNICAL.md`
   - Nur aktualisieren, wenn Architektur, Worker-Orchestrierung oder Sampling-Contract geaendert wurde.
3. `tests/README.md`
   - Aktualisieren, wenn neue Testdatei entsteht oder Testabdeckung wesentlich erweitert wird.
4. `docs/internal/PROJEKTUEBERSICHT.md`
   - Nur aktualisieren, wenn die Risikobewertung oder Review-Fokus-Liste angepasst wird.

**Reviewzeitpunkt R6:** Vor Abschluss. Entscheidung: Doku-Aenderung erforderlich oder bewusst nicht.

## Contract-Matrix

**Stand Phase 1:** 2026-05-11  
**Status:** erstellt, noch nicht per Baseline-Testlauf verifiziert.

| Contract | Produktiver Pfad | Bestehende Absicherung | Luecke / naechster Testfokus |
| --- | --- | --- | --- |
| MC-Run-Seeding ist chunkunabhaengig | `runMonteCarloChunk()` mit `runRange.start` und `rngMode: per-run-seed` | `tests/worker-parity.test.mjs` Test 1 vergleicht Full-Run mit 2 gleich grossen Chunks | ungleiche Chunks und mehr als 2 Chunks fehlen |
| MC-Fixed-Size-Buffers werden nach globalem Run-Index gemerged | `simulator-monte-carlo.js` `mergeResult`: `buffers.*.set(..., start)` | Test 1 merged dieselben Buffer manuell | Shape-Assertion fuer alle Buffernamen fehlt; Safety-Stage-Buffer/Totals sind im Test nicht vollstaendig abgedeckt |
| MC-Heatmap wird additiv gemerged | `mergeHeatmap()` in `simulator-monte-carlo.js` | Test 1 nutzt denselben Merge-Ansatz | keine explizite Pruefung der Heatmap-Gesamtsummen oder Jahreszeilen |
| MC-Totals werden additiv gemerged | `simulator-monte-carlo.js` summiert `failCount`, Pflege-, Safety-, Shortfall- und Steuerzaehler | Test 1 prueft `failCount`, `pflegeTriggeredCount`, einige Aggregate | Safety-Stage-Totals, `totalTaxSavedByLossCarry` und mehrere Shortfall-Zaehler sollten explizit verglichen werden |
| MC-Listen werden append-only gemerged | `appendArray()` fuer Pflege-/Partner-/Care-Listen und `allRealWithdrawalsSample` | Test 1 uebernimmt Listen in Aggregates | aktive Pflege-/Partnerfaelle und Sample-Laenge/Reihenfolge fehlen |
| MC-WorstRuns bleiben chunkunabhaengig | `pickWorstRun(worstRun, result.worstRun)` und `pickWorstRun(worstRunCare, result.worstRunCare)` | indirekt ueber Aggregate, kein direkter Assert | direkter Tie-Breaker-/WorstRun-Vergleich fehlt |
| MC-`runMeta` und Scenario-Logs bleiben stabil | Worker-Merge iteriert `result.runMeta` und uebergibt an `ScenarioAnalyzer` | Test 3 prueft Dynamic-Flex VPW-Horizons fuer Run 0 | mehrere `logIndices` ueber Chunkgrenzen und Shape-Felder fehlen |
| MC-CAPE-/Startjahr-Sampling bleibt splitunabhaengig | `mc-year-sampling.js` und `mc-run-context.js` | `monte-carlo-startyear.test.mjs` prueft Sampling isoliert | kein Full-vs-Split-Paritaetstest mit aktivem Sampling |
| Sweep-Combo-Seeding ist chunkunabhaengig | `runSweepChunk()` leitet Seeds aus `comboIdx`/Run ab | `tests/worker-parity.test.mjs` Test 2 vergleicht 3 Combos mit 2 Splits | ungleiche groessere Combo-Ranges fehlen |
| Sweep-Results werden nach `comboIdx` gemerged | `simulator-sweep.js` schreibt `sweepResults[item.comboIdx]` | Test 2 sortiert Kombi-Ergebnisse nach `comboIdx` | produktiver Worker-Merge prueft nicht auf fehlende Sparse-Slots |
| Sweep-invalid-Combination-Shape bleibt stabil | `sweep-runner.js` `makeInvalidSweepMetrics()` | `simulator-sweep.test.mjs` prueft einzelne Invalid-Faelle | kein Full-vs-Split-Vergleich mit Invalid-Kombinationen |
| Sweep-Input-Isolation bleibt erhalten | `buildSweepInputs()`, `deepClone()`, `withNoLSWrites()` | `simulator-sweep.test.mjs` deckt Clone-/Whitelist-Logik ab | kein Paritaetstest, der Mutation von `baseInputs` nach `runSweepChunk()` explizit ausschliesst |
| Sweep-`p2VarianceCount` ist chunkadditiv | `runSweepChunk()` gibt `{ results, p2VarianceCount }` zurueck | Test 2 addiert `p2VarianceCount` aus Split-Chunks | produktiver `runSweepWithWorkers()` verwirft `p2VarianceCount`; klaeren, ob nur Telemetrie/Testcontract oder Produktcontract |
| Worker-MC-Payload-Shape passt zum Runner | `workers/mc-worker.js` Jobtyp `job` ruft `runMonteCarloChunk()` | `worker-pool.test.mjs` prueft Mock-Shape `buffers`, `totals`, `elapsedMs` | Mock prueft nicht echte Buffer-/Totals-Namen |
| Worker-Sweep-Payload-Shape passt zum Runner | `workers/mc-worker.js` Jobtyp `sweep` ruft `runSweepChunk()` nach `sweep-init` | `worker-pool.test.mjs` prueft Mock-Shape `results`, `p2VarianceCount` | echter Worker-Pfad und Cache-Fehlerpfad sind nicht paritaetsnah abgesichert |
| Auto-Optimize nutzt MC-Worker-Contracts stabil | `auto-optimize-worker.js` verwendet denselben `workers/mc-worker.js` Jobtyp `job` und merged MC-Buffers/Heatmap/Totals/Listen selbst | `auto-optimizer.test.mjs` vorhanden | Phase 4 sollte Auto-Optimize als zweiten MC-Merge-Consumer pruefen; die technische Referenz wurde in Phase 4 auf diesen Stand abgeglichen |

## Umsetzungsprotokoll

| Datum | Phase | Status | Ergebnis | Tests | Review |
| --- | --- | --- | --- | --- | --- |
| 2026-05-11 | Phase 0: Baseline | abgeschlossen | Fokussierte Simulator-/Worker-Baseline ist gruen. Arbeitsbaum enthielt vor Teststart nur Doku-Aenderungen aus Planung/Projektuebersicht. Git meldete weiterhin fehlenden Zugriff auf `C:\Users\Diete\.config\git\ignore`, ohne die Tests zu blockieren. | `node tests/run-single.mjs tests/worker-parity.test.mjs`; `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`; `node tests/run-single.mjs tests/simulator-sweep.test.mjs`; `node tests/run-single.mjs tests/worker-pool.test.mjs`; `node tests/run-single.mjs tests/auto-optimizer.test.mjs` | R0: Weiter mit Phase 2, MC-Paritaet ausbauen |
| 2026-05-11 | Phase 1: Contract-Matrix | abgeschlossen | Bestehende Contracts, Abdeckung und Luecken dokumentiert. Wichtigste naechste Punkte: ungleiche MC-Chunks, vollstaendige MC-Totals/Listen, Sweep-invalid-Full-vs-Split, Klaerung `p2VarianceCount` im produktiven Sweep-Worker-Pfad, Auto-Optimize als zweiten MC-Merge-Consumer pruefen. | keine Tests ausgefuehrt; reine Analyse/Doku | R1: Weiter mit Phase 2 nach Baseline oder auf Nutzerwunsch Phase 0 nachholen |
| 2026-05-11 | Phase 2: MC-Paritaet ausbauen | abgeschlossen | `tests/worker-parity.test.mjs` erweitert um gemeinsame MC-Merge-Helper, ungleiche 3-Chunk-Paritaet fuer 37 Runs, vollstaendigere Buffer-/Totals-/Listen-/Heatmap-/WorstRun-Pruefungen und Logshape-Paritaet ueber Chunkgrenzen mit `logIndices` `[0, 8, 24, 36]`. Keine produktive Codeaenderung erforderlich. | `node tests/run-single.mjs tests/worker-parity.test.mjs`; `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs` | R2: Weiter mit Phase 3, Sweep-Paritaet ausbauen |
| 2026-05-11 | Phase 3: Sweep-Paritaet ausbauen | abgeschlossen | `tests/worker-parity.test.mjs` erweitert um Sweep-Vergleichshelper, ungleiche Combo-Splits mit gueltigen und invaliden Kombinationen, Invalid-Reason-Paritaet, `p2VarianceCount`-Additivitaet und explizite `baseInputs`-Non-Mutation. Dynamic-Flex-Invalid-Shape ueber Split-Ranges zusaetzlich abgesichert. Keine produktive Codeaenderung erforderlich. | `node tests/run-single.mjs tests/worker-parity.test.mjs`; `node tests/run-single.mjs tests/simulator-sweep.test.mjs` | R3: Weiter mit Phase 4, Worker-Pool- und Auto-Optimize-Contracts pruefen |
| 2026-05-11 | Phase 4: Worker-Pool- und Auto-Optimize-Contracts pruefen | abgeschlossen | Neue Datei `tests/auto-optimize-worker-contract.test.mjs` prueft den Auto-Optimize-MC-Worker-Merge mit einem Mock-Worker, der echte `runMonteCarloChunk()`-Jobs ausfuehrt, gegen den seriellen MC-Aggregatpfad. `docs/reference/TECHNICAL.md`, `docs/reference/SIMULATOR_MODULES_README.md` und `tests/README.md` auf den aktuellen Auto-Optimize-Worker-Contract aktualisiert. Keine produktive Codeaenderung erforderlich. | `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`; `node tests/run-single.mjs tests/worker-pool.test.mjs`; `node tests/run-single.mjs tests/auto-optimizer.test.mjs` | R4: Weiter mit Phase 6, Dokumentationsabgleich und Abschlussvalidierung; Phase 5 ist nicht erforderlich, da keine Paritaetsluecke gefunden wurde |
| 2026-05-11 | Phase 6: Doku-Abgleich und Abschlussvalidierung | abgeschlossen | Doku-Abgleich ohne verbliebene `optimize-init`/`optimize-batch`-Widersprueche. `tests/balance-annual-cape.test.mjs` gegen Zeitdrift stabilisiert, weil der gespeicherte CAPE-Fallback vom festen Datum `2024-10-01` am 2026-05-11 aelter als die 18-Monats-Grenze war. `npm test` konnte wegen fehlender lokaler npm-CLI nicht starten; der direkte Test-Runner aus `package.json` lief erfolgreich. | `node tests/run-single.mjs tests/balance-annual-cape.test.mjs`; `node tests/run-tests.mjs` mit 1508 Assertions, 0 Fehler | R6: Slice abgeschlossen |

## Testplan

### Fokussierte Tests waehrend der Umsetzung

```bash
node tests/run-single.mjs tests/worker-parity.test.mjs
node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs
node tests/run-single.mjs tests/simulator-sweep.test.mjs
node tests/run-single.mjs tests/worker-pool.test.mjs
node tests/run-single.mjs tests/auto-optimizer.test.mjs
node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs
node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs
node tests/run-single.mjs tests/scenario-analyzer.test.mjs
```

### Abschlussvalidierung

```bash
npm test
```

### Zusaetzliche Validierung nur bei EngineAPI-Aenderungen

```bash
npm run build:engine
npm test
```

## Review-Checkliste fuer die spaetere Umsetzung

- [ ] Sind alle neuen Tests deterministisch?
- [ ] Nutzen alle Paritaetstests explizite Seeds?
- [ ] Wird nach globalem Run-/Combo-Index verglichen statt nach Chunkposition?
- [ ] Sind Toleranzen nur fuer numerische Floating-Point-Werte verwendet?
- [ ] Werden Shape-Contracts mit klaren Feldnamen geprueft?
- [ ] Bleiben UI-Dateien unberuehrt, sofern kein UI-Contract betroffen ist?
- [ ] Wurden keine generierten Artefakte (`engine.js`, `dist/`, `RuheStandSuite.exe`) manuell geaendert?
- [ ] Wurde dokumentiert, wenn nur fokussierte Tests statt `npm test` liefen?
- [ ] Wurde Doku nur dort geaendert, wo sich Contract oder Architektur tatsaechlich geaendert haben?

## Erwarteter Umsetzungsumfang

Minimaler erwarteter Umfang:

- Erweiterung von `tests/worker-parity.test.mjs` um 2-4 gezielte Paritaetsfaelle.
- Eventuell kleine Shape-Assertions in `tests/worker-pool.test.mjs`.
- Keine produktiven Codeaenderungen, falls alle neuen Tests direkt gruen laufen.

Moeglicher erweiterter Umfang:

- gezielte Fixes in `monte-carlo-runner.js`, `mc-run-metrics.js`, `sweep-runner.js` oder `workers/mc-worker.js`, falls reproduzierbare Paritaetsluecken auftreten.
- Doku-Sync in `docs/reference/SIMULATOR_MODULES_README.md` und `tests/README.md`, falls neue Testdateien oder Contracts entstehen.

## Abbruch- und Eskalationskriterien

Die Umsetzung sollte pausiert und neu bewertet werden, wenn:

- Baseline-Tests bereits ohne Aenderungen fehlschlagen und der Fehler nicht klar simulatorbezogen ist.
- ein Fix eine fachliche Engine- oder Steuerentscheidung erfordert.
- Paritaet nur durch groessere Refactors in Hot-Path-Code erreichbar scheint.
- Auto-Optimize-Champion-Auswahl instabil ist, aber keine fachliche Fehlentscheidung nachweisbar ist.

In diesen Faellen zuerst Befund dokumentieren und einen kleineren Folge-Slice definieren.
