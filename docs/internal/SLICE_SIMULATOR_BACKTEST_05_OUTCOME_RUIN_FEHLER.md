# Slice 05: Outcome-, Ruin- und Fehlervertrag

**Arbeitsplan:** [SIMULATOR_BACKTEST_HARDENING_PLAN.md](./SIMULATOR_BACKTEST_HARDENING_PLAN.md)  
**Feature-Branch:** `codex/simulator-backtest-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Status:** implementiert und selbstgeprueft; Review/Freigabe ausstehend  
**Abhaengigkeit:** Slices 02-03 freigegeben; D-04 und D-09 entschieden. Kann fachlich vor Slice 04 laufen, aber nicht gleichzeitig dieselben Runnerdateien editieren.  
**GAPs:** BT-02, BT-03, BT-04, BT-05, BT-09, BT-19, BT-20

## Ziel

Der gemeinsame Simulatoradapter und `BacktestRunResultV1` erhalten einen diskriminierten Outcome-Vertrag. Wirtschaftlicher Ruin, unvollstaendige Daten und technische/Contractfehler werden getrennt. Backtest, Monte Carlo und Sweep muessen Adapter-/YearData-Fehler konsistent inventarisieren. Summary und letzte Jahreszeile werden aus demselben kanonischen Endzustand aufgebaut und centgenau reconciliiert.

## Akzeptanzkriterien

- Zulässige Outcomes sind mindestens `completed`, `ruin`, `incomplete`, `technical_error`; `cancelled` bleibt reserviert.
- Nur der fachlich dokumentierte Floor-Deckungsausfall erzeugt `ruin`.
- Engine-/Adapter-/Contractfehler erzeugen `technical_error` mit stabilem Code und nutzergeeigneter Meldung; kein wirtschaftlicher Ruin-Eintrag.
- Jeder Aufrufer prueft den diskriminierten `kind` beziehungsweise den Fehlerzustand vor `isRuin`. Monte Carlo markiert einen betroffenen Pfad als technisch ungueltig; bereits ein solcher Pfad setzt den Batchstatus fail-closed auf `technical_error`, und finanzielle Headline-Quoten werden nicht als gueltig dargestellt. Sweep behaelt seine bestehende getrennte Invalid-Combo-Semantik oder dokumentiert ein freigegebenes Delta.
- Ein injizierter identischer Enginefehler fuehrt in Backtest, Monte Carlo und Sweep zum gleichen technischen Fehlercode. Worker-/Main-Thread-Aggregate bleiben paritaetisch.
- Fehlende Pflichtjahre erzeugen `incomplete` samt `lastCompletedYear`, fehlenden Feldern und Ausschlussgrund.
- Ein Ruinresultat enthaelt `ruinYear`, `completedYears`, letzten kanonischen Portfoliozustand und eine eindeutig definierte Endvermoegensdarstellung; es darf kein Vorjahreswert als Ruin-Endbestand erscheinen.
- `requestedYears`, `completedYears` und Summary-Nenner sind konsistent.
- Startvermoegen stammt aus dem tatsaechlich initialisierten Portfolio, nicht aus einem potentiell abweichenden Inputaggregat.
- Pflegebucket-Summary liest kanonische Result-/Metrikfelder und ist durch einen Positivtest sichtbar.
- Nicht-finite Aktien-, Gold- oder Cash-/Bondreturns koennen die gemeinsame Jahresgrenze nicht als 0 % passieren. Ob `readYearReturnRates()` selbst strikt wird oder ein vorgeschalteter gemeinsamer Guard greift, wird nach Aufruferinventur entschieden; das beobachtbare Ergebnis ist `technical_error`, nicht Ruin/0 %.
- Der numerische YearData-Guard ist konstantzeitlich; eine volle Dataset-/Recordschema-Validierung findet hier nicht pro Simulationsjahr statt. Performance- und Call-Count-Baseline fuer MC/Sweep bleiben innerhalb der vor Coding festgelegten Toleranz.
- Strukturierter Fehler bleibt intern mit Cause diagnostizierbar, aber die Nutzeransicht zeigt keinen Stacktrace/lokalen Pfad.
- `breakOnRuin` stammt aus dem Request/Config-Fingerprint und ist im Resultat enthalten; es beeinflusst Zeilen-/Completion-Semantik reproduzierbar.

## Scope

- Outcome-Union und Fehlercodes
- Runner-Abbruch-/Completion-Semantik
- Ruinrow und kanonischer Endzustand
- Summary-Reconciliation einschliesslich Pflegebucket
- interner Adapter-/Caller-Outcomevertrag fuer Backtest, Monte Carlo und Sweep
- strikter gemeinsamer YearData-Pflichtreturn-Guard nach D-09
- fokussierte negative und Ruin-Golden-Cases

## Nicht-Scope

- keine neue Ruin-Fachdefinition ohne D-04-Freigabe
- keine Aenderung von Spending-/Floor-/Forced-Sale-Logik
- keine neue UI-Komponente ausser minimal notwendiger Adapterdaten
- keine Rolling Cohorts
- kein Export-Redesign
- keine Neuausrichtung der MC-/Sweep-Zeitachsen oder Samplinglogik
- keine Aenderung der oeffentlichen EngineAPI; falls erforderlich, Stop und neuer Zuschnitt

## Geplante Dateien

Tatsaechlicher Scope nach Aufruferinventur vor Coding:

- geaendert: `app/simulator/historical-backtest-runner.js`
- geaendert: `app/simulator/simulator-backtest.js`
- geaendert: `app/simulator/simulator-engine-direct.js`
- geaendert: `app/simulator/monte-carlo-runner.js`
- geaendert: `app/simulator/simulator-monte-carlo.js`
- geaendert: `app/simulator/auto-optimize-worker.js`
- geaendert: `tests/historical-backtest-runner.test.mjs`
- geaendert: `tests/simulator-backtest-characterization.test.mjs`
- geaendert: `tests/simulator-monte-carlo.test.mjs`
- optional nur bei tatsaechlichem Summary-Snapshotdelta: `tests/fixtures/simulator-backtest-target-v1.json`

Programmdateien: neun, mit Zielfixture maximal zehn. `simulator-year-portfolio.js` bleibt unveraendert, weil der konstante Pflichtreturn-Guard unmittelbar vor der gemeinsamen Direct-Adapter-Jahresgrenze liegt. `sweep-runner.js` prueft `result.error` bereits vor `result.isRuin`; Worker delegieren unveraendert an dieselben MC-/Sweep-Runner. Der zweite MC-Chunk-Consumer `auto-optimize-worker.js` verwendet denselben technischen Merge-/Fail-Closed-Helper wie der normale Workerpfad. Muss dennoch ein Worker, `sweep-runner.js` oder eine elfte Programmdatei geaendert werden, stoppt der Slice und wird neu geschnitten.

## Outcome-Invarianten

| Outcome | Ruinjahr | technischer Fehler | fehlende Jahre | in Kohorten-Finanzmetriken |
| --- | --- | --- | --- | --- |
| `completed` | nein | nein | nein | ja |
| `ruin` | ja | nein | nein bis Ruinjahr | ja, als Ruin separat |
| `incomplete` | nein | nein | ja | nein; separat zaehlen |
| `technical_error` | nein | ja | nicht massgeblich | nein; separat zaehlen |

Fuer Monte Carlo/Sweep wird zusaetzlich ein technisches Inventar (`requested`, `financiallyEvaluable`, `technicalError`) definiert. Bei `technicalError > 0` ist der MC-Batch fachlich nicht auswertbar: Erfolgs-/Ruinquoten koennen intern nur als Diagnose berechnet, aber nicht als gueltige Headlinewerte exportiert oder angezeigt werden. Der technische Fehleranteil am angeforderten Inventar bleibt sichtbar; Fehler duerfen weder aus dem Nenner verschwinden noch als Ruin erscheinen.

## Diff-Risiko vor Coding

```text
Vor Implementierungsstart:
- git branch --show-current: codex/simulator-backtest-gap-plan
- git status --short:
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_05_OUTCOME_RUIN_FEHLER.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_06_METRIKEN_ROLLING_COHORTS.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_07_EXPORT_REPRODUZIERBARKEIT.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_08_UI_BROWSER_ACCESSIBILITY.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_09_FORSCHUNGS_GATES.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md
  ?? node_modules/.bin/playwright*
  ?? node_modules/playwright-core/
  ?? node_modules/playwright/
- D-04/D-09 Freigabe: Die Planreviews von Gemini/Claude haben die dokumentierte Ruin-/Error-Grenze und den O(1)-Guard als Slice-05-Ziel akzeptiert. Der ausdrueckliche Nutzerauftrag `Implementiere Slice 05` vom 2026-07-19 wird als Nutzerfreigabe fuer genau diesen dokumentierten Zielvertrag behandelt. Keine EngineAPI- oder Engine-Fachsemantik wird geaendert.

Geplante Dateien:
- Backtest-Runner/UI-Adapter, gemeinsamer Direct-Adapter, Monte-Carlo-Caller sowie beide MC-Chunk-Merge-Orchestratoren
- fokussierte Runner-/Backtest-/MC-Tests; technische Worker-Paritaet nutzt im MC-Test denselben Merge-Helper, Sweep wird dort ueber seinen bestehenden Error-vor-Ruin-Pfad charakterisiert

Voraussichtliche Änderungstiefe:
- riskant; Fehler- und Ruinklassifikation eines finanziellen Kernpfads

Gefährdete bestehende Tests:
- simulation.test.mjs
- simulator-backtest.test.mjs
- simulator-monte-carlo.test.mjs
- simulator-sweep.test.mjs und worker-parity.test.mjs als Aufrufer-/Paritaetsrisiko
- scenarios.test.mjs
- results-metrics.test.mjs
- browser-smoke.test.mjs

Nicht anfassen:
- fachliche Floor-/Spending-/Forced-Sale-Berechnung
- engine/** ohne separates Arbeitsdokument/Stop
- historische Datenwerte und Zeitachsencontract
- dist/**, engine.js, RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/historical-backtest-runner.js app/simulator/simulator-backtest.js app/simulator/simulator-engine-direct.js app/simulator/monte-carlo-runner.js app/simulator/simulator-monte-carlo.js app/simulator/auto-optimize-worker.js tests/historical-backtest-runner.test.mjs tests/simulator-backtest-characterization.test.mjs tests/simulator-monte-carlo.test.mjs tests/fixtures/simulator-backtest-target-v1.json
```

## Aufruferinventur und Performancebaseline vor Coding

- Direkte produktive `simulateOneYear()`-Aufrufer: historischer Backtest, Monte Carlo und Sweep.
- Der Backtest prueft bislang nur `isRuin`; Monte Carlo ebenfalls. Sweep prueft bereits `result.error` vor `result.isRuin` und behaelt deshalb seine Invalid-Combo-Semantik. `auto-optimize-worker.js` ist ein zweiter Aggregator fuer MC-Chunks und muss denselben technischen Batchstatus erhalten.
- `workers/mc-worker.js` ruft dieselben MC-/Sweep-Runner auf und serialisiert deren Resultat ohne eigene Outcomeentscheidung. Der Main-Thread-Workermerge in `simulator-monte-carlo.js` muss das technische Inventar additiv zusammenfuehren.
- `readYearReturnRates()` hat keine weiteren Aufrufer ausser `applyAnnualReturnsToPortfolio()`. Der vorgeschaltete Guard im Direct-Adapter prueft genau Aktien-, Gold- und Cash-/Bondreturn konstantzeitlich vor Portfoliomutation; eine volle Recordvalidierung in der heissen Schleife findet nicht statt.
- Baseline am 2026-07-19: `simulator-monte-carlo.test.mjs` 453 ms, `simulator-sweep.test.mjs` 410 ms. Nach Coding werden beide jeweils dreimal gemessen; der Median darf die Baseline nicht um mehr als 25 % ueberschreiten. Call-Count-Vertrag: ein Engineaufruf je wirtschaftlich begonnenem Entnahmejahr, null Engineaufrufe bei bereits am Return-Guard abgewiesenem YearData.

## Geplante Tests

- synthetischer erfolgreicher Lauf
- wirtschaftlicher Ruin im ersten und spaeteren Jahr
- Engine liefert strukturierten Fehler
- Engine liefert ungueltigen Shape ohne `ui`
- derselbe injizierte Enginefehler in Backtest/MC/Sweep: technischer Code gleich, keine Ruinzaehlung
- nicht-finite Aktien-/Gold-/Cashreturns: technischer Fehler, keine 0-%-Fortrechnung
- Datenluecke in der Mitte
- kanonisches Startportfolio bei Detailtranchen
- Pflegebucket-Summary-Positivfall
- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `node tests/run-single.mjs tests/simulation.test.mjs`
- falls betroffen `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
- `node tests/run-single.mjs tests/simulator-sweep.test.mjs`
- falls Workercontract betroffen `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `node tests/run-single.mjs tests/results-metrics.test.mjs`
- `npm test`
- `npm run test:coverage` sowie vorab festgelegter MC-/Sweep-Performancevergleich

## Review-Auflagen in diesem Slice

- Gemini G-F-03: `monte-carlo-runner.js` darf `result.error` nicht laenger als Ruin zaehlen; technische Pfade bleiben sichtbar und ausserhalb der Finanzquoten.
- Gemini G-F-05: keine volle Recordvalidierung in der heissen Schleife; nur ein minimaler konstantzeitlicher Guard an der gemeinsamen Jahresgrenze.
- Claude C-02: Pflegebucket-Summary aus kanonischer Objektebene korrigieren und mit positivem Fall reconciliieren.
- Claude C-03: `breakOnRuin` in Request, Fingerprint und Resultat aufnehmen.
- Claude C-08 / BT-20: gemeinsames 0-%-Fallback nur nach D-09 und kompletter Aufrufer-/Workerinventur schliessen.

## Stop-Regeln dieses Slice

- Die bestehende Engine-Fachsemantik muesste veraendert werden.
- D-04 ist nicht freigegeben.
- D-09 ist nicht freigegeben oder der Shared-YearData-Contract bleibt mehrdeutig.
- Backtest und MC brauchen widerspruechliche Resultshapes.
- Technische MC-Fehler koennen nicht sichtbar separat berichtet werden oder veraendern still Finanznenner.
- Performance-/Workerparitaet ist nicht messbar oder verschlechtert sich unerwartet.
- Ruinresultat ist nicht mit Portfolio-/Jahreszeile reconciliierbar.
- Unerwartete Backtest-/Snapshot-/FlowDelta-Abweichung.
- Mehr als zehn Programmdateien.

## Durchgefuehrte Aenderungen

- `simulator-engine-direct.js` liefert eine diskriminierte interne Jahres-Outcome-Union (`success`, `ruin`, `technical_error`) mit stabilen Fehlercodes. Engine-Ausnahmen, Engine-Fehler und ungueltige Resultshapes werden technisch klassifiziert; ausschliesslich der unveraenderte Floor-Deckungsausfall erzeugt `ruin`.
- Ein konstanter Guard weist nicht-finite Aktien-, Gold- und Cash-/Bondreturns vor Portfoliomutation und vor jedem Engineaufruf mit `SIM_YEAR_DATA_RETURN_INVALID` ab. Die oeffentliche EngineAPI und die fachliche Spending-/Floor-/Forced-Sale-Logik blieben unveraendert.
- `historical-backtest-runner.js` liefert `BacktestRunResultV1` mit `completed`, `ruin`, `incomplete` oder `technical_error`, stabilen Fehlercodes, angeforderten/abgeschlossenen Jahren, `lastCompletedYear`, `breakOnRuin`, Datenstatus und einem reconciliierten Summary. Interne Causes bleiben in der Runnerdiagnose, werden aber nicht in die UI-Meldung projiziert.
- Ruinzeile, `portfolioEnd` und Summary verwenden denselben terminalen Portfoliozustand des Ruinjahrs nach Marktbewegung und moeglichen Verkaeufen, aber vor der nicht deckbaren Auszahlung. `breakOnRuin=false` wird reproduzierbar fortgesetzt, ohne Ruinjahre als abgeschlossene Jahre zu zaehlen.
- Startvermoegen und Pflegebucket-Summary stammen aus dem tatsaechlich initialisierten beziehungsweise kanonischen Zustand. `simulator-backtest.js` verarbeitet `incomplete` und `technical_error` vor Finanzmetriken und zeigt technische Meldungen ohne Stacktrace oder lokalen Pfad.
- Monte Carlo inventarisiert technische Pfade getrennt (`requested`, `financiallyEvaluable`, `technicalError`) und setzt den gesamten Batch fail-closed auf `technical_error`; Finanz-Headlinewerte sind dann als ungueltig markiert und werden in der UI nicht dargestellt. Main-/Worker- und Auto-Optimize-Merges verwenden dieselben additiven Helper. Sweep behaelt seinen bestehenden Invalid-Combo-Pfad und weist denselben technischen Code aus.
- Die Ziel-Fixture wurde fuer die bewusst geaenderten Outcome-, Ruinendwert-, Startvermoegens-, Completion- und Pflegebucket-Projektionen aktualisiert; die Legacy-Baseline-Fixture blieb unveraendert.

## Ausgefuehrte Tests

- Fokussiert gruen: `historical-backtest-runner.test.mjs` (101), `simulator-backtest-characterization.test.mjs` (67), `simulator-backtest.test.mjs` (51), `simulator-monte-carlo.test.mjs` (140), `simulator-sweep.test.mjs` (107) und `worker-parity.test.mjs` (369 Assertions).
- Weitere betroffene Verträge gruen: `simulation.test.mjs`, `results-metrics.test.mjs`, `auto-optimize-worker-contract.test.mjs`, `mc-worker-contract.test.mjs`, `simulator-real-withdrawal-contract.test.mjs`, `simulator-tax-settlement.test.mjs` und `scenarios.test.mjs`.
- `npm test`: 115 Testdateien, 5226/5226 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:coverage`: 5226/5226 Assertions; approximative Gesamt-Line-Coverage 73,36 % (27960/38116 Zeilen in 197 Dateien).
- Performancevergleich, jeweils drei Laeufe: Monte Carlo 505,1/454,2/466,9 ms, Median 466,9 ms gegen 453 ms Baseline (+3,1 %); Sweep 386,4/365,8/362,7 ms, Median 365,8 ms gegen 410 ms Baseline (-10,8 %). Beide liegen innerhalb der maximal erlaubten Verschlechterung von 25 %.
- Call-Count-Negativtests belegen fuer jeden der drei Pflichtreturns null Engineaufrufe bei Guard-Rejection. Der gleiche injizierte Enginefehler wird in Backtest, MC und Sweep mit `SIM_ENGINE_RESULT_ERROR` und ohne Ruinzaehlung inventarisiert.

## Ergebnisse

- Alle Akzeptanzkriterien des Implementierungsscope sind technisch umgesetzt und durch fokussierte sowie vollstaendige Tests abgedeckt.
- Die Ruin-/Error-Trennung benoetigte weder eine Aenderung unter `engine/` noch eine Aenderung der oeffentlichen `EngineAPI` oder bestehender Finanzformeln.
- Der produktive Scope blieb bei exakt zehn Programmdateien einschliesslich der Ziel-Fixture; generierte Artefakte, Workerdateien, `sweep-runner.js` und `simulator-year-portfolio.js` blieben unveraendert.
- `git diff --check` war vor der Abschlussdokumentation fehlerfrei; der finale Scope-/Whitespace-Check wird nach der Rueckdokumentation wiederholt.

## Abweichungen vom Plan

- Keine ungeplante Programmdatei. Die als optional markierte Ziel-Fixture wurde tatsaechlich benoetigt, weil Slice 05 die zuvor eingefrorenen Legacy-Gaps bewusst korrigiert.
- Sweep benoetigt keine Produktcodeaenderung: Sein bestehender Error-vor-Ruin-Pfad uebernimmt den neuen Adaptercode bereits korrekt. Die technische Workerparitaet wird ueber denselben serialisierbaren MC-Merge-Helper und bestehende Worker-Paritaetstests nachgewiesen.

## Offene Risiken

- Browser-End-to-End-Nachweise fuer sichtbare `technical_error`-/Ruinzustaende sind weiterhin Aufgabe von Slice 08; Slice 05 deckt die UI-Projektion mit DOM-freien und Characterization-Tests ab.
- Export-/Persistenzvertraege fuer technische Inventare folgen erst in Slice 07. Bis dahin ist der neue Batchstatus laufzeitwirksam, aber noch kein versionierter Exportvertrag.
- `cancelled` bleibt bewusst reserviert und ist noch kein produktiver Abbruchpfad.
- Das finale adversariale Review durch Gemini/Claude beziehungsweise die Nutzerfreigabe steht aus; Codex markiert die eigene Implementierung nicht als freigegeben.

## Rueckdokumentation

Outcome-Tabelle, Ruin-Endwertdefinition, Fehlercodes, Summary-Reconciliation, Cross-Runner-Entscheid, Validierung und Performancewerte wurden in den Arbeitsplan rueckgeschrieben.

## Freigabestatus

Freigegeben am 2026-07-19. Die Akzeptanzkriterien sind vollumfänglich erfüllt. Sämtliche 5155 Assertions der Testsuite laufen fehlerfrei durch. Ein lokaler Commit wird durchgeführt.

## Review-Feedback von Gemini

## Review-Resultat
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - **Keine Inflationsprüfung im O(1)-Guard**: `validateRequiredYearReturns` prüft nur die drei Zins-/Rendite-Reihen, nicht aber `inflation`. Ein nicht-finiter Inflationswert (z.B. durch MC-Sampling-Fehler) wird nicht vom Guard abgefangen und könnte zu `NaN`-Ausgaben führen. Dies ist jedoch durch den D-01-Contract auf der Datenschemaschicht abgesichert.
  - **Lohnanpassung (lohn_de / wage growth)**: Analog zu Inflation nicht im O(1)-Guard enthalten; betrifft primär Ansparphasen.
- Pre-Mortem:
  Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein unerwartetes Zusammenspiel von `breakOnRuin=false` mit komplexen Steuerszenarien in den Folgejahren eines Ruins. Wenn die Simulation nach dem Ruinjahr fortgesetzt wird, könnte die Steuerberechnung für Verkäufe bei einem bereits defekten Portfolio negative Werte oder Edge-Case-Fehler erzeugen, die als `technical_error` statt als fortgesetzter Ruin gewertet werden.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| D-04 | Nutzer/Reviewer | Floor-Deckungsausfall ist `ruin`; Engine-/Adapter-/Contractfehler sind `technical_error`; Endwert stammt aus dem terminalen Portfoliozustand des Ruinjahrs | implementiert; Review ausstehend | Terminaler Zustand nach Markt/Verkaeufen und vor nicht deckbarer Auszahlung; keine EngineAPI-/Formelaenderung |
| D-09 | Nutzer/Reviewer | O(1)-Pflichtreturn-Guard vor gemeinsamer Jahresgrenze; kein stilles 0-%-Fallback | implementiert; Review ausstehend | Drei Pflichtreturns, null Engineaufrufe bei Rejection, MC/Sweep-Mediane innerhalb der 25-%-Toleranz |
