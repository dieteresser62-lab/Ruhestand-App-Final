# Balance Jahresabschluss-Snapshots: implementierungsreifer Plan

**Stand:** 2026-06-03  
**Status:** Arbeitsdokument / implementierungsreifer Umsetzungsplan  
**Ausgangspunkt:** Quelltextstand 2026-06-02, bisheriger Plan vom 2026-05-27 und Review-Kritik vom 2026-06-02
**Slice-Regeln:** Umsetzung nur nach `docs/internal/SLICE_EXECUTION_RULES.md`

## Ziel

Jahresabschluss-Snapshots sollen ohne Nutzer-Ordnerfreigabe funktionieren und trotzdem strikt getrennt von aktiven Arbeitsdaten bleiben.

Der Nutzer klickt im Balance-Modul weiterhin auf **Jahresabschluss**. Intern wird zuerst ein Snapshot des unveraenderten Live-Stands erzeugt. Erst nach erfolgreichem Snapshot laufen Inflation, Alters-/Jahresfortschreibung, Ausgaben-Rollover und Live-Flush.

## Harte Entscheidungen

1. Snapshots werden nicht in `ruhestand_suite_data.json` gespeichert.
2. Snapshots werden nicht als normale Records im aktiven `persistenceStorage`/Live-Store gespeichert.
3. Ein Jahresabschluss-Snapshot entsteht immer vor jeder Jahresabschluss-Mutation.
4. Restore loescht nie pauschal den kompletten Speicher.
5. Standard-Restore erhaelt die globale Profil-Registry und spielt nur das Snapshot-Profil zurueck, wenn diese Profil-ID aktuell existiert.
6. Tauri- und IndexedDB-Snapshot-Pfade werden ueber die bestehende Persistenz-Fassade delegiert, nicht durch parallele Runtime-Erkennung im Balance-Modul.
7. Ein fehlgeschlagener Snapshot bricht den Jahresabschluss ab. Es gibt keinen stillen Fallback auf "trotzdem fortfahren".

## Ausgangszustand Zu Planbeginn

Die folgenden Punkte waren zu Planbeginn tatsaechlich so im Code vorhanden und muessen im Verlauf der Slices geaendert werden:

- `app/balance/balance-binder-snapshots.js`: `handleJahresabschluss()` ruft zuerst `applyAnnualInflation()`, dann `debouncedUpdate()`, wartet 300 ms und erstellt erst danach den Snapshot.
- `app/balance/balance-storage.js`: `createSnapshot()` liest alle Keys aus `persistenceStorage` und speichert `snapshotType: "full-localstorage"`.
- `app/balance/balance-storage.js`: ohne verbundenen Ordner werden Snapshots unter `CONFIG.STORAGE.SNAPSHOT_PREFIX` im Live-Store abgelegt.
- `app/balance/balance-storage.js`: `restoreSnapshot()` nutzt fuer `full-localstorage` aktuell `persistenceStorage.clear()` und schreibt erlaubte Keys danach zurueck.
- `app/shared/persistence-key-policy.js`: es existiert nur `isAllowedPersistenceImportKey()` plus `listAllowedPersistenceImportKeys()`. Snapshot-spezifische Policy-Funktionen muessen neu gebaut werden.
- `app/shared/persistence-adapter-indexeddb.js`: DB `ruhestand-suite` ist Version 1 mit Stores `kv` und `metadata`; es gibt noch keinen Store `snapshots`.
- `src-tauri/src/lib.rs`: Tauri schreibt nur `ruhestand_suite_data.json`; Snapshot-Datei und Target-Parametrisierung existieren noch nicht.

Wichtig zur Alterslogik:

- Der Snapshot-Handler selbst erhoeht das Alter nicht sichtbar.
- Die Altersfortschreibung liegt im Jahresupdate-Orchestrator (`app/balance/balance-annual-orchestrator.js`) und ist nicht sauber mit dem Jahresabschluss-Snapshot-Flow gekoppelt.
- Die Umsetzung muss daher explizit klaeren, welche Jahresabschluss-Mutation das Alter erhoeht. Der Contract-Test muss die konkret implementierte Reihenfolge pruefen, nicht nur eine abstrakte "Altersfortschreibung" behaupten.

## Zielarchitektur

```text
Balance UI / StorageManager
  -> SnapshotArchive
      -> normalisiert fachliche Snapshot-Payloads
      -> setzt ID, Metadaten und Schema
      -> nutzt Snapshot-Key-Policy
      -> delegiert Persistenz an PersistenceFacade

PersistenceFacade
  -> aktive Arbeitsdaten: bestehende Sync-/Flush-API
  -> Snapshot-Archiv: optionale Adaptermethoden

Adapter
  -> Tauri: ruhestand_suite_data.json + ruhestand_suite_snapshots.json
  -> Browser IndexedDB: DB ruhestand-suite, Stores kv/metadata/snapshots
  -> localStorage: Legacy-/Fallback-Pfad, nicht Zielarchitektur
```

Layer-Regel:

- `app/shared/snapshot-archive.js` enthaelt nur runtime-neutrale Snapshot-Archivlogik.
- Balance-spezifische Capture-/Restore-Kontexte werden aus `app/balance/` uebergeben.
- `app/shared/` importiert keine Module aus `app/balance/`.
- `SnapshotArchive` ruft keine Tauri-IPC-Funktionen direkt auf und oeffnet IndexedDB nicht selbst.

## Kanonisches Snapshot-Schema

Alle neuen Snapshots verwenden exakt dieses kanonische Format. Tauri-Datei und IndexedDB-Store speichern dieselben Snapshot-Objekte. Die Archivdatei kapselt nur die Liste.

```json
{
  "schemaVersion": 1,
  "id": "ja-2026-06-02T18-00-00-000Z",
  "snapshotType": "persistence-records-v1",
  "kind": "annual-close-pre-mutation",
  "createdAt": "2026-06-02T18:00:00.000Z",
  "label": "Profilname",
  "activeProfileId": "default",
  "activeProfileName": "Profilname",
  "recordCount": 42,
  "records": {
    "ruhestandsmodellValues_v29_guardrails": "...",
    "depot_tranchen": "...",
    "balance_expenses_v1": "..."
  },
  "restoreScope": {
    "profileRegistryMode": "preserve-by-default",
    "profileLiveDataMode": "restore-only-if-active-profile-still-exists"
  }
}
```

Tauri-Archivdatei:

```json
{
  "schemaVersion": 1,
  "savedAt": "2026-06-02T18:00:00.000Z",
  "snapshots": []
}
```

Feldregeln:

- `schemaVersion`: Formatversion des Snapshot-Objekts.
- `id`: vom `SnapshotArchive` erzeugt; stabiler Archiv-Key.
- `snapshotType`: fuer neue Snapshots immer `persistence-records-v1`.
- `kind`: fuer Jahresabschluss `annual-close-pre-mutation`; manuelle Snapshots koennen spaeter eigene Kinds erhalten.
- `createdAt`: ISO-Zeitpunkt des Capture-Zeitpunkts.
- `activeProfileId`: aus `rs_current_profile` bzw. Registry-Kontext. Fehlt sie, ist der Snapshot nicht standard-restore-faehig.
- `activeProfileName`: optional aus Registry-Meta ableiten.
- `recordCount`: muss `Object.keys(records).length` entsprechen.
- `restoreScope`: Bestandteil des kanonischen Formats. Fuer Slice 1 wird nur der Standard-Restore umgesetzt.

Leseregeln:

- Reader akzeptieren `schemaVersion: 1`.
- Unbekannte hoehere `schemaVersion` wird nicht restored und mit klarer Meldung abgebrochen.
- `recordCount` wird beim Lesen gegen `records` validiert.
- `createdAt` darf nicht ungueltig sein. Plausibilitaet in der Zukunft ist nur Warnung, kein harter Fehler.
- Korrupte Tauri-Snapshot-Datei wird isoliert quarantined; Live-Daten bleiben unberuehrt.

## Snapshot-Key-Policy

Die Policy wird vor Archiv- und Restore-Umbau implementiert. Sie ist ein harter Vorgänger fuer alle folgenden Pakete.

Modul: `app/shared/persistence-key-policy.js`

Neue Exporte:

```js
isAllowedSnapshotCaptureKey(key)
isAllowedSnapshotRestoreLiveKey(key, options)
isSnapshotProfileScopedKey(key)
isSnapshotGlobalDomainKey(key)
isSnapshotTechnicalKey(key)
isProfileRegistryKey(key)
isProfileScopedFixedKey(key)
isLegacySnapshotKey(key)
```

Regeln:

- Capture nimmt fachliche Live-Daten auf, inklusive Profil-Registry, aber keine Snapshot-Archivdaten.
- Capture nimmt keine Legacy-Snapshot-Keys (`ruhestandsmodell_snapshot_*`) in neue Snapshots auf.
- Standard-Restore schreibt keine Profil-Registry blind zurueck.
- Standard-Restore schreibt feste profilbezogene Live-Keys nur, wenn `snapshot.activeProfileId` in der aktuellen Registry existiert.
- Migration-/Schema-Marker, die fachliche Datenmigration steuern, werden bewusst kategorisiert. Schema-gekoppelte Marker duerfen nicht versehentlich aus dem aktuellen Live-Stand erhalten bleiben, wenn der Snapshot einen aelteren Datenstand wiederherstellt.
- Technische Debug-/Telemetry-/UI-Keys werden nur restored, wenn sie explizit fachlich relevant sind.

Optionen fuer `isAllowedSnapshotRestoreLiveKey(key, options)`:

```js
{
  mode: "standard" | "full",
  snapshotActiveProfileId: "default",
  currentRegistry: {},
  allowProfileRegistry: false
}
```

## Konsistenz- und Fehlermodell

### Jahresabschluss

Reihenfolge:

1. Label und Kontext lesen.
2. Nutzerbestaetigung einholen.
3. Ausstehende UI-Eingaben synchron in den Live-State uebernehmen.
4. `await PersistenceFacade.flush()` ausfuehren.
5. Snapshot-Capture aus dem geflushten Live-Stand erstellen.
6. Snapshot in das separate Archiv schreiben.
7. Erst danach Jahresabschluss-Mutationen ausfuehren:
   - konkret implementierte Alters-/Jahresfortschreibung,
   - `applyAnnualInflation()`,
   - `rollExpensesYear()`,
   - weitere definierte Jahresabschluss-Mutationen.
8. `await PersistenceFacade.flush()` fuer Live-Daten.
9. UI neu rendern und Snapshot-Liste aktualisieren.

Fehlerfaelle:

- Vorab-Flush fehlschlaegt: kein Snapshot, keine Mutation.
- Snapshot-Capture fehlschlaegt: keine Mutation.
- Snapshot-Write fehlschlaegt: keine Mutation.
- Mutation nach erfolgreichem Snapshot fehlschlaegt: Snapshot bleibt als Pre-Mutation-Rueckfallpunkt erhalten; Live-Daten koennen teilweise mutiert sein und werden ueber UI-Fehlerpfad gemeldet.
- Live-Flush nach Mutation fehlschlaegt: Dirty-State bleibt in der Facade markiert; Nutzer erhaelt Fehler. Snapshot bleibt gueltig.

Akzeptierter Worst Case:

- Snapshot erfolgreich, Live-Mutation oder Live-Flush fehlgeschlagen. Das ist akzeptabel, weil der Snapshot den Stand vor dem kritischen Schritt enthaelt.

Nicht akzeptiert:

- Live-Mutation ohne vorher erfolgreichen Snapshot.
- Snapshot nach Mutation.

### Restore

Standard-Restore muss all-or-nothing fuer Live-Records sein.

Algorithmus:

1. Snapshot lesen und validieren.
2. `recordCount`, `schemaVersion`, `snapshotType`, `records` validieren.
3. Aktuelle Registry lesen.
4. Wenn `snapshot.activeProfileId` nicht in der aktuellen Registry existiert: Standard-Restore abbrechen.
5. Aktuelles Profil via bestehender Profil-Fassade sichern (`saveCurrentProfileFromLocalStorage()` oder Nachfolger).
6. Erlaubte Delete-/Upsert-Sets berechnen, ohne den Live-Store schon zu veraendern.
7. Bei IndexedDB: Delete und Upsert in einer `readwrite`-Transaktion gegen `kv` ausfuehren.
8. Bei Tauri/Facade-Memcache: vor Veraenderung ein In-Memory-Backup der betroffenen Keys bilden; bei Fehler Memcache wiederherstellen und Flush-Fehler melden.
9. `rs_current_profile` und `rs_active_profile` auf `snapshot.activeProfileId` setzen.
10. Wiederhergestellte Live-Profil-Keys in `registry.profiles[snapshot.activeProfileId].data` speichern.
11. `await PersistenceFacade.flush()`.
12. `location.reload()`.

Full Restore:

- In Slice 1 optional.
- Wenn umgesetzt, nur mit expliziter Warnung.
- Full Restore darf Profil-Registry ueberschreiben, muss aber vorher ein aktuelles Backup anbieten oder mindestens die Auswirkungen im Dialog benennen.

Fehlende Keys in alten Snapshots:

- Profilgebundene und globale fachliche Keys, die in der aktuellen App existieren, aber im Snapshot fehlen, werden im Standard-Restore geloescht, wenn die Policy sie als Teil des Snapshot-Scopes klassifiziert.
- Technische Keys ausserhalb des Snapshot-Scopes bleiben erhalten.
- UI-Zustand, Fenster-/Layoutgroessen, Debug-Flags, Telemetry-Schalter und aehnliche technische App-Zustaende muessen ueber `isSnapshotTechnicalKey()` bzw. die Restore-Policy ausdruecklich als "behalten" klassifiziert werden, sofern sie keinen fachlichen Wiederherstellungswert haben.
- Diese Loeschregel muss getestet werden, damit alte Snapshots nicht halb mit neuem Live-Zustand gemischt werden.

Multi-Tab-Restore:

- Slice 1 muss keinen vollstaendigen Distributed Mutex bauen.
- Es muss aber ein Restore-In-Progress-Marker im aktiven Backend existieren:
  - IndexedDB: Metadata-Record mit kurzer TTL, z. B. 60 Sekunden.
  - Tauri: In-Memory-/Adapter-Flag waehrend der Operation.
- Ein zweiter Restore in derselben Laufzeit muss mit klarer Meldung abbrechen.
- Cross-Tab-Konflikte werden als bekanntes Restrisiko dokumentiert, solange kein Browser-Lock mit Ablauf/Recovery umgesetzt ist.

## Tauri-Implementierung

Dateien:

- Live: `<AppData>/RuhestandSuite/ruhestand_suite_data.json`
- Snapshots: `<AppData>/RuhestandSuite/ruhestand_suite_snapshots.json`

Rust-Zielmodell:

```rust
enum StateTarget {
  Live,
  Snapshots,
}

impl StateTarget {
  fn filename(&self) -> &'static str { ... }
  fn quarantine_prefix(&self) -> &'static str { ... }
}
```

Commands:

```rust
load_app_state(app, target: Option<String>) -> Result<String, String>
save_app_state(app, content: String, target: Option<String>) -> Result<(), String>
quarantine_app_state(app, target: Option<String>) -> Result<String, String>
```

Target-Parsing:

- Command-Handler konvertieren `target: Option<String>` robust ueber `target.as_deref()` in `StateTarget`.
- `None` und `Some("live")` werden zu `StateTarget::Live`.
- `Some("snapshots")` wird zu `StateTarget::Snapshots`.
- Alle anderen Strings liefern `Err(...)`; es darf kein `unwrap()`, kein `panic!()` und kein freier Pfad-Fallback entstehen.

Regeln:

- `None` und `"live"` bedeuten Live-Datei.
- `"snapshots"` bedeutet Snapshot-Datei.
- Unbekannte Targets brechen mit Fehler ab.
- Kein Command akzeptiert freie Pfade oder Dateinamen aus dem Frontend.
- `.tmp`/`.bak`/`rename`-Pattern bleibt gemeinsamer Codepfad.
- Quarantaene fuer Snapshot-Datei erzeugt `ruhestand_suite_snapshots.corrupt.<timestamp>.json`.
- `confirm_app_close` bleibt auf Live-Flush beschraenkt. Snapshot-Aktionen schreiben sofort und abgeschlossen.

Pflichttests:

- `StateTarget` akzeptiert nur `live`, `snapshots`, `None`.
- Unbekannte Targets werden abgelehnt.
- Live- und Snapshot-Datei werden auf unterschiedliche Dateinamen aufgeloest.
- Quarantaene nutzt den passenden Prefix.

## IndexedDB-Implementierung

Modul: `app/shared/persistence-adapter-indexeddb.js`

Ziel:

- DB: `ruhestand-suite`
- Version: `2`
- Stores: `kv`, `metadata`, `snapshots`

Upgrade:

- `onupgradeneeded` legt fehlende Stores idempotent an.
- `request.onblocked` muss eine UI-faehige Meldung vorbereiten oder zumindest ein klares Promise-Reject erzeugen.
- `request.onupgradeneeded` ist der Zeitpunkt des Upgrades. Der erste neue Adapter-Open nach Deployment loest ihn aus.

`versionchange`:

- Bestehende Verbindung schliessen.
- `outdated = true` setzen.
- Ein Event `persistence:outdated` dispatchen, falls `dispatchEvent` verfuegbar ist.
- Weitere `ensureOpen()`, `saveBatch()`, `writeMetadata()` und Snapshot-Methoden brechen sofort mit `"Datenbankverbindung veraltet, bitte diesen Tab neu laden."` ab.
- Kein stilles Neuoeffnen aus einem alten Tab.

`blocked`:

- `request.onblocked` wird behandelt.
- Es wird ein UI-faehiger Fehler bzw. Event `persistence:upgrade-blocked` erzeugt.
- Der Nutzer soll den anderen Tab schliessen oder neu laden.

Snapshot-Methoden:

```js
listSnapshots()
readSnapshot(id)
writeSnapshot(snapshot)
deleteSnapshot(id)
migrateLegacySnapshotsIfNeeded()
```

Transaktionen:

- Snapshot-Archivoperationen nutzen Store `snapshots`.
- Standard-Restore gegen Live-Keys nutzt eine `readwrite`-Transaktion gegen `kv`, damit Delete/Upsert atomar sind.
- Wenn Metadata fuer Restore-Lock beteiligt ist, Store `metadata` in dieselbe Transaktion aufnehmen, soweit technisch sinnvoll.

Tests:

- Fake-IndexedDB-Unit-Test fuer Version 2 und Store-Anlage.
- Test fuer `versionchange`: `outdated` wird gesetzt, weitere Calls brechen ab.
- Test fuer `blocked`: Fehler/Event wird gesetzt.
- Manuelle Browser-Verifikation fuer echte Multi-Tab-Szenarien, sofern kein Playwright/Puppeteer eingefuehrt wird.

## PersistenceFacade-Erweiterung

Neue Methoden:

```js
listSnapshots()
readSnapshot(id)
writeSnapshot(snapshot)
deleteSnapshot(id)
migrateLegacySnapshotsIfNeeded()
replaceLiveRecords(records, options)
```

`replaceLiveRecords(records, options)` ist der Restore-freundliche All-or-Nothing-Pfad:

```js
{
  deleteKeys: [],
  upserts: [],
  allowKey: isAllowedSnapshotRestoreLiveKey,
  restoreLock: true
}
```

Fallback:

- Wenn ein Adapter keine Snapshot-Methoden anbietet, nutzt die Facade nur fuer Legacy/localStorage den bisherigen Fallback.
- Tauri und IndexedDB muessen Snapshot-Methoden implementieren; sonst gilt Slice 1 als unvollstaendig.

## SnapshotArchive

Neues Modul: `app/shared/snapshot-archive.js`

Aufgaben:

- `createSnapshot({ label, kind, records, activeProfileId, activeProfileName })`
- `captureCurrentRecords({ keys, getItem })`
- `listSnapshots()`
- `readSnapshot(id)`
- `writeSnapshot(snapshot)`
- `deleteSnapshot(id)`
- `validateSnapshot(snapshot)`
- `toSnapshotIndexEntry(snapshot)`

Nicht-Aufgaben:

- Kein DOM-Zugriff.
- Kein Tauri-IPC.
- Kein IndexedDB-Open.
- Keine Balance-spezifische Profil-Ermittlung.

## StorageManager- und UI-Umbau

`app/balance/balance-storage.js`:

- `createSnapshot(handle, label)` wird durch Archivpfad ersetzt.
- `handle` ist nicht mehr Standardpfad fuer Jahresabschluss.
- Manuelle Ordner-Snapshots bleiben optionaler Legacy-/Exportpfad.
- `renderSnapshots()` liest `SnapshotArchive.listSnapshots()`.
- `restoreSnapshot()` liest aus Archiv und nutzt Standard-Restore-Semantik.
- `deleteSnapshot()` loescht nur einen Archiv-Eintrag.

Status-Texte:

- Tauri: `Speicherort: App-Speicher (separates Snapshot-Archiv)`
- Browser IndexedDB: `Speicherort: Browser-Speicher (IndexedDB Snapshot-Archiv)`
- localStorage-Fallback: `Speicherort: Browser-Fallback (localStorage, begrenzte Snapshot-Ablage)`

`Balance.html`:

- Default-Text `Speicherort: Browser (localStorage)` ersetzen.
- Ordner verbinden aus dem normalen Jahresabschluss-Workflow entfernen oder nach Erweitert verschieben.
- UI unterscheidet internes Snapshot-Archiv und manuellen Export/Import.

## Legacy-Migration

Legacy-Quellen:

1. Alte Datei-Snapshots aus verbundenem Ordner.
2. Alte interne `ruhestandsmodell_snapshot_*`-Records.
3. Alte Browser-DB `snapshotDB` mit Directory-Handle.

Migration alter `full-localstorage`-Snapshots:

1. Payload lesen.
2. `activeProfileId` aus `payload.localStorage["rs_current_profile"]` extrahieren, falls vorhanden.
3. Falls kein `rs_current_profile` vorhanden und Snapshot erkennbar vor Profilverbund liegt: `activeProfileId = "default"`.
4. `activeProfileName` aus `payload.localStorage["rs_profiles_v1"].profiles[activeProfileId].meta.name` ableiten, falls moeglich.
5. Wenn keine gueltige `activeProfileId` ableitbar ist: Snapshot migrieren, aber als nicht standard-restore-faehig markieren.
6. Records ueber Capture-Policy filtern; Legacy-Snapshot-Keys nicht uebernehmen.
7. Neues kanonisches Snapshot-Objekt schreiben.
8. Migrationsergebnis melden.

Verifikationsgate:

- Migration liefert einen Report:
  - `migratedCount`
  - `skippedCount`
  - `notStandardRestorableCount`
  - `errors[]`
- Alte Records werden nur nach erfolgreicher Migration und sicherer Markierung geloescht.
- Keine automatische Bereinigung ohne Report.

`snapshotDB`-Cleanup:

- Idempotent nach erfolgreicher Initialisierung des neuen SnapshotArchive.
- Marker in Metadata: `legacySnapshotDbCleanup.completedAt`.
- Fehler blockieren den App-Start nicht, werden aber geloggt.

## Rollback-Strategie

Browser/IndexedDB:

- Nach Upgrade auf DB-Version 2 kann alter Code, der Version 1 oeffnet, durch Browser-Verhalten blockiert werden.
- Rollback auf alten Code ist deshalb nicht garantiert verlustfrei.
- Vor Release muss ein manueller Exportpfad fuer Live-Daten und Snapshots dokumentiert sein.
- Rollback-Hinweis: "Nach IndexedDB-Schema-Upgrade ist ein Code-Rollback nur mit manuellem Datenexport/import sicher."

Tauri:

- Alte Tauri-Version ignoriert `ruhestand_suite_snapshots.json`; Live-Daten bleiben lesbar, solange `ruhestand_suite_data.json` unveraendert bleibt.
- Neue Snapshots sind nach Rollback nicht im alten UI sichtbar.
- Vor produktivem Rollout muss dokumentiert sein, dass Snapshot-Archiv separat gesichert werden kann.

## Tests

Pflicht-Unit-/Contract-Tests:

- `tests/balance-annual-workflow-contract.test.mjs`
  - Snapshot vor `applyAnnualInflation()`.
  - Snapshot vor konkreter Alters-/Jahresfortschreibung.
  - Vorab-Flush vor Snapshot.
  - Fehler bei Vorab-Flush oder Snapshot verhindert jede Mutation.
- `tests/balance-binder-snapshots.test.mjs`
  - Create/List/Delete/Restore ueber `SnapshotArchive`.
  - Keine Snapshot-in-Snapshot-Aufnahme.
  - Restore loescht keine Snapshot-Historie.
- Neuer `tests/snapshot-archive.test.mjs`
  - Schema-Normalisierung.
  - ID-Erzeugung.
  - `recordCount`-Validierung.
  - Index ohne `records`.
- Neuer Policy-Test
  - Capture-/Restore-Key-Policy.
  - Profil-Registry im Standard-Restore erhalten.
  - Legacy-Snapshot-Keys ausgeschlossen.
  - Fehlende fachliche Keys werden bei Restore geloescht.
  - Fehlende technische Keys wie UI-/Layoutzustand, Fensterdaten, Debug-Flags und Telemetry-Schalter bleiben erhalten, wenn sie von `isSnapshotTechnicalKey()` als technisch klassifiziert werden.
- Neuer Persistenz-Facade-Test
  - Snapshot-Methoden delegieren an Adapter.
  - `replaceLiveRecords()` ist fuer Fake-Adapter all-or-nothing.
- Neuer IndexedDB-Test
  - Version 2 legt `kv`, `metadata`, `snapshots` an.
  - `versionchange` setzt `outdated`.
  - `blocked` wird behandelt.
  - Snapshot-Store bleibt getrennt vom Live-Store.
- Neuer Tauri/Rust-Test
  - Target-Validierung.
  - `target.as_deref()`-Parsing akzeptiert nur `None`, `"live"` und `"snapshots"` und gibt fuer unbekannte Strings `Err(...)` zurueck.
  - Dateinamen fuer live/snapshots.
  - Quarantaene-Prefix.
- Neuer Legacy-Test
  - `activeProfileId` aus altem Payload.
  - Fallback `"default"` fuer Vor-Profilverbund.
  - nicht standard-restore-faehig ohne gueltige Profil-ID.
  - Migrationsreport.

Manuelle Browser-Verifikation, falls kein Browser-Testframework eingefuehrt wird:

- Zwei Tabs oeffnen.
- Neuer Tab loest IndexedDB-Upgrade auf Version 2 aus.
- Alter Tab zeigt Reload-Hinweis oder bricht weitere Writes klar ab.
- `blocked`-Fall pruefen, soweit reproduzierbar.

Auszufuehren:

```powershell
node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
node tests\run-tests.mjs
```

Wenn `src-tauri/src/lib.rs` geaendert wird:

```powershell
npm run tauri:build
```

oder ein gezielter Rust-Test, falls verfuegbar und schneller.

## Dokumentations-Sync

Zu aktualisieren:

- `README.md`
  - Jahresabschluss-Snapshots ohne Ordnerfreigabe.
  - File System Access API nur noch fuer manuellen Export/Import, nicht fuer normale Snapshots.
- `docs/reference/TECHNICAL.md`
  - Persistenzarchitektur mit getrenntem Snapshot-Archiv.
  - IndexedDB Version 2 / Store `snapshots`.
  - Tauri-Dateien live vs. snapshots.
- `docs/reference/BALANCE_MODULES_README.md`
  - Rolle von `balance-storage.js`, `balance-binder-snapshots.js`, `SnapshotArchive`.
- `docs/internal/PROJEKTUEBERSICHT.md`
  - Aussage "Persistenz primaer ueber localStorage und optionale Dateisnapshots" aktualisieren.
- `docs/internal/archive/2026-persistence-migration/PERSISTENCE_MIGRATION_PLAN.md`
  - Entscheidung dokumentieren: Snapshots nicht in `ruhestand_suite_data.json`.
  - Hinweis auf separates Snapshot-Archiv und Rollback-Folgen.

Nicht korrekt:

- `docs/internal/PERSISTENCE_MIGRATION_PLAN.md` existiert aktuell nicht und darf nicht als Zielpfad genannt werden.

## Umsetzungspakete

Jedes Paket wird vor Umsetzung als eigene Slice-MD dokumentiert. Vor dem ersten Code-Edit ist der Diff-Risiko-Block aus `docs/internal/SLICE_EXECUTION_RULES.md` auszugeben. Nach Abschluss werden Ergebnis, Tests, Abweichungen und Freigabestatus in der Slice-MD sowie in diesem Arbeitsplan dokumentiert.

Hinweis zur Nummerierung und zum aktuellen Stand: Dieser Plan enthaelt noch eine alte 0-basierte Vorarbeit als `Paket 0`. Nach der aktualisierten Agent-Regel beginnen neue Umsetzungs-, Paket- und Slice-Nummern immer bei 1. Real umgesetzt wurde bereits `SLICE_BALANCE_SNAPSHOTS_01_KEY_POLICY.md` fuer Key-Policy. Die vorbereitenden Contracts aus dem bisherigen `Paket 0` wurden danach als `docs/internal/SLICE_BALANCE_SNAPSHOTS_02_PREPARATORY_CONTRACTS.md` nachgezogen, damit keine neue 0-basierte Slice-Datei entsteht.

### Paket 0: Vorbereitende Contracts

Slice-Dokument: `docs/internal/SLICE_BALANCE_SNAPSHOTS_02_PREPARATORY_CONTRACTS.md`  
Branch: `codex-balance-snapshot-key-policy`  
Status: nachgezogen, erwartungsgemaess rot; wurde erst nach Slice 1 umgesetzt.

- Bestehende Jahresabschluss-Tests auf gewuenschte neue Reihenfolge umstellen.
- Failing Tests fuer Snapshot-vor-Mutation, Snapshot-Fehler-bricht-ab und Key-Policy anlegen.

Akzeptanz:

- Tests schlagen vor Implementierung gezielt fehl.

### Paket 1: Key-Policy

Slice-Dokument: `docs/internal/SLICE_BALANCE_SNAPSHOTS_01_KEY_POLICY.md`  
Branch: `codex-balance-snapshot-key-policy`  
Status: abgeschlossen, nicht committed; Branch nur lokal angelegt, GitHub-Veroeffentlichung ohne Freigabe ausstehend.

- Snapshot-Policy-Funktionen implementieren.
- Tests fuer Capture, Restore, Profil-Registry, Legacy-Snapshot-Keys und technische Keys.

Abhaengig von: Paket 0.

### Paket 2: SnapshotArchive

Slice-Dokument: `docs/internal/SLICE_BALANCE_SNAPSHOTS_03_SNAPSHOT_ARCHIVE.md`  
Branch: `codex-balance-snapshot-key-policy`  
Status: abgeschlossen, nicht committed; Branch nur lokal angelegt, GitHub-Veroeffentlichung ohne Freigabe ausstehend.

- `app/shared/snapshot-archive.js` erstellen.
- Kanonisches Schema, Validierung, Index-Erzeugung, Delegation an Facade.
- In-Memory-Fake-Adapter-Test.

Abhaengig von: Paket 1.

### Paket 3: PersistenceFacade-Adaptervertrag

Slice-Dokument: `docs/internal/SLICE_BALANCE_SNAPSHOTS_04_PERSISTENCE_FACADE_CONTRACT.md`  
Branch: `codex-balance-snapshot-key-policy`  
Status: abgeschlossen, nicht committed; Branch nur lokal angelegt, GitHub-Veroeffentlichung ohne Freigabe ausstehend.

- Snapshot-Methoden und `replaceLiveRecords()` ergaenzen.
- Fake-Adapter und localStorage-Legacy-Fallback anpassen.

Abhaengig von: Paket 2.

### Paket 4: Tauri-Ziel `snapshots`

Slice-Dokument: `docs/internal/SLICE_BALANCE_SNAPSHOTS_05_TAURI_SNAPSHOT_TARGET.md`  
Branch: `codex-balance-snapshot-key-policy`  
Status: abgeschlossen, nicht committed; Branch nur lokal angelegt, GitHub-Veroeffentlichung ohne Freigabe ausstehend.

- `StateTarget` in Rust.
- Commands parametrisieren.
- Tauri-Adapter nutzt `target: "snapshots"` fuer Archiv.
- Rust-/Tauri-Tests.

Abhaengig von: Paket 3.

### Paket 5: IndexedDB Store `snapshots`

Slice-Dokument: `docs/internal/SLICE_BALANCE_SNAPSHOTS_06_INDEXEDDB_SNAPSHOT_STORE.md`  
Branch: `codex-balance-snapshot-key-policy`  
Status: abgeschlossen, freigegeben durch Gemini; bereit fuer Commit.

- Version auf 2.
- Store `snapshots`.
- `blocked`, `versionchange`, `outdated`.
- Snapshot-Methoden im Adapter.

Abhaengig von: Paket 3.

### Paket 6: StorageManager auf SnapshotArchive

Slice-Dokument: `docs/internal/SLICE_BALANCE_SNAPSHOTS_07_STORAGE_MANAGER_ARCHIVE.md`
Branch: `codex-balance-snapshot-key-policy`
Status: abgeschlossen, Review ausstehend.

- Create/List/Read/Delete/Restore umbauen.
- Kein `persistenceStorage.clear()` im Restore.
- Standard-Restore mit Profil-ID-Pruefung.

Abhaengig von: Pakete 1 bis 5.

### Paket 7: Jahresabschluss-Reihenfolge

Slice-Dokument: `docs/internal/SLICE_BALANCE_SNAPSHOTS_08_ANNUAL_CLOSE_ORDER.md`
Branch: `codex-balance-snapshot-key-policy`
Status: abgeschlossen, freigegeben durch Gemini.

- Vorab-Sync/Flush.
- Snapshot schreiben.
- Danach definierte Jahresabschluss-Mutationen.
- Fehlerpfade.

Abhaengig von: Paket 6.

### Paket 8: Legacy-Migration

Slice-Dokument: `docs/internal/SLICE_BALANCE_SNAPSHOTS_09_LEGACY_MIGRATION.md`
Branch: `codex-balance-snapshot-key-policy`
Status: abgeschlossen, Review ausstehend.

- Alte File-Snapshots und `ruhestandsmodell_snapshot_*`.
- `activeProfileId`-Fallbacks.
- Migrationsreport.
- `snapshotDB`-Cleanup.

Abhaengig von: Paket 6.

### Paket 9: UI-Texte und Exportpfad

- Status-Texte.
- Ordner verbinden nach Erweitert oder Export/Import verschieben.
- Restore-Warnungen.

Abhaengig von: Paket 6.

### Paket 10: Dokumentation und Gates

- README, TECHNICAL, BALANCE_MODULES, PROJEKTUEBERSICHT, archivierter Persistence-Plan.
- Tests vollstaendig ausfuehren.
- Tauri-Build oder Rust-Test nach Rust-Aenderungen.

Abhaengig von: Pakete 4 bis 9.

## Review-Checkliste

- [ ] Neue Snapshots landen nie im Live-Store.
- [ ] `ruhestand_suite_data.json` bleibt frei von Snapshot-Archivdaten.
- [ ] Tauri nutzt `ruhestand_suite_snapshots.json`.
- [ ] IndexedDB hat Store `snapshots` in DB `ruhestand-suite` Version 2.
- [ ] `blocked` und `versionchange` sind behandelt.
- [ ] `SnapshotArchive` enthaelt keine Runtime-Logik.
- [ ] `PersistenceFacade` delegiert Snapshot-Methoden an Adapter.
- [ ] `listSnapshots()` liefert keinen Vollpayload mit `records`.
- [ ] Snapshot-Schema ist eindeutig und validiert.
- [ ] `recordCount` wird geprueft.
- [x] Restore nutzt kein pauschales `clear()`.
- [x] Restore ist fuer Live-Records all-or-nothing oder rollbackfaehig.
- [x] Standard-Restore erhaelt Profil-Registry.
- [x] Standard-Restore prueft `snapshot.activeProfileId`.
- [x] Fehlende fachliche Keys werden gemaess Policy behandelt.
- [x] Jahresabschluss-Snapshot entsteht vor Inflation und vor konkreter Alters-/Jahresmutation.
- [x] Jahresabschluss bricht bei Snapshot-Fehler ohne Mutation ab.
- [x] Legacy-Migration liefert einen Report.
- [x] Alte Snapshots bleiben lesbar oder werden als nicht standard-restore-faehig markiert.
- [ ] Doku-Pfade sind korrekt.
- [ ] Rollback-Einschraenkungen sind dokumentiert.

## Nicht-Ziele fuer Slice 1

- Keine Cloud-Synchronisation.
- Keine Verschluesselung des Snapshot-Archivs.
- Keine SQLite-Migration.
- Kein komplexes Profil-Merge-UI.
- Keine automatische Retention-Policy; optional nur UI-Warnung bei vielen Snapshots.
- Kein Build der Tauri-EXE, ausser der konkrete Umsetzungsauftrag verlangt es.

## Spaetere Ausbaustufen

- Einzeldatei pro Snapshot statt Sammeldatei, wenn Archivgroesse merklich waechst.
- Retention: z. B. letzte 30 bis 60 Snapshots behalten oder manuelle Archivierung.
- Snapshot exportieren/importieren pro Eintrag.
- Preview/Merge fuer Profil-Registry.
- Browser-Level-Automation mit Playwright/Puppeteer fuer Multi-Tab-IDB-Upgrades.
