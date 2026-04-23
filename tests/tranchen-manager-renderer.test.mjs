"use strict";

import {
    buildEmptyTranchenHtml,
    buildTranchenStatsHtml,
    buildTranchenTableHtml
} from '../app/tranches/tranchen-manager-renderer.js';

console.log('--- Tranchen Manager Renderer Tests ---');

console.log('Test 1: stats renderer returns summary html');
{
    const html = buildTranchenStatsHtml([
        { marketValue: 1200, costBasis: 1000 },
        { marketValue: 800, costBasis: 900 }
    ]);
    assert(html.includes('Gesamtwert'), 'Stats html should include labels');
    assert(html.includes('2.000,00'), 'Stats html should include formatted total value');
    assert(html.includes('Anzahl Tranchen'), 'Stats html should include tranche count');
}
console.log('✓ stats renderer returns summary html OK');

console.log('Test 2: empty table renderer returns empty state');
{
    const html = buildEmptyTranchenHtml();
    assert(html.includes('Keine Tranchen vorhanden'), 'Empty html should include empty state');
}
console.log('✓ empty table renderer returns empty state OK');

console.log('Test 3: table renderer returns action markup');
{
    const html = buildTranchenTableHtml([{
        trancheId: 't1',
        purchaseDate: '2024-01-01',
        name: 'ETF',
        isin: 'DE000123',
        ticker: 'VWCE',
        shares: 10,
        purchasePrice: 100,
        currentPrice: 120,
        costBasis: 1000,
        marketValue: 1200,
        tqf: 0.3,
        type: 'aktien_neu'
    }]);
    assert(html.includes('data-action="edit-tranche"'), 'Table html should include edit action hooks');
    assert(html.includes('ETF'), 'Table html should include tranche name');
    assert(html.includes('1.200,00'), 'Table html should include formatted market value');
}
console.log('✓ table renderer returns action markup OK');
