// @ts-check

import { PROFILE_STORAGE_KEYS } from './profile-state.js';
import { PROFILE_VERSION, getProfileRegistry } from './profile-registry.js';
import { loadProfileDataIntoLocalStorage } from './profile-live-storage.js';
import { persistenceStorage } from '../shared/persistence-facade.js';
import { validatePersistenceDomainRecords } from '../shared/persistence-backup.js';
import { isAllowedPersistenceImportKey } from '../shared/persistence-key-policy.js';

export const WINDOW_NAME_BUNDLE_PREFIX = 'RUHESTAND_PROFILE_BUNDLE:';
export const PROFILE_BUNDLE_TYPE = 'ruhestand-suite-profile-bundle';
export const PROFILE_BUNDLE_APP_ID = 'ruhestand-suite';
export const PROFILE_BUNDLE_SCHEMA_VERSION = 1;

const PROFILE_STORAGE_KEY = PROFILE_STORAGE_KEYS.registry;
const CURRENT_PROFILE_KEY = PROFILE_STORAGE_KEYS.current;
const ACTIVE_PROFILE_KEY = PROFILE_STORAGE_KEYS.active;
export const PROFILE_BUNDLE_GLOBAL_KEYS = Object.freeze([
    'etfProxyUrl',
    'etfProxyUrls',
    'enableWorkerTelemetry'
]);
const PROFILE_BUNDLE_GLOBAL_KEY_SET = new Set(PROFILE_BUNDLE_GLOBAL_KEYS);

function nowIso() {
    return new Date().toISOString();
}

function isPlainRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function collectStorageSnapshot(storage) {
    const records = Object.create(null);
    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (!key) continue;
        const value = storage.getItem(key);
        if (value !== null && value !== undefined) records[String(key)] = String(value);
    }
    return records;
}

function recordsMatch(left, right) {
    const leftKeys = Object.keys(left || {}).sort();
    const rightKeys = Object.keys(right || {}).sort();
    return leftKeys.length === rightKeys.length
        && leftKeys.every((key, index) => key === rightKeys[index] && left[key] === right[key]);
}

function restoreStorageSnapshot(storage, snapshot) {
    const snapshotKeys = new Set(Object.keys(snapshot));
    const currentKeys = [];
    for (let index = 0; index < storage.length; index += 1) {
        const key = storage.key(index);
        if (key) currentKeys.push(String(key));
    }
    currentKeys.forEach(key => {
        if (!snapshotKeys.has(key)) storage.removeItem(key);
    });
    Object.entries(snapshot).forEach(([key, value]) => {
        storage.setItem(key, value);
    });
    const confirmed = collectStorageSnapshot(storage);
    if (!recordsMatch(snapshot, confirmed)) {
        throw new Error('Der Profilbundle-Rollback ist nicht bytegleich zum vorherigen Storagebestand.');
    }
}

function asBundleRecords(registry, currentProfileId, globals) {
    const records = Object.create(null);
    records[PROFILE_STORAGE_KEY] = JSON.stringify(registry);
    records[CURRENT_PROFILE_KEY] = currentProfileId;
    records[ACTIVE_PROFILE_KEY] = currentProfileId;
    Object.entries(globals).forEach(([key, value]) => {
        records[key] = value;
    });
    return records;
}

export function normalizeProfilesBundle(bundle) {
    if (!isPlainRecord(bundle)) {
        return { ok: false, code: 'bundle_invalid', message: 'Ungueltige Import-Datei.' };
    }
    const isLegacyBundle = bundle.bundleType === undefined
        && bundle.app === undefined
        && bundle.schemaVersion === undefined
        && bundle.profileVersion === undefined
        && bundle.version === PROFILE_VERSION
        && isPlainRecord(bundle.registry)
        && isPlainRecord(bundle.globals);
    const candidate = isLegacyBundle
        ? {
            ...bundle,
            bundleType: PROFILE_BUNDLE_TYPE,
            app: PROFILE_BUNDLE_APP_ID,
            schemaVersion: PROFILE_BUNDLE_SCHEMA_VERSION,
            profileVersion: bundle.version,
            recordCount: Object.keys(bundle.registry?.profiles || {}).length
        }
        : bundle;

    if (candidate.bundleType !== PROFILE_BUNDLE_TYPE) {
        return { ok: false, code: 'bundle_type_invalid', message: 'Die Datei ist kein Ruhestand-Suite-Profilbundle.' };
    }
    if (candidate.app !== PROFILE_BUNDLE_APP_ID) {
        return { ok: false, code: 'bundle_app_invalid', message: 'Das Profilbundle gehoert nicht zur Ruhestand-Suite.' };
    }
    if (candidate.schemaVersion !== PROFILE_BUNDLE_SCHEMA_VERSION) {
        return {
            ok: false,
            code: 'bundle_schema_unsupported',
            message: `Profilbundle-Schema ${String(candidate.schemaVersion)} wird nicht unterstuetzt.`
        };
    }
    if (candidate.profileVersion !== PROFILE_VERSION || candidate.version !== PROFILE_VERSION) {
        return {
            ok: false,
            code: 'bundle_profile_version_unsupported',
            message: `Profilversion ${String(candidate.profileVersion ?? candidate.version)} wird nicht unterstuetzt.`
        };
    }
    if (typeof candidate.exportedAt !== 'string' || !Number.isFinite(new Date(candidate.exportedAt).getTime())) {
        return { ok: false, code: 'bundle_timestamp_invalid', message: 'Der Exportzeitpunkt des Profilbundles ist ungueltig.' };
    }
    if (!isPlainRecord(candidate.registry) || !isPlainRecord(candidate.registry.profiles)) {
        return { ok: false, code: 'bundle_registry_invalid', message: 'Registry fehlt oder ist ungueltig.' };
    }
    const profileCount = Object.keys(candidate.registry.profiles).length;
    if (!Number.isInteger(candidate.recordCount) || candidate.recordCount !== profileCount) {
        return {
            ok: false,
            code: 'bundle_record_count_mismatch',
            message: `Profilbundle recordCount ${String(candidate.recordCount)} passt nicht zu ${profileCount} Profilen.`
        };
    }
    if (typeof candidate.currentProfileId !== 'string' || !candidate.currentProfileId) {
        return { ok: false, code: 'bundle_current_profile_invalid', message: 'Die aktuelle Profil-ID fehlt.' };
    }
    if (!isPlainRecord(candidate.globals)) {
        return { ok: false, code: 'bundle_globals_invalid', message: 'Die globalen Profilwerte sind ungueltig.' };
    }

    const globals = Object.create(null);
    for (const [key, value] of Object.entries(candidate.globals)) {
        if (!PROFILE_BUNDLE_GLOBAL_KEY_SET.has(key)) {
            return { ok: false, code: 'bundle_global_key_invalid', message: `Globaler Profil-Key ${key} ist nicht erlaubt.` };
        }
        if (typeof value !== 'string') {
            return { ok: false, code: 'bundle_global_value_invalid', message: `Globaler Profilwert ${key} muss als String vorliegen.` };
        }
        globals[key] = value;
    }

    let records;
    try {
        records = asBundleRecords(candidate.registry, candidate.currentProfileId, globals);
    } catch (error) {
        return { ok: false, code: 'bundle_registry_not_serializable', message: 'Die Profilregistry ist nicht serialisierbar.', error };
    }
    const domainValidation = validatePersistenceDomainRecords(records, {
        requireProfileContext: true
    });
    if (!domainValidation.ok) {
        return {
            ok: false,
            code: domainValidation.code || 'bundle_domain_invalid',
            message: domainValidation.message,
            error: domainValidation.error
        };
    }
    return {
        ok: true,
        bundle: {
            ...candidate,
            globals,
            recordCount: profileCount,
            sourceSchemaVersion: isLegacyBundle ? 0 : PROFILE_BUNDLE_SCHEMA_VERSION,
            migrated: isLegacyBundle
        },
        records
    };
}

function loadProfileFromRegistryIntoStorage(id, storage = persistenceStorage) {
    const registry = getProfileRegistry(storage);
    const profile = registry.profiles[id];
    if (!profile) return false;
    loadProfileDataIntoLocalStorage(profile.data, storage);
    storage.setItem(ACTIVE_PROFILE_KEY, id);
    return true;
}

export function exportProfilesBundle(options = {}) {
    const {
        storage = persistenceStorage,
        saveCurrentProfile = null
    } = options;

    if (typeof saveCurrentProfile === 'function') {
        saveCurrentProfile();
    }

    const registry = getProfileRegistry(storage);
    const currentProfileId = storage.getItem(CURRENT_PROFILE_KEY) || 'default';
    const globals = {};
    PROFILE_BUNDLE_GLOBAL_KEYS.forEach(key => {
        const val = storage.getItem(key);
        if (val !== null && val !== undefined) {
            globals[key] = val;
        }
    });

    return {
        bundleType: PROFILE_BUNDLE_TYPE,
        schemaVersion: PROFILE_BUNDLE_SCHEMA_VERSION,
        app: PROFILE_BUNDLE_APP_ID,
        profileVersion: PROFILE_VERSION,
        version: PROFILE_VERSION,
        exportedAt: nowIso(),
        recordCount: Object.keys(registry.profiles || {}).length,
        registry,
        currentProfileId,
        globals
    };
}

export function exportProfilesBundleToWindowName(options = {}) {
    const {
        windowRef = typeof window === 'undefined' ? null : window,
        ...bundleOptions
    } = options;
    if (!windowRef) return false;
    try {
        const bundle = exportProfilesBundle(bundleOptions);
        windowRef.name = WINDOW_NAME_BUNDLE_PREFIX + JSON.stringify(bundle);
        return true;
    } catch (err) {
        console.error('[ProfileStorage] Export to window.name failed:', err);
        return false;
    }
}

export function importProfilesBundle(bundle, options = {}) {
    const {
        storage = persistenceStorage,
        loadProfileIntoLocalStorage = (id) => loadProfileFromRegistryIntoStorage(id, storage)
    } = options;

    const normalized = normalizeProfilesBundle(bundle);
    if (!normalized.ok) return normalized;
    const nextBundle = normalized.bundle;
    let previousRecords;
    try {
        previousRecords = collectStorageSnapshot(storage);
    } catch (err) {
        return {
            ok: false,
            code: 'bundle_live_snapshot_failed',
            message: 'Der aktuelle Profilbestand konnte vor dem Import nicht gesichert werden.',
            error: err
        };
    }

    try {
        const nextProfileId = nextBundle.currentProfileId;
        storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(nextBundle.registry));
        storage.setItem(CURRENT_PROFILE_KEY, nextProfileId);
        storage.setItem(ACTIVE_PROFILE_KEY, nextProfileId);
        Object.entries(nextBundle.globals).forEach(([key, value]) => {
            storage.setItem(key, value);
        });

        const loaded = loadProfileIntoLocalStorage(nextProfileId);
        if (!loaded) {
            throw new Error('Profil konnte nach dem Schreiben nicht geladen werden.');
        }
        const postLoadRecords = collectStorageSnapshot(storage);
        const allowedPostLoadRecords = Object.fromEntries(
            Object.entries(postLoadRecords).filter(([key]) => isAllowedPersistenceImportKey(key))
        );
        const postLoadValidation = validatePersistenceDomainRecords(allowedPostLoadRecords, {
            requireProfileContext: true
        });
        if (!postLoadValidation.ok) {
            throw new Error(postLoadValidation.message);
        }
        if (typeof options.validateAfterLoad === 'function') {
            const result = options.validateAfterLoad({
                bundle: nextBundle,
                records: postLoadRecords
            });
            if (result === false || result?.ok === false) {
                throw new Error(result?.message || 'Die Profilbundle-Abschlussvalidierung ist fehlgeschlagen.');
            }
        }
        return { ok: true, message: 'Import erfolgreich.', bundle: nextBundle };
    } catch (err) {
        let rollbackError = null;
        try {
            restoreStorageSnapshot(storage, previousRecords);
        } catch (error) {
            rollbackError = error;
        }
        console.error('[ProfileStorage] Import fehlgeschlagen:', err);
        return {
            ok: false,
            code: rollbackError ? 'rollback_failed' : 'bundle_import_rolled_back',
            message: rollbackError
                ? 'Profilimport fehlgeschlagen; auch der vorherige Storagebestand konnte nicht vollstaendig wiederhergestellt werden.'
                : 'Profilimport fehlgeschlagen; der vorherige Storagebestand wurde wiederhergestellt.',
            error: err,
            rollbackError
        };
    }
}

export function importProfilesBundleFromWindowName(options = {}) {
    const {
        windowRef = typeof window === 'undefined' ? null : window,
        ...importOptions
    } = options;
    if (!windowRef) {
        return { ok: false, message: 'window not available' };
    }
    const raw = String(windowRef.name || '');
    if (!raw.startsWith(WINDOW_NAME_BUNDLE_PREFIX)) {
        return { ok: false, message: 'No bundle in window.name' };
    }
    try {
        const payload = JSON.parse(raw.slice(WINDOW_NAME_BUNDLE_PREFIX.length));
        return importProfilesBundle(payload, importOptions);
    } catch (err) {
        console.error('[ProfileStorage] Import from window.name failed:', err);
        return { ok: false, message: 'window.name bundle invalid' };
    }
}
