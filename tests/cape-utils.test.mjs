import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getStartYearCandidates } from '../app/shared/cape-utils.js';
import {
    annualData,
    ESTIMATED_HISTORY_CUTOFF_YEAR,
    HISTORICAL_DATA_MANIFEST
} from '../app/simulator/simulator-data.js';
import {
    buildYearSamplingConfig,
    resolveMinStartYearIndex
} from '../app/simulator/mc-year-sampling.js';

console.log('--- CAPE Sampling Decision-Year Contract Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const evidence = JSON.parse(fs.readFileSync(
    path.join(directory, 'fixtures', 'cape-sampling-delta-v1.json'),
    'utf8'
));

function assertJsonEqual(actual, expected, message) {
    assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}

console.log('Test 1: sampling consumes the supplied decision-year CAPE field');
const syntheticRows = [
    { jahr: 2000, capeRatio: 10 },
    { jahr: 2001, capeRatio: 20 },
    { jahr: 2002, capeRatio: 30 },
    { jahr: 2003, capeRatio: 40 },
    { jahr: 2004, capeRatio: 50 }
];
assertJsonEqual(
    getStartYearCandidates(30, syntheticRows, 0.01, { fallbackToAll: false }),
    [2001, 2002, 2003],
    'Sampling should use the caller-supplied capeRatio under the same decision year, including its documented sparse-pool widening'
);
const remappedRows = syntheticRows.map(row => ({ ...row, capeRatio: row.jahr === 2004 ? 30 : 100 }));
assertJsonEqual(
    getStartYearCandidates(30, remappedRows, 0.01, { fallbackToAll: false }),
    [2004],
    'Sampling should not consult a hidden global history table'
);
console.log('✓ explicit decision-year input contract OK');

console.log('Test 2: Slice 06 candidate-set changes are exact and documented');
assertEqual(evidence.baselineCommit, 'a7038e531ebbd4a258192e223feac66614fc28a0', 'Sampling delta should identify the Slice 06 baseline');
for (const sampleCase of evidence.cases) {
    const actual = getStartYearCandidates(
        sampleCase.targetCape,
        annualData,
        evidence.tolerance,
        { fallbackToAll: evidence.fallbackToAll }
    );
    assertJsonEqual(actual, sampleCase.afterCandidates, `Target CAPE ${sampleCase.targetCape} should reproduce the documented candidate set`);
    assertJsonEqual(
        sampleCase.beforeCandidates.filter(year => !actual.includes(year)),
        sampleCase.removedCandidates,
        `Target CAPE ${sampleCase.targetCape} should reproduce every removed candidate`
    );
    assertJsonEqual(
        actual.filter(year => !sampleCase.beforeCandidates.includes(year)),
        sampleCase.addedCandidates,
        `Target CAPE ${sampleCase.targetCape} should reproduce every added candidate`
    );
}
console.log('✓ exact sampling delta evidence OK');

console.log('Test 3: missing CAPE data follows the explicit fallback switch');
const missingCapeRows = [{ jahr: 1999 }, { jahr: 2000, capeRatio: null }];
assertJsonEqual(getStartYearCandidates(20, missingCapeRows), [1999, 2000], 'Legacy fallback should return all supplied years');
assertJsonEqual(
    getStartYearCandidates(20, missingCapeRows, 0.2, { fallbackToAll: false }),
    [],
    'Strict sampling should fail closed to an empty candidate set'
);
console.log('✓ explicit fallback boundary OK');

console.log('Test 4: estimated-history exclusion removes every interpolation-affected CAPE year');
const capeEstimateSegment = HISTORICAL_DATA_MANIFEST.series.cape.estimatedSegments[0];
assertEqual(capeEstimateSegment.startYear, 1925, 'CAPE estimate segment should start with the historical pool');
assertEqual(capeEstimateSegment.endYear, 1935, 'CAPE estimate segment should cover the complete trailing-window boundary');
assert(
    capeEstimateSegment.endYear < ESTIMATED_HISTORY_CUTOFF_YEAR,
    'The global estimated-history cutoff must exclude the complete CAPE estimate segment'
);
const minimumAllowedIndex = resolveMinStartYearIndex(annualData, true);
assertEqual(
    annualData[minimumAllowedIndex].jahr,
    ESTIMATED_HISTORY_CUTOFF_YEAR,
    'Monte Carlo estimated-history exclusion should start exactly at the configured cutoff'
);
const strictSamplingConfig = buildYearSamplingConfig('UNIFORM', annualData, {
    blockSize: 1,
    excludeEstimatedHistory: true
});
assert(
    strictSamplingConfig.allowedIndices.every(index => annualData[index].jahr >= ESTIMATED_HISTORY_CUTOFF_YEAR),
    'Every Monte Carlo year admitted under estimated-history exclusion should be at or after the cutoff'
);
assert(
    strictSamplingConfig.allowedIndices.every(index => annualData[index].jahr > capeEstimateSegment.endYear),
    'No interpolation-affected CAPE decision year may remain drawable'
);
console.log('✓ estimated-history exclusion covers CAPE interpolation vintage OK');

console.log('✅ CAPE sampling decision-year contract tests passed');
