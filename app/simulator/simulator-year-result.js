import { sumDepot } from './simulator-portfolio.js';
import { euros } from './simulator-engine-direct-utils.js';
import { shortenReasonText } from './simulator-utils.js';
import { sumBondBucketValuation } from '../../engine/transactions/three-bucket-logic.mjs';

export function buildSimulatorYearResult({
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
    baseMinimumFlexAnnual = 0,
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
    bondRefillDebugVersion = '',
    bondRefillSaleShortfallGross = 0,
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
    healthBucketCoverage = null,
    healthBucketInterest = null,
    healthBucketDiagnostics = null,
    balanceTrace = []
}) {
    const kaufAktTotal = buyEqAmount + kaufAkt;
    const totalGoldKauf = buyGoldAmount + kaufGld;
    let aktionText = shortenReasonText(
        actionResult.transactionDiagnostics?.blockReason || 'none',
        actionResult.title || market.szenarioText
    );
    if (totalGoldKauf > 0) aktionText += " / Rebal.(G+)";
    if (kaufAktTotal > 0) aktionText += " / Rebal.(A+)";

    const inflFactorThisYear = 1 + (yearData.inflation / 100);
    const {
        nextWidowPensionP1,
        nextWidowPensionP2,
        nextAnnualPension,
        nextAnnualPension2
    } = pensionResult;
    const nextPortfolio = { ...portfolio, liquiditaet };
    const bondBucketAfter = sumBondBucketValuation(nextPortfolio.depotTranchesAktien);
    const wertAktien = sumDepot({ depotTranchesAktien });
    const wertGold = sumDepot({ depotTranchesGold });
    const healthBucketEnd = euros(Number(nextPortfolio.healthBucketGeldmarkt) || 0);
    const portfolioActiveEnd = euros(wertAktien + wertGold + liquiditaet);
    const portfolioTotalEnd = euros(portfolioActiveEnd + healthBucketEnd);
    const portfolioFlowDelta = portfolioActiveEnd - (
        euros(portfolioTotalBeforePayout) - euros(jahresEntnahmeEffektiv) - euros(bondRefillTax) + euros(cashZinsen)
    );
    const normalizedBalanceTrace = Array.isArray(balanceTrace)
        ? balanceTrace.map(entry => ({
            ...entry,
            phase: String(entry?.phase || ''),
            total: euros(entry?.total),
            equity: euros(entry?.equity),
            bonds: euros(entry?.bonds),
            gold: euros(entry?.gold),
            cash: euros(entry?.cash)
        }))
        : [];
    const healthBucketWarnings = Array.isArray(nextPortfolio.healthBucketMeta?.warnings)
        ? nextPortfolio.healthBucketMeta.warnings
        : [];
    const vpw = fullResult.ui.vpw || null;
    const safetyDiagnosis = fullResult.diagnosis?.general || {};
    const keyParams = fullResult.diagnosis?.keyParams || {};

    return {
        isRuin: false,
        portfolio: nextPortfolio,
        ui: {
            spending: spendingResult,
            action: actionResult,
            market: { sKey: spendingNewState.lastMarketSKey, ...yearData },
            vpw,
            zielLiquiditaet: 0,
            liquiditaet: {
                vorher: initialLiqStart,
                nachher: liquiditaet,
                deckungNachher: (jahresEntnahmePlan > 0) ? ((liquiditaet / jahresEntnahmePlan) * 100) : 100
            },
            runway: { months: 999 }
        },
        newState: {
            portfolio: nextPortfolio,
            baseFloor: baseFloor * inflFactorThisYear,
            baseFlex: baseFlex * inflFactorThisYear,
            baseMinimumFlexAnnual: baseMinimumFlexAnnual * inflFactorThisYear,
            baseFlexBudgetAnnual: baseFlexBudgetAnnual * inflFactorThisYear,
            baseFlexBudgetRecharge: baseFlexBudgetRecharge * inflFactorThisYear,
            lastState: spendingNewState,
            currentAnnualPension: nextAnnualPension,
            currentAnnualPension2: nextAnnualPension2,
            marketDataHist: newMarketDataHist,
            samplerState: currentState.samplerState,
            widowPensionP1: nextWidowPensionP1,
            widowPensionP2: nextWidowPensionP2
        },
        logData: {
            entscheidung: {
                ...spendingResult,
                jahresEntnahme: jahresEntnahmeEffektiv,
                jahresEntnahme_plan: jahresEntnahmePlan,
                runwayMonths: fullResult.ui.runway?.months || Infinity,
                kuerzungProzent: spendingResult.kuerzungProzent
            },
            FlexRatePct: spendingResult.details?.flexRate || 1.0,
            MinFlexRatePct: spendingResult.details?.minFlexRatePct ?? null,
            WealthRedF: Number.isFinite(spendingResult.details?.wealthReductionFactor)
                ? spendingResult.details.wealthReductionFactor * 100
                : null,
            WealthQuoteUsedPct: Number.isFinite(spendingResult.details?.entnahmequoteUsed)
                ? spendingResult.details.entnahmequoteUsed * 100
                : null,
            CutReason: spendingResult.kuerzungQuelle || 'none',
            Alarm: spendingNewState.alarmActive || false,
            Regime: spendingNewState.lastMarketSKey || 'unknown',
            QuoteEndPct: (spendingResult.details?.entnahmequoteDepot || 0) * 100,
            RunwayCoveragePct: fullResult.ui.liquiditaet?.deckungNachher || 100,
            RealReturnEquityPct: (1 + rA) / (1 + yearData.inflation / 100) - 1,
            RealReturnGoldPct: (1 + rG) / (1 + yearData.inflation / 100) - 1,
            NominalReturnEquityPct: rA,
            NominalReturnGoldPct: rG,
            entnahmequote: depotwertGesamt > 0 ? (jahresEntnahmeEffektiv / depotwertGesamt) : 0,
            entnahme_plan: jahresEntnahmePlan,
            entnahme_effektiv: jahresEntnahmeEffektiv,
            vpw_total: Number.isFinite(vpw?.vpwTotal) ? vpw.vpwTotal : null,
            vpw_dynamic_flex: Number.isFinite(vpw?.dynamicFlex) ? vpw.dynamicFlex : null,
            static_flex_baseline: Number.isFinite(vpw?.staticFlexBaseline) ? vpw.staticFlexBaseline : null,
            safety_stage_current: Number.isFinite(safetyDiagnosis.dynamicFlexSafetyStage) ? safetyDiagnosis.dynamicFlexSafetyStage : null,
            safety_score: Number.isFinite(safetyDiagnosis.dynamicFlexSafetyScore) ? safetyDiagnosis.dynamicFlexSafetyScore : null,
            safety_risk_streak: Number.isFinite(safetyDiagnosis.dynamicFlexSafetyRiskStreak) ? safetyDiagnosis.dynamicFlexSafetyRiskStreak : null,
            safety_stable_streak: Number.isFinite(safetyDiagnosis.dynamicFlexSafetyStableStreak) ? safetyDiagnosis.dynamicFlexSafetyStableStreak : null,
            safety_transition: safetyDiagnosis.dynamicFlexSafetyTransition || '',
            safety_runway_pre_months: Number.isFinite(safetyDiagnosis.runwayMonateVorTransaktion) ? safetyDiagnosis.runwayMonateVorTransaktion : null,
            safety_runway_post_months: Number.isFinite(safetyDiagnosis.dynamicFlexSafetyRunwayMonate) ? safetyDiagnosis.dynamicFlexSafetyRunwayMonate : null,
            safety_real_drawdown_pct: Number.isFinite(keyParams.realerDepotDrawdown) ? keyParams.realerDepotDrawdown * 100 : null,
            liq_before_payout: liqBeforePayout,
            liq_after_payout: liqAfterPayout,
            liq_after_interest: liqNachZins,
            portfolio_total_before_payout: portfolioTotalBeforePayout,
            portfolio_active_end: portfolioActiveEnd,
            portfolio_flow_delta: portfolioFlowDelta,
            balance_trace: normalizedBalanceTrace,
            health_bucket_enabled: !!healthBucketDiagnostics?.enabled,
            health_bucket_start: euros(healthBucketCoverage?.startAmount ?? healthBucketInterest?.startAmount),
            health_bucket_triggered: !!healthBucketCoverage?.triggered,
            health_bucket_reason: healthBucketCoverage?.reason || '',
            health_bucket_eligible_need: euros(healthBucketCoverage?.eligibleNeed),
            health_bucket_used: euros(healthBucketCoverage?.used),
            health_bucket_uncovered_need: euros(healthBucketCoverage?.uncoveredNeed),
            health_bucket_interest: euros(healthBucketInterest?.interest),
            health_bucket_end: healthBucketEnd,
            health_bucket_target_nominal: euros(healthBucketDiagnostics?.nominalTarget),
            health_bucket_target_inflation_adjusted: euros(healthBucketDiagnostics?.inflationAdjustedTarget),
            health_bucket_real_coverage_pct: healthBucketDiagnostics?.realCoveragePct ?? null,
            health_bucket_target_gap: euros(healthBucketDiagnostics?.targetGap),
            health_bucket_warning: healthBucketWarnings.join(' | '),
            portfolio_total_end: portfolioTotalEnd,
            steuern_gesamt: totalTaxesThisYear,
            vk,
            kaufAkt: kaufAktTotal,
            kaufGld: totalGoldKauf,
            wertAktien,
            wertGold,
            liquiditaet,
            eq_before_return: equityBeforeReturn,
            eq_after_return: equityAfterReturn,
            eq_after_sales: equityAfterSales,
            eq_after_buys: equityAfterBuys,
            gold_before_return: goldBeforeReturn,
            gold_after_return: goldAfterReturn,
            gold_after_sales: goldAfterSales,
            gold_after_buys: goldAfterBuys,
            netTradeEq: equityAfterReturn - equityAfterBuys,
            executedSaleEq: equityAfterReturn - equityAfterSales,
            liqStart: initialLiqStart,
            cashInterestEarned: cashZinsen,
            liqEnd: liqNachZins,
            zielLiquiditaet: zielLiquiditaet || 0,
            bondBucketAfter,
            bondRefillGross,
            bondRefillNet,
            bondRefillTax,
            bondSaleAmount,
            aktionUndGrund: aktionText,
            usedSPB: actionResult?.taxSettlement?.spbUsedThisYear || actionResult.pauschbetragVerbraucht || 0,
            floor_brutto: effectiveBaseFloor,
            pension_annual: pensionAnnual,
            rente1,
            rente2,
            renteSum,
            floor_aus_depot: inflatedFloor,
            flex_brutto: inflatedFlex,
            flex_erfuellt_nominal: jahresEntnahmeEffektiv > inflatedFloor ? jahresEntnahmeEffektiv - inflatedFloor : 0,
            inflation_factor_cum: spendingNewState.cumulativeInflationFactor || 1,
            jahresentnahme_real: jahresEntnahmeEffektiv / (spendingNewState.cumulativeInflationFactor || 1),
            pflege_aktiv: pflegeMeta?.active ?? false,
            pflege_zusatz_floor: pflegeMeta?.zusatzFloorZiel ?? 0,
            pflege_zusatz_floor_delta: pflegeMeta?.zusatzFloorDelta ?? 0,
            pflege_flex_faktor: pflegeMeta?.flexFactor ?? 1.0,
            pflege_kumuliert: pflegeMeta?.kumulierteKosten ?? 0,
            pflege_grade: pflegeMeta?.grade ?? null,
            pflege_grade_label: pflegeMeta?.gradeLabel ?? '',
            pflege_delta_flex: pflegeMeta?.log_delta_flex ?? 0,
            WidowBenefitP1: widowBenefits.p1FromP2 ? widowPensionP1 : 0,
            WidowBenefitP2: widowBenefits.p2FromP1 ? widowPensionP2 : 0,
            NeedLiq: 0,
            GuardGold: 0,
            GuardEq: 0,
            GuardNote: guardReason,
            Person1Alive: p1Alive ? 1 : 0,
            Person2Alive: p2Alive ? 1 : 0,
            lossCarryEnd: Number(spendingNewState?.taxState?.lossCarry) || 0,
            taxSavedByLossCarry: Number(actionResult?.taxSettlement?.taxSavedByLossCarry) || 0,
            pflege_floor_anchor: pflegeMeta?.log_floor_anchor ?? 0,
            pflege_maxfloor_anchor: pflegeMeta?.log_maxfloor_anchor ?? 0,
            pflege_cap_zusatz: pflegeMeta?.log_cap_zusatz ?? 0,
            CareP1_Active: 0,
            CareP1_Cost: 0,
            CareP1_Grade: null,
            CareP1_GradeLabel: '',
            CareP2_Active: 0,
            CareP2_Cost: 0,
            CareP2_Grade: null,
            CareP2_GradeLabel: '',
            threeBucket: {
                isBadYear,
                bondBucketBefore: euros(bondBucketBefore),
                bondBucketAfter: euros(bondBucketAfter),
                bondRefillGross: euros(bondRefillGross),
                bondRefillNet: euros(bondRefillNet),
                bondRefillTax: euros(bondRefillTax),
                bondSaleAmount: euros(bondSaleAmount),
                bondRefillDebugVersion,
                bondRefillSaleShortfallGross: euros(bondRefillSaleShortfallGross),
                equityPreserved: euros(equityPreserved),
                unmetLiquidity: euros(unmetLiquidity)
            }
        },
        totalTaxesThisYear
    };
}
