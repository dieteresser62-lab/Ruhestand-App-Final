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
            { key: 'runwayMinM', min: 18, max: 36, step: 2 },
            { key: 'runwayTargetM', min: 24, max: 48, step: 2 },
            { key: 'goldTargetPct', min: 0, max: 10, step: 1 }
        ]
    },
    runway: {
        name: '🛫 Runway Optimierung',
        description: 'Fokus auf optimale Runway-Konfiguration',
        objective: { metric: 'SuccessRate', direction: 'max' },
        constraints: { sr99: true, noex: true, ts45: false, dd55: false },
        params: [
            { key: 'runwayMinM', min: 12, max: 30, step: 2 },
            { key: 'runwayTargetM', min: 18, max: 42, step: 2 },
            { key: 'rebalBand', min: 2, max: 10, step: 1 }
        ]
    },
    allocation: {
        name: '📈 Asset Allocation',
        description: 'Optimierung der Vermögensaufteilung',
        objective: { metric: 'EndWealth_P50', direction: 'max' },
        constraints: { sr99: true, noex: false, ts45: false, dd55: false },
        params: [
            { key: 'goldTargetPct', min: 0, max: 15, step: 1 },
            { key: 'targetEq', min: 40, max: 80, step: 5 },
            { key: 'rebalBand', min: 2, max: 10, step: 1 }
        ]
    },
    conservative: {
        name: '🛡️ Konservativ',
        description: 'Hohe Sicherheit, minimale Risiken',
        objective: { metric: 'SuccessRate', direction: 'max' },
        constraints: { sr99: true, noex: true, ts45: true, dd55: true },
        params: [
            { key: 'runwayTargetM', min: 30, max: 60, step: 3 },
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
            { key: 'targetEq', min: 60, max: 90, step: 5 },
            { key: 'maxSkimPct', min: 20, max: 50, step: 5 },
            { key: 'maxBearRefillPct', min: 30, max: 70, step: 5 }
        ]
    },
    drawdown: {
        name: '📉 Drawdown-Minimierung',
        description: 'Minimierung von Verlusten',
        objective: { metric: 'Drawdown_P90', direction: 'min' },
        constraints: { sr99: true, noex: true, ts45: false, dd55: true },
        params: [
            { key: 'goldTargetPct', min: 5, max: 20, step: 2 },
            { key: 'targetEq', min: 30, max: 60, step: 5 },
            { key: 'rebalBand', min: 3, max: 8, step: 1 }
        ]
    },
    dynamicFlexBalanced: {
        name: '🧭 Dynamic Flex',
        description: 'Optimiert VPW-Parameter mit Safety-Guards',
        objective: { metric: 'EndWealth_P50', direction: 'max' },
        constraints: { sr99: true, noex: true, ts45: false, dd55: false },
        dynamicFlexMode: 'force_on',
        params: [
            { key: 'horizonYears', min: 24, max: 36, step: 1 },
            { key: 'survivalQuantile', min: 0.80, max: 0.92, step: 0.01 },
            { key: 'goGoMultiplier', min: 1.00, max: 1.20, step: 0.05 }
        ]
    }
};

