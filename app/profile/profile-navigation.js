// @ts-check

import {
    bootstrapProfileContext,
    exportProfilesBundleToWindowName,
    saveCurrentProfileFromLocalStorage
} from './profile-storage.js';
import { PersistenceFacade } from '../shared/persistence-facade.js';

function runPersistenceFlush(flusher) {
    if (typeof flusher !== 'function') return true;
    try {
        const result = flusher();
        if (result && typeof result.catch === 'function') {
            result.catch(err => console.error('[ProfileNavigation] Persistenz-Flush fehlgeschlagen:', err));
        }
        return result;
    } catch (err) {
        console.error('[ProfileNavigation] Persistenz-Flush fehlgeschlagen:', err);
        return false;
    }
}

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
        exporter = exportProfilesBundleToWindowName,
        flusher = PersistenceFacade.flush,
        win = typeof window === 'undefined' ? null : window
    } = options;

    if (!root || typeof root.querySelectorAll !== 'function') return 0;

    const links = Array.from(root.querySelectorAll(selector));
    let boundCount = 0;

    links.forEach(link => {
        if (!shouldHandleProfileHandoff(link)) return;
        if (link.dataset?.profileHandoffBound === 'true') return;
        link.addEventListener('click', (event) => {
            exporter();
            const flushResult = runPersistenceFlush(flusher);
            const href = String(link.getAttribute('href') || '').trim();
            if (
                event &&
                typeof event.preventDefault === 'function' &&
                flushResult &&
                typeof flushResult.finally === 'function' &&
                href &&
                win?.location
            ) {
                event.preventDefault();
                flushResult.finally(() => {
                    win.location.href = href;
                });
            }
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
        saver = saveCurrentProfileFromLocalStorage,
        flusher = PersistenceFacade.flush
    } = options;

    if (!win || !doc) return false;
    if (win.__rsProfilePersistenceHooksInstalled) return false;

    const persist = () => {
        saver();
        return runPersistenceFlush(flusher);
    };

    win.addEventListener('beforeunload', persist);

    doc.addEventListener('visibilitychange', () => {
        if (doc.visibilityState === 'hidden') {
            persist();
        }
    });

    win.__rsProfilePersistenceHooksInstalled = true;
    return true;
}

export function installProfileBfcacheRefresh(options = {}) {
    const {
        win = window,
        reload = () => win?.location?.reload?.()
    } = options;

    if (!win || typeof win.addEventListener !== 'function') return false;
    if (win.__rsProfileBfcacheRefreshInstalled) return false;

    win.addEventListener('pageshow', event => {
        if (event?.persisted) {
            reload();
        }
    });

    win.__rsProfileBfcacheRefreshInstalled = true;
    return true;
}

export function initProfileIndexLifecycle(options = {}) {
    const {
        root = document,
        win = window
    } = options;
    bootstrapProfileContext();
    bindProfileNavigationHandoff({ root });
    installProfileBfcacheRefresh({ win });
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
    installProfileBfcacheRefresh({ win });
}
