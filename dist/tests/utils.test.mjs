
import {
    formatCurrencyShortLog,
    shortenText,
    mean, stdDev, quantile,
    rng,
    parseRangeInput,
    cartesianProduct
} from '../simulator-utils.js';

console.log('--- Utilities Tests ---');

// --- TEST 1: Formatting ---
{
    // formatCurrencyShortLog
    assert(formatCurrencyShortLog(0) === '0 €', '0 formatting');
    assert(formatCurrencyShortLog(5000) === '5k €', '5k formatting');
    assert(formatCurrencyShortLog(-12000) === '-12k €', '-12k formatting');
    const f99 = formatCurrencyShortLog(999);
    assert(f99.includes('999') && f99.includes('€'), '<1k formatting');

    // shortenText
    assert(shortenText('Markt heiß gelaufen') === 'HEISS', 'Text shortening');
    assert(shortenText('Unbekannt (Stagflation)') === 'Unbekannt (S)', 'Stagflation shortening');

    console.log('✅ Formatting Utils Passed');
}

// --- TEST 2: Math Utils ---
{
    const data = [1, 2, 3, 4, 5];
    assert(mean(data) === 3, 'Mean check');
    assertClose(stdDev(data), 1.581, 0.001, 'StdDev check');

    const unsorted = [5, 1, 4, 3, 2];
    assert(quantile(unsorted, 0.5) === 3, 'Median (Quantile 0.5) check');
    assert(quantile(unsorted, 0) === 1, 'Min (Quantile 0) check');
    assert(quantile(unsorted, 1) === 5, 'Max (Quantile 1) check');

    console.log('✅ Math Utils Passed');
}

// --- TEST 3: RNG (Seeding & Forking) ---
{
    const seed = 12345;
    const rng1 = rng(seed);
    const rng2 = rng(seed);

    const val1 = rng1();
    const val2 = rng2();
    assert(val1 === val2, 'Same seed -> Same first value');

    const rngFork = rng1.fork('test');
    assert(typeof rngFork() === 'number', 'Forked RNG works');

    console.log('✅ RNG Utils Passed');
}

// --- TEST 4: Range Parsing ---
{
    // Format "start:step:end"
    const r1 = parseRangeInput("10:5:20");
    assert(JSON.stringify(r1) === JSON.stringify([10, 15, 20]), 'Range start:step:end');

    // Format "a,b,c"
    const r2 = parseRangeInput("10, 15, 20");
    assert(JSON.stringify(r2) === JSON.stringify([10, 15, 20]), 'Comma separated list');

    // Format "x"
    const r3 = parseRangeInput("42");
    assert(JSON.stringify(r3) === JSON.stringify([42]), 'Single value');

    console.log('✅ Range Parsing Passed');
}

// --- TEST 5: Cartesian Product ---
{
    const params = {
        a: [1, 2],
        b: ['x', 'y']
    };
    const combos = cartesianProduct(params);
    assert(combos.length === 4, '2x2 should produce 4 combos');
    // Check one
    const hasA1Bx = combos.some(c => c.a === 1 && c.b === 'x');
    assert(hasA1Bx, 'Combos contain {a:1, b:x}');

    console.log('✅ Cartesian Product Passed');
}

console.log('--- Utilities Tests Completed ---');
