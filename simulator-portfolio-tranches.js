"use strict";

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

    const findTrancheById = (trancheId) => {
        if (!trancheId) return null;
        const byId = (arr) => Array.isArray(arr) ? arr.find(t => t.trancheId === trancheId) : null;
        return byId(portfolio.depotTranchesAktien)
            || byId(portfolio.depotTranchesGold)
            || byId(portfolio.depotTranchesGeldmarkt);
    };

    saleResult.breakdown.forEach(saleItem => {
        if (!saleItem.kind || saleItem.kind === 'liquiditaet') return; // Skip liquidity or invalid items
        let tranche = findTrancheById(saleItem.trancheId);
        if (!tranche) {
            const tranches = saleItem.kind.startsWith('aktien') ? portfolio.depotTranchesAktien : portfolio.depotTranchesGold;
            tranche = tranches.find(t => t.type === saleItem.kind);
        }
        if (tranche) {
            const reduction = Math.min(saleItem.brutto, tranche.marketValue);
            const reductionRatio = tranche.marketValue > 0 ? reduction / tranche.marketValue : 0;
            tranche.costBasis -= tranche.costBasis * reductionRatio;
            tranche.marketValue -= reduction;
        }
    });
}

/**
 * Fasst Verkäufe nach Asset-Typ zusammen
 */
export function summarizeSalesByAsset(saleResult) {
    const sums = { vkAkt: 0, vkGld: 0, stAkt: 0, stGld: 0, vkGes: 0, stGes: 0 };
    if (!saleResult || !Array.isArray(saleResult.breakdown)) return sums;
    for (const item of saleResult.breakdown) {
        if (!item.kind || item.kind === 'liquiditaet') continue;
        const isAktie = String(item.kind || '').startsWith('aktien');
        const brutto = +item.brutto || 0;
        const steuer = (item.steuer != null) ? (+item.steuer) : 0;
        if (isAktie) { sums.vkAkt += brutto; sums.stAkt += steuer; }
        else { sums.vkGld += brutto; sums.stGld += steuer; }
        sums.vkGes += brutto; sums.stGes += steuer;
    }
    if (sums.stGes === 0 && saleResult.steuerGesamt > 0 && (sums.vkAkt + sums.vkGld) > 0) {
        const tot = sums.vkAkt + sums.vkGld; const ges = saleResult.steuerGesamt;
        sums.stAkt = ges * (sums.vkAkt / tot); sums.stGld = ges * (sums.vkGld / tot); sums.stGes = ges;
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
    const gTr = sumByType(portfolio.depotTranchesGold, 'gold');

    const gmm = sumByType(portfolio.depotTranchesGeldmarkt, 'geldmarkt');
    const geldmarktEtf = Number(portfolio.geldmarktEtf) || gmm.marketValue || 0;
    const tagesgeld = Number(portfolio.tagesgeld) || Math.max(0, (portfolio.liquiditaet || 0) - geldmarktEtf);

    return {
        ...inputs,
        tagesgeld,
        geldmarktEtf,
        depotwertAlt: aktAlt.marketValue, costBasisAlt: aktAlt.costBasis, tqfAlt: 0.30,
        depotwertNeu: aktNeu.marketValue, costBasisNeu: aktNeu.costBasis, tqfNeu: 0.30,
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
    if (amount <= 0) return;
    const goldTranche = portfolio.depotTranchesGold.find(t => t.type === 'gold');
    if (goldTranche) {
        goldTranche.marketValue += amount;
        goldTranche.costBasis += amount;
    } else {
        portfolio.depotTranchesGold.push({ marketValue: amount, costBasis: amount, tqf: 1.0, type: 'gold' });
    }
}

/**
 * Kauft Aktien und fügt sie zum Portfolio hinzu
 */
export function buyStocksNeu(portfolio, amount) {
    if (amount <= 0) return;
    const neuTranche = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_neu');
    if (neuTranche) {
        neuTranche.marketValue += amount;
        neuTranche.costBasis += amount;
    } else {
        portfolio.depotTranchesAktien.push({ marketValue: amount, costBasis: amount, tqf: 0.30, type: 'aktien_neu' });
    }
}
