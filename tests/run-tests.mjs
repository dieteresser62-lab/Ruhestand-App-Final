import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runTests() {
    console.log('🚀 Starting Test Runner...');

    const quickOnly = process.env.QUICK_TESTS === '1';
    const quickFiles = new Set([
        'worker-parity.test.mjs'
    ]);
    const files = fs.readdirSync(__dirname)
        .filter(f => f.endsWith('.test.mjs'))
        .filter(f => !quickOnly || quickFiles.has(f));
    console.log(`Found ${files.length} test files.`);

    let totalTests = 0;
    let passedTests = 0;
    let failedTests = 0;

    // Simple global assertion helper
    global.assert = function (condition, message) {
        totalTests++;
        if (!condition) {
            console.error(`❌ FAIL: ${message}`);
            failedTests++;
            throw new Error(message);
        } else {
            // console.log(`✅ PASS: ${message}`);
            passedTests++;
        }
    };

    global.assertEqual = function (actual, expected, message) {
        totalTests++;
        if (actual !== expected) {
            console.error(`❌ FAIL: ${message} (Expected ${expected}, got ${actual})`);
            failedTests++;
            throw new Error(`${message}: Expected ${expected}, got ${actual}`);
        } else {
            passedTests++;
        }
    }

    global.assertClose = (actual, expected, tolerance = 0.001, message) => {
        totalTests++;
        if (!Number.isFinite(actual) || !Number.isFinite(expected)) {
            failedTests++;
            console.error(`❌ FAIL: ${message}`);
            console.error(`   Expected: ${expected}`);
            console.error(`   Actual:   ${actual}`);
            throw new Error(message + ' (Non-finite value)');
        }
        if (Math.abs(actual - expected) > tolerance) {
            failedTests++;
            console.error(`❌ FAIL: ${message}`);
            console.error(`   Expected: ${expected} +/- ${tolerance}`);
            console.error(`   Actual:   ${actual}`);
            throw new Error(message);
        } else {
            passedTests++;
        }
    };

    for (const file of files) {
        console.log(`\n📂 Running ${file}...`);
        try {
            const filePath = path.join(__dirname, file);
            // Convert absolute path to file URL correctly for Windows
            const fileUrl = pathToFileURL(filePath).href;
            await import(fileUrl);
            console.log(`✅ ${file} completed.`);
        } catch (err) {
            console.error(`❌ ${file} failed:`);
            console.error(err);
            failedTests++; // Count file failure as a fail
        }
    }

    console.log('\n' + '='.repeat(40));
    console.log(`SUMMARY:`);
    console.log(`Total Assertions: ${totalTests}`);
    console.log(`Passed: ${passedTests}`);
    console.log(`Failed: ${failedTests}`);
    console.log('='.repeat(40));

    if (failedTests > 0) process.exit(1);
}

runTests().catch(e => {
    console.error(e);
    process.exit(1);
});
