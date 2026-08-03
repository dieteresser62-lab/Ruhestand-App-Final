import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SOURCE_COMMIT = '2e4867f5fa1817a050fd06029b3298b10342764e';
const START_MARKER = '__SLICE09_D17_SOURCE_START__';
const END_MARKER = '__SLICE09_D17_SOURCE_END__';
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const fixturePath = path.join(repoRoot, 'tests', 'fixtures', 'minimum-flex-slice-09-added-case-financial-v1.json');
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ruhestandsapp-slice09-d17-'));
const archivePath = path.join(tempRoot, 'slice09.zip');
const sourceRoot = path.join(tempRoot, 'source');
const windowsTarPath = path.join(process.env.SystemRoot || 'C:\\Windows', 'System32', 'tar.exe');

function run(command, args, options = {}) {
    const result = spawnSync(command, args, {
        cwd: repoRoot,
        encoding: 'utf8',
        windowsHide: true,
        ...options
    });
    if (result.error || result.status !== 0) {
        const detail = [result.error?.message, result.stdout, result.stderr].filter(Boolean).join('\n');
        throw new Error(`${command} failed with exit code ${String(result.status)}.\n${detail}`);
    }
    return result;
}

function extractPayload(output) {
    const start = output.indexOf(START_MARKER);
    const end = output.indexOf(END_MARKER);
    if (start < 0 || end <= start) throw new Error('Archived Slice-09 probe did not emit the D-17 source markers.');
    return JSON.parse(output.slice(start + START_MARKER.length, end).trim());
}

function canonicalize(value) {
    if (Array.isArray(value)) return value.map(canonicalize);
    if (value && typeof value === 'object') {
        return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonicalize(value[key])]));
    }
    return value;
}

try {
    fs.mkdirSync(sourceRoot);
    run('git', ['archive', '--format=zip', `--output=${archivePath}`, SOURCE_COMMIT]);
    if (!path.isAbsolute(windowsTarPath) || !fs.existsSync(windowsTarPath)) {
        throw new Error(`Windows bsdtar is unavailable at the pinned path: ${windowsTarPath}`);
    }
    run(windowsTarPath, ['-xf', archivePath, '-C', sourceRoot]);

    const characterizationPath = path.join(sourceRoot, 'tests', 'simulator-backtest-characterization.test.mjs');
    const source = fs.readFileSync(characterizationPath, 'utf8');
    const insertionPoint = '    const ruin = runScenario({';
    if (!source.includes(insertionPoint)) throw new Error('Slice-09 characterization probe insertion point is missing.');
    const probe = `    if (process.env.PRINT_D17_SOURCE === '1') {
        console.log('${START_MARKER}');
        console.log(stableStringify({
            schemaVersion: 'MinimumFlexSlice09AddedCaseFinancialV1',
            sourceCommit: '${SOURCE_COMMIT}',
            case: {
                id: minimumFlexD17.id,
                outcomeObservation: minimumFlexD17.outcomeObservation,
                summaryEndWealth: minimumFlexD17.values.summaryEndWealth,
                totalWithdrawal: minimumFlexD17.values.totalWithdrawal,
                totalTax: minimumFlexD17.values.totalTax,
                maxAbsolutePortfolioFlowDelta: minimumFlexD17.values.maxAbsolutePortfolioFlowDelta
            }
        }, 2));
        console.log('${END_MARKER}');
        process.exit(0);
    }
`;
    fs.writeFileSync(characterizationPath, source.replace(insertionPoint, `${probe}\n${insertionPoint}`), 'utf8');

    const probeRun = run(process.execPath, ['tests/run-single.mjs', 'tests/simulator-backtest-characterization.test.mjs'], {
        cwd: sourceRoot,
        env: { ...process.env, PRINT_D17_SOURCE: '1' }
    });
    const actual = extractPayload(probeRun.stdout);
    const expectedFixture = JSON.parse(fs.readFileSync(fixturePath, 'utf8'));
    const expected = {
        schemaVersion: expectedFixture.schemaVersion,
        sourceCommit: expectedFixture.sourceCommit,
        case: expectedFixture.case
    };
    if (JSON.stringify(canonicalize(actual)) !== JSON.stringify(canonicalize(expected))) {
        throw new Error(`Slice-09 D-17 reconstruction differs from the fixture.\nExpected: ${JSON.stringify(expected)}\nActual: ${JSON.stringify(actual)}`);
    }
    console.log(JSON.stringify(actual, null, 2));
    console.log('Slice-09 D-17 source reconstruction passed.');
} finally {
    const resolvedTemp = path.resolve(tempRoot);
    const resolvedOsTemp = path.resolve(os.tmpdir());
    if (resolvedTemp.startsWith(`${resolvedOsTemp}${path.sep}`)
        && path.basename(resolvedTemp).startsWith('ruhestandsapp-slice09-d17-')) {
        fs.rmSync(resolvedTemp, { recursive: true, force: false });
    }
}
