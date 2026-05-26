// @ts-check

import { initProfileSubpageLifecycle } from './profile-navigation.js';
import { init as initPersistence } from '../shared/persistence-facade.js';

async function initProfileBridge() {
    await initPersistence();
    initProfileSubpageLifecycle();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileBridge);
} else {
    initProfileBridge();
}
