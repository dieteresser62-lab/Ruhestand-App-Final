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
        `${baseline.id} changed without a Slice-16 delta-ledger entry`
    );
    assert(['none', 'none_after_build'].includes(baseline.expectedDelta),
        `${baseline.id} must declare the expected Slice-16 delta`);
}

console.log('Suite data integration contract tests passed');
