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
    'gold-german-investor-chain'
);
const ORIGINAL_DATA_DIRECTORY = path.join(DATA_DIRECTORY, 'originals');
const OUTPUT_PATH = path.join(
    PROJECT_ROOT,
    'app',
    'simulator',
    'gold-german-investor-chain.js'
);
const VERIFY_ONLY = process.argv.includes('--verify-only');

const START_YEAR = 1925;
const END_YEAR = 2025;
const EXPECTED_YEAR_COUNT = END_YEAR - START_YEAR + 1;
const TROY_OUNCES_PER_KILOGRAM = 32.15074656862798;
const DEM_PER_EUR = 1.95583;

const SOURCE_FILES = Object.freeze({
    jst: {
        filePath: path.join(
            PROJECT_ROOT,
            'data',
            'historical',
            'global-equity-research-chain',
            'originals',
            'JSTdatasetR6.xlsx'
        ),
        sha256: 'c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d',
        sourceUrl: 'https://www.macrohistory.net/app/download/9834512569/JSTdatasetR6.xlsx?t=1763503850',
        sourceSeries: 'JST R6 DEU.xrusd',
        license: 'CC BY-NC-SA 4.0',
        dataAsOf: 'JST Macrohistory Database revision R6'
    },
    bundesbankGoldDem: {
        filePath: path.join(
            ORIGINAL_DATA_DIRECTORY,
            'bundesbank-frankfurt-gold-annual-1968-1998.csv'
        ),
        sha256: 'c08654b065a5685456bf2ebd954b43fec3cef9a9755f121d9dab6420c9410e2e',
        sourceUrl: 'https://api.statistiken.bundesbank.de/rest/data/BBEX3/A.XAU.DEM.EA.AC.C03?startPeriod=1968&endPeriod=1998',
        sourceSeries: 'BBEX3.A.XAU.DEM.EA.AC.C03',
        license: 'Deutsche Bundesbank statistics reuse terms; attribution required',
        dataAsOf: 'retrieved 2026-07-30'
    },
    bundesbankUsdEur: {
        filePath: path.join(
            ORIGINAL_DATA_DIRECTORY,
            'bundesbank-usd-eur-annual-1999-2025.csv'
        ),
        sha256: 'ba8810d1b754e63f26e84824dcf0dd2f24716c51e9ba385bb09002b2fc087a7e',
        sourceUrl: 'https://api.statistiken.bundesbank.de/rest/data/BBEX3/A.USD.EUR.BB.AC.A04?startPeriod=1999&endPeriod=2025',
        sourceSeries: 'BBEX3.A.USD.EUR.BB.AC.A04',
        license: 'Deutsche Bundesbank/ESCB statistics reuse terms; attribution required',
        dataAsOf: 'retrieved 2026-07-30'
    },
    worldBankGoldUsd: {
        filePath: path.join(
            ORIGINAL_DATA_DIRECTORY,
            'world-bank-cmo-historical-data-annual-2026-07.xlsx'
        ),
        sha256: 'd418b3c12f1e374a77113d8d42aeb3ffe8c154e7156e28c7b289e7adccf36af0',
        sourceUrl: 'https://thedocs.worldbank.org/en/doc/74e8be41ceb20fa0da750cda2f6b9e4e-0050012026/related/CMO-Historical-Data-Annual.xlsx',
        sourceSeries: 'World Bank Commodity Price Data (Pink Sheet), Annual Prices (Nominal), Gold',
        license: 'CC BY 4.0',
        dataAsOf: 'updated 2026-03-03; retrieved 2026-07-30'
    }
});

const GOLD_POLICY = Object.freeze({
    usdGoldPriceAnchors: Object.freeze([
        Object.freeze({
            startYear: 1924,
            endYear: 1932,
            value: 20.67,
            kind: 'statutory_fixed_price',
            observationTiming: 'end_of_year',
            reference: 'https://www.federalreservehistory.org/essays/gold-reserve-act'
        }),
        Object.freeze({
            startYear: 1933,
            endYear: 1933,
            value: 34.06,
            kind: 'official_rfc_purchase_price',
            observationTiming: 'year_end_price_fixed_1933-12-18',
            reference: 'https://fraser.stlouisfed.org/title/annual-report-federal-reserve-bank-new-york-467/nineteenth-annual-report-federal-reserve-bank-new-york-year-ended-december-31-1933-17978/fulltext',
            note: 'Highest and final RFC gold purchase price of 1933, fixed on 18 December; used as the 1933 year-end policy-price observation.'
        }),
        Object.freeze({
            startYear: 1934,
            endYear: 1967,
            value: 35,
            kind: 'statutory_fixed_price',
            observationTiming: 'end_of_year',
            reference: 'https://www.federalreservehistory.org/essays/gold-reserve-act'
        })
    ]),
    marketQualification: Object.freeze({
        reference: 'https://www.federalreservehistory.org/essays/gold-convertibility-ends',
        note: 'The statutory US gold price is a policy anchor, not evidence of a continuously accessible German retail gold market.'
    })
});

function fail(message, details = undefined) {
    const error = new Error(message);
    if (details !== undefined) error.details = details;
    throw error;
}

function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function sha256File(filePath) {
    return sha256(fs.readFileSync(filePath));
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
        if (!Number.isFinite(value)) fail('Cannot canonicalize non-finite number', { value });
        return JSON.stringify(value);
    }
    if (typeof value === 'string' || typeof value === 'boolean') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
    if (typeof value === 'object') {
        const keys = Object.keys(value).sort(canonicalKeyCompare);
        return `{${keys.map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
    }
    fail('Unsupported canonical value', { type: typeof value });
}

function sha256Canonical(value) {
    return sha256(canonicalize(value));
}

function positiveNumber(value, label) {
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || !(numericValue > 0)) {
        fail(`${label} must be finite and greater than zero`, { value });
    }
    return numericValue;
}

function assertPinnedSources() {
    for (const [sourceId, source] of Object.entries(SOURCE_FILES)) {
        if (!fs.existsSync(source.filePath)) {
            fail('Pinned source file is missing', { sourceId, filePath: source.filePath });
        }
        const actualSha256 = sha256File(source.filePath);
        if (actualSha256 !== source.sha256) {
            fail('Pinned source hash mismatch', {
                sourceId,
                expectedSha256: source.sha256,
                actualSha256
            });
        }
    }
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
        .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint) => (
            String.fromCodePoint(Number.parseInt(codePoint, 16))
        ));
}

function columnIndexFromCellReference(reference) {
    const letters = reference.match(/^[A-Z]+/)?.[0];
    if (!letters) fail('XLSX cell reference has no column', { reference });
    let index = 0;
    for (const letter of letters) index = (index * 26) + letter.charCodeAt(0) - 64;
    return index - 1;
}

function readXlsxSheetRows(xlsxBuffer, sheetName) {
    const entries = unzipEntries(xlsxBuffer);
    const workbookXml = entries.get('xl/workbook.xml')?.toString('utf8');
    const relationshipsXml = entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8');
    if (!workbookXml || !relationshipsXml) fail('Expected XLSX workbook metadata is missing');

    const sheets = [...workbookXml.matchAll(/<sheet ([^>]*)\/>/g)].map((match) => {
        const attributes = match[1];
        return {
            name: decodeXmlText(attributes.match(/\bname="([^"]+)"/)?.[1] ?? ''),
            relationshipId: attributes.match(/\br:id="([^"]+)"/)?.[1]
        };
    });
    const sheet = sheets.find(candidate => candidate.name === sheetName);
    if (!sheet?.relationshipId) fail('XLSX worksheet is missing', { sheetName });

    const relationships = [...relationshipsXml.matchAll(/<Relationship ([^>]*)\/>/g)]
        .map((match) => {
            const attributes = match[1];
            return {
                id: attributes.match(/\bId="([^"]+)"/)?.[1],
                target: attributes.match(/\bTarget="([^"]+)"/)?.[1]
            };
        });
    const target = relationships.find(({ id }) => id === sheet.relationshipId)?.target;
    if (!target) fail('XLSX worksheet relationship is missing', { sheetName });
    const worksheetPath = path.posix.normalize(path.posix.join('xl', target));
    const worksheetXml = entries.get(worksheetPath)?.toString('utf8');
    if (!worksheetXml) fail('XLSX worksheet content is missing', { sheetName, worksheetPath });

    const sharedStringsXml = entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
    const sharedStrings = [...sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => (
        [...match[1].matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)]
            .map(textMatch => decodeXmlText(textMatch[1]))
            .join('')
    ));

    return [...worksheetXml.matchAll(/<row(?: [^>]*)?>([\s\S]*?)<\/row>/g)]
        .map((rowMatch) => {
            const row = [];
            for (const cellMatch of rowMatch[1].matchAll(/<c(?: ([^>]*))?>([\s\S]*?)<\/c>/g)) {
                const attributes = cellMatch[1] ?? '';
                const cellXml = cellMatch[2];
                const reference = attributes.match(/\br="([^"]+)"/)?.[1];
                if (!reference) continue;
                const type = attributes.match(/\bt="([^"]+)"/)?.[1];
                const rawValue = cellXml.match(/<v>([\s\S]*?)<\/v>/)?.[1];
                let value = '';
                if (type === 'inlineStr') {
                    value = [...cellXml.matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)]
                        .map(match => decodeXmlText(match[1]))
                        .join('');
                } else if (rawValue !== undefined) {
                    value = type === 's'
                        ? sharedStrings[Number(rawValue)]
                        : decodeXmlText(rawValue);
                }
                row[columnIndexFromCellReference(reference)] = value;
            }
            return row;
        });
}

function readJstGermanUsdRates() {
    const rows = readXlsxSheetRows(fs.readFileSync(SOURCE_FILES.jst.filePath), 'Sheet1');
    const headers = rows[0] ?? [];
    const yearColumn = headers.indexOf('year');
    const isoColumn = headers.indexOf('iso');
    const rateColumn = headers.indexOf('xrusd');
    if ([yearColumn, isoColumn, rateColumn].some(index => index < 0)) {
        fail('JST worksheet is missing year, iso or xrusd');
    }

    const rates = {};
    for (const row of rows.slice(1)) {
        const year = Number(row[yearColumn]);
        if (row[isoColumn] !== 'DEU' || year < 1924 || year > 1967) continue;
        if (row[rateColumn] === '' || row[rateColumn] === undefined) continue;
        rates[year] = positiveNumber(row[rateColumn], `JST DEU.xrusd ${year}`);
    }
    const requiredYears = [
        ...Array.from({ length: 21 }, (_unused, index) => 1924 + index),
        ...Array.from({ length: 18 }, (_unused, index) => 1950 + index)
    ];
    for (const year of requiredYears) {
        if (!Number.isFinite(rates[year])) fail('Required JST German FX observation is missing', { year });
    }
    return rates;
}

function parseBundesbankSeries(source, expectedSeriesId, startYear, endYear) {
    const text = fs.readFileSync(source.filePath, 'utf8').replace(/^\uFEFF/, '');
    const lines = text.split(/\r?\n/).filter(Boolean);
    const headers = lines[0].split(';');
    const yearColumn = headers.indexOf('TIME_PERIOD');
    const valueColumn = headers.indexOf('OBS_VALUE');
    const idColumn = headers.indexOf('BBK_ID');
    if ([yearColumn, valueColumn, idColumn].some(index => index < 0)) {
        fail('Bundesbank CSV is missing required columns', { filePath: source.filePath });
    }

    const values = {};
    for (const line of lines.slice(1)) {
        const fields = line.split(';');
        if (fields[idColumn] !== expectedSeriesId) {
            fail('Bundesbank CSV contains an unexpected series', {
                expectedSeriesId,
                actualSeriesId: fields[idColumn]
            });
        }
        const year = Number(fields[yearColumn]);
        values[year] = positiveNumber(fields[valueColumn], `${expectedSeriesId} ${year}`);
    }
    for (let year = startYear; year <= endYear; year += 1) {
        if (!Number.isFinite(values[year])) {
            fail('Bundesbank annual observation is missing', { expectedSeriesId, year });
        }
    }
    if (Object.keys(values).length !== endYear - startYear + 1) {
        fail('Bundesbank annual coverage contains unexpected years', {
            expectedSeriesId,
            actualYearCount: Object.keys(values).length
        });
    }
    return values;
}

function readWorldBankAnnualGoldUsd() {
    const rows = readXlsxSheetRows(
        fs.readFileSync(SOURCE_FILES.worldBankGoldUsd.filePath),
        'Annual Prices (Nominal)'
    );
    const headerRowIndex = rows.findIndex(row => row.includes('Gold'));
    if (headerRowIndex < 0) fail('World Bank annual sheet has no Gold column');
    const goldColumn = rows[headerRowIndex].indexOf('Gold');
    const values = {};
    for (const row of rows.slice(headerRowIndex + 2)) {
        const year = Number(row[0]);
        if (!Number.isInteger(year) || year < 1999 || year > END_YEAR) continue;
        values[year] = positiveNumber(row[goldColumn], `World Bank Gold ${year}`);
    }
    for (let year = 1999; year <= END_YEAR; year += 1) {
        if (!Number.isFinite(values[year])) {
            fail('World Bank annual gold observation is missing', { year });
        }
    }
    return values;
}

function policyGoldUsd(year) {
    const segment = GOLD_POLICY.usdGoldPriceAnchors.find(
        candidate => year >= candidate.startYear && year <= candidate.endYear
    );
    if (!segment) fail('No USD gold-price anchor for year', { year });
    return segment.value;
}

function selectObservations(values, predicate) {
    return Object.fromEntries(
        Object.entries(values).filter(([year]) => predicate(Number(year)))
    );
}

function buildZeroObservations(annualReturnsPct, jstUsdRates) {
    const observations = [];
    for (let year = START_YEAR; year <= END_YEAR; year += 1) {
        const value = annualReturnsPct[year];
        const isBridgeYear = year >= 1945 && year <= 1950;
        if (isBridgeYear && value !== 0) {
            fail('Explicit post-war bridge must remain exactly zero', { year, value });
        }
        if (value !== 0) continue;
        if (isBridgeYear) {
            observations.push({
                year,
                classification: 'explicit_estimated_bridge',
                componentProof: null,
                explanation: 'Explicit post-war market/currency-discontinuity bridge; not an observed return.'
            });
            continue;
        }
        const isPolicyFxSegment = (year >= 1925 && year <= 1944)
            || (year >= 1951 && year <= 1967);
        if (!isPolicyFxSegment) {
            fail('Unclassified zero gold return is forbidden', { year, value });
        }
        const componentProof = {
            previousUsdGoldPrice: policyGoldUsd(year - 1),
            currentUsdGoldPrice: policyGoldUsd(year),
            previousGermanCurrencyPerUsd: jstUsdRates[year - 1],
            currentGermanCurrencyPerUsd: jstUsdRates[year]
        };
        if (componentProof.previousUsdGoldPrice !== componentProof.currentUsdGoldPrice
            || componentProof.previousGermanCurrencyPerUsd !== componentProof.currentGermanCurrencyPerUsd) {
            fail('Derived zero is not supported by unchanged source components', { year, componentProof });
        }
        observations.push({
            year,
            classification: 'derived_unchanged_components',
            componentProof,
            explanation: 'Derived zero: both the USD gold-price anchor and the observed JST German FX rate are unchanged from the prior year.'
        });
    }
    return observations;
}

function annualReturnPct(currentLevel, previousLevel, year) {
    const value = ((currentLevel / previousLevel) - 1) * 100;
    if (!Number.isFinite(value) || value <= -100) {
        fail('Calculated annual gold return is invalid', {
            year,
            currentLevel,
            previousLevel,
            value
        });
    }
    return Object.is(value, -0) ? 0 : value;
}

function buildAnnualReturns() {
    const jstUsdRates = readJstGermanUsdRates();
    const bundesbankGoldDem = parseBundesbankSeries(
        SOURCE_FILES.bundesbankGoldDem,
        'BBEX3.A.XAU.DEM.EA.AC.C03',
        1968,
        1998
    );
    const bundesbankUsdEur = parseBundesbankSeries(
        SOURCE_FILES.bundesbankUsdEur,
        'BBEX3.A.USD.EUR.BB.AC.A04',
        1999,
        2025
    );
    const worldBankGoldUsd = readWorldBankAnnualGoldUsd();
    const annualReturnsPct = {};

    for (let year = 1925; year <= 1944; year += 1) {
        annualReturnsPct[year] = annualReturnPct(
            policyGoldUsd(year) * jstUsdRates[year],
            policyGoldUsd(year - 1) * jstUsdRates[year - 1],
            year
        );
    }
    for (let year = 1945; year <= 1950; year += 1) {
        annualReturnsPct[year] = 0;
    }
    for (let year = 1951; year <= 1967; year += 1) {
        annualReturnsPct[year] = annualReturnPct(
            policyGoldUsd(year) * jstUsdRates[year],
            policyGoldUsd(year - 1) * jstUsdRates[year - 1],
            year
        );
    }

    const theoretical1967DemPerKilogram =
        policyGoldUsd(1967) * jstUsdRates[1967] * TROY_OUNCES_PER_KILOGRAM;
    annualReturnsPct[1968] = annualReturnPct(
        bundesbankGoldDem[1968],
        theoretical1967DemPerKilogram,
        1968
    );
    for (let year = 1969; year <= 1998; year += 1) {
        annualReturnsPct[year] = annualReturnPct(
            bundesbankGoldDem[year],
            bundesbankGoldDem[year - 1],
            year
        );
    }

    const gold1998EurPerTroyOunce =
        bundesbankGoldDem[1998] / DEM_PER_EUR / TROY_OUNCES_PER_KILOGRAM;
    const gold1999EurPerTroyOunce =
        worldBankGoldUsd[1999] / bundesbankUsdEur[1999];
    annualReturnsPct[1999] = annualReturnPct(
        gold1999EurPerTroyOunce,
        gold1998EurPerTroyOunce,
        1999
    );
    for (let year = 2000; year <= END_YEAR; year += 1) {
        annualReturnsPct[year] = annualReturnPct(
            worldBankGoldUsd[year] / bundesbankUsdEur[year],
            worldBankGoldUsd[year - 1] / bundesbankUsdEur[year - 1],
            year
        );
    }

    if (Object.keys(annualReturnsPct).length !== EXPECTED_YEAR_COUNT) {
        fail('Gold return chain has wrong year count', {
            expected: EXPECTED_YEAR_COUNT,
            actual: Object.keys(annualReturnsPct).length
        });
    }
    const zeroObservations = buildZeroObservations(annualReturnsPct, jstUsdRates);
    return {
        annualReturnsPct,
        zeroObservations,
        sourceObservations: {
            jstGermanCurrencyPerUsdUsed: selectObservations(
                jstUsdRates,
                year => (year >= 1924 && year <= 1944) || (year >= 1950 && year <= 1967)
            ),
            bundesbankGoldDemPerKilogram: bundesbankGoldDem,
            bundesbankUsdPerEur: bundesbankUsdEur,
            worldBankGoldUsdPerTroyOunce: worldBankGoldUsd
        },
        excludedSourceObservations: {
            jstGermanCurrencyPerUsd1946To1949: {
                values: selectObservations(jstUsdRates, year => year >= 1946 && year <= 1949),
                reason: 'Excluded from calculation because post-war Reichsmark observations and the 1948 currency reform do not form a continuous investable German-currency numeraire; the explicit 1945-1950 bridge covers the whole discontinuity.'
            }
        },
        seamLevels: {
            theoretical1967DemPerKilogram,
            observed1968DemPerKilogram: bundesbankGoldDem[1968],
            gold1998EurPerTroyOunce,
            gold1999EurPerTroyOunce
        }
    };
}

function buildArtifact() {
    assertPinnedSources();
    const {
        annualReturnsPct,
        zeroObservations,
        sourceObservations,
        excludedSourceObservations,
        seamLevels
    } = buildAnnualReturns();
    const sourceFiles = Object.fromEntries(
        Object.entries(SOURCE_FILES).map(([sourceId, source]) => [
            sourceId,
            {
                fileName: path.basename(source.filePath),
                sha256: source.sha256,
                sourceUrl: source.sourceUrl,
                sourceSeries: source.sourceSeries,
                license: source.license,
                dataAsOf: source.dataAsOf
            }
        ])
    );
    const rawDataHash = sha256Canonical(
        Object.fromEntries(
            Object.entries(SOURCE_FILES).map(([sourceId, source]) => [sourceId, source.sha256])
        )
    );
    const methodHash = sha256Canonical({
        goldPolicy: GOLD_POLICY,
        troyOuncesPerKilogram: TROY_OUNCES_PER_KILOGRAM,
        deutscheMarkPerEuro: DEM_PER_EUR,
        postWarBridge: {
            startYear: 1945,
            endYear: 1950,
            annualReturnPct: 0
        }
    });
    return {
        schemaVersion: 'GoldGermanInvestorChainV1',
        seriesId: 'gold_german_investor_currency_annual_return',
        label: 'Gold annual return proxy in German investor currency',
        coverage: {
            startYear: START_YEAR,
            endYear: END_YEAR,
            yearCount: EXPECTED_YEAR_COUNT
        },
        unit: 'percent_per_year',
        returnConvention: {
            measure: 'nominal gold-price change in German investor currency using segment-specific observation timing',
            timing: 'simulation year t compares the documented segment-specific level t with level t-1',
            timingSegments: [
                {
                    startYear: 1925,
                    endYear: 1967,
                    convention: 'end_of_year_policy_price_times_end_of_year_fx',
                    note: 'JST DEU.xrusd is an end-of-year exchange-rate series; 1933 uses the official RFC year-end purchase price.'
                },
                {
                    startYear: 1968,
                    endYear: 1968,
                    convention: 'mixed_seam_1967_end_of_year_to_1968_partial_year_average',
                    note: 'The Frankfurt annual average begins on 18 June 1968 and is not like-for-like with the 1967 year-end anchor.'
                },
                {
                    startYear: 1969,
                    endYear: 1998,
                    convention: 'annual_average_to_annual_average_frankfurt_fixing'
                },
                {
                    startYear: 1999,
                    endYear: 1999,
                    convention: 'mixed_source_and_numeraire_annual_average_seam'
                },
                {
                    startYear: 2000,
                    endYear: 2025,
                    convention: 'annual_average_world_bank_gold_divided_by_annual_average_usd_eur'
                }
            ],
            compounding: 'simple annual percentage return applied once by the existing simulator',
            productCosts: 'excluded',
            storageCosts: 'excluded',
            bidAskSpread: 'excluded',
            taxes: 'excluded'
        },
        currencyRegimes: [
            {
                startYear: 1925,
                endYear: 1944,
                value: 'historical German currency per USD from JST R6',
                note: 'Return proxy only; no claim of continuous German retail-market accessibility.'
            },
            {
                startYear: 1945,
                endYear: 1950,
                value: 'explicit post-war and currency-reform bridge',
                note: 'Zero return is a model assumption because no comparable continuous German annual gold/FX market series is used.'
            },
            {
                startYear: 1951,
                endYear: 1998,
                value: 'DEM'
            },
            {
                startYear: 1999,
                endYear: 2025,
                value: 'EUR',
                conversion: 'World Bank USD per troy ounce divided by Bundesbank/ECB USD per EUR annual average'
            }
        ],
        qualitySegments: [
            {
                startYear: 1925,
                endYear: 1932,
                evidenceClass: 'proxy',
                sourceSeries: 'Federal Reserve statutory USD gold price policy × JST R6 DEU.xrusd',
                note: 'Derived year-end policy/FX proxy, not an observed investable German gold return.'
            },
            {
                startYear: 1933,
                endYear: 1933,
                evidenceClass: 'proxy',
                sourceSeries: 'Federal Reserve Bank of New York reported year-end RFC gold purchase price × JST R6 DEU.xrusd',
                note: 'The 18 December official purchase price replaces the obsolete $20.67 anchor for the 1933 year-end observation.'
            },
            {
                startYear: 1934,
                endYear: 1944,
                evidenceClass: 'proxy',
                sourceSeries: 'Federal Reserve statutory USD gold price policy × JST R6 DEU.xrusd',
                note: 'Derived year-end policy/FX proxy, not an observed investable German gold return.'
            },
            {
                startYear: 1945,
                endYear: 1950,
                evidenceClass: 'estimated',
                sourceSeries: 'explicit zero-return bridge',
                note: 'Wartime/post-war market closure and the 1948 currency discontinuity are not silently interpolated.'
            },
            {
                startYear: 1951,
                endYear: 1967,
                evidenceClass: 'proxy',
                sourceSeries: 'Federal Reserve statutory USD gold price policy × JST R6 DEU.xrusd',
                note: 'Derived end-of-year fixed-parity/FX proxy before the Frankfurt gold-fixing series begins.'
            },
            {
                startYear: 1968,
                endYear: 1968,
                evidenceClass: 'derived',
                sourceSeries: 'Bundesbank Frankfurt fixing annual average versus 1967 statutory-price/FX anchor',
                note: 'The 1968 Bundesbank average starts on 18 June; the seam is therefore not a full-year like-for-like observation.'
            },
            {
                startYear: 1969,
                endYear: 1998,
                evidenceClass: 'derived',
                sourceSeries: 'Bundesbank Frankfurt fixing, DM per kilogram, annual averages of daily quotations'
            },
            {
                startYear: 1999,
                endYear: 1999,
                evidenceClass: 'derived',
                sourceSeries: 'World Bank Gold USD/troy ounce and Bundesbank USD/EUR versus fixed DEM/EUR conversion of 1998 Frankfurt fixing'
            },
            {
                startYear: 2000,
                endYear: 2025,
                evidenceClass: 'derived',
                sourceSeries: 'World Bank Gold USD/troy ounce divided by Bundesbank/ECB USD/EUR annual averages'
            }
        ],
        discontinuities: [
            {
                year: 1933,
                event: 'US gold purchase program repriced official purchases during 1933',
                runtimeTreatment: '18 December 1933 RFC purchase price of USD 34.06 is used as the year-end anchor',
                limitation: 'Policy-price proxy; not evidence of an investable German retail quotation.'
            },
            {
                year: 1934,
                event: 'Gold Reserve Act reset the statutory US gold price to USD 35 per troy ounce',
                runtimeTreatment: '1934 year-end statutory anchor is compared with the 1933 official RFC year-end purchase price'
            },
            {
                startYear: 1945,
                endYear: 1950,
                event: 'German wartime/post-war market gap and currency reform',
                runtimeTreatment: 'explicit zero-return model-assumption bridge',
                limitation: 'The bridge preserves nominal simulator continuity but is not an observed German-investor gold return; positive inflation makes this assumption negative in real terms.'
            },
            {
                year: 1961,
                event: 'Deutsche Mark revaluation against the US dollar',
                runtimeTreatment: 'captured by the JST end-of-year DEM/USD observation; no manual override'
            },
            {
                year: 1968,
                event: 'Frankfurt gold-fixing series begins on 18 June 1968',
                runtimeTreatment: 'partial-year annual average compared with a 1967 derived parity/FX anchor'
            },
            {
                year: 1971,
                event: 'US dollar gold convertibility suspended',
                runtimeTreatment: 'captured in the observed Frankfurt annual-average gold price; no policy-price anchor after 1967'
            },
            {
                year: 1973,
                event: 'Bretton Woods exchange-rate system gave way to generalized floating',
                runtimeTreatment: 'captured in the observed Frankfurt annual-average DEM gold price'
            },
            {
                year: 1999,
                event: 'DEM-to-EUR and Frankfurt-to-World-Bank source seam',
                runtimeTreatment: `1998 DEM level converted at ${DEM_PER_EUR} DEM/EUR and from kilograms to troy ounces`
            }
        ],
        gapPolicy: {
            fallbackZeroSegments: [],
            explicitEstimatedBridge: {
                startYear: 1945,
                endYear: 1950,
                annualReturnPct: 0
            },
            rejectMissingOrNonFinite: true,
            rejectUnclassifiedZero: true,
            derivedZeroRequirement: 'both USD gold-price anchor and JST German FX observation must be exactly unchanged'
        },
        monteCarloQualification: {
            samplingTreatment: 'all 101 annual returns remain in the legacy historical sampling pool',
            limitation: 'Proxy years and the six-year nominal zero bridge are not repeatable market observations and can understate modeled gold volatility; no silent exclusion or reweighting is applied in this slice.'
        },
        zeroObservations,
        policyReferences: GOLD_POLICY,
        conversionConstants: {
            troyOuncesPerKilogram: TROY_OUNCES_PER_KILOGRAM,
            deutscheMarkPerEuro: DEM_PER_EUR
        },
        sourceFiles,
        sourceObservations,
        excludedSourceObservations,
        seamLevels,
        hashes: {
            rawDataHash,
            rawDataScope: 'all four pinned source files',
            methodHash,
            annualReturnHash: sha256Canonical(annualReturnsPct)
        },
        annualReturnsPct
    };
}

function renderModule(artifact) {
    return Buffer.from(`/**
 * Generated by scripts/build-gold-german-investor-chain.mjs.
 * Do not edit by hand.
 */
"use strict";

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

export const GOLD_GERMAN_INVESTOR_CHAIN = deepFreeze(${JSON.stringify(artifact, null, 2)});

export const GOLD_GERMAN_INVESTOR_ANNUAL_RETURNS =
    GOLD_GERMAN_INVESTOR_CHAIN.annualReturnsPct;
`, 'utf8');
}

function main() {
    const artifact = buildArtifact();
    const generated = renderModule(artifact);

    if (VERIFY_ONLY) {
        if (!fs.existsSync(OUTPUT_PATH)) {
            fail('Generated German-investor gold module is missing', { outputPath: OUTPUT_PATH });
        }
        const existing = fs.readFileSync(OUTPUT_PATH);
        if (!existing.equals(generated)) {
            fail('Generated German-investor gold module is stale', {
                outputPath: OUTPUT_PATH,
                expectedSha256: sha256(generated),
                actualSha256: sha256(existing)
            });
        }
        process.stdout.write(
            `Verified German-investor gold chain ${artifact.coverage.startYear}-${artifact.coverage.endYear}; `
            + `${artifact.coverage.yearCount} years; annualReturnHash ${artifact.hashes.annualReturnHash}\n`
        );
        return;
    }

    fs.writeFileSync(OUTPUT_PATH, generated);
    process.stdout.write(
        `Built German-investor gold chain ${artifact.coverage.startYear}-${artifact.coverage.endYear}; `
        + `${artifact.coverage.yearCount} years; annualReturnHash ${artifact.hashes.annualReturnHash}\n`
    );
}

main();
