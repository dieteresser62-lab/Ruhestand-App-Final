import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
    GERMAN_CPI_INFLATION_RATES,
    GERMAN_CPI_RESEARCH_CHAIN
} from '../app/simulator/german-cpi-chain.js';

console.log('--- German CPI Independent Source Reconstruction Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(directory, '..');
const sourcePaths = Object.freeze({
    jst: path.join(
        projectRoot,
        'data',
        'historical',
        'global-equity-research-chain',
        'originals',
        'JSTdatasetR6.xlsx'
    ),
    destatisLongSeries: path.join(
        projectRoot,
        'data',
        'historical',
        'german-cpi-chain',
        'originals',
        'destatis-vpi-lange-reihen-2025-06.xlsx'
    ),
    destatisCurrent: path.join(
        projectRoot,
        'data',
        'historical',
        'german-cpi-chain',
        'originals',
        'destatis-vpi-current-2026-07-10.html'
    )
});

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

function decodeXml(value) {
    return value
        .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint) => (
            String.fromCodePoint(Number.parseInt(codePoint, 16))
        ))
        .replace(/&#(\d+);/g, (_match, codePoint) => String.fromCodePoint(Number(codePoint)))
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'")
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&amp;', '&');
}

// Independent test reader: this ZIP/XML path neither imports nor executes the
// production generator. It intentionally uses its own row/selector projection.
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
        const localNameLength = bytes.readUInt16LE(localOffset + 26);
        const localExtraLength = bytes.readUInt16LE(localOffset + 28);
        const payloadOffset = localOffset + 30 + localNameLength + localExtraLength;
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

function parseSharedStrings(xml) {
    return [...xml.matchAll(/<si(?:\s[^>]*)?>([\s\S]*?)<\/si>/g)].map(([, item]) => (
        [...item.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
            .map(([, text]) => decodeXml(text))
            .join('')
    ));
}

function parseWorksheetRows(members, worksheetPath) {
    const worksheetBytes = members.get(worksheetPath);
    assert(worksheetBytes, `Independent XLSX reader should find ${worksheetPath}`);
    const sharedXml = members.get('xl/sharedStrings.xml')?.toString('utf8') || '';
    const sharedStrings = parseSharedStrings(sharedXml);
    const worksheetXml = worksheetBytes.toString('utf8');

    return [...worksheetXml.matchAll(/<row(?:\s[^>]*)?>([\s\S]*?)<\/row>/g)].map(([, rowXml]) => {
        const row = [];
        for (const cellMatch of rowXml.matchAll(/<c\s([^>]*)>([\s\S]*?)<\/c>/g)) {
            const [, attributes, cellXml] = cellMatch;
            const reference = attributes.match(/\br="([^"]+)"/)?.[1];
            if (!reference) continue;
            const type = attributes.match(/\bt="([^"]+)"/)?.[1] || 'n';
            const rawValue = cellXml.match(/<v(?:\s[^>]*)?>([\s\S]*?)<\/v>/)?.[1];
            const inlineValue = [...cellXml.matchAll(/<t(?:\s[^>]*)?>([\s\S]*?)<\/t>/g)]
                .map(([, text]) => decodeXml(text))
                .join('');
            let value = '';
            if (type === 's' && rawValue !== undefined) {
                value = sharedStrings[Number(rawValue)] ?? '';
            } else if (type === 'inlineStr') {
                value = inlineValue;
            } else if (type === 'str') {
                value = decodeXml(rawValue || '');
            } else if (rawValue !== undefined && rawValue !== '') {
                const numeric = Number(rawValue);
                value = Number.isFinite(numeric) ? numeric : decodeXml(rawValue);
            }
            row[columnIndex(reference)] = value;
        }
        return row;
    });
}

function recordsFromRows(rows, label) {
    const headers = rows[0];
    assert(headers?.length > 0, `${label} should expose headers`);
    return rows.slice(1).map(row => Object.fromEntries(
        headers.map((header, index) => [String(header), row[index] ?? ''])
    ));
}

function uniqueRecord(records, predicate, label) {
    const matches = records.filter(predicate);
    assertEqual(matches.length, 1, `${label} should resolve to one source record`);
    return matches[0];
}

function sourceNumber(records, territory, household, year, label) {
    const row = uniqueRecord(records, entry => (
        String(entry.Statistik).trim() === 'Verbraucherpreisindex für Deutschland'
        && String(entry.Gebiet).trim() === territory
        && String(entry.Merkmal_2).trim() === household
        && Number(entry.Jahr) === year
    ), label);
    const value = Number(row.Wert);
    assert(Number.isFinite(value), `${label} should be numeric`);
    return value;
}

function currentDestatisNumber(html, entryId, year) {
    const entryStart = html.indexOf(`id="${entryId}"`);
    assert(entryStart >= 0, `Destatis current snapshot should contain ${entryId}`);
    const tableStart = html.indexOf('<table', entryStart);
    const tableEnd = html.indexOf('</table>', tableStart);
    assert(tableStart >= 0 && tableEnd > tableStart, `${entryId} should contain a table`);
    const table = html.slice(tableStart, tableEnd);
    const value = table.match(new RegExp(
        `<th[^>]*>${year}</th>[\\s\\S]*?<td[^>]*>([^<]+)</td>`
    ))?.[1];
    const numeric = Number(String(value).trim().replace(',', '.'));
    assert(Number.isFinite(numeric), `${entryId}/${year} should contain a numeric annual value`);
    return numeric;
}

console.log('Test 1: all pinned source bytes retain their declared identities');
for (const [sourceId, sourcePath] of Object.entries(sourcePaths)) {
    assertEqual(
        sha256(fs.readFileSync(sourcePath)),
        GERMAN_CPI_RESEARCH_CHAIN.sourceFiles[sourceId].sha256,
        `${sourceId} should match the generated source identity`
    );
}
console.log('✓ source identities OK');

console.log('Test 2: an independent reader reconstructs all 101 annual rates');
const jstMembers = readZipMembers(fs.readFileSync(sourcePaths.jst));
const jstRows = parseWorksheetRows(jstMembers, 'xl/worksheets/sheet1.xml');
const jstHeaders = Object.fromEntries(jstRows[0].map((header, index) => [header, index]));
const jstLevels = new Map(
    jstRows.slice(1)
        .filter(row => row[jstHeaders.iso] === 'DEU')
        .map(row => [Number(row[jstHeaders.year]), Number(row[jstHeaders.cpi])])
);

const destatisMembers = readZipMembers(fs.readFileSync(sourcePaths.destatisLongSeries));
// The pinned workbook layout was independently inspected with artifact-tool:
// csv-611xx-01 and csv-611xx-02 are worksheet members 10 and 11.
const levelRecords = recordsFromRows(
    parseWorksheetRows(destatisMembers, 'xl/worksheets/sheet10.xml'),
    'Destatis annual levels'
);
const rateRecords = recordsFromRows(
    parseWorksheetRows(destatisMembers, 'xl/worksheets/sheet11.xml'),
    'Destatis annual rates'
);
const expectedRates = {};
for (let year = 1925; year <= 1949; year += 1) {
    const previous = jstLevels.get(year - 1);
    const current = jstLevels.get(year);
    assert(Number.isFinite(previous) && previous > 0, `JST ${year - 1} level should be positive`);
    assert(Number.isFinite(current) && current > 0, `JST ${year} level should be positive`);
    expectedRates[year] = ((current / previous) - 1) * 100;
}

const officialSegments = [
    {
        startYear: 1950,
        endYear: 1962,
        territory: 'Früheres Bundesgebiet',
        household: '4-Personen-Haushalte von Arbeitern und Angestellten mit mittlerem Einkommen'
    },
    {
        startYear: 1963,
        endYear: 1991,
        territory: 'Früheres Bundesgebiet',
        household: 'Alle privaten Haushalte'
    },
    {
        startYear: 1992,
        endYear: 2024,
        territory: 'Deutschland',
        household: 'Verbraucherpreisindex'
    }
];
let maximumRoundedLevelDriftPp = 0;
let minimumOneTickMutationDriftPp = Number.POSITIVE_INFINITY;
let officialCrossCheckCount = 0;
function recordOfficialCrossCheck(levelDerivedRate, publishedRate) {
    const signedDriftPp = levelDerivedRate - publishedRate;
    maximumRoundedLevelDriftPp = Math.max(
        maximumRoundedLevelDriftPp,
        Math.abs(signedDriftPp)
    );
    minimumOneTickMutationDriftPp = Math.min(
        minimumOneTickMutationDriftPp,
        Math.abs(signedDriftPp - 0.1),
        Math.abs(signedDriftPp + 0.1)
    );
    officialCrossCheckCount += 1;
}
for (const segment of officialSegments) {
    for (let year = segment.startYear; year <= segment.endYear; year += 1) {
        const label = `${segment.territory}/${segment.household}/${year}`;
        const publishedRate = sourceNumber(
            rateRecords,
            segment.territory,
            segment.household,
            year,
            `${label} published rate`
        );
        const priorLevel = sourceNumber(
            levelRecords,
            segment.territory,
            segment.household,
            year - 1,
            `${label} prior level`
        );
        const currentLevel = sourceNumber(
            levelRecords,
            segment.territory,
            segment.household,
            year,
            `${label} current level`
        );
        expectedRates[year] = publishedRate;
        recordOfficialCrossCheck(((currentLevel / priorLevel) - 1) * 100, publishedRate);
    }
}

const currentHtml = fs.readFileSync(sourcePaths.destatisCurrent, 'utf8');
const current2025Level = currentDestatisNumber(currentHtml, '236128', 2025);
const current2025Rate = currentDestatisNumber(currentHtml, '236130', 2025);
const longSeries2024Level = sourceNumber(
    levelRecords,
    'Deutschland',
    'Verbraucherpreisindex',
    2024,
    'Germany 2024 annual level'
);
expectedRates[2025] = current2025Rate;
recordOfficialCrossCheck(
    ((current2025Level / longSeries2024Level) - 1) * 100,
    current2025Rate
);

assertEqual(Object.keys(expectedRates).length, 101, 'Independent oracle should cover 1925-2025');
for (let year = 1925; year <= 2025; year += 1) {
    assertClose(
        GERMAN_CPI_INFLATION_RATES[year],
        expectedRates[year],
        1e-12,
        `${year} should equal the independent source oracle`
    );
}
assert(
    maximumRoundedLevelDriftPp > 0.049 && maximumRoundedLevelDriftPp <= 0.05,
    'The independently measured maximum official rounded-level drift should pass the 0.05 pp guard'
);
assertEqual(officialCrossCheckCount, 76, 'Every official 1950-2025 rate should participate in the guard proof');
assert(
    minimumOneTickMutationDriftPp > 0.05,
    'Every plus/minus 0.1 pp mutation of an official published rate should fail the 0.05 pp guard'
);
assertEqual(
    GERMAN_CPI_RESEARCH_CHAIN.validation.publishedRateVsRoundedLevelTolerancePp,
    0.05,
    'Generated metadata should expose the one-tick-discriminating official-rate guard'
);
console.log('✓ independent 101-year oracle and one-tick-discriminating 0.05 pp guard OK');

console.log('Test 3: proxy quantization and the 1949 currency-reform splice are explicit');
const proxyNormalizationFactor = 126 / jstLevels.get(1938);
for (let year = 1925; year <= 1948; year += 1) {
    const normalizedLevel = jstLevels.get(year) * proxyNormalizationFactor;
    assertClose(
        normalizedLevel,
        Math.round(normalizedLevel),
        1e-6,
        `${year} JST CPI proxy level should normalize to an integer`
    );
}
const normalized1949Level = jstLevels.get(1949) * proxyNormalizationFactor;
assert(
    Math.abs(normalized1949Level - Math.round(normalized1949Level)) > 1e-6,
    '1949 JST CPI endpoint should be the unique non-integer normalized splice level'
);
const official1948Level = sourceNumber(
    levelRecords,
    'Früheres Bundesgebiet',
    '4-Personen-Haushalte von Arbeitern und Angestellten mit mittlerem Einkommen',
    1948,
    'Official alternative 1948 level'
);
const official1949Level = sourceNumber(
    levelRecords,
    'Früheres Bundesgebiet',
    '4-Personen-Haushalte von Arbeitern und Angestellten mit mittlerem Einkommen',
    1949,
    'Official alternative 1949 level'
);
const officialAlternative1949Rate = ((official1949Level / official1948Level) - 1) * 100;
const reformMetadata = GERMAN_CPI_RESEARCH_CHAIN.proxyQualification.historicalDiscontinuities
    .find(entry => entry.year === 1949);
assertClose(officialAlternative1949Rate, -1.0526315789473717, 1e-12, 'Official 1949 alternative should be -1.0526%');
assertClose(
    reformMetadata.differencePp,
    GERMAN_CPI_INFLATION_RATES[1949] - officialAlternative1949Rate,
    1e-12,
    '1949 metadata should quantify the selected proxy-versus-official difference'
);
assert(
    GERMAN_CPI_RESEARCH_CHAIN.proxyQualification.historicalDiscontinuities
        .some(entry => entry.period?.startYear === 1936 && entry.period?.endYear === 1948),
    'Proxy qualification should name the price-control and wartime-freeze period'
);
const monetaryDiscontinuity = GERMAN_CPI_RESEARCH_CHAIN.proxyQualification
    .monetaryAssetDiscontinuity;
assertEqual(
    monetaryDiscontinuity.balanceConversion.nominalBalanceLossPct,
    93.5,
    'The 100:6.5 conversion should expose the nominal loss on major monetary balances'
);
assert(
    monetaryDiscontinuity.cpiProxyComparison.impliedPurchasingPowerLossPct > 36
        && monetaryDiscontinuity.cpiProxyComparison.impliedPurchasingPowerLossPct < 37,
    'The metadata should contrast the monetary write-down with the CPI-implied purchasing-power loss'
);
assert(
    monetaryDiscontinuity.interpretation.includes('not the nominal write-down'),
    'The proxy should explicitly reject continuous-currency monetary-asset interpretation across 1948'
);
console.log('✓ proxy limitations and 1949 splice OK');

console.log('Test 4: production verification remains read-only');
{
    const outputPath = path.join(projectRoot, 'app', 'simulator', 'german-cpi-chain.js');
    const outputHashBefore = sha256(fs.readFileSync(outputPath));
    const scriptPath = path.join(projectRoot, 'scripts', 'build-german-cpi-chain.mjs');
    const result = spawnSync(process.execPath, [scriptPath, '--verify-only'], {
        cwd: projectRoot,
        encoding: 'utf8',
        windowsHide: true
    });

    assertEqual(result.status, 0, `Production verification should succeed: ${result.stderr}`);
    assert(
        result.stdout.includes('Verified German CPI originals and generated module without writing files.'),
        'Production verification should confirm the no-write gate'
    );
    assertEqual(sha256(fs.readFileSync(outputPath)), outputHashBefore, 'Verification must not rewrite the module');
}
console.log('✓ production read-only gate OK');

console.log('✅ German CPI independent source reconstruction tests passed');
