import { buildStressContext } from './simulator-portfolio.js';
import { rng, makeRunSeed, RUNIDX_COMBO_SETUP } from './simulator-utils.js';
import { annualData } from './simulator-data.js';
import { createMonteCarloBuffers } from './monte-carlo-runner-utils.js';

export function createMonteCarloRunContext({
    inputs,
    monteCarloParams,
    runRange = null,
    logIndices = null,
    buildYearSamplingConfig,
    buildStartYearCdf,
    resolveMinStartYearIndex
}) {
    const {
        anzahl,
        maxDauer,
        blockSize,
        seed,
        methode,
        rngMode = 'per-run-seed',
        startYearMode = 'UNIFORM',
        startYearFilter = 1970,
        startYearHalfLife = 20,
        excludeEstimatedHistory = false
    } = monteCarloParams;
    const runStart = runRange?.start ?? 0;
    const runCount = runRange?.count ?? anzahl;

    const resolvedRngMode = rngMode === 'legacy-stream' ? 'legacy-stream' : 'per-run-seed';
    if (resolvedRngMode === 'legacy-stream' && runStart !== 0) {
        throw new Error('legacy-stream RNG does not support chunked run ranges.');
    }

    const legacyRand = resolvedRngMode === 'legacy-stream' ? rng(seed) : null;
    const comboRand = legacyRand || rng(makeRunSeed(seed, 0, RUNIDX_COMBO_SETUP));
    const stressCtxMaster = buildStressContext(inputs.stressPreset, comboRand);
    const buffers = createMonteCarloBuffers(runCount);

    const progressUpdateInterval = Math.max(100, Math.floor(runCount / 100));
    const logIndexSet = Array.isArray(logIndices) ? new Set(logIndices) : null;
    const yearSamplingConfig = buildYearSamplingConfig(startYearMode, annualData, {
        startYearFilter,
        startYearHalfLife,
        blockSize,
        excludeEstimatedHistory
    });
    const startYearCdf = buildStartYearCdf(startYearMode, annualData, {
        startYearFilter,
        startYearHalfLife,
        excludeEstimatedHistory
    });
    const minStartYearIndex = resolveMinStartYearIndex(annualData, excludeEstimatedHistory);

    return {
        anzahl,
        maxDauer,
        blockSize,
        seed,
        methode,
        startYearMode,
        startYearFilter,
        startYearHalfLife,
        excludeEstimatedHistory,
        runStart,
        runCount,
        resolvedRngMode,
        legacyRand,
        comboRand,
        stressCtxMaster,
        buffers,
        progressUpdateInterval,
        logIndexSet,
        yearSamplingConfig,
        startYearCdf,
        minStartYearIndex
    };
}
