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
    return Object.fromEntries(Object.entries(inputs).map(([key, element]) => [key, {
        value: element?.value,
        checked: element?.checked,
        disabled: element?.disabled
    }]));
}

function restoreInputUiState(inputs = {}, snapshot = {}) {
    Object.entries(snapshot).forEach(([key, state]) => {
        const element = inputs[key];
        if (!element) return;
        if (state.value !== undefined) element.value = state.value;
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

                const parseDate = (dateStr) => {
                    const parts = dateStr.split('.');
                    if (parts.length !== 3) return null;
                    return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
                };
                const parseValue = (numStr) => {
                    if (!numStr) return NaN;
                    return parseFloat(numStr.trim().replace(',', '.'));
                };

                const data = text.split(/\r?\n/).slice(1).map(line => {
                    const columns = line.split(';');
                    if (columns.length < 5) return null;
                    return {
                        date: parseDate(columns[0]),
                        high: parseValue(columns[2]),
                        close: parseValue(columns[4])
                    };
                }).filter(d => d && d.date && !isNaN(d.close))
                    .sort((a, b) => a.date - b.date);

                if (data.length === 0) throw new Error('Keine gültigen Daten in der CSV gefunden.');

                const lastEntry = data[data.length - 1];
                const lastDate = lastEntry.date;
                const endeVjValue = lastEntry.close;

                const findClosestPreviousEntry = (targetDate, allData) => {
                    let bestEntry = null;
                    for (let i = allData.length - 1; i >= 0; i--) {
                        if (allData[i].date <= targetDate) {
                            bestEntry = allData[i];
                            break;
                        }
                    }
                    return bestEntry ? bestEntry.close : null;
                };

                const targetDateVJ1 = new Date(lastDate);
                targetDateVJ1.setFullYear(lastDate.getFullYear() - 1);
                const endeVj1Value = findClosestPreviousEntry(targetDateVJ1, data);

                const targetDateVJ2 = new Date(lastDate);
                targetDateVJ2.setFullYear(lastDate.getFullYear() - 2);
                const endeVj2Value = findClosestPreviousEntry(targetDateVJ2, data);

                const targetDateVJ3 = new Date(lastDate);
                targetDateVJ3.setFullYear(lastDate.getFullYear() - 3);
                const endeVj3Value = findClosestPreviousEntry(targetDateVJ3, data);

                let ath = { value: -Infinity, date: null };
                data.forEach(d => {
                    if (d.close > ath.value) {
                        ath.value = d.close;
                        ath.date = d.date;
                    }
                });

                let jahreSeitAth = 0;
                if (ath.value > lastEntry.close + 0.01 && ath.date) {
                    const timeDiff = lastEntry.date.getTime() - ath.date.getTime();
                    const yearsDiff = timeDiff / (1000 * 3600 * 24 * 365.25);
                    jahreSeitAth = Math.floor(yearsDiff); // Ganze Jahre ohne Nachkommastellen
                }

                const updateField = (id, value) => {
                    const el = dom.inputs[id];
                    if (el) {
                        // Runde auf ganze Zahlen, keine Nachkommastellen
                        el.value = (typeof value === 'number' && isFinite(value)) ? Math.round(value).toString() : '';
                    }
                };

                updateField('endeVJ', endeVjValue);
                updateField('endeVJ_1', endeVj1Value);
                updateField('endeVJ_2', endeVj2Value);
                updateField('endeVJ_3', endeVj3Value);
                updateField('ath', ath.value);
                updateField('jahreSeitAth', jahreSeitAth < 0 ? 0 : jahreSeitAth);

                debouncedUpdate();
                UIRenderer.toast(`CSV importiert: Daten relativ zum ${lastDate.toLocaleDateString('de-DE')} übernommen.`);

            } catch (err) {
                UIRenderer.handleError(new AppError('CSV-Import fehlgeschlagen.', { originalError: err }));
            } finally {
                e.target.value = '';
            }
        }
    };
}
