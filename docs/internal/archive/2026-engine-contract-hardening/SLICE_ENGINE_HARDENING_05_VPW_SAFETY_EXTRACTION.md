# Slice Engine Hardening 05: VPW-Safety-State-Extraktion

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** zurueckgestellt - in diesem Vorhaben nicht starten  
**Aenderungsbereich:** Punkt 4 / Contract C4

## Ziel

Die rein zustandsbezogenen VPW-Safety-Helfer werden aus `core.mjs` nach `engine/vpw-safety-state.mjs` extrahiert, ohne Safety-Semantik oder Diagnosefelder zu aendern.

## Ueberarbeitete Vorgehensweise

Vor einer Extraktion muss in einem separaten Refactoring-Plan zuerst eine gruen laufende Mehrjahres-Golden-Sequence fuer Eskalation, Deeskalation und Reentry entstehen. State-Ownership wird durch neue Rueckgabeobjekte und Deep-Freeze-Tests abgesichert; ein pauschaler Deep Clone ist nicht vorgeschrieben.

## Akzeptanzkriterien

- Neues Modul kapselt Stage-Sanitizing, State-Load, effektive Dynamic-Flex-Einstellungen, Safety-Signale und State-Transition.
- Stages `0..MAX_STAGE`, Risk-/Stable-Streaks und Reentry-Restjahre bleiben identisch.
- Go-Go-Unterdrueckung, Stage-2-Static-Flex und Reentry-Ramp bleiben wertgleich.
- Keine Aenderung an `CONFIG.SPENDING_MODEL.DYNAMIC_FLEX_SAFETY`.
- `newState`- und `ui.vpw`-Felder bleiben fuer identische Inputs identisch.
- Kein Zugriff des neuen Moduls auf DOM, Storage oder globale Objekte.

## Scope und Nicht-Scope

Scope: `engine/core.mjs`, neues `engine/vpw-safety-state.mjs`, bestehender VPW-/Core-Test, generiertes `engine.js`.

Nicht-Scope: neue Safety-Stufe, andere Eskalationsschwellen, Aenderung von VPW Return Policy, Longevity oder SpendingPlanner.

## Git- und Diff-Risiko vor Coding

```text
Branch bei Planung: codex/engine-contract-hardening
Status bei Planung: fremde Aenderungen und Planungsdateien vorhanden

Geplante Dateien:
- engine/core.mjs
- engine/vpw-safety-state.mjs (neu)
- tests/vpw-dynamic-flex.test.mjs oder tests/core-engine.test.mjs
- engine.js (generiert)

Voraussichtliche Aenderungstiefe:
- mittel bis riskant wegen Mehrjahres-State

Gefaehrdete bestehende Tests:
- vpw-dynamic-flex
- dynamic-flex horizon/longevity
- worker parity
- simulator backtest/monte-carlo

Nicht anfassen:
- CONFIG-Schwellen
- Spending-Policy-Reihenfolge
- minimumFlexAnnual
- MarketAnalyzer
- dist/ und EXE

Rollback-Strategie:
- git checkout -- engine/core.mjs tests/vpw-dynamic-flex.test.mjs tests/core-engine.test.mjs engine.js
- neue Datei engine/vpw-safety-state.mjs nur nach Freigabe entfernen
```

Vor Coding Branch/Status und gewaehlte Testdatei aktualisieren.

## Geplante Tests

```text
node tests/run-single.mjs tests/vpw-dynamic-flex.test.mjs
node tests/run-single.mjs tests/dynamic-flex-horizon.test.mjs
node tests/run-single.mjs tests/longevity-engine-runner.test.mjs
node tests/run-single.mjs tests/worker-parity.test.mjs
node tests/run-single.mjs tests/simulator-backtest.test.mjs
npm run build:engine
npm test
```

Mehrjahres-Golden-Sequence: normal -> kritischer Streak -> Stage 1 -> Stage 2 -> stabile Deeskalation -> Reentry -> Stage 0.

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Off-by-one bei Reentry-Restjahren.
- Versehentliche Abhaengigkeit von Core-lokalen Stage-Labels.

## Rueckdokumentation

Modul und State-Ownership im Hauptplan sowie `engine/README.md` dokumentieren.

## Freigabestatus

- [x] In diesem Vorhaben zurueckgestellt
- [ ] Separater Refactoring-Plan freigegeben
- [ ] Branch-/Statuscheck
- [ ] Mehrjahresparitaet belegt
- [ ] Build und Full Suite gruen
- [ ] Gemini-/Nutzerreview

## Review-Feedback von Gemini

### 1. Prüfdimensionen
- **Korrektheit vs. Akzeptanzkriterien:** Das Kapseln des VPW-Safety-States darf keine geteilten Referenzen erzeugen. Das VPW-Safety-Modul liest den Zustand und schreibt Zustandsänderungen fort. Hierbei muss sichergestellt werden, dass der Safety-State nicht per Referenz geteilt und mutiert wird. Alle Zustandsobjekte müssen tiefenkopiert werden, um Nebeneffekte über mehrere Jahre hinweg zu verhindern (siehe Finding **G-07**).
- **Vertragstreue:** Die Schnittstelle muss streng entkoppelt sein. Es darf kein direkter Zugriff auf globale Einstellungen erfolgen.

### 2. Findings (Gemini)
- **G-07 (Hoch):** Deep-Copy-Pflicht zur Vermeidung von Referenz-Mutationen im Mehrjahres-State.

### 3. Pre-Mortem
Angenommen, dieser Slice verursacht in 3 Monaten einen Fehler: Bei der Sequenzberechnung über 30 Jahre hinweg teilt das neue Modul versehentlich ein inneres State-Objekt der Safety-Parameter. In Jahr 5 wird eine Deeskalation ausgelöst, die das State-Objekt verändert. Durch die geteilte Referenz wird rückwirkend der logische Zustand von Jahr 1–4 im Ergebnis-Array manipuliert, was zu falschen Diagnose-Logs führt.

### 4. Review-Ergebnis
- **Status:** blockiert
- **Blocker:** G-07
- **Restrisiken:** Keine

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

- **G-07 teilweise angenommen:** Referenzmutation wird spaeter durch Ownership-by-construction, neue State-Objekte und Deep-Freeze-Tests verhindert, nicht durch blindes Deep-Cloning.
- **F-S05-01 angenommen:** Golden Sequence muss vor der Extraktion als Charakterisierungstest existieren.
- **Planentscheidung:** Slice zurueckgestellt; keine Implementierung in diesem Vorhaben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-07 | Gemini | Deep-Copy-Pflicht zur Vermeidung von Mutationen | teilweise angenommen | State-Ownership und Deep-Freeze-Gate |
| F-S05-01 | Claude | Safety-State Golden Sequence fehlt | angenommen | Voraussetzung eines spaeteren Plans |
