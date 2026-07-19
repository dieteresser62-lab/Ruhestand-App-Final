
import { simulateOneYear } from '../app/simulator/simulator-engine-wrapper.js';
import { calculateHouseholdPensionForYear } from '../app/simulator/simulator-household-pension.js';
import {
    applyAnnualReturnsToPortfolio,
    buildCurrentYearMarketData,
    buildNextMarketDataHist
} from '../app/simulator/simulator-year-portfolio.js';
import { buildSimulatorEngineInput } from '../app/simulator/simulator-engine-input.js';
import { simulateAccumulationYear } from '../app/simulator/simulator-accumulation-year.js';
import { buildSimulatorYearResult } from '../app/simulator/simulator-year-result.js';
import { EngineAPI } from '../engine/index.mjs';

// --- MOCKING GLOBAL STATE ---
// simulator-engine.js relies on window.Ruhestandsmodell_v30 and window.EngineAPI
if (typeof global.window === 'undefined') {
    global.window = {};
}
global.window.EngineAPI = EngineAPI;

function assert(condition, message) {
    if (!condition) throw new Error(message || "Assertion failed");
}

function assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: Actual ${actual} != Expected ${expected}`);
    }
}

console.log('--- Simulation Loop Tests ---');

// Test 0a: extracted portfolio progression applies stock/bond/gold returns
try {
    const portfolio = {
        depotTranchesAktien: [
            { marketValue: 1000, costBasis: 800, type: 'aktien_alt' },
            { marketValue: 500, costBasis: 500, type: 'anleihe', category: 'bonds' }
        ],
        depotTranchesGold: [{ marketValue: 200, costBasis: 150, type: 'gold' }],
        liquiditaet: 0
    };
    const progression = applyAnnualReturnsToPortfolio({
        portfolio,
        yearData: { rendite: 0.1, gold_eur_perf: 5, zinssatz: 2 },
        threeBucketInput: { bondNominalReturn: 0.03 }
    });
    assertClose(portfolio.depotTranchesAktien[0].marketValue, 1100, 1e-9, 'Equity tranche should apply equity return');
    assertClose(portfolio.depotTranchesAktien[1].marketValue, 510, 1e-9, 'Bond tranche should apply yearData zinssatz return');
    assertClose(portfolio.depotTranchesGold[0].marketValue, 210, 1e-9, 'Gold tranche should apply gold return');
    assertClose(progression.equityBeforeReturn, 1500, 1e-9, 'Progression should report equity before return');
    assertClose(progression.goldAfterReturn, 210, 1e-9, 'Progression should report gold after return');

    const market = buildCurrentYearMarketData({
        yearData: { inflation: 2, capeRatio: 21 },
        inputs: { capeRatio: 20 },
        marketDataHist: { endeVJ: 100, endeVJ_1: 90, endeVJ_2: 80, capeRatio: 19 },
        rA: 0.1
    });
    assertClose(market.marketDataCurrentYear.endeVJ, 110, 1e-9, 'Current market window should advance endeVJ');
    const nextHist = buildNextMarketDataHist({
        marketDataHist: { endeVJ: 100, endeVJ_1: 90, endeVJ_2: 80, ath: 120, jahreSeitAth: 2 },
        yearData: { inflation: 2 },
        rA: 0.1,
        resolvedCapeRatio: 21
    });
    assertClose(nextHist.endeVJ, 110, 1e-9, 'Next market history should advance endeVJ');
    assert(nextHist.jahreSeitAth === 3, 'Years since ATH should increase below ATH');
    console.log('✅ Extracted portfolio progression helpers passed');
} catch (e) {
    console.error('Test 0a Failed', e);
    throw e;
}

// Test 0b: extracted pension helper preserves offsets, partner tax and widow benefits
try {
    const pension = calculateHouseholdPensionForYear({
        inputs: {
            startAlter: 67,
            rentAdjPct: 2,
            renteStartOffsetJahre: 0,
            partner: { aktiv: true, startInJahren: 0, steuerquotePct: 10 }
        },
        yearIndex: 1,
        currentAnnualPension: 12000,
        currentAnnualPension2: 6000,
        widowPensionP1: 3000,
        widowPensionP2: 2000,
        p1Alive: true,
        p2Alive: true,
        widowBenefits: { p1FromP2: true, p2FromP1: false },
        effectiveBaseFloor: 20000,
        baseFlex: 10000,
        temporaryFlexFactor: 0.5
    });
    assertClose(pension.rente1, 15000, 1e-9, 'P1 pension should include widow benefit');
    assertClose(pension.rente2, 5400, 1e-9, 'P2 pension should apply tax quote');
    assertClose(pension.pensionAnnual, 20400, 1e-9, 'Household pension should sum both persons');
    assertClose(pension.inflatedFloor, 0, 1e-9, 'Pension should cover floor');
    assertClose(pension.inflatedFlex, 4600, 1e-9, 'Pension surplus should reduce flex');
    assertClose(pension.nextAnnualPension, 12240, 1e-9, 'P1 next pension should index');
    assertClose(pension.nextWidowPensionP1, 3060, 1e-9, 'Widow pension should index while active');
    console.log('✅ Extracted household pension helper passed');
} catch (e) {
    console.error('Test 0b Failed', e);
    throw e;
}

// Test 0c: extracted EngineAPI input mapping preserves overrides and market window
try {
    const { engineInput, detailedTranches } = buildSimulatorEngineInput({
        inputs: {
            startAlter: 65,
            goldAktiv: true,
            goldZielProzent: 12,
            flexBudgetYears: 3,
            targetEq: 70
        },
        portfolio: {
            depotTranchesAktien: [{ marketValue: 100000, costBasis: 80000, type: 'aktien_alt', category: 'equity' }],
            depotTranchesGold: [{ marketValue: 10000, costBasis: 9000, type: 'gold', category: 'gold' }],
            healthBucketGeldmarkt: 150000,
            healthBucketTranches: [{ marketValue: 150000, costBasis: 150000, type: 'geldmarkt', category: 'money_market' }],
            liquiditaet: 999
        },
        marketDataCurrentYear: {
            endeVJ: 110,
            endeVJ_1: 100,
            endeVJ_2: 90,
            endeVJ_3: 80,
            ath: 120,
            jahreSeitAth: 2
        },
        marketDataHist: { ath: 100, jahreSeitAth: 1 },
        yearData: { inflation: 2 },
        yearIndex: 4,
        liquiditaet: 25000,
        effectiveBaseFloor: 30000,
        baseFlex: 12000,
        baseMinimumFlexAnnual: 3000,
        temporaryFlexFactor: 0.5,
        baseFlexBudgetAnnual: 4000,
        baseFlexBudgetRecharge: 500,
        pensionAnnual: 18000,
        resolvedCapeRatio: 21
    });
    assertClose(engineInput.aktuelleLiquiditaet, 25000, 1e-9, 'Engine input should use tracked liquidity override');
    assert(typeof engineInput.aktuelleLiquiditaet === 'number', 'Engine input liquidity override should be a number');
    assert(engineInput.aktuellesAlter === 69, 'Engine input should advance current age');
    assertClose(engineInput.floorBedarf, 30000, 1e-9, 'Engine input should pass gross floor');
    assertClose(engineInput.flexBedarf, 6000, 1e-9, 'Engine input should apply temporary flex factor');
    assertClose(engineInput.minimumFlexAnnual, 1500, 1e-9, 'Engine input should apply same temporary factor to minimum flex');
    assertClose(engineInput.renteMonatlich, 1500, 1e-9, 'Engine input should pass monthly household pension');
    assertClose(engineInput.goldZielProzent, 12, 1e-9, 'Engine input should preserve active gold target');
    assertClose(engineInput.endeVJ, 110, 1e-9, 'Engine input should use current market window');
    assert(engineInput.aktuelleLiquiditaet !== 175000, 'Engine input must not add locked health bucket to operating liquidity');
    assert(engineInput.detailledTranches.length === 2, 'Engine input should include detailed tranches');
    assert(!engineInput.detailledTranches.some(t => t?.category === 'money_market'), 'Engine input should not include locked health bucket tranches');
    assert(detailedTranches.length === 2, 'Detailed tranche return should match engine input');

    const { engineInput: zeroLiquidityInput } = buildSimulatorEngineInput({
        inputs: { startAlter: 65, goldAktiv: false, targetEq: 70 },
        portfolio: { depotTranchesAktien: [], depotTranchesGold: [], liquiditaet: 999 },
        marketDataCurrentYear: { endeVJ: 110, endeVJ_1: 100, endeVJ_2: 90, endeVJ_3: 80, ath: 120, jahreSeitAth: 2 },
        marketDataHist: { ath: 100, jahreSeitAth: 1 },
        yearData: { inflation: 2 },
        yearIndex: 0,
        liquiditaet: 0,
        effectiveBaseFloor: 30000,
        baseFlex: 12000,
        temporaryFlexFactor: 1,
        baseFlexBudgetAnnual: 0,
        baseFlexBudgetRecharge: 0,
        pensionAnnual: 0,
        resolvedCapeRatio: 21
    });
    assert(typeof zeroLiquidityInput.aktuelleLiquiditaet === 'number', 'Zero liquidity override should remain a number');
    assertEqual(zeroLiquidityInput.aktuelleLiquiditaet, 0, 'Zero liquidity override should be preserved');
    console.log('✅ Extracted EngineAPI input mapping passed');
} catch (e) {
    console.error('Test 0c Failed', e);
    throw e;
}

// Test 0d: extracted accumulation year helper preserves savings, interest and shadow pension tracking
try {
    const portfolio = {
        depotTranchesAktien: [],
        depotTranchesGold: [],
        liquiditaet: 1000
    };
    const result = simulateAccumulationYear({
        currentState: {
            portfolio,
            currentAnnualPension: 12000,
            currentAnnualPension2: 6000,
            marketDataHist: { endeVJ: 100, endeVJ_1: 90, endeVJ_2: 80, ath: 100, jahreSeitAth: 0 },
            accumulationState: { yearsSaved: 2, totalContributed: 2400, sparrateThisYear: 1200 },
            samplerState: { block: 1 },
            transitionYear: 5
        },
        inputs: {
            startAlter: 60,
            rentAdjPct: 2,
            risikoprofil: 'sicherheits-dynamisch',
            targetEq: 60,
            goldAktiv: false,
            runwayTargetMonths: 24,
            accumulationPhase: {
                enabled: true,
                sparrate: 100,
                sparrateIndexing: 'inflation'
            }
        },
        yearData: { jahr: 2001, inflation: 3 },
        yearIndex: 2,
        portfolio,
        liquiditaet: 1000,
        initialLiqStart: 1000,
        rA: 0.05,
        rG: 0,
        rC: 0.01,
        bondBucketBefore: 0,
        marketDataCurrentYear: { endeVJ: 105, endeVJ_1: 100, endeVJ_2: 90, inflation: 3, capeRatio: 20 },
        marketDataHist: { endeVJ: 100, endeVJ_1: 90, endeVJ_2: 80, ath: 100, jahreSeitAth: 0 },
        resolvedCapeRatio: 20,
        baseFloor: 120000,
        baseFlex: 0,
        baseMinimumFlexAnnual: 1000,
        baseFlexBudgetAnnual: 0,
        baseFlexBudgetRecharge: 0,
        effectiveBaseFloor: 120000,
        currentAnnualPension: 12000,
        currentAnnualPension2: 6000,
        householdCtx: { p1Alive: true, p2Alive: true },
        isBadYear: false
    });
    assertClose(result.newState.portfolio.liquiditaet, 2246, 1e-9, 'Accumulation should add cash interest and indexed savings');
    assertClose(result.newState.accumulationState.sparrateThisYear, 1236, 1e-9, 'Accumulation should index savings by inflation');
    assertClose(result.newState.accumulationState.totalContributed, 3636, 1e-9, 'Accumulation should track total contributions');
    assertClose(result.newState.baseMinimumFlexAnnual, 1030, 1e-9, 'Accumulation should index minimum flex by inflation');
    assertClose(result.newState.currentAnnualPension, 12240, 1e-9, 'Accumulation should index shadow pension P1');
    assert(result.logData.Regime === 'accumulation', 'Accumulation log should use accumulation regime');
    assert(result.logData.GuardNote === 'accumulation_phase', 'Accumulation log should mark guard note');
    console.log('✅ Extracted accumulation year helper passed');
} catch (e) {
    console.error('Test 0d Failed', e);
    throw e;
}

// Test 0e: extracted year result builder preserves core return and log shape
try {
    const portfolio = {
        depotTranchesAktien: [{ marketValue: 100000, costBasis: 90000, type: 'aktien_alt', category: 'equity' }],
        depotTranchesGold: [],
        healthBucketGeldmarkt: 30000,
        healthBucketMeta: {
            warnings: ['Pflegebucket auf verfuegbare Liquiditaet gekappt: 30000 von 40000 EUR.']
        },
        liquiditaet: 0
    };
    const yearResultArgs = {
        portfolio,
        liquiditaet: 20000,
        spendingResult: {
            monatlicheEntnahme: 1000,
            kuerzungProzent: 0,
            kuerzungQuelle: 'none',
            details: { flexRate: 1, entnahmequoteDepot: 0.12 }
        },
        actionResult: {
            title: 'Test Action',
            transactionDiagnostics: { blockReason: 'none' },
            taxSettlement: { spbUsedThisYear: 0, taxSavedByLossCarry: 0 }
        },
        market: { szenarioText: 'test' },
        spendingNewState: { lastMarketSKey: 'BULL', alarmActive: false, cumulativeInflationFactor: 1, taxState: { lossCarry: 0 } },
        yearData: { inflation: 2 },
        fullResult: {
            ui: { vpw: null, runway: { months: 24 }, liquiditaet: { deckungNachher: 100 } },
            diagnosis: {
                general: {
                    runwayTargetSmoothing: {
                        smoothingApplied: true,
                        smoothingFallback: false,
                        rawTargetMonths: 60,
                        targetMonths: 48,
                        severityPct: 50,
                        hardMinimumMonths: 24
                    }
                },
                keyParams: {}
            }
        },
        currentState: { samplerState: { seed: 1 } },
        newMarketDataHist: { endeVJ: 102 },
        initialLiqStart: 30000,
        jahresEntnahmePlan: 12000,
        jahresEntnahmeEffektiv: 12000,
        liqBeforePayout: 32000,
        liqAfterPayout: 20000,
        portfolioTotalBeforePayout: 132000,
        buyEqAmount: 0,
        buyGoldAmount: 0,
        kaufAkt: 0,
        kaufGld: 0,
        baseFloor: 24000,
        baseFlex: 6000,
        baseFlexBudgetAnnual: 0,
        baseFlexBudgetRecharge: 0,
        pensionResult: {
            nextWidowPensionP1: 0,
            nextWidowPensionP2: 0,
            nextAnnualPension: 0,
            nextAnnualPension2: 0
        },
        rA: 0.05,
        rG: 0,
        depotwertGesamt: 100000,
        totalTaxesThisYear: 0,
        vk: { vkAkt: 0, vkGld: 0, vkBnd: 0, stAkt: 0, stGld: 0, stBnd: 0, vkGes: 0, stGes: 0 },
        depotTranchesAktien: portfolio.depotTranchesAktien,
        depotTranchesGold: portfolio.depotTranchesGold,
        equityBeforeReturn: 95000,
        equityAfterReturn: 100000,
        equityAfterSales: 100000,
        equityAfterBuys: 100000,
        goldBeforeReturn: 0,
        goldAfterReturn: 0,
        goldAfterSales: 0,
        goldAfterBuys: 0,
        cashZinsen: 0,
        liqNachZins: 20000,
        zielLiquiditaet: 0,
        bondBucketBefore: 0,
        bondRefillGross: 0,
        bondRefillNet: 0,
        bondRefillTax: 0,
        bondSaleAmount: 0,
        effectiveBaseFloor: 24000,
        pensionAnnual: 0,
        rente1: 0,
        rente2: 0,
        renteSum: 0,
        inflatedFloor: 24000,
        inflatedFlex: 6000,
        pflegeMeta: null,
        widowBenefits: { p1FromP2: false, p2FromP1: false },
        widowPensionP1: 0,
        widowPensionP2: 0,
        p1Alive: true,
        p2Alive: true,
        guardReason: 'engine_guard_primary',
        isBadYear: false,
        equityPreserved: 0,
        unmetLiquidity: 0,
        balanceTrace: [
            { phase: 'after_payout', total: 120000, equity: 100000, bonds: 0, gold: 0, cash: 20000 }
        ]
    };
    const result = buildSimulatorYearResult(yearResultArgs);
    assert(result.newState.baseFloor === 24480, 'Year result should inflate next base floor');
    assert(result.logData.entscheidung.jahresEntnahme === 12000, 'Year result should expose effective annual withdrawal');
    assert(result.logData.entnahme_plan === 12000, 'Year result should expose planned withdrawal');
    assert(result.logData.entnahme_effektiv === 12000, 'Year result should expose effective withdrawal');
    assert(result.logData.liq_before_payout === 32000, 'Year result should expose liquidity before payout');
    assert(result.logData.liq_after_payout === 20000, 'Year result should expose liquidity after payout');
    assert(result.logData.liq_after_interest === 20000, 'Year result should expose liquidity after interest');
    assert(result.logData.portfolio_total_before_payout === 132000, 'Year result should expose portfolio total before payout');
    assert(result.logData.portfolio_active_end === 120000, 'Year result should expose active portfolio total at year end');
    assert(result.logData.portfolio_flow_delta === 0, 'Year result should expose raw active portfolio flow delta');
    assert(result.logData.RunwayTargetRawMonths === 60, 'Year result should expose raw runway target months');
    assert(result.logData.RunwayTargetSmoothedMonths === 48, 'Year result should expose smoothed runway target months');
    assert(result.logData.RunwayTargetSmoothingApplied === true, 'Year result should expose runway smoothing applied flag');
    assert(result.logData.RunwayTargetSeverityPct === 50, 'Year result should expose runway smoothing severity');
    assert(result.logData.RunwayTargetHardMinMonths === 24, 'Year result should expose hard minimum runway');
    assert(result.logData.balance_trace[0].phase === 'after_payout', 'Year result should expose raw balance trace phases');
    assert(result.logData.health_bucket_end === 30000, 'Year result should expose locked health bucket at year end');
    assert(result.logData.health_bucket_warning.includes('gekappt'), 'Year result should expose health bucket warnings');
    assert(result.logData.portfolio_total_end === 150000, 'Year result should expose portfolio total including health bucket at year end');
    assert(result.logData.threeBucket.bondBucketAfter === 0, 'Year result should expose three-bucket log shape');

    const invalidInflationResult = buildSimulatorYearResult({
        ...yearResultArgs,
        yearData: { ...yearResultArgs.yearData, inflation: undefined },
        baseMinimumFlexAnnual: 1000,
        baseFlexBudgetAnnual: 4000,
        baseFlexBudgetRecharge: 500
    });
    assert(Number.isFinite(invalidInflationResult.newState.baseFloor), 'Invalid withdrawal inflation should not create NaN floor');
    assert(Number.isFinite(invalidInflationResult.newState.baseFlex), 'Invalid withdrawal inflation should not create NaN flex');
    assert(Number.isFinite(invalidInflationResult.newState.baseMinimumFlexAnnual), 'Invalid withdrawal inflation should not create NaN minimum flex');
    assert(invalidInflationResult.newState.baseFloor >= 0, 'Invalid withdrawal inflation should keep floor non-negative');
    assert(invalidInflationResult.newState.baseMinimumFlexAnnual >= 0, 'Invalid withdrawal inflation should keep minimum flex non-negative');
    console.log('✅ Extracted year result builder passed');
} catch (e) {
    console.error('Test 0e Failed', e);
    throw e;
}

// Mock Inputs: minimaler Satz, um simulateOneYear deterministisch laufen zu lassen.
const inputs = {
    startAlter: 65,
    rentAdjPct: 0,
    accumulationPhase: { enabled: false },
    zielLiquiditaet: 20000,
    startFloorBedarf: 24000, // 2k/month
    startFlexBedarf: 6000,
    goldAktiv: false,
    partner: { aktiv: false },
    targetEq: 90, // Max permitted equity
    startSPB: 1000,
    marketCapeRatio: 20,
    risikoprofil: 'sicherheits-dynamisch',
    kirchensteuerSatz: 0,
    rentAdjPct: 0,
    rebalBand: 20,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5
};

// Mock State: Portfolio + Guardrail-State für Jahr 0.
const startPortfolio = {
    depotTranchesAktien: [{ marketValue: 500000, costBasis: 400000, type: 'aktien_alt' }],
    depotTranchesGold: [],
    liquiditaet: 20000
};

const startHistoricalData = {
    endeVJ: 100,
    endeVJ_1: 90,
    endeVJ_2: 80,
    ath: 100,
    jahreSeitAth: 0,
    capeRatio: 20
};

const state = {
    portfolio: startPortfolio,
    baseFloor: 24000,
    baseFlex: 6000,
    lastState: null, // Engine will init
    currentAnnualPension: 0,
    marketDataHist: startHistoricalData,
    widowPensionP1: 0,
    widowPensionP2: 0
};

// Mock Year Data (Normal Year)
const yearDataNormal = {
    jahr: 2000,
    rendite: 0.05, // +5%
    inflation: 2.0,
    zinssatz: 1.0,
    gold_eur_perf: 0
};

// Test 1: simulateOneYear run-through
try {
    const result = simulateOneYear(state, inputs, yearDataNormal, 0);

    if (result.isRuin) {
        console.log('Ruin Result:', JSON.stringify(result, null, 2));
    }

    assert(!result.isRuin, 'Normal year should not be ruin');
    assert(result.newState !== undefined, 'Should return newState');
    assert(result.logData !== undefined, 'Should return logData');
    assert(Array.isArray(result.logData.balance_trace), 'Should return balance trace diagnostics');
    assert(result.logData.balance_trace.some(entry => entry.phase === 'after_cash_interest'), 'Balance trace should include final cash interest phase');
    assert(Math.abs(result.logData.portfolio_flow_delta) < 1, 'Balance flow delta should stay near zero in normal year');

    // Check inflation adjustment (Floor inflates yearly).
    const expectedFloor = 24000 * 1.02;
    // Floating point precision check
    assertClose(result.newState.baseFloor, expectedFloor, 0.01, 'Floor should inflate by 2%');

    console.log('✅ Simulation run-through passed');
} catch (e) {
    console.error('Test 1 Failed', e);
    throw e;
}

// Test 1b: Health bucket covers eligible care shortfall before forced sale
try {
    const careState = {
        portfolio: {
            depotTranchesAktien: [{ marketValue: 100000, costBasis: 90000, type: 'aktien_alt', category: 'equity' }],
            depotTranchesGold: [],
            healthBucketConfig: {
                enabled: true,
                initialAmount: 20000,
                triggerMinGrade: 4,
                triggerMode: 'OR',
                coverageMode: 'care_additional_floor_only',
                returnMode: 'cash_return',
                targetMode: 'inflation_indexed_diagnostic'
            },
            healthBucketGeldmarkt: 20000,
            healthBucketTranches: [
                { trancheId: 'hb-care', marketValue: 20000, costBasis: 20000, type: 'geldmarkt', category: 'money_market' }
            ],
            healthBucketCashAmount: 0,
            liquiditaet: 0
        },
        baseFloor: 24000,
        baseFlex: 0,
        lastState: null,
        currentAnnualPension: 0,
        marketDataHist: startHistoricalData,
        widowPensionP1: 0,
        widowPensionP2: 0
    };
    const careMeta = {
        active: true,
        grade: 4,
        gradeLabel: 'Pflegegrad 4',
        zusatzFloorZiel: 12000,
        zusatzFloorDelta: 12000,
        flexFactor: 0.2
    };
    const careInputs = {
        ...inputs,
        startFlexBedarf: 0,
        healthBucket: careState.portfolio.healthBucketConfig,
        healthBucketEnabled: true
    };
    const result = simulateOneYear(
        careState,
        careInputs,
        { ...yearDataNormal, rendite: 0, zinssatz: 0 },
        0,
        careMeta,
        12000,
        {
            p1Alive: true,
            p2Alive: false,
            widowBenefits: { p1FromP2: false, p2FromP1: false },
            care: { p1: careMeta, p2: null }
        }
    );
    assert(!result.isRuin, 'Health bucket scenario should not ruin');
    assertClose(result.logData.health_bucket_used, 12000, 1e-9, 'Health bucket should cover eligible care shortfall');
    assertClose(result.newState.portfolio.healthBucketGeldmarkt, 8000, 1e-9, 'Health bucket should be reduced by used amount');
    assertClose(result.logData.health_bucket_end, 8000, 1e-9, 'Year log should expose remaining health bucket');
    assert(result.logData.health_bucket_triggered === true, 'Year log should expose health bucket trigger');
    console.log('✅ Health bucket annual integration passed');
} catch (e) {
    console.error('Test 1b Failed', e);
    throw e;
}

// Test 2: Ruin Scenario
// Extremely high withdrawals or 0 assets
try {
    const poorState = JSON.parse(JSON.stringify(state));
    poorState.portfolio.depotTranchesAktien = [];
    poorState.portfolio.liquiditaet = 0;

    const result = simulateOneYear(poorState, inputs, yearDataNormal, 0);
    assert(result.isRuin, 'Zero assets should be ruin');
    assertEqual(result.ruinDetails.requiredFloorNominal, 24000, 'ruin diagnostics expose the required nominal floor');
    assertEqual(result.ruinDetails.coveredFloorNominal, 0, 'ruin diagnostics expose covered floor capacity');
    assertEqual(result.ruinDetails.shortfallNominal, 24000, 'ruin diagnostics expose the lossless floor shortfall');
    console.log('✅ Ruin detection passed');
} catch (e) {
    console.error('Test 2 Failed', e);
    throw e;
}

console.log('--- Simulation Loop Tests Completed ---');
