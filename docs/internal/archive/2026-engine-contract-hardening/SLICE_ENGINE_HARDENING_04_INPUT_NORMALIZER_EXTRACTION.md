# Slice Engine Hardening 04: Input-Normalizer-Extraktion

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** zurueckgestellt - in diesem Vorhaben nicht starten  
**Aenderungsbereich:** Punkt 4 / Contract C4

## Ziel

Die nach den Fix-Slices stabilisierte Input-Normalisierung wird mechanisch aus `core.mjs` nach `engine/engine-input-normalizer.mjs` verschoben. Das neue Modul normalisiert und loest Aliasse; fachliche Validierung bleibt ausschliesslich im `InputValidator`.

## Ueberarbeitete Vorgehensweise

Dieser Slice ist nach Review nicht implementierungsreif. Vor einer Extraktion muss ein separater Refactoring-Plan Ownership fuer alle verschachtelten Input-Pfade festlegen. Vorgesehen ist kein pauschales Deep Clone, sondern: unveraenderte Teilbaeume nur lesen, jeden veraenderten verschachtelten Pfad neu aufbauen, Eingaben in Tests tief einfrieren und Non-Mutation beweisen. Dateiname und Modulname bleiben bis zu diesem spaeteren Plan unverbindliche Kandidaten.

## Akzeptanzkriterien

- Neues Modul exportiert eine reine Funktion `normalizeEngineInput(rawInput)`.
- Die Funktion mutiert `rawInput` und verschachtelte Eingabeobjekte nicht.
- Alle bisherigen Defaults, CAPE-Aliasse, Dynamic-Flex-Felder und Decumulation-Werte bleiben byte-/wertgleich.
- C1 fuer `aktuelleLiquiditaet` bleibt unveraendert.
- Unbekannte Decumulation-Modi behalten den vor Slice 4 freigegebenen Fallback.
- `_internal_calculateModel()` verwendet nur den neuen Normalizer.
- Keine Aenderung an `EngineAPI`, Policy-Reihenfolge, Schwellenwerten oder Ergebnisfeldern.

## Scope und Nicht-Scope

Scope: `engine/core.mjs`, neues `engine/engine-input-normalizer.mjs`, fokussierter Normalizer-Test, generiertes `engine.js`.

Nicht-Scope: Validator-Refactoring, neue Defaults, Feldumbenennungen, Bereinigung von Legacy-Modi oder weitere Core-Extraktionen.

## Git- und Diff-Risiko vor Coding

```text
Branch bei Planung: codex/engine-contract-hardening
Status bei Planung: fremde Aenderungen und Planungsdateien vorhanden

Geplante Dateien:
- engine/core.mjs
- engine/engine-input-normalizer.mjs (neu)
- tests/core-negative-contracts.test.mjs oder neue einzelne Normalizer-Testdatei
- engine.js (generiert)

Voraussichtliche Aenderungstiefe:
- mittel, mechanische Extraktion

Gefaehrdete bestehende Tests:
- core-negative-contracts
- dynamic-flex/longevity
- 3-bucket contracts
- worker parity

Nicht anfassen:
- InputValidator-Semantik
- CONFIG-Werte
- minimumFlexAnnual-Semantik
- dist/ und EXE

Rollback-Strategie:
- git checkout -- engine/core.mjs tests/core-negative-contracts.test.mjs engine.js
- neue Datei engine/engine-input-normalizer.mjs nur nach Freigabe entfernen
```

Vor Coding Branch/Status aktualisieren. Wenn eine neue Testdatei statt der bestehenden verwendet wird, ist sie im finalen Scope zu dokumentieren.

## Geplante Tests

```text
node tests/run-single.mjs tests/core-negative-contracts.test.mjs
node tests/run-single.mjs tests/core-engine.test.mjs
node tests/run-single.mjs tests/longevity-engine-runner.test.mjs
node tests/run-single.mjs tests/3bucket-config.test.mjs
npm run build:engine
npm test
```

Zusaetzlich Non-Mutation und Deep-Equality der normalisierten Ergebnisse vor/nach Extraktion mit synthetischen Inputs.

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Flache Kopie von `rawInput` schuetzt verschachtelte `decumulation`-Objekte nur, wenn das neue Modul diese ebenfalls neu aufbaut.
- Der Export darf nicht versehentlich Teil der oeffentlichen `EngineAPI` werden.

## Rueckdokumentation

Modulstruktur in Hauptplan und `engine/README.md` aktualisieren.

## Freigabestatus

- [x] In diesem Vorhaben zurueckgestellt
- [ ] Separater Refactoring-Plan freigegeben
- [ ] Branch-/Statuscheck
- [ ] verhaltensneutrale Extraktion
- [ ] Build und Full Suite gruen
- [ ] Gemini-/Nutzerreview

## Review-Feedback von Gemini

### 1. Prüfdimensionen
- **Korrektheit vs. Akzeptanzkriterien:** Der Input-Normalizer darf das Eingabeobjekt `rawInput` nicht mutieren. Da dieses Objekt jedoch verschachtelte Strukturen (wie `decumulation` oder Profile) enthalten kann, reicht ein flacher Klon (`Object.assign` oder Spread-Operator) nicht aus. Jede Mutation an tieferliegenden Pfaden würde sich rückwirkend auf den Aufrufer auswirken. Eine Deep-Copy-Strategie ist zwingend vorzuschreiben (siehe Finding **G-07**).
- **Vertragstreue:** Die Normalisierungsfunktion darf nicht versehentlich in die öffentliche `EngineAPI` exportiert werden, um Verkopplungen zu vermeiden.

### 2. Findings (Gemini)
- **G-07 (Hoch):** Deep-Copy-Pflicht zur Vermeidung von Referenz-Mutationen (Shallow-Copy-Risiko bei verschachtelten Objekten).

### 3. Pre-Mortem
Angenommen, dieser Slice verursacht in 3 Monaten einen Fehler: Die UI ruft die Engine auf und übergibt die Eingaben. Der Normalizer ändert die inneren Werte (z. B. decumulation). Da die UI dieselbe Objekt-Referenz im State hält, ändert sich unbemerkt das UI-Modell der Decumulation, was zu fehlerhaften Eingabedarstellungen führt.

### 4. Review-Ergebnis
- **Status:** blockiert
- **Blocker:** G-07
- **Restrisiken:** Keine

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

- **G-07/F-S04-02 teilweise angenommen:** Das Mutationsrisiko ist real. Eine pauschale Deep-Copy-Pflicht wird jedoch nicht uebernommen; sie kann Funktionen/Identitaeten unnoetig kopieren und Performance verschlechtern. Gefordert wird spaeter Ownership-by-construction plus Deep-Freeze-/Non-Mutation-Test.
- **F-S04-01 angenommen:** Der Modulname wird erst im separaten Refactoring-Plan verbindlich festgelegt.
- **Planentscheidung:** Slice zurueckgestellt; keine Implementierung in diesem Vorhaben.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-07 | Gemini | Deep-Copy-Pflicht zur Vermeidung von Mutationen | teilweise angenommen | Ownership/gezielte Kopien statt pauschalem Deep Clone |
| F-S04-01 | Claude | Modulname inkonsistent | angenommen | spaeterer Plan legt Namen fest |
| F-S04-02 | Claude | Shallow-Copy-Risiko | angenommen | Deep-Freeze-/Non-Mutation-Gate |
