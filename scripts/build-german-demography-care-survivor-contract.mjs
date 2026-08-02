"use strict";

import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { fileURLToPath } from 'node:url';

const SCRIPT_DIRECTORY = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(SCRIPT_DIRECTORY, '..');
const SOURCE_DIRECTORY = path.join(
    PROJECT_ROOT,
    'data',
    'static',
    'german-demography-care-survivor-contract',
    'originals'
);
const MORTALITY_SOURCE_PATH = path.join(
    SOURCE_DIRECTORY,
    'destatis-period-life-table-2023-2025.xlsx'
);
const CARE_SOURCE_PATH = path.join(
    SOURCE_DIRECTORY,
    'destatis-care-statistics-2023.xlsx'
);
const OUTPUT_PATH = path.join(
    PROJECT_ROOT,
    'app',
    'simulator',
    'german-demography-care-survivor-contract.js'
);
const VERIFY_ONLY = process.argv.includes('--verify-only');
const MORTALITY_SOURCE_SHA256 = 'fbc46083d581e5978c679600875164bcc5af0565a9eb33c57bf33d44ca87aadc';
const CARE_SOURCE_SHA256 = 'a8088d8e95964c5ffade848b9f303d000dc499519512f66f92ee6b8d60aa4280';
const OFFICIAL_MIN_RUNTIME_AGE = 18;
const OFFICIAL_MAX_AGE = 100;
const MODEL_MAX_AGE = 110;

const LEGACY_MORTALITY_TAIL = Object.freeze({
    m: Object.freeze({ 101: 0.46, 102: 0.49, 103: 0.52, 104: 0.55, 105: 0.6, 106: 0.65, 107: 0.7, 108: 0.8, 109: 0.9, 110: 1 }),
    w: Object.freeze({ 101: 0.42, 102: 0.45, 103: 0.48, 104: 0.51, 105: 0.55, 106: 0.6, 107: 0.65, 108: 0.75, 109: 0.85, 110: 1 })
});

const CARE_ENTRY_MODEL = Object.freeze({
    65: Object.freeze({ 1: 0.012, 2: 0.006 }),
    70: Object.freeze({ 1: 0.020, 2: 0.010 }),
    75: Object.freeze({ 1: 0.035, 2: 0.018 }),
    80: Object.freeze({ 1: 0.055, 2: 0.032 }),
    85: Object.freeze({ 1: 0.085, 2: 0.055 }),
    90: Object.freeze({ 1: 0.120, 2: 0.080 }),
    95: Object.freeze({ 1: 0.140, 2: 0.090 })
});

const CARE_PROGRESSION_MODEL = Object.freeze({
    1: 0.15,
    2: 0.12,
    3: 0.10,
    4: 0.08,
    5: 0
});

const CARE_GRADE_LABELS = Object.freeze({
    1: 'Pflegegrad 1 – geringe Beeinträchtigung',
    2: 'Pflegegrad 2 – erhebliche Beeinträchtigung',
    3: 'Pflegegrad 3 – schwere Beeinträchtigung',
    4: 'Pflegegrad 4 – schwerste Beeinträchtigung',
    5: 'Pflegegrad 5 – besondere Anforderungen'
});

const CARE_AGE_BANDS = Object.freeze([
    Object.freeze({ modelAge: 65, label: '65 bis unter 70 Jahre' }),
    Object.freeze({ modelAge: 70, label: '70 bis unter 75 Jahre' }),
    Object.freeze({ modelAge: 75, label: '75 bis unter 80 Jahre' }),
    Object.freeze({ modelAge: 80, label: '80 bis unter 85 Jahre' }),
    Object.freeze({ modelAge: 85, label: '85 bis unter 90 Jahre' }),
    Object.freeze({ modelAge: 90, label: '90 bis unter 95 Jahre' }),
    Object.freeze({ modelAge: 95, label: '95 Jahre und mehr' })
]);

function fail(message, details = undefined) {
    const error = new Error(message);
    error.code = 'GERMAN_DEMOGRAPHY_CARE_SOURCE_INVALID';
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

function decodeXmlText(value) {
    return String(value ?? '')
        .replaceAll('&lt;', '<')
        .replaceAll('&gt;', '>')
        .replaceAll('&quot;', '"')
        .replaceAll('&apos;', "'")
        .replaceAll('&amp;', '&')
        .replace(/&#(\d+);/g, (_match, codePoint) => String.fromCodePoint(Number(codePoint)))
        .replace(/&#x([0-9a-f]+);/gi, (_match, codePoint) => String.fromCodePoint(Number.parseInt(codePoint, 16)));
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
            fail('XLSX central-directory entry is invalid', { entryIndex, centralOffset });
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
            fail('XLSX local-file header is invalid', { fileName, localHeaderOffset });
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
            fail('XLSX entry is unsupported or has an invalid size', {
                fileName,
                compressionMethod,
                expected: uncompressedSize,
                actual: content?.length ?? null
            });
        }
        entries.set(fileName.replaceAll('\\', '/'), content);
        centralOffset += 46 + fileNameLength + extraLength + commentLength;
    }
    return entries;
}

function columnIndexFromCellReference(reference) {
    const letters = reference.match(/^[A-Z]+/)?.[0];
    if (!letters) fail('XLSX cell reference has no column', { reference });
    let index = 0;
    for (const letter of letters) index = (index * 26) + letter.charCodeAt(0) - 64;
    return index - 1;
}

function workbookSheetPaths(entries) {
    const workbookXml = entries.get('xl/workbook.xml')?.toString('utf8');
    const relationshipsXml = entries.get('xl/_rels/workbook.xml.rels')?.toString('utf8');
    if (!workbookXml || !relationshipsXml) fail('XLSX workbook metadata is missing');
    const relationshipTargets = new Map(
        [...relationshipsXml.matchAll(/<Relationship\b([^>]*)\/?\s*>/g)].map(match => {
            const attributes = match[1];
            const id = attributes.match(/\bId="([^"]+)"/)?.[1];
            const target = attributes.match(/\bTarget="([^"]+)"/)?.[1];
            return [id, target];
        })
    );
    const paths = new Map();
    for (const match of workbookXml.matchAll(/<sheet\b([^>]*)\/?\s*>/g)) {
        const attributes = match[1];
        const name = decodeXmlText(attributes.match(/\bname="([^"]+)"/)?.[1]);
        const relationshipId = attributes.match(/\br:id="([^"]+)"/)?.[1];
        const target = relationshipTargets.get(relationshipId);
        if (!name || !target) fail('XLSX worksheet relationship is incomplete', { name, relationshipId });
        const normalizedTarget = target.startsWith('/')
            ? target.slice(1)
            : path.posix.normalize(path.posix.join('xl', target));
        paths.set(name, normalizedTarget);
    }
    return paths;
}

function readXlsxSheetRows(xlsxBuffer, sheetName) {
    const entries = unzipEntries(xlsxBuffer);
    const sheetPath = workbookSheetPaths(entries).get(sheetName);
    const worksheetXml = entries.get(sheetPath)?.toString('utf8');
    if (!sheetPath || !worksheetXml) fail('XLSX worksheet is missing', { sheetName, sheetPath });
    const sharedStringsXml = entries.get('xl/sharedStrings.xml')?.toString('utf8') ?? '';
    const sharedStrings = [...sharedStringsXml.matchAll(/<si>([\s\S]*?)<\/si>/g)].map(match => (
        [...match[1].matchAll(/<t(?: [^>]*)?>([\s\S]*?)<\/t>/g)]
            .map(textMatch => decodeXmlText(textMatch[1]))
            .join('')
    ));
    return [...worksheetXml.matchAll(/<row(?: [^>]*)?>([\s\S]*?)<\/row>/g)].map(rowMatch => {
        const row = [];
        const nonEmptyCellXml = rowMatch[1].replace(/<c\b[^>]*\/>/g, '');
        for (const cellMatch of nonEmptyCellXml.matchAll(/<c(?: ([^>]*))?>([\s\S]*?)<\/c>/g)) {
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
                value = type === 's' ? sharedStrings[Number(rawValue)] : decodeXmlText(rawValue);
            }
            row[columnIndexFromCellReference(reference)] = value;
        }
        return row;
    });
}

function rowsToRecords(rows, sheetName) {
    const headers = rows[0];
    if (!headers || new Set(headers).size !== headers.length) {
        fail('XLSX worksheet headers must exist and be unique', { sheetName, headers });
    }
    return rows.slice(1).map(row => Object.fromEntries(headers.map((header, index) => [
        header,
        row[index] ?? ''
    ])));
}

function finiteNumber(value, label) {
    const number = Number(value);
    if (!Number.isFinite(number)) fail(`${label} must be finite`, { value });
    return number;
}

function readMortalityTable(sourceBuffer) {
    const sexSheets = { m: 'csv-12613-b01', w: 'csv-12613-b02' };
    const table = { m: {}, w: {}, d: {} };
    const officialLifeExpectancyAt65 = {};
    for (const [sex, sheetName] of Object.entries(sexSheets)) {
        const records = rowsToRecords(readXlsxSheetRows(sourceBuffer, sheetName), sheetName);
        const selected = records.filter(record => (
            record.Statistik === 'Sterbetafel'
            && record.Gebiet === 'Deutschland'
            && record.Jahre === '2023/2025'
        ));
        if (selected.length !== 101) fail('Destatis mortality sheet must contain ages 0-100', {
            sex,
            count: selected.length
        });
        for (const record of selected) {
            const age = finiteNumber(record['Alter '], `mortality age ${sex}`);
            const qx = finiteNumber(record.qx, `mortality qx ${sex} ${age}`);
            if (!Number.isInteger(age) || age < 0 || age > OFFICIAL_MAX_AGE || qx < 0 || qx > 1) {
                fail('Destatis mortality observation is out of range', { sex, age, qx });
            }
            if (age >= OFFICIAL_MIN_RUNTIME_AGE) table[sex][age] = qx;
            if (age === 65) officialLifeExpectancyAt65[sex] = finiteNumber(record.ex, `mortality ex ${sex} 65`);
        }
        Object.assign(table[sex], LEGACY_MORTALITY_TAIL[sex]);
    }
    for (let age = OFFICIAL_MIN_RUNTIME_AGE; age <= MODEL_MAX_AGE; age += 1) {
        table.d[age] = (table.m[age] + table.w[age]) / 2;
    }
    if (table.m[65] !== 0.014951194938233688 || table.w[65] !== 0.008076907733749495) {
        fail('Destatis mortality age-65 marker changed unexpectedly', {
            male: table.m[65],
            female: table.w[65]
        });
    }
    return { table, officialLifeExpectancyAt65 };
}

function careRowsBySection(rows) {
    const sections = { overall: new Map(), m: new Map(), w: new Map() };
    let section = 'overall';
    for (const row of rows) {
        if (row[1] === 'Männlich') {
            section = 'm';
            continue;
        }
        if (row[1] === 'Weiblich') {
            section = 'w';
            continue;
        }
        const label = row[0];
        if (typeof label === 'string' && CARE_AGE_BANDS.some(entry => entry.label === label)) {
            sections[section].set(label, row);
        }
    }
    return sections;
}

function readCareObservation(sourceBuffer) {
    const prevalenceRows = readXlsxSheetRows(sourceBuffer, '22421-02');
    if (!String(prevalenceRows[1]?.[0]).includes('Pflegequote zum Jahresende 2023')) {
        fail('Destatis care prevalence table identity is missing');
    }
    const sections = careRowsBySection(prevalenceRows);
    const observedPrevalencePctBySexAndAgeBand = { overall: {}, m: {}, w: {} };
    for (const [sex, rows] of Object.entries(sections)) {
        for (const { modelAge, label } of CARE_AGE_BANDS) {
            const row = rows.get(label);
            if (!row) fail('Destatis care prevalence marker is missing', {
                sex,
                label,
                available: [...rows.keys()],
                sectionMarkers: prevalenceRows
                    .filter(candidate => candidate[1])
                    .map(candidate => candidate.slice(0, 2))
            });
            observedPrevalencePctBySexAndAgeBand[sex][modelAge] = finiteNumber(
                row[8],
                `care prevalence ${sex} ${label}`
            );
        }
    }
    if (
        observedPrevalencePctBySexAndAgeBand.overall[65] !== 6.56
        || observedPrevalencePctBySexAndAgeBand.m[95] !== 84.74
        || observedPrevalencePctBySexAndAgeBand.w[95] !== 97.81
    ) {
        fail('Destatis care prevalence markers changed unexpectedly', observedPrevalencePctBySexAndAgeBand);
    }

    const stockRows = readXlsxSheetRows(sourceBuffer, '22421-01');
    if (!String(stockRows[1]?.[0]).includes('Pflegegraden und Geschlecht')) {
        fail('Destatis care-grade stock table identity is missing');
    }
    const totalRow = stockRows.find(row => row[0] === 'Insgesamt' && row[1] === 'Anzahl');
    const totalCareRecipients = finiteNumber(totalRow?.[2], 'total care recipients');
    const countsByGrade = {};
    const sharesPctByGrade = {};
    for (let grade = 1; grade <= 5; grade += 1) {
        const row = stockRows.find(candidate => candidate[0] === `Pflegegrad ${grade}`);
        const count = finiteNumber(row?.[2], `care grade ${grade} count`);
        countsByGrade[grade] = count;
        sharesPctByGrade[grade] = (count / totalCareRecipients) * 100;
    }
    const unassignedRow = stockRows.find(row => row[0] === 'bisher ohne Zuordnung');
    const unassignedCount = finiteNumber(unassignedRow?.[2], 'unassigned care count');
    if (totalCareRecipients !== 5688473 || countsByGrade[1] !== 785822 || countsByGrade[5] !== 244252) {
        fail('Destatis care-grade stock markers changed unexpectedly', {
            totalCareRecipients,
            countsByGrade
        });
    }
    return {
        totalCareRecipients,
        countsByGrade,
        sharesPctByGrade,
        unassignedCount,
        observedPrevalencePctBySexAndAgeBand
    };
}

function buildArtifact() {
    const mortalitySource = fs.readFileSync(MORTALITY_SOURCE_PATH);
    const careSource = fs.readFileSync(CARE_SOURCE_PATH);
    if (sha256(mortalitySource) !== MORTALITY_SOURCE_SHA256) fail('Mortality source hash mismatch');
    if (sha256(careSource) !== CARE_SOURCE_SHA256) fail('Care source hash mismatch');

    const mortality = readMortalityTable(mortalitySource);
    const careObservation = readCareObservation(careSource);
    const officialCareObservation = {
        evidenceClass: 'official_observed_stock_and_prevalence',
        referenceDate: '2023-12-31',
        territory: 'Germany',
        unit: 'percent_of_population_at_reporting_date',
        runtimeRole: 'context_only_not_runtime_validation_or_transition_probability',
        prohibitedTransformation: 'Do not divide prevalence by an assumed duration or otherwise treat it as annual incidence.',
        ...careObservation
    };
    const rawDataHash = sha256Canonical({
        mortality: MORTALITY_SOURCE_SHA256,
        care: CARE_SOURCE_SHA256
    });
    const mortalityTableHash = sha256Canonical(mortality.table);
    const careEntryModelHash = sha256Canonical(CARE_ENTRY_MODEL);
    const careProgressionModelHash = sha256Canonical(CARE_PROGRESSION_MODEL);
    const careTaxonomyHash = sha256Canonical({ grades: [1, 2, 3, 4, 5], labels: CARE_GRADE_LABELS });
    const survivorRuntimeContract = {
        defaultMode: 'percent',
        defaultPercent: 55,
        percentMinimum: 0,
        percentMaximum: 100,
        percentStep: 5,
        defaultMarriageOffsetYears: 0,
        defaultMinimumMarriageYears: 1
    };

    return {
        schemaVersion: 'GermanDemographyCareSurvivorContractV1',
        revision: '2026-08-01.1',
        sourceFiles: {
            mortality: {
                fileName: path.basename(MORTALITY_SOURCE_PATH),
                sha256: MORTALITY_SOURCE_SHA256,
                sourceUrl: 'https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Bevoelkerung/Sterbefaelle-Lebenserwartung/Publikationen/Downloads-Sterbefaelle/statistischer-bericht-sterbetafeln-5126207257005.xlsx?__blob=publicationFile&v=2',
                sourceSeries: 'Destatis Statistischer Bericht Sterbetafeln 2023/2025 (EVAS 12621), Tabellen 12613-b01 und 12613-b02',
                retrievedAt: '2026-08-01',
                license: 'Data Licence Germany - attribution - version 2.0'
            },
            care: {
                fileName: path.basename(CARE_SOURCE_PATH),
                sha256: CARE_SOURCE_SHA256,
                sourceUrl: 'https://www.destatis.de/DE/Themen/Gesellschaft-Umwelt/Gesundheit/Pflege/Publikationen/Downloads-Pflege/statistischer-bericht-pflege-deutschlandergebnisse-5224001239005.xlsx?__blob=publicationFile&v=2',
                sourceSeries: 'Destatis Pflegestatistik 2023 Deutschlandergebnisse, Tabellen 22421-01 und 22421-02',
                retrievedAt: '2026-08-01',
                license: 'Data Licence Germany - attribution - version 2.0'
            }
        },
        hashes: {
            rawDataHash,
            mortalityTableHash,
            careObservationHash: sha256Canonical(officialCareObservation),
            careEntryModelHash,
            careProgressionModelHash,
            careTaxonomyHash,
            survivorRuntimeContractHash: sha256Canonical(survivorRuntimeContract)
        },
        mortality: {
            evidenceClass: 'official_with_model_tail',
            tableType: 'period',
            cohortProjection: false,
            futureMortalityImprovement: false,
            period: '2023/2025',
            territory: 'Germany',
            officialSexes: ['m', 'w'],
            runtimeSexMapping: {
                m: 'official_male',
                w: 'official_female',
                d: 'model_assumption_unweighted_mean_of_male_and_female_qx'
            },
            officialAgeRange: { startAge: 0, endAge: OFFICIAL_MAX_AGE },
            runtimeAgeRange: { startAge: OFFICIAL_MIN_RUNTIME_AGE, endAge: MODEL_MAX_AGE },
            officialLifeExpectancyAt65Years: mortality.officialLifeExpectancyAt65,
            tailAssumption: {
                startAge: 101,
                endAge: MODEL_MAX_AGE,
                evidenceClass: 'model_assumption',
                construction: 'Retained legacy simulator tail because the official source ends at age 100; age 110 remains the deterministic terminal boundary.',
                futureMortalityImprovement: false
            },
            application: 'Annual qx for attained simulated age; no cohort shifting or calendar-year improvement.',
            table: mortality.table
        },
        care: {
            taxonomy: {
                evidenceClass: 'official_taxonomy',
                grades: [1, 2, 3, 4, 5],
                labels: CARE_GRADE_LABELS
            },
            officialObservation: officialCareObservation,
            entryModel: {
                evidenceClass: 'model_assumption',
                yearConvention: 'annual_entry_probability_at_attained_age_bucket',
                eligibleInitialGrades: [1, 2],
                minimumEntryAge: 65,
                construction: 'Legacy effective runtime entry hazards retained without the former unsupported prevalence-to-incidence claim. Grade keys 3-5 were removed because the sampler never used them for initial entry.',
                probabilitiesByAgeAndInitialGrade: CARE_ENTRY_MODEL
            },
            progressionModel: {
                evidenceClass: 'model_assumption',
                yearConvention: 'annual_transition_to_next_care_grade',
                probabilitiesByCurrentGrade: CARE_PROGRESSION_MODEL
            },
            durationModel: {
                evidenceClass: 'user_input_and_model_assumption',
                chronic: 'continues until simulated death',
                acute: 'uniform integer draw between user minimum and maximum duration; UI defaults 5 and 10 years',
                officialObservationUsedAsDuration: false
            }
        },
        survivor: {
            evidenceClass: 'user_input_with_official_reference',
            runtimeContract: survivorRuntimeContract,
            officialReference: {
                publisher: 'Deutsche Rentenversicherung',
                title: 'Renten an Hinterbliebene',
                url: 'https://www.deutsche-rentenversicherung.de/DRV/DE/Rente/Allgemeine-Informationen/Rentenarten-und-Leistungen/Renten-an-Hinterbliebene/renten-an-hinterbliebene_node.html',
                retrievedAt: '2026-08-01',
                referenceOnly: true,
                largeWidowWidowerPensionPercent: 55
            },
            modelBoundary: {
                implemented: [
                    'stop or percentage of deceased partner simulated pension',
                    'user-defined marriage offset',
                    'user-defined minimum marriage duration',
                    'benefit does not start before the deceased pension start offset'
                ],
                notImplemented: [
                    'statutory eligibility assessment',
                    'small versus large widow or widower pension selection',
                    'income offset',
                    'child, disability, age and legacy-law exceptions',
                    'death-quarter rules and remarriage settlement'
                ],
                interpretation: 'Scenario cash-flow assumption only; not a statutory entitlement calculation.'
            }
        }
    };
}

function renderModule(artifact) {
    return Buffer.from(`/**
 * Generated by scripts/build-german-demography-care-survivor-contract.mjs.
 * Do not edit by hand.
 */
"use strict";

function deepFreeze(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreeze(child, seen);
    return Object.freeze(value);
}

export const GERMAN_DEMOGRAPHY_CARE_SURVIVOR_CONTRACT = deepFreeze(${JSON.stringify(artifact, null, 2)});

export const MORTALITY_TABLE =
    GERMAN_DEMOGRAPHY_CARE_SURVIVOR_CONTRACT.mortality.table;
export const SUPPORTED_PFLEGE_GRADES =
    GERMAN_DEMOGRAPHY_CARE_SURVIVOR_CONTRACT.care.taxonomy.grades;
export const PFLEGE_GRADE_LABELS =
    GERMAN_DEMOGRAPHY_CARE_SURVIVOR_CONTRACT.care.taxonomy.labels;
export const PFLEGE_GRADE_PROBABILITIES =
    GERMAN_DEMOGRAPHY_CARE_SURVIVOR_CONTRACT.care.entryModel.probabilitiesByAgeAndInitialGrade;
export const PFLEGE_GRADE_PROGRESSION_PROBABILITIES =
    GERMAN_DEMOGRAPHY_CARE_SURVIVOR_CONTRACT.care.progressionModel.probabilitiesByCurrentGrade;
`, 'utf8');
}

function main() {
    const artifact = buildArtifact();
    const generated = renderModule(artifact);
    if (VERIFY_ONLY) {
        if (!fs.existsSync(OUTPUT_PATH)) fail('Generated demography/care/survivor module is missing');
        const existing = fs.readFileSync(OUTPUT_PATH);
        if (!existing.equals(generated)) {
            fail('Generated demography/care/survivor module is stale', {
                expectedSha256: sha256(generated),
                actualSha256: sha256(existing)
            });
        }
        process.stdout.write(`Verified German demography/care/survivor contract; mortality hash ${artifact.hashes.mortalityTableHash}\n`);
        return;
    }
    fs.writeFileSync(OUTPUT_PATH, generated);
    process.stdout.write(`Built German demography/care/survivor contract; mortality hash ${artifact.hashes.mortalityTableHash}\n`);
}

main();
