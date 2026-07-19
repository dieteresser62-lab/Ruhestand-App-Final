import {
    BACKTEST_REQUEST_SCHEMA_VERSION,
    BACKTEST_RESULT_SCHEMA_VERSION,
    runHistoricalBacktest
} from '../app/simulator/historical-backtest-runner.js';
import { HISTORICAL_TEMPORAL_CONVENTION_ID } from '../app/simulator/historical-backtest-contract.js';

console.log('--- Historical Backtest Runner Tests ---');

function freezeDeep(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const key of Reflect.ownKeys(value)) freezeDeep(value[key], seen);
    return Object.freeze(value);
}

function snapshot(value) {
    const seen = new WeakSet();
    return JSON.stringify(value, (key, entry) => {
        if (entry === undefined) return '__undefined__';
        if (entry && typeof entry === 'object') {
            if (seen.has(entry)) return '__cycle__';
            seen.add(entry);
        }
        return entry;
    });
}

function expectThrow(callback, pattern, message) {
    let error = null;
    try {
        callback();
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof Error && pattern.test(error.message), message);
}

const callerInputs = {
    startVermoegen: 100,
    startFloorBedarf: 12,
    startFlexBedarf: 3,
    minimumFlexAnnual: 1,
    flexBudgetAnnual: 2,
    flexBudgetRecharge: 0.5,
    renteMonatlich: 1,
    rentAdjMode: 'fix',
    rentAdjPct: 2,
    marketCapeRatio: 20,
    partner: {
        brutto: 24,
        metadata: { label: 'caller', optional: undefined }
    },
    minimumFlexProfiles: [
        { profileId: 'p1', minimumFlexAnnual: 1 }
    ],
    detailTranches: [
        { id: 'lot-1', nested: { acquisitionYear: 1999 } }
    ],
    createdAt: new Date('2020-01-02T00:00:00.000Z'),
    markerPattern: /legacy/gi
};
callerInputs.self = callerInputs;
freezeDeep(callerInputs);

const historicalRecords = {
    1996: { msci_eur: 70, gold_eur_perf: 1, zinssatz_de: 1, inflation_de: 0.4, lohn_de: 1.1, cape: 15 },
    1997: { msci_eur: 80, gold_eur_perf: 2, zinssatz_de: 1.2, inflation_de: 0.6, lohn_de: 1.2, cape: 16 },
    1998: { msci_eur: 90, gold_eur_perf: 3, zinssatz_de: 1.5, inflation_de: 0.8, lohn_de: 1.3, cape: 17 },
    1999: {
        msci_eur: 100,
        gold_eur_perf: 4,
        zinssatz_de: 2,
        inflation_de: 1,
        lohn_de: 1.5,
        cape: 18,
        nested: { source: 'caller-1999' }
    },
    2000: {
        msci_eur: 110,
        gold_eur_perf: 5,
        zinssatz_de: 2.5,
        inflation_de: 1.2,
        lohn_de: 1.7,
        cape: 19,
        nested: { source: 'caller-2000' }
    },
    2001: {
        msci_eur: 121,
        gold_eur_perf: 6,
        zinssatz_de: 3,
        inflation_de: 1.4,
        lohn_de: 1.9,
        cape: 20,
        nested: { source: 'caller-2001' }
    }
};
freezeDeep(historicalRecords);

function observation(seriesId, value, sourceYear, extra = {}) {
    return {
        seriesId,
        value,
        sourceYear,
        asOfYear: sourceYear,
        qualityStatus: 'present',
        ...extra
    };
}

function makeHistoricalYearRecord(year) {
    const previous = historicalRecords[year - 1];
    const current = historicalRecords[year];
    return freezeDeep({
        schemaVersion: 'HistoricalYearRecordV1',
        year,
        simulationYear: year,
        temporalConventionId: HISTORICAL_TEMPORAL_CONVENTION_ID,
        alignmentStatus: 'approved_d01',
        realized: {
            equityReturn: observation('msci_eur', (current.msci_eur / previous.msci_eur) - 1, year, {
                inputs: {
                    previousSourceYear: year - 1,
                    previousIndexLevel: previous.msci_eur,
                    currentSourceYear: year,
                    currentIndexLevel: current.msci_eur
                }
            }),
            goldReturn: observation('gold_eur_perf', current.gold_eur_perf, year),
            cashBondReturn: observation('zinssatz_de', current.zinssatz_de, year),
            inflation: observation('inflation_de', current.inflation_de, year),
            wagePensionAdjustment: observation('lohn_de', current.lohn_de, year)
        },
        decisionAsOf: {
            capeRatio: observation('cape', previous.cape, year - 1)
        }
    });
}

function createContractProvider({ incompleteYear = null } = {}) {
    return freezeDeep({
        datasetId: 'runner-fixture',
        revision: 'runner-fixture-v1',
        contentHash: 'fixture-hash',
        temporalConventionId: HISTORICAL_TEMPORAL_CONVENTION_ID,
        preparePeriod(period) {
            if (!Number.isInteger(period?.startYear)
                || !Number.isInteger(period?.endYear)
                || period.startYear > period.endYear) {
                throw new TypeError('invalid historical period');
            }
            if (incompleteYear !== null) {
                return freezeDeep({
                    status: 'incomplete',
                    period: { ...period },
                    reason: { code: 'missing_historical_year', year: incompleteYear, phase: 'requested_period' }
                });
            }
            const records = [];
            for (let year = period.startYear; year <= period.endYear; year++) records.push(makeHistoricalYearRecord(year));
            return freezeDeep({
                status: 'complete',
                period: { ...period },
                requestedYears: records.length,
                temporalConventionId: HISTORICAL_TEMPORAL_CONVENTION_ID,
                initialMarketHistory: {
                    levels: {
                        endeVJ: observation('msci_eur', historicalRecords[period.startYear - 1].msci_eur, period.startYear - 1),
                        endeVJ_1: observation('msci_eur', historicalRecords[period.startYear - 2].msci_eur, period.startYear - 2),
                        endeVJ_2: observation('msci_eur', historicalRecords[period.startYear - 3].msci_eur, period.startYear - 3),
                        endeVJ_3: observation('msci_eur', historicalRecords[period.startYear - 4].msci_eur, period.startYear - 4)
                    },
                    allTimeHigh: observation('msci_eur', historicalRecords[period.startYear - 1].msci_eur, period.startYear - 1),
                    yearsSinceAllTimeHigh: 0
                },
                records
            });
        }
    });
}

const callerInputsBefore = snapshot(callerInputs);
const historicalBefore = snapshot(historicalRecords);
const observedYears = [];

const dependencies = {
    initializePortfolio: inputs => ({ value: inputs.startVermoegen }),
    totalPortfolio: portfolio => portfolio.value,
    computeAdjustmentPct: (context, yearIndex) => {
        assertEqual(context.simStartYear, 2000, 'runner passes the explicit start year to the adjustment dependency');
        return context.inputs.rentAdj.pct + yearIndex;
    },
    resolveHorizon: (inputs, { yearIndex }) => ({
        horizonYears: 30 - yearIndex,
        diagnostics: yearIndex === 0
            ? { longevityMode: 'none' }
            : { longevityMode: 'quantile', source: inputs.partner.metadata.label }
    }),
    simulateYear: (state, inputs, yearData, yearIndex) => {
        observedYears.push({
            yearIndex,
            rentAdjPct: inputs.rentAdjPct,
            horizonYears: inputs.horizonYears,
            capeRatio: inputs.capeRatio,
            equityReturn: yearData.rendite,
            goldReturn: yearData.gold_eur_perf,
            cashBondReturn: yearData.zinssatz,
            inflation: yearData.inflation,
            wageAdjustment: yearData.lohn,
            temporal: yearData.temporal
        });
        inputs.partner.metadata.label = `run-${yearIndex}`;
        inputs.detailTranches[0].nested.acquisitionYear++;
        yearData.rendite = 999;
        const value = state.portfolio.value + 10;
        const reductionPct = yearIndex === 0 ? 5 : 10;
        const logData = {
            entscheidung: { jahresEntnahme: 10 + yearIndex, kuerzungProzent: reductionPct },
            wertAktien: value,
            wertGold: 0,
            liquiditaet: 0,
            netTradeEq: yearIndex === 0 ? 2 : undefined,
            vk: { vkAkt: 3, vkGld: 4 },
            kaufAkt: 1,
            kaufGld: 1,
            floor_brutto: 12,
            renteSum: 0,
            aktionUndGrund: 'TEST',
            steuern_gesamt: 1 + yearIndex
        };
        return {
            isRuin: false,
            newState: { ...state, portfolio: { value } },
            totalTaxesThisYear: 1 + yearIndex,
            logData,
            ui: {
                vpw: {
                    status: 'active',
                    capeRatioUsed: inputs.capeRatio,
                    expectedReturnCape: 0.04,
                    expectedRealReturn: 0.02
                }
            }
        };
    }
};

function executeCompletedRun() {
    return runHistoricalBacktest({
        inputs: callerInputs,
        period: { startYear: 2000, endYear: 2001 },
        historicalDataProvider: createContractProvider(),
        breakOnRuin: true,
        ...dependencies
    });
}

const guardedGlobals = ['document', 'window', 'localStorage', 'PersistenceFacade'];
const previousDescriptors = new Map(guardedGlobals.map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
let completed;
try {
    for (const name of guardedGlobals) {
        Object.defineProperty(globalThis, name, {
            configurable: true,
            get() { throw new Error(`Forbidden environment access: ${name}`); }
        });
    }
    completed = executeCompletedRun();
} finally {
    for (const name of guardedGlobals) {
        const descriptor = previousDescriptors.get(name);
        if (descriptor) Object.defineProperty(globalThis, name, descriptor);
        else delete globalThis[name];
    }
}

assertEqual(completed.schemaVersion, BACKTEST_RESULT_SCHEMA_VERSION, 'runner returns a versioned result shape');
assertEqual(completed.request.schemaVersion, BACKTEST_REQUEST_SCHEMA_VERSION, 'runner embeds a versioned request shape');
assertEqual(completed.request.breakOnRuin, true, 'request records the explicit ruin policy');
assertEqual(completed.request.temporalConventionId, HISTORICAL_TEMPORAL_CONVENTION_ID, 'request records the approved temporal convention');
assertEqual(completed.request.dataset.datasetId, 'runner-fixture', 'request records dataset provenance');
assertEqual(completed.requestedYears, 2, 'requestedYears includes the full inclusive period');
assertEqual(completed.completedYears, 2, 'completedYears counts successful simulated years');
assertEqual(completed.rows.length, 2, 'completed run returns one row per simulated year');
assertEqual(completed.portfolioStart, 100, 'runner records the initial portfolio total');
assertEqual(completed.portfolioEnd, 120, 'runner records the final portfolio total');
assertEqual(completed.legacyOutcome, 'completed_legacy', 'completed path retains the legacy outcome label');
assertEqual(completed.legacyMetrics.totalWithdrawal, 21, 'runner retains total withdrawals');
assertEqual(completed.legacyMetrics.totalTaxes, 3, 'runner retains total taxes');
assertEqual(completed.legacyMetrics.reductionYears, 1, 'exactly ten percent retains the legacy reduction counter');
assertEqual(completed.legacyMetrics.maxReductionStreak, 1, 'runner retains the legacy reduction streak');
assertEqual(completed.rows[0].netA, 2, 'explicit net equity trade takes precedence');
assertEqual(completed.rows[1].netA, 2, 'legacy net equity fallback remains intact');
assertEqual(completed.rows[1].netG, 3, 'legacy net gold fallback remains intact');
assertEqual(completed.rows[0].vpwFallbackHint, 'ok', 'active VPW payload retains the legacy hint');
assertClose(observedYears[0].equityReturn, 0.1, 1e-12, 'runner builds the legacy equity return from adjacent records');
assertEqual(observedYears[0].goldReturn, 5, 'runner uses realized gold from simulation year t');
assertEqual(observedYears[0].cashBondReturn, 2.5, 'runner uses realized cash/bond return from simulation year t');
assertEqual(observedYears[0].inflation, 1.2, 'runner uses realized inflation from simulation year t');
assertEqual(observedYears[0].wageAdjustment, 1.7, 'runner uses wage adjustment from simulation year t');
assertEqual(observedYears[0].capeRatio, 18, 'runner uses CAPE known at t-1');
assertEqual(observedYears[0].temporal.realizedSourceYears.goldReturn, 2000, 'runner passes explicit realized source years');
assertEqual(observedYears[0].temporal.decisionAsOf.capeRatio, 1999, 'runner passes explicit CAPE as-of year');
assertEqual(observedYears[1].rentAdjPct, 3, 'runner delegates yearly pension adjustment');
assertEqual(observedYears[1].horizonYears, 29, 'runner delegates yearly horizon resolution');
assertEqual(snapshot(callerInputs), callerInputsBefore, 'deeply frozen caller inputs remain unchanged');
assertEqual(snapshot(historicalRecords), historicalBefore, 'deeply frozen historical records remain unchanged');
assert(Object.isFrozen(completed.request), 'canonical request is immutable');
assert(Object.isFrozen(completed.request.inputs.partner), 'nested canonical request inputs are immutable');
assert(completed.request.inputs.partner.metadata.optional === undefined, 'clone preserves undefined properties');
assert(completed.request.inputs.createdAt instanceof Date, 'clone preserves Date values');
assert(completed.request.inputs.markerPattern instanceof RegExp, 'clone preserves RegExp values');
assert(completed.request.inputs.self === completed.request.inputs, 'clone preserves cyclic references');

observedYears.length = 0;
const repeated = executeCompletedRun();
assertEqual(snapshot(repeated), snapshot(completed), 'reusing the same request values is deterministic');
assertEqual(snapshot(callerInputs), callerInputsBefore, 'repeated execution still does not mutate caller inputs');
assertEqual(snapshot(historicalRecords), historicalBefore, 'repeated execution still does not mutate history');

const partial = runHistoricalBacktest({
    inputs: { ...callerInputs, self: undefined },
    period: { startYear: 2000, endYear: 2002 },
    historicalDataProvider: createContractProvider({ incompleteYear: 2001 }),
    ...dependencies
});
assertEqual(partial.rows.length, 0, 'missing-middle-year preflight prevents loop entry');
assertEqual(partial.completedYears, 0, 'incomplete data simulates no successful years');
assertEqual(partial.dataStatus, 'incomplete', 'missing-middle-year path is explicitly incomplete');
assertEqual(partial.incompleteReason.year, 2001, 'incomplete result identifies the exact missing year');
assertEqual(partial.legacyOutcome, 'incomplete', 'incomplete data is no longer rendered as a completed legacy run');

const ruin = runHistoricalBacktest({
    inputs: { ...callerInputs, self: undefined },
    period: { startYear: 2000, endYear: 2001 },
    historicalDataProvider: createContractProvider(),
    initializePortfolio: dependencies.initializePortfolio,
    totalPortfolio: dependencies.totalPortfolio,
    computeAdjustmentPct: () => 0,
    resolveHorizon: () => ({ horizonYears: 30, diagnostics: { longevityMode: 'none' } }),
    simulateYear: () => ({ isRuin: true, reason: 'Test ruin' }),
    breakOnRuin: true
});
assertEqual(ruin.rows.length, 1, 'ruin path returns the synthetic legacy row');
assertEqual(ruin.rows[0].row.Regime, 'BANKRUPT', 'ruin row retains the legacy regime');
assertEqual(ruin.completedYears, 0, 'ruin year is not counted as successfully completed');
assertEqual(ruin.portfolioEnd, 100, 'ruin path retains the legacy pre-ruin portfolio end');
assertEqual(ruin.legacyOutcome, 'ruin_legacy', 'ruin path retains the legacy outcome label');

const singleYear = runHistoricalBacktest({
    inputs: { ...callerInputs, self: undefined },
    period: { startYear: 2000, endYear: 2000 },
    historicalDataProvider: createContractProvider(),
    ...dependencies
});
assertEqual(singleYear.requestedYears, 1, 'one-year period has one requested year');
assertEqual(singleYear.rows.length, 1, 'one-year period executes exactly one year');
assertEqual(singleYear.legacyOutcome, 'completed_legacy', 'complete one-year period finishes successfully');
expectThrow(
    () => runHistoricalBacktest({
        inputs: {},
        period: { startYear: 2000, endYear: 2001 },
        historicalDataProvider: {},
        ...dependencies
    }),
    /historicalDataProvider\.preparePeriod/,
    'runner rejects an incomplete historical provider'
);
expectThrow(
    () => runHistoricalBacktest({
        inputs: {},
        period: { startYear: 2000, endYear: 2001 },
        historicalDataProvider: createContractProvider(),
        ...dependencies,
        simulateYear: null
    }),
    /simulateYear/,
    'runner rejects a missing simulation dependency'
);
expectThrow(
    () => runHistoricalBacktest({
        inputs: {},
        period: { startYear: Number.NaN, endYear: 2001 },
        historicalDataProvider: createContractProvider(),
        ...dependencies
    }),
    /invalid historical period/,
    'runner delegates invalid period rejection to the contract preflight'
);

console.log('✅ Historical backtest runner tests passed');
console.log('--- Historical Backtest Runner Tests Completed ---');
