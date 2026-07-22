"use strict";

import { quantile } from './simulator-utils.js';

export const MONTE_CARLO_SMALL_SAMPLE_THRESHOLD = 1000;
const WILSON_95_Z = 1.959963984540054;

function assertNonNegativeInteger(value, label) {
    if (!Number.isSafeInteger(value) || value < 0) {
        throw new TypeError(`${label} must be a non-negative safe integer.`);
    }
}

export function calculateWilson95Interval(successes, trials) {
    assertNonNegativeInteger(successes, 'successes');
    assertNonNegativeInteger(trials, 'trials');
    if (successes > trials) {
        throw new TypeError('successes must not exceed trials.');
    }
    if (trials === 0) return null;

    const estimate = successes / trials;
    const zSquared = WILSON_95_Z ** 2;
    const denominator = 1 + (zSquared / trials);
    const centre = (estimate + (zSquared / (2 * trials))) / denominator;
    const halfWidth = (WILSON_95_Z / denominator) * Math.sqrt(
        (estimate * (1 - estimate) / trials) + (zSquared / (4 * trials ** 2))
    );
    const lowerRatio = Math.max(0, centre - halfWidth);
    const upperRatio = Math.min(1, centre + halfWidth);

    return {
        method: 'wilson_score',
        confidenceLevel: 0.95,
        lowerRatio,
        upperRatio,
        lowerPct: lowerRatio * 100,
        upperPct: upperRatio * 100
    };
}

export function buildBinaryProportionEstimate({
    successes,
    trials,
    technicalErrorCount = 0,
    smallSampleThreshold = MONTE_CARLO_SMALL_SAMPLE_THRESHOLD
} = {}) {
    assertNonNegativeInteger(successes, 'successes');
    assertNonNegativeInteger(trials, 'trials');
    assertNonNegativeInteger(technicalErrorCount, 'technicalErrorCount');
    assertNonNegativeInteger(smallSampleThreshold, 'smallSampleThreshold');
    if (successes > trials) {
        throw new TypeError('successes must not exceed trials.');
    }

    const failClosed = technicalErrorCount > 0;
    const estimateRatio = !failClosed && trials > 0 ? successes / trials : null;
    const warning = failClosed
        ? {
            code: 'technical_error_in_batch',
            message: 'Schaetzer und Intervall werden wegen technischer Fehler fail-closed nicht ausgewiesen.'
        }
        : trials > 0 && trials < smallSampleThreshold
            ? {
                code: 'small_sample',
                thresholdRuns: smallSampleThreshold,
                message: `Nur ${trials} Laeufe: Das Intervall ist breit und der Punktschaetzer nicht hochpraezise.`
            }
            : trials === 0
                ? {
                    code: 'no_requested_runs',
                    message: 'Ohne angeforderte Laeufe ist kein Schaetzer definiert.'
                }
                : null;

    return {
        estimator: 'binomial_proportion',
        numerator: successes,
        denominator: trials,
        sampleSize: trials,
        estimateRatio,
        estimatePct: estimateRatio === null ? null : estimateRatio * 100,
        confidenceInterval95: failClosed ? null : calculateWilson95Interval(successes, trials),
        uncertaintyWarning: warning,
        interpretation: 'Das Intervall quantifiziert Simulationsfehler des binaeren Schaetzers, nicht Modellrisiko.'
    };
}

export function summarizePerRunRealWithdrawalP10({
    values,
    observationCounts,
    missingness,
    totalRuns,
    missingnessCodes
} = {}) {
    assertNonNegativeInteger(totalRuns, 'totalRuns');
    if (!values || !observationCounts || !missingness) {
        return {
            realEur: null,
            p50RealEur: null,
            sampleSize: 0,
            excludedRuns: totalRuns,
            missingness: {
                no_observations: totalRuns,
                died_before_first_obligation: 0,
                technical_error: 0,
                not_applicable: 0
            },
            unit: 'real_eur_at_simulation_start_prices',
            perRunStatistic: 'p10',
            uncertainty: {
                confidenceInterval: null,
                reason: 'quantile_confidence_interval_not_estimated'
            }
        };
    }
    if (values.length !== totalRuns
        || observationCounts.length !== totalRuns
        || missingness.length !== totalRuns) {
        throw new TypeError('Per-run withdrawal arrays must match totalRuns.');
    }

    const codes = missingnessCodes || {};
    const observedValues = [];
    const inventory = {
        no_observations: 0,
        died_before_first_obligation: 0,
        technical_error: 0,
        not_applicable: 0
    };
    for (let index = 0; index < totalRuns; index++) {
        const state = missingness[index];
        const count = observationCounts[index];
        if (state === codes.OBSERVED) {
            if (!Number.isSafeInteger(count) || count <= 0 || !Number.isFinite(values[index])) {
                throw new TypeError(`Observed withdrawal run ${index} has an invalid scalar or observation count.`);
            }
            observedValues.push(values[index]);
        } else if (state === codes.DIED_BEFORE_FIRST_OBLIGATION) {
            inventory.died_before_first_obligation++;
        } else if (state === codes.TECHNICAL_ERROR) {
            inventory.technical_error++;
        } else if (state === codes.NOT_APPLICABLE) {
            inventory.not_applicable++;
        } else {
            inventory.no_observations++;
        }
    }

    const sampleSize = observedValues.length;
    return {
        realEur: sampleSize > 0 ? quantile(observedValues, 0.1) : null,
        p50RealEur: sampleSize > 0 ? quantile(observedValues, 0.5) : null,
        sampleSize,
        excludedRuns: totalRuns - sampleSize,
        missingness: inventory,
        unit: 'real_eur_at_simulation_start_prices',
        perRunStatistic: 'p10',
        uncertainty: {
            confidenceInterval: null,
            reason: 'quantile_confidence_interval_not_estimated'
        }
    };
}
