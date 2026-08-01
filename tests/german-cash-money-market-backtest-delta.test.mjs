import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS,
    GERMAN_CASH_MONEY_MARKET_CHAIN
} from '../app/simulator/german-cash-money-market-chain.js';

console.log('--- German Cash/Money-Market Backtest Delta Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const fixturePath = path.join(
    directory,
    'fixtures',
    'german-cash-money-market-backtest-delta-v1.json'
);
const beforePath = path.join(directory, 'fixtures', 'post-backtest-data-03-target-v1.json');
const afterPath = path.join(directory, 'fixtures', 'post-backtest-data-04-target-v1.json');
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

function caseIdentity(testCase) {
    return `${testCase.id}:${testCase.period.startYear}-${testCase.period.endYear}`;
}

function indexCases(cases) {
    return new Map(cases.map(testCase => [caseIdentity(testCase), testCase]));
}

function buildFixture() {
    const beforeCases = indexCases(before.cases);
    return {
        schemaVersion: 'GermanCashMoneyMarketBacktestDeltaV1',
        cause: 'german_cash_money_market_chain',
        beforeTarget: {
            artifact: path.basename(beforePath),
            sha256: sha256(beforeBytes),
            interestAnnualReturnHash: 'e4dafb4d556cb342e7060d65933bbbdcaeb5a7e8adfbf89aefca04f4bfb45ad6'
        },
        afterTarget: {
            artifact: path.basename(afterPath),
            sha256: sha256(afterBytes),
            interestAnnualReturnHash: GERMAN_CASH_MONEY_MARKET_CHAIN.hashes.annualReturnHash
        },
        alignmentMarkers: after.alignmentOracle.map(marker => ({
            year: marker.year,
            sourceReturnPct: GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[marker.year],
            activeMonteCarlo: marker.activeMonteCarloAnnualData,
            targetExpectedInterest: marker.targetExpected.interest,
            legacyBacktestInterest: marker.legacyBacktest.interest
        })),
        cases: after.cases.map(afterCase => {
            const identity = caseIdentity(afterCase);
            const beforeCase = beforeCases.get(identity);
            if (!beforeCase) throw new Error(`Missing before case ${identity}`);
            const metrics = {};
            for (const metricName of metricNames) {
                const beforeValue = beforeCase.values[metricName];
                const afterValue = afterCase.values[metricName];
                metrics[metricName] = {
                    before: beforeValue,
                    after: afterValue,
                    delta: beforeValue === null || afterValue === null
                        ? null
                        : roundDelta(afterValue - beforeValue),
                    cause: 'german_cash_money_market_chain'
                };
            }
            return {
                id: afterCase.id,
                period: afterCase.period,
                inputHash: afterCase.inputHash,
                outcome: {
                    before: beforeCase.outcomeObservation,
                    after: afterCase.outcomeObservation,
                    cause: 'german_cash_money_market_chain'
                },
                canonicalRowsHash: {
                    before: beforeCase.canonicalRowsHash,
                    after: afterCase.canonicalRowsHash,
                    changed: beforeCase.canonicalRowsHash !== afterCase.canonicalRowsHash,
                    cause: 'german_cash_money_market_chain'
                },
                metrics
            };
        })
    };
}

if (process.env.UPDATE_CASH_BACKTEST_DELTA === '1') {
    if (fs.existsSync(fixturePath)) {
        throw new Error('Refusing to overwrite immutable German cash/money-market delta evidence');
    }
    fs.writeFileSync(fixturePath, `${JSON.stringify(buildFixture(), null, 2)}\n`, 'utf8');
    console.log(`Created ${path.relative(path.join(directory, '..'), fixturePath)}`);
}

const fixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));

console.log('Test 1: before/after fixtures and the sole intended cause are pinned');
assertEqual(fixture.schemaVersion, 'GermanCashMoneyMarketBacktestDeltaV1', 'Delta fixture should be versioned');
assertEqual(fixture.cause, 'german_cash_money_market_chain', 'Delta fixture should name the sole intended cause');
assertEqual(sha256(beforeBytes), fixture.beforeTarget.sha256, 'Post-Slice-03 target should match its pinned hash');
assertEqual(sha256(afterBytes), fixture.afterTarget.sha256, 'Archived Slice-04 target should match its pinned hash');
assertEqual(
    fixture.afterTarget.interestAnnualReturnHash,
    GERMAN_CASH_MONEY_MARKET_CHAIN.hashes.annualReturnHash,
    'Delta fixture should pin the Slice-04 interest chain'
);
assert(
    fixture.beforeTarget.interestAnnualReturnHash !== fixture.afterTarget.interestAnnualReturnHash,
    'Before and after interest chains should be distinguishable'
);
console.log('✓ evidence fixtures and cause OK');

console.log('Test 2: reference cases retain identity, outcome and explained metrics');
const beforeCases = indexCases(before.cases);
const afterCases = indexCases(after.cases);
assertEqual(fixture.cases.length, after.cases.length, 'Every Slice-04 target case should have delta evidence');
for (const testCase of fixture.cases) {
    const identity = caseIdentity(testCase);
    const beforeCase = beforeCases.get(identity);
    const afterCase = afterCases.get(identity);
    assert(beforeCase && afterCase, `${identity} should exist before and after the replacement`);
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
    assertEqual(beforeCase.canonicalRowsHash, testCase.canonicalRowsHash.before, `${identity} before row hash should match`);
    assertEqual(afterCase.canonicalRowsHash, testCase.canonicalRowsHash.after, `${identity} after row hash should match`);
    assertEqual(testCase.canonicalRowsHash.changed, true, `${identity} should expose the changed interest-driven row path`);

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
    fixture.cases.some(testCase => testCase.metrics.summaryEndWealth.delta > 0)
        && fixture.cases.some(testCase => testCase.metrics.summaryEndWealth.delta < 0),
    'Interest replacement should expose both positive and negative wealth deltas across historical paths'
);
assert(
    fixture.cases.some(testCase => testCase.metrics.totalTax.delta !== 0)
        && fixture.cases.some(testCase => testCase.metrics.totalTax.delta === 0),
    'Tax deltas should be traceable as downstream portfolio effects rather than a tax embedded in the source'
);
console.log('✓ identities, outcomes, metrics and FlowDelta OK');

console.log('Test 3: marker-year application uses the current-year rate exactly once');
for (const marker of fixture.alignmentMarkers) {
    assertEqual(marker.sourceReturnPct, GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[marker.year], `${marker.year} marker should use the generated rate`);
    assertEqual(marker.activeMonteCarlo.sourceYear, marker.year, `${marker.year} Monte Carlo source year should align`);
    assertEqual(marker.activeMonteCarlo.interestPct, marker.sourceReturnPct, `${marker.year} Monte Carlo rate should align`);
    assertEqual(marker.targetExpectedInterest.sourceYear, marker.year, `${marker.year} backtest source year should align`);
    assertEqual(marker.targetExpectedInterest.valuePct, marker.sourceReturnPct, `${marker.year} backtest rate should align`);
    assertEqual(marker.legacyBacktestInterest.sourceYear, marker.year - 1, `${marker.year} legacy oracle should remain visibly lagged`);
}
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.returnConvention.compounding, 'no additional compounding in the data transform', 'Data transform should not compound twice');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.returnConvention.productCosts, 'excluded', 'Data transform should not deduct costs twice');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.returnConvention.taxes, 'excluded', 'Data transform should leave tax to the engine');
console.log('✓ marker-year accrual and tax/cost boundary OK');

console.log('✅ German cash/money-market backtest delta tests passed');
