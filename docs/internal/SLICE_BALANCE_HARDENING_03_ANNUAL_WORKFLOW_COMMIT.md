# Slice Balance Hardening 03: Fail-safe Jahresprozess-Integration

**Feature-Branch:** `codex/balance-app-hardening`  
**GitHub-Status:** lokal; Remote-Pruefung am 2026-07-13 ergab keinen gleichnamigen Branch  
**Status:** geplant, Review/Freigabe ausstehend  
**Prioritaet:** P0  
**Abhaengigkeit:** Slice 02 freigegeben und gruen

## Ziel

Jahresupdate und Jahresabschluss verwenden denselben Periodenvertrag. Eine Snapshot-basierte Write-Ahead-/Recovery-Reihenfolge minimiert Teilmutationen und verhindert doppelte Jahresfortschreibung. Der Slice behauptet keine ACID-Atomaritaet ueber mehrere Storage-Keys.

## Akzeptanzkriterien

- Update-/Validierungsfehler brechen vor Snapshot und Mutation ab.
- Snapshot und erfolgreicher Persistenz-Flush liegen vor der ersten fachlichen Mutation.
- Alter, Bedarfe, Markthistorie und Ausgabenjahr werden gemeinsam genau einmal committed.
- Doppelklick und erneuter Aufruf derselben Periode sind idempotent.
- Teilfehler nach Snapshot erzeugen einen sichtbaren Recovery-Status und bewahren den Snapshot.
- Der bestaetigte UI-Text entspricht den tatsaechlichen Mutationen.
- Commit-Reihenfolge ist explizit: Preflight -> Pre-Mutation-Flush -> bestaetigter Snapshot -> sequentielle Writes -> Post-Write-Validierung -> finaler Flush.
- Schlaegt Snapshot-Erstellung oder Snapshot-Validierung fehl, beginnen keine fachlichen Writes.
- Schlaegt ein Write oder die Post-Write-Validierung fehl, wird `incomplete_recovery` persistiert, der Snapshot bleibt erhalten und weitere Jahresprozesse bleiben bis Recovery gesperrt.

## Scope

Programmdateien, maximal 5:

- `app/balance/balance-annual-orchestrator.js`
- `app/balance/balance-binder-snapshots.js`
- `app/balance/balance-binder.js`
- `app/balance/balance-main.js`
- `tests/balance-annual-workflow-contract.test.mjs`

## Nicht-Scope

- konkrete ETF-/Inflationsparser aus Slices 04/05;
- SnapshotArchive-Umbau;
- Engine-Semantik.

## Diff-Risiko vor Start

Planungs-Branch: `codex/balance-app-hardening`; vor Coding Branch/Status erneut dokumentieren.  
Aenderungstiefe: **riskant**.  
Gefaehrdete Tests: Annual Workflow, Binder Snapshots, Storage Contract, Browser Smoke.  
Nicht anfassen: `engine/`, Snapshot-Adapter, Ausgabenmetriken, `dist/`.  
Rollback: Scope-Dateien per `git checkout --`; keine neuen Programmdateien vorgesehen.

## Umsetzungsschritte

1. Jahresaktionen auf einen gemeinsamen Coordinator und Slice-02-Contract ausrichten.
2. `update()` fuer Abschlusskontext mit explizitem Erfolgs-/Fehlerergebnis nutzbar machen, ohne normalen UI-Fehlerpfad zu brechen.
3. Preflight, Flush, bestaetigten Snapshot, sequentielle Writes, Post-Write-Validierung und Post-Flush als pruefbare Reihenfolge implementieren.
4. In-Flight-Sperre und Perioden-Idempotenz ergaenzen.
5. Fehler vor/nach Commit und Wiederholungen als Contract-Tests abdecken.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-annual-period.test.mjs
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs
node tests\run-single.mjs tests\balance-storage-contract.test.mjs
npm test
npm run test:browser
```

## Durchgefuehrte Aenderungen

Noch keine.

## Ausgefuehrte Tests mit Ergebnis

Noch keine.

## Abweichungen vom Plan

Keine.

## Offene Risiken

- Multi-Key-ACID ist nicht erreichbar und nicht Ziel. Wenn `incomplete_recovery` oder der Recovery-Snapshot nicht verlaesslich persistiert werden kann, wird vor Implementierung gestoppt.
- Quota-Fehler beim Snapshot sind als eigener Pflichtfall zu testen; ohne Snapshot keine Mutation.
- UI- und Engine-Parameter duerfen nicht divergieren.

## Rueckdokumentation

Status, Commit-Reihenfolge und Recovery-Verhalten im Hauptplan dokumentieren.

## Freigabestatus

Nicht freigegeben.

## Review-Feedback von Gemini

Ausstehend.

## Review-Antworten von Codex

F-R05 wurde angenommen. Der Slice fordert keine ACID-Transaktion, sondern einen fail-safe Recovery-Contract mit bestaetigtem Snapshot vor sequentiellen Writes.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| - | - | Noch kein Review | offen | - |
| F-R05 | Hauptplan-Review | Multi-Key-Atomaritaet nicht garantierbar | angenommen | Titel, AK, Reihenfolge und Quota-Stop-Regel angepasst |
