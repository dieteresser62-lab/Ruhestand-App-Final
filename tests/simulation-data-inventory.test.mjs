import fs from 'node:fs';
import {
    assertSimulationDataValueHash,
    evaluateSimulationDataSourceGate,
    SIMULATION_DATA_EVIDENCE_CLASSES,
    SIMULATION_DATA_INVENTORY,
    SIMULATION_DATA_INVENTORY_SCHEMA_VERSION,
    SimulationDataInventoryError,
    validateSimulationDataInventory
} from '../app/simulator/simulation-data-inventory.js';
import {
    HISTORICAL_DATA,
    MORTALITY_TABLE,
    PFLEGE_GRADE_LABELS,
    PFLEGE_GRADE_PROBABILITIES,
    PFLEGE_GRADE_PROGRESSION_PROBABILITIES,
    REGIME_CLASSIFICATION_THRESHOLDS,
    REGIME_TRANSITIONS,
    STRESS_PRESETS,
    SUPPORTED_PFLEGE_GRADES
} from '../app/simulator/simulator-data.js';
import { CONFIG } from '../engine/config.mjs';
import { DEFAULT_PROFILE_HEALTH_BUCKET } from '../app/profile/profile-state.js';
import {
    LONGEVITY_DEFAULTS,
    LONGEVITY_LIMITS,
    LONGEVITY_TRANSITION_SMOOTHING
} from '../app/simulator/dynamic-flex-longevity-contract.js';
import {
    TAIL_RISK_DEFAULT_CONFIG,
    TAIL_RISK_HISTORICAL_CRISIS_REGIMES,
    TAIL_RISK_LIMITS
} from '../app/simulator/tail-risk-contract.js';
import {
    MONTE_CARLO_PARAMETER_LIMITS,
    MONTE_CARLO_RNG_MODES,
    MONTE_CARLO_SAMPLING_METHODS,
    MONTE_CARLO_START_YEAR_MODES
} from '../app/simulator/monte-carlo-parameters.js';
import { PFLEGE_COST_PRESETS } from '../app/simulator/simulator-ui-pflege.js';

console.log('--- Simulation Data Inventory Tests ---');

function clone(value) {
    return JSON.parse(JSON.stringify(value));
}

function captureError(callback) {
    try {
        callback();
        return null;
    } catch (error) {
        return error;
    }
}

const historicalSeriesIds = [
    'msci_eur',
    'inflation_de',
    'zinssatz_de',
    'lohn_de',
    'gold_eur_perf',
    'cape'
];

console.log('Test 1: V1 inventory validates and is deeply immutable');
validateSimulationDataInventory(SIMULATION_DATA_INVENTORY);
assertEqual(
    SIMULATION_DATA_INVENTORY.schemaVersion,
    SIMULATION_DATA_INVENTORY_SCHEMA_VERSION,
    'Inventory schema should be versioned'
);
assert(Object.isFrozen(SIMULATION_DATA_INVENTORY), 'Inventory root should be immutable');
assert(Object.isFrozen(SIMULATION_DATA_INVENTORY.historicalSeries.msci_eur.qualitySegments), 'Quality segments should be immutable');
assert(Object.isFrozen(SIMULATION_DATA_INVENTORY.staticData.mortality_table), 'Static entries should be immutable');
console.log('✓ V1 shape and immutability OK');

console.log('Test 2: historical series own complete, series-specific quality segments');
for (const seriesId of historicalSeriesIds) {
    const entry = SIMULATION_DATA_INVENTORY.historicalSeries[seriesId];
    assert(entry, `${seriesId} should be inventoried`);
    assertEqual(entry.id, seriesId, `${seriesId} should retain its internal ID`);
    assertEqual(entry.category, 'historical_series', `${seriesId} should be a historical series`);
    assertEqual(entry.qualitySegments[0].startYear, 1925, `${seriesId} quality should start in 1925`);
    assertEqual(
        entry.qualitySegments.at(-1).endYear,
        2025,
        `${seriesId} quality should end in 2025`
    );
    assert(
        entry.qualitySegments !== SIMULATION_DATA_INVENTORY.historicalSeries.msci_eur.qualitySegments
            || seriesId === 'msci_eur',
        `${seriesId} should own a separate quality-segment contract`
    );
}
assertEqual(
    SIMULATION_DATA_INVENTORY.historicalSeries.gold_eur_perf.qualitySegments.length,
    6,
    'Gold should expose its zero-value ambiguity as series-specific segments'
);
assert(
    SIMULATION_DATA_INVENTORY.historicalSeries.msci_eur.qualitySegments
        .some(segment => segment.note.includes('D-15')),
    'Equity quality should expose the D-15 placeholder risk'
);
console.log('✓ series-specific quality segmentation OK');

console.log('Test 3: mandatory provenance fields and evidence vocabulary are explicit');
const allEntries = [
    ...Object.values(SIMULATION_DATA_INVENTORY.historicalSeries),
    ...Object.values(SIMULATION_DATA_INVENTORY.staticData)
];
const requiredResolutionFields = [
    'source',
    'seriesIdentifier',
    'currency',
    'yearConvention',
    'transformation',
    'license',
    'retrievedAt',
    'rawDataHash',
    'embeddedValueHash'
];
for (const entry of allEntries) {
    assert(SIMULATION_DATA_EVIDENCE_CLASSES.includes(entry.evidenceClass), `${entry.id} should use the evidence vocabulary`);
    assert(Array.isArray(entry.implementationLocations) && entry.implementationLocations.length > 0, `${entry.id} should name implementation coverage`);
    for (const fieldName of requiredResolutionFields) {
        assert(entry[fieldName] && typeof entry[fieldName].status === 'string', `${entry.id}.${fieldName} should be explicit`);
        if (entry[fieldName].status === 'unresolved') {
            assertEqual(entry[fieldName].value, null, `${entry.id}.${fieldName} must not invent unresolved provenance`);
        }
    }
}
assert(
    SIMULATION_DATA_INVENTORY.staticData.care_incidence_probabilities.evidenceClass
        !== SIMULATION_DATA_INVENTORY.staticData.care_progression_probabilities.evidenceClass,
    'Estimated care incidence and progression assumptions should not share one evidence class'
);
assert(
    SIMULATION_DATA_INVENTORY.staticData.stress_presets.evidenceClass
        !== SIMULATION_DATA_INVENTORY.staticData.regime_transition_matrix.evidenceClass,
    'Stress parameters and derived transitions should not share one evidence class'
);
console.log('✓ mandatory fields and evidence separation OK');

console.log('Test 4: every required static data class has implementation coverage');
const categories = new Set(Object.values(SIMULATION_DATA_INVENTORY.staticData).map(entry => entry.category));
for (const category of [
    'demography',
    'care',
    'survivor',
    'tax',
    'pension_social',
    'stress_regime',
    'defaults_fallbacks'
]) {
    assert(categories.has(category), `${category} should be inventoried`);
}
assertEqual(
    SIMULATION_DATA_INVENTORY.staticData.social_insurance_parameters.evidenceClass,
    'missing',
    'An absent automatic social-insurance table should stay explicit'
);
assertEqual(
    SIMULATION_DATA_INVENTORY.staticData.social_insurance_parameters.contractValue.implemented,
    false,
    'The inventory must not fabricate social-insurance parameters'
);
console.log('✓ static class coverage OK');

console.log('Test 5: all six embedded historical series match their own SHA-256');
for (const seriesId of historicalSeriesIds) {
    const projection = Object.fromEntries(
        Object.entries(HISTORICAL_DATA).map(([year, row]) => [year, row[seriesId]])
    );
    assertSimulationDataValueHash(seriesId, projection);
}
console.log('✓ historical series hashes OK');

console.log('Test 6: exported static data values match their inventory SHA-256');
const staticValues = {
    mortality_table: MORTALITY_TABLE,
    care_grade_taxonomy: {
        grades: SUPPORTED_PFLEGE_GRADES,
        labels: PFLEGE_GRADE_LABELS
    },
    care_incidence_probabilities: PFLEGE_GRADE_PROBABILITIES,
    care_progression_probabilities: PFLEGE_GRADE_PROGRESSION_PROBABILITIES,
    care_cost_presets: PFLEGE_COST_PRESETS,
    stress_presets: STRESS_PRESETS,
    regime_classification_thresholds: REGIME_CLASSIFICATION_THRESHOLDS,
    regime_transition_matrix: REGIME_TRANSITIONS,
    engine_policy_defaults: CONFIG,
    monte_carlo_defaults: {
        limits: MONTE_CARLO_PARAMETER_LIMITS,
        samplingMethods: MONTE_CARLO_SAMPLING_METHODS,
        rngModes: MONTE_CARLO_RNG_MODES,
        startYearModes: MONTE_CARLO_START_YEAR_MODES
    },
    longevity_defaults: {
        defaults: LONGEVITY_DEFAULTS,
        limits: LONGEVITY_LIMITS,
        transitionSmoothing: LONGEVITY_TRANSITION_SMOOTHING
    },
    tail_risk_defaults: {
        defaults: TAIL_RISK_DEFAULT_CONFIG,
        limits: TAIL_RISK_LIMITS,
        historicalCrisisRegimes: TAIL_RISK_HISTORICAL_CRISIS_REGIMES
    },
    health_bucket_defaults: DEFAULT_PROFILE_HEALTH_BUCKET
};
for (const [entryId, value] of Object.entries(staticValues)) {
    assertSimulationDataValueHash(entryId, value);
}
console.log('✓ exported static-data hashes OK');

console.log('Test 7: source-local user/tax defaults match their inventoried contracts');
{
    const simulatorHtml = fs.readFileSync(new URL('../Simulator.html', import.meta.url), 'utf8');
    const pensionUi = fs.readFileSync(new URL('../app/simulator/simulator-ui-rente.js', import.meta.url), 'utf8');
    const taxSettlement = fs.readFileSync(new URL('../engine/tax-settlement.mjs', import.meta.url), 'utf8');
    const saleEngine = fs.readFileSync(new URL('../engine/transactions/sale-engine.mjs', import.meta.url), 'utf8');
    const portfolioInit = fs.readFileSync(new URL('../app/simulator/simulator-portfolio-init.js', import.meta.url), 'utf8');

    const widowContract = SIMULATION_DATA_INVENTORY.staticData.widow_benefit_parameters.contractValue;
    assert(
        simulatorHtml.includes(`id="widowPensionPct" min="${widowContract.percentMinimum}" max="${widowContract.percentMaximum}" step="${widowContract.percentStep}" value="${widowContract.defaultPercent}"`),
        'Widow percentage HTML defaults should match the inventory'
    );
    assert(
        simulatorHtml.includes(`<option value="${widowContract.defaultMode}">`),
        'Widow mode should remain available in the UI'
    );
    assertSimulationDataValueHash('widow_benefit_parameters', widowContract);

    const pensionContract = SIMULATION_DATA_INVENTORY.staticData.pension_user_defaults.contractValue;
    assert(pensionUi.includes(`p1KirchensteuerPct: ${pensionContract.p1ChurchTaxPercent}`), 'P1 church-tax default should match');
    assert(pensionUi.includes(`r2KirchensteuerPct: ${pensionContract.p2ChurchTaxPercent}`), 'P2 church-tax default should match');
    assert(pensionUi.includes(`rentAdjMode: "${pensionContract.rentAdjustmentMode}"`), 'Pension adjustment mode should match');
    assertSimulationDataValueHash('pension_user_defaults', pensionContract);

    const taxContract = SIMULATION_DATA_INVENTORY.staticData.capital_income_tax_parameters.contractValue;
    for (const source of [taxSettlement, saleEngine]) {
        assert(
            source.includes(`${taxContract.capitalGainsTaxRate} * (1 + ${taxContract.solidaritySurchargeRate} + kiSt)`),
            'Both engine tax paths should match the inventoried base-rate formula'
        );
    }
    assert(
        portfolioInit.includes(`tqf: ${taxContract.defaultEquityTqf.toFixed(2)}`),
        'Default equity TQF should match the inventory'
    );
    assert(
        portfolioInit.includes(`inputs.goldSteuerfrei ? ${taxContract.goldTaxFreeTqf}.0 : 0.0`),
        'Gold tax-free TQF should match the inventory'
    );
    assertSimulationDataValueHash('capital_income_tax_parameters', taxContract);
}
console.log('✓ source-local default contracts OK');

console.log('Test 8: unresolved gates allow reproduction but block external claims/replacement');
for (const seriesId of historicalSeriesIds) {
    const gate = evaluateSimulationDataSourceGate(seriesId);
    assertEqual(gate.technicallyReproducible, true, `${seriesId} should remain reproducible`);
    assertEqual(gate.externallyValidated, false, `${seriesId} must not claim external validation`);
    assertEqual(gate.replacementAllowed, false, `${seriesId} must not pass the replacement gate`);
    assert(gate.unresolvedFields.includes('source'), `${seriesId} should expose its source blocker`);
    assert(gate.unresolvedFields.includes('license'), `${seriesId} should expose its license blocker`);
}
console.log('✓ unresolved source gate OK');

console.log('Test 9: fabricated provenance and false validation claims fail closed');
{
    const fabricated = clone(SIMULATION_DATA_INVENTORY);
    fabricated.historicalSeries.msci_eur.source = {
        status: 'unresolved',
        value: 'guessed-source'
    };
    const fabricatedError = captureError(() => validateSimulationDataInventory(fabricated));
    assert(fabricatedError instanceof SimulationDataInventoryError, 'Fabricated unresolved source should fail with inventory error');
    assertEqual(fabricatedError.code, 'SIMULATION_DATA_INVENTORY_INVALID', 'Fabricated provenance should fail the shape gate');

    const falseValidation = clone(SIMULATION_DATA_INVENTORY);
    falseValidation.historicalSeries.msci_eur.externalValidationStatus = 'externally_validated';
    const validationError = captureError(() => validateSimulationDataInventory(falseValidation));
    assertEqual(
        validationError?.code,
        'SIMULATION_DATA_EXTERNAL_VALIDATION_UNPROVEN',
        'External validation without source/license evidence should fail closed'
    );

    const drifted = clone(REGIME_CLASSIFICATION_THRESHOLDS);
    drifted.equityCrashRatio = -0.20;
    const hashError = captureError(() => assertSimulationDataValueHash('regime_classification_thresholds', drifted));
    assertEqual(hashError?.code, 'SIMULATION_DATA_HASH_MISMATCH', 'Static value drift should fail the hash gate');
}
console.log('✓ negative provenance and hash gates OK');

console.log('✅ Simulation data inventory tests passed');
