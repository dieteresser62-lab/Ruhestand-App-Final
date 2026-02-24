import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { STRATEGY_OPTIONS } from '../types/strategy-options.js';
import { normalizeDecumulationMode } from '../app/simulator/simulator-main-3bucket.js';
import { buildSimulatorInputsFromProfileData } from '../app/simulator/simulator-profile-inputs.js';
import { _internal_calculateModel } from '../engine/core.mjs';

console.log('--- 3-Bucket Config Tests ---');

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const simulatorHtml = fs.readFileSync(path.join(__dirname, '..', 'Simulator.html'), 'utf8');

assertEqual(STRATEGY_OPTIONS.STANDARD, 'standard', 'STANDARD constant mismatch');
assertEqual(STRATEGY_OPTIONS.THREE_BUCKET_JILGE, '3_bucket_jilge', 'THREE_BUCKET_JILGE constant mismatch');

assertEqual(normalizeDecumulationMode('dynamic_flex'), STRATEGY_OPTIONS.STANDARD, 'legacy dynamic_flex should map to standard');
assertEqual(normalizeDecumulationMode('vpw'), STRATEGY_OPTIONS.STANDARD, 'legacy vpw should map to standard');
assertEqual(normalizeDecumulationMode('guardrails'), STRATEGY_OPTIONS.STANDARD, 'legacy guardrails should map to standard');
assertEqual(normalizeDecumulationMode('fixed_real'), STRATEGY_OPTIONS.STANDARD, 'legacy fixed_real should map to standard');
assertEqual(normalizeDecumulationMode('3_bucket_jilge'), STRATEGY_OPTIONS.THREE_BUCKET_JILGE, '3-bucket mode should be retained');

{
    const optionMatches = simulatorHtml.match(/<select[^>]*id="entnahmeStrategie"[^>]*>[\s\S]*?<\/select>/);
    assert(optionMatches && optionMatches.length === 1, 'entnahmeStrategie select missing in Simulator.html');
    const optionTags = optionMatches[0].match(/<option /g) || [];
    assertEqual(optionTags.length, 2, 'entnahmeStrategie must expose exactly 2 options');
}

{
    const profileData = {
        sim_entnahmeStrategie: '3_bucket_jilge',
        sim_bondTargetFactor: '5',
        sim_drawdownTrigger: '15',
        sim_bondRefillThreshold: '2.5',
        sim_p1StartAlter: '65',
        sim_p1Geschlecht: 'm',
        sim_startFloorBedarf: '24000',
        sim_startFlexBedarf: '6000'
    };
    const built = buildSimulatorInputsFromProfileData(profileData);
    assertEqual(built.decumulation.mode, STRATEGY_OPTIONS.THREE_BUCKET_JILGE, 'profile mapping should preserve 3-bucket mode');
    assertEqual(built.decumulation.bondTargetFactor, 5, 'profile mapping should read bondTargetFactor');
    assertEqual(built.decumulation.drawdownTrigger, 15, 'profile mapping should read drawdownTrigger as entered');
    assertEqual(built.decumulation.bondRefillThreshold, 2.5, 'profile mapping should read bondRefillThreshold');
}

{
    const input = {
        depotwertAlt: 100000,
        depotwertNeu: 100000,
        goldWert: 0,
        tagesgeld: 20000,
        geldmarktEtf: 0,
        inflation: 2,
        floorBedarf: 24000,
        flexBedarf: 6000,
        startAlter: 65,
        goldAktiv: false,
        risikoprofil: 'sicherheits-dynamisch',
        runwayTargetMonths: 36,
        runwayMinMonths: 24,
        renteAktiv: false,
        renteMonatlich: 0,
        marketCapeRatio: 25,
        decumulation: {
            mode: 'vpw',
            bondTargetFactor: 4,
            drawdownTrigger: 15
        }
    };
    const result = _internal_calculateModel(input, null);
    assertEqual(result.input.decumulation.mode, STRATEGY_OPTIONS.STANDARD, 'engine normalization should fallback legacy mode to standard');
    assertEqual(result.input.decumulation.drawdownTrigger, -15, 'engine normalization should enforce negative drawdown trigger');
}

console.log('✅ 3-Bucket config tests passed');
