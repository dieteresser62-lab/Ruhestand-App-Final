import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const QUICK_TESTS_DEPRECATED_MESSAGE =
    'QUICK_TESTS=1 is deprecated; use targeted run-single checks or the slice-specific commands instead.';

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

async function runInProcess({ testDir, files }) {
    const counters = installAssertionGlobals();
    let failedFiles = 0;

    for (const file of files) {
        console.log(`\n📂 Running ${file}...`);
        try {
            const filePath = path.join(testDir, file);
            const fileUrl = pathToFileURL(filePath).href;
            await import(fileUrl);
            console.log(`✅ ${file} completed.`);
        } catch (err) {
            console.error(`❌ ${file} failed:`);
            console.error(err);
            if (!isAssertionFailure(err)) {
                failedFiles++;
            }
        }
    }

    return {
        totalAssertions: counters.total,
        passedAssertions: counters.passed,
        failedAssertions: counters.failedAssertions,
        failedFiles
    };
}

function runIsolated({ testDir, files }) {
    let failedFiles = 0;
    const runnerPath = path.join(__dirname, 'run-single.mjs');

    for (const file of files) {
        console.log(`\n📂 Running ${file} in isolated process...`);
        const filePath = path.join(testDir, file);
        const result = spawnSync(process.execPath, [runnerPath, filePath], {
            cwd: path.resolve(__dirname, '..'),
            stdio: 'inherit',
            env: process.env
        });
        if (result.status !== 0) {
            failedFiles++;
        }
    }

    return {
        totalAssertions: null,
        passedAssertions: null,
        failedAssertions: 0,
        failedFiles
    };
}

function printSummary(results, openHandles) {
    const failedTotal = results.failedAssertions + results.failedFiles;

    console.log('\n' + '='.repeat(40));
    console.log('SUMMARY:');
    if (results.totalAssertions === null) {
        console.log('Total Assertions: unavailable in isolated mode');
        console.log('Passed: unavailable in isolated mode');
    } else {
        console.log(`Total Assertions: ${results.totalAssertions}`);
        console.log(`Passed: ${results.passedAssertions}`);
    }
    console.log(`Failed Assertions: ${results.failedAssertions}`);
    console.log(`Failed Files: ${results.failedFiles}`);
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

    const results = isolated
        ? runIsolated({ testDir, files })
        : await runInProcess({ testDir, files });

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
