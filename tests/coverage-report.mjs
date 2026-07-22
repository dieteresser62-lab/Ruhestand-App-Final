import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const defaultRepoRoot = path.resolve(__dirname, '..');
const defaultCoverageDir = path.join(defaultRepoRoot, '.coverage', 'v8');
const defaultSummaryPath = path.join(defaultRepoRoot, '.coverage', 'summary.json');

const includeRoots = ['app', 'engine', 'workers', 'types'];
const includeExt = new Set(['.js', '.mjs', '.cjs']);

export const REQUIRED_COVERAGE_FILE_GATES = Object.freeze([
    Object.freeze({ file: 'app/simulator/worker-job-runner.js', minimumPct: 50 }),
    Object.freeze({ file: 'app/simulator/results-renderers.js', minimumPct: 50 })
]);

function isInside(base, target) {
    const rel = path.relative(base, target);
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
}

export function isFileCoverageUrl(url) {
    if (typeof url !== 'string' || url.length === 0) return false;
    try {
        return new URL(url).protocol === 'file:';
    } catch {
        return false;
    }
}

export function coverageUrlToPath(url) {
    if (!isFileCoverageUrl(url)) return null;
    return fileURLToPath(url);
}

function normalizeRanges(ranges) {
    const normalized = ranges
        .filter(r => Number.isFinite(r?.startOffset) && Number.isFinite(r?.endOffset))
        .map(r => ({
            start: Math.max(0, r.startOffset | 0),
            end: Math.max(0, r.endOffset | 0)
        }))
        .filter(r => r.end > r.start)
        .sort((a, b) => (a.start - b.start) || (a.end - b.end));

    if (normalized.length === 0) return [];

    const merged = [normalized[0]];
    for (let i = 1; i < normalized.length; i++) {
        const current = normalized[i];
        const last = merged[merged.length - 1];
        if (current.start <= last.end) {
            last.end = Math.max(last.end, current.end);
        } else {
            merged.push(current);
        }
    }
    return merged;
}

function normalizeV8Ranges(ranges) {
    return ranges
        .filter(r => Number.isFinite(r?.startOffset) && Number.isFinite(r?.endOffset))
        .map(r => ({
            start: Math.max(0, r.startOffset | 0),
            end: Math.max(0, r.endOffset | 0),
            count: Number.isFinite(r?.count) ? r.count : 0
        }))
        .filter(r => r.end > r.start)
        .sort((a, b) => (a.start - b.start) || (b.end - a.end) || (b.count - a.count));
}

function effectiveRangesFromV8Ranges(ranges) {
    const normalized = normalizeV8Ranges(ranges);
    if (normalized.length === 0) {
        return { allRanges: [], coveredRanges: [] };
    }

    const boundaries = [...new Set(normalized.flatMap(r => [r.start, r.end]))]
        .sort((a, b) => a - b);
    const executableSegments = [];
    const coveredSegments = [];

    for (let i = 0; i < boundaries.length - 1; i++) {
        const start = boundaries[i];
        const end = boundaries[i + 1];
        if (end <= start) continue;

        let innermost = null;
        for (const range of normalized) {
            if (range.start <= start && range.end >= end) {
                if (
                    !innermost ||
                    (range.end - range.start) < (innermost.end - innermost.start)
                ) {
                    innermost = range;
                }
            }
        }
        if (!innermost) continue;

        executableSegments.push({ start, end });
        if (innermost.count > 0) {
            coveredSegments.push({ start, end });
        }
    }

    return {
        allRanges: normalizeRanges(executableSegments.map(r => ({ startOffset: r.start, endOffset: r.end }))),
        coveredRanges: normalizeRanges(coveredSegments.map(r => ({ startOffset: r.start, endOffset: r.end })))
    };
}

function buildLineStarts(source) {
    const starts = [0];
    for (let i = 0; i < source.length; i++) {
        if (source.charCodeAt(i) === 10) starts.push(i + 1);
    }
    return starts;
}

function intersects(interval, start, end) {
    return interval.start < end && interval.end > start;
}

function isIntervalFullyCovered(start, end, coveredRanges, startIndex = 0) {
    let cursor = start;
    for (let i = startIndex; i < coveredRanges.length && coveredRanges[i].start < end; i++) {
        const coveredRange = coveredRanges[i];
        if (coveredRange.end <= cursor) continue;
        if (coveredRange.start > cursor) return false;
        cursor = Math.max(cursor, coveredRange.end);
        if (cursor >= end) return true;
    }
    return cursor >= end;
}

function lineCoverageFromRanges(source, allRanges, coveredRanges) {
    const lineStarts = buildLineStarts(source);
    let executable = 0;
    let covered = 0;

    let allIdx = 0;
    let coveredIdx = 0;

    for (let i = 0; i < lineStarts.length; i++) {
        const start = lineStarts[i];
        const end = (i + 1 < lineStarts.length) ? lineStarts[i + 1] : source.length + 1;

        while (allIdx < allRanges.length && allRanges[allIdx].end <= start) allIdx++;
        let hasExecutable = false;
        let scanAll = allIdx;
        while (scanAll < allRanges.length && allRanges[scanAll].start < end) {
            if (intersects(allRanges[scanAll], start, end)) {
                hasExecutable = true;
                break;
            }
            scanAll++;
        }
        if (!hasExecutable) continue;
        executable++;

        while (coveredIdx < coveredRanges.length && coveredRanges[coveredIdx].end <= start) coveredIdx++;
        let hasCovered = false;
        let hasUncovered = false;
        let scanCovered = coveredIdx;
        scanAll = allIdx;
        while (scanAll < allRanges.length && allRanges[scanAll].start < end) {
            const executableRange = allRanges[scanAll];
            if (intersects(executableRange, start, end)) {
                const executableStart = Math.max(executableRange.start, start);
                const executableEnd = Math.min(executableRange.end, end);
                while (scanCovered < coveredRanges.length && coveredRanges[scanCovered].end <= executableRange.start) {
                    scanCovered++;
                }
                const executableRangeCovered = isIntervalFullyCovered(
                    executableStart,
                    executableEnd,
                    coveredRanges,
                    scanCovered
                );
                let scanCoveredForRange = scanCovered;
                while (
                    scanCoveredForRange < coveredRanges.length &&
                    coveredRanges[scanCoveredForRange].start < executableRange.end
                ) {
                    if (intersects(coveredRanges[scanCoveredForRange], executableStart, executableEnd)) {
                        hasCovered = true;
                        break;
                    }
                    scanCoveredForRange++;
                }
                hasUncovered = hasUncovered || !executableRangeCovered;
            }
            scanAll++;
        }
        if (hasCovered && !hasUncovered) covered++;
    }

    return { executable, covered };
}

function getConfig(env = process.env) {
    const repoRoot = env.COVERAGE_REPO_ROOT
        ? path.resolve(env.COVERAGE_REPO_ROOT)
        : defaultRepoRoot;
    const coverageDir = env.COVERAGE_V8_DIR
        ? path.resolve(env.COVERAGE_V8_DIR)
        : defaultCoverageDir;
    const summaryPath = env.COVERAGE_SUMMARY_PATH
        ? path.resolve(env.COVERAGE_SUMMARY_PATH)
        : defaultSummaryPath;
    return { repoRoot, coverageDir, summaryPath };
}

function createEmptyFileCoverage(source) {
    return {
        source,
        allRanges: [],
        coveredRanges: []
    };
}

export function collectCoverageEntries({ repoRoot, coverageDir } = getConfig()) {
    if (!fs.existsSync(coverageDir)) {
        throw new Error(`Coverage directory not found: ${coverageDir}`);
    }
    const files = fs.readdirSync(coverageDir).filter(f => f.endsWith('.json'));
    const byFile = new Map();

    for (const filename of files) {
        const fullPath = path.join(coverageDir, filename);
        const payload = JSON.parse(fs.readFileSync(fullPath, 'utf8'));
        const results = Array.isArray(payload.result) ? payload.result : [];

        for (const entry of results) {
            const filePath = coverageUrlToPath(entry?.url);
            if (!filePath) continue;
            const ext = path.extname(filePath);
            if (!includeExt.has(ext)) continue;
            if (!isInside(repoRoot, filePath)) continue;

            const rel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
            const include = includeRoots.some(root => rel === root || rel.startsWith(`${root}/`));
            if (!include) continue;

            const source = typeof entry.source === 'string'
                ? entry.source
                : (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null);
            if (!source) continue;

            const fileCoverage = byFile.get(rel) || createEmptyFileCoverage(source);
            const functions = Array.isArray(entry.functions) ? entry.functions : [];
            for (const fn of functions) {
                const ranges = Array.isArray(fn?.ranges) ? fn.ranges : [];
                const hasRootRange = ranges.length > 0 &&
                    ranges[0].startOffset === 0 &&
                    ranges[0].endOffset >= source.length;
                const isTopLevel = fn?.functionName === '' && hasRootRange;
                const rangesToUse = isTopLevel ? ranges.slice(1) : ranges;

                const effectiveRanges = effectiveRangesFromV8Ranges(rangesToUse);
                fileCoverage.allRanges.push(...effectiveRanges.allRanges);
                fileCoverage.coveredRanges.push(...effectiveRanges.coveredRanges);
            }
            byFile.set(rel, fileCoverage);
        }
    }

    const statsByFile = new Map();
    for (const [rel, fileCoverage] of byFile.entries()) {
        const allRanges = normalizeRanges(fileCoverage.allRanges.map(r => ({
            startOffset: r.start,
            endOffset: r.end
        })));
        const coveredRanges = normalizeRanges(fileCoverage.coveredRanges.map(r => ({
            startOffset: r.start,
            endOffset: r.end
        })));
        statsByFile.set(rel, lineCoverageFromRanges(fileCoverage.source, allRanges, coveredRanges));
    }

    return statsByFile;
}

function toPct(covered, total) {
    return (covered / total) * 100;
}

function formatPct(value) {
    if (!Number.isFinite(value)) return 'n/a';
    return `${value.toFixed(2)}%`;
}

export function buildCoverageSummary({ repoRoot, coverageDir, summaryPath } = getConfig()) {
    const byFile = collectCoverageEntries({ repoRoot, coverageDir });
    const files = [...byFile.entries()]
        .map(([file, stats]) => ({
            file,
            executable: stats.executable,
            covered: stats.covered,
            pct: stats.executable > 0 ? toPct(stats.covered, stats.executable) : null
        }))
        .sort((a, b) => {
            if (a.pct === null && b.pct === null) return a.file.localeCompare(b.file, 'en');
            if (a.pct === null) return 1;
            if (b.pct === null) return -1;
            return (a.pct - b.pct) || a.file.localeCompare(b.file, 'en');
        });

    const totalExecutable = files.reduce((sum, f) => sum + f.executable, 0);
    const totalCovered = files.reduce((sum, f) => sum + f.covered, 0);

    if (files.length === 0) {
        throw new Error('No project coverage data found for app/, engine/, workers/ or types/.');
    }
    if (totalExecutable === 0) {
        throw new Error('Coverage data contains project files but no executable project lines.');
    }

    const totalPct = toPct(totalCovered, totalExecutable);

    const summary = {
        generatedAt: new Date().toISOString(),
        total: {
            executableLines: totalExecutable,
            coveredLines: totalCovered,
            coveragePct: Number(totalPct.toFixed(2))
        },
        files: files.map(f => ({
            file: f.file,
            executableLines: f.executable,
            coveredLines: f.covered,
            coveragePct: f.pct === null ? null : Number(f.pct.toFixed(2))
        }))
    };

    return { files, summary, summaryPath, repoRoot };
}

export function validateCoverageFileGates(
    summary,
    gates = REQUIRED_COVERAGE_FILE_GATES
) {
    const files = Array.isArray(summary?.files) ? summary.files : [];
    const byFile = new Map(files.map(entry => [entry.file, entry]));
    const failures = [];

    for (const gate of gates) {
        const entry = byFile.get(gate.file);
        if (!entry) {
            failures.push(`${gate.file}: missing from coverage summary`);
            continue;
        }
        if (!Number.isFinite(entry.coveragePct)) {
            failures.push(`${gate.file}: coverage is not measurable`);
            continue;
        }
        if (entry.coveragePct < gate.minimumPct) {
            failures.push(
                `${gate.file}: ${entry.coveragePct.toFixed(2)}% is below ${gate.minimumPct.toFixed(2)}%`
            );
        }
    }

    return {
        ok: failures.length === 0,
        metric: 'approximate executable-line coverage from V8 ranges',
        failures
    };
}

function writeSummary({ files, summary, summaryPath, repoRoot }) {
    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('\nCoverage summary (approx. line coverage from V8 ranges)');
    console.log(
        `Total: ${formatPct(summary.total.coveragePct)} ` +
        `(${summary.total.coveredLines}/${summary.total.executableLines})`
    );
    console.log(`Files: ${files.length}`);
    console.log('Worst files:');
    for (const row of files.slice(0, 15)) {
        console.log(`- ${row.file}: ${formatPct(row.pct)} (${row.covered}/${row.executable})`);
    }
    console.log(`\nWrote ${path.relative(repoRoot, summaryPath)}`);
}

export function main() {
    const report = buildCoverageSummary();
    writeSummary(report);
    if (process.env.COVERAGE_ENFORCE_GATES === '1') {
        const gateResult = validateCoverageFileGates(report.summary);
        if (!gateResult.ok) {
            throw new Error(`Required file coverage gate failed (${gateResult.metric}): ${gateResult.failures.join('; ')}`);
        }
        console.log(
            `Required file coverage gates passed: ${REQUIRED_COVERAGE_FILE_GATES.map(gate => `${gate.file} >= ${gate.minimumPct}%`).join('; ')}`
        );
    }
}

const isMain = process.argv[1] && pathToFileURL(path.resolve(process.argv[1])).href === import.meta.url;

if (isMain) {
    try {
        main();
    } catch (error) {
        console.error('Coverage report failed:', error?.message || error);
        process.exit(1);
    }
}
