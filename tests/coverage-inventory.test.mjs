import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {
    buildCoverageInventory,
    extractImports,
    writeCoverageInventory
} from './coverage-inventory.mjs';

function createTempWorkspace() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ruhestand-inventory repo '));
    fs.mkdirSync(path.join(root, 'tests'), { recursive: true });
    return root;
}

function cleanup(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

function writeFile(root, relativePath, source) {
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, source, 'utf8');
}

function writeCoverageSummary(root, files) {
    const summaryPath = path.join(root, '.coverage', 'summary.json');
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(
        summaryPath,
        JSON.stringify({
            generatedAt: '2026-06-12T08:00:00.000Z',
            total: {
                executableLines: files.reduce((sum, row) => sum + row.executableLines, 0),
                coveredLines: files.reduce((sum, row) => sum + row.coveredLines, 0),
                coveragePct: 50
            },
            files
        }, null, 2),
        'utf8'
    );
    return summaryPath;
}

function byFile(inventory, file) {
    return inventory.files.find(row => row.file === file);
}

console.log('--- Coverage Inventory Contract Tests ---');

{
    const importKeyword = 'im' + 'port';
    const dynamicIdentifierImport = 'await im' + 'port(moduleUrl);';
    const imports = extractImports([
        "import alpha from './alpha.js';",
        "import './side-effect.js';",
        "export { beta } from './beta.mjs';",
        `await ${importKeyword}('./dynamic.js?cache=1');`,
        `await ${importKeyword}(\`./templated.js?cache=\${Date.now()}\`);`,
        dynamicIdentifierImport
    ].join('\n'));

    assert(imports.imports.includes('./alpha.js'), 'extractImports should detect default imports');
    assert(imports.imports.includes('./side-effect.js'), 'extractImports should detect side-effect imports');
    assert(imports.imports.includes('./beta.mjs'), 'extractImports should detect re-exports');
    assert(imports.imports.includes('./dynamic.js?cache=1'), 'extractImports should detect literal dynamic imports');
    assert(imports.imports.includes('./templated.js?cache='), 'extractImports should detect template dynamic imports with static path prefix');
    assert(
        imports.unresolvedDynamic.some(expression => expression === 'moduleUrl'),
        'extractImports should mark identifier dynamic imports as unresolved'
    );
}

{
    const root = createTempWorkspace();
    try {
        const importKeyword = 'im' + 'port';
        const dynamicIdentifierImport = 'await im' + 'port(moduleUrl);';
        writeFile(root, 'tests/direct.test.mjs', [
            "import '../engine/core.mjs';",
            `await ${importKeyword}('../app/balance/balance-main.js?smoke=1');`,
            dynamicIdentifierImport
        ].join('\n'));
        writeFile(root, 'engine/core.mjs', `
            import '../engine/tax-settlement.mjs';
            export function run() { return settleTax(); }
        `);
        writeFile(root, 'engine/tax-settlement.mjs', `
            export function settleTax() { return 1; }
        `);
        writeFile(root, 'app/balance/balance-main.js', `
            import './balance-renderer.js';
            export const boot = true;
        `);
        writeFile(root, 'app/balance/balance-renderer.js', `
            export function render() { return 'ok'; }
        `);
        writeFile(root, 'app/simulator/simulator-main-init.js', `
            export function initSimulatorMain() { return true; }
        `);
        writeFile(root, 'app/shared/persistence-facade.js', `
            export const storageContract = true;
        `);
        writeFile(root, 'app/tranches/tranchen-price-service.js', `
            export async function fetchPrice() { return null; }
        `);
        writeFile(root, 'workers/mc-worker.js', `
            export function onmessage() {}
        `);
        writeFile(root, 'types/profile-types.js', `
            export const PROFILE = 'default';
        `);
        writeFile(root, 'types/strategy-options.js', `
            export const OPTIONS = [];
        `);

        const coverageSummaryPath = writeCoverageSummary(root, [
            {
                file: 'engine/core.mjs',
                executableLines: 2,
                coveredLines: 2,
                coveragePct: 100
            },
            {
                file: 'app/balance/balance-main.js',
                executableLines: 2,
                coveredLines: 1,
                coveragePct: 50
            },
            {
                file: 'workers/mc-worker.js',
                executableLines: 1,
                coveredLines: 0,
                coveragePct: 0
            },
            {
                file: 'types/strategy-options.js',
                executableLines: 0,
                coveredLines: 0,
                coveragePct: null
            }
        ]);

        const inventory = buildCoverageInventory({ repoRoot: root, coverageSummaryPath });

        assertEqual(inventory.summary.totalFiles, 10, 'Inventory should list every source file from all roots');
        assertEqual(inventory.testFileCount, 1, 'Inventory should count .test.mjs files');
        assertEqual(byFile(inventory, 'engine/core.mjs').testReachability, 'direct', 'Static test imports should be direct');
        assertEqual(byFile(inventory, 'engine/tax-settlement.mjs').testReachability, 'transitive', 'Source imports should be transitive');
        assertEqual(byFile(inventory, 'app/balance/balance-main.js').testReachability, 'direct', 'Literal dynamic imports should be direct');
        assertEqual(byFile(inventory, 'app/balance/balance-renderer.js').testReachability, 'transitive', 'Transitive imports from dynamic entry should be tracked');
        assertEqual(byFile(inventory, 'app/shared/persistence-facade.js').coverageStatus, 'not-loaded', 'Unreachable files should be explicit not-loaded rows');
        assertEqual(byFile(inventory, 'workers/mc-worker.js').coverageStatus, 'runtime-loaded-uncovered', 'Runtime-loaded uncovered files should be visible');
        assertEqual(byFile(inventory, 'types/strategy-options.js').coverageStatus, 'runtime-loaded-zero-executable', 'Zero-executable files should stay visible');
        assertEqual(byFile(inventory, 'engine/tax-settlement.mjs').class, 'critical-core', 'Tax modules should be critical-core');
        assertEqual(byFile(inventory, 'app/shared/persistence-facade.js').class, 'critical-core', 'Persistence contracts should be critical-core');
        assertEqual(byFile(inventory, 'app/tranches/tranchen-price-service.js').class, 'live-io', 'Price service should be live-io');
        assertEqual(byFile(inventory, 'app/balance/balance-main.js').class, 'ui-entry', 'Main modules should be ui-entry');
        assertEqual(byFile(inventory, 'app/simulator/simulator-main-init.js').class, 'ui-entry', 'Compound simulator-main modules should be ui-entry');
        assertEqual(byFile(inventory, 'workers/mc-worker.js').class, 'worker-entry', 'Workers should be worker-entry');
        assert(
            inventory.unresolvedDynamicImports.some(row => row.expression === 'moduleUrl'),
            'Unresolved dynamic imports should be documented'
        );

        const inventoryPath = path.join(root, '.coverage', 'inventory.json');
        const written = writeCoverageInventory({ repoRoot: root, coverageSummaryPath, inventoryPath });
        assert(fs.existsSync(inventoryPath), 'writeCoverageInventory should write inventory JSON');
        assertEqual(written.inventory.files.length, inventory.files.length, 'Written inventory should match in-memory inventory');
    } finally {
        cleanup(root);
    }
}

console.log('Coverage inventory contract tests passed');
