"use strict";

import { CONFIG } from './engine/config.mjs';
import { MarketAnalyzer } from './engine/analyzers/MarketAnalyzer.mjs';
import TransactionEngine from './engine/transactions/TransactionEngine.mjs';

/**
 * Stellt sicher, dass ein Wert eine nicht-negative Zahl ist
 * @param {*} x - Eingabewert
 * @returns {number} Wert >= 0
 */
export function euros(x) {
    return Math.max(0, Number(x) || 0);
}

/**
 * Berechnet die benötigte Liquidität für den Floor-Bedarf.
 */
export function computeLiqNeedForFloor(ctx) {
    const hasInflatedFloor = ctx.inflatedFloor !== undefined && ctx.inflatedFloor !== null;
    const normalizedStartFloor = euros(ctx.inputs?.startFloorBedarf ?? 0);
    const floorBasis = hasInflatedFloor ? euros(ctx.inflatedFloor) : normalizedStartFloor;

    if (hasInflatedFloor && floorBasis === 0) {
        return 0;
    }

    const floorMonthlyNet = euros(Number(floorBasis) / 12);
    const runwayTargetMonths = Number.isFinite(ctx?.inputs?.runwayTargetMonths) ? ctx.inputs.runwayTargetMonths : 12;
    const runwayTargetSafe = runwayTargetMonths > 0 ? runwayTargetMonths : 12;

    return euros(runwayTargetSafe * floorMonthlyNet);
}

/**
 * Stellt sicher, dass simulateOneYear immer valide Haushaltsdaten erhält.
 */
export function normalizeHouseholdContext(context) {
    const defaultContext = {
        p1Alive: true,
        p2Alive: true,
        widowBenefits: {
            p1FromP2: false,
            p2FromP1: false
        }
    };
    if (!context) return defaultContext;
    return {
        p1Alive: context.p1Alive !== false,
        p2Alive: context.p2Alive !== false,
        widowBenefits: {
            p1FromP2: !!context?.widowBenefits?.p1FromP2,
            p2FromP1: !!context?.widowBenefits?.p2FromP1
        }
    };
}

export function calculateTargetLiquidityBalanceLike(inputs, marketData, floorBedarf, flexBedarf, pensionAnnual) {
    const profil = CONFIG.PROFIL_MAP[inputs?.risikoprofil] || CONFIG.PROFIL_MAP['sicherheits-dynamisch'];
    const market = MarketAnalyzer.analyzeMarket({
        ...marketData,
        inflation: marketData?.inflation ?? 0,
        capeRatio: marketData?.capeRatio ?? inputs?.marketCapeRatio ?? 0
    });

    const renteJahr = Number(pensionAnnual) || 0;
    const pensionSurplus = Math.max(0, renteJahr - floorBedarf);
    const inflatedBedarf = {
        floor: Math.max(0, floorBedarf - renteJahr),
        flex: Math.max(0, flexBedarf - pensionSurplus)
    };

    const inputForTarget = {
        ...inputs,
        floorBedarf,
        flexBedarf,
        renteAktiv: renteJahr > 0,
        renteMonatlich: renteJahr / 12
    };

    return TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf, inputForTarget);
}

export function buildDetailedTranchesFromPortfolio(portfolio) {
    const list = [];
    const pushTranche = (t, fallbackCategory) => {
        if (!t) return;
        const type = t.type || t.kind || '';
        const category = t.category
            || (type === 'gold' ? 'gold' : (type === 'geldmarkt' ? 'money_market' : (fallbackCategory || 'equity')));
        list.push({
            trancheId: t.trancheId || null,
            name: t.name || null,
            isin: t.isin || null,
            shares: Number(t.shares) || 0,
            purchasePrice: Number(t.purchasePrice) || 0,
            purchaseDate: t.purchaseDate || null,
            currentPrice: Number(t.currentPrice) || 0,
            marketValue: Number(t.marketValue) || 0,
            costBasis: Number(t.costBasis) || 0,
            tqf: Number.isFinite(Number(t.tqf)) ? Number(t.tqf) : 0.30,
            type: type || (fallbackCategory === 'gold' ? 'gold' : (fallbackCategory === 'money_market' ? 'geldmarkt' : 'aktien_alt')),
            category
        });
    };

    (portfolio?.depotTranchesAktien || []).forEach(t => pushTranche(t, 'equity'));
    (portfolio?.depotTranchesGold || []).forEach(t => pushTranche(t, 'gold'));
    (portfolio?.depotTranchesGeldmarkt || []).forEach(t => pushTranche(t, 'money_market'));

    return list;
}

/**
 * Hilfsfunktion für CAPE-Ratio Resolution
 */
export function resolveCapeRatio(yearSpecificCape, inputCape, historicalCape) {
    if (typeof yearSpecificCape === 'number' && Number.isFinite(yearSpecificCape) && yearSpecificCape > 0) {
        return yearSpecificCape;
    }
    if (typeof inputCape === 'number' && Number.isFinite(inputCape) && inputCape > 0) {
        return inputCape;
    }
    if (typeof historicalCape === 'number' && Number.isFinite(historicalCape) && historicalCape > 0) {
        return historicalCape;
    }
    return 0;
}
