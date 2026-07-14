import path from 'node:path';
import { fileURLToPath } from 'node:url';

const INSTRUMENTED_TESTS = new Set([
    'auto-optimize-worker-contract.test.mjs',
    'balance-expenses.test.mjs',
    'health-bucket.test.mjs',
    'scenarios.test.mjs',
    'simulator-3bucket-ui-e2e.test.mjs',
    'simulator-headless.test.mjs',
    'spending-planner.test.mjs',
    'transaction-quantization.test.mjs'
]);

function replaceHelper(source, name, replacement) {
    const declaration = new RegExp(
        `^function ${name}\\s*\\([^)]*\\)\\s*\\{[\\s\\S]*?^\\}`,
        'm'
    );
    return source.replace(declaration, replacement);
}

function instrumentAssertionCalls(source) {
    let instrumented = source.replace(
        /^import assert from ('node:assert(?:\/strict)?');$/m,
        'import nodeAssert from $1;\nconst assert = globalThis.__wrapExternalAssert(nodeAssert);'
    );
    instrumented = replaceHelper(
        instrumented,
        'assert',
        'function assert(condition, message) {\n    return globalThis.assert(condition, message);\n}'
    );
    instrumented = replaceHelper(
        instrumented,
        'assertEqual',
        'function assertEqual(actual, expected, message) {\n    return globalThis.assertEqual(actual, expected, message);\n}'
    );
    instrumented = replaceHelper(
        instrumented,
        'assertClose',
        'function assertClose(actual, expected, tolerance, message) {\n    return globalThis.assertClose(actual, expected, tolerance, message);\n}'
    );
    return instrumented;
}

function instrumentHeadlessSmoke(source) {
    return source.replace(
        /if \(!fullResult \|\| !fullResult\.portfolio\) \{\s*console\.error\(`❌ fullResult invalid in Year \$\{year\}:`, fullResult\);\s*throw new Error\("Simulation returned invalid result"\);\s*\}/,
        'globalThis.assert(fullResult?.portfolio, `Simulation year ${year} should return a portfolio`);'
    );
}

export async function load(url, context, nextLoad) {
    const loaded = await nextLoad(url, context);
    if (loaded.format !== 'module' || !url.startsWith('file:')) return loaded;

    const filename = path.basename(fileURLToPath(url));
    if (!INSTRUMENTED_TESTS.has(filename)) return loaded;

    const source = typeof loaded.source === 'string'
        ? loaded.source
        : Buffer.from(loaded.source).toString('utf8');
    const instrumented = instrumentAssertionCalls(
        filename === 'simulator-headless.test.mjs'
            ? instrumentHeadlessSmoke(source)
            : source
    );
    return {
        ...loaded,
        source: instrumented
    };
}
