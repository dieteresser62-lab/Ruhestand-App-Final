"use strict";

import { shortenReasonText } from './simulator-utils.js';
import { HISTORICAL_DATA, PFLEGE_GRADE_PROBABILITIES, PFLEGE_GRADE_LABELS, SUPPORTED_PFLEGE_GRADES, annualData, REGIME_DATA, REGIME_TRANSITIONS, MORTALITY_TABLE } from './simulator-data.js';
import {
    computeYearlyPension, computePensionNext, initializePortfolio, applySaleToPortfolio, summarizeSalesByAsset,
    buildInputsCtxFromPortfolio, sumDepot, buyGold, buyStocksNeu
} from './simulator-portfolio.js';
import { resolveProfileKey } from './simulator-heatmap.js';

/**
 * FAIL-SAFE Liquidity Guard - Hilfsfunktionen
 */

/**
 * Stellt sicher, dass ein Wert eine nicht-negative Zahl ist
 * @param {*} x - Eingabewert
 * @returns {number} Wert >= 0
 */
function euros(x) {
    return Math.max(0, Number(x) || 0);
}

/**
 * Berechnet die benötigte Liquidität für den Floor-Bedarf
 * @param {Object} ctx - Kontext mit inputs und state
 * @returns {number} Benötigte Liquidität in €
 */
function computeLiqNeedForFloor(ctx) {
    // Berechne monatlichen Floor-Bedarf (netto nach Rente)
    const floorMonthlyNet = euros((ctx.inflatedFloor || ctx.inputs.startFloorBedarf) / 12);
    // Ziel-Runway in Monaten (Standard: 12, kann über runwayTargetMonths konfiguriert werden)
    const runwayTargetMin = Number(ctx.inputs.runwayTargetMonths ?? 12);
    return euros(runwayTargetMin * floorMonthlyNet);
}

/**
 * Verkauft Assets für Cash ohne Regelprüfungen (FAIL-SAFE Mode)
 * @param {Object} portfolio - Portfolio-Objekt
 * @param {Object} inputsCtx - Inputs-Context für Steuerberechnung
 * @param {Object} market - Marktkontext
 * @param {string} asset - 'gold' oder 'equity'
 * @param {number} amountEuros - Zielbetrag in €
 * @param {number} minGold - Minimaler Gold-Bestand
 * @returns {Object} { cashGenerated, taxesPaid }
 */
function sellAssetForCash(portfolio, inputsCtx, market, asset, amountEuros, minGold) {
    if (amountEuros <= 0) return { cashGenerated: 0, taxesPaid: 0 };

    let cashGenerated = 0;
    let taxesPaid = 0;

    if (asset === 'gold') {
        const goldWert = sumDepot({ depotTranchesGold: portfolio.depotTranchesGold });
        const availableGold = Math.max(0, goldWert - minGold);
        const targetSale = Math.min(amountEuros, availableGold);

        if (targetSale > 0) {
            // Nutze calculateSaleAndTax aus engine.js für Gold-Verkauf
            const { saleResult } = window.Ruhestandsmodell_v30.calculateSaleAndTax(
                targetSale,
                inputsCtx,
                { minGold: minGold },
                market
            );

            if (saleResult && saleResult.achievedRefill > 0) {
                applySaleToPortfolio(portfolio, saleResult);
                cashGenerated = saleResult.achievedRefill;
                taxesPaid = saleResult.steuerGesamt || 0;
            }
        }
    } else if (asset === 'equity') {
        const equityWert = sumDepot({ depotTranchesAktien: portfolio.depotTranchesAktien });
        const targetSale = Math.min(amountEuros, equityWert);

        if (targetSale > 0) {
            // Nutze calculateSaleAndTax aus engine.js für Aktien-Verkauf
            const { saleResult } = window.Ruhestandsmodell_v30.calculateSaleAndTax(
                targetSale,
                inputsCtx,
                { minGold: minGold },
                market
            );

            if (saleResult && saleResult.achievedRefill > 0) {
                applySaleToPortfolio(portfolio, saleResult);
                cashGenerated = saleResult.achievedRefill;
                taxesPaid = saleResult.steuerGesamt || 0;
            }
        }
    }

    return { cashGenerated: euros(cashGenerated), taxesPaid: euros(taxesPaid) };
}

/**
 * Simuliert ein Jahr des Ruhestandsszenarios
 * @param {Object} currentState - Aktuelles Portfolio und Marktstatus
 * @param {Object} inputs - Benutzereingaben und Konfiguration
 * @param {Object} yearData - Marktdaten für das Jahr
 * @param {number} yearIndex - Index des Simulationsjahres
 * @param {Object} pflegeMeta - Pflege-Metadata (optional)
 * @returns {Object} Simulationsergebnisse
 */
export function simulateOneYear(currentState, inputs, yearData, yearIndex, pflegeMeta = null) {
    let { portfolio, baseFloor, baseFlex, lastState, currentAnnualPension, currentAnnualPension2, marketDataHist } = currentState;
    currentAnnualPension2 = currentAnnualPension2 || 0;
    let { depotTranchesAktien, depotTranchesGold } = portfolio;
    let liquiditaet = portfolio.liquiditaet;
    let totalTaxesThisYear = 0;

    const rA = isFinite(yearData.rendite) ? yearData.rendite : 0;
    const rG = isFinite(yearData.gold_eur_perf) ? yearData.gold_eur_perf / 100 : 0;
    const rC = isFinite(yearData.zinssatz) ? yearData.zinssatz / 100 : 0;

    // Optimiert: for-Loop statt forEach für bessere Performance
    for (let i = 0; i < depotTranchesAktien.length; i++) {
        depotTranchesAktien[i].marketValue *= (1 + rA);
    }
    for (let i = 0; i < depotTranchesGold.length; i++) {
        depotTranchesGold[i].marketValue *= (1 + rG);
    }

    const resolvedCapeRatio = resolveCapeRatio(yearData.capeRatio, inputs.marketCapeRatio, marketDataHist.capeRatio);
    const marketDataCurrentYear = { ...marketDataHist, inflation: yearData.inflation, capeRatio: resolvedCapeRatio };

    const algoInput = { ...inputs, floorBedarf: baseFloor, flexBedarf: baseFlex, startSPB: inputs.startSPB };
    const market = window.Ruhestandsmodell_v30.analyzeMarket(marketDataCurrentYear);

    // Gemeinsame Rentenanpassung (% p.a.) für beide Personen
    const rentAdjPct = inputs.rentAdjPct || 0;

    // Rente Person 1 - Neue Logik mit gemeinsamer Anpassungsrate
    const currentAgeP1 = inputs.startAlter + yearIndex; // bleibt für Mortalität/Pflege relevant
    // Rente Person 1 wird ausschließlich über den Zeitversatz "Start in ... Jahren" gesteuert.
    const r1StartOffsetYears = Math.max(0, Number(inputs.renteStartOffsetJahre) || 0);
    let rente1_brutto = 0;

    if (yearIndex >= r1StartOffsetYears) {
        const isFirstYearR1 = (yearIndex === r1StartOffsetYears);
        const baseR1 = inputs.renteMonatlich * 12;
        rente1_brutto = computePensionNext(currentAnnualPension, isFirstYearR1, baseR1, rentAdjPct);
    }

    // Keine zusätzliche Steuer/Berechnung für R1 (wird als Netto betrachtet bzw. extern versteuert)
    const rente1 = rente1_brutto;

    // Rente Person 2 (Partner) - Neue Logik mit gemeinsamer Anpassungsrate
    let rente2_brutto = 0;
    let rente2 = 0;

    if (inputs.partner?.aktiv) {
        // Für Person 2 gilt dieselbe Regel: das Startalter beeinflusst nur Sterbe-/Pflegewahrscheinlichkeiten,
        // der Rentenbeginn richtet sich ausschließlich nach "Start in ... Jahren".
        const partnerStartOffsetYears = Math.max(0, Number(inputs.partner.startInJahren) || 0);
        if (yearIndex >= partnerStartOffsetYears) {
            const isFirstYearR2 = (yearIndex === partnerStartOffsetYears);
            const baseR2 = inputs.partner.brutto;
            rente2_brutto = computePensionNext(currentAnnualPension2, isFirstYearR2, baseR2, rentAdjPct);

            // Steuerberechnung für Person 2
            // Wenn Steuerquote > 0, wird diese verwendet (einfache Methode)
            // Andernfalls wird eine detaillierte Berechnung mit Sparer-Pauschbetrag und Kirchensteuer durchgeführt
            if (inputs.partner.steuerquotePct > 0) {
                rente2 = rente2_brutto * (1 - inputs.partner.steuerquotePct / 100);
            } else {
                // Detaillierte Steuerberechnung (analog zu Person 1, falls gewünscht)
                // Für jetzt: keine Steuern, wenn Steuerquote = 0
                // TODO: Hier könnte eine detaillierte Steuerberechnung mit Sparer-Pauschbetrag
                // und Kirchensteuer implementiert werden (analog zur engine.js Logik)
                rente2 = rente2_brutto;
            }
            // Clamp bei 0 (keine negativen Renten)
            rente2 = Math.max(0, rente2);
        }
    }

    // Gesamtrente (renteSum)
    const renteSum = rente1 + rente2;
    const pensionAnnual = renteSum;

    const inflatedFloor = Math.max(0, baseFloor - pensionAnnual);
    const inflatedFlex  = baseFlex;

    const jahresbedarfAusPortfolio = inflatedFloor + inflatedFlex;
    const runwayMonths = jahresbedarfAusPortfolio > 0 ? (liquiditaet / (jahresbedarfAusPortfolio / 12)) : Infinity;

    const profileKey = resolveProfileKey(algoInput.risikoprofil);
    let profile = window.Ruhestandsmodell_v30.CONFIG.PROFIL_MAP[profileKey];

    if (!profile) {
        const fallbackKey = Object.keys(window.Ruhestandsmodell_v30.CONFIG.PROFIL_MAP)[0];
        profile = window.Ruhestandsmodell_v30.CONFIG.PROFIL_MAP[fallbackKey];
    }
    const zielLiquiditaet = window.Ruhestandsmodell_v30.calculateTargetLiquidity(profile, market, {floor: inflatedFloor, flex: inflatedFlex});

    const depotwertGesamt = sumDepot(portfolio);
    const totalWealth     = depotwertGesamt + liquiditaet;

    const inputsCtx = buildInputsCtxFromPortfolio(algoInput, portfolio, {pensionAnnual, marketData: marketDataCurrentYear});

    const { spendingResult, newState: spendingNewState } = window.Ruhestandsmodell_v30.determineSpending({
        market, lastState, inflatedFloor, inflatedFlex,
        runwayMonths, liquidNow: liquiditaet, profile, depotValue: depotwertGesamt, totalWealth, inputsCtx
    });

    const results = {
        aktuelleLiquiditaet: liquiditaet, depotwertGesamt, zielLiquiditaet, gesamtwert: totalWealth,
        inflatedFloor, grossFloor: baseFloor, spending: spendingResult, market,
        minGold: algoInput.goldAktiv ? (algoInput.goldFloorProzent/100)*totalWealth : 0
    };
    const actionResult = window.Ruhestandsmodell_v30.determineAction(results, inputsCtx);

    let mergedSaleResult = actionResult.saleResult;
    if (actionResult.saleResult) {
        totalTaxesThisYear += (actionResult.saleResult.steuerGesamt || 0);
        applySaleToPortfolio(portfolio, actionResult.saleResult);
    }

    liquiditaet = actionResult.liqNachTransaktion.total;

    if (actionResult.kaufGold > 0) {
        buyGold(portfolio, actionResult.kaufGold);
    }
    if (actionResult.kaufAktien > 0) {
        buyStocksNeu(portfolio, actionResult.kaufAktien);
    }

    const depotWertVorEntnahme = sumDepot(portfolio);
    let emergencyRefillHappened = false;
    const jahresEntnahme = spendingResult.monatlicheEntnahme * 12;

    if (liquiditaet < jahresEntnahme && depotWertVorEntnahme > 0) {
        const shortfall = jahresEntnahme - liquiditaet;
        const emergencyCtx = buildInputsCtxFromPortfolio(algoInput, { depotTranchesAktien: portfolio.depotTranchesAktien.map(t => ({...t})), depotTranchesGold: portfolio.depotTranchesGold.map(t => ({...t})), liquiditaet: liquiditaet}, { pensionAnnual, marketData: marketDataCurrentYear });
        const { saleResult: emergencySale } = window.Ruhestandsmodell_v30.calculateSaleAndTax(shortfall, emergencyCtx, { minGold: results.minGold }, market);

        if (emergencySale && emergencySale.achievedRefill > 0) {
            liquiditaet += emergencySale.achievedRefill;
            totalTaxesThisYear += (emergencySale.steuerGesamt || 0);
            applySaleToPortfolio(portfolio, emergencySale);
            mergedSaleResult = mergedSaleResult ? window.Ruhestandsmodell_v30.mergeSaleResults(mergedSaleResult, emergencySale) : emergencySale;
            emergencyRefillHappened = true;
        }
    }

    if (liquiditaet < jahresEntnahme) {
        return { isRuin: true };
    }
    liquiditaet -= jahresEntnahme;

    let kaufAkt = 0, kaufGld = 0;
    const ueberschuss = liquiditaet - zielLiquiditaet;
    if (ueberschuss > 500) {
        liquiditaet -= ueberschuss;
        const aktienAnteilQuote = algoInput.targetEq / (100 - (algoInput.goldAktiv ? algoInput.goldZielProzent : 0));
        const goldTeil = algoInput.goldAktiv ? ueberschuss * (1 - aktienAnteilQuote) : 0;
        const aktienTeil = ueberschuss - goldTeil;
        kaufGld = goldTeil;
        kaufAkt = aktienTeil;
        buyGold(portfolio, goldTeil);
        buyStocksNeu(portfolio, aktienTeil);
    }

    liquiditaet *= (1 + rC);
    if (!isFinite(liquiditaet)) liquiditaet = 0;

    // ========== FAIL-SAFE LIQUIDITY GUARD ==========
    // Prüft nach allen Transaktionen, ob genug Liquidität für Floor vorhanden ist
    // Falls nicht: Verkauft Assets OHNE Regelprüfungen (Band/ATH/MaxSkim ignoriert)
    let guardSellGold = 0, guardSellEq = 0, guardReason = "", guardTaxes = 0;

    const guardCtx = {
        inflatedFloor: inflatedFloor,
        inputs: algoInput
    };
    const need = computeLiqNeedForFloor(guardCtx);
    let liq = euros(liquiditaet);

    if (liq < need) {
        let missing = need - liq;
        const minGold = algoInput.goldAktiv ? (algoInput.goldFloorProzent / 100) * totalWealth : 0;

        // 2a) Gold zuerst bis Minimum verkaufen
        if (missing > 0) {
            const goldWert = sumDepot({ depotTranchesGold: portfolio.depotTranchesGold });
            if (goldWert > minGold) {
                const result = sellAssetForCash(
                    portfolio,
                    inputsCtx,
                    market,
                    'gold',
                    missing,
                    0 // Im FAIL-SAFE Mode ignorieren wir minGold-Floor temporär
                );
                guardSellGold = result.cashGenerated;
                guardTaxes += result.taxesPaid;
                liquiditaet += guardSellGold;
                missing = Math.max(0, missing - guardSellGold);
            }
        }

        // 2b) Dann Aktien verkaufen
        if (missing > 0) {
            const equityWert = sumDepot({ depotTranchesAktien: portfolio.depotTranchesAktien });
            if (equityWert > 0) {
                const result = sellAssetForCash(
                    portfolio,
                    inputsCtx,
                    market,
                    'equity',
                    missing,
                    0
                );
                guardSellEq = result.cashGenerated;
                guardTaxes += result.taxesPaid;
                liquiditaet += guardSellEq;
                missing = Math.max(0, missing - guardSellEq);
            }
        }

        // Wenn weiterhin missing > 0 → echtes RUIN (Assets wirklich leer)
        guardReason = (missing > 0) ? "assets_exhausted" : "rules_overridden";
        totalTaxesThisYear += guardTaxes;
    }

    // Validierung: Sicherstellen, dass kritische Werte finite sind
    if (!Number.isFinite(liquiditaet)) {
        console.warn("FAIL-SAFE: liquiditaet not finite, resetting to 0", liquiditaet);
        liquiditaet = 0;
    }
    if (!Number.isFinite(inflatedFloor)) {
        console.warn("FAIL-SAFE: inflatedFloor not finite", inflatedFloor);
    }
    // ========== ENDE FAIL-SAFE LIQUIDITY GUARD ==========

    const newMarketDataHist = {
        endeVJ_3: marketDataHist.endeVJ_2,
        endeVJ_2: marketDataHist.endeVJ_1,
        endeVJ_1: marketDataHist.endeVJ,
        endeVJ: marketDataHist.endeVJ * (1 + rA),
        ath: Math.max(marketDataHist.ath, marketDataHist.endeVJ * (1 + rA)),
        jahreSeitAth: (marketDataHist.endeVJ * (1 + rA) >= marketDataHist.ath) ? 0 : marketDataHist.jahreSeitAth + 1,
        capeRatio: resolvedCapeRatio,
        inflation: yearData.inflation
    };

    const vk = summarizeSalesByAsset(mergedSaleResult);
    const kaufAktTotal = (actionResult.kaufAktien || 0) + (kaufAkt || 0);
    const totalGoldKauf = (actionResult.kaufGold || 0) + kaufGld;

    let aktionText = shortenReasonText(actionResult.reason || 'none', actionResult.title || market.szenarioText);
    if (emergencyRefillHappened) { aktionText += " / Not-VK"; }
    if (totalGoldKauf > 0 && actionResult.reason !== 'rebalance_up') { aktionText += " / Rebal.(G+)"; }
    if (kaufAktTotal > 0 && !actionResult.title.includes("→ Aktien")) { aktionText += " / Rebal.(A+)"; }

    const actionTitle = actionResult.title || '';
    const isRebalanceEvent = actionTitle.toLowerCase().includes('rebalancing') && !actionTitle.toLowerCase().includes('puffer');

    const inflFactorThisYear = 1 + (yearData.inflation / 100);
    const naechsterBaseFloor = baseFloor * inflFactorThisYear;
    const naechsterBaseFlex = baseFlex * inflFactorThisYear;

    return {
        isRuin: false,
        newState: {
            portfolio: { ...portfolio, liquiditaet },
            baseFloor: naechsterBaseFloor,
            baseFlex: naechsterBaseFlex,
            lastState: spendingNewState,
            currentAnnualPension: rente1_brutto,
            currentAnnualPension2: rente2_brutto,
            marketDataHist: newMarketDataHist,
            samplerState: currentState.samplerState
        },
        logData: {
            entscheidung: { ...spendingResult, jahresEntnahme, runwayMonths, kuerzungProzent: spendingResult.kuerzungProzent },
            FlexRatePct: spendingResult.details.flexRate,
            CutReason: spendingResult.kuerzungQuelle,
            Alarm: spendingNewState.alarmActive,
            Regime: spendingNewState.lastMarketSKey,
            QuoteEndPct: spendingResult.details.entnahmequoteDepot * 100,
            RunwayCoveragePct: (zielLiquiditaet > 0 ? (actionResult.liqNachTransaktion.total / zielLiquiditaet) : 1) * 100,
            RealReturnEquityPct: (1 + rA) / (1 + yearData.inflation/100) - 1,
            RealReturnGoldPct: (1 + rG) / (1 + yearData.inflation/100) - 1,
            entnahmequote: depotWertVorEntnahme > 0 ? (jahresEntnahme / depotWertVorEntnahme) : 0,
            steuern_gesamt: totalTaxesThisYear,
            vk,
            kaufAkt: kaufAktTotal,
            kaufGld: totalGoldKauf,
            wertAktien: sumDepot({depotTranchesAktien: portfolio.depotTranchesAktien}),
            wertGold: sumDepot({depotTranchesGold: portfolio.depotTranchesGold}),
            liquiditaet, aktionUndGrund: aktionText,
            usedSPB: mergedSaleResult ? (mergedSaleResult.pauschbetragVerbraucht || 0) : 0,
            floor_brutto: baseFloor,
            pension_annual: pensionAnnual,
            rente1: rente1,
            rente2: rente2,
            renteSum: renteSum,
            floor_aus_depot: inflatedFloor,
            flex_brutto: baseFlex,
            flex_erfuellt_nominal: jahresEntnahme > inflatedFloor ? jahresEntnahme - inflatedFloor : 0,
            inflation_factor_cum: spendingNewState.cumulativeInflationFactor,
            jahresentnahme_real: jahresEntnahme / spendingNewState.cumulativeInflationFactor,
            pflege_aktiv: pflegeMeta?.active ?? false,
            pflege_zusatz_floor: pflegeMeta?.zusatzFloorZiel ?? 0,
            pflege_zusatz_floor_delta: pflegeMeta?.zusatzFloorDelta ?? 0,
            pflege_flex_faktor: pflegeMeta?.flexFactor ?? 1.0,
            pflege_kumuliert: pflegeMeta?.kumulierteKosten ?? 0,
            pflege_grade: pflegeMeta?.grade ?? null,
            pflege_grade_label: pflegeMeta?.gradeLabel ?? '',
            // FAIL-SAFE Guard Debug-Spalten
            NeedLiq: Math.round(need),
            GuardGold: Math.round(guardSellGold),
            GuardEq: Math.round(guardSellEq),
            GuardNote: guardReason
        },
        totalTaxesThisYear
    };
}

/**
 * Initialisiert den Startzustand für einen Monte-Carlo-Lauf
 */
export function initMcRunState(inputs, startYearIndex) {
    const startPortfolio = initializePortfolio(inputs);

    const histYears = Object.keys(HISTORICAL_DATA).map(Number).sort((a,b)=>a-b);
    const validStartIndices = annualData.map((d, i) => i).filter(i => i >= 4);
    const effectiveIndex = validStartIndices[startYearIndex % validStartIndices.length];
    const startJahr = annualData[effectiveIndex].jahr;

    const marketDataHist = {
        endeVJ:   HISTORICAL_DATA[startJahr - 1]?.msci_eur || 1000,
        endeVJ_1: HISTORICAL_DATA[startJahr - 2]?.msci_eur || 1000,
        endeVJ_2: HISTORICAL_DATA[startJahr - 3]?.msci_eur || 1000,
        endeVJ_3: HISTORICAL_DATA[startJahr - 4]?.msci_eur || 1000,
        ath: 0,
        jahreSeitAth: 0,
        inflation: HISTORICAL_DATA[startJahr - 1]?.inflation_de || 2.0,
        capeRatio: resolveCapeRatio(undefined, inputs.marketCapeRatio, 0)
    };

    const pastValues = histYears.filter(y => y < startJahr).map(y => HISTORICAL_DATA[y].msci_eur);
    marketDataHist.ath = pastValues.length > 0 ? Math.max(...pastValues, marketDataHist.endeVJ) : marketDataHist.endeVJ;
    if (marketDataHist.endeVJ < marketDataHist.ath) {
       let lastAthYear = Math.max(...histYears.filter(y => y < startJahr && HISTORICAL_DATA[y].msci_eur >= marketDataHist.ath));
       marketDataHist.jahreSeitAth = (startJahr - 1) - lastAthYear;
    }

    return {
        portfolio: startPortfolio,
        baseFloor: inputs.startFloorBedarf,
        baseFlex: inputs.startFlexBedarf,
        lastState: null,
        currentAnnualPension: 0,
        currentAnnualPension2: 0,
        marketDataHist: marketDataHist,
        samplerState: {}
    };
}

/**
 * Schätzt die verbleibende Lebenserwartung anhand der Sterbetafel.
 * @param {string} gender - 'm', 'w' oder 'd'.
 * @param {number} currentAge - Alter beim Eintritt in die Pflege.
 * @returns {number} Erwartete verbleibende Jahre (≥ 1).
 */
function estimateRemainingLifeYears(gender, currentAge) {
    const table = MORTALITY_TABLE[gender] || MORTALITY_TABLE.m;
    const ages = Object.keys(table).map(Number).sort((a, b) => a - b);
    const minAge = ages[0] ?? currentAge;
    const maxAge = ages[ages.length - 1] ?? currentAge;
    let survivalProbability = 1;
    let expectedYears = 0;

    for (let age = Math.max(currentAge, minAge); age <= maxAge; age++) {
        const qxRaw = table[age] ?? 1;
        const qx = Math.min(1, Math.max(0, qxRaw));
        expectedYears += survivalProbability;
        survivalProbability *= (1 - qx);
        if (survivalProbability < 0.0001) break;
    }

    return Math.max(1, Math.round(expectedYears));
}

/**
 * Erstellt ein Standard-Pflege-Metadata-Objekt
 * @param {boolean} enabled - Schaltet die Logik ein/aus.
 * @param {string} personGender - Geschlecht für Mortalitätsannahmen.
 */
export function makeDefaultCareMeta(enabled, personGender = 'm') {
    if (!enabled) return null;
    return {
        active: false,
        triggered: false,
        startAge: -1,
        durationYears: 0,
        currentYearInCare: 0,
        zusatzFloorZiel: 0,
        zusatzFloorDelta: 0,
        flexFactor: 1.0,
        kumulierteKosten: 0,
        floorAtTrigger: 0,
        flexAtTrigger: 0,
        maxFloorAtTrigger: 0,
        grade: null,
        gradeLabel: '',
        personGender
    };
}

/**
 * Wählt Marktdaten für das nächste Jahr gemäß der MC-Methode aus
 */
export function sampleNextYearData(state, methode, blockSize, rand, stressCtx) {
    const samplerState = state.samplerState;

    if (stressCtx && stressCtx.type === 'conditional_bootstrap' && stressCtx.remainingYears > 0) {
        const randomIndex = Math.floor(rand() * stressCtx.pickableIndices.length);
        const chosenYearIndex = stressCtx.pickableIndices[randomIndex];
        return { ...annualData[chosenYearIndex] };
    }

    if (methode === 'block') {
        if (!samplerState.blockStartIndex || samplerState.yearInBlock >= blockSize) {
            const maxIndex = annualData.length - blockSize;
            samplerState.blockStartIndex = Math.floor(rand() * maxIndex);
            samplerState.yearInBlock = 0;
        }
        const data = annualData[samplerState.blockStartIndex + samplerState.yearInBlock];
        samplerState.yearInBlock++;
        return { ...data };
    }

    let regime;
    if (methode === 'regime_iid') {
        const regimes = Object.keys(REGIME_DATA);
        regime = regimes[Math.floor(rand() * regimes.length)];
    } else {
        if (!samplerState.currentRegime) {
            samplerState.currentRegime = annualData[Math.floor(rand() * annualData.length)].regime;
        }

        const transitions = REGIME_TRANSITIONS[samplerState.currentRegime];
        const r = rand();
        let cumulativeProb = 0;
        let nextRegime = 'SIDEWAYS';
        for (const [targetRegime, count] of Object.entries(transitions)) {
            if (targetRegime === 'total') continue;
            cumulativeProb += (count / transitions.total);
            if (r <= cumulativeProb) {
                nextRegime = targetRegime;
                break;
            }
        }
        regime = nextRegime;
        samplerState.currentRegime = nextRegime;
    }

    const possibleYears = REGIME_DATA[regime];
    const chosenYear = possibleYears[Math.floor(rand() * possibleYears.length)];
    return { ...chosenYear };
}

/**
 * Berechnet Volatilität und maximalen Drawdown aus einer Serie
 */
export function computeRunStatsFromSeries(series) {
    if (!Array.isArray(series) || series.length < 2) {
        return { volPct: 0, maxDDpct: 0 };
    }
    const returns = [];
    for (let i = 1; i < series.length; i++) {
        const prev = series[i - 1] || 0;
        const cur  = series[i] || 0;
        const r = (prev > 0 && isFinite(prev) && isFinite(cur)) ? (cur / prev - 1) : 0;
        returns.push(r);
    }
    const mu = returns.length > 0 ? returns.reduce((a,b)=>a+b,0) / returns.length : 0;
    const variance = returns.length > 1 ? returns.reduce((s,x)=>s + (x-mu)*(x-mu), 0) / (returns.length - 1) : 0;
    const volPct = Math.sqrt(Math.max(variance, 0)) * 100;

    let peak = series[0];
    let maxDD = 0;
    for (let i = 1; i < series.length; i++) {
        peak = Math.max(peak, series[i]);
        if (peak > 0) {
            const dd = (series[i] - peak) / peak;
            if (isFinite(dd)) maxDD = Math.min(maxDD, dd);
        }
    }
    const maxDDpct = Math.abs(maxDD) * 100;
    return { volPct, maxDDpct };
}

/**
 * Berechnet die Pflege-Zusatzkosten für Floor und Flex
 * @param {Object} careMetaP1 - Pflege-Meta für Person 1
 * @param {Object} careMetaP2 - Pflege-Meta für Person 2 (oder null)
 * @returns {Object} { zusatzFloor, flexFactor }
 */
export function calcCareCost(careMetaP1, careMetaP2 = null) {
    let zusatzFloor = 0;
    let flexFactor = 1.0;

    if (careMetaP1?.active) {
        zusatzFloor += careMetaP1.zusatzFloorZiel || 0;
        flexFactor = Math.min(flexFactor, careMetaP1.flexFactor || 1.0);
    }

    if (careMetaP2?.active) {
        zusatzFloor += careMetaP2.zusatzFloorZiel || 0;
        flexFactor = Math.min(flexFactor, careMetaP2.flexFactor || 1.0);
    }

    return { zusatzFloor, flexFactor };
}

/**
 * Bestimmt den CAPE-Wert für das aktuelle Jahr.
 * Priorität: Jahresdaten > Benutzereingabe > historischer Zustand > 0.
 * @param {number} yearSpecificCape - CAPE-Wert aus den Jahresdaten.
 * @param {number} inputCape - Vom Nutzer gesetzter CAPE-Wert.
 * @param {number} historicalCape - CAPE-Wert aus dem Vorjahr.
 * @returns {number} Gültiger CAPE-Wert (>= 0).
 */
function resolveCapeRatio(yearSpecificCape, inputCape, historicalCape) {
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

const CARE_PROBABILITY_BUCKETS = Object.keys(PFLEGE_GRADE_PROBABILITIES).map(Number).sort((a, b) => a - b);

/**
 * Berechnet den Mortalitäts-Multiplikator während eines Pflegefalls.
 * Der Multiplikator steigt linear von 1 bis pflegeTodesrisikoFaktor
 * über die konfigurierte Ramp-Up-Dauer an.
 */
export function computeCareMortalityMultiplier(careMeta, inputs) {
    if (!careMeta?.active || !inputs?.pflegebeschleunigtMortalitaetAktivieren) {
        return 1;
    }

    const baseFactor = Math.max(1, Number(inputs.pflegeTodesrisikoFaktor) || 1);
    if (baseFactor <= 1) {
        return 1;
    }

    const rampYears = Math.max(1, Number(inputs.pflegeRampUp) || 1);
    const yearsCompleted = Math.min(careMeta.currentYearInCare || 0, rampYears);
    if (yearsCompleted <= 0) {
        return 1;
    }

    const progress = yearsCompleted / rampYears;
    return 1 + (baseFactor - 1) * progress;
}

function resolveCareAgeBucket(age) {
    const numericAge = Number(age);
    if (!Number.isFinite(numericAge)) {
        return CARE_PROBABILITY_BUCKETS[0];
    }

    let bucket = CARE_PROBABILITY_BUCKETS[0];
    for (const candidate of CARE_PROBABILITY_BUCKETS) {
        if (numericAge >= candidate) {
            bucket = candidate;
        } else {
            break;
        }
    }
    return bucket;
}

function sampleCareGrade(age, rand) {
    const bucket = resolveCareAgeBucket(age);
    const probabilities = PFLEGE_GRADE_PROBABILITIES[bucket];
    if (!probabilities) return null;

    const totalProbability = SUPPORTED_PFLEGE_GRADES.reduce((sum, grade) => sum + (probabilities[grade] || 0), 0);
    if (totalProbability <= 0) return null;

    const roll = rand();
    if (roll > totalProbability) {
        return null;
    }

    let cumulative = 0;
    for (const grade of SUPPORTED_PFLEGE_GRADES) {
        const gradeProbability = probabilities[grade] || 0;
        cumulative += gradeProbability;
        if (roll <= cumulative) {
            return { grade, bucket, gradeProbability, totalProbability };
        }
    }
    return null;
}

function normalizeGradeConfig(config) {
    const zusatz = Math.max(0, Number(config?.zusatz) || 0);
    const rawFlex = config?.flexCut;
    const flexCut = Math.min(1, Math.max(0, Number.isFinite(rawFlex) ? rawFlex : 1));
    return { zusatz, flexCut };
}

function resolveGradeConfig(inputs, grade) {
    const configs = inputs?.pflegeGradeConfigs;
    if (configs && configs[grade]) {
        return normalizeGradeConfig(configs[grade]);
    }
    if (configs) {
        for (const fallbackGrade of SUPPORTED_PFLEGE_GRADES) {
            if (configs[fallbackGrade]) {
                return normalizeGradeConfig(configs[fallbackGrade]);
            }
        }
    }
    return normalizeGradeConfig({
        zusatz: inputs?.pflegeStufe1Zusatz,
        flexCut: inputs?.pflegeStufe1FlexCut
    });
}

/**
 * Aktualisiert Pflege-Metadaten inklusive grad-spezifischer Kosten.
 *
 * Vorgehen:
 * 1. Alters-Bucket gemäß Barmer-Pflegereport (2024) bestimmen.
 * 2. Pflegegrad anhand der Bucket-Verteilung ziehen und dessen Konfiguration anwenden.
 * 3. Zusatzkosten/Flex-Verlust rampenbasiert auf den Max-Floor capen.
 */
export function updateCareMeta(care, inputs, age, yearData, rand) {
    if (!inputs.pflegefallLogikAktivieren || !care) return care;

    if (care.active) {
        if (inputs.pflegeModellTyp === 'akut' && care.currentYearInCare >= care.durationYears) {
            care.active = false;
            care.zusatzFloorDelta = 0;
            care.grade = null;
            care.gradeLabel = '';
            return care;
        }

        if (!care.grade) {
            care.grade = SUPPORTED_PFLEGE_GRADES[0];
            care.gradeLabel = PFLEGE_GRADE_LABELS[care.grade] || `Pflegegrad ${care.grade}`;
        }

        const gradeConfig = resolveGradeConfig(inputs, care.grade);
        const yearsSinceStart = care.currentYearInCare;
        const yearIndex = yearsSinceStart + 1;
        // Pflegekosten steigen historisch schneller als die CPI, daher modellieren wir Inflation * Drift.
        const inflationsAnpassung = (1 + yearData.inflation/100) * (1 + (inputs.pflegeKostenDrift || 0));
        // Regionale Aufschläge (z.B. Ballungsräume) skalieren alle Grade linear.
        const regionalMultiplier = 1 + Math.max(0, inputs?.pflegeRegionalZuschlag || 0);

        const floorAtTriggerAdjusted = care.floorAtTrigger * Math.pow(1 + yearData.inflation/100, yearIndex);
        const flexAtTriggerAdjusted = care.flexAtTrigger * Math.pow(1 + yearData.inflation/100, yearIndex);
        const maxFloorAdjusted = care.maxFloorAtTrigger * Math.pow(inflationsAnpassung, yearIndex);

        const capZusatz = Math.max(0, maxFloorAdjusted - floorAtTriggerAdjusted);

        const zielRoh = gradeConfig.zusatz * Math.pow(inflationsAnpassung, yearIndex) * regionalMultiplier;
        const rampUpFactor = Math.min(1.0, yearIndex / Math.max(1, inputs.pflegeRampUp));
        const zielMitRampUp = zielRoh * rampUpFactor;

        const zusatzFloorZielFinal = Math.min(capZusatz, zielMitRampUp);

        const zusatzFloorDelta = Math.max(0, zusatzFloorZielFinal - care.zusatzFloorZiel);
        care.zusatzFloorDelta = zusatzFloorDelta;
        care.zusatzFloorZiel = zusatzFloorZielFinal;
        care.flexFactor = gradeConfig.flexCut;

        const flexVerlust = flexAtTriggerAdjusted * (1 - care.flexFactor);
        care.kumulierteKosten += zusatzFloorDelta + flexVerlust;

        care.log_floor_anchor = floorAtTriggerAdjusted;
        care.log_maxfloor_anchor = maxFloorAdjusted;
        care.log_cap_zusatz = capZusatz;
        care.log_delta_flex = flexVerlust;
        care.log_grade = care.grade;
        care.log_grade_label = care.gradeLabel;

        care.currentYearInCare = yearIndex;

        return care;
    }

    if (!care.triggered) {
        const sampledGrade = sampleCareGrade(age, rand);

        if (sampledGrade) {
            care.triggered = true;
            care.active = true;
            care.startAge = age;
            care.currentYearInCare = 0;
            care.grade = sampledGrade.grade;
            care.gradeLabel = PFLEGE_GRADE_LABELS[sampledGrade.grade] || `Pflegegrad ${sampledGrade.grade}`;

            care.floorAtTrigger = inputs.startFloorBedarf;
            care.flexAtTrigger = inputs.startFlexBedarf;
            care.maxFloorAtTrigger = inputs.pflegeMaxFloor;

            if (inputs.pflegeModellTyp === 'akut') {
                const min = inputs.pflegeMinDauer, max = inputs.pflegeMaxDauer;
                care.durationYears = Math.floor(rand() * (max - min + 1)) + min;
            } else {
                const genderForCalc = care.personGender || inputs?.geschlecht || 'm';
                care.durationYears = estimateRemainingLifeYears(genderForCalc, age);
            }

            care.log_grade_bucket = sampledGrade.bucket;
            care.log_grade_probability = sampledGrade.gradeProbability;
            care.log_grade_totalProbability = sampledGrade.totalProbability;

            return updateCareMeta(care, inputs, age, yearData, rand);
        }
    }

    return care;
}
