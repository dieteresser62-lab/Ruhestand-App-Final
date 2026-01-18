// Minimaler Test-Runner für den Household-Test
import { pathToFileURL } from 'node:url';

console.log('🚀 Running Household Withdrawal Modes Test...\n');

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

try {
    const testPath = '/mnt/c/Users/Diete/Sync/DE_Privat/Rente/ChatGPT CLI/RuhestandsApp/tests/household-withdrawal-modes.test.mjs';
    const fileUrl = pathToFileURL(testPath).href;
    await import(fileUrl);
    console.log(`\n✅ Test completed successfully.`);
} catch (err) {
    console.error(`\n❌ Test failed:`);
    console.error(err);
    failedTests++;
}

console.log(`\n📊 Test Summary:`);
console.log(`   Total Tests: ${totalTests}`);
console.log(`   Passed: ${passedTests}`);
console.log(`   Failed: ${failedTests}`);

if (failedTests > 0) {
    process.exit(1);
}
