"use strict";

import { WorkerTelemetry } from './worker-telemetry.js';

export class WorkerPool {
    constructor({ workerUrl, size = 1, type = 'module', onProgress = null, onError = null, telemetryName = 'default' } = {}) {
        if (!workerUrl) {
            throw new Error('WorkerPool requires workerUrl');
        }
        this.workerUrl = workerUrl;
        this.size = Math.max(1, Number(size) || 1);
        this.type = type;
        this.onProgress = typeof onProgress === 'function' ? onProgress : null;
        this.onError = typeof onError === 'function' ? onError : null;
        this.telemetry = new WorkerTelemetry(telemetryName);

        this.workers = [];
        this.idle = [];
        this.queue = [];
        this.jobs = new Map();
        this.activeJobs = new Map();
        this.nextJobId = 1;
        this.workerIds = new Map();
        this.nextWorkerId = 1;
        this.workerReady = new WeakMap();
        this.poolDisabled = false;
        this.poolFailureReason = null;
        this.consecutiveBootstrapFailures = 0;
        this.maxBootstrapFailures = Math.max(3, this.size * 2);

        this._initWorkers();
    }

    _initWorkers() {
        for (let i = 0; i < this.size; i++) {
            const worker = this._createWorker();
            this.workers.push(worker);
            this.idle.push(worker);
        }
        if (this.telemetry && this.telemetry.enabled) {
            this.telemetry.workerCount = this.size;
        }
    }

    _createWorker() {
        const worker = new Worker(this.workerUrl, { type: this.type });
        worker.onmessage = event => this._handleMessage(worker, event.data);
        worker.onerror = error => this._handleError(worker, error);
        const workerId = `worker-${this.nextWorkerId++}`;
        this.workerIds.set(worker, workerId);
        this.workerReady.set(worker, false);
        return worker;
    }

    _formatErrorMessage(error) {
        if (!error) return 'Unknown worker error';
        if (error instanceof Error) return error.message || String(error);
        const message = (typeof error.message === 'string' && error.message.trim()) ? error.message.trim() : '';
        const filename = typeof error.filename === 'string' ? error.filename : '';
        const lineno = Number.isFinite(error.lineno) && error.lineno > 0 ? error.lineno : null;
        const colno = Number.isFinite(error.colno) && error.colno > 0 ? error.colno : null;
        const location = filename
            ? `${filename}${lineno ? `:${lineno}` : ''}${colno ? `:${colno}` : ''}`
            : '';
        if (message && location) return `${message} @ ${location}`;
        if (message) return message;
        if (location) return `Worker script error @ ${location}`;
        return String(error);
    }

    _toError(error, worker) {
        if (error instanceof Error) {
            return error;
        }
        const workerId = this._getWorkerId(worker);
        const msg = this._formatErrorMessage(error);
        const normalized = new Error(`[WorkerPool:${workerId}] ${msg}`);
        if (error && typeof error === 'object') {
            if (typeof error.filename === 'string') normalized.filename = error.filename;
            if (Number.isFinite(error.lineno)) normalized.lineno = error.lineno;
            if (Number.isFinite(error.colno)) normalized.colno = error.colno;
        }
        return normalized;
    }

    _disablePool(reason) {
        if (this.poolDisabled) return;
        this.poolDisabled = true;
        this.poolFailureReason = reason instanceof Error ? reason : new Error(String(reason));
        const allJobIds = new Set([
            ...this.jobs.keys(),
            ...this.activeJobs.values()
        ]);
        for (const jobId of allJobIds) {
            const job = this.jobs.get(jobId);
            if (!job) continue;
            this.jobs.delete(jobId);
            if (this.telemetry) {
                this.telemetry.recordJobFailed(jobId, 'pool-disabled', this.poolFailureReason);
            }
            job.reject(this.poolFailureReason);
        }
        while (this.queue.length > 0) {
            const queued = this.queue.shift();
            if (!queued) continue;
            if (this.telemetry) {
                this.telemetry.recordJobFailed(queued.jobId, 'pool-disabled', this.poolFailureReason);
            }
            queued.reject(this.poolFailureReason);
        }
        for (const worker of this.workers) {
            worker.terminate();
        }
        this.workers = [];
        this.idle = [];
        this.activeJobs.clear();
        this.workerIds.clear();
    }

    _getPoolDisabledError() {
        if (this.poolFailureReason instanceof Error) {
            return this.poolFailureReason;
        }
        return new Error('WorkerPool disabled due to repeated worker bootstrap failures.');
    }

    _getWorkerId(worker) {
        return this.workerIds.get(worker) || 'unknown';
    }

    _handleMessage(worker, message) {
        if (!message || typeof message !== 'object') return;
        this.workerReady.set(worker, true);
        this.consecutiveBootstrapFailures = 0;

        if (message.type === 'progress') {
            if (this.onProgress) this.onProgress(message);
            return;
        }

        const jobId = message.jobId;
        if (!jobId) {
            return;
        }

        const job = this.jobs.get(jobId);
        if (!job) {
            return;
        }

        this.jobs.delete(jobId);
        this.activeJobs.delete(worker);
        this.idle.push(worker);
        this._drainQueue();

        if (message.type === 'error') {
            const err = new Error(message.message || 'Worker error');
            err.stack = message.stack || err.stack;
            if (this.telemetry) {
                this.telemetry.recordJobFailed(jobId, this._getWorkerId(worker), err);
            }
            job.reject(err);
            return;
        }

        if (this.telemetry) {
            this.telemetry.recordJobComplete(jobId, this._getWorkerId(worker), message.elapsedMs);
        }
        job.resolve(message);
    }

    _handleError(worker, error) {
        const normalizedError = this._toError(error, worker);
        const isBootstrapFailure = this.workerReady.get(worker) !== true;
        if (isBootstrapFailure) {
            this.consecutiveBootstrapFailures += 1;
        } else {
            this.consecutiveBootstrapFailures = 0;
        }
        const workerId = this._getWorkerId(worker);
        if (this.onError) this.onError(normalizedError);
        const activeJobId = this.activeJobs.get(worker);
        if (activeJobId) {
            const job = this.jobs.get(activeJobId);
            if (job) {
                this.jobs.delete(activeJobId);
                if (this.telemetry) {
                    this.telemetry.recordJobFailed(activeJobId, workerId, normalizedError);
                }
                job.reject(normalizedError);
            }
            this.activeJobs.delete(worker);
        }
        const index = this.workers.indexOf(worker);
        if (index !== -1) {
            worker.terminate();
            this.idle = this.idle.filter(item => item !== worker);
            this.workers.splice(index, 1);
            this.workerIds.delete(worker);
        }

        if (isBootstrapFailure && this.consecutiveBootstrapFailures >= this.maxBootstrapFailures) {
            const message = [
                'WorkerPool disabled after repeated bootstrap failures.',
                `workerUrl=${String(this.workerUrl)}`,
                `failures=${this.consecutiveBootstrapFailures}`,
                `lastError=${this._formatErrorMessage(normalizedError)}`
            ].join(' ');
            this._disablePool(new Error(message));
            return;
        }
        if (this.poolDisabled) {
            return;
        }
        // Replace the worker to avoid reusing a potentially corrupted state.
        const replacement = this._createWorker();
        this.workers.push(replacement);
        this.idle.push(replacement);
        this._drainQueue();
    }

    _drainQueue() {
        if (this.poolDisabled) {
            const disabledError = this._getPoolDisabledError();
            while (this.queue.length > 0) {
                const job = this.queue.shift();
                if (!job) continue;
                if (this.telemetry) {
                    this.telemetry.recordJobFailed(job.jobId, 'pool-disabled', disabledError);
                }
                job.reject(disabledError);
            }
            return;
        }
        while (this.idle.length > 0 && this.queue.length > 0) {
            const worker = this.idle.pop();
            const job = this.queue.shift();
            this.jobs.set(job.jobId, job);
            this.activeJobs.set(worker, job.jobId);
            if (this.telemetry) {
                this.telemetry.recordJobStart(job.jobId, this._getWorkerId(worker), job.payload);
            }
            try {
                worker.postMessage(job.payload, job.transferables);
            } catch (postMessageError) {
                this._handleError(worker, postMessageError);
            }
        }
    }

    runJob(payload, transferables = []) {
        if (this.poolDisabled) {
            return Promise.reject(this._getPoolDisabledError());
        }
        const jobId = this.nextJobId++;
        const message = { ...payload, jobId };
        if (this.telemetry) {
            this.telemetry.recordJobStart(jobId, 'pending', message);
        }
        return new Promise((resolve, reject) => {
            this.queue.push({ jobId, payload: message, transferables, resolve, reject });
            this._drainQueue();
        });
    }

    async broadcast(payload, transferables = []) {
        if (this.poolDisabled) {
            throw this._getPoolDisabledError();
        }
        const responses = [];
        for (const worker of this.workers) {
            responses.push(this._sendDirect(worker, payload, transferables));
        }
        return Promise.all(responses);
    }

    _sendDirect(worker, payload, transferables = []) {
        if (this.poolDisabled) {
            return Promise.reject(this._getPoolDisabledError());
        }
        const jobId = this.nextJobId++;
        const message = { ...payload, jobId };
        return new Promise((resolve, reject) => {
            this.jobs.set(jobId, { resolve, reject });
            this.activeJobs.set(worker, jobId);
            const idleIndex = this.idle.indexOf(worker);
            if (idleIndex !== -1) {
                this.idle.splice(idleIndex, 1);
            }
            if (this.telemetry) {
                this.telemetry.recordJobStart(jobId, this._getWorkerId(worker), message);
            }
            try {
                worker.postMessage(message, transferables);
            } catch (postMessageError) {
                this.jobs.delete(jobId);
                this.activeJobs.delete(worker);
                reject(this._toError(postMessageError, worker));
            }
        });
    }

    dispose() {
        if (this.telemetry) {
            this.telemetry.printReport();
        }
        for (const worker of this.workers) {
            worker.terminate();
        }
        this.workers = [];
        this.idle = [];
        this.queue = [];
        this.jobs.clear();
        this.activeJobs.clear();
        this.workerIds.clear();
        this.poolDisabled = true;
        this.poolFailureReason = null;
    }
}
