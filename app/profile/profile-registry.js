// @ts-check

import { PROFILE_LOAD_STATUS, PROFILE_STORAGE_KEYS } from './profile-state.js';
import { persistenceStorage } from '../shared/persistence-facade.js';

export const PROFILE_VERSION = 1;

const PROFILE_STORAGE_KEY = PROFILE_STORAGE_KEYS.registry;
const CURRENT_PROFILE_KEY = PROFILE_STORAGE_KEYS.current;

export class ProfileRegistryError extends Error {
    constructor(result, message) {
        super(message || result?.error?.message || 'Die Profilregistry konnte nicht sicher geladen werden.');
        this.name = 'ProfileRegistryError';
        this.code = result?.error?.code || 'PROFILE_REGISTRY_LOAD_FAILED';
        this.status = result?.status || PROFILE_LOAD_STATUS.CORRUPT;
        this.storageKey = result?.storageKey || PROFILE_STORAGE_KEY;
        this.raw = result?.raw ?? null;
        this.loadResult = result || null;
        this.recovery = result?.recovery || {
            status: this.status,
            scope: 'registry',
            storageKey: this.storageKey,
            raw: this.raw,
            code: this.code,
            message: this.message,
            canReset: this.status === PROFILE_LOAD_STATUS.CORRUPT && this.raw !== null
        };
    }
}

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

function createRegistryLoadResult(status, {
    value = null,
    raw = null,
    error = null
} = {}) {
    const result = {
        status,
        storageKey: PROFILE_STORAGE_KEY,
        value,
        raw,
        error
    };
    if (status === PROFILE_LOAD_STATUS.CORRUPT || status === PROFILE_LOAD_STATUS.UNAVAILABLE) {
        result.recovery = {
            status,
            scope: 'registry',
            storageKey: PROFILE_STORAGE_KEY,
            raw,
            code: error?.code || 'PROFILE_REGISTRY_LOAD_FAILED',
            message: error?.message || 'Die Profilregistry konnte nicht sicher geladen werden.',
            canReset: status === PROFILE_LOAD_STATUS.CORRUPT && raw !== null
        };
    }
    return result;
}

function validateProfileRegistryShape(parsed, raw) {
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return createRegistryLoadResult(PROFILE_LOAD_STATUS.CORRUPT, {
            raw,
            error: {
                code: 'PROFILE_REGISTRY_INVALID',
                message: 'Die Profilregistry enthaelt kein gueltiges Objekt.'
            }
        });
    }
    if (parsed.version !== undefined && parsed.version !== PROFILE_VERSION) {
        return createRegistryLoadResult(PROFILE_LOAD_STATUS.CORRUPT, {
            raw,
            error: {
                code: 'PROFILE_REGISTRY_VERSION_UNSUPPORTED',
                message: `Die Profilregistry-Version ${String(parsed.version)} wird nicht unterstuetzt.`
            }
        });
    }
    if (!parsed.profiles || typeof parsed.profiles !== 'object' || Array.isArray(parsed.profiles)) {
        return createRegistryLoadResult(PROFILE_LOAD_STATUS.CORRUPT, {
            raw,
            error: {
                code: 'PROFILE_REGISTRY_PROFILES_INVALID',
                message: 'Die Profilregistry enthaelt keine gueltige Profilliste.'
            }
        });
    }
    let needsNormalization = parsed.version !== PROFILE_VERSION;
    const normalizedProfiles = {};
    for (const [id, profile] of Object.entries(parsed.profiles)) {
        const meta = profile?.meta;
        const data = profile?.data;
        const hasExplicitMetaId = meta?.id !== undefined && meta?.id !== null && meta?.id !== '';
        if (!id
            || !profile
            || typeof profile !== 'object'
            || Array.isArray(profile)
            || !meta
            || typeof meta !== 'object'
            || Array.isArray(meta)
            || (hasExplicitMetaId && String(meta.id) !== id)
            || !data
            || typeof data !== 'object'
            || Array.isArray(data)
            || (meta.belongsToHousehold !== undefined && typeof meta.belongsToHousehold !== 'boolean')) {
            return createRegistryLoadResult(PROFILE_LOAD_STATUS.CORRUPT, {
                raw,
                error: {
                    code: 'PROFILE_REGISTRY_ENTRY_INVALID',
                    message: `Die Profilregistry enthaelt fuer ${id || 'unbekannt'} einen ungueltigen Profileintrag.`,
                    profileId: id || null
                }
            });
        }
        if (!hasExplicitMetaId) needsNormalization = true;
        normalizedProfiles[id] = hasExplicitMetaId
            ? profile
            : {
                ...profile,
                meta: {
                    ...meta,
                    id
                }
            };
    }
    const normalized = needsNormalization
        ? {
            ...parsed,
            version: PROFILE_VERSION,
            profiles: normalizedProfiles
        }
        : parsed;
    return createRegistryLoadResult(
        Object.keys(normalized.profiles).length > 0
            ? PROFILE_LOAD_STATUS.VALID
            : PROFILE_LOAD_STATUS.EMPTY,
        { raw, value: normalized }
    );
}

export function loadProfileRegistry(storage = persistenceStorage) {
    let raw;
    try {
        raw = storage.getItem(PROFILE_STORAGE_KEY);
    } catch (error) {
        return createRegistryLoadResult(PROFILE_LOAD_STATUS.UNAVAILABLE, {
            error: {
                code: 'PROFILE_REGISTRY_UNAVAILABLE',
                message: 'Die Profilregistry ist technisch nicht lesbar.',
                cause: error
            }
        });
    }
    if (raw === null || raw === undefined) {
        return createRegistryLoadResult(PROFILE_LOAD_STATUS.MISSING, {
            value: createEmptyProfileRegistry()
        });
    }
    if (raw === '') {
        return createRegistryLoadResult(PROFILE_LOAD_STATUS.EMPTY, {
            raw,
            value: createEmptyProfileRegistry()
        });
    }
    try {
        return validateProfileRegistryShape(JSON.parse(raw), raw);
    } catch (error) {
        return createRegistryLoadResult(PROFILE_LOAD_STATUS.CORRUPT, {
            raw,
            error: {
                code: 'PROFILE_REGISTRY_CORRUPT',
                message: 'Die Profilregistry enthaelt ungueltiges JSON.',
                cause: error
            }
        });
    }
}

export function getProfileRegistry(storage = persistenceStorage) {
    const result = loadProfileRegistry(storage);
    if (result.status === PROFILE_LOAD_STATUS.CORRUPT
        || result.status === PROFILE_LOAD_STATUS.UNAVAILABLE) {
        throw new ProfileRegistryError(result);
    }
    return result.value || createEmptyProfileRegistry();
}

function setStorageValue(storage, key, value, message) {
    try {
        storage.setItem(key, value);
    } catch (error) {
        const result = {
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            storageKey: key,
            raw: null,
            error: {
                code: 'PROFILE_STORAGE_UNAVAILABLE',
                message,
                cause: error
            },
            recovery: {
                status: PROFILE_LOAD_STATUS.UNAVAILABLE,
                scope: 'profile-context',
                storageKey: key,
                raw: null,
                code: 'PROFILE_STORAGE_UNAVAILABLE',
                message,
                canReset: false
            }
        };
        throw new ProfileRegistryError(result, message);
    }
}

function createProfileContextError({ storageKey, raw, registryRaw, code, message }) {
    const result = {
        status: PROFILE_LOAD_STATUS.CORRUPT,
        storageKey,
        raw,
        error: { code, message },
        recovery: {
            status: PROFILE_LOAD_STATUS.CORRUPT,
            scope: 'profile-context',
            storageKey,
            raw,
            registryRaw,
            code,
            message,
            canReset: raw !== null
        }
    };
    return new ProfileRegistryError(result, message);
}

export function saveProfileRegistry(registry, storage = persistenceStorage) {
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
        storage = persistenceStorage,
        captureProfileData = () => ({})
    } = options;

    const loadResult = loadProfileRegistry(storage);
    if (loadResult.status === PROFILE_LOAD_STATUS.CORRUPT
        || loadResult.status === PROFILE_LOAD_STATUS.UNAVAILABLE) {
        throw new ProfileRegistryError(loadResult);
    }
    const registry = loadResult.value || createEmptyProfileRegistry();
    if (Object.keys(registry.profiles).length > 0) {
        return registry;
    }

    const id = 'default';
    const createdAt = nowIso();
    registry.profiles[id] = {
        meta: { id, name: 'Default', createdAt, updatedAt: createdAt, belongsToHousehold: true },
        data: captureProfileData()
    };

    if (!saveProfileRegistry(registry, storage)) {
        throw new ProfileRegistryError({
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            storageKey: PROFILE_STORAGE_KEY,
            error: {
                code: 'PROFILE_REGISTRY_WRITE_FAILED',
                message: 'Das Default-Profil konnte nicht sicher gespeichert werden.'
            }
        });
    }
    let currentId;
    try {
        currentId = storage.getItem(CURRENT_PROFILE_KEY);
    } catch (error) {
        throw new ProfileRegistryError({
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            storageKey: CURRENT_PROFILE_KEY,
            error: {
                code: 'PROFILE_CURRENT_UNAVAILABLE',
                message: 'Die aktuelle Profil-ID ist technisch nicht lesbar.',
                cause: error
            }
        });
    }
    if (!currentId) {
        setStorageValue(storage, CURRENT_PROFILE_KEY, id, 'Die aktuelle Profil-ID konnte nicht gespeichert werden.');
    }

    return registry;
}

export function getCurrentProfileId(storage = persistenceStorage) {
    const registry = ensureDefaultProfile({ storage });
    const registryRaw = loadProfileRegistry(storage).raw;
    let currentId;
    try {
        currentId = storage.getItem(CURRENT_PROFILE_KEY);
    } catch (error) {
        throw new ProfileRegistryError({
            status: PROFILE_LOAD_STATUS.UNAVAILABLE,
            storageKey: CURRENT_PROFILE_KEY,
            error: {
                code: 'PROFILE_CURRENT_UNAVAILABLE',
                message: 'Die aktuelle Profil-ID ist technisch nicht lesbar.',
                cause: error
            }
        });
    }
    if (!currentId) {
        const preferredId = registry.profiles.default
            ? 'default'
            : Object.keys(registry.profiles)[0];
        setStorageValue(
            storage,
            CURRENT_PROFILE_KEY,
            preferredId,
            'Die aktuelle Profil-ID konnte nicht gespeichert werden.'
        );
        return preferredId;
    }
    if (!registry.profiles[currentId]) {
        throw createProfileContextError({
            storageKey: CURRENT_PROFILE_KEY,
            raw: currentId,
            registryRaw,
            code: 'PROFILE_CURRENT_GHOST',
            message: `Die aktuelle Profil-ID ${currentId} existiert nicht in der Profilregistry.`
        });
    }
    return currentId;
}

export function setCurrentProfileId(id, storage = persistenceStorage) {
    const registry = ensureDefaultProfile({ storage });
    const normalizedId = String(id || '');
    if (!registry.profiles[normalizedId]) {
        throw createProfileContextError({
            storageKey: CURRENT_PROFILE_KEY,
            raw: normalizedId,
            registryRaw: loadProfileRegistry(storage).raw,
            code: 'PROFILE_CURRENT_TARGET_MISSING',
            message: `Die Profil-ID ${normalizedId || 'leer'} existiert nicht in der Profilregistry.`
        });
    }
    setStorageValue(
        storage,
        CURRENT_PROFILE_KEY,
        normalizedId,
        'Die aktuelle Profil-ID konnte nicht gespeichert werden.'
    );
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
        storage = persistenceStorage
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
        storage = persistenceStorage
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
        storage = persistenceStorage
    } = options;
    const registry = ensureDefaultProfile(options);
    if (!registry.profiles[profileId]) return false;
    registry.profiles[profileId].meta.belongsToHousehold = Boolean(belongs);
    registry.profiles[profileId].meta.updatedAt = nowIso();
    return saveProfileRegistry(registry, storage);
}

export function deleteProfile(id, options = {}) {
    const {
        storage = persistenceStorage
    } = options;
    const registry = ensureDefaultProfile(options);
    if (!registry.profiles[id]) return false;
    if (id === 'default' && Object.keys(registry.profiles).length <= 1) return false;
    const currentId = getCurrentProfileId(storage);
    delete registry.profiles[id];
    saveProfileRegistry(registry, storage);

    if (currentId === id) {
        const remainingIds = Object.keys(registry.profiles);
        setCurrentProfileId(remainingIds[0] || 'default', storage);
    }
    return true;
}

export function replaceProfileData(id, data, options = {}) {
    const {
        storage = persistenceStorage
    } = options;
    const registry = ensureDefaultProfile(options);
    if (!registry.profiles[id]) return false;
    registry.profiles[id].data = data && typeof data === 'object' ? { ...data } : {};
    registry.profiles[id].meta.updatedAt = nowIso();
    return saveProfileRegistry(registry, storage);
}

export function updateProfileData(id, patch, options = {}) {
    const {
        storage = persistenceStorage
    } = options;
    const registry = ensureDefaultProfile(options);
    if (!registry.profiles[id]) return false;
    const currentData = registry.profiles[id].data || {};
    registry.profiles[id].data = { ...currentData, ...patch };
    registry.profiles[id].meta.updatedAt = nowIso();
    return saveProfileRegistry(registry, storage);
}
