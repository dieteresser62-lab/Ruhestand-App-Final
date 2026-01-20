"use strict";

import { UIUtils } from './balance-utils.js';

export function buildKeyParams(params = {}) {
    const metrics = [];

    const formatCurrencySafe = (value) => {
        if (typeof value !== 'number' || !isFinite(value)) {
            return null;
        }
        return UIUtils.formatCurrency(value);
    };

    const pushMetric = ({ label, value, meta = null, trend = 'neutral' }) => {
        if (typeof value !== 'string' || !value.trim()) {
            return;
        }
        metrics.push({ label, value, meta, trend });
    };

    const peakValue = formatCurrencySafe(params.peakRealVermoegen);
    if (peakValue) {
        pushMetric({
            label: 'Peak (real)',
            value: peakValue,
            meta: 'Historischer Höchststand'
        });
    }

    const currentValue = formatCurrencySafe(params.currentRealVermoegen);
    if (currentValue) {
        let deltaMeta = null;
        let trend = 'neutral';
        if (typeof params.peakRealVermoegen === 'number' && isFinite(params.peakRealVermoegen) && params.peakRealVermoegen !== 0) {
            const delta = params.currentRealVermoegen - params.peakRealVermoegen;
            const deltaAbs = Math.abs(delta);
            const deltaPercent = (delta / params.peakRealVermoegen) * 100;
            const sign = delta >= 0 ? '+' : '−';
            const formattedDelta = UIUtils.formatCurrency(deltaAbs).replace(/^[-–−]/, '').trim();
            const deltaPercentText = UIUtils.formatPercentValue(Math.abs(deltaPercent), { fractionDigits: 1, invalid: '0.0%' });
            deltaMeta = `${sign}${formattedDelta} vs. Peak (${deltaPercent >= 0 ? '+' : '−'}${deltaPercentText})`;
            trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
        }
        pushMetric({
            label: 'Aktuell (real)',
            value: currentValue,
            meta: deltaMeta,
            trend
        });
    }

    const inflationPercent = (typeof params.cumulativeInflationFactor === 'number' && isFinite(params.cumulativeInflationFactor))
        ? (params.cumulativeInflationFactor - 1)
        : null;
    const formattedInflation = UIUtils.formatPercentRatio(inflationPercent, { fractionDigits: 1, prefixPlus: true, invalid: null });
    if (formattedInflation) {
        pushMetric({
            label: 'Kumulierte Inflation',
            value: formattedInflation,
            meta: 'Seit Modellstart'
        });
    }

    if (typeof params.aktuelleFlexRate === 'number' && isFinite(params.aktuelleFlexRate)) {
        pushMetric({
            label: 'Effektive Flex-Rate',
            value: UIUtils.formatPercentValue(params.aktuelleFlexRate, { fractionDigits: 1, invalid: null }),
            meta: 'Geplante Entnahmedynamik'
        });
    }

    if (typeof params.kuerzungProzent === 'number' && isFinite(params.kuerzungProzent)) {
        const trend = params.kuerzungProzent > 0 ? 'down' : params.kuerzungProzent < 0 ? 'up' : 'neutral';
        pushMetric({
            label: 'Kürzung ggü. Flex-Bedarf',
            value: UIUtils.formatPercentValue(params.kuerzungProzent, { fractionDigits: 1, invalid: null }),
            meta: 'Abweichung zum Soll',
            trend
        });
    }

    if (typeof params.jahresentnahme === 'number' && isFinite(params.jahresentnahme)) {
        pushMetric({
            label: 'Jahresentnahme (brutto)',
            value: formatCurrencySafe(params.jahresentnahme),
            meta: 'Geplante Auszahlung'
        });
    }

    const grid = document.createElement('div');
    grid.className = 'key-param-grid';

    if (!metrics.length) {
        const empty = document.createElement('p');
        empty.textContent = 'Keine Schlüsselparameter vorhanden.';
        empty.style.fontSize = '.85rem';
        empty.style.color = 'var(--secondary-text)';
        grid.append(empty);
        return grid;
    }

    metrics.forEach(metric => {
        const card = document.createElement('div');
        card.className = 'key-param-card';
        card.dataset.trend = metric.trend;

        const label = document.createElement('span');
        label.className = 'label';
        label.textContent = metric.label;

        const value = document.createElement('span');
        value.className = 'value';
        value.textContent = metric.value;

        card.append(label, value);

        if (metric.meta) {
            const meta = document.createElement('span');
            meta.className = 'meta';
            meta.textContent = metric.meta;
            card.append(meta);
        }

        grid.append(card);
    });

    return grid;
}
