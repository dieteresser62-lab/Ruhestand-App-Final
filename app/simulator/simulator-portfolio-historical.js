/**
 * Module: Simulator Portfolio Historical
 * Purpose: Preparing and analyzing historical market data.
 *          Calculates returns, inflation, and market regimes from raw data.
 * Usage: Called by simulator-portfolio.js facade.
 * Dependencies: simulator-data.js
 */
"use strict";

import { HISTORICAL_DATA, annualData, REGIME_DATA, REGIME_TRANSITIONS } from './simulator-data.js';

/**
 * Bereitet historische Daten auf und berechnet Regime
 */
export function prepareHistoricalData() {
    if (annualData.length > 0) return;
    const years = Object.keys(HISTORICAL_DATA).map(Number).sort((a, b) => a - b);
    for (let i = 1; i < years.length; i++) {
        const y = years[i], prev = years[i - 1];
        const cur = HISTORICAL_DATA[y], vj = HISTORICAL_DATA[prev];
        if (!cur || !vj) continue;

        // Equity returns are based on MSCI EUR year-over-year changes.
        const m1 = Number(cur.msci_eur);
        const m0 = Number(vj.msci_eur);
        if (!isFinite(m0) || !isFinite(m1)) {
            continue;
        }

        let rendite = (m0 > 0) ? (m1 - m0) / m0 : 0;
        if (!isFinite(rendite)) rendite = 0;

        // Use previous-year macro values to align returns with inflation/interest.
        const dataPoint = {
            jahr: y,
            rendite: rendite,
            inflation: Number(vj.inflation_de) || 0,
            zinssatz: Number(vj.zinssatz_de) || 0,
            lohn: Number(vj.lohn_de) || 0,
            gold_eur_perf: Number(vj.gold_eur_perf) || 0
        };

        annualData.push(dataPoint);
        const realRendite = rendite * 100 - dataPoint.inflation;
        // Regime is a coarse classification used for sampling and stress logic.
        let regime = (dataPoint.inflation > 4 && realRendite < 0) ? 'STAGFLATION' : (rendite > 0.15) ? 'BULL' : (rendite < -0.10) ? 'BEAR' : 'SIDEWAYS';
        dataPoint.regime = regime;
        if (!REGIME_DATA[regime]) REGIME_DATA[regime] = [];
        REGIME_DATA[regime].push(dataPoint);
    }
    const regimes = ['BULL', 'BEAR', 'SIDEWAYS', 'STAGFLATION'];
    regimes.forEach(from => { REGIME_TRANSITIONS[from] = { BULL: 0, BEAR: 0, SIDEWAYS: 0, STAGFLATION: 0, total: 0 }; });
    for (let i = 1; i < annualData.length; i++) {
        const fromRegime = annualData[i - 1].regime, toRegime = annualData[i].regime;
        // Transition counts feed the Markov regime sampler.
        if (fromRegime && toRegime) { REGIME_TRANSITIONS[fromRegime][toRegime]++; REGIME_TRANSITIONS[fromRegime].total++; }
    }
}
