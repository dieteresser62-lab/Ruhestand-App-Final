/**
 * Module: Simulator Portfolio Display
 * Purpose: Updating the UI display for portfolio status.
 *          Handles formatting of currency values and breakdown panels.
 * Usage: Called by simulator-portfolio.js facade.
 * Dependencies: simulator-utils.js, depot-tranchen-status.js, simulator-portfolio-inputs.js, simulator-portfolio-format.js
 */
"use strict";

import { formatCurrency } from './simulator-utils.js';
import { calculateAggregatedValues } from '../tranches/depot-tranchen-status.js';
import { getCommonInputs } from './simulator-portfolio-inputs.js';
import { formatDisplayNumber } from './simulator-portfolio-format.js';

let hasLoggedTranchenDisplay = false;
const formatPlainInteger = (value) => Number.isFinite(value) ? String(Math.round(value)) : '0';

/**
 * Aktualisiert die Anzeige des Start-Portfolios
 */
export function updateStartPortfolioDisplay() {
    const inputs = getCommonInputs();
    const aggregated = (inputs.detailledTranches && Array.isArray(inputs.detailledTranches) && inputs.detailledTranches.length)
        ? calculateAggregatedValues()
        : null;
    const useAggregates = aggregated && (
        aggregated.depotwertAlt > 0 ||
        aggregated.depotwertNeu > 0 ||
        aggregated.geldmarktEtf > 0 ||
        aggregated.goldWert > 0
    );

    if (useAggregates && !hasLoggedTranchenDisplay) {
        hasLoggedTranchenDisplay = true;
    }

    let displayDepotwertAlt = 0;
    let displayDepotwertNeu = 0;
    let displayGoldWert = 0;
    let displayGeldmarkt = 0;
    let displayTagesgeld = 0;
    let depotwertNeu = 0;
    let zielwertGold = 0;

    if (useAggregates) {
        // Prefer tranche aggregates to avoid rounding drift from form inputs.
        displayDepotwertAlt = aggregated.depotwertAlt || 0;
        displayDepotwertNeu = aggregated.depotwertNeu || 0;
        displayGoldWert = aggregated.goldWert || 0;
        displayGeldmarkt = aggregated.geldmarktEtf || 0;
        displayTagesgeld = inputs.tagesgeld || 0;
    } else {
        // Derive portfolio split from cash + target gold allocation.
        const startLiquiditaet = (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0);
        const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
        const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - startLiquiditaet);
        const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
        zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
        depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);

        displayDepotwertAlt = inputs.depotwertAlt;
        displayDepotwertNeu = depotwertNeu;
        displayGoldWert = zielwertGold;
        displayGeldmarkt = inputs.geldmarktEtf || 0;
        displayTagesgeld = inputs.tagesgeld || 0;
    }

    // Keep the "start wealth" field aligned with the computed breakdown.
    const derivedStartVermoegen = displayDepotwertAlt + displayDepotwertNeu + displayGoldWert + displayTagesgeld + displayGeldmarkt;
    const startField = document.getElementById('simStartVermoegen');
    if (startField) {
        startField.value = formatDisplayNumber(derivedStartVermoegen);
    }

    const showGoldPanel = inputs.goldAktiv || (useAggregates && displayGoldWert > 0);

    const einstandNeuField = document.getElementById('einstandNeu');
    if (einstandNeuField) {
        einstandNeuField.value = useAggregates
            ? Math.round(aggregated.costBasisNeu || 0)
            : formatPlainInteger(depotwertNeu);
    }

    const depotwertGesamtField = document.getElementById('depotwertGesamt');
    if (depotwertGesamtField) {
        depotwertGesamtField.value = formatDisplayNumber(displayDepotwertAlt + displayDepotwertNeu);
    }
    const goldWertField = document.getElementById('goldWert');
    if (goldWertField) {
        goldWertField.value = formatDisplayNumber(displayGoldWert);
    }

    // Render a quick visual split for user validation.
    let breakdownHtml = `
        <div style="text-align:center; font-weight:bold; color: var(--primary-color); margin-bottom:10px;">Finale Start-Allokation</div>
        <div class="form-grid-three-col">
            <div class="form-group"><label>Depot</label><span class="calculated-display" style="background-color: #e0f7fa;">${formatCurrency(displayDepotwertAlt + displayDepotwertNeu)}</span></div>
            <div class="form-group"><label>Gold</label><span class="calculated-display" style="background-color: #fff9c4;">${formatCurrency(displayGoldWert)}</span></div>
            <div class="form-group"><label>Liquiditaet</label><span class="calculated-display" style="background-color: #e8f5e9;">${formatCurrency(displayTagesgeld + displayGeldmarkt)}</span></div>
        </div>`;
    document.getElementById('displayPortfolioBreakdown').innerHTML = breakdownHtml;
    const goldPanel = document.getElementById('goldStrategyPanel');
    if (goldPanel) {
        goldPanel.style.display = showGoldPanel ? 'block' : 'none';
    }
}
