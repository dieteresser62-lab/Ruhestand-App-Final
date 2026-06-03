# Slice Balance Snapshots 04: PersistenceFacade-Adaptervertrag

**Stand:** 2026-06-03  
**Feature-Branch:** `codex-balance-snapshot-key-policy`  
**GitHub-Status:** nur lokal angelegt; keine Veroeffentlichung ohne Freigabe  
**Status:** abgeschlossen, nicht committed

## Ziel

Die Persistenz-Fassade um den Snapshot-Adaptervertrag und einen Restore-tauglichen Live-Record-Ersetzungspfad erweitern, damit die spaeteren Tauri-, IndexedDB- und StorageManager-Slices gegen eine stabile Fassade arbeiten.

## Scope

- `PersistenceFacade` exportiert `listSnapshots()`, `readSnapshot()`, `writeSnapshot()`, `deleteSnapshot()` und `migrateLegacySnapshotsIfNeeded()`.
- Snapshot-Methoden delegieren an Adaptermethoden, wenn der aktive Adapter sie anbietet.
- localStorage bekommt nur als Legacy-/Fallback-Pfad ein separates internes Snapshot-Archiv.
- `replaceLiveRecords()` berechnet gefilterte Delete-/Upsert-Sets und haelt Cache und Adapter bei Fake-Adapter-Fehlern rollbackfaehig.
- Contract-Tests fuer Delegation, localStorage-Fallback und Live-Replace.

## Nicht-Scope

- Keine Tauri-Snapshot-Datei und keine Rust-Target-Parametrisierung.
- Kein IndexedDB-Store `snapshots` und kein DB-Version-Upgrade.
- Kein StorageManager-Umbau.
- Keine Jahresabschluss-Reihenfolge.
- Keine Legacy-Snapshot-Migration ausser neutralem Facade-Report im localStorage-Fallback.

## Diff-Risiko-Block

```text
Geplante Dateien:
- app/shared/persistence-facade.js
- tests/persistence.test.mjs
- docs/internal/SLICE_BALANCE_SNAPSHOTS_04_PERSISTENCE_FACADE_CONTRACT.md
- docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md

Voraussichtliche Änderungstiefe:
- mittel

Gefährdete bestehende Tests:
- tests/persistence.test.mjs
- tests/snapshot-archive.test.mjs, weil SnapshotArchive ab jetzt gegen die echte Facade laufen kann
- Gesamtsuite bleibt voraussichtlich wegen der bekannten Slice-02-Jahresabschluss-Contract-Stelle rot, bis Paket 7 umgesetzt ist

Nicht anfassen:
- engine.js
- dist/
- RuheStandSuite.exe
- Tauri- und IndexedDB-Adapterimplementierungen; deren echte Snapshot-Backends folgen in Paket 4/5
- Balance StorageManager und Jahresabschluss-Reihenfolge; das folgt in Paket 6/7

Rollback-Strategie:
- git checkout -- app/shared/persistence-facade.js tests/persistence.test.mjs docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md
- neu angelegte Slice-Datei docs/internal/SLICE_BALANCE_SNAPSHOTS_04_PERSISTENCE_FACADE_CONTRACT.md nach Freigabe löschen, falls Rollback gewünscht ist
```

## Geplante Tests

```powershell
node tests\run-single.mjs tests\persistence.test.mjs
node tests\run-single.mjs tests\snapshot-archive.test.mjs
node tests\run-single.mjs tests\snapshot-key-policy.test.mjs
node tests\run-tests.mjs
```

## Durchgefuehrte Aenderungen

- Snapshot-Adaptermethoden in `app/shared/persistence-facade.js` ergaenzt und exportiert.
- Adapterdelegation fuer Snapshot-Liste, Lesen, Schreiben, Loeschen und Legacy-Migration ergaenzt.
- localStorage-Fallback speichert Snapshots unter `rs_snapshot_archive_v1` als separates Archivobjekt statt als einzelne Live-Snapshot-Records.
- `replaceLiveRecords()` ergaenzt, inklusive `allowKey`-Filter, Vorab-Flush, Adapterdelegation, generischem `saveBatch()`-Fallback und Cache-Rollback bei Fehler.
- `tests/persistence.test.mjs` um Contract-Tests fuer Snapshot-Delegation, localStorage-Fallback und `replaceLiveRecords()` erweitert.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\persistence.test.mjs` -> gruen.
- `node tests\run-single.mjs tests\snapshot-archive.test.mjs` -> gruen.
- `node tests\run-single.mjs tests\snapshot-key-policy.test.mjs` -> gruen.
- `node tests\run-tests.mjs` -> erwartungsgemaess rot: 2027 Assertions gruen, bekannte rote Slice-02-Contract-Stelle in `tests/balance-annual-workflow-contract.test.mjs` bleibt offen, weil die Jahresabschluss-Reihenfolge erst in Paket 7 umgesetzt wird. Die neuen PersistenceFacade-Contract-Tests liefen innerhalb der Gesamtsuite gruen.

## Abweichungen vom Plan

- Keine.

## Offene Risiken

- Tauri und IndexedDB werfen fuer Snapshot-Methoden weiterhin klare Adaptervertragsfehler, bis Paket 4 und Paket 5 die echten Backends implementieren.
- Der localStorage-Fallback ist nur Legacy-/Fallback-Ablage und nicht Zielarchitektur.
- Die Gesamtsuite bleibt voraussichtlich rot, weil Slice 02 den Jahresabschluss-Contract bewusst vor der Implementierung umgestellt hat.

## Rueckdokumentation in die uebergeordnete Arbeitsplan-MD

- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md` markiert Paket 3 als abgeschlossen und verweist auf diese Slice-Datei.

## Freigabestatus

- Nicht freigegeben fuer Commit oder Push.
