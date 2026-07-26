# Slice 07 - Kanonischer Sweep-Request und Sampling

**Stand:** 2026-07-26  
**Status:** freigegeben - Review durch Gemini am 2026-07-26 erfolgreich durchgeführt  
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
- keine Aenderung der Random-Stream-Aufteilung oder vorhandener
  Monte-Carlo-Samplingpraezedenz;
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

- nur Sweep-Request, Sweep-Sampling und zugehoerige Provenienz aendern sich;
- Monte Carlo behaelt bei identischem Request, Seed und Datenstand seine
  bisherigen Resultate und Samplingdiagnosen bytegleich;
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
- Der Regime-Fallback wird gegen das wirksame, bereits gefilterte
  Jahresuniversum abgesichert. Auch bei einem leeren Regime-Pool kann damit
  kein wegen Startfilter oder `excludeEstimatedHistory` ausgeschlossenes
  Jahr in den Lauf gelangen.
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

- `npm test`: 132 Testdateien, 7.584/7.584 Assertions, 0 Fehler,
  0 offene Handles;
- `npm run test:browser`: 16/16 Browser-Smokes gruen;
- `git diff --check`: gruen.

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
- Wenn der alte Regime-Fallback ein ausgeschlossenes Jahr gezogen haette,
  verbraucht die neue Korrektur eine weitere Zufallszahl. Dieses Delta ist
  fuer die Filterinvariante erforderlich und auf diesen zuvor ungueltigen
  Pfad begrenzt.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist verlinkt und auf
  `implementiert - Review ausstehend` gesetzt.
- Start, Scope, Branch-/Statuscheck, Diff-Risiko und Implementierungsabschluss
  sind im Hauptplan protokolliert.
- Es wurden keine Engine-, Build-, Architektur- oder Nutzerworkflowvertraege
  ausserhalb des dokumentierten Sweep-/Samplingvertrags geaendert; weitere
  Referenzdokumente benoetigen deshalb in diesem Slice kein Update.

## Freigabestatus

Freigegeben durch Gemini am 2026-07-26 nach erfolgreichem adversarialen Review.

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

Ausstehend beziehungsweise optional.

## Review-Antworten von Codex

Review-Findings berücksichtigt; Implementierung vollständig grün.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| O-11 | Akzeptanzkriterien | Verification von `stationary` vs `regime_markov` Sampler-Disjunktion | verifiziert | durch gemeinsamen Dispatcher und Sampler-Signaturen abgesichert |
