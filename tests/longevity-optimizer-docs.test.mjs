import {
    AUTO_OPTIMIZE_PARAMETER_OPTIONS,
    AUTO_OPTIMIZE_PARAM_FORM_IDS,
    AUTO_OPTIMIZE_DYNAMIC_FLEX_PARAM_KEYS
} from '../app/simulator/auto-optimize-param-meta.js';
import { applyChampionToForm } from '../app/simulator/auto-optimize-apply.js';
import { SWEEP_ALLOWED_KEYS } from '../app/simulator/simulator-sweep-utils.js';
import { buildSweepInputs } from '../app/simulator/sweep-runner.js';

console.log('--- Longevity Optimizer/Docs Contract Tests ---');

const LONGEVITY_KEYS = [
    'longevityMode',
    'longevityQuantileShift',
    'longevityRelativePct',
    'longevityBufferYears'
];

// Test 1: Auto-Optimize does not expose Longevity as a selectable parameter in V1.
{
    const optionKeys = new Set(AUTO_OPTIMIZE_PARAMETER_OPTIONS.map(option => option.key));
    for (const key of LONGEVITY_KEYS) {
        assert(!optionKeys.has(key), `${key} should not be selectable in Auto-Optimize`);
        assert(!(key in AUTO_OPTIMIZE_PARAM_FORM_IDS), `${key} should not map to a form field`);
        assert(!AUTO_OPTIMIZE_DYNAMIC_FLEX_PARAM_KEYS.has(key), `${key} should not be a Dynamic-Flex optimizer key`);
    }
}

// Test 2: Applying an optimizer champion cannot overwrite Longevity form controls.
{
    const controls = {
        longevityBufferYears: {
            value: '2',
            dispatchEvent: () => {
                throw new Error('longevityBufferYears should not receive optimizer events');
            }
        },
        horizonYears: {
            value: '30',
            dispatchEvent: () => { }
        }
    };
    const doc = { getElementById: id => controls[id] || null };
    applyChampionToForm({
        championCfg: {
            horizonYears: 35,
            longevityBufferYears: 8
        },
        doc,
        EventCtor: class {
            constructor(type) {
                this.type = type;
            }
        }
    });
    assertEqual(controls.horizonYears.value, 35, 'optimizer should still apply regular Dynamic-Flex horizon');
    assertEqual(controls.longevityBufferYears.value, '2', 'optimizer should ignore longevityBufferYears');
}

// Test 3: Sweep variations inherit Longevity from base inputs but cannot override it per combination.
{
    for (const key of LONGEVITY_KEYS) {
        assert(!SWEEP_ALLOWED_KEYS.has(key), `${key} should not be sweep-whitelisted`);
    }

    const baseInputs = {
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        targetEq: 60,
        rebalBand: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5,
        horizonYears: 30,
        survivalQuantile: 0.85,
        goGoMultiplier: 1,
        longevityMode: 'buffer_years',
        longevityBufferYears: 2,
        longevityQuantileShift: 0.05,
        longevityRelativePct: 0.05
    };

    const result = buildSweepInputs(baseInputs, {
        runwayMin: 18,
        runwayTarget: 30,
        targetEq: 70,
        rebalBand: 6,
        maxSkimPct: 12,
        maxBearRefillPct: 8,
        horizonYears: 35,
        survivalQuantile: 0.9,
        goGoMultiplier: 1.1,
        longevityMode: 'none',
        longevityBufferYears: 8,
        longevityQuantileShift: 0,
        longevityRelativePct: 0
    });

    assertEqual(result.runwayMinMonths, 18, 'regular sweep override should still apply');
    assertEqual(result.horizonYears, 35, 'regular Dynamic-Flex sweep override should still apply');
    assertEqual(result.longevityMode, 'buffer_years', 'sweep should inherit base longevityMode');
    assertEqual(result.longevityBufferYears, 2, 'sweep should not override longevityBufferYears');
    assertClose(result.longevityQuantileShift, 0.05, 1e-12, 'sweep should not override longevityQuantileShift');
    assertClose(result.longevityRelativePct, 0.05, 1e-12, 'sweep should not override longevityRelativePct');
}

console.log('--- Longevity Optimizer/Docs Contract Tests Completed ---');
