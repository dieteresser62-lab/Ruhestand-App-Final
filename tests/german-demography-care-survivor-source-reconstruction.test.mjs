import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

import {
    GERMAN_DEMOGRAPHY_CARE_SURVIVOR_CONTRACT,
    MORTALITY_TABLE
} from '../app/simulator/german-demography-care-survivor-contract.js';

console.log('--- German Demography/Care Independent Source Reconstruction Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const sourceDirectory = path.join(
    directory,
    '..',
    'data',
    'static',
    'german-demography-care-survivor-contract',
    'originals'
);

function sourceOracleFailure(message) {
    throw new Error(`Independent source oracle: ${message}`);
}

function decodeXml(value) {
    return String(value ?? '')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'")
        .replaceAll('&amp;', '&');
}

function readZipEntries(buffer) {
    let endOffset = -1;
    for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65557); offset -= 1) {
        if (buffer.readUInt32LE(offset) === 0x06054b50) {
            endOffset = offset;
            break;
        }
    }
    if (endOffset < 0) sourceOracleFailure('ZIP directory terminator is missing');
    const count = buffer.readUInt16LE(endOffset + 10);
    let cursor = buffer.readUInt32LE(endOffset + 16);
    const entries = new Map();
    for (let index = 0; index < count; index += 1) {
        if (buffer.readUInt32LE(cursor) !== 0x02014b50) sourceOracleFailure('ZIP central entry is invalid');
        const method = buffer.readUInt16LE(cursor + 10);
        const compressedSize = buffer.readUInt32LE(cursor + 20);
        const expectedSize = buffer.readUInt32LE(cursor + 24);
        const nameLength = buffer.readUInt16LE(cursor + 28);
        const extraLength = buffer.readUInt16LE(cursor + 30);
        const commentLength = buffer.readUInt16LE(cursor + 32);
        const localOffset = buffer.readUInt32LE(cursor + 42);
        const name = buffer.toString('utf8', cursor + 46, cursor + 46 + nameLength).replaceAll('\\', '/');
        const localNameLength = buffer.readUInt16LE(localOffset + 26);
        const localExtraLength = buffer.readUInt16LE(localOffset + 28);
        const dataOffset = localOffset + 30 + localNameLength + localExtraLength;
        const compressed = buffer.subarray(dataOffset, dataOffset + compressedSize);
        const value = method === 0 ? Buffer.from(compressed) : zlib.inflateRawSync(compressed);
        if (value.length !== expectedSize) sourceOracleFailure(`${name} size mismatch`);
        entries.set(name, value);
        cursor += 46 + nameLength + extraLength + commentLength;
    }
    return entries;
}

function columnIndex(reference) {
    const letters = reference.match(/^[A-Z]+/)?.[0];
    let result = 0;
    for (const letter of letters ?? '') result = (result * 26) + letter.charCodeAt(0) - 64;
    return result - 1;
}

function parseWorksheet(entries, sheetPath) {
    const sharedXml = entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
    const shared = [...sharedXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(item => (
        [...item[1].matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)]
            .map(text => decodeXml(text[1]))
            .join('')
    ));
    const sheetXml = entries.get(sheetPath)?.toString('utf8');
    if (!sheetXml) sourceOracleFailure(`${sheetPath} is missing`);
    const rows = new Map();
    for (const rowMatch of sheetXml.matchAll(/<row\b([^>]*)>([\s\S]*?)<\/row>/g)) {
        const rowNumber = Number(rowMatch[1].match(/\br="(\d+)"/)?.[1]);
        const row = [];
        const nonEmptyCells = rowMatch[2].replace(/<c\b[^>]*\/>/g, '');
        for (const cellMatch of nonEmptyCells.matchAll(/<c\b([^>]*)>([\s\S]*?)<\/c>/g)) {
            const reference = cellMatch[1].match(/\br="([^"]+)"/)?.[1];
            const rawValue = cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
            if (!reference || rawValue === undefined) continue;
            row[columnIndex(reference)] = /\bt="s"/.test(cellMatch[1])
                ? shared[Number(rawValue)]
                : decodeXml(rawValue);
        }
        rows.set(rowNumber, row);
    }
    return rows;
}

function rowsAsRecords(rows) {
    const header = rows.get(1);
    return [...rows.entries()]
        .filter(([rowNumber]) => rowNumber > 1)
        .map(([_rowNumber, row]) => Object.fromEntries(header.map((name, index) => [name, row[index] ?? ''])));
}

const mortalityPath = path.join(sourceDirectory, 'destatis-period-life-table-2023-2025.xlsx');
const carePath = path.join(sourceDirectory, 'destatis-care-statistics-2023.xlsx');
const mortalityBuffer = fs.readFileSync(mortalityPath);
const careBuffer = fs.readFileSync(carePath);

console.log('Test 1: independent raw hashes match the generated source contract');
assertEqual(
    createHash('sha256').update(mortalityBuffer).digest('hex'),
    GERMAN_DEMOGRAPHY_CARE_SURVIVOR_CONTRACT.sourceFiles.mortality.sha256,
    'Independent mortality source hash should match'
);
assertEqual(
    createHash('sha256').update(careBuffer).digest('hex'),
    GERMAN_DEMOGRAPHY_CARE_SURVIVOR_CONTRACT.sourceFiles.care.sha256,
    'Independent care source hash should match'
);
console.log('✓ independent raw hashes OK');

console.log('Test 2: all 166 official runtime qx values reconstruct independently');
const mortalityEntries = readZipEntries(mortalityBuffer);
const mortalitySheets = { m: 'xl/worksheets/sheet28.xml', w: 'xl/worksheets/sheet29.xml' };
let comparedMortalityValues = 0;
for (const [sex, sheetPath] of Object.entries(mortalitySheets)) {
    const records = rowsAsRecords(parseWorksheet(mortalityEntries, sheetPath));
    assertEqual(records.length, 101, `${sex} source sheet should contain ages 0-100`);
    for (const record of records) {
        const age = Number(record['Alter ']);
        if (age < 18) continue;
        assertEqual(record.Statistik, 'Sterbetafel', `${sex} age ${age} should keep table identity`);
        assertEqual(record.Gebiet, 'Deutschland', `${sex} age ${age} should keep territory`);
        assertEqual(record.Jahre, '2023/2025', `${sex} age ${age} should keep period`);
        assertClose(
            MORTALITY_TABLE[sex][age],
            Number(record.qx),
            1e-15,
            `${sex} age ${age} qx should reconstruct from the independent parser`
        );
        comparedMortalityValues += 1;
    }
}
assertEqual(comparedMortalityValues, 166, 'Independent oracle should compare both sexes for ages 18-100');
console.log('✓ all official runtime qx values reconstruct independently');

console.log('Test 3: independent care stock and prevalence markers match the contract');
const careEntries = readZipEntries(careBuffer);
const stockRows = parseWorksheet(careEntries, 'xl/worksheets/sheet6.xml');
const prevalenceRows = parseWorksheet(careEntries, 'xl/worksheets/sheet7.xml');
const observation = GERMAN_DEMOGRAPHY_CARE_SURVIVOR_CONTRACT.care.officialObservation;
assertEqual(Number(stockRows.get(10)[2]), observation.totalCareRecipients, 'Total care-recipient stock should reconstruct');
for (let grade = 1; grade <= 5; grade += 1) {
    assertEqual(
        Number(stockRows.get(33 + grade)[2]),
        observation.countsByGrade[grade],
        `Care-grade ${grade} stock should reconstruct`
    );
}
const prevalenceRowNumbers = {
    overall: [25, 26, 27, 28, 29, 30, 31],
    m: [47, 48, 49, 50, 51, 52, 53],
    w: [69, 70, 71, 72, 73, 74, 75]
};
const markerAges = [65, 70, 75, 80, 85, 90, 95];
for (const [sex, rowNumbers] of Object.entries(prevalenceRowNumbers)) {
    for (let index = 0; index < markerAges.length; index += 1) {
        const age = markerAges[index];
        assertEqual(
            Number(prevalenceRows.get(rowNumbers[index])[8]),
            observation.observedPrevalencePctBySexAndAgeBand[sex][age],
            `${sex} care prevalence at model age ${age} should reconstruct`
        );
    }
}
console.log('✓ independent care stock and prevalence markers OK');

console.log('✅ German demography/care independent source reconstruction tests passed');
