import { viridis, computeHeatmapStats, renderHeatmapSVG, renderSweepHeatmapSVG } from '../app/simulator/simulator-heatmap.js';
import { aggregateSweepMetrics } from '../app/simulator/simulator-results.js';

console.log('--- Simulator Heatmap Tests ---');

// --- TEST 1: viridis endpoints ---
{
    assertEqual(viridis(0), 'rgb(68, 1, 84)', 'Viridis at 0 should match start color');
    assertEqual(viridis(1), 'rgb(253, 231, 37)', 'Viridis at 1 should match end color');
}

// --- TEST 2: computeHeatmapStats empty ---
{
    // Empty heatmap should short-circuit to zero stats.
    const stats = computeHeatmapStats([], [0, 4.5, 10], 10);
    assertEqual(stats.shares.length, 0, 'Empty heatmap should return empty shares');
    assertEqual(stats.globalP90, 0, 'Empty heatmap should have globalP90=0');
}

// --- TEST 3: computeHeatmapStats single value ---
{
    // One year, two bins: put all mass into bin 0 to get 100% share.
    const heat = [new Uint32Array([2, 0])];
    const stats = computeHeatmapStats(heat, [0, 4.5, 10], 2);
    assertClose(stats.globalP90, 1, 0.0001, 'Single-value heatmap should have globalP90=1');
    assertClose(stats.shares[0][0], 1, 0.0001, 'Share should be 1 for full bin');

    const exactBoundaryBin = computeHeatmapStats([new Uint32Array([0, 1])], [0, 4.5, 10], 1);
    assertClose(exactBoundaryBin.colSharesAbove45[0], 1, 0.0001, 'The bin starting at exactly 4.5 percent belongs to the bin-based >= overlay');
}

// --- TEST 4: renderHeatmapSVG cell mapping ---
{
    // 2 years x 2 bins -> 4 cells.
    const heat = [new Uint32Array([1, 1]), new Uint32Array([0, 2])];
    const bins = [0, 4.5, 10];
    const svg = renderHeatmapSVG(heat, bins, 2, { timeShareQuoteAbove45: 0.1 }, { showLegend: false, showFooterStats: false });
    const cellCount = (svg.match(/class="heatmap-cell"/g) || []).length;
    assertEqual(cellCount, 4, 'Heatmap should render one cell per year/bin');
    assert(svg.includes('realisierte Entnahmequote ≥ 4,5 % (bin-basiert)'), 'Heatmap header should name realized-rate basis and bin-based >= operator');
    assert(svg.includes('nur eine Berichtsreferenz') && svg.includes('keine Alarm- oder Guardrail-Schwelle'), 'Heatmap should state the reporting-only role visibly');
    assert(svg.includes('Realisierte Entnahmequote:'), 'Heatmap cell tooltip should name the realized withdrawal-rate basis');

    const svgWithFooter = renderHeatmapSVG(heat, bins, 2, { timeShareQuoteAbove45: 0.1 }, { showLegend: false, showFooterStats: true });
    assert(svgWithFooter.includes('realisierte Quote &gt; 4,5 %'), 'Heatmap footer should distinguish the strict overall KPI from the >= bin overlay');
}

// --- TEST 5: count/share input contract ---
{
    const countStats = computeHeatmapStats([new Uint32Array([1, 0])], [0, 4.5, 10], 100);
    assertClose(countStats.shares[0][0], 0.01, 0.0001, 'One heatmap count in 100 runs should render as one percent');

    const shareStats = computeHeatmapStats({
        schemaVersion: 'SimulatorHeatmapInputV1',
        valueKind: 'shares',
        values: [[0.25, 0.75]],
        denominator: null
    }, [0, 4.5, 10], 100);
    assertClose(shareStats.shares[0][0], 0.25, 0.0001, 'Versioned share input should preserve explicit shares');
    assertClose(shareStats.shares[0][1], 0.75, 0.0001, 'Versioned share input should not divide by the run denominator');
}

// --- TEST 6: renderSweepHeatmapSVG edge cases ---
{
    // Empty sweep should emit a placeholder message (no grid).
    const empty = renderSweepHeatmapSVG([], 'successProbFloor', 'targetEq', 'runwayMin', [], []);
    assert(empty.includes('Keine Sweep-Ergebnisse'), 'Empty sweep should show placeholder');

    const sweepResults = [
        {
            params: { targetEq: 60, runwayMin: 24 },
            metrics: aggregateSweepMetrics([
                {
                    finalVermoegen: 10000,
                    maxDrawdown: 20,
                    minRunway: 24,
                    failed: false
                }
            ], {
                commonRandomNumbers: true,
                randomPolicyVersion: 'SweepCommonRandomNumbersV2'
            })
        }
    ];
    const svg = renderSweepHeatmapSVG(sweepResults, 'successProbFloor', 'targetEq', 'runwayMin', [60], [24], { showLegend: false });
    const midColor = viridis(0.5);
    assert(svg.includes(midColor), 'Single-value sweep should use mid-color for zero range');
    assert(svg.includes('1 Lauf je Kombination'), 'Sweep heatmap should expose the singular run count');
    assert(svg.includes('Common Random Numbers: aktiv'), 'Sweep heatmap should expose active CRN comparison');
    assert(svg.includes('Quantilrankings sind experimentelle Punktschätzer'), 'Sweep heatmap should expose quantile uncertainty');

    const saturatedOutcomes = Array.from({ length: 200 }, (_, index) => ({
        finalVermoegen: index < 11 ? 0 : 10000,
        maxDrawdown: index < 11 ? 100 : 34,
        minRunway: index < 11 ? 0 : 24,
        failed: index < 11
    }));
    const saturated = renderSweepHeatmapSVG([
        {
            params: { targetEq: 60, runwayMin: 24 },
            metrics: aggregateSweepMetrics(saturatedOutcomes)
        }
    ], 'worst5Drawdown', 'targetEq', 'runwayMin', [60], [24], { showLegend: false });
    assert(
        saturated.includes('Drawdown-P95 ist durch terminale Ruine gesättigt'),
        'Sweep heatmap visibly explains a terminal-ruin-saturated drawdown metric'
    );

    const legacyOnly = renderSweepHeatmapSVG([
        {
            params: { targetEq: 60, runwayMin: 24 },
            metrics: { successProbFloor: 100 }
        }
    ], 'successProbFloor', 'targetEq', 'runwayMin', [60], [24], { showLegend: false });
    assert(
        legacyOnly.includes('veralteten oder unversionierten Ergebnisvertrag'),
        'Sweep heatmap should reject an unversioned metric shape with a migration hint'
    );
}

console.log('✅ Simulator heatmap tests passed');
console.log('--- Simulator Heatmap Tests Completed ---');
