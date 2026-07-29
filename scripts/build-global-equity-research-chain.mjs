import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const DATA_DIRECTORY = path.join(
    PROJECT_ROOT,
    'data',
    'historical',
    'global-equity-research-chain'
);
const OUTPUT_PATH = path.join(
    PROJECT_ROOT,
    'app',
    'simulator',
    'global-equity-research-chain.js'
);
const ORIGINAL_DATA_DIRECTORY = path.join(DATA_DIRECTORY, 'originals');
const REFRESH_FILTERED_INPUTS = process.argv.includes('--refresh-filtered-inputs');

const COUNTRY_CURRENCIES = Object.freeze({
    AUS: 'AUD',
    BEL: 'EUR',
    CHE: 'CHF',
    DEU: 'EUR',
    DNK: 'DKK',
    ESP: 'EUR',
    FIN: 'EUR',
    FRA: 'EUR',
    GBR: 'GBP',
    ITA: 'EUR',
    JPN: 'JPY',
    NLD: 'EUR',
    NOR: 'NOK',
    PRT: 'EUR',
    SWE: 'SEK',
    USA: 'USD'
});
const COUNTRY_ISOS = Object.freeze(Object.keys(COUNTRY_CURRENCIES));
const DECEMBER_PERIODS = Object.freeze([
    '2020-12',
    '2021-12',
    '2022-12',
    '2023-12',
    '2024-12',
    '2025-12'
]);
const EXPECTED_COUNTRY_COUNTS = Object.freeze({
    1945: 15,
    1946: 14,
    1947: 15
});
const KNOWN_MISSING_COUNTRY_YEARS = Object.freeze({
    DEU: Object.freeze([1945, 1946]),
    JPN: Object.freeze([1946, 1947])
});
const SOURCE_FILES = Object.freeze({
    jst: {
        fileName: 'jst-r6-equity-inputs.csv',
        originalFileName: 'JSTdatasetR6.xlsx',
        originalSha256: 'c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d',
        inputSha256: '435d630ee403039d656a447f3722311115d10de474004504c11496e2a13f74e6',
        sourceUrl: 'https://www.macrohistory.net/app/download/9834512569/JSTdatasetR6.xlsx?t=1763503850',
        license: 'CC BY-NC-SA 4.0'
    },
    oecd: {
        fileName: 'oecd-share-price-inputs.csv',
        originalFileName: 'oecd-share-prices-monthly.csv',
        originalSha256: '9ea88f6d07d2d7382ae72ccc8101eed1bd46db5efee8f049352161f3448414e8',
        inputSha256: '2095c44138bec705457e981691fd983a5648a683c4def7c344c47a88526da75f',
        sourceUrl: 'https://sdmx.oecd.org/public/rest/data/OECD.SDD.STES,DSD_STES@DF_FINMARK,4.0',
        license: 'OECD open-by-default, CC BY 4.0 unless otherwise stated'
    },
    ecb: {
        fileName: 'ecb-exr-inputs.csv',
        originalFileName: 'ecb-fx-monthly.csv',
        originalSha256: '047cab457467d382a1933b0759e5b1b2fc8f68c88b2b4de5f21fece4d9ca624a',
        inputSha256: '7c22d6f5c3684eac34cc14dab86d4c211ffd0454f7947d52c89e8fd46af21593',
        sourceUrl: 'https://data-api.ecb.europa.eu/service/data/EXR/',
        license: 'ESCB statistics reuse policy'
    }
});

function fail(message, details = undefined) {
    const error = new Error(message);
    if (details !== undefined) error.details = details;
    throw error;
}

function parseCsvLine(line) {
    const values = [];
    let current = '';
    let quoted = false;

    for (let index = 0; index < line.length; index += 1) {
        const character = line[index];
        if (character === '"') {
            if (quoted && line[index + 1] === '"') {
                current += '"';
                index += 1;
            } else {
                quoted = !quoted;
            }
        } else if (character === ',' && !quoted) {
            values.push(current);
            current = '';
        } else {
            current += character;
        }
    }

    if (quoted) fail('Unterminated CSV quote');
    values.push(current);
    return values;
}

function parseCsv(content, sourceName) {
    content = content.trim();
    const [headerLine, ...lines] = content.split(/\r?\n/);
    const headers = parseCsvLine(headerLine);
    const duplicateHeaders = headers.filter((header, index) => headers.indexOf(header) !== index);
    if (duplicateHeaders.length > 0) fail('CSV headers must be unique', { sourceName, duplicateHeaders });

    return lines.map((line, lineIndex) => {
        const values = parseCsvLine(line);
        if (values.length !== headers.length) {
            fail('CSV row has an unexpected column count', {
                sourceName,
                line: lineIndex + 2,
                expected: headers.length,
                actual: values.length
            });
        }
        return Object.fromEntries(headers.map((header, index) => [header, values[index]]));
    });
}

function readCsv(filePath) {
    return parseCsv(fs.readFileSync(filePath, 'utf8'), filePath);
}

function csvCell(value) {
    if (value === null || value === undefined) return '';
    const text = String(value);
    return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(headers, records) {
    const lines = [headers.map(csvCell).join(',')];
    for (const record of records) {
        lines.push(headers.map((header) => csvCell(record[header])).join(','));
    }
    return Buffer.from(`${lines.join('\n')}\n`, 'utf8');
}

function sha256Buffer(buffer) {
    return crypto.createHash('sha256').update(buffer).digest('hex');
}

function sha256File(filePath) {
    return sha256Buffer(fs.readFileSync(filePath));
}

function canonicalKeyCompare(left, right) {
    const leftIsInteger = /^(0|[1-9]\d*)$/.test(left);
    const rightIsInteger = /^(0|[1-9]\d*)$/.test(right);
    if (leftIsInteger && rightIsInteger) return Number(left) - Number(right);
    if (leftIsInteger !== rightIsInteger) return leftIsInteger ? -1 : 1;
    return left < right ? -1 : left > right ? 1 : 0;
}

function canonicalize(value) {
    if (value === null) return 'null';
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) fail('Cannot canonicalize a non-finite number', { value });
        return JSON.stringify(value);
    }
    if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
    if (typeof value === 'object') {
        const keys = Object.keys(value).sort(canonicalKeyCompare);
        return `{${keys.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
    }
    fail('Unsupported canonical value', { type: typeof value });
}

function sha256Canonical(value) {
    return sha256Buffer(canonicalize(value));
}

function finiteNumber(value, label) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue)) fail(`${label} must be finite`, { value });
    return numericValue;
}

function positiveNumber(value, label) {
    const numericValue = finiteNumber(value, label);
    if (!(numericValue > 0)) fail(`${label} must be greater than zero`, { value });
    return numericValue;
}

function rowKey(...parts) {
    return parts.join(':');
}

function indexUniqueRows(rows, keyFields, sourceName) {
    const lookup = new Map();
    for (const row of rows) {
        const key = rowKey(...keyFields.map((field) => row[field]));
        if (lookup.has(key)) fail(`${sourceName} contains duplicate key ${key}`);
        lookup.set(key, row);
    }
    return lookup;
}

function unzipEntries(zipBuffer) {
    const minimumEocdOffset = Math.max(0, zipBuffer.length - 65557);
    let eocdOffset = -1;
    for (let offset = zipBuffer.length - 22; offset >= minimumEocdOffset; offset -= 1) {
        if (zipBuffer.readUInt32LE(offset) === 0x06054b50) {
            eocdOffset = offset;
            break;
        }
    }
    if (eocdOffset < 0) fail('XLSX ZIP end-of-central-directory record is missing');

    const entryCount = zipBuffer.readUInt16LE(eocdOffset + 10);
    let centralOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
    const entries = new Map();

    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
        if (zipBuffer.readUInt32LE(centralOffset) !== 0x02014b50) {
            fail('XLSX ZIP central-directory entry is invalid', { entryIndex, centralOffset });
        }
        const compressionMethod = zipBuffer.readUInt16LE(centralOffset + 10);
        const compressedSize = zipBuffer.readUInt32LE(centralOffset + 20);
        const uncompressedSize = zipBuffer.readUInt32LE(centralOffset + 24);
        const fileNameLength = zipBuffer.readUInt16LE(centralOffset + 28);
        const extraLength = zipBuffer.readUInt16LE(centralOffset + 30);
        const commentLength = zipBuffer.readUInt16LE(centralOffset + 32);
        const localHeaderOffset = zipBuffer.readUInt32LE(centralOffset + 42);
        const fileName = zipBuffer.toString(
            'utf8',
            centralOffset + 46,
            centralOffset + 46 + fileNameLength
        );

        if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
            fail('XLSX ZIP local-file header is invalid', { fileName, localHeaderOffset });
        }
        const localFileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
        const localExtraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
        const compressedStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
        const compressed = zipBuffer.subarray(compressedStart, compressedStart + compressedSize);
        let content;
        if (compressionMethod === 0) {
            content = Buffer.from(compressed);
        } else if (compressionMethod === 8) {
            content = zlib.inflateRawSync(compressed);
        } else {
            fail('Unsupported XLSX ZIP compression method', { fileName, compressionMethod });
        }
        if (content.length !== uncompressedSize) {
            fail('XLSX ZIP entry size mismatch', {
                fileName,
                expected: uncompressedSize,
                actual: content.length
            });
        }
        entries.set(fileName, content);
        centralOffset += 46 + fileNameLength + extraLength + commentLength;
    }
    return entries;
}

function decodeXmlText(value) {
    return value
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'")
        .replaceAll('&amp;', '&')
        .replace(/&#(\d+);/g, (_match, codePoint) => String.fromCodePoint(Number(codePoint)))
        .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)));
}

function columnIndexFromCellReference(reference) {
    const letters = reference.match(/^[A-Z]+/)?.[0];
    if (!letters) fail('XLSX cell reference has no column', { reference });
    let index = 0;
    for (const letter of letters) index = (index * 26) + letter.charCodeAt(0) - 64;
    return index - 1;
}

function readFirstXlsxSheetRows(xlsxBuffer) {
    const entries = unzipEntries(xlsxBuffer);
    const sharedStringsXml = entries.get('xl/sharedStrings.xml')?.toString('utf8');
    const sheetXml = entries.get('xl/worksheets/sheet1.xml')?.toString('utf8');
    if (!sharedStringsXml || !sheetXml) fail('Expected XLSX shared strings or first worksheet is missing');

    const sharedStrings = [...sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map((match) => (
        [...match[1].matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)]
            .map(textMatch => decodeXmlText(textMatch[1]))
            .join('')
    ));

    return [...sheetXml.matchAll(/<row(?: [^>]*)?>([\s\S]*?)<\/row>/g)].map((rowMatch) => {
        const row = [];
        for (const cellMatch of rowMatch[1].matchAll(/<c ([^>]*)>([\s\S]*?)<\/c>/g)) {
            const attributes = cellMatch[1];
            const reference = attributes.match(/\br="([^"]+)"/)?.[1];
            const rawValue = cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1];
            if (!reference || rawValue === undefined) continue;
            const type = attributes.match(/\bt="([^"]+)"/)?.[1];
            row[columnIndexFromCellReference(reference)] = type === 's'
                ? sharedStrings[Number(rawValue)]
                : decodeXmlText(rawValue);
        }
        return row;
    });
}

function buildJstFilteredInput(originalBuffer) {
    const rows = readFirstXlsxSheetRows(originalBuffer);
    const headers = rows[0];
    const columnIndex = Object.fromEntries(headers.map((header, index) => [header, index]));
    const filteredHeaders = [
        'year',
        'iso',
        'pop',
        'rgdpmad',
        'xrusd',
        'eq_tr',
        'eq_capgain',
        'eq_div_rtn'
    ];
    for (const header of filteredHeaders) {
        if (!Number.isInteger(columnIndex[header])) fail('JST original is missing a required column', { header });
    }

    const records = rows.slice(1)
        .filter((row) => (
            COUNTRY_ISOS.includes(row[columnIndex.iso])
            && Number(row[columnIndex.year]) >= 1924
            && Number(row[columnIndex.year]) <= 2020
        ))
        .map((row) => Object.fromEntries(filteredHeaders.map((header) => [
            header,
            row[columnIndex[header]] ?? ''
        ])))
        .sort((left, right) => left.iso.localeCompare(right.iso) || Number(left.year) - Number(right.year));
    if (records.length !== COUNTRY_ISOS.length * 97) fail('Unexpected reconstructed JST row count', {
        count: records.length
    });
    return toCsv(filteredHeaders, records);
}

function buildOecdFilteredInput(originalBuffer) {
    const records = parseCsv(originalBuffer.toString('utf8'), 'OECD original')
        .filter((row) => COUNTRY_ISOS.includes(row.REF_AREA) && DECEMBER_PERIODS.includes(row.TIME_PERIOD))
        .map((row) => ({
            iso: row.REF_AREA,
            time_period: row.TIME_PERIOD,
            obs_value: row.OBS_VALUE,
            obs_status: row.OBS_STATUS,
            base_period: row.BASE_PER
        }))
        .sort((left, right) => (
            left.iso.localeCompare(right.iso)
            || left.time_period.localeCompare(right.time_period)
        ));
    if (records.length !== COUNTRY_ISOS.length * DECEMBER_PERIODS.length) {
        fail('Unexpected reconstructed OECD row count', { count: records.length });
    }
    return toCsv(['iso', 'time_period', 'obs_value', 'obs_status', 'base_period'], records);
}

function buildEcbFilteredInput(originalBuffer) {
    const currencies = new Set(['AUD', 'CAD', 'CHF', 'DKK', 'GBP', 'JPY', 'NOK', 'SEK', 'USD']);
    const records = parseCsv(originalBuffer.toString('utf8'), 'ECB original')
        .filter((row) => currencies.has(row.CURRENCY) && DECEMBER_PERIODS.includes(row.TIME_PERIOD))
        .map((row) => ({
            currency: row.CURRENCY,
            time_period: row.TIME_PERIOD,
            obs_value: row.OBS_VALUE,
            obs_status: row.OBS_STATUS
        }))
        .sort((left, right) => (
            left.currency.localeCompare(right.currency)
            || left.time_period.localeCompare(right.time_period)
        ));
    if (records.length !== currencies.size * DECEMBER_PERIODS.length) {
        fail('Unexpected reconstructed ECB row count', { count: records.length });
    }
    return toCsv(['currency', 'time_period', 'obs_value', 'obs_status'], records);
}

const sourcePaths = Object.fromEntries(
    Object.entries(SOURCE_FILES).map(([sourceId, source]) => [
        sourceId,
        path.join(DATA_DIRECTORY, source.fileName)
    ])
);
const originalPaths = Object.fromEntries(
    Object.entries(SOURCE_FILES).map(([sourceId, source]) => [
        sourceId,
        path.join(ORIGINAL_DATA_DIRECTORY, source.originalFileName)
    ])
);
const originalBuffers = Object.fromEntries(
    Object.entries(originalPaths).map(([sourceId, filePath]) => [sourceId, fs.readFileSync(filePath)])
);
for (const [sourceId, source] of Object.entries(SOURCE_FILES)) {
    const actualOriginalHash = sha256Buffer(originalBuffers[sourceId]);
    if (actualOriginalHash !== source.originalSha256) {
        fail(`Original ${sourceId} input hash mismatch`, {
            expected: source.originalSha256,
            actual: actualOriginalHash
        });
    }
}

const reconstructedInputs = {
    jst: buildJstFilteredInput(originalBuffers.jst),
    oecd: buildOecdFilteredInput(originalBuffers.oecd),
    ecb: buildEcbFilteredInput(originalBuffers.ecb)
};
if (REFRESH_FILTERED_INPUTS) {
    for (const [sourceId, bytes] of Object.entries(reconstructedInputs)) {
        fs.writeFileSync(sourcePaths[sourceId], bytes);
    }
}
for (const [sourceId, reconstructed] of Object.entries(reconstructedInputs)) {
    const committed = fs.readFileSync(sourcePaths[sourceId]);
    if (!committed.equals(reconstructed)) {
        fail(`Filtered ${sourceId} input is not reproducible from the licensed original`, {
            committedSha256: sha256Buffer(committed),
            reconstructedSha256: sha256Buffer(reconstructed)
        });
    }
}
const actualInputHashes = Object.fromEntries(
    Object.entries(sourcePaths).map(([sourceId, filePath]) => [sourceId, sha256File(filePath)])
);
for (const [sourceId, source] of Object.entries(SOURCE_FILES)) {
    if (actualInputHashes[sourceId] !== source.inputSha256) {
        fail(`Filtered ${sourceId} input hash mismatch`, {
            expected: source.inputSha256,
            actual: actualInputHashes[sourceId]
        });
    }
}

const jstRows = readCsv(sourcePaths.jst);
const oecdRows = readCsv(sourcePaths.oecd);
const ecbRows = readCsv(sourcePaths.ecb);
if (jstRows.length !== COUNTRY_ISOS.length * 97) fail('Unexpected JST input row count', { count: jstRows.length });
if (oecdRows.length !== COUNTRY_ISOS.length * DECEMBER_PERIODS.length) {
    fail('Unexpected OECD input row count', { count: oecdRows.length });
}
if (ecbRows.length !== 9 * DECEMBER_PERIODS.length) fail('Unexpected ECB input row count', { count: ecbRows.length });

const jstByIsoYear = indexUniqueRows(jstRows, ['iso', 'year'], 'JST');
const oecdByIsoPeriod = indexUniqueRows(oecdRows, ['iso', 'time_period'], 'OECD');
const ecbByCurrencyPeriod = indexUniqueRows(ecbRows, ['currency', 'time_period'], 'ECB');
const annualReturns = {};
const countryCounts = {};

for (let year = 1925; year <= 2020; year += 1) {
    const eligible = COUNTRY_ISOS.flatMap((iso) => {
        const current = jstByIsoYear.get(rowKey(iso, year));
        const previous = jstByIsoYear.get(rowKey(iso, year - 1));
        if (!current || !previous) fail('JST year pair is missing', { iso, year });
        const documentedMissing = KNOWN_MISSING_COUNTRY_YEARS[iso]?.includes(year) === true;
        if (current.eq_tr === '' || current.xrusd === '' || previous.xrusd === '') {
            if (!documentedMissing) {
                fail('Unexpected JST equity or exchange-rate gap', {
                    iso,
                    year,
                    eq_tr: current.eq_tr,
                    currentXrusd: current.xrusd,
                    previousXrusd: previous.xrusd
                });
            }
            return [];
        }

        const localReturn = finiteNumber(current.eq_tr, `JST ${iso} ${year} eq_tr`);
        const localFxCurrent = positiveNumber(current.xrusd, `JST ${iso} ${year} xrusd`);
        const localFxPrevious = positiveNumber(previous.xrusd, `JST ${iso} ${year - 1} xrusd`);
        const populationPrevious = positiveNumber(previous.pop, `JST ${iso} ${year - 1} pop`);
        const realGdpPerCapitaPrevious = positiveNumber(
            previous.rgdpmad,
            `JST ${iso} ${year - 1} rgdpmad`
        );
        let countryReturn = (1 + localReturn) * (localFxPrevious / localFxCurrent) - 1;

        if (year >= 1951) {
            const germanCurrent = jstByIsoYear.get(rowKey('DEU', year));
            const germanPrevious = jstByIsoYear.get(rowKey('DEU', year - 1));
            const germanFxCurrent = positiveNumber(germanCurrent?.xrusd, `JST DEU ${year} xrusd`);
            const germanFxPrevious = positiveNumber(germanPrevious?.xrusd, `JST DEU ${year - 1} xrusd`);
            countryReturn = (1 + countryReturn) * (germanFxCurrent / germanFxPrevious) - 1;
        }

        if (!(countryReturn > -1)) fail('Derived JST country return must be greater than -100%', {
            iso,
            year,
            countryReturn
        });
        return [{
            iso,
            countryReturn,
            economicWeightBase: populationPrevious * realGdpPerCapitaPrevious
        }];
    });

    const expectedCount = EXPECTED_COUNTRY_COUNTS[year] ?? COUNTRY_ISOS.length;
    if (eligible.length !== expectedCount) fail('Unexpected JST eligible-country count', {
        year,
        expectedCount,
        actualCount: eligible.length,
        eligible: eligible.map(({ iso }) => iso)
    });
    const totalWeightBase = eligible.reduce((total, country) => total + country.economicWeightBase, 0);
    annualReturns[year] = eligible.reduce(
        (total, country) => total + country.countryReturn * (country.economicWeightBase / totalWeightBase),
        0
    );
    countryCounts[year] = eligible.length;
}

const modernWeights = Object.fromEntries(COUNTRY_ISOS.map((iso) => {
    const row = jstByIsoYear.get(rowKey(iso, 2020));
    return [iso, (
        positiveNumber(row?.pop, `JST ${iso} 2020 pop`)
        * positiveNumber(row?.rgdpmad, `JST ${iso} 2020 rgdpmad`)
    )];
}));
const modernTotalWeight = Object.values(modernWeights).reduce((sum, value) => sum + value, 0);
for (const iso of COUNTRY_ISOS) modernWeights[iso] /= modernTotalWeight;

const dividendProxyByIso = Object.fromEntries(COUNTRY_ISOS.map((iso) => {
    const row = jstByIsoYear.get(rowKey(iso, 2020));
    const totalReturn = finiteNumber(row?.eq_tr, `JST ${iso} 2020 eq_tr`);
    const capitalGainReturn = finiteNumber(row?.eq_capgain, `JST ${iso} 2020 eq_capgain`);
    const dividendReturn = finiteNumber(row?.eq_div_rtn, `JST ${iso} 2020 eq_div_rtn`);
    if (Math.abs(totalReturn - capitalGainReturn - dividendReturn) > 2e-8) {
        fail('JST 2020 total return must use the documented additive capital-gain plus dividend decomposition', {
            iso,
            totalReturn,
            capitalGainReturn,
            dividendReturn
        });
    }
    return [iso, dividendReturn];
}));

function currencyPerEur(iso, period) {
    const currency = COUNTRY_CURRENCIES[iso];
    if (currency === 'EUR') return 1;
    const row = ecbByCurrencyPeriod.get(rowKey(currency, period));
    if (!row) fail('ECB currency-period observation is missing', { iso, currency, period });
    if (row.obs_status !== 'A') fail('ECB observation must have normal status A', { iso, currency, period, row });
    return positiveNumber(row.obs_value, `ECB ${currency} ${period} obs_value`);
}

for (let year = 2021; year <= 2025; year += 1) {
    const previousPeriod = `${year - 1}-12`;
    const currentPeriod = `${year}-12`;
    annualReturns[year] = COUNTRY_ISOS.reduce((total, iso) => {
        const previous = oecdByIsoPeriod.get(rowKey(iso, previousPeriod));
        const current = oecdByIsoPeriod.get(rowKey(iso, currentPeriod));
        if (!previous || !current) fail('OECD country-period observation is missing', { iso, year });
        if (previous.obs_status !== 'A' || current.obs_status !== 'A') {
            fail('OECD observations must have normal status A', { iso, year, previous, current });
        }
        const priceReturn = (
            positiveNumber(current.obs_value, `OECD ${iso} ${currentPeriod} obs_value`)
            / positiveNumber(previous.obs_value, `OECD ${iso} ${previousPeriod} obs_value`)
            - 1
        );
        const totalReturnProxy = priceReturn + dividendProxyByIso[iso];
        const eurReturn = (
            (1 + totalReturnProxy)
            * currencyPerEur(iso, previousPeriod)
            / currencyPerEur(iso, currentPeriod)
            - 1
        );
        if (!(eurReturn > -1)) fail('Derived modern country return must be greater than -100%', {
            iso,
            year,
            eurReturn
        });
        return total + eurReturn * modernWeights[iso];
    }, 0);
    countryCounts[year] = COUNTRY_ISOS.length;
}

const indexLevels = {};
let indexLevel = 100;
for (let year = 1925; year <= 2025; year += 1) {
    const annualReturn = annualReturns[year];
    if (!Number.isFinite(annualReturn) || !(annualReturn > -1)) {
        fail('Annual chain return is invalid', { year, annualReturn });
    }
    indexLevel *= 1 + annualReturn;
    if (!Number.isFinite(indexLevel) || !(indexLevel > 0)) fail('Index level is invalid', { year, indexLevel });
    indexLevels[year] = indexLevel;
}

const sourceMetadata = Object.fromEntries(Object.entries(SOURCE_FILES).map(([sourceId, source]) => [
    sourceId,
    {
        ...source,
        filteredInputSha256: actualInputHashes[sourceId]
    }
]));
const rawDataHash = sha256Canonical(
    Object.fromEntries(Object.entries(sourceMetadata).map(([sourceId, source]) => [
        sourceId,
        {
            originalSha256: source.originalSha256,
            filteredInputSha256: source.filteredInputSha256
        }
    ]))
);
const chain = {
    schemaVersion: 'GlobalEquityResearchChainV1',
    revision: '2026-07-29.2',
    seriesId: 'global_equity_research_index',
    period: { startYear: 1925, endYear: 2025 },
    base: { year: 1924, level: 100 },
    countryUniverse: COUNTRY_ISOS,
    weighting: {
        1925: 'Prior-year JST population multiplied by JST real GDP per capita; renormalized across available countries.',
        2021: 'Frozen 2020 JST population multiplied by JST real GDP per capita.'
    },
    numeraireTransition: {
        usdThroughYear: 1950,
        germanInvestorCurrencyFromYear: 1951,
        rule: 'The 1950 return remains entirely in the USD proxy. German currency-per-USD ratios are first applied to the 1951 return, so the reconstructed 1949-to-1950 German currency factor cannot enter the global chain.'
    },
    sourceFiles: sourceMetadata,
    rawDataHash,
    annualReturnHash: sha256Canonical(annualReturns),
    indexLevelHash: sha256Canonical(indexLevels),
    segments: [
        {
            startYear: 1925,
            endYear: 1950,
            evidenceClass: 'proxy',
            currencyConvention: 'USD proxy',
            returnConstruction: 'JST nominal local equity total returns converted with local-currency-per-USD ratios.'
        },
        {
            startYear: 1951,
            endYear: 2020,
            evidenceClass: 'backtested',
            currencyConvention: 'German investor currency; synthetic DM scale after 1998 is return-equivalent to EUR.',
            returnConstruction: 'JST nominal local equity total returns converted through local and German currency-per-USD ratios.'
        },
        {
            startYear: 2021,
            endYear: 2025,
            evidenceClass: 'estimated',
            currencyConvention: 'EUR',
            returnConstruction: 'OECD December share-price return plus frozen JST 2020 dividend return, converted with ECB December reference rates.'
        }
    ],
    knownMissingCountryYears: KNOWN_MISSING_COUNTRY_YEARS,
    dividendProxyByIso,
    modernWeights,
    countryCounts,
    annualReturns,
    indexLevels
};

const output = `/**
 * GENERATED DATA ARTIFACT - DO NOT EDIT MANUALLY.
 * Build with: npm run build:global-equity-data
 *
 * The data values and adaptations derived from JST R6 are licensed under
 * CC BY-NC-SA 4.0. See data/historical/global-equity-research-chain/LICENSE.md.
 */
"use strict";

function deepFreezeGlobalEquityResearchData(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreezeGlobalEquityResearchData(child, seen);
    return Object.freeze(value);
}

export const GLOBAL_EQUITY_RESEARCH_CHAIN = deepFreezeGlobalEquityResearchData(${JSON.stringify(chain, null, 4)});

export const GLOBAL_EQUITY_RESEARCH_ANNUAL_RETURNS =
    GLOBAL_EQUITY_RESEARCH_CHAIN.annualReturns;

export const GLOBAL_EQUITY_RESEARCH_INDEX_LEVELS =
    GLOBAL_EQUITY_RESEARCH_CHAIN.indexLevels;
`;

fs.writeFileSync(OUTPUT_PATH, output, 'utf8');
console.log(`Generated ${path.relative(PROJECT_ROOT, OUTPUT_PATH)}`);
console.log(`rawDataHash=${rawDataHash}`);
console.log(`annualReturnHash=${chain.annualReturnHash}`);
console.log(`indexLevelHash=${chain.indexLevelHash}`);
