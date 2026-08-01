import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
    GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS,
    GERMAN_CASH_MONEY_MARKET_CHAIN
} from '../app/simulator/german-cash-money-market-chain.js';
import {
    isPopplerVersionCompatible,
    POPPLER_MINIMUM_VERSION,
    resolvePopplerTool
} from '../scripts/lib/poppler-toolchain.mjs';

console.log('--- German Cash/Money-Market Independent Source Reconstruction Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(directory, '..');
const sourcePaths = Object.freeze({
    jst: path.join(projectRoot, 'data', 'historical', 'global-equity-research-chain', 'originals', 'JSTdatasetR6.xlsx'),
    bundesbankPdf: path.join(projectRoot, 'data', 'historical', 'german-cash-money-market-chain', 'originals', 'bundesbank-long-series-2026-03-05.pdf'),
    bundesbankTextExtract: path.join(projectRoot, 'data', 'historical', 'german-cash-money-market-chain', 'originals', 'bundesbank-money-market-pages-15-16-layout.txt')
});

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

function decodeXml(value) {
    return value
        .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)))
        .replace(/&#(\d+);/g, (_match, codePoint) => String.fromCodePoint(Number(codePoint)))
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&');
}

function resolveIndependentPdftohtml() {
    return resolvePopplerTool().executable;
}

function extractIndependentBundesbankPdfRates() {
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'cash-oracle-test-'));
    const xmlPath = path.join(tempDirectory, 'pages.xml');
    try {
        const result = spawnSync(resolveIndependentPdftohtml(), [
            '-xml',
            '-f',
            '15',
            '-l',
            '16',
            '-hidden',
            '-i',
            '-noframes',
            sourcePaths.bundesbankPdf,
            xmlPath
        ], {
            cwd: projectRoot,
            encoding: 'utf8',
            windowsHide: true
        });
        assertEqual(result.status, 0, `Independent PDF extraction should succeed: ${result.stderr}`);
        const xml = fs.readFileSync(xmlPath, 'utf8');
        const producer = xml.match(
            /<pdf2xml\s+producer="([^"]+)"\s+version="([^"]+)"/
        );
        assertEqual(producer?.[1], 'poppler', 'Independent PDF extraction should identify Poppler');
        assert(
            isPopplerVersionCompatible(producer?.[2], POPPLER_MINIMUM_VERSION),
            'Independent PDF extraction should use a compatible Poppler version'
        );

        const nodes = [...xml.matchAll(/<text\s+([^>]*)>([\s\S]*?)<\/text>/g)].map(([, attributes, body]) => {
            const left = Number(attributes.match(/\bleft="([^"]+)"/)?.[1]);
            const width = Number(attributes.match(/\bwidth="([^"]+)"/)?.[1]);
            return {
                left,
                right: left + width,
                text: decodeXml(body.replace(/<[^>]+>/g, '')).trim()
            };
        });
        const yearNodeIndexes = nodes
            .map((node, index) => ({ node, index }))
            .filter(({ node }) => (
                node.left >= 100
                && node.left < 200
                && /^(19[4-9]\d|20[0-2]\d)$/.test(node.text)
                && Number(node.text) >= 1949
                && Number(node.text) <= 2025
            ));
        assertEqual(yearNodeIndexes.length, 77, 'Independent PDF oracle should find 77 year rows');

        const rates = {};
        yearNodeIndexes.forEach(({ node, index }, yearIndex) => {
            const nextIndex = yearNodeIndexes[yearIndex + 1]?.index ?? nodes.length;
            const overnightNode = nodes.slice(index + 1, nextIndex).find(candidate => {
                const normalized = candidate.text.replace(/\s+/g, '');
                return candidate.left > 250
                    && candidate.right <= 350
                    && /^-?\d+\.\d+$/.test(normalized);
            });
            assert(overnightNode, `${node.text} should have a coordinate-selected overnight value`);
            rates[Number(node.text)] = Number(overnightNode.text.replace(/\s+/g, ''));
        });
        return rates;
    } finally {
        fs.rmSync(tempDirectory, { recursive: true, force: true });
    }
}

// Independent oracle: this ZIP/XML reader does not import or execute the
// production generator and projects its own source selectors.
function readZipMembers(bytes) {
    let eocd = -1;
    for (let offset = bytes.length - 22; offset >= Math.max(0, bytes.length - 65557); offset -= 1) {
        if (bytes.readUInt32LE(offset) === 0x06054b50) {
            eocd = offset;
            break;
        }
    }
    assert(eocd >= 0, 'Independent XLSX reader should find the ZIP directory');
    const memberCount = bytes.readUInt16LE(eocd + 10);
    let cursor = bytes.readUInt32LE(eocd + 16);
    const members = new Map();
    for (let index = 0; index < memberCount; index += 1) {
        assertEqual(bytes.readUInt32LE(cursor), 0x02014b50, `ZIP member ${index} should be valid`);
        const method = bytes.readUInt16LE(cursor + 10);
        const compressedSize = bytes.readUInt32LE(cursor + 20);
        const nameLength = bytes.readUInt16LE(cursor + 28);
        const extraLength = bytes.readUInt16LE(cursor + 30);
        const commentLength = bytes.readUInt16LE(cursor + 32);
        const localOffset = bytes.readUInt32LE(cursor + 42);
        const name = bytes.toString('utf8', cursor + 46, cursor + 46 + nameLength);
        assertEqual(bytes.readUInt32LE(localOffset), 0x04034b50, `${name} local ZIP header should be valid`);
        const payloadOffset = localOffset
            + 30
            + bytes.readUInt16LE(localOffset + 26)
            + bytes.readUInt16LE(localOffset + 28);
        const compressed = bytes.subarray(payloadOffset, payloadOffset + compressedSize);
        assert(method === 0 || method === 8, `${name} should use a supported ZIP compression method`);
        members.set(name, method === 8 ? zlib.inflateRawSync(compressed) : Buffer.from(compressed));
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    return members;
}

function columnIndex(cellReference) {
    const letters = cellReference.match(/^[A-Z]+/)?.[0] || '';
    return [...letters].reduce((index, letter) => (index * 26) + letter.charCodeAt(0) - 64, 0) - 1;
}

function parseWorksheetRows(members) {
    const sharedXml = members.get('xl/sharedStrings.xml')?.toString('utf8') || '';
    const sharedStrings = [...sharedXml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(([, item]) => (
        [...item.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
            .map(([, value]) => decodeXml(value))
            .join('')
    ));
    const worksheetXml = members.get('xl/worksheets/sheet1.xml')?.toString('utf8');
    assert(worksheetXml, 'JST worksheet should exist');
    return [...worksheetXml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)].map(([, rowXml]) => {
        const row = [];
        for (const [, attributes, cellXml] of rowXml.matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)) {
            const reference = attributes.match(/\br="([^"]+)"/)?.[1];
            if (!reference) continue;
            const type = attributes.match(/\bt="([^"]+)"/)?.[1] || 'n';
            const rawValue = cellXml.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1];
            const value = type === 's'
                ? sharedStrings[Number(rawValue)]
                : (rawValue === undefined || rawValue === '' ? '' : Number(rawValue));
            row[columnIndex(reference)] = value;
        }
        return row;
    });
}

console.log('Test 1: all pinned source bytes retain their declared identities');
for (const [sourceId, sourcePath] of Object.entries(sourcePaths)) {
    assertEqual(
        sha256(fs.readFileSync(sourcePath)),
        GERMAN_CASH_MONEY_MARKET_CHAIN.sourceFiles[sourceId].sha256,
        `${sourceId} should match the generated source identity`
    );
}
console.log('✓ source identities OK');

console.log('Test 2: an independent reader reconstructs all 101 annual returns');
const jstRows = parseWorksheetRows(readZipMembers(fs.readFileSync(sourcePaths.jst)));
const headers = Object.fromEntries(jstRows[0].map((header, index) => [header, index]));
const expected = {};
const missingJstYears = [];
for (const row of jstRows.slice(1)) {
    if (row[headers.iso] !== 'DEU') continue;
    const year = Number(row[headers.year]);
    if (year < 1925 || year > 1949) continue;
    const rate = row[headers.stir];
    if (rate === '' || rate === undefined || rate === null) {
        missingJstYears.push(year);
    } else {
        expected[year] = Number(rate);
    }
}
assertEqual(JSON.stringify(missingJstYears), JSON.stringify([1945, 1946, 1947, 1948, 1949]), 'JST gap pattern should be exact');
for (let year = 1945; year <= 1948; year += 1) expected[year] = expected[1944];

const bundesbankPdfRates = extractIndependentBundesbankPdfRates();
assertEqual(Object.keys(bundesbankPdfRates).length, 77, 'Primary-PDF oracle should cover 1949-2025');
Object.assign(expected, bundesbankPdfRates);

assertEqual(Object.keys(expected).length, 101, 'Independent oracle should cover 1925-2025');
for (let year = 1925; year <= 2025; year += 1) {
    assertEqual(
        GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS[year],
        expected[year],
        `${year} should equal the independent source oracle`
    );
}
console.log('✓ independent 101-year oracle OK');

console.log('Test 3: the declared post-war bridge is the only source gap');
assertEqual(expected[1944], 2.13, 'The carry-forward source observation should be pinned');
for (let year = 1945; year <= 1948; year += 1) {
    assertEqual(expected[year], expected[1944], `${year} should be derived only from the declared source year`);
}
assertEqual(expected[1949], 3.24, 'The Bundesbank-published proxy chain should replace the bridge in 1949');
assertEqual(GERMAN_CASH_MONEY_MARKET_CHAIN.gapPolicy.failClosedOutsideDeclaredGap, true, 'Metadata should reject undeclared gaps');
console.log('✓ explicit single-gap derivation OK');

console.log('Test 4: production verification remains read-only');
{
    const outputPath = path.join(projectRoot, 'app', 'simulator', 'german-cash-money-market-chain.js');
    const outputHashBefore = sha256(fs.readFileSync(outputPath));
    const scriptPath = path.join(projectRoot, 'scripts', 'build-german-cash-money-market-chain.mjs');
    const result = spawnSync(process.execPath, [scriptPath, '--verify-only'], {
        cwd: projectRoot,
        encoding: 'utf8',
        windowsHide: true
    });
    assertEqual(result.status, 0, `Production verification should succeed: ${result.stderr}`);
    assert(
        result.stdout.includes('Verified German cash/money-market chain 1925-2025'),
        'Production verification should confirm the no-write gate'
    );
    assertEqual(sha256(fs.readFileSync(outputPath)), outputHashBefore, 'Verification must not rewrite the module');
}
console.log('✓ production read-only gate OK');

console.log('✅ German cash/money-market independent source reconstruction tests passed');
