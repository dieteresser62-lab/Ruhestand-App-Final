# Refactoring: SpendingPlanner in Policy-Module aufteilen

Status: `[x]` abgeschlossen

Backlog-Referenz: `docs/internal/REFACTORING_BACKLOG.md`, Punkt `2. SpendingPlanner in Policy-Module aufteilen`

Startdatum: 2026-04-24

## Ziel

`engine/planners/SpendingPlanner.mjs` soll schrittweise vom Policy-Monolithen zu einem Orchestrator werden. Die Zerlegung erfolgt in kleinen, testbaren Schritten ohne Aenderung am oeffentlichen `SpendingPlanner.determineSpending()`-Vertrag.

## Nicht-Ziele

- Keine fachliche Aenderung an Entnahme, Alarm, Guardrails, Flex-Budget oder Diagnose.
- Keine manuelle Aenderung an `engine.js`; das Artefakt wird nur ueber `npm run build:engine` erzeugt.
- Kein grosser Policy-Context, der beliebig mutiert wird.
- Kein gleichzeitiges Verschieben mehrerer fachlicher Policies im ersten Slice.

## Schnittstellen-Regeln

- Reine Helper bleiben frei von State-Mutation.
- Policy-Module importieren Konfiguration explizit oder bekommen benoetigte Werte als Parameter.
- Bestehende interne Planner-Methoden duerfen fuer Kompatibilitaet delegieren, sollen aber keine Logik duplizieren.
- Nach Aenderungen unter `engine/` laufen `npm test` und `npm run build:engine`.

## Geplante Modulstruktur

- `engine/planners/spending-policy-helpers.mjs`
  - Quantisierung monatlicher Entnahmen.
  - `smoothstep()` fuer S-Kurven.
  - Flex-Anteil-Berechnung.
- `engine/planners/wealth-reduction.mjs`
  - Vermoegensbasierte Reduktionsdaempfung berechnen.
  - Rentenabzug, reale Vorjahresentnahme und reale Depotbasis kapseln.
- `engine/planners/alarm-policy.mjs`
  - Peak- und Recovery-Deeskalation bewerten.
  - Alarm-Aktivierung und Wealth-Sufficient-Unterdrueckung kapseln.
- `engine/planners/flex-rate-policy.mjs`
  - Alarmmodus-Flexrate, normale Bear-Reduktion und Glaettung berechnen.
  - Flex-S-Kurve und harte Bear-/Runway-Caps anwenden.
- `engine/planners/flex-budget-policy.mjs`
  - Flex-Budget-Cap, Topfverbrauch und Recharge berechnen.
  - Regime-Multiplikatoren und Min-Rate anwenden.
- `engine/planners/final-rate-policy.mjs`
  - Finale jährliche Flex-Rate-Delta-Limits anwenden.
- `engine/planners/spending-guardrails.mjs`
  - Recovery-Cap, Caution-Inflationscap und Budget-Floor anwenden.
  - Guardrail-Diagnosen fuer Inflation und Budget-Floor liefern.
- `engine/planners/spending-diagnosis.mjs`
  - Diagnose-General, Guardrail-Uebersicht und Key-Parameter-Kopie bauen.
  - Runway-Zielauflösung kapseln.
- `engine/planners/spending-policy-pipeline.mjs`
  - Guardrails, Flex-Budget und finale Rate-Limits in stabiler Reihenfolge orchestrieren.

## Umsetzungsschritte

### Step 1: Reine Helper extrahieren

Soll:

- `quantizeMonthly`, `smoothstep` und `calcFlexShare` in ein DOM-freies Modul verschieben.
- Bestehende `_quantizeMonthly`, `_smoothstep` und `_calcFlexShare` als kompatible Delegates erhalten.
- Direkte Tests fuer das neue Helper-Modul ergaenzen.

Ist:

- Umgesetzt in `engine/planners/spending-policy-helpers.mjs`.
- `SpendingPlanner.mjs` importiert die Helper und delegiert die bestehenden internen Methoden.
- `tests/spending-quantization.test.mjs` importiert die Helper direkt und prueft Quantisierung, Clamp-Verhalten und Flex-Anteil.

### Step 2: Wealth-Reduction extrahieren

Soll:

- `_calculateWealthAdjustedReductionFactor()` in ein eigenes Policy-Modul verschieben.
- Entnahmequote, Rentenabzug und reale Depotbasis direkt testen.

Ist:

- Umgesetzt in `engine/planners/wealth-reduction.mjs`.
- Enthaltener Export:
  - `calculateWealthAdjustedReductionFactor()`
- `SpendingPlanner._calculateWealthAdjustedReductionFactor()` bleibt als kompatibler Delegate erhalten.
- `tests/spending-planner.test.mjs` importiert die Policy direkt und prueft Safe-/Mid-/Full-Rate, Rentenabzug, S-Kurve und reale Vorjahresentnahme mit realer Depotbasis.

### Step 3: Alarm-Policy extrahieren

Soll:

- Alarm-Deeskalation und Alarm-Aktivierung in ein eigenes Policy-Modul verschieben.
- Wealth-Sufficient-Unterdrueckung und Recovery-/Peak-Deeskalation direkt testen.

Ist:

- Umgesetzt in `engine/planners/alarm-policy.mjs`.
- Enthaltene Exporte:
  - `shouldDeescalateInPeak()`
  - `shouldDeescalateInRecovery()`
  - `evaluateAlarmConditions()`
- `SpendingPlanner._shouldDeescalateInPeak()`, `_shouldDeescalateInRecovery()` und `_evaluateAlarmConditions()` bleiben als kompatible Delegates erhalten.
- `tests/spending-planner.test.mjs` importiert die Policy direkt und prueft Peak-/Recovery-Deeskalation sowie Wealth-Sufficient-Unterdrueckung.

### Step 4: Flex-Rate-Policy extrahieren

Soll:

- `_calculateFlexRate()` in ein eigenes Policy-Modul verschieben.
- Alarm-Modus, normale Bear-Reduktion, S-Kurve und harte Caps direkt testen.

Ist:

- Umgesetzt in `engine/planners/flex-rate-policy.mjs`.
- Enthaltene Exporte:
  - `applyFlexShareCurve()`
  - `calculateFlexRate()`
- `SpendingPlanner._applyFlexShareCurve()` und `_calculateFlexRate()` bleiben als kompatible Delegates erhalten.
- `tests/spending-planner.test.mjs` importiert die Policy direkt und prueft S-Kurve, Alarmmodus, Bear-Pfad und Planner-Delegate-Paritaet.

### Step 5: Flex-Budget-Policy extrahieren

Soll:

- `_applyFlexBudgetCap()` in ein eigenes Policy-Modul verschieben.
- Topfverbrauch, Recharge, Min-Rate und Regime-Multiplikatoren direkt testen.

Ist:

- Umgesetzt in `engine/planners/flex-budget-policy.mjs`.
- Enthaltener Export:
  - `applyFlexBudgetCap()`
- `SpendingPlanner._applyFlexBudgetCap()` bleibt als kompatibler Delegate erhalten.
- `tests/spending-planner.test.mjs` importiert die Policy direkt und prueft Cap, Topfverbrauch, Recharge, Min-Rate und Planner-Delegate-Paritaet.

### Step 6: Guardrail-Policy extrahieren

Soll:

- `_applyGuardrails()` in ein eigenes Policy-Modul verschieben.
- Recovery-Cap, Caution-Inflationscap und Budget-Floor direkt testen.

Ist:

- Umgesetzt in `engine/planners/spending-guardrails.mjs`.
- Enthaltener Export:
  - `applyGuardrails()`
- `SpendingPlanner._applyGuardrails()` bleibt als kompatibler Delegate erhalten.
- `tests/spending-planner.test.mjs` importiert die Policy direkt und prueft Recovery-Cap, Caution-Inflationscap, Budget-Floor und Planner-Delegate-Paritaet.

### Step 7: Diagnose-Aufbau extrahieren

Soll:

- Diagnose-General, Guardrail-Uebersicht und Key-Parameter-Kopie in ein eigenes Modul verschieben.
- Ergebnisstruktur von `determineSpending()` unveraendert halten.

Ist:

- Umgesetzt in `engine/planners/spending-diagnosis.mjs`.
- Enthaltene Exporte:
  - `buildSpendingDiagnosis()`
  - `resolveRunwayTarget()`
- `SpendingPlanner._buildDiagnosis()` und `_resolveRunwayTarget()` bleiben als kompatible Delegates erhalten.
- `tests/spending-planner.test.mjs` importiert das Diagnose-Modul direkt und prueft oeffentlichen Diagnosis-Shape, Guardrail-Diagnosen, Key-Parameter-Kopie und Runway-Zielauflösung.

### Step 8: `determineSpending()` als Orchestrator stabilisieren

Soll:

- Verbleibende Inline-Kontrolllogik aus `determineSpending()` entfernen.
- Reihenfolge von Alarm, Guardrails, Flex-Budget, finalen Rate-Limits, Entnahmeberechnung, Result und Diagnose explizit halten.
- Ergebnisstruktur von `determineSpending()` unveraendert halten.

Ist:

- Finale Rate-Limits nach `engine/planners/final-rate-policy.mjs` extrahiert.
- Guardrails, Flex-Budget und finale Rate-Limits in `engine/planners/spending-policy-pipeline.mjs` gebuendelt.
- Finale Entnahme- und effektive Flex-Rate-Berechnung als Helper `calculateFinalWithdrawal()` kapselt.
- `SpendingPlanner.determineSpending()` ist jetzt ein schlanker Orchestrator fuer State, Alarm, initiale Flex-Rate, Policy-Pipeline, Entnahme, Result und Diagnose.
- Bestehende interne Planner-Methoden bleiben als kompatible Delegates erhalten.
- `tests/spending-planner.test.mjs` prueft Final-Rate-Policy, Policy-Pipeline und finale Entnahme direkt inklusive Delegate-Paritaet.

## Risiko-Checkliste

- [x] `SpendingPlanner.determineSpending()`-Signatur bleibt unveraendert.
- [x] Bestehende interne `_...`-Helper bleiben vorerst erreichbar.
- [x] Quantisierung nutzt weiterhin `CONFIG.ANTI_PSEUDO_ACCURACY`.
- [x] `smoothstep()` clamped weiter auf `[0, 1]`.
- [x] Flex-Anteil bleibt `flex / (floor + flex)`.
- [x] Wealth-Reduction nutzt weiterhin Safe-/Full-Rate aus `CONFIG`.
- [x] Wealth-Reduction beruecksichtigt Rentenabzug und reale Vorjahresentnahme unveraendert.
- [x] Alarm-Policy nutzt weiter dieselben Peak-/Recovery-Deeskalationsregeln.
- [x] Wealth-Sufficient-Unterdrueckung beendet bzw. verhindert den Alarm weiterhin.
- [x] Flex-Rate-Policy schreibt `wealthReductionFactor` und `entnahmequoteUsed` weiter in `state.keyParams`.
- [x] Alarmmodus, S-Kurve und harte Bear-/Runway-Caps bleiben in gleicher Reihenfolge.
- [x] Flex-Budget-Cap verbraucht aktive Regimejahre weiterhin nach Regime-Gewicht.
- [x] Flex-Budget-Recharge und Min-Rate bleiben unveraendert.
- [x] Guardrail-Policy liefert weiterhin Recovery-Cap, Caution-Inflationscap und Budget-Floor.
- [x] Guardrail-Diagnosen fuer `inflationCap` und `budgetFloor` bleiben strukturgleich.
- [x] Diagnose-General, Guardrail-Uebersicht und Key-Parameter-Kopie bleiben strukturgleich.
- [x] Finale Rate-Limits bleiben in gleicher Reihenfolge nach Flex-Budget aktiv.
- [x] Finale Entnahmequantisierung und effektive Flex-Rate bleiben unveraendert.
- [x] `determineSpending()` enthaelt nur noch Orchestrierungsschritte.

## Abschlussdokumentation

- Abschlussdatum: 2026-04-25
- Commit: noch nicht erstellt
- Geaenderte Dateien:
  - `engine/planners/SpendingPlanner.mjs`
  - `engine/planners/alarm-policy.mjs`
  - `engine/planners/final-rate-policy.mjs`
  - `engine/planners/flex-budget-policy.mjs`
  - `engine/planners/flex-rate-policy.mjs`
  - `engine/planners/spending-diagnosis.mjs`
  - `engine/planners/spending-guardrails.mjs`
  - `engine/planners/spending-policy-pipeline.mjs`
  - `engine/planners/spending-policy-helpers.mjs`
  - `engine/planners/wealth-reduction.mjs`
  - `tests/spending-quantization.test.mjs`
  - `tests/spending-planner.test.mjs`
  - `docs/internal/REFACTORING_BACKLOG.md`
  - `docs/internal/README.md`
  - `docs/internal/REFACTORING_SPENDING_PLANNER_POLICIES.md`
  - `docs/reference/TECHNICAL.md`
  - `engine/README.md`
  - `README.md`
- Tests:
  - Vor Step 2: `npm test` erfolgreich, 69 Testdateien, 1224/1224 Assertions
  - `node --check engine/planners/SpendingPlanner.mjs` erfolgreich
  - `node --check engine/planners/alarm-policy.mjs` erfolgreich
  - `node --check engine/planners/final-rate-policy.mjs` erfolgreich
  - `node --check engine/planners/flex-budget-policy.mjs` erfolgreich
  - `node --check engine/planners/flex-rate-policy.mjs` erfolgreich
  - `node --check engine/planners/spending-diagnosis.mjs` erfolgreich
  - `node --check engine/planners/spending-guardrails.mjs` erfolgreich
  - `node --check engine/planners/spending-policy-pipeline.mjs` erfolgreich
  - `node --check engine/planners/wealth-reduction.mjs` erfolgreich
  - `node tests/run-single.mjs tests/spending-planner.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/spending-quantization.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/core-engine.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs` erfolgreich
  - `npm run build:engine` erfolgreich, Fallback-Build ohne esbuild
  - `npm test` erfolgreich, 69 Testdateien, 1224/1224 Assertions
- Offene Restpunkte:
  - Keine.
