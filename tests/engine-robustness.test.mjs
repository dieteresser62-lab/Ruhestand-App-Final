import { EngineAPI } from '../engine/index.mjs';
import { ValidationError } from '../engine/errors.mjs';

console.log('--- Engine Robustness Tests ---');

// Base-Input für Robustheitschecks: valide, komplett, mit Markt- und Steuerdaten.
const baseInput = {
    depotwertAlt: 500000,
    depotwertNeu: 0,
    goldWert: 0,
    tagesgeld: 50000,
    geldmarktEtf: 0,
    inflation: 2.0,
    renteMonatlich: 0,
    floorBedarf: 24000,
    flexBedarf: 12000,
    startAlter: 35,
    aktuellesAlter: 35,
    goldAktiv: false,
    risikoprofil: 'sicherheits-dynamisch',
    goldFloorProzent: 0,
    runwayTargetMonths: 36,
    runwayMinMonths: 24,
    renteAktiv: false,
    marketCapeRatio: 20,
    targetEq: 60,
    rebalBand: 5,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 20,
    endeVJ: 100,
    endeVJ_1: 90,
    endeVJ_2: 95,
    endeVJ_3: 92,
    ath: 105,
    jahreSeitAth: 1,
    costBasisAlt: 300000,
    costBasisNeu: 0,
    goldCost: 0,
    sparerPauschbetrag: 1000
};

function assertFiniteNumber(value, label) {
    assert(Number.isFinite(value), `${label} should be finite`);
}

// --- TEST 1: Zero Inflation ---
{
    const input = { ...baseInput, inflation: 0 };
    const result = EngineAPI.simulateSingleYear(input, null);
    // Zero-Inflation darf nicht als "invalid" gelten.
    assert(!result.error, 'Zero inflation should not cause validation error');
    assert(result.ui && result.ui.spending, 'Should return spending result');
    assertFiniteNumber(result.ui.spending.monatlicheEntnahme, 'monatlicheEntnahme');
}

// --- TEST 2: High (but valid) Inflation ---
{
    const input = { ...baseInput, inflation: 50 };
    const result = EngineAPI.simulateSingleYear(input, null);
    // Grenze laut Validator: bis 50% erlaubt.
    assert(!result.error, 'High inflation within bounds should be accepted');
    assertFiniteNumber(result.ui.spending.monatlicheEntnahme, 'monatlicheEntnahme');
}

// --- TEST 3: Extreme Market Jump (100% yearly performance) ---
{
    const input = { ...baseInput, endeVJ: 200, endeVJ_1: 100, ath: 220, jahreSeitAth: 0 };
    const result = EngineAPI.simulateSingleYear(input, null);
    // Extremes Kursplus sollte die Engine nicht destabilisieren.
    assert(!result.error, 'Extreme market jump should not crash');
    assertFiniteNumber(result.newState.lastTotalBudget, 'lastTotalBudget');
}

// --- TEST 3b: Zero Market Return (0% yearly performance) ---
{
    const input = { ...baseInput, endeVJ: 100, endeVJ_1: 100, ath: 105, jahreSeitAth: 1 };
    const result = EngineAPI.simulateSingleYear(input, null);
    assert(!result.error, 'Zero market return should not crash');
    assertFiniteNumber(result.ui.spending.monatlicheEntnahme, 'monatlicheEntnahme');
}

// --- TEST 4: Negative Assets -> Validation Error (no crash) ---
{
    // Validierungsfehler sollen sauber zurückgegeben werden (ohne Crash/Throw).
    const originalError = console.error;
    console.error = () => {};
    try {
        const input = { ...baseInput, tagesgeld: -10 };
        const result = EngineAPI.simulateSingleYear(input, null);
        assert(result.error instanceof ValidationError, 'Negative assets should return ValidationError');
    } finally {
        console.error = originalError;
    }
}

// --- TEST 5: Out-of-range Age -> Validation Error (no crash) ---
{
    const originalError = console.error;
    console.error = () => {};
    try {
        const input = { ...baseInput, aktuellesAlter: 5 };
        const result = EngineAPI.simulateSingleYear(input, null);
        assert(result.error instanceof ValidationError, 'Out-of-range age should return ValidationError');
    } finally {
        console.error = originalError;
    }
}

// --- TEST 6: Out-of-range Inflation -> Validation Error (no crash) ---
{
    const originalError = console.error;
    console.error = () => {};
    try {
        const input = { ...baseInput, inflation: 100 };
        const result = EngineAPI.simulateSingleYear(input, null);
        assert(result.error instanceof ValidationError, 'Out-of-range inflation should return ValidationError');
    } finally {
        console.error = originalError;
    }
}

// --- TEST 7: Negative values (assets + spending) ---
{
    const originalError = console.error;
    console.error = () => {};
    try {
        const input = { ...baseInput, depotwertAlt: -1000, tagesgeld: -500, floorBedarf: -2000, flexBedarf: -500 };
        const result = EngineAPI.simulateSingleYear(input, null);
        assert(result.error instanceof ValidationError, 'Negative assets/spending should return ValidationError');
    } finally {
        console.error = originalError;
    }
}

// --- TEST 8: NaN/Infinity inputs ---
{
    const originalError = console.error;
    console.error = () => {};
    try {
        const input = { ...baseInput, tagesgeld: NaN, geldmarktEtf: Infinity };
        const result = EngineAPI.simulateSingleYear(input, null);
        const hasValidationError = result?.error instanceof ValidationError;
        // Ergebnis darf Fehler liefern, aber nicht crashen.
        assert(hasValidationError || !result?.error, 'NaN/Infinity inputs should not crash');
        if (!result?.error) {
            assertFiniteNumber(result.ui?.spending?.monatlicheEntnahme, 'monatlicheEntnahme (NaN/Infinity)');
        }
    } finally {
        console.error = originalError;
    }
}

// --- TEST 9: Extreme high values (>100M) ---
{
    const input = {
        ...baseInput,
        depotwertAlt: 150_000_000,
        depotwertNeu: 25_000_000,
        tagesgeld: 10_000_000,
        geldmarktEtf: 5_000_000,
        floorBedarf: 240_000,
        flexBedarf: 120_000
    };
    const result = EngineAPI.simulateSingleYear(input, null);
    assert(!result.error, 'Extreme high values should not crash');
    assertFiniteNumber(result.ui?.spending?.monatlicheEntnahme, 'monatlicheEntnahme (high values)');
}

// --- TEST 10: Empty portfolio (all zero) ---
{
    const input = {
        ...baseInput,
        depotwertAlt: 0,
        depotwertNeu: 0,
        goldWert: 0,
        tagesgeld: 0,
        geldmarktEtf: 0
    };
    const result = EngineAPI.simulateSingleYear(input, null);
    // Leeres Portfolio: keine Entnahme, aber sauberer Return.
    assert(!result.error, 'Empty portfolio should not crash');
    assertFiniteNumber(result.ui?.spending?.monatlicheEntnahme, 'monatlicheEntnahme (empty portfolio)');
}

// --- TEST 11: Missing required fields ---
{
    const originalError = console.error;
    console.error = () => {};
    try {
        const input = { ...baseInput };
        delete input.startAlter;
        delete input.aktuellesAlter;
        delete input.floorBedarf;
        const result = EngineAPI.simulateSingleYear(input, null);
        const hasValidationError = result?.error instanceof ValidationError;
        // Fehlende Pflichtfelder dürfen zu ValidationError führen, aber nicht crashen.
        assert(hasValidationError || !result?.error, 'Missing required fields should not crash');
        assert(result, 'Missing required fields should return a result object');
    } finally {
        console.error = originalError;
    }
}

// --- TEST 12: Division by zero (totalWealth = 0) ---
{
    const input = {
        ...baseInput,
        depotwertAlt: 0,
        depotwertNeu: 0,
        goldWert: 0,
        tagesgeld: 0,
        geldmarktEtf: 0,
        floorBedarf: 0,
        flexBedarf: 0
    };
    const result = EngineAPI.simulateSingleYear(input, null);
    assert(!result.error, 'Total wealth = 0 should not crash');
    assertFiniteNumber(result.ui?.spending?.monatlicheEntnahme, 'monatlicheEntnahme (zero wealth)');
}

// --- TEST 13: Age > 120 years ---
{
    const originalError = console.error;
    console.error = () => {};
    try {
        const input = { ...baseInput, aktuellesAlter: 130 };
        const result = EngineAPI.simulateSingleYear(input, null);
        assert(result.error instanceof ValidationError, 'Age > 120 should return ValidationError');
    } finally {
        console.error = originalError;
    }
}

console.log('--- Engine Robustness Tests Completed ---');
