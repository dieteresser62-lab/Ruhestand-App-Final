# Slice Tranchenmanagement 01: Test-Gate und Baseline

**Feature-Branch:** `codex/tranchenmanagement-hardening`
**GitHub-Status:** lokal; Veröffentlichung ausstehend
**Status:** geplant – Planreview ausstehend
**Abhängigkeit:** freigegebener [Hauptplan](./TRANCHENMANAGEMENT_HARDENING_PLAN.md)
**GAPs:** TM-16, vorbereitend TM-17

## Ziel

Der Standardrunner darf eine entdeckte Testdatei nicht allein wegen eines erfolgreichen Imports als ausgeführt melden. DOM-nahe Tests erhalten einen expliziten Isolationsvertrag und laufen im Standardgate tatsächlich mit Assertions oder werden als separates Pflichtgate eindeutig ausgewiesen.

## Akzeptanzkriterien

- `tranchen-manager-page.test.mjs` führt im Standardgate seine Assertions in einem isolierten Prozess aus.
- Global verunreinigende Tests teilen keinen Prozess mit DOM-freien Tests.
- Eine entdeckte Testdatei mit null Assertions führt zu einem Fehler, sofern sie nicht in einer expliziten, begründeten Policy als separates Gate geführt wird.
- Der Runner berichtet pro Datei Modus und Assertionzahl nachvollziehbar.
- `npm test` bleibt deterministisch, beendet alle Kindprozesse und meldet keine offenen Handles.
- Die Coverage-Baseline wird neu erzeugt und dokumentiert; eine Prozentzielzahl allein ist kein Akzeptanzkriterium.
- Keine Produktivsemantik wird verändert.

## Scope

- Ausführungs- und Isolationspolicy des Node-Test-Runners.
- Bestehende `shouldRun()`-Tests in eine explizite Runnerstrategie überführen.
- Regressionstest gegen assertionslose False-Green-Dateien.
- Testdokumentation aktualisieren.

## Nicht-Scope

- Keine Manager-, Persistenz-, Engine- oder UI-Änderung.
- Keine Browser-E2E-Erweiterung; sie folgt in Slice 09.
- Keine pauschale Coverage-Mindestquote.

## Geplante Programmdateien

Maximal fünf:

- `tests/run-tests.mjs`
- `tests/tranchen-manager-page.test.mjs`
- `tests/profile-ui-contract.test.mjs`
- `tests/coverage-inventory.test.mjs`
- optional neu: `tests/test-execution-policy.test.mjs`

Dokumentation: `tests/README.md`, diese Slice-MD und Hauptplan.

## Git- und Diff-Risiko vor Coding

Die folgenden Werte sind **nicht** vorwegzunehmen. Unmittelbar vor dem ersten Code-Edit müssen hier reale Ausgaben ergänzt werden:

```text
git branch --show-current: AUSSTEHEND
git status --short: AUSSTEHEND
```

Geplante Dateien:

- ausschließlich die oben genannten Test-/Runnerdateien und Markdown-Dokumentation.

Voraussichtliche Änderungstiefe:

- mittel; Testorchestrierung und Kindprozess-Lebenszyklus.

Gefährdete bestehende Tests:

- gesamte `npm test`-Ausführung,
- DOM-nahe Profil-/Balance-/Simulator-Orchestrierungstests,
- Open-Handle-Erkennung.

Nicht anfassen:

- `app/`, `engine/`, `workers/`, `src-tauri/`, `engine.js`, `dist/`, `RuheStandSuite.exe`, `node_modules/`.

Rollback-Strategie:

- geänderte Runnerdateien gezielt auf den letzten freigegebenen Slice-Commit zurücksetzen; neue Policy-Testdatei nur nach Freigabe entfernen.

## Geplante Tests

```powershell
node tests/run-single.mjs tests/test-execution-policy.test.mjs
node tests/run-single.mjs tests/tranchen-manager-page.test.mjs
node tests/run-single.mjs tests/profile-ui-contract.test.mjs
npm test
npm run test:coverage
```

Wenn keine neue Policy-Testdatei nötig ist, wird der erste Befehl entfallen und in den Abweichungen begründet.

## Ergebnisse

Noch nicht umgesetzt.

## Durchgeführte Änderungen

Noch nicht umgesetzt.

## Ausgeführte Tests

Noch nicht umgesetzt.

## Abweichungen vom Plan

Keine; Umsetzung ausstehend.

## Offene Risiken

- Kindprozessausführung kann Laufzeit und Fehlermeldungsaggregation verändern.
- Einige bestehende Tests könnten bewusst als Import-only aufgebaut sein; jede Ausnahme benötigt eine explizite Begründung statt einer stillen Allowlist.

## Rückdokumentation

- Assertionzahlen, Isolationspolicy und neue Coverage-Baseline in Hauptplan und `tests/README.md` eintragen.

## Freigabestatus

Nicht freigegeben. Planreview und spätere Implementierungsprüfung durch Gemini/Nutzer ausstehend.

## Review-Feedback von Gemini

Ausstehend: Prüfdimensionen, Findings, Pre-Mortem, Ergebnis.

## Review-Feedback von Claude

Ausstehend: Prüfdimensionen, Findings, Pre-Mortem, Ergebnis.

## Review-Antworten von Codex

Ausstehend.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
| --- | --- | --- | --- | --- |
| - | - | Noch kein Review | offen | - |
