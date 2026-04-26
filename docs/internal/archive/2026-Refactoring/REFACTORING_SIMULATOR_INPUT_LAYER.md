# Refactoring: Simulator-Input-Layer gruppieren

Status: `[x]` umgesetzt

Backlog-Referenz: `docs/internal/REFACTORING_BACKLOG.md`, Punkt `6. Simulator-Input-Layer gruppieren`

Startdatum: 2026-04-23

## Ziel

`app/simulator/simulator-portfolio-inputs.js` soll von einer langen DOM-Lesefunktion zu einem gruppierten Input-Layer werden. `getCommonInputs()` bleibt als oeffentlicher Einstieg erhalten, fuehrt aber nur noch klar benannte Reader-Funktionen zusammen.

## Ausgangslage

Aktueller Hotspot:

- `getCommonInputs()` liest Tranchen, Renten, Partner, Witwenrente, Pflege, Dynamic-Flex, CAPE, 3-Bucket, Strategie und Ansparphase in einer Funktion.
- Legacy-Fallbacks sind direkt im DOM-Lesen versteckt.
- Neue UI-Felder muessen derzeit in einem grossen Block ergaenzt werden.

Aktuelle Baseline vor Code-Aenderung:

- `npm test` lief zuletzt erfolgreich mit 68 Testdateien und 1152/1152 Assertions.
- Fuer diesen Step sollen nach Code-Aenderungen mindestens die gezielten Simulator-Input-/Persistence-/3-Bucket-Tests laufen, danach die volle Suite.

## Nicht-Ziele

- Keine Aenderung des finalen Input-Shapes von `getCommonInputs()`.
- Keine Migration von localStorage-Keys.
- Keine fachliche Aenderung an Pflege-, Renten-, Dynamic-Flex- oder 3-Bucket-Logik.
- Keine Aenderung an `engine.js`, `dist/` oder Release-Artefakten.

## Schnittstellen-Regeln

- Reader-Funktionen lesen nur DOM/localStorage/window und liefern plain objects.
- Parser-Helfer sind moeglichst rein und separat testbar.
- Legacy-Fallbacks bleiben erhalten und werden im jeweiligen Reader sichtbar benannt.
- `getCommonInputs()` aggregiert nur noch die Rueckgaben der Reader.
- Keine Funktion soll mehr als eine Fachgruppe lesen.
- Keine grossen generischen Context-Objekte fuer diesen P1-Step.

## Geplante Modulstruktur

Minimaler erster Schnitt:

- `app/simulator/simulator-input-dom.js`
  - kleine DOM-Parser-Helfer wie `readNumber`, `readInt`, `readBool`, `readSelect`, `readDisplayNumber`
- `app/simulator/simulator-input-tranches.js`
  - `readTrancheInputs()`
- `app/simulator/simulator-input-pension.js`
  - `readPensionInputs()`
  - `readPartnerInputs()`
  - `readWidowOptions()`
- `app/simulator/simulator-input-care.js`
  - `readCareInputs()`
- `app/simulator/simulator-input-strategy.js`
  - `readDynamicFlexInputs()`
  - `readDecumulationInputs()`
  - `readStrategyInputs()`
  - `readAccumulationInputs()`

Falls der Schnitt zu kleinteilig wird, duerfen verwandte Reader zunaechst in weniger Dateien zusammengefasst werden. Wichtiger als Dateianzahl ist eine stabile, klare Fachgruppentrennung.

## Umsetzungsschritte

### Step 1: Baseline und Vertrag festhalten

Soll:

- Aktuellen Output-Shape von `getCommonInputs()` anhand der bestehenden Tests und Code-Nutzung notieren.
- Relevante Aufrufer pruefen, insbesondere `simulator-portfolio.js`, Monte-Carlo, Sweep, Auto-Optimize und Backtest.
- Gezielt pruefen, welche Legacy-Fallbacks erhalten bleiben muessen.

Ist:

- Output-Shape wurde anhand der bestehenden Nutzung beibehalten: `getCommonInputs()` bleibt der einzige oeffentliche Einstieg aus `simulator-portfolio-inputs.js`.
- Aufrufer bleiben unveraendert, weil `app/simulator/simulator-portfolio.js` weiter `getCommonInputs()` re-exportiert.
- Legacy-Fallbacks wurden in die jeweiligen Reader uebernommen:
  - P1-Fallbacks auf alte IDs wie `startAlter`, `geschlecht`, `startSPB`, `renteMonatlich`.
  - P2-Migration von `r2Brutto` Jahreswert auf `r2Monatsrente`.
  - Legacy-Decumulation-Modi normalisieren weiter auf `standard`.

### Step 2: DOM-Parser-Helfer einfuehren

Soll:

- Kleine Helper fuer DOM-Zugriffe einfuehren.
- Bestehende Default- und Fallback-Semantik nicht aendern.
- Helper so schreiben, dass fehlende DOM-Elemente wie bisher defensiv behandelt werden.

Ist:

- Umgesetzt in `app/simulator/simulator-input-dom.js`.
- Enthaltene Helper:
  - `getInputElement()`
  - `readValue()`
  - `readChecked()`
  - `readNumber()`
  - `readInt()`
  - `readDisplayNumber()`
  - `parseBoundedNumber()`
  - `readBoundedNumber()`

### Step 3: Tranche-Reader extrahieren

Soll:

- Profilverbund-Override und `depot_tranchen`-Fallback in `readTrancheInputs()` verschieben.
- Prioritaet unveraendert lassen: Profilverbund-Override vor localStorage, `__profilverbundPreferAggregates` beachten.

Ist:

- Umgesetzt in `app/simulator/simulator-input-tranches.js`.
- `readTrancheInputs()` erhaelt die bisherige Prioritaet:
  - Profilverbund-Override gewinnt vor localStorage.
  - `__profilverbundPreferAggregates` verhindert localStorage-Tranchen.
  - Parse-Fehler fallen defensiv auf `null` zurueck.

### Step 4: Renten-, Partner- und Witwen-Reader extrahieren

Soll:

- P1-Felder mit Legacy-ID-Fallbacks erhalten.
- P2-Migration `r2Brutto` Jahr zu `r2Monatsrente` Monat erhalten.
- Witwenrentenoptionen unveraendert normalisieren.

Ist:

- Umgesetzt in `app/simulator/simulator-input-pension.js`.
- Enthaltene Reader:
  - `readPensionInputs()`
  - `readPartnerInputs()`
  - `readWidowOptions()`
- Legacy-Fallbacks und P2-Migration sind durch `tests/simulator-input-readers.test.mjs` abgedeckt.

### Step 5: Pflege-Reader extrahieren

Soll:

- Pflegegrade, Dauergrenzen, Drift, Regionalzuschlag und Grade-1-Kompatibilitaetsfelder extrahieren.
- `normalizeCareDurationRange()` weiterverwenden.
- `SUPPORTED_PFLEGE_GRADES` als einzige Quelle fuer Pflegegrade behalten.

Ist:

- Umgesetzt in `app/simulator/simulator-input-care.js`.
- `readCareInputs()` liest Pflegegrade ueber `SUPPORTED_PFLEGE_GRADES` und nutzt weiter `normalizeCareDurationRange()`.
- Fehlende DOM-Felder werden defensiv behandelt.

### Step 6: Dynamic-Flex-, 3-Bucket-, Strategie- und Ansparphase-Reader extrahieren

Soll:

- Dynamic-Flex Defaults und Bounds erhalten.
- CAPE-Alias `marketCapeRatio` und `capeRatio` erhalten.
- 3-Bucket-Normalisierung ueber `STRATEGY_OPTIONS` erhalten.
- Strategie-Defaults und Ansparphasen-Transition unveraendert lassen.

Ist:

- Umgesetzt in `app/simulator/simulator-input-strategy.js`.
- Enthaltene Reader:
  - `readBasePortfolioInputs()`
  - `readDynamicFlexInputs()`
  - `readDecumulationInputs()`
  - `readStrategyInputs()`
  - `readAccumulationInputs()`
- Dynamic-Flex-Bounds, CAPE-Alias, 3-Bucket-Normalisierung und Ansparphasen-Transition sind durch Tests abgedeckt.

### Step 7: `getCommonInputs()` als Aggregator umbauen

Soll:

- Rueckgaben der Reader zusammenfuehren.
- Finalen Shape exakt kompatibel halten.
- Keine fachliche Umrechnung im Aggregator, ausser Zusammenfuehrung und Transition-Felder.

Ist:

- Umgesetzt in `app/simulator/simulator-portfolio-inputs.js`.
- Die Datei importiert nur noch die Fachgruppen-Reader und fuehrt deren Rueckgaben zusammen.
- Die fachliche Umrechnung liegt in den Readern; der Aggregator bleibt klein.

### Step 8: Tests ergaenzen und ausfuehren

Soll:

- Bestehende Tests ausfuehren:
  - `node tests/run-single.mjs simulator-3bucket-ui-e2e.test.mjs`
  - `node tests/run-single.mjs simulator-dynamic-flex-persistence.test.mjs`
  - `npm test`
- Wenn Parser-Helfer oder Reader separat exportiert werden, gezielte Tests fuer fehlende DOM-Elemente, Legacy-Fallbacks und Bounds ergaenzen.

Ist:

- Neuer Test: `tests/simulator-input-readers.test.mjs`.
- Gezielt ausgefuehrt:
  - `node tests/run-single.mjs tests/simulator-input-readers.test.mjs`
  - `node tests/run-single.mjs tests/portfolio.test.mjs`
  - `node tests/run-single.mjs tests/simulator-3bucket-ui-e2e.test.mjs`
  - `node tests/run-single.mjs tests/simulator-dynamic-flex-persistence.test.mjs`
- Vollstaendig ausgefuehrt:
  - `npm test`
  - Ergebnis: 69 Testdateien, 1177/1177 Assertions erfolgreich.

## Risiko-Checkliste

- [x] Finaler `getCommonInputs()`-Shape unveraendert.
- [x] Legacy-Fallbacks fuer P1/P2 bleiben erhalten.
- [x] Profilverbund-Override fuer Tranchen bleibt priorisiert.
- [x] Dynamic-Flex Bounds bleiben identisch.
- [x] 3-Bucket-Modus normalisiert weiter auf `standard` oder `3_bucket_jilge`.
- [x] Pflegegrade werden weiter aus `SUPPORTED_PFLEGE_GRADES` gelesen.
- [x] Fehlende DOM-Elemente verursachen keine neuen Crashes.

## Abschlussdokumentation

Nach Umsetzung ausfuellen:

- Abschlussdatum: 2026-04-23
- Commit: noch nicht erstellt
- Geaenderte Dateien:
  - `app/simulator/simulator-portfolio-inputs.js`
  - `docs/internal/REFACTORING_BACKLOG.md`
  - `docs/internal/REFACTORING_SIMULATOR_INPUT_LAYER.md`
  - `docs/internal/README.md`
- Neu angelegte Dateien:
  - `app/simulator/simulator-input-dom.js`
  - `app/simulator/simulator-input-tranches.js`
  - `app/simulator/simulator-input-pension.js`
  - `app/simulator/simulator-input-care.js`
  - `app/simulator/simulator-input-strategy.js`
  - `tests/simulator-input-readers.test.mjs`
- Entfernte/verschobene Logik:
  - DOM-Parsing, Tranche-Auswahl, Pension/Partner/Witwenrente, Pflege, Dynamic-Flex, Decumulation, Strategie und Ansparphase aus `getCommonInputs()` in Fachgruppen-Reader verschoben.
- Tests:
  - `node tests/run-single.mjs tests/simulator-input-readers.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/portfolio.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/simulator-3bucket-ui-e2e.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/simulator-dynamic-flex-persistence.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1177/1177 Assertions
- Offene Restpunkte:
  - Keine fuer diesen Refactoring-Step.
