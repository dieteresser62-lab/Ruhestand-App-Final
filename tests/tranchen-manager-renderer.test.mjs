"use strict";

import {
    buildEmptyTranchenHtml,
    buildReconciliationCashStatusesHtml,
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

console.log('Test 6: cash-status renderer distinguishes pending, corrected and legacy evidence safely');
{
    const html = buildReconciliationCashStatusesHtml([
        {
            targetActionId: 'sale-<unsafe>',
            cashStatus: 'pending_manual_posting',
            statusLabel: 'Offen – manuell nachführen',
            confirmedNetProceedsEur: 500,
            cashBalanceAfterPostingEur: null,
            effectiveActionId: null,
            correctionRevision: 0,
            isPending: true,
            isLegacy: false,
            canConfirm: true,
            canCorrect: false
        },
        {
            targetActionId: 'sale-2',
            cashStatus: 'confirmed_corrected',
            statusLabel: 'Cash bestätigt – korrigiert',
            confirmedNetProceedsEur: 95,
            cashBalanceAfterPostingEur: 10090,
            effectiveActionId: 'cash-correction:v1:sale-2:1',
            correctionRevision: 1,
            correctionReason: 'Zahlendreher',
            isPending: false,
            isLegacy: false,
            canConfirm: false,
            canCorrect: true
        },
        {
            targetActionId: 'legacy-sale',
            cashStatus: 'legacy_unknown',
            statusLabel: 'Abgeschlossen (Altfall – Cashstatus nicht dokumentiert)',
            confirmedNetProceedsEur: 42,
            cashBalanceAfterPostingEur: null,
            effectiveActionId: null,
            correctionRevision: 0,
            isPending: false,
            isLegacy: true,
            canConfirm: true,
            canCorrect: false
        }
    ]);
    assert(html.includes('1 Verkauf/Verkäufe mit offener manueller Cashbuchung'),
        'Renderer should count only true pending sales');
    assert(html.includes('data-cash-action="confirm"') && html.includes('data-cash-action="correct"'),
        'Renderer should expose explicit append-only workflow actions');
    assert(html.includes('Revision 1') && html.includes('10.090,00'),
        'Renderer should show only the effective corrected balance and revision');
    assert(html.includes('Altfall – Cashstatus nicht dokumentiert'),
        'Renderer should keep legacy evidence distinct from confirmed cash');
    assert(html.includes('1 Altverkauf/Altverkäufe ohne dokumentierten Cashstatus')
        && html.includes('nicht als cashbestätigt'),
    'Renderer summary must disclose legacy sales instead of implying confirmed cash');
    assert(!html.includes('sale-<unsafe>') && html.includes('sale-&lt;unsafe&gt;'),
        'Cash target ids must be HTML-escaped in text and attributes');

    const errorHtml = buildReconciliationCashStatusesHtml([], {
        errorMessage: 'Audit <nicht lesbar>'
    });
    assert(errorHtml.includes('Cashstatus-Audit nicht lesbar – die Liste ist unvollständig'),
        'Unreadable audit should render a dedicated incomplete-list state');
    assert(!errorHtml.includes('Noch keine dokumentierten Realverkäufe'),
        'Unreadable audit must never masquerade as an empty history');
    assert(errorHtml.includes('Audit &lt;nicht lesbar&gt;') && !errorHtml.includes('Audit <nicht lesbar>'),
        'Audit error details must be HTML-escaped');
}
console.log('✓ cash-status rendering contract OK');
