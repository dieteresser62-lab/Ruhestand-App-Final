import { classifyTranche } from '../../types/tranche-contract.js';
import { formatLocalWealthHistoryDate } from '../../types/wealth-history-contract.js';
import { previewWealthHistory } from './balance-wealth-history.js';
import { CONFIG } from './balance-config.js';
import { PROFILE_STORAGE_KEYS, PROFILE_TRANCHES_KEY } from '../profile/profile-state.js';
import { persistenceStorage } from '../shared/persistence-facade.js';

export const EXPENSES_WEALTH_QUOTE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000;

/** Die reale PREVIEW trägt auch profilfremde und synthetische Bestände mit. */
export function readExpensesWealthQuoteEvidence(inputData) {
    const expectedEquity = Number(inputData.depotwertAlt || 0) + Number(inputData.depotwertNeu || 0);
    const expectedMoney = Number(inputData.geldmarktEtf || 0);
    let coveredEquity = 0, coveredMoney = 0, coveredBonds = 0;
    const timestamps = [];
    let unknown = false;
    for (const tranche of inputData.detailledTranches || []) {
        const category = classifyTranche(tranche);
        if (!['equity', 'money_market', 'bonds'].includes(category)) continue;
        const value = Number(tranche.marketValue ?? Number(tranche.shares) * Number(tranche.currentPrice));
        if (!(value > 0)) continue;
        // Separate Anleihen sind kein ETF-Kursgate; ihre belegte Zuordnung bleibt erhalten.
        if (category === 'bonds') { coveredBonds += value; continue; }
        if (category === 'money_market') coveredMoney += value;
        else coveredEquity += value;
        const priced = Number(tranche.shares) * Number(tranche.currentPrice);
        if (tranche.syntheticProfileFallback || !(Number(tranche.shares) > 0)
            || !(Number(tranche.currentPrice) > 0) || !Number.isFinite(priced)
            || Math.abs(priced - value) > 0.000001) unknown = true;
        timestamps.push(tranche.asOf);
    }
    // Die bestehende Verbundprojektion zählt Anleihen zum Neu-Depot, der
    // Einzelprofil-Aggregator führt sie separat. Beide PREVIEW-Verträge erhalten.
    const equityCovered = Math.abs(expectedEquity - coveredEquity) <= 0.000001
        || Math.abs(expectedEquity - coveredEquity - coveredBonds) <= 0.000001;
    if (!Number.isFinite(expectedEquity) || !Number.isFinite(expectedMoney)
        || !equityCovered
        || Math.abs(expectedMoney - coveredMoney) > 0.000001) unknown = true;
    return { timestamps, unknown };
}

export function evaluateExpensesWealthQuoteFreshness(evidence, importedAt) {
    const time = importedAt.getTime();
    if (evidence.unknown || !Number.isFinite(time)) return { status: 'unknown' };
    if (!evidence.timestamps.length) return { status: 'none' };
    const times = evidence.timestamps.map(value => Number.isSafeInteger(value) && value > 0 ? value * 1000 : NaN);
    if (times.some(value => !Number.isFinite(new Date(value).getTime()) || value > time)) {
        return { status: 'unknown' };
    }
    const oldest = times.reduce((oldest, time) => Math.min(oldest, time), Infinity);
    return { status: time - oldest > EXPENSES_WEALTH_QUOTE_MAX_AGE_MS ? 'old' : 'fresh', oldest };
}

// Historiewrites dürfen parallel stattfinden. Änderungen der Vorschauquellen dagegen
// machen eine wartende Erfassung ungültig, einschließlich anderer Verbundprofile.
function sourceFingerprint(storage, replacement = null) {
    const withoutHistory = raw => {
        if (!raw) return raw;
        try {
            const { wealthHistory, ...state } = JSON.parse(raw);
            return state;
        } catch {
            // Nicht beitragende Profile können einen eigenen Recoverybedarf haben.
            // Ihren Rohinhalt nur beobachten; die PREVIEW validiert ihre Quellen selbst.
            return raw;
        }
    };
    const registry = JSON.parse(replacement ? JSON.stringify(replacement.registry)
        : storage.getItem(PROFILE_STORAGE_KEYS.registry) || 'null');
    if (registry?.profiles) {
        for (const profile of Object.values(registry.profiles)) {
            if (profile.data?.[CONFIG.STORAGE.LS_KEY]) {
                profile.data[CONFIG.STORAGE.LS_KEY] = withoutHistory(profile.data[CONFIG.STORAGE.LS_KEY]);
            }
        }
    }
    return JSON.stringify([
        withoutHistory(replacement ? JSON.stringify(replacement.state) : storage.getItem(CONFIG.STORAGE.LS_KEY)),
        replacement ? replacement.tranches : storage.getItem(PROFILE_TRANCHES_KEY), registry
    ]);
}

export function createExpensesWealthCaptureController({ service, update, refresh = () => {},
    storage = persistenceStorage, readEvidence = readExpensesWealthQuoteEvidence,
    now = () => new Date(), toast = () => {}, clearError = () => {}, reportError = () => {} }) {
    let tail = Promise.resolve();
    const notify = (text, type) => {
        try { toast(text, type); } catch { /* Darstellung ändert kein bestätigtes Ergebnis. */ }
    };
    return {
        afterImport() {
            // Erfolgsgrenze des Imports: Tag und Kontext vor jedem weiteren Warten fixieren.
            const importedAt = new Date(now().getTime());
            let context, contextError;
            try { context = service.captureContext(); } catch (error) { contextError = error; }
            const operation = async () => {
                clearError('expenses-wealth');
                try {
                    if (contextError) throw contextError;
                    service.assertContext(context);
                    service.assertManualReady();
                    const asOf = formatLocalWealthHistoryDate(importedAt);
                    const result = previewWealthHistory({ service, update, context });
                    const freshness = evaluateExpensesWealthQuoteFreshness(readEvidence(result.inputData), importedAt);
                    const date = freshness.oldest === undefined ? null
                        : formatLocalWealthHistoryDate(new Date(freshness.oldest)).split('-').reverse().join('.');
                    if (freshness.status === 'unknown' || freshness.status === 'old') {
                        const detail = freshness.status === 'old'
                            ? `Kurse vom ${date} sind älter als 7 Tage.` : 'Kursdatum unbekannt.';
                        notify(`Vermögensstand nicht gesichert: ${detail} Kurse im Profil-Assets-Manager aktualisieren und danach in der Auswertung „Stand jetzt erfassen“.`, 'info');
                        return { status: freshness.status };
                    }
                    const fingerprint = sourceFingerprint(storage);
                    const tranches = storage.getItem(PROFILE_TRANCHES_KEY);
                    const validateSource = replacement => {
                        const current = sourceFingerprint(storage);
                        // Der bestehende Dienst kann beim Laden Legacy-Metadaten ergänzen.
                        // Nur sein exakt bekanntes Schreibziel darf vom Ausgangswert abweichen.
                        if (current !== fingerprint && (!replacement
                            || current !== sourceFingerprint(storage, { ...replacement, tranches }))) {
                            throw new Error('Die Vorschauquellen wurden während der Verlaufserfassung verändert.');
                        }
                    };
                    await service.captureManual({ result, asOf, context, validateSource });
                    service.assertContext(context);
                    notify(freshness.status === 'none'
                        ? 'Vermögensstand gesichert (keine kursabhängigen Bestände).'
                        : `Vermögensstand gesichert (Kurse vom ${date}).`, true);
                    return { status: 'saved' };
                } catch (error) {
                    reportError(new Error(`Ausgaben importiert; Vermögensstand nicht bestätigt: ${error.message || error}`), 'expenses-wealth');
                    return { status: 'failed', error };
                } finally {
                    try { refresh(); } catch { /* Bestätigte Persistenz bleibt maßgeblich. */ }
                }
            };
            const result = tail.then(operation);
            tail = result.catch(() => {});
            return result;
        }
    };
}
