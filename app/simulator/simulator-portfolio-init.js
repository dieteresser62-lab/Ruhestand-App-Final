/**
 * Module: Simulator Portfolio Init
 * Purpose: Initializing the portfolio structure.
 *          Creates initial tranches (Equity, Gold, Money Market) from inputs or detailed lists.
 * Usage: Called by simulator-portfolio.js facade.
 * Dependencies: simulator-portfolio-format.js
 */
"use strict";

import { parseDisplayNumber } from './simulator-portfolio-format.js';

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
        const sortedTranches = [...inputs.detailledTranches].sort((a, b) => {
            const dateA = a.purchaseDate ? new Date(a.purchaseDate) : new Date('1900-01-01');
            const dateB = b.purchaseDate ? new Date(b.purchaseDate) : new Date('1900-01-01');
            return dateA - dateB;
        });

        for (const tranche of sortedTranches) {
            // Normalize type/category across legacy labels.
            const rawType = String(tranche.type || tranche.kind || '').toLowerCase();
            const rawCategory = String(tranche.category || '').toLowerCase();
            let category = rawCategory;
            if (!category) {
                if (rawType.includes('gold')) {
                    category = 'gold';
                } else if (rawType.includes('geldmarkt') || rawType.includes('money')) {
                    category = 'money_market';
                } else {
                    category = 'equity';
                }
            }

            let normalizedType = rawType;
            if (category === 'gold') {
                normalizedType = 'gold';
            } else if (category === 'money_market') {
                normalizedType = 'geldmarkt';
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
            if (trancheObj.category === 'equity') {
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

    return {
        depotTranchesAktien: [...depotTranchesAktien],
        depotTranchesGold: [...depotTranchesGold],
        depotTranchesGeldmarkt: [...depotTranchesGeldmarkt],
        liquiditaet: tagesgeld + geldmarktEtf,
        tagesgeld,
        geldmarktEtf
    };
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

    return {
        depotTranchesAktien: [...depotTranchesAktien],
        depotTranchesGold: [...depotTranchesGold],
        depotTranchesGeldmarkt: [...depotTranchesGeldmarkt],
        liquiditaet: (inputs.tagesgeld || 0) + (inputs.geldmarktEtf || 0),
        tagesgeld: inputs.tagesgeld || 0,
        geldmarktEtf: inputs.geldmarktEtf || 0
    };
}
