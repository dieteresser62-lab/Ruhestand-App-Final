import {
    applySaleToPortfolio,
    buyGold,
    buyStocksNeu,
    initializePortfolio,
    isBondKind,
    summarizeSalesByAsset,
    sumDepot
} from './simulator-portfolio.js';
import { resolveProfileKey } from './simulator-heatmap.js';
import { euros, normalizeHouseholdContext, resolveCapeRatio } from './simulator-engine-direct-utils.js';
import { CONFIG } from '../../engine/config.mjs';
import { STRATEGY_OPTIONS } from '../../types/strategy-options.js';
import {
    getThreeBucketInputs,
    applyThreeBucketLogic,
    sumBondBucketValuation
} from '../../engine/transactions/three-bucket-logic.mjs';
import {
    applyAnnualReturnsToPortfolio,
    buildCurrentYearMarketData
} from './simulator-year-portfolio.js';
import { calculateHouseholdPensionForYear } from './simulator-household-pension.js';
import { buildSimulatorEngineInput } from './simulator-engine-input.js';
import { isAccumulationYear, simulateAccumulationYear } from './simulator-accumulation-year.js';
import { addTaxRawAggregate, applySimulatorTaxRecompute, buildTaxRawAggregate } from './simulator-tax-recompute.js';
import { applyForcedSaleLiquidityCoverage, applyPayoutFallbackSale } from './simulator-forced-sale.js';
import { applyBondRefillPostprocessing } from './simulator-bond-refill.js';
import { buildSimulatorYearResult } from './simulator-year-result.js';
import {
    applyHealthBucketCoverage,
    applyHealthBucketInterest,
    buildHealthBucketDiagnostics
} from './simulator-health-bucket.js';

const formatInteger = (value) => Number.isFinite(value) ? Math.round(value) : 0;

/**
 * FAIL-SAFE Liquidity Guard - Hilfsfunktionen
 */

/**
 * Simuliert ein Jahr des Ruhestandsszenarios - DIREKTE EngineAPI Version
 *
 * HAUPTUNTERSCHIED zur Adapter-Version:
 * - Verwendet EINEN EngineAPI.simulateSingleYear() Aufruf
 * - Statt mehrerer Adapter-Methoden (determineSpending, determineAction, calculateSaleAndTax)
 * - Direkter Zugriff auf diagnosis, ui.spending, ui.action
 *
 * @param {Object} currentState - Aktuelles Portfolio und Marktstatus
 * @param {Object} inputs - Benutzereingaben und Konfiguration
 * @param {Object} yearData - Marktdaten für das Jahr
 * @param {number} yearIndex - Index des Simulationsjahres
 * @param {Object} pflegeMeta - Pflege-Metadata (optional)
 * @param {number} careFloorAddition - Zusätzlicher Floor-Bedarf durch Pflege
 * @param {Object|null} householdContext - Haushaltsstatus
 * @param {number} temporaryFlexFactor - Temporärer Flex-Faktor (0..1)
 * @param {Object} engineAPI - EngineAPI Instanz (DIREKT, kein Adapter!)
 * @returns {Object} Simulationsergebnisse
 */
export function simulateOneYear(currentState, inputs, yearData, yearIndex, pflegeMeta = null, careFloorAddition = 0, householdContext = null, temporaryFlexFactor = 1.0, engineAPI = null) {
    // EngineAPI muss übergeben werden oder global verfügbar sein
    const engine = engineAPI || (typeof window !== 'undefined' ? window.EngineAPI : null);

    if (!engine) {
        console.error('[simulator-engine-direct] EngineAPI not available!', {
            engineAPI,
            windowEngineAPI: typeof window !== 'undefined' ? window.EngineAPI : 'no window',
            windowKeys: typeof window !== 'undefined' ? Object.keys(window).filter(k => k.includes('Engine') || k.includes('Ruhe')) : []
        });
        throw new Error("Critical: No EngineAPI available in simulateOneYear. Pass it as argument or ensure global scope.");
    }

    if (typeof engine.simulateSingleYear !== 'function') {
        console.error('[simulator-engine-direct] engine.simulateSingleYear is not a function!', {
            engine,
            engineType: typeof engine,
            engineKeys: Object.keys(engine || {}),
            hasSimulateSingleYear: 'simulateSingleYear' in (engine || {}),
            simulateSingleYearType: typeof engine?.simulateSingleYear
        });
        throw new Error("Critical: engine.simulateSingleYear is not a function. Wrong engine object?");
    }

    let {
        portfolio,
        baseFloor,
        baseFlex,
        baseMinimumFlexAnnual = 0,
        baseFlexBudgetAnnual = 0,
        baseFlexBudgetRecharge = 0,
        lastState,
        currentAnnualPension,
        currentAnnualPension2,
        marketDataHist,
        widowPensionP1 = 0,
        widowPensionP2 = 0
    } = currentState;

    const effectiveBaseFloor = baseFloor + careFloorAddition;
    currentAnnualPension2 = currentAnnualPension2 || 0;
    widowPensionP1 = Math.max(0, widowPensionP1 || 0);
    widowPensionP2 = Math.max(0, widowPensionP2 || 0);
    const householdCtx = normalizeHouseholdContext(householdContext);
    const { p1Alive, p2Alive, widowBenefits } = householdCtx;

    let { depotTranchesAktien, depotTranchesGold } = portfolio;
    let liquiditaet = portfolio.liquiditaet;
    let initialLiqStart = euros(liquiditaet);
    let cashZinsen = 0;
    let liqNachZins = initialLiqStart;
    let totalTaxesThisYear = 0;
    const taxStatePrev = {
        lossCarry: Math.max(0, Number(lastState?.taxState?.lossCarry) || 0)
    };
    let combinedTaxRawAggregate = null;
    let didForcedSale = false;
    let forcedSaleScaleApplied = null;
    let regularSaleScale = 1;
    let forcedTaxReserved = 0;
    const threeBucketInput = getThreeBucketInputs(inputs);
    const is3Bucket = threeBucketInput.is3Bucket;

    let bondSaleAmount = 0;
    let bondRefillGross = 0;
    let bondRefillNet = 0;
    let bondRefillTax = 0;
    let equityPreserved = 0;
    let unmetLiquidity = 0;
    let isBadYear = false;
    const {
        rA,
        rG,
        rC,
        bondBucketBefore,
        equityBeforeReturn,
        goldBeforeReturn,
        equityAfterReturn,
        goldAfterReturn
    } = applyAnnualReturnsToPortfolio({ portfolio, yearData, threeBucketInput });
    const balanceTrace = [];
    const snapshotBalance = (phase, extra = {}) => {
        const equityAndBonds = euros(sumDepot({ depotTranchesAktien }));
        const bonds = euros(sumBondBucketValuation(depotTranchesAktien));
        const gold = euros(sumDepot({ depotTranchesGold }));
        const cash = euros(liquiditaet);
        balanceTrace.push({
            phase,
            total: euros(equityAndBonds + gold + cash),
            equity: euros(equityAndBonds - bonds),
            bonds,
            gold,
            cash,
            ...extra
        });
    };
    snapshotBalance('after_returns', {
        rA,
        rG,
        rC,
        bondBucketBefore: euros(bondBucketBefore)
    });
    const {
        resolvedCapeRatio,
        marketDataCurrentYear
    } = buildCurrentYearMarketData({ yearData, inputs, marketDataHist, rA });

    // FIX (Redux): Calculate current market end value for Regime Detection
    // Shift the historical window by 1 year so 'endeVJ' reflects the value AFTER this year's returns.
    // This allows the Engine to see the crash (e.g. 2008) in the year it happens.
    // FIX (Redux): Calculate current market end value for Regime Detection
    // Shift the historical window by 1 year so 'endeVJ' reflects the value AFTER this year's returns.
    // This allows the Engine to see the crash (e.g. 2008) in the year it happens.
    //
    // CRITICAL FIX: Always calculate synthetically!
    // We cannot use HISTORICAL_DATA[yearData.jahr] because in Monte Carlo, the sampled year 
    // has an absolute index value unrelated to the current synthetic simulation state.
    // ==========================================
    // ANSPARPHASE-LOGIK (unverändert, da keine Engine-Aufrufe)
    // ==========================================
    if (isAccumulationYear(inputs, yearIndex)) {
        return simulateAccumulationYear({
            currentState,
            inputs,
            yearData,
            yearIndex,
            portfolio,
            liquiditaet,
            initialLiqStart,
            rA,
            rG,
            rC,
            bondBucketBefore,
            marketDataCurrentYear,
            marketDataHist,
            resolvedCapeRatio,
            baseFloor,
            baseFlex,
            baseMinimumFlexAnnual,
            baseFlexBudgetAnnual,
            baseFlexBudgetRecharge,
            effectiveBaseFloor,
            currentAnnualPension,
            currentAnnualPension2,
            householdCtx,
            isBadYear
        });
    }

    // ==========================================
    // ENTNAHMEPHASE-LOGIK - DIREKTE ENGINE API
    // ==========================================

    const pensionResult = calculateHouseholdPensionForYear({
        inputs,
        yearIndex,
        currentAnnualPension,
        currentAnnualPension2,
        widowPensionP1,
        widowPensionP2,
        p1Alive,
        p2Alive,
        widowBenefits,
        effectiveBaseFloor,
        baseFlex,
        temporaryFlexFactor
    });
    const {
        rentAdjPct,
        rente1,
        rente2,
        renteSum,
        pensionAnnual,
        pensionSurplus,
        inflatedFloor,
        inflatedFlex
    } = pensionResult;

    // FIX: Do NOT add pension to liquidity explicitly!
    // The Engine nets pension against usage (monatlicheEntnahme = Bedarf - Pension).
    // Adding it here would count it twice (once as reduced withdrawal, once as cash injection).
    // liquiditaet += pensionAnnual;  <-- REMOVED

    const depotwertGesamt = sumDepot(portfolio);
    const totalWealth = depotwertGesamt + liquiditaet;

    // Calculate reduced floor/flex for FAIL-SAFE Guard (NOT for engine input!)
    // The engine calculates this internally, but we need it for emergency guard logic
    // (Variables already calculated above: pensionSurplus, inflatedFloor, inflatedFlex)

    // ==========================================
    // DIREKTE ENGINE API - SINGLE CALL
    // ==========================================

    const { engineInput, detailedTranches } = buildSimulatorEngineInput({
        inputs,
        portfolio,
        marketDataCurrentYear,
        marketDataHist,
        yearData,
        yearIndex,
        liquiditaet,
        effectiveBaseFloor,
        baseFlex,
        baseMinimumFlexAnnual,
        temporaryFlexFactor,
        baseFlexBudgetAnnual,
        baseFlexBudgetRecharge,
        pensionAnnual,
        resolvedCapeRatio
    });


    // **HAUPTUNTERSCHIED**: Ein einziger Engine-Aufruf statt 3-5 Adapter-Aufrufe
    const fullResult = engine.simulateSingleYear(engineInput, lastState);

    // FAIL-SAFE: Error-Handling
    if (fullResult.error || !fullResult.ui) {
        console.error('EngineAPI error:', fullResult.error);
        return { isRuin: true, error: fullResult.error };
    }

    // Extrahiere Ergebnisse direkt aus fullResult
    const spendingResult = fullResult.ui.spending;
    const actionResult = fullResult.ui.action;
    const market = fullResult.ui.market;
    const zielLiquiditaet = fullResult.ui.zielLiquiditaet;
    const spendingNewState = fullResult.newState;
    const actionRawAggregate = buildTaxRawAggregate(actionResult?.taxRawAggregate);
    combinedTaxRawAggregate = { ...actionRawAggregate };

    // 3-Bucket Override
    const { updatedAction, threeBucketState } = applyThreeBucketLogic(
        detailedTranches,
        engineInput,
        market,
        actionResult,
        rA,
        bondBucketBefore
    );

    Object.assign(actionResult, updatedAction);
    combinedTaxRawAggregate = buildTaxRawAggregate(actionResult?.taxRawAggregate);

    const allQuellen = Array.isArray(actionResult.quellen) ? actionResult.quellen : [];
    let saleQuellen = allQuellen.filter(q => q?.kind && q.kind !== 'liquiditaet');

    isBadYear = threeBucketState.isBadYear;
    bondSaleAmount = threeBucketState.bondSaleAmount;
    equityPreserved = threeBucketState.equityPreserved;
    unmetLiquidity += threeBucketState.unmetLiquidity;

    let plannedSaleBrutto = saleQuellen.reduce((sum, q) => sum + (q?.brutto || 0), 0);
    let hasSales = plannedSaleBrutto > 0;
    let buyGoldAmount = 0;
    let buyEqAmount = 0;

    // Check if this is a cash-funded transaction (Surplus Rebalancing)
    // In this case, we DON'T sell assets - we BUY them using liquidity
    const cashQuellen = allQuellen.filter(q => q?.kind === 'liquiditaet');
    const isCashFundedPurchase = cashQuellen.length > 0 && !hasSales &&
        (actionResult.verwendungen?.gold > 0 || actionResult.verwendungen?.aktien > 0);

    // Wende Transaktionen auf Portfolio an
    // FIX: Only infer sales from nettoErlös if this is NOT a cash-funded purchase
    // (Surplus Rebalancing uses liquidity to BUY assets, not sell them)
    if (actionResult.type === 'TRANSACTION' && !hasSales && actionResult.nettoErlös > 0 && !isCashFundedPurchase) {
        const inferredBrutto = (actionResult.nettoErlös || 0) + (actionResult.steuer || 0);
        if (inferredBrutto > 0) {
            saleQuellen = [{
                kind: (is3Bucket && isBadYear) ? 'anleihe' : 'aktien_alt',
                brutto: inferredBrutto,
                steuer: actionResult.steuer || 0,
                trancheId: null,
                name: null,
                isin: null,
                netto: actionResult.nettoErlös || 0
            }];
            plannedSaleBrutto = inferredBrutto;
            hasSales = true;
        }
    }

    if (actionResult.type === 'TRANSACTION' && hasSales) {
        const saleResult = {
            steuerGesamt: actionResult.steuer || 0,
            bruttoVerkaufGesamt: plannedSaleBrutto,
            achievedRefill: actionResult.nettoErlös || 0,
            breakdown: saleQuellen
        };

        applySaleToPortfolio(portfolio, saleResult);
        bondSaleAmount += saleQuellen.reduce((sum, item) => {
            const kind = String(item?.kind || '').toLowerCase();
            return (isBondKind(kind) || String(item?.category || '').toLowerCase() === 'bonds')
                ? (sum + (Number(item?.brutto) || 0))
                : sum;
        }, 0);
    }
    actionResult.quellen = [...allQuellen.filter(q => q?.kind === 'liquiditaet'), ...saleQuellen];
    const equityAfterSalesAction = sumDepot({ depotTranchesAktien });
    const goldAfterSalesAction = sumDepot({ depotTranchesGold });

    // Cash-funded Käufe (Quelle: Liquidität) reduzieren die Liquidität direkt.
    const cashSpend = allQuellen.reduce(
        (sum, q) => (q?.kind === 'liquiditaet' ? sum + (q.brutto || 0) : sum),
        0
    );
    if (cashSpend > 0) {
        liquiditaet -= cashSpend;
    }

    // FIX: For cash-funded purchases (Surplus Rebalancing), set buy amounts directly
    if (isCashFundedPurchase) {
        buyGoldAmount = actionResult.verwendungen?.gold || 0;
        buyEqAmount = actionResult.verwendungen?.aktien || 0;
    }

    if (hasSales) {
        const executedEqSale = Math.max(0, equityAfterReturn - equityAfterSalesAction);
        const executedGldSale = Math.max(0, goldAfterReturn - goldAfterSalesAction);
        const executedTotalSale = executedEqSale + executedGldSale;
        regularSaleScale = plannedSaleBrutto > 0 ? Math.min(1, executedTotalSale / plannedSaleBrutto) : 0;
        combinedTaxRawAggregate = buildTaxRawAggregate();
        addTaxRawAggregate(combinedTaxRawAggregate, actionResult?.taxRawAggregate, regularSaleScale);
    }

    // Aktualisiere Liquidität nach Transaktionen
    if (hasSales && actionResult.nettoErlös > 0) {
        const reinvestedPlanned = (actionResult.verwendungen?.gold || 0) + (actionResult.verwendungen?.aktien || 0);
        const actualNettoErlos = (actionResult.nettoErlös || 0) * regularSaleScale;
        const actualReinvested = reinvestedPlanned * regularSaleScale;
        buyGoldAmount = (actionResult.verwendungen?.gold || 0) * regularSaleScale;
        buyEqAmount = (actionResult.verwendungen?.aktien || 0) * regularSaleScale;
        liquiditaet += Math.max(0, actualNettoErlos - actualReinvested);
    }
    snapshotBalance('after_action_sales', {
        plannedSaleBrutto: euros(plannedSaleBrutto),
        nettoErlos: euros(actionResult.nettoErlös),
        cashSpend: euros(cashSpend),
        buyEqAmount: euros(buyEqAmount),
        buyGoldAmount: euros(buyGoldAmount)
    });

    const jahresEntnahme = spendingResult.monatlicheEntnahme * 12;
    const jahresEntnahmePlan = jahresEntnahme;

    // RUIN-Check: Können wir zumindest den Floor decken?
    // Berechnung des Netto-Floors (Floor - Rente)
    const netFloorYear = Math.max(0, engineInput.floorBedarf - pensionAnnual);

    // FIX: forcedShortfall muss die TATSÄCHLICHE Entnahme abdecken, nicht nur den Floor.
    // Sonst kann bei Flex-Ausgaben ein Liquiditätsengpass entstehen.
    // Zusätzlich: Mindest-Puffer für das nächste Jahr einplanen (1 Monat Floor-Deckung),
    // um emergency_guard am Jahresende zu vermeiden.
    const jahresEntnahmeTarget = Math.max(jahresEntnahmePlan, netFloorYear);
    const minLiqAfterPayout = netFloorYear / 12; // 1 Monat Mindest-Liquidität nach Auszahlung
    const totalLiqNeed = jahresEntnahmeTarget + minLiqAfterPayout;
    let forcedShortfall = Math.max(0, totalLiqNeed - liquiditaet);
    const equityBeforeForced = equityAfterSalesAction;
    const goldBeforeForced = goldAfterSalesAction;
    const healthBucketCoverage = applyHealthBucketCoverage({
        inputs,
        portfolio,
        householdContext: householdCtx,
        pflegeMeta,
        forcedShortfall,
        careFloorAddition
    });
    if (healthBucketCoverage.used > 0) {
        liquiditaet += healthBucketCoverage.used;
        forcedShortfall = Math.max(0, forcedShortfall - healthBucketCoverage.used);
    }
    const forcedCoverage = applyForcedSaleLiquidityCoverage({
        forcedShortfall,
        portfolio,
        engineInput,
        market,
        is3Bucket,
        isBadYear,
        depotTranchesAktien,
        depotTranchesGold,
        equityBeforeForced,
        goldBeforeForced,
        combinedTaxRawAggregate
    });
    liquiditaet += forcedCoverage.liquiditaetDelta;
    bondSaleAmount += forcedCoverage.bondSaleAmountDelta;
    unmetLiquidity += forcedCoverage.unmetLiquidityDelta;
    didForcedSale = didForcedSale || forcedCoverage.didForcedSale;
    forcedSaleScaleApplied = forcedCoverage.forcedSaleScaleApplied ?? forcedSaleScaleApplied;
    forcedTaxReserved += forcedCoverage.forcedTaxReservedDelta;
    snapshotBalance('after_forced_sales', {
        forcedShortfall: euros(forcedShortfall),
        liquiditaetDelta: euros(forcedCoverage.liquiditaetDelta),
        healthBucketUsed: euros(healthBucketCoverage.used)
    });

    const equityAfterSales = sumDepot({ depotTranchesAktien });
    const goldAfterSales = sumDepot({ depotTranchesGold });

    // Kaufe Gold/Aktien wenn vorhanden
    if (buyGoldAmount > 0) {
        buyGold(portfolio, buyGoldAmount);
    }
    if (buyEqAmount > 0) {
        buyStocksNeu(portfolio, buyEqAmount);
    }
    let equityAfterBuys = sumDepot({ depotTranchesAktien });
    let goldAfterBuys = sumDepot({ depotTranchesGold });
    snapshotBalance('after_buys', {
        buyEqAmount: euros(buyEqAmount),
        buyGoldAmount: euros(buyGoldAmount)
    });

    const totalWealthAvailable = equityAfterBuys + goldAfterBuys + liquiditaet;
    if (totalWealthAvailable + 1e-6 < netFloorYear) {
        return {
            isRuin: true,
            reason: `Gesamtvermögen (${formatInteger(totalWealthAvailable)}) < Floor (${formatInteger(netFloorYear)})`
        };
    }

    // Hinweis: Ein Liquiditäts-Engpass erzeugt keinen Ruin, solange das Gesamtvermögen den Floor deckt.
    // Payout wird unten an die Liquidität angepasst.

    // Auszahlung (begrenzt auf verfügbare Liquidität)
    // Hinweis: jahresEntnahmeTarget wurde bereits oben für forcedShortfall berechnet
    const liqBeforePayout = euros(liquiditaet);
    const portfolioTotalBeforePayout = euros(totalWealthAvailable);
    const payout = Math.min(liquiditaet, jahresEntnahmeTarget);
    liquiditaet -= payout;
    const liqAfterPayout = euros(liquiditaet);
    const jahresEntnahmeEffektiv = payout;
    snapshotBalance('after_payout', {
        payout: euros(payout),
        jahresEntnahmeTarget: euros(jahresEntnahmeTarget),
        portfolioTotalBeforePayout
    });

    const payoutFallback = applyPayoutFallbackSale({
        jahresEntnahmeEffektiv,
        netFloorYear,
        liquiditaet,
        payout,
        is3Bucket,
        isBadYear,
        depotTranchesAktien,
        depotTranchesGold,
        formatRuinNumber: formatInteger
    });
    if (payoutFallback.isRuin) {
        return {
            isRuin: true,
            reason: payoutFallback.reason
        };
    }
    liquiditaet = payoutFallback.liquiditaet;
    bondSaleAmount += payoutFallback.bondSaleAmountDelta;
    unmetLiquidity += payoutFallback.unmetLiquidityDelta;

    const bondRefill = applyBondRefillPostprocessing({
        is3Bucket,
        isBadYear,
        threeBucketInput,
        jahresEntnahmeTarget,
        netFloorYear,
        portfolio,
        depotTranchesAktien,
        engineInput: { ...engineInput, sparerPauschbetrag: 0 },
        market,
        combinedTaxRawAggregate
    });
    bondRefillGross += bondRefill.bondRefillGrossDelta;
    bondRefillNet += bondRefill.bondRefillNetDelta;
    bondRefillTax += bondRefill.bondRefillTaxDelta;
    forcedTaxReserved += bondRefill.bondRefillTaxDelta;
    didForcedSale = didForcedSale || bondRefill.didForcedSale;
    snapshotBalance('after_bond_refill', {
        bondRefillGross: euros(bondRefill.bondRefillGrossDelta),
        bondRefillNet: euros(bondRefill.bondRefillNetDelta),
        bondRefillTax: euros(bondRefill.bondRefillTaxDelta),
        bondRefillDebugVersion: bondRefill.debugVersion || '',
        bondRefillSaleShortfallGross: euros(bondRefill.saleShortfallGross)
    });

    // Rebalancing bei Überschuss
    // HINWEIS: Die Logik wurde in die TransactionEngine (determineAction) verschoben,
    // um Simulator und Balance App zu harmonisieren (Surplus Rebalancing nur in guten Märkten).
    // simulator-engine-direct.js verlässt sich nun rein auf die Engine-Ergebnisse.
    let kaufAkt = 0, kaufGld = 0;
    // (Legacy Block entfernt)

    // Cash-Verzinsung
    // Cash-Verzinsung
    const liqBasisForInterest = euros(liquiditaet);
    cashZinsen = euros(liqBasisForInterest * rC);
    liquiditaet = euros(liqBasisForInterest * (1 + rC));
    liqNachZins = euros(liquiditaet);
    if (!isFinite(liquiditaet)) liquiditaet = 0;
    snapshotBalance('after_cash_interest', {
        cashInterestEarned: euros(cashZinsen),
        liqBasisForInterest
    });
    const healthBucketInterest = applyHealthBucketInterest({ inputs, portfolio, rC });
    const healthBucketDiagnostics = buildHealthBucketDiagnostics({
        inputs,
        portfolio,
        cumulativeInflationFactor: spendingNewState.cumulativeInflationFactor || 1
    });

    const floorCoveredByPension = inflatedFloor === 0;
    const guardReason = floorCoveredByPension ? "floor_covered_by_pension" : "engine_guard_primary";

    // Market History für nächstes Jahr
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

    const taxReconciliation = applySimulatorTaxRecompute({
        didForcedSale,
        actionResult,
        spendingNewState,
        taxStatePrev,
        combinedTaxRawAggregate,
        sparerPauschbetrag: engineInput.sparerPauschbetrag,
        kirchensteuerSatz: engineInput.kirchensteuerSatz,
        forcedSaleScaleApplied,
        regularSaleScale,
        forcedTaxReserved
    });
    totalTaxesThisYear = taxReconciliation.totalTaxesThisYear;
    liquiditaet += taxReconciliation.taxCashAdjustment;
    snapshotBalance('after_tax_reconciliation', {
        regularSaleScale,
        forcedTaxReserved: euros(forcedTaxReserved),
        taxCashAdjustment: euros(taxReconciliation.taxCashAdjustment)
    });

    // Verkäufe erst nach der finalen Jahressteuer zusammenfassen.
    const vk = actionResult.quellen ? summarizeSalesByAsset({
        breakdown: actionResult.quellen,
        steuerGesamt: actionResult.steuer || 0
    }) : { vkAkt: 0, vkGld: 0, vkBnd: 0, stAkt: 0, stGld: 0, vkGes: 0, stGes: 0 };

    return buildSimulatorYearResult({
        portfolio,
        liquiditaet,
        spendingResult,
        actionResult,
        market,
        spendingNewState,
        yearData,
        fullResult,
        currentState,
        newMarketDataHist,
        initialLiqStart,
        jahresEntnahmePlan,
        jahresEntnahmeEffektiv,
        liqBeforePayout,
        liqAfterPayout,
        portfolioTotalBeforePayout,
        buyEqAmount,
        buyGoldAmount,
        kaufAkt,
        kaufGld,
        baseFloor,
        baseFlex,
        baseMinimumFlexAnnual,
        baseFlexBudgetAnnual,
        baseFlexBudgetRecharge,
        pensionResult,
        rA,
        rG,
        depotwertGesamt,
        totalTaxesThisYear,
        vk,
        depotTranchesAktien,
        depotTranchesGold,
        equityBeforeReturn,
        equityAfterReturn,
        equityAfterSales,
        equityAfterBuys,
        goldBeforeReturn,
        goldAfterReturn,
        goldAfterSales,
        goldAfterBuys,
        cashZinsen,
        liqNachZins,
        zielLiquiditaet,
        bondBucketBefore,
        bondRefillGross,
        bondRefillNet,
        bondRefillTax,
        bondSaleAmount,
        bondRefillDebugVersion: bondRefill.debugVersion || '',
        bondRefillSaleShortfallGross: euros(bondRefill.saleShortfallGross),
        effectiveBaseFloor,
        pensionAnnual,
        rente1,
        rente2,
        renteSum,
        inflatedFloor,
        inflatedFlex,
        pflegeMeta,
        widowBenefits,
        widowPensionP1,
        widowPensionP2,
        p1Alive,
        p2Alive,
        guardReason,
        isBadYear,
        equityPreserved,
        unmetLiquidity,
        healthBucketCoverage,
        healthBucketInterest,
        healthBucketDiagnostics,
        balanceTrace
    });
}

// Exportiere alle Helper-Funktionen die auch von simulator-engine.js exportiert werden
export {
    initializePortfolio as initMcRunState,
    normalizeHouseholdContext,
    euros
};

// Die restlichen Export-Funktionen müssen aus simulator-engine.js importiert werden
// da sie unverändert bleiben
export {
    makeDefaultCareMeta,
    sampleNextYearData,
    computeRunStatsFromSeries,
    calcCareCost,
    computeHouseholdFlexFactor,
    computeCareMortalityMultiplier,
    updateCareMeta
} from './simulator-engine-helpers.js';

export { resolveCapeRatio };
