"use strict";

import { STRESS_REPLAY_ACTIVE_STORAGE_KEY } from '../shared/persistence-key-policy.js';
import {
    flush,
    persistenceStorage,
    replaceRecordsTransactional
} from '../shared/persistence-facade.js';
import {
    STRESS_REPLAY_CONTRACT_VERSION,
    STRESS_REPLAY_LIMITS,
    StressReplayContractError,
    validateStressReplayWorkspaceV1
} from './stress-replay-contract.js';
import { parseStressReplayComparisonExportV1 } from './stress-replay-export.js';

export { STRESS_REPLAY_ACTIVE_STORAGE_KEY };

function fail(code, message, details = {}) {
    throw new StressReplayContractError(code, message, details);
}

function resolveBackend(backend = {}) {
    const storage = backend.storage || persistenceStorage;
    if (!storage
        || typeof storage.getItem !== 'function'
        || typeof storage.setItem !== 'function'
        || typeof storage.removeItem !== 'function') {
        fail('STRESS_REPLAY_PERSISTENCE_BACKEND_INVALID', 'Persistence backend does not implement the storage contract');
    }
    return {
        storage,
        flush: typeof backend.flush === 'function' ? backend.flush : flush,
        transactionalReplace: backend.storage || backend.flush
            ? null
            : replaceRecordsTransactional
    };
}

function fingerprintMatches(left, right) {
    return left?.algorithm === right?.algorithm
        && typeof left?.value === 'string'
        && left.value === right?.value;
}

function serializedBytes(serialized, subject) {
    const bytes = new TextEncoder().encode(serialized).byteLength;
    if (bytes > STRESS_REPLAY_LIMITS.maximumEnvelopeBytes) {
        fail('STRESS_REPLAY_PERSISTENCE_SIZE_LIMIT', `${subject} exceeds its size limit`, {
            subject,
            bytes,
            maximumBytes: STRESS_REPLAY_LIMITS.maximumEnvelopeBytes
        });
    }
    return bytes;
}

function transactionalFailureDetails(cause) {
    return {
        cause: cause?.cause?.message || cause?.message || String(cause),
        persistenceCode: cause?.code || 'persistence_transaction_failed',
        failureCode: cause?.failureCode || cause?.code || 'persistence_transaction_failed',
        rollbackFailed: cause?.code === 'rollback_failed',
        rollbackCause: cause?.rollbackError?.message || null,
        rollbackCode: cause?.rollbackCode || null
    };
}

function parseWorkspace(serialized) {
    if (typeof serialized !== 'string') {
        fail('STRESS_REPLAY_PERSISTENCE_CORRUPT', 'Persisted stress replay workspace must be JSON text');
    }
    serializedBytes(serialized, 'workspace');
    let parsed;
    try {
        parsed = JSON.parse(serialized);
    } catch (cause) {
        fail('STRESS_REPLAY_PERSISTENCE_CORRUPT', 'Persisted stress replay workspace is not valid JSON', {
            cause: cause?.message || String(cause)
        });
    }
    return validateStressReplayWorkspaceV1(parsed);
}

export function classifyStressReplayWorkspaceCompatibility(workspace, current = {}) {
    const validated = validateStressReplayWorkspaceV1(workspace);
    const mismatchReasons = [];
    if (current.contractVersion !== undefined && current.contractVersion !== STRESS_REPLAY_CONTRACT_VERSION) {
        mismatchReasons.push('contract_version_mismatch');
    }
    if (current.dataFingerprint === undefined) {
        mismatchReasons.push('current_data_fingerprint_unavailable');
    } else if (!fingerprintMatches(current.dataFingerprint, validated.path.dataFingerprint)) {
        mismatchReasons.push('data_fingerprint_mismatch');
    }
    if (current.engineFingerprint === undefined) {
        mismatchReasons.push('current_engine_fingerprint_unavailable');
    } else if (!fingerprintMatches(current.engineFingerprint, validated.path.engineFingerprint)) {
        mismatchReasons.push('engine_fingerprint_mismatch');
    }
    return Object.freeze({
        status: mismatchReasons.length === 0 ? 'executable' : 'read_only',
        executable: mismatchReasons.length === 0,
        readOnly: mismatchReasons.length > 0,
        mismatchReasons: Object.freeze(mismatchReasons)
    });
}

export function inspectStressReplayWorkspaceV1(workspace, { currentCompatibility = {} } = {}) {
    const validated = validateStressReplayWorkspaceV1(workspace);
    return Object.freeze({
        workspace: validated,
        compatibility: classifyStressReplayWorkspaceCompatibility(validated, currentCompatibility)
    });
}

export function loadStressReplayWorkspaceV1({ backend, currentCompatibility = {} } = {}) {
    const { storage } = resolveBackend(backend);
    const serialized = storage.getItem(STRESS_REPLAY_ACTIVE_STORAGE_KEY);
    if (serialized === null || serialized === undefined) {
        return Object.freeze({ status: 'empty', workspace: null, compatibility: null, error: null });
    }
    try {
        const inspected = inspectStressReplayWorkspaceV1(parseWorkspace(serialized), { currentCompatibility });
        return Object.freeze({
            status: inspected.compatibility.status,
            workspace: inspected.workspace,
            compatibility: inspected.compatibility,
            error: null
        });
    } catch (error) {
        return Object.freeze({
            status: 'corrupt',
            workspace: null,
            compatibility: null,
            error: Object.freeze({
                code: error?.code || 'STRESS_REPLAY_PERSISTENCE_CORRUPT',
                message: error?.message || String(error)
            })
        });
    }
}

async function restorePreviousValue(storage, flushBackend, previousValue) {
    if (previousValue === null || previousValue === undefined) {
        storage.removeItem(STRESS_REPLAY_ACTIVE_STORAGE_KEY);
    } else {
        storage.setItem(STRESS_REPLAY_ACTIVE_STORAGE_KEY, previousValue);
    }
    await flushBackend();
}

export async function saveStressReplayWorkspaceV1(workspace, {
    backend,
    confirmReplace = false
} = {}) {
    const validated = validateStressReplayWorkspaceV1(workspace);
    const serialized = JSON.stringify(validated);
    const bytes = serializedBytes(serialized, 'workspace');
    const { storage, flush: flushBackend, transactionalReplace } = resolveBackend(backend);
    const previousValue = storage.getItem(STRESS_REPLAY_ACTIVE_STORAGE_KEY);
    if (previousValue !== null && previousValue !== undefined) {
        try {
            const previousWorkspace = parseWorkspace(previousValue);
            if (previousWorkspace.workspaceFingerprint.value === validated.workspaceFingerprint.value) {
                return Object.freeze({ ok: true, replaced: false, unchanged: true, bytes, workspace: previousWorkspace });
            }
        } catch {
            // Corrupt data is deliberately retained until an explicit replacement or discard.
        }
        if (confirmReplace !== true) {
            fail('STRESS_REPLAY_REPLACE_CONFIRMATION_REQUIRED', 'Replacing the active stress replay workspace requires confirmation');
        }
    }
    try {
        if (transactionalReplace) {
            await transactionalReplace({ [STRESS_REPLAY_ACTIVE_STORAGE_KEY]: serialized }, {
                allowKey: key => key === STRESS_REPLAY_ACTIVE_STORAGE_KEY
            });
            return Object.freeze({
                ok: true,
                replaced: previousValue !== null && previousValue !== undefined,
                unchanged: false,
                bytes,
                workspace: validated
            });
        }
        storage.setItem(STRESS_REPLAY_ACTIVE_STORAGE_KEY, serialized);
        await flushBackend();
        if (storage.getItem(STRESS_REPLAY_ACTIVE_STORAGE_KEY) !== serialized) {
            throw new Error('Persistence readback does not match the requested workspace');
        }
    } catch (cause) {
        if (transactionalReplace) {
            fail('STRESS_REPLAY_PERSISTENCE_WRITE_FAILED', 'Stress replay workspace could not be stored atomically', {
                ...transactionalFailureDetails(cause)
            });
        }
        let rollbackError = null;
        try {
            await restorePreviousValue(storage, flushBackend, previousValue);
        } catch (error) {
            rollbackError = error;
        }
        fail('STRESS_REPLAY_PERSISTENCE_WRITE_FAILED', 'Stress replay workspace could not be stored atomically', {
            cause: cause?.message || String(cause),
            rollbackFailed: rollbackError !== null,
            rollbackCause: rollbackError?.message || null
        });
    }
    return Object.freeze({
        ok: true,
        replaced: previousValue !== null && previousValue !== undefined,
        unchanged: false,
        bytes,
        workspace: validated
    });
}

export async function discardStressReplayWorkspaceV1({ backend, confirmDiscard = false } = {}) {
    if (confirmDiscard !== true) {
        fail('STRESS_REPLAY_DISCARD_CONFIRMATION_REQUIRED', 'Discarding the active stress replay workspace requires confirmation');
    }
    const { storage, flush: flushBackend, transactionalReplace } = resolveBackend(backend);
    const previousValue = storage.getItem(STRESS_REPLAY_ACTIVE_STORAGE_KEY);
    if (previousValue === null || previousValue === undefined) {
        return Object.freeze({ ok: true, discarded: false });
    }
    try {
        if (transactionalReplace) {
            await transactionalReplace({}, {
                allowKey: key => key === STRESS_REPLAY_ACTIVE_STORAGE_KEY
            });
            return Object.freeze({ ok: true, discarded: true });
        }
        storage.removeItem(STRESS_REPLAY_ACTIVE_STORAGE_KEY);
        await flushBackend();
        if (storage.getItem(STRESS_REPLAY_ACTIVE_STORAGE_KEY) !== null) {
            throw new Error('Persistence readback still contains the discarded workspace');
        }
    } catch (cause) {
        if (transactionalReplace) {
            fail('STRESS_REPLAY_PERSISTENCE_WRITE_FAILED', 'Stress replay workspace could not be discarded atomically', {
                ...transactionalFailureDetails(cause)
            });
        }
        try {
            await restorePreviousValue(storage, flushBackend, previousValue);
        } catch {
            // The stable error code remains sufficient; backend recovery is surfaced by reload diagnostics.
        }
        fail('STRESS_REPLAY_PERSISTENCE_WRITE_FAILED', 'Stress replay workspace could not be discarded atomically', {
            cause: cause?.message || String(cause)
        });
    }
    return Object.freeze({ ok: true, discarded: true });
}

export function inspectStressReplayImportV1(serialized, { currentCompatibility = {} } = {}) {
    const document = parseStressReplayComparisonExportV1(serialized);
    const inspected = inspectStressReplayWorkspaceV1(document.workspace, { currentCompatibility });
    return Object.freeze({ document, ...inspected });
}

export async function replaceStressReplayFromImportV1(serialized, {
    backend,
    confirmReplace = false,
    currentCompatibility = {}
} = {}) {
    const inspected = inspectStressReplayImportV1(serialized, { currentCompatibility });
    const saved = await saveStressReplayWorkspaceV1(inspected.workspace, { backend, confirmReplace });
    return Object.freeze({ ...saved, document: inspected.document, compatibility: inspected.compatibility });
}
