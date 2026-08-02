/**
 * Canonical user-facing liquidity runway contract shared by Balance,
 * Simulator and the engine. Legacy month fields are input-only migration
 * aliases and must never be emitted by current readers or exports.
 */

const REQUEST_KEY = 'liquidityRunwayYears';
const LEGACY_TARGET_KEY = 'runwayTargetMonths';
const LEGACY_MINIMUM_KEY = 'runwayMinMonths';

export const LIQUIDITY_RUNWAY_CONTRACT_V1 = Object.freeze({
    version: 'LiquidityRunwayContractV1',
    requestKey: REQUEST_KEY,
    unit: 'years',
    defaultYears: 5,
    minimumYears: 1,
    maximumYears: 10,
    stepYears: 0.5,
    legacyKeys: Object.freeze({
        targetMonths: LEGACY_TARGET_KEY,
        minimumMonths: LEGACY_MINIMUM_KEY
    }),
    legacyMonthDomains: Object.freeze({
        target: Object.freeze({ minimum: 18, maximum: 72, step: 1 }),
        minimum: Object.freeze({ minimum: 12, maximum: 60, step: 1 }),
        normalization: 'ceil_to_next_half_year'
    }),
    migrationPrecedence: Object.freeze([
        REQUEST_KEY,
        LEGACY_TARGET_KEY,
        LEGACY_MINIMUM_KEY,
        'default'
    ]),
    internalPolicy: Object.freeze({
        hardMinimumCapMonths: 24,
        hardMinimumSource: 'engine_policy_cap_24_months'
    })
});

function hasOwn(object, key) {
    return Object.prototype.hasOwnProperty.call(object || {}, key);
}

function finiteNumber(value) {
    if (value === null || value === undefined || value === '') return null;
    const number = Number(value);
    return Number.isFinite(number) ? number : null;
}

function isValidStep(years) {
    const steps = (years - LIQUIDITY_RUNWAY_CONTRACT_V1.minimumYears)
        / LIQUIDITY_RUNWAY_CONTRACT_V1.stepYears;
    return Math.abs(steps - Math.round(steps)) < 1e-9;
}

export function isValidLiquidityRunwayYears(years) {
    return Number.isFinite(years)
        && years >= LIQUIDITY_RUNWAY_CONTRACT_V1.minimumYears
        && years <= LIQUIDITY_RUNWAY_CONTRACT_V1.maximumYears
        && isValidStep(years);
}

function normalizeLegacyMonths(legacyMonths, domain) {
    if (!Number.isInteger(legacyMonths)
        || legacyMonths < domain.minimum
        || legacyMonths > domain.maximum) {
        return {
            years: NaN,
            normalizedMonths: NaN,
            normalization: 'invalid'
        };
    }
    const canonicalStepMonths = LIQUIDITY_RUNWAY_CONTRACT_V1.stepYears * 12;
    const normalizedMonths = Math.ceil(legacyMonths / canonicalStepMonths) * canonicalStepMonths;
    return {
        years: normalizedMonths / 12,
        normalizedMonths,
        normalization: normalizedMonths === legacyMonths
            ? 'exact'
            : LIQUIDITY_RUNWAY_CONTRACT_V1.legacyMonthDomains.normalization
    };
}

export function resolveLiquidityRunwayYears(input = {}) {
    const canonicalYears = finiteNumber(input[REQUEST_KEY]);
    if (canonicalYears !== null) {
        return {
            years: canonicalYears,
            source: 'canonical',
            migrated: false
        };
    }

    if (hasOwn(input, REQUEST_KEY)
        && input[REQUEST_KEY] !== null
        && input[REQUEST_KEY] !== undefined
        && input[REQUEST_KEY] !== '') {
        return {
            years: NaN,
            source: 'canonical_invalid',
            migrated: false
        };
    }

    const legacyTargetMonths = finiteNumber(input[LEGACY_TARGET_KEY]);
    if (legacyTargetMonths !== null && legacyTargetMonths > 0) {
        const normalized = normalizeLegacyMonths(
            legacyTargetMonths,
            LIQUIDITY_RUNWAY_CONTRACT_V1.legacyMonthDomains.target
        );
        return {
            years: normalized.years,
            source: Number.isFinite(normalized.years)
                ? 'legacy_runway_target_months'
                : 'legacy_runway_target_months_invalid',
            migrated: true,
            legacyMonths: legacyTargetMonths,
            normalizedMonths: normalized.normalizedMonths,
            normalization: normalized.normalization
        };
    }

    const legacyMinimumMonths = finiteNumber(input[LEGACY_MINIMUM_KEY]);
    if (legacyMinimumMonths !== null && legacyMinimumMonths > 0) {
        const normalized = normalizeLegacyMonths(
            legacyMinimumMonths,
            LIQUIDITY_RUNWAY_CONTRACT_V1.legacyMonthDomains.minimum
        );
        return {
            years: normalized.years,
            source: Number.isFinite(normalized.years)
                ? 'legacy_runway_min_months'
                : 'legacy_runway_min_months_invalid',
            migrated: true,
            legacyMonths: legacyMinimumMonths,
            normalizedMonths: normalized.normalizedMonths,
            normalization: normalized.normalization
        };
    }

    return {
        years: LIQUIDITY_RUNWAY_CONTRACT_V1.defaultYears,
        source: 'default',
        migrated: false
    };
}

export function migrateLiquidityRunwayInput(input = {}, { dropTargetEq = false } = {}) {
    const migrated = { ...(input || {}) };
    const resolution = resolveLiquidityRunwayYears(migrated);
    migrated[REQUEST_KEY] = deriveLiquidityRunwayPolicy(resolution.years).targetYears;
    delete migrated[LEGACY_TARGET_KEY];
    delete migrated[LEGACY_MINIMUM_KEY];
    if (dropTargetEq) delete migrated.targetEq;
    return migrated;
}

export function deriveLiquidityRunwayPolicy(years) {
    const numericYears = Number(years);
    if (!isValidLiquidityRunwayYears(numericYears)) {
        throw new RangeError(
            `liquidityRunwayYears must be a finite ${LIQUIDITY_RUNWAY_CONTRACT_V1.stepYears}-year step between `
            + `${LIQUIDITY_RUNWAY_CONTRACT_V1.minimumYears} and ${LIQUIDITY_RUNWAY_CONTRACT_V1.maximumYears}`
        );
    }
    const targetMonths = numericYears * 12;
    const hardMinimumMonths = Math.min(
        targetMonths,
        LIQUIDITY_RUNWAY_CONTRACT_V1.internalPolicy.hardMinimumCapMonths
    );
    return Object.freeze({
        targetYears: numericYears,
        targetMonths,
        hardMinimumMonths,
        hardMinimumSource: LIQUIDITY_RUNWAY_CONTRACT_V1.internalPolicy.hardMinimumSource
    });
}
