import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
    getTestFiles,
    getTestExecutionPolicy,
    QUICK_TESTS_DEPRECATED_MESSAGE
} from './run-tests.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const runTestsPath = path.join(__dirname, 'run-tests.mjs');
const runSinglePath = path.join(__dirname, 'run-single.mjs');

function createTempTestDir() {
    return fs.mkdtempSync(path.join(os.tmpdir(), 'ruhestand-runner-'));
}

function writeTest(dir, filename, source) {
    fs.writeFileSync(path.join(dir, filename), source, 'utf8');
}

function runNode(args, env = {}) {
    return spawnSync(process.execPath, args, {
        cwd: repoRoot,
        encoding: 'utf8',
        env: {
            ...process.env,
            ...env
        }
    });
}

function combinedOutput(result) {
    return `${result.stdout || ''}${result.stderr || ''}`;
}

function cleanup(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

console.log('--- Runner Contract Tests ---');

{
    const dir = createTempTestDir();
    try {
        writeTest(dir, 'b.test.mjs', "console.log('ORDER:b');\nassert(true, 'b pass');\n");
        writeTest(dir, 'a.test.mjs', "console.log('ORDER:a');\nassert(true, 'a pass');\n");

        const files = getTestFiles(dir);
        assertEqual(files.join(','), 'a.test.mjs,b.test.mjs', 'getTestFiles should sort test files deterministically');

        const result = runNode([runTestsPath], { TESTS_DIR: dir });
        assertEqual(result.status, 0, 'Sorted passing temp suite should exit 0');
        const output = combinedOutput(result);
        assert(
            output.indexOf('ORDER:a') < output.indexOf('ORDER:b'),
            'Runner should execute sorted files in deterministic order'
        );
        assert(output.includes('a.test.mjs | mode=in-process | assertions=1'), 'Runner should report mode and assertion count per file');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        writeTest(dir, 'zero.test.mjs', "console.log('import-only fixture');\n");

        const result = runNode([runTestsPath], { TESTS_DIR: dir });
        assertEqual(result.status, 1, 'Import-only temp suite should fail the standard gate');
        const output = combinedOutput(result);
        assert(output.includes('completed with zero assertions'), 'Zero-assertion failure should explain the false-green contract');
        assert(output.includes('zero.test.mjs | mode=in-process | assertions=0'), 'Zero-assertion result should remain attributable to its file');
        assert(output.includes('Failed Files: 1'), 'Zero-assertion file should count as one failed file');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        writeTest(dir, 'tranchen-manager-page.test.mjs', "assert(true, 'isolated policy fixture');\n");

        const policy = getTestExecutionPolicy('tranchen-manager-page.test.mjs');
        assertEqual(policy.mode, 'isolated', 'Manager page should have an explicit isolated execution policy');
        const result = runNode([runTestsPath], { TESTS_DIR: dir });
        assertEqual(result.status, 0, 'Policy-isolated temp suite should exit 0');
        const output = combinedOutput(result);
        assert(output.includes('Running tranchen-manager-page.test.mjs in isolated process'), 'Policy should execute manager page in a child process');
        assert(output.includes('tranchen-manager-page.test.mjs | mode=isolated | assertions=1'), 'Isolated result should report its assertion count');
        assert(output.includes('Total Assertions: 1'), 'Parent summary should include isolated assertions');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        writeTest(
            dir,
            'health-bucket.test.mjs',
            "function assert(condition, message) {\n    if (!condition) throw new Error(message);\n}\nassert(true, 'legacy pass');\n"
        );

        const policy = getTestExecutionPolicy('health-bucket.test.mjs');
        assertEqual(policy.instrumentAssertions, true, 'Legacy helper policy should activate assertion instrumentation');
        const result = runNode([runTestsPath], { TESTS_DIR: dir });
        assertEqual(result.status, 0, 'Instrumented legacy assertion should pass the standard gate');
        const output = combinedOutput(result);
        assert(output.includes('health-bucket.test.mjs | mode=isolated | assertions=1'), 'Legacy helper call should be counted at runtime');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        writeTest(
            dir,
            'scenarios.test.mjs',
            "function assert(condition, message) {\n    if (!condition) throw new Error(message);\n}\nassert(false, 'legacy fail');\n"
        );

        const result = runNode([runTestsPath], { TESTS_DIR: dir });
        assertEqual(result.status, 1, 'Failing instrumented legacy assertion should fail the standard gate');
        const output = combinedOutput(result);
        assert(output.includes('legacy fail'), 'Legacy assertion failure should preserve its error message');
        assert(output.includes('scenarios.test.mjs | mode=isolated | assertions=1'), 'Failing legacy helper should still report its runtime count');
        assert(output.includes('Failed Assertions: 1'), 'Legacy assertion error should count as an assertion failure');
        assert(output.includes('Failed Files: 0'), 'Legacy assertion error should not also count as a file failure');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        writeTest(dir, 'browser-smoke.test.mjs', "throw new Error('separate gate fixture must not be imported');\n");

        const result = runNode([runTestsPath], { TESTS_DIR: dir });
        assertEqual(result.status, 0, 'Explicit separate-gate file should not fail the Node standard suite');
        const output = combinedOutput(result);
        assert(output.includes('browser-smoke.test.mjs | mode=separate-gate | assertions=0'), 'Separate gate should be reported explicitly');
        assert(output.includes('npm run test:browser'), 'Separate gate should name its required command');
        assert(output.includes('Separate Gates: 1'), 'Parent summary should count separate gates');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        writeTest(dir, 'fail.test.mjs', "assert(false, 'intentional assertion failure');\n");

        const result = runNode([runTestsPath], { TESTS_DIR: dir });
        assertEqual(result.status, 1, 'Assertion failure should exit 1');
        const output = combinedOutput(result);
        assert(output.includes('Failed Assertions: 1'), 'Assertion failure should count one failed assertion');
        assert(output.includes('Failed Files: 0'), 'Assertion failure should not also count as a failed file');
        assert(output.includes('Failed: 1'), 'Assertion failure should produce total failed count of one');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        writeTest(dir, 'setup-error.test.mjs', "throw new Error('setup exploded');\n");

        const result = runNode([runTestsPath], { TESTS_DIR: dir });
        assertEqual(result.status, 1, 'Setup/import failure should exit 1');
        const output = combinedOutput(result);
        assert(output.includes('Failed Assertions: 0'), 'Setup/import failure should not count as assertion failure');
        assert(output.includes('Failed Files: 1'), 'Setup/import failure should count as failed file');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        writeTest(dir, 'isolated.test.mjs', "assert(true, 'isolated pass');\n");

        const result = runNode([runTestsPath, '--isolated'], { TESTS_DIR: dir });
        assertEqual(result.status, 0, 'Isolated temp suite should exit 0');
        const output = combinedOutput(result);
        assert(output.includes('Isolation: enabled'), 'Isolated mode should be visible in output');
        assert(output.includes('Running isolated.test.mjs in isolated process'), 'Isolated mode should spawn per-file runner');
        assert(output.includes('isolated.test.mjs | mode=isolated | assertions=1'), 'Forced isolation should keep assertion accounting');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        const file = path.join(dir, 'single.test.mjs');
        writeTest(dir, 'single.test.mjs', "assertEqual(2 + 2, 4, 'single arithmetic');\n");

        const result = runNode([runSinglePath, file]);
        assertEqual(result.status, 0, 'run-single should exit 0 for passing file');
        const output = combinedOutput(result);
        assert(output.includes('SINGLE TEST SUMMARY'), 'run-single should print a summary');
        assert(output.includes('Total Assertions: 1'), 'run-single should count assertions with shared assertion helpers');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        const file = path.join(dir, 'single-fail.test.mjs');
        writeTest(dir, 'single-fail.test.mjs', "assert(false, 'single assertion failure');\n");

        const result = runNode([runSinglePath, file]);
        assertEqual(result.status, 1, 'run-single should exit 1 for assertion failure');
        const output = combinedOutput(result);
        assert(output.includes('TestAssertionError'), 'run-single should print assertion error type');
        assert(output.includes('single-fail.test.mjs'), 'run-single should print stack trace with failing file');
        assert(output.includes('Failed Assertions: 1'), 'run-single should keep assertion failure count');
        assert(output.includes('Failed Files: 0'), 'run-single should not count assertion failure as file failure');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        const file = path.join(dir, 'single-zero.test.mjs');
        writeTest(dir, 'single-zero.test.mjs', "console.log('single import-only fixture');\n");

        const result = runNode([runSinglePath, file]);
        assertEqual(result.status, 1, 'run-single should exit 1 for a zero-assertion file');
        const output = combinedOutput(result);
        assert(output.includes('completed with zero assertions'), 'run-single should explain the zero-assertion failure');
        assert(output.includes('Failed Files: 1'), 'run-single should count a zero-assertion file failure');
    } finally {
        cleanup(dir);
    }
}

{
    const dir = createTempTestDir();
    try {
        const result = runNode([runTestsPath], {
            TESTS_DIR: dir,
            QUICK_TESTS: '1'
        });
        const output = combinedOutput(result);
        assertEqual(result.status, 0, 'Deprecated QUICK_TESTS mode with no quick files should not fail setup');
        assert(output.includes(QUICK_TESTS_DEPRECATED_MESSAGE), 'QUICK_TESTS should emit a deprecation warning');
    } finally {
        cleanup(dir);
    }
}

console.log('Runner contract tests passed');
