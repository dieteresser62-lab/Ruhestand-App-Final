# Slice Balance Snapshots 07: StorageManager auf SnapshotArchive

**Feature-Branch:** `codex-balance-snapshot-key-policy`  
**GitHub-Status:** Branch lokal vorhanden und laut Git-Status `ahead 6`; keine weitere Veroeffentlichung ohne Freigabe  
**Status:** abgeschlossen, freigegeben


## Ziel

Der Balance-StorageManager nutzt fuer interne Snapshots das getrennte `SnapshotArchive` statt Legacy-`full-localstorage`-Snapshots im Live-Store oder Ordnerpfad.

## Akzeptanzkriterien

- `StorageManager.createSnapshot()` erstellt kanonische `persistence-records-v1`-Snapshots ueber `SnapshotArchive`.
- `renderSnapshots()` listet Snapshot-Indexeintraege aus dem Archiv, ohne `records`-Payloads zu verwenden.
- `restoreSnapshot()` liest kanonische Archiv-Snapshots und nutzt `PersistenceFacade.replaceLiveRecords()` statt `persistenceStorage.clear()`.
- Standard-Restore bricht ab, wenn `snapshot.activeProfileId` in der aktuellen Profil-Registry nicht existiert.
- Standard-Restore schreibt die Profil-Registry nicht blind aus dem Snapshot zurueck, aktualisiert aber die Daten des wiederhergestellten Profils in der bestehenden Registry.
- Snapshot-Historie und technische Keys bleiben beim Restore erhalten.

## Scope

- `app/balance/balance-storage.js`
- `tests/balance-binder-snapshots.test.mjs`
- `tests/balance-storage-contract.test.mjs`
- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- diese Slice-Datei

## Nicht-Scope

- Keine Jahresabschluss-Reihenfolge.
- Keine Legacy-Migration alter `full-localstorage`-Snapshots.
- Keine UI-Text-/Exportpfad-Neusortierung ausser notwendiger Archiv-Statusanzeige.
- Keine Tauri-, IndexedDB- oder Engine-Aenderungen.

## Diff-Risiko Vor Start

Branch vor Start:

```text
codex-balance-snapshot-key-policy
```

Git-Status vor Start:

```text
## codex-balance-snapshot-key-policy...origin/codex-balance-snapshot-key-policy [ahead 6]
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
warning: unable to access 'C:\Users\Diete/.config/git/ignore': Permission denied
```

Geplante Dateien:
- `app/balance/balance-storage.js`
- `tests/balance-binder-snapshots.test.mjs`
- `tests/balance-storage-contract.test.mjs`
- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- `docs/internal/SLICE_BALANCE_SNAPSHOTS_07_STORAGE_MANAGER_ARCHIVE.md`

Voraussichtliche Änderungstiefe:
- mittel

Gefährdete bestehende Tests:
- `tests/balance-binder-snapshots.test.mjs`, weil der erwartete Snapshot-Typ von Legacy auf kanonisches Archiv wechselt.
- Gesamtsuite bleibt voraussichtlich wegen der bekannten Slice-02-/Paket-7-Jahresabschluss-Reihenfolge rot, bis Paket 7 umgesetzt ist.

Nicht anfassen:
- `app/shared/persistence-adapter-indexeddb.js`
- `src-tauri/`
- `engine.js`, `dist/`, `RuheStandSuite.exe`

Rollback-Strategie:
- `git checkout -- app/balance/balance-storage.js tests/balance-binder-snapshots.test.mjs docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md`
- neu angelegte Slice-Datei `docs/internal/SLICE_BALANCE_SNAPSHOTS_07_STORAGE_MANAGER_ARCHIVE.md` nach Freigabe loeschen, falls Rollback gewuenscht ist.

## Geplante Tests

```powershell
node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs
node tests\run-single.mjs tests\balance-storage-contract.test.mjs
node tests\run-tests.mjs
```

## Durchgefuehrte Änderungen

- `StorageManager.createSnapshot()` erstellt kanonische `persistence-records-v1`-Snapshots ueber `SnapshotArchive.createSnapshot()`.
- Snapshot-Capture nutzt `SnapshotArchive.captureCurrentRecords()` und damit die Snapshot-Key-Policy; Legacy-Snapshot-Keys werden nicht in neue Snapshots aufgenommen.
- `renderSnapshots()` liest Snapshot-Indexeintraege aus `SnapshotArchive.listSnapshots()` und verwendet keine Vollpayloads.
- `restoreSnapshot()` liest Archiv-Snapshots, validiert die aktuelle Profil-Registry und bricht bei fehlender `snapshot.activeProfileId` ab.
- Standard-Restore berechnet Delete-/Upsert-Sets und nutzt `PersistenceFacade.replaceLiveRecords()` statt `persistenceStorage.clear()`.
- Die aktuelle Profil-Registry wird nicht blind aus dem Snapshot ueberschrieben; nur `profiles[snapshot.activeProfileId].data` wird aus den wiederhergestellten Profil-Live-Records aktualisiert.
- `deleteSnapshot()` loescht Archiv-Eintraege ueber `SnapshotArchive.deleteSnapshot()`.
- Snapshot-/Storage-Contracts wurden auf kanonisches Archivformat, Snapshot-Historien-Erhalt, technische/fremde Key-Erhaltung und fehlende Profil-ID aktualisiert.

## Ausgefuehrte Tests

```powershell
node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs
```

Ergebnis: gruen. Kanonische Snapshot-Erstellung, Archivliste ohne `records`, Standard-Restore, technische Key-Erhaltung, Snapshot-Historien-Erhaltung und fehlende Profil-ID wurden geprueft.

```powershell
node tests\run-single.mjs tests\balance-storage-contract.test.mjs
```

Ergebnis: gruen. Storage-Migrationen sowie kanonischer Archiv-Create-/Restore-Contract bestanden.

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

Alle StorageManager-, SnapshotArchive-, Persistence- und Snapshot-Key-Policy-Tests liefen in der Gesamtsuite gruen.

## Abweichungen Vom Plan

- `tests/balance-storage-contract.test.mjs` wurde zusaetzlich angepasst, weil ein bestehender Contract noch den alten Legacy-Snapshot-Key direkt restored hat. Die Scope-Grenze bleibt mit fuenf Dateien innerhalb der Stop-Regel.
- Die UI-Statusanzeige verwendet bereits den neuen Archiv-Status aus dem aktiven Backend. Die vollstaendige UI-/Exportpfad-Neusortierung bleibt Paket 9.

## Offene Risiken

- `StorageManager.createSnapshot(handle, label)` akzeptiert den alten `handle`-Parameter aus Kompatibilitaetsgruenden weiter, nutzt ihn aber nicht mehr als Standard-Speicherziel. Der separate manuelle Exportpfad ist weiterhin Paket 9.
- Multi-Tab-/Restore-Lock-Verhalten ist durch Facade-/Adapter-Contracts vorbereitet, aber noch nicht als echte Browser-Interaktion verifiziert.
- Die Gesamtsuite bleibt bis Paket 7 rot, weil der Jahresabschluss-Snapshot weiterhin nach den Jahresmutationen erstellt wird.

## Rueckdokumentation

- `docs/internal/BALANCE_JAHRESABSCHLUSS_SNAPSHOT_PLAN.md` markiert Paket 6 als abgeschlossen und verweist auf diese Slice-Datei.

## Freigabestatus

**Freigegeben durch Gemini.** Die Akzeptanzkriterien wurden erfolgreich verifiziert und alle Tests sind im erwarteten Zustand.

## Review-Entscheidungen

| ID | Quelle | Finding | Entscheidung | Umsetzung |
|---|---|---|---|---|
| G-01 | Gemini | JSDoc-Dokumentation beschreibt `handle` als aktiv genutzt, obwohl es tot ist. | Angenommen | Wird in Paket 9 (Export-Cleanups) bereinigt. |
| G-02 | Gemini | `handle`-Weiterreichung an `renderSnapshots` etc. ist toter Code. | Angenommen | Wird in Paket 9 bereinigt. |
| G-03 | Gemini | Registry-Deep-Clone via `JSON.parse(JSON.stringify(...))` ohne Fehlerbehandlung. | Angenommen | Unkritisch für aktuelle Registry-Datenstruktur. |
| G-04 | Gemini | `kind` ist hartcodiert auf `annualClosePreMutation` für alle Snapshots. | Angenommen | Wird in Paket 9 bei manuellem Export parametrisiert. |
| G-05 | Gemini | Kein dedizierter Testfall für null-Registry bei `restoreSnapshot`. | Angenommen | Verhalten ist korrekt; Testlücke unkritisch. |
| G-06 | Gemini | `saveCurrentProfileFromLocalStorage()` wird vor Capture/Restore ausgeführt. | Angenommen | Korrektes und gewünschtes Verhalten. |

## Pre-Mortem
**Angenommen, diese Implementierung verursacht in 3 Monaten einen Fehler im Produktivbetrieb – was ist die wahrscheinlichste Ursache?**
Ein Nutzer hat ein altes Legacy-Profil (vor Einführung des Profilverbunds), das keinen `rs_profiles_v1`-Registry-Key besitzt, und versucht einen älteren Snapshot wiederherzustellen, der noch auf ein `default`-Profil verweist, das in seiner neuen Registry fehlt. Der Standard-Restore bricht in diesem Fall ab, um Datenverlust zu vermeiden. Dies wird durch die Migration in Paket 8 gelöst.

