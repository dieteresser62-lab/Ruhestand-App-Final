/**
 * Module: Profile Storage
 * Purpose: Manages the storage and lifecycle of User Profiles (CRUD operations).
 *          Handles creating, renaming, deleting profiles, and Import/Export functionality.
 * Usage: Used by profilverbund-balance.js and balance-binder.js for profile management.
 * Dependencies: profile-registry.js, profile-key-policy.js, profile-live-storage.js, profile-bundle-io.js
 */
// @ts-check

import {
    PROFILE_HEALTH_BUCKET_KEY,
    PROFILE_LOAD_STATUS,
    PROFILE_STORAGE_KEYS,
    loadProfileHealthBucketFromData,
    loadStoredBalanceStateFromData
} from './profile-state.js';
import { persistenceStorage } from '../shared/persistence-facade.js';
import {
    exportProfilesBundle as exportProfilesBundleFromIo,
    exportProfilesBundleToWindowName as exportProfilesBundleToWindowNameFromIo,
    importProfilesBundle as importProfilesBundleFromIo,
    importProfilesBundleFromWindowName as importProfilesBundleFromWindowNameFromIo
} from './profile-bundle-io.js';
import {
    captureProfileData as captureLiveProfileData,
    hasProfileScopedDataInLocalStorage,
    loadProfileDataIntoLocalStorage
} from './profile-live-storage.js';
import {
    ProfileRegistryError,
    createProfile as createProfileInRegistry,
    deleteProfile as deleteProfileFromRegistry,
    ensureDefaultProfile,
    getCurrentProfileId as getCurrentProfileIdFromRegistry,
    getProfileData as getProfileDataFromRegistry,
    getProfileMeta as getProfileMetaFromRegistry,
    loadProfileRegistry,
    listProfiles as listProfilesFromRegistry,
    renameProfile as renameProfileInRegistry,
    replaceProfileData,
    saveProfileRegistry,
    setCurrentProfileId as setCurrentProfileIdInRegistry,
    setProfileVerbundMembership as setProfileVerbundMembershipInRegistry,
    updateProfileData as updateProfileDataInRegistry
} from './profile-registry.js';
import { CONFIG } from '../balance/balance-config.js';

export const HOUSEHOLD_OWNED_BALANCE_STATE_KEYS = Object.freeze([
    'annualPeriodMetadata',
    'balanceStateLifecycle',
    'ageAdjustedForInflation',
    'annualMarketDataMeta',
    'capeMeta'
]);

function parseBalanceState(raw) {
    if (raw === null || raw === undefined || raw === '') return null;
    if (raw && typeof raw === 'object' && !Array.isArray(raw)) return raw;
    try {
        const parsed = JSON.parse(String(raw));
        return parsed && typeof parsed === 'object' && !Array.isArray(parsed)
            ? parsed
            : null;
    } catch {
        return null;
    }
}

export function createProfileOwnedBalanceState(state = {}) {
    const profileState = { ...state };
    HOUSEHOLD_OWNED_BALANCE_STATE_KEYS.forEach(key => {
        delete profileState[key];
    });
    return profileState;
}

function createHouseholdOwnedBalanceState(state = {}) {
    return Object.fromEntries(
        HOUSEHOLD_OWNED_BALANCE_STATE_KEYS
            .filter(key => Object.prototype.hasOwnProperty.call(state, key))
            .map(key => [key, state[key]])
    );
}

function sanitizeStoredProfileBalanceState(raw) {
    const parsed = parseBalanceState(raw);
    if (!parsed) return { raw, changed: false };
    const changed = HOUSEHOLD_OWNED_BALANCE_STATE_KEYS.some(
        key => Object.prototype.hasOwnProperty.call(parsed, key)
    );
    return {
        raw: changed ? JSON.stringify(createProfileOwnedBalanceState(parsed)) : raw,
        changed
    };
}

function sanitizeProfileDataBalanceOwnership(data) {
    if (!data || typeof data !== 'object') return data;
    const key = CONFIG.STORAGE.LS_KEY;
    if (!Object.prototype.hasOwnProperty.call(data, key)) return data;
    const sanitized = sanitizeStoredProfileBalanceState(data[key]);
    if (!sanitized.changed) return data;
    return {
        ...data,
        [key]: sanitized.raw
    };
}

function captureProfileData() {
    return sanitizeProfileDataBalanceOwnership(captureLiveProfileData());
}

const PROFILE_STORAGE_KEY = PROFILE_STORAGE_KEYS.registry;
const ACTIVE_PROFILE_KEY = PROFILE_STORAGE_KEYS.active;
const CURRENT_PROFILE_KEY = PROFILE_STORAGE_KEYS.current;
export const PROFILE_RECOVERY_SCHEMA = 'ruhestand-profile-recovery';
export const PROFILE_RECOVERY_SCHEMA_VERSION = 1;
let lastProfileBootstrapResult = null;

export class ProfileRecoveryError extends Error {
    constructor(recovery, cause = null) {
        super(recovery?.message || 'Profildaten konnten nicht sicher geladen werden.');
        this.name = 'ProfileRecoveryError';
        this.code = recovery?.code || 'PROFILE_RECOVERY_REQUIRED';
        this.status = recovery?.status || PROFILE_LOAD_STATUS.CORRUPT;
        this.storageKey = recovery?.storageKey || null;
        this.profileId = recovery?.profileId || null;
        this.raw = recovery?.raw ?? null;
        this.recovery = recovery || null;
        this.cause = cause;
    }
}

function readStorageValue(storage, key, message) {
    try {
        return storage.getItem(key);
    } catch (error) {
        throw new ProfileRecoveryError({
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            scope: 'profile-context',
            storageKey: key,
            raw: null,
            code: 'PROFILE_STORAGE_UNAVAILABLE',
            message,
            canReset: false
        }, error);
    }
}

function writeStorageValue(storage, key, value, message) {
    try {
        storage.setItem(key, value);
    } catch (error) {
        throw new ProfileRecoveryError({
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            scope: 'profile-context',
            storageKey: key,
            raw: null,
            code: 'PROFILE_STORAGE_UNAVAILABLE',
            message,
            canReset: false
        }, error);
    }
}

function removeStorageValue(storage, key, message) {
    try {
        storage.removeItem(key);
    } catch (error) {
        throw new ProfileRecoveryError({
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            scope: 'profile-context',
            storageKey: key,
            raw: null,
            code: 'PROFILE_STORAGE_UNAVAILABLE',
            message,
            canReset: false
        }, error);
    }
}

function createProfileFieldRecovery(profileId, profileName, result, registryRaw, options = {}) {
    const status = result.status;
    const storageKey = result.storageKey;
    const dataArea = storageKey === PROFILE_HEALTH_BUCKET_KEY
        ? 'Pflegebucket'
        : 'Balance-State';
    const message = status === PROFILE_LOAD_STATUS.UNAVAILABLE
        ? `Profil ${profileName || profileId}: Der ${dataArea} ist technisch nicht lesbar.`
        : `Profil ${profileName || profileId}: Der ${dataArea} ist korrupt und blockiert die Profilnutzung.`;
    return {
        status,
        scope: options.scope || 'profile-field',
        storageKey,
        profileId,
        profileName: profileName || profileId,
        raw: result.raw ?? null,
        registryRaw,
        code: result.error?.code || 'PROFILE_FIELD_INVALID',
        message,
        detail: result.error?.message || '',
        canReset: status === PROFILE_LOAD_STATUS.CORRUPT && result.raw !== null
    };
}

export function assertProfileDataLoadable(profileId, profile, options = {}) {
    if (!profile || typeof profile !== 'object' || Array.isArray(profile)) {
        throw new ProfileRecoveryError({
            status: PROFILE_LOAD_STATUS.CORRUPT,
            scope: 'registry',
            storageKey: PROFILE_STORAGE_KEY,
            profileId,
            raw: options.registryRaw ?? null,
            registryRaw: options.registryRaw ?? null,
            code: 'PROFILE_REGISTRY_ENTRY_INVALID',
            message: `Profil ${profileId} besitzt keinen gueltigen Registryeintrag.`,
            canReset: options.registryRaw !== null && options.registryRaw !== undefined
        });
    }
    const data = profile.data;
    const checks = [
        loadProfileHealthBucketFromData(data),
        loadStoredBalanceStateFromData(data)
    ];
    const failed = checks.find(result => (
        result.status === PROFILE_LOAD_STATUS.CORRUPT
        || result.status === PROFILE_LOAD_STATUS.UNAVAILABLE
    ));
    if (failed) {
        throw new ProfileRecoveryError(createProfileFieldRecovery(
            profileId,
            profile.meta?.name,
            failed,
            options.registryRaw ?? null,
            options
        ), failed.error?.cause || null);
    }
    return {
        healthBucket: checks[0],
        balanceState: checks[1]
    };
}

export function getProfileRecoveryFromError(error) {
    if (error?.recovery) return error.recovery;
    if (error instanceof ProfileRegistryError && error.recovery) return error.recovery;
    return null;
}

export { hasProfileScopedDataInLocalStorage };

function ensureRegistryWithLiveSnapshot() {
    return ensureDefaultProfile({ captureProfileData });
}

function getRegistryContextSnapshot() {
    const registry = ensureRegistryWithLiveSnapshot();
    const registryResult = loadProfileRegistry(persistenceStorage);
    return { registry, registryRaw: registryResult.raw ?? null };
}

function validateActiveProfileId(registry, registryRaw) {
    const activeId = readStorageValue(
        persistenceStorage,
        ACTIVE_PROFILE_KEY,
        'Die aktive Profil-ID ist technisch nicht lesbar.'
    );
    if (!activeId) return null;
    if (!registry.profiles[activeId]) {
        throw new ProfileRecoveryError({
            status: PROFILE_LOAD_STATUS.CORRUPT,
            scope: 'profile-context',
            storageKey: ACTIVE_PROFILE_KEY,
            raw: activeId,
            registryRaw,
            code: 'PROFILE_ACTIVE_GHOST',
            message: `Die aktive Profil-ID ${activeId} existiert nicht in der Profilregistry.`,
            canReset: true
        });
    }
    return activeId;
}

export function assertProfileContextReady() {
    const { registry, registryRaw } = getRegistryContextSnapshot();
    const currentId = getCurrentProfileIdFromRegistry();
    const activeId = validateActiveProfileId(registry, registryRaw);
    if (activeId && activeId !== currentId) {
        throw new ProfileRecoveryError({
            status: PROFILE_LOAD_STATUS.CORRUPT,
            scope: 'profile-context',
            storageKey: ACTIVE_PROFILE_KEY,
            profileId: currentId,
            raw: activeId,
            registryRaw,
            code: 'PROFILE_CONTEXT_MISMATCH',
            message: `Aktives Profil ${activeId} und aktuelles Profil ${currentId} stimmen nicht ueberein.`,
            canReset: true
        });
    }
    assertProfileDataLoadable(currentId, registry.profiles[currentId], { registryRaw });
    return { registry, registryRaw, currentId, activeId };
}

export function getCurrentProfileId() {
    ensureRegistryWithLiveSnapshot();
    return getCurrentProfileIdFromRegistry();
}

export function setCurrentProfileId(id) {
    setCurrentProfileIdInRegistry(id);
}

export function listProfiles() {
    return listProfilesFromRegistry({ captureProfileData });
}

export function getProfileMeta(id) {
    return getProfileMetaFromRegistry(id, { captureProfileData });
}

export function getProfileData(id) {
    return getProfileDataFromRegistry(id, { captureProfileData });
}

export function createProfile(name) {
    return createProfileInRegistry(name, { captureProfileData });
}

export function renameProfile(id, name) {
    return renameProfileInRegistry(id, name, { captureProfileData });
}

export function setProfileVerbundMembership(profileId, belongs) {
    return setProfileVerbundMembershipInRegistry(profileId, belongs, { captureProfileData });
}

export function deleteProfile(id) {
    const { registry, currentId, activeId } = assertProfileContextReady();
    if (!registry.profiles[id]) return false;
    const remainingIds = Object.keys(registry.profiles).filter(profileId => profileId !== id);
    if (!remainingIds.length) {
        const deleted = deleteProfileFromRegistry(id, { captureProfileData });
        if (!deleted) return false;
        const fallbackId = getCurrentProfileId();
        if (!loadProfileIntoLocalStorage(fallbackId)) return false;
        setCurrentProfileId(fallbackId);
        return true;
    }
    if (id === currentId || id === activeId) {
        const fallbackId = remainingIds.includes('default') ? 'default' : remainingIds[0];
        if (!loadProfileIntoLocalStorage(fallbackId)) return false;
        setCurrentProfileId(fallbackId);
    }
    return deleteProfileFromRegistry(id, { captureProfileData });
}

export function saveCurrentProfileFromLocalStorage() {
    const { registry, registryRaw, currentId: id } = assertProfileContextReady();
    if (!registry.profiles[id]) return false;
    let capturedData;
    try {
        capturedData = captureProfileData();
    } catch (error) {
        throw new ProfileRecoveryError({
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            scope: 'live-profile',
            storageKey: null,
            profileId: id,
            raw: null,
            registryRaw,
            code: 'PROFILE_LIVE_CAPTURE_UNAVAILABLE',
            message: `Profil ${id}: Der aktuelle Live-State ist technisch nicht lesbar.`,
            canReset: false
        }, error);
    }
    assertProfileDataLoadable(id, {
        ...registry.profiles[id],
        data: capturedData
    }, {
        registryRaw,
        scope: 'live-profile-field'
    });
    if (!replaceProfileData(id, capturedData, { captureProfileData })) {
        throw new ProfileRecoveryError({
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            scope: 'registry',
            storageKey: PROFILE_STORAGE_KEY,
            profileId: id,
            raw: null,
            registryRaw,
            code: 'PROFILE_SAVE_UNAVAILABLE',
            message: `Profil ${id}: Der aktuelle Live-State konnte nicht sicher gespeichert werden.`,
            canReset: false
        });
    }
    return true;
}

export function loadProfileIntoLocalStorage(id) {
    const { registry, registryRaw } = getRegistryContextSnapshot();
    const profile = registry.profiles[id];
    if (!profile) return false;
    assertProfileDataLoadable(id, profile, { registryRaw });
    let previousLiveData;
    let previousActiveId;
    let currentMainState;
    try {
        previousLiveData = captureLiveProfileData();
        previousActiveId = readStorageValue(
            persistenceStorage,
            ACTIVE_PROFILE_KEY,
            'Die aktive Profil-ID ist technisch nicht lesbar.'
        );
        currentMainState = parseBalanceState(readStorageValue(
            persistenceStorage,
            CONFIG.STORAGE.LS_KEY,
            'Der aktuelle Balance-State ist technisch nicht lesbar.'
        ));
    } catch (error) {
        if (error instanceof ProfileRecoveryError) throw error;
        throw new ProfileRecoveryError({
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            scope: 'profile-load',
            storageKey: null,
            profileId: id,
            raw: null,
            registryRaw,
            code: 'PROFILE_LOAD_PREFLIGHT_UNAVAILABLE',
            message: `Profil ${id} kann nicht atomar geladen werden, weil der vorherige Live-State technisch nicht lesbar ist.`,
            canReset: false
        }, error);
    }
    const householdState = createHouseholdOwnedBalanceState(currentMainState || {});
    const sanitizedData = sanitizeProfileDataBalanceOwnership(profile.data);
    try {
        loadProfileDataIntoLocalStorage(sanitizedData);
        const loadedProfileState = parseBalanceState(persistenceStorage.getItem(CONFIG.STORAGE.LS_KEY));
        if (loadedProfileState) {
            persistenceStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify({
                ...createProfileOwnedBalanceState(loadedProfileState),
                ...householdState
            }));
        } else if (Object.keys(householdState).length > 0) {
            persistenceStorage.setItem(CONFIG.STORAGE.LS_KEY, JSON.stringify(householdState));
        }
        persistenceStorage.setItem(ACTIVE_PROFILE_KEY, id);
        if (sanitizedData !== profile.data) {
            const persisted = replaceProfileData(id, sanitizedData, { captureProfileData });
            if (!persisted) {
                throw new Error('PROFILE_SANITIZED_STATE_WRITE_FAILED');
            }
        }
        return true;
    } catch (error) {
        let rollbackError = null;
        try {
            loadProfileDataIntoLocalStorage(previousLiveData);
            if (previousActiveId === null || previousActiveId === undefined || previousActiveId === '') {
                persistenceStorage.removeItem(ACTIVE_PROFILE_KEY);
            } else {
                persistenceStorage.setItem(ACTIVE_PROFILE_KEY, previousActiveId);
            }
        } catch (failure) {
            rollbackError = failure;
        }
        throw new ProfileRecoveryError({
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            scope: 'profile-load',
            storageKey: null,
            profileId: id,
            raw: null,
            registryRaw,
            code: rollbackError ? 'PROFILE_LOAD_ROLLBACK_FAILED' : 'PROFILE_LOAD_UNAVAILABLE',
            message: rollbackError
                ? `Profil ${id} konnte nicht geladen und der vorherige Live-State nicht vollstaendig wiederhergestellt werden.`
                : `Profil ${id} konnte nicht geladen werden; der vorherige Live-State wurde wiederhergestellt.`,
            canReset: false
        }, error);
    }
}

export function updateProfileData(id, patch) {
    return updateProfileDataInRegistry(id, patch, { captureProfileData });
}

export function switchProfile(id) {
    const current = getCurrentProfileId();
    const { registry, registryRaw } = getRegistryContextSnapshot();
    const target = registry.profiles[id];
    if (!target) return false;
    assertProfileDataLoadable(id, target, { registryRaw });
    if (current === id) return true;
    if (!saveCurrentProfileFromLocalStorage()) return false;
    const loaded = loadProfileIntoLocalStorage(id);
    if (!loaded) return false;
    try {
        setCurrentProfileId(id);
        return true;
    } catch (error) {
        try {
            loadProfileIntoLocalStorage(current);
            setCurrentProfileId(current);
        } catch {
            // Der geworfene Fehler behaelt den urspruenglichen fehlgeschlagenen Wechsel.
        }
        throw error;
    }
}

export function getActiveProfileId() {
    const { registry, registryRaw } = getRegistryContextSnapshot();
    return validateActiveProfileId(registry, registryRaw);
}

export function ensureProfileRegistry() {
    return ensureRegistryWithLiveSnapshot();
}

export function getLastProfileBootstrapResult() {
    return lastProfileBootstrapResult;
}

export function bootstrapProfileContext(options = {}) {
    const {
        importFromWindowName = false,
        preserveLiveProfileData = false
    } = options;

    let importResult = { ok: false, message: 'window.name import disabled' };
    try {
        if (importFromWindowName && !readStorageValue(
            persistenceStorage,
            PROFILE_STORAGE_KEY,
            'Die Profilregistry ist technisch nicht lesbar.'
        )) {
            importResult = importProfilesBundleFromWindowName();
        }

        const { registry, registryRaw } = getRegistryContextSnapshot();
        const currentId = getCurrentProfileId();
        const activeId = validateActiveProfileId(registry, registryRaw);
        assertProfileDataLoadable(currentId, registry.profiles[currentId], { registryRaw });
        const hasLiveProfileData = hasProfileScopedDataInLocalStorage();
        const shouldSaveLiveData =
            preserveLiveProfileData &&
            activeId === currentId &&
            hasLiveProfileData;

        if (shouldSaveLiveData) {
            saveCurrentProfileFromLocalStorage();
            lastProfileBootstrapResult = { currentId, action: 'saved', importResult, recovery: null };
            return lastProfileBootstrapResult;
        }

        const loaded = loadProfileIntoLocalStorage(currentId);
        if (!loaded) {
            throw new ProfileRecoveryError({
                status: PROFILE_LOAD_STATUS.CORRUPT,
                scope: 'profile-context',
                storageKey: CURRENT_PROFILE_KEY,
                profileId: currentId,
                raw: currentId,
                registryRaw,
                code: 'PROFILE_CURRENT_LOAD_FAILED',
                message: `Das aktuelle Profil ${currentId} konnte nicht geladen werden.`,
                canReset: true
            });
        }
        lastProfileBootstrapResult = { currentId, action: 'loaded', importResult, recovery: null };
        return lastProfileBootstrapResult;
    } catch (error) {
        const recovery = getProfileRecoveryFromError(error);
        if (!recovery) throw error;
        lastProfileBootstrapResult = {
            currentId: null,
            action: 'recovery',
            importResult,
            recovery
        };
        return lastProfileBootstrapResult;
    }
}

function recoveryRawMatches(expected, actual) {
    if (typeof expected === 'string' || typeof actual === 'string') {
        return expected === actual;
    }
    try {
        return JSON.stringify(expected) === JSON.stringify(actual);
    } catch {
        return false;
    }
}

export function createProfileRecoveryDocument(recovery, options = {}) {
    if (!recovery || recovery.status !== PROFILE_LOAD_STATUS.CORRUPT || recovery.raw === null) {
        throw new Error('Fuer diesen Profilzustand ist kein Raw-Recovery-Export verfuegbar.');
    }
    return {
        schema: PROFILE_RECOVERY_SCHEMA,
        schemaVersion: PROFILE_RECOVERY_SCHEMA_VERSION,
        exportedAt: options.exportedAt || new Date().toISOString(),
        backend: options.backend || 'unknown',
        recovery: {
            status: recovery.status,
            scope: recovery.scope,
            code: recovery.code,
            message: recovery.message,
            detail: recovery.detail || '',
            storageKey: recovery.storageKey || null,
            profileId: recovery.profileId || null,
            profileName: recovery.profileName || null,
            raw: recovery.raw,
            registryRaw: recovery.registryRaw ?? null
        }
    };
}

function assertRecoveryDocumentMatches(recovery, recoveryDocument) {
    const exported = recoveryDocument?.recovery;
    if (recoveryDocument?.schema !== PROFILE_RECOVERY_SCHEMA
        || recoveryDocument?.schemaVersion !== PROFILE_RECOVERY_SCHEMA_VERSION
        || exported?.status !== recovery.status
        || exported?.scope !== recovery.scope
        || exported?.storageKey !== (recovery.storageKey || null)
        || exported?.profileId !== (recovery.profileId || null)
        || !recoveryRawMatches(exported?.raw, recovery.raw)
        || !recoveryRawMatches(exported?.registryRaw ?? null, recovery.registryRaw ?? null)) {
        throw new Error('Der Recovery-Export passt nicht mehr zum aktuellen Profilfehler.');
    }
}

export function resetProfileRecovery(recovery, options = {}) {
    const {
        storage = persistenceStorage,
        recoveryDocument = null,
        confirmed = false,
        captureProfileData: captureForReset = () => captureLiveProfileData(storage)
    } = options;
    if (!confirmed) {
        throw new Error('Der Profil-Reset wurde nicht bestaetigt.');
    }
    if (!recovery || recovery.status !== PROFILE_LOAD_STATUS.CORRUPT || recovery.canReset !== true) {
        throw new Error('Ein technisch nicht lesbarer Profilzustand darf nicht zurueckgesetzt werden.');
    }
    assertRecoveryDocumentMatches(recovery, recoveryDocument);

    if (recovery.scope === 'registry') {
        const currentRaw = readStorageValue(
            storage,
            PROFILE_STORAGE_KEY,
            'Die Profilregistry ist technisch nicht lesbar.'
        );
        if (!recoveryRawMatches(recovery.raw, currentRaw)) {
            throw new Error('Die Profilregistry hat sich seit dem Recovery-Export geaendert.');
        }
        removeStorageValue(storage, PROFILE_STORAGE_KEY, 'Die korrupte Profilregistry konnte nicht entfernt werden.');
        removeStorageValue(storage, CURRENT_PROFILE_KEY, 'Die aktuelle Profil-ID konnte nicht zurueckgesetzt werden.');
        removeStorageValue(storage, ACTIVE_PROFILE_KEY, 'Die aktive Profil-ID konnte nicht zurueckgesetzt werden.');
        ensureDefaultProfile({ storage, captureProfileData: captureForReset });
        return { ok: true, action: 'registry_reset', profileId: 'default' };
    }

    if (recovery.scope === 'profile-context') {
        const currentRaw = readStorageValue(
            storage,
            recovery.storageKey,
            'Der Profilkontext ist technisch nicht lesbar.'
        );
        if (!recoveryRawMatches(recovery.raw, currentRaw)) {
            throw new Error('Der Profilkontext hat sich seit dem Recovery-Export geaendert.');
        }
        const registryResult = loadProfileRegistry(storage);
        if (registryResult.status !== PROFILE_LOAD_STATUS.VALID) {
            throw new Error('Der Profilkontext kann ohne gueltige Profilregistry nicht repariert werden.');
        }
        const registry = registryResult.value;
        const fallbackId = registry.profiles.default
            ? 'default'
            : Object.keys(registry.profiles)[0];
        if (!fallbackId) {
            throw new Error('Die Profilregistry enthaelt kein Profil fuer die Recovery.');
        }
        const storedCurrent = readStorageValue(
            storage,
            CURRENT_PROFILE_KEY,
            'Die aktuelle Profil-ID ist technisch nicht lesbar.'
        );
        const nextCurrent = registry.profiles[storedCurrent] ? storedCurrent : fallbackId;
        assertProfileDataLoadable(nextCurrent, registry.profiles[nextCurrent], {
            registryRaw: registryResult.raw,
            scope: 'profile-context'
        });
        const previousLiveData = captureLiveProfileData(storage);
        const previousCurrent = storedCurrent;
        const previousActive = readStorageValue(
            storage,
            ACTIVE_PROFILE_KEY,
            'Die aktive Profil-ID ist technisch nicht lesbar.'
        );
        const currentMainState = parseBalanceState(previousLiveData[CONFIG.STORAGE.LS_KEY]);
        const householdState = createHouseholdOwnedBalanceState(currentMainState || {});
        const sanitizedData = sanitizeProfileDataBalanceOwnership(registry.profiles[nextCurrent].data);
        try {
            loadProfileDataIntoLocalStorage(sanitizedData, storage);
            const loadedProfileState = parseBalanceState(readStorageValue(
                storage,
                CONFIG.STORAGE.LS_KEY,
                'Der geladene Balance-State ist technisch nicht lesbar.'
            ));
            if (loadedProfileState) {
                writeStorageValue(storage, CONFIG.STORAGE.LS_KEY, JSON.stringify({
                    ...createProfileOwnedBalanceState(loadedProfileState),
                    ...householdState
                }), 'Der reparierte Balance-State konnte nicht gespeichert werden.');
            } else if (Object.keys(householdState).length > 0) {
                writeStorageValue(
                    storage,
                    CONFIG.STORAGE.LS_KEY,
                    JSON.stringify(householdState),
                    'Der reparierte Balance-State konnte nicht gespeichert werden.'
                );
            }
            writeStorageValue(storage, CURRENT_PROFILE_KEY, nextCurrent, 'Die aktuelle Profil-ID konnte nicht repariert werden.');
            writeStorageValue(storage, ACTIVE_PROFILE_KEY, nextCurrent, 'Die aktive Profil-ID konnte nicht repariert werden.');
        } catch (error) {
            let rollbackError = null;
            try {
                loadProfileDataIntoLocalStorage(previousLiveData, storage);
                if (previousCurrent) {
                    storage.setItem(CURRENT_PROFILE_KEY, previousCurrent);
                } else {
                    storage.removeItem(CURRENT_PROFILE_KEY);
                }
                if (previousActive) {
                    storage.setItem(ACTIVE_PROFILE_KEY, previousActive);
                } else {
                    storage.removeItem(ACTIVE_PROFILE_KEY);
                }
            } catch (failure) {
                rollbackError = failure;
            }
            throw new ProfileRecoveryError({
                status: PROFILE_LOAD_STATUS.UNAVAILABLE,
                scope: 'profile-context',
                storageKey: recovery.storageKey,
                profileId: nextCurrent,
                raw: recovery.raw,
                registryRaw: registryResult.raw,
                code: rollbackError ? 'PROFILE_CONTEXT_ROLLBACK_FAILED' : 'PROFILE_CONTEXT_REPAIR_FAILED',
                message: rollbackError
                    ? 'Der Profilkontext konnte nicht repariert und der vorherige Zustand nicht vollstaendig wiederhergestellt werden.'
                    : 'Der Profilkontext konnte nicht repariert werden; der vorherige Zustand wurde wiederhergestellt.',
                canReset: false
            }, error);
        }
        lastProfileBootstrapResult = {
            currentId: nextCurrent,
            action: 'recovered',
            importResult: null,
            recovery: null
        };
        return { ok: true, action: 'context_repaired', profileId: nextCurrent };
    }

    if (recovery.scope === 'live-profile-field') {
        const currentRaw = readStorageValue(
            storage,
            recovery.storageKey,
            'Der aktuelle profilbezogene Live-State ist technisch nicht lesbar.'
        );
        if (!recoveryRawMatches(recovery.raw, currentRaw)) {
            throw new Error('Der profilbezogene Live-State hat sich seit dem Recovery-Export geaendert.');
        }
        removeStorageValue(
            storage,
            recovery.storageKey,
            'Der korrupte profilbezogene Live-State konnte nicht entfernt werden.'
        );
        return {
            ok: true,
            action: 'live_profile_field_reset',
            profileId: recovery.profileId,
            storageKey: recovery.storageKey
        };
    }

    if (recovery.scope === 'profile-field') {
        const registryRaw = readStorageValue(
            storage,
            PROFILE_STORAGE_KEY,
            'Die Profilregistry ist technisch nicht lesbar.'
        );
        if (!recoveryRawMatches(recovery.registryRaw, registryRaw)) {
            throw new Error('Die Profilregistry hat sich seit dem Recovery-Export geaendert.');
        }
        const registryResult = loadProfileRegistry(storage);
        if (registryResult.status !== PROFILE_LOAD_STATUS.VALID) {
            throw new Error('Der Profilbereich kann ohne gueltige Profilregistry nicht repariert werden.');
        }
        const registry = registryResult.value;
        const profile = registry.profiles[recovery.profileId];
        if (!profile || !Object.prototype.hasOwnProperty.call(profile.data, recovery.storageKey)) {
            throw new Error('Der betroffene Profilbereich existiert nicht mehr.');
        }
        if (!recoveryRawMatches(profile.data[recovery.storageKey], recovery.raw)) {
            throw new Error('Der betroffene Profilbereich hat sich seit dem Recovery-Export geaendert.');
        }
        const nextRegistry = {
            ...registry,
            profiles: {
                ...registry.profiles,
                [recovery.profileId]: {
                    ...profile,
                    data: { ...profile.data }
                }
            }
        };
        delete nextRegistry.profiles[recovery.profileId].data[recovery.storageKey];
        nextRegistry.profiles[recovery.profileId].meta = {
            ...nextRegistry.profiles[recovery.profileId].meta,
            updatedAt: new Date().toISOString()
        };
        if (!saveProfileRegistry(nextRegistry, storage)) {
            throw new Error('Der bestaetigte Profilbereich konnte nicht zurueckgesetzt werden.');
        }
        return {
            ok: true,
            action: 'profile_field_reset',
            profileId: recovery.profileId,
            storageKey: recovery.storageKey
        };
    }

    throw new Error('Der Profil-Recoverybereich wird nicht unterstuetzt.');
}

export function exportProfilesBundle() {
    return exportProfilesBundleFromIo({
        saveCurrentProfile: saveCurrentProfileFromLocalStorage
    });
}

export function exportProfilesBundleToWindowName() {
    return exportProfilesBundleToWindowNameFromIo({
        saveCurrentProfile: saveCurrentProfileFromLocalStorage
    });
}

export function importProfilesBundle(bundle) {
    return importProfilesBundleFromIo(bundle, {
        loadProfileIntoLocalStorage
    });
}

export function importProfilesBundleFromWindowName() {
    return importProfilesBundleFromWindowNameFromIo({
        loadProfileIntoLocalStorage
    });
}
