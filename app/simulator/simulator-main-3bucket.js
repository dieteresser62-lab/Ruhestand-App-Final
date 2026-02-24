"use strict";

import { STRATEGY_OPTIONS } from '../../types/strategy-options.js';

const LEGACY_STANDARD_MODES = new Set(['dynamic_flex', 'vpw', 'guardrails', 'fixed_real', 'none']);
const DEFAULTS = {
    bondTargetFactor: 5,
    drawdownTrigger: 15
};

function normalizeMode(modeRaw) {
    const mode = String(modeRaw || '').trim().toLowerCase();
    if (mode === STRATEGY_OPTIONS.THREE_BUCKET_JILGE) return STRATEGY_OPTIONS.THREE_BUCKET_JILGE;
    if (mode === STRATEGY_OPTIONS.STANDARD || LEGACY_STANDARD_MODES.has(mode) || mode === '') {
        return STRATEGY_OPTIONS.STANDARD;
    }
    return STRATEGY_OPTIONS.STANDARD;
}

function setDefaultIfEmpty(id, defaultValue) {
    const el = document.getElementById(id);
    if (!el) return;
    const raw = String(el.value ?? '').trim();
    if (raw !== '') return;
    el.value = String(defaultValue);
}

export function refreshThreeBucketControls() {
    const strategySelect = document.getElementById('entnahmeStrategie');
    const configGroup = document.getElementById('threeBucketConfigGroup');
    if (!strategySelect || !configGroup) return;
    const mode = normalizeMode(strategySelect.value);
    strategySelect.value = mode;
    const active = mode === STRATEGY_OPTIONS.THREE_BUCKET_JILGE;
    configGroup.style.display = active ? 'grid' : 'none';
    if (active) {
        setDefaultIfEmpty('bondTargetFactor', DEFAULTS.bondTargetFactor);
        setDefaultIfEmpty('drawdownTrigger', DEFAULTS.drawdownTrigger);
    }
}

export function initThreeBucketControls() {
    const strategySelect = document.getElementById('entnahmeStrategie');
    if (!strategySelect) return;
    strategySelect.addEventListener('change', () => {
        refreshThreeBucketControls();
    });
    refreshThreeBucketControls();
}

export function normalizeDecumulationMode(modeRaw) {
    return normalizeMode(modeRaw);
}

