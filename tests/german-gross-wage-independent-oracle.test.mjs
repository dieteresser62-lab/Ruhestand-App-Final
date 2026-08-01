import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
    GERMAN_GROSS_WAGE_GROWTH_CHAIN,
    GERMAN_GROSS_WAGE_GROWTH_PCT
} from '../app/simulator/german-gross-wage-growth-chain.js';

console.log('--- German Gross-Wage Independent Full Oracle Tests ---');

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const destatisPath = path.join(
    root,
    'data',
    'historical',
    'german-gross-wage-growth-chain',
    'originals',
    'destatis-bruttomonatsverdienst-index-2026-08-01.html'
);
const jstPath = path.join(
    root,
    'data',
    'historical',
    'global-equity-research-chain',
    'originals',
    'JSTdatasetR6.xlsx'
);

function unzipByCentralDirectory(buffer) {
    let eocd = -1;
    for (let cursor = buffer.length - 22; cursor >= Math.max(0, buffer.length - 65557); cursor -= 1) {
        if (buffer.readUInt32LE(cursor) === 0x06054b50) {
            eocd = cursor;
            break;
        }
    }
    if (eocd < 0) throw new Error('Independent wage oracle: JST ZIP directory is missing');
    const fileCount = buffer.readUInt16LE(eocd + 10);
    let cursor = buffer.readUInt32LE(eocd + 16);
    const files = new Map();
    for (let index = 0; index < fileCount; index += 1) {
        if (buffer.readUInt32LE(cursor) !== 0x02014b50) throw new Error('Independent wage oracle: invalid ZIP directory entry');
        const method = buffer.readUInt16LE(cursor + 10);
        const packedSize = buffer.readUInt32LE(cursor + 20);
        const unpackedSize = buffer.readUInt32LE(cursor + 24);
        const nameLength = buffer.readUInt16LE(cursor + 28);
        const extraLength = buffer.readUInt16LE(cursor + 30);
        const commentLength = buffer.readUInt16LE(cursor + 32);
        const localOffset = buffer.readUInt32LE(cursor + 42);
        const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength);
        if (buffer.readUInt32LE(localOffset) !== 0x04034b50) throw new Error(`Independent wage oracle: invalid local header ${name}`);
        const localNameLength = buffer.readUInt16LE(localOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localOffset + 28);
        const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
        const packed = buffer.subarray(dataOffset, dataOffset + packedSize);
        const unpacked = method === 0
            ? Buffer.from(packed)
            : method === 8
                ? zlib.inflateRawSync(packed)
                : null;
        if (!unpacked || unpacked.length !== unpackedSize) throw new Error(`Independent wage oracle: unsupported or invalid ZIP entry ${name}`);
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

function independentlyReadJstRows() {
    const files = unzipByCentralDirectory(fs.readFileSync(jstPath));
    const sharedXml = files.get('xl/sharedStrings.xml')?.toString('utf8') || '';
    const worksheet = files.get('xl/worksheets/sheet1.xml')?.toString('utf8') || '';
    if (!sharedXml || !worksheet) throw new Error('Independent wage oracle: JST sheet XML is missing');
    const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => (
        [...match[1].matchAll(/<t(?:\s+[^>]*)?>([\s\S]*?)<\/t>/g)]
            .map(part => xmlDecode(part[1]))
            .join('')
    ));
    return [...worksheet.matchAll(/<row(?:\s+[^>]*)?>([\s\S]*?)<\/row>/g)].map(rowMatch => {
        const row = [];
        for (const cellMatch of rowMatch[1].matchAll(/<c(?:\s+([^>]*))?>([\s\S]*?)<\/c>/g)) {
            const attributes = cellMatch[1] || '';
            const reference = attributes.match(/\br="([^"]+)"/)?.[1];
            const raw = cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
            if (!reference || raw === undefined) continue;
            row[columnNumber(reference)] = attributes.match(/\bt="([^"]+)"/)?.[1] === 's'
                ? shared[Number(raw)]
                : xmlDecode(raw);
        }
        return row;
    });
}

function tagName(rawTag) {
    let cursor = rawTag[0] === '/' ? 1 : 0;
    while (cursor < rawTag.length && /\s/.test(rawTag[cursor])) cursor += 1;
    let name = '';
    while (cursor < rawTag.length && /[A-Za-z0-9]/.test(rawTag[cursor])) {
        name += rawTag[cursor].toLowerCase();
        cursor += 1;
    }
    return name;
}

function decodeHtmlCell(text) {
    return text
        .replace(/&nbsp;/g, ' ')
        .replace(/&minus;/g, '-')
        .replace(/&amp;/g, '&')
        .replace(/&#(\d+);/g, (_whole, digits) => String.fromCodePoint(Number(digits)))
        .replace(/\s+/g, ' ')
        .trim();
}

function independentlyTokenizeHtmlRows(html) {
    const rows = [];
    let row = null;
    let cell = null;
    let cursor = 0;
    while (cursor < html.length) {
        const tagStart = html.indexOf('<', cursor);
        const textEnd = tagStart < 0 ? html.length : tagStart;
        if (cell !== null && textEnd > cursor) cell += html.slice(cursor, textEnd);
        if (tagStart < 0) break;
        const tagEnd = html.indexOf('>', tagStart + 1);
        if (tagEnd < 0) throw new Error('Independent wage oracle: unterminated HTML tag');
        const rawTag = html.slice(tagStart + 1, tagEnd);
        const closing = rawTag.trimStart().startsWith('/');
        const name = tagName(rawTag.trimStart());
        if (!closing && name === 'tr') {
            row = [];
        } else if (!closing && name === 'td' && row !== null) {
            cell = '';
        } else if (closing && name === 'td' && row !== null && cell !== null) {
            row.push(decodeHtmlCell(cell));
            cell = null;
        } else if (closing && name === 'tr' && row !== null) {
            rows.push(row);
            row = null;
            cell = null;
        }
        cursor = tagEnd + 1;
    }
    return rows;
}

function independentlyReadDestatisChanges() {
    const rows = independentlyTokenizeHtmlRows(fs.readFileSync(destatisPath, 'utf8'));
    const observations = new Map();
    for (const cells of rows) {
        if (cells.length !== 3) continue;
        const year = Number(cells[0]);
        if (!Number.isInteger(year) || year < 1946 || year > 2025) continue;
        const indexLevel = Number(cells[1].replace(',', '.'));
        const annualChangePct = cells[2] === '-'
            ? null
            : Number(cells[2].replace(',', '.'));
        if (!Number.isFinite(indexLevel) || (year > 1946 && !Number.isFinite(annualChangePct))) {
            throw new Error(`Independent wage oracle: invalid Destatis row ${year}`);
        }
        if (observations.has(year)) throw new Error(`Independent wage oracle: duplicate Destatis year ${year}`);
        observations.set(year, { indexLevel, annualChangePct });
    }
    return observations;
}

console.log('Test 1: independent JST level oracle covers every proxy year');
const jstRows = independentlyReadJstRows();
const headers = jstRows[0];
const yearColumn = headers.indexOf('year');
const isoColumn = headers.indexOf('iso');
const wageColumn = headers.indexOf('wage');
assert(yearColumn >= 0 && isoColumn >= 0 && wageColumn >= 0, 'Independent JST oracle should locate named columns');
const jstLevels = Object.fromEntries(jstRows.slice(1)
    .filter(row => row[isoColumn] === 'DEU' && Number(row[yearColumn]) >= 1924 && Number(row[yearColumn]) <= 1946)
    .map(row => [Number(row[yearColumn]), Number(row[wageColumn])]));
assertEqual(Object.keys(jstLevels).length, 23, 'Independent JST oracle should contain 1924-1946 levels');
for (let year = 1925; year <= 1946; year += 1) {
    const expected = ((jstLevels[year] / jstLevels[year - 1]) - 1) * 100;
    assertClose(GERMAN_GROSS_WAGE_GROWTH_PCT[year], expected, 1e-12, `${year} should match the independently derived JST wage change`);
}
console.log('✓ independent JST proxy oracle OK');

console.log('Test 2: state-machine HTML oracle covers all 79 published changes');
const destatis = independentlyReadDestatisChanges();
assertEqual(destatis.size, 80, 'Independent HTML tokenizer should locate all 1946-2025 observations');
assertEqual(destatis.get(1946).annualChangePct, null, '1946 source dash should remain missing rather than zero');
for (let year = 1947; year <= 2025; year += 1) {
    assertEqual(GERMAN_GROSS_WAGE_GROWTH_PCT[year], destatis.get(year).annualChangePct, `${year} should match the independently tokenized Destatis change`);
    assertEqual(
        GERMAN_GROSS_WAGE_GROWTH_CHAIN.observationsByYear[year].sourceObservation.indexLevel,
        destatis.get(year).indexLevel,
        `${year} should retain the independent published index-level oracle`
    );
}
console.log('✓ independent 79-year Destatis oracle OK');

console.log('✅ German gross-wage independent full oracle tests passed');
