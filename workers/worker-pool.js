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

        this._initWorkers();
    }

    _initWorkers() {
        for (let i = 0; i < this.size; i++) {
            const worker = new Worker(this.workerUrl, { type: this.type });
            worker.onmessage = event => this._handleMessage(worker, event.data);
            worker.onerror = error => this._handleError(worker, error);
            this.workers.push(worker);
            this.idle.push(worker);
            const workerId = `worker-${this.nextWorkerId++}`;
            this.workerIds.set(worker, workerId);
        }
        if (this.telemetry && this.telemetry.enabled) {
            this.telemetry.workerCount = this.size;
        }
    }

    _getWorkerId(worker) {
        return this.workerIds.get(worker) || 'unknown';
    }

    _handleMessage(worker, message) {
        if (!message || typeof message !== 'object') return;

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
        if (this.onError) this.onError(error);
        const activeJobId = this.activeJobs.get(worker);
        if (activeJobId) {
            const job = this.jobs.get(activeJobId);
            if (job) {
                this.jobs.delete(activeJobId);
                if (this.telemetry) {
                    this.telemetry.recordJobFailed(activeJobId, this._getWorkerId(worker), error);
                }
                job.reject(error instanceof Error ? error : new Error(String(error)));
            }
            this.activeJobs.delete(worker);
        }
        // Replace the worker to avoid reusing a potentially corrupted state.
        const index = this.workers.indexOf(worker);
        if (index !== -1) {
            worker.terminate();
            const replacement = new Worker(this.workerUrl, { type: this.type });
            replacement.onmessage = event => this._handleMessage(replacement, event.data);
            replacement.onerror = err => this._handleError(replacement, err);
            this.workers[index] = replacement;
            this.idle = this.idle.filter(item => item !== worker);
            this.idle.push(replacement);
            const replacementId = `worker-${this.nextWorkerId++}`;
            this.workerIds.set(replacement, replacementId);
            this.workerIds.delete(worker);
        } else if (!this.idle.includes(worker)) {
            this.idle.push(worker);
        }
        this._drainQueue();
    }

    _drainQueue() {
        while (this.idle.length > 0 && this.queue.length > 0) {
            const worker = this.idle.pop();
            const job = this.queue.shift();
            this.jobs.set(job.jobId, job);
            this.activeJobs.set(worker, job.jobId);
            if (this.telemetry) {
                this.telemetry.recordJobStart(job.jobId, this._getWorkerId(worker), job.payload);
            }
            worker.postMessage(job.payload, job.transferables);
        }
    }

    runJob(payload, transferables = []) {
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
        const responses = [];
        for (const worker of this.workers) {
            responses.push(this._sendDirect(worker, payload, transferables));
        }
        return Promise.all(responses);
    }

    _sendDirect(worker, payload, transferables = []) {
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
            worker.postMessage(message, transferables);
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
    }
}
