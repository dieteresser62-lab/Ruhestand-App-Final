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
import { euros, normalizeHouseholdContext, resolveCapeRatio, signedEuros } from './simulator-engine-direct-utils.js';
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
import { resolveSimulatorCumulativeInflationFactor } from './simulator-engine-helpers.js';
import { resolvePlannedAnnualWithdrawal } from '../../types/planned-withdrawal-contract.js';
import {
    PLANNED_ACTION_FLOW_EPSILON,
    resolvePlannedAction
} from '../../types/planned-action-contract.js';
import { settleTaxYear } from '../../engine/tax-settlement.mjs';

const formatInteger = (value) => Number.isFinite(value) ? Math.round(value) : 0;

export const SIMULATOR_YEAR_OUTCOME_KINDS = Object.freeze({
    SUCCESS: 'success',
    RUIN: 'ruin',
    TECHNICAL_ERROR: 'technical_error'
});

export const SIMULATOR_TECHNICAL_ERROR_CODES = Object.freeze({
    ENGINE_API_UNAVAILABLE: 'SIM_ENGINE_API_UNAVAILABLE',
    ENGINE_METHOD_UNAVAILABLE: 'SIM_ENGINE_METHOD_UNAVAILABLE',
    ENGINE_EXECUTION_EXCEPTION: 'SIM_ENGINE_EXECUTION_EXCEPTION',
    ENGINE_RESULT_ERROR: 'SIM_ENGINE_RESULT_ERROR',
    ENGINE_RESULT_SHAPE_INVALID: 'SIM_ENGINE_RESULT_SHAPE_INVALID',
    YEAR_DATA_RETURN_INVALID: 'SIM_YEAR_DATA_RETURN_INVALID'
});

function buildTechnicalErrorOutcome(code, message, cause = null, details = null) {
    const error = { code, message };
    if (details && typeof details === 'object') error.details = details;
    if (cause !== null && cause !== undefined) error.cause = cause;
    return {
        kind: SIMULATOR_YEAR_OUTCOME_KINDS.TECHNICAL_ERROR,
        isRuin: false,
        error
    };
}

function resolvePlannedActionSafely(options) {
    try {
        const resolution = resolvePlannedAction(options);
        if (resolution.status !== 'resolved') return resolution;
        const action = resolution.action;
        const materializedAction = {
            ...action,
            quellen: resolution.sources.map(source => ({ ...source })),
            verwendungen: { ...resolution.uses },
            ...(action.taxRawAggregate && typeof action.taxRawAggregate === 'object'
                && !Array.isArray(action.taxRawAggregate)
                ? { taxRawAggregate: { ...action.taxRawAggregate } }
                : {}),
            ...(action.taxSettlement && typeof action.taxSettlement === 'object'
                && !Array.isArray(action.taxSettlement)
                ? { taxSettlement: { ...action.taxSettlement } }
                : {})
        };
        return { ...resolution, action: materializedAction };
    } catch (cause) {
        return {
            status: 'invalid',
            reason: 'contract_evaluation_failed',
            context: {
                cause: cause instanceof Error ? cause.message : String(cause)
            }
        };
    }
}

function createPlannedActionFlowSnapshot(resolution) {
    const action = resolution.action;
    const snapshot = {
        schemaVersion: 'PlannedActionFlowV1',
        contractStatus: 'resolved_pre_execution',
        type: action.type,
        quellen: resolution.sources.map(source => Object.freeze({ ...source })),
        verwendungen: Object.freeze({ ...resolution.uses }),
        nettoErlös: action.nettoErlös,
        steuer: action.steuer,
        taxRawAggregate: Object.freeze({ ...action.taxRawAggregate })
    };
    Object.freeze(snapshot.quellen);
    return Object.freeze(snapshot);
}

function isPlainRecord(value) {
    if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
}

function matchesSettlementNumber(actual, expected) {
    return typeof actual === 'number'
        && Number.isFinite(actual)
        && Math.abs(actual - expected) <= PLANNED_ACTION_FLOW_EPSILON;
}

function resolveAnnualTaxSettlementSafely({
    action,
    newState,
    taxStatePrev,
    sparerPauschbetrag,
    kirchensteuerSatz
}) {
    try {
        const expected = settleTaxYear({
            taxStatePrev,
            rawAggregate: action?.taxRawAggregate,
            sparerPauschbetrag,
            kirchensteuerSatz
        });
        if (action?.taxSettlementDeferred === true) {
            return { status: 'invalid', reason: 'tax_settlement_deferred' };
        }
        if (!matchesSettlementNumber(action?.steuer, expected.taxDue)) {
            return {
                status: 'invalid',
                reason: 'action_tax_mismatch',
                context: { expectedTax: expected.taxDue, actualTax: action?.steuer }
            };
        }
        if (!isPlainRecord(action?.taxSettlement)) {
            return { status: 'invalid', reason: 'tax_settlement_shape_invalid' };
        }
        for (const [field, expectedValue] of Object.entries(expected.details)) {
            if (!matchesSettlementNumber(action.taxSettlement[field], expectedValue)) {
                return {
                    status: 'invalid',
                    reason: 'tax_settlement_detail_mismatch',
                    context: {
                        field,
                        expectedValue,
                        actualValue: action.taxSettlement[field]
                    }
                };
            }
        }
        if (!isPlainRecord(newState?.taxState)
            || !matchesSettlementNumber(newState.taxState.lossCarry, expected.taxStateNext.lossCarry)) {
            return {
                status: 'invalid',
                reason: 'tax_state_mismatch',
                context: {
                    expectedLossCarry: expected.taxStateNext.lossCarry,
                    actualLossCarry: newState?.taxState?.lossCarry
                }
            };
        }
        return { status: 'resolved', expected };
    } catch (cause) {
        return {
            status: 'invalid',
            reason: 'tax_settlement_evaluation_failed',
            context: {
                cause: cause instanceof Error ? cause.message : String(cause)
            }
        };
    }
}

function validateRequiredYearReturns(yearData) {
    const requiredFields = ['rendite', 'gold_eur_perf', 'zinssatz'];
    const invalidFields = requiredFields.filter(field => !Number.isFinite(yearData?.[field]));
    return invalidFields.length === 0
        ? null
        : buildTechnicalErrorOutcome(
            SIMULATOR_TECHNICAL_ERROR_CODES.YEAR_DATA_RETURN_INVALID,
            `Ungültige Jahresrenditen (${SIMULATOR_TECHNICAL_ERROR_CODES.YEAR_DATA_RETURN_INVALID}). Der Lauf wurde ohne Ruinwertung beendet.`,
            null,
            { invalidFields }
        );
}

function captureEngineBoundaryPortfolio(portfolio) {
    const captureTranches = tranches => Array.isArray(tranches)
        ? tranches.map(tranche => ({
            marketValue: tranche?.marketValue,
            hasTrancheId: Object.prototype.hasOwnProperty.call(tranche || {}, 'trancheId'),
            trancheId: tranche?.trancheId
        }))
        : [];
    return {
        equityTranches: captureTranches(portfolio?.depotTranchesAktien),
        goldTranches: captureTranches(portfolio?.depotTranchesGold),
        moneyMarketTranches: captureTranches(portfolio?.depotTranchesGeldmarkt),
        hasSimulationDate: Object.prototype.hasOwnProperty.call(portfolio || {}, 'simulationDate'),
        simulationDate: portfolio?.simulationDate,
        hasSourceProfileId: Object.prototype.hasOwnProperty.call(portfolio || {}, 'simulationSourceProfileId'),
        simulationSourceProfileId: portfolio?.simulationSourceProfileId
    };
}

function restoreEngineBoundaryPortfolio(portfolio, snapshot) {
    const restoreTranches = (tranches, trancheSnapshots) => {
        if (!Array.isArray(tranches)) return;
        for (let i = 0; i < tranches.length && i < trancheSnapshots.length; i++) {
            const trancheSnapshot = trancheSnapshots[i];
            tranches[i].marketValue = trancheSnapshot.marketValue;
            if (trancheSnapshot.hasTrancheId) tranches[i].trancheId = trancheSnapshot.trancheId;
            else delete tranches[i].trancheId;
        }
    };
    restoreTranches(portfolio?.depotTranchesAktien, snapshot.equityTranches);
    restoreTranches(portfolio?.depotTranchesGold, snapshot.goldTranches);
    restoreTranches(portfolio?.depotTranchesGeldmarkt, snapshot.moneyMarketTranches);
    if (snapshot.hasSimulationDate) portfolio.simulationDate = snapshot.simulationDate;
    else delete portfolio.simulationDate;
    if (snapshot.hasSourceProfileId) portfolio.simulationSourceProfileId = snapshot.simulationSourceProfileId;
    else delete portfolio.simulationSourceProfileId;
}

function buildRuinOutcome({
    currentState,
    portfolio,
    liquiditaet,
    marketDataCurrentYear,
    reason,
    requiredFloorNominal,
    coveredFloorNominal,
    effectiveWithdrawalNominal,
    depotValueNominal
}) {
    const terminalPortfolio = { ...portfolio, liquiditaet: euros(liquiditaet) };
    const normalizedRequiredFloor = euros(Math.max(0, Number(requiredFloorNominal) || 0));
    const normalizedCoveredFloor = euros(Math.max(
        0,
        Math.min(normalizedRequiredFloor, Number(coveredFloorNominal) || 0)
    ));
    const normalizedEffectiveWithdrawal = euros(Math.max(
        0,
        Math.min(normalizedCoveredFloor, Number(effectiveWithdrawalNominal) || 0)
    ));
    const normalizedDepotValue = Math.max(0, Number(depotValueNominal) || 0);
    const realizedWithdrawalRate = normalizedDepotValue > 0
        ? normalizedEffectiveWithdrawal / normalizedDepotValue
        : 0;
    return {
        kind: SIMULATOR_YEAR_OUTCOME_KINDS.RUIN,
        isRuin: true,
        reason,
        ruinDetails: {
            requiredFloorNominal: normalizedRequiredFloor,
            coveredFloorNominal: normalizedCoveredFloor,
            shortfallNominal: euros(Math.max(0, normalizedRequiredFloor - normalizedCoveredFloor)),
            effectiveWithdrawalNominal: normalizedEffectiveWithdrawal,
            depotValueNominal: normalizedDepotValue,
            realizedWithdrawalRate
        },
        logData: {
            entnahmequote: realizedWithdrawalRate,
            entnahme_effektiv: normalizedEffectiveWithdrawal,
            depotwert_gesamt: normalizedDepotValue,
            terminal_ruin_year: true
        },
        newState: {
            ...currentState,
            portfolio: terminalPortfolio,
            marketDataHist: marketDataCurrentYear || currentState.marketDataHist
        }
    };
}

function scaleFiniteRealValue(target, key, scale) {
    if (!target || !Number.isFinite(target[key])) return;
    target[key] *= scale;
}

function alignEngineInflationContract(fullResult, cumulativeInflationFactor) {
    const spendingNewState = fullResult?.newState;
    if (!spendingNewState) return;

    const engineFactor = Number(spendingNewState.cumulativeInflationFactor);
    const validEngineFactor = Number.isFinite(engineFactor) && engineFactor > 0
        ? engineFactor
        : 1;
    const realValueScale = validEngineFactor / cumulativeInflationFactor;

    scaleFiniteRealValue(spendingNewState, 'peakRealVermoegen', realValueScale);
    scaleFiniteRealValue(spendingNewState, 'lastEntnahmeReal', realValueScale);
    spendingNewState.cumulativeInflationFactor = cumulativeInflationFactor;

    const spendingDetails = fullResult.ui?.spending?.details;
    scaleFiniteRealValue(spendingDetails, 'peakRealVermoegen', realValueScale);
    scaleFiniteRealValue(spendingDetails, 'currentRealVermoegen', realValueScale);
    if (spendingDetails) {
        spendingDetails.cumulativeInflationFactor = cumulativeInflationFactor;
    }

    const diagnosisKeyParams = fullResult.diagnosis?.keyParams;
    scaleFiniteRealValue(diagnosisKeyParams, 'peakRealVermoegen', realValueScale);
    scaleFiniteRealValue(diagnosisKeyParams, 'currentRealVermoegen', realValueScale);
    if (diagnosisKeyParams) {
        diagnosisKeyParams.cumulativeInflationFactor = cumulativeInflationFactor;
    }
}

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
        return buildTechnicalErrorOutcome(
            SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_API_UNAVAILABLE,
            `Die Simulations-Engine ist nicht verfügbar (${SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_API_UNAVAILABLE}).`
        );
    }

    if (typeof engine.simulateSingleYear !== 'function') {
        return buildTechnicalErrorOutcome(
            SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_METHOD_UNAVAILABLE,
            `Die Simulations-Engine besitzt keinen gültigen Jahreseinstieg (${SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_METHOD_UNAVAILABLE}).`
        );
    }

    const invalidYearReturns = validateRequiredYearReturns(yearData);
    if (invalidYearReturns) return invalidYearReturns;

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
    const engineBoundaryPortfolio = captureEngineBoundaryPortfolio(portfolio);
    const cumulativeInflationFactor = resolveSimulatorCumulativeInflationFactor(currentState);

    const sampledYear = Number(yearData?.jahr);
    const deterministicYear = Number.isInteger(sampledYear) && sampledYear >= 1 && sampledYear <= 9999
        ? sampledYear
        : Math.min(9999, Math.max(1, 2000 + (Number(yearIndex) || 0)));
    portfolio.simulationDate = `${String(deterministicYear).padStart(4, '0')}-12-31`;
    if (inputs.simulationSourceProfileId) {
        portfolio.simulationSourceProfileId = String(inputs.simulationSourceProfileId);
    }

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
    const stressReplayTransactionCapture = inputs?.stressReplayTransactionCapture === true;

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
        return {
            kind: SIMULATOR_YEAR_OUTCOME_KINDS.SUCCESS,
            isRuin: false,
            ...simulateAccumulationYear({
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
            })
        };
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
    const engineLastState = lastState?.initialized
        ? { ...lastState, cumulativeInflationFactor }
        : lastState;
    let fullResult;
    try {
        fullResult = engine.simulateSingleYear(engineInput, engineLastState);
    } catch (cause) {
        restoreEngineBoundaryPortfolio(portfolio, engineBoundaryPortfolio);
        return buildTechnicalErrorOutcome(
            SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_EXECUTION_EXCEPTION,
            `Die Simulations-Engine konnte das Jahr nicht berechnen (${SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_EXECUTION_EXCEPTION}).`,
            cause
        );
    }

    // FAIL-SAFE: Error-Handling
    if (fullResult?.error) {
        restoreEngineBoundaryPortfolio(portfolio, engineBoundaryPortfolio);
        return buildTechnicalErrorOutcome(
            SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_ERROR,
            `Die Simulations-Engine hat das Jahr abgewiesen (${SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_ERROR}).`,
            fullResult.error
        );
    }
    if (!fullResult?.ui
        || !fullResult.ui.spending
        || !fullResult.ui.action
        || !fullResult.ui.market
        || !fullResult.newState) {
        restoreEngineBoundaryPortfolio(portfolio, engineBoundaryPortfolio);
        return buildTechnicalErrorOutcome(
            SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_SHAPE_INVALID,
            `Die Simulations-Engine lieferte ein unvollständiges Ergebnis (${SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_SHAPE_INVALID}).`,
            fullResult
        );
    }

    const plannedWithdrawalResolution = resolvePlannedAnnualWithdrawal({
        spendingResult: fullResult.ui.spending
    });
    if (plannedWithdrawalResolution.status !== 'resolved') {
        restoreEngineBoundaryPortfolio(portfolio, engineBoundaryPortfolio);
        return buildTechnicalErrorOutcome(
            SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_SHAPE_INVALID,
            `Die Simulations-Engine lieferte keine eindeutige geplante Jahresentnahme (${SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_SHAPE_INVALID}).`,
            null,
            {
                contract: 'planned_annual_withdrawal',
                status: plannedWithdrawalResolution.status,
                candidates: plannedWithdrawalResolution.candidates
            }
        );
    }

    alignEngineInflationContract(fullResult, cumulativeInflationFactor);

    // Extrahiere Ergebnisse direkt aus fullResult
    const spendingResult = fullResult.ui.spending;
    const rawActionResult = fullResult.ui.action;
    const market = fullResult.ui.market;
    const zielLiquiditaet = fullResult.ui.zielLiquiditaet;
    const spendingNewState = fullResult.newState;

    // Die Engine-Grenze wird vor jeder 3-Bucket-Transformation validiert.
    // Andernfalls koennte ein Override einen fehlerhaften Adaptervertrag durch
    // Nullsetzen oder Ersetzen seiner Quellen scheinbar reparieren.
    const rawPlannedActionResolution = resolvePlannedActionSafely({
        action: rawActionResult,
        availableLiquidity: liquiditaet,
        detailedTranches,
        requireAssetInventory: true,
        allowedUseKeys: ['liquiditaet', 'gold', 'aktien']
    });
    if (rawPlannedActionResolution.status !== 'resolved') {
        restoreEngineBoundaryPortfolio(portfolio, engineBoundaryPortfolio);
        return buildTechnicalErrorOutcome(
            SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_SHAPE_INVALID,
            `Die Simulations-Engine lieferte keine ausgeglichene geplante Transaktion (${SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_SHAPE_INVALID}).`,
            null,
            {
                contract: 'planned_action_flow',
                phase: 'engine_output',
                reason: rawPlannedActionResolution.reason,
                ...rawPlannedActionResolution.context
            }
        );
    }
    const rawActionSnapshot = rawPlannedActionResolution.action;
    const rawTaxSettlementResolution = resolveAnnualTaxSettlementSafely({
        action: rawActionSnapshot,
        newState: spendingNewState,
        taxStatePrev,
        sparerPauschbetrag: engineInput.sparerPauschbetrag,
        kirchensteuerSatz: engineInput.kirchensteuerSatz
    });
    if (rawTaxSettlementResolution.status !== 'resolved') {
        restoreEngineBoundaryPortfolio(portfolio, engineBoundaryPortfolio);
        return buildTechnicalErrorOutcome(
            SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_SHAPE_INVALID,
            `Die Simulations-Engine lieferte keine zentral reconciliierte Jahressteuer (${SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_SHAPE_INVALID}).`,
            null,
            {
                contract: 'annual_tax_settlement',
                phase: 'engine_output',
                reason: rawTaxSettlementResolution.reason,
                ...rawTaxSettlementResolution.context
            }
        );
    }
    const actionRawAggregate = buildTaxRawAggregate(rawActionSnapshot.taxRawAggregate);
    combinedTaxRawAggregate = { ...actionRawAggregate };
    const actionResult = {
        ...rawActionSnapshot,
        ...(Array.isArray(rawActionSnapshot.quellen)
            ? { quellen: rawActionSnapshot.quellen.map(source => ({ ...source })) }
            : {}),
        ...(rawActionSnapshot.verwendungen && typeof rawActionSnapshot.verwendungen === 'object'
            && !Array.isArray(rawActionSnapshot.verwendungen)
            ? { verwendungen: { ...rawActionSnapshot.verwendungen } }
            : {}),
        ...(rawActionSnapshot.taxRawAggregate && typeof rawActionSnapshot.taxRawAggregate === 'object'
            && !Array.isArray(rawActionSnapshot.taxRawAggregate)
            ? { taxRawAggregate: { ...rawActionSnapshot.taxRawAggregate } }
            : {})
    };

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
    const plannedActionResolution = resolvePlannedActionSafely({
        action: actionResult,
        availableLiquidity: liquiditaet,
        detailedTranches,
        requireAssetInventory: true,
        allowedUseKeys: ['liquiditaet', 'gold', 'aktien']
    });
    if (plannedActionResolution.status !== 'resolved') {
        restoreEngineBoundaryPortfolio(portfolio, engineBoundaryPortfolio);
        return buildTechnicalErrorOutcome(
            SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_SHAPE_INVALID,
            `Die Simulations-Engine lieferte keine ausgeglichene geplante Transaktion (${SIMULATOR_TECHNICAL_ERROR_CODES.ENGINE_RESULT_SHAPE_INVALID}).`,
            null,
            {
                contract: 'planned_action_flow',
                phase: 'three_bucket_final',
                reason: plannedActionResolution.reason,
                ...plannedActionResolution.context
            }
        );
    }
    const plannedActionFlow = createPlannedActionFlowSnapshot(plannedActionResolution);
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
    const regularSaleBreakdown = stressReplayTransactionCapture && hasSales && regularSaleScale > 0
        ? saleQuellen.map(source => ({
            assetClass: source?.category || source?.kind || 'unknown',
            grossEur: (Number(source?.brutto) || 0) * regularSaleScale,
            netEur: typeof source?.netto === 'number' && Number.isFinite(source.netto) && source.netto >= 0
                ? source.netto * regularSaleScale
                : null,
            taxEur: typeof source?.steuer === 'number' && Number.isFinite(source.steuer) && source.steuer >= 0
                ? source.steuer * regularSaleScale
                : null
        }))
        : [];
    const regularSaleMissingness = regularSaleBreakdown.flatMap((item, breakdownIndex) => [
        ...(item.netEur === null ? [{
            scope: 'breakdown',
            breakdownIndex,
            assetClass: item.assetClass,
            field: 'netEur',
            reason: 'policy_sale_breakdown_net_not_reported'
        }] : []),
        ...(item.taxEur === null ? [{
            scope: 'breakdown',
            breakdownIndex,
            assetClass: item.assetClass,
            field: 'taxEur',
            reason: 'policy_sale_breakdown_tax_not_reported'
        }] : [])
    ]);
    const regularSaleDiagnostic = stressReplayTransactionCapture && hasSales && regularSaleScale > 0
        ? {
            class: 'policy_rebalancing_sale',
            phase: 'after_action_sales',
            oracle: 'engine_action_sources_with_execution_scale_v1',
            requestedNetEur: Number(actionResult.nettoErlös) || 0,
            grossEur: plannedSaleBrutto * regularSaleScale,
            netEur: (Number(actionResult.nettoErlös) || 0) * regularSaleScale,
            taxEur: (Number(actionResult.steuer) || 0) * regularSaleScale,
            breakdown: regularSaleBreakdown,
            missingness: regularSaleMissingness
        }
        : null;

    // Aktualisiere Liquidität nach Transaktionen
    if (hasSales && actionResult.nettoErlös > 0) {
        const reinvestedPlanned = (actionResult.verwendungen?.gold || 0) + (actionResult.verwendungen?.aktien || 0);
        const actualNettoErlos = (actionResult.nettoErlös || 0) * regularSaleScale;
        const actualReinvested = reinvestedPlanned * regularSaleScale;
        buyGoldAmount = (actionResult.verwendungen?.gold || 0) * regularSaleScale;
        buyEqAmount = (actionResult.verwendungen?.aktien || 0) * regularSaleScale;
        liquiditaet += Math.max(0, actualNettoErlos - actualReinvested);
    }
    if (liquiditaet < 0 && liquiditaet >= -PLANNED_ACTION_FLOW_EPSILON) {
        liquiditaet = 0;
    }
    snapshotBalance('after_action_sales', {
        plannedSaleBrutto: euros(plannedSaleBrutto),
        nettoErlos: euros(actionResult.nettoErlös),
        cashSpend: euros(cashSpend),
        buyEqAmount: euros(buyEqAmount),
        buyGoldAmount: euros(buyGoldAmount)
    });

    // Auch injizierbare Engine-Adapter dürfen nur die Monatsdarstellung
    // liefern. Derselbe Vertrag wie im Core reconciliert alle vorhandenen
    // Darstellungen; fehlende oder widersprüchliche Shapes scheitern sichtbar.
    const jahresEntnahmePlan = plannedWithdrawalResolution.annualWithdrawal;
    const jahresEntnahme = jahresEntnahmePlan;

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
        combinedTaxRawAggregate,
        captureTransactions: stressReplayTransactionCapture
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
        return buildRuinOutcome({
            currentState,
            portfolio,
            liquiditaet,
            marketDataCurrentYear,
            reason: `Gesamtvermögen (${formatInteger(totalWealthAvailable)}) < Floor (${formatInteger(netFloorYear)})`,
            requiredFloorNominal: netFloorYear,
            coveredFloorNominal: totalWealthAvailable,
            // D-14 measures the amount actually paid out. This ruin branch
            // terminates before the payout step, so the realized withdrawal
            // is exactly zero even if residual wealth could cover part of the
            // floor.
            effectiveWithdrawalNominal: 0,
            depotValueNominal: depotwertGesamt
        });
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
        formatRuinNumber: formatInteger,
        captureTransactions: stressReplayTransactionCapture
    });
    if (payoutFallback.isRuin) {
        return buildRuinOutcome({
            currentState,
            portfolio,
            liquiditaet: payoutFallback.liquiditaet,
            marketDataCurrentYear,
            reason: payoutFallback.reason,
            requiredFloorNominal: netFloorYear,
            coveredFloorNominal: jahresEntnahmeEffektiv + equityAfterBuys + goldAfterBuys,
            // Assets that remain after the partial payout are coverage
            // capacity, not an effective withdrawal.
            effectiveWithdrawalNominal: jahresEntnahmeEffektiv,
            depotValueNominal: depotwertGesamt
        });
    }
    liquiditaet = payoutFallback.liquiditaet;
    bondSaleAmount += payoutFallback.bondSaleAmountDelta;
    unmetLiquidity += payoutFallback.unmetLiquidityDelta;
    if (stressReplayTransactionCapture && payoutFallback.transactionDiagnostic) {
        snapshotBalance('after_payout_fallback', {
            grossSale: euros(payoutFallback.transactionDiagnostic.grossEur),
            netProceeds: euros(payoutFallback.transactionDiagnostic.netEur),
            taxMissing: payoutFallback.transactionDiagnostic.taxEur === null
        });
    }

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
        combinedTaxRawAggregate,
        captureTransactions: stressReplayTransactionCapture
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
    liquiditaet = euros(liqBasisForInterest * (1 + rC));
    cashZinsen = liquiditaet - liqBasisForInterest;
    liqNachZins = euros(liquiditaet);
    if (!isFinite(liquiditaet)) liquiditaet = 0;
    snapshotBalance('after_cash_interest', {
        cashInterestEarned: cashZinsen,
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
        forceRecompute: threeBucketState.is3Bucket && threeBucketState.isBadYear,
        actionResult,
        plannedActionFlow,
        spendingNewState,
        taxStatePrev,
        combinedTaxRawAggregate,
        sparerPauschbetrag: engineInput.sparerPauschbetrag,
        kirchensteuerSatz: engineInput.kirchensteuerSatz,
        cashInterestIncomeSigned: cashZinsen,
        forcedSaleScaleApplied,
        regularSaleScale,
        forcedTaxReserved
    });
    totalTaxesThisYear = taxReconciliation.totalTaxesThisYear;
    // Verkaufssteuer ist bereits in den Verkaufserloesen reserviert. Der
    // zusaetzliche signierte Anteil stammt ausschliesslich aus dem
    // Cashzins-Settlement und ist durch den verzinsten Cashbestand gedeckt.
    // Hier darf deshalb kein spaeter, von MC/Sweep nicht isolierter Wurf einen
    // kompletten Batch abbrechen; die naechste Enginegrenze validiert den
    // bilanzierten Zustand weiterhin fail-closed.
    liquiditaet = euros(liquiditaet + taxReconciliation.taxCashAdjustment);
    snapshotBalance('after_tax_reconciliation', {
        regularSaleScale,
        forcedTaxReserved: euros(forcedTaxReserved),
        taxCashAdjustment: signedEuros(taxReconciliation.taxCashAdjustment)
    });

    // Verkäufe erst nach der finalen Jahressteuer zusammenfassen.
    const vk = actionResult.quellen ? summarizeSalesByAsset({
        breakdown: actionResult.quellen,
        steuerGesamt: actionResult.steuer || 0
    }) : { vkAkt: 0, vkGld: 0, vkBnd: 0, stAkt: 0, stGld: 0, vkGes: 0, stGes: 0 };

    return {
        kind: SIMULATOR_YEAR_OUTCOME_KINDS.SUCCESS,
        ...buildSimulatorYearResult({
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
        stressReplayTransactionDiagnostics: stressReplayTransactionCapture
            ? [
                regularSaleDiagnostic,
                forcedCoverage.transactionDiagnostic,
                payoutFallback.transactionDiagnostic,
                bondRefill.transactionDiagnostic
            ].filter(Boolean)
            : null,
        balanceTrace
        })
    };
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
