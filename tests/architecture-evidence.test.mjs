import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
    EVIDENCE_PATHS,
    formatValidationReport,
    readEvidenceDocuments,
    validateEvidenceDocuments
} from '../scripts/check-architecture-evidence.mjs';

console.log('--- Architecture Evidence Contract Tests ---');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const validatorPath = path.join(repoRoot, 'scripts', 'check-architecture-evidence.mjs');
const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, 'package.json'), 'utf8'));
const validatorSource = fs.readFileSync(validatorPath, 'utf8');
const documents = readEvidenceDocuments(repoRoot);
const fixedToday = '2026-07-17';

function mutateDocument(sourceDocuments, relativePath, transform) {
    return {
        ...sourceDocuments,
        [relativePath]: transform(sourceDocuments[relativePath])
    };
}

function errorCodes(report) {
    return new Set(report.errors.map(error => error.code));
}

const baseline = validateEvidenceDocuments(documents, { today: fixedToday, repoRoot });
assert(baseline.ok, `repository evidence should satisfy the offline contract: ${formatValidationReport(baseline)}`);
assertEqual(baseline.counts.marketRecords, 69, 'validator should find exactly 69 MKT records');
assertEqual(baseline.counts.researchRecords, 55, 'validator should find exactly 55 FOR records');
assertEqual(baseline.counts.mapAnchors, 17, 'validator should find MAP-01 through MAP-17');
assertEqual(baseline.counts.marketReviewScopes, 11, 'every market record family should have one review scope');
assertEqual(baseline.counts.researchReviewScopes, 7, 'every research record family should have one review scope');

const repeated = validateEvidenceDocuments(documents, { today: fixedToday, repoRoot });
assertEqual(
    JSON.stringify(repeated),
    JSON.stringify(baseline),
    'identical inputs and check date should produce a deterministic report'
);

const duplicateMarketId = mutateDocument(documents, EVIDENCE_PATHS.market, content => content.replace(
    '<a id="mkt-bd-01"></a>MKT-BD-01',
    '<a id="mkt-pl-01"></a>MKT-PL-01'
));
const duplicateReport = validateEvidenceDocuments(duplicateMarketId, { today: fixedToday, repoRoot });
assert(
    errorCodes(duplicateReport).has('DUPLICATE_RECORD_ID') &&
        errorCodes(duplicateReport).has('DUPLICATE_ANCHOR'),
    'duplicate record IDs and explicit anchors should fail with stable error codes'
);

const emptyMarketField = mutateDocument(documents, EVIDENCE_PATHS.market, content => content.replace(
    '| <a id="mkt-pl-01"></a>MKT-PL-01 | P1 |',
    '| <a id="mkt-pl-01"></a>MKT-PL-01 |  |'
));
const emptyFieldReport = validateEvidenceDocuments(emptyMarketField, { today: fixedToday, repoRoot });
assert(
    errorCodes(emptyFieldReport).has('EMPTY_REQUIRED_FIELD'),
    'an empty evidence-table field should fail closed'
);

const invalidReviewDate = mutateDocument(documents, EVIDENCE_PATHS.market, content => content.replace(
    '| MKT-RS | Repository/bei Änderung, spätestens quartalsweise | 2026-07-17 | 2026-10-17 |',
    '| MKT-RS | Repository/bei Änderung, spätestens quartalsweise | 2026-07-17 | 2026-13-40 |'
));
const invalidDateReport = validateEvidenceDocuments(invalidReviewDate, { today: fixedToday, repoRoot });
assert(
    errorCodes(invalidDateReport).has('INVALID_NEXT_REVIEW_DATE'),
    'an invalid next-review date should fail with a clear date error'
);

const overdueReview = mutateDocument(documents, EVIDENCE_PATHS.market, content => content.replace(
    '| MKT-RS | Repository/bei Änderung, spätestens quartalsweise | 2026-07-17 | 2026-10-17 |',
    '| MKT-RS | Repository/bei Änderung, spätestens quartalsweise | 2026-07-15 | 2026-07-16 |'
));
const overdueReport = validateEvidenceDocuments(overdueReview, { today: fixedToday, repoRoot });
assert(
    errorCodes(overdueReport).has('OVERDUE_REVIEW_SCOPE'),
    'an overdue record scope should block the static gate'
);

const brokenLocalLink = mutateDocument(documents, EVIDENCE_PATHS.market, content => content.replace(
    '(ARCHITEKTUR_UND_FACHKONZEPT.md#marktvergleich)',
    '(DOES_NOT_EXIST.md#marktvergleich)'
));
const brokenLinkReport = validateEvidenceDocuments(brokenLocalLink, { today: fixedToday, repoRoot });
assert(
    errorCodes(brokenLinkReport).has('BROKEN_LOCAL_FILE_LINK'),
    'a missing local link target should block the static gate'
);

const brokenLocalAnchor = mutateDocument(documents, EVIDENCE_PATHS.market, content => content.replace(
    '(ARCHITEKTUR_UND_FACHKONZEPT.md#marktvergleich)',
    '(ARCHITEKTUR_UND_FACHKONZEPT.md#nicht-vorhandener-evidenzanker)'
));
const brokenAnchorReport = validateEvidenceDocuments(brokenLocalAnchor, { today: fixedToday, repoRoot });
assert(
    errorCodes(brokenAnchorReport).has('BROKEN_LOCAL_ANCHOR_LINK'),
    'a missing local anchor should block the static gate'
);

const missingReviewScope = mutateDocument(documents, EVIDENCE_PATHS.market, content => (
    content.split(/\r?\n/).filter(line => !line.startsWith('| MKT-RS |')).join('\n')
));
const missingScopeReport = validateEvidenceDocuments(missingReviewScope, { today: fixedToday, repoRoot });
assert(
    errorCodes(missingScopeReport).has('MISSING_REVIEW_SCOPE'),
    'records without exactly one update/review scope should fail closed'
);

const undefinedId = mutateDocument(documents, EVIDENCE_PATHS.research, content => (
    `${content}\nUnzulässiger Testverweis: FOR-NEW-01.\n`
));
const undefinedIdReport = validateEvidenceDocuments(undefinedId, { today: fixedToday, repoRoot });
assert(
    errorCodes(undefinedIdReport).has('UNDEFINED_EVIDENCE_ID'),
    'a referenced but undefined evidence ID should fail closed'
);

assertEqual(
    packageJson.scripts?.['docs:evidence'],
    'node scripts/check-architecture-evidence.mjs',
    'package.json should expose the focused offline evidence gate'
);
assert(
    !/from\s+['"]node:(?:http|https|net|dns)['"]/.test(validatorSource) &&
        !/\bfetch\s*\(/.test(validatorSource),
    'validator source should not import network modules or call fetch'
);

const overdueCli = spawnSync(
    process.execPath,
    [validatorPath, '--check-date', '2028-01-01'],
    { cwd: repoRoot, encoding: 'utf8' }
);
assertEqual(overdueCli.status, 1, 'CLI should exit non-zero when review scopes are overdue');
assert(
    `${overdueCli.stdout}${overdueCli.stderr}`.includes('[OVERDUE_REVIEW_SCOPE]'),
    'CLI failure should print the stable overdue-scope error code'
);

console.log('✅ Architecture evidence contract tests passed');
