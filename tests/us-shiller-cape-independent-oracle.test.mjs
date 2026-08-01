import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { US_SHILLER_CAPE_BY_RETURN_YEAR, US_SHILLER_CAPE_CHAIN } from '../app/simulator/us-shiller-cape-chain.js';
import { canonicalizeHistoricalContractValue } from '../app/simulator/historical-backtest-contract.js';

console.log('--- Independent US Shiller CAPE Source Oracle Tests ---');

const projectRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(
    projectRoot,
    'data',
    'historical',
    'us-shiller-cape-chain',
    'originals',
    'shiller-ie-data-2026-08-01.xls'
);
const source = fs.readFileSync(sourcePath);
const END_OF_CHAIN = 0xfffffffe;
const FREE_SECTOR = 0xffffffff;

function sha256(value) {
    return createHash('sha256').update(value).digest('hex');
}

function ensure(condition, message) {
    if (!condition) throw new Error(`Independent CAPE oracle: ${message}`);
}

function workbookStreamFromOle(bytes) {
    ensure(bytes.subarray(0, 8).equals(Buffer.from('d0cf11e0a1b11ae1', 'hex')), 'source should be an OLE compound file');
    const sectorSize = 2 ** bytes.readUInt16LE(30);
    ensure(sectorSize === 512, 'independent oracle supports the pinned workbook sector geometry');
    ensure(bytes.readUInt32LE(72) === 0, 'pinned workbook should not require chained DIFAT sectors');

    const fatSectorCount = bytes.readUInt32LE(44);
    const fatSectorIds = [];
    for (let index = 0; index < fatSectorCount; index += 1) {
        const sectorId = bytes.readUInt32LE(76 + index * 4);
        ensure(sectorId !== FREE_SECTOR, `FAT sector ${index} should be declared in the header DIFAT`);
        fatSectorIds.push(sectorId);
    }
    const fatEntries = [];
    for (const sectorId of fatSectorIds) {
        const offset = (sectorId + 1) * sectorSize;
        ensure(offset + sectorSize <= bytes.length, 'FAT sector should remain inside the source');
        for (let cursor = offset; cursor < offset + sectorSize; cursor += 4) {
            fatEntries.push(bytes.readUInt32LE(cursor));
        }
    }

    const readRegularChain = (firstSector, label) => {
        const chunks = [];
        const seen = new Set();
        for (let sectorId = firstSector; sectorId !== END_OF_CHAIN; sectorId = fatEntries[sectorId]) {
            ensure(Number.isInteger(sectorId) && sectorId >= 0 && sectorId < fatEntries.length, `${label} sector should be addressable`);
            ensure(!seen.has(sectorId), `${label} should not contain a sector cycle`);
            seen.add(sectorId);
            const offset = (sectorId + 1) * sectorSize;
            ensure(offset + sectorSize <= bytes.length, `${label} sector should remain inside the source`);
            chunks.push(bytes.subarray(offset, offset + sectorSize));
        }
        return Buffer.concat(chunks);
    };

    const directory = readRegularChain(bytes.readUInt32LE(48), 'directory');
    let workbook = null;
    for (let offset = 0; offset + 128 <= directory.length; offset += 128) {
        const nameByteLength = directory.readUInt16LE(offset + 64);
        const type = directory.readUInt8(offset + 66);
        if (type !== 2 || nameByteLength < 2 || nameByteLength > 64) continue;
        const name = directory.subarray(offset, offset + nameByteLength - 2).toString('utf16le');
        if (name !== 'Workbook' && name !== 'Book') continue;
        const streamSize = Number(directory.readBigUInt64LE(offset + 120));
        ensure(streamSize >= bytes.readUInt32LE(56), 'pinned workbook stream should use regular FAT sectors');
        const stream = readRegularChain(directory.readUInt32LE(offset + 116), 'workbook');
        workbook = stream.subarray(0, streamSize);
        break;
    }
    ensure(workbook, 'Workbook stream should be present in the OLE directory');
    return workbook;
}

function dataSheetOffset(workbook) {
    for (let offset = 0; offset + 4 <= workbook.length;) {
        const recordId = workbook.readUInt16LE(offset);
        const recordLength = workbook.readUInt16LE(offset + 2);
        const payload = offset + 4;
        ensure(payload + recordLength <= workbook.length, 'global BIFF record should remain inside the stream');
        if (recordId === 0x0085) {
            const nameLength = workbook.readUInt8(payload + 6);
            const flags = workbook.readUInt8(payload + 7);
            const isWide = (flags & 1) !== 0;
            const nameStart = payload + 8;
            const name = workbook.subarray(nameStart, nameStart + nameLength * (isWide ? 2 : 1))
                .toString(isWide ? 'utf16le' : 'latin1');
            if (name === 'Data') return workbook.readUInt32LE(payload);
        }
        offset = payload + recordLength;
        if (recordId === 0x000a) break;
    }
    throw new Error('Assertion failed: Data worksheet should be listed in the workbook globals');
}

function sharedStringsFromGlobals(workbook) {
    for (let offset = 0; offset + 4 <= workbook.length;) {
        const recordId = workbook.readUInt16LE(offset);
        const recordLength = workbook.readUInt16LE(offset + 2);
        const payload = offset + 4;
        ensure(payload + recordLength <= workbook.length, 'global string record should remain inside the stream');
        if (recordId === 0x00fc) {
            const data = workbook.subarray(payload, payload + recordLength);
            const uniqueCount = data.readUInt32LE(4);
            const strings = [];
            let cursor = 8;
            for (let index = 0; index < uniqueCount; index += 1) {
                const characterCount = data.readUInt16LE(cursor);
                const flags = data.readUInt8(cursor + 2);
                cursor += 3;
                const richRuns = (flags & 8) !== 0 ? data.readUInt16LE(cursor) : 0;
                if ((flags & 8) !== 0) cursor += 2;
                const extendedBytes = (flags & 4) !== 0 ? data.readUInt32LE(cursor) : 0;
                if ((flags & 4) !== 0) cursor += 4;
                const wide = (flags & 1) !== 0;
                const stringBytes = characterCount * (wide ? 2 : 1);
                ensure(cursor + stringBytes + richRuns * 4 + extendedBytes <= data.length, 'shared string should remain inside SST');
                strings.push(data.subarray(cursor, cursor + stringBytes).toString(wide ? 'utf16le' : 'latin1'));
                cursor += stringBytes + richRuns * 4 + extendedBytes;
            }
            ensure(cursor === data.length, 'independent SST decoder should consume the complete record');
            return strings;
        }
        offset = payload + recordLength;
        if (recordId === 0x000a) break;
    }
    throw new Error('Independent CAPE oracle: SST record is missing');
}

function textCellsFromDataSheet(workbook, startOffset, sharedStrings) {
    const rows = new Map();
    for (let offset = startOffset; offset + 4 <= workbook.length;) {
        const recordId = workbook.readUInt16LE(offset);
        const recordLength = workbook.readUInt16LE(offset + 2);
        const payload = offset + 4;
        ensure(payload + recordLength <= workbook.length, 'worksheet string record should remain inside the stream');
        if (recordId === 0x00fd && recordLength >= 10) {
            const row = workbook.readUInt16LE(payload);
            const column = workbook.readUInt16LE(payload + 2);
            const stringIndex = workbook.readUInt32LE(payload + 6);
            ensure(typeof sharedStrings[stringIndex] === 'string', 'LABELSST should reference a decoded string');
            if (!rows.has(row)) rows.set(row, new Map());
            rows.get(row).set(column, sharedStrings[stringIndex]);
        }
        offset = payload + recordLength;
        if (recordId === 0x000a) break;
    }
    return rows;
}

function decodeRk(raw) {
    let value;
    if ((raw & 2) !== 0) {
        value = raw >> 2;
    } else {
        const doubleBytes = Buffer.alloc(8);
        doubleBytes.writeUInt32LE(raw & 0xfffffffc, 4);
        value = doubleBytes.readDoubleLE(0);
    }
    return (raw & 1) !== 0 ? value / 100 : value;
}

function numericCellsFromDataSheet(workbook, startOffset) {
    const rows = new Map();
    const put = (rowIndex, columnIndex, value) => {
        if (!Number.isFinite(value)) return;
        if (!rows.has(rowIndex)) rows.set(rowIndex, new Map());
        rows.get(rowIndex).set(columnIndex, value);
    };

    for (let offset = startOffset; offset + 4 <= workbook.length;) {
        const recordId = workbook.readUInt16LE(offset);
        const recordLength = workbook.readUInt16LE(offset + 2);
        const payload = offset + 4;
        ensure(payload + recordLength <= workbook.length, 'worksheet BIFF record should remain inside the stream');
        if (recordId === 0x0203 && recordLength >= 14) {
            put(workbook.readUInt16LE(payload), workbook.readUInt16LE(payload + 2), workbook.readDoubleLE(payload + 6));
        } else if (recordId === 0x027e && recordLength >= 10) {
            put(workbook.readUInt16LE(payload), workbook.readUInt16LE(payload + 2), decodeRk(workbook.readUInt32LE(payload + 6)));
        } else if (recordId === 0x0006 && recordLength >= 14) {
            const cachedResult = workbook.subarray(payload + 6, payload + 14);
            const isNonNumeric = cachedResult.readUInt16LE(0) === 0xffff
                && cachedResult.readUInt16LE(6) === 0xffff;
            if (!isNonNumeric) {
                put(
                    workbook.readUInt16LE(payload),
                    workbook.readUInt16LE(payload + 2),
                    cachedResult.readDoubleLE(0)
                );
            }
        } else if (recordId === 0x00bd && recordLength >= 12) {
            const rowIndex = workbook.readUInt16LE(payload);
            const firstColumn = workbook.readUInt16LE(payload + 2);
            const lastColumn = workbook.readUInt16LE(payload + recordLength - 2);
            ensure(recordLength === 6 * (lastColumn - firstColumn + 1) + 6, 'MULRK column range should match record length');
            for (let column = firstColumn; column <= lastColumn; column += 1) {
                const entry = payload + 4 + (column - firstColumn) * 6;
                put(rowIndex, column, decodeRk(workbook.readUInt32LE(entry + 2)));
            }
        }
        offset = payload + recordLength;
        if (recordId === 0x000a) break;
    }
    return rows;
}

function reconstructCapeDecisions(bytes) {
    const workbook = workbookStreamFromOle(bytes);
    const rows = numericCellsFromDataSheet(workbook, dataSheetOffset(workbook));
    const decisions = {};
    for (const row of rows.values()) {
        const rawPeriod = row.get(0);
        const cape = row.get(12);
        if (!Number.isFinite(rawPeriod) || !Number.isFinite(cape)) continue;
        const observationYear = Math.floor(rawPeriod + 1e-8);
        const observationMonth = Math.round((rawPeriod - observationYear) * 100);
        if (observationMonth !== 12 || observationYear < 1924 || observationYear > 2024) continue;
        const returnYear = observationYear + 1;
        ensure(!(returnYear in decisions), `${returnYear} should have only one December source observation`);
        decisions[returnYear] = cape;
    }
    return decisions;
}

console.log('Test 1: pinned headers bind the numeric columns without the production parser');
assertEqual(sha256(source), US_SHILLER_CAPE_CHAIN.hashes.rawDataHash, 'raw source hash should match the generated contract');
const workbook = workbookStreamFromOle(source);
const sheetOffset = dataSheetOffset(workbook);
const headerCells = textCellsFromDataSheet(workbook, sheetOffset, sharedStringsFromGlobals(workbook)).get(7);
assertEqual(headerCells.get(0), 'Date', 'Independent source header should bind column 0 to Date');
assertEqual(headerCells.get(12), 'CAPE', 'Independent source header should bind column 12 to conventional CAPE');
assertEqual(headerCells.get(14), 'TR CAPE', 'Independent source header should distinguish total-return CAPE in column 14');
assertEqual(US_SHILLER_CAPE_CHAIN.method.sourceCapeHeader, headerCells.get(12), 'Generated method should retain the independent conventional-CAPE header identity');
const independentlyReconstructed = reconstructCapeDecisions(source);
assertEqual(Object.keys(independentlyReconstructed).length, 101, 'independent source oracle should reconstruct all 101 return years');
console.log('✓ independent raw-source column identity and reconstruction OK');

console.log('Test 2: every independent December observation matches the generated runtime chain');
for (let returnYear = 1925; returnYear <= 2025; returnYear += 1) {
    assertEqual(
        independentlyReconstructed[returnYear],
        US_SHILLER_CAPE_BY_RETURN_YEAR[returnYear],
        `${returnYear} CAPE should match the independently parsed December t-1 source value`
    );
}
assertEqual(
    sha256(canonicalizeHistoricalContractValue(independentlyReconstructed)),
    US_SHILLER_CAPE_CHAIN.hashes.annualDecisionSignalHash,
    'independent full-series hash should match the generated decision-signal hash'
);
console.log('✓ all 101 independently reconstructed CAPE values match');

console.log('✅ Independent US Shiller CAPE source oracle tests passed');
