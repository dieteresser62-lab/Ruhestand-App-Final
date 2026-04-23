// @ts-check

import { initProfileSubpageLifecycle } from './profile-navigation.js';

function initProfileBridge() {
    initProfileSubpageLifecycle();
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initProfileBridge);
} else {
    initProfileBridge();
}
