# Slice 03 - Kanonische Zahlen, Fractional Lots und Nullgrenzen

**Stand:** 2026-07-23  
**Status:** freigegeben - Review durch Gemini am 2026-07-23 erfolgreich durchgeführt  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini)  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** DAT-01, DAT-04, BAL-06 sowie die cross-layer Null-/Dezimalanteile von ENG-03, ENG-09 und OPT-04  
**Prioritaet:** P0

Display-Parsing endet an der UI-/Importgrenze. Bereits kanonische JavaScript-`number`-Werte werden nur auf Endlichkeit geprueft und niemals anhand ihrer Dezimaldarstellung als lokalisierte Texte neu interpretiert. Gueltige Null- und Dezimalwerte bleiben bis zur zustaendigen fachlichen Validierungsgrenze unveraendert.

## Fachentscheidung zu Grenzen

Am 2026-07-23 wurde vor Coding ein im Hauptplan definierter Stop-Fall festgestellt: Simulator-UI und Engine verwendeten fuer dieselben Strategieparameter unterschiedliche Grenzen. Der Nutzer hat folgende Umsetzung bestaetigt:

- Zahlenreader erhalten kanonische `0` unveraendert.
- Die normale Simulator-UI wird an die vorhandenen Engine-Grenzen angepasst:
  - `targetEq`: 20 bis 90 Prozent;
  - `maxSkimPctOfEq`: 0 bis 50 Prozent;
  - `maxBearRefillPctOfEq`: 0 bis 70 Prozent.
- Ein direkt an den Reader uebergebener Wert `targetEq=0` bleibt dort nachweislich `0`, wird aber an der vorhandenen Engine-Validierungsgrenze sichtbar abgewiesen und nicht still auf 60 Prozent ersetzt.
- `maxSkimPctOfEq=0` und `maxBearRefillPctOfEq=0` bleiben gueltige deaktivierende Werte.

Diese Entscheidung aendert keine Engine-Formel und erweitert keine Engine-Grenze.

## Akzeptanzkriterien

- O-05 und der Zahlen-/Nullgrenzenanteil von O-08 sind gruen.
- Ein kanonisches `shares=1.234` bleibt 1,234 Anteile; bei 100,50 EUR Preis entstehen 124,017 EUR Marktwert.
- Kanonische Numbers werden in allen Portfolio-Einstiegen ohne Separatorheuristik verarbeitet.
- DOM-/Legacy-Strings werden nur an der benannten Displaygrenze lokalisiert geparst.
- `targetEq=0`, `maxSkimPctOfEq=0`, `maxBearRefillPctOfEq=0` und `minCashBufferMonths=0` bleiben im jeweiligen Reader exakt 0.
- `targetEq=0` wird spaeter durch die bestehende Engine-Validierung strukturiert abgewiesen.
- Prozent 2,5 bleibt 2,5, sofern der HTML-/Engine-Contract den Wert erlaubt.
- Fehlend, leer, ungueltig, nicht endlich, 0 und negativ sind in Tests getrennt.
- Mehrdeutige lokalisierte Strings werden nicht als kanonische Numbers behandelt.

## Scope

### Programmdateien

- `app/simulator/simulator-portfolio-format.js`
- `app/simulator/simulator-input-dom.js`
- `app/simulator/simulator-portfolio-init.js`
- `app/simulator/simulator-input-strategy.js`
- `app/balance/balance-reader.js`
- `Simulator.html`

### Tests und Dokumentation

- `tests/simulator-input-readers.test.mjs`
- `tests/simulator-portfolio-tranches.test.mjs`
- `tests/balance-reader.test.mjs`
- `tests/tranche-contract.test.mjs`
- `tests/canonical-number-boundary.test.mjs`
- `tests/simulator-backtest.test.mjs`
- vorhandene Portfolio-, Engine-Validierungs- und Orchestrierungstests
- `docs/internal/SLICE_SUITE_DATA_03_CANONICAL_NUMBERS.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Nicht-Scope

- keine allgemeine Lokalisierungsbibliothek;
- keine Umbenennung von `detailledTranches`;
- keine Aenderung von Engine-Formeln oder Engine-Grenzen;
- keine Korrektur der Transaktionsmodule aus Slice 02;
- keine Korrektur der Optimizer-Defaults aus Slice 10;
- keine generierten Artefakte (`engine.js`, `dist/`, `RuheStandSuite.exe`).

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-23.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber.

## Diff-Risiko

```text
Geplante Dateien:
- app/simulator/simulator-portfolio-format.js
- app/simulator/simulator-input-dom.js
- app/simulator/simulator-portfolio-init.js
- app/simulator/simulator-input-strategy.js
- app/balance/balance-reader.js
- Simulator.html
- tests/simulator-input-readers.test.mjs
- tests/simulator-portfolio-tranches.test.mjs
- tests/balance-reader.test.mjs
- tests/tranche-contract.test.mjs
- tests/canonical-number-boundary.test.mjs
- tests/simulator-backtest.test.mjs
- docs/internal/SLICE_SUITE_DATA_03_CANONICAL_NUMBERS.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- mittel

Gefaehrdete bestehende Tests:
- tests/simulator-input-readers.test.mjs
- tests/simulator-portfolio-tranches.test.mjs
- tests/portfolio.test.mjs
- tests/balance-reader.test.mjs
- tests/canonical-number-boundary.test.mjs
- Simulator-Browser-Smokes

Nicht anfassen:
- engine/
- engine.js
- Transaktions- und Optimizer-Defaults
- Profilaggregation
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/simulator-portfolio-format.js app/simulator/simulator-portfolio-init.js app/simulator/simulator-input-strategy.js app/balance/balance-reader.js Simulator.html tests/simulator-input-readers.test.mjs tests/simulator-portfolio-tranches.test.mjs tests/balance-reader.test.mjs tests/tranche-contract.test.mjs docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen.
```

Es sind fuenf Programmdateien geplant; die Stop-Regel von mehr als zehn Programmdateien greift nicht. Die festgestellten Bounds-Unterschiede wurden vor Coding durch den Nutzer entschieden.

## Baseline- und Delta-Ledger

### Vorher-Vertrag

- `parseDisplayNumber(1.234)` wandelt den kanonischen Number-Wert ueber einen String zur Zahl 1234.
- Der normale Simulator-Strategiereader liest Prozentwerte ganzzahlig und ersetzt gueltige 0-Werte durch Defaults.
- Der Balance-Reader ersetzt `minCashBufferMonths=0` durch 2.
- Die Simulator-HTML-Grenzen sind weiter als die vorhandene Engine-Validierung.

### Erwartetes Delta

- Kanonische Number-Werte bleiben numerisch identisch.
- Displaystrings behalten den bestehenden expliziten de-DE-Parsingpfad, soweit sie eindeutig sind.
- Gueltige Dezimalprozente werden nicht abgeschnitten.
- Nullwerte werden nicht durch Falsy-Defaults ersetzt.
- Engine-Grenzen und normale Simulator-UI sind synchron; die Engine-Semantik selbst bleibt unveraendert.
- Snapshot-, Backtest-, Steuer- und FlowDelta-Ergebnisse duerfen nicht unerwartet abweichen.

## Geplante Tests und fachliche Orakel

- Direkter Parsercontract fuer kanonische Numbers, eindeutige Displaystrings, Missing, leer, ungueltig, `NaN`, `Infinity`, 0 und negative Werte.
- O-05 mit `shares=1.234`, Preis 100,50 EUR und Marktwert 124,017 EUR.
- Strategiereader mit 0 und 2,5 Prozent ohne Integerverlust oder Default.
- Balance-Reader mit `minCashBufferMonths=0`.
- HTML-/Engine-Bounds-Contract fuer die drei Strategieparameter.
- Fokussierte Tests:
  - `node tests/run-single.mjs tests/tranche-contract.test.mjs`
  - `node tests/run-single.mjs tests/simulator-portfolio-tranches.test.mjs`
  - `node tests/run-single.mjs tests/portfolio.test.mjs`
  - `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
  - `node tests/run-single.mjs tests/balance-reader.test.mjs`
  - `node tests/run-single.mjs tests/input-validator-boundaries.test.mjs`
- Pflichtgates:
  - `npm test`
  - `npm run test:browser`
  - `git diff --check`

## Durchgefuehrte Aenderungen

- `parseDisplayNumber()` trennt kanonische JavaScript-`number`-Werte vor jeder Lokalisierungsheuristik ab. Endliche Numbers bleiben identisch; `NaN` und `Infinity` fallen im Displaypfad weiterhin auf 0 zurueck.
- Der Displaystring-Pfad akzeptiert nur vollstaendige de-DE/en-US-Zahlenformen. Teilstrings und widerspruechliche Separatorgruppen werden nicht mehr mit `parseFloat()` teilweise akzeptiert.
- Der gemeinsame Simulator-DOM-Reader verwendet einen strikten endlichen Zahlenparser:
  - kein Partial-Parsing wie `12abc -> 12`;
  - einzelne Dezimalkommas bleiben fuer programmatische/Legacy-DOM-Fixtures unterstuetzt;
  - Integerfelder weisen Dezimalwerte zugunsten ihres dokumentierten Fallbacks ab;
  - gueltige 0 bleibt von Missing/Invalid getrennt.
- Der Strategie-Reader liest Aktienziel, Rebalancing-Band, Skim- und Bear-Cap als Numbers statt als Integer und entfernt Falsy-Defaults. Damit bleiben `0` und `2.5` bis zur fachlichen Validierungsgrenze erhalten.
- Der Portfolio-Initializer akzeptiert an der kanonischen Tranchen-Grenze nur endliche Numbers. Stringwerte wie `"1.234"` werden mit `SimulatorPortfolioInputError`, Code `SIMULATOR_PORTFOLIO_NUMBER_INVALID` und Feld-/Indexkontext fail-closed abgewiesen.
- Fehlende abgeleitete Tranchenwerte (`null`/`undefined`) bleiben von ungueltigen Strings getrennt und werden weiterhin aus `shares * price` abgeleitet.
- Der Balance-Reader erhaelt `minCashBufferMonths=0` und andere endliche Strategie-Nullwerte, statt sie durch Falsy-Defaults zu ersetzen.
- Die normale Simulator-UI folgt der bestaetigten Engine-Grenze:
  - `targetEq` 20 bis 90;
  - `maxSkimPctOfEq` 0 bis 50;
  - `maxBearRefillPctOfEq` 0 bis 70.
- Ein neuer Contract-Test deckt O-05, Parserstatus, Null-/Dezimalwerte, HTML-/Engine-Grenzen und die wirtschaftliche Gleichheit von abgeleitetem zu explizitem Fractional Lot in Monte Carlo, Sweep und Optimizer ab.
- Der echte Backtest initialisiert 1,234 Anteile zu 100,50 EUR als 124,017 EUR und weist damit denselben kanonischen Lotwert nach.
- Die Backtest-Fixture setzt die zuvor nur implizit per Falsy-Default erhaltenen Strategie-Defaults nun explizit. Dadurch testet sie nicht laenger den verworfenen Vertrag `künstlich fehlend = "0"`.

## Ausgefuehrte Tests

### Red-State vor Implementierung

- `node tests/run-single.mjs tests/canonical-number-boundary.test.mjs`
  - erwartungsgemaess rot;
  - Ursache: der strukturierte Export `SimulatorPortfolioInputError` und der kanonische Number-Contract existierten noch nicht.

### Fokussierte Tests nach Implementierung

- `node tests/run-single.mjs tests/canonical-number-boundary.test.mjs`
  - 44 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/tranche-contract.test.mjs`
  - 81 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/simulator-portfolio-tranches.test.mjs`
  - 27 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/portfolio.test.mjs`
  - 63 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
  - 53 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/balance-reader.test.mjs`
  - 103 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/simulator-backtest.test.mjs`
  - 57 Assertions, 0 Fehler.

### Pflichtgates

- `npm test`
  - 131 Testdateien;
  - 7.399 Assertions;
  - 0 fehlgeschlagene Assertions;
  - 0 fehlgeschlagene Dateien;
  - 0 offene Handles.
- `npm run test:browser`
  - 16 Browser-Smokes gruen.
- `git diff --check`
  - gruen.

`npm run build:engine` war nicht erforderlich, weil weder `engine/` noch die oeffentliche `EngineAPI` geaendert wurden. Es wurden keine Golden-Fixtures, Snapshots, Backtest-Baselines oder generierten Artefakte aktualisiert.

## Abweichungen vom Plan

- Der im Hauptplan als optional vorgesehene gemeinsame strikte Zahlenparser wurde innerhalb des bereits vorhandenen `app/simulator/simulator-input-dom.js` umgesetzt. Dadurch blieb der Slice bei exakt sechs Programmdateien.
- Der erste Volltestlauf hatte 7.337 von 7.338 Assertions gruen und stoppte beim Backtest. Ursache war keine Backtest-/FlowDelta-Abweichung, sondern eine Mock-Funktion, die jedes fehlende DOM-Feld als explizite Zeichenkette `"0"` erfand. Nach expliziter Aufnahme der bisherigen Defaultwerte in die Fixture waren Backtest, FlowDelta und Vollsuite unveraendert gruen.
- `types/tranche-contract.js` musste nicht geaendert werden, weil dessen kanonischer Number-Vertrag bereits strikt war.

## Offene Risiken

- Bestehende Legacy-Tranchen mit Zahlenstrings werden nun sichtbar abgewiesen. Der Slice migriert mehrdeutige Schreibweisen bewusst nicht; ein spaeterer Import-/Recoverypfad muss Quelle und Locale kennen, bevor er solche Daten konvertiert.
- Ein einzelner String mit Punkt und drei Nachkommastellen bleibt nur im expliziten Displaypfad als de-DE-Tausenderformat zulaessig. Derselbe Wert ist an der kanonischen Tranchen-Grenze ungueltig.
- Die eigentlichen Transaktions- und Optimizer-Falsy-Defaults werden gemaess Abhaengigkeitsplan erst in Slice 02 beziehungsweise Slice 10 korrigiert.
- Sweep und Optimizer besitzen ausserhalb des normalen Simulator-UI-Pfads weiterhin eigene, spaeter zu haertende Parameterräume. Dieser Slice synchronisiert nur die normale UI mit der bestehenden Engine-Validierung.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist auf diese Datei verlinkt.
- Hauptplanstatus fuer Slice 3 ist auf `implementiert - Review ausstehend` aktualisiert.
- Testergebnisse, Bounds-Entscheidung und das verbleibende Legacy-String-Risiko sind im Hauptplan dokumentiert.

## Freigabestatus

Freigegeben durch Gemini am 2026-07-23 nach erfolgreichem adversarialen Review.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-23  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `SLICE_EXECUTION_RULES.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:**
   - `parseDisplayNumber` in `simulator-portfolio-format.js` trennt kanonische JS-`number`-Werte sofort ab. Das Repro O-05 (`shares = 1.234`, `purchasePrice = 100.50`) erzeugt exakt 124,017 EUR Marktwert; die schädliche Punkt-Entfernung bei dreistelligem Nachkommateil ist für Numbers eliminiert.
   - `readCanonicalTrancheNumber` in `simulator-portfolio-init.js` weist String-Zahlen an der kanonischen Schnittstelle fail-closed mit `SimulatorPortfolioInputError` (`SIMULATOR_PORTFOLIO_NUMBER_INVALID`) ab.
   - Strategiereader in `simulator-input-strategy.js` verwendet `readNumber` statt `readInt` und entfernt `|| default`-Falsy-Overwrites. Gültige 0-Werte (`maxSkimPctOfEq=0`, `maxBearRefillPctOfEq=0`) und Dezimalquoten (`2.5 %`) bleiben erhalten.
   - `balance-reader.js` lässt `minCashBufferMonths=0` unangetastet.
   - HTML-Bounds in `Simulator.html` stimmen exakt mit der Engine-Validierung überein (`targetEq`: 20–90 %, `maxSkimPctOfEq`: 0–50 %, `maxBearRefillPctOfEq`: 0–70 %).
2. **Vertragstreue:**
   - Engine (`engine/`) und `EngineAPI` blieben unangetastet.
   - Der Backtest-Runner demonstriert die Wiederholbarkeit von Fractional Lots in echten Pfaden (`tests/simulator-backtest.test.mjs`).
3. **Fehlerbehandlung:**
   - Eindeutige Fehlerklasse `SimulatorPortfolioInputError` liefert Feld-, Index- und Wert-Kontext bei ungültigen Tranchenwerten.
4. **Seiteneffekte:**
   - Exakt 6 Programmdateien angepasst (`Simulator.html`, `balance-reader.js`, `simulator-input-dom.js`, `simulator-input-strategy.js`, `simulator-portfolio-format.js`, `simulator-portfolio-init.js`). Max. Datei-Limit von 6 eingehalten.
   - Test-Suite (`npm test`, 7.399 Assertions) und Browser-Smokes (`npm run test:browser`, 16 E2E-Läufe) grün.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. Legacy-JSON/CSV-Importe mit unformatieren Strings müssen an der Importgrenze (Slice 12) typisiert konvertiert werden, da die kanonische Tranchenschnittstelle Strings nun strikt abweist.
  2. Transaktionsinterne Falsy-Defaults in `transaction-opportunistic.mjs` werden erst in Slice 02 gehärtet.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein alter LocalStorage-Datenstand mit als String gespeicherten Tranchenwerten (`"shares": "1.234"` statt `1.234`), der nach einem App-Upgrade beim Initialisieren des Portfolios wegen des neuen strikten Type-Checks mit `SIMULATOR_PORTFOLIO_NUMBER_INVALID` abgewiesen wird.
```

## Review-Feedback von Claude

Ausstehend beziehungsweise optional.

## Review-Antworten von Codex

Review-Findings berücksichtigt; Implementierung vollständig grün.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-03-01 | Nutzer | UI-/Engine-Bounds und Semantik von `targetEq=0` | Reader erhält 0; UI folgt Engine; Engine weist `targetEq=0` sichtbar ab | erledigt |
