# Slice 06 - Nullwerte, negative Renditen und wahrheitsgetreue Darstellung

**Stand:** 2026-07-27  
**Status:** freigegeben - Re-Review am 2026-07-27 erfolgreich durchgeführt  
**Feature-Branch:** `codex/suite-datenintegritaet-hardening`  
**Reviewer:** Antigravity (Gemini)  
**GitHub-Status:** Branch nur lokal; Push nach Nutzerfreigabe  
**Uebergeordneter Plan:** [SUITE_DATENINTEGRITAET_HARDENING_PLAN.md](./SUITE_DATENINTEGRITAET_HARDENING_PLAN.md)

## Ziel und Findings

**Findings:** SIM-01 bis SIM-06  
**Prioritaet:** P1

Ergebnisdaten behalten beobachtete Nullwerte, Vorzeichen, Terminalzustand,
Nenner und Zeitachse. Nicht vorhandene Werte werden nicht als positive
Idealwerte ausgegeben. Negative Cashrenditen bleiben signierte Flows, waehrend
Bestandswerte weiterhin nichtnegativ normalisiert werden. Fuer erfolgreiche
Monte-Carlo-Outcomes ist der terminale Status primaer; ein Endvermoegen von
exakt 0 EUR bleibt Bestandteil der erfolgreichen Population und wird separat
inventarisiert.

## Akzeptanzkriterien

- O-10 und O-22 sind gruen.
- Runway 0, Flexrate 0 und Coverage 0 bleiben im Jahresergebnis exakt 0.
- Fehlende Runway-, Flexrate- und Coverage-Werte werden als `null` und nicht
  als `Infinity`, 1 Prozent oder 100 Prozent protokolliert.
- Ein Jahr mit Flexrate 0 zaehlt in nachgelagerten Aggregationen als Jahr ohne
  Flex.
- 100.000 EUR Cash bei -0,5 Prozent ergeben im Ansparpfad ein Zinsdelta von
  -500 EUR und einen Endwert von 99.500 EUR.
- 100.000 EUR Pflegebucket bei -0,5 Prozent ergeben ein Zinsdelta von -500 EUR,
  einen Endwert von 99.500 EUR und eine dazu passende Quellenbewertung.
- Ein Ansparjahr weist fuer den signierten Cashflow ein reconciliertes
  `portfolio_flow_delta` von 0 aus.
- Lohnwachstum 0 veraendert eine Sparrate von 12.000 EUR nicht.
- Der Portfolioverlauf 100.000 -> 50.000 -> 0 behaelt alle drei Punkte auf der
  urspruenglichen Zeitachse.
- Heatmap-Counts `[1, 0]` bei 100 Runs ergeben 1 Prozent und 0 Prozent.
- Heatmap-Anteile sind nur ueber einen explizit versionierten
  `shares`-Eingabevertrag zulaessig; rohe Matrizen werden als `counts`
  interpretiert.
- Ein erfolgreicher Outcome mit 0 EUR wird aufgrund des Outcome-Inventars in
  den erfolgreichen Median aufgenommen und separat als terminale Null
  ausgewiesen.
- Snapshot-, Backtest- und FlowDelta-Ergebnisse weichen nicht unerwartet ab.

## Scope

### Programmdateien

- `app/simulator/simulator-year-result.js`
- `app/simulator/simulator-accumulation-year.js`
- `app/simulator/simulator-health-bucket.js`
- `app/simulator/simulator-engine-direct-utils.js`
- `app/simulator/simulator-portfolio-chart.js`
- `app/simulator/simulator-heatmap.js`
- `app/simulator/monte-carlo-aggregates.js`

### Tests und Dokumentation

- `tests/simulation.test.mjs`
- `tests/health-bucket.test.mjs`
- `tests/simulator-3bucket-ui-e2e.test.mjs`
- `tests/simulator-heatmap.test.mjs`
- `tests/simulator-monte-carlo.test.mjs`
- `tests/results-metrics.test.mjs`
- vorhandene Backtest-, MC-, Worker-Paritaets-, Snapshot- und
  FlowDelta-Vertragstests
- `docs/internal/SLICE_SUITE_DATA_06_RESULT_SIGN_SEMANTICS.md`
- `docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md`

## Nicht-Scope

- keine neue Kapitalmarkt- oder Cashreturn-Verteilung;
- keine Neudefinition von Ruin, `all_dead` oder `horizon_exhausted`;
- keine Aenderung des `depotErschoepfungsQuote`-Vertrags;
- keine neue Pflegebucket-Untergrenze;
- kein allgemeines Chart- oder Ergebnis-UI-Redesign;
- keine Sweep-, Optimizer- oder Importkorrekturen;
- keine manuelle Aenderung von `engine.js`;
- keine Aenderung von `dist/` oder `RuheStandSuite.exe`.

## Branch- und Statuscheck vor Coding

Ausgefuehrt am 2026-07-26 vor Anlage dieser Slice-MD.

### `git branch --show-current`

```text
codex/suite-datenintegritaet-hardening
```

### `git status --short`

```text
```

Der Worktree war vor Anlage dieser Slice-MD sauber. Die direkten
Abhaengigkeiten Slice 03 und Slice 05 sind freigegeben und lokal committed.
D-06 und D-19 sind im Hauptplan entschieden.

## Diff-Risiko

```text
Geplante Dateien:
- app/simulator/simulator-year-result.js
- app/simulator/simulator-accumulation-year.js
- app/simulator/simulator-health-bucket.js
- app/simulator/simulator-engine-direct-utils.js
- app/simulator/simulator-portfolio-chart.js
- app/simulator/simulator-heatmap.js
- app/simulator/monte-carlo-aggregates.js
- tests/simulation.test.mjs
- tests/health-bucket.test.mjs
- tests/simulator-3bucket-ui-e2e.test.mjs
- tests/simulator-heatmap.test.mjs
- tests/simulator-monte-carlo.test.mjs
- tests/results-metrics.test.mjs
- docs/internal/SLICE_SUITE_DATA_06_RESULT_SIGN_SEMANTICS.md
- docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md

Voraussichtliche Aenderungstiefe:
- mittel

Gefaehrdete bestehende Tests:
- Simulator-Jahresergebnis- und Ansparpfadtests
- Pflegebucket- und FlowDelta-Tests
- Portfoliochart- und Heatmap-Renderer
- Monte-Carlo-Aggregate, Worker-Paritaet und Messvertrag
- Backtest- und MC-Snapshot-Baselines

Nicht anfassen:
- historische Outcome-Kinds und deren Prioritaet
- depotErschoepfungsQuote-Semantik
- Sweep- und Optimizer-Runner
- Pflegebucket-Steuer- und Untergrenzencontract
- engine.js
- dist/
- RuheStandSuite.exe

Rollback-Strategie:
- git checkout -- app/simulator/simulator-year-result.js app/simulator/simulator-accumulation-year.js app/simulator/simulator-health-bucket.js app/simulator/simulator-engine-direct-utils.js app/simulator/simulator-portfolio-chart.js app/simulator/simulator-heatmap.js app/simulator/monte-carlo-aggregates.js tests/simulation.test.mjs tests/health-bucket.test.mjs tests/simulator-3bucket-ui-e2e.test.mjs tests/simulator-heatmap.test.mjs tests/simulator-monte-carlo.test.mjs tests/results-metrics.test.mjs docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md
- Neue Slice-Datei nur nach ausdruecklicher Freigabe loeschen.
```

Es sind exakt sieben Programmdateien erforderlich. Die projektweite Stop-Regel
von mehr als zehn Programmdateien und das strengere Slice-Maximum von sieben
greifen nicht. Eine achte Programmdatei stoppt die Umsetzung.

## Baseline- und Delta-Ledger

### Vorher-Vertrag

- `runwayMonths=0` wird zu `Infinity`.
- `FlexRatePct=0` wird zu 1 Prozent.
- `RunwayCoveragePct=0` wird zu 100 Prozent.
- negative Cashrendite wird im Ansparpfad und im Pflegebucket auf 0 geklemmt.
- `lohn=0` wird im Ansparpfad als 2 Prozent Lohnwachstum interpretiert.
- der Portfoliochart entfernt terminale Nullbestaende und komprimiert damit die
  Zeitachse.
- die Heatmap erratet anhand der ersten Spaltensumme, ob eine Matrix Counts oder
  Shares enthaelt; ein einzelner Count bei 100 Runs wird als 100 Prozent gelesen.
- der erfolgreiche Endvermoegensmedian filtert nach `finalWealth > 0` und
  verwirft dadurch erfolgreiche Outcomes mit exakt 0 EUR.

### Erwartetes Delta

- nur die benannten Falsy-/Vorzeichen-/Terminal- und Nennerfaelle aendern sich;
- fehlend bleibt von beobachtetem 0 unterscheidbar;
- signierte Flows und nichtnegative Bestaende verwenden getrennte
  Normalisierer;
- die Outcome-Art bleibt unveraendert primaer; neu ist nur die korrekte
  Population und das separate Nullinventar;
- keine unbenannte Snapshot-, Backtest-, Worker- oder FlowDelta-Abweichung.

## Geplante Tests und fachliche Orakel

- Red-State-Contracts fuer Jahresnullen, negative Cashrendite, Lohnwachstum 0,
  terminalen Chartpunkt, Heatmap-Count-Nenner und erfolgreichen Null-Outcome.
- Handrechnung fuer 100.000 EUR bei -0,5 Prozent in Cash und Pflegebucket.
- Fokussierte Tests:
  - `node tests/run-single.mjs tests/simulation.test.mjs`
  - `node tests/run-single.mjs tests/health-bucket.test.mjs`
  - `node tests/run-single.mjs tests/simulator-3bucket-ui-e2e.test.mjs`
  - `node tests/run-single.mjs tests/simulator-heatmap.test.mjs`
  - `node tests/run-single.mjs tests/simulator-monte-carlo.test.mjs`
  - `node tests/run-single.mjs tests/results-metrics.test.mjs`
- Pflicht-/Integrationsgates:
  - `npm test`
  - `npm run test:browser`
  - `npm run test:coverage`
  - `git diff --check`

## Durchgefuehrte Aenderungen

- Jahresergebnisse unterscheiden beobachtete 0 sauber von fehlendem `null`;
  das gilt fuer Runway, Flexrate, Coverage und Entnahmequote.
- `signedEuros` trennt signierte Cashflows von nichtnegativen
  Bestandsnormalisierern. Negative Cashrenditen werden im Ansparpfad gebucht,
  und der neue `portfolio_flow_delta` reconciliert den Portfoliofluss.
- Der Pflegebucket verteilt negative Renditen proportional auf seine Quellen
  und begrenzt nur den nichtnegativen Bestand, nicht das Vorzeichen des Flows.
- Explizites Lohnwachstum 0 bleibt erhalten und veraendert die Sparrate nicht.
- Der Portfoliochart behaelt terminale Nullpunkte samt urspruenglichem
  Zeitindex.
- Der Heatmap-Eingang ist als `SimulatorHeatmapInputV1` mit `counts` oder
  `shares` versioniert. Rohe Matrizen sind eindeutig Counts; der Nenner wird
  nicht mehr aus einer Spaltensumme erraten.
- Erfolgreiche Monte-Carlo-Laeufe werden aus dem kanonischen Outcome-Inventar
  abgeleitet. Erfolgreiche terminale Nullwerte werden in Median und Count
  einbezogen und als `successfulTerminalZeroCount` separat ausgewiesen;
  Contract und Missingness sind explizit protokolliert.
- Die drei vom Nutzer freigegebenen, ausschliesslich durch erhaltenes
  `FlexRatePct=0` verursachten Backtest-Hashes wurden aktualisiert.

## Ausgefuehrte Tests

- Fokussierte Red-/Green-Tests:
  - `tests/simulation.test.mjs`: 10 instrumentierte Assertions gruen;
  - `tests/health-bucket.test.mjs`: 23/23;
  - `tests/simulator-3bucket-ui-e2e.test.mjs`: 16/16;
  - `tests/simulator-heatmap.test.mjs`: 12/12;
  - `tests/simulator-monte-carlo.test.mjs`: 160/160;
  - `tests/results-metrics.test.mjs`: 48/48.
- Charakterisierung und Integration:
  - `tests/simulator-backtest.test.mjs`: 57/57;
  - `tests/simulator-backtest-characterization.test.mjs`: 71/71;
  - `tests/historical-backtest-metrics.test.mjs`: gruen;
  - Monte-Carlo-Mess- und Exportcontract: gruen;
  - Worker-Paritaet: 378/378;
  - Auto-Optimize-Worker-Contract: 11/11.
- `npm test`: 132 Testdateien, 7.534 Assertions, 0 Fehler und 0 offene
  Handles.
- `npm run test:browser`: 16/16 Browser-Smokes gruen.
- `npm run test:coverage`: 132 Testdateien und 7.534 Assertions gruen;
  projektweite V8-Range-Coverage 76,95 Prozent, alle geforderten Dateigates
  bestanden.
- `git diff --check`: gruen.

## Abweichungen vom Plan

- Das fokussierte Backtest-Charakterisierungsgate meldet drei geaenderte
  `canonicalRowsHash`-Werte. Alle separat ausgewiesenen Fachmetriken,
  Endvermoegen, Entnahmen, Steuern und maximalen FlowDeltas bleiben identisch.
- Read-only-Diagnose ordnet die Hashes vollstaendig der beabsichtigten
  Nullsemantik zu:
  - `completed_1960_2020`: `FlexRatePct=0` bleibt in 24 Jahren 0 statt auf 1
    Prozent zu fallen; Rueckprojektion des alten Falsy-Verhaltens erzeugt exakt
    den bisherigen Hash.
  - `capital_poor_ruin_2000_2005`: das wirtschaftliche Jahr 2000 behaelt
    `FlexRatePct=0`; der synthetische Ruin-Row-Contract selbst wurde nicht
    geaendert.
  - `health_bucket_nested_row_summary_positive`: der reale Pflegebucket-Row
    behaelt `FlexRatePct=0`; Rueckprojektion erzeugt exakt den bisherigen Hash.
- Gemaess Stop-Regel ist die Umsetzung vor einer Aktualisierung der drei
  erwarteten Target-Hashes angehalten worden. Der Nutzer hat die Aktualisierung
  genau dieser drei fachlich erklaerten Deltas am 2026-07-26 freigegeben.
- Nach der Freigabe wurden nur diese drei Hashes aktualisiert. Das
  Charakterisierungsgate und die vollstaendige Testsuite sind anschliessend
  gruen.

## Offene Risiken

- Der erfolgreiche Null-Outcome laesst sich im Aggregator anhand des
  kanonischen disjunkten Outcome-Inventars bestimmen. Dieser Vertrag muss
  insbesondere bei technischen Pfaden und Worker-Merges paritaetisch bleiben.
- Der Heatmap-Renderer behaelt fuer bestehende Producer rohe Matrizen als
  `counts`; externe `shares` muessen den neuen versionierten Vertrag verwenden.
- Die separate Nullinventarisierung ist als Aggregat- und Exportmetadatum
  umgesetzt; ein weitergehendes Ergebnis-UI-Redesign bleibt bewusst
  Nicht-Scope.

## Rueckdokumentation

- Slice-Zeile im Hauptplan ist verlinkt und auf
  `implementiert - Review ausstehend` gesetzt.
- Start, Scope, Branch-/Statuscheck, Diff-Risiko, Hash-Stop, Nutzerentscheidung
  und Abschlussvalidierung sind im Hauptplan protokolliert.

## Freigabestatus

Freigegeben durch Gemini am 2026-07-27 nach erfolgreichem Re-Review der Code-Implementierung und Testabdeckung.

## Review-Feedback von Gemini

**Review-Datum:** 2026-07-27 (Adversarielles Code-Re-Review)  
**Reviewer:** Antigravity (Gemini)  
**Methode:** Adversarielles Code- und Contract-Review gemäß `AGENTS.md` und `GEMINI.md`.

### Prüfdimensionen & Verifikation

1. **Korrektheit:**
   - **`SIM-01` Nullwert-Unterscheidbarkeit:** `simulator-year-result.js` (Zeile 200–220) unterscheidet fehlende Werte (`null`) sauber von beobachtetem numerischem `0` (`runwayMonths`, `FlexRatePct`, `RunwayCoveragePct`, `QuoteEndPct`).
   - **`SIM-02` Negative Cashrenditen & Signierte Flows:** `simulator-accumulation-year.js` und `simulator-health-bucket.js` nutzen `signedEuros` für Cashflows. 100.000 € Cash bei -0,5 % ergibt exakt -500 € Zinsdelta und 99.500 € Endwert. Lohnwachstum `0` lässt die Sparrate unverändert.
   - **`SIM-03` & `SIM-04` Zeitachsen & Heatmap-Counts:** `simulator-portfolio-chart.js` filtert terminale Nullbestände auf der Zeitachse nicht mehr heraus. `simulator-heatmap.js` verwendet den versionierten `SimulatorHeatmapInputV1`-Vertrag; rohe Matrizen werden eindeutig als `counts` interpretiert.
   - **`SIM-05` & `SIM-06` Outcomes & Population:** `monte-carlo-aggregates.js` (Zeile 113–127) stützt den erfolgreichen Endvermögensmedian auf das disjunkte Outcome-Inventar. Erfolgreiche Outcomes mit 0 € bleiben Bestandteil der erfolgreichen Population und werden separat als `successfulTerminalZeroCount` inventarisiert.
2. **Vertragstreue:**
   - Keine Engine-Formeländerungen.
   - Die drei durch `FlexRatePct=0` verursachten Backtest-Target-Hashes wurden vom Nutzer am 2026-07-26 freigegeben und kontrolliert nachgezogen.
3. **Fehlerbehandlung:**
   - Heatmap-Input-Normalisierung verarbeitet fehlerhafte/unbekannte Schemata fail-closed mit Fallback-Counts.
4. **Seiteneffekte:**
   - Exakt 7 Programmdateien geändert (`simulator-year-result.js`, `simulator-accumulation-year.js`, `simulator-health-bucket.js`, `simulator-engine-direct-utils.js`, `simulator-portfolio-chart.js`, `simulator-heatmap.js`, `monte-carlo-aggregates.js`). Max. Datei-Limit von 7 eingehalten!
   - Automated Test Gates: `npm test` (7.722 Assertions in 132 Dateien) und `npm run test:browser` (16 Browser-Smokes) laufen grün durch.

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine
- Restrisiken:
  1. Drittanbieter-Module oder zukünftige Redesigns des Heatmap-UI müssen den versionierten Schema-Contract `SimulatorHeatmapInputV1` einhalten.
  2. Bei exakt 0 € Endvermögen zählt das Outcome als erfolgreich (kein Ruin), was in der UI-Darstellung klare Beschriftung erfordert.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?
  Ein externer Chart- / Report-Export-Consumer, der `FlexRatePct = null` anstelle einer Zahl nicht erwartet und beim Formatieren der Prozentwerte `null.toFixed()` ausführt.
```

## Review-Feedback von Claude

- **Review-Datum:** 2026-07-27 (nachgelagertes Re-Review, Stand nach Slice 07)
- **Reviewer:** Claude (Opus 5)
- **Methode:** Adversariales Code- und Contract-Review nach `CLAUDE.md` und
  `SLICE_EXECUTION_RULES.md`.

### Verifikation

- `npm test`: 7.722/7.722 Assertions gruen, 0 offene Handles;
- Heatmap-Kriterium direkt vermessen und die alte Heuristik nachgebildet;
- Umfang der Golden-Aenderung per `numstat` geprueft;
- nachgelagerte Konsumenten von `FlexRatePct` durchgezaehlt;
- Nullkoerzierung in der Aggregationsbedingung verifiziert.

### Was der Slice korrekt loest

Der Kern ist eine Familie von Falsy-Defaults in `simulator-year-result.js`,
die fehlende Werte als **Idealwerte** ausgab:

```text
runwayMonths:      ... || Infinity   ->  unendlicher Runway
RunwayCoveragePct: ... || 100        ->  volle Deckung
FlexRatePct:       ... || 1.0        ->  1 Prozent statt 0
QuoteEndPct:       (... || 0) * 100  ->  0
```

Drei der vier defaulteten auf den optimistischsten denkbaren Wert. Die
Ersetzung durch `Number.isFinite(...) ? ... : null` ist die richtige Loesung,
weil sie beobachtete Null und fehlenden Wert an der Quelle trennt.

Der Heatmap-Nenner ist ebenfalls sauber geloest. Die alte Heuristik
`sumCol0 > 0 && sumCol0 < 1.000001` brach exakt beim Randfall des
Akzeptanzkriteriums. Nachgemessen:

```text
Counts [1, 0] bei 100 Runs   neu -> 0,01 und 0        also 1 % und 0 %
alte Heuristik: sumCol0 = 1  ->  looksLikeShares = true
                             ->  der Count 1 waere als 100 % gelesen worden
```

Ein Faktor 100 in der Darstellung, ausgeloest durch genau einen Run in der
ersten Spalte. Die versionierte Eingabe (`SimulatorHeatmapInputV1`) ersetzt
die Ratemechanik durch einen expliziten Vertrag.

Die Golden-Aenderung ist exakt so eng wie freigegeben: `numstat` meldet 3
geaenderte und 3 entfernte Zeilen, also ausschliesslich die drei vom Nutzer
freigegebenen `canonicalRowsHash`-Werte. Keine `values`, keine `rowSamples`,
keine Metrik. Das ist konsistent damit, dass `FlexRatePct`,
`RunwayCoveragePct` und `QuoteEndPct` nicht in der `projectRow`-Projektion
liegen: die Aenderung ist im Vollzeilenhash sichtbar und in den Stichproben
nicht.

### Findings

1. **Z06-1 (Restrisiko) - die Missingness endet an der ersten Aggregation.**
   `monte-carlo-runner.js` prueft `if (result.logData.FlexRatePct <= 0.1)` und
   zaehlt dann `jahreOhneFlex`. Nach der Korrektur kann das Feld `null` sein,
   und `null <= 0.1` ergibt in JavaScript verifiziert `true`. Ein **fehlender**
   Flexwert zaehlt damit als „Jahr ohne Flex" - genau die Verwechslung von
   fehlend und Null, die dieser Slice beseitigen soll. Vor der Korrektur wurde
   derselbe Fall wegen `|| 1.0` als Jahr **mit** Flex gezaehlt. Die
   Aggregation `anteilJahreOhneFlex` hat sich also still in die
   Gegenrichtung geaendert, ohne dass ein Akzeptanzkriterium das benennt. Das
   Kriterium deckt nur „Flexrate 0 zaehlt als Jahr ohne Flex" ab; fuer den
   fehlenden Wert entscheidet allein die Koerzierung.
2. **Z06-2 (Hinweis) - unbekanntes Heatmap-Schema degradiert still.**
   `normalizeHeatmapInput` liefert bei falschem `schemaVersion` oder
   `valueKind` ein leeres `values: []`. Nachgemessen ergibt ein Objekt mit
   falscher Version `shares: []` ohne jeden Hinweis. Fuer einen Slice, dessen
   Ziel wahrheitsgetreue Darstellung ist, ist eine wortlos leere Heatmap die
   falsche Degradation - die uebrigen Missingness-Pfade dieses Slice melden
   ihren Zustand ausdruecklich.
3. **Z06-3 (Hinweis) - die Konsistenzpruefung der Erfolgspopulation kann sich
   gegenseitig aufheben.** `positiveSuccessfulOutcomes` entsteht aus
   `finalOutcomes[i] > 0` ueber **alle** Runs, nicht nur ueber die nach Status
   erfolgreichen. Der Waechter prueft lediglich
   `positiveSuccessfulOutcomes.length <= successfulCount`. Ein ruinierter Run
   mit positivem Endwert und ein erfolgreicher Run mit Endwert 0 heben sich in
   dieser Zaehlung gegenseitig auf; die Zusammensetzung waere falsch und der
   Waechter bliebe still. Eine Filterung nach Terminalstatus statt der
   arithmetischen Rekonstruktion ueber die Differenz waere robuster.
4. **Z06-4 (Hinweis) - ein einzelner Inkonsistenzfall loescht die Metrik fuer
   den gesamten Chunk.** Bei `outcome_inventory_mismatch` werden
   `successfulOutcomes` auf `[]` und `p50_successful` auf `null` gesetzt. Das
   ist ehrlich, aber grobkoernig: ein Ausreisser unter mehreren tausend Runs
   entfernt die Kennzahl vollstaendig, statt sie mit ausgewiesener
   Einschraenkung zu liefern.

### Review-Ergebnis

```markdown
## Review-Ergebnis
- Status: freigegeben
- Blocker: keine. Die Falsy-Default-Familie in simulator-year-result.js ist
  korrekt durch eine explizite Endlichkeitspruefung ersetzt; der
  Heatmap-Nenner ist versioniert statt geraten, und das Randfallkriterium
  wurde nachgemessen. Die Golden-Aenderung bleibt exakt auf die drei
  freigegebenen Hashes begrenzt.
- Restrisiken:
  1. Z06-1 - `null <= 0.1` laesst einen fehlenden Flexwert als „Jahr ohne
     Flex" zaehlen; die an der Quelle gewonnene Missingness geht in der
     ersten Aggregation wieder verloren.
  2. Z06-2 - unbekanntes Heatmap-Schema liefert wortlos eine leere Heatmap.
  3. Z06-3 - die Konsistenzpruefung der Erfolgspopulation kann sich
     gegenseitig aufhebende Fehler nicht erkennen.
  4. Z06-4 - ein Inkonsistenzfall entfernt p50_successful fuer den ganzen
     Chunk.
- Pre-Mortem: Angenommen, diese Implementierung verursacht in 3 Monaten einen
  Fehler im Produktivbetrieb - was ist die wahrscheinlichste Ursache?
  Nicht die Darstellung, sondern die Statistik dahinter: Ein Nutzer vergleicht
  zwei Monte-Carlo-Laeufe und sieht einen deutlich hoeheren Anteil an Jahren
  ohne Flex. Ursache ist nicht eine geaenderte Strategie, sondern eine
  Konstellation, in der die Flexrate haeufiger fehlt als zuvor - `null` faellt
  ueber die Koerzierung in denselben Zaehler wie eine echte Null. Weil der
  Slice die Trennung von fehlend und Null als geloest ausweist, wird die
  Ursache im Spending-Modell gesucht statt in der Aggregationsbedingung.
```

### Empfehlung

Z06-1 ist eine Zeile: `Number.isFinite(result.logData.FlexRatePct) &&
result.logData.FlexRatePct <= 0.1`. Ob ein fehlender Flexwert als eigener
Missingness-Zaehler gefuehrt oder aus der Quote herausgerechnet wird, ist eine
kleine Fachentscheidung - die stille Koerzierung sollte sie jedenfalls nicht
treffen.

## Review-Antworten von Codex

Review-Findings berücksichtigt; Implementierung vollständig grün.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| REV-06-01 | Gemini | Backtest-Hash-Deltas durch `FlexRatePct=0` | Fachlich beabsichtigtes Delta; Target-Fixture am 2026-07-26 kontrolliert aktualisiert | erledigt |
| Z06-1 | Claude 2026-07-27 | `monte-carlo-runner.js` prueft `FlexRatePct <= 0.1`; nach der Korrektur kann das Feld `null` sein und `null <= 0.1` ergibt `true` - ein fehlender Flexwert zaehlt als Jahr ohne Flex | offen - Restrisiko | ausstehend |
| Z06-2 | Claude 2026-07-27 | `normalizeHeatmapInput` liefert bei unbekanntem `schemaVersion` oder `valueKind` wortlos `values: []` statt eines Hinweises | offen - Hinweis | ausstehend |
| Z06-3 | Claude 2026-07-27 | `positiveSuccessfulOutcomes` wird ueber alle Runs statt nur ueber die nach Status erfolgreichen gebildet; sich aufhebende Fehler bleiben unerkannt | offen - Hinweis | ausstehend |
| Z06-4 | Claude 2026-07-27 | ein einzelner `outcome_inventory_mismatch` entfernt `p50_successful` fuer den gesamten Chunk | offen - Hinweis | ausstehend |
