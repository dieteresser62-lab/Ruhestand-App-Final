import {
    renderStressReplayComparisonV1,
    renderStressReplayPatchPreviewV1,
    renderStressReplayVariantListV1
} from '../app/simulator/stress-replay-renderer.js';
import { createStressReplayController } from '../app/simulator/stress-replay-ui.js';

function variant(id, role = 'alternative', groups = ['dynamicFlex']) {
    return { id, role, label: id === 'baseline' ? 'Baseline' : `Variante ${id}`, materialChangeGroups: groups };
}

function result(variantId, nominalValueEur) {
    return {
        variantId,
        yearResults: [{
            yearIndex: 0,
            historicalYear: 2001,
            nominalValueEur
        }]
    };
}

function deathResult(variantId, financialValueEur, deathValueEur, deathYearIndex) {
    return {
        variantId,
        yearResults: [
            {
                yearIndex: 0,
                historicalYear: 2001,
                status: deathYearIndex === 0 ? 'terminal_death' : 'financial_year',
                nominalValueEur: financialValueEur
            },
            ...(deathYearIndex === 1 ? [{
                yearIndex: 1,
                historicalYear: 2002,
                status: 'terminal_death',
                nominalValueEur: deathValueEur,
                withdrawalEur: null,
                taxEur: null
            }] : [])
        ]
    };
}

const baselineEntry = {
    variantId: 'baseline', role: 'baseline', label: 'Baseline', terminalStatus: 'horizon_exhausted',
    summary: {
        finalValueNominalEur: 100000, finalValueRealEur: 90000,
        maximumDrawdownNominalPct: 10, maximumDrawdownRealPct: 12,
        totalWithdrawalsEur: 20000, totalFlexFulfilledEur: 3000,
        totalMinimumFlexShortfallEur: 0, totalTaxesEur: 1000,
        totalHealthBucketUsedEur: null, financiallyEvaluatedYears: 1, ruinYear: null
    }
};
const alternativeEntry = {
    ...baselineEntry,
    variantId: 'alternative-1', role: 'alternative', label: 'Mehr Flex',
    summary: { ...baselineEntry.summary, finalValueNominalEur: 110000 }
};

const KPI_UNITS = {
    finalValueNominalEur: 'nominal_eur',
    finalValueRealEur: 'real_eur',
    maximumDrawdownNominalPct: 'percentage_points',
    maximumDrawdownRealPct: 'percentage_points',
    totalWithdrawalsEur: 'nominal_eur',
    totalFlexFulfilledEur: 'nominal_eur',
    totalMinimumFlexShortfallEur: 'nominal_eur',
    totalTaxesEur: 'nominal_eur',
    totalHealthBucketUsedEur: 'nominal_eur',
    financiallyEvaluatedYears: 'years',
    ruinYear: 'zero_based_year_index'
};

function deltas(baseline = baselineEntry, alternative = alternativeEntry) {
    return Object.fromEntries(Object.keys(baseline.summary).map(field => [field, {
        unit: KPI_UNITS[field],
        baselineValue: baseline.summary[field],
        variantValue: alternative.summary[field],
        absoluteDelta: Number.isFinite(baseline.summary[field])
            && Number.isFinite(alternative.summary[field])
            ? alternative.summary[field] - baseline.summary[field]
            : null,
        applicability: field === 'ruinYear' ? 'not_applicable_neither_ruined' : 'applicable'
    }]));
}

console.log('Test 1: patch preview distinguishes material, multi-factor and forbidden input feedback');
const singlePreview = renderStressReplayPatchPreviewV1({
    preview: { materialChangeGroups: ['dynamicFlex'], warnings: [] }
});
assert(/Dynamische Flexausgaben/.test(singlePreview), 'Allowed material group is named without JSON');
assert(/ein einzelner Strategiefaktor/i.test(singlePreview), 'Single-factor interpretation is explicit');
const multiPreview = renderStressReplayPatchPreviewV1({
    preview: { materialChangeGroups: ['dynamicFlex', 'longevity'], warnings: [{ code: 'multi' }] }
});
assert(/keinem einzelnen Faktor/.test(multiPreview), 'Multi-factor preview rejects false attribution');
const needsPreview = renderStressReplayPatchPreviewV1({
    preview: {
        materialChangeGroups: ['startFloorBedarf', 'startFlexBedarf', 'minimumFlexAnnual'],
        warnings: [{ code: 'multi' }]
    }
});
assert(/Floor-Bedarf p\. a\./.test(needsPreview), 'Floor need uses a readable material-group label');
assert(/Flex-Bedarf p\. a\./.test(needsPreview), 'Flex need uses a readable material-group label');
assert(/Mindest-Flex p\. a\./.test(needsPreview), 'Minimum flex uses a readable material-group label');
const forbiddenPreview = renderStressReplayPatchPreviewV1({
    error: new Error('strategy.goldAktiv is not whitelisted')
});
assert(/Patch nicht zulässig/.test(forbiddenPreview) && /goldAktiv/.test(forbiddenPreview), 'Forbidden patches are shown as contract errors');

console.log('Test 2: list keeps baseline immutable and exposes keyboard-native recompute/remove actions');
const workspace = {
    variants: [
        variant('baseline', 'baseline', []),
        variant('a'), variant('b', 'alternative', ['longevity']), variant('c')
    ]
};
const listHtml = renderStressReplayVariantListV1({ workspace });
assert(/unveränderliche Baseline/.test(listHtml), 'Baseline is explicitly immutable');
assertEqual((listHtml.match(/Neu berechnen/g) || []).length, 3, 'Every alternative has a native recompute button');
assertEqual((listHtml.match(/>Entfernen</g) || []).length, 3, 'Every alternative has a native remove button');
const baselineListItem = listHtml.match(/<li data-variant-id="baseline">[\s\S]*?<\/li>/)?.[0] || '';
assert(!/data-stress-replay-action="remove"/.test(baselineListItem), 'Baseline has no remove action');
const needsListHtml = renderStressReplayVariantListV1({
    workspace: { variants: [variant('baseline', 'baseline', []), variant('needs', 'alternative', ['startFloorBedarf', 'minimumFlexAnnual'])] }
});
assert(/Patch: Floor-Bedarf p\. a\., Mindest-Flex p\. a\./.test(needsListHtml),
    'Variant list names the new need groups instead of exposing raw contract paths');

console.log('Test 3: complete comparison renders KPI, semantic delta and annual tables without ranking');
const comparison = {
    overallStatus: 'complete',
    variants: [baselineEntry, alternativeEntry],
    pairwise: [{
        variantId: 'alternative-1', comparable: true, factorMode: 'single_factor',
        kpiDeltas: deltas(),
        firstDeltaMarkers: [{ yearIndex: 0, category: 'portfolio_state', causeCode: 'PORTFOLIO_VALUE_CHANGED' }]
    }]
};
const comparisonHtml = renderStressReplayComparisonV1({
    comparison,
    results: [result('baseline', 100000), result('alternative-1', 110000)]
});
assert(/KPI-Tabelle/.test(comparisonHtml), 'KPI table is rendered');
assert(/Delta-Timeline/.test(comparisonHtml), 'Delta timeline is rendered');
assert(/Jahrestabelle/.test(comparisonHtml) && /2001/.test(comparisonHtml), 'Annual table retains the historical year');
assert(/keine Kausalitätsaussage/.test(comparisonHtml), 'First delta is not presented as causality');
assert(/keine allgemeine Rangfolge/.test(comparisonHtml), 'Fixed-path results are not presented as general ranking');
assertEqual((comparisonHtml.match(/stress-replay-table-scroll/g) || []).length, 2, 'Both wide tables use local scroll containers');

const ruinBaseline = { ...baselineEntry, summary: { ...baselineEntry.summary, ruinYear: 3 } };
const ruinAlternative = {
    ...alternativeEntry,
    summary: {
        ...alternativeEntry.summary,
        maximumDrawdownNominalPct: 12.5,
        maximumDrawdownRealPct: 11,
        financiallyEvaluatedYears: 2,
        ruinYear: 5
    }
};
const semanticDeltaHtml = renderStressReplayComparisonV1({
    comparison: {
        ...comparison,
        variants: [ruinBaseline, ruinAlternative],
        pairwise: [{ ...comparison.pairwise[0], kpiDeltas: deltas(ruinBaseline, ruinAlternative) }]
    }
});
assert(/Jahr 4/.test(semanticDeltaHtml) && /Jahr 6/.test(semanticDeltaHtml),
    'Absolute ruin years remain readable as one-based year values');
assert(/Δ 2 Jahre/.test(semanticDeltaHtml) && !/Δ Jahr 3/.test(semanticDeltaHtml),
    'Ruin-year deltas are rendered as elapsed years rather than absolute year labels');
assert(/Δ 2,5 Prozentpunkte/.test(semanticDeltaHtml) && /Δ -1 Prozentpunkt/.test(semanticDeltaHtml),
    'Drawdown deltas retain their sign and use an explicit percentage-point unit');
assert(/Δ 1 Jahr/.test(semanticDeltaHtml), 'A singular year delta uses the singular unit');

for (const [absoluteDelta, expected] of [[0, 'Δ 0 Jahre'], [-1, 'Δ -1 Jahr']]) {
    const variant = { ...ruinAlternative, summary: { ...ruinAlternative.summary, ruinYear: 3 + absoluteDelta } };
    const html = renderStressReplayComparisonV1({
        comparison: {
            ...comparison,
            variants: [ruinBaseline, variant],
            pairwise: [{ ...comparison.pairwise[0], kpiDeltas: deltas(ruinBaseline, variant) }]
        }
    });
    assert(html.includes(expected), `Ruin-year delta ${absoluteDelta} has an unambiguous year-count label`);
}
const notApplicableRuinRow = comparisonHtml.match(/<tr><th scope="row">Jahr des Vermögensaufbrauchs<\/th>[\s\S]*?<\/tr>/)?.[0] || '';
assert(/nicht anwendbar/.test(notApplicableRuinRow) && !/Δ 0 Jahre/.test(notApplicableRuinRow),
    'Jointly absent ruin years remain not applicable instead of becoming a zero delta');

const asymmetricDeathHtml = renderStressReplayComparisonV1({
    comparison,
    results: [
        deathResult('baseline', 100000, 100000, 0),
        deathResult('alternative-1', 110000, 110000, 1)
    ]
});
assert(/2002/.test(asymmetricDeathHtml), 'The later terminal death row must not be clipped');
assert(/—/.test(asymmetricDeathHtml), 'A missing shorter-path cell must remain visibly missing instead of becoming zero');

console.log('Test 4: technical errors suppress financial deltas instead of fabricating zeros');
const blockedHtml = renderStressReplayComparisonV1({
    comparison: {
        overallStatus: 'blocked_technical_error',
        variants: [baselineEntry, { ...alternativeEntry, terminalStatus: 'technical_error', summary: null }],
        pairwise: [{ variantId: 'alternative-1', comparable: false, kpiDeltas: null, firstDeltaMarkers: [] }]
    },
    results: [result('baseline', 100000)]
});
assert(/technischen Fehler/.test(blockedHtml), 'Aggregate technical error is visible');
assert(/Finanzielle Deltas werden nicht angezeigt/.test(blockedHtml), 'Affected financial deltas are explicitly suppressed');
assert(!/Δ 0/.test(blockedHtml), 'Technical errors are never rendered as zero deltas');

console.log('Test 5: user labels are escaped');
const escaped = renderStressReplayVariantListV1({
    workspace: { variants: [variant('baseline', 'baseline', []), { ...variant('x'), label: '<script>alert(1)</script>' }] }
});
assert(!escaped.includes('<script>'), 'Variant labels cannot inject markup');
assert(escaped.includes('&lt;script&gt;'), 'Escaped label remains inspectable');

console.log('Test 6: controller persists add/remove and recomputes without touching profile state');
{
    const baselineVariant = variant('baseline', 'baseline', []);
    const initialWorkspace = {
        path: { replay: true },
        baselineSnapshot: {
            liquidityRunwayYears: 5, maxSkimPctOfEq: 10, maxBearRefillPctOfEq: 5,
            decumulation: { mode: 'standard' }, dynamicFlex: false,
            horizonMethod: 'mean', horizonYears: 30, survivalQuantile: 0.85,
            goGoActive: false, goGoMultiplier: 1, longevityMode: 'none',
            longevityQuantileShift: 0, longevityRelativePct: 0, longevityBufferYears: 0
        },
        variants: [baselineVariant], createdAtUtc: '2026-01-01T00:00:00.000Z',
        updatedAtUtc: '2026-01-01T00:00:00.000Z'
    };
    const controls = [{
        value: 'true',
        dataset: { valueType: 'boolean', stressReplayPath: 'strategy.dynamicFlex' }
    }];
    const listeners = new Map();
    const form = {
        addEventListener(type, listener) { listeners.set(type, listener); },
        querySelectorAll(selector) {
            if (selector === '[data-stress-replay-path]') return controls;
            return [];
        },
        checkValidity() { return true; },
        reset() { controls[0].value = ''; }
    };
    const status = { textContent: '', dataset: {}, focus() {} };
    const label = { value: 'Dynamisch' };
    const expertFields = { hidden: true };
    const expertToggle = {
        textContent: '',
        attributes: new Map(),
        setAttribute(name, value) { this.attributes.set(name, String(value)); },
        addEventListener() {}
    };
    const elements = new Map([
        ['stressReplayVariantEditor', form],
        ['stressReplayVariantLabel', label],
        ['stressReplayStatus', status],
        ['stressReplayExpertFields', expertFields],
        ['stressReplayExpertToggle', expertToggle]
    ]);
    const documentRef = {
        getElementById(id) { return elements.get(id) || null; },
        querySelectorAll() { return []; }
    };
    let currentWorkspace = initialWorkspace;
    let saves = 0;
    let computations = 0;
    const controller = createStressReplayController({
        documentRef,
        resolveCompatibility: () => ({ status: 'executable', readOnly: false }),
        loadWorkspace: () => ({ status: 'executable', workspace: currentWorkspace, compatibility: { readOnly: false } }),
        createVariant: ({ id, label: variantLabel }) => ({ ...variant(id), label: variantLabel }),
        previewVariantPatch: () => ({ materialChangeGroups: ['dynamicFlex'], warnings: [] }),
        createWorkspace: ({ path, baselineSnapshot, variants, createdAtUtc, updatedAtUtc }) => ({
            path, baselineSnapshot, variants, createdAtUtc, updatedAtUtc
        }),
        saveWorkspace: async workspaceToSave => { saves += 1; currentWorkspace = workspaceToSave; },
        runComparison: ({ workspace }) => {
            computations += 1;
            return { comparison: { variants: workspace.variants }, results: [] };
        },
        renderViews: () => {},
        discardWorkspace: async () => {},
        replaceFromImport: async () => {},
        buildExport: () => ({}), serializeExport: () => '{}', triggerDownload: () => {}
    });
    controller.initialize();
    controller.toggleExpertFields();
    controller.previewEditorPatch();
    const added = await controller.addVariant();
    assert(added?.role === 'alternative', 'Editor adds a contract-shaped alternative');
    assertEqual(currentWorkspace.variants.length, 2, 'Added alternative is persisted with the baseline');
    assertEqual(saves, 1, 'Adding performs one workspace persistence write');
    assert(computations >= 2, 'Adding recomputes the fixed-path comparison');
    assertEqual(controls[0].value, '', 'Successful add resets variant patch controls');
    assertEqual(expertFields.hidden, false, 'Form reset does not persist or collapse the DOM-local expert disclosure');
    assertEqual(await controller.removeVariant(added.id), true, 'Alternative can be removed');
    assertEqual(currentWorkspace.variants.length, 1, 'Removal persists only the immutable baseline');
    assertEqual(saves, 2, 'Removal performs one additional persistence write');
}

console.log('Stress replay renderer tests passed.');
