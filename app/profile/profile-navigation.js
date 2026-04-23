// @ts-check

import {
    bootstrapProfileContext,
    exportProfilesBundleToWindowName,
    saveCurrentProfileFromLocalStorage
} from './profile-storage.js';

export function shouldHandleProfileHandoff(link) {
    if (!link || typeof link.getAttribute !== 'function') return false;
    if (link.dataset?.profileHandoff === 'false') return false;
    if (!link.hasAttribute('data-profile-handoff')) return false;
    if (link.hasAttribute('download')) return false;

    const href = String(link.getAttribute('href') || '').trim();
    if (!href || href.startsWith('#') || href.startsWith('javascript:')) return false;

    const target = String(link.getAttribute('target') || '').toLowerCase();
    if (target && target !== '_self') return false;

    return true;
}

export function bindProfileNavigationHandoff(options = {}) {
    const {
        root = document,
        selector = 'a[href][data-profile-handoff]',
        exporter = exportProfilesBundleToWindowName
    } = options;

    if (!root || typeof root.querySelectorAll !== 'function') return 0;

    const links = Array.from(root.querySelectorAll(selector));
    let boundCount = 0;

    links.forEach(link => {
        if (!shouldHandleProfileHandoff(link)) return;
        if (link.dataset?.profileHandoffBound === 'true') return;
        link.addEventListener('click', () => {
            exporter();
        });
        if (link.dataset) {
            link.dataset.profileHandoffBound = 'true';
        }
        boundCount += 1;
    });

    return boundCount;
}

export function installProfilePersistenceHooks(options = {}) {
    const {
        win = window,
        doc = document,
        saver = saveCurrentProfileFromLocalStorage
    } = options;

    if (!win || !doc) return false;
    if (win.__rsProfilePersistenceHooksInstalled) return false;

    win.addEventListener('beforeunload', () => {
        saver();
    });

    doc.addEventListener('visibilitychange', () => {
        if (doc.visibilityState === 'hidden') {
            saver();
        }
    });

    win.__rsProfilePersistenceHooksInstalled = true;
    return true;
}

export function initProfileIndexLifecycle(options = {}) {
    const { root = document } = options;
    bootstrapProfileContext();
    bindProfileNavigationHandoff({ root });
}

export function initProfileSubpageLifecycle(options = {}) {
    const {
        win = window,
        doc = document
    } = options;

    bootstrapProfileContext({
        importFromWindowName: true,
        preserveLiveProfileData: true
    });
    installProfilePersistenceHooks({ win, doc });
}
