# Slice 07 - Kanonischer Sweep-Request und Sampling

**Stand:** 2026-07-27  
**Status:** freigegeben - Re-Review am 2026-07-27 erfolgreich durchgeführt  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini)  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** SWP-02, SWP-06, SWP-07 und SWP-11  
**Prioritaet:** P1

Der Parameter-Sweep verwendet einen versionierten, DOM-freien Request, der
aus dem kanonischen Monte-Carlo-Parametervertrag abgeleitet wird. UI,
serieller Lauf und Worker validieren damit dieselben Werte. Sweep und Monte
Carlo verwenden denselben expliziten Samplingdispatch; unbekannte Methoden
werden abgewiesen. Startjahresmodus, Filter, CAPE-/Recency-Option,
Estimated-History-Ausschluss und Seed bleiben bis in Ergebnisprovenienz und
Samplingdiagnose nachvollziehbar.

## Akzeptanzkriterien

- O-11 ist gruen.
- `stationary` und `regime_markov` laufen nachweislich durch verschiedene
  Sampler.
- Ein Sweep mit genau einer Kombination stimmt bei gleichem Request und Seed
  mit dem entsprechenden kanonischen MC-Samplingpfad ueberein.
- Seed 0 ist reproduzierbar und unterscheidet sich von Seed 12345.
- Alle gezogenen Jahre erfuellen Startfilter und
  `excludeEstimatedHistory`.
- Ungueltige Dauer, Runzahl, Blocklaenge, Methode oder Seed werden im
  seriellen und Workerpfad mit demselben strukturierten Fehler abgewiesen.
- Ergebnisprovenienz nennt Requested und Applied Samplingmethodik,
  normalisierte Parameter, Requestversion und Samplingdiagnose.
- Bestehende Samplingpraezedenz und Monte-Carlo-Ergebnissemantik bleiben
  unveraendert.

## Scope

### Programmdateien

- `app/simulator/simulator-sweep.js`
- `app/simulator/sweep-runner.js`
- `app/simulator/monte-carlo-parameters.js`
- `app/simulator/mc-year-sampling.js`
- `app/simulator/monte-carlo-runner.js`
- `workers/mc-worker.js`

### Tests und Dokumentation

- `tests/simulator-sweep.test.mjs`
- `tests/monte-carlo-parameters.test.mjs`
- `tests/monte-carlo-sampling-contract.test.mjs`
- `tests/mc-worker-contract.test.mjs`
- vorhandener `tests/worker-parity.test.mjs`
- vorhandene Startjahr-, Sampling-, Stationary-Bootstrap-, MC-Snapshot- und
  Browsertests
- `docs/internal/SLICE_SUITE_DATA_07_SWEEP_REQUEST_SAMPLING.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Nicht-Scope

- keine Partner-, Witwen-, Pflege- oder Langlebigkeitskorrektur des Sweeps;
- kein Tail-Risk-Overlay im Sweep;
- keine Neudefinition von Drawdown-, Outcome- oder Rankingmetriken;
- keine Aenderung der Random-Stream-Aufteilung; die Durchsetzung des
  effektiven Jahresuniversums ist wegen des Akzeptanzkriteriums „alle
  gezogenen Jahre erfuellen Filter und Estimated-Ausschluss" ausdruecklich
  Teil dieses Slice;
- keine Optimizerkorrektur;
- keine manuelle Aenderung von `engine.js`;
- keine Aenderung von `dist/` oder `RuheStandSuite.exe`.

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-26 vor Anlage dieser Slice-MD.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber. Die direkten
Abhaengigkeiten Slice 03 und Slice 05 sind freigegeben und lokal committed.
Der Branch besitzt keinen Upstream und ist nur lokal.

## Diff-Risiko

```text
Geplante Dateien:
- app/simulator/simulator-sweep.js
- app/simulator/sweep-runner.js
- app/simulator/monte-carlo-parameters.js
- app/simulator/mc-year-sampling.js
- app/simulator/monte-carlo-runner.js
- workers/mc-worker.js
- tests/simulator-sweep.test.mjs
- tests/monte-carlo-parameters.test.mjs
- tests/monte-carlo-sampling-contract.test.mjs
- tests/worker-parity.test.mjs
- docs/internal/SLICE_SUITE_DATA_07_SWEEP_REQUEST_SAMPLING.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- riskant

Gefaehrdete bestehende Tests:
- Sweep-Runner und Sweep-Worker-Paritaet
- MC-Parameter-, Startjahr- und Samplingvertraege
- Stationary-Bootstrap-Contract und -Sampler
- MC-Chunk-/Snapshot-/Messbaselines
- Browser-Sweep- und Monte-Carlo-Workflows

Nicht anfassen:
- Random-Stream-Aufteilung und makeRunSeed-Semantik
- Samplingpraezedenz estimated -> CAPE/Startgewichtung -> Methode -> Stress -> Tail
- Partner-, Pflege-, Witwen-, Langlebigkeits- und Tail-Risk-Semantik
- Sweep-Metriken und Optimizer
- engine.js
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/simulator-sweep.js app/simulator/sweep-runner.js app/simulator/monte-carlo-parameters.js app/simulator/mc-year-sampling.js app/simulator/monte-carlo-runner.js workers/mc-worker.js tests/simulator-sweep.test.mjs tests/monte-carlo-parameters.test.mjs tests/monte-carlo-sampling-contract.test.mjs tests/worker-parity.test.mjs docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen.
```

Es sind exakt sechs Programmdateien vorgesehen. Die projektweite Stop-Regel
von mehr als zehn Programmdateien und das strengere Slice-Maximum von sechs
greifen nicht. Eine siebte Programmdatei stoppt die Umsetzung.

## Baseline- und Delta-Ledger

### Vorher-Vertrag

- Sweep verwendet ein unversioniertes `sweepConfig` mit eigenen Feldnamen.
- Sweep-UI ersetzt Seed 0 still durch 12345.
- Startjahresmodus, Filter, Recency, CAPE und
  `excludeEstimatedHistory` werden nicht in den Sweep transportiert.
- Sweep zieht das Startjahr uniform aus allen Datensaetzen.
- `stationary` faellt im Sweep in den Regime-Markov-Zweig.
- unbekannte Methoden fallen ebenfalls in Regime-Markov.
- Sweep-Ergebnisse enthalten weder normalisierten Request noch
  Samplingdiagnose oder Requested-/Applied-Methodik.

### Erwartetes Delta

- Sweep-Request, gemeinsamer MC-/Sweep-Samplingdispatch und zugehoerige
  Provenienz aendern sich;
- Monte Carlo bleibt bei `UNIFORM` beziehungsweise bei Pfaden, deren
  Regime-Zuege bereits im effektiven Jahresuniversum liegen, bytegleich.
  Bei Filter-/Estimated-Konfigurationen mit leerem Zielregime ist ein
  fachlich zu entscheidendes Delta unvermeidbar;
- keine unbenannte Snapshot-, Backtest-, MC-, Worker- oder
  FlowDelta-Abweichung.

### Baseline vor Codeaenderung

Am 2026-07-26 vor dem ersten Programmdatei-Edit ausgefuehrt:

- `tests/simulator-sweep.test.mjs`: 107/107 Assertions gruen;
- `tests/monte-carlo-parameters.test.mjs`: 60/60 Assertions gruen;
- `tests/monte-carlo-sampling-contract.test.mjs`: 58/58 Assertions gruen;
- `tests/worker-parity.test.mjs`: 378/378 Assertions gruen.

Die Baseline belegt den bisherigen deterministischen Zustand, aber noch nicht
die fachliche Korrektheit des Sweep-Samplings: Die vorhandenen Sweep-Tests
pruefen Metrikdeterminismus und Chunk-Paritaet, nicht Methode,
Startjahresfilter oder gezogene Indizes.

## Geplante Tests und fachliche Orakel

- Red-State-Contracts fuer versionierten SweepRequest, Seed 0,
  Startjahresoptionen, ungueltige Methoden und Ergebnisprovenienz.
- O-11 mit festem Seed und exakter Indexfolge gegen den kanonischen
  Stationary- beziehungsweise Regime-Referenzsampler.
- Single-Combination-Sweep gegen denselben MC-Samplingdispatch.
- Fokussierte Tests:
  - `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
  - `node tests/run-single.mjs tests/monte-carlo-parameters.test.mjs`
  - `node tests/run-single.mjs tests/monte-carlo-startyear.test.mjs`
  - `node tests/run-single.mjs tests/monte-carlo-sampling.test.mjs`
  - `node tests/run-single.mjs tests/monte-carlo-sampling-contract.test.mjs`
  - `node tests/run-single.mjs tests/stationary-bootstrap-contract.test.mjs`
  - `node tests/run-single.mjs tests/stationary-bootstrap-sampler.test.mjs`
  - `node tests/run-single.mjs tests/worker-parity.test.mjs`
- Pflicht-/Integrationsgates:
  - `npm test`
  - `npm run test:browser`
  - `git diff --check`

## Durchgefuehrte Aenderungen

- `SweepRequestV1` normalisiert den Sweep ueber denselben
  `MonteCarloParametersV1`-Vertrag wie den Monte-Carlo-Lauf. Dauer, Runzahl,
  Seed, Methode, Blocklaenge, Startjahresmodus, Filter, Recency,
  `excludeEstimatedHistory` und CAPE werden damit an einer gemeinsamen
  Grenze validiert. Seed 0 bleibt als gueltiger Wert erhalten.
- `initializeMonteCarloSamplingStateV1` und `sampleMonteCarloYearV1` bilden
  den gemeinsamen, expliziten Samplingdispatch fuer Monte Carlo und Sweep.
  `fixed_block`, `stationary` und `regime_markov` besitzen getrennte Zweige;
  unbekannte Methoden werden nicht mehr als Regime-Markov interpretiert.
- Regime-Markov und Regime-IID validieren vor dem ersten Run, dass jedes
  ziehbare Regime mindestens ein Jahr im wirksamen Filteruniversum besitzt.
  Ein leerer Pool blockiert den gesamten Request stabil mit
  `MC_SAMPLING_REGIME_POOL_EMPTY`; der regime-blinde Ersatzzug wurde
  vollstaendig entfernt.
- Der Sweep verwendet fuer Startjahr und jedes Folgejahr denselben
  Samplingpfad und dieselbe Praezedenz wie Monte Carlo. Die bestehende
  Random-Stream-Aufteilung und `makeRunSeed`-Semantik wurden nicht
  veraendert.
- `SweepResultProvenanceV1` dokumentiert pro Kombination Requestversion,
  Requested-/Applied-Methode, normalisierte Parameter, Samplingdiagnose und
  einen begrenzten `SweepSamplingFingerprintV1`. Auch fachlich ungueltige
  Sweep-Kombinationen behalten die Requestprovenienz.
- UI, serieller Runner und Worker transportieren denselben versionierten
  Request. Die UI stellt den vollstaendigen Lauf zusaetzlich als
  `window.sweepExecution` bereit; Workerfehler behalten den strukturierten
  Fehlercode.

## Ausgefuehrte Tests

### Fokussierte Gates

- `tests/simulator-sweep.test.mjs`: 127/127 Assertions gruen;
- `tests/monte-carlo-parameters.test.mjs`: 77/77 Assertions gruen;
- `tests/monte-carlo-sampling-contract.test.mjs`: 61/61 Assertions gruen;
- `tests/mc-worker-contract.test.mjs`: 55/55 Assertions gruen;
- `tests/worker-parity.test.mjs`: 378/378 Assertions gruen;
- `tests/stationary-bootstrap-sampler.test.mjs`: 23/23 Assertions gruen;
- Startjahr-, Sampling-, Stationary-Contract- und MC-Messvertragsgates
  ebenfalls gruen; der MC-Messvertrag umfasst 1.102/1.102 Assertions.

Die neuen Orakel decken O-11, getrennte Stationary-/Regime-Pfade, Seed 0,
Filter-/Estimated-Ausschluss, Single-Combination-MC-/Sweep-Sampling,
Requested-/Applied-Provenienz sowie bytegleiche serielle/Worker-Ergebnisse
und Fehler ab.

### Vollstaendige Pflichtgates

- Vor dem Claude-Review: `npm test` mit 132 Testdateien und 7.584/7.584
  Assertions sowie 16/16 Browser-Smokes gruen.
- Nach der vollstaendigen Nachbesserung: `npm test` mit 132 Testdateien,
  7.613/7.613 Assertions, 0 Fehler und 0 offene Handles;
- `npm run test:browser`: 16/16 Browser-Smokes gruen;
- `git diff --check`: gruen.

### Nachbesserung nach Claude-Review

- `tests/monte-carlo-parameters.test.mjs`: 81/81 Assertions gruen;
- `tests/simulator-sweep.test.mjs`: 139/139 Assertions gruen;
- `tests/monte-carlo-sampling-contract.test.mjs`: 68/68 Assertions gruen;
- `tests/mc-worker-contract.test.mjs`: 61/61 Assertions gruen;
- `tests/worker-parity.test.mjs`: 378/378 Assertions gruen;
- `tests/monte-carlo-measurement-contract.test.mjs`: vollstaendig gruen.

Die vollstaendigen Pflichtgates wurden auf dem finalen Nachbesserungsstand
erneut ausgefuehrt.

## Abweichungen vom Plan

- Fuer den direkten echten Worker-Nachweis wurde
  `tests/mc-worker-contract.test.mjs` ergaenzt. Das ist eine Testdatei und
  erweitert nicht den auf sechs Programmdateien begrenzten Produktscope.
- `tests/worker-parity.test.mjs` musste nicht geaendert werden; seine
  vorhandenen 378 Assertions pruefen den neuen Sweep-Requestpfad bereits
  unveraendert gruen.
- Monte Carlo wurde auf die gemeinsamen Samplinghelfer umgestellt, ohne
  Snapshot-, Mess- oder Worker-Paritaetsdelta. Das einzige beabsichtigte
  Rechendelta betrifft zuvor regelwidrige Regime-Fallbacks ausserhalb des
  gefilterten Jahresuniversums.
- Die urspruengliche Nicht-Scope- und Delta-Formulierung war fuer dieses
  beabsichtigte Filterdelta widerspruechlich. Sie wurde nach F-3 korrigiert;
  die Regime-Contractpraezedenz nennt die Vorabvalidierung des effektiven
  Jahresuniversums nun ausdruecklich.

## Offene Risiken

- Der Sweep besitzt bis Slice 08 absichtlich noch nicht den vollstaendigen
  Haushalts-, Pflege-, Langlebigkeits- und Tail-Risk-Vertrag des MC-Runners.
- Ein gemeinsamer Samplingdispatch verhindert keine spaetere Divergenz, wenn
  ein Consumer ausserhalb des Dispatchs andere Zufallszahlen verbraucht.
  Der Fingerprint macht diese Abweichung sichtbar, verhindert sie aber nicht.
- Der exakte Samplingtrace in der Ergebnisprovenienz ist bewusst auf die
  ersten drei Runs und je 64 Jahre begrenzt; der Hash umfasst den gesamten
  Lauf. Eine Diagnose allein aus dem sichtbaren Trace kann deshalb spaete
  Abweichungen nicht lokalisieren.
- Enge Filter wie `FILTER >= 2010` sind fuer Regime-Sampling unzulaessig,
  solange mindestens ein ziehbares Regime keinen Datenpunkt besitzt. Nutzer
  muessen den Filter erweitern oder `block` beziehungsweise `stationary`
  waehlen; die Simulation erfindet keinen Ersatzpfad.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist verlinkt und nach der Nachbesserung auf
  `nachgebessert - Re-Review ausstehend` gesetzt.
- Start, Scope, Branch-/Statuscheck, Diff-Risiko und Implementierungsabschluss
  sind im Hauptplan protokolliert.
- Es wurden keine Engine-, Build-, Architektur- oder Nutzerworkflowvertraege
  ausserhalb des dokumentierten Sweep-/Samplingvertrags geaendert; weitere
  Referenzdokumente benoetigen deshalb in diesem Slice kein Update.

## Freigabestatus

Die Gemini-Freigabe vom 2026-07-26 bleibt als Reviewhistorie erhalten. Das
nachgelagerte Claude-Review blockiert den Slice jedoch bis zur Behebung und
erneuten unabhaengigen Pruefung. Der Nutzer hat F-2 am 2026-07-26 als
Fail-Closed entschieden; F-1 bis F-9 sind technisch nachgebessert
beziehungsweise explizit eingegrenzt. F-10 verlangt weiterhin ein
regelkonformes unabhaengiges Re-Review. Codex erteilt keine Eigenfreigabe und
erstellt keinen Commit.

**Stand 2026-07-26 nach Re-Review:** Claude hat die Nachbesserung unabhaengig
geprueft und den Slice freigegeben; siehe „Re-Review nach Nachbesserung". Die
drei Blocker F-1, F-2 und F-3 sind behoben und nachgemessen, F-10 ist durch
das Re-Review selbst erledigt. Es verbleiben sieben dokumentierte Restrisiken,
darunter N-2 (Fail-Closed-Meldung ohne Handlungshinweis ab
`startYearFilter >= 2009`) als einziger nutzersichtbarer Punkt. Damit liegen
zwei uebereinstimmende Reviewfreigaben vor; die Gesamtfreigabe des Slice und
ein etwaiger Commit bleiben Nutzerentscheidung.

## Git-Status nach Claude-Nachbesserung

```text
 M app/simulator/mc-year-sampling.js
 M app/simulator/monte-carlo-parameters.js
 M app/simulator/sweep-runner.js
 M docs/internal/SLICE_SUITE_DATA_07_SWEEP_REQUEST_SAMPLING.md
 M docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
 M tests/mc-worker-contract.test.mjs
 M tests/monte-carlo-parameters.test.mjs
 M tests/monte-carlo-sampling-contract.test.mjs
 M tests/simulator-sweep.test.mjs
```

Die Nachbesserung aendert drei der bereits fuer Slice 07 genehmigten sechs
Programmdateien, vier genehmigte Testdateien und die beiden
Dokumentationsdateien. Es gibt keine unerwartete oder themenfremde Datei.
Die Review-Dokumentation von Claude wurde erhalten und nur um
Codex-Antworten, Nutzerentscheidung und Nachweise ergaenzt.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-26  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `SLICE_EXECUTION_RULES.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:**
   - **`SWP-02` Parameter-Synchronisation:** `SweepRequestV1` verwendet den gemeinsamen `MonteCarloParametersV1`-Vertrag. Seed 0 wird sauber als numerischer 0-Seed unterstützt. Filter & Startjahresoptionen bleiben erhalten.
   - **`SWP-06` & `SWP-07` Gemeinsamer Samplingdispatch:** `initializeMonteCarloSamplingStateV1` und `sampleMonteCarloYearV1` steuern Sampling in MC und Sweep über einen zentralen Dispatcher. Unbekannte Methoden werden fail-closed abgewiesen. O-11 verifiziert, dass `stationary` und `regime_markov` nachweislich durch verschiedene Sampler laufen.
   - **`SWP-11` Ergebnisprovenienz:** `SweepResultProvenanceV1` liefert für jede Sweep-Kombination Requestversion, Requested-/Applied-Methode, normalisierte Parameter, Samplingdiagnose und Fingerprint.
   - **Worker-Parität:** `workers/mc-worker.js` verarbeitet den `SweepRequestV1` paritätisch zum seriellen Runner.
2. **Vertragstreue:**
   - Keine Engine-Änderungen. MC-Sampling-Logik wurde ohne Mess-/Snapshot-Abweichung auf gemeinsame Dispatch-Helfer refaktoriert.
3. **Fehlerbehandlung:**
   - Ungültige Parameter (Seed, Runzahl, Methode etc.) werfen im seriellen und Worker-Pfad denselben strukturierten Fehler.
4. **Seiteneffekte:**
   - Exakt 6 Programmdateien geändert (`simulator-sweep.js`, `sweep-runner.js`, `monte-carlo-parameters.js`, `mc-year-sampling.js`, `monte-carlo-runner.js`, `mc-worker.js`). Max. Datei-Limit von 6 strikt eingehalten!
   - Test-Suite (`npm test`, 7.584 Assertions) und Browser-Smokes (`npm run test:browser`, 16 E2E-Läufe) grün.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. Der Sweep verarbeitet bis Slice 08 noch nicht den vollständigen Partner- / Pflege- / Tail-Risk-Overlay-Vertrag des MC-Runners.
  2. Der Sampling-Trace in der Provenienz ist zur Speicherbegrenzung auf die ersten drei Runs beschränkt; der Fingerprint-Hash sichert den Gesamtlauf ab.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Worker-Knoten, der bei einem Sweep mit `stationary`-Bootstrap eine abweichende Blocklänge erhält, weil der Request-Normalisierer im Worker-Scope mit unvollständigem Config-Objekt aufgerufen wurde.
```

## Review-Feedback von Claude

- **Review-Datum:** 2026-07-26
- **Reviewer:** Claude (Opus 5)
- **Methode:** Adversariales Code- und Contract-Review nach `CLAUDE.md` und
  `SLICE_EXECUTION_RULES.md`, ausgefuehrt nach Commit `4cb907b`.

### Eigene Verifikation

- `npm test`: 7.584/7.584 Assertions gruen, 0 offene Handles (nachgefahren);
- `tests/worker-parity.test.mjs` 378/378, `tests/simulator-sweep.test.mjs`
  127/127, `tests/mc-worker-contract.test.mjs` 55/55,
  `tests/monte-carlo-sampling-contract.test.mjs` 61/61 gruen;
- `git diff --check` gruen;
- zusaetzlich drei gezielte Messlaeufe gegen die neuen Pfade (Ergebnisse in
  F-1, F-2 und F-4 dokumentiert).

Die Testlage der Slice-MD ist damit bestaetigt. Die Findings betreffen
Faelle, die von der vorhandenen Suite nicht abgedeckt werden.

### Pruefdimensionen

1. **Korrektheit:** Startjahr-, Folgejahr- und Methodendispatch gegen
   `annualData`-Indexfolgen geprueft; Regime-Fallback quantitativ gemessen
   (F-2). Nicht getestete Eingaben: fehlender Request (F-1), enger
   Startjahresfilter mit leerlaufendem Regime-Pool (F-2), Kombinationsindex
   ungleich 0 (F-9).
2. **Vertragstreue:** `precedence` im `MonteCarloSamplingContractV1` nennt den
   neu eingefuegten Schritt nicht (F-3); Requested-/Applied-Methodik ist
   strukturell nicht divergenzfaehig (F-4).
3. **Fehlerbehandlung:** `runSweepChunk` hat seine bisherige harte
   Ablehnung eines fehlenden Requests verloren (F-1);
   `MC_SAMPLING_YEAR_OUTSIDE_EFFECTIVE_UNIVERSE` wirft in der Jahresschleife
   und reisst den gesamten Chunk mit.
4. **Seiteneffekte:** Der Slice aendert Monte-Carlo-Samplingverhalten,
   nicht nur Sweep-Verhalten (F-2, F-3). Konsumenten von `sweepResults`
   (`simulator-heatmap.js`, `simulator-optimizer.js`) lesen nur `params`
   und `metrics`; `provenance` ist dort additiv unkritisch.
5. **Was koennte brechen?** Am wenigsten durchdacht ist die fachliche
   Wirkung des regime-blinden Ersatzzugs (F-2).

### Findings

1. **F-1 (Blocker) - `runSweepChunk` hat Fail-Closed verloren, mit
   10.000-facher Ressourcenwirkung.** `sweep-runner.js` normalisiert
   `sweepRequest ?? sweepConfig ?? {}`. Vorher warf das Destructuring von
   `sweepConfig` bei fehlendem Config hart. Gemessen ergibt
   `normalizeSweepRequestV1({})` einen gueltigen Request mit
   `anzahl = 10000` und `methode = 'regime_markov'`. Ein Aufrufer oder eine
   Workermessage ohne Requestfeld startet damit still 10.000 Runs pro
   Kombination statt zu fehlschlagen; `SWEEP_REQUEST_OBJECT_REQUIRED` ist
   aus diesem Pfad unerreichbar. Das Pre-Mortem von Gemini benennt genau
   dieses Szenario, fuehrt es aber nicht als Finding.
2. **F-2 (Blocker, fachlich) - der Regime-Fallback tauscht eine
   Filterverletzung gegen eine systematische Optimismusverzerrung.**
   `enforceEffectiveYearUniverse` zieht ueber `allSampler` neu und damit
   regime-blind. Gemessen fuer Monte Carlo, `regime_markov`,
   `startYearMode: 'FILTER'`, `startYearFilter: 2010`, 200 Runs a 30 Jahre:
   `sourceCounts = {initial_start: 200, regime_markov: 3177,
   regime_markov_eligible_fallback: 202}` und
   `regimeCounts = {BULL: 1735, SIDEWAYS: 1598, STAGFLATION: 246}`. Die
   Filterinvariante haelt (kein Jahr unter 2010), aber **BEAR verschwindet
   vollstaendig**: Der BEAR-Pool laeuft ab `FILTER >= 2010` leer, weil alle
   sieben BEAR-Jahre vor 2010 liegen. Die Markov-Kette betritt den
   BEAR-Zustand 202-mal und erhaelt jedes Mal ein Durchschnittsjahr.
   Vorher lieferte der Pfad echte Baerenjahre ausserhalb des Filters. Fuer
   ein Ruhestandsrisikowerkzeug ist das die entscheidungsrelevantere
   Verzerrung: Ein Nutzer, der den Filter eng setzt, erhaelt eine
   Simulation, in der Baerenmaerkte strukturell unmoeglich sind.
   Zusaetzlich divergieren `samplerState.currentRegime` (BEAR) und das
   protokollierte `regimeCounts` (BULL/SIDEWAYS) still. Der
   `regimeSampler`-Zweig in `enforceEffectiveYearUniverse` ist dabei toter
   Code: Er kann nur greifen, wenn `regimeSamplers[regime]` nicht leer ist -
   genau das ist die Bedingung, die den Fallback ausloest. Er suggeriert
   eine Regime-Erhaltung, die nicht existiert.
   Loesungsoptionen: Ersatzzug aus dem naechstliegenden verfuegbaren Regime;
   oder Fail-Closed, wenn ein erreichbares Regime kein zulaessiges Jahr hat;
   oder das ausserhalb liegende Jahr behalten und als explizite, sichtbare
   Vertragsausnahme protokollieren. Die Entscheidung ist fachlich und
   gehoert dem Nutzer.
3. **F-3 (Blocker, Prozess) - undeklarierte Scope-Erweiterung im
   Widerspruch zum eigenen Ledger.** F-2 ist eine Verhaltensaenderung des
   Monte-Carlo-Runners. Nicht-Scope dieser Slice-MD nennt „keine Aenderung
   der ... vorhandenen Monte-Carlo-Samplingpraezedenz", das Delta-Ledger
   „Monte Carlo behaelt ... seine bisherigen Resultate und
   Samplingdiagnosen bytegleich". Beides trifft nicht zu. „Abweichungen vom
   Plan" raeumt es ein, ohne Nicht-Scope und Delta-Ledger zu korrigieren.
   Zusaetzlich nennt das `precedence`-Array in
   `resolveMonteCarloSamplingContractV1` den neuen Schritt zwischen
   `sampling_method` und `conditional_stress_override` nicht; der Contract
   beschreibt seine eigene Praezedenz damit unvollstaendig.
4. **F-4 (Restrisiko) - `requestedSamplingMethod` und
   `appliedSamplingMethod` sind strukturell vakuant.**
   `normalizeMonteCarloParametersV1` wirft bei unbekannter Methode statt
   zurueckzufallen, also gilt immer `requested === applied`; verifiziert
   auch ueber die Doppelnormalisierung (UI plus Runner). Bei der zweiten
   Normalisierung wird `requestedSamplingMethod` aus der bereits
   normalisierten Methode neu abgeleitet, ein hypothetisches Delta ginge
   dort verloren. Das Akzeptanzkriterium ist formal erfuellt, aber ohne
   Aussagekraft.
5. **F-5 (Restrisiko) - Testabdeckung greift zum schwaecheren Orakel.**
   Test 31 belegt „Alle gezogenen Jahre erfuellen Startfilter und
   `excludeEstimatedHistory`" ueber `samplingFingerprint.tracedRuns`, also
   maximal 3 Runs a 64 Jahre. Das vollstaendige Orakel
   `samplingDiagnostics.historicalYearCounts` liegt vor und wird im
   Sampling-Contract-Test auch genutzt, hier aber nicht. Bei `anzahl > 3`
   ist das Kriterium nur stichprobenhaft belegt.
6. **F-6 (Restrisiko) - Tail-Risk-Nullen widersprechen Slice 06.** Der
   Sweep ruft `finalizeMonteCarloSamplingDiagnosticsV1` ohne Totals auf,
   alle `tailRisk`-Felder sind `0`. „Tail Risk existiert im Sweep noch
   nicht" ist damit nicht von „Tail Risk lief und fand nichts"
   unterscheidbar - genau die Missingness-Semantik, die Slice 06
   etabliert hat.
7. **F-7 (Restrisiko) - Sampling-Auflösung pro Kombination neu gebaut,
   obwohl invariant.** `buildYearSamplingConfig` und
   `resolveMonteCarloSamplingContractV1` liegen in der
   Kombinationsschleife. Kein Schluessel in `SWEEP_ALLOWED_KEYS`
   beeinflusst `capeRatio` oder `marketCapeRatio`, das Ergebnis ist ueber
   alle Kombinationen identisch: bei 300 Kombinationen rund 600 redundante
   Config-Builds inklusive CDF- und Regimegruppierung. Ein Hochziehen ist
   aber nicht trivial, weil `resolveMonteCarloSamplingContractV1` fuer
   `block` `effectiveYearSamplingConfig.blockStartIndices` und
   `blockSampler` in-place mutiert; ein gemeinsamer Config wuerde ueber
   Kombinationen hinweg akkumulieren. Latente Falle fuer den naechsten
   Optimierungsversuch.
8. **F-8 (Restrisiko) - Hash-Kollision im Fingerprint.**
   `beginSweepFingerprintRun` mischt `0xFFFFFFFF` als Run-Separator, ein
   unbekannter Index wird auf `-1 >>> 0 === 0xFFFFFFFF` normalisiert. Run-
   grenze und Unbekannt-Marker sind hash-identisch. Derzeit unerreichbar,
   weil alle gezogenen Jahre in `annualData` liegen; der Separator verliert
   damit aber seine Eindeutigkeitsgarantie.
9. **F-9 (Restrisiko) - Paritaetskriterium gilt nur fuer Kombination 0.**
   Der Sweep nutzt `makeRunSeed(baseSeed, comboIdx, i)`, Monte Carlo
   `makeRunSeed(seed, 0, runIdx)`. Das Akzeptanzkriterium „Ein Sweep mit
   genau einer Kombination stimmt ... mit dem entsprechenden kanonischen
   MC-Samplingpfad ueberein" trifft nur zu, wenn diese Kombination auf
   Index 0 liegt. Test 32 prueft genau diesen Fall und verallgemeinert
   nicht.
10. **F-10 (Prozess) - das freigebende Review enthaelt keine Findings.**
    Der Gemini-Block listet bestaetigte Pruefdimensionen, „Blocker: keine",
    zwei bereits von Codex selbst dokumentierte Restrisiken und eine
    Entscheidungstabelle mit einer Zeile. Nach `SLICE_EXECUTION_RULES.md`
    und `CLAUDE.md` ist eine Freigabe ohne dokumentierte Findings
    unzulaessig. F-1 ist statisch auffindbar, F-2 mit einem Probelauf von
    rund 30 Zeilen.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker:
  1. F-1 - runSweepChunk defaultet bei fehlendem Request still auf 10.000
     Runs pro Kombination statt fail-closed zu brechen.
  2. F-2 - regime-blinder Ersatzzug entfernt BEAR vollstaendig aus
     gefilterten Regime-Laeufen (gemessen 202/3.579 Zuege, BEAR-Anteil 0);
     Markov-Zustand und protokolliertes Regime divergieren still; der
     regimeSampler-Zweig ist toter Code.
  3. F-3 - MC-Verhaltensaenderung widerspricht Nicht-Scope und dem
     „bytegleich"-Delta-Ledger; precedence im Contract ist unvollstaendig.
- Restrisiken:
  1. F-4 bis F-9 wie oben dokumentiert.
  2. MC_SAMPLING_YEAR_OUTSIDE_EFFECTIVE_UNIVERSE wirft in der
     Jahresschleife und reisst den kompletten Chunk mit. Mit den heutigen
     Daten unerreichbar (in UNIFORM ist allSampler null, aber kein
     Regime-Pool leer), bei einer kuenftigen Datenrevision ein harter
     Abbruch statt einer Degradation.
  3. Provenienz rund 2 bis 4 KB JSON pro Kombination bei bis zu 300
     Kombinationen je postMessage; begrenzt, aber ungemessen.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten
  einen Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Ein Nutzer setzt im Sweep oder Monte Carlo einen engen Startjahresfilter
  (>= 2010), erhaelt durch F-2 eine Simulation ohne jedes Baerenmarktjahr
  und liest daraus eine zu hohe sichere Entnahmerate ab. Die Diagnose
  bleibt unauffaellig, weil historicalYearCounts die Filterinvariante
  korrekt erfuellt und nur der unscheinbare Zaehler
  regime_markov_eligible_fallback sowie ein fehlender BEAR-Schluessel in
  regimeCounts die Verzerrung verraten. Zweitwahrscheinlichste Ursache:
  F-1 schlaegt nach einem Refactoring des Workerprotokolls zu und ein
  Sweep laeuft mit 10.000 statt 100 Runs pro Kombination scheinbar „nur
  langsam" statt zu fehlschlagen.
```

### Re-Review nach Nachbesserung (Claude, 2026-07-26)

Unabhaengige Nachpruefung der Nachbesserung; adressiert zugleich F-10.

#### Verifikation

- `npm test`: 7.613/7.613 Assertions gruen (vorher 7.584), 0 offene Handles;
- `git diff --check` gruen; weiterhin exakt sechs Programmdateien im Scope;
- meine Reviewdokumentation wurde inhaltlich unveraendert erhalten und nur
  um Antworten ergaenzt;
- eigene Messlaeufe gegen die geaenderten Pfade (Ergebnisse unten).

#### Findingstatus

- **F-1 behoben.** Der Defaultwert `rawRequest = {}` und das `?? {}` in
  `runSweepChunk` sind entfernt; ein fehlender Request wirft
  `SWEEP_REQUEST_OBJECT_REQUIRED`. Test 34 deckt den Pfad ab.
- **F-2 behoben (Fail-Closed gemaess Nutzerentscheidung).** Der regime-blinde
  Ersatzzug ist ersetzt durch die Vorabvalidierung
  `assertDrawableRegimePools`; `enforceEffectiveYearUniverse` ist zur reinen
  Assertion ohne Zufallszahlenverbrauch reduziert, der tote
  `regimeSampler`-Zweig entfaellt. End-to-end nachgemessen (Monte Carlo,
  `regime_markov`, 200 Runs a 30 Jahre):
  `FILTER 2010` -> `REJECT MC_SAMPLING_REGIME_POOL_EMPTY`;
  `FILTER 2005` -> `sourceCounts = {initial_start: 200, regime_markov: 3015}`,
  `regimeCounts = {SIDEWAYS: 1276, BULL: 1524, STAGFLATION: 206, BEAR: 209}`.
  Der Zaehler `regime_markov_eligible_fallback` existiert nicht mehr, BEAR ist
  wieder vertreten. Die Verzerrung ist beseitigt.
- **F-3 behoben.** Nicht-Scope und Delta-Ledger sind korrigiert; `precedence`
  enthaelt fuer Regime-Methoden `effective_year_universe_validation`, ergaenzt
  um `emptyRegimePoolPolicy` und `drawableRegimes`.
- **F-4 anders, aber tragfaehig geloest.** Statt die vakuanten Felder zu
  entfernen, sind sie zur durchgesetzten Zusicherung erhoben:
  `samplingMethodResolution: 'strict_no_fallback'` plus Abweisung per
  `SWEEP_REQUEST_METHOD_PROVENANCE_MISMATCH`. Doppelnormalisierung bleibt
  idempotent.
- **F-5 behoben.** Das Sweep-Orakel prueft die vollstaendigen
  `historicalYearCounts` statt des begrenzten Trace.
- **F-6 behoben.** `samplingDiagnostics.tailRisk` ist in der Provenienz `null`
  bei `unsupportedOverlays: ['tailRisk']`; die Nullung erfolgt auf einer Kopie,
  die Diagnoseassertion bleibt gueltig.
- **F-7 behoben.** Samplingkonfiguration und Contract werden einmal pro Chunk
  aufgeloest; `cloneYearSamplingConfig` beseitigt die In-place-Mutation. Die
  Korrektheitspraemisse wurde geprueft: `buildSweepInputs` ueberschreibt eine
  feste Schluesselliste ohne CAPE-Bezug, das Ergebnis ist ueber alle
  Kombinationen identisch.
- **F-8 behoben.** Separator `0xFFFFFFFD`, Unbekannt-Marker `0xFFFFFFFE`.
- **F-9 eingegrenzt, nicht aufgehoben.** `combinationIndex` in Provenienz und
  Fingerprint macht die Zuordnung nachvollziehbar; die Seedasymmetrie
  `makeRunSeed(baseSeed, comboIdx, i)` gegen `makeRunSeed(seed, 0, runIdx)`
  besteht fort, das Paritaetskriterium gilt weiterhin nur fuer
  Kombinationsindex 0.
- **F-10 adressiert** durch dieses Re-Review.

#### Neue Findings

1. **N-1 (Restrisiko) - Erreichbarkeitsmodell des Validators und Verhalten des
   Samplers stimmen nicht exakt ueberein.** `collectDrawableRegimes` bildet die
   Erreichbarkeit ueber `count > 0` aus `REGIME_TRANSITIONS`.
   `sampleNextYearData` hat zusaetzlich ein unbedingtes
   `let nextRegime = 'SIDEWAYS'`, das greift, wenn die kumulierte
   Wahrscheinlichkeit `r` nicht erreicht. Gemessen summieren die Zeilen BEAR
   und STAGFLATION auf `0.9999999999999999`, der Default ist also mit rund
   1e-16 je Zug real erreichbar. Heute folgenlos, weil SIDEWAYS mit den
   aktuellen Daten ohnehin aus jedem Zustand erreichbar ist. Bei einer
   Datenrevision, die SIDEWAYS zaehlerbasiert unerreichbar macht, wuerde der
   Validator eine Konfiguration durchlassen, die der Sampler verletzt; der
   Lauf braeche dann mitten in der Jahresschleife mit
   `MC_SAMPLING_YEAR_OUTSIDE_EFFECTIVE_UNIVERSE` ab statt bei der Validierung.
2. **N-2 (Restrisiko, Usability) - die Fail-Closed-Meldung ist nicht
   handlungsleitend.** Gemessene Schwelle: ab `startYearFilter >= 2009` weisen
   `regime_markov` und `regime_iid` ab, weil das letzte BEAR-Jahr 2008 ist.
   Das ist eine plausible Nutzereinstellung („nur die letzten 15 Jahre"). Der
   Nutzer sieht per `alert` nur
   `MonteCarloSamplingContractV1: regime_markov kann Regime ohne zulaessiges
   Jahr ziehen: BEAR.` - ohne Hinweis, dass ein Filter bis 2008 oder eine
   andere Methode funktioniert. Der Contract fuehrt mit `drawableRegimes`
   bereits die noetige Information mit.
3. **N-3 (Restrisiko) - der Worker-Fallback fehldiagnostiziert
   Konfigurationsablehnungen.** `simulator-sweep.js` faengt jeden Workerfehler
   und wiederholt seriell mit Log „Worker execution failed, falling back to
   serial". Strukturierte Contractfehler (`MC_SAMPLING_*`, `SWEEP_REQUEST_*`)
   sind deterministisch und scheitern zwangslaeufig erneut. Dank der
   vorgezogenen Validierung ist die Wiederholung billig, die Diagnosespur aber
   irrefuehrend.
4. **N-4 (Restrisiko) - die hochgezogene Aufloesung stuetzt sich auf eine
   ungesicherte Invariante.** Sie ist korrekt, weil keiner der in
   `buildSweepInputs` gesetzten Schluessel `capeRatio` oder `marketCapeRatio`
   beruehrt. Ein spaeter ergaenzter CAPE-relevanter Sweep-Parameter wuerde
   still auf die CAPE-Auswahl aus `baseInputs` zurueckfallen. Eine Assertion
   oder ein Kommentar an `caseOverrides` wuerde das absichern.
5. **N-5 (Hinweis) - `updateFingerprintHash` normalisiert nicht sichere
   Ganzzahlen auf `0xFFFFFFFE`, identisch zu `FINGERPRINT_UNKNOWN_YEAR`.**
   Semantisch konsistent, die beiden Unbekannt-Kanaele sind aber nicht mehr
   unterscheidbar.

#### Warum block und stationary keine Poolvalidierung brauchen

Geprueft und bestaetigt: `buildYearSamplingConfig` filtert ausschliesslich
ueber untere Schranken (`minStartIndex`, `ESTIMATED_HISTORY_CUTOFF_YEAR`,
`startYearFilter`). Das zulaessige Universum ist damit immer ein
zusammenhaengendes Suffix von `annualData`. Blockweises Vorwaertslaufen ab
einem zulaessigen Blockstart kann es deshalb nicht verlassen; `maxStartIndex`
deckt das Arrayende ab. Die Asymmetrie zur Regime-Validierung ist begruendet.

#### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. F-1, F-2 und F-3 sind behoben und unabhaengig nachgemessen.
- Restrisiken:
  1. N-1 Erreichbarkeitsmodell gegen SIDEWAYS-Default des Samplers.
  2. N-2 Fail-Closed-Meldung ohne Handlungshinweis ab Filter >= 2009.
  3. N-3 Worker-Fallback wiederholt deterministische Contractfehler und
     protokolliert sie als Workerfehler.
  4. N-4 ungesicherte CAPE-Invariante der hochgezogenen Aufloesung.
  5. N-5 nicht unterscheidbare Unbekannt-Kanaele im Fingerprint.
  6. F-9 Seedasymmetrie zwischen Sweep und Monte Carlo besteht fort.
  7. Sweep ohne Haushalts-, Pflege-, Langlebigkeits- und Tail-Risk-Vertrag
     bis Slice 08 (unveraendert aus der Slice-MD uebernommen).
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten
  einen Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Nicht mehr ein falsches Rechenergebnis, sondern ein Abbruch: Ein Nutzer
  mit gespeicherter Konfiguration `startYearFilter >= 2009` und
  Regime-Methode kann Monte Carlo und Sweep nicht mehr starten, versteht die
  Meldung nicht und meldet einen vermeintlichen Programmfehler (N-2). Die
  zweitwahrscheinlichste Ursache ist eine Datenrevision der historischen
  Reihe, die die Regimeverteilung so verschiebt, dass entweder weitere
  Filterwerte unbrauchbar werden oder N-1 zu einem Abbruch mitten im Lauf
  fuehrt.
```

## Review-Antworten von Codex

- **F-1:** bestaetigt und behoben. `normalizeSweepRequestV1` sowie
  `runSweepChunk` lehnen einen fehlenden Request jetzt vor jeder
  Defaultbildung mit `SWEEP_REQUEST_OBJECT_REQUIRED` ab. Der echte Worker und
  der serielle Pfad liefern denselben Code und dieselbe Meldung.
- **F-2:** bestaetigt. Der regime-blinde Ersatz ist nicht freigabefaehig.
  Von den drei Reviewoptionen ist Fail-Closed die einzige, die sowohl die
  Filterinvariante als auch die Regimesemantik ohne erfundene
  Naehebeziehung erhaelt. Der Nutzer hat diese Option am 2026-07-26
  bestaetigt. Regime-Markov bestimmt die transitiv erreichbaren Regimes,
  Regime-IID alle ziehbaren Regimes; ein fehlender Pool wird vor dem ersten
  Run mit `MC_SAMPLING_REGIME_POOL_EMPTY` abgewiesen.
- **F-3:** bestaetigt und dokumentarisch/vertraglich behoben. Nicht-Scope und
  Delta-Ledger benennen das MC-Filterdelta nun korrekt; der Contract fuehrt
  `effective_year_universe_validation` in der Regime-Praezedenz.
- **F-4:** Requested und Applied sind bei einer strikt ablehnenden Methode
  absichtlich gleich. `strict_no_fallback` macht diese Invariante explizit;
  Doppelnormalisierung erhaelt die Provenienz bytegleich und widerspruechliche
  Provenienz wird abgewiesen.
- **F-5:** Das Sweep-Orakel prueft jetzt alle Eintraege aus
  `historicalYearCounts`, nicht nur den begrenzten Trace.
- **F-6:** Nicht implementiertes Tail Risk ist in der Sweep-Provenienz jetzt
  `null` und zusaetzlich in `unsupportedOverlays` genannt.
- **F-7:** Samplingkonfiguration und Contract werden einmal pro Chunk statt
  pro Kombination aufgeloest. Der Resolver klont die effektive Konfiguration
  und mutiert das Caller-Objekt nicht mehr.
- **F-8:** Run-Separator und Unbekannt-Jahr verwenden verschiedene,
  reservierte Marker.
- **F-9:** Ergebnisprovenienz und Fingerprint nennen den globalen
  `combinationIndex`, der den `makeRunSeed`-Raum bestimmt. Das
  Single-Combination-MC-Orakel ist explizit Kombination 0.
- **F-10:** betrifft die Form des unabhaengigen Gemini-Reviews und kann nicht
  durch den Implementer geheilt werden. Ein erneutes Reviewerurteil nach
  Abschluss der Nachbesserung bleibt erforderlich.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| O-11 | Akzeptanzkriterien | Verification von `stationary` vs `regime_markov` Sampler-Disjunktion | verifiziert | durch gemeinsamen Dispatcher und Sampler-Signaturen abgesichert |
| F-1 | Claude 2026-07-26 | `runSweepChunk` defaultet bei fehlendem Request still auf 10.000 Runs pro Kombination | behoben - im Re-Review bestaetigt | Fail-Closed in Normalizer, Runner und echtem Worker nachgewiesen |
| F-2 | Claude 2026-07-26 | regime-blinder Ersatzzug entfernt BEAR vollstaendig aus gefilterten Regime-Laeufen; toter `regimeSampler`-Zweig | Nutzerentscheidung umgesetzt - im Re-Review bestaetigt | Vorabvalidierung aller ziehbaren Regimes; stabiler Fail-Closed-Fehler statt Ersatzzug |
| F-3 | Claude 2026-07-26 | MC-Verhaltensaenderung widerspricht Nicht-Scope und Delta-Ledger; `precedence` im Contract unvollstaendig | behoben - im Re-Review bestaetigt | Scope/Delta korrigiert; Contractpraezedenz vervollstaendigt |
| F-4 | Claude 2026-07-26 | Requested-/Applied-Samplingmethodik strukturell nicht divergenzfaehig | adressiert - im Re-Review bestaetigt | `strict_no_fallback` als explizite Invariante mit Tamper-Schutz |
| F-5 | Claude 2026-07-26 | Filterinvariante nur ueber begrenzten Trace statt ueber `historicalYearCounts` getestet | behoben - im Re-Review bestaetigt | vollstaendiges Zaehlerorakel ergaenzt |
| F-6 | Claude 2026-07-26 | Tail-Risk-Nullen in der Sweep-Provenienz widersprechen der Missingness-Semantik aus Slice 06 | behoben - im Re-Review bestaetigt | `tailRisk: null` plus `unsupportedOverlays` |
| F-7 | Claude 2026-07-26 | Sampling-Auflösung pro Kombination redundant; In-place-Mutation blockiert Hochziehen | behoben - im Re-Review bestaetigt | Aufloesung pro Chunk; isolierte effektive Konfiguration |
| F-8 | Claude 2026-07-26 | Fingerprint-Run-Separator kollidiert mit normalisiertem Unbekannt-Index | behoben - im Re-Review bestaetigt | disjunkte reservierte Marker |
| F-9 | Claude 2026-07-26 | Single-Combination-Paritaet gilt nur fuer Kombinationsindex 0 | adressiert - im Re-Review bestaetigt | globale Kombinationskoordinate in Provenienz/Fingerprint |
| F-10 | Claude 2026-07-26 | freigebendes Gemini-Review enthaelt keine Findings (Verstoss gegen Review-Pflicht) | erledigt | durch das Claude-Re-Review vom 2026-07-26 nachgeholt |
| N-1 | Claude Re-Review 2026-07-26 | Erreichbarkeitsmodell des Validators kennt den SIDEWAYS-Default des Samplers nicht | offen - Restrisiko | ausstehend |
| N-2 | Claude Re-Review 2026-07-26 | Fail-Closed-Meldung ab `startYearFilter >= 2009` ohne Handlungshinweis | offen - Restrisiko, Usability | ausstehend |
| N-3 | Claude Re-Review 2026-07-26 | Worker-Fallback wiederholt deterministische Contractfehler und protokolliert sie als Workerfehler | offen - Restrisiko | ausstehend |
| N-4 | Claude Re-Review 2026-07-26 | hochgezogene Samplingaufloesung stuetzt sich auf ungesicherte CAPE-Invariante | offen - Restrisiko | ausstehend |
| N-5 | Claude Re-Review 2026-07-26 | Unbekannt-Kanaele im Fingerprint nicht unterscheidbar | offen - Hinweis | ausstehend |
