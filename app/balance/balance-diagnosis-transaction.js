/**
 * Module: Balance Diagnosis Transaction
 * Purpose: Renders the detailed "Transaction Diagnostics" in the Diagnosis Panel.
 *          Explains WHY a specific transaction (or no transaction) was recommended (e.g., blocked by Gold Floor).
 * Uage: Used by balance-renderer-diagnosis.js to provide transparency on engine decisions.
 * Dependencies: balance-utils.js
 */
"use strict";

import { UIUtils } from './balance-utils.js';

const THRESHOLD_LABEL_MAP = Object.freeze({
    targetallocationpct: 'Ziel-Allokation',
    maxallocationpct: 'Max. Allokation',
    maxallocpctofeq: 'Max. Allokation (Eq)',
    rebalancingbandpct: 'Rebalancing-Band',
    minallocationpct: 'Min. Allokation',
    targetgoldvalue: 'Zielwert Gold',
    mingoldreserve: 'Min. Goldreserve',
    maxbearrellicofeq: 'Max. Drawdown Eq',
    blockedamount: 'Blockierter Betrag',
    minrunwaymonate: 'Min. Runway (Monate)',
    targetrunwaymonate: 'Ziel-Runway (Monate)',
    minsoldreserve: 'Min. Reserve'
});

export function buildTransactionDiagnostics(transactionDiag) {
    const fragment = document.createDocumentFragment();

    if (!transactionDiag || typeof transactionDiag !== 'object') {
        const emptyState = document.createElement('p');
        emptyState.className = 'diag-empty-state';
        emptyState.textContent = 'Keine Transaktionsdiagnostik verfügbar.';
        fragment.appendChild(emptyState);
        return fragment;
    }

    const statusMeta = determineTransactionStatus(transactionDiag);
    const summaryRows = [
        { label: 'Ausgelöst?', value: transactionDiag.wasTriggered ? 'Ja' : 'Nein' },
        { label: 'Blockgrund', value: statusMeta.label },
        {
            label: 'Blockierter Betrag',
            value: UIUtils.formatCurrency(transactionDiag.blockedAmount || 0)
        }
    ];

    if (transactionDiag.potentialTrade && typeof transactionDiag.potentialTrade === 'object') {
        const trade = transactionDiag.potentialTrade;
        const descriptor = [trade.direction || trade.kind || 'Unbekannte Aktion'];
        if (typeof trade.netAmount === 'number') {
            descriptor.push(UIUtils.formatCurrency(trade.netAmount));
        } else if (typeof trade.netto === 'number') {
            descriptor.push(UIUtils.formatCurrency(trade.netto));
        }
        summaryRows.push({
            label: 'Geplante Aktion',
            value: descriptor.filter(Boolean).join(' · ')
        });
    }

    fragment.appendChild(createTransactionCard({
        title: 'Transaktionsstatus',
        subtitle: statusMeta.subtitle,
        rows: summaryRows
    }, statusMeta.status));

    const thresholdCards = [
        describeThresholdGroup('Aktien-Grenzen', transactionDiag.equityThresholds),
        describeThresholdGroup('Gold-Grenzen', transactionDiag.goldThresholds)
    ].filter(Boolean);

    thresholdCards.forEach(card => fragment.appendChild(card));

    if (Array.isArray(transactionDiag.selectedTranches) && transactionDiag.selectedTranches.length > 0) {
        const rows = transactionDiag.selectedTranches.map(item => {
            const labelParts = [];
            if (item.name) labelParts.push(item.name);
            labelParts.push(item.kind || 'Tranche');
            const taxPct = (typeof item.taxPerEuro === 'number' && isFinite(item.taxPerEuro))
                ? UIUtils.formatPercentRatio(item.taxPerEuro, { fractionDigits: 2, invalid: '0.00%' })
                : '0.00%';
            const taxVal = UIUtils.formatCurrency(item.steuer || 0);
            const bruttoVal = UIUtils.formatCurrency(item.brutto || 0);
            return {
                label: labelParts.filter(Boolean).join(' / '),
                value: `Steuer/€ ${taxPct} | Brutto ${bruttoVal} | Steuer ${taxVal}`
            };
        });
        fragment.appendChild(createTransactionCard({
            title: 'Tranchenauswahl (Steuerlast)',
            subtitle: 'Geringste Steuerlast zuerst',
            rows
        }, 'info'));
    }

    return fragment;
}

function determineTransactionStatus(diag) {
    const reasonKey = (diag.blockReason || 'none').toLowerCase();
    const statusMap = {
        none: 'ok',
        min_trade: 'warn',
        liquidity_sufficient: 'info',
        guardrail_block: 'danger',
        cap_active: 'warn',
        gold_floor: 'danger'
    };
    const labelMap = {
        none: 'Keine Blockade',
        min_trade: 'Unter Mindestgröße',
        liquidity_sufficient: 'Liquidität ausreichend',
        guardrail_block: 'Guardrail verhindert Verkauf',
        cap_active: 'Cap begrenzt Trade',
        gold_floor: 'Gold-Floor aktiv'
    };

    const status = statusMap[reasonKey] || (diag.wasTriggered ? 'ok' : 'info');
    const label = labelMap[reasonKey] || reasonKey.replace(/[_-]/g, ' ');
    const subtitle = (diag.blockReason && diag.blockReason !== 'none')
        ? `Grundcode: ${diag.blockReason}`
        : 'Keine Einschränkungen gemeldet';

    return { status, label, subtitle };
}

function createTransactionCard(config, status = 'info') {
    const card = document.createElement('div');
    card.className = `guardrail-card status-${status}`;
    const title = document.createElement('strong');
    title.textContent = config.title;
    card.appendChild(title);

    if (config.subtitle) {
        const subtitle = document.createElement('div');
        subtitle.className = 'threshold';
        subtitle.textContent = config.subtitle;
        card.appendChild(subtitle);
    }

    config.rows.forEach(row => {
        const rowEl = document.createElement('div');
        rowEl.className = 'value-row';
        const labelEl = document.createElement('span');
        labelEl.className = 'label';
        labelEl.textContent = `${row.label}:`;
        const valueEl = document.createElement('span');
        valueEl.className = 'value';
        valueEl.textContent = row.value || 'n/a';
        rowEl.append(labelEl, valueEl);
        card.appendChild(rowEl);
    });

    return card;
}

function describeThresholdGroup(label, thresholds) {
    if (!thresholds || typeof thresholds !== 'object' || Object.keys(thresholds).length === 0) {
        return null;
    }

    const entries = Object.entries(thresholds);
    const lower = entries.find(([key]) => /lower|min/i.test(key));
    const upper = entries.find(([key]) => /upper|max/i.test(key));
    const current = entries.find(([key]) => /current|ist|actual/i.test(key));

    const currentValue = (current && typeof current[1] === 'number') ? current[1] : null;
    const lowerValue = (lower && typeof lower[1] === 'number') ? lower[1] : null;
    const upperValue = (upper && typeof upper[1] === 'number') ? upper[1] : null;

    // Status-Ampel: rot außerhalb der Grenzen, gelb nahe an der Grenze, sonst ok.
    let status = 'info';
    if (currentValue !== null) {
        if ((lowerValue !== null && currentValue < lowerValue) ||
            (upperValue !== null && currentValue > upperValue)) {
            status = 'danger';
        } else if (
            (lowerValue !== null && currentValue < lowerValue * 1.05) ||
            (upperValue !== null && currentValue > upperValue * 0.95)
        ) {
            status = 'warn';
        } else {
            status = 'ok';
        }
    }

    const rows = entries.map(([key, value]) => ({
        label: formatThresholdLabel(key),
        value: formatThresholdValue(key, value)
    }));

    return createTransactionCard({
        title: label,
        rows
    }, status);
}

function formatThresholdLabel(key) {
    const normalized = (key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return THRESHOLD_LABEL_MAP[normalized] || key || '—';
}

function formatThresholdValue(key, value) {
    if (typeof value !== 'number' || !isFinite(value)) {
        return 'n/a';
    }
    if (/pct|percent/i.test(key)) {
        return UIUtils.formatPercentValue(value, { fractionDigits: 1, invalid: 'n/a' });
    }
    if (/monate|months|mon/i.test(key)) {
        return UIUtils.formatMonths(value, { fractionDigits: 0, invalid: 'n/a' });
    }
    return UIUtils.formatCurrency(value);
}
