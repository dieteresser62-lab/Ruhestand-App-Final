/**
 * Module: Balance Expenses (Ausgaben-Check)
 * Purpose: Monatliche Kategorien-Importe verwalten und gegen Budget prüfen.
 * Usage: Initialisiert in balance-main.js, arbeitet rein im Browser (localStorage).
 */
"use strict";

import { UIUtils } from './balance-utils.js';
import { UIRenderer } from './balance-renderer.js';
import { loadProfilverbundProfiles } from '../profile/profilverbund-balance.js';
import { parseCategoryCsv } from './balance-expenses-csv.js';
import { computeYearStats } from './balance-expenses-metrics.js';
import {
    getExpensesMonthData,
    getExpensesYearData,
    listExpensesYears,
    loadExpensesStore,
    resolveExpensesInitialYear,
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
    profileIds: []
};
let pendingImport = null;

function formatCurrency(value) {
    return UIUtils.formatCurrency(Math.abs(value || 0));
}

function getProfiles() {
    const profiles = loadProfilverbundProfiles();
    if (profiles.length > 0) return profiles;
    return [{ profileId: 'default', name: 'Profil', inputs: {} }];
}

function renderYearSelect() {
    if (!dom?.expenses?.yearSelect) return;
    const store = loadExpensesStore();
    renderExpensesYearSelect({
        select: dom.expenses.yearSelect,
        years: listExpensesYears({ store, activeYear: state.year }),
        activeYear: state.year
    });
}

function updateSummary(store) {
    if (!dom?.expenses) return;
    const safeStore = store || loadExpensesStore();
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
    const store = loadExpensesStore();
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
    if (!Number.isFinite(year)) return;
    state.year = year;
    setExpensesActiveYear(year);
    renderYearSelect();
    renderTable();
}

function openDetails(month, profileId) {
    if (!dom?.expenses?.detailDialog) return;
    const store = loadExpensesStore();
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
    const text = await file.text();
    const categories = parseCategoryCsv(text);

    const store = loadExpensesStore();
    const yearData = getExpensesYearData(store, state.year);
    const monthData = getExpensesMonthData(yearData, month);
    monthData.profiles[profileId] = {
        categories,
        updatedAt: new Date().toISOString()
    };
    saveExpensesStore(store);

    refreshTableValues();
    UIRenderer.toast('CSV importiert.');
}

function deleteMonthData(month, profileId) {
    const store = loadExpensesStore();
    const yearData = store?.years?.[String(state.year)];
    if (!yearData?.months) return false;
    const monthData = yearData.months[String(month)];
    if (!monthData?.profiles || !Object.prototype.hasOwnProperty.call(monthData.profiles, profileId)) {
        return false;
    }
    delete monthData.profiles[profileId];
    saveExpensesStore(store);
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

export function initExpensesTab(domRefs) {
    dom = domRefs;
    state.year = resolveExpensesInitialYear();
    setExpensesActiveYear(state.year);
    bindEvents();
    renderYearSelect();
    renderTable();
}

export function updateExpensesBudget({ monthlyBudget, annualBudget }) {
    state.monthlyBudget = Number.isFinite(monthlyBudget) ? monthlyBudget : 0;
    state.annualBudget = Number.isFinite(annualBudget) ? annualBudget : 0;
    renderTable();
}

export function rollExpensesYear() {
    const nextYear = state.year + 1;
    setYear(nextYear);
    return nextYear;
}
