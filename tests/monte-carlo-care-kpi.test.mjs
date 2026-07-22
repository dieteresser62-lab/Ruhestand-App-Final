import { buildMonteCarloAggregates } from '../app/simulator/monte-carlo-aggregates.js';
import { MONTE_CARLO_MISSINGNESS_CODE } from '../app/simulator/monte-carlo-chunk-result.js';
import { createMonteCarloBuffers } from '../app/simulator/monte-carlo-runner-utils.js';
import {
    createMonteCarloCareNeedTracker,
    recordMonteCarloCareNeedYear
} from '../app/simulator/mc-run-metrics.js';

console.log('--- Monte Carlo Care KPI Golden Tests ---');

const needTracker = createMonteCarloCareNeedTracker();
recordMonteCarloCareNeedYear(needTracker, {
    p1CareAdditionalNeedNominalEur: 10000,
    p2CareAdditionalNeedNominalEur: 8000,
    priceFactor: 2
});
recordMonteCarloCareNeedYear(needTracker, {
    p1CareAdditionalNeedNominalEur: 6000,
    p2CareAdditionalNeedNominalEur: 0,
    priceFactor: 2
});
assertEqual(needTracker.maxAnnualCareAdditionalNeedNominalEur, 18000, 'Simultaneous nominal care need should use P1 plus P2, not their maximum');
assertEqual(needTracker.maxAnnualCareAdditionalNeedRealEur, 9000, 'Annual care need should be deflated to simulation-start prices');
assertEqual(needTracker.totalCareAdditionalNeedNominalEur, 24000, 'Nominal care need should accumulate without mixing price bases');
assertEqual(needTracker.totalCareAdditionalNeedRealEur, 12000, 'Real care need should accumulate in simulation-start prices');

function emptyLists() {
    return {
        entryAges: [],
        entryAgesP2: [],
        p1CareAdditionalNeedRealEur: [],
        p2CareAdditionalNeedRealEur: [],
        totalCareAdditionalNeedRealEur: [],
        endWealthWithCareRealEur: [],
        endWealthNoCareRealEur: [],
        p1CareYearsTriggered: [],
        p2CareYearsTriggered: [],
        bothCareYearsOverlapTriggered: [],
        maxAnnualCareAdditionalNeedRealEur: [],
        healthBucketUsedAmounts: [],
        healthBucketEndAmounts: [],
        healthBucketCoveragePct: [],
        healthBucketTargetGaps: [],
        healthBucketInterestAmounts: []
    };
}

function aggregateCare({ totalRuns, totals, lists }) {
    const buffers = createMonteCarloBuffers(totalRuns);
    buffers.cutYearShareMissingness.fill(MONTE_CARLO_MISSINGNESS_CODE.NO_OBSERVATIONS);
    return buildMonteCarloAggregates({
        inputs: { stressPreset: 'NONE', partner: { aktiv: true } },
        totalRuns,
        buffers,
        heatmap: [new Uint32Array([0])],
        bins: [0, Infinity],
        totals: {
            pflegeTriggeredCount: 0,
            p1TriggeredCount: 0,
            p2TriggeredCount: 0,
            totalSimulatedYears: 0,
            totalYearsQuoteAbove45: 0,
            shortfallWithCareCount: 0,
            shortfallNoCareProxyCount: 0,
            ...totals
        },
        lists: { ...emptyLists(), ...lists },
        allRealWithdrawalsSample: []
    }).extraKPI.pflege;
}

// Five deterministic cases: P1-only, P2-only, both without overlap, nobody,
// and simultaneous care with the annual household sum 10,000 + 8,000.
const care = aggregateCare({
    totalRuns: 5,
    totals: {
        pflegeTriggeredCount: 4,
        p1TriggeredCount: 3,
        p2TriggeredCount: 3,
        shortfallWithCareCount: 1,
        shortfallNoCareProxyCount: 0
    },
    lists: {
        entryAges: [72, 78, 82],
        entryAgesP2: [74, 80, 84],
        p1CareYearsTriggered: [3, 2, 2],
        p2CareYearsTriggered: [2, 1, 2],
        p1CareAdditionalNeedRealEur: [12000, 10000, 20000],
        p2CareAdditionalNeedRealEur: [8000, 6000, 16000],
        totalCareAdditionalNeedRealEur: [12000, 8000, 16000, 36000],
        maxAnnualCareAdditionalNeedRealEur: [6000, 4000, 5000, 18000],
        bothCareYearsOverlapTriggered: [0, 0, 0, 2],
        endWealthWithCareRealEur: [700000, 600000, 800000, 500000],
        endWealthNoCareRealEur: [1000000]
    }
});

assertEqual(care.p1.entryRateNumerator, 3, 'P1 entry counter should exclude P2-only and nobody cases');
assertEqual(care.p2.entryRateNumerator, 3, 'P2 entry counter should exclude P1-only and nobody cases');
assertEqual(care.p1.entryRateDenominator, 5, 'P1 entry denominator should use requested runs');
assertEqual(care.p2.entryRateDenominator, 5, 'P2 entry denominator should use requested runs');
assertClose(care.p1.entryRatePct, 60, 0, 'P1 entry rate should use its person-specific counter');
assertClose(care.p2.entryRatePct, 60, 0, 'P2 entry rate should use its person-specific counter');
assertEqual(care.p1.entryAgeP50, 78, 'P1 entry-age median should contain no P2-only zero sentinel');
assertEqual(care.p2.entryAgeP50, 80, 'P2 entry-age median should contain no P1-only zero sentinel');
assertEqual(care.p1.careYearsP50, 2, 'P1 care duration should use only P1 observations');
assertEqual(care.p2.careYearsP50, 2, 'P2 care duration should use only P2 observations');
assertEqual(care.household.sampleSize, 4, 'Household conditional sample should include all four care cases');
assertEqual(care.household.careYearsOverlapP50, 0, 'Observed zero overlap should remain a valid conditional value');
assertEqual(care.household.maxAnnualAdditionalNeedRealEurP50, 5500, 'Household annual need should aggregate actual P1+P2 yearly sums');
assertEqual(care.comparison.endWealthNoCareMinusCareRealEur, 350000, 'Wealth delta should be no-care median minus care median');
assertEqual(care.comparison.method, 'unpaired_group_median_difference', 'Wealth delta should disclose its non-causal group comparison');
assert(care.unitContract.nominalPathFields.every(field => field.endsWith('NominalEur')), 'Every nominal care export field should use the NominalEur suffix');

const empty = aggregateCare({ totalRuns: 2, totals: {}, lists: {} });
assertEqual(empty.p1.entryRatePct, 0, 'Observed P1 entry rate zero should remain numeric');
assertEqual(empty.p1.entryAgeP50, null, 'Empty P1 entry-age distribution should be nullable');
assertEqual(empty.p1.careYearsP50, null, 'Empty P1 care-years distribution should be nullable');
assertEqual(empty.p1.realCostEurP50, null, 'Empty P1 real-cost distribution should be nullable');
assertEqual(empty.p1.sampleSize, 0, 'Empty P1 conditional distribution should expose sample size zero');
assertEqual(empty.p1.missingness, 'no_observations', 'Empty P1 conditional distribution should expose a missingness reason');
assertEqual(empty.p2.entryAgeP50, null, 'Empty P2 entry-age distribution should be nullable');
assertEqual(empty.p2.sampleSize, 0, 'Empty P2 conditional distribution should expose sample size zero');

console.log('--- Monte Carlo Care KPI Golden Tests Completed ---');
