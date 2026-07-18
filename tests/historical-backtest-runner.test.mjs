import {
    BACKTEST_REQUEST_SCHEMA_VERSION,
    BACKTEST_RESULT_SCHEMA_VERSION,
    createHistoricalDataProvider,
    runHistoricalBacktest
} from '../app/simulator/historical-backtest-runner.js';

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
            source: yearData.nested.source
        });
        inputs.partner.metadata.label = `run-${yearIndex}`;
        inputs.detailTranches[0].nested.acquisitionYear++;
        yearData.nested.source = `run-${yearIndex}`;
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
        historicalDataProvider: createHistoricalDataProvider(historicalRecords),
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
    historicalDataProvider: createHistoricalDataProvider({
        1999: historicalRecords[1999],
        2000: historicalRecords[2000],
        2002: historicalRecords[2001]
    }),
    ...dependencies
});
assertEqual(partial.rows.length, 1, 'legacy missing-middle-year path skips unavailable pairs');
assertEqual(partial.completedYears, 1, 'partial path counts only successful years');
assertEqual(partial.legacyOutcome, 'partial_result_rendered_as_completed_legacy', 'partial path is marked with the observed legacy outcome');

const ruin = runHistoricalBacktest({
    inputs: { ...callerInputs, self: undefined },
    period: { startYear: 2000, endYear: 2001 },
    historicalDataProvider: createHistoricalDataProvider(historicalRecords),
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

const empty = runHistoricalBacktest({
    inputs: { ...callerInputs, self: undefined },
    period: { startYear: Number.NaN, endYear: 2001 },
    historicalDataProvider: createHistoricalDataProvider(historicalRecords),
    ...dependencies
});
assertEqual(empty.requestedYears, null, 'non-integer legacy period has no requested-year count');
assertEqual(empty.rows.length, 0, 'NaN legacy period executes no year');
assertEqual(empty.legacyOutcome, 'empty_result_rendered_as_completed_legacy', 'empty path retains the observed legacy outcome');

expectThrow(
    () => createHistoricalDataProvider(null),
    /records object/,
    'historical provider rejects a missing records object'
);
expectThrow(
    () => runHistoricalBacktest({
        inputs: {},
        period: { startYear: 2000, endYear: 2001 },
        historicalDataProvider: {},
        ...dependencies
    }),
    /historicalDataProvider\.getYears/,
    'runner rejects an incomplete historical provider'
);
expectThrow(
    () => runHistoricalBacktest({
        inputs: {},
        period: { startYear: 2000, endYear: 2001 },
        historicalDataProvider: createHistoricalDataProvider(historicalRecords),
        ...dependencies,
        simulateYear: null
    }),
    /simulateYear/,
    'runner rejects a missing simulation dependency'
);

console.log('✅ Historical backtest runner tests passed');
console.log('--- Historical Backtest Runner Tests Completed ---');
