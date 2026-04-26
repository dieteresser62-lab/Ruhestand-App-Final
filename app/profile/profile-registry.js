// @ts-check

import { PROFILE_STORAGE_KEYS } from './profile-state.js';

export const PROFILE_VERSION = 1;

const PROFILE_STORAGE_KEY = PROFILE_STORAGE_KEYS.registry;
const CURRENT_PROFILE_KEY = PROFILE_STORAGE_KEYS.current;

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

export function createEmptyProfileRegistry() {
    return { version: PROFILE_VERSION, profiles: {} };
}

export function getProfileRegistry(storage = localStorage) {
    // Registry-Shape: { version, profiles: { [id]: { meta, data } } }
    const raw = storage.getItem(PROFILE_STORAGE_KEY);
    if (!raw) {
        return createEmptyProfileRegistry();
    }
    try {
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') {
            return createEmptyProfileRegistry();
        }
        if (!parsed.profiles || typeof parsed.profiles !== 'object') {
            return createEmptyProfileRegistry();
        }
        return parsed;
    } catch {
        return createEmptyProfileRegistry();
    }
}

export function saveProfileRegistry(registry, storage = localStorage) {
    try {
        storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(registry));
        return true;
    } catch (err) {
        console.error('[ProfileStorage] Registry speichern fehlgeschlagen:', err);
        return false;
    }
}

export function ensureDefaultProfile(options = {}) {
    const {
        storage = localStorage,
        captureProfileData = () => ({})
    } = options;

    const registry = getProfileRegistry(storage);
    if (Object.keys(registry.profiles).length > 0) {
        return registry;
    }

    const id = 'default';
    const createdAt = nowIso();
    registry.profiles[id] = {
        meta: { id, name: 'Default', createdAt, updatedAt: createdAt, belongsToHousehold: true },
        data: captureProfileData()
    };

    saveProfileRegistry(registry, storage);
    if (!storage.getItem(CURRENT_PROFILE_KEY)) {
        storage.setItem(CURRENT_PROFILE_KEY, id);
    }

    return registry;
}

export function getCurrentProfileId(storage = localStorage) {
    ensureDefaultProfile({ storage });
    return storage.getItem(CURRENT_PROFILE_KEY) || 'default';
}

export function setCurrentProfileId(id, storage = localStorage) {
    storage.setItem(CURRENT_PROFILE_KEY, id);
}

export function listProfiles(options = {}) {
    const registry = ensureDefaultProfile(options);
    return Object.values(registry.profiles).map(p => ({
        ...p.meta,
        belongsToHousehold: normalizeBelongsFlag(p.meta)
    }));
}

export function getProfileMeta(id, options = {}) {
    const registry = ensureDefaultProfile(options);
    const meta = registry.profiles[id]?.meta || null;
    if (!meta) return null;
    return { ...meta, belongsToHousehold: normalizeBelongsFlag(meta) };
}

export function getProfileData(id, options = {}) {
    const registry = ensureDefaultProfile(options);
    return registry.profiles[id]?.data || null;
}

export function createProfile(name, options = {}) {
    const {
        storage = localStorage
    } = options;
    const registry = ensureDefaultProfile(options);
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

    saveProfileRegistry(registry, storage);
    return registry.profiles[id].meta;
}

export function renameProfile(id, name, options = {}) {
    const {
        storage = localStorage
    } = options;
    const registry = ensureDefaultProfile(options);
    if (!registry.profiles[id]) return null;
    registry.profiles[id].meta.name = name || registry.profiles[id].meta.name;
    registry.profiles[id].meta.updatedAt = nowIso();
    saveProfileRegistry(registry, storage);
    return { ...registry.profiles[id].meta, belongsToHousehold: normalizeBelongsFlag(registry.profiles[id].meta) };
}

export function setProfileVerbundMembership(profileId, belongs, options = {}) {
    const {
        storage = localStorage
    } = options;
    const registry = ensureDefaultProfile(options);
    if (!registry.profiles[profileId]) return false;
    registry.profiles[profileId].meta.belongsToHousehold = Boolean(belongs);
    registry.profiles[profileId].meta.updatedAt = nowIso();
    return saveProfileRegistry(registry, storage);
}

export function deleteProfile(id, options = {}) {
    const {
        storage = localStorage
    } = options;
    const registry = ensureDefaultProfile(options);
    if (!registry.profiles[id]) return false;
    if (id === 'default' && Object.keys(registry.profiles).length <= 1) return false;
    delete registry.profiles[id];
    saveProfileRegistry(registry, storage);

    if (getCurrentProfileId(storage) === id) {
        const remainingIds = Object.keys(registry.profiles);
        setCurrentProfileId(remainingIds[0] || 'default', storage);
    }
    return true;
}

export function replaceProfileData(id, data, options = {}) {
    const {
        storage = localStorage
    } = options;
    const registry = ensureDefaultProfile(options);
    if (!registry.profiles[id]) return false;
    registry.profiles[id].data = data && typeof data === 'object' ? { ...data } : {};
    registry.profiles[id].meta.updatedAt = nowIso();
    return saveProfileRegistry(registry, storage);
}

export function updateProfileData(id, patch, options = {}) {
    const {
        storage = localStorage
    } = options;
    const registry = ensureDefaultProfile(options);
    if (!registry.profiles[id]) return false;
    const currentData = registry.profiles[id].data || {};
    registry.profiles[id].data = { ...currentData, ...patch };
    registry.profiles[id].meta.updatedAt = nowIso();
    return saveProfileRegistry(registry, storage);
}
