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

const PREFIXES = [
    CONFIG.STORAGE.SNAPSHOT_PREFIX,
    'sim_',
    'sim.',
    'balance_expenses_'
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
