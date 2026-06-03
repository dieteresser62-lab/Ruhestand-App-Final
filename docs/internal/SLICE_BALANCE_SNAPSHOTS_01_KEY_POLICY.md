# Slice Balance Snapshots 01: Key-Policy

**Stand:** 2026-06-02  
**Feature-Branch:** `codex-balance-snapshot-key-policy`  
**GitHub-Status:** nur lokal angelegt; keine Veroeffentlichung ohne Freigabe  
**Status:** abgeschlossen, nicht committed

## Ziel

Snapshot-spezifische Key-Policy-Funktionen fuer Capture und Restore implementieren, damit spaetere Archiv- und Restore-Slices keine Snapshot-Archivdaten in Live-Snapshots aufnehmen und im Standard-Restore keine Profil-Registry blind ueberschreiben.

## Scope

- Neue Snapshot-Policy-Funktionen in `app/shared/persistence-key-policy.js`.
- Tests fuer Capture, Restore, Profil-Registry, Legacy-Snapshot-Keys und technische Keys.

## Nicht-Scope

- Kein SnapshotArchive.
- Kein PersistenceFacade-Adaptervertrag.
- Kein StorageManager-, IndexedDB- oder Tauri-Umbau.
- Keine Aenderung an Jahresabschluss-Reihenfolge.

## Diff-Risiko-Block

```text
Geplante Dateien:
- app/shared/persistence-key-policy.js
- tests/snapshot-key-policy.test.mjs
- docs/internal/SLICE_BALANCE_SNAPSHOTS_01_KEY_POLICY.md
- docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md

Voraussichtliche Änderungstiefe:
- klein bis mittel

Gefährdete bestehende Tests:
- tests/persistence.test.mjs
- alle späteren Snapshot-/Restore-Tests, die die neuen Policy-Funktionen verwenden

Nicht anfassen:
- engine.js
- dist/
- RuheStandSuite.exe
- Tauri-/IndexedDB-/StorageManager-Umbau, weil Slice 1 nur Key-Policy ist

Rollback-Strategie:
- git checkout -- app/shared/persistence-key-policy.js tests/snapshot-key-policy.test.mjs docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md
- neu angelegte Slice-Datei: docs/internal/SLICE_BALANCE_SNAPSHOTS_01_KEY_POLICY.md nach Freigabe loeschen, falls Rollback gewuenscht ist
```

## Geplante Tests

```powershell
node tests\run-single.mjs tests\snapshot-key-policy.test.mjs
node tests\run-single.mjs tests\persistence.test.mjs
```

## Durchgefuehrte Aenderungen

- `app/shared/persistence-key-policy.js` um Snapshot-spezifische Exporte erweitert:
  - `isAllowedSnapshotCaptureKey()`
  - `isAllowedSnapshotRestoreLiveKey()`
  - `isSnapshotProfileScopedKey()`
  - `isSnapshotGlobalDomainKey()`
  - `isSnapshotTechnicalKey()`
  - `isProfileRegistryKey()`
  - `isProfileScopedFixedKey()`
  - `isLegacySnapshotKey()`
- Capture-Policy nimmt fachliche Live-Daten inklusive Profil-Registry auf, aber keine Legacy-Snapshot-Keys und keine technischen Feature-/Telemetry-/UI-Keys.
- Standard-Restore schuetzt die Profil-Registry, verlangt fuer profilbezogene Live-Keys eine existierende `snapshotActiveProfileId` in der aktuellen Registry und laesst globale fachliche Keys zu.
- Full-Restore ist explizit getrennt und erlaubt die Profil-Registry, schreibt aber technische Keys weiterhin nicht automatisch.
- Neuer Test `tests/snapshot-key-policy.test.mjs` fuer Capture, Restore, Profil-Registry, Legacy-Snapshot-Keys und technische Keys.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\snapshot-key-policy.test.mjs` -> bestanden.
- `node tests\run-single.mjs tests\persistence.test.mjs` -> bestanden.
- `npm test` -> bestanden; 78 Testdateien, 1993 Assertions, 0 Fehler.

## Abweichungen vom Plan

- Die im uebergeordneten Arbeitsplan als `Paket 0` gefuehrten vorbereitenden Contracts wurden vor diesem Slice nicht umgesetzt. Damit ist Slice 1 Key-Policy erledigt, die alte 0-basierte Vorarbeit ist aber weiterhin offen.

## Offene Risiken

- Die vorbereitenden Jahresabschluss-Contracts wurden nachtraeglich in `docs/internal/SLICE_BALANCE_SNAPSHOTS_02_PREPARATORY_CONTRACTS.md` nachgezogen. Bis die Jahresabschluss-Reihenfolge implementiert ist, bleibt dieser Contract rot.
- Die genaue technische/fachliche Einordnung einzelner spaeter hinzukommender Keys muss in Folge-Slices bei Bedarf erweitert werden.

## Rueckdokumentation in die uebergeordnete Arbeitsplan-MD

- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md` enthaelt Slice-Dokument, Branch und lokalen GitHub-Status fuer Paket 1.
- Der Arbeitsplan dokumentiert jetzt explizit, dass die alte `Paket 0`-Vorarbeit nach Slice 1 als `SLICE_BALANCE_SNAPSHOTS_02_PREPARATORY_CONTRACTS.md` nachgezogen wurde.

## Freigabestatus

- Nicht freigegeben fuer Commit oder Push.
