import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    STRESS_REPLAY_SCOPE,
    STRESS_REPLAY_UNITS_V1,
    StressReplayContractError,
    createStressReplayComparisonFingerprint,
    createStressReplayFingerprint,
    validateStressReplayComparisonV1
} from '../app/simulator/stress-replay-contract.js';
import {
    buildStressReplayComparisonV1,
    removeStressReplayComparisonVariantV1,
    runStressReplayComparisonV1
} from '../app/simulator/stress-replay-comparison.js';
import {
    STRESS_REPLAY_TRANSACTION_CLASSES,
    STRESS_REPLAY_TRANSACTION_EVENT_VERSION
} from '../app/simulator/stress-replay-transactions.js';
import {
    createStressReplayBaselineVariantV1,
    createStressReplayVariantV1
} from '../app/simulator/stress-replay-variant.js';

function assertJsonEqual(actual, expected, message) {
    assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}

function assertContractError(callback, code, message) {
    try {
        callback();
        assert(false, `${message}: expected ${code}`);
    } catch (error) {
        assert(
            error instanceof StressReplayContractError && error.code === code,
            `${message}: received ${error?.name || typeof error}/${error?.code || 'without-code'}`
        );
    }
}

function baselineInputs(overrides = {}) {
    return {
        startAlter: 65,
        geschlecht: 'm',
        partner: { aktiv: false },
        startFloorBedarf: 10000,
        startFlexBedarf: 2000,
        minimumFlexAnnual: 500,
        depotTranchesAktien: [{ marketValue: 100, costBasis: 80 }],
        depotTranchesGold: [],
        liquidityRunwayYears: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        decumulation: { mode: 'standard' },
        dynamicFlex: false,
        horizonMethod: 'mean',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1,
        longevityMode: 'none',
        longevityQuantileShift: 0,
        longevityRelativePct: 0,
        longevityBufferYears: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        ...overrides
    };
}

const inputs = baselineInputs();
const baseline = createStressReplayBaselineVariantV1({ baselineInputs: inputs });
const single = createStressReplayVariantV1({
    id: 'single',
    label: 'Single',
    baselineInputs: inputs,
    patch: { strategy: { maxSkimPctOfEq: 12 } }
});
const multi = createStressReplayVariantV1({
    id: 'multi',
    label: 'Multi',
    baselineInputs: inputs,
    patch: { strategy: { maxSkimPctOfEq: 14, dynamicFlex: true } }
});
const pathFingerprint = createStressReplayFingerprint({ fixedPath: 1 });

function transaction(variantId, grossEur) {
    return {
        schemaVersion: STRESS_REPLAY_TRANSACTION_EVENT_VERSION,
        id: `0:0:${STRESS_REPLAY_TRANSACTION_CLASSES.POLICY_REBALANCING_SALE}`,
        class: STRESS_REPLAY_TRANSACTION_CLASSES.POLICY_REBALANCING_SALE,
        phase: 'fixture',
        yearIndex: 0,
        historicalYear: 2000,
        sequence: 0,
        oracle: `${variantId}_fixture`,
        grossEur,
        netEur: grossEur,
        taxEur: null,
        requestedNetEur: null,
        breakdown: [],
        missingness: [{ field: 'taxEur', reason: 'fixture_tax_unobserved' }]
    };
}

function resultFor(variant, {
    finalValue = 100,
    flex = 1000,
    minimumShortfall = 0,
    terminalStatus = 'horizon_exhausted',
    technicalError = null,
    includeTransactions = false
} = {}) {
    const technical = terminalStatus === 'technical_error';
    const result = {
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.variantResult,
        runnerVersion: 'StressReplayRunnerV1',
        variantId: variant.id,
        role: variant.role,
        pathFingerprint,
        baselineScenarioFingerprint: variant.baselineScenarioFingerprint,
        variantFingerprint: variant.variantFingerprint,
        terminalStatus,
        summary: technical ? null : {
            finalValueNominalEur: finalValue,
            finalValueRealEur: finalValue,
            maximumDrawdownNominalPct: 10,
            maximumDrawdownRealPct: 12,
            totalWithdrawalsEur: 1000,
            totalFlexFulfilledEur: flex,
            totalMinimumFlexShortfallEur: minimumShortfall,
            totalTaxesEur: 20,
            totalHealthBucketUsedEur: null,
            financiallyEvaluatedYears: 1,
            ruinYear: terminalStatus === 'ruin' ? 0 : null
        },
        yearResults: technical ? [] : [{
            yearIndex: 0,
            historicalYear: 2000,
            status: 'financial_year',
            nominalValueEur: finalValue,
            realValueEur: finalValue,
            withdrawalEur: 1000,
            taxEur: 20
        }],
        scenarioLog: technical ? null : {
            records: [{
                jahr: 1,
                histJahr: 2000,
                entscheidung: { mode: variant.id, jahresEntnahme: 1000 },
                FlexRatePct: variant.role === 'baseline' ? 100 : 90,
                flex_erfuellt_nominal: flex,
                minimumFlexConfiguredAnnualEur: 500,
                minimumFlexFulfilledAnnualEur: 500 - minimumShortfall
            }]
        },
        transactions: technical || !includeTransactions ? [] : [transaction(variant.id, finalValue / 10)],
        missingness: technical ? [{ code: 'technical_error', yearIndex: 0 }] : [],
        warnings: variant.warnings,
        technicalError,
        reconciliation: technical
            ? { matched: false, reason: 'technical_error' }
            : { matched: variant.role === 'baseline', reason: variant.role === 'baseline' ? undefined : 'alternative_not_source_reconciled' }
    };
    result.resultFingerprint = createStressReplayFingerprint(result);
    return result;
}

console.log('Test 1: comparison is order-independent and emits paired delta markers');
const baselineResult = resultFor(baseline, { includeTransactions: true });
const singleResult = resultFor(single, { finalValue: 120, flex: 900, minimumShortfall: 100, includeTransactions: true });
const multiResult = resultFor(multi, {
    finalValue: 0,
    flex: 800,
    minimumShortfall: 200,
    terminalStatus: 'ruin'
});
const first = buildStressReplayComparisonV1({
    variants: [multi, baseline, single],
    results: [singleResult, multiResult, baselineResult]
});
const second = buildStressReplayComparisonV1({
    variants: [single, multi, baseline],
    results: [baselineResult, singleResult, multiResult]
});
assertJsonEqual(first.variantOrder, ['baseline', 'multi', 'single'], 'Alternatives must use stable id order');
assertEqual(first.comparisonFingerprint.value, second.comparisonFingerprint.value, 'Input order must not affect the comparison fingerprint');
const singlePair = first.pairwise.find(pair => pair.variantId === 'single');
assertEqual(singlePair.kpiDeltas.finalValueNominalEur.absoluteDelta, 20, 'Paired nominal delta must be alternative minus baseline');
assertEqual(singlePair.factorMode, 'single_factor', 'One material group must remain a single-factor comparison');
assert(singlePair.firstDeltaMarkers.some(entry => entry.category === 'portfolio_state'), 'Portfolio first delta must be explicit');
assert(singlePair.firstDeltaMarkers.some(entry => entry.category === 'policy_decision'), 'Policy first delta must be explicit');
assert(singlePair.firstDeltaMarkers.some(entry => entry.category === 'rebalancing'), 'Structured transactions must produce a rebalancing first delta');
assert(singlePair.firstDeltaMarkers.some(entry => entry.category === 'household_flex'), 'Household flex first delta must be explicit');
assert(singlePair.firstDeltaMarkers.some(entry => entry.category === 'minimum_flex_shortfall'), 'Minimum-flex first delta must be explicit');
assert(singlePair.firstDeltaMarkers.every(entry => Number.isSafeInteger(entry.yearIndex)
    && typeof entry.causeCode === 'string'
    && Array.isArray(entry.fields)), 'Every first delta needs year, cause and fields');
assert(first.pairwise.find(pair => pair.variantId === 'multi').factorMode === 'multi_factor', 'Multiple user factors must stay visibly multi-factor');
assert(first.pairwise.find(pair => pair.variantId === 'multi').firstDeltaMarkers.some(
    entry => entry.category === 'terminal_status'
), 'A changed terminal status must produce its own first delta');
assertEqual(first.financialRankingAllowed, false, 'A fixed-path comparison must never become a general ranking');

console.log('Test 1b: a recomputed fingerprint cannot legitimize a false KPI delta');
const forged = structuredClone(first);
forged.pairwise[0].kpiDeltas.finalValueNominalEur.absoluteDelta = 999;
forged.comparisonFingerprint = createStressReplayComparisonFingerprint(forged);
assertContractError(
    () => validateStressReplayComparisonV1(forged),
    'STRESS_REPLAY_CONTRACT_INVALID',
    'KPI deltas must reconcile with the embedded variant summaries'
);

console.log('Test 2: removing alternatives recomputes the immutable comparison but not the baseline');
const removed = removeStressReplayComparisonVariantV1(first, 'multi');
assertJsonEqual(removed.variantOrder, ['baseline', 'single'], 'Removing an alternative must preserve baseline-first order');
assert(removed.comparisonFingerprint.value !== first.comparisonFingerprint.value, 'Removal must produce a new comparison fingerprint');
assertContractError(
    () => removeStressReplayComparisonVariantV1(first, 'baseline'),
    'STRESS_REPLAY_BASELINE_IMMUTABLE',
    'Baseline removal must fail closed'
);

console.log('Test 3: the one-plus-three variant limit is enforced');
const extraOne = createStressReplayVariantV1({
    id: 'extra-1', label: 'Extra 1', baselineInputs: inputs, patch: { strategy: { maxSkimPctOfEq: 16 } }
});
const extraTwo = createStressReplayVariantV1({
    id: 'extra-2', label: 'Extra 2', baselineInputs: inputs, patch: { strategy: { maxSkimPctOfEq: 18 } }
});
assertContractError(
    () => buildStressReplayComparisonV1({
        variants: [baseline, single, multi, extraOne, extraTwo],
        results: [baselineResult, singleResult, multiResult, resultFor(extraOne), resultFor(extraTwo)]
    }),
    'STRESS_REPLAY_VARIANT_LIMIT_EXCEEDED',
    'A fourth alternative must fail closed'
);

console.log('Test 4: missing measurements remain null with field-level missingness');
assertEqual(singlePair.kpiDeltas.totalHealthBucketUsedEur.absoluteDelta, null, 'Unobserved health-bucket use must not be guessed as zero');
assert(singlePair.missingness.some(entry => entry.field === 'totalHealthBucketUsedEur'), 'Unobserved KPI must have structured missingness');
assertEqual(singlePair.kpiDeltas.ruinYear.applicability, 'not_applicable_neither_ruined', 'Jointly absent ruin years must be marked not applicable');
assertEqual(first.variants.find(entry => entry.variantId === 'single').transactionSummary[0].taxEur, null, 'Transaction tax missingness must survive aggregation');

console.log('Test 5: a technical result blocks the aggregate and its financial pair');
const technicalResult = resultFor(single, {
    terminalStatus: 'technical_error',
    technicalError: { code: 'FIXTURE_FAILURE', message: 'fixture', yearIndex: 0 }
});
const blocked = buildStressReplayComparisonV1({
    variants: [baseline, single],
    results: [technicalResult, baselineResult]
});
assertEqual(blocked.overallStatus, 'blocked_technical_error', 'Aggregate status must disclose technical blockage');
assertEqual(blocked.pairwise[0].comparable, false, 'Technical pair must not expose financial deltas');
assertEqual(blocked.pairwise[0].kpiDeltas, null, 'Technical pair must not convert failure into zero-valued KPIs');
assertEqual(blocked.pairwise[0].interpretation, 'financial_comparison_blocked_by_technical_error', 'Technical interpretation must be explicit');

function replayPath() {
    return {
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.path,
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        scope: STRESS_REPLAY_SCOPE,
        source: {
            requestFingerprint: createStressReplayFingerprint({ request: 1 }),
            seed: 1,
            rngMode: 'per-run-seed',
            absoluteRunIndex: 0,
            displayRunNumber: 1,
            scenarioKey: 'fixture',
            selectionMetric: 'nominal_terminal_wealth_eur',
            tieBreak: 'smallest_absolute_run_index',
            startYearIndex: 0
        },
        breakOnRuin: true,
        dataFingerprint: createStressReplayFingerprint({ data: 1 }),
        engineFingerprint: createStressReplayFingerprint({ engine: 1 }),
        units: { ...STRESS_REPLAY_UNITS_V1 },
        horizonYears: 1,
        effectiveLength: 1,
        terminalStatus: 'horizon_exhausted',
        initialMarketDataHist: [{ endeVJ: 100, endeVJ_1: 100, endeVJ_2: 100, endeVJ_3: 100 }],
        years: [{
            yearIndex: 0,
            recordType: 'financial_year',
            financiallyEvaluable: true,
            historicalYear: 2000,
            equityReturnPct: 0,
            goldReturnPct: 0,
            cashReturnPct: 0,
            inflationPct: 0,
            wageGrowthPct: 0,
            capeRatio: 20,
            regime: 'NORMAL',
            stressEvents: [],
            tailRiskEvents: [],
            householdEvents: [{ type: 'household_state', p1Alive: 1, p2Alive: null, effectiveFlexFactor: 1 }]
        }],
        reconciliation: { sourcePrefixMatched: true, sourcePrefixLength: 1 }
    };
}

console.log('Test 6: runner orchestration gives every variant an independent cloned start state');
const seenStartValues = [];
const orchestrated = runStressReplayComparisonV1({
    path: replayPath(),
    baselineInputs: inputs,
    sourceScenarioLog: [{ recordType: 'financial_year', jahr: 1, histJahr: 2000 }],
    alternatives: [single],
    dependencies: {
        initMcRunState: () => ({
            portfolio: { depotTranchesAktien: [{ marketValue: 100, costBasis: 80 }], depotTranchesGold: [], liquiditaet: 0 },
            cumulativeInflationFactor: 1,
            marketDataHist: {}
        }),
        simulateOneYear(state, adjustedInputs) {
            seenStartValues.push(state.portfolio.depotTranchesAktien[0].marketValue);
            state.portfolio.depotTranchesAktien[0].marketValue = adjustedInputs.maxSkimPctOfEq === 10 ? 100 : 120;
            return {
                kind: 'success',
                isRuin: false,
                newState: state,
                totalTaxesThisYear: 0,
                logData: {
                    wertAktien: state.portfolio.depotTranchesAktien[0].marketValue,
                    wertGold: 0,
                    liquiditaet: 0,
                    entscheidung: { jahresEntnahme: 0 },
                    floor_brutto: 0,
                    rente1: 0,
                    rente2: 0,
                    renteSum: 0,
                    FlexRatePct: 100,
                    flex_erfuellt_nominal: 0,
                    minimumFlexAnnual: 500,
                    minimumFlexEffectiveFinal: 500,
                    minimumFlexShortfallAnnual: 0,
                    health_bucket_used: 0,
                    QuoteEndPct: 0,
                    RealReturnEquityPct: 0,
                    RealReturnGoldPct: 0,
                    jahresentnahme_real: 0
                },
                ui: { vpw: null }
            };
        }
    }
});
assertJsonEqual(seenStartValues, [100, 100], 'Each run must receive a fresh initial portfolio');
assertJsonEqual(orchestrated.variantOrder, ['baseline', 'single'], 'Orchestrated result must preserve stable comparison order');
assertEqual(orchestrated.pairwise[0].kpiDeltas.finalValueNominalEur.absoluteDelta, 20, 'Independent run outputs must be paired correctly');

console.log('Stress replay comparison tests passed.');
