"use strict";

/**
 * ===================================================================================
 * SIMULATOR UTILITY FUNKTIONEN
 * ===================================================================================
 * Re-exportiert gemeinsame Funktionen aus shared-utils.js und erweitert diese
 * mit simulator-spezifischen Utilities.
 * ===================================================================================
 */

// Re-export aller gemeinsamen Funktionen aus shared-utils
export {
    formatCurrency,
    formatCurrencyShort as formatCurrencyShortLog,
    formatNumber,
    formatPercent,
    parseCurrency,
    shortenText,
    shortenReasonText,
    lerp,
    sum,
    mean,
    stdDev,
    standardize,
    correlation,
    rng,
    quantile,
    parseRange,
    parseRangeInput,
    cartesianProduct,
    cartesianProductLimited
} from './shared-utils.js';
