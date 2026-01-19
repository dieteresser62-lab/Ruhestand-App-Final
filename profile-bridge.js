// @ts-check

import {
    ensureProfileRegistry,
    getCurrentProfileId,
    getActiveProfileId,
    loadProfileIntoLocalStorage,
    saveCurrentProfileFromLocalStorage
} from './profile-storage.js';

function initProfileBridge() {
    ensureProfileRegistry();

    const currentId = getCurrentProfileId();
    const activeId = getActiveProfileId();

    if (activeId === currentId) {
        saveCurrentProfileFromLocalStorage();
    } else {
        loadProfileIntoLocalStorage(currentId);
    }

    window.addEventListener('beforeunload', () => {
        saveCurrentProfileFromLocalStorage();
    });

    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'hidden') {
            saveCurrentProfileFromLocalStorage();
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileBridge);
} else {
    initProfileBridge();
}