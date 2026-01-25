import { formatCurrency, calculateTotals, renderSummary } from '../balance-renderer-summary.js';

console.log('--- Balance Renderer Summary Tests ---');

// --- TEST 1: formatCurrency ---
{
    const formatted = formatCurrency(1234.56);
    assert(formatted.includes('€'), 'formatCurrency should include euro symbol');
}

// --- TEST 2: calculateTotals ---
{
    const totals = calculateTotals({
        depotwertGesamt: 1000,
        neuerBedarf: 2000,
        minGold: 300,
        zielLiquiditaet: 400
    });
    assertEqual(totals.depotwertGesamt, 1000, 'depotwertGesamt should be preserved');
    assertEqual(totals.neuerBedarf, 2000, 'neuerBedarf should be preserved');
    assertEqual(totals.minGold, 300, 'minGold should be preserved');
    assertEqual(totals.zielLiquiditaet, 400, 'zielLiquiditaet should be preserved');
}

// --- TEST 3: renderSummary updates DOM ---
{
    const outputs = {
        depotwert: { textContent: '' },
        neuerBedarf: { textContent: '' },
        minGoldDisplay: { textContent: '' },
        zielLiquiditaet: { textContent: '' }
    };
    const totals = renderSummary(outputs, {
        depotwertGesamt: 1500,
        neuerBedarf: 2500,
        minGold: 100,
        zielLiquiditaet: 500
    });

    assert(outputs.depotwert.textContent.includes('€'), 'depotwert should be formatted');
    assert(outputs.neuerBedarf.textContent.includes('€'), 'neuerBedarf should be formatted');
    assert(outputs.minGoldDisplay.textContent.includes('€'), 'minGold should be formatted');
    assert(outputs.zielLiquiditaet.textContent.includes('€'), 'zielLiquiditaet should be formatted');
    assertEqual(totals.depotwertGesamt, 1500, 'renderSummary should return totals');
}

console.log('✅ Balance renderer summary tests passed');
console.log('--- Balance Renderer Summary Tests Completed ---');
