import {
    STRESS_REPLAY_TRANSACTION_CAPTURE_INPUT,
    STRESS_REPLAY_TRANSACTION_CLASSES,
    STRESS_REPLAY_TRANSACTION_EVENT_VERSION,
    buildStressReplayTransactionsForYear,
    collectStressReplayTransactions
} from '../app/simulator/stress-replay-transactions.js';
import { applyPayoutFallbackSale } from '../app/simulator/simulator-forced-sale.js';
import { simulateOneYear } from '../app/simulator/simulator-engine-wrapper.js';
import { EngineAPI } from '../engine/index.mjs';
import { settleTaxYear } from '../engine/tax-settlement.mjs';

function assertJsonEqual(actual, expected, message) {
    assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}

function assertFails(callback, message) {
    try {
        callback();
        assert(false, `${message}: expected failure`);
    } catch (error) {
        assert(error instanceof TypeError, `${message}: expected TypeError`);
    }
}

function diagnostic(transactionClass, overrides = {}) {
    return {
        class: transactionClass,
        phase: 'fixture_phase',
        oracle: 'fixture_structured_oracle_v1',
        requestedNetEur: 90,
        grossEur: 100,
        netEur: 90,
        taxEur: 10,
        breakdown: [{ assetClass: 'equity', grossEur: 100, netEur: 90, taxEur: 10 }],
        missingness: [],
        ...overrides
    };
}

console.log('Test 1: structured diagnostics isolate every supported transaction class');
const classes = Object.values(STRESS_REPLAY_TRANSACTION_CLASSES);
const events = buildStressReplayTransactionsForYear({
    yearIndex: 4,
    historicalYear: 2008,
    logData: {
        stressReplayTransactionDiagnostics: classes.map(transactionClass => diagnostic(transactionClass))
    }
});
assertEqual(events.length, classes.length, 'Every structured diagnostic must produce exactly one event');
assertJsonEqual(events.map(event => event.class), classes, 'Transaction classes must retain source order');
assert(events.every(event => event.schemaVersion === STRESS_REPLAY_TRANSACTION_EVENT_VERSION), 'Every event must be versioned');
assert(events.every(event => event.yearIndex === 4 && event.historicalYear === 2008), 'Year identity must be explicit');
assert(events.every(event => event.grossEur === 100 && event.netEur === 90 && event.taxEur === 10), 'Observed money must remain exact');
assert(Object.isFrozen(events) && events.every(Object.isFrozen), 'Projected transaction events must be immutable');

console.log('Test 2: display text never creates a transaction event');
const textOnly = buildStressReplayTransactionsForYear({
    yearIndex: 0,
    historicalYear: 2000,
    logData: {
        aktionUndGrund: 'Notverkauf / Bonds auffüllen / Rebalancing',
        transactionText: 'Depotverkauf'
    }
});
assertEqual(textOnly.length, 0, 'Transaction classes must not be guessed from display text');

console.log('Test 3: payout fallback exposes observed gross/net and explicit tax missingness');
const equity = [{
    type: 'aktien_alt',
    marketValue: 100,
    costBasis: 60,
    purchaseDate: '2000-01-01'
}];
const payout = applyPayoutFallbackSale({
    jahresEntnahmeEffektiv: 20,
    netFloorYear: 50,
    liquiditaet: 0,
    payout: 20,
    is3Bucket: false,
    isBadYear: false,
    depotTranchesAktien: equity,
    depotTranchesGold: [],
    captureTransactions: true
});
assertEqual(payout.isRuin, false, 'Financeable payout fallback must remain non-ruin');
assertEqual(payout.liquiditaet, 0, 'Fallback proceeds must be paid without changing the original cash result');
assertEqual(equity[0].marketValue, 70, 'Fallback must retain its existing financial tranche mutation');
assertEqual(equity[0].costBasis, 42, 'Fallback must retain proportional cost-basis reduction');
assertEqual(payout.transactionDiagnostic.grossEur, 30, 'Observed tranche reduction is the fallback gross oracle');
assertEqual(payout.transactionDiagnostic.netEur, 30, 'Observed cash proceeds are the fallback net oracle');
assertEqual(payout.transactionDiagnostic.taxEur, null, 'Uncalculated fallback tax must not be guessed as zero');
assertEqual(payout.transactionDiagnostic.missingness[0].reason, 'payout_fallback_tax_not_calculated', 'Tax missingness needs a machine-readable reason');

const payoutEvents = buildStressReplayTransactionsForYear({
    yearIndex: 2,
    historicalYear: 2002,
    logData: { stressReplayTransactionDiagnostics: [payout.transactionDiagnostic] }
});
assertEqual(payoutEvents[0].taxEur, null, 'Explicit tax missingness must survive projection');
assertEqual(payoutEvents[0].missingness[0].field, 'taxEur', 'Missingness must identify the missing field');

console.log('Test 4: absent or malformed monetary observations fail closed');
assertFails(
    () => buildStressReplayTransactionsForYear({
        yearIndex: 0,
        logData: {
            stressReplayTransactionDiagnostics: [diagnostic(
                STRESS_REPLAY_TRANSACTION_CLASSES.PAYOUT_FLOOR_FALLBACK_SALE,
                { taxEur: null, missingness: [] }
            )]
        }
    }),
    'A null monetary value without missingness must fail closed'
);
assertFails(
    () => buildStressReplayTransactionsForYear({
        yearIndex: 0,
        logData: {
            stressReplayTransactionDiagnostics: [diagnostic('sale_inferred_from_title')]
        }
    }),
    'Unknown or text-derived transaction classes must fail closed'
);

console.log('Test 5: collection is deterministic and opt-in capture is explicit');
assertEqual(STRESS_REPLAY_TRANSACTION_CAPTURE_INPUT, 'stressReplayTransactionCapture', 'Replay capture input name must stay stable');
const collected = collectStressReplayTransactions([
    {
        yearIndex: 8,
        historicalYear: 2018,
        logData: {
            stressReplayTransactionDiagnostics: [diagnostic(
                STRESS_REPLAY_TRANSACTION_CLASSES.POLICY_REBALANCING_SALE
            )]
        }
    },
    {
        yearIndex: 9,
        historicalYear: 2019,
        logData: {
            stressReplayTransactionDiagnostics: [diagnostic(
                STRESS_REPLAY_TRANSACTION_CLASSES.LIQUIDITY_SHORTFALL_FORCED_SALE,
                { grossEur: 50, netEur: 47, taxEur: 3 }
            )]
        }
    }
]);
assertJsonEqual(
    collected.map(event => [event.id, event.class, event.grossEur]),
    [
        ['8:0:policy_rebalancing_sale', 'policy_rebalancing_sale', 100],
        ['9:0:liquidity_shortfall_forced_sale', 'liquidity_shortfall_forced_sale', 50]
    ],
    'Collection must preserve chronological input and deterministic IDs'
);

console.log('Test 6: capture changes diagnostics only, not financial results or FlowDelta');
const simulatorInputs = {
    startAlter: 65,
    rentAdjPct: 0,
    accumulationPhase: { enabled: false },
    zielLiquiditaet: 20000,
    startFloorBedarf: 24000,
    startFlexBedarf: 6000,
    goldAktiv: false,
    partner: { aktiv: false },
    targetEq: 90,
    startSPB: 1000,
    marketCapeRatio: 20,
    risikoprofil: 'sicherheits-dynamisch',
    kirchensteuerSatz: 0,
    rebalBand: 20,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5
};
const simulatorState = {
    portfolio: {
        depotTranchesAktien: [{ marketValue: 500000, costBasis: 400000, type: 'aktien_alt' }],
        depotTranchesGold: [],
        liquiditaet: 20000
    },
    baseFloor: 24000,
    baseFlex: 6000,
    lastState: null,
    currentAnnualPension: 0,
    marketDataHist: {
        endeVJ: 100,
        endeVJ_1: 90,
        endeVJ_2: 80,
        ath: 100,
        jahreSeitAth: 0,
        capeRatio: 20
    },
    widowPensionP1: 0,
    widowPensionP2: 0
};
const simulatorYear = {
    jahr: 2000,
    rendite: 0.05,
    inflation: 2,
    zinssatz: 1,
    gold_eur_perf: 0
};
const withoutCapture = simulateOneYear(
    structuredClone(simulatorState), simulatorInputs, simulatorYear, 0, null, 0, null, 1, EngineAPI
);
const withCapture = simulateOneYear(
    structuredClone(simulatorState),
    { ...simulatorInputs, [STRESS_REPLAY_TRANSACTION_CAPTURE_INPUT]: true },
    simulatorYear,
    0,
    null,
    0,
    null,
    1,
    EngineAPI
);
assert(withCapture.logData, 'Opt-in run must remain a financial year result');
assert(Array.isArray(withCapture.logData.stressReplayTransactionDiagnostics), 'Opt-in run must expose structured diagnostics');
assertEqual(withoutCapture.logData.stressReplayTransactionDiagnostics, undefined, 'Standard run must retain its prior payload shape');
const projectedCapture = structuredClone(withCapture);
delete projectedCapture.logData.stressReplayTransactionDiagnostics;
assertJsonEqual(projectedCapture, withoutCapture, 'Removing additive diagnostics must restore the exact financial result');
assertEqual(withCapture.logData.portfolio_flow_delta, withoutCapture.logData.portfolio_flow_delta, 'Capture must not change FlowDelta');

console.log('Test 6b: an executed payout fallback adds exactly one trace phase and no other log changes');
const fallbackInputs = {
    ...simulatorInputs,
    startFloorBedarf: 6,
    startFlexBedarf: 0,
    zielLiquiditaet: 0
};
const fallbackState = {
    ...simulatorState,
    portfolio: {
        depotTranchesAktien: [
            {
                marketValue: 5.8,
                costBasis: 5.8,
                type: 'aktien_alt',
                purchaseDate: '2020-01-01'
            },
            {
                marketValue: 100,
                costBasis: 100,
                type: 'aktien_alt',
                purchaseDate: '2000-01-01'
            }
        ],
        depotTranchesGold: [],
        liquiditaet: 0
    },
    baseFloor: 6,
    baseFlex: 0,
    lastState: { taxState: { lossCarry: 0 } }
};
const fallbackTaxSettlement = settleTaxYear({
    taxStatePrev: fallbackState.lastState.taxState,
    rawAggregate: {
        sumRealizedGainSigned: 0,
        sumTaxableAfterTqfSigned: 0
    },
    sparerPauschbetrag: fallbackInputs.startSPB,
    kirchensteuerSatz: fallbackInputs.kirchensteuerSatz
});
const fallbackEngine = {
    simulateSingleYear: () => ({
        ui: {
            spending: {
                monatlicheEntnahme: 0.5,
                kuerzungQuelle: 'none',
                details: { flexRate: 1 }
            },
            action: {
                type: 'NONE',
                title: 'No planned transaction',
                anweisungKlasse: '',
                quellen: [],
                verwendungen: {},
                nettoErlös: 0,
                steuer: 0,
                pauschbetragVerbraucht: 0,
                taxRawAggregate: {
                    sumRealizedGainSigned: 0,
                    sumTaxableAfterTqfSigned: 0
                },
                taxSettlement: fallbackTaxSettlement.details,
                transactionDiagnostics: { blockReason: 'none' }
            },
            market: { szenarioText: 'fallback-parity-witness' },
            runway: { months: 0 },
            liquiditaet: { deckungNachher: 0 },
            vpw: null,
            zielLiquiditaet: 0
        },
        newState: {
            alarmActive: false,
            lastMarketSKey: 'NEUTRAL',
            cumulativeInflationFactor: 1,
            taxState: fallbackTaxSettlement.taxStateNext
        }
    })
};
const fallbackYear = {
    jahr: 2001,
    rendite: 0,
    inflation: 0,
    zinssatz: 0,
    gold_eur_perf: 0
};
const fallbackWithoutCapture = simulateOneYear(
    structuredClone(fallbackState),
    fallbackInputs,
    fallbackYear,
    0,
    null,
    0,
    null,
    1,
    fallbackEngine
);
const fallbackWithCapture = simulateOneYear(
    structuredClone(fallbackState),
    { ...fallbackInputs, [STRESS_REPLAY_TRANSACTION_CAPTURE_INPUT]: true },
    fallbackYear,
    0,
    null,
    0,
    null,
    1,
    fallbackEngine
);
assert(!fallbackWithCapture.isRuin && !fallbackWithoutCapture.isRuin, 'Fallback parity witness must complete both runs');
assert(
    fallbackWithCapture.logData.stressReplayTransactionDiagnostics.some(
        event => event.class === STRESS_REPLAY_TRANSACTION_CLASSES.LIQUIDITY_SHORTFALL_FORCED_SALE
    ),
    'Fallback parity witness must execute forced-sale liquidity coverage'
);
assert(
    fallbackWithCapture.logData.stressReplayTransactionDiagnostics.some(
        event => event.class === STRESS_REPLAY_TRANSACTION_CLASSES.PAYOUT_FLOOR_FALLBACK_SALE
    ),
    'Fallback parity witness must execute the payout-floor fallback sale'
);
const fallbackLogWithoutCapture = structuredClone(fallbackWithoutCapture.logData);
const fallbackLogWithCapture = structuredClone(fallbackWithCapture.logData);
delete fallbackLogWithoutCapture.stressReplayTransactionDiagnostics;
delete fallbackLogWithCapture.stressReplayTransactionDiagnostics;
const traceWithoutCapture = fallbackLogWithoutCapture.balance_trace;
const traceWithCapture = fallbackLogWithCapture.balance_trace;
delete fallbackLogWithoutCapture.balance_trace;
delete fallbackLogWithCapture.balance_trace;
assertJsonEqual(
    fallbackLogWithCapture,
    fallbackLogWithoutCapture,
    'Executed fallback capture must leave every other logData field byte-identical'
);
const addedFallbackTrace = traceWithCapture.filter(entry => entry.phase === 'after_payout_fallback');
assertEqual(addedFallbackTrace.length, 1, 'Capture must add exactly one payout-fallback trace phase');
assertEqual(
    traceWithCapture.length,
    traceWithoutCapture.length + 1,
    'Capture must add exactly one balance trace entry'
);
assertJsonEqual(
    traceWithCapture.filter(entry => entry.phase !== 'after_payout_fallback'),
    traceWithoutCapture,
    'All pre-existing balance trace entries must retain order and content'
);

console.log('✅ Stress replay transaction tests passed');
