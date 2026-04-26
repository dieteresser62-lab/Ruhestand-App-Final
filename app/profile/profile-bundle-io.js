// @ts-check

import { PROFILE_STORAGE_KEYS } from './profile-state.js';
import { PROFILE_VERSION, getProfileRegistry } from './profile-registry.js';
import { loadProfileDataIntoLocalStorage } from './profile-live-storage.js';

export const WINDOW_NAME_BUNDLE_PREFIX = 'RUHESTAND_PROFILE_BUNDLE:';

const PROFILE_STORAGE_KEY = PROFILE_STORAGE_KEYS.registry;
const CURRENT_PROFILE_KEY = PROFILE_STORAGE_KEYS.current;
const ACTIVE_PROFILE_KEY = PROFILE_STORAGE_KEYS.active;
const GLOBAL_KEYS = ['etfProxyUrl', 'etfProxyUrls', 'enableWorkerTelemetry'];

function nowIso() {
    return new Date().toISOString();
}

function loadProfileFromRegistryIntoStorage(id, storage = localStorage) {
    const registry = getProfileRegistry(storage);
    const profile = registry.profiles[id];
    if (!profile) return false;
    loadProfileDataIntoLocalStorage(profile.data, storage);
    storage.setItem(ACTIVE_PROFILE_KEY, id);
    return true;
}

export function exportProfilesBundle(options = {}) {
    const {
        storage = localStorage,
        saveCurrentProfile = null
    } = options;

    if (typeof saveCurrentProfile === 'function') {
        saveCurrentProfile();
    }

    const registry = getProfileRegistry(storage);
    const currentProfileId = storage.getItem(CURRENT_PROFILE_KEY) || 'default';
    const globals = {};
    GLOBAL_KEYS.forEach(key => {
        const val = storage.getItem(key);
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
        storage = localStorage,
        loadProfileIntoLocalStorage = (id) => loadProfileFromRegistryIntoStorage(id, storage)
    } = options;

    if (!bundle || typeof bundle !== 'object') {
        return { ok: false, message: 'Ungueltige Import-Datei.' };
    }
    if (!bundle.registry || typeof bundle.registry !== 'object' || !bundle.registry.profiles) {
        return { ok: false, message: 'Registry fehlt oder ist ungueltig.' };
    }

    try {
        storage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(bundle.registry));
    } catch (err) {
        console.error('[ProfileStorage] Import fehlgeschlagen:', err);
        return { ok: false, message: 'Speicher voll: Import konnte nicht geschrieben werden.' };
    }

    const nextProfileId = String(bundle.currentProfileId || 'default');
    storage.setItem(CURRENT_PROFILE_KEY, nextProfileId);

    if (bundle.globals && typeof bundle.globals === 'object') {
        Object.entries(bundle.globals).forEach(([key, value]) => {
            if (value === null || value === undefined) return;
            storage.setItem(key, String(value));
        });
    }

    const loaded = loadProfileIntoLocalStorage(nextProfileId);
    if (!loaded) {
        return { ok: false, message: 'Import gespeichert, aber Profil konnte nicht geladen werden.' };
    }
    return { ok: true, message: 'Import erfolgreich.' };
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
