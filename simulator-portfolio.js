"use strict";

export { getCommonInputs } from './simulator-portfolio-inputs.js';
export { updateStartPortfolioDisplay } from './simulator-portfolio-display.js';
export { initializePortfolio, initializePortfolioDetailed } from './simulator-portfolio-init.js';
export { prepareHistoricalData } from './simulator-portfolio-historical.js';
export { computeYearlyPension, computePensionNext, computeRentAdjRate } from './simulator-portfolio-pension.js';
export { buildStressContext, applyStressOverride } from './simulator-portfolio-stress.js';
export {
    sortTranchesFIFO,
    sortTranchesTaxOptimized,
    calculateTrancheTax,
    applySaleToPortfolio,
    summarizeSalesByAsset,
    buildInputsCtxFromPortfolio,
    sumDepot,
    buyGold,
    buyStocksNeu
} from './simulator-portfolio-tranches.js';
export { parseDisplayNumber, formatDisplayNumber } from './simulator-portfolio-format.js';
