# Refactoring: Simulator-Jahreslogik zerlegen

Status: `[x]` umgesetzt

Backlog-Referenz: `docs/internal/REFACTORING_BACKLOG.md`, Punkt `1. Simulator-Jahreslogik zerlegen`

Startdatum: 2026-04-24

## Ziel

`simulateOneYear()` in `app/simulator/simulator-engine-direct.js` soll schrittweise von einem grossen Inline-Monolithen zu einem Orchestrator werden. Die Zerlegung erfolgt in kleinen, testbaren Schritten ohne Aenderung an `engine.js` oder am oeffentlichen Export von `simulateOneYear()`.

## Ausgangslage

Vor diesem Refactoring hat `app/simulator/simulator-engine-direct.js` ca. 1.154 Zeilen. `simulateOneYear()` enthaelt u. a.:

- Markt- und Portfoliofortschreibung
- Ansparphase
- Renten- und Witwenrentenberechnung
- Engine-Input-Mapping
- 3-Bucket-Override und Bond-Refill
- Forced-Sale-Logik und Tax-Recompute
- Rueckgabe- und Logdatenaufbau

## Nicht-Ziele

- Keine Aenderung an `engine.js`.
- Keine Aenderung am `EngineAPI`-Vertrag.
- Keine fachliche Aenderung an Entnahme, Steuern, 3-Bucket oder Pflege.
- Kein grosses generisches Context-Objekt fuer alle Teilschritte.
- Keine Umstrukturierung von Monte-Carlo-Runnern in diesem Step.

## Schnittstellen-Regeln

- Jede extrahierte Funktion bekommt nur die Felder, die sie benoetigt.
- Mutierende Funktionen dokumentieren die Mutation im Namen oder Kommentar.
- Rueckgaben sind klein und zweckgebunden.
- Log-Building bleibt getrennt von Portfolio-Mutation und Engine-Input-Mapping.
- Neue Module bleiben DOM-frei.

## Geplante Modulstruktur

- `app/simulator/simulator-year-portfolio.js`
  - Renditen normalisieren.
  - Jahresrenditen auf Portfolio-Tranchen anwenden.
  - Marktfenster fuer Engine-Regime-Erkennung fortschreiben.
  - Portfolio-Bewertungen vor/nach Rendite liefern.
- `app/simulator/simulator-household-pension.js`
  - P1-/P2-Renten inklusive Startoffsets berechnen.
  - Witwenrenten fuer beide Personen einbeziehen.
  - Netto-Floor/Flex-Deckung durch Renten berechnen.
  - Folgerentenwerte fuer den naechsten State berechnen.
- `app/simulator/simulator-engine-input.js`
  - Adapter-kompatiblen Input-Kontext aufbauen.
  - Lokale Jahreswerte wie Liquiditaet, Alter, Rente, CAPE und Marktfenster explizit uebersteuern.
  - Detailtranchen fuer EngineAPI und nachgelagerte Simulatorpfade bereitstellen.
- `app/simulator/simulator-accumulation-year.js`
  - Ansparjahr-Erkennung kapseln.
  - Sparrate, Cash-Zins und Anspar-Rebalancing berechnen.
  - Shadow-Pension, naechsten State und Anspar-Logdaten fuer den fruehen Rueckgabepfad liefern.
- `app/simulator/simulator-tax-recompute.js`
  - Tax-Rohaggregate defensiv normalisieren.
  - Forced-Sale-/Refill-Rohaggregate skaliert addieren.
  - Finales `settleTaxYear()` fuer Simulator-Zusatzverkaeufe kapseln.
- `app/simulator/simulator-forced-sale.js`
  - Initiale Liquiditaetsdeckung vor Auszahlung ueber aktuelle Tranchen kapseln.
  - Payout-Fallback-Verkauf nach Auszahlung ueber aktuelle Tranchen kapseln.
  - Forced-Sale-Skalierung, Bond-Verkaufszaehlung und Unmet-Liquidity-Deltas liefern.
  - Fallback-Reduktion ueber FIFO-Tranchen als gemeinsam nutzbaren Helper bereitstellen.
- `app/simulator/simulator-bond-refill.js`
  - Bond-Ziel/Defizit und Refill-Threshold fuer gute 3-Bucket-Jahre berechnen.
  - Auto-Bond-Tranche anlegen und Equity-Verkauf in Bond-Puffer umschichten.
  - Bond-Refill-Deltas und Tax-Rohaggregat fuer Recompute liefern.
- `app/simulator/simulator-year-result.js`
  - Finalen Rueckgabe- und Logdatenaufbau kapseln.
  - Naechsten State, UI-Payload, Jahreslog und 3-Bucket-Logshape konsistent erzeugen.
  - Log-Building getrennt von Portfolio-Mutation und Engine-Input-Mapping halten.

## Umsetzungsschritte

### Step 1: Baseline und erste Schnittstellen

Soll:

- Aktuelle Groesse und Hotspots notieren.
- Erste Extraktion auf risikoarme, gut testbare Bereiche begrenzen.
- Gezielt danach Simulator-Tests ausfuehren.

Ist:

- Baseline: `app/simulator/simulator-engine-direct.js` ca. 1.154 Zeilen.
- Erste Scheibe gewaehlt:
  - Markt-/Portfoliofortschreibung.
  - Renten-/Haushaltsberechnung.

### Step 2: Markt- und Portfoliofortschreibung extrahieren

Soll:

- Renditen auf Aktien-/Bond- und Gold-Tranchen in ein DOM-freies Modul verschieben.
- Bisherige Bond-Return-Sonderbehandlung fuer 3-Bucket erhalten.
- `marketDataCurrentYear` und `resolvedCapeRatio` weiter identisch liefern.

Ist:

- Umgesetzt in `app/simulator/simulator-year-portfolio.js`.
- Enthaltene Exporte:
  - `readYearReturnRates()`
  - `applyAnnualReturnsToPortfolio()`
  - `buildCurrentYearMarketData()`
  - `buildNextMarketDataHist()`
- `applyAnnualReturnsToPortfolio()` mutiert explizit das uebergebene Portfolio, wie zuvor der Inline-Code.
- Direkte Tests fuer Aktien-/Bond-/Gold-Renditen und Marktfenster wurden in `tests/simulation.test.mjs` ergaenzt.

### Step 3: Renten-/Haushaltsberechnung extrahieren

Soll:

- P1/P2-Renten, Witwenrente, Rentensumme und Floor-/Flex-Deckung in ein DOM-freies Modul verschieben.
- Startoffsets und Partner-Steuerquote unveraendert behandeln.

Ist:

- Umgesetzt in `app/simulator/simulator-household-pension.js`.
- Enthaltener Export:
  - `calculateHouseholdPensionForYear()`
- Die Funktion berechnet P1/P2-Renten, Witwenrenten, Rentensumme, Floor-/Flex-Deckung und Folgerentenwerte.
- Direkte Tests fuer Startoffset-kompatible Renten, Partner-Steuerquote, Witwenrente und Indexierung wurden in `tests/simulation.test.mjs` ergaenzt.

### Step 4: Engine-Input-Mapping extrahieren

Soll:

- Aufbau des `EngineAPI.simulateSingleYear()`-Inputs aus `simulateOneYear()` verschieben.
- Adapter-kompatibles `buildInputsCtxFromPortfolio()` weiterverwenden.
- Explizite Overrides fuer lokale Liquiditaet, Brutto-Floor/Flex, Haushaltsrente, CAPE und Marktfenster erhalten.
- Detailtranchen weiterhin fuer Engine-Input und nachgelagerte Simulatorpfade bereitstellen.

Ist:

- Umgesetzt in `app/simulator/simulator-engine-input.js`.
- Enthaltener Export:
  - `buildSimulatorEngineInput()`
- Die Funktion liefert `{ engineInput, detailedTranches }` und bleibt DOM-frei.
- Direkter Test fuer Liquiditaets-Override, Alter, Brutto-Bedarfe, Rentenmapping, Gold-Ziel, Marktfenster und Detailtranchen wurde in `tests/simulation.test.mjs` ergaenzt.

### Step 5: Ansparphasen-Jahrespfad extrahieren

Soll:

- Ansparjahr-Erkennung aus dem Orchestrator auslagern.
- Sparratenindexierung, Cash-Zins, Ziel-Liquiditaet und Kaufverteilung auf Aktien/Gold erhalten.
- Shadow-Pension-Indexierung, naechsten State und Anspar-Logdaten unveraendert liefern.
- Portfolio-Mutation explizit im Modul dokumentieren.

Ist:

- Umgesetzt in `app/simulator/simulator-accumulation-year.js`.
- Enthaltene Exporte:
  - `isAccumulationYear()`
  - `simulateAccumulationYear()`
- `simulateAccumulationYear()` mutiert das uebergebene Portfolio wie zuvor der Inline-Code und liefert den vollstaendigen fruehen Rueckgabewert fuer Ansparjahre.
- Direkter Test fuer Sparratenindexierung, Cash-Zins, Beitrags-Tracking, Shadow-Pension und Anspar-Logregime wurde in `tests/simulation.test.mjs` ergaenzt.

### Step 6: Tax-Recompute extrahieren

Soll:

- Aufbau und Addition der Tax-Rohaggregate aus `simulateOneYear()` auslagern.
- Finales Settlement-Recompute nach Forced-Sale-/Bond-Refill-Pfaden kapseln.
- Mutationen an `actionResult` und `spendingNewState.taxState` explizit in einer Funktion buendeln.
- Verhalten ohne Zusatzverkaeufe beibehalten: bestehendes Settlement bleibt erhalten, wird aber mit `recomputedWithForcedSales: false` markiert.

Ist:

- Umgesetzt in `app/simulator/simulator-tax-recompute.js`.
- Enthaltene Exporte:
  - `buildTaxRawAggregate()`
  - `addTaxRawAggregate()`
  - `applySimulatorTaxRecompute()`
- `simulateOneYear()` importiert `settleTaxYear()` nicht mehr direkt.
- Direkte Tests fuer skalierte Aggregat-Addition, Recompute-Mutation, Steuerwert und `taxState` wurden in `tests/simulator-tax-settlement.test.mjs` ergaenzt.

### Step 7: Forced-Sale-Liquiditaetsdeckung extrahieren

Soll:

- Initialen Forced-Sale-Pfad vor Auszahlung aus `simulateOneYear()` verschieben.
- Aktuelle Tranchen statt stale `engineInput.detailledTranches` weiterverwenden.
- Liquiditaetsdelta, Bond-Verkaufsdelta, Unmet-Liquidity-Delta, Forced-Sale-Flag und Forced-Sale-Scale explizit zurueckgeben.
- Tax-Rohaggregate weiterhin nur fuer tatsaechlich ausgefuehrte Verkaeufe skaliert ergaenzen.
- Payout-Fallback-Verkauf und Bond-Refill bewusst noch nicht mitziehen.

Ist:

- Umgesetzt in `app/simulator/simulator-forced-sale.js`.
- Enthaltene Exporte:
  - `reduceAcrossTranches()`
  - `applyForcedSaleLiquidityCoverage()`
- `applyForcedSaleLiquidityCoverage()` mutiert das uebergebene Portfolio und `combinedTaxRawAggregate` wie zuvor der Inline-Code.
- Direkte Tests fuer FIFO-Fallback-Reduktion, Forced-Sale-Portfolio-Mutation, Liquiditaetsdelta und Tax-Aggregat wurden in `tests/simulator-tax-settlement.test.mjs` ergaenzt.

### Step 8: Bond-Refill-/3-Bucket-Nachsteuerung extrahieren

Soll:

- Bond-Refill-Pfad fuer gute 3-Bucket-Jahre aus `simulateOneYear()` verschieben.
- Auto-Bond-Tranche, Refill-Sale aus Equity-Tranchen und Cost-Basis-Erhoehung unveraendert erhalten.
- Bond-Refill-Brutto/Netto/Steuer als explizite Deltas zurueckgeben.
- Tax-Rohaggregate fuer den Recompute weiter ueber `combinedTaxRawAggregate` ergaenzen.

Ist:

- Umgesetzt in `app/simulator/simulator-bond-refill.js`.
- Enthaltener Export:
  - `applyBondRefillPostprocessing()`
- Die Funktion mutiert Portfolio und `combinedTaxRawAggregate` wie zuvor der Inline-Code.
- Direkte Tests fuer Auto-Bond-Anlage, Net-Refill, Cost-Basis, Equity-Verkauf und Recompute-Flag wurden in `tests/3bucket-refill.test.mjs` ergaenzt.

### Step 9: Payout-Fallback-Verkauf extrahieren

Soll:

- Payout-Fallback nach regulaerer Auszahlung aus `simulateOneYear()` verschieben.
- FIFO-Reduktion aus `simulator-forced-sale.js` wiederverwenden.
- 3-Bucket-Bad-Year-Bond-Schutz, Ruin-Erkennung und Unmet-Liquidity-Deltas unveraendert erhalten.

Ist:

- Umgesetzt in `app/simulator/simulator-forced-sale.js`.
- Enthaltener zusaetzlicher Export:
  - `applyPayoutFallbackSale()`
- Die Funktion mutiert die uebergebenen Portfolio-Tranchen wie zuvor der Inline-Code.
- Direkter Test fuer erfolgreiche Floor-Deckung per Payout-Fallback wurde in `tests/simulator-tax-settlement.test.mjs` ergaenzt.

### Step 10: Rueckgabe- und Logdatenaufbau extrahieren

Soll:

- Finalen Return-Block aus `simulateOneYear()` verschieben.
- UI-Payload, `newState`, `logData`, 3-Bucket-Felder und Portfolio-Bewertungen unveraendert liefern.
- Log-Building als eigenen DOM-freien Builder von Mutationspfaden trennen.

Ist:

- Umgesetzt in `app/simulator/simulator-year-result.js`.
- Enthaltener Export:
  - `buildSimulatorYearResult()`
- Die Funktion baut den vollstaendigen finalen Rueckgabewert fuer Rentenphasenjahre.
- Direkter Test fuer State-Inflation, effektive Entnahme und 3-Bucket-Logshape wurde in `tests/simulation.test.mjs` ergaenzt.

### Step 11: Tests und Doku

Soll:

- Gezielt ausfuehren:
  - `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs`
  - `node tests/run-single.mjs tests/3bucket-refill.test.mjs`
  - `node tests/run-single.mjs tests/simulator-headless.test.mjs`
  - `node tests/run-single.mjs tests/simulation.test.mjs`
- Danach `npm test`.
- Backlog und Referenzdoku aktualisieren.

Ist:

- Gezielt ausgefuehrt:
  - `node tests/run-single.mjs tests/simulation.test.mjs`
  - `node tests/run-single.mjs tests/3bucket-refill.test.mjs`
  - `node tests/run-single.mjs tests/simulator-headless.test.mjs`
  - `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs`
- Vollstaendig ausgefuehrt:
  - `npm test`

## Risiko-Checkliste

- [x] `simulateOneYear()`-Signatur bleibt unveraendert.
- [x] Portfolio-Renditen bleiben fuer Aktien/Bonds/Gold identisch.
- [x] CAPE-Alias-Logik bleibt identisch.
- [x] P1-/P2-Rentenstartoffsets bleiben identisch.
- [x] Witwenrentenfelder bleiben identisch.
- [x] Engine-Input-Overrides fuer Liquiditaet, Alter, Brutto-Bedarfe, Rente, CAPE und Marktfenster bleiben identisch.
- [x] Ansparphase bleibt frueher Rueckgabepfad ohne Engine-Aufruf.
- [x] Sparratenindexierung, Cash-Zins und Shadow-Pension bleiben identisch.
- [x] Tax-Recompute nach Forced-Sale-/Refill-Rohaggregaten bleibt identisch.
- [x] No-Forced-Sale-Pfad behaelt Engine-Steuer bei und markiert `recomputedWithForcedSales: false`.
- [x] Initiale Forced-Sale-Liquiditaetsdeckung mutiert Portfolio und Tax-Aggregat identisch.
- [x] FIFO-Fallback-Reduktion bleibt wiederverwendbar fuer Payout-Fallback.
- [x] Bond-Refill legt Auto-Bond-Tranche an und erhoeht MarketValue/CostBasis identisch.
- [x] Bond-Refill ergaenzt Tax-Rohaggregate fuer den finalen Recompute.
- [x] Payout-Fallback-Verkauf deckt fehlenden Floor weiter ueber aktuelle Tranchen.
- [x] Finaler Rueckgabe- und Logdatenaufbau ist von Portfolio-Mutation getrennt.
- [x] Bestehende Simulator-Tests bleiben gruen.

## Abschlussdokumentation

- Abschlussdatum: 2026-04-24
- Commit: noch nicht erstellt
- Geaenderte Dateien:
  - `app/simulator/simulator-engine-direct.js`
  - `app/simulator/simulator-forced-sale.js`
  - `tests/simulation.test.mjs`
  - `tests/simulator-tax-settlement.test.mjs`
  - `docs/internal/REFACTORING_BACKLOG.md`
  - `docs/internal/README.md`
  - `docs/internal/REFACTORING_SIMULATOR_YEAR_LOGIC.md`
  - `docs/reference/TECHNICAL.md`
  - `docs/reference/SIMULATOR_MODULES_README.md`
- Neu angelegte Dateien:
  - `app/simulator/simulator-year-portfolio.js`
  - `app/simulator/simulator-household-pension.js`
  - `app/simulator/simulator-engine-input.js`
  - `app/simulator/simulator-accumulation-year.js`
  - `app/simulator/simulator-tax-recompute.js`
  - `app/simulator/simulator-forced-sale.js`
  - `app/simulator/simulator-bond-refill.js`
  - `app/simulator/simulator-year-result.js`
- Entfernte/verschobene Logik:
  - Jahresrenditen, CAPE-/Marktfenster-Fortschreibung und Markt-History-Aufbau nach `simulator-year-portfolio.js`.
  - P1-/P2-Renten, Witwenrenten, Rentensumme, Floor-/Flex-Netting und Folgerentenwerte nach `simulator-household-pension.js`.
  - EngineAPI-Input-Mapping inklusive lokaler Overrides und Detailtranchen nach `simulator-engine-input.js`.
  - Ansparjahr-Erkennung, Sparratenindexierung, Cash-Zins, Anspar-Rebalancing, Shadow-Pension und Anspar-Logdaten nach `simulator-accumulation-year.js`.
  - Tax-Rohaggregat-Normalisierung, skalierte Aggregat-Addition und finales Settlement-Recompute nach `simulator-tax-recompute.js`.
  - Initiale Forced-Sale-Liquiditaetsdeckung inklusive aktueller Tranchen, Forced-Sale-Scale und FIFO-Fallback nach `simulator-forced-sale.js`.
  - Bond-Refill-/3-Bucket-Nachsteuerung inklusive Auto-Bond-Tranche, Equity-Verkauf und Refill-Deltas nach `simulator-bond-refill.js`.
  - Payout-Fallback-Verkauf nach Auszahlung nach `simulator-forced-sale.js`.
  - Finaler Rueckgabe-, State- und Logdatenaufbau nach `simulator-year-result.js`.
- Tests:
  - `node --check app/simulator/simulator-engine-direct.js` erfolgreich
  - `node --check app/simulator/simulator-forced-sale.js` erfolgreich
  - `node --check app/simulator/simulator-year-result.js` erfolgreich
  - `node tests/run-single.mjs tests/simulation.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/3bucket-refill.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/simulator-headless.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1217/1217 Assertions
- Offene Restpunkte:
  - Keine offenen P0-Slices innerhalb von `simulateOneYear()`; optional bleibt eine spaetere Gesamt-Review auf weitere Kleinschnitt-Optimierung.
