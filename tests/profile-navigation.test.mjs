"use strict";

import {
    bindProfileNavigationHandoff,
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
        click() {
            const handler = listeners.get('click');
            if (handler) handler();
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

    const bound = bindProfileNavigationHandoff({
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

    assertEqual(bound, 1, 'Only eligible links should be bound');
    eligible.click();
    ignored.click();
    assertEqual(exportCount, 1, 'Only eligible link click should trigger export');
    assertEqual(flushCount, 1, 'Eligible link click should trigger persistence flush');

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

console.log('✅ Profile navigation lifecycle validated');
