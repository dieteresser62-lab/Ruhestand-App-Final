# Slice Engine Hardening 02: Steuer- und Nettoerloes-Contract

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** implementiert - Review ausstehend
**Aenderungsbereich:** Punkt 1 / Contract C2

## Ziel

Der Core-Einzelverkauf trennt konservativ reservierte Plansteuer von finaler Jahressteuer und gleicht die Differenz genau einmal cashseitig aus. Der Bruttoverkauf bleibt in diesem Slice bewusst unveraendert; steuerliche Verkaufsminimierung wird zurueckgestellt.

## Fachlicher Contract

Fuer den normalen Core-Jahrespfad gilt mit 0,01 EUR Toleranz:

```text
nettoErlösPlan = bruttoVerkaufGesamt - steuerPlanGesamt
taxCashAdjustment = steuerPlanGesamt - taxSettlement.taxAfterLossCarry
nettoErlös = nettoErlösPlan + taxCashAdjustment
sum(verwendungen) = nettoErlös
action.steuer = taxSettlement.taxAfterLossCarry
liqNachTransaktion = aktuelleLiquiditaet + verwendungen.liquiditaet
```

Im Core-Erstverkauf muss `taxCashAdjustment >= -0,01 EUR` gelten, weil LossCarry die bisherige Plansteuer nur reduzieren kann. Eine negative groessere Differenz ist ein Stop-Signal. `breakdown[].steuer` und `breakdown[].netto` bleiben Planattribution; Top-Level-Felder sind die finale Cash-Wahrheit.

## Akzeptanzkriterien

- Der reproduzierte 5.000-EUR-LossCarry-Fall behaelt den bisherigen konservativen Bruttoverkauf, schreibt aber die Steuerersparnis von 1.318,75 EUR genau einmal der Liquiditaet gut.
- Ohne LossCarry sind `taxCashAdjustment = 0` und alle bestehenden Verkaufsergebnisse innerhalb 0,01 EUR stabil.
- Ohne Transaktion bleiben Steuer, Nettoerloes und Rohaggregate `0` bzw. neutral.
- Gewinn-, Verlust- und gemischte Tranchen erzeugen endliche, signierte Rohaggregate.
- TQF, SPB und Kirchensteuer kommen weiterhin aus den bestehenden Modulen.
- `lastState` wird nicht mutiert.
- `action.steuer`, `taxSettlement`, `newState.taxState`, `nettoErlös` und `verwendungen` erfuellen die Invarianten.
- `breakdown[].steuer`/`breakdown[].netto` bleiben als Planattribution erkennbar und werden nicht fuer die Top-Level-Cash-Invariante summiert.
- `steuerPlanGesamt`, `nettoErlösPlan` und `taxCashAdjustment` werden additiv exponiert.
- Der Simulator-Mehrfachverkauf bleibt in diesem Slice unveraendert und wird zwingend in Slice 8 abgeschlossen.

## Scope

Geplanter maximaler Programmdatei-Scope:

- `engine/core.mjs`,
- `tests/core-tax-settlement.test.mjs`,
- `engine.js` generiert.

Der geplante Scope umfasst damit 3 Programmdateien. `transaction-action.mjs`, `sale-engine.mjs` und `tax-settlement.mjs` werden nicht geaendert.

Nicht-Scope:

- neues Steuerrechtsmodell,
- Aenderung der Verkaufsreihenfolge,
- Entfernung `breakdown[].steuer`/`netto`,
- steuerlich minimaler Gross-up oder Solver,
- Simulator-Mehrfachverkauf; dieser folgt in Slice 8,
- UI-Redesign.

## Reserve-/Reconciliation-Spezifikation

1. Vor dem Core-Settlement werden bestehende Werte als `steuerPlanGesamt` und `nettoErlösPlan` gesichert.
2. `settleTaxYear()` bleibt einzige Quelle der finalen Jahressteuer.
3. Die Differenz wird nur der Liquiditaetsverwendung zugeschlagen; Gold-/Aktienverwendungen bleiben unveraendert.
4. `action.steuer` bleibt aus Kompatibilitaetsgruenden finale Jahressteuer.
5. `breakdown[].steuer` bleibt Planattribution und wird entsprechend dokumentiert.
6. No-Transaction-Actions liefern alle neuen Felder neutral mit `0`.
7. Der Bruttoverkauf wird nicht neu geloest. Das vermeidet Solver- und Forced-Sale-Rueckwirkungsrisiken; moegliche konservative Ueberverkaeufe sind dokumentiertes Restrisiko.

## Git- und Diff-Risiko vor Coding

```text
Branch bei Planung: codex/engine-contract-hardening
Status bei Planung: fremde Doku-/node_modules-Aenderungen und Planungsdateien vorhanden

Geplante Dateien:
- engine/core.mjs
- tests/core-tax-settlement.test.mjs
- engine.js (generiert)

Voraussichtliche Aenderungstiefe:
- mittel; fachlicher Cash-Contract, aber kein Verkaufsalgorithmus

Gefaehrdete bestehende Tests:
- core-tax-settlement
- simulator-tax-settlement
- worker parity, backtest und Monte Carlo

Nicht anfassen:
- Steuersaetze und TQF-Regeln
- sale-engine.mjs und Sell-Order-Semantik
- transaction-action.mjs
- simulator-forced-sale.js ohne neue Slice-Freigabe
- minimumFlexAnnual
- dist/ und EXE

Rollback-Strategie:
- git checkout -- engine/core.mjs tests/core-tax-settlement.test.mjs engine.js
```

Branch und Status muessen vor Coding erneut wortgetreu erfasst werden.

Tatsaechlicher Check unmittelbar vor Coding am 2026-07-10:

```text
Branch: codex/engine-contract-hardening
Status:
 M README.md
 M docs/internal/README.md
 M docs/internal/archive/README.md
 M docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
 M docs/reference/SIMULATOR_MODULES_README.md
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
```

Diese vorbestehenden Aenderungen wurden nicht zurueckgesetzt. Die Slice-Aenderung in der bereits modifizierten `tests/README.md` beschraenkt sich auf den Abschnitt `core-tax-settlement.test.mjs`.

Baseline vor dem ersten Code-Edit:

- `core-tax-settlement.test.mjs`: 22/22 Assertions gruen.
- `simulator-backtest.test.mjs`: 39/39 Assertions gruen.
- Headless-Backtest 2000-2025: 26 Jahre, Liquiditaet Ende 2025 = 413.996 EUR.
- Golden LossCarry 5.000 EUR: Brutto 30.000 EUR, Plansteuer 3.692,50 EUR, finale Steuer 2.373,75 EUR, vor Slice 2 ausgewiesenes Netto-Cash 26.307,50 EUR.

## Geplante Tests

```text
node tests/run-single.mjs tests/core-tax-settlement.test.mjs
node tests/run-single.mjs tests/transaction-tax.test.mjs
node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs
node tests/run-single.mjs tests/transaction-quantization.test.mjs
node tests/run-single.mjs tests/worker-parity.test.mjs
npm run build:engine
npm test
```

Golden Cases: kein LossCarry, teilweiser LossCarry, ueberdeckender LossCarry und No-Transaction. Vor Coding wird ein repräsentativer Backtest-Baselinewert dokumentiert.

## Durchgefuehrte Aenderungen

- `engine/core.mjs` sichert Plansteuer und Plan-Netto vor dem Settlement, exponiert `bruttoVerkaufGesamt`, `steuerPlanGesamt`, `nettoErlösPlan` und `taxCashAdjustment` und gibt die Differenz genau einmal an die Liquiditaetsverwendung zurueck.
- Ein `taxCashAdjustment < -0,01 EUR` bricht als explizite Contract-Verletzung ab.
- No-Transaction-Actions erhalten neutrale Verkaufs-, Steuer- und Verwendungsfelder.
- `tests/core-tax-settlement.test.mjs` deckt alle Golden Cases, Cash-Invarianten, Runway, Non-Mutation und signierte Verlust-/Mischtranchen ab.
- Contract-Semantik ist in `engine/README.md`, `docs/reference/TECHNICAL.md` und `tests/README.md` dokumentiert.
- `engine.js` wurde mit `npm run build:engine` geprueft; der Modul-Fallback-Wrapper blieb inhaltlich unveraendert.

## Ausgefuehrte Tests mit Ergebnis

- `node tests/run-single.mjs tests/core-tax-settlement.test.mjs`: 73/73 Assertions gruen.
- `node tests/run-single.mjs tests/transaction-tax.test.mjs`: 26/26 Assertions gruen.
- `node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs`: 32/32 Assertions gruen.
- `node tests/run-single.mjs tests/transaction-quantization.test.mjs`: gruen.
- `node tests/run-single.mjs tests/worker-parity.test.mjs`: 354/354 Assertions gruen.
- `npm run build:engine`: erfolgreich; vorgesehener Fallback-Build ohne esbuild.
- `npm test`: 101 Testdateien, 3.113/3.113 Assertions, 0 Fehler, 0 offene Handles.
- Headless-Backtest 2000-2025 nach Coding: 26 Jahre, Liquiditaet Ende 2025 = 416.201 EUR. Das Delta von +2.205 EUR beginnt mit dem ersten steuerlich reconcilierten Verkaufsjahr und entspricht freigegebenen Steuerreserven; keine unerwartete Abweichung ausserhalb der spezifizierten Fallklasse.

## Abweichungen vom Plan

- `engine.js` wurde generiert/geprueft, blieb als Modul-Fallback-Wrapper aber unveraendert und erscheint deshalb nicht im Diff.

## Offene Risiken

- `breakdown[].steuer` ist Planattribution und darf nicht mit finaler Steuer verwechselt werden.
- Der Bruttoverkauf bleibt bei LossCarry konservativ hoeher als das theoretische Minimum.
- Der Simulator besitzt einen spaeteren Forced-Sale-Recompute; das Gesamtpaket bleibt bis Slice 8 unvollstaendig.

## Rueckdokumentation

Hauptplanstatus, Reserve-/Reconciliation-Felder, Golden-Case-Ergebnisse, Engine-README, technische Referenz und Tests-README wurden aktualisiert.

## Freigabestatus

- [x] Reserve-/Reconciliation-Modell durch Reviewer bestaetigt
- [x] Branch-/Statuscheck aktualisiert
- [x] Implementierung abgeschlossen
- [x] Full Suite und Engine-Build gruen
- [x] Gemini-Review
- [ ] Nutzerfreigabe

## Review-Feedback von Gemini

### 1. Prüfdimensionen
- **Korrektheit vs. Akzeptanzkriterien:** Der Bisektions-Solver wurde vollständig aus dem Plan entfernt. Damit entfällt die Notwendigkeit eines Monotonie-Nachweises (gelöst, Finding **G-02**).
- **Simulator-Konsistenz:** Die Forced-Sale-Interaktion wird im neuen Slice 8 über eine einmalige Reconciliation der kumulierten Steuerreserven gelöst, was die Konsistenz sichert und Doppelverrechnungen verhindert (gelöst, Finding **G-03**).

### 2. Findings (Gemini)
- **G-02 (Hoch):** Monotonie-Beweis für Bisektions-Solver fehlt (gelöst, Solver entfernt).
- **G-03 (Hoch):** Forced-Sale-Steuerkonsistenz ungelöst (gelöst, Reconciliation-Modell in Slice 8).

### 3. Pre-Mortem
Angenommen, dieser Slice verursacht in 3 Monaten einen Fehler: Der Simulator führt am Ende einer Sequenz einen Forced-Sale durch. Dieser setzt die Steuerberechnung für das gesamte Jahr zurück und rechnet die Steuer neu. Da die erste Transaktion ihren Nettoerlös aber bereits auf Basis einer veralteten Steuerfestsetzung abgeführt hat, weist das Portfolio am Ende eine Differenz auf, da die tatsächlich abgeführte Steuer nicht mehr zur gebuchten Transaktionssteuer passt.

### 4. Review-Ergebnis
- **Status:** freigegeben
- **Blocker:** keine
- **Restrisiken:** Keine

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

- **G-02 und F-S02-01 angenommen:** Der Bisektions-Solver wird vollstaendig aus dem Plan entfernt; ein Monotonienachweis ist damit nicht mehr erforderlich.
- **G-03/F-S02-03 angenommen:** Der Core-Einzelverkauf und der Simulator-Mehrfachverkauf werden getrennt. Slice 2 reconciled nur die erste Action; Slice 8 summiert alle tatsaechlich cashwirksamen Steuerreserven und wendet die finale Differenz genau einmal an.
- **F-S02-02 angenommen:** `breakdown[].steuer` bleibt Planattribution. `steuerPlanGesamt`, `nettoErlösPlan`, `taxCashAdjustment` und finale `action.steuer` erhalten eindeutige Bedeutungen.
- **F-S02-04 angenommen:** Der Scope sinkt auf `core.mjs`, einen Test und das generierte Bundle.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-02 | Gemini | Monotonie-Beweis für Bisektions-Solver fehlt | angenommen | Solver entfernt |
| G-03 | Gemini | Forced-Sale-Steuerkonsistenz ungelöst | angenommen | eigener Slice 8 |
| F-S02-01 | Claude | Solver-Monotonie | angenommen | Solver entfernt |
| F-S02-02 | Claude | Steuerfeld-Semantik doppeldeutig | angenommen | additive eindeutige Felder |
| F-S02-03 | Claude | Forced-Sale Double-Spending | angenommen | Reserve-Summe plus einmalige Reconciliation in Slice 8 |
| F-S02-04 | Claude | Scope knapp | angenommen | auf 3 Programmdateien reduziert |
