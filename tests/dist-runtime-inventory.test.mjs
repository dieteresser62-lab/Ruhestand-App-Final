import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { DIST_REQUIRED_FILES, isDistRuntimePath } from '../scripts/sync-dist.mjs';

console.log('--- Dist Runtime Inventory Tests ---');

// Verfolgt von den HTML-Einstiegen aus alle statischen Verweise (Skripte,
// Stylesheets, Bilder, Links, ES-Importe, Worker-URLs, CSS-url()). Jede so
// erreichte Repo-Datei muss in dist landen, sonst fehlt sie in der Desktop-App.
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const HTML_PATTERNS = [
    /<(?:script|img|source|iframe)\b[^>]*?\ssrc=["']([^"']+)["']/gi,
    /<(?:link|a)\b[^>]*?\shref=["']([^"'#][^"']*)["']/gi
];
const JS_PATTERNS = [
    /\b(?:import|export)\s[^'"`;]*?\bfrom\s*["']([^"']+)["']/g,
    /\bimport\s*["']([^"']+)["']/g,
    /\bimport\(\s*["']([^"']+)["']\s*\)/g,
    /new\s+URL\(\s*["']([^"']+)["']\s*,\s*import\.meta\.url/g,
    /new\s+(?:Shared)?Worker\(\s*["']([^"']+)["']/g
];
const CSS_PATTERNS = [
    /url\(\s*["']?([^"')]+)["']?\s*\)/g,
    /@import\s+["']([^"']+)["']/g
];

function patternsFor(file) {
    const extension = path.extname(file).toLowerCase();
    if (extension === '.html') return [...HTML_PATTERNS, ...JS_PATTERNS, ...CSS_PATTERNS];
    if (extension === '.css') return CSS_PATTERNS;
    if (extension === '.js' || extension === '.mjs') return JS_PATTERNS;
    return [];
}

function resolveReference(reference, fromFile) {
    const cleaned = reference.split(/[?#]/)[0];
    if (!cleaned || /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(cleaned)) return null;
    const candidates = cleaned.startsWith('/')
        ? [cleaned.slice(1)]
        : [path.posix.join(path.posix.dirname(fromFile), cleaned), path.posix.normalize(cleaned)];
    for (const candidate of candidates) {
        if (candidate.startsWith('..')) continue;
        const absolute = path.join(repoRoot, ...candidate.split('/'));
        if (fs.existsSync(absolute) && fs.statSync(absolute).isFile()) return candidate;
    }
    return null;
}

const entryPages = fs.readdirSync(repoRoot).filter(name => name.toLowerCase().endsWith('.html'));
assert(entryPages.length >= 5, 'the suite has at least five HTML entry pages');

const reachedFrom = new Map(entryPages.map(page => [page, '(entry page)']));
const queue = [...entryPages];
while (queue.length > 0) {
    const file = queue.shift();
    const text = fs.readFileSync(path.join(repoRoot, ...file.split('/')), 'utf8');
    for (const pattern of patternsFor(file)) {
        for (const match of text.matchAll(pattern)) {
            const target = resolveReference(match[1], file);
            if (target && !reachedFrom.has(target)) {
                reachedFrom.set(target, file);
                queue.push(target);
            }
        }
    }
}

assert(reachedFrom.size > 100, `static reference walk reaches the application modules (${reachedFrom.size} files)`);
const outsideDist = [...reachedFrom]
    .filter(([file]) => !isDistRuntimePath(file))
    .map(([file, from]) => `${file} <- ${from}`);
assertEqual(outsideDist.length, 0,
    `every file referenced by the entry pages is copied into dist (missing: ${outsideDist.join('; ')})`);
for (const required of DIST_REQUIRED_FILES) {
    assert(reachedFrom.has(required), `required dist file is referenced by the application: ${required}`);
}

for (const [samplePath, expected] of [
    ['index.html', true],
    ['engine.js', true],
    ['app/simulator/simulator-main.js', true],
    ['assets/images/icon.png', true],
    ['build-engine.mjs', false],
    ['README.md', false],
    ['data/historical/x.csv', false],
    ['docs/guide.html', false],
    ['tools/yahoo-proxy.cjs', false],
    ['application/x.js', false]
]) {
    assertEqual(isDistRuntimePath(samplePath), expected, `dist runtime classification of ${samplePath}`);
}

console.log('✅ Dist runtime inventory tests passed');
