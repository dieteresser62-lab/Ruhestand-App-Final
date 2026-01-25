"use strict";

import { UIUtils } from './balance-utils.js';

export function formatDiagnosisPayload(raw) {
    if (!raw) return null;
    const formatted = { ...raw };
    const guardrails = Array.isArray(raw.guardrails) ? raw.guardrails : [];
    formatted.guardrails = guardrails.map(g => {
        const rule = g.rule || 'max';
        let status = 'ok';
        if ((rule === 'max' && g.value > g.threshold) || (rule === 'min' && g.value < g.threshold)) {
            status = 'danger';
        } else if ((rule === 'max' && g.value > g.threshold * 0.90) || (rule === 'min' && g.value < g.threshold * 1.10)) {
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
            status
        };
    });
    const safeKeyParams = { ...(raw.keyParams || {}) };
    const ensureNumberOrNull = (value) => (typeof value === 'number' && isFinite(value)) ? value : null;
    safeKeyParams.aktuelleFlexRate = ensureNumberOrNull(safeKeyParams.aktuelleFlexRate);
    safeKeyParams.minFlexRatePct = ensureNumberOrNull(safeKeyParams.minFlexRatePct);
    safeKeyParams.kuerzungProzent = ensureNumberOrNull(safeKeyParams.kuerzungProzent);
    safeKeyParams.jahresentnahme = ensureNumberOrNull(safeKeyParams.jahresentnahme);
    formatted.keyParams = safeKeyParams;
    return formatted;
}
