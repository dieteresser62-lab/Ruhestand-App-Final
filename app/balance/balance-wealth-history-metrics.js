// @ts-check
import { readWealthHistory } from '../../types/wealth-history-contract.js';

/** Reine Projektion: Teildepots bleiben Details der einzigen Aktiengruppe. */
export function prepareWealthHistoryMetrics(state) {
    return [...readWealthHistory(state).entries]
        .sort((a, b) => a.asOf.localeCompare(b.asOf)
            || (a.reason === 'annual_close' ? 0 : 1) - (b.reason === 'annual_close' ? 0 : 1)
            || a.id.localeCompare(b.id))
        .map(entry => ({
            ...entry,
            label: entry.reason === 'annual_close' ? 'Jahresabschluss' : 'Unterjährig',
            marker: entry.reason === 'annual_close' ? '■' : '◇',
            segments: [
                { key: 'tagesgeld', label: 'Liquidität (Tagesgeld)', value: entry.tagesgeld, lower: 0, upper: entry.tagesgeld },
                { key: 'geldmarktEtf', label: 'Geldmarkt-ETF', value: entry.geldmarktEtf, lower: entry.tagesgeld, upper: entry.tagesgeld + entry.geldmarktEtf },
                { key: 'aktienEtf', label: 'Aktien-ETF', value: entry.aktienEtf, lower: entry.tagesgeld + entry.geldmarktEtf, upper: entry.tagesgeld + entry.geldmarktEtf + entry.aktienEtf }
            ]
        }));
}
