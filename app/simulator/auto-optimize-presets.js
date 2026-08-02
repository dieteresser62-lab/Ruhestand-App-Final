/**
 * Module: Auto-Optimize Presets
 * Purpose: DOM-free preset definitions for optimizer UI.
 */
"use strict";

export const AUTO_OPTIMIZE_PRESETS = {
    standard: {
        name: '📊 Standard',
        description: 'Ausgewogene Optimierung der 3 Haupt-Parameter',
        objective: { metric: 'SuccessRate', direction: 'max' },
        constraints: { sr99: true, noex: true, ts45: false, dd55: false },
        params: [
            { key: 'liquidityRunwayYears', min: 2, max: 7, step: 0.5 },
            { key: 'goldRebalancingBand', min: 10, max: 40, step: 5 },
            { key: 'goldTargetPct', min: 0, max: 10, step: 1 }
        ]
    },
    runway: {
        name: '🛫 Runway Optimierung',
        description: 'Fokus auf optimale Runway-Konfiguration',
        objective: { metric: 'SuccessRate', direction: 'max' },
        constraints: { sr99: true, noex: true, ts45: false, dd55: false },
        params: [
            { key: 'liquidityRunwayYears', min: 1, max: 8, step: 0.5 },
            { key: 'maxSkimPct', min: 5, max: 30, step: 2.5 },
            { key: 'goldRebalancingBand', min: 10, max: 40, step: 5 }
        ]
    },
    allocation: {
        name: '📈 Asset Allocation',
        description: 'Optimierung der Vermögensaufteilung',
        objective: { metric: 'EndWealth_P50', direction: 'max' },
        constraints: { sr99: true, noex: false, ts45: false, dd55: false },
        params: [
            { key: 'goldTargetPct', min: 0, max: 15, step: 1 },
            { key: 'maxSkimPct', min: 5, max: 30, step: 2.5 },
            { key: 'goldRebalancingBand', min: 10, max: 40, step: 5 }
        ]
    },
    conservative: {
        name: '🛡️ Konservativ',
        description: 'Hohe Sicherheit, minimale Risiken',
        objective: { metric: 'SuccessRate', direction: 'max' },
        constraints: { sr99: true, noex: true, ts45: true, dd55: true },
        params: [
            { key: 'liquidityRunwayYears', min: 4, max: 9, step: 0.5 },
            { key: 'goldTargetPct', min: 5, max: 15, step: 1 },
            { key: 'maxSkimPct', min: 10, max: 30, step: 2 }
        ]
    },
    aggressive: {
        name: '🚀 Aggressiv',
        description: 'Maximales Endvermögen',
        objective: { metric: 'EndWealth_P50', direction: 'max' },
        constraints: { sr99: true, noex: false, ts45: false, dd55: false },
        params: [
            { key: 'goldRebalancingBand', min: 5, max: 30, step: 5 },
            { key: 'maxSkimPct', min: 20, max: 50, step: 5 },
            { key: 'liquidityRunwayYears', min: 1, max: 4, step: 0.5 }
        ]
    },
    drawdown: {
        name: '📉 Drawdown-Minimierung',
        description: 'Minimierung von Verlusten',
        objective: { metric: 'Drawdown_P90', direction: 'min' },
        constraints: { sr99: true, noex: true, ts45: false, dd55: true },
        params: [
            { key: 'goldTargetPct', min: 5, max: 20, step: 2 },
            { key: 'liquidityRunwayYears', min: 4, max: 9, step: 0.5 },
            { key: 'goldRebalancingBand', min: 10, max: 40, step: 5 }
        ]
    },
    dynamicFlexBalanced: {
        name: '🧭 Dynamic Flex',
        description: 'Optimiert Liquiditaet und Go-Go-Faktor mit Safety-Guards',
        objective: { metric: 'EndWealth_P50', direction: 'max' },
        constraints: { sr99: true, noex: true, ts45: false, dd55: false },
        dynamicFlexMode: 'force_on',
        params: [
            { key: 'liquidityRunwayYears', min: 3, max: 8, step: 0.5 },
            { key: 'goGoMultiplier', min: 1.00, max: 1.20, step: 0.05 }
        ]
    }
};
