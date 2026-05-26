# Persistenz-Migration: localStorage -> IndexedDB / Tauri-Datei

**Stand:** 2026-05-24
**Status:** Arbeitsdokument
**Ziel:** Bruchfreie Weiterentwicklung der aktuellen lokalen Persistenz von `localStorage` zu einer runtime-abhaengigen Persistenz:

- Browser: IndexedDB als automatische lokale Ablage
- Tauri: JSON-Datei im App-Datenverzeichnis als automatische lokale Desktop-Ablage
- Tauri optional spaeter: SQLite, falls fachliche Tabellen/Queries erforderlich werden
- Export/Import bleibt als Backup- und Notfallpfad erhalten, ist aber nicht der primaere Migrationsweg

## Ausgangslage

Die App speichert fachliche Nutzdaten aktuell primaer im Browser-`localStorage`. Das betrifft unter anderem:

- Balance-State unter `ruhestandsmodellValues_v29_guardrails`
- Balance-Migrationsflag `migration_v29_inflation_sanitized`
- Profile und Profilauswahl unter `rs_profiles_v1`, `rs_current_profile`, `rs_active_profile`
- profilbezogene Werte wie `profile_tagesgeld`, `profile_health_bucket`, `depot_tranchen`
- Simulator- und UI-Werte mit Praefixen `sim_` und `sim.`
- Ausgaben-Check unter `balance_expenses_v1`
- Snapshots mit Praefix `ruhestandsmodell_snapshot_`
- globale Einstellungen wie `etfProxyUrl`, `etfProxyUrls`, `enableWorkerTelemetry`
- Log-/Anzeigeoptionen wie `showCareDetails`, `logDetailLevel`, `worstLogDetailLevel`, `backtestLogDetailLevel`

Die wichtigsten beteiligten Module sind:

- `app/balance/balance-storage.js`
- `app/profile/profile-storage.js`
- `app/profile/profile-key-policy.js`
- `app/profile/profile-live-storage.js`
- `app/profile/profile-bundle-io.js`
- `app/balance/balance-expenses-storage.js`
- `app/tranches/tranchen-manager-state.js`
- mehrere Simulator-Module mit direktem `localStorage`-Zugriff

Der Bestand ist funktional, aber langfristig problematisch:

- `localStorage` ist synchron und blockiert den Main Thread.
- Es ist nur String-Key-Value-Speicher und erzwingt ad-hoc JSON-Parsing.
- Die Daten sind unverschluesselt und an Browserprofil und Origin gebunden.
- Verschiedene fachliche Dateninseln wachsen nebeneinander.
- Browser- und Tauri-Laufzeit koennen nicht unterschiedlich gute Speicherziele nutzen.
- Eine manuelle Export-/Import-Migration waere fehleranfaellig und aus Nutzersicht unerwuenscht.

## Zielbild

Die Fachmodule sollen nicht mehr direkt wissen, ob Daten aus `localStorage`, IndexedDB oder einer Tauri-Datei kommen. Stattdessen gibt es eine zentrale Persistenzschicht mit runtime-abhaengigem Adapter und synchronem In-Memory-Cache.

```text
Feature-Module
  -> PersistenceFacade
      -> synchroner In-Memory-Cache fuer Feature-Code
      -> BrowserPersistenceAdapter
          -> IndexedDB
          -> localStorage nur noch Legacy-/Fallback-Leser
      -> TauriPersistenceAdapter
          -> JSON-Datei im App-Datenverzeichnis
          -> SQLite optional in spaeterer Ausbaustufe
          -> localStorage nur noch Legacy-/Fallback-Leser
```

Die Migration soll automatisch beim App-Start laufen, ohne dass Nutzer Export und Import manuell ausfuehren muessen.

## Nicht-Ziele

- Keine Cloud-Speicherung als verpflichtende oder primaere Persistenz.
- Keine serverseitige Datenhaltung.
- Keine sofortige Entfernung aller `localStorage`-Zugriffe in einem Grossumbau.
- Keine Migration ueber verpflichtenden manuellen Export/Import.
- Keine Verschluesselung im ersten Schritt, aber Architektur so vorbereiten, dass sie spaeter moeglich ist.

## Laufzeiterkennung

Eine kleine Runtime-Erkennung sollte zentral in `app/shared/runtime-env.js` liegen.

```js
export function detectRuntime() {
    if (typeof window === 'undefined') return 'unknown';
    if (window.__TAURI__ || window.__TAURI_INTERNALS__ || window.__TAURI_METADATA__) {
        return 'tauri';
    }
    return 'browser';
}

export function isTauriRuntime() {
    return detectRuntime() === 'tauri';
}
```

Diese Erkennung ist nur Feature-Auswahl, keine Sicherheitsgrenze.

## Zentrale Datenform

Fuer die erste Migration sollte kein komplexes relationales Fachmodell erzwungen werden. Der sicherste Zwischenschritt ist ein versioniertes App-Bundle, das das bisherige `localStorage`-Modell verlustfrei abbildet.

```js
{
    schemaVersion: 1,
    migratedAt: "2026-05-24T00:00:00.000Z",
    source: "localStorage",
    records: {
        "ruhestandsmodellValues_v29_guardrails": "...",
        "rs_profiles_v1": "...",
        "balance_expenses_v1": "...",
        "depot_tranchen": "..."
    }
}
```

Damit bleiben bestehende Profil-, Balance-, Simulator- und Tranchen-Contracts zunaechst erhalten. Spaeter koennen einzelne Bereiche aus `records` in staerker strukturierte Stores oder Tabellen migriert werden.

## PersistenceFacade mit synchronem Cache

Die bestehende App ist stark synchron aufgebaut: Eingaben, Profile, Tranchen und UI-Zustaende werden beim Seitenstart synchron gelesen und direkt in DOM- und Berechnungspfade gegeben. Eine direkte async-API fuer alle Feature-Module wuerde den UI-Callstack infizieren und viele Event-Handler, Tests und Bootstrap-Pfade riskant veraendern.

Deshalb sollte die erste technische Schnittstelle eine synchrone In-Memory-Facade sein:

```text
App-Bootstrap
  -> await PersistenceFacade.init()
      -> Backend oeffnen
      -> alle erlaubten Daten in Memory laden
      -> ggf. Migration aus localStorage ausfuehren
  -> Feature-Bootstrap
      -> getItemSync / setItemSync / removeItemSync
      -> async debounced Write-Through ins Backend
```

Die Facade entkoppelt die Feature-Module von IndexedDB/Tauri-Datei-Asynchronitaet.

```js
export async function init() {}
export function getItemSync(key) {}
export function setItemSync(key, value) {}
export function removeItemSync(key) {}
export function clearAllowedSync(keysOrPolicy) {}
export function keysSync() {}
export function exportAllSync() {}
export async function importAll(bundle, options) {}
export async function flush() {}
export async function getMetadata() {}
```

Wichtig:

- `value` bleibt im ersten Schritt ein String, damit bestehende JSON-Serialisierung nicht gleichzeitig refaktoriert werden muss.
- Feature-Reads und -Writes bleiben synchron.
- `init()`, `flush()`, Backend-Oeffnung und Import bleiben async.
- `exportAllSync()` liefert das gleiche Bundle-Format fuer Browser und Tauri aus dem Memory-Cache.
- `importAll()` ersetzt nicht blind alle Daten: Der Aufrufer entscheidet per `allowKey`, ob eine strenge Policy fuer Legacy-/Fremdquellen gilt oder ob ein eigenes Komplettbackup vollstaendig wiederhergestellt wird.
- Schreibvorgaenge werden in Memory sofort sichtbar und im Hintergrund debounced ins Backend geschrieben.
- Vor kritischen Aktionen wie Jahresabschluss, Export, Restore und App-Schliessen sollte `flush()` aufgerufen werden.

Minimaler Facade-Entwurf:

```js
const DEBOUNCE_MS = 250;

let memCache = {};
let adapter = null;
let initPromise = null;
let dirtyKeys = new Set();
let deletedKeys = new Set();
let flushTimer = null;

export async function init() {
    if (initPromise) return initPromise;
    initPromise = (async () => {
        adapter = await resolveAdapter();
        await adapter.open();
        memCache = await adapter.loadAll();
        await migrateLocalStorageIfNeeded({ adapter, memCache });
    })();
    return initPromise;
}

export function getItemSync(key) {
    return Object.prototype.hasOwnProperty.call(memCache, key) ? memCache[key] : null;
}

export function setItemSync(key, value) {
    memCache[key] = String(value);
    deletedKeys.delete(key);
    dirtyKeys.add(key);
    scheduleFlush();
}

export function removeItemSync(key) {
    delete memCache[key];
    dirtyKeys.delete(key);
    deletedKeys.add(key);
    scheduleFlush();
}

export async function flush() {
    clearScheduledFlush();
    const batch = {
        upserts: Array.from(dirtyKeys).map(key => [key, memCache[key]]),
        deletes: Array.from(deletedKeys)
    };
    dirtyKeys.clear();
    deletedKeys.clear();
    try {
        await adapter.saveBatch(batch);
    } catch (err) {
        batch.upserts.forEach(([key]) => dirtyKeys.add(key));
        batch.deletes.forEach(key => deletedKeys.add(key));
        throw err;
    }
}
```

Adapter-Vertrag:

```js
export async function open() {}
export async function loadAll() {}
export async function saveBatch({ upserts, deletes }) {}
export async function readMetadata(key) {}
export async function writeMetadata(key, value) {}
```

## Browser-Ziel: IndexedDB

IndexedDB sollte im Browser die automatische lokale Source of Truth werden.

Vorgeschlagene Datenbank:

```text
Database: ruhestand-suite
Version: 1

objectStore: kv
  keyPath: key
  record:
    key: string
    value: string
    updatedAt: string

objectStore: metadata
  keyPath: key
  record:
    key: string
    value: any
```

Warum zunaechst `kv` statt fachlicher Stores:

- direkte, risikoarme Migration aus `localStorage`
- keine gleichzeitige Aenderung aller Feature-Module
- Profil-Key-Policy kann weiter genutzt werden
- Export/Import bleibt trivial
- spaetere Normalisierung bleibt moeglich

Spaetere Ausbaustufe:

```text
profiles
expenses
snapshots
settings
audit
```

Diese Ausbaustufe sollte erst folgen, wenn die Adapter-Schicht stabil ist.

## Tauri-Ziel: JSON-Datei im App-Datenverzeichnis

In Tauri sollte die erste automatische Desktop-Persistenz keine relationale Datenbank erzwingen. Solange die erste Migrationsstufe ein flaches Key-Value-Bundle speichert, ist eine versionierte JSON-Datei im App-Datenverzeichnis die pragmatischere Loesung.

Vorgeschlagene Datei:

```text
<AppData>/RuhestandSuite/ruhestand_suite_data.json
```

Vorgeschlagenes Format:

```js
{
    schemaVersion: 1,
    updatedAt: "2026-05-24T00:00:00.000Z",
    records: {
        "ruhestandsmodellValues_v29_guardrails": "...",
        "rs_profiles_v1": "...",
        "balance_expenses_v1": "..."
    },
    metadata: {
        "storage.backend": "tauri-json-file",
        "localStorageMigration.v1.completedAt": "..."
    }
}
```

Vorteile gegenueber SQLite als Phase-1-Backend:

- kein nativer SQL-Treiber im ersten Schritt
- weniger Rust-/Cargo-/Plugin-Komplexitaet
- einfachere Debug- und Backup-Faehigkeit
- passt zum bestehenden App-Bundle-Modell
- leichter in Tests zu mocken

Schreibstrategie:

- Writes laufen ueber den In-Memory-Cache.
- Debounced Flush schreibt atomar in eine temporaere Datei und ersetzt danach die Zieldatei.
- Vor kritischen Aktionen wird `flush()` ausgefuehrt.

SQLite bleibt eine spaetere Option, wenn echte fachliche Tabellen, Abfragen, Indizes oder Sync-Konfliktlogik benoetigt werden.

### Tauri-Zugriff ueber Custom Rust Commands

Fuer die Phase-1-Dateipersistenz sollte kein generisches Tauri-FS-Plugin genutzt werden. Der sicherere und schlankere Weg sind eng zugeschnittene Rust-Commands in `src-tauri/src/lib.rs`.

Vorteile:

- keine zusaetzlichen Cargo-/NPM-Plugins
- kein breites File-System-Capability-Setup
- JavaScript kann nur die definierte App-State-Datei lesen und schreiben
- atomisches Schreiben kann zentral Rust-seitig sichergestellt werden
- Pfadlogik bleibt im Tauri-App-Datenverzeichnis

Vorgeschlagene Commands:

```rust
#[tauri::command]
fn save_app_state(app: tauri::AppHandle, content: String) -> Result<(), String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&app_dir).map_err(|e| e.to_string())?;
    let file_path = app_dir.join("ruhestand_suite_data.json");
    let tmp_path = file_path.with_extension("json.tmp");

    std::fs::write(&tmp_path, content).map_err(|e| e.to_string())?;
    std::fs::rename(&tmp_path, &file_path).map_err(|e| e.to_string())?;
    Ok(())
}

#[tauri::command]
fn load_app_state(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let file_path = app_dir.join("ruhestand_suite_data.json");
    if !file_path.exists() {
        return Ok(String::new());
    }
    std::fs::read_to_string(&file_path).map_err(|e| e.to_string())
}

#[tauri::command]
fn quarantine_app_state(app: tauri::AppHandle) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let file_path = app_dir.join("ruhestand_suite_data.json");
    if !file_path.exists() {
        return Ok(String::new());
    }
    let stamp = chrono_like_timestamp_for_filename();
    let quarantine_path = app_dir.join(format!("ruhestand_suite_data.{}.corrupt.json", stamp));
    std::fs::rename(&file_path, &quarantine_path).map_err(|e| e.to_string())?;
    Ok(quarantine_path.to_string_lossy().to_string())
}
```

Der Timestamp-Helper sollte ohne neue Abhaengigkeit umgesetzt werden, sofern moeglich. Falls Tauri/Rust-seitig kein Datumshelper ohne Zusatzcrate verfuegbar ist, kann der Quarantaene-Dateiname auch einen stabilen Suffix wie `.corrupt.json` nutzen und bestehende Dateien nummerieren.

JS-Adapter:

```js
const content = await window.__TAURI__.core.invoke('load_app_state');
await window.__TAURI__.core.invoke('save_app_state', { content: JSON.stringify(bundle) });
```

Die Commands muessen in `src-tauri/src/lib.rs` registriert und in Tauri-Tests bzw. beim Desktop-Smoke validiert werden.

### Optionale spaetere SQLite-Ausbaustufe

Vorgeschlagenes erstes Schema:

```sql
CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS metadata (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS migrations (
    id TEXT PRIMARY KEY,
    applied_at TEXT NOT NULL,
    source TEXT NOT NULL,
    details TEXT
);
```

Auch fuer SQLite waere `kv_store` der konservative Startpunkt. Ein fachliches SQLite-Schema fuer Profile, Tranchen und Ausgaben sollte erst folgen, wenn klar ist, dass die JSON-Datei-Variante nicht mehr reicht.

## Automatische Migration aus localStorage

Die Migration muss beim Start jeder Einstiegseite laufen, bevor Feature-Module Daten laden.

Betroffene Einstiegspunkte:

- `index.html`
- `Balance.html`
- `Simulator.html`
- `depot-tranchen-manager.html`
- `Handbuch.html`, falls dort persisted UI-State genutzt wird

Empfohlenes Bootstrapping:

```text
HTML
  -> app bootstrap
  -> initPersistence()
      -> detectRuntime()
      -> open target adapter
      -> check migration metadata
      -> if no migration: migrateLocalStorageToTarget()
      -> expose PersistenceFacade
  -> feature bootstrap
```

Migrationsalgorithmus:

```text
1. Zieladapter oeffnen.
2. Ziel-Metadata-Key `localStorageMigration.v1.completedAt` lesen.
3. Legacy-localStorage-Flag `ruhestandsapp_migrated_to_target` lesen.
4. Wenn Ziel-Metadata vorhanden:
   - normale App starten.
5. Wenn Legacy-Flag vorhanden, Ziel aber leer oder ohne Ziel-Metadata:
   - keine automatische Rueckmigration aus localStorage ausfuehren.
   - Start blockieren oder Recovery-Modus anzeigen.
   - Nutzer auf moeglichen Ziel-Speicherverlust hinweisen.
   - Restore aus Backup/Snapshot oder explizite manuelle Legacy-Wiederherstellung anbieten.
6. Wenn Ziel-Metadata nicht vorhanden und Legacy-Flag nicht vorhanden:
   - alle erlaubten Legacy-Keys aus localStorage lesen.
   - Bundle mit schemaVersion, source, createdAt und records bilden.
   - Bundle in Zieladapter schreiben.
   - Metadaten schreiben:
     - migration id
     - source key count
     - source checksum
     - completedAt
   - Legacy-Flag in localStorage schreiben:
     - `ruhestandsapp_migrated_to_target = indexeddb|tauri-json-file`
     - `ruhestandsapp_migration_completed_at = <ISO>`
     - `ruhestandsapp_migration_checksum = <checksum>`
   - localStorage noch nicht loeschen.
   - normale App aus Zieladapter starten.
```

Wichtig: Im ersten Release nach Migration sollte `localStorage` nicht automatisch geleert werden. Es dient als Rueckfallkopie. Erst nach mehreren Releases oder nach expliziter Nutzerbestaetigung kann eine Bereinigung angeboten werden.

Der Legacy-Flag verhindert eine stille Rueckmigration auf veraltete `localStorage`-Daten, falls IndexedDB oder die Tauri-Datei spaeter verloren gehen.

## Key-Auswahl fuer Migration

Die Migration darf nicht blind alle `localStorage`-Keys uebernehmen. Sie sollte eine zentrale Allowlist verwenden.

Startpunkt:

- `CONFIG.STORAGE.LS_KEY`
- `CONFIG.STORAGE.MIGRATION_FLAG`
- `CONFIG.STORAGE.SNAPSHOT_PREFIX`
- `PROFILE_STORAGE_KEYS.registry`
- `PROFILE_STORAGE_KEYS.current`
- `PROFILE_STORAGE_KEYS.active`
- `PROFILE_SCOPED_FIXED_KEYS`
- Praefixe `sim_`, `sim.`, `balance_expenses_`, `ruhestandsmodell_snapshot_`
- globale Keys aus `profile-bundle-io.js`: `etfProxyUrl`, `etfProxyUrls`, `enableWorkerTelemetry`
- weitere bekannte UI-Keys: `household_withdrawal_mode`, `featureFlags`

Dafuer sollte `profile-key-policy.js` nicht weiter wachsen, sondern eine neue gemeinsame Policy entstehen, z. B.:

```text
app/shared/persistence-key-policy.js
```

Diese Policy kapselt:

- profilbezogene Keys
- globale App-Keys
- Snapshot-Keys
- Legacy-Keys
- Import-/Restore-Filter

### Allowlist nur fuer Migration und Restore

Die Key-Allowlist ist ein Sicherheitsfilter fuer Daten, die aus Legacy- oder Fremdquellen kommen:

- Erstmigration aus `localStorage`
- Restore alter Snapshots
- Import externer Backup-Dateien
- explizite Legacy-Recovery

Sie darf nicht als dauerhafte Runtime-Schreibblockade fuer die `PersistenceFacade` verstanden werden. Zur Laufzeit speichert die Facade alle Keys, die Feature-Module bewusst ueber `setItemSync()` schreiben. Sonst muesste jede neue UI-Einstellung oder jedes neue Eingabefeld zusaetzlich in der Policy gepflegt werden, was die Entwicklungsarbeit fehleranfaellig macht.

```text
Erstmigration / Restore:
  externe oder alte Quelle -> strenge Allowlist -> PersistenceFacade

Normale Laufzeit:
  Feature-Code -> PersistenceFacade.setItemSync(key, value) -> Backend
```

Neue fachliche Persistenzkeys sollten weiterhin dokumentiert und getestet werden, aber nicht durch eine zentrale Allowlist blockiert sein.

## Kompatibilitaetsphase

Die Migration sollte in Phasen erfolgen.

### Phase 1: Adapter einfuehren, localStorage bleibt Backend

Ziel:

- `PersistenceFacade`, `runtime-env` und In-Memory-Cache einfuehren.
- Facade-API synchron fuer Feature-Code definieren.
- Bestehende Tests mit Legacy-Adapter laufen lassen.
- Keine fachliche Datenmigration.

Nutzen:

- geringe Regressiongefahr
- Feature-Module koennen schrittweise umgestellt werden
- keine Async-Infektion bestehender UI-Callstacks

#### Phase-1-Umsetzungsstand vom 2026-05-25

Status: umgesetzt und getestet. Das Backend bleibt in Phase 1 bewusst `localStorage`; die App greift aber an den umgestellten Stellen bereits ueber die gemeinsame Persistenzschicht zu. Damit ist der naechste Wechsel auf IndexedDB bzw. Tauri-Datei vorbereitet, ohne den synchronen UI-Callstack umzubauen.

Neu eingefuehrte Module:

- `app/shared/runtime-env.js`
  - erkennt `browser`, `tauri` und `unknown`
  - dient nur der Feature-Auswahl, nicht als Sicherheitsgrenze
- `app/shared/persistence-adapter-localstorage.js`
  - Legacy-Adapter fuer Phase 1
  - kapselt `localStorage` als Adapter-Vertrag mit `loadAll()`, `saveBatch()`, `getItemSync()`, `setItemSync()` und `removeItemSync()`
- `app/shared/persistence-facade.js`
  - synchroner In-Memory-Cache mit `getItemSync()`, `setItemSync()`, `removeItemSync()`, `keysSync()`, `clearSync()`, `exportAllSync()`, `importAll()` und `flush()`
  - vor explizitem `init()` delegiert die Facade aus Kompatibilitaetsgruenden direkt an den Legacy-Adapter
  - nach `init()` liest/schreibt Feature-Code synchron gegen den Cache; Backend-Writes laufen debounced
- `app/shared/persistence-key-policy.js`
  - Allowlist nur fuer Erstmigration/Restore aus externen oder alten Quellen
  - keine Runtime-Schreibblockade fuer neue bewusst gesetzte Feature-Keys
- `app/shared/persistence-backup.js`
  - zentraler Komplett-Export und Komplett-Import des aktiven Persistenzbestands
  - erzeugt Backup-Bundles mit `backupType`, `schemaVersion`, `runtime`, `recordCount`, `records` und `localStorage` als Legacy-Alias
  - Import ersetzt nach Bestaetigung den aktuellen Persistenzbestand vollstaendig

Zusaetzliche Haertung der Facade:

- `flush()` wird ueber eine Promise-Kette serialisiert, damit konkurrierende Flush-Aufrufe keine out-of-order Writes erzeugen.
- Fehlgeschlagene Flushes legen Dirty-/Delete-Keys wieder in die Queue, damit der naechste Flush erneut schreiben kann.
- Lifecycle-Flush ist fuer `visibilitychange` und `pagehide` angebunden.
- `unbindLifecycleFlush()` entfernt Listener wieder, damit Tests und wiederholte Initialisierungen keine Handler ansammeln.
- `resetPersistenceForTests()` setzt Adapter, Cache, Queues, Timer, Flush-Kette und Lifecycle-Listener zurueck.

Umgestellte Runtime-Zugriffe:

- Balance-Persistenz und Profilverbund-nahe Balance-Module schreiben/lesen ueber `persistenceStorage` bzw. die Facade.
- Profilmodule (`profile-registry`, `profile-live-storage`, `profile-bundle-io`, `profile-state`, `profile-asset-values`, `profile-storage`) nutzen die neue Storage-Abstraktion.
- Tranchen-Status und Tranchen-State nutzen die neue Storage-Abstraktion.
- Feature-Flags (`app/shared/feature-flags.js`) nutzen `persistenceStorage`.
- Simulator-Persistenzmodule fuer Eingaben, Dynamic-Flex, Akkumulation, Partner, Reset, Ergebnisse, Sweep und Rente nutzen `persistenceStorage`.
- Ein Suchlauf auf direkte `localStorage`-Zugriffe in `app/shared` und `app/simulator` zeigt nur noch bewusst erlaubte Adapter-/Policy-Stellen.

Zentralisierte Backup-/Import-UX:

- Die Startseite bietet unter `Profile > Erweitert` die zentrale Datenverwaltung:
  - `Komplettes Backup exportieren`
  - `Komplettes Backup importieren`
  - Rahmeninformationen zu Runtime/Speicherart und Anzahl gespeicherter Eintraege
- Der Komplettimport prueft `backupType === "ruhestand-suite-full-persistence-backup"` und ersetzt erst nach Bestaetigung den bestehenden Speicherstand.
- Der Import normalisiert Werte auf Strings und filtert Sicherheits-Sonderkeys `__proto__`, `constructor` und `prototype`; das Zielobjekt wird mit `Object.create(null)` aufgebaut.
- Sichtbare Teil-Backup-/Importwege wurden entfernt:
  - Profil-Backup/Profil-Import von der Startseite
  - Balance-JSON-Import/-Export-Buttons
  - Tranchen-JSON-Import/-Export-Buttons
- Fachliche Exporte/Importe bleiben erhalten, wenn sie keine allgemeinen Backups sind, z. B. Simulationsergebnis-/Log-Exports und Ausgaben-CSV-Importe.
- Jahresabschluss-Snapshots bleiben erhalten und enthalten weiterhin den kompletten Speicherstand, sind aber fachlich an den Jahresabschluss gekoppelt.

Dokumentations- und Referenzanpassungen:

- `docs/reference/TECHNICAL.md` beschreibt die Phase-1-Persistenzschicht.
- `docs/reference/BALANCE_MODULES_README.md` verweist auf die neue Storage-Abstraktion.
- `docs/internal/README.md` listet das Persistenz-Migrationsdokument.

Validierung Phase 1:

- `node tests/run-single.mjs tests/persistence.test.mjs`
  - deckt Runtime-Erkennung, Key-Policy, Legacy-Adapter, Cache/Flush, Flush-Serialisierung, Lifecycle-Unbind, Komplettbackup, Komplettimport und Prototype-Pollution-Haertung ab
- fokussierte Zusatztests:
  - `tests/feature-flags.test.mjs`
  - `tests/simulator-dynamic-flex-persistence.test.mjs`
  - `tests/simulator-input-readers.test.mjs`
  - `tests/simulator-sweep.test.mjs`
  - `tests/profile-storage.test.mjs`
  - `tests/balance-smoke.test.mjs`
  - `tests/tranchen-manager-state.test.mjs`
- Gesamtsuite nach Umsetzung und nach EXE-Build:
  - `npm test`
  - 77 Testdateien
  - 1800 Assertions
  - 0 Fehler
- Tauri-Release-Build zur manuellen Pruefung:
  - `npm run build-tauri-exe`
  - Root-EXE `RuhestandSuite.exe`
  - Tauri-Release-EXE `src-tauri/target/release/ruhestand_suite.exe`
  - beide EXE-Dateien: 12.577.280 Bytes, gleicher SHA-256-Hash
  - MSI- und NSIS-Installer wurden erzeugt

Phase-2-Stand:

- IndexedDB-Adapter ist implementiert.
- Automatische Migration aus Legacy-`localStorage` in IndexedDB ist implementiert.
- Legacy-Migrationsmarker verhindern stille Rueckmigration aus veraltetem `localStorage`.
- Leerstandserkennung fuer geloeschte IndexedDB bei vorhandenem Migrationsmarker ist implementiert.
- Startseiten-Rahmeninfo zeigt den konkreten Backend-Namen.
- Komplettbackup und Komplettimport laufen gegen den aktiven Adapter und sind gegen IndexedDB getestet.
- Vor Komplettimport wird automatisch ein Recovery-Bundle des aktuellen Zustands erstellt; schlaegt diese Sicherung fehl, wird der Import abgebrochen.

### Phase 2: Browser IndexedDB als Backend

Ziel:

- IndexedDB-Adapter implementieren.
- Automatische Migration aus `localStorage` beim ersten Start.
- `localStorage` bleibt Legacy-Recovery-Quelle, aber keine stille Rueckmigration nach erfolgreicher Migration.
- Neue Writes gehen in den Memory-Cache und per Flush nach IndexedDB.

Schreibregel:

```text
Nach erfolgreicher Migration:
  init: IndexedDB -> Memory
  reads: Memory
  writes: Memory -> debounced IndexedDB flush
  deletes: Memory -> debounced IndexedDB flush
  localStorage: nur noch Legacy-Recovery, keine automatische Rueckmigration bei gesetztem Migrationsflag
```

Warum kein Dual-Write als Dauerzustand:

- Dual-Write kaschiert Fehler und macht Source of Truth unklar.
- Besser: Migrationsbackup behalten, aber Zielsystem eindeutig machen.

#### Step 2.1: IndexedDB-Adapter ohne automatische Migration

Ziel: Den Browser-Backend-Adapter isoliert implementieren und testen, ohne den produktiven Datenfluss bereits auf IndexedDB umzuschalten.

Umfang:

- `app/shared/persistence-adapter-indexeddb.js` erstellen.
- Adapter-Vertrag analog zum LocalStorage-Adapter bereitstellen:
  - `open()`
  - `loadAll()`
  - `saveBatch({ upserts, deletes })`
  - `readMetadata(key)`
  - `writeMetadata(key, value)`
  - optionale Sync-Methoden nur dort, wo sie ohne geoeffnete DB sinnvoll sind; IndexedDB selbst bleibt async.
- Object Stores:
  - `kv` fuer `{ key, value, updatedAt }`
  - `metadata` fuer `{ key, value, updatedAt }`
- Batch-Writes in einer Readwrite-Transaktion ausfuehren.
- Deletes und Upserts in derselben Transaktion behandeln.
- Werte bleiben Strings; fachliche JSON-Strukturen werden nicht umgebaut.
- Noch keine Runtime-Umschaltung in `PersistenceFacade.init()`.
- Noch keine automatische Migration aus `localStorage`.

Erfolgskriterien:

- Adapter kann eine leere Datenbank oeffnen.
- `loadAll()` liefert alle KV-Eintraege als `{ [key]: value }`.
- `saveBatch()` schreibt Upserts und Deletes atomar in `kv`.
- Metadata Read/Write funktioniert getrennt vom KV-Store.
- Tests laufen ohne echten Browser, ueber eine kleine IndexedDB-Testimplementierung oder geeignete Mocks.
- Bestehende Phase-1-Tests bleiben unveraendert gruen.

##### Step-2.1-Umsetzungsstand vom 2026-05-25

Status: **Umgesetzt und getestet**. Der IndexedDB-Adapter wurde isoliert implementiert und vollständig in die Test-Suite integriert, ohne die aktive Laufzeit der App zu verändern.

Neu eingeführte Module & Änderungen:
- `app/shared/persistence-adapter-indexeddb.js` [NEW]
  - Kapselt die asynchronen IndexedDB-Datenbankzugriffe über native Promises.
  - Initialisiert bei Bedarf die Datenbank `ruhestand-suite` (Version 1) und erstellt die Object Stores `kv` und `metadata`.
  - Bietet atomare Batch-Schreibvorgänge (`saveBatch` mit Deletes und Upserts in einer einzigen `readwrite`-Transaktion).
  - Normalisiert alle KV-Schlüssel und Werte als Strings.
  - Verwaltet isolierte Metadaten im getrennten Store `metadata`.
- `tests/persistence.test.mjs`
  - Integration von `createFakeIndexedDB()` zum Mocking der asynchronen Datenbank-Schnittstelle in Node.js (inklusive Transaktions-Lifecycle, Cursorn und Fehlerzuständen).
  - Neuer `Test 12: IndexedDB adapter stores kv records and metadata` zur funktionalen Abdeckung aller Adapter-Vertragsfunktionen (Open, LoadAll, SaveBatch, Deletes, Metadata).
- `docs/reference/TECHNICAL.md`
  - Der neue `IndexedDB`-Adapter wurde in der Modulbeschreibung ergänzt.

Validierung SubStep 2.1:
- `node tests/run-single.mjs tests/persistence.test.mjs` läuft vollständig grün durch (9 neue Assertions für den Adapter).
- Die gesamte Testsuite (`npm test`) besteht nun erfolgreich **1809 von 1809 Assertions** (0 Fehler, 0 Regressionen).

#### Step 2.2: Browser-Umschaltung und automatische Migration

Ziel: IndexedDB wird im Browser zur Source of Truth; `localStorage` dient nur noch als Legacy-Quelle und Recovery-Pfad.

Umfang:

- Runtime-Resolver einfuehren:
  - Browser: IndexedDB-Adapter
  - Tauri: in dieser Phase weiterhin LocalStorage-Adapter bzw. spaeter Tauri-Dateiadapter
- Beim ersten Browser-Start erlaubte Legacy-Keys aus `localStorage` lesen.
- Legacy-Records in IndexedDB schreiben.
- Migrationsmarker in `localStorage` setzen.
- Keine stille Rueckmigration, wenn Marker vorhanden und IndexedDB leer ist.
- Recovery-/Warnzustand fuer moeglichen IndexedDB-Datenverlust implementieren.
- Startseiten-Rahmeninfo um konkreten Backend-Namen `IndexedDB` erweitern.
- Komplettbackup und Komplettimport gegen IndexedDB testen.

Erfolgskriterien:

- Nutzer muessen fuer die Migration keinen Export/Import ausfuehren.
- Nach erfolgreicher Migration liest die App aus IndexedDB.
- Ein veralteter `localStorage`-Stand wird nicht unbemerkt wieder eingespielt.
- Der zentrale Komplettbackup/-import funktioniert in Browser und Tauri weiterhin ueber dieselbe UI.

Umsetzungsstand:

- `PersistenceFacade.init()` loest im Browser automatisch den `IndexedDB`-Adapter auf, sofern `indexedDB` verfuegbar ist.
- Tauri bleibt in diesem Schritt bewusst auf dem bisherigen LocalStorage-Adapter; die Tauri-Datei folgt in Phase 3.
- Die Einstiegspunkte initialisieren die Facade vor ihren Storage-Reads:
  - `index.html`
  - `app/profile/profile-manager.js`
  - `app/profile/profile-bridge.js`
  - `app/balance/balance-main.js`
  - `app/simulator/simulator-main.js`
  - `depot-tranchen-manager.html`
- Beim ersten Browser-Start werden erlaubte Legacy-Keys aus `localStorage` nach IndexedDB migriert.
- Nach erfolgreicher Migration werden in `localStorage` Marker geschrieben:
  - `ruhestandsapp_migrated_to_target = indexeddb`
  - `ruhestandsapp_migration_completed_at`
  - `ruhestandsapp_migration_checksum`
- Ist dieser Marker vorhanden, IndexedDB aber leer, werden Legacy-Daten nicht still erneut eingespielt. Stattdessen setzt die Facade eine Migration-Warnung (`indexeddb-empty-after-migration`), die die Startseiten-Speicherinfo anzeigen kann.
- Die Startseiten-Speicherinfo nutzt `PersistenceFacade.getPersistenceStatus()` und zeigt nun den konkreten Backend-Namen, z. B. `IndexedDB` oder `localStorage`.
- Nach erfolgreichem `init()` sendet die Facade ein globales Event `persistence:initialized`. Modulweit frueh erzeugte Verbraucher wie `featureFlags` laden dadurch nach der Umschaltung erneut aus dem aktiven Backend.
- Interne Record-Maps und exportierte Persistenz-Bundles werden mit `Object.create(null)` aufgebaut bzw. defensiv darauf normalisiert. Dadurch bleiben auch Runtime-Keys wie `__proto__`, `constructor` oder `prototype` normale Daten-Keys und koennen den Objekt-Prototyp nicht veraendern.
- `tests/persistence.test.mjs` deckt automatische Migration, Marker-Schreiben, Fremdkey-Filterung, Silent-Reversion-Schutz und Prototype-Pollution-Haertung ab.
- `tests/feature-flags.test.mjs` deckt den Reload der Feature-Flags nach `persistence:initialized` ab.

### Phase 3: Tauri JSON-Datei als Backend

Ziel:

- Tauri-Dateiadapter implementieren.
- JSON-Datei im App-Datenverzeichnis nutzen.
- Automatische Migration aus Tauri-WebView-`localStorage`, sofern vorhanden.
- IndexedDB optional als Fallback, falls der Tauri-Dateizugriff nicht verfuegbar ist.

Wichtig:

- Tauri darf nicht voraussetzen, dass Browser-IndexedDB-Daten vorhanden sind.
- Tauri und Browser haben unterschiedliche Speicherorte.
- Nutzer, die parallel Browser und EXE nutzen, brauchen spaeter einen expliziten Sync-/Backup-Weg. Automatische Cross-Runtime-Synchronisation ist nicht Teil dieses Plans.
- SQLite ist fuer diese Phase bewusst nicht erforderlich.

Verbindliche Ergaenzungen vor Aktivierung:

- Rust-Commands in `src-tauri/src/lib.rs` bereitstellen: **umgesetzt**
  - `load_app_state`
  - `save_app_state`
  - `quarantine_app_state`
- Schreiben muss ueber temporaere Datei erfolgen: **umgesetzt**. Auf Windows wird vor dem Rename zusaetzlich eine `.bak`-Datei angelegt, weil `std::fs::rename` vorhandene Ziele nicht portabel ersetzt.
- Der Tauri-Dateiadapter darf nur ueber diese Commands lesen/schreiben. Es wird kein allgemeiner Dateisystemzugriff im Frontend benoetigt: **umgesetzt** in `app/shared/persistence-adapter-tauri.js`.
- Der Window-Close-Pfad muss Datenverlust verhindern: Rust faengt `CloseRequested` ab, sendet `ruhestand://close-requested`, die Facade flusht und bestaetigt danach per `confirm_app_close`: **umgesetzt und getestet**.
- Korrupt geladene JSON-Dateien werden nicht still ignoriert und nicht ueberschrieben. Sie werden quarantiniert und die App startet in einen Recovery-Zustand: **umgesetzt**. Der Zustand wird als `migrationWarning` gemeldet; automatische Legacy-Rueckmigration ist in diesem Fehlerpfad gesperrt.
- Ein globaler Recovery-Screen muss mindestens Backup-Import und Start mit leerem Zustand anbieten. Ohne diese UI darf der Tauri-Dateiadapter nicht produktiv aktiviert werden: **teilweise umgesetzt** ueber Startseiten-Backup-Import und Recovery-Warnung; ein eigener Vollbild-Recovery-Screen bleibt optionaler UI-Ausbau.
- Die zentrale Backup-/Import-UI auf der Startseite bleibt der manuelle Wechselweg zwischen Browser und Tauri.

Abgrenzung Allowlist:

- Die Key-Allowlist gilt fuer Legacy-Migration, alte Snapshots und explizite Recovery aus Fremd-/Altquellen.
- Komplettbackups der neuen Persistenzschicht werden dagegen vollstaendig wiederhergestellt; dort werden nur Sicherheits-Sonderkeys wie `__proto__`, `constructor` und `prototype` herausgefiltert.
- Neue Persistenzkeys muessen trotzdem dokumentiert oder ueber einen bekannten Praefix gefuehrt werden, damit sie bei Legacy-Migrationen und alten Restore-Pfaden nicht unbemerkt fehlen.

### Lifecycle-Flush

Der In-Memory-Cache macht Feature-Zugriffe synchron und konsistent. Damit keine debounced Writes verloren gehen, muss die Facade definierte Flush-Punkte haben.

Pflicht-Flushes:

- vor Jahresabschluss
- vor Export und Cloud-Backup
- vor Restore und Import
- vor Profilwechsel und Profil-Bridge-Seitenwechsel
- nach kritischen Migrationsschritten
- bei Browser-Lifecycle-Events
- beim Tauri-Fensterschluss

Browser-Lifecycle:

```js
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
        PersistenceFacade.flush().catch(console.error);
    }
});

window.addEventListener('pagehide', () => {
    PersistenceFacade.flush().catch(console.error);
});
```

`beforeunload` sollte nicht als primaerer Mechanismus geplant werden, weil Browser async Arbeit dort stark einschraenken. `visibilitychange` und `pagehide` sind die robusteren Signale.

Tauri-Lifecycle:

- JS-seitig sollte beim Window-Close ein `flush()` ausgeloest werden, wenn das Tauri-Fenster-Event verfuegbar ist.
- Rust-seitig muss das Schliessen ueber `CloseRequested` abgefangen werden. Das Fenster wird erst geschlossen, wenn der JS-Flush bzw. der Tauri-Dateiadapter-Flush abgeschlossen ist. Um Hänger auf Seiten ohne Persistenz-Facade (z. B. Handbuch) oder bei WebView-Fehlern zu vermeiden, existiert ein 3-Sekunden-Sicherheits-Fallback in Rust, der das Schließen erzwungen durchführt.
- Ein reines `pagehide`-/`visibilitychange`-Verhalten ist fuer Tauri nicht ausreichend, weil die WebView beim nativen Fensterschluss abrupt beendet werden kann.
- Der erste Implementierungsschritt darf mit expliziten Flushes in kritischen Workflows starten; produktiv aktiviert wird der Tauri-Dateiadapter aber erst mit Window-Close-Hardening.

Flush-Fehler:

- Dirty Keys bleiben in der Queue.
- UI zeigt eine dezente, aber sichtbare Speicherwarnung.
- Weitere Writes bleiben im Memory-Cache konsistent.
- Der naechste Flush versucht erneut zu schreiben.

### Phase 4: Fachliche Stores normalisieren

Ziel:

- Profile, Ausgaben, Snapshots und Settings in eigene Stores/Tabellen ueberfuehren.
- Alte `kv`-Records bleiben migrierbar.
- Export-Bundle bleibt kompatibel.

Diese Phase ist optional und sollte erst nach stabiler Adapter-Umstellung erfolgen.

Vormerkung Snapshot-Wachstum:

- Der synchrone Memory-Cache laedt aktuell alle KV-Records beim Start, einschliesslich Jahresabschluss- und sonstiger Snapshots.
- Das ist fuer die aktuelle Datenmenge bewusst akzeptiert, kann bei jahrelanger exzessiver Snapshot-Nutzung aber Bootzeit und RAM-Bedarf erhoehen.
- Falls das messbar wird, sollten Snapshots in einen separaten IndexedDB Object Store bzw. in eigene Tauri-Dateien ausgelagert und nur bei Bedarf geladen werden.

## Umgang mit bestehenden Exporten und Snapshots

Export/Import bleibt wichtig, aber nicht als Pflichtmigration.

Beizubehalten:

- Balance-JSON-Export
- Profile-Bundle-Export
- Full-Snapshot via File System Access API
- Snapshot-Restore mit Key-Allowlist

Zu verbessern:

- Ein gemeinsamer App-Bundle-Export sollte alle relevanten Daten aus dem aktiven Adapter lesen, nicht aus `localStorage`.
- Import sollte in den aktiven Adapter schreiben.
- Legacy-Importe aus alten JSON-Dateien muessen weiterhin akzeptiert werden.

Kompatibilitaetsregel:

```text
Neue App kann alte Exporte importieren.
Alte App muss neue Exporte nicht zwingend importieren koennen.
```

## Optionale Cloud-Backup-Funktion

Eine kostenlose Cloud-Backup-Funktion ist grundsaetzlich moeglich, sollte aber nicht mit der lokalen Source of Truth vermischt werden. Der robuste Zielzustand ist:

```text
Lokale Source of Truth
  Browser: IndexedDB
  Tauri: JSON-Datei im App-Datenverzeichnis
      -> App-Bundle-Export
      -> optionale Verschluesselung
      -> CloudBackupAdapter
```

Cloud-Backup ist damit ein optionaler Transport- und Sicherungsweg, kein Ersatz fuer lokale Persistenz.

### Gepruefte kostenlose Cloud-Kategorien

Kostenlose Cloud-Angebote sind Free Tiers mit Limits und koennen sich aendern. Daher duerfen sie nicht als harte Verfuegbarkeitsgarantie in die App-Architektur eingehen.

| Kategorie | Beispiele | Eignung | Einschraenkung |
| --- | --- | --- | --- |
| Nutzer-eigener Cloudspeicher | Google Drive, OneDrive, Dropbox | Gut fuer verschluesselte Backup-Dateien | OAuth, Provider-API, Nutzerkonto, Quoten |
| Backend-as-a-Service | Supabase, Firebase/Firestore | Gut fuer Sync und Geraetewechsel | Free-Tier-Limits, Auth, Datenschutz, Konfliktloesung |
| Serverless SQL/SQLite | Turso, Cloudflare D1, Neon/Postgres | Technisch passend fuer strukturierte Daten | meist eigene API-Schicht noetig, Limits, Providerbindung |
| Manuelle Cloud-Ablage | Download in OneDrive-/Dropbox-Ordner | Sofort moeglich ohne API | nicht automatisch im Browser, haengt vom Download-Ort ab |

Aktuelle offizielle Free-Tier-Anhaltspunkte beim Stand dieses Dokuments:

- Supabase Free: 500 MB Datenbank, 1 GB Storage, 50.000 Monthly Active Users, Free-Projekte koennen bei Inaktivitaet pausieren. Quelle: `https://supabase.com/pricing`
- Firebase/Firestore Free Quota: 1 GiB Daten, 50.000 Reads/Tag, 20.000 Writes/Tag, 20.000 Deletes/Tag, 10 GiB Transfer/Monat. Quelle: `https://firebase.google.com/docs/firestore/pricing`
- Neon Free: Postgres-Free-Tier mit 0,5 GB Storage pro Projekt. Quelle: `https://neon.com/pricing`
- Turso Free: SQLite-orientierter Free-Tier mit 5 GB Total Storage laut aktueller Preisseite. Quelle: `https://turso.tech/pricing`
- Cloudflare D1: Free-Tier fuer serverless SQLite vorhanden, konkrete Limits ueber offizielle D1-Pricing-Seite pruefen. Quelle: `https://developers.cloudflare.com/d1/platform/pricing/`

Diese Werte muessen vor Umsetzung erneut auf den offiziellen Preis-/Limitseiten geprueft werden.

### Datenschutzentscheidung

Fuer diese App enthalten Backups potenziell sensible Finanz-, Depot-, Renten-, Steuer- und Ausgabendaten. Cloud-Backups sollten deshalb standardmaessig nicht im Klartext geschrieben werden.

Empfehlung:

```text
Cloud-Backup nur verschluesselt aktivieren.
Klartext-Cloud-Backup nur als explizite Entwickler-/Notfalloption, nicht als Standard-UX.
```

Browser- und Tauri-kompatibler Verschluesselungsansatz:

- App-Bundle als JSON serialisieren.
- Zufallssalt und IV erzeugen.
- Schluessel aus Nutzerpassphrase per PBKDF2-SHA-256 oder Argon2id ableiten.
- Payload per AES-GCM verschluesseln.
- Backup-Datei als JSON-Container speichern.

Beispiel-Container:

```js
{
    backupFormat: "ruhestand-suite-cloud-backup",
    backupVersion: 1,
    createdAt: "2026-05-24T00:00:00.000Z",
    appSchemaVersion: 1,
    encryption: {
        algorithm: "AES-GCM",
        kdf: "PBKDF2",
        iterations: 100000,
        salt: "...base64...",
        iv: "...base64..."
    },
    payload: "...base64 ciphertext...",
    checksum: "...optional..."
}
```

Salt und IV muessen bei jedem Backup mit `crypto.getRandomValues()` neu erzeugt werden und duerfen nicht wiederverwendet oder hardcodiert sein. Die Iterationszahl sollte vor Umsetzung auf typischer Zielhardware gemessen werden; 100.000 PBKDF2-SHA-256-Iterationen sind ein pragmatischer Startwert, hoehere Stufen koennen optional angeboten werden.

Fuer Browser ist WebCrypto verfuegbar. Fuer Tauri kann ebenfalls WebCrypto im WebView genutzt werden; alternativ kann spaeter Rust-seitig verschluesselt werden. Wichtig ist, dass ohne Passphrase keine Wiederherstellung moeglich ist. Das muss im UI klar kommuniziert werden.

### CloudBackupAdapter

Die Cloud-Funktion sollte eine eigene Adapter-Schicht bekommen und nicht in die lokale Persistenz gemischt werden.

```js
export async function isConfigured() {}
export async function configure() {}
export async function uploadBackup(encryptedBackup, metadata) {}
export async function listBackups() {}
export async function downloadBackup(backupId) {}
export async function deleteBackup(backupId) {}
export async function getStatus() {}
```

Der lokale Persistenzadapter liefert nur das App-Bundle:

```text
PersistenceFacade.exportAllSync()
  -> optional encryptBackup(bundle, passphrase)
  -> CloudBackupAdapter.uploadBackup()
```

Restore:

```text
CloudBackupAdapter.downloadBackup()
  -> decryptBackup(passphrase)
  -> validate bundle
  -> PersistenceFacade.importAll(bundle)
  -> App reload / feature rebootstrap
```

### Provider-Strategie

#### Variante A: Dateibasierter Cloudspeicher

Favorisiert fuer erste Cloud-Backup-Funktion.

Prinzip:

- Die App erzeugt ein verschluesseltes Backup-Bundle.
- Upload erfolgt zu einem Nutzer-Cloudspeicher.
- Restore listet vorhandene Backup-Dateien und importiert nach Entschluesselung.

Vorteile:

- kein eigenes Backend
- Daten liegen im Konto des Nutzers
- gut passend zum bestehenden Snapshot-/Exportmodell
- Providerwechsel bleibt moeglich

Nachteile:

- OAuth-Integration pro Provider
- Token-/Session-Handling
- Browser-Redirect-URIs und Tauri-OAuth-Flows unterscheiden sich
- automatischer Hintergrund-Upload im reinen Browser ist begrenzt durch Browser- und Token-Lebensdauer

Provider-Priorisierung:

1. Google Drive oder OneDrive, wenn Nutzerkomfort und breite Verfuegbarkeit wichtig sind.
2. Dropbox, wenn einfache Datei-API wichtiger ist.
3. Generischer WebDAV-Adapter nur pruefen, wenn ein konkreter Zielanbieter vorhanden ist.

#### Variante B: Supabase/Firebase/Turso als Backup-Backend

Prinzip:

- Nutzer meldet sich bei einem App-Backend an.
- App schreibt verschluesselte Backup-Bundles in Datenbank oder Storage-Bucket.

Vorteile:

- einheitliches API-Modell fuer Browser und Tauri
- einfachere Backup-Liste, Metadaten, Versionierung
- spaeterer Sync technisch leichter

Nachteile:

- es entsteht ein betreiberseitiges Backend
- Free-Tier- und Datenschutzfragen werden Teil des Produkts
- Auth, Abuse-Schutz, Loeschung, Account-Recovery und Verfuegbarkeit muessen geloest werden
- selbst verschluesselte Finanzdaten koennen Metadaten offenlegen

Empfehlung:

```text
Nicht als erste Cloud-Backup-Stufe.
Erst sinnvoll, wenn echte Mehrgeraete-Synchronisation geplant ist.
```

#### Variante C: Manuelle Cloud-Dateiablage

Prinzip:

- Die App erstellt verschluesselte Backup-Dateien per Download.
- Nutzer speichert sie in einem lokal synchronisierten OneDrive-/Dropbox-/Google-Drive-Ordner.

Vorteile:

- sofort kompatibel mit Browser und Tauri
- kein OAuth
- kein neues Backend
- geringstes Implementierungsrisiko

Nachteile:

- nicht vollautomatisch im Browser
- Nutzer muss Download-Ziel oder Dateiablage kontrollieren

Diese Variante ist eine gute Zwischenstufe, erfuellt aber nicht den Wunsch nach automatischem Cloud-Backup.

### Automatikgrenzen im Browser

Im normalen Browser kann die App nicht beliebig im Hintergrund Dateien in einen Cloud-Ordner schreiben. Automatisches Cloud-Backup braucht entweder:

- eine Provider-API mit OAuth und Upload-Endpoint,
- oder eine vom Nutzer freigegebene Datei/Ordner-Struktur via File System Access API, falls der Cloud-Ordner lokal synchronisiert wird,
- oder einen manuellen Download.

Damit gilt:

```text
Browser:
  Automatisch browserintern: ja
  Automatisch zu Cloud per Provider-API: ja, nach OAuth/Token-Freigabe
  Automatisch in beliebigen lokalen Cloud-Ordner: nein, nur nach File-System-Freigabe und Browser-Unterstuetzung

Tauri:
  Automatisch lokale Datei, optional spaeter SQLite: ja
  Automatisch in lokal synchronisierten Cloud-Ordner: ja, wenn Nutzer Pfad konfiguriert und Berechtigung erteilt
  Automatisch per Provider-API: ja, mit OAuth/Token-Handling
```

### Backup-Trigger

Cloud-Backup sollte nicht bei jedem kleinen UI-Input ausgeloest werden. Besser:

- manuell: Button "Cloud-Backup jetzt erstellen"
- automatisch nach Jahresabschluss
- automatisch beim Schliessen oder Seitenwechsel nur, wenn sicher und debounced
- optional taeglich/woechentlich, wenn die App geoeffnet ist
- optional nach relevanten Datenwechseln mit Mindestabstand, z. B. 15 Minuten

Metadata pro Backup:

```js
{
    backupId: "2026-05-24T18-30-00Z",
    createdAt: "...",
    appVersion: "...",
    schemaVersion: 1,
    runtime: "browser|tauri",
    encrypted: true,
    recordCount: 42,
    approximateSizeBytes: 123456
}
```

### Konflikte und Restore

Cloud-Backup ist zunaechst kein bidirektionaler Live-Sync. Daher ist die Konfliktlogik einfach:

- Backup erstellen: immer neue Version schreiben, keine bestehende Version ueberschreiben.
- Restore: aktuelles lokales Bundle vorher als Recovery-Snapshot sichern.
- Danach importieren und App neu laden.
- Falls lokaler Stand neuer als Cloud-Backup ist, Nutzer warnen.

Kein automatischer Merge im ersten Schritt.

### Empfohlene Cloud-Slice

Die Cloud-Funktion sollte erst nach der lokalen Adapter-Schicht umgesetzt werden.

Reihenfolge:

1. App-Bundle-Export aus `PersistenceFacade.exportAllSync()` stabilisieren.
2. Verschluesselten Backup-Container implementieren und lokal testen.
3. Manuellen verschluesselten Download/Restore als Grundlage bauen.
4. CloudBackupAdapter-Schnittstelle einfuehren.
5. Einen konkreten Provider anbinden, bevorzugt dateibasiert.
6. Automatische Trigger erst nach erfolgreichem manuellem Cloud-Backup aktivieren.

Minimaler erster Cloud-Backup-Release:

- Nutzer aktiviert Cloud-Backup explizit.
- Nutzer setzt oder bestaetigt Backup-Passphrase.
- App erstellt verschluesseltes Bundle.
- Upload zu genau einem Provider.
- Backup-Liste und Restore funktionieren.
- Vor Restore wird lokaler Recovery-Snapshot erstellt.
- Bei Cloud-Fehlern bleibt lokale Persistenz unberuehrt.

## Fehler- und Recovery-Strategie

Migration darf Daten nicht verlieren. Daher:

- `localStorage` nach automatischer Migration nicht sofort loeschen.
- Vor der Migration Checksumme ueber erlaubte Keys bilden.
- Nach dem Schreiben in Zieladapter Anzahl Keys und Checksumme pruefen.
- Bei Fehler:
  - Fehler protokollieren
  - Nutzerhinweis anzeigen
  - App mit Legacy-`localStorage`-Adapter weiter starten
- Bei Teilerfolg:
  - Migration nicht als abgeschlossen markieren
  - naechster Start versucht erneut

Minimaler Metadata-Satz:

```js
{
    id: "localStorage-to-indexeddb-v1",
    source: "localStorage",
    target: "indexedDB",
    sourceKeyCount: 42,
    sourceChecksum: "...",
    completedAt: "2026-05-24T00:00:00.000Z"
}
```

Legacy-Marker im `localStorage`:

```js
{
    "ruhestandsapp_migrated_to_target": "indexeddb",
    "ruhestandsapp_migration_completed_at": "2026-05-24T00:00:00.000Z",
    "ruhestandsapp_migration_checksum": "..."
}
```

Startentscheidung bei leerem Zielbackend:

```text
Ziel leer, Legacy-Marker fehlt:
  -> Erstmigration aus localStorage erlaubt

Ziel leer, Legacy-Marker vorhanden:
  -> keine automatische Migration
  -> Warnung: Ziel-Speicher scheint verloren oder geloescht
  -> Optionen: Backup wiederherstellen, Legacy-Stand explizit verwenden, abbrechen
```

## Korruptions- und Recovery-Strategie

Die App darf beim Start nicht hart abbrechen, wenn das Zielbackend beschaedigt ist. Das gilt fuer IndexedDB und die Tauri-JSON-Datei.

### Tauri-Datei korrupt

Typische Fehler:

- Datei ist kein gueltiges JSON.
- Datei hat kein erwartetes `schemaVersion`-/`records`-Format.
- Datei wurde beim Schreiben abgeschnitten.

Verhalten:

```text
1. `load_app_state` liest Datei.
2. JS-Adapter versucht JSON.parse und Schema-Minimalvalidierung.
3. Bei Fehler:
   - Datei per `quarantine_app_state` umbenennen.
   - Fehlerstatus in PersistenceFacade setzen.
   - App im Recovery-Modus starten.
   - Nicht still aus altem localStorage remigrieren, wenn Legacy-Marker gesetzt ist.
   - Nutzeroptionen anzeigen:
     - Backup/Snapshot wiederherstellen
     - explizit Legacy-localStorage-Stand verwenden
     - mit leerem Profil starten
```

UI-Meldung, sinngemaess:

```text
Die lokale Datenablage konnte nicht gelesen werden. Die beschaedigte Datei wurde gesichert.
Bitte stellen Sie ein Backup wieder her oder waehlen Sie bewusst den alten Browser-Speicherstand.
```

### IndexedDB korrupt oder geloescht

IndexedDB kann durch Browserdatenbereinigung, Quota-/Storage-Recovery oder seltene interne Fehler leer oder unlesbar werden.

Verhalten:

- Wenn Ziel-Metadata vorhanden und Daten lesbar sind: normal starten.
- Wenn IndexedDB leer ist und kein Legacy-Marker existiert: Erstmigration aus `localStorage` ist erlaubt.
- Wenn IndexedDB leer/unlesbar ist und Legacy-Marker existiert: keine stille Rueckmigration.
- Wenn einzelne Records fehlen, aber Metadata vorhanden ist: Recovery-Warnung, kein automatischer Mischzustand.

Bei IndexedDB-Open-/Transaction-Fehlern:

- Fehler protokollieren.
- Legacy-localStorage-Adapter nur als expliziten Recovery-Pfad anbieten.
- Migration nicht als abgeschlossen markieren, falls sie gerade lief.

### Recovery-Snapshot vor Restore

Vor jedem Restore oder Import sollte der aktuelle Memory-Cache als Recovery-Bundle exportiert werden. Fuer den zentralen Komplettimport auf der Startseite ist das umgesetzt: vor dem Ersetzen der aktuellen Daten wird automatisch ein Recovery-Backup erzeugt; wenn diese Sicherung fehlschlaegt, wird der Import abgebrochen. In Tauri kann derselbe Ablauf spaeter statt Download eine separate Datei im App-Datenverzeichnis erzeugen.

## Security- und Datenschutzgrenzen

IndexedDB und die Tauri-App-Datei sind lokale Persistenz, aber nicht automatisch verschluesselt.

Klarstellung fuer Doku und UI:

- Daten bleiben lokal.
- Browserdaten koennen durch Browser-Bereinigung geloescht werden.
- Tauri-Daten liegen im lokalen App-Datenverzeichnis.
- Exportdateien und Snapshots sind unverschluesselte JSON-Dateien, solange keine Verschluesselung eingefuehrt wird.

Spaeter moegliche Erweiterungen:

- optional verschluesselter Export
- optional verschluesselte SQLite-Datenbank
- OS-Keychain/DPAPI fuer Tauri
- Passwortbasierte Verschluesselung fuer Browser-Backups

## Teststrategie

Neue Tests sollten zuerst die Adapter-Vertraege pruefen, nicht einzelne Browser-APIs.

Pflichttests:

- Runtime-Erkennung faellt im Node-Test sauber auf `unknown` oder Mock-Runtime zurueck.
- Legacy-Adapter bildet `localStorage`-Verhalten ab.
- PersistenceFacade liest und schreibt synchron aus dem Memory-Cache.
- Debounced Flush schreibt Upserts und Deletes in den Backend-Adapter.
- Flush-Fehler belassen Dirty Keys in der Queue.
- IndexedDB-Adapter erfuellt `open`, `loadAll`, `saveBatch`, `readMetadata`, `writeMetadata`.
- Migration uebernimmt alle erlaubten Legacy-Keys.
- Migration ignoriert nicht erlaubte Keys.
- Migration ist idempotent.
- Schreibfehler markieren Migration nicht als abgeschlossen.
- Wenn Legacy-Marker gesetzt ist, Zielbackend aber leer ist, findet keine automatische Rueckmigration statt.
- Nach Migration lesen Feature-Module aus dem Memory-Cache.
- Alte Balance- und Profil-Exporte bleiben importierbar.
- Lifecycle-Flush wird bei `visibilitychange` und `pagehide` ausgeloest.
- Runtime-Allowlist wird nur fuer Migration/Restore erzwungen, nicht fuer normale `setItemSync()`-Writes.

Fokustests nach Modulumstellung:

- `profile-storage.test.mjs`
- `balance-storage.test.mjs`
- `balance-storage-contract.test.mjs`
- `balance-expenses.test.mjs`
- `tranchen-manager-state.test.mjs`
- Simulator-Persistenztests wie `simulator-dynamic-flex-persistence.test.mjs`

Fuer Tauri-Dateiadapter:

- atomisches Schreiben ueber temporaere Datei testen.
- Custom Rust Commands `load_app_state`, `save_app_state` und Quarantaene-Pfad testen oder per Desktop-Smoke validieren.
- korrupte JSON-Datei wird nicht geparst, sondern gesichert und als Recovery-Fehler gemeldet.
- Window-Close-Handshake testen oder per Desktop-Smoke validieren: ungeschriebene Cache-Daten werden vor dem nativen Fensterschluss geflusht.
- Recovery-Screen testen: Backup-Import und Start mit leerem Zustand funktionieren nach korruptem Datei-Load.
- Datei-/Datenpfad nicht ins Repo schreiben.
- Tauri-spezifische Tests optional hinter Runtime-Faehigkeit oder Mock halten.

Fuer optionale spaetere SQLite-Ausbaustufe:

- SQL-Schema-Migrationen getrennt testen.
- SQLite-Treiber nicht in Browser-/Node-Basistests voraussetzen.

## Doku-Sync

Bei Umsetzung muessen mindestens aktualisiert werden:

- `README.md`: Persistenzbeschreibung, Browser/Tauri-Unterschiede, Backup-Hinweise
- `docs/reference/TECHNICAL.md`: Persistenzarchitektur und Datenfluss
- `docs/reference/BALANCE_MODULES_README.md`: Storage-Module und Migration
- `docs/reference/SIMULATOR_MODULES_README.md`: Simulator-Persistenz und Adapter
- `docs/reference/PROFILVERBUND_FEATURES.md`: Profil-Registry und Bundle-IO
- `tests/README.md`: neue Adapter-/Migrationstests

Projektregeldateien nur dann anpassen, wenn Arbeitsregeln fuer Persistenz oder Validierung geaendert werden.

## Offene Entscheidungen

1. Soll Browser-IndexedDB direkt nach Migration alleinige Source of Truth sein, oder soll eine kurze Dual-Write-Phase laufen?
   - Empfehlung: kein dauerhafter Dual-Write; localStorage nur als explizite Legacy-Recovery-Quelle, nicht als stiller Read-Fallback.
2. Soll Tauri sofort SQLite nutzen oder zuerst dieselbe IndexedDB-Schicht wie Browser?
   - Empfehlung: Browser zuerst mit IndexedDB stabilisieren, danach Tauri-JSON-Dateiadapter; SQLite nur optional spaeter.
3. Soll die erste SQLite-Struktur nur `kv_store` sein oder direkt fachlich normalisiert?
   - Empfehlung: vorerst keine SQLite-Pflicht; wenn SQLite spaeter kommt, dann `kv_store` zuerst und fachliche Normalisierung spaeter.
4. Wann darf alter `localStorage` bereinigt werden?
   - Empfehlung: nicht automatisch im ersten Migrationsrelease; spaeter per expliziter Nutzeraktion.
5. Soll es einen sichtbaren Migrationsstatus im UI geben?
   - Empfehlung: nur bei Fehlern oder Recovery-Bedarf sichtbar; erfolgreiche Migration still protokollieren.
6. Soll die Facade dauerhaft synchron bleiben?
   - Empfehlung: ja fuer Feature-Zugriffe; nur Initialisierung, Flush und Import bleiben async.

## Empfohlene erste Umsetzungseinheit

Kleine, reviewbare Slice:

1. `app/shared/runtime-env.js` einfuehren.
2. `app/shared/persistence-key-policy.js` einfuehren.
3. `app/shared/persistence-facade.js` mit synchronem In-Memory-Cache einfuehren.
4. `app/shared/persistence-adapter-localstorage.js` als Legacy-Backend einfuehren.
5. Tests fuer Runtime, Key-Policy, Facade-Cache, Flush-Queue und Legacy-Adapter schreiben.
6. Feature-Module schrittweise von direktem `localStorage` auf `PersistenceFacade.*Sync` umstellen.
7. Lifecycle-Flush fuer Browser (`visibilitychange`, `pagehide`) anbinden.
8. Noch keine Backend-Migration aktivieren.

Danach:

1. IndexedDB-Adapter plus Migration implementieren.
2. Profil- und Balance-Storage als erste Consumer umstellen.
3. Ausgaben, Tranchen und Simulator-Preferences nachziehen.
4. Tauri Custom Rust Commands fuer Laden, Speichern und Quarantaene implementieren.
5. Tauri-JSON-Dateiadapter implementieren.
6. Tauri-Window-Close-Handshake und Recovery-Screen implementieren.
7. Export/Import auf Adapter-Bundle umstellen.
8. SQLite nur bei nachgewiesenem Bedarf als spaetere Ausbaustufe planen.

## Erfolgskriterien

- Bestehende Nutzer verlieren keine gespeicherten Daten.
- Beim ersten Start nach Update werden vorhandene `localStorage`-Daten automatisch migriert.
- Nutzer muessen keinen Export/Import ausfuehren.
- Browserbetrieb bleibt vollwertig ohne Tauri.
- Tauri kann automatisch in eine lokale App-Daten-Datei persistieren.
- SQLite bleibt als spaetere Option moeglich, ist aber keine Voraussetzung fuer die Migration.
- Export/Import bleibt als Backup- und Recovery-Weg erhalten.
- Tests decken Cache-Konsistenz, Flush-Verhalten, Migration, Idempotenz, Allowlist, Korruptions-Recovery und Schutz vor stiller Rueckmigration ab.
