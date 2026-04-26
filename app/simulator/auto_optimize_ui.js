/**
 * Module: Auto-Optimize UI
 * Purpose: Facade for Auto-Optimize UI initialization and event wiring.
 * Dependencies: auto_optimize.js, auto-optimize-*.js
 */
"use strict";

import { runAutoOptimize } from './auto_optimize.js';
import { updateStartPortfolioDisplay } from './simulator-portfolio.js';
import { applyChampionToForm } from './auto-optimize-apply.js';
import {
    readAutoOptimizeConfigFromUI,
    setAutoOptimizeDefaultsInDOM,
    validateAutoOptimizeInputs
} from './auto-optimize-config-ui.js';
import { AUTO_OPTIMIZE_PRESETS } from './auto-optimize-presets.js';
import {
    appendAutoOptimizeApplySuccess,
    createAutoOptimizeParameterBlock,
    formatAutoOptimizeProgress,
    renderAutoOptimizeResult
} from './auto-optimize-renderer.js';

let aoParamCounter = 0;

function el(id) {
    return document.getElementById(id);
}

/**
 * Initialisiert das Auto-Optimize UI
 */
export function initAutoOptimizeUI() {
    const runBtn = el('ao_run_btn');
    const applyBtn = el('ao_apply_btn');
    if (!runBtn) return;

    bindMetricQuantileToggle();
    runBtn.addEventListener('click', async () => {
        await handleRunAutoOptimize();
    });

    if (applyBtn) {
        applyBtn.style.display = 'none';
        applyBtn.addEventListener('click', applyChampionToConfig);
    }

    el('ao_add_param_btn')?.addEventListener('click', () => addParameter());
    el('ao_remove_param_btn')?.addEventListener('click', removeParameter);

    initPresetButtons();
    applyPreset('standard');
    updateRunButtonState();
}

function bindMetricQuantileToggle() {
    const metricSelect = el('ao_metric');
    const quantileContainer = el('ao_quantile_container');
    if (!metricSelect || !quantileContainer) return;

    metricSelect.addEventListener('change', () => {
        const metric = metricSelect.value;
        quantileContainer.style.display = metric.startsWith('EndWealth_P') ? 'block' : 'none';
    });
    metricSelect.dispatchEvent(new Event('change'));
}

function initPresetButtons() {
    const container = el('ao_presets_container');
    if (!container) return;

    container.addEventListener('click', (e) => {
        const button = e.target.closest('.ao-preset-btn');
        if (!button) return;
        applyPreset(button.dataset.preset);

        container.querySelectorAll('.ao-preset-btn').forEach(btn => {
            btn.style.borderColor = '#ddd';
            btn.style.borderWidth = '1px';
        });
        button.style.borderColor = 'var(--secondary-color)';
        button.style.borderWidth = '2px';
    });
}

function applyPreset(presetKey) {
    const preset = AUTO_OPTIMIZE_PRESETS[presetKey];
    if (!preset) {
        console.error(`Unknown preset: ${presetKey}`);
        return;
    }

    const container = el('ao_parameters_container');
    if (!container) return;
    container.innerHTML = '';
    aoParamCounter = 0;

    el('ao_metric').value = preset.objective.metric;
    el('ao_direction').value = preset.objective.direction;
    el('ao_metric').dispatchEvent(new Event('change'));

    el('ao_c_sr99').checked = preset.constraints.sr99;
    el('ao_c_noex').checked = preset.constraints.noex;
    el('ao_c_ts45').checked = preset.constraints.ts45;
    el('ao_c_dd55').checked = preset.constraints.dd55;

    for (const param of preset.params) {
        addParameter(param);
    }

    const dynamicFlexModeSelect = el('ao_dynamic_flex_mode');
    if (dynamicFlexModeSelect) {
        dynamicFlexModeSelect.value = preset.dynamicFlexMode || 'inherit';
    }
    updateParameterButtonStates();
    updateRunButtonState();
}

function addParameter(defaults = null) {
    const container = el('ao_parameters_container');
    if (!container) return;
    const paramCount = container.children.length;
    if (paramCount >= 7) {
        alert('Maximal 7 Parameter erlaubt.');
        return;
    }

    const paramDiv = createAutoOptimizeParameterBlock({
        paramId: aoParamCounter++,
        paramNumber: paramCount + 1,
        defaults
    });
    container.appendChild(paramDiv);
    attachParameterValidationListeners(paramDiv);
    updateParameterButtonStates();
    updateRunButtonState();
}

function removeParameter() {
    const container = el('ao_parameters_container');
    if (!container) return;
    const paramCount = container.children.length;
    if (paramCount <= 1) {
        alert('Mindestens 1 Parameter erforderlich.');
        return;
    }

    container.removeChild(container.lastChild);
    updateParameterButtonStates();
    updateRunButtonState();
}

function updateParameterButtonStates() {
    const container = el('ao_parameters_container');
    if (!container) return;
    const paramCount = container.children.length;
    const addBtn = el('ao_add_param_btn');
    const removeBtn = el('ao_remove_param_btn');
    if (addBtn) addBtn.disabled = paramCount >= 7;
    if (removeBtn) removeBtn.disabled = paramCount <= 1;
}

function attachParameterValidationListeners(paramDiv) {
    const inputs = paramDiv.querySelectorAll('input, select');
    for (const input of inputs) {
        input.addEventListener('change', updateRunButtonState);
        input.addEventListener('input', updateRunButtonState);
    }
}

function updateRunButtonState() {
    const runBtn = el('ao_run_btn');
    if (!runBtn) return;
    runBtn.disabled = !validateAutoOptimizeInputs();
}

async function handleRunAutoOptimize() {
    const runBtn = el('ao_run_btn');
    const progressEl = el('ao_progress');
    const resultEl = el('ao_result');
    const applyBtn = el('ao_apply_btn');

    runBtn.disabled = true;
    progressEl.textContent = 'Starting...';
    progressEl.style.display = 'block';
    resultEl.innerHTML = '';
    resultEl.style.display = 'none';
    applyBtn.style.display = 'none';

    try {
        const config = readAutoOptimizeConfigFromUI();
        config.onProgress = (status) => {
            const message = formatAutoOptimizeProgress(status);
            if (message) progressEl.textContent = message;
        };

        const result = await runAutoOptimize(config);
        window.aoChampionResult = result;
        renderAutoOptimizeResult({ resultEl, result, objective: config.objective });
        applyBtn.style.display = 'inline-block';
    } catch (e) {
        alert('Error during auto-optimization:\n\n' + e.message);
        console.error(e);
        progressEl.textContent = 'Error: ' + e.message;
    } finally {
        runBtn.disabled = false;
    }
}

function applyChampionToConfig() {
    if (!window.aoChampionResult) {
        alert('No champion result available');
        return;
    }

    applyChampionToForm({ championCfg: window.aoChampionResult.championCfg });
    updateStartPortfolioDisplay();
    appendAutoOptimizeApplySuccess({ resultEl: el('ao_result') });
}

export function setAutoOptimizeDefaults() {
    setAutoOptimizeDefaultsInDOM();
}
