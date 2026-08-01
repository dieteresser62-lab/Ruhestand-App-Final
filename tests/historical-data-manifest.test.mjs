import { createHash } from 'node:crypto';
import {
    HistoricalDataContractError,
    canonicalizeHistoricalContractValue,
    computeHistoricalDatasetHash,
    createHistoricalBacktestContractProvider,
    sha256Hex,
    validateHistoricalDataManifest
} from '../app/simulator/historical-backtest-contract.js';
import {
    DATASET_META,
    HISTORICAL_DATA,
    HISTORICAL_DATA_MANIFEST
} from '../app/simulator/simulator-data.js';
import {
    SIMULATION_DATA_INVENTORY,
    validateSimulationDataInventory
} from '../app/simulator/simulation-data-inventory.js';

console.log('--- Historical Data Manifest Tests ---');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function assertJsonEqual(actual, expected, message) {
    assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}

function captureError(callback) {
    try {
        callback();
        return null;
    } catch (error) {
        return error;
    }
}

const requiredSeries = [
    'global_equity_research_index',
    'inflation_de',
    'zinssatz_de',
    'lohn_de',
    'gold_eur_perf',
    'cape'
];

console.log('Test 1: manifest contains all required reproducibility fields');
validateHistoricalDataManifest(HISTORICAL_DATA_MANIFEST);
assertEqual(HISTORICAL_DATA_MANIFEST.schemaVersion, 'HistoricalDataManifestV1', 'Manifest schema should be versioned');
assertEqual(HISTORICAL_DATA_MANIFEST.datasetId, 'ruhestandsapp-historical-data-v1', 'Manifest ID should be stable');
assertEqual(HISTORICAL_DATA_MANIFEST.revision, '2026-08-01.4', 'Manifest revision should be explicit');
assertEqual(HISTORICAL_DATA_MANIFEST.period.startYear, 1925, 'Manifest start year should match embedded history');
assertEqual(HISTORICAL_DATA_MANIFEST.period.endYear, 2025, 'Manifest end year should match embedded history');
assertEqual(HISTORICAL_DATA_MANIFEST.lookback.backtestYears, 4, 'Backtest lookback should be explicit');
assert(Object.isFrozen(HISTORICAL_DATA_MANIFEST), 'Manifest root should be immutable');
assert(Object.isFrozen(HISTORICAL_DATA_MANIFEST.series.global_equity_research_index), 'Manifest series should be deeply immutable');

for (const seriesId of requiredSeries) {
    const series = HISTORICAL_DATA_MANIFEST.series[seriesId];
    assert(series, `${seriesId} should exist in the manifest`);
    assertEqual(series.id, seriesId, `${seriesId} should have a matching ID`);
    assert(typeof series.label === 'string' && series.label.length > 0, `${seriesId} should have a label`);
    assert(typeof series.unit === 'string' && series.unit.length > 0, `${seriesId} should have a unit`);
    assert(series.variant && typeof series.variant.status === 'string', `${seriesId} should have variant/status`);
    assert(series.currency && typeof series.currency.status === 'string', `${seriesId} should have currency/status`);
    assert(series.region && typeof series.region.status === 'string', `${seriesId} should have region/status`);
    assertEqual(series.frequency.value, 'annual', `${seriesId} should be annual`);
    assertEqual(series.period.startYear, 1925, `${seriesId} should declare period start`);
    assertEqual(series.period.endYear, 2025, `${seriesId} should declare period end`);
    assert(series.source && typeof series.source.status === 'string', `${seriesId} should declare source/status`);
    assert(series.license && typeof series.license.status === 'string', `${seriesId} should declare license/status`);
    assert(series.transformation && typeof series.transformation.status === 'string', `${seriesId} should declare transformation/status`);
    assert(Array.isArray(series.estimatedSegments), `${seriesId} should declare estimated segments`);
    assert(Array.isArray(series.discontinuities), `${seriesId} should declare discontinuities`);
    assertEqual(series.missingness.required, true, `${seriesId} should be required for V1 records`);
    assertEqual(series.missingness.rule, 'reject_missing_or_non_finite', `${seriesId} should reject missing/non-finite values`);
    assert(Array.isArray(series.missingness.fallbackZeroSegments), `${seriesId} should manifest fallback-zero segments`);
    assert(typeof series.revision === 'string' && series.revision.length > 0, `${seriesId} should have a revision`);
}
console.log('✓ required manifest fields OK');

console.log('Test 2: all historical research chains expose their resolved identity and evidence boundary');
const equitySeries = HISTORICAL_DATA_MANIFEST.series.global_equity_research_index;
assertEqual(equitySeries.source.status, 'known', 'Equity source should be resolved to the open source chain');
assertEqual(equitySeries.license.status, 'known', 'Equity data license should be explicit');
assertEqual(equitySeries.variant.status, 'known', 'Equity research-proxy variant should be explicit');
assertEqual(equitySeries.estimatedSegments.length, 2, 'Equity should expose its early proxy and modelled modern segment');
assertEqual(equitySeries.estimatedSegments[0].endYear, 1950, 'Equity USD-proxy segment should include the 1950 return');
const inflationSeries = HISTORICAL_DATA_MANIFEST.series.inflation_de;
assertEqual(inflationSeries.source.status, 'known', 'German CPI source chain should be resolved');
assertEqual(inflationSeries.license.status, 'known', 'German CPI source licences should be explicit');
assertEqual(inflationSeries.variant.status, 'known', 'German CPI segmented national variant should be explicit');
assertEqual(inflationSeries.estimatedSegments.length, 1, 'German CPI should expose only its JST proxy segment as estimated');
assertEqual(inflationSeries.estimatedSegments[0].endYear, 1949, 'German CPI proxy should end before the official 1950 segment');
assert(
    inflationSeries.transformation.value.includes('100:6.5')
        && inflationSeries.transformation.value.includes('continuous-currency'),
    'German CPI manifest should distinguish the 1948 monetary-balance write-down from price inflation'
);
const interestSeries = HISTORICAL_DATA_MANIFEST.series.zinssatz_de;
assertEqual(interestSeries.source.status, 'known', 'Cash/money-market source chain should be resolved');
assertEqual(interestSeries.license.status, 'known', 'Cash/money-market source licences should be explicit');
assertEqual(interestSeries.variant.status, 'known', 'Cash/money-market return convention should be resolved');
assertEqual(interestSeries.estimatedSegments.length, 1, 'Cash should expose one estimated exclusion segment');
assertEqual(interestSeries.estimatedSegments[0].endYear, 1948, 'Cash proxy and explicit post-war bridge should remain estimated');
assert(
    interestSeries.transformation.value.includes('No additional compounding')
        && interestSeries.transformation.value.includes('tax'),
    'Cash transform should rule out double accrual and embedded tax'
);
const goldSeries = HISTORICAL_DATA_MANIFEST.series.gold_eur_perf;
assertEqual(goldSeries.source.status, 'known', 'Gold source chain should be resolved');
assertEqual(goldSeries.license.status, 'known', 'Gold source licences should be explicit');
assertEqual(goldSeries.variant.status, 'known', 'Gold annual-average return variant should be resolved');
assertEqual(goldSeries.estimatedSegments.length, 1, 'Gold should expose one explicit post-war bridge');
assertEqual(goldSeries.estimatedSegments[0].startYear, 1945, 'Gold bridge should begin with the source gap');
assertEqual(goldSeries.estimatedSegments[0].endYear, 1950, 'Gold bridge should end before the 1951 DEM proxy');
assertEqual(
    goldSeries.missingness.fallbackZeroSegments.length,
    0,
    'Gold values must not use silent fallback-zero segments'
);
assertEqual(
    goldSeries.missingness.zeroValuePolicy,
    'literal_value',
    'Gold zeros should be either source-derived literals or covered by the explicit estimated bridge'
);
const wageSeries = HISTORICAL_DATA_MANIFEST.series.lohn_de;
assertEqual(wageSeries.source.status, 'known', 'German wage source should be resolved');
assertEqual(wageSeries.license.status, 'known', 'German wage source licence should be explicit');
assertEqual(wageSeries.estimatedSegments[0].endYear, 1946, 'Wage JST proxy should stop before the first published annual change');
assert(wageSeries.transformation.value.includes('not the statutory German pension-adjustment series'), 'Wage proxy must not claim statutory pension-adjustment identity');
assertJsonEqual(
    wageSeries.discontinuities.map(({ year, type }) => ({ year, type })),
    [
        { year: 1925, type: 'start_boundary' },
        { year: 1945, type: 'wartime_market_observation_break' },
        { year: 1947, type: 'source_seam' },
        { year: 1948, type: 'currency_reform_context' }
    ],
    'Wage manifest should expose every early discontinuity'
);
const capeSeries = HISTORICAL_DATA_MANIFEST.series.cape;
assertEqual(capeSeries.source.status, 'known', 'CAPE source should be resolved');
assertEqual(capeSeries.license.status, 'known', 'CAPE usage boundary should be explicit');
assertEqual(capeSeries.region.value, 'US stock market', 'CAPE region should be explicit');
assertEqual(capeSeries.estimatedSegments.length, 1, 'CAPE should expose the interpolation-affected early segment');
assertEqual(capeSeries.estimatedSegments[0].endYear, 1935, 'CAPE early quality boundary should include the complete trailing ten-year interpolation window');
assert(capeSeries.transformation.value.includes('no second lag'), 'CAPE mapping should reject a second lag');
console.log('✓ resolved chains and explicit evidence boundaries OK');

console.log('Test 3: canonical browser-compatible SHA-256 matches Node SHA-256');
{
    const canonical = canonicalizeHistoricalContractValue(HISTORICAL_DATA);
    const nodeHash = createHash('sha256').update(canonical).digest('hex');
    assertEqual(sha256Hex('abc'), 'ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad', 'SHA-256 known vector should match');
    assertEqual(computeHistoricalDatasetHash(HISTORICAL_DATA), nodeHash, 'Browser-compatible hash should match Node crypto');
    assertEqual(HISTORICAL_DATA_MANIFEST.contentHash.value, nodeHash, 'Manifest hash should match canonical data');
    assertEqual(HISTORICAL_DATA_MANIFEST.contentHash.value.length, 64, 'Manifest hash should contain 64 hex characters');
}
console.log('✓ canonical SHA-256 OK');

console.log('Test 4: manifested dataset is contiguous, valid and exposed through immutable lookup');
{
    const years = Object.keys(HISTORICAL_DATA).map(Number).sort((left, right) => left - right);
    assertEqual(years.length, 101, '1925-2025 dataset should contain 101 records');
    for (let index = 1; index < years.length; index++) {
        assertEqual(years[index], years[index - 1] + 1, `Dataset should be contiguous at index ${index}`);
    }
    const hashBefore = computeHistoricalDatasetHash(HISTORICAL_DATA);
    const provider = createHistoricalBacktestContractProvider();
    assertEqual(provider.contentHash, hashBefore, 'Provider should expose the validated content hash');
    assertEqual(provider.bounds.startYear, 1929, 'Bounds should derive from dataset start plus four-year lookback');
    assertEqual(provider.bounds.endYear, 2025, 'Bounds should derive from dataset end');
    assertEqual(provider.getRecord(2000).dataset.contentHash, hashBefore, 'Records should carry dataset provenance');
    assertEqual(computeHistoricalDatasetHash(HISTORICAL_DATA), hashBefore, 'Provider must not mutate HISTORICAL_DATA');
}
console.log('✓ contiguous immutable lookup OK');

console.log('Test 5: empty or fabricated resolution fields are rejected');
{
    const emptyKnown = clone(HISTORICAL_DATA_MANIFEST);
    emptyKnown.series.global_equity_research_index.source = { status: 'known', value: '' };
    const emptyKnownError = captureError(() => validateHistoricalDataManifest(emptyKnown));
    assert(emptyKnownError instanceof HistoricalDataContractError, 'Empty known source should fail with contract error');
    assertEqual(emptyKnownError.code, 'HISTORICAL_MANIFEST_INVALID', 'Empty known source should have manifest error code');

    const fabricatedUnresolved = clone(HISTORICAL_DATA_MANIFEST);
    fabricatedUnresolved.series.global_equity_research_index.source = { status: 'unresolved', value: 'guessed-source' };
    const fabricatedError = captureError(() => validateHistoricalDataManifest(fabricatedUnresolved));
    assertEqual(fabricatedError?.code, 'HISTORICAL_MANIFEST_INVALID', 'Unresolved source with value should be rejected');

    const missingStatus = clone(HISTORICAL_DATA_MANIFEST);
    delete missingStatus.series.cape.license.status;
    const missingStatusError = captureError(() => validateHistoricalDataManifest(missingStatus));
    assertEqual(missingStatusError?.code, 'HISTORICAL_MANIFEST_INVALID', 'Missing license status should be rejected');

    const unorderedSeam = clone(HISTORICAL_DATA_MANIFEST);
    unorderedSeam.series.lohn_de.discontinuities[1].year = 1925;
    const unorderedSeamError = captureError(() => validateHistoricalDataManifest(unorderedSeam));
    assertEqual(unorderedSeamError?.code, 'HISTORICAL_MANIFEST_INVALID', 'Duplicate or unordered wage seams should fail closed');
}
console.log('✓ manifest resolution validation OK');

console.log('Test 6: revision/hash mismatch fails before a provider can be consumed');
{
    const changedData = { ...HISTORICAL_DATA, 2000: { ...HISTORICAL_DATA[2000], inflation_de: 99 } };
    const mismatch = captureError(() => createHistoricalBacktestContractProvider({
        records: changedData,
        manifest: HISTORICAL_DATA_MANIFEST
    }));
    assertEqual(mismatch?.code, 'HISTORICAL_DATA_HASH_MISMATCH', 'Changed data should fail manifested hash validation');
    assertEqual(mismatch?.details.expectedHash, HISTORICAL_DATA_MANIFEST.contentHash.value, 'Mismatch should expose expected hash');
    assertEqual(mismatch?.details.actualHash, computeHistoricalDatasetHash(changedData), 'Mismatch should expose actual hash');
}
console.log('✓ revision/hash mismatch OK');

console.log('Test 7: legacy DATASET_META points to the canonical manifest identity');
assertEqual(DATASET_META.historicalData.manifestId, HISTORICAL_DATA_MANIFEST.datasetId, 'Legacy metadata should reference manifest ID');
assertEqual(DATASET_META.historicalData.revision, HISTORICAL_DATA_MANIFEST.revision, 'Legacy metadata should reference manifest revision');
assertEqual(DATASET_META.historicalData.contentHash.value, HISTORICAL_DATA_MANIFEST.contentHash.value, 'Legacy metadata should reference manifest hash');
console.log('✓ metadata bridge OK');

console.log('Test 8: the V1 runtime manifest is covered by the wider simulation-data inventory');
validateSimulationDataInventory(SIMULATION_DATA_INVENTORY);
for (const seriesId of requiredSeries) {
    const inventorySeries = SIMULATION_DATA_INVENTORY.historicalSeries[seriesId];
    assert(inventorySeries, `${seriesId} should be linked into the wider data inventory`);
    assertEqual(inventorySeries.id, HISTORICAL_DATA_MANIFEST.series[seriesId].id, `${seriesId} inventory identity should match runtime manifest`);
    assertEqual(
        inventorySeries.rawDataHash.status,
        requiredSeries.includes(seriesId)
            ? 'known'
            : 'unresolved',
        `${seriesId} should reflect whether an external raw-data hash is available`
    );
    assertEqual(inventorySeries.embeddedValueHash.status, 'known', `${seriesId} should have a series-specific embedded-value hash`);
    assert(Array.isArray(inventorySeries.qualitySegments), `${seriesId} should own quality segments`);
}
console.log('✓ wider inventory bridge OK');

console.log('✅ Historical data manifest tests passed');
