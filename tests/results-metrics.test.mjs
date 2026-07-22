import { buildKpiDashboard } from '../app/simulator/results-metrics.js';

console.log('--- Results Metrics UI Contract Tests ---');

const dashboard = buildKpiDashboard({
    depotErschoepfungsQuote: 12.34,
    alterBeiErschoepfung: { p50: 81 }
});

const depletionKpi = dashboard.primary.find(kpi => kpi.title.includes('Aktien/Gold'));
assert(Boolean(depletionKpi), 'Dashboard should expose the precise ruin/depot-rest KPI');
assert(
    depletionKpi.title === 'Ruin oder Aktien/Gold ≤ 100 €',
    'Primary KPI title should name ruin, the asset subset and the threshold'
);
assert(depletionKpi.value === '12,3 %', 'Primary KPI should keep the existing percentage formatting');
assert(depletionKpi.tone === 'warning', 'Primary KPI should keep the existing warning threshold');
assert(depletionKpi.description.includes('`isRuin`'), 'Description should name the technical ruin trigger');
assert(
    depletionKpi.description.includes('Aktien-plus-Gold-Endbestand von höchstens 100 €'),
    'Description should name the asset subset and threshold'
);
assert(
    depletionKpi.description.includes('Freie Liquidität') && depletionKpi.description.includes('Pflegebucket'),
    'Description should name holdings excluded from the 100-euro threshold'
);
assert(
    !depletionKpi.description.includes('vollständig aufgebraucht'),
    'Description should not claim complete wealth depletion'
);

const operativeDetails = dashboard.detailSections.find(section => section.title === 'Operative Details');
const depletionAgeKpi = operativeDetails?.kpis.find(kpi => kpi.title.includes('Aktien/Gold'));
assert(Boolean(depletionAgeKpi), 'Operative details should expose the matching age KPI');
assert(
    depletionAgeKpi.title === 'Median-Alter: Ruin oder Aktien/Gold ≤ 100 €',
    'Age KPI title should use the same precise trigger wording'
);
assert(depletionAgeKpi.value === '81,0 Jahre', 'Age KPI should keep the existing value formatting');
assert(depletionAgeKpi.description.includes('`isRuin`'), 'Age KPI should name the technical ruin trigger');
assert(
    depletionAgeKpi.description.includes('Aktien-plus-Gold-Bestand von höchstens 100 €'),
    'Age KPI should name the matching asset subset and threshold'
);

assert(
    buildKpiDashboard({ depotErschoepfungsQuote: 5 }).primary[1].tone === 'success',
    'Depletion tone should remain successful through five percent'
);
assert(
    buildKpiDashboard({ depotErschoepfungsQuote: 20 }).primary[1].tone === 'warning',
    'Depletion tone should remain warning through twenty percent'
);
assert(
    buildKpiDashboard({ depotErschoepfungsQuote: 20.01 }).primary[1].tone === 'danger',
    'Depletion tone should remain dangerous above twenty percent'
);

const cutDashboard = buildKpiDashboard({
    depotErschoepfungsQuote: 0,
    cutYearSharePct: { p50: 50, sampleSize: 4, excludedRuns: 1 }
});
const cutKpi = cutDashboard.primary.find(kpi => kpi.title.includes('Kürzungsjahre'));
assert(cutKpi?.title === 'Anteil Kürzungsjahre (≥ 10 %)', 'Cut-share title should use the inclusive ten-percent threshold');
assert(cutKpi?.value === '50,0 %', 'Observed cut share should render as percent');
assert(cutKpi?.description.includes('abgeschlossener Dekumulationsjahre'), 'Cut-share tooltip should name the denominator population');
assert(cutKpi?.description.includes('Stichprobe: 4 Läufe'), 'Cut-share tooltip should expose sample size');

const emptyCutKpi = buildKpiDashboard({
    depotErschoepfungsQuote: 0,
    cutYearSharePct: { p50: null, sampleSize: 0, excludedRuns: 2 }
}).primary.find(kpi => kpi.title.includes('Kürzungsjahre'));
assert(emptyCutKpi?.value === '—', 'Missing cut-share distribution should render as an em dash, not zero or NaN');

const volatilityKpi = buildKpiDashboard({
    depotErschoepfungsQuote: 0,
    volatilities: { p50: 14.142 }
}).detailSections.flatMap(section => section.kpis).find(kpi => kpi.title.includes('Portfoliovolatilität'));
assert(volatilityKpi?.description.includes('(N-1)'), 'Volatility tooltip should document sample standard deviation');
assert(volatilityKpi?.description.includes('keine zusätzliche Annualisierung'), 'Volatility tooltip should document annual frequency semantics');

console.log('--- Results Metrics UI Contract Tests Completed ---');
