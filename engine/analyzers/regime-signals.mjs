/**
 * DOM-free helpers for continuous regime signals.
 *
 * The order of the support values is part of the contract: severity0Value
 * maps to 0 and severity1Value maps to 1. Do not sort the support values,
 * because descending scales such as runway months would be inverted.
 *
 * The optional scale is only needed when both support values are identical,
 * because the formula cannot infer direction from a zero-width range.
 */
export function interpolateRange(value, severity0Value, severity1Value, { scale = 'ascending' } = {}) {
    if (
        !Number.isFinite(value) ||
        !Number.isFinite(severity0Value) ||
        !Number.isFinite(severity1Value)
    ) {
        return 0;
    }

    if (severity1Value === severity0Value) {
        return scale === 'descending'
            ? (value <= severity1Value ? 1 : 0)
            : (value >= severity1Value ? 1 : 0);
    }

    const raw = (value - severity0Value) / (severity1Value - severity0Value);
    return Math.max(0, Math.min(1, raw));
}

export function lerp(lowerValue, upperValue, severity) {
    if (
        !Number.isFinite(lowerValue) ||
        !Number.isFinite(upperValue) ||
        !Number.isFinite(severity)
    ) {
        return lowerValue;
    }
    const clampedSeverity = Math.max(0, Math.min(1, severity));
    return lowerValue + (upperValue - lowerValue) * clampedSeverity;
}

function readRunwayTargetMonths(profil, regimeKey) {
    const target = profil?.runway?.[regimeKey]?.total;
    return Number.isFinite(target) ? target : null;
}

export function calculateSmoothedRunwayTargetMonths({
    enabled = false,
    profil,
    discreteTargetMonths,
    minRunwayMonths,
    severity,
    neutralRegime = 'hot_neutral',
    stressRegime = 'bear'
} = {}) {
    if (!enabled || !Number.isFinite(discreteTargetMonths)) {
        return {
            targetMonths: discreteTargetMonths,
            smoothingActive: false,
            smoothingApplied: false,
            fallbackReason: !enabled ? 'disabled' : 'invalid_discrete_target',
            severity: 0,
            rawTargetMonths: Number.isFinite(discreteTargetMonths) ? discreteTargetMonths : null,
            lowerTargetMonths: null,
            upperTargetMonths: null
        };
    }

    const lowerTarget = readRunwayTargetMonths(profil, neutralRegime);
    const upperTarget = readRunwayTargetMonths(profil, stressRegime);
    if (!Number.isFinite(lowerTarget) || !Number.isFinite(upperTarget) || !Number.isFinite(severity)) {
        return {
            targetMonths: discreteTargetMonths,
            smoothingActive: false,
            smoothingApplied: false,
            fallbackReason: !Number.isFinite(severity) ? 'invalid_severity' : 'incomplete_support_targets',
            severity: 0,
            rawTargetMonths: discreteTargetMonths,
            lowerTargetMonths: lowerTarget,
            upperTargetMonths: upperTarget
        };
    }

    const clampedSeverity = Math.max(0, Math.min(1, severity));
    const lowerBound = Math.min(lowerTarget, upperTarget);
    const upperBound = Math.max(lowerTarget, upperTarget);
    const effectiveMinimum = Number.isFinite(minRunwayMonths) ? minRunwayMonths : lowerBound;
    const smoothed = Math.max(effectiveMinimum, lerp(lowerTarget, upperTarget, clampedSeverity));
    const bounded = Math.max(lowerBound, Math.min(upperBound, smoothed));

    return {
        targetMonths: bounded,
        smoothingActive: true,
        smoothingApplied: bounded !== discreteTargetMonths,
        fallbackReason: null,
        severity: clampedSeverity,
        rawTargetMonths: discreteTargetMonths,
        lowerTargetMonths: lowerTarget,
        upperTargetMonths: upperTarget
    };
}

export function buildRegimeSignalContract() {
    return {
        drawdownSeverity: {
            source: 'abstandVomAthProzent',
            severity0Value: 10,
            severity1Value: 30,
            scale: 'ascending',
            hardBoundary: false
        },
        capeSeverity: {
            source: 'capeRatio',
            severity0Value: 25,
            severity1Value: 35,
            scale: 'ascending',
            hardBoundary: false
        },
        runwaySeverity: {
            source: 'runwayMonths',
            severity0Value: 60,
            severity1Value: 36,
            scale: 'descending',
            hardBoundary: false
        }
    };
}

function resolveSignalValue(inputs, definition) {
    if (!definition || typeof definition.source !== 'string') {
        return undefined;
    }
    return inputs?.[definition.source];
}

function calculateSeverityFromDefinition(value, definition) {
    if (!definition) {
        return 0;
    }
    return interpolateRange(
        value,
        definition.severity0Value,
        definition.severity1Value,
        { scale: definition.scale }
    );
}

export function calculateRegimeSignalSeverities({
    drawdownPct,
    capeRatio,
    runwayMonths,
    contract = buildRegimeSignalContract()
} = {}) {
    return {
        drawdownSeverity: calculateSeverityFromDefinition(drawdownPct, contract.drawdownSeverity),
        capeSeverity: calculateSeverityFromDefinition(capeRatio, contract.capeSeverity),
        runwaySeverity: calculateSeverityFromDefinition(runwayMonths, contract.runwaySeverity)
    };
}

export function buildRegimeSignalSnapshot({
    abstandVomAthProzent,
    capeRatio,
    runwayMonths,
    contract = buildRegimeSignalContract()
} = {}) {
    const inputs = { abstandVomAthProzent, capeRatio, runwayMonths };
    const severities = {};
    const factors = {};

    for (const [key, definition] of Object.entries(contract || {})) {
        const rawValue = resolveSignalValue(inputs, definition);
        const severity = calculateSeverityFromDefinition(rawValue, definition);
        severities[key] = severity;
        factors[key] = {
            source: definition?.source || null,
            rawValue: Number.isFinite(rawValue) ? rawValue : null,
            severity,
            severityPct: Math.round(severity * 100),
            severity0Value: Number.isFinite(definition?.severity0Value) ? definition.severity0Value : null,
            severity1Value: Number.isFinite(definition?.severity1Value) ? definition.severity1Value : null,
            scale: definition?.scale === 'descending' ? 'descending' : 'ascending',
            hardBoundary: Boolean(definition?.hardBoundary)
        };
    }

    return {
        severities,
        factors,
        smoothingApplied: Object.values(severities).some(severity => severity > 0 && severity < 1)
    };
}
