/**
 * Module: Auto-Optimize Apply
 * Purpose: Apply champion optimizer parameters to simulator form controls.
 */
"use strict";

import { AUTO_OPTIMIZE_PARAM_FORM_IDS } from './auto-optimize-param-meta.js';

export function applyChampionToForm({ championCfg, doc = globalThis.document, EventCtor = globalThis.Event }) {
    if (!championCfg || typeof championCfg !== 'object') return;

    for (const [paramKey, value] of Object.entries(championCfg)) {
        const formId = AUTO_OPTIMIZE_PARAM_FORM_IDS[paramKey];
        if (!formId) continue;
        const input = doc?.getElementById?.(formId);
        if (!input) continue;
        input.value = value;
        input.dispatchEvent(new EventCtor('change', { bubbles: true }));
    }

    if (championCfg.goGoMultiplier !== undefined) {
        const goGoActive = doc?.getElementById?.('goGoActive');
        if (goGoActive) {
            goGoActive.checked = true;
            goGoActive.dispatchEvent(new EventCtor('change', { bubbles: true }));
        }
    }
}

