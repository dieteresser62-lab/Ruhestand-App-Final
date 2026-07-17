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

console.log('--- Results Metrics UI Contract Tests Completed ---');
