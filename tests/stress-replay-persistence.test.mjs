import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    STRESS_REPLAY_SCOPE,
    STRESS_REPLAY_UNITS_V1,
    StressReplayContractError,
    createStressReplayWorkspaceV1
} from '../app/simulator/stress-replay-contract.js';
import { buildStressReplayComparisonExportV1, serializeStressReplayComparisonExportV1 } from '../app/simulator/stress-replay-export.js';
import {
    STRESS_REPLAY_ACTIVE_STORAGE_KEY,
    discardStressReplayWorkspaceV1,
    inspectStressReplayImportV1,
    loadStressReplayWorkspaceV1,
    replaceStressReplayFromImportV1,
    saveStressReplayWorkspaceV1
} from '../app/simulator/stress-replay-persistence.js';
import { createStressReplayBaselineVariantV1 } from '../app/simulator/stress-replay-variant.js';

function fingerprint(character) {
    return { algorithm: 'sha256-canonical-json-v1', value: character.repeat(64) };
}

function pathFixture(seed = 7) {
    return {
        schemaVersion: STRESS_REPLAY_SCHEMA_VERSIONS.path,
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        scope: STRESS_REPLAY_SCOPE,
        source: {
            requestFingerprint: fingerprint('c'), seed, rngMode: 'per-run-seed',
            absoluteRunIndex: 0, displayRunNumber: 1, scenarioKey: 'worst_terminal_wealth',
            selectionMetric: 'nominal_terminal_wealth_eur', tieBreak: 'smallest_absolute_run_index'
        },
        breakOnRuin: true,
        dataFingerprint: fingerprint('a'),
        engineFingerprint: fingerprint('b'),
        units: { ...STRESS_REPLAY_UNITS_V1 },
        horizonYears: 1,
        effectiveLength: 1,
        terminalStatus: 'horizon_exhausted',
        initialMarketDataHist: [{ year: 2025, kurs: 100, capeRatio: 25 }],
        years: [{
            yearIndex: 0, recordType: 'financial_year', financiallyEvaluable: true,
            equityReturnPct: -10, goldReturnPct: 2, cashReturnPct: 1,
            inflationPct: 2, wageGrowthPct: 2, capeRatio: 24, regime: 'bear',
            stressEvents: [], tailRiskEvents: [], householdEvents: []
        }],
        reconciliation: { sourcePrefixMatched: true }
    };
}

function inputsFixture(overrides = {}) {
    return {
        startAlter: 65,
        liquidityRunwayYears: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        decumulation: { mode: 'standard' },
        dynamicFlex: false,
        horizonMethod: 'mean',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1,
        longevityMode: 'none',
        ...overrides
    };
}

function workspaceFixture(seed = 7, inputs = inputsFixture()) {
    const baseline = createStressReplayBaselineVariantV1({ baselineInputs: inputs });
    return createStressReplayWorkspaceV1({
        path: pathFixture(seed),
        baselineSnapshot: inputs,
        variants: [baseline],
        createdAtUtc: '2026-08-14T10:00:00.000Z'
    });
}

function createBackend(initial = null, options = {}) {
    const store = new Map();
    const mutations = [];
    let flushCalls = 0;
    if (initial !== null) store.set(STRESS_REPLAY_ACTIVE_STORAGE_KEY, initial);
    return {
        store,
        mutations,
        backend: {
            storage: {
                getItem(key) { return store.has(key) ? store.get(key) : null; },
                setItem(key, value) { mutations.push(['set', key]); store.set(key, String(value)); },
                removeItem(key) { mutations.push(['remove', key]); store.delete(key); }
            },
            async flush() {
                flushCalls += 1;
                if (options.failFirstFlush && flushCalls === 1) throw new Error('fixture flush failed');
            }
        }
    };
}

function assertContractError(callback, code, message) {
    try {
        callback();
        assert(false, `${message}: expected ${code}`);
    } catch (error) {
        assert(error instanceof StressReplayContractError && error.code === code,
            `${message}: received ${error?.code || error?.name}`);
    }
}

async function assertContractRejection(promise, code, message) {
    try {
        await promise;
        assert(false, `${message}: expected ${code}`);
    } catch (error) {
        assert(error instanceof StressReplayContractError && error.code === code,
            `${message}: received ${error?.code || error?.name}`);
    }
}

console.log('Test 1: a single active workspace roundtrips through the facade-shaped backend');
const workspace = workspaceFixture();
const memory = createBackend();
const saved = await saveStressReplayWorkspaceV1(workspace, { backend: memory.backend });
const loaded = loadStressReplayWorkspaceV1({
    backend: memory.backend,
    currentCompatibility: {
        contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
        dataFingerprint: fingerprint('a'),
        engineFingerprint: fingerprint('b')
    }
});
assertEqual(saved.replaced, false, 'First save does not replace data');
assertEqual(loaded.status, 'executable', 'Matching workspace remains executable');
assertEqual(loaded.workspace.workspaceFingerprint.value, workspace.workspaceFingerprint.value, 'Stored workspace roundtrips');
assert(memory.mutations.every(([, key]) => key === STRESS_REPLAY_ACTIVE_STORAGE_KEY), 'Only the dedicated replay key is mutated');

console.log('Test 2: replacement is explicit and idempotent saves do not write');
const mutationCount = memory.mutations.length;
await saveStressReplayWorkspaceV1(workspace, { backend: memory.backend });
assertEqual(memory.mutations.length, mutationCount, 'Idempotent save performs no mutation');
const replacement = workspaceFixture(8);
await assertContractRejection(
    saveStressReplayWorkspaceV1(replacement, { backend: memory.backend }),
    'STRESS_REPLAY_REPLACE_CONFIRMATION_REQUIRED',
    'Different path requires replacement confirmation'
);
await saveStressReplayWorkspaceV1(replacement, { backend: memory.backend, confirmReplace: true });
assertEqual(loadStressReplayWorkspaceV1({ backend: memory.backend }).workspace.path.source.seed, 8, 'Confirmed replacement becomes active');

console.log('Test 3: failed backend flush rolls back byte-identically');
const previousRaw = JSON.stringify(workspace);
const failing = createBackend(previousRaw, { failFirstFlush: true });
await assertContractRejection(
    saveStressReplayWorkspaceV1(replacement, { backend: failing.backend, confirmReplace: true }),
    'STRESS_REPLAY_PERSISTENCE_WRITE_FAILED',
    'Failed atomic save reports a stable error'
);
assertEqual(failing.store.get(STRESS_REPLAY_ACTIVE_STORAGE_KEY), previousRaw, 'Failed save restores the previous bytes');

console.log('Test 4: corruption remains stored and does not block the normal persistence facade');
const corrupt = createBackend('{broken');
const corruptResult = loadStressReplayWorkspaceV1({ backend: corrupt.backend });
assertEqual(corruptResult.status, 'corrupt', 'Corruption is exposed without throwing during normal load');
assertEqual(corrupt.store.get(STRESS_REPLAY_ACTIVE_STORAGE_KEY), '{broken', 'Corrupt data is not auto-deleted');
assertEqual(corrupt.mutations.length, 0, 'Corrupt load performs no mutation');

console.log('Test 5: data or engine mismatch opens read-only and blocks exact-execution status');
const unavailableContext = loadStressReplayWorkspaceV1({ backend: memory.backend });
assertEqual(unavailableContext.status, 'read_only', 'Missing compatibility evidence fails closed to read-only');
assertEqual(unavailableContext.compatibility.mismatchReasons.length, 2, 'Both missing fingerprints are explicit');
for (const currentCompatibility of [
    { dataFingerprint: fingerprint('d'), engineFingerprint: fingerprint('b') },
    { dataFingerprint: fingerprint('a'), engineFingerprint: fingerprint('e') }
]) {
    const mismatch = loadStressReplayWorkspaceV1({ backend: memory.backend, currentCompatibility });
    assertEqual(mismatch.status, 'read_only', 'Mismatch is inspection-only');
    assertEqual(mismatch.compatibility.executable, false, 'Mismatch is not exactly executable');
    assertEqual(mismatch.compatibility.mismatchReasons.length, 1, 'Mismatch reason is machine-readable');
}

console.log('Test 6: import inspection is non-mutating and replacement requires confirmation');
const importWorkspace = workspaceFixture(9);
const importJson = serializeStressReplayComparisonExportV1(buildStressReplayComparisonExportV1({ workspace: importWorkspace }));
const beforeInspection = memory.store.get(STRESS_REPLAY_ACTIVE_STORAGE_KEY);
const inspection = inspectStressReplayImportV1(importJson, {
    currentCompatibility: { dataFingerprint: fingerprint('d'), engineFingerprint: fingerprint('b') }
});
assertEqual(inspection.compatibility.status, 'read_only', 'Incompatible import can be inspected read-only');
assertEqual(memory.store.get(STRESS_REPLAY_ACTIVE_STORAGE_KEY), beforeInspection, 'Inspection does not replace active state');
await assertContractRejection(
    replaceStressReplayFromImportV1(importJson, { backend: memory.backend }),
    'STRESS_REPLAY_REPLACE_CONFIRMATION_REQUIRED',
    'Import replacement requires confirmation'
);
const imported = await replaceStressReplayFromImportV1(importJson, {
    backend: memory.backend,
    confirmReplace: true,
    currentCompatibility: { dataFingerprint: fingerprint('d'), engineFingerprint: fingerprint('b') }
});
assertEqual(imported.compatibility.status, 'read_only', 'Persisted incompatible import stays read-only');

console.log('Test 7: discard is explicit and touches only the replay key');
await assertContractRejection(
    discardStressReplayWorkspaceV1({ backend: memory.backend }),
    'STRESS_REPLAY_DISCARD_CONFIRMATION_REQUIRED',
    'Discard requires confirmation'
);
await discardStressReplayWorkspaceV1({ backend: memory.backend, confirmDiscard: true });
assertEqual(loadStressReplayWorkspaceV1({ backend: memory.backend }).status, 'empty', 'Confirmed discard removes the workspace');
assert(memory.mutations.every(([, key]) => key === STRESS_REPLAY_ACTIVE_STORAGE_KEY), 'No unrelated key is ever mutated');

console.log('Test 8: workspace size limit rejects oversized baselines without truncation');
assertContractError(
    () => workspaceFixture(10, inputsFixture({ note: 'x'.repeat(2 * 1024 * 1024) })),
    'STRESS_REPLAY_PERSISTENCE_SIZE_LIMIT',
    'Oversized workspace is rejected'
);

console.log('Stress replay persistence tests passed.');
