// @ts-check

/**
 * DOM-free canonical contract for persisted and engine tranche records.
 *
 * Storage remains an array. The schema version therefore lives on every lot:
 * - missing / 0: supported legacy record
 * - 1: current canonical record
 * - every other value: rejected
 */

export const TRANCHE_SCHEMA_VERSION = 1;

export const TRANCHE_CATEGORY_TYPES = Object.freeze({
    equity: Object.freeze(['aktien_alt', 'aktien_neu']),
    bonds: Object.freeze(['anleihe']),
    money_market: Object.freeze(['geldmarkt']),
    gold: Object.freeze(['gold'])
});

export const TRANCHE_FIELD_GROUPS = Object.freeze({
    persisted: Object.freeze([
        'schemaVersion', 'trancheId', 'name', 'isin', 'ticker', 'shares',
        'purchasePrice', 'currentPrice', 'purchaseDate', 'category', 'type',
        'tqf', 'notes'
    ]),
    derived: Object.freeze(['marketValue', 'costBasis', 'instrumentId']),
    provenance: Object.freeze(['sourceProfileId'])
});

const CATEGORY_BY_TYPE = Object.freeze(Object.entries(TRANCHE_CATEGORY_TYPES)
    .reduce((result, [category, types]) => {
        for (const type of types) result[type] = category;
        return result;
    }, {}));

// The former manager exposed category and type as independent selects. Existing
// unversioned records can therefore carry an equity type after the user selected
// a non-equity category. Those categories each have exactly one canonical type,
// so the persisted v0 migration can repair this historic UI state without
// weakening schema-v1 or engine-bound validation.
const LEGACY_PERSISTED_TYPE_BY_CATEGORY = Object.freeze({
    bonds: 'anleihe',
    money_market: 'geldmarkt',
    gold: 'gold'
});

function isLegacyEquityType(type) {
    return type === 'aktien_alt' || type === 'aktien_neu';
}

export class TrancheValidationError extends Error {
    constructor(errors) {
        super('Die Tranchendaten sind ungültig.');
        this.name = 'TrancheValidationError';
        this.code = 'TRANCHE_VALIDATION_FAILED';
        this.errors = errors;
    }
}

function fieldError(code, field, index, trancheId, message, value) {
    return {
        code,
        field,
        index,
        trancheId: trancheId || null,
        message,
        ...(value !== undefined ? { value } : {})
    };
}

function hasOwn(value, field) {
    return Object.prototype.hasOwnProperty.call(value, field);
}

function isMissing(value) {
    return value === undefined || value === null || value === '';
}

function normalizeText(value) {
    return typeof value === 'string' ? value.trim() : '';
}

function normalizeIsin(value) {
    return normalizeText(value).replace(/\s+/g, '').toUpperCase();
}

function normalizeTicker(value) {
    return normalizeText(value).toUpperCase();
}

function normalizeEnum(value) {
    return normalizeText(value).toLowerCase();
}

function normalizeDate(value, errors, context) {
    if (isMissing(value)) return '';
    if (typeof value !== 'string') {
        errors.push(fieldError(
            'TRANCHE_DATE_INVALID', 'purchaseDate', context.index, context.trancheId,
            'Das Kaufdatum muss leer oder im Format JJJJ-MM-TT angegeben sein.', value
        ));
        return '';
    }

    const normalized = value.trim();
    const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(normalized);
    if (!match) {
        errors.push(fieldError(
            'TRANCHE_DATE_INVALID', 'purchaseDate', context.index, context.trancheId,
            'Das Kaufdatum muss leer oder im Format JJJJ-MM-TT angegeben sein.', value
        ));
        return normalized;
    }

    const date = new Date(`${normalized}T00:00:00.000Z`);
    if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== normalized) {
        errors.push(fieldError(
            'TRANCHE_DATE_INVALID', 'purchaseDate', context.index, context.trancheId,
            'Das Kaufdatum ist kein gültiger Kalendertag.', value
        ));
    }
    return normalized;
}

function readSchemaVersion(raw, errors, context) {
    if (!hasOwn(raw, 'schemaVersion') || raw.schemaVersion === null) return 0;
    const version = raw.schemaVersion;
    if (!Number.isInteger(version) || (version !== 0 && version !== TRANCHE_SCHEMA_VERSION)) {
        errors.push(fieldError(
            'TRANCHE_SCHEMA_VERSION_UNSUPPORTED', 'schemaVersion', context.index,
            context.trancheId, `Tranche-Schema-Version ${String(version)} wird nicht unterstützt.`, version
        ));
        return TRANCHE_SCHEMA_VERSION;
    }
    return version;
}

function readNumber(raw, field, errors, context, options = {}) {
    const { required = true, min = null, greaterThan = null, requiredCode = 'TRANCHE_FIELD_REQUIRED' } = options;
    const value = raw[field];
    if (isMissing(value)) {
        if (required) {
            errors.push(fieldError(
                requiredCode, field, context.index, context.trancheId,
                `${field} ist erforderlich.`, value
            ));
        }
        return null;
    }
    if (typeof value !== 'number' || !Number.isFinite(value)) {
        errors.push(fieldError(
            'TRANCHE_NUMBER_NON_FINITE', field, context.index, context.trancheId,
            `${field} muss eine endliche Zahl sein.`, value
        ));
        return null;
    }
    if (greaterThan !== null && value <= greaterThan) {
        errors.push(fieldError(
            'TRANCHE_NUMBER_OUT_OF_RANGE', field, context.index, context.trancheId,
            `${field} muss größer als ${greaterThan} sein.`, value
        ));
    } else if (min !== null && value < min) {
        errors.push(fieldError(
            'TRANCHE_NUMBER_OUT_OF_RANGE', field, context.index, context.trancheId,
            `${field} muss mindestens ${min} sein.`, value
        ));
    }
    return value;
}

function normalizeClassification(raw, errors, context, allowLegacy, options = {}) {
    const { migrateLegacyPersistedType = false } = options;
    const rawType = !isMissing(raw.type)
        ? raw.type
        : (allowLegacy ? raw.kind : undefined);
    let type = normalizeEnum(rawType);
    const category = normalizeEnum(!isMissing(raw.category)
        ? raw.category
        : (allowLegacy ? CATEGORY_BY_TYPE[type] : undefined));

    const migratedLegacyType = LEGACY_PERSISTED_TYPE_BY_CATEGORY[category];
    if (allowLegacy && migrateLegacyPersistedType && migratedLegacyType && isLegacyEquityType(type)) {
        type = migratedLegacyType;
    }

    if (!type) {
        errors.push(fieldError(
            'TRANCHE_TYPE_REQUIRED', 'type', context.index, context.trancheId,
            'Der Tranchentyp ist erforderlich.', rawType
        ));
    } else if (!CATEGORY_BY_TYPE[type]) {
        errors.push(fieldError(
            'TRANCHE_TYPE_UNSUPPORTED', 'type', context.index, context.trancheId,
            `Der Tranchentyp ${type} wird nicht unterstützt.`, rawType
        ));
    }

    if (!category) {
        errors.push(fieldError(
            'TRANCHE_CATEGORY_REQUIRED', 'category', context.index, context.trancheId,
            'Die Tranchkategorie ist erforderlich.', raw.category
        ));
    } else if (!TRANCHE_CATEGORY_TYPES[category]) {
        errors.push(fieldError(
            'TRANCHE_CATEGORY_UNSUPPORTED', 'category', context.index, context.trancheId,
            `Die Tranchkategorie ${category} wird nicht unterstützt.`, raw.category
        ));
    }

    if (type && category && CATEGORY_BY_TYPE[type] && TRANCHE_CATEGORY_TYPES[category]
        && CATEGORY_BY_TYPE[type] !== category) {
        errors.push(fieldError(
            'TRANCHE_CLASSIFICATION_MISMATCH', 'category', context.index, context.trancheId,
            `Kategorie ${category} und Typ ${type} bilden kein zulässiges Paar.`, raw.category
        ));
    }

    return { category, type };
}

function hashLegacyFingerprint(value) {
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
        hash ^= value.charCodeAt(index);
        hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
}

function createLegacyTrancheId(raw, index) {
    const fingerprint = [
        raw.name, raw.isin, raw.ticker, raw.shares, raw.purchasePrice,
        raw.purchaseDate, raw.type || raw.kind, raw.category
    ].map(value => String(value ?? '').trim()).join('|');
    return `tranche_legacy_${hashLegacyFingerprint(fingerprint)}_${index + 1}`;
}

function resolveInstrumentId(isin, ticker, name, type, trancheId) {
    if (isin) return `isin:${isin}`;
    if (ticker) return `ticker:${ticker}`;
    if (name) return `name:${name.toLocaleLowerCase('de-DE')}|type:${type}`;
    return `lot:${trancheId}`;
}

function normalizeOne(raw, options = {}) {
    const { mode = 'persisted', index = 0 } = options;
    const errors = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        return {
            value: null,
            errors: [fieldError(
                'TRANCHE_RECORD_INVALID', 'tranche', index, null,
                'Eine Tranche muss ein Objekt sein.', raw
            )]
        };
    }

    const initialContext = { index, trancheId: normalizeText(raw.trancheId || raw.id) };
    const version = readSchemaVersion(raw, errors, initialContext);
    const allowLegacy = version === 0;
    const explicitId = normalizeText(raw.trancheId);
    const legacyId = allowLegacy ? normalizeText(raw.id) : '';
    let trancheId = explicitId || legacyId;

    if (!trancheId && allowLegacy) {
        trancheId = createLegacyTrancheId(raw, index);
    } else if (!trancheId) {
        errors.push(fieldError(
            'TRANCHE_ID_REQUIRED', 'trancheId', index, null,
            'trancheId darf nicht leer sein.', raw.trancheId ?? raw.id
        ));
    }

    const context = { index, trancheId };
    const { category, type } = normalizeClassification(raw, errors, context, allowLegacy, {
        migrateLegacyPersistedType: mode === 'persisted'
    });
    const name = normalizeText(raw.name);
    if (mode === 'persisted' && !name) {
        errors.push(fieldError(
            'TRANCHE_NAME_REQUIRED', 'name', index, trancheId,
            'Der Tranchname ist erforderlich.', raw.name
        ));
    }

    const sharesRequired = mode === 'persisted';
    // Existing simulator adapters emit zero placeholders for unavailable unit data.
    // They are accepted only for unversioned engine records with explicit aggregate
    // values; persisted records and schema-v1 records remain strictly positive.
    const financialRaw = mode === 'engine' && allowLegacy
        ? {
            ...raw,
            ...(raw.shares === 0 ? { shares: undefined } : {}),
            ...(raw.purchasePrice === 0 ? { purchasePrice: undefined } : {}),
            ...(raw.currentPrice === 0 ? { currentPrice: undefined } : {})
        }
        : raw;
    const shares = readNumber(financialRaw, 'shares', errors, context, {
        required: sharesRequired,
        greaterThan: 0
    });
    const purchasePrice = readNumber(financialRaw, 'purchasePrice', errors, context, {
        required: sharesRequired,
        greaterThan: 0
    });

    const currentPriceRaw = isMissing(financialRaw.currentPrice) && allowLegacy && purchasePrice !== null
        ? { ...financialRaw, currentPrice: purchasePrice }
        : financialRaw;
    const currentPrice = readNumber(currentPriceRaw, 'currentPrice', errors, context, {
        required: sharesRequired,
        greaterThan: 0
    });
    const tqf = readNumber(raw, 'tqf', errors, context, {
        required: true,
        min: 0,
        requiredCode: 'TRANCHE_TQF_REQUIRED'
    });
    if (typeof tqf === 'number' && Number.isFinite(tqf) && tqf > 1) {
        errors.push(fieldError(
            'TRANCHE_NUMBER_OUT_OF_RANGE', 'tqf', index, trancheId,
            'tqf muss zwischen 0 und 1 liegen.', tqf
        ));
    }

    let marketValue;
    let costBasis;
    if (mode === 'persisted') {
        if (hasOwn(raw, 'marketValue')) {
            readNumber(raw, 'marketValue', errors, context, { required: false, min: 0 });
        }
        if (hasOwn(raw, 'costBasis')) {
            readNumber(raw, 'costBasis', errors, context, { required: false, min: 0 });
        }
        marketValue = shares !== null && currentPrice !== null ? shares * currentPrice : null;
        costBasis = shares !== null && purchasePrice !== null ? shares * purchasePrice : null;
    } else {
        marketValue = readNumber(raw, 'marketValue', errors, context, { required: false, min: 0 });
        costBasis = readNumber(raw, 'costBasis', errors, context, { required: false, min: 0 });
        if (marketValue === null && shares !== null && currentPrice !== null) {
            marketValue = shares * currentPrice;
        }
        if (costBasis === null && shares !== null && purchasePrice !== null) {
            costBasis = shares * purchasePrice;
        }
        if (marketValue === null) {
            errors.push(fieldError(
                'TRANCHE_MARKET_VALUE_REQUIRED', 'marketValue', index, trancheId,
                'marketValue oder shares/currentPrice ist erforderlich.', raw.marketValue
            ));
        }
        if (costBasis === null) {
            errors.push(fieldError(
                'TRANCHE_COST_BASIS_REQUIRED', 'costBasis', index, trancheId,
                'costBasis oder shares/purchasePrice ist erforderlich.', raw.costBasis
            ));
        }
    }

    const isin = normalizeIsin(raw.isin);
    const ticker = normalizeTicker(raw.ticker);
    const purchaseDate = normalizeDate(raw.purchaseDate, errors, context);
    const notes = normalizeText(raw.notes);
    const sourceProfileId = normalizeText(raw.sourceProfileId);
    if (hasOwn(raw, 'sourceProfileId') && !sourceProfileId) {
        errors.push(fieldError(
            'TRANCHE_SOURCE_PROFILE_ID_INVALID', 'sourceProfileId', index, trancheId,
            'sourceProfileId darf, wenn vorhanden, nicht leer sein.', raw.sourceProfileId
        ));
    }

    const value = {
        ...raw,
        schemaVersion: TRANCHE_SCHEMA_VERSION,
        trancheId,
        name,
        isin,
        ticker,
        ...(shares !== null ? { shares } : {}),
        ...(purchasePrice !== null ? { purchasePrice } : {}),
        ...(currentPrice !== null ? { currentPrice } : {}),
        purchaseDate,
        category,
        type,
        tqf,
        notes,
        marketValue,
        costBasis,
        instrumentId: resolveInstrumentId(isin, ticker, name, type, trancheId),
        ...(mode === 'engine' && sourceProfileId ? { sourceProfileId } : {})
    };
    delete value.id;
    delete value.kind;
    if (shares === null) delete value.shares;
    if (purchasePrice === null) delete value.purchasePrice;
    if (currentPrice === null) delete value.currentPrice;
    if (mode !== 'engine' || !sourceProfileId) delete value.sourceProfileId;

    return { value, errors };
}

export function classifyTranche(raw, options = {}) {
    const index = options.index ?? 0;
    const trancheId = normalizeText(raw?.trancheId || raw?.id);
    const errors = [];
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) {
        throw new TrancheValidationError([
            fieldError('TRANCHE_RECORD_INVALID', 'tranche', index, null, 'Eine Tranche muss ein Objekt sein.', raw)
        ]);
    }
    const result = normalizeClassification(raw, errors, { index, trancheId }, options.allowLegacy !== false);
    if (errors.length) throw new TrancheValidationError(errors);
    return result.category;
}

export function calculateCanonicalTrancheValues(tranche, options = {}) {
    const index = options.index ?? 0;
    const trancheId = normalizeText(tranche?.trancheId || tranche?.id);
    const errors = [];
    if (!tranche || typeof tranche !== 'object' || Array.isArray(tranche)) {
        throw new TrancheValidationError([
            fieldError('TRANCHE_RECORD_INVALID', 'tranche', index, null, 'Eine Tranche muss ein Objekt sein.', tranche)
        ]);
    }
    const context = { index, trancheId };
    const shares = readNumber(tranche, 'shares', errors, context, { greaterThan: 0 });
    const purchasePrice = readNumber(tranche, 'purchasePrice', errors, context, { greaterThan: 0 });
    const currentSource = isMissing(tranche.currentPrice) && purchasePrice !== null
        ? { ...tranche, currentPrice: purchasePrice }
        : tranche;
    const currentPrice = readNumber(currentSource, 'currentPrice', errors, context, { greaterThan: 0 });
    if (errors.length) throw new TrancheValidationError(errors);
    return {
        ...tranche,
        currentPrice,
        marketValue: shares * currentPrice,
        costBasis: shares * purchasePrice
    };
}

export function normalizeTranche(raw, options = {}) {
    const result = normalizeOne(raw, options);
    if (result.errors.length) throw new TrancheValidationError(result.errors);
    return result.value;
}

export function normalizeTrancheCollection(items, options = {}) {
    if (!Array.isArray(items)) {
        throw new TrancheValidationError([
            fieldError(
                'TRANCHE_COLLECTION_INVALID', 'detailledTranches', -1, null,
                'Der Tranchebestand muss ein Array sein.', items
            )
        ]);
    }

    const errors = [];
    const values = items.map((item, index) => {
        const result = normalizeOne(item, { ...options, index });
        errors.push(...result.errors);
        return result.value;
    });
    const firstIndexById = new Map();
    values.forEach((value, index) => {
        const trancheId = value?.trancheId;
        if (!trancheId) return;
        if (firstIndexById.has(trancheId)) {
            errors.push(fieldError(
                'TRANCHE_ID_DUPLICATE', 'trancheId', index, trancheId,
                `trancheId ${trancheId} ist bereits in Tranche ${firstIndexById.get(trancheId)} vergeben.`, trancheId
            ));
        } else {
            firstIndexById.set(trancheId, index);
        }
    });

    if (errors.length) throw new TrancheValidationError(errors);
    return values;
}
