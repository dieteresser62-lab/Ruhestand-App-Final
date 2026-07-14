/**
 * Module: Balance Binder Imports
 * Purpose: Manages Data Import/Export functionality.
 *          It handles JSON state export/import and CSV market data import (parsing legacy CSV formats).
 * Usage: Used by balance-binder.js to handle file inputs and export buttons.
 * Dependencies: balance-config.js, balance-reader.js, balance-renderer.js, balance-storage.js
 */
import { CONFIG, AppError, StorageError } from './balance-config.js';
import { UIReader } from './balance-reader.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';
import { UIUtils } from './balance-utils.js';

export const BALANCE_EXPORT_APP_ID = 'ruhe-stand-suite.balance';
export const BALANCE_EXPORT_SCHEMA = 'balance-state';
export const BALANCE_EXPORT_SCHEMA_VERSION = 1;

const SUPPORTED_LEGACY_APP_VERSIONS = new Set([
    'v21.1 Refactored (Engine v31)',
    'v22.0 ES6 Modules (Engine v31)'
]);

const REQUIRED_INPUT_NUMBERS = Object.freeze([
    'aktuellesAlter',
    'floorBedarf',
    'flexBedarf'
]);

const NON_NEGATIVE_INPUT_NUMBERS = Object.freeze([
    'floorBedarf',
    'flexBedarf',
    'minimumFlexAnnual',
    'tagesgeld',
    'geldmarktEtf',
    'depotwertAlt',
    'depotwertNeu',
    'goldWert',
    'costBasisAlt',
    'costBasisNeu',
    'goldCost'
]);

function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

export class BalanceImportError extends AppError {
    constructor(code, message) {
        super(message);
        this.name = 'BalanceImportError';
        this.code = code;
    }
}

function failImport(code, message) {
    throw new BalanceImportError(code, message);
}

export class MarketCsvImportError extends AppError {
    constructor(code, message, details = {}) {
        super(message, details);
        this.name = 'MarketCsvImportError';
        this.code = code;
        this.details = details;
    }
}

function failMarketCsv(code, message, details = {}) {
    throw new MarketCsvImportError(code, message, details);
}

function splitMarketCsvLine(line) {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let index = 0; index < line.length; index++) {
        const char = line[index];
        if (char === '"') {
            if (inQuotes && line[index + 1] === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ';' && !inQuotes) {
            cells.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (inQuotes) {
        failMarketCsv('market_csv_unclosed_quote', 'Die Markt-CSV enthaelt ein nicht geschlossenes Anfuehrungszeichen.');
    }
    cells.push(current.trim());
    return cells;
}

function normalizeMarketHeader(value) {
    return String(value || '')
        .replace(/^\uFEFF/, '')
        .trim()
        .toLocaleLowerCase('de-DE')
        .replace(/[^a-z0-9äöüß]/g, '');
}

function parseMarketDate(rawValue) {
    const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(rawValue || '').trim());
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }
    return date;
}

/**
 * Parst eine semikolonseparierte Markt-CSV ohne DOM-Seiteneffekte.
 * Fuer den letzten Datenstand muessen Vergleichswerte aus jedem der drei
 * vorangegangenen Kalenderjahre am oder vor dem jeweiligen Stichtag existieren.
 */
export function parseMarketDataCsv(text) {
    const lines = String(text || '')
        .split(/\r?\n/)
        .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
        .filter(entry => entry.line !== '');
    if (lines.length < 2) {
        failMarketCsv('market_csv_empty', 'Die Markt-CSV enthaelt keine Datenzeilen.');
    }

    const header = splitMarketCsvLine(lines[0].line).map(normalizeMarketHeader);
    const dateHeaders = new Set(['datum', 'date']);
    const closeHeaders = new Set(['schluss', 'schlusskurs', 'close', 'zuletzt']);
    const dateIndex = header.findIndex(value => dateHeaders.has(value));
    const closeIndex = header.findIndex(value => closeHeaders.has(value));
    const missingHeaders = [];
    if (dateIndex === -1) missingHeaders.push('Datum/Date');
    if (closeIndex === -1) missingHeaders.push('Schluss/Close');
    if (missingHeaders.length > 0) {
        failMarketCsv(
            'market_csv_missing_headers',
            `Der Markt-CSV fehlen Pflichtspalten: ${missingHeaders.join(', ')}.`,
            { missingHeaders }
        );
    }

    const data = [];
    const rejectedRows = [];
    const seenDates = new Set();
    lines.slice(1).forEach(({ line, lineNumber }) => {
        let columns;
        try {
            columns = splitMarketCsvLine(line);
        } catch (error) {
            rejectedRows.push({ lineNumber, reason: error.message });
            return;
        }
        if (columns.length !== header.length) {
            rejectedRows.push({ lineNumber, reason: `Spaltenanzahl ${columns.length} statt ${header.length}` });
            return;
        }

        const date = parseMarketDate(columns[dateIndex]);
        if (!date) {
            rejectedRows.push({ lineNumber, reason: `ungueltiges Kalenderdatum „${columns[dateIndex] || ''}“` });
            return;
        }
        const closeResult = UIUtils.parseCurrencyResult(columns[closeIndex]);
        if (!closeResult.valid) {
            rejectedRows.push({ lineNumber, reason: `ungueltiger Schlusswert (${closeResult.error.code})` });
            return;
        }
        const dateKey = date.toISOString().slice(0, 10);
        if (seenDates.has(dateKey)) {
            rejectedRows.push({ lineNumber, reason: `doppeltes Datum ${dateKey}` });
            return;
        }
        seenDates.add(dateKey);
        data.push({ date, close: closeResult.value });
    });

    if (rejectedRows.length > 0) {
        const preview = rejectedRows
            .slice(0, 5)
            .map(row => `Zeile ${row.lineNumber}: ${row.reason}`)
            .join('; ');
        const remainder = rejectedRows.length > 5 ? `; weitere ${rejectedRows.length - 5}` : '';
        failMarketCsv(
            'market_csv_invalid_rows',
            `Die Markt-CSV enthaelt ${rejectedRows.length} ungueltige Datenzeile(n): ${preview}${remainder}.`,
            { rejectedRows }
        );
    }
    if (data.length === 0) {
        failMarketCsv('market_csv_no_valid_rows', 'Die Markt-CSV enthaelt keine gueltigen Datenzeilen.');
    }

    data.sort((left, right) => left.date - right.date);
    const lastEntry = data[data.length - 1];
    const lastDate = lastEntry.date;
    const historicalEntries = [];
    const missingYears = [];
    for (let offset = 1; offset <= 3; offset++) {
        const targetYear = lastDate.getUTCFullYear() - offset;
        const targetMonth = lastDate.getUTCMonth();
        const lastTargetMonthDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        const targetDay = Math.min(lastDate.getUTCDate(), lastTargetMonthDay);
        const targetTimestamp = Date.UTC(targetYear, targetMonth, targetDay);
        const match = data
            .filter(entry => entry.date.getUTCFullYear() === targetYear && entry.date.getTime() <= targetTimestamp)
            .at(-1);
        if (!match) missingYears.push(targetYear);
        historicalEntries.push(match || null);
    }
    if (missingYears.length > 0) {
        failMarketCsv(
            'market_csv_missing_years',
            `Der Markt-CSV fehlen Jahreswerte fuer: ${missingYears.join(', ')}.`,
            { missingYears }
        );
    }

    const ath = data.reduce((best, entry) => entry.close > best.close ? entry : best, data[0]);
    const yearsSinceAth = ath.close > lastEntry.close + 0.01
        ? Math.max(0, Math.floor((lastDate.getTime() - ath.date.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
        : 0;

    return {
        asOfDate: new Date(lastDate),
        rowCount: data.length,
        values: {
            endeVJ: lastEntry.close,
            endeVJ_1: historicalEntries[0].close,
            endeVJ_2: historicalEntries[1].close,
            endeVJ_3: historicalEntries[2].close,
            ath: ath.close,
            jahreSeitAth: yearsSinceAth
        }
    };
}

function migrateLegacyStateV0(payload) {
    const migrated = cloneJson(payload);
    if (!isRecord(migrated.lastState)) return migrated;

    const state = migrated.lastState;
    if (
        !Number.isFinite(state.cumulativeInflationFactor) ||
        state.cumulativeInflationFactor <= 0 ||
        state.cumulativeInflationFactor > 3
    ) {
        state.cumulativeInflationFactor = 1;
    }
    if (!Number.isFinite(state.lastInflationAppliedAtAge)) {
        state.lastInflationAppliedAtAge = 0;
    }
    if (!isRecord(state.taxState)) {
        state.taxState = { lossCarry: 0 };
    } else if (!Number.isFinite(state.taxState.lossCarry) || state.taxState.lossCarry < 0) {
        state.taxState.lossCarry = 0;
    }
    return migrated;
}

function validateBalanceState(payload) {
    if (!isRecord(payload)) {
        failImport('invalid_payload', 'Der Balance-Inhalt ist kein Objekt. Bitte eine unveränderte Balance-Exportdatei auswählen.');
    }
    if (!isRecord(payload.inputs)) {
        failImport('invalid_inputs', 'Der Pflichtbereich „inputs“ fehlt oder ist ungültig. Bitte eine vollständige Balance-Exportdatei auswählen.');
    }

    const inputs = payload.inputs;
    REQUIRED_INPUT_NUMBERS.forEach(field => {
        if (!hasOwn(inputs, field) || !Number.isFinite(inputs[field])) {
            failImport('invalid_core_value', `Das Pflichtfeld „${field}“ fehlt oder ist keine gültige Zahl. Bitte die Importdatei prüfen.`);
        }
    });

    if (!Number.isInteger(inputs.aktuellesAlter) || inputs.aktuellesAlter < 1 || inputs.aktuellesAlter > 130) {
        failImport('invalid_core_value', 'Das Pflichtfeld „aktuellesAlter“ muss eine ganze Zahl zwischen 1 und 130 sein. Bitte die Importdatei prüfen.');
    }

    NON_NEGATIVE_INPUT_NUMBERS.forEach(field => {
        if (!hasOwn(inputs, field)) return;
        if (!Number.isFinite(inputs[field]) || inputs[field] < 0) {
            failImport('invalid_core_value', `Das Feld „${field}“ muss eine nichtnegative, endliche Zahl sein. Bitte die Importdatei prüfen.`);
        }
    });

    if (
        Number.isFinite(inputs.minimumFlexAnnual) &&
        inputs.minimumFlexAnnual > inputs.flexBedarf
    ) {
        failImport('invalid_core_value', 'Das Feld „minimumFlexAnnual“ darf den Flex-Bedarf nicht überschreiten. Bitte die Importdatei prüfen.');
    }

    if (hasOwn(payload, 'lastState') && payload.lastState !== null && !isRecord(payload.lastState)) {
        failImport('invalid_last_state', 'Der optionale Bereich „lastState“ ist ungültig. Bitte die Importdatei prüfen.');
    }

    const state = payload.lastState;
    if (isRecord(state) && hasOwn(state, 'cumulativeInflationFactor')) {
        const factor = state.cumulativeInflationFactor;
        if (!Number.isFinite(factor) || factor <= 0 || factor > 3) {
            failImport('invalid_last_state', 'Der gespeicherte Inflationsfaktor ist ungültig. Bitte eine intakte Exportdatei verwenden.');
        }
    }
    if (isRecord(state?.taxState) && hasOwn(state.taxState, 'lossCarry')) {
        if (!Number.isFinite(state.taxState.lossCarry) || state.taxState.lossCarry < 0) {
            failImport('invalid_last_state', 'Der gespeicherte Verlustvortrag ist ungültig. Bitte eine intakte Exportdatei verwenden.');
        }
    }

    return cloneJson(payload);
}

export function createBalanceExportDocument(payload) {
    return {
        appId: BALANCE_EXPORT_APP_ID,
        schema: BALANCE_EXPORT_SCHEMA,
        schemaVersion: BALANCE_EXPORT_SCHEMA_VERSION,
        appVersion: CONFIG.APP.VERSION,
        exportedAt: new Date().toISOString(),
        payload: validateBalanceState(payload)
    };
}

export function normalizeBalanceImportDocument(document) {
    if (!isRecord(document)) {
        failImport('invalid_document', 'Die Importdatei enthält kein gültiges Balance-Dokument. Bitte eine Balance-Exportdatei auswählen.');
    }

    const looksCurrent = ['appId', 'schema', 'schemaVersion', 'appVersion'].some(key => hasOwn(document, key));
    if (looksCurrent) {
        if (document.appId !== BALANCE_EXPORT_APP_ID) {
            failImport('wrong_app', 'Die Datei gehört nicht zur Balance-App. Bitte die passende Balance-Exportdatei auswählen.');
        }
        if (document.schema !== BALANCE_EXPORT_SCHEMA) {
            failImport('wrong_schema', 'Das Importschema wird von der Balance-App nicht unterstützt. Bitte eine passende Exportdatei verwenden.');
        }
        if (document.schemaVersion !== BALANCE_EXPORT_SCHEMA_VERSION) {
            failImport('unsupported_version', 'Die Importversion wird nicht unterstützt. Bitte die Datei mit einer kompatiblen App-Version exportieren.');
        }
        if (typeof document.appVersion !== 'string' || document.appVersion.trim() === '') {
            failImport('invalid_document', 'Die App-Version der Importdatei fehlt. Bitte eine unveränderte Balance-Exportdatei auswählen.');
        }
        if (typeof document.exportedAt !== 'string' || !Number.isFinite(new Date(document.exportedAt).getTime())) {
            failImport('invalid_document', 'Der Exportzeitpunkt der Importdatei ist ungültig. Bitte eine unveränderte Balance-Exportdatei auswählen.');
        }
        return {
            payload: validateBalanceState(document.payload),
            sourceFormat: 'balance-state-v1',
            migrated: false
        };
    }

    const looksLegacy = ['app', 'version', 'payload'].some(key => hasOwn(document, key));
    if (looksLegacy) {
        if (document.app !== CONFIG.APP.NAME) {
            failImport('wrong_app', 'Die Legacy-Datei gehört nicht zur Balance-App. Bitte die passende Balance-Exportdatei auswählen.');
        }
        if (!SUPPORTED_LEGACY_APP_VERSIONS.has(document.version)) {
            failImport('unsupported_legacy_version', 'Diese Legacy-Exportversion wird nicht unterstützt. Bitte zuerst mit einer kompatiblen App-Version migrieren.');
        }
        if (!isRecord(document.payload)) {
            failImport('invalid_payload', 'Der Legacy-Balance-Inhalt fehlt oder ist ungültig. Bitte eine vollständige Balance-Exportdatei auswählen.');
        }
        return {
            payload: validateBalanceState(migrateLegacyStateV0(document.payload)),
            sourceFormat: 'legacy-balance-export-v0',
            migrated: true
        };
    }

    failImport('unknown_shape', 'Die Datei hat weder das aktuelle noch ein unterstütztes Legacy-Balance-Format. Bitte eine unveränderte Balance-Exportdatei auswählen.');
}

function captureInputUiState(inputs = {}) {
    return Object.fromEntries(Object.entries(inputs).map(([key, element]) => {
        const state = {
            checked: element?.checked,
            disabled: element?.disabled
        };
        if (element?.type !== 'file') state.value = element?.value;
        return [key, state];
    }));
}

function restoreInputUiState(inputs = {}, snapshot = {}) {
    Object.entries(snapshot).forEach(([key, state]) => {
        const element = inputs[key];
        if (!element) return;
        if (element.type !== 'file' && state.value !== undefined) element.value = state.value;
        if (state.checked !== undefined) element.checked = state.checked;
        if (state.disabled !== undefined) element.disabled = state.disabled;
    });
}

function asSafeImportError(error, { replaceReceipt = null, rollbackSucceeded = false, rollbackFailed = false } = {}) {
    if (rollbackFailed) {
        return new BalanceImportError(
            'rollback_failed',
            'Der Import konnte nicht abgeschlossen und nicht automatisch zurückgerollt werden. Bitte den angelegten Import-Recovery-Snapshot über „Snapshots“ wiederherstellen.'
        );
    }
    if (replaceReceipt && rollbackSucceeded) {
        return new BalanceImportError(
            'post_replace_validation_failed',
            'Die abschließende Engine-Prüfung ist fehlgeschlagen. Der vorherige Zustand wurde automatisch wiederhergestellt; bitte die Importdatei prüfen.'
        );
    }
    if (error instanceof BalanceImportError) return error;
    if (error instanceof StorageError) {
        return new BalanceImportError(
            'storage_failed',
            'Recovery-Snapshot oder Speicherung konnte nicht bestätigt werden. Die Live-Daten wurden nicht ersetzt; bitte freien Speicher und App-Berechtigungen prüfen.'
        );
    }
    return new BalanceImportError(
        'unexpected_import_error',
        'Der Import konnte nicht sicher abgeschlossen werden. Die Live-Daten wurden nicht bestätigt ersetzt; bitte die Datei prüfen oder den Recovery-Snapshot verwenden.'
    );
}

export function createImportExportHandlers({ dom, debouncedUpdate, update }) {
    return {
        handleExport() {
            try {
                const dataToExport = createBalanceExportDocument(StorageManager.loadState());
                const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `balancing-export-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
                UIRenderer.toast('Export erstellt.');
            } catch {
                UIRenderer.handleError(new AppError('Export nicht möglich: Der Balance-Zustand ist unvollständig oder beschädigt. Bitte die Eingaben prüfen.'));
            }
        },

        async handleImport(e) {
            const file = e.target.files?.[0];
            if (!file) return;
            const uiSnapshot = captureInputUiState(dom.inputs);
            let replaceReceipt = null;
            let rollbackSucceeded = false;
            let rollbackFailed = false;
            try {
                let json;
                try {
                    json = JSON.parse(await file.text());
                } catch {
                    failImport('invalid_json', 'Die Datei enthält kein gültiges JSON. Bitte eine unveränderte Balance-Exportdatei auswählen.');
                }

                const normalized = normalizeBalanceImportDocument(json);
                UIReader.applyStoredInputs(normalized.payload.inputs);

                const dryRunResult = await update({ persist: false });
                if (!dryRunResult?.ok) {
                    failImport('dry_run_failed', 'Die importierten Daten bestehen die Eingabe-/Engine-Prüfung nicht. Die Live-Daten wurden nicht verändert; bitte die Importdatei korrigieren.');
                }

                replaceReceipt = await StorageManager.replaceStateFromImport(normalized.payload);
                const finalResult = await update();
                if (!finalResult?.ok) {
                    failImport('final_update_failed', 'Die importierten Daten konnten nach dem Ersetzen nicht erfolgreich gespeichert und bestätigt werden.');
                }

                UIRenderer.toast(normalized.migrated
                    ? 'Legacy-Import migriert und erfolgreich gespeichert. Recovery-Snapshot wurde erstellt.'
                    : 'Import erfolgreich. Recovery-Snapshot wurde erstellt.');
            } catch (err) {
                if (replaceReceipt) {
                    try {
                        await StorageManager.rollbackImportReplace(replaceReceipt);
                        rollbackSucceeded = true;
                    } catch {
                        rollbackFailed = true;
                    }
                }
                restoreInputUiState(dom.inputs, uiSnapshot);
                UIRenderer.handleError(asSafeImportError(err, {
                    replaceReceipt,
                    rollbackSucceeded,
                    rollbackFailed
                }));
            } finally {
                e.target.value = '';
            }
        },

        async handleCsvImport(e) {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                const text = await file.text();
                const parsed = parseMarketDataCsv(text);

                const updateField = (id, value) => {
                    const el = dom.inputs[id];
                    if (el) {
                        // Runde auf ganze Zahlen, keine Nachkommastellen
                        el.value = (typeof value === 'number' && isFinite(value)) ? Math.round(value).toString() : '';
                    }
                };

                Object.entries(parsed.values).forEach(([fieldId, value]) => updateField(fieldId, value));

                debouncedUpdate();
                UIRenderer.toast(`CSV importiert: Daten relativ zum ${parsed.asOfDate.toLocaleDateString('de-DE', { timeZone: 'UTC' })} übernommen.`);

            } catch (err) {
                const message = err instanceof MarketCsvImportError
                    ? `CSV-Import fehlgeschlagen: ${err.message}`
                    : 'CSV-Import fehlgeschlagen.';
                UIRenderer.handleError(new AppError(message, {
                    originalError: err,
                    code: err?.code || null,
                    details: err?.details || null
                }));
            } finally {
                e.target.value = '';
            }
        }
    };
}
