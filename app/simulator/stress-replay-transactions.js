"use strict";

export const STRESS_REPLAY_TRANSACTION_EVENT_VERSION = 'StressReplayTransactionEventV1';
export const STRESS_REPLAY_TRANSACTION_CAPTURE_INPUT = 'stressReplayTransactionCapture';

export const STRESS_REPLAY_TRANSACTION_CLASSES = Object.freeze({
    LIQUIDITY_SHORTFALL_FORCED_SALE: 'liquidity_shortfall_forced_sale',
    PAYOUT_FLOOR_FALLBACK_SALE: 'payout_floor_fallback_sale',
    BOND_REFILL_SALE: 'bond_refill_sale',
    POLICY_REBALANCING_SALE: 'policy_rebalancing_sale'
});

const SUPPORTED_CLASSES = new Set(Object.values(STRESS_REPLAY_TRANSACTION_CLASSES));
const MONETARY_FIELDS = Object.freeze(['grossEur', 'netEur', 'taxEur']);
const BREAKDOWN_OPTIONAL_FIELDS = Object.freeze(['netEur', 'taxEur']);
const MONEY_RECONCILIATION_EPSILON = 1e-6;

function cloneValue(value) {
    if (typeof structuredClone === 'function') return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
}

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

function normalizeOptionalMoney(value, field, missingness) {
    if (value === null || value === undefined) {
        const reason = missingness.find(entry => entry?.scope !== 'breakdown' && entry?.field === field)?.reason;
        if (typeof reason !== 'string' || reason.trim() === '') {
            throw new TypeError(`Missing ${field} requires an explicit missingness reason`);
        }
        return null;
    }
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new TypeError(`${field} must be a finite non-negative monetary value or null`);
    }
    return value;
}

function readBreakdownMoney(entry, canonicalField, sourceField) {
    const value = Object.prototype.hasOwnProperty.call(entry, canonicalField)
        ? entry[canonicalField]
        : entry[sourceField];
    if (value === null || value === undefined) return null;
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
        throw new TypeError(`Transaction breakdown ${canonicalField} must be finite and non-negative`);
    }
    return value;
}

function normalizeBreakdown(breakdown) {
    if (!Array.isArray(breakdown)) return [];
    return breakdown.map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new TypeError(`Transaction breakdown entry ${index} must be an object`);
        }
        const normalized = {
            assetClass: String(entry.assetClass || entry.category || entry.kind || 'unknown'),
            grossEur: readBreakdownMoney(entry, 'grossEur', 'brutto'),
            netEur: readBreakdownMoney(entry, 'netEur', 'netto'),
            taxEur: readBreakdownMoney(entry, 'taxEur', 'steuer')
        };
        if (normalized.grossEur === null) {
            throw new TypeError('Transaction breakdown grossEur must be finite and non-negative');
        }
        return normalized;
    });
}

function normalizeMissingness(entries, diagnostic, breakdown) {
    if (!Array.isArray(entries)) return [];
    const seen = new Set();
    const normalized = entries.map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new TypeError(`Stress replay transaction missingness ${index} must be an object`);
        }
        const field = String(entry.field || '');
        const reason = String(entry.reason || '').trim();
        if (!MONETARY_FIELDS.includes(field)
            || reason === ''
            || (entry.scope !== undefined && entry.scope !== 'event' && entry.scope !== 'breakdown')) {
            throw new TypeError('Stress replay transaction missingness is invalid');
        }
        const isBreakdown = entry.scope === 'breakdown'
            || entry.breakdownIndex !== undefined
            || entry.assetClass !== undefined;
        if (!isBreakdown) {
            if (diagnostic[field] !== null && diagnostic[field] !== undefined) {
                throw new TypeError(`Missingness for observed transaction ${field} is invalid`);
            }
            const key = `event:${field}`;
            if (seen.has(key)) throw new TypeError(`Duplicate missingness for transaction ${field}`);
            seen.add(key);
            return { scope: 'event', field, reason };
        }

        if (!BREAKDOWN_OPTIONAL_FIELDS.includes(field)
            || !Number.isSafeInteger(entry.breakdownIndex)
            || entry.breakdownIndex < 0
            || entry.breakdownIndex >= breakdown.length) {
            throw new TypeError('Stress replay transaction breakdown missingness is invalid');
        }
        const breakdownEntry = breakdown[entry.breakdownIndex];
        const assetClass = String(entry.assetClass || '');
        if (assetClass === '' || assetClass !== breakdownEntry.assetClass || breakdownEntry[field] !== null) {
            throw new TypeError('Stress replay transaction breakdown missingness does not match its breakdown value');
        }
        const key = `breakdown:${entry.breakdownIndex}:${field}`;
        if (seen.has(key)) throw new TypeError(`Duplicate breakdown missingness for ${field}`);
        seen.add(key);
        return {
            scope: 'breakdown',
            breakdownIndex: entry.breakdownIndex,
            assetClass,
            field,
            reason
        };
    });

    for (const field of MONETARY_FIELDS) {
        if ((diagnostic[field] === null || diagnostic[field] === undefined)
            && !seen.has(`event:${field}`)) {
            throw new TypeError(`Missing ${field} requires an explicit missingness reason`);
        }
    }
    breakdown.forEach((entry, breakdownIndex) => {
        for (const field of BREAKDOWN_OPTIONAL_FIELDS) {
            if (entry[field] === null && !seen.has(`breakdown:${breakdownIndex}:${field}`)) {
                throw new TypeError(`Missing breakdown ${breakdownIndex}.${field} requires explicit missingness`);
            }
        }
    });
    return normalized;
}

function assertBreakdownReconciles(event) {
    if (event.breakdown.length === 0) return;
    for (const field of MONETARY_FIELDS) {
        if (event[field] === null) continue;
        const values = event.breakdown.map(entry => entry[field]);
        const knownSum = values.reduce((sum, value) => sum + (value === null ? 0 : value), 0);
        const tolerance = MONEY_RECONCILIATION_EPSILON * Math.max(1, event[field], knownSum);
        if (knownSum > event[field] + tolerance
            || (!values.includes(null) && Math.abs(knownSum - event[field]) > tolerance)) {
            throw new TypeError(`Transaction breakdown ${field} contradicts its aggregate`);
        }
    }
}

/**
 * Projects simulator-owned, structured diagnostics into the replay event
 * contract. Display text is deliberately not accepted as an oracle.
 */
export function buildStressReplayTransactionsForYear({
    logData,
    yearIndex,
    historicalYear = null
}) {
    const diagnostics = logData?.stressReplayTransactionDiagnostics;
    if (!Array.isArray(diagnostics)) return Object.freeze([]);
    if (!Number.isSafeInteger(yearIndex) || yearIndex < 0) {
        throw new TypeError('Stress replay transaction yearIndex must be a non-negative safe integer');
    }
    if (historicalYear !== null && !Number.isSafeInteger(historicalYear)) {
        throw new TypeError('Stress replay transaction historicalYear must be a safe integer or null');
    }

    const events = diagnostics.map((diagnostic, sequence) => {
        if (!diagnostic || typeof diagnostic !== 'object' || Array.isArray(diagnostic)) {
            throw new TypeError(`Stress replay transaction diagnostic ${sequence} must be an object`);
        }
        if (!SUPPORTED_CLASSES.has(diagnostic.class)) {
            throw new TypeError(`Unsupported stress replay transaction class: ${diagnostic.class}`);
        }
        if (typeof diagnostic.oracle !== 'string' || diagnostic.oracle.trim() === '') {
            throw new TypeError('Stress replay transaction diagnostics require a structured oracle');
        }
        const breakdown = normalizeBreakdown(diagnostic.breakdown);
        const missingness = normalizeMissingness(diagnostic.missingness, diagnostic, breakdown);
        const event = {
            schemaVersion: STRESS_REPLAY_TRANSACTION_EVENT_VERSION,
            id: `${yearIndex}:${sequence}:${diagnostic.class}`,
            class: diagnostic.class,
            phase: String(diagnostic.phase || ''),
            yearIndex,
            historicalYear,
            sequence,
            oracle: diagnostic.oracle,
            grossEur: normalizeOptionalMoney(diagnostic.grossEur, 'grossEur', missingness),
            netEur: normalizeOptionalMoney(diagnostic.netEur, 'netEur', missingness),
            taxEur: normalizeOptionalMoney(diagnostic.taxEur, 'taxEur', missingness),
            requestedNetEur: diagnostic.requestedNetEur === null || diagnostic.requestedNetEur === undefined
                ? null
                : normalizeOptionalMoney(diagnostic.requestedNetEur, 'requestedNetEur', []),
            breakdown,
            missingness
        };
        assertBreakdownReconciles(event);
        return deepFreeze(event);
    });
    return deepFreeze(events);
}

export function collectStressReplayTransactions(years) {
    if (!Array.isArray(years)) throw new TypeError('Stress replay transaction years must be an array');
    const transactions = years.flatMap((year, index) => buildStressReplayTransactionsForYear({
        logData: year?.logData || year,
        yearIndex: Number.isSafeInteger(year?.yearIndex) ? year.yearIndex : index,
        historicalYear: Number.isSafeInteger(year?.historicalYear)
            ? year.historicalYear
            : (Number.isSafeInteger(year?.histJahr) ? year.histJahr : null)
    }));
    return deepFreeze(cloneValue(transactions));
}

export const extractStressReplayTransactions = collectStressReplayTransactions;

/**
 * Builds deterministic per-class totals without turning unobserved money into
 * zero. A null total therefore always carries explicit field-level
 * missingness from at least one source event.
 */
export function summarizeStressReplayTransactionsV1(transactions) {
    if (!Array.isArray(transactions)) {
        throw new TypeError('Stress replay transactions must be an array');
    }
    const byClass = new Map();
    for (const [index, transaction] of transactions.entries()) {
        if (!transaction || typeof transaction !== 'object' || Array.isArray(transaction)) {
            throw new TypeError(`Stress replay transaction ${index} must be an object`);
        }
        if (transaction.schemaVersion !== STRESS_REPLAY_TRANSACTION_EVENT_VERSION
            || !SUPPORTED_CLASSES.has(transaction.class)) {
            throw new TypeError(`Stress replay transaction ${index} has an unsupported contract`);
        }
        const normalizedBreakdown = normalizeBreakdown(transaction.breakdown);
        const normalizedMissingness = normalizeMissingness(
            transaction.missingness,
            transaction,
            normalizedBreakdown
        );
        const normalizedMoney = Object.fromEntries(MONETARY_FIELDS.map(field => [
            field,
            normalizeOptionalMoney(transaction[field], field, normalizedMissingness)
        ]));
        assertBreakdownReconciles({
            ...normalizedMoney,
            breakdown: normalizedBreakdown
        });
        const aggregate = byClass.get(transaction.class) || {
            class: transaction.class,
            count: 0,
            firstYearIndex: transaction.yearIndex,
            firstHistoricalYear: transaction.historicalYear,
            grossEur: 0,
            netEur: 0,
            taxEur: 0,
            missingness: []
        };
        aggregate.count += 1;
        const sourceMissingness = normalizedMissingness;
        for (const entry of sourceMissingness.filter(item => item?.scope === 'breakdown')) {
            aggregate.missingness.push({
                transactionId: String(transaction.id || ''),
                scope: 'breakdown',
                breakdownIndex: entry.breakdownIndex,
                assetClass: entry.assetClass,
                field: entry.field,
                reasons: [entry.reason]
            });
        }
        for (const field of MONETARY_FIELDS) {
            if (normalizedMoney[field] === null) {
                aggregate[field] = null;
                const reasons = sourceMissingness
                    .filter(entry => entry?.field === field)
                    .filter(entry => entry?.scope !== 'breakdown')
                    .map(entry => entry.reason);
                aggregate.missingness.push({
                    transactionId: String(transaction.id || ''),
                    field,
                    reasons
                });
            } else if (aggregate[field] !== null) {
                const numeric = normalizedMoney[field];
                if (typeof numeric !== 'number' || !Number.isFinite(numeric) || numeric < 0) {
                    throw new TypeError(`Stress replay transaction ${index}.${field} is invalid`);
                }
                aggregate[field] += numeric;
            }
        }
        byClass.set(transaction.class, aggregate);
    }
    return deepFreeze([...byClass.values()]
        .sort((left, right) => left.class.localeCompare(right.class))
        .map(aggregate => cloneValue(aggregate)));
}
