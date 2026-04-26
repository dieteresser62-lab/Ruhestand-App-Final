/**
 * Module: Auto-Optimize Config UI
 * Purpose: Read and validate optimizer config from DOM controls.
 */
"use strict";

import { AUTO_OPTIMIZE_DYNAMIC_FLEX_PARAM_KEYS } from './auto-optimize-param-meta.js';

function getEl(id, doc = globalThis.document) {
    return doc?.getElementById?.(id) || null;
}

function readNumberInput(id, doc, parser = Number.parseFloat) {
    const value = getEl(id, doc)?.value;
    return parser(String(value ?? ''), 10);
}

export function readAutoOptimizeConfigFromUI(doc = globalThis.document) {
    const metric = getEl('ao_metric', doc)?.value;
    const direction = getEl('ao_direction', doc)?.value;
    const quantileEl = getEl('ao_quantile', doc);
    const quantile = quantileEl ? Number.parseFloat(quantileEl.value) : 50;
    const objective = { metric, direction, quantile };

    const params = {};
    const container = getEl('ao_parameters_container', doc);
    const paramBlocks = container?.querySelectorAll?.('.ao-parameter-block') || [];
    if (paramBlocks.length === 0) {
        throw new Error('Mindestens 1 Parameter erforderlich');
    }

    for (let i = 0; i < paramBlocks.length; i++) {
        const block = paramBlocks[i];
        const key = block.querySelector('.ao-param-key')?.value;
        const min = Number.parseFloat(block.querySelector('.ao-param-min')?.value);
        const max = Number.parseFloat(block.querySelector('.ao-param-max')?.value);
        const step = Number.parseFloat(block.querySelector('.ao-param-step')?.value);

        if (!key || Number.isNaN(min) || Number.isNaN(max) || Number.isNaN(step)) {
            throw new Error(`Parameter ${i + 1} incomplete`);
        }
        if (min > max) {
            throw new Error(`Parameter ${i + 1}: min > max`);
        }
        if (step <= 0) {
            throw new Error(`Parameter ${i + 1}: step must be > 0`);
        }
        if (params[key]) {
            throw new Error(`Duplicate parameter: ${key}`);
        }

        params[key] = { min, max, step };
    }

    const runsPerCandidate = readNumberInput('ao_runs_per_candidate', doc, Number.parseInt);
    const seedsTrain = readNumberInput('ao_seeds_train', doc, Number.parseInt);
    const seedsTest = readNumberInput('ao_seeds_test', doc, Number.parseInt);

    if (Number.isNaN(runsPerCandidate) || runsPerCandidate < 100 || runsPerCandidate > 10000) {
        throw new Error('Runs per candidate must be 100-10000');
    }
    if (Number.isNaN(seedsTrain) || seedsTrain < 1 || seedsTrain > 20) {
        throw new Error('Train seeds must be 1-20');
    }
    if (Number.isNaN(seedsTest) || seedsTest < 1 || seedsTest > 20) {
        throw new Error('Test seeds must be 1-20');
    }

    const constraints = {
        sr99: getEl('ao_c_sr99', doc)?.checked ?? false,
        noex: getEl('ao_c_noex', doc)?.checked ?? false,
        ts45: getEl('ao_c_ts45', doc)?.checked ?? false,
        dd55: getEl('ao_c_dd55', doc)?.checked ?? false
    };
    const dynamicFlexModeRaw = getEl('ao_dynamic_flex_mode', doc)?.value || 'inherit';
    const dynamicFlexMode = ['inherit', 'force_on', 'force_off'].includes(dynamicFlexModeRaw)
        ? dynamicFlexModeRaw
        : 'inherit';

    const hasDynamicFlexParams = Object.keys(params).some(key => AUTO_OPTIMIZE_DYNAMIC_FLEX_PARAM_KEYS.has(key));
    if (hasDynamicFlexParams) {
        const dynamicFlexChecked = getEl('dynamicFlex', doc)?.checked === true;
        const effectiveDynamicFlexOn = (dynamicFlexMode === 'force_on') || (dynamicFlexMode === 'inherit' && dynamicFlexChecked);
        if (!effectiveDynamicFlexOn) {
            throw new Error('Dynamic-Flex Parameter gewaehlt, aber Dynamic Flex ist effektiv AUS (Modus oder Rahmendaten anpassen).');
        }
    }

    return {
        objective,
        params,
        runsPerCandidate,
        seedsTrain,
        seedsTest,
        constraints,
        maxDauer: 35,
        dynamicFlexMode
    };
}

export function validateAutoOptimizeInputs(doc = globalThis.document) {
    try {
        const config = readAutoOptimizeConfigFromUI(doc);
        return Object.keys(config.params).length >= 1;
    } catch {
        return false;
    }
}

export function setAutoOptimizeDefaultsInDOM(doc = globalThis.document) {
    const metricSelect = getEl('ao_metric', doc);
    if (metricSelect && !metricSelect.value) metricSelect.value = 'SuccessRate';

    const directionSelect = getEl('ao_direction', doc);
    if (directionSelect && !directionSelect.value) directionSelect.value = 'max';

    const runsInput = getEl('ao_runs_per_candidate', doc);
    if (runsInput && !runsInput.value) runsInput.value = '2000';

    const seedsTrainInput = getEl('ao_seeds_train', doc);
    if (seedsTrainInput && !seedsTrainInput.value) seedsTrainInput.value = '5';

    const seedsTestInput = getEl('ao_seeds_test', doc);
    if (seedsTestInput && !seedsTestInput.value) seedsTestInput.value = '2';

    const dynamicFlexModeSelect = getEl('ao_dynamic_flex_mode', doc);
    if (dynamicFlexModeSelect && !dynamicFlexModeSelect.value) dynamicFlexModeSelect.value = 'inherit';

    const sr99 = getEl('ao_c_sr99', doc);
    const noex = getEl('ao_c_noex', doc);
    if (sr99 && sr99.checked === false) sr99.checked = true;
    if (noex && noex.checked === false) noex.checked = true;
}

