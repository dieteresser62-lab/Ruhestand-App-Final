import { CONFIG } from '../balance/balance-config.js';
import { PROFILE_SCOPED_FIXED_KEYS } from './profile-state.js';
import { persistenceStorage } from '../shared/persistence-facade.js';

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

export function isProfileScopedKey(key) {
    if (!key) return false;
    if (EXACT_KEYS.has(key)) return true;
    if (FIXED_KEYS.has(key)) return true;
    for (const prefix of PREFIX_KEYS) {
        if (key.startsWith(prefix)) return true;
    }
    return false;
}

export function listProfileScopedKeys(storage = persistenceStorage) {
    const keys = new Set();

    FIXED_KEYS.forEach(key => {
        if (storage.getItem(key) !== null) keys.add(key);
    });
    EXACT_KEYS.forEach(key => {
        if (storage.getItem(key) !== null) keys.add(key);
    });

    try {
        for (let i = 0; i < storage.length; i++) {
            const key = storage.key(i);
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

    try {
        const allKeys = Object.keys(storage);
        for (const key of allKeys) {
            if (!key || !isProfileScopedKey(key)) continue;
            keys.add(key);
        }
    } catch {
        // no-op
    }

    return Array.from(keys);
}
