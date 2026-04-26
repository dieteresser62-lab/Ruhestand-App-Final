/**
 * Module: Auto-Optimize Parameter Metadata
 * Purpose: Shared labels, units and mappings for Auto-Optimize UI.
 */
"use strict";

export const AUTO_OPTIMIZE_PARAMETER_OPTIONS = [
    { key: 'runwayMinM', label: 'Runway Min (Monate)' },
    { key: 'runwayTargetM', label: 'Runway Target (Monate)' },
    { key: 'goldTargetPct', label: 'Gold Target (%)' },
    { key: 'targetEq', label: 'Target Eq (%)' },
    { key: 'rebalBand', label: 'Rebal Band (%)' },
    { key: 'maxSkimPct', label: 'Max Skim (%)' },
    { key: 'maxBearRefillPct', label: 'Max Bear Refill (%)' },
    { key: 'horizonYears', label: 'VPW Horizon (Jahre)' },
    { key: 'survivalQuantile', label: 'VPW Quantile' },
    { key: 'goGoMultiplier', label: 'VPW Go-Go Multiplikator' }
];

export const AUTO_OPTIMIZE_PARAM_LABELS = {
    runwayMinM: 'Runway Min',
    runwayTargetM: 'Runway Target',
    goldTargetPct: 'Gold Target',
    targetEq: 'Target Eq',
    rebalBand: 'Rebal Band',
    maxSkimPct: 'Max Skim',
    maxBearRefillPct: 'Max Bear Refill',
    horizonYears: 'VPW Horizon',
    survivalQuantile: 'VPW Quantile',
    goGoMultiplier: 'VPW Go-Go Mult'
};

export const AUTO_OPTIMIZE_PARAM_UNITS = {
    runwayMinM: 'Monate',
    runwayTargetM: 'Monate',
    goldTargetPct: '%',
    targetEq: '%',
    rebalBand: '%',
    maxSkimPct: '%',
    maxBearRefillPct: '%',
    horizonYears: 'Jahre',
    survivalQuantile: '',
    goGoMultiplier: 'x'
};

export const AUTO_OPTIMIZE_DYNAMIC_FLEX_PARAM_KEYS = new Set([
    'horizonYears',
    'survivalQuantile',
    'goGoMultiplier'
]);

export const AUTO_OPTIMIZE_PARAM_FORM_IDS = {
    runwayMinM: 'runwayMinMonths',
    runwayTargetM: 'runwayTargetMonths',
    goldTargetPct: 'goldAllokationProzent',
    targetEq: 'targetEq',
    rebalBand: 'rebalBand',
    maxSkimPct: 'maxSkimPctOfEq',
    maxBearRefillPct: 'maxBearRefillPctOfEq',
    horizonYears: 'horizonYears',
    survivalQuantile: 'survivalQuantile',
    goGoMultiplier: 'goGoMultiplier'
};

export const AUTO_OPTIMIZE_DYNAMIC_FLEX_MODE_LABELS = {
    inherit: 'Rahmendaten verwenden',
    force_on: 'Dynamic Flex erzwungen EIN',
    force_off: 'Dynamic Flex erzwungen AUS'
};

export function renderAutoOptimizeParamOptions(selectedKey = '') {
    return AUTO_OPTIMIZE_PARAMETER_OPTIONS
        .map(({ key, label }) => `<option value="${key}"${key === selectedKey ? ' selected' : ''}>${label}</option>`)
        .join('');
}

