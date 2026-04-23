/**
 * Module: Profile Storage
 * Purpose: Manages the storage and lifecycle of User Profiles (CRUD operations).
 *          Handles creating, renaming, deleting profiles, and Import/Export functionality.
 * Usage: Used by profilverbund-balance.js and balance-binder.js for profile management.
 * Dependencies: balance-config.js
 */
// @ts-check

import { CONFIG } from '../balance/balance-config.js';
import { PROFILE_SCOPED_FIXED_KEYS, PROFILE_STORAGE_KEYS, PROFILE_TRANCHES_KEY } from './profile-state.js';

const PROFILE_STORAGE_KEY = PROFILE_STORAGE_KEYS.registry;
const CURRENT_PROFILE_KEY = PROFILE_STORAGE_KEYS.current;
const ACTIVE_PROFILE_KEY = PROFILE_STORAGE_KEYS.active;
const PROFILE_VERSION = 1;
const WINDOW_NAME_BUNDLE_PREFIX = 'RUHESTAND_PROFILE_BUNDLE:';

const FIXED_KEYS = new Set(PROFILE_SCOPED_FIXED_KEYS);

const PREFIX_KEYS = [
    'sim_',
    'sim.',
    CONFIG.STORAGE.SNAPSHOT_PREFIX
];

const EXACT_KEYS = new Set([
    CONFIG.STORAGE.LS_KEY,
    CONFIG.STORAGE.MIGRATION_FLAG
]);

function nowIso() {
    return new Date().toISOString();
}

function normalizeBelongsFlag(meta) {
    if (!meta) return true;
    return meta.belongsToHousehold !== false;
}

function slugify(name) {
    const base = String(name || '')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '');
    return base || 'profile';
}

function isProfileScopedKey(key) {
    if (!key) return false;
    if (EXACT_KEYS.has(key)) return true;
    if (FIXED_KEYS.has(key)) return true;
    // Prefixe markieren dynamische Simulator-/Snapshot-Keys als profilbezogen.
    for (const prefix of PREFIX_KEYS) {
        if (key.startsWith(prefix)) return true;
    }
    return false;
}

function getProfileRegistry() {
    // Registry-Shape: { version, profiles: { [id]: { meta, data } } }
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
        return { version: PROFILE_VERSION, profiles: {} };
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return { version: PROFILE_VERSION, profiles: {} };
        }
        if (!parsed.profiles || typeof parsed.profiles !== 'object') {
            return { version: PROFILE_VERSION, profiles: {} };
        }
        return parsed;
    } catch {
        return { version: PROFILE_VERSION, profiles: {} };
    }
}

function saveProfileRegistry(registry) {
    try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(registry));
        return true;
    } catch (err) {
        console.error('[ProfileStorage] Registry speichern fehlgeschlagen:', err);
        return false;
    }
}

function listProfileScopedKeys() {
    const keys = new Set();
    
    // 1. Explizit bekannte Keys pruefen (Workaround fuer WebView2/Tauri Iterations-Probleme)
    FIXED_KEYS.forEach(key => {
        if (localStorage.getItem(key) !== null) keys.add(key);
    });
    EXACT_KEYS.forEach(key => {
        if (localStorage.getItem(key) !== null) keys.add(key);
    });

    // 2. Dynamische Keys ueber localStorage.key(index) ermitteln
    try {
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (!key) continue;
            for (const prefix of PREFIX_KEYS) {
                if (key.startsWith(prefix)) {
                    keys.add(key);
                    break;
                }
            }
        }
    } catch (err) {
        console.warn('[ProfileStorage] localStorage Iteration fehlgeschlagen:', err);
    }

    // 3. Fallback fuer Umgebungen, in denen gespeicherte Keys enumerable sind
    try {
        const allKeys = Object.keys(localStorage);
        for (const key of allKeys) {
            if (!key || !isProfileScopedKey(key)) continue;
            keys.add(key);
        }
    } catch {
        // no-op
    }
    
    return Array.from(keys);
}

function captureProfileData() {
    // Snapshot aller profilbezogenen localStorage-Keys (z.B. Inputs, Tranchen).
    const data = {};
    const keys = listProfileScopedKeys();
    for (const key of keys) {
        data[key] = localStorage.getItem(key);
    }
    return data;
}

function clearProfileScopedKeys() {
    const keys = listProfileScopedKeys();
    keys.forEach(key => localStorage.removeItem(key));
}

function loadProfileDataIntoLocalStorage(data) {
    clearProfileScopedKeys();
    if (!data || typeof data !== 'object') return;
    Object.entries(data).forEach(([key, value]) => {
        if (!isProfileScopedKey(key)) return;
        if (value === null || value === undefined) return;
        localStorage.setItem(key, String(value));
    });
}

export function hasProfileScopedDataInLocalStorage() {
    return listProfileScopedKeys().some(key => {
        const value = localStorage.getItem(key);
        return value !== null && value !== undefined && value !== '';
    });
}

function ensureDefaultProfile() {
    const registry = getProfileRegistry();
    if (Object.keys(registry.profiles).length > 0) {
        return registry;
    }

    // Erstes Profil: Default wird aus aktuellem localStorage abgeleitet.
    const id = 'default';
    const createdAt = nowIso();
    registry.profiles[id] = {
        meta: { id, name: 'Default', createdAt, updatedAt: createdAt, belongsToHousehold: true },
        data: captureProfileData()
    };

    saveProfileRegistry(registry);
    if (!localStorage.getItem(CURRENT_PROFILE_KEY)) {
        localStorage.setItem(CURRENT_PROFILE_KEY, id);
    }

    return registry;
}

export function getCurrentProfileId() {
    ensureDefaultProfile();
    return localStorage.getItem(CURRENT_PROFILE_KEY) || 'default';
}

export function setCurrentProfileId(id) {
    localStorage.setItem(CURRENT_PROFILE_KEY, id);
}

export function listProfiles() {
    const registry = ensureDefaultProfile();
    return Object.values(registry.profiles).map(p => ({
        ...p.meta,
        belongsToHousehold: normalizeBelongsFlag(p.meta)
    }));
}

export function getProfileMeta(id) {
    const registry = ensureDefaultProfile();
    const meta = registry.profiles[id]?.meta || null;
    if (!meta) return null;
    return { ...meta, belongsToHousehold: normalizeBelongsFlag(meta) };
}

export function getProfileData(id) {
    const registry = ensureDefaultProfile();
    return registry.profiles[id]?.data || null;
}

export function createProfile(name) {
    const registry = ensureDefaultProfile();
    const base = slugify(name);
    let id = base;
    let suffix = 1;
    while (registry.profiles[id]) {
        id = `${base}-${suffix}`;
        suffix += 1;
    }

    const createdAt = nowIso();
    registry.profiles[id] = {
        meta: { id, name: name || id, createdAt, updatedAt: createdAt, belongsToHousehold: true },
        data: {}
    };

    saveProfileRegistry(registry);
    return registry.profiles[id].meta;
}

export function renameProfile(id, name) {
    const registry = ensureDefaultProfile();
    if (!registry.profiles[id]) return null;
    registry.profiles[id].meta.name = name || registry.profiles[id].meta.name;
    registry.profiles[id].meta.updatedAt = nowIso();
    saveProfileRegistry(registry);
    return { ...registry.profiles[id].meta, belongsToHousehold: normalizeBelongsFlag(registry.profiles[id].meta) };
}

export function setProfileVerbundMembership(profileId, belongs) {
    const registry = ensureDefaultProfile();
    if (!registry.profiles[profileId]) return false;
    registry.profiles[profileId].meta.belongsToHousehold = Boolean(belongs);
    registry.profiles[profileId].meta.updatedAt = nowIso();
    return saveProfileRegistry(registry);
}

export function deleteProfile(id) {
    const registry = ensureDefaultProfile();
    if (!registry.profiles[id]) return false;
    if (id === 'default' && Object.keys(registry.profiles).length <= 1) return false;
    delete registry.profiles[id];
    saveProfileRegistry(registry);

    if (getCurrentProfileId() === id) {
        const remainingIds = Object.keys(registry.profiles);
        setCurrentProfileId(remainingIds[0] || 'default');
    }
    return true;
}

export function saveCurrentProfileFromLocalStorage() {
    const registry = ensureDefaultProfile();
    const id = getCurrentProfileId();
    if (!registry.profiles[id]) return false;
    registry.profiles[id].data = captureProfileData();
    registry.profiles[id].meta.updatedAt = nowIso();
    return saveProfileRegistry(registry);
}

export function loadProfileIntoLocalStorage(id) {
    const registry = ensureDefaultProfile();
    const profile = registry.profiles[id];
    if (!profile) return false;
    loadProfileDataIntoLocalStorage(profile.data);
    localStorage.setItem(ACTIVE_PROFILE_KEY, id);
    return true;
}

export function updateProfileData(id, patch) {
    const registry = ensureDefaultProfile();
    if (!registry.profiles[id]) return false;
    const currentData = registry.profiles[id].data || {};
    registry.profiles[id].data = { ...currentData, ...patch };
    registry.profiles[id].meta.updatedAt = nowIso();
    return saveProfileRegistry(registry);
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
    return localStorage.getItem(ACTIVE_PROFILE_KEY);
}

export function ensureProfileRegistry() {
    return ensureDefaultProfile();
}

export function bootstrapProfileContext(options = {}) {
    const {
        importFromWindowName = false,
        preserveLiveProfileData = false
    } = options;

    let importResult = { ok: false, message: 'window.name import disabled' };
    if (importFromWindowName && !localStorage.getItem(PROFILE_STORAGE_KEY)) {
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
    saveCurrentProfileFromLocalStorage();
    const registry = getProfileRegistry();
    const currentProfileId = localStorage.getItem(CURRENT_PROFILE_KEY) || 'default';
    const globals = {};
    const globalKeys = ['etfProxyUrl', 'etfProxyUrls', 'enableWorkerTelemetry'];
    globalKeys.forEach(key => {
        const val = localStorage.getItem(key);
        if (val !== null && val !== undefined) {
            globals[key] = val;
        }
    });

    return {
        version: PROFILE_VERSION,
        exportedAt: nowIso(),
        registry,
        currentProfileId,
        globals
    };
}

export function exportProfilesBundleToWindowName() {
    if (typeof window === 'undefined') return false;
    try {
        const bundle = exportProfilesBundle();
        window.name = WINDOW_NAME_BUNDLE_PREFIX + JSON.stringify(bundle);
        return true;
    } catch (err) {
        console.error('[ProfileStorage] Export to window.name failed:', err);
        return false;
    }
}

export function importProfilesBundle(bundle) {
    if (!bundle || typeof bundle !== 'object') {
        return { ok: false, message: 'Ungueltige Import-Datei.' };
    }
    if (!bundle.registry || typeof bundle.registry !== 'object' || !bundle.registry.profiles) {
        return { ok: false, message: 'Registry fehlt oder ist ungueltig.' };
    }

    try {
        localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(bundle.registry));
    } catch (err) {
        console.error('[ProfileStorage] Import fehlgeschlagen:', err);
        return { ok: false, message: 'Speicher voll: Import konnte nicht geschrieben werden.' };
    }

    const nextProfileId = String(bundle.currentProfileId || 'default');
    localStorage.setItem(CURRENT_PROFILE_KEY, nextProfileId);

    if (bundle.globals && typeof bundle.globals === 'object') {
        Object.entries(bundle.globals).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            localStorage.setItem(key, String(value));
        });
    }

    const loaded = loadProfileIntoLocalStorage(nextProfileId);
    if (!loaded) {
        return { ok: false, message: 'Import gespeichert, aber Profil konnte nicht geladen werden.' };
    }
    return { ok: true, message: 'Import erfolgreich.' };
}

export function importProfilesBundleFromWindowName() {
    if (typeof window === 'undefined') {
        return { ok: false, message: 'window not available' };
    }
    const raw = String(window.name || '');
    if (!raw.startsWith(WINDOW_NAME_BUNDLE_PREFIX)) {
        return { ok: false, message: 'No bundle in window.name' };
    }
    try {
        const payload = JSON.parse(raw.slice(WINDOW_NAME_BUNDLE_PREFIX.length));
        return importProfilesBundle(payload);
    } catch (err) {
        console.error('[ProfileStorage] Import from window.name failed:', err);
        return { ok: false, message: 'window.name bundle invalid' };
    }
}
