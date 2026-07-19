"use strict";

import { HISTORICAL_DATA, HISTORICAL_DATA_MANIFEST } from './simulator-data.js';

export const HISTORICAL_YEAR_RECORD_SCHEMA_VERSION = 'HistoricalYearRecordV1';
export const HISTORICAL_DATA_MANIFEST_SCHEMA_VERSION = 'HistoricalDataManifestV1';

const REQUIRED_SERIES_IDS = Object.freeze([
    'msci_eur',
    'inflation_de',
    'zinssatz_de',
    'lohn_de',
    'gold_eur_perf',
    'cape'
]);
const RESOLUTION_STATUSES = new Set(['known', 'unresolved', 'not_applicable']);
const QUALITY_STATUSES = new Set(['present', 'estimated', 'unresolved', 'fallback_zero', 'missing']);
const providerCache = new Map();

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

function cloneContractValue(value, seen = new WeakMap()) {
    if (value === null || typeof value !== 'object') return value;
    if (seen.has(value)) return seen.get(value);
    const copy = Array.isArray(value) ? [] : Object.create(null);
    seen.set(value, copy);
    for (const key of Object.keys(value)) {
        Object.defineProperty(copy, key, {
            value: cloneContractValue(value[key], seen),
            enumerable: true,
            configurable: true,
            writable: true
        });
    }
    return copy;
}

function canonicalKeyCompare(left, right) {
    const leftIsInteger = /^(0|[1-9]\d*)$/.test(left);
    const rightIsInteger = /^(0|[1-9]\d*)$/.test(right);
    if (leftIsInteger && rightIsInteger) return Number(left) - Number(right);
    if (leftIsInteger !== rightIsInteger) return leftIsInteger ? -1 : 1;
    return left < right ? -1 : left > right ? 1 : 0;
}

export function canonicalizeHistoricalContractValue(value) {
    if (value === null) return 'null';
    if (typeof value === 'number') {
        if (Number.isNaN(value)) return '"__NaN__"';
        if (value === Infinity) return '"__Infinity__"';
        if (value === -Infinity) return '"__-Infinity__"';
        return JSON.stringify(value);
    }
    if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
    if (typeof value === 'undefined') return '"__undefined__"';
    if (Array.isArray(value)) {
        return `[${value.map(canonicalizeHistoricalContractValue).join(',')}]`;
    }
    if (typeof value === 'object') {
        const keys = Object.keys(value).sort(canonicalKeyCompare);
        return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalizeHistoricalContractValue(value[key])}`).join(',')}}`;
    }
    return JSON.stringify(String(value));
}

const SHA256_CONSTANTS = Object.freeze([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
]);

function rotateRight(value, shift) {
    return (value >>> shift) | (value << (32 - shift));
}

export function sha256Hex(input) {
    const bytes = new TextEncoder().encode(String(input));
    const paddedLength = Math.ceil((bytes.length + 9) / 64) * 64;
    const padded = new Uint8Array(paddedLength);
    padded.set(bytes);
    padded[bytes.length] = 0x80;
    const bitLength = bytes.length * 8;
    const view = new DataView(padded.buffer);
    view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000), false);
    view.setUint32(paddedLength - 4, bitLength >>> 0, false);

    const state = [
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19
    ];
    const words = new Uint32Array(64);

    for (let offset = 0; offset < paddedLength; offset += 64) {
        for (let index = 0; index < 16; index++) {
            words[index] = view.getUint32(offset + index * 4, false);
        }
        for (let index = 16; index < 64; index++) {
            const s0 = rotateRight(words[index - 15], 7) ^ rotateRight(words[index - 15], 18) ^ (words[index - 15] >>> 3);
            const s1 = rotateRight(words[index - 2], 17) ^ rotateRight(words[index - 2], 19) ^ (words[index - 2] >>> 10);
            words[index] = (words[index - 16] + s0 + words[index - 7] + s1) >>> 0;
        }

        let [a, b, c, d, e, f, g, h] = state;
        for (let index = 0; index < 64; index++) {
            const upperE = rotateRight(e, 6) ^ rotateRight(e, 11) ^ rotateRight(e, 25);
            const choice = (e & f) ^ (~e & g);
            const temp1 = (h + upperE + choice + SHA256_CONSTANTS[index] + words[index]) >>> 0;
            const upperA = rotateRight(a, 2) ^ rotateRight(a, 13) ^ rotateRight(a, 22);
            const majority = (a & b) ^ (a & c) ^ (b & c);
            const temp2 = (upperA + majority) >>> 0;
            h = g;
            g = f;
            f = e;
            e = (d + temp1) >>> 0;
            d = c;
            c = b;
            b = a;
            a = (temp1 + temp2) >>> 0;
        }

        state[0] = (state[0] + a) >>> 0;
        state[1] = (state[1] + b) >>> 0;
        state[2] = (state[2] + c) >>> 0;
        state[3] = (state[3] + d) >>> 0;
        state[4] = (state[4] + e) >>> 0;
        state[5] = (state[5] + f) >>> 0;
        state[6] = (state[6] + g) >>> 0;
        state[7] = (state[7] + h) >>> 0;
    }

    return state.map(value => value.toString(16).padStart(8, '0')).join('');
}

export function computeHistoricalDatasetHash(records) {
    return sha256Hex(canonicalizeHistoricalContractValue(records));
}

export class HistoricalDataContractError extends Error {
    constructor(code, message, details = {}) {
        super(message);
        this.name = 'HistoricalDataContractError';
        this.code = code;
        this.details = details && typeof details === 'object' ? details : {};
    }
}

function contractError(code, message, details = {}) {
    throw new HistoricalDataContractError(code, message, details);
}

function requireNonEmptyString(value, path) {
    if (typeof value !== 'string' || value.trim() === '') {
        contractError('HISTORICAL_MANIFEST_INVALID', `${path} must be a non-empty string`, { path });
    }
}

function validateResolutionField(value, path) {
    if (!value || typeof value !== 'object' || !RESOLUTION_STATUSES.has(value.status)) {
        contractError('HISTORICAL_MANIFEST_INVALID', `${path} requires a supported resolution status`, { path });
    }
    if (value.status === 'known') {
        requireNonEmptyString(value.value, `${path}.value`);
    } else if (value.value !== null) {
        contractError('HISTORICAL_MANIFEST_INVALID', `${path}.value must be null when status is ${value.status}`, { path });
    }
}

function validatePeriodShape(period, path) {
    const startYear = period?.startYear;
    const endYear = period?.endYear;
    if (!Number.isFinite(startYear) || !Number.isFinite(endYear) || !Number.isInteger(startYear) || !Number.isInteger(endYear)) {
        contractError('HISTORICAL_PERIOD_INVALID', `${path} requires finite integer startYear and endYear`, {
            path,
            startYear,
            endYear
        });
    }
    if (startYear > endYear) {
        contractError('HISTORICAL_PERIOD_INVALID', `${path}.startYear must not exceed endYear`, {
            path,
            startYear,
            endYear
        });
    }
    return { startYear, endYear };
}

function validateSegments(segments, path, outerPeriod) {
    if (!Array.isArray(segments)) {
        contractError('HISTORICAL_MANIFEST_INVALID', `${path} must be an array`, { path });
    }
    for (let index = 0; index < segments.length; index++) {
        const segment = validatePeriodShape(segments[index], `${path}[${index}]`);
        if (segment.startYear < outerPeriod.startYear || segment.endYear > outerPeriod.endYear) {
            contractError('HISTORICAL_MANIFEST_INVALID', `${path}[${index}] lies outside the series period`, {
                path: `${path}[${index}]`,
                segment,
                outerPeriod
            });
        }
    }
}

export function validateHistoricalDataManifest(manifest = HISTORICAL_DATA_MANIFEST) {
    if (!manifest || typeof manifest !== 'object') {
        contractError('HISTORICAL_MANIFEST_INVALID', 'Historical data manifest must be an object');
    }
    if (manifest.schemaVersion !== HISTORICAL_DATA_MANIFEST_SCHEMA_VERSION) {
        contractError('HISTORICAL_MANIFEST_INVALID', 'Unsupported historical data manifest schema', {
            schemaVersion: manifest.schemaVersion
        });
    }
    requireNonEmptyString(manifest.datasetId, 'manifest.datasetId');
    requireNonEmptyString(manifest.revision, 'manifest.revision');
    const datasetPeriod = validatePeriodShape(manifest.period, 'manifest.period');
    if (!Number.isInteger(manifest.lookback?.backtestYears) || manifest.lookback.backtestYears < 1) {
        contractError('HISTORICAL_MANIFEST_INVALID', 'manifest.lookback.backtestYears must be a positive integer', {
            path: 'manifest.lookback.backtestYears'
        });
    }
    requireNonEmptyString(manifest.lookback.reason, 'manifest.lookback.reason');
    if (manifest.contentHash?.algorithm !== 'sha256-canonical-json-v1'
        || typeof manifest.contentHash?.value !== 'string'
        || !/^[a-f0-9]{64}$/.test(manifest.contentHash.value)) {
        contractError('HISTORICAL_MANIFEST_INVALID', 'Manifest requires a canonical SHA-256 content hash', {
            path: 'manifest.contentHash'
        });
    }
    requireNonEmptyString(manifest.documentation, 'manifest.documentation');

    for (const seriesId of REQUIRED_SERIES_IDS) {
        const series = manifest.series?.[seriesId];
        if (!series || typeof series !== 'object' || series.id !== seriesId) {
            contractError('HISTORICAL_MANIFEST_INVALID', `Missing manifest series ${seriesId}`, { seriesId });
        }
        requireNonEmptyString(series.label, `manifest.series.${seriesId}.label`);
        requireNonEmptyString(series.unit, `manifest.series.${seriesId}.unit`);
        validateResolutionField(series.variant, `manifest.series.${seriesId}.variant`);
        validateResolutionField(series.currency, `manifest.series.${seriesId}.currency`);
        validateResolutionField(series.region, `manifest.series.${seriesId}.region`);
        validateResolutionField(series.frequency, `manifest.series.${seriesId}.frequency`);
        validateResolutionField(series.source, `manifest.series.${seriesId}.source`);
        validateResolutionField(series.license, `manifest.series.${seriesId}.license`);
        validateResolutionField(series.transformation, `manifest.series.${seriesId}.transformation`);
        const seriesPeriod = validatePeriodShape(series.period, `manifest.series.${seriesId}.period`);
        if (seriesPeriod.startYear !== datasetPeriod.startYear || seriesPeriod.endYear !== datasetPeriod.endYear) {
            contractError('HISTORICAL_MANIFEST_INVALID', `Series ${seriesId} period must match dataset period`, {
                seriesId,
                seriesPeriod,
                datasetPeriod
            });
        }
        validateSegments(series.estimatedSegments, `manifest.series.${seriesId}.estimatedSegments`, seriesPeriod);
        if (series.missingness?.required !== true || series.missingness.rule !== 'reject_missing_or_non_finite') {
            contractError('HISTORICAL_MANIFEST_INVALID', `Series ${seriesId} must declare the required missingness rule`, {
                seriesId
            });
        }
        validateSegments(
            series.missingness.fallbackZeroSegments,
            `manifest.series.${seriesId}.missingness.fallbackZeroSegments`,
            seriesPeriod
        );
        if (!['literal_value', 'unresolved_if_zero'].includes(series.missingness.zeroValuePolicy)) {
            contractError('HISTORICAL_MANIFEST_INVALID', `Series ${seriesId} has an unsupported zero-value policy`, {
                seriesId,
                zeroValuePolicy: series.missingness.zeroValuePolicy
            });
        }
        requireNonEmptyString(series.revision, `manifest.series.${seriesId}.revision`);
    }
    return manifest;
}

function extractHistoricalYears(records) {
    if (!records || typeof records !== 'object' || Array.isArray(records)) {
        contractError('HISTORICAL_DATASET_INVALID', 'Historical dataset must be an object keyed by integer years');
    }
    const seen = new Set();
    const years = [];
    for (const key of Object.keys(records)) {
        if (!/^-?\d+$/.test(key)) {
            contractError('HISTORICAL_DATASET_INVALID', 'Historical dataset contains a non-integer year key', { key });
        }
        const year = Number(key);
        if (!Number.isSafeInteger(year)) {
            contractError('HISTORICAL_DATASET_INVALID', 'Historical dataset contains an unsafe year key', { key });
        }
        if (seen.has(year)) {
            contractError('HISTORICAL_DATASET_DUPLICATE_YEAR', `Historical dataset contains duplicate year ${year}`, { year });
        }
        seen.add(year);
        years.push(year);
    }
    years.sort((left, right) => left - right);
    return years;
}

function validateRawHistoricalRecord(record, year) {
    if (!record || typeof record !== 'object' || Array.isArray(record)) {
        contractError('HISTORICAL_DATA_RECORD_INVALID', `Historical record ${year} must be an object`, { year });
    }
    for (const seriesId of REQUIRED_SERIES_IDS) {
        if (!Object.prototype.hasOwnProperty.call(record, seriesId)) {
            contractError('HISTORICAL_DATA_FIELD_MISSING', `Historical record ${year} is missing ${seriesId}`, {
                year,
                seriesId
            });
        }
        if (!Number.isFinite(record[seriesId])) {
            contractError('HISTORICAL_DATA_FIELD_NON_FINITE', `Historical record ${year}.${seriesId} must be finite`, {
                year,
                seriesId,
                value: record[seriesId]
            });
        }
    }
    if (record.msci_eur <= 0) {
        contractError('HISTORICAL_INDEX_LEVEL_INVALID', `Historical record ${year}.msci_eur must be greater than zero`, {
            year,
            seriesId: 'msci_eur',
            value: record.msci_eur
        });
    }
    if (record.cape <= 0) {
        contractError('HISTORICAL_INDEX_LEVEL_INVALID', `Historical record ${year}.cape must be greater than zero`, {
            year,
            seriesId: 'cape',
            value: record.cape
        });
    }
}

function yearInSegments(year, segments) {
    return segments.some(segment => year >= segment.startYear && year <= segment.endYear);
}

function resolveQualityStatus(series, year, value) {
    if (value === 0 && yearInSegments(year, series.missingness.fallbackZeroSegments)) return 'fallback_zero';
    if (value === 0 && series.missingness.zeroValuePolicy === 'unresolved_if_zero') return 'unresolved';
    if (yearInSegments(year, series.estimatedSegments)) return 'estimated';
    return 'present';
}

function combineQualityStatuses(...statuses) {
    const priority = { present: 0, estimated: 1, fallback_zero: 2, unresolved: 3, missing: 4 };
    return statuses.reduce((selected, status) => (
        priority[status] > priority[selected] ? status : selected
    ), 'present');
}

function createObservation({ seriesId, value, unit, sourceYear, asOfYear, qualityStatus, derivation, inputs }) {
    return deepFreeze({
        seriesId,
        value,
        unit,
        sourceYear,
        asOfYear,
        qualityStatus,
        derivation,
        ...(inputs ? { inputs } : {})
    });
}

export function buildHistoricalYearRecord({ year, current, previous, manifest = HISTORICAL_DATA_MANIFEST }) {
    validateHistoricalDataManifest(manifest);
    if (!Number.isInteger(year)) {
        contractError('HISTORICAL_YEAR_RECORD_INVALID', 'Historical year record requires an integer year', { year });
    }
    validateRawHistoricalRecord(current, year);
    validateRawHistoricalRecord(previous, year - 1);
    const series = manifest.series;
    const previousEquityQuality = resolveQualityStatus(series.msci_eur, year - 1, previous.msci_eur);
    const currentEquityQuality = resolveQualityStatus(series.msci_eur, year, current.msci_eur);
    const equityReturn = (current.msci_eur / previous.msci_eur) - 1;
    if (!Number.isFinite(equityReturn)) {
        contractError('HISTORICAL_DATA_FIELD_NON_FINITE', `Historical equity return for ${year} must be finite`, {
            year,
            seriesId: 'msci_eur'
        });
    }

    const record = {
        schemaVersion: HISTORICAL_YEAR_RECORD_SCHEMA_VERSION,
        year,
        alignmentStatus: 'proposal_pending_d01',
        dataset: {
            datasetId: manifest.datasetId,
            revision: manifest.revision,
            contentHash: manifest.contentHash.value
        },
        realized: {
            equityReturn: createObservation({
                seriesId: 'msci_eur',
                value: equityReturn,
                unit: 'ratio',
                sourceYear: year,
                asOfYear: year,
                qualityStatus: combineQualityStatuses(previousEquityQuality, currentEquityQuality),
                derivation: 'index_level_t_div_index_level_t_minus_1_minus_1',
                inputs: {
                    previousSourceYear: year - 1,
                    previousIndexLevel: previous.msci_eur,
                    currentSourceYear: year,
                    currentIndexLevel: current.msci_eur
                }
            }),
            goldReturn: createObservation({
                seriesId: 'gold_eur_perf',
                value: current.gold_eur_perf,
                unit: series.gold_eur_perf.unit,
                sourceYear: year,
                asOfYear: year,
                qualityStatus: resolveQualityStatus(series.gold_eur_perf, year, current.gold_eur_perf),
                derivation: 'embedded_value_t'
            }),
            cashBondReturn: createObservation({
                seriesId: 'zinssatz_de',
                value: current.zinssatz_de,
                unit: series.zinssatz_de.unit,
                sourceYear: year,
                asOfYear: year,
                qualityStatus: resolveQualityStatus(series.zinssatz_de, year, current.zinssatz_de),
                derivation: 'embedded_value_t'
            }),
            inflation: createObservation({
                seriesId: 'inflation_de',
                value: current.inflation_de,
                unit: series.inflation_de.unit,
                sourceYear: year,
                asOfYear: year,
                qualityStatus: resolveQualityStatus(series.inflation_de, year, current.inflation_de),
                derivation: 'embedded_value_t'
            }),
            wagePensionAdjustment: createObservation({
                seriesId: 'lohn_de',
                value: current.lohn_de,
                unit: series.lohn_de.unit,
                sourceYear: year,
                asOfYear: year,
                qualityStatus: resolveQualityStatus(series.lohn_de, year, current.lohn_de),
                derivation: 'embedded_value_t'
            })
        },
        decisionAsOf: {
            capeRatio: createObservation({
                seriesId: 'cape',
                value: previous.cape,
                unit: series.cape.unit,
                sourceYear: year - 1,
                asOfYear: year - 1,
                qualityStatus: resolveQualityStatus(series.cape, year - 1, previous.cape),
                derivation: 'last_embedded_value_before_decision_year'
            })
        }
    };
    validateHistoricalYearRecord(record, manifest);
    return deepFreeze(record);
}

const REQUIRED_OBSERVATIONS = Object.freeze([
    Object.freeze({ section: 'realized', field: 'equityReturn', expectedSeriesId: 'msci_eur' }),
    Object.freeze({ section: 'realized', field: 'goldReturn', expectedSeriesId: 'gold_eur_perf' }),
    Object.freeze({ section: 'realized', field: 'cashBondReturn', expectedSeriesId: 'zinssatz_de' }),
    Object.freeze({ section: 'realized', field: 'inflation', expectedSeriesId: 'inflation_de' }),
    Object.freeze({ section: 'realized', field: 'wagePensionAdjustment', expectedSeriesId: 'lohn_de' }),
    Object.freeze({ section: 'decisionAsOf', field: 'capeRatio', expectedSeriesId: 'cape' })
]);

export function validateHistoricalYearRecord(record, manifest = HISTORICAL_DATA_MANIFEST) {
    validateHistoricalDataManifest(manifest);
    if (!record || typeof record !== 'object' || record.schemaVersion !== HISTORICAL_YEAR_RECORD_SCHEMA_VERSION) {
        contractError('HISTORICAL_YEAR_RECORD_INVALID', 'Unsupported or missing HistoricalYearRecord schema', {
            schemaVersion: record?.schemaVersion
        });
    }
    if (!Number.isInteger(record.year)) {
        contractError('HISTORICAL_YEAR_RECORD_INVALID', 'HistoricalYearRecord.year must be an integer', { year: record.year });
    }
    for (const definition of REQUIRED_OBSERVATIONS) {
        const observation = record[definition.section]?.[definition.field];
        const path = `${definition.section}.${definition.field}`;
        if (!observation || typeof observation !== 'object') {
            contractError('HISTORICAL_YEAR_RECORD_FIELD_MISSING', `HistoricalYearRecord is missing ${path}`, {
                year: record.year,
                path
            });
        }
        if (observation.seriesId !== definition.expectedSeriesId) {
            contractError('HISTORICAL_YEAR_RECORD_INVALID', `${path}.seriesId does not match the contract`, {
                year: record.year,
                path,
                seriesId: observation.seriesId,
                expectedSeriesId: definition.expectedSeriesId
            });
        }
        if (!Number.isFinite(observation.value)) {
            contractError('HISTORICAL_YEAR_RECORD_NON_FINITE', `${path}.value must be finite`, {
                year: record.year,
                path,
                value: observation.value
            });
        }
        if (!Number.isInteger(observation.sourceYear) || !Number.isInteger(observation.asOfYear)) {
            contractError('HISTORICAL_YEAR_RECORD_INVALID', `${path} requires integer sourceYear and asOfYear`, {
                year: record.year,
                path
            });
        }
        if (!QUALITY_STATUSES.has(observation.qualityStatus)) {
            contractError('HISTORICAL_YEAR_RECORD_INVALID', `${path} has an unsupported quality status`, {
                year: record.year,
                path,
                qualityStatus: observation.qualityStatus
            });
        }
        if (observation.qualityStatus === 'missing') {
            contractError('HISTORICAL_YEAR_RECORD_MISSING', `${path} is marked missing`, {
                year: record.year,
                path,
                seriesId: observation.seriesId
            });
        }
        if (observation.qualityStatus === 'fallback_zero') {
            const allowedSegments = manifest.series[observation.seriesId].missingness.fallbackZeroSegments;
            if (observation.value !== 0 || !yearInSegments(observation.sourceYear, allowedSegments)) {
                contractError('HISTORICAL_FALLBACK_ZERO_NOT_MANIFESTED', `${path} uses fallback_zero outside a manifested segment`, {
                    year: record.year,
                    path,
                    seriesId: observation.seriesId,
                    sourceYear: observation.sourceYear
                });
            }
        }
    }
    const equityInputs = record.realized.equityReturn.inputs;
    if (!equityInputs
        || !Number.isFinite(equityInputs.previousIndexLevel)
        || !Number.isFinite(equityInputs.currentIndexLevel)
        || equityInputs.previousIndexLevel <= 0
        || equityInputs.currentIndexLevel <= 0) {
        contractError('HISTORICAL_INDEX_LEVEL_INVALID', 'HistoricalYearRecord equity index levels must be finite and greater than zero', {
            year: record.year
        });
    }
    if (record.decisionAsOf.capeRatio.value <= 0) {
        contractError('HISTORICAL_INDEX_LEVEL_INVALID', 'HistoricalYearRecord CAPE ratio must be greater than zero', {
            year: record.year,
            seriesId: 'cape'
        });
    }
    return record;
}

function validateHistoricalDataset(records, manifest, computedHash) {
    if (computedHash !== manifest.contentHash.value) {
        contractError('HISTORICAL_DATA_HASH_MISMATCH', 'Historical dataset does not match the manifested content hash', {
            expectedHash: manifest.contentHash.value,
            actualHash: computedHash,
            revision: manifest.revision
        });
    }
    const years = extractHistoricalYears(records);
    if (years.length === 0) {
        contractError('HISTORICAL_DATASET_INVALID', 'Historical dataset must not be empty');
    }
    if (years[0] !== manifest.period.startYear || years[years.length - 1] !== manifest.period.endYear) {
        contractError('HISTORICAL_DATASET_INVALID', 'Historical dataset boundary years do not match the manifest', {
            actualStartYear: years[0],
            actualEndYear: years[years.length - 1],
            expectedPeriod: manifest.period
        });
    }
    const rawLookup = new Map();
    for (const year of years) {
        const record = records[String(year)];
        validateRawHistoricalRecord(record, year);
        rawLookup.set(year, record);
    }
    return { years, rawLookup };
}

function buildValidatedRecordLookup(dataset, manifest) {
    const lookup = Object.create(null);
    const recordYears = [];
    for (const year of dataset.years) {
        const previous = dataset.rawLookup.get(year - 1);
        const current = dataset.rawLookup.get(year);
        if (!previous || !current) continue;
        const record = buildHistoricalYearRecord({ year, previous, current, manifest });
        lookup[year] = record;
        recordYears.push(year);
    }
    return {
        lookup: Object.freeze(lookup),
        recordYears: Object.freeze(recordYears)
    };
}

function createIncomplete(period, code, details = {}) {
    return deepFreeze({
        status: 'incomplete',
        period: { ...period },
        reason: { code, ...details }
    });
}

function preflightPeriod(periodInput, context) {
    const period = validatePeriodShape(periodInput, 'period');
    if (period.startYear < context.bounds.startYear || period.endYear > context.bounds.endYear) {
        return createIncomplete(period, 'period_out_of_bounds', { bounds: context.bounds });
    }
    for (let year = period.startYear - context.lookbackYears; year <= period.endYear; year++) {
        if (!context.rawYears.has(year)) {
            return createIncomplete(period, 'missing_historical_year', {
                year,
                phase: year < period.startYear ? 'lookback' : 'requested_period'
            });
        }
    }
    const records = [];
    for (let year = period.startYear; year <= period.endYear; year++) {
        const record = context.recordLookup[year];
        if (!record) {
            return createIncomplete(period, 'missing_historical_year_record', { year });
        }
        validateHistoricalYearRecord(record, context.manifest);
        records.push(record);
    }
    return deepFreeze({
        status: 'complete',
        period,
        requestedYears: period.endYear - period.startYear + 1,
        lookbackYears: context.lookbackYears,
        records
    });
}

function notifyInstrumentation(instrumentation, method, payload) {
    if (typeof instrumentation?.[method] === 'function') instrumentation[method](payload);
}

export function createHistoricalBacktestContractProvider({
    records = HISTORICAL_DATA,
    manifest = HISTORICAL_DATA_MANIFEST,
    instrumentation = null
} = {}) {
    validateHistoricalDataManifest(manifest);
    const manifestSnapshot = deepFreeze(cloneContractValue(manifest));
    const computedHash = computeHistoricalDatasetHash(records);
    if (computedHash !== manifestSnapshot.contentHash.value) {
        contractError('HISTORICAL_DATA_HASH_MISMATCH', 'Historical dataset does not match the manifested content hash', {
            expectedHash: manifestSnapshot.contentHash.value,
            actualHash: computedHash,
            revision: manifestSnapshot.revision
        });
    }
    const manifestHash = sha256Hex(canonicalizeHistoricalContractValue(manifestSnapshot));
    const cacheKey = `${manifestSnapshot.datasetId}:${manifestSnapshot.revision}:${computedHash}:${manifestHash}`;
    if (providerCache.has(cacheKey)) {
        notifyInstrumentation(instrumentation, 'onCacheHit', {
            cacheKey,
            revision: manifestSnapshot.revision,
            contentHash: computedHash
        });
        return providerCache.get(cacheKey);
    }

    notifyInstrumentation(instrumentation, 'onDatasetValidation', {
        cacheKey,
        revision: manifestSnapshot.revision,
        contentHash: computedHash
    });
    const dataset = validateHistoricalDataset(records, manifestSnapshot, computedHash);
    const validated = buildValidatedRecordLookup(dataset, manifestSnapshot);
    const lookbackYears = manifestSnapshot.lookback.backtestYears;
    const bounds = deepFreeze({
        startYear: manifestSnapshot.period.startYear + lookbackYears,
        endYear: manifestSnapshot.period.endYear,
        datasetStartYear: manifestSnapshot.period.startYear,
        datasetEndYear: manifestSnapshot.period.endYear,
        lookbackYears
    });
    const context = {
        manifest: manifestSnapshot,
        bounds,
        lookbackYears,
        rawYears: new Set(dataset.years),
        recordLookup: validated.lookup
    };

    const provider = Object.freeze({
        schemaVersion: 'HistoricalBacktestContractProviderV1',
        datasetId: manifestSnapshot.datasetId,
        revision: manifestSnapshot.revision,
        contentHash: computedHash,
        manifest: manifestSnapshot,
        bounds,
        getYears: () => validated.recordYears,
        getRecord: year => (Number.isInteger(Number(year)) ? validated.lookup[Number(year)] : undefined),
        preparePeriod(period, options = {}) {
            notifyInstrumentation(options.instrumentation, 'onPeriodPreflight', {
                mode: 'single_path',
                periods: [{ ...period }]
            });
            return preflightPeriod(period, context);
        },
        prepareBatch(periods, options = {}) {
            if (!Array.isArray(periods) || periods.length === 0) {
                contractError('HISTORICAL_PERIOD_INVALID', 'Cohort batch requires at least one period');
            }
            notifyInstrumentation(options.instrumentation, 'onPeriodPreflight', {
                mode: 'cohort_batch',
                periods: periods.map(period => ({ ...period }))
            });
            const prepared = [];
            for (let index = 0; index < periods.length; index++) {
                const result = preflightPeriod(periods[index], context);
                if (result.status !== 'complete') {
                    return deepFreeze({
                        status: 'incomplete',
                        batchIndex: index,
                        period: result.period,
                        reason: result.reason
                    });
                }
                prepared.push(result);
            }
            return deepFreeze({ status: 'complete', periods: prepared });
        }
    });
    providerCache.set(cacheKey, provider);
    return provider;
}

export const HISTORICAL_ASSIGNMENT_INVENTORY_V1 = deepFreeze({
    legacyBacktest: {
        equityReturn: 'index_level_t / index_level_t_minus_1 - 1',
        goldReturn: 't_minus_1',
        cashBondReturn: 't_minus_1',
        inflation: 't_minus_1',
        wagePensionAdjustment: 't_via_series_offset',
        capeRatio: 't_minus_1'
    },
    activeMonteCarloAnnualData: {
        equityReturn: 'index_level_t / index_level_t_minus_1 - 1',
        goldReturn: 't',
        cashBondReturn: 't',
        inflation: 't',
        wagePensionAdjustment: 't',
        capeRatio: 't'
    },
    alternativePrepareHistoricalData: {
        equityReturn: 'index_level_t / index_level_t_minus_1 - 1',
        goldReturn: 't_minus_1',
        cashBondReturn: 't_minus_1',
        inflation: 't_minus_1',
        wagePensionAdjustment: 't_minus_1',
        capeRatio: 'not_mapped'
    },
    historicalYearRecordV1Proposal: {
        equityReturn: 'index_level_t / index_level_t_minus_1 - 1',
        goldReturn: 't',
        cashBondReturn: 't',
        inflation: 't',
        wagePensionAdjustment: 't',
        capeRatio: 't_minus_1_decision_as_of'
    }
});
