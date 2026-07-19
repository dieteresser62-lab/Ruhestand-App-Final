import {
    HISTORICAL_ASSIGNMENT_INVENTORY_V1,
    HISTORICAL_TEMPORAL_CONVENTION_ID,
    HistoricalDataContractError,
    computeHistoricalDatasetHash,
    createHistoricalBacktestContractProvider,
    validateHistoricalYearRecord
} from '../app/simulator/historical-backtest-contract.js';
import { HISTORICAL_DATA, HISTORICAL_DATA_MANIFEST, annualData } from '../app/simulator/simulator-data.js';
import { computeAdjPctForYear } from '../app/simulator/simulator-main-helpers.js';

console.log('--- Historical Backtest Contract Tests ---');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function captureError(callback) {
    try {
        callback();
        return null;
    } catch (error) {
        return error;
    }
}

function makeFixtureRecords() {
    const records = {};
    for (let year = 1996; year <= 2002; year++) {
        records[year] = {
            msci_eur: 100 + (year - 1996) * 10,
            inflation_de: year - 1990,
            zinssatz_de: year - 1995,
            lohn_de: year - 1900,
            gold_eur_perf: year === 1999 ? 0 : year - 1980,
            cape: year - 1980
        };
    }
    return records;
}

function makeFixtureManifest(records, suffix, customize = null) {
    const manifest = clone(HISTORICAL_DATA_MANIFEST);
    const years = Object.keys(records).map(Number).sort((left, right) => left - right);
    manifest.datasetId = `historical-contract-fixture-${suffix}`;
    manifest.revision = `fixture-${suffix}`;
    manifest.period = { startYear: years[0], endYear: years[years.length - 1] };
    manifest.lookback.backtestYears = 4;
    for (const series of Object.values(manifest.series)) {
        series.period = { ...manifest.period };
        series.estimatedSegments = [];
        series.missingness.fallbackZeroSegments = [];
        series.revision = manifest.revision;
    }
    if (typeof customize === 'function') customize(manifest);
    manifest.contentHash.value = computeHistoricalDatasetHash(records);
    return manifest;
}

const fixtureRecords = makeFixtureRecords();
const fixtureManifest = makeFixtureManifest(fixtureRecords, 'base');
const fixtureBefore = computeHistoricalDatasetHash(fixtureRecords);
const provider = createHistoricalBacktestContractProvider({
    records: fixtureRecords,
    manifest: fixtureManifest
});

console.log('Test 1: provider derives immutable bounds and records without mutating raw history');
assertEqual(provider.bounds.startYear, 2000, 'Four-year lookback should derive the first valid start year');
assertEqual(provider.bounds.endYear, 2002, 'Dataset end should derive the last valid end year');
assertEqual(provider.getYears().join(','), '1997,1998,1999,2000,2001,2002', 'Year records should begin after the return lookback year');
assert(Object.isFrozen(provider), 'Provider should be immutable');
assert(Object.isFrozen(provider.getRecord(2000)), 'HistoricalYearRecord should be immutable');
assert(Object.isFrozen(provider.manifest), 'Provider should expose an immutable manifest snapshot');
assert(provider.manifest !== fixtureManifest, 'Provider should not retain the mutable caller manifest');
assertEqual(computeHistoricalDatasetHash(fixtureRecords), fixtureBefore, 'Contract creation must not mutate source records');

const isolationRecords = makeFixtureRecords();
const isolationManifest = makeFixtureManifest(isolationRecords, 'caller-isolation');
const isolationProvider = createHistoricalBacktestContractProvider({ records: isolationRecords, manifest: isolationManifest });
assert(!Object.isFrozen(isolationManifest), 'Provider creation should not freeze the caller manifest');
isolationManifest.series.msci_eur.source = { status: 'known', value: 'mutated-after-validation' };
isolationRecords[2000].lohn_de = 999;
assertEqual(isolationProvider.manifest.series.msci_eur.source.status, 'unresolved', 'Caller manifest mutation must not reach provider snapshot');
assertEqual(isolationProvider.getRecord(2000).realized.wagePensionAdjustment.value, 100, 'Caller data mutation must not reach validated lookup');
console.log('✓ immutable provider and derived bounds OK');

console.log('Test 2: HistoricalYearRecordV1 separates realized and decision-as-of observations');
{
    const record = provider.getRecord(2000);
    assertEqual(record.schemaVersion, 'HistoricalYearRecordV1', 'Record schema should be versioned');
    assertEqual(record.simulationYear, 2000, 'Record should expose the explicit simulation year');
    assertEqual(record.temporalConventionId, HISTORICAL_TEMPORAL_CONVENTION_ID, 'Record should expose the approved temporal convention');
    assertClose(record.realized.equityReturn.value, (140 / 130) - 1, 1e-12, 'Equity return should use t and t-1 levels');
    assertEqual(record.realized.equityReturn.sourceYear, 2000, 'Equity source year should be t');
    assertEqual(record.realized.equityReturn.inputs.previousSourceYear, 1999, 'Equity derivation should expose t-1');
    assertEqual(record.realized.goldReturn.value, 20, 'Gold realization should use the approved t value');
    assertEqual(record.realized.goldReturn.sourceYear, 2000, 'Gold source year should be t');
    assertEqual(record.realized.cashBondReturn.sourceYear, 2000, 'Cash/bond source year should be t');
    assertEqual(record.realized.inflation.sourceYear, 2000, 'Inflation source year should be t');
    assertEqual(record.realized.wagePensionAdjustment.value, 100, 'Wage/pension marker should use t');
    assertEqual(record.decisionAsOf.capeRatio.value, 19, 'CAPE should use the last pre-decision value');
    assertEqual(record.decisionAsOf.capeRatio.sourceYear, 1999, 'CAPE source year should be t-1');
    assertEqual(record.decisionAsOf.capeRatio.asOfYear, 1999, 'CAPE as-of year should be t-1');
    assertEqual(record.alignmentStatus, 'approved_d01', 'D-01 alignment should be visibly approved');

    const lookAheadRecord = clone(record);
    lookAheadRecord.decisionAsOf.capeRatio.sourceYear = 2000;
    lookAheadRecord.decisionAsOf.capeRatio.asOfYear = 2000;
    const lookAheadError = captureError(() => validateHistoricalYearRecord(lookAheadRecord, fixtureManifest));
    assertEqual(lookAheadError?.code, 'HISTORICAL_TEMPORAL_LOOKAHEAD', 'CAPE from t must fail as look-ahead');

    const misalignedRealized = clone(record);
    misalignedRealized.realized.goldReturn.sourceYear = 1999;
    misalignedRealized.realized.goldReturn.asOfYear = 1999;
    const alignmentError = captureError(() => validateHistoricalYearRecord(misalignedRealized, fixtureManifest));
    assertEqual(alignmentError?.code, 'HISTORICAL_TEMPORAL_ALIGNMENT_INVALID', 'Realized values from t-1 must fail the approved alignment');
}
console.log('✓ realized/as-of split OK');

console.log('Test 3: one-year periods are valid and invalid year shapes fail structurally');
{
    const oneYear = provider.preparePeriod({ startYear: 2000, endYear: 2000 });
    assertEqual(oneYear.status, 'complete', 'A complete one-year period should be accepted');
    assertEqual(oneYear.requestedYears, 1, 'One-year period should contain exactly one record');
    assertEqual(oneYear.temporalConventionId, HISTORICAL_TEMPORAL_CONVENTION_ID, 'Prepared period should retain the temporal convention');
    assertEqual(oneYear.initialMarketHistory.asOfYear, 1999, 'Initial market history should be known through t-1');
    assertEqual(oneYear.initialMarketHistory.levels.endeVJ.sourceYear, 1999, 'Initial endeVJ should come from t-1');
    assertEqual(oneYear.initialMarketHistory.levels.endeVJ_3.sourceYear, 1996, 'Initial four-year lookback should end at t-4');
    assertEqual(oneYear.initialMarketHistory.allTimeHigh.value, 130, 'Initial ATH should be derived through t-1');
    assert(Object.isFrozen(oneYear.initialMarketHistory), 'Initial market history should be immutable');

    const fractional = captureError(() => provider.preparePeriod({ startYear: 2000.5, endYear: 2001 }));
    assert(fractional instanceof HistoricalDataContractError, 'Fractional period should throw a contract error');
    assertEqual(fractional.code, 'HISTORICAL_PERIOD_INVALID', 'Fractional period should have a structured code');

    const nonFinite = captureError(() => provider.preparePeriod({ startYear: Number.NaN, endYear: 2001 }));
    assertEqual(nonFinite?.code, 'HISTORICAL_PERIOD_INVALID', 'NaN period should have a structured code');

    const backwards = captureError(() => provider.preparePeriod({ startYear: 2001, endYear: 2000 }));
    assertEqual(backwards?.code, 'HISTORICAL_PERIOD_INVALID', 'Backwards period should have a structured code');
}
console.log('✓ D-02 period contract OK');

console.log('Test 4: first missing lookback or requested year yields incomplete without silent skip');
{
    const lookbackGapRecords = makeFixtureRecords();
    delete lookbackGapRecords[1998];
    const lookbackProvider = createHistoricalBacktestContractProvider({
        records: lookbackGapRecords,
        manifest: makeFixtureManifest(lookbackGapRecords, 'lookback-gap')
    });
    const lookbackGap = lookbackProvider.preparePeriod({ startYear: 2000, endYear: 2000 });
    assertEqual(lookbackGap.status, 'incomplete', 'Missing lookback year should be incomplete');
    assertEqual(lookbackGap.reason.code, 'missing_historical_year', 'Missing lookback should have a structured reason');
    assertEqual(lookbackGap.reason.year, 1998, 'Preflight should report the first chronological gap');
    assertEqual(lookbackGap.reason.phase, 'lookback', 'Gap should identify the lookback phase');

    const requestedGapRecords = makeFixtureRecords();
    delete requestedGapRecords[2001];
    const requestedProvider = createHistoricalBacktestContractProvider({
        records: requestedGapRecords,
        manifest: makeFixtureManifest(requestedGapRecords, 'requested-gap')
    });
    const requestedGap = requestedProvider.preparePeriod({ startYear: 2000, endYear: 2002 });
    assertEqual(requestedGap.status, 'incomplete', 'Missing requested year should be incomplete');
    assertEqual(requestedGap.reason.year, 2001, 'Requested gap should report its exact year');
    assertEqual(requestedGap.reason.phase, 'requested_period', 'Gap should identify the requested phase');

    const outside = provider.preparePeriod({ startYear: 1999, endYear: 2000 });
    assertEqual(outside.status, 'incomplete', 'Out-of-bounds period should be incomplete');
    assertEqual(outside.reason.code, 'period_out_of_bounds', 'Bounds failure should be structured');
}
console.log('✓ period preflight fails closed OK');

console.log('Test 5: missing, non-finite and invalid index values fail with structured errors');
{
    const missingRecords = makeFixtureRecords();
    delete missingRecords[2000].inflation_de;
    const missingError = captureError(() => createHistoricalBacktestContractProvider({
        records: missingRecords,
        manifest: makeFixtureManifest(missingRecords, 'missing-field')
    }));
    assertEqual(missingError?.code, 'HISTORICAL_DATA_FIELD_MISSING', 'Missing field should fail structurally');
    assertEqual(missingError?.details.seriesId, 'inflation_de', 'Missing field should identify the series');

    const nonFiniteRecords = makeFixtureRecords();
    nonFiniteRecords[2000].gold_eur_perf = Number.NaN;
    const nonFiniteError = captureError(() => createHistoricalBacktestContractProvider({
        records: nonFiniteRecords,
        manifest: makeFixtureManifest(nonFiniteRecords, 'non-finite')
    }));
    assertEqual(nonFiniteError?.code, 'HISTORICAL_DATA_FIELD_NON_FINITE', 'Non-finite value should fail structurally');
    assertEqual(nonFiniteError?.details.seriesId, 'gold_eur_perf', 'Non-finite error should identify the series');

    const invalidIndexRecords = makeFixtureRecords();
    invalidIndexRecords[2000].msci_eur = 0;
    const invalidIndexError = captureError(() => createHistoricalBacktestContractProvider({
        records: invalidIndexRecords,
        manifest: makeFixtureManifest(invalidIndexRecords, 'invalid-index')
    }));
    assertEqual(invalidIndexError?.code, 'HISTORICAL_INDEX_LEVEL_INVALID', 'Zero index level should fail structurally');

    const duplicateYearRecords = makeFixtureRecords();
    duplicateYearRecords['02000'] = { ...duplicateYearRecords[2000] };
    const duplicateYearError = captureError(() => createHistoricalBacktestContractProvider({
        records: duplicateYearRecords,
        manifest: makeFixtureManifest(duplicateYearRecords, 'duplicate-year')
    }));
    assertEqual(duplicateYearError?.code, 'HISTORICAL_DATASET_DUPLICATE_YEAR', 'Duplicate numeric year keys should fail structurally');

    const recordWithMissingStatus = clone(provider.getRecord(2000));
    recordWithMissingStatus.realized.inflation.qualityStatus = 'missing';
    const recordError = captureError(() => validateHistoricalYearRecord(recordWithMissingStatus, fixtureManifest));
    assertEqual(recordError?.code, 'HISTORICAL_YEAR_RECORD_MISSING', 'Record-level missing status should fail structurally');
}
console.log('✓ structured data failures OK');

console.log('Test 6: fallback_zero is visible and only valid inside manifested segments');
{
    const fallbackRecords = makeFixtureRecords();
    const fallbackManifest = makeFixtureManifest(fallbackRecords, 'fallback', manifest => {
        manifest.series.gold_eur_perf.missingness.fallbackZeroSegments = [
            { startYear: 1999, endYear: 1999 }
        ];
    });
    const fallbackProvider = createHistoricalBacktestContractProvider({ records: fallbackRecords, manifest: fallbackManifest });
    const fallbackRecord = fallbackProvider.getRecord(1999);
    assertEqual(fallbackRecord.realized.goldReturn.value, 0, 'Manifested fallback should retain literal zero');
    assertEqual(fallbackRecord.realized.goldReturn.qualityStatus, 'fallback_zero', 'Manifested fallback should remain visible');

    const invalidFallback = clone(fallbackRecord);
    invalidFallback.realized.goldReturn.sourceYear = 2000;
    invalidFallback.realized.goldReturn.asOfYear = 2000;
    const invalidFallbackError = captureError(() => validateHistoricalYearRecord(invalidFallback, fallbackManifest));
    assertEqual(invalidFallbackError?.code, 'HISTORICAL_FALLBACK_ZERO_NOT_MANIFESTED', 'Fallback outside segment should fail');

    const currentGoldZero = createHistoricalBacktestContractProvider().getRecord(1950).realized.goldReturn;
    assertEqual(currentGoldZero.value, 0, 'Current embedded gold zero should remain numerically unchanged');
    assertEqual(currentGoldZero.qualityStatus, 'unresolved', 'Ambiguous current gold zero must not be invented as fallback_zero');
}
console.log('✓ explicit fallback-zero policy OK');

console.log('Test 7: dataset validation is cached and preflight is once per request or batch');
{
    const cacheRecords = makeFixtureRecords();
    const cacheManifest = makeFixtureManifest(cacheRecords, 'instrumentation');
    let datasetValidations = 0;
    let cacheHits = 0;
    const first = createHistoricalBacktestContractProvider({
        records: cacheRecords,
        manifest: cacheManifest,
        instrumentation: { onDatasetValidation: () => { datasetValidations++; } }
    });
    const second = createHistoricalBacktestContractProvider({
        records: cacheRecords,
        manifest: cacheManifest,
        instrumentation: { onCacheHit: () => { cacheHits++; } }
    });
    assert(first === second, 'Same revision/hash should return the cached immutable provider');
    assertEqual(datasetValidations, 1, 'Full dataset validation should run once per revision/hash');
    assertEqual(cacheHits, 1, 'Second provider request should be a cache hit');

    let preflights = 0;
    const single = first.preparePeriod(
        { startYear: 2000, endYear: 2002 },
        { instrumentation: { onPeriodPreflight: () => { preflights++; } } }
    );
    for (const mode of ['year_loop', 'monte_carlo_loop', 'sweep_loop', 'cohort_loop']) {
        for (let iteration = 0; iteration < 20; iteration++) {
            const record = single.records[iteration % single.records.length];
            assert(record && record.schemaVersion === 'HistoricalYearRecordV1', `${mode} should consume cached records`);
        }
    }
    assertEqual(datasetValidations, 1, 'Cached record reads must not trigger dataset validation');
    assertEqual(preflights, 1, 'Single-path preflight should run once before all record reads');

    const batch = first.prepareBatch(
        [
            { startYear: 2000, endYear: 2000 },
            { startYear: 2001, endYear: 2002 }
        ],
        { instrumentation: { onPeriodPreflight: () => { preflights++; } } }
    );
    assertEqual(batch.status, 'complete', 'Complete cohort batch should pass');
    assertEqual(preflights, 2, 'Whole cohort batch should add exactly one preflight event');
}
console.log('✓ validation/preflight instrumentation OK');

console.log('Test 8: pension adjustment marker mapping preserves 1950/2000/2001 offsets');
{
    const years = Object.keys(HISTORICAL_DATA).map(Number).filter(year => year >= 1950).sort((left, right) => left - right);
    const context = {
        inputs: { rentAdj: { mode: 'wage', pct: 0 } },
        series: {
            startYear: 1950,
            wageGrowth: years.map(year => HISTORICAL_DATA[year].lohn_de),
            inflationPct: years.map(year => HISTORICAL_DATA[year].inflation_de)
        },
        simStartYear: 1950
    };
    assertEqual(computeAdjPctForYear(context, 0), HISTORICAL_DATA[1950].lohn_de, '1950 marker should map to 1950');
    context.simStartYear = 2000;
    assertEqual(computeAdjPctForYear(context, 0), HISTORICAL_DATA[2000].lohn_de, '2000 marker should map to 2000');
    assertEqual(computeAdjPctForYear(context, 1), HISTORICAL_DATA[2001].lohn_de, '2001 marker should map to 2001');
}
console.log('✓ pension marker mapping OK');

console.log('Test 9: assignment inventory keeps active builders and the approved D-01 contract distinct');
assertEqual(HISTORICAL_ASSIGNMENT_INVENTORY_V1.legacyBacktest.goldReturn, 't_minus_1', 'Legacy gold mapping should remain inventoried');
assertEqual(HISTORICAL_ASSIGNMENT_INVENTORY_V1.activeMonteCarloAnnualData.goldReturn, 't', 'Active MC gold mapping should remain inventoried');
assertEqual(HISTORICAL_ASSIGNMENT_INVENTORY_V1.alternativePrepareHistoricalData.capeRatio, 'not_mapped', 'Alternative builder should expose missing CAPE mapping');
assertEqual(HISTORICAL_ASSIGNMENT_INVENTORY_V1.canonicalHistoricalYearRecordV1.capeRatio, 't_minus_1_decision_as_of', 'V1 CAPE decision-as-of should be explicit');
assert(Object.isFrozen(HISTORICAL_ASSIGNMENT_INVENTORY_V1), 'Assignment inventory should be immutable');

console.log('Test 10: approved realized fields align with active Monte Carlo annualData while CAPE remains pre-decision');
{
    const record = createHistoricalBacktestContractProvider().getRecord(2000);
    const mc = annualData.find(entry => entry.jahr === 2000);
    assertClose(record.realized.equityReturn.value, mc.rendite, 1e-12, 'Equity return should align with MC year t');
    assertEqual(record.realized.goldReturn.value, mc.gold_eur_perf, 'Gold return should align with MC year t');
    assertEqual(record.realized.cashBondReturn.value, mc.zinssatz, 'Cash/bond return should align with MC year t');
    assertEqual(record.realized.inflation.value, mc.inflation, 'Inflation should align with MC year t');
    assertEqual(record.realized.wagePensionAdjustment.value, mc.lohn, 'Wage adjustment should align with MC year t');
    assertEqual(record.decisionAsOf.capeRatio.value, HISTORICAL_DATA[1999].cape, 'CAPE should remain the known t-1 policy value');
    assert(record.decisionAsOf.capeRatio.value !== mc.capeRatio, 'CAPE must intentionally differ from MC sampled t to prevent look-ahead');
}
console.log('✓ approved D-01 versus active MC alignment OK');
console.log('✓ assignment inventory OK');

console.log('✅ Historical backtest contract tests passed');
