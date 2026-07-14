/**
 * Module: Balance Expenses (Ausgaben-Check)
 * Purpose: Monatliche Kategorien-Importe verwalten und gegen Budget prüfen.
 * Usage: Initialisiert in balance-main.js, arbeitet rein im Browser (localStorage).
 */
"use strict";

import { UIUtils } from './balance-utils.js';
import { UIRenderer } from './balance-renderer.js';
import { loadProfilverbundProfiles } from '../profile/profilverbund-balance.js';
import { downloadJsonFile } from '../shared/persistence-backup.js';
import { PersistenceFacade, persistenceStorage } from '../shared/persistence-facade.js';
import { parseCategoryCsv } from './balance-expenses-csv.js';
import { computeYearStats } from './balance-expenses-metrics.js';
import {
    createExpensesCorruptionRecoveryDocument,
    EXPENSES_STORAGE_KEY,
    EXPENSES_STORE_STATUS,
    getExpensesMonthData,
    getExpensesYearData,
    listExpensesYears,
    loadExpensesStoreResult,
    resetCorruptExpensesStore,
    saveExpensesStore,
    setExpensesActiveYear
} from './balance-expenses-storage.js';
import {
    EXPENSE_MONTHS,
    refreshExpensesTableValues,
    renderExpensesDetails,
    renderExpensesSummary,
    renderExpensesTableStructure,
    renderExpensesYearSelect
} from './balance-expenses-renderer.js';

let dom = null;
const state = {
    year: new Date().getFullYear(),
    monthlyBudget: 0,
    annualBudget: 0,
    profileIds: [],
    corruption: null,
    recoveryExported: false,
    recoveryCancelled: false
};
let pendingImport = null;
let recoveryOptions = null;

function createDefaultRecoveryOptions(options = {}) {
    return {
        storage: options.storage || persistenceStorage,
        getPersistenceStatus: options.getPersistenceStatus
            || (() => PersistenceFacade.getPersistenceStatus()),
        confirmReset: options.confirmReset
            || ((message) => typeof globalThis.confirm === 'function' && globalThis.confirm(message)),
        downloadRecovery: options.downloadRecovery
            || ((document, filename) => downloadJsonFile(document, filename, globalThis.document)),
        flush: options.flush || (() => PersistenceFacade.flush()),
        now: options.now || (() => new Date())
    };
}

function getBackendLabel() {
    try {
        return String(recoveryOptions?.getPersistenceStatus?.()?.backend || 'unknown');
    } catch {
        return 'unknown';
    }
}

function createRecoveryFilename(date = new Date()) {
    return `balance-ausgaben-recovery-${date.toISOString().replace(/[:.]/g, '-')}.json`;
}

function readExpensesStoreForUi() {
    const result = loadExpensesStoreResult(recoveryOptions?.storage);
    if (result.status === EXPENSES_STORE_STATUS.CORRUPT) {
        const isSameCorruption = state.corruption?.raw === result.raw
            && state.corruption?.error?.code === result.error?.code;
        state.corruption = result;
        if (!isSameCorruption) {
            state.recoveryExported = false;
            state.recoveryCancelled = false;
        }
        return null;
    }
    state.corruption = null;
    state.recoveryExported = false;
    state.recoveryCancelled = false;
    return result.store;
}

function formatCurrency(value) {
    return UIUtils.formatCurrency(Math.abs(value || 0));
}

function getProfiles() {
    const profiles = loadProfilverbundProfiles();
    if (profiles.length > 0) return profiles;
    return [{ profileId: 'default', name: 'Profil', inputs: {} }];
}

async function exportCorruptExpensesRecovery() {
    if (!state.corruption || typeof state.corruption.raw !== 'string') return;
    try {
        const recoveryDocument = createExpensesCorruptionRecoveryDocument(state.corruption, {
            backend: getBackendLabel(),
            exportedAt: recoveryOptions.now().toISOString()
        });
        const filename = createRecoveryFilename(recoveryOptions.now());
        await recoveryOptions.downloadRecovery(recoveryDocument, filename);
        state.recoveryExported = true;
        state.recoveryCancelled = false;
        renderCorruptExpensesState();
        UIRenderer.toast('Recovery-Export der korrupten Ausgabendaten erstellt.');
    } catch {
        UIRenderer.handleError(new Error(
            'Der Recovery-Export konnte nicht erstellt werden. Die korrupten Ausgabendaten bleiben unveraendert.'
        ));
    }
}

async function resetCorruptExpensesAfterConfirmation() {
    if (!state.corruption || !state.recoveryExported) return;
    const backend = getBackendLabel();
    const confirmed = recoveryOptions.confirmReset(
        `Ausgaben-Check auf Backend ${backend} zuruecksetzen?\n\n`
        + 'Der korrupte Rohinhalt wurde als Recovery-Datei exportiert. Erst nach dieser Bestaetigung wird der Ausgabenbereich durch einen leeren Store ersetzt.'
    );
    if (!confirmed) return;

    const corruption = state.corruption;
    let resetApplied = false;
    try {
        resetCorruptExpensesStore(corruption, {
            storage: recoveryOptions.storage,
            rawPreserved: true,
            activeYear: state.year
        });
        resetApplied = true;
        await recoveryOptions.flush();
        state.corruption = null;
        state.recoveryExported = false;
        state.recoveryCancelled = false;
        state.profileIds = [];
        if (dom?.expenses?.yearSelect) dom.expenses.yearSelect.disabled = false;
        renderYearSelect();
        renderTable();
        UIRenderer.toast('Der Ausgaben-Check wurde nach bestaetigtem Recovery-Export zurueckgesetzt.');
    } catch {
        if (resetApplied && typeof corruption.raw === 'string') {
            try {
                recoveryOptions.storage?.setItem(EXPENSES_STORAGE_KEY, corruption.raw);
            } catch {
                // Der bereits exportierte Rohinhalt bleibt der sichere Recovery-Punkt.
            }
        }
        readExpensesStoreForUi();
        renderCorruptExpensesState();
        UIRenderer.handleError(new Error(
            'Der Ausgaben-Check wurde nicht zurueckgesetzt. Die gespeicherten Daten muessen neu geladen und erneut exportiert werden.'
        ));
    }
}

function cancelCorruptExpensesRecovery() {
    if (!state.corruption) return;
    state.recoveryCancelled = true;
    renderCorruptExpensesState();
}

function createRecoveryAction(label, action, handler, disabled = false) {
    const button = globalThis.document.createElement('button');
    button.type = 'button';
    button.textContent = label;
    button.dataset.action = action;
    button.disabled = disabled;
    button.addEventListener('click', handler);
    return button;
}

function renderCorruptExpensesState() {
    const host = dom?.expenses?.table;
    if (!host || !state.corruption) return;
    if (dom.expenses.yearSelect) dom.expenses.yearSelect.disabled = true;

    const panel = globalThis.document.createElement('section');
    panel.dataset.expensesRecovery = 'corrupt';
    panel.setAttribute?.('role', 'alert');
    panel.className = 'error-warn';

    const title = globalThis.document.createElement('h3');
    title.textContent = 'Ausgaben-Check: korrupte Persistenz erkannt';
    const message = globalThis.document.createElement('p');
    message.dataset.role = 'expenses-recovery-message';
    message.textContent = `Betroffener Datenbereich: Ausgaben-Check. Backend: ${getBackendLabel()}. ${state.corruption.error?.message || ''} Ohne ausdrueckliche Nutzerentscheidung werden keine Daten ueberschrieben.`;
    panel.append(title, message);

    if (state.recoveryCancelled) {
        const cancelled = globalThis.document.createElement('p');
        cancelled.dataset.role = 'expenses-recovery-cancelled';
        cancelled.textContent = 'Recovery abgebrochen. Der korrupte Rohinhalt bleibt unveraendert; nach einem Neuladen werden die sicheren Optionen erneut angeboten.';
        panel.appendChild(cancelled);
        host.replaceChildren(panel);
        return;
    }

    const actions = globalThis.document.createElement('div');
    actions.dataset.role = 'expenses-recovery-actions';
    const canExport = typeof state.corruption.raw === 'string';
    const exportButton = createRecoveryAction(
        state.recoveryExported ? 'Recovery exportiert' : 'Export / Recovery',
        'expenses-recovery-export',
        exportCorruptExpensesRecovery,
        !canExport
    );
    const resetButton = createRecoveryAction(
        'Zuruecksetzen',
        'expenses-recovery-reset',
        resetCorruptExpensesAfterConfirmation,
        !state.recoveryExported
    );
    const cancelButton = createRecoveryAction(
        'Abbrechen',
        'expenses-recovery-cancel',
        cancelCorruptExpensesRecovery
    );
    actions.append(exportButton, resetButton, cancelButton);
    panel.appendChild(actions);

    if (!canExport) {
        const blocked = globalThis.document.createElement('p');
        blocked.textContent = 'Der Rohinhalt ist nicht lesbar. Export und Zuruecksetzen bleiben gesperrt; bitte Speicherzugriff und App-Berechtigungen pruefen.';
        panel.appendChild(blocked);
    } else if (!state.recoveryExported) {
        const hint = globalThis.document.createElement('p');
        hint.textContent = 'Zuruecksetzen wird erst nach einem erfolgreichen Recovery-Export freigeschaltet.';
        panel.appendChild(hint);
    }

    host.replaceChildren(panel);
}

function renderYearSelect() {
    if (!dom?.expenses?.yearSelect) return;
    if (state.corruption) {
        dom.expenses.yearSelect.disabled = true;
        return;
    }
    const store = readExpensesStoreForUi();
    if (!store) {
        renderCorruptExpensesState();
        return;
    }
    dom.expenses.yearSelect.disabled = false;
    renderExpensesYearSelect({
        select: dom.expenses.yearSelect,
        years: listExpensesYears({ store, activeYear: state.year }),
        activeYear: state.year
    });
}

function updateSummary(store) {
    if (!dom?.expenses) return;
    const safeStore = store || readExpensesStoreForUi();
    if (!safeStore) {
        renderCorruptExpensesState();
        return;
    }
    const yearData = getExpensesYearData(safeStore, state.year);
    const stats = computeYearStats({
        yearData,
        annualBudget: state.annualBudget,
        monthlyBudget: state.monthlyBudget
    });
    renderExpensesSummary({
        refs: dom.expenses,
        stats,
        annualBudget: state.annualBudget,
        monthlyBudget: state.monthlyBudget,
        formatCurrency
    });
}

function refreshTableValues() {
    if (!dom?.expenses?.table) return;
    const store = readExpensesStoreForUi();
    if (!store) {
        renderCorruptExpensesState();
        return;
    }
    const yearData = getExpensesYearData(store, state.year);
    refreshExpensesTableValues({
        host: dom.expenses.table,
        yearData,
        profileIds: state.profileIds,
        monthlyBudget: state.monthlyBudget,
        formatCurrency
    });
    updateSummary(store);
}

function renderTable() {
    if (!dom?.expenses?.table) return;
    if (state.corruption) {
        renderCorruptExpensesState();
        return;
    }
    const profiles = getProfiles();
    const profileIds = profiles.map(p => p.profileId);
    const needsRebuild = profileIds.join('|') !== state.profileIds.join('|');

    if (needsRebuild) {
        state.profileIds = profileIds;
        renderExpensesTableStructure({
            host: dom.expenses.table,
            profiles
        });
    }

    refreshTableValues();
}

function setYear(year) {
    if (!Number.isFinite(year) || state.corruption) return;
    try {
        state.year = year;
        setExpensesActiveYear(year, recoveryOptions?.storage);
        renderYearSelect();
        renderTable();
    } catch {
        readExpensesStoreForUi();
        renderCorruptExpensesState();
    }
}

function openDetails(month, profileId) {
    if (!dom?.expenses?.detailDialog || state.corruption) return;
    const store = readExpensesStoreForUi();
    if (!store) {
        renderCorruptExpensesState();
        return;
    }
    const yearData = getExpensesYearData(store, state.year);
    const monthData = getExpensesMonthData(yearData, month);
    const profileData = monthData.profiles?.[profileId];
    const categories = profileData?.categories || {};
    const profileName = getProfiles().find(p => p.profileId === profileId)?.name || profileId;

    renderExpensesDetails({
        refs: dom.expenses,
        monthName: EXPENSE_MONTHS[month - 1],
        profileName,
        categories,
        formatCurrency
    });
}

async function handleCsvImport(file, month, profileId) {
    if (state.corruption) {
        renderCorruptExpensesState();
        return;
    }
    const text = await file.text();
    const categories = parseCategoryCsv(text);

    const store = readExpensesStoreForUi();
    if (!store) {
        renderCorruptExpensesState();
        return;
    }
    const yearData = getExpensesYearData(store, state.year);
    const monthData = getExpensesMonthData(yearData, month);
    monthData.profiles[profileId] = {
        categories,
        updatedAt: new Date().toISOString()
    };
    saveExpensesStore(store, recoveryOptions?.storage);

    refreshTableValues();
    UIRenderer.toast('CSV importiert.');
}

function deleteMonthData(month, profileId) {
    if (state.corruption) return false;
    const store = readExpensesStoreForUi();
    if (!store) {
        renderCorruptExpensesState();
        return false;
    }
    const yearData = store?.years?.[String(state.year)];
    if (!yearData?.months) return false;
    const monthData = yearData.months[String(month)];
    if (!monthData?.profiles || !Object.prototype.hasOwnProperty.call(monthData.profiles, profileId)) {
        return false;
    }
    delete monthData.profiles[profileId];
    saveExpensesStore(store, recoveryOptions?.storage);
    refreshTableValues();
    UIRenderer.toast('Monatsdaten gelöscht.');
    return true;
}

function handleTableClick(e) {
    const button = e.target.closest('button[data-action]');
    if (!button) return;
    const action = button.dataset.action;
    const month = Number(button.dataset.month);
    const profileId = button.dataset.profile;
    if (!month || !profileId) return;

    if (action === 'import') {
        pendingImport = { month, profileId };
        dom.expenses.csvInput.click();
        return;
    }

    if (action === 'details') {
        openDetails(month, profileId);
        return;
    }

    if (action === 'delete') {
        const monthName = EXPENSE_MONTHS[month - 1] || String(month);
        const confirmFn = typeof globalThis.confirm === 'function' ? globalThis.confirm.bind(globalThis) : null;
        if (!confirmFn) return;
        const confirmed = confirmFn(`Monatsdaten für ${monthName} löschen?`);
        if (!confirmed) return;
        deleteMonthData(month, profileId);
    }
}

function handleFileChange(e) {
    const file = e.target.files?.[0];
    if (!file || !pendingImport) return;
    const { month, profileId } = pendingImport;
    pendingImport = null;

    handleCsvImport(file, month, profileId).catch(err => {
        UIRenderer.handleError(err);
    }).finally(() => {
        e.target.value = '';
    });
}

function bindEvents() {
    if (dom?.expenses?.table) {
        dom.expenses.table.addEventListener('click', handleTableClick);
    }
    if (dom?.expenses?.csvInput) {
        dom.expenses.csvInput.addEventListener('change', handleFileChange);
    }
    if (dom?.expenses?.yearSelect) {
        dom.expenses.yearSelect.addEventListener('change', (event) => {
            const year = Number(event.target.value);
            setYear(year);
        });
    }
    if (dom?.expenses?.detailClose) {
        dom.expenses.detailClose.addEventListener('click', () => dom.expenses.detailDialog.close());
    }
    if (dom?.expenses?.detailDialog) {
        dom.expenses.detailDialog.addEventListener('click', (event) => {
            if (event.target === dom.expenses.detailDialog) dom.expenses.detailDialog.close();
        });
    }
}

export function initExpensesTab(domRefs, options = {}) {
    dom = domRefs;
    recoveryOptions = createDefaultRecoveryOptions(options);
    pendingImport = null;
    state.profileIds = [];
    state.recoveryExported = false;
    state.recoveryCancelled = false;

    const initialResult = loadExpensesStoreResult(recoveryOptions.storage);
    if (initialResult.status === EXPENSES_STORE_STATUS.CORRUPT) {
        state.corruption = initialResult;
        state.year = recoveryOptions.now().getFullYear();
        bindEvents();
        renderCorruptExpensesState();
        return initialResult;
    }

    state.corruption = null;
    state.year = Number(initialResult.store?.activeYear) || recoveryOptions.now().getFullYear();
    setExpensesActiveYear(state.year, recoveryOptions.storage);
    bindEvents();
    renderYearSelect();
    renderTable();
    return initialResult;
}

export function updateExpensesBudget({ monthlyBudget, annualBudget }) {
    state.monthlyBudget = Number.isFinite(monthlyBudget) ? monthlyBudget : 0;
    state.annualBudget = Number.isFinite(annualBudget) ? annualBudget : 0;
    renderTable();
}

export function rollExpensesYear() {
    if (state.corruption) return state.year;
    const nextYear = state.year + 1;
    setYear(nextYear);
    return nextYear;
}
