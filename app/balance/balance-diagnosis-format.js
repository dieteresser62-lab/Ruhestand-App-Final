/**
 * Module: Balance Diagnosis Format
 * Purpose: Formats raw diagnosis data from the engine for UI presentation.
 *          It prepares Guardrail statuses and Key Parameter values/types for the renderer.
 * Usage: Used by balance-main.js (via UIRenderer) to prepare data before rendering the diagnosis panel.
 * Dependencies: balance-utils.js
 */
"use strict";

import { UIUtils } from './balance-utils.js';

export function formatDiagnosisPayload(raw) {
    if (!raw) return null;
    const formatted = { ...raw };
    const guardrails = Array.isArray(raw.guardrails) ? raw.guardrails : [];
    const isAtLeast = (value, threshold) => value >= threshold;
    const isAtMost = (value, threshold) => value <= threshold;
    formatted.guardrails = guardrails.map(g => {
        const rule = g.rule || 'max';
        let status = 'ok';
        const thresholdNote = buildThresholdNote(g, rule);
        if ((rule === 'max' && !isAtMost(g.value, g.threshold)) || (rule === 'min' && !isAtLeast(g.value, g.threshold))) {
            status = 'danger';
        } else if (
            (rule === 'max' && g.value < g.threshold && g.value > g.threshold * 0.90) ||
            (rule === 'min' && g.value > g.threshold && g.value < g.threshold * 1.10)
        ) {
            status = 'warn';
        }
        const formatVal = (value, type, opts = {}) => {
            const { invertPositive = false } = opts;
            if (typeof value !== 'number' || !isFinite(value)) {
                return 'N/A';
            }
            const needsPrefix = invertPositive && value > 0;
            switch (type) {
                case 'percent':
                    if (needsPrefix) {
                        const pctValue = UIUtils.formatPercentRatio(Math.abs(value), { fractionDigits: 1, invalid: 'N/A' });
                        return `-${pctValue}`;
                    }
                    return UIUtils.formatPercentRatio(value, { fractionDigits: 1, invalid: 'N/A' });
                case 'months':
                    return UIUtils.formatMonths(value, { fractionDigits: 0, invalid: 'N/A' });
                case 'currency': {
                    const formattedCurrency = UIUtils.formatCurrency(value);
                    if (!needsPrefix) return formattedCurrency;
                    const sanitized = formattedCurrency.replace(/^[\-–−]/, '').trim();
                    return `-${sanitized}`;
                }
                default:
                    if (needsPrefix) {
                        return `-${Math.abs(value).toFixed(1)}`;
                    }
                    return value.toFixed(1);
            }
        };
        const formattedValue = formatVal(g.value, g.type, { invertPositive: g.name.includes('Drawdown') });
        const formattedThreshold = `${rule === 'max' ? '< ' : '> '}${formatVal(g.threshold, g.type)}`;
        return {
            name: g.name,
            value: formattedValue,
            threshold: formattedThreshold,
            status,
            note: thresholdNote
        };
    });

    // NEU: 3-Bucket Jilge Diagnostics in Guardrails injizieren
    if (raw.threeBucket && raw.threeBucket.is3Bucket) {
        const tb = raw.threeBucket;
        guardrails.push({
            name: '3-Bucket Jilge',
            value: tb.isBadYear ? 'Börsencrash erkannt (Verkauf Anleihen)' : 'Normaljahr (Verkauf Aktien)',
            threshold: tb.isBadYear ? 'Crash-Modus' : 'Standard-Modus',
            status: tb.isBadYear ? 'warn' : 'ok'
        });
    }

    const safeKeyParams = { ...(raw.keyParams || {}) };
    const ensureNumberOrNull = (value) => (typeof value === 'number' && isFinite(value)) ? value : null;
    safeKeyParams.aktuelleFlexRate = ensureNumberOrNull(safeKeyParams.aktuelleFlexRate);
    safeKeyParams.minFlexRatePct = ensureNumberOrNull(safeKeyParams.minFlexRatePct);
    safeKeyParams.kuerzungProzent = ensureNumberOrNull(safeKeyParams.kuerzungProzent);
    safeKeyParams.jahresentnahme = ensureNumberOrNull(safeKeyParams.jahresentnahme);
    formatted.keyParams = safeKeyParams;
    return formatted;
}

function buildThresholdNote(g, rule) {
    if (!g || typeof g.value !== 'number' || !isFinite(g.value) || typeof g.threshold !== 'number' || !isFinite(g.threshold)) {
        return null;
    }
    const epsilon = Math.max(1e-9, Math.abs(g.threshold) * 1e-9);
    if (Math.abs(g.value - g.threshold) <= epsilon) {
        return rule === 'min' ? 'Exakt auf Mindestniveau.' : 'Exakt auf Obergrenze.';
    }
    if (rule === 'min' && g.value > g.threshold && g.value < g.threshold * 1.10) {
        return 'Knapp über Mindestniveau; Sicherheitsabstand gering.';
    }
    if (rule === 'max' && g.value < g.threshold && g.value > g.threshold * 0.90) {
        return 'Knapp unter Obergrenze; Sicherheitsabstand gering.';
    }
    return null;
}
