"use strict";

import { quantile, sum, mean } from './simulator-utils.js';
import { STRESS_PRESETS } from './simulator-data.js';
import { MC_HEATMAP_BINS } from './monte-carlo-runner-utils.js';
import { MONTE_CARLO_MISSINGNESS_CODE } from './monte-carlo-chunk-result.js';
import { summarizePerRunRealWithdrawalP10 } from './monte-carlo-statistics.js';

const NO_OBSERVATIONS = 'no_observations';
const WITHDRAWAL_RATE_DEFINITION_VERSION = 'MedianWithdrawalRateD14V1';
const FINANCIAL_DISTRIBUTION_DEFINITION_VERSION = 'MonteCarloFinancialRunDistributionV1';
const QUANTILE_METHOD = 'linear_interpolation_at_(n_minus_1)_q';

function conditionalMedian(values) {
    return values.length > 0 ? quantile(values, 0.5) : null;
}

function buildFinancialRunDistribution(values, pathMissingness, totalRuns, unit) {
    if (!values || values.length !== totalRuns) {
        throw new TypeError('Financial run distributions must match totalRuns.');
    }
    if (pathMissingness !== undefined && pathMissingness !== null
        && pathMissingness.length !== totalRuns) {
        throw new TypeError('Financial run distribution missingness must match totalRuns.');
    }
    const observedValues = [];
    let technicalErrorCount = 0;
    for (let index = 0; index < totalRuns; index++) {
        if (pathMissingness?.[index] === MONTE_CARLO_MISSINGNESS_CODE.TECHNICAL_ERROR) {
            technicalErrorCount++;
            continue;
        }
        const value = Number(values[index]);
        if (!Number.isFinite(value)) {
            throw new TypeError(`Financial run distribution value ${index} must be finite.`);
        }
        observedValues.push(value);
    }
    return {
        definitionVersion: FINANCIAL_DISTRIBUTION_DEFINITION_VERSION,
        values: observedValues,
        requestedRuns: totalRuns,
        sampleSize: observedValues.length,
        excludedRuns: technicalErrorCount,
        missingness: {
            technical_error: technicalErrorCount
        },
        unit,
        quantileMethod: QUANTILE_METHOD
    };
}

function assertDrawdownPct(value, label) {
    if (!Number.isFinite(value) || value < 0 || value > 100) {
        throw new RangeError(`${label} must be a finite positive loss magnitude inside 0..100 percentage points.`);
    }
}

function buildRealDrawdownDistribution(values, observationCounts, missingness, totalRuns) {
    if (!values || !observationCounts || !missingness
        || values.length !== totalRuns
        || observationCounts.length !== totalRuns
        || missingness.length !== totalRuns) {
        throw new TypeError('Real drawdown arrays must match totalRuns.');
    }
    const observedValues = [];
    const inventory = {
        missing_inflation: 0,
        no_observations: 0,
        technical_error: 0
    };
    let pathPointsAvailable = 0;
    for (let index = 0; index < totalRuns; index++) {
        const count = observationCounts[index];
        if (!Number.isSafeInteger(count) || count < 0) {
            throw new TypeError(`Real drawdown observation count ${index} must be a non-negative integer.`);
        }
        pathPointsAvailable += count;
        const state = missingness[index];
        if (state === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED) {
            if (count < 1) throw new TypeError(`Observed real drawdown run ${index} has no path points.`);
            const value = Number(values[index]);
            assertDrawdownPct(value, `Real drawdown run ${index}`);
            observedValues.push(value);
        } else if (state === MONTE_CARLO_MISSINGNESS_CODE.MISSING_INFLATION) {
            inventory.missing_inflation++;
        } else if (state === MONTE_CARLO_MISSINGNESS_CODE.TECHNICAL_ERROR) {
            inventory.technical_error++;
        } else {
            inventory.no_observations++;
        }
    }
    return {
        definitionVersion: FINANCIAL_DISTRIBUTION_DEFINITION_VERSION,
        values: observedValues,
        requestedRuns: totalRuns,
        sampleSize: observedValues.length,
        excludedRuns: totalRuns - observedValues.length,
        missingness: inventory,
        observationCount: {
            requestedPaths: totalRuns,
            observedPaths: observedValues.length,
            pathPointsAvailable
        },
        unit: 'percent_loss_from_prior_peak_real_start_prices',
        quantileMethod: QUANTILE_METHOD
    };
}

function buildPersonCareAggregate({
    triggeredCount,
    totalRuns,
    entryAges,
    careYears,
    realCostsEur
}) {
    const sampleSize = entryAges.length;
    return {
        entryRatePct: totalRuns > 0 ? (triggeredCount / totalRuns) * 100 : null,
        entryRateNumerator: triggeredCount,
        entryRateDenominator: totalRuns,
        entryAgeP50: conditionalMedian(entryAges),
        careYearsP50: conditionalMedian(careYears),
        realCostEurP50: conditionalMedian(realCostsEur),
        sampleSize,
        missingness: sampleSize > 0 ? null : NO_OBSERVATIONS
    };
}

function summarizePerRunMeanWithdrawalRate(buffers, totalRuns) {
    const values = buffers?.meanWithdrawalRateRatio;
    const observationCounts = buffers?.withdrawalRateObservationCount;
    const missingness = buffers?.meanWithdrawalRateMissingness;
    const inventory = {
        no_observations: 0,
        died_before_first_obligation: 0,
        technical_error: 0,
        not_applicable: 0
    };
    if (!values || !observationCounts || !missingness) {
        inventory.no_observations = totalRuns;
        return {
            definitionVersion: WITHDRAWAL_RATE_DEFINITION_VERSION,
            medianRatio: null,
            sampleSize: 0,
            excludedRuns: totalRuns,
            missingness: inventory,
            runMeanRatios: [],
            unit: 'ratio',
            numerator: 'jahresEntnahmeEffektiv',
            denominator: 'depotwertGesamt',
            denominatorScope: 'equity_bond_and_gold_tranches_excluding_liquidity_and_health_bucket',
            terminalRuinYearNumerator: 'jahresEntnahmeEffektiv_actual_payout_only',
            includedYears: 'calculated_decumulation_years_with_living_household_member_and_finite_rate_including_actual_terminal_ruin_year',
            excludedYears: [
                'accumulation',
                'technical_error',
                'death_log',
                'synthetic_post_ruin'
            ],
            perRunStatistic: 'arithmetic_mean',
            acrossRunStatistic: 'median',
            quantileMethod: QUANTILE_METHOD
        };
    }
    if (values.length !== totalRuns
        || observationCounts.length !== totalRuns
        || missingness.length !== totalRuns) {
        throw new TypeError('Per-run withdrawal-rate arrays must match totalRuns.');
    }

    const observedValues = [];
    for (let index = 0; index < totalRuns; index++) {
        const state = missingness[index];
        const count = observationCounts[index];
        if (state === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED) {
            if (!Number.isSafeInteger(count) || count <= 0 || !Number.isFinite(values[index])) {
                throw new TypeError(`Observed withdrawal-rate run ${index} has an invalid scalar or observation count.`);
            }
            observedValues.push(values[index]);
        } else if (state === MONTE_CARLO_MISSINGNESS_CODE.DIED_BEFORE_FIRST_OBLIGATION) {
            inventory.died_before_first_obligation++;
        } else if (state === MONTE_CARLO_MISSINGNESS_CODE.TECHNICAL_ERROR) {
            inventory.technical_error++;
        } else if (state === MONTE_CARLO_MISSINGNESS_CODE.NOT_APPLICABLE) {
            inventory.not_applicable++;
        } else {
            inventory.no_observations++;
        }
    }

    return {
        definitionVersion: WITHDRAWAL_RATE_DEFINITION_VERSION,
        medianRatio: observedValues.length > 0 ? quantile(observedValues, 0.5) : null,
        sampleSize: observedValues.length,
        excludedRuns: totalRuns - observedValues.length,
        missingness: inventory,
        runMeanRatios: observedValues,
        unit: 'ratio',
        numerator: 'jahresEntnahmeEffektiv',
        denominator: 'depotwertGesamt',
        denominatorScope: 'equity_bond_and_gold_tranches_excluding_liquidity_and_health_bucket',
        terminalRuinYearNumerator: 'jahresEntnahmeEffektiv_actual_payout_only',
        includedYears: 'calculated_decumulation_years_with_living_household_member_and_finite_rate_including_actual_terminal_ruin_year',
        excludedYears: [
            'accumulation',
            'technical_error',
            'death_log',
            'synthetic_post_ruin'
        ],
        perRunStatistic: 'arithmetic_mean',
        acrossRunStatistic: 'median',
        quantileMethod: QUANTILE_METHOD
    };
}

export function buildMonteCarloAggregates({
    inputs,
    totalRuns,
    buffers,
    heatmap,
    bins,
    totals,
    lists
}) {
    const {
        finalOutcomes,
        taxOutcomes,
        kpiLebensdauer,
        kpiKuerzungsjahre,
        cutYearShareRatio,
        cutYearShareMissingness,
        kpiMaxKuerzung,
        volatilities,
        maxDrawdowns,
        realMaxDrawdowns,
        realMaxDrawdownObservationCount,
        realMaxDrawdownMissingness,
        depotErschoepft,
        alterBeiErschoepfung,
        alterBeiErschoepfungMissingness,
        anteilJahreOhneFlex,
        stress_maxDrawdowns,
        stress_timeQuoteAbove45,
        stress_cutYears,
        stress_CaR_P10_Real,
        stress_realWithdrawalObservationCount,
        stress_realWithdrawalP10Missingness,
        stress_recoveryYears
    } = buffers;
    const {
        outcomeRuinCount = 0,
        outcomeAllDeadCount = 0,
        outcomeHorizonExhaustedCount = 0,
        pflegeTriggeredCount = 0,
        p1TriggeredCount = 0,
        p2TriggeredCount = 0,
        totalSimulatedYears,
        totalYearsQuoteAbove45,
        totalYearsSafetyStage1plus = 0,
        totalYearsSafetyStage2 = 0,
        shortfallWithCareCount,
        shortfallNoCareProxyCount,
        runsSafetyStage1Triggered = 0,
        runsSafetyStage2Triggered = 0,
        totalTaxSavedByLossCarry = 0,
        healthBucketEnabledCount = 0,
        healthBucketUsedCount = 0,
        healthBucketDepletedCount = 0,
        totalHealthBucketUsed = 0,
        tailRiskRunsActiveCount = 0,
        tailRiskRunsAppliedCount = 0,
        tailRiskEventCount = 0,
        tailRiskEvaluatedYears = 0,
        tailRiskActiveYears = 0,
        tailRiskAppliedYears = 0,
        tailRiskSkippedHistoricalCrisisYears = 0
    } = totals;
    const {
        entryAges = [],
        entryAgesP2 = [],
        p1CareAdditionalNeedRealEur = [],
        p2CareAdditionalNeedRealEur = [],
        totalCareAdditionalNeedRealEur = [],
        endWealthWithCareRealEur = [],
        endWealthNoCareRealEur = [],
        p1CareYearsTriggered = [],
        p2CareYearsTriggered = [],
        bothCareYearsOverlapTriggered = [],
        maxAnnualCareAdditionalNeedRealEur = [],
        healthBucketUsedAmounts = [],
        healthBucketEndAmounts = [],
        healthBucketCoveragePct = [],
        healthBucketTargetGaps = [],
        healthBucketInterestAmounts = []
    } = lists;

    const positiveSuccessfulOutcomes = [];
    for (let i = 0; i < totalRuns; ++i) {
        if (finalOutcomes[i] > 0) positiveSuccessfulOutcomes.push(finalOutcomes[i]);
    }
    const successfulCount = outcomeAllDeadCount + outcomeHorizonExhaustedCount;
    const successfulPopulationIsConsistent = positiveSuccessfulOutcomes.length <= successfulCount;
    const successfulTerminalZeroCount = successfulPopulationIsConsistent
        ? successfulCount - positiveSuccessfulOutcomes.length
        : null;
    const successfulOutcomes = successfulPopulationIsConsistent
        ? [
            ...positiveSuccessfulOutcomes,
            ...Array.from({ length: successfulTerminalZeroCount }, () => 0)
        ]
        : [];

    const observedCutYearSharesPct = Array.from(cutYearShareRatio)
        .filter((_value, index) => (
            cutYearShareMissingness[index] === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED
        ))
        .map(value => value * 100);
    const cutYearSharePct = {
        p50: observedCutYearSharesPct.length > 0
            ? quantile(observedCutYearSharesPct, 0.5)
            : null,
        sampleSize: observedCutYearSharesPct.length,
        excludedRuns: Math.max(0, totalRuns - observedCutYearSharesPct.length),
        thresholdPct: 10,
        numerator: 'completed_decumulation_years_with_cut_gte_10_pct',
        denominator: 'completed_decumulation_years_with_finite_cut_decision'
    };

    const medianWithCare = conditionalMedian(endWealthWithCareRealEur);
    const medianNoCare = conditionalMedian(endWealthNoCareRealEur);
    const p1Care = buildPersonCareAggregate({
        triggeredCount: p1TriggeredCount,
        totalRuns,
        entryAges,
        careYears: p1CareYearsTriggered,
        realCostsEur: p1CareAdditionalNeedRealEur
    });
    const p2Care = buildPersonCareAggregate({
        triggeredCount: p2TriggeredCount,
        totalRuns,
        entryAges: entryAgesP2,
        careYears: p2CareYearsTriggered,
        realCostsEur: p2CareAdditionalNeedRealEur
    });
    const noCareRuns = Math.max(0, totalRuns - pflegeTriggeredCount);
    const pflegeResults = {
        p1: p1Care,
        p2: p2Care,
        household: {
            entryRatePct: totalRuns > 0 ? (pflegeTriggeredCount / totalRuns) * 100 : null,
            entryRateNumerator: pflegeTriggeredCount,
            entryRateDenominator: totalRuns,
            careYearsOverlapP50: conditionalMedian(bothCareYearsOverlapTriggered),
            totalAdditionalNeedRealEurP50: conditionalMedian(totalCareAdditionalNeedRealEur),
            maxAnnualAdditionalNeedRealEurP50: conditionalMedian(maxAnnualCareAdditionalNeedRealEur),
            endWealthWithCareRealEurP50: medianWithCare,
            endWealthNoCareRealEurP50: medianNoCare,
            shortfallRateWithCarePct: pflegeTriggeredCount > 0
                ? (shortfallWithCareCount / pflegeTriggeredCount) * 100
                : null,
            shortfallRateWithoutCarePct: noCareRuns > 0
                ? (shortfallNoCareProxyCount / noCareRuns) * 100
                : null,
            sampleSize: pflegeTriggeredCount,
            noCareSampleSize: noCareRuns,
            missingness: pflegeTriggeredCount > 0 ? null : NO_OBSERVATIONS
        },
        comparison: {
            endWealthNoCareMinusCareRealEur: medianNoCare !== null && medianWithCare !== null
                ? medianNoCare - medianWithCare
                : null,
            method: 'unpaired_group_median_difference',
            withCareSampleSize: endWealthWithCareRealEur.length,
            noCareSampleSize: endWealthNoCareRealEur.length,
            missingness: medianNoCare !== null && medianWithCare !== null ? null : NO_OBSERVATIONS
        },
        unitContract: {
            uiMonetaryValues: 'real_eur_at_simulation_start_prices',
            nominalPathFields: [
                'p1CareAdditionalNeedNominalEur',
                'p2CareAdditionalNeedNominalEur',
                'totalCareAdditionalNeedNominalEur',
                'maxAnnualCareAdditionalNeedNominalEur'
            ]
        }
    };

    const stressPresetKey = inputs.stressPreset || 'NONE';
    const realWithdrawalP10 = summarizePerRunRealWithdrawalP10({
        values: buffers.realWithdrawalP10RealEur,
        observationCounts: buffers.realWithdrawalObservationCount,
        missingness: buffers.realWithdrawalP10Missingness,
        totalRuns,
        missingnessCodes: MONTE_CARLO_MISSINGNESS_CODE
    });
    const stressRealWithdrawalP10 = summarizePerRunRealWithdrawalP10({
        values: stress_CaR_P10_Real,
        observationCounts: stress_realWithdrawalObservationCount,
        missingness: stress_realWithdrawalP10Missingness,
        totalRuns,
        missingnessCodes: MONTE_CARLO_MISSINGNESS_CODE
    });
    const medianWithdrawalRate = summarizePerRunMeanWithdrawalRate(buffers, totalRuns);
    const finalOutcomeDistribution = buildFinancialRunDistribution(
        finalOutcomes,
        buffers.meanWithdrawalRateMissingness,
        totalRuns,
        'nominal_eur'
    );
    const maxDrawdownDistribution = buildFinancialRunDistribution(
        maxDrawdowns,
        buffers.meanWithdrawalRateMissingness,
        totalRuns,
        'percent_loss_from_prior_peak'
    );
    for (const [index, value] of maxDrawdownDistribution.values.entries()) {
        assertDrawdownPct(value, `Nominal drawdown run ${index}`);
    }
    const realMaxDrawdownDistribution = buildRealDrawdownDistribution(
        realMaxDrawdowns,
        realMaxDrawdownObservationCount,
        realMaxDrawdownMissingness,
        totalRuns
    );
    const finalOutcomeValues = finalOutcomeDistribution.values;
    const maxDrawdownValues = maxDrawdownDistribution.values;
    return {
        outcomeCounts: {
            ruin: outcomeRuinCount,
            all_dead: outcomeAllDeadCount,
            horizon_exhausted: outcomeHorizonExhaustedCount
        },
        finalOutcomes: {
            p10: finalOutcomeValues.length > 0 ? quantile(finalOutcomeValues, 0.1) : null,
            p25: finalOutcomeValues.length > 0 ? quantile(finalOutcomeValues, 0.25) : null,
            p50: finalOutcomeValues.length > 0 ? quantile(finalOutcomeValues, 0.5) : null,
            p90: finalOutcomeValues.length > 0 ? quantile(finalOutcomeValues, 0.9) : null,
            distribution: finalOutcomeDistribution,
            p50_successful: successfulOutcomes.length > 0 ? quantile(successfulOutcomes, 0.5) : null,
            successfulCount,
            successfulTerminalZeroCount,
            successContract: 'outcome_status_all_dead_or_horizon_exhausted',
            successfulMissingness: successfulPopulationIsConsistent
                ? successfulCount > 0 ? null : NO_OBSERVATIONS
                : 'outcome_inventory_mismatch'
        },
        taxOutcomes: { p50: quantile(taxOutcomes, 0.5) },
        kpiLebensdauer: { mean: mean(kpiLebensdauer) },
        cutYearSharePct,
        kpiKuerzungsjahre: {
            p50: quantile(kpiKuerzungsjahre, 0.5),
            unit: 'years',
            deprecated: true,
            replacement: 'cutYearSharePct',
            removalTarget: 'Slice 11'
        },
        kpiMaxKuerzung: { p50: quantile(kpiMaxKuerzung, 0.5) },
        depotErschoepfungsQuote: (sum(depotErschoepft) / totalRuns) * 100,
        alterBeiErschoepfung: {
            p50: quantile(
                Array.from(alterBeiErschoepfung).filter((_age, index) => (
                    alterBeiErschoepfungMissingness[index] === MONTE_CARLO_MISSINGNESS_CODE.OBSERVED
                )),
                0.5
            ) || 0
        },
        anteilJahreOhneFlex: { p50: quantile(anteilJahreOhneFlex, 0.5) },
        volatilities: { p50: quantile(volatilities, 0.5) },
        maxDrawdowns: {
            p50: maxDrawdownValues.length > 0 ? quantile(maxDrawdownValues, 0.5) : null,
            p90: maxDrawdownValues.length > 0 ? quantile(maxDrawdownValues, 0.9) : null,
            distribution: maxDrawdownDistribution
        },
        realMaxDrawdowns: {
            p50: realMaxDrawdownDistribution.values.length > 0
                ? quantile(realMaxDrawdownDistribution.values, 0.5)
                : null,
            p90: realMaxDrawdownDistribution.values.length > 0
                ? quantile(realMaxDrawdownDistribution.values, 0.9)
                : null,
            distribution: realMaxDrawdownDistribution,
            missingness: realMaxDrawdownDistribution.missingness,
            observationCount: realMaxDrawdownDistribution.observationCount
        },
        realWithdrawalP10,
        medianWithdrawalRate,
        heatmap: heatmap.map(yearData => Array.from(yearData)),
        bins: bins || MC_HEATMAP_BINS,
        extraKPI: {
            timeShareQuoteAbove45: totalSimulatedYears > 0 ? totalYearsQuoteAbove45 / totalSimulatedYears : 0,
            consumptionAtRiskP10Real: realWithdrawalP10.realEur,
            dynamicFlexSafety: {
                yearShareStage1plus: totalSimulatedYears > 0 ? totalYearsSafetyStage1plus / totalSimulatedYears : 0,
                yearShareStage2: totalSimulatedYears > 0 ? totalYearsSafetyStage2 / totalSimulatedYears : 0,
                runShareStage1plus: totalRuns > 0 ? runsSafetyStage1Triggered / totalRuns : 0,
                runShareStage2: totalRuns > 0 ? runsSafetyStage2Triggered / totalRuns : 0,
                runsStage1plus: runsSafetyStage1Triggered || 0,
                runsStage2: runsSafetyStage2Triggered || 0
            },
            lossCarryTaxSavings: {
                total: totalTaxSavedByLossCarry || 0,
                perRunMean: totalRuns > 0 ? (totalTaxSavedByLossCarry / totalRuns) : 0
            },
            healthBucket: {
                enabledRatePct: totalRuns > 0 ? (healthBucketEnabledCount / totalRuns) * 100 : 0,
                usedRatePct: totalRuns > 0 ? (healthBucketUsedCount / totalRuns) * 100 : 0,
                depletedRatePct: healthBucketEnabledCount > 0 ? (healthBucketDepletedCount / healthBucketEnabledCount) * 100 : 0,
                usedRuns: healthBucketUsedCount || 0,
                depletedRuns: healthBucketDepletedCount || 0,
                totalUsed: totalHealthBucketUsed || 0,
                usedMedian: healthBucketUsedAmounts.length ? quantile(healthBucketUsedAmounts, 0.5) : 0,
                usedP90: healthBucketUsedAmounts.length ? quantile(healthBucketUsedAmounts, 0.9) : 0,
                endMedian: healthBucketEndAmounts.length ? quantile(healthBucketEndAmounts, 0.5) : 0,
                coverageMedianPct: healthBucketCoveragePct.length ? quantile(healthBucketCoveragePct, 0.5) : null,
                targetGapMedian: healthBucketTargetGaps.length ? quantile(healthBucketTargetGaps, 0.5) : 0,
                interestMedian: healthBucketInterestAmounts.length ? quantile(healthBucketInterestAmounts, 0.5) : 0
            },
            tailRisk: {
                runActiveRatePct: totalRuns > 0 ? (tailRiskRunsActiveCount / totalRuns) * 100 : 0,
                runAppliedRatePct: totalRuns > 0 ? (tailRiskRunsAppliedCount / totalRuns) * 100 : 0,
                activeYearShare: tailRiskEvaluatedYears > 0 ? tailRiskActiveYears / tailRiskEvaluatedYears : 0,
                appliedYearShare: tailRiskEvaluatedYears > 0 ? tailRiskAppliedYears / tailRiskEvaluatedYears : 0,
                runsActive: tailRiskRunsActiveCount || 0,
                runsApplied: tailRiskRunsAppliedCount || 0,
                eventCount: tailRiskEventCount || 0,
                evaluatedYears: tailRiskEvaluatedYears || 0,
                activeYears: tailRiskActiveYears || 0,
                appliedYears: tailRiskAppliedYears || 0,
                skippedHistoricalCrisisYears: tailRiskSkippedHistoricalCrisisYears || 0
            },
            pflege: pflegeResults
        },
        stressKPI: {
            presetKey: stressPresetKey,
            years: STRESS_PRESETS[stressPresetKey]?.years || 0,
            maxDD: {
                p50: quantile(stress_maxDrawdowns, 0.50),
                p90: quantile(stress_maxDrawdowns, 0.90)
            },
            timeShareAbove45: {
                p50: quantile(stress_timeQuoteAbove45, 0.50)
            },
            cutYears: {
                p50: quantile(stress_cutYears, 0.50)
            },
            realWithdrawalP10: stressRealWithdrawalP10,
            consumptionAtRiskP10Real: {
                p50: stressRealWithdrawalP10.p50RealEur,
                deprecated: true,
                replacement: 'stressKPI.realWithdrawalP10',
                removalTarget: 'Slice 11'
            },
            recoveryYears: {
                p50: quantile(stress_recoveryYears, 0.50)
            }
        }
    };
}
