"use strict";

let nextRunnerGeneration = 1;

export class WorkerRunCancelledError extends Error {
    constructor(generationId, reason = null) {
        const reasonMessage = reason instanceof Error ? reason.message : String(reason || '').trim();
        super(reasonMessage || `Worker generation ${String(generationId)} was cancelled.`);
        this.name = 'AbortError';
        this.code = 'WORKER_RUN_CANCELLED';
        this.generationId = generationId;
        if (reason instanceof Error && reason !== this) {
            this.cause = reason;
        }
    }
}

export function isWorkerRunCancelledError(error) {
    return error?.code === 'WORKER_RUN_CANCELLED'
        || (error?.name === 'AbortError' && error?.generationId != null);
}

function createGenerationId() {
    return `worker-run-${nextRunnerGeneration++}`;
}

/**
 * Generic worker-job orchestrator with adaptive chunk sizing.
 * Used by Monte Carlo and Parameter Sweep to distribute jobs to a worker pool.
 *
 * Callback contract:
 * - `buildPayload(start, count)` must return the worker payload for one chunk.
 * - `mergeResult(result, start, count)` must merge one completed chunk into caller-owned aggregates.
 * - `generationId` identifies every job belonging to this run.
 * - aborting `signal` terminates/discards that generation through the pool.
 */
export class WorkerJobRunner {
    constructor({
        pool,
        totalItems,
        workerCount,
        timeBudgetMs = 200,
        minChunk = 10,
        maxChunk = null,
        onProgress = () => { },
        trackPartialProgress = false,
        buildPayload,
        mergeResult,
        generationId = createGenerationId(),
        signal = null,
        enableTelemetry,
        enableStallDetection = true,
        stallTimeoutMs = 20000,
        baseTimeoutMs = 5000
    }) {
        if (!pool) throw new Error('WorkerJobRunner requires pool');
        if (typeof buildPayload !== 'function') throw new Error('WorkerJobRunner requires buildPayload callback');
        if (typeof mergeResult !== 'function') throw new Error('WorkerJobRunner requires mergeResult callback');
        if (generationId == null || String(generationId).trim() === '') {
            throw new Error('WorkerJobRunner requires a non-empty generationId');
        }

        this.pool = pool;
        this.totalItems = Math.max(0, Number(totalItems) || 0);
        this.workerCount = Math.max(1, Number(workerCount) || 1);
        this.timeBudgetMs = Number(timeBudgetMs) || 200;
        this.minChunk = Math.max(1, Number(minChunk) || 10);
        this.maxChunk = maxChunk == null
            ? Math.min(400, Math.max(this.minChunk, Math.ceil((this.totalItems || this.minChunk) / this.workerCount)))
            : Math.max(this.minChunk, Number(maxChunk) || this.minChunk);
        this.onProgress = typeof onProgress === 'function' ? onProgress : () => { };
        this.trackPartialProgress = trackPartialProgress === true;
        this.buildPayload = buildPayload;
        this.mergeResult = mergeResult;
        this.generationId = generationId;
        this.signal = signal;
        this.enableTelemetry = typeof enableTelemetry === 'boolean'
            ? enableTelemetry
            : Boolean(this.pool?.telemetry?.enabled);
        this.enableStallDetection = enableStallDetection !== false;
        this.stallTimeoutMs = Math.max(1, Number(stallTimeoutMs) || 20000);
        this.baseTimeoutMs = Math.max(1, Number(baseTimeoutMs) || 5000);
        this.runPromise = null;
    }

    run() {
        if (this.runPromise) return this.runPromise;
        this.runPromise = this._run();
        return this.runPromise;
    }

    async _run() {
        const cancellationError = () => new WorkerRunCancelledError(
            this.generationId,
            this.signal?.reason
        );
        if (this.signal?.aborted) {
            await this.pool.cancelGeneration?.(this.generationId, cancellationError());
            throw cancellationError();
        }
        if (this.totalItems <= 0) return;

        this.pool.ensureCapacity?.();

        const pollIntervalMs = 250;
        let lastProgressAt = performance.now();
        let stallTimeoutMs = this.stallTimeoutMs;

        let chunkSize = Math.min(
            this.maxChunk,
            Math.max(this.minChunk, Math.floor(this.totalItems / (this.workerCount * 4)) || this.minChunk)
        );
        let smoothedChunkSize = chunkSize;
        let completedItems = 0;
        let nextItemIdx = 0;
        let reportedProgress = 0;
        const scheduledRanges = new Map();
        const partialProgress = new Map();
        const reportProgress = () => {
            const activeUnits = [...partialProgress.values()].reduce((sum, value) => sum + value, 0);
            const percentage = ((completedItems + activeUnits) / this.totalItems) * 100;
            reportedProgress = Math.max(reportedProgress,
                this.trackPartialProgress ? Math.min(99, percentage) : percentage);
            this.onProgress(reportedProgress);
        };

        const pending = new Set();
        const telemetry = this.pool?.telemetry;
        const telemetryEnabled = this.enableTelemetry && telemetry?.enabled
            && typeof telemetry.recordMemorySnapshot === 'function';
        const memoryInterval = telemetryEnabled
            ? setInterval(() => telemetry.recordMemorySnapshot(), 5000)
            : null;
        const previousPoolOnProgress = this.pool.onProgress;
        this.pool.onProgress = message => {
            if (message?.generationId !== this.generationId) return;
            lastProgressAt = performance.now();
            if (this.trackPartialProgress && message.phase === 'sweep') {
                const start = message.comboRange?.start;
                const count = message.comboRange?.count;
                const units = message.completedUnits;
                if (Number.isInteger(start) && scheduledRanges.get(start) === count
                    && Number.isFinite(units) && units >= 0 && units <= count
                    && partialProgress.has(start)) {
                    partialProgress.set(start, Math.max(partialProgress.get(start), units));
                    reportProgress();
                }
            }
            if (typeof previousPoolOnProgress === 'function') {
                previousPoolOnProgress(message);
            }
        };

        let abortHandler = null;
        const abortOutcome = new Promise(resolve => {
            abortHandler = () => {
                const error = cancellationError();
                void Promise.resolve(this.pool.cancelGeneration?.(this.generationId, error)).catch(() => {});
                resolve({ kind: 'abort', error });
            };
            this.signal?.addEventListener?.('abort', abortHandler, { once: true });
        });
        const scheduleJob = (start, count) => {
            if (this.trackPartialProgress) {
                scheduledRanges.set(start, count);
                partialProgress.set(start, 0);
            }
            const startedAt = performance.now();
            const payload = this.buildPayload(start, count);
            let promise = null;
            promise = Promise.resolve()
                .then(() => this.pool.runJob(payload, [], { generationId: this.generationId }))
                .then(
                    result => ({
                        kind: 'result',
                        promise,
                        result,
                        start,
                        count,
                        elapsedMs: result.elapsedMs ?? (performance.now() - startedAt)
                    }),
                    error => ({ kind: 'error', error, promise })
                );
            pending.add(promise);
        };

        const scheduleNextIfNeeded = () => {
            while (!this.signal?.aborted && pending.size < this.workerCount && nextItemIdx < this.totalItems) {
                const count = Math.min(chunkSize, this.totalItems - nextItemIdx);
                scheduleJob(nextItemIdx, count);
                nextItemIdx += count;
            }
        };

        try {
            if (this.signal?.aborted) {
                abortHandler();
                const outcome = await abortOutcome;
                throw outcome.error;
            }
            scheduleNextIfNeeded();

            while (pending.size > 0) {
                let pollTimer = null;
                const pollOutcome = new Promise(resolve => {
                    pollTimer = setTimeout(() => resolve({ kind: 'poll' }), pollIntervalMs);
                });
                const outcome = await Promise.race([
                    Promise.race(pending),
                    pollOutcome,
                    abortOutcome
                ]);
                clearTimeout(pollTimer);
                if (outcome.kind === 'poll') {
                    if (this.enableStallDetection && performance.now() - lastProgressAt > stallTimeoutMs) {
                        throw new Error('Worker jobs stalled; falling back to serial execution.');
                    }
                    continue;
                }
                if (outcome.kind === 'abort' || outcome.kind === 'error') {
                    if (outcome.promise) pending.delete(outcome.promise);
                    throw outcome.error;
                }

                const { result, start, count, elapsedMs } = outcome;
                pending.delete(outcome.promise);
                if (this.signal?.aborted) throw cancellationError();
                this.mergeResult(result, start, count);

                partialProgress.delete(start);
                scheduledRanges.delete(start);
                completedItems += count;
                reportProgress();
                lastProgressAt = performance.now();

                if (elapsedMs > 0) {
                    const scaled = Math.round(count * (this.timeBudgetMs / elapsedMs));
                    const targetSize = Math.max(this.minChunk, Math.min(this.maxChunk, scaled || this.minChunk));
                    smoothedChunkSize = Math.max(
                        this.minChunk,
                        Math.min(this.maxChunk, Math.round(smoothedChunkSize * 0.7 + targetSize * 0.3))
                    );
                    chunkSize = smoothedChunkSize;
                    this.pool.telemetry?.recordChunkSize(chunkSize);
                    if (this.enableStallDetection) {
                        const perRunMs = elapsedMs / count;
                        stallTimeoutMs = Math.max(this.baseTimeoutMs, Math.round(perRunMs * chunkSize * 3));
                    }
                }

                scheduleNextIfNeeded();
            }
        } catch (error) {
            await this.pool.cancelGeneration?.(this.generationId, error);
            throw error;
        } finally {
            this.signal?.removeEventListener?.('abort', abortHandler);
            this.pool.onProgress = previousPoolOnProgress;
            if (memoryInterval) {
                clearInterval(memoryInterval);
            }
            if (this.enableTelemetry && telemetry?.enabled && typeof telemetry.printReport === 'function') {
                telemetry.printReport();
            }
        }
    }
}
