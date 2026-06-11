# Slice Balance Snapshots 05: Tauri-Snapshot-Target

**Stand:** 2026-06-03  
**Feature-Branch:** `codex-balance-snapshot-key-policy`  
**GitHub-Status:** nur lokal angelegt; keine Veroeffentlichung ohne Freigabe  
**Status:** abgeschlossen, nicht committed

## Ziel

Tauri speichert Snapshot-Archivdaten getrennt vom Live-State in `ruhestand_suite_snapshots.json`, waehrend bestehende Live-Persistenz in `ruhestand_suite_data.json` unveraendert bleibt.

## Scope

- Rust-Commands `load_app_state`, `save_app_state` und `quarantine_app_state` akzeptieren ein optionales Ziel.
- `StateTarget` unterscheidet `live` und `snapshots`.
- Tauri-JS-Adapter implementiert Snapshot-Methoden ueber `target: "snapshots"`.
- Contract-Tests stellen sicher, dass Live- und Snapshot-Dateiziele getrennt verwendet werden.

## Nicht-Scope

- Kein IndexedDB-Store `snapshots`.
- Kein StorageManager-Umbau.
- Keine Jahresabschluss-Reihenfolge.
- Keine Legacy-Snapshot-Migration alter Snapshot-Keys.
- Keine Build-Artefakte in `dist/` oder `RuheStandSuite.exe`.

## Diff-Risiko-Block

```text
Geplante Dateien:
- app/shared/persistence-adapter-tauri.js
- src-tauri/src/lib.rs
- tests/persistence.test.mjs
- docs/internal/SLICE_BALANCE_SNAPSHOTS_05_TAURI_SNAPSHOT_TARGET.md
- docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md

Voraussichtliche Änderungstiefe:
- mittel

Gefährdete bestehende Tests:
- tests/persistence.test.mjs
- Rust-Unit-Tests in src-tauri
- Gesamtsuite bleibt voraussichtlich wegen der bekannten Slice-02-Jahresabschluss-Contract-Stelle rot, bis Paket 7 umgesetzt ist

Nicht anfassen:
- engine.js
- dist/
- RuheStandSuite.exe
- IndexedDB-Adapter; der Store `snapshots` folgt in Paket 5
- StorageManager und Jahresabschluss-Reihenfolge; das folgt in Paket 6/7

Rollback-Strategie:
- git checkout -- app/shared/persistence-adapter-tauri.js src-tauri/src/lib.rs tests/persistence.test.mjs docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md
- neu angelegte Slice-Datei docs/internal/SLICE_BALANCE_SNAPSHOTS_05_TAURI_SNAPSHOT_TARGET.md nach Freigabe löschen, falls Rollback gewünscht ist
```

## Geplante Tests

```powershell
node tests\run-single.mjs tests\persistence.test.mjs
cargo test --manifest-path src-tauri\Cargo.toml
node tests\run-tests.mjs
```

## Durchgefuehrte Aenderungen

- `src-tauri/src/lib.rs` um `StateTarget` mit `live`/`snapshots` erweitert.
- Tauri-Commands `load_app_state`, `save_app_state` und `quarantine_app_state` akzeptieren jetzt ein optionales Ziel; ohne Ziel bleibt `ruhestand_suite_data.json` der Default.
- Snapshot-Ziel schreibt und liest `ruhestand_suite_snapshots.json`; Quarantaene-Dateinamen sind zielbezogen.
- `app/shared/persistence-adapter-tauri.js` implementiert Snapshot-Archivmethoden ueber `target: "snapshots"`.
- `listSnapshots()` liefert nur Indexdaten ohne `records`.
- `tests/persistence.test.mjs` prueft, dass Live-State und Snapshot-Archiv in getrennte Tauri-Ziele geschrieben werden.

## Ausgefuehrte Tests mit Ergebnis

- `node tests\run-single.mjs tests\persistence.test.mjs` -> gruen.
- `cargo test --manifest-path src-tauri\Cargo.toml` -> gruen: 7 Rust-Tests bestanden.
- `node tests\run-tests.mjs` -> erwartungsgemaess rot: 2037 Assertions gruen, bekannte rote Slice-02-Contract-Stelle in `tests/balance-annual-workflow-contract.test.mjs` bleibt offen, weil die Jahresabschluss-Reihenfolge erst in Paket 7 umgesetzt wird.

## Abweichungen vom Plan

- Keine.

## Offene Risiken

- Snapshot-Datei-Korruption wird im JS-Adapter derzeit als Snapshot-Archivfehler gemeldet; die Live-State-Quarantaene bleibt unveraendert. Detaillierte Snapshot-Quarantaene-UX kann bei StorageManager-/Legacy-Slices nachgezogen werden.
- IndexedDB unterstuetzt Snapshot-Archivmethoden weiterhin erst nach Paket 5.
- Die Gesamtsuite bleibt bis Paket 7 rot, weil der Jahresabschluss-Snapshot noch nach den Jahresmutationen erstellt wird.

## Rueckdokumentation in die uebergeordnete Arbeitsplan-MD

- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md` markiert Paket 4 als abgeschlossen und verweist auf diese Slice-Datei.

## Freigabestatus

- Nicht freigegeben fuer Commit oder Push.
