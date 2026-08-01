/**
 * Finds historical decision years whose supplied annual-data CAPE signal is within tolerance.
 * @param {number} targetCape - The user's input CAPE.
 * @param {Array<{jahr:number,capeRatio:number}>} data - Candidate annual-data rows. Each
 *   `capeRatio` is already mapped to its decision year; this function applies no extra lag.
 * @param {number} tolerance - Percentage tolerance (default 0.2 for +/- 20%).
 * @param {{fallbackToAll?: boolean}} options - Controls the legacy all-years fallback.
 * @returns {Array<number>} List of years (e.g. [1995, 1996, ...]).
 */
export function getStartYearCandidates(targetCape, data, tolerance = 0.2, { fallbackToAll = true } = {}) {
    const validRows = Array.isArray(data)
        ? data.filter(row => Number.isInteger(row?.jahr))
        : [];
    const validYears = validRows.map(row => row.jahr);
    const candidates = [];
    const lower = targetCape * (1 - tolerance);
    const upper = targetCape * (1 + tolerance);

    for (const row of validRows) {
        if (Number.isFinite(row.capeRatio)
            && row.capeRatio > 0
            && row.capeRatio >= lower
            && row.capeRatio <= upper) {
            candidates.push(row.jahr);
        }
    }

    // Fallback: If few candidates, widen tolerance
    if (candidates.length < 5) {
        const wideTolerance = 0.5; // +/- 50%
        const wideCandidates = [];
        const wideLower = targetCape * (1 - wideTolerance);
        const wideUpper = targetCape * (1 + wideTolerance);
        for (const row of validRows) {
            if (Number.isFinite(row.capeRatio)
                && row.capeRatio > 0
                && row.capeRatio >= wideLower
                && row.capeRatio <= wideUpper) {
                wideCandidates.push(row.jahr);
            }
        }
        return wideCandidates.length > 0
            ? wideCandidates
            : (fallbackToAll ? validYears : []);
    }

    return candidates;
}
