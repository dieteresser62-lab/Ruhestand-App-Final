import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';
import {
    buildCoverageSummary,
    coverageUrlToPath,
    REQUIRED_COVERAGE_FILE_GATES,
    validateCoverageFileGates
} from './coverage-report.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const coverageReportPath = path.join(__dirname, 'coverage-report.mjs');

function createTempWorkspace() {
    const root = fs.mkdtempSync(path.join(os.tmpdir(), 'ruhestand-coverage repo '));
    const coverageDir = path.join(root, '.coverage', 'v8');
    fs.mkdirSync(coverageDir, { recursive: true });
    return { root, coverageDir, summaryPath: path.join(root, '.coverage', 'summary.json') };
}

function cleanup(dir) {
    fs.rmSync(dir, { recursive: true, force: true });
}

function writeProjectFile(root, relativePath, source) {
    const fullPath = path.join(root, relativePath);
    fs.mkdirSync(path.dirname(fullPath), { recursive: true });
    fs.writeFileSync(fullPath, source, 'utf8');
    return fullPath;
}

function makeCoverageEntry(filePath, source, count = 1) {
    return {
        url: pathToFileURL(filePath).href,
        source,
        functions: [
            {
                functionName: 'coveredByFixture',
                ranges: [
                    { startOffset: 0, endOffset: source.length, count }
                ]
            }
        ]
    };
}

function writeCoveragePayload(coverageDir, result) {
    fs.writeFileSync(
        path.join(coverageDir, 'coverage-1.json'),
        JSON.stringify({ result }, null, 2),
        'utf8'
    );
}

function runCoverageReport(env) {
    return spawnSync(process.execPath, [coverageReportPath], {
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

console.log('--- Coverage Report Contract Tests ---');

{
    const workspace = createTempWorkspace();
    try {
        const appSource = 'export function appValue() {\n  return 1;\n}\n';
        const engineSource = 'export function engineValue() {\n  return 2;\n}\n';
        const workerSource = 'export function workerValue() {\n  return 3;\n}\n';
        const typesSource = 'export const PROFILE_KIND = "gold";\n';
        const zeroExecutableSource = 'export const STRATEGY_OPTIONS = [];\n';

        const appFile = writeProjectFile(workspace.root, 'app/module with space.js', appSource);
        const engineFile = writeProjectFile(workspace.root, 'engine/core.mjs', engineSource);
        const workerFile = writeProjectFile(workspace.root, 'workers/worker.js', workerSource);
        const typesFile = writeProjectFile(workspace.root, 'types/profile-types.js', typesSource);
        const zeroExecutableFile = writeProjectFile(workspace.root, 'types/strategy-options.js', zeroExecutableSource);

        writeCoveragePayload(workspace.coverageDir, [
            { url: 'node:internal/modules/esm/loader', functions: [] },
            { url: 'http://example.test/remote.js', functions: [] },
            { url: '', functions: [] },
            makeCoverageEntry(appFile, appSource, 1),
            makeCoverageEntry(engineFile, engineSource, 1),
            makeCoverageEntry(workerFile, workerSource, 0),
            makeCoverageEntry(typesFile, typesSource, 1),
            { url: pathToFileURL(zeroExecutableFile).href, source: zeroExecutableSource, functions: [] }
        ]);

        const { files, summary } = buildCoverageSummary({
            repoRoot: workspace.root,
            coverageDir: workspace.coverageDir,
            summaryPath: workspace.summaryPath
        });
        const coveredFiles = files.map(row => row.file).sort();

        assert(coveredFiles.includes('app/module with space.js'), 'Coverage should include app files with spaces');
        assert(coveredFiles.includes('engine/core.mjs'), 'Coverage should include engine files');
        assert(coveredFiles.includes('workers/worker.js'), 'Coverage should include worker files');
        assert(coveredFiles.includes('types/profile-types.js'), 'Coverage should include types files');
        assert(coveredFiles.includes('types/strategy-options.js'), 'Coverage should keep zero-executable project files visible');
        assertEqual(summary.files.length, 5, 'Coverage summary should contain five project files');
        assert(summary.total.executableLines > 0, 'Coverage summary should count executable project lines');
        assert(summary.total.coveragePct < 100, 'Coverage summary should not report 100 percent when one file is uncovered');
        const zeroExecutableSummary = summary.files.find(row => row.file === 'types/strategy-options.js');
        assertEqual(zeroExecutableSummary.coveragePct, null, 'Zero-executable project files should not report NaN or 100 percent');
    } finally {
        cleanup(workspace.root);
    }
}

{
    assertEqual(REQUIRED_COVERAGE_FILE_GATES.length, 2, 'Slice 12 should define two mandatory file coverage gates');
    const passingSummary = {
        files: REQUIRED_COVERAGE_FILE_GATES.map(gate => ({
            file: gate.file,
            coveragePct: gate.minimumPct
        }))
    };
    const passingGate = validateCoverageFileGates(passingSummary);
    assert(passingGate.ok, 'Coverage file gates should accept values exactly at their minimum');
    assertEqual(passingGate.metric, 'approximate executable-line coverage from V8 ranges', 'Coverage gate should name the measured V8 metric without overstating statement coverage');

    const belowMinimum = validateCoverageFileGates({
        files: [
            { file: REQUIRED_COVERAGE_FILE_GATES[0].file, coveragePct: 49.99 },
            { file: REQUIRED_COVERAGE_FILE_GATES[1].file, coveragePct: 100 }
        ]
    });
    assert(!belowMinimum.ok && belowMinimum.failures[0].includes('below 50.00%'), 'Coverage file gates should fail below the configured minimum');

    const missingFile = validateCoverageFileGates({ files: [] });
    assert(!missingFile.ok && missingFile.failures.every(message => message.includes('missing')), 'Coverage file gates should fail closed when a required file is absent');
}

{
    const workspace = createTempWorkspace();
    try {
        const source = [
            'export function branch(value) {',
            '  if (value) {',
            '    return "hit";',
            '  }',
            '  return "miss";',
            '}',
            ''
        ].join('\n');
        const file = writeProjectFile(workspace.root, 'engine/branch.mjs', source);
        const missedStart = source.indexOf('  return "miss";');
        const missedEnd = missedStart + '  return "miss";'.length;

        writeCoveragePayload(workspace.coverageDir, [
            {
                url: pathToFileURL(file).href,
                source,
                functions: [
                    {
                        functionName: 'branch',
                        ranges: [
                            { startOffset: 0, endOffset: source.length, count: 1 },
                            { startOffset: missedStart, endOffset: missedEnd, count: 0 }
                        ]
                    }
                ]
            }
        ]);

        const { summary } = buildCoverageSummary({
            repoRoot: workspace.root,
            coverageDir: workspace.coverageDir,
            summaryPath: workspace.summaryPath
        });
        const branchSummary = summary.files.find(row => row.file === 'engine/branch.mjs');

        assert(branchSummary.coveragePct < 100, 'Nested count:0 V8 ranges should keep unplayed branches uncovered');
        assert(
            branchSummary.coveredLines < branchSummary.executableLines,
            'Nested count:0 V8 ranges should reduce covered line count'
        );
    } finally {
        cleanup(workspace.root);
    }
}

{
    const workspace = createTempWorkspace();
    try {
        writeCoveragePayload(workspace.coverageDir, [
            { url: 'node:internal/modules/esm/loader', functions: [] },
            { url: 'http://example.test/remote.js', functions: [] }
        ]);

        const result = runCoverageReport({
            COVERAGE_REPO_ROOT: workspace.root,
            COVERAGE_V8_DIR: workspace.coverageDir,
            COVERAGE_SUMMARY_PATH: workspace.summaryPath
        });
        const output = combinedOutput(result);

        assertEqual(result.status, 1, 'Coverage report with zero project files should exit 1');
        assert(output.includes('No project coverage data found'), 'Empty coverage report should explain missing project data');
        assert(!fs.existsSync(workspace.summaryPath), 'Empty coverage report should not write a success summary');
    } finally {
        cleanup(workspace.root);
    }
}

{
    const workspace = createTempWorkspace();
    try {
        const fileWithSpace = writeProjectFile(workspace.root, 'app/path with space.js', 'export const value = 1;\n');
        assertEqual(
            coverageUrlToPath(pathToFileURL(fileWithSpace).href),
            fileWithSpace,
            'coverageUrlToPath should preserve Windows/local paths with spaces'
        );

        assertEqual(coverageUrlToPath('node:fs'), null, 'coverageUrlToPath should skip node: URLs');
        assertEqual(coverageUrlToPath('http://example.test/file.js'), null, 'coverageUrlToPath should skip http: URLs');
        assertEqual(coverageUrlToPath(''), null, 'coverageUrlToPath should skip empty URLs');

        if (process.platform === 'win32') {
            assert(
                coverageUrlToPath('file://server/share/app/file.js').startsWith('\\\\server\\share\\'),
                'coverageUrlToPath should support UNC file URLs on Windows'
            );
        } else {
            let rejectedNonLocalUnc = false;
            try {
                coverageUrlToPath('file://server/share/app/file.js');
            } catch {
                rejectedNonLocalUnc = true;
            }
            assert(rejectedNonLocalUnc, 'coverageUrlToPath should surface unsupported UNC file URLs on non-Windows platforms');
        }
    } finally {
        cleanup(workspace.root);
    }
}

console.log('Coverage report contract tests passed');
