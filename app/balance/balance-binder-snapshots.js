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
import { createBalanceWealthHistoryService } from './balance-wealth-history.js';
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
    wealthHistory = createBalanceWealthHistoryService(),
    onAnnualWealthSaved = () => {},
    getReferenceDate = () => new Date(),
    getTargetYear = () => {
        const selectedYear = Number(dom.expenses?.yearSelect?.value);
        return Number.isInteger(selectedYear) ? selectedYear : deriveCompletedCalendarYear(getReferenceDate());
    },
    getLegacyDecision = chooseLegacyDecision,
    rollExpensesYearFn = rollExpensesYear,
    flushLiveState = async ({ sync = false } = {}) => {
        if (sync && typeof debouncedUpdate === 'function') debouncedUpdate();
        await PersistenceFacade.flush();
    },
    commitLiveState = async () => {
        throw new Error('Der periodengebundene Balance-Commit ist nicht konfiguriert.');
    }
}) {
    let annualCloseInFlight = false;

    const persistMetadata = async (metadata, context) => {
        if (context) wealthHistory.assertContext(context);
        const state = StorageManager.loadState();
        state[ANNUAL_PERIOD_METADATA_KEY] = metadata;
        StorageManager.saveState(state);
        await flushLiveState({ sync: false });
        if (context) wealthHistory.assertContext(context);
    };

    return {
        async handleJahresabschluss() {
            if (annualCloseInFlight) {
                UIRenderer.toast('Der Jahresprozess laeuft bereits.', false);
                return { status: 'in_flight' };
            }

            annualCloseInFlight = true;
            let metadata;
            let commitStarted = false;
            let completedResult;
            let annualWealthSaved = false;
            let context;
            let targetYear;
            let referenceDate;
            const execute = async (capturedContext) => {
                context = capturedContext;
                const checkContext = () => { if (context) wealthHistory.assertContext(context); };
                const label = dom.inputs.profilName.value.trim();
                const expectedTargetYear = deriveCompletedCalendarYear(referenceDate);
                if (targetYear !== expectedTargetYear) {
                    const result = {
                        status: ANNUAL_PERIOD_STATUS.INVALID,
                        errors: [{
                            code: 'ANNUAL_PERIOD_UI_YEAR_MISMATCH',
                            field: 'expenses.yearSelect',
                            message: `Der Ausgaben-Check muss fuer den Abschluss auf ${expectedTargetYear} stehen.`
                        }]
                    };
                    UIRenderer.handleActionError(new Error(formatPeriodErrors(result)), 'annual');
                    return result;
                }
                const state = StorageManager.loadState();
                const currentAgeInput = dom.inputs.aktuellesAlter?.value ?? state.inputs?.aktuellesAlter ?? 0;
                const currentAge = Number.parseInt(currentAgeInput, 10);
                metadata = state[ANNUAL_PERIOD_METADATA_KEY];
                let planning = createAnnualPeriodPlan({ targetYear, currentAge, metadata });

                if (planning.status === ANNUAL_PERIOD_STATUS.LEGACY_CONFIRMATION_REQUIRED) {
                    const resolution = resolveLegacyAnnualPeriod({
                        targetYear,
                        decision: getLegacyDecision(targetYear)
                    });
                    if (!resolution.metadata) return resolution;
                    metadata = resolution.metadata;
                    await persistMetadata(metadata, context);
                    planning = createAnnualPeriodPlan({ targetYear, currentAge, metadata });
                }

                if (planning.status === ANNUAL_PERIOD_STATUS.ALREADY_COMMITTED) {
                    UIRenderer.clearActionError('annual');
                    UIRenderer.toast(`Die Jahresperiode ${targetYear} wurde bereits abgeschlossen.`, false);
                    return planning;
                }
                if (planning.status !== ANNUAL_PERIOD_STATUS.READY || !planning.plan) {
                    UIRenderer.handleActionError(new Error(formatPeriodErrors(planning)), 'annual');
                    return planning;
                }

                if (!confirm(`Soll die Jahresperiode ${targetYear} ${label ? `fuer "${label}" ` : ''}jetzt abgeschlossen werden?\n\nDabei werden Alter (+1), Inflation und Marktdaten aktualisiert und der Ausgaben-Check auf ${planning.plan.expenses.nextYear} umgestellt. Vor der ersten Aenderung wird ein Recovery-Snapshot erstellt.`)) return;

                UIRenderer.clearActionError('annual');
                const validation = await validateLiveState();
                checkContext();
                if (!validation?.ok) throw validation?.error || new Error('Die Balance-Vorpruefung ist fehlgeschlagen.');

                await flushLiveState({ sync: true });
                checkContext();
                const snapshotId = await createAndVerifySnapshot({ handle: appState.snapshotHandle, label });
                checkContext();
                UIRenderer.toast(`Jahresabschluss-Snapshot ${label ? `"${label}" ` : ''}erfolgreich erstellt.`);

                const started = startAnnualPeriodCommit({ plan: planning.plan, metadata, snapshotId });
                if (!started.metadata) throw new Error(formatPeriodErrors(started));
                metadata = started.metadata;
                commitStarted = true;
                await persistMetadata(metadata, context);

                metadata = {
                    ...metadata,
                    pendingCommit: { ...metadata.pendingCommit, phase: 'writes_started' }
                };
                await persistMetadata(metadata, context);

                const annualUpdate = await runAnnualUpdate({ failOnStepError: true, nested: true });
                checkContext();
                if (!annualUpdate?.ok) {
                    throw annualUpdate?.error || new Error('Das Jahres-Update wurde nicht vollstaendig ausgefuehrt.');
                }
                applyAnnualInflation();
                const nextYear = rollExpensesYearFn();

                metadata = {
                    ...metadata,
                    pendingCommit: { ...metadata.pendingCommit, phase: 'validating' }
                };
                await persistMetadata(metadata, context);

                const ageAfter = Number.parseInt(dom.inputs.aktuellesAlter?.value, 10);
                if (Number.isFinite(ageAfter) && ageAfter !== planning.plan.age.after) {
                    throw new Error(`Post-Write-Validierung: Alter ${planning.plan.age.after} wurde erwartet.`);
                }
                if (nextYear !== planning.plan.expenses.nextYear) {
                    throw new Error(`Post-Write-Validierung: Ausgabenjahr ${planning.plan.expenses.nextYear} wurde erwartet.`);
                }
                const commitResult = await commitLiveState({ periodId: planning.plan.periodId });
                checkContext();

                const completed = completeAnnualPeriodCommit({ periodId: planning.plan.periodId, metadata });
                if (!completed.metadata) throw new Error(formatPeriodErrors(completed));
                if (planning.plan.targetYear >= 2026) {
                    await wealthHistory.finalizeAnnual({
                        context,
                        result: commitResult,
                        targetYear: planning.plan.targetYear,
                        metadata: completed.metadata,
                        expectedPending: metadata
                    });
                    annualWealthSaved = true;
                } else {
                    try {
                        await persistMetadata(completed.metadata, context);
                    } catch (finalFlushError) {
                        await persistMetadata(metadata, context).catch(() => {});
                        throw finalFlushError;
                    }
                }
                completedResult = completed;
                // UI-Fehler nach bestätigtem Write dürfen keine Recovery behaupten.
                UIRenderer.toast(`Ausgaben-Check auf ${nextYear} umgestellt.${annualWealthSaved ? ' Vermögensstand gesichert.' : ''}`);
                if (annualWealthSaved) onAnnualWealthSaved();
                await StorageManager.renderSnapshots(dom.outputs.snapshotList, dom.controls.snapshotStatus, appState.snapshotHandle);
                return completed;
            };
            try {
                // Vor dem ersten await sperren, einschließlich der Legacy-Bestätigung.
                targetYear = getTargetYear();
                referenceDate = getReferenceDate();
                return targetYear >= 2026
                    ? await wealthHistory.runAnnual(execute)
                    : await execute(null);
            } catch (err) {
                if (completedResult) {
                    UIRenderer.handleActionError(err, 'annual');
                    return completedResult;
                }
                if (commitStarted) {
                    const recoveryError = new Error(
                        `Der Jahresprozess ist unvollstaendig. Stellen Sie zuerst den Recovery-Snapshot `
                        + `"${metadata.pendingCommit?.snapshotId || 'unbekannt'}" wieder her. Ursache: ${err.message || err}`
                    );
                    UIRenderer.handleActionError(recoveryError, 'annual');
                    return { status: ANNUAL_PERIOD_STATUS.INCOMPLETE_RECOVERY, error: recoveryError };
                }
                UIRenderer.handleActionError(err, 'annual');
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
                        UIRenderer.clearActionError('snapshots');
                        await StorageManager.restoreSnapshot(key, appState.snapshotHandle);
                    }
                }
                if (deleteBtn) {
                    const key = deleteBtn.dataset.key;
                    if (confirm(`Diesen Snapshot wirklich endgültig löschen?`)) {
                        UIRenderer.clearActionError('snapshots');
                        await StorageManager.deleteSnapshot(key, appState.snapshotHandle);
                    }
                }
            } catch (err) {
                UIRenderer.handleActionError(new StorageError("Snapshot-Aktion fehlgeschlagen.", { originalError: err }), 'snapshots');
            }
        }
    };
}
