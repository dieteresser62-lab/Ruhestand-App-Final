"use strict";

import {
    normalizeTailRiskConfig,
    previewTailRiskOverlay,
    validateTailRiskHorizonCompatibility
} from './tail-risk-contract.js';
import { rng } from './simulator-utils.js';

export const TAIL_RISK_EVENT_TYPE_CRASH_INFLATION = 'crash_inflation_shock';

function normalizeHorizonYears(horizonYears) {
    const horizon = Number(horizonYears);
    return Number.isInteger(horizon) && horizon > 0 ? horizon : 0;
}

function drawProbability(random) {
    const value = typeof random === 'function' ? random() : 1;
    if (!Number.isFinite(value)) return 1;
    return Math.min(1 - Number.EPSILON, Math.max(0, value));
}

function createEvent({ eventId, startYearIndex, durationYears, config }) {
    return {
        tailRiskEventId: eventId,
        tailRiskEventType: TAIL_RISK_EVENT_TYPE_CRASH_INFLATION,
        startYearIndex,
        durationYears,
        tailRiskReturnShockPct: config.tailRiskReturnShockPct,
        tailRiskInflationShockPct: config.tailRiskInflationShockPct
    };
}

export function createTailRiskSchedule(runSeed, configInput = {}, horizonYears) {
    const config = normalizeTailRiskConfig(configInput);
    const horizon = normalizeHorizonYears(horizonYears);
    const compatibility = validateTailRiskHorizonCompatibility(configInput, horizon);
    const schedule = Array.from({ length: horizon }, () => null);
    const probability = config.tailRiskAnnualProbabilityPct / 100;

    if (!config.tailRiskEnabled || probability <= 0 || horizon <= 0 || !compatibility.valid) {
        return {
            schedule,
            events: [],
            config,
            valid: compatibility.valid,
            errors: compatibility.errors,
            horizonYears: horizon
        };
    }

    const random = rng(Number(runSeed) || 0);
    const events = [];
    let yearIndex = 0;
    let eventId = 1;

    while (yearIndex < horizon) {
        const remainingYears = horizon - yearIndex;
        if (remainingYears < config.tailRiskDurationYears) break;

        const draw = drawProbability(random);
        if (draw < probability) {
            const event = createEvent({
                eventId,
                startYearIndex: yearIndex,
                durationYears: config.tailRiskDurationYears,
                config
            });
            events.push(event);

            for (let offset = 0; offset < config.tailRiskDurationYears; offset++) {
                schedule[yearIndex + offset] = {
                    ...event,
                    yearIndex: yearIndex + offset,
                    eventYearOffset: offset,
                    isTailRiskEventStart: offset === 0
                };
            }

            eventId += 1;
            yearIndex += config.tailRiskDurationYears + config.tailRiskCooldownYears;
        } else {
            yearIndex += 1;
        }
    }

    return {
        schedule,
        events,
        config,
        valid: true,
        errors: [],
        horizonYears: horizon
    };
}

export function applyTailRiskOverlay(yearData = {}, tailEvent = null, context = {}) {
    const baseYearData = { ...(yearData || {}) };
    if (!tailEvent) {
        return {
            yearData: baseYearData,
            tailRiskActive: false,
            tailRiskApplied: false,
            tailRiskSkippedReason: null,
            tailRiskEventType: null,
            tailRiskEventId: null
        };
    }

    const preview = previewTailRiskOverlay(baseYearData, {
        tailRiskEnabled: true,
        tailRiskAnnualProbabilityPct: 1,
        tailRiskReturnShockPct: tailEvent.tailRiskReturnShockPct,
        tailRiskInflationShockPct: tailEvent.tailRiskInflationShockPct,
        tailRiskDurationYears: tailEvent.durationYears,
        tailRiskCooldownYears: 0
    }, context);

    const effectiveYearData = preview.tailRiskApplied
        ? {
            ...baseYearData,
            rendite: preview.effectiveReturnPct / 100,
            inflation: preview.effectiveInflationPct
        }
        : baseYearData;

    return {
        yearData: effectiveYearData,
        tailRiskActive: true,
        tailRiskApplied: preview.tailRiskApplied,
        tailRiskSkippedReason: preview.tailRiskSkippedReason,
        tailRiskEventType: tailEvent.tailRiskEventType,
        tailRiskEventId: tailEvent.tailRiskEventId,
        tailRiskEventYearOffset: tailEvent.eventYearOffset,
        tailRiskReturnShockPct: tailEvent.tailRiskReturnShockPct,
        tailRiskInflationShockPct: tailEvent.tailRiskInflationShockPct,
        historicalReturnPct: preview.historicalReturnPct,
        effectiveReturnPct: preview.effectiveReturnPct,
        historicalInflationPct: preview.historicalInflationPct,
        effectiveInflationPct: preview.effectiveInflationPct,
        historicalCrisis: preview.historicalCrisis,
        historicalCrisisReasons: preview.historicalCrisisReasons
    };
}

export function summarizeTailRiskEvents(entries = []) {
    const safeEntries = Array.isArray(entries) ? entries : [];
    const eventIds = new Set();
    let activeYears = 0;
    let appliedYears = 0;
    let skippedHistoricalCrisisYears = 0;

    for (const entry of safeEntries) {
        if (!entry) continue;
        const active = entry.tailRiskActive === true || (entry.tailRiskEventId !== undefined && entry.tailRiskEventId !== null);
        if (!active) continue;
        activeYears += 1;
        if (entry.tailRiskEventId !== undefined && entry.tailRiskEventId !== null) {
            eventIds.add(entry.tailRiskEventId);
        }
        if (entry.tailRiskApplied === true) appliedYears += 1;
        if (entry.tailRiskSkippedReason === 'historical_crisis') skippedHistoricalCrisisYears += 1;
    }

    return {
        tailRiskEventCount: eventIds.size,
        tailRiskActiveYears: activeYears,
        tailRiskAppliedYears: appliedYears,
        tailRiskSkippedHistoricalCrisisYears: skippedHistoricalCrisisYears
    };
}
