import { EngineAPI } from '../engine/index.mjs';
import { prepareHistoricalDataOnce } from '../app/simulator/simulator-engine-helpers.js';
import { runMonteCarloChunk, buildMonteCarloAggregates } from '../app/simulator/monte-carlo-runner.js';

console.log('--- Auto-Optimize Worker Contract Tests ---');

if (typeof global.window === 'undefined') {
    global.window = {};
}
global.window.EngineAPI = EngineAPI;

function assert(condition, message) {
    if (!condition) throw new Error(message || 'Assertion failed');
}

function assertClose(actual, expected, tolerance, message) {
    if (Math.abs(actual - expected) > tolerance) {
        throw new Error(`${message}: ${actual} != ${expected}`);
    }
}

function createDocumentStub(workerCountValue = '2', budgetValue = '500') {
    return {
        getElementById(id) {
            if (id === 'mcWorkerCount') return { value: workerCountValue };
            if (id === 'mcWorkerBudget') return { value: budgetValue };
            return null;
        }
    };
}

class AutoOptimizeMockWorker {
    constructor() {
        this.onmessage = null;
        this.onerror = null;
        this._terminated = false;
        this._scenarioCache = new Map();
    }

    postMessage(message) {
        if (this._terminated) return;
        setTimeout(async () => {
            if (this._terminated || !this.onmessage) return;
            try {
                const response = await this._processMessage(message || {});
                if (response && !this._terminated && this.onmessage) {
                    this.onmessage({ data: response });
                }
            } catch (error) {
                if (!this._terminated && this.onmessage) {
                    this.onmessage({
                        data: {
                            type: 'error',
                            jobId: message?.jobId,
                            message: error?.message || 'mock worker failed',
                            stack: error?.stack || ''
                        }
                    });
                }
            }
        }, 0);
    }

    async _processMessage(message) {
        if (message.type === 'init') {
            if (message.scenarioKey && message.compiledScenario) {
                this._scenarioCache.set(message.scenarioKey, message.compiledScenario);
            }
            return {
                type: 'ready',
                jobId: message.jobId,
                scenarioKey: message.scenarioKey,
                dataVersion: message.dataVersion
            };
        }

        if (message.type === 'job') {
            const compiledScenario = this._scenarioCache.get(message.scenarioKey);
            if (!compiledScenario) {
                throw new Error(`Unknown scenarioKey: ${String(message.scenarioKey)}`);
            }
            const result = await runMonteCarloChunk({
                inputs: compiledScenario.inputs,
                widowOptions: compiledScenario.widowOptions,
                monteCarloParams: {
                    ...message.monteCarloParams,
                    methode: message.monteCarloParams?.methode ?? compiledScenario.methode
                },
                useCapeSampling: message.useCapeSampling ?? compiledScenario.useCapeSampling,
                runRange: message.runRange,
                logIndices: message.logIndices,
                engine: EngineAPI
            });
            return {
                type: 'result',
                jobId: message.jobId,
                ...result,
                elapsedMs: 1
            };
        }

        return {
            type: 'error',
            jobId: message.jobId,
            message: `Unexpected mock worker type: ${String(message.type)}`
        };
    }

    terminate() {
        this._terminated = true;
    }
}

prepareHistoricalDataOnce();

const previousWorker = global.Worker;
const previousDocument = global.document;
const previousNavigator = global.navigator;

try {
    global.document = createDocumentStub('2', '500');
    Object.defineProperty(global, 'navigator', {
        value: { hardwareConcurrency: 2 },
        configurable: true
    });

    const inputs = {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 750000,
        depotwertAlt: 250000,
        einstandAlt: 200000,
        zielLiquiditaet: 45000,
        startFloorBedarf: 24000,
        startFlexBedarf: 12000,
        targetEq: 60,
        rebalBand: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        goldAktiv: false,
        goldZielProzent: 0,
        goldFloorProzent: 0,
        goldSteuerfrei: true,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        dynamicFlex: false,
        horizonMethod: 'survival_quantile',
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoActive: false,
        goGoMultiplier: 1.0,
        capeRatio: 0,
        marketCapeRatio: 0,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0
    };
    const widowOptions = {
        mode: 'stop',
        percent: 0,
        marriageOffsetYears: 0,
        minMarriageYears: 0
    };
    const monteCarloParams = {
        anzahl: 23,
        maxDauer: 18,
        blockSize: 4,
        seed: 13579,
        methode: 'block',
        rngMode: 'per-run-seed'
    };

    const serialChunk = await runMonteCarloChunk({
        inputs,
        widowOptions,
        monteCarloParams,
        useCapeSampling: false,
        runRange: { start: 0, count: monteCarloParams.anzahl },
        logIndices: [],
        engine: EngineAPI
    });
    const serialAggregates = buildMonteCarloAggregates({
        inputs,
        totalRuns: monteCarloParams.anzahl,
        buffers: serialChunk.buffers,
        heatmap: serialChunk.heatmap,
        bins: serialChunk.bins,
        totals: serialChunk.totals,
        lists: serialChunk.lists,
        allRealWithdrawalsSample: serialChunk.allRealWithdrawalsSample
    });

    global.Worker = AutoOptimizeMockWorker;
    const { runMonteCarloAutoOptimize } = await import(`../app/simulator/auto-optimize-worker.js?contract=${Date.now()}`);
    const workerResult = await runMonteCarloAutoOptimize({
        inputs,
        widowOptions,
        monteCarloParams,
        useCapeSampling: false
    });

    assert(workerResult.failCount === serialChunk.totals.failCount, 'Auto-Optimize worker failCount should match serial');
    assert(workerResult.aggregatedResults, 'Auto-Optimize worker should return aggregatedResults');
    assertClose(
        workerResult.aggregatedResults.finalOutcomes.p10,
        serialAggregates.finalOutcomes.p10,
        1e-6,
        'Auto-Optimize worker p10 should match serial'
    );
    assertClose(
        workerResult.aggregatedResults.finalOutcomes.p50,
        serialAggregates.finalOutcomes.p50,
        1e-6,
        'Auto-Optimize worker p50 should match serial'
    );
    assertClose(
        workerResult.aggregatedResults.finalOutcomes.p90,
        serialAggregates.finalOutcomes.p90,
        1e-6,
        'Auto-Optimize worker p90 should match serial'
    );
    assertClose(
        workerResult.aggregatedResults.depotErschoepfungsQuote,
        serialAggregates.depotErschoepfungsQuote,
        1e-6,
        'Auto-Optimize worker depletion should match serial'
    );
    assertClose(
        workerResult.aggregatedResults.extraKPI.timeShareQuoteAbove45,
        serialAggregates.extraKPI.timeShareQuoteAbove45,
        1e-6,
        'Auto-Optimize worker timeShare should match serial'
    );
    assertClose(
        workerResult.aggregatedResults.volatilities.p50,
        serialAggregates.volatilities.p50,
        0,
        'Auto-Optimize worker volatility should match serial exactly'
    );
    assertClose(
        workerResult.aggregatedResults.cutYearSharePct.p50,
        serialAggregates.cutYearSharePct.p50,
        0,
        'Auto-Optimize worker cut-year share should match serial exactly'
    );
    assert(
        workerResult.aggregatedResults.cutYearSharePct.sampleSize === serialAggregates.cutYearSharePct.sampleSize,
        'Auto-Optimize worker cut-year sample size should match serial'
    );

    let invalidParametersRejected = false;
    try {
        await runMonteCarloAutoOptimize({
            inputs,
            widowOptions,
            monteCarloParams: { ...monteCarloParams, anzahl: '23runs' },
            useCapeSampling: false
        });
    } catch (error) {
        invalidParametersRejected = error?.code === 'MC_PARAMETER_INTEGER_INVALID';
    }
    assert(invalidParametersRejected, 'Auto-Optimize rejects the same suffixed run-count fixture before scheduling');

    console.log('✅ Auto-Optimize worker MC merge contract passed');
} finally {
    if (previousWorker === undefined) {
        delete global.Worker;
    } else {
        global.Worker = previousWorker;
    }

    if (previousDocument === undefined) {
        delete global.document;
    } else {
        global.document = previousDocument;
    }

    if (previousNavigator === undefined) {
        delete global.navigator;
    } else {
        Object.defineProperty(global, 'navigator', {
            value: previousNavigator,
            configurable: true
        });
    }
}

console.log('--- Auto-Optimize Worker Contract Tests Completed ---');
