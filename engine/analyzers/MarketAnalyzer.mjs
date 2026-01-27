/**
 * Module: Market Analyzer
 * Purpose: Analyzes current market conditions (CAPE, Drawdown, etc.) to determine the market regime.
 *          Classifies market as 'peak', 'bear', 'recovery', etc.
 * Usage: Called by engine/core.mjs to inform spending and asset allocation decisions.
 * Dependencies: engine/config.mjs
 */
import { CONFIG } from '../config.mjs';
/**
 * Normalisiert den übergebenen CAPE-Wert und fällt auf die Konfiguration zurück.
 * @param {number} rawCapeRatio - Optionaler CAPE-Wert aus den Eingaben.
 * @returns {number} Bereinigter CAPE-Wert (> 0).
 */
function normalizeCapeRatio(rawCapeRatio) {
    const fallbackCape = CONFIG.MARKET_VALUATION.DEFAULT_CAPE;
    if (typeof rawCapeRatio === 'number' && Number.isFinite(rawCapeRatio) && rawCapeRatio > 0) {
        return rawCapeRatio;
    }
    return fallbackCape;
}

/**
 * Leitet basierend auf dem CAPE-Wert ein Bewertungssignal und die erwartete Rendite ab.
 * @param {number} rawCapeRatio - Optionaler CAPE-Wert.
 * @returns {Object} Bewertungskontext mit Signal-Key, CAPE und Erwartungswert.
 */
function deriveCapeAssessment(rawCapeRatio) {
    const normalizedCape = normalizeCapeRatio(rawCapeRatio);
    const valuationCfg = CONFIG.MARKET_VALUATION;

    let signalKey = 'fair';
    if (normalizedCape >= valuationCfg.EXTREME_OVERVALUED_CAPE) {
        signalKey = 'extreme_overvalued';
    } else if (normalizedCape >= valuationCfg.OVERVALUED_CAPE) {
        signalKey = 'overvalued';
    } else if (normalizedCape <= valuationCfg.UNDERVALUED_CAPE) {
        signalKey = 'undervalued';
    }

    const expectedReturn = valuationCfg.EXPECTED_RETURN_BY_SIGNAL[signalKey] ||
        valuationCfg.EXPECTED_RETURN_BY_SIGNAL.fair;
    const valuationText = CONFIG.TEXTS.VALUATION_SIGNAL[signalKey] || 'Bewertungs-Signal';

    return {
        capeRatio: normalizedCape,
        signalKey,
        expectedReturn,
        reasonText: `${valuationText} (CAPE ${normalizedCape.toFixed(1)}, exp. Rendite ${(expectedReturn * 100).toFixed(1)}%)`
    };
}

export const MarketAnalyzer = {
    /**
     * Analysiert den Markt basierend auf historischen Daten
     * @param {Object} input - Eingabedaten mit Marktinformationen
     * @returns {Object} Marktanalyseergebnis mit Szenario und Metriken
     */
    analyzeMarket(input) {
        const { endeVJ, endeVJ_1, endeVJ_2, endeVJ_3, ath, jahreSeitAth, inflation, capeRatio } = input;

        // Abstand vom ATH berechnen
        const abstandVomAthProzent = (ath > 0 && endeVJ > 0)
            ? ((ath - endeVJ) / ath) * 100
            : 0;

        // 1-Jahres-Performance
        const perf1Y = (endeVJ_1 > 0)
            ? ((endeVJ - endeVJ_1) / endeVJ_1) * 100
            : 0;

        // Monate seit ATH
        let monateSeitAth = jahreSeitAth * 12;
        if (abstandVomAthProzent > 0 && jahreSeitAth === 0) {
            monateSeitAth = 12;
        }

        // Szenario bestimmen
        let sKey, reasons = [];

        // Entscheidungsreihenfolge ist bewusst: ATH-Situation zuerst, dann tiefer Bär,
        // dann Erholung / junge Korrektur, sonst Seitwärtsphase.
        if (abstandVomAthProzent <= 0) {
            // Neues Allzeithoch
            sKey = (perf1Y >= 10) ? 'peak_hot' : 'peak_stable';
            reasons.push('Neues Allzeithoch');
            if (perf1Y >= 10) reasons.push('Starkes Momentum (>10%)');
        } else if (abstandVomAthProzent > 20) {
            // Tiefer Bärenmarkt
            sKey = 'bear_deep';
            reasons.push(`ATH-Abstand > 20% (${abstandVomAthProzent.toFixed(1)}%)`);
        } else if (abstandVomAthProzent > 10 && perf1Y > 10 && monateSeitAth > 6) {
            // Erholung nach Korrektur
            sKey = 'recovery';
            reasons.push('Starkes Momentum nach Korrektur');
        } else if (abstandVomAthProzent <= 15 && monateSeitAth <= 6) {
            // Junge Korrektur
            sKey = 'corr_young';
            reasons.push('Kürzliche, leichte Korrektur');
        } else {
            // Seitwärtsphase
            sKey = 'side_long';
            reasons.push('Seitwärtsphase');
        }

        // Prüfung auf Erholung im Bärenmarkt
        // Innerhalb von Bear/Recovery zusätzlich prüfen, ob eine Erholung
        // nur ein Rally-Intermezzo im Bärenmarkt ist (höherer Risiko-Mode).
        if (sKey === 'bear_deep' || sKey === 'recovery') {
            const last4years = [endeVJ, endeVJ_1, endeVJ_2, endeVJ_3].filter(v => v > 0);
            const lowPoint = last4years.length > 0 ? Math.min(...last4years) : 0;
            const rallyFromLow = lowPoint > 0
                ? ((endeVJ - lowPoint) / lowPoint) * 100
                : 0;

            // Kombiniert Momentum (1Y) + Rally vom Tief und verlangt weiter >15% ATH-Abstand,
            // um "Erholung im Bären" klar von echter Trendwende abzugrenzen.
            if ((perf1Y >= 15 || rallyFromLow >= 30) && abstandVomAthProzent > 15) {
                sKey = 'recovery_in_bear';
                reasons.push(
                    `Erholung im Bärenmarkt (Perf 1J: ${perf1Y.toFixed(0)}%, ` +
                    `Rally v. Tief: ${rallyFromLow.toFixed(0)}%)`
                );
            }
        }

        // Stagflation prüfen
        const real1Y = perf1Y - inflation;
        const isStagflation = inflation >= CONFIG.THRESHOLDS.STRATEGY.stagflationInflation && real1Y < 0;
        if (isStagflation) {
            reasons.push(
                `Stagflation (Inflation ${inflation}% > Realrendite ${real1Y.toFixed(1)}%)`
            );
        }

        // CAPE-basierte Bewertungsdiagnose
        const valuationContext = deriveCapeAssessment(capeRatio);
        if (valuationContext.reasonText) {
            reasons.push(valuationContext.reasonText);
        }

        // Szenariotext erstellen
        const szenarioText = (CONFIG.TEXTS.SCENARIO[sKey] || "Unbekannt") +
            (isStagflation ? " (Stagflation)" : "");

        return {
            perf1Y,
            abstandVomAthProzent,
            seiATH: (100 - abstandVomAthProzent) / 100,
            sKey,
            isStagflation,
            szenarioText,
            reasons,
            capeRatio: valuationContext.capeRatio,
            valuationSignal: valuationContext.signalKey,
            expectedReturnCape: valuationContext.expectedReturn
        };
    }
};

export default MarketAnalyzer;
