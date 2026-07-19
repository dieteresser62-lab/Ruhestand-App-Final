# Slice 06: Metriken und Rolling-Cohort-Diagnose

**Arbeitsplan:** [SIMULATOR_BACKTEST_HARDENING_PLAN.md](./SIMULATOR_BACKTEST_HARDENING_PLAN.md)  
**Feature-Branch:** `codex/simulator-backtest-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Status:** freigegeben; Gemini-Review abgeschlossen, lokal committed als `04dcafc`
**Abhaengigkeit:** Slices 04-05 freigegeben  
**GAPs:** BT-10, BT-11, BT-13, BT-18, BT-19

## Ziel

Aus `BacktestRunResultV1` wird verpflichtend ein versioniertes, reconciliierbares Ergebnisbuendel abgeleitet. Optional wird nach D-05 ein DOM-freier Rolling-Cohort-Modus implementiert, der alle zulässigen Startjahre mit identischer Horizontlaenge auswertet und Outcomes getrennt aggregiert. Ein ausstehender oder negativer D-05-Entscheid blockiert nicht den Metrikteil; Cohorts werden dann explizit `deferred`.

Rolling Cohorts bleiben eine In-sample-Diagnose ueber ueberlappende historische Fenster. Der Slice darf sie weder „Erfolgswahrscheinlichkeit“ noch unabhaengige Validierung nennen.

## Akzeptanzkriterien

- Jede Metrik besitzt ID, Label, Einheit, nominal/real, Vorzeichen, Aggregationsregel, Nenner, Rundung, Missingness- und Outcome-Regel.
- Mindestens folgende Dimensionen werden, soweit aus dem Jahreslog verlustfrei ableitbar, abgedeckt:
  - Start-/Endvermoegen und reale Endvermoegenssicht,
  - Floor-Shortfall: Auftreten, reale Hoehe, kumulierte Hoehe und Dauer,
  - Flex-Kuerzung: Jahre, Tiefe und laengster Streak,
  - Liquiditaets-/Runway-Stress,
  - Max Drawdown mit expliziter Bezugsreihe,
  - Steuern und Verlusttopfwirkung,
  - Ruin-/incomplete-/technical-error Status.
- Jede Summary-Metrik ist aus den exportierten Rohjahreszeilen reproduzierbar; Reconciliation-Tests verwenden Golden Cases.
- Fuer die Kuerzungsmetrik wird vor Coding festgelegt, ob exakt 10 % enthalten ist. Operator, technische Metrik-ID, Label, Summary, Raw-Export und Test verwenden danach dieselbe Definition.
- Pflegebucket-Metriken werden ausschliesslich aus kanonischen Resultfeldern aggregiert; kein Rueckgriff auf eine abweichende Log-Objektebene.
- Rolling Cohorts verwenden eine feste inklusive Horizontdefinition und nur Records, die den Contract erfuellen.
- Ergebnis enthaelt `eligible`, `completed`, `ruin`, `incomplete`, `technicalError` und explizite Ausschlussgruende. Fehler-/Incomplete-Cohorts verschwinden nicht aus dem Inventar.
- Ueberlappende Fenster und In-sample-Charakter werden im Resultat/Descriptor markiert.
- Keine Aggregation teilt durch nur erfolgreiche Runs, wenn der Metrikcontract alle angeforderten Cohorts als Nenner fordert.
- Single-Path-Metriken bleiben mit dem bisherigen sichtbaren Summary kompatibel oder ihr genehmigtes Delta ist dokumentiert.
- Runner, Metriken und Cohort-Logik sind DOM-frei.

## Scope

- Backtest-Metrikdescriptor und Aggregation
- Golden-/Reconciliation-Tests
- optionaler Rolling-Cohort-Runner nach D-05
- Cohort-Inventar und strukturierte Ausschlussgruende
- keine UI-Darstellung; diese folgt in Slice 08

## Nicht-Scope

- keine statistische Unabhaengigkeit ueberlappender Fenster
- keine Erfolgswahrscheinlichkeit oder Safe-Withdrawal-Aussage
- kein Holdout/Out-of-sample-Nachweis
- keine Optimizer-/Sweep-Aenderung
- keine Engine-Semantik
- keine externen Daten oder Kosten

## Geplante Dateien

Voraussichtlich:

- neu: `app/simulator/historical-backtest-metrics.js`
- neu, falls D-05 freigegeben: `app/simulator/historical-backtest-cohorts.js`
- geaendert: `app/simulator/historical-backtest-runner.js`
- neu: `tests/historical-backtest-metrics.test.mjs`
- neu, falls D-05: `tests/historical-backtest-cohorts.test.mjs`
- geaendert: `tests/historical-backtest-runner.test.mjs`

Programmdateien: voraussichtlich 6.

## Pflichtentscheidung D-05

Vor Coding festlegen:

- Rolling Cohorts ja/nein in diesem Feature;
- erlaubte Horizontlaengen und inklusive Jahreszaehlung;
- Behandlung einer Ansparphase innerhalb des festen Horizonts;
- Darstellung von Ruin vs. incomplete/technical error;
- keine automatische Policy-/Parameterauswahl aus Cohort-Ergebnissen.

Faellt D-05 negativ aus oder bleibt offen, wird `historical-backtest-cohorts.js` nicht angelegt. Der Slice schliesst nur Metrikdescriptor/Reconciliation ab und dokumentiert Rolling Cohorts als separates Folgefeature.

Entscheidung vom 2026-07-19:

- Der ausdrueckliche Nutzerauftrag `Implementiere Slice 06` gibt den im freigegebenen Arbeitsplan beschriebenen optionalen Rolling-Cohort-Modus frei.
- `cohortHorizonYears` ist eine positive Ganzzahl. Jedes Fenster zaehlt inklusiv: `endYear = startYear + cohortHorizonYears - 1`.
- Kandidaten sind alle ganzzahligen Startjahre des angeforderten Diagnosebereichs. Nur Fenster, deren Endjahr im Bereich liegt, sind `eligible`; spaetere Kandidaten bleiben mit `insufficient_horizon` im Ausschlussinventar sichtbar.
- Eine konfigurierte Ansparphase wird in jeder Cohort identisch ab `yearIndex = 0` innerhalb desselben festen Horizonts ausgefuehrt; Inputs und Policyparameter werden nicht automatisch veraendert oder aus Cohort-Ergebnissen ausgewaehlt.
- `completed`, `ruin`, `incomplete` und `technical_error` werden getrennt und jeweils gegen alle `eligible` Cohorts gezaehlt. Ueberlappung und In-sample-Charakter sind maschinenlesbare Descriptorfelder.
- Die Kuerzungsgrenze enthaelt exakt 10 %. Kanonischer Operator ist `>= 10`, die technische ID enthaelt `gte_10_pct`, und das Label lautet `Jahre mit Flex-Kuerzung (>= 10 %)`.

## Diff-Risiko vor Coding

```text
Vor Implementierungsstart:
- git branch --show-current: codex/simulator-backtest-gap-plan
- git status --short:
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
- D-05: durch Nutzerauftrag vom 2026-07-19 fuer den dokumentierten Planvorschlag freigegeben

Geplante Dateien:
- `app/simulator/historical-backtest-metrics.js` (neu)
- `app/simulator/historical-backtest-cohorts.js` (neu)
- `app/simulator/historical-backtest-runner.js`
- `app/simulator/historical-backtest-contract.js`
- `app/simulator/simulator-engine-direct.js` (nur additive Ruin-Shortfall-Diagnostik; keine Fachsemantik)
- `app/simulator/simulator-backtest.js` (nur Korrektur des bestehenden 10-%-Summarylabels)
- fokussierte Metrik-/Cohort-/Runner-/Contract-Tests

Voraussichtliche Änderungstiefe:
- riskant; neue Risikometriken und Mehrfachausführung desselben Finanzpfads

Gefährdete bestehende Tests:
- simulator-backtest.test.mjs
- simulator-real-withdrawal-contract.test.mjs
- results-metrics.test.mjs
- simulator-tax-settlement.test.mjs
- 3bucket-/Mindest-Flex-Reconciliation

Nicht anfassen:
- Engine-/Jahressemantik
- MC-/Sweep-/Optimizer-Aggregate
- UI/HTML/CSS
- historische Datenwerte
- engine.js, dist/**, RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/historical-backtest-runner.js app/simulator/historical-backtest-contract.js app/simulator/simulator-engine-direct.js app/simulator/simulator-backtest.js tests/historical-backtest-runner.test.mjs tests/historical-backtest-contract.test.mjs tests/fixtures/simulator-backtest-target-v1.json
- neue Metrik-/Cohort-/Testdateien nur nach Nutzerfreigabe entfernen
```

## Geplante Tests

- synthetische Golden Cases fuer Shortfallhoehe/-dauer, Flexcut, Drawdown, Runway und Steuer
- Reconciliation Jahreszeilen -> Single Summary
- identische Horizontlaenge ueber alle Cohorts
- letztes zulässiges/erstes unzulässiges Startjahr
- Ruin-, incomplete- und technical-error Cohorts im Inventar
- Input-/State-Non-Mutation ueber mehrere Cohorts
- `node tests/run-single.mjs tests/historical-backtest-metrics.test.mjs`
- falls D-05 `node tests/run-single.mjs tests/historical-backtest-cohorts.test.mjs`
- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `node tests/run-single.mjs tests/simulator-real-withdrawal-contract.test.mjs`
- `npm test`

## Review-Auflagen in diesem Slice

- Claude C-05: exakt-10-%-Grenze als Korrektheitscontract aufloesen, nicht nur umbenennen.
- Claude C-06: D-05 blockiert nicht mehr den verpflichtenden Metrikteil.
- Gemini G-F-06: Summary-/UI-/Export-Projektionen muessen dieselben kanonischen Metrik-IDs und Rohwerte verwenden; Rundung ist nur Displaymetadatum.

## Stop-Regeln dieses Slice

- Metrik ist aus Rohjahreszeilen nicht verlustfrei ableitbar.
- Real-/Nominaleinheit, Nenner oder Drawdown-Bezugsreihe bleiben unklar.
- D-05 nicht freigegeben und Cohortcode soll trotzdem implementiert werden. Der reine Metrikteil darf fortgesetzt werden.
- Cohorts benoetigen unterschiedliche Horizonte oder stilles Auffuellen fehlender Jahre.
- Engine-/Spending-/Ruin-Semantik muesste geaendert werden.
- FlowDelta oder Golden Cases weichen unerwartet ab.

## Durchgefuehrte Aenderungen

- `historical-backtest-metrics.js` definiert `HistoricalBacktestMetricsV1` mit eindeutigen IDs, Labels, Einheiten, nominal/real-Kennzeichnung, Vorzeicheninterpretation, Aggregation, Nenner, reiner Displayrundung, Missingness-, Outcome- und Rohquellenregel. Die unveraenderten Rohwerte liegen unter `metrics.values`; `summary.metrics` referenziert dieselben IDs und Werte.
- Der Metriksatz umfasst Start-/Endvermoegen, reales Endvermoegen, Entnahmen, Floor-Shortfall-Auftreten/-Hoehe/-Realwert/-Dauer, inklusive Flex-Kuerzung `>= 10 %`, Runway-Stress, maximalen Drawdown auf der nominalen Portfolio-Endwertreihe inklusive Pflegebucket, Steuern, Verlusttopfwirkung, Pflegebucket-Endwert und diskriminierte Outcome-Indikatoren.
- `historical-backtest-runner.js` leitet nach jedem Outcome das kanonische Metrikbuendel ab. Bestehende Summaryfelder fuer Vermoegen, Entnahmen, Flex-Kuerzung und Steuern werden aus denselben kanonischen Rohwerten projiziert; incomplete/technical-error erhalten keine erfundenen Finanzwerte.
- `simulator-engine-direct.js` ergaenzt den bestehenden Ruin-Outcome rein diagnostisch um nominal erforderlichen Floor, deckbare Floor-Kapazitaet und die daraus verlustfrei berechnete Fehlhoehe. Ruinentscheidung, Spending-/Forced-Sale-Formeln und oeffentliche EngineAPI blieben unveraendert. Der Runner uebernimmt diese Werte in die kanonische Ruinrohzeile.
- `simulator-backtest.js` zeigt fuer den unveraenderten Operator jetzt korrekt `Jahre mit Kürzung (≥ 10 %)`; Target-Characterization und Grenzoracle dokumentieren die bewusst aufgeloeste Legacy-Diskrepanz.
- `historical-backtest-cohorts.js` implementiert `HistoricalBacktestCohortsV1`: positive ganzzahlige, inklusive Horizontlaenge; alle Startjahre als Kandidaten; feste gleichlange `eligible`-Fenster; explizite spaete Ausschluesse; unveraenderte Anspar-/Policyinputs je Cohort; keine automatische Parameterauswahl.
- `completed`, `ruin`, `incomplete`, `technical_error` und reserviertes `cancelled` bleiben pro Cohort sichtbar. Inventarquoten teilen durch alle `eligible` Cohorts. Descriptor und Request markieren Ueberlappung, In-sample-Diagnose, fehlende Unabhaengigkeit und den Ausschluss jeder Erfolgswahrscheinlichkeitsaussage.
- `prepareBatch()` inventarisiert gemischte complete/incomplete-Fenster ohne Fail-fast-Verlust und validiert jedes ueberlappende Recordjahr hoechstens einmal pro Batch. Die einzelnen Single-Path-Runner konsumieren nur die vorbereiteten Perioden ohne zweiten Provider-Preflight.

## Ausgefuehrte Tests

- Fokussiert gruen: `historical-backtest-metrics.test.mjs` 298/298, `historical-backtest-cohorts.test.mjs` 59/59, `historical-backtest-contract.test.mjs` 169/169 und `historical-backtest-runner.test.mjs` 111/111 Assertions.
- Regressionsvertraege gruen: `simulation.test.mjs`, `simulator-backtest.test.mjs` 51/51, `simulator-backtest-characterization.test.mjs` 69/69, `simulator-real-withdrawal-contract.test.mjs` 52/52, `results-metrics.test.mjs` 16/16, `simulator-tax-settlement.test.mjs` 59/59, `3bucket-refill.test.mjs` 25/25 und `health-bucket.test.mjs` 19/19.
- `npm test`: 117 Testdateien, 5603/5603 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `git diff --check`: fehlerfrei.
- Ein zunaechst zusaetzlich aufgerufener Dateiname `simulator-three-bucket-reconciliation.test.mjs` existiert nicht; die im Testinventar vorhandenen Reconciliation-Vertraege `3bucket-refill.test.mjs`, Backtest-Characterization und die Gesamtsuite wurden erfolgreich ausgefuehrt.

## Ergebnisse

- Metrikdescriptor, Rohwerte und Summary sind versioniert und ohne Displayrundung reconciliiert. Golden Cases belegen nominale/reale Shortfalls, Drawdown, Runway, Steuern, Verlusttopf und die inklusive 10-%-Grenze.
- Rolling Cohorts verwenden fuer jedes ausgefuehrte Fenster exakt `endYear - startYear + 1 === cohortHorizonYears`. Das letzte zulässige und die ersten unzulässigen Startjahre sind getestet; kein eligible Outcome verschwindet aus dem Inventar.
- Caller-Inputs, Ansparparameter und historische Records bleiben unveraendert. Metrik- und Cohortmodule enthalten keine DOM-, Storage- oder Browserglobalzugriffe.
- Der Scope umfasst sechs produktive Programmdateien und bleibt unter der Stop-Grenze. `engine/**`, Worker, MC/Sweep/Optimizer, historische Datenwerte und generierte Artefakte blieben unveraendert.

## Abweichungen vom Plan

- Zusaetzlich zu den vorab erwarteten Modulen wurden `simulator-engine-direct.js` fuer additive Ruin-Shortfall-Rohdiagnostik und `simulator-backtest.js` fuer die zwingende 10-%-Labelkorrektur angepasst. Beide Aenderungen waren fuer die Akzeptanzkriterien erforderlich und veraendern keine Finanzformel.
- `historical-backtest-contract.js` wurde erweitert, damit gemischte Batch-Preflights jedes Fenster inventarisieren und ueberlappende Records nicht wiederholt vollvalidieren.
- Der versionierte Raw-Download selbst bleibt entsprechend Slice 07 ausserhalb dieses Slice. Slice 06 stellt dafuer das unveraenderlich versionierte `metrics`-Buendel samt Rohquellenregeln im `BacktestRunResultV1` bereit; Slice 07 muss es ohne Neuberechnung exportieren.

## Offene Risiken

- Ueberlappende Cohorts sind stark abhaengig und duerfen nicht wie unabhaengige Beobachtungen behandelt werden.
- Ein fester Horizont kann spaete Startjahre ausschliessen; das Inventar muss dies sichtbar machen.
- Zu viele KPIs koennen falsche Praezision erzeugen; Metriken brauchen klare Aussagegrenzen.
- Der Cohort-Runner ist in Slice 06 bewusst noch kein UI-Einstieg; UI/A11y folgt in Slice 08 und der reproduzierbare Download in Slice 07.
- Cohort-Ergebnisse enthalten vollstaendige Single-Path-Resultate und koennen bei sehr vielen/langen Fenstern speicherintensiv werden. Ein spaeterer kompakter Export darf Rohwerte nur projizieren, nicht neu berechnen.
- Das Gemini-Review ist abgeschlossen; der optionale Claude-Zweitreview wurde nicht durchgefuehrt. Speicherlast und Aussagegrenze bleiben dokumentierte Restrisiken.

## Rueckdokumentation

Metrikwörterbuch, D-05, Cohort-Inventarvertrag, Golden-Case- und Gesamttestergebnisse wurden in den Arbeitsplan eingetragen.

## Freigabestatus

Freigegeben am 2026-07-19 und lokal als `04dcafc` committed. Die Slice-Ausfuehrung dokumentierte 5603/5603 Assertions.

## Review-Feedback von Gemini

## Review-Resultat
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - **Hohe Speicherlast bei vielen Cohorts**: Da jede Kohorte den vollständigen Single-Path-Ergebnisshape (inkl. aller Jahreszeilen) zurückgibt, kann die Batch-Ausführung über sehr viele und lange Zeiträume (z. B. 60 Kohorten mit je 40 Jahren Horizont) eine erhebliche Speichermenge beanspruchen. Dies kann auf ressourcenschwachen Browser-Clients zu Lags oder Abstürzen führen. Ein kompakter Ergebnis- bzw. Export-Zuschnitt wird erst in den nächsten Slices (insbes. Slice 07) etabliert.
- Pre-Mortem:
  Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Anwender konfiguriert im UI einen Kohortenhorizont, der die gesamte Spanne des geladenen historischen Datensatzes überschreitet (z. B. Horizont von 100 Jahren bei nur 75 Jahren historischem Datenbestand). Dies führt dazu, dass alle Kohorten als `insufficient_horizon` markiert werden, wodurch die Anzahl der `eligible` Kohorten auf `0` sinkt. Wenn an nachgelagerten Stellen bei der Ratenberechnung (z. B. im UI-Zweig von Slice 08) eine Division durch `eligible` stattfindet, kommt es zu einem `NaN` oder einer Division-by-Zero-Exception im Frontend, falls kein Guard greift.

## Review-Feedback von Claude

Nicht durchgefuehrt; fuer diesen Slice ist kein optionales Claude-Zweitreview eingetragen.

## Review-Antworten von Codex

- Die Speicherlast vollstaendiger Cohort-Resultate bleibt als offenes Skalierungsrisiko bestehen; eine kompakte Neuberechnung oder stilles Abschneiden wurde nicht eingefuehrt.
- Das Gemini-Pre-Mortem zu `eligible=0` ist in Slice 08 durch `null`/`—`-Projektion und Node-/Browsertests ohne `NaN` oder Division durch null abgedeckt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| D-05 | Nutzer/Reviewer | Rolling-Cohort-Scope und Aussagegrenze | angenommen, implementiert und durch Gemini freigegeben | lokal committed als `04dcafc`; In-sample-/Nullnenner-Vertrag in Slice 08 weiter integriert |
| C-05 | Claude | Exakt 10 % muss mit Operator, ID und Label konsistent sein | angenommen | `>= 10`, `gte_10_pct`, Summarylabel `≥ 10 %` und Golden Case umgesetzt |
| G-F-06 | Gemini | Summary/UI/Export duerfen Metriken nicht neu berechnen oder runden | angenommen | kanonische immutable IDs/Rohwerte in Result und Summary; Exportprojektion folgt Slice 07 |
