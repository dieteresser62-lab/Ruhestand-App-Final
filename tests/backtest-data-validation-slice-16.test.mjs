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

console.log('--- Backtest Data Validation Slice 16 Tests ---');

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

function isLineEndingSensitiveOriginal(bytes) {
    return !bytes.includes(0) && (bytes.includes(10) || bytes.includes(13));
}

function normalizedPathList(value) {
    return String(value || '').trim().split(/\r?\n/).filter(Boolean).sort();
}

function findNamedYamlStep(source, name) {
    const lines = String(source || '').split(/\r?\n/);
    const namePattern = new RegExp(`^(\\s*)-\\s+name:\\s*${name}\\s*$`);
    const start = lines.findIndex((line) => namePattern.test(line));
    if (start < 0) return null;
    const indent = lines[start].match(namePattern)?.[1]?.length ?? 0;
    let end = lines.length;
    for (let index = start + 1; index < lines.length; index += 1) {
        if (new RegExp(`^\\s{${indent}}-\\s+`).test(lines[index])) {
            end = index;
            break;
        }
    }
    return { indent, lines: lines.slice(start, end) };
}

function yamlStepHasCheckoutHistoryContract(step) {
    if (!step) return false;
    const propertyIndent = ' '.repeat(step.indent + 2);
    const childIndent = ' '.repeat(step.indent + 4);
    const usesCheckout = step.lines.some((line) =>
        line === `${propertyIndent}uses: actions/checkout@v4`
    );
    const withIndex = step.lines.findIndex((line) => line === `${propertyIndent}with:`);
    if (!usesCheckout || withIndex < 0) return false;
    for (let index = withIndex + 1; index < step.lines.length; index += 1) {
        const line = step.lines[index];
        if (line.startsWith(propertyIndent) && !line.startsWith(childIndent)) break;
        if (line === `${childIndent}fetch-depth: 0`) return true;
    }
    return false;
}

function gitHistoryDiagnostic() {
    const shallow = runGit(['rev-parse', '--is-shallow-repository']);
    if (shallow.ok && String(shallow.value).trim() === 'true') {
        return 'repository is shallow; fetch full history or configure actions/checkout with fetch-depth: 0';
    }
    return 'required evidence commit is missing or not connected to this checkout';
}

const fixture = parseJson(readFile(
    path.join(__dirname, 'fixtures', 'backtest-data-validation-slice-16-v1.json'),
    'Slice-16 fixture'
), 'Slice-16 fixture');

assertEqual(fixture.schemaVersion, 'BacktestDataValidationSlice16V1',
    'Slice-16 fixture has the expected schema identity');
assertEqual(fixture.status, 'derived_from_committed_slice_15_result',
    'Slice-16 fixture identifies the committed Slice-15 result as its input');
assert(/^[0-9a-f]{40}$/.test(fixture.sourceCommit),
    'Slice-16 source commit is a full lowercase Git commit id');
assert(/^[0-9a-f]{40}$/.test(fixture.sourceParentCommit),
    'Slice-16 source parent is a full lowercase Git commit id');
assertEqual(fixture.sourceTreeStatus, 'clean',
    'Slice-16 input was committed from a clean Slice-15 boundary');

const commitReachability = runGit(['cat-file', '-e', `${fixture.sourceCommit}^{commit}`]);
assert(commitReachability.ok,
    `Slice-15 source commit is reachable; ${commitReachability.ok ? 'history available' : gitHistoryDiagnostic()}`);
const parentReachability = runGit(['cat-file', '-e', `${fixture.sourceParentCommit}^{commit}`]);
assert(parentReachability.ok,
    `Slice-15 parent commit is reachable; ${parentReachability.ok ? 'history available' : gitHistoryDiagnostic()}`);
const actualParent = runGit(['rev-parse', `${fixture.sourceCommit}^`]);
assert(actualParent.ok, `Slice-15 source parent must be readable; ${actualParent.error}`);
assertEqual(String(actualParent.value).trim(), fixture.sourceParentCommit,
    'Slice-15 source commit has the declared parent');
const commitAncestry = runGit(['merge-base', '--is-ancestor', fixture.sourceCommit, 'HEAD']);
assert(commitAncestry.ok, 'Slice-15 source commit is an ancestor of the current branch');

const ciWorkflow = readFile(
    path.join(repositoryRoot, fixture.ciCheckoutContract.workflowPath),
    'CI workflow',
    'utf8'
);
assertEqual(fixture.ciCheckoutContract.historyMode,
    'full_history_required_for_commit_bound_evidence',
    'Slice-16 declares the full-history prerequisite for commit-bound evidence');
const checkoutStep = findNamedYamlStep(ciWorkflow, 'Checkout');
assert(checkoutStep !== null, 'CI workflow contains the named Checkout step');
assert(yamlStepHasCheckoutHistoryContract(checkoutStep),
    'CI checkout provides the predecessor history required by Slice 14-16');
assert(!yamlStepHasCheckoutHistoryContract(findNamedYamlStep(`steps:
  - name: Checkout
    uses: actions/checkout@v4
  - name: Setup Node.js
    uses: actions/setup-node@v4
    with:
      fetch-depth: 0
`, 'Checkout')),
    'A fetch-depth value on another action cannot satisfy the checkout history contract');
assert(yamlStepHasCheckoutHistoryContract(findNamedYamlStep(`steps:
  - name: Checkout
    uses: actions/checkout@v4
    with:
      fetch-depth: 0
`, 'Checkout')),
    'The checkout history parser accepts the exact intended step structure');

for (const source of [
    fixture.sourceResultDocument,
    fixture.sourceValidationFixture,
    fixture.sourceValidationTest
]) {
    assertSha256(source.sha256, `${source.path} declared hash`);
    const committedBytes = readCommitFile(fixture.sourceCommit, source.path);
    assertEqual(sha256(committedBytes), source.sha256,
        `${source.path} matches the committed Slice-15 input bytes`);
    const liveBytes = readFile(path.join(repositoryRoot, source.path), source.path);
    assertEqual(sha256(liveBytes), source.sha256,
        `${source.path} remains byte-identical in the live tree`);
}

const slice15Document = readCommitFile(
    fixture.sourceCommit,
    fixture.sourceResultDocument.path
).toString('utf8');
assert(slice15Document.includes('# Slice 15 - Datenpruefung des Slice-14-Ergebnisses'),
    'Input document identifies Slice 15');
assert(slice15Document.includes('## Review-Feedback von Claude (Runde 3)'),
    'Input document contains the complete external round-three review');
assert(slice15Document.includes('- Status: freigegeben unter einer Auflage'),
    'Input document contains the external conditional release decision');
for (const finding of ['CR15-13', 'CR15-14', 'CR15-15', 'CR13-11']) {
    assert(slice15Document.includes(finding), `Input document retains ${finding}`);
}

const slice15Validation = parseJson(readCommitFile(
    fixture.sourceCommit,
    fixture.sourceValidationFixture.path
), 'Committed Slice-15 validation fixture');
assertEqual(slice15Validation.schemaVersion, 'BacktestDataValidationSlice15V1',
    'Slice-16 consumes the typed Slice-15 validation result');
for (const key of ['datasetId', 'revision', 'contentHash', 'manifestHash']) {
    assertEqual(slice15Validation.dataset[key], fixture.dataset[key],
        `Dataset ${key} is inherited from the Slice-15 result`);
}
for (const key of [
    'startYear',
    'endYear',
    'inclusiveYears',
    'observedRowCount',
    'summaryEndWealth',
    'totalWithdrawal',
    'totalTax',
    'maxAbsolutePortfolioFlowDelta',
    'canonicalRowsHash',
    'resultFingerprint'
]) {
    assertEqual(slice15Validation.finalExport[key], fixture.finalExport[key],
        `Final export ${key} is inherited from the Slice-15 result`);
}
assertEqual(fixture.finalExport.inclusiveYears,
    fixture.finalExport.endYear - fixture.finalExport.startYear + 1,
    'Slice-16 preserves the inclusive 26-year period');
assertEqual(fixture.finalExport.observedRowCount, fixture.finalExport.inclusiveYears,
    'Slice-16 preserves one annual row per requested year');
assert(fixture.finalExport.maxAbsolutePortfolioFlowDelta < 1,
    'Slice-16 preserves FlowDelta below one euro');

const commitPathsResult = runGit([
    'diff-tree', '--no-commit-id', '--name-only', '-r', fixture.sourceCommit
]);
assert(commitPathsResult.ok, `Slice-15 commit paths must be readable; ${commitPathsResult.error}`);
const commitPaths = new Set(normalizedPathList(commitPathsResult.value));
const binaryContractPaths = [
    fixture.atomicBinaryContract.attributesPath,
    ...fixture.atomicBinaryContract.originals.map((entry) => entry.path)
];
assertEqual(fixture.atomicBinaryContract.mode, 'same_commit_exact_bytes_v1',
    'Slice-16 requires the atomic exact-byte contract');
for (const contractPath of binaryContractPaths) {
    assert(commitPaths.has(contractPath), `${contractPath} is part of the Slice-15 commit`);
}

const committedOriginalInventory = runGit([
    'ls-tree', '-r', '--name-only', fixture.sourceCommit, '--', 'data/historical', 'data/static'
]);
assert(committedOriginalInventory.ok,
    `Committed original-source inventory must be readable; ${committedOriginalInventory.error}`);
const committedTextOriginals = normalizedPathList(committedOriginalInventory.value)
    .filter((repoPath) => repoPath.includes('/originals/'))
    .filter((repoPath) => isLineEndingSensitiveOriginal(
        readCommitFile(fixture.sourceCommit, repoPath)
    ));
const liveOriginalInventory = runGit([
    'ls-files', 'data/historical/*/originals/*', 'data/static/*/originals/*'
]);
assert(liveOriginalInventory.ok,
    `Live original-source inventory must be readable; ${liveOriginalInventory.error}`);
const liveTextOriginals = normalizedPathList(liveOriginalInventory.value)
    .filter((repoPath) => isLineEndingSensitiveOriginal(
        readFile(path.join(repositoryRoot, repoPath), repoPath)
    ));
const declaredOriginals = fixture.atomicBinaryContract.originals
    .map((entry) => entry.path)
    .sort();
assertEqual(JSON.stringify(committedTextOriginals), JSON.stringify(declaredOriginals),
    'Committed binary contract exactly covers every line-ending-sensitive original');
assertEqual(JSON.stringify(liveTextOriginals), JSON.stringify(declaredOriginals),
    'Live binary contract exactly covers every line-ending-sensitive original');

assertSha256(fixture.atomicBinaryContract.attributesSha256, '.gitattributes declared hash');
const committedAttributes = readCommitFile(
    fixture.sourceCommit,
    fixture.atomicBinaryContract.attributesPath
);
assertEqual(sha256(committedAttributes), fixture.atomicBinaryContract.attributesSha256,
    '.gitattributes matches the committed Slice-15 bytes');
assertEqual(sha256(readFile(path.join(repositoryRoot, '.gitattributes'), '.gitattributes')),
    fixture.atomicBinaryContract.attributesSha256,
    '.gitattributes remains byte-identical in the live tree');
const attributesText = committedAttributes.toString('utf8');
for (const original of fixture.atomicBinaryContract.originals) {
    assertSha256(original.sha256, `${original.path} declared hash`);
    assert(attributesText.includes(`${original.path} binary`),
        `${original.path} has committed Git binary semantics`);
    const committedBytes = readCommitFile(fixture.sourceCommit, original.path);
    assertEqual(sha256(committedBytes), original.sha256,
        `${original.path} committed blob retains the pinned exact bytes`);
    const liveBytes = readFile(path.join(repositoryRoot, original.path), original.path);
    assertEqual(sha256(liveBytes), original.sha256,
        `${original.path} live bytes retain the pinned exact bytes`);
}

assertEqual(HISTORICAL_DATA_MANIFEST.datasetId, fixture.dataset.datasetId,
    'Live historical manifest retains the validated dataset identity');
assertEqual(HISTORICAL_DATA_MANIFEST.revision, fixture.dataset.revision,
    'Live historical manifest retains the validated revision');
assertEqual(computeHistoricalDatasetHash(HISTORICAL_DATA), fixture.dataset.contentHash,
    'Live historical records reconstruct the validated content hash');
assertEqual(sha256Hex(canonicalizeHistoricalContractValue(HISTORICAL_DATA_MANIFEST)),
    fixture.dataset.manifestHash,
    'Live historical manifest reconstructs the validated manifest hash');

assertSha256(fixture.sourceFingerprintBasis.sha256,
    `${fixture.sourceFingerprintBasis.path} declared hash`);
const fingerprintBasisBytes = readCommitFile(
    fixture.sourceCommit,
    fixture.sourceFingerprintBasis.path
);
assertEqual(sha256(fingerprintBasisBytes), fixture.sourceFingerprintBasis.sha256,
    'Canonical fingerprint basis matches the committed input bytes');
const fingerprintBasis = parseJson(fingerprintBasisBytes, 'Committed fingerprint basis');
assertEqual(sha256Hex(canonicalizeHistoricalContractValue(fingerprintBasis)),
    fixture.finalExport.resultFingerprint,
    'Committed canonical basis is self-consistent with the archived result fingerprint');
assertEqual(fingerprintBasis.result.rows.length, fixture.finalExport.observedRowCount,
    'Committed fingerprint basis contains all 26 annual rows');
assertEqual(Number(fingerprintBasis.result.summary.endWealth.toFixed(2)),
    fixture.finalExport.summaryEndWealth,
    'Committed fingerprint basis reconstructs rounded end wealth');
assertEqual(Number(fingerprintBasis.result.summary.totalWithdrawal.toFixed(2)),
    fixture.finalExport.totalWithdrawal,
    'Committed fingerprint basis reconstructs rounded withdrawals');
assertEqual(Number(fingerprintBasis.result.summary.totalTaxes.toFixed(2)),
    fixture.finalExport.totalTax,
    'Committed fingerprint basis reconstructs rounded taxes');

assertEqual(fixture.resultEvidence.resultFingerprint,
    'archived_canonical_basis_self_consistency_not_live_run',
    'Slice-16 does not mislabel the archived fingerprint as a live engine result');
assertEqual(fixture.resultEvidence.canonicalRowsHash,
    'validated_by_independent_characterization_gate_not_reexecuted_here',
    'Slice-16 does not claim its own live row-hash execution or source binding');

assertEqual(fixture.financialNeutralityAssessment.status,
    slice15Validation.financialNeutralityAssessment.status,
    'Slice-16 preserves the open Slice-12 financial-neutrality boundary');
assertEqual(fixture.claimBoundary, slice15Validation.claimBoundary,
    'Slice-16 preserves the repository-only validation boundary');

console.log('✅ Backtest data validation Slice 16 tests passed');
