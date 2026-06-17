import { readCareInputs } from '../app/simulator/simulator-input-care.js';
import { parseBoundedNumber } from '../app/simulator/simulator-input-dom.js';
import { readPartnerInputs, readPensionInputs, readWidowOptions } from '../app/simulator/simulator-input-pension.js';
import {
    normalizeDecumulationMode,
    readAccumulationInputs,
    readBasePortfolioInputs,
    readDecumulationInputs,
    readDynamicFlexInputs
} from '../app/simulator/simulator-input-strategy.js';
import { SimulatorValidationError, validateSimulatorInputs } from '../app/simulator/simulator-input-validation.js';
import { readTrancheInputs } from '../app/simulator/simulator-input-tranches.js';
import { getCommonInputs } from '../app/simulator/simulator-portfolio-inputs.js';
import { STRATEGY_OPTIONS } from '../types/strategy-options.js';

console.log('--- Simulator Input Reader Tests ---');

function createDocumentMock(values = {}) {
    return {
        getElementById(id) {
            if (!Object.prototype.hasOwnProperty.call(values, id)) return null;
            const entry = values[id];
            if (entry && typeof entry === 'object' && !Array.isArray(entry)) {
                return {
                    value: entry.value ?? '',
                    checked: entry.checked ?? false
                };
            }
            return { value: entry, checked: false };
        }
    };
}

console.log('Test 1: bounded parser handles comma and clamps');
{
    assertEqual(parseBoundedNumber('1,75', 0, 1, 2), 1.75, 'Comma decimal should parse');
    assertEqual(parseBoundedNumber('99', 0, 1, 2), 2, 'Value should clamp to max');
    assertEqual(parseBoundedNumber('x', 7, 1, 2), 7, 'Invalid value should fallback');
}
console.log('✓ bounded parser OK');

console.log('Test 2: pension readers preserve legacy fallbacks');
{
    const doc = createDocumentMock({
        startAlter: '66',
        geschlecht: 'm',
        startSPB: '1200',
        kirchensteuerSatz: '9',
        renteMonatlich: '1800',
        renteStartOffsetJahre: '2',
        r2Brutto: '24000',
        widowPensionMode: 'percent',
        widowPensionPct: '55',
        widowMarriageOffsetYears: '3',
        widowMinMarriageYears: '5'
    });
    const p1 = readPensionInputs(doc);
    const p2 = readPartnerInputs(doc);
    const widow = readWidowOptions(doc).widowOptions;

    assertEqual(p1.startAlter, 66, 'P1 start age should fallback to legacy startAlter');
    assertEqual(p1.geschlecht, 'm', 'P1 gender should fallback to legacy geschlecht');
    assertEqual(p1.kirchensteuerSatz, 0.09, 'Church tax should convert pct to ratio');
    assertEqual(p2.partner.monatsrente, 2000, 'P2 monthly pension should migrate from annual legacy value');
    assertEqual(p2.partner.brutto, 24000, 'P2 legacy brutto alias should remain annualized');
    assertEqual(widow.percent, 0.55, 'Widow percent should normalize to ratio');
    assertEqual(widow.marriageOffsetYears, 3, 'Widow marriage offset should parse');
    assertEqual(widow.minMarriageYears, 5, 'Widow minimum marriage years should parse');
}
console.log('✓ pension legacy fallbacks OK');

console.log('Test 3: tranche reader prioritizes profile override');
{
    const override = [{ trancheId: 'override', marketValue: 1 }];
    const storage = {
        getItem() {
            return JSON.stringify([{ trancheId: 'storage', marketValue: 2 }]);
        }
    };
    const result = readTrancheInputs({
        win: { __profilverbundTranchenOverride: override, __profilverbundPreferAggregates: false },
        storage
    });
    assertEqual(result.detailledTranches[0].trancheId, 'override', 'Override should win over storage');

    const aggregateResult = readTrancheInputs({
        win: { __profilverbundPreferAggregates: true },
        storage
    });
    assertEqual(aggregateResult.detailledTranches, null, 'Prefer aggregates should skip localStorage tranches');
}
console.log('✓ tranche priority OK');

console.log('Test 4: strategy readers preserve bounds and normalization');
{
    const doc = createDocumentMock({
        dynamicFlex: { checked: true },
        horizonMethod: 'invalid',
        horizonYears: '120',
        survivalQuantile: '0.1',
        goGoActive: { checked: true },
        goGoMultiplier: '2',
        marketCapeRatio: '31.4',
        entnahmeStrategie: 'vpw',
        enableAccumulationPhase: { checked: true },
        accumulationDurationYears: '4',
        accumulationSparrate: '500',
        sparrateIndexing: 'inflation'
    });
    const dynamicFlex = readDynamicFlexInputs(doc);
    const decumulation = readDecumulationInputs(doc).decumulation;
    const accumulation = readAccumulationInputs({ startAlter: 63, doc });

    assertEqual(dynamicFlex.horizonMethod, 'survival_quantile', 'Invalid horizon method should fallback');
    assertEqual(dynamicFlex.horizonYears, 60, 'Horizon should clamp to max');
    assertEqual(dynamicFlex.survivalQuantile, 0.5, 'Quantile should clamp to min');
    assertEqual(dynamicFlex.goGoMultiplier, 1.5, 'Go-Go multiplier should clamp to max');
    assertEqual(dynamicFlex.capeRatio, 31.4, 'CAPE alias should be in sync');
    assertEqual(decumulation.mode, STRATEGY_OPTIONS.STANDARD, 'Legacy strategy mode should normalize to standard');
    assertEqual(normalizeDecumulationMode(STRATEGY_OPTIONS.THREE_BUCKET_JILGE), STRATEGY_OPTIONS.THREE_BUCKET_JILGE, '3-bucket mode should remain supported');
    assertEqual(accumulation.transitionYear, 4, 'Accumulation transition should use duration');
    assertEqual(accumulation.transitionAge, 67, 'Transition age should add duration to start age');
}
console.log('✓ strategy readers OK');

console.log('Test 5: care reader tolerates missing DOM fields');
{
    const care = readCareInputs({ gender: 'w', doc: createDocumentMock() });
    assertEqual(care.pflegefallLogikAktivieren, false, 'Missing care toggle should default to false');
    assert(care.pflegeGradeConfigs && typeof care.pflegeGradeConfigs === 'object', 'Care grade config should exist');
    assertEqual(care.pflegeKostenDrift, 0.035, 'Care drift should use default ratio');
}
console.log('✓ care reader missing DOM defaults OK');

console.log('Test 6: base reader and validator handle minimum flex');
{
    const doc = createDocumentMock({
        tagesgeld: '10.000',
        geldmarktEtf: '5.000',
        simStartVermoegen: '100.000',
        depotwertAlt: '85',
        einstandAlt: '70',
        startFloorBedarf: '24000',
        startFlexBedarf: '12000',
        minimumFlexAnnual: '6000',
        goldAllokationAktiv: 'false'
    });
    const base = readBasePortfolioInputs(doc);
    assertEqual(base.minimumFlexAnnual, 6000, 'Mindest-Flex sollte aus dem Simulator-DOM gelesen werden');
    validateSimulatorInputs(base);

    let thrown = null;
    try {
        validateSimulatorInputs({ startFlexBedarf: 12000, minimumFlexAnnual: 12001 });
    } catch (error) {
        thrown = error;
    }
    assert(thrown instanceof SimulatorValidationError, 'Mindest-Flex > Flex-Bedarf sollte validieren');
    assert(thrown.errors.some(e => e.fieldId === 'minimumFlexAnnual'), 'Fehler markiert minimumFlexAnnual');
    assert(thrown.errors.some(e => e.fieldId === 'startFlexBedarf'), 'Fehler markiert startFlexBedarf');

    let negative = null;
    try {
        validateSimulatorInputs({ startFlexBedarf: 12000, minimumFlexAnnual: -1 });
    } catch (error) {
        negative = error;
    }
    assert(negative instanceof SimulatorValidationError, 'Negativer Mindest-Flex sollte validieren');
    assert(negative.errors.some(e => e.fieldId === 'minimumFlexAnnual'), 'Negativer Fehler markiert minimumFlexAnnual');
}
console.log('✓ minimum flex reader/validator OK');

console.log('Test 7: getCommonInputs preserves profilverbund minimum-flex split');
{
    const previousWindow = global.window;
    const previousDocument = global.document;
    try {
        global.window = {
            __profilverbundMinimumFlexProfiles: [
                { profileId: 'a', name: 'A', minimumFlexAnnual: 0 },
                { profileId: 'b', name: 'B', minimumFlexAnnual: 2500 }
            ],
            __profilverbundPreferAggregates: true
        };
        global.document = createDocumentMock({
            tagesgeld: '10.000',
            geldmarktEtf: '5.000',
            simStartVermoegen: '100.000',
            depotwertAlt: '85',
            einstandAlt: '70',
            startFloorBedarf: '24000',
            startFlexBedarf: '12000',
            minimumFlexAnnual: '2500',
            goldAllokationAktiv: 'false',
            p1StartAlter: '65',
            p1Geschlecht: 'm'
        });
        const inputs = getCommonInputs();
        assertEqual(inputs.minimumFlexAnnual, 2500, 'Aggregierter Mindest-Flex sollte im DOM-Wert bleiben');
        assertEqual(inputs.minimumFlexProfiles.length, 2, 'Profilgenaue Mindest-Flex-Aufteilung sollte erhalten bleiben');
        assertEqual(inputs.minimumFlexProfiles[1].minimumFlexAnnual, 2500, 'Profil B Mindest-Flex sollte erhalten bleiben');
        inputs.minimumFlexProfiles[1].minimumFlexAnnual = 1;
        assertEqual(global.window.__profilverbundMinimumFlexProfiles[1].minimumFlexAnnual, 2500, 'getCommonInputs sollte den Profil-Split kopieren');
    } finally {
        if (previousWindow === undefined) delete global.window; else global.window = previousWindow;
        if (previousDocument === undefined) delete global.document; else global.document = previousDocument;
    }
}
console.log('✓ profilverbund minimum-flex split preserved OK');

console.log('Test 8: getCommonInputs and validator enforce tail-risk UI contract');
{
    const previousWindow = global.window;
    const previousDocument = global.document;
    try {
        global.window = {};
        global.document = createDocumentMock({
            tagesgeld: '10.000',
            geldmarktEtf: '5.000',
            simStartVermoegen: '100.000',
            depotwertAlt: '85',
            einstandAlt: '70',
            startFloorBedarf: '24000',
            startFlexBedarf: '12000',
            minimumFlexAnnual: '0',
            goldAllokationAktiv: 'false',
            p1StartAlter: '65',
            p1Geschlecht: 'm',
            mcDauer: '35',
            tailRiskEnabled: { checked: true },
            tailRiskAnnualProbabilityPct: '1.5',
            tailRiskReturnShockPct: '-35',
            tailRiskInflationShockPct: '6',
            tailRiskDurationYears: '3',
            tailRiskCooldownYears: '10'
        });
        const inputs = getCommonInputs();
        assertEqual(inputs.tailRiskEnabled, true, 'Tail-risk opt-in should be read from checkbox');
        assertEqual(inputs.tailRiskAnnualProbabilityPct, 1.5, 'Tail-risk probability should parse as number');
        assertEqual(inputs.tailRiskDurationYears, 3, 'Tail-risk duration should parse as integer');
        assertEqual(inputs.tailRiskConfigValid, true, 'Valid tail-risk UI config should remain valid');
        validateSimulatorInputs(inputs);

        global.document = createDocumentMock({
            startFlexBedarf: '12000',
            minimumFlexAnnual: '0',
            mcDauer: '2',
            tailRiskEnabled: { checked: true },
            tailRiskAnnualProbabilityPct: '9',
            tailRiskReturnShockPct: '-35',
            tailRiskInflationShockPct: '6',
            tailRiskDurationYears: '3',
            tailRiskCooldownYears: '10'
        });
        const invalidInputs = getCommonInputs();
        let thrown = null;
        try {
            validateSimulatorInputs(invalidInputs);
        } catch (error) {
            thrown = error;
        }
        assert(thrown instanceof SimulatorValidationError, 'Invalid tail-risk config should block validation');
        assert(thrown.errors.some(e => e.fieldId === 'tailRiskAnnualProbabilityPct'), 'Probability range error should be reported');

        global.document = createDocumentMock({
            startFlexBedarf: '12000',
            minimumFlexAnnual: '0',
            mcDauer: '2',
            tailRiskEnabled: { checked: true },
            tailRiskAnnualProbabilityPct: '1',
            tailRiskReturnShockPct: '-35',
            tailRiskInflationShockPct: '6',
            tailRiskDurationYears: '3',
            tailRiskCooldownYears: '10'
        });
        const invalidHorizonInputs = getCommonInputs();
        let horizonError = null;
        try {
            validateSimulatorInputs(invalidHorizonInputs);
        } catch (error) {
            horizonError = error;
        }
        assert(horizonError instanceof SimulatorValidationError, 'Tail-risk duration beyond horizon should block validation');
        assert(horizonError.errors.some(e => e.fieldId === 'tailRiskDurationYears'), 'Duration horizon error should be reported');
    } finally {
        if (previousWindow === undefined) delete global.window; else global.window = previousWindow;
        if (previousDocument === undefined) delete global.document; else global.document = previousDocument;
    }
}
console.log('✓ tail-risk UI contract validation OK');

console.log('✅ Simulator input reader tests passed');
