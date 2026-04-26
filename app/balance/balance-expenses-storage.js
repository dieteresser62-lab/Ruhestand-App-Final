/**
 * Module: Balance Expenses Storage
 * Purpose: localStorage access and schema helpers for the expenses check.
 */
"use strict";

export const EXPENSES_STORAGE_KEY = 'balance_expenses_v1';

export function createEmptyExpensesStore(activeYear = new Date().getFullYear()) {
    return { version: 1, activeYear, years: {} };
}

export function loadExpensesStore(storage = globalThis.localStorage) {
    try {
        const raw = storage?.getItem(EXPENSES_STORAGE_KEY);
        if (!raw) return createEmptyExpensesStore();
        const parsed = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object') return createEmptyExpensesStore();
        if (!parsed.years || typeof parsed.years !== 'object') parsed.years = {};
        if (!parsed.activeYear) parsed.activeYear = new Date().getFullYear();
        return parsed;
    } catch {
        return createEmptyExpensesStore();
    }
}

export function saveExpensesStore(store, storage = globalThis.localStorage) {
    storage?.setItem(EXPENSES_STORAGE_KEY, JSON.stringify(store));
}

export function getExpensesYearData(store, year) {
    const key = String(year);
    if (!store.years) store.years = {};
    if (!store.years[key]) store.years[key] = { months: {} };
    if (!store.years[key].months) store.years[key].months = {};
    return store.years[key];
}

export function getExpensesMonthData(yearData, month) {
    const key = String(month);
    if (!yearData.months) yearData.months = {};
    if (!yearData.months[key]) yearData.months[key] = { profiles: {} };
    if (!yearData.months[key].profiles) yearData.months[key].profiles = {};
    return yearData.months[key];
}

export function setExpensesActiveYear(year, storage = globalThis.localStorage) {
    const store = loadExpensesStore(storage);
    store.activeYear = year;
    getExpensesYearData(store, year);
    saveExpensesStore(store, storage);
}

export function resolveExpensesInitialYear(storage = globalThis.localStorage, fallback = new Date().getFullYear()) {
    const store = loadExpensesStore(storage);
    const activeYear = Number(store.activeYear);
    return Number.isFinite(activeYear) ? activeYear : fallback;
}

export function listExpensesYears({ store, activeYear, currentYear = new Date().getFullYear() }) {
    const years = new Set([currentYear, activeYear]);
    Object.keys(store?.years || {}).forEach(key => {
        const val = Number(key);
        if (Number.isFinite(val)) years.add(val);
    });
    return Array.from(years).sort((a, b) => a - b);
}

