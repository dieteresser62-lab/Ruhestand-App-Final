// @ts-check

import { CONFIG } from '../balance/balance-config.js';
import {
    PROFILE_SCOPED_FIXED_KEYS,
    PROFILE_STORAGE_KEYS
} from '../profile/profile-state.js';

export const LEGACY_MIGRATION_MARKER_KEYS = Object.freeze({
    target: 'ruhestandsapp_migrated_to_target',
    completedAt: 'ruhestandsapp_migration_completed_at',
    checksum: 'ruhestandsapp_migration_checksum'
});

const EXACT_KEYS = new Set([
    CONFIG.STORAGE.LS_KEY,
    CONFIG.STORAGE.MIGRATION_FLAG,
    PROFILE_STORAGE_KEYS.registry,
    PROFILE_STORAGE_KEYS.current,
    PROFILE_STORAGE_KEYS.active,
    'etfProxyUrl',
    'etfProxyUrls',
    'enableWorkerTelemetry',
    'household_withdrawal_mode',
    'featureFlags',
    ...Object.values(LEGACY_MIGRATION_MARKER_KEYS),
    ...PROFILE_SCOPED_FIXED_KEYS
]);

const SNAPSHOT_CAPTURE_EXACT_KEYS = new Set([
    CONFIG.STORAGE.LS_KEY,
    CONFIG.STORAGE.MIGRATION_FLAG,
    PROFILE_STORAGE_KEYS.registry,
    PROFILE_STORAGE_KEYS.current,
    PROFILE_STORAGE_KEYS.active,
    'etfProxyUrl',
    'etfProxyUrls',
    'household_withdrawal_mode',
    ...Object.values(LEGACY_MIGRATION_MARKER_KEYS),
    ...PROFILE_SCOPED_FIXED_KEYS
]);

const PROFILE_SELECTOR_KEYS = new Set([
    PROFILE_STORAGE_KEYS.current,
    PROFILE_STORAGE_KEYS.active
]);

const TECHNICAL_EXACT_KEYS = new Set([
    'enableWorkerTelemetry',
    'featureFlags'
]);

const PREFIXES = [
    CONFIG.STORAGE.SNAPSHOT_PREFIX,
    'sim_',
    'sim.',
    'balance_expenses_'
];

const SNAPSHOT_DOMAIN_PREFIXES = [
    'sim_',
    'sim.',
    'balance_expenses_'
];

const TECHNICAL_PREFIXES = [
    'debug_',
    'layout_',
    'telemetry_',
    'ui_',
    'window_'
];

export function isAllowedPersistenceImportKey(key) {
    if (!key) return false;
    const normalized = String(key);
    if (EXACT_KEYS.has(normalized)) return true;
    return PREFIXES.some(prefix => normalized.startsWith(prefix));
}

export function listAllowedPersistenceImportKeys(storage = globalThis.localStorage) {
    const keys = [];
    if (!storage || typeof storage.length !== 'number' || typeof storage.key !== 'function') {
        return keys;
    }
    for (let i = 0; i < storage.length; i += 1) {
        const key = storage.key(i);
        if (isAllowedPersistenceImportKey(key)) keys.push(String(key));
    }
    return keys;
}

export function isLegacySnapshotKey(key) {
    if (!key) return false;
    return String(key).startsWith(CONFIG.STORAGE.SNAPSHOT_PREFIX);
}

export function isProfileRegistryKey(key) {
    return String(key || '') === PROFILE_STORAGE_KEYS.registry;
}

export function isProfileScopedFixedKey(key) {
    return PROFILE_SCOPED_FIXED_KEYS.includes(String(key || ''));
}

export function isSnapshotProfileScopedKey(key) {
    const normalized = String(key || '');
    return isProfileScopedFixedKey(normalized) || PROFILE_SELECTOR_KEYS.has(normalized) || isProfileRegistryKey(normalized);
}

export function isSnapshotTechnicalKey(key) {
    if (!key) return false;
    const normalized = String(key);
    if (TECHNICAL_EXACT_KEYS.has(normalized)) return true;
    return TECHNICAL_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

export function isSnapshotGlobalDomainKey(key) {
    if (!key) return false;
    const normalized = String(key);
    if (isLegacySnapshotKey(normalized) || isSnapshotProfileScopedKey(normalized) || isSnapshotTechnicalKey(normalized)) {
        return false;
    }
    if (SNAPSHOT_CAPTURE_EXACT_KEYS.has(normalized)) return true;
    return SNAPSHOT_DOMAIN_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

export function isAllowedSnapshotCaptureKey(key) {
    if (!key) return false;
    const normalized = String(key);
    if (isLegacySnapshotKey(normalized) || isSnapshotTechnicalKey(normalized)) return false;
    if (SNAPSHOT_CAPTURE_EXACT_KEYS.has(normalized)) return true;
    return SNAPSHOT_DOMAIN_PREFIXES.some(prefix => normalized.startsWith(prefix));
}

function registryHasProfile(registry, profileId) {
    if (!profileId) return false;
    if (!registry || typeof registry !== 'object') return false;
    if (registry.profiles && typeof registry.profiles === 'object') {
        return Object.prototype.hasOwnProperty.call(registry.profiles, profileId);
    }
    return Object.prototype.hasOwnProperty.call(registry, profileId);
}

export function isAllowedSnapshotRestoreLiveKey(key, options = {}) {
    if (!key) return false;
    const normalized = String(key);
    if (isLegacySnapshotKey(normalized) || isSnapshotTechnicalKey(normalized)) return false;

    const mode = options.mode === 'full' ? 'full' : 'standard';
    if (mode === 'full') {
        return isAllowedSnapshotCaptureKey(normalized) || isProfileRegistryKey(normalized);
    }

    if (isProfileRegistryKey(normalized)) {
        return Boolean(options.allowProfileRegistry);
    }

    if (PROFILE_SELECTOR_KEYS.has(normalized) || isProfileScopedFixedKey(normalized)) {
        return registryHasProfile(options.currentRegistry, options.snapshotActiveProfileId);
    }

    return isSnapshotGlobalDomainKey(normalized);
}
