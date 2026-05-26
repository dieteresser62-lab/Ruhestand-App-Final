// @ts-check

import { isProfileScopedKey, listProfileScopedKeys } from './profile-key-policy.js';
import { persistenceStorage } from '../shared/persistence-facade.js';

export function captureProfileData(storage = persistenceStorage) {
    // Snapshot aller profilbezogenen localStorage-Keys (z.B. Inputs, Tranchen).
    const data = {};
    const keys = listProfileScopedKeys(storage);
    for (const key of keys) {
        data[key] = storage.getItem(key);
    }
    return data;
}

export function clearProfileScopedKeys(storage = persistenceStorage) {
    const keys = listProfileScopedKeys(storage);
    keys.forEach(key => storage.removeItem(key));
}

export function loadProfileDataIntoLocalStorage(data, storage = persistenceStorage) {
    clearProfileScopedKeys(storage);
    if (!data || typeof data !== 'object') return;
    Object.entries(data).forEach(([key, value]) => {
        if (!isProfileScopedKey(key)) return;
        if (value === null || value === undefined) return;
        storage.setItem(key, String(value));
    });
}

export function hasProfileScopedDataInLocalStorage(storage = persistenceStorage) {
    return listProfileScopedKeys(storage).some(key => {
        const value = storage.getItem(key);
        return value !== null && value !== undefined && value !== '';
    });
}
