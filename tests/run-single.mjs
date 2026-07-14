import path from 'node:path';
import { register } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { getTestExecutionPolicy, installAssertionGlobals } from './run-tests.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const testFile = process.argv[2];
if (!testFile) {
    console.error('Please provide a test file path (e.g. tests/engine-adapter-parity.test.mjs)');
    process.exit(1);
}

async function run() {
    const counters = installAssertionGlobals({ verbosePasses: true });

    try {
        const resolvedPath = path.resolve(testFile);
        const policy = getTestExecutionPolicy(path.basename(resolvedPath));
        if (policy.instrumentAssertions) {
            register(pathToFileURL(path.join(__dirname, 'legacy-assertion-loader.mjs')).href);
        }
        const fileUrl = pathToFileURL(resolvedPath).href;
        console.log(`Running ${testFile}...`);
        await import(fileUrl);
        const failedFiles = counters.total === 0 ? 1 : 0;
        if (failedFiles > 0) {
            console.error(`${path.basename(resolvedPath)} completed with zero assertions.`);
        }
        console.log('\n' + '='.repeat(40));
        console.log('SINGLE TEST SUMMARY:');
        console.log(`Total Assertions: ${counters.total}`);
        console.log(`Passed: ${counters.passed}`);
        console.log(`Failed Assertions: ${counters.failedAssertions}`);
        console.log(`Failed Files: ${failedFiles}`);
        console.log('='.repeat(40));
        process.exit(counters.failedAssertions > 0 || failedFiles > 0 ? 1 : 0);
    } catch (error) {
        const isAssertionFailure = error?.isTestAssertionError === true;
        console.error(error?.stack || error);
        console.log('\n' + '='.repeat(40));
        console.log('SINGLE TEST SUMMARY:');
        console.log(`Total Assertions: ${counters.total}`);
        console.log(`Passed: ${counters.passed}`);
        console.log(`Failed Assertions: ${counters.failedAssertions}`);
        console.log(`Failed Files: ${isAssertionFailure ? 0 : 1}`);
        console.log('='.repeat(40));
        process.exit(1);
    }
}

run();
