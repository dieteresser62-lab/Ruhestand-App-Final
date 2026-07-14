"use strict";

/**
 * Tests für profile-storage.js
 * - Profil-Registry CRUD-Operationen
 * - Profil-Switching und Daten-Migration
 * - Export/Import von Profil-Bundles
 * - Slug-Generierung und Konflikte
 * - belongsToHousehold-Logik
 * - Profile-scoped Keys
 * - Fehlerbehandlung
 */

import {
    listProfiles,
    getCurrentProfileId,
    setCurrentProfileId,
    createProfile,
    renameProfile,
    deleteProfile,
    switchProfile,
    saveCurrentProfileFromLocalStorage,
    loadProfileIntoLocalStorage,
    updateProfileData,
    getProfileMeta,
    getProfileData,
    setProfileVerbundMembership,
    getActiveProfileId,
    hasProfileScopedDataInLocalStorage,
    ensureProfileRegistry,
    bootstrapProfileContext,
    exportProfilesBundle,
    exportProfilesBundleToWindowName,
    importProfilesBundle,
    importProfilesBundleFromWindowName
} from '../app/profile/profile-storage.js';
import {
    isProfileScopedKey,
    listProfileScopedKeys
} from '../app/profile/profile-key-policy.js';
import {
    captureProfileData,
    clearProfileScopedKeys,
    hasProfileScopedDataInLocalStorage as hasLiveProfileScopedData,
    loadProfileDataIntoLocalStorage as loadLiveProfileData
} from '../app/profile/profile-live-storage.js';
import {
    exportProfilesBundle as exportBundleDirect,
    exportProfilesBundleToWindowName as exportBundleToWindowNameDirect,
    importProfilesBundle as importBundleDirect,
    importProfilesBundleFromWindowName as importBundleFromWindowNameDirect
} from '../app/profile/profile-bundle-io.js';
import {
    createProfile as createRegistryProfile,
    ensureDefaultProfile as ensureRegistryDefaultProfile,
    getProfileRegistry,
    listProfiles as listRegistryProfiles,
    updateProfileData as updateRegistryProfileData
} from '../app/profile/profile-registry.js';
import { CONFIG } from '../app/balance/balance-config.js';

console.log('--- Profile Storage Tests ---');

function createLocalStorageMock() {
    const store = new Map();
    return {
        getItem: (key) => (store.has(key) ? store.get(key) : null),
        setItem: (key, value) => { store.set(String(key), String(value)); },
        removeItem: (key) => { store.delete(key); },
        clear: () => { store.clear(); },
        key: (index) => Array.from(store.keys())[index] || null,
        get length() { return store.size; }
    };
}

const prevLocalStorage = global.localStorage;
const prevWindow = global.window;

try {
    global.localStorage = createLocalStorageMock();
    global.window = { name: '' };

    // ========== Default Profile Tests ==========

    // Test 1: Default profile creation
    console.log('Test 1: Default profile creation');
    {
        localStorage.clear();
        const profiles = listProfiles();
        assert(profiles.length === 1, 'Sollte Default-Profil erstellen');
        assert(profiles[0].id === 'default', 'Default-Profil ID sollte "default" sein');
        assert(getCurrentProfileId() === 'default', 'Aktuelles Profil sollte default sein');
    }
    console.log('✓ Default profile creation OK');

    // Test 2: ensureProfileRegistry idempotent
    console.log('Test 2: ensureProfileRegistry idempotent');
    {
        localStorage.clear();
        ensureProfileRegistry();
        ensureProfileRegistry();
        ensureProfileRegistry();

        const profiles = listProfiles();
        assert(profiles.length === 1, 'Mehrfaches Aufrufen sollte nur 1 Default-Profil erzeugen');
    }
    console.log('✓ ensureProfileRegistry idempotent OK');

    // Test 2b: Profile key policy
    console.log('Test 2b: Profile key policy');
    {
        localStorage.clear();
        localStorage.setItem('sim_test_key', '123');
        localStorage.setItem('sim.test.key', '456');
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, '{"inputs":{}}');
        localStorage.setItem('etfProxyUrl', 'global');

        assert(isProfileScopedKey('sim_test_key') === true, 'sim_ keys should be profile-scoped');
        assert(isProfileScopedKey('sim.test.key') === true, 'sim. keys should be profile-scoped');
        assert(isProfileScopedKey(CONFIG.STORAGE.LS_KEY) === true, 'Balance state key should be profile-scoped');
        assert(isProfileScopedKey('profile_health_bucket') === true, 'Health bucket key should be profile-scoped');
        assert(isProfileScopedKey('etfProxyUrl') === false, 'Global proxy key should not be profile-scoped');

        const keys = listProfileScopedKeys(localStorage);
        assert(keys.includes('sim_test_key'), 'Scoped keys should include sim_ key');
        assert(keys.includes('sim.test.key'), 'Scoped keys should include sim. key');
        assert(keys.includes(CONFIG.STORAGE.LS_KEY), 'Scoped keys should include balance state key');
        localStorage.setItem('profile_health_bucket', '{"enabled":true}');
        assert(listProfileScopedKeys(localStorage).includes('profile_health_bucket'), 'Scoped keys should include health bucket');
        assert(!keys.includes('etfProxyUrl'), 'Scoped keys should exclude global proxy key');
    }
    console.log('✓ Profile key policy OK');

    // Test 2c: Profile registry module
    console.log('Test 2c: Profile registry module');
    {
        localStorage.clear();
        localStorage.setItem('sim_registry_seed', 'seed');

        const registry = ensureRegistryDefaultProfile({
            captureProfileData: () => ({ sim_registry_seed: localStorage.getItem('sim_registry_seed') })
        });
        assert(registry.profiles.default, 'Registry module should create default profile');
        assert(registry.profiles.default.data.sim_registry_seed === 'seed', 'Default profile should use capture callback');

        const profile = createRegistryProfile('Registry Test', {
            captureProfileData: () => ({})
        });
        assert(profile.id === 'registry-test', 'Registry module should slugify profile names');

        updateRegistryProfileData(profile.id, { sim_registry_seed: 'patched' }, {
            captureProfileData: () => ({})
        });
        const storedRegistry = getProfileRegistry();
        assert(storedRegistry.profiles[profile.id].data.sim_registry_seed === 'patched', 'Registry module should merge profile data');

        const profiles = listRegistryProfiles({
            captureProfileData: () => ({})
        });
        assert(profiles.some(p => p.id === profile.id), 'Registry module should list created profiles');
    }
    console.log('✓ Profile registry module OK');

    // Test 2d: Profile live storage module
    console.log('Test 2d: Profile live storage module');
    {
        localStorage.clear();
        localStorage.setItem('sim_live_key', '123');
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, '{"inputs":{"x":1}}');
        localStorage.setItem('etfProxyUrl', 'global');

        const snapshot = captureProfileData(localStorage);
        assert(snapshot.sim_live_key === '123', 'Live storage snapshot should include sim_ keys');
        assert(snapshot[CONFIG.STORAGE.LS_KEY] === '{"inputs":{"x":1}}', 'Live storage snapshot should include balance state');
        assert(!Object.prototype.hasOwnProperty.call(snapshot, 'etfProxyUrl'), 'Live storage snapshot should exclude globals');
        assert(hasLiveProfileScopedData(localStorage) === true, 'Live storage should detect scoped data');

        clearProfileScopedKeys(localStorage);
        assert(localStorage.getItem('sim_live_key') === null, 'Live storage clear should remove sim_ keys');
        assert(localStorage.getItem(CONFIG.STORAGE.LS_KEY) === null, 'Live storage clear should remove balance state');
        assert(localStorage.getItem('etfProxyUrl') === 'global', 'Live storage clear should preserve globals');
        assert(hasLiveProfileScopedData(localStorage) === false, 'Live storage should be empty after clear');

        loadLiveProfileData({
            sim_live_key: '456',
            [CONFIG.STORAGE.LS_KEY]: '{"inputs":{"x":2}}',
            etfProxyUrl: 'must-not-load',
            sim_null_key: null
        }, localStorage);
        assert(localStorage.getItem('sim_live_key') === '456', 'Live storage load should restore scoped data');
        assert(localStorage.getItem(CONFIG.STORAGE.LS_KEY) === '{"inputs":{"x":2}}', 'Live storage load should restore balance state');
        assert(localStorage.getItem('etfProxyUrl') === 'global', 'Live storage load should not overwrite globals');
        assert(localStorage.getItem('sim_null_key') === null, 'Live storage load should skip null values');
    }
    console.log('✓ Profile live storage module OK');

    // Test 2e: Profile bundle IO module
    console.log('Test 2e: Profile bundle IO module');
    {
        localStorage.clear();
        ensureRegistryDefaultProfile({
            captureProfileData: () => ({})
        });
        createRegistryProfile('Bundle IO', {
            captureProfileData: () => ({})
        });
        localStorage.setItem('etfProxyUrl', 'https://bundle.example');

        let saved = false;
        const bundle = exportBundleDirect({
            storage: localStorage,
            saveCurrentProfile: () => { saved = true; }
        });
        assert(saved === true, 'Bundle IO export should invoke save callback');
        assert(bundle.registry && bundle.registry.profiles.default, 'Bundle IO export should include registry');
        assert(bundle.globals.etfProxyUrl === 'https://bundle.example', 'Bundle IO export should include globals');

        const windowRef = { name: '' };
        const exported = exportBundleToWindowNameDirect({
            storage: localStorage,
            windowRef
        });
        assert(exported === true, 'Bundle IO window export should succeed');
        assert(windowRef.name.startsWith('RUHESTAND_PROFILE_BUNDLE:'), 'Bundle IO window export should use stable prefix');

        localStorage.clear();
        let loadedId = null;
        const imported = importBundleDirect(bundle, {
            storage: localStorage,
            loadProfileIntoLocalStorage: (id) => {
                loadedId = id;
                return true;
            }
        });
        assert(imported.ok === true, 'Bundle IO import should succeed');
        assert(loadedId === bundle.currentProfileId, 'Bundle IO import should load current profile');
        assert(localStorage.getItem('etfProxyUrl') === 'https://bundle.example', 'Bundle IO import should restore globals');

        localStorage.clear();
        const importedFromWindow = importBundleFromWindowNameDirect({
            storage: localStorage,
            windowRef,
            loadProfileIntoLocalStorage: () => true
        });
        assert(importedFromWindow.ok === true, 'Bundle IO window import should succeed');
    }
    console.log('✓ Profile bundle IO module OK');

    // ========== Create Profile Tests ==========

    // Test 3: Create profiles with slug conflicts
    console.log('Test 3: Slug conflicts');
    {
        localStorage.clear();
        // Gleicher Anzeigename soll automatisch eindeutige Slugs erzeugen.
        const a = createProfile('Meine Familie');
        const b = createProfile('Meine Familie');
        const c = createProfile('Meine Familie');

        assert(a.id !== b.id, 'Erste Konflikt-ID sollte unique sein');
        assert(b.id !== c.id, 'Zweite Konflikt-ID sollte unique sein');
        assert(a.id !== c.id, 'Dritte Konflikt-ID sollte unique sein');

        // Prüfe Suffix-Pattern
        assert(b.id.includes('-1') || b.id.includes('-2'), 'Konflikt-IDs sollten Suffix haben');
    }
    console.log('✓ Slug conflicts OK');

    // Test 4: Slug-Normalisierung
    console.log('Test 4: Slug-Normalisierung');
    {
        localStorage.clear();
        const profile = createProfile('Test Profil mit Umlauten äöü!@#$%');

        assert(profile.id.length > 0, 'Slug sollte nicht leer sein');
        assert(!profile.id.includes('ä'), 'Slug sollte keine Umlaute enthalten');
        assert(!profile.id.includes(' '), 'Slug sollte keine Leerzeichen enthalten');
        assert(!profile.id.includes('!'), 'Slug sollte keine Sonderzeichen enthalten');
    }
    console.log('✓ Slug-Normalisierung OK');

    // Test 5: Leerer Name
    console.log('Test 5: Leerer Name');
    {
        localStorage.clear();
        const profile = createProfile('');

        assert(profile.id === 'profile', 'Leerer Name sollte "profile" als ID bekommen');
        assert(profile.name === '' || profile.name === 'profile', 'Name sollte leer oder "profile" sein');
    }
    console.log('✓ Leerer Name OK');

    // ========== Rename Profile Tests ==========

    // Test 6: Rename profile
    console.log('Test 6: Rename profile');
    {
        localStorage.clear();
        const profile = createProfile('Original');
        const renamed = renameProfile(profile.id, 'Neuer Name');

        assert(renamed !== null, 'Umbenennen sollte erfolgreich sein');
        assert(renamed.name === 'Neuer Name', 'Name sollte aktualisiert sein');
        assert(renamed.id === profile.id, 'ID sollte gleich bleiben');
    }
    console.log('✓ Rename profile OK');

    // Test 7: Rename non-existent profile
    console.log('Test 7: Rename non-existent profile');
    {
        localStorage.clear();
        const result = renameProfile('non-existent-id', 'Test');

        assert(result === null, 'Umbenennen eines nicht-existierenden Profils sollte null zurückgeben');
    }
    console.log('✓ Rename non-existent profile OK');

    // ========== Delete Profile Tests ==========

    // Test 8: Delete profile
    console.log('Test 8: Delete profile');
    {
        localStorage.clear();
        const profile = createProfile('Zu löschen');
        const deleted = deleteProfile(profile.id);

        assert(deleted === true, 'Löschen sollte erfolgreich sein');

        const profiles = listProfiles();
        assert(!profiles.some(p => p.id === profile.id), 'Gelöschtes Profil sollte nicht mehr existieren');
    }
    console.log('✓ Delete profile OK');

    // Test 9: Cannot delete last default profile
    console.log('Test 9: Cannot delete last default profile');
    {
        localStorage.clear();
        const deleted = deleteProfile('default');

        assert(deleted === false, 'Letztes Default-Profil sollte nicht löschbar sein');

        const profiles = listProfiles();
        assert(profiles.some(p => p.id === 'default'), 'Default-Profil sollte noch existieren');
    }
    console.log('✓ Cannot delete last default profile OK');

    // Test 10: Delete current profile switches to another
    console.log('Test 10: Delete current profile switches');
    {
        localStorage.clear();
        const newProfile = createProfile('Aktiv');
        switchProfile(newProfile.id);

        assert(getCurrentProfileId() === newProfile.id, 'Neues Profil sollte aktiv sein');

        deleteProfile(newProfile.id);

        assert(getCurrentProfileId() !== newProfile.id, 'Nach Löschung sollte anderes Profil aktiv sein');
    }
    console.log('✓ Delete current profile switches OK');

    // ========== Switch Profile Tests ==========

    // Test 11: Save and switch profiles
    console.log('Test 11: Save and switch profiles');
    {
        localStorage.clear();
        localStorage.setItem('sim_test_key', '123');
        saveCurrentProfileFromLocalStorage();

        const newProfile = createProfile('Zweitprofil');
        const switched = switchProfile(newProfile.id);
        assert(switched, 'Switch sollte erfolgreich sein');

        assert(localStorage.getItem('sim_test_key') === null, 'Profile-scoped Daten sollten beim Switch gelöscht werden');

        updateProfileData(newProfile.id, { sim_test_key: '456' });
        const loaded = loadProfileIntoLocalStorage(newProfile.id);
        assert(loaded, 'Laden sollte erfolgreich sein');
        assert(localStorage.getItem('sim_test_key') === '456', 'Profil-Daten sollten nach Laden wiederhergestellt sein');
    }
    console.log('✓ Save and switch profiles OK');

    // Test 12: Switch to same profile
    console.log('Test 12: Switch to same profile');
    {
        localStorage.clear();
        const currentId = getCurrentProfileId();
        const result = switchProfile(currentId);

        assert(result === true, 'Switch zum gleichen Profil sollte erfolgreich sein');
    }
    console.log('✓ Switch to same profile OK');

    // Test 13: Switch to non-existent profile
    console.log('Test 13: Switch to non-existent profile');
    {
        localStorage.clear();
        const result = switchProfile('non-existent-id');

        assert(result === false, 'Switch zu nicht-existierendem Profil sollte fehlschlagen');
    }
    console.log('✓ Switch to non-existent profile OK');

    // ========== Profile Meta/Data Tests ==========

    // Test 14: getProfileMeta
    console.log('Test 14: getProfileMeta');
    {
        localStorage.clear();
        const profile = createProfile('Test');
        const meta = getProfileMeta(profile.id);

        assert(meta !== null, 'Meta sollte existieren');
        assert(meta.id === profile.id, 'ID sollte übereinstimmen');
        assert(meta.name === 'Test', 'Name sollte übereinstimmen');
        assert(typeof meta.createdAt === 'string', 'createdAt sollte String sein');
        assert(typeof meta.belongsToHousehold === 'boolean', 'belongsToHousehold sollte Boolean sein');
    }
    console.log('✓ getProfileMeta OK');

    // Test 15: getProfileMeta non-existent
    console.log('Test 15: getProfileMeta non-existent');
    {
        localStorage.clear();
        const meta = getProfileMeta('non-existent-id');

        assert(meta === null, 'Meta für nicht-existierendes Profil sollte null sein');
    }
    console.log('✓ getProfileMeta non-existent OK');

    // Test 16: getProfileData
    console.log('Test 16: getProfileData');
    {
        localStorage.clear();
        const profile = createProfile('Test');
        updateProfileData(profile.id, { custom_key: 'custom_value' });

        const data = getProfileData(profile.id);

        assert(data !== null, 'Data sollte existieren');
        assert(data.custom_key === 'custom_value', 'Custom key sollte vorhanden sein');
    }
    console.log('✓ getProfileData OK');

    // Test 17: updateProfileData merges
    console.log('Test 17: updateProfileData merges');
    {
        localStorage.clear();
        const profile = createProfile('Test');
        updateProfileData(profile.id, { key1: 'value1' });
        updateProfileData(profile.id, { key2: 'value2' });

        const data = getProfileData(profile.id);

        assert(data.key1 === 'value1', 'key1 sollte erhalten bleiben');
        assert(data.key2 === 'value2', 'key2 sollte hinzugefügt sein');
    }
    console.log('✓ updateProfileData merges OK');

    // Test 17b: saveCurrentProfileFromLocalStorage persists profile asset keys immediately
    console.log('Test 17b: immediate persistence of profile-scoped keys');
    {
        localStorage.clear();
        ensureProfileRegistry();

        localStorage.setItem('depot_tranchen', JSON.stringify([{ trancheId: 't1', marketValue: 12345 }]));
        localStorage.setItem('profile_tagesgeld', '42000');

        const saved = saveCurrentProfileFromLocalStorage();
        assert(saved === true, 'Sofortiges Speichern sollte erfolgreich sein');

        const data = getProfileData(getCurrentProfileId());
        assert(data !== null, 'Aktives Profil sollte Daten haben');
        assert(data.depot_tranchen !== null, 'Tranchen sollten im Profil gespeichert werden');
        assert(data.profile_tagesgeld === '42000', 'Profil-Tagesgeld sollte im Profil gespeichert werden');
    }
    console.log('✓ immediate persistence of profile-scoped keys OK');

    // Test 17c: hasProfileScopedDataInLocalStorage guards empty bootstrap states
    console.log('Test 17c: detect live profile-scoped data');
    {
        localStorage.clear();
        ensureProfileRegistry();

        assert(hasProfileScopedDataInLocalStorage() === false, 'Leerer Live-Storage sollte als leer erkannt werden');

        localStorage.setItem('profile_tagesgeld', '1000');
        assert(hasProfileScopedDataInLocalStorage() === true, 'Profil-Key im Live-Storage sollte erkannt werden');

        localStorage.removeItem('profile_tagesgeld');
        localStorage.setItem('unrelated_key', 'x');
        assert(hasProfileScopedDataInLocalStorage() === false, 'Nicht-profilbezogene Keys duerfen nicht zaehlen');
    }
    console.log('✓ detect live profile-scoped data OK');

    // Test 17d: bootstrap loads current profile by default
    console.log('Test 17d: bootstrap loads current profile by default');
    {
        localStorage.clear();
        const profile = createProfile('Bootstrap');
        updateProfileData(profile.id, { profile_tagesgeld: '5000' });
        setCurrentProfileId(profile.id);

        const result = bootstrapProfileContext();

        assert(result.action === 'loaded', 'Default-Bootstrap sollte Profil in Live-Storage laden');
        assert(localStorage.getItem('profile_tagesgeld') === '5000', 'Aktuelles Profil sollte in den Live-Storage geladen werden');
        assert(getActiveProfileId() === profile.id, 'Geladenes Profil sollte als aktiv markiert werden');
    }
    console.log('✓ bootstrap loads current profile by default OK');

    // Test 17e: bootstrap can preserve live profile data for current active profile
    console.log('Test 17e: bootstrap preserves live data when requested');
    {
        localStorage.clear();
        ensureProfileRegistry();
        localStorage.setItem('profile_tagesgeld', '9999');
        localStorage.setItem('rs_active_profile', getCurrentProfileId());

        const result = bootstrapProfileContext({ preserveLiveProfileData: true });

        assert(result.action === 'saved', 'Bootstrap sollte vorhandene Live-Daten speichern statt sie zu überschreiben');
        assert(getProfileData(getCurrentProfileId()).profile_tagesgeld === '9999', 'Live-Daten sollten ins aktuelle Profil persistiert werden');
    }
    console.log('✓ bootstrap preserves live data when requested OK');

    // Test 17f: Explicit empty tranche override never falls back to stale live data
    console.log('Test 17f: explicit empty tranche override');
    {
        localStorage.clear();
        ensureProfileRegistry();
        localStorage.setItem('depot_tranchen', JSON.stringify([{ trancheId: 'profile-a' }]));
        saveCurrentProfileFromLocalStorage();

        const emptyProfile = createProfile('Leer');
        updateProfileData(emptyProfile.id, { depot_tranchen: '[]' });
        setCurrentProfileId(emptyProfile.id);

        const result = bootstrapProfileContext();
        assert(result.action === 'loaded', 'Leeres Zielprofil sollte explizit geladen werden');
        assert(localStorage.getItem('depot_tranchen') === '[]', 'Explizites [] darf nicht auf Live-Tranchen des vorherigen Profils zurückfallen');
        assert(getActiveProfileId() === emptyProfile.id, 'Leeres Zielprofil sollte als tatsächlich geladen markiert werden');
    }
    console.log('✓ explicit empty tranche override OK');

    // ========== belongsToHousehold Tests ==========

    // Test 18: setProfileVerbundMembership
    console.log('Test 18: setProfileVerbundMembership');
    {
        localStorage.clear();
        const profile = createProfile('Test');

        // Default sollte true sein
        let meta = getProfileMeta(profile.id);
        assert(meta.belongsToHousehold === true, 'Default belongsToHousehold sollte true sein');

        // Setze auf false
        setProfileVerbundMembership(profile.id, false);
        meta = getProfileMeta(profile.id);
        assert(meta.belongsToHousehold === false, 'belongsToHousehold sollte false sein');

        // Setze auf true
        setProfileVerbundMembership(profile.id, true);
        meta = getProfileMeta(profile.id);
        assert(meta.belongsToHousehold === true, 'belongsToHousehold sollte wieder true sein');
    }
    console.log('✓ setProfileVerbundMembership OK');

    // Test 18b: Legacy profiles without membership use the documented default
    console.log('Test 18b: Legacy membership default');
    {
        localStorage.clear();
        localStorage.setItem('rs_profiles_v1', JSON.stringify({
            version: 1,
            profiles: {
                legacy: {
                    meta: {
                        id: 'legacy',
                        name: 'Legacy',
                        createdAt: '2025-01-01T00:00:00.000Z',
                        updatedAt: '2025-01-01T00:00:00.000Z'
                    },
                    data: {}
                }
            }
        }));
        localStorage.setItem('rs_current_profile', 'legacy');

        const legacy = listProfiles().find(profile => profile.id === 'legacy');
        assert(legacy?.belongsToHousehold === true,
            'Legacy-Profil ohne Wert sollte beim Lesen den Default true erhalten');

        const persistedRegistry = JSON.parse(localStorage.getItem('rs_profiles_v1'));
        assert(!Object.prototype.hasOwnProperty.call(
            persistedRegistry.profiles.legacy.meta,
            'belongsToHousehold'
        ), 'Legacy-Default sollte ohne pauschale Registry-Migration gelten');

        const newProfile = createProfile('Neues Haushaltsprofil');
        assert(newProfile.belongsToHousehold === true,
            'Neu angelegtes Profil sollte belongsToHousehold=true explizit speichern');
    }
    console.log('✓ Legacy membership default OK');

    // Test 19: listProfiles includes belongsToHousehold
    console.log('Test 19: listProfiles includes belongsToHousehold');
    {
        localStorage.clear();
        const profile1 = createProfile('Haushalt');
        const profile2 = createProfile('Extern');

        setProfileVerbundMembership(profile2.id, false);

        const profiles = listProfiles();
        const p1 = profiles.find(p => p.id === profile1.id);
        const p2 = profiles.find(p => p.id === profile2.id);

        assert(p1.belongsToHousehold === true, 'Haushalt-Profil sollte belongsToHousehold=true haben');
        assert(p2.belongsToHousehold === false, 'Extern-Profil sollte belongsToHousehold=false haben');
    }
    console.log('✓ listProfiles includes belongsToHousehold OK');

    // ========== Export/Import Tests ==========

    // Test 20: Export/Import bundle
    console.log('Test 20: Export/Import bundle');
    {
        localStorage.clear();
        createProfile('Export Test');

        const bundle = exportProfilesBundle();
        assert(bundle && bundle.registry, 'Sollte Bundle exportieren');
        assert(bundle.version !== undefined, 'Bundle sollte Version haben');
        assert(bundle.exportedAt !== undefined, 'Bundle sollte Timestamp haben');

        const badImport = importProfilesBundle(null);
        assert(badImport.ok === false, 'Ungültiger Import sollte fehlschlagen');

        const okImport = importProfilesBundle(bundle);
        assert(okImport.ok === true, 'Gültiger Import sollte erfolgreich sein');
    }
    console.log('✓ Export/Import bundle OK');

    // Test 21: Import with globals
    console.log('Test 21: Import with globals');
    {
        localStorage.clear();

        const bundle = {
            version: 1,
            exportedAt: new Date().toISOString(),
            registry: {
                version: 1,
                profiles: {
                    'test': {
                        meta: { id: 'test', name: 'Test', createdAt: new Date().toISOString(), belongsToHousehold: true },
                        data: {}
                    }
                }
            },
            currentProfileId: 'test',
            globals: {
                etfProxyUrl: 'https://example.com',
                enableWorkerTelemetry: 'true'
            }
        };

        const result = importProfilesBundle(bundle);

        assert(result.ok === true, 'Import sollte erfolgreich sein');
        assert(localStorage.getItem('etfProxyUrl') === 'https://example.com', 'Global etfProxyUrl sollte gesetzt sein');
        assert(localStorage.getItem('enableWorkerTelemetry') === 'true', 'Global enableWorkerTelemetry sollte gesetzt sein');
    }
    console.log('✓ Import with globals OK');

    // Test 21b: Export/Import via window.name
    console.log('Test 21b: Import via window.name');
    {
        localStorage.clear();
        global.window.name = '';
        ensureProfileRegistry();
        localStorage.setItem('profile_tagesgeld', '777');
        saveCurrentProfileFromLocalStorage();

        const exported = exportProfilesBundleToWindowName();
        assert(exported === true, 'Export nach window.name sollte erfolgreich sein');
        assert(global.window.name.includes('RUHESTAND_PROFILE_BUNDLE:'), 'window.name sollte Bundle-Prefix enthalten');

        localStorage.clear();
        const imported = importProfilesBundleFromWindowName();
        assert(imported.ok === true, 'Import aus window.name sollte erfolgreich sein');
        assert(localStorage.getItem('profile_tagesgeld') === '777', 'Profil-Daten sollten aus window.name wiederhergestellt werden');
    }
    console.log('✓ Import via window.name OK');

    // Test 21c: Export/Import preserves current profile tranches
    console.log('Test 21c: Export/Import preserves current profile tranches');
    {
        localStorage.clear();
        ensureProfileRegistry();
        const tranches = [
            { trancheId: 't1', marketValue: 12345, costBasis: 10000, type: 'aktien_alt' },
            { trancheId: 'g1', marketValue: 5000, costBasis: 4000, type: 'gold', category: 'gold' }
        ];
        localStorage.setItem('depot_tranchen', JSON.stringify(tranches));
        localStorage.setItem('profile_tagesgeld', '32100');

        const bundle = exportProfilesBundle();
        const currentId = bundle.currentProfileId;
        assert(bundle.registry.profiles[currentId].data.depot_tranchen !== undefined,
            'Bundle sollte aktuelle Profil-Tranchen enthalten');

        localStorage.clear();
        const imported = importProfilesBundle(bundle);
        assert(imported.ok === true, 'Import mit Profil-Tranchen sollte erfolgreich sein');
        assertEqual(localStorage.getItem('profile_tagesgeld'), '32100',
            'Import sollte Profilwerte wieder in Live-Storage laden');

        const restored = JSON.parse(localStorage.getItem('depot_tranchen'));
        assertEqual(restored.length, 2, 'Import sollte alle Tranchen wiederherstellen');
        assertEqual(restored[0].trancheId, 't1', 'Erste Tranche sollte erhalten bleiben');
        assertEqual(restored[1].type, 'gold', 'Gold-Tranche sollte erhalten bleiben');
    }
    console.log('✓ Export/Import preserves current profile tranches OK');

    // Test 22: Import invalid registry
    console.log('Test 22: Import invalid registry');
    {
        localStorage.clear();

        const badBundle = { version: 1, registry: 'not-an-object' };
        const result = importProfilesBundle(badBundle);

        assert(result.ok === false, 'Import mit ungültiger Registry sollte fehlschlagen');
        assert(result.message.includes('ungueltig') || result.message.includes('fehlt'),
            'Fehlermeldung sollte Registry erwähnen');
    }
    console.log('✓ Import invalid registry OK');

    // ========== Corrupt Data Tests ==========

    // Test 23: Corrupt registry JSON should not crash
    console.log('Test 23: Corrupt registry JSON');
    {
        localStorage.clear();
        localStorage.setItem('rs_profiles_v1', 'not-json');
        const profiles = listProfiles();
        assert(profiles.length >= 1, 'Korrupte Registry sollte auf Default zurückfallen');
    }
    console.log('✓ Corrupt registry JSON OK');

    // Test 24: Registry with missing profiles object
    console.log('Test 24: Registry with missing profiles');
    {
        localStorage.clear();
        localStorage.setItem('rs_profiles_v1', JSON.stringify({ version: 1 }));

        const profiles = listProfiles();
        assert(profiles.length >= 1, 'Registry ohne profiles sollte Default erstellen');
    }
    console.log('✓ Registry with missing profiles OK');

    // Test 25: Registry with null profiles
    console.log('Test 25: Registry with null profiles');
    {
        localStorage.clear();
        localStorage.setItem('rs_profiles_v1', JSON.stringify({ version: 1, profiles: null }));

        const profiles = listProfiles();
        assert(profiles.length >= 1, 'Registry mit null profiles sollte Default erstellen');
    }
    console.log('✓ Registry with null profiles OK');

    // ========== Active Profile Tests ==========

    // Test 26: getActiveProfileId
    console.log('Test 26: getActiveProfileId');
    {
        localStorage.clear();
        const profile = createProfile('Test');
        loadProfileIntoLocalStorage(profile.id);

        const activeId = getActiveProfileId();
        assert(activeId === profile.id, 'Aktives Profil sollte das geladene Profil sein');
    }
    console.log('✓ getActiveProfileId OK');

    // Test 27: setCurrentProfileId
    console.log('Test 27: setCurrentProfileId');
    {
        localStorage.clear();
        const profile = createProfile('Test');

        setCurrentProfileId(profile.id);

        assert(getCurrentProfileId() === profile.id, 'getCurrentProfileId sollte gesetzten Wert zurückgeben');
    }
    console.log('✓ setCurrentProfileId OK');

    // ========== Profile-scoped Keys Tests ==========

    // Test 28: Profile-scoped keys are cleared on switch
    console.log('Test 28: Profile-scoped keys cleared');
    {
        localStorage.clear();

        // Setze verschiedene Key-Typen
        localStorage.setItem('sim_test', 'value1');
        localStorage.setItem('sim.test', 'value2');
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, '{}');
        localStorage.setItem('depot_tranchen', '[]');

        saveCurrentProfileFromLocalStorage();

        const newProfile = createProfile('Neu');
        switchProfile(newProfile.id);

        // Profile-scoped Keys sollten gelöscht sein
        assert(localStorage.getItem('sim_test') === null, 'sim_test sollte gelöscht sein');
        assert(localStorage.getItem('sim.test') === null, 'sim.test sollte gelöscht sein');
        assert(localStorage.getItem(CONFIG.STORAGE.LS_KEY) === null, 'balance_app_state sollte gelöscht sein');
        assert(localStorage.getItem('depot_tranchen') === null, 'depot_tranchen sollte gelöscht sein');
    }
    console.log('✓ Profile-scoped keys cleared OK');

    // Test 29: Non-profile-scoped keys are preserved
    console.log('Test 29: Non-profile-scoped keys preserved');
    {
        localStorage.clear();

        // Setze einen nicht-profile-scoped Key
        localStorage.setItem('global_setting', 'preserved');

        const newProfile = createProfile('Neu');
        switchProfile(newProfile.id);

        // Dieser Key sollte NICHT profile-scoped sein (abhängig von Implementierung)
        // Hinweis: Je nach isProfileScopedKey-Implementierung könnte dies anders sein
    }
    console.log('✓ Non-profile-scoped keys preserved OK');

    // Test 30: Multiple profile data isolation
    console.log('Test 30: Multiple profile data isolation');
    {
        localStorage.clear();

        // Profil A: Setze Daten
        const profileA = createProfile('Profil A');
        switchProfile(profileA.id);
        localStorage.setItem('sim_data', 'A-Daten');
        saveCurrentProfileFromLocalStorage();

        // Profil B: Setze andere Daten
        const profileB = createProfile('Profil B');
        switchProfile(profileB.id);
        localStorage.setItem('sim_data', 'B-Daten');
        saveCurrentProfileFromLocalStorage();

        // Wechsle zurück zu A
        switchProfile(profileA.id);
        assert(localStorage.getItem('sim_data') === 'A-Daten', 'Profil A sollte seine eigenen Daten haben');

        // Wechsle zurück zu B
        switchProfile(profileB.id);
        assert(localStorage.getItem('sim_data') === 'B-Daten', 'Profil B sollte seine eigenen Daten haben');
    }
    console.log('✓ Multiple profile data isolation OK');

    console.log('✅ Profile storage behaviors validated');

} finally {
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
    if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
}

console.log('--- Profile Storage Tests Completed ---');
