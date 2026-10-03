/**
 * Module: Balance Expenses Metrics
 * Purpose: DOM-free calculations for the expenses check.
 */
"use strict";

export function computeSpent(categories) {
    const values = Object.values(categories || {});
    const sum = values.reduce((acc, val) => acc + (Number(val) || 0), 0);
    const spent = sum < 0 ? -sum : sum;
    return { sum, spent };
}

export function computeMedian(values) {
    if (!values || values.length === 0) return 0;
    const sorted = [...values].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    if (sorted.length % 2 === 0) {
        return (sorted[mid - 1] + sorted[mid]) / 2;
    }
    return sorted[mid];
}

export function sumMonthProfiles(monthData) {
    const profiles = monthData?.profiles || {};
    return Object.values(profiles).reduce((acc, entry) => {
        const { spent } = computeSpent(entry?.categories || {});
        return acc + spent;
    }, 0);
}

export function computeYearStats({ yearData, annualBudget = 0, monthlyBudget = 0 }) {
    let annualUsed = 0;
    let ytdUsed = 0;
    let monthsWithData = 0;
    let sumWithData = 0;
    const monthTotalsWithData = [];

    for (let month = 1; month <= 12; month++) {
        const monthData = yearData?.months?.[String(month)] || { profiles: {} };
        const monthTotal = sumMonthProfiles(monthData);
        annualUsed += monthTotal;
        if (monthTotal > 0) {
            ytdUsed += monthTotal;
            monthsWithData += 1;
            sumWithData += monthTotal;
            monthTotalsWithData.push(monthTotal);
        }
    }

    const annualRemaining = (annualBudget || 0) - annualUsed;
    const avgMonthly = monthsWithData > 0 ? sumWithData / monthsWithData : 0;
    const medianMonthly = computeMedian(monthTotalsWithData);
    const forecastBase = monthsWithData >= 2 ? medianMonthly : avgMonthly;
    const annualForecast = forecastBase > 0 ? forecastBase * 12 : 0;
    const ytdBudget = (monthlyBudget || 0) * monthsWithData;
    const ytdDelta = ytdBudget > 0 ? (ytdUsed - ytdBudget) : 0;

    return {
        annualUsed,
        annualRemaining,
        ytdUsed,
        ytdBudget,
        ytdDelta,
        annualForecast,
        avgMonthly,
        medianMonthly,
        monthsWithData
    };
}

/**
 * Lesende Jahresprojektion aller gespeicherten Profile, unabhängig von activeYear.
 * currentYear ist das vom Aufrufer bestimmte lokale Kalenderjahr; kein Uhr-/Storagezugriff.
 * Nullimporte bleiben sichtbar, reine Auswahlcontainer werden ausgelassen.
 */
export function prepareExpensesHistoryMetrics(store, currentYear) {
    const isRecord = value => value !== null && typeof value === 'object' && !Array.isArray(value);
    if (!isRecord(store?.years)) return [];

    return Object.entries(store.years)
        .filter(([key, yearData]) => {
            const year = Number(key);
            if (!Number.isSafeInteger(year) || year <= 0 || String(year) !== key
                || !isRecord(yearData) || !isRecord(yearData.months)) return false;
            // Nur die zwölf Kalendermonate können einen importierten Eintrag belegen.
            for (let month = 1; month <= 12; month++) {
                const profiles = yearData.months[String(month)]?.profiles;
                if (isRecord(profiles) && Object.values(profiles).some(entry =>
                    isRecord(entry) && isRecord(entry.categories))) return true;
            }
            return false;
        })
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([key, yearData]) => {
            const year = Number(key);
            const { annualUsed, monthsWithData, avgMonthly } = computeYearStats({ yearData });
            return {
                year,
                annualUsed,
                monthsWithData,
                avgMonthly,
                isCurrentPartialYear: year === currentYear && monthsWithData < 12
            };
        });
}

export function sortExpenseEntries(categories) {
    return Object.entries(categories || {})
        .map(([name, value]) => ({ name, value: Number(value) || 0 }))
        .sort((a, b) => Math.abs(b.value) - Math.abs(a.value));
}
