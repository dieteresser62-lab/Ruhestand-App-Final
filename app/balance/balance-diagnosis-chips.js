/**
 * Module: Balance Diagnosis Chips
 * Purpose: Generates the specialized "Chip" UI elements for the Diagnosis Panel.
 *          Visualizes key metrics (Runway, Liquidity, Drawdown) with status colors (Red/Yellow/Green).
 * Usage: Used by balance-renderer-diagnosis.js to populate the status header.
 * Dependencies: balance-utils.js
 */
"use strict";

import { UIUtils } from './balance-utils.js';

export function formatChipValue(value, formatter, fallback = 'n/a') {
    if (value === null || value === undefined || value === '') return fallback;
    if (typeof value === 'number' && !isFinite(value)) return fallback;
    if (typeof formatter === 'function') return formatter(value);
    return String(value);
}

export function getChipColor(value, thresholds = {}) {
    if (typeof value === 'string') {
        const normalized = value.toLowerCase();
        return ['ok', 'warn', 'danger', 'info'].includes(normalized) ? normalized : 'info';
    }
    if (typeof value !== 'number' || !isFinite(value)) return 'info';
    const danger = Number.isFinite(thresholds.danger) ? thresholds.danger : null;
    const warn = Number.isFinite(thresholds.warn) ? thresholds.warn : null;
    if (danger !== null && value >= danger) return 'danger';
    if (warn !== null && value >= warn) return 'warn';
    return 'ok';
}

export function createChip(status, label, value, title) {
    const chip = document.createElement('span');
    const resolvedStatus = getChipColor(status);
    chip.className = `diag-chip status-${resolvedStatus}`;
    chip.title = title || '';
    const labelEl = document.createElement('span');
    labelEl.className = 'label';
    labelEl.textContent = label;
    chip.append(labelEl, document.createTextNode(formatChipValue(value, null, '')));
    return chip;
}

export function buildDiagnosisChips(d) {
    const { entnahmequoteDepot, realerDepotDrawdown } = d.keyParams;
    const {
        runwayMonate,
        runwayTargetMonate,
        runwayStatus,
        runwayTargetQuelle,
        deckungVorher,
        deckungNachher
    } = d.general;

    const ALARM_withdrawalRate = UIUtils.getThreshold('THRESHOLDS.ALARM.withdrawalRate', 0.055);
    const CAUTION_withdrawalRate = UIUtils.getThreshold('THRESHOLDS.CAUTION.withdrawalRate', 0.045);
    const ALARM_realDrawdown = UIUtils.getThreshold('THRESHOLDS.ALARM.realDrawdown', 0.25);
    const STRATEGY_runwayThinMonths = UIUtils.getThreshold('THRESHOLDS.STRATEGY.runwayThinMonths', 24);

    const qStatus = entnahmequoteDepot > ALARM_withdrawalRate ? 'danger' : entnahmequoteDepot > CAUTION_withdrawalRate ? 'warn' : 'ok';
    const ddStatus = realerDepotDrawdown > ALARM_realDrawdown ? 'danger' : realerDepotDrawdown > 0.15 ? 'warn' : 'ok';
    const safeRunway = (typeof runwayMonate === 'number' && isFinite(runwayMonate)) ? runwayMonate : 0;
    const normalizedRunwayStatus = (status) => {
        if (status === 'bad') return 'danger';
        if (status === 'warn') return 'warn';
        return status === 'ok' ? 'ok' : null;
    };
    const derivedRunwayStatus = normalizedRunwayStatus(runwayStatus);
    const fallbackRunwayStatus = safeRunway > 36 ? 'ok' : safeRunway >= STRATEGY_runwayThinMonths ? 'warn' : 'danger';
    const rStatus = derivedRunwayStatus || fallbackRunwayStatus;
    const formatMonths = (value) => UIUtils.formatMonths(value, { fractionDigits: 0, invalid: '∞' });
    const runwaySourceInfo = UIUtils.describeRunwayTargetSource(runwayTargetQuelle);
    const runwayChipValue = (typeof runwayTargetMonate === 'number' && isFinite(runwayTargetMonate))
        ? `${formatMonths(runwayMonate)} / ${formatMonths(runwayTargetMonate)}`
        : `${formatMonths(runwayMonate)}`;
    const runwayChipTitle = (typeof runwayTargetMonate === 'number' && isFinite(runwayTargetMonate))
        ? `Aktuelle Runway vs. Ziel (${UIUtils.formatMonths(runwayTargetMonate, { fractionDigits: 0, invalid: 'n/a', suffix: 'Monate' })}).
Quelle: ${runwaySourceInfo.description}`
        : `Aktuelle Runway basierend auf verfügbaren Barmitteln.
Quelle: ${runwaySourceInfo.description}`;

    const fragment = document.createDocumentFragment();
    const formatPercentValue = (value) => UIUtils.formatPercentValue(value, { fractionDigits: 0, invalid: 'n/a' });
    const liquidityChipValue = `${formatPercentValue(deckungVorher)} → ${formatPercentValue(deckungNachher)}`;
    const liquidityChipTitle = 'Liquiditätsdeckung vor und nach der empfohlenen Transaktion relativ zum Zielpuffer.';
    const normalizedCoverage = (typeof deckungNachher === 'number' && isFinite(deckungNachher)) ? deckungNachher : 0;
    const liquidityStatus = normalizedCoverage >= 100 ? 'ok'
        : normalizedCoverage >= UIUtils.getThreshold('THRESHOLDS.STRATEGY.runwayThinPercent', 80) ? 'warn'
            : 'danger';
    fragment.append(
        createChip('info', 'Regime', d.general.marketSzenario),
        createChip(d.general.alarmActive ? 'danger' : 'ok', 'Alarm', d.general.alarmActive ? 'AKTIV' : 'Inaktiv'),
        createChip(qStatus, 'Quote', UIUtils.formatPercentRatio(entnahmequoteDepot, { fractionDigits: 1, invalid: 'n/a' }), 'Entnahmequote = Jährliche Entnahme / Depotwert'),
        createChip(ddStatus, 'Drawdown', UIUtils.formatPercentRatio(-realerDepotDrawdown, { fractionDigits: 1, invalid: 'n/a' }), 'Realer Drawdown des Gesamtvermögens seit dem inflationsbereinigten Höchststand'),
        createChip(liquidityStatus, 'Liquidität', liquidityChipValue, liquidityChipTitle),
        createChip(rStatus, 'Runway', runwayChipValue, runwayChipTitle)
    );

    if (runwaySourceInfo?.label) {
        const runwaySourceNote = document.createElement('small');
        runwaySourceNote.className = 'chip-note runway-source-note';
        runwaySourceNote.textContent = `Runway-Ziel basiert auf: ${runwaySourceInfo.label}`;
        fragment.appendChild(runwaySourceNote);
    }
    return fragment;
}
