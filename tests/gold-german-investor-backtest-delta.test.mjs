import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    GOLD_GERMAN_INVESTOR_CHAIN
} from '../app/simulator/gold-german-investor-chain.js';

console.log('--- Gold German-Investor Backtest Delta Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(
    directory,
    'fixtures',
    'gold-german-investor-backtest-delta-v2.json'
);
const beforePath = path.join(directory, 'fixtures', 'post-backtest-data-04-target-v1.json');
const afterPath = path.join(directory, 'fixtures', 'simulator-backtest-target-v1.json');
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

function round(value) {
    return Math.round(value * 1e9) / 1e9;
}

function caseIdentity(testCase) {
    return `${testCase.id}:${testCase.period.startYear}-${testCase.period.endYear}`;
}

function indexCases(cases) {
    return new Map(cases.map(testCase => [caseIdentity(testCase), testCase]));
}

function buildFixture() {
    const beforeCases = indexCases(before.cases);
    const goldFreeAfterCases = after.cases.filter(afterCase => beforeCases.has(caseIdentity(afterCase)));
    if (!after.goldDataDeltaOracle) throw new Error('Missing real gold-holding backtest oracle');

    return {
        schemaVersion: 'GoldGermanInvestorBacktestDeltaV2',
        cause: 'gold_german_investor_chain',
        beforeTarget: {
            artifact: path.basename(beforePath),
            sha256: sha256(beforeBytes),
            goldAnnualReturnHash: '54435976447fac970d46489a90abb809c061ae92615db1ca4467c64d92b10a01'
        },
        afterTarget: {
            artifact: path.basename(afterPath),
            sha256: sha256(afterBytes),
            goldAnnualReturnHash: GOLD_GERMAN_INVESTOR_CHAIN.hashes.annualReturnHash
        },
        goldFreeCases: goldFreeAfterCases.map((afterCase) => {
            const identity = caseIdentity(afterCase);
            const beforeCase = beforeCases.get(identity);
            if (!beforeCase) throw new Error(`Missing before case ${identity}`);
            return {
                id: afterCase.id,
                period: afterCase.period,
                inputHash: afterCase.inputHash,
                outcome: {
                    before: beforeCase.outcomeObservation,
                    after: afterCase.outcomeObservation
                },
                canonicalRowsHash: {
                    before: beforeCase.canonicalRowsHash,
                    after: afterCase.canonicalRowsHash,
                    changed: beforeCase.canonicalRowsHash !== afterCase.canonicalRowsHash
                },
                financialMetrics: Object.fromEntries(metricNames.map(metricName => [
                    metricName,
                    {
                        before: beforeCase.values[metricName],
                        after: afterCase.values[metricName],
                        delta: beforeCase.values[metricName] === null
                            ? null
                            : round(afterCase.values[metricName] - beforeCase.values[metricName])
                    }
                ]))
            };
        }),
        goldHoldingBacktest: after.goldDataDeltaOracle
    };
}

if (process.env.UPDATE_GOLD_BACKTEST_DELTA === '1') {
    if (fs.existsSync(fixturePath)) {
        throw new Error('Refusing to overwrite immutable German-investor gold delta evidence');
    }
    fs.writeFileSync(fixturePath, `${JSON.stringify(buildFixture(), null, 2)}\n`, 'utf8');
    console.log(`Created ${path.relative(path.join(directory, '..'), fixturePath)}`);
}

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

console.log('Test 1: before/after artifacts and the sole intended cause are pinned');
assertEqual(fixture.schemaVersion, 'GoldGermanInvestorBacktestDeltaV2', 'Delta fixture should be versioned');
assertEqual(fixture.cause, 'gold_german_investor_chain', 'Delta fixture should name the sole intended cause');
assertEqual(sha256(beforeBytes), fixture.beforeTarget.sha256, 'Post-Slice-04 target should match its pinned hash');
assertEqual(sha256(afterBytes), fixture.afterTarget.sha256, 'Active target should match its pinned hash');
assertEqual(
    fixture.afterTarget.goldAnnualReturnHash,
    GOLD_GERMAN_INVESTOR_CHAIN.hashes.annualReturnHash,
    'Delta fixture should pin the active gold chain'
);
assert(
    fixture.beforeTarget.goldAnnualReturnHash !== fixture.afterTarget.goldAnnualReturnHash,
    'Before and after gold chains should be distinguishable'
);
console.log('✓ evidence artifacts and cause OK');

console.log('Test 2: gold-free backtests retain every financial result and outcome');
const beforeCases = indexCases(before.cases);
const afterCases = indexCases(after.cases);
assertEqual(fixture.goldFreeCases.length, before.cases.length, 'Every pre-existing gold-free case should have invariance evidence');
for (const testCase of fixture.goldFreeCases) {
    const identity = caseIdentity(testCase);
    const beforeCase = beforeCases.get(identity);
    const afterCase = afterCases.get(identity);
    assert(beforeCase && afterCase, `${identity} should exist before and after the replacement`);
    assertEqual(beforeCase.inputHash, testCase.inputHash, `${identity} before input should match`);
    assertEqual(afterCase.inputHash, testCase.inputHash, `${identity} after input should remain unchanged`);
    assertEqual(testCase.outcome.before, testCase.outcome.after, `${identity} outcome should remain unchanged`);
    assertEqual(
        JSON.stringify(Object.keys(testCase.financialMetrics)),
        JSON.stringify(metricNames),
        `${identity} should cover every contracted financial metric`
    );
    for (const [metricName, metric] of Object.entries(testCase.financialMetrics)) {
        assertEqual(beforeCase.values[metricName], metric.before, `${identity}.${metricName} before should match`);
        assertEqual(afterCase.values[metricName], metric.after, `${identity}.${metricName} after should match`);
        assertEqual(metric.delta, metric.before === null ? null : 0, `${identity}.${metricName} should be invariant without gold holdings`);
    }
    assert(testCase.financialMetrics.maxAbsolutePortfolioFlowDelta.before < 1, `${identity} before FlowDelta should stay below one euro`);
    assert(testCase.financialMetrics.maxAbsolutePortfolioFlowDelta.after < 1, `${identity} after FlowDelta should stay below one euro`);
}
assert(
    fixture.goldFreeCases.some(testCase => testCase.canonicalRowsHash.changed),
    'Diagnostic row hashes should still reveal changed gold input fields'
);
assert(
    fixture.goldFreeCases.some(testCase => !testCase.canonicalRowsHash.changed),
    'A period wholly inside the unchanged explicit zero bridge should remain byte-stable'
);
console.log('✓ gold-free financial invariance, outcomes and FlowDelta OK');

console.log('Test 3: a real multi-year gold-holding backtest exposes the explained data delta');
const reference = fixture.goldHoldingBacktest;
const afterGoldCase = after.cases.find(testCase => testCase.id === reference.scenarioId);
assert(afterGoldCase, 'Gold-holding reference should be a real active target case');
assertEqual(afterGoldCase.inputs.goldAktiv, true, 'Gold-holding reference should activate the production gold path');
assertEqual(reference.period.startYear, 2000, 'Gold-holding reference should start in 2000');
assertEqual(reference.period.endYear, 2005, 'Gold-holding reference should cover six simulation years');
assertEqual(reference.outcome.before, 'completed', 'Before gold-holding backtest should complete');
assertEqual(reference.outcome.after, 'completed', 'After gold-holding backtest should complete');
assertEqual(reference.cause, fixture.cause, 'Gold-holding delta should name the sole intended cause');
assert(reference.canonicalRowsHash.changed, 'Gold-holding canonical rows should change after the data replacement');
assertEqual(
    JSON.stringify(Object.keys(reference.financialMetrics).sort()),
    JSON.stringify([...metricNames].sort()),
    'Gold-holding reference should cover all eight contracted financial metrics'
);
for (const [metricName, metric] of Object.entries(reference.financialMetrics)) {
    const expectedDelta = metric.before === null || metric.after === null
        ? null
        : round(metric.after - metric.before);
    assertEqual(metric.delta, expectedDelta, `${metricName} delta should reconcile exactly`);
}
assert(
    Object.values(reference.financialMetrics).some(metric => Number.isFinite(metric.delta) && metric.delta !== 0),
    'Gold-holding reference should expose at least one effective financial delta'
);
assert(reference.financialMetrics.maxAbsolutePortfolioFlowDelta.before < 1, 'Before FlowDelta should stay below one euro');
assert(reference.financialMetrics.maxAbsolutePortfolioFlowDelta.after < 1, 'After FlowDelta should stay below one euro');
console.log('✓ real multi-year gold-holding effectiveness and FlowDelta OK');

console.log('✅ Gold German-investor backtest delta tests passed');
