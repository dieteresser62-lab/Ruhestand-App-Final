# Slice 03 - Kanonische Zahlen, Fractional Lots und Nullgrenzen

**Stand:** 2026-07-27  
**Status:** freigegeben - Re-Review aller Nachbesserungen (REV-03-F01, REV-03-F02) am 2026-07-27 erfolgreich durchgeführt  
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
- `app/tranches/depot-tranchen-status.js` (Nachbesserung S03-2)
- `Simulator.html`

### Tests und Dokumentation

- `tests/simulator-input-readers.test.mjs`
- `tests/simulator-portfolio-tranches.test.mjs`
- `tests/balance-reader.test.mjs`
- `tests/depot-tranchen-status.test.mjs`
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

Vor der ersten Umsetzung waren sechs Programmdateien geplant; die Stop-Regel
von mehr als zehn Programmdateien griff nicht. Die festgestellten
Bounds-Unterschiede wurden vor Coding durch den Nutzer entschieden. S03-2
erweiterte den Scope bei der Nachbesserung dokumentiert auf sieben
Programmdateien.

### Nachbesserungs-Preflight 2026-07-27

- Aktiver Branch: `codex/suite-datenintegritaet-hardening`
- `git status --short` vor der Nachbesserung:

```text
 M docs/internal/SLICE_SUITE_DATA_03_CANONICAL_NUMBERS.md
 M docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
```

Die beiden Dokumentaenderungen stammen aus den nachgelagerten Reviews und
bleiben erhalten.

```text
Geplante Nachbesserungsdateien:
- app/balance/balance-reader.js
- app/tranches/depot-tranchen-status.js
- tests/balance-reader.test.mjs
- tests/depot-tranchen-status.test.mjs
- docs/internal/SLICE_SUITE_DATA_03_CANONICAL_NUMBERS.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- klein bis mittel

Gefaehrdete bestehende Tests:
- tests/balance-reader.test.mjs
- tests/depot-tranchen-status.test.mjs
- tests/simulator-input-readers.test.mjs
- Simulator-Browser-Smokes

Nicht anfassen:
- engine/
- engine.js
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- Nur die vier Code-/Test-Nachbesserungsdateien auf den Stand vor der
  Nachbesserung zurueckfuehren; die vorhandenen Review-Dokumentaenderungen
  bleiben erhalten.
```

Die Nachbesserung aendert eine bereits im Slice enthaltene Programmdatei und
nimmt fuer S03-2 den gemeinsamen Tranchen-Sync als siebte Programmdatei in den
Scope auf. Es greift keine Stop-Regel.

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
  - `node tests/run-single.mjs tests/depot-tranchen-status.test.mjs`
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

### Nachbesserung vom 2026-07-27

- `goldZielProzent=0` bleibt im Balance-Reader fuer DOM- und Profilwerte
  erhalten. Fehlende, nicht endliche, negative und zu grosse Werte verwenden
  weiterhin den bestehenden Default `7.5`.
- `rebalancingBand=0` bleibt bei aktivem Gold als kanonische Nulltoleranz
  erhalten. Missing/Invalid verwendet weiterhin `25`, ein fehlender Wert bei
  inaktivem Gold bleibt kompatibel bei `0`.
- `syncTranchenToInputs()` schreibt `type="hidden"`-Felder als kanonische
  Zahlenstrings ohne Locale-Separator. Sichtbare Text-Geldfelder bleiben
  de-DE-formatiert. Damit kann ein Depotwert `1234` nicht mehr als `"1.234"`
  geschrieben und anschliessend als Dezimalzahl `1.234` gelesen werden.
- Die Balance-Reader-Tests pruefen die Nullgrenzen sowohl am DOM als auch am
  echten Profilpfad. Der Tranchenstatus-Test sichert die Writer-/Reader-Grenze
  fuer sichtbare und versteckte Felder ab.

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

### Nachbesserungs-Gates vom 2026-07-27

- `node tests/run-single.mjs tests/balance-reader.test.mjs`
  - 111 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/depot-tranchen-status.test.mjs`
  - 27 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/canonical-number-boundary.test.mjs`
  - 44 Assertions, 0 Fehler.
- `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
  - 53 Assertions, 0 Fehler.
- `npm test`
  - 132 Testdateien;
  - 7.679 Assertions;
  - 0 fehlgeschlagene Assertions;
  - 0 fehlgeschlagene Dateien;
  - 0 offene Handles.
- `npm run test:browser`
  - 16 Browser-Smokes gruen.
- `git diff --check`
  - nach Abschluss der Dokumentation gruen.

## Abweichungen vom Plan

- Der im Hauptplan als optional vorgesehene gemeinsame strikte Zahlenparser wurde innerhalb des bereits vorhandenen `app/simulator/simulator-input-dom.js` umgesetzt. Dadurch blieb der Slice bei exakt sechs Programmdateien.
- Der erste Volltestlauf hatte 7.337 von 7.338 Assertions gruen und stoppte beim Backtest. Ursache war keine Backtest-/FlowDelta-Abweichung, sondern eine Mock-Funktion, die jedes fehlende DOM-Feld als explizite Zeichenkette `"0"` erfand. Nach expliziter Aufnahme der bisherigen Defaultwerte in die Fixture waren Backtest, FlowDelta und Vollsuite unveraendert gruen.
- `types/tranche-contract.js` musste nicht geaendert werden, weil dessen kanonischer Number-Vertrag bereits strikt war.
- S03-2 zeigte nach Verfolgung des Writerpfads eine konkrete
  Locale-Verletzung im gemeinsamen Tranchen-Sync. Deshalb wurde
  `app/tranches/depot-tranchen-status.js` als siebte Programmdatei in den
  Slice-Scope aufgenommen. Die produktive Dateizahl bleibt unter der
  projektweiten Stop-Grenze von mehr als zehn.

## Offene Risiken

- Bestehende Legacy-Tranchen mit Zahlenstrings werden nun sichtbar abgewiesen. Der Slice migriert mehrdeutige Schreibweisen bewusst nicht; ein spaeterer Import-/Recoverypfad muss Quelle und Locale kennen, bevor er solche Daten konvertiert.
- Ein einzelner String mit Punkt und drei Nachkommastellen bleibt nur im expliziten Displaypfad als de-DE-Tausenderformat zulaessig. Derselbe Wert ist an der kanonischen Tranchen-Grenze ungueltig.
- Die eigentlichen Transaktions- und Optimizer-Falsy-Defaults werden gemaess Abhaengigkeitsplan erst in Slice 02 beziehungsweise Slice 10 korrigiert.
- Sweep und Optimizer besitzen ausserhalb des normalen Simulator-UI-Pfads weiterhin eigene, spaeter zu haertende Parameterräume. Dieser Slice synchronisiert nur die normale UI mit der bestehenden Engine-Validierung.
- `parseDisplayNumber()` behaelt seinen kompatiblen Display-Fallback `0` fuer
  unvollstaendige oder ungueltige Texte. Eine sichtbare feldbezogene
  UI-Fehlerstrategie fuer Display- und Strategiefelder ist eine separate
  Contract-/UX-Entscheidung.
- Exponentialschreibweise bleibt in den beiden strikten Zahlenparsern
  zulaessig; der aktuelle Zahlenvertrag verbietet sie nicht.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist auf diese Datei verlinkt.
- Hauptplanstatus fuer Slice 3 ist auf
  `nachgebessert - unabhaengiges Re-Review ausstehend` aktualisiert.
- Testergebnisse, Bounds-Entscheidung, Scope-Erweiterung und verbleibende
  Parser-/UX-Risiken sind im Hauptplan beziehungsweise in dieser Slice-Datei
  dokumentiert.

## Freigabestatus

Freigegeben durch Gemini am 2026-07-27 nach erfolgreichem Re-Review der Nachbesserungen von Codex.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-27 (Re-Review nach Nachbesserung)  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `GEMINI.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:**
   - **`REV-03-F01` (Behoben): `goldZielProzent = 0` wird erhalten:**  
     In `app/balance/balance-reader.js` (Zeile 241) liest `finiteNumber('goldZielProzent', Number.NaN)` Werte wie `0` sauber als endliche Zahl ein. Die Validierungsbedingung `if (!Number.isFinite(goldZielFinal) || goldZielFinal < 0 || goldZielFinal > 50)` erlaubt den kanonischen Wert `0 %` ausdrücklich und setzt den Default `7.5 %` nur bei tatsächlich fehlenden oder ungültigen Eingaben ein.
   - **`REV-03-F02` (Behoben): `rebalancingBand = 0` wird erhalten:**  
     In `app/balance/balance-reader.js` (Zeile 247) prüft `if (goldAktivFinal && (!Number.isFinite(rebalancingBandFinal) || rebalancingBandFinal < 0))` nun strikt `< 0`. Der Wert `0 %` bleibt als gewollte Nulltoleranz beim Rebalancing vollumfänglich erhalten.
   - **`REV-03-F03` (Restrisiko):**  
     `parseDisplayNumber` trennt kanonische JS-Numbers weiterhin strikt ab. Unformatierte String-Formate an der Display-Grenze sind als Restrisiko dokumentiert.
2. **Vertragstreue:**
   - Modus- und Reader-Verträge werden sowohl für DOM- als auch für Profile-Overrides strikt eingehalten. `0`-Werte bleiben erhalten.
3. **Fehlerbehandlung:**
   - Ungültige Teilstrings oder `NaN` fallen strukturiert auf die dokumentierten Fallback-Werte zurück.
4. **Seiteneffekte:**
   - Automated Test Gates: `npm test` (7.679 Assertions in 132 Dateien) und `npm run test:browser` (16 Browser-Smokes) laufen grün durch. `tests/balance-reader.test.mjs` prüft explizit DOM- und Profile-Overrides für `goldZielProzent = 0` und `rebalancingBand = 0`.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. REV-03-F03: parseDisplayNumber ("1.234" als String) interpretiert 3-stellige Nachkommastellen als de-DE Tausendertrennzeichen und konvertiert zu Integer 1234.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein Nutzer importiert ein Profil über eine externe CSV-Datei, bei der `goldZielProzent` als Zeichenkette `"1.234"` übergeben wird. Der Display-Parser interpretiert den Punkt als Tausendertrennzeichen und wandelt die Eingabe fälschlicherweise in den Integer 1234 um.
```

## Review-Feedback von Claude

- **Review-Datum:** 2026-07-27 (nachgelagert, Stand nach Slice 07)
- **Reviewer:** Claude (Opus 5)
- **Methode:** Adversariales Code- und Contract-Review nach `CLAUDE.md` und
  `SLICE_EXECUTION_RULES.md`, gegen den heutigen Codestand statt nur gegen den
  Commitdiff `4965f30`.

### Verifikation

- fokussierte Gates nachgefahren: `canonical-number-boundary` 44,
  `simulator-input-readers` 53, `balance-reader` 103, `tranche-contract` 81,
  `simulator-portfolio-tranches` 28 - alle ohne Fehler;
- Parserverhalten ueber 23 Eingabevarianten direkt vermessen;
- Feldtypen in `Simulator.html` gegen die Readerzuordnung in
  `simulator-input-strategy.js`, `-pension.js` und `-care.js` abgeglichen;
- Tranchen-Datenpfad bis `types/tranche-contract.js` verfolgt;
- REV-03-F01 und REV-03-F02 unabhaengig nachgeprueft und praezisiert.

### Was der Slice korrekt loest

Der Kernfix sitzt an der richtigen Stelle: `parseDisplayNumber` prueft
`typeof value === 'number'` vor jeder Locale-Heuristik.
`parseDisplayNumber(1.234)` liefert nachgemessen `1.234`. Die enumerierten
Nullgrenzen halten: `targetEq=0` bleibt im Reader `0`, das fruehere `|| 60`
ist entfernt. Die Tranchen-Zahlenfelder sind ueber
`types/tranche-contract.js` (`readNumber`, `TRANCHE_NUMBER_NON_FINITE`)
bereits stromaufwaerts auf `typeof number` festgelegt.

### Gemessenes Parserverhalten

| Eingabe | `parseDisplayNumber` | `parseFiniteInputNumber` |
| --- | --- | --- |
| `1.234` (Number) | 1.234 | 1.234 |
| `"1.234"` | 1234 | 1.234 |
| `"1.234,56"` | 1234.56 | 0 |
| `"1.234.567"` | 1234567 | 0 |
| `".5"` | 0 | 0.5 |
| `"1."` | 0 | 1 |
| `"50abc"` | 0 | 0 |
| `"1e3"` | 1000 | 1000 |
| `"0"` / `0` | 0 | 0 |

### Pruefdimensionen

1. **Korrektheit:** DAT-01 ist behoben. Nicht geprueft geblieben waren die
   nicht enumerierten Nullgrenzen desselben Readers (S03-1) und das Verhalten
   bei unvollstaendigen Zahlenstrings (S03-3).
2. **Vertragstreue:** Die Zielformulierung „gueltige Null- und Dezimalwerte
   bleiben bis zur zustaendigen fachlichen Validierungsgrenze unveraendert"
   wird von `balance-reader.js` an zwei Stellen verletzt (S03-1).
3. **Fehlerbehandlung:** Ungueltige Eingaben erzeugen keinen Fehler, sondern
   stille Ersatzwerte - `0` in Geldfeldern (S03-3), den Default in
   Strategiefeldern (S03-4).
4. **Seiteneffekte:** Keine ausserhalb der sechs deklarierten Programmdateien.
5. **Was koennte brechen?** Am wenigsten durchdacht ist die Kopplung zwischen
   HTML-Feldtyp und zustaendigem Reader (S03-2).

### Findings

1. **S03-1 (Blocker) - nicht enumerierte Nullgrenzen im selben Reader
   ueberschreiben gueltige Nullwerte.** Bestaetigt REV-03-F01 und REV-03-F02,
   mit praeziserer Eingrenzung:
   - `balance-reader.js` Zeile 241: `goldZielFinal <= 0` ersetzt einen
     ausdruecklichen Goldzielwert `0` durch `DEFAULT_GOLD_ZIEL = 7.5`;
     unbedingt, auch bei inaktivem Gold.
   - Zeile 247: `goldAktivFinal && rebalancingBandFinal <= 0` ersetzt ein
     ausdrueckliches Band `0` durch `DEFAULT_GOLD_BAND = 25`; anders als in
     REV-03-F02 formuliert nur bei aktivem Gold.
   - Gegenprobe der uebrigen 25 `parseFloat`/`parseInt`-Stellen der Datei:
     `goldFloorProzent` ist unkritisch, weil nur `< 0` den Default ausloest;
     `horizonYears`, `survivalQuantile` und `goGoMultiplier` sind ohnehin
     geklammert; alle weiteren `|| 0` sind wirkungslos, weil der Fallback
     selbst `0` ist. Die Fehlerklasse beschraenkt sich damit exakt auf die
     beiden genannten Stellen.
   Der Slice hat die in den Akzeptanzkriterien aufgezaehlten Felder korrigiert
   und strukturell identische Nachbarn in derselben Funktion stehen lassen.
2. **S03-2 (Restrisiko) - zwei DOM-Reader mit gegensaetzlicher Semantik ohne
   abgesicherte Zuordnung.** `simulator-input-dom.js` exportiert `readNumber`
   (`"1.234"` -> 1.234) und `readDisplayNumber` (`"1.234"` -> 1234). Die
   Zuordnung ist heute stimmig und folgt dem HTML-Feldtyp: `type="number"`
   nutzt den en-Dezimalreader, die aggregierten und deaktivierten
   `type="text"`-Felder mit `inputmode="numeric"` (`tagesgeld`,
   `geldmarktEtf`, `simStartVermoegen`) den de-DE-Displayreader. Diese
   Invariante ist jedoch weder dokumentiert noch durch einen Test gesichert.
   Fragilste Stelle sind die `type="hidden"`-Felder `depotwertAlt`,
   `einstandAlt` und `renteMonatlich`: ein dort programmatisch abgelegter
   de-DE-formatierter String wird vom en-Reader still um Faktor 1000 falsch
   gelesen - exakt die DAT-01-Fehlerklasse an neuer Stelle. Damit ist auch
   REV-03-F03 beantwortet: Das Verhalten `"1.234"` -> 1234 ist fuer
   Displayfelder beabsichtigt und richtig; das Risiko liegt nicht im Parser,
   sondern in der ungesicherten Feld-zu-Reader-Kopplung.
3. **S03-3 (Restrisiko, verifizierte Regression) - stille Nullen in
   Geldfeldern.** `parseDisplayNumber` liefert jetzt `0` fuer Eingaben, die
   die Vorversion geparst hat: `".5"` -> 0 statt 0.5, `"1."` -> 0 statt 1,
   `"50abc"` -> 0 statt 50. Fachlich ist das Abweisen richtig, der gewaehlte
   Ersatzwert nicht: In einem Geldfeld ist `0` ein plausibel aussehender,
   verarbeitbarer Betrag und kein erkennbarer Fehler. `".5"` und `"1."` sind
   dabei gewoehnliche Zwischenzustaende beim Tippen.
4. **S03-4 (Restrisiko) - stille Defaults in Strategiefeldern.**
   `finiteNumber` in `balance-reader.js` und `readNumber` in
   `simulator-input-dom.js` liefern bei ungueltiger Eingabe den Default:
   `targetEq="50abc"` ergibt `60`, nicht `50` und keinen Fehler. Ein
   materiell abweichender Strategieparameter wird damit still gesetzt.
5. **S03-5 (Hinweis) - `SimulatorPortfolioInputError` ist auf dem Normalpfad
   unerreichbar.** `normalizeTrancheCollection` weist Nicht-Zahlen bereits mit
   `TRANCHE_NUMBER_NON_FINITE` ab, bevor `readCanonicalTrancheNumber`
   erreicht wird. Als Verteidigung in der Tiefe sinnvoll; der neue Fehlercode
   `SIMULATOR_PORTFOLIO_NUMBER_INVALID` erscheint dadurch aber praktisch nie.
6. **S03-6 (Hinweis) - HTML-Grenzen erzwingen nichts.** Die verschaerften
   `min`/`max` in `Simulator.html` (targetEq 20-90, maxSkim 0-50,
   maxBearRefill 0-70) blockieren keine programmatischen oder eingefuegten
   Werte. Die Durchsetzung bleibt allein die Engine-Validierung. Die
   Fachentscheidung haelt das fest; die HTML-Aenderung allein koennte den
   Eindruck einer Durchsetzung erwecken.
7. **S03-7 (Hinweis) - Exponentialschreibweise in Geldfeldern.** Beide Parser
   akzeptieren `"1e3"` als 1000.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: blockiert
- Blocker:
  1. S03-1 - `balance-reader.js` ersetzt ein ausdrueckliches Goldziel 0 durch
     7,5 Prozent und ein ausdrueckliches Rebalancing-Band 0 bei aktivem Gold
     durch 25 Prozent. Das verletzt die Zielformulierung dieses Slice
     („gueltige Nullwerte bleiben bis zur fachlichen Validierungsgrenze
     unveraendert") und bestaetigt REV-03-F01 und REV-03-F02. Die uebrigen
     25 parseFloat-/parseInt-Stellen derselben Datei wurden gegengeprueft und
     sind unkritisch.
- Restrisiken:
  1. S03-2 - zwei DOM-Reader mit gegensaetzlicher Semantik; die heute
     stimmige Feld-zu-Reader-Zuordnung ist nicht abgesichert, `type="hidden"`
     ist die fragilste Stelle.
  2. S03-3 - `parseDisplayNumber` liefert fuer `".5"`, `"1."` und `"50abc"`
     still `0` statt eines erkennbaren Fehlers.
  3. S03-4 - ungueltige Strategieeingaben werden still durch den Default
     ersetzt.
  4. S03-5 - SimulatorPortfolioInputError auf dem Normalpfad unerreichbar.
  5. S03-6 - HTML-min/max erzwingen keine Grenzen.
  6. S03-7 - Exponentialschreibweise in Geldfeldern akzeptiert.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten
  einen Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Ein Nutzer stellt sein Goldziel bewusst auf 0 Prozent, um Gold
  auszuschliessen. Der Reader macht daraus 7,5 Prozent, die Balance-Ansicht
  empfiehlt Goldkaeufe, und weil 7,5 Prozent ein unauffaelliger Wert ist,
  faellt die stille Ersetzung erst auf, wenn die Allokation sichtbar von der
  Absicht abweicht. Zweitwahrscheinlichste Ursache: ein spaeterer Slice legt
  einen de-DE-formatierten Betrag in eines der `type="hidden"`-Felder; der
  en-Reader liest ihn um Faktor 1000 zu klein, und weil DAT-01 als behoben
  gilt, sucht dort niemand.
```

### Empfehlung

- S03-1: dieselbe Nullbehandlung wie bei `targetEq` anwenden - ein
  ausdrueckliches `0` erhalten und erst an der fachlichen Validierungsgrenze
  abweisen, statt es im Reader zu ersetzen.
- S03-2: die Feld-zu-Reader-Zuordnung als Contract-Test absichern, der fuer
  jedes gelesene Feld Feldtyp und zustaendigen Reader gegenprueft.
- S03-3 und S03-4: in Geldfeldern statt eines stillen Ersatzwerts einen
  strukturierten Fehler oder ein sichtbares UI-Signal erzeugen.

## Review-Antworten von Codex

Nachbesserung vom 2026-07-27:

1. **REV-03-F01, REV-03-F02 und S03-1 angenommen.**
   `balance-reader.js` unterscheidet jetzt Missing/Invalid von einer
   ausdruecklichen `0`. DOM- und Profilwerte `goldZielProzent=0` sowie
   `rebalancingBand=0` bleiben erhalten. Die bestehenden Defaults fuer
   fehlende oder ungueltige Werte bleiben kompatibel. Das Goldziel `0` wird
   bei aktivem Gold erst an der Engine-Grenze abgewiesen. Ein Goldband `0`
   bedeutet fachlich Nulltoleranz und nicht deaktiviertes Rebalancing.
2. **REV-03-F03 als Parserfehler abgelehnt, S03-2 angenommen.**
   `"1.234" -> 1234` bleibt im ausdruecklichen de-DE-Displayparser gewollt.
   Die Pfadverfolgung bestaetigte jedoch eine konkrete Grenzverletzung:
   `syncTranchenToInputs()` schrieb denselben lokalisierten Text bislang auch
   in kanonische Hidden-Felder. Hidden-Felder werden nun ohne
   Locale-Separator geschrieben; ein Contract-Test sichert sichtbare
   Display- und versteckte kanonische Felder gegeneinander ab.
3. **S03-3 als dokumentiertes Restrisiko eingeordnet.**
   Das Abweisen von `".5"`, `"1."` und `"50abc"` ist die im Slice
   dokumentierte Abkehr vom Partial-Parsing. Der bestehende Display-Fallback
   `0` bleibt kompatibel. Ein strukturiertes sichtbares UI-Signal waere eine
   neue Fehler- und UX-Schnittstelle und wird nicht still in diesem
   Nachbesserungsdiff eingefuehrt.
4. **S03-4 als dokumentiertes Restrisiko eingeordnet.**
   Der aktuelle Contract-Test verlangt fuer ungueltige Strategietexte den
   dokumentierten Default und trennt diese von einer gueltigen `0`. Eine
   sichtbare Ablehnung benoetigt eine eigene Contract-/UX-Entscheidung.
5. **S03-5 abgelehnt.**
   Der normale Persistenzpfad JSON-parst die Tranchen lediglich und reicht
   sie ohne `normalizeTrancheCollection()` an
   `initializePortfolioDetailed()` weiter. Der
   `SimulatorPortfolioInputError` ist daher erreichbar und wird vom
   Canonical-Number-Test nachgewiesen.
6. **S03-6 ohne Codekorrektur dokumentiert.**
   HTML-`min`/`max` sind UI-Grenzen; die bestehende Engine-Validierung bleibt
   gemaess Nutzerentscheidung die verbindliche Durchsetzung.
7. **S03-7 ohne Codekorrektur dokumentiert.**
   Exponentialschreibweise ist vom aktuellen vollstaendigen Zahlenmuster
   erlaubt. Ein Verbot waere eine neue fachliche Parserentscheidung.

Nach der Nachbesserung sind 132 Testdateien mit 7.679 Assertions und alle 16
Browser-Smokes gruen. Der Reviewerstatus wird dadurch nicht eigenmaechtig
geaendert; das unabhaengige Re-Review bleibt ausstehend.

## Re-Review nach Nachbesserung (Claude, 2026-07-27)

**Pruefgegenstand:** Commit `0b2a5bf`, Arbeitsbaum sauber. Zwei
Programmdateien, zwei Testdateien. Der Scope ist auf sieben Programmdateien
erweitert und in dieser Slice-MD ausgewiesen.

### Verifikation

- `npm test`: 7.679/7.679 Assertions gruen (vorher 7.669), 0 offene Handles;
- `git diff --check` sauber;
- eigener Round-Trip-Test der Feld-zu-Reader-Kopplung;
- vollstaendige Branchtabelle der neuen Gold-Grenzlogik;
- Nachpruefung des Tranchen-Persistenzpfads.

### Gemessene Gold-Grenzlogik

```text
rebalancingBand:  goldAktiv=true   0 -> 0   25 -> 25   -5 -> 25   NaN -> 25
                  goldAktiv=false  0 -> 0   25 -> 25   -5 -> -5   NaN -> 0
goldZielProzent:  0 -> 0   10 -> 10   -5 -> 7.5   60 -> 7.5   NaN -> 7.5
```

### Gemessener Round-Trip der Feldkopplung

```text
Feld                Typ      geschrieben  gelesen   Reader
depotwertAlt        hidden   1234         1234      readNumber
geldmarktEtf        text     1.200        1200      readDisplayNumber
depotwertAlt (alt)  hidden   1.234        1.234     readNumber   <- Zustand vor dem Fix
```

Der Vorzustand las einen Depotwert von 1234 EUR als 1,23 EUR. S03-2 war damit
kein latentes Risiko, sondern ein aktiver Faktor-1000-Fehler auf genau dem
Feld, um das DAT-01 ging.

### Korrektur eines eigenen Befunds

**S03-5 war falsch.** Die Ablehnung durch Codex ist korrekt: `readTrancheInputs`
in `simulator-input-tranches.js` liest `depot_tranchen` mit einem rohen
`JSON.parse` und gibt das Ergebnis ohne `normalizeTrancheCollection` weiter.
Ich hatte mit `loadTranchesFromStorage` einen anderen Konsumenten verfolgt.
`SimulatorPortfolioInputError` ist erreichbar, die Absicherung ist noetig.

### Findings-Lifecycle

```text
S03-1  Blocker      BEHOBEN - Nullgrenzen mit vollstaendiger Branchtabelle verifiziert
S03-2  Restrisiko   BEHOBEN - Hidden-Felder kanonisch, Round-Trip verifiziert
S03-3  Restrisiko   ANGENOMMEN - bewusst dokumentiertes Restrisiko
S03-4  Restrisiko   ANGENOMMEN - bewusst dokumentiertes Restrisiko, UX-Entscheidung offen
S03-5  Hinweis      ZURUECKGEZOGEN - Befund war falsch
S03-6  Hinweis      GEKLAERT - Engine bleibt verbindliche Validierungsgrenze
S03-7  Hinweis      GEKLAERT - dokumentierter Zahlenvertrag
REV-03-F01/F02      BEHOBEN gemeinsam mit S03-1
REV-03-F03          BEANTWORTET - Risiko lag in der Feldkopplung, mit S03-2 geschlossen
T03-1  Restrisiko   NEU - negatives rebalancingBand passiert bei inaktivem Gold ungeprueft
T03-2  Hinweis      NEU - goldZielProzent=0 bei goldAktiv=true neu erreichbar und undefiniert
T03-3  Hinweis      NEU - goldZiel ausserhalb 0..50 weiterhin still auf 7,5
```

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. S03-1 mit vollstaendiger Branchtabelle gegengeprueft,
  S03-2 mit gemessenem Round-Trip beider Feldklassen.
- Restrisiken:
  1. T03-1 - negatives rebalancingBand passiert ungeprueft, wenn Gold inaktiv
     ist; bei aktivem Gold wird derselbe Wert auf 25 korrigiert.
  2. T03-2 - goldZielProzent=0 bei aktivem Gold ist neu erreichbar; die Engine
     reicht den Wert durch, kein Akzeptanzkriterium legt das Verhalten fest.
  3. T03-3 - goldZiel ausserhalb 0..50 wird weiterhin still auf 7,5 gesetzt.
  4. S03-3 und S03-4 - stille Ersatzwerte bleiben als bewusst angenommene
     Restrisiken bestehen.
  5. S03-6 und S03-7 - dokumentierte Entscheidungen.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen
  Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Ein Nutzer aktiviert Gold und setzt das Ziel auf 0 Prozent, um die Position
  abzubauen. Der Wert kommt jetzt korrekt bis zur Engine durch, aber weder
  Fachentscheidung noch Engine legen fest, was "aktiv mit 0 Prozent Ziel"
  bedeutet. Je nach Auslegung entsteht ein vollstaendiger Goldverkauf, eine
  Dauerempfehlung zum Verkauf oder gar keine Reaktion - und weil die
  Nullgrenze als korrekt behoben gilt, wird die fehlende fachliche Definition
  dahinter nicht vermutet.
```

### Empfehlung

- T03-1 ist eine Zeile: `band < 0` auch im inaktiven Zweig pruefen.
- T03-2 verdient eine ausdrueckliche Fachentscheidung, bevor Slice 04 die
  Goldziele weiter anfasst; dort wurden bereits absolute Goldziele
  eingefuehrt, was dieselbe Semantik beruehrt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| U-03-01 | Nutzer | UI-/Engine-Bounds und Semantik von `targetEq=0` | Reader erhält 0; UI folgt Engine; Engine weist `targetEq=0` sichtbar ab | erledigt |
| REV-03-F01 | Gemini 2026-07-27 | `balance-reader.js` überschreibt `goldZielProzent = 0` mit `7.5%` | angenommen | erledigt; DOM- und Profil-Null durch Produktionstest abgesichert |
| REV-03-F02 | Gemini 2026-07-27 | `balance-reader.js` überschreibt `rebalancingBand = 0` mit `25%` | angenommen; `0` bedeutet Nulltoleranz, nicht Deaktivierung | erledigt; DOM- und Profil-Null durch Produktionstest abgesichert |
| REV-03-F03 | Gemini 2026-07-27 | `parseDisplayNumber` für String `"1.234"` konvertiert zu `1234` | als Displayparser-Fehler abgelehnt; zugehoerige Grenzgefahr ueber S03-2 angenommen | Displaysemantik beibehalten, Hidden-Writer korrigiert |
| S03-1 | Claude 2026-07-27 | bestaetigt REV-03-F01/F02 | angenommen | erledigt gemeinsam mit REV-03-F01/F02 |
| S03-2 | Claude 2026-07-27 | zwei DOM-Reader mit gegensaetzlicher Semantik; Hidden-Felder fragil | angenommen und zur konkreten Writerverletzung praezisiert | Hidden-Felder kanonisch geschrieben; Contract-Test ergaenzt |
| S03-3 | Claude 2026-07-27 | `parseDisplayNumber` liefert fuer `".5"`, `"1."` und `"50abc"` still `0` | als Restrisiko angenommen, keine Contract-Aenderung in Slice 3 | dokumentiert; vollstaendige Texte bleiben bewusst Pflicht |
| S03-4 | Claude 2026-07-27 | ungueltige Strategieeingaben werden durch den Default ersetzt | als Restrisiko angenommen, bestehender Test-/Fallbackvertrag bleibt | dokumentiert; sichtbare Ablehnung benoetigt eigene UX-Entscheidung |
| S03-5 | Claude 2026-07-27 | `SimulatorPortfolioInputError` sei auf dem Normalpfad unerreichbar | abgelehnt | Persistenzpfad normalisiert nicht vor Initialisierung; Erreichbarkeit getestet |
| S03-6 | Claude 2026-07-27 | HTML-`min`/`max` erzwingen keine Grenzen | kein Defekt gemaess Nutzerentscheidung | Engine bleibt verbindliche Validierungsgrenze |
| S03-7 | Claude 2026-07-27 | beide Parser akzeptieren Exponentialschreibweise | dokumentierter, aktuell erlaubter Zahlenvertrag | keine Codeaenderung ohne neue Fachentscheidung |
| T03-1 | Claude Re-Review 2026-07-27 | negatives `rebalancingBand` passiert ungeprueft, wenn Gold inaktiv ist (gemessen: -5 bleibt -5); bei aktivem Gold wird derselbe Wert auf 25 korrigiert | offen - Restrisiko | ausstehend |
| T03-2 | Claude Re-Review 2026-07-27 | `goldZielProzent=0` bei `goldAktiv=true` ist neu erreichbar; `engine/core.mjs` reicht den Wert durch, kein Akzeptanzkriterium legt das Verhalten fest | offen - Hinweis, Fachentscheidung empfohlen | ausstehend |
| T03-3 | Claude Re-Review 2026-07-27 | `goldZiel` ausserhalb 0..50 wird weiterhin still auf 7,5 gesetzt (gemessen: -5 und 60 ergeben 7,5) | offen - Hinweis | ausstehend |
