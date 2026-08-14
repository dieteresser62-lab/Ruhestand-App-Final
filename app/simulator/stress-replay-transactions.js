"use strict";

export const STRESS_REPLAY_TRANSACTION_EVENT_VERSION = 'StressReplayTransactionEventV1';
export const STRESS_REPLAY_TRANSACTION_CAPTURE_INPUT = 'stressReplayTransactionCapture';

export const STRESS_REPLAY_TRANSACTION_CLASSES = Object.freeze({
    LIQUIDITY_SHORTFALL_FORCED_SALE: 'liquidity_shortfall_forced_sale',
    PAYOUT_FLOOR_FALLBACK_SALE: 'payout_floor_fallback_sale',
    BOND_REFILL_SALE: 'bond_refill_sale',
    POLICY_REBALANCING_SALE: 'policy_rebalancing_sale',
    ASSET_ALLOCATION_INITIAL_TRANSFORM: 'asset_allocation_initial_transform'
});

const SUPPORTED_CLASSES = new Set(Object.values(STRESS_REPLAY_TRANSACTION_CLASSES));
const MONETARY_FIELDS = Object.freeze(['grossEur', 'netEur', 'taxEur']);

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
        const reason = missingness.find(entry => entry?.field === field)?.reason;
        if (typeof reason !== 'string' || reason.trim() === '') {
            throw new TypeError(`Missing ${field} requires an explicit missingness reason`);
        }
        return null;
    }
    const numeric = Number(value);
    if (!Number.isFinite(numeric) || numeric < 0) {
        throw new TypeError(`${field} must be a finite non-negative monetary value or null`);
    }
    return numeric;
}

function normalizeBreakdown(breakdown) {
    if (!Array.isArray(breakdown)) return [];
    return breakdown.map((entry, index) => {
        if (!entry || typeof entry !== 'object' || Array.isArray(entry)) {
            throw new TypeError(`Transaction breakdown entry ${index} must be an object`);
        }
        const normalized = {
            assetClass: String(entry.assetClass || entry.category || entry.kind || 'unknown'),
            grossEur: Number(entry.grossEur ?? entry.brutto ?? 0),
            netEur: entry.netEur === null || entry.netto === null
                ? null
                : Number(entry.netEur ?? entry.netto ?? 0),
            taxEur: entry.taxEur === null || entry.steuer === null
                ? null
                : Number(entry.taxEur ?? entry.steuer ?? 0)
        };
        for (const field of ['grossEur', 'netEur', 'taxEur']) {
            if (normalized[field] !== null
                && (!Number.isFinite(normalized[field]) || normalized[field] < 0)) {
                throw new TypeError(`Transaction breakdown ${field} must be finite and non-negative`);
            }
        }
        return normalized;
    });
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
        const missingness = Array.isArray(diagnostic.missingness)
            ? diagnostic.missingness.map(entry => ({
                field: String(entry?.field || ''),
                reason: String(entry?.reason || '')
            }))
            : [];
        for (const entry of missingness) {
            if (!MONETARY_FIELDS.includes(entry.field) || entry.reason === '') {
                throw new TypeError('Stress replay transaction missingness is invalid');
            }
        }
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
            breakdown: normalizeBreakdown(diagnostic.breakdown),
            missingness
        };
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
        for (const field of MONETARY_FIELDS) {
            if (transaction[field] === null || transaction[field] === undefined) {
                aggregate[field] = null;
                const reasons = Array.isArray(transaction.missingness)
                    ? transaction.missingness
                        .filter(entry => entry?.field === field)
                        .map(entry => entry.reason)
                    : [];
                aggregate.missingness.push({
                    transactionId: String(transaction.id || ''),
                    field,
                    reasons
                });
            } else if (aggregate[field] !== null) {
                const numeric = Number(transaction[field]);
                if (!Number.isFinite(numeric) || numeric < 0) {
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
