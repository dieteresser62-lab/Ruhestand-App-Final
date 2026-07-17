import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export const REPO_ROOT = path.resolve(__dirname, '..');
export const EVIDENCE_PATHS = Object.freeze({
    market: 'docs/reference/MARKTVERGLEICH_EVIDENZREGISTER.md',
    research: 'docs/reference/FORSCHUNGSABGLEICH_EVIDENZREGISTER.md',
    main: 'docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md'
});

const RECORD_SPECS = Object.freeze({
    market: Object.freeze({ prefix: 'MKT-', expected: 69, columns: 7 }),
    research: Object.freeze({ prefix: 'FOR-', expected: 55, columns: 4 })
});

function normalizeRelativePath(value) {
    return value.split(path.sep).join('/');
}

function createError(code, message, file, line = null) {
    return { code, file, line, message };
}

function compareErrors(left, right) {
    return (
        left.file.localeCompare(right.file, 'en') ||
        (left.line ?? 0) - (right.line ?? 0) ||
        left.code.localeCompare(right.code, 'en') ||
        left.message.localeCompare(right.message, 'de')
    );
}

function parseMarkdownRow(line) {
    const trimmed = line.trim();
    if (!trimmed.startsWith('|') || !trimmed.endsWith('|')) return null;
    return trimmed.slice(1, -1).split('|').map(cell => cell.trim());
}

function parseIsoDate(value) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const [year, month, day] = value.split('-').map(Number);
    const parsed = new Date(Date.UTC(year, month - 1, day));
    if (
        parsed.getUTCFullYear() !== year ||
        parsed.getUTCMonth() !== month - 1 ||
        parsed.getUTCDate() !== day
    ) {
        return null;
    }
    return value;
}

function markdownHeadingSlug(heading) {
    return heading
        .replace(/<[^>]*>/g, '')
        .replace(/[`*_~]/g, '')
        .trim()
        .toLocaleLowerCase('de-DE')
        .replace(/[^\p{L}\p{N}\s_-]/gu, '')
        .replace(/\s+/g, '-');
}

function collectAnchors(content) {
    const anchors = [];
    const headingCounts = new Map();
    const lines = content.split(/\r?\n/);

    for (let index = 0; index < lines.length; index++) {
        const line = lines[index];
        for (const match of line.matchAll(/<a\s+id="([^"]+)"\s*><\/a>/g)) {
            anchors.push({ id: match[1], line: index + 1, explicit: true });
        }

        const headingMatch = line.match(/^#{1,6}\s+(.+?)\s*#*\s*$/);
        if (!headingMatch) continue;
        const baseSlug = markdownHeadingSlug(headingMatch[1]);
        if (!baseSlug) continue;
        const occurrence = headingCounts.get(baseSlug) || 0;
        headingCounts.set(baseSlug, occurrence + 1);
        anchors.push({
            id: occurrence === 0 ? baseSlug : `${baseSlug}-${occurrence}`,
            line: index + 1,
            explicit: false
        });
    }

    return anchors;
}

function parseRecordRows(content, spec) {
    const rows = [];
    const lines = content.split(/\r?\n/);
    const idPattern = spec.prefix === 'MKT-'
        ? /^(MKT-[A-Z]+-\d{2})$/
        : /^(FOR-[A-Z]+-\d{2})$/;

    for (let index = 0; index < lines.length; index++) {
        const cells = parseMarkdownRow(lines[index]);
        if (!cells?.[0]) continue;
        const firstCell = cells[0];
        const definitionMatch = firstCell.match(
            /^<a\s+id="([^"]+)"\s*><\/a>([A-Z]+-[A-Z]+-\d{2})$/
        );
        if (!definitionMatch || !idPattern.test(definitionMatch[2])) continue;
        rows.push({
            anchor: definitionMatch[1],
            id: definitionMatch[2],
            cells,
            line: index + 1
        });
    }
    return rows;
}

function parseScheduleRows(content) {
    const rows = [];
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
        const cells = parseMarkdownRow(lines[index]);
        if (!cells || !/^(?:MKT|FOR)-[A-Z]+$/.test(cells[0] || '')) continue;
        rows.push({
            scope: cells[0],
            cells,
            line: index + 1
        });
    }
    return rows;
}

function validateRecords({ content, file, spec, errors }) {
    const rows = parseRecordRows(content, spec);
    const byId = new Map();

    for (const row of rows) {
        const existing = byId.get(row.id);
        if (existing) {
            errors.push(createError(
                'DUPLICATE_RECORD_ID',
                `${row.id} is already defined on line ${existing.line}.`,
                file,
                row.line
            ));
        } else {
            byId.set(row.id, row);
        }

        if (row.anchor !== row.id.toLowerCase()) {
            errors.push(createError(
                'RECORD_ANCHOR_MISMATCH',
                `${row.id} must use the explicit anchor ${row.id.toLowerCase()}, got ${row.anchor}.`,
                file,
                row.line
            ));
        }
        if (row.cells.length !== spec.columns) {
            errors.push(createError(
                'RECORD_COLUMN_COUNT',
                `${row.id} must contain ${spec.columns} table cells, got ${row.cells.length}.`,
                file,
                row.line
            ));
        }
        row.cells.forEach((cell, columnIndex) => {
            if (cell.length === 0) {
                errors.push(createError(
                    'EMPTY_REQUIRED_FIELD',
                    `${row.id} has an empty required field in column ${columnIndex + 1}.`,
                    file,
                    row.line
                ));
            }
        });
    }

    if (byId.size !== spec.expected) {
        errors.push(createError(
            'RECORD_COUNT',
            `Expected ${spec.expected} unique ${spec.prefix} records, found ${byId.size}.`,
            file
        ));
    }

    return { rows, byId };
}

function validateExplicitAnchors({ content, file, errors }) {
    const explicitAnchors = collectAnchors(content).filter(anchor => anchor.explicit);
    const firstById = new Map();
    for (const anchor of explicitAnchors) {
        const existing = firstById.get(anchor.id);
        if (existing) {
            errors.push(createError(
                'DUPLICATE_ANCHOR',
                `Anchor ${anchor.id} is already defined on line ${existing.line}.`,
                file,
                anchor.line
            ));
        } else {
            firstById.set(anchor.id, anchor);
        }
    }
    return firstById;
}

function validateMapAnchors({ content, file, errors }) {
    const anchors = collectAnchors(content)
        .filter(anchor => anchor.explicit && /^map-\d{2}$/.test(anchor.id));
    const unique = new Map(anchors.map(anchor => [anchor.id, anchor]));
    for (let number = 1; number <= 17; number++) {
        const id = `map-${String(number).padStart(2, '0')}`;
        if (!unique.has(id)) {
            errors.push(createError(
                'MISSING_MAP_ANCHOR',
                `Missing explicit anchor ${id} for MAP-${String(number).padStart(2, '0')}.`,
                file
            ));
        }
    }
    if (unique.size !== 17) {
        errors.push(createError(
            'MAP_COUNT',
            `Expected 17 unique MAP anchors, found ${unique.size}.`,
            file
        ));
    }
    return unique;
}

function validateSchedules({ content, file, records, today, errors }) {
    const schedules = parseScheduleRows(content);
    const byScope = new Map();

    for (const schedule of schedules) {
        if (byScope.has(schedule.scope)) {
            errors.push(createError(
                'DUPLICATE_REVIEW_SCOPE',
                `Review scope ${schedule.scope} is defined more than once.`,
                file,
                schedule.line
            ));
        } else {
            byScope.set(schedule.scope, schedule);
        }

        if (schedule.cells.length !== 6) {
            errors.push(createError(
                'REVIEW_SCOPE_COLUMN_COUNT',
                `Review scope ${schedule.scope} must contain 6 table cells, got ${schedule.cells.length}.`,
                file,
                schedule.line
            ));
        }
        schedule.cells.forEach((cell, columnIndex) => {
            if (cell.length === 0) {
                errors.push(createError(
                    'EMPTY_REVIEW_FIELD',
                    `Review scope ${schedule.scope} has an empty field in column ${columnIndex + 1}.`,
                    file,
                    schedule.line
                ));
            }
        });

        const lastReview = parseIsoDate(schedule.cells[2] || '');
        const nextReview = parseIsoDate(schedule.cells[3] || '');
        if (!lastReview) {
            errors.push(createError(
                'INVALID_LAST_REVIEW_DATE',
                `Review scope ${schedule.scope} has invalid last-review date ${schedule.cells[2] || '(empty)'}.`,
                file,
                schedule.line
            ));
        }
        if (!nextReview) {
            errors.push(createError(
                'INVALID_NEXT_REVIEW_DATE',
                `Review scope ${schedule.scope} has invalid next-review date ${schedule.cells[3] || '(empty)'}.`,
                file,
                schedule.line
            ));
        }
        if (lastReview && nextReview && lastReview > nextReview) {
            errors.push(createError(
                'REVIEW_DATE_ORDER',
                `Review scope ${schedule.scope} has last review ${lastReview} after next review ${nextReview}.`,
                file,
                schedule.line
            ));
        }
        if (lastReview && lastReview > today) {
            errors.push(createError(
                'FUTURE_LAST_REVIEW',
                `Review scope ${schedule.scope} has future last-review date ${lastReview} for check date ${today}.`,
                file,
                schedule.line
            ));
        }
        if (nextReview && nextReview < today) {
            errors.push(createError(
                'OVERDUE_REVIEW_SCOPE',
                `Review scope ${schedule.scope} was due on ${nextReview}; check date is ${today}.`,
                file,
                schedule.line
            ));
        }
    }

    for (const record of records.values()) {
        const matches = schedules.filter(schedule => record.id.startsWith(`${schedule.scope}-`));
        if (matches.length === 0) {
            errors.push(createError(
                'MISSING_REVIEW_SCOPE',
                `${record.id} is not covered by an update/review scope.`,
                file,
                record.line
            ));
        } else if (matches.length > 1) {
            errors.push(createError(
                'AMBIGUOUS_REVIEW_SCOPE',
                `${record.id} is covered by multiple review scopes: ${matches.map(item => item.scope).join(', ')}.`,
                file,
                record.line
            ));
        }
    }

    for (const schedule of schedules) {
        const covered = [...records.keys()].filter(id => id.startsWith(`${schedule.scope}-`));
        if (covered.length === 0) {
            errors.push(createError(
                'EMPTY_REVIEW_SCOPE',
                `Review scope ${schedule.scope} does not cover any record.`,
                file,
                schedule.line
            ));
        }
    }

    return byScope;
}

function extractLocalLinks(content) {
    const links = [];
    const lines = content.split(/\r?\n/);
    for (let index = 0; index < lines.length; index++) {
        for (const match of lines[index].matchAll(/\[[^\]]*\]\(([^)]+)\)/g)) {
            const rawTarget = match[1].trim().replace(/^<|>$/g, '');
            if (/^(?:https?:|mailto:|tel:)/i.test(rawTarget)) continue;
            links.push({ target: rawTarget, line: index + 1 });
        }
    }
    return links;
}

function validateLocalLinks({ documents, repoRoot, errors }) {
    const documentByAbsolutePath = new Map();
    for (const [relativePath, content] of Object.entries(documents)) {
        documentByAbsolutePath.set(path.resolve(repoRoot, relativePath), content);
    }
    const anchorCache = new Map();
    const rootWithSeparator = `${path.resolve(repoRoot)}${path.sep}`;

    function readTarget(targetPath) {
        if (documentByAbsolutePath.has(targetPath)) {
            return documentByAbsolutePath.get(targetPath);
        }
        return fs.readFileSync(targetPath, 'utf8');
    }

    function targetAnchors(targetPath, targetContent) {
        if (!anchorCache.has(targetPath)) {
            anchorCache.set(
                targetPath,
                new Set(collectAnchors(targetContent).map(anchor => anchor.id))
            );
        }
        return anchorCache.get(targetPath);
    }

    for (const [relativePath, content] of Object.entries(documents)) {
        const sourcePath = path.resolve(repoRoot, relativePath);
        for (const link of extractLocalLinks(content)) {
            const hashIndex = link.target.indexOf('#');
            const rawFilePart = hashIndex >= 0 ? link.target.slice(0, hashIndex) : link.target;
            const rawFragment = hashIndex >= 0 ? link.target.slice(hashIndex + 1) : '';
            let filePart;
            let fragment;
            try {
                filePart = decodeURIComponent(rawFilePart);
                fragment = decodeURIComponent(rawFragment);
            } catch {
                errors.push(createError(
                    'INVALID_LOCAL_LINK_ENCODING',
                    `Local link has invalid percent encoding: ${link.target}.`,
                    relativePath,
                    link.line
                ));
                continue;
            }

            const targetPath = filePart
                ? path.resolve(path.dirname(sourcePath), filePart)
                : sourcePath;
            if (targetPath !== path.resolve(repoRoot) && !targetPath.startsWith(rootWithSeparator)) {
                errors.push(createError(
                    'LOCAL_LINK_OUTSIDE_REPOSITORY',
                    `Local link resolves outside the repository: ${link.target}.`,
                    relativePath,
                    link.line
                ));
                continue;
            }
            if (!fs.existsSync(targetPath)) {
                errors.push(createError(
                    'BROKEN_LOCAL_FILE_LINK',
                    `Local link target does not exist: ${link.target}.`,
                    relativePath,
                    link.line
                ));
                continue;
            }
            if (!fragment) continue;
            const targetContent = readTarget(targetPath);
            if (!targetAnchors(targetPath, targetContent).has(fragment)) {
                errors.push(createError(
                    'BROKEN_LOCAL_ANCHOR_LINK',
                    `Local anchor ${fragment} does not exist in ${normalizeRelativePath(path.relative(repoRoot, targetPath))}.`,
                    relativePath,
                    link.line
                ));
            }
        }
    }
}

function collectDefinedIds(marketRecords, researchRecords, maps) {
    return new Set([
        ...marketRecords.keys(),
        ...researchRecords.keys(),
        ...[...maps.keys()].map(anchor => anchor.toUpperCase())
    ]);
}

function validateIdReferences({ documents, definedIds, errors }) {
    const referencePattern = /\b(?:MKT-[A-Z]+-\d{2}|FOR-[A-Z]+-\d{2}|MAP-\d{2})\b/g;
    for (const [file, content] of Object.entries(documents)) {
        const lines = content.split(/\r?\n/);
        for (let index = 0; index < lines.length; index++) {
            for (const match of lines[index].matchAll(referencePattern)) {
                if (!definedIds.has(match[0])) {
                    errors.push(createError(
                        'UNDEFINED_EVIDENCE_ID',
                        `Reference ${match[0]} has no unique evidence definition.`,
                        file,
                        index + 1
                    ));
                }
            }
        }
    }
}

export function getBerlinDate(now = new Date()) {
    const parts = new Intl.DateTimeFormat('en-CA', {
        timeZone: 'Europe/Berlin',
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
    }).formatToParts(now);
    const values = Object.fromEntries(parts.map(part => [part.type, part.value]));
    return `${values.year}-${values.month}-${values.day}`;
}

export function readEvidenceDocuments(repoRoot = REPO_ROOT) {
    return Object.fromEntries(
        Object.values(EVIDENCE_PATHS).map(relativePath => [
            relativePath,
            fs.readFileSync(path.resolve(repoRoot, relativePath), 'utf8')
        ])
    );
}

export function validateEvidenceDocuments(
    documents,
    { today = getBerlinDate(), repoRoot = REPO_ROOT } = {}
) {
    const errors = [];
    if (!parseIsoDate(today)) {
        throw new TypeError(`today must be an ISO calendar date, got ${today}`);
    }

    for (const requiredPath of Object.values(EVIDENCE_PATHS)) {
        if (typeof documents[requiredPath] !== 'string') {
            throw new TypeError(`Missing evidence document content: ${requiredPath}`);
        }
    }

    const marketFile = EVIDENCE_PATHS.market;
    const researchFile = EVIDENCE_PATHS.research;
    const market = validateRecords({
        content: documents[marketFile],
        file: marketFile,
        spec: RECORD_SPECS.market,
        errors
    });
    const research = validateRecords({
        content: documents[researchFile],
        file: researchFile,
        spec: RECORD_SPECS.research,
        errors
    });

    validateExplicitAnchors({ content: documents[marketFile], file: marketFile, errors });
    validateExplicitAnchors({ content: documents[researchFile], file: researchFile, errors });
    const maps = validateMapAnchors({ content: documents[researchFile], file: researchFile, errors });

    const marketSchedules = validateSchedules({
        content: documents[marketFile],
        file: marketFile,
        records: market.byId,
        today,
        errors
    });
    const researchSchedules = validateSchedules({
        content: documents[researchFile],
        file: researchFile,
        records: research.byId,
        today,
        errors
    });

    validateLocalLinks({ documents, repoRoot, errors });
    validateIdReferences({
        documents,
        definedIds: collectDefinedIds(market.byId, research.byId, maps),
        errors
    });

    errors.sort(compareErrors);
    return {
        ok: errors.length === 0,
        today,
        counts: {
            marketRecords: market.byId.size,
            researchRecords: research.byId.size,
            mapAnchors: maps.size,
            marketReviewScopes: marketSchedules.size,
            researchReviewScopes: researchSchedules.size
        },
        errors
    };
}

export function validateRepositoryEvidence(options = {}) {
    const repoRoot = options.repoRoot || REPO_ROOT;
    return validateEvidenceDocuments(readEvidenceDocuments(repoRoot), {
        ...options,
        repoRoot
    });
}

export function formatValidationReport(report) {
    if (report.ok) {
        return [
            `Architecture evidence validation passed for ${report.today}.`,
            `MKT records: ${report.counts.marketRecords}; FOR records: ${report.counts.researchRecords}; MAP anchors: ${report.counts.mapAnchors}.`,
            `Review scopes: ${report.counts.marketReviewScopes} market; ${report.counts.researchReviewScopes} research.`,
            'Network access: none (static local validation).'
        ].join('\n');
    }

    const lines = [
        `Architecture evidence validation failed for ${report.today} with ${report.errors.length} error(s):`
    ];
    for (const error of report.errors) {
        const location = error.line ? `${error.file}:${error.line}` : error.file;
        lines.push(`- [${error.code}] ${location}: ${error.message}`);
    }
    return lines.join('\n');
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === __filename;

if (isMain) {
    try {
        const checkDateIndex = process.argv.indexOf('--check-date');
        const today = checkDateIndex >= 0 ? process.argv[checkDateIndex + 1] : undefined;
        if (checkDateIndex >= 0 && !today) {
            throw new TypeError('--check-date requires an ISO calendar date.');
        }
        const report = validateRepositoryEvidence(today ? { today } : {});
        const output = formatValidationReport(report);
        (report.ok ? console.log : console.error)(output);
        process.exitCode = report.ok ? 0 : 1;
    } catch (error) {
        console.error(`Architecture evidence validation could not start: ${error.message}`);
        process.exitCode = 1;
    }
}
