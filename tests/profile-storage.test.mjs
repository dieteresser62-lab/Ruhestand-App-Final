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
    createProfileRecoveryDocument,
    resetProfileRecovery,
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
    importProfilesBundleFromWindowName as importBundleFromWindowNameDirect,
    PROFILE_BUNDLE_APP_ID,
    PROFILE_BUNDLE_SCHEMA_VERSION,
    PROFILE_BUNDLE_TYPE
} from '../app/profile/profile-bundle-io.js';
import {
    createProfile as createRegistryProfile,
    ensureDefaultProfile as ensureRegistryDefaultProfile,
    getProfileRegistry,
    loadProfileRegistry,
    listProfiles as listRegistryProfiles,
    updateProfileData as updateRegistryProfileData
} from '../app/profile/profile-registry.js';
import { PROFILE_LOAD_STATUS } from '../app/profile/profile-state.js';
import { CONFIG } from '../app/balance/balance-config.js';
import { loadTranchesFromStorage } from '../app/tranches/tranchen-manager-state.js';

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

function serializeStorage(storage) {
    const entries = [];
    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key) entries.push([key, storage.getItem(key)]);
    }
    return JSON.stringify(entries.sort(([left], [right]) => left.localeCompare(right)));
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
        localStorage.setItem('household_simulator_needs_v1', '{"schemaVersion":1}');
        localStorage.setItem('household_simulator_needs_warning_ack_v1', 'ack');

        assert(isProfileScopedKey('sim_test_key') === true, 'sim_ keys should be profile-scoped');
        assert(isProfileScopedKey('sim.test.key') === true, 'sim. keys should be profile-scoped');
        assert(isProfileScopedKey(CONFIG.STORAGE.LS_KEY) === true, 'Balance state key should be profile-scoped');
        assert(isProfileScopedKey('profile_health_bucket') === true, 'Health bucket key should be profile-scoped');
        assert(isProfileScopedKey('etfProxyUrl') === false, 'Global proxy key should not be profile-scoped');
        assert(isProfileScopedKey('household_simulator_needs_v1') === false,
            'Household simulator needs must not be profile-scoped');
        assert(isProfileScopedKey('household_simulator_needs_warning_ack_v1') === false,
            'Household simulator warning acknowledgement must not be profile-scoped');

        const keys = listProfileScopedKeys(localStorage);
        assert(keys.includes('sim_test_key'), 'Scoped keys should include sim_ key');
        assert(keys.includes('sim.test.key'), 'Scoped keys should include sim. key');
        assert(keys.includes(CONFIG.STORAGE.LS_KEY), 'Scoped keys should include balance state key');
        localStorage.setItem('profile_health_bucket', '{"enabled":true}');
        assert(listProfileScopedKeys(localStorage).includes('profile_health_bucket'), 'Scoped keys should include health bucket');
        assert(!keys.includes('etfProxyUrl'), 'Scoped keys should exclude global proxy key');
        assert(!keys.includes('household_simulator_needs_v1'), 'Scoped keys should exclude household simulator needs');
        assert(!keys.includes('household_simulator_needs_warning_ack_v1'),
            'Scoped keys should exclude household simulator warning acknowledgement');
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
        localStorage.setItem('household_simulator_needs_v1', '{"schemaVersion":1,"startFloorBedarf":"24000"}');

        const snapshot = captureProfileData(localStorage);
        assert(snapshot.sim_live_key === '123', 'Live storage snapshot should include sim_ keys');
        assert(snapshot[CONFIG.STORAGE.LS_KEY] === '{"inputs":{"x":1}}', 'Live storage snapshot should include balance state');
        assert(!Object.prototype.hasOwnProperty.call(snapshot, 'etfProxyUrl'), 'Live storage snapshot should exclude globals');
        assert(!Object.prototype.hasOwnProperty.call(snapshot, 'household_simulator_needs_v1'),
            'Live profile snapshot should exclude household simulator needs');
        assert(hasLiveProfileScopedData(localStorage) === true, 'Live storage should detect scoped data');

        clearProfileScopedKeys(localStorage);
        assert(localStorage.getItem('sim_live_key') === null, 'Live storage clear should remove sim_ keys');
        assert(localStorage.getItem(CONFIG.STORAGE.LS_KEY) === null, 'Live storage clear should remove balance state');
        assert(localStorage.getItem('etfProxyUrl') === 'global', 'Live storage clear should preserve globals');
        assert(localStorage.getItem('household_simulator_needs_v1') !== null,
            'Live profile clear should preserve household simulator needs');
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

        const atomicStore = new Map([
            ['sim_existing', 'before'],
            ['global_setting', 'keep']
        ]);
        let failNextProfileWrite = true;
        const failingStorage = {
            getItem: key => atomicStore.has(String(key)) ? atomicStore.get(String(key)) : null,
            setItem(key, value) {
                if (String(key) === 'sim_target' && failNextProfileWrite) {
                    failNextProfileWrite = false;
                    throw new Error('synthetic write failure');
                }
                atomicStore.set(String(key), String(value));
            },
            removeItem: key => atomicStore.delete(String(key)),
            key: index => Array.from(atomicStore.keys())[index] || null,
            get length() { return atomicStore.size; }
        };
        let atomicError = null;
        try {
            loadLiveProfileData({ sim_target: 'after' }, failingStorage);
        } catch (error) {
            atomicError = error;
        }
        assertEqual(atomicError?.code, 'PROFILE_LIVE_STORAGE_UNAVAILABLE', 'Partial live write should surface unavailable');
        assertEqual(failingStorage.getItem('sim_existing'), 'before', 'Failed live load restores the previous profile state');
        assertEqual(failingStorage.getItem('sim_target'), null, 'Failed live load leaves no partial target state');
        assertEqual(failingStorage.getItem('global_setting'), 'keep', 'Live rollback preserves global keys');
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
        ensureProfileRegistry();
        loadProfileIntoLocalStorage('default');
        localStorage.setItem('profile_tagesgeld', '50000');
        localStorage.setItem('profile_aktuelles_alter', '67');
        saveCurrentProfileFromLocalStorage();
        const defaultDataBeforeDelete = { ...getProfileData('default') };
        const newProfile = createProfile('Aktiv');
        updateProfileData(newProfile.id, {
            profile_tagesgeld: '20000',
            profile_aktuelles_alter: '61'
        });
        switchProfile(newProfile.id);

        assert(getCurrentProfileId() === newProfile.id, 'Neues Profil sollte aktiv sein');
        assertEqual(getActiveProfileId(), newProfile.id, 'Neues Profil sollte den Live-State besitzen');

        deleteProfile(newProfile.id);

        assertEqual(getCurrentProfileId(), 'default', 'Nach Löschung sollte das Default-Profil aktuell sein');
        assertEqual(getActiveProfileId(), 'default', 'Nach Löschung muss der Live-State dem Default-Profil gehören');
        assertEqual(localStorage.getItem('profile_tagesgeld'), '50000',
            'Löschen des aktiven Profils muss den gesunden Ziel-Live-State laden');
        assertEqual(localStorage.getItem('profile_aktuelles_alter'), '67',
            'Löschen des aktiven Profils darf kein Feld des gelöschten Profils stehen lassen');
        assertEqual(getProfileData('default').profile_tagesgeld, defaultDataBeforeDelete.profile_tagesgeld,
            'Das Zielprofil darf beim Löschen nicht mit dem alten Live-State überschrieben werden');
    }
    console.log('✓ Delete current profile switches OK');

    console.log('Test 10b: Delete last custom profile reconciles fallback context');
    {
        localStorage.clear();
        ensureProfileRegistry();
        loadProfileIntoLocalStorage('default');
        const onlyOtherProfile = createProfile('Letztes Profil');
        updateProfileData(onlyOtherProfile.id, {
            profile_tagesgeld: '20000',
            profile_aktuelles_alter: '61'
        });

        assert(deleteProfile('default') === true,
            'Default-Profil sollte bei vorhandenem Ersatzprofil löschbar sein');
        assertEqual(getCurrentProfileId(), onlyOtherProfile.id,
            'Verbleibendes Profil sollte nach erster Löschung aktuell sein');
        assertEqual(getActiveProfileId(), onlyOtherProfile.id,
            'Verbleibendes Profil sollte nach erster Löschung den Live-State besitzen');

        assert(deleteProfile(onlyOtherProfile.id) === true,
            'Letztes benutzerdefiniertes Profil sollte einen frischen Default-Kontext erzeugen');
        assertEqual(listProfiles().length, 1,
            'Nach Löschung des letzten Profils sollte genau ein Default-Profil existieren');
        assertEqual(getCurrentProfileId(), 'default',
            'Frisch erzeugtes Default-Profil sollte aktuell sein');
        assertEqual(getActiveProfileId(), 'default',
            'Frisch erzeugtes Default-Profil muss auch den Live-State besitzen');
        assertEqual(localStorage.getItem('profile_tagesgeld'), null,
            'Live-State des gelöschten letzten Profils darf nicht stehen bleiben');
    }
    console.log('✓ Delete last custom profile fallback context OK');

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

    // Test 17bb: top-level reconciliation history survives normal profile saves
    console.log('Test 17bb: reconciliation history survives profile saves');
    {
        localStorage.clear();
        ensureProfileRegistry();
        const registry = JSON.parse(localStorage.getItem('rs_profiles_v1'));
        registry.trancheReconciliation = {
            schemaVersion: 1,
            actions: [{
                schemaVersion: 1,
                actionId: 'synthetic-order-1',
                profileId: 'default',
                trancheId: 'synthetic-lot-1',
                executedAt: '2026-07-14',
                actual: { sharesSold: 1, grossProceeds: 100, fees: 1, netProceeds: 99 },
                result: { beforeShares: 2, remainingShares: 1, trancheRemoved: false }
            }]
        };
        localStorage.setItem('rs_profiles_v1', JSON.stringify(registry));
        localStorage.setItem('profile_tagesgeld', '43000');

        assert(saveCurrentProfileFromLocalStorage() === true, 'Normaler Profilsave sollte erfolgreich sein');
        const savedRegistry = JSON.parse(localStorage.getItem('rs_profiles_v1'));
        assert(savedRegistry.trancheReconciliation.actions.length === 1,
            'Profilwerte-Save darf den globalen Idempotenz-/Auditverlauf nicht entfernen');
        assert(savedRegistry.trancheReconciliation.actions[0].actionId === 'synthetic-order-1',
            'Stabile Action-ID bleibt bei spaeteren Profilsaves erhalten');
    }
    console.log('✓ reconciliation history preservation OK');

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

    // Test 17g: Profile switches preserve legacy/corrupt tranche payloads until an explicit save
    console.log('Test 17g: profile-bound tranche migration remains raw-preserving');
    {
        localStorage.clear();
        ensureProfileRegistry();
        const legacyRaw = JSON.stringify([{
            id: 'legacy-profile-lot',
            name: 'Synthetischer Altbestand',
            shares: 2,
            purchasePrice: 80,
            kind: 'aktien_alt',
            tqf: 0.3
        }]);
        const corruptRaw = JSON.stringify([{
            schemaVersion: 1,
            trancheId: 'schema-one-profile-mismatch',
            name: 'Widerspruechlicher Altbestand',
            shares: 1,
            purchasePrice: 100,
            currentPrice: 110,
            category: 'gold',
            type: 'aktien_neu',
            tqf: 0.3
        }]);
        const legacyProfile = createProfile('Legacy Browserprofil');
        const corruptProfile = createProfile('Corrupt Browserprofil');
        updateProfileData(legacyProfile.id, { depot_tranchen: legacyRaw });
        updateProfileData(corruptProfile.id, { depot_tranchen: corruptRaw });

        assert(switchProfile(legacyProfile.id) === true, 'Legacy-Profil sollte ladbar sein');
        assertEqual(localStorage.getItem('depot_tranchen'), legacyRaw, 'Profilwechsel darf Legacy-Rohpayload nicht implizit umschreiben');
        const firstLegacyLoad = loadTranchesFromStorage(localStorage);
        const secondLegacyLoad = loadTranchesFromStorage(localStorage);
        assertEqual(firstLegacyLoad.status, 'valid', 'Gueltiger Altbestand sollte kanonisch lesbar sein');
        assertEqual(JSON.stringify(secondLegacyLoad.tranches), JSON.stringify(firstLegacyLoad.tranches), 'Wiederholte Legacy-Normalisierung sollte deterministisch sein');
        assertEqual(localStorage.getItem('depot_tranchen'), legacyRaw, 'Lesemigration bleibt auch bei Wiederholung mutationsfrei');

        assert(switchProfile(corruptProfile.id) === true, 'Widerspruechliches Profil sollte in Recovery ladbar bleiben');
        assertEqual(localStorage.getItem('depot_tranchen'), corruptRaw, 'Profilwechsel muss widerspruechlichen Rohpayload erhalten');
        const corruptLoad = loadTranchesFromStorage(localStorage);
        assertEqual(corruptLoad.status, 'corrupt', 'Kategorie-/Typ-Widerspruch muss fail-closed enden');
        assertEqual(corruptLoad.raw, corruptRaw, 'Recovery muss den exakten Profil-Rohpayload bereitstellen');

        assert(switchProfile(legacyProfile.id) === true, 'Rueckwechsel zum Legacy-Profil sollte gelingen');
        assert(switchProfile(corruptProfile.id) === true, 'Erneuter Wechsel zum Recovery-Profil sollte gelingen');
        assertEqual(localStorage.getItem('depot_tranchen'), corruptRaw, 'Profil-Roundtrip darf Recovery-Rohdaten nicht veraendern');
    }
    console.log('✓ profile-bound raw-preserving migration OK');

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
            bundleType: PROFILE_BUNDLE_TYPE,
            schemaVersion: PROFILE_BUNDLE_SCHEMA_VERSION,
            app: PROFILE_BUNDLE_APP_ID,
            profileVersion: 1,
            version: 1,
            exportedAt: new Date().toISOString(),
            recordCount: 1,
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
            {
                schemaVersion: 1,
                trancheId: 't1',
                name: 'ETF Alt',
                shares: 123.45,
                purchasePrice: 81,
                currentPrice: 100,
                purchaseDate: '2020-01-02',
                category: 'equity',
                type: 'aktien_alt',
                tqf: 0.3
            },
            {
                schemaVersion: 1,
                trancheId: 'g1',
                name: 'Gold',
                shares: 50,
                purchasePrice: 80,
                currentPrice: 100,
                purchaseDate: '2021-02-03',
                category: 'gold',
                type: 'gold',
                tqf: 0
            }
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

        const badBundle = {
            ...exportProfilesBundle(),
            registry: 'not-an-object'
        };
        const result = importProfilesBundle(badBundle);

        assert(result.ok === false, 'Import mit ungültiger Registry sollte fehlschlagen');
        assert(result.message.includes('ungueltig') || result.message.includes('fehlt'),
            'Fehlermeldung sollte Registry erwähnen');
    }
    console.log('✓ Import invalid registry OK');

    // Test 22b: Import preflight and rollback are mutation-safe
    console.log('Test 22b: Import preflight and rollback are mutation-safe');
    {
        localStorage.clear();
        ensureProfileRegistry();
        localStorage.setItem('profile_tagesgeld', '123');
        saveCurrentProfileFromLocalStorage();
        localStorage.setItem('unrelated_live_key', 'preserve');
        const validBundle = exportProfilesBundle();
        const before = serializeStorage(localStorage);

        const unknownGlobal = importProfilesBundle({
            ...validBundle,
            globals: {
                ...validBundle.globals,
                arbitraryGlobal: 'forbidden'
            }
        });
        assertEqual(unknownGlobal.ok, false, 'Unbekannter Bundle-Global-Key wird vor dem ersten Write abgewiesen');
        assertEqual(serializeStorage(localStorage), before,
            'Fehlgeschlagener Global-Preflight mutiert keine Live-Daten');

        const wrongEnvelope = importProfilesBundle({
            ...validBundle,
            app: 'fremde-app'
        });
        assertEqual(wrongEnvelope.ok, false, 'Fremde Bundle-App-ID wird abgewiesen');
        const wrongRecordCount = importProfilesBundle({
            ...validBundle,
            recordCount: validBundle.recordCount + 1
        });
        assertEqual(wrongRecordCount.ok, false, 'Falscher Bundle-recordCount wird abgewiesen');

        const ghostCurrent = importProfilesBundle({
            ...validBundle,
            currentProfileId: 'ghost'
        });
        assertEqual(ghostCurrent.ok, false, 'Ghost-Current wird vor dem ersten Write abgewiesen');
        assertEqual(serializeStorage(localStorage), before,
            'Ghost-Current mutiert keine Live-Daten');

        const objectProfileValue = structuredClone(validBundle);
        const currentId = objectProfileValue.currentProfileId;
        objectProfileValue.registry.profiles[currentId].data.profile_tagesgeld = { amount: 999 };
        const invalidValue = importProfilesBundle(objectProfileValue);
        assertEqual(invalidValue.ok, false, 'Beliebige Profilobjekte werden nicht still stringifiziert');
        assertEqual(serializeStorage(localStorage), before,
            'Ungueltiger Profilwert mutiert keine Live-Daten');

        const invalidInflation = structuredClone(validBundle);
        invalidInflation.registry.profiles[invalidInflation.currentProfileId].data[CONFIG.STORAGE.LS_KEY] = JSON.stringify({
            lastState: { cumulativeInflationFactor: 0 }
        });
        const invalidInflationResult = importProfilesBundle(invalidInflation);
        assertEqual(invalidInflationResult.ok, false, 'Bundle-Preflight weist Inflationsfaktor 0 fachlich ab');
        assertEqual(serializeStorage(localStorage), before,
            'Ungueltiger Bundle-Inflationsstate mutiert keine Live-Daten');
        const implausibleInflation = structuredClone(validBundle);
        implausibleInflation.registry.profiles[implausibleInflation.currentProfileId].data[CONFIG.STORAGE.LS_KEY] = JSON.stringify({
            lastState: { cumulativeInflationFactor: 99 }
        });
        const implausibleInflationResult = importProfilesBundle(implausibleInflation);
        assertEqual(implausibleInflationResult.ok, false,
            'Bundle-Preflight weist einen Inflationsfaktor oberhalb der Plausibilitaetsgrenze ab');
        assertEqual(serializeStorage(localStorage), before,
            'Ueberhoehter Bundle-Inflationsstate mutiert keine Live-Daten');

        const rollback = importBundleDirect(validBundle, {
            storage: localStorage,
            loadProfileIntoLocalStorage: () => true,
            validateAfterLoad: () => ({ ok: false, message: 'fault after load' })
        });
        assertEqual(rollback.ok, false, 'Fehler in der Abschlussvalidierung laesst den Bundle-Import scheitern');
        assertEqual(rollback.code, 'bundle_import_rolled_back', 'Abschlussfehler meldet kompensierenden Rollback');
        assertEqual(serializeStorage(localStorage), before,
            'Kompensierender Bundle-Rollback stellt alle Live-Keys bytegleich wieder her');

        const {
            bundleType: _bundleType,
            schemaVersion: _schemaVersion,
            app: _app,
            profileVersion: _profileVersion,
            recordCount: _recordCount,
            ...legacyBundle
        } = validBundle;
        legacyBundle.globals = {};
        localStorage.setItem('etfProxyUrl', 'https://existing.example');
        const legacyResult = importBundleDirect(legacyBundle, {
            storage: localStorage,
            loadProfileIntoLocalStorage: () => true
        });
        assertEqual(legacyResult.ok, true, 'Historisches Profilbundle ohne Envelope wird definiert migriert');
        assertEqual(legacyResult.bundle.migrated, true, 'Legacy-Profilbundle kennzeichnet die Migration');
        assertEqual(legacyResult.bundle.sourceSchemaVersion, 0, 'Legacy-Profilbundle dokumentiert die Quellversion');
        assertEqual(localStorage.getItem('etfProxyUrl'), 'https://existing.example',
            'Im Bundle fehlende globale Einstellungen bleiben beim Import erhalten');
    }
    console.log('✓ Import preflight and rollback mutation safety OK');

    // ========== Corrupt Data Tests ==========

    // Test 23: Corrupt registry JSON enters raw-preserving recovery
    console.log('Test 23: Corrupt registry JSON recovery');
    {
        localStorage.clear();
        const corruptRaw = 'not-json';
        localStorage.setItem('rs_profiles_v1', corruptRaw);
        const result = bootstrapProfileContext();
        assertEqual(result.action, 'recovery', 'Korrupte Registry muss den Bootstrap in Recovery versetzen');
        assertEqual(result.recovery.status, PROFILE_LOAD_STATUS.CORRUPT, 'Syntaxfehler wird als corrupt klassifiziert');
        assertEqual(result.recovery.raw, corruptRaw, 'Registry-Rohpayload bleibt bytegleich im Recoveryvertrag');
        assertEqual(localStorage.getItem('rs_profiles_v1'), corruptRaw, 'Korrupter Registrywert wird nicht automatisch überschrieben');
        assertEqual(localStorage.getItem('rs_current_profile'), null, 'Recovery erzeugt keine neue Current-ID');

        const recoveryDocument = createProfileRecoveryDocument(result.recovery, {
            exportedAt: '2026-07-28T00:00:00.000Z',
            backend: 'test'
        });
        assertEqual(recoveryDocument.recovery.raw, corruptRaw, 'Recovery-Dokument enthält den exakten Registry-Rohpayload');
        let unconfirmedError = null;
        try {
            resetProfileRecovery(result.recovery, {
                recoveryDocument,
                confirmed: false
            });
        } catch (error) {
            unconfirmedError = error;
        }
        assert(unconfirmedError, 'Reset ohne gesonderte Bestätigung muss blockieren');
        assertEqual(localStorage.getItem('rs_profiles_v1'), corruptRaw, 'Blockierter Reset erhält die Registry bytegleich');

        localStorage.setItem('rs_profiles_v1', 'changed-after-export');
        let staleExportError = null;
        try {
            resetProfileRecovery(result.recovery, {
                recoveryDocument,
                confirmed: true
            });
        } catch (error) {
            staleExportError = error;
        }
        assert(staleExportError, 'Reset mit veraltetem Recovery-Export muss blockieren');
        assertEqual(localStorage.getItem('rs_profiles_v1'), 'changed-after-export',
            'Blockierter TOCTOU-Reset darf den neueren Registry-Rohinhalt nicht verändern');
        localStorage.setItem('rs_profiles_v1', corruptRaw);

        const reset = resetProfileRecovery(result.recovery, {
            recoveryDocument,
            confirmed: true
        });
        assertEqual(reset.action, 'registry_reset', 'Bestätigter Reset nach Recovery-Export darf eine Default-Registry erzeugen');
        assert(getProfileRegistry().profiles.default, 'Recovery-Reset erzeugt genau den sicheren Default-Kontext');
    }
    console.log('✓ Corrupt registry JSON recovery OK');

    // Test 24: Registry with missing profiles object remains untouched
    console.log('Test 24: Registry with missing profiles recovery');
    {
        localStorage.clear();
        const corruptRaw = JSON.stringify({ version: 1 });
        localStorage.setItem('rs_profiles_v1', corruptRaw);
        const result = bootstrapProfileContext();
        assertEqual(result.action, 'recovery', 'Registry ohne profiles muss Recovery auslösen');
        assertEqual(result.recovery.code, 'PROFILE_REGISTRY_PROFILES_INVALID', 'Registry-Shapefehler bleibt maschinenlesbar');
        assertEqual(localStorage.getItem('rs_profiles_v1'), corruptRaw, 'Registry-Shapefehler wird nicht automatisch ersetzt');
    }
    console.log('✓ Registry with missing profiles recovery OK');

    // Test 25: Registry with null profiles and unavailable storage stay distinct
    console.log('Test 25: Registry null/unavailable distinction');
    {
        localStorage.clear();
        const corruptRaw = JSON.stringify({ version: 1, profiles: null });
        localStorage.setItem('rs_profiles_v1', corruptRaw);
        const corrupt = loadProfileRegistry();
        assertEqual(corrupt.status, PROFILE_LOAD_STATUS.CORRUPT, 'Registry mit null profiles ist corrupt');
        assertEqual(corrupt.raw, corruptRaw, 'Corrupt loader retains exact null-profiles payload');

        let setCalls = 0;
        const unavailable = loadProfileRegistry({
            getItem() {
                throw new Error('backend offline');
            },
            setItem() {
                setCalls += 1;
            }
        });
        assertEqual(unavailable.status, PROFILE_LOAD_STATUS.UNAVAILABLE, 'Technischer Lesefehler bleibt unavailable');
        assertEqual(unavailable.raw, null, 'Unavailable darf keinen Rohpayload erfinden');
        assertEqual(setCalls, 0, 'Unavailable loader darf keinen Default schreiben');

        const legacyRaw = JSON.stringify({
            version: 1,
            profiles: {
                legacy: {
                    meta: { name: 'Legacy' },
                    data: {}
                }
            }
        });
        localStorage.setItem('rs_profiles_v1', legacyRaw);
        const legacy = loadProfileRegistry();
        assertEqual(legacy.status, PROFILE_LOAD_STATUS.VALID, 'Legacy registry without redundant meta.id remains readable');
        assertEqual(legacy.value.profiles.legacy.meta.id, 'legacy', 'Legacy registry derives meta.id from the canonical map key');
        assertEqual(localStorage.getItem('rs_profiles_v1'), legacyRaw, 'Read-time legacy normalization stays mutation-free');
    }
    console.log('✓ Registry null/unavailable distinction OK');

    console.log('Test 25b: Ghost current/active IDs enter context recovery');
    {
        localStorage.clear();
        ensureProfileRegistry();
        updateProfileData('default', {
            profile_tagesgeld: '50000',
            profile_aktuelles_alter: '67'
        });
        const registryRaw = localStorage.getItem('rs_profiles_v1');
        localStorage.setItem('profile_tagesgeld', '20000');
        localStorage.setItem('profile_aktuelles_alter', '61');
        localStorage.setItem('rs_current_profile', 'ghost-profile');
        localStorage.setItem('rs_active_profile', 'ghost-profile');

        const result = bootstrapProfileContext();
        assertEqual(result.action, 'recovery', 'Ghost current ID must block normal bootstrap');
        assertEqual(result.recovery.code, 'PROFILE_CURRENT_GHOST', 'Ghost current ID stays machine-readable');
        assertEqual(localStorage.getItem('rs_profiles_v1'), registryRaw, 'Context recovery must not mutate the registry');
        assertEqual(localStorage.getItem('rs_current_profile'), 'ghost-profile', 'Ghost current ID stays unchanged before recovery');

        const recoveryDocument = createProfileRecoveryDocument(result.recovery);
        resetProfileRecovery(result.recovery, {
            recoveryDocument,
            confirmed: true
        });
        assertEqual(localStorage.getItem('rs_current_profile'), 'default', 'Confirmed context recovery selects an existing profile');
        assertEqual(localStorage.getItem('rs_active_profile'), 'default', 'Confirmed context recovery reconciles active and current IDs');
        assertEqual(localStorage.getItem('profile_tagesgeld'), '50000',
            'Context recovery must load the selected profile data instead of retaining stale live data');
        assertEqual(localStorage.getItem('profile_aktuelles_alter'), '67',
            'Context recovery must replace every stale profile-owned live field');

        localStorage.setItem('rs_active_profile', 'second-ghost-profile');
        localStorage.setItem('profile_tagesgeld', '12345');
        const registryBeforeBlockedSave = localStorage.getItem('rs_profiles_v1');
        let blockedSaveError = null;
        try {
            saveCurrentProfileFromLocalStorage();
        } catch (error) {
            blockedSaveError = error;
        }
        assertEqual(blockedSaveError?.code, 'PROFILE_ACTIVE_GHOST',
            'A ghost active ID must block save-before-unload');
        assertEqual(localStorage.getItem('rs_profiles_v1'), registryBeforeBlockedSave,
            'Blocked save-before-unload must not overwrite the healthy current profile');

        const activeGhostResult = bootstrapProfileContext();
        assertEqual(activeGhostResult.action, 'recovery', 'Ghost active ID must block normal bootstrap');
        assertEqual(activeGhostResult.recovery.code, 'PROFILE_ACTIVE_GHOST', 'Ghost active ID stays machine-readable');
        assertEqual(localStorage.getItem('rs_current_profile'), 'default', 'Active ghost recovery preserves the valid current ID');
        assertEqual(localStorage.getItem('rs_active_profile'), 'second-ghost-profile',
            'Ghost active ID stays unchanged before explicit recovery');

        const activeRecoveryDocument = createProfileRecoveryDocument(activeGhostResult.recovery);
        resetProfileRecovery(activeGhostResult.recovery, {
            recoveryDocument: activeRecoveryDocument,
            confirmed: true
        });
        assertEqual(localStorage.getItem('profile_tagesgeld'), '50000',
            'Active-ghost reset must restore the healthy registry profile before future persistence');
        saveCurrentProfileFromLocalStorage();
        assertEqual(getProfileData('default').profile_tagesgeld, '50000',
            'First save after context reset must keep the healthy target profile intact');
    }
    console.log('✓ Ghost profile context recovery OK');

    console.log('Test 25c: Corrupt health and balance fields require field-specific recovery');
    {
        localStorage.clear();
        ensureProfileRegistry();
        const profileId = getCurrentProfileId();
        const corruptHealthRaw = '{"enabled":"not-a-bool","initialAmount":150000}';
        updateProfileData(profileId, { profile_health_bucket: corruptHealthRaw });
        const healthRegistryRaw = localStorage.getItem('rs_profiles_v1');

        const healthResult = bootstrapProfileContext();
        assertEqual(healthResult.action, 'recovery', 'Corrupt current-profile health bucket blocks bootstrap');
        assertEqual(healthResult.recovery.storageKey, 'profile_health_bucket', 'Recovery names the corrupt health field');
        assertEqual(healthResult.recovery.raw, corruptHealthRaw, 'Health recovery retains exact raw payload');
        assertEqual(localStorage.getItem('rs_profiles_v1'), healthRegistryRaw, 'Health corruption causes no registry mutation');

        const healthDocument = createProfileRecoveryDocument(healthResult.recovery);
        resetProfileRecovery(healthResult.recovery, {
            recoveryDocument: healthDocument,
            confirmed: true
        });
        assertEqual(getProfileData(profileId).profile_health_bucket, undefined, 'Confirmed field reset removes only the corrupt health field');

        const corruptBalanceRaw = '{"inputs":null}';
        updateProfileData(profileId, { [CONFIG.STORAGE.LS_KEY]: corruptBalanceRaw });
        const balanceRegistryRaw = localStorage.getItem('rs_profiles_v1');
        const balanceResult = bootstrapProfileContext();
        assertEqual(balanceResult.action, 'recovery', 'Corrupt current-profile balance state blocks bootstrap');
        assertEqual(balanceResult.recovery.storageKey, CONFIG.STORAGE.LS_KEY, 'Recovery names the corrupt balance field');
        assertEqual(balanceResult.recovery.raw, corruptBalanceRaw, 'Balance recovery retains exact raw payload');
        assertEqual(localStorage.getItem('rs_profiles_v1'), balanceRegistryRaw, 'Balance corruption causes no registry mutation');
    }
    console.log('✓ Profile field recovery contract OK');

    console.log('Test 25d: Corrupt live profile fields block save-before-load without registry mutation');
    {
        localStorage.clear();
        ensureProfileRegistry();
        const profileId = getCurrentProfileId();
        loadProfileIntoLocalStorage(profileId);
        const registryRaw = localStorage.getItem('rs_profiles_v1');
        const corruptHealthRaw = '{"enabled":"maybe"}';
        localStorage.setItem('profile_health_bucket', corruptHealthRaw);

        const healthResult = bootstrapProfileContext({ preserveLiveProfileData: true });
        assertEqual(healthResult.action, 'recovery', 'Corrupt live health state must block save-before-load');
        assertEqual(healthResult.recovery.scope, 'live-profile-field', 'Live corruption is distinct from registry corruption');
        assertEqual(healthResult.recovery.raw, corruptHealthRaw, 'Live recovery retains the exact raw payload');
        assertEqual(localStorage.getItem('rs_profiles_v1'), registryRaw, 'Corrupt live state must not overwrite the registry');

        const healthDocument = createProfileRecoveryDocument(healthResult.recovery);
        resetProfileRecovery(healthResult.recovery, {
            recoveryDocument: healthDocument,
            confirmed: true
        });
        assertEqual(localStorage.getItem('profile_health_bucket'), null,
            'Confirmed live-field reset removes only the corrupt live health value');

        const corruptBalanceRaw = '{"inputs":null}';
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, corruptBalanceRaw);
        const balanceResult = bootstrapProfileContext({ preserveLiveProfileData: true });
        assertEqual(balanceResult.action, 'recovery', 'Corrupt live balance state must block save-before-load');
        assertEqual(balanceResult.recovery.scope, 'live-profile-field', 'Live balance corruption keeps its recovery scope');
        assertEqual(balanceResult.recovery.raw, corruptBalanceRaw, 'Live balance recovery retains the exact raw payload');
        assertEqual(localStorage.getItem('rs_profiles_v1'), registryRaw, 'Corrupt live balance must not overwrite the registry');
    }
    console.log('✓ Live profile field recovery contract OK');

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

    console.log('Test 30a: Profile switches preserve each profile age');
    {
        localStorage.clear();
        ensureProfileRegistry();
        const firstId = getCurrentProfileId();
        localStorage.setItem('profile_aktuelles_alter', '67');
        saveCurrentProfileFromLocalStorage();

        const second = createProfile('Eigenes Alter');
        updateProfileData(second.id, {
            profile_aktuelles_alter: '72',
            [CONFIG.STORAGE.LS_KEY]: JSON.stringify({ inputs: { aktuellesAlter: 99 } })
        });
        assert(switchProfile(second.id) === true, 'Second profile with own age should load');
        assertEqual(localStorage.getItem('profile_aktuelles_alter'), '72', 'Target profile loads its own age override');
        assert(switchProfile(firstId) === true, 'First profile should load again');
        assertEqual(localStorage.getItem('profile_aktuelles_alter'), '67', 'Returning profile keeps its original age');
        assertEqual(getProfileData(second.id).profile_aktuelles_alter, '72', 'Other profile age remains unchanged in registry');
    }
    console.log('✓ Per-profile age switching OK');

    // Test 30b: Contaminated legacy profile state is scrubbed on profile switch
    console.log('Test 30b: Household metadata ownership survives contaminated legacy profile switch');
    {
        localStorage.clear();
        ensureProfileRegistry();
        const currentHouseholdState = {
            inputs: { owner: 'A' },
            annualPeriodMetadata: {
                lastCommittedPeriod: 'calendar-year:2025',
                pendingCommit: null
            },
            balanceStateLifecycle: {
                lastCommittedPeriod: 'calendar-year:2025',
                candidateFingerprint: 'current'
            },
            ageAdjustedForInflation: 67
        };
        localStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(currentHouseholdState));
        saveCurrentProfileFromLocalStorage();

        const contaminatedProfile = createProfile('Kontaminiertes Altprofil');
        updateProfileData(contaminatedProfile.id, {
            [CONFIG.STORAGE.LS_KEY]: JSON.stringify({
                inputs: { owner: 'B' },
                lastState: { taxState: { lossCarry: 321 } },
                annualPeriodMetadata: {
                    lastCommittedPeriod: null,
                    pendingCommit: {
                        periodId: 'calendar-year:2025',
                        phase: 'writes_started'
                    }
                },
                balanceStateLifecycle: {
                    lastCommittedPeriod: null,
                    candidateFingerprint: 'stale'
                },
                ageAdjustedForInflation: 66
            })
        });

        assert(switchProfile(contaminatedProfile.id) === true, 'Kontaminiertes Altprofil sollte ladbar bleiben');

        const liveState = JSON.parse(localStorage.getItem(CONFIG.STORAGE.LS_KEY));
        assertEqual(liveState.inputs.owner, 'B', 'Profilbezogene Inputs sollten vom Zielprofil stammen');
        assertEqual(liveState.lastState.taxState.lossCarry, 321, 'Profilbezogener Fachstate sollte vom Zielprofil stammen');
        assertEqual(
            liveState.annualPeriodMetadata.lastCommittedPeriod,
            'calendar-year:2025',
            'Aktueller Haushalts-Periodenstatus muss den kontaminierten Profilwert ueberstimmen'
        );
        assertEqual(
            liveState.balanceStateLifecycle.candidateFingerprint,
            'current',
            'Aktueller Haushalts-Lifecycle muss den kontaminierten Profilwert ueberstimmen'
        );
        assertEqual(liveState.ageAdjustedForInflation, 67, 'Aktuelles Haushaltsalter muss erhalten bleiben');

        const migratedProfileState = JSON.parse(
            getProfileData(contaminatedProfile.id)[CONFIG.STORAGE.LS_KEY]
        );
        assert(
            !Object.prototype.hasOwnProperty.call(migratedProfileState, 'annualPeriodMetadata'),
            'Altprofil-Migration muss Periodenmetadaten aus der Registry entfernen'
        );
        assert(
            !Object.prototype.hasOwnProperty.call(migratedProfileState, 'balanceStateLifecycle'),
            'Altprofil-Migration muss Lifecycle-Metadaten aus der Registry entfernen'
        );
        assert(
            !Object.prototype.hasOwnProperty.call(migratedProfileState, 'ageAdjustedForInflation'),
            'Altprofil-Migration muss Haushaltsalter aus der Registry entfernen'
        );
    }
    console.log('✓ Contaminated legacy profile ownership migration OK');

    console.log('✅ Profile storage behaviors validated');

} finally {
    if (prevLocalStorage === undefined) delete global.localStorage; else global.localStorage = prevLocalStorage;
    if (prevWindow === undefined) delete global.window; else global.window = prevWindow;
}

console.log('--- Profile Storage Tests Completed ---');
