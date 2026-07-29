import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    createManualMarketCsvImportPlan,
    parseMarketDataCsv
} from '../app/balance/balance-binder-imports.js';
import {
    AUTO_OPTIMIZE_PARAMETER_OPTIONS,
    AUTO_OPTIMIZE_PARAMETER_REGISTRY
} from '../app/simulator/auto-optimize-param-meta.js';
import { buildSweepInputs } from '../app/simulator/sweep-runner.js';
import { getTestExecutionPolicy } from './run-tests.mjs';

const testDir = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.resolve(testDir, '..');
const inventoryPath = path.join(
    testDir,
    'fixtures',
    'suite-data-integrity',
    'oracle-traceability-v1.json'
);
const inventory = JSON.parse(fs.readFileSync(inventoryPath, 'utf8'));

function readProjectFile(relativePath) {
    return fs.readFileSync(path.join(projectRoot, relativePath), 'utf8');
}

function assertWitness(reference, owner) {
    assert(['node', 'browser'].includes(reference.gate),
        `${owner} witness must name its execution gate`);
    const absolutePath = path.join(projectRoot, reference.file);
    assert(fs.existsSync(absolutePath), `${owner} witness file must exist: ${reference.file}`);
    const policy = getTestExecutionPolicy(path.basename(reference.file));
    const actualGate = policy.mode === 'separate-gate' ? 'browser' : 'node';
    assertEqual(actualGate, reference.gate,
        `${owner} witness must run in its declared ${reference.gate} gate`);
    const source = fs.readFileSync(absolutePath, 'utf8');
    assert(source.includes(reference.marker),
        `${owner} witness marker must remain in ${reference.file}: ${reference.marker}`);
}

function gitBlobSha1(content) {
    const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content);
    const header = Buffer.from(`blob ${buffer.length}\0`);
    return crypto.createHash('sha1').update(header).update(buffer).digest('hex');
}

function assertSame(actual, expected, message) {
    assertEqual(JSON.stringify(actual), JSON.stringify(expected), message);
}

console.log('--- Suite Data Integration Contract Tests ---');

assertEqual(
    inventory.schemaVersion,
    'SuiteDataIntegrityTraceabilityV1',
    'Traceability inventory must use the versioned Slice-16 schema'
);

const expectedOracleIds = Array.from(
    { length: 22 },
    (_, index) => `O-${String(index + 1).padStart(2, '0')}`
);
const actualOracleIds = inventory.oracles.map(oracle => oracle.id);
assertSame(actualOracleIds, expectedOracleIds,
    'Traceability inventory must contain O-01 through O-22 exactly once and in order');

for (const oracle of inventory.oracles) {
    assert(typeof oracle.title === 'string' && oracle.title.length > 0,
        `${oracle.id} must retain a readable title`);
    assert(Array.isArray(oracle.witnesses) && oracle.witnesses.length > 0,
        `${oracle.id} must have at least one concrete witness`);
    for (const witness of oracle.witnesses) {
        assertWitness(witness, oracle.id);
    }
}

const oracleById = new Map(inventory.oracles.map(oracle => [oracle.id, oracle]));

function assertTraceabilityOwner(entry, owner) {
    assert(Array.isArray(entry.oracleIds), `${owner} must declare oracleIds, even when empty`);
    assert(Array.isArray(entry.witnesses), `${owner} must declare witnesses, even when empty`);
    assert(entry.oracleIds.length + entry.witnesses.length > 0,
        `${owner} must retain at least one concrete oracle or direct witness`);
    for (const oracleId of entry.oracleIds) {
        assert(oracleById.has(oracleId), `${owner} oracle reference must resolve: ${oracleId}`);
    }
    for (const witness of entry.witnesses) {
        assertWitness(witness, owner);
    }
}

const expectedFindingIds = [
    'BAL-01', 'BAL-02', 'BAL-03', 'BAL-04', 'BAL-05', 'BAL-06',
    'DAT-01', 'DAT-02', 'DAT-03', 'DAT-04', 'DAT-05',
    'ENG-01', 'ENG-02', 'ENG-03', 'ENG-04', 'ENG-05', 'ENG-06', 'ENG-07', 'ENG-08', 'ENG-09',
    'SWP-01', 'SWP-02', 'SWP-03', 'SWP-04', 'SWP-05', 'SWP-06', 'SWP-07', 'SWP-08',
    'SWP-09', 'SWP-10', 'SWP-11',
    'OPT-01', 'OPT-02', 'OPT-03', 'OPT-04', 'OPT-05', 'OPT-06', 'OPT-07', 'OPT-08',
    'SIM-01', 'SIM-02', 'SIM-03', 'SIM-04', 'SIM-05', 'SIM-06', 'SIM-07',
    'IMP-01', 'IMP-02', 'IMP-03',
    'PER-01', 'PER-02', 'PER-03', 'PER-04', 'PER-05', 'PER-06',
    'MOD-01', 'MOD-02', 'MOD-03', 'MOD-04', 'MOD-05', 'MOD-06', 'MOD-07', 'MOD-08',
    'QA-01', 'QA-02'
];
const hardeningPlan = readProjectFile('docs/internal/SUITE_DATENINTEGRITAET_HARDENING_PLAN.md');
const findingsRegister = hardeningPlan
    .split('## Findings-Register')[1]
    ?.split('## Reproduzierte Golden-Orakel')[0] || '';
const planFindingIds = [...findingsRegister.matchAll(
    /^\| ((?:BAL|DAT|ENG|SWP|OPT|SIM|IMP|PER|MOD|QA)-\d{2}) \|/gm
)].map(match => match[1]);
assertSame(
    planFindingIds,
    expectedFindingIds,
    'The plan Findings-Register must retain the exact 65-finding baseline'
);
assertSame(
    inventory.findings.map(finding => finding.id),
    planFindingIds,
    'Finding traceability must match every plan finding exactly once and in plan order'
);
for (const finding of inventory.findings) {
    assert(Array.isArray(finding.fixSlices) && finding.fixSlices.length > 0,
        `${finding.id} must name at least one fix slice`);
    assert(finding.fixSlices.every(Number.isInteger),
        `${finding.id} fix slices must use integer slice numbers`);
    assert(Array.isArray(finding.evidenceSlices),
        `${finding.id} must declare its complementary evidence slices, even when empty`);
    assert(finding.evidenceSlices.every(Number.isInteger),
        `${finding.id} evidence slices must use integer slice numbers`);
    assertTraceabilityOwner({
        oracleIds: finding.oracleIds || [],
        witnesses: finding.witnesses || []
    }, finding.id);
}

const expectedSlice16FindingIds = [
    'BAL-01', 'BAL-02', 'BAL-04', 'BAL-06',
    'DAT-01', 'DAT-02', 'DAT-03', 'DAT-05',
    'ENG-01', 'ENG-05', 'ENG-06',
    'SWP-01', 'SWP-02', 'SWP-03', 'SWP-04', 'SWP-06', 'SWP-07', 'SWP-09', 'SWP-10', 'SWP-11',
    'OPT-01', 'OPT-07',
    'SIM-02', 'SIM-03', 'SIM-04', 'SIM-05',
    'IMP-01', 'IMP-02',
    'PER-02', 'PER-05',
    'MOD-01', 'MOD-02', 'MOD-03', 'MOD-04', 'MOD-05', 'MOD-06', 'MOD-07', 'MOD-08',
];
const completeTraceability = hardeningPlan
    .split('## Vollstaendige Traceability')[1]
    ?.split('## Test- und Nachweisstrategie')[0] || '';
const planTraceabilityRows = [...completeTraceability.matchAll(
    /^\| ((?:BAL|DAT|ENG|SWP|OPT|SIM|IMP|PER|MOD|QA)-\d{2}) \| ([^|]+) \| ([^|]+) \|$/gm
)].map(match => ({
    id: match[1],
    complementaryEvidence: match[3].trim()
}));
assertSame(
    planTraceabilityRows.map(row => row.id),
    planFindingIds,
    'The plan traceability table must retain exactly one row for every registered finding'
);
const planSlice16FindingIds = planTraceabilityRows
    .filter(row => /(^|[^\d])16([^\d]|$)/.test(row.complementaryEvidence))
    .map(row => row.id);
assertSame(
    planSlice16FindingIds,
    expectedSlice16FindingIds,
    'The plan must retain the reviewed 38-finding Slice-16 complementary evidence assignment'
);
assertSame(
    inventory.findings
        .filter(finding => finding.evidenceSlices.includes(16))
        .map(finding => finding.id),
    planSlice16FindingIds,
    'The inventory must match the plan Slice-16 complementary evidence assignment'
);

const expectedInvariantIds = Array.from(
    { length: 8 },
    (_, index) => `I-${String(index + 1).padStart(2, '0')}`
);
const invariantContractBlock = hardeningPlan
    .split('## Verbindliche Zielvertraege und Invarianten')[1]
    ?.split('## Architektur-Zielbild')[0] || '';
const planInvariants = [...invariantContractBlock.matchAll(
    /^### (I-0[1-8]) (.+)$/gm
)].map(match => ({ id: match[1], title: match[2].trim() }));
assertSame(
    planInvariants.map(invariant => invariant.id),
    expectedInvariantIds,
    'The plan must retain I-01 through I-08 exactly once and in order'
);
assertSame(
    inventory.invariants.map(invariant => invariant.id),
    planInvariants.map(invariant => invariant.id),
    'Invariant traceability must match every plan invariant exactly once and in order'
);
for (const [index, invariant] of inventory.invariants.entries()) {
    assertEqual(invariant.title, planInvariants[index].title,
        `${invariant.id} must retain its exact plan title`);
    assertTraceabilityOwner({
        oracleIds: invariant.oracleIds || [],
        witnesses: invariant.witnesses || []
    }, invariant.id);
}

for (const contract of inventory.browserContracts) {
    assertWitness(contract, `browser:${contract.id}`);
}
assertSame(
    inventory.browserContracts.map(contract => contract.id),
    ['preview_commit', 'three_bucket', 'hybrid_profile', 'import_recovery', 'sweep', 'optimizer'],
    'Browser inventory must cover every Slice-16 workflow'
);

for (const contract of inventory.parityContracts) {
    assertWitness(contract, `parity:${contract.id}`);
}
assertSame(
    inventory.parityContracts.map(contract => contract.id),
    ['single_multi_profile', 'main_worker', 'mc_single_sweep', 'evaluate_apply'],
    'Parity inventory must cover the four required integration dimensions'
);

{
    const parsed2010 = parseMarketDataCsv([
        'Datum;Schluss',
        '30.12.2007;80',
        '30.12.2008;70',
        '30.12.2009;90',
        '30.12.2010;100'
    ].join('\n'));
    let staleError = null;
    try {
        createManualMarketCsvImportPlan(parsed2010, {
            mode: 'current',
            targetYear: 2025,
            expectedAsOf: '2025-12-30',
            instrument: 'SYNTH.DE',
            sourceFileName: 'synthetic-stale-2010.csv',
            currentPeriodYear: 2025,
            importedAt: '2026-01-02T10:00:00.000Z'
        });
    } catch (error) {
        staleError = error;
    }
    assertEqual(staleError?.code, 'market_csv_asof_mismatch',
        'O-17 rejects a 2010 market CSV for current period 2025');
    assertEqual(parsed2010.asOf, '2010-12-30',
        'O-17 rejection must retain the stale source date for diagnostics');
}

const simulatorHtml = readProjectFile('Simulator.html');
const sweepRangesMarkup = simulatorHtml.match(
    /<legend><span[^>]*>[^<]*<\/span>Sweep-Ranges<\/legend>([\s\S]*?)<\/fieldset>/
);
assert(sweepRangesMarkup,
    'Simulator.html must retain one identifiable Sweep-Ranges fieldset');
const visibleSweepIds = [...sweepRangesMarkup[1].matchAll(
    /<input\b[^>]*\bid="(sweep[A-Za-z0-9_-]+)"/g
)].map(match => match[1]);
const sweepRows = inventory.parameterCausality.sweep;
assertSame(
    [...visibleSweepIds].sort(),
    sweepRows.map(row => row.uiId).sort(),
    'Every visible interactive Sweep parameter must have exactly one causality row'
);
assert(!simulatorHtml.includes('id="sweepHorizonYears"'),
    'Direct horizon must not be offered as a no-op in the actuarial Sweep UI');
assert(simulatorHtml.includes('id="sweepMaxBearRefillPct"'),
    'Interactive Sweep must retain the visible Bear-Refill base assumption');

const sweepBase = {
    runwayMinMonths: 24,
    runwayTargetMonths: 36,
    targetEq: 60,
    rebalBand: 5,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    goldAktiv: false,
    goldZielProzent: 0,
    dynamicFlex: true,
    horizonMethod: 'survival_quantile',
    survivalQuantile: 0.85,
    goGoActive: true,
    goGoMultiplier: 1.1
};
const sweepParams = Object.fromEntries(sweepRows.map(row => [row.key, row.witnessValue]));
const sweptInputs = buildSweepInputs(sweepBase, sweepParams);
for (const row of sweepRows) {
    assertEqual(
        sweptInputs[row.canonicalKey],
        row.witnessValue,
        `${row.uiId} must reach canonical Sweep consumer ${row.canonicalKey}`
    );
    assert(row.consumer.endsWith('#buildSweepInputs'),
        `${row.uiId} must name its concrete Sweep consumer`);
    assert(row.provenance.includes(`params.${row.key}`),
        `${row.uiId} must name its result provenance`);
    assert(row.status.startsWith('canonical_path_verified'),
        `${row.uiId} must declare canonical-path evidence without overstating KPI effectiveness`);
}
assertEqual(sweptInputs.goldAktiv, true,
    'Positive Sweep gold target must preserve its canonical activation side effect');

const optimizerRows = inventory.parameterCausality.optimizer;
assertSame(
    optimizerRows.map(row => row.key),
    AUTO_OPTIMIZE_PARAMETER_OPTIONS.map(option => option.key),
    'Optimizer causality rows must exactly match the interactive production registry'
);
for (const row of optimizerRows) {
    const definition = AUTO_OPTIMIZE_PARAMETER_REGISTRY[row.key];
    assert(definition, `Optimizer registry must contain ${row.key}`);
    assertEqual(definition.requestKey, row.canonicalKey,
        `${row.key} must retain its canonical request key`);
    assertEqual(definition.formId, row.uiId,
        `${row.key} must retain its actual form target`);
    assertSame(definition.domain, row.domain,
        `${row.key} matrix domain must match the production registry`);
    assert(simulatorHtml.includes(`id="${row.uiId}"`),
        `${row.key} apply target must exist in Simulator.html`);
    assert(row.provenance.includes(row.canonicalKey),
        `${row.key} must name canonical fingerprint provenance`);
}
assertWitness({
    gate: 'node',
    file: 'tests/auto-optimize-fidelity.test.mjs',
    marker: 'every interactive parameter has a deterministic causal witness'
}, 'optimizer-causality');

for (const baseline of inventory.deltaBaselines) {
    const absolutePath = path.join(projectRoot, baseline.file);
    assert(fs.existsSync(absolutePath), `Delta baseline must exist: ${baseline.file}`);
    assertEqual(
        gitBlobSha1(fs.readFileSync(absolutePath)),
        baseline.gitBlobSha1,
        `${baseline.id} changed without declared delta evidence`
    );
    assert(['none', 'none_after_build', 'backtest_data_02'].includes(baseline.expectedDelta),
        `${baseline.id} must declare its expected delta class`);
    if (baseline.expectedDelta === 'backtest_data_02') {
        assert(
            typeof baseline.deltaEvidence === 'string'
                && fs.existsSync(path.join(projectRoot, baseline.deltaEvidence)),
            `${baseline.id} must link to Backtest-Data Slice 02 evidence`
        );
    }
}

console.log('Suite data integration contract tests passed');
