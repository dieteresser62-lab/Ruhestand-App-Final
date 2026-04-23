// @ts-check

import { getCurrentProfileId, getProfileMeta, saveCurrentProfileFromLocalStorage } from '../profile/profile-storage.js';
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

const state = {
    tranchen: [],
    editingIndex: -1
};

function byId(id) {
    return document.getElementById(id);
}

function syncGlobalState() {
    window.tranchen = state.tranchen;
}

function persistTranchen() {
    saveTranchesToStorage(state.tranchen);
    saveCurrentProfileFromLocalStorage();
    syncGlobalState();
}

function updateActiveProfileLabel() {
    const label = byId('activeProfileName');
    if (!label) return;
    const currentId = getCurrentProfileId();
    const meta = getProfileMeta(currentId);
    label.textContent = meta?.name || currentId || '-';
}

function saveProfileValues() {
    saveProfileAssetValues(readProfileAssetValuesFromDom());
    saveCurrentProfileFromLocalStorage();
}

function render() {
    renderTranchenStats(byId('stats'), state.tranchen);
    renderTranchenTable(byId('tranchenTable'), state.tranchen);
}

function bindProfileValueInputs() {
    const inputIds = [
        'profileTagesgeld',
        'profileAlter',
        'profileRenteMonatlich',
        'profileSonstigeEinkuenfte',
        'profileGoldAktiv',
        'profileGoldZiel',
        'profileGoldFloor',
        'profileGoldBand',
        'profileGoldSteuerfrei'
    ];
    inputIds.forEach(id => {
        const el = byId(id);
        if (!el) return;
        const eventName = el.tagName.toLowerCase() === 'select' ? 'change' : 'input';
        el.addEventListener(eventName, () => {
            saveProfileValues();
            renderTranchenStats(byId('stats'), state.tranchen);
        });
    });
}

function addTranche() {
    state.editingIndex = -1;
    openCreateTrancheModal();
}

function editTranche(index) {
    state.editingIndex = index;
    const t = state.tranchen[index];
    if (!t) return;
    openEditTrancheModal(t);
}

function deleteTranche(index) {
    if (!confirm('Tranche wirklich löschen?')) return;
    state.tranchen.splice(index, 1);
    persistTranchen();
    render();
}

function saveTranche(event) {
    event.preventDefault();

    const existingId = (state.editingIndex >= 0 && state.tranchen[state.editingIndex])
        ? state.tranchen[state.editingIndex].trancheId
        : null;

    const tranche = readTrancheFromForm(existingId);

    if (state.editingIndex >= 0) {
        state.tranchen[state.editingIndex] = tranche;
    } else {
        state.tranchen.push(tranche);
    }

    persistTranchen();
    closeTrancheModal();
    render();
}

function exportTranches() {
    const json = JSON.stringify(state.tranchen, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `depot-tranchen-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function importTranches() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'application/json';
    input.onchange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                state.tranchen = normalizeTranches(JSON.parse(event.target.result));
                persistTranchen();
                render();
                alert('Import erfolgreich!');
            } catch (err) {
                alert('Fehler beim Import: ' + err.message);
            }
        };
        reader.readAsText(file);
    };
    input.click();
}

function clearAll() {
    if (!confirm('Alle Tranchen löschen? Diese Aktion kann nicht rückgängig gemacht werden.')) return;
    state.tranchen = [];
    persistTranchen();
    render();
}

async function updatePrices() {
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

    for (const t of state.tranchen) {
        const ticker = (t.ticker || '').trim();
        const isin = (t.isin || '').trim();
        const symbols = [];
        if (ticker) symbols.push(ticker);
        if (isin && !symbols.includes(isin)) symbols.push(isin);
        if (!symbols.length) {
            skipped += 1;
            continue;
        }

        statusEl.textContent = `Kurse werden aktualisiert... (${updated + failed + skipped + 1}/${state.tranchen.length})`;

        let price = null;
        let resolvedSymbol = null;

        for (const symbol of symbols) {
            try {
                price = await fetchProxyPrice(symbol, LOCAL_YAHOO_PROXY);
                resolvedSymbol = symbol;
                break;
            } catch {
                try {
                    const lookup = await fetchProxySymbol(symbol, LOCAL_YAHOO_PROXY, t.name);
                    if (lookup) {
                        price = await fetchProxyPrice(lookup, LOCAL_YAHOO_PROXY);
                        resolvedSymbol = lookup;
                        break;
                    }
                } catch (errLookup) {
                    console.warn('Yahoo Lookup fehlgeschlagen:', symbol, errLookup);
                }
            }
        }

        if (resolvedSymbol && resolvedSymbol !== ticker) {
            t.ticker = resolvedSymbol;
        }

        if (!Number.isFinite(price) || price <= 0) {
            failed += 1;
            failedSymbols.push(ticker || isin || 'unbekannt');
            continue;
        }

        Object.assign(t, calculateTrancheDerivedValues({ ...t, currentPrice: price }));
        updated += 1;
    }

    persistTranchen();
    render();

    const stamp = new Date().toLocaleString('de-DE');
    const failedNote = failedSymbols.length ? ` Fehlgeschlagen: ${failedSymbols.slice(0, 5).join(', ')}${failedSymbols.length > 5 ? ' ...' : ''}` : '';
    statusEl.textContent = `Kurs-Update ${stamp}: ${updated} aktualisiert, ${failed} fehlgeschlagen, ${skipped} ohne Ticker/ISIN. (Yahoo Finance)${failedNote}`;
}

function bindControls() {
    byId('addTrancheBtn')?.addEventListener('click', addTranche);
    byId('updatePricesBtn')?.addEventListener('click', () => updatePrices());
    byId('proxyHealthBtn')?.addEventListener('click', () => checkProxyHealth(byId('priceUpdateStatus')));
    byId('exportTranchesBtn')?.addEventListener('click', exportTranches);
    byId('importTranchesBtn')?.addEventListener('click', importTranches);
    byId('clearTranchesBtn')?.addEventListener('click', clearAll);
    byId('closeTrancheModalBtn')?.addEventListener('click', () => closeTrancheModal());
    byId('trancheForm')?.addEventListener('submit', saveTranche);
    byId('tranchenTable')?.addEventListener('click', (event) => {
        const target = event.target.closest('[data-action]');
        if (!target) return;
        const index = Number(target.dataset.index);
        if (!Number.isFinite(index)) return;
        if (target.dataset.action === 'edit-tranche') editTranche(index);
        if (target.dataset.action === 'delete-tranche') deleteTranche(index);
    });
}

export function initTranchenManagerPage() {
    state.tranchen = loadTranchesFromStorage();
    persistTranchen();
    applyProfileAssetValuesToDom(loadProfileAssetValues());
    updateActiveProfileLabel();
    bindProfileValueInputs();
    bindControls();
    syncGlobalState();
    render();
}
