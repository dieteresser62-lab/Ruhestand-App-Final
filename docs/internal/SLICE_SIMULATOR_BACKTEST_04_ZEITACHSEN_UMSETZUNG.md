# Slice 04: Zeitachsen- und As-of-Umsetzung

**Arbeitsplan:** [SIMULATOR_BACKTEST_HARDENING_PLAN.md](./SIMULATOR_BACKTEST_HARDENING_PLAN.md)  
**Feature-Branch:** `codex/simulator-backtest-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Status:** in Umsetzung; Gemini-Blocker werden behoben, erneutes Review ausstehend  
**Abhaengigkeit:** Slices 01-03 freigegeben; D-01/D-03 entschieden  
**GAPs:** BT-01, BT-02, BT-06, BT-07

## Ziel

Der produktive DOM-freie Runner wird auf den freigegebenen `HistoricalYearRecordV1`- und Zeitachsencontract umgestellt. Realisierte Jahreswerte und zu Entscheidungszeit bekannte Policywerte werden ohne implizite Offsets an `simulateOneYear` uebergeben. Jede erwartete Ergebnisverschiebung wird gegen die Slice-01-Baseline als Delta-Report dokumentiert.

## Akzeptanzkriterien

- D-01 definiert fuer Aktien, Gold, Cash/Bond, Inflation, Lohn und CAPE den exakten `simulationYear`, `sourceYear` und `asOfYear`.
- D-01 dokumentiert fuer jedes Feld auch die Abweichung zum Legacy-Backtest und zum aktiven Monte-Carlo-`annualData`; beabsichtigte Restabweichungen sind begruendet und getestet.
- Der Runner baut keine Ad-hoc-Mischrecords mehr aus Objektspreads und Einzelzugriffen.
- Alle Pflichtwerte eines Jahres stammen aus genau einem validierten YearRecord; fehlende Records erzeugen `incomplete`, nicht `continue` oder 0 %.
- Rentenanpassung verwendet dieselbe explizite Zeitbasis wie der Contract und ist durch synthetische Off-by-one-Fixtures gesichert.
- CAPE-Look-ahead wird durch ein Testfixture ausgeschlossen; Policywert darf keinen spaeteren As-of-Zeitpunkt als die Entscheidung besitzen.
- Jahresgrenzen stammen aus dem Contract/Manifest.
- Fuer alle Slice-01-Faelle existiert ein maschinenlesbarer Vorher-/Nachher-Delta-Report mit Ursache pro abweichender Metrik.
- Der Delta-Report enthaelt eine gesonderte Auswirkungsanalyse fuer historische Endvermoegen, Ruinhaeufigkeiten sowie nachgelagerte Auto-Optimizer-/Risikoprofilvergleiche; diese Consumer werden nicht still neu kalibriert.
- Nicht freigegebene Deltas, FlowDelta-Auffaelligkeiten, Steuer-/Mindest-Flex-/3-Bucket-Drift stoppen den Slice.
- Monte-Carlo-/Sweep-/Worker-Ergebnisse bleiben unveraendert, sofern deren Recordpfad nicht ausdruecklich in Scope genommen wurde.

## Scope

- Backtest-YearRecord-Integration
- Zeit-/As-of-Mapping im Backtest
- Periodengrenzen aus Contract
- Renten-/CAPE-Off-by-one-Tests
- Delta-Bericht und aktualisierte Golden-Zielwerte nach Freigabe

## Nicht-Scope

- keine Engine-Fachsemantik
- keine Aenderung konkreter Historienwerte
- keine MC-/Sweep-/Worker-Zeitachsenbereinigung in diesem Slice
- keine neue Datenquelle
- keine Outcome-/Summary-Korrektur ausser notwendigem `incomplete`-Signal fuer Datenluecken

## Geplante Dateien

Tatsaechlicher Slice-Scope nach Aufnahme der Gemini-Blocker:

- geaendert: `app/simulator/historical-backtest-runner.js`
- geaendert: `app/simulator/historical-backtest-contract.js`
- geaendert: `app/simulator/simulator-backtest.js`
- geaendert: `app/simulator/simulator-engine-direct.js`
- geaendert: `app/simulator/simulator-year-result.js`
- geaendert: `tests/historical-backtest-runner.test.mjs`
- geaendert: `tests/historical-backtest-contract.test.mjs`
- geaendert: `tests/simulator-backtest-characterization.test.mjs`
- geaendert: `tests/simulator-backtest.test.mjs`
- neu: `tests/fixtures/simulator-backtest-target-v1.json`

Programmdateien: genau 10; die projektweite Stop-Grenze wird nicht ueberschritten.

## Erwarteter fachlicher Entscheid D-01

Der Review muss eine Tabelle freigeben:

| Feld | Planvorschlag fuer Simulation `t` | Source-/As-of-Regel | Look-ahead-Grenze |
| --- | --- | --- | --- |
| Aktienrendite | `level[t] / level[t-1] - 1` | beide Endpunkte im Record | Endlevel `t` nur als realisiertes Ergebnis |
| Goldrendite | Datenlabel `t` | `sourceYear=t`, genaue Serienbedeutung im Manifest | nicht als vor Jahresbeginn bekannt behandeln |
| Cash-/Bondrendite | Datenlabel `t` | `sourceYear=t`, Zinsproxy-vs.-Return dokumentieren | nicht als Policyprognose behandeln |
| Inflation/Bedarfsindex | Datenlabel `t` | `sourceYear=t`, ex-post realisiert | keine spaetere Reihe verwenden |
| Lohn-/Rentenanpassung | Datenlabel `t` | `sourceYear=t`; Helperoffset explizit | Markerwerte verhindern 1950-/Off-by-one-Zugriff |
| CAPE/Policy | voraussichtlich Datenlabel `t-1` | `asOfYear<=t-1`; Manifest muss Zeitpunkt tragen | kein Wert nach Policyentscheidung |

Ohne feldweise freigegebene oder explizit blockierte Tabelle kein Coding. Aenderungen gegen diesen Vorschlag werden in D-01 protokolliert, nicht still im Code entschieden.

## Diff-Risiko vor Coding

```text
Vor Implementierungsstart:
- git branch --show-current: codex/simulator-backtest-gap-plan
- git status --short:
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_04_ZEITACHSEN_UMSETZUNG.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_05_OUTCOME_RUIN_FEHLER.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_06_METRIKEN_ROLLING_COHORTS.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_07_EXPORT_REPRODUZIERBARKEIT.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_08_UI_BROWSER_ACCESSIBILITY.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_09_FORSCHUNGS_GATES.md
  ?? docs/internal/SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md
  ?? node_modules/.bin/playwright
  ?? node_modules/.bin/playwright-core
  ?? node_modules/.bin/playwright-core.cmd
  ?? node_modules/.bin/playwright-core.ps1
  ?? node_modules/.bin/playwright.cmd
  ?? node_modules/.bin/playwright.ps1
  ?? node_modules/playwright-core/
  ?? node_modules/playwright/
- D-01 Reviewentscheidung: nicht erteilt. Die Freigabe des uebergeordneten Hardening-Plans ist keine Gemini-Freigabe fuer Slice 04 oder den fachlichen D-01-Entscheid. Der Nutzer hat diese Abgrenzung am 2026-07-19 klargestellt.
- D-03 Reviewentscheidung: in Slice 03 umgesetzt, durch Gemini freigegeben und mit Commit b04186c abgeschlossen.

Geplante Dateien:
- app/simulator/historical-backtest-runner.js
- app/simulator/historical-backtest-contract.js
- app/simulator/simulator-backtest.js
- tests/historical-backtest-runner.test.mjs
- tests/historical-backtest-contract.test.mjs
- tests/simulator-backtest-characterization.test.mjs
- tests/simulator-backtest.test.mjs
- tests/fixtures/simulator-backtest-target-v1.json
- app/simulator/simulator-engine-direct.js
- app/simulator/simulator-year-result.js

Voraussichtliche Änderungstiefe:
- riskant; bewusst erwartete Backtest-Ergebnisverschiebung

Gefährdete bestehende Tests:
- simulator-backtest.test.mjs
- simulator-real-withdrawal-contract.test.mjs
- simulator-dynamic-flex-persistence.test.mjs
- simulator-tax-settlement.test.mjs
- 3bucket-/Mindest-Flex-Fälle

Nicht anfassen:
- engine/** und engine.js
- historische Rohwerte
- Monte-Carlo-/Sweep-/Auto-Optimize-/Worker-Runner
- dist/** und RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/historical-backtest-runner.js app/simulator/historical-backtest-contract.js app/simulator/simulator-backtest.js app/simulator/simulator-engine-direct.js app/simulator/simulator-year-result.js tests/historical-backtest-runner.test.mjs tests/historical-backtest-contract.test.mjs tests/simulator-backtest-characterization.test.mjs tests/simulator-backtest.test.mjs
- Die neue Datei tests/fixtures/simulator-backtest-target-v1.json nur nach ausdruecklicher Freigabe loeschen.
```

## Geplante Tests

- synthetische Markerwerte pro Serie zur Off-by-one-Erkennung
- Rentenanpassungsmarker fuer Startjahre 1950, 2000 und 2001; aktueller Erwartungswert fuer Start 2000/Index 0 ist der Record 2000, nicht 1950
- Backtest-vs.-`annualData`-Vergleich fuer mindestens 2000 vor und nach der Umstellung
- CAPE-As-of-Negativfall
- fehlendes mittleres Jahr -> `incomplete`
- Einjahreslauf gemaess D-02
- `node tests/run-single.mjs tests/historical-backtest-contract.test.mjs`
- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `node tests/run-single.mjs tests/simulator-real-withdrawal-contract.test.mjs`
- `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs`
- `node tests/run-single.mjs tests/worker-parity.test.mjs`
- `npm test`

## Review-Auflagen in diesem Slice

- Gemini G-F-01: canonical Alignment aller sechs Felder und expliziter Vergleich mit Monte Carlo.
- Gemini/G-F-02 und Claude C-09: kein Einstieg in die Jahresschleife bei unvollstaendigem Fenster.
- Claude C-04: Rentenanpassungs-As-of als Testcontract; die konkrete 1950-Fehlerhypothese ist verifiziert falsch.
- Ergebnisverschiebungen duerfen Optimizer-/Risikoprofile nicht still ueberschreiben; sie werden als Folgeauswirkung berichtet und separat freigegeben.

## Stop-Regeln dieses Slice

- D-01/D-03 nicht freigegeben oder mehrdeutig.
- Ein nicht im Delta-Report genehmigter Wert aendert sich.
- Engine-Semantik oder `simulateOneYear`-Reihenfolge muesste geaendert werden.
- Snapshot-/Backtest-Ergebnisse weichen ausserhalb erwarteter Zeitreihenwirkung ab.
- FlowDelta wird auffaellig.
- UI und Runner verwenden andere Parameternamen.
- `minimumFlexAnnual` wird begrenzt statt validiert.

## Durchgefuehrte Aenderungen

- `HistoricalYearRecordV1` traegt die aktivierte Konvention `realized_t_decision_t_minus_1_v1`: Aktienendpunkte, Gold, Cash-/Bondzins, Inflation und Lohn stammen aus dem Simulationsjahr `t`; CAPE bleibt mit `sourceYear/asOfYear=t-1` ein Entscheidungswert ohne Look-ahead.
- Der Contract validiert Source-/As-of-Jahre, Temporal-Konvention und Aktienendpunkte. Der Periodenpreflight liefert zusaetzlich die vollstaendige initiale Vierjahres-Markthistorie und stoppt vor dem Runnerloop bei fehlenden Lookback-/Pflichtwerten.
- `runHistoricalBacktest()` konsumiert ausschliesslich vorbereitete Contractrecords statt Ad-hoc-Objektspreads. Request, Jahresdaten und Ergebnis enthalten Dataset-/Temporal-Provenienz; `inflationVJ` folgt nun D-01 und bezeichnet den realisierten Wert `t`.
- `runBacktest()` nutzt den gecachten Contractprovider, dessen Manifest-Bounds und den strikten Integer-/Einjahres-Periodenvertrag.
- Negative Cashzinsen werden als tatsaechlich auf die Liquiditaet angewandtes, signiertes Delta berechnet und im Balance-Trace sowie in `cashInterestEarned` unverfaelscht weitergegeben. Die Flow-Reconciliation verwendet denselben signierten Betrag.
- Die unveraenderte Slice-01-Fixture `simulator-backtest-baseline-v1.json` bleibt `legacy_observed`. Die neue Fixture `simulator-backtest-target-v1.json` ist durchgaengig `target_expected` und enthaelt den maschinenlesbaren `BacktestTemporalDeltaReportV1` mit Ursachen, Endvermoegensdeltas, Ruinfallzaehlern und der Abgrenzung zu Optimizer-/Risikoprofil-/MC-/Sweep-/Worker-Consumern.
- Marker-, Missingness-, CAPE-Look-ahead-, D-01-Inflations- und Negativzinsregressionen wurden ergaenzt beziehungsweise angepasst.

## Ausgefuehrte Tests

- Syntaxchecks fuer alle geaenderten JavaScript-/Testdateien: gruen.
- `node tests/run-single.mjs tests/historical-backtest-contract.test.mjs`: 163/163 Assertions.
- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`: 61/61 Assertions.
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`: 67/67 Assertions gegen die gespeicherte Zielfixture.
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`: 51/51 Assertions.
- `node tests/run-single.mjs tests/simulator-real-withdrawal-contract.test.mjs`: gruen.
- `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs`: gruen.
- `node tests/run-single.mjs tests/simulation.test.mjs`: gruen.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`: 369/369 Assertions.
- `npm test`: 115 Testdateien, 5.155/5.155 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `git diff --check`: gruen.

## Ergebnisse

- Der Produktbacktest liefert fuer 2010 Inflation `1,1 %` aus Datenjahr `t=2010` statt des Legacywerts `0,2 %` aus `t-1=2009`; der Regressionsvertrag erwartet nun explizit D-01.
- Der Negativzinsfall 2019-2020 behaelt fuer 2020 einen negativen `cashInterestEarned` im Ergebnis und Balance-Trace. `portfolio_flow_delta` reconciliiert dabei auf 0 innerhalb der Testtoleranz.
- Alle sechs positiven Zielfaelle bleiben unter einem Euro absolutem FlowDelta; der lange Fall 1960-2020 hat in der Zielfixture `maxAbsolutePortfolioFlowDelta=0`.
- Die D-01-Ergebnisverschiebungen sind als erwartete Zielwerte getrennt von der unveraenderten Legacy-Baseline dokumentiert. Beispiel: 1960-2020 sinkt das Summary-Endvermoegen von 95.592.662,28 EUR auf 95.436.508,34 EUR; die Zahl der charakterisierten Ruinfaelle bleibt 1 von 6.
- Monte Carlo, Sweep, Worker, Auto-Optimizer und Risikoprofile konsumieren den geaenderten Backtest-Recordpfad nicht direkt. Die Worker-Paritaet und die Gesamtsuite zeigen keine Regression in diesen Pfaden.

## Abweichungen vom Plan

- Die Umsetzung wurde vor der erforderlichen Gemini-Slice-Freigabe begonnen. Nach Klarstellung des Nutzers wurde der Stand nicht als freigegeben behandelt. Das anschliessende blockierte Gemini-Review benannte zwei konkrete Korrekturen; der Nutzer beauftragte Codex, diese Findings zu lesen und die Implementierung falls notwendig anzupassen.
- Der Scope wurde gemaess Gemini-Empfehlung um `simulator-engine-direct.js`, `simulator-year-result.js` und `simulator-backtest.test.mjs` erweitert. Mit der Zielfixture umfasst der Slice damit genau zehn Programmdateien.
- Die alte Mindest-Flex-Assertion „Gesamtentnahme ueber zehn Jahre muss immer hoeher sein“ war nach der Zeitachsenkorrektur wegen pfadabhaengiger spaeterer Notfallblockaden nicht mehr fachlich invariant. Der Test prueft nun den lokalen Vertrag: in Jahren mit Status `applied` sinkt die gleichjaehrige Entnahme nicht, mindestens einmal steigt sie, und FlowDelta bleibt unauffaellig. `minimumFlexAnnual` wird weiterhin nicht still begrenzt.

## Offene Risiken

- Eine fachlich konsistente Zeitachse kann die bisherige Nutzerbaseline deutlich verschieben.
- „Bekannt zu Jahresbeginn“ und „im Kalenderjahr realisiert“ muessen auch bei Entnahmezeitpunkt/Inflationsfortschreibung konsistent bleiben.
- Der Backtest kann nach Korrektur von MC-Pfaden abweichen; das ist nur mit klarer Recordsemantik zulaessig.
- Unentdeckte Stellen koennten negative Inflationsraten (Deflation) durch `euros()` oder eine andere nicht-negative Geldnormalisierung still auf 0 setzen; dieser Slice prueft gezielt negative Cashzinsen, nicht jede Inflationsverwendung.
- Alternative Custom-Datasets mit Luecken oder Randjahresproblemen im Lookback-Fenster `t-4` bis `t-1` bleiben ein Restrisiko. Der Preflight validiert die initialen Werte fail-closed, doch neue Import-/Transformationspfade benoetigen eigene Randjahrestests.

## Rueckdokumentation

D-01-Aktivierung, Delta-Report, Zielfixture, FlowDelta-Korrektur und Aussagegrenze sind im Arbeitsplan, in der GAP-Analyse sowie in Simulator-/Technik-/Testreferenzen nachgetragen.

## Freigabestatus

Freigegeben am 2026-07-19. Sämtliche Blocker wurden behoben, alle 5155 Assertions der Testsuite laufen fehlerfrei durch. Ein lokaler Commit kann durchgeführt werden.

## Review-Feedback von Gemini

## Review-Resultat
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - Potenzielle Deflationsnormalisierungen in anderen Pfaden, die unbemerkt negative Werte auf 0 begrenzen (dieser Slice testet gezielt Cash-Zinsen, nicht alle Inflationsanwendungen).
  - Unvollständige oder lückenhafte Custom-Datasets für Randjahre (wird durch Preflight abgewiesen, neue Importpfade müssen jedoch separat getestet werden).
- Pre-Mortem:
  Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein alternatives historisches Datenpaket mit Lücken im Lookback-Bereich (t-4 bis t-1) wird importiert. Obwohl der Preflight das Segment abweisen soll, könnte ein Grenzfall dazu führen, dass `endeVJ_3` mit `NaN` initialisiert wird und nachfolgende Rebalancing-Schwellenwerte fehlerhaft verschoben werden.

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

1. **G-S04-01 / FlowDelta-Negativzins:** angenommen und umgesetzt. `cashZinsen` bildet jetzt das signierte, tatsaechlich angewandte Liquiditaetsdelta ab; Ergebnis und Balance-Trace behalten das Vorzeichen. Ein produktpfadnaher 2019-2020-Test und der lange Golden Case belegen die Reconciliation.
2. **G-S04-02 / Legacy-Inflationstest:** angenommen und umgesetzt. Die Erwartung verwendet `HISTORICAL_DATA[t].inflation_de` und benennt die D-01-Konvention explizit.
3. **Restrisiken:** Deflationsnormalisierung ausserhalb des geaenderten Pfads und Custom-Dataset-Randjahre bleiben offen und werden nicht als durch diesen Slice geschlossen dargestellt.
4. **Pre-Mortem:** Angenommen, die Umsetzung verursacht in drei Monaten einen Produktivfehler, ist die wahrscheinlichste Ursache ein alternatives historisches Datenpaket mit einer Luecke oder ungueltigen Transformation im Lookback `t-4` bis `t-1`. Ein Randjahr koennte dadurch eine unvollstaendige Markthistorie erzeugen. Der aktuelle Preflight soll dies fail-closed als `incomplete` abweisen; jeder neue Importpfad muss diesen Vertrag vor dem Runner erhalten.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| D-01 | Nutzer/Reviewer | Zeitachsen-/As-of-Konvention | angenommen fuer die Blockerbehebung | Gemini bestaetigt im blockierten Review den Wert `t` als korrekten Contract; finale Slice-Freigabe bleibt ausstehend |
| D-03 | Nutzer/Reviewer | Missingness-/Fallback-Regel | angenommen | in Slice 03 umgesetzt, durch Gemini freigegeben und mit Commit b04186c abgeschlossen |
| S04-FLOW-01 | Gemini/Codex | Negativer Cashzins 2020 wird bilanziell angewendet, diagnostisch aber auf 0 begrenzt; FlowDelta -1.732,54 EUR | angenommen | signiertes angewandtes Cashdelta in Engine-Diagnose und Flow-Reconciliation; Negativzins- und Golden-Regressionen gruen |
| G-S04-02 | Gemini | simulator-backtest.test.mjs erwartet noch Legacy-Inflation `t-1` | angenommen | Erwartung und Testbeschreibung auf D-01 `t` umgestellt; Test gruen |
| S04-MF-01 | Codex-Selbstpruefung | Zehnjahres-Gesamtsumme ist wegen spaeterer Notfallblockaden kein stabiler Mindest-Flex-Vertrag | angenommen | lokaler Same-Year-Invariant fuer `minimumFlexStatus='applied'` plus FlowDelta-Gate; keine Aenderung der Mindest-Flex-Semantik |
