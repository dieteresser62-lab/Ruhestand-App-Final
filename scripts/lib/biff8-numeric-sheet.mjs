"use strict";

const CFB_SIGNATURE = Buffer.from([0xd0, 0xcf, 0x11, 0xe0, 0xa1, 0xb1, 0x1a, 0xe1]);
const FREE_SECTOR = 0xffffffff;
const END_OF_CHAIN = 0xfffffffe;
const FAT_SECTOR = 0xfffffffd;
const DIFAT_SECTOR = 0xfffffffc;

function fail(message, details = {}) {
    const error = new Error(message);
    error.code = 'BIFF8_SOURCE_INVALID';
    error.details = details;
    throw error;
}

function assertRange(buffer, offset, length, label) {
    if (!Number.isInteger(offset) || !Number.isInteger(length)
        || offset < 0 || length < 0 || offset + length > buffer.length) {
        fail(`${label} exceeds the source buffer`, { offset, length, bufferLength: buffer.length });
    }
}

function sectorOffset(sectorId, sectorSize) {
    return (sectorId + 1) * sectorSize;
}

function readSector(buffer, sectorId, sectorSize, label) {
    if (!Number.isInteger(sectorId) || sectorId < 0) {
        fail(`${label} has an invalid sector id`, { sectorId });
    }
    const offset = sectorOffset(sectorId, sectorSize);
    assertRange(buffer, offset, sectorSize, label);
    return buffer.subarray(offset, offset + sectorSize);
}

function collectDifat(buffer, header, sectorSize) {
    const difat = [];
    for (let offset = 76; offset < 512; offset += 4) {
        const sectorId = header.readUInt32LE(offset);
        if (sectorId !== FREE_SECTOR) difat.push(sectorId);
    }

    let nextDifatSector = header.readUInt32LE(68);
    const declaredDifatSectors = header.readUInt32LE(72);
    const entriesPerDifatSector = sectorSize / 4 - 1;
    const visited = new Set();

    for (let index = 0; index < declaredDifatSectors; index += 1) {
        if (nextDifatSector === END_OF_CHAIN || nextDifatSector === FREE_SECTOR) {
            fail('DIFAT chain ended before the declared sector count', {
                index,
                declaredDifatSectors,
                nextDifatSector
            });
        }
        if (visited.has(nextDifatSector)) {
            fail('DIFAT chain contains a cycle', { nextDifatSector });
        }
        visited.add(nextDifatSector);
        const sector = readSector(buffer, nextDifatSector, sectorSize, 'DIFAT sector');
        for (let entry = 0; entry < entriesPerDifatSector; entry += 1) {
            const sectorId = sector.readUInt32LE(entry * 4);
            if (sectorId !== FREE_SECTOR) difat.push(sectorId);
        }
        nextDifatSector = sector.readUInt32LE(entriesPerDifatSector * 4);
    }
    return difat;
}

function buildFat(buffer, fatSectorIds, sectorSize, declaredFatSectors) {
    if (fatSectorIds.length < declaredFatSectors) {
        fail('FAT sector list is shorter than the declared FAT sector count', {
            actual: fatSectorIds.length,
            declaredFatSectors
        });
    }
    const fat = [];
    for (const sectorId of fatSectorIds.slice(0, declaredFatSectors)) {
        const sector = readSector(buffer, sectorId, sectorSize, 'FAT sector');
        for (let offset = 0; offset < sector.length; offset += 4) {
            fat.push(sector.readUInt32LE(offset));
        }
    }
    return fat;
}

function readChain(buffer, startSector, fat, sectorSize, label) {
    if (startSector === END_OF_CHAIN || startSector === FREE_SECTOR) return Buffer.alloc(0);
    const chunks = [];
    const visited = new Set();
    let sectorId = startSector;

    while (sectorId !== END_OF_CHAIN) {
        if (!Number.isInteger(sectorId) || sectorId < 0 || sectorId >= fat.length) {
            fail(`${label} references an invalid FAT sector`, { sectorId, fatLength: fat.length });
        }
        if (visited.has(sectorId)) fail(`${label} contains a FAT cycle`, { sectorId });
        visited.add(sectorId);
        chunks.push(readSector(buffer, sectorId, sectorSize, label));
        const next = fat[sectorId];
        if (next === FREE_SECTOR || next === FAT_SECTOR || next === DIFAT_SECTOR) {
            fail(`${label} terminates with an invalid FAT marker`, { sectorId, next });
        }
        sectorId = next;
    }
    return Buffer.concat(chunks);
}

function parseDirectoryEntries(directoryStream) {
    const entries = [];
    for (let offset = 0; offset + 128 <= directoryStream.length; offset += 128) {
        const entry = directoryStream.subarray(offset, offset + 128);
        const nameLength = entry.readUInt16LE(64);
        if (nameLength < 2 || nameLength > 64 || nameLength % 2 !== 0) continue;
        const name = entry.subarray(0, nameLength - 2).toString('utf16le');
        const type = entry.readUInt8(66);
        const startSector = entry.readUInt32LE(116);
        const streamSizeBig = entry.readBigUInt64LE(120);
        if (streamSizeBig > BigInt(Number.MAX_SAFE_INTEGER)) {
            fail('Directory stream size exceeds the safe integer range', { name, streamSize: String(streamSizeBig) });
        }
        entries.push({ name, type, startSector, streamSize: Number(streamSizeBig) });
    }
    return entries;
}

function buildMiniFat(buffer, firstMiniFatSector, miniFatSectorCount, fat, sectorSize) {
    if (miniFatSectorCount === 0) return [];
    const stream = readChain(buffer, firstMiniFatSector, fat, sectorSize, 'MiniFAT stream');
    const requiredBytes = miniFatSectorCount * sectorSize;
    if (stream.length < requiredBytes) {
        fail('MiniFAT stream is shorter than declared', { actual: stream.length, requiredBytes });
    }
    const miniFat = [];
    for (let offset = 0; offset < requiredBytes; offset += 4) {
        miniFat.push(stream.readUInt32LE(offset));
    }
    return miniFat;
}

function readMiniChain(rootMiniStream, startSector, miniFat, miniSectorSize, streamSize, label) {
    const chunks = [];
    const visited = new Set();
    let sectorId = startSector;
    let bytesRead = 0;
    while (sectorId !== END_OF_CHAIN && bytesRead < streamSize) {
        if (!Number.isInteger(sectorId) || sectorId < 0 || sectorId >= miniFat.length) {
            fail(`${label} references an invalid mini sector`, { sectorId, miniFatLength: miniFat.length });
        }
        if (visited.has(sectorId)) fail(`${label} contains a MiniFAT cycle`, { sectorId });
        visited.add(sectorId);
        const offset = sectorId * miniSectorSize;
        assertRange(rootMiniStream, offset, miniSectorSize, label);
        chunks.push(rootMiniStream.subarray(offset, offset + miniSectorSize));
        bytesRead += miniSectorSize;
        const next = miniFat[sectorId];
        if (next === FREE_SECTOR || next === FAT_SECTOR || next === DIFAT_SECTOR) {
            fail(`${label} terminates with an invalid MiniFAT marker`, { sectorId, next });
        }
        sectorId = next;
    }
    return Buffer.concat(chunks).subarray(0, streamSize);
}

export function readCfbStream(sourceBuffer, requestedStreamNames) {
    const buffer = Buffer.from(sourceBuffer);
    assertRange(buffer, 0, 512, 'CFB header');
    if (!buffer.subarray(0, 8).equals(CFB_SIGNATURE)) fail('Source is not a CFB/OLE workbook');
    const byteOrder = buffer.readUInt16LE(28);
    const sectorShift = buffer.readUInt16LE(30);
    const miniSectorShift = buffer.readUInt16LE(32);
    if (byteOrder !== 0xfffe || ![9, 12].includes(sectorShift) || miniSectorShift !== 6) {
        fail('Unsupported CFB header geometry', { byteOrder, sectorShift, miniSectorShift });
    }

    const sectorSize = 2 ** sectorShift;
    const miniSectorSize = 2 ** miniSectorShift;
    const declaredFatSectors = buffer.readUInt32LE(44);
    const firstDirectorySector = buffer.readUInt32LE(48);
    const miniStreamCutoff = buffer.readUInt32LE(56);
    const firstMiniFatSector = buffer.readUInt32LE(60);
    const miniFatSectorCount = buffer.readUInt32LE(64);
    const fatSectorIds = collectDifat(buffer, buffer.subarray(0, 512), sectorSize);
    const fat = buildFat(buffer, fatSectorIds, sectorSize, declaredFatSectors);
    const directoryStream = readChain(buffer, firstDirectorySector, fat, sectorSize, 'Directory stream');
    const entries = parseDirectoryEntries(directoryStream);
    const normalizedNames = new Set(requestedStreamNames.map(name => name.toLowerCase()));
    const target = entries.find(entry => entry.type === 2 && normalizedNames.has(entry.name.toLowerCase()));
    if (!target) fail('Requested workbook stream is missing', { requestedStreamNames, available: entries.map(entry => entry.name) });

    if (target.streamSize >= miniStreamCutoff) {
        return readChain(buffer, target.startSector, fat, sectorSize, `CFB stream ${target.name}`)
            .subarray(0, target.streamSize);
    }

    const root = entries.find(entry => entry.type === 5);
    if (!root) fail('CFB root entry is missing for mini-stream access');
    const rootMiniStream = readChain(buffer, root.startSector, fat, sectorSize, 'Root mini stream')
        .subarray(0, root.streamSize);
    const miniFat = buildMiniFat(buffer, firstMiniFatSector, miniFatSectorCount, fat, sectorSize);
    return readMiniChain(rootMiniStream, target.startSector, miniFat, miniSectorSize, target.streamSize, `CFB stream ${target.name}`);
}

function parseBiffRecords(stream, startOffset = 0) {
    const records = [];
    let offset = startOffset;
    while (offset + 4 <= stream.length) {
        const id = stream.readUInt16LE(offset);
        const length = stream.readUInt16LE(offset + 2);
        const dataOffset = offset + 4;
        if (dataOffset + length > stream.length) {
            fail('BIFF record exceeds the workbook stream', { id, offset, length, streamLength: stream.length });
        }
        records.push({ id, offset, data: stream.subarray(dataOffset, dataOffset + length) });
        offset = dataOffset + length;
        if (id === 0x000a) break;
    }
    return records;
}

function parseSharedStrings(workbookStream) {
    const globals = parseBiffRecords(workbookStream, 0);
    const sstIndex = globals.findIndex(record => record.id === 0x00fc);
    if (sstIndex < 0) return [];
    if (globals[sstIndex + 1]?.id === 0x003c) {
        fail('SST continuation records are not supported by this fail-closed reader');
    }

    const data = globals[sstIndex].data;
    if (data.length < 8) fail('SST record is too short');
    const uniqueStringCount = data.readUInt32LE(4);
    const strings = [];
    let offset = 8;

    for (let index = 0; index < uniqueStringCount; index += 1) {
        assertRange(data, offset, 3, 'SST Unicode string header');
        const charCount = data.readUInt16LE(offset);
        const flags = data.readUInt8(offset + 2);
        offset += 3;
        const richRunCount = (flags & 0x08) !== 0
            ? (assertRange(data, offset, 2, 'SST rich-text run count'), data.readUInt16LE(offset))
            : 0;
        if ((flags & 0x08) !== 0) offset += 2;
        const extendedByteCount = (flags & 0x04) !== 0
            ? (assertRange(data, offset, 4, 'SST extended-data length'), data.readUInt32LE(offset))
            : 0;
        if ((flags & 0x04) !== 0) offset += 4;

        const isWide = (flags & 0x01) !== 0;
        const characterByteCount = charCount * (isWide ? 2 : 1);
        assertRange(data, offset, characterByteCount, 'SST Unicode string characters');
        strings.push(data.subarray(offset, offset + characterByteCount)
            .toString(isWide ? 'utf16le' : 'latin1'));
        offset += characterByteCount;

        const trailingByteCount = richRunCount * 4 + extendedByteCount;
        assertRange(data, offset, trailingByteCount, 'SST Unicode string trailing data');
        offset += trailingByteCount;
    }
    if (offset !== data.length) {
        fail('SST record contains unparsed bytes', { parsedBytes: offset, recordBytes: data.length });
    }
    return strings;
}

function decodeShortUnicodeString(data, offset, charCount, flags) {
    const isWide = (flags & 0x01) !== 0;
    const byteLength = charCount * (isWide ? 2 : 1);
    assertRange(data, offset, byteLength, 'BIFF short Unicode string');
    return data.subarray(offset, offset + byteLength).toString(isWide ? 'utf16le' : 'latin1');
}

function listSheets(workbookStream) {
    const globals = parseBiffRecords(workbookStream, 0);
    return globals
        .filter(record => record.id === 0x0085)
        .map(record => {
            if (record.data.length < 8) fail('BOUNDSHEET record is too short');
            const offset = record.data.readUInt32LE(0);
            const charCount = record.data.readUInt8(6);
            const flags = record.data.readUInt8(7);
            const name = decodeShortUnicodeString(record.data, 8, charCount, flags);
            return { name, offset };
        });
}

function decodeRk(raw) {
    const divideBy100 = (raw & 0x01) !== 0;
    const isInteger = (raw & 0x02) !== 0;
    let value;
    if (isInteger) {
        value = raw >> 2;
    } else {
        const bytes = Buffer.alloc(8);
        bytes.writeUInt32LE(raw & 0xfffffffc, 4);
        value = bytes.readDoubleLE(0);
    }
    return divideBy100 ? value / 100 : value;
}

function setCell(cells, row, column, value) {
    if (!Number.isInteger(row) || !Number.isInteger(column) || !Number.isFinite(value)) return;
    if (!cells.has(row)) cells.set(row, new Map());
    cells.get(row).set(column, value);
}

function setTextCell(cells, row, column, value) {
    if (!Number.isInteger(row) || !Number.isInteger(column) || typeof value !== 'string') return;
    if (!cells.has(row)) cells.set(row, new Map());
    cells.get(row).set(column, value);
}

function parseNumericCells(workbookStream, sheetOffset) {
    const records = parseBiffRecords(workbookStream, sheetOffset);
    const cells = new Map();
    for (const record of records) {
        const data = record.data;
        if (record.id === 0x0203 && data.length >= 14) {
            setCell(cells, data.readUInt16LE(0), data.readUInt16LE(2), data.readDoubleLE(6));
        } else if (record.id === 0x027e && data.length >= 10) {
            setCell(cells, data.readUInt16LE(0), data.readUInt16LE(2), decodeRk(data.readUInt32LE(6)));
        } else if (record.id === 0x00bd && data.length >= 6) {
            const row = data.readUInt16LE(0);
            const firstColumn = data.readUInt16LE(2);
            const lastColumn = data.readUInt16LE(data.length - 2);
            const expectedLength = 4 + (lastColumn - firstColumn + 1) * 6 + 2;
            if (lastColumn < firstColumn || data.length !== expectedLength) {
                fail('MULRK record has inconsistent column bounds', {
                    row,
                    firstColumn,
                    lastColumn,
                    actualLength: data.length,
                    expectedLength
                });
            }
            for (let column = firstColumn; column <= lastColumn; column += 1) {
                const entryOffset = 4 + (column - firstColumn) * 6;
                setCell(cells, row, column, decodeRk(data.readUInt32LE(entryOffset + 2)));
            }
        } else if (record.id === 0x0006 && data.length >= 14) {
            const cached = data.subarray(6, 14);
            if (!(cached.readUInt16LE(0) === 0xffff && cached.readUInt16LE(6) === 0xffff)) {
                setCell(cells, data.readUInt16LE(0), data.readUInt16LE(2), cached.readDoubleLE(0));
            }
        }
    }
    return cells;
}

function parseStringCells(workbookStream, sheetOffset, sharedStrings) {
    const records = parseBiffRecords(workbookStream, sheetOffset);
    const cells = new Map();
    for (const record of records) {
        if (record.id !== 0x00fd || record.data.length < 10) continue;
        const sharedStringIndex = record.data.readUInt32LE(6);
        const value = sharedStrings[sharedStringIndex];
        if (typeof value !== 'string') {
            fail('LABELSST cell references an unavailable shared string', {
                row: record.data.readUInt16LE(0),
                column: record.data.readUInt16LE(2),
                sharedStringIndex,
                sharedStringCount: sharedStrings.length
            });
        }
        setTextCell(
            cells,
            record.data.readUInt16LE(0),
            record.data.readUInt16LE(2),
            value
        );
    }
    return cells;
}

export function readBiff8Sheet(sourceBuffer, sheetName) {
    const workbookStream = readCfbStream(sourceBuffer, ['Workbook', 'Book']);
    const sheets = listSheets(workbookStream);
    const sheet = sheets.find(candidate => candidate.name === sheetName);
    if (!sheet) fail('Requested BIFF worksheet is missing', { sheetName, available: sheets.map(candidate => candidate.name) });
    const sharedStrings = parseSharedStrings(workbookStream);
    return {
        sheetName: sheet.name,
        cells: parseNumericCells(workbookStream, sheet.offset),
        textCells: parseStringCells(workbookStream, sheet.offset, sharedStrings)
    };
}

export function readBiff8NumericSheet(sourceBuffer, sheetName) {
    const { sheetName: resolvedSheetName, cells } = readBiff8Sheet(sourceBuffer, sheetName);
    return { sheetName: resolvedSheetName, cells };
}
