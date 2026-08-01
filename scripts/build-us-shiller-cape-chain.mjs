"use strict";

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { readBiff8Sheet } from './lib/biff8-numeric-sheet.mjs';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const SOURCE_PATH = path.join(
    PROJECT_ROOT,
    'data',
    'historical',
    'us-shiller-cape-chain',
    'originals',
    'shiller-ie-data-2026-08-01.xls'
);
const OUTPUT_PATH = path.join(PROJECT_ROOT, 'app', 'simulator', 'us-shiller-cape-chain.js');
const VERIFY_ONLY = process.argv.includes('--verify-only');
const START_YEAR = 1925;
const END_YEAR = 2025;
const SOURCE_SHA256 = '0e3d716f83f51c14f40c5ab5662e767cde4f83fcb7305db24ab003df2c9ee6c5';
const HEADER_ROW_ZERO_BASED = 7;
const DATE_COLUMN_ZERO_BASED = 0;
const CAPE_COLUMN_ZERO_BASED = 12;
const TOTAL_RETURN_CAPE_COLUMN_ZERO_BASED = 14;

function fail(message, details = undefined) {
    const error = new Error(message);
    error.code = 'US_SHILLER_CAPE_SOURCE_INVALID';
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

function splitShillerDate(rawDate) {
    if (!Number.isFinite(rawDate)) return null;
    const year = Math.floor(rawDate + 1e-8);
    const month = Math.round((rawDate - year) * 100);
    if (!Number.isInteger(year) || month < 1 || month > 12) return null;
    return { year, month };
}

function readDecemberCapeObservations(sourceBuffer) {
    const { cells, textCells } = readBiff8Sheet(sourceBuffer, 'Data');
    const headerRow = textCells.get(HEADER_ROW_ZERO_BASED);
    const actualHeaders = {
        date: headerRow?.get(DATE_COLUMN_ZERO_BASED),
        conventionalCape: headerRow?.get(CAPE_COLUMN_ZERO_BASED),
        totalReturnCape: headerRow?.get(TOTAL_RETURN_CAPE_COLUMN_ZERO_BASED)
    };
    const expectedHeaders = {
        date: 'Date',
        conventionalCape: 'CAPE',
        totalReturnCape: 'TR CAPE'
    };
    if (canonicalize(actualHeaders) !== canonicalize(expectedHeaders)) {
        fail('Shiller source column identity does not match the conventional-CAPE contract', {
            headerRowZeroBased: HEADER_ROW_ZERO_BASED,
            expectedHeaders,
            actualHeaders
        });
    }
    const decemberByYear = new Map();
    let maximumSourcePeriod = null;

    for (const row of cells.values()) {
        const rawDate = row.get(DATE_COLUMN_ZERO_BASED);
        const cape = row.get(CAPE_COLUMN_ZERO_BASED);
        const period = splitShillerDate(rawDate);
        if (!period) continue;
        if (!maximumSourcePeriod
            || period.year > maximumSourcePeriod.year
            || (period.year === maximumSourcePeriod.year && period.month > maximumSourcePeriod.month)) {
            maximumSourcePeriod = period;
        }
        if (period.month !== 12 || period.year < START_YEAR - 1 || period.year > END_YEAR - 1) continue;
        if (!Number.isFinite(cape) || cape <= 0) {
            fail('December CAPE observation must be finite and positive', { period, cape });
        }
        if (decemberByYear.has(period.year)) {
            fail('December CAPE observation is duplicated', { period });
        }
        decemberByYear.set(period.year, cape);
    }

    for (let observationYear = START_YEAR - 1; observationYear <= END_YEAR - 1; observationYear += 1) {
        if (!decemberByYear.has(observationYear)) {
            fail('Required December CAPE observation is missing', { observationYear });
        }
    }
    return { decemberByYear, maximumSourcePeriod };
}

function buildArtifact() {
    const sourceBuffer = fs.readFileSync(SOURCE_PATH);
    const actualHash = sha256(sourceBuffer);
    if (actualHash !== SOURCE_SHA256) {
        fail('Pinned Shiller workbook hash mismatch', { expected: SOURCE_SHA256, actual: actualHash });
    }
    const { decemberByYear, maximumSourcePeriod } = readDecemberCapeObservations(sourceBuffer);
    const annualDecisionSignals = {};
    const observationsByReturnYear = {};
    for (let returnYear = START_YEAR; returnYear <= END_YEAR; returnYear += 1) {
        const observationYear = returnYear - 1;
        const value = decemberByYear.get(observationYear);
        annualDecisionSignals[returnYear] = value;
        observationsByReturnYear[returnYear] = {
            value,
            observationYear,
            observationMonth: 12,
            asOfYear: observationYear,
            decisionYear: returnYear
        };
    }

    const method = {
        sourceSheet: 'Data',
        sourceHeaderRowZeroBased: HEADER_ROW_ZERO_BASED,
        sourceDateColumnZeroBased: DATE_COLUMN_ZERO_BASED,
        sourceDateHeader: 'Date',
        sourceCapeColumnZeroBased: CAPE_COLUMN_ZERO_BASED,
        sourceCapeHeader: 'CAPE',
        rejectedTotalReturnCapeColumnZeroBased: TOTAL_RETURN_CAPE_COLUMN_ZERO_BASED,
        rejectedTotalReturnCapeHeader: 'TR CAPE',
        sourceVariant: 'conventional_price_cape',
        sourceRegion: 'US stock market',
        selection: 'December observation from calendar year t-1 is the decision signal for return year t',
        noLookAhead: true,
        noSecondLag: true
    };
    return {
        schemaVersion: 'UsShillerCapeDecisionChainV1',
        seriesId: 'us_shiller_conventional_cape_decision_signal',
        label: 'US Shiller conventional CAPE decision signal',
        coverage: {
            startReturnYear: START_YEAR,
            endReturnYear: END_YEAR,
            yearCount: END_YEAR - START_YEAR + 1,
            sourceObservationStart: `${START_YEAR - 1}-12`,
            sourceObservationEnd: `${END_YEAR - 1}-12`
        },
        unit: 'ratio',
        region: 'US stock market',
        variant: 'Robert J. Shiller conventional price CAPE; not total-return CAPE',
        temporalConvention: {
            observation: 'monthly average source observation for December of t-1',
            decision: 'available before simulated return year t',
            mapping: 'return_year_t_uses_december_t_minus_1',
            exportFields: ['observationYear', 'observationMonth', 'asOfYear', 'decisionYear']
        },
        qualitySegments: [
            {
                startYear: START_YEAR,
                endYear: 1935,
                evidenceClass: 'estimated',
                note: 'Publisher-compiled US conventional CAPE whose trailing ten-year earnings basis still includes interpolated annual Cowles observations before 1926; affected decision years are delimited through 1935.'
            },
            {
                startYear: 1936,
                endYear: END_YEAR,
                evidenceClass: 'backtested',
                note: 'Publisher-compiled US historical conventional CAPE after the ten-year window no longer includes the documented pre-1926 interpolated Cowles observations; this is not a global or German valuation ratio.'
            }
        ],
        sourceFile: {
            fileName: path.basename(SOURCE_PATH),
            sha256: SOURCE_SHA256,
            sourceUrl: 'https://shillerdata.com/ (ie_data.xls download)',
            sourceSeries: 'Robert J. Shiller, U.S. Stock Markets 1871-Present and CAPE Ratio, conventional CAPE column',
            retrievedAt: '2026-08-01',
            sourceMaximumPeriod: maximumSourcePeriod ? `${maximumSourcePeriod.year}-${String(maximumSourcePeriod.month).padStart(2, '0')}` : null,
            usageBoundary: 'Publisher download is public; no explicit open redistribution licence was located. Publisher/Yale disclaimer applies.'
        },
        method,
        hashes: {
            rawDataHash: SOURCE_SHA256,
            methodHash: sha256Canonical(method),
            annualDecisionSignalHash: sha256Canonical(annualDecisionSignals),
            observationContractHash: sha256Canonical(observationsByReturnYear)
        },
        observationsByReturnYear,
        annualDecisionSignals
    };
}

function renderModule(artifact) {
    return Buffer.from(`/**
 * Generated by scripts/build-us-shiller-cape-chain.mjs.
 * Do not edit by hand.
 */
"use strict";

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

export const US_SHILLER_CAPE_CHAIN = deepFreeze(${JSON.stringify(artifact, null, 2)});

export const US_SHILLER_CAPE_BY_RETURN_YEAR =
    US_SHILLER_CAPE_CHAIN.annualDecisionSignals;
`, 'utf8');
}

function main() {
    const artifact = buildArtifact();
    const generated = renderModule(artifact);
    if (VERIFY_ONLY) {
        if (!fs.existsSync(OUTPUT_PATH)) fail('Generated US Shiller CAPE module is missing', { outputPath: OUTPUT_PATH });
        const existing = fs.readFileSync(OUTPUT_PATH);
        if (!existing.equals(generated)) {
            fail('Generated US Shiller CAPE module is stale', {
                outputPath: OUTPUT_PATH,
                expectedSha256: sha256(generated),
                actualSha256: sha256(existing)
            });
        }
        process.stdout.write(`Verified US Shiller CAPE decision chain ${START_YEAR}-${END_YEAR}; hash ${artifact.hashes.annualDecisionSignalHash}\n`);
        return;
    }
    fs.writeFileSync(OUTPUT_PATH, generated);
    process.stdout.write(`Built US Shiller CAPE decision chain ${START_YEAR}-${END_YEAR}; hash ${artifact.hashes.annualDecisionSignalHash}\n`);
}

main();
