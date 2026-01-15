
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const testFile = process.argv[2];
if (!testFile) {
    console.error("Please provide a test file path (e.g. tests/engine-adapter-parity.test.mjs)");
    process.exit(1);
}

// Global Assert Shim
global.assert = function (condition, message) {
    if (!condition) {
        console.error(`❌ FAIL: ${message}`);
        process.exit(1);
    } else {
        console.log(`✅ PASS: ${message}`);
    }
};
global.assertEqual = function (actual, expected, message) {
    if (actual !== expected) {
        console.error(`❌ FAIL: ${message} (Expected ${expected}, got ${actual})`);
        process.exit(1);
    }
    console.log(`✅ PASS: ${message}`);
};
global.assertClose = (actual, expected, tolerance = 0.001, message) => {
    if (Math.abs(actual - expected) > tolerance) {
        console.error(`❌ FAIL: ${message} (Expected ${expected} +/- ${tolerance}, got ${actual})`);
        process.exit(1);
    }
    console.log(`✅ PASS: ${message}`);
};

async function run() {
    try {
        const fileUrl = pathToFileURL(path.resolve(testFile)).href;
        console.log(`Running ${testFile}...`);
        await import(fileUrl);
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

run();
