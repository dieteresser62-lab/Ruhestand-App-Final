"use strict";

import {
    bindProfileNavigationHandoff,
    installProfileBfcacheRefresh,
    installProfilePersistenceHooks,
    shouldHandleProfileHandoff
} from '../app/profile/profile-navigation.js';

console.log('--- Profile Navigation Tests ---');

function createLink({ href = 'Balance.html', attrs = {}, dataset = {} } = {}) {
    const listeners = new Map();
    const attrMap = new Map(Object.entries({ href, ...attrs }));
    return {
        dataset: { ...dataset },
        hasAttribute(name) {
            return attrMap.has(name);
        },
        getAttribute(name) {
            return attrMap.has(name) ? attrMap.get(name) : null;
        },
        addEventListener(type, handler) {
            listeners.set(type, handler);
        },
        async click() {
            const handler = listeners.get('click');
            const event = {
                defaultPrevented: false,
                preventDefault() { this.defaultPrevented = true; }
            };
            this.lastEvent = event;
            if (handler) await handler(event);
            return event;
        }
    };
}

console.log('Test 1: shouldHandleProfileHandoff respects explicit opt-in');
{
    const eligible = createLink({ attrs: { 'data-profile-handoff': '' } });
    const noOptIn = createLink();
    const hashOnly = createLink({ href: '#section', attrs: { 'data-profile-handoff': '' } });
    const newWindow = createLink({ attrs: { 'data-profile-handoff': '', target: '_blank' } });

    assertEqual(shouldHandleProfileHandoff(eligible), true, 'Opt-in link should be eligible');
    assertEqual(shouldHandleProfileHandoff(noOptIn), false, 'Link without opt-in should be ignored');
    assertEqual(shouldHandleProfileHandoff(hashOnly), false, 'Hash-only link should be ignored');
    assertEqual(shouldHandleProfileHandoff(newWindow), false, 'New-window link should be ignored');
}
console.log('✓ shouldHandleProfileHandoff OK');

console.log('Test 2: bindProfileNavigationHandoff exports on eligible link clicks');
{
    let exportCount = 0;
    let flushCount = 0;
    const eligible = createLink({ attrs: { 'data-profile-handoff': '' } });
    const ignored = createLink();
    const root = {
        querySelectorAll() {
            return [eligible, ignored];
        }
    };

    const win = { location: { href: 'index.html' } };
    const bound = bindProfileNavigationHandoff({
        root,
        exporter: () => {
            exportCount += 1;
            return true;
        },
        flusher: () => {
            flushCount += 1;
            return true;
        },
        win
    });

    assertEqual(bound, 1, 'Only eligible links should be bound');
    const event = await eligible.click();
    await ignored.click();
    assertEqual(exportCount, 1, 'Only eligible link click should trigger export');
    assertEqual(flushCount, 1, 'Eligible link click should trigger persistence flush');
    assertEqual(event.defaultPrevented, true, 'Eligible navigation should wait for confirmed flush');
    assertEqual(win.location.href, 'Balance.html', 'Successful flush should navigate to target');

    const rebound = bindProfileNavigationHandoff({
        root,
        exporter: () => {
            exportCount += 1;
            return true;
        },
        flusher: () => {
            flushCount += 1;
            return true;
        }
    });
    assertEqual(rebound, 0, 'Already bound links should not be bound twice');
}
console.log('✓ bindProfileNavigationHandoff OK');

console.log('Test 2b: manager handoff skips raw bundle export and blocks failed navigation');
{
    let exportCount = 0;
    let flushCount = 0;
    let failureCount = 0;
    let releaseFlush;
    const pendingFlush = new Promise(resolve => { releaseFlush = resolve; });
    const managerLink = createLink({
        href: 'depot-tranchen-manager.html',
        attrs: { 'data-profile-handoff': '' },
        dataset: { profileHandoffExport: 'false' }
    });
    const root = { querySelectorAll: () => [managerLink] };
    const win = { location: { href: 'index.html' } };

    bindProfileNavigationHandoff({
        root,
        exporter: () => { exportCount += 1; return true; },
        flusher: () => { flushCount += 1; return pendingFlush; },
        onFailure: () => { failureCount += 1; },
        win
    });

    const clickPromise = managerLink.click();
    assertEqual(managerLink.lastEvent.defaultPrevented, true, 'Manager click should prevent early navigation');
    assertEqual(win.location.href, 'index.html', 'Navigation should remain pending before flush');
    assertEqual(exportCount, 0, 'Manager handoff must not copy profile payload to window.name');
    assertEqual(flushCount, 1, 'Manager handoff should flush selected profile');
    releaseFlush(true);
    await clickPromise;
    assertEqual(win.location.href, 'depot-tranchen-manager.html', 'Confirmed flush should navigate to manager');

    const failingLink = createLink({ attrs: { 'data-profile-handoff': '' } });
    const failingWin = { location: { href: 'index.html' } };
    bindProfileNavigationHandoff({
        root: { querySelectorAll: () => [failingLink] },
        exporter: () => true,
        flusher: async () => { throw new Error('offline'); },
        onFailure: () => { failureCount += 1; },
        win: failingWin
    });
    await failingLink.click();
    assertEqual(failingWin.location.href, 'index.html', 'Flush rejection should block navigation');
    assertEqual(failureCount, 1, 'Flush rejection should invoke visible failure handler');
}
console.log('✓ manager handoff ordering and failure contract OK');

console.log('Test 3: installProfilePersistenceHooks only installs once');
{
    let saveCount = 0;
    let flushCount = 0;
    const winListeners = new Map();
    const docListeners = new Map();
    const win = {
        __rsProfilePersistenceHooksInstalled: false,
        addEventListener(type, handler) {
            winListeners.set(type, handler);
        }
    };
    const doc = {
        visibilityState: 'visible',
        addEventListener(type, handler) {
            docListeners.set(type, handler);
        }
    };

    const first = installProfilePersistenceHooks({
        win,
        doc,
        saver: () => {
            saveCount += 1;
            return true;
        },
        flusher: () => {
            flushCount += 1;
            return true;
        }
    });
    const second = installProfilePersistenceHooks({
        win,
        doc,
        saver: () => {
            saveCount += 1;
            return true;
        },
        flusher: () => {
            flushCount += 1;
            return true;
        }
    });

    assertEqual(first, true, 'First install should register hooks');
    assertEqual(second, false, 'Second install should be ignored');

    winListeners.get('beforeunload')();
    doc.visibilityState = 'hidden';
    docListeners.get('visibilitychange')();
    assertEqual(saveCount, 2, 'Both persistence hooks should call saver');
    assertEqual(flushCount, 2, 'Both persistence hooks should flush persistence');
}
console.log('✓ installProfilePersistenceHooks OK');

console.log('Test 4: installProfileBfcacheRefresh reloads stale browser cache');
{
    let reloadCount = 0;
    const winListeners = new Map();
    const win = {
        __rsProfileBfcacheRefreshInstalled: false,
        addEventListener(type, handler) {
            winListeners.set(type, handler);
        }
    };

    const first = installProfileBfcacheRefresh({
        win,
        reload: () => {
            reloadCount += 1;
        }
    });
    const second = installProfileBfcacheRefresh({
        win,
        reload: () => {
            reloadCount += 1;
        }
    });

    assertEqual(first, true, 'First BFCache hook install should register listener');
    assertEqual(second, false, 'Second BFCache hook install should be ignored');

    winListeners.get('pageshow')({ persisted: false });
    assertEqual(reloadCount, 0, 'Normal pageshow should not reload');

    winListeners.get('pageshow')({ persisted: true });
    assertEqual(reloadCount, 1, 'BFCache restore should reload page');
}
console.log('✓ installProfileBfcacheRefresh OK');

console.log('✅ Profile navigation lifecycle validated');
