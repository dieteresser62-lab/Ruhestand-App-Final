import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultRepoRoot = path.resolve(__dirname, '..');
const defaultCoverageSummaryPath = path.join(defaultRepoRoot, '.coverage', 'summary.json');
const defaultInventoryPath = path.join(defaultRepoRoot, '.coverage', 'inventory.json');

const sourceRoots = ['app', 'engine', 'workers', 'types'];
const sourceExt = new Set(['.js', '.mjs', '.cjs']);

function toRelative(repoRoot, filePath) {
    return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function isInside(base, target) {
    const rel = path.relative(base, target);
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

function stripImportSuffix(specifier) {
    return specifier.replace(/[?#].*$/, '');
}

function withoutComments(source) {
    return source
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/(^|[^:])\/\/.*$/gm, '$1');
}

function readJsonIfExists(filePath) {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function walkFiles(root) {
    if (!fs.existsSync(root)) return [];
    const result = [];
    for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
        const fullPath = path.join(root, entry.name);
        if (entry.isDirectory()) {
            result.push(...walkFiles(fullPath));
        } else if (entry.isFile() && sourceExt.has(path.extname(entry.name))) {
            result.push(fullPath);
        }
    }
    return result;
}

export function collectSourceFiles(repoRoot = defaultRepoRoot) {
    return sourceRoots
        .flatMap(root => walkFiles(path.join(repoRoot, root)))
        .map(filePath => toRelative(repoRoot, filePath))
        .sort((a, b) => a.localeCompare(b, 'en'));
}

function resolveRelativeSpecifier({ repoRoot, importerRel, specifier }) {
    if (!specifier.startsWith('.')) return null;
    const importerPath = path.join(repoRoot, importerRel);
    const basePath = path.resolve(path.dirname(importerPath), stripImportSuffix(specifier));
    const candidates = [
        basePath,
        ...[...sourceExt].map(ext => `${basePath}${ext}`),
        ...[...sourceExt].map(ext => path.join(basePath, `index${ext}`))
    ];
    for (const candidate of candidates) {
        if (!isInside(repoRoot, candidate)) continue;
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
            return toRelative(repoRoot, candidate);
        }
    }
    return null;
}

export function extractImports(source) {
    const clean = withoutComments(source);
    const imports = [];
    const unresolvedDynamic = [];
    const patterns = [
        /\bimport\s+(?:[^'"]*?\s+from\s+)?['"]([^'"]+)['"]/g,
        /\bexport\s+[^'"]*?\s+from\s+['"]([^'"]+)['"]/g,
        /\bimport\s*\(\s*['"]([^'"]+)['"]\s*\)/g,
        /\bimport\s*\(\s*`([^`$]+)\$\{/g
    ];

    for (const pattern of patterns) {
        for (const match of clean.matchAll(pattern)) {
            imports.push(match[1]);
        }
    }

    for (const match of clean.matchAll(/\bimport\s*\(\s*([^)]+?)\s*\)/g)) {
        const expression = match[1].trim();
        if (!/^['"][^'"]+['"]$/.test(expression)) {
            unresolvedDynamic.push(expression);
        }
    }

    return { imports, unresolvedDynamic };
}

function collectImportGraph({ repoRoot, sourceFiles }) {
    const sourceSet = new Set(sourceFiles);
    const graph = new Map();

    for (const file of sourceFiles) {
        const source = fs.readFileSync(path.join(repoRoot, file), 'utf8');
        const { imports } = extractImports(source);
        const resolved = imports
            .map(specifier => resolveRelativeSpecifier({ repoRoot, importerRel: file, specifier }))
            .filter(target => target && sourceSet.has(target));
        graph.set(file, [...new Set(resolved)].sort((a, b) => a.localeCompare(b, 'en')));
    }

    return graph;
}

function collectTestEntrypoints({ repoRoot, sourceFiles }) {
    const sourceSet = new Set(sourceFiles);
    const testsDir = path.join(repoRoot, 'tests');
    const testFiles = fs.existsSync(testsDir)
        ? fs.readdirSync(testsDir)
            .filter(file => file.endsWith('.test.mjs'))
            .map(file => `tests/${file}`)
            .sort((a, b) => a.localeCompare(b, 'en'))
        : [];

    const direct = new Map();
    const unresolvedDynamicImports = [];

    for (const testFile of testFiles) {
        const source = fs.readFileSync(path.join(repoRoot, testFile), 'utf8');
        const { imports, unresolvedDynamic } = extractImports(source);
        const resolved = imports
            .map(specifier => resolveRelativeSpecifier({ repoRoot, importerRel: testFile, specifier }))
            .filter(target => target && sourceSet.has(target));

        for (const target of new Set(resolved)) {
            if (!direct.has(target)) direct.set(target, []);
            direct.get(target).push(testFile);
        }

        for (const expression of unresolvedDynamic) {
            unresolvedDynamicImports.push({ testFile, expression });
        }
    }

    for (const [target, importers] of direct.entries()) {
        direct.set(target, importers.sort((a, b) => a.localeCompare(b, 'en')));
    }

    return { testFiles, direct, unresolvedDynamicImports };
}

function traverseReachable(graph, roots) {
    const reachable = new Set();
    const stack = [...roots];
    while (stack.length > 0) {
        const file = stack.pop();
        if (reachable.has(file)) continue;
        reachable.add(file);
        for (const next of graph.get(file) || []) {
            if (!reachable.has(next)) stack.push(next);
        }
    }
    return reachable;
}

function loadCoverageByFile(summaryPath) {
    const summary = readJsonIfExists(summaryPath);
    const byFile = new Map();
    for (const row of summary?.files || []) {
        if (typeof row?.file === 'string') byFile.set(row.file, row);
    }
    return { summary, byFile };
}

function classifyModule(file) {
    if (file.startsWith('workers/')) return 'worker-entry';
    if (file === 'engine/index.mjs' || file === 'engine/core.mjs') return 'critical-core';
    if (file.startsWith('engine/')) return 'critical-core';
    if (file.startsWith('types/')) return 'critical-core';
    if (file.includes('/persistence-') || file.includes('/profile-') || file.includes('profile-')) return 'critical-core';
    if (file.includes('tax') || file.includes('transaction')) return 'critical-core';
    if (file.includes('price-service') || file.includes('marketdata') || file.includes('cape')) return 'live-io';
    if (file.endsWith('-main.js') || file.includes('/simulator-main') || file.includes('/balance-binder') || file.includes('/tranchen-manager-page')) return 'ui-entry';
    if (file.includes('-ui') || file.includes('-renderer') || file.includes('-modal') || file.includes('-dom') || file.includes('-tabs')) return 'ui-entry';
    return 'deterministic-app';
}

function buildCoverageStatus({ file, coverage, direct, transitive }) {
    if (coverage) {
        if (coverage.executableLines === 0) return 'runtime-loaded-zero-executable';
        if (coverage.coveredLines > 0) return 'runtime-covered';
        return 'runtime-loaded-uncovered';
    }
    if (direct) return 'direct-test-import-no-runtime-coverage';
    if (transitive) return 'transitive-static-import-no-runtime-coverage';
    return 'not-loaded';
}

function summarize(files) {
    const byClass = {};
    const byCoverageStatus = {};
    for (const file of files) {
        byClass[file.class] = (byClass[file.class] || 0) + 1;
        byCoverageStatus[file.coverageStatus] = (byCoverageStatus[file.coverageStatus] || 0) + 1;
    }
    return {
        totalFiles: files.length,
        byClass,
        byCoverageStatus
    };
}

export function buildCoverageInventory({
    repoRoot = defaultRepoRoot,
    coverageSummaryPath = defaultCoverageSummaryPath
} = {}) {
    const sourceFiles = collectSourceFiles(repoRoot);
    const graph = collectImportGraph({ repoRoot, sourceFiles });
    const { testFiles, direct, unresolvedDynamicImports } = collectTestEntrypoints({ repoRoot, sourceFiles });
    const reachable = traverseReachable(graph, direct.keys());
    const { summary: coverageSummary, byFile: coverageByFile } = loadCoverageByFile(coverageSummaryPath);

    const files = sourceFiles.map(file => {
        const coverage = coverageByFile.get(file) || null;
        const isDirect = direct.has(file);
        const isTransitive = reachable.has(file) && !isDirect;
        return {
            file,
            class: classifyModule(file),
            coverageStatus: buildCoverageStatus({
                file,
                coverage,
                direct: isDirect,
                transitive: isTransitive
            }),
            testReachability: isDirect ? 'direct' : (isTransitive ? 'transitive' : 'none'),
            directTestImporters: direct.get(file) || [],
            imports: graph.get(file) || [],
            executableLines: coverage?.executableLines ?? null,
            coveredLines: coverage?.coveredLines ?? null,
            coveragePct: coverage?.coveragePct ?? null,
            exclusionReason: null
        };
    });

    const inventory = {
        generatedAt: new Date().toISOString(),
        sourceRoots,
        coverageSummaryPath: fs.existsSync(coverageSummaryPath)
            ? toRelative(repoRoot, coverageSummaryPath)
            : null,
        coverageGeneratedAt: coverageSummary?.generatedAt || null,
        testFileCount: testFiles.length,
        summary: summarize(files),
        unresolvedDynamicImports,
        files
    };

    return inventory;
}

function printInventory(inventory, inventoryPath, repoRoot) {
    console.log('\nCoverage inventory');
    console.log(`Files: ${inventory.summary.totalFiles}`);
    console.log(`Test files: ${inventory.testFileCount}`);
    console.log('By coverage status:');
    for (const [status, count] of Object.entries(inventory.summary.byCoverageStatus)) {
        console.log(`- ${status}: ${count}`);
    }
    const notLoaded = inventory.files.filter(file => file.coverageStatus === 'not-loaded');
    console.log(`Not loaded: ${notLoaded.length}`);
    for (const row of notLoaded.slice(0, 15)) {
        console.log(`- ${row.file} [${row.class}]`);
    }
    console.log(`\nWrote ${toRelative(repoRoot, inventoryPath)}`);
}

export function writeCoverageInventory({
    repoRoot = defaultRepoRoot,
    coverageSummaryPath = defaultCoverageSummaryPath,
    inventoryPath = defaultInventoryPath
} = {}) {
    const inventory = buildCoverageInventory({ repoRoot, coverageSummaryPath });
    fs.mkdirSync(path.dirname(inventoryPath), { recursive: true });
    fs.writeFileSync(inventoryPath, JSON.stringify(inventory, null, 2), 'utf8');
    return { inventory, inventoryPath, repoRoot };
}

export function main() {
    const result = writeCoverageInventory();
    printInventory(result.inventory, result.inventoryPath, result.repoRoot);
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
    try {
        main();
    } catch (error) {
        console.error('Coverage inventory failed:', error?.message || error);
        process.exit(1);
    }
}
