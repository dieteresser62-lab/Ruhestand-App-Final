"use strict";

import { persistenceStorage } from '../shared/persistence-facade.js';
import { LONGEVITY_DEFAULTS, normalizeLongevityMode } from './dynamic-flex-longevity-contract.js';

const DYNAMIC_FLEX_PRESETS = {
    off: {
        dynamicFlex: false,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1.0,
        longevityMode: 'none'
    },
    konservativ: {
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 35,
        survivalQuantile: 0.9,
        goGoActive: false,
        goGoMultiplier: 1.0,
        longevityMode: 'none'
    },
    ausgewogen: {
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: true,
        goGoMultiplier: 1.1,
        longevityMode: 'none'
    },
    offensiv: {
        dynamicFlex: true,
        horizonMethod: 'mean',
        horizonYears: 25,
        survivalQuantile: 0.75,
        goGoActive: true,
        goGoMultiplier: 1.2,
        longevityMode: 'none'
    }
};

function setDisabled(id, disabled) {
    const el = document.getElementById(id);
    if (!el) return;
    el.disabled = disabled;
}

function setValue(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.value = value;
}

function setChecked(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    el.checked = value === true;
}

const DYNAMIC_FLEX_PERSIST_IDS = [
    'dynamicFlexPreset',
    'dynamicFlexShowAdvanced',
    'dynamicFlex',
    'horizonMethod',
    'horizonYears',
    'survivalQuantile',
    'goGoActive',
    'goGoMultiplier',
    'longevityMode',
    'longevityQuantileShift',
    'longevityRelativePct',
    'longevityBufferYears'
];

function getCurrentDynamicFlexValues() {
    return {
        dynamicFlex: document.getElementById('dynamicFlex')?.checked === true,
        horizonMethod: document.getElementById('horizonMethod')?.value || 'survival_quantile',
        horizonYears: Number.parseFloat(document.getElementById('horizonYears')?.value) || 30,
        survivalQuantile: Number.parseFloat(document.getElementById('survivalQuantile')?.value) || 0.85,
        goGoActive: document.getElementById('goGoActive')?.checked === true,
        goGoMultiplier: Number.parseFloat(document.getElementById('goGoMultiplier')?.value) || 1.0,
        longevityMode: normalizeLongevityMode(document.getElementById('longevityMode')?.value || LONGEVITY_DEFAULTS.mode)
    };
}

function isPresetMatch(values, preset) {
    const EPS = 1e-9;
    return values.dynamicFlex === preset.dynamicFlex &&
        values.horizonMethod === preset.horizonMethod &&
        Math.abs(values.horizonYears - preset.horizonYears) < EPS &&
        Math.abs(values.survivalQuantile - preset.survivalQuantile) < EPS &&
        values.goGoActive === preset.goGoActive &&
        Math.abs(values.goGoMultiplier - preset.goGoMultiplier) < EPS &&
        values.longevityMode === preset.longevityMode;
}

function applyDynamicFlexPreset(presetKey, persistFn) {
    const preset = DYNAMIC_FLEX_PRESETS[presetKey];
    if (!preset) return;
    setChecked('dynamicFlex', preset.dynamicFlex);
    setValue('horizonMethod', preset.horizonMethod);
    setValue('horizonYears', preset.horizonYears);
    setValue('survivalQuantile', preset.survivalQuantile);
    setChecked('goGoActive', preset.goGoActive);
    setValue('goGoMultiplier', preset.goGoMultiplier);
    setValue('longevityMode', preset.longevityMode);
    setValue('longevityQuantileShift', LONGEVITY_DEFAULTS.quantileShift);
    setValue('longevityRelativePct', LONGEVITY_DEFAULTS.relativePct);
    setValue('longevityBufferYears', LONGEVITY_DEFAULTS.bufferYears);
    if (typeof persistFn === 'function') persistFn();
}

export function syncDynamicFlexPresetSelection() {
    const presetSelect = document.getElementById('dynamicFlexPreset');
    if (!presetSelect) return;
    const current = getCurrentDynamicFlexValues();
    const detected = Object.keys(DYNAMIC_FLEX_PRESETS).find(key => isPresetMatch(current, DYNAMIC_FLEX_PRESETS[key]));
    presetSelect.value = detected || 'custom';
    if (detected === 'off') {
        const showAdvancedToggle = document.getElementById('dynamicFlexShowAdvanced');
        if (showAdvancedToggle) {
            showAdvancedToggle.checked = false;
        }
    }
}

export function refreshDynamicFlexControls() {
    const presetValue = document.getElementById('dynamicFlexPreset')?.value || 'custom';
    const showAdvanced = document.getElementById('dynamicFlexShowAdvanced')?.checked === true;
    const showDetails = showAdvanced || presetValue === 'custom';
    const dynamicFlexEnabled = document.getElementById('dynamicFlex')?.checked === true;
    const longevityMode = normalizeLongevityMode(document.getElementById('longevityMode')?.value || LONGEVITY_DEFAULTS.mode);
    const goGoActive = document.getElementById('goGoActive')?.checked === true;
    const configContainer = document.getElementById('dynamicFlexConfigGroup');
    const advancedToggleRow = document.getElementById('dynamicFlexAdvancedToggleRow');

    if (advancedToggleRow) {
        advancedToggleRow.style.display = showDetails ? 'grid' : 'none';
    }
    if (configContainer) {
        configContainer.style.display = showDetails ? 'grid' : 'none';
    }

    setDisabled('dynamicFlex', !showDetails);
    setDisabled('horizonMethod', !showDetails || !dynamicFlexEnabled);
    setDisabled('horizonYears', !showDetails || !dynamicFlexEnabled);
    setDisabled('survivalQuantile', !showDetails || !dynamicFlexEnabled);
    setDisabled('goGoActive', !showDetails || !dynamicFlexEnabled);
    setDisabled('goGoMultiplier', !showDetails || !dynamicFlexEnabled || !goGoActive);
    setDisabled('longevityMode', !showDetails || !dynamicFlexEnabled);
    setDisabled('longevityQuantileShift', !showDetails || !dynamicFlexEnabled || longevityMode !== 'quantile_shift');
    setDisabled('longevityRelativePct', !showDetails || !dynamicFlexEnabled || longevityMode !== 'relative_horizon_buffer');
    setDisabled('longevityBufferYears', !showDetails || !dynamicFlexEnabled || longevityMode !== 'buffer_years');

    if (configContainer) {
        configContainer.style.opacity = dynamicFlexEnabled ? '1' : '0.65';
    }
}

export function initDynamicFlexControls(options = {}) {
    const storagePrefix = typeof options.storagePrefix === 'string' ? options.storagePrefix : 'sim_';
    const enableLocalPersistence = options.enableLocalPersistence !== false;
    const persist = () => {
        if (!enableLocalPersistence) return;
        DYNAMIC_FLEX_PERSIST_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el || el.dataset.noPersist) return;
            const key = storagePrefix + id;
            if (el.type === 'checkbox') {
                persistenceStorage.setItem(key, el.checked ? 'true' : 'false');
            } else if (el.type !== 'radio') {
                persistenceStorage.setItem(key, String(el.value));
            }
        });
    };

    const dynamicFlexToggle = document.getElementById('dynamicFlex');
    const presetSelect = document.getElementById('dynamicFlexPreset');
    const showAdvancedToggle = document.getElementById('dynamicFlexShowAdvanced');
    const goGoToggle = document.getElementById('goGoActive');
    const longevityModeSelect = document.getElementById('longevityMode');
    if (!dynamicFlexToggle) return;

    if (presetSelect) {
        presetSelect.addEventListener('change', () => {
            if (presetSelect.value !== 'custom') {
                applyDynamicFlexPreset(presetSelect.value, persist);
            }
            if (presetSelect.value === 'off') {
                const showAdvancedToggle = document.getElementById('dynamicFlexShowAdvanced');
                if (showAdvancedToggle) {
                    showAdvancedToggle.checked = false;
                }
            }
            refreshDynamicFlexControls();
            persist();
        });
    }
    if (showAdvancedToggle) {
        showAdvancedToggle.addEventListener('change', () => {
            refreshDynamicFlexControls();
            persist();
        });
    }
    dynamicFlexToggle.addEventListener('change', () => {
        refreshDynamicFlexControls();
        persist();
    });
    if (goGoToggle) {
        goGoToggle.addEventListener('change', () => {
            refreshDynamicFlexControls();
            persist();
        });
    }
    ['horizonMethod', 'horizonYears', 'survivalQuantile', 'goGoMultiplier', 'longevityMode', 'longevityQuantileShift', 'longevityRelativePct', 'longevityBufferYears'].forEach(id => {
        const el = document.getElementById(id);
        if (!el || !presetSelect) return;
        el.addEventListener('input', () => {
            syncDynamicFlexPresetSelection();
            refreshDynamicFlexControls();
            persist();
        });
        el.addEventListener('change', () => {
            syncDynamicFlexPresetSelection();
            refreshDynamicFlexControls();
            persist();
        });
    });
    if (goGoToggle && presetSelect) {
        goGoToggle.addEventListener('change', () => {
            syncDynamicFlexPresetSelection();
            refreshDynamicFlexControls();
            persist();
        });
    }
    if (longevityModeSelect && presetSelect) {
        longevityModeSelect.addEventListener('change', () => {
            syncDynamicFlexPresetSelection();
            refreshDynamicFlexControls();
            persist();
        });
    }
    dynamicFlexToggle.addEventListener('change', () => {
        syncDynamicFlexPresetSelection();
        refreshDynamicFlexControls();
        persist();
    });

    syncDynamicFlexPresetSelection();
    refreshDynamicFlexControls();
    persist();
}
