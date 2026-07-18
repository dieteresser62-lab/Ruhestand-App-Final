# Slice 02: DOM-freier Backtest-Runner

**Arbeitsplan:** [SIMULATOR_BACKTEST_HARDENING_PLAN.md](./SIMULATOR_BACKTEST_HARDENING_PLAN.md)  
**Feature-Branch:** `codex/simulator-backtest-gap-plan`  
**GitHub-Status:** nur lokal; Veroeffentlichung ausstehend und nur nach Nutzerfreigabe  
**Status:** freigegeben; technisches Review durch Gemini abgeschlossen (freigegeben)  
**Abhaengigkeit:** Slice 01 gruen und freigegeben  
**GAPs:** BT-08, BT-09, BT-14

## Ziel

Die historische Jahresschleife und der rohe Laufzustand werden aus `simulator-backtest.js` in einen DOM-freien, per Dependency Injection testbaren Runner extrahiert. Die bestehende UI-Funktion wird zu einem Adapter aus DOM-Input, Runner-Aufruf und Rendering.

Dieser Slice ist strikt verhaltensneutral gegen die als `legacy_observed` markierte Characterization aus Slice 01. Das umfasst ausdruecklich completed-Pfade und die heutigen defekten Ruin-/Pflegebucket-/10-%-/`globalBacktestData`-Beobachtungen. Diese Werte werden reproduziert, aber niemals als Zielsoll freigegeben; ihre Korrektur bleibt den Fachslices 04-06 vorbehalten.

## Akzeptanzkriterien

- Ein DOM-freier Runner akzeptiert explizite Inputs, Zeitraum, Historical-Data-Provider und `simulateOneYear`-Dependency.
- Der Runner liest weder `document`, `window`, `localStorage` noch PersistenceFacade.
- Der Runner liefert ein vorlaeufiges versioniertes Result-Shape mit mindestens `request`, `rows`, `requestedYears`, `completedYears`, `portfolioStart`, `portfolioEnd` und `legacyOutcome`.
- Der UI-Adapter projiziert daraus weiterhin exakt `legacy_schema_v0` von `window.globalBacktestData`; neue Felder duerfen parallel im internen Resultat existieren, aber bestehende Consumer nicht still brechen.
- `runBacktest()` bleibt als bestehender globaler UI-Einstieg erhalten und rendert sichtbar identisch.
- Der doppelte, nicht verwendete Text-Log-Pfad sowie ungenutzte Variablen/Imports werden entfernt, sofern dies byte-identische Rohresultate nicht beeinflusst.
- Eingaben, Detailtranchen und Historienrecords werden an der Runnergrenze in eine kanonische Laufkopie ueberfuehrt. Non-Mutation wird mit tief eingefrorenen Testinputs und Vorher-/Nachher-Hash geprueft; eine konkrete Clone-Technik ist nur zulaessig, wenn Typen und `undefined`-Semantik erhalten bleiben.
- Alle Slice-01-Baselines sind ohne fachliches Delta gruen.
- Coverage des neuen Runners liegt fuer Statements/Zeilen im fokussierten Contract bei mindestens 90 %; Gesamtcoverage sinkt nicht.

## Scope

- Runner-Extraktion
- explizite Dependencies und vorlaeufiges Request-/Result-Grundshape
- UI-Adapter auf bestehendes Rendering
- Entfernung toten Backtest-Textlog-Codes
- fokussierte Paritaets-/Non-Mutation-Tests

## Nicht-Scope

- keine neue Zeitachsenkonvention
- keine Aenderung von Datenwerten oder Jahresgrenzen
- keine Outcome-Korrektur
- keine Rolling Cohorts
- kein Export-Redesign
- keine Engine-/Worker-Aenderung

## Geplante Dateien

Voraussichtlich:

- neu: `app/simulator/historical-backtest-runner.js`
- geaendert: `app/simulator/simulator-backtest.js`
- neu: `tests/historical-backtest-runner.test.mjs`
- geaendert: `tests/simulator-backtest.test.mjs`
- optional: `docs/reference/SIMULATOR_MODULES_README.md`

Programmdateien: voraussichtlich 4. Bei weiteren Runtime-Aufrufern oder mehr als zehn Programmdateien neu schneiden und stoppen.

## Runner-Grenze

```text
UI adapter
  read/validate DOM inputs
  -> runHistoricalBacktest({ inputs, period, historicalData, simulateYear })
       no DOM / no persistence / no global EngineAPI lookup
       returns raw result
  -> renderBacktestResult(raw result)
```

`simulateYear` darf als Dependency den bestehenden Wrapper erhalten. Die Extraktion darf Mutation nicht verstecken: Portfolio- und State-Kopien sowie bewusst mutierte Objekte sind im Contract zu dokumentieren.

Der Runner darf ausschliesslich seine eigene Laufkopie mutieren. Ein zweiter Aufruf mit demselben Requestobjekt und ein Lauf mit tief eingefrorenen Inputs muessen dieselben Rohwerte liefern und duerfen nicht werfen, sofern die Inputs fachlich gueltig sind.

## Diff-Risiko vor Coding

```text
Implementierungsstart 2026-07-18:
- git branch --show-current: codex/simulator-backtest-gap-plan
- git status --short:
  - unversioniert: docs/internal/SLICE_SIMULATOR_BACKTEST_02_DOM_FREIER_RUNNER.md bis SLICE_SIMULATOR_BACKTEST_10_INTEGRATION_DOKUMENTATION.md
  - unversioniert: Playwright-Pakete und Startskripte unter node_modules/
- Einordnung: Slice 01 ist in Commit 8daa98b durch Gemini freigegeben und lokal committed. Die Folge-Slices und Playwright-Dateien waren vor Slice-02-Beginn vorhanden und werden ausserhalb des Slice-Scope nicht veraendert.

Geplante Dateien:
- app/simulator/historical-backtest-runner.js
- app/simulator/simulator-backtest.js
- tests/historical-backtest-runner.test.mjs
- tests/simulator-backtest.test.mjs
- optional docs/reference/SIMULATOR_MODULES_README.md
- docs/internal/SLICE_SIMULATOR_BACKTEST_02_DOM_FREIER_RUNNER.md
- docs/internal/SIMULATOR_BACKTEST_HARDENING_PLAN.md

Voraussichtliche Änderungstiefe:
- riskant; Orchestrierungsgrenze eines finanziellen Mehrjahrespfads

Gefährdete bestehende Tests:
- simulator-backtest.test.mjs
- simulator-real-withdrawal-contract.test.mjs
- simulator-3bucket-ui-e2e.test.mjs
- simulator-multiprofile-aggregation.test.mjs
- browser-smoke.test.mjs

Nicht anfassen:
- engine/** und engine.js
- workers/**
- Monte-Carlo-/Sweep-/Auto-Optimize-Runner
- historische Datenwerte
- dist/** und RuheStandSuite.exe
- node_modules/**

Rollback-Strategie:
- git checkout -- app/simulator/simulator-backtest.js tests/simulator-backtest.test.mjs docs/reference/SIMULATOR_MODULES_README.md
- neue Runner-/Testdateien nur nach Nutzerfreigabe entfernen
```

## Geplante Tests

- `node --check app/simulator/historical-backtest-runner.js`
- `node --check app/simulator/simulator-backtest.js`
- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
- `node tests/run-single.mjs tests/simulator-real-withdrawal-contract.test.mjs`
- `node tests/run-single.mjs tests/simulator-3bucket-ui-e2e.test.mjs`
- `npm test`
- `npm run test:coverage`

## Review-Auflagen in diesem Slice

- Claude C-01/C-07: Ruin-State und `legacy_schema_v0` sind harte Paritaetsoracles vor jeder Extraktion.
- Gemini G-F-04: wiederholte Aufrufe, tief eingefrorene Inputs, verschachtelte Partner-/Tranchenobjekte und historische Quelldaten auf Non-Mutation testen.
- Jede Abweichung eines Legacy-Oracles stoppt Slice 02; Defektkorrekturen duerfen nicht als Refactoring versteckt werden.

## Stop-Regeln dieses Slice

- Irgendein Golden-/Characterization-Wert aendert sich.
- Realtranchen, Profilinputs oder uebergebene Inputs werden mutiert.
- Der Runner benoetigt DOM-/Window-/Persistence-Zugriff.
- Die Extraktion erzwingt eine Aenderung der `simulateOneYear`- oder EngineAPI-Signatur.
- FlowDelta, Steuer, Mindest-Flex oder 3-Bucket-Zahlen weichen ab.

## Durchgefuehrte Aenderungen

- `app/simulator/historical-backtest-runner.js` neu angelegt. `runHistoricalBacktest()` fuehrt Initialisierung, historische Jahresschleife, Ruinzeile, Rohzeilen und Legacy-Metriken ohne DOM-/Storage-/Globalzugriff aus.
- Explizite Runnergrenze implementiert: `inputs`, `period`, `historicalDataProvider`, `simulateYear`, `initializePortfolio`, `computeAdjustmentPct`, `resolveHorizon`, `totalPortfolio`, `breakOnRuin`.
- Vorlaeufige versionierte Shapes `BacktestRequestV0` und `BacktestRunResultV0` eingefuehrt. Das Ergebnis enthaelt `request`, `rows`, `requestedYears`, `completedYears`, `portfolioStart`, `portfolioEnd`, `legacyOutcome` und `legacyMetrics`.
- Caller-Inputs und historische Records werden an der Runnergrenze geklont. Die kanonische Requestkopie wird tief eingefroren; die getrennte Laufkopie bleibt intern mutierbar. `undefined`, `Date`, `RegExp`, Prototypen und zyklische Referenzen bleiben erhalten.
- `simulator-backtest.js` auf DOM-Input/Validierung, Runner-Delegation, exakte `legacy_schema_v0`-Projektion, Summary und Rendering reduziert.
- Doppelter ungenutzter Textlogpfad, Textformathelper, `extraKPI`, `sumDepot`, `jahresrenditeGold` und zugehoerige tote Imports entfernt.
- `tests/historical-backtest-runner.test.mjs` mit V0-Shape-, Dependency-, Completed-/Partial-/Leer-/Ruin-, Wiederholungs- und tiefen Non-Mutation-Contracts angelegt.
- Den Slice-01-Quelloracle fuer den 10-%-Operator in `simulator-backtest-characterization.test.mjs` auf Adapter plus neuen Runner erweitert; Fixture und Erwartungswerte blieben unveraendert.
- `docs/reference/SIMULATOR_MODULES_README.md`, `docs/reference/TECHNICAL.md`, `tests/README.md` und der Arbeitsplan auf die neue Grenze aktualisiert.

## Ausgefuehrte Tests

- `node --check app/simulator/historical-backtest-runner.js`: gruen.
- `node --check app/simulator/simulator-backtest.js`: gruen.
- `node --check tests/historical-backtest-runner.test.mjs`: gruen.
- `node tests/run-single.mjs tests/historical-backtest-runner.test.mjs`: gruen, 50/50 Assertions.
- `node tests/run-single.mjs tests/simulator-backtest-characterization.test.mjs`: gruen, 65/65 Assertions; 0 Fixture-Deltas.
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`: gruen, 46/46 Assertions.
- `node tests/run-single.mjs tests/simulator-real-withdrawal-contract.test.mjs`: gruen, 52/52 Assertions.
- `node tests/run-single.mjs tests/simulator-3bucket-ui-e2e.test.mjs`: gruen, 15/15 Assertions.
- `node tests/run-single.mjs tests/simulator-multiprofile-aggregation.test.mjs`: gruen, 51/51 Assertions.
- `npm test`: gruen, 113 Testdateien, 4700/4700 Assertions, 0 fehlgeschlagene Dateien, 0 offene Handles.
- `npm run test:coverage`: gruen, erneut 4700/4700 Assertions; Runner 90,57 % (288/318 ausfuehrbare Zeilen), Gesamtcoverage 73,16 % (26950/36839).
- `npm run test:browser`: gruen; alle Browser-Smokes fuer `index.html`, `Balance.html`, `Simulator.html`, Tranchenmanager und Handbuch bestanden.
- `git diff --check`: gruen.

## Ergebnisse

- `runHistoricalBacktest()` ist ohne Browserumgebung direkt aufrufbar und benoetigt keine EngineAPI-Signaturaenderung.
- Ein Testlauf mit absichtlich blockierten Globals `document`, `window`, `localStorage` und `PersistenceFacade` bleibt gruen.
- Tief eingefrorene Partner-/Trancheninputs sowie tief eingefrorene historische Records bleiben vor/nach Erst- und Wiederholungslauf bytegleich in der stabilen Testprojektion.
- `BacktestRequestV0` is tief eingefroren und dokumentiert Zeitraum, `single_path`, `breakOnRuin` sowie die kanonische Inputkopie.
- `BacktestRunResultV0` trennt angeforderte von erfolgreich simulierten Jahren, behaelt aber ueber `legacyOutcome` bewusst die beobachteten Legacy-Klassifikationen bis Slice 05 bei.
- `window.globalBacktestData` behaelt exakt die Felder `rows`, `startJahr`, `decumulationMode`, `goldAktiv`, `minimumFlexProfiles`; kein interner V0-Shape wird still in den Legacy-Consumer geschoben.
- Alle Slice-01-Golden-Werte einschliesslich Ruin-Vorjahreswert, synthetischer Null-Ruinzeile, Pflegebucket-Leerfeld, mittlerer Datenluecke, nicht-finiter Goldnormalisierung und exakt 10 % sind unveraendert.

## Abweichungen vom Plan

- `tests/simulator-backtest.test.mjs` benoetigte keine Aenderung; seine bestehenden 46 Assertions pruefen den UI-Adapter bereits vollstaendig.
- Stattdessen wurde `tests/simulator-backtest-characterization.test.mjs` minimal angepasst, weil der dortige bewusst quellenbasierte 10-%-Oracle nach der Extraktion auch den neuen Runner lesen muss. Der erzeugte Characterization-Payload blieb bytegleich zur freigegebenen Fixture.
- Zusaetzlich wurde `docs/reference/TECHNICAL.md` aktualisiert, weil die neue Runnergrenze den dokumentierten Modulzuschnitt betrifft.
- Die projektweite Coverage bleibt 73,16 %; das Slice-Gate bezieht sich wie geplant fokussiert auf den neuen Runner und ist mit 90,57 % erfuellt.

## Offene Risiken

- Implizite Globals koennen beim Extrahieren uebersehen werden.
- `BacktestRunResultV0` ist absichtlich noch kein finaler `BacktestRunResultV1`: Rows und Gesamtresultat werden erst in den Folge-Slices vollstaendig immutable/provenienzfaehig; diskriminierte Outcomes und strukturierte Fehler folgen in Slice 05.
- Der aktuelle Legacy-Pfad mit `breakOnRuin=false` bleibt fachlich undefiniert und wird nicht vorgezogen korrigiert. Der produktive Adapter uebergibt weiterhin die bestehende Konstante.
- Der Kloner ist fuer den normalisierten Simulator-/Historien-Datenvertrag ausgelegt. Nicht datenartige Ressourcen wie Funktionen, DOM-Knoten oder offene Handles sind keine zulaessigen Inputs und werden nicht als neuer Contract eingefuehrt.
- Entfernte Textlogformatierung war nicht konsumiert; Tabellenrenderer, Export und Browser-Smoke sind gruen. Ein nicht versionierter externer Debugconsumer dieses toten lokalen Strings waere weiterhin nicht erkennbar.

## Rueckdokumentation

Tatsaechliche Runner-Signatur, V0-Request-/Result-Grundshape, Non-Mutation, Legacy-Paritaet, Testzahlen und Coverage sind im Arbeitsplan, in `SIMULATOR_MODULES_README.md`, `TECHNICAL.md` und `tests/README.md` dokumentiert.

## Freigabestatus

Implementierung und Selbstpruefung abgeschlossen. Review durch Gemini und Freigabe durch den Nutzer stehen aus. Codex erteilt keine Eigenfreigabe und erstellt keinen Commit.

## Review-Feedback von Gemini

### 1. Prüfdimensionen & Befunde

1. **Korrektheit (GAPs und Akzeptanzkriterien):**
   - **Parität:** Die Extraktion des DOM-freien Runners `runHistoricalBacktest` reproduziert das Legacy-Verhalten (inklusive der bekannten Defekte bei Ruin, Pflegebucket und 10-%-Operator) fehlerfrei. Alle Characterization-Baselines aus Slice 01 sind unverändert grün.
   - **Immutabilität:** Der Runner überführt die empfangenen Inputs und Datenrecords an der Grenze in klonierte Kopien. Der Request sowie die Eingangs-Inputs werden tief eingefroren. Non-Mutation-Tests bestätigen, dass wiederholte Ausführungen mit identischen Objekten byte-stabile, nicht veränderte Zustände hinterlassen.
   - **Coverage:** Der Runner erzielt eine Coverage von 90,57 % und erfüllt damit die Hürde von 90 % für den neu extrahierten Kernpfad.

2. **Vertragstreue:**
   - Der Runner `runHistoricalBacktest` verzichtet vollständig auf Zugriffe auf Browser-Globals (`document`, `window`, `localStorage`, `PersistenceFacade`). Dies wird durch dedizierte Getters im Test-Environment verifiziert, die bei unbefugtem Zugriff eine Exception werfen.

3. **Fehlerbehandlung:**
   - Eingegebene Integrations-Abhängigkeiten (Dependencies wie `simulateYear`, `initializePortfolio` etc.) werden vor Ausführung per Typ-Prüfung abgesichert.

4. **Seiteneffekte:**
   - Änderungen beschränken sich auf die Extraktion in `historical-backtest-runner.js` und die Entlastung des UI-Adapters `simulator-backtest.js` von toten Code-Pfaden und Log-Formatierungshilfen.
   - Alle bestehenden Tests (einschließlich E2E und Browser-Smokes) laufen unverändert durch.

5. **Was könnte brechen?:**
   - *Klonierung komplexer Objekte:* Die Klonierungsfunktion `cloneRunValue` verwendet `Object.create(Object.getPrototypeOf(value))` und kopiert Eigenschafts-Deskriptoren. Bei Objekten mit Gettern/Settern, die auf nicht-klonierte interne Zustände verweisen, kann dies zu Laufzeitfehlern führen. Da die Simulator-Inputs derzeit reine Datenobjekte (JSON) sind, ist das Risiko aktuell nicht materialisiert.
   - *Mutierbarkeit nach Klonierung:* Der Runner friert `request` und `requestInputs` tief ein, klont `runInputs` aber für den internen Durchlauf als mutierbare Kopie. Fehler in `simulateYear` oder Hilfsfunktionen, die diese interne Kopie an unvorhergesehenen Stellen modifizieren, könnten Seiteneffekte innerhalb desselben Backtests haben (jedoch nicht über den Backtest-Aufruf hinaus, da die Caller-Inputs geschützt sind).

### 2. Pre-Mortem
Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
- *Szenario:* In einem zukünftigen Slice wird ein komplexeres Tranchen- oder Profilobjekt mit einer internen zirkulären Struktur oder einer Datums-Eigenschaft eingeführt, die von `cloneRunValue` unvollständig geklont wird (z. B. durch eine veränderte Prototyp-Kette oder ein nicht-enumerable Symbol). Dies führt beim Start des Backtests zu stillen Zuordnungsfehlern oder Verlust von Metadaten, was falsche Berechnungen der steuerlichen Einstandswerte zur Folge hat.

### 3. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:**
  - *Klonierung komplexer Objekte:* Deskriptoren-Klonierung kann bei nicht-datenartigen Custom-Objekten mit gekapselten Closures fehlerhaftes Verhalten zeigen.
  - *Interne State-Mutation:* Die interne veränderliche Kopie der Inputs (`runInputs`) ist gegen unerwünschte Modifikationen innerhalb der Jahresschleife nicht vollständig isoliert.
- **Pre-Mortem:** (Siehe Szenario oben - Datenverlust/Klonierungsfehler bei künftigen komplexen Tranchen/Profilen mit Custom-Prototypen).

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| S02-IMPL | Codex | DOM-freier Runner implementiert; Legacy-Paritaet, Non-Mutation, Browser und Coverage gruen | freigegeben durch Gemini | Runner extrahiert und Adapter-Paritaet verifiziert |
