# Slice Engine Hardening 08: Simulator-Steuerreserve und Cash-Reconciliation

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** implementiert - Review ausstehend
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

Startcheck am 2026-07-10 vor dem ersten Code-Edit:

```text
Branch: codex/engine-contract-hardening
Status (`git status --short`):
 M README.md
 M docs/internal/README.md
 M docs/internal/archive/README.md
 M docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
 M docs/reference/SIMULATOR_MODULES_README.md
 M docs/reference/TECHNICAL.md
 M engine/README.md
 M node_modules/.package-lock.json
 M tests/README.md
?? node_modules/.bin/playwright
?? node_modules/.bin/playwright-core
?? node_modules/.bin/playwright-core.cmd
?? node_modules/.bin/playwright-core.ps1
?? node_modules/.bin/playwright.cmd
?? node_modules/.bin/playwright.ps1
?? node_modules/playwright-core/
?? node_modules/playwright/

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
- git checkout -- app/simulator/simulator-forced-sale.js app/simulator/simulator-tax-recompute.js app/simulator/simulator-engine-direct.js app/simulator/simulator-year-result.js tests/simulator-tax-settlement.test.mjs tests/core-negative-contracts.test.mjs
```

Die vorhandenen Aenderungen stammen nicht aus Slice 8 und werden nicht angefasst. Die Abhaengigkeit zu Slice 2 ist technisch erfuellt: Commit `58bab72`, Gemini-Freigabe ohne Blocker und dokumentierte Backtest-Baseline 2000-2025 (vor Slice 2: 413.996 EUR; nach der spezifizierten Reconciliation: 416.201 EUR). Der Nutzerauftrag vom 2026-07-10, Slice 8 umzusetzen, wird als Freigabe zur Fortsetzung nach Slice 2 dokumentiert.

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

- Regulaere Steuerreserve und regulaeres Rohaggregat werden mit demselben tatsaechlichen Verkaufsausfuehrungsfaktor skaliert.
- Forced-Sale-Plansteuern werden ohne erneuten SPB berechnet und mit ihrer Ausfuehrungsskalierung als Reserve erfasst.
- Regulaere und Forced-Sale-Reserven werden gegen das finale kombinierte Jahressettlement reconciled; eine negative Unterdeckung unter -0,01 EUR wirft einen Contract-Fehler.
- Das finale Settlement aktualisiert Tax-State und Steuerausweis; die Reservefreigabe wird einmalig auf die operative Liquiditaet gebucht.
- Die FlowDelta-Bilanzierung beruecksichtigt die nach dem Payout gebuchte Steuer-Reconciliation additiv zur Bond-Refill-Plansteuer.
- Ein deterministischer 10-Jahres-Test mit regulaeren/erzwungenen Verkaeufen sowie Gewinn-/Verlustjahren prueft auf kumulative Steuer-/Cash-Drift.
- Nach Nutzerfreigabe wurde der Scope auf `simulator-year-result.js` und den bestehenden Negativ-Contract-Test erweitert.

## Ausgefuehrte Tests mit Ergebnis

- Baseline vor Coding: `simulator-tax-settlement` 32/32 gruen; `simulator-backtest` 39/39 gruen.
- Nach Coding: `simulator-tax-settlement` 57/57 gruen.
- `core-negative-contracts`: 67/67 gruen; der bestehende Forced-Sale-Test modelliert die neue `forcedTaxReserved`-Reserve explizit.
- `simulator-headless`: gruen; Endliquiditaet 2025 unveraendert 416.201 EUR.
- `simulator-backtest`: 39/39 gruen; 3-Bucket-FlowDelta bleibt inklusive Cash-Reconciliation innerhalb der 1-EUR-Toleranz.
- `worker-parity`: 354/354 gruen.
- Full Suite: 3.138/3.138 Assertions gruen, 0 fehlgeschlagene Dateien, 0 offene Handles.

## Abweichungen vom Plan

Der Nutzer hat die nach dem ersten Validierungslauf notwendige Scope-Erweiterung von 4 auf 6 Programmdateien ausdruecklich freigegeben. `app/simulator/simulator-year-result.js` bilanziert die nach dem Payout gebuchte Reconciliation im FlowDelta; `tests/core-negative-contracts.test.mjs` fuehrt fuer seinen Forced-Sale-Recompute eine explizite Forced-Sale-Reserve mit.

## Offene Risiken

- Der konservative Forced-Sale-Gross-up kann mehr Assets verkaufen als steuerlich minimal noetig; die Differenz landet nach Reconciliation als Cash.
- Falls `taxCashAdjustment` negativ wird, ist das Reserve-Modell widerlegt und muss neu spezifiziert werden.
- Die Reconciliation erfolgt nach Auszahlung, Bond-Refill und Cash-Verzinsung. Die im selben Jahr freigegebene Reserve erhaelt daher bewusst keine nachtraegliche Verzinsung.

## Rueckdokumentation

Tatsaechliche Reservefelder, Reconciliation-Zeitpunkt, 10-Jahres-Ergebnis und Restrisiko des konservativen Ueberverkaufs in Hauptplan, Simulator-Modulreferenz und Tests-README dokumentieren.

## Freigabestatus

- [x] Planreview abgeschlossen
- [x] Slice 2 freigegeben und abgeschlossen
- [x] Branch-/Statuscheck aktualisiert
- [x] Implementierung abgeschlossen
- [x] 10-Jahres-Invariante und Full Suite gruen
- [x] Gemini-Review
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
