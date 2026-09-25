"use strict";

import {
    displaySweepResults, formatSweepWorkload, readInteractiveSweepRanges, readSweepWorkload
} from './simulator-sweep.js';

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

    // Der Zähler verwendet dieselbe Auswahl und denselben Parser wie der Lauf.
    function updateSweepGridSize() {
        const dynamicFlex = document.getElementById('dynamicFlex')?.checked === true;
        const quantileActive = dynamicFlex && document.getElementById('horizonMethod')?.value === 'survival_quantile';
        const goGoActive = dynamicFlex && document.getElementById('goGoActive')?.checked === true;
        const quantileState = document.getElementById('sweepQuantileState');
        const goGoState = document.getElementById('sweepGoGoState');
        if (quantileState) quantileState.textContent = quantileActive ? '– aktiv' : '– nicht aktiv';
        if (goGoState) goGoState.textContent = goGoActive ? '– aktiv' : '– nicht aktiv';
        let totalSize = 1;
        let hasError = false;
        try {
            const { ranges, emptyLabel } = readInteractiveSweepRanges();
            hasError = Boolean(emptyLabel);
            for (const values of Object.values(ranges)) totalSize *= values.length;
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
        const workloadEl = document.getElementById('sweepWorkload');
        if (workloadEl) {
            try {
                if (hasError || totalSize < 1 || totalSize > 300) throw new Error('Ungültiges Grid');
                workloadEl.textContent = `Nomineller Aufwand: ${formatSweepWorkload(readSweepWorkload(totalSize))}.`;
            } catch {
                workloadEl.textContent = 'Nomineller Aufwand: ? (Eingaben prüfen).';
            }
        }
    }

    // Add event listeners to all sweep input fields
    const sweepInputIds = [
        'sweepLiquidityRunwayYears', 'sweepGoldRebalancingBand',
        'sweepMaxSkimPct', 'sweepMaxBearRefillPct', 'sweepGoldTargetPct',
        'sweepSurvivalQuantile', 'sweepGoGoMultiplier', 'sweepRuns', 'mcDauer'
    ];

    sweepInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateSweepGridSize);
            el.addEventListener('change', updateSweepGridSize);
        }
    });

    for (const id of ['dynamicFlex', 'horizonMethod', 'goGoActive', 'dynamicFlexPreset']) {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateSweepGridSize);
            el.addEventListener('change', updateSweepGridSize);
        }
    }

    updateSweepGridSize();
}
