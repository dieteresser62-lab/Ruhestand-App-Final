import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { HISTORICAL_DATA, HISTORICAL_DATA_MANIFEST } from '../app/simulator/simulator-data.js';
import {
    canonicalizeHistoricalContractValue,
    computeHistoricalDatasetHash,
    sha256Hex
} from '../app/simulator/historical-backtest-contract.js';

console.log('--- Backtest Data Validation Slice 14 Tests ---');

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repositoryRoot = path.join(__dirname, '..');
const validation = JSON.parse(fs.readFileSync(
    path.join(__dirname, 'fixtures', 'backtest-data-validation-slice-14-v1.json'),
    'utf8'
));

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

function runGit(args, { encoding = 'utf8', maxBuffer = 8 * 1024 * 1024 } = {}) {
    try {
        return {
            ok: true,
            value: execFileSync('git', args, { cwd: repositoryRoot, encoding, maxBuffer }),
            error: null
        };
    } catch (error) {
        return {
            ok: false,
            value: null,
            error: String(error?.stderr || error?.message || error).trim()
        };
    }
}

function readCommitFile(commit, repoPath) {
    const result = runGit(['show', `${commit}:${repoPath}`], { encoding: null });
    assert(result.ok, result.ok
        ? `Git source read succeeded for ${commit}:${repoPath}`
        : `Git source read must succeed for ${commit}:${repoPath}; ${result.error || 'unknown error'}`);
    return result.value;
}

function assertSha256(value, label) {
    assert(/^[0-9a-f]{64}$/.test(value), `${label} must be a lowercase SHA-256 value`);
}

function assertGitCommit(value, label) {
    assert(/^[0-9a-f]{40}$/.test(value), `${label} must be a full lowercase Git commit id`);
}

function isValidFlowDelta(value) {
    return Number.isFinite(value) && value < 1;
}

assertEqual(validation.schemaVersion, 'BacktestDataValidationSlice14V1',
    'Slice-14 validation fixture has the expected schema identity');
assertEqual(validation.status, 'captured_from_clean_slice_13_commit',
    'Slice-14 input explicitly identifies a clean Slice-13 capture');
assertGitCommit(validation.sourceCommit, 'Source commit');
assertEqual(validation.sourceTreeStatus, 'clean',
    'Final export evidence must come from a clean source tree');

const sourceCommitReachability = runGit(['cat-file', '-e', `${validation.sourceCommit}^{commit}`]);
assert(sourceCommitReachability.ok,
    sourceCommitReachability.ok
        ? 'Source commit is reachable before reading evidence'
        : `Source commit must be reachable before reading evidence; ${sourceCommitReachability.error || 'unknown error'}`);
const sourceCommitAncestry = runGit(['merge-base', '--is-ancestor', validation.sourceCommit, 'HEAD']);
assert(sourceCommitAncestry.ok,
    sourceCommitAncestry.ok
        ? 'Source commit is an ancestor of the current branch HEAD'
        : `Source commit must be an ancestor of the current branch HEAD; ${sourceCommitAncestry.error || 'not an ancestor'}`);
const unreachableCommitProbe = runGit(['rev-parse', '--verify', '--quiet', `${'0'.repeat(40)}^{commit}`]);
assert(!unreachableCommitProbe.ok,
    'Git failures are captured as structured results instead of aborting the test file');

const sourceResultDocumentBytes = readCommitFile(validation.sourceCommit, validation.sourceResultDocument.path);
const sourceIntegrationFixtureBytes = readCommitFile(validation.sourceCommit, validation.sourceIntegrationFixture.path);
assertEqual(sha256(sourceResultDocumentBytes), validation.sourceResultDocument.sha256,
    'Slice-13 result document is byte-identical to the declared input');
assertEqual(sha256(sourceIntegrationFixtureBytes), validation.sourceIntegrationFixture.sha256,
    'Slice-13 integration fixture is byte-identical to the declared input');
assertEqual(sha256(fs.readFileSync(path.join(repositoryRoot, validation.sourceResultDocument.path))),
    validation.sourceResultDocument.sha256,
    'Live Slice-13 result document remains byte-identical to the validated input');
assertEqual(sha256(fs.readFileSync(path.join(repositoryRoot, validation.sourceIntegrationFixture.path))),
    validation.sourceIntegrationFixture.sha256,
    'Live Slice-13 integration fixture remains byte-identical to the validated input');

const sourceResultDocument = sourceResultDocumentBytes.toString('utf8');
assert(sourceResultDocument.includes('# Slice 13 - Gesamtintegration und neue Referenz-Backtests'),
    'Input document identifies Slice 13');
assert(sourceResultDocument.includes('**Status:** freigegeben'),
    'Slice-13 input contains the external technical release decision');
assert(sourceResultDocument.includes('CR13-11'),
    'Slice-13 input retains the pre-commit neutrality-evidence finding');
assert(sourceResultDocument.includes('CR13-12'),
    'Slice-13 input retains the final-fingerprint pinning requirement');
assert(sourceResultDocument.includes('CR13-14'),
    'Slice-13 input retains the reference-window documentation requirement');

const integration = JSON.parse(sourceIntegrationFixtureBytes.toString('utf8'));
assertEqual(integration.schemaVersion, 'BacktestDataIntegrationSlice13V1',
    'Source integration fixture has the expected schema identity');
assertEqual(integration.referenceCases.length, validation.referenceCaseCount,
    'All declared Slice-13 reference cases are present');
assertEqual(integration.attributionEvidence.length, validation.attributionEvidenceCount,
    'All Slice-2-to-10 attribution evidence entries are present');
assertEqual(new Set(integration.referenceCases.map(entry => entry.id)).size,
    integration.referenceCases.length, 'Reference case identifiers are unique');

for (const referenceCase of integration.referenceCases) {
    const inclusiveYears = referenceCase.period.endYear - referenceCase.period.startYear + 1;
    assertEqual(referenceCase.period.requestedYears, inclusiveYears,
        `${referenceCase.id} uses an inclusive period length`);
    assertEqual(referenceCase.observedRowCount, inclusiveYears,
        `${referenceCase.id} emits one row per requested year`);
    assertEqual(referenceCase.outcome, 'completed', `${referenceCase.id} completes`);
    assert(Number.isFinite(referenceCase.summaryEndWealth), `${referenceCase.id} has finite end wealth`);
    assert(Number.isFinite(referenceCase.totalWithdrawal), `${referenceCase.id} has finite withdrawals`);
    assert(Number.isFinite(referenceCase.totalTax), `${referenceCase.id} has finite tax`);
    assert(isValidFlowDelta(referenceCase.maxAbsolutePortfolioFlowDelta),
        `${referenceCase.id} has finite absolute FlowDelta below one euro`);
    assertSha256(referenceCase.canonicalRowsHash, `${referenceCase.id} row hash`);
}
assert(!isValidFlowDelta(null), 'Null FlowDelta cannot pass the one-euro gate');
assert(isValidFlowDelta(0), 'Zero FlowDelta passes the finite one-euro gate');

for (const evidence of integration.attributionEvidence) {
    const evidenceBytes = readCommitFile(validation.sourceCommit, `tests/fixtures/${evidence.filename}`);
    assertEqual(sha256(evidenceBytes), evidence.sha256,
        `Slice ${evidence.slice} attribution evidence is byte-identical`);
}

assertEqual(integration.dataset.datasetId, validation.dataset.datasetId,
    'Dataset identity matches the clean Slice-13 capture');
assertEqual(integration.dataset.revision, validation.dataset.revision,
    'Dataset revision matches the clean Slice-13 capture');
assertEqual(integration.dataset.contentHash.value, validation.dataset.contentHash,
    'Dataset content hash matches the clean Slice-13 capture');
assertEqual(integration.dataset.manifestHash.value, validation.dataset.manifestHash,
    'Dataset manifest hash matches the clean Slice-13 capture');
assertEqual(HISTORICAL_DATA_MANIFEST.datasetId, validation.dataset.datasetId,
    'Live manifest dataset identity matches the Slice-14 evidence');
assertEqual(HISTORICAL_DATA_MANIFEST.revision, validation.dataset.revision,
    'Live manifest revision matches the Slice-14 evidence');
assertEqual(computeHistoricalDatasetHash(HISTORICAL_DATA), validation.dataset.contentHash,
    'Live historical rows recompute to the Slice-14 content hash');
assertEqual(HISTORICAL_DATA_MANIFEST.contentHash.value, validation.dataset.contentHash,
    'Live manifest content hash matches the recomputed Slice-14 content hash');
assertEqual(sha256Hex(canonicalizeHistoricalContractValue(HISTORICAL_DATA_MANIFEST)),
    validation.dataset.manifestHash,
    'Live canonical manifest recomputes to the Slice-14 manifest hash');

const integratedCase = integration.referenceCases.find(entry => entry.id === 'integrated_reference_2000_2025');
assert(integratedCase, 'The 2000-2025 integration case is present');
assertEqual(integratedCase.period.startYear, 2000, 'The final reference starts in 2000');
assertEqual(integratedCase.period.endYear, 2025, 'The final reference ends in 2025');
assertEqual(integratedCase.period.requestedYears, 26,
    'The final reference uses the inclusive 26-year period');
for (const key of [
    'outcome',
    'observedRowCount',
    'summaryEndWealth',
    'totalWithdrawal',
    'totalTax',
    'maxAbsolutePortfolioFlowDelta',
    'canonicalRowsHash'
]) {
    assertEqual(integratedCase[key], validation.finalExport[key],
        `Final export ${key} matches the Slice-13 integration result`);
}
assertEqual(validation.finalExport.period.inclusiveYears,
    validation.finalExport.period.endYear - validation.finalExport.period.startYear + 1,
    'Final export period length is internally consistent');
assertSha256(validation.finalExport.resultFingerprint, 'Final export fingerprint');
const fingerprintBasisPath = path.join(repositoryRoot, validation.fingerprintBasis.path);
const fingerprintBasisBytes = fs.readFileSync(fingerprintBasisPath);
assertEqual(sha256(fingerprintBasisBytes), validation.fingerprintBasis.sha256,
    'Stored fingerprint basis is byte-identical to its capture hash');
const fingerprintBasis = JSON.parse(fingerprintBasisBytes.toString('utf8'));
assertEqual(fingerprintBasis.request.engine.sourceCommit, validation.sourceCommit,
    'Fingerprint basis is bound to the validated Slice-13 commit');
assertEqual(fingerprintBasis.request.engine.sourceTreeStatus, 'clean',
    'Fingerprint basis contains the clean source-tree provenance');
assertEqual(fingerprintBasis.request.dataset.contentHash, validation.dataset.contentHash,
    'Fingerprint basis contains the validated dataset content hash');
assertEqual(fingerprintBasis.request.dataset.manifestHash.value, validation.dataset.manifestHash,
    'Fingerprint basis contains the validated manifest hash');
assertEqual(fingerprintBasis.result.period.startYear, validation.finalExport.period.startYear,
    'Fingerprint basis starts in the validated year');
assertEqual(fingerprintBasis.result.period.endYear, validation.finalExport.period.endYear,
    'Fingerprint basis ends in the validated year');
assertEqual(fingerprintBasis.result.rows.length, validation.finalExport.observedRowCount,
    'Fingerprint basis contains all validated annual rows');
assertEqual(Number(fingerprintBasis.result.summary.endWealth.toFixed(2)), validation.finalExport.summaryEndWealth,
    'Fingerprint basis end wealth rounds to the validated summary amount');
assertEqual(Number(fingerprintBasis.result.summary.totalWithdrawal.toFixed(2)), validation.finalExport.totalWithdrawal,
    'Fingerprint basis withdrawals round to the validated summary amount');
assertEqual(Number(fingerprintBasis.result.summary.totalTaxes.toFixed(2)), validation.finalExport.totalTax,
    'Fingerprint basis tax total rounds to the validated summary amount');
assertEqual(sha256Hex(canonicalizeHistoricalContractValue(fingerprintBasis)),
    validation.finalExport.resultFingerprint,
    'Clean Slice-13 result fingerprint is recomputed from the stored canonical basis');

assertEqual(integration.financialNeutralityEvidence.current.canonicalRowsHash,
    validation.finalExport.canonicalRowsHash,
    'Declared drift baseline points to the validated final row hash');
assertEqual(validation.financialNeutralityAssessment.status,
    'not_demonstrated_against_slice_12_commit',
    'Slice-14 does not claim unmeasured Slice-11-to-13 financial neutrality');
const slice12BaselineTest = readCommitFile(
    integration.financialNeutralityEvidence.baseline.sourceCommit,
    'tests/simulator-backtest-characterization.test.mjs'
).toString('utf8');
assert(!slice12BaselineTest.includes('integrated_reference_2000_2025'),
    'Slice-12 source commit confirms that the later integration case was not measured there');

console.log('✅ Backtest data validation Slice 14 tests passed');
