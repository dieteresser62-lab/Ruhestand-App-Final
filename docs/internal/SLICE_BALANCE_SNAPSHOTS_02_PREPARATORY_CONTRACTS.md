# Slice Balance Snapshots 02: Nachgeholte vorbereitende Contracts

**Stand:** 2026-06-02  
**Feature-Branch:** `codex-balance-snapshot-key-policy`  
**GitHub-Status:** nur lokal angelegt; keine Veroeffentlichung ohne Freigabe  
**Status:** abgeschlossen, erwartungsgemaess rot

## Ziel

Die alte 0-basierte Vorarbeit aus `Paket 0` nachholen: Jahresabschluss-Contracts auf die Zielreihenfolge umstellen und Fehlerpfade absichern, bevor weitere Implementierungsslices auf SnapshotArchive, PersistenceFacade oder StorageManager aufbauen.

## Scope

- Bestehenden Jahresabschluss-Contract auf Vorab-Flush und Snapshot-vor-Mutation umstellen.
- Contract fuer Snapshot-Fehler ergaenzen: kein Inflation-/Jahresabschluss-Mutationspfad, kein Ausgaben-Rollover, kein Erfolgsrendering.

## Nicht-Scope

- Keine Implementierung der neuen Jahresabschluss-Reihenfolge.
- Kein SnapshotArchive.
- Kein PersistenceFacade-, IndexedDB-, Tauri- oder StorageManager-Umbau.
- Keine weitere Key-Policy-Implementierung; diese wurde bereits in Slice 1 erledigt.

## Diff-Risiko-Block

```text
Geplante Dateien:
- tests/balance-annual-workflow-contract.test.mjs
- docs/internal/SLICE_BALANCE_SNAPSHOTS_02_PREPARATORY_CONTRACTS.md
- docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md
- docs/internal/SLICE_BALANCE_SNAPSHOTS_01_KEY_POLICY.md

Voraussichtliche Änderungstiefe:
- klein bis mittel

Gefährdete bestehende Tests:
- tests/balance-annual-workflow-contract.test.mjs wird nach dieser Contract-Umstellung erwartungsgemäß fehlschlagen, bis die Jahresabschluss-Reihenfolge implementiert ist.
- npm test wird dadurch ebenfalls erwartungsgemäß fehlschlagen.

Nicht anfassen:
- engine.js
- dist/
- RuheStandSuite.exe
- StorageManager-, SnapshotArchive-, Tauri- oder IndexedDB-Implementierung; dieser Nachholschritt ist nur Contract/Doku.

Rollback-Strategie:
- git checkout -- tests/balance-annual-workflow-contract.test.mjs docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md docs/internal/SLICE_BALANCE_SNAPSHOTS_01_KEY_POLICY.md
- neu angelegte Slice-Datei docs/internal/SLICE_BALANCE_SNAPSHOTS_02_PREPARATORY_CONTRACTS.md nach Freigabe loeschen, falls Rollback gewuenscht ist
```

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
```

Erwartung: Der Test schlaegt gezielt fehl, weil die Implementierung derzeit noch vor dem Snapshot mutiert.

## Durchgefuehrte Aenderungen

- `tests/balance-annual-workflow-contract.test.mjs` erwartet jetzt:
  - `flushLiveState` vor Snapshot-Erstellung.
  - Snapshot-Erstellung vor `applyAnnualInflation()` und `debouncedUpdate()`.
  - Snapshot-Fehler bricht den Jahresabschluss ohne Mutation, Ausgaben-Rollover und Erfolgsrendering ab.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs` -> erwartungsgemaess fehlgeschlagen.
- Fehlstelle: Test 2 erwartet `flushLiveState|createSnapshot|toast:...|applyAnnualInflation|debouncedUpdate`, die aktuelle Implementierung liefert `applyAnnualInflation|debouncedUpdate|timeout:300|createSnapshot|toast:...`.
- Interpretation: Der Contract ist rot, weil die aktuelle Jahresabschluss-Implementierung den Snapshot weiterhin nach der Mutation erstellt. Das ist der gewuenschte Red-State fuer diesen vorbereitenden Contract.

## Abweichungen vom Plan

- Diese Vorarbeit wurde nach Slice 1 nachgezogen, weil der alte Arbeitsplan 0-basiert nummeriert war. Die Datei nutzt bewusst `02`, damit keine neue `00`- oder `0`-Nummer entsteht.

## Offene Risiken

- Bis die Jahresabschluss-Reihenfolge implementiert ist, bleibt `tests/balance-annual-workflow-contract.test.mjs` rot und damit auch die Gesamtsuite.

## Rueckdokumentation in die uebergeordnete Arbeitsplan-MD

- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md` dokumentiert die nachgezogene Contract-Slice und ihren erwartungsgemaess roten Status.

## Freigabestatus

- Nicht freigegeben fuer Commit oder Push.
