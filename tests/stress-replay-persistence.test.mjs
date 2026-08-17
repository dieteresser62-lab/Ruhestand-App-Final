import { readFileSync } from 'node:fs';

import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_SCHEMA_VERSIONS,
    STRESS_REPLAY_SCOPE,
    STRESS_REPLAY_UNITS_V1,
    StressReplayContractError,
    createStressReplaySourceIdentityV1,
    createStressReplayWorkspaceFingerprint,
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
import {
    init as initPersistence,
    resetPersistenceForTests,
    resetPersistenceRuntimeForTests
} from '../app/shared/persistence-facade.js';

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
        startFloorBedarf: 24000,
        startFlexBedarf: 12000,
        minimumFlexAnnual: 6000,
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
        sourceScenarioLog: [{ recordType: 'financial_year', jahr: 1, histJahr: null }],
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

function createFacadeAdapter(initial = {}) {
    const store = new Map(Object.entries(initial).map(([key, value]) => [String(key), String(value)]));
    const batches = [];
    let nextFailure = null;
    return {
        name: 'stress-replay-facade-test',
        store,
        batches,
        failNext(mode) {
            nextFailure = mode;
        },
        async open() {},
        async loadAll() {
            return Object.fromEntries(store.entries());
        },
        async saveBatch(batch) {
            const failure = nextFailure;
            nextFailure = failure === 'write_and_rollback' ? 'write_and_rollback' : null;
            batches.push({
                deletes: [...batch.deletes],
                upserts: batch.upserts.map(([key, value]) => [key, value])
            });
            if (failure === 'readback_mismatch') return;
            batch.deletes.forEach(key => store.delete(String(key)));
            batch.upserts.forEach(([key, value]) => store.set(String(key), String(value)));
            if (failure === 'write_once') {
                throw new Error('controlled write failure');
            }
            if (failure === 'write_and_rollback') {
                throw new Error('controlled persistent write failure');
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
assertEqual(loaded.workspace.sourceIdentity.schemaVersion, 'StressReplaySourceIdentityV2',
    'New persisted workspaces carry executable V2 source evidence');
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

console.log('Test 9: default facade path is transactional, verified and isolated');
{
    const sentinelKey = 'stress-replay-unrelated-sentinel';
    const sentinelValue = 'must-remain-byte-identical';
    const facadeAdapter = createFacadeAdapter({ [sentinelKey]: sentinelValue });
    try {
        resetPersistenceForTests(facadeAdapter);
        await initPersistence();

        const first = workspaceFixture(21);
        const firstSerialized = JSON.stringify(first);
        const firstSave = await saveStressReplayWorkspaceV1(first);
        assertEqual(firstSave.replaced, false, 'Default facade path stores the first workspace');
        assertEqual(facadeAdapter.store.get(STRESS_REPLAY_ACTIVE_STORAGE_KEY), firstSerialized,
            'First save is confirmed by backend readback');
        assertEqual(facadeAdapter.store.get(sentinelKey), sentinelValue, 'First save preserves unrelated records');

        const batchesAfterFirstSave = facadeAdapter.batches.length;
        const unchanged = await saveStressReplayWorkspaceV1(first);
        assertEqual(unchanged.unchanged, true, 'Unchanged default save is idempotent');
        assertEqual(facadeAdapter.batches.length, batchesAfterFirstSave, 'Unchanged save performs no backend write');

        const replacement = workspaceFixture(22);
        await saveStressReplayWorkspaceV1(replacement, { confirmReplace: true });
        assertEqual(facadeAdapter.store.get(STRESS_REPLAY_ACTIVE_STORAGE_KEY), JSON.stringify(replacement),
            'Confirmed replace is visible in the backend');
        assertEqual(facadeAdapter.store.get(sentinelKey), sentinelValue, 'Replace preserves unrelated records');

        await discardStressReplayWorkspaceV1({ confirmDiscard: true });
        assertEqual(facadeAdapter.store.has(STRESS_REPLAY_ACTIVE_STORAGE_KEY), false,
            'Confirmed discard is visible in the backend');
        assertEqual(facadeAdapter.store.get(sentinelKey), sentinelValue, 'Discard preserves unrelated records');

        await saveStressReplayWorkspaceV1(first);
        for (const [failureMode, expectedFailureCode] of [
            ['write_once', 'persistence_transaction_write_failed'],
            ['readback_mismatch', 'persistence_readback_mismatch']
        ]) {
            facadeAdapter.failNext(failureMode);
            let failure = null;
            try {
                await saveStressReplayWorkspaceV1(replacement, { confirmReplace: true });
            } catch (error) {
                failure = error;
            }
            assertEqual(failure?.code, 'STRESS_REPLAY_PERSISTENCE_WRITE_FAILED',
                `${failureMode} exposes the stable stress-replay error code`);
            assertEqual(failure?.details?.persistenceCode, 'restore_rolled_back',
                `${failureMode} exposes the stable facade outcome code`);
            assertEqual(failure?.details?.failureCode, expectedFailureCode,
                `${failureMode} exposes the stable primary failure code`);
            assertEqual(failure?.details?.rollbackFailed, false,
                `${failureMode} reports a verified compensating rollback`);
            assertEqual(facadeAdapter.store.get(STRESS_REPLAY_ACTIVE_STORAGE_KEY), firstSerialized,
                `${failureMode} restores the previous workspace byte-identically`);
            assertEqual(facadeAdapter.store.get(sentinelKey), sentinelValue,
                `${failureMode} preserves unrelated records`);
        }

        facadeAdapter.failNext('write_and_rollback');
        let rollbackFailure = null;
        try {
            await saveStressReplayWorkspaceV1(replacement, { confirmReplace: true });
        } catch (error) {
            rollbackFailure = error;
        }
        assertEqual(rollbackFailure?.code, 'STRESS_REPLAY_PERSISTENCE_WRITE_FAILED',
            'Failed rollback exposes the stable stress-replay error code');
        assertEqual(rollbackFailure?.details?.persistenceCode, 'rollback_failed',
            'Failed rollback exposes the stable facade error code');
        assertEqual(rollbackFailure?.details?.failureCode, 'persistence_transaction_write_failed',
            'Failed rollback retains the stable primary failure code');
        assertEqual(rollbackFailure?.details?.rollbackCode, 'persistence_transaction_rollback_failed',
            'Failed rollback exposes the stable rollback failure code');
        assertEqual(rollbackFailure?.details?.rollbackFailed, true,
            'Failed rollback is machine-readable');
        assert(Boolean(rollbackFailure?.details?.rollbackCause), 'Failed rollback retains its diagnostic cause');
        assertEqual(facadeAdapter.store.get(sentinelKey), sentinelValue,
            'Failed rollback never mutates unrelated records');
    } finally {
        resetPersistenceRuntimeForTests();
    }
}

console.log('Test 10: legacy V1 workspaces remain inspectable but never synthesize source evidence');
{
    const legacyWorkspace = structuredClone(workspaceFixture(31));
    delete legacyWorkspace.sourceIdentity;
    legacyWorkspace.workspaceFingerprint = createStressReplayWorkspaceFingerprint(legacyWorkspace);
    const legacyBackend = createBackend(JSON.stringify(legacyWorkspace));
    const legacyLoaded = loadStressReplayWorkspaceV1({
        backend: legacyBackend.backend,
        currentCompatibility: {
            contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
            dataFingerprint: fingerprint('a'),
            engineFingerprint: fingerprint('b')
        }
    });
    assertEqual(legacyLoaded.status, 'read_only', 'Legacy workspace is available for inspection only');
    assertEqual(legacyLoaded.compatibility.mismatchReasons.join(','), 'source_identity_unavailable',
        'Legacy read-only reason is stable and does not derive evidence from the path');
}

console.log('Test 11: checked-in V1 import remains non-mutating and fingerprint-stable');
{
    const legacyGoldenJson = readFileSync(
        new URL('./fixtures/stress-replay-comparison-export-v1.json', import.meta.url),
        'utf8'
    );
    const legacyMemory = createBackend();
    const inspection = inspectStressReplayImportV1(legacyGoldenJson, {
        currentCompatibility: {
            contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
            dataFingerprint: fingerprint('a'),
            engineFingerprint: fingerprint('b')
        }
    });
    assertEqual(legacyMemory.mutations.length, 0, 'V1 import inspection must not write storage');
    assertEqual(
        inspection.workspace.workspaceFingerprint.value,
        inspection.document.workspace.workspaceFingerprint.value,
        'V1 workspace fingerprint must survive import inspection'
    );
    assertEqual(
        inspection.workspace.variants[1].patch.strategy.maxSkimPctOfEq,
        12,
        'V1 alternative patch must survive without synthesized need leaves'
    );
    assertEqual(
        Object.hasOwn(inspection.workspace.variants[1].patch.strategy, 'minimumFlexAnnual'),
        false,
        'V1 import must not synthesize a minimum-flex patch'
    );
}

console.log('Test 12: V1 source evidence stays readable but requires explicit refix');
{
    const v1Workspace = structuredClone(workspaceFixture(32));
    v1Workspace.sourceIdentity = createStressReplaySourceIdentityV1({
        path: v1Workspace.path,
        sourceRows: [{ recordType: 'financial_year', jahr: 1, histJahr: null, wertAktien: 100 }]
    });
    v1Workspace.workspaceFingerprint = createStressReplayWorkspaceFingerprint(v1Workspace);
    const v1Backend = createBackend(JSON.stringify(v1Workspace));
    const v1Loaded = loadStressReplayWorkspaceV1({
        backend: v1Backend.backend,
        currentCompatibility: {
            contractVersion: STRESS_REPLAY_CONTRACT_VERSION,
            dataFingerprint: fingerprint('a'),
            engineFingerprint: fingerprint('b')
        }
    });
    assertEqual(v1Loaded.workspace.sourceIdentity.schemaVersion, 'StressReplaySourceIdentityV1',
        'V1 identity is preserved without migration');
    assertEqual(v1Loaded.status, 'read_only', 'V1 identity is never treated as executable');
    assertEqual(v1Loaded.compatibility.mismatchReasons.join(','), 'source_identity_refix_required',
        'V1 identity exposes the stable refix reason');
    assertEqual(v1Backend.store.get(STRESS_REPLAY_ACTIVE_STORAGE_KEY), JSON.stringify(v1Workspace),
        'Reading V1 does not rewrite persisted bytes');
}

console.log('Stress replay persistence tests passed.');
