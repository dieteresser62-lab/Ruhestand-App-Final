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
    readProfileAssetValuesFromDom,
    saveProfileAssetValues
} from '../profile/profile-asset-values.js';
import {
    calculateTrancheDerivedValues,
    loadTranchesFromStorage,
    normalizeTranches,
    saveTranchesToStorage
} from './tranchen-manager-state.js';
import { renderTranchenStats, renderTranchenTable } from './tranchen-manager-renderer.js';
import { checkProxyHealth, fetchProxyPrice, fetchProxySymbol, LOCAL_YAHOO_PROXY } from './tranchen-price-service.js';
import {
    closeTrancheModal,
    openCreateTrancheModal,
    openEditTrancheModal,
    readTrancheFromForm
} from './tranchen-manager-modal.js';
import { PersistenceFacade, persistenceStorage } from '../shared/persistence-facade.js';

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
    persistenceMessage: '',
    persistenceError: '',
    rawRevealed: false,
    profileId: null,
    boundDocument: null,
    loader: loadTranchesFromStorage
};

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

function byId(id) {
    return document.getElementById(id);
}

function syncGlobalState() {
    window.tranchen = state.tranchen;
}

function render() {
    renderTranchenStats(byId('stats'), state.tranchen);
    renderTranchenTable(byId('tranchenTable'), state.tranchen);
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

function processingIsBlocked() {
    return state.commitInFlight
        || state.profileCommitInFlight
        || state.loadStatus === 'corrupt'
        || state.loadStatus === 'unavailable';
}

function setManagerControlsBlocked(blocked) {
    [
        'addTrancheBtn',
        'updatePricesBtn',
        'proxyHealthBtn',
        'clearTranchesBtn',
        ...PROFILE_INPUT_IDS
    ].forEach(id => {
        const element = byId(id);
        if (element) element.disabled = blocked;
    });
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
    if (retrySave) retrySave.hidden = !state.pendingCommit && !state.pendingProfileValues;
    setManagerControlsBlocked(processingIsBlocked());

    if (state.commitInFlight || state.profileCommitInFlight) {
        setPersistenceStatus('Änderung wird dauerhaft gespeichert …', 'pending');
        return;
    }
    if (state.persistenceError) {
        setPersistenceStatus(state.persistenceError, 'error');
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
}

async function saveProfileValues(values = readProfileAssetValuesFromDom()) {
    if (state.profileCommitInFlight) {
        state.pendingProfileValues = values;
        return false;
    }
    if (state.commitInFlight || state.loadStatus === 'corrupt' || state.loadStatus === 'unavailable') return false;

    const previousValues = new Map(PROFILE_ASSET_STORAGE_KEYS.map(key => [key, readStoredValue(key)]));
    const previousRegistryRaw = readStoredValue(PROFILE_STORAGE_KEYS.registry);
    state.profileCommitInFlight = true;
    state.persistenceMessage = '';
    state.persistenceError = '';
    renderPersistenceState();

    try {
        saveProfileAssetValues(values);
        if (!saveCurrentProfileFromLocalStorage()) {
            throw new Error('PROFILE_SAVE_FAILED');
        }
        await PersistenceFacade.flush();
        state.pendingProfileValues = null;
        state.persistenceMessage = 'Profilwerte dauerhaft gespeichert.';
        return true;
    } catch {
        previousValues.forEach((value, key) => restoreStoredValue(key, value));
        restoreStoredValue(PROFILE_STORAGE_KEYS.registry, previousRegistryRaw);
        state.pendingProfileValues = values;
        state.persistenceError = 'Profilwerte konnten nicht dauerhaft gespeichert werden. Der bestätigte Stand wurde wiederhergestellt; Retry ist möglich.';
        try {
            applyProfileAssetValuesToDom(loadProfileAssetValues());
        } catch {
            // Der sichtbare Fehlerstatus bleibt erhalten, auch wenn das Backend weiter nicht lesbar ist.
        }
        return false;
    } finally {
        state.profileCommitInFlight = false;
        renderPersistenceState();
    }
}

function bindProfileValueInputs() {
    PROFILE_INPUT_IDS.forEach(id => {
        const el = byId(id);
        if (!el) return;
        const eventName = el.tagName.toLowerCase() === 'select' ? 'change' : 'input';
        el.addEventListener(eventName, () => {
            const savePromise = saveProfileValues();
            renderTranchenStats(byId('stats'), state.tranchen);
            return savePromise;
        });
    });
}

function addTranche() {
    if (processingIsBlocked()) return;
    state.editingIndex = -1;
    openCreateTrancheModal();
}

function editTranche(index) {
    if (processingIsBlocked()) return;
    state.editingIndex = index;
    const tranche = state.tranchen[index];
    if (!tranche) return;
    openEditTrancheModal(tranche);
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
    } catch {
        state.persistenceError = 'Die Änderung verletzt den Tranchenvertrag und wurde nicht gespeichert.';
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
    if (!confirm('Tranche wirklich löschen?')) return;
    const nextTranches = state.tranchen.filter((_, itemIndex) => itemIndex !== index);
    await persistTranchen(nextTranches, { successMessage: 'Tranche dauerhaft gelöscht.' });
}

async function saveTranche(event) {
    event.preventDefault();
    if (processingIsBlocked()) return;

    const existingId = (state.editingIndex >= 0 && state.tranchen[state.editingIndex])
        ? state.tranchen[state.editingIndex].trancheId
        : null;
    const tranche = readTrancheFromForm(existingId);
    const nextTranches = [...state.tranchen];

    if (state.editingIndex >= 0) {
        nextTranches[state.editingIndex] = tranche;
    } else {
        nextTranches.push(tranche);
    }

    await persistTranchen(nextTranches, {
        successMessage: existingId ? 'Tranche dauerhaft aktualisiert.' : 'Tranche dauerhaft angelegt.',
        onSuccess: () => closeTrancheModal()
    });
}

async function clearAll() {
    if (processingIsBlocked()) return;
    if (!confirm('Alle Tranchen löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    await persistTranchen([], { successMessage: 'Alle Tranchen wurden dauerhaft gelöscht.' });
}

async function updatePrices() {
    if (processingIsBlocked()) return;
    if (!state.tranchen.length) {
        alert('Keine Tranchen vorhanden.');
        return;
    }

    const statusEl = byId('priceUpdateStatus');
    statusEl.textContent = 'Kurse werden aktualisiert...';

    let updated = 0;
    let failed = 0;
    let skipped = 0;
    const failedSymbols = [];
    const nextTranches = state.tranchen.map(tranche => ({ ...tranche }));

    for (const tranche of nextTranches) {
        const ticker = (tranche.ticker || '').trim();
        const isin = (tranche.isin || '').trim();
        const symbols = [];
        if (ticker) symbols.push(ticker);
        if (isin && !symbols.includes(isin)) symbols.push(isin);
        if (!symbols.length) {
            skipped += 1;
            continue;
        }

        statusEl.textContent = `Kurse werden aktualisiert... (${updated + failed + skipped + 1}/${nextTranches.length})`;

        let price = null;
        let resolvedSymbol = null;

        for (const symbol of symbols) {
            try {
                price = await fetchProxyPrice(symbol, LOCAL_YAHOO_PROXY);
                resolvedSymbol = symbol;
                break;
            } catch {
                try {
                    const lookup = await fetchProxySymbol(symbol, LOCAL_YAHOO_PROXY, tranche.name);
                    if (lookup) {
                        price = await fetchProxyPrice(lookup, LOCAL_YAHOO_PROXY);
                        resolvedSymbol = lookup;
                        break;
                    }
                } catch {
                    // Ein fehlgeschlagenes Symbol wird im sichtbaren Batchstatus zusammengefasst.
                }
            }
        }

        if (resolvedSymbol && resolvedSymbol !== ticker) tranche.ticker = resolvedSymbol;

        if (!Number.isFinite(price) || price <= 0) {
            failed += 1;
            failedSymbols.push(ticker || isin || 'unbekannt');
            continue;
        }

        Object.assign(tranche, calculateTrancheDerivedValues({ ...tranche, currentPrice: price }));
        updated += 1;
    }

    const committed = await persistTranchen(nextTranches, {
        successMessage: 'Kursänderungen dauerhaft gespeichert.'
    });
    if (!committed) {
        statusEl.textContent = 'Kurswerte konnten nicht dauerhaft gespeichert werden; der bestätigte Stand bleibt aktiv.';
        return;
    }

    const stamp = new Date().toLocaleString('de-DE');
    const failedNote = failedSymbols.length
        ? ` Fehlgeschlagen: ${failedSymbols.slice(0, 5).join(', ')}${failedSymbols.length > 5 ? ' ...' : ''}`
        : '';
    statusEl.textContent = `Kurs-Update ${stamp}: ${updated} aktualisiert, ${failed} fehlgeschlagen, ${skipped} ohne Ticker/ISIN. (Yahoo Finance)${failedNote}`;
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
    state.pendingCommit = null;
    clearRawPreview();

    if (result?.status === 'valid' || result?.status === 'empty') {
        const loaded = normalizeTranches(result.tranches || []);
        state.tranchen = loaded;
        state.confirmedTranches = loaded;
        state.confirmedRaw = result.raw;
        state.corruptRaw = null;
        state.loadStatus = result.status;
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
    byId('tranchenTable')?.addEventListener('click', event => {
        if (processingIsBlocked()) return;
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const index = Number(target.dataset.index);
        if (!Number.isFinite(index)) return;
        if (target.dataset.action === 'edit-tranche') editTranche(index);
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
    state.persistenceMessage = '';
    state.persistenceError = '';
    state.rawRevealed = false;
    state.profileId = profileId;
}

export function initTranchenManagerPage(options = {}) {
    const profileId = resolveActiveProfileId(options.profileId);
    const documentChanged = state.boundDocument !== document;
    const profileChanged = state.profileId !== profileId;
    state.loader = options.loader || loadTranchesFromStorage;

    if (documentChanged || profileChanged) {
        resetRuntimeState(profileId);
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
