import fs from 'node:fs';

console.log('--- Slice 02 Risk Display Copy Contract Tests ---');

const read = relativePath => fs.readFileSync(new URL(`../${relativePath}`, import.meta.url), 'utf8');

const simulatorHtml = read('Simulator.html');
const resultsMetrics = read('app/simulator/results-metrics.js');
const heatmap = read('app/simulator/simulator-heatmap.js');
const autoMetrics = read('app/simulator/auto-optimize-metrics.js');
const autoEvaluate = read('app/simulator/auto-optimize-evaluate.js');
const autoRenderer = read('app/simulator/auto-optimize-renderer.js');
const scenarioAnalyzer = read('app/simulator/scenario-analyzer.js');

assert(
    resultsMetrics.includes('Zeitanteil realisierte Entnahmequote > 4,5 %')
        && resultsMetrics.includes('nur eine Berichtsreferenz')
        && resultsMetrics.includes('keine Alarm- oder Guardrail-Schwelle'),
    'Result cards should bind the 4.5-percent KPI to realized rate, strict > and reporting-only role'
);

assert(
    heatmap.includes('realisierte Entnahmequote ≥ 4,5 % (bin-basiert)')
        && heatmap.includes('nur eine Berichtsreferenz')
        && heatmap.includes('keine Alarm- oder Guardrail-Schwelle'),
    'Heatmap copy should bind the overlay to realized rate, bin-based >= and reporting-only role'
);

assert(
    simulatorHtml.includes('value="TimeShare_WR_gt_4_5"')
        && simulatorHtml.includes('id="ao_c_ts45"')
        && simulatorHtml.includes('Zeitanteil realisierte Entnahmequote &gt;')
        && simulatorHtml.includes('nur eine Berichtsreferenz')
        && simulatorHtml.includes('keine Alarm- oder Guardrail-Schwelle'),
    'Auto-Optimize configuration should retain stable controls while exposing basis, strict operator and role'
);

for (const [label, source] of [
    ['auto metric reader', autoMetrics],
    ['auto evaluator', autoEvaluate],
    ['auto result renderer', autoRenderer]
]) {
    assert(source.includes('timeShareWRgt45'), `${label} should retain the stable timeShareWRgt45 metric key`);
    assert(source.includes('realisierte Entnahmequote'), `${label} should use the realized withdrawal-rate label`);
    assert(source.includes('Berichtsreferenz'), `${label} should expose the reporting-reference role`);
}

assert(
    autoRenderer.includes('keine Alarm- oder Guardrail-Schwelle'),
    'Auto-Optimize result should visibly reject an alarm/guardrail interpretation'
);

assert(
    scenarioAnalyzer.includes("label: 'P10 des nominalen Endvermögens'"),
    'Scenario selector should name the P10 path selection criterion'
);

assert(
    resultsMetrics.includes("'Gruppenmedian-Differenz (nicht kausal)'"),
    'Care group comparison should state non-causality in the visible title'
);

console.log('--- Slice 02 Risk Display Copy Contract Tests Completed ---');
