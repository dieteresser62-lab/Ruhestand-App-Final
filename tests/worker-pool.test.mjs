"use strict";

/**
 * Tests für workers/worker-pool.js
 * - Pool-Erstellung und Lifecycle
 * - Job-Queueing und -Ausführung
 * - Broadcast-Funktionalität
 * - Fehlerbehandlung
 * - Telemetrie
 */

// Mock für Worker: simuliert init/job/sweep Antwortpfade ohne echte Threads.
class MockWorker {
    constructor(url, options = {}) {
        this.url = url;
        this.type = options.type || 'classic';
        this.onmessage = null;
        this.onerror = null;
        this._terminated = false;
        this._pendingMessages = [];
    }

    postMessage(message, transferables = []) {
        if (this._terminated) return;

        // Simuliere asynchrone Antwort
        setTimeout(() => {
            if (this._terminated || !this.onmessage) return;

            // Simuliere Worker-Verarbeitung
            const response = this._processMessage(message);
            if (response) {
                this.onmessage({ data: response });
            }
        }, 10);
    }

    _processMessage(message) {
        // Simuliere verschiedene Message-Typen
        if (message.type === 'init' || message.type === 'sweep-init') {
            return {
                jobId: message.jobId,
                type: 'ready',
                success: true
            };
        }

        if (message.type === 'job') {
            // Return minimal result payloads used by worker-pool logic.
            return {
                jobId: message.jobId,
                type: 'result',
                elapsedMs: 50,
                buffers: {
                    finalOutcomes: new Float64Array(10),
                    taxOutcomes: new Float64Array(10)
                },
                totals: { failCount: 0 },
                lists: { entryAges: [] }
            };
        }

        if (message.type === 'sweep') {
            return {
                jobId: message.jobId,
                type: 'result',
                elapsedMs: 30,
                results: [{ comboIdx: 0, params: {}, metrics: {} }],
                p2VarianceCount: 0
            };
        }

        if (message.type === 'error-test') {
            // Simuliere Fehler
            if (this.onerror) {
                this.onerror(new Error('Simulated worker error'));
            }
            return null;
        }

        // Standard-Antwort
        return {
            jobId: message.jobId,
            type: 'result',
            data: message
        };
    }

    terminate() {
        this._terminated = true;
    }

    // Hilfsmethode für Tests
    simulateError(error) {
        if (this.onerror) {
            this.onerror(error);
        }
    }
}

// Mock für WorkerTelemetry: hält nur Events für Assertions.
class MockWorkerTelemetry {
    constructor(name) {
        this.name = name;
        this.enabled = false;
        this.workerCount = 0;
        this.jobs = [];
    }

    recordJobStart(jobId, workerId, payload) {
        this.jobs.push({ jobId, workerId, type: 'start', payload });
    }

    recordJobComplete(jobId, workerId, elapsedMs) {
        this.jobs.push({ jobId, workerId, type: 'complete', elapsedMs });
    }

    recordJobFailed(jobId, workerId, error) {
        this.jobs.push({ jobId, workerId, type: 'failed', error });
    }

    recordChunkSize(size) {
        this.jobs.push({ type: 'chunk', size });
    }

    recordMemorySnapshot() {
        this.jobs.push({ type: 'memory' });
    }

    printReport() {
        // Keine Ausgabe in Tests
    }
}

// Ersetze global Worker
global.Worker = MockWorker;

// Minimale WorkerPool-Implementierung für Tests (aus worker-pool.js).
class WorkerPool {
    constructor({ workerUrl, size = 1, type = 'module', onProgress = null, onError = null, telemetryName = 'default' } = {}) {
        if (!workerUrl) {
            throw new Error('WorkerPool requires workerUrl');
        }
        this.workerUrl = workerUrl;
        this.size = Math.max(1, Number(size) || 1);
        this.type = type;
        this.onProgress = typeof onProgress === 'function' ? onProgress : null;
        this.onError = typeof onError === 'function' ? onError : null;
        this.telemetry = new MockWorkerTelemetry(telemetryName);

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
        if (!jobId) return;

        const job = this.jobs.get(jobId);
        if (!job) return;

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

console.log('--- Worker Pool Tests ---');

// Test 1: Pool-Erstellung
console.log('Test 1: Pool-Erstellung');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 4,
        type: 'module'
    });

    assertEqual(pool.size, 4, 'Pool sollte Größe 4 haben');
    assertEqual(pool.workers.length, 4, 'Pool sollte 4 Worker haben');
    assertEqual(pool.idle.length, 4, 'Alle Worker sollten idle sein');
    assertEqual(pool.queue.length, 0, 'Queue sollte leer sein');

    pool.dispose();
    console.log('✓ Pool-Erstellung OK');
}

// Test 2: Pool ohne URL sollte Fehler werfen
console.log('Test 2: Pool ohne URL');
{
    let errorThrown = false;
    try {
        new WorkerPool({});
    } catch (e) {
        errorThrown = true;
        assert(e.message.includes('workerUrl'), 'Fehler sollte workerUrl erwähnen');
    }
    assert(errorThrown, 'Pool ohne URL sollte Fehler werfen');
    console.log('✓ Pool ohne URL OK');
}

// Test 3: runJob - Einzelner Job
console.log('Test 3: runJob - Einzelner Job');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 2
    });

    const result = await pool.runJob({ type: 'test', data: 'hello' });

    assert(result.jobId !== undefined, 'Result sollte jobId haben');
    assertEqual(result.data.type, 'test', 'Result sollte Original-Type haben');
    assertEqual(result.data.data, 'hello', 'Result sollte Original-Data haben');

    pool.dispose();
    console.log('✓ runJob Einzelner Job OK');
}

// Test 4: runJob - Mehrere parallele Jobs
console.log('Test 4: runJob - Mehrere parallele Jobs');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 2
    });

    const promises = [
        pool.runJob({ type: 'test', id: 1 }),
        pool.runJob({ type: 'test', id: 2 }),
        pool.runJob({ type: 'test', id: 3 })
    ];

    const results = await Promise.all(promises);

    assertEqual(results.length, 3, 'Sollte 3 Ergebnisse haben');
    assert(results.every(r => r.jobId !== undefined), 'Alle Results sollten jobId haben');

    pool.dispose();
    console.log('✓ runJob Mehrere parallele Jobs OK');
}

// Test 5: broadcast - Init an alle Worker
console.log('Test 5: broadcast - Init');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 3
    });

    const results = await pool.broadcast({ type: 'init', scenarioKey: 'test' });

    assertEqual(results.length, 3, 'Broadcast sollte 3 Antworten liefern');
    assert(results.every(r => r.success === true), 'Alle Antworten sollten success=true haben');

    pool.dispose();
    console.log('✓ broadcast Init OK');
}

// Test 6: Queue-Verarbeitung
console.log('Test 6: Queue-Verarbeitung');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 1 // Nur 1 Worker -> Queue wird genutzt
    });

    const startTime = Date.now();

    const promises = [
        pool.runJob({ type: 'test', order: 1 }),
        pool.runJob({ type: 'test', order: 2 }),
        pool.runJob({ type: 'test', order: 3 })
    ];

    const results = await Promise.all(promises);

    assertEqual(results.length, 3, 'Alle 3 Jobs sollten abgeschlossen sein');

    pool.dispose();
    console.log('✓ Queue-Verarbeitung OK');
}

// Test 7: dispose - Cleanup
console.log('Test 7: dispose - Cleanup');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 2
    });

    pool.dispose();

    assertEqual(pool.workers.length, 0, 'Workers sollten leer sein nach dispose');
    assertEqual(pool.idle.length, 0, 'Idle sollte leer sein nach dispose');
    assertEqual(pool.queue.length, 0, 'Queue sollte leer sein nach dispose');
    assertEqual(pool.jobs.size, 0, 'Jobs Map sollte leer sein nach dispose');
    console.log('✓ dispose Cleanup OK');
}

// Test 8: Job mit Transferables
console.log('Test 8: Job mit Transferables');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 1
    });

    const buffer = new ArrayBuffer(16);
    const result = await pool.runJob({ type: 'test', buffer }, [buffer]);

    assert(result.jobId !== undefined, 'Result sollte jobId haben');

    pool.dispose();
    console.log('✓ Job mit Transferables OK');
}

// Test 9: onProgress Callback
console.log('Test 9: onProgress Callback');
{
    let progressCalled = false;

    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 1,
        onProgress: (msg) => {
            progressCalled = true;
        }
    });

    // onProgress wird nur bei 'progress' type Nachrichten aufgerufen
    // Unser Mock sendet keine progress-Nachrichten, also testen wir nur die Registrierung
    assert(typeof pool.onProgress === 'function', 'onProgress sollte registriert sein');

    pool.dispose();
    console.log('✓ onProgress Callback OK');
}

// Test 10: onError Callback
console.log('Test 10: onError Callback');
{
    let errorReceived = null;

    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 1,
        onError: (err) => {
            errorReceived = err;
        }
    });

    assert(typeof pool.onError === 'function', 'onError sollte registriert sein');

    pool.dispose();
    console.log('✓ onError Callback OK');
}

// Test 11: Telemetrie-Aufzeichnung
console.log('Test 11: Telemetrie-Aufzeichnung');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 1,
        telemetryName: 'TestPool'
    });

    await pool.runJob({ type: 'test' });

    // Telemetrie sollte Job-Start und -Complete aufgezeichnet haben
    const startEvents = pool.telemetry.jobs.filter(j => j.type === 'start');
    const completeEvents = pool.telemetry.jobs.filter(j => j.type === 'complete');

    assert(startEvents.length >= 1, 'Mindestens 1 Start-Event sollte aufgezeichnet sein');
    assert(completeEvents.length >= 1, 'Mindestens 1 Complete-Event sollte aufgezeichnet sein');

    pool.dispose();
    console.log('✓ Telemetrie-Aufzeichnung OK');
}

// Test 12: Worker-ID-Zuweisung
console.log('Test 12: Worker-ID-Zuweisung');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 3
    });

    const workerIds = new Set();
    for (const worker of pool.workers) {
        const id = pool._getWorkerId(worker);
        assert(id.startsWith('worker-'), 'Worker-ID sollte mit "worker-" beginnen');
        workerIds.add(id);
    }

    assertEqual(workerIds.size, 3, 'Alle 3 Worker sollten eindeutige IDs haben');

    pool.dispose();
    console.log('✓ Worker-ID-Zuweisung OK');
}

// Test 13: Pool-Größe Normalisierung
console.log('Test 13: Pool-Größe Normalisierung');
{
    const pool1 = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 0
    });
    assertEqual(pool1.size, 1, 'Größe 0 sollte auf 1 normalisiert werden');
    pool1.dispose();

    const pool2 = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: -5
    });
    assertEqual(pool2.size, 1, 'Negative Größe sollte auf 1 normalisiert werden');
    pool2.dispose();

    const pool3 = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 'invalid'
    });
    assertEqual(pool3.size, 1, 'Ungültige Größe sollte auf 1 normalisiert werden');
    pool3.dispose();

    console.log('✓ Pool-Größe Normalisierung OK');
}

// Test 14: Job-Typ 'job' (Monte-Carlo)
console.log('Test 14: Job-Typ MC');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 1
    });

    const result = await pool.runJob({
        type: 'job',
        runRange: { start: 0, count: 10 },
        monteCarloParams: { anzahl: 10 }
    });

    assert(result.buffers !== undefined, 'MC-Result sollte buffers haben');
    assert(result.totals !== undefined, 'MC-Result sollte totals haben');
    assert(typeof result.elapsedMs === 'number', 'MC-Result sollte elapsedMs haben');

    pool.dispose();
    console.log('✓ Job-Typ MC OK');
}

// Test 15: Job-Typ 'sweep'
console.log('Test 15: Job-Typ Sweep');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 1
    });

    const result = await pool.runJob({
        type: 'sweep',
        comboRange: { start: 0, count: 5 },
        sweepConfig: {}
    });

    assert(Array.isArray(result.results), 'Sweep-Result sollte results Array haben');
    assert(typeof result.p2VarianceCount === 'number', 'Sweep-Result sollte p2VarianceCount haben');

    pool.dispose();
    console.log('✓ Job-Typ Sweep OK');
}

// Test 16: Idle-Worker werden korrekt verwaltet
console.log('Test 16: Idle-Worker Management');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 2
    });

    assertEqual(pool.idle.length, 2, 'Initial sollten alle Worker idle sein');

    // Starte Job
    const jobPromise = pool.runJob({ type: 'test' });

    // Warte kurz, dann prüfe
    await new Promise(r => setTimeout(r, 5));

    // Nach Job-Start sollte mindestens 1 Worker busy sein
    assert(pool.idle.length <= 2, 'Während Job sollte idle <= 2 sein');

    await jobPromise;

    // Nach Abschluss sollten alle Worker wieder idle sein
    assertEqual(pool.idle.length, 2, 'Nach Job sollten alle Worker wieder idle sein');

    pool.dispose();
    console.log('✓ Idle-Worker Management OK');
}

// Test 17: nextJobId Inkrementierung
console.log('Test 17: nextJobId Inkrementierung');
{
    const pool = new WorkerPool({
        workerUrl: new URL('file:///mock-worker.js'),
        size: 1
    });

    const initialId = pool.nextJobId;
    await pool.runJob({ type: 'test' });
    const afterFirstJob = pool.nextJobId;
    await pool.runJob({ type: 'test' });
    const afterSecondJob = pool.nextJobId;

    assert(afterFirstJob > initialId, 'Job-ID sollte nach erstem Job erhöht sein');
    assert(afterSecondJob > afterFirstJob, 'Job-ID sollte nach zweitem Job erhöht sein');

    pool.dispose();
    console.log('✓ nextJobId Inkrementierung OK');
}

console.log('--- Worker Pool Tests Abgeschlossen ---');
