/**
 * Module: Simulator Portfolio Historical
 * Purpose: Preparing and analyzing historical market data.
 *          Calculates returns, inflation, and market regimes from raw data.
 * Usage: Called by simulator-portfolio.js facade.
 * Dependencies: simulator-data.js
 */
"use strict";

import {
    annualData,
    assertHistoricalRegimeContract,
    simulatorDataContractError
} from './simulator-data.js';

/**
 * Bereitet historische Daten auf und berechnet Regime
 */
export function prepareHistoricalData() {
    if (!Array.isArray(annualData) || annualData.length === 0) {
        throw simulatorDataContractError(
            'SIMULATOR_HISTORICAL_DATA_UNAVAILABLE',
            'Canonical historical data must be initialized before simulation.'
        );
    }
    assertHistoricalRegimeContract();
    return annualData;
}
