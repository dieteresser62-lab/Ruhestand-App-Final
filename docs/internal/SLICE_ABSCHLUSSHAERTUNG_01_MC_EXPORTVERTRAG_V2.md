# Slice Abschlusshaertung 01: MC-Exportvertrag V2

**Feature-Branch:** `codex/fokussierte-abschlusshaertung`<br>
**GitHub-Status:** lokal angelegt; nicht veroeffentlicht, da keine Push-Freigabe vorliegt<br>
**Status:** Claudes Code-Review-Findings C-01 bis C-04 am 2026-08-07 korrigiert und intern validiert; externes Re-Review und Freigabe vor Commit ausstehend<br>
**Hauptplan:** [FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md](FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md)

## Ziel

Die bestaetigten Exportfindings F1 bis F4, F8, C1 und R5 werden durch zwei
explizit versionierte V2-Artefakte beseitigt: `MonteCarloExportV2` fuer den
Laufexport und `ScenarioLogExportV2` fuer den getrennten Szenariolog. Dazu
gehoeren auch der reale MC-Drawdown und die Aufloesung der Doppelbelegung
`minimumFlexEffectiveFinal`. V1 bleibt als historischer Contract erkennbar und
lesbar; seine Semantik wird nicht still veraendert. C-P-29 wird durch einen
maschinenlesbaren Messcontract fuer die vorhandene 4,5-Prozent-Auswertung
geschlossen, ohne ihre Berechnung in diesem Slice zu aendern.

Der Schnitt erfolgt an der V2-Projektionsgrenze. Bestehende interne V1-Felder
werden nicht projektweit umbenannt. Der V2-Adapter ueberfuehrt sie in eindeutige
Ausgabefelder. Dadurch bleiben Backtest-, Tabellen- und Direkt-Runner-Vertraege
ausserhalb dieses Slices unveraendert und der Slice bleibt unter der
Zehn-Dateien-Grenze.

## Akzeptanzkriterien

- Heatmap-Bins besitzen inklusive Unter- und exklusive Obergrenze sowie Count;
  Bin-Liste und jede zugehoerige Zaehlliste besitzen identische Laenge.
- Der V2-`unitContract` beschreibt die Heatmap und den abgeleiteten
  4,5-Prozent-KPI mit dem exakten Basisfeld
  `basisField: "realizedWithdrawalRatePct"`, der Schwelle
  `thresholdPct: 4.5` und
  `thresholdRole: "reporting_reference_not_guardrail_trigger"`.
- Fuer `timeShareQuoteAbove45` gilt
  `comparison: "strictly_greater_than"`, passend zur bestehenden Zaehlung
  `entnahmequote * 100 > 4.5`. Fuer die Heatmap-Ueberlagerung gilt wegen der
  Summierung des bei 4,5 Prozent beginnenden Bins
  `comparison: "greater_than_or_equal_at_bin_resolution"`. Die beiden
  Operatoren duerfen im Contract nicht vereinheitlicht oder als fachliche
  Alarm-/Guardrail-Ausloesung bezeichnet werden.
- Ratio- und Prozentpunktfelder sind am Namen und Unit-Contract unterscheidbar.
- Policy- und realisierte Entnahmequote nennen Nenner und Messzeitpunkt.
- Nicht anwendbare oder unbeobachtete KPIs sind `null` plus Grund und Count.
- Jedes `observationCount` ist ein JSON-serialisierbares Objekt, dessen
  Blattwerte endliche, nichtnegative Ganzzahlen sind; eine `Map` darf nicht als
  leeres Objekt `{}` verloren gehen.
- Nominaler und realer Maximum-Drawdown werden im selben Lauf, ueber denselben
  Pfad und dieselben Zeitgrenzen aggregiert. Fehlt eine notwendige
  Inflationsbeobachtung, ist der reale Wert `null` plus Missingness-Grund und
  Beobachtungszahl, niemals 0.
- Beide Drawdownwerte sind positive Verlustbetraege in Prozentpunkten mit der
  Domaene `[0, 100]`, keine vorzeichenbehafteten Renditen. Ein negativer oder
  groesserer endlicher Wert verletzt den V2-Contract und scheitert fail-closed;
  der Projektor darf ihn nicht per `Math.abs` oder Clamp reparieren.
- Der geplante Policy-Wert und die kanonische Erfuellungsmessung des
  Mindest-Flex tragen unterschiedliche V2-Namen; `minimumFlexEffectiveFinal`
  bleibt nicht doppelt belegt.
- Terminalrecords sind explizit typisiert und nicht finanziell auswertbar.
- `MonteCarloRunResultV2`/`MonteCarloExportV2` validieren fail-closed.
- Ein Versionsdispatcher liest V1 und V2, weist unbekannte Versionen
  fail-closed ab und liefert fuer V1 zwingend eine sichtbare
  `compatibilityWarnings`-Meldung zur alten Bin-/Einheitensemantik.
- Main Thread und Worker erzeugen denselben V2-Contract.
- Golden-Tests pruefen je Heatmap-Intervall mindestens einen Grenzwert sowie
  Werte und Einheiten je eines Ratio-/Prozentpunktfelds; ein reines
  Feldnamen-/Schemaversion-Orakel reicht nicht.
- Der Szenario-JSON-Export ist ein `ScenarioLogExportV2`-Objekt mit
  `schemaVersion: "ScenarioLogExportV2"`,
  `unitContract.schemaVersion: "ScenarioLogUnitContractV2"` und `records`; neue nackte Arrays sind
  unzulaessig. Alte nackte V1-Arrays werden erkannt und nur zusammen mit
  verpflichtenden Kompatibilitaetswarnungen zu F2/F3/F8/R5 gelesen;
  unbekannte Objektversionen scheitern fail-closed.
- Der V1-Dispatcher liefert mindestens die stabilen Warncodes
  `scenario_log_v1_unversioned`, `legacy_ratio_field_names`,
  `legacy_withdrawal_rate_ambiguity`, `legacy_terminal_rows_untyped` und
  `legacy_minimum_flex_name_collision`; die Warnungen sind Daten und nicht nur
  Konsolentext.
- `projectScenarioLogV2(rows)` liegt im bestehenden Vertragsmodul
  `monte-carlo-export.js`; `simulator-results.js` ruft ihn fuer
  `scenario-log-v2.json` und `scenario-log-v2.csv` auf. Es gibt keinen zweiten
  CSV-spezifischen Semantikadapter.
- JSON und CSV werden ausschliesslich aus derselben Funktion
  `projectScenarioLogV2(rows)` erzeugt. Jeder Record besitzt `recordType`
  (`financial_year`, `terminal_ruin`, `terminal_death`) und
  `financiallyEvaluable`; nur `financial_year` traegt `true`.
- Die drei Builder in `mc-log-builder.js` setzen `recordType` bereits auf jeder
  internen Rohzeile. Der Projektor validiert diesen Wert fail-closed und darf
  ihn nicht aus lokalisiertem `aktionUndGrund`-Text erraten.
- Die Szenarioprojektion verwendet `...Ratio` fuer Renditequotienten,
  `realizedWithdrawalRatePct` und `preDecisionWithdrawalRatePct` fuer die fachlich
  getrennten Entnahmequoten sowie
  `minimumFlexPolicyEffectiveAnnualEur` und
  `minimumFlexFulfilledAnnualEur` fuer die zwei Mindest-Flex-Messungen. Der
  `unitContract` fixiert Einheit, Nenner und Messzeitpunkt.
- Konkret bleiben `RealReturnEquityPct`, `RealReturnGoldPct`,
  `NominalReturnEquityPct` und `NominalReturnGoldPct` intern unveraendert, werden
  im V2-Record aber ohne Faktorwechsel als `realReturnEquityRatio`,
  `realReturnGoldRatio`, `nominalReturnEquityRatio` und
  `nominalReturnGoldRatio` ausgegeben. `entnahmequote` wird dagegen fuer
  `realizedWithdrawalRatePct` mit 100 multipliziert; `QuoteEndPct` liefert den
  bereits in Prozentpunkten vorliegenden `preDecisionWithdrawalRatePct`.
- Der Unit-Contract beschreibt `preDecisionWithdrawalRatePct` woertlich als
  „vorlaeufige Entnahme auf Basis der Vorjahres-Flexrate, vor Transaktions- und
  Auszahlungsphase; Nenner Depot ohne Liquiditaet und Health-Bucket“. Das Feld
  darf weder als diesjaehrige Policyquote bezeichnet noch entsprechend
  interpretiert werden.
- Bei `financiallyEvaluable: false` sind Renditen, Quoten und Mindest-Flex-
  Messungen `null` plus stabiler Nichtanwendbarkeitsgrund, nicht scheinbar
  gemessene 0.
- Der CSV-Header ist die deterministisch sortierte Vereinigungsmenge aller
  Schluessel aller projizierten Records, nicht nur `Object.keys(records[0])`.
  Jede CSV-Zeile traegt `scenarioLogSchemaVersion` und
  `unitContractVersion`; terminal-only Felder bleiben sichtbar. Objektzellen
  werden kanonisch als JSON serialisiert; Semikolon, Anfuehrungszeichen sowie
  CR/LF werden CSV-konform gequotet und verdoppelt.
- `projectScenarioLogV2(rows)` arbeitet bewusst auf dem bereits vollstaendig
  materialisierten ausgewaehlten Szenariopfad, den `simulator-results.js` schon
  fuer Anzeige und Export haelt. `rows` enthaelt nicht die Records aller
  Monte-Carlo-Runs und ist durch die zuvor validierte Laufzeit des Requests
  begrenzt. Streaming und konstante Speichernutzung sind kein Contract dieses
  persoenlichen Einzelpfadexports.
- Die Vereinigungsmenge darf deshalb zwei Passes oder eine gleichwertige
  vollstaendige Sicht auf diese begrenzte Recordliste verwenden. Eine
  zusaetzliche Kopie aller grossen Zellwerte ist zu vermeiden; der obere
  gueltige Laufzeit-Grenzfall muss ohne semantischen Zeilen- oder Feldverlust
  exportierbar bleiben.

## Scope

- Exportprojektion und -validierung.
- V2-Messmetadaten fuer Heatmap und vorhandenen 4,5-Prozent-KPI.
- Aggregat-/Missingness-Projektion, soweit fuer V2 erforderlich.
- V2-Benennung der bereits vorhandenen Jahresrenditen, Entnahmequoten und
  Mindest-Flex-Messungen ohne projektweite interne Umbenennung.
- eigener realer Drawdown-Run-Buffer, fail-closed Chunk-Registrierung,
  Aggregation und V2-Projektion inklusive Worker-Paritaet.
- Terminalrecord-Klassifikation.
- `ScenarioLogExportV2`-Projektion, -JSON, -CSV und V1-Dispatcher.
- dokumentierter materialisierter Einzelpfad- und Speichercontract; kein
  Streamingversprechen.
- Golden-Schema, Kompatibilitaet, Paritaet und Referenzdokumentation.

## Nicht-Scope

- keine Aenderung von Sampling, Renditen, Entnahmepolicies oder Steuern;
- keine neue KPI ausser dem bereits als C1 geforderten realen Drawdown;
- keine UI-Neugestaltung; sichtbare Risikodarstellung folgt in Slice 2;
- keine Entfernung historischer V1-Fixtures;
- keine projektweite Umbenennung interner Felder in
  `simulator-main-helpers.js`, `historical-backtest-runner.js`,
  `mc-stress-tracker.js` oder
  `simulator-engine-direct.js`;
- kein Release-Build.

## Voraussichtlich geplante Programmdateien

- `app/simulator/monte-carlo-export.js`
- `app/simulator/monte-carlo-contracts.js`
- `app/simulator/monte-carlo-runner-utils.js`
- `app/simulator/monte-carlo-runner.js`
- `app/simulator/monte-carlo-chunk-result.js`
- `app/simulator/monte-carlo-aggregates.js`
- `app/simulator/simulator-year-result.js`
- `app/simulator/auto-optimize-worker.js`
- `app/simulator/mc-log-builder.js`
- `app/simulator/simulator-results.js`

Das sind maximal zehn produktive Programmdateien. Testdateien, Test-Fixtures
und reine Dokumentation zaehlen gemaess `AGENTS.md` nicht zur
Zehn-Dateien-Grenze. Zeigt der Branchcheck, dass dieser Zuschnitt nicht genuegt
oder eine der ausdruecklich ausgeschlossenen Konsumentendateien
geaendert werden muesste, wird vor Coding gestoppt und der Nutzer entscheidet
ueber eine Teilung; es gibt keine stillschweigende Limitausnahme.

## Diff-Risiko vor Coding

**Implementierungsbaseline:** lokaler Feature-Branch
`codex/fokussierte-abschlusshaertung`, ausgehend von `HEAD 27b9264`. Claude hat
Entwurf v8 freigegeben; der Nutzer hat den Start von Slice 1 am 2026-08-07
ausdruecklich autorisiert. Das zuvor noch offene Gemini-Re-Review wird nicht als
erfolgt dargestellt.

```text
git branch --show-current:
codex/fokussierte-abschlusshaertung

git status --short:
 M .claude/settings.local.json
 M README.md
 M docs/README.md
 M docs/internal/README.md
 M docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
 M docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md
 M docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md
 M tests/project-license-metadata.test.mjs
?? docs/internal/BEWERTUNG_RUHESTANDSSUITE_2026-08-06 Claude.md
?? docs/internal/BEWERTUNG_RUHESTANDSSUITE_2026-08-06 Codex.md
?? docs/internal/BEWERTUNG_RUHESTANDSSUITE_2026-08-06 Gemini.md
?? docs/internal/BEWERTUNG_RUHESTANDSSUITE_2026-08-06_KONSOLIDIERT.md
?? docs/internal/FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md
?? docs/internal/MC_LAUF_ANALYSE_2026-08-04_DATENPRUEFUNG_ROBUSTHEIT.md
?? docs/internal/SLICE_ABSCHLUSSHAERTUNG_01_MC_EXPORTVERTRAG_V2.md
?? docs/internal/SLICE_ABSCHLUSSHAERTUNG_02_RISIKOANZEIGEN.md
?? docs/internal/SLICE_ABSCHLUSSHAERTUNG_03_SAFETY_POLICY_PRIORITAET.md
?? docs/internal/SLICE_ABSCHLUSSHAERTUNG_04_RECONCILE_CASHSTATUS.md
?? docs/reference/MARKTVERGLEICH.md
?? docs/reference/WISSENSCHAFTLICHER_RAHMEN.md

Geplante Dateien:
- app/simulator/monte-carlo-export.js
- app/simulator/monte-carlo-contracts.js
- app/simulator/monte-carlo-runner-utils.js
- app/simulator/monte-carlo-runner.js
- app/simulator/monte-carlo-chunk-result.js
- app/simulator/monte-carlo-aggregates.js
- app/simulator/simulator-year-result.js
- app/simulator/auto-optimize-worker.js
- app/simulator/mc-log-builder.js
- app/simulator/simulator-results.js

Voraussichtliche Änderungstiefe:
- riskant: einmalig eingefrorener V2-Exportvertrag, neuer Real-Drawdown-
  Buffer und Worker-Paritaet

Gefährdete bestehende Tests:
- monte-carlo-export-contract
- monte-carlo-measurement-contract
- monte-carlo-chunk-result
- monte-carlo-runner-utils / Buffer-Registrierung
- worker parity
- auto-optimize heatmap contract
- scenario-log JSON-/CSV-export, V1-Dispatcher und terminale Records

Nicht anfassen:
- Sampling- und Policy-Semantik
- engine/
- dist/
- engine.js
- RuheStandSuite.exe
- alle oben gelisteten Fremdaenderungen ausser den beiden Slice-Arbeitsdokumenten
  und der erst nach der Implementierung gezielt zu synchronisierenden
  Architekturreferenz; ueberlappende Dokumentationshunks werden vor Abgabe
  einzeln geprueft

Rollback-Strategie:
- nach Commit Revert des exakten Slice-1-Commits; vor Commit nur dokumentierte
  Hunk-Ruecknahme nach Scopepruefung, keine pauschale Dateiwiederherstellung
- spaetere Slices duerfen die hier abgenommenen Hunks in gemeinsam genutzten
  Dateien nicht dateiweise zuruecksetzen
- dies gilt ausdruecklich fuer `simulator-year-result.js` in Slice 3 und
  `simulator-results.js` in Slice 2
- der Slice besitzt mit zehn produktiven Dateien keine Reserve; jede elfte
  produktive Abhaengigkeit stoppt vor Coding beziehungsweise vor ihrem Edit
```

## Geplante Tests

- `node tests/run-single.mjs tests/monte-carlo-export-contract.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-measurement-contract.test.mjs`
- `node tests/run-single.mjs tests/monte-carlo-chunk-result.test.mjs`
- `node tests/run-single.mjs tests/simulator-real-withdrawal-contract.test.mjs`
- Golden-Test fuer alle Heatmap-Grenzen, identische Bin-/Count-Laengen,
  numerische Ratio-/Pct-Semantik und serialisierbares `observationCount`
- 4,5-Prozent-Messcontract: `basisField`, Schwelle, Operator und reine
  Berichtsrolle ueberstehen den V2-JSON-Roundtrip; exakt 4,5 Prozent wird vom
  strikt-`>`-KPI ausgeschlossen, liegt aber im ab 4,5 Prozent beginnenden
  Heatmap-Bin
- V1-/V2-Dispatcher: V1 lesbar mit Warnung, V2 lesbar, unbekannt fail-closed
- Real-Drawdown: identischer Pfad/Zeitraum, unvollstaendige Inflation ergibt
  `null` plus Grund, Main-/Worker-Paritaet und unregistrierter Buffer scheitert
  fail-closed
- Drawdown-Domaene: nominale und reale Werte `0`, `34.25` und `100` bestehen;
  `-0.01`, `-34.25`, `100.01` und nicht endliche Werte scheitern vor dem Export
  fail-closed statt durch Betrag oder Clamp veraendert zu werden
- Mindest-Flex-Namen: geplanter Policywert und kanonische Erfuellung bleiben
  im Golden-Export unterscheidbar
- Terminalrecord-Typ und `financiallyEvaluable: false`
- Scenario-Log-V2-Golden: Envelope und Unit-Contract; alle Records typisiert;
  Rendite-/Quoten-/Mindest-Flex-Semantik numerisch geprueft
- Quoten-Golden: `preDecisionWithdrawalRatePct` entspricht `QuoteEndPct` ohne
  erneute Skalierung und traegt die woertliche Vorjahres-/Phasen-/Nenner-
  Definition im Unit-Contract
- Szenario-V1/V2-Dispatcher: nacktes V1-Array nur mit Warnungen lesbar, V2
  lesbar, unbekannte Objektversion fail-closed
- JSON-/CSV-Paritaet: CSV aus V2-Projektion, stabiler Vereinigungsheader umfasst
  terminal-only Felder und jede Zeile nennt beide Contractversionen; Sonder-
  zeichen und verschachtelte Objektzellen ueberstehen Parse-Roundtrip
- Laufzeit-Grenztest: Ein synthetischer ausgewaehlter Szenariopfad an der oberen
  gueltigen `maxDauer`-Grenze bleibt als JSON und CSV vollstaendig exportierbar.
  Der Test misst korrekte Record-/Feldanzahl und behauptet weder Streaming noch
  eine von der Laufzeit unabhaengige Speicherobergrenze
- relevante Worker-Paritaetstests
- `npm test`
- `npm run test:browser`
- `git diff --check`

## Durchgefuehrte Änderungen

- Der aktuelle Monte-Carlo-Download schreibt `MonteCarloExportV2`; V1 bleibt
  ueber einen expliziten Dispatcher mit maschinenlesbarer
  Kompatibilitaetswarnung lesbar. Unbekannte Versionen scheitern fail-closed.
- `MonteCarloRunResultV2` projiziert den historischen internen Ergebnisvertrag
  in eindeutige Ratio-/Prozentpunktnamen, elf validierte Heatmap-Intervalle,
  nichtleere JSON-`observationCount`-Objekte und einen strikten
  4,5-Prozent-Messcontract. Manipulierte Intervall-, Einheiten- oder
  Drawdownmetadaten werden beim Lesen abgewiesen.
- Fuer jeden finanziell auswertbaren Pfad werden nominaler und realer
  Maximum-Drawdown aus denselben erfolgreichen Portfoliopunkten berechnet. Der
  reale Pfad verwendet den kumulierten Inflationsfaktor; fehlende Inflation
  ergibt `null` mit `missing_inflation` und Beobachtungszahl, ohne den nominalen
  Wert zu verwerfen.
- Die drei neuen Real-Drawdown-Buffer sind im Chunkvertrag registriert, werden
  bei Merge und Workertransport mitgefuehrt und gegen Domaene, Missingness und
  Beobachtungszahl validiert.
- Monte-Carlo-Logbuilder typisieren Jahres-, Ruin- und Todesrecords direkt als
  `financial_year`, `terminal_ruin` beziehungsweise `terminal_death` und setzen
  die finanzielle Auswertbarkeit explizit.
- Der Szenarioexport schreibt `ScenarioLogExportV2` und
  `ScenarioLogUnitContractV2`. JSON und CSV stammen aus derselben Projektion;
  Renditequotienten, realisierte und vorlaeufige Entnahmequote sowie
  konfigurierter, policywirksamer und erfuellter Mindest-Flex sind fachlich
  getrennt. Terminalmessungen sind `null` mit Grund und Count.
- Der CSV-Export verwendet einen sortierten Vereinigungsheader, kanonische
  JSON-Objektzellen, CSV-konforme Quotierung und CRLF. Die Dateinamen lauten
  `scenario-log-v2.json` und `scenario-log-v2.csv`.
- Nach Claudes Code-Review wird die V2-Projektion erst im jeweiligen
  Export-Click-Handler ausgefuehrt. Ein Szenariowechsel invalidiert den alten
  Exportzustand vor dem Rendern. Projektionsfehler zeigen einen sichtbaren
  Hinweis und koennen niemals den zuvor gewaehlten Pfad herunterladen.
- Akkumulationsjahre bleiben als `financial_year` typisiert, weisen Entnahme-
  und Mindest-Flex-Messungen aber gruppenspezifisch als
  `not_applicable_accumulation_year` mit `null` und Count 0 aus. Tatsaechlich
  beobachtete Marktreturns dieser Jahre bleiben auswertbar.
- `minimumFlexPolicyEffectiveAnnualEur` stammt aus dem nach allen
  Policyschritten geplanten Wert
  `entscheidung.details.minimumFlexEffectiveFinal`; die kanonische Erfuellung
  stammt weiterhin aus dem Top-Level-Feld. Der kollidierende verschachtelte
  Legacy-Name wird aus V2 entfernt, ohne andere Entscheidungsdiagnosen zu
  verlieren.
- `MONTE_CARLO_EXPORT_V2_VERSION` benennt V2 explizit. Der historische,
  unqualifizierte Bezeichner `MONTE_CARLO_EXPORT_VERSION` bleibt deprecated mit
  seiner frueheren V1-Bedeutung erhalten und wird nicht still umgedeutet.
- Referenzarchitektur, Simulator-Moduluebersicht, Haupt-README und
  Testdokumentation wurden auf den lokalen Implementierungsstand synchronisiert.

## Ausgefuehrte Tests mit Ergebnis

- `node tests/run-single.mjs tests/monte-carlo-export-contract.test.mjs`:
  **264/264 Assertions bestanden**.
- `node tests/run-single.mjs tests/monte-carlo-chunk-result.test.mjs`:
  **40/40 Assertions bestanden**.
- `node tests/run-single.mjs tests/monte-carlo-measurement-contract.test.mjs`:
  **792/792 Assertions bestanden**.
- `node tests/run-single.mjs tests/simulator-real-withdrawal-contract.test.mjs`:
  **78/78 Assertions bestanden**.
- `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`:
  **166/166 Assertions bestanden**.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`:
  **584/584 Assertions bestanden**.
- `node tests/run-single.mjs tests/auto-optimize-worker-contract.test.mjs`:
  **15/15 Assertions bestanden**.
- `npm test`: **167 Testdateien bestanden, Exit-Code 0**. Der Lauf wurde nach
  der letzten produktiven Validatoraenderung vollstaendig wiederholt.
- `npm run test:browser`: **alle Browser-Smokes bestanden**, einschliesslich
  Simulator-Monte-Carlo-E2E, V2-Downloadvalidierung und Regression
  „Szenario A -> nicht projizierbares Szenario B -> kein Download von A“.
- `git diff --check`: **bestanden**.
- `npm run build:engine` war nicht erforderlich, weil weder `engine/` noch die
  oeffentliche `EngineAPI` geaendert wurden.

## Abweichungen vom Plan

- Statt der maximal vorgesehenen zehn wurden **acht produktive Dateien**
  geaendert. Die Zehn-Dateien-Stopregel wurde eingehalten.
- `simulator-year-result.js` blieb unveraendert. Die bereits vorhandenen Quellen
  `minimumFlexEffectiveAfter` und `minimumFlexEffectiveFinal` werden erst an der
  V2-Projektionsgrenze eindeutig benannt. Das vermeidet eine unnoetige
  Aenderung der eingefrorenen V1-Messprojektion.
- `auto-optimize-worker.js` blieb unveraendert. Sein generischer
  Buffer-/Chunk-/Aggregationspfad transportiert die registrierten neuen Felder
  ohne Sondercode; Worker- und Auto-Optimize-Paritaetstests belegen dies.
- Zusaetzlich zur urspruenglichen Testliste wurde
  `tests/simulator-monte-carlo-browser.mjs` auf den aktuellen V2-Writer
  umgestellt. Das war eine Korrektur des Browserorakels, keine Erweiterung des
  Produktumfangs.

## Offene Risiken

- Ein V2-Autor koennte V1 intern weiterverwenden und nur das Top-Level-Label
  aendern. Golden-Orakel muessen deshalb Feldsemantik, nicht nur Versionstexte,
  pruefen.
- Typed Arrays verwenden technisch Nullwerte fuer fehlende Beobachtungen; beim
  Export muss die separate Missingness-Maske zwingend Vorrang haben.
- Der interne V1-Namensbestand bleibt bewusst bestehen. Der V2-Golden-Test muss
  deshalb nachweisen, dass der Adapter nicht nur Namen, sondern auch die
  jeweils richtige Quelle und Einheit projiziert.
- Interne Runner und Tabellen koennen weiterhin Legacy-Namen fuehren. Die
  Architektur-Rueckdokumentation muss deshalb klarstellen, dass allein die
  beiden V2-Projektionsadapter Export-Source-of-Truth sind.
- Der strikt-`>`-KPI und die bin-basierte `>=`-Heatmap besitzen bewusst
  unterschiedliche Operatoren. Ein spaeteres Refactoring darf sie nicht unter
  einem gemeinsamen unpraezisen „ueber 4,5 Prozent“-Label zusammenziehen.
- Die Vereinigungsheaderbildung benoetigt eine vollstaendige Sicht auf den
  ausgewaehlten Szenariopfad. Das ist fuer den bereits materialisierten und
  validiert laufzeitbegrenzten Einzelpfad akzeptiert, waere aber bei einem
  kuenftigen Export aller MC-Runs neu zu bewerten.

## Rueckdokumentation

Nach Abschluss: Hauptplan, `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`,
relevante Simulator-Dokumentation und `tests/README.md` aktualisieren.

## Freigabestatus

Die Implementierung und die vorgesehenen technischen Gates sind abgeschlossen.
Claude hat im ersten Implementierungsreview C-01 als Blocker sowie C-02 bis
C-04 als Restrisiken dokumentiert. Alle vier Punkte sind umgesetzt und durch
gezielte sowie vollstaendige Gates abgesichert; Claudes Reviewtext bleibt als
historischer Befund unveraendert erhalten. Codex markiert die eigene Korrektur
nicht als freigegeben. Vor Commit sind externes Re-Review und ausdrueckliche
Freigabe durch Gemini, Claude oder den Nutzer erforderlich. Es wurde weder
committed noch gepusht.

## Review-Feedback von Gemini

Gemini beanstandet in G-P-05, dass der Vereinigungsheader eine vollstaendige
Sicht auf alle exportierten Records benoetigt und deshalb kein Streaming ab dem
ersten Record erlaubt. Der Tatsachenkern ist richtig; die Einstufung als hohes
Speicherproblem trifft den aktuellen Ablauf jedoch nicht: Exportiert wird der
bereits materialisierte, durch `maxDauer` begrenzte ausgewaehlte Einzelpfad und
nicht die Gesamtheit aller MC-Runs. Entwurf v6 macht diese Annahme samt
Laufzeit-Grenztest verbindlich. Eine allgemeine Streamingarchitektur wird nicht
in den Slice gezogen.

**Historienhinweis:** Die nachfolgenden Claude-Freigaben beziehen sich auf den
Stand bis Entwurf v5 und sind keine Freigabe der Gemini-Praezisierung in v6.

## Code-Review von Claude (Implementierung)

**Reviewstand:** 2026-08-06, Branch `codex/fokussierte-abschlusshaertung`,
HEAD `27b9264`, Arbeitsbaum uncommitted. Geprüft wurde der vollständige Diff
der acht produktiven Dateien gegen die Akzeptanzkriterien.

### 1. Prüfdimensionen

**Korrektheit vs. Akzeptanzkriterien.** Die Kernkorrekturen sind sauber
umgesetzt und im Code nachvollzogen (siehe Tabelle unten). Zwei AK sind
verletzt: C-02 (beobachtete Nullen in Akkumulationsjahren) und C-03
(`minimumFlexEffectiveFinal` bleibt doppelt belegt).

**Vertragstreue.** Der Heatmap-Intervallvertrag validiert die Grenzen gegen
`MC_HEATMAP_BINS` und erzwingt gleiche Längen von Bin- und Zählliste. Der
V1-Pfad bleibt über `MONTE_CARLO_EXPORT_V1_VERSION` und
`buildMonteCarloExportV1` erhalten; `readMonteCarloExport` dispatcht und liefert
für V1 die geforderte Kompatibilitätswarnung. Ein Bezeichner hat allerdings
still die Bedeutung gewechselt: C-04.

**Fehlerbehandlung.** Hier liegt der schwerwiegendste Befund: Die fail-closed
Projektion wurde in den Render-Pfad verlegt und kann bei einem Wurf einen
Export des *falschen* Szenarios auslösen. Siehe C-01.

**Seiteneffekte.** Acht statt zehn Dateien, Stopregel eingehalten. Der Verzicht
auf `simulator-year-result.js` und `auto-optimize-worker.js` ist in den
Abweichungen begründet und durch die grüne Paritätsmatrix gedeckt.

**Was könnte brechen?** Ein Szenariopfad mit einem einzigen `NaN` in einem
beliebigen Diagnosefeld — siehe C-01.

### 2. Verifizierte Umsetzungen

| Anforderung | Codebeleg | Ergebnis |
| --- | --- | --- |
| Heatmap-Intervalle inklusiv/exklusiv, gleiche Längen | `buildHeatmapIntervalsV2`: `lowerBoundPct`/`upperBoundPct`/`lowerInclusive`/`upperExclusive`, Grenzen gegen `MC_HEATMAP_BINS` validiert, `row.length !== intervalCount` wirft | erfüllt |
| Quotenbasis der Heatmap ausgewiesen (C-P-29) | `basisField: 'realizedWithdrawalRatePct'` | erfüllt |
| `entnahmequote` × 100, `QuoteEndPct` durchgereicht, Renditen als Ratio | `projectScenarioRecordV2` | erfüllt, Einheiten stimmen |
| `preDecisionWithdrawalRatePct` mit wörtlicher Messphase (C-P-25) | `createScenarioLogUnitContractV2`, Validierung per Stringgleichheit | erfüllt |
| Terminalrecords typisiert, keine Textheuristik | `mc-log-builder.js` setzt `recordType` in allen drei Buildern; `projectScenarioRecordV2` wirft bei unbekanntem Typ | erfüllt |
| Missingness-Maske hat Vorrang vor Typed-Array-Null | `buildRealDrawdownDistribution`: nur `OBSERVED` liefert Werte, `0`-Platzhalter fließt nie in die Verteilung | erfüllt; das im Slice benannte Risiko ist geschlossen |
| Realer Drawdown gleicher Pfad/Zeitraum | beide Serien werden in derselben Schleifeniteration fortgeschrieben; unvollständige Inflation schließt den ganzen Lauf aus statt Teilpfade zu mischen | erfüllt |
| CSV-Header als Vereinigungsmenge, CSV-Quoting | `serializeScenarioLogCsvV2`, `csvCellV2` mit `/[;"\r\n]/` und Anführungszeichenverdopplung | erfüllt |
| Gates | `npm test`: 19.127/19.127 Assertions, 0 Fehler, 0 offene Handles; `git diff --check` sauber | erfüllt |

### 3. Findings

#### C-01 (hoch) – Fail-closed Projektion im Render-Pfad kann den Export des falschen Szenarios auslösen

`simulator-results.js` ruft `projectScenarioLogV2(scenario.logDataRows)`
synchron innerhalb von `renderSelectedScenario`, ohne `try`/`catch`:

```js
output.innerHTML = renderWorstRunLog(...);      // bereits ausgeführt
exportButtons.style.display = 'flex';           // bereits ausgeführt
window.globalCurrentScenarioData = {            // wird bei Wurf NICHT erreicht
    rows: scenario.logDataRows,
    exportDocument: projectScenarioLogV2(scenario.logDataRows)
};
```

Wirft die Projektion, bleibt `window.globalCurrentScenarioData` auf dem
**vorher gewählten** Szenario stehen, während Log und Exportknöpfe bereits das
neue Szenario zeigen. Ein Klick auf „Export JSON" lädt dann die Daten des alten
Szenarios unter dem Namen `scenario-log-v2.json` herunter, mit der Bestätigung
„Export gespeichert". Der Nutzer hat keinen Hinweis darauf, dass er den falschen
Pfad in der Hand hält.

Das Wurfrisiko ist nicht theoretisch: `normalizeMonteCarloJsonValue` wirft
`MC_EXPORT_NON_FINITE_NUMBER` bei **jedem** `NaN` oder `Infinity` an beliebiger
Stelle der Rohzeile (`monte-carlo-contracts.js:73-77`). Die Rohzeilen enthalten
Dutzende berechneter Diagnosefelder einschließlich `entscheidung.details` und
`vpw`. Vor dieser Änderung erzeugte `JSON.stringify` daraus stillschweigend
`null`; jetzt scheitert die gesamte Szenarioauswahl.

Erforderlich (eines von beiden):
1. Projektion lazy im Click-Handler erzeugen — dann trifft ein Fehler nur den
   Exportversuch und ist dem Nutzer zuordenbar;
2. oder `window.globalCurrentScenarioData = null` **vor** dem Rendern setzen,
   die Projektion in `try`/`catch` fassen, im Fehlerfall die Exportknöpfe
   ausblenden und den Grund anzeigen.

In beiden Fällen gehört ein Regressionstest dazu: Szenario A wählen, Szenario B
mit einer nicht projizierbaren Zeile wählen, prüfen, dass kein Export von A
möglich ist.

#### C-02 (mittel) – Akkumulationsjahre liefern zwei fabrizierte „beobachtete" Nullen

Alle Nicht-Ruin-Jahre laufen über `buildMonteCarloYearLogRow`
(`monte-carlo-runner.js:863`) und erhalten damit `recordType: 'financial_year'`
und `financiallyEvaluable: true` — auch Akkumulationsjahre. Deren Zeilen setzen
`QuoteEndPct: 0` und `entnahmequote: 0` als Platzhalter
(`simulator-accumulation-year.js:187, :194`), weil in dieser Phase gar keine
Entnahmepolicy läuft.

Die V2-Projektion macht daraus `realizedWithdrawalRatePct: 0` und
`preDecisionWithdrawalRatePct: 0` mit `reason: null` und
`observationCount: { observations: 2 }` — also zwei **gemessene** Nullen für
eine Phase ohne Messung. Das verletzt das AK „Keine deaktivierte oder
unbeobachtete KPI erscheint als beobachtete Null" und ist dieselbe Fehlerklasse
wie F4, die dieser Slice beseitigen soll.

Die Zeile führt bereits `Regime: 'accumulation'`. Ein eigener `recordType`
(etwa `accumulation_year`) oder eine gruppenweise Nichtanwendbarkeit für
`withdrawalRates` wäre ein kleiner Eingriff im bestehenden Projektor.

#### C-03 (mittel) – Die R5-Kollision ist nur zur Hälfte aufgelöst

Der beanstandete Zwilling ist `entscheidung.details.minimumFlexEffectiveFinal`
(geplanter Wert) gegen das gleichnamige Top-Level-Feld (kanonische Erfüllung).
Belegt: `SpendingPlanner.mjs:340` setzt `details: { ...state.keyParams, … }`,
und `simulator-year-result.js:209-211` berechnet den Top-Level-Wert neu als
`Math.min(minimumFlexAnnual, fulfilledHouseholdFlex)`.

`projectScenarioRecordV2` löscht ausschließlich **Top-Level**-Felder. Das Objekt
`entscheidung` wird über `...base` unverändert übernommen, sodass
`entscheidung.details.minimumFlexEffectiveFinal` im V2-Export unter genau dem
beanstandeten Namen erhalten bleibt. Nach dem Wegfall des Top-Level-Zwillings
wirkt der verbliebene verschachtelte Wert für einen Konsumenten sogar
kanonisch — das Fehlerbild wird dadurch nicht kleiner, sondern schwerer
erkennbar.

Zusätzlich wird `minimumFlexPolicyEffectiveAnnualEur` aus
`minimumFlexEffectiveAfter` gespeist, also aus dem Wert **nach dem
Mindest-Flex-Schritt**, nicht aus dem geplanten Wert nach allen Policyschritten.
Das AK verlangt aber genau die Trennung des kollidierenden Paares.

Erforderlich: entweder `entscheidung.details.minimumFlexEffectiveFinal` in der
Projektion umbenennen beziehungsweise entfernen, oder — falls der Rohblock
bewusst erhalten bleiben soll — die Quelle von
`minimumFlexPolicyEffectiveAnnualEur` auf eben diesen Wert umstellen und den
verschachtelten Namen im `unitContract` ausdrücklich als Legacy kennzeichnen.

#### C-04 (niedrig) – `MONTE_CARLO_EXPORT_VERSION` hat still die Bedeutung gewechselt

Die exportierte Konstante zeigt jetzt auf `'MonteCarloExportV2'`; V1 erhielt den
neuen Namen `MONTE_CARLO_EXPORT_V1_VERSION`. Innerhalb des Repositorys ist das
konsistent nachgezogen und die Suite ist grün. Es ist aber genau die stille
Umdeutung eines stabilen Bezeichners, die Abschnitt 14 des Plans andernorts
untersagt: Ein Konsument, der `MONTE_CARLO_EXPORT_VERSION` importierte, um
V1-Dokumente zu prüfen, vergleicht ohne Codeänderung ab sofort gegen V2.
Empfehlung: `MONTE_CARLO_EXPORT_V2_VERSION` als sprechenden Namen einführen und
den unqualifizierten Bezeichner entweder entfernen oder mit einem
Deprecation-Kommentar versehen.

### 4. Pre-Mortem

In drei Monaten exportiert der Nutzer nach einem langen Lauf ein Szenario, das
er gerade in der Oberfläche liest, und wertet eine Datei aus, die zu einem
anderen Pfad gehört — weil eine einzige nicht endliche Zahl in einem
Diagnosefeld die Projektion des zweiten Szenarios hat scheitern lassen und der
Exportzustand des ersten stehen blieb (C-01). Zweitwahrscheinlichste Ursache:
Eine Auswertung liest `entscheidung.details.minimumFlexEffectiveFinal` als
kanonische Erfüllungsmessung, weil der frühere Top-Level-Zwilling verschwunden
ist (C-03).

### 5. Review-Ergebnis

- **Status:** blockiert
- **Blocker:** C-01
- **Restrisiken:** C-02, C-03, C-04
- **Einordnung:** Die Vertragsarbeit ist substanziell und an den geprüften
  Stellen korrekt — Heatmap-Intervalle, Einheitenabbildung, Missingness-Vorrang
  vor der Typed-Array-Null und die Terminalrecord-Typisierung halten der
  Nachprüfung stand, und die volle Suite ist grün. Der Blocker liegt nicht im
  Vertrag, sondern in seiner Anbindung an die Oberfläche: Eine fail-closed
  Validierung wurde in einen Pfad verlegt, in dem ein Fehlschlag stillschweigend
  einen falschen Zustand stehen lässt.

### 6. Korrekturen durch Codex nach dem Implementierungsreview

| ID | Entscheidung | Umsetzung und Nachweis |
| --- | --- | --- |
| C-01 | angenommen und behoben | Der alte Exportzustand wird vor jedem Szenariorender invalidiert. `projectScenarioLogV2` laeuft lazy im JSON-/CSV-Click-Handler innerhalb `try`/`catch`; ein Fehler zeigt einen Toast und startet keinen Download. Der Browsertest exportiert A, waehlt ein mit `NaN` nicht projizierbares B und belegt, dass weder A noch B heruntergeladen wird und B der aktuelle Zustand bleibt. |
| C-02 | angenommen und behoben | Fuer `Regime: 'accumulation'` sind `withdrawalRates` und `minimumFlex` gruppenspezifisch nicht anwendbar. Werte sind `null`, Grund ist `not_applicable_accumulation_year`, Count ist 0. Beobachtete Return-Ratios bleiben erhalten; ein nachtraeglich fabrizierter Entnahme-Nullwert wird fail-closed abgewiesen. |
| C-03 | angenommen und behoben | `minimumFlexPolicyEffectiveAnnualEur` liest den geplanten Post-Policy-Wert aus `entscheidung.details.minimumFlexEffectiveFinal`; `minimumFlexFulfilledAnnualEur` liest die kanonische Top-Level-Erfuellung. Der verschachtelte Legacy-Name wird in einer nicht mutierenden Kopie entfernt. Synthetischer und tatsaechlicher Runtimepfad werden getestet. |
| C-04 | angenommen und behoben | Neuer expliziter Bezeichner `MONTE_CARLO_EXPORT_V2_VERSION`. Der unqualifizierte Altbezeichner bleibt deprecated und zeigt weiter auf V1. Produktiver Writer, Validator, Dispatcher und Tests verwenden fuer V2 nur den expliziten Namen. |

**Validierung nach der Korrektur:** `monte-carlo-export-contract` 264/264,
`npm test` mit 167/167 Testdateien, vollstaendiger Browser-Smoke inklusive
adversarialem A/B-Exportfall und `git diff --check` gruen. Externes Re-Review
bleibt vor Commit erforderlich.

## Code-Re-Review von Claude (nach Behebung CR-01 bis CR-04)

**Reviewstand:** 2026-08-06, Branch `codex/fokussierte-abschlusshaertung`,
HEAD `27b9264`, Arbeitsbaum uncommitted.

### 1. Prüfung der vier Findings

#### CR-01 – behoben, mit beiden empfohlenen Maßnahmen

`renderSelectedScenario` invalidiert den Exportzustand jetzt **vor** jeder
Renderarbeit (`window.globalCurrentScenarioData = null`,
`exportButtons.style.display = 'none'` als erste beiden Anweisungen). Zusätzlich
ist die Projektion aus dem Render- in den Click-Pfad verschoben
(`projectCurrentScenarioForExport`) und dort in `try`/`catch` gefasst; im
Fehlerfall erscheint ein Toast und es wird nichts heruntergeladen. Der
Rohzeilencache enthält kein projiziertes Dokument mehr, das veralten könnte.

Das Orakel ist stark: `tests/simulator-monte-carlo-browser.mjs` injiziert ein
`NaN` in eine Zeile von Szenario B und prüft vier Dinge — Szenario A ist
invalidiert (`oldStateReused === false`), B ist die aktuelle Quelle, kein
Dokument ist zwischengespeichert, und der Klick löst **keinen** Download aus,
sondern den erwarteten Toast.

#### CR-02 – behoben

`accumulationYear = financiallyEvaluable && row.Regime === 'accumulation'`
schaltet `withdrawalRates` und `minimumFlex` auf nicht anwendbar. Die Werte sind
`null` mit `reason: 'not_applicable_accumulation_year'` und
`observations: 0` statt gemessener Nullen; Renditequotienten bleiben korrekt
anwendbar. `validateScenarioLogExportV2` leitet dieselbe Anwendbarkeit aus dem
projizierten `Regime` erneut ab und erzwingt Konsistenz fail-closed. Testorakel
vorhanden.

#### CR-03 – behoben, beide Hälften

`removeLegacyMinimumFlexCollision` entfernt
`entscheidung.details.minimumFlexEffectiveFinal` aus dem projizierten Record —
der beanstandete Name ist im V2-Export nicht mehr vorhanden. Zugleich speist
`resolveMinimumFlexPolicyValue` das Feld
`minimumFlexPolicyEffectiveAnnualEur` jetzt aus **genau diesem** kollidierenden
Zwilling statt aus `minimumFlexEffectiveAfter`. Damit tragen geplanter
Policy-Wert und kanonische Erfüllungsmessung erstmals unterschiedliche Namen
bei korrekter Quelle. Der Test prüft den Wert, die Abwesenheit des Zwillings und
dass übrige verschachtelte Diagnosen erhalten bleiben.

#### CR-04 – behoben, besser als vorgeschlagen

`MONTE_CARLO_EXPORT_VERSION` zeigt wieder auf V1 — die ursprüngliche Bedeutung
ist wiederhergestellt statt nur dokumentiert —, versehen mit einem
Deprecation-Kommentar; `MONTE_CARLO_EXPORT_V2_VERSION` ist der explizite neue
Bezeichner. Auch der Default von `exportError` ist auf V1 korrigiert, sodass
V1-Fehlermeldungen ihren eigenen Versionspräfix behalten. Ein Contracttest
fixiert die historische Bedeutung des Aliasnamens.

### 2. Gates und Testintegrität

| Gate | Ergebnis |
| --- | --- |
| `npm test` | 19.145/19.145 Assertions, 0 Fehler, 0 offene Handles |
| `npm run test:browser` | vollständig bestanden |
| `git diff --check` | sauber |

Die Entfernungen im Testdiff wurden auf stille Orakelschwächung geprüft. Keine
gefunden: `test.assertNoUnexpectedErrors()` wurde nicht gestrichen, sondern ans
Ende des erweiterten Falls verschoben und mit der präzisen Ausnahmeliste
`['Szenario-Export fehlgeschlagen']` versehen; die Implementierung
(`tests/simulator-monte-carlo-browser.mjs:150-153`) filtert per Teilstring, alle
anderen Konsolenfehler lassen den Fall weiterhin scheitern. Die übrigen
Löschungen sind Umbenennungen auf die expliziten Versionskonstanten sowie
Dokumentationstext.

### 3. Restrisiken

- **Der Akkumulations-Diskriminator ist ein Stringliteral an drei Stellen:**
  Produzent (`simulator-accumulation-year.js:186`), Projektor und Validator.
  Der Test fixiert das Verhalten für eine Zeile, die `Regime: 'accumulation'`
  bereits trägt — nicht aber, dass der Produzent genau dieses Literal schreibt.
  Eine Umbenennung dort würde Akkumulationszeilen unbemerkt wieder zu normalen
  Finanzjahren mit beobachteten Nullen machen, also exakt CR-02 reaktivieren.
  Ein einzeiliger Contracttest gegen den Produzenten würde das schließen.
- `entscheidung.details` führt weiterhin die übrigen `keyParams` unter
  Legacy-Namen. Diese sind eindeutig einwertig, erzeugen also keine neue
  Kollision; der V2-Record mischt jedoch kanonische V2-Felder mit einem
  Legacy-Diagnoseblock. Die Architektur-Rückdokumentation sollte festhalten,
  dass allein die V2-Top-Level-Felder vertraglich sind.
- `projectScenarioLogV2([])` erzeugt ein gültiges Dokument ohne Records; ein
  leerer Szenariolog ist damit exportierbar. Vor der Änderung verlangte nur der
  CSV-Pfad `length > 0`. Ohne praktische Auswirkung, aber vermerkt.

### 4. Pre-Mortem

In drei Monaten wird ein Feld im Akkumulationszweig umbenannt oder das Regime
umetikettiert, und Akkumulationsjahre erscheinen im Export wieder mit
Entnahmequote 0,00 Prozent als gemessenem Wert — ohne dass ein Test anschlägt,
weil das Orakel die Zeile mit dem Literal bereits voraussetzt.

### 5. Review-Ergebnis

- **Status:** freigegeben
- **Blocker:** keine
- **Offene Findings:** keine; drei benannte Restrisiken, davon eines mit
  konkreter, billiger Gegenmaßnahme (Contracttest auf das Regime-Literal)
- **Einordnung:** Alle vier Findings sind an der Ursache behoben, nicht
  umgangen, und jedes trägt ein eigenes Testorakel. CR-03 und CR-04 wurden
  gründlicher gelöst als von mir vorgeschlagen: Der kollidierende Zwilling wird
  nicht nur entfernt, sondern als korrekte Quelle des neuen Policy-Feldes
  verwendet, und die Versionskonstante erhält ihre ursprüngliche Bedeutung
  zurück statt nur einen Kommentar.

## Review-Feedback von Claude (Planungsphase)

**Reviewstand:** 2026-08-06, `main`, HEAD `27b9264`. Planreview siehe
`FOKUSSIERTE_ABSCHLUSSHAERTUNG_PLAN.md` (C-P-01 bis C-P-15).

### 1. Prüfdimensionen

**Korrektheit vs. Akzeptanzkriterien.** Die Findings F1 bis F4 und F8 sind
sachlich korrekt erfasst; F1 und die Bin-Semantik wurden im Code
nachvollzogen (`monte-carlo-runner-utils.js:3`,
`monte-carlo-runner.js:830`, `monte-carlo-contracts.js:499`). Zwei Teilbefunde
fehlen als AK: siehe C-01.

**Vertragstreue.** Das AK „Bestehende V1-Exporte bleiben über einen expliziten
V1-Leser lesbar" ist mit der aktuellen Dateiliste nicht erfüllbar – siehe
C-02. Positiv ist, dass der bestehende Leser unbekannte Felder bereits
telemetriert statt zu scheitern (`tests/monte-carlo-export-contract.test.mjs:305`);
der Versionsstring selbst ist dagegen hart geprüft.

**Fehlerbehandlung.** Der Chunk-Result-Vertrag weist unregistrierte Buffer
fail-closed ab. Jede neue Missingness-Maske und jeder neue Buffer muss dort
registriert werden, sonst bricht der Worker-Pfad zur Laufzeit und nicht im
Test. Das gehört in die geplanten Tests aufgenommen.

**Seiteneffekte.** Sechs bis acht Dateien außerhalb der Liste sind zwingend
betroffen (C-02). Die Umbenennung der `...Pct`-Renditefelder verlässt zudem
den MC-Scope und trifft die Backtest-Tabellen.

**Was könnte brechen?** Ein V2-Autor liefert korrekte Feldnamen, die
zugrunde liegende Aggregation bleibt aber unverändert – der Export ist dann
formal V2 und inhaltlich V1. Das ist im Abschnitt „Offene Risiken" bereits
richtig erkannt; das AK dazu fehlt jedoch.

### 2. Findings

#### C-01 (mittel) – zwei Teilbefunde ohne Akzeptanzkriterium

`observationCount: {}` (nicht serialisierte Map, Analyse F4 Nebenbefund) und
die Asymmetrie zwölf Bin-Einträge gegenüber elf `countsByPlanYear`-Werten
(F1 Zusatzbefund) sind nur implizit abgedeckt. Beide brechen genau die
maschinelle Auswertung, die dieser Slice absichern soll. Als AK aufnehmen:
„Bin-Liste und Zählliste besitzen identische Länge" sowie
„`observationCount` ist ein serialisierbares Objekt mit Zahlwerten".

#### C-02 (Blocker, entspricht C-P-03) – Dateiliste unvollständig

Zwingend zusätzlich betroffen: `app/simulator/monte-carlo-export.js`
(Versionskonstante und fail-closed Prüfung bei `:191`, dort liegt der
geforderte V1-Leser), `app/simulator/monte-carlo-runner-utils.js`
(`MC_HEATMAP_BINS` bei `:3`), `app/simulator/auto-optimize-worker.js`
(eigener Konsument bei `:13, :69`), `app/simulator/simulator-results.js:416`
und `app/simulator/simulator-main-helpers.js:430` (Anzeige der
Renditefelder), `app/simulator/historical-backtest-runner.js:608` (setzt
`NominalReturnEquityPct`) sowie `app/simulator/mc-stress-tracker.js` und
`app/simulator/simulator-engine-direct.js` (Konsumenten `entnahmequote`).

Damit liegt der Slice bei 13 bis 15 Programmdateien gegen ein Limit von zehn.
Empfehlung: Teilung in 1a (Heatmap-Intervalle plus Einheiten/Ratio-Suffixe)
und 1b (Quotenbenennung, Missingness/Applicability, Terminalrecord).

#### C-03 (hoch, entspricht C-P-02) – realer Drawdown gehört in diesen Vertragsschnitt

Slice 2 benötigt eine reale Drawdown-KPI im Ergebnisvertrag. Wird sie erst
dort ergänzt, existieren zwei unterschiedliche V2-Generationen unter
demselben Label. Entweder hier aufnehmen oder V2 hier als `V2-draft`
kennzeichnen und erst nach Slice 2 einfrieren.

#### C-04 (hoch, entspricht C-P-06) – bekannter Semantikfehler nicht im Scope

Die Doppelbelegung `minimumFlexEffectiveFinal` (Analyse 9.3, R5) ist ein
Exportsemantikfehler derselben Klasse wie F3 und gehört fachlich in diesen
Slice. Aktuell ist er weder hier noch in der NR-Tabelle des Plans geführt.

#### C-05 (mittel) – Semantikorakel für V2 fehlt als Akzeptanzkriterium

Das Risiko „nur Top-Level-Label geändert" ist unter „Offene Risiken"
beschrieben, aber nicht prüfbar verankert. Als AK aufnehmen: Für mindestens
einen Grenzwert je Heatmap-Bin und je ein Ratio-/Prozentpunktfeld prüft ein
Golden-Test den **Wert**, nicht nur den Feldnamen.

#### C-06 (niedrig) – Migrationsverhalten für V1-Dateien unbestimmt

„V1-Reader bleibt kontrolliert lesbar" lässt offen, ob die Anwendung beim
Einlesen einer alten Datei sichtbar kennzeichnet, dass die Heatmap-Grenzen
darin die alte, falsch benannte Semantik tragen. Ohne diesen Hinweis wird ein
Altexport nach dem Fix erneut falsch gelesen. Empfehlung: V1-Lesepfad erzeugt
eine sichtbare Warnung.

### 3. Pre-Mortem

In drei Monaten wird ein Export maschinell ausgewertet, der formal V2 ist,
dessen Heatmap-Zählwerte aber weiterhin positionsweise gegen eine um einen
Eintrag längere Bin-Liste gepaart werden (C-01), oder eine ältere V1-Datei
wird ohne Warnung mit der neuen Intervallsemantik gelesen (C-06). Das
Fehlerbild ist identisch mit dem bereits eingetretenen Fehler aus F1.

### 4. Review-Ergebnis

- **Status:** blockiert – nicht implementierungsreif
- **Blocker:** C-02; abhängig von der Planentscheidung zusätzlich C-03
- **Restrisiken:** C-01, C-04, C-05, C-06; verbleibend das Risiko, dass die
  Umbenennung der Renditefelder in den Backtest-Tabellen still eine
  Formatierung mit falschem Faktor hinterlässt, weil dort heute
  `formatPercentFromRatio` verwendet wird und ein Feld mit `...Ratio`-Namen
  optisch unverändert bleibt

## Re-Review von Claude (zweite Runde)

**Reviewstand:** 2026-08-06. C-01 bis C-06 der ersten Runde sind gelöst: Die
Bin-/Count-Längengleichheit, das serialisierbare `observationCount`, das
Semantik-Golden-Orakel, der V1-Dispatcher mit Pflichtwarnung, der reale
Drawdown und die Mindest-Flex-Trennung sind jetzt eigene Akzeptanzkriterien.
Der V2-Projektionsadapter löst das Dateilimit sauber, weil die
Konsumentendateien ausdrücklich Nicht-Scope sind.

### Neues Finding

#### C-07 (Blocker, entspricht C-P-16) – Das Szenario-Log fällt aus dem V2-Vertrag heraus

F2, F3, F8 und die R5-Namenskollision treten nicht im Exportdokument auf,
sondern in den Szenario-Logs. Deren Export ist
`app/simulator/simulator-results.js:217` und serialisiert ein **nacktes Array
von Rohzeilen** — ohne `schemaVersion`, ohne `unitContract`, ohne Dispatcher.
Die Datei ist in diesem Slice ausdrücklich Nicht-Scope; das AK „Versionsdispatcher
liest V1 und V2" gilt nur für `MonteCarloExportV2`.

Die in diesem Slice eingeplanten Produzenten `simulator-year-result.js` und
`mc-log-builder.js` können die Zeilen zwar korrigieren — dann aber als stille
In-place-Semantikänderung eines unversionierten Artefakts, was Abschnitt 14 des
Hauptplans untersagt. Alte und neue `scenario-log.json` wären nicht
unterscheidbar.

CSV-Zusatzbefund (`simulator-results.js:233`):
`const headers = Object.keys(rows[0])`. Die Spalten stammen nur aus der ersten
Zeile. Ein `recordType`, den ausschließlich der Terminalrecord trägt, erscheint
im CSV-Export nie — die F8-Korrektur bliebe dort unsichtbar.

Erforderlich vor Freigabe: Entscheidung und AK zur Kennzeichnung des
Szenario-Logs. Minimalvorschlag — Kopfobjekt mit `schemaVersion` und
`unitContract` statt nacktem Array, `recordType` auf **allen** Zeilen,
CSV-Header aus der Vereinigungsmenge aller Zeilenschlüssel. Wird das
mitgenommen, ist zu prüfen, ob `simulator-results.js` als zehnte produktive
Datei aufgenommen werden muss oder ob der Slice geteilt wird.

#### C-08 (mittel, entspricht C-P-22) – Dateiüberschneidung mit Slice 3

`simulator-year-result.js` und `mc-log-builder.js` stehen auch in der
Slice-3-Liste. Der dateibasierte Rollback in Slice 3 würde die hier
abgenommenen Änderungen mit zurücknehmen; dort ist auf `git revert` des
Slice-3-Commits umzustellen.

### Review-Ergebnis (zweite Runde)

- **Status:** blockiert – nicht implementierungsreif
- **Blocker:** C-07
- **Restrisiken:** C-08; verbleibend, dass der V2-Adapter die interne
  Ratio-Semantik unangetastet lässt und damit zwei parallele Wahrheiten
  bestehen — im Export eindeutig benannt, intern weiterhin `...Pct` mit
  Ratio-Inhalt. Das ist der Preis des gewählten Schnitts und sollte in
  `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md` ausdrücklich festgehalten
  werden.

## Drittes Review von Claude

**Reviewstand:** 2026-08-06. C-07 ist gelöst. Der `ScenarioLogExportV2`-Envelope
mit gemeinsamem Projektor für JSON und CSV, `recordType` auf allen Rohzeilen
aus `mc-log-builder.js`, fail-closed Validierung statt Textheuristik, die fünf
stabilen V1-Warncodes, der CSV-Header als Vereinigungsmenge und die eigenen
Dateinamen `scenario-log-v2.json`/`.csv` schließen die Lücke vollständig.

Die konkret benannten Einheiten-Mappings wurden gegen den Code nachgerechnet:

| Zusage | Beleg | Ergebnis |
| --- | --- | --- |
| `entnahmequote` × 100 → `realizedWithdrawalRatePct` | `simulator-year-result.js:310` ist ein Quotient | korrekt |
| `QuoteEndPct` unverändert → `policyWithdrawalRatePct` | `simulator-year-result.js:224-226` multipliziert bereits mit 100 | korrekt |
| Renditefelder ohne Faktorwechsel → `...Ratio` | `simulator-year-result.js:306-309` liefert Quotienten | korrekt |

### Neue Findings

#### C-09 (mittel, entspricht C-P-25) – `policyWithdrawalRatePct` misst die Vorjahresrate

`QuoteEndPct` speist sich aus `spendingResult.details.entnahmequoteDepot`, und
dieser Wert entsteht in `engine/planners/SpendingPlanner.mjs:155-162` aus
`vorlaeufigeEntnahme = floor + flex * (previousFlexRate / 100)` – also aus der
Flexrate des **Vorjahres**, bevor die diesjährige Policy gelaufen ist.

Der Name `policyWithdrawalRatePct` legt die Politikquote dieses Jahres nahe.
Das ist dieselbe Klasse von Fehlinterpretation, die F3 beseitigen soll. Der
`unitContract` muss den Messzeitpunkt wörtlich festhalten: „vorläufige Entnahme
auf Basis der Vorjahres-Flexrate, vor Transaktions- und Auszahlungsphase,
Nenner Depot ohne Liquidität und Health-Bucket".

#### C-10 (mittel, entspricht C-P-26) – neue Überschneidung mit Slice 2

`simulator-results.js` steht nun in Slice 1 **und** in Slice 2. Die für
geteilte Dateien beschlossene Rollback-Regel (`git revert` des exakten Commits
statt dateibasierter Rücknahme) ist auf dieses Paar auszudehnen. Zudem liegt
der Slice bei zehn von zehn Dateien ohne jede Reserve; die Stop-Regel muss bei
einer elften Abhängigkeit tatsächlich greifen.

### Review-Ergebnis (dritte Runde)

- **Status:** freigegeben unter Auflagen
- **Blocker:** keine
- **Auflagen:** C-09 und C-10 vor dem ersten Code-Edit nachziehen
- **Restrisiken:** C-09, C-10; verbleibend die bewusst in Kauf genommene
  Doppelwahrheit — im Export eindeutig benannt, intern weiterhin `...Pct` mit
  Ratio-Inhalt. Das ist der Preis des Adapterschnitts und gehört nach
  `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`.

## Viertes Review von Claude

**Reviewstand:** 2026-08-06. C-09 und C-10 sind gelöst. Die Umbenennung in
`preDecisionWithdrawalRatePct` mit wörtlicher Messphasenbeschreibung geht über
die Auflage hinaus und ist die bessere Lösung; die Entfernung von
`simulator-results.js` aus der Nicht-Scope-Liste ist konsistent nachgezogen.

### Neues Finding

#### C-11 (hoch, entspricht C-P-29) – Die 4,5-Prozent-KPI deklariert ihre Quotenbasis nicht

Dieser Punkt ist mir in den ersten drei Runden entgangen. F3 besteht aus zwei
Hälften; die Feldbenennung ist gelöst, die davon abgeleitete Kennzahl nicht.

- Die Heatmap wird auf der realisierten Quote gebildet:
  `monte-carlo-runner.js:828` – `const quote = result.logData.entnahmequote * 100`.
- Die Schwelle stammt aus `CONFIG.THRESHOLDS.STRATEGY.withdrawalRate = 0.045`
  und wird von der Engine auf `entnahmequoteDepot` angewandt
  (`alarm-policy.mjs:14, :29`) — also auf die andere Größe.
- `colSharesAbove45` entsteht in `app/simulator/simulator-heatmap.js:187`, einer
  Datei ohne Slice-Zuordnung.

Nach Abschluss wären die Exportfelder eindeutig, die sichtbare Kennzahl aber
weiterhin eine stille Mischung beider Definitionen. Die Analyse verlangt
ausdrücklich, die 4,5-Prozent-KPI nicht ohne Definition mit der
Guardrail-Schwelle gleichzusetzen.

Zwei zulässige Wege: entweder ein AK, dass Heatmap und abgeleitete
Schwellen-KPIs im V2 ihre Basis ausweisen (`basis: realizedWithdrawalRatePct`) —
dann ist zu prüfen, ob `simulator-heatmap.js` als elfte Datei nötig wird und
der Slice geteilt werden muss — oder eine bewusste NR-Zeile im Hauptplan mit
dauerhaftem Lesehinweis in Abschnitt 4.2.

### Review-Ergebnis (vierte Runde)

- **Status:** freigegeben unter Auflagen
- **Blocker:** keine
- **Auflagen:** C-11 entscheiden (aufnehmen oder als NR-Zeile ablehnen)
- **Restrisiken:** C-11; verbleibend die bewusst in Kauf genommene
  Doppelwahrheit zwischen internen `...Pct`-Feldern mit Ratio-Inhalt und der
  eindeutigen V2-Projektion

## Abschliessende Freigabe durch Claude

**Reviewstand:** 2026-08-06. C-11 ist entschieden (Nutzerentscheidung NE-01)
und umgesetzt: Der V2-Vertrag weist die Quotenbasis der Heatmap und der
abgeleiteten Schwellen-KPIs aus. Dieser Teil liegt vollständig in den bereits
gelisteten zehn Dateien; die sichtbare Beschriftung folgt in Slice 2.

### Review-Ergebnis (abschliessend)

- **Status:** freigegeben
- **Blocker:** keine
- **Offene Findings:** keine
- **Restrisiken:** Der Slice liegt bei zehn von zehn produktiven Dateien ohne
  Reserve — die Stop-Regel muss bei einer elften Abhängigkeit tatsächlich
  greifen. Bewusst in Kauf genommen bleibt die Doppelwahrheit zwischen internen
  `...Pct`-Feldern mit Ratio-Inhalt und der eindeutigen V2-Projektion; sie
  gehört nach `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`.

## Review-Antworten von Codex

Alle elf Findings werden angenommen.

- C-01: Bin-/Count-Laengengleichheit und ein serialisierbares numerisches
  `observationCount` sind jetzt eigene Akzeptanzkriterien.
- C-02: Der Slice ist auf einen V2-Projektionsadapter zugeschnitten. Die zehn
  maximal erwarteten produktiven Dateien sind vollstaendig aufgefuehrt;
  projektweite interne Feldumbenennungen sind ausgeschlossen. Reicht dieser
  Zuschnitt nicht, gilt die Stop-Regel vor Coding.
- C-03: Der reale Drawdown wird samt Buffer, Chunk-Registrierung, Aggregation,
  Missingness und Worker-Paritaet in diesem Slice in V2 aufgenommen. Slice 2
  konsumiert den danach eingefrorenen Vertrag nur noch fuer die Anzeige.
- C-04: Die Doppelbelegung `minimumFlexEffectiveFinal` wird an der
  V2-Projektionsgrenze in zwei fachlich benannte Felder aufgeloest.
- C-05: Golden-Tests muessen Grenzwerte und numerische Semantik pruefen; eine
  korrekte Versions- oder Feldbezeichnung allein besteht die Abnahme nicht.
- C-06: Der Versionsdispatcher kennzeichnet gelesene V1-Dateien mit einer
  verpflichtenden Kompatibilitaetswarnung und weist unbekannte Versionen
  weiterhin fail-closed ab.
- C-07: Das Szenario-Log ist jetzt ein eigener versionierter Contract. JSON und
  CSV entstehen aus einer gemeinsamen V2-Projektion; jeder Record ist typisiert,
  und der CSV-Header ist die stabile Vereinigungsmenge aller Recordfelder.
  `simulator-results.js` ist die zehnte produktive Datei dieses Slices.
- C-08: Slice 3 veraendert `mc-log-builder.js` nicht mehr. Fuer die verbleibende
  Ueberschneidung `simulator-year-result.js` gilt: kein dateiweiser Rollback;
  nur Revert des exakten Slice-3-Commits oder dokumentierte Hunk-Ruecknahme.
- C-09: Das missverstaendliche `policyWithdrawalRatePct` wird vor dem
  V2-Freeze in `preDecisionWithdrawalRatePct` umbenannt. Der Unit-Contract nennt
  Vorjahres-Flexrate, Messphase und Depotnenner woertlich; ein Golden-Test
  sichert Wert und Text.
- C-10: `simulator-results.js` ist ausdruecklich als zwischen Slice 1/2 geteilte
  Datei dokumentiert. Commit-/Hunk-Rollback gilt auch hier; bei einer elften
  produktiven Abhaengigkeit wird nicht weiterimplementiert.
- C-11: Der vorhandene V2-Projektionszuschnitt erhaelt ohne zusaetzliche
  produktive Datei einen maschinenlesbaren Messcontract fuer Basis, Schwelle,
  Vergleichsoperator und reine Berichtsrolle. Die sichtbare Beschriftung liegt
  in Slice 2; `simulator-heatmap.js` wird deshalb nicht als elfte Datei in
  diesen Slice gezogen. Exakt 4,5 Prozent bleibt bewusst im bin-basierten
  `>=`-Overlay, aber ausserhalb des strikt-`>`-KPI.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| C-01 | Claude | `observationCount: {}` und Bin-/Count-Asymmetrie ohne AK | angenommen | AK und Tests ergaenzt |
| C-02 | Claude | Dateiliste unvollständig; Stopregel wird gerissen | angenommen | V2-Adapter statt globaler Umbenennung; zehn produktive Dateien und Vorab-Stop |
| C-03 | Claude | Realer Drawdown gehört in denselben Vertragsschnitt | angenommen | vollstaendige KPI-Kette in Slice 1 verschoben |
| C-04 | Claude | `minimumFlexEffectiveFinal`-Doppelbelegung nicht im Scope | angenommen | getrennte V2-Ausgabefelder verbindlich |
| C-05 | Claude | Semantik-Golden-Orakel nicht als AK verankert | angenommen | Wert-/Grenz-/Einheitenorakel ergaenzt |
| C-06 | Claude | Kein sichtbarer Hinweis beim Lesen alter V1-Exporte | angenommen | verpflichtende V1-Kompatibilitaetswarnung |
| C-07 | Claude (Re-Review) | Szenario-Log bleibt unversioniert; CSV verliert terminal-only Felder | angenommen | `ScenarioLogExportV2`, gemeinsamer JSON-/CSV-Adapter, Vereinigungsheader, zehnte Datei |
| C-08 | Claude (Re-Review) | Dateiueberschneidung mit Slice 3 macht dateiweises Rollback gefaehrlich | angenommen | Ueberschneidung reduziert; Commit-/Hunk-Rollback verbindlich |
| C-09 | Claude (3. Runde) | `policyWithdrawalRatePct` verschleiert Vorjahresrate und Messzeitpunkt | angenommen | `preDecisionWithdrawalRatePct`; woertlicher Unit-Contract und Golden-Test |
| C-10 | Claude (3. Runde) | `simulator-results.js` ist mit Slice 2 geteilt; keine Dateireserve | angenommen | geteilte Datei und Rollback explizit; elfte Datei stoppt |
| C-11 | Claude (4. Runde) | 4,5-Prozent-KPI und Heatmap weisen die realisierte Quotenbasis und ihre Abgrenzung zur Strategie-/Guardrail-Schwelle nicht aus | angenommen | V2-Messmetadaten mit getrenntem `>`-/bin-basiertem `>=`-Operator; sichtbare Copy in Slice 2 |
| G-P-05 | Gemini | Vereinigungsheader verhindert Streaming und verlangt vollstaendige Recordsicht | hohe Einstufung/Streamingforderung abgelehnt; Speicherannahme praezisiert | bereits materialisierter laufzeitbegrenzter Einzelpfad; oberer `maxDauer`-Grenztest |
| CR-01 | Claude (Code-Review) | Fail-closed `projectScenarioLogV2` liegt ohne `try`/`catch` im Render-Pfad; bei Wurf bleibt `globalCurrentScenarioData` auf dem vorherigen Szenario stehen, waehrend Log und Exportknoepfe das neue zeigen — Export liefert dann den falschen Pfad | angenommen, umgesetzt; Re-Review ausstehend | alter Zustand vor Render invalidiert; lazy Click-Projektion mit sichtbarem Fehler; adversarialer A/B-Browsertest |
| CR-02 | Claude (Code-Review) | Akkumulationsjahre werden als `financial_year` projiziert und liefern `realizedWithdrawalRatePct: 0` sowie `preDecisionWithdrawalRatePct: 0` als beobachtete Nullen | angenommen, umgesetzt; Re-Review ausstehend | gruppenspezifisch `null`, `not_applicable_accumulation_year`, Count 0; fail-closed Negativtest |
| CR-03 | Claude (Code-Review) | `entscheidung.details.minimumFlexEffectiveFinal` bleibt im V2-Record erhalten; `minimumFlexPolicyEffectiveAnnualEur` stammt aus `minimumFlexEffectiveAfter` statt aus dem kollidierenden Zwilling | angenommen, umgesetzt; Re-Review ausstehend | Policyquelle auf verschachtelten Post-Policy-Wert korrigiert; Legacy-Name entfernt; Runtimebeleg |
| CR-04 | Claude (Code-Review) | `MONTE_CARLO_EXPORT_VERSION` zeigt ohne Namensaenderung nun auf V2 | angenommen, umgesetzt; **Re-Review bestanden** | explizites `MONTE_CARLO_EXPORT_V2_VERSION`; deprecated Altname behaelt V1-Semantik |
| CR-05 | Claude (Code-Re-Review) | Akkumulations-Diskriminator ist das Stringliteral `Regime === 'accumulation'` in Produzent, Projektor und Validator; kein Test fixiert das Literal beim Produzenten, eine Umbenennung dort reaktiviert CR-02 unbemerkt | offen (niedrig) | - |

**Re-Review-Ergebnis Claude (2026-08-06):** CR-01 bis CR-04 sind an der Ursache
behoben und je mit eigenem Testorakel belegt. `npm test` 19.145/19.145,
Browser-Gate vollstaendig bestanden, `git diff --check` sauber. Keine stille
Orakelschwaechung im Testdiff. Slice 1 ist **freigegeben**; offen bleibt allein
das niedrig eingestufte CR-05.

## Abschliessendes Code-Review von Gemini (2026-08-07)

**Reviewstand:** 2026-08-07, Branch `codex/fokussierte-abschlusshaertung`, HEAD `27b9264`. Geprüft wurden die 8 geänderten produktiven Dateien, die Test-Fixtures, der Diff sowie die vollständige Testsuite.

### 1. Prüfdimensionen

- **Korrektheit vs. Akzeptanzkriterien:** Der V2-Exportvertrag (`MonteCarloExportV2` und `ScenarioLogExportV2`) ist sauber und isoliert über den Projektionsadapter implementiert. Sämtliche Akzeptanzkriterien (Heatmap-Bins inkl./exkl., reale Drawdown-Aggregation mit Missingness-Handling, getrennte Mindest-Flex-Felder `minimumFlexPolicyEffectiveAnnualEur` / `minimumFlexFulfilledAnnualEur`, explizite Terminalrecord-Typisierung und V1-Dispatcher mit Warnungen) wurden vollständig erfüllt.
- **Vertragstreue:** Es wurden exakt 8 produktive Dateien verändert (Limit von max. 10 Dateien wurde eingehalten). V1-Kompatibilität bleibt fail-closed erhalten; `MONTE_CARLO_EXPORT_V2_VERSION` ist explizit gefasst.
- **Fehlerbehandlung:** Die Behebung von CR-01 schützt den Anwender verlässlich: Die lazy V2-Projektion im Click-Handler invalidiert den alten Zustand vor dem Rendern; Fehler werfen einen Fehler-Toast und unterbinden den Download veralteter/falscher Pfade. Akkumulationsjahre werden (CR-02) korrekt als `null` mit `not_applicable_accumulation_year` geführt.
- **Seiteneffekte & Validierung:** `npm test` lief mit 167 Testdateien und 19.145 Assertions (0 Fehler, 0 offene Handles) vollständig grün durch. `git diff --check` ist sauber.
- **Was könnte brechen?** Verbleibend ist das von Claude identifizierte Restrisiko CR-05 (Stringliteral-Kopplung beim Akkumulations-Regime).

### 2. Pre-Mortem

**Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?**

Eine künftige Umbenennung des Stringliterals `Regime === 'accumulation'` im Produzenten lässt Akkumulationsjahre unbemerkt wieder als reguläre Finanzjahre mit gemessener Entnahmequote `0.00 %` durchrutschen, weil der Projektor ohne expliziten Produzenten-Contracttest das neue Literal nicht erkennt.

### 3. Review-Ergebnis

- **Status:** **freigegeben**
- **Blocker:** keine
- **Restrisiken:** CR-05 (Stringliteral-Kopplung bei Akkumulations-Regime)
- **Abnahme:** Slice 01 ist technisch und fachlich abgenommen und für den lokalen Commit freigegeben.

