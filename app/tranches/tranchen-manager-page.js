// @ts-check

import {
    getActiveProfileId,
    getCurrentProfileId,
    getProfileMeta,
    saveCurrentProfileFromLocalStorage
} from '../profile/profile-storage.js';
import {
    PROFILE_HEALTH_BUCKET_KEY,
    PROFILE_STORAGE_KEYS,
    PROFILE_TRANCHES_KEY,
    PROFILE_VALUE_KEYS
} from '../profile/profile-state.js';
import {
    applyProfileAssetValuesToDom,
    loadProfileAssetValues,
    ProfileAssetValuesValidationError,
    readProfileAssetValuesFromDom,
    saveProfileAssetValues,
    validateProfileAssetValues
} from '../profile/profile-asset-values.js';
import {
    calculateTrancheDerivedValues,
    loadReconciliationRegistryFromStorage,
    loadTranchesFromStorage,
    normalizeTranches,
    saveTranchesToStorage
} from './tranchen-manager-state.js';
import {
    ensureReconciliationCashControls,
    renderReconciliationCashStatuses,
    renderTranchenStats,
    renderTranchenTable
} from './tranchen-manager-renderer.js';
import { checkProxyHealth, fetchProxyPrice, fetchProxySymbol, LOCAL_YAHOO_PROXY } from './tranchen-price-service.js';
import {
    bindTrancheModalLifecycle,
    bindCashPostingModalLifecycle,
    closeCashPostingModal,
    clearTrancheFormError,
    closeTrancheModal,
    formatTrancheValidationError,
    openCreateTrancheModal,
    openEditTrancheModal,
    openCashPostingModal,
    readCashPostingForm,
    readTrancheFromForm,
    showCashPostingFormError,
    showTrancheFormError
} from './tranchen-manager-modal.js';
import { PersistenceFacade, persistenceStorage } from '../shared/persistence-facade.js';
import {
    commitCashPostingConfirmation,
    commitCashPostingCorrection,
    commitTrancheReconciliation,
    deriveCashConfirmationActionId,
    deriveCashCorrectionActionId,
    previewCashPostingConfirmation,
    previewCashPostingCorrection,
    previewTrancheReconciliation,
    projectReconciliationCashStatuses,
    TrancheReconciliationError
} from './tranche-reconciliation.js';

const state = {
    tranchen: [],
    confirmedTranches: [],
    confirmedRaw: null,
    corruptRaw: null,
    loadStatus: 'empty',
    editingIndex: -1,
    commitInFlight: false,
    pendingCommit: null,
    profileCommitInFlight: false,
    pendingProfileValues: null,
    profileSaveTimer: null,
    quoteBatchId: 0,
    quoteBatchController: null,
    quoteBatchPromise: null,
    persistenceMessage: '',
    persistenceError: '',
    taxMigrationWarning: '',
    rawRevealed: false,
    reconciliationPreview: null,
    pendingReconciliation: null,
    reconciliationStatus: '',
    reconciliationError: '',
    reconciliationCashStatuses: [],
    cashStatusError: '',
    cashPostingInFlight: false,
    pendingCashPosting: null,
    profileId: null,
    boundDocument: null,
    loader: loadTranchesFromStorage
};

const PROFILE_SAVE_DEBOUNCE_MS = 300;
const QUOTE_BATCH_CONCURRENCY = 3;
const QUOTE_BATCH_TIMEOUT_MS = 12000;

const RECONCILIATION_INPUT_IDS = [
    'reconcileActionId',
    'reconcileTrancheId',
    'reconcileExecutedAt',
    'reconcileSharesSold',
    'reconcileGrossProceeds',
    'reconcileFees',
    'reconcileRecommendedShares',
    'reconcileRecommendedGross',
    'reconcileCashStatus',
    'reconcileInitialCashBalance'
];

const PROFILE_INPUT_IDS = [
    'profileTagesgeld',
    'profileAlter',
    'profileRenteMonatlich',
    'profileSonstigeEinkuenfte',
    'profileGoldAktiv',
    'profileGoldZiel',
    'profileGoldFloor',
    'profileGoldBand',
    'profileGoldSteuerfrei',
    'profileHealthBucketEnabled',
    'profileHealthBucketInitialAmount',
    'profileHealthBucketAssetSource',
    'profileHealthBucketTriggerMinGrade',
    'profileHealthBucketTriggerMode',
    'profileHealthBucketCoverageMode',
    'profileHealthBucketReturnMode',
    'profileHealthBucketTargetMode'
];

const PROFILE_ASSET_STORAGE_KEYS = [
    ...Object.values(PROFILE_VALUE_KEYS),
    PROFILE_HEALTH_BUCKET_KEY
];

const PROFILE_ERROR_DOM_IDS = Object.freeze({
    tagesgeld: 'profileTagesgeld',
    renteMonatlich: 'profileRenteMonatlich',
    sonstigeEinkuenfte: 'profileSonstigeEinkuenfte',
    alter: 'profileAlter',
    goldAktiv: 'profileGoldAktiv',
    goldZiel: 'profileGoldZiel',
    goldFloor: 'profileGoldFloor',
    goldBand: 'profileGoldBand',
    goldSteuerfrei: 'profileGoldSteuerfrei',
    'healthBucket.enabled': 'profileHealthBucketEnabled',
    'healthBucket.initialAmount': 'profileHealthBucketInitialAmount',
    'healthBucket.assetSource': 'profileHealthBucketAssetSource',
    'healthBucket.triggerMinGrade': 'profileHealthBucketTriggerMinGrade',
    'healthBucket.triggerMode': 'profileHealthBucketTriggerMode',
    'healthBucket.coverageMode': 'profileHealthBucketCoverageMode',
    'healthBucket.returnMode': 'profileHealthBucketReturnMode',
    'healthBucket.targetMode': 'profileHealthBucketTargetMode'
});

function byId(id) {
    return document.getElementById(id);
}

function syncGlobalState() {
    window.tranchen = state.tranchen;
}

function render() {
    refreshReconciliationCashStatuses();
    renderTranchenStats(byId('stats'), state.tranchen);
    renderTranchenTable(byId('tranchenTable'), state.tranchen);
    renderReconciliationState();
    syncGlobalState();
}

function readStoredValue(key, fallback = null) {
    try {
        return persistenceStorage.getItem(key);
    } catch {
        return fallback;
    }
}

function restoreStoredValue(key, value) {
    try {
        if (value === null || value === undefined) {
            persistenceStorage.removeItem(key);
        } else {
            persistenceStorage.setItem(key, value);
        }
    } catch {
        // Der sichtbare bestaetigte Zustand bleibt auch dann erhalten, wenn das Backend nicht erreichbar ist.
    }
}

function setPersistenceStatus(message, kind = '') {
    const target = byId('tranchePersistenceStatus');
    if (!target) return;
    target.textContent = message;
    target.dataset.kind = kind;
}

export function describeLegacyTaxMigration(raw) {
    if (typeof raw !== 'string' || raw.trim() === '') return '';
    let records;
    try {
        records = JSON.parse(raw);
    } catch {
        return '';
    }
    if (!Array.isArray(records)) return '';
    const legacy = records.filter(record => {
        const version = record?.schemaVersion;
        return version === undefined || version === null || version === 0 || version === 1;
    });
    if (legacy.length === 0) return '';
    const goldExemptions = legacy.filter(record => (
        (record?.category === 'gold' || record?.type === 'gold' || record?.kind === 'gold')
        && Number(record?.tqf) === 1
        && typeof record?.taxExempt !== 'boolean'
    )).length;
    const resetNonEquityTqf = legacy.filter(record => (
        record?.category !== 'equity'
        && Number(record?.tqf) > 0
        && !((record?.category === 'gold' || record?.type === 'gold' || record?.kind === 'gold') && Number(record?.tqf) === 1)
    )).length;
    return `${legacy.length} Legacy-Tranche(n) wurden nur fuer die Anzeige auf den heutigen Steuervertrag migriert: `
        + `Steuerfreiheit standardmaessig nein, ${goldExemptions} alte Gold-TQF-1-Kodierung(en) als explizit steuerfrei, `
        + `${resetNonEquityTqf} unbelegte Nicht-Aktien-TQF auf 0. Bis Sie jede Tranche fachlich pruefen und speichern, `
        + 'rechnet die Simulation mit diesen konservativen Annahmen.';
}

function clearProfileValidationStatus() {
    const status = byId('profileValidationStatus');
    if (status) {
        status.textContent = '';
        status.hidden = true;
    }
    Object.values(PROFILE_ERROR_DOM_IDS).forEach(id => byId(id)?.removeAttribute?.('aria-invalid'));
}

function showProfileValidationStatus(error) {
    clearProfileValidationStatus();
    const first = error?.errors?.[0];
    const status = byId('profileValidationStatus');
    const message = first?.message || 'Die Profilwerte sind unvollständig oder ungültig.';
    if (status) {
        status.textContent = `Profilwerte nicht gespeichert: ${message}`;
        status.hidden = false;
    }
    const field = first ? byId(PROFILE_ERROR_DOM_IDS[first.field]) : null;
    field?.setAttribute?.('aria-invalid', 'true');
    return message;
}

function processingIsBlocked() {
    return state.commitInFlight
        || state.cashPostingInFlight
        || state.profileCommitInFlight
        || Boolean(state.quoteBatchPromise)
        || Boolean(state.pendingReconciliation)
        || Boolean(state.pendingCashPosting)
        || state.loadStatus === 'corrupt'
        || state.loadStatus === 'unavailable';
}

function setManagerControlsBlocked(blocked) {
    [
        'addTrancheBtn',
        'updatePricesBtn',
        'proxyHealthBtn',
        'clearTranchesBtn',
        'reconciliationPreviewBtn',
        'reconciliationConfirmBtn',
        'reconciliationCancelBtn',
        'cashPostingSubmitBtn',
        ...RECONCILIATION_INPUT_IDS,
        ...PROFILE_INPUT_IDS
    ].forEach(id => {
        const element = byId(id);
        if (element) element.disabled = blocked;
    });
    byId('reconciliationCashStatuses')?.querySelectorAll?.('[data-cash-action]')?.forEach?.(element => {
        element.disabled = blocked;
    });
    const cashCancel = byId('cashPostingCancelBtn');
    if (cashCancel) cashCancel.disabled = state.cashPostingInFlight;
}

function clearRawPreview() {
    state.rawRevealed = false;
    const preview = byId('corruptPayloadPreview');
    const copyButton = byId('copyCorruptPayloadBtn');
    if (preview) {
        preview.textContent = '';
        preview.hidden = true;
    }
    if (copyButton) copyButton.hidden = true;
}

function renderPersistenceState() {
    const recovery = byId('trancheRecoveryActions');
    const retryLoad = byId('retryTrancheLoadBtn');
    const retrySave = byId('retryTrancheSaveBtn');
    const isCorrupt = state.loadStatus === 'corrupt';
    const isUnavailable = state.loadStatus === 'unavailable';

    if (recovery) recovery.hidden = !isCorrupt;
    if (retryLoad) retryLoad.hidden = !isUnavailable;
    if (retrySave) retrySave.hidden = !state.pendingCommit
        && !state.pendingProfileValues
        && !state.pendingReconciliation
        && !state.pendingCashPosting;
    setManagerControlsBlocked(processingIsBlocked());

    if (state.commitInFlight || state.profileCommitInFlight || state.cashPostingInFlight) {
        setPersistenceStatus('Änderung wird dauerhaft gespeichert …', 'pending');
        return;
    }
    if (state.persistenceError) {
        setPersistenceStatus(state.persistenceError, 'error');
        return;
    }
    if (state.taxMigrationWarning) {
        setPersistenceStatus(state.taxMigrationWarning, 'pending');
        return;
    }
    if (state.persistenceMessage) {
        setPersistenceStatus(state.persistenceMessage, 'ok');
        return;
    }
    if (isCorrupt) {
        setPersistenceStatus(
            'Die gespeicherten Tranchen sind beschädigt. Der Rohbestand bleibt unverändert; Bearbeitung ist bis zur bewussten Wiederherstellung blockiert.',
            'error'
        );
        return;
    }
    if (isUnavailable) {
        setPersistenceStatus(
            'Der Speicher ist momentan nicht erreichbar. Der letzte bestätigte Stand bleibt sichtbar; bitte erneut versuchen.',
            'error'
        );
        return;
    }
    setPersistenceStatus(
        state.loadStatus === 'valid'
            ? 'Tranchenbestand dauerhaft geladen.'
            : 'Für dieses Profil sind keine Tranchen gespeichert.',
        'ok'
    );
}

function formatReconciliationNumber(value, options = {}) {
    if (value === null || value === undefined || !Number.isFinite(Number(value))) return '-';
    const { currency = false, maximumFractionDigits = currency ? 2 : 6 } = options;
    return new Intl.NumberFormat('de-DE', {
        ...(currency ? { style: 'currency', currency: 'EUR' } : {}),
        maximumFractionDigits
    }).format(Number(value));
}

function localIsoDate(date = new Date()) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
}

function setReconciliationStatus(message = '', kind = '') {
    const target = byId('reconciliationStatus');
    if (!target) return;
    target.textContent = message;
    target.dataset.kind = kind;
}

function refreshReconciliationCashStatuses() {
    const loaded = loadReconciliationRegistryFromStorage(persistenceStorage);
    if (loaded.status === 'empty') {
        state.reconciliationCashStatuses = [];
        state.cashStatusError = '';
        return;
    }
    if (loaded.status !== 'valid') {
        state.reconciliationCashStatuses = [];
        state.cashStatusError = 'Cashstatus-Audit ist nicht lesbar. Bestätigung und Korrektur bleiben blockiert.';
        return;
    }
    try {
        state.reconciliationCashStatuses = projectReconciliationCashStatuses(loaded.registry, state.profileId);
        state.cashStatusError = '';
    } catch (error) {
        state.reconciliationCashStatuses = [];
        state.cashStatusError = error instanceof TrancheReconciliationError
            ? `Cashstatus-Audit blockiert: ${error.message}`
            : 'Cashstatus-Audit ist beschädigt oder nicht unterstützt.';
    }
}

function syncInitialCashStatusControls() {
    const status = byId('reconcileCashStatus')?.value || 'pending_manual_posting';
    const group = byId('reconcileInitialCashBalanceGroup');
    const input = byId('reconcileInitialCashBalance');
    const confirmed = status === 'confirmed_already_reflected';
    if (group) group.hidden = !confirmed;
    if (input) input.required = confirmed;
}

function renderReconciliationOptions() {
    const select = byId('reconcileTrancheId');
    if (!select || typeof document.createElement !== 'function') return;
    const previousValue = select.value;
    select.replaceChildren?.();
    if (!select.replaceChildren) select.innerHTML = '';

    const placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.textContent = state.tranchen.length > 0
        ? 'Tranche über ID auswählen'
        : 'Keine Tranche verfügbar';
    select.appendChild(placeholder);
    state.tranchen.forEach(tranche => {
        const option = document.createElement('option');
        option.value = tranche.trancheId;
        option.textContent = `${tranche.name || 'Tranche'} — ${tranche.trancheId}`;
        select.appendChild(option);
    });
    select.value = state.tranchen.some(tranche => tranche.trancheId === previousValue)
        ? previousValue
        : '';
}

function renderReconciliationPreview() {
    const container = byId('reconciliationPreview');
    const content = byId('reconciliationPreviewContent');
    const confirmButton = byId('reconciliationConfirmBtn');
    const cancelButton = byId('reconciliationCancelBtn');
    const preview = state.reconciliationPreview?.preview || null;
    if (container) container.hidden = !preview;
    if (confirmButton) {
        confirmButton.hidden = !preview;
        confirmButton.disabled = processingIsBlocked() || preview?.status !== 'ready';
    }
    if (cancelButton) {
        cancelButton.hidden = !preview;
        cancelButton.disabled = state.commitInFlight;
    }
    if (!content) return;
    if (!preview) {
        content.textContent = '';
        return;
    }

    const action = preview.action;
    const after = preview.after;
    const lines = [
        `Profil-ID: ${action.profileId}`,
        `Tranche-ID: ${action.trancheId}`,
        `Action-ID: ${action.actionId}`,
        `Ausführungstag: ${action.executedAt}`,
        '',
        `Ist-Bestand vorher: ${formatReconciliationNumber(preview.before?.shares)} Stück · ${formatReconciliationNumber(preview.before?.marketValue, { currency: true })} Marktwert · ${formatReconciliationNumber(preview.before?.costBasis, { currency: true })} Einstandskosten`,
        `Tatsächliche Ausführung: ${formatReconciliationNumber(preview.execution?.sharesSold)} Stück · ${formatReconciliationNumber(preview.execution?.grossProceeds, { currency: true })} Brutto · ${formatReconciliationNumber(preview.execution?.fees, { currency: true })} Kosten · ${formatReconciliationNumber(preview.execution?.netProceeds, { currency: true })} Netto`,
        action.cashStatus === 'confirmed_already_reflected'
            ? `Cashstatus: bereits berücksichtigt · bestätigter Cashstand ${formatReconciliationNumber(action.cashBalanceAfterPostingEur, { currency: true })} · Nachweiszeitpunkt ${action.cashConfirmedAt}`
            : 'Cashstatus: offen – Nettoerlös nach dem Lot-Commit manuell in der freien Liquidität nachführen und anschließend bestätigen.',
        'Es erfolgt keine automatische Cashbuchung der freien Liquidität.',
        after
            ? `Resultierender Bestand: ${formatReconciliationNumber(after.shares)} Stück · ${formatReconciliationNumber(after.marketValue, { currency: true })} Marktwert · ${formatReconciliationNumber(after.costBasis, { currency: true })} Einstandskosten`
            : 'Resultierender Bestand: Tranche vollständig verkauft und entfernt.'
    ];
    if (preview.deviation) {
        const deviations = [];
        if (Object.prototype.hasOwnProperty.call(preview.deviation, 'sharesSold')) {
            deviations.push(`${formatReconciliationNumber(preview.deviation.sharesSold)} Stück`);
        }
        if (Object.prototype.hasOwnProperty.call(preview.deviation, 'grossProceeds')) {
            deviations.push(formatReconciliationNumber(preview.deviation.grossProceeds, { currency: true }));
        }
        lines.push(`Abweichung zur optional erfassten Empfehlung: ${deviations.join(' · ')}`);
    } else {
        lines.push('Empfehlungsvergleich: keine Referenz erfasst; tatsächliche Ausführung bleibt maßgeblich.');
    }
    if (preview.status === 'duplicate') {
        lines.push('', 'Diese Action-ID wurde mit denselben Ausführungsdaten bereits angewendet. Es erfolgt keine weitere Bestandsänderung.');
    }
    content.textContent = lines.join('\n');
}

function renderReconciliationState() {
    const form = byId('reconciliationForm');
    if (!form) return;
    const cashContainer = ensureReconciliationCashControls(document);
    syncInitialCashStatusControls();
    renderReconciliationOptions();
    const dateInput = byId('reconcileExecutedAt');
    if (dateInput && !dateInput.value) dateInput.value = localIsoDate();
    const previewButton = byId('reconciliationPreviewBtn');
    if (previewButton) previewButton.disabled = processingIsBlocked() || state.tranchen.length === 0;
    renderReconciliationPreview();
    renderReconciliationCashStatuses(cashContainer, state.reconciliationCashStatuses, {
        errorMessage: state.cashStatusError
    });
    if (state.cashStatusError) {
        setReconciliationStatus(state.cashStatusError, 'error');
    } else if (state.reconciliationError) {
        setReconciliationStatus(state.reconciliationError, 'error');
    } else if (state.reconciliationStatus) {
        setReconciliationStatus(state.reconciliationStatus, 'ok');
    } else {
        setReconciliationStatus(
            'Empfehlungen aus Balance und Simulator sind schreibfrei. Nur diese separat bestätigte tatsächliche Ausführung verändert den Realbestand.',
            ''
        );
    }
}

function readOptionalNumber(id) {
    const raw = byId(id)?.value;
    return raw === '' || raw === null || raw === undefined ? null : Number(raw);
}

function readReconciliationActionFromDom() {
    const recommendedShares = readOptionalNumber('reconcileRecommendedShares');
    const recommendedGross = readOptionalNumber('reconcileRecommendedGross');
    const cashStatus = byId('reconcileCashStatus')?.value || 'pending_manual_posting';
    return {
        actionId: byId('reconcileActionId')?.value || '',
        profileId: state.profileId || '',
        trancheId: byId('reconcileTrancheId')?.value || '',
        executedAt: byId('reconcileExecutedAt')?.value || '',
        sharesSold: readOptionalNumber('reconcileSharesSold'),
        grossProceeds: readOptionalNumber('reconcileGrossProceeds'),
        fees: readOptionalNumber('reconcileFees') ?? 0,
        cashStatus,
        ...(cashStatus === 'confirmed_already_reflected'
            ? {
                cashBalanceAfterPostingEur: readOptionalNumber('reconcileInitialCashBalance'),
                cashConfirmedAt: new Date().toISOString()
            }
            : {}),
        recommendation: recommendedShares === null && recommendedGross === null
            ? null
            : {
                ...(recommendedShares !== null ? { sharesSold: recommendedShares } : {}),
                ...(recommendedGross !== null ? { grossProceeds: recommendedGross } : {})
            }
    };
}

function clearReconciliationPreview({ resetForm = false } = {}) {
    state.reconciliationPreview = null;
    state.reconciliationError = '';
    if (resetForm) {
        byId('reconciliationForm')?.reset?.();
        const dateInput = byId('reconcileExecutedAt');
        if (dateInput) dateInput.value = localIsoDate();
    }
    renderReconciliationState();
}

function createReconciliationPreview(event) {
    event?.preventDefault?.();
    if (processingIsBlocked()) return false;
    state.reconciliationStatus = '';
    state.reconciliationError = '';
    try {
        const action = readReconciliationActionFromDom();
        const preview = previewTrancheReconciliation({
            profileId: state.profileId,
            tranches: state.confirmedTranches,
            action,
            registry: readStoredValue(PROFILE_STORAGE_KEYS.registry)
        });
        state.reconciliationPreview = {
            profileId: state.profileId,
            action,
            expectedTranchesRaw: state.confirmedRaw,
            preview
        };
        state.reconciliationStatus = preview.status === 'duplicate'
            ? 'Action-ID bereits identisch verarbeitet; der Bestand bleibt unverändert.'
            : 'Vorschau erstellt. Prüfen Sie Profil-ID, Tranche-ID und tatsächliche Brokerdaten vor der dauerhaften Bestätigung.';
        renderReconciliationState();
        return true;
    } catch (error) {
        state.reconciliationPreview = null;
        state.reconciliationError = error instanceof TrancheReconciliationError
            ? error.message
            : 'Die Reconcile-Vorschau konnte nicht erstellt werden.';
        renderReconciliationState();
        return false;
    }
}

async function executeReconciliation(pending, { requireConfirmation = true } = {}) {
    if (!pending || state.commitInFlight || state.profileCommitInFlight) return false;
    if (requireConfirmation) {
        const cashLine = pending.action.cashStatus === 'confirmed_already_reflected'
            ? `Cashstatus: bereits enthalten; bestätigter Cashstand ${formatReconciliationNumber(pending.action.cashBalanceAfterPostingEur, { currency: true })}.`
            : `Cashstatus: offen; Nettoerlös ${formatReconciliationNumber(pending.preview?.execution?.netProceeds, { currency: true })} muss anschließend manuell nachgeführt werden.`;
        const confirmed = confirm(
            `Tatsächliche Ausführung ${pending.action.actionId} für Profil ${pending.profileId} und Tranche ${pending.action.trancheId} dauerhaft anwenden? Der reale Bestand wird dabei geändert. ${cashLine} Es erfolgt keine automatische Cashbuchung.`
        );
        if (!confirmed) return false;
    }

    state.commitInFlight = true;
    state.persistenceMessage = '';
    state.persistenceError = '';
    state.reconciliationError = '';
    state.reconciliationStatus = '';
    renderPersistenceState();
    renderReconciliationState();
    try {
        const result = await commitTrancheReconciliation({
            profileId: pending.profileId,
            action: pending.action,
            expectedTranchesRaw: pending.expectedTranchesRaw
        });
        state.pendingReconciliation = null;
        if (result.status === 'duplicate') {
            state.reconciliationStatus = 'Action-ID war bereits identisch verarbeitet. Es wurde nichts erneut verändert.';
            state.persistenceMessage = 'Keine Bestandsänderung: Ausführung war bereits bestätigt.';
            state.reconciliationPreview = { ...pending, preview: result.preview };
            return true;
        }
        state.tranchen = result.tranches;
        state.confirmedTranches = result.tranches;
        state.confirmedRaw = JSON.stringify(result.tranches);
        state.loadStatus = result.tranches.length > 0 ? 'valid' : 'empty';
        state.reconciliationPreview = null;
        state.reconciliationStatus = pending.action.cashStatus === 'confirmed_already_reflected'
            ? 'Tatsächliche Ausführung und bereits berücksichtigter Cashstand dauerhaft dokumentiert; Realbestand aktualisiert.'
            : 'Tatsächliche Ausführung dauerhaft dokumentiert und Realbestand aktualisiert. Cashbuchung bleibt manuell offen.';
        state.persistenceMessage = 'Reconcile-Commit dauerhaft gespeichert.';
        clearReconciliationPreview({ resetForm: true });
        return true;
    } catch (error) {
        state.tranchen = state.confirmedTranches;
        state.pendingReconciliation = pending;
        state.reconciliationError = error instanceof TrancheReconciliationError
            ? `${error.message}${error.retryable ? ' Retry ist möglich.' : ''}`
            : 'Die Ausführung konnte nicht dauerhaft gespeichert werden. Retry ist möglich.';
        state.persistenceError = 'Reconcile wurde nicht dauerhaft bestätigt. Der letzte bestätigte Bestand bleibt sichtbar.';
        return false;
    } finally {
        state.commitInFlight = false;
        render();
        renderPersistenceState();
    }
}

function confirmReconciliation() {
    const pending = state.reconciliationPreview;
    if (!pending || pending.preview?.status !== 'ready') return Promise.resolve(false);
    return executeReconciliation(pending);
}

function openCashStatusWorkflow(targetActionId, mode, opener = null) {
    if (processingIsBlocked()) return false;
    const status = state.reconciliationCashStatuses.find(item => item.targetActionId === targetActionId);
    if (!status) {
        state.reconciliationError = `Cashstatus für Zielverkauf ${targetActionId} ist nicht mehr verfügbar.`;
        renderReconciliationState();
        return false;
    }
    const correctionMode = mode === 'correct';
    if ((correctionMode && !status.canCorrect) || (!correctionMode && !status.canConfirm)) {
        state.reconciliationError = 'Der Cashstatus hat sich geändert. Bitte aktuellen Stand neu laden.';
        renderReconciliationState();
        return false;
    }
    const nextRevision = correctionMode ? status.correctionRevision + 1 : null;
    return openCashPostingModal({
        mode: correctionMode ? 'correct' : 'confirm',
        targetActionId: status.targetActionId,
        confirmedNetProceedsEur: status.confirmedNetProceedsEur,
        cashBalanceAfterPostingEur: status.cashBalanceAfterPostingEur,
        nextRevision,
        correctsActionId: correctionMode ? status.effectiveActionId : null,
        nextActionId: correctionMode
            ? deriveCashCorrectionActionId(status.targetActionId, nextRevision)
            : deriveCashConfirmationActionId(status.targetActionId)
    }, document, opener);
}

async function executeCashPosting(pending, { requireConfirmation = true } = {}) {
    if (!pending || state.cashPostingInFlight || state.commitInFlight || state.profileCommitInFlight) return false;
    if (requireConfirmation) {
        const record = pending.preview.auditRecord;
        const detail = pending.mode === 'correct'
            ? `Bisheriger Cashstand ${formatReconciliationNumber(pending.previousCashBalance, { currency: true })}, neuer Cashstand ${formatReconciliationNumber(record.cashBalanceAfterPostingEur, { currency: true })}, Grund: ${record.correctionReason}.`
            : `Zu bestätigender Cashstand ${formatReconciliationNumber(record.cashBalanceAfterPostingEur, { currency: true })}.`;
        const accepted = confirm(
            `Append-only Cashnachweis ${record.actionId} für Zielverkauf ${record.targetActionId} speichern? Nettoerlös ${formatReconciliationNumber(record.confirmedNetProceedsEur, { currency: true })}. ${detail} Es erfolgt keine automatische Cashbuchung.`
        );
        if (!accepted) return false;
    }

    state.cashPostingInFlight = true;
    state.persistenceMessage = '';
    state.persistenceError = '';
    state.reconciliationError = '';
    state.reconciliationStatus = '';
    renderPersistenceState();
    renderReconciliationState();
    try {
        const result = pending.mode === 'correct'
            ? await commitCashPostingCorrection(pending.request)
            : await commitCashPostingConfirmation(pending.request);
        state.pendingCashPosting = null;
        state.reconciliationStatus = result.status === 'duplicate'
            ? 'Ein inhaltlich gleicher Cashnachweis war bereits gespeichert; es wurde nichts angehängt und der erste Nachweiszeitpunkt bleibt erhalten.'
            : pending.mode === 'correct'
                ? 'Cashstandkorrektur append-only gespeichert; Verkauf und frühere Nachweise blieben unverändert.'
                : 'Manuelle Cashbuchung append-only bestätigt; der Verkauf ist nun mit Cashnachweis abgeschlossen.';
        state.persistenceMessage = result.status === 'duplicate'
            ? 'Keine Auditänderung: Ein inhaltlich gleicher Cashnachweis war bereits vorhanden.'
            : 'Cashstatus dauerhaft im Reconcile-Audit gespeichert.';
        refreshReconciliationCashStatuses();
        return true;
    } catch (error) {
        state.pendingCashPosting = pending;
        state.reconciliationError = error instanceof TrancheReconciliationError
            ? `${error.message}${error.retryable ? ' Retry ist möglich.' : ''}`
            : 'Der Cashstatus konnte nicht dauerhaft gespeichert werden. Retry ist möglich.';
        state.persistenceError = 'Cashstatus wurde nicht dauerhaft bestätigt. Der letzte Auditstand bleibt sichtbar.';
        return false;
    } finally {
        state.cashPostingInFlight = false;
        render();
        renderPersistenceState();
    }
}

async function submitCashPosting(event) {
    event?.preventDefault?.();
    if (processingIsBlocked()) return false;
    const formValue = readCashPostingForm();
    if (!formValue) return false;
    const registryRaw = readStoredValue(PROFILE_STORAGE_KEYS.registry);
    try {
        const preview = formValue.mode === 'correct'
            ? previewCashPostingCorrection({
                profileId: state.profileId,
                targetActionId: formValue.targetActionId,
                cashBalanceAfterPostingEur: formValue.cashBalanceAfterPostingEur,
                correctionReason: formValue.correctionReason,
                correctionRevision: formValue.nextRevision,
                correctionActionId: formValue.nextActionId,
                actionId: formValue.nextActionId,
                correctsActionId: formValue.correctsActionId,
                correctedAt: new Date().toISOString(),
                registry: registryRaw
            })
            : previewCashPostingConfirmation({
                profileId: state.profileId,
                targetActionId: formValue.targetActionId,
                cashBalanceAfterPostingEur: formValue.cashBalanceAfterPostingEur,
                confirmedAt: new Date().toISOString(),
                registry: registryRaw
            });
        const pending = {
            mode: formValue.mode,
            preview,
            previousCashBalance: preview.cashStatus?.cashBalanceAfterPostingEur ?? null,
            request: {
                ...preview.auditRecord,
                profileId: state.profileId,
                expectedRegistryRaw: registryRaw
            }
        };
        const accepted = await executeCashPosting(pending);
        if (accepted) closeCashPostingModal();
        return accepted;
    } catch (error) {
        const field = error?.field === 'correctionReason' ? 'cashPostingReason' : 'cashPostingBalance';
        showCashPostingFormError(
            error instanceof TrancheReconciliationError
                ? error.message
                : 'Cashstatus konnte nicht geprüft werden.',
            field
        );
        return false;
    }
}

function updateActiveProfileLabel(profileId = state.profileId) {
    const label = byId('activeProfileName');
    if (!label) return;
    let meta = null;
    try {
        meta = profileId ? getProfileMeta(profileId) : null;
    } catch {
        meta = null;
    }
    const id = profileId || '-';
    label.textContent = `${meta?.name || id} (${id})`;
    label.dataset.profileId = id;
    const backLink = byId('managerBackLink');
    if (backLink) {
        backLink.dataset.profileId = id;
        backLink.setAttribute?.('aria-label', `Zurück zur Profilübersicht für ${meta?.name || id} (${id})`);
    }
}

async function saveProfileValues(values = readProfileAssetValuesFromDom()) {
    let validatedValues;
    try {
        validatedValues = validateProfileAssetValues(values);
        clearProfileValidationStatus();
    } catch (error) {
        if (error instanceof ProfileAssetValuesValidationError) showProfileValidationStatus(error);
        return false;
    }
    if (state.profileCommitInFlight) {
        state.pendingProfileValues = validatedValues;
        return false;
    }
    if (state.commitInFlight || state.loadStatus === 'corrupt' || state.loadStatus === 'unavailable') return false;

    state.pendingProfileValues = null;
    const previousValues = new Map(PROFILE_ASSET_STORAGE_KEYS.map(key => [key, readStoredValue(key)]));
    const previousRegistryRaw = readStoredValue(PROFILE_STORAGE_KEYS.registry);
    state.profileCommitInFlight = true;
    state.persistenceMessage = '';
    state.persistenceError = '';
    let succeeded = false;
    renderPersistenceState();

    try {
        saveProfileAssetValues(validatedValues);
        if (!saveCurrentProfileFromLocalStorage()) {
            throw new Error('PROFILE_SAVE_FAILED');
        }
        await PersistenceFacade.flush();
        state.persistenceMessage = 'Profilwerte dauerhaft gespeichert.';
        succeeded = true;
        return true;
    } catch {
        previousValues.forEach((value, key) => restoreStoredValue(key, value));
        restoreStoredValue(PROFILE_STORAGE_KEYS.registry, previousRegistryRaw);
        state.pendingProfileValues = validatedValues;
        state.persistenceError = 'Profilwerte konnten nicht dauerhaft gespeichert werden. Der bestätigte Stand wurde wiederhergestellt; Retry ist möglich.';
        try {
            applyProfileAssetValuesToDom(loadProfileAssetValues());
        } catch {
            // Der sichtbare Fehlerstatus bleibt erhalten, auch wenn das Backend weiter nicht lesbar ist.
        }
        return false;
    } finally {
        state.profileCommitInFlight = false;
        const queuedValues = succeeded ? state.pendingProfileValues : null;
        if (queuedValues) state.pendingProfileValues = null;
        renderPersistenceState();
        if (queuedValues) queueMicrotask(() => void saveProfileValues(queuedValues));
    }
}

function scheduleProfileValuesSave() {
    if (state.profileSaveTimer !== null) {
        clearTimeout(state.profileSaveTimer);
        state.profileSaveTimer = null;
    }

    let values;
    try {
        values = readProfileAssetValuesFromDom();
        clearProfileValidationStatus();
    } catch (error) {
        if (error instanceof ProfileAssetValuesValidationError) {
            showProfileValidationStatus(error);
            state.pendingProfileValues = null;
            renderPersistenceState();
        }
        return false;
    }

    state.profileSaveTimer = setTimeout(() => {
        state.profileSaveTimer = null;
        void saveProfileValues(values);
    }, PROFILE_SAVE_DEBOUNCE_MS);
    return true;
}

function bindProfileValueInputs() {
    PROFILE_INPUT_IDS.forEach(id => {
        const el = byId(id);
        if (!el) return;
        const eventName = el.tagName.toLowerCase() === 'select' ? 'change' : 'input';
        el.addEventListener(eventName, () => {
            const scheduled = scheduleProfileValuesSave();
            renderTranchenStats(byId('stats'), state.tranchen);
            return scheduled;
        });
    });
}

function addTranche(event) {
    if (processingIsBlocked()) return;
    state.editingIndex = -1;
    openCreateTrancheModal(document, event?.currentTarget || event?.target || null);
}

function editTranche(index, opener = null) {
    if (processingIsBlocked()) return;
    state.editingIndex = index;
    const tranche = state.tranchen[index];
    if (!tranche) return;
    openEditTrancheModal(tranche, document, opener);
}

async function persistTranchen(nextTranches, options = {}) {
    const {
        successMessage = 'Änderung dauerhaft gespeichert.',
        onSuccess = null,
        allowRecovery = false
    } = options;

    if (state.commitInFlight || state.profileCommitInFlight) return false;
    if (!allowRecovery && (state.loadStatus === 'corrupt' || state.loadStatus === 'unavailable')) return false;

    let normalized;
    try {
        normalized = normalizeTranches(nextTranches);
    } catch (error) {
        const detail = formatTrancheValidationError(error);
        state.persistenceError = `Die Änderung verletzt den Tranchenvertrag und wurde nicht gespeichert. ${detail}`;
        if (byId('trancheModal')?.classList?.contains?.('active')) showTrancheFormError(error);
        renderPersistenceState();
        return false;
    }

    const previousLiveRaw = state.loadStatus === 'corrupt'
        ? state.corruptRaw
        : state.confirmedRaw;
    const previousRegistryRaw = readStoredValue(PROFILE_STORAGE_KEYS.registry);
    const previousLoadStatus = state.loadStatus;
    const previousCorruptRaw = state.corruptRaw;

    state.commitInFlight = true;
    state.persistenceMessage = '';
    state.persistenceError = '';
    renderPersistenceState();

    try {
        const persisted = saveTranchesToStorage(normalized);
        if (!saveCurrentProfileFromLocalStorage()) {
            throw new Error('PROFILE_SAVE_FAILED');
        }
        await PersistenceFacade.flush();

        state.tranchen = persisted;
        state.confirmedTranches = persisted;
        state.confirmedRaw = JSON.stringify(persisted);
        state.corruptRaw = null;
        state.loadStatus = persisted.length > 0 ? 'valid' : 'empty';
        state.pendingCommit = null;
        state.taxMigrationWarning = '';
        state.persistenceMessage = successMessage;
        clearRawPreview();
        if (typeof onSuccess === 'function') onSuccess();
        return true;
    } catch {
        restoreStoredValue(PROFILE_TRANCHES_KEY, previousLiveRaw);
        restoreStoredValue(PROFILE_STORAGE_KEYS.registry, previousRegistryRaw);
        state.tranchen = state.confirmedTranches;
        state.loadStatus = previousLoadStatus;
        state.corruptRaw = previousCorruptRaw;
        state.pendingCommit = { tranches: normalized, successMessage, onSuccess, allowRecovery };
        state.persistenceError = 'Speichern wurde nicht dauerhaft bestätigt. Der letzte bestätigte Stand bleibt sichtbar; Retry ist möglich.';
        return false;
    } finally {
        state.commitInFlight = false;
        render();
        renderPersistenceState();
    }
}

async function deleteTranche(index) {
    if (processingIsBlocked()) return;
    const tranche = state.tranchen[index];
    if (!tranche) return;
    if (!confirm(`Tranche „${tranche.name || tranche.trancheId}“ wirklich dauerhaft löschen?`)) return;
    const nextTranches = state.tranchen.filter((_, itemIndex) => itemIndex !== index);
    await persistTranchen(nextTranches, { successMessage: 'Tranche dauerhaft gelöscht.' });
}

async function saveTranche(event) {
    event.preventDefault();
    if (processingIsBlocked()) return;
    clearTrancheFormError();

    const existingId = (state.editingIndex >= 0 && state.tranchen[state.editingIndex])
        ? state.tranchen[state.editingIndex].trancheId
        : null;
    let tranche;
    try {
        tranche = readTrancheFromForm(existingId, document, {
            existingIds: state.tranchen.map(item => item.trancheId)
        });
    } catch (error) {
        showTrancheFormError(error);
        state.persistenceError = `Tranche nicht gespeichert. ${formatTrancheValidationError(error)}`;
        renderPersistenceState();
        return false;
    }
    const nextTranches = [...state.tranchen];

    if (state.editingIndex >= 0) {
        nextTranches[state.editingIndex] = tranche;
    } else {
        nextTranches.push(tranche);
    }

    return persistTranchen(nextTranches, {
        successMessage: existingId ? 'Tranche dauerhaft aktualisiert.' : 'Tranche dauerhaft angelegt.',
        onSuccess: () => closeTrancheModal()
    });
}

async function clearAll() {
    if (processingIsBlocked()) return;
    if (!confirm('Alle Tranchen löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    await persistTranchen([], { successMessage: 'Alle Tranchen wurden dauerhaft gelöscht.' });
}

function quoteErrorDetails(error, fallbackSymbol) {
    return {
        code: typeof error?.code === 'string' ? error.code : 'QUOTE_FAILED',
        message: error?.message || 'Kursabruf fehlgeschlagen.',
        symbol: fallbackSymbol || 'unbekannt'
    };
}

function selectMostSpecificQuoteError(errors, fallbackSymbol) {
    const priority = [
        'UNSUPPORTED_CURRENCY',
        'CURRENCY_MISSING',
        'QUOTE_STALE',
        'QUOTE_FROM_FUTURE',
        'AS_OF_MISSING',
        'SYMBOL_MISMATCH',
        'INVALID_PRICE',
        'INVALID_RESPONSE',
        'PROVIDER_RATE_LIMITED',
        'PROVIDER_TIMEOUT',
        'PROVIDER_UNAVAILABLE',
        'PROXY_UNREACHABLE',
        'REQUEST_TIMEOUT',
        'REQUEST_ABORTED',
        'SYMBOL_NOT_FOUND',
        'INVALID_SYMBOL'
    ];
    const selected = priority
        .map(code => errors.find(item => item?.code === code))
        .find(Boolean) || errors[0];
    return quoteErrorDetails(selected, fallbackSymbol);
}

function formatQuoteIssue(result) {
    const label = result.name || result.trancheId || 'Unbenannte Tranche';
    const message = result.status === 'skipped'
        ? 'Ticker oder ISIN fehlt'
        : String(result.message || 'Kursabruf fehlgeschlagen').trim().replace(/[.\s]+$/, '');
    return `${label}: ${message}.`;
}

function formatBatchStatus(results, options = {}) {
    const updated = results.filter(result => result.status === 'updated').length;
    if (options.persistenceFailed) {
        return 'Kurse konnten nicht aktualisiert werden: Das Speichern ist fehlgeschlagen. Der bisherige Stand bleibt erhalten.';
    }
    if (updated === results.length) return 'Kurse erfolgreich aktualisiert.';

    const headline = updated > 0
        ? `Kurse teilweise aktualisiert (${updated} von ${results.length}).`
        : 'Kurse konnten nicht aktualisiert werden.';
    const issues = results
        .filter(result => result.status !== 'updated')
        .map(formatQuoteIssue)
        .join(' ');
    return `${headline} ${issues}`.trim();
}

function createBatchQuoteFetcher(signal) {
    const quoteRequests = new Map();
    const searchRequests = new Map();
    const requestOptions = { signal };

    return {
        quote(symbol) {
            const key = String(symbol || '').trim().toUpperCase();
            if (!quoteRequests.has(key)) {
                quoteRequests.set(key, fetchProxyPrice(symbol, LOCAL_YAHOO_PROXY, requestOptions));
            }
            return quoteRequests.get(key);
        },
        search(query, nameHint) {
            const key = `${String(query || '').trim().toUpperCase()}|${String(nameHint || '').trim().toUpperCase()}`;
            if (!searchRequests.has(key)) {
                searchRequests.set(key, fetchProxySymbol(query, LOCAL_YAHOO_PROXY, nameHint, requestOptions));
            }
            return searchRequests.get(key);
        }
    };
}

async function resolveTrancheQuote(tranche, fetcher) {
    const ticker = String(tranche.ticker || '').trim();
    const isin = String(tranche.isin || '').trim();
    const symbols = [...new Set([ticker, isin].filter(Boolean))];
    if (!symbols.length) return { status: 'skipped' };

    const errors = [];
    for (const symbol of symbols) {
        try {
            return { status: 'updated', quote: await fetcher.quote(symbol) };
        } catch (error) {
            errors.push(error);
        }

        try {
            const resolved = await fetcher.search(symbol, tranche.name);
            if (resolved) {
                return { status: 'updated', quote: await fetcher.quote(resolved) };
            }
        } catch (error) {
            errors.push(error);
        }
    }

    return {
        status: 'failed',
        ...selectMostSpecificQuoteError(errors, ticker || isin)
    };
}

async function executePriceBatch(batchId, controller) {
    const statusEl = byId('priceUpdateStatus');
    const nextTranches = state.tranchen.map(tranche => ({ ...tranche }));
    const results = new Array(nextTranches.length);
    const fetcher = createBatchQuoteFetcher(controller.signal);
    let nextIndex = 0;
    let completed = 0;
    let timedOut = false;
    const batchTimer = setTimeout(() => {
        timedOut = true;
        controller.abort();
    }, QUOTE_BATCH_TIMEOUT_MS);

    statusEl.textContent = `Kurse werden aktualisiert... (0/${nextTranches.length})`;
    const worker = async () => {
        while (nextIndex < nextTranches.length && !controller.signal.aborted) {
            const index = nextIndex;
            nextIndex += 1;
            const tranche = nextTranches[index];
            let result;
            try {
                result = await resolveTrancheQuote(tranche, fetcher);
                if (result.status === 'updated') {
                    const quote = result.quote;
                    Object.assign(tranche, calculateTrancheDerivedValues({
                        ...tranche,
                        ticker: quote.symbol,
                        currentPrice: quote.price
                    }));
                }
            } catch (error) {
                result = {
                    status: 'failed',
                    ...quoteErrorDetails(error, tranche.ticker || tranche.isin)
                };
            }
            results[index] = {
                trancheId: tranche.trancheId,
                name: tranche.name,
                ...result
            };
            completed += 1;
            if (state.quoteBatchId === batchId) {
                statusEl.textContent = `Kurse werden aktualisiert... (${completed}/${nextTranches.length})`;
            }
        }
    };

    try {
        const workerCount = Math.min(QUOTE_BATCH_CONCURRENCY, nextTranches.length);
        await Promise.all(Array.from({ length: workerCount }, () => worker()));
    } finally {
        clearTimeout(batchTimer);
    }

    if (timedOut) {
        results.forEach((result, index) => {
            if (result?.status !== 'failed' || result.code !== 'REQUEST_ABORTED') return;
            results[index] = {
                ...result,
                code: 'BATCH_TIMEOUT',
                message: `Batch-Gesamtdauer von ${QUOTE_BATCH_TIMEOUT_MS / 1000} Sekunden ueberschritten.`
            };
        });
    }

    for (let index = 0; index < results.length; index += 1) {
        if (results[index]) continue;
        const tranche = nextTranches[index];
        results[index] = {
            trancheId: tranche.trancheId,
            name: tranche.name,
            status: 'failed',
            code: timedOut ? 'BATCH_TIMEOUT' : 'REQUEST_ABORTED',
            message: timedOut
                ? `Batch-Gesamtdauer von ${QUOTE_BATCH_TIMEOUT_MS / 1000} Sekunden ueberschritten.`
                : 'Kursbatch wurde abgebrochen.',
            symbol: tranche.ticker || tranche.isin || 'unbekannt'
        };
    }

    if (state.quoteBatchId !== batchId || controller.signal.aborted && !timedOut) return false;
    const updated = results.filter(result => result.status === 'updated').length;
    if (updated === 0) {
        statusEl.textContent = formatBatchStatus(results);
        return false;
    }

    const committed = await persistTranchen(nextTranches, {
        successMessage: 'Kursänderungen dauerhaft gespeichert.'
    });
    if (state.quoteBatchId !== batchId) return false;
    statusEl.textContent = formatBatchStatus(results, { persistenceFailed: !committed });
    return committed;
}

function updatePrices() {
    if (state.quoteBatchPromise) return state.quoteBatchPromise;
    if (processingIsBlocked()) return Promise.resolve(false);
    if (!state.tranchen.length) {
        alert('Keine Tranchen vorhanden.');
        return Promise.resolve(false);
    }

    const batchId = state.quoteBatchId + 1;
    const controller = new AbortController();
    state.quoteBatchId = batchId;
    state.quoteBatchController = controller;

    let batchPromise;
    batchPromise = executePriceBatch(batchId, controller).finally(() => {
        if (state.quoteBatchId === batchId) {
            state.quoteBatchController = null;
            state.quoteBatchPromise = null;
            renderPersistenceState();
        }
    });
    state.quoteBatchPromise = batchPromise;
    renderPersistenceState();
    return batchPromise;
}

function revealCorruptPayload() {
    if (state.loadStatus !== 'corrupt' || typeof state.corruptRaw !== 'string') return;
    const preview = byId('corruptPayloadPreview');
    const copyButton = byId('copyCorruptPayloadBtn');
    state.rawRevealed = true;
    if (preview) {
        preview.textContent = state.corruptRaw;
        preview.hidden = false;
    }
    if (copyButton) copyButton.hidden = false;
}

async function copyCorruptPayload() {
    if (!state.rawRevealed || typeof state.corruptRaw !== 'string') return;
    try {
        if (!globalThis.navigator?.clipboard?.writeText) throw new Error('CLIPBOARD_UNAVAILABLE');
        await globalThis.navigator.clipboard.writeText(state.corruptRaw);
        state.persistenceMessage = 'Rohdaten wurden bewusst in die Zwischenablage kopiert.';
        state.persistenceError = '';
    } catch {
        state.persistenceError = 'Automatisches Kopieren ist nicht verfügbar. Die eingeblendeten Rohdaten können manuell markiert werden.';
    }
    renderPersistenceState();
}

async function resetCorruptPayload() {
    if (state.loadStatus !== 'corrupt') return;
    const confirmed = confirm(
        'Beschädigte Tranchen wirklich dauerhaft durch einen leeren Bestand ersetzen? Die Originaldaten gehen dabei verloren; vorher Backup oder Rohdatenkopie prüfen.'
    );
    if (!confirmed) return;
    await persistTranchen([], {
        successMessage: 'Beschädigte Tranchen wurden bestätigt zurückgesetzt.',
        allowRecovery: true
    });
}

function applyLoadResult(result) {
    state.persistenceMessage = '';
    state.persistenceError = '';
    state.taxMigrationWarning = '';
    state.pendingCommit = null;
    state.pendingReconciliation = null;
    state.pendingCashPosting = null;
    state.reconciliationPreview = null;
    state.reconciliationStatus = '';
    state.reconciliationError = '';
    clearRawPreview();

    if (result?.status === 'valid' || result?.status === 'empty') {
        const loaded = normalizeTranches(result.tranches || []);
        state.tranchen = loaded;
        state.confirmedTranches = loaded;
        state.confirmedRaw = result.raw;
        state.corruptRaw = null;
        state.loadStatus = result.status;
        state.taxMigrationWarning = describeLegacyTaxMigration(result.raw);
    } else if (result?.status === 'corrupt') {
        state.loadStatus = 'corrupt';
        state.corruptRaw = result.raw;
    } else {
        state.loadStatus = 'unavailable';
    }

    render();
    renderPersistenceState();
}

function retryLoad() {
    applyLoadResult(state.loader());
}

async function retryPendingCommit() {
    if (state.pendingCashPosting) {
        await executeCashPosting(state.pendingCashPosting, { requireConfirmation: false });
        return;
    }
    if (state.pendingReconciliation) {
        await executeReconciliation(state.pendingReconciliation, { requireConfirmation: false });
        return;
    }
    if (state.pendingCommit) {
        const pending = state.pendingCommit;
        await persistTranchen(pending.tranches, pending);
        return;
    }
    if (state.pendingProfileValues) {
        await saveProfileValues(state.pendingProfileValues);
    }
}

function bindControls() {
    bindTrancheModalLifecycle();
    bindCashPostingModalLifecycle();
    byId('addTrancheBtn')?.addEventListener('click', addTranche);
    byId('updatePricesBtn')?.addEventListener('click', () => updatePrices());
    byId('proxyHealthBtn')?.addEventListener('click', () => checkProxyHealth(byId('priceUpdateStatus')));
    byId('clearTranchesBtn')?.addEventListener('click', () => clearAll());
    byId('closeTrancheModalBtn')?.addEventListener('click', () => closeTrancheModal());
    byId('trancheForm')?.addEventListener('submit', event => saveTranche(event));
    byId('revealCorruptPayloadBtn')?.addEventListener('click', revealCorruptPayload);
    byId('copyCorruptPayloadBtn')?.addEventListener('click', () => copyCorruptPayload());
    byId('resetCorruptPayloadBtn')?.addEventListener('click', () => resetCorruptPayload());
    byId('retryTrancheLoadBtn')?.addEventListener('click', retryLoad);
    byId('retryTrancheSaveBtn')?.addEventListener('click', () => retryPendingCommit());
    byId('reconciliationForm')?.addEventListener('submit', createReconciliationPreview);
    byId('reconciliationConfirmBtn')?.addEventListener('click', () => confirmReconciliation());
    byId('reconciliationCancelBtn')?.addEventListener('click', () => clearReconciliationPreview());
    byId('cashPostingForm')?.addEventListener('submit', event => submitCashPosting(event));
    byId('reconciliationCashStatuses')?.addEventListener('click', event => {
        const target = event.target.closest?.('[data-cash-action]');
        if (!target) return;
        openCashStatusWorkflow(target.dataset.targetActionId, target.dataset.cashAction, target);
    });
    byId('reconcileCashStatus')?.addEventListener('change', syncInitialCashStatusControls);
    RECONCILIATION_INPUT_IDS.forEach(id => {
        byId(id)?.addEventListener('input', () => {
            if (!state.reconciliationPreview) return;
            state.reconciliationPreview = null;
            state.reconciliationStatus = '';
            state.reconciliationError = 'Eingaben wurden nach der Vorschau geändert. Bitte eine neue Vorschau erstellen.';
            renderReconciliationState();
        });
    });
    byId('tranchenTable')?.addEventListener('click', event => {
        if (processingIsBlocked()) return;
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const index = Number(target.dataset.index);
        if (!Number.isFinite(index)) return;
        if (target.dataset.action === 'edit-tranche') editTranche(index, target);
        if (target.dataset.action === 'delete-tranche') void deleteTranche(index);
    });

    if (typeof document.addEventListener === 'function') {
        let wasHidden = false;
        document.addEventListener('visibilitychange', () => {
            if (document.visibilityState === 'hidden') {
                wasHidden = true;
                return;
            }
            if (wasHidden && document.visibilityState === 'visible') {
                wasHidden = false;
                window?.location?.reload?.();
            }
        });
    }
}

function resolveActiveProfileId(explicitProfileId) {
    if (explicitProfileId !== undefined) return explicitProfileId || null;
    try {
        return getActiveProfileId() || getCurrentProfileId() || null;
    } catch {
        return state.profileId;
    }
}

function resetRuntimeState(profileId) {
    if (state.profileSaveTimer !== null) clearTimeout(state.profileSaveTimer);
    state.quoteBatchController?.abort();
    state.quoteBatchId += 1;
    state.tranchen = [];
    state.confirmedTranches = [];
    state.confirmedRaw = null;
    state.corruptRaw = null;
    state.loadStatus = 'empty';
    state.editingIndex = -1;
    state.commitInFlight = false;
    state.pendingCommit = null;
    state.profileCommitInFlight = false;
    state.pendingProfileValues = null;
    state.profileSaveTimer = null;
    state.quoteBatchController = null;
    state.quoteBatchPromise = null;
    state.persistenceMessage = '';
    state.persistenceError = '';
    state.taxMigrationWarning = '';
    state.rawRevealed = false;
    state.reconciliationPreview = null;
    state.pendingReconciliation = null;
    state.pendingCashPosting = null;
    state.reconciliationStatus = '';
    state.reconciliationError = '';
    state.reconciliationCashStatuses = [];
    state.cashStatusError = '';
    state.cashPostingInFlight = false;
    state.profileId = profileId;
}

export function initTranchenManagerPage(options = {}) {
    const profileId = resolveActiveProfileId(options.profileId);
    const documentChanged = state.boundDocument !== document;
    const profileChanged = state.profileId !== profileId;
    state.loader = options.loader || loadTranchesFromStorage;

    if (documentChanged || profileChanged) {
        resetRuntimeState(profileId);
        const quoteStatus = byId('priceUpdateStatus');
        if (quoteStatus) quoteStatus.textContent = '';
    }

    const result = state.loader();
    applyLoadResult(result);

    if (result?.status !== 'unavailable') {
        try {
            applyProfileAssetValuesToDom(loadProfileAssetValues());
        } catch {
            state.persistenceError = 'Profilwerte konnten nicht aus dem Speicher gelesen werden.';
        }
    }
    updateActiveProfileLabel(profileId);

    if (documentChanged) {
        bindProfileValueInputs();
        bindControls();
        state.boundDocument = document;
    }

    render();
    renderPersistenceState();
    return result;
}
