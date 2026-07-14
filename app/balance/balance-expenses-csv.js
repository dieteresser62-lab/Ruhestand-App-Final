/**
 * Module: Balance Expenses CSV
 * Purpose: Parse monthly category CSV exports without DOM or storage access.
 */
"use strict";

import { parseLocalizedNumber } from './balance-utils.js';

export const EXPENSE_CSV_IMPORT_SUMMARY = Symbol('expense-csv-import-summary');

export class ExpenseCsvImportError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'ExpenseCsvImportError';
        this.code = code;
        this.details = details;
    }
}

export function splitCsvLine(line, delimiter) {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
            if (inQuotes && line[i + 1] === '"') {
                current += '"';
                i += 1;
            } else {
                inQuotes = !inQuotes;
            }
            continue;
        }
        if (char === delimiter && !inQuotes) {
            cells.push(current);
            current = '';
            continue;
        }
        current += char;
    }
    if (inQuotes) {
        throw new ExpenseCsvImportError(
            'expenses_csv_unclosed_quote',
            'Die CSV-Zeile enthaelt ein nicht geschlossenes Anfuehrungszeichen.'
        );
    }
    cells.push(current);
    return cells;
}

export function detectCsvDelimiter(line) {
    const candidates = [';', '\t', ','];
    let best = { delim: ';', count: -1 };
    candidates.forEach(delim => {
        let count = 0;
        let inQuotes = false;
        for (let index = 0; index < line.length; index++) {
            if (line[index] === '"') {
                if (inQuotes && line[index + 1] === '"') {
                    index += 1;
                } else {
                    inQuotes = !inQuotes;
                }
            } else if (line[index] === delim && !inQuotes) {
                count += 1;
            }
        }
        if (count > best.count) best = { delim, count };
    });
    return best.delim;
}

export function parseExpenseAmount(raw) {
    const result = parseLocalizedNumber(raw, {
        required: true,
        allowCurrencySymbol: true
    });
    return result.valid ? result.value : NaN;
}

export function parseCategoryCsv(text) {
    const lines = String(text || '')
        .split(/\r?\n/)
        .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
        .filter(entry => entry.line !== '');
    if (!lines.length) throw new Error('Leere CSV-Datei.');
    const delimiter = detectCsvDelimiter(lines[0].line);
    const header = splitCsvLine(lines[0].line, delimiter).map(h => h.trim().toLowerCase());
    let categoryIndex = header.findIndex(h => h.includes('kategorie'));
    let amountIndex = header.findIndex(h => h.includes('betrag'));
    if (categoryIndex === -1 || amountIndex === -1) {
        throw new ExpenseCsvImportError(
            'expenses_csv_missing_headers',
            'CSV-Header braucht die Pflichtspalten "Kategorie" und "Betrag".'
        );
    }

    const categories = Object.create(null);
    const rejectedRows = [];
    let importedRows = 0;
    for (let i = 1; i < lines.length; i++) {
        const { line, lineNumber } = lines[i];
        let row;
        try {
            row = splitCsvLine(line, delimiter);
        } catch (error) {
            rejectedRows.push({ lineNumber, reason: error.message });
            continue;
        }
        if (row.length !== header.length) {
            rejectedRows.push({ lineNumber, reason: `Spaltenanzahl ${row.length} statt ${header.length}` });
            continue;
        }
        const category = (row[categoryIndex] || '').trim();
        const amount = parseExpenseAmount(row[amountIndex]);
        if (!category) {
            rejectedRows.push({ lineNumber, reason: 'Kategorie fehlt' });
            continue;
        }
        if (!Number.isFinite(amount)) {
            rejectedRows.push({ lineNumber, reason: 'Betrag ist ungueltig' });
            continue;
        }
        categories[category] = (categories[category] || 0) + amount;
        importedRows += 1;
    }

    if (rejectedRows.length > 0) {
        const preview = rejectedRows
            .slice(0, 5)
            .map(row => `Zeile ${row.lineNumber}: ${row.reason}`)
            .join('; ');
        const remainder = rejectedRows.length > 5 ? `; weitere ${rejectedRows.length - 5}` : '';
        throw new ExpenseCsvImportError(
            'expenses_csv_invalid_rows',
            `CSV-Import abgebrochen: ${rejectedRows.length} von ${lines.length - 1} Datenzeile(n) ungueltig (${preview}${remainder}).`,
            {
                summary: {
                    totalRows: lines.length - 1,
                    importedRows,
                    rejectedRows
                }
            }
        );
    }

    if (Object.keys(categories).length === 0) {
        throw new Error('Keine gültigen Kategorien gefunden.');
    }

    Object.defineProperty(categories, EXPENSE_CSV_IMPORT_SUMMARY, {
        value: Object.freeze({
            totalRows: lines.length - 1,
            importedRows,
            rejectedRows: 0
        }),
        enumerable: false
    });

    return categories;
}
