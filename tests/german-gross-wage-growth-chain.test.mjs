import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    GERMAN_GROSS_WAGE_GROWTH_CHAIN,
    GERMAN_GROSS_WAGE_GROWTH_PCT
} from '../app/simulator/german-gross-wage-growth-chain.js';
import { annualData, HISTORICAL_DATA, HISTORICAL_DATA_MANIFEST } from '../app/simulator/simulator-data.js';
import { canonicalizeHistoricalContractValue } from '../app/simulator/historical-backtest-contract.js';
import { SIMULATION_DATA_INVENTORY } from '../app/simulator/simulation-data-inventory.js';

console.log('--- German Gross-Wage Growth Chain Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(directory, '..');
const sourcePath = path.join(
    projectRoot,
    'data',
    'historical',
    'german-gross-wage-growth-chain',
    'originals',
    'destatis-bruttomonatsverdienst-index-2026-08-01.html'
);
const jstSourcePath = path.join(
    projectRoot,
    'data',
    'historical',
    'global-equity-research-chain',
    'originals',
    'JSTdatasetR6.xlsx'
);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const assertJsonEqual = (actual, expected, message) => assertEqual(
    JSON.stringify(actual),
    JSON.stringify(expected),
    message
);

console.log('Test 1: source identity, proxy boundary and period are pinned');
assertEqual(GERMAN_GROSS_WAGE_GROWTH_CHAIN.schemaVersion, 'GermanGrossWageGrowthChainV2', 'Wage schema should be versioned');
assert(GERMAN_GROSS_WAGE_GROWTH_CHAIN.variant.includes('without special payments'), 'Selected wage variant should exclude special payments');
assertEqual(GERMAN_GROSS_WAGE_GROWTH_CHAIN.coverage.yearCount, 101, 'Wage chain should contain 101 years');
assertEqual(sha256(fs.readFileSync(sourcePath)), GERMAN_GROSS_WAGE_GROWTH_CHAIN.sourceFiles[1].sha256, 'Pinned Destatis HTML hash should match');
assertEqual(sha256(fs.readFileSync(jstSourcePath)), GERMAN_GROSS_WAGE_GROWTH_CHAIN.sourceFiles[0].sha256, 'Pinned JST R6 hash should match');
assert(GERMAN_GROSS_WAGE_GROWTH_CHAIN.pensionQualification.excludedClaim.includes('not an official historical statutory pension-adjustment series'), 'Wage proxy must reject statutory pension-adjustment identity');
assert(Object.isFrozen(GERMAN_GROSS_WAGE_GROWTH_CHAIN), 'Generated wage chain should be deeply immutable');
console.log('✓ identity, source and proxy boundary OK');

console.log('Test 2: source boundaries, method breaks, territory and precision are explicit');
assertJsonEqual(
    GERMAN_GROSS_WAGE_GROWTH_CHAIN.method.sourceMethodBreaks.map(entry => entry.startYear),
    [2007, 2022],
    'Destatis method-break years should be machine-readable'
);
assertJsonEqual(
    GERMAN_GROSS_WAGE_GROWTH_CHAIN.territorialSegments.map(({ startYear, endYear }) => ({ startYear, endYear })),
    [
        { startYear: 1925, endYear: 1946 },
        { startYear: 1947, endYear: 1990 },
        { startYear: 1991, endYear: 2025 }
    ],
    'Territorial segments should distinguish the former federal territory from post-reunification Germany'
);
assertEqual(GERMAN_GROSS_WAGE_GROWTH_CHAIN.precisionSegments[0].maximumHalfUnitRelativeIndexLevelEffectPct, 2.8, 'Early official precision boundary should quantify the maximum rounding effect');
assert(GERMAN_GROSS_WAGE_GROWTH_CHAIN.precisionSegments[0].note.includes('between 1.9 and 4.5'), 'Precision note should describe only current-year levels inside 1947-1955');
assert(GERMAN_GROSS_WAGE_GROWTH_CHAIN.precisionSegments[0].note.includes('prior 1946 level 1.8'), 'Precision note should identify the out-of-segment prior level that drives the maximum effect');
assertJsonEqual(
    GERMAN_GROSS_WAGE_GROWTH_CHAIN.discontinuities.map(({ year, type }) => ({ year, type })),
    [
        { year: 1925, type: 'start_boundary' },
        { year: 1945, type: 'wartime_market_observation_break' },
        { year: 1947, type: 'source_seam' },
        { year: 1948, type: 'currency_reform_context' }
    ],
    'Wage chain should expose start, wartime, source and currency-reform seams'
);
assertEqual(GERMAN_GROSS_WAGE_GROWTH_PCT[2020], -0.9, 'Negative wage growth must remain signed');
assertEqual(GERMAN_GROSS_WAGE_GROWTH_PCT[2024], 4.8, '2024 should use the selected Destatis gross-earnings series, not pension adjustment');
assertEqual(GERMAN_GROSS_WAGE_GROWTH_PCT[2025], 3.4, '2025 should use the current published annual change');
const wartime1945 = GERMAN_GROSS_WAGE_GROWTH_CHAIN.observationsByYear[1945];
assertClose(wartime1945.valuePct, 22.687439143135336, 1e-12, '1945 retained JST value should stay numerically explicit');
assertEqual(
    wartime1945.modelTreatment.selectedTreatment,
    'retain_level_derived_jst_value',
    '1945 continuity choice should be machine-readable'
);
assert(
    wartime1945.modelTreatment.rationale.includes('sensitivity-tested against a neutral zero-growth bridge'),
    '1945 retention rationale should require the documented sensitivity'
);
const sourceSeam1947 = GERMAN_GROSS_WAGE_GROWTH_CHAIN.discontinuities.find(entry => entry.year === 1947);
assert(
    sourceSeam1947.treatment.includes('no cross-source level ratio'),
    '1947 seam should prohibit a cross-source level ratio'
);
console.log('✓ source boundaries and discontinuities OK');

console.log('Test 3: JST proxy and runtime projection are explicit and complete');
for (let year = 1925; year <= 2025; year += 1) {
    const value = GERMAN_GROSS_WAGE_GROWTH_PCT[year];
    assert(Number.isFinite(value) && value > -100, `${year} wage growth should be finite and above -100 percent`);
    assertEqual(HISTORICAL_DATA[year].lohn_de, value, `${year} runtime history should use the generated wage rate`);
    assertEqual(annualData[year - 1925].lohn, value, `${year} Monte Carlo pool should use the generated wage rate`);
    if (year <= 1946) {
        assertEqual(
            GERMAN_GROSS_WAGE_GROWTH_CHAIN.observationsByYear[year].evidenceClass,
            year === 1945 ? 'estimated' : 'proxy',
            `${year} should retain its explicit JST evidence class`
        );
        assertEqual(GERMAN_GROSS_WAGE_GROWTH_CHAIN.observationsByYear[year].sourceObservation.sourceSeries, 'JST R6 DEU.wage', `${year} should retain its JST series identity`);
    }
}
assertClose(GERMAN_GROSS_WAGE_GROWTH_PCT[1925], 26.51997683844818, 1e-12, '1925 should use the JST level-derived change rather than 3 percent');
assertClose(GERMAN_GROSS_WAGE_GROWTH_PCT[1932], -9.715177526336326, 1e-12, '1932 should retain the JST contraction');
assertEqual(Object.keys(GERMAN_GROSS_WAGE_GROWTH_PCT).length, 101, 'Wage chain should contain 101 runtime rates');
const runtimeSource = fs.readFileSync(path.join(projectRoot, 'app', 'simulator', 'simulator-data.js'), 'utf8');
assertEqual(/lohn_de:\s*-?\d/.test(runtimeSource), false, 'Runtime history should not retain numeric wage literals');
console.log('✓ explicit early model segment and generated-only runtime projection OK');

console.log('Test 4: hashes, manifest and inventory align without upgrading external validation');
assertEqual(
    sha256(canonicalizeHistoricalContractValue(GERMAN_GROSS_WAGE_GROWTH_PCT)),
    GERMAN_GROSS_WAGE_GROWTH_CHAIN.hashes.annualGrowthHash,
    'Wage hash should cover all 101 generated rates'
);
const manifestSeries = HISTORICAL_DATA_MANIFEST.series.lohn_de;
assertEqual(manifestSeries.source.status, 'known', 'Runtime manifest should resolve the wage source');
assertEqual(manifestSeries.estimatedSegments[0].endYear, 1946, 'Runtime manifest should delimit the early JST proxy segment');
assert(manifestSeries.transformation.value.includes('not the statutory German pension-adjustment series'), 'Runtime manifest should retain the pension qualification');
const inventorySeries = SIMULATION_DATA_INVENTORY.historicalSeries.lohn_de;
assertEqual(inventorySeries.rawDataHash.value, GERMAN_GROSS_WAGE_GROWTH_CHAIN.hashes.rawDataHash, 'Inventory raw-data hash should match');
assertEqual(inventorySeries.embeddedValueHash.value, GERMAN_GROSS_WAGE_GROWTH_CHAIN.hashes.annualGrowthHash, 'Inventory value hash should match');
assertEqual(inventorySeries.externalValidationStatus, 'not_validated', 'Codex must not self-validate the replacement externally');
assertJsonEqual(
    inventorySeries.qualitySegments.map(({ startYear, endYear, evidenceClass }) => ({ startYear, endYear, evidenceClass })),
    GERMAN_GROSS_WAGE_GROWTH_CHAIN.qualitySegments.map(({ startYear, endYear, evidenceClass }) => ({ startYear, endYear, evidenceClass })),
    'Inventory should preserve every wage quality and method segment'
);
assertJsonEqual(
    inventorySeries.discontinuities.map(({ year, type }) => ({ year, type })),
    GERMAN_GROSS_WAGE_GROWTH_CHAIN.discontinuities.map(({ year, type }) => ({ year, type })),
    'Inventory should preserve every wage discontinuity'
);
console.log('✓ hashes and metadata alignment OK');

console.log('Test 5: read-only generator reconstruction is byte-identical');
const verification = spawnSync(process.execPath, ['scripts/build-german-gross-wage-growth-chain.mjs', '--verify-only'], {
    cwd: projectRoot,
    encoding: 'utf8',
    windowsHide: true
});
assertEqual(verification.status, 0, `Wage generator verification should succeed: ${verification.stderr}`);
assert(verification.stdout.includes(GERMAN_GROSS_WAGE_GROWTH_CHAIN.hashes.annualGrowthHash), 'Wage verification should report the annual-growth hash');
console.log('✓ byte-identical generator verification OK');

console.log('✅ German gross-wage growth chain tests passed');
