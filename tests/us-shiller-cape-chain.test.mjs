import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    US_SHILLER_CAPE_BY_RETURN_YEAR,
    US_SHILLER_CAPE_CHAIN
} from '../app/simulator/us-shiller-cape-chain.js';
import { annualData, HISTORICAL_DATA, HISTORICAL_DATA_MANIFEST } from '../app/simulator/simulator-data.js';
import { canonicalizeHistoricalContractValue, createHistoricalBacktestContractProvider } from '../app/simulator/historical-backtest-contract.js';
import { SIMULATION_DATA_INVENTORY } from '../app/simulator/simulation-data-inventory.js';

console.log('--- US Shiller CAPE Decision Chain Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(directory, '..');
const sourcePath = path.join(
    projectRoot,
    'data',
    'historical',
    'us-shiller-cape-chain',
    'originals',
    'shiller-ie-data-2026-08-01.xls'
);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const assertJsonEqual = (actual, expected, message) => assertEqual(
    JSON.stringify(actual),
    JSON.stringify(expected),
    message
);

console.log('Test 1: source identity, CAPE variant and timing are pinned');
assertEqual(US_SHILLER_CAPE_CHAIN.schemaVersion, 'UsShillerCapeDecisionChainV1', 'CAPE schema should be versioned');
assertEqual(US_SHILLER_CAPE_CHAIN.region, 'US stock market', 'CAPE should declare the US market region');
assert(US_SHILLER_CAPE_CHAIN.variant.includes('conventional price CAPE'), 'CAPE should declare the conventional price variant');
assert(US_SHILLER_CAPE_CHAIN.variant.includes('not total-return CAPE'), 'CAPE should exclude total-return CAPE');
assertEqual(US_SHILLER_CAPE_CHAIN.temporalConvention.mapping, 'return_year_t_uses_december_t_minus_1', 'CAPE should use December t-1 for return year t');
assertEqual(sha256(fs.readFileSync(sourcePath)), US_SHILLER_CAPE_CHAIN.sourceFile.sha256, 'Pinned Shiller workbook hash should match');
assert(US_SHILLER_CAPE_CHAIN.sourceFile.usageBoundary.includes('no explicit open redistribution licence'), 'Missing explicit redistribution licence should remain visible');
assert(Object.isFrozen(US_SHILLER_CAPE_CHAIN), 'Generated CAPE chain should be deeply immutable');
console.log('✓ identity, source and timing OK');

console.log('Test 2: all 101 December decision signals are contiguous and projected once');
const provider = createHistoricalBacktestContractProvider();
for (let returnYear = 1925; returnYear <= 2025; returnYear += 1) {
    const value = US_SHILLER_CAPE_BY_RETURN_YEAR[returnYear];
    const source = US_SHILLER_CAPE_CHAIN.observationsByReturnYear[returnYear];
    const record = provider.getRecord(Math.max(returnYear, provider.bounds.startYear));
    assert(Number.isFinite(value) && value > 0, `${returnYear} CAPE should be finite and positive`);
    assertEqual(source.value, value, `${returnYear} source observation should match the decision signal`);
    assertEqual(source.observationYear, returnYear - 1, `${returnYear} observation year should be t-1`);
    assertEqual(source.observationMonth, 12, `${returnYear} observation month should be December`);
    assertEqual(source.asOfYear, returnYear - 1, `${returnYear} as-of year should be t-1`);
    assertEqual(source.decisionYear, returnYear, `${returnYear} decision year should be t`);
    assertEqual(HISTORICAL_DATA[returnYear].cape, value, `${returnYear} runtime history should use the generated CAPE signal`);
    assertEqual(annualData[returnYear - 1925].capeRatio, value, `${returnYear} Monte Carlo pool should use the same decision signal`);
    if (returnYear >= provider.bounds.startYear) {
        assertEqual(record.decisionAsOf.capeRatio.value, value, `${returnYear} historical contract should not add a second lag`);
    }
}
assertEqual(Object.keys(US_SHILLER_CAPE_BY_RETURN_YEAR).length, 101, 'CAPE chain should contain 101 years');
console.log('✓ contiguous no-double-lag projection OK');

console.log('Test 3: independent source markers lock observation month and year mapping');
assertClose(US_SHILLER_CAPE_BY_RETURN_YEAR[1925], 9.31063968041637, 1e-12, '1925 should use December 1924');
assertClose(US_SHILLER_CAPE_BY_RETURN_YEAR[1929], 25.3015910274261, 1e-12, '1929 should use December 1928');
assertClose(US_SHILLER_CAPE_BY_RETURN_YEAR[2000], 44.19793976104055, 1e-12, '2000 should use December 1999');
assertClose(US_SHILLER_CAPE_BY_RETURN_YEAR[2009], 15.3760807474238, 1e-12, '2009 should use December 2008');
assertClose(US_SHILLER_CAPE_BY_RETURN_YEAR[2025], 37.7111916964346, 1e-12, '2025 should use December 2024');
assert(US_SHILLER_CAPE_BY_RETURN_YEAR[2000] !== US_SHILLER_CAPE_BY_RETURN_YEAR[1999], 'Adjacent year signals should not be confused by a second lag');
console.log('✓ source markers OK');

console.log('Test 4: generated hashes, manifest and inventory align');
assertEqual(
    sha256(canonicalizeHistoricalContractValue(US_SHILLER_CAPE_BY_RETURN_YEAR)),
    US_SHILLER_CAPE_CHAIN.hashes.annualDecisionSignalHash,
    'CAPE decision-signal hash should cover all generated values'
);
const manifestSeries = HISTORICAL_DATA_MANIFEST.series.cape;
assertEqual(manifestSeries.source.status, 'known', 'Runtime manifest should resolve the CAPE source');
assertEqual(manifestSeries.region.value, 'US stock market', 'Runtime manifest should expose the CAPE region');
assertEqual(manifestSeries.estimatedSegments.length, 1, 'Runtime manifest should delimit the early interpolation-affected CAPE segment');
assertEqual(manifestSeries.estimatedSegments[0].endYear, 1935, 'CAPE estimate boundary should cover the complete trailing ten-year interpolation window');
const inventorySeries = SIMULATION_DATA_INVENTORY.historicalSeries.cape;
assertEqual(inventorySeries.rawDataHash.value, US_SHILLER_CAPE_CHAIN.hashes.rawDataHash, 'Inventory raw-data hash should match');
assertEqual(inventorySeries.embeddedValueHash.value, US_SHILLER_CAPE_CHAIN.hashes.annualDecisionSignalHash, 'Inventory value hash should match');
assertEqual(inventorySeries.externalValidationStatus, 'not_validated', 'Codex must not self-validate the replacement externally');
assertJsonEqual(
    inventorySeries.qualitySegments.map(({ startYear, endYear, evidenceClass }) => ({ startYear, endYear, evidenceClass })),
    [
        { startYear: 1925, endYear: 1935, evidenceClass: 'estimated' },
        { startYear: 1936, endYear: 2025, evidenceClass: 'backtested' }
    ],
    'CAPE quality should delimit the interpolation-affected vintage'
);
const runtimeSource = fs.readFileSync(path.join(projectRoot, 'app', 'simulator', 'simulator-data.js'), 'utf8');
assertEqual(/cape:\s*-?\d/.test(runtimeSource), false, 'Runtime history should not retain numeric CAPE literals');
console.log('✓ hashes and metadata alignment OK');

console.log('Test 5: read-only generator reconstruction is byte-identical');
const verification = spawnSync(process.execPath, ['scripts/build-us-shiller-cape-chain.mjs', '--verify-only'], {
    cwd: projectRoot,
    encoding: 'utf8',
    windowsHide: true
});
assertEqual(verification.status, 0, `CAPE generator verification should succeed: ${verification.stderr}`);
assert(verification.stdout.includes(US_SHILLER_CAPE_CHAIN.hashes.annualDecisionSignalHash), 'CAPE verification should report the decision-signal hash');
console.log('✓ byte-identical generator verification OK');

console.log('✅ US Shiller CAPE decision chain tests passed');
