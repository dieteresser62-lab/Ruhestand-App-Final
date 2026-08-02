"use strict";

import fs from 'node:fs';

import InputValidator from '../engine/validators/InputValidator.mjs';
import { EngineAPI } from '../engine/index.mjs';
import { evaluateCandidate } from '../app/simulator/auto-optimize-evaluate.js';
import { runMonteCarloChunk } from '../app/simulator/monte-carlo-runner.js';
import {
    parseDisplayNumber
} from '../app/simulator/simulator-portfolio-format.js';
import {
    initializePortfolioDetailed,
    SimulatorPortfolioInputError
} from '../app/simulator/simulator-portfolio-init.js';
import {
    readBasePortfolioInputs,
    readStrategyInputs
} from '../app/simulator/simulator-input-strategy.js';
import { runSweepChunk } from '../app/simulator/sweep-runner.js';

console.log('--- Canonical Number Boundary Tests ---');

function createDocumentMock(values = {}) {
    return {
        getElementById(id) {
            if (!Object.prototype.hasOwnProperty.call(values, id)) return null;
            return { value: values[id] };
        }
    };
}

function detailedLot(overrides = {}) {
    return {
        trancheId: 'fractional-lot',
        sourceProfileId: 'profile-a',
        name: 'Fractional ETF',
        shares: 1.234,
        purchasePrice: 100.5,
        currentPrice: 100.5,
        purchaseDate: '2026-01-01',
        tqf: 0.3,
        type: 'aktien_neu',
        category: 'equity',
        ...overrides
    };
}

function simulationInputs(lotOverrides = {}) {
    return {
        startAlter: 65,
        geschlecht: 'm',
        startVermoegen: 20124.017,
        depotwertAlt: 124.017,
        einstandAlt: 124.017,
        tagesgeld: 20000,
        geldmarktEtf: 0,
        zielLiquiditaet: 20000,
        startFloorBedarf: 0,
        startFlexBedarf: 0,
        minimumFlexAnnual: 0,
        flexBudgetAnnual: 0,
        flexBudgetYears: 0,
        flexBudgetRecharge: 0,
        rebalancingBand: 25,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        liquidityRunwayYears: 5,
        goldAktiv: false,
        goldZielProzent: 0,
        goldFloorProzent: 0,
        goldSteuerfrei: true,
        startSPB: 1000,
        kirchensteuerSatz: 0,
        rentAdjMode: 'fix',
        rentAdjPct: 0,
        renteMonatlich: 0,
        renteStartOffsetJahre: 0,
        dynamicFlex: false,
        stressPreset: 'NONE',
        pflegefallLogikAktivieren: false,
        partner: { aktiv: false },
        accumulationPhase: { enabled: false },
        transitionYear: 0,
        simulationSourceProfileId: 'profile-a',
        detailledTranches: [detailedLot(lotOverrides)]
    };
}

console.log('Test 1: canonical numbers bypass display separator heuristics');
{
    assertClose(parseDisplayNumber(1.234), 1.234, 1e-12,
        'Canonical fractional number must remain unchanged');
    assertClose(parseDisplayNumber(-1.234), -1.234, 1e-12,
        'Canonical negative number must remain unchanged');
    assertEqual(parseDisplayNumber(0), 0, 'Canonical zero must remain zero');
    assertEqual(parseDisplayNumber(Number.NaN), 0, 'Non-finite canonical number uses the display fallback');
    assertEqual(parseDisplayNumber(Number.POSITIVE_INFINITY), 0,
        'Infinite canonical number uses the display fallback');
    assertEqual(parseDisplayNumber('1.234'), 1234,
        'Explicit de-DE display text keeps its thousands-separator interpretation');
    assertClose(parseDisplayNumber('1,234'), 1.234, 1e-12,
        'Explicit de-DE display text keeps its decimal-comma interpretation');
    assertEqual(parseDisplayNumber('12abc'), 0,
        'Malformed display text is rejected instead of partially parsed');
    assertEqual(parseDisplayNumber('1,23.4'), 0,
        'Conflicting display separators are rejected');
}

console.log('Test 2: O-05 fractional lot stays canonical through portfolio initialization');
{
    const portfolio = initializePortfolioDetailed({
        tagesgeld: 0,
        detailledTranches: [detailedLot()]
    });
    const [lot] = portfolio.depotTranchesAktien;
    assertClose(lot.shares, 1.234, 1e-12, 'O-05 keeps 1.234 canonical shares');
    assertClose(lot.currentPrice, 100.5, 1e-12, 'O-05 keeps the canonical current price');
    assertClose(lot.marketValue, 124.017, 1e-9, 'O-05 derives the expected market value');
    assertClose(lot.costBasis, 124.017, 1e-9, 'O-05 derives a consistent cost basis');
}

console.log('Test 3: ambiguous legacy strings fail at the canonical tranche boundary');
{
    let error = null;
    try {
        initializePortfolioDetailed({
            tagesgeld: 0,
            detailledTranches: [detailedLot({ shares: '1.234' })]
        });
    } catch (caught) {
        error = caught;
    }
    assert(error instanceof SimulatorPortfolioInputError,
        'String-valued tranche number must raise a structured portfolio input error');
    assertEqual(error?.code, 'SIMULATOR_PORTFOLIO_NUMBER_INVALID',
        'Ambiguous tranche string exposes a stable validation code');
    assertEqual(error?.fieldId, 'shares', 'Ambiguous tranche string identifies its field');

    const missingOptionalFields = initializePortfolioDetailed({
        tagesgeld: 0,
        detailledTranches: [detailedLot({
            marketValue: undefined,
            costBasis: undefined
        })]
    });
    assertClose(missingOptionalFields.depotTranchesAktien[0].marketValue, 124.017, 1e-9,
        'Explicit undefined remains missing and derives the market value');
}

console.log('Test 4: strategy reader preserves zero and decimal values');
{
    const doc = createDocumentMock({
        liquidityRunwayYears: '1',
        goldAllokationAktiv: 'true',
        rebalancingBand: '2.5',
        maxSkimPctOfEq: '0',
        maxBearRefillPctOfEq: '0'
    });
    const inputs = readStrategyInputs(doc);
    const portfolioInputs = readBasePortfolioInputs(doc);
    assertEqual(inputs.liquidityRunwayYears, 1, 'Canonical one-year runway remains unchanged');
    assertClose(portfolioInputs.rebalancingBand, 2.5, 1e-12, 'Decimal Gold rebalancing band is not truncated');
    assertEqual(inputs.maxSkimPctOfEq, 0, 'maxSkimPctOfEq=0 remains disabled');
    assertEqual(inputs.maxBearRefillPctOfEq, 0, 'maxBearRefillPctOfEq=0 remains disabled');

    const defaultDoc = createDocumentMock();
    const defaults = readStrategyInputs(defaultDoc);
    const portfolioDefaults = readBasePortfolioInputs(defaultDoc);
    assertEqual(defaults.liquidityRunwayYears, 5, 'Missing runway uses its documented default');
    assertEqual(portfolioDefaults.rebalancingBand, 25, 'Missing Gold rebalancing band uses its documented default');
    assertEqual(defaults.maxSkimPctOfEq, 10, 'Missing maxSkimPctOfEq uses its documented default');
    assertEqual(defaults.maxBearRefillPctOfEq, 5,
        'Missing maxBearRefillPctOfEq uses its documented default');

    const invalidDoc = createDocumentMock({
        liquidityRunwayYears: '12abc',
        goldAllokationAktiv: 'true',
        rebalancingBand: 'Infinity',
        maxSkimPctOfEq: '',
        maxBearRefillPctOfEq: 'not-a-number'
    });
    const invalid = readStrategyInputs(invalidDoc);
    const invalidPortfolio = readBasePortfolioInputs(invalidDoc);
    assertEqual(invalid.liquidityRunwayYears, 5, 'Invalid runway uses the documented default');
    assert(Number.isNaN(invalidPortfolio.rebalancingBand), 'Non-finite active Gold band must remain invalid for fail-closed validation');
    assertEqual(invalid.maxSkimPctOfEq, 10, 'Empty maxSkim uses the documented missing default');
    assertEqual(invalid.maxBearRefillPctOfEq, 5, 'Invalid maxBear uses the documented default');
}

console.log('Test 5: canonical runway and Gold-band boundaries are visible in the engine contract');
{
    const result = InputValidator.validate({
        floorBedarf: 0,
        flexBedarf: 0,
        liquidityRunwayYears: 0.5,
        rebalancingBand: 0,
        maxSkimPctOfEq: 0,
        maxBearRefillPctOfEq: 0
    });
    assert(result.errors.some(error => error.fieldId === 'liquidityRunwayYears'),
        'Engine validation visibly rejects runway below one year');
    assert(!result.errors.some(error => error.fieldId === 'rebalancingBand'),
        'Engine validation accepts a zero Gold rebalancing band');
    assert(!result.errors.some(error => error.fieldId === 'maxSkimPctOfEq'),
        'Engine validation accepts maxSkimPctOfEq=0');
    assert(!result.errors.some(error => error.fieldId === 'maxBearRefillPctOfEq'),
        'Engine validation accepts maxBearRefillPctOfEq=0');
}

console.log('Test 6: Simulator HTML exposes the existing engine bounds');
{
    const html = fs.readFileSync(new URL('../Simulator.html', import.meta.url), 'utf8');
    const inputTag = id => {
        const match = html.match(new RegExp(`<input[^>]*id="${id}"[^>]*>`, 'i'));
        assert(match, `${id} input exists in Simulator.html`);
        return match[0];
    };
    const attribute = (tag, name) => {
        const match = tag.match(new RegExp(`${name}="([^"]+)"`, 'i'));
        return match?.[1] ?? null;
    };

    const runway = inputTag('liquidityRunwayYears');
    const goldBand = inputTag('rebalancingBand');
    const maxSkim = inputTag('maxSkimPctOfEq');
    const maxBear = inputTag('maxBearRefillPctOfEq');
    assertEqual(attribute(runway, 'min'), '1', 'Simulator runway minimum matches the engine');
    assertEqual(attribute(runway, 'max'), '10', 'Simulator runway maximum matches the engine');
    assertEqual(attribute(runway, 'step'), '0.5', 'Simulator runway step matches the engine');
    assertEqual(attribute(goldBand, 'min'), '0', 'Simulator Gold-band minimum matches the engine');
    assertEqual(attribute(goldBand, 'max'), '100', 'Simulator Gold-band maximum matches the engine');
    assertEqual(attribute(maxSkim, 'min'), '0', 'Simulator maxSkim minimum preserves the zero boundary');
    assertEqual(attribute(maxSkim, 'max'), '50', 'Simulator maxSkim maximum matches the engine');
    assertEqual(attribute(maxBear, 'min'), '0', 'Simulator maxBear minimum preserves the zero boundary');
    assertEqual(attribute(maxBear, 'max'), '70', 'Simulator maxBear maximum matches the engine');
}

console.log('Test 7: MC, Sweep and Optimizer share the canonical fractional-lot initialization');
{
    const derivedInputs = simulationInputs();
    const explicitInputs = simulationInputs({
        marketValue: 124.017,
        costBasis: 124.017
    });
    const monteCarloParams = {
        anzahl: 2,
        maxDauer: 1,
        blockSize: 2,
        seed: 1703,
        methode: 'block',
        rngMode: 'per-run-seed'
    };
    const [derivedMc, explicitMc] = await Promise.all([
        runMonteCarloChunk({
            inputs: derivedInputs,
            monteCarloParams,
            widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
            useCapeSampling: false,
            runRange: { start: 0, count: 2 },
            engine: EngineAPI
        }),
        runMonteCarloChunk({
            inputs: explicitInputs,
            monteCarloParams,
            widowOptions: { mode: 'stop', percent: 0, marriageOffsetYears: 0, minMarriageYears: 0 },
            useCapeSampling: false,
            runRange: { start: 0, count: 2 },
            engine: EngineAPI
        })
    ]);
    assertEqual(JSON.stringify(derivedMc), JSON.stringify(explicitMc),
        'Monte Carlo treats derived and explicit O-05 lot values identically');

    const params = {
        liquidityRunwayYears: 5,
        goldRebalancingBand: 25,
        maxSkimPct: 10,
        maxBearRefillPct: 5,
        goldTargetPct: 0
    };
    const sweepConfig = {
        anzahlRuns: 2,
        maxDauer: 1,
        blockSize: 2,
        baseSeed: 1703,
        methode: 'block',
        rngMode: 'per-run-seed'
    };
    const derivedSweep = runSweepChunk({
        baseInputs: derivedInputs,
        paramCombinations: [params],
        comboRange: { start: 0, count: 1 },
        sweepConfig,
        engine: EngineAPI
    });
    const explicitSweep = runSweepChunk({
        baseInputs: explicitInputs,
        paramCombinations: [params],
        comboRange: { start: 0, count: 1 },
        sweepConfig,
        engine: EngineAPI
    });
    assertEqual(JSON.stringify(derivedSweep), JSON.stringify(explicitSweep),
        'Sweep treats derived and explicit O-05 lot values identically');

    const previousDocument = global.document;
    const previousWindow = global.window;
    try {
        global.document = { getElementById: () => null };
        global.window = { EngineAPI };
        const [derivedOptimizer, explicitOptimizer] = await Promise.all([
            evaluateCandidate({}, derivedInputs, 2, 1, [1703]),
            evaluateCandidate({}, explicitInputs, 2, 1, [1703])
        ]);
        assertEqual(JSON.stringify(derivedOptimizer), JSON.stringify(explicitOptimizer),
            'Optimizer treats derived and explicit O-05 lot values identically');
    } finally {
        if (previousDocument === undefined) delete global.document;
        else global.document = previousDocument;
        if (previousWindow === undefined) delete global.window;
        else global.window = previousWindow;
    }
}

console.log('✅ Canonical number boundary tests passed');
