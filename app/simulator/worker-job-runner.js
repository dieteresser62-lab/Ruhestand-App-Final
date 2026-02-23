"use strict";

/**
 * Generic worker-job orchestrator with adaptive chunk sizing.
 * Used by Monte Carlo and Parameter Sweep to distribute jobs to a worker pool.
 *
 * Callback contract:
 * - `buildPayload(start, count)` must return the worker payload for one chunk.
 * - `mergeResult(result, start, count)` must merge one completed chunk into caller-owned aggregates.
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
        buildPayload,
        mergeResult,
        enableTelemetry,
        enableStallDetection = true,
        stallTimeoutMs = 20000,
        baseTimeoutMs = 5000
    }) {
        if (!pool) throw new Error('WorkerJobRunner requires pool');
        if (typeof buildPayload !== 'function') throw new Error('WorkerJobRunner requires buildPayload callback');
        if (typeof mergeResult !== 'function') throw new Error('WorkerJobRunner requires mergeResult callback');

        this.pool = pool;
        this.totalItems = Math.max(0, Number(totalItems) || 0);
        this.workerCount = Math.max(1, Number(workerCount) || 1);
        this.timeBudgetMs = Number(timeBudgetMs) || 200;
        this.minChunk = Math.max(1, Number(minChunk) || 10);
        this.maxChunk = maxChunk == null
            ? Math.min(400, Math.max(this.minChunk, Math.ceil((this.totalItems || this.minChunk) / this.workerCount)))
            : Math.max(this.minChunk, Number(maxChunk) || this.minChunk);
        this.onProgress = typeof onProgress === 'function' ? onProgress : () => { };
        this.buildPayload = buildPayload;
        this.mergeResult = mergeResult;
        this.enableTelemetry = typeof enableTelemetry === 'boolean'
            ? enableTelemetry
            : Boolean(this.pool?.telemetry?.enabled);
        this.enableStallDetection = enableStallDetection !== false;
        this.stallTimeoutMs = Math.max(1, Number(stallTimeoutMs) || 20000);
        this.baseTimeoutMs = Math.max(1, Number(baseTimeoutMs) || 5000);
    }

    async run() {
        if (this.totalItems <= 0) return;

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

        const pending = new Set();
        const telemetry = this.pool?.telemetry;
        const telemetryEnabled = this.enableTelemetry && telemetry?.enabled
            && typeof telemetry.recordMemorySnapshot === 'function';
        const memoryInterval = telemetryEnabled
            ? setInterval(() => telemetry.recordMemorySnapshot(), 5000)
            : null;
        const previousPoolOnProgress = this.pool.onProgress;
        this.pool.onProgress = message => {
            lastProgressAt = performance.now();
            if (typeof previousPoolOnProgress === 'function') {
                previousPoolOnProgress(message);
            }
        };

        const scheduleJob = (start, count) => {
            const startedAt = performance.now();
            const payload = this.buildPayload(start, count);
            const promise = this.pool.runJob(payload).then(result => {
                const elapsedMs = result.elapsedMs ?? (performance.now() - startedAt);
                return { result, start, count, elapsedMs };
            });
            pending.add(promise);
            promise.finally(() => pending.delete(promise));
        };

        const scheduleNextIfNeeded = () => {
            while (pending.size < this.workerCount && nextItemIdx < this.totalItems) {
                const count = Math.min(chunkSize, this.totalItems - nextItemIdx);
                scheduleJob(nextItemIdx, count);
                nextItemIdx += count;
            }
        };

        try {
            scheduleNextIfNeeded();

            while (pending.size > 0) {
                let raced = null;
                while (!raced) {
                    const next = await Promise.race([
                        Promise.race(pending),
                        new Promise(resolve => setTimeout(resolve, pollIntervalMs))
                    ]);
                    if (next) {
                        raced = next;
                        break;
                    }
                    if (this.enableStallDetection && performance.now() - lastProgressAt > stallTimeoutMs) {
                        throw new Error('Worker jobs stalled; falling back to serial execution.');
                    }
                }

                const { result, start, count, elapsedMs } = raced;
                this.mergeResult(result, start, count);

                completedItems += count;
                this.onProgress((completedItems / this.totalItems) * 100);
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
        } finally {
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
