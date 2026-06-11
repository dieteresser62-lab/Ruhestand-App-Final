# Slice Balance Snapshots 06: IndexedDB-Snapshot-Store

**Feature-Branch:** `codex-balance-snapshot-key-policy`  
**GitHub-Status:** Branch lokal vorhanden und laut Git-Status `ahead 4`; keine weitere Veroeffentlichung ohne Freigabe  
**Status:** abgeschlossen, freigegeben durch Gemini

## Ziel

Der IndexedDB-Adapter speichert Snapshot-Archivdaten getrennt von Live-Records im neuen Store `snapshots` und behandelt DB-Upgrades auf Version 2 nachvollziehbar.

## Akzeptanzkriterien

- IndexedDB `ruhestand-suite` nutzt Version 2.
- `onupgradeneeded` legt `kv`, `metadata` und `snapshots` idempotent an.
- Snapshot-Methoden `listSnapshots()`, `readSnapshot(id)`, `writeSnapshot(snapshot)`, `deleteSnapshot(id)` und `migrateLegacySnapshotsIfNeeded()` existieren im IndexedDB-Adapter.
- Snapshot-Indexlisten enthalten keine `records`-Payloads.
- `versionchange` markiert die Verbindung als veraltet, schliesst sie und weitere Adaptercalls brechen klar ab.
- `blocked` erzeugt einen UI-faehigen Fehler/Event statt still zu haengen.
- Live-Record-Ersetzung kann im IndexedDB-Adapter atomar ueber eine `kv`-Transaktion laufen.

## Scope

- `app/shared/persistence-adapter-indexeddb.js`
- `tests/persistence.test.mjs`
- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- diese Slice-Datei

## Nicht-Scope

- Kein StorageManager-Umbau.
- Keine Jahresabschluss-Reihenfolge.
- Keine Legacy-Snapshot-Migration alter Keys ausser neutralem Report.
- Keine Tauri-Aenderungen.

## Diff-Risiko Vor Start

Branch vor Start:

```text
codex-balance-snapshot-key-policy
```

Git-Status vor Start:

```text
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Geplante Dateien:
- `app/shared/persistence-adapter-indexeddb.js`
- `tests/persistence.test.mjs`
- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- `docs/internal/SLICE_BALANCE_SNAPSHOTS_06_INDEXEDDB_SNAPSHOT_STORE.md`

Voraussichtliche Änderungstiefe:
- mittel

Gefährdete bestehende Tests:
- `tests/persistence.test.mjs`, weil Fake-IndexedDB und Adapter-Contracts erweitert werden.
- Gesamtsuite bleibt voraussichtlich wegen der bekannten Slice-02-Jahresabschluss-Contract-Stelle rot, bis Paket 7 umgesetzt ist.

Nicht anfassen:
- `app/balance/`
- `src-tauri/`
- `engine.js`, `dist/`, `RuheStandSuite.exe`

Rollback-Strategie:
- `git checkout -- app/shared/persistence-adapter-indexeddb.js tests/persistence.test.mjs docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- neu angelegte Slice-Datei `docs/internal/SLICE_BALANCE_SNAPSHOTS_06_INDEXEDDB_SNAPSHOT_STORE.md` nach Freigabe loeschen, falls Rollback gewuenscht ist.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\persistence.test.mjs
node tests\run-tests.mjs
```

## Durchgefuehrte Änderungen

- `app/shared/persistence-adapter-indexeddb.js` auf DB-Version 2 umgestellt.
- Store-Anlage fuer `kv`, `metadata` und `snapshots` idempotent erweitert.
- `onblocked` mit Fehlercode `indexeddb-upgrade-blocked` und Event `persistence:upgrade-blocked` umgesetzt.
- `versionchange` setzt dauerhaften Outdated-Zustand, schliesst die Verbindung und dispatcht `persistence:outdated`.
- Snapshot-Methoden `listSnapshots()`, `readSnapshot()`, `writeSnapshot()`, `deleteSnapshot()` und neutraler `migrateLegacySnapshotsIfNeeded()` ergaenzt.
- `replaceLiveRecords()` als IndexedDB-Adapterpfad ueber eine `kv`-Readwrite-Transaktion ergaenzt.
- Fake-IndexedDB in `tests/persistence.test.mjs` um Versionierung, mehrere Stores, Blocked-Simulation und Versionchange-Trigger erweitert.
- Persistence-Tests um Version-2-/Snapshot-/Outdated-/Blocked-Contracts erweitert.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\persistence.test.mjs
```

Ergebnis: gruen. Persistence-Contract inklusive IndexedDB-Snapshot-Store, `versionchange` und `blocked` bestanden.

```powershell
node tests\run-tests.mjs
```

Ergebnis: erwartungsgemaess rot wegen bekannter Slice-02-/Paket-7-Rotstelle in `tests/balance-annual-workflow-contract.test.mjs`.

Relevanter Fehler:

```text
Jahresabschluss flusht Live-Daten und schreibt Snapshot vor Inflation/Jahresmutation:
Expected flushLiveState|createSnapshot|toast:...|applyAnnualInflation|debouncedUpdate,
got applyAnnualInflation|debouncedUpdate|timeout:300|createSnapshot|toast:...
```

Die neuen Persistence-/IndexedDB-Tests liefen in der Gesamtsuite gruen.

## Abweichungen Vom Plan

- Keine fachliche Abweichung.
- Die Legacy-Snapshot-Migration bleibt wie geplant neutral (`migratedCount: 0`), bis Paket 8 die echte Migration implementiert.

## Offene Risiken

- Multi-Tab-Verifikation ist weiterhin nur per Fake-IndexedDB-Contract abgedeckt; echte Browser-Verifikation folgt spaeter, sofern kein Browser-Testframework eingefuehrt wird.
- Die Gesamtsuite bleibt bis Paket 7 rot, weil der Jahresabschluss-Snapshot weiterhin nach den Jahresmutationen erstellt wird.

## Rueckdokumentation

- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md` markiert Paket 5 als abgeschlossen und verweist auf diese Slice-Datei.

## Freigabestatus

Freigegeben durch Gemini nach erfolgreichem Review aller Akzeptanzkriterien und Unit-Tests.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| REV06-1 | Gemini | Multi-Tab/Upgrade-Verhalten und getrennter Snapshot-Store vollständig implementiert und per Fake-IDB-Contract getestet. | Keine Einwände, Freigabe erteilt. | Erledigt |
