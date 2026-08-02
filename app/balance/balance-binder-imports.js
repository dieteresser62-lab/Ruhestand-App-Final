/**
 * Module: Balance Binder Imports
 * Purpose: Manages Data Import/Export functionality.
 *          It handles JSON state export/import and CSV market data import (parsing legacy CSV formats).
 * Usage: Used by balance-binder.js to handle file inputs and export buttons.
 * Dependencies: balance-config.js, balance-reader.js, balance-renderer.js, balance-storage.js
 */
import { CONFIG, AppError, StorageError } from './balance-config.js';
import { UIReader } from './balance-reader.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';
import { UIUtils } from './balance-utils.js';
import { BALANCE_UPDATE_MODE } from './balance-update-pipeline.js';
import {
    ANNUAL_MARKET_DATA_META_KEY,
    ANNUAL_MARKET_DATA_SCHEMA_VERSION
} from './balance-annual-marketdata.js';
import {
    createAnnualPeriodId,
    deriveCompletedCalendarYear
} from './balance-annual-period.js';
import { normalizeTrancheCollection } from '../../types/tranche-contract.js';
import { isValidCumulativeInflationFactor } from '../../types/cumulative-inflation-contract.js';
import {
    LIQUIDITY_RUNWAY_CONTRACT_V1,
    migrateLiquidityRunwayInput
} from '../../types/liquidity-runway-contract.js';

export const BALANCE_EXPORT_APP_ID = 'ruhe-stand-suite.balance';
export const BALANCE_EXPORT_SCHEMA = 'balance-state';
export const BALANCE_EXPORT_SCHEMA_VERSION = 2;
export const BALANCE_IMPORT_INPUT_SCHEMA_VERSION = 2;
export const MANUAL_WINDOW_HIGH_ENGINE_POLICY = 'window_high_as_conservative_ath_lower_bound';

const numberField = (options = {}) => Object.freeze({
    type: 'number',
    required: false,
    integer: false,
    min: null,
    max: null,
    ...options
});

const booleanField = (options = {}) => Object.freeze({
    type: 'boolean',
    required: false,
    ...options
});

const stringField = (options = {}) => Object.freeze({
    type: 'string',
    required: false,
    maxLength: 200,
    ...options
});

/**
 * Versioniertes Inventar aller Top-Level-Felder, die der Balance-Reader
 * persistiert und ein Balance-JSON-Import wieder in den Live-Inputpfad
 * uebernehmen darf. Komplexe Felder besitzen benannte Spezialvalidatoren.
 */
export const BALANCE_IMPORT_INPUT_SCHEMA_V2 = Object.freeze({
    aktuellesAlter: numberField({ required: true, integer: true, min: 0, max: 130 }),
    floorBedarf: numberField({ required: true, min: 0 }),
    flexBedarf: numberField({ required: true, min: 0 }),
    minimumFlexAnnual: numberField({ min: 0 }),
    flexBudgetAnnual: numberField({ min: 0 }),
    flexBudgetYears: numberField({ min: 0, max: 10 }),
    flexBudgetRecharge: numberField({ min: 0 }),
    inflation: numberField({ min: -10, max: 50 }),
    tagesgeld: numberField({ min: 0 }),
    geldmarktEtf: numberField({ min: 0 }),
    depotwertAlt: numberField({ min: 0 }),
    depotwertNeu: numberField({ min: 0 }),
    goldWert: numberField({ min: 0 }),
    endeVJ: numberField({ min: 0 }),
    endeVJ_1: numberField({ min: 0 }),
    endeVJ_2: numberField({ min: 0 }),
    endeVJ_3: numberField({ min: 0 }),
    ath: numberField({ min: 0 }),
    jahreSeitAth: numberField({ min: 0 }),
    renteAktiv: booleanField(),
    renteMonatlich: numberField({ min: 0 }),
    risikoprofil: stringField({ enum: Object.freeze(['sicherheits-dynamisch']) }),
    goldAktiv: booleanField(),
    goldZielProzent: numberField({ min: 0, max: 50 }),
    goldFloorProzent: numberField({ min: 0, max: 20 }),
    goldSteuerfrei: booleanField(),
    rebalancingBand: numberField({ min: 0, max: 100 }),
    goldBasisVermoegen: numberField({ min: 0 }),
    goldZielBetrag: numberField({ min: 0 }),
    goldFloorBetrag: numberField({ min: 0 }),
    goldStrategyDiagnostics: Object.freeze({ type: 'goldStrategyDiagnostics', required: false }),
    costBasisAlt: numberField({ min: 0 }),
    costBasisNeu: numberField({ min: 0 }),
    tqfAlt: numberField({ min: 0, max: 1 }),
    tqfNeu: numberField({ min: 0, max: 1 }),
    goldCost: numberField({ min: 0 }),
    kirchensteuerSatz: numberField({ min: 0, max: 0.09, enum: Object.freeze([0, 0.08, 0.09]) }),
    sparerPauschbetrag: numberField({ min: 0 }),
    liquidityRunwayYears: numberField({
        min: LIQUIDITY_RUNWAY_CONTRACT_V1.minimumYears,
        max: LIQUIDITY_RUNWAY_CONTRACT_V1.maximumYears,
        step: LIQUIDITY_RUNWAY_CONTRACT_V1.stepYears
    }),
    minCashBufferMonths: numberField({ integer: true, min: 0, max: 12 }),
    maxSkimPctOfEq: numberField({ min: 0, max: 50 }),
    maxBearRefillPctOfEq: numberField({ min: 0, max: 70 }),
    marketCapeRatio: numberField({ min: 0, max: 100 }),
    capeRatio: numberField({ min: 0, max: 100 }),
    dynamicFlex: booleanField(),
    horizonMethod: stringField({ enum: Object.freeze(['mean', 'survival_quantile']) }),
    horizonYears: numberField({ integer: true, min: 1, max: 60 }),
    survivalQuantile: numberField({ min: 0.5, max: 0.99 }),
    goGoActive: booleanField(),
    goGoMultiplier: numberField({ min: 1, max: 1.5 }),
    longevityMode: stringField({
        enum: Object.freeze(['none', 'quantile_shift', 'relative_horizon_buffer', 'buffer_years'])
    }),
    longevityQuantileShift: numberField({ min: 0, max: 0.1 }),
    longevityRelativePct: numberField({ min: 0, max: 0.2 }),
    longevityBufferYears: numberField({ integer: true, min: 0, max: 10 }),
    healthBucketEnabled: booleanField(),
    healthBucketInitialAmount: numberField({ min: 0 }),
    healthBucketAssetSource: stringField({
        enum: Object.freeze(['money_market_first_then_cash'])
    }),
    healthBucketTriggerMinGrade: numberField({ integer: true, min: 1, max: 5 }),
    healthBucketTriggerMode: stringField({ enum: Object.freeze(['OR', 'AND']) }),
    healthBucketCoverageMode: stringField({
        enum: Object.freeze(['care_additional_floor_only', 'floor_when_care_active'])
    }),
    healthBucketReturnMode: stringField({ enum: Object.freeze(['cash_return']) }),
    healthBucketTargetMode: stringField({
        enum: Object.freeze(['inflation_indexed_diagnostic', 'nominal_fixed'])
    }),
    profilName: stringField({ maxLength: 200 }),
    depotLastUpdate: numberField({ integer: true, min: 0 }),
    decumulation: Object.freeze({ type: 'decumulation', required: false }),
    healthBucket: Object.freeze({ type: 'healthBucket', required: false }),
    detailledTranches: Object.freeze({ type: 'tranchesOrNull', required: false })
});

const LEGACY_BOOLEAN_INPUT_FIELDS = Object.freeze([
    'renteAktiv',
    'goldAktiv',
    'goldSteuerfrei',
    'dynamicFlex',
    'goGoActive',
    'healthBucketEnabled'
]);

const HEALTH_BUCKET_FIELDS = Object.freeze({
    enabled: booleanField(),
    initialAmount: numberField({ min: 0 }),
    assetSource: stringField({ enum: Object.freeze(['money_market_first_then_cash']) }),
    triggerMinGrade: numberField({ integer: true, min: 1, max: 5 }),
    triggerMode: stringField({ enum: Object.freeze(['OR', 'AND']) }),
    coverageMode: stringField({
        enum: Object.freeze(['care_additional_floor_only', 'floor_when_care_active'])
    }),
    returnMode: stringField({ enum: Object.freeze(['cash_return']) }),
    targetMode: stringField({
        enum: Object.freeze(['inflation_indexed_diagnostic', 'nominal_fixed'])
    })
});

const DECUMULATION_FIELDS = Object.freeze({
    mode: stringField({ enum: Object.freeze(['standard', '3_bucket_jilge']) }),
    bondTargetFactor: numberField({ min: 0 }),
    drawdownTrigger: numberField({ min: -100, max: 100 }),
    bondRefillThreshold: Object.freeze({ type: 'nullableNumber', min: -100, max: 100 }),
    threeBucket: Object.freeze({ type: 'decumulationNested', required: false })
});

const GOLD_STRATEGY_DIAGNOSTIC_FIELDS = Object.freeze({
    profileId: stringField({ required: true }),
    name: stringField({ required: true }),
    assetBase: numberField({ required: true, min: 0 }),
    operativeLiquidity: numberField({ required: true, min: 0 }),
    excludedHealthBucket: numberField({ required: true, min: 0 }),
    freeAssetBase: numberField({ required: true, min: 0 }),
    goldAktiv: booleanField({ required: true }),
    goldZielProzent: numberField({ required: true, min: 0 }),
    goldFloorProzent: numberField({ required: true, min: 0 }),
    goldZielBetrag: numberField({ required: true, min: 0 }),
    goldFloorBetrag: numberField({ required: true, min: 0 }),
    rebalancingBand: numberField({ required: true, min: 0 }),
    goldSteuerfrei: booleanField({ required: true })
});

const SUPPORTED_LEGACY_APP_VERSIONS = new Set([
    'v21.1 Refactored (Engine v31)',
    'v22.0 ES6 Modules (Engine v31)'
]);

function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function isRecord(value) {
    return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function cloneJson(value) {
    return JSON.parse(JSON.stringify(value));
}

function validateSchemaField(fieldPath, value, descriptor) {
    if (descriptor.type === 'number' || descriptor.type === 'nullableNumber') {
        if (value === null && descriptor.type === 'nullableNumber') return;
        if (typeof value !== 'number' || !Number.isFinite(value)) {
            failImport('invalid_input_type', `Das Importfeld „${fieldPath}“ muss eine endliche Zahl sein.`);
        }
        if (descriptor.integer && !Number.isInteger(value)) {
            failImport('invalid_input_type', `Das Importfeld „${fieldPath}“ muss eine ganze Zahl sein.`);
        }
        if (descriptor.min !== null && descriptor.min !== undefined && value < descriptor.min) {
            failImport('invalid_input_bounds', `Das Importfeld „${fieldPath}“ unterschreitet die erlaubte Untergrenze ${descriptor.min}.`);
        }
        if (descriptor.max !== null && descriptor.max !== undefined && value > descriptor.max) {
            failImport('invalid_input_bounds', `Das Importfeld „${fieldPath}“ überschreitet die erlaubte Obergrenze ${descriptor.max}.`);
        }
        if (descriptor.step) {
            const stepBase = descriptor.min ?? 0;
            const steps = (value - stepBase) / descriptor.step;
            if (Math.abs(steps - Math.round(steps)) >= 1e-9) {
                failImport(
                    'invalid_input_bounds',
                    `Das Importfeld „${fieldPath}“ muss ein Vielfaches von ${descriptor.step} ab ${stepBase} sein.`
                );
            }
        }
        if (descriptor.enum && !descriptor.enum.includes(value)) {
            failImport('invalid_input_value', `Das Importfeld „${fieldPath}“ enthält einen nicht unterstützten Zahlenwert.`);
        }
        return;
    }
    if (descriptor.type === 'boolean') {
        if (typeof value !== 'boolean') {
            failImport('invalid_boolean', `Das Importfeld „${fieldPath}“ muss ein echter Boolean sein.`);
        }
        return;
    }
    if (descriptor.type === 'string') {
        if (typeof value !== 'string' || value.length > descriptor.maxLength) {
            failImport('invalid_input_type', `Das Importfeld „${fieldPath}“ muss ein zulässiger Text sein.`);
        }
        if (descriptor.enum && !descriptor.enum.includes(value)) {
            failImport('invalid_input_value', `Das Importfeld „${fieldPath}“ enthält einen nicht unterstützten Wert.`);
        }
        return;
    }
    if (descriptor.type === 'decumulationNested') {
        if (!isRecord(value)) {
            failImport('invalid_input_type', `Das Importfeld „${fieldPath}“ muss ein Objekt sein.`);
        }
        return;
    }
    failImport('invalid_input_schema', `Für das Importfeld „${fieldPath}“ fehlt ein unterstützter Feldvertrag.`);
}

function validateRecordAgainstSchema(record, schema, pathPrefix) {
    if (!isRecord(record)) {
        failImport('invalid_input_type', `Der Importbereich „${pathPrefix}“ muss ein Objekt sein.`);
    }
    const unknownFields = Object.keys(record).filter(field => !hasOwn(schema, field));
    if (unknownFields.length > 0) {
        failImport(
            'unknown_input_field',
            `Der Importbereich „${pathPrefix}“ enthält nicht unterstützte Felder: ${unknownFields.join(', ')}.`
        );
    }
    Object.entries(schema).forEach(([field, descriptor]) => {
        if (!hasOwn(record, field)) {
            if (descriptor.required) {
                failImport('missing_input_field', `Das Pflichtfeld „${pathPrefix}.${field}“ fehlt.`);
            }
            return;
        }
        validateSchemaField(`${pathPrefix}.${field}`, record[field], descriptor);
    });
}

function validateDecumulation(value, path = 'inputs.decumulation') {
    validateRecordAgainstSchema(value, DECUMULATION_FIELDS, path);
    if (hasOwn(value, 'threeBucket')) {
        const nested = value.threeBucket;
        if (!isRecord(nested)) {
            failImport('invalid_input_type', `Das Importfeld „${path}.threeBucket“ muss ein Objekt sein.`);
        }
        const nestedSchema = {
            bondTargetFactor: DECUMULATION_FIELDS.bondTargetFactor,
            drawdownTrigger: DECUMULATION_FIELDS.drawdownTrigger,
            bondRefillThreshold: DECUMULATION_FIELDS.bondRefillThreshold
        };
        validateRecordAgainstSchema(nested, nestedSchema, `${path}.threeBucket`);
    }
}

function validateHealthBucket(value, path = 'inputs.healthBucket') {
    validateRecordAgainstSchema(value, HEALTH_BUCKET_FIELDS, path);
}

function validateTranchesOrNull(value, path = 'inputs.detailledTranches') {
    if (value === null) return;
    if (!Array.isArray(value)) {
        failImport('invalid_input_type', `Das Importfeld „${path}“ muss ein Array oder null sein.`);
    }
    try {
        normalizeTrancheCollection(value, { mode: 'engine' });
    } catch {
        failImport(
            'invalid_input_value',
            `Das Importfeld „${path}“ verletzt den kanonischen Tranchenvertrag.`
        );
    }
}

function validateGoldStrategyDiagnostics(value, path = 'inputs.goldStrategyDiagnostics') {
    if (!Array.isArray(value)) {
        failImport('invalid_input_type', `Das Importfeld „${path}“ muss ein Array sein.`);
    }
    value.forEach((entry, index) => {
        validateRecordAgainstSchema(entry, GOLD_STRATEGY_DIAGNOSTIC_FIELDS, `${path}[${index}]`);
        if (entry.operativeLiquidity > entry.assetBase) {
            failImport(
                'invalid_core_value',
                `Das Feld „${path}[${index}].operativeLiquidity“ darf die Vermögensbasis nicht überschreiten.`
            );
        }
        if (entry.excludedHealthBucket > entry.operativeLiquidity) {
            failImport(
                'invalid_core_value',
                `Das Feld „${path}[${index}].excludedHealthBucket“ darf die operative Liquidität nicht überschreiten.`
            );
        }
        if (entry.freeAssetBase !== entry.assetBase - entry.excludedHealthBucket) {
            failImport(
                'invalid_core_value',
                `Die freie Vermögensbasis in „${path}[${index}]“ ist inkonsistent.`
            );
        }
    });
}

function validateBalanceInputsAgainstSchema(inputs) {
    if (!isRecord(inputs)) {
        failImport('invalid_inputs', 'Der Pflichtbereich „inputs“ fehlt oder ist ungültig. Bitte eine vollständige Balance-Exportdatei auswählen.');
    }
    const unknownFields = Object.keys(inputs).filter(field => !hasOwn(BALANCE_IMPORT_INPUT_SCHEMA_V2, field));
    if (unknownFields.length > 0) {
        failImport(
            'unknown_input_field',
            `Der Balance-Import enthält nicht unterstützte Eingabefelder: ${unknownFields.join(', ')}.`
        );
    }

    Object.entries(BALANCE_IMPORT_INPUT_SCHEMA_V2).forEach(([field, descriptor]) => {
        if (!hasOwn(inputs, field)) {
            if (descriptor.required) {
                failImport('missing_input_field', `Das Pflichtfeld „inputs.${field}“ fehlt.`);
            }
            return;
        }
        const value = inputs[field];
        if (descriptor.type === 'decumulation') {
            validateDecumulation(value);
        } else if (descriptor.type === 'healthBucket') {
            validateHealthBucket(value);
        } else if (descriptor.type === 'tranchesOrNull') {
            validateTranchesOrNull(value);
        } else if (descriptor.type === 'goldStrategyDiagnostics') {
            validateGoldStrategyDiagnostics(value);
        } else {
            validateSchemaField(`inputs.${field}`, value, descriptor);
        }
    });

    if (
        Number.isFinite(inputs.minimumFlexAnnual) &&
        Number.isFinite(inputs.flexBedarf) &&
        inputs.minimumFlexAnnual > inputs.flexBedarf
    ) {
        failImport('invalid_core_value', 'Das Feld „minimumFlexAnnual“ darf den Flex-Bedarf nicht überschreiten. Bitte die Importdatei prüfen.');
    }
    if (
        Number.isFinite(inputs.capeRatio) &&
        Number.isFinite(inputs.marketCapeRatio) &&
        inputs.capeRatio !== inputs.marketCapeRatio
    ) {
        failImport('invalid_core_value', 'Die CAPE-Aliasfelder des Imports widersprechen sich.');
    }
    if (isRecord(inputs.healthBucket)) {
        const mirroredFields = {
            enabled: 'healthBucketEnabled',
            initialAmount: 'healthBucketInitialAmount',
            assetSource: 'healthBucketAssetSource',
            triggerMinGrade: 'healthBucketTriggerMinGrade',
            triggerMode: 'healthBucketTriggerMode',
            coverageMode: 'healthBucketCoverageMode',
            returnMode: 'healthBucketReturnMode',
            targetMode: 'healthBucketTargetMode'
        };
        Object.entries(mirroredFields).forEach(([nestedField, flatField]) => {
            if (
                hasOwn(inputs.healthBucket, nestedField) &&
                hasOwn(inputs, flatField) &&
                inputs.healthBucket[nestedField] !== inputs[flatField]
            ) {
                failImport('invalid_core_value', `Die Pflegebucket-Felder „healthBucket.${nestedField}“ und „${flatField}“ widersprechen sich.`);
            }
        });
    }
}

function parseIsoDateOnly(value) {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const date = new Date(`${value}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return null;
    return date;
}

function isValidManualCoverage(coverage, targetYear, asOf) {
    if (!isRecord(coverage)) return false;
    const start = parseIsoDateOnly(coverage.start);
    const end = parseIsoDateOnly(coverage.end);
    if (
        !start ||
        !end ||
        start.getTime() > end.getTime() ||
        coverage.end !== asOf ||
        !Number.isInteger(coverage.rowCount) ||
        coverage.rowCount < 4 ||
        !Array.isArray(coverage.calendarYears)
    ) {
        return false;
    }
    const years = coverage.calendarYears;
    if (
        years.length < 4 ||
        years.some((year, index) => (
            !Number.isInteger(year) ||
            year < 1900 ||
            year > 9999 ||
            (index > 0 && year <= years[index - 1])
        ))
    ) {
        return false;
    }
    return [targetYear - 3, targetYear - 2, targetYear - 1, targetYear]
        .every(year => years.includes(year));
}

function buildManualWindowHighEngineReference(price, high) {
    const applied = (
        typeof price === 'number' &&
        Number.isFinite(price) &&
        typeof high?.value === 'number' &&
        Number.isFinite(high.value) &&
        high.value > price
    );
    return {
        policy: MANUAL_WINDOW_HIGH_ENGINE_POLICY,
        sourceScope: 'windowHigh',
        applied,
        value: applied ? high.value : null,
        yearsSince: applied ? high.yearsSince : null
    };
}

function validateAnnualMarketDataMeta(meta) {
    if (meta === undefined) return;
    if (!isRecord(meta) || meta.schemaVersion !== ANNUAL_MARKET_DATA_SCHEMA_VERSION) {
        failImport('invalid_market_provenance', 'Die Marktdaten-Provenienz besitzt kein unterstütztes Schema.');
    }
    const periodId = createAnnualPeriodId(meta.targetYear);
    if (!periodId || meta.periodId !== periodId) {
        failImport('invalid_market_provenance', 'Zieljahr und Perioden-ID der Marktdaten-Provenienz widersprechen sich.');
    }
    const asOf = parseIsoDateOnly(meta.asOf);
    if (!asOf || asOf.getUTCFullYear() !== meta.targetYear) {
        failImport('invalid_market_provenance', 'Der Marktdaten-Stichtag passt nicht zur Zielperiode.');
    }
    if (
        typeof meta.price !== 'number' ||
        !Number.isFinite(meta.price) ||
        meta.price < 0 ||
        typeof meta.source !== 'string' ||
        meta.source.trim() === '' ||
        typeof (meta.instrument || meta.ticker) !== 'string' ||
        String(meta.instrument || meta.ticker).trim() === ''
    ) {
        failImport('invalid_market_provenance', 'Preis, Quelle oder Instrument der Marktdaten-Provenienz sind ungültig.');
    }
    if (meta.sourceType === 'manual_csv') {
        const expectedEngineReference = buildManualWindowHighEngineReference(meta.price, meta.high);
        if (
            meta.acquisitionMode !== 'manual_csv' ||
            !['current', 'historical'].includes(meta.periodMode) ||
            typeof meta.sourceFileName !== 'string' ||
            meta.sourceFileName.trim() === ''
        ) {
            failImport('invalid_market_provenance', 'Modus oder Quelle der CSV-Provenienz ist ungültig.');
        }
        if (!isValidManualCoverage(meta.coverage, meta.targetYear, meta.asOf)) {
            failImport('invalid_market_provenance', 'Die CSV-Periodenabdeckung ist ungültig.');
        }
        if (
            meta.highScope !== 'windowHigh' ||
            meta.high?.scope !== 'windowHigh' ||
            meta.high?.verifiedAllTimeHighAvailable !== false ||
            typeof meta.high?.value !== 'number' ||
            !Number.isFinite(meta.high.value) ||
            meta.high.value <= 0 ||
            !parseIsoDateOnly(meta.high?.asOf) ||
            meta.high.asOf < meta.coverage.start ||
            meta.high.asOf > meta.coverage.end ||
            !Number.isInteger(meta.high?.yearsSince) ||
            meta.high.yearsSince < 0 ||
            meta.ath?.value !== null ||
            meta.ath?.yearsSince !== null ||
            meta.ath?.evaluatedAsOf !== meta.asOf ||
            meta.ath?.lastHighAsOf !== null ||
            meta.ath?.scope !== 'unavailable_manual_window' ||
            meta.ath?.engineAvailable !== false ||
            meta.engineReference?.policy !== MANUAL_WINDOW_HIGH_ENGINE_POLICY ||
            meta.engineReference?.sourceScope !== 'windowHigh' ||
            meta.engineReference?.applied !== expectedEngineReference.applied ||
            meta.engineReference?.value !== expectedEngineReference.value ||
            meta.engineReference?.yearsSince !== expectedEngineReference.yearsSince
        ) {
            failImport(
                'invalid_market_provenance',
                'Eine manuelle CSV darf ohne Vollhistoriennachweis nur windowHigh als konservative ATH-Untergrenze verwenden.'
            );
        }
        if (typeof meta.importedAt !== 'string' || !Number.isFinite(Date.parse(meta.importedAt))) {
            failImport('invalid_market_provenance', 'Der CSV-Importzeitpunkt ist ungültig.');
        }
    }
}

function migrateLegacyBoolean(value, fieldPath) {
    if (typeof value === 'boolean') return value;
    if (typeof value !== 'string' && typeof value !== 'number') {
        failImport('invalid_legacy_boolean', `Das Legacy-Booleanfeld „${fieldPath}“ ist ungültig.`);
    }
    const normalized = String(value).trim().toLocaleLowerCase('de-DE');
    if (['true', '1', 'yes', 'ja', 'on'].includes(normalized)) return true;
    if (['false', '0', 'no', 'nein', 'off'].includes(normalized)) return false;
    failImport('invalid_legacy_boolean', `Das Legacy-Booleanfeld „${fieldPath}“ enthält keinen unterstützten Wert.`);
}

export class BalanceImportError extends AppError {
    constructor(code, message) {
        super(message);
        this.name = 'BalanceImportError';
        this.code = code;
    }
}

function failImport(code, message) {
    throw new BalanceImportError(code, message);
}

export class MarketCsvImportError extends AppError {
    constructor(code, message, details = {}) {
        super(message, details);
        this.name = 'MarketCsvImportError';
        this.code = code;
        this.details = details;
    }
}

function failMarketCsv(code, message, details = {}) {
    throw new MarketCsvImportError(code, message, details);
}

function splitMarketCsvLine(line) {
    const cells = [];
    let current = '';
    let inQuotes = false;
    for (let index = 0; index < line.length; index++) {
        const char = line[index];
        if (char === '"') {
            if (inQuotes && line[index + 1] === '"') {
                current += '"';
                index += 1;
            } else {
                inQuotes = !inQuotes;
            }
        } else if (char === ';' && !inQuotes) {
            cells.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    if (inQuotes) {
        failMarketCsv('market_csv_unclosed_quote', 'Die Markt-CSV enthaelt ein nicht geschlossenes Anfuehrungszeichen.');
    }
    cells.push(current.trim());
    return cells;
}

function normalizeMarketHeader(value) {
    return String(value || '')
        .replace(/^\uFEFF/, '')
        .trim()
        .toLocaleLowerCase('de-DE')
        .replace(/[^a-z0-9äöüß]/g, '');
}

function parseMarketDate(rawValue) {
    const match = /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/.exec(String(rawValue || '').trim());
    if (!match) return null;
    const day = Number(match[1]);
    const month = Number(match[2]);
    const year = Number(match[3]);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year ||
        date.getUTCMonth() !== month - 1 ||
        date.getUTCDate() !== day
    ) {
        return null;
    }
    return date;
}

/**
 * Parst eine semikolonseparierte Markt-CSV ohne DOM-Seiteneffekte.
 * Fuer den letzten Datenstand muessen Vergleichswerte aus jedem der drei
 * vorangegangenen Kalenderjahre am oder vor dem jeweiligen Stichtag existieren.
 */
export function parseMarketDataCsv(text) {
    const lines = String(text || '')
        .split(/\r?\n/)
        .map((line, index) => ({ line: line.trim(), lineNumber: index + 1 }))
        .filter(entry => entry.line !== '');
    if (lines.length < 2) {
        failMarketCsv('market_csv_empty', 'Die Markt-CSV enthaelt keine Datenzeilen.');
    }

    const header = splitMarketCsvLine(lines[0].line).map(normalizeMarketHeader);
    const dateHeaders = new Set(['datum', 'date']);
    const closeHeaders = new Set(['schluss', 'schlusskurs', 'close', 'zuletzt']);
    const dateIndex = header.findIndex(value => dateHeaders.has(value));
    const closeIndex = header.findIndex(value => closeHeaders.has(value));
    const missingHeaders = [];
    if (dateIndex === -1) missingHeaders.push('Datum/Date');
    if (closeIndex === -1) missingHeaders.push('Schluss/Close');
    if (missingHeaders.length > 0) {
        failMarketCsv(
            'market_csv_missing_headers',
            `Der Markt-CSV fehlen Pflichtspalten: ${missingHeaders.join(', ')}.`,
            { missingHeaders }
        );
    }

    const data = [];
    const rejectedRows = [];
    const seenDates = new Set();
    lines.slice(1).forEach(({ line, lineNumber }) => {
        let columns;
        try {
            columns = splitMarketCsvLine(line);
        } catch (error) {
            rejectedRows.push({ lineNumber, reason: error.message });
            return;
        }
        if (columns.length !== header.length) {
            rejectedRows.push({ lineNumber, reason: `Spaltenanzahl ${columns.length} statt ${header.length}` });
            return;
        }

        const date = parseMarketDate(columns[dateIndex]);
        if (!date) {
            rejectedRows.push({ lineNumber, reason: `ungueltiges Kalenderdatum „${columns[dateIndex] || ''}“` });
            return;
        }
        const closeResult = UIUtils.parseCurrencyResult(columns[closeIndex]);
        if (!closeResult.valid) {
            rejectedRows.push({ lineNumber, reason: `ungueltiger Schlusswert (${closeResult.error.code})` });
            return;
        }
        const dateKey = date.toISOString().slice(0, 10);
        if (seenDates.has(dateKey)) {
            rejectedRows.push({ lineNumber, reason: `doppeltes Datum ${dateKey}` });
            return;
        }
        seenDates.add(dateKey);
        data.push({ date, close: closeResult.value });
    });

    if (rejectedRows.length > 0) {
        const preview = rejectedRows
            .slice(0, 5)
            .map(row => `Zeile ${row.lineNumber}: ${row.reason}`)
            .join('; ');
        const remainder = rejectedRows.length > 5 ? `; weitere ${rejectedRows.length - 5}` : '';
        failMarketCsv(
            'market_csv_invalid_rows',
            `Die Markt-CSV enthaelt ${rejectedRows.length} ungueltige Datenzeile(n): ${preview}${remainder}.`,
            { rejectedRows }
        );
    }
    if (data.length === 0) {
        failMarketCsv('market_csv_no_valid_rows', 'Die Markt-CSV enthaelt keine gueltigen Datenzeilen.');
    }

    data.sort((left, right) => left.date - right.date);
    const lastEntry = data[data.length - 1];
    const lastDate = lastEntry.date;
    const historicalEntries = [];
    const missingYears = [];
    for (let offset = 1; offset <= 3; offset++) {
        const targetYear = lastDate.getUTCFullYear() - offset;
        const targetMonth = lastDate.getUTCMonth();
        const lastTargetMonthDay = new Date(Date.UTC(targetYear, targetMonth + 1, 0)).getUTCDate();
        const targetDay = Math.min(lastDate.getUTCDate(), lastTargetMonthDay);
        const targetTimestamp = Date.UTC(targetYear, targetMonth, targetDay);
        const match = data
            .filter(entry => entry.date.getUTCFullYear() === targetYear && entry.date.getTime() <= targetTimestamp)
            .at(-1);
        if (!match) missingYears.push(targetYear);
        historicalEntries.push(match || null);
    }
    if (missingYears.length > 0) {
        failMarketCsv(
            'market_csv_missing_years',
            `Der Markt-CSV fehlen Jahreswerte fuer: ${missingYears.join(', ')}.`,
            { missingYears }
        );
    }

    const windowHigh = data.reduce((best, entry) => entry.close > best.close ? entry : best, data[0]);
    const yearsSinceWindowHigh = windowHigh.close > lastEntry.close + 0.01
        ? Math.max(0, Math.floor((lastDate.getTime() - windowHigh.date.getTime()) / (1000 * 60 * 60 * 24 * 365.2425)))
        : 0;
    const coverageYears = [...new Set(data.map(entry => entry.date.getUTCFullYear()))];

    return {
        schemaVersion: 1,
        asOf: lastDate.toISOString().slice(0, 10),
        asOfDate: new Date(lastDate),
        rowCount: data.length,
        coverage: {
            start: data[0].date.toISOString().slice(0, 10),
            end: lastDate.toISOString().slice(0, 10),
            calendarYears: coverageYears,
            rowCount: data.length
        },
        high: {
            scope: 'windowHigh',
            value: windowHigh.close,
            asOf: windowHigh.date.toISOString().slice(0, 10),
            yearsSince: yearsSinceWindowHigh,
            verifiedAllTimeHighAvailable: false
        },
        values: {
            endeVJ: lastEntry.close,
            endeVJ_1: historicalEntries[0].close,
            endeVJ_2: historicalEntries[1].close,
            endeVJ_3: historicalEntries[2].close
        }
    };
}

function migrateLegacyStateV0(payload) {
    const migrated = cloneJson(payload);
    const inputs = migrated.inputs;
    if (isRecord(inputs)) {
        LEGACY_BOOLEAN_INPUT_FIELDS.forEach(field => {
            if (hasOwn(inputs, field)) {
                inputs[field] = migrateLegacyBoolean(inputs[field], `inputs.${field}`);
            }
        });
        if (isRecord(inputs.healthBucket) && hasOwn(inputs.healthBucket, 'enabled')) {
            inputs.healthBucket.enabled = migrateLegacyBoolean(
                inputs.healthBucket.enabled,
                'inputs.healthBucket.enabled'
            );
        }
        const migrateLegacyRefillThreshold = container => {
            if (!isRecord(container) || !hasOwn(container, 'bondRefillThresholdPct')) return;
            if (!hasOwn(container, 'bondRefillThreshold')) {
                container.bondRefillThreshold = container.bondRefillThresholdPct;
            }
            delete container.bondRefillThresholdPct;
        };
        if (isRecord(inputs.decumulation)) {
            migrateLegacyRefillThreshold(inputs.decumulation);
            migrateLegacyRefillThreshold(inputs.decumulation.threeBucket);
        }
        migrated.inputs = migrateBalanceLiquidityRunwayInput(inputs, { dropTargetEq: true });
        delete migrated.inputs.rebalBand;
    }

    if (!isRecord(migrated.lastState)) return migrated;
    const state = migrated.lastState;
    if (!Number.isFinite(state.lastInflationAppliedAtAge)) {
        state.lastInflationAppliedAtAge = 0;
    }
    if (!isRecord(state.taxState)) {
        state.taxState = { lossCarry: 0 };
    } else if (!Number.isFinite(state.taxState.lossCarry) || state.taxState.lossCarry < 0) {
        state.taxState.lossCarry = 0;
    }
    return migrated;
}

function migrateBalanceLiquidityRunwayInput(inputs, options) {
    try {
        return migrateLiquidityRunwayInput(inputs, options);
    } catch (error) {
        if (error instanceof RangeError) {
            failImport(
                'invalid_input_bounds',
                `Das Feld „liquidityRunwayYears“ muss zwischen ${LIQUIDITY_RUNWAY_CONTRACT_V1.minimumYears} und ${LIQUIDITY_RUNWAY_CONTRACT_V1.maximumYears} Jahren liegen und ein Vielfaches von ${LIQUIDITY_RUNWAY_CONTRACT_V1.stepYears} Jahren sein.`
            );
        }
        throw error;
    }
}

function migrateLegacyPercentRate(inputs, field) {
    if (!isRecord(inputs) || !hasOwn(inputs, field)) return;
    const value = inputs[field];
    if (typeof value === 'number' && Number.isFinite(value) && value > 1 && value <= 100) {
        inputs[field] = value / 100;
    }
}

/**
 * Version-1-Exporte wurden nur gegen einen kleinen Kernvertrag validiert.
 * Der benannte Migrator normalisiert deshalb ausschliesslich eindeutig
 * rekonstruierbare Repraesentationen und uebergibt das Ergebnis danach an
 * denselben vollstaendigen Vertrag wie ein aktueller V2-Import.
 */
function migrateBalanceStateV1(payload) {
    if (!isRecord(payload)) {
        failImport('invalid_payload', 'Der Balance-Inhalt ist kein Objekt. Bitte eine unveränderte Balance-Exportdatei auswählen.');
    }
    if (!isRecord(payload.inputs)) {
        failImport('invalid_inputs', 'Der Pflichtbereich „inputs“ fehlt oder ist ungültig. Bitte eine vollständige Balance-Exportdatei auswählen.');
    }

    const migrated = migrateLegacyStateV0(payload);
    const inputs = migrated.inputs;
    migrateLegacyPercentRate(inputs, 'tqfAlt');
    migrateLegacyPercentRate(inputs, 'tqfNeu');

    ['aktuellesAlter', 'floorBedarf', 'flexBedarf'].forEach(field => {
        if (!hasOwn(inputs, field) || typeof inputs[field] !== 'number' || !Number.isFinite(inputs[field])) {
            failImport('invalid_core_value', `Das Pflichtfeld „${field}“ fehlt oder ist keine gültige Zahl.`);
        }
    });
    if (!Number.isInteger(inputs.aktuellesAlter) || inputs.aktuellesAlter < 0 || inputs.aktuellesAlter > 130) {
        failImport('invalid_core_value', 'Das Pflichtfeld „aktuellesAlter“ muss eine ganze Zahl zwischen 0 und 130 sein.');
    }
    [
        'floorBedarf',
        'flexBedarf',
        'minimumFlexAnnual',
        'tagesgeld',
        'geldmarktEtf',
        'depotwertAlt',
        'depotwertNeu',
        'goldWert',
        'costBasisAlt',
        'costBasisNeu',
        'goldCost'
    ].forEach(field => {
        if (!hasOwn(inputs, field)) return;
        if (typeof inputs[field] !== 'number' || !Number.isFinite(inputs[field]) || inputs[field] < 0) {
            failImport('invalid_core_value', `Das Feld „${field}“ muss eine nichtnegative, endliche Zahl sein.`);
        }
    });
    if (
        Number.isFinite(inputs.minimumFlexAnnual) &&
        inputs.minimumFlexAnnual > inputs.flexBedarf
    ) {
        failImport('invalid_core_value', 'Das Feld „minimumFlexAnnual“ darf den Flex-Bedarf nicht überschreiten.');
    }

    const marketMeta = migrated[ANNUAL_MARKET_DATA_META_KEY];
    if (marketMeta?.sourceType === 'manual_csv') {
        if (
            marketMeta.high?.engineAthAvailable === false &&
            !hasOwn(marketMeta.high, 'verifiedAllTimeHighAvailable')
        ) {
            marketMeta.high.verifiedAllTimeHighAvailable = false;
            delete marketMeta.high.engineAthAvailable;
        }
        if (
            marketMeta.high?.scope === 'windowHigh' &&
            Number.isFinite(marketMeta.high.value) &&
            Number.isInteger(marketMeta.high.yearsSince) &&
            marketMeta.high.yearsSince >= 0
        ) {
            marketMeta.engineReference = buildManualWindowHighEngineReference(
                marketMeta.price,
                marketMeta.high
            );
            inputs.ath = marketMeta.engineReference.applied
                ? marketMeta.engineReference.value
                : 0;
            inputs.jahreSeitAth = marketMeta.engineReference.applied
                ? marketMeta.engineReference.yearsSince
                : 0;
        }
        validateAnnualMarketDataMeta(marketMeta);
    }

    return validateBalanceState(migrated);
}

function validateBalanceState(payload) {
    if (!isRecord(payload)) {
        failImport('invalid_payload', 'Der Balance-Inhalt ist kein Objekt. Bitte eine unveränderte Balance-Exportdatei auswählen.');
    }
    if (!isRecord(payload.inputs)) {
        failImport('invalid_inputs', 'Der Pflichtbereich „inputs“ fehlt oder ist ungültig. Bitte eine vollständige Balance-Exportdatei auswählen.');
    }

    const inputs = payload.inputs;
    validateBalanceInputsAgainstSchema(inputs);

    if (hasOwn(payload, 'lastState') && payload.lastState !== null && !isRecord(payload.lastState)) {
        failImport('invalid_last_state', 'Der optionale Bereich „lastState“ ist ungültig. Bitte die Importdatei prüfen.');
    }

    const state = payload.lastState;
    if (isRecord(state) && hasOwn(state, 'cumulativeInflationFactor')) {
        const factor = state.cumulativeInflationFactor;
        if (!isValidCumulativeInflationFactor(factor)) {
            failImport('invalid_last_state', 'Der gespeicherte Inflationsfaktor ist ungültig. Bitte eine intakte Exportdatei verwenden.');
        }
    }
    if (isRecord(state?.taxState) && hasOwn(state.taxState, 'lossCarry')) {
        if (!Number.isFinite(state.taxState.lossCarry) || state.taxState.lossCarry < 0) {
            failImport('invalid_last_state', 'Der gespeicherte Verlustvortrag ist ungültig. Bitte eine intakte Exportdatei verwenden.');
        }
    }
    validateAnnualMarketDataMeta(payload[ANNUAL_MARKET_DATA_META_KEY]);
    const marketMeta = payload[ANNUAL_MARKET_DATA_META_KEY];
    if (
        marketMeta?.sourceType === 'manual_csv' &&
        (
            inputs.endeVJ !== marketMeta.price ||
            inputs.ath !== (
                marketMeta.engineReference?.applied
                    ? marketMeta.engineReference.value
                    : 0
            ) ||
            inputs.jahreSeitAth !== (
                marketMeta.engineReference?.applied
                    ? marketMeta.engineReference.yearsSince
                    : 0
            )
        )
    ) {
        failImport(
            'invalid_market_provenance',
            'Manuelle CSV-Provenienz und persistierte Engine-Marktdaten widersprechen sich.'
        );
    }

    return cloneJson(payload);
}

function migrateCurrentBalanceState(payload, { preserveInvalidRecoveryState = false } = {}) {
    const migrated = cloneJson(payload);
    if (isRecord(migrated?.inputs)) {
        try {
            migrated.inputs = migrateBalanceLiquidityRunwayInput(migrated.inputs, { dropTargetEq: true });
            delete migrated.inputs.rebalBand;
        } catch (error) {
            if (!(preserveInvalidRecoveryState
                && error instanceof BalanceImportError
                && error.code === 'invalid_input_bounds')) {
                throw error;
            }
        }
    }
    return migrated;
}

function cloneBalanceStateForExport(payload) {
    if (!isRecord(payload)) {
        failImport('invalid_payload', 'Der Balance-Inhalt ist kein Objekt und kann nicht exportiert werden.');
    }
    if (!isRecord(payload.inputs)) {
        failImport('invalid_inputs', 'Der Pflichtbereich „inputs“ fehlt und kann nicht exportiert werden.');
    }
    try {
        const serialized = JSON.stringify(payload);
        if (typeof serialized !== 'string') {
            failImport('invalid_export_payload', 'Der Balance-Zustand ist nicht als JSON darstellbar.');
        }
        return JSON.parse(serialized);
    } catch (error) {
        if (error instanceof BalanceImportError) throw error;
        failImport('invalid_export_payload', 'Der Balance-Zustand ist nicht verlustfrei als JSON darstellbar.');
    }
}

export function createBalanceExportDocument(payload) {
    const exportPayload = migrateCurrentBalanceState(
        cloneBalanceStateForExport(payload),
        { preserveInvalidRecoveryState: true }
    );
    const validationWarnings = [];
    try {
        validateBalanceState(exportPayload);
    } catch (error) {
        if (!(error instanceof BalanceImportError)) throw error;
        validationWarnings.push({
            code: error.code || 'invalid_balance_state',
            message: error.message
        });
    }
    return {
        appId: BALANCE_EXPORT_APP_ID,
        schema: BALANCE_EXPORT_SCHEMA,
        schemaVersion: BALANCE_EXPORT_SCHEMA_VERSION,
        inputSchemaVersion: BALANCE_IMPORT_INPUT_SCHEMA_VERSION,
        appVersion: CONFIG.APP.VERSION,
        exportedAt: new Date().toISOString(),
        payload: exportPayload,
        ...(validationWarnings.length > 0 ? { validationWarnings } : {})
    };
}

export function normalizeBalanceImportDocument(document) {
    if (!isRecord(document)) {
        failImport('invalid_document', 'Die Importdatei enthält kein gültiges Balance-Dokument. Bitte eine Balance-Exportdatei auswählen.');
    }

    const looksCurrent = ['appId', 'schema', 'schemaVersion', 'appVersion'].some(key => hasOwn(document, key));
    if (looksCurrent) {
        if (document.appId !== BALANCE_EXPORT_APP_ID) {
            failImport('wrong_app', 'Die Datei gehört nicht zur Balance-App. Bitte die passende Balance-Exportdatei auswählen.');
        }
        if (document.schema !== BALANCE_EXPORT_SCHEMA) {
            failImport('wrong_schema', 'Das Importschema wird von der Balance-App nicht unterstützt. Bitte eine passende Exportdatei verwenden.');
        }
        if (![1, BALANCE_EXPORT_SCHEMA_VERSION].includes(document.schemaVersion)) {
            failImport('unsupported_version', 'Die Importversion wird nicht unterstützt. Bitte die Datei mit einer kompatiblen App-Version exportieren.');
        }
        if (
            document.schemaVersion === BALANCE_EXPORT_SCHEMA_VERSION &&
            document.inputSchemaVersion !== BALANCE_IMPORT_INPUT_SCHEMA_VERSION
        ) {
            failImport(
                'unsupported_input_schema_version',
                'Die Version des Balance-Eingabevertrags wird nicht unterstützt.'
            );
        }
        if (
            document.schemaVersion === 1 &&
            hasOwn(document, 'inputSchemaVersion') &&
            document.inputSchemaVersion !== 1
        ) {
            failImport(
                'unsupported_input_schema_version',
                'Die Version-1-Datei enthält einen widersprüchlichen Eingabevertrag.'
            );
        }
        if (typeof document.appVersion !== 'string' || document.appVersion.trim() === '') {
            failImport('invalid_document', 'Die App-Version der Importdatei fehlt. Bitte eine unveränderte Balance-Exportdatei auswählen.');
        }
        if (typeof document.exportedAt !== 'string' || !Number.isFinite(new Date(document.exportedAt).getTime())) {
            failImport('invalid_document', 'Der Exportzeitpunkt der Importdatei ist ungültig. Bitte eine unveränderte Balance-Exportdatei auswählen.');
        }
        if (document.schemaVersion === 1) {
            return {
                payload: migrateBalanceStateV1(document.payload),
                sourceFormat: 'balance-state-v1',
                migrated: true
            };
        }
        const hadCanonicalRunway = isRecord(document.payload?.inputs)
            && hasOwn(document.payload.inputs, 'liquidityRunwayYears');
        const hadRemovedStrategyFields = isRecord(document.payload?.inputs)
            && ['runwayTargetMonths', 'runwayMinMonths', 'targetEq', 'rebalBand'].some(field => hasOwn(document.payload.inputs, field));
        return {
            payload: validateBalanceState(migrateCurrentBalanceState(document.payload)),
            sourceFormat: 'balance-state-v2',
            migrated: !hadCanonicalRunway || hadRemovedStrategyFields
        };
    }

    const looksLegacy = ['app', 'version', 'payload'].some(key => hasOwn(document, key));
    if (looksLegacy) {
        if (document.app !== CONFIG.APP.NAME) {
            failImport('wrong_app', 'Die Legacy-Datei gehört nicht zur Balance-App. Bitte die passende Balance-Exportdatei auswählen.');
        }
        if (!SUPPORTED_LEGACY_APP_VERSIONS.has(document.version)) {
            failImport('unsupported_legacy_version', 'Diese Legacy-Exportversion wird nicht unterstützt. Bitte zuerst mit einer kompatiblen App-Version migrieren.');
        }
        if (!isRecord(document.payload)) {
            failImport('invalid_payload', 'Der Legacy-Balance-Inhalt fehlt oder ist ungültig. Bitte eine vollständige Balance-Exportdatei auswählen.');
        }
        return {
            payload: migrateBalanceStateV1(document.payload),
            sourceFormat: 'legacy-balance-export-v0',
            migrated: true
        };
    }

    failImport('unknown_shape', 'Die Datei hat weder das aktuelle noch ein unterstütztes Legacy-Balance-Format. Bitte eine unveränderte Balance-Exportdatei auswählen.');
}

function yearFromPeriodId(periodId) {
    const match = /^calendar-year:(\d{4})$/.exec(String(periodId || ''));
    if (!match) return null;
    const year = Number(match[1]);
    return createAnnualPeriodId(year) === periodId ? year : null;
}

export function resolveCurrentMarketCsvTargetYear(state = {}, referenceDate = new Date()) {
    const pendingYear = yearFromPeriodId(state?.annualPeriodMetadata?.pendingCommit?.periodId);
    if (Number.isInteger(pendingYear)) return pendingYear;
    return deriveCompletedCalendarYear(referenceDate);
}

function normalizeInstrument(value) {
    const instrument = String(value || '').trim().toUpperCase();
    if (!/^[A-Z0-9^._=-]{1,32}$/.test(instrument)) {
        failMarketCsv(
            'market_csv_instrument_invalid',
            'Das Instrument muss explizit angegeben werden und darf nur Tickerzeichen enthalten.'
        );
    }
    return instrument;
}

function normalizeSourceFileName(value) {
    const normalized = String(value || '')
        .split(/[\\/]/)
        .at(-1)
        .replace(/[\u0000-\u001f\u007f]/g, '')
        .trim()
        .slice(0, 200);
    if (!normalized) {
        failMarketCsv('market_csv_source_missing', 'Der CSV-Dateiname fehlt als Quellenangabe.');
    }
    return normalized;
}

/**
 * Bindet einen bereits DOM-frei geparsten CSV-Payload an seinen expliziten
 * Importkontext. Die Funktion erzeugt noch keinen Storage- oder DOM-Write.
 */
export function createManualMarketCsvImportPlan(parsed, {
    mode,
    targetYear,
    expectedAsOf,
    instrument,
    sourceFileName,
    currentPeriodYear,
    importedAt = new Date().toISOString()
} = {}) {
    if (!isRecord(parsed) || parsed.schemaVersion !== 1 || !isRecord(parsed.values)) {
        failMarketCsv('market_csv_payload_invalid', 'Der normalisierte Markt-CSV-Payload ist ungültig.');
    }
    if (mode !== 'current' && mode !== 'historical') {
        failMarketCsv(
            'market_csv_mode_invalid',
            'Bitte den CSV-Modus ausdrücklich als aktuell oder historisch wählen.'
        );
    }
    if (!Number.isInteger(targetYear) || !createAnnualPeriodId(targetYear)) {
        failMarketCsv('market_csv_target_period_invalid', 'Die CSV-Zielperiode muss ein gültiges vierstelliges Kalenderjahr sein.');
    }
    if (!Number.isInteger(currentPeriodYear) || !createAnnualPeriodId(currentPeriodYear)) {
        failMarketCsv('market_csv_current_period_invalid', 'Die aktuell erwartete Planperiode konnte nicht bestimmt werden.');
    }
    if (mode === 'current' && targetYear !== currentPeriodYear) {
        failMarketCsv(
            'market_csv_period_mismatch',
            `Eine aktuelle CSV muss die erwartete Planperiode ${currentPeriodYear} adressieren.`,
            { targetYear, currentPeriodYear }
        );
    }
    if (mode === 'historical' && targetYear >= currentPeriodYear) {
        failMarketCsv(
            'market_csv_historical_period_invalid',
            `Der historische Modus erfordert eine Zielperiode vor ${currentPeriodYear}.`,
            { targetYear, currentPeriodYear }
        );
    }

    const expectedDate = parseIsoDateOnly(expectedAsOf);
    if (!expectedDate || expectedDate.getUTCFullYear() !== targetYear) {
        failMarketCsv(
            'market_csv_expected_asof_invalid',
            'Der erwartete ISO-Stichtag muss vollständig sein und in der Zielperiode liegen.'
        );
    }
    if (parsed.asOf !== expectedAsOf) {
        failMarketCsv(
            'market_csv_asof_mismatch',
            `Der letzte CSV-Datenpunkt ${parsed.asOf || 'unbekannt'} stimmt nicht mit dem erwarteten Stichtag ${expectedAsOf} überein.`,
            { actualAsOf: parsed.asOf || null, expectedAsOf }
        );
    }
    if (new Date(`${parsed.asOf}T00:00:00.000Z`).getUTCFullYear() !== targetYear) {
        failMarketCsv(
            'market_csv_period_mismatch',
            `Der letzte CSV-Datenpunkt gehört nicht zur Zielperiode ${targetYear}.`
        );
    }
    if (
        !isRecord(parsed.coverage) ||
        !isValidManualCoverage(parsed.coverage, targetYear, parsed.asOf) ||
        parsed.coverage.rowCount !== parsed.rowCount
    ) {
        failMarketCsv('market_csv_coverage_invalid', 'Die CSV-Periodenabdeckung ist inkonsistent.');
    }
    if (
        !isRecord(parsed.high) ||
        parsed.high.scope !== 'windowHigh' ||
        parsed.high.verifiedAllTimeHighAvailable !== false ||
        !Number.isFinite(parsed.high.value) ||
        !parseIsoDateOnly(parsed.high.asOf)
    ) {
        failMarketCsv('market_csv_high_scope_invalid', 'Die manuelle CSV darf nur ein validiertes windowHigh liefern.');
    }
    if (typeof importedAt !== 'string' || !Number.isFinite(Date.parse(importedAt))) {
        failMarketCsv('market_csv_import_time_invalid', 'Der CSV-Importzeitpunkt ist ungültig.');
    }

    const normalizedInstrument = normalizeInstrument(instrument);
    const normalizedSourceFileName = normalizeSourceFileName(sourceFileName);
    const periodId = createAnnualPeriodId(targetYear);
    const engineReference = buildManualWindowHighEngineReference(
        parsed.values.endeVJ,
        parsed.high
    );
    const engineValues = {
        endeVJ: parsed.values.endeVJ,
        endeVJ_1: parsed.values.endeVJ_1,
        endeVJ_2: parsed.values.endeVJ_2,
        endeVJ_3: parsed.values.endeVJ_3,
        // D-13: Das Fensterhoch traegt nur als gerichtete Untergrenze. Ein
        // positiver Fensterabstand belegt mindestens diesen Drawdown; bei
        // windowHigh === aktuellem Kurs bleibt das ATH dagegen unbekannt.
        ath: engineReference.applied ? engineReference.value : 0,
        jahreSeitAth: engineReference.applied ? engineReference.yearsSince : 0
    };
    Object.entries(engineValues).forEach(([field, value]) => {
        if (!Number.isFinite(value) || value < 0) {
            failMarketCsv('market_csv_engine_values_invalid', `Das normalisierte Marktdatenfeld ${field} ist ungültig.`);
        }
    });

    return {
        schemaVersion: 1,
        mode,
        targetYear,
        expectedAsOf,
        periodId,
        engineValues,
        provenance: {
            schemaVersion: ANNUAL_MARKET_DATA_SCHEMA_VERSION,
            acquisitionMode: 'manual_csv',
            periodMode: mode,
            periodId,
            targetYear,
            price: engineValues.endeVJ,
            asOf: parsed.asOf,
            ticker: normalizedInstrument,
            instrument: normalizedInstrument,
            source: `Manuelle CSV: ${normalizedSourceFileName}`,
            sourceType: 'manual_csv',
            sourceFileName: normalizedSourceFileName,
            importedAt: new Date(importedAt).toISOString(),
            coverage: cloneJson(parsed.coverage),
            highScope: 'windowHigh',
            high: cloneJson(parsed.high),
            engineReference,
            ath: {
                value: null,
                yearsSince: null,
                evaluatedAsOf: parsed.asOf,
                lastHighAsOf: null,
                scope: 'unavailable_manual_window',
                engineAvailable: false
            }
        }
    };
}

function captureInputUiState(inputs = {}) {
    return Object.fromEntries(Object.entries(inputs).map(([key, element]) => {
        const state = {
            checked: element?.checked,
            disabled: element?.disabled
        };
        if (element?.type !== 'file') state.value = element?.value;
        return [key, state];
    }));
}

function restoreInputUiState(inputs = {}, snapshot = {}) {
    Object.entries(snapshot).forEach(([key, state]) => {
        const element = inputs[key];
        if (!element) return;
        if (element.type !== 'file' && state.value !== undefined) element.value = state.value;
        if (state.checked !== undefined) element.checked = state.checked;
        if (state.disabled !== undefined) element.disabled = state.disabled;
    });
}

function asSafeImportError(error, { replaceReceipt = null, rollbackSucceeded = false, rollbackFailed = false } = {}) {
    if (rollbackFailed) {
        return new BalanceImportError(
            'rollback_failed',
            'Der Import konnte nicht abgeschlossen und nicht automatisch zurückgerollt werden. Bitte den angelegten Import-Recovery-Snapshot über „Snapshots“ wiederherstellen.'
        );
    }
    if (replaceReceipt && rollbackSucceeded) {
        return new BalanceImportError(
            'post_replace_validation_failed',
            'Die abschließende Engine-Prüfung ist fehlgeschlagen. Der vorherige Zustand wurde automatisch wiederhergestellt; bitte die Importdatei prüfen.'
        );
    }
    if (error instanceof BalanceImportError) return error;
    if (error instanceof StorageError) {
        return new BalanceImportError(
            'storage_failed',
            'Recovery-Snapshot oder Speicherung konnte nicht bestätigt werden. Die Live-Daten wurden nicht ersetzt; bitte freien Speicher und App-Berechtigungen prüfen.'
        );
    }
    return new BalanceImportError(
        'unexpected_import_error',
        'Der Import konnte nicht sicher abgeschlossen werden. Die Live-Daten wurden nicht bestätigt ersetzt; bitte die Datei prüfen oder den Recovery-Snapshot verwenden.'
    );
}

function asSafeMarketCsvImportError(error, context = {}) {
    if (error instanceof MarketCsvImportError && !context.replaceReceipt) return error;
    const safe = asSafeImportError(error, context);
    return new MarketCsvImportError(safe.code || 'market_csv_import_failed', safe.message);
}

export function createImportExportHandlers({ dom, debouncedUpdate, update }) {
    return {
        handleExport() {
            try {
                const dataToExport = createBalanceExportDocument(StorageManager.loadState());
                const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = `balancing-export-${new Date().toISOString().slice(0, 10)}.json`;
                a.click();
                URL.revokeObjectURL(a.href);
                const warning = dataToExport.validationWarnings?.[0];
                UIRenderer.toast(warning
                    ? `Export erstellt mit Validierungshinweis [${warning.code}]: ${warning.message}`
                    : 'Export erstellt.');
            } catch (error) {
                const code = error?.code || 'export_failed';
                const message = error?.message || 'Der Balance-Zustand kann nicht als JSON exportiert werden.';
                UIRenderer.handleError(new AppError(
                    `Export nicht möglich [${code}]: ${message}`,
                    { originalError: error, code }
                ));
            }
        },

        async handleImport(e) {
            const file = e.target.files?.[0];
            if (!file) return;
            const uiSnapshot = captureInputUiState(dom.inputs);
            let replaceReceipt = null;
            let rollbackSucceeded = false;
            let rollbackFailed = false;
            try {
                let json;
                try {
                    json = JSON.parse(await file.text());
                } catch {
                    failImport('invalid_json', 'Die Datei enthält kein gültiges JSON. Bitte eine unveränderte Balance-Exportdatei auswählen.');
                }

                const normalized = normalizeBalanceImportDocument(json);
                UIReader.applyStoredInputs(normalized.payload.inputs);

                const dryRunResult = await update({ mode: BALANCE_UPDATE_MODE.PREVIEW });
                if (!dryRunResult?.ok) {
                    failImport('dry_run_failed', 'Die importierten Daten bestehen die Eingabe-/Engine-Prüfung nicht. Die Live-Daten wurden nicht verändert; bitte die Importdatei korrigieren.');
                }

                replaceReceipt = await StorageManager.replaceStateFromImport(normalized.payload);
                const finalResult = await update({ mode: BALANCE_UPDATE_MODE.PERSIST_INPUTS });
                if (!finalResult?.ok) {
                    failImport('final_update_failed', 'Die importierten Daten konnten nach dem Ersetzen nicht erfolgreich gespeichert und bestätigt werden.');
                }

                UIRenderer.toast(normalized.migrated
                    ? 'Legacy-Import migriert und erfolgreich gespeichert. Recovery-Snapshot wurde erstellt.'
                    : 'Import erfolgreich. Recovery-Snapshot wurde erstellt.');
            } catch (err) {
                if (replaceReceipt) {
                    try {
                        await StorageManager.rollbackImportReplace(replaceReceipt);
                        rollbackSucceeded = true;
                    } catch {
                        rollbackFailed = true;
                    }
                }
                restoreInputUiState(dom.inputs, uiSnapshot);
                UIRenderer.handleError(asSafeImportError(err, {
                    replaceReceipt,
                    rollbackSucceeded,
                    rollbackFailed
                }));
            } finally {
                e.target.value = '';
            }
        },

        async handleCsvImport(e) {
            const file = e.target.files?.[0];
            if (!file) return;
            const uiSnapshot = captureInputUiState(dom.inputs);
            let previousState = null;
            let replaceReceipt = null;
            let rollbackSucceeded = false;
            let rollbackFailed = false;
            try {
                previousState = StorageManager.loadState() || {};
                const text = await file.text();
                const parsed = parseMarketDataCsv(text);
                const plan = createManualMarketCsvImportPlan(parsed, {
                    mode: String(dom.inputs.marketCsvMode?.value || ''),
                    targetYear: Number(dom.inputs.marketCsvTargetYear?.value),
                    expectedAsOf: String(dom.inputs.marketCsvExpectedAsOf?.value || ''),
                    instrument: String(dom.inputs.marketCsvInstrument?.value || ''),
                    sourceFileName: file.name,
                    currentPeriodYear: resolveCurrentMarketCsvTargetYear(previousState)
                });

                Object.entries(plan.engineValues).forEach(([fieldId, value]) => {
                    const element = dom.inputs[fieldId];
                    if (element) element.value = String(value);
                });

                const dryRunResult = await update({ mode: BALANCE_UPDATE_MODE.PREVIEW });
                if (!dryRunResult?.ok) {
                    failMarketCsv(
                        'market_csv_dry_run_failed',
                        'Die CSV-Daten bestehen die Eingabe-/Engine-Prüfung nicht. Die Live-Daten wurden nicht verändert.'
                    );
                }

                const importedState = {
                    ...cloneJson(previousState),
                    inputs: {
                        ...(isRecord(previousState.inputs) ? cloneJson(previousState.inputs) : {}),
                        ...(isRecord(dryRunResult.inputData) ? cloneJson(dryRunResult.inputData) : plan.engineValues),
                        ...plan.engineValues
                    },
                    [ANNUAL_MARKET_DATA_META_KEY]: cloneJson(plan.provenance)
                };
                validateBalanceState(importedState);
                replaceReceipt = await StorageManager.replaceStateFromImport(importedState);

                const finalResult = await update({ mode: BALANCE_UPDATE_MODE.PERSIST_INPUTS });
                if (!finalResult?.ok) {
                    failMarketCsv(
                        'market_csv_final_update_failed',
                        'Die CSV-Daten konnten nach dem Ersetzen nicht erfolgreich gespeichert und bestätigt werden.'
                    );
                }
                const confirmedState = StorageManager.loadState() || {};
                validateBalanceState(confirmedState);
                if (
                    JSON.stringify(confirmedState[ANNUAL_MARKET_DATA_META_KEY]) !==
                    JSON.stringify(plan.provenance)
                ) {
                    failMarketCsv(
                        'market_csv_provenance_confirmation_failed',
                        'Die Marktdaten-Provenienz blieb nach dem Speichern nicht vollständig erhalten.'
                    );
                }

                UIReader.renderMarketDataProvenance(plan.provenance);
                UIRenderer.toast(
                    `CSV importiert: ${plan.provenance.instrument}, Periode ${plan.targetYear}, `
                    + `Stichtag ${plan.expectedAsOf}; windowHigh wird intern als konservative `
                    + 'ATH-Untergrenze verwendet. Recovery-Snapshot wurde erstellt.'
                );
            } catch (err) {
                if (replaceReceipt) {
                    try {
                        await StorageManager.rollbackImportReplace(replaceReceipt);
                        rollbackSucceeded = true;
                    } catch {
                        rollbackFailed = true;
                    }
                }
                restoreInputUiState(dom.inputs, uiSnapshot);
                UIReader.renderMarketDataProvenance(
                    previousState?.[ANNUAL_MARKET_DATA_META_KEY] || null
                );
                const safeError = asSafeMarketCsvImportError(err, {
                    replaceReceipt,
                    rollbackSucceeded,
                    rollbackFailed
                });
                UIRenderer.handleError(new AppError(`CSV-Import fehlgeschlagen: ${safeError.message}`, {
                    originalError: safeError,
                    code: safeError.code || null,
                    details: safeError.details || null
                }));
            } finally {
                e.target.value = '';
            }
        }
    };
}
