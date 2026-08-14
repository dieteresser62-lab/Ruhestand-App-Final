"use strict";

import {
    STRESS_REPLAY_CONTRACT_VERSION,
    createStressReplayFingerprint,
    createStressReplayWorkspaceV1
} from './stress-replay-contract.js';
import { getDataVersion } from './simulator-engine-helpers.js';
import { readMonteCarloParameters } from './monte-carlo-ui.js';
import { captureMonteCarloEngineProvenance } from './monte-carlo-export.js';
import { normalizeWidowOptions } from './simulator-sweep-utils.js';
import { materializeStressReplayPathV1 } from './stress-replay-path-materializer.js';
import { runStressReplayBaselineV1 } from './stress-replay-runner.js';
import { createStressReplayBaselineVariantV1 } from './stress-replay-variant.js';
import {
    discardStressReplayWorkspaceV1,
    loadStressReplayWorkspaceV1,
    replaceStressReplayFromImportV1,
    saveStressReplayWorkspaceV1
} from './stress-replay-persistence.js';
import {
    buildStressReplayComparisonExportV1,
    serializeStressReplayComparisonExportV1
} from './stress-replay-export.js';
import { EngineAPI } from '../../engine/index.mjs';

const EMPTY_STATE = Object.freeze({ status: 'empty', workspace: null, compatibility: null, error: null });

function cloneValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function focusElement(element) {
    if (typeof element?.focus !== 'function') return;
    try {
        element.focus({ preventScroll: false });
    } catch {
        element.focus();
    }
}

function shortFingerprint(fingerprint) {
    const value = fingerprint?.value;
    return typeof value === 'string' ? `${value.slice(0, 12)}…${value.slice(-8)}` : 'nicht verfügbar';
}

function terminalLabel(status) {
    if (status === 'ruin') return 'Vermögen aufgebraucht';
    if (status === 'all_dead') return 'Haushalt verstorben';
    if (status === 'horizon_exhausted') return 'Horizont erreicht';
    return String(status || 'unbekannt');
}

function continuationLabel(path) {
    if (path?.continuation?.active === true) return 'deterministischer Restpfad nach Vermögensaufbrauch';
    return 'keine Fortsetzung erforderlich';
}

function defaultCompatibility() {
    return {
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        dataFingerprint: createStressReplayFingerprint(getDataVersion()),
        engineFingerprint: createStressReplayFingerprint(captureMonteCarloEngineProvenance(EngineAPI))
    };
}

async function defaultCaptureSelectedRun(options) {
    const { runMonteCarloReplayCaptureForIndices } = await import('./simulator-monte-carlo.js');
    return runMonteCarloReplayCaptureForIndices(options);
}

function downloadJson(serialized, filename, {
    documentRef = globalThis.document,
    urlApi = globalThis.URL,
    BlobCtor = globalThis.Blob
} = {}) {
    if (!documentRef?.createElement || typeof urlApi?.createObjectURL !== 'function' || typeof BlobCtor !== 'function') {
        throw new Error('Der Browserdownload ist in dieser Umgebung nicht verfügbar.');
    }
    const url = urlApi.createObjectURL(new BlobCtor([serialized], { type: 'application/json' }));
    const anchor = documentRef.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    try {
        documentRef.body?.appendChild?.(anchor);
        anchor.click();
    } finally {
        anchor.remove?.();
        urlApi.revokeObjectURL?.(url);
    }
}

export function formatStressReplayUiError(error) {
    const code = error?.code;
    if (code === 'STRESS_REPLAY_SOURCE_UNSUPPORTED') {
        return 'Dieser Monte-Carlo-Lauf nutzt den Legacy-Zufallsstrom und kann in V1 nicht fixiert werden.';
    }
    if (code === 'STRESS_REPLAY_REPLACE_CONFIRMATION_REQUIRED') {
        return 'Der vorhandene Stresspfad wurde nicht ersetzt.';
    }
    if (code === 'STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED'
        || code === 'STRESS_REPLAY_RECONCILIATION_FAILED') {
        return 'Der Pfad stimmt nicht vollständig mit dem Ursprungslauf überein und wurde nicht gespeichert.';
    }
    return error?.message || String(error || 'Unbekannter Fehler');
}

export function renderStressReplayWorkspaceBanner(workspaceState, {
    documentRef = globalThis.document
} = {}) {
    const banner = documentRef?.getElementById?.('stressReplayBanner');
    if (!banner) return;
    const workspace = workspaceState?.workspace;
    banner.hidden = !workspace;
    if (!workspace) return;

    const path = workspace.path;
    const readOnly = workspaceState.compatibility?.readOnly === true;
    const values = {
        stressReplayBannerMode: readOnly ? 'Nur-Lesen-Inspektion' : 'Ausführbarer Arbeitsstand',
        stressReplayBannerSource: `${path.source.scenarioKey} · Lauf ${path.source.displayRunNumber} (Index ${path.source.absoluteRunIndex}) · ${path.source.selectionMetric}`,
        stressReplayBannerHorizon: `${path.effectiveLength} von ${path.horizonYears} Jahren`,
        stressReplayBannerTerminal: terminalLabel(path.terminalStatus),
        stressReplayBannerContinuation: continuationLabel(path),
        stressReplayBannerPathFingerprint: shortFingerprint(path.pathFingerprint),
        stressReplayBannerBaselineFingerprint: shortFingerprint(workspace.baselineScenarioFingerprint)
    };
    for (const [id, value] of Object.entries(values)) {
        const element = documentRef.getElementById?.(id);
        if (element) element.textContent = value;
    }
    const mismatch = documentRef.getElementById?.('stressReplayCompatibilityReasons');
    if (mismatch) {
        mismatch.hidden = !readOnly;
        mismatch.textContent = readOnly
            ? `Ausführung blockiert: ${(workspaceState.compatibility?.mismatchReasons || []).join(', ')}.`
            : '';
    }
}

export function createStressReplayController({
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    readParameters = readMonteCarloParameters,
    resolveCompatibility = defaultCompatibility,
    captureSelectedRun = defaultCaptureSelectedRun,
    materializePath = materializeStressReplayPathV1,
    runBaseline = runStressReplayBaselineV1,
    createBaselineVariant = createStressReplayBaselineVariantV1,
    createWorkspace = createStressReplayWorkspaceV1,
    loadWorkspace = loadStressReplayWorkspaceV1,
    saveWorkspace = saveStressReplayWorkspaceV1,
    discardWorkspace = discardStressReplayWorkspaceV1,
    replaceFromImport = replaceStressReplayFromImportV1,
    buildExport = buildStressReplayComparisonExportV1,
    serializeExport = serializeStressReplayComparisonExportV1,
    triggerDownload = downloadJson
} = {}) {
    let initialized = false;
    let workspaceState = EMPTY_STATE;
    let runContext = null;
    let selectedScenario = null;

    const element = id => documentRef?.getElementById?.(id) || null;
    const status = (message, { error = false, focus = false } = {}) => {
        const region = element('stressReplayStatus');
        if (!region) return;
        region.textContent = message;
        region.dataset.status = error ? 'error' : 'ok';
        if (focus) focusElement(region);
    };
    const setBusy = busy => {
        for (const id of ['stressReplayFixButton', 'stressReplayExportButton', 'stressReplayImportButton', 'stressReplayDiscardButton']) {
            const button = element(id);
            if (button) button.disabled = busy || (id === 'stressReplayFixButton' && !selectedScenario);
        }
        element('stressReplayWorkspace')?.setAttribute?.('aria-busy', String(busy));
    };
    const render = ({ focusBanner = false } = {}) => {
        renderStressReplayWorkspaceBanner(workspaceState, { documentRef });
        const hasWorkspace = !!workspaceState.workspace;
        const exportButton = element('stressReplayExportButton');
        const discardButton = element('stressReplayDiscardButton');
        if (exportButton) exportButton.disabled = !hasWorkspace;
        if (discardButton) discardButton.disabled = !hasWorkspace;
        if (focusBanner && hasWorkspace) focusElement(element('stressReplayBanner'));
    };

    const setMonteCarloContext = ({ inputs, scenarioLogs } = {}) => {
        runContext = inputs && scenarioLogs
            ? {
                inputs: cloneValue(inputs),
                scenarioLogs,
                monteCarloParams: cloneValue(readParameters(inputs)),
                useCapeSampling: element('useCapeSampling')?.checked === true
            }
            : null;
        selectedScenario = null;
        const button = element('stressReplayFixButton');
        if (button) button.disabled = true;
        status(runContext
            ? 'Wählen Sie ein Szenario aus, um diesen Lauf als Stresspfad zu fixieren.'
            : 'Starten Sie zuerst einen Monte-Carlo-Lauf.');
    };

    const selectScenario = scenario => {
        selectedScenario = scenario?.sourceIdentity ? scenario : null;
        const button = element('stressReplayFixButton');
        if (button) button.disabled = !selectedScenario;
        if (!runContext) status('Der Ursprungslauf ist nicht mehr verfügbar. Starten Sie Monte Carlo erneut.', { error: true });
        else if (!selectedScenario) status('Wählen Sie ein Szenario aus, um diesen Lauf als Stresspfad zu fixieren.');
        else if (runContext.monteCarloParams.rngMode !== 'per-run-seed') {
            if (button) button.disabled = true;
            status('Dieser Legacy-Zufallsstrom wird für Stresspfad-Replay nicht unterstützt.', { error: true });
        } else {
            status(`Lauf ${selectedScenario.sourceIdentity.displayRunNumber} ist zum Fixieren ausgewählt.`);
        }
    };

    const fixSelectedScenario = async () => {
        if (!runContext || !selectedScenario) {
            status('Wählen Sie zuerst ein Szenario aus einem abgeschlossenen Monte-Carlo-Lauf.', { error: true, focus: true });
            return null;
        }
        if (runContext.monteCarloParams.rngMode !== 'per-run-seed') {
            const error = Object.assign(new Error('Unsupported RNG mode'), { code: 'STRESS_REPLAY_SOURCE_UNSUPPORTED' });
            status(formatStressReplayUiError(error), { error: true, focus: true });
            return null;
        }
        setBusy(true);
        status('Der ausgewählte Lauf wird deterministisch nachgerechnet und abgeglichen.');
        try {
            const sourceIdentity = selectedScenario.sourceIdentity;
            const rerun = await captureSelectedRun({
                inputs: cloneValue(runContext.inputs),
                widowOptions: normalizeWidowOptions(runContext.inputs.widowOptions),
                monteCarloParams: cloneValue(runContext.monteCarloParams),
                useCapeSampling: runContext.useCapeSampling,
                runIndices: [sourceIdentity.absoluteRunIndex],
                generationId: `stress-replay-${Date.now()}`
            });
            const capture = rerun.capturesByIndex?.get?.(sourceIdentity.absoluteRunIndex);
            const sourceRows = selectedScenario.logDataRows;
            if (!capture || !Array.isArray(sourceRows) || sourceRows.length === 0) {
                throw Object.assign(new Error('Capture oder Ursprungslog fehlt.'), { code: 'STRESS_REPLAY_CAPTURE_INVALID' });
            }
            const compatibility = resolveCompatibility();
            const sourceRequest = {
                inputs: runContext.inputs,
                monteCarloParams: runContext.monteCarloParams,
                useCapeSampling: runContext.useCapeSampling
            };
            const path = materializePath({
                capture,
                sourceLogRows: sourceRows,
                sourceRequest,
                dataFingerprint: compatibility.dataFingerprint,
                engineFingerprint: compatibility.engineFingerprint,
                scenarioKey: selectedScenario.key,
                selectionMetric: sourceIdentity.selectionMetric,
                selectionTieBreak: sourceIdentity.tieBreak
            });
            const baselineVariant = createBaselineVariant({ baselineInputs: runContext.inputs });
            const baselineResult = runBaseline({
                path,
                baselineInputs: runContext.inputs,
                sourceScenarioLog: sourceRows,
                variant: baselineVariant
            });
            if (baselineResult.technicalError || baselineResult.reconciliation?.matched !== true) {
                throw Object.assign(new Error('Baseline-Abgleich fehlgeschlagen.'), {
                    code: 'STRESS_REPLAY_BASELINE_RECONCILIATION_FAILED'
                });
            }
            const workspace = createWorkspace({
                path,
                baselineSnapshot: runContext.inputs,
                variants: [baselineVariant]
            });
            const replacing = workspaceState.status !== 'empty';
            const confirmed = !replacing || windowRef?.confirm?.('Den aktiven Stresspfad durch den ausgewählten Lauf ersetzen?') === true;
            if (!confirmed) {
                status('Der vorhandene Stresspfad wurde beibehalten.');
                return null;
            }
            await saveWorkspace(workspace, { confirmReplace: replacing });
            workspaceState = { status: 'executable', workspace, compatibility, error: null };
            render({ focusBanner: true });
            status('Stresspfad fixiert. Baseline und Fingerprints wurden abgeglichen.');
            return workspace;
        } catch (error) {
            status(formatStressReplayUiError(error), { error: true, focus: true });
            return null;
        } finally {
            setBusy(false);
            render();
        }
    };

    const exportActiveWorkspace = () => {
        if (!workspaceState.workspace) {
            status('Es gibt keinen aktiven Stresspfad zum Exportieren.', { error: true, focus: true });
            return null;
        }
        try {
            const serialized = serializeExport(buildExport({ workspace: workspaceState.workspace }));
            triggerDownload(serialized, 'stress-pfad-replay-v1.json', { documentRef });
            status('Stresspfad-Export wurde erstellt.');
            return serialized;
        } catch (error) {
            status(`Export fehlgeschlagen: ${formatStressReplayUiError(error)}`, { error: true, focus: true });
            return null;
        }
    };

    const importSerialized = async serialized => {
        try {
            const replacing = workspaceState.status !== 'empty';
            if (replacing && windowRef?.confirm?.('Den aktiven Stresspfad durch den Import ersetzen?') !== true) {
                status('Der Import wurde abgebrochen; der aktive Stresspfad bleibt erhalten.');
                return null;
            }
            const imported = await replaceFromImport(serialized, {
                confirmReplace: replacing,
                currentCompatibility: resolveCompatibility()
            });
            workspaceState = {
                status: imported.compatibility.status,
                workspace: imported.workspace,
                compatibility: imported.compatibility,
                error: null
            };
            render({ focusBanner: true });
            status(imported.compatibility.readOnly
                ? 'Stresspfad importiert und wegen abweichender Laufzeit nur zur Inspektion geöffnet.'
                : 'Stresspfad importiert und als aktiver Arbeitsstand geladen.');
            return workspaceState;
        } catch (error) {
            status(`Import fehlgeschlagen: ${formatStressReplayUiError(error)}`, { error: true, focus: true });
            return null;
        }
    };

    const discardActiveWorkspace = async () => {
        if (!workspaceState.workspace && workspaceState.status !== 'corrupt') return false;
        if (windowRef?.confirm?.('Den aktiven Stresspfad dauerhaft verwerfen?') !== true) {
            status('Der aktive Stresspfad wurde beibehalten.');
            return false;
        }
        try {
            await discardWorkspace({ confirmDiscard: true });
            workspaceState = EMPTY_STATE;
            render();
            status('Der aktive Stresspfad wurde verworfen.', { focus: true });
            focusElement(element('stressReplayFixButton'));
            return true;
        } catch (error) {
            status(`Verwerfen fehlgeschlagen: ${formatStressReplayUiError(error)}`, { error: true, focus: true });
            return false;
        }
    };

    const initialize = () => {
        if (initialized) return workspaceState;
        initialized = true;
        workspaceState = loadWorkspace({ currentCompatibility: resolveCompatibility() });
        render();
        if (workspaceState.status === 'corrupt') {
            status(`Der gespeicherte Stresspfad ist beschädigt und wurde nicht automatisch gelöscht: ${workspaceState.error?.message || 'unbekannter Fehler'}`, { error: true });
        } else if (workspaceState.workspace) {
            status(workspaceState.compatibility?.readOnly
                ? 'Gespeicherter Stresspfad wurde nur zur Inspektion geladen.'
                : 'Gespeicherter Stresspfad wurde geladen.');
        } else {
            status('Starten Sie Monte Carlo und wählen Sie ein Szenario aus.');
        }
        element('stressReplayFixButton')?.addEventListener?.('click', () => void fixSelectedScenario());
        element('stressReplayExportButton')?.addEventListener?.('click', exportActiveWorkspace);
        element('stressReplayImportButton')?.addEventListener?.('click', () => element('stressReplayImportFile')?.click?.());
        element('stressReplayDiscardButton')?.addEventListener?.('click', () => void discardActiveWorkspace());
        element('stressReplayImportFile')?.addEventListener?.('change', async event => {
            const file = event?.target?.files?.[0];
            if (!file) return;
            await importSerialized(await file.text());
            event.target.value = '';
        });
        return workspaceState;
    };

    return Object.freeze({
        initialize,
        setMonteCarloContext,
        selectScenario,
        fixSelectedScenario,
        exportActiveWorkspace,
        importSerialized,
        discardActiveWorkspace,
        getState: () => workspaceState
    });
}

let activeController = null;

export function initStressReplayUI(options = {}) {
    activeController ||= createStressReplayController(options);
    activeController.initialize();
    return activeController;
}

export function publishStressReplayMonteCarloContext(context) {
    activeController?.setMonteCarloContext(context);
}

export function selectStressReplayScenario(scenario) {
    activeController?.selectScenario(scenario);
}
