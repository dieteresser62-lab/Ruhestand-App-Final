import {
    WealthHistoryError,
    assertWealthHistory,
    assertWealthHistoryEntry,
    assertBalanceWealthHistory,
    createManualWealthHistoryEntry,
    createAnnualWealthHistoryEntry,
    formatLocalWealthHistoryDate,
    readWealthHistory,
    upsertManualWealthHistory,
    upsertAnnualWealthHistory
} from '../types/wealth-history-contract.js';

function rejects(fn, message) {
    let error;
    try { fn(); } catch (caught) { error = caught; }
    assert(error instanceof WealthHistoryError, message);
    assertEqual(error?.code, 'WEALTH_HISTORY_INVALID', 'Der Fehler hat einen stabilen Vertragscode');
}

const inputs = Object.freeze({ tagesgeld: 12000, geldmarktEtf: 23000, depotwertAlt: 34000, depotwertNeu: 45000, goldWert: 90000, healthBucketInitialAmount: 150000 });
const original = JSON.stringify(inputs);
const manual = createManualWealthHistoryEntry(inputs, '2026-12-31');
const annual = createAnnualWealthHistoryEntry(inputs, 2026);
assertEqual(manual.aktienEtf, 79000, 'Beide Aktiendepots werden einmal zusammengefasst');
assertEqual(manual.total, 114000, 'Gold und Pflegezweckbindung verändern die drei Vermögensgruppen nicht');
assertEqual(JSON.stringify(inputs), original, 'Die Erfassung verändert die Eingaben nicht');
assertEqual(createManualWealthHistoryEntry({ tagesgeld: 0, geldmarktEtf: 0, depotwertAlt: 0, depotwertNeu: 0 }, '2026-01-01').total, 0, 'Nullwerte sind gültige Bestände');
assertEqual(createManualWealthHistoryEntry({ tagesgeld: 1.2345, geldmarktEtf: 0, depotwertAlt: 0, depotwertNeu: 0 }, '2026-01-01').total, 1.2345, 'Nominale Werte werden nicht auf Euro gerundet');

const empty = readWealthHistory({ inputs: {} });
assertEqual(empty.entries.length, 0, 'Fehlendes Feld bedeutet leere Historie');
assertEqual(assertBalanceWealthHistory({}).wealthHistory, undefined, 'Laden erzeugt kein synthetisches State-Feld');
const first = upsertManualWealthHistory(empty, manual);
const withAnnual = upsertAnnualWealthHistory(first, annual);
const frozen = JSON.stringify(withAnnual);
const changed = createManualWealthHistoryEntry({ ...inputs, tagesgeld: 42 }, '2026-12-31');
const replacement = upsertManualWealthHistory(withAnnual, changed);
assertEqual(replacement.entries.length, 2, 'Tagesersetzung lässt den Jahresabschluss separat bestehen');
assertEqual(replacement.entries[0].tagesgeld, 42, 'Nur der manuelle Tagesstand wird ersetzt');
assertEqual(replacement.entries[1].tagesgeld, 12000, 'Der Jahresabschluss bleibt unverändert');
assertEqual(JSON.stringify(withAnnual), frozen, 'Upserts verändern den bestehenden Verlauf nicht');
assertEqual(empty.entries.length, 0, 'Der erste Upsert verändert den leeren Quellverlauf nicht');
const next = upsertManualWealthHistory(replacement, createManualWealthHistoryEntry(inputs, '2027-01-01'));
assertEqual(next.entries.length, 3, 'Ein anderer Tag erhält einen eigenen Eintrag');
const annualRetry = upsertAnnualWealthHistory(next, createAnnualWealthHistoryEntry({ ...inputs, tagesgeld: 0 }, 2026));
assertEqual(JSON.stringify(annualRetry), JSON.stringify(next), 'Die Wiederholung einer bestätigten Jahresperiode ist vollständig unverändert');
assertEqual(upsertAnnualWealthHistory(next, createAnnualWealthHistoryEntry(inputs, 2027)).entries.length, 4, 'Eine andere Jahresperiode wird ergänzt');

// Das lokale Datum kann auf beiden Seiten einer UTC-Tagesgrenze liegen.
for (const timezone of ['Pacific/Kiritimati', 'America/Los_Angeles']) {
    const previousTimezone = process.env.TZ;
    try {
        process.env.TZ = timezone;
        const date = new Date('2026-06-01T10:30:00Z');
        const expected = timezone === 'Pacific/Kiritimati' ? '2026-06-02' : '2026-06-01';
        assertEqual(formatLocalWealthHistoryDate(date), expected, 'Lokale Tagesidentität folgt der lokalen Zeitzone');
        assertEqual(createManualWealthHistoryEntry(inputs, date).id, `manual:${expected}`, 'Die manuelle Identität verwendet den lokalen Klicktag');
        const midnight = new Date('2026-06-01T00:30:00Z');
        assertEqual(formatLocalWealthHistoryDate(midnight), timezone === 'America/Los_Angeles' ? '2026-05-31' : '2026-06-01', 'Auch westlich von UTC bleibt die lokale Tagesgrenze maßgeblich');
    } finally {
        if (previousTimezone === undefined) delete process.env.TZ;
        else process.env.TZ = previousTimezone;
    }
}

assertEqual(createManualWealthHistoryEntry(inputs, '2028-02-29').asOf, '2028-02-29', 'Ein echter Schalttag ist gültig');
for (const date of ['2025-12-31', '2026-02-29', '2026-02-30', '2026-04-31', '2100-02-29', '2026-00-01', '2026-13-01', '2026-01-00', '2026-01-32', '2026-1-01', '2026-01-01T00:00:00Z', null, 20260101]) {
    rejects(() => createManualWealthHistoryEntry(inputs, date), `Ungültiger Stichtag ${String(date)} wird abgelehnt`);
}
rejects(() => formatLocalWealthHistoryDate(new Date(NaN)), 'Ungültiger lokaler Zeitpunkt wird abgelehnt');
for (const year of [2025, 2026.5, '2026', Infinity, 10000]) {
    rejects(() => createAnnualWealthHistoryEntry(inputs, year), 'Ungültiges Abschlussjahr wird abgelehnt');
}
for (const field of ['tagesgeld', 'geldmarktEtf', 'depotwertAlt', 'depotwertNeu', 'aktienEtf', 'total']) {
    for (const value of [-1, NaN, Infinity, -Infinity, '0', null, undefined]) {
        rejects(() => assertWealthHistoryEntry({ ...manual, [field]: value }), `${field} darf keinen ungültigen Betrag enthalten`);
    }
}
for (const patch of [
    { id: 'manual:2027-01-01' }, { periodId: 'calendar-year:2026' }, { reason: 'other' },
    { aktienEtf: 79001 }, { total: 114001 }, { total: 0 }, { periodId: undefined }
]) rejects(() => assertWealthHistoryEntry({ ...manual, ...patch }), 'Widersprüchlicher manueller Eintrag wird abgelehnt');
for (const patch of [{ id: 'annual:2027' }, { asOf: '2026-12-30' }, { periodId: 'calendar-year:2027' }, { periodId: null }, { reason: 'manual' }]) {
    rejects(() => assertWealthHistoryEntry({ ...annual, ...patch }), 'Widersprüchliche Jahresidentität wird abgelehnt');
}
for (const history of [null, undefined, [], {}, { schemaVersion: 2, entries: [] }, { schemaVersion: '1', entries: [] }, { schemaVersion: 1, entries: null }, { schemaVersion: 1, entries: [manual, { ...manual }] }, { schemaVersion: 1, entries: [annual, { ...annual }] }]) {
    rejects(() => assertWealthHistory(history), 'Beschädigter Verlauf wird abgelehnt');
    rejects(() => readWealthHistory({ wealthHistory: history }), 'Ein vorhandenes beschädigtes State-Feld wird niemals als leer behandelt');
}
rejects(() => upsertManualWealthHistory(first, annual), 'Der manuelle Upsert akzeptiert keinen Jahresstand');
rejects(() => upsertAnnualWealthHistory(first, manual), 'Der Jahres-Upsert akzeptiert keinen manuellen Stand');
rejects(() => upsertManualWealthHistory({ schemaVersion: 99, entries: [] }, manual), 'Eine Erfassung überschreibt keinen beschädigten Verlauf');
rejects(() => createManualWealthHistoryEntry({ ...inputs, depotwertAlt: Number.MAX_VALUE, depotwertNeu: Number.MAX_VALUE }, '2026-01-01'), 'Summenüberlauf wird abgelehnt');
assertEqual(assertWealthHistoryEntry({ ...manual, total: manual.total + Number.EPSILON * manual.total }).id, manual.id, 'Minimales Gleitkomma-Rauschen wird toleriert');
rejects(() => assertWealthHistoryEntry({ ...manual, total: manual.total + 16 * Number.EPSILON * manual.total }), 'Abweichungen über der Toleranz werden abgelehnt');
