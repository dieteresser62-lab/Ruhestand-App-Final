# Slice Engine Hardening 06: Transaction-Settlement-Extraktion

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** zurueckgestellt - nicht mit Simulator-Reconciliation verwechseln  
**Aenderungsbereich:** Punkt 4 / Contract C4

## Ziel

Die in Slice 2 stabilisierte Integration von Action-Rohaggregaten, Jahressteuer, Netto-Cash und Tax-State wird verhaltensneutral aus `core.mjs` nach `engine/transaction-settlement.mjs` verschoben.

## Ueberarbeitete Vorgehensweise

Die Extraktion wird nicht gestartet. Die fachlich notwendige Simulator-Mehrfachverkaufs-Reconciliation liegt stattdessen in dem neuen Slice 8. Erst nach dessen Abschluss darf ein separater Refactoring-Plan die Ownership-Grenze des Settlement-Moduls neu bewerten.

## Akzeptanzkriterien

- Neues Modul ist rein und mutiert weder `lastState` noch das uebergebene Action-Objekt; es liefert eine angereicherte Action-Kopie plus `taxStateNext`.
- C2-Invarianten bleiben exakt erhalten.
- `settleTaxYear()` bleibt einzige Quelle der finalen Steuer.
- No-Transaction-, Gewinn-, Verlust- und LossCarry-Faelle bleiben wertgleich.
- Simulator-Recompute kann weiterhin Rohaggregate lesen und kombinieren.
- `taxSettlement`-Diagnosefelder und oeffentliche Action-Felder bleiben kompatibel.

## Scope und Nicht-Scope

Scope: `engine/core.mjs`, neues `engine/transaction-settlement.mjs`, `tests/core-tax-settlement.test.mjs`, `engine.js`.

Nicht-Scope: Reserve-/Reconciliation-Implementierung aus Slice 2/8, Steuerregel-Aenderung, Forced-Sale-Refactor, Feldentfernung oder UI-Anpassung.

## Git- und Diff-Risiko vor Coding

```text
Branch bei Planung: codex/engine-contract-hardening
Status bei Planung: fremde Aenderungen und Planungsdateien vorhanden

Geplante Dateien:
- engine/core.mjs
- engine/transaction-settlement.mjs (neu)
- tests/core-tax-settlement.test.mjs
- engine.js (generiert)

Voraussichtliche Aenderungstiefe:
- mittel bis riskant

Gefaehrdete bestehende Tests:
- core-tax-settlement
- simulator-tax-settlement
- transaction-tax
- worker parity

Nicht anfassen:
- Reserve-/Reconciliation-Contract aus Slice 2/8
- tax-settlement Fachformeln
- Simulator Forced-Sale-Code
- minimumFlexAnnual
- dist/ und EXE

Rollback-Strategie:
- git checkout -- engine/core.mjs tests/core-tax-settlement.test.mjs engine.js
- neue Datei engine/transaction-settlement.mjs nur nach Freigabe entfernen
```

Vor Coding Branch/Status aktualisieren.

## Geplante Tests

```text
node tests/run-single.mjs tests/core-tax-settlement.test.mjs
node tests/run-single.mjs tests/tax-settlement.test.mjs
node tests/run-single.mjs tests/simulator-tax-settlement.test.mjs
node tests/run-single.mjs tests/transaction-tax.test.mjs
node tests/run-single.mjs tests/worker-parity.test.mjs
npm run build:engine
npm test
```

Zusaetzlich Non-Mutation-Test fuer Action, lastState und raw aggregate.

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Eine Action-Kopie kann verschachtelte Arrays weiterhin teilen; Mutationsfreiheit ist tief genug zu testen.
- Die Grenze zwischen finaler Jahressteuer und Simulator-Recompute muss dokumentiert bleiben.

## Rueckdokumentation

Ownership des Settlement-Pfads in Hauptplan und technischer Referenz aktualisieren.

## Freigabestatus

- [x] In diesem Vorhaben zurueckgestellt
- [ ] Separater Refactoring-Plan freigegeben
- [ ] Branch-/Statuscheck
- [ ] C2-Invarianten unveraendert
- [ ] Build und Full Suite gruen
- [ ] Gemini-/Nutzerreview

## Review-Feedback von Gemini

### 1. Prüfdimensionen
- **Korrektheit vs. Akzeptanzkriterien:** Das Modul zur Verkaufsabwicklung und Steuerberechnung muss tiefenkopierte Action-Objekte zurückliefern. Ein flaches Klonen führt dazu, dass innere Arrays (wie `breakdown` oder `verwendungen`) weiterhin dieselbe Referenz besitzen. Das führt bei unterjährigen Modifikationen oder bei der Erstellung des finalen Diagnoseobjekts zu Seiteneffekten (siehe Finding **G-07**).
- **Vertragstreue:** Die Schnittstelle muss die Invarianten C2-1 bis C2-4 streng einhalten.

### 2. Findings (Gemini)
- **G-03 (Hoch):** Forced-Sale-Steuerkonsistenz im extrahierten Settlement-Modul (muss Paritätstest standhalten).
- **G-07 (Hoch):** Deep-Copy-Pflicht zur Vermeidung von Referenz-Mutationen bei Action- und Tax-Struktur.

### 3. Pre-Mortem
Angenommen, dieser Slice verursacht in 3 Monaten einen Fehler: Der Simulator führt ein Forced-Sale-Recompute durch. Das neue Modul `transaction-settlement.mjs` mutiert dabei das anfangs übergebene Action-Objekt, da es nur flach kopiert wurde. Dadurch stimmen in der UI-Tabelle die Werte für die reguläre Entnahme plötzlich nicht mehr, da sie mit den Forced-Sale-Werten überschrieben wurden.

### 4. Review-Ergebnis
- **Status:** blockiert
- **Blocker:** G-03, G-07
- **Restrisiken:** Keine

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

- **G-03 angenommen:** Forced-Sale-Konsistenz wird fachlich in Slice 8 geloest, nicht durch eine vorzeitige Extraktion.
- **G-07 teilweise angenommen:** Spaetere Extraktion benoetigt gezielte Kopien geaenderter Pfade und Non-Mutation-Tests; pauschales Deep Clone wird nicht vorgeschrieben.
- **Planentscheidung:** Slice zurueckgestellt.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-03 | Gemini | Forced-Sale-Steuerkonsistenz ungelöst | angenommen | eigener Slice 8 |
| G-07 | Gemini | Deep-Copy-Pflicht zur Vermeidung von Mutationen | teilweise angenommen | gezielte Ownership-Kopien |
