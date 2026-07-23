import {
    BALANCE_STATE_LIFECYCLE_KEY,
    BALANCE_UPDATE_MODE,
    BalanceStateLifecycleError,
    assertBalanceCandidateFresh,
    createBalanceFingerprint,
    persistBalanceUpdate,
    prepareEngineLastState,
    resolveBalanceUpdateRequest
} from '../app/balance/balance-update-pipeline.js';

console.log('--- Balance Preview/Commit Contract Tests ---');

const PERIOD_ID = 'calendar-year:2025';

function captureError(callback) {
    try {
        callback();
        return null;
    } catch (error) {
        return error;
    }
}

console.log('Test 1: update modes are explicit and legacy dry-runs stay write-free');
{
    assertEqual(
        resolveBalanceUpdateRequest().mode,
        BALANCE_UPDATE_MODE.PERSIST_INPUTS,
        'Default updates persist only inputs'
    );
    assertEqual(
        resolveBalanceUpdateRequest({ mode: BALANCE_UPDATE_MODE.PREVIEW }).mode,
        BALANCE_UPDATE_MODE.PREVIEW,
        'Explicit preview mode is preserved'
    );
    assertEqual(
        resolveBalanceUpdateRequest({ persist: false }).mode,
        BALANCE_UPDATE_MODE.PREVIEW,
        'Legacy import dry-run maps to preview'
    );
    assertEqual(
        resolveBalanceUpdateRequest({ persist: true }).mode,
        BALANCE_UPDATE_MODE.PERSIST_INPUTS,
        'Legacy persist true can no longer commit fachlichen State'
    );

    const missingPeriod = captureError(() => resolveBalanceUpdateRequest({
        mode: BALANCE_UPDATE_MODE.COMMIT_PERIOD
    }));
    assert(missingPeriod instanceof BalanceStateLifecycleError, 'Commit without period id fails closed');

    const booleanCombination = captureError(() => resolveBalanceUpdateRequest({
        mode: BALANCE_UPDATE_MODE.PREVIEW,
        persist: false
    }));
    assert(booleanCombination instanceof BalanceStateLifecycleError, 'Mode and legacy boolean cannot be combined');
}

console.log('Test 2: engine candidates receive an isolated copy of fachlichen State');
{
    const persistentState = {
        inputs: { aktuellesAlter: 67 },
        lastState: {
            taxState: { lossCarry: 20000 },
            flexBudget: { balanceYears: 3 },
            vpw: { streak: 4 },
            lastWithdrawal: 36000
        }
    };
    const prepared = prepareEngineLastState(persistentState, persistentState.inputs);
    prepared.taxState.lossCarry = 0;
    prepared.flexBudget.balanceYears = 2;
    prepared.vpw.streak = 5;
    prepared.lastWithdrawal = 37000;

    assertEqual(persistentState.lastState.taxState.lossCarry, 20000, 'Preview keeps loss carry isolated');
    assertEqual(persistentState.lastState.flexBudget.balanceYears, 3, 'Preview keeps flex budget isolated');
    assertEqual(persistentState.lastState.vpw.streak, 4, 'Preview keeps VPW streak isolated');
    assertEqual(persistentState.lastState.lastWithdrawal, 36000, 'Preview keeps last withdrawal isolated');
}

console.log('Test 3: preview and input persistence never replace lastState');
{
    const saves = [];
    const persistentState = {
        inputs: { aktuellesAlter: 67, floorBedarf: 24000 },
        lastState: {
            taxState: { lossCarry: 20000 },
            flexBudget: { balanceYears: 3 },
            vpw: { streak: 4 }
        },
        annualPeriodMetadata: { lastCommittedPeriod: null, pendingCommit: null }
    };
    const storageManager = {
        loadState: () => persistentState,
        saveState: state => saves.push(structuredClone(state))
    };
    const modelResult = {
        newState: {
            taxState: { lossCarry: 0 },
            flexBudget: { balanceYears: 2 },
            vpw: { streak: 5 }
        }
    };

    const preview = persistBalanceUpdate({
        mode: BALANCE_UPDATE_MODE.PREVIEW,
        storageManager,
        persistentState,
        inputData: { aktuellesAlter: 67, floorBedarf: 25000 },
        modelResult
    });
    assertEqual(preview.persisted, false, 'Preview reports no persistence');
    assertEqual(saves.length, 0, 'Preview performs no storage write');

    const inputWrite = persistBalanceUpdate({
        mode: BALANCE_UPDATE_MODE.PERSIST_INPUTS,
        storageManager,
        persistentState,
        inputData: { aktuellesAlter: 67, floorBedarf: 25000 },
        modelResult
    });
    assertEqual(inputWrite.persisted, true, 'Input mode reports persistence');
    assertEqual(inputWrite.kind, BALANCE_UPDATE_MODE.PERSIST_INPUTS, 'Input mode reports its persistence kind');
    assertEqual(saves.length, 1, 'Input mode performs one storage write');
    assertEqual(saves[0].inputs.floorBedarf, 25000, 'Changed input is reload-fest');
    assertEqual(saves[0].lastState.taxState.lossCarry, 20000, 'Input mode keeps loss carry');
    assertEqual(saves[0].lastState.flexBudget.balanceYears, 3, 'Input mode keeps flex budget');
    assertEqual(saves[0].lastState.vpw.streak, 4, 'Input mode keeps VPW state');
}

console.log('Test 4: a valid period commit advances state exactly once');
{
    let currentState = {
        inputs: { aktuellesAlter: 68, floorBedarf: 25000 },
        lastState: {
            taxState: { lossCarry: 20000 },
            flexBudget: { balanceYears: 3 },
            vpw: { streak: 4 }
        },
        annualPeriodMetadata: {
            lastCommittedPeriod: null,
            pendingCommit: {
                periodId: PERIOD_ID,
                snapshotId: 'snapshot-2025',
                phase: 'validating'
            }
        }
    };
    let saveCount = 0;
    const storageManager = {
        loadState: () => structuredClone(currentState),
        saveState: state => {
            saveCount += 1;
            currentState = structuredClone(state);
        }
    };
    const modelResult = {
        newState: {
            taxState: { lossCarry: 15000 },
            flexBudget: { balanceYears: 2 },
            vpw: { streak: 5 }
        }
    };
    const fingerprints = {
        inputFingerprint: createBalanceFingerprint(currentState.inputs),
        baseStateFingerprint: createBalanceFingerprint(currentState.lastState),
        candidateStateFingerprint: createBalanceFingerprint(modelResult.newState)
    };

    const committed = persistBalanceUpdate({
        mode: BALANCE_UPDATE_MODE.COMMIT_PERIOD,
        periodId: PERIOD_ID,
        storageManager,
        persistentState: currentState,
        inputData: currentState.inputs,
        modelResult,
        fingerprints
    });
    assertEqual(committed.persisted, true, 'Commit reports persistence');
    assertEqual(committed.kind, BALANCE_UPDATE_MODE.COMMIT_PERIOD, 'Commit reports its persistence kind');
    assertEqual(saveCount, 1, 'First commit writes once');
    assertEqual(currentState.lastState.taxState.lossCarry, 15000, 'Commit advances loss carry');
    assertEqual(currentState.lastState.flexBudget.balanceYears, 2, 'Commit advances flex budget');
    assertEqual(currentState.lastState.vpw.streak, 5, 'Commit advances VPW state');
    assertEqual(
        currentState[BALANCE_STATE_LIFECYCLE_KEY].lastCommittedPeriod,
        PERIOD_ID,
        'Commit records period id in lifecycle metadata'
    );
    assertEqual(
        currentState[BALANCE_STATE_LIFECYCLE_KEY].candidateStateFingerprint,
        fingerprints.candidateStateFingerprint,
        'Commit records the candidate fingerprint'
    );

    const duplicate = captureError(() => persistBalanceUpdate({
        mode: BALANCE_UPDATE_MODE.COMMIT_PERIOD,
        periodId: PERIOD_ID,
        storageManager,
        persistentState: currentState,
        inputData: currentState.inputs,
        modelResult,
        fingerprints
    }));
    assert(duplicate instanceof BalanceStateLifecycleError, 'Duplicate period commit fails closed');
    assertEqual(duplicate.reason, 'period_already_committed', 'Duplicate exposes a stable reason');
    assertEqual(saveCount, 1, 'Duplicate period commit performs no second write');
}

console.log('Test 5: stale candidates and invalid annual metadata fail closed');
{
    const stable = createBalanceFingerprint({ state: 1, inputs: 2 });
    assertEqual(assertBalanceCandidateFresh(stable, stable), stable, 'Matching fingerprints remain valid');

    const stale = captureError(() => assertBalanceCandidateFresh(stable, createBalanceFingerprint({
        state: 2,
        inputs: 2
    })));
    assert(stale instanceof BalanceStateLifecycleError, 'Changed basis state blocks stale candidate');
    assertEqual(stale.reason, 'stale_candidate', 'Stale candidate exposes a stable reason');

    const storageManager = {
        loadState: () => ({}),
        saveState: () => {
            throw new Error('must not write');
        }
    };
    const invalidPeriod = captureError(() => persistBalanceUpdate({
        mode: BALANCE_UPDATE_MODE.COMMIT_PERIOD,
        periodId: PERIOD_ID,
        storageManager,
        persistentState: {
            annualPeriodMetadata: {
                lastCommittedPeriod: null,
                pendingCommit: {
                    periodId: 'calendar-year:2024',
                    snapshotId: 'snapshot-2024',
                    phase: 'validating'
                }
            }
        },
        inputData: {},
        modelResult: { newState: {} },
        fingerprints: {}
    }));
    assert(invalidPeriod instanceof BalanceStateLifecycleError, 'Mismatched pending period blocks commit');
    assertEqual(invalidPeriod.reason, 'period_mismatch', 'Period mismatch exposes a stable reason');
}

console.log('Test 6: multi-profile modes dispatch inputs and fachlichen State separately');
{
    const calls = [];
    const profilverbundHandlers = {
        persistProfilverbundInputs: (runs, context) => calls.push({ kind: 'inputs', runs, context }),
        persistProfilverbundProfileStates: (runs, context) => calls.push({ kind: 'commit', runs, context })
    };
    const profilverbundRuns = Object.assign([{ profileId: 'p1' }, { profileId: 'p2' }], {
        householdResult: { newState: { taxState: { lossCarry: 0 } } }
    });
    const persistentState = {
        annualPeriodMetadata: {
            lastCommittedPeriod: null,
            pendingCommit: {
                periodId: PERIOD_ID,
                snapshotId: 'snapshot-multi',
                phase: 'validating'
            }
        }
    };

    persistBalanceUpdate({
        mode: BALANCE_UPDATE_MODE.PERSIST_INPUTS,
        profilverbundRuns,
        profilverbundHandlers,
        storageManager: {},
        persistentState,
        inputData: { floorBedarf: 25000 },
        modelResult: profilverbundRuns.householdResult
    });
    assertEqual(calls.length, 1, 'Multi-profile input mode dispatches once');
    assertEqual(calls[0].kind, 'inputs', 'Multi-profile input mode uses input-only writer');

    persistBalanceUpdate({
        mode: BALANCE_UPDATE_MODE.COMMIT_PERIOD,
        periodId: PERIOD_ID,
        profilverbundRuns,
        profilverbundHandlers,
        storageManager: {},
        persistentState,
        inputData: { floorBedarf: 25000 },
        modelResult: profilverbundRuns.householdResult,
        fingerprints: {
            inputFingerprint: 'input',
            baseStateFingerprint: 'base',
            candidateStateFingerprint: 'candidate'
        }
    });
    assertEqual(calls.length, 2, 'Multi-profile commit dispatches once');
    assertEqual(calls[1].kind, 'commit', 'Multi-profile commit uses fachlichen state writer');
    assertEqual(
        calls[1].context.lifecycle.lastCommittedPeriod,
        PERIOD_ID,
        'Multi-profile commit receives the same lifecycle period'
    );
}

console.log('Balance preview/commit contract tests passed');
