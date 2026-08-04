import { normalizeTranche } from './tranche-contract.js';

const FLOW_TOLERANCE_EUR = 0.01;
export const PLANNED_ACTION_FLOW_EPSILON = 1e-7;
const FLOW_RECONCILIATION_EPSILON = PLANNED_ACTION_FLOW_EPSILON;

export const PLANNED_ACTION_SOURCE_KINDS = Object.freeze([
    'liquiditaet',
    'aktien_alt',
    'aktien_neu',
    'anleihe',
    'gold'
]);

export const PLANNED_ACTION_USE_KEYS = Object.freeze([
    'liquiditaet',
    'gold',
    'aktien',
    'bonds'
]);

const SOURCE_KIND_SET = new Set(PLANNED_ACTION_SOURCE_KINDS);
const USE_KEY_SET = new Set(PLANNED_ACTION_USE_KEYS);
const DETAILED_INVENTORY_KIND_SET = new Set([
    ...PLANNED_ACTION_SOURCE_KINDS.filter(kind => kind !== 'liquiditaet'),
    'geldmarkt'
]);

function isPlainObject(value) {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function invalid(reason, context = {}) {
    return { status: 'invalid', reason, context };
}

function inventoryKey(entry) {
    const trancheId = typeof entry?.trancheId === 'string'
        ? entry.trancheId.trim()
        : '';
    const sourceProfileId = typeof entry?.sourceProfileId === 'string'
        ? entry.sourceProfileId.trim()
        : '';
    return trancheId ? JSON.stringify([sourceProfileId, trancheId]) : '';
}

function validateSourceTaxEconomics(source, inventory = null) {
    const realized = source.realizedGainSigned;
    const taxable = source.taxableAfterTqfSigned;
    if (
        realized > source.brutto + FLOW_RECONCILIATION_EPSILON
        || Math.abs(taxable) > Math.abs(realized) + FLOW_RECONCILIATION_EPSILON
        || realized * taxable < -FLOW_RECONCILIATION_EPSILON
        || (taxable <= FLOW_RECONCILIATION_EPSILON
            && source.steuer > FLOW_RECONCILIATION_EPSILON)
        || source.steuer > Math.max(0, taxable) + FLOW_RECONCILIATION_EPSILON
    ) {
        return invalid('source_tax_economics_invalid', { source });
    }
    if (!inventory) return null;

    const gainQuote = inventory.marketValue > 0
        ? (inventory.marketValue - inventory.costBasis) / inventory.marketValue
        : 0;
    const expectedRealized = source.brutto * gainQuote;
    const taxableFactor = inventory.taxExempt ? 0 : (1 - inventory.tqf);
    const expectedTaxable = expectedRealized * taxableFactor;
    if (
        Math.abs(realized - expectedRealized) > FLOW_RECONCILIATION_EPSILON
        || Math.abs(taxable - expectedTaxable) > FLOW_RECONCILIATION_EPSILON
    ) {
        return invalid('source_tax_inventory_mismatch', {
            sourceKind: source.kind,
            trancheId: source.trancheId ?? null,
            realized,
            expectedRealized,
            taxable,
            expectedTaxable
        });
    }
    return null;
}

function validateSourceCapacities(assetSources, options) {
    const positiveSources = assetSources.filter(source => source.brutto > 0);
    if (!positiveSources.length) return null;

    const detailedTranches = Array.isArray(options.detailedTranches)
        ? options.detailedTranches
        : [];
    if (detailedTranches.length > 0) {
        const inventoryByLot = new Map();
        for (let index = 0; index < detailedTranches.length; index += 1) {
            let tranche;
            try {
                tranche = normalizeTranche(detailedTranches[index], { mode: 'engine', index });
            } catch (error) {
                return invalid('detailed_inventory_invalid', {
                    field: 'detailledTranches',
                    trancheIndex: index,
                    errors: Array.isArray(error?.errors) ? error.errors : []
                });
            }
            const key = inventoryKey(tranche);
            const marketValue = tranche?.marketValue;
            const costBasis = tranche?.costBasis;
            const tqf = tranche?.tqf;
            if (
                !key
                || inventoryByLot.has(key)
                || typeof tranche?.type !== 'string'
                || !DETAILED_INVENTORY_KIND_SET.has(tranche.type)
                || typeof marketValue !== 'number'
                || !Number.isFinite(marketValue)
                || marketValue < 0
                || typeof costBasis !== 'number'
                || !Number.isFinite(costBasis)
                || costBasis < 0
                || typeof tqf !== 'number'
                || !Number.isFinite(tqf)
                || tqf < 0
                || tqf > 1
                || typeof tranche?.taxExempt !== 'boolean'
            ) {
                return invalid('detailed_inventory_invalid', {
                    field: 'detailledTranches',
                    trancheIndex: index,
                    key: key || null
                });
            }
            inventoryByLot.set(key, {
                type: tranche.type,
                marketValue,
                costBasis,
                tqf,
                taxExempt: tranche.taxExempt
            });
        }

        const soldByLot = new Map();
        for (let index = 0; index < positiveSources.length; index += 1) {
            const source = positiveSources[index];
            const key = inventoryKey(source);
            const inventory = key ? inventoryByLot.get(key) : null;
            if (!inventory || inventory.type !== source.kind) {
                return invalid('source_inventory_missing', {
                    field: 'quellen',
                    sourceIndex: index,
                    key: key || null,
                    sourceKind: source.kind,
                    inventoryKind: inventory?.type ?? null
                });
            }
            if (soldByLot.has(key)) {
                return invalid('source_inventory_duplicate', {
                    field: 'quellen',
                    sourceIndex: index,
                    key
                });
            }
            if (source.brutto > inventory.marketValue + FLOW_TOLERANCE_EUR) {
                return invalid('source_inventory_overbooked', {
                    field: 'quellen',
                    key,
                    sold: source.brutto,
                    capacity: inventory.marketValue
                });
            }
            const sourceTaxError = validateSourceTaxEconomics(source, inventory);
            if (sourceTaxError) return sourceTaxError;
            soldByLot.set(key, (soldByLot.get(key) || 0) + source.brutto);
        }
        for (const [key, sold] of soldByLot.entries()) {
            const capacity = inventoryByLot.get(key).marketValue;
            if (sold > capacity + FLOW_TOLERANCE_EUR) {
                return invalid('source_inventory_overbooked', {
                    field: 'quellen',
                    key,
                    sold,
                    capacity
                });
            }
        }
        return null;
    }

    if (!isPlainObject(options.legacyCapacities)) {
        return options.requireAssetInventory === true
            ? invalid('source_inventory_missing', {
                field: 'quellen',
                sourceKinds: positiveSources.map(source => source.kind)
            })
            : null;
    }
    const soldByKind = new Map();
    for (let index = 0; index < positiveSources.length; index += 1) {
        const source = positiveSources[index];
        if (!Object.prototype.hasOwnProperty.call(options.legacyCapacities, source.kind)) {
            return invalid('legacy_source_inventory_missing', {
                field: 'quellen',
                sourceIndex: index,
                sourceKind: source.kind
            });
        }
        const metadata = options.legacyTaxMetadata?.[source.kind];
        if (
            !isPlainObject(metadata)
            || typeof metadata.costBasis !== 'number'
            || !Number.isFinite(metadata.costBasis)
            || metadata.costBasis < 0
            || typeof metadata.tqf !== 'number'
            || !Number.isFinite(metadata.tqf)
            || metadata.tqf < 0
            || metadata.tqf > 1
            || typeof metadata.taxExempt !== 'boolean'
        ) {
            return invalid('legacy_source_tax_inventory_invalid', {
                field: 'quellen',
                sourceIndex: index,
                sourceKind: source.kind
            });
        }
        const capacity = options.legacyCapacities[source.kind];
        if (typeof capacity !== 'number' || !Number.isFinite(capacity) || capacity < 0) {
            return invalid('legacy_source_inventory_invalid', {
                field: 'quellen',
                kind: source.kind,
                capacity
            });
        }
        const sourceTaxError = validateSourceTaxEconomics(source, {
            marketValue: capacity,
            ...metadata
        });
        if (sourceTaxError) return sourceTaxError;
        soldByKind.set(source.kind, (soldByKind.get(source.kind) || 0) + source.brutto);
    }
    for (const [kind, sold] of soldByKind.entries()) {
        const capacity = options.legacyCapacities[kind];
        if (typeof capacity !== 'number' || !Number.isFinite(capacity) || capacity < 0) {
            return invalid('legacy_source_inventory_invalid', {
                field: 'quellen',
                kind,
                capacity
            });
        }
        if (sold > capacity + FLOW_TOLERANCE_EUR) {
            return invalid('legacy_source_inventory_overbooked', {
                field: 'quellen',
                kind,
                sold,
                capacity
            });
        }
    }
    return null;
}

export function resolvePlannedAction(options = {}) {
    const action = options.action;
    if (!isPlainObject(action)) {
        return invalid('action_not_plain_object', {
            actionType: Array.isArray(action) ? 'array' : typeof action
        });
    }
    if (action.type !== 'TRANSACTION' && action.type !== 'NONE') {
        return invalid('action_type_unknown', { actionType: action.type });
    }

    const hasSourcesProperty = Object.prototype.hasOwnProperty.call(action, 'quellen');
    if ((action.type === 'TRANSACTION' || hasSourcesProperty) && !Array.isArray(action.quellen)) {
        return invalid('sources_not_array', {
            rawSourcesType: action.quellen === null ? 'null' : typeof action.quellen
        });
    }
    const sources = Array.isArray(action.quellen) ? action.quellen : [];
    for (let index = 0; index < sources.length; index += 1) {
        const source = sources[index];
        if (!isPlainObject(source) || !SOURCE_KIND_SET.has(source.kind)) {
            return invalid('source_shape_invalid', { sourceIndex: index, source });
        }
        if (
            typeof source.brutto !== 'number'
            || !Number.isFinite(source.brutto)
            || source.brutto < 0
            || typeof source.steuer !== 'number'
            || !Number.isFinite(source.steuer)
            || source.steuer < 0
            || source.steuer > source.brutto + FLOW_RECONCILIATION_EPSILON
            || typeof source.netto !== 'number'
            || !Number.isFinite(source.netto)
            || source.netto < 0
            || Math.abs((source.brutto - source.steuer) - source.netto) > FLOW_RECONCILIATION_EPSILON
        ) {
            return invalid('source_amount_invalid', { sourceIndex: index, source });
        }
        if (
            source.kind === 'liquiditaet'
            && (
                Math.abs(source.steuer) > FLOW_RECONCILIATION_EPSILON
                || Math.abs(source.netto - source.brutto) > FLOW_RECONCILIATION_EPSILON
            )
        ) {
            return invalid('cash_source_not_neutral', { sourceIndex: index, source });
        }
        if (
            source.kind !== 'liquiditaet'
            && (
                typeof source.realizedGainSigned !== 'number'
                || !Number.isFinite(source.realizedGainSigned)
                || typeof source.taxableAfterTqfSigned !== 'number'
                || !Number.isFinite(source.taxableAfterTqfSigned)
            )
        ) {
            return invalid('source_tax_raw_invalid', { sourceIndex: index, source });
        }
        if (
            source.kind !== 'liquiditaet'
            && source.brutto <= FLOW_RECONCILIATION_EPSILON
            && (
                Math.abs(source.steuer) > FLOW_RECONCILIATION_EPSILON
                || Math.abs(source.netto) > FLOW_RECONCILIATION_EPSILON
                || Math.abs(source.realizedGainSigned) > FLOW_RECONCILIATION_EPSILON
                || Math.abs(source.taxableAfterTqfSigned) > FLOW_RECONCILIATION_EPSILON
            )
        ) {
            return invalid('zero_gross_source_contains_tax_flow', { sourceIndex: index, source });
        }
        if (source.kind !== 'liquiditaet') {
            const sourceTaxError = validateSourceTaxEconomics(source);
            if (sourceTaxError) {
                return { ...sourceTaxError, context: { sourceIndex: index, ...sourceTaxError.context } };
            }
        }
    }

    const hasUsesProperty = Object.prototype.hasOwnProperty.call(action, 'verwendungen');
    if ((action.type === 'TRANSACTION' || hasUsesProperty) && !isPlainObject(action.verwendungen)) {
        return invalid('uses_not_plain_object', {
            rawUsesType: Array.isArray(action.verwendungen) ? 'array' : typeof action.verwendungen
        });
    }
    const uses = isPlainObject(action.verwendungen) ? action.verwendungen : {};
    const allowedUseKeySet = Array.isArray(options.allowedUseKeys)
        ? new Set(options.allowedUseKeys.filter(key => USE_KEY_SET.has(key)))
        : USE_KEY_SET;
    for (const [key, value] of Object.entries(uses)) {
        if (!allowedUseKeySet.has(key)) return invalid('use_key_unknown', { key });
        if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
            return invalid('use_amount_invalid', { key, value });
        }
    }

    const assetSources = sources.filter(source => source.kind !== 'liquiditaet');
    const cashSources = sources.filter(source => source.kind === 'liquiditaet');
    const sourceGrossTotal = sources.reduce((total, source) => total + source.brutto, 0);
    const sourceTaxTotal = sources.reduce((total, source) => total + source.steuer, 0);
    const sourceNetTotal = sources.reduce((total, source) => total + source.netto, 0);
    const assetSourceNet = assetSources.reduce((total, source) => total + source.netto, 0);
    const cashSourceGross = cashSources.reduce((total, source) => total + source.brutto, 0);
    const cashSourceTax = cashSources.reduce((total, source) => total + source.steuer, 0);
    const cashSourceNet = cashSources.reduce((total, source) => total + source.netto, 0);
    const sourceFundingTotal = assetSourceNet + cashSourceGross;
    const sourcePlanTax = assetSources.reduce((total, source) => total + source.steuer, 0);
    const sourceRealizedGainSigned = assetSources.reduce(
        (total, source) => total + source.realizedGainSigned,
        0
    );
    const sourceTaxableAfterTqfSigned = assetSources.reduce(
        (total, source) => total + source.taxableAfterTqfSigned,
        0
    );
    const useTotal = Object.values(uses).reduce((total, value) => total + value, 0);
    const plannedLiquidityInflow = uses.liquiditaet || 0;
    const hasTaxAggregate = Object.prototype.hasOwnProperty.call(action, 'taxRawAggregate');
    const aggregate = action.taxRawAggregate;

    if (
        Math.abs((sourceGrossTotal - sourceTaxTotal) - sourceNetTotal) > FLOW_RECONCILIATION_EPSILON
        || cashSourceTax > FLOW_RECONCILIATION_EPSILON
        || Math.abs(cashSourceGross - cashSourceNet) > FLOW_RECONCILIATION_EPSILON
    ) {
        return invalid('source_amount_aggregate_mismatch', {
            sourceGrossTotal,
            sourceTaxTotal,
            sourceNetTotal,
            cashSourceGross,
            cashSourceTax,
            cashSourceNet
        });
    }

    if (assetSources.length > 0 || hasTaxAggregate) {
        if (
            !isPlainObject(aggregate)
            || typeof aggregate.sumRealizedGainSigned !== 'number'
            || !Number.isFinite(aggregate.sumRealizedGainSigned)
            || typeof aggregate.sumTaxableAfterTqfSigned !== 'number'
            || !Number.isFinite(aggregate.sumTaxableAfterTqfSigned)
        ) {
            return invalid('tax_aggregate_invalid', {
                field: 'taxRawAggregate',
                taxRawAggregate: aggregate ?? null
            });
        }
        if (
            Math.abs(aggregate.sumRealizedGainSigned - sourceRealizedGainSigned) > FLOW_RECONCILIATION_EPSILON
            || Math.abs(aggregate.sumTaxableAfterTqfSigned - sourceTaxableAfterTqfSigned) > FLOW_RECONCILIATION_EPSILON
        ) {
            return invalid('tax_aggregate_source_mismatch', {
                aggregateRealizedGainSigned: aggregate.sumRealizedGainSigned,
                sourceRealizedGainSigned,
                aggregateTaxableAfterTqfSigned: aggregate.sumTaxableAfterTqfSigned,
                sourceTaxableAfterTqfSigned
            });
        }
    }

    if (action.type === 'NONE') {
        const actionNet = action.nettoErlös ?? 0;
        const actionTax = action.steuer ?? 0;
        if (
            typeof actionNet !== 'number'
            || !Number.isFinite(actionNet)
            || actionNet < 0
            || typeof actionTax !== 'number'
            || !Number.isFinite(actionTax)
            || actionTax < 0
            || sourceFundingTotal > FLOW_RECONCILIATION_EPSILON
            || useTotal > FLOW_RECONCILIATION_EPSILON
            || actionNet > FLOW_RECONCILIATION_EPSILON
            || actionTax > FLOW_RECONCILIATION_EPSILON
        ) {
            return invalid('none_action_contains_flow', {
                sourceFundingTotal,
                useTotal,
                actionNet,
                actionTax
            });
        }
        return {
            status: 'resolved',
            action,
            sources,
            uses,
            assetSources,
            cashSources,
            assetSourceNet,
            cashSourceGross,
            sourceFundingTotal,
            sourcePlanTax,
            useTotal,
            plannedLiquidityInflow,
            hasAssetSale: false
        };
    }

    if (
        typeof action.nettoErlös !== 'number'
        || !Number.isFinite(action.nettoErlös)
        || action.nettoErlös < 0
    ) {
        return invalid('action_net_invalid', { field: 'nettoErlös', value: action.nettoErlös });
    }
    const hasActionTax = Object.prototype.hasOwnProperty.call(action, 'steuer');
    if (
        (hasActionTax && (
            typeof action.steuer !== 'number'
            || !Number.isFinite(action.steuer)
            || action.steuer < 0
        ))
        || (assetSources.length > 0 && !hasActionTax)
        || (assetSources.length > 0 && Math.abs(action.steuer - sourcePlanTax) > FLOW_RECONCILIATION_EPSILON)
        || (assetSources.length === 0 && hasActionTax && action.steuer > FLOW_RECONCILIATION_EPSILON)
    ) {
        return invalid('action_tax_invalid', {
            field: 'steuer',
            value: action.steuer,
            sourcePlanTax
        });
    }
    if (plannedLiquidityInflow > assetSourceNet + FLOW_RECONCILIATION_EPSILON) {
        return invalid('liquidity_inflow_without_asset_source', {
            plannedLiquidityInflow,
            assetSourceNet
        });
    }
    if (
        Math.abs(sourceFundingTotal - useTotal) > FLOW_RECONCILIATION_EPSILON
        || Math.abs(sourceFundingTotal - action.nettoErlös) > FLOW_RECONCILIATION_EPSILON
    ) {
        return invalid('source_use_net_mismatch', {
            sourceFundingTotal,
            useTotal,
            actionNet: action.nettoErlös
        });
    }

    const capacityError = validateSourceCapacities(assetSources, options);
    if (capacityError) return capacityError;

    if (Number.isFinite(options.availableLiquidity)) {
        const liquidityAfterAction = options.availableLiquidity
            + plannedLiquidityInflow
            - cashSourceGross;
        if (liquidityAfterAction < -FLOW_RECONCILIATION_EPSILON) {
            return invalid('cash_source_overbooked', {
                availableLiquidity: options.availableLiquidity,
                plannedLiquidityInflow,
                cashSourceGross,
                liquidityAfterAction
            });
        }
    }

    return {
        status: 'resolved',
        action,
        sources,
        uses,
        assetSources,
        cashSources,
        assetSourceNet,
        cashSourceGross,
        sourceFundingTotal,
        sourcePlanTax,
        sourceRealizedGainSigned,
        sourceTaxableAfterTqfSigned,
        useTotal,
        plannedLiquidityInflow,
        hasAssetSale: assetSources.length > 0
    };
}
