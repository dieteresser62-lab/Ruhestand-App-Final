# Slice Engine Hardening 02: Steuer- und Nettoerloes-Contract

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** ueberarbeitet - abhaengig von Slice 3, erneutes Review erforderlich  
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

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine; Slice noch nicht gestartet.

## Offene Risiken

- `breakdown[].steuer` ist Planattribution und darf nicht mit finaler Steuer verwechselt werden.
- Der Bruttoverkauf bleibt bei LossCarry konservativ hoeher als das theoretische Minimum.
- Der Simulator besitzt einen spaeteren Forced-Sale-Recompute; das Gesamtpaket bleibt bis Slice 8 unvollstaendig.

## Rueckdokumentation

Hauptplan um Reserve-/Reconciliation-Felder und Golden-Case-Ergebnisse ergaenzen. Feldsemantik in `engine/README.md` und technischer Referenz dokumentieren.

## Freigabestatus

- [ ] Reserve-/Reconciliation-Modell durch Reviewer bestaetigt
- [ ] Branch-/Statuscheck aktualisiert
- [ ] Implementierung abgeschlossen
- [ ] Full Suite und Engine-Build gruen
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
