// @ts-check

import { isProfileScopedKey, listProfileScopedKeys } from './profile-key-policy.js';
import { persistenceStorage } from '../shared/persistence-facade.js';

export class ProfileLiveStorageError extends Error {
    constructor(message, cause, rollbackError = null) {
        super(message);
        this.name = 'ProfileLiveStorageError';
        this.code = 'PROFILE_LIVE_STORAGE_UNAVAILABLE';
        this.status = 'unavailable';
        this.cause = cause;
        this.rollbackError = rollbackError;
    }
}

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

function normalizeProfileDataEntries(data) {
    if (!data || typeof data !== 'object' || Array.isArray(data)) return [];
    return Object.entries(data)
        .filter(([key, value]) => (
            isProfileScopedKey(key)
            && value !== null
            && value !== undefined
        ))
        .map(([key, value]) => [key, String(value)]);
}

function replaceProfileScopedData(entries, storage) {
    clearProfileScopedKeys(storage);
    entries.forEach(([key, value]) => storage.setItem(key, value));
}

export function loadProfileDataIntoLocalStorage(data, storage = persistenceStorage) {
    let nextEntries;
    let previousEntries;
    try {
        nextEntries = normalizeProfileDataEntries(data);
        previousEntries = Object.entries(captureProfileData(storage));
    } catch (error) {
        throw new ProfileLiveStorageError(
            'Der profilbezogene Live-State ist technisch nicht lesbar.',
            error
        );
    }
    try {
        replaceProfileScopedData(nextEntries, storage);
        return true;
    } catch (error) {
        let rollbackError = null;
        try {
            replaceProfileScopedData(previousEntries, storage);
        } catch (rollbackFailure) {
            rollbackError = rollbackFailure;
        }
        throw new ProfileLiveStorageError(
            rollbackError
                ? 'Der Profilwechsel ist fehlgeschlagen und der vorherige Live-State konnte nicht vollstaendig wiederhergestellt werden.'
                : 'Der Profilwechsel ist fehlgeschlagen; der vorherige Live-State wurde wiederhergestellt.',
            error,
            rollbackError
        );
    }
}

export function hasProfileScopedDataInLocalStorage(storage = persistenceStorage) {
    return listProfileScopedKeys(storage).some(key => {
        const value = storage.getItem(key);
        return value !== null && value !== undefined && value !== '';
    });
}
