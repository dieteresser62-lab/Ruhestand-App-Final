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

    // Input-Validierung bei Änderungen
    attachValidationListeners();

    // Initial Validation
    updateRunButtonState();
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
        return true;
    } catch (e) {
        return false;
    }
}

/**
 * Hängt Validierungs-Listener an alle Inputs
 */
function attachValidationListeners() {
    const inputs = [
        'ao_metric', 'ao_direction',
        'ao_p1_key', 'ao_p1_min', 'ao_p1_max', 'ao_p1_step',
        'ao_p2_key', 'ao_p2_min', 'ao_p2_max', 'ao_p2_step',
        'ao_p3_key', 'ao_p3_min', 'ao_p3_max', 'ao_p3_step',
        'ao_runs_per_candidate', 'ao_seeds_train', 'ao_seeds_test'
    ];

    for (const id of inputs) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('change', updateRunButtonState);
            el.addEventListener('input', updateRunButtonState);
        }
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

    // Parameter
    const params = {};
    for (let i = 1; i <= 3; i++) {
        const key = document.getElementById(`ao_p${i}_key`).value;
        const min = parseFloat(document.getElementById(`ao_p${i}_min`).value);
        const max = parseFloat(document.getElementById(`ao_p${i}_max`).value);
        const step = parseFloat(document.getElementById(`ao_p${i}_step`).value);

        if (!key || isNaN(min) || isNaN(max) || isNaN(step)) {
            throw new Error(`Parameter ${i} incomplete`);
        }

        if (min > max) {
            throw new Error(`Parameter ${i}: min > max`);
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

    let html = `
        <div style="border: 2px solid var(--secondary-color); border-radius: 8px; padding: 20px; background: #f9f9f9; margin-top: 20px;">
            <h3 style="margin-top: 0; color: var(--secondary-color);">🏆 Champion Configuration</h3>

            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 15px; margin-bottom: 20px;">
                <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Runway Min</div>
                    <div style="font-size: 1.5rem; font-weight: 600; color: var(--secondary-color);">
                        ${championCfg.runwayMinM} Monate
                    </div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Runway Target</div>
                    <div style="font-size: 1.5rem; font-weight: 600; color: var(--secondary-color);">
                        ${championCfg.runwayTargetM} Monate
                    </div>
                </div>
                <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                    <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">Gold Target</div>
                    <div style="font-size: 1.5rem; font-weight: 600; color: var(--secondary-color);">
                        ${championCfg.goldTargetPct.toFixed(1)} %
                    </div>
                </div>
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
                        <span style="margin-left: 10px;">${((metricsTest.drawdown?.p90 ?? 0) * 100).toFixed(1)}%</span>
                    </div>
                    <div>
                        <strong>End Wealth P50:</strong>
                        <span style="margin-left: 10px;">${formatCurrency(metricsTest.endWealth?.p50 ?? 0)}</span>
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

    // Update UI inputs
    const runwayMinInput = document.getElementById('runwayMinMonths');
    const runwayTargetInput = document.getElementById('runwayTargetMonths');
    const goldTargetInput = document.getElementById('goldAllokationProzent');

    if (runwayMinInput) {
        runwayMinInput.value = championCfg.runwayMinM;
        runwayMinInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (runwayTargetInput) {
        runwayTargetInput.value = championCfg.runwayTargetM;
        runwayTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
    }

    if (goldTargetInput) {
        goldTargetInput.value = championCfg.goldTargetPct;
        goldTargetInput.dispatchEvent(new Event('change', { bubbles: true }));
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

    // Parameter Keys
    const p1Key = document.getElementById('ao_p1_key');
    const p2Key = document.getElementById('ao_p2_key');
    const p3Key = document.getElementById('ao_p3_key');

    if (p1Key && !p1Key.value) p1Key.value = 'runwayMinM';
    if (p2Key && !p2Key.value) p2Key.value = 'runwayTargetM';
    if (p3Key && !p3Key.value) p3Key.value = 'goldTargetPct';

    // Ranges (Defaults aus Spezifikation)
    if (!document.getElementById('ao_p1_min').value) {
        document.getElementById('ao_p1_min').value = '18';
        document.getElementById('ao_p1_max').value = '36';
        document.getElementById('ao_p1_step').value = '2';
    }

    if (!document.getElementById('ao_p2_min').value) {
        document.getElementById('ao_p2_min').value = '24';
        document.getElementById('ao_p2_max').value = '48';
        document.getElementById('ao_p2_step').value = '2';
    }

    if (!document.getElementById('ao_p3_min').value) {
        document.getElementById('ao_p3_min').value = '0';
        document.getElementById('ao_p3_max').value = '10';
        document.getElementById('ao_p3_step').value = '1';
    }

    // Runs & Seeds
    if (!document.getElementById('ao_runs_per_candidate').value) {
        document.getElementById('ao_runs_per_candidate').value = '2000';
    }

    if (!document.getElementById('ao_seeds_train').value) {
        document.getElementById('ao_seeds_train').value = '5';
    }

    if (!document.getElementById('ao_seeds_test').value) {
        document.getElementById('ao_seeds_test').value = '2';
    }

    // Constraints (sr99 & noex aktiv per Default)
    const sr99 = document.getElementById('ao_c_sr99');
    const noex = document.getElementById('ao_c_noex');

    if (sr99) sr99.checked = true;
    if (noex) noex.checked = true;
}
