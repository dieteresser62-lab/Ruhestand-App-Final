import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import { GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS } from '../app/simulator/gold-german-investor-chain.js';

console.log('--- Gold German-Investor Independent Full Oracle Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(directory, '..');
const source = {
    jst: path.join(root, 'data', 'historical', 'global-equity-research-chain', 'originals', 'JSTdatasetR6.xlsx'),
    goldDem: path.join(root, 'data', 'historical', 'gold-german-investor-chain', 'originals', 'bundesbank-frankfurt-gold-annual-1968-1998.csv'),
    usdEur: path.join(root, 'data', 'historical', 'gold-german-investor-chain', 'originals', 'bundesbank-usd-eur-annual-1999-2025.csv'),
    goldUsd: path.join(root, 'data', 'historical', 'gold-german-investor-chain', 'originals', 'world-bank-cmo-historical-data-annual-2026-07.xlsx')
};

function unzipByCentralDirectory(buffer) {
    let eocd = -1;
    for (let cursor = buffer.length - 22; cursor >= Math.max(0, buffer.length - 65557); cursor -= 1) {
        if (buffer.readUInt32LE(cursor) === 0x06054b50) {
            eocd = cursor;
            break;
        }
    }
    if (eocd < 0) throw new Error('Independent oracle: ZIP directory is missing');
    const fileCount = buffer.readUInt16LE(eocd + 10);
    let cursor = buffer.readUInt32LE(eocd + 16);
    const files = new Map();
    for (let index = 0; index < fileCount; index += 1) {
        if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Independent oracle: invalid ZIP directory entry');
        const method = buffer.readUInt16LE(cursor + 10);
        const packedSize = buffer.readUInt32LE(cursor + 20);
        const unpackedSize = buffer.readUInt32LE(cursor + 24);
        const nameLength = buffer.readUInt16LE(cursor + 28);
        const extraLength = buffer.readUInt16LE(cursor + 30);
        const commentLength = buffer.readUInt16LE(cursor + 32);
        const localOffset = buffer.readUInt32LE(cursor + 42);
        const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);
        if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Independent oracle: invalid local header ${name}`);
        const localNameLength = buffer.readUInt16LE(localOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localOffset + 28);
        const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
        const packed = buffer.subarray(dataOffset, dataOffset + packedSize);
        const unpacked = method === 0
            ? Buffer.from(packed)
            : method === 8
                ? zlib.inflateRawSync(packed)
                : null;
        if (!unpacked || unpacked.length !== unpackedSize) throw new Error(`Independent oracle: unsupported or invalid ZIP entry ${name}`);
        files.set(name, unpacked);
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    return files;
}

function xmlDecode(text) {
    return text
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&amp;/g, '&')
        .replace(/&#(\d+);/g, (_whole, digits) => String.fromCodePoint(Number(digits)))
        .replace(/&#x([0-9a-f]+);/gi, (_whole, digits) => String.fromCodePoint(Number.parseInt(digits, 16)));
}

function columnNumber(reference) {
    let result = 0;
    for (const letter of reference.match(/^[A-Z]+/)?.[0] || '') result = result * 26 + letter.charCodeAt(0) - 64;
    return result - 1;
}

function independentlyReadSheet(filePath, sheetName) {
    const files = unzipByCentralDirectory(fs.readFileSync(filePath));
    const workbook = files.get('xl/workbook.xml')?.toString('utf8') || '';
    const relationships = files.get('xl/_rels/workbook.xml.rels')?.toString('utf8') || '';
    const sheetTag = [...workbook.matchAll(/<sheet\s+([^>]+?)\/>/g)]
        .map(match => match[1])
        .find(attributes => xmlDecode(attributes.match(/\bname="([^"]+)"/)?.[1] || '') === sheetName);
    const relationshipId = sheetTag?.match(/\br:id="([^"]+)"/)?.[1];
    const relationshipTag = [...relationships.matchAll(/<Relationship\s+([^>]+?)\/>/g)]
        .map(match => match[1])
        .find(attributes => attributes.match(/\bId="([^"]+)"/)?.[1] === relationshipId);
    let target = relationshipTag?.match(/\bTarget="([^"]+)"/)?.[1];
    if (!target) throw new Error(`Independent oracle: sheet ${sheetName} is missing`);
    target = target.startsWith('/') ? target.slice(1) : path.posix.normalize(path.posix.join('xl', target));
    const worksheet = files.get(target)?.toString('utf8');
    if (!worksheet) throw new Error(`Independent oracle: sheet XML ${target} is missing`);

    const sharedXml = files.get('xl/sharedStrings.xml')?.toString('utf8') || '';
    const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => (
        [...match[1].matchAll(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g)]
            .map(part => xmlDecode(part[1]))
            .join('')
    ));

    return [...worksheet.matchAll(/<row(?:\s+[^>]*)?>([\s\S]*?)<\/row>/g)].map(rowMatch => {
        const row = [];
        for (const cellMatch of rowMatch[1].matchAll(/<c(?:\s+([^>]*))?>([\s\S]*?)<\/c>/g)) {
            const attributes = cellMatch[1] || '';
            const cellBody = cellMatch[2];
            const reference = attributes.match(/\br="([^"]+)"/)?.[1];
            if (!reference) continue;
            const type = attributes.match(/\bt="([^"]+)"/)?.[1];
            const raw = cellBody.match(/<v>([\s\S]*?)<\/v>/)?.[1];
            let value = '';
            if (type === 'inlineStr') {
                value = [...cellBody.matchAll(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g)]
                    .map(part => xmlDecode(part[1]))
                    .join('');
            } else if (raw !== undefined) {
                value = type === 's' ? shared[Number(raw)] : xmlDecode(raw);
            }
            row[columnNumber(reference)] = value;
        }
        return row;
    });
}

function independentJstFx() {
    const rows = independentlyReadSheet(source.jst, 'Sheet1');
    const yearColumn = rows[0].indexOf('year');
    const countryColumn = rows[0].indexOf('iso');
    const fxColumn = rows[0].indexOf('xrusd');
    const values = {};
    for (const row of rows.slice(1)) {
        const year = Number(row[yearColumn]);
        if (row[countryColumn] === 'DEU' && year >= 1924 && year <= 1967 && row[fxColumn] !== '') {
            values[year] = Number(row[fxColumn]);
        }
    }
    return values;
}

function independentCsvValues(filePath, expectedId) {
    const rows = fs.readFileSync(filePath, 'utf8').replace(/^\uFEFF/, '').trim().split(/\r?\n/).map(line => line.split(';'));
    const header = rows.shift();
    const idColumn = header.indexOf('BBK_ID');
    const yearColumn = header.indexOf('TIME_PERIOD');
    const valueColumn = header.indexOf('OBS_VALUE');
    return Object.fromEntries(rows.map(row => {
        if (row[idColumn] !== expectedId) throw new Error(`Independent oracle: unexpected series ${row[idColumn]}`);
        return [Number(row[yearColumn]), Number(row[valueColumn])];
    }));
}

function independentWorldBankGold() {
    const rows = independentlyReadSheet(source.goldUsd, 'Annual Prices (Nominal)');
    const headerIndex = rows.findIndex(row => row.includes('Gold'));
    const goldColumn = rows[headerIndex].indexOf('Gold');
    return Object.fromEntries(rows.slice(headerIndex + 2)
        .map(row => [Number(row[0]), Number(row[goldColumn])])
        .filter(([year, value]) => Number.isInteger(year) && year >= 1999 && year <= 2025 && Number.isFinite(value)));
}

function usdPolicyPrice(year) {
    if (year <= 1932) return 20.67;
    if (year === 1933) return 34.06;
    return 35;
}

function pct(current, previous) {
    const value = ((current / previous) - 1) * 100;
    return Object.is(value, -0) ? 0 : value;
}

console.log('Test 1: a second source parser reconstructs every annual gold return');
const jstFx = independentJstFx();
const goldDem = independentCsvValues(source.goldDem, 'BBEX3.A.XAU.DEM.EA.AC.C03');
const usdEur = independentCsvValues(source.usdEur, 'BBEX3.A.USD.EUR.BB.AC.A04');
const goldUsd = independentWorldBankGold();
const expected = {};
for (let year = 1925; year <= 1944; year += 1) {
    expected[year] = pct(usdPolicyPrice(year) * jstFx[year], usdPolicyPrice(year - 1) * jstFx[year - 1]);
}
for (let year = 1945; year <= 1950; year += 1) expected[year] = 0;
for (let year = 1951; year <= 1967; year += 1) {
    expected[year] = pct(usdPolicyPrice(year) * jstFx[year], usdPolicyPrice(year - 1) * jstFx[year - 1]);
}
const ouncesPerKilogram = 32.15074656862798;
const demPerEuro = 1.95583;
expected[1968] = pct(goldDem[1968], usdPolicyPrice(1967) * jstFx[1967] * ouncesPerKilogram);
for (let year = 1969; year <= 1998; year += 1) expected[year] = pct(goldDem[year], goldDem[year - 1]);
expected[1999] = pct(goldUsd[1999] / usdEur[1999], goldDem[1998] / demPerEuro / ouncesPerKilogram);
for (let year = 2000; year <= 2025; year += 1) {
    expected[year] = pct(goldUsd[year] / usdEur[year], goldUsd[year - 1] / usdEur[year - 1]);
}

assertEqual(Object.keys(expected).length, 101, 'Independent oracle should cover all 101 years');
for (let year = 1925; year <= 2025; year += 1) {
    assert(Number.isFinite(expected[year]), `${year} independent oracle value should be finite`);
    assertClose(GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS[year], expected[year], 1e-12, `${year} generated return should match the independent full oracle`);
}
console.log('✓ independent 101-year content oracle OK');

console.log('✅ Gold German-investor independent full oracle tests passed');
