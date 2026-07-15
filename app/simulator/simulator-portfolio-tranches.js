/**
 * Module: Simulator Portfolio Tranches
 * Purpose: Low-level operations on portfolio tranches.
 *          Sorting (FIFO, Tax-Optimized), tax calculation, and executing sales.
 * Usage: Called by simulator-portfolio.js facade.
 * Dependencies: None (pure logic)
 */
"use strict";

const SOLD_EPSILON = 1e-9;

export function isBondKind(typeOrCategory) {
    const s = String(typeOrCategory || '').toLowerCase();
    return s.includes('bond') || s.includes('anleihe');
}

function reduceTranche(tranche, requestedAmount) {
    const marketValue = Math.max(0, Number(tranche?.marketValue) || 0);
    const reduction = Math.min(Math.max(0, Number(requestedAmount) || 0), marketValue);
    if (reduction <= 0) return 0;

    const ratio = marketValue > 0 ? reduction / marketValue : 0;
    const costBasis = Math.max(0, Number(tranche.costBasis) || 0);
    let shares = null;
    if (Object.prototype.hasOwnProperty.call(tranche, 'shares')) {
        shares = Number(tranche.shares);
        if (!Number.isFinite(shares) || shares < 0) {
            const error = new Error('Eine Simulations-Tranche mit Stueckzahl muss eine endliche, nicht-negative Stueckzahl besitzen.');
            error.code = 'SIMULATION_LOT_SHARES_INVALID';
            throw error;
        }
    }

    tranche.marketValue = Math.max(0, marketValue - reduction);
    tranche.costBasis = Math.max(0, costBasis - (costBasis * ratio));
    if (shares !== null) {
        tranche.shares = Math.max(0, shares - (shares * ratio));
    }

    if (tranche.marketValue <= SOLD_EPSILON) {
        tranche.marketValue = 0;
        tranche.costBasis = 0;
        if (Object.prototype.hasOwnProperty.call(tranche, 'shares')) tranche.shares = 0;
        tranche.simulationLotStatus = 'sold';
    }
    return reduction;
}

function portfolioTranches(portfolio) {
    return [
        ...(Array.isArray(portfolio?.depotTranchesAktien) ? portfolio.depotTranchesAktien : []),
        ...(Array.isArray(portfolio?.depotTranchesGold) ? portfolio.depotTranchesGold : []),
        ...(Array.isArray(portfolio?.depotTranchesGeldmarkt) ? portfolio.depotTranchesGeldmarkt : [])
    ];
}

function createSimulationLot(portfolio, amount, assetKind) {
    const value = Number(amount);
    if (!Number.isFinite(value) || value <= 0) return null;

    const sourceProfileId = String(portfolio?.simulationSourceProfileId || 'simulation').trim() || 'simulation';
    const purchaseDate = /^\d{4}-\d{2}-\d{2}$/.test(String(portfolio?.simulationDate || ''))
        ? String(portfolio.simulationDate)
        : '1970-01-01';
    const encodedSource = encodeURIComponent(sourceProfileId);
    const existingIds = new Set(portfolioTranches(portfolio).map(tranche => String(tranche?.trancheId || '')));
    let sequence = Number.isInteger(portfolio.simulationLotSequence)
        ? portfolio.simulationLotSequence + 1
        : 1;
    let trancheId = `simlot:${encodedSource}:${purchaseDate}:${assetKind}:${sequence}`;
    while (existingIds.has(trancheId)) {
        sequence += 1;
        trancheId = `simlot:${encodedSource}:${purchaseDate}:${assetKind}:${sequence}`;
    }
    portfolio.simulationLotSequence = sequence;

    const isGold = assetKind === 'gold';
    return {
        schemaVersion: 1,
        trancheId,
        sourceProfileId,
        name: isGold ? 'Simulierter Goldkauf' : 'Simulierter Aktienkauf',
        isin: '',
        ticker: '',
        shares: value,
        purchasePrice: 1,
        currentPrice: 1,
        purchaseDate,
        marketValue: value,
        costBasis: value,
        tqf: isGold ? (Number(portfolio.simulationGoldTqf) || 0) : 0.30,
        type: isGold ? 'gold' : 'aktien_neu',
        category: isGold ? 'gold' : 'equity',
        simulationLotStatus: 'open'
    };
}

/**
 * Sortiert Tranchen nach FIFO-Prinzip (First In, First Out)
 * Älteste Käufe (nach Datum) werden zuerst verkauft (gesetzlich vorgeschrieben)
 */
export function sortTranchesFIFO(tranches) {
    return [...tranches].sort((a, b) => {
        const dateA = a.purchaseDate ? new Date(a.purchaseDate) : new Date('1900-01-01');
        const dateB = b.purchaseDate ? new Date(b.purchaseDate) : new Date('1900-01-01');
        return dateA - dateB;
    });
}

/**
 * Sortiert Tranchen nach steuerlicher Effizienz (niedrigste Steuerlast zuerst)
 * Berücksichtigt Gewinnquote und Teilfreistellung
 */
export function sortTranchesTaxOptimized(tranches) {
    return [...tranches].sort((a, b) => {
        const gqA = a.marketValue > 0 ? Math.max(0, (a.marketValue - a.costBasis) / a.marketValue) : 0;
        const gqB = b.marketValue > 0 ? Math.max(0, (b.marketValue - b.costBasis) / b.marketValue) : 0;
        const taxLoadA = gqA * (1 - (a.tqf || 0));
        const taxLoadB = gqB * (1 - (b.tqf || 0));
        return taxLoadA - taxLoadB;
    });
}

/**
 * Berechnet die Gesamtsteuer für einen hypothetischen Verkauf einer Tranche
 * @param {object} tranche - Die zu verkaufende Tranche
 * @param {number} sellAmount - Verkaufsbetrag (Marktwert)
 * @param {number} sparerPauschbetrag - Verfügbarer Sparer-Pauschbetrag
 * @param {number} kirchensteuerSatz - Kirchensteuersatz (z.B. 0.09 für 9%)
 * @returns {{steuer: number, netto: number, pauschbetragUsed: number}}
 */
export function calculateTrancheTax(tranche, sellAmount, sparerPauschbetrag, kirchensteuerSatz) {
    const keSt = 0.25 * (1 + 0.055 + (kirchensteuerSatz || 0));

    const marketValue = tranche.marketValue || 0;
    const costBasis = tranche.costBasis || 0;
    const tqf = tranche.tqf || 0;

    if (marketValue <= 0 || sellAmount <= 0) {
        return { steuer: 0, netto: sellAmount, pauschbetragUsed: 0 };
    }

    // Gewinnquote berechnen
    const gewinnQuote = Math.max(0, (marketValue - costBasis) / marketValue);

    // Bruttogewinn für den Verkaufsbetrag
    const bruttogewinn = sellAmount * gewinnQuote;

    // Teilfreistellung anwenden
    const gewinnNachTFS = bruttogewinn * (1 - tqf);

    // Sparer-Pauschbetrag anwenden
    const anrechenbarerPauschbetrag = Math.min(sparerPauschbetrag, gewinnNachTFS);
    const finaleSteuerbasis = Math.max(0, gewinnNachTFS - anrechenbarerPauschbetrag);

    // Steuer berechnen
    const steuer = finaleSteuerbasis * keSt;
    const netto = sellAmount - steuer;

    return {
        steuer: steuer,
        netto: netto,
        pauschbetragUsed: anrechenbarerPauschbetrag
    };
}

/**
 * Wendet Verkaufsergebnis auf Portfolio an
 */
export function applySaleToPortfolio(portfolio, saleResult) {
    if (!saleResult || !saleResult.breakdown) return;
    // Normalize asset kinds to keep legacy names compatible.
    const normalizeKind = (kind) => String(kind || '').toLowerCase();
    const isEquityKind = (kind) => kind.startsWith('aktien')
        || kind === 'equity'
        || kind === 'stocks'
        || kind === 'stock'
        || kind === 'etf'
        || kind.includes('etf')
        || kind === 'fonds'
        || kind === 'fund';
    const isGoldKind = (kind) => kind.startsWith('gold');
    const isBondSaleKind = (kind) => isBondKind(kind) || kind === 'bonds';
    const isMoneyKind = (kind) => kind.startsWith('geldmarkt') || kind === 'money_market' || kind === 'money market';
    const logDebug = () => { };

    const trimId = (value) => String(value || '').trim();
    const findTrancheById = (saleItem) => {
        const trancheId = trimId(saleItem?.trancheId);
        if (!trancheId) return null;
        const sourceProfileId = trimId(saleItem?.sourceProfileId);
        const matches = portfolioTranches(portfolio).filter(tranche => (
            trimId(tranche?.trancheId) === trancheId
            && (!sourceProfileId || trimId(tranche?.sourceProfileId) === sourceProfileId)
        ));
        if (matches.length > 1) {
            const error = new Error(`Tranche ${trancheId} ist ohne eindeutige Profilherkunft nicht aufloesbar.`);
            error.code = 'SIMULATION_LOT_PROVENANCE_AMBIGUOUS';
            throw error;
        }
        return matches[0] || null;
    };
    // Fallback to ISIN/name matching when no id is present.
    const profileMatches = (tranche, saleItem) => {
        const sourceProfileId = trimId(saleItem?.sourceProfileId);
        return !sourceProfileId || trimId(tranche?.sourceProfileId) === sourceProfileId;
    };
    const findTrancheByMeta = (tranches, saleItem) => {
        if (!Array.isArray(tranches) || !tranches.length) return null;
        const isin = trimId(saleItem.isin);
        const name = trimId(saleItem.name);
        if (isin) {
            const match = tranches.find(t => profileMatches(t, saleItem) && trimId(t.isin) === isin);
            if (match) return match;
        }
        if (name) {
            const match = tranches.find(t => profileMatches(t, saleItem) && trimId(t.name) === name);
            if (match) return match;
        }
        return null;
    };
    const findTranchesByMeta = (tranches, saleItem) => {
        if (!Array.isArray(tranches) || !tranches.length) return [];
        const isin = trimId(saleItem.isin);
        const name = trimId(saleItem.name);
        if (isin) {
            const matches = tranches.filter(t => profileMatches(t, saleItem) && trimId(t.isin) === isin);
            if (matches.length) return matches;
        }
        if (name) {
            const matches = tranches.filter(t => profileMatches(t, saleItem) && trimId(t.name) === name);
            if (matches.length) return matches;
        }
        return [];
    };
    // Apply a sale across multiple tranches, optionally FIFO-sorted.
    const reduceAcrossTranches = (tranches, amount, useFifo) => {
        let remaining = Number(amount) || 0;
        if (!Array.isArray(tranches) || remaining <= 0) return;
        const ordered = useFifo ? sortTranchesFIFO(tranches) : tranches;
        for (const t of ordered) {
            if (remaining <= 0) break;
            remaining -= reduceTranche(t, remaining);
        }
    };

    const processedLots = new WeakSet();
    saleResult.breakdown.forEach(saleItem => {
        if (!saleItem.kind || saleItem.kind === 'liquiditaet') return; // Skip liquidity or invalid items
        const explicitTrancheId = trimId(saleItem.trancheId);
        let tranche = findTrancheById(saleItem);
        if (explicitTrancheId && !tranche) return;
        if (!tranche) {
            const kind = normalizeKind(saleItem.kind);
            const category = normalizeKind(saleItem.category);
            const isEquitySale = isEquityKind(kind) || category === 'equity';
            const isBondSale = isBondSaleKind(kind) || category === 'bonds';
            const tranches = isEquitySale || isBondSale
                ? portfolio.depotTranchesAktien
                : (isGoldKind(kind) ? portfolio.depotTranchesGold : (isMoneyKind(kind) ? portfolio.depotTranchesGeldmarkt : null));
            if (tranches && tranches.length) {
                const normalizedType = normalizeKind(saleItem.kind);
                const assetPool = isEquitySale
                    ? tranches.filter(t => !isBondKind(t?.type) && !isBondKind(t?.category))
                    : (isBondSale
                        ? tranches.filter(t => isBondKind(t?.type) || isBondKind(t?.category))
                        : tranches);
                const matchingByType = assetPool.filter(t => normalizeKind(t.type) === normalizedType);
                const pool = matchingByType.length ? matchingByType : assetPool;
                if (!pool.length) return;
                const metaMatches = findTranchesByMeta(pool, saleItem);
                if (metaMatches.length > 1) {
                    const sourceProfiles = new Set(metaMatches.map(t => trimId(t.sourceProfileId)));
                    if (!trimId(saleItem.sourceProfileId) && sourceProfiles.size > 1) {
                        const error = new Error('Ein profiluebergreifender FIFO-Verkauf ohne sourceProfileId ist nicht eindeutig.');
                        error.code = 'SIMULATION_LOT_PROVENANCE_AMBIGUOUS';
                        throw error;
                    }
                    // Distribute across identical-name/ISIN tranches to prevent repeated hits on the first match.
                    reduceAcrossTranches(metaMatches, saleItem.brutto, isEquityKind(kind));
                    return;
                }
                tranche = metaMatches.length === 1 ? metaMatches[0] : findTrancheByMeta(pool, saleItem);
                if (!tranche) {
                    // Fallback: reduce across all matching tranches to avoid "phantom sales".
                    reduceAcrossTranches(pool, saleItem.brutto, isEquityKind(kind));
                    return;
                }
            }
        }
        if (tranche) {
            if (processedLots.has(tranche)) return;
            reduceTranche(tranche, saleItem.brutto);
            processedLots.add(tranche);
        }
    });
}

/**
 * Fasst Verkäufe nach Asset-Typ zusammen
 */
export function summarizeSalesByAsset(saleResult) {
    const sums = { vkAkt: 0, vkGld: 0, vkBnd: 0, stAkt: 0, stGld: 0, stBnd: 0, vkGes: 0, stGes: 0 };
    if (!saleResult || !Array.isArray(saleResult.breakdown)) return sums;
    for (const item of saleResult.breakdown) {
        if (!item.kind || item.kind === 'liquiditaet') continue;
        const isAktie = String(item.kind || '').startsWith('aktien');
        const isBond = isBondKind(item.kind) || String(item.category || '').toLowerCase() === 'bonds';
        const brutto = +item.brutto || 0;
        const steuer = (item.steuer != null) ? (+item.steuer) : 0;
        if (isAktie) { sums.vkAkt += brutto; sums.stAkt += steuer; }
        else if (isBond) { sums.vkBnd += brutto; sums.stBnd += steuer; }
        else { sums.vkGld += brutto; sums.stGld += steuer; }
        sums.vkGes += brutto; sums.stGes += steuer;
    }
    if (sums.stGes === 0 && saleResult.steuerGesamt > 0 && (sums.vkAkt + sums.vkGld + sums.vkBnd) > 0) {
        const tot = sums.vkAkt + sums.vkGld + sums.vkBnd; const ges = saleResult.steuerGesamt;
        sums.stAkt = ges * (sums.vkAkt / tot); sums.stGld = ges * (sums.vkGld / tot); sums.stBnd = ges * (sums.vkBnd / tot); sums.stGes = ges;
    } else if (saleResult.steuerGesamt > 0 && Math.abs(sums.stGes - saleResult.steuerGesamt) > 1e-6) {
        sums.stGes = saleResult.steuerGesamt;
    }
    return sums;
}

/**
 * Konvertiert Portfolio-Status zurück in Input-Kontext
 */
export function buildInputsCtxFromPortfolio(inputs, portfolio, { pensionAnnual, marketData }) {
    const sumByType = (arr, type) => {
        const list = Array.isArray(arr) ? arr : [];
        return list.reduce((acc, t) => {
            if (t.type === type) {
                acc.marketValue += Number(t.marketValue) || 0;
                acc.costBasis += Number(t.costBasis) || 0;
            }
            return acc;
        }, { marketValue: 0, costBasis: 0 });
    };

    const aktAlt = sumByType(portfolio.depotTranchesAktien, 'aktien_alt');
    const aktNeu = sumByType(portfolio.depotTranchesAktien, 'aktien_neu');
    const bond = (Array.isArray(portfolio?.depotTranchesAktien) ? portfolio.depotTranchesAktien : []).reduce((acc, t) => {
        if (!isBondKind(t?.type) && !isBondKind(t?.category)) return acc;
        acc.marketValue += Number(t.marketValue) || 0;
        acc.costBasis += Number(t.costBasis) || 0;
        return acc;
    }, { marketValue: 0, costBasis: 0 });
    const gTr = sumByType(portfolio.depotTranchesGold, 'gold');

    const gmm = sumByType(portfolio.depotTranchesGeldmarkt, 'geldmarkt');
    const geldmarktEtf = Number(portfolio.geldmarktEtf) || gmm.marketValue || 0;
    const tagesgeld = Number(portfolio.tagesgeld) || Math.max(0, (portfolio.liquiditaet || 0) - geldmarktEtf);

    return {
        ...inputs,
        tagesgeld,
        geldmarktEtf,
        depotwertAlt: aktAlt.marketValue, costBasisAlt: aktAlt.costBasis, tqfAlt: 0.30,
        depotwertNeu: aktNeu.marketValue + bond.marketValue, costBasisNeu: aktNeu.costBasis + bond.costBasis, tqfNeu: 0.30,
        goldWert: gTr.marketValue, goldCost: gTr.costBasis,
        goldSteuerfrei: inputs.goldSteuerfrei,
        sparerPauschbetrag: inputs.startSPB,
        marketData,
        pensionAnnual
    };
}

/**
 * Summiert Depotwert über alle Tranchen
 */
export function sumDepot(portfolio) {
    const sumTr = (arr) => Array.isArray(arr) ? arr.reduce((s, t) => s + (Number(t?.marketValue) || 0), 0) : 0;
    return sumTr(portfolio?.depotTranchesAktien) + sumTr(portfolio?.depotTranchesGold);
}

/**
 * Kauft Gold und fügt es zum Portfolio hinzu
 */
export function buyGold(portfolio, amount) {
    const lot = createSimulationLot(portfolio, amount, 'gold');
    if (!lot) return null;
    if (!Array.isArray(portfolio.depotTranchesGold)) portfolio.depotTranchesGold = [];
    portfolio.depotTranchesGold.push(lot);
    return lot;
}

/**
 * Kauft Aktien und fügt sie zum Portfolio hinzu
 */
export function buyStocksNeu(portfolio, amount) {
    const lot = createSimulationLot(portfolio, amount, 'equity');
    if (!lot) return null;
    if (!Array.isArray(portfolio.depotTranchesAktien)) portfolio.depotTranchesAktien = [];
    portfolio.depotTranchesAktien.push(lot);
    return lot;
}
