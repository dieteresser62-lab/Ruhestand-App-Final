// @ts-check

export const WEALTH_HISTORY_SCHEMA_VERSION = 1;
export const WEALTH_HISTORY_START_DATE = '2026-01-01';
export const WEALTH_HISTORY_REASONS = Object.freeze({
    MANUAL: 'manual',
    ANNUAL_CLOSE: 'annual_close'
});

export class WealthHistoryError extends RangeError {
    constructor(path, message) {
        super(`${path}: ${message} Der gespeicherte Verlauf wurde nicht verändert.`);
        this.name = 'WealthHistoryError';
        this.code = 'WEALTH_HISTORY_INVALID';
        this.path = path;
    }
}

function fail(path, message) {
    throw new WealthHistoryError(path, message);
}

function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
}

export function assertWealthHistoryDate(value, path = 'asOf') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        fail(path, 'Ein Kalenderdatum im Format YYYY-MM-DD ist erforderlich.');
    }
    const [year, month, day] = value.split('-').map(Number);
    const leapYear = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
    const days = [31, leapYear ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
    if (year < 2026 || month < 1 || month > 12 || day < 1 || day > days[month - 1]) {
        fail(path, 'Ein echtes Kalenderdatum ab 2026-01-01 ist erforderlich.');
    }
    return value;
}

/** Das Datum einer manuellen Erfassung stammt aus dem lokalen Kalender. */
export function formatLocalWealthHistoryDate(date = new Date()) {
    if (!(date instanceof Date) || !Number.isFinite(date.getTime())) {
        fail('asOf', 'Der lokale Erfassungszeitpunkt ist ungültig.');
    }
    const value = `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    return assertWealthHistoryDate(value);
}

function assertAmount(value, path) {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        fail(path, 'Ein nichtnegativer endlicher Eurobetrag ist erforderlich.');
    }
    return value;
}

function assertSum(actual, expected, path) {
    assertAmount(expected, path);
    const tolerance = 8 * Number.EPSILON * Math.max(1, Math.abs(expected));
    if (Math.abs(actual - expected) > tolerance) {
        fail(path, 'Die Summe widerspricht den gespeicherten Vermögenskomponenten.');
    }
}

export function assertWealthHistoryEntry(entry, path = 'wealthHistory.entry') {
    if (!isRecord(entry)) fail(path, 'Ein Vermögenseintrag muss ein Objekt sein.');
    assertWealthHistoryDate(entry.asOf, `${path}.asOf`);
    if (entry.reason === WEALTH_HISTORY_REASONS.MANUAL) {
        if (entry.id !== `manual:${entry.asOf}` || entry.periodId !== null) {
            fail(path, 'Manuelle Identität, Stichtag und Periode widersprechen sich.');
        }
    } else if (entry.reason === WEALTH_HISTORY_REASONS.ANNUAL_CLOSE) {
        const year = entry.asOf.slice(0, 4);
        if (entry.asOf !== `${year}-12-31` || entry.id !== `annual:${year}` || entry.periodId !== `calendar-year:${year}`) {
            fail(path, 'Jahresidentität, Jahresenddatum und Periode widersprechen sich.');
        }
    } else {
        fail(`${path}.reason`, 'Der Erfassungsanlass wird nicht unterstützt.');
    }
    for (const field of ['tagesgeld', 'geldmarktEtf', 'depotwertAlt', 'depotwertNeu', 'aktienEtf', 'total']) {
        assertAmount(entry[field], `${path}.${field}`);
    }
    const equities = entry.depotwertAlt + entry.depotwertNeu;
    assertSum(entry.aktienEtf, equities, `${path}.aktienEtf`);
    assertSum(entry.total, entry.tagesgeld + entry.geldmarktEtf + entry.aktienEtf, `${path}.total`);
    return entry;
}

/** Vorhandene ungültige Felder sind Fehler; nur ein fehlendes State-Feld ist Legacy. */
export function assertWealthHistory(history, path = 'wealthHistory') {
    if (!isRecord(history) || history.schemaVersion !== WEALTH_HISTORY_SCHEMA_VERSION || !Array.isArray(history.entries)) {
        fail(path, 'Ein Verlauf mit schemaVersion 1 und einer Eintragsliste ist erforderlich.');
    }
    const ids = new Set();
    for (let index = 0; index < history.entries.length; index += 1) {
        const entry = assertWealthHistoryEntry(history.entries[index], `${path}.entries[${index}]`);
        if (ids.has(entry.id)) fail(`${path}.entries[${index}].id`, 'Die Identität ist mehrfach vorhanden.');
        ids.add(entry.id);
    }
    return history;
}

export function readWealthHistory(state) {
    return state && Object.prototype.hasOwnProperty.call(state, 'wealthHistory')
        ? assertWealthHistory(state.wealthHistory)
        : { schemaVersion: WEALTH_HISTORY_SCHEMA_VERSION, entries: [] };
}

export function assertBalanceWealthHistory(state) {
    readWealthHistory(state);
    return state;
}

function createEntry(inputData, identity) {
    if (!isRecord(inputData)) fail('inputData', 'Aktuelle Balance-Eingaben sind erforderlich.');
    const amounts = {};
    for (const field of ['tagesgeld', 'geldmarktEtf', 'depotwertAlt', 'depotwertNeu']) {
        amounts[field] = assertAmount(inputData[field], `inputData.${field}`);
    }
    const aktienEtf = amounts.depotwertAlt + amounts.depotwertNeu;
    return assertWealthHistoryEntry({
        ...identity,
        ...amounts,
        aktienEtf,
        total: amounts.tagesgeld + amounts.geldmarktEtf + aktienEtf
    });
}

export function createManualWealthHistoryEntry(inputData, asOf = new Date()) {
    const date = asOf instanceof Date ? formatLocalWealthHistoryDate(asOf) : assertWealthHistoryDate(asOf);
    return createEntry(inputData, { id: `manual:${date}`, asOf: date, reason: WEALTH_HISTORY_REASONS.MANUAL, periodId: null });
}

export function createAnnualWealthHistoryEntry(inputData, targetYear) {
    if (!Number.isInteger(targetYear) || targetYear < 2026 || targetYear > 9999) {
        fail('targetYear', 'Ein Abschlussjahr zwischen 2026 und 9999 ist erforderlich.');
    }
    return createEntry(inputData, {
        id: `annual:${targetYear}`,
        asOf: `${targetYear}-12-31`,
        reason: WEALTH_HISTORY_REASONS.ANNUAL_CLOSE,
        periodId: `calendar-year:${targetYear}`
    });
}

function upsert(history, entry, reason) {
    assertWealthHistory(history);
    assertWealthHistoryEntry(entry);
    if (entry.reason !== reason) fail('wealthHistory.entry.reason', 'Der Anlass passt nicht zur Erfassungsfunktion.');
    const index = history.entries.findIndex(existing => existing.id === entry.id);
    // Ein bereits bestätigter Jahresstand bleibt einschließlich seiner Werte unverändert.
    if (index >= 0 && reason === WEALTH_HISTORY_REASONS.ANNUAL_CLOSE) return history;
    const entries = history.entries.map(existing => ({ ...existing }));
    if (index >= 0) entries[index] = { ...entry };
    else entries.push({ ...entry });
    return { ...history, entries };
}

export function upsertManualWealthHistory(history, entry) {
    return upsert(history, entry, WEALTH_HISTORY_REASONS.MANUAL);
}

export function upsertAnnualWealthHistory(history, entry) {
    return upsert(history, entry, WEALTH_HISTORY_REASONS.ANNUAL_CLOSE);
}
