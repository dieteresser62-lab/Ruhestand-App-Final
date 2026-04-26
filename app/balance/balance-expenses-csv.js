/**
 * Module: Balance Expenses CSV
 * Purpose: Parse monthly category CSV exports without DOM or storage access.
 */
"use strict";

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
    cells.push(current);
    return cells;
}

export function detectCsvDelimiter(line) {
    const candidates = [';', '\t', ','];
    let best = { delim: ';', count: -1 };
    candidates.forEach(delim => {
        const count = line.split(delim).length - 1;
        if (count > best.count) best = { delim, count };
    });
    return best.delim;
}

export function parseExpenseAmount(raw) {
    if (!raw) return NaN;
    const cleaned = String(raw).replace(/€/g, '').trim();
    if (!cleaned) return NaN;
    const lastComma = cleaned.lastIndexOf(',');
    const lastDot = cleaned.lastIndexOf('.');
    let normalized = cleaned.replace(/\s/g, '');
    if (lastComma !== -1 && lastDot !== -1) {
        if (lastComma > lastDot) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
        } else {
            normalized = normalized.replace(/,/g, '');
        }
    } else if (lastComma !== -1) {
        normalized = normalized.replace(/\./g, '').replace(',', '.');
    } else if (lastDot !== -1) {
        const parts = normalized.split('.');
        const tail = parts[parts.length - 1];
        if (tail.length === 3) {
            normalized = normalized.replace(/\./g, '');
        }
    }
    const num = parseFloat(normalized);
    return Number.isFinite(num) ? num : NaN;
}

export function parseCategoryCsv(text) {
    const lines = text.split(/\r?\n/).map(line => line.trim()).filter(Boolean);
    if (!lines.length) throw new Error('Leere CSV-Datei.');
    const delimiter = detectCsvDelimiter(lines[0]);
    const header = splitCsvLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
    let categoryIndex = header.findIndex(h => h.includes('kategorie'));
    let amountIndex = header.findIndex(h => h.includes('betrag'));
    if (categoryIndex === -1 || amountIndex === -1) {
        if (header.length >= 2) {
            categoryIndex = 0;
            amountIndex = 1;
        } else {
            throw new Error('CSV-Header braucht Spalten wie "Kategorie" und "Betrag".');
        }
    }

    const categories = {};
    for (let i = 1; i < lines.length; i++) {
        const row = splitCsvLine(lines[i], delimiter);
        if (!row.length) continue;
        const category = (row[categoryIndex] || '').trim();
        const amount = parseExpenseAmount(row[amountIndex]);
        if (!category || !Number.isFinite(amount)) continue;
        categories[category] = (categories[category] || 0) + amount;
    }

    if (Object.keys(categories).length === 0) {
        throw new Error('Keine gültigen Kategorien gefunden.');
    }

    return categories;
}

