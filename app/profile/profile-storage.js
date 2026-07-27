/**
 * Module: Profile Storage
 * Purpose: Manages the storage and lifecycle of User Profiles (CRUD operations).
 *          Handles creating, renaming, deleting profiles, and Import/Export functionality.
 * Usage: Used by profilverbund-balance.js and balance-binder.js for profile management.
 * Dependencies: profile-registry.js, profile-key-policy.js, profile-live-storage.js, profile-bundle-io.js
 */
// @ts-check

import { PROFILE_STORAGE_KEYS } from './profile-state.js';
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
    createProfile as createProfileInRegistry,
    deleteProfile as deleteProfileFromRegistry,
    ensureDefaultProfile,
    getCurrentProfileId as getCurrentProfileIdFromRegistry,
    getProfileData as getProfileDataFromRegistry,
    getProfileMeta as getProfileMetaFromRegistry,
    listProfiles as listProfilesFromRegistry,
    renameProfile as renameProfileInRegistry,
    replaceProfileData,
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

export { hasProfileScopedDataInLocalStorage };

function ensureRegistryWithLiveSnapshot() {
    return ensureDefaultProfile({ captureProfileData });
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
    return deleteProfileFromRegistry(id, { captureProfileData });
}

export function saveCurrentProfileFromLocalStorage() {
    const registry = ensureRegistryWithLiveSnapshot();
    const id = getCurrentProfileId();
    if (!registry.profiles[id]) return false;
    return replaceProfileData(id, captureProfileData(), { captureProfileData });
}

export function loadProfileIntoLocalStorage(id) {
    const registry = ensureRegistryWithLiveSnapshot();
    const profile = registry.profiles[id];
    if (!profile) return false;
    const currentMainState = parseBalanceState(persistenceStorage.getItem(CONFIG.STORAGE.LS_KEY));
    const householdState = createHouseholdOwnedBalanceState(currentMainState || {});
    const sanitizedData = sanitizeProfileDataBalanceOwnership(profile.data);
    if (sanitizedData !== profile.data) {
        replaceProfileData(id, sanitizedData, { captureProfileData });
    }
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
    return true;
}

export function updateProfileData(id, patch) {
    return updateProfileDataInRegistry(id, patch, { captureProfileData });
}

export function switchProfile(id) {
    const current = getCurrentProfileId();
    if (current === id) return true;
    saveCurrentProfileFromLocalStorage();
    const loaded = loadProfileIntoLocalStorage(id);
    if (!loaded) return false;
    setCurrentProfileId(id);
    return true;
}

export function getActiveProfileId() {
    return persistenceStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function ensureProfileRegistry() {
    return ensureRegistryWithLiveSnapshot();
}

export function bootstrapProfileContext(options = {}) {
    const {
        importFromWindowName = false,
        preserveLiveProfileData = false
    } = options;

    let importResult = { ok: false, message: 'window.name import disabled' };
    if (importFromWindowName && !persistenceStorage.getItem(PROFILE_STORAGE_KEY)) {
        importResult = importProfilesBundleFromWindowName();
    }

    ensureProfileRegistry();

    const currentId = getCurrentProfileId();
    const activeId = getActiveProfileId();
    const hasLiveProfileData = hasProfileScopedDataInLocalStorage();
    const shouldSaveLiveData =
        preserveLiveProfileData &&
        activeId === currentId &&
        hasLiveProfileData;

    if (shouldSaveLiveData) {
        saveCurrentProfileFromLocalStorage();
        return { currentId, action: 'saved', importResult };
    }

    loadProfileIntoLocalStorage(currentId);
    return { currentId, action: 'loaded', importResult };
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
