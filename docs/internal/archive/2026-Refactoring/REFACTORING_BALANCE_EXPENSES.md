# Refactoring: Balance-Ausgaben-Check modularisieren

Status: `[x]` umgesetzt

Backlog-Referenz: `docs/internal/REFACTORING_BACKLOG.md`, Punkt `5. Balance-Ausgaben-Check modularisieren`

Startdatum: 2026-04-24

## Ziel

`app/balance/balance-expenses.js` soll von einem Mini-Monolithen zu einer Controller-Fassade werden. Storage, CSV-Parsing, Kennzahlen und DOM-Rendering werden in klar benannte Module getrennt. Die oeffentlichen Exporte und das Persistenzschema `balance_expenses_v1` bleiben kompatibel.

## Ausgangslage

Vor dem Refactoring enthaelt `balance-expenses.js` in einer Datei:

- localStorage-Schema und Store-Zugriffe
- CSV-Delimiter-Erkennung und Parsing
- Betragsnormalisierung
- Jahresstatistiken und Forecast-Logik
- Tabellenaufbau
- Detaildialog
- Event-Handling

Die Datei hatte ca. 704 Zeilen. Der bestehende Test `tests/balance-expenses.test.mjs` deckte die Nutzerpfade Import, Anzeige, Delete, Forecast und Jahreswechsel ab, testete die reinen Teilfunktionen aber nicht direkt.

## Nicht-Ziele

- Keine Aenderung am Storage-Key `balance_expenses_v1`.
- Keine Migration bestehender Ausgaben-Daten.
- Keine Aenderung der oeffentlichen Exporte aus `balance-expenses.js`.
- Keine fachliche Aenderung an Budgetampeln, Forecast, Soll/Ist oder CSV-Import.
- Keine UI-Polish-Aenderungen ausser der reinen Modultrennung.

## Schnittstellen-Regeln

- `balance-expenses.js` bleibt der einzige oeffentliche Einstieg fuer `balance-main.js` und Binder.
- Storage-Helfer kapseln localStorage und Jahres-/Monatscontainer.
- CSV-Helfer sind DOM- und Storage-frei.
- Metriken sind DOM- und Storage-frei.
- Renderer-Funktionen bekommen vorbereitete Daten und DOM-Refs, aber keinen direkten Storage-Zugriff.
- Das Persistenzschema bleibt:
  - `years[YYYY].months[1..12].profiles[profileId].categories`
  - `activeYear`

## Geplante Modulstruktur

- `app/balance/balance-expenses.js`
  - Controller/Fassade fuer Init, Event-Wiring, Import-/Delete-Flows und oeffentliche API.
- `app/balance/balance-expenses-storage.js`
  - `EXPENSES_STORAGE_KEY`
  - Store laden/speichern
  - Year-/Month-Container defensiv erzeugen
  - aktives Jahr lesen/setzen
- `app/balance/balance-expenses-csv.js`
  - CSV-Zeilen splitten
  - Delimiter erkennen
  - Betragsformate normalisieren
  - Kategorien aggregieren
- `app/balance/balance-expenses-metrics.js`
  - Summen, Median, Monats- und Jahreskennzahlen
  - Kategorieeintraege fuer Detailansicht sortieren
- `app/balance/balance-expenses-renderer.js`
  - Year-Select
  - Tabelle
  - Summary-Karten
  - Detaildialog

## Umsetzungsschritte

### Step 1: Storage auslagern

Soll:

- Storage-Key und defensive Store-Normalisierung aus `balance-expenses.js` entfernen.
- Year-/Month-Container weiter kompatibel erzeugen.
- Aktives Jahr weiter persistieren.

Ist:

- Umgesetzt in `app/balance/balance-expenses-storage.js`.
- Enthaltene Exporte:
  - `EXPENSES_STORAGE_KEY`
  - `createEmptyExpensesStore()`
  - `loadExpensesStore()`
  - `saveExpensesStore()`
  - `getExpensesYearData()`
  - `getExpensesMonthData()`
  - `setExpensesActiveYear()`
  - `resolveExpensesInitialYear()`
  - `listExpensesYears()`

### Step 2: CSV-Parsing auslagern

Soll:

- Delimiter-Erkennung, Quote-Splitting und Betragsnormalisierung DOM-frei machen.
- Deutsche und englische Zahlenformate weiter akzeptieren.
- Kategorieaggregation beibehalten.

Ist:

- Umgesetzt in `app/balance/balance-expenses-csv.js`.
- Enthaltene Exporte:
  - `splitCsvLine()`
  - `detectCsvDelimiter()`
  - `parseExpenseAmount()`
  - `parseCategoryCsv()`
- Direkte Tests fuer Quotes, DE-/EN-Zahlenformate und Aggregation wurden in `tests/balance-expenses.test.mjs` ergaenzt.

### Step 3: Metriken auslagern

Soll:

- Ausgaben-Summen, Median, Forecast und Soll/Ist ohne DOM/localStorage testbar machen.
- Bestehende Forecast-Regel erhalten:
  - 1 Datenmonat: Durchschnitt
  - ab 2 Datenmonaten: Median
- YTD-Soll weiter auf importierten Datenmonaten berechnen.

Ist:

- Umgesetzt in `app/balance/balance-expenses-metrics.js`.
- Enthaltene Exporte:
  - `computeSpent()`
  - `computeMedian()`
  - `sumMonthProfiles()`
  - `computeYearStats()`
  - `sortExpenseEntries()`
- Direkte Tests fuer `computeSpent()` und `computeYearStats()` wurden ergaenzt.

### Step 4: DOM-Rendering auslagern

Soll:

- Tabellenaufbau, Tabellen-Refresh, Summary und Detaildialog aus dem Controller entfernen.
- Renderer-Funktionen sollen vorbereitete Daten, DOM-Refs und Formatter erhalten.
- Budgetampeln, Delete-Button-Sichtbarkeit und Detaildialog unveraendert lassen.

Ist:

- Umgesetzt in `app/balance/balance-expenses-renderer.js`.
- Enthaltene Exporte:
  - `EXPENSE_MONTHS`
  - `renderExpensesYearSelect()`
  - `renderExpensesSummary()`
  - `renderExpensesTableStructure()`
  - `refreshExpensesTableValues()`
  - `renderExpensesDetails()`
- Bestehende UI-Pfadtests pruefen Import, Delete, Tabellenwerte, Forecast, YTD und Jahreswechsel weiter ueber die Controller-Fassade.

### Step 5: Controller-Fassade stabilisieren

Soll:

- `balance-expenses.js` auf Orchestrierung reduzieren.
- Oeffentliche Exporte unveraendert lassen:
  - `initExpensesTab(domRefs)`
  - `updateExpensesBudget({ monthlyBudget, annualBudget })`
  - `rollExpensesYear()`
- Event-Wiring dort belassen.

Ist:

- `balance-expenses.js` wurde auf ca. 251 Zeilen reduziert.
- Die Datei importiert Storage, CSV, Metriken und Renderer und bleibt einziger oeffentlicher Einstieg.
- Import-, Delete-, Detail- und Jahreswechsel-Flows bleiben ueber die bestehende Fassade erreichbar.

### Step 6: Tests und Referenzdoku aktualisieren

Soll:

- `tests/balance-expenses.test.mjs` um direkte Tests der neuen DOM-freien Module erweitern.
- `npm test` ausfuehren.
- Referenzdoku an den neuen Modulzuschnitt anpassen.

Ist:

- `tests/balance-expenses.test.mjs` testet jetzt zusaetzlich:
  - CSV-Quote-Splitting
  - DE-/EN-Betragsnormalisierung
  - CSV-Kategorieaggregation
  - Store-Container-Helfer
  - `computeSpent()`
  - `computeYearStats()`
- Aktualisiert:
  - `docs/reference/TECHNICAL.md`
  - `docs/reference/BALANCE_MODULES_README.md`
  - `docs/internal/REFACTORING_BACKLOG.md`

## Risiko-Checkliste

- [x] Storage-Key `balance_expenses_v1` bleibt unveraendert.
- [x] Public API aus `balance-expenses.js` bleibt unveraendert.
- [x] CSV-Import aggregiert Kategorien weiter.
- [x] Deutsche Betragsformate werden weiter korrekt geparst.
- [x] Forecast nutzt bei einem Datenmonat Durchschnitt und ab zwei Datenmonaten Median.
- [x] Soll/Ist basiert weiter auf importierten Datenmonaten.
- [x] Delete-Button bleibt nur bei vorhandenen Monatsdaten sichtbar und fokussierbar.
- [x] Jahresabschluss legt das Folgejahr an und erhaelt Vorjahresdaten.

## Abschlussdokumentation

- Abschlussdatum: 2026-04-24
- Commit: noch nicht erstellt
- Geaenderte Dateien:
  - `app/balance/balance-expenses.js`
  - `tests/balance-expenses.test.mjs`
  - `docs/internal/REFACTORING_BACKLOG.md`
  - `docs/internal/README.md`
  - `docs/reference/TECHNICAL.md`
  - `docs/reference/BALANCE_MODULES_README.md`
- Neu angelegte Dateien:
  - `app/balance/balance-expenses-storage.js`
  - `app/balance/balance-expenses-csv.js`
  - `app/balance/balance-expenses-metrics.js`
  - `app/balance/balance-expenses-renderer.js`
  - `docs/internal/REFACTORING_BALANCE_EXPENSES.md`
- Entfernte/verschobene Logik:
  - localStorage-Zugriffe und Container-Normalisierung aus `balance-expenses.js` nach `balance-expenses-storage.js`.
  - CSV-Splitting, Delimiter-Erkennung und Betragsnormalisierung nach `balance-expenses-csv.js`.
  - Ausgaben-, Median-, Forecast- und Soll/Ist-Kennzahlen nach `balance-expenses-metrics.js`.
  - Tabellen-, Summary-, Year-Select- und Detaildialog-Rendering nach `balance-expenses-renderer.js`.
- Tests:
  - `node tests/run-single.mjs tests/balance-expenses.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1177/1177 Assertions
- Offene Restpunkte:
  - Keine fuer diesen Refactoring-Step.
