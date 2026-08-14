import { sumDepot } from './simulator-portfolio.js';
import { euros, signedEuros } from './simulator-engine-direct-utils.js';
import { shortenReasonText } from './simulator-utils.js';
import { sumBondBucketValuation } from '../../engine/transactions/three-bucket-logic.mjs';
import { FinancialCalculationError } from '../../engine/errors.mjs';
import { resolvePlannedAnnualWithdrawal } from '../../types/planned-withdrawal-contract.js';
import {
    advanceSimulatorCumulativeInflationFactor,
    resolveSimulatorCumulativeInflationFactor
} from './simulator-engine-helpers.js';

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
    stressReplayTransactionDiagnostics = null,
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
    const cumulativeInflationFactor = resolveSimulatorCumulativeInflationFactor(currentState);
    const nextCumulativeInflationFactor = advanceSimulatorCumulativeInflationFactor(
        cumulativeInflationFactor,
        yearData.inflation
    );
    const nextSpendingState = {
        ...spendingNewState,
        cumulativeInflationFactor: nextCumulativeInflationFactor,
        lastEntnahmeReal: jahresEntnahmeEffektiv / cumulativeInflationFactor
    };
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
    const taxCashAdjustment = signedEuros(actionResult?.taxSettlement?.taxCashAdjustment);
    const signedCashInterest = Number.isFinite(Number(cashZinsen)) ? Number(cashZinsen) : 0;
    const portfolioFlowDelta = portfolioActiveEnd - (
        euros(portfolioTotalBeforePayout)
        - euros(jahresEntnahmeEffektiv)
        - euros(bondRefillTax)
        + signedCashInterest
        + taxCashAdjustment
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
    const flexRate = Number.isFinite(spendingResult.details?.flexRate)
        ? spendingResult.details.flexRate
        : null;
    const plannedWithdrawalResolution = resolvePlannedAnnualWithdrawal({
        spendingResult,
        ...(jahresEntnahmePlan === undefined ? {} : { annualPlan: jahresEntnahmePlan })
    });
    if (plannedWithdrawalResolution.status === 'invalid' || plannedWithdrawalResolution.status === 'conflict') {
        throw new FinancialCalculationError(
            'Die Jahresentnahme des Simulatorergebnisses ist nicht eindeutig reconciliert.',
            {
                contract: 'planned_annual_withdrawal',
                status: plannedWithdrawalResolution.status,
                candidates: plannedWithdrawalResolution.candidates
            }
        );
    }
    const annualRunwayNeed = plannedWithdrawalResolution.status === 'resolved'
        ? plannedWithdrawalResolution.annualWithdrawal
        : null;
    const runwayAfterTransactionBeforePayoutMonths = Number.isFinite(annualRunwayNeed)
        && Number.isFinite(liqBeforePayout)
        ? (annualRunwayNeed > 0 ? liqBeforePayout / (annualRunwayNeed / 12) : null)
        : null;
    const runwayPostPayoutEndOfYearMonths = Number.isFinite(annualRunwayNeed)
        && Number.isFinite(liquiditaet)
        ? (annualRunwayNeed > 0 ? liquiditaet / (annualRunwayNeed / 12) : null)
        : null;
    const runwayCoveragePct = zielLiquiditaet > 0 && Number.isFinite(liqBeforePayout)
        ? (liqBeforePayout / zielLiquiditaet) * 100
        : null;
    const runwayPostPayoutEndOfYearCoveragePct = zielLiquiditaet > 0 && Number.isFinite(liquiditaet)
        ? (liquiditaet / zielLiquiditaet) * 100
        : null;
    const pensionFlexCapacity = Math.max(0, pensionAnnual - effectiveBaseFloor);
    const dynamicPortfolioFlex = vpw?.enabled === true && Number.isFinite(vpw?.dynamicFlex)
        ? Math.max(0, vpw.dynamicFlex)
        : null;
    const grossHouseholdFlex = dynamicPortfolioFlex !== null
        ? pensionFlexCapacity + dynamicPortfolioFlex
        : (Number.isFinite(fullResult.input?.flexBedarf)
            ? Math.max(0, fullResult.input.flexBedarf)
            : Math.max(0, inflatedFlex));
    const pensionFlexContribution = Math.min(
        grossHouseholdFlex,
        pensionFlexCapacity
    );
    const fulfilledFlexFromPortfolio = jahresEntnahmeEffektiv > inflatedFloor
        ? jahresEntnahmeEffektiv - inflatedFloor
        : 0;
    const fulfilledHouseholdFlex = Math.min(
        grossHouseholdFlex,
        pensionFlexContribution + fulfilledFlexFromPortfolio
    );
    const householdFlexReductionPct = grossHouseholdFlex > 0
        ? Math.max(0, (1 - (fulfilledHouseholdFlex / grossHouseholdFlex)) * 100)
        : null;
    const minimumFlexAnnual = Number.isFinite(keyParams.minimumFlexAnnual)
        ? Math.max(0, keyParams.minimumFlexAnnual)
        : 0;
    const minimumFlexApplicable = keyParams.minimumFlexApplicable === true;
    const plannedMinimumFlexEffective = Number.isFinite(keyParams.minimumFlexEffectiveFinal)
        ? Math.max(0, keyParams.minimumFlexEffectiveFinal)
        : minimumFlexAnnual;
    const minimumFlexEffectiveFinal = minimumFlexApplicable
        ? Math.min(minimumFlexAnnual, fulfilledHouseholdFlex)
        : (Number.isFinite(keyParams.minimumFlexEffectiveFinal) ? keyParams.minimumFlexEffectiveFinal : null);
    const minimumFlexShortfallAnnual = minimumFlexApplicable
        ? Math.max(0, minimumFlexAnnual - minimumFlexEffectiveFinal)
        : (Number.isFinite(keyParams.minimumFlexShortfallAnnual) ? keyParams.minimumFlexShortfallAnnual : null);
    const minimumFlexFulfilled = minimumFlexApplicable
        ? minimumFlexShortfallAnnual <= 0.01
        : keyParams.minimumFlexFulfilled === true;
    const minimumFlexLimitedByActualPayout = minimumFlexApplicable
        && minimumFlexShortfallAnnual > 0.01
        && minimumFlexEffectiveFinal + 0.01 < plannedMinimumFlexEffective;
    const minimumFlexStatus = minimumFlexLimitedByActualPayout
        ? 'limited_by_actual_payout'
        : (keyParams.minimumFlexStatus || 'inactive_zero');
    const withdrawalRateEndPct = Number.isFinite(spendingResult.details?.entnahmequoteDepot)
        ? spendingResult.details.entnahmequoteDepot * 100
        : null;

    return {
        isRuin: false,
        portfolio: nextPortfolio,
        ui: {
            spending: spendingResult,
            action: actionResult,
            market: { sKey: spendingNewState.lastMarketSKey, ...yearData },
            vpw,
            zielLiquiditaet,
            liquiditaet: {
                vorher: initialLiqStart,
                nachher: liqBeforePayout,
                deckungNachher: runwayCoveragePct,
                vorAuszahlung: liqBeforePayout,
                nachAuszahlung: liqAfterPayout,
                jahresende: liquiditaet,
                deckungJahresende: runwayPostPayoutEndOfYearCoveragePct
            },
            runway: {
                months: runwayAfterTransactionBeforePayoutMonths,
                postPayoutEndOfYearMonths: runwayPostPayoutEndOfYearMonths
            }
        },
        newState: {
            portfolio: nextPortfolio,
            cumulativeInflationFactor: nextCumulativeInflationFactor,
            baseFloor: euros(baseFloor * inflFactorThisYear),
            baseFlex: euros(baseFlex * inflFactorThisYear),
            baseMinimumFlexAnnual: euros(baseMinimumFlexAnnual * inflFactorThisYear),
            baseFlexBudgetAnnual: euros(baseFlexBudgetAnnual * inflFactorThisYear),
            baseFlexBudgetRecharge: euros(baseFlexBudgetRecharge * inflFactorThisYear),
            lastState: nextSpendingState,
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
                runwayMonths: runwayAfterTransactionBeforePayoutMonths,
                kuerzungProzent: spendingResult.kuerzungProzent
            },
            FlexRatePct: flexRate,
            MinFlexRatePct: spendingResult.details?.minFlexRatePct ?? null,
            minimumFlexAnnual,
            minimumFlexStatus,
            minimumFlexBlockReason: keyParams.minimumFlexBlockReason || '',
            minimumFlexStatusBeforeSafetyOverride: keyParams.minimumFlexStatusBeforeSafetyOverride || '',
            minimumFlexRequiredRate: Number.isFinite(keyParams.minimumFlexRequiredRate) ? keyParams.minimumFlexRequiredRate : null,
            minimumFlexEffectiveBefore: Number.isFinite(keyParams.minimumFlexEffectiveBefore) ? keyParams.minimumFlexEffectiveBefore : null,
            minimumFlexEffectiveAfter: Number.isFinite(keyParams.minimumFlexEffectiveAfter) ? keyParams.minimumFlexEffectiveAfter : null,
            minimumFlexApplicable,
            minimumFlexEffectiveFinal,
            minimumFlexShortfallAnnual,
            minimumFlexFulfilled,
            SafetyCapActive: keyParams.safetyCapActive === true,
            SafetyCapFlexRatePct: Number.isFinite(keyParams.safetyCapFlexRatePct) ? keyParams.safetyCapFlexRatePct : null,
            SafetyCapEffectiveFlexRatePct: Number.isFinite(keyParams.safetyCapEffectiveFlexRatePct)
                ? keyParams.safetyCapEffectiveFlexRatePct
                : null,
            SafetyCapRawCandidateFlexRatePct: Number.isFinite(keyParams.safetyCapRawCandidateFlexRatePct)
                ? keyParams.safetyCapRawCandidateFlexRatePct
                : null,
            SafetyCapSource: keyParams.safetyCapSource || '',
            SafetyCapAnchorStage: keyParams.safetyCapAnchorStage || '',
            SafetyCapApplied: keyParams.safetyCapApplied === true,
            SafetyCapDeferredByRateLimit: keyParams.safetyCapDeferredByRateLimit === true,
            FinalLimitingPolicy: keyParams.finalLimitingPolicy || '',
            SevereFlexEmergencyActive: keyParams.severeFlexEmergencyActive === true,
            MarketExtremeBear: keyParams.marketExtremeBear === true,
            RealTotalWealthDrawdownPct: Number.isFinite(keyParams.realTotalWealthDrawdownRatio)
                ? keyParams.realTotalWealthDrawdownRatio * 100
                : null,
            RealTotalWealthDrawdownThresholdPct: Number.isFinite(keyParams.realTotalWealthDrawdownThresholdRatio)
                ? keyParams.realTotalWealthDrawdownThresholdRatio * 100
                : null,
            MinimumFlexOverrideAllowed: keyParams.minimumFlexOverrideAllowed === true,
            AlarmActiveDiagnostic: keyParams.alarmActiveDiagnostic === true,
            WithdrawalBurdenFactor: Number.isFinite(keyParams.withdrawalBurdenFactor)
                ? keyParams.withdrawalBurdenFactor
                : null,
            AlarmWealthSufficient: typeof keyParams.alarmWealthSufficient === 'boolean'
                ? keyParams.alarmWealthSufficient
                : null,
            AlarmWealthSufficientThreshold: Number.isFinite(keyParams.alarmWealthSufficientThreshold)
                ? keyParams.alarmWealthSufficientThreshold
                : null,
            WithdrawalBurdenGateRole: keyParams.withdrawalBurdenGateRole || '',
            ProtectedPortfolioWithdrawalAnnual: Number.isFinite(keyParams.protectedPortfolioWithdrawalAnnual)
                ? keyParams.protectedPortfolioWithdrawalAnnual
                : null,
            ProtectedPortfolioWithdrawalRatePct: Number.isFinite(keyParams.protectedPortfolioWithdrawalRate)
                ? keyParams.protectedPortfolioWithdrawalRate * 100
                : null,
            ProtectedPortfolioWithdrawalRateThresholdPct: Number.isFinite(keyParams.protectedPortfolioWithdrawalRateThreshold)
                ? keyParams.protectedPortfolioWithdrawalRateThreshold * 100
                : null,
            ProtectedPortfolioWithdrawalCapacityCritical: keyParams.protectedPortfolioWithdrawalCapacityCritical === true,
            ProtectedPortfolioWithdrawalGateRole: keyParams.protectedPortfolioWithdrawalGateRole || '',
            BaseAlarmCutPct: Number.isFinite(keyParams.baseAlarmCutPct) ? keyParams.baseAlarmCutPct : null,
            EffectiveAlarmCutPct: Number.isFinite(keyParams.effectiveAlarmCutPct) ? keyParams.effectiveAlarmCutPct : null,
            FloorProtectionPolicy: keyParams.floorProtectionPolicy || '',
            WealthRedF: Number.isFinite(spendingResult.details?.wealthReductionFactor)
                ? spendingResult.details.wealthReductionFactor * 100
                : null,
            WealthQuoteUsedPct: Number.isFinite(spendingResult.details?.entnahmequoteUsed)
                ? spendingResult.details.entnahmequoteUsed * 100
                : null,
            CutReason: spendingResult.kuerzungQuelle || 'none',
            Alarm: spendingNewState.alarmActive || false,
            Regime: spendingNewState.lastMarketSKey || 'unknown',
            QuoteEndPct: withdrawalRateEndPct,
            RunwayCoveragePct: runwayCoveragePct,
            RunwayMeasurementPhase: 'after_transaction_before_payout',
            RunwayCoveragePostPayoutEndOfYearPct: runwayPostPayoutEndOfYearCoveragePct,
            RunwayTargetRawMonths: Number.isFinite(safetyDiagnosis.runwayTargetSmoothing?.rawTargetMonths) ? safetyDiagnosis.runwayTargetSmoothing.rawTargetMonths : null,
            RunwayTargetSmoothedMonths: Number.isFinite(safetyDiagnosis.runwayTargetSmoothing?.targetMonths) ? safetyDiagnosis.runwayTargetSmoothing.targetMonths : null,
            RunwayTargetSmoothingApplied: safetyDiagnosis.runwayTargetSmoothing?.smoothingApplied === true,
            RunwayTargetSmoothingFallback: safetyDiagnosis.runwayTargetSmoothing?.smoothingFallback === true,
            RunwayTargetSeverityPct: Number.isFinite(safetyDiagnosis.runwayTargetSmoothing?.severityPct) ? safetyDiagnosis.runwayTargetSmoothing.severityPct : null,
            RunwayTargetHardMinMonths: Number.isFinite(safetyDiagnosis.runwayTargetSmoothing?.hardMinimumMonths) ? safetyDiagnosis.runwayTargetSmoothing.hardMinimumMonths : null,
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
            runway_after_transaction_before_payout_months: runwayAfterTransactionBeforePayoutMonths,
            safety_runway_after_transaction_before_payout_months: runwayAfterTransactionBeforePayoutMonths,
            safety_runway_post_months: Number.isFinite(safetyDiagnosis.dynamicFlexSafetyRunwayMonate)
                ? safetyDiagnosis.dynamicFlexSafetyRunwayMonate
                : null,
            runway_post_payout_end_of_year_months: runwayPostPayoutEndOfYearMonths,
            safety_real_drawdown_pct: Number.isFinite(keyParams.realerDepotDrawdown) ? keyParams.realerDepotDrawdown * 100 : null,
            liq_before_payout: liqBeforePayout,
            liq_after_payout: liqAfterPayout,
            liq_after_interest: liqNachZins,
            portfolio_total_before_payout: portfolioTotalBeforePayout,
            portfolio_active_end: portfolioActiveEnd,
            portfolio_flow_delta: portfolioFlowDelta,
            tax_cash_adjustment: taxCashAdjustment,
            cash_interest_taxable_signed: signedEuros(actionResult?.taxSettlement?.cashInterestIncomeSigned),
            cash_interest_tax_delta: signedEuros(actionResult?.taxSettlement?.cashInterestTaxDelta),
            ...(Array.isArray(stressReplayTransactionDiagnostics)
                ? {
                    stressReplayTransactionDiagnostics: stressReplayTransactionDiagnostics.map(diagnostic => ({
                        ...diagnostic,
                        breakdown: Array.isArray(diagnostic?.breakdown)
                            ? diagnostic.breakdown.map(entry => ({ ...entry }))
                            : [],
                        missingness: Array.isArray(diagnostic?.missingness)
                            ? diagnostic.missingness.map(entry => ({ ...entry }))
                            : []
                    }))
                }
                : {}),
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
            liq_post_payout_end_of_year: liquiditaet,
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
            flex_erfuellt_nominal: fulfilledFlexFromPortfolio,
            flex_brutto_haushalt: grossHouseholdFlex,
            flex_rentenueberschuss: pensionFlexContribution,
            flex_aus_depot_bedarf: dynamicPortfolioFlex ?? inflatedFlex,
            flex_haushalt_basis: dynamicPortfolioFlex !== null
                ? 'effective_vpw_plus_pension_surplus'
                : 'static_input',
            flex_aus_depot_erfuellt: fulfilledFlexFromPortfolio,
            flex_haushalt_erfuellt: fulfilledHouseholdFlex,
            flex_haushalt_kuerzung_pct: householdFlexReductionPct,
            inflation_factor_cum: cumulativeInflationFactor,
            jahresentnahme_real: jahresEntnahmeEffektiv / cumulativeInflationFactor,
            pflege_aktiv: pflegeMeta?.active ?? false,
            pflege_zusatz_floor: pflegeMeta?.zusatzFloorZiel ?? 0,
            pflege_zusatz_floor_delta: pflegeMeta?.zusatzFloorDelta ?? 0,
            pflege_flex_faktor: pflegeMeta?.flexFactor ?? 1.0,
            pflege_kumuliert: pflegeMeta?.kumulierteKosten ?? 0,
            pflege_grade: pflegeMeta?.grade ?? null,
            pflege_grade_label: pflegeMeta?.gradeLabel ?? '',
            pflege_delta_flex: pflegeMeta?.log_delta_flex ?? 0,
            WidowBenefitP1: widowBenefits.p1FromP2
                ? pensionResult.widowBenefitP1ThisYear
                : 0,
            WidowBenefitP2: widowBenefits.p2FromP1
                ? pensionResult.widowBenefitP2ThisYear
                : 0,
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
