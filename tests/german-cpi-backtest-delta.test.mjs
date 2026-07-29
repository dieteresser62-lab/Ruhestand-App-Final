import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GERMAN_CPI_RESEARCH_CHAIN } from '../app/simulator/german-cpi-chain.js';

console.log('--- German CPI Backtest Delta Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(
    directory,
    'fixtures',
    'german-cpi-chain-backtest-delta-v1.json'
);
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const beforePath = path.join(directory, 'fixtures', fixture.beforeTarget.artifact);
const afterPath = path.join(directory, 'fixtures', fixture.afterTarget.artifact);
const beforeBytes = fs.readFileSync(beforePath);
const afterBytes = fs.readFileSync(afterPath);
const before = JSON.parse(beforeBytes);
const after = JSON.parse(afterBytes);
const metricNames = [
    'summaryEndWealth',
    'totalWithdrawal',
    'totalTax',
    'yearsWithReductionAtLeast10Pct',
    'maxReductionStreak',
    'maxDrawdownPct',
    'minRunwayCoveragePct',
    'maxAbsolutePortfolioFlowDelta'
];

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function roundDelta(value) {
    return Math.round(value * 1e6) / 1e6;
}

function referenceCaseIdentity(testCase) {
    const startYear = Number(testCase?.period?.startYear);
    const endYear = Number(testCase?.period?.endYear);
    assert(Number.isInteger(startYear), `${testCase?.id || 'unknown'} should identify an integer start year`);
    assert(Number.isInteger(endYear), `${testCase?.id || 'unknown'} should identify an integer end year`);
    return `${testCase.id}:${startYear}-${endYear}`;
}

function indexCases(cases, label) {
    const indexed = new Map();
    for (const testCase of cases) {
        const identity = referenceCaseIdentity(testCase);
        assert(!indexed.has(identity), `${label} should not duplicate ${identity}`);
        indexed.set(identity, testCase);
    }
    return indexed;
}

console.log('Test 1: before/after fixtures and the sole intended cause are pinned');
assertEqual(fixture.schemaVersion, 'GermanCpiBacktestDeltaV1', 'Delta fixture should be versioned');
assertEqual(fixture.cause, 'german_cpi_chain', 'Delta fixture should name the sole intended cause');
assertEqual(sha256(beforeBytes), fixture.beforeTarget.sha256, 'Post-Slice-02 target should match its pinned hash');
assertEqual(sha256(afterBytes), fixture.afterTarget.sha256, 'Active target should match its pinned hash');
assertEqual(
    fixture.afterTarget.inflationAnnualRateHash,
    GERMAN_CPI_RESEARCH_CHAIN.annualRateHash,
    'Delta fixture should pin the active inflation chain'
);
assert(
    fixture.beforeTarget.inflationAnnualRateHash !== fixture.afterTarget.inflationAnnualRateHash,
    'Before and after inflation chains should be distinguishable'
);
console.log('✓ evidence fixtures and cause OK');

console.log('Test 2: reference cases match by ID and period and expose explained deltas');
const beforeCases = indexCases(before.cases, 'Before target');
const afterCases = indexCases(after.cases, 'After target');
assertEqual(fixture.cases.length, after.cases.length, 'Every active target case should have delta evidence');
for (const testCase of fixture.cases) {
    const identity = referenceCaseIdentity(testCase);
    const beforeCase = beforeCases.get(identity);
    const afterCase = afterCases.get(identity);
    assert(beforeCase, `${identity} should exist before the replacement`);
    assert(afterCase, `${identity} should exist after the replacement`);
    assertEqual(beforeCase.inputHash, testCase.inputHash, `${identity} before input should match`);
    assertEqual(afterCase.inputHash, testCase.inputHash, `${identity} after input should remain unchanged`);
    assertEqual(beforeCase.outcomeObservation, testCase.outcome.before, `${identity} before outcome should match`);
    assertEqual(afterCase.outcomeObservation, testCase.outcome.after, `${identity} after outcome should match`);
    assertEqual(testCase.outcome.before, testCase.outcome.after, `${identity} outcome class should remain unchanged`);
    assertEqual(testCase.outcome.cause, fixture.cause, `${identity} outcome comparison should name its cause`);
    assertEqual(
        JSON.stringify(Object.keys(testCase.metrics)),
        JSON.stringify(metricNames),
        `${identity} should cover every contracted delta metric`
    );

    assertEqual(
        beforeCase.canonicalRowsHash,
        testCase.canonicalRowsHash.before,
        `${identity} before row hash should match`
    );
    assertEqual(
        afterCase.canonicalRowsHash,
        testCase.canonicalRowsHash.after,
        `${identity} after row hash should match`
    );
    assertEqual(
        testCase.canonicalRowsHash.changed,
        beforeCase.canonicalRowsHash !== afterCase.canonicalRowsHash,
        `${identity} row-change flag should be derived`
    );
    assertEqual(testCase.canonicalRowsHash.cause, fixture.cause, `${identity} row delta should name its cause`);

    for (const [metricName, metric] of Object.entries(testCase.metrics)) {
        assertEqual(beforeCase.values[metricName], metric.before, `${identity}.${metricName} before should match`);
        assertEqual(afterCase.values[metricName], metric.after, `${identity}.${metricName} after should match`);
        assertEqual(metric.cause, fixture.cause, `${identity}.${metricName} should name its cause`);
        const expectedDelta = metric.before === null || metric.after === null
            ? null
            : roundDelta(metric.after - metric.before);
        assertEqual(metric.delta, expectedDelta, `${identity}.${metricName} delta should be derived`);
    }

    assert(testCase.metrics.maxAbsolutePortfolioFlowDelta.before < 1, `${identity} before FlowDelta should stay below one euro`);
    assert(testCase.metrics.maxAbsolutePortfolioFlowDelta.after < 1, `${identity} after FlowDelta should stay below one euro`);
}
assert(
    fixture.cases.some(testCase => testCase.metrics.summaryEndWealth.delta !== 0),
    'Full-chain evidence should expose changed nominal results where inflation feeds later indexation'
);
assert(
    fixture.cases.some(testCase => testCase.metrics.summaryEndWealth.delta === 0),
    'Full-chain evidence should also retain unaffected nominal reference paths'
);
console.log('✓ reference identities, metrics and FlowDelta OK');

console.log('Test 3: the recorded D-20 final-year isolation is mathematically explained');
{
    const isolation = fixture.finalYearDeflatorIsolation;
    const oldReal = (
        isolation.nominalBasisAfterPriorYearInflation
        / (1 + (isolation.beforeInflationPct / 100))
    );
    const newReal = (
        isolation.nominalBasisAfterPriorYearInflation
        / (1 + (isolation.afterInflationPct / 100))
    );
    assertEqual(isolation.findingId, 'D-20', 'Isolation should remain tied to finding D-20');
    assertEqual(isolation.year, 2024, 'Isolation should identify the corrected final year');
    assertEqual(isolation.beforeInflationPct, 2.5, 'Isolation should retain the former HICP-like value');
    assertEqual(isolation.afterInflationPct, 2.2, 'Isolation should use the selected national VPI value');
    assertEqual(isolation.nominalEndWealthDelta, 0, 'A final-year-only deflator correction should not change nominal wealth');
    assertClose(oldReal, isolation.realEndWealthBefore, 1e-9, 'Before real wealth should follow the documented formula');
    assertClose(newReal, isolation.realEndWealthAfter, 1e-9, 'After real wealth should follow the documented formula');
    assertEqual(
        roundDelta(newReal - oldReal),
        isolation.realEndWealthDelta,
        'Real-wealth delta should be fully explained by the final-year deflator'
    );
    assertEqual(isolation.realEndWealthDelta, 7758.95, 'Recorded isolated real-wealth delta should remain stable');
}
console.log('✓ D-20 nominal/real isolation OK');

console.log('✅ German CPI backtest delta tests passed');

