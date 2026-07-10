# Slice Engine Hardening 07: Result-Builder und Dokumentations-Gates

**Feature-Branch:** `codex/engine-contract-hardening`  
**GitHub-Status:** nur lokal; Push ausstehend  
**Plan:** [ENGINE_CONTRACT_HARDENING_PLAN.md](ENGINE_CONTRACT_HARDENING_PLAN.md)  
**Status:** zurueckgestellt - in diesem Vorhaben nicht starten  
**Aenderungsbereich:** Punkt 4 / Contract C4, Abschlussdokumentation

## Ziel

Finale UI-, Diagnose- und State-Komposition wird aus `core.mjs` nach `engine/engine-result-builder.mjs` verschoben. Danach werden Architektur, Moduluebersichten, Contracts und Testergebnisse widerspruchsfrei dokumentiert.

## Ueberarbeitete Vorgehensweise

Der geplante Result-Builder mischt Formatierung mit Reentry-, Runway- und Guardrail-Logik und wird deshalb nicht extrahiert. Doku-Sync fuer die aktiven Slices erfolgt jeweils in deren Rueckdokumentation. Ein spaeterer Plan muss zuerst fachliche Entscheidungen aus dem Result-Aufbau in ihre Owner-Module verschieben oder die Extraktion verwerfen.

## Akzeptanzkriterien

- Neues Modul baut Result- und Diagnoseobjekte ohne eigene Fachentscheidung.
- `EngineAPI.simulateSingleYear()` behaelt Signatur und Fehlercontract.
- Alle oeffentlichen `input`, `newState`, `diagnosis`- und `ui`-Felder bleiben erhalten.
- Runway-, VPW-, Tax- und Market-Data-Diagnosen muessten in einem spaeteren Plan gegen dessen freigegebene Baseline wertgleich bleiben.
- `core.mjs` bleibt Orchestrator; es wird kein generischer Service-Locator oder neuer globaler State eingefuehrt.
- README, technische Referenz, Engine-Moduluebersicht und Tests-README beschreiben die tatsaechliche Architektur und C1-C3.
- Keine generierten Release-Artefakte ausser `engine.js` werden angefasst.

## Scope und Nicht-Scope

Programmdateien maximal:

- `engine/core.mjs`,
- neues `engine/engine-result-builder.mjs`,
- `tests/core-engine.test.mjs`,
- `engine.js`.

Dokumente koennen zusaetzlich umfassen: `engine/README.md`, `docs/reference/TECHNICAL.md`, `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`, `tests/README.md`, Hauptplan und diese Slice-Datei. Bestehende fremde Aenderungen in denselben Dokumenten muessen erhalten und vor Edit auf Konflikt geprueft werden.

Nicht-Scope: UI-Redesign, weitere Modulzerlegung, Feldmigration, Release-Build oder Archivierung vor Freigabe.

## Git- und Diff-Risiko vor Coding

```text
Branch bei Planung: codex/engine-contract-hardening
Status bei Planung: mehrere bereits geaenderte Referenzdokumente und Planungsdateien vorhanden

Geplante Programmdateien:
- engine/core.mjs
- engine/engine-result-builder.mjs (neu)
- tests/core-engine.test.mjs
- engine.js (generiert)

Geplante Dokumente:
- engine/README.md
- docs/reference/TECHNICAL.md
- docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md
- tests/README.md
- docs/internal/ENGINE_CONTRACT_HARDENING_PLAN.md
- diese Slice-Datei

Voraussichtliche Aenderungstiefe:
- mittel; erhoehtes Merge-Risiko in bereits geaenderten Dokumenten

Gefaehrdete bestehende Tests:
- core-engine und UI-Shape Contracts
- diagnosis/log columns
- docs contract tests

Nicht anfassen:
- fachliche Engine-Berechnungen
- Balance-/Simulator-Renderer
- dist/, Tauri und EXE
- fremde Dokumentationsaenderungen

Rollback-Strategie:
- git checkout -- engine/core.mjs tests/core-engine.test.mjs engine.js
- Doku-Rollback nur selektiv nach Diff-Pruefung, keine pauschale Wiederherstellung
- neue Datei engine/engine-result-builder.mjs nur nach Freigabe entfernen
```

Vor Coding muessen Branch, voller Status und Konfliktrisiko der bereits geaenderten Doku neu dokumentiert werden.

## Geplante Tests

```text
node tests/run-single.mjs tests/core-engine.test.mjs
node tests/run-single.mjs tests/core-negative-contracts.test.mjs
node tests/run-single.mjs tests/core-tax-settlement.test.mjs
node tests/run-single.mjs tests/balance-diagnosis-copy-contract.test.mjs
node tests/run-single.mjs tests/simulator-log-columns.test.mjs
node tests/run-single.mjs tests/longevity-optimizer-docs.test.mjs
npm run build:engine
npm test
```

Zusaetzlich strukturierter Vorher-/Nachher-Vergleich eines Standard-, Bear-, Dynamic-Flex-, LossCarry- und Missing-Market-Resultats.

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Bereits geaenderte Referenzdokumente koennen aus anderem Scope stammen; unerwartete Ueberschneidung blockiert den Doku-Edit.
- Result-Aufbau enthaelt heute noch kleine fachliche Fallbacks; diese duerfen nicht unbemerkt als reine Formatierung extrahiert werden.

## Rueckdokumentation und Abschluss

- Alle Slice-Status im Hauptplan aktualisieren.
- Tatsaechliche Modulstruktur und Contracts dokumentieren.
- Restrisiken und bewusst nicht geloeste Punkte aufnehmen.
- Erst nach Gemini- und Nutzerfreigabe lokalen Commit durch den vorgesehenen Reviewer zulassen.
- Push bleibt bis zur ausdruecklichen Nutzerfreigabe ausstehend.

## Freigabestatus

- [x] In diesem Vorhaben zurueckgestellt
- [ ] Separater Refactoring-Plan freigegeben
- [ ] Branch-/Statuscheck
- [ ] Result-Paritaet belegt
- [ ] Doku-Sync abgeschlossen
- [ ] Build und Full Suite gruen
- [ ] Gemini-Review
- [ ] Nutzerfreigabe
- [ ] Hauptplan auf abgeschlossen gesetzt

## Review-Feedback von Gemini

### 1. Prüfdimensionen
- **Korrektheit vs. Akzeptanzkriterien:** Der Result-Builder darf keine fachliche Logik oder Korrektur-Fallbacks implementieren, die eigentlich in die Berechnungsmodule (wie `transaction-settlement` oder `vpw-safety-state`) gehören. Alle an die UI ausgespielten Objekte müssen vollständig entkoppelt sein. Da der Result-Builder die finale Struktur für den Browser aufbereitet, müssen alle ausgehenden Felder tiefenkopiert werden, um jede spätere Modifikation im Frontend oder im Simulator-Loop zu verhindern (siehe Finding **G-07**).
- **Vertragstreue:** Die Signatur der `EngineAPI` darf unter keinen Umständen verändert werden.

### 2. Findings (Gemini)
- **G-07 (Hoch):** Deep-Copy-Pflicht zur Vermeidung von Referenz-Mutationen bei finaler UI- und Diagnosestruktur.

### 3. Pre-Mortem
Angenommen, dieser Slice verursacht in 3 Monaten einen Fehler: Die UI führt ein Diagramm-Rendering durch, bei dem bestimmte Arrays in der Diagnose sortiert oder modifiziert werden. Da der Result-Builder die Referenzen aus dem Engine-State direkt durchgereicht hat, führt diese UI-Sortierung zu einer Manipulation des internen Engine-Zustands für nachfolgende Iterationen, was sporadische Berechnungsfehler im Hintergrund erzeugt.

### 4. Review-Ergebnis
- **Status:** blockiert
- **Blocker:** G-07
- **Restrisiken:** Keine

## Review-Feedback von Claude

Noch offen.

## Review-Antworten von Codex

- **F-S07-01 angenommen:** Der Result-Aufbau ist derzeit nicht rein; die Extraktion wird verworfen/zurueckgestellt.
- **G-07 teilweise angenommen:** UI-Objekt-Ownership ist spaeter gezielt zu spezifizieren. Ein Deep Clone des gesamten Resultats wird wegen Kosten und Identitaetssemantik nicht vorab vorgeschrieben.
- **Planentscheidung:** Slice zurueckgestellt; Doku-Gates wandern in die aktiven Slices und den Hauptplan.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-07 | Gemini | Deep-Copy-Pflicht zur Vermeidung von Mutationen | teilweise angenommen | spaetere Ownership-Spezifikation |
| F-S07-01 | Claude | Result-Builder enthaelt Fachlogik | angenommen | Extraktion zurueckgestellt |
