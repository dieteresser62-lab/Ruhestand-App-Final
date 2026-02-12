"use strict";

import { parseRangeInput } from './simulator-utils.js';
import { displaySweepResults } from './simulator-sweep.js';

export function initSweepUIControls() {
    const sweepMetricSelect = document.getElementById('sweepMetric');
    const sweepAxisXSelect = document.getElementById('sweepAxisX');
    const sweepAxisYSelect = document.getElementById('sweepAxisY');

    if (sweepMetricSelect) {
        sweepMetricSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    if (sweepAxisXSelect) {
        sweepAxisXSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    if (sweepAxisYSelect) {
        sweepAxisYSelect.addEventListener('change', () => {
            if (window.sweepResults && window.sweepResults.length > 0) {
                displaySweepResults();
            }
        });
    }

    // Grid-Size-Counter für Parameter-Sweep
    function updateSweepGridSize() {
        const rangeInputs = {
            runwayMin: document.getElementById('sweepRunwayMin').value,
            runwayTarget: document.getElementById('sweepRunwayTarget').value,
            targetEq: document.getElementById('sweepTargetEq').value,
            rebalBand: document.getElementById('sweepRebalBand').value,
            maxSkimPct: document.getElementById('sweepMaxSkimPct').value,
            maxBearRefillPct: document.getElementById('sweepMaxBearRefillPct').value,
            goldTargetPct: document.getElementById('sweepGoldTargetPct').value,
            horizonYears: document.getElementById('sweepHorizonYears').value,
            survivalQuantile: document.getElementById('sweepSurvivalQuantile').value,
            goGoMultiplier: document.getElementById('sweepGoGoMultiplier').value
        };

        let totalSize = 1;
        let hasError = false;

        try {
            for (const rangeStr of Object.values(rangeInputs)) {
                if (!rangeStr || !rangeStr.trim()) {
                    hasError = true;
                    break;
                }
                // Reuse the same parser as the sweep runner to stay consistent.
                const values = parseRangeInput(rangeStr);
                if (values.length === 0) {
                    hasError = true;
                    break;
                }
                totalSize *= values.length;
            }
        } catch (error) {
            hasError = true;
        }

        const gridSizeEl = document.getElementById('sweepGridSize');
        if (gridSizeEl) {
            if (hasError) {
                gridSizeEl.textContent = 'Grid: ? Kombis';
                gridSizeEl.style.color = '#999';
            } else if (totalSize > 300) {
                gridSizeEl.textContent = `Grid: ${totalSize} Kombis (⚠ Max: 300)`;
                gridSizeEl.style.color = '#d32f2f';
            } else {
                gridSizeEl.textContent = `Grid: ${totalSize} Kombis`;
                gridSizeEl.style.color = 'var(--secondary-color)';
            }
        }
    }

    // Add event listeners to all sweep input fields
    const sweepInputIds = [
        'sweepRunwayMin', 'sweepRunwayTarget', 'sweepTargetEq', 'sweepRebalBand',
        'sweepMaxSkimPct', 'sweepMaxBearRefillPct', 'sweepGoldTargetPct',
        'sweepHorizonYears', 'sweepSurvivalQuantile', 'sweepGoGoMultiplier'
    ];

    sweepInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateSweepGridSize);
        }
    });

    // Initial update
    updateSweepGridSize();
}
