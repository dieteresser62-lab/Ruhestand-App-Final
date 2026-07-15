import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const QUICK_TESTS_DEPRECATED_MESSAGE =
    'QUICK_TESTS=1 is deprecated; use targeted run-single checks or the slice-specific commands instead.';

export const TEST_EXECUTION_POLICY = Object.freeze({
    'auto-optimize-worker-contract.test.mjs': Object.freeze({
        mode: 'isolated',
        instrumentAssertions: true,
        reason: 'Uses legacy local assertion helpers and worker/browser globals.'
    }),
    'balance-expenses.test.mjs': Object.freeze({
        mode: 'isolated',
        instrumentAssertions: true,
        reason: 'Uses node:assert plus legacy helpers and installs DOM/storage mocks.'
    }),
    'balance-smoke.test.mjs': Object.freeze({
        mode: 'isolated',
        reason: 'Installs a complete Balance DOM and browser-global smoke fixture.'
    }),
    'balance-ui-orchestration.test.mjs': Object.freeze({
        mode: 'isolated',
        reason: 'Installs extensive DOM and browser-global mocks.'
    }),
    'profile-ui-contract.test.mjs': Object.freeze({
        mode: 'isolated',
        reason: 'Installs profile lifecycle mocks on browser globals.'
    }),
    'health-bucket.test.mjs': Object.freeze({
        mode: 'isolated',
        instrumentAssertions: true,
        reason: 'Uses legacy local assertion helpers.'
    }),
    'scenarios.test.mjs': Object.freeze({
        mode: 'isolated',
        instrumentAssertions: true,
        reason: 'Uses legacy local assertion helpers.'
    }),
    'simulator-3bucket-ui-e2e.test.mjs': Object.freeze({
        mode: 'isolated',
        instrumentAssertions: true,
        reason: 'Uses legacy local assertions and installs DOM mocks.'
    }),
    'simulator-headless.test.mjs': Object.freeze({
        mode: 'isolated',
        instrumentAssertions: true,
        reason: 'Runs the full headless backtest against mutable simulator globals.'
    }),
    'simulator-ui-orchestration.test.mjs': Object.freeze({
        mode: 'isolated',
        reason: 'Installs simulator DOM and browser-global mocks.'
    }),
    'spending-planner.test.mjs': Object.freeze({
        mode: 'isolated',
        instrumentAssertions: true,
        reason: 'Uses legacy local assertion helpers.'
    }),
    'tranchen-manager-page.test.mjs': Object.freeze({
        mode: 'isolated',
        reason: 'Installs manager-page DOM, storage and browser-global mocks.'
    }),
    'transaction-quantization.test.mjs': Object.freeze({
        mode: 'isolated',
        instrumentAssertions: true,
        reason: 'Uses node:assert plus legacy numeric assertion helpers.'
    }),
    'browser-smoke.test.mjs': Object.freeze({
        mode: 'separate-gate',
        command: 'npm run test:browser',
        reason: 'Requires Playwright and its managed local HTTP server.'
    })
});

export function getTestExecutionPolicy(file, { forceIsolated = false } = {}) {
    const configured = TEST_EXECUTION_POLICY[file];
    if (configured?.mode === 'separate-gate') return configured;
    if (forceIsolated) {
        return {
            mode: 'isolated',
            reason: 'Forced by --isolated or TEST_ISOLATED=1.'
        };
    }
    return configured || {
        mode: 'in-process',
        reason: 'DOM-free standard test.'
    };
}

export class TestAssertionError extends Error {
    constructor(message) {
        super(message);
        this.name = 'TestAssertionError';
        this.isTestAssertionError = true;
    }
}

export function createAssertionContext({ verbosePasses = false } = {}) {
    const counters = {
        total: 0,
        passed: 0,
        failedAssertions: 0
    };

    function recordPass(message) {
        counters.passed++;
        if (verbosePasses) console.log(`✅ PASS: ${message}`);
    }

    function fail(message, details = []) {
        counters.failedAssertions++;
        console.error(`❌ FAIL: ${message}`);
        for (const detail of details) console.error(detail);
        throw new TestAssertionError(message);
    }

    return {
        counters,
        assert(condition, message) {
            counters.total++;
            if (!condition) fail(message);
            recordPass(message);
        },
        assertEqual(actual, expected, message) {
            counters.total++;
            if (actual !== expected) {
                fail(`${message} (Expected ${expected}, got ${actual})`);
            }
            recordPass(message);
        },
        assertClose(actual, expected, tolerance = 0.001, message) {
            counters.total++;
            if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
                fail(message, [
                    `   Expected: ${expected}`,
                    `   Actual:   ${actual}`,
                    '   Reason:   Non-finite value'
                ]);
            }
            if (Math.abs(actual - expected) > tolerance) {
                fail(message, [
                    `   Expected: ${expected} +/- ${tolerance}`,
                    `   Actual:   ${actual}`
                ]);
            }
            recordPass(message);
        }
    };
}

export function installAssertionGlobals(options = {}) {
    const context = createAssertionContext(options);
    global.assert = context.assert;
    global.assertEqual = context.assertEqual;
    global.assertClose = context.assertClose;
    global.__wrapExternalAssert = assertionApi => new Proxy(assertionApi, {
        apply(target, thisArg, args) {
            context.counters.total++;
            try {
                const result = Reflect.apply(target, thisArg, args);
                context.counters.passed++;
                return result;
            } catch (error) {
                context.counters.failedAssertions++;
                error.isTestAssertionError = true;
                throw error;
            }
        },
        get(target, property, receiver) {
            const value = Reflect.get(target, property, receiver);
            if (typeof value !== 'function') return value;
            return (...args) => global.__wrapExternalAssert(value)(...args);
        }
    });
    return context.counters;
}

export function getTestFiles(testDir, { quickOnly = false } = {}) {
    const quickFiles = new Set([
        'worker-parity.test.mjs'
    ]);

    return fs.readdirSync(testDir)
        .filter(f => f.endsWith('.test.mjs'))
        .filter(f => !quickOnly || quickFiles.has(f))
        .sort((a, b) => a.localeCompare(b, 'en'));
}

function isAssertionFailure(error) {
    return error?.isTestAssertionError === true;
}

function formatOpenHandles() {
    const activeHandles = typeof process._getActiveHandles === 'function'
        ? process._getActiveHandles()
        : [];
    return activeHandles.filter(handle => (
        handle !== process.stdout &&
        handle !== process.stderr &&
        handle !== process.stdin
    ));
}

function parseSingleTestSummary(output) {
    const readCount = label => {
        const match = output.match(new RegExp(`${label}:\\s*(\\d+)`));
        return match ? Number(match[1]) : null;
    };
    const summary = {
        totalAssertions: readCount('Total Assertions'),
        passedAssertions: readCount('Passed'),
        failedAssertions: readCount('Failed Assertions'),
        failedFiles: readCount('Failed Files')
    };
    return Object.values(summary).every(Number.isInteger) ? summary : null;
}

function printFileResult(file, policy, result) {
    console.log(
        `📊 FILE RESULT: ${file} | mode=${policy.mode} | assertions=${result.totalAssertions}` +
        ` | passed=${result.passedAssertions} | failedAssertions=${result.failedAssertions}` +
        ` | failedFiles=${result.failedFiles}`
    );
}

function runIsolatedFile({ testDir, file, policy }) {
    const runnerPath = path.join(__dirname, 'run-single.mjs');
    console.log(`\n📂 Running ${file} in isolated process...`);
    const filePath = path.join(testDir, file);
    const child = spawnSync(process.execPath, [runnerPath, filePath], {
        cwd: path.resolve(__dirname, '..'),
        encoding: 'utf8',
        env: process.env
    });
    if (child.stdout) process.stdout.write(child.stdout);
    if (child.stderr) process.stderr.write(child.stderr);

    const output = `${child.stdout || ''}${child.stderr || ''}`;
    const parsed = parseSingleTestSummary(output);
    if (child.error || !parsed) {
        if (child.error) console.error(child.error);
        console.error(`❌ ${file} did not produce a readable isolated-test summary.`);
        const result = {
            totalAssertions: parsed?.totalAssertions ?? 0,
            passedAssertions: parsed?.passedAssertions ?? 0,
            failedAssertions: parsed?.failedAssertions ?? 0,
            failedFiles: Math.max(parsed?.failedFiles ?? 0, 1)
        };
        printFileResult(file, policy, result);
        return result;
    }

    if (parsed.totalAssertions === 0 && parsed.failedFiles === 0) {
        console.error(`❌ ${file} completed with zero assertions; no separate-gate policy applies.`);
        parsed.failedFiles++;
    } else if (child.status !== 0 && parsed.failedAssertions === 0 && parsed.failedFiles === 0) {
        console.error(`❌ ${file} exited with status ${child.status} without a reported failure.`);
        parsed.failedFiles++;
    }
    printFileResult(file, policy, parsed);
    return parsed;
}

async function runFiles({ testDir, files, forceIsolated = false }) {
    const counters = installAssertionGlobals();
    const totals = {
        totalAssertions: 0,
        passedAssertions: 0,
        failedAssertions: 0,
        failedFiles: 0,
        separateGates: 0
    };
    const addResult = result => {
        totals.totalAssertions += result.totalAssertions;
        totals.passedAssertions += result.passedAssertions;
        totals.failedAssertions += result.failedAssertions;
        totals.failedFiles += result.failedFiles;
    };

    for (const file of files) {
        const policy = getTestExecutionPolicy(file, { forceIsolated });
        if (policy.mode === 'separate-gate') {
            console.log(`\n⏭️  ${file} is covered by separate gate: ${policy.command}`);
            console.log(`   Reason: ${policy.reason}`);
            printFileResult(file, policy, {
                totalAssertions: 0,
                passedAssertions: 0,
                failedAssertions: 0,
                failedFiles: 0
            });
            totals.separateGates++;
            continue;
        }

        if (policy.mode === 'isolated') {
            addResult(runIsolatedFile({ testDir, file, policy }));
            continue;
        }

        console.log(`\n📂 Running ${file} in process...`);
        const before = { ...counters };
        let fileFailure = 0;
        try {
            const filePath = path.join(testDir, file);
            const fileUrl = pathToFileURL(filePath).href;
            await import(fileUrl);
            console.log(`✅ ${file} completed.`);
        } catch (err) {
            console.error(`❌ ${file} failed:`);
            console.error(err);
            if (!isAssertionFailure(err)) fileFailure++;
        }

        const result = {
            totalAssertions: counters.total - before.total,
            passedAssertions: counters.passed - before.passed,
            failedAssertions: counters.failedAssertions - before.failedAssertions,
            failedFiles: fileFailure
        };
        if (result.totalAssertions === 0 && result.failedFiles === 0) {
            console.error(`❌ ${file} completed with zero assertions; no separate-gate policy applies.`);
            result.failedFiles++;
        }
        printFileResult(file, policy, result);
        addResult(result);
    }

    return totals;
}

function printSummary(results, openHandles) {
    const failedTotal = results.failedAssertions + results.failedFiles;

    console.log('\n' + '='.repeat(40));
    console.log('SUMMARY:');
    console.log(`Total Assertions: ${results.totalAssertions}`);
    console.log(`Passed: ${results.passedAssertions}`);
    console.log(`Failed Assertions: ${results.failedAssertions}`);
    console.log(`Failed Files: ${results.failedFiles}`);
    console.log(`Separate Gates: ${results.separateGates}`);
    console.log(`Failed: ${failedTotal}`);
    console.log(`Open Handles: ${openHandles.length}`);
    console.log('='.repeat(40));

    if (openHandles.length > 0) {
        console.warn(`\n⚠️  Open handles detected: ${openHandles.length}`);
        openHandles.forEach((handle, index) => {
            const name = handle?.constructor?.name || typeof handle;
            console.warn(`  ${index + 1}. ${name}`);
        });
    }

    return failedTotal;
}

export async function runTests({
    testDir = process.env.TESTS_DIR ? path.resolve(process.env.TESTS_DIR) : __dirname,
    isolated = process.argv.includes('--isolated') || process.env.TEST_ISOLATED === '1',
    quickOnly = process.env.QUICK_TESTS === '1'
} = {}) {
    console.log('🚀 Starting Test Runner...');

    if (quickOnly) {
        console.warn(`⚠️  ${QUICK_TESTS_DEPRECATED_MESSAGE}`);
    }

    const files = getTestFiles(testDir, { quickOnly });
    console.log(`Found ${files.length} test files.`);
    if (isolated) {
        console.log('Isolation: enabled (one Node.js process per test file).');
    }

    const results = await runFiles({
        testDir,
        files,
        forceIsolated: isolated
    });

    const openHandles = formatOpenHandles();
    const failedTotal = printSummary(results, openHandles);

    return {
        ...results,
        failedTotal,
        openHandles: openHandles.length
    };
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMain) {
    runTests()
        .then(result => {
            process.exit(result.failedTotal > 0 ? 1 : 0);
        })
        .catch(error => {
            console.error('❌ Test runner failed during setup/import:');
            console.error(error);
            process.exit(1);
        });
}
