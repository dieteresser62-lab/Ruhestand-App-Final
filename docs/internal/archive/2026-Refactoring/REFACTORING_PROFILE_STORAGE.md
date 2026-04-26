# Refactoring: Profile Storage trennen

Status: `[x]` abgeschlossen

Backlog-Referenz: `docs/internal/REFACTORING_BACKLOG.md`, Punkt `8. Profile Storage in Registry, Key-Policy und Import/Export trennen`

Startdatum: 2026-04-26

## Ziel

`app/profile/profile-storage.js` soll eine kompatible Fassade bleiben. Registry, Key-Policy, Live-localStorage-Snapshotting und Import/Export sollen schrittweise in kleine, DOM-freie bzw. storage-adapter-faehige Module wandern.

## Nicht-Ziele

- Keine Aenderung an localStorage-Key-Namen.
- Keine Aenderung am Bundle-Format.
- Keine Aenderung am `window.name`-Transfer-Vertrag.
- Keine automatische Migration oder Datenbereinigung.

## Umsetzungsschritte

### Step 1: Key-Policy extrahieren

Soll:

- Profilbezogene Key-Erkennung aus `profile-storage.js` herausziehen.
- `listProfileScopedKeys()` direkt testbar machen.
- WebView-/Tauri-Fallbacks fuer feste Keys, `localStorage.key(index)` und enumerable Keys erhalten.

Ist:

- Umgesetzt in `app/profile/profile-key-policy.js`.
- Enthaltene Exporte:
  - `isProfileScopedKey()`
  - `listProfileScopedKeys()`
- `profile-storage.js` nutzt die Key-Policy fuer Snapshot, Clear, Load und Live-Data-Erkennung weiter als kompatible Fassade.
- `tests/profile-storage.test.mjs` prueft die Key-Policy direkt fuer `sim_`, `sim.`, Balance-State und globale Nicht-Profil-Keys.

### Step 2: Registry-CRUD extrahieren

Soll:

- Registry-Parsing, Speichern und Default-Profil-Erzeugung aus `profile-storage.js` herausziehen.
- CRUD fuer Profile, Metadaten, Verbundmitgliedschaft und Profildaten-Merge direkt testbar machen.
- `profile-storage.js` als kompatible Fassade fuer Profilwechsel, Live-localStorage und Bundle-IO erhalten.

Ist:

- Umgesetzt in `app/profile/profile-registry.js`.
- Enthaltene Exporte:
  - `getProfileRegistry()`
  - `saveProfileRegistry()`
  - `ensureDefaultProfile()`
  - `getCurrentProfileId()` / `setCurrentProfileId()`
  - `listProfiles()` / `getProfileMeta()` / `getProfileData()`
  - `createProfile()` / `renameProfile()` / `deleteProfile()`
  - `setProfileVerbundMembership()`
  - `replaceProfileData()` / `updateProfileData()`
- `profile-storage.js` delegiert Registry-CRUD an das neue Modul und liefert fuer das Default-Profil weiterhin den Live-Snapshot als Callback.
- `tests/profile-storage.test.mjs` prueft das Registry-Modul direkt fuer Default-Erzeugung, Slug-Erzeugung, Data-Merge und Profil-Liste.

### Step 3: Live-localStorage-Snapshotting extrahieren

Soll:

- Snapshot, Clear, Load und Live-Data-Erkennung aus `profile-storage.js` herausziehen.
- Key-Policy weiter zentral nutzen und globale Keys beim Laden/Clearen unangetastet lassen.
- Funktionen mit explizitem Storage-Adapter direkt testbar machen.

Ist:

- Umgesetzt in `app/profile/profile-live-storage.js`.
- Enthaltene Exporte:
  - `captureProfileData()`
  - `clearProfileScopedKeys()`
  - `loadProfileDataIntoLocalStorage()`
  - `hasProfileScopedDataInLocalStorage()`
- `profile-storage.js` nutzt das Modul fuer Default-Profil-Snapshot, Profilwechsel, Import-Load und Bootstrap-Erkennung.
- `tests/profile-storage.test.mjs` prueft Snapshot, Clear, Load, Null-Skip und Erhalt globaler Keys direkt.

### Step 4: Import/Export extrahieren

Soll:

- Bundle-Erstellung, Bundle-Import und `window.name`-Transfer aus `profile-storage.js` herausziehen.
- Bundle-Format, globale Keys und Fehlermeldungen stabil halten.
- Export-Speicherung und Import-Live-Load ueber Callbacks kompatibel an die Fassade anbinden.

Ist:

- Umgesetzt in `app/profile/profile-bundle-io.js`.
- Enthaltene Exporte:
  - `WINDOW_NAME_BUNDLE_PREFIX`
  - `exportProfilesBundle()`
  - `exportProfilesBundleToWindowName()`
  - `importProfilesBundle()`
  - `importProfilesBundleFromWindowName()`
- `profile-storage.js` delegiert Bundle-IO an das neue Modul und liefert weiterhin `saveCurrentProfileFromLocalStorage()` bzw. `loadProfileIntoLocalStorage()` als kompatible Fassade-Callbacks.
- `tests/profile-storage.test.mjs` prueft das Bundle-IO-Modul direkt fuer Save-Callback, Registry-/Globals-Export, `window.name`-Prefix, Import-Load-Callback und Globals-Restore.

## Abschlussdokumentation

- Abschlussdatum: 2026-04-26
- Commit: noch nicht erstellt
- Geaenderte Dateien:
  - `app/profile/profile-storage.js`
  - `app/profile/profile-key-policy.js`
  - `app/profile/profile-registry.js`
  - `app/profile/profile-live-storage.js`
  - `app/profile/profile-bundle-io.js`
  - `tests/profile-storage.test.mjs`
  - `docs/internal/REFACTORING_PROFILE_STORAGE.md`
  - `docs/internal/REFACTORING_BACKLOG.md`
  - `docs/internal/README.md`
  - `docs/reference/SIMULATOR_MODULES_README.md`
  - `docs/reference/TECHNICAL.md`
- Tests:
  - `node --check app/profile/profile-storage.js` erfolgreich
  - `node --check app/profile/profile-key-policy.js` erfolgreich
  - `node --check app/profile/profile-registry.js` erfolgreich
  - `node --check app/profile/profile-live-storage.js` erfolgreich
  - `node --check app/profile/profile-bundle-io.js` erfolgreich
  - `node tests/run-single.mjs tests/profile-storage.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/profile-state.test.mjs` erfolgreich
  - `node tests/run-single.mjs tests/profile-navigation.test.mjs` erfolgreich
  - `npm test` erfolgreich, 69 Testdateien, 1290/1290 Assertions
- Offene Restpunkte:
  - Keine.
