"use strict";

import { annualData } from './simulator-data.js';

const HISTORICAL_YEAR_MINIMUM = annualData[0]?.jahr ?? 1925;
const HISTORICAL_YEAR_MAXIMUM = annualData[annualData.length - 1]?.jahr ?? 2025;

export const MONTE_CARLO_PARAMETERS_VERSION = 'MonteCarloParametersV1';

export const MONTE_CARLO_PARAMETER_LIMITS = Object.freeze({
    runs: Object.freeze({
        minimum: 1,
        default: 10000,
        interactiveRecommendedMaximum: 100000,
        hardMaximum: 1000000
    }),
    durationYears: Object.freeze({
        minimum: 1,
        default: 35,
        mortalityTableMaximumAge: 110,
        storageMaximum: 0xFFFFFFFF
    }),
    blockLengthYears: Object.freeze({ minimum: 1, default: 5, maximum: 30 }),
    workerCount: Object.freeze({ autoSentinel: 0, minimumExplicit: 1, default: 8, maximum: 32 }),
    jobTimeBudgetMs: Object.freeze({ minimum: 50, default: 500, maximum: 5000 }),
    seed: Object.freeze({ minimum: 0, default: 12345, maximum: 0xFFFFFFFF }),
    startYearFilter: Object.freeze({
        minimum: HISTORICAL_YEAR_MINIMUM,
        default: 1970,
        maximum: HISTORICAL_YEAR_MAXIMUM
    }),
    startYearHalfLife: Object.freeze({ minimum: 5, default: 20, maximum: 50 }),
    measuredWorkerResultBytesPerRun: 419
});

export const MONTE_CARLO_SAMPLING_METHODS = Object.freeze([
    'block',
    'stationary',
    'regime_markov',
    'regime_iid'
]);
export const MONTE_CARLO_RNG_MODES = Object.freeze(['per-run-seed', 'legacy-stream']);
export const MONTE_CARLO_START_YEAR_MODES = Object.freeze(['UNIFORM', 'FILTER', 'RECENCY']);

function parameterError(code, message) {
    const error = new TypeError(`${MONTE_CARLO_PARAMETERS_VERSION}: ${message}`);
    error.code = code;
    return error;
}

function readStrictInteger(value, field, { minimum, maximum, defaultValue } = {}) {
    let normalizedValue = value;
    if (normalizedValue === undefined || normalizedValue === null || normalizedValue === '') {
        if (defaultValue === undefined) {
            throw parameterError('MC_PARAMETER_REQUIRED', `${field} ist erforderlich.`);
        }
        normalizedValue = defaultValue;
    }

    if (typeof normalizedValue === 'string') {
        const trimmed = normalizedValue.trim();
        if (!/^(?:0|[1-9]\d*)$/.test(trimmed)) {
            throw parameterError('MC_PARAMETER_INTEGER_INVALID', `${field} muss eine ganze Zahl ohne Dezimalstellen oder Suffix sein.`);
        }
        normalizedValue = Number(trimmed);
    }

    if (!Number.isSafeInteger(normalizedValue)) {
        throw parameterError('MC_PARAMETER_INTEGER_INVALID', `${field} muss eine endliche, sichere ganze Zahl sein.`);
    }
    if (Number.isFinite(minimum) && normalizedValue < minimum) {
        throw parameterError('MC_PARAMETER_BELOW_MINIMUM', `${field} muss mindestens ${minimum} betragen.`);
    }
    if (Number.isFinite(maximum) && normalizedValue > maximum) {
        throw parameterError('MC_PARAMETER_ABOVE_MAXIMUM', `${field} darf hoechstens ${maximum} betragen.`);
    }
    return normalizedValue;
}

function readEnum(value, field, allowedValues, defaultValue) {
    const normalizedValue = value === undefined || value === null || value === ''
        ? defaultValue
        : value;
    if (typeof normalizedValue !== 'string' || !allowedValues.includes(normalizedValue)) {
        throw parameterError('MC_PARAMETER_ENUM_INVALID', `${field} hat einen nicht unterstuetzten Wert: ${String(normalizedValue)}.`);
    }
    return normalizedValue;
}

function readBoolean(value, field, defaultValue) {
    const normalizedValue = value === undefined || value === null ? defaultValue : value;
    if (typeof normalizedValue !== 'boolean') {
        throw parameterError('MC_PARAMETER_BOOLEAN_INVALID', `${field} muss true oder false sein.`);
    }
    return normalizedValue;
}

function resolveYoungestHouseholdStartAge(inputs) {
    if (!inputs || typeof inputs !== 'object') return null;
    const ages = [inputs.startAlter];
    if (inputs.partner?.aktiv === true) ages.push(inputs.partner.startAlter);
    const normalized = ages.map((value, index) => readStrictInteger(value, index === 0 ? 'P1-Startalter' : 'P2-Startalter', {
        minimum: 0,
        maximum: MONTE_CARLO_PARAMETER_LIMITS.durationYears.mortalityTableMaximumAge
    }));
    return Math.min(...normalized);
}

export function resolveMonteCarloDurationMaximumV1(inputs = null) {
    const youngestStartAge = resolveYoungestHouseholdStartAge(inputs);
    if (youngestStartAge === null) {
        return MONTE_CARLO_PARAMETER_LIMITS.durationYears.mortalityTableMaximumAge;
    }
    return Math.min(
        MONTE_CARLO_PARAMETER_LIMITS.durationYears.storageMaximum,
        MONTE_CARLO_PARAMETER_LIMITS.durationYears.mortalityTableMaximumAge - youngestStartAge + 1
    );
}

export function normalizeMonteCarloParametersV1(rawParameters = {}, {
    inputs = null,
    historicalRecordCount = null
} = {}) {
    if (!rawParameters || typeof rawParameters !== 'object' || Array.isArray(rawParameters)) {
        throw parameterError('MC_PARAMETERS_OBJECT_REQUIRED', 'Parameter muessen als Objekt uebergeben werden.');
    }

    const limits = MONTE_CARLO_PARAMETER_LIMITS;
    const methode = readEnum(
        rawParameters.methode,
        'Simulationsmethode',
        MONTE_CARLO_SAMPLING_METHODS,
        'regime_markov'
    );
    const durationMaximum = resolveMonteCarloDurationMaximumV1(inputs);
    const eligibleRecordCount = historicalRecordCount === null || historicalRecordCount === undefined
        ? null
        : readStrictInteger(historicalRecordCount, 'Anzahl historischer Datensaetze', { minimum: 1 });
    const blockMaximum = methode === 'block' && eligibleRecordCount !== null
        ? Math.min(limits.blockLengthYears.maximum, eligibleRecordCount)
        : limits.blockLengthYears.maximum;

    const normalized = {
        anzahl: readStrictInteger(rawParameters.anzahl, 'Anzahl der Simulationen', {
            minimum: limits.runs.minimum,
            maximum: limits.runs.hardMaximum,
            defaultValue: limits.runs.default
        }),
        maxDauer: readStrictInteger(rawParameters.maxDauer, 'Simulationsdauer in Jahren', {
            minimum: limits.durationYears.minimum,
            maximum: durationMaximum,
            defaultValue: Math.min(limits.durationYears.default, durationMaximum)
        }),
        blockSize: readStrictInteger(rawParameters.blockSize, methode === 'stationary'
            ? 'Erwartete Blocklaenge in Jahren'
            : 'Blockgroesse in Jahren', {
            minimum: limits.blockLengthYears.minimum,
            maximum: blockMaximum,
            defaultValue: limits.blockLengthYears.default
        }),
        seed: readStrictInteger(rawParameters.seed, 'Zufalls-Seed', {
            minimum: limits.seed.minimum,
            maximum: limits.seed.maximum,
            defaultValue: limits.seed.default
        }),
        methode,
        rngMode: readEnum(rawParameters.rngMode, 'RNG-Modus', MONTE_CARLO_RNG_MODES, 'per-run-seed'),
        startYearMode: readEnum(rawParameters.startYearMode, 'Startjahr-Modus', MONTE_CARLO_START_YEAR_MODES, 'UNIFORM'),
        startYearFilter: readStrictInteger(rawParameters.startYearFilter, 'Startjahr-Filter', {
            minimum: limits.startYearFilter.minimum,
            maximum: limits.startYearFilter.maximum,
            defaultValue: limits.startYearFilter.default
        }),
        startYearHalfLife: readStrictInteger(rawParameters.startYearHalfLife, 'Startjahr-Halbwertszeit', {
            minimum: limits.startYearHalfLife.minimum,
            maximum: limits.startYearHalfLife.maximum,
            defaultValue: limits.startYearHalfLife.default
        }),
        excludeEstimatedHistory: readBoolean(
            rawParameters.excludeEstimatedHistory,
            'Ausschluss geschaetzter Historie',
            false
        )
    };

    return Object.freeze(normalized);
}

export function normalizeMonteCarloResourceConfigV1(rawConfig = {}) {
    if (!rawConfig || typeof rawConfig !== 'object' || Array.isArray(rawConfig)) {
        throw parameterError('MC_RESOURCE_CONFIG_OBJECT_REQUIRED', 'Ressourcenkonfiguration muss als Objekt uebergeben werden.');
    }
    const limits = MONTE_CARLO_PARAMETER_LIMITS;
    return Object.freeze({
        workerCount: readStrictInteger(rawConfig.workerCount, 'Worker-Anzahl', {
            minimum: limits.workerCount.autoSentinel,
            maximum: limits.workerCount.maximum,
            defaultValue: limits.workerCount.default
        }),
        timeBudgetMs: readStrictInteger(rawConfig.timeBudgetMs, 'Job-Timebudget in Millisekunden', {
            minimum: limits.jobTimeBudgetMs.minimum,
            maximum: limits.jobTimeBudgetMs.maximum,
            defaultValue: limits.jobTimeBudgetMs.default
        })
    });
}

export function resolveMonteCarloWorkerCountV1(resourceConfig, {
    hardwareConcurrency = globalThis.navigator?.hardwareConcurrency
} = {}) {
    const normalized = normalizeMonteCarloResourceConfigV1(resourceConfig);
    if (normalized.workerCount > 0) return normalized.workerCount;
    const hardwareThreads = Number.isSafeInteger(hardwareConcurrency) && hardwareConcurrency > 1
        ? hardwareConcurrency
        : 2;
    return Math.max(1, Math.min(
        MONTE_CARLO_PARAMETER_LIMITS.workerCount.maximum,
        hardwareThreads - 1
    ));
}

export function estimateMonteCarloResourcesV1(parameters) {
    if (!parameters || typeof parameters !== 'object' || Array.isArray(parameters)) {
        throw parameterError('MC_PARAMETERS_OBJECT_REQUIRED', 'Parameter muessen als Objekt uebergeben werden.');
    }
    const runs = readStrictInteger(parameters.anzahl, 'Anzahl der Simulationen', {
        minimum: MONTE_CARLO_PARAMETER_LIMITS.runs.minimum,
        maximum: MONTE_CARLO_PARAMETER_LIMITS.runs.hardMaximum,
        defaultValue: MONTE_CARLO_PARAMETER_LIMITS.runs.default
    });
    const durationYears = readStrictInteger(parameters.maxDauer, 'Simulationsdauer in Jahren', {
        minimum: MONTE_CARLO_PARAMETER_LIMITS.durationYears.minimum,
        maximum: MONTE_CARLO_PARAMETER_LIMITS.durationYears.storageMaximum,
        defaultValue: MONTE_CARLO_PARAMETER_LIMITS.durationYears.default
    });
    const runYears = runs * durationYears;
    const estimatedWorkerResultBytes = runs * MONTE_CARLO_PARAMETER_LIMITS.measuredWorkerResultBytesPerRun;
    const estimatedWorkerResultMiB = estimatedWorkerResultBytes / (1024 * 1024);
    const memoryClass = estimatedWorkerResultMiB <= 64
        ? 'niedrig'
        : estimatedWorkerResultMiB <= 256
            ? 'mittel'
            : 'hoch';
    const requiresLargeRunConfirmation = runs
        > MONTE_CARLO_PARAMETER_LIMITS.runs.interactiveRecommendedMaximum;
    const loadLevel = requiresLargeRunConfirmation
        ? 'grosslast'
        : runYears > 3500000
            ? 'erhoeht'
            : 'normal';

    return Object.freeze({
        runYears,
        estimatedWorkerResultBytes,
        estimatedWorkerResultMiB,
        memoryClass,
        loadLevel,
        requiresLargeRunConfirmation
    });
}
