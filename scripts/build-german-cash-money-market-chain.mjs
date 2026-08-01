import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';
import {
    isPopplerVersionCompatible,
    POPPLER_MINIMUM_VERSION,
    resolvePopplerTool
} from './lib/poppler-toolchain.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT = path.resolve(__dirname, '..');
const DATA_DIRECTORY = path.join(
    ROOT,
    'data',
    'historical',
    'german-cash-money-market-chain'
);
const ORIGINAL_DATA_DIRECTORY = path.join(DATA_DIRECTORY, 'originals');
const JST_ORIGINAL_PATH = path.join(
    ROOT,
    'data',
    'historical',
    'global-equity-research-chain',
    'originals',
    'JSTdatasetR6.xlsx'
);
const OUTPUT_PATH = path.join(
    ROOT,
    'app',
    'simulator',
    'german-cash-money-market-chain.js'
);
const VERIFY_ONLY = process.argv.includes('--verify-only');

const START_YEAR = 1925;
const END_YEAR = 2025;
const EXPECTED_YEAR_COUNT = END_YEAR - START_YEAR + 1;
const WAR_GAP_START_YEAR = 1945;
const WAR_GAP_END_YEAR = 1948;
const JST_LAST_OBSERVED_YEAR = 1944;
const BUNDESBANK_FIRST_YEAR = 1949;
const PDF_FIRST_PAGE = 15;
const PDF_LAST_PAGE = 16;
const ECB_ESTR_DISCLAIMER_URL =
    'https://www.ecb.europa.eu/stats/financial_markets_and_interest_rates/euro_short-term_rate/html/index.en.html';

const SOURCE_FILES = Object.freeze({
    jst: Object.freeze({
        sourceRole: 'primary',
        filePath: JST_ORIGINAL_PATH,
        sha256: 'c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d',
        sourceUrl: 'https://www.macrohistory.net/app/download/9834512569/JSTdatasetR6.xlsx?t=1763503850',
        sourceSeries: 'DEU.stir',
        license: 'CC BY-NC-SA 4.0',
        dataAsOf: 'R6'
    }),
    bundesbankPdf: Object.freeze({
        sourceRole: 'primary',
        filePath: path.join(
            ORIGINAL_DATA_DIRECTORY,
            'bundesbank-long-series-2026-03-05.pdf'
        ),
        sha256: 'cec782c8a1110a5377fe81f463d6b3b6b4a22e9fde91df98693d76ede56343c1',
        sourceUrl: 'https://www.bundesbank.de/resource/blob/844784/e3b7675130e46c83fb3a8a1b1c3663ec/472B63F073F071307366337C94F8C870/0-lange-zeitreihen-data.pdf',
        sourceSeries: 'Deutsche Bundesbank Long time series, pages 15-16, overnight funds',
        license: 'ESCB statistics reuse policy; source attribution required',
        dataAsOf: '2026-03-05'
    }),
    bundesbankTextExtract: Object.freeze({
        sourceRole: 'derived',
        filePath: path.join(
            ORIGINAL_DATA_DIRECTORY,
            'bundesbank-money-market-pages-15-16-layout.txt'
        ),
        sha256: '85e3b0f6678944a555bb6848b2eefe5601475124bae497e6e63faf47b759c383',
        sourceUrl: null,
        sourceSeries: 'pdftotext -layout extraction of pinned Bundesbank PDF pages 15-16',
        license: 'Derived extraction; Bundesbank/ESCB source terms remain applicable',
        dataAsOf: '2026-03-05'
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
        if (!Number.isFinite(value)) fail('Cannot canonicalize a non-finite number', { value });
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

function assertPinnedSourceHashes() {
    for (const [sourceId, source] of Object.entries(SOURCE_FILES)) {
        if (!fs.existsSync(source.filePath)) {
            fail('Pinned source file is missing', { sourceId, filePath: source.filePath });
        }
        const actualHash = sha256File(source.filePath);
        if (actualHash !== source.sha256) {
            fail('Pinned source hash mismatch', {
                sourceId,
                expected: source.sha256,
                actual: actualHash
            });
        }
    }
}

function resolvePinnedPdftohtml() {
    return resolvePopplerTool().executable;
}

function parseBundesbankCoordinateXml(xml) {
    const producerMatch = xml.match(/<pdf2xml\s+producer="([^"]+)"\s+version="([^"]+)"/);
    if (
        producerMatch?.[1] !== 'poppler'
        || !isPopplerVersionCompatible(
            producerMatch?.[2] || null,
            POPPLER_MINIMUM_VERSION
        )
    ) {
        fail('Bundesbank coordinate extraction has an unexpected producer', {
            expectedProducer: 'poppler',
            minimumVersion: POPPLER_MINIMUM_VERSION,
            actualProducer: producerMatch?.[1] || null,
            actualVersion: producerMatch?.[2] || null
        });
    }

    const nodes = [...xml.matchAll(/<text\s+([^>]*)>([\s\S]*?)<\/text>/g)].map(match => {
        const left = Number(match[1].match(/\bleft="([^"]+)"/)?.[1]);
        const text = decodeXmlText(match[2].replace(/<[^>]+>/g, '')).trim();
        return { left, text };
    });
    const rates = {};

    for (let index = 0; index < nodes.length; index += 1) {
        const year = Number(nodes[index].text);
        if (
            !Number.isInteger(year)
            || year < BUNDESBANK_FIRST_YEAR
            || year > END_YEAR
            || !(nodes[index].left >= 100 && nodes[index].left < 200)
        ) {
            continue;
        }
        if (Object.hasOwn(rates, year)) {
            fail('Duplicate Bundesbank year in coordinate extraction', { year });
        }

        let rate = null;
        for (let candidateIndex = index + 1; candidateIndex < nodes.length; candidateIndex += 1) {
            const candidate = nodes[candidateIndex];
            if (/^\d{4}$/.test(candidate.text) && candidate.left >= 100 && candidate.left < 200) {
                break;
            }
            if (!(candidate.left >= 280 && candidate.left <= 350)) continue;
            const normalized = candidate.text.replace(/\s+/g, '');
            if (!/^-?\d+\.\d+$/.test(normalized)) continue;
            rate = Number(normalized);
            break;
        }
        if (!Number.isFinite(rate)) {
            fail('Coordinate extraction is missing the first overnight column', { year });
        }
        rates[year] = rate;
    }

    const expectedYears = Array.from(
        { length: END_YEAR - BUNDESBANK_FIRST_YEAR + 1 },
        (_unused, index) => BUNDESBANK_FIRST_YEAR + index
    );
    const actualYears = Object.keys(rates).map(Number).sort((left, right) => left - right);
    if (canonicalize(actualYears) !== canonicalize(expectedYears)) {
        fail('Unexpected Bundesbank coordinate-oracle coverage', {
            expectedYears,
            actualYears
        });
    }
    return rates;
}

function readBundesbankPdfCoordinateRates() {
    const executable = resolvePinnedPdftohtml();
    const tempDirectory = fs.mkdtempSync(path.join(os.tmpdir(), 'ruhestandsapp-cash-pdf-'));
    const xmlPath = path.join(tempDirectory, 'bundesbank-pages-15-16.xml');
    try {
        const extraction = spawnSync(executable, [
            '-xml',
            '-f',
            String(PDF_FIRST_PAGE),
            '-l',
            String(PDF_LAST_PAGE),
            '-hidden',
            '-i',
            '-noframes',
            SOURCE_FILES.bundesbankPdf.filePath,
            xmlPath
        ], {
            encoding: 'utf8',
            windowsHide: true
        });
        if (extraction.status !== 0 || !fs.existsSync(xmlPath)) {
            fail('Poppler coordinate extraction failed', {
                executable,
                status: extraction.status,
                stdout: extraction.stdout,
                stderr: extraction.stderr,
                errorCode: extraction.error?.code || null
            });
        }
        return parseBundesbankCoordinateXml(fs.readFileSync(xmlPath, 'utf8'));
    } finally {
        fs.rmSync(tempDirectory, { recursive: true, force: true });
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

function readFirstXlsxSheetRows(xlsxBuffer) {
    const entries = unzipEntries(xlsxBuffer);
    const sharedStringsXml = entries.get('xl/sharedStrings.xml')?.toString('utf8');
    const sheetXml = entries.get('xl/worksheets/sheet1.xml')?.toString('utf8');
    if (!sharedStringsXml || !sheetXml) {
        fail('Expected XLSX shared strings or first worksheet is missing');
    }

    const sharedStrings = [...sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => (
        [...match[1].matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)]
            .map(textMatch => decodeXmlText(textMatch[1]))
            .join('')
    ));

    return [...sheetXml.matchAll(/<row(?: [^>]*)?>([\s\S]*?)<\/row>/g)].map(rowMatch => {
        const row = [];
        for (const cellMatch of rowMatch[1].matchAll(/<c ([^>]*)>([\s\S]*?)<\/c>/g)) {
            const attributes = cellMatch[1];
            const reference = attributes.match(/\br="([^"]+)"/)?.[1];
            if (!reference) fail('XLSX cell reference is missing');
            const rawValue = cellMatch[2].match(/<v>([\s\S]*?)<\/v>/)?.[1] ?? '';
            const value = /\bt="s"/.test(attributes)
                ? sharedStrings[Number(rawValue)]
                : rawValue;
            row[columnIndexFromCellReference(reference)] = value;
        }
        return row;
    });
}

function readJstGermanShortRates() {
    const rows = readFirstXlsxSheetRows(fs.readFileSync(SOURCE_FILES.jst.filePath));
    const header = rows[0];
    const yearIndex = header.indexOf('year');
    const isoIndex = header.indexOf('iso');
    const shortRateIndex = header.indexOf('stir');
    if ([yearIndex, isoIndex, shortRateIndex].some(index => index < 0)) {
        fail('Expected JST year/iso/stir columns are missing');
    }

    const rates = {};
    const missingYears = [];
    for (const row of rows.slice(1)) {
        if (row[isoIndex] !== 'DEU') continue;
        const year = Number(row[yearIndex]);
        if (year < START_YEAR || year > 1949) continue;
        const rawValue = row[shortRateIndex];
        if (rawValue === undefined || rawValue === '') {
            missingYears.push(year);
            continue;
        }
        const value = Number(rawValue);
        if (!Number.isFinite(value)) fail('JST short rate must be finite', { year, rawValue });
        rates[year] = value;
    }

    const expectedObservedYears = Array.from(
        { length: JST_LAST_OBSERVED_YEAR - START_YEAR + 1 },
        (_unused, index) => START_YEAR + index
    );
    const actualObservedYears = Object.keys(rates).map(Number).sort((left, right) => left - right);
    if (canonicalize(actualObservedYears) !== canonicalize(expectedObservedYears)) {
        fail('Unexpected JST German short-rate coverage', {
            expectedObservedYears,
            actualObservedYears
        });
    }
    const expectedMissingYears = [1945, 1946, 1947, 1948, 1949];
    if (canonicalize(missingYears) !== canonicalize(expectedMissingYears)) {
        fail('Unexpected JST German short-rate missing-year pattern', {
            expectedMissingYears,
            missingYears
        });
    }
    return rates;
}

function parseBundesbankOvernightRows(sectionText, startYear, endYear) {
    const values = {};
    for (const line of sectionText.split(/\r?\n/)) {
        const match = line.match(/^\s*(\d{4})\s+(-\s*)?(\d+\.\d+)(?:\s|$)/);
        if (!match) continue;
        const year = Number(match[1]);
        if (year < startYear || year > endYear) continue;
        if (Object.hasOwn(values, year)) fail('Duplicate Bundesbank year', { year });
        values[year] = Number(`${match[2] ? '-' : ''}${match[3]}`);
    }
    const actualYears = Object.keys(values).map(Number).sort((left, right) => left - right);
    const expectedYears = Array.from(
        { length: endYear - startYear + 1 },
        (_unused, index) => startYear + index
    );
    if (canonicalize(actualYears) !== canonicalize(expectedYears)) {
        fail('Unexpected Bundesbank overnight coverage', {
            startYear,
            endYear,
            expectedYears,
            actualYears
        });
    }
    return values;
}

function readBundesbankOvernightRates() {
    const text = fs.readFileSync(SOURCE_FILES.bundesbankTextExtract.filePath, 'utf8');
    const pageSections = text.split('\f');
    const preEuroSection = pageSections.find(section => (
        section.includes('Money market rates until 1998')
    ));
    const euroSection = pageSections.find(section => (
        section.includes('Money market rates from 1999')
    ));
    if (!preEuroSection || !euroSection) {
        fail('Bundesbank text extract does not contain both expected money-market tables');
    }
    return {
        ...parseBundesbankOvernightRows(preEuroSection, 1949, 1998),
        ...parseBundesbankOvernightRows(euroSection, 1999, END_YEAR)
    };
}

function buildAnnualReturns() {
    const jstRates = readJstGermanShortRates();
    const bundesbankRates = readBundesbankOvernightRates();
    const bundesbankPdfCoordinateRates = readBundesbankPdfCoordinateRates();
    const annualReturnsPct = {};

    for (let year = BUNDESBANK_FIRST_YEAR; year <= END_YEAR; year += 1) {
        if (bundesbankRates[year] !== bundesbankPdfCoordinateRates[year]) {
            fail('Bundesbank layout extract disagrees with the independent PDF coordinate oracle', {
                year,
                layoutExtractValue: bundesbankRates[year],
                pdfCoordinateValue: bundesbankPdfCoordinateRates[year]
            });
        }
    }

    for (let year = START_YEAR; year <= JST_LAST_OBSERVED_YEAR; year += 1) {
        annualReturnsPct[year] = jstRates[year];
    }
    const carriedWarGapRate = jstRates[JST_LAST_OBSERVED_YEAR];
    for (let year = WAR_GAP_START_YEAR; year <= WAR_GAP_END_YEAR; year += 1) {
        annualReturnsPct[year] = carriedWarGapRate;
    }
    for (let year = 1949; year <= END_YEAR; year += 1) {
        annualReturnsPct[year] = bundesbankRates[year];
    }

    const years = Object.keys(annualReturnsPct).map(Number);
    if (years.length !== EXPECTED_YEAR_COUNT) {
        fail('Generated money-market chain has an unexpected year count', {
            expected: EXPECTED_YEAR_COUNT,
            actual: years.length
        });
    }
    for (let year = START_YEAR; year <= END_YEAR; year += 1) {
        if (!Number.isFinite(annualReturnsPct[year])) {
            fail('Generated money-market chain contains a missing/non-finite value', { year });
        }
    }
    return { annualReturnsPct, bundesbankPdfCoordinateRates };
}

function buildArtifact() {
    assertPinnedSourceHashes();
    const { annualReturnsPct, bundesbankPdfCoordinateRates } = buildAnnualReturns();
    const sourceFiles = Object.fromEntries(
        Object.entries(SOURCE_FILES).map(([sourceId, source]) => [
            sourceId,
            {
                sourceRole: source.sourceRole,
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
            Object.entries(SOURCE_FILES)
                .filter(([_sourceId, source]) => source.sourceRole === 'primary')
                .map(([sourceId, source]) => [sourceId, source.sha256])
        )
    );
    const derivedArtifactHash = sha256Canonical(
        Object.fromEntries(
            Object.entries(SOURCE_FILES)
                .filter(([_sourceId, source]) => source.sourceRole === 'derived')
                .map(([sourceId, source]) => [sourceId, source.sha256])
        )
    );
    const annualReturnHash = sha256Canonical(annualReturnsPct);
    const bundesbankPdfCoordinateAnnualReturnHash =
        sha256Canonical(bundesbankPdfCoordinateRates);

    return {
        schemaVersion: 'GermanCashMoneyMarketChainV1',
        seriesId: 'german_cash_money_market_proxy',
        label: 'German cash and overnight money-market gross annual return proxy',
        coverage: {
            startYear: START_YEAR,
            endYear: END_YEAR,
            yearCount: EXPECTED_YEAR_COUNT
        },
        unit: 'percent_per_year',
        currencyRegimes: [
            {
                startYear: 1925,
                endYear: 1947,
                value: 'historical German currency regimes; return percentages do not convert monetary balances'
            },
            {
                startYear: 1948,
                endYear: 1948,
                value: 'West German currency-reform discontinuity; the return proxy does not implement the separate 100:6.5 write-down of major Reichsmark cash and bank/savings balances'
            },
            {
                startYear: 1949,
                endYear: 1998,
                value: 'DEM money-market regime; return percentages do not perform currency conversion'
            },
            {
                startYear: 1999,
                endYear: 2025,
                value: 'EUR money-market regime'
            }
        ],
        returnConvention: {
            sourceMeasure: 'published annual-average nominal short/overnight rate in percent per annum',
            runtimeMeasure: 'simple gross annual return proxy applied once by the existing simulator cash-interest path',
            compounding: 'no additional compounding in the data transform',
            productCosts: 'excluded',
            bankMargin: 'excluded',
            taxes: 'excluded',
            investorAccessibility: 'interbank benchmark proxy; not a retail-attainable deposit or fund return'
        },
        applicability: {
            operativeCash: true,
            moneyMarketTranches: true,
            cashLikeHealthBucket: true,
            bondTranches: true,
            equityTranches: false,
            goldTranches: false,
            runtimeField: 'cashBondReturn',
            modelingStatus: 'shared_cash_bond_proxy',
            note: 'The existing simulator contract applies one shared cashBondReturn to operative cash, money-market holdings, the cash-like health bucket and bond tranches. It is a gross defensive-asset proxy; bond duration, term premium, credit risk, product-specific spreads and fees are not represented.'
        },
        proxyQualification: {
            historicalDiscontinuities: [
                {
                    effectiveFrom: '1970-03',
                    mixedAnnualAverageYear: 1970,
                    event: 'Frankfurt reporting series moved to a new, broader survey group',
                    sourceFootnote: 'Bundesbank long series page 15, footnote 1'
                },
                {
                    effectiveFrom: '1990-07',
                    mixedAnnualAverageYear: 1990,
                    event: 'Day-count method changed from German 360/360 to actual/360',
                    sourceFootnote: 'Bundesbank long series page 15, footnote 1'
                },
                {
                    effectiveFrom: '1997-01',
                    event: 'Reported Frankfurt overnight series changed to FIBOR overnight annual averages',
                    sourceFootnote: 'Bundesbank long series page 15, footnote 2'
                },
                {
                    effectiveFrom: '2019-10-01',
                    mixedAnnualAverageYear: 2019,
                    event: 'EONIA continuation changed to Euro Short-Term Rate (EURSTR)',
                    sourceFootnote: 'Bundesbank long series page 16, footnote 2'
                }
            ],
            monetaryAssetDiscontinuity: {
                year: 1948,
                event: 'West German currency reform and write-down of major Reichsmark cash and bank/savings balances',
                balanceConversion: {
                    reichsmark: 100,
                    deutscheMark: 6.5,
                    nominalBalanceLossPct: 93.5,
                    scope: 'major holdings of cash and bank/savings balances after the October 1948 Festkontengesetz'
                },
                reference: {
                    publisher: 'Deutsche Bundesbank',
                    title: 'Währungsreform 1948',
                    url: 'https://www.bundesbank.de/de/aufgaben/themen/waehrungsreform-1948-614040'
                },
                runtimeLimitation: 'The existing simulator does not apply this nominal balance write-down. A historical run spanning 1948 therefore must not be interpreted as continuous real-world Reichsmark cash or bank-balance history.',
                interpretation: 'The 2.13 percent carry-forward is only an estimated annual rate input. It neither represents nor offsets the separate monetary-balance conversion.'
            },
            bondMaturityMismatch: {
                runtimeApplication: 'bond tranches receive the shared cashBondReturn',
                limitation: 'The overnight-rate chain does not model bond duration, term premium, credit risk or mark-to-market effects.',
                interpretation: 'Bond results are model-proxy results, not historical bond-index returns.'
            }
        },
        qualitySegments: [
            {
                startYear: 1925,
                endYear: 1944,
                evidenceClass: 'proxy',
                sourceSeries: 'JST R6 DEU.stir',
                note: 'JST nominal German short-term interest-rate series; the underlying instrument is not homogeneous enough to claim a continuous investable overnight return.'
            },
            {
                startYear: 1945,
                endYear: 1948,
                evidenceClass: 'estimated',
                sourceSeries: 'last-observation carry-forward from JST 1944',
                note: 'Explicit wartime/post-war market-closure bridge at 2.13 percent. These years are not observed investable German money-market returns.'
            },
            {
                startYear: 1949,
                endYear: 1996,
                evidenceClass: 'proxy',
                sourceSeries: 'Bundesbank annual average of reported Frankfurt overnight money-market rates',
                publicationAuthority: 'Deutsche Bundesbank',
                quotationStatus: 'not_officially_set_or_quoted',
                populationQualifier: 'unweighted monthly averages from rates reported by Frankfurt banks',
                primarySourceChain: 'Deutsches Geld- und Bankwesen in Zahlen 1876-1975 (1976), Verlag Fritz Knapp GmbH, pp. 274 ff., and Bundesbank calculations through 1975; Bundesbank calculations thereafter',
                note: 'Officially published proxy observations, but the underlying rates were not officially set or quoted.'
            },
            {
                startYear: 1997,
                endYear: 1998,
                evidenceClass: 'official',
                sourceSeries: 'Bundesbank annual average of daily FIBOR overnight rates',
                note: 'Published transition from reported Frankfurt overnight rates to FIBOR O/N.'
            },
            {
                startYear: 1999,
                endYear: 2018,
                evidenceClass: 'official',
                sourceSeries: 'EONIA annual average',
                note: 'ECB transaction-based weighted EONIA overnight averages as published by Deutsche Bundesbank.'
            },
            {
                startYear: 2019,
                endYear: 2019,
                evidenceClass: 'official',
                sourceSeries: 'EONIA through 2019-09-30; EURSTR from 2019-10-01',
                note: 'Published annual average spans the documented overnight benchmark transition.'
            },
            {
                startYear: 2020,
                endYear: 2025,
                evidenceClass: 'official',
                sourceSeries: 'EURSTR annual average',
                note: 'Euro short-term rate annual average as published by Deutsche Bundesbank.'
            }
        ],
        sourceFiles,
        sourceExtraction: {
            layoutExtract: {
                sourceFileId: 'bundesbankTextExtract',
                tool: {
                    implementation: 'Poppler',
                    executable: 'pdftotext',
                    version: '25.07.0',
                    arguments: ['-layout', '-f', '15', '-l', '16']
                },
                selectedColumn: 'first Overnight funds column in each annual-average table'
            },
            coordinateOracle: {
                sourceFileId: 'bundesbankPdf',
                tool: {
                    implementation: 'Poppler',
                    executable: 'pdftohtml',
                    minimumCompatibleVersion: POPPLER_MINIMUM_VERSION,
                    compatibilityRule: 'version_greater_than_or_equal_to_minimum_and_exact_source_value_agreement',
                    arguments: ['-xml', '-f', '15', '-l', '16', '-hidden', '-i', '-noframes']
                },
                selection: 'first numeric text node with left coordinate 280-350 following each year node at left coordinate 100-199',
                annualReturnHash: bundesbankPdfCoordinateAnnualReturnHash,
                exactAgreementRequired: true
            }
        },
        benchmarkDisclaimers: [
            {
                benchmark: 'EURSTR',
                appliesFrom: '2019-10-01',
                administrator: 'European Central Bank',
                url: ECB_ESTR_DISCLAIMER_URL,
                sourceRequirement: 'The Bundesbank source states that the ECB administrator disclaimer also applies to Bundesbank publications.'
            }
        ],
        sourceValidation: {
            primaryPdfReadByCode: true,
            independentCoordinateOracleYears: END_YEAR - BUNDESBANK_FIRST_YEAR + 1,
            layoutAndCoordinateOracleAgreement: 'exact'
        },
        gapPolicy: {
            missingYears: [1945, 1946, 1947, 1948],
            method: 'last_observation_carried_forward',
            sourceYear: JST_LAST_OBSERVED_YEAR,
            valuePct: annualReturnsPct[JST_LAST_OBSERVED_YEAR],
            failClosedOutsideDeclaredGap: true
        },
        hashes: {
            rawDataHash,
            rawDataScope: 'primary_source_files_only',
            derivedArtifactHash,
            annualReturnHash
        },
        annualReturnsPct
    };
}

function renderModule(artifact) {
    return Buffer.from(`/**
 * Generated by scripts/build-german-cash-money-market-chain.mjs.
 * Do not edit by hand.
 */
"use strict";

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

export const GERMAN_CASH_MONEY_MARKET_CHAIN = deepFreeze(${JSON.stringify(artifact, null, 2)});

export const GERMAN_CASH_MONEY_MARKET_ANNUAL_RETURNS =
    GERMAN_CASH_MONEY_MARKET_CHAIN.annualReturnsPct;
`, 'utf8');
}

function main() {
    const artifact = buildArtifact();
    const generated = renderModule(artifact);

    if (VERIFY_ONLY) {
        if (!fs.existsSync(OUTPUT_PATH)) {
            fail('Generated money-market module is missing', { outputPath: OUTPUT_PATH });
        }
        const existing = fs.readFileSync(OUTPUT_PATH);
        if (!existing.equals(generated)) {
            fail('Generated money-market module is stale', {
                outputPath: OUTPUT_PATH,
                expectedSha256: sha256(generated),
                actualSha256: sha256(existing)
            });
        }
        process.stdout.write(
            `Verified German cash/money-market chain ${artifact.coverage.startYear}-${artifact.coverage.endYear}; `
            + `${artifact.coverage.yearCount} years; annualReturnHash ${artifact.hashes.annualReturnHash}\n`
        );
        return;
    }

    fs.writeFileSync(OUTPUT_PATH, generated);
    process.stdout.write(
        `Built German cash/money-market chain ${artifact.coverage.startYear}-${artifact.coverage.endYear}; `
        + `${artifact.coverage.yearCount} years; annualReturnHash ${artifact.hashes.annualReturnHash}\n`
    );
}

main();
