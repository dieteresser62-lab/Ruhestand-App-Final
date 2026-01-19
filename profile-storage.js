// @ts-check

import { CONFIG } from './balance-config.js';

const PROFILE_STORAGE_KEY = 'rs_profiles_v1';
const CURRENT_PROFILE_KEY = 'rs_current_profile';
const ACTIVE_PROFILE_KEY = 'rs_active_profile';
const PROFILE_VERSION = 1;

const FIXED_KEYS = new Set([
    'depot_tranchen',
    'profile_tagesgeld',
    'profile_rente_aktiv',
    'profile_rente_monatlich',
    'profile_aktuelles_alter',
    'profile_gold_aktiv',
    'profile_gold_ziel_pct',
    'profile_gold_floor_pct',
    'profile_gold_steuerfrei',
    'profile_gold_rebal_band',
    'showCareDetails',
    'logDetailLevel',
    'worstLogDetailLevel',
    'backtestLogDetailLevel'
]);

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
    for (const prefix of PREFIX_KEYS) {
        if (key.startsWith(prefix)) return true;
    }
    return false;
}

function getProfileRegistry() {
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
    const keys = [];
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (isProfileScopedKey(key)) {
            keys.push(key);
        }
    }
    return keys;
}

function captureProfileData() {
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

function ensureDefaultProfile() {
    const registry = getProfileRegistry();
    if (Object.keys(registry.profiles).length > 0) {
        return registry;
    }

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

export function setProfileHouseholdMembership(profileId, belongs) {
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
