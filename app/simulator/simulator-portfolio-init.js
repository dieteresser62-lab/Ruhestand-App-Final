/**
 * Module: Simulator Portfolio Init
 * Purpose: Initializing the portfolio structure.
 *          Creates initial tranches (Equity, Gold, Money Market) from inputs or detailed lists.
 * Usage: Called by simulator-portfolio.js facade.
 * Dependencies: simulator-portfolio-format.js
 */
"use strict";

import { parseDisplayNumber } from './simulator-portfolio-format.js';
import { normalizeProfileHealthBucket } from '../profile/profile-state.js';

const FIFO_FALLBACK_DATE_MS = Date.parse('1900-01-01');

function toSortableDateMs(value) {
    if (!value) return FIFO_FALLBACK_DATE_MS;
    const parsed = Date.parse(String(value));
    return Number.isFinite(parsed) ? parsed : FIFO_FALLBACK_DATE_MS;
}

function sumMarketValue(tranches) {
    return Array.isArray(tranches)
        ? tranches.reduce((sum, tranche) => sum + (Number(tranche?.marketValue) || 0), 0)
        : 0;
}

function reduceTrancheByAmount(tranche, amount) {
    const marketValue = Number(tranche.marketValue) || 0;
    if (amount <= 0 || marketValue <= 0) return null;

    const take = Math.min(amount, marketValue);
    const ratio = take / marketValue;
    const costBasis = Number(tranche.costBasis) || 0;
    const shares = Number(tranche.shares) || 0;
    const carved = {
        ...tranche,
        marketValue: take,
        costBasis: costBasis * ratio,
        shares: shares > 0 ? shares * ratio : shares
    };

    tranche.marketValue = marketValue - take;
    tranche.costBasis = Math.max(0, costBasis - carved.costBasis);
    if (shares > 0) tranche.shares = Math.max(0, shares - carved.shares);

    return { take, carved };
}

function resolveHealthBucketConfig(inputs = {}) {
    const source = inputs.healthBucket && typeof inputs.healthBucket === 'object'
        ? inputs.healthBucket
        : {
            enabled: inputs.healthBucketEnabled,
            initialAmount: inputs.healthBucketInitialAmount,
            assetSource: inputs.healthBucketAssetSource,
            triggerMinGrade: inputs.healthBucketTriggerMinGrade,
            triggerMode: inputs.healthBucketTriggerMode,
            coverageMode: inputs.healthBucketCoverageMode,
            returnMode: inputs.healthBucketReturnMode,
            targetMode: inputs.healthBucketTargetMode
        };
    return normalizeProfileHealthBucket(source);
}

export function carveOutHealthBucketFromPortfolio(portfolio, inputs = {}) {
    const config = resolveHealthBucketConfig(inputs);
    const requested = config.enabled ? Math.max(0, Number(config.initialAmount) || 0) : 0;
    const initialMoneyMarket = Number(portfolio.geldmarktEtf) || 0;
    const initialCash = Number(portfolio.tagesgeld) || 0;
    const initialLiquiditaet = Number(portfolio.liquiditaet) || (initialMoneyMarket + initialCash);
    const moneyMarketTranches = Array.isArray(portfolio.depotTranchesGeldmarkt)
        ? portfolio.depotTranchesGeldmarkt
        : [];
    const initialTrancheMoneyMarket = sumMarketValue(moneyMarketTranches);

    const meta = {
        enabled: config.enabled,
        requestedAmount: requested,
        used: 0,
        usedFromMoneyMarket: 0,
        usedFromCash: 0,
        shortfall: 0,
        capped: false,
        warnings: []
    };

    portfolio.healthBucketConfig = config;
    portfolio.healthBucketGeldmarkt = 0;
    portfolio.healthBucketTranches = [];
    portfolio.healthBucketCashAmount = 0;
    portfolio.healthBucketMeta = meta;

    if (!config.enabled || requested <= 0) {
        return meta;
    }

    let remaining = requested;

    moneyMarketTranches.sort((a, b) => toSortableDateMs(a?.purchaseDate) - toSortableDateMs(b?.purchaseDate));

    for (const tranche of moneyMarketTranches) {
        if (remaining <= 0) break;
        const result = reduceTrancheByAmount(tranche, remaining);
        if (!result) continue;
        portfolio.healthBucketTranches.push(result.carved);
        remaining -= result.take;
    }

    portfolio.depotTranchesGeldmarkt = moneyMarketTranches.filter(t => (Number(t.marketValue) || 0) > 0.01);

    const usedFromTranches = requested - remaining;
    const untranchedMoneyMarket = Math.max(0, initialMoneyMarket - initialTrancheMoneyMarket);
    const usedFromUntranchedMoneyMarket = Math.min(remaining, untranchedMoneyMarket);
    if (usedFromUntranchedMoneyMarket > 0) {
        portfolio.healthBucketTranches.push({
            marketValue: usedFromUntranchedMoneyMarket,
            costBasis: usedFromUntranchedMoneyMarket,
            tqf: 0,
            type: 'geldmarkt',
            category: 'money_market',
            name: 'Geldmarkt (aggregiert)',
            purchaseDate: null
        });
        remaining -= usedFromUntranchedMoneyMarket;
    }

    const usedFromMoneyMarket = usedFromTranches + usedFromUntranchedMoneyMarket;
    const usedFromCash = Math.min(remaining, initialCash);
    remaining -= usedFromCash;

    const used = requested - remaining;
    portfolio.healthBucketGeldmarkt = used;
    portfolio.healthBucketCashAmount = usedFromCash;
    portfolio.geldmarktEtf = Math.max(0, initialMoneyMarket - usedFromMoneyMarket);
    portfolio.tagesgeld = Math.max(0, initialCash - usedFromCash);
    portfolio.liquiditaet = Math.max(0, initialLiquiditaet - used);

    meta.used = used;
    meta.usedFromMoneyMarket = usedFromMoneyMarket;
    meta.usedFromCash = usedFromCash;
    meta.shortfall = remaining;
    meta.capped = remaining > 0;
    if (meta.capped) {
        meta.warnings.push(`Pflegebucket auf verfuegbare Liquiditaet gekappt: ${Math.round(used)} von ${Math.round(requested)} EUR.`);
    }

    return meta;
}

function withHealthBucketCarveOut(portfolio, inputs) {
    carveOutHealthBucketFromPortfolio(portfolio, inputs);
    return portfolio;
}

/**
 * Initialisiert das Portfolio mit detaillierten Tranchen (erweiterte Logik)
 * Unterstützt mehrere individuelle Positionen mit FIFO-Tracking
 */
export function initializePortfolioDetailed(inputs) {
    let depotTranchesAktien = [];
    let depotTranchesGold = [];
    let depotTranchesGeldmarkt = [];

    // Falls detaillierte Tranchen in inputs vorhanden sind, diese verwenden
    if (inputs.detailledTranches && Array.isArray(inputs.detailledTranches)) {
        // Sortiere nach Kaufdatum (FIFO)
        const sortedTranches = [...inputs.detailledTranches].sort((a, b) => toSortableDateMs(a?.purchaseDate) - toSortableDateMs(b?.purchaseDate));

        for (const tranche of sortedTranches) {
            // Normalize type/category across legacy labels.
            const rawType = String(tranche.type || tranche.kind || '').toLowerCase();
            const rawCategory = String(tranche.category || '').toLowerCase();
            const isBond = rawType.includes('bond') || rawType.includes('anleihe') || rawCategory.includes('bond') || rawCategory.includes('anleihe');
            let category = rawCategory;
            if (!category) {
                if (rawType.includes('gold')) {
                    category = 'gold';
                } else if (rawType.includes('geldmarkt') || rawType.includes('money')) {
                    category = 'money_market';
                } else if (isBond) {
                    category = 'bonds';
                } else {
                    category = 'equity';
                }
            }

            let normalizedType = rawType;
            if (category === 'gold') {
                normalizedType = 'gold';
            } else if (category === 'money_market') {
                normalizedType = 'geldmarkt';
            } else if (category === 'bonds' || isBond) {
                normalizedType = 'anleihe';
                category = 'bonds';
            } else if (category === 'equity') {
                if (rawType === 'aktien_neu' || rawType === 'aktien_alt') {
                    normalizedType = rawType;
                } else if (rawType.includes('neu')) {
                    normalizedType = 'aktien_neu';
                } else {
                    normalizedType = 'aktien_alt';
                }
            }

            // Derive missing price/value fields from shares where possible.
            const shares = parseDisplayNumber(tranche.shares);
            const purchasePriceRaw = parseDisplayNumber(tranche.purchasePrice);
            const currentPriceRaw = parseDisplayNumber(tranche.currentPrice || tranche.purchasePrice);
            const marketValueRaw = parseDisplayNumber(tranche.marketValue);
            const costBasisRaw = parseDisplayNumber(tranche.costBasis);
            const purchasePrice = purchasePriceRaw > 0 ? purchasePriceRaw : 0;
            const currentPrice = currentPriceRaw > 0 ? currentPriceRaw
                : (shares > 0 && marketValueRaw > 0 ? marketValueRaw / shares : 0);
            const marketValue = marketValueRaw > 0 ? marketValueRaw : (shares * currentPrice);
            const costBasis = costBasisRaw > 0 ? costBasisRaw : (shares * purchasePrice);
            const trancheObj = {
                trancheId: tranche.trancheId || tranche.id || null,
                name: tranche.name || 'Unbekannt',
                isin: tranche.isin || '',
                shares,
                purchasePrice,
                purchaseDate: tranche.purchaseDate || null,
                currentPrice,
                marketValue,
                costBasis,
                tqf: Number(tranche.tqf) ?? 0.30,
                type: normalizedType || 'aktien_alt',
                category
            };

            // Kategorisierung
            if (trancheObj.category === 'equity' || trancheObj.category === 'bonds') {
                depotTranchesAktien.push(trancheObj);
            } else if (trancheObj.category === 'gold') {
                depotTranchesGold.push(trancheObj);
            } else if (trancheObj.category === 'money_market') {
                depotTranchesGeldmarkt.push(trancheObj);
            }
        }
    }

    // Fallback auf alte Logik, wenn keine detaillierten Tranchen vorhanden
    if (depotTranchesAktien.length === 0) {
        // Aggregate legacy fields into synthetic tranches.
        const startLiquiditaet = (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0);
        const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
        const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - startLiquiditaet);
        const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
        const zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
        const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);

        if (inputs.depotwertAlt > 1) {
            depotTranchesAktien.push({
                marketValue: inputs.depotwertAlt,
                costBasis: inputs.einstandAlt,
                tqf: 0.30,
                type: 'aktien_alt',
                name: 'Altbestand (aggregiert)',
                purchaseDate: null
            });
        }
        if (depotwertNeu > 1) {
            depotTranchesAktien.push({
                marketValue: depotwertNeu,
                costBasis: depotwertNeu,
                tqf: 0.30,
                type: 'aktien_neu',
                name: 'Neubestand (aggregiert)',
                purchaseDate: null
            });
        }
        if (inputs.geldmarktEtf > 1) {
            depotTranchesGeldmarkt.push({
                marketValue: inputs.geldmarktEtf,
                costBasis: inputs.geldmarktEtf,
                tqf: 0,
                type: 'geldmarkt',
                name: 'Geldmarkt',
                purchaseDate: null
            });
        }
        if (zielwertGold > 1) {
            depotTranchesGold.push({
                marketValue: zielwertGold,
                costBasis: zielwertGold,
                tqf: inputs.goldSteuerfrei ? 1.0 : 0.0,
                type: 'gold',
                name: 'Gold',
                purchaseDate: null
            });
        }
    }

    const geldmarktSum = depotTranchesGeldmarkt.reduce((sum, t) => sum + (Number(t.marketValue) || 0), 0);
    const geldmarktEtf = geldmarktSum > 0 ? geldmarktSum : (inputs.geldmarktEtf || 0);
    const tagesgeld = inputs.tagesgeld || 0;

    return withHealthBucketCarveOut({
        depotTranchesAktien: [...depotTranchesAktien],
        depotTranchesGold: [...depotTranchesGold],
        depotTranchesGeldmarkt: [...depotTranchesGeldmarkt],
        liquiditaet: tagesgeld + geldmarktEtf,
        tagesgeld,
        geldmarktEtf
    }, inputs);
}

/**
 * Initialisiert das Portfolio mit Tranchen (Legacy-Kompatibilität)
 */
export function initializePortfolio(inputs) {
    // Falls detaillierte Tranchen vorhanden, nutze erweiterte Funktion
    if (inputs.detailledTranches && Array.isArray(inputs.detailledTranches)) {
        return initializePortfolioDetailed(inputs);
    }

    // Sonst alte Logik
    let depotTranchesAktien = [];
    let depotTranchesGold = [];
    let depotTranchesGeldmarkt = [];

    const startLiquiditaet = (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0);
    const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
    const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - startLiquiditaet);
    const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
    const zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
    const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);

    if (inputs.depotwertAlt > 1) {
        depotTranchesAktien.push({ marketValue: inputs.depotwertAlt, costBasis: inputs.einstandAlt, tqf: 0.30, type: 'aktien_alt' });
    }
    if (depotwertNeu > 1) {
        depotTranchesAktien.push({ marketValue: depotwertNeu, costBasis: depotwertNeu, tqf: 0.30, type: 'aktien_neu' });
    }
    if (inputs.geldmarktEtf > 1) {
        depotTranchesGeldmarkt.push({ marketValue: inputs.geldmarktEtf, costBasis: inputs.geldmarktEtf, tqf: 0, type: 'geldmarkt' });
    }
    if (zielwertGold > 1) {
        depotTranchesGold.push({ marketValue: zielwertGold, costBasis: zielwertGold, tqf: inputs.goldSteuerfrei ? 1.0 : 0.0, type: 'gold' });
    }

    return withHealthBucketCarveOut({
        depotTranchesAktien: [...depotTranchesAktien],
        depotTranchesGold: [...depotTranchesGold],
        depotTranchesGeldmarkt: [...depotTranchesGeldmarkt],
        liquiditaet: (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0),
        tagesgeld: inputs.tagesgeld || 0,
        geldmarktEtf: inputs.geldmarktEtf || 0
    }, inputs);
}
