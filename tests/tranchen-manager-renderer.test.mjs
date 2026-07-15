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

console.log('Test 4: classification, signs and accessibility are unambiguous');
{
    const html = buildTranchenTableHtml([{
        trancheId: 'gold-1',
        purchaseDate: '2025-01-01',
        name: 'Gold Reserve',
        isin: '',
        ticker: 'GOLD',
        shares: 2,
        purchasePrice: 100,
        currentPrice: 90,
        costBasis: 200,
        marketValue: 180,
        tqf: 1,
        category: 'gold',
        type: 'gold'
    }]);
    assert(html.includes('Gold-ETC'), 'Gold should be rendered as gold type');
    assert(!html.includes('>Geldmarkt</span>'), 'Gold should not be labelled as money market');
    assert(html.includes('-10.00 %'), 'Negative return should contain one leading minus sign');
    assert(!html.includes('+-'), 'Negative values must never contain plus-minus output');
    assert(html.includes('aria-label="Tranche Gold Reserve bearbeiten"'), 'Edit icon should have an accessible name');
    assert(html.includes('aria-label="Tranche Gold Reserve löschen"'), 'Delete icon should have an accessible name');
    assert(html.includes('class="table-scroll"'), 'Table should render inside its dedicated scroll container');
}
console.log('✓ classification and accessible actions OK');

console.log('Test 5: empty state does not claim FIFO activity');
{
    const html = buildEmptyTranchenHtml();
    assert(!html.includes('FIFO aktiv'), 'Empty state must not report FIFO as active');
}
console.log('✓ empty FIFO semantics OK');
