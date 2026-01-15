import { HISTORICAL_DATA } from './simulator-data.js';

/**
 * Finds historical years where the CAPE ratio was within a certain tolerance of the target CAPE.
 * @param {number} targetCape - The user's input CAPE.
 * @param {Array} data - The annualData array (or access HISTORICAL_DATA directly).
 * @param {number} tolerance - Percentage tolerance (default 0.2 for +/- 20%).
 * @returns {Array<number>} List of years (e.g. [1995, 1996, ...]).
 */
export function getStartYearCandidates(targetCape, data, tolerance = 0.2) {
    // Access HISTORICAL_DATA directly as it contains the 'cape' property
    // We need to import HISTORICAL_DATA if it's not available in scope, 
    // but since we are in simulator-main.js and it imports it, we can use it.
    // However, annualData is an array of objects which might not have CAPE if it wasn't mapped.
    // Let's check HISTORICAL_DATA directly.

    // We need to ensure we only pick years that are valid start years for the simulation 
    // (i.e. they exist in annualData).

    const validYears = data.map(d => d.jahr);
    const candidates = [];

    // First pass: Strict tolerance
    for (const year of validYears) {
        const histData = HISTORICAL_DATA[year];
        if (histData && histData.cape) {
            const lower = targetCape * (1 - tolerance);
            const upper = targetCape * (1 + tolerance);
            if (histData.cape >= lower && histData.cape <= upper) {
                candidates.push(year);
            }
        }
    }

    // Fallback: If few candidates, widen tolerance
    if (candidates.length < 5) {
        const wideTolerance = 0.5; // +/- 50%
        const wideCandidates = [];
        for (const year of validYears) {
            const histData = HISTORICAL_DATA[year];
            if (histData && histData.cape) {
                const lower = targetCape * (1 - wideTolerance);
                const upper = targetCape * (1 + wideTolerance);
                if (histData.cape >= lower && histData.cape <= upper) {
                    wideCandidates.push(year);
                }
            }
        }
        return wideCandidates.length > 0 ? wideCandidates : validYears;
    }

    return candidates;
}
