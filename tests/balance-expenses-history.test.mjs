import {
    computeYearStats,
    prepareExpensesHistoryMetrics
} from '../app/balance/balance-expenses-metrics.js';

console.log('--- Jahresausgaben: lesende Projektion ---');

function deepFreeze(value) {
    if (value && typeof value === 'object') {
        Object.values(value).forEach(deepFreeze);
        Object.freeze(value);
    }
    return value;
}

const importedMonth = categories => ({ profiles: { A: { categories } } });
const completeYear = {
    months: Object.fromEntries(Array.from({ length: 12 }, (_, index) =>
        [String(index + 1), importedMonth({ Ausgabe: -(index + 1) * 10 })]))
};
const mixedYear = { months: {
    '1': { profiles: {
        A: { categories: { Ausgabe: -100, Erstattung: 20 } },
        B: { categories: { Ausgabe: 30 } }
    } },
    '2': importedMonth({ Ausgabe: -50 }),
    '3': importedMonth({ Ausgabe: -10, Erstattung: 10 }),
    '0': importedMonth({ Ausgabe: -9999 }),
    '13': importedMonth({ Ausgabe: -9999 })
} };
const store = deepFreeze({ version: 1, activeYear: 2021, years: {
    '2028': { months: { '1': importedMonth({ Ausgabe: -80 }) } },
    '2026': mixedYear,
    '2025': completeYear,
    '2024': { months: { '6': importedMonth({ Ausgabe: -75 }) } },
    '2023': { months: { '1': importedMonth({ Ausgabe: 0 }), '2': importedMonth({}) } },
    '2022': { months: { '1': { profiles: {} }, '2': {} } },
    '2021': { months: {} },
    '2020': {},
    '2019': null,
    '2018': { months: [] },
    '2017': { months: { '13': importedMonth({ Ausgabe: -9999 }) } },
    '2016': { months: { '1': { profiles: { A: null, B: {} } } } },
    '2015': { months: { '1': { profiles: [] } } },
    '2014': { months: { '1': { profiles: { A: { categories: null } } } } },
    '2013': { months: { '1': null } },
    'kein-jahr': { months: { '1': importedMonth({ Ausgabe: -9999 }) } },
    '0': { months: { '1': importedMonth({ Ausgabe: -9999 }) } },
    '2026.5': { months: { '1': importedMonth({ Ausgabe: -9999 }) } }
} });
const before = JSON.stringify(store);
const descriptors = new Map(['localStorage', 'window', 'document'].map(key =>
    [key, Object.getOwnPropertyDescriptor(globalThis, key)]));
let environmentReads = 0;

try {
    // Selbst ein Versuch, DOM oder Browserpersistenz zu lesen, lässt den Test scheitern.
    for (const key of descriptors.keys()) {
        Object.defineProperty(globalThis, key, { configurable: true, get() {
            environmentReads++;
            throw new Error(`Unerlaubter Umgebungszugriff: ${key}`);
        } });
    }

    const rows = prepareExpensesHistoryMetrics(store, 2026);
    const singleMonth = prepareExpensesHistoryMetrics(deepFreeze({ years: {
        '2026': { months: { '1': mixedYear.months['1'] } }
    } }), 2026)[0];
    assertEqual(singleMonth.annualUsed, 110, 'Profil A mit −100/20 und Profil B mit +30 ergeben exakt 110 Euro');
    assertEqual(singleMonth.monthsWithData, 1, 'Zwei importierte Profile desselben Monats zählen genau einen Datenmonat');
    assertEqual(singleMonth.avgMonthly, 110, 'Ein gemeinsamer Datenmonat ergibt exakt 110 Euro Durchschnitt');
    assertEqual(rows.map(row => row.year).join(','), '2023,2024,2025,2026,2028',
        'Nur importierte Jahre erscheinen chronologisch, unabhängig vom ausgewählten Leerjahr');
    for (const row of rows) {
        const stats = computeYearStats({ yearData: store.years[String(row.year)] });
        assertEqual(row.annualUsed, stats.annualUsed, `Jahr ${row.year}: gleiche Summe wie Ausgaben-Check`);
        assertEqual(row.monthsWithData, stats.monthsWithData, `Jahr ${row.year}: gleiche Datenmonate`);
        assertEqual(row.avgMonthly, stats.avgMonthly, `Jahr ${row.year}: gleicher Durchschnitt`);
        assertEqual(Object.keys(row).sort().join(','),
            'annualUsed,avgMonthly,isCurrentPartialYear,monthsWithData,year',
            'Zeilen enthalten ausschließlich Istwerte und Laufend-Markierung, keine Budgetwerte');
    }
    const partial = rows.find(row => row.year === 2026);
    assertEqual(partial.annualUsed, 160, '110 Euro aus zwei Profilen plus 50 Euro; ungültige Monate zählen nicht');
    assertEqual(partial.monthsWithData, 2, 'Mehrere Profile zählen je Monat einmal; Nullimport zählt nicht');
    assertEqual(partial.avgMonthly, 80, 'Durchschnitt verwendet nur Monate mit positiven Ausgaben');
    assertEqual(partial.isCurrentPartialYear, true, 'Aktuelles Teiljahr ist laufend');
    assertEqual(rows.find(row => row.year === 2024).isCurrentPartialYear, false,
        'Historisches Teiljahr ist nicht laufend');
    assertEqual(rows.find(row => row.year === 2028).isCurrentPartialYear, false,
        'Zukünftiges Teiljahr ist nicht laufend');
    const full = rows.find(row => row.year === 2025);
    assertEqual(full.annualUsed, 780, 'Alle zwölf Kalendermonate werden summiert');
    assertEqual(full.monthsWithData, 12, 'Volljahr zählt zwölf Monate');
    assertEqual(full.avgMonthly, 65, 'Volljahr hat den erwarteten Durchschnitt');
    const zero = rows.find(row => row.year === 2023);
    assertEqual(zero.annualUsed, 0, 'Nullimporte bleiben als Jahr mit Summe null sichtbar');
    assertEqual(zero.monthsWithData, 0, 'Nullimporte erzeugen keine Datenmonate');
    assertEqual(zero.avgMonthly, 0, 'Nullimporte haben einen endlichen Durchschnitt null');

    for (const activeYear of [2023, 2026, 2030]) {
        assertEqual(JSON.stringify(prepareExpensesHistoryMetrics({ ...store, activeYear }, 2026)),
            JSON.stringify(rows), 'Jahresauswahl beeinflusst weder Liste noch Laufend-Markierung');
    }
    const fullCurrent = prepareExpensesHistoryMetrics(store, 2025);
    assertEqual(fullCurrent.find(row => row.year === 2025).isCurrentPartialYear, false,
        'Aktuelles Jahr mit zwölf Datenmonaten ist nicht als laufendes Teiljahr markiert');
    assertEqual(fullCurrent.some(row => row.isCurrentPartialYear), false,
        'Kalenderjahrwechsel entfernt die alte Laufend-Markierung');
    assertEqual(prepareExpensesHistoryMetrics(store, 2023).find(row => row.year === 2023).isCurrentPartialYear,
        true, 'Aktuelles Nullimportjahr ist ein laufendes Teiljahr');

    for (const empty of [undefined, null, {}, { years: {} }, { years: [] }, { years: null },
        { years: { '2026': { months: { '1': { profiles: {} } } } } }]) {
        assertEqual(prepareExpensesHistoryMetrics(deepFreeze(empty), 2026).length, 0,
            'Fehlende oder rein leere Container ergeben keine Jahreszeilen');
    }

    assertEqual(JSON.stringify(store), before, 'Tief eingefrorener Store bleibt vollständig unverändert');
    // Ausgabeobjekte haben keine Referenzen auf den Store und keine versteckten Ausgabecaches.
    rows[0].annualUsed = 999;
    rows.reverse();
    const repeated = prepareExpensesHistoryMetrics(store, 2026);
    assertEqual(repeated[0].year, 2023, 'Veränderte Ausgabereihenfolge beeinflusst Folgeaufrufe nicht');
    assertEqual(repeated[0].annualUsed, 0, 'Veränderte Ausgabeobjekte beeinflussen Eingaben nicht');
    assertEqual(JSON.stringify(store), before, 'Auch nach Ausgabeänderungen bleiben Eingaben unverändert');
    assertEqual(environmentReads, 0, 'Projektion benötigt weder DOM noch Speicherzugriffe');
} finally {
    for (const [key, descriptor] of descriptors) {
        if (descriptor) Object.defineProperty(globalThis, key, descriptor);
        else delete globalThis[key];
    }
}

console.log('--- Jahresausgaben: Projektion geprüft ---');
