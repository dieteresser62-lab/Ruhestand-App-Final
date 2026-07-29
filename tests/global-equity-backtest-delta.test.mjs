import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    GLOBAL_EQUITY_RESEARCH_CHAIN
} from '../app/simulator/global-equity-research-chain.js';

console.log('--- Global Equity Backtest Delta Tests ---');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(__dirname, 'fixtures', 'global-equity-research-chain-backtest-delta-v1.json');
const beforeTargetPath = path.join(__dirname, 'fixtures', 'global-equity-research-chain-before-target-v1.json');
const targetPath = path.join(__dirname, 'fixtures', 'post-backtest-data-02-target-v1.json');
const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
const beforeTargetBytes = fs.readFileSync(beforeTargetPath);
const beforeTarget = JSON.parse(beforeTargetBytes);
const targetBytes = fs.readFileSync(targetPath);
const target = JSON.parse(targetBytes);
const expectedMetricKeys = [
    'summaryEndWealth',
    'totalWithdrawal',
    'totalTax',
    'yearsWithReductionAtLeast10Pct',
    'maxReductionStreak',
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

function indexReferenceCases(cases, label) {
    const indexed = new Map();
    for (const testCase of cases) {
        const identity = referenceCaseIdentity(testCase);
        assert(!indexed.has(identity), `${label} should not duplicate reference identity ${identity}`);
        indexed.set(identity, testCase);
    }
    return indexed;
}

function assertSamePeriod(actual, expected, label) {
    assertEqual(actual?.startYear, expected?.startYear, `${label} start year should match`);
    assertEqual(actual?.endYear, expected?.endYear, `${label} end year should match`);
    assertEqual(actual?.requestedYears, expected?.requestedYears, `${label} requested years should match`);
}

const beforeTargetCases = indexReferenceCases(beforeTarget.cases, 'Before-target evidence');
const targetCases = indexReferenceCases(target.cases, 'Active target fixture');

assertEqual(fixture.schemaVersion, 'GlobalEquityResearchBacktestDeltaV1', 'Delta fixture should be versioned');
assertEqual(fixture.cause, 'global_equity_research_chain', 'Delta fixture should name the sole intended cause');
assertEqual(fixture.cases.length, 7, 'All six existing target cases plus the seam reference case should be present');
assertEqual(sha256(beforeTargetBytes), fixture.beforeTarget.sha256, 'Tracked before-target evidence should match its pinned hash');
assertEqual(
    fixture.beforeTarget.baseCommitOriginalFixtureSha256,
    'c34e0aea16304308650d11b3a03d96ec3632f80e95df4bc771958da3d987febe',
    'The original base-commit target hash should remain explicitly distinguished from the instrumented evidence'
);
assertEqual(
    fixture.afterTarget.equityAnnualReturnHash,
    GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturnHash,
    'Delta fixture should pin the active equity-return chain'
);
assertEqual(sha256(targetBytes), fixture.afterTarget.sha256, 'After-target hash should match the frozen target fixture');

for (const testCase of fixture.cases) {
    const identity = referenceCaseIdentity(testCase);
    const beforeCase = beforeTargetCases.get(identity);
    const activeCase = targetCases.get(identity);
    assert(beforeCase, `${identity} should exist in the tracked before-target evidence`);
    assert(activeCase, `${identity} should exist in the active target fixture`);
    assertSamePeriod(beforeCase.period, testCase.period, `${identity} before period`);
    assertSamePeriod(activeCase.period, testCase.period, `${identity} active period`);
    assertEqual(beforeCase.inputHash, testCase.inputHash, `${testCase.id} before input hash should match`);
    assertEqual(activeCase.inputHash, testCase.inputHash, `${testCase.id} input hash should remain unchanged`);
    assertEqual(beforeCase.outcomeObservation, testCase.outcome.before, `${testCase.id} before outcome should match`);
    assertEqual(activeCase.outcomeObservation, testCase.outcome.after, `${testCase.id} after outcome should match`);
    assertEqual(testCase.outcome.before, testCase.outcome.after, `${testCase.id} outcome class should remain unchanged`);
    assertEqual(testCase.outcome.cause, fixture.cause, `${testCase.id} outcome comparison should name its cause`);
    assertEqual(
        JSON.stringify(Object.keys(testCase.metrics)),
        JSON.stringify(expectedMetricKeys),
        `${testCase.id} should cover every contracted delta metric`
    );

    for (const [metricName, metric] of Object.entries(testCase.metrics)) {
        assertEqual(metric.cause, fixture.cause, `${testCase.id}.${metricName} should name its cause`);
        assertEqual(beforeCase.values[metricName], metric.before, `${testCase.id}.${metricName} before value should match`);
        assertEqual(activeCase.values[metricName], metric.after, `${testCase.id}.${metricName} after value should match`);
        assertEqual(
            metric.delta,
            roundDelta(metric.after - metric.before),
            `${testCase.id}.${metricName} delta should equal after minus before`
        );
    }

    assert(testCase.metrics.maxAbsolutePortfolioFlowDelta.before < 1, `${testCase.id} before FlowDelta should stay below one euro`);
    assert(testCase.metrics.maxAbsolutePortfolioFlowDelta.after < 1, `${testCase.id} after FlowDelta should stay below one euro`);
    assertEqual(
        testCase.supplementalDiagnostics.evidence,
        'retrocomputed_from_base_commit_with_slice02_instrumentation_not_a_base_fixture_oracle',
        `${testCase.id} should disclose the evidence class of newly instrumented diagnostics`
    );
}

assert(
    fixture.cases.some(testCase => testCase.id === 'completed_numeraire_seam_1949_1952'),
    'A fixed reference run should cross the corrected 1949/1950/1951 numeraire seam'
);
assert(
    fixture.cases.some(testCase => testCase.id === 'health_bucket_nested_row_summary_positive'),
    'The previously omitted health-bucket reference case should have a delta record'
);

assert(
    fixture.cases.some(testCase => testCase.metrics.summaryEndWealth.delta !== 0),
    'The controlled data replacement should expose at least one changed economic result'
);

console.log('✅ Global equity backtest delta tests passed');
