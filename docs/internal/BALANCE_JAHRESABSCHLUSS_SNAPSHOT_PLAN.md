# Balance Jahresabschluss-Snapshots: getrennte Snapshot-Ablage ohne Ordnerbindung

**Stand:** 2026-05-27
**Status:** Arbeitsdokument / reviewfaehiger Umsetzungsplan
**Ziel:** Jahresabschluss-Snapshots sollen ohne Nutzer-Ordnerfreigabe funktionieren, aber nicht die aktive Arbeitsdaten-Datei bzw. den aktiven IndexedDB-Record-Store bei jeder Eingabe vergroessern.

## Kurzfassung

Die erste Planfassung wollte Snapshots als normale Records mit Prefix `ruhestandsmodell_snapshot_` im aktiven `persistenceStorage` ablegen. Das loest zwar das UI-Problem der Ordnerfreigabe, fuehrt aber zu einem Architekturproblem:

- Tauri speichert aktive Arbeitsdaten in `ruhestand_suite_data.json`.
- Der Tauri-Adapter serialisiert beim Flush das gesamte In-Memory-Objekt.
- Wenn Snapshots in derselben Datei liegen, wird bei jeder normalen Eingabe auch das komplette Snapshot-Archiv wieder serialisiert und geschrieben.

Der korrigierte Zielpfad ist deshalb:

- Aktive Arbeitsdaten bleiben in der bestehenden Persistenz-Fassade.
- Snapshots bekommen eine getrennte Snapshot-Ablage.
- Tauri nutzt eine separate Datei, z. B. `ruhestand_suite_snapshots.json`.
- Browser/IndexedDB nutzt in der bestehenden Datenbank `ruhestand-suite` einen separaten Object Store `snapshots`.
- `localStorage` bleibt nur Legacy-/Fallback-Pfad und darf nicht der Massstab fuer die Desktop-Architektur sein.

Der normale Jahresabschluss bleibt fuer Nutzer ein einzelner Klick ohne Ordnerdialog. Intern wird aber nicht mehr das aktive Arbeitsdaten-Bundle mit historischen Snapshots vermischt.

## Harte Designentscheidungen

1. **Snapshots werden nicht in `ruhestand_suite_data.json` gespeichert.**
   Diese Datei bleibt fuer aktive Arbeitsdaten optimiert.

2. **Snapshots werden nicht im aktiven `persistenceStorage`-Record-Set gespeichert.**
   Die bestehende Fassade bleibt fuer Live-Daten, nicht fuer historische Archive.

3. **Der Jahresabschluss-Snapshot entsteht immer vor jeder Mutation.**
   Vor `applyAnnualInflation()`, vor Altersfortschreibung, vor Ausgaben-Rollover und vor sonstigen Jahresupdate-Mutationen.

4. **Restore loescht nie pauschal den kompletten Speicher.**
   Es werden nur explizit erlaubte Live-Keys ersetzt. Snapshot-Archiv, andere technische Stores und nicht betroffene Daten bleiben erhalten.

5. **Profil-Registry-Restore ist eine eigene fachliche Entscheidung.**
   Ein Snapshot darf die globale Profil-Registry nicht still auf einen historischen Stand zuruecksetzen, wenn dadurch spaeter angelegte Profile verloren gehen koennen.

## Ausgangslage

### Relevante Module

| Datei | Aktuelle Rolle |
| --- | --- |
| `app/balance/balance-storage.js` | Laedt/speichert Balance-State, initialisiert Snapshots, rendert Snapshot-Liste, erstellt/restored/loescht Snapshots |
| `app/balance/balance-binder-snapshots.js` | Bindet Jahresabschluss und Snapshot-Aktionen an UI-Events |
| `app/shared/persistence-facade.js` | Runtime-neutrale Persistenz-Fassade fuer aktive Arbeitsdaten |
| `app/shared/persistence-adapter-tauri.js` | Adapter fuer `ruhestand_suite_data.json` |
| `app/shared/persistence-key-policy.js` | Zentrale Policy fuer erlaubte Persistenz-Keys, soweit bereits vorhanden |
| `src-tauri/src/lib.rs` | Rust-Commands fuer Tauri-Dateizugriff |
| `Balance.html` | Snapshot-UI, Buttontexte und Statusanzeige |

### Aktueller Snapshot-Ablauf

`StorageManager.createSnapshot(handle, label)` liest aktuell alle Keys aus `persistenceStorage`.

Wenn `handle` gesetzt ist, wird eine JSON-Datei in den verbundenen Ordner geschrieben. Ohne `handle` wird der Snapshot als Record mit Prefix `CONFIG.STORAGE.SNAPSHOT_PREFIX` im selben Storage abgelegt.

`StorageManager.restoreSnapshot(key, handle)` nutzt bei Full-LocalStorage-Snapshots aktuell `persistenceStorage.clear()` und schreibt erlaubte Keys wieder zurueck. Das ist fuer getrennte Dateien noch kontrollierbar, waere aber bei eingebetteten Snapshots ein Datenverlust-Bug, weil andere Snapshots geloescht wuerden.

### Kernprobleme

1. **Performance-Bloat:** Snapshots im Live-Store vergroessern jeden normalen Flush.
2. **Restore-Datenverlust:** `clear()` wuerde bei gemeinsamem Store auch die Snapshot-Historie entfernen.
3. **Falscher Snapshot-Zeitpunkt:** Ein Snapshot nach Alters-/Inflationsfortschreibung ist kein Rueckfallpunkt fuer das alte Jahr und kann bei erneutem Jahresabschluss zu Doppel-Fortschreibung fuehren.
4. **Profil-Registry-Risiko:** Restore historischer Snapshots kann spaeter angelegte Profile loeschen, wenn die globale Registry blind ueberschrieben wird.

## Zielarchitektur

### Aktive Daten vs. Snapshot-Archiv

```text
Feature-Module
  -> PersistenceFacade
      -> aktive Arbeitsdaten
      -> delegiert Snapshot-Operationen an denselben aktiven Adapter
      -> Tauri: ruhestand_suite_data.json
      -> Browser: IndexedDB Live-Store

SnapshotArchive
  -> historische Sicherungspunkte
  -> ruft PersistenceFacade.listSnapshots/readSnapshot/writeSnapshot/deleteSnapshot auf
  -> Facade delegiert an optionale Adapter-Methoden
      -> Tauri-Adapter: ruhestand_suite_snapshots.json
      -> IndexedDB-Adapter: DB ruhestand-suite, Object Store snapshots
      -> Legacy: bestehende File-System-Snapshot-Dateien und alte localStorage-Snapshot-Records lesbar halten
```

### Tauri-Dateimodell

Aktive Daten:

```text
<AppData>/RuhestandSuite/ruhestand_suite_data.json
```

Snapshots:

```text
<AppData>/RuhestandSuite/ruhestand_suite_snapshots.json
```

Moegliches Snapshot-Dateiformat:

```json
{
  "schemaVersion": 1,
  "savedAt": "2026-05-27T10:00:00.000Z",
  "snapshots": [
    {
      "id": "ja-2026-05-27T10-00-00-000Z",
      "createdAt": "2026-05-27T10:00:00.000Z",
      "label": "Profilname",
      "kind": "annual-close-pre-mutation",
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
  ]
}
```

Die Datei wird nur bei expliziten Snapshot-Aktionen gelesen/geschrieben:

- Jahresabschluss-Snapshot erstellen
- Snapshot-Liste anzeigen oder aktualisieren
- Snapshot wiederherstellen
- Snapshot loeschen
- optional exportieren/importieren

Normale Eingaben im UI duerfen diese Datei nicht anfassen.

Skalierung der Sammeldatei:

- Fuer diesen Slice ist eine Sammeldatei akzeptabel, weil Snapshot-Aktionen selten sind.
- `listSnapshots()` darf aber nicht die vollstaendigen `records` an die UI weiterreichen. Der Tauri-Adapter soll einen leichten Index aus `id`, `createdAt`, `label`, `kind`, `activeProfileId`, `activeProfileName`, `recordCount` und ggf. Groesse liefern.
- `readSnapshot(id)` laedt erst bei Restore/Export den vollstaendigen Snapshot inklusive `records`.
- Sobald die Snapshot-Anzahl zweistellig wird oder die Datei merklich waechst, ist Einzeldatei-Archivierung pro Snapshot der empfohlene naechste Schritt, nicht nur eine beliebige Option.

### Browser-/IndexedDB-Modell

Der Browserpfad soll ebenfalls getrennt sein:

- Live-Daten bleiben im bestehenden IndexedDB-Backend der `PersistenceFacade`.
- Snapshots liegen in derselben IndexedDB-Datenbank `ruhestand-suite`, aber in einem separaten Object Store `snapshots`.
- Die bestehende IndexedDB-Version `1` wird auf `2` erhoeht.
- `onupgradeneeded` legt neben `kv` und `metadata` zusaetzlich `snapshots` an.
- Snapshot-Werte werden nur bei expliziten Snapshot-Aktionen geladen.
- Es wird keine zweite IndexedDB-Datenbank eingefuehrt. Dadurch bleiben Initialisierung, Upgrade-Lifecycle und `versionchange`-Handling an einer Stelle.
- Das `versionchange`-Handling darf andere offene Tabs nicht still kaputt machen:
  - Wenn ein alter Tab eine Version-1-Verbindung verliert, muss der Nutzer eine sichtbare Meldung erhalten, z. B. "App-Datenbank wurde aktualisiert, bitte diesen Tab neu laden."
  - Alternativ darf der Tab nach gesichertem Live-Flush automatisch neu laden.
  - Ein stilles `db.close()` ohne UI-Signal ist nicht ausreichend.
  - Der Adapter muss nach `versionchange` intern als veraltet markiert werden. Weitere Lese-/Schreibaufrufe duerfen nicht versuchen, die bereits migrierte DB erneut zu oeffnen, sondern muessen mit einer klaren Meldung abbrechen, z. B. "Datenbankverbindung veraltet, bitte neu laden."

Falls IndexedDB nicht verfuegbar ist:

- bestehender `localStorage`-Fallback kann fuer geringe Datenmengen erhalten bleiben,
- UI sollte dann klar signalisieren, dass die Snapshot-Ablage nur ein Fallback ist,
- dieser Fallback darf die Tauri-/IndexedDB-Architektur nicht bestimmen.

## Snapshot-Datenmodell

Neue Payload:

```json
{
  "snapshotType": "persistence-records-v1",
  "createdAt": "2026-05-27T10:00:00.000Z",
  "kind": "annual-close-pre-mutation",
  "label": "Profilname",
  "activeProfileId": "default",
  "activeProfileName": "Profilname",
  "recordCount": 42,
  "records": {}
}
```

Rueckwaertskompatibilitaet:

- Alte Datei-Snapshots mit `snapshotType: "full-localstorage"` bleiben lesbar.
- Alte interne `ruhestandsmodell_snapshot_*`-Records werden fuer Migration/Anzeige gelesen, aber nicht als neuer Standard fortgeschrieben.

Ausgeschlossen:

- Snapshot-Archivdaten selbst
- alte `ruhestandsmodell_snapshot_*`-Records
- temporaere Debug-/Telemetry-/Systemdaten ohne fachlichen Wiederherstellungswert

## Snapshot-Zeitpunkt im Jahresabschluss

Der Snapshot-Zeitpunkt ist nicht optional:

1. Nutzer klickt **Jahresabschluss**.
2. Nutzer bestaetigt.
3. App erzeugt Snapshot des unveraenderten aktuellen Stands.
4. Erst danach laufen:
   - `applyAnnualInflation()`
   - Altersfortschreibung
   - `debouncedUpdate()` bzw. expliziter Update/Flush
   - `rollExpensesYear()`
   - weitere Jahresabschluss-Mutationen
5. App rendert neu und aktualisiert die Snapshot-Liste.

Begruendung:

- Der Snapshot ist ein Rueckfallpunkt vor einer kritischen Aktion.
- Ein Snapshot nach Inflation/Alterung wuerde bereits den neuen Jahresstand enthalten.
- Bei spaeterem Restore und erneutem Jahresabschluss koennte sonst Alter/Inflation doppelt angewendet werden.

Akzeptanzkriterium:

- Ein Contract-Test muss die Reihenfolge pruefen: `createSnapshot` vor jeder Jahresabschluss-Mutation.

## Restore-Semantik

### Grundregel

Restore ersetzt nur fachliche Live-Daten, nie das Snapshot-Archiv.

Verboten:

```js
persistenceStorage.clear()
```

Erlaubt:

```js
PersistenceFacade.clearAllowedSync(isAllowedSnapshotRestoreLiveKey)
```

oder eine aequivalente gezielte Loesch-/Replace-Operation.

### Profil-Registry und Profil-Keys

Die globale Profil-Registry (`rs_profiles_*`) ist riskant:

- Ein alter Snapshot kann Profile enthalten, die heute nicht mehr vollstaendig sind.
- Ein alter Snapshot kann Profile nicht enthalten, die nach dem Snapshot angelegt wurden.
- Blindes Ueberschreiben kann Daten anderer Profile loeschen.
- Profilwerte liegen nicht als `profile_<profileId>`-Keys im Speicher. Die Live-Keys sind feste Keys wie `profile_tagesgeld`, `profile_rente_monatlich`, `profile_aktuelles_alter`, `depot_tranchen` und `profile_health_bucket`.
- Beim Profilwechsel werden diese festen Live-Keys geloescht und mit den Daten des neu gewaehlten Profils befuellt.
- Die Daten aller Profile liegen gebuendelt in `rs_profiles_v1.profiles[id].data`.
- Deshalb muss der Snapshot die zum Capture-Zeitpunkt aktive Profil-ID explizit als Metadatum speichern.

Deshalb gilt fuer den ersten Umsetzungsslice:

- `rs_profiles_*` wird im Snapshot gesichert, damit Full-Restore technisch moeglich bleibt.
- Restore ueberschreibt die globale Profil-Registry standardmaessig nicht blind.
- Capture speichert `activeProfileId` und optional `activeProfileName` aus `rs_current_profile` bzw. Registry-Meta.
- Standard-Restore prueft, ob `snapshot.activeProfileId` in der aktuellen Registry existiert.
- Wenn `snapshot.activeProfileId` existiert:
  - feste Live-Profil-Keys duerfen aus dem Snapshot in den Live-Bereich zurueckgespielt werden,
  - `rs_current_profile` und `rs_active_profile` werden auf `snapshot.activeProfileId` gesetzt,
  - die aktuelle Registry bleibt erhalten,
  - die Registry-Daten fuer dieses Profil sollen nach erfolgreichem Live-Restore mit den wiederhergestellten Live-Keys aktualisiert werden, analog `saveCurrentProfileFromLocalStorage()`.
- Wenn `snapshot.activeProfileId` nicht mehr existiert:
  - Standard-Restore bricht den profilgebundenen Restore ab,
  - der Nutzer erhaelt eine klare Meldung, dass das Snapshot-Profil nicht mehr existiert,
  - neuere Profile und aktuelle Profilauswahl bleiben unberuehrt.
- Profile, die nach dem Snapshot neu angelegt wurden, bleiben im Standard-Restore immer erhalten.
- Wenn ein Full-Restore der Profil-Registry angeboten wird, braucht er eine explizite Warnung und Bestaetigung.

Moegliche Restore-Modi:

| Modus | Verhalten |
| --- | --- |
| Standard | Live-Daten fuer `snapshot.activeProfileId` wiederherstellen, sofern diese Profil-ID in der aktuellen Registry existiert; Registry sonst erhalten |
| Full Restore | Alle im Snapshot enthaltenen fachlichen Keys inklusive Profil-Registry wiederherstellen, nur nach expliziter Warnung |
| Preview/Merge spaeter | Unterschiede anzeigen und gezielt uebernehmen |

Der erste Slice sollte mindestens Standard und optional Full Restore mit Warnung definieren. Preview/Merge ist spaeter sinnvoll, aber nicht Pflicht.

## Umsetzungspakete

### Paket 1: Snapshot-Methoden in Facade und Adaptervertrag einfuehren

Ziel: Snapshot-Speicherung wird logisch von aktiven Arbeitsdaten getrennt, nutzt aber denselben aktiven Runtime-Adapter der `PersistenceFacade`. `SnapshotArchive` darf keine eigene Parallel-Infrastruktur fuer Tauri-IPC, IndexedDB-Open/Upgrade oder Runtime-Erkennung aufbauen.

Arbeiten:

- Adaptervertrag optional erweitern:
  - `listSnapshots()`
  - `readSnapshot(id)`
  - `writeSnapshot(snapshot)`
  - `deleteSnapshot(id)`
  - `migrateLegacySnapshotsIfNeeded()` optional
- `PersistenceFacade` ergaenzt delegierende Methoden:
  - `listSnapshots()`
  - `readSnapshot(id)`
  - `writeSnapshot(snapshot)`
  - `deleteSnapshot(id)`
  - `migrateLegacySnapshotsIfNeeded()` optional
- Neues Modul `app/shared/snapshot-archive.js` oder `app/balance/balance-snapshot-archive.js` bleibt fachlich schlank:
  - normalisiert Snapshot-Payloads,
  - setzt IDs/Metadaten,
  - delegiert Persistenz an `PersistenceFacade.*Snapshot*`.
- Tauri-IPC-Details bleiben in `persistence-adapter-tauri.js`.
- IndexedDB-Open/Upgrade/Transactions bleiben in `persistence-adapter-indexeddb.js`.
- Legacy-Fallback bleibt adapter- oder migrationsnah gekapselt.

Akzeptanzkriterien:

- Normale `PersistenceFacade.flush()`-Operationen kennen das Snapshot-Archiv nicht.
- Snapshot-Aktionen koennen ohne Ordnerdialog laufen.
- Tests koennen das Archiv mit einem In-Memory-Adapter betreiben.
- `SnapshotArchive` enthaelt keine eigene IndexedDB-Open-Logik und ruft Tauri `invoke` nicht direkt auf.
- Alle runtime-spezifischen Snapshot-Operationen liegen im jeweiligen aktiven Adapter.

### Paket 2: Tauri-State-Commands parametrisieren

Ziel: Tauri schreibt Snapshots in eine separate Datei, ohne die Rust-IPC-Pfade fuer Laden, Speichern und Quarantaene zu duplizieren.

Arbeiten in `src-tauri/src/lib.rs`:

- Konstante `SNAPSHOT_STATE_FILENAME: &str = "ruhestand_suite_snapshots.json";`
- Bestehende Pfadlogik verallgemeinern:
  - `resolve_state_filename(target: Option<&str>) -> Result<&'static str, String>`
  - erlaubte Targets: `live`, `snapshots`
  - unbekannte Targets muessen mit Fehler abbrechen, niemals freie Dateinamen akzeptieren.
- Bestehende Commands parametrisieren statt neue fast identische Commands anzulegen:
  - `load_app_state(app, target: Option<String>)`
  - `save_app_state(app, content: String, target: Option<String>)`
  - `quarantine_app_state(app, target: Option<String>)`
- Default ohne `target` bleibt `live`, damit bestehende Frontend-Aufrufe kompatibel bleiben.
- Atomisches Schreiben, `.bak`-Handling und Quarantaene bleiben ein gemeinsamer Codepfad.
- Der bestehende Tauri-Schliessmechanismus (`confirm_app_close`) bleibt auf Live-Daten beschraenkt:
  - Snapshot-Schreibvorgaenge sind explizite, abgeschlossene Nutzeraktionen.
  - Es gibt keinen debounced Snapshot-Flush, der beim Schliessen nachgezogen werden muesste.
  - Kein zusaetzlicher Snapshot-Flush wird in den Close-Handler eingebaut.

Akzeptanzkriterien:

- `ruhestand_suite_data.json` bleibt ohne Snapshot-Archiv.
- `ruhestand_suite_snapshots.json` wird nur durch Snapshot-Aktionen geaendert.
- Korrupte Snapshot-Datei kann isoliert behandelt werden, ohne aktive Arbeitsdaten zu verlieren.
- Es gibt keine duplizierten Rust-Commands fuer Live- und Snapshot-Datei.
- Kein Tauri-Command akzeptiert beliebige Pfade oder Dateinamen aus dem Frontend.
- `confirm_app_close` wartet weiterhin nur auf den Live-Daten-Flush; Snapshot-Aktionen muessen selbst atomisch abgeschlossen sein.

### Paket 3: IndexedDB-Snapshot-Store in bestehender DB

Ziel: Browser nutzt getrennten Snapshot-Store.

Arbeiten:

- `app/shared/persistence-adapter-indexeddb.js` von Version `1` auf `2` anheben.
- Store-Konstante `SNAPSHOT_STORE = 'snapshots'` ergaenzen.
- `ensureStore(upgradeDb, SNAPSHOT_STORE)` in `onupgradeneeded` ergaenzen.
- Adaptermethoden `listSnapshots/readSnapshot/writeSnapshot/deleteSnapshot` nutzen dieselbe Datenbank `ruhestand-suite`, aber Transaktionen gegen den Store `snapshots`.
- Snapshot-Liste nur aus diesem Store laden.
- Snapshot-Payloads als strukturierte Objekte speichern, nicht als aktive Live-Records.
- Optional alte `ruhestandsmodell_snapshot_*`-Records aus dem Live-Store lesen und migrieren.
- `versionchange`-Handling des bestehenden Adapters erweitern:
  - DB-Verbindung schliessen wie bisher,
  - internes Flag setzen, z. B. `outdated = true`,
  - `ensureOpen()`, `saveBatch()`, `writeMetadata()` und Snapshot-Methoden muessen dieses Flag vor jedem neuen Open-/Write-Versuch pruefen,
  - bei `outdated === true` sofort mit einer klaren, UI-faehigen Fehlermeldung abbrechen, z. B. "Datenbankverbindung veraltet, bitte neu laden",
  - zusaetzlich sichtbares UI-Signal oder Event ausloesen, damit Nutzer den Tab neu laden,
  - optional automatischer Reload nach erfolgreichem Live-Flush,
  - kein stiller Zustand, in dem der naechste Flush nur intern fehlschlaegt.

Akzeptanzkriterien:

- Live-Store-Flush wird durch Snapshot-Anzahl nicht groesser.
- Snapshot-Liste funktioniert im Browser ohne File System Access API.
- IndexedDB-Fehler laufen ueber UI-Fehlerpfad.
- Es wird keine zweite IndexedDB-Datenbank fuer Snapshots angelegt.
- Offene alte Tabs erhalten bei `versionchange` eine klare Meldung oder werden kontrolliert neu geladen.
- Ein alter Tab oeffnet nach `versionchange` nicht still eine neue Verbindung gegen die bereits aktualisierte DB, sondern bricht weitere Adapteraufrufe bewusst mit Reload-Hinweis ab.

### Paket 4: Snapshot-Key-Policy zentralisieren

Ziel: Snapshot-Erstellung und Restore nutzen explizite, getestete Key-Regeln.

Arbeiten:

- In `app/shared/persistence-key-policy.js` oder einem neuen Modul definieren:
  - `isAllowedSnapshotCaptureKey(key)`
  - `isAllowedSnapshotRestoreLiveKey(key, options)`
  - `isSnapshotProfileScopedKey(key)`
  - `isSnapshotGlobalDomainKey(key)`
  - `isSnapshotTechnicalKey(key)`
  - `isProfileRegistryKey(key)`
  - `isProfileScopedFixedKey(key)`
  - `isLegacySnapshotKey(key)`
- Capture darf Profil-Registry aufnehmen, Restore darf sie im Standardmodus erhalten.
- Legacy-Snapshot-Keys werden nie in neue Snapshots aufgenommen.
- Capture muss `activeProfileId` aus `rs_current_profile` bzw. der Profile-Registry in die Snapshot-Metadaten schreiben.
- Standard-Restore braucht aktuelle Registry, `snapshot.activeProfileId` und die Liste der festen profilbezogenen Live-Keys als Kontext.
- Die Key-Policy unterscheidet drei Kategorien:
  - Profilgebundene Live-Keys: feste Keys aus `PROFILE_SCOPED_FIXED_KEYS`, z. B. `profile_tagesgeld`, `profile_health_bucket`, `depot_tranchen`.
  - Globale fachliche Keys: z. B. `CONFIG.STORAGE.LS_KEY`, `balance_expenses_*`, `household_withdrawal_mode`, schema-gekoppelte Migrationsmarker wie `CONFIG.STORAGE.MIGRATION_FLAG` bzw. alle `migration_*`-Keys und andere fachliche App-Zustaende, die nicht zu einem einzelnen Profil gehoeren.
  - Technische/Umgebungs-Keys: z. B. Snapshot-Keys, Debug-/Log-Level, `featureFlags`, `etfProxyUrl` und aehnliche Konfiguration, die nicht direkt das Datenschema der wiederhergestellten Modelldaten beschreiben.
- Standard-Restore stellt profilgebundene Live-Keys und globale fachliche Keys wieder her.
- Technische/Umgebungs-Keys werden im Standard-Restore nicht blind ueberschrieben; sie bleiben Full-Restore oder expliziten Einzelentscheidungen vorbehalten.
- Schema-gekoppelte Migrationsmarker sind keine rein technischen Keys. Sie muessen beim Standard-Restore wie globale fachliche Keys behandelt werden:
  - aktuelle Live-Marker werden beim gezielten Restore geloescht,
  - Marker aus dem Snapshot werden geschrieben,
  - fehlen Marker im Snapshot, bleiben sie nach dem Restore bewusst fehlend, damit nach dem Reload ausstehende Migrationen wieder korrekt laufen koennen.

Akzeptanzkriterien:

- Keine Snapshot-in-Snapshot-Aufnahme.
- Kein pauschales Restore der Profil-Registry im Standardmodus.
- Standard-Restore spielt feste Profil-Live-Keys nur zurueck, wenn `snapshot.activeProfileId` in der aktuellen Registry existiert.
- `rs_current_profile` und `rs_active_profile` werden im Standard-Restore nur auf `snapshot.activeProfileId` gesetzt, wenn diese ID aktuell existiert.
- Standard-Restore stellt globale fachliche Keys nach Policy wieder her, technische/Umgebungs-Keys aber nicht blind.
- Migrationsmarker, die an das Datenschema gekoppelt sind, werden im Standard-Restore mit dem Snapshot-Stand synchronisiert und nicht aus dem aktuellen Live-Bestand behalten.
- Tests decken erlaubte, ausgeschlossene und profilbezogene Keys ab.

### Paket 5: `StorageManager.createSnapshot()` umbauen

Ziel: Jahresabschluss schreibt in `SnapshotArchive`, nicht in den Live-Store.

Arbeiten:

- Vor Capture sicherstellen, dass aktive Dirty-Daten konsistent sind:
  - alle noch fokussierten/ausstehenden UI-Eingaben synchron in das State-Objekt bzw. die Live-Persistenz uebernehmen,
  - ausstehende Debounce-Persistenz nicht abwarten lassen, sondern explizit `await PersistenceFacade.flush()` ausfuehren,
  - Snapshot-Capture darf erst aus der Persistenz lesen, wenn dieser Flush erfolgreich abgeschlossen ist.
- Records ueber zentrale Capture-Policy aus `PersistenceFacade.exportAllSync()` oder `persistenceStorage` lesen.
- Aktive Profil-ID und Profilname aus `rs_current_profile` und `rs_profiles_v1` aufloesen und in Snapshot-Metadaten speichern.
- Snapshot-Payload `persistence-records-v1` erstellen.
- Ueber `SnapshotArchive.writeSnapshot()` schreiben; dieses delegiert an `PersistenceFacade.writeSnapshot()`.
- File-System-Handle nicht mehr als Standardpfad verwenden.

Akzeptanzkriterien:

- Snapshot-Erstellung veraendert `ruhestand_suite_data.json` nur, wenn vorher Dirty-Live-Daten geflusht werden muessen.
- Snapshot-Erstellung enthaelt die unmittelbar vor dem Klick eingegebenen Werte, auch wenn der normale Debounce-Timer noch nicht gelaufen waere.
- Das Snapshot-Archiv wird separat geschrieben.
- Snapshot enthaelt keine alten Snapshots.
- Snapshot enthaelt `activeProfileId`; ohne gueltige Profil-ID muss die UI/Fehlerbehandlung den Snapshot als nicht standard-restore-faehig behandeln.

### Paket 6: `renderSnapshots()`, `restoreSnapshot()`, `deleteSnapshot()` umbauen

Ziel: UI-Aktionen arbeiten gegen `SnapshotArchive`.

Arbeiten:

- `renderSnapshots()` liest `SnapshotArchive.listSnapshots()`.
- Status zeigt getrennte Ablage:
  - Tauri: `Speicherort: App-Speicher (separates Snapshot-Archiv)`
  - Browser: `Speicherort: Browser-Speicher (IndexedDB Snapshot-Archiv)`
- `restoreSnapshot()` liest Snapshot aus Archiv.
- Restore:
  - kein `persistenceStorage.clear()`
  - nur erlaubte Live-Keys entfernen/ersetzen
  - Snapshot-Archiv unangetastet lassen
  - Profil-Registry im Standardmodus erhalten
  - feste profilbezogene Live-Keys nur wiederherstellen, wenn `snapshot.activeProfileId` in der aktuellen Registry existiert
  - `rs_current_profile` und `rs_active_profile` nur auf `snapshot.activeProfileId` setzen, wenn diese ID aktuell existiert
  - nach erfolgreichem Standard-Restore die Registry-Daten des betroffenen Profils mit den wiederhergestellten Live-Keys aktualisieren
  - nach Restore `PersistenceFacade.flush()`
  - danach `location.reload()`
- `deleteSnapshot()` loescht nur Archiv-Eintrag.
- Standard-Restore muss als harte Reihenfolge implementiert werden:
  1. `saveCurrentProfileFromLocalStorage()` ausfuehren, damit ungespeicherte Live-Daten des aktuell aktiven Profils in der Registry landen.
  2. Pruefen, ob `snapshot.activeProfileId` in der aktuellen Registry existiert. Wenn nicht, Standard-Restore abbrechen.
  3. Erlaubte profilgebundene Live-Keys und globale fachliche Live-Keys gezielt loeschen.
  4. Snapshot-Werte fuer erlaubte profilgebundene Live-Keys und globale fachliche Keys schreiben.
  5. `rs_current_profile` und `rs_active_profile` auf `snapshot.activeProfileId` setzen.
  6. `saveCurrentProfileFromLocalStorage()` erneut ausfuehren, damit die wiederhergestellten Live-Keys in `registry.profiles[snapshot.activeProfileId].data` persistiert werden.
  7. `PersistenceFacade.flush()` ausfuehren.
  8. `location.reload()` ausloesen.

Akzeptanzkriterien:

- Restore loescht keine anderen Snapshots.
- Delete loescht genau einen Snapshot.
- Profil-Registry wird im Standardmodus nicht still zurueckgesetzt.
- Nach dem Snapshot angelegte Profile bleiben im Standard-Restore erhalten.
- Wenn `snapshot.activeProfileId` nicht mehr existiert, werden profilgebundene Live-Keys nicht still in das aktuell ausgewaehlte Profil geschrieben.
- Ungespeicherte Live-Daten des vor Restore aktiven Profils gehen nicht verloren, weil sie vor dem Ueberschreiben in die Registry gesichert werden.
- `registry.profiles[snapshot.activeProfileId].data` enthaelt nach Restore die wiederhergestellten Live-Profil-Keys.

### Paket 7: Jahresabschluss-Reihenfolge korrigieren

Ziel: Snapshot entsteht vor jeder Jahresabschluss-Mutation.

Arbeiten in `app/balance/balance-binder-snapshots.js`:

- Reihenfolge von `handleJahresabschluss()` anpassen:
  1. Label lesen
  2. bestaetigen
  3. ausstehende UI-Eingaben synchron in den Live-State uebernehmen
  4. `await PersistenceFacade.flush()` ausfuehren, damit der Snapshot den letzten Eingabestand sieht
  5. Snapshot erstellen
  6. Inflation/Alter/Jahresupdate ausfuehren
  7. Ausgabenjahr rollen
  8. Live-Daten flushen
  9. UI/Snapshot-Liste aktualisieren
- Fehlerverhalten:
  - Wenn der Vorab-Flush vor dem Snapshot fehlschlaegt, wird der gesamte Jahresabschluss ebenfalls abgebrochen.
  - Wenn `createSnapshot()` bzw. `SnapshotArchive.writeSnapshot()` fehlschlaegt, wird der gesamte Jahresabschluss abgebrochen.
  - Danach duerfen `applyAnnualInflation()`, Altersfortschreibung, `rollExpensesYear()` und Live-Flush nicht laufen.
  - Nutzer erhalten eine klare Meldung, z. B. "Jahresabschluss abgebrochen - Snapshot konnte nicht erstellt werden."
  - Ein optionales "Trotzdem fortfahren?" darf nur als explizite zweite Nutzerentscheidung implementiert werden, nie als stiller Fallback.
- Toast-Text anpassen: Snapshot als Sicherung vor Jahresabschluss bezeichnen.

Akzeptanzkriterien:

- Test beweist: `createSnapshot` kommt vor `applyAnnualInflation`.
- Test beweist: unmittelbar vor dem Klick geaenderte Eingabewerte werden vor Snapshot-Capture synchronisiert und geflusht.
- Restore eines Jahresabschluss-Snapshots fuehrt bei erneutem Jahresabschluss nicht zu Doppel-Inflation aus demselben Abschlussstand.
- Test beweist: Wenn Snapshot-Erstellung fehlschlaegt, wird keine Jahresabschluss-Mutation ausgefuehrt.

### Paket 8: UI und Texte bereinigen

Ziel: Nutzer brauchen keinen Ordner fuer den normalen Jahresabschluss.

Arbeiten:

- `Balance.html` pruefen:
  - **Ordner verbinden** aus normalem Jahresabschluss-/Snapshot-Workflow entfernen oder nach **Erweitert** verschieben.
  - Hilfetexte auf getrenntes App-Snapshot-Archiv umstellen.
  - Full-Restore-Warnung fuer Profil-Registry vorbereiten, falls Full Restore angeboten wird.
- Optional Groessen-/Anzahl-Hinweis anzeigen, aber nicht als Pflicht fuer ersten Slice.

Akzeptanzkriterien:

- Jahresabschluss ist ohne Ordnerauswahl nutzbar.
- UI unterscheidet automatisches Snapshot-Archiv und manuelle Exportfunktionen.

### Paket 9: Legacy-Migration und Rueckwaertskompatibilitaet

Ziel: Bestehende Snapshots bleiben nutzbar.

Arbeiten:

- Alte Datei-Snapshots aus verbundenem Ordner optional importierbar lassen.
- Alte interne `ruhestandsmodell_snapshot_*`-Records erkennen.
- Beim Start oder beim Oeffnen der Snapshot-Liste optional migrieren:
  - alten Snapshot lesen,
  - `activeProfileId` aus `localStorage["rs_current_profile"]` im alten `full-localstorage`-Payload extrahieren, falls vorhanden,
  - wenn kein `rs_current_profile` vorhanden ist, aber der Snapshot aus der Vor-Profilverbund-Zeit stammt, `activeProfileId` auf `"default"` setzen,
  - `activeProfileName` optional aus `localStorage["rs_profiles_v1"].profiles[activeProfileId].meta.name` ableiten,
  - wenn keine `activeProfileName` ableitbar ist und `activeProfileId === "default"` gesetzt wurde, einen neutralen Namen wie `"Default"` verwenden oder den Namen leer lassen,
  - nur wenn trotz dieser Fallback-Regel keine gueltige `activeProfileId` bestimmt werden kann, Snapshot als nicht standard-restore-faehig markieren und nur Full Restore/Import anbieten,
  - ins neue SnapshotArchive schreiben,
  - alten Live-Record nur nach erfolgreicher Migration und ggf. Nutzerbestaetigung entfernen.
- `full-localstorage` beim Restore weiter unterstuetzen.
- Alte IndexedDB-Datenbank `snapshotDB` bereinigen:
  - Diese DB wurde bisher nur fuer File System Access Directory Handles genutzt.
  - Wenn der Ordnerpfad nicht mehr Standard ist, soll einmalig `indexedDB.deleteDatabase('snapshotDB')` ausgefuehrt werden.
  - Cleanup erst nach erfolgreicher Initialisierung des neuen SnapshotArchive markieren, z. B. in Metadata `legacySnapshotDbCleanup.completedAt`.
  - Fehler beim Loeschen duerfen den App-Start nicht blockieren, muessen aber im Debug/Console-Pfad sichtbar sein.
  - Wenn der optionale Ordner-Export spaeter weiter existiert, darf er nicht mehr von der alten `snapshotDB` als Pflichtpfad abhaengen.

Akzeptanzkriterien:

- Nutzer verlieren bestehende Snapshots nicht.
- Migration erzeugt keine Duplikate.
- Kein automatisches Loeschen alter Snapshot-Records ohne sichere Migrationsmarkierung.
- Migrierte alte Snapshots erhalten nach Moeglichkeit `activeProfileId` aus ihrem eigenen Payload.
- Alte Vor-Profilverbund-Snapshots ohne `rs_current_profile` erhalten `activeProfileId: "default"`, damit sie im normalen Standard-Restore-Pfad nutzbar bleiben.
- Alte Snapshots ohne ableitbare oder per Fallback bestimmbare `activeProfileId` werden nicht still per Standard-Restore wiederhergestellt.
- Die alte Browser-Datenbank `snapshotDB` wird nach Migration/Cleanup nicht weiter benoetigt.
- Cleanup ist idempotent und bricht die App bei Browserfehlern nicht ab.

### Paket 10: Tests

Mindestens zu aktualisieren oder zu ergaenzen:

| Testdatei | Erwartete Abdeckung |
| --- | --- |
| `tests/balance-binder-snapshots.test.mjs` | SnapshotArchive-Create/List/Delete/Restore, keine Snapshot-in-Snapshot-Aufnahme |
| `tests/balance-annual-workflow-contract.test.mjs` | UI-Eingaben vor Snapshot synchronisieren, Vorab-Flush, `createSnapshot` vor `applyAnnualInflation`, Rollover danach, Abort bei Flush-/Snapshot-Fehler |
| neuer SnapshotArchive-Test | Delegation ueber `PersistenceFacade`/Adaptermethoden, In-Memory-Fake, getrennte Live-/Archivdaten |
| neuer Tauri-Snapshot-Index-Test | `listSnapshots()` liefert nur Metadaten ohne `records`; `readSnapshot(id)` liefert Vollpayload |
| neuer IndexedDB-Upgrade-Test | DB `ruhestand-suite` Version 2 enthaelt `kv`, `metadata`, `snapshots`; keine zweite Snapshot-DB; `versionchange` signalisiert Reload/Tab-Hinweis und setzt Adapter auf `outdated`, weitere Calls brechen klar ab |
| neuer Policy-Test | Capture-/Restore-Key-Policy, `activeProfileId`, Key-Kategorien, schema-gekoppelte `migration_*`-Marker als globale fachliche Keys, Standard-Restore nur bei existierender Profil-ID |
| neuer Profil-Restore-Test | aktuelles Profil wird vor Restore gespeichert; Snapshot-Profil-Registrydaten werden nach Restore aktualisiert |
| Legacy-activeProfile-Test | `activeProfileId` wird aus altem `full-localstorage`-Payload extrahiert, bei Vor-Profilverbund-Snapshots auf `"default"` gesetzt oder nur dann als nicht standard-restore-faehig markiert, wenn kein gueltiger Fallback moeglich ist |
| Legacy-Cleanup-Test | `snapshotDB`-Cleanup idempotent und nicht blockierend |
| ggf. Tauri-Command-Test/Rust-Test | parametrisierte Targets `live`/`snapshots`, separate Dateien, atomisches Schreiben, Quarantine |

Mindestens auszufuehren:

```powershell
node tests\run-single.mjs tests\balance-binder-snapshots.test.mjs
node tests\run-single.mjs tests\balance-annual-workflow-contract.test.mjs
node tests\run-tests.mjs
```

Wenn `src-tauri/src/lib.rs` geaendert wird, zusaetzlich:

```powershell
npm run tauri:build
```

oder ein gezielter Rust-/Tauri-Test, falls vorhanden.

### Paket 11: Dokumentation

Zu aktualisieren:

- `README.md`
  - Jahresabschluss-Snapshots ohne Ordnerfreigabe beschreiben.
  - getrennte aktive Daten und Snapshot-Archiv knapp erlaeutern.
- `docs/reference/TECHNICAL.md`
  - Persistenz- und Snapshot-Architektur aktualisieren.
- `docs/reference/BALANCE_MODULES_README.md`
  - Rolle von `balance-storage.js`, `balance-binder-snapshots.js` und SnapshotArchive aktualisieren.
- `docs/internal/PERSISTENCE_MIGRATION_PLAN.md`
  - Entscheidung dokumentieren: Snapshots nicht in `ruhestand_suite_data.json`.

## Nicht-Ziele fuer diesen Slice

- Keine Cloud-Synchronisation.
- Keine Verschluesselung der Snapshot-Datei.
- Keine SQLite-Migration.
- Kein komplexes Profil-Merge-UI im ersten Slice.
- Keine Entfernung manueller Export-/Importpfade, solange Legacy-Kompatibilitaet gebraucht wird.
- Kein Build der Tauri-EXE, ausser die konkrete Umsetzung verlangt es.

## Risiken und Gegenmassnahmen

| Risiko | Auswirkung | Gegenmassnahme |
| --- | --- | --- |
| Snapshots landen wieder im Live-Store | Typing-Lag, grosse Live-Datei, unnoetige Writes | separate SnapshotArchive-Abstraktion und Tests, `ruhestand_suite_data.json` darf keine neuen Snapshot-Records erhalten |
| Restore loescht Snapshot-Historie | Verlust historischer Sicherungen | kein `clear()`, nur `clearAllowedSync`/gezielter Replace von Live-Keys |
| Snapshot nach Mutation | Doppel-Inflation/Doppel-Alterung nach Restore und erneutem Abschluss | Snapshot vor jeder Mutation, Contract-Test |
| Profil-Registry oder falsche Profil-Live-Keys werden blind ueberschrieben | Verlust spaeter angelegter Profile oder Snapshot fuer Profil A landet in Profil B | Standard-Restore erhaelt Registry und spielt feste Profil-Live-Keys nur zurueck, wenn `snapshot.activeProfileId` aktuell existiert |
| Aktuell aktives Profil verliert ungespeicherte Live-Daten beim Restore | Datenverlust nach Profilwechsel vor Snapshot-Restore | vor jedem Standard-Restore `saveCurrentProfileFromLocalStorage()` ausfuehren |
| Snapshot-Profil wird nur live, aber nicht in Registry aktualisiert | Reload oder Profilwechsel kann wieder alte Registry-Daten laden | nach Schreiben der Snapshot-Live-Keys `rs_current_profile` setzen und erneut `saveCurrentProfileFromLocalStorage()` ausfuehren |
| Globale fachliche und technische Keys werden vermischt | unerwuenschte Aenderung von Einstellungen oder fehlende fachliche Wiederherstellung | Policy-Kategorien fuer profilgebundene, globale fachliche und technische Keys |
| Migrationsmarker bleiben aus aktuellem Live-Stand erhalten | alte Snapshot-Daten ueberspringen nach Reload noetige Schema-Migrationen | schema-gekoppelte `migration_*`-Marker als globale fachliche Keys behandeln, beim Restore loeschen und aus Snapshot neu schreiben bzw. bewusst fehlen lassen |
| Alte Snapshots ohne `activeProfileId` werden falsch standard-restored | Snapshot wird in falsches aktives Profil geschrieben | `activeProfileId` aus altem Payload extrahieren; bei Vor-Profilverbund-Snapshots `"default"` setzen; nur ohne gueltigen Fallback Standard-Restore sperren |
| Alte Snapshots werden unlesbar | Upgrade-Regression | `full-localstorage` weiter unterstuetzen, Legacy-Migration |
| Zwei Speicherpfade driften auseinander | inkonsistente UI/Fehlerpfade | SnapshotArchive delegiert ueber Facade an aktiven Adapter, Adapter-Tests |
| SnapshotArchive dupliziert Runtime-Logik | zweite IndexedDB-/IPC-Implementierung, Race Conditions | optionale Snapshot-Methoden im Adaptervertrag, keine direkte Runtime-Logik im Archive |
| Alte `snapshotDB` bleibt als Datenmuell bestehen | unklare Browser-Altlasten und alte Directory-Handles | einmaliger idempotenter Cleanup nach SnapshotArchive-Initialisierung |
| Tauri-Snapshot-Sammeldatei wird gross | seltene Snapshot-Aktionen werden langsamer, `listSnapshots()` laedt zu viel | `listSnapshots()` liefert leichten Index ohne `records`; Einzeldateien als empfohlener naechster Schritt ab zweistelliger Snapshot-Zahl |
| IndexedDB-Version 2 kollidiert mit offenem altem Tab | stiller Flush-Fehler oder verlorene Eingabe in altem Tab | `versionchange` setzt Adapter auf `outdated`, zeigt Reload-Hinweis oder fuehrt kontrollierten Reload nach Flush aus; weitere Calls brechen klar ab |
| Jahresabschluss-Snapshot verpasst letzte Eingabe | Snapshot enthaelt Stand vor den letzten Tastenschlaegen | vor Snapshot-Capture UI synchronisieren und `await PersistenceFacade.flush()` erzwingen |
| Snapshot-Erstellung schlaegt beim Jahresabschluss fehl | Jahresabschluss wuerde ohne Sicherung mutieren | Jahresabschluss hart abbrechen; Mutationen nur nach erfolgreichem Snapshot |
| Unnoetiger Snapshot-Flush im Tauri-Close-Handler | komplexerer Shutdown-Flow ohne Nutzen | bewusst kein Snapshot-Flush bei `confirm_app_close`; Snapshot-Aktionen muessen sofort atomisch schreiben |

## Review-Checkliste

- [ ] Gibt es eine getrennte Snapshot-Ablage fuer Tauri?
- [ ] Gibt es in der bestehenden IndexedDB `ruhestand-suite` einen separaten Store `snapshots` statt einer zweiten DB?
- [ ] Bleibt `ruhestand_suite_data.json` frei von neuen Snapshot-Archivdaten?
- [ ] Nutzen Tauri-Commands parametrisierte Targets statt duplizierter Snapshot-Commands?
- [ ] Sind Snapshot-Operationen als optionale Adaptermethoden implementiert und ueber `PersistenceFacade` delegiert?
- [ ] Enthaelt `SnapshotArchive` keine eigene IndexedDB-Open-Logik und keine direkten Tauri-IPC-Aufrufe?
- [ ] Wird das Snapshot-Archiv nur bei Snapshot-Aktionen gelesen/geschrieben?
- [ ] Liefert `listSnapshots()` einen leichten Index ohne vollstaendige `records`?
- [ ] Setzt der IndexedDB-Adapter bei `versionchange` ein `outdated`-Flag und blockiert weitere Open-/Write-Versuche mit klarer Reload-Meldung?
- [ ] Wird beim Restore kein `persistenceStorage.clear()` verwendet?
- [ ] Bleiben andere Snapshots beim Restore erhalten?
- [ ] Entsteht der Jahresabschluss-Snapshot vor `applyAnnualInflation()` und vor Altersfortschreibung?
- [ ] Bricht der Jahresabschluss ab, wenn Snapshot-Erstellung fehlschlaegt?
- [ ] Wird die Profil-Registry im Standard-Restore erhalten?
- [ ] Speichert jeder neue Snapshot `activeProfileId` und optional `activeProfileName`?
- [ ] Spielt Standard-Restore profilgebundene Live-Keys nur zurueck, wenn `snapshot.activeProfileId` in der aktuellen Registry existiert?
- [ ] Speichert Standard-Restore vor dem Ueberschreiben zuerst das aktuell aktive Profil?
- [ ] Aktualisiert Standard-Restore nach dem Schreiben die Registry-Daten von `snapshot.activeProfileId`?
- [ ] Unterscheidet die Restore-Policy profilgebundene, globale fachliche und technische Keys?
- [ ] Behandelt die Restore-Policy schema-gekoppelte `migration_*`-Marker als globale fachliche Keys, nicht als zu erhaltende technische Keys?
- [ ] Verhindert Standard-Restore, dass ein Snapshot fuer Profil A still in Profil B geschrieben wird?
- [ ] Gibt es eine explizite Warnung fuer Full Restore der Profil-Registry?
- [ ] Informiert `versionchange` alte Browser-Tabs sichtbar oder laedt kontrolliert neu?
- [ ] Bleibt `confirm_app_close` bewusst auf Live-Daten beschraenkt?
- [ ] Wird die alte Browser-DB `snapshotDB` idempotent bereinigt?
- [ ] Extrahiert die Legacy-Migration `activeProfileId` aus alten `full-localstorage`-Snapshots, falls moeglich?
- [ ] Setzt die Legacy-Migration fuer Vor-Profilverbund-Snapshots ohne `rs_current_profile` `activeProfileId` auf `"default"`?
- [ ] Synchronisiert und flusht der Jahresabschluss ausstehende UI-Eingaben, bevor der Snapshot erstellt wird?
- [ ] Bleiben alte `full-localstorage`-Snapshots wiederherstellbar?
- [ ] Sind Create, List, Restore, Delete und Jahresabschluss-Reihenfolge getestet?

## Empfohlene Umsetzungsreihenfolge

1. Adaptervertrag und `PersistenceFacade` um optionale Snapshot-Methoden erweitern.
2. SnapshotArchive als schlanke Fach-/Normalisierungsschicht mit In-Memory-Testadapter definieren.
3. Key-Policy fuer Capture/Restore inklusive Profil-Registry- und `activeProfileId`-Regel testen.
4. Tauri-State-Commands fuer `live`/`snapshots` parametrisieren und im Tauri-Adapter nutzen.
5. IndexedDB `ruhestand-suite` auf Version 2 mit Store `snapshots` erweitern und im IndexedDB-Adapter nutzen.
6. `StorageManager` auf SnapshotArchive umstellen.
7. Jahresabschluss-Reihenfolge auf Snapshot-vor-Mutation korrigieren.
8. Standard-Restore fuer feste Profil-Live-Keys anhand `snapshot.activeProfileId` mit Vorher-/Nachher-Profilsicherung implementieren.
9. UI-Texte und Ordnerbutton bereinigen.
10. Legacy-Lesepfad fuer alte Snapshots erhalten und `snapshotDB` bereinigen.
11. Tests und Doku-Sync ausfuehren.

## Spaetere Ausbaustufe

- Manuelle Aktion **Snapshot exportieren** fuer einzelne Archiv-Eintraege.
- Manuelle Aktion **Snapshot importieren**.
- Aufbewahrungsregeln, z. B. "letzte 10 Snapshots behalten".
- Preview/Merge fuer Profil-Registry und Multi-Profil-Daten.
- Physische Einzeldateien pro Snapshot statt Sammeldatei sind der empfohlene naechste Schritt, sobald Snapshot-Anzahl oder Archivgroesse zweistellig bzw. merklich wird.
