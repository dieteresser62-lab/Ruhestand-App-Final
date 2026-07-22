import {
    buildCareMetrics,
    buildKpiDashboard,
    buildStressMetrics,
    buildSummaryData,
    prepareMonteCarloViewModel
} from '../app/simulator/results-metrics.js';
import { buildMonteCarloOutcomeInventoryV1 } from '../app/simulator/monte-carlo-chunk-result.js';

console.log('--- Results Metrics UI Contract Tests ---');

const outcomeSummary = buildSummaryData({
    results: {
        outcomeInventory: {
            schemaVersion: 'MonteCarloOutcomeInventoryV1',
            requestedRuns: 4,
            ruin: 1,
            all_dead: 1,
            horizon_exhausted: 1,
            technical_error: 1,
            floorCoveragePct: null
        }
    },
    totalRuns: 4,
    failCount: 1
});
assertEqual(outcomeSummary[0].title, 'Floor-Deckung im gewählten Horizont', 'Summary should use the reviewed floor-coverage label');
assertEqual(outcomeSummary[0].value, '—', 'Technical path should suppress floor coverage in the UI');
assert(outcomeSummary[1].value.includes('Ruin 1') && outcomeSummary[1].value.includes('Technik 1'), 'Summary should keep the terminal outcome inventory visible');

const uncertainSummary = buildSummaryData({
    results: {
        outcomeInventory: buildMonteCarloOutcomeInventoryV1({
            requestedRuns: 4,
            ruin: 1,
            all_dead: 1,
            horizon_exhausted: 2,
            technical_error: 0
        })
    },
    totalRuns: 4,
    failCount: 1
});
assert(uncertainSummary[0].value.includes('95%-KI'), 'Floor-coverage card should show the Wilson interval');
assert(uncertainSummary[0].description.includes('Simulationsfehler, nicht Modellrisiko'), 'Floor-coverage tooltip should state the interval interpretation limit');
assert(uncertainSummary[0].description.includes('Unsicherheitswarnung'), 'Small batches should show a visible uncertainty warning');
assertEqual(uncertainSummary[0].tone, 'warning', 'Small-sample floor coverage should not be styled as precise success');

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

const withdrawalDashboard = buildKpiDashboard({
    depotErschoepfungsQuote: 0,
    realWithdrawalP10: {
        realEur: 12000,
        p50RealEur: 18000,
        sampleSize: 8,
        excludedRuns: 2,
        missingness: { died_before_first_obligation: 1, technical_error: 1 }
    }
});
const withdrawalKpi = withdrawalDashboard.detailSections
    .flatMap(section => section.kpis)
    .find(kpi => kpi.title === 'Reale Depotentnahme P10');
assert(withdrawalKpi.value.includes('10.000'), 'Run-based real withdrawal P10 should render with the established rounded-euro formatter');
assert(withdrawalKpi.description.includes('Stichprobe: 8 Läufe'), 'Withdrawal P10 tooltip should expose evaluable run count');
assert(withdrawalKpi.description.includes('Technik 1'), 'Withdrawal P10 tooltip should expose technical missingness');
assert(withdrawalKpi.description.includes('Kein Quantil-Konfidenzintervall'), 'Withdrawal P10 tooltip should not imply an unimplemented interval');

const canonicalWithdrawalView = prepareMonteCarloViewModel({
    results: {
        realWithdrawalP10: { realEur: 12000 },
        extraKPI: { consumptionAtRiskP10Real: 99999 }
    },
    totalRuns: 1,
    failCount: 0,
    inputs: {}
});
assertEqual(canonicalWithdrawalView.carThreshold, 12000, 'scenario threshold uses the canonical real-withdrawal KPI');
const removedAliasView = prepareMonteCarloViewModel({
    results: { extraKPI: { consumptionAtRiskP10Real: 99999 } },
    totalRuns: 1,
    failCount: 0,
    inputs: {}
});
assertEqual(removedAliasView.carThreshold, undefined, 'UI no longer reads the removed consumption-at-risk alias');

const stressMetrics = buildStressMetrics({
    presetKey: 'GREAT_DEPRESSION_29_33',
    years: 5,
    maxDD: { p50: 10, p90: 20 },
    timeShareAbove45: { p50: 40 },
    cutYears: { p50: 2 },
    realWithdrawalP10: { realEur: 7000, p50RealEur: 9000, sampleSize: 7 },
    recoveryYears: { p50: 3 }
});
const stressWithdrawal = stressMetrics.kpis.find(kpi => kpi.title === 'Reale Depotentnahme P10 (Stress)');
assert(stressWithdrawal.value.includes('7.000'), 'Stress withdrawal P10 should use the canonical across-run P10 field and established rounded-euro formatter');
assert(stressWithdrawal.description.includes('Stichprobe: 7 Läufe'), 'Stress withdrawal tooltip should expose sample size');
assert(stressWithdrawal.description.includes('9.000'), 'Stress withdrawal tooltip should expose the median run P10 separately');

const careMetrics = buildCareMetrics({
    extraKPI: {
        pflege: {
            p1: {
                entryRatePct: 25,
                entryRateNumerator: 1,
                entryRateDenominator: 4,
                entryAgeP50: 72,
                careYearsP50: 3,
                realCostEurP50: 12000,
                sampleSize: 1
            },
            p2: {
                entryRatePct: 0,
                entryRateNumerator: 0,
                entryRateDenominator: 4,
                entryAgeP50: null,
                careYearsP50: null,
                realCostEurP50: null,
                sampleSize: 0,
                missingness: 'no_observations'
            },
            household: {
                careYearsOverlapP50: 0,
                maxAnnualAdditionalNeedRealEurP50: 12000,
                totalAdditionalNeedRealEurP50: 30000,
                shortfallRateWithCarePct: 0,
                shortfallRateWithoutCarePct: 10,
                endWealthWithCareRealEurP50: 700000,
                endWealthNoCareRealEurP50: 800000,
                sampleSize: 1,
                noCareSampleSize: 3
            },
            comparison: {
                endWealthNoCareMinusCareRealEur: 100000,
                method: 'unpaired_group_median_difference'
            }
        }
    }
}, {
    pflegefallLogikAktivieren: true,
    partner: { aktiv: true }
});
const careCard = title => careMetrics.cards.find(card => card.title === title);
assert(careCard('Pflegefall-Eintrittsquote P1')?.value === '25,0 %', 'P1 entry rate should render as a percentage');
assert(careCard('Median Eintrittsalter P2')?.value === '—', 'Empty P2 entry-age distribution should render as an em dash');
assert(careCard('Median Pflegejahre P2')?.value === '—', 'Empty P2 care-years distribution should render as an em dash');
assert(careCard('Realer Pflege-Mehrbedarf P2 (Median)')?.value === '—', 'Empty P2 real-cost distribution should render as an em dash');
assert(careCard('Median Jahre beide in Pflege')?.value === '0,0 Jahre', 'Observed zero simultaneous-care years should remain distinguishable from missingness');
assert(careCard('Max. jährlicher Pflege-Mehrbedarf (real)')?.description.includes('P1 + P2'), 'Annual household care need should document the summed persons');
assert(!careMetrics.cards.some(card => card.title.includes('Depot')), 'Care KPI cards must not claim a depot-financed care amount');
assert(careCard('Gruppenmedian-Differenz ohne minus mit Pflege')?.value.includes('100.000'), 'Care comparison should use no-care minus care sign convention');
assert(careCard('Gruppenmedian-Differenz ohne minus mit Pflege')?.description.includes('nicht-kausaler'), 'Care comparison should disclose the unpaired non-causal method');

console.log('--- Results Metrics UI Contract Tests Completed ---');
