// @ts-check

import { persistenceStorage } from '../shared/persistence-facade.js';

export const HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY = 'household_simulator_needs_v1';
export const HOUSEHOLD_SIMULATOR_NEEDS_WARNING_ACK_KEY = 'household_simulator_needs_warning_ack_v1';
export const HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS = Object.freeze([
    'startFloorBedarf',
    'startFlexBedarf',
    'minimumFlexAnnual'
]);

const FIELD_ID_SET = new Set(HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS);
const SCHEMA_VERSION = 1;
const DECIMAL_VALUE_PATTERN = /^\d+(?:\.\d+)?$/;
const USER_NUMBER_PATTERN = /^[+]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:[eE][+-]?\d+)?$/;

function hasOwn(value, key) {
    return Object.prototype.hasOwnProperty.call(value, key);
}

function normalizeStoredValue(value) {
    const raw = typeof value === 'number' && Number.isFinite(value)
        ? String(value)
        : value;
    if (typeof raw !== 'string' || raw === '' || raw !== raw.trim()
        || !DECIMAL_VALUE_PATTERN.test(raw)) {
        return null;
    }
    const numeric = Number(raw);
    return Number.isFinite(numeric) && numeric >= 0 ? raw : null;
}

function numberToPlainDecimal(value) {
    const raw = String(value);
    if (!/[eE]/.test(raw)) return raw;
    const [coefficient, exponentRaw] = raw.toLowerCase().split('e');
    const exponent = Number(exponentRaw);
    const digits = coefficient.replace('.', '');
    const decimalIndex = (coefficient.indexOf('.') >= 0
        ? coefficient.indexOf('.')
        : coefficient.length) + exponent;
    if (decimalIndex <= 0) return `0.${'0'.repeat(-decimalIndex)}${digits}`;
    if (decimalIndex >= digits.length) return `${digits}${'0'.repeat(decimalIndex - digits.length)}`;
    return `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
}

function normalizeUserValue(value) {
    let raw = typeof value === 'number' && Number.isFinite(value)
        ? String(value)
        : String(value ?? '').trim();
    if (!USER_NUMBER_PATTERN.test(raw)) return null;
    raw = raw.replace(',', '.').replace(/^\+/, '');
    const match = raw.match(/^(\d*)(?:\.(\d*))?(?:[eE]([+-]?\d+))?$/);
    if (!match) return null;
    const integerPart = match[1] || '0';
    const fractionalPart = match[2] || '';
    const exponent = Number(match[3] || 0);
    if (!Number.isSafeInteger(exponent) || Math.abs(exponent) > 1000) return null;
    const digits = `${integerPart}${fractionalPart}`;
    const decimalIndex = integerPart.length + exponent;
    let expanded;
    if (decimalIndex <= 0) expanded = `0.${'0'.repeat(-decimalIndex)}${digits}`;
    else if (decimalIndex >= digits.length) expanded = `${digits}${'0'.repeat(decimalIndex - digits.length)}`;
    else expanded = `${digits.slice(0, decimalIndex)}.${digits.slice(decimalIndex)}`;
    const [expandedInteger, expandedFraction = ''] = expanded.split('.');
    const normalizedInteger = expandedInteger.replace(/^0+(?=\d)/, '') || '0';
    const normalizedFraction = expandedFraction.replace(/0+$/, '');
    const canonical = normalizedFraction ? `${normalizedInteger}.${normalizedFraction}` : normalizedInteger;
    const numeric = Number(canonical);
    if (!Number.isFinite(numeric) || numeric < 0) return null;
    const numericRoundtrip = numberToPlainDecimal(numeric);
    if (numericRoundtrip !== canonical) return null;
    return canonical;
}

function normalizeCompleteLegacySnapshot(values) {
    if (!values || typeof values !== 'object' || Array.isArray(values)) return null;
    const normalized = {};
    for (const fieldId of HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS) {
        if (!hasOwn(values, fieldId)) return null;
        const value = normalizeStoredValue(values[fieldId]);
        if (value === null) return null;
        normalized[fieldId] = value;
    }
    if (Number(normalized.minimumFlexAnnual) > Number(normalized.startFlexBedarf)) return null;
    return normalized;
}

function buildWarning(code, detail = '') {
    if (code === 'unsupported_schema') {
        return `Gespeicherte Simulator-Haushaltswerte verwenden eine nicht unterstützte Version${detail ? ` (${detail})` : ''} und wurden nicht angewendet.`;
    }
    if (code === 'legacy_invalid') {
        return 'Frühere Simulator-Bedarfswerte waren unvollständig oder ungültig und wurden nicht automatisch übernommen.';
    }
    if (code === 'legacy_ambiguous') {
        return 'Frühere Simulator-Bedarfswerte waren mehreren Profilen zugeordnet und konnten nicht eindeutig als Haushaltswert übernommen werden.';
    }
    if (code === 'legacy_migrated') {
        return `Frühere Simulator-Haushaltswerte wurden einmalig übernommen: Floor ${detail.startFloorBedarf}, Flex ${detail.startFlexBedarf}, Mindest-Flex ${detail.minimumFlexAnnual}.`;
    }
    return 'Gespeicherte Simulator-Haushaltswerte sind beschädigt und wurden nicht angewendet.';
}

export function isHouseholdSimulatorNeedField(fieldId) {
    return FIELD_ID_SET.has(String(fieldId || ''));
}

export function readHouseholdSimulatorNeedsState(storage = persistenceStorage) {
    const raw = storage.getItem(HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY);
    if (raw === null || raw === '') {
        return { status: 'absent', source: '', values: null, overriddenFields: [], warning: '', raw };
    }

    let parsed;
    try {
        parsed = JSON.parse(raw);
    } catch {
        return { status: 'invalid', source: '', values: null, overriddenFields: [], warning: buildWarning('invalid'), raw };
    }
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
        return { status: 'invalid', source: '', values: null, overriddenFields: [], warning: buildWarning('invalid'), raw };
    }
    if (parsed.schemaVersion !== SCHEMA_VERSION) {
        const acknowledged = storage.getItem(HOUSEHOLD_SIMULATOR_NEEDS_WARNING_ACK_KEY) === raw;
        return {
            status: 'unsupported',
            source: '',
            values: null,
            overriddenFields: [],
            warning: acknowledged ? '' : buildWarning('unsupported_schema', String(parsed.schemaVersion ?? 'fehlend')),
            raw
        };
    }
    if (parsed.mode === 'migration_pending') {
        return {
            status: 'migration_pending', source: String(parsed.source || ''), values: null,
            overriddenFields: [], warning: '', raw
        };
    }
    if (parsed.mode === 'profile_default') {
        return {
            status: 'profile_default',
            source: String(parsed.source || ''),
            values: null,
            overriddenFields: [],
            warning: parsed.source === 'legacy_invalid' ? buildWarning('legacy_invalid') : '',
            raw
        };
    }
    if (parsed.mode !== 'override' || !Array.isArray(parsed.overriddenFields)
        || !parsed.values || typeof parsed.values !== 'object' || Array.isArray(parsed.values)) {
        return { status: 'invalid', source: '', values: null, overriddenFields: [], warning: buildWarning('invalid'), raw };
    }

    const overriddenFields = [...new Set(parsed.overriddenFields.map(String))];
    const valueKeys = Object.keys(parsed.values);
    if (overriddenFields.length === 0
        || overriddenFields.some(fieldId => !FIELD_ID_SET.has(fieldId))
        || valueKeys.some(fieldId => !FIELD_ID_SET.has(fieldId))
        || overriddenFields.some(fieldId => !hasOwn(parsed.values, fieldId))) {
        return { status: 'invalid', source: '', values: null, overriddenFields: [], warning: buildWarning('invalid'), raw };
    }
    const values = {};
    for (const fieldId of overriddenFields) {
        const normalized = normalizeStoredValue(parsed.values[fieldId]);
        if (normalized === null) {
            return { status: 'invalid', source: '', values: null, overriddenFields: [], warning: buildWarning('invalid'), raw };
        }
        values[fieldId] = normalized;
    }
    if (hasOwn(values, 'minimumFlexAnnual') && hasOwn(values, 'startFlexBedarf')
        && Number(values.minimumFlexAnnual) > Number(values.startFlexBedarf)) {
        return { status: 'invalid', source: '', values: null, overriddenFields: [], warning: buildWarning('invalid'), raw };
    }

    return {
        status: 'valid',
        source: String(parsed.source || ''),
        values,
        overriddenFields,
        warning: '',
        raw
    };
}

function persistRecord(record, storage) {
    storage.removeItem(HOUSEHOLD_SIMULATOR_NEEDS_WARNING_ACK_KEY);
    storage.setItem(HOUSEHOLD_SIMULATOR_NEEDS_STORAGE_KEY, JSON.stringify(record));
    return readHouseholdSimulatorNeedsState(storage);
}

/**
 * Selects a deterministic legacy household candidate from all active profiles.
 * A legacy value is only attributable without guessing for a one-profile
 * household. Multi-profile legacy data remains profile-owned and is not promoted.
 */
export function selectLegacyHouseholdSimulatorNeeds(profileEntries) {
    const entries = Array.isArray(profileEntries) ? profileEntries : [];
    const candidates = entries.map(entry => {
        const values = normalizeCompleteLegacySnapshot(entry?.legacyValues);
        if (!values) return null;
        const defaults = entry?.profileDefaults || {};
        const differsFromDefaults = HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS.some(
            fieldId => Number(values[fieldId]) !== Number(defaults[fieldId])
        );
        return { values, differsFromDefaults };
    }).filter(Boolean);

    if (entries.length === 1 && candidates.length === 1 && candidates[0].differsFromDefaults) {
        return { status: 'candidate', values: candidates[0].values };
    }
    const changedCandidates = candidates.filter(candidate => candidate.differsFromDefaults);
    if (entries.length > 1 && changedCandidates.length > 0) return { status: 'ambiguous', values: null };
    return { status: 'none', values: null };
}

export function ensureHouseholdSimulatorNeedsMigrationPending(storage = persistenceStorage) {
    const current = readHouseholdSimulatorNeedsState(storage);
    if (current.status !== 'absent') return current;
    return persistRecord({
        schemaVersion: SCHEMA_VERSION,
        mode: 'migration_pending',
        source: 'awaiting_profile_context'
    }, storage);
}

export function initializeHouseholdSimulatorNeeds(legacySelection, storage = persistenceStorage) {
    const current = readHouseholdSimulatorNeedsState(storage);
    if (current.status === 'unsupported') {
        if (current.warning) storage.setItem(HOUSEHOLD_SIMULATOR_NEEDS_WARNING_ACK_KEY, current.raw);
        return current;
    }
    if (current.status === 'valid') return current;
    if (current.status === 'invalid' || (current.status === 'profile_default' && current.source === 'legacy_invalid')) {
        const warning = current.warning;
        const recovered = persistRecord({
            schemaVersion: SCHEMA_VERSION,
            mode: 'profile_default',
            source: current.status === 'invalid' ? 'recovered_invalid' : 'recovered_legacy_invalid'
        }, storage);
        return { ...recovered, warning };
    }
    if (current.status === 'profile_default') return current;

    if (legacySelection?.status === 'candidate') {
        const legacyValues = normalizeCompleteLegacySnapshot(legacySelection.values);
        if (legacyValues) {
            const migrated = persistRecord({
                schemaVersion: SCHEMA_VERSION,
                mode: 'override',
                source: 'legacy_sim_trio_v1',
                overriddenFields: [...HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS],
                values: legacyValues
            }, storage);
            return { ...migrated, warning: buildWarning('legacy_migrated', legacyValues) };
        }
    }

    const recovered = persistRecord({
        schemaVersion: SCHEMA_VERSION,
        mode: 'profile_default',
        source: legacySelection?.status === 'ambiguous' ? 'legacy_ambiguous' : 'no_legacy_override'
    }, storage);
    return legacySelection?.status === 'ambiguous'
        ? { ...recovered, warning: buildWarning('legacy_ambiguous') }
        : recovered;
}

export function writeHouseholdSimulatorNeedOverride(
    fieldId,
    currentValues,
    storage = persistenceStorage,
    fallbackValues = {}
) {
    if (!FIELD_ID_SET.has(String(fieldId || ''))) {
        return {
            ok: false,
            reason: 'unknown_field',
            message: 'Unbekanntes Simulator-Bedarfsfeld.',
            state: readHouseholdSimulatorNeedsState(storage)
        };
    }
    const normalizedValue = normalizeUserValue(currentValues?.[fieldId]);
    if (normalizedValue === null) {
        return {
            ok: false,
            reason: 'invalid_value',
            message: 'Der geänderte Haushaltsbedarf ist keine gültige nicht-negative Zahl und wurde nicht gespeichert.',
            state: readHouseholdSimulatorNeedsState(storage)
        };
    }

    const current = readHouseholdSimulatorNeedsState(storage);
    if (current.status === 'unsupported') {
        return {
            ok: false,
            reason: 'unsupported_schema',
            message: 'Die gespeicherten Haushaltswerte stammen aus einer neueren Version. Bitte setzen Sie die Simulator-Einstellungen zurück, bevor Sie sie ändern.',
            state: current
        };
    }
    if (fieldId === 'startFlexBedarf' || fieldId === 'minimumFlexAnnual') {
        const effectiveFlex = normalizeUserValue(currentValues?.startFlexBedarf)
            ?? normalizeStoredValue(fallbackValues?.startFlexBedarf);
        const effectiveMinimum = normalizeUserValue(currentValues?.minimumFlexAnnual)
            ?? normalizeStoredValue(fallbackValues?.minimumFlexAnnual);
        if (effectiveFlex === null || effectiveMinimum === null) {
            return {
                ok: false,
                reason: 'invalid_related_value',
                message: 'Flex-Bedarf und Mindest-Flex müssen beide gültig sein, bevor diese Änderung gespeichert wird.',
                state: current
            };
        }
        if (Number(effectiveMinimum) > Number(effectiveFlex)) {
            return {
                ok: false,
                reason: 'minimum_flex_exceeds_flex',
                message: 'Mindest-Flex darf den Flex-Bedarf nicht überschreiten; die Änderung wurde nicht gespeichert.',
                state: current
            };
        }
    }
    const values = current.status === 'valid' ? { ...current.values } : {};
    values[fieldId] = normalizedValue;
    if (hasOwn(values, 'minimumFlexAnnual') && hasOwn(values, 'startFlexBedarf')
        && Number(values.minimumFlexAnnual) > Number(values.startFlexBedarf)) {
        return {
            ok: false,
            reason: 'minimum_flex_exceeds_flex',
            message: 'Mindest-Flex darf den Flex-Bedarf nicht überschreiten; die Änderung wurde nicht gespeichert.',
            state: current
        };
    }
    const overriddenFields = HOUSEHOLD_SIMULATOR_NEED_FIELD_IDS.filter(id => hasOwn(values, id));
    const state = persistRecord({
        schemaVersion: SCHEMA_VERSION,
        mode: 'override',
        source: 'manual',
        overriddenFields,
        values
    }, storage);
    return { ok: true, reason: '', message: '', state };
}

export function resolveHouseholdSimulatorNeed(fieldId, profileValue, overrides) {
    return hasOwn(overrides || {}, fieldId) ? overrides[fieldId] : profileValue;
}

export function clearHouseholdSimulatorNeeds(storage = persistenceStorage) {
    return persistRecord({
        schemaVersion: SCHEMA_VERSION,
        mode: 'profile_default',
        source: 'reset'
    }, storage);
}
