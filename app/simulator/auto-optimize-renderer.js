/**
 * Module: Auto-Optimize Renderer
 * Purpose: Render parameter blocks, progress messages and result HTML.
 */
"use strict";

import { formatCurrency } from './simulator-utils.js';
import {
    AUTO_OPTIMIZE_DYNAMIC_FLEX_MODE_LABELS,
    AUTO_OPTIMIZE_PARAM_LABELS,
    AUTO_OPTIMIZE_PARAM_UNITS,
    renderAutoOptimizeParamOptions
} from './auto-optimize-param-meta.js';

const formatFixed = (value, digits = 1) => Number(value).toFixed(digits);
const formatPercentFromRatio = (value, digits = 1) => `${formatFixed((value ?? 0) * 100, digits)}%`;
const formatSignedPercentFromRatio = (value, digits = 2) => `${value >= 0 ? '+' : ''}${formatPercentFromRatio(value, digits)}`;

export function createAutoOptimizeParameterBlock({ paramId, paramNumber, defaults = null, doc = globalThis.document }) {
    const paramDiv = doc.createElement('div');
    paramDiv.id = `ao_param_${paramId}`;
    paramDiv.className = 'ao-parameter-block';
    paramDiv.style.cssText = 'border: 1px solid #ddd; padding: 10px; border-radius: 4px; margin-bottom: 10px;';

    paramDiv.innerHTML = `
        <h5 style="margin-top: 0; margin-bottom: 10px;">Parameter ${paramNumber}</h5>
        <div class="form-grid-four-col">
            <div class="form-group">
                <label>Key</label>
                <select class="ao-param-key" data-param-id="${paramId}">
                    ${renderAutoOptimizeParamOptions(defaults?.key)}
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

    return paramDiv;
}

export function formatAutoOptimizeProgress(status) {
    if (status.stage === 'lhs') {
        return 'Generating candidates (Latin Hypercube Sampling)...';
    }
    if (status.stage === 'quick_filter') {
        const pct = Math.round((status.progress / status.total) * 100);
        return `⚡ Quick-Filter (fast evaluation): ${status.progress}/${status.total} (${pct}%)`;
    }
    if (status.stage === 'evaluate_lhs') {
        const pct = Math.round((status.progress / status.total) * 100);
        return `🔍 Full evaluation (top candidates): ${status.progress}/${status.total} (${pct}%)`;
    }
    if (status.stage === 'refine') {
        if (status.total) {
            const pct = Math.round((status.progress / status.total) * 100);
            return `🎯 Refining top-5 candidates: ${status.progress}/${status.total} (${pct}%)`;
        }
        return '🎯 Refining top-5 candidates (local search)...';
    }
    if (status.stage === 'validate') {
        const pct = Math.round((status.progress / status.total) * 100);
        return `✅ Validating on test seeds: ${status.progress}/${status.total} (${pct}%)`;
    }
    if (status.stage === 'done') {
        return '✨ Optimization complete!';
    }
    return '';
}

export function renderAutoOptimizeResult({ resultEl, result, objective }) {
    if (!resultEl) return;
    const { championCfg, metricsTest, deltaVsCurrent, stability, optimizationContext } = result;
    const stabilityPct = Math.round(stability * 100);
    const stabilityColor = stabilityPct >= 80 ? '#4caf50' : stabilityPct >= 60 ? '#ff9800' : '#f44336';
    const dynamicFlexModeLabel = AUTO_OPTIMIZE_DYNAMIC_FLEX_MODE_LABELS[optimizationContext?.dynamicFlexMode]
        || AUTO_OPTIMIZE_DYNAMIC_FLEX_MODE_LABELS.inherit;
    const dynamicFlexStateLabel = optimizationContext?.dynamicFlexActive === true ? 'aktiv' : 'inaktiv';
    const safetyLabel = optimizationContext?.safetyGuardsActive === true ? 'aktiv' : 'inaktiv';

    let paramCardsHtml = '';
    for (const [key, value] of Object.entries(championCfg)) {
        const label = AUTO_OPTIMIZE_PARAM_LABELS[key] || key;
        const unit = AUTO_OPTIMIZE_PARAM_UNITS[key] || '';
        const displayValue = typeof value === 'number' ? formatFixed(value, 1) : value;

        paramCardsHtml += `
            <div style="background: white; padding: 15px; border-radius: 6px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">
                <div style="font-size: 0.85rem; color: #666; margin-bottom: 5px;">${label}</div>
                <div style="font-size: 1.5rem; font-weight: 600; color: var(--secondary-color);">
                    ${displayValue} ${unit}
                </div>
            </div>
        `;
    }

    resultEl.innerHTML = `
        <div style="border: 2px solid var(--secondary-color); border-radius: 8px; padding: 20px; background: #f9f9f9; margin-top: 20px;">
            <h3 style="margin-top: 0; color: var(--secondary-color);">🏆 Champion Configuration</h3>
            <div style="background: #eef6ff; border: 1px solid #cddff8; color: #244f7a; padding: 10px 12px; border-radius: 6px; margin-bottom: 14px; font-size: 0.9rem;">
                <strong>Dynamic-Flex Modus:</strong> ${dynamicFlexModeLabel} (${dynamicFlexStateLabel})
                <br><strong>Safety-Guards:</strong> ${safetyLabel}
            </div>

            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 15px; margin-bottom: 20px;">
                ${paramCardsHtml}
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <h4 style="margin-top: 0;">Key Metrics (Test Seeds)</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div><strong>Success Rate:</strong><span style="margin-left: 10px;">${formatPercentFromRatio(metricsTest.successProbFloor, 1)}</span></div>
                    <div><strong>P90 Drawdown:</strong><span style="margin-left: 10px;">${formatPercentFromRatio(metricsTest.worst5Drawdown, 1)}</span></div>
                    <div><strong>End Wealth P50:</strong><span style="margin-left: 10px;">${formatCurrency(metricsTest.medianEndWealth ?? 0)}</span></div>
                    <div><strong>Time Share WR > 4.5%:</strong><span style="margin-left: 10px;">${formatPercentFromRatio(metricsTest.timeShareWRgt45, 2)}</span></div>
                </div>
            </div>

            <div style="background: white; padding: 15px; border-radius: 6px; margin-bottom: 20px;">
                <h4 style="margin-top: 0;">Delta vs. Current Configuration</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px;">
                    <div>
                        <strong>Success Rate:</strong>
                        <span style="margin-left: 10px; color: ${deltaVsCurrent.successRate >= 0 ? '#4caf50' : '#f44336'};">
                            ${formatSignedPercentFromRatio(deltaVsCurrent.successRate, 2)}
                        </span>
                    </div>
                    <div>
                        <strong>P90 Drawdown:</strong>
                        <span style="margin-left: 10px; color: ${deltaVsCurrent.drawdownP90 <= 0 ? '#4caf50' : '#f44336'};">
                            ${formatSignedPercentFromRatio(deltaVsCurrent.drawdownP90, 2)}
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
                            ${formatSignedPercentFromRatio(deltaVsCurrent.timeShareWRgt45, 2)}
                        </span>
                    </div>
                </div>
            </div>

            <div style="background: ${stabilityColor}; color: white; padding: 15px; border-radius: 6px; text-align: center;">
                <h4 style="margin: 0;">Stability Score: ${stabilityPct}%</h4>
                <p style="margin: 5px 0 0 0; font-size: 0.9rem;">
                    ${stabilityPct >= 80 ? '✓ Highly stable across seed sets'
        : stabilityPct >= 60 ? '⚠ Moderately stable'
            : '⚠ Low stability - consider more seeds'}
                </p>
            </div>
        </div>
    `;
    resultEl.style.display = 'block';
}

export function appendAutoOptimizeApplySuccess({ resultEl, doc = globalThis.document }) {
    if (!resultEl) return;
    const successMsg = doc.createElement('div');
    successMsg.style.cssText = 'background: #4caf50; color: white; padding: 10px; border-radius: 6px; margin-top: 10px; text-align: center;';
    successMsg.textContent = '✓ Configuration applied to framework data!';
    resultEl.appendChild(successMsg);

    setTimeout(() => {
        successMsg.style.opacity = '0';
        successMsg.style.transition = 'opacity 0.5s';
        setTimeout(() => successMsg.remove(), 500);
    }, 3000);
}

