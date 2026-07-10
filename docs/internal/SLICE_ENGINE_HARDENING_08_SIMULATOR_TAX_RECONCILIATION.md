# Slice Engine Hardening 08: Simulator-Steuerreserve und Cash-Reconciliation

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** neu nach Review - abhaengig von Slice 2, erneutes Review erforderlich  
**Aenderungsbereich:** Punkt 1 / Contract C2 Mehrfachverkauf

## Ziel

Regulaere Engine-Verkaeufe und spaetere Simulator-Forced-Sales reservieren nachvollziehbare Steuerbetraege. Nach dem kombinierten Jahres-Settlement wird die Differenz zwischen insgesamt cashwirksam reservierter Steuer und finaler Jahressteuer genau einmal auf die operative Liquiditaet gebucht.

## Fachlicher Contract

```text
regularTaxReserved = actionResult.steuer * regularSaleScale
forcedTaxReserved = Summe der skalierten Forced-Sale-Plansteuern
taxReservedTotal = regularTaxReserved + forcedTaxReserved
taxDueFinal = settleTaxYear(combinedTaxRawAggregate).taxDue
taxCashAdjustment = taxReservedTotal - taxDueFinal
liquiditaetFinal = liquiditaetVorReconciliation + taxCashAdjustment
```

Forced Sales setzen fuer die Planreserve `sparerPauschbetrag = 0`, weil der Jahres-SPB bereits im regulaeren Core-Settlement beruecksichtigt ist. So bleibt die Reserve konservativ. `taxCashAdjustment < -0,01 EUR` ist ein Contract-Verstoss und stoppt die Umsetzung; er darf nicht still als zusaetzlicher Liquiditaetsabzug verarbeitet werden.

## Akzeptanzkriterien

- Ohne Forced Sale und bei `regularSaleScale = 1` bleiben Cash, finale Steuer und Tax-State aus Slice 2 unveraendert; `taxCashAdjustment = 0`.
- Bei `regularSaleScale < 1` werden regulaere Steuerreserve und regulaere Rohaggregate mit exakt demselben Faktor wie Nettoerloes und Reinvestitionen skaliert; dieser Fall erzwingt auch ohne Forced Sale einen Recompute.
- Mit Forced Sale wird dessen tatsaechlich ausgefuehrte, skalierte Plansteuer als `forcedTaxReserved` erfasst.
- Der SPB wird fuer Forced-Sale-Plansteuer nicht ein zweites Mal abgezogen.
- Die finale Jahressteuer wird genau einmal aus dem ausgefuehrt skalierten kombinierten Rohaggregat berechnet.
- Die Differenz zwischen Reserve und finaler Steuer wird genau einmal der operativen Liquiditaet gutgeschrieben.
- `actionResult.steuer` bleibt finale Jahressteuer; `taxSettlement` weist `taxReservedTotal`, `taxCashAdjustment`, `recomputedWithForcedSales`, `regularSaleScale` und Forced-Sale-Skalierung aus.
- `spendingNewState.taxState` entspricht dem finalen Settlement.
- Portfolio, Liquiditaet und Steuerausweis erfuellen im Jahresergebnis mit 0,01 EUR Toleranz: Summe Bruttoverkaeufe minus finale Jahressteuer gleich Netto-Cash aus Verkaeufen vor Reinvestitionen.
- Ein deterministischer 10-Jahres-Test mit mindestens einem regulaeren Verkauf, einem Forced Sale, Gewinn- und Verlustjahr zeigt keine kumulative Steuer-/Cash-Drift.
- Kein zweiter Forced Sale wird allein durch die Reconciliation erzeugt; negative Anpassungen sind Stop-Signal.

## Scope

Geplante Programmdateien:

- `app/simulator/simulator-forced-sale.js`,
- `app/simulator/simulator-tax-recompute.js`,
- `app/simulator/simulator-engine-direct.js`,
- `tests/simulator-tax-settlement.test.mjs`.

Damit bleibt der Slice bei 4 Programmdateien. Keine Engine-Quelle und kein `engine.js` werden geaendert.

Nicht-Scope:

- steuerlich minimaler Forced-Sale-Gross-up,
- Aenderung von Steuerformeln oder Sell-Order,
- Core-Refactoring,
- Balance-Profilverbund-Reconciliation,
- zusaetzlicher Tax-Cover-Sale bei negativer Anpassung.

## Git- und Diff-Risiko vor Coding

Planungsstand am 2026-07-10:

```text
Branch: codex/engine-contract-hardening
Status: fremde Doku-/node_modules-Aenderungen sowie Planungsdateien vorhanden

Geplante Dateien:
- app/simulator/simulator-forced-sale.js
- app/simulator/simulator-tax-recompute.js
- app/simulator/simulator-engine-direct.js
- tests/simulator-tax-settlement.test.mjs

Voraussichtliche Aenderungstiefe:
- riskant; Mehrjahres-Cash- und Steuerzustand

Gefaehrdete bestehende Tests:
- simulator-tax-settlement
- core-negative-contracts
- simulator-backtest/headless/monte-carlo
- worker parity
- transaction-tax

Nicht anfassen:
- engine/tax-settlement.mjs
- engine/transactions/sale-engine.mjs
- Steuerformeln/TQF/Sell-Order
- minimumFlexAnnual
- dist/ und EXE

Rollback-Strategie:
- git checkout -- app/simulator/simulator-forced-sale.js app/simulator/simulator-tax-recompute.js app/simulator/simulator-engine-direct.js tests/simulator-tax-settlement.test.mjs
```

Vor Coding sind Branch und voller Status wortgetreu zu aktualisieren. Die unveraenderte Backtest-Baseline aus dem Hauptplan muss vorliegen.

## Geplante Tests

```text
node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs
node tests/run-single.mjs tests/core-negative-contracts.test.mjs
node tests/run-single.mjs tests/simulator-headless.test.mjs
node tests/run-single.mjs tests/simulator-backtest.test.mjs
node tests/run-single.mjs tests/worker-parity.test.mjs
npm test
```

Golden Cases: kein Forced Sale bei Scale 1, regulaerer Teilverkauf ohne Forced Sale, Forced Sale mit Gewinn, Forced Sale mit Verlust, Forced-Teilskalierung, vorhandener LossCarry, SPB bereits im Core verbraucht, 10-Jahres-Sequenz ohne Drift.

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine; Slice neu nach Review.

## Offene Risiken

- Der konservative Forced-Sale-Gross-up kann mehr Assets verkaufen als steuerlich minimal noetig; die Differenz landet nach Reconciliation als Cash.
- Der 3-Bucket-Pfad kann Forced-Sale-Breakdowns skalieren; die Steuerreserve muss dieselbe Ausfuehrungsskalierung verwenden.
- Der regulaere Pfad skaliert aktuell Cash, aber nicht `combinedTaxRawAggregate`; dieser konkrete Ist-Befund ist Teil des Slice-Scopes.
- Falls `taxCashAdjustment` negativ wird, ist das Reserve-Modell widerlegt und muss neu spezifiziert werden.

## Rueckdokumentation

Tatsaechliche Reservefelder, Reconciliation-Zeitpunkt, 10-Jahres-Ergebnis und Restrisiko des konservativen Ueberverkaufs in Hauptplan, Simulator-Modulreferenz und Tests-README dokumentieren.

## Freigabestatus

- [ ] Planreview abgeschlossen
- [ ] Slice 2 freigegeben und abgeschlossen
- [ ] Branch-/Statuscheck aktualisiert
- [ ] Implementierung abgeschlossen
- [ ] 10-Jahres-Invariante und Full Suite gruen
- [ ] Gemini-Review
- [ ] Nutzerfreigabe

## Review-Feedback von Gemini

### 1. Prüfdimensionen
- **Korrektheit vs. Akzeptanzkriterien:** Das Reconciliation-Modell berechnet die Differenz zwischen kumulierten Steuerreserven (regulär und Forced-Sales) und der finalen Jahressteuer. Die Einmaligkeit des Cash-Ausgleichs sowie die Vermeidung von Doppelverrechnungen bei SPB und Verlustvortrag sind schlüssig spezifiziert. Der 10-Jahres-Test schützt wirksam vor schleichender Steuerdrift (gelöst, Finding **G-03**).
- **Fehlerbehandlung:** Negative Differenzen werden als Invariantenbruch gewertet und lösen einen kontrollierten Abbruch aus, statt stillschweigend Cash abzuziehen.

### 2. Findings (Gemini)
- **G-03 (Hoch):** Forced-Sale-Steuerkonsistenz im Simulator (gelöst, Reconciliation-Modell in Slice 8).

### 3. Pre-Mortem
Angenommen, dieser Slice verursacht in 3 Monaten einen Fehler: Bei der Sequenzberechnung über 30 Jahre hinweg weicht das kombinierte Rohaggregat durch Rundungsdifferenzen (im Centbereich) zwischen der Summe der skalierten Verkäufe und dem finalen Jahressettlement ab. Dies führt zu minimalen Schwankungen bei der Reconciliation, was über die Jahre kumuliert zu einer Abweichung im Endvermögen führt. Mitigation: Centgenaue Rundungstoleranz im Invariantentest.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Konservativer Überverkauf bei Forced-Sales (bewusst akzeptiert).

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

Noch offen.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-03 | Gemini | Forced-Sale-Steuerkonsistenz | angenommen | eigener Reconciliation-Slice |
| F-S02-03 | Claude | Double-Spending-Risiko | angenommen | Reserve-Summe und genau eine Cash-Anpassung |
