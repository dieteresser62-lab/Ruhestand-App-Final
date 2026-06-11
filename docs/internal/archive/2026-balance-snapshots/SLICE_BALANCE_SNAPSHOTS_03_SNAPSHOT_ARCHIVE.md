# Slice Balance Snapshots 03: SnapshotArchive

**Stand:** 2026-06-03  
**Feature-Branch:** `codex-balance-snapshot-key-policy`  
**GitHub-Status:** nur lokal angelegt; keine Veroeffentlichung ohne Freigabe  
**Status:** abgeschlossen, nicht committed

## Ziel

Das runtime-neutrale Snapshot-Archivmodul als Basis fuer die spaeteren PersistenceFacade-, Tauri-/IndexedDB- und StorageManager-Slices anlegen.

## Scope

- `app/shared/snapshot-archive.js` mit kanonischem Snapshot-Schema, Validierung, ID-Erzeugung und Index-Erzeugung.
- Capture-Helfer, der die bestehende Snapshot-Key-Policy nutzt.
- Delegation an einen Storage-Vertrag mit `writeSnapshot()`, `readSnapshot()`, `listSnapshots()` und `deleteSnapshot()`.
- In-Memory-Fake-Storage-Test fuer den Archivvertrag.

## Nicht-Scope

- Kein StorageManager-Umbau.
- Keine Jahresabschluss-Reihenfolge.
- Keine PersistenceFacade-Snapshot-Methoden.
- Keine Tauri-, IndexedDB- oder localStorage-Adapteraenderung.
- Kein Legacy-Snapshot-Migrationspfad.

## Diff-Risiko-Block

```text
Geplante Dateien:
- app/shared/snapshot-archive.js
- tests/snapshot-archive.test.mjs
- tests/run-tests.mjs (nur falls Testliste manuell gepflegt ist)
- docs/internal/SLICE_BALANCE_SNAPSHOTS_03_SNAPSHOT_ARCHIVE.md
- docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md

Voraussichtliche Änderungstiefe:
- mittel

Gefährdete bestehende Tests:
- neue SnapshotArchive-Tests
- bestehende Persistenz-/Snapshot-Tests, falls der Archivvertrag versehentlich Live-Storage-Pfade berührt
- Gesamtsuite bleibt voraussichtlich wegen Slice-02-Red-Contract rot, bis Paket 7 umgesetzt ist

Nicht anfassen:
- engine.js
- dist/
- RuheStandSuite.exe
- Tauri-/IndexedDB-Adaptervertrag und StorageManager-Umbau; diese folgen in späteren Paketen

Rollback-Strategie:
- git checkout -- docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md
- git checkout -- tests/run-tests.mjs, falls geändert
- neu angelegte Dateien app/shared/snapshot-archive.js, tests/snapshot-archive.test.mjs und docs/internal/SLICE_BALANCE_SNAPSHOTS_03_SNAPSHOT_ARCHIVE.md nach Freigabe löschen, falls Rollback gewünscht ist
```

## Geplante Tests

```powershell
node tests\run-single.mjs tests\snapshot-archive.test.mjs
```

## Durchgefuehrte Aenderungen

- Neues Modul `app/shared/snapshot-archive.js` erstellt.
- Kanonische Konstanten fuer Schema-Version, Snapshot-Type und Snapshot-Kinds ergaenzt.
- `buildSnapshot()` erzeugt normalisierte Snapshots mit stabilem Archiv-Key und Default-`restoreScope`.
- `validateSnapshot()` prueft Schema, Typ, ID, `createdAt`, `records` und `recordCount`.
- `captureCurrentRecords()` nutzt `isAllowedSnapshotCaptureKey()` und nimmt keine Legacy-Snapshot- oder technischen Keys auf.
- Archivoperationen delegieren an den Storage-Vertrag, ohne Runtime-Details zu kennen.
- `toSnapshotIndexEntry()` liefert Listen-Metadaten ohne `records`.
- Neuer Test `tests/snapshot-archive.test.mjs` deckt Schema, Capture, Validierung, Index und Fake-Storage-Delegation ab.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\snapshot-archive.test.mjs` -> gruen.
- `node tests\run-single.mjs tests\snapshot-key-policy.test.mjs` -> gruen.
- `node tests\run-tests.mjs` -> erwartungsgemaess rot: 2005 Assertions gruen, bekannte rote Slice-02-Contract-Stelle in `tests/balance-annual-workflow-contract.test.mjs` bleibt offen, weil die Jahresabschluss-Reihenfolge erst in Paket 7 umgesetzt wird. Der neue `snapshot-archive.test.mjs` lief innerhalb der Gesamtsuite gruen.

## Abweichungen vom Plan

- Keine.

## Offene Risiken

- Die Default-`PersistenceFacade` hat die Snapshot-Methoden noch nicht; das ist erwarteter Scope von Paket 3.
- Die Gesamtsuite bleibt voraussichtlich rot, weil Slice 02 den Jahresabschluss-Contract bewusst vor der Implementierung umgestellt hat.

## Rueckdokumentation in die uebergeordnete Arbeitsplan-MD

- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md` markiert Paket 2 als abgeschlossen und verweist auf diese Slice-Datei.

## Freigabestatus

- Nicht freigegeben fuer Commit oder Push.
