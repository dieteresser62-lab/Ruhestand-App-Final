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
    }

    addEventListener(type, handler) { this.listeners.set(type, handler); }
    setAttribute(name, value) { this.attributes.set(name, String(value)); }
    focus() { this.focused = true; }
    click() { this.clicks += 1; this.listeners.get('click')?.({ preventDefault() {} }); }
    querySelectorAll() { return []; }
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
    return {
        elements,
        getElementById(id) { return elements.get(id) || null; }
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
        baselineScenarioFingerprint: fingerprint('b'),
        baselineSnapshot: {},
        variants: [{ id: 'baseline', role: 'baseline', label: 'Baseline' }],
        createdAtUtc: '2026-08-16T00:00:00.000Z',
        updatedAtUtc: '2026-08-16T00:00:00.000Z'
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
    const calls = { saves: 0, discards: 0, imports: 0, downloads: 0 };
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
        createWorkspace: () => workspace,
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
}

console.log('Test 6: reload, export, import and explicit discard retain session boundaries');
{
    const workspace = workspaceFixture();
    const compatibility = { status: 'executable', readOnly: false, mismatchReasons: [] };
    const { controller, documentRef, calls } = controllerFixture({
        loadWorkspace: () => ({ status: 'executable', workspace, compatibility, error: null })
    });
    controller.initialize();
    assert(/wurde geladen/.test(documentRef.getElementById('stressReplayStatus').textContent), 'Reload status is visible');
    assertEqual(controller.exportActiveWorkspace(), '{"exported":true}', 'Export returns serialized workspace');
    assertEqual(calls.downloads, 1, 'Export starts one download');
    assert(await controller.importSerialized('{"import":true}'), 'Confirmed import replaces the session');
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

console.log('Stress replay UI tests passed.');
