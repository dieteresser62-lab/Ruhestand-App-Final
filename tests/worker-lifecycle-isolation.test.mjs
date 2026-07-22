import {
    WorkerPool,
    WorkerGenerationCancelledError,
    WorkerPoolDisposedError
} from '../workers/worker-pool.js';
import {
    WorkerJobRunner,
    isWorkerRunCancelledError
} from '../app/simulator/worker-job-runner.js';

console.log('--- Worker Lifecycle Isolation Tests ---');

class ControlledWorker {
    static instances = [];

    constructor(url, options = {}) {
        this.url = url;
        this.options = options;
        this.messages = [];
        this.terminateCalls = 0;
        this.onmessage = null;
        this.onerror = null;
        ControlledWorker.instances.push(this);
    }

    postMessage(message) {
        if (this.throwOnPost) throw new Error('controlled postMessage failure');
        this.messages.push(message);
    }

    emit(message) {
        this.onmessage?.({ data: message });
    }

    terminate() {
        this.terminateCalls += 1;
    }
}

global.Worker = ControlledWorker;

function resetWorkers() {
    ControlledWorker.instances.length = 0;
}

async function captureRejection(promise) {
    try {
        await promise;
        return null;
    } catch (error) {
        return error;
    }
}

async function flushMicrotasks(rounds = 6) {
    for (let index = 0; index < rounds; index++) await Promise.resolve();
}

console.log('Test 1: abort before start is single-flight and schedules no job');
{
    const controller = new AbortController();
    controller.abort();
    let cancelCalls = 0;
    let runJobCalls = 0;
    const pool = {
        telemetry: { enabled: false },
        onProgress: null,
        cancelGeneration(generationId) {
            cancelCalls += 1;
            assertEqual(generationId, 'before-start', 'pre-start abort should preserve generation');
            return Promise.resolve();
        },
        runJob() {
            runJobCalls += 1;
            return Promise.resolve({});
        }
    };
    const runner = new WorkerJobRunner({
        pool,
        totalItems: 1,
        workerCount: 1,
        minChunk: 1,
        generationId: 'before-start',
        signal: controller.signal,
        buildPayload: () => ({ type: 'job' }),
        mergeResult: () => {}
    });
    const first = runner.run();
    const second = runner.run();
    assert(first === second, 'duplicate runner starts should return the same promise');
    const error = await captureRejection(first);
    assert(isWorkerRunCancelledError(error), 'pre-start abort should reject with cancellation contract');
    assertEqual(cancelCalls, 1, 'pre-start abort should cancel its generation exactly once');
    assertEqual(runJobCalls, 0, 'pre-start abort should not schedule worker jobs');
}

console.log('Test 2: CPU-bound generation cancellation terminates active workers and replaces lazily');
{
    resetWorkers();
    const pool = new WorkerPool({ workerUrl: new URL('file:///controlled-worker.js'), size: 2 });
    const jobs = [
        pool.runJob({ type: 'job' }, [], { generationId: 'cpu-bound' }),
        pool.runJob({ type: 'job' }, [], { generationId: 'cpu-bound' }),
        pool.runJob({ type: 'job' }, [], { generationId: 'cpu-bound' })
    ];
    await flushMicrotasks();
    assertEqual(pool.jobs.size, 2, 'two CPU-bound jobs should occupy both workers');
    assertEqual(pool.queue.length, 1, 'third CPU-bound job should remain queued');

    const firstCancel = pool.cancelGeneration('cpu-bound');
    const secondCancel = pool.cancelGeneration('cpu-bound');
    assert(firstCancel === secondCancel, 'duplicate cancellation should return the same promise');
    const summary = await firstCancel;
    const errors = await Promise.all(jobs.map(captureRejection));
    assertEqual(summary.terminatedWorkers, 2, 'cancellation should terminate all active generation workers');
    assertEqual(summary.queuedJobs, 1, 'cancellation should reject the queued generation job');
    assert(errors.every(error => error instanceof WorkerGenerationCancelledError), 'all generation jobs should reject as cancelled');
    assertEqual(pool.workers.length, 0, 'cancel should leave terminated slots empty');
    assertEqual(ControlledWorker.instances.length, 2, 'cancel should not recreate workers eagerly');

    pool.ensureCapacity();
    assertEqual(pool.workers.length, 2, 'next explicit start should restore pool capacity');
    assertEqual(ControlledWorker.instances.length, 4, 'lazy replacement should create exactly the missing slots');
    assertEqual(pool.dispose(), true, 'first dispose should perform cleanup');
    assertEqual(pool.dispose(), false, 'second dispose should be idempotent');
}

console.log('Test 3: abort during a runner batch never merges a late result');
{
    resetWorkers();
    const pool = new WorkerPool({ workerUrl: new URL('file:///controlled-worker.js'), size: 1 });
    const controller = new AbortController();
    let mergeCalls = 0;
    const runner = new WorkerJobRunner({
        pool,
        totalItems: 2,
        workerCount: 1,
        minChunk: 1,
        maxChunk: 1,
        generationId: 'abort-during-batch',
        signal: controller.signal,
        enableStallDetection: false,
        buildPayload: (start, count) => ({ type: 'job', runRange: { start, count } }),
        mergeResult: () => { mergeCalls += 1; }
    });
    const runPromise = runner.run();
    await flushMicrotasks();
    const retiredWorker = ControlledWorker.instances[0];
    const oldMessage = retiredWorker.messages.find(message => message.type === 'job');
    assert(oldMessage, 'runner should dispatch the first batch before cancellation');

    controller.abort();
    const error = await captureRejection(runPromise);
    retiredWorker.emit({
        type: 'result',
        jobId: oldMessage.jobId,
        generationId: oldMessage.generationId,
        elapsedMs: 1
    });
    await flushMicrotasks();
    assert(isWorkerRunCancelledError(error), 'mid-batch abort should reject with cancellation contract');
    assertEqual(retiredWorker.terminateCalls, 1, 'mid-batch abort should terminate the CPU-bound worker');
    assertEqual(mergeCalls, 0, 'late result from cancelled generation must not be merged');
    pool.dispose();
}

console.log('Test 4: late old-generation messages cannot affect a replacement worker job');
{
    resetWorkers();
    const progressGenerations = [];
    const pool = new WorkerPool({
        workerUrl: new URL('file:///controlled-worker.js'),
        size: 1,
        onProgress: message => progressGenerations.push(message.generationId)
    });
    const oldPromise = pool.runJob({ type: 'job' }, [], { generationId: 'old-generation' });
    await flushMicrotasks();
    const oldWorker = ControlledWorker.instances[0];
    const oldMessage = oldWorker.messages[0];
    await pool.cancelGeneration('old-generation');
    const oldError = await captureRejection(oldPromise);
    assert(oldError instanceof WorkerGenerationCancelledError, 'old generation should be cancelled');

    pool.ensureCapacity();
    const newPromise = pool.runJob({ type: 'job' }, [], { generationId: 'new-generation' });
    await flushMicrotasks();
    const newWorker = ControlledWorker.instances[1];
    const newMessage = newWorker.messages[0];
    oldWorker.emit({
        type: 'progress',
        jobId: oldMessage.jobId,
        generationId: oldMessage.generationId,
        pct: 100
    });
    newWorker.emit({
        type: 'progress',
        jobId: newMessage.jobId,
        generationId: newMessage.generationId,
        pct: 50
    });
    newWorker.emit({
        type: 'result',
        jobId: newMessage.jobId,
        generationId: newMessage.generationId,
        elapsedMs: 1,
        value: 'new'
    });
    const result = await newPromise;
    assertEqual(result.value, 'new', 'replacement worker should resolve the new generation');
    assertEqual(JSON.stringify(progressGenerations), JSON.stringify(['new-generation']), 'late old progress should be ignored');
    pool.dispose();
}

console.log('Test 5: dispose rejects open work and remains idempotent');
{
    resetWorkers();
    const pool = new WorkerPool({ workerUrl: new URL('file:///controlled-worker.js'), size: 1 });
    const active = pool.runJob({ type: 'job' }, [], { generationId: 'dispose-active' });
    const queued = pool.runJob({ type: 'job' }, [], { generationId: 'dispose-queued' });
    await flushMicrotasks();
    assertEqual(pool.dispose(), true, 'dispose should clean up once');
    const [activeError, queuedError] = await Promise.all([captureRejection(active), captureRejection(queued)]);
    assert(activeError instanceof WorkerPoolDisposedError, 'dispose should reject active work');
    assert(queuedError instanceof WorkerPoolDisposedError, 'dispose should reject queued work');
    assertEqual(pool.dispose(), false, 'repeated dispose should be a no-op');
    const afterDispose = await captureRejection(pool.runJob({ type: 'job' }));
    assert(afterDispose instanceof WorkerPoolDisposedError, 'disposed pool should reject future work');
}

console.log('Test 6: one worker rejection produces one observed fallback decision');
{
    resetWorkers();
    const unobserved = [];
    const onUnhandled = reason => unobserved.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
        const pool = new WorkerPool({ workerUrl: new URL('file:///controlled-worker.js'), size: 2 });
        const runner = new WorkerJobRunner({
            pool,
            totalItems: 2,
            workerCount: 2,
            minChunk: 1,
            maxChunk: 1,
            generationId: 'worker-rejection',
            enableStallDetection: false,
            buildPayload: (start, count) => ({ type: 'job', runRange: { start, count } }),
            mergeResult: () => {}
        });
        const runPromise = runner.run();
        await flushMicrotasks();
        const rejectingWorker = ControlledWorker.instances.find(worker => worker.messages.length > 0);
        const rejectedMessage = rejectingWorker.messages[0];
        rejectingWorker.emit({
            type: 'error',
            jobId: rejectedMessage.jobId,
            generationId: rejectedMessage.generationId,
            message: 'controlled worker rejection'
        });

        let fallbackDecisions = 0;
        const error = await captureRejection(runPromise);
        if (error && !isWorkerRunCancelledError(error)) fallbackDecisions += 1;
        await new Promise(resolve => setImmediate(resolve));
        assert(error?.message.includes('controlled worker rejection'), 'worker rejection should reach the caller');
        assertEqual(fallbackDecisions, 1, 'caller should make exactly one fallback decision');
        assertEqual(unobserved.length, 0, 'parallel rejection cleanup should leave no unobserved promise rejection');
        pool.dispose();
    } finally {
        process.off('unhandledRejection', onUnhandled);
    }
}

console.log('Test 7: adaptive stall watchdog is the only timeout and cancels once');
{
    let cancelCalls = 0;
    let rejectPending = null;
    const pool = {
        telemetry: { enabled: false, recordChunkSize() {} },
        onProgress: null,
        ensureCapacity() {},
        runJob() {
            return new Promise((resolve, reject) => {
                rejectPending = reject;
            });
        },
        cancelGeneration(generationId, reason) {
            cancelCalls += 1;
            rejectPending?.(reason);
            return Promise.resolve();
        }
    };
    const runner = new WorkerJobRunner({
        pool,
        totalItems: 1,
        workerCount: 1,
        minChunk: 1,
        maxChunk: 1,
        generationId: 'stalled-generation',
        stallTimeoutMs: 1,
        baseTimeoutMs: 1,
        buildPayload: () => ({ type: 'job' }),
        mergeResult: () => {}
    });
    const error = await captureRejection(runner.run());
    assert(error?.message.includes('stalled'), 'adaptive watchdog should report the documented stall error');
    assertEqual(cancelCalls, 1, 'stall handling should cancel its generation exactly once');
}

console.log('Test 8: direct send failures retire and replace the broken worker');
{
    resetWorkers();
    const pool = new WorkerPool({ workerUrl: new URL('file:///controlled-worker.js'), size: 1 });
    const brokenWorker = ControlledWorker.instances[0];
    brokenWorker.throwOnPost = true;

    const error = await captureRejection(pool.broadcast(
        { type: 'init' },
        [],
        { generationId: 'direct-post-failure' }
    ));
    assert(error?.message.includes('controlled postMessage failure'), 'direct send failure should reject its broadcast');
    assertEqual(brokenWorker.terminateCalls, 1, 'direct send failure should retire the broken worker');
    assertEqual(ControlledWorker.instances.length, 2, 'direct send failure should create one replacement worker');
    assertEqual(pool.workers.length, 1, 'pool capacity should remain intact after replacement');
    assert(pool.workers[0] === ControlledWorker.instances[1], 'replacement worker should occupy the retired slot');
    pool.dispose();
}

console.log('--- Worker Lifecycle Isolation Tests Completed ---');
