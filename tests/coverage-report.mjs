import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const coverageDir = path.join(repoRoot, '.coverage', 'v8');
const summaryPath = path.join(repoRoot, '.coverage', 'summary.json');

const includeRoots = ['app', 'engine', 'workers'];
const includeExt = new Set(['.js', '.mjs', '.cjs']);

function isInside(base, target) {
    const rel = path.relative(base, target);
    return rel && !rel.startsWith('..') && !path.isAbsolute(rel);
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
        let isCovered = false;
        let scanCovered = coveredIdx;
        while (scanCovered < coveredRanges.length && coveredRanges[scanCovered].start < end) {
            if (intersects(coveredRanges[scanCovered], start, end)) {
                isCovered = true;
                break;
            }
            scanCovered++;
        }
        if (isCovered) covered++;
    }

    return { executable, covered };
}

function collectCoverageEntries() {
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
            if (typeof entry?.url !== 'string' || !entry.url.startsWith('file://')) continue;
            const filePath = decodeURIComponent(entry.url.replace('file://', ''));
            const ext = path.extname(filePath);
            if (!includeExt.has(ext)) continue;
            if (!isInside(repoRoot, filePath)) continue;

            const rel = path.relative(repoRoot, filePath).replace(/\\/g, '/');
            const include = includeRoots.some(root => rel.startsWith(`${root}/`));
            if (!include) continue;

            const source = typeof entry.source === 'string'
                ? entry.source
                : (fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null);
            if (!source) continue;

            const functions = Array.isArray(entry.functions) ? entry.functions : [];
            const allRangesRaw = [];
            const coveredRangesRaw = [];
            for (const fn of functions) {
                const ranges = Array.isArray(fn?.ranges) ? fn.ranges : [];
                const hasRootRange = ranges.length > 0 &&
                    ranges[0].startOffset === 0 &&
                    ranges[0].endOffset >= source.length;
                const isTopLevel = fn?.functionName === '' && hasRootRange;
                const rangesToUse = isTopLevel ? ranges.slice(1) : ranges;

                for (const r of rangesToUse) {
                    allRangesRaw.push(r);
                    if ((r?.count || 0) > 0) coveredRangesRaw.push(r);
                }
            }

            const allRanges = normalizeRanges(allRangesRaw);
            const coveredRanges = normalizeRanges(coveredRangesRaw);
            const fileCoverage = lineCoverageFromRanges(source, allRanges, coveredRanges);

            const existing = byFile.get(rel) || { executable: 0, covered: 0 };
            existing.executable += fileCoverage.executable;
            existing.covered += fileCoverage.covered;
            byFile.set(rel, existing);
        }
    }

    return byFile;
}

function toPct(covered, total) {
    if (!total) return 100;
    return (covered / total) * 100;
}

function formatPct(value) {
    return `${value.toFixed(2)}%`;
}

function main() {
    const byFile = collectCoverageEntries();
    const files = [...byFile.entries()]
        .map(([file, stats]) => ({
            file,
            executable: stats.executable,
            covered: stats.covered,
            pct: toPct(stats.covered, stats.executable)
        }))
        .sort((a, b) => a.pct - b.pct);

    const totalExecutable = files.reduce((sum, f) => sum + f.executable, 0);
    const totalCovered = files.reduce((sum, f) => sum + f.covered, 0);
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
            coveragePct: Number(f.pct.toFixed(2))
        }))
    };

    fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
    fs.writeFileSync(summaryPath, JSON.stringify(summary, null, 2));

    console.log('\nCoverage summary (approx. line coverage from V8 ranges)');
    console.log(`Total: ${formatPct(totalPct)} (${totalCovered}/${totalExecutable})`);
    console.log(`Files: ${files.length}`);
    console.log('Worst files:');
    for (const row of files.slice(0, 15)) {
        console.log(`- ${row.file}: ${formatPct(row.pct)} (${row.covered}/${row.executable})`);
    }
    console.log(`\nWrote ${path.relative(repoRoot, summaryPath)}`);
}

try {
    main();
} catch (error) {
    console.error('Coverage report failed:', error?.message || error);
    process.exit(1);
}
