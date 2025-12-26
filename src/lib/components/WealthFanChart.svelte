<script lang="ts">
    import type { MonteCarloResult } from '$lib/types/rust-engine';

    export let result: MonteCarloResult;
    export let startWealth: number;
    export let years: number;

    // Simplified Fan Chart Data
    // In production, you'd collect yearly percentiles from MC
    $: fanData = generateFanData(startWealth, result, years);

    function generateFanData(start: number, r: MonteCarloResult, y: number) {
        // Linear interpolation from start to final percentiles
        // Real implementation should collect yearly snapshots
        const data = [];
        for (let i = 0; i <= y; i++) {
            const progress = i / y;
            data.push({
                year: i,
                p5: start + (r.percentile5 - start) * progress,
                p25: start + (r.percentile25 - start) * progress,
                median: start + (r.medianFinalWealth - start) * progress,
                p75: start + (r.percentile75 - start) * progress,
                p95: start + (r.percentile95 - start) * progress,
            });
        }
        return data;
    }
</script>

<div class="fan-chart">
    <svg viewBox="0 0 400 200">
        <!-- Simplified SVG chart -->
        <!-- In production, use Chart.js or D3 -->
        <rect width="400" height="200" fill="#f8f9fa" />
        <text x="200" y="20" text-anchor="middle" font-size="12" font-weight="bold">
            Vermögensentwicklung (30 Jahre)
        </text>

        <!-- Fan bands would be drawn here - Placeholder -->
         <path d="M 50,150 Q 200,50 350,100" stroke="#2196F3" stroke-width="2" fill="none" />

        <text x="200" y="100" text-anchor="middle" font-size="10" fill="#666">
            [Chart-Visualisierung hier einfügen]
        </text>
        <text x="200" y="120" text-anchor="middle" font-size="10" fill="#666">
            Median: €{result.medianFinalWealth.toLocaleString('de-DE', {maximumFractionDigits: 0})}
        </text>
    </svg>
</div>

<style>
    .fan-chart {
        width: 100%;
        max-width: 600px;
        margin: 1rem 0;
    }

    svg {
        width: 100%;
        height: auto;
        background: white;
        border-radius: 8px;
        border: 1px solid #eee;
    }
</style>
