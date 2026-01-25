import { viridis, computeHeatmapStats, renderHeatmapSVG, renderSweepHeatmapSVG } from '../simulator-heatmap.js';

console.log('--- Simulator Heatmap Tests ---');

// --- TEST 1: viridis endpoints ---
{
    assertEqual(viridis(0), 'rgb(68, 1, 84)', 'Viridis at 0 should match start color');
    assertEqual(viridis(1), 'rgb(253, 231, 37)', 'Viridis at 1 should match end color');
}

// --- TEST 2: computeHeatmapStats empty ---
{
    const stats = computeHeatmapStats([], [0, 4.5, 10], 10);
    assertEqual(stats.shares.length, 0, 'Empty heatmap should return empty shares');
    assertEqual(stats.globalP90, 0, 'Empty heatmap should have globalP90=0');
}

// --- TEST 3: computeHeatmapStats single value ---
{
    const heat = [new Uint32Array([2, 0])];
    const stats = computeHeatmapStats(heat, [0, 4.5, 10], 2);
    assertClose(stats.globalP90, 1, 0.0001, 'Single-value heatmap should have globalP90=1');
    assertClose(stats.shares[0][0], 1, 0.0001, 'Share should be 1 for full bin');
}

// --- TEST 4: renderHeatmapSVG cell mapping ---
{
    const heat = [new Uint32Array([1, 1]), new Uint32Array([0, 2])];
    const bins = [0, 4.5, 10];
    const svg = renderHeatmapSVG(heat, bins, 2, { timeShareQuoteAbove45: 0.1 }, { showLegend: false, showFooterStats: false });
    const cellCount = (svg.match(/class="heatmap-cell"/g) || []).length;
    assertEqual(cellCount, 4, 'Heatmap should render one cell per year/bin');
}

// --- TEST 5: renderSweepHeatmapSVG edge cases ---
{
    const empty = renderSweepHeatmapSVG([], 'successProbFloor', 'targetEq', 'runwayMin', [], []);
    assert(empty.includes('Keine Sweep-Ergebnisse'), 'Empty sweep should show placeholder');

    const sweepResults = [
        {
            params: { targetEq: 60, runwayMin: 24 },
            metrics: {
                successProbFloor: 0.95,
                p10EndWealth: 10000,
                worst5Drawdown: 0.2,
                minRunwayObserved: 24
            }
        }
    ];
    const svg = renderSweepHeatmapSVG(sweepResults, 'successProbFloor', 'targetEq', 'runwayMin', [60], [24], { showLegend: false });
    const midColor = viridis(0.5);
    assert(svg.includes(midColor), 'Single-value sweep should use mid-color for zero range');
}

console.log('✅ Simulator heatmap tests passed');
console.log('--- Simulator Heatmap Tests Completed ---');
