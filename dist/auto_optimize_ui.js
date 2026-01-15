"use strict";

/**
 * =============================================================================
 * AUTO-OPTIMIZE UI WIRING
 * =============================================================================
 *
 * UI-Orchestrierung für das Auto-Optimize-Feature:
 * - DOM-Event-Handling
 * - Input-Validierung
 * - Fortschrittsanzeige
 * - Ergebnis-Rendering
 * - "Übernehmen"-Funktionalität
 */

import { runAutoOptimize } from './auto_optimize.js';
import { formatCurrency } from './simulator-utils.js';
import { updateStartPortfolioDisplay } from './simulator-portfolio.js';

// Global parameter counter
let aoParamCounter = 0;

/**
 * Preset-Definitionen für verschiedene Optimierungs-Strategien
 */
const PRESETS = {
    standard: {
        name: '📊 Standard',
        description: 'Ausgewogene Optimierung der 3 Haupt-Parameter',
        objective: { metric: 'SuccessRate', direction: 'max' },
        constraints: { sr99: true, noex: true, ts45: false, dd55: false },
        params: [
            { key: 'runwayMinM', min: 18, max: 36, step: 2 },
            { key: 'runwayTargetM', min: 24, max: 48, step: 2 },
            { key: 'goldTargetPct', min: 0, max: 10, step: 1 }
        ]
    },
    runway: {
        name: '🛫 Runway Optimierung',
        description: 'Fokus auf optimale Runway-Konfiguration',
        objective: { metric: 'SuccessRate', direction: 'max' },
        constraints: { sr99: true, noex: true, ts45: false, dd55: false },
        params: [
            { key: 'runwayMinM', min: 12, max: 30, step: 2 },
            { key: 'runwayTargetM', min: 18, max: 42, step: 2 },
            { key: 'rebalBand', min: 2, max: 10, step: 1 }
        ]
    },
    allocation: {
        name: '📈 Asset Allocation',
        description: 'Optimierung der Vermögensaufteilung',
        objective: { metric: 'EndWealth_P50', direction: 'max' },
        constraints: { sr99: true, noex: false, ts45: false, dd55: false },
        params: [
            { key: 'goldTargetPct', min: 0, max: 15, step: 1 },
            { key: 'targetEq', min: 40, max: 80, step: 5 },
            { key: 'rebalBand', min: 2, max: 10, step: 1 }
        ]
    },
    conservative: {
        name: '🛡️ Konservativ',
        description: 'Hohe Sicherheit, minimale Risiken',
        objective: { metric: 'SuccessRate', direction: 'max' },
        constraints: { sr99: true, noex: true, ts45: true, dd55: true },
        params: [
            { key: 'runwayTargetM', min: 30, max: 60, step: 3 },
            { key: 'goldTargetPct', min: 5, max: 15, step: 1 },
            { key: 'maxSkimPct', min: 10, max: 30, step: 2 }
        ]
    },
    aggressive: {
        name: '🚀 Aggressiv',
        description: 'Maximales Endvermögen',
        objective: { metric: 'EndWealth_P50', direction: 'max' },
        constraints: { sr99: true, noex: false, ts45: false, dd55: false },
        params: [
            { key: 'targetEq', min: 60, max: 90, step: 5 },
            { key: 'maxSkimPct', min: 20, max: 50, step: 5 },
            { key: 'maxBearRefillPct', min: 30, max: 70, step: 5 }
        ]
    },
    drawdown: {
        name: '📉 Drawdown-Minimierung',
        description: 'Minimierung von Verlusten',
        objective: { metric: 'Drawdown_P90', direction: 'min' },
        constraints: { sr99: true, noex: true, ts45: false, dd55: true },
        params: [
            { key: 'goldTargetPct', min: 5, max: 20, step: 2 },
            { key: 'targetEq', min: 30, max: 60, step: 5 },
            { key: 'rebalBand', min: 3, max: 8, step: 1 }
        ]
    }
};

/**
 * Initialisiert das Auto-Optimize UI
 */
export function initAutoOptimizeUI() {
    const runBtn = document.getElementById('ao_run_btn');
    const applyBtn = document.getElementById('ao_apply_btn');

    if (!runBtn) {
        console.warn('Auto-Optimize UI elements not found');
        return;
    }

    // Metric-Change: Zeige/Verstecke Quantile-Input
    const metricSelect = document.getElementById('ao_metric');
    const quantileContainer = document.getElementById('ao_quantile_container');

    if (metricSelect && quantileContainer) {
        metricSelect.addEventListener('change', () => {
            const metric = metricSelect.value;
            const needsQuantile = metric.startsWith('EndWealth_P');
            quantileContainer.style.display = needsQuantile ? 'block' : 'none';
        });
        // Initial trigger
        metricSelect.dispatchEvent(new Event('change'));
    }

    // Run-Button
    runBtn.addEventListener('click', async () => {
        await handleRunAutoOptimize();
    });

    // Apply-Button (initial hidden)
    if (applyBtn) {
        applyBtn.style.display = 'none';
        applyBtn.addEventListener('click', () => {
            applyChampionToConfig();
        });
    }

    // Parameter-Management Buttons
    document.getElementById('ao_add_param_btn').addEventListener('click', () => {
        addParameter();
    });

    document.getElementById('ao_remove_param_btn').addEventListener('click', () => {
        removeParameter();
    });

    // Preset Buttons
    initPresetButtons();

    // Initialisiere mit Standard-Preset (statt fest 3 Parameter)
    applyPreset('standard');

    // Initial Validation
    updateRunButtonState();
}

/**
 * Initialisiert Preset-Buttons
 */
function initPresetButtons() {
    const container = document.getElementById('ao_presets_container');
    if (!container) {
        console.warn('Presets container not found');
        return;
    }

    // Event-Delegation für Preset-Buttons
    container.addEventListener('click', (e) => {
        const button = e.target.closest('.ao-preset-btn');
        if (button) {
            const presetKey = button.dataset.preset;
            applyPreset(presetKey);

            // Visuelles Feedback: Highlight selected preset
            container.querySelectorAll('.ao-preset-btn').forEach(btn => {
                btn.style.borderColor = '#ddd';
                btn.style.borderWidth = '1px';
            });
            button.style.borderColor = 'var(--secondary-color)';
            button.style.borderWidth = '2px';
        }
    });
}

/**
 * Wendet ein Preset an
 * @param {string} presetKey - Preset-Schlüssel aus PRESETS
 */
function applyPreset(presetKey) {
    const preset = PRESETS[presetKey];
    if (!preset) {
        console.error(`Unknown preset: ${presetKey}`);
        return;
    }



    // 1. Lösche alle vorhandenen Parameter
    const container = document.getElementById('ao_parameters_container');
    container.innerHTML = '';
    aoParamCounter = 0;

    // 2. Setze Objective
    document.getElementById('ao_metric').value = preset.objective.metric;
    document.getElementById('ao_direction').value = preset.objective.direction;

    // Trigger metric change event for quantile visibility
    document.getElementById('ao_metric').dispatchEvent(new Event('change'));

    // 3. Setze Constraints
    document.getElementById('ao_c_sr99').checked = preset.constraints.sr99;
    document.getElementById('ao_c_noex').checked = preset.constraints.noex;
    document.getElementById('ao_c_ts45').checked = preset.constraints.ts45;
    document.getElementById('ao_c_dd55').checked = preset.constraints.dd55;

    // 4. Füge Parameter hinzu
    for (const param of preset.params) {
        addParameter(param);
    }

    // 5. Update UI
    updateParameterButtonStates();
    updateRunButtonState();
}

/**
 * Initialisiert Standard-Parameter (3 Stück)
 * DEPRECATED: Wird nicht mehr verwendet, stattdessen applyPreset('standard')
 */
function initDefaultParameters() {
    const defaults = [
        { key: 'runwayMinM', min: 18, max: 36, step: 2 },
        { key: 'runwayTargetM', min: 24, max: 48, step: 2 },
        { key: 'goldTargetPct', min: 0, max: 10, step: 1 }
    ];

    for (const def of defaults) {
        addParameter(def);
    }
}

/**
 * Fügt einen neuen Parameter hinzu
 * @param {object} defaults - Optional: Default-Werte {key, min, max, step}
 */
function addParameter(defaults = null) {
    const container = document.getElementById('ao_parameters_container');
    const paramCount = container.children.length;

    if (paramCount >= 7) {
        alert('Maximal 7 Parameter erlaubt.');
        return;
    }

    const paramId = aoParamCounter++;
    const paramDiv = document.createElement('div');
    paramDiv.id = `ao_param_${paramId}`;
    paramDiv.className = 'ao-parameter-block';
    paramDiv.style.cssText = 'border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 10px;';

    const paramOptions = `
        <option value="runwayMinM">Runway Min (Monate)</option>
        <option value="runwayTargetM">Runway Target (Monate)</option>
        <option value="goldTargetPct">Gold Target (%)</option>
        <option value="targetEq">Target Eq (%)</option>
        <option value="rebalBand">Rebal Band (%)</option>
        <option value="maxSkimPct">Max Skim (%)</option>
        <option value="maxBearRefillPct">Max Bear Refill (%)</option>
    `;

    paramDiv.innerHTML = `
        <h5 style="margin-top: 0; margin-bottom: 10px;">Parameter ${paramCount + 1}</h5>
        <div class="form-grid-four-col">
            <div class="form-group">
                <label>Key</label>
                <select class="ao-param-key" data-param-id="${paramId}">
                    ${paramOptions}
                </select>
            </div>
            <div class="form-group">
                <label>Min</label>
                <input type="number" class="ao-param-min" data-param-id="${paramId}" value="${defaults?.min ?? 0}" step="0.1">
            </div>
            <div class="form-group">
                <label>Max</label>
                <input type="number" class="ao-param-max" data-param-id="${paramId}" value="${defaults?.max ?? 100}" step="0.1">
            </div>
            <div class="form-group">
                <label>Step</label>
                <input type="number" class="ao-param-step" data-param-id="${paramId}" value="${defaults?.step ?? 1}" step="0.1" min="0.1">
            </div>
        </div>
    `;

    container.appendChild(paramDiv);

    // Setze Default-Key wenn vorhanden
    if (defaults?.key) {
        const select = paramDiv.querySelector('.ao-param-key');
        select.value = defaults.key;
    }

    // Attach validation listeners
    attachParameterValidationListeners(paramDiv);

    // Update button states
    updateParameterButtonStates();
    updateRunButtonState();
}

/**
 * Entfernt den letzten Parameter
 */
function removeParameter() {
    const container = document.getElementById('ao_parameters_container');
    const paramCount = container.children.length;

    if (paramCount <= 1) {
        alert('Mindestens 1 Parameter erforderlich.');
        return;
    }

    container.removeChild(container.lastChild);
    updateParameterButtonStates();
    updateRunButtonState();
}

/**
 * Updated die Aktivierung der Add/Remove Buttons
 */
function updateParameterButtonStates() {
    const container = document.getElementById('ao_parameters_container');
    const paramCount = container.children.length;

    document.getElementById('ao_add_param_btn').disabled = paramCount >= 7;
    document.getElementById('ao_remove_param_btn').disabled = paramCount <= 1;
}

/**
 * Hängt Validierungs-Listener an einen Parameter-Block
 */
function attachParameterValidationListeners(paramDiv) {
    const inputs = paramDiv.querySelectorAll('input, select');
    for (const input of inputs) {
        input.addEventListener('change', updateRunButtonState);
        input.addEventListener('input', updateRunButtonState);
    }
}

/**
 * Validiert Eingaben und aktiviert/deaktiviert Run-Button
 */
function updateRunButtonState() {
    const runBtn = document.getElementById('ao_run_btn');
    if (!runBtn) return;

    const isValid = validateInputs();
    runBtn.disabled = !isValid;
}

/**
 * Validiert alle Eingaben
 * @returns {boolean} true wenn valide
 */
function validateInputs() {
    try {
        const config = readConfigFromUI();

        // Mindestens 1 Parameter erforderlich
        if (Object.keys(config.params).length < 1) {
            return false;
        }

        return true;
    } catch (e) {
        console.warn('Validation error:', e);
        return false;
    }
}

/**
 * Liest Config aus UI
 * @returns {object} Config-Objekt
 */
function readConfigFromUI() {
    // Objective
    const metric = document.getElementById('ao_metric').value;
    const direction = document.getElementById('ao_direction').value;
    const quantileEl = document.getElementById('ao_quantile');
    const quantile = quantileEl ? parseFloat(quantileEl.value) : 50;

    const objective = { metric, direction, quantile };

    // Parameter (dynamisch)
    const params = {};
    const container = document.getElementById('ao_parameters_container');
    const paramBlocks = container.querySelectorAll('.ao-parameter-block');

    if (paramBlocks.length === 0) {
        throw new Error('Mindestens 1 Parameter erforderlich');
    }

    for (let i = 0; i < paramBlocks.length; i++) {
        const block = paramBlocks[i];
        const key = block.querySelector('.ao-param-key').value;
        const min = parseFloat(block.querySelector('.ao-param-min').value);
        const max = parseFloat(block.querySelector('.ao-param-max').value);
        const step = parseFloat(block.querySelector('.ao-param-step').value);

        if (!key || isNaN(min) || isNaN(max) || isNaN(step)) {
            throw new Error(`Parameter ${i + 1} incomplete`);
        }

        if (min > max) {
            throw new Error(`Parameter ${i + 1}: min > max`);
        }

        if (step <= 0) {
            throw new Error(`Parameter ${i + 1}: step must be > 0`);
        }

        // Check for duplicate keys
        if (params[key]) {
            throw new Error(`Duplicate parameter: ${key}`);
        }

        params[key] = { min, max, step };
    }

    // Runs & Seeds
    const runsPerCandidate = parseInt(document.getElementById('ao_runs_per_candidate').value, 10);
    const seedsTrain = parseInt(document.getElementById('ao_seeds_train').value, 10);
    const seedsTest = parseInt(document.getElementById('ao_seeds_test').value, 10);

    if (isNaN(runsPerCandidate) || runsPerCandidate < 100 || runsPerCandidate > 10000) {
        throw new Error('Runs per candidate must be 100-10000');
    }

    if (isNaN(seedsTrain) || seedsTrain < 1 || seedsTrain > 20) {
        throw new Error('Train seeds must be 1-20');
    }

    if (isNaN(seedsTest) || seedsTest < 1 || seedsTest > 20) {
        throw new Error('Test seeds must be 1-20');
    }

    // Constraints
    const constraints = {
        sr99: document.getElementById('ao_c_sr99')?.checked ?? false,
        noex: document.getElementById('ao_c_noex')?.checked ?? false,
        ts45: document.getElementById('ao_c_ts45')?.checked ?? false,
        dd55: document.getElementById('ao_c_dd55')?.checked ?? false
    };

    // Max Duration (fest oder aus MC-Tab übernommen)
    const maxDauer = 35;

    return {
        objective,
        params,
        runsPerCandidate,
        seedsTrain,
        seedsTest,
        constraints,
        maxDauer
    };
}

/**
 * Hauptfunktion: Startet Auto-Optimize
 */
async function handleRunAutoOptimize() {
    const runBtn = document.getElementById('ao_run_btn');
    const progressEl = document.getElementById('ao_progress');
    const resultEl = document.getElementById('ao_result');
    const applyBtn = document.getElementById('ao_apply_btn');

    runBtn.disabled = true;
    progressEl.textContent = 'Starting...';
    progressEl.style.display = 'block';
    resultEl.innerHTML = '';
    resultEl.style.display = 'none';
    applyBtn.style.display = 'none';

    try {
        const config = readConfigFromUI();

        // Progress Callback
        config.onProgress = (status) => {
            if (status.stage === 'lhs') {
                progressEl.textContent = 'Generating candidates (Latin Hypercube Sampling)...';
            } else if (status.stage === 'quick_filter') {
                const pct = Math.round((status.progress / status.total) * 100);
                progressEl.textContent = `⚡ Quick-Filter (fast evaluation): ${status.progress}/${status.total} (${pct}%)`;
            } else if (status.stage === 'evaluate_lhs') {
                const pct = Math.round((status.progress / status.total) * 100);
                progressEl.textContent = `🔍 Full evaluation (top candidates): ${status.progress}/${status.total} (${pct}%)`;
            } else if (status.stage === 'refine') {
                if (status.total) {
                    const pct = Math.round((status.progress / status.total) * 100);
                    progressEl.textContent = `🎯 Refining top-5 candidates: ${status.progress}/${status.total} (${pct}%)`;
                } else {
                    progressEl.textContent = '🎯 Refining top-5 candidates (local search)...';
                }
            } else if (status.stage === 'validate') {
                const pct = Math.round((status.progress / status.total) * 100);
                progressEl.textContent = `✅ Validating on test seeds: ${status.progress}/${status.total} (${pct}%)`;
            } else if (status.stage === 'done') {
                progressEl.textContent = '✨ Optimization complete!';
            }
        };

        const result = await runAutoOptimize(config);

        // Store result globally for "Apply"
        window.aoChampionResult = result;

        // Render result
        renderResult(result, config.objective);

        // Show Apply button
        applyBtn.style.display = 'inline-block';

    } catch (e) {
        alert('Error during auto-optimization:\n\n' + e.message);
        console.error(e);
        progressEl.textContent = 'Error: ' + e.message;
    } finally {
        runBtn.disabled = false;
    }
}

/**
 * Rendert das Ergebnis
 * @param {object} result - {championCfg, metricsTest, deltaVsCurrent, stability}
 * @param {object} objective - Objective-Config
 */
function renderResult(result, objective) {
    const resultEl = document.getElementById('ao_result');
    const { championCfg, metricsTest, deltaVsCurrent, stability } = result;

    const stabilityPct = Math.round(stability * 100);
    const stabilityColor = stabilityPct >= 80 ? '#4caf50' : stabilityPct >= 60 ? '#ff9800' : '#f44336';

    // Parameter-Labels für Anzeige
    const paramLabels = {
        runwayMinM: 'Runway Min',
        runwayTargetM: 'Runway Target',
        goldTargetPct: 'Gold Target',
        targetEq: 'Target Eq',
        rebalBand: 'Rebal Band',
        maxSkimPct: 'Max Skim',
        maxBearRefillPct: 'Max Bear Refill'
    };

    const paramUnits = {
        runwayMinM: 'Monate',
        runwayTargetM: 'Monate',
        goldTargetPct: '%',
        targetEq: '%',
        rebalBand: '%',
        maxSkimPct: '%',
        maxBearRefillPct: '%'
    };

    // Generiere Parameter-Cards dynamisch
    let paramCardsHtml = '';
    for (const [key, value] of Object.entries(championCfg)) {
        const label = paramLabels[key] || key;
        const unit = paramUnits[key] || '';
        const displayValue = typeof value === 'number' ? value.toFixed(1) : value;

        paramCardsHtml += `
            <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">${label}</div>
                <div style="font-size: 1.5rem; font-weight: 600; color: var(--secondary-color);">
                    ${displayValue} ${unit}
                </div>
            </div>
        `;
    }

    let html = `
        <div style="border: 2px solid var(--secondary-color); border-radius: 8px; padding: 20px; background: #f9f9f9; margin-top: 20px;">
            <h3 style="margin-top: 0; color: var(--secondary-color);">🏆 Champion Configuration</h3>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
                ${paramCardsHtml}
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <h4 style="margin-top: 0;">Key Metrics (Test Seeds)</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div>
                        <strong>Success Rate:</strong>
                        <span style="margin-left: 10px;">${((metricsTest.successProbFloor ?? 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                        <strong>P90 Drawdown:</strong>
                        <span style="margin-left: 10px;">${((metricsTest.worst5Drawdown ?? 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                        <strong>End Wealth P50:</strong>
                        <span style="margin-left: 10px;">${formatCurrency(metricsTest.medianEndWealth ?? 0)}</span>
                    </div>
                    <div>
                        <strong>Time Share WR > 4.5%:</strong>
                        <span style="margin-left: 10px;">${((metricsTest.timeShareWRgt45 ?? 0) * 100).toFixed(2)}%</span>
                    </div>
                </div>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <h4 style="margin-top: 0;">Delta vs. Current Configuration</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div>
                        <strong>Success Rate:</strong>
                        <span style="margin-left: 10px; color: ${deltaVsCurrent.successRate >= 0 ? '#4caf50' : '#f44336'};">
                            ${deltaVsCurrent.successRate >= 0 ? '+' : ''}${(deltaVsCurrent.successRate * 100).toFixed(2)}%
                        </span>
                    </div>
                    <div>
                        <strong>P90 Drawdown:</strong>
                        <span style="margin-left: 10px; color: ${deltaVsCurrent.drawdownP90 <= 0 ? '#4caf50' : '#f44336'};">
                            ${deltaVsCurrent.drawdownP90 >= 0 ? '+' : ''}${(deltaVsCurrent.drawdownP90 * 100).toFixed(2)}%
                        </span>
                    </div>
                    <div>
                        <strong>End Wealth P50:</strong>
                        <span style="margin-left: 10px; color: ${deltaVsCurrent.endWealthP50 >= 0 ? '#4caf50' : '#f44336'};">
                            ${deltaVsCurrent.endWealthP50 >= 0 ? '+' : ''}${formatCurrency(deltaVsCurrent.endWealthP50)}
                        </span>
                    </div>
                    <div>
                        <strong>Time Share WR > 4.5%:</strong>
                        <span style="margin-left: 10px; color: ${deltaVsCurrent.timeShareWRgt45 <= 0 ? '#4caf50' : '#f44336'};">
                            ${deltaVsCurrent.timeShareWRgt45 >= 0 ? '+' : ''}${(deltaVsCurrent.timeShareWRgt45 * 100).toFixed(2)}%
                        </span>
                    </div>
                </div>
            </div>

            <div style="background: ${stabilityColor}; color: white; padding: 15px; border-radius: 6px; text-align: center;">
                <h4 style="margin: 0;">Stability Score: ${stabilityPct}%</h4>
                <p style="margin: 5px 0 0 0; font-size: 0.9rem;">
                    ${stabilityPct >= 80 ? '✓ Highly stable across seed sets' :
            stabilityPct >= 60 ? '⚠ Moderately stable' : '⚠ Low stability - consider more seeds'}
                </p>
            </div>
        </div>
    `;

    resultEl.innerHTML = html;
    resultEl.style.display = 'block';
}

/**
 * Übernimmt Champion-Config in die Rahmendaten
 */
function applyChampionToConfig() {
    if (!window.aoChampionResult) {
        alert('No champion result available');
        return;
    }

    const { championCfg } = window.aoChampionResult;

    // Mapping von Parameter-Keys zu Form-Input-IDs
    const paramToFormIdMap = {
        runwayMinM: 'runwayMinMonths',
        runwayTargetM: 'runwayTargetMonths',
        goldTargetPct: 'goldAllokationProzent',
        targetEq: 'targetEq',
        rebalBand: 'rebalBand',
        maxSkimPct: 'maxSkimPctOfEq',
        maxBearRefillPct: 'maxBearRefillPctOfEq'
    };

    // Übernehme alle Parameter
    for (const [paramKey, value] of Object.entries(championCfg)) {
        const formId = paramToFormIdMap[paramKey];
        if (formId) {
            const input = document.getElementById(formId);
            if (input) {
                input.value = value;
                input.dispatchEvent(new Event('change', { bubbles: true }));
            }
        }
    }

    // Trigger re-render of portfolio display
    updateStartPortfolioDisplay();

    // Success message
    const resultEl = document.getElementById('ao_result');
    const successMsg = document.createElement('div');
    successMsg.style.cssText = 'background: #4caf50; color: white; padding: 10px; border-radius: 6px; margin-top: 10px; text-align: center;';
    successMsg.textContent = '✓ Configuration applied to framework data!';
    resultEl.appendChild(successMsg);

    setTimeout(() => {
        successMsg.style.opacity = '0';
        successMsg.style.transition = 'opacity 0.5s';
        setTimeout(() => successMsg.remove(), 500);
    }, 3000);
}

/**
 * Setzt Default-Werte für das Panel
 * Parameter werden bereits durch initDefaultParameters() initialisiert
 */
export function setAutoOptimizeDefaults() {
    // Metric
    const metricSelect = document.getElementById('ao_metric');
    if (metricSelect && !metricSelect.value) {
        metricSelect.value = 'SuccessRate';
    }

    // Direction
    const directionSelect = document.getElementById('ao_direction');
    if (directionSelect && !directionSelect.value) {
        directionSelect.value = 'max';
    }

    // Runs & Seeds
    const runsInput = document.getElementById('ao_runs_per_candidate');
    if (runsInput && !runsInput.value) {
        runsInput.value = '2000';
    }

    const seedsTrainInput = document.getElementById('ao_seeds_train');
    if (seedsTrainInput && !seedsTrainInput.value) {
        seedsTrainInput.value = '5';
    }

    const seedsTestInput = document.getElementById('ao_seeds_test');
    if (seedsTestInput && !seedsTestInput.value) {
        seedsTestInput.value = '2';
    }

    // Constraints (sr99 & noex aktiv per Default)
    const sr99 = document.getElementById('ao_c_sr99');
    const noex = document.getElementById('ao_c_noex');

    if (sr99 && sr99.checked === false) sr99.checked = true;
    if (noex && noex.checked === false) noex.checked = true;
}
