import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HISTORICAL_DATA, HISTORICAL_DATA_MANIFEST } from '../app/simulator/simulator-data.js';
import {
    canonicalizeHistoricalContractValue,
    computeHistoricalDatasetHash,
    sha256Hex
} from '../app/simulator/historical-backtest-contract.js';

console.log('--- Backtest Data Validation Slice 15 Tests ---');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.join(__dirname, '..');
function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

function readFile(filePath, label, encoding = null) {
    try {
        return fs.readFileSync(filePath, encoding);
    } catch (error) {
        assert(false, `${label} must be readable: ${error?.message || error}`);
        return null;
    }
}

function parseJson(bytes, label) {
    try {
        return JSON.parse(Buffer.isBuffer(bytes) ? bytes.toString('utf8') : bytes);
    } catch (error) {
        assert(false, `${label} must contain valid JSON: ${error?.message || error}`);
        return null;
    }
}

function runGit(args, { encoding = 'utf8' } = {}) {
    const result = spawnSync('git', args, {
        cwd: repositoryRoot,
        encoding,
        maxBuffer: 16 * 1024 * 1024,
        windowsHide: true
    });
    return {
        ok: result.status === 0,
        value: result.status === 0 ? result.stdout : null,
        error: String(result.stderr || result.error?.message || result.stdout || '').trim()
    };
}

function readCommitFile(commit, repoPath) {
    const result = runGit(['show', `${commit}:${repoPath}`], { encoding: null });
    assert(result.ok, result.ok
        ? `Git source read succeeded for ${commit}:${repoPath}`
        : `Git source read must succeed for ${commit}:${repoPath}; ${result.error || 'unknown error'}`);
    return result.value;
}

function assertSha256(value, label) {
    assert(/^[0-9a-f]{64}$/.test(value), `${label} is a lowercase SHA-256 value`);
}

const fixture = parseJson(readFile(
    path.join(__dirname, 'fixtures', 'backtest-data-validation-slice-15-v1.json'),
    'Slice-15 fixture'
), 'Slice-15 fixture');
const packageJson = parseJson(
    readFile(path.join(repositoryRoot, 'package.json'), 'package.json'),
    'package.json'
);

assertEqual(fixture.schemaVersion, 'BacktestDataValidationSlice15V1',
    'Slice-15 fixture has the expected schema identity');
assertEqual(fixture.status, 'derived_from_committed_slice_14_result',
    'Slice-15 fixture identifies the committed Slice-14 result as its input');
assert(/^[0-9a-f]{40}$/.test(fixture.sourceCommit),
    'Slice-15 source commit is a full lowercase Git commit id');
assertEqual(fixture.sourceTreeStatus, 'clean',
    'Slice-15 input was committed from a clean Slice-14 boundary');

const commitReachability = runGit(['cat-file', '-e', `${fixture.sourceCommit}^{commit}`]);
assert(commitReachability.ok, 'Slice-14 source commit is reachable');
const commitAncestry = runGit(['merge-base', '--is-ancestor', fixture.sourceCommit, 'HEAD']);
assert(commitAncestry.ok, 'Slice-14 source commit is an ancestor of the current branch');

for (const source of [
    fixture.sourceResultDocument,
    fixture.sourceValidationFixture,
    fixture.sourceValidationTest,
    fixture.sourceFingerprintBasis
]) {
    assertSha256(source.sha256, `${source.path} declared hash`);
    const committedBytes = readCommitFile(fixture.sourceCommit, source.path);
    assertEqual(sha256(committedBytes), source.sha256,
        `${source.path} matches the committed Slice-14 input bytes`);
    if (source !== fixture.sourceResultDocument) {
        assertEqual(sha256(readFile(path.join(repositoryRoot, source.path), source.path)), source.sha256,
            `${source.path} remains byte-identical in the live tree`);
    }
}

assertEqual(fixture.slice14PostCommitCorrections.documentPath,
    fixture.sourceResultDocument.path,
    'Slice-14 corrections identify the mutable predecessor document');
assertEqual(JSON.stringify(fixture.slice14PostCommitCorrections.completedFindings),
    JSON.stringify(['CR14-14', 'CR14-15']),
    'Slice-15 records both post-commit Slice-14 corrections');
assertEqual(fixture.slice14PostCommitCorrections.liveDocumentBinding,
    'mutable_not_byte_pinned',
    'Open Slice-14 findings can be advanced without rewriting the Slice-15 fixture');

const slice14Document = readCommitFile(
    fixture.sourceCommit,
    fixture.sourceResultDocument.path
).toString('utf8');
assert(slice14Document.includes('# Slice 14 - Validierung des Slice-13-Ergebnisses'),
    'Input document identifies Slice 14');
assert(slice14Document.includes('## Review-Ergebnis (Claude, Runde 2)'),
    'Input document contains the complete external round-two review');
assert(slice14Document.includes('- Status: freigegeben'),
    'Input document contains the external release decision');
for (const finding of ['CR14-10', 'CR14-11', 'CR14-12', 'CR14-13', 'CR14-16', 'CR13-11']) {
    assert(slice14Document.includes(finding), `Input document retains ${finding}`);
}

const slice14Validation = parseJson(readCommitFile(
    fixture.sourceCommit,
    fixture.sourceValidationFixture.path
), 'Committed Slice-14 validation fixture');
assertEqual(slice14Validation.schemaVersion, 'BacktestDataValidationSlice14V1',
    'Slice-15 consumes the typed Slice-14 validation result');
for (const key of ['datasetId', 'revision', 'contentHash', 'manifestHash']) {
    assertEqual(slice14Validation.dataset[key], fixture.dataset[key],
        `Dataset ${key} is inherited from the Slice-14 result`);
}
assertEqual(slice14Validation.finalExport.period.startYear, fixture.finalExport.startYear,
    'Final export start year is inherited from Slice 14');
assertEqual(slice14Validation.finalExport.period.endYear, fixture.finalExport.endYear,
    'Final export end year is inherited from Slice 14');
for (const key of [
    'observedRowCount',
    'summaryEndWealth',
    'totalWithdrawal',
    'totalTax',
    'maxAbsolutePortfolioFlowDelta',
    'canonicalRowsHash',
    'resultFingerprint'
]) {
    assertEqual(slice14Validation.finalExport[key], fixture.finalExport[key],
        `Final export ${key} is inherited from the Slice-14 result`);
}
assertEqual(fixture.finalExport.inclusiveYears,
    fixture.finalExport.endYear - fixture.finalExport.startYear + 1,
    'Slice-15 preserves the inclusive 26-year period');
assertEqual(fixture.finalExport.observedRowCount, fixture.finalExport.inclusiveYears,
    'Slice-15 preserves one annual row per requested year');

assertEqual(HISTORICAL_DATA_MANIFEST.datasetId, fixture.dataset.datasetId,
    'Live historical manifest retains the validated dataset identity');
assertEqual(HISTORICAL_DATA_MANIFEST.revision, fixture.dataset.revision,
    'Live historical manifest retains the validated revision');
assertEqual(computeHistoricalDatasetHash(HISTORICAL_DATA), fixture.dataset.contentHash,
    'Live historical records reconstruct the validated content hash');
assertEqual(sha256Hex(canonicalizeHistoricalContractValue(HISTORICAL_DATA_MANIFEST)),
    fixture.dataset.manifestHash,
    'Live historical manifest reconstructs the validated manifest hash');

const fingerprintBasis = parseJson(readFile(
    path.join(repositoryRoot, fixture.sourceFingerprintBasis.path),
    'Live Slice-14 fingerprint basis'
), 'Live Slice-14 fingerprint basis');
assertEqual(sha256Hex(canonicalizeHistoricalContractValue(fingerprintBasis)),
    fixture.finalExport.resultFingerprint,
    'Slice-14 result fingerprint is recomputed from the byte-bound live canonical basis');
assertEqual(fingerprintBasis.result.rows.length, fixture.finalExport.observedRowCount,
    'Committed fingerprint basis contains all 26 annual rows');
assertEqual(Number(fingerprintBasis.result.summary.endWealth.toFixed(2)),
    fixture.finalExport.summaryEndWealth,
    'Committed fingerprint basis reconstructs the rounded end wealth');
assertEqual(Number(fingerprintBasis.result.summary.totalWithdrawal.toFixed(2)),
    fixture.finalExport.totalWithdrawal,
    'Committed fingerprint basis reconstructs the rounded withdrawals');
assertEqual(Number(fingerprintBasis.result.summary.totalTaxes.toFixed(2)),
    fixture.finalExport.totalTax,
    'Committed fingerprint basis reconstructs the rounded taxes');

assertEqual(fixture.reconstructionGates.length, 7,
    'All seven historical reconstruction gates are inventoried');
for (const gate of fixture.reconstructionGates) {
    assert(!Object.hasOwn(gate, 'expectedOutput'),
        `${gate.packageScript} does not carry an unverified decorative output witness`);
    const expectedPackageCommand = `node ${gate.scriptPath} --verify-only`;
    assertEqual(packageJson.scripts[gate.packageScript], expectedPackageCommand,
        `${gate.packageScript} remains wired to the declared read-only builder`);
    const existingGateSource = readFile(
        path.join(repositoryRoot, gate.existingGate),
        `${gate.packageScript} existing reconstruction gate`,
        'utf8'
    );
    assert(existingGateSource.includes(path.basename(gate.scriptPath)),
        `${gate.packageScript} is executed by its existing reconstruction gate`);
    assert(existingGateSource.includes('spawnSync') && existingGateSource.includes('--verify-only'),
        `${gate.packageScript} existing gate uses a caught verify-only process boundary`);
}

assertEqual(fixture.sourceIntegrity.mode, 'git_binary_exact_bytes_v1',
    'Slice-15 preserves downloaded original-source bytes through Git binary attributes');
const gitAttributes = readFile(
    path.join(repositoryRoot, '.gitattributes'),
    '.gitattributes',
    'utf8'
);
assertEqual(fixture.sourceIntegrity.originals.length, 7,
    'All seven line-ending-sensitive original sources are inventoried');
assertEqual(fixture.sourceIntegrity.commitRequirement.policy,
    'external_review_then_atomic_commit',
    'The source-integrity policy requires external review before the atomic commit');
for (const source of fixture.sourceIntegrity.originals) {
    assertSha256(source.sha256, `${source.path} exact-byte hash`);
    assertEqual(sha256(readFile(path.join(repositoryRoot, source.path), source.path)), source.sha256,
        `${source.path} retains its pinned exact bytes`);
    assert(gitAttributes.includes(`${source.path} binary`),
        `${source.path} is exempt from Git line-ending conversion`);
    const attributes = runGit(['check-attr', 'binary', 'text', 'diff', '--', source.path]);
    assert(attributes.ok
        && attributes.value.includes('binary: set')
        && attributes.value.includes('text: unset')
        && attributes.value.includes('diff: unset'),
    `${source.path} resolves to Git binary semantics`);
    const filteredBlob = runGit(['hash-object', `--path=${source.path}`, source.path]);
    const rawBlob = runGit(['hash-object', '--no-filters', source.path]);
    assert(filteredBlob.ok && rawBlob.ok,
        `${source.path} candidate Git blob hashes are readable`);
    assertEqual(String(filteredBlob.value).trim(), String(rawBlob.value).trim(),
        `${source.path} will be committed without line-ending conversion`);
}

const binaryContractLines = fixture.sourceIntegrity.originals
    .map((source) => `${source.path} binary`);
const headAttributes = readCommitFile('HEAD', '.gitattributes').toString('utf8');
const headContainsBinaryContract = binaryContractLines
    .every((line) => headAttributes.includes(line));
if (headContainsBinaryContract) {
    for (const source of fixture.sourceIntegrity.originals) {
        const committedBytes = readCommitFile('HEAD', source.path);
        assertEqual(sha256(committedBytes), source.sha256,
            `${source.path} HEAD blob retains the pinned exact bytes`);
    }
} else {
    const requiredCandidatePaths = [
        '.gitattributes',
        ...fixture.sourceIntegrity.originals.map((source) => source.path)
    ];
    const changedPaths = runGit(['diff', '--name-only', 'HEAD', '--', ...requiredCandidatePaths]);
    assert(changedPaths.ok,
        'Pre-commit source-integrity candidate paths are readable from Git');
    const changedPathSet = new Set(String(changedPaths.value || '')
        .split(/\r?\n/u)
        .filter(Boolean));
    for (const candidatePath of requiredCandidatePaths) {
        assert(changedPathSet.has(candidatePath),
            `${candidatePath} is part of the joint pre-commit source-integrity candidate`);
    }
    console.log('ℹ️ Slice-15 source integrity is in the documented pre-commit state; '
        + 'HEAD blob assertions become mandatory once the binary contract is committed.');
}

assertEqual(slice14Validation.financialNeutralityAssessment.status,
    'not_demonstrated_against_slice_12_commit',
    'Slice-14 input does not claim an unmeasured Slice-12 neutrality result');
assertEqual(fixture.financialNeutralityAssessment.status,
    'not_demonstrated_against_slice_12_commit',
    'Slice-15 preserves the open financial-neutrality evidence boundary');

assertEqual(fixture.evidenceAdvancementProcedure.status, 'documented_not_machine_enforced',
    'Evidence advancement is accurately labelled as a documented procedure');
assertEqual(
    JSON.stringify(fixture.evidenceAdvancementProcedure.requiredSuccessorElements),
    JSON.stringify(['new_source_commit', 'new_basis_file', 'new_schema_version', 'external_review']),
    'Evidence advancement documents all required successor elements'
);
assert(fixture.evidenceAdvancementProcedure.knownLimitation.includes('cannot prove'),
    'Evidence advancement states that external review cannot be machine-proven');
assertEqual(fixture.claimBoundary,
    'repository_reconstruction_not_external_scientific_validation',
    'Slice-15 states the repository-only validation boundary');

console.log('✅ Backtest data validation Slice 15 tests passed');
