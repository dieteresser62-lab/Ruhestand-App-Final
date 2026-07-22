# Slice 06: Sampling-Praezedenz und Diagnostik

**Stand:** 2026-07-22
**Status:** Implementierung abgeschlossen; Gemini-/Nutzerreview ausstehend
**Feature-Branch:** `codex/simulator-monte-carlo-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend  
**Arbeitsplan:** [SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md](./SIMULATOR_MONTE_CARLO_HARDENING_PLAN.md)  
**Abhaengigkeit:** Slices 01-02 und Entscheidung D-05

## Ziel

CAPE, Filter, Recency, Regime, Blockmethoden und Tail-Risk erhalten einen
versionierten, reproduzierbaren Praezedenzvertrag. Der tatsaechlich gezogene
Pfad wird diagnostizierbar, ohne grosse Rohdaten standardmaessig in der UI zu
halten.

## Akzeptanzkriterien

- Fixed-Block beginnt den vollstaendigen ersten Block am CAPE-Startrecord;
  zulaessige Startindices garantieren, dass der Block innerhalb der
  freigegebenen Datenfolge liegt.
- Stationary Bootstrap initialisiert seinen ersten Block ebenfalls am
  CAPE-Startrecord und wendet erst danach seine Wiederanlaufwahrscheinlichkeit
  an. Regime-Markov initialisiert das Startregime aus diesem Record; Regime-IID
  darf ab Jahr 2 unabhaengig ziehen.
- CAPE und Startgewichtung koennen nicht gleichzeitig unbemerkt gegensaetzliche
  Quellen steuern; ignorierte Optionen werden deaktiviert oder als Warnung
  ausgewiesen.
- Seed-Ableitung bleibt unabhaengig von Workerzahl und Chunking.
- Filter-/Recency-/Regime-/Tail-Risk-Reihenfolge ist als Tabelle dokumentiert.
- Diagnostik nennt mindestens Methode, Startquelle, Anzahl gezogener Jahre,
  Regime-/Tail-Risk-Zaehler und Datenversion.
- Alle Methoden bestehen deterministische Golden Cases und Worker-Paritaet.
- Erwartete Snapshot-Aenderungen werden vor Annahme als Contractaenderung zur
  Review vorgelegt; unerwartete Abweichungen stoppen den Slice.
- Ein Post-Slice-06-Snapshot und Delta-Ledger dokumentieren erwartete
  Pfadaenderungen; die Pre-Hardening-Referenz bleibt unveraendert.

## Scope

- `MonteCarloSamplingContractV1`,
- Startjahres- und Jahressampling,
- schlanke Samplingdiagnostik im Chunkresultat,
- UI-Hinweis auf wirksame/ignorierte Optionen,
- Contract-, Statistik- und Paritaetstests.

## Nicht-Scope

- keine empirische Wahl der "besten" Samplingmethode,
- keine Aenderung historischer Renditedaten,
- keine Tail-Risk-Kalibrierung oder Engine-Aenderung.

## Geplante Dateien vor Coding

- `app/simulator/mc-year-sampling.js`,
- `app/simulator/monte-carlo-runner.js`,
- `app/simulator/mc-run-context.js`,
- `app/simulator/monte-carlo-chunk-result.js`,
- `app/simulator/monte-carlo-ui.js`,
- optional `app/simulator/simulator-monte-carlo.js`,
- Tests/Fixtures.

Produktive Programmdateien: **maximal 6**.

## Diff-Risiko vor Coding

- Branch vor Coding: `codex/simulator-monte-carlo-gap-plan`.
- Status vor Coding: ausschliesslich bereits vorgefundene unversionierte
  Playwright-Paketdateien unter `node_modules/`; keine versionierte Aenderung.
- Geplante Programmdateien:
  - `app/simulator/mc-year-sampling.js`,
  - `app/simulator/monte-carlo-runner.js`,
  - `app/simulator/mc-run-context.js`,
  - `app/simulator/monte-carlo-chunk-result.js`,
  - `app/simulator/monte-carlo-ui.js`,
  - optional `app/simulator/simulator-monte-carlo.js`.
- Geplante Test-/Fixturedateien: fokussierter Samplingvertrag, bestehende
  Startjahr-/Runner-/Chunk-/Worker-Paritaetstests sowie
  `tests/fixtures/monte-carlo-measurement/post-slice-06-v1.json` und das
  Delta-Ledger.
- Aenderungstiefe: riskant; identische Seeds koennen nach einer bewusst
  geaenderten Praezedenz andere Pfade erzeugen.
- Gefaehrdete Tests/Snapshots: Sampling, Startjahr, Stationary Bootstrap,
  Tail-Risk, Worker-Paritaet, Backtest nur bei ungewollter Kopplung.
- Nicht anfassen: Daten, Engine, KPI-Semantik ausser Diagnostik.
- Rollback: `git checkout -- app/simulator/mc-year-sampling.js
  app/simulator/monte-carlo-runner.js app/simulator/mc-run-context.js
  app/simulator/monte-carlo-chunk-result.js app/simulator/monte-carlo-ui.js
  app/simulator/simulator-monte-carlo.js`; neue Test-/Fixturedateien nur nach
  Freigabe entfernen. Bei unerwarteter Snapshot-, Backtest- oder
  FlowDelta-Abweichung sofort stoppen und Diff dokumentieren.

## Geplante Tests

- Matrix aus Samplingmethode x CAPE x Filter x Recency x Regime x Tail-Risk,
- deterministische Startjahr-/Folgejahr-Golden-Cases,
- zusammenhaengender erster Fixed-/Stationary-Block und Regimeinitialisierung,
- Seed-/Chunk-/Workerinvarianz,
- Fehlerfaelle bei leerer Kandidatenmenge,
- bestehende Sampling-, Startjahr-, Worker-Paritaetstests und `npm test`.

## Durchgefuehrte Aenderungen

- `MonteCarloSamplingContractV1` loest die Samplingoptionen einmal je Chunk auf
  und exportiert Methode, wirksame Startquelle, ignorierte Optionen, Warnungen,
  Kandidatenzahl sowie die methodenspezifischen Jahr-1-Regeln.
- Die wirksame Reihenfolge ist fest und maschinenlesbar:

  | Rang | Stufe | Wirkung |
  |---:|---|---|
  | 1 | `estimated_history_exclusion` | entfernt geschaetzte historische Records vor jeder Kandidatenbildung |
  | 2 | `cape_or_start_weighting` | wirksames CAPE ersetzt FILTER/RECENCY; fehlender CAPE-Wert oder leere CAPE-Menge faellt mit Warnung auf die angeforderte Gewichtung zurueck |
  | 3 | `sampling_method` | Fixed, Stationary, Markov oder IID bestimmt die Folgejahre |
  | 4 | `conditional_stress_override` | ersetzt den gezogenen historischen Record waehrend des Stressfensters; ein noch offener methodischer Initialrecord bleibt danach erhalten |
  | 5 | `tail_risk_overlay` | wird zuletzt nicht-mutierend auf den wirksamen Jahresrecord angewandt |

- Fixed-Block akzeptiert den letzten noch vollstaendig passenden Blockstart und
  setzt ab dem gezogenen Startrecord sequenziell fort. Stationary Bootstrap
  verwendet den Startrecord ohne vorgelagerte Restart-Ziehung. Markov
  initialisiert dessen Regime; IID zieht erst ab Jahr 2 unabhaengig.
- CAPE-Kandidaten fallen im neuen Contract nicht mehr still auf alle Jahre
  zurueck. Bei wirksamem CAPE werden FILTER/RECENCY in Start- und
  Folgejahrsampling ignoriert und diagnostiziert; der bestehende UI-Hinweis ist
  durch einen Orchestrierungstest abgesichert.
- `MonteCarloSamplingDiagnosticsV1` zaehlt angeforderte Runs, gezogene Jahre,
  Startjahre, historische Jahre, Samplingquellen, Regime,
  Stationary-Neustartgruende und Tail-Risk-Wirkung. Annual-Data-/Regime-Hashes
  identifizieren den Datenstand. Der Chunkvertrag validiert und merged die
  Zaehler unabhaengig von Chunk- und Workerreihenfolge.
- Direktlauf und Worker-Orchestrierung geben dieselbe Top-Level-Diagnostik aus.
- Tatsaechlich geaenderte produktive Dateien: `app/shared/cape-utils.js`,
  `app/simulator/mc-year-sampling.js`,
  `app/simulator/stationary-bootstrap-sampler.js`,
  `app/simulator/monte-carlo-runner.js`,
  `app/simulator/monte-carlo-chunk-result.js` und
  `app/simulator/simulator-monte-carlo.js` (6/6).
- `post-slice-06-v1.json` und zwei Slice-06-Eintraege im Delta-Ledger halten
  den erwarteten Pfad- und Diagnostikwechsel fest; fruehere Snapshots blieben
  unveraendert.

## Ausgefuehrte Tests

- Neuer Samplingvertrag sowie betroffene Sampling-, Startjahr-, Stationary-,
  Runner-, Chunk-, UI-, Mess-, Worker- und Worker-Paritaetssuiten:
  **1515/1515 Assertions gruen**.
- Historische Backtest-Contract-, Runner- und Metriksuiten als
  Entkopplungsnachweis: **588/588 Assertions gruen**.
- `npm test`: **6550/6551 Assertions gruen**. Einzige Abweichung ist der bereits
  vor Slice 06 dokumentierte Architektur-Linkfehler mit sechs toten Links auf
  zwei fehlende Forschungsdokumente. Keine neue unerwartete Snapshot-,
  Backtest-, Worker- oder FlowDelta-Abweichung.

## Abweichungen vom Plan

- `mc-run-context.js` und `monte-carlo-ui.js` mussten nicht geaendert werden:
  die Vertragsaufloesung gehoert in den Runner, und der sichtbare CAPE-
  Vorranghinweis existierte bereits. Stattdessen waren die strengere
  CAPE-Kandidatenbildung in `cape-utils.js` und die Jahr-1-Semantik im
  Stationary-Sampler erforderlich.
- `simulator-monte-carlo.js` wurde wie geplant optional angepasst, damit die
  Worker-Orchestrierung die Samplingdiagnostik auf Top-Level weiterreicht.

## Offene Risiken

- Die fachlich sichtbare Jahr-1-Regel veraendert bei identischen Seeds bewusst
  die Marktpfade. Golden Cases, Post-Slice-Snapshot und Delta-Ledger erklaeren
  die Abweichung; ihre externe Review-Freigabe steht aus.
- Die Diagnose ist auf Zaehler ueber die endliche historische Jahresmenge
  begrenzt und speichert keine Jahrespfade. Ein spaeterer Exportvertrag muss
  entscheiden, welche dieser Felder dauerhaft nach aussen gehoeren.

## Rueckdokumentation und Freigabe

Praezedenztabelle, Diagnostikfelder, Dateiscope, Tests und bewusst geaenderter
Snapshot sind im Slice und Hauptplan dokumentiert. Implementierung:
abgeschlossen. Gemini-/Nutzerreview und Freigabe: ausstehend; Codex erteilt
keine eigene Freigabe und erstellt keinen Commit.

## Review-Feedback von Gemini

### 1. Systematische Prüfdimensionen
* **Korrektheit:** Slice 06 löst P0-GAP MC-06 vollständig.
  - **MC-06 (Sampling-Präzedenz & CAPE-Startblock):** `resolveMonteCarloSamplingContractV1` in `mc-year-sampling.js` stellt sicher, dass CAPE, FILTER, RECENCY, REGIME und TAIL-RISK eine eindeutige Präzedenz besitzen. Der 1. gezogene Record (`startYearIndex`) wird als Jahr 1 verwendet, und der 1. Block von `block` sowie `stationary_bootstrap` beginnt exakt an dieser Stelle.
  - **Ziehungsdiagnostik:** `MonteCarloSamplingDiagnosticsV1` erfasst alle tatsächlich gezogenen Jahre, Regime und Ziehungsquellen (`initial_start`, `fixed_block_restart`, `stationary_restart`, `conditional_stress`, etc.) ohne chunk- oder workerabhängige Abweichungen.
* **Vertragstreue:** `MonteCarloSamplingDiagnosticsV1` ist Bestandteil von `MonteCarloChunkResultV1` und wird bei der Merge-Logik deterministisch aggregiert.
* **Fehlerbehandlung:** 58 dedizierte Contract-Tests in `tests/monte-carlo-sampling-contract.test.mjs` und 23 Tests in `tests/stationary-bootstrap-sampler.test.mjs` belegen Fail-Closed-Verhalten bei ungeeigneten CAPE-Kandidaten (z. B. unvollständige Blöcke am Datenende).
* **Seiteneffekte:** Punktgenau **6 produktive Programmdateien** verändert (`cape-utils.js`, `mc-year-sampling.js`, `monte-carlo-chunk-result.js`, `monte-carlo-runner.js`, `simulator-monte-carlo.js`, `stationary-bootstrap-sampler.js`). Alle Dokumentationen (`README.md`, `TECHNICAL.md`, `SIMULATOR_MODULES_README.md`, Hauptplan, GAP-Analyse, Slice-Dokument) wurden konsistent aktualisiert.
* **Was könnte brechen? / Größtes Restrisiko:**
  1. Kombination sehr langer Blockgrößen mit engen Historienfiltern kann zum gewollten Fail-Closed führen.

### 2. Nummerierte Findings
* **Finding G-01-S6 (Autokorrelations-Erhalt beim CAPE-Startblock):** Sowohl Fixed-Block als auch Stationary-Bootstrap starten ihren ersten zusammenhängenden Block am CAPE-Startrecord, womit Autokorrelationsbrüche im Übergang von Jahr 1 zu Jahr 2 eliminiert wurden.
* **Finding G-02-S6 (Vollständige Ziehungsdiagnostik):** Das Outcome entkoppelt Ziehungsursachen (`initial_start`, `stationary_restart`, `conditional_stress`) und macht jede gezogene Datenreihe im Run nachvollziehbar.

### 3. Pre-Mortem (3 Monate in die Zukunft)
Wahrscheinlichste Ursache für Probleme in 3 Monaten wäre eine ungewöhnliche Filter- und Blockgrößenkombination im UI, die mangels ausreichender voller Blöcke am Datenende den Fehler `MC_SAMPLING_EMPTY_FULL_BLOCK_CANDIDATE_SET` auslöst. Geschützt durch fail-closed Validierungstests in `monte-carlo-sampling-contract.test.mjs`.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  1. Kombination sehr langer Blockgrößen mit engen Historienfiltern kann zum gewollten Fail-Closed führen.
  2. Bekannte fremde Link-Abweichung (`architecture-evidence.test.mjs`) bleibt separiert.

## Review-Feedback von Claude

Ausstehend; Pflichtstruktur gemaess `SLICE_EXECUTION_RULES.md` verwenden.

## Review-Antworten von Codex

Planfindings wurden in Revision 1 eingearbeitet; Details stehen in der
Entscheidungstabelle. Slice 06 wurde umgesetzt und von Gemini freigegeben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01-S6 | Gemini | Autokorrelations-Erhalt beim CAPE-Startblock | angenommen | Erster Block startet exakt am CAPE-Record |
| G-02-S6 | Gemini | Vollständige Ziehungsdiagnostik | angenommen | `MonteCarloSamplingDiagnosticsV1` im Result-Contract integriert |
| G-04 | Gemini | CAPE-Jahr bricht Blockautokorrelation | angenommen | erster Block startet am CAPE-Record |
| C-04 | Claude | Snapshotdrift | angenommen | Post-Slice-Snapshot/Delta-Ledger ergaenzt |
