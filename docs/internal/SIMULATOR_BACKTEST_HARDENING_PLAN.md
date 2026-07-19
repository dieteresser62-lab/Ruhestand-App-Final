# Simulator / Backtest: Hardening- und Weiterentwicklungsplan

**Stand:** 2026-07-19
**Autor:** Codex (Planentwurf, keine Review-Freigabe)  
**Feature-Branch:** `codex/simulator-backtest-gap-plan`  
**GitHub-Status:** Branch nur lokal angelegt; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Status:** freigegeben; bereit für die Umsetzung (Slices 01-10 freigegeben)  
**Grundlage:** [SIMULATOR_BACKTEST_GAP_ANALYSE.md](./SIMULATOR_BACKTEST_GAP_ANALYSE.md)

## Ziel

Der historische Backtest soll einen expliziten, reproduzierbaren und testbaren Vertrag erhalten. Ein Lauf muss seine Daten-/Zeitachsenbasis, seine tatsaechlich simulierten Jahre und sein Outcome eindeutig ausweisen. Technische Fehler, unvollstaendige Daten und wirtschaftlicher Ruin duerfen nicht miteinander vermischt werden. Ergebnisse, Metriken, Rolling-Cohort-Diagnosen, UI und Exporte muessen aus demselben kanonischen Rohresultat ableitbar und gegeneinander reconciliierbar sein.

Der Plan erteilt keine fachliche Freigabe fuer eine Zeitachsen- oder Engine-Semantikaenderung. Jede erwartete Ergebnisverschiebung benoetigt vor Coding einen dokumentierten Entscheid, eine eingefrorene Baseline und die ausdrueckliche Freigabe durch Reviewer und Nutzer.

## Ausgangslage

- Die Gesamtsuite und Browser-Smokes sind am 2026-07-18 gruen.

- `simulator-backtest.js` koppelt DOM, Jahresschleife, Ergebnisaggregation, Rendering und Export.

- Kalender-/As-of-Bezuege der historischen Reihen sind gemischt und nicht als Contract dokumentiert.

- Fehler, Ruin und unvollstaendige Daten haben keinen diskriminierten Outcome-Vertrag.

- Exporte sind formatierte Tabellenprojektionen ohne reproduzierbares Laufmanifest.

- Datenquellen- und Forschungsgrenzen sind dokumentiert, aber nicht technisch mit jedem Backtestresultat verbunden.

## Leitprinzipien

1. **Charakterisierung vor Aenderung:** Bestehende Ergebnisse und bekannte Inkonsistenzen werden vor jeder fachlichen Verschiebung messbar eingefroren.

2. **Reine Kernpfade:** Historienrecord-Aufbau, Runner, Outcome und Metriken bleiben DOM-frei und per Dependency Injection testbar.

3. **Fail closed:** Fehlende/ungueltige Pflichtdaten erzeugen `incomplete` oder `technical\_error`, niemals still 0 % oder einen scheinbar vollstaendigen Lauf.

4. **Ruin ist ein Finanzergebnis, kein Fehlercontainer:** Nur ein fachlich definierter Deckungsausfall darf `ruin` erzeugen.

5. **Ein Rohresultat:** Summary, Tabelle, Chart, Rolling Cohorts und Export leiten sich aus `BacktestRunResultV1` ab.

6. **As-of explizit:** Realisierte Kalenderwerte und zu Entscheidungszeit bekannte Policywerte werden getrennt benannt.

7. **Keine Quellenfiktion:** Ungeklaerte Indexvarianten, Lizenzen oder Missingness bleiben maschinenlesbar `unresolved`.

8. **Diagnose statt Garantie:** Rolling Cohorts und historische Pfade sind In-sample-Diagnosen, keine unabhaengige Erfolgswahrscheinlichkeit.

9. **Slice-Grenzen:** Jeder Slice aendert hoechstens zehn Programmdateien; Markdown-Dateien zaehlen gemaess `AGENTS.md` nicht in diese Grenze.

10. **Keine Eigenfreigabe:** Codex implementiert und dokumentiert, markiert die eigene Arbeit aber nicht als freigegeben.

## Zielarchitektur und Contracts

### `BacktestRequestV1`

Mindestens:

- `schemaVersion`

- `startYear`, `endYear` und optional `cohortHorizonYears`

- normalisierte Simulatorinputs oder deren vollstaendige, nicht sensible Laufkopie

- `temporalConventionId`

- `datasetId`, `datasetRevision`, `datasetHash`

- `engineBuildId`/Config-Fingerprint, soweit lokal deterministisch verfuegbar

- Ausfuehrungsmodus `single\_path` oder `rolling\_cohorts`

- `breakOnRuin: boolean` als ergebnisrelevante Laufoption, nicht nur als versteckte globale Konstante

- immutable kanonische Laufkopie der normalisierten Inputs; Caller-Inputs and Detailtranchen duerfen nicht mutiert werden

### `HistoricalYearRecordV1`

Mindestens:

- `simulationYear`

- `realized`: Aktien-, Gold-, Cash-/Bond-Rendite, Inflation und Lohnentwicklung mit jeweiligem `sourceYear`

- `decisionAsOf`: CAPE und andere Policyinformationen mit `asOfYear`/`asOfDate`

- `quality`: `observed`, `estimated`, `fallback\_zero`, `missing`, `unresolved`

- `sourceRefs`/Manifest-IDs ohne erfundene Herkunft

Validierung erfolgt zweistufig ausserhalb der heissen Jahresschleife:

1. Dataset-/Manifeststruktur genau einmal je `datasetRevision`/Hash beim Laden oder Aufbau des Providers; das validierte Ergebnis darf gecacht werden.
2. Lueckenlosigkeit und Pflichtfelder genau einmal je angefordertem Single-Path-Fenster beziehungsweise Cohort-Batch vor dem ersten Simulationsjahr.

Ein produktiver Runner konsumiert danach nur validierte Records per O(1)-Lookup. Keine vollstaendige Record-Schemavalidierung laeuft pro Simulationsjahr oder pro Monte-Carlo-Pfad.

### `BacktestRunResultV1`

Mindestens:

- Request-/Run-ID und Schema

- `outcome`: `completed | ruin | incomplete | technical\_error | cancelled`

- `requestedYears`, `completedYears`, `firstYear`, `lastCompletedYear`, optional `ruinYear`

- `warnings` und strukturierter `error` ohne Stacktrace in der Nutzeransicht

- kanonischer Start- und Endportfolio-Snapshot

- unverkuerzte, typisierte Jahreszeilen

- Metriken mit Einheiten-/Nennerdefinition

- Dataset-, Temporal-, Engine- und Config-Provenienz

- `breakOnRuin` und eine eindeutige Trennung zwischen `requestedYears`, wirtschaftlich `completedYears` und technisch nicht ausgefuehrten Jahren

### Gemeinsamer `SimulateYearOutcomeV1`

Der interne Adapter zwischen `simulateOneYear` und seinen Aufrufern benoetigt vor Slice 05 eine diskriminierte Form:

- `{ kind: 'success', ... }`
- `{ kind: 'ruin', reason, ... }`
- `{ kind: 'technical_error', error: { code, message }, ... }`

Backtest, Monte Carlo und Sweep muessen denselben Adapterfehler gleich klassifizieren. Ein `technical_error` darf weder als Ruin noch als erfolgreicher Lauf in Finanzquoten eingehen. Dies ist eine interne Adapter-/Caller-Aenderung; jede notwendige Aenderung an der oeffentlichen `EngineAPI` oder fachlichen Ruindefinition stoppt den Slice.

## Zu entscheidende Punkte vor fachlichen Codeaenderungen

| ID | Entscheidung | Planvorschlag | Freigabebedarf |
| - | - | - | - |
| D-01 | Jahres-/As-of-Konvention | In Slice 04 umgesetzt: realisierte Markt-/Makrowerte mit Label `t`; CAPE/Policy mit `sourceYear/asOfYear=t-1`. Jede Abweichung zu Monte Carlos aktivem `annualData` wird feldweise ausgewiesen. | Erneutes Gemini-Review und Nutzerfreigabe fuer Slice 04 ausstehend |
| D-02 | Einjahreslauf | Als gueltige Diagnose zulassen, sofern genau ein vollstaendiger YearRecord verfuegbar ist. | Review im Slice 03 |
| D-03 | Missingness | Pflichtreihe `missing` -\> Lauf `incomplete`; `fallback\_zero` nur explizit und sichtbar, nicht durch `|| 0`. | Review im Slice 03 |
| D-04 | Ruin | In Slice 05 implementiert: Fachlicher Floor-Deckungsausfall bleibt `ruin`; Engine-/Contractfehler werden `technical\_error`; Ruinendwert ist der terminale Zustand nach Markt/Verkaeufen und vor der nicht deckbaren Auszahlung. | Nutzerauftrag zur Implementierung liegt vor; finales Review/Freigabe ausstehend |
| D-05 | Rolling Cohorts | In Slice 06 umgesetzt: positive ganzzahlige, inklusive Horizontlaenge; alle Startjahre als Kandidaten; nur vollstaendige feste Fenster `eligible`; Anspar-/Policyinputs je Cohort unveraendert; getrenntes Outcome-/Ausschlussinventar; ueberlappende In-sample-Diagnose ohne Erfolgswahrscheinlichkeitsaussage. | Nutzerauftrag vom 2026-07-19 liegt vor; finales Slice-Review ausstehend |
| D-06 | Trial-Persistenz | Slice 07 exportiert zunaechst ein vollstaendiges Laufmanifest; persistentes append-only Trial-Log bleibt opt-in und Slice-09-/Nutzerentscheidung. | Nutzerentscheidung |
| D-07 | Historische Datenquellen | Ungeklaerte Felder als `unresolved`; keine Datenersetzung ohne Daten-/Methodik-Owner, Lizenz- und Transformationsnachweis. | Externer Owner in Slice 09 |
| D-08 | Kostenmodell | Nicht innerhalb des Hardening still ergaenzen, da Engine-/Cashflow-Semantik betroffen sein kann. Eigenes Folgearbeitsdokument nach FQ-01-Gates. | Nutzer + Fachowner + neues Review |
| D-09 | Shared YearData/Fehler | In Slice 05 implementiert: O(1)-Guard fuer nicht-finite Aktien-, Gold- und Cash-/Bondreturns vor Portfoliomutation und Engineaufruf; Ziel ist `technical_error`. Aufruferinventur, Performancebaseline, Workerparitaet und unveraenderte Engine-Fachsemantik sind nachgewiesen. | Nutzerauftrag zur Implementierung liegt vor; finales Review/Freigabe ausstehend |

### Umgesetzte canonical Alignment-Tabelle fuer D-01

Diese Tabelle beschreibt den in Slice 04 implementierten Zielcontract. Sie ist noch keine finale Slice-Freigabe:

| Feld im Simulationsjahr `t` | Planvorschlag | Legacy-Backtest | Aktives Monte-Carlo-`annualData` | Freigabenachweis |
| --- | --- | --- | --- | --- |
| Aktienrendite | Indexlevel `t / (t-1) - 1`; Endpunkte im Record ausweisen | so implementiert | so aus den Leveln aufgebaut | Golden-/Markerfixture |
| Goldrendite | `gold_eur_perf` mit Datenlabel `t` als realisierte Rendite des Jahres `t` | Wert `t-1` | Wert `t` | Quellen-/Transformationsvertrag, Markerfixture |
| Cash-/Bondrendite | `zinssatz_de` mit Datenlabel `t`; wirtschaftliche Interpretation explizit als vereinfachter Jahresreturn oder Zinsproxy benennen | Wert `t-1` | Wert `t` | D-01/Fachentscheid |
| Inflation/Bedarfsindex | `inflation_de[t]` als ex-post realisierter Jahreswert; kein Policyinput ohne As-of-Trennung | Wert `t-1` | Wert `t` | Reconciliation gegen Preisindexannahme |
| Lohn-/Rentenanpassung | `lohn_de[t]` beziehungsweise `inflation_de[t]`; `computeAdjPctForYear()` mappt nachweislich `simStartYear - series.startYear + yearIdx` | Wert `t` | Wert `t` | Off-by-one-Test 1950/2000/2001 |
| CAPE/Policy | letzter vor Policyentscheidung belegbar verfuegbarer Wert, voraussichtlich Datenlabel `t-1`; exaktes As-of muss das Manifest tragen | durch `dataVJ` effektiv `t-1` | gesampelter Record `t` | Look-ahead-Negativtest und Nutzerentscheid |

Die Zielwerte nach D-01 sind als neue `target_expected`-Oracles neben den unveraenderten `legacy_observed`-Fixtures aus Slice 01 gespeichert; die Legacy-Fixtures werden nicht umgedeutet. Das blockierte Gemini-Review bestaetigte die `t`-Zuordnung fuer Inflation, verlangte aber vor Freigabe die signierte Negativzins-Reconciliation und die Anpassung des Legacy-Regressionstests. Beides ist umgesetzt; das erneute Review steht aus.


## Gesamt-Akzeptanzkriterien

- Gleiche gueltige Inputs, derselbe Daten-/Config-/Engine-Fingerprint und dieselbe Temporal-Konvention erzeugen byte-stabile kanonische Rohresultate abgesehen von explizit ausgenommenen Zeitstempeln/Run-IDs.

- Jedes simulierte Jahr kann auf genau definierte Source-/As-of-Jahre der Pflichtreihen zurueckgefuehrt werden.

- Dataset-/Recordvalidierung erfolgt ausserhalb der Jahresschleife; ein Performancevergleich weist fuer Backtest, Monte Carlo und Sweep keine unerklaerte Regression aus.

- Missingness, technische Fehler und Ruin sind getrennte Outcomes und werden weder im Nenner noch im Summary vermischt.

- Summary-Start-/Endvermoegen reconciliieren centgenau mit den kanonischen Portfolio-Snapshots; FlowDelta bleibt innerhalb des bestehenden Vertrags.

- Ein Ruinlauf zeigt kein Vorjahres-Endvermoegen als Endbestand.

- Ein Engine-/Adapterfehler ist im Backtest `technical_error`. Ein Monte-Carlo-Batch mit mindestens einem technischen Pfadfehler erhaelt fail-closed einen technischen Batchstatus; finanzielle Headline-Quoten werden nicht als gueltiges Ergebnis dargestellt. Diagnostische Teilzaehler bleiben separat sichtbar. Sweep inventarisiert den Fehler weiterhin als ungueltige Kombination statt Ruin.

- `readYearReturnRates()` oder eine vorgeschaltete gemeinsam Grenze kann nicht-finite Pflichtwerte nicht still als wirtschaftlich gueltige 0-%-Rendite passieren lassen. Jede runneruebergreifende Aenderung benoetigt D-09 und die volle Aufrufer-/Workerparitaet.

- Caller-Inputs, Detailtranchen und historische Quelldaten bleiben nach Single Path, wiederholtem Lauf und Rolling-Cohort-Batch strukturell und wertmaessig unveraendert.

- Ein pflegebucket-aktiver Lauf zeigt die kanonischen Pflegebucketwerte im Summary; Jahreszeile, Summary und Raw-Export stimmen ueberein.

- Die Kuerzungsschwelle exakt 10 % besitzt einen einheitlichen Operator-/Labelcontract.

- Raw-JSON und CSV enthalten keine HTML-Tags; JSON behaelt Zahlen als Zahlen und exportiert Request, Outcome, Manifest, Warnungen, Jahreszeilen und Metriken versioniert.

- Rolling Cohorts, falls freigegeben, verwenden gleiche Horizontlaenge, explizite Ausschlussgruende und berichten vollstaendige/ruin/incomplete/technical-error Kohorten getrennt.

- Browser-Gates pruefen gueltigen Lauf, invalides Fenster, Ruin-/Errorstatus, Tabellen-/Detailtoggle, Export und Realbestands-Non-Mutation.

- Browser-Gates pruefen insbesondere leere/NaN-/rueckwaertige Perioden, Datenluecke, Ruin und `technical_error` als getrennte Negativpfade.

- README und Referenzen nennen den Backtest eine In-sample-Diagnose und stimmen bei Zeitraum, Zeitachse, Ruin, Metriken und Export mit dem Code ueberein.

- `npm test`, relevante fokussierte Tests, `npm run test:browser` und `npm run test:coverage` sind gruen; Coverage darf fuer die geaenderten Backtestmodule nicht sinken.

## Slice-Uebersicht

| Slice | Datei | Ziel | Abhaengigkeit | Status |
| - | - | - | - | - |
| 01 | [SLICE_SIMULATOR_BACKTEST_01_BASELINE_MESSVERTRAG.md](./SLICE_SIMULATOR_BACKTEST_01_BASELINE_MESSVERTRAG.md) | Baseline, Golden-/Negative-Cases und Metrikwörterbuch einfrieren | Arbeitsdokument freigegeben | abgeschlossen |
| 02 | [SLICE_SIMULATOR_BACKTEST_02_DOM_FREIER_RUNNER.md](./SLICE_SIMULATOR_BACKTEST_02_DOM_FREIER_RUNNER.md) | DOM-freien Runner und Request/Result-Grundshape extrahieren, ohne Semantikdelta | Slice 01 gruen/freigegeben | abgeschlossen |
| 03 | [SLICE_SIMULATOR_BACKTEST_03_DATEN_JAHRES_CONTRACT.md](./SLICE_SIMULATOR_BACKTEST_03_DATEN_JAHRES_CONTRACT.md) | Manifest, einmalige Validierung, Missingness, Perioden- und HistoricalYearRecord-Vertrag | Slices 01-02 gruen/freigegeben | abgeschlossen |
| 04 | [SLICE_SIMULATOR_BACKTEST_04_ZEITACHSEN_UMSETZUNG.md](./SLICE_SIMULATOR_BACKTEST_04_ZEITACHSEN_UMSETZUNG.md) | Zeitachsensynchronisation | D-01/D-03 entschieden, Slices 01-03 | implementiert und getestet; erneutes Review ausstehend |
| 05 | [SLICE_SIMULATOR_BACKTEST_05_OUTCOME_RUIN_FEHLER.md](./SLICE_SIMULATOR_BACKTEST_05_OUTCOME_RUIN_FEHLER.md) | Gemeinsame Adapterfehler, Ruin, incomplete und technische Fehler in Backtest/MC/Sweep trennen; Summary reconciliieren | Slices 02-03; D-04/D-09 | abgeschlossen, freigegeben und lokal committet |
| 06 | [SLICE_SIMULATOR_BACKTEST_06_METRIKEN_ROLLING_COHORTS.md](./SLICE_SIMULATOR_BACKTEST_06_METRIKEN_ROLLING_COHORTS.md) | Reconciliierbares Ergebnisbuendel und Rolling-Cohort-In-sample-Diagnose | Slices 04-05; D-05 durch Nutzerauftrag entschieden | abgeschlossen, freigegeben und lokal committet |
| 07 | [SLICE_SIMULATOR_BACKTEST_07_EXPORT_REPRODUZIERBARKEIT.md](./SLICE_SIMULATOR_BACKTEST_07_EXPORT_REPRODUZIERBARKEIT.md) | Versionierter Raw-Export und Laufmanifest, getrennt von Displayformatierung | Slices 02-03/05; Metrikteil aus 06, Cohortteil optional nach D-05 | abgeschlossen, freigegeben und lokal committet |
| 08 | [SLICE_SIMULATOR_BACKTEST_08_UI_BROWSER_ACCESSIBILITY.md](./SLICE_SIMULATOR_BACKTEST_08_UI_BROWSER_ACCESSIBILITY.md) | UI-Validierung, Status/A11y und Browser-End-to-End-Gate | Slice 05; Exportteil nach 07, optionaler Cohortteil nach 06 | implementiert und selbstgeprueft; adversariales Review ausstehend |
| 09 | [SLICE_SIMULATOR_BACKTEST_09_FORSCHUNGS_GATES.md](./SLICE_SIMULATOR_BACKTEST_09_FORSCHUNGS_GATES.md) | Daten-, Kosten-, Trial- und Holdout-Gates operationalisieren; Folgevorhaben abgrenzen | Start nach Slice 03; Laufmanifest-Verweise nach Slice 07; externe Owner | nicht gestartet |
| 10 | [SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md](./SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md) | Gesamtintegration, Doku-Sync, Coverage- und Release-Readiness-Bericht | Slices 01-09 | nicht gestartet |

### Ausfuehrungs-DAG und Parallelisierung

```text
01 Baseline
├─ 02 DOM-freier Runner ─┬─ 04 Zeitachse ─┐
│                        └─ 05 Shared Outcome/Fehler ─┬─ 06 Metriken [Cohorts nur D-05]
└─ 03 Daten-/Recordcontract ───────────────┘          ├─ 07 Raw-Export
                                                      └─ 08 UI/A11y (Export-Join nach 07)
03 ── 09 Forschungsprotokoll (Laufmanifest-Join nach 07)
04-09 ── 10 Integration
```

- Slices 02 und 03 duerfen nach Slice 01 parallel vorbereitet werden, sofern ihre Dateilisten disjunkt bleiben; beide muessen vor den Integrationen 04/05 freigegeben sein.
- Slices 04 und 05 sind fachlich unabhaengige Tracks (Zeitachse vs. Shared Outcome), beruehren aber voraussichtlich denselben Runner. Sie werden deshalb nicht gleichzeitig im selben Arbeitsbaum codiert; die Reihenfolge wird beim Diff-Risiko-Check anhand konkreter Dateigrenzen festgelegt.
- Slice 06 wurde nach positivem D-05-Nutzerentscheid vollstaendig einschliesslich Rolling Cohorts umgesetzt; Cohorts bleiben ueberlappende In-sample-Diagnosen und keine Erfolgswahrscheinlichkeit.
- Slice 07 kann den Single-Path-Raw-Export nach Slice 05 beginnen. Cohortfelder werden nur nach freigegebenem Slice-06-Cohortteil ergaenzt.
- Slice 08 kann UI-Validierung/A11y nach Slice 05 vorbereiten; Downloadintegration wartet auf Slice 07. Gleichzeitiges Coding mit Slice 07 ist nur bei disjunkten Produktdateien erlaubt.
- Slice 09 kann seine Owner-/Gate-Dokumentation nach Slice 03 beginnen und wird nach Slice 07 um das tatsaechliche Laufmanifest ergaenzt.


## Geplante Dateigrenzen

Die exakten Dateien werden vor jedem Slice nach Aufruferinventur im Diff-Risiko-Block festgelegt. Voraussichtliche Quellorte:

- bestehend: `app/simulator/simulator-backtest.js`, `simulator-main-helpers.js`, `simulator-input-validation.js`, `simulator-data.js`, optional `simulator-engine-direct.js`

- neu, Namen erst im Slice finalisieren: DOM-freier Backtest-Runner, Historical-Year-Record-/Manifest-Validator, Outcome-/Metrikmodul, Rolling-Cohort-Runner, Export-Serializer

- UI: `Simulator.html`, `simulator.css`, eng begrenzte Simulator-Init-/UI-Fassade

- Tests: neue fokussierte Contracttests plus Erweiterung des Browser-Smokes

- Referenzen: README, Data Sources, Technical, Simulator Modules, Workflow Pseudocode, Architektur/Fachkonzept und Tests-README

Kein Slice darf mehr als zehn Programmdateien aendern. Zeigt die Aufruferinventur eine breitere Contract-Aenderung, wird vor Coding neu geschnitten und der Nutzer gefragt.

## Validierungsstrategie

| Ebene | Pflichtpruefung |
| - | - |
| Syntax/Import | `node --check` fuer geaenderte JS-Dateien; Importtest fuer neue DOM-freie Module |
| Fokussiert | je Slice benannte `node tests/run-single.mjs \<testdatei\>`-Laeufe |
| Rechenregression | Golden Cases fuer ausgewaehlte Historienfenster; erwartete Deltas nur nach D-01-Freigabe |
| Legacy vs. Ziel | `legacy_observed` friert auch bekannte Defekte ein; `target_expected` beschreibt getrennt den freigegebenen Sollcontract. Kein Legacy-Oracle wird nachtraeglich als fachlich richtig bezeichnet. |
| Negative Contracts | NaN/Teiljahr/Datenluecke/ungueltiges Record/Enginefehler/Ruin/Export ohne Daten |
| Shared Caller | injizierter Engine-/YearData-Fehler wird in Backtest, Monte Carlo und Sweep gleich als technisch ungueltig inventarisiert und nie als Ruin gezaehlt |
| Reconciliation | Jahreszeilen -\> Summary/Metriken; Start-/Endportfolio; angeforderte/ausgefuehrte Jahre; Outcome-Nenner |
| Browser | gueltiger Lauf, invalides Fenster, Ruin-/Errorstatus, Tabellen-/Detailtoggle, Export und Realbestands-Non-Mutation |
| Performance | Datasetvalidierung einmal je Revision und Periodenpreflight einmal je Request/Batch; Benchmark/Call-Count verhindert Validierung innerhalb von Jahres-, MC- oder Sweep-Schleifen |
| Gesamt | `npm test`, `npm run test:browser`, `npm run test:coverage` |
| Engine | `npm run build:engine` nur wenn EngineAPI/`engine/` tatsaechlich geaendert wird; eine solche Notwendigkeit ist vorher Stop-/Entscheidungspunkt |


## Stop-Regeln und Eskalationen

Zusaetzlich zu `AGENTS.md` und `SLICE\_EXECUTION\_RULES.md` gilt:

- Stop bei jeder nicht im freigegebenen Delta-Report erwarteten Backtest-Abweichung.

- Stop, wenn Slice 02 trotz verhaltensneutralem Ziel fachliche Zahlen veraendert.

- Stop, wenn Slice 02 den dokumentierten Legacy-Ruin-State, das Legacy-Pflegebucket-Leerfeld oder `window.globalBacktestData` v0 anders reproduziert. Diese Defekte duerfen erst in ihrem freigegebenen Fachslice wechseln.

- Stop vor Slice 04, solange D-01/D-03 nicht schriftlich entschieden sind.

- Stop, wenn Outcome-Trennung eine Aenderung der oeffentlichen EngineAPI- oder Engine-Fachsemantik erfordert.

- Stop vor der gemeinsamen Return-/Error-Grenze, solange D-09, die vollstaendige Aufruferliste und der MC-/Sweep-/Worker-Performance- und Paritaetsnachweis fehlen.

- Stop, wenn Validierung innerhalb der Jahres-, Pfad-, Sweep- oder Cohort-Schleife erfolgt oder die vereinbarte Performancebaseline unerwartet verschlechtert.

- Stop, wenn Jahreslog und Summary/Metrik nicht centgenau oder gemaess dokumentierter Rundung reconciliierbar sind.

- Stop bei auffaelligem `portfolio\_flow\_delta`, Snapshot-/Backtest-Delta oder UI-/Engine-Parameternamensdrift.

- Stop, wenn `minimumFlexAnnual` irgendwo still begrenzt statt validiert wird.

- Stop, wenn ein Slice mehr als zehn Programmdateien benoetigt.

- Stop, wenn Tests nicht ausfuehrbar sind oder Browser-/Exportvalidierung nicht sinnvoll ersetzt werden kann.

- Stop vor Datenersetzung, Kostenmodell, internationalem Vergleich oder Holdout-Auswertung ohne Owner, Lizenz-/Datenvertrag und Nutzerfreigabe.

## Rollback- und Commit-Grenzen

- Vor jedem Slice werden Branch, Status, geplante Dateien und Rollback exakt dokumentiert.

- Neu angelegte Dateien werden nur nach Freigabe geloescht; bestehende Dateien koennen im uncommitted Slice gezielt mit `git checkout -- \<datei\>` zurueckgesetzt werden.

- Codex erstellt keine Commits. Nach positivem Review und Nutzerfreigabe prueft Gemini den Scope via `git status --short` und erstellt den lokalen Commit gemaess Projektregel.

- Push/Remote-Branch nur nach ausdruecklicher Nutzerfreigabe.

## Planfortschritt

| Slice | Implementierung | Tests | Review | Rueckdokumentation |
| - | - | - | - | - |
| 01 | abgeschlossen | fokussiert und `npm test` gruen | freigegeben | abgeschlossen |
| 02 | abgeschlossen | fokussiert, `npm test`, Browser und Coverage gruen | freigegeben | abgeschlossen |
| 03 | abgeschlossen | fokussiert und `npm test` gruen | freigegeben | abgeschlossen |
| 04 | abgeschlossen | fokussiert und `npm test` gruen | nach Blockerbehebung erneut offen | abgeschlossen |
| 05 | abgeschlossen | fokussiert, `npm test`, Coverage und Performance gruen | freigegeben | abgeschlossen |
| 06 | abgeschlossen | fokussiert und `npm test` gruen | offen | abgeschlossen |
| 07 | abgeschlossen | fokussiert, `npm test` und Browser-Smoke gruen | offen | abgeschlossen |
| 08 | nicht gestartet | offen | offen | offen |
| 09 | teilweise extern blockiert | offen | offen | offen |
| 10 | nicht gestartet | offen | offen | offen |

### Slice 01: rueckdokumentierter Iststand

- Fixture: `tests/fixtures/simulator-backtest-baseline-v1.json`, Schema `simulator-backtest-baseline-v1`, SHA-256 `56f4ec2bfecc15d0f2074e40e58afac91ececb43ab0349a0cd53f581bcb95202`.
- Laufbaselines: `completed_2000_2005`, `completed_1960_2020`, `three_bucket_minimum_flex_2005_2014`, `capital_poor_ruin_2000_2005`, `health_bucket_nested_row_summary_gap`, `dynamic_flex_cape_2010_2013`.
- Siebter Characterization-Fall: `reduction_exactly_10pct_legacy_boundary` mit Operator `>= 10` und widersprechendem UI-Label `>10%` als `legacy_observed_gap`.
- Negativbaselines: Einjahreslauf, NaN- und rueckwaertige Periode, mittlere Datenluecke sowie nicht-finite Goldrendite.
- Eingefrorene Luecken: positiver Vorjahres-Endwert bei Ruin, synthetische Null-Ruinzeile, fehlendes Pflegebucket-Summary, Teil-/Leerlaeufe ohne diskriminiertes Outcome und nicht-finite Goldrendite als stiller 0-%-Fallback.
- Pflegebucket-Testgrenze: Der aktuelle DOM-Inputpfad aktiviert den Pflegebucket nicht direkt in `getCommonInputs()`. Slice 01 verwendet deshalb eine echte `simulateOneYear()`-Pflegebucketzeile als testlokale Projektion in den unveraenderten Legacy-Wrapper, um den bestaetigten Summary-Zugriff auf die falsche Objektebene ohne Produktcodeaenderung einzufrieren. Die produktive Inputweitergabe bleibt separat zu invalidieren.
- Messvertrag: Metrikwoerterbuch V1, vollstaendige normalisierte Inputs, SHA-256-Input-/Row-Hashes, Non-Mutation fuer Inputs/Detailtranchen/Historie, Alignment 2000/2001, `legacy_schema_v0`, Detailtoggle-Paritaet und Delta-Klassifikation.
- Validierung: Characterization 65/65, bestehender Backtest 46/46, Runner-Contract 49/49 und `npm test` 4650/4650 Assertions; 0 fehlgeschlagene Dateien und 0 offene Handles.
- Keine Produkt-, Engine-, Worker- oder generierte Datei wurde in Slice 01 geaendert. Gemini hat den Slice freigegeben; der lokale Abnahme-Commit ist `8daa98b`.

### Slice 02: rueckdokumentierter Iststand

- Neue DOM-freie Grenze: `runHistoricalBacktest({ inputs, period, historicalDataProvider, simulateYear, initializePortfolio, computeAdjustmentPct, resolveHorizon, totalPortfolio, breakOnRuin })` in `app/simulator/historical-backtest-runner.js`.
- Vorlaeufige Shapes: `BacktestRequestV0` mit kanonisch eingefrorener Inputkopie, Zeitraum, Modus und `breakOnRuin`; `BacktestRunResultV0` mit `request`, `rows`, `requestedYears`, `completedYears`, `portfolioStart`, `portfolioEnd`, `legacyOutcome` und `legacyMetrics`.
- Isolation: Der Runner enthaelt keine Zugriffe auf DOM, Browserglobals, Storage oder PersistenceFacade. Historische Records und Simulatorinputs werden einmalig in lauf-eigene Kopien ueberfuehrt; wiederholte Aufrufe mit tief eingefrorenen Partner-/Trancheninputs und Historienrecords bleiben deterministisch und mutationsfrei.
- Legacy-Projektion: `runBacktest()` bleibt globaler UI-Einstieg. `window.globalBacktestData` behaelt exakt `legacy_schema_v0`; Ruin-Vorjahreswert, synthetische Ruinzeile, Pflegebucket-Leerfeld, Datenlueckenverhalten und 10-%-Operator bleiben bewusst unveraendert.
- Toter doppelter Textlogpfad und zugehoerige Formathelper/Imports wurden aus `simulator-backtest.js` entfernt. Rendering und JSON-/CSV-Export konsumieren weiterhin dieselben kanonischen Legacy-Zeilen.
- Validierung: Runner 50/50, Characterization 65/65, Backtest 46/46 sowie fokussierte Realentnahme-/3-Bucket-/Profiltests gruen; `npm test` 113 Dateien und 4700/4700 Assertions; Browser-Smoke fuer alle Einstiege gruen; Runner-Coverage 90,57 % (288/318 Zeilen), Gesamtcoverage 73,16 %.
- Slice 02 ist durch Gemini freigegeben und lokal committet.

### Slice 03: rueckdokumentierter Iststand

- Neues tief eingefrorenes `HISTORICAL_DATA_MANIFEST` mit Schema `HistoricalDataManifestV1`, Dataset-ID `ruhestandsapp-historical-data-v1`, Revision `2026-07-18.1` und kanonischem SHA-256 `8246422d98657c2a76b750ce9fd1253e01aa7a9a4dfa0f0f01dcb96b5507ef29`.
- Alle sechs eingebetteten Reihen deklarieren Variante, Waehrung, Region, Frequenz, Zeitraum, Source-/Lizenzstatus, Transformation, Schaetzsegmente, Missingness und Revision. Unbelegte Source-, Lizenz- und Variantenangaben bleiben `unresolved`; kein `known`-Wert wurde erfunden.
- `historical-backtest-contract.js` validiert Dataset plus Records einmal je Manifestrevision/Content-Hash und cached einen immutable Provider. Die technischen Bounds werden aus `1925-2025` plus vierjaehrigem Lookback als `1929-2025` abgeleitet.
- `HistoricalYearRecordV1` trennt `realized` von `decisionAsOf`, traegt `sourceYear`, `asOfYear`, Einheit, Ableitung und Qualitaet und bleibt mit `alignmentStatus='proposal_pending_d01'` sichtbar noch nicht fachlich aktiviert.
- D-02 ist technisch umgesetzt: `startYear === endYear` ist bei vollstaendigem Record/Lookback gueltig; NaN, nicht-ganzzahlige und rueckwaertige Grenzen sind strukturierte Contractfehler.
- D-03 ist technisch umgesetzt: Alle sechs Reihen sind im vollstaendigen V1-Record Pflicht. Fehlende/nicht-finite Werte und nicht-positive Index-/CAPE-Level scheitern strukturiert. `fallback_zero` ist nur in manifestierten Segmenten erlaubt; die aktuellen Goldnullen bleiben mangels Herkunftsnachweis `unresolved`.
- `preparePeriod()` and `prepareBatch()` pruefen den gesamten Lookback-/Anfragebereich vor einer Rechenschleife und liefern fuer die erste Luecke einen strukturierten `incomplete`-Grund. Instrumentation belegt eine Vollvalidierung je Revision/Hash und einen Preflight je Single-Path-/Cohort-Batch.
- Das Builderinventar haelt Legacy-Backtest, aktives Monte-Carlo-`annualData`, alternativen `prepareHistoricalData()`-Pfad und inaktiven D-01-Vorschlag Auseinander. Marker 1950/2000/2001 bestaetigen die bestehende Rentenanpassungsabbildung.
- Produktiver Backtest, Monte Carlo, Sweep, Worker und `readYearReturnRates()` importieren den neuen Contract noch nicht. D-01 und die wirksame Umschaltung bleiben Slice 04; BT-20/D-09 bleibt Slice 05.
- Validierung: neue Contracttests 146/146, Manifesttests 274/274, Datenrobustheit 3/3, Input-Reader 53/53, Characterization 65/65 ohne Fixture-Delta, Backtest 46/46 sowie `npm test` mit 115 Dateien und 5120/5120 Assertions; 0 fehlgeschlagene Dateien und 0 offene Handles.
- Slice 03 ist durch Gemini freigegeben und lokal committet.

### Slice 04: rueckdokumentierter Implementierungsstand

- Der produktive Backtest nutzt jetzt den gecachten `HistoricalBacktestContractProvider`. Die Temporal-Konvention `realized_t_decision_t_minus_1_v1` ordnet Aktienendpunkte, Gold, Cash-/Bondzins, Inflation und Lohn dem Simulationsjahr `t` zu; CAPE bleibt decision-as-of `t-1`.
- Der Periodenpreflight validiert das vollstaendige Anfrage- und Lookback-Fenster, liefert die initiale Vierjahres-Markthistorie und beendet unvollstaendige Requests vor der Jahresschleife als `incomplete`. Bounds stammen aus dem Manifest; vollstaendige Einjahreslaeufe sind erlaubt.
- Der Runner baut `yearData` nur noch aus validierten Records. Request und Ergebnis fuehren Dataset-/Temporal-Provenienz; der Legacy-UI-/Exportschema-Vertrag bleibt fuer diesen Slice bestehen.
- Gemini blockierte den ersten Stand wegen eines nicht reconcilierten negativen Cashzinses 2020 und einer Legacy-Inflationserwartung in `simulator-backtest.test.mjs`. Cashzins, Balance-Trace und Flow-Reconciliation sind nun signiert; der Test erwartet D-01-konform Inflation `t`.
- Die unveraenderte Legacy-Fixture `simulator-backtest-baseline-v1.json` bleibt getrennt von `simulator-backtest-target-v1.json`. Letztere enthaelt `BacktestTemporalDeltaReportV1` mit Ursachen pro geaenderter Metrik, historischen Endvermoegensdeltas, unveraendert 1/6 Ruinfaellen und der dokumentierten Nichtbetroffenheit der direkten Optimizer-/Risikoprofil-/MC-/Sweep-/Workerpfade.
- Beispiel-Deltas: 2000-2005 Endvermoegen -5.209,18 EUR; 1960-2020 -156.153,94 EUR; Dynamic-Flex/CAPE 2010-2013 +39.114,73 EUR. Alle positiven Zielfaelle bleiben unter einem Euro absolutem FlowDelta; der lange Negativzinsfall reconciliiert auf 0.
- Validierung: Contract 163/163, Runner 61/61, Characterization 67/67, Produktbacktest 51/51, Worker-Paritaet 369/369 und Gesamtsuite mit 115 Testdateien und 5.155/5.155 Assertions; 0 fehlgeschlagene Dateien und 0 offene Handles.
- Restrisiken: weitere nicht-negative Geldnormalisierungen koennten Deflation still kappen; alternative Custom-Datasets benoetigen zusaetzliche Randjahres-/Lookback-Importtests. Implementierung und Selbstpruefung sind abgeschlossen, erneutes Gemini-Review/Nutzerfreigabe und Commit stehen aus.

### Slice 05: rueckdokumentierter Implementierungsstand

- Die gemeinsame interne Jahresgrenze liefert diskriminierte Outcomes `success`, `ruin` und `technical_error`. Stabile Fehlercodes unterscheiden fehlende API/Methoden, Engine-Ausnahmen, Engine-Resultfehler, ungueltige Resultshapes und nicht-finite Pflichtreturns. Causes bleiben intern diagnostizierbar; die UI projiziert nur sanitizierte Meldungen.
- `BacktestRunResultV1` unterscheidet `completed`, `ruin`, `incomplete` und `technical_error`; `cancelled` bleibt reserviert. Request/Result fuehren `breakOnRuin`, `requestedYears`, `completedYears`, `lastCompletedYear`, Datenstatus und kanonisches Summary.
- Nur der unveraenderte Floor-Deckungsausfall ist Ruin. Ruinzeile, `portfolioEnd` und Summary verwenden denselben terminalen Zustand nach Marktbewegung und moeglichen Verkaeufen, aber vor der nicht deckbaren Auszahlung. Startvermoegen stammt aus dem initialisierten Portfolio; das Pflegebucket-Summary liest die kanonische Objektebene.
- Monte Carlo zaehlt technische Pfade weder als Erfolg noch als Ruin, fuehrt ein separates technisches Inventar und setzt den Batch bei mindestens einem technischen Pfad fail-closed auf `technical_error`; Headlinemetriken sind dann ungueltig und werden nicht dargestellt. Main-/Worker-/Auto-Optimize-Merges sind additiv. Sweep behaelt seine Invalid-Combo-Semantik und denselben Adapterfehlercode.
- Der O(1)-Guard prueft Aktien-, Gold- und Cash-/Bondreturn vor jeder Jahresmutation; bei Rejection erfolgen null Engineaufrufe. Eine Aenderung an `engine/`, der oeffentlichen `EngineAPI`, Spending, Floor oder Forced Sale war nicht erforderlich.
- Validierung: fokussiert unter anderem Runner 101/101, Characterization 67/67, Produktbacktest 51/51, Monte Carlo 140/140, Sweep 107/107 und Worker-Paritaet 369/369; `npm test` sowie Coverage-Gate mit 115 Testdateien und 5226/5226 Assertions, 0 fehlgeschlagenen Dateien und 0 offenen Handles. Gesamtcoverage 73,36 %.
- Performance, Median aus je drei Laeufen: Monte Carlo 466,9 ms gegen 453 ms Baseline (+3,1 %), Sweep 365,8 ms gegen 410 ms Baseline (-10,8 %); beide innerhalb der maximalen +25 %. Exakt zehn Programmdateien einschliesslich Ziel-Fixture wurden geaendert. Implementierung/Selbstpruefung sind abgeschlossen; adversariales Review, Nutzerfreigabe, Commit und Push stehen aus.

### Slice 06: rueckdokumentierter Implementierungsstand

- `HistoricalBacktestMetricsV1` enthaelt 24 kanonische IDs mit Label, Einheit, nominal/real-Basis, Vorzeicheninterpretation, Aggregationsregel, Nenner, reiner Displayrundung, Missingness-, Outcome- und Rohquellenregel. `BacktestRunResultV1.metrics.values` und `summary.metrics` verwenden dieselben unveraenderten Werte.
- Abgedeckt sind nominales/reales Start-/Endvermoegen, Entnahmen, Floor-Shortfall-Auftreten/-Hoehe/-Dauer, Flex-Kuerzung, Runway-Stress, nominaler Endwert-Max-Drawdown inklusive Pflegebucket, Steuern, Verlusttopfwirkung, Pflegebucket und Outcome-Indikatoren. Ruin liefert additive Rohdiagnostik fuer erforderlichen/gedeckten Floor und Fehlhoehe ohne Aenderung der Ruin- oder Engine-Semantik.
- Der 10-%-Contract ist inklusiv: Operator `>= 10`, IDs `*_gte_10_pct`, kanonisches Label `≥ 10 %`. Target-Characterization und sichtbares Backtest-Summary wurden konsistent aktualisiert; Rundung findet nur als Displaymetadatum statt.
- D-05 ist umgesetzt: `HistoricalBacktestCohortsV1` verwendet positive ganzzahlige inklusive Horizonte (`end=start+horizon-1`), inventarisiert alle Startjahre, schliesst spaete Fenster explizit als `insufficient_horizon` aus und zaehlt `completed`, `ruin`, `incomplete`, `technical_error` sowie `cancelled` gegen alle `eligible` Cohorts.
- Jede Cohort erhaelt identische unveraenderte Anspar-/Policyinputs und startet `yearIndex=0`; automatische Parameterauswahl ist ausgeschlossen. Request und Descriptor markieren Ueberlappung, In-sample-Charakter, fehlende Unabhaengigkeit und keine Erfolgswahrscheinlichkeitsaussage.
- `prepareBatch()` behaelt gemischte complete/incomplete-Perioden vollstaendig, validiert ueberlappende Recordjahre hoechstens einmal pro Batch und erlaubt den Single-Path-Runs den Verbrauch vorbereiteter Perioden ohne zweiten Provider-Preflight.
- Golden-/Reconciliation-Ergebnisse: Metriken 298/298, Cohorts 59/59, Datencontract 169/169, Runner 111/111, Characterization 69/69; `npm test` mit 117 Testdateien und 5603/5603 Assertions, 0 fehlgeschlagenen Dateien und 0 offenen Handles. Sechs produktive Programmdateien wurden geaendert; Engine-/Worker-/MC-/Sweep-/Optimizer-Semantik und generierte Artefakte blieben unveraendert.
- Raw-Download/Manifest folgt in Slice 07 und muss das immutable Metrikbuendel ohne Neuberechnung projizieren; UI/A11y fuer Cohorts folgt in Slice 08. Slice 06 wurde freigegeben und lokal als `04dcafc` committed.

### Slice 07: rueckdokumentierter Implementierungsstand

- `historical-backtest-export.js` definiert `HistoricalBacktestExportV1` mit Schema-ID `de.ruhestandsapp.historical-backtest.raw`. Das Raw-JSON enthaelt Request-/Run-ID, vollstaendigen `BacktestRequestV1`, diskriminiertes Outcome, Warnungen/sichere Fehlerdaten, Completionfelder, Dataset-/Manifest-/Temporal-/Engineprovenienz, Start-/Endportfolio-Snapshots, Historical-Year-Records, unverkuerzte Jahreszeilen, `HistoricalBacktestMetricsV1`, Summary und optional das unveraendert uebergebene Cohort-Inventar.
- Request- und Result-Fingerprints verwenden `sha256-canonical-json-v1`. Der Result-Fingerprint umfasst Schema, Request und kanonisches Ergebnis; `exportedAt`, IDs, Exportmetadaten und interne `diagnostics` sind ausgeschlossen. Engine-API-/Build-ID und ein Fingerprint der vollstaendigen Runtime-Config werden beim Start des Laufs erfasst; Dataset-Content- und Manifest-Hash stammen aus dem validierten Provider.
- `HistoricalBacktestCsvV1` besitzt 25 feste technische Spalten mit Einheiten. Contract: Semikolon, Punkt als Dezimaltrenner, ECMAScript-Shortest-Roundtrip ohne Gruppierung, LF, leere Missingness-Zellen sowie Apostroph-/Quote-Schutz gegen Formelinjektion, Delimiter, Quotes und Zeilenumbrueche. Auch rowlose `incomplete`-/`technical_error`-Resultate behalten eine Statuszeile.
- `BacktestRunResultV1` ist tief eingefroren und fuehrt kanonische Portfolio-Snapshots. `window.globalBacktestData.result` und `.rows` teilen exakt dieselbe immutable Instanz; Summary und Display formatieren nur diese Rohwerte. Der Detailtoggle wird vom Serializer nicht gelesen. `simulator-main-helpers.js` und seine HTML-Formatter blieben unveraendert.
- Die bestehenden JSON-/CSV-Buttons rufen den Serializer ausschliesslich nach explizitem Klick auf. Es gibt keine neue Persistenz, Uebertragung, Trial-Registry oder Replay-Semantik. Das Exportmanifest weist darauf hin, dass die vollstaendigen lokalen Finanzannahmen enthalten sind.
- Characterization-Delta: `legacy_schema_v0` wurde erwartungsgemaess durch `backtest_ui_state_v1` mit verschachteltem `BacktestRunResultV1`, Immutability- und Row-Identity-Nachweis ersetzt. Der fruehere Test-Hook fuer nachtraegliche Pflegebucket-Zeilenmutation wurde als reine Testprojektion umgesetzt; Golden-Werte, Ruinfrequenz, Portfolio-/Steuerzahlen und FlowDelta blieben unveraendert.
- Validierung: Export 57/57, Runner 121/121, Produktbacktest 56/56, Characterization 71/71, Metriken 298/298, Cohorts 59/59, 3-Bucket 15/15 und Logspalten 96/96 Assertions. `npm test`: 118 Testdateien, 5677/5677 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles. `npm run test:browser` bestand alle Einstiegspunkte und zusaetzlichen Browser-Flows; `git diff --check` ist fehlerfrei.
- Drei produktive Programmdateien wurden geaendert beziehungsweise neu angelegt. Engine-/Jahressemantik, MC/Sweep/Optimizer, Worker, PersistenceFacade, Displayformatter und generierte Artefakte blieben unveraendert. Slice 07 wurde freigegeben und lokal als `cce302b` committed.

### Slice 08: rueckdokumentierter Implementierungsstand

- `historical-backtest-ui.js` kapselt manifestabgeleitete `min`/`max`-Grenzen, feldnahe Integer-/Bounds-Validierung, stabil codierte Statusprojektionen, Fokus, Datenqualitaets-/In-sample-Hinweise, immutable Cohort-Inventare und semantisches Tabellen-HTML. Stacktraces, Causes und lokale Pfade werden nicht in Nutzertexte uebernommen.
- Der Modulhandler ersetzt den frueheren Inline-`onclick` des Startbuttons und bindet Start, Cohorttoggle, Detailtoggle und Raw-Downloads idempotent. Validierungsfehler fokussieren das erste Feld; `completed`, `ruin`, `incomplete` und `technical_error` fokussieren den terminalen Status. Reine Eingabefehler bleiben getrennt als `validation_error`.
- Die sichtbare Summary liest Start/Ende, Outcome, Jahrinventar, Metriken und Pflegebucket nur aus derselben tief eingefrorenen `BacktestRunResultV1`-Instanz wie Tabelle und Export. `data-canonical-value` dient dem Browser-Reconciliation-Gate, nicht einer zweiten Berechnung.
- Optional aktivierte Rolling Cohorts verwenden den freigegebenen Slice-06-Runner, zeigen feste Horizontlaenge, Kandidaten, geeignete/ausgeschlossene Fenster, getrennte Outcomes und Ausschlusscodes. UI und JSON-Export teilen einen tief eingefrorenen Inventarsnapshot; `eligible=0` zeigt `—`, nie `NaN` oder `Infinity`.
- Die Tabelle besitzt Caption, `scope="col"`, verstaendliche zugängliche Headernamen und einen fokussierbaren horizontal/vertikal scrollbaren Regionencontainer. Zellwerte werden vor der HTML-Projektion escaped. JSON/CSV bleiben Raw-Vertraege; der Detailtoggle aendert weder Row-Payload noch Result-Fingerprint.
- Das Playwright-Gate wartet auf den fachlichen Status statt auf 500 ms. Es prueft completed samt Cohorts, UI/Raw-Reconciliation fuer Periode, Outcome, Jahre, exakte 10-%-Metrik und Pflegebucket, JSON/CSV ohne HTML, Detailtoggle, Realbestands-Non-Mutation, leere/NaN-/nicht-ganzzahlige/rueckwaertige/out-of-bounds Fenster, synthetische mittlere Datenluecke, Ruin und `technical_error` ohne Alerts/Stackdetails.
- Das Characterization-Zieloracle wurde ausschliesslich fuer die erwartete sichtbare Summary- und Inline-Statusprojektion fortgeschrieben. Kanonische Row-Hashes, Finanzwerte, Ruinfrequenz und FlowDelta-Invarianten blieben unveraendert.
- Validierung: Syntaxchecks gruen; Backtest-UI 39/39, UI-Orchestrierung 37/37, Produktbacktest 56/56, Characterization 71/71 und 3-Bucket 15/15 Assertions gruen. `npm test` bestand 119 Testdateien mit 5722/5722 Assertions, 0 fehlgeschlagenen Dateien und 0 offenen Handles. Das vollstaendige Chromium-Browser-Gate bestand alle 14 Einstiegspunkt-/Zusatzflows und wurde nach Doku-Sync erneut gruen ausgefuehrt.
- Vier produktive Programmdateien wurden geaendert beziehungsweise neu angelegt. Engine-/Runner-/Zeitachsen-/Metriksemantik, MC/Sweep/Optimizer, Worker, Persistenz und generierte Artefakte blieben unveraendert. Implementierung und Selbstpruefung sind abgeschlossen; adversariales Review, Nutzerfreigabe und Commit stehen aus.


## Review-Auftrag

Gemini und Claude sollen den Plan vor jeder Implementierung insbesondere auf folgende Versagensszenarien challengen:

- verhaltensneutrale Runner-Extraktion verschiebt Objektmutation oder Engine-State;

- eine „saubere“ Zeitachse erzeugt unbemerkten Look-ahead;

- Missingness-Gates schliessen zu viele Jahre aus oder behandeln Nullwerte falsch;

- Ruin- und Error-Trennung divergiert zwischen Backtest und Monte Carlo;

## Review-Feedback von Gemini (Re-Review nach Plan-Überarbeitung)

### 1. Prüfdimensionen & Befunde

1. **Korrektheit (GAPs und Akzeptanzkriterien):**
   - **G-F-01 (Zeitachsen-Diskrepanz):** Die canonical Alignment-Tabelle für D-01 wurde vollständig in den Plan integriert. Der Mismatch zwischen Monte Carlo und Backtest ist präzise aufgeschlüsselt. Die getrennten Oracles (`legacy_observed` und `target_expected`) sichern diese Korrektur risikominimiert ab.
   - **G-F-02 (Datenlücken-Skip):** Der stumme Skip wurde als P0 in BT-02 klassifiziert. Slice 03/05 prüfen die Periode nun lückenlos und beenden fehlerhafte Läufe als `incomplete`.
2. **Vertragstreue:**
   - **G-F-03 (Monte-Carlo-Fehler-Leakage):** Der neue gemeinsame `SimulateYearOutcomeV1` Adapter stellt sicher, dass Engine-/Wrapper-Fehler einheitlich als `technical_error` und nicht als Ruin gewertet werden. Die Caller in MC, Sweep und Backtest werden im Zuge von Slice 05 entsprechend harmonisiert.
3. **Fehlerbehandlung:**
   - **G-F-05 (Performance der Validierung):** Die Dataset-Validierung erfolgt nun zweistufig (einmalig beim Laden) und die Preflight je Batch-Request vor dem Loop, wodurch die Performance in hot loops geschützt bleibt.
4. **Seiteneffekte:**
   - **G-F-04 (Mutation von Inputs/Kontext):** Slice 02 erfordert nun tief gefrorene Inputs, kanonische Laufkopien und Vorher-/Nachher-Hashes, um Parameterkontaminationen zuverlässig auszuschließen.
5. **Was könnte brechen?**
   - Die Zeitachsensynchronisation (Slice 04) wird zu veränderten historischen Performance-Ergebnissen führen. Der Plan sieht dafür die getrennten Oracle-Fixtures vor, was ein sauberes Regressionstuning ermöglicht.
   - **G-F-06 (Reconciliationsdrift):** Die Slices 06-08 erzwingen nun exakt dasselbe immutable, kanonische Resultat für UI, Metrik und Export, was Anzeigedrifte wirksam blockiert.
   - **G-F-07 (Negativtests im Browser-Gate):** Slice 08 umfasst nun explizit E2E-Tests für Falscheingaben, Ruin-Zustände und Fehlermeldungen.

### 2. Pre-Mortem
Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Szenario:* Die temporale Synchronisation (D-01) erzeugt bei den Randjahren (z. B. Start 1950 oder Ende 2025) durch unvollständige Lookup-Offsets in der Historie (z. B. Zugriff auf `t+1` oder `t-1` an den Arraygrenzen) stille Indexfehler oder `undefined`-Werte, die in nachgelagerten Berechnungsformeln der Engine unbemerkt zu verfälschten Vermögenswerten führen.

### 3. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - *Verschiebung historischer Werte:* Ergebnisse und optimale Entnahmeparameter verschieben sich durch die As-of-Korrektur (D-01).
  - *Worker-Serialisierung:* Der neue `SimulateYearOutcomeV1`-Adapter muss saubere, JSON-serialisierbare Objekte zurückgeben, um Klonierungsfehler bei der Worker-Thread-Kommunikation zu vermeiden.
  - *DAG-Komplexität:* Die parallelen und sequentiellen Slice-Pfade erhöhen den Koordinations- und Merge-Aufwand bei der Feature-Branch-Entwicklung.
- **Pre-Mortem:** (Siehe Szenario oben - Grenzjahres-Indexfehler durch zeitliche Offsets).

## Review-Feedback von Claude

# Claude-Review: Simulator / Backtest GAP-Analyse und Hardening-Plan

**Reviewer:** Claude (Antigravity-Session, adversariales Review)  
**Stand:** 2026-07-18  
**Geprüfte Dokumente:**

- [SIMULATOR\_BACKTEST\_GAP\_ANALYSE.md](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SIMULATOR_BACKTEST_GAP_ANALYSE.md)

- [SIMULATOR\_BACKTEST\_HARDENING\_PLAN.md](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/docs/internal/SIMULATOR_BACKTEST_HARDENING_PLAN.md)

- Alle 10 Slice-Dateien (01–10)

- Quellcode: [simulator-backtest.js](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js), [simulator-engine-direct.js](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-engine-direct.js), [simulator-year-portfolio.js](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-year-portfolio.js), [simulator-data.js](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-data.js)


## 1. Prüfdimensionen

### 1.1 Korrektheit vs. Akzeptanzkriterien

**Geprüft, Befunde dokumentiert.**

Die GAP-Analyse identifiziert 18 Befunde korrekt. Die Codereproduktion der P0-Befunde wurde am Quellcode verifiziert:

- **BT-01 (Zeitachse):** Bestätigt. [simulator-backtest.js:208-214](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L208-L214) – `HISTORICAL\_DATA\[jahr\].msci\_eur - dataVJ.msci\_eur` berechnet Aktienrendite als `(t) / (t-1)`, aber Gold und Inflation werden aus `dataVJ` (= `t-1`) gelesen, Rentenanpassung aus Arrays mit separatem `startYear`-Offset. Die GAP-Analyse beschreibt dies zutreffend.

- **BT-02 (Skip bei fehlenden Daten):** Bestätigt. Zeile 210: `continue` überspringt das Jahr, der `log`-String erhält eine Textzeile, aber `logRows` bekommt keinen Eintrag. Der Summary-Nenner `endJahr - startJahr + 1` (Zeile 412) zählt trotzdem alle Jahre.

- **BT-03 (Engine-Fehler → Ruin):** Bestätigt. [simulator-engine-direct.js:326-328](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-engine-direct.js#L326-L328) – `return \{ isRuin: true, error: fullResult.error \}` – jeder Engine-Fehler wird als wirtschaftlicher Ruin klassifiziert.

- **BT-04 (Ruin-Endvermögen):** Bestätigt. [simulator-backtest.js:237-276](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L237-L276) – bei `isRuin` wird `simState` nicht auf `result.newState` aktualisiert. Der `portfolioTotal(simState.portfolio)` in Zeile 383 reflektiert daher den Zustand *vor* dem Ruin-Jahr.

- **BT-07 (Datenvertrag):** Bestätigt. `DATASET\_META.series.msci\_eur.variantStatus = 'undocumented'` in [simulator-data.js:33](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-data.js#L33).

### 1.2 Vertragstreue (bestehende Contracts/Interfaces)

**Geprüft, Befunde dokumentiert.**

Der Hardening-Plan definiert drei neue Contracts (`BacktestRequestV1`, `HistoricalYearRecordV1`, `BacktestRunResultV1`), die korrekt als *neue* Verträge positioniert werden. Der Plan betont explizit, dass die bestehende EngineAPI nicht verändert werden soll (Leitprinzip, Stop-Regeln, Nicht-Ziele).

**Risiko:** Die Trennung von Ruin vs. `technical\_error` (BT-03, Slice 05) erfordert, dass `simulator-engine-direct.js` künftig zwischen Engine-Fehlern und wirtschaftlichem Ruin unterscheidet. Der aktuelle `return \{ isRuin: true \}` ist die *einzige* Schnittstelle. Die Frage, ob dies ohne EngineAPI-Änderung möglich ist, bleibt in D-04 korrekt als offener Entscheidungspunkt markiert, wird aber in Slice 05 möglicherweise unterschätzt.

### 1.3 Fehlerbehandlung (ungültige Eingaben, IO-Fehler, Rejection-Pfade)

**Geprüft, Befunde dokumentiert.**

- Die `parseInt()`-ohne-Radix-Praxis in Zeile 97-98 ist im BT-06 korrekt als Risiko benannt. Der Plan adressiert dies in Slice 03-04.

- Der `catch`-Block (Zeile 417-419) zeigt `error.stack` im `alert()` – ein korrekt identifizierter P2-Befund (BT-16).

- `formatPercentOneDecimal(value || 0, ...)` in Zeile 47 normalisiert `undefined`/`null`/`0`/`NaN`/`false` alle auf 0, was Datenlücken verschleiert. Dies ist im BT-02 implizit erfasst.

### 1.4 Seiteneffekte (Module außerhalb Slice-Scope)

**Geprüft, Befunde dokumentiert.**

Der Plan begrenzt jeden Slice auf ≤10 Programmdateien. Die voraussichtlichen Quellorte (Zeilen 120-124) sind plausibel. Allerdings listet die Slice-Übersicht Abhängigkeiten, die eine sequentielle Kette von 10 Slices erzeugen – ein einzelner Fehlentscheid in Slice 03 (Daten-/Jahresvertrag) propagiert in alle Folge-Slices.

### 1.5 Was könnte brechen? (Realistisches Versagensszenario)

Siehe Findings C-01 bis C-09 unten.


## 2. Findings

### C-01 – Runner-Extraktion in Slice 02 kann nicht verhaltensneutral sein, wenn Ruin-State-Mutation ungeklärt ist (P0, Blocker)

**Evidenz:** [simulator-backtest.js:237-278](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L237-L278) – bei Ruin wird `simState` *nicht* aktualisiert (Zeile 278 liegt nach dem `if`-Block, der bei `BREAK\_ON\_RUIN` den Loop verlässt). Der `logRows.push()` in Zeile 241-273 schreibt ein synthetisches Row-Objekt mit hardcodierten Nullwerten.

**Problem:** Slice 02 plant eine „verhaltensneutrale" Runner-Extraktion. Aber das Ruin-Verhalten ist ein impliziter Zustandsvertrag: Die Tatsache, dass `simState` bei Ruin auf dem Vorjahresstand bleibt, ist ein Seiteneffekt, der das Endvermögen im Summary bestimmt (BT-04). Eine Extraktion, die dieses Verhalten reproduziert, muss es zuerst als expliziten Vertrag einfrieren – was aber erst in Slice 05 geplant ist.

**Empfehlung:** Slice 01 muss einen Golden Case mit Ruin einfrieren, der den *exakten* Vorjahres-Endvermögenswert als erwartetes Ergebnis dokumentiert. Slice 02 darf die Extraktion erst dann als „verhaltensneutral" bezeichnen, wenn dieser Golden Case bestanden wird. Alternativ: Slice 02 explizit als „verhaltensneutral für completed-Pfade; Ruin-Verhalten wird in Slice 05 korrigiert" definieren.


### C-02 – Pflegebucket-Summary-Pfad greift ins Leere: `lastLogRow.health\_bucket\_enabled` existiert nicht (P0)

**Evidenz:** [simulator-backtest.js:397-405](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L397-L405) – `lastLogRow` ist ein Element aus `logRows`, das die Struktur `\{ jahr, row, entscheidung, ... \}` hat. Die Properties `health\_bucket\_enabled`, `health\_bucket\_end`, `health\_bucket\_real\_coverage\_pct`, `health\_bucket\_target\_gap` werden direkt auf `lastLogRow` gelesen, aber sie liegen (wenn überhaupt) unter `lastLogRow.row.health\_bucket\_\*`.

**Problem:** Die GAP-Analyse nennt dies in BT-05 nur als „Pflegebucket-Daten liegen unter `lastLogRow.row`". Der Hardening-Plan adressiert es in „Slices 05-06". Aber dies ist ein bestehender Defekt im *aktuellen* Produktivcode: Der Pflegebucket-Summary wird *niemals* angezeigt, weil `lastLogRow.health\_bucket\_enabled` immer `undefined` is. Dies ist nicht nur ein Architektur-GAP, sondern ein aktiver P0-Bug.

**Empfehlung:** Als existierender Defekt separat erfassen oder in BT-05 explizit als „bestehender Produktivcode-Bug" hochstufen. Der Golden Case in Slice 01 muss einen pflegebucket-aktiven Lauf einschließen und den leeren Summary als erwartetes (defektes) Baseline-Verhalten dokumentieren.


### C-03 – `BREAK\_ON\_RUIN`-Konfiguration ist nicht im BacktestRequest modelliert (P1)

**Evidenz:** [simulator-backtest.js:3](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L3) importiert `BREAK\_ON\_RUIN` aus `simulator-data.js`. Zeile 275: `if (BREAK\_ON\_RUIN) break;`. Der `BacktestRequestV1`-Contract im Hardening-Plan nennt `BREAK\_ON\_RUIN` nicht.

**Problem:** Ein Backtest-Ergebnis mit `BREAK\_ON\_RUIN = true` hat weniger `completedYears` als einer mit `false`. Wenn der Export ein Laufmanifest enthält (Slice 07), muss der Wert von `BREAK\_ON\_RUIN` im Manifest erscheinen, sonst sind Ergebnisse nicht reproduzierbar.

**Empfehlung:** `BacktestRequestV1` um ein Feld `breakOnRuin: boolean` erweitern. Im aktuellen Code stammt der Wert aus einer statischen Konstante – der Request sollte ihn explizit einschließen.


### C-04 – Rentenanpassungs-Zeitachse hat einen impliziten As-of-Vertrag, der in D-01 nicht genannt wird (P1)

**Evidenz:** [simulator-backtest.js:106-123](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L106-L123) – `wageGrowthArray` und `inflationPctArray` werden ab `HIST\_SERIES\_START\_YEAR = 1950` aufgebaut und über `yearIndex` Adressiert. `computeAdjPctForYear(backtestCtx, yearIndex)` nutzt diese Arrays.

**Problem:** Die Rentenanpassung nutzt `lohn\_de` und `inflation\_de` des Jahres `1950 + yearIndex`, nicht des Simulationsjahres `startJahr + yearIndex`. Wenn `startJahr = 2000`, `yearIndex = 0`, wird die Rentenanpassung aus dem Lohn-/Inflationswert von **1950** berechnet, nicht von 2000. Dies wäre ein massiver Fehler – aber nur, wenn `computeAdjPctForYear` den Array-Index direkt als Lookup nutzt.

> [!WARNING]
> Dieser Befund muss gegen den tatsächlichen Code in `computeAdjPctForYear` verifiziert werden. Falls die Funktion den `simStartYear`-Offset korrekt berücksichtigt, ist der Befund nicht materiell. Aber der implizite Vertrag ist dokumentationspflichtig.

**Empfehlung:** In D-01 oder Slice 03 den As-of-Vertrag der Rentenanpassungsreihen explizit klären und als eigenen Test einfrieren.


### C-05 – Kürzungsschwelle `\>= 10` vs. Label `\> 10`: Diskrepanz bestätigt, aber als P2 unterbewertet (P1)

**Evidenz:** [simulator-backtest.js:379](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L379): `if (entscheidung.kuerzungProzent \>= 10)`. [simulator-backtest.js:412](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L412): Label `Jahre mit Kürzung (\>10%)`.

**Problem:** Die GAP-Analyse nennt dies in BT-10 als P1-Produkt-GAP. Tatsächlich ist der Code (`\>= 10`) und das Label (`\> 10%`) widersprüchlich. Ein Jahr mit exakt 10% Kürzung wird gezählt, aber das Label behauptet, es würde nicht gezählt. Dies ist ein Korrektheitsproblem, kein reines Produkt-GAP.

**Empfehlung:** In Slice 01 als Golden Case einfrieren. In Slice 06 (Metrik-Reconciliation) den Widerspruch auflösen.


### C-06 – Slice-Abhängigkeitskette ist fragil: 10 sequentielle Slices ohne Parallelisierungspotential (P1, strukturell)

**Evidenz:** Die Slice-Übersicht zeigt eine strikt sequentielle Kette: 01 → 02 → 03 → 04 (blockiert durch D-01/D-03) → 05 → 06 (blockiert durch D-05) → 07 → 08 → 09 (extern blockiert) → 10.

**Problem:** Drei Slices sind durch externe Entscheidungen blockiert (D-01/D-03, D-05, externe Owner). Das bedeutet: Wenn D-01 nicht zeitnah entschieden wird, steht die gesamte Kette nach Slice 03 still. Es gibt kein Parallelisierungspotential. Bei 10 Slices mit je Review-Zyklus und Entscheidungs-Gates ist das Gesamtvorhaben zeitlich kaum abschätzbar.

**Empfehlung:** Prüfen, ob Slices 07 (Export) und 08 (UI/A11y) partiell unabhängig von den Zeitachsen-Entscheidungen (D-01) arbeiten könnten, sofern sie auf dem bestehenden (fehlerhaften) Zeitachsenverhalten aufbauen und nach Slice 04 nachgezogen werden.


### C-07 – `window.globalBacktestData` als einziges Ergebnisprotokoll hat keinen Schema-Vertrag (P1)

**Evidenz:** [simulator-backtest.js:386-394](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L386-L394) – `window.globalBacktestData` enthält `rows`, `startJahr`, `decumulationMode`, `goldAktiv`, `minimumFlexProfiles`. Kein `endJahr`, kein `outcome`, kein `completedYears`, kein `engineVersion`, kein Schema-Marker.

**Problem:** Der Hardening-Plan adressiert dies korrekt in BT-09 und plant `BacktestRunResultV1` in Slices 02/05. Aber der Slice-02-Plan nennt als Akzeptanzkriterium „Runner und UI erzeugen bitidentische logRows". Die Frage ist: Ist `window.globalBacktestData` das Referenzobjekt für die Paritätsprüfung? Falls ja, muss Slice 01 dessen Schema einfrieren, *bevor* Slice 02 es ersetzt.

**Empfehlung:** Slice 01 sollte einen Snapshot von `window.globalBacktestData` als „Legacy Schema v0" dokumentieren, gegen den Slice 02 die Parität nachweist.


### C-08 – `|| 0`-Normalisierung in der Return-Berechnung verschleiert Datenqualität (P0)

**Evidenz:** [simulator-backtest.js:106-107](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L106-L107): `histYears.map(y =\> HISTORICAL\_DATA\[y\].lohn\_de || 0)` und `HISTORICAL\_DATA\[y\].inflation\_de || 0`. [simulator-year-portfolio.js:13-15](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-year-portfolio.js#L13-L15): `isFinite(yearData.rendite) ? yearData.rendite : 0`.

**Problem:** BT-02 nennt dies als P0. Die GAP-Analyse ist hier zutreffend, aber der Hardening-Plan adressiert die `|| 0`-Stellen nur für `simulator-backtest.js` (Slice 03). Die gleiche Normalisierung in `simulator-year-portfolio.js:readYearReturnRates()` liegt *außerhalb* des Backtest-Codes und wird von MC- und Sweep-Runnern ebenfalls genutzt. Eine Änderung dort hätte Seiteneffekte auf die gesamte Simulationssuite.

**Empfehlung:** In Slice 03 explizit klären, ob `readYearReturnRates()` in-scope ist. Falls ja: Stop-Regel prüfen (Seiteneffekte auf MC/Sweep). Falls nein: als bewusstes Restrisiko dokumentieren.


### C-09 – Fehlende Absicherung gegen doppelte oder rückwärtige Jahresdurchläufe (P2)

**Evidenz:** [simulator-backtest.js:208](file:///c:/Users/Diete/Sync/DE_Privat/Rente/ChatGPT%20CLI/RuhestandsApp/app/simulator/simulator-backtest.js#L208): `for (let jahr = startJahr; jahr \<= endJahr; jahr++)`. Die Validierung in Zeile 99 prüft `startJahr \>= endJahr`, aber nicht `startJahr === endJahr` (was nach BT-06/D-02 als Einjahreslauf zugelassen werden soll).

**Problem:** Weder im aktuellen Code noch im Plan wird geprüft, ob `HISTORICAL\_DATA` lückenlose Schlüssel für den gesamten Bereich hat. `Object.keys(HISTORICAL\_DATA).map(Number).sort()` in Zeile 105 könnte Lücken enthalten. Die Schleife `jahr++` iteriert trotzdem über alle Integer-Werte.

**Empfehlung:** In Slice 03 einen Manifest-Check einbauen, der *vor* der Schleife verifiziert, dass `HISTORICAL\_DATA\[jahr\]` für alle `startJahr \<= jahr \<= endJahr` existiert.


## 3. Pre-Mortem

> **Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?**

Die wahrscheinlichste Ursache ist, dass **Slice 02 (DOM-freie Runner-Extraktion) als „verhaltensneutral" deklariert wird, aber den Ruin-State-Mutationspfad subtil verändert**, weil der Golden Case in Slice 01 keinen Ruin-Lauf mit Pflegebucket enthält. Das Summary zeigt dann ein positives Endvermögen für einen Lauf, der tatsächlich Ruin erreicht hat, oder – umgekehrt – einen Lauf, der bisher durch den BT-04-Bug ein positives Endvermögen zeigte, zeigt nach der Extraktion plötzlich 0 €. Nutzer, die den Backtest regelmäßig verwenden, bemerken die Abweichung und verlieren Vertrauen in die gesamte Suite.

Zweitwahrscheinlichste Ursache: Die Zeitachsen-Entscheidung D-01 wird verzögert, Slices 01-03 werden implementiert, und beim Einstellen des expliziten As-of-Vertrags in Slice 04 stellt sich heraus, dass die Golden Cases aus Slice 01 auf der *alten* (fehlerhaften) Zeitachse eingefroren wurden und nicht als Regressions-Baseline taugen, weil sie die erwartete Verschiebung nicht vorhersagen können.


## 4. Antworten auf die sieben Review-Fragen der GAP-Analyse

### Frage 1: Ist BT-01 wirklich eine inkonsistente Zeitachse?

**Ja.** Die Codeevidenz ist eindeutig: Aktienrendite nutzt `t/(t-1)`, Gold/Inflation nutzt `(t-1)`, Renten nutzen array-basierte Offsets. Es gibt keinen dokumentierten fachlichen Grund für die unterschiedlichen Offsets. Der Offset für Gold (`gold\_eur\_perf` aus `dataVJ`) bedeutet, dass die Gold-Performance des Vorjahres auf das Portfolioverhalten des aktuellen Jahres angewandt wird. Dies *könnte* beabsichtigt sein (wenn `gold\_eur\_perf` eine Jahresperformance-Kennzahl ist, die dem Vorjahr zugeordnet ist), aber diese Konvention ist nirgends dokumentiert.

### Frage 2: Lässt sich Engine-Fehler von wirtschaftlichem Ruin trennen, ohne den EngineAPI-Vertrag zu ändern?

**Teilweise.** Der Caller `simulator-engine-direct.js:326-328` kann zwischen `fullResult.error` (technischer Fehler) und einem späteren wirtschaftlichen Ruin (z.B. `portfolio \<= 0`) unterscheiden, ohne `engine.simulateSingleYear()` selbst zu ändern. Aber: Der aktuelle Code gibt bei *jedem* Engine-Fehler `\{ isRuin: true \}` zurück. Eine Änderung zu `\{ isTechnicalError: true \}` in `simulator-engine-direct.js` ist eine Änderung des *internen* Vertrags dieses Moduls, nicht der EngineAPI. Dies ist machbar, erfordert aber eine Anpassung aller Caller (Backtest, MC-Runner, Sweep). **Stop-Regel:** Prüfen, ob MC- und Sweep-Runner denselben `isRuin`-Pfad nutzen.

### Frage 3: Ist die Runner-Grenze klein genug?

**Bedingt ja**, wenn die Runner-Extraktion den `simState`-Mutationszyklus und den `logRows`-Aufbau *exakt* repliziert. Die Hauptgefahr ist der Ruin-Pfad (siehe C-01). Für den completed-Pfad ist die Grenze handhabbar, da die Schleife in Zeilen 208-381 klar strukturiert ist.

### Frage 4: Welche Golden Cases müssen eingefroren werden?

Mindestens:

1. **Completed-Pfad, kurzes Fenster** (z.B. 2000-2005): Endvermögen, Entnahme, Kürzungsjahre

2. **Completed-Pfad, langes Fenster** (z.B. 1960-2020): Gleiche Metriken

3. **Ruin-Pfad** (Fenster mit bekanntem Ruin): Endvermögen (= Vorjahresstand, *nicht* 0), Ruin-Jahr

4. **Pflegebucket-aktiver Lauf**: Summary mit pflegebucket-Werten (aktuell: leer wegen BT-05/C-02)

5. **Dynamic-Flex/CAPE-aktiver Lauf**: VPW-Spalten und Metriken

6. **Einjahreslauf** (aktuell blockiert durch Validierung): als Negativ-Case

7. **Fehlende Daten** (z.B. Jahr vor 1950): als Negativ-Case

### Frage 5: Rolling Cohorts – erforderlich, optional oder getrenntes Feature?

**Optional für das Hardening, aber fachlich wertvoll.** Der Hardening-Plan positioniert sie korrekt als D-05-Entscheidung. Für die Produktqualität ist es wichtiger, erst die Einzelpfad-Korrektheit (Slices 01-05) herzustellen. Rolling Cohorts ohne korrekte Outcome-Trennung (Slice 05) würden defekte Einzelpfade vervielfachen.

### Frage 6: Welche Arbeiten müssen blockiert bleiben?

- Datenersetzung/-beschaffung (kein Owner)

- Kostenmodell (Engine-Semantik betroffen, kein Fachvertrag)

- Internationale Vergleiche (keine Daten)

- Holdout-Auswertung (kein Protokoll, kein Custodian)

- Trial-Persistenz (Datenschutz-/Speichervertrag offen)

Diese Grenzen sind im Plan korrekt in Slice 09 und den Nicht-Zielen erfasst.

### Frage 7: Welche Versagensszenarien fehlen?

Siehe Findings C-01 bis C-09. Zusammenfassend fehlen:

- Der Pflegebucket-Summary-Bug (C-02)

- Die Rentenanpassungs-Zeitachse (C-04)

- `BREAK\_ON\_RUIN` im Request (C-03)

- Seiteneffekte auf MC/Sweep bei Änderung von `readYearReturnRates()` (C-08)

- Fehlende Manifest-Vollständigkeitsprüfung (C-09)


## 5. Review-Ergebnis

### GAP-Analyse

- **Status:** freigegeben mit Auflagen

- **Blocker:** keine

- **Auflagen:**

  - C-02: BT-05 muss als P0-Defekt (nicht nur P1-Architektur-GAP) reklassifiziert werden, da der Pflegebucket-Summary im aktuellen Code *nie* angezeigt wird.

  - C-04: Eine zusätzliche Zeile in der GAP-Matrix für die Rentenanpassungs-Zeitachse einfügen (oder in BT-01 explizit integrieren).

- **Restrisiken:**

  - Die Analyse deckt nur den Backtest-Pfad ab. Identische `|| 0`-Normalisierung und Ruin-Klassifikation in MC-/Sweep-Runnern bleiben unanalysiert.

  - Die Reproduktionsprobe für 2000 (BT-01) wurde nicht gegen einen unabhängigen Rechner verifiziert.

### Hardening-Plan

- **Status:** freigegeben; bereit für die Umsetzung (Slices 01-10 freigegeben)

- **Blocker:** keine

- **Restrisiken:**
  - *Verschiebung historischer Werte:* Ergebnisse und optimale Entnahmeparameter verschieben sich durch die As-of-Korrektur (D-01).
  - *Worker-Serialisierung:* Der neue `SimulateYearOutcomeV1`-Adapter muss saubere, JSON-serializable Objekte zurückgeben, um Klonierungsfehler bei der Worker-Thread-Kommunikation zu vermeiden.
  - *DAG-Komplexität:* Die parallelen und sequentiellen Slice-Pfade erhöhen den Koordinations- und Merge-Aufwand bei der Feature-Branch-Entwicklung.
- **Pre-Mortem:** (Siehe Szenario oben - Grenzjahres-Indexfehler durch zeitliche Offsets).

### Slice-Dateien (01-10)

- **Status:** freigegeben unter Vorbehalt des Hauptplan-Reviews

- **Blocker:** keine eigenständigen (alle von Hauptplan-Auflagen abhängig)

- **Restrisiken:** Slice-spezifische Diff-Risiko-Blöcke sind noch leer; die tatsächliche Dateigrenzen-Prüfung erfolgt erst bei Umsetzungsbeginn.


## 6. Zusammenfassung für Codex

| ID | Finding | Empfohlene Aktion | Dringlichkeit |
| - | - | - | - |
| C-01 | Ruin-State-Mutation nicht in Slice 01 eingefroren | Golden Case mit Ruin in Slice 01 | Blocker vor Slice 02 |
| C-02 | Pflegebucket-Summary greift ins Leere (Bug) | BT-05 auf P0 hochstufen; Golden Case ergänzen | Blocker |
| C-03 | `BREAK\_ON\_RUIN` fehlt in BacktestRequestV1 | Feld ergänzen | Auflage |
| C-04 | Rentenanpassungs-Zeitachse unklar | In D-01 oder GAP-Matrix aufnehmen | Auflage |
| C-05 | Kürzungsschwelle ≥10 vs. Label \>10% | In Slice 01 oder 06 korrigieren | Auflage |
| C-06 | 10 sequentielle Slices ohne Parallelisierung | Parallelisierung für 07/08 prüfen | Empfehlung |
| C-07 | `globalBacktestData`-Schema nicht eingefroren | In Slice 01 als Legacy-Baseline | Auflage |
| C-08 | `readYearReturnRates()` Scope unklar | In Slice 03 klären (MC/Sweep-Seiteneffekte) | Auflage |
| C-09 | Kein Manifest-Vollständigkeitscheck | In Slice 03 aufnehmen | Auflage |



## Review-Antworten von Codex

Die Findings wurden gegen die aktuellen Aufrufer und Datenpfade nachgeprueft. Codex erteilt damit keine Freigabe; die folgende Tabelle dokumentiert nur, wie der Plan geaendert wurde.

| Finding | Nachpruefung | Antwort / Planaenderung |
| --- | --- | --- |
| G-F-01 | bestaetigt | BT-01 nennt jetzt die konkrete Backtest-/MC-Diskrepanz. D-01 besitzt eine feldgenaue Alignment-Tabelle; Slices 01/03/04 verlangen Legacy-, MC- und Zieloracles. |
| G-F-02 | bestaetigt | Slice 03 prueft die gesamte ganzzahlige Periode vor der Schleife; Slice 04/05 verbieten `continue` und erzeugen `incomplete`. |
| G-F-03 | bestaetigt | `monte-carlo-runner.js` prueft aktuell `result.error` nicht, Sweep dagegen schon. Slice 05 umfasst den gemeinsamen Adapter-/Caller-Vertrag, technische MC-Inventare und Workerparitaet. |
| G-F-04 | als Risiko bestaetigt, aktuelle direkte `inputs.*`-Zuweisung nicht gefunden | Slice 02 verlangt eine kanonische Laufkopie, tief eingefrorene Inputs und Vorher-/Nachher-Hashes. Die Technik wird nicht auf JSON-Cloning festgelegt, weil Typ-/`undefined`-Semantik erhalten bleiben muss. |
| G-F-05 | bestaetigt | Datasetvalidierung einmal je Revision/Hash, Periodenpreflight einmal je Request/Batch; keine Vollvalidierung in heissen Schleifen. Call-Count und Performance sind Gates. |
| G-F-06 | bestaetigt | Slices 06-08 verlangen dasselbe immutable canonical Result fuer Metrik, UI und Export sowie explizite Reconciliation. |
| G-F-07 | bestaetigt | Slice 08 nennt leere/NaN-/nicht-ganzzahlige/rueckwaertige Perioden, Datenluecke, Ruin und `technical_error` as deterministische Browserfaelle. |
| C-01 | bestaetigt | Slice 01 friert den exakten defekten Ruin-State als `legacy_observed_gap` ein; Slice 02 muss ihn erhalten, Slice 05 korrigiert erst danach gegen ein getrenntes Zieloracle. |
| C-02 | bestaetigt | Pflegebucket wurde als eigener P0 BT-19 erfasst; Legacy-Leerfeld in Slice 01, Korrektur/Reconciliation in Slice 05/06. |
| C-03 | bestaetigt | `breakOnRuin` ist Pflichtfeld in Request, Resultat, Fingerprint und Export. |
| C-04 | Hypothese „Zugriff auf 1950“ widerlegt, Contract-Risiko bestaetigt | `computeAdjPctForYear()` nutzt `simStartYear - series.startYear + yearIdx`. Probe Start 2000/Index 0 ergibt 2,5 % aus 2000, nicht 12 % aus 1950. Slices 01/03/04 erhalten dennoch Marker-/Off-by-one-Tests. |
| C-05 | bestaetigt | Exakt 10 % wird in Slice 01 charakterisiert und in Slice 06 als einheitlicher Operator-/Label-/Exportcontract entschieden. |
| C-06 | bestaetigt | Der lineare Plan wurde in einen DAG umgebaut: 02/03 parallel vorbereitbar, 04/05 getrennte Fachtracks, 06 nur teilweise D-05-blockiert, 07/08 partiell parallel bei disjunkten Dateien, 09 frueh startbar. |
| C-07 | bestaetigt | Slice 01 friert `window.globalBacktestData` as `legacy_schema_v0`; Slices 02/07 versionieren die Abloesung. |
| C-08 | bestaetigt | Neuer P0 BT-20. Slice 03 aendert den Shared-Normalizer bewusst nicht; Slice 05 schliesst ihn erst nach D-09, Aufruferinventur, Performance- und Workerparitaetsgate. |
| C-09 | bestaetigt; „doppelt/rueckwaertig“ is primaer Perioden-/Manifestcontract | Slice 03 Prueft vor Lauf jedes Integerjahr und Pflichtfeld; Slice 08 prueft rueckwaertige/ungueltige Eingaben. |

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| - | - | - | - | - |
| G-F-01 bis G-F-07 | Gemini | blockierende Contract-, Fehler-, Performance-, Reconciliation- und E2E-Findings | freigegeben durch Gemini | GAPs/Plan, Slices 01-08 |
| C-01 bis C-03 | Claude | Ruinbaseline, Pflegebucket P0, `breakOnRuin` | freigegeben durch Claude | BT-09/BT-19, Slices 01/02/05/07 |
| C-04 | Claude | moeglicher 1950-Rentenoffset | konkrete Defekthypothese verworfen, Testauflage eingearbeitet | Evidenzprobe, BT-01, Slices 01/03/04 |
| C-05 bis C-09 | Claude | Metrikgrenze, DAG, Legacy-Schema, Shared-Fallback, Periodenvollstaendigkeit | freigegeben durch Claude | BT-10/BT-20, DAG, Slices 01-09 |
