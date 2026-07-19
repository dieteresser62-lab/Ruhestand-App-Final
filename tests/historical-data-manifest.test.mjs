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

console.log('--- Historical Data Manifest Tests ---');

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

const requiredSeries = [
    'msci_eur',
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
assertEqual(HISTORICAL_DATA_MANIFEST.revision, '2026-07-18.1', 'Manifest revision should be explicit');
assertEqual(HISTORICAL_DATA_MANIFEST.period.startYear, 1925, 'Manifest start year should match embedded history');
assertEqual(HISTORICAL_DATA_MANIFEST.period.endYear, 2025, 'Manifest end year should match embedded history');
assertEqual(HISTORICAL_DATA_MANIFEST.lookback.backtestYears, 4, 'Backtest lookback should be explicit');
assert(Object.isFrozen(HISTORICAL_DATA_MANIFEST), 'Manifest root should be immutable');
assert(Object.isFrozen(HISTORICAL_DATA_MANIFEST.series.msci_eur), 'Manifest series should be deeply immutable');

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
    assertEqual(series.missingness.required, true, `${seriesId} should be required for V1 records`);
    assertEqual(series.missingness.rule, 'reject_missing_or_non_finite', `${seriesId} should reject missing/non-finite values`);
    assert(Array.isArray(series.missingness.fallbackZeroSegments), `${seriesId} should manifest fallback-zero segments`);
    assert(typeof series.revision === 'string' && series.revision.length > 0, `${seriesId} should have a revision`);
}
console.log('✓ required manifest fields OK');

console.log('Test 2: unresolved source, license and variant claims stay explicit');
for (const seriesId of requiredSeries) {
    const series = HISTORICAL_DATA_MANIFEST.series[seriesId];
    assertEqual(series.source.status, 'unresolved', `${seriesId} source must remain unresolved without evidence`);
    assertEqual(series.source.value, null, `${seriesId} unresolved source must not contain an invented value`);
    assertEqual(series.license.status, 'unresolved', `${seriesId} license must remain unresolved without evidence`);
    assertEqual(series.license.value, null, `${seriesId} unresolved license must not contain an invented value`);
    assertEqual(series.variant.status, 'unresolved', `${seriesId} variant must remain unresolved without evidence`);
    assertEqual(series.variant.value, null, `${seriesId} unresolved variant must not contain an invented value`);
}
assertEqual(
    HISTORICAL_DATA_MANIFEST.series.gold_eur_perf.missingness.fallbackZeroSegments.length,
    0,
    'Ambiguous gold zero values must not be silently manifested as fallback_zero'
);
assertEqual(
    HISTORICAL_DATA_MANIFEST.series.gold_eur_perf.missingness.zeroValuePolicy,
    'unresolved_if_zero',
    'Ambiguous gold zeros should carry unresolved quality'
);
console.log('✓ unresolved claims and zero policy OK');

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
    emptyKnown.series.msci_eur.source = { status: 'known', value: '' };
    const emptyKnownError = captureError(() => validateHistoricalDataManifest(emptyKnown));
    assert(emptyKnownError instanceof HistoricalDataContractError, 'Empty known source should fail with contract error');
    assertEqual(emptyKnownError.code, 'HISTORICAL_MANIFEST_INVALID', 'Empty known source should have manifest error code');

    const fabricatedUnresolved = clone(HISTORICAL_DATA_MANIFEST);
    fabricatedUnresolved.series.msci_eur.source = { status: 'unresolved', value: 'guessed-source' };
    const fabricatedError = captureError(() => validateHistoricalDataManifest(fabricatedUnresolved));
    assertEqual(fabricatedError?.code, 'HISTORICAL_MANIFEST_INVALID', 'Unresolved source with value should be rejected');

    const missingStatus = clone(HISTORICAL_DATA_MANIFEST);
    delete missingStatus.series.cape.license.status;
    const missingStatusError = captureError(() => validateHistoricalDataManifest(missingStatus));
    assertEqual(missingStatusError?.code, 'HISTORICAL_MANIFEST_INVALID', 'Missing license status should be rejected');
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

console.log('✅ Historical data manifest tests passed');
