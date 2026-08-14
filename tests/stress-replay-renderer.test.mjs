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

function deltas() {
    return Object.fromEntries(Object.keys(baselineEntry.summary).map(field => [field, {
        baselineValue: baselineEntry.summary[field],
        variantValue: alternativeEntry.summary[field],
        absoluteDelta: Number.isFinite(baselineEntry.summary[field])
            && Number.isFinite(alternativeEntry.summary[field])
            ? alternativeEntry.summary[field] - baselineEntry.summary[field]
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
    const elements = new Map([
        ['stressReplayVariantEditor', form],
        ['stressReplayVariantLabel', label],
        ['stressReplayStatus', status]
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
    controller.previewEditorPatch();
    const added = await controller.addVariant();
    assert(added?.role === 'alternative', 'Editor adds a contract-shaped alternative');
    assertEqual(currentWorkspace.variants.length, 2, 'Added alternative is persisted with the baseline');
    assertEqual(saves, 1, 'Adding performs one workspace persistence write');
    assert(computations >= 2, 'Adding recomputes the fixed-path comparison');
    assertEqual(await controller.removeVariant(added.id), true, 'Alternative can be removed');
    assertEqual(currentWorkspace.variants.length, 1, 'Removal persists only the immutable baseline');
    assertEqual(saves, 2, 'Removal performs one additional persistence write');
}

console.log('Stress replay renderer tests passed.');
