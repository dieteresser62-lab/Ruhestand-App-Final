"use strict";

/**
 * ============================================================================
 * BALANCE-CSV-PARSER.JS - CSV-Import-Logik für Marktdaten
 * ============================================================================
 *
 * Dieses Modul enthält die CSV-Parsing-Funktionen für den Import von
 * historischen Marktdaten (z.B. MSCI World).
 *
 * Exportierte Funktionen:
 * - parseDate() - Datum im Format DD.MM.YYYY parsen
 * - parseValue() - Zahlenwert mit Komma-Separator parsen
 * - parseCsvData() - CSV-Daten vollständig parsen
 * - findClosestPreviousEntry() - Nächsten früheren Eintrag finden
 * - calculateAthAndYearsSince() - ATH und Jahre seit ATH berechnen
 * ============================================================================
 */

/**
 * Parst ein Datum im Format DD.MM.YYYY
 * @param {string} dateStr - Datumsstring
 * @returns {Date|null} Date-Objekt oder null bei Fehler
 */
export function parseDate(dateStr) {
    const parts = dateStr.split('.');
    if (parts.length !== 3) return null;
    return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
}

/**
 * Parst einen Zahlenwert mit deutschem Format (Komma als Dezimaltrenner)
 * @param {string} numStr - Zahlenstring
 * @returns {number} Geparste Zahl oder NaN
 */
export function parseValue(numStr) {
    if (!numStr) return NaN;
    return parseFloat(numStr.trim().replace(',', '.'));
}

/**
 * Parst CSV-Daten und extrahiert Datum, High und Close
 * @param {string} text - CSV-Inhalt
 * @returns {Array<{date: Date, high: number, close: number}>} Sortierte Datenpunkte
 */
export function parseCsvData(text) {
    return text.split(/\r?\n/).slice(1).map(line => {
        const columns = line.split(';');
        if (columns.length < 5) return null;
        return {
            date: parseDate(columns[0]),
            high: parseValue(columns[2]),
            close: parseValue(columns[4])
        };
    }).filter(d => d && d.date && !isNaN(d.close))
      .sort((a, b) => a.date - b.date);
}

/**
 * Findet den nächsten früheren Eintrag zu einem Zieldatum
 * @param {Date} targetDate - Zieldatum
 * @param {Array} allData - Alle Datenpunkte
 * @returns {number|null} Close-Wert oder null
 */
export function findClosestPreviousEntry(targetDate, allData) {
    let bestEntry = null;
    for (let i = allData.length - 1; i >= 0; i--) {
        if (allData[i].date <= targetDate) {
            bestEntry = allData[i];
            break;
        }
    }
    return bestEntry ? bestEntry.close : null;
}

/**
 * Berechnet ATH und Jahre seit ATH
 * @param {Array} data - Datenpunkte
 * @param {Object} lastEntry - Letzter Datenpunkt
 * @returns {{athValue: number, athDate: Date, yearsSince: number}}
 */
export function calculateAthAndYearsSince(data, lastEntry) {
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
        jahreSeitAth = timeDiff / (1000 * 3600 * 24 * 365.25);
    }

    return {
        athValue: ath.value,
        athDate: ath.date,
        yearsSince: jahreSeitAth
    };
}

/**
 * Verarbeitet CSV-Datei und extrahiert alle relevanten Marktdaten
 * @param {string} csvText - CSV-Inhalt
 * @returns {Object} Marktdaten-Objekt mit allen berechneten Werten
 */
export function processMarketDataCsv(csvText) {
    const data = parseCsvData(csvText);

    if (data.length === 0) {
        throw new Error('Keine gültigen Daten in der CSV gefunden.');
    }

    const lastEntry = data[data.length - 1];
    const lastDate = lastEntry.date;
    const endeVjValue = lastEntry.close;

    // Werte für vorherige Jahre berechnen
    const targetDateVJ1 = new Date(lastDate);
    targetDateVJ1.setFullYear(lastDate.getFullYear() - 1);
    const endeVj1Value = findClosestPreviousEntry(targetDateVJ1, data);

    const targetDateVJ2 = new Date(lastDate);
    targetDateVJ2.setFullYear(lastDate.getFullYear() - 2);
    const endeVj2Value = findClosestPreviousEntry(targetDateVJ2, data);

    const targetDateVJ3 = new Date(lastDate);
    targetDateVJ3.setFullYear(lastDate.getFullYear() - 3);
    const endeVj3Value = findClosestPreviousEntry(targetDateVJ3, data);

    // ATH berechnen
    const athResult = calculateAthAndYearsSince(data, lastEntry);

    return {
        lastDate,
        endeVJ: endeVjValue,
        endeVJ_1: endeVj1Value,
        endeVJ_2: endeVj2Value,
        endeVJ_3: endeVj3Value,
        ath: athResult.athValue,
        jahreSeitAth: athResult.yearsSince < 0 ? 0 : athResult.yearsSince
    };
}
