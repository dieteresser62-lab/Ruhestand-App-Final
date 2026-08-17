import {
    createStressReplayController,
    formatStressReplayUiError,
    renderStressReplayWorkspaceBanner
} from '../app/simulator/stress-replay-ui.js';

class FakeElement {
    constructor(id) {
        this.id = id;
        this.textContent = '';
        this.dataset = {};
        this.hidden = false;
        this.disabled = false;
        this.value = '';
        this.files = [];
        this.listeners = new Map();
        this.attributes = new Map();
        this.focused = false;
        this.clicks = 0;
        this.queryResults = new Map();
    }

    addEventListener(type, handler) { this.listeners.set(type, handler); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    focus() { this.focused = true; }
    click() { this.clicks += 1; this.listeners.get('click')?.({ preventDefault() {} }); }
    querySelectorAll(selector) { return this.queryResults.get(selector) || []; }
    checkValidity() { return true; }
    reset() {}
}

function createDocument() {
    const ids = [
        'stressReplayWorkspace', 'stressReplayStatus', 'stressReplayFixButton',
        'stressReplayExportButton', 'stressReplayImportButton', 'stressReplayDiscardButton',
        'stressReplayImportFile', 'stressReplayBanner', 'stressReplayBannerMode',
        'stressReplayBannerSource', 'stressReplayBannerHorizon', 'stressReplayBannerTerminal',
        'stressReplayBannerContinuation', 'stressReplayBannerPathFingerprint',
        'stressReplayBannerBaselineFingerprint', 'stressReplayCompatibilityReasons',
        'stressReplayVariantFields', 'stressReplayAddVariantButton', 'stressReplayVariantList', 'stressReplayDynamicAction',
        'stressReplayPatchPreview', 'stressReplayComparison', 'useCapeSampling'
    ];
    const elements = new Map(ids.map(id => [id, new FakeElement(id)]));
    const baselineOutputs = [];
    return {
        elements,
        baselineOutputs,
        getElementById(id) { return elements.get(id) || null; },
        querySelectorAll(selector) {
            return selector === '[data-stress-replay-baseline]' ? baselineOutputs : [];
        }
    };
}

function fingerprint(character) {
    return { algorithm: 'sha256-canonical-json-v1', value: character.repeat(64) };
}

function pathFixture() {
    return {
        source: {
            scenarioKey: 'worst', displayRunNumber: 8, absoluteRunIndex: 7,
            selectionMetric: 'nominal_terminal_wealth_eur'
        },
        effectiveLength: 2,
        horizonYears: 30,
        terminalStatus: 'ruin',
        continuation: { active: true },
        pathFingerprint: fingerprint('a')
    };
}

function workspaceFixture() {
    return {
        path: pathFixture(),
        sourceIdentity: {
            schemaVersion: 'StressReplaySourceIdentityV1',
            identityFingerprint: fingerprint('e'),
            rows: [{ recordType: 'financial_year', jahr: 1, histJahr: 2001 }]
        },
        baselineScenarioFingerprint: fingerprint('b'),
        baselineSnapshot: {},
        variants: [{ id: 'baseline', role: 'baseline', label: 'Baseline' }],
        createdAtUtc: '2026-08-16T00:00:00.000Z',
        updatedAtUtc: '2026-08-16T00:00:00.000Z'
    };
}

function editorBaselineFixture(overrides = {}) {
    return {
        liquidityRunwayYears: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        decumulation: {
            mode: 'standard',
            bondTargetFactor: 2,
            drawdownTrigger: 0.2,
            bondRefillThreshold: 0.1
        },
        dynamicFlex: false,
        horizonMethod: 'mean',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1,
        longevityMode: 'none',
        longevityQuantileShift: 0,
        longevityRelativePct: 0,
        longevityBufferYears: 0,
        startFloorBedarf: 24000,
        startFlexBedarf: 12000,
        minimumFlexAnnual: 6000,
        ...overrides
    };
}

function scenarioFixture() {
    return {
        key: 'worst',
        sourceIdentity: {
            absoluteRunIndex: 7,
            displayRunNumber: 8,
            selectionMetric: 'nominal_terminal_wealth_eur',
            tieBreak: 'smallest_absolute_run_index'
        },
        logDataRows: [{ recordType: 'financial_year', jahr: 1 }]
    };
}

function controllerFixture(overrides = {}) {
    const documentRef = createDocument();
    const workspace = workspaceFixture();
    const calls = { saves: 0, discards: 0, imports: 0, downloads: 0, sourceIdentities: [], workspaceInputs: [] };
    const compatibility = {
        status: 'executable', executable: true, readOnly: false, mismatchReasons: [],
        dataFingerprint: fingerprint('c'), engineFingerprint: fingerprint('d')
    };
    const controller = createStressReplayController({
        documentRef,
        windowRef: { confirm: () => true },
        readParameters: () => ({ seed: 42, rngMode: 'per-run-seed', maxDauer: 30 }),
        resolveCompatibility: () => compatibility,
        loadWorkspace: () => ({ status: 'empty', workspace: null, compatibility: null, error: null }),
        captureSelectedRun: async () => ({
            capturesByIndex: new Map([[7, { capture: true }]])
        }),
        materializePath: () => workspace.path,
        runBaseline: () => ({ reconciliation: { matched: true }, technicalError: null }),
        createBaselineVariant: () => ({ id: 'baseline', role: 'baseline' }),
        createSourceIdentity: ({ sourceRows }) => ({ ...workspace.sourceIdentity, rows: structuredClone(sourceRows) }),
        createWorkspace: input => { calls.workspaceInputs.push(input); return workspace; },
        runComparison: ({ workspace: activeWorkspace, sourceIdentity }) => {
            calls.sourceIdentities.push(sourceIdentity);
            return { comparison: { variants: activeWorkspace.variants, pairwise: [] }, results: [] };
        },
        saveWorkspace: async () => { calls.saves += 1; },
        discardWorkspace: async () => { calls.discards += 1; },
        replaceFromImport: async () => { calls.imports += 1; return { workspace, compatibility }; },
        buildExport: () => ({ exported: true }),
        serializeExport: () => '{"exported":true}',
        triggerDownload: () => { calls.downloads += 1; },
        renderViews: ({ busy }) => {
            documentRef.getElementById('stressReplayDynamicAction').disabled = busy;
        },
        ...overrides
    });
    return { controller, documentRef, workspace, calls, compatibility };
}

function deferred() {
    let resolve;
    let reject;
    const promise = new Promise((resolvePromise, rejectPromise) => {
        resolve = resolvePromise;
        reject = rejectPromise;
    });
    return { promise, resolve, reject };
}

console.log('Test 1: no scenario keeps fixation blocked and reports the prerequisite in the live region');
{
    const { controller, documentRef } = controllerFixture();
    controller.initialize();
    controller.setMonteCarloContext({ inputs: { widowOptions: {} }, scenarioLogs: { characteristic: [] } });
    assertEqual(documentRef.getElementById('stressReplayFixButton').disabled, true, 'Fixation starts disabled');
    assert(/Wählen Sie ein Szenario/.test(documentRef.getElementById('stressReplayStatus').textContent), 'Live region explains the missing selection');
    assertEqual(await controller.fixSelectedScenario(), null, 'Fixation without a selection is rejected');
    assertEqual(documentRef.getElementById('stressReplayStatus').dataset.status, 'error', 'Missing selection is marked as an error');
}

console.log('Test 2: legacy RNG is visibly unsupported and never starts capture');
{
    let captures = 0;
    const { controller, documentRef } = controllerFixture({
        readParameters: () => ({ seed: 42, rngMode: 'legacy-stream', maxDauer: 30 }),
        captureSelectedRun: async () => { captures += 1; return {}; }
    });
    controller.initialize();
    controller.setMonteCarloContext({ inputs: { widowOptions: {} }, scenarioLogs: { characteristic: [] } });
    controller.selectScenario(scenarioFixture());
    assertEqual(documentRef.getElementById('stressReplayFixButton').disabled, true, 'Legacy RNG disables fixation');
    assert(/nicht unterstützt/.test(documentRef.getElementById('stressReplayStatus').textContent), 'Legacy RNG is visibly unsupported');
    assertEqual(await controller.fixSelectedScenario(), null, 'Legacy RNG fixation is rejected');
    assertEqual(captures, 0, 'Legacy RNG never starts capture');
}

console.log('Test 3: a reconciled source is fixed without mutating its baseline inputs');
{
    const baselineInputs = { startAlter: 65, widowOptions: { percent: 60 } };
    const before = JSON.stringify(baselineInputs);
    const { controller, documentRef, calls, workspace } = controllerFixture();
    controller.initialize();
    controller.setMonteCarloContext({ inputs: baselineInputs, scenarioLogs: { characteristic: [scenarioFixture()] } });
    controller.selectScenario(scenarioFixture());
    const fixed = await controller.fixSelectedScenario();
    assertEqual(fixed, workspace, 'Reconciled workspace is returned');
    assertEqual(calls.saves, 1, 'Reconciled workspace is persisted once');
    assertEqual(calls.workspaceInputs[0].sourceIdentity.rows[0].recordType, 'financial_year',
        'Fixation persists identity projected from original scenario rows');
    assertEqual(JSON.stringify(baselineInputs), before, 'Fixation does not mutate source inputs');
    assertEqual(documentRef.getElementById('stressReplayBanner').hidden, false, 'Fixed workspace shows its banner');
    assertEqual(documentRef.getElementById('stressReplayBanner').focused, true, 'Focus moves to the new banner');
    assert(/Baseline und Fingerprints/.test(documentRef.getElementById('stressReplayStatus').textContent), 'Success status names reconciliation');
}

console.log('Test 4: materialization failures are surfaced and never persisted');
{
    const { controller, documentRef, calls } = controllerFixture({
        materializePath: () => {
            throw Object.assign(new Error('mismatch'), { code: 'STRESS_REPLAY_RECONCILIATION_FAILED' });
        }
    });
    controller.initialize();
    controller.setMonteCarloContext({ inputs: { widowOptions: {} }, scenarioLogs: { characteristic: [] } });
    controller.selectScenario(scenarioFixture());
    assertEqual(await controller.fixSelectedScenario(), null, 'Materialization mismatch rejects fixation');
    assertEqual(calls.saves, 0, 'Materialization mismatch is never persisted');
    assert(/nicht vollständig/.test(documentRef.getElementById('stressReplayStatus').textContent), 'Mismatch is visible');
}

console.log('Test 5: banner distinguishes source, horizon, terminal state, continuation and read-only mode');
{
    const documentRef = createDocument();
    renderStressReplayWorkspaceBanner({
        workspace: workspaceFixture(),
        compatibility: { readOnly: true, mismatchReasons: ['engine_fingerprint_mismatch'] }
    }, { documentRef });
    assert(/Lauf 8 \(Index 7\)/.test(documentRef.getElementById('stressReplayBannerSource').textContent), 'Banner exposes display number and absolute index');
    assertEqual(documentRef.getElementById('stressReplayBannerHorizon').textContent, '2 von 30 Jahren', 'Banner exposes effective and planned horizon');
    assertEqual(documentRef.getElementById('stressReplayBannerTerminal').textContent, 'Vermögen aufgebraucht', 'Banner distinguishes ruin');
    assert(/Restpfad/.test(documentRef.getElementById('stressReplayBannerContinuation').textContent), 'Banner exposes continuation policy');
    assertEqual(documentRef.getElementById('stressReplayBannerMode').textContent, 'Nur-Lesen-Inspektion', 'Banner labels read-only mode');
    assert(/engine_fingerprint_mismatch/.test(documentRef.getElementById('stressReplayCompatibilityReasons').textContent), 'Banner names mismatch reasons');
    renderStressReplayWorkspaceBanner({
        workspace: workspaceFixture(),
        compatibility: { readOnly: true, mismatchReasons: ['source_identity_refix_required'] }
    }, { documentRef });
    assert(/Stresspfad neu fixieren/.test(documentRef.getElementById('stressReplayCompatibilityReasons').textContent),
        'V1 source evidence receives an understandable refix instruction');
}

console.log('Test 6: reload, export, import and explicit discard retain session boundaries');
{
    const workspace = workspaceFixture();
    const compatibility = { status: 'executable', readOnly: false, mismatchReasons: [] };
    const { controller, documentRef, calls } = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null })
    });
    controller.initialize();
    assertEqual(calls.sourceIdentities[0], workspace.sourceIdentity,
        'Reload comparison receives the persisted source identity');
    assert(/wurde geladen/.test(documentRef.getElementById('stressReplayStatus').textContent), 'Reload status is visible');
    assertEqual(controller.exportActiveWorkspace(), '{"exported":true}', 'Export returns serialized workspace');
    assertEqual(calls.downloads, 1, 'Export starts one download');
    assert(await controller.importSerialized('{"import":true}'), 'Confirmed import replaces the session');
    assertEqual(JSON.stringify(calls.sourceIdentities.at(-1)), JSON.stringify(workspace.sourceIdentity),
        'Compatible import comparison receives the persisted source identity');
    assertEqual(await controller.discardActiveWorkspace(), true, 'Confirmed discard succeeds');
    assertEqual(calls.discards, 1, 'Discard invokes persistence once');
    assertEqual(controller.getState().status, 'empty', 'Discard clears in-memory state');
    assertEqual(documentRef.getElementById('stressReplayBanner').hidden, true, 'Discard hides banner');
    assertEqual(documentRef.getElementById('stressReplayFixButton').focused, true, 'Discard restores focus to fixation flow');
}

console.log('Test 7: user-facing failure labels keep technical terminal states separate');
assert(/Legacy-Zufallsstrom/.test(formatStressReplayUiError({ code: 'STRESS_REPLAY_SOURCE_UNSUPPORTED' })), 'Unsupported RNG has a distinct message');
assert(/nicht gespeichert/.test(formatStressReplayUiError({ code: 'STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED' })), 'Reconciliation failures explicitly reject persistence');

console.log('Test 8: deferred import owns the shared busy contract and rejects competing actions');
{
    const pendingImport = deferred();
    const workspace = workspaceFixture();
    const compatibility = { status: 'executable', executable: true, readOnly: false, mismatchReasons: [] };
    const importedWorkspace = { ...workspace, path: { ...workspace.path, effectiveLength: 7 } };
    const { controller, documentRef, calls } = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null }),
        replaceFromImport: async () => {
            calls.imports += 1;
            await pendingImport.promise;
            return { workspace: importedWorkspace, compatibility };
        }
    });
    controller.initialize();
    const importPromise = controller.importSerialized('{"import":true}');
    assertEqual(calls.imports, 1, 'Import starts exactly one persistence operation');
    assertEqual(documentRef.getElementById('stressReplayWorkspace').attributes.get('aria-busy'), 'true', 'Workspace exposes busy while import is pending');
    for (const id of [
        'stressReplayFixButton', 'stressReplayExportButton', 'stressReplayImportButton',
        'stressReplayDiscardButton', 'stressReplayImportFile', 'stressReplayVariantFields',
        'stressReplayAddVariantButton', 'stressReplayDynamicAction'
    ]) {
        assertEqual(documentRef.getElementById(id).disabled, true, `${id} is disabled while import is pending`);
    }
    const importFileClicks = documentRef.getElementById('stressReplayImportFile').clicks;
    documentRef.getElementById('stressReplayImportButton').click();
    assertEqual(documentRef.getElementById('stressReplayImportFile').clicks, importFileClicks, 'Busy import selection cannot reopen the file picker');
    assertEqual(await controller.discardActiveWorkspace(), false, 'Competing discard is rejected instead of queued');
    assertEqual(await controller.addVariant(), null, 'Competing variant mutation is rejected instead of queued');
    assertEqual(controller.exportActiveWorkspace(), null, 'Competing export is rejected while workspace mutation is pending');
    assertEqual(controller.recomputeComparison(), null, 'Competing recompute is rejected while workspace mutation is pending');
    assertEqual(calls.discards, 0, 'Rejected discard never reaches persistence');
    assertEqual(calls.saves, 0, 'Rejected variant never reaches persistence');
    pendingImport.resolve();
    assert(await importPromise, 'Winning import completes');
    assertEqual(controller.getState().workspace, importedWorkspace, 'Winning import determines the active workspace');
    assertEqual(documentRef.getElementById('stressReplayWorkspace').attributes.get('aria-busy'), 'false', 'Workspace clears busy after import success');
    assertEqual(documentRef.getElementById('stressReplayVariantFields').disabled, false, 'Editor unlocks after import success');
    assertEqual(documentRef.getElementById('stressReplayDynamicAction').disabled, false, 'Dynamic actions unlock after import success');
}

console.log('Test 9: deferred discard rejects a second discard and fixation, then unlocks after success');
{
    const pendingDiscard = deferred();
    let captures = 0;
    const workspace = workspaceFixture();
    const compatibility = { status: 'executable', executable: true, readOnly: false, mismatchReasons: [] };
    const { controller, documentRef, calls } = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null }),
        discardWorkspace: async () => { calls.discards += 1; await pendingDiscard.promise; },
        captureSelectedRun: async () => { captures += 1; return { capturesByIndex: new Map() }; }
    });
    controller.initialize();
    controller.setMonteCarloContext({ inputs: { widowOptions: {} }, scenarioLogs: { characteristic: [] } });
    controller.selectScenario(scenarioFixture());
    const discardPromise = controller.discardActiveWorkspace();
    assertEqual(await controller.discardActiveWorkspace(), false, 'Second discard is rejected immediately');
    assertEqual(await controller.fixSelectedScenario(), null, 'Fixation cannot overlap discard');
    assertEqual(calls.discards, 1, 'Rapid discard calls produce one persistence operation');
    assertEqual(captures, 0, 'Rejected fixation never starts capture');
    pendingDiscard.resolve();
    assertEqual(await discardPromise, true, 'Winning discard completes');
    assertEqual(controller.getState().status, 'empty', 'Winning discard clears the workspace');
    assertEqual(documentRef.getElementById('stressReplayWorkspace').attributes.get('aria-busy'), 'false', 'Workspace clears busy after discard success');
}

console.log('Test 10: rejected import and discard promises always release the UI lock');
{
    const workspace = workspaceFixture();
    const compatibility = { status: 'executable', executable: true, readOnly: false, mismatchReasons: [] };
    const importFailure = deferred();
    const importFixture = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null }),
        replaceFromImport: async () => importFailure.promise
    });
    importFixture.controller.initialize();
    const importPromise = importFixture.controller.importSerialized('{"import":true}');
    importFailure.reject(new Error('Import backend unavailable'));
    assertEqual(await importPromise, null, 'Rejected import is reported as failure');
    assertEqual(importFixture.documentRef.getElementById('stressReplayWorkspace').attributes.get('aria-busy'), 'false', 'Rejected import releases busy');
    assertEqual(importFixture.controller.getState().workspace, workspace, 'Rejected import retains the previous workspace');

    const discardFailure = deferred();
    const discardFixture = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null }),
        discardWorkspace: async () => discardFailure.promise
    });
    discardFixture.controller.initialize();
    const discardPromise = discardFixture.controller.discardActiveWorkspace();
    discardFailure.reject(new Error('Discard backend unavailable'));
    assertEqual(await discardPromise, false, 'Rejected discard is reported as failure');
    assertEqual(discardFixture.documentRef.getElementById('stressReplayWorkspace').attributes.get('aria-busy'), 'false', 'Rejected discard releases busy');
    assertEqual(discardFixture.controller.getState().workspace, workspace, 'Rejected discard retains the previous workspace');
}

console.log('Test 11: focused need editor preserves explicit zero and reports the effective relation in German');
{
    const workspace = {
        ...workspaceFixture(),
        baselineSnapshot: editorBaselineFixture({ startFloorBedarf: 0 })
    };
    const controls = [
        { value: '0', dataset: { valueType: 'number', stressReplayPath: 'strategy.startFloorBedarf' }, disabled: false },
        { value: '', dataset: { valueType: 'number', stressReplayPath: 'strategy.startFlexBedarf' }, disabled: false },
        { value: '', dataset: { valueType: 'number', stressReplayPath: 'strategy.minimumFlexAnnual' }, disabled: false },
        { value: '7', dataset: { valueType: 'number', stressReplayPath: 'strategy.liquidityRunwayYears' }, disabled: false }
    ];
    const capturedPatches = [];
    let renderedPreviewError = null;
    const { controller, documentRef, compatibility, calls } = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null }),
        previewVariantPatch: ({ patch }) => {
            capturedPatches.push(structuredClone(patch));
            const flex = patch.strategy?.startFlexBedarf ?? workspace.baselineSnapshot.startFlexBedarf;
            const minimum = patch.strategy?.minimumFlexAnnual ?? workspace.baselineSnapshot.minimumFlexAnnual;
            if (minimum > flex) {
                throw Object.assign(new Error('Effective minimum flex must not exceed effective flex need'), {
                    code: 'STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX',
                    details: { startFlexBedarf: flex, minimumFlexAnnual: minimum }
                });
            }
            return { materialChangeGroups: ['startFloorBedarf'], warnings: [] };
        },
        renderViews: ({ previewError }) => { renderedPreviewError = previewError; }
    });
    const form = new FakeElement('stressReplayVariantEditor');
    documentRef.elements.set(form.id, form);
    form.queryResults.set('[data-stress-replay-path]', controls);
    for (const path of ['startFloorBedarf', 'startFlexBedarf', 'minimumFlexAnnual']) {
        const output = new FakeElement(`baseline-${path}`);
        output.dataset.stressReplayBaseline = path;
        output.dataset.stressReplayFormat = 'currency-eur';
        documentRef.baselineOutputs.push(output);
    }
    controller.initialize();

    const outputs = Object.fromEntries(documentRef.baselineOutputs.map(output => [output.dataset.stressReplayBaseline, output.textContent]));
    assert(/^0(?:[.,]00)?\s*€$/.test(outputs.startFloorBedarf), 'A zero baseline is rendered as a Euro amount, not as missing');
    assert(/12[.\s]000(?:,00)?\s*€$/.test(outputs.startFlexBedarf), 'Flex baseline uses German Euro formatting');
    assert(/6[.\s]000(?:,00)?\s*€$/.test(outputs.minimumFlexAnnual), 'Minimum-flex baseline uses German Euro formatting');

    controller.previewEditorPatch();
    assertEqual(capturedPatches.at(-1).strategy.startFloorBedarf, 0, 'The string zero reaches preview as numeric zero');
    assert(!Object.hasOwn(capturedPatches.at(-1).strategy, 'startFlexBedarf'), 'An empty flex control creates no patch leaf');

    controls[1].value = '100';
    controls[2].value = '101';
    const comparisonsBeforeError = calls.sourceIdentities.length;
    controller.previewEditorPatch();
    assertEqual(renderedPreviewError?.code, 'STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX', 'Relation error reaches patch preview rendering');
    assert(/Mindest-Flex p\. a\..*101\s*€.*Flex-Bedarf p\. a\..*100\s*€/i.test(documentRef.getElementById('stressReplayStatus').textContent),
        'Live status explains both effective values without clamping');
    assertEqual(documentRef.getElementById('stressReplayStatus').dataset.status, 'error', 'Invalid effective need relation is marked as an error');
    assertEqual(documentRef.getElementById('stressReplayAddVariantButton').disabled, true, 'Invalid effective need relation disables variant creation');
    assertEqual(calls.sourceIdentities.length, comparisonsBeforeError, 'Invalid preview does not start another replay comparison');
}

console.log('Test 12: expert toggle is DOM-local and preserves control values and patch materiality');
{
    let previewCalls = 0;
    const workspace = {
        ...workspaceFixture(),
        baselineSnapshot: editorBaselineFixture()
    };
    const { controller, documentRef, compatibility } = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null }),
        previewVariantPatch: () => { previewCalls += 1; return { materialChangeGroups: [], warnings: [] }; }
    });
    const expertControl = { value: '7', dataset: { valueType: 'number', stressReplayPath: 'strategy.liquidityRunwayYears' } };
    const form = new FakeElement('stressReplayVariantEditor');
    form.queryResults.set('[data-stress-replay-path]', [expertControl]);
    documentRef.elements.set(form.id, form);
    documentRef.elements.set('stressReplayExpertToggle', new FakeElement('stressReplayExpertToggle'));
    documentRef.elements.set('stressReplayExpertFields', new FakeElement('stressReplayExpertFields'));
    controller.initialize();
    const fields = documentRef.getElementById('stressReplayExpertFields');
    const toggle = documentRef.getElementById('stressReplayExpertToggle');
    assertEqual(fields.hidden, true, 'Expert fields start closed');
    assertEqual(toggle.attributes.get('aria-expanded'), 'false', 'Collapsed state is exposed through ARIA');
    const callsBeforeToggle = previewCalls;
    toggle.click();
    assertEqual(fields.hidden, false, 'Native toggle opens the expert container');
    assertEqual(toggle.attributes.get('aria-expanded'), 'true', 'Expanded state is exposed through ARIA');
    toggle.click();
    toggle.click();
    assertEqual(expertControl.value, '7', 'Closing and reopening preserves the expert value byte-for-byte');
    assertEqual(previewCalls, callsBeforeToggle, 'Pure display toggling does not create or refresh a patch');
}

console.log('Test 13: preview status tracks transitions between different errors and final recovery');
{
    const workspace = {
        ...workspaceFixture(),
        baselineSnapshot: editorBaselineFixture()
    };
    const previewOutcomes = [
        Object.assign(new Error('Effective minimum flex must not exceed effective flex need'), {
            code: 'STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX',
            details: { startFlexBedarf: 5000, minimumFlexAnnual: 6000 }
        }),
        Object.assign(new Error('Schema rejection'), {
            code: 'STRESS_REPLAY_VARIANT_FIELD_FORBIDDEN'
        }),
        { materialChangeGroups: ['startFloorBedarf'], warnings: [] }
    ];
    const { controller, documentRef, compatibility } = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null }),
        previewVariantPatch: () => {
            const outcome = previewOutcomes.shift();
            if (outcome instanceof Error) throw outcome;
            return outcome;
        }
    });
    const form = new FakeElement('stressReplayVariantEditor');
    form.queryResults.set('[data-stress-replay-path]', []);
    documentRef.elements.set(form.id, form);
    controller.initialize();

    const region = documentRef.getElementById('stressReplayStatus');
    let regionText = region.textContent;
    const announcements = [];
    Object.defineProperty(region, 'textContent', {
        configurable: true,
        get: () => regionText,
        set: value => {
            regionText = value;
            announcements.push(value);
        }
    });

    controller.previewEditorPatch();
    assertEqual(region.dataset.patchError, 'STRESS_REPLAY_MINIMUM_FLEX_EXCEEDS_FLEX',
        'The first preview error becomes the current error sentinel');
    assertEqual(region.dataset.status, 'error', 'The first preview error marks the live region as an error');
    assert(/Mindest-Flex p\. a\./.test(region.textContent), 'The first preview error has its specific message');

    controller.previewEditorPatch();
    assertEqual(region.dataset.patchError, 'STRESS_REPLAY_VARIANT_FIELD_FORBIDDEN',
        'A different preview error replaces the stale relation-error sentinel');
    assertEqual(region.dataset.status, 'error', 'The replacement preview error remains an error state');
    assertEqual(region.textContent, 'Schema rejection', 'The live region exposes only the current preview error');

    controller.previewEditorPatch();
    assertEqual(region.dataset.patchError, undefined, 'Successful preview clears the last error sentinel');
    assertEqual(region.dataset.status, 'ok', 'Successful preview restores the live region success state');
    assertEqual(region.textContent, 'Die Patchvorschau ist zulässig.', 'Recovery is announced after the actual last error');
    assertEqual(announcements.filter(message => message === 'Die Patchvorschau ist zulässig.').length, 1,
        'Recovery is announced exactly once across the error transition');
}

console.log('Test 14: direct recompute and the registered DOM action retain the same durable error semantics');
{
    const workspace = workspaceFixture();
    const compatibility = { status: 'executable', executable: true, readOnly: false, mismatchReasons: [] };
    let failComparison = false;
    let renderedComparisonState = null;
    const { controller, documentRef } = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null }),
        runComparison: ({ workspace: activeWorkspace }) => {
            if (failComparison) {
                throw Object.assign(new Error('<unsafe> comparison backend'), {
                    code: 'STRESS_REPLAY_<INVALID>'
                });
            }
            return { comparison: { variants: activeWorkspace.variants, pairwise: [] }, results: [] };
        },
        renderViews: ({ comparisonState }) => { renderedComparisonState = structuredClone(comparisonState); }
    });
    controller.initialize();
    failComparison = true;

    assertEqual(controller.recomputeComparison(), null, 'Direct recompute returns null on a controlled comparison throw');
    assertEqual(renderedComparisonState.status, 'error', 'Direct recompute persists an explicit comparison error');
    assertEqual(renderedComparisonState.error.code, 'STRESS_REPLAY_COMPARISON_FAILED',
        'Unsafe external error codes are replaced by the stable fallback code');
    assert(!/[\u0000-\u001f]/.test(renderedComparisonState.error.message), 'Persisted diagnostics contain no control characters');
    assertEqual(documentRef.getElementById('stressReplayStatus').dataset.status, 'error',
        'Direct recompute marks the live status as failed');
    assertEqual(documentRef.getElementById('stressReplayStatus').focused, true,
        'Direct recompute without comparison focus focuses the failed live status');

    documentRef.getElementById('stressReplayStatus').focused = false;
    const listListener = documentRef.getElementById('stressReplayVariantList').listeners.get('click');
    listListener({
        target: {
            closest: () => ({
                dataset: { stressReplayAction: 'recompute', variantId: 'alternative-1' }
            })
        }
    });
    assertEqual(renderedComparisonState.status, 'error', 'Registered recompute action retains the same explicit error state');
    assertEqual(documentRef.getElementById('stressReplayStatus').dataset.status, 'error',
        'Registered recompute action does not overwrite failure with success');
    assert(/Variantenvergleich fehlgeschlagen/.test(documentRef.getElementById('stressReplayStatus').textContent),
        'Registered recompute action keeps the failure announcement');
    assertEqual(documentRef.getElementById('stressReplayComparison').focused, true,
        'The registered action focuses the comparison region containing the alert');
}

console.log('Test 15: empty results fail closed and a later successful recompute clears the error');
{
    const workspace = workspaceFixture();
    const compatibility = { status: 'executable', executable: true, readOnly: false, mismatchReasons: [] };
    const outcomes = [
        { comparison: null, results: [] },
        { comparison: { variants: [] }, results: [] }
    ];
    let renderedComparisonState = null;
    const { controller, documentRef } = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null }),
        runComparison: ({ workspace: activeWorkspace }) => outcomes.shift()
            || { comparison: { variants: activeWorkspace.variants, pairwise: [] }, results: [] },
        renderViews: ({ comparisonState }) => { renderedComparisonState = structuredClone(comparisonState); }
    });
    controller.initialize();
    assertEqual(renderedComparisonState.status, 'error', 'Empty initialization result becomes a durable error');
    assertEqual(renderedComparisonState.error.code, 'STRESS_REPLAY_COMPARISON_EMPTY',
        'Empty result has a distinct stable diagnostic code');
    assert(/Variantenvergleich fehlgeschlagen/.test(documentRef.getElementById('stressReplayStatus').textContent),
        'Initialization does not overwrite an empty-result failure with a loaded-success message');
    assertEqual(controller.recomputeComparison(), null, 'A comparison with an empty variant set also fails closed');
    assertEqual(renderedComparisonState.error.code, 'STRESS_REPLAY_COMPARISON_EMPTY',
        'Structurally empty comparison retains the distinct empty-result code');
    assert(controller.recomputeComparison(), 'A later non-empty comparison succeeds');
    assertEqual(renderedComparisonState.status, 'success', 'Successful recompute replaces the durable error');
}

console.log('Test 16: fixation and import report mutation success separately from comparison failure');
{
    let renderedComparisonState = null;
    const fixation = controllerFixture({
        runComparison: () => { throw Object.assign(new Error('calculator offline'), { code: 'STRESS_REPLAY_CALCULATOR_OFFLINE' }); },
        renderViews: ({ comparisonState }) => { renderedComparisonState = structuredClone(comparisonState); }
    });
    fixation.controller.initialize();
    fixation.controller.setMonteCarloContext({ inputs: { widowOptions: {} }, scenarioLogs: { characteristic: [] } });
    fixation.controller.selectScenario(scenarioFixture());
    assertEqual(await fixation.controller.fixSelectedScenario(), fixation.workspace,
        'Fixation still returns the successfully persisted workspace when comparison fails');
    assertEqual(fixation.calls.saves, 1, 'Fixation mutation remains persisted despite comparison failure');
    assertEqual(renderedComparisonState.status, 'error', 'Fixation retains comparison failure in its region');
    assert(/Stresspfad fixiert.*Variantenvergleich ist fehlgeschlagen/.test(
        fixation.documentRef.getElementById('stressReplayStatus').textContent),
    'Fixation live status states both mutation success and comparison failure');

    const importedWorkspace = workspaceFixture();
    const compatibility = { status: 'executable', executable: true, readOnly: false, mismatchReasons: [] };
    const imported = controllerFixture({
        replaceFromImport: async () => ({ workspace: importedWorkspace, compatibility }),
        runComparison: () => { throw new Error('import comparison failed'); },
        renderViews: ({ comparisonState }) => { renderedComparisonState = structuredClone(comparisonState); }
    });
    imported.controller.initialize();
    assert(await imported.controller.importSerialized('{"workspace":true}'),
        'Import returns the successfully installed workspace state when comparison fails');
    assertEqual(renderedComparisonState.status, 'error', 'Import retains comparison failure in its region');
    assert(/Stresspfad importiert.*Variantenvergleich ist fehlgeschlagen/.test(
        imported.documentRef.getElementById('stressReplayStatus').textContent),
    'Import live status states both import success and comparison failure');
}

console.log('Test 17: add and remove retain successful persistence while reporting failed recomputation');
{
    const compatibility = { status: 'executable', executable: true, readOnly: false, mismatchReasons: [] };
    let currentWorkspace = {
        ...workspaceFixture(),
        baselineSnapshot: editorBaselineFixture(),
        variants: [{ id: 'baseline', role: 'baseline', label: 'Baseline' }]
    };
    let comparisonCalls = 0;
    let saves = 0;
    let renderedComparisonState = null;
    const documentRef = createDocument();
    const form = new FakeElement('stressReplayVariantEditor');
    form.queryResults.set('[data-stress-replay-path]', [{
        value: 'true',
        dataset: { valueType: 'boolean', stressReplayPath: 'strategy.dynamicFlex' }
    }]);
    documentRef.elements.set(form.id, form);
    documentRef.elements.set('stressReplayVariantLabel', new FakeElement('stressReplayVariantLabel'));
    documentRef.getElementById('stressReplayVariantLabel').value = 'Dynamisch';
    const controller = createStressReplayController({
        documentRef,
        resolveCompatibility: () => compatibility,
        loadWorkspace: () => ({ status: 'executable', workspace: currentWorkspace, compatibility, error: null }),
        previewVariantPatch: () => ({ materialChangeGroups: ['dynamicFlex'], warnings: [] }),
        createVariant: ({ id, label }) => ({ id, label, role: 'alternative', materialChangeGroups: ['dynamicFlex'] }),
        createWorkspace: input => ({ ...input, baselineScenarioFingerprint: currentWorkspace.baselineScenarioFingerprint }),
        saveWorkspace: async workspace => { saves += 1; currentWorkspace = workspace; },
        runComparison: ({ workspace }) => {
            comparisonCalls += 1;
            if (comparisonCalls > 1) throw new Error('variant comparison failed');
            return { comparison: { variants: workspace.variants, pairwise: [] }, results: [] };
        },
        renderViews: ({ comparisonState }) => { renderedComparisonState = structuredClone(comparisonState); }
    });
    controller.initialize();
    controller.previewEditorPatch();
    const added = await controller.addVariant();
    assert(added?.role === 'alternative', 'Add returns the successfully persisted variant when comparison fails');
    assertEqual(saves, 1, 'Add persists exactly once before failed comparison');
    assertEqual(renderedComparisonState.status, 'error', 'Add retains the failed comparison state');
    assert(/wurde gespeichert.*Variantenvergleich ist fehlgeschlagen/.test(
        documentRef.getElementById('stressReplayStatus').textContent),
    'Add status distinguishes saved variant from failed comparison');

    assertEqual(await controller.removeVariant(added.id), true,
        'Remove returns true for successful persistence despite failed comparison');
    assertEqual(saves, 2, 'Remove persists exactly once after add');
    assertEqual(renderedComparisonState.status, 'error', 'Remove retains the failed comparison state');
    assert(/Variante entfernt.*Variantenvergleich ist fehlgeschlagen/.test(
        documentRef.getElementById('stressReplayStatus').textContent),
    'Remove status distinguishes removal from failed comparison');
}

console.log('Stress replay UI tests passed.');
