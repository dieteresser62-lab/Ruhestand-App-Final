"use strict";

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const SOURCE_PATH = path.join(
    PROJECT_ROOT,
    'data',
    'historical',
    'german-gross-wage-growth-chain',
    'originals',
    'destatis-bruttomonatsverdienst-index-2026-08-01.html'
);
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'app', 'simulator', 'german-gross-wage-growth-chain.js');
const JST_SOURCE_PATH = path.join(
    PROJECT_ROOT,
    'data',
    'historical',
    'global-equity-research-chain',
    'originals',
    'JSTdatasetR6.xlsx'
);
const VERIFY_ONLY = process.argv.includes('--verify-only');
const START_YEAR = 1925;
const END_YEAR = 2025;
const OFFICIAL_FIRST_CHANGE_YEAR = 1947;
const SOURCE_SHA256 = '1f62492a2efe78fba3ec2ac81dfd90a1c4ccd6f8b68b7bcc6c53ae4d8cd51f1a';
const JST_SOURCE_SHA256 = 'c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d';

function fail(message, details = undefined) {
    const error = new Error(message);
    error.code = 'GERMAN_GROSS_WAGE_SOURCE_INVALID';
    if (details !== undefined) error.details = details;
    throw error;
}

function sha256(value) {
    return crypto.createHash('sha256').update(value).digest('hex');
}

function canonicalKeyCompare(left, right) {
    const leftInteger = /^(0|[1-9]\d*)$/.test(left);
    const rightInteger = /^(0|[1-9]\d*)$/.test(right);
    if (leftInteger && rightInteger) return Number(left) - Number(right);
    if (leftInteger !== rightInteger) return leftInteger ? -1 : 1;
    return left.localeCompare(right);
}

function canonicalize(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return `[${value.map(canonicalize).join(',')}]`;
    return `{${Object.keys(value).sort(canonicalKeyCompare)
        .map(key => `${JSON.stringify(key)}:${canonicalize(value[key])}`).join(',')}}`;
}

function sha256Canonical(value) {
    return sha256(Buffer.from(canonicalize(value), 'utf8'));
}

function decodeHtmlText(value) {
    return value
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ')
        .replace(/&minus;/g, '-')
        .replace(/&amp;/g, '&')
        .trim();
}

function parseGermanNumber(value) {
    const normalized = decodeHtmlText(value).replace(/\s+/g, '').replace(',', '.');
    if (!normalized || normalized === '-') return null;
    const parsed = Number(normalized);
    return Number.isFinite(parsed) ? parsed : null;
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
    if (eocdOffset < 0) fail('JST XLSX ZIP end-of-central-directory record is missing');

    const entryCount = zipBuffer.readUInt16LE(eocdOffset + 10);
    let centralOffset = zipBuffer.readUInt32LE(eocdOffset + 16);
    const entries = new Map();
    for (let entryIndex = 0; entryIndex < entryCount; entryIndex += 1) {
        if (zipBuffer.readUInt32LE(centralOffset) !== 0x02014b50) {
            fail('JST XLSX central-directory entry is invalid', { entryIndex, centralOffset });
        }
        const compressionMethod = zipBuffer.readUInt16LE(centralOffset + 10);
        const compressedSize = zipBuffer.readUInt32LE(centralOffset + 20);
        const uncompressedSize = zipBuffer.readUInt32LE(centralOffset + 24);
        const fileNameLength = zipBuffer.readUInt16LE(centralOffset + 28);
        const extraLength = zipBuffer.readUInt16LE(centralOffset + 30);
        const commentLength = zipBuffer.readUInt16LE(centralOffset + 32);
        const localHeaderOffset = zipBuffer.readUInt32LE(centralOffset + 42);
        const fileName = zipBuffer.toString('utf8', centralOffset + 46, centralOffset + 46 + fileNameLength);
        if (zipBuffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
            fail('JST XLSX local-file header is invalid', { fileName, localHeaderOffset });
        }
        const localFileNameLength = zipBuffer.readUInt16LE(localHeaderOffset + 26);
        const localExtraLength = zipBuffer.readUInt16LE(localHeaderOffset + 28);
        const compressedStart = localHeaderOffset + 30 + localFileNameLength + localExtraLength;
        const compressed = zipBuffer.subarray(compressedStart, compressedStart + compressedSize);
        const content = compressionMethod === 0
            ? Buffer.from(compressed)
            : compressionMethod === 8
                ? zlib.inflateRawSync(compressed)
                : null;
        if (!content || content.length !== uncompressedSize) {
            fail('JST XLSX entry is unsupported or has an invalid size', {
                fileName,
                compressionMethod,
                expected: uncompressedSize,
                actual: content?.length ?? null
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
    if (!letters) fail('JST XLSX cell reference has no column', { reference });
    let index = 0;
    for (const letter of letters) index = index * 26 + letter.charCodeAt(0) - 64;
    return index - 1;
}

function readFirstXlsxSheetRows(xlsxBuffer) {
    const entries = unzipEntries(xlsxBuffer);
    const sharedStringsXml = entries.get('xl/sharedStrings.xml')?.toString('utf8');
    const sheetXml = entries.get('xl/worksheets/sheet1.xml')?.toString('utf8');
    if (!sharedStringsXml || !sheetXml) fail('JST XLSX shared strings or first worksheet is missing');
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

function readJstWageLevels(sourceBuffer) {
    const rows = readFirstXlsxSheetRows(sourceBuffer);
    const headers = rows[0] ?? [];
    const yearColumn = headers.indexOf('year');
    const isoColumn = headers.indexOf('iso');
    const wageColumn = headers.indexOf('wage');
    if ([yearColumn, isoColumn, wageColumn].some(column => column < 0)) {
        fail('JST workbook is missing a required wage column', { yearColumn, isoColumn, wageColumn });
    }
    const levels = new Map();
    for (const row of rows.slice(1)) {
        const year = Number(row[yearColumn]);
        if (row[isoColumn] !== 'DEU' || year < START_YEAR - 1 || year >= OFFICIAL_FIRST_CHANGE_YEAR) continue;
        const wageLevel = Number(row[wageColumn]);
        if (!Number.isInteger(year) || !Number.isFinite(wageLevel) || wageLevel <= 0) {
            fail('JST German nominal-wage observation is invalid', { year, wageLevel });
        }
        if (levels.has(year)) fail('JST German nominal-wage year is duplicated', { year });
        levels.set(year, wageLevel);
    }
    for (let year = START_YEAR - 1; year < OFFICIAL_FIRST_CHANGE_YEAR; year += 1) {
        if (!levels.has(year)) fail('JST German nominal-wage year is missing', { year });
    }
    return levels;
}

function percentageChange(current, previous) {
    const value = ((current / previous) - 1) * 100;
    return Object.is(value, -0) ? 0 : value;
}

function readDestatisObservations(html) {
    const tableTitle = 'Index der Bruttomonatsverdienste (ohne Sonderzahlungen)';
    if (!html.includes(tableTitle)
        || !html.includes('Bundesrepublik Deutschland nach dem Gebietsstand seit 03.10.1990.')
        || !html.includes('Ab 2007: Produzierendes Gewerbe und Dienst\u00adleistungs\u00adbereich.')
        || !html.includes('Seit 2022 Ergebnisse aus der Verdiensterhebung.')
        || !html.includes('Stand&nbsp;10. März 2026')) {
        fail('Destatis identity, territory, method-break or publication-date marker is missing');
    }
    const observations = new Map();
    const rowPattern = /<tr><td class="Vorspalte">(\d{4})<\/td><td>([\s\S]*?)<\/td><td>([\s\S]*?)<\/td><\/tr>/g;
    for (const match of html.matchAll(rowPattern)) {
        const year = Number(match[1]);
        const indexLevel = parseGermanNumber(match[2]);
        const annualChangePct = parseGermanNumber(match[3]);
        if (!Number.isInteger(year) || !Number.isFinite(indexLevel) || indexLevel <= 0) {
            fail('Destatis wage-index row is invalid', { year, indexLevel });
        }
        if (observations.has(year)) fail('Destatis wage-index year is duplicated', { year });
        observations.set(year, { indexLevel, annualChangePct });
    }
    for (let year = 1946; year <= END_YEAR; year += 1) {
        const observation = observations.get(year);
        if (!observation) fail('Destatis wage-index year is missing', { year });
        if (year >= OFFICIAL_FIRST_CHANGE_YEAR
            && (!Number.isFinite(observation.annualChangePct))) {
            fail('Destatis annual wage change is missing', { year });
        }
    }
    return observations;
}

function buildArtifact() {
    const sourceBuffer = fs.readFileSync(SOURCE_PATH);
    const actualHash = sha256(sourceBuffer);
    if (actualHash !== SOURCE_SHA256) {
        fail('Pinned Destatis HTML hash mismatch', { expected: SOURCE_SHA256, actual: actualHash });
    }
    const jstSourceBuffer = fs.readFileSync(JST_SOURCE_PATH);
    const actualJstHash = sha256(jstSourceBuffer);
    if (actualJstHash !== JST_SOURCE_SHA256) {
        fail('Pinned JST R6 workbook hash mismatch', { expected: JST_SOURCE_SHA256, actual: actualJstHash });
    }
    const observations = readDestatisObservations(sourceBuffer.toString('utf8'));
    const jstWageLevels = readJstWageLevels(jstSourceBuffer);
    const annualGrowthPct = {};
    const observationsByYear = {};
    for (let year = START_YEAR; year <= END_YEAR; year += 1) {
        if (year < OFFICIAL_FIRST_CHANGE_YEAR) {
            const priorWageLevel = jstWageLevels.get(year - 1);
            const wageLevel = jstWageLevels.get(year);
            const annualChangePct = percentageChange(wageLevel, priorWageLevel);
            annualGrowthPct[year] = annualChangePct;
            observationsByYear[year] = {
                valuePct: annualChangePct,
                sourceYear: year,
                evidenceClass: year === 1945 ? 'estimated' : 'proxy',
                ...(year === 1945 ? {
                    modelTreatment: {
                        selectedTreatment: 'retain_level_derived_jst_value',
                        rationale: 'Retaining the value keeps the pinned JST level-change construction internally consistent through its declared 1946 endpoint and avoids inserting an undocumented ad-hoc bridge. Because wartime market observation is not established, the value remains estimated and must be sensitivity-tested against a neutral zero-growth bridge.',
                        neutralBridgeAlternativePct: 0,
                        oneYearPensionEscalationDifferencePp: annualChangePct
                    }
                } : {}),
                sourceObservation: {
                    priorYear: year - 1,
                    priorNominalWageLevel: priorWageLevel,
                    currentYear: year,
                    currentNominalWageLevel: wageLevel,
                    derivedAnnualChangePct: annualChangePct,
                    sourceSeries: 'JST R6 DEU.wage'
                }
            };
            continue;
        }
        const sourceObservation = observations.get(year);
        annualGrowthPct[year] = sourceObservation.annualChangePct;
        observationsByYear[year] = {
            valuePct: sourceObservation.annualChangePct,
            sourceYear: year,
            evidenceClass: 'official',
            sourceObservation: {
                indexLevel: sourceObservation.indexLevel,
                indexLevelPrecision: 0.1,
                publishedAnnualChangePct: sourceObservation.annualChangePct,
                publishedAnnualChangePrecisionPct: 0.1
            }
        };
    }

    const method = {
        sourceColumn: 'Veraenderung zum Vorjahr in Prozent',
        officialFirstChangeYear: OFFICIAL_FIRST_CHANGE_YEAR,
        earlyProxySegment: {
            startYear: START_YEAR,
            endYear: OFFICIAL_FIRST_CHANGE_YEAR - 1,
            sourceSeries: 'JST R6 DEU.wage',
            calculation: '100 * (nominal_wage_level_t / nominal_wage_level_t_minus_1 - 1)',
            reason: 'The already-pinned JST R6 nominal-wage research series supplies research levels before the first published Destatis annual change; 1945 is treated as estimated rather than an observed market-wage year.'
        },
        discontinuities: [
            {
                year: 1925,
                type: 'start_boundary',
                treatment: 'The first in-scope rate depends on the out-of-period JST 1924 level and is not interpreted as a stable post-hyperinflation normalization.'
            },
            {
                year: 1945,
                type: 'wartime_market_observation_break',
                treatment: 'The JST level-derived rate is retained numerically but classified as estimated; it is not claimed as an observed German market-wage change.',
                retentionRationale: 'The selected treatment preserves the internally consistent JST level-change construction through 1946 and avoids an undocumented one-off bridge. It is a continuity choice, not evidence that a market wage was observable.',
                sensitivityReference: {
                    selectedJstLevelDerivedPct: annualGrowthPct[1945],
                    neutralBridgeAlternativePct: 0,
                    oneYearPensionEscalationDifferencePp: annualGrowthPct[1945],
                    requiredInterpretation: 'Model assumption requiring a separate zero-growth sensitivity, not an official wage observation.'
                }
            },
            {
                year: 1947,
                type: 'source_seam',
                treatment: 'The chain switches from consecutive JST DEU.wage level changes through 1946 to the published Destatis annual change for 1947; no cross-source level ratio is calculated.'
            },
            {
                year: 1948,
                type: 'currency_reform_context',
                treatment: 'The published Destatis earnings-index change is retained, but it does not model the separate 100:6.5 nominal write-down of monetary balances and is not a continuous monetary-numeraire bridge.'
            }
        ],
        sourceMethodBreaks: [
            {
                startYear: 2007,
                sourceMarker: 'Ab 2007: Produzierendes Gewerbe und Dienstleistungsbereich. (soft hyphens normalized)'
            },
            {
                startYear: 2022,
                sourceMarker: 'Seit 2022 Ergebnisse aus der Verdiensterhebung.'
            }
        ],
        runtimeApplication: 'the year-t percentage is applied once when rentAdjMode=wage',
        pensionQualification: 'gross monthly earnings proxy without special payments; not the statutory German pension adjustment'
    };

    return {
        schemaVersion: 'GermanGrossWageGrowthChainV2',
        seriesId: 'german_average_gross_monthly_earnings_growth_proxy',
        label: 'German average gross monthly earnings growth proxy without special payments',
        coverage: { startYear: START_YEAR, endYear: END_YEAR, yearCount: END_YEAR - START_YEAR + 1 },
        unit: 'percent_per_year',
        region: 'Segmented Germany proxy: JST DEU research series through 1946; former federal territory through 1990; Germany under the territorial definition since 3 October 1990 thereafter',
        variant: 'Index of average gross monthly earnings without special payments',
        yearConvention: 'Published year-over-year change for reporting year t is applied once in simulation year t',
        pensionQualification: {
            functionalUse: 'existing rentAdjMode=wage pension escalation input',
            excludedClaim: 'not an official historical statutory pension-adjustment series and not an individual pension notice',
            omittedComponents: ['special payments', 'statutory pension formula factors', 'East/West pension-value differences', 'protection clauses']
        },
        territorialSegments: [
            {
                startYear: START_YEAR,
                endYear: 1946,
                territory: 'JST DEU historical research-series territory; not asserted as a constant modern-Germany boundary'
            },
            {
                startYear: 1947,
                endYear: 1990,
                territory: 'former Federal Republic territory; inferred boundary required because the stated post-reunification territory cannot describe pre-1990 observations'
            },
            {
                startYear: 1991,
                endYear: END_YEAR,
                territory: 'Federal Republic of Germany under the territorial definition since 3 October 1990'
            }
        ],
        precisionSegments: [
            {
                startYear: 1947,
                endYear: 1955,
                publishedIndexLevelPrecision: 0.1,
                publishedAnnualChangePrecisionPct: 0.1,
                maximumHalfUnitRelativeIndexLevelEffectPct: 2.8,
                note: 'Current-year index levels in 1947-1955 are rounded to one decimal and lie between 1.9 and 4.5. The 1947 change also depends on the prior 1946 level 1.8; a half-unit rounding interval of 0.05 can therefore represent up to about 2.8 percent of the displayed level.'
            }
        ],
        discontinuities: method.discontinuities,
        qualitySegments: [
            {
                startYear: START_YEAR,
                endYear: START_YEAR,
                evidenceClass: 'proxy',
                note: 'First in-scope JST level-derived rate; it depends on the 1924 out-of-period level and carries a post-hyperinflation normalization boundary.'
            },
            {
                startYear: 1926,
                endYear: 1944,
                evidenceClass: 'proxy',
                note: 'Annual changes derived from consecutive JST R6 DEU nominal-wage levels. This is a macrohistory research proxy, not the statutory German pension adjustment.'
            },
            {
                startYear: 1945,
                endYear: 1945,
                evidenceClass: 'estimated',
                note: 'JST level-derived wartime/post-war break value retained for continuity; not claimed as an observed market-wage change.'
            },
            {
                startYear: 1946,
                endYear: 1946,
                evidenceClass: 'proxy',
                note: 'Final JST level-derived transition year immediately before the source seam to published Destatis annual changes.'
            },
            {
                startYear: OFFICIAL_FIRST_CHANGE_YEAR,
                endYear: 1955,
                evidenceClass: 'official',
                note: 'Published Destatis long-series annual changes for the former federal territory. Low one-decimal index levels make the 1947-1955 source precision limit material.'
            },
            {
                startYear: 1956,
                endYear: 1990,
                evidenceClass: 'official',
                note: 'Published Destatis long-series annual changes for the former federal territory before reunification.'
            },
            {
                startYear: 1991,
                endYear: 2006,
                evidenceClass: 'official',
                note: 'Published Destatis long-series annual changes for Germany under the territorial definition since 3 October 1990, before the documented 2007 coverage break.'
            },
            {
                startYear: 2007,
                endYear: 2021,
                evidenceClass: 'official',
                note: 'Published Destatis annual changes after the documented 2007 scope change to producing industry and services.'
            },
            {
                startYear: 2022,
                endYear: END_YEAR,
                evidenceClass: 'official',
                note: 'Published Destatis annual changes from the earnings survey introduced in 2022.'
            }
        ],
        sourceFiles: [
            {
                fileName: path.basename(JST_SOURCE_PATH),
                sha256: JST_SOURCE_SHA256,
                sourceUrl: 'https://www.macrohistory.net/app/download/9834512569/JSTdatasetR6.xlsx?t=1763503850',
                sourceSeries: 'JST Macrohistory Database R6, DEU.wage nominal wage level',
                retrievedAt: '2026-07-26',
                license: 'CC BY-NC-SA 4.0'
            },
            {
                fileName: path.basename(SOURCE_PATH),
                sha256: SOURCE_SHA256,
                sourceUrl: 'https://www.destatis.de/DE/Themen/Arbeit/Verdienste/Verdienste-Branche-Berufe/Tabellen/index-brutto-monatsverdienst-jahr-erbbau.html',
                sourceSeries: 'Destatis Index der durchschnittlichen Bruttomonatsverdienste ohne Sonderzahlungen, Deutschland, Jahre',
                retrievedAt: '2026-08-01',
                sourcePublishedAsOf: '2026-03-10',
                license: 'Data Licence Germany - attribution - version 2.0'
            }
        ],
        method,
        hashes: {
            rawDataHash: sha256Canonical({ destatis: SOURCE_SHA256, jstR6: JST_SOURCE_SHA256 }),
            methodHash: sha256Canonical(method),
            annualGrowthHash: sha256Canonical(annualGrowthPct),
            observationContractHash: sha256Canonical(observationsByYear)
        },
        observationsByYear,
        annualGrowthPct
    };
}

function renderModule(artifact) {
    return Buffer.from(`/**
 * Generated by scripts/build-german-gross-wage-growth-chain.mjs.
 * Do not edit by hand.
 */
"use strict";

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

export const GERMAN_GROSS_WAGE_GROWTH_CHAIN = deepFreeze(${JSON.stringify(artifact, null, 2)});

export const GERMAN_GROSS_WAGE_GROWTH_PCT =
    GERMAN_GROSS_WAGE_GROWTH_CHAIN.annualGrowthPct;
`, 'utf8');
}

function main() {
    const artifact = buildArtifact();
    const generated = renderModule(artifact);
    if (VERIFY_ONLY) {
        if (!fs.existsSync(OUTPUT_PATH)) fail('Generated German gross-wage module is missing', { outputPath: OUTPUT_PATH });
        const existing = fs.readFileSync(OUTPUT_PATH);
        if (!existing.equals(generated)) {
            fail('Generated German gross-wage module is stale', {
                outputPath: OUTPUT_PATH,
                expectedSha256: sha256(generated),
                actualSha256: sha256(existing)
            });
        }
        process.stdout.write(`Verified German gross-wage growth chain ${START_YEAR}-${END_YEAR}; hash ${artifact.hashes.annualGrowthHash}\n`);
        return;
    }
    fs.writeFileSync(OUTPUT_PATH, generated);
    process.stdout.write(`Built German gross-wage growth chain ${START_YEAR}-${END_YEAR}; hash ${artifact.hashes.annualGrowthHash}\n`);
}

main();
