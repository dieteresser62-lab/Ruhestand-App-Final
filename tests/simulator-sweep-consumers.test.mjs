import { aggregateSweepMetrics } from '../app/simulator/simulator-results.js';

console.log('--- Sweep Metric Consumer Contract Tests ---');

if (typeof global.window === 'undefined') {
    global.window = {};
}
if (typeof global.document === 'undefined') {
    global.document = {
        addEventListener() {},
        getElementById() {
            return null;
        }
    };
}

const {
    findBestParameters,
    findBestParametersMultiObjective,
    findBestParametersWithConstraints
} = await import('../app/simulator/simulator-optimizer.js');
const {
    calculateParetoFrontier,
    renderParetoFrontier
} = await import('../app/simulator/simulator-visualization.js');

function buildResult(id, {
    successProbFloor,
    medianEndWealth,
    worst5Drawdown
}) {
    const runCount = 20;
    const failureCount = Math.round(runCount * (1 - successProbFloor / 100));
    const outcomes = Array.from({ length: runCount }, (_, index) => ({
        finalVermoegen: medianEndWealth,
        maxDrawdown: worst5Drawdown,
        minRunway: 24,
        failed: index < failureCount
    }));
    return {
        params: { id },
        metrics: aggregateSweepMetrics(outcomes, {
            commonRandomNumbers: true,
            randomPolicyVersion: 'SweepCommonRandomNumbersV2'
        })
    };
}

const conservative = buildResult('conservative', {
    successProbFloor: 100,
    medianEndWealth: 100000,
    worst5Drawdown: 20
});
const aggressive = buildResult('aggressive', {
    successProbFloor: 80,
    medianEndWealth: 200000,
    worst5Drawdown: 50
});
const unversioned = {
    params: { id: 'legacy' },
    metrics: {
        successProbFloor: 100,
        medianEndWealth: 999999,
        worst5Drawdown: 0
    }
};
const saturatedOutcomes = Array.from({ length: 200 }, (_, index) => ({
    finalVermoegen: index < 11 ? 0 : 100000,
    maxDrawdown: index < 11 ? 100 : 34,
    minRunway: index < 11 ? 0 : 24,
    failed: index < 11
}));
const saturatedLowWealth = {
    params: { id: 'saturated-low' },
    metrics: aggregateSweepMetrics(saturatedOutcomes)
};
const saturatedHighWealth = {
    params: { id: 'saturated-high' },
    metrics: aggregateSweepMetrics(saturatedOutcomes.map(outcome => ({
        ...outcome,
        finalVermoegen: outcome.failed ? 0 : 200000
    })))
};

{
    const leading = findBestParameters(
        [conservative, aggressive, unversioned],
        'medianEndWealth',
        true
    );
    assertEqual(leading.params.id, 'aggressive', 'Parameter comparison consumes only canonical versioned metrics');
}

{
    const indeterminate = findBestParameters(
        [saturatedLowWealth, saturatedHighWealth],
        'worst5Drawdown',
        false
    );
    assertEqual(indeterminate.params, null, 'A saturated tied metric does not select the first combination by array order');
    assertEqual(
        indeterminate.rankingDiagnostics.status,
        'indeterminate_tie',
        'A saturated tied metric exposes an indeterminate ranking'
    );
    assertEqual(indeterminate.rankingDiagnostics.tiedBestCount, 2, 'The ranking diagnostics expose every tied combination');
}

{
    const constrained = findBestParametersWithConstraints(
        [conservative, aggressive, unversioned],
        'medianEndWealth',
        true,
        [
            { metricKey: 'successProbFloor', operator: '>=', value: 95 },
            { metricKey: 'worst5Drawdown', operator: '<=', value: 25 }
        ]
    );
    assertEqual(constrained.params.id, 'conservative', 'Constraint consumer reads objective and constraints from the same canonical shape');
    assertEqual(constrained.feasibleCount, 1, 'Unversioned metrics cannot pass constraints by missing-value coercion');
}

{
    const multi = findBestParametersMultiObjective(
        [conservative, aggressive, unversioned],
        [
            { metricKey: 'medianEndWealth', weight: 0.5, maximize: true },
            { metricKey: 'worst5Drawdown', weight: 0.5, maximize: false }
        ]
    );
    assertEqual(
        multi.params,
        null,
        'A tied multi-objective point estimate excludes unversioned metrics without selecting by array order'
    );
    assertEqual(
        multi.rankingDiagnostics.tiedBestCount,
        2,
        'Multi-objective comparison reports both tied canonical results'
    );
}

{
    const frontier = calculateParetoFrontier(
        [conservative, aggressive, unversioned],
        'medianEndWealth',
        'worst5Drawdown',
        true,
        false
    );
    assertEqual(frontier.length, 2, 'Pareto consumer excludes the unversioned result');
    assert(!frontier.some(point => point.params.id === 'legacy'), 'Pareto consumer never emits an unversioned point');

    const svg = renderParetoFrontier(
        frontier,
        [conservative, aggressive, unversioned],
        'medianEndWealth',
        'worst5Drawdown'
    );
    assert(!svg.includes('NaN'), 'Pareto renderer keeps versioned finite coordinates');

    const saturatedFrontier = calculateParetoFrontier(
        [saturatedLowWealth, saturatedHighWealth],
        'medianEndWealth',
        'worst5Drawdown',
        true,
        false
    );
    const saturatedSvg = renderParetoFrontier(
        saturatedFrontier,
        [saturatedLowWealth, saturatedHighWealth],
        'medianEndWealth',
        'worst5Drawdown'
    );
    assert(
        saturatedSvg.includes('Drawdown-P95 ist durch terminale Ruine gesättigt'),
        'Pareto renderer visibly explains a terminal-ruin-saturated objective'
    );
}

console.log('--- Sweep Metric Consumer Contract Tests Completed ---');
