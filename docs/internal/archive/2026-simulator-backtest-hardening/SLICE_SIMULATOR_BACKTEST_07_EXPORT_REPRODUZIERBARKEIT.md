# Slice 07: Versionierter Export und Reproduzierbarkeit

**Arbeitsplan:** [SIMULATOR_BACKTEST_HARDENING_PLAN.md](./SIMULATOR_BACKTEST_HARDENING_PLAN.md)  
**Feature-Branch:** `codex/simulator-backtest-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Status:** freigegeben; Gemini-Review abgeschlossen, lokal committed als `cce302b`
**Abhaengigkeit:** Slices 02-05 und Metrikteil von Slice 06 freigegeben; Cohortexport nur nach freigegebenem D-05/Cohortteil  
**GAPs:** BT-09, BT-12, BT-13, BT-17

## Ziel

Backtest-Exporte werden von der HTML-/Displayformatierung getrennt. Ein versionierter Raw-JSON-Export enthaelt den vollstaendigen Request-, Daten-, Temporal-, Engine-/Config-, Outcome-, Jahreszeilen- und Metrikvertrag. CSV bleibt eine stabile flache Datenansicht mit Rohzahlen und eindeutigen Einheiten.

Ein Laufmanifest verbessert Reproduzierbarkeit, ist aber noch kein vollstaendiges append-only Trial-Register und kein Holdout-Nachweis.

## Akzeptanzkriterien

- Raw-JSON besitzt eine eigene Schema-ID/-Version und enthaelt:
  - Run-/Request-ID,
  - vollstaendigen Zeitraum/Modus,
  - `breakOnRuin` und Completion-/Nennersemantik,
  - kanonische Inputs oder dokumentiert ausgeschlossene Felder,
  - Dataset-/Manifestrevision und Hash,
  - Temporal-Konvention,
  - Engine-Build-/Config-Fingerprint,
  - Outcome, Warnungen, Fehlercode ohne Stack,
  - kanonische Portfolio-Snapshots, Jahreszeilen, Metriken und optional Cohort-Inventar.
- `exportedAt` ist Metadatum und nicht Teil des reproduzierbaren Result-Fingerprints.
- Zahlen bleiben in JSON Zahlen; keine lokalisierten Eurostrings, Abkuerzungen oder HTML-Tags.
- CSV verwendet stabile technische Spaltennamen mit Einheitssuffixen, dokumentierten leeren Werten und einem festen Dezimalcontract.
- Textzellen werden gegen CSV-Formelinjektion und korrekt gegen Delimiter/Quotes/Newlines abgesichert.
- Der sichtbare Detailtoggle beeinflusst nur die Tabelle, nie den Raw-Exportumfang.
- Displayformatter duerfen weiterhin HTML fuer die Tabelle liefern, werden aber vom Serializer nicht aufgerufen.
- UI und Export konsumieren dieselbe immutable `BacktestRunResultV1`-Instanz beziehungsweise denselben kanonischen Rohsnapshot. Ein Reconciliationstest prueft Rohwert -> Metrik -> Displaytext und verbietet eine zweite Berechnung im UI-/Exportadapter.
- Roundtrip-/Schema-/Golden-Tests pruefen deterministische Serialisierung ohne lokale Pfade oder persoenliche Testdaten.
- Export erfolgt nur auf explizite Nutzeraktion; keine neue automatische Persistenz oder Uebertragung.

## Scope

- Raw-JSON-Schema und Serializer
- stabiler CSV-Rohdatenexport
- Run-/Config-/Dataset-Fingerprint
- Trennung Serializer vs. Displayprojektion
- Exporttests und Dateinamencontract

## Nicht-Scope

- kein Cloud-/Netzwerkexport
- kein automatisches persistentes Trial-Log
- keine Holdout-Verwaltung
- keine neue Datenerhebung
- keine Aenderung der Rechenergebnisse
- keine allgemeine Import-/Replay-Funktion; diese waere ein Folgefeature

## Geplante Dateien

Voraussichtlich:

- neu: `app/simulator/historical-backtest-export.js`
- geaendert: `app/simulator/historical-backtest-runner.js`
- geaendert: `app/simulator/simulator-backtest.js`
- neu: `tests/historical-backtest-export.test.mjs`
- geaendert: `tests/historical-backtest-runner.test.mjs`
- geaendert: `tests/simulator-backtest.test.mjs`
- geaendert: `tests/simulator-backtest-characterization.test.mjs`
- geaendert: `tests/fixtures/simulator-backtest-target-v1.json`
- Doku-Sync: `README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/SIMULATOR_MODULES_README.md`, Arbeitsplan und diese Slice-Datei

Produktive Programmdateien: 3. Test-/Fixture- und Markdowndateien zaehlen gemaess Stop-Regel nicht in die Programmdateigrenze.

## Export-Grenze

```text
BacktestRunResultV1
  -> raw JSON serializer (vollstaendig, typisiert, versioniert)
  -> raw CSV projection (flach, technische Header, keine HTML-Formatter)
  -> display columns (lokalisiert, optional HTML, nur UI)
```

Der Serializer kann nach stabilem Result-/Metrikcontract unabhaengig vom UI-A11y-Teil aus Slice 08 entwickelt werden. Aendern beide Slices `simulator-backtest.js` oder `simulator-main-helpers.js`, werden sie im selben Arbeitsbaum nicht parallel codiert; alternativ wird zuerst die Serializergrenze in ein eigenes Modul gezogen.

## Diff-Risiko vor Coding

```text
Vor Implementierungsstart:
- git branch --show-current: codex/simulator-backtest-gap-plan
- git status --short:
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

Geplante Dateien:
- app/simulator/historical-backtest-export.js
- app/simulator/historical-backtest-runner.js
- app/simulator/simulator-backtest.js
- tests/historical-backtest-export.test.mjs
- tests/historical-backtest-runner.test.mjs
- tests/simulator-backtest.test.mjs
- docs/internal/SLICE_SIMULATOR_BACKTEST_07_EXPORT_REPRODUZIERBARKEIT.md
- docs/internal/SIMULATOR_BACKTEST_HARDENING_PLAN.md

Voraussichtliche Änderungstiefe:
- mittel bis riskant; oeffentlicher Dateivertrag aendert sich

Gefährdete bestehende Tests:
- simulator-3bucket-ui-e2e.test.mjs
- simulator-log-columns.test.mjs
- simulator-backtest.test.mjs
- Browser-Downloadpfad

Nicht anfassen:
- Runner-/Engine-Fachsemantik
- MC-Scenario-Export ohne expliziten Scope
- PersistenceFacade
- externe APIs
- simulator-main-helpers.js und seine Displayformatter
- engine.js, dist/**, RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/historical-backtest-runner.js app/simulator/simulator-backtest.js tests/historical-backtest-runner.test.mjs tests/simulator-backtest.test.mjs docs/internal/SIMULATOR_BACKTEST_HARDENING_PLAN.md
- neue Serializer-/Testdatei und die unversionierte Slice-Datei nur nach Nutzerfreigabe entfernen
```

## Geplante Tests

- kein `<span>`/HTML in JSON und CSV bei positiven/negativen Trades
- Zahlen bleiben Zahlen in JSON
- Detailtoggle veraendert Fingerprint/Raw-Export nicht
- `exportedAt` veraendert Fingerprint nicht
- Config-/Dataset-/Temporal-Aenderung veraendert Fingerprint
- CSV escaping und Formelinjektionsschutz
- completed/ruin/incomplete/technical_error Exporte
- `node tests/run-single.mjs tests/historical-backtest-export.test.mjs`
- `node tests/run-single.mjs tests/simulator-3bucket-ui-e2e.test.mjs`
- `node tests/run-single.mjs tests/simulator-log-columns.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `npm test`

## Review-Auflagen in diesem Slice

- Gemini G-F-06: Raw-Export und UI verwenden exakt dasselbe canonical Model; Displayrundung darf keine zweite wirtschaftliche Berechnung sein.
- Claude C-03/C-07: `breakOnRuin` und die Abloesung von `legacy_schema_v0` sind versioniert im Manifest/Schema sichtbar.
- Claude C-06: Single-Path-Serializer darf parallel zum UI-A11y-Track vorbereitet werden, aber nur bei disjunkter Dateiliste.

## Stop-Regeln dieses Slice

- Relevante Config-/Inputfelder koennen nicht stabil identifiziert werden.
- Fingerprint ist laufzeit-/plattformabhaengig.
- Serializer benoetigt Displayformatter oder DOM.
- Export wuerde automatisch sensible Daten persistieren/uebertragen.
- Rechenwerte oder FlowDelta aendern sich.
- Eine Import-/Replay-Semantik muesste implizit erfunden werden.

## Durchgefuehrte Aenderungen

- Neues DOM-freies Modul `historical-backtest-export.js` mit Schema-ID `de.ruhestandsapp.historical-backtest.raw`, Version `HistoricalBacktestExportV1`, Request-/Run-ID und kanonischem SHA-256-Result-Fingerprint.
- Raw-JSON exportiert den vollstaendigen `BacktestRequestV1`, Completion-/Outcome-/Fehlervertrag, Dataset-/Manifest-/Temporal-/Engineprovenienz, Start-/Endportfolio-Snapshots, Historical-Year-Records, unverkuerzte Jahreszeilen, kanonische Metriken/Summary und optional ein uebergebenes Cohort-Inventar. Zahlen bleiben finite JSON-Zahlen; interne `diagnostics`, Causes und Stacktraces werden nicht exportiert.
- `exportedAt`, IDs, Exportmetadaten und interne Diagnostik sind explizit nicht Bestandteil des Result-Fingerprints. Request-ID und Run-ID werden deterministisch aus Request- beziehungsweise Result-Fingerprint abgeleitet.
- Engine-API-/Build-ID und Fingerprint der vollstaendigen Runtime-Config werden beim Laufstart erfasst. Der Runner ergaenzt Dataset-Manifest-Schema/-Hash, erste/letzte Laufjahre, Warnungsliste und unveraenderte Portfolio-Snapshots.
- `BacktestRunResultV1` wird tief eingefroren. `window.globalBacktestData.result` und `.rows` referenzieren dieselbe immutable Runner-/Row-Instanz fuer UI, Summary, Tabelle und Export.
- `HistoricalBacktestCsvV1` verwendet 25 feste technische Spalten mit Einheitssuffixen, Semikolon, Punktdezimalen, LF und leeren Missingness-Feldern. Textzellen erhalten Apostrophschutz fuer Formelprefixe sowie korrektes Quote-/Delimiter-/Newline-Escaping. Rowlose Fehler-/Incomplete-Resultate behalten eine Statuszeile.
- Die bestehenden Exportbuttons erzeugen erst auf expliziten Nutzerklick einen Download. Der sichtbare Detailtoggle und `simulator-main-helpers.js`/Displayformatter werden vom neuen Serializer nicht gelesen.
- Characterization wurde von `legacy_schema_v0` auf `backtest_ui_state_v1` aktualisiert. Der fruehere mutierende Pflegebucket-Testhook wurde als getrennte Testprojektion erhalten, weil kanonische Resultzeilen nun absichtlich immutable sind. Die Target-Fixture aendert nur diese Schema-/Testmetadaten; Finanzwerte, Ruinfrequenz und FlowDelta bleiben unveraendert.
- README, technische Referenz, Simulator-Modulreferenz und Arbeitsplan dokumentieren Schema, Fingerprintgrenze, CSV-Contract, Datenschutz-/Explizitaktionsgrenze und den neuen Modulzuschnitt.

## Ausgefuehrte Tests

- `node tests/run-single.mjs tests/historical-backtest-export.test.mjs`: 57/57 Assertions.
- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`: 121/121 Assertions.
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`: 56/56 Assertions.
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`: 71/71 Assertions.
- `node tests/run-single.mjs tests/historical-backtest-metrics.test.mjs`: 298/298 Assertions.
- `node tests/run-single.mjs tests/historical-backtest-cohorts.test.mjs`: 59/59 Assertions.
- `node tests/run-single.mjs tests/simulator-3bucket-ui-e2e.test.mjs`: 15/15 Assertions.
- `node tests/run-single.mjs tests/simulator-log-columns.test.mjs`: 96/96 Assertions.
- `npm test`: 118 Testdateien, 5677/5677 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:browser`: alle Einstiegspunkte und zusaetzlichen Browser-Smoke-Flows gruen, einschliesslich `Simulator.html`.
- `git diff --check`: fehlerfrei.

## Ergebnisse

- Golden-Fingerprint der synthetischen Exportfixture: `1a9093fcbd28ff650c8079a7501ba4f534c3aea45bd13f5a96221335249a59b3`.
- Unterschiedliche Exportzeitpunkte und Displaydetailstufen erzeugen denselben Run-Fingerprint und denselben Raw-Resultumfang. Config-, Dataset-, Temporal- oder Cohort-Inventar-Aenderungen veraendern den Fingerprint.
- JSON-Roundtrip behaelt den versionierten Dokumentinhalt und Zahltypen. completed, ruin, incomplete und technical_error bleiben in JSON und CSV diskriminiert; Fehlercodes bleiben erhalten, Stacktraces/Causes fehlen.
- CSV-Tests belegen Rohzahlen ohne Lokalisierung/HTML, feste Header/Einheiten, leere Missingness sowie Formel-/Quote-/Delimiter-/Newline-Schutz.
- Reconciliation belegt Rohjahreszeile -> `HistoricalBacktestMetricsV1` -> Summary -> formatierter Displaytext ohne zweite wirtschaftliche Berechnung.
- Keine neue Persistenz, Netzwerkuebertragung, Trial-Registry oder Replay-/Importsemantik wurde eingefuehrt.

## Abweichungen vom Plan

- `historical-backtest-runner.js` wurde additiv erweitert, weil Engine-/Manifestprovenienz und echte Start-/Endportfolio-Snapshots zum Laufzeitpunkt erfasst werden muessen; eine nachtraegliche Ermittlung im Exportadapter waere nicht reproduzierbar.
- `simulator-main-helpers.js`, `simulator-3bucket-ui-e2e.test.mjs` und `simulator-log-columns.test.mjs` blieben unveraendert. Ihre bestehenden fokussierten Tests wurden als Regression ausgefuehrt.
- Characterization-Test und Target-Fixture mussten die beabsichtigte Abloesung von `legacy_schema_v0` sowie die neue Immutability abbilden. Das gepruefte Delta umfasst nur Schema-/Testmetadaten; keine Rechenergebnisse.
- Der Doku-Sync wurde wegen geaendertem Nutzerworkflow und Modulzuschnitt bereits in Slice 07 statt erst gesammelt in Slice 10 durchgefuehrt.

## Offene Risiken

- Ein vollstaendiger Inputexport kann persoenliche Finanzannahmen enthalten; Nutzerhinweis und explizite Aktion sind Pflicht.
- Ein Runmanifest ist kein Beleg fuer vollstaendiges Trial-Logging, wenn fruehere/manuelle Versuche fehlen.
- Der Export ist noch keine allgemeine Replay-/Importfunktion; Reproduzierbarkeit bedeutet hier vollstaendige Provenienz und stabile Serialisierung, nicht automatische Neuausfuehrung.
- Cohort-Inventar wird nur exportiert, wenn ein Caller das bereits kanonische Inventar uebergibt. Slice 07 startet keinen Cohortlauf und berechnet keine Cohortmetrik neu.

## Rueckdokumentation

Schemas, Fingerprintalgorithmus/-version, CSV-/Datenschutzgrenze, Testresultate und Modulzuschnitt sind in Arbeitsplan, `README.md`, `docs/reference/TECHNICAL.md` und `docs/reference/SIMULATOR_MODULES_README.md` eingetragen.

## Freigabestatus

Freigegeben am 2026-07-19 und lokal als `cce302b` committed. Die Slice-Ausfuehrung dokumentierte 5677/5677 Assertions.

## Review-Feedback von Gemini

## Review-Resultat
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  - **Sensible Daten im Export**: Da der gesamte Request (inkl. Startvermögen, Renten, Rentenbeginn etc.) im Raw-JSON exportiert wird, enthält die Datei sensible persönliche Finanzdaten. Dies erfordert im UI einen deutlichen Warnhinweis bei der Export-Aktion.
- Pre-Mortem:
  Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Drittanbieter-Tool (oder eine Excel-Vorlage des Nutzers) parst die generierten CSV-Dateien und verlässt sich auf die exakte Spaltenreihenfolge. Wenn in Zukunft neue Diagnosefelder oder Spalten in der Mitte der CSV-Spaltenliste in `historical-backtest-export.js` eingeführt werden, bricht dieser Import-Parser, da CSVs häufig positionsbasiert statt namensbasiert gelesen werden.

## Review-Feedback von Claude

Nicht durchgefuehrt; fuer diesen Slice ist kein optionales Claude-Zweitreview eingetragen.

## Review-Antworten von Codex

- Das Gemini-Datenschutzrisiko ist angenommen. Der Export bleibt eine explizite Nutzeraktion; README, UI-Notice und Referenzen weisen auf die vollstaendigen lokalen Finanzannahmen hin. Es gibt keine automatische Persistenz oder Uebertragung.
- Die CSV-Spaltenreihenfolge ist Teil von `HistoricalBacktestCsvV1` und durch Golden-/Header-Tests fixiert. Kuenftige Schemaaenderungen benoetigen Versionierung statt stiller positionsveraendernder Erweiterung.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| D-06 | Nutzer | Runmanifest vs. persistentes Trial-Log | angenommen durch Auftrag `Implementiere Slice 07` auf Basis des freigegebenen Plans | vollstaendiges Runmanifest implementiert; persistentes Trial-Log bleibt Nicht-Scope |
| G-F-06 | Gemini | UI/Export muessen dasselbe canonical Model verwenden | angenommen | tief eingefrorenes `BacktestRunResultV1`; identische Result-/Row-Referenz und Reconciliationtests |
| C-03/C-07 | Claude | `breakOnRuin` und Abloesung von `legacy_schema_v0` versionieren | angenommen | `breakOnRuin` in Request/Result/Fingerprint/Export; `backtest_ui_state_v1` und `HistoricalBacktestExportV1` |
