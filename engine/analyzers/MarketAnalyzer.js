'use strict';

/**
 * ===================================================================
 * MARKET ANALYZER MODULE
 * ===================================================================
 * Analysiert Marktbedingungen und bestimmt das aktuelle Marktszenario
 * ===================================================================
 */

const { CONFIG } = require('../config.js');

const MarketAnalyzer = {
    /**
     * Analysiert den Markt basierend auf historischen Daten
     * @param {Object} input - Eingabedaten mit Marktinformationen
     * @returns {Object} Marktanalyseergebnis mit Szenario und Metriken
     */
    analyzeMarket(input) {
        const { endeVJ, endeVJ_1, endeVJ_2, endeVJ_3, ath, jahreSeitAth, inflation } = input;

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

        if (abstandVomAthProzent <= 0) {
            // Neues Allzeithoch
            sKey = (perf1Y >= 10) ? 'peak_hot' : 'peak_stable';
            reasons.push('Neues Allzeithoch');
            if(perf1Y >= 10) reasons.push('Starkes Momentum (>10%)');
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
        if (sKey === 'bear_deep' || sKey === 'recovery') {
            const last4years = [endeVJ, endeVJ_1, endeVJ_2, endeVJ_3].filter(v => v > 0);
            const lowPoint = last4years.length > 0 ? Math.min(...last4years) : 0;
            const rallyFromLow = lowPoint > 0
                ? ((endeVJ - lowPoint) / lowPoint) * 100
                : 0;

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
        if(isStagflation) {
            reasons.push(
                `Stagflation (Inflation ${inflation}% > Realrendite ${real1Y.toFixed(1)}%)`
            );
        }

        // Szenariotext erstellen
        const szenarioText = (CONFIG.TEXTS.SCENARIO[sKey] || "Unbekannt") +
            (isStagflation ? " (Stagflation)" : "");

        return {
            perf1Y,
            abstandVomAthProzent,
            sKey,
            isStagflation,
            szenarioText,
            reasons
        };
    }
};

// Exporte
if (typeof module !== 'undefined' && module.exports) {
    module.exports = MarketAnalyzer;
}
