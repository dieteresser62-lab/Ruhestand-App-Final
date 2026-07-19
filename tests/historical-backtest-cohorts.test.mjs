import {
    HISTORICAL_BACKTEST_COHORT_HORIZON_CONVENTION,
    HISTORICAL_BACKTEST_COHORTS_SCHEMA_VERSION,
    runHistoricalBacktestCohorts
} from '../app/simulator/historical-backtest-cohorts.js';
import { createHistoricalBacktestContractProvider } from '../app/simulator/historical-backtest-contract.js';

console.log('--- Historical Backtest Cohorts Tests ---');

function captureError(callback) {
    try {
        callback();
        return null;
    } catch (error) {
        return error;
    }
}

function prepared(period, status = 'complete', reason = null) {
    return status === 'complete'
        ? { status, period: { ...period }, records: [], initialMarketHistory: {} }
        : { status, period: { ...period }, reason };
}

const callerInputs = Object.freeze({
    startVermoegen: 100,
    ansparphaseJahre: 2,
    nested: Object.freeze({ policy: 'fixed' })
});
const beforeInputs = JSON.stringify(callerInputs);
let batchCalls = 0;
let runCalls = 0;
let preparedReads = 0;
const batchProvider = Object.freeze({
    datasetId: 'cohort-fixture',
    revision: 'cohort-fixture-v1',
    contentHash: 'cohort-fixture-hash',
    temporalConventionId: 'realized_t_decision_t_minus_1_v1',
    prepareBatch(periods, options = {}) {
        batchCalls++;
        options.instrumentation?.onPeriodPreflight?.({ mode: 'cohort_batch', periods });
        return {
            status: 'incomplete',
            periods: periods.map((period, index) => index === 2
                ? prepared(period, 'incomplete', { code: 'missing_historical_year', year: period.startYear + 1 })
                : prepared(period))
        };
    }
});

const observedPeriods = [];
let preflightEvents = 0;
const result = runHistoricalBacktestCohorts({
    inputs: callerInputs,
    range: { startYear: 2000, endYear: 2005 },
    cohortHorizonYears: 3,
    historicalDataProvider: batchProvider,
    breakOnRuin: true,
    instrumentation: { onPeriodPreflight: () => { preflightEvents++; } },
    runSinglePath(args) {
        runCalls++;
        assert(Object.isFrozen(args.inputs), 'cohort runner passes an immutable input snapshot');
        assertEqual(args.inputs.ansparphaseJahre, 2, 'accumulation input is preserved for every cohort');
        const preflighted = args.historicalDataProvider.preparePeriod(args.period);
        preparedReads++;
        assertEqual(preflighted.status, 'complete', 'single path consumes the batch-prepared period');
        observedPeriods.push({ ...args.period });
        if (args.period.startYear === 2000) {
            return { outcome: { kind: 'completed' }, metrics: { values: { wealth_end_nominal_eur: 100 } } };
        }
        if (args.period.startYear === 2001) {
            return { outcome: { kind: 'ruin', ruinYear: 2003 }, metrics: { values: { wealth_end_nominal_eur: 0 } } };
        }
        return {
            outcome: { kind: 'technical_error', error: { code: 'TEST_TECHNICAL', message: 'test' } },
            error: { code: 'TEST_TECHNICAL', message: 'test' }
        };
    }
});

assertEqual(result.schemaVersion, HISTORICAL_BACKTEST_COHORTS_SCHEMA_VERSION, 'cohort result is versioned');
assertEqual(result.request.executionMode, 'rolling_cohorts', 'request identifies rolling-cohort execution');
assertEqual(result.request.cohortHorizonYears, 3, 'request records the fixed horizon');
assertEqual(result.request.horizonConvention, HISTORICAL_BACKTEST_COHORT_HORIZON_CONVENTION, 'inclusive horizon convention is explicit');
assertEqual(result.request.accumulationPhasePolicy, 'preserve_inputs_and_restart_yearIndex_at_zero_for_each_cohort', 'accumulation phase restarts consistently inside every fixed window');
assertEqual(result.request.automaticPolicySelection, false, 'cohort diagnosis never selects policy parameters');
assertEqual(result.request.successProbabilityClaim, false, 'cohort request disclaims success probability');
assertEqual(result.descriptor.overlappingWindows, true, 'overlapping windows are explicit');
assertEqual(result.descriptor.sampleCharacter, 'in_sample_diagnosis', 'in-sample character is explicit');
assertEqual(result.descriptor.independentTrials, false, 'cohorts are not called independent trials');
assertEqual(batchCalls, 1, 'all eligible cohorts use one batch preflight');
assertEqual(preflightEvents, 1, 'batch instrumentation fires once');
assertEqual(runCalls, 3, 'completed, ruin and technical cohorts run; incomplete data does not');
assertEqual(preparedReads, 3, 'every executed cohort consumes its prepared period without a second provider preflight');
assertEqual(observedPeriods[0].endYear, observedPeriods[0].startYear + 2, 'inclusive three-year horizon has end=start+2');
assert(observedPeriods.every(period => period.endYear - period.startYear + 1 === 3), 'all executed cohorts have identical inclusive horizon length');
assertEqual(result.inventory.candidate, 6, 'every requested start year is inventoried');
assertEqual(result.inventory.eligible, 4, 'only full fixed windows are eligible');
assertEqual(result.inventory.completed, 1, 'completed cohort is counted');
assertEqual(result.inventory.ruin, 1, 'ruin cohort is counted separately');
assertEqual(result.inventory.incomplete, 1, 'incomplete cohort remains in the eligible inventory');
assertEqual(result.inventory.technicalError, 1, 'technical cohort remains in the eligible inventory');
assertEqual(result.inventory.financiallyEvaluable, 2, 'only completed and ruin cohorts are financially evaluable');
assertEqual(result.inventory.excluded, 2, 'late starts with insufficient horizon remain excluded inventory entries');
assertEqual(result.inventory.exclusionReasons.insufficient_horizon, 2, 'insufficient horizon has an explicit reason count');
assertEqual(result.inventory.exclusionReasons.missing_historical_year, 1, 'data incompleteness has an explicit reason count');
assertEqual(result.inventory.exclusionReasons.TEST_TECHNICAL, 1, 'technical errors retain their stable code');
assertClose(result.inventory.ratesPct.completed, 25, 1e-12, 'completed rate divides by all eligible cohorts');
assertClose(result.inventory.ratesPct.ruin, 25, 1e-12, 'ruin rate divides by all eligible cohorts');
assertClose(result.inventory.ratesPct.incomplete, 25, 1e-12, 'incomplete rate divides by all eligible cohorts');
assertClose(result.inventory.ratesPct.technicalError, 25, 1e-12, 'technical rate divides by all eligible cohorts');
assertEqual(result.inventory.rateDenominator, 'all_eligible_cohorts', 'rate denominator is machine readable');
assertEqual(result.cohorts.length, result.inventory.eligible, 'no eligible cohort disappears from the result');
assertEqual(result.excluded[0].startYear, 2004, 'first ineligible start year is explicit');
assertEqual(result.excluded[0].reason.missingYears, 1, 'first exclusion identifies one missing horizon year');
assertEqual(result.excluded[1].reason.missingYears, 2, 'last exclusion identifies two missing horizon years');
assertEqual(JSON.stringify(callerInputs), beforeInputs, 'rolling cohorts do not mutate caller inputs');
assert(Object.isFrozen(result.request.inputs.nested), 'nested request inputs are immutable');

let exceptionalRuns = 0;
const exceptionResult = runHistoricalBacktestCohorts({
    inputs: {},
    range: { startYear: 2000, endYear: 2002 },
    cohortHorizonYears: 2,
    historicalDataProvider: {
        prepareBatch() {
            throw new Error('preflight failure');
        }
    },
    runSinglePath() {
        exceptionalRuns++;
    }
});
assertEqual(exceptionalRuns, 0, 'batch preflight exception prevents financial execution');
assertEqual(exceptionResult.inventory.eligible, 2, 'eligible windows remain inventoried after batch failure');
assertEqual(exceptionResult.inventory.technicalError, 2, 'batch failure classifies every eligible window as technical');
assertEqual(exceptionResult.cohorts.length, 2, 'batch failure drops no eligible cohort');
assert(exceptionResult.cohorts.every(entry => entry.exclusionReason === 'COHORT_BATCH_PREFLIGHT_ERROR'), 'batch failure uses a stable exclusion code');

const invalidHorizon = captureError(() => runHistoricalBacktestCohorts({
    inputs: {},
    range: { startYear: 2000, endYear: 2002 },
    cohortHorizonYears: 0,
    historicalDataProvider: batchProvider
}));
assert(invalidHorizon instanceof TypeError, 'zero-length horizon is rejected');
const backwards = captureError(() => runHistoricalBacktestCohorts({
    inputs: {},
    range: { startYear: 2002, endYear: 2000 },
    cohortHorizonYears: 1,
    historicalDataProvider: batchProvider
}));
assert(backwards instanceof TypeError, 'backwards diagnosis range is rejected');

const productionProvider = createHistoricalBacktestContractProvider();
const integrated = runHistoricalBacktestCohorts({
    inputs: {
        startVermoegen: 100,
        startFloorBedarf: 0,
        startFlexBedarf: 0,
        minimumFlexAnnual: 0,
        flexBudgetAnnual: 0,
        flexBudgetRecharge: 0,
        renteMonatlich: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        partner: { brutto: 0 }
    },
    range: { startYear: 2000, endYear: 2002 },
    cohortHorizonYears: 2,
    historicalDataProvider: productionProvider,
    initializePortfolio: inputs => ({ value: inputs.startVermoegen }),
    totalPortfolio: portfolio => portfolio.value,
    computeAdjustmentPct: () => 0,
    resolveHorizon: () => ({ horizonYears: 30, diagnostics: { longevityMode: 'none' } }),
    simulateYear: (state, inputs, yearData, yearIndex) => {
        const value = state.portfolio.value + 1;
        return {
            kind: 'success',
            isRuin: false,
            newState: { ...state, portfolio: { value } },
            totalTaxesThisYear: 0,
            logData: {
                entscheidung: { jahresEntnahme: 0, kuerzungProzent: yearIndex === 0 ? 10 : 0 },
                wertAktien: value,
                wertGold: 0,
                liquiditaet: 0,
                portfolio_total_end: value,
                floor_aus_depot: 0,
                entnahme_effektiv: 0,
                RunwayCoveragePct: 100,
                steuern_gesamt: 0,
                taxSavedByLossCarry: 0,
                lossCarryEnd: 0,
                health_bucket_enabled: false,
                health_bucket_end: 0
            },
            ui: { vpw: null }
        };
    }
});
assertEqual(integrated.inventory.eligible, 2, 'production contract provider yields both eligible windows');
assertEqual(integrated.inventory.completed, 2, 'real single-path runner completes every prepared window');
assertEqual(integrated.inventory.excluded, 1, 'integrated boundary excludes the final short window');
assert(integrated.cohorts.every(entry => entry.runResult?.metrics?.schemaVersion === 'HistoricalBacktestMetricsV1'), 'integrated cohorts retain canonical single-path metrics');
assert(integrated.cohorts.every(entry => entry.runResult?.requestedYears === 2), 'integrated cohorts retain identical requested horizon length');

console.log('✅ Historical backtest cohorts tests passed');
