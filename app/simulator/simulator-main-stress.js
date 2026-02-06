"use strict";

import { STRESS_PRESETS } from './simulator-data.js';

export function initStressPresetOptions() {
    const stressSelect = document.getElementById('stressPreset');
    if (!stressSelect) return;
    // Populate preset list from static configuration.
    Object.entries(STRESS_PRESETS).forEach(([key, preset]) => {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = preset.label;
        stressSelect.appendChild(option);
    });
}
