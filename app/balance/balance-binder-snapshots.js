/**
 * Module: Balance Binder Snapshots
 * Purpose: Manages Snapshot UI actions (Create, Restore, Delete).
 *          It interfaces with the StorageManager to persist/retrieve specific application states.
 * Usage: Used by balance-binder.js to handle snapshot list interactions.
 * Dependencies: balance-config.js, balance-renderer.js, balance-storage.js
 */
import { StorageError } from './balance-config.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';
import { rollExpensesYear } from './balance-expenses.js';
import { PersistenceFacade } from '../shared/persistence-facade.js';
import { SnapshotArchive } from '../shared/snapshot-archive.js';
import {
    ANNUAL_PERIOD_STATUS,
    LEGACY_PERIOD_DECISION,
    completeAnnualPeriodCommit,
    createAnnualPeriodPlan,
    deriveCompletedCalendarYear,
    resolveLegacyAnnualPeriod,
    startAnnualPeriodCommit
} from './balance-annual-period.js';

export const ANNUAL_PERIOD_METADATA_KEY = 'annualPeriodMetadata';

function formatPeriodErrors(result) {
    return (result?.errors || []).map(entry => entry.message).filter(Boolean).join(' ')
        || 'Der Jahresperioden-Contract wurde verletzt.';
}

function chooseLegacyDecision(targetYear) {
    if (typeof prompt === 'function') {
        const answer = prompt(
            `Fuer den Jahresprozess ${targetYear} fehlen Periodenmetadaten. `
            + 'Bitte "offen", "abgeschlossen" oder "abbrechen" eingeben.',
            'offen'
        );
        if (answer === null || String(answer).trim().toLowerCase() === 'abbrechen') return LEGACY_PERIOD_DECISION.CANCEL;
        if (String(answer).trim().toLowerCase() === 'abgeschlossen') return LEGACY_PERIOD_DECISION.ALREADY_COMMITTED;
        if (String(answer).trim().toLowerCase() === 'offen') return LEGACY_PERIOD_DECISION.NOT_COMMITTED;
        return LEGACY_PERIOD_DECISION.CANCEL;
    }
    return confirm(`Bestaetigen Sie, dass die Jahresperiode ${targetYear} noch nicht abgeschlossen wurde.`)
        ? LEGACY_PERIOD_DECISION.NOT_COMMITTED
        : LEGACY_PERIOD_DECISION.CANCEL;
}

async function createAndVerifySnapshot({ handle, label }) {
    const before = new Set((await SnapshotArchive.listSnapshots()).map(entry => entry.id));
    const created = await StorageManager.createSnapshot(handle, label);
    const candidates = (await SnapshotArchive.listSnapshots())
        .filter(entry => !before.has(entry.id))
        .sort((left, right) => String(right.createdAt).localeCompare(String(left.createdAt)));
    const snapshotId = created?.id || candidates[0]?.id;
    if (!snapshotId) throw new Error('Der Recovery-Snapshot konnte nicht eindeutig bestaetigt werden.');
    const snapshot = await SnapshotArchive.readSnapshot(snapshotId);
    if (!snapshot || snapshot.id !== snapshotId || !snapshot.records || typeof snapshot.records !== 'object') {
        throw new Error('Der Recovery-Snapshot konnte nicht validiert werden.');
    }
    return snapshotId;
}

export function createSnapshotHandlers({
    dom,
    appState,
    debouncedUpdate,
    applyAnnualInflation,
    runAnnualUpdate = async () => ({ ok: true }),
    validateLiveState = () => ({ ok: true }),
    getTargetYear = () => {
        const selectedYear = Number(dom.expenses?.yearSelect?.value);
        return Number.isInteger(selectedYear) ? selectedYear : deriveCompletedCalendarYear(new Date());
    },
    getLegacyDecision = chooseLegacyDecision,
    rollExpensesYearFn = rollExpensesYear,
    flushLiveState = async ({ sync = false } = {}) => {
        if (sync && typeof debouncedUpdate === 'function') debouncedUpdate();
        await PersistenceFacade.flush();
    }
}) {
    let annualCloseInFlight = false;

    const persistMetadata = async (metadata) => {
        const state = StorageManager.loadState();
        state[ANNUAL_PERIOD_METADATA_KEY] = metadata;
        StorageManager.saveState(state);
        await flushLiveState({ sync: false });
    };

    return {
        async handleJahresabschluss() {
            if (annualCloseInFlight) {
                UIRenderer.toast('Der Jahresprozess laeuft bereits.', false);
                return { status: 'in_flight' };
            }

            const label = dom.inputs.profilName.value.trim();
            const targetYear = getTargetYear();
            const expectedTargetYear = deriveCompletedCalendarYear(new Date());
            if (targetYear !== expectedTargetYear) {
                const result = {
                    status: ANNUAL_PERIOD_STATUS.INVALID,
                    errors: [{
                        code: 'ANNUAL_PERIOD_UI_YEAR_MISMATCH',
                        field: 'expenses.yearSelect',
                        message: `Der Ausgaben-Check muss fuer den Abschluss auf ${expectedTargetYear} stehen.`
                    }]
                };
                UIRenderer.handleError(new Error(formatPeriodErrors(result)));
                return result;
            }
            let state = StorageManager.loadState();
            const currentAgeInput = dom.inputs.aktuellesAlter?.value ?? state.inputs?.aktuellesAlter ?? 0;
            const currentAge = Number.parseInt(currentAgeInput, 10);
            let metadata = state[ANNUAL_PERIOD_METADATA_KEY];
            let planning = createAnnualPeriodPlan({ targetYear, currentAge, metadata });

            if (planning.status === ANNUAL_PERIOD_STATUS.LEGACY_CONFIRMATION_REQUIRED) {
                const resolution = resolveLegacyAnnualPeriod({
                    targetYear,
                    decision: getLegacyDecision(targetYear)
                });
                if (!resolution.metadata) return resolution;
                metadata = resolution.metadata;
                await persistMetadata(metadata);
                planning = createAnnualPeriodPlan({ targetYear, currentAge, metadata });
            }

            if (planning.status === ANNUAL_PERIOD_STATUS.ALREADY_COMMITTED) {
                UIRenderer.toast(`Die Jahresperiode ${targetYear} wurde bereits abgeschlossen.`, false);
                return planning;
            }
            if (planning.status !== ANNUAL_PERIOD_STATUS.READY || !planning.plan) {
                UIRenderer.handleError(new Error(formatPeriodErrors(planning)));
                return planning;
            }

            if (!confirm(`Soll die Jahresperiode ${targetYear} ${label ? `fuer "${label}" ` : ''}jetzt abgeschlossen werden?\n\nDabei werden Alter (+1), Inflation und Marktdaten aktualisiert und der Ausgaben-Check auf ${planning.plan.expenses.nextYear} umgestellt. Vor der ersten Aenderung wird ein Recovery-Snapshot erstellt.`)) return;

            annualCloseInFlight = true;
            let commitStarted = false;
            try {
                const validation = await validateLiveState();
                if (!validation?.ok) throw validation?.error || new Error('Die Balance-Vorpruefung ist fehlgeschlagen.');

                await flushLiveState({ sync: true });
                const snapshotId = await createAndVerifySnapshot({ handle: appState.snapshotHandle, label });
                UIRenderer.toast(`Jahresabschluss-Snapshot ${label ? `"${label}" ` : ''}erfolgreich erstellt.`);

                const started = startAnnualPeriodCommit({ plan: planning.plan, metadata, snapshotId });
                if (!started.metadata) throw new Error(formatPeriodErrors(started));
                metadata = started.metadata;
                await persistMetadata(metadata);
                commitStarted = true;

                metadata = {
                    ...metadata,
                    pendingCommit: { ...metadata.pendingCommit, phase: 'writes_started' }
                };
                await persistMetadata(metadata);

                const annualUpdate = await runAnnualUpdate({ failOnStepError: true });
                if (!annualUpdate?.ok) {
                    throw annualUpdate?.error || new Error('Das Jahres-Update wurde nicht vollstaendig ausgefuehrt.');
                }
                applyAnnualInflation();
                const nextYear = rollExpensesYearFn();

                metadata = {
                    ...metadata,
                    pendingCommit: { ...metadata.pendingCommit, phase: 'validating' }
                };
                await persistMetadata(metadata);

                const ageAfter = Number.parseInt(dom.inputs.aktuellesAlter?.value, 10);
                if (Number.isFinite(ageAfter) && ageAfter !== planning.plan.age.after) {
                    throw new Error(`Post-Write-Validierung: Alter ${planning.plan.age.after} wurde erwartet.`);
                }
                if (nextYear !== planning.plan.expenses.nextYear) {
                    throw new Error(`Post-Write-Validierung: Ausgabenjahr ${planning.plan.expenses.nextYear} wurde erwartet.`);
                }
                await flushLiveState({ sync: true });

                const completed = completeAnnualPeriodCommit({ periodId: planning.plan.periodId, metadata });
                if (!completed.metadata) throw new Error(formatPeriodErrors(completed));
                try {
                    await persistMetadata(completed.metadata);
                } catch (finalFlushError) {
                    await persistMetadata(metadata).catch(() => {});
                    throw finalFlushError;
                }

                UIRenderer.toast(`Ausgaben-Check auf ${nextYear} umgestellt.`);
                await StorageManager.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, appState.snapshotHandle);
                return completed;
            } catch (err) {
                if (commitStarted) {
                    const recoveryError = new Error(
                        `Der Jahresprozess ist unvollstaendig. Stellen Sie zuerst den Recovery-Snapshot `
                        + `"${metadata.pendingCommit?.snapshotId || 'unbekannt'}" wieder her. Ursache: ${err.message || err}`
                    );
                    UIRenderer.handleError(recoveryError);
                    return { status: ANNUAL_PERIOD_STATUS.INCOMPLETE_RECOVERY, error: recoveryError };
                }
                UIRenderer.handleError(err);
                return { status: ANNUAL_PERIOD_STATUS.INVALID, error: err };
            } finally {
                annualCloseInFlight = false;
            }
        },

        async handleSnapshotActions(e) {
            const restoreBtn = e.target.closest('.restore-snapshot');
            const deleteBtn = e.target.closest('.delete-snapshot');
            try {
                if (restoreBtn) {
                    const key = restoreBtn.dataset.key;
                    const snapshotName = key.replace('.json', '');
                    if (confirm(`Snapshot "${snapshotName}" wiederherstellen?\n\nStandard-Restore setzt das aktive Profil und die Balance-Daten auf den Snapshot-Stand. Andere Profile, technische Einstellungen und die Snapshot-Historie bleiben erhalten.`)) {
                        await StorageManager.restoreSnapshot(key, appState.snapshotHandle);
                    }
                }
                if (deleteBtn) {
                    const key = deleteBtn.dataset.key;
                    if (confirm(`Diesen Snapshot wirklich endgültig löschen?`)) {
                        await StorageManager.deleteSnapshot(key, appState.snapshotHandle);
                    }
                }
            } catch (err) {
                UIRenderer.handleError(new StorageError("Snapshot-Aktion fehlgeschlagen.", { originalError: err }));
            }
        }
    };
}
