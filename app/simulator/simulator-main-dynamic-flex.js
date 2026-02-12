"use strict";

const DYNAMIC_FLEX_PRESETS = {
    off: {
        dynamicFlex: false,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1.0
    },
    konservativ: {
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 35,
        survivalQuantile: 0.9,
        goGoActive: false,
        goGoMultiplier: 1.0
    },
    ausgewogen: {
        dynamicFlex: true,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: true,
        goGoMultiplier: 1.1
    },
    offensiv: {
        dynamicFlex: true,
        horizonMethod: 'mean',
        horizonYears: 25,
        survivalQuantile: 0.75,
        goGoActive: true,
        goGoMultiplier: 1.2
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
    'goGoMultiplier'
];

function getCurrentDynamicFlexValues() {
    return {
        dynamicFlex: document.getElementById('dynamicFlex')?.checked === true,
        horizonMethod: document.getElementById('horizonMethod')?.value || 'survival_quantile',
        horizonYears: Number.parseFloat(document.getElementById('horizonYears')?.value) || 30,
        survivalQuantile: Number.parseFloat(document.getElementById('survivalQuantile')?.value) || 0.85,
        goGoActive: document.getElementById('goGoActive')?.checked === true,
        goGoMultiplier: Number.parseFloat(document.getElementById('goGoMultiplier')?.value) || 1.0
    };
}

function isPresetMatch(values, preset) {
    const EPS = 1e-9;
    return values.dynamicFlex === preset.dynamicFlex &&
        values.horizonMethod === preset.horizonMethod &&
        Math.abs(values.horizonYears - preset.horizonYears) < EPS &&
        Math.abs(values.survivalQuantile - preset.survivalQuantile) < EPS &&
        values.goGoActive === preset.goGoActive &&
        Math.abs(values.goGoMultiplier - preset.goGoMultiplier) < EPS;
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

    if (configContainer) {
        configContainer.style.opacity = dynamicFlexEnabled ? '1' : '0.65';
    }
}

export function initDynamicFlexControls(options = {}) {
    const storagePrefix = typeof options.storagePrefix === 'string' ? options.storagePrefix : 'sim_';
    const enableLocalPersistence = options.enableLocalPersistence !== false;
    const persist = () => {
        if (!enableLocalPersistence) return;
        if (typeof localStorage === 'undefined') return;
        DYNAMIC_FLEX_PERSIST_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (!el || el.dataset.noPersist) return;
            const key = storagePrefix + id;
            if (el.type === 'checkbox') {
                localStorage.setItem(key, el.checked ? 'true' : 'false');
            } else if (el.type !== 'radio') {
                localStorage.setItem(key, String(el.value));
            }
        });
    };

    const dynamicFlexToggle = document.getElementById('dynamicFlex');
    const presetSelect = document.getElementById('dynamicFlexPreset');
    const showAdvancedToggle = document.getElementById('dynamicFlexShowAdvanced');
    const goGoToggle = document.getElementById('goGoActive');
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
    ['horizonMethod', 'horizonYears', 'survivalQuantile', 'goGoMultiplier'].forEach(id => {
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
    dynamicFlexToggle.addEventListener('change', () => {
        syncDynamicFlexPresetSelection();
        refreshDynamicFlexControls();
        persist();
    });

    syncDynamicFlexPresetSelection();
    refreshDynamicFlexControls();
    persist();
}
