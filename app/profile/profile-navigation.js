// @ts-check

import {
    bootstrapProfileContext,
    exportProfilesBundleToWindowName,
    saveCurrentProfileFromLocalStorage
} from './profile-storage.js';
import { PersistenceFacade } from '../shared/persistence-facade.js';

async function runPersistenceFlush(flusher) {
    if (typeof flusher !== 'function') return true;
    const result = await flusher();
    if (result === false) throw new Error('PERSISTENCE_FLUSH_FAILED');
    return true;
}

function showHandoffFailure(root) {
    const target = root?.getElementById?.('profileStatus');
    if (!target) return;
    target.textContent = 'Navigation abgebrochen: Die Profilwahl konnte nicht dauerhaft gespeichert werden. Bitte erneut versuchen.';
    target.dataset.kind = 'error';
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
        win = typeof window === 'undefined' ? null : window,
        onFailure = () => showHandoffFailure(root)
    } = options;

    if (!root || typeof root.querySelectorAll !== 'function') return 0;

    const links = Array.from(root.querySelectorAll(selector));
    let boundCount = 0;

    links.forEach(link => {
        if (!shouldHandleProfileHandoff(link)) return;
        if (link.dataset?.profileHandoffBound === 'true') return;
        link.addEventListener('click', async (event) => {
            const href = String(link.getAttribute('href') || '').trim();
            if (event && typeof event.preventDefault === 'function' && href && win?.location) {
                event.preventDefault();
            }
            try {
                if (link.dataset?.profileHandoffExport !== 'false') {
                    const exported = exporter();
                    if (exported === false) throw new Error('PROFILE_HANDOFF_EXPORT_FAILED');
                }
                await runPersistenceFlush(flusher);
                if (href && win?.location) win.location.href = href;
            } catch (error) {
                onFailure(error, link);
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
        try {
            saver();
        } catch (error) {
            console.error('[ProfileNavigation] Profil-Snapshot fehlgeschlagen:', error);
            return Promise.resolve(false);
        }
        return runPersistenceFlush(flusher).catch(error => {
            console.error('[ProfileNavigation] Persistenz-Flush fehlgeschlagen:', error);
            return false;
        });
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
    if (win?.__rsProfileIndexLifecycleInitialized) return false;
    bootstrapProfileContext();
    bindProfileNavigationHandoff({ root });
    installProfileBfcacheRefresh({ win });
    if (win) win.__rsProfileIndexLifecycleInitialized = true;
    return true;
}

export function initProfileSubpageLifecycle(options = {}) {
    const {
        win = window,
        doc = document
    } = options;

    if (win?.__rsProfileSubpageLifecycleInitialized) return false;
    bootstrapProfileContext({
        importFromWindowName: true,
        preserveLiveProfileData: true
    });
    installProfilePersistenceHooks({ win, doc });
    installProfileBfcacheRefresh({ win });
    if (win) win.__rsProfileSubpageLifecycleInitialized = true;
    return true;
}
