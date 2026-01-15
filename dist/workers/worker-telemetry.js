"use strict";

function safeNow() {
    if (typeof performance !== "undefined" && typeof performance.now === "function") {
        return performance.now();
    }
    return Date.now();
}

function safeTimestamp() {
    return Date.now();
}

function clampArray(arr, maxLen) {
    if (arr.length > maxLen) {
        arr.splice(0, arr.length - maxLen);
    }
}

function safeString(value) {
    if (value == null) return "";
    return String(value);
}

export class WorkerTelemetry {
    constructor(name = "default") {
        this.name = name;
        this.enabled = WorkerTelemetry.isEnabled();
        if (!this.enabled) return;

        const registry = WorkerTelemetry.getRegistry();
        registry.set(this.name, this);

        this.createdAt = safeNow();
        this.workerCount = 0;

        this.totalJobs = 0;
        this.completedJobs = 0;
        this.failedJobs = 0;

        this.totalWorkTime = 0;
        this.minJobTime = null;
        this.maxJobTime = null;

        this.jobStarts = new Map();
        this.workerStats = new Map();

        this.chunkSizes = [];
        this.errors = [];
        this.memorySnapshots = [];
        this.memoryStart = null;
        this.jobDetails = [];
    }

    static isEnabled() {
        let enabled = false;
        try {
            const search = typeof location !== "undefined" ? location.search : "";
            if (search && search.includes("telemetry=true")) {
                enabled = true;
            }
        } catch (e) {
            enabled = false;
        }

        if (enabled) return true;

        try {
            if (typeof localStorage !== "undefined" && typeof localStorage.getItem === "function") {
                enabled = localStorage.getItem("enableWorkerTelemetry") === "true";
            }
        } catch (e) {
            enabled = false;
        }

        return enabled;
    }

    static getRegistry() {
        const globalObj = typeof globalThis !== "undefined" ? globalThis : window;
        if (!globalObj.__workerTelemetryRegistry) {
            globalObj.__workerTelemetryRegistry = new Map();
        }
        return globalObj.__workerTelemetryRegistry;
    }

    _ensureWorker(workerId) {
        const id = safeString(workerId || "unknown");
        if (!this.workerStats.has(id)) {
            this.workerStats.set(id, {
                jobsCompleted: 0,
                jobsFailed: 0,
                totalTime: 0,
                idleTime: 0,
                lastJobEnd: null
            });
        }
        return this.workerStats.get(id);
    }

    recordJobStart(jobId, workerId, payload) {
        if (!this.enabled) return;
        const id = safeString(jobId);
        const now = safeNow();

        if (this.jobStarts.has(id)) {
            const entry = this.jobStarts.get(id);
            if (entry.workerId === "pending" && workerId !== "pending") {
                entry.workerId = safeString(workerId);
                const stats = this._ensureWorker(entry.workerId);
                if (stats.lastJobEnd != null) {
                    stats.idleTime += Math.max(0, now - stats.lastJobEnd);
                }
            }
            return;
        }

        this.totalJobs += 1;
        const workerKey = safeString(workerId || "pending");
        this.jobStarts.set(id, { start: now, workerId: workerKey, payload });

        if (workerKey !== "pending") {
            const stats = this._ensureWorker(workerKey);
            if (stats.lastJobEnd != null) {
                stats.idleTime += Math.max(0, now - stats.lastJobEnd);
            }
        }
    }

    recordJobComplete(jobId, workerId, elapsedMs) {
        if (!this.enabled) return;
        const now = safeNow();
        const id = safeString(jobId);
        const workerKey = safeString(workerId || "unknown");
        const stats = this._ensureWorker(workerKey);

        this.completedJobs += 1;

        const entry = this.jobStarts.get(id);
        const elapsed = Number.isFinite(elapsedMs) && elapsedMs > 0
            ? elapsedMs
            : this._resolveElapsedFromEntry(entry, now);
        const runCount = this._resolveRunCount(entry);
        this._recordJobDetail(elapsed, runCount);

        stats.jobsCompleted += 1;
        stats.totalTime += elapsed;
        stats.lastJobEnd = now;

        this.totalWorkTime += elapsed;
        this.minJobTime = this.minJobTime == null ? elapsed : Math.min(this.minJobTime, elapsed);
        this.maxJobTime = this.maxJobTime == null ? elapsed : Math.max(this.maxJobTime, elapsed);

        this.jobStarts.delete(id);
    }

    recordJobFailed(jobId, workerId, error) {
        if (!this.enabled) return;
        const now = safeNow();
        const id = safeString(jobId);
        const workerKey = safeString(workerId || "unknown");
        const stats = this._ensureWorker(workerKey);

        this.failedJobs += 1;
        stats.jobsFailed += 1;
        stats.lastJobEnd = now;

        const entry = this.jobStarts.get(id);
        const elapsed = this._resolveElapsedFromEntry(entry, now);
        if (elapsed > 0) {
            stats.totalTime += elapsed;
            this.totalWorkTime += elapsed;
        }

        if (this.errors.length < 10) {
            const message = safeString(error && error.message ? error.message : error);
            const stack = safeString(error && error.stack ? error.stack : "");
            this.errors.push({
                timestamp: safeTimestamp(),
                workerId: workerKey,
                message,
                stack: stack.slice(0, 500)
            });
        }

        this.jobStarts.delete(id);
    }

    _resolveElapsedFromEntry(entry, now) {
        if (!entry) return 0;
        return Math.max(0, now - entry.start);
    }

    _resolveRunCount(entry) {
        if (!entry || !entry.payload) return null;
        return entry.payload.runRange?.count ?? entry.payload.comboRange?.count ?? null;
    }

    _recordJobDetail(elapsedMs, runCount) {
        if (!Number.isFinite(elapsedMs) || elapsedMs <= 0) return;
        if (!Number.isFinite(runCount) || runCount <= 0) return;
        this.jobDetails.push({
            elapsedMs,
            runCount,
            msPerRun: elapsedMs / runCount
        });
        clampArray(this.jobDetails, 200);
    }

    recordChunkSize(chunkSize) {
        if (!this.enabled) return;
        if (!Number.isFinite(chunkSize)) return;
        this.chunkSizes.push(chunkSize);
        clampArray(this.chunkSizes, 100);
    }

    recordMemorySnapshot() {
        if (!this.enabled) return;
        if (typeof performance === "undefined" || !performance.memory) return;
        const memory = performance.memory;
        const snapshot = {
            timestamp: safeTimestamp(),
            usedMB: (memory.usedJSHeapSize || 0) / (1024 * 1024),
            totalMB: (memory.totalJSHeapSize || 0) / (1024 * 1024),
            limitMB: (memory.jsHeapSizeLimit || 0) / (1024 * 1024)
        };
        if (!this.memoryStart) {
            this.memoryStart = snapshot;
        }
        this.memorySnapshots.push(snapshot);
        clampArray(this.memorySnapshots, 20);
    }

    getReport() {
        if (!this.enabled) {
            return { enabled: false, name: this.name };
        }

        const now = safeNow();
        const elapsedSec = Math.max(0.001, (now - this.createdAt) / 1000);
        const completed = this.completedJobs;
        const total = this.totalJobs;
        const failed = this.failedJobs;
        const successRate = total > 0 ? (completed / total) * 100 : 0;

        const avgJobTime = completed > 0 ? this.totalWorkTime / completed : 0;
        const throughput = completed / elapsedSec;

        const workerEntries = [];
        let utilizationSum = 0;
        let workerCount = this.workerStats.size;
        let minJobs = null;
        let maxJobs = null;

        for (const [workerId, stats] of this.workerStats.entries()) {
            const jobCount = stats.jobsCompleted + stats.jobsFailed;
            const denom = stats.totalTime + stats.idleTime;
            const utilization = denom > 0 ? (stats.totalTime / denom) * 100 : 0;
            utilizationSum += utilization;
            minJobs = minJobs == null ? jobCount : Math.min(minJobs, jobCount);
            maxJobs = maxJobs == null ? jobCount : Math.max(maxJobs, jobCount);
            workerEntries.push({
                workerId,
                jobsCompleted: stats.jobsCompleted,
                jobsFailed: stats.jobsFailed,
                totalTimeMs: stats.totalTime,
                idleTimeMs: stats.idleTime,
                utilizationPct: utilization
            });
        }

        if (this.workerCount > workerCount) {
            workerCount = this.workerCount;
        }

        const avgUtilization = workerEntries.length > 0 ? (utilizationSum / workerEntries.length) : 0;
        const loadBalanceScore = maxJobs && minJobs != null ? (minJobs / maxJobs) * 100 : 0;

        const chunkingStats = this._summarizeChunking();
        const memoryStats = this._summarizeMemory();
        const jobVariance = this._summarizeJobVariance();

        return {
            enabled: true,
            name: this.name,
            jobs: {
                total,
                completed,
                failed,
                successRatePct: successRate
            },
            performance: {
                avgJobTimeMs: avgJobTime,
                minJobTimeMs: this.minJobTime ?? 0,
                maxJobTimeMs: this.maxJobTime ?? 0,
                throughputJobsPerSec: throughput
            },
            workers: {
                count: workerCount,
                utilizationPct: avgUtilization,
                loadBalanceScorePct: loadBalanceScore,
                stats: workerEntries
            },
            chunking: chunkingStats,
            memory: memoryStats,
            jobVariance,
            errors: [...this.errors]
        };
    }

    _summarizeChunking() {
        if (!this.chunkSizes.length) {
            return { avg: 0, min: 0, max: 0, current: 0 };
        }
        const sum = this.chunkSizes.reduce((acc, val) => acc + val, 0);
        const avg = sum / this.chunkSizes.length;
        const min = Math.min(...this.chunkSizes);
        const max = Math.max(...this.chunkSizes);
        const current = this.chunkSizes[this.chunkSizes.length - 1];
        return { avg, min, max, current };
    }

    _summarizeMemory() {
        if (!this.memorySnapshots.length) {
            return { current: null, limit: null, usagePct: null, deltaSinceStartMB: 0 };
        }
        const current = this.memorySnapshots[this.memorySnapshots.length - 1];
        const limit = current.limitMB || 0;
        const usagePct = limit > 0 ? (current.usedMB / limit) * 100 : null;
        const startUsed = this.memoryStart ? this.memoryStart.usedMB : current.usedMB;
        return {
            current: current.usedMB,
            limit: limit || null,
            usagePct,
            deltaSinceStartMB: current.usedMB - startUsed
        };
    }

    _summarizeJobVariance() {
        if (!this.jobDetails.length) {
            return { meanMsPerRun: 0, stdDevMsPerRun: 0, coefficient: 0, outliers: [] };
        }
        const values = this.jobDetails.map(entry => entry.msPerRun).filter(v => Number.isFinite(v));
        if (!values.length) {
            return { meanMsPerRun: 0, stdDevMsPerRun: 0, coefficient: 0, outliers: [] };
        }
        const mean = values.reduce((acc, val) => acc + val, 0) / values.length;
        const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
        const stdDev = Math.sqrt(variance);
        const coefficient = mean > 0 ? stdDev / mean : 0;
        const outliers = this.jobDetails.filter(entry => entry.msPerRun > mean * 2).slice(-10);
        return {
            meanMsPerRun: mean,
            stdDevMsPerRun: stdDev,
            coefficient,
            outliers
        };
    }

    printReport() {
        if (!this.enabled) return;
        const report = this.getReport();
        console.group(`[WorkerTelemetry] ${report.name}`);
        console.table([report.jobs]);
        console.table([report.performance]);
        console.table([report.chunking]);
        console.table([report.memory]);
        console.table([report.jobVariance]);
        if (report.workers.stats && report.workers.stats.length) {
            console.table(report.workers.stats);
        }
        if (report.errors && report.errors.length) {
            console.table(report.errors);
        }
        console.groupEnd();
    }

    exportJSON() {
        if (!this.enabled) return JSON.stringify({ enabled: false, name: this.name });
        return JSON.stringify(this.getReport(), null, 2);
    }
}
