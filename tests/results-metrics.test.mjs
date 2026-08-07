import {
    buildCareMetrics,
    buildKpiDashboard,
    buildStressMetrics,
    buildSummaryData,
    prepareMonteCarloViewModel,
    WITHDRAWAL_RATE_REPORTING_REFERENCE_NOTICE
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

const exactTaxSummary = buildSummaryData({
    results: { taxOutcomes: { p50: 12345678.9 } },
    totalRuns: 1,
    failCount: 0
});
const exactTaxCard = exactTaxSummary.find(card => card.title === 'Median Steuern');
assertEqual(exactTaxCard?.value, '12.345.678,90 €', 'Tax cost median should remain cent-exact on the visible card');
assert(exactTaxCard?.decisionCritical === true, 'Tax cost median should remain visible in simple mode');

const conservativeSummary = buildSummaryData({
    results: {
        finalOutcomes: {
            p10: 55000.009,
            p50: 487501.009,
            p50_successful: 212500.009,
            p90: 490000.009,
            distribution: { sampleSize: 4 },
            successfulCount: 3,
            successfulMissingness: null
        },
        taxOutcomes: { p50: 12.341 }
    },
    totalRuns: 4,
    failCount: 0
});
assertEqual(conservativeSummary.find(card => card.title === 'Median (alle)')?.value, '487.501,00 €', 'All-run median should avoid coarse 25,000-euro rounding and conservatively floor benefit cents');
assertEqual(conservativeSummary.find(card => card.title === 'Median (erfolgreiche)')?.value, '212.500,00 €', 'Successful median should avoid optimistic coarse rounding');
assertEqual(conservativeSummary.find(card => card.title === '10%/90% Perzentil')?.value, '55.000,00 € / 490.000,00 €', 'P10/P90 benefit values should remain cent-precise and never round upward');
assertEqual(conservativeSummary.find(card => card.title === 'Median Steuern')?.value, '12,35 €', 'Tax cost should conservatively ceil fractions beyond a cent');

const missingTaxCard = buildSummaryData({
    results: { taxOutcomes: { p50: '123.45', applicability: { applicable: false, reason: 'not_applicable' } } },
    totalRuns: 1,
    failCount: 0
}).find(card => card.title === 'Median Steuern');
assertEqual(missingTaxCard?.value, '—', 'Tax median should reject non-numeric or inapplicable aggregate values instead of coercing them');
assert(missingTaxCard?.statusLine.includes('not_applicable') && missingTaxCard.statusLine.includes('Beobachtungen: unbekannt'), 'Missing tax median should expose stable reason without inventing an observation count');

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
    maxDrawdowns: {
        p50: 34.25,
        p90: 48.125,
        distribution: { sampleSize: 8, missingness: { technical_error: 0 } }
    },
    realMaxDrawdowns: {
        p50: 35.5,
        p90: 51.75,
        distribution: { sampleSize: 8, missingness: { technical_error: 0 } },
        missingness: { missing_inflation: 0, no_observations: 0, technical_error: 0 },
        observationCount: { observedPaths: 8, pathPointsAvailable: 160 }
    },
    realWithdrawalP10: {
        realEur: 12345.67,
        p50RealEur: 19876.54,
        sampleSize: 8,
        excludedRuns: 0,
        missingness: { died_before_first_obligation: 0, technical_error: 0 }
    },
    extraKPI: {
        timeShareQuoteAbove45: 0.0125,
        lossCarryTaxSavings: { perRunMean: 331.01 }
    }
});
const withdrawalKpi = withdrawalDashboard.primary
    .find(kpi => kpi.title === 'Reale Depotentnahme P10');
assertEqual(withdrawalKpi.value, '12.345,67 €', 'Run-based real withdrawal P10 should be cent-exact instead of coarsely rounded');
assertEqual(withdrawalKpi.secondaryValue, '19.876,54 €', 'Median of run-P10 withdrawals should be a second visible cent-exact value');
assert(withdrawalKpi.description.includes('Beobachtete Läufe: 8'), 'Withdrawal P10 description should expose evaluable run count');
assert(withdrawalKpi.description.includes('Kein Quantil-Konfidenzintervall'), 'Withdrawal P10 tooltip should not imply an unimplemented interval');
assert(withdrawalKpi.layout === 'exact-risk' && withdrawalKpi.decisionCritical === true, 'Withdrawal exact values should use the non-clipping primary-card layout');

const lossCarryKpi = withdrawalDashboard.primary.find(kpi => kpi.title === 'Ø Steuerersparnis Verlustvortrag');
assertEqual(lossCarryKpi?.value, '331,01 €', 'Positive small loss-carry savings must remain visible instead of rounding to zero');

const inapplicableDecisionDashboard = buildKpiDashboard({
    depotErschoepfungsQuote: 0,
    realWithdrawalP10: {
        realEur: 12345.67,
        p50RealEur: 19876.54,
        sampleSize: 8,
        applicability: { applicable: false, reason: 'not_applicable' }
    },
    extraKPI: {
        lossCarryTaxSavings: {
            perRunMean: 331.01,
            applicability: { applicable: false, reason: 'not_applicable' }
        }
    }
});
const inapplicableWithdrawal = inapplicableDecisionDashboard.primary.find(kpi => kpi.title === 'Reale Depotentnahme P10');
const inapplicableLossCarry = inapplicableDecisionDashboard.primary.find(kpi => kpi.title === 'Ø Steuerersparnis Verlustvortrag');
assertEqual(inapplicableWithdrawal?.value, '—', 'Applicability reason should suppress a finite withdrawal P10 value');
assertEqual(inapplicableWithdrawal?.secondaryValue, '—', 'Applicability reason should suppress a finite withdrawal median value');
assert(inapplicableWithdrawal?.statusLine.includes('not_applicable') && inapplicableWithdrawal.statusLine.includes('Beobachtungen: 8'), 'Inapplicable withdrawal should expose stable reason and observation count');
assertEqual(inapplicableLossCarry?.value, '—', 'Applicability reason should suppress a finite loss-carry value');
assert(inapplicableLossCarry?.statusLine.includes('not_applicable') && inapplicableLossCarry.statusLine.includes('Beobachtungen: unbekannt'), 'Inapplicable loss-carry value should not invent an observation count');

const conservativelyRoundedDecisionDashboard = buildKpiDashboard({
    depotErschoepfungsQuote: 0,
    realWithdrawalP10: {
        realEur: 12345.679,
        p50RealEur: 19876.549,
        sampleSize: 8,
        excludedRuns: 0
    },
    extraKPI: { lossCarryTaxSavings: { perRunMean: 331.019 } }
});
assertEqual(conservativelyRoundedDecisionDashboard.primary.find(kpi => kpi.title === 'Reale Depotentnahme P10')?.value, '12.345,67 €', 'Withdrawal benefit should conservatively floor fractions beyond a cent');
assertEqual(conservativelyRoundedDecisionDashboard.primary.find(kpi => kpi.title === 'Reale Depotentnahme P10')?.secondaryValue, '19.876,54 €', 'Run-P10 median benefit should conservatively floor fractions beyond a cent');
assertEqual(conservativelyRoundedDecisionDashboard.primary.find(kpi => kpi.title === 'Ø Steuerersparnis Verlustvortrag')?.value, '331,01 €', 'Loss-carry benefit should conservatively floor fractions beyond a cent');

const nominalMedianDrawdown = withdrawalDashboard.drawdownKpis.find(kpi => kpi.title === 'Max. Drawdown nominal (Median)');
const realMedianDrawdown = withdrawalDashboard.drawdownKpis.find(kpi => kpi.title === 'Max. Drawdown real (Median)');
assertEqual(nominalMedianDrawdown?.value, '34,25 %', 'Nominal drawdown should expose at least two decimals from the aggregate');
assertEqual(realMedianDrawdown?.value, '35,50 %', 'Real drawdown should expose at least two decimals from the aggregate');
assert(nominalMedianDrawdown?.description.includes('Nominaler') && realMedianDrawdown?.description.includes('Preisen des Simulationsstarts'), 'Drawdown cards should visibly distinguish nominal and real price bases');
assert(withdrawalDashboard.drawdownKpis.indexOf(realMedianDrawdown) === withdrawalDashboard.drawdownKpis.indexOf(nominalMedianDrawdown) + 1, 'Nominal and real median drawdowns should be adjacent in the dedicated pair grid');

const withdrawalRateKpi = withdrawalDashboard.detailSections
    .flatMap(section => section.kpis)
    .find(kpi => kpi.title.includes('Entnahmequote'));
assert(withdrawalRateKpi?.title.includes('realisierte Entnahmequote > 4,5 %'), 'Result KPI should name the realized withdrawal-rate basis and strict operator');
assert(withdrawalRateKpi?.description.includes('Berichtsreferenz') && withdrawalRateKpi.description.includes('keine Alarm- oder Guardrail-Schwelle'), 'Result KPI should state the reporting-only role');
assertEqual(withdrawalDashboard.reportingReferenceNotice, WITHDRAWAL_RATE_REPORTING_REFERENCE_NOTICE, 'Dashboard should provide an always-visible reporting-role notice');

for (const [input, expected] of [[0, '0,00 %'], [34.25, '34,25 %'], [100, '100,00 %']]) {
    const card = buildKpiDashboard({
        depotErschoepfungsQuote: 0,
        maxDrawdowns: { p50: input, p90: input, distribution: { sampleSize: 1 } },
        realMaxDrawdowns: { p50: input, p90: input, distribution: { sampleSize: 1 }, observationCount: { observedPaths: 1 } }
    }).drawdownKpis.find(kpi => kpi.title === 'Max. Drawdown nominal (Median)');
    assertEqual(card?.value, expected, `Drawdown domain value ${input} should remain valid without recomputation`);
}

const conservativelyRoundedDrawdown = buildKpiDashboard({
    depotErschoepfungsQuote: 0,
    maxDrawdowns: { p50: 34.2549, p90: 34.2549, distribution: { sampleSize: 1 } }
}).drawdownKpis.find(kpi => kpi.title === 'Max. Drawdown nominal (Median)');
assertEqual(conservativelyRoundedDrawdown?.value, '34,26 %', 'Drawdown loss should conservatively ceil precision beyond two decimals');

for (const input of [-0.01, -34.25, 100.01, Number.POSITIVE_INFINITY, Number.NaN]) {
    const card = buildKpiDashboard({
        depotErschoepfungsQuote: 0,
        maxDrawdowns: { p50: input, p90: input, distribution: { sampleSize: 1 } }
    }).drawdownKpis.find(kpi => kpi.title === 'Max. Drawdown nominal (Median)');
    assertEqual(card?.value, '—', `Invalid drawdown ${String(input)} should fail closed instead of being repaired`);
    assert(card?.statusLine.includes(Number.isFinite(input) ? 'invalid_drawdown_domain' : 'invalid_non_finite'), 'Invalid drawdown should expose a stable reason');
}

const missingRealDrawdown = buildKpiDashboard({
    depotErschoepfungsQuote: 0,
    realMaxDrawdowns: {
        p50: null,
        p90: null,
        distribution: { sampleSize: 0, missingness: { missing_inflation: 2 } },
        missingness: { missing_inflation: 2 },
        observationCount: { observedPaths: 0 }
    }
}).drawdownKpis.find(kpi => kpi.title === 'Max. Drawdown real (Median)');
assertEqual(missingRealDrawdown?.value, '—', 'Missing real drawdown should never become numeric zero');
assert(missingRealDrawdown?.statusLine.includes('missing_inflation') && missingRealDrawdown.statusLine.includes('Beobachtungen: 0'), 'Missing real drawdown should expose stable reason and observation count');

const dominantMissingnessDrawdown = buildKpiDashboard({
    depotErschoepfungsQuote: 0,
    realMaxDrawdowns: {
        p50: null,
        p90: null,
        distribution: { sampleSize: 0, missingness: { missing_inflation: 1, technical_error: 999 } },
        observationCount: { observedPaths: 0 }
    }
}).drawdownKpis.find(kpi => kpi.title === 'Max. Drawdown real (Median)');
assert(dominantMissingnessDrawdown?.statusLine.includes('Grund: technical_error'), 'Missingness status should report the dominant counted reason rather than object insertion order');

const inapplicableDrawdown = buildKpiDashboard({
    depotErschoepfungsQuote: 0,
    maxDrawdowns: {
        p50: 34.25,
        p90: 48.125,
        applicability: { applicable: false, reason: 'not_applicable' },
        distribution: { sampleSize: 8 }
    }
}).drawdownKpis.find(kpi => kpi.title === 'Max. Drawdown nominal (Median)');
assertEqual(inapplicableDrawdown?.value, '—', 'Applicability reason should suppress even an otherwise finite drawdown value');
assert(inapplicableDrawdown?.statusLine.includes('not_applicable') && inapplicableDrawdown.statusLine.includes('Beobachtungen: 8'), 'Inapplicable drawdown should expose stable reason and observation count');

const unknownWithdrawalRateKpi = dashboard.detailSections
    .flatMap(section => section.kpis)
    .find(kpi => kpi.title.includes('Entnahmequote'));
assertEqual(unknownWithdrawalRateKpi?.value, '—', 'Missing withdrawal-rate reporting KPI should render as unavailable');
assert(unknownWithdrawalRateKpi?.statusLine.includes('Beobachtungen: unbekannt Jahre'), 'Missing withdrawal-rate reporting KPI should not invent zero observed years');

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
    realWithdrawalP10: { realEur: 7123.45, p50RealEur: 9456.78, sampleSize: 7 },
    recoveryYears: { p50: 3 }
});
const stressWithdrawal = stressMetrics.kpis.find(kpi => kpi.title === 'Reale Depotentnahme P10 (Stress)');
assertEqual(stressWithdrawal.value, '7.123,45 €', 'Stress withdrawal P10 should use the canonical across-run P10 field cent-exactly');
assert(stressWithdrawal.description.includes('Stichprobe: 7 Läufe'), 'Stress withdrawal tooltip should expose sample size');
assertEqual(stressWithdrawal.secondaryValue, '9.456,78 €', 'Stress median run-P10 should remain separately and visibly cent-exact');
const stressRate = stressMetrics.kpis.find(kpi => kpi.title.includes('Entnahmequote'));
assert(stressRate?.title.includes('> 4,5 %') && stressRate.description.includes('Berichtsreferenz'), 'Stress KPI should retain strict realized-rate and reporting-role copy');

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
assert(careCard('Gruppenmedian-Differenz (nicht kausal)')?.value.includes('100.000'), 'Care comparison should use no-care minus care sign convention');
assert(careCard('Gruppenmedian-Differenz (nicht kausal)')?.description.includes('nicht kausaler'), 'Care comparison should disclose the unpaired non-causal method visibly');

console.log('--- Results Metrics UI Contract Tests Completed ---');
