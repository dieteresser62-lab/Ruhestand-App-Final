import { buildKeyParams } from '../app/balance/balance-diagnosis-keyparams.js';

console.log('--- Balance Diagnosis KeyParams Tests ---');

function setupDom() {
    if (typeof document !== 'undefined') return;
    class Node {
        constructor(tag) {
            this.tagName = tag;
            this.children = [];
            this.className = '';
            this.dataset = {};
            this.textContent = '';
        }
        append(...nodes) {
            nodes.forEach(n => {
                if (n) this.children.push(n);
            });
        }
    }
    global.document = {
        createElement: (tag) => new Node(tag)
    };
}

function flattenText(node) {
    if (!node) return '';
    let out = node.textContent || '';
    const kids = Array.isArray(node.children) ? node.children : [];
    kids.forEach(k => {
        out += flattenText(k);
    });
    return out;
}

function findCardByLabel(grid, labelText) {
    const cards = Array.isArray(grid?.children) ? grid.children : [];
    return cards.find(card => {
        const children = Array.isArray(card?.children) ? card.children : [];
        const labelNode = children.find(ch => ch?.className === 'label');
        return labelNode?.textContent === labelText;
    }) || null;
}

setupDom();

{
    const grid = buildKeyParams({
        peakRealVermoegen: 1000000,
        currentRealVermoegen: 950000,
        cumulativeInflationFactor: 1.25,
        jahresentnahme: 48000,
        minimumFlexAnnual: 10000,
        minimumFlexStatus: 'applied',
        minimumFlexRequiredRate: 50,
        minimumFlexEffectiveBefore: 4000,
        minimumFlexEffectiveAfter: 10000,
        runwayTargetSmoothing: {
            smoothingActive: true,
            smoothingApplied: true,
            rawTargetMonths: 60,
            targetMonths: 48,
            lowerTargetMonths: 36,
            upperTargetMonths: 60,
            severity: 0.5,
            severityPct: 50,
            hardMinimumMonths: 24
        },
        vpw: {
            enabled: true,
            status: 'active',
            horizonMethod: 'survival_quantile',
            horizonYears: 24,
            survivalQuantile: 0.9,
            vpwRate: 0.052,
            expectedRealReturn: 0.031,
            expectedReturnCape: 0.071,
            capeRatioUsed: 28.4,
            goGoActive: false,
            goGoMultiplier: 1.0,
            gesamtwert: 2150000,
            vpwTotal: 112000,
            staticFlexBaseline: 42000,
            dynamicFlex: 86000
        },
        healthBucket: {
            enabled: true,
            lockedAmount: 150000,
            operativeLiquidity: 40000,
            targetCoveragePct: 75,
            targetGap: 50000
        },
        marketDataProvenance: {
            schemaVersion: 1,
            periodId: 'calendar-year:2025',
            asOf: '2025-12-30',
            instrument: 'VWCE.DE',
            source: 'Manuelle CSV: markt-2025.csv',
            highScope: 'windowHigh',
            engineReference: {
                policy: 'window_high_as_conservative_ath_lower_bound',
                applied: true
            }
        }
    });
    const txt = flattenText(grid);
    assert(txt.includes('Dynamic Flex (VPW)'), 'VPW status metric should be rendered');
    assert(txt.includes('VPW-Rate'), 'VPW rate metric should be rendered');
    assert(txt.includes('ER(real)'), 'ER(real) metric should be rendered');
    assert(txt.includes('ER(CAPE)'), 'ER(CAPE) metric should be rendered');
    assert(txt.includes('Go-Go-Phase'), 'Go-Go metric should be rendered');
    assert(txt.includes('VPW-Basisvermögen'), 'VPW basis wealth metric should be rendered');
    assert(txt.includes('VPW-Rahmen'), 'VPW frame metric should be rendered');
    assert(txt.includes('Statischer Flex-Bedarf'), 'Static flex baseline should be rendered');
    assert(txt.includes('Flex freigegeben'), 'Released flex metric should be rendered');
    assert(txt.includes('Nicht genutzter Rahmen'), 'Unused VPW room should be rendered');
    assert(txt.includes('Mindest-Flex p.a.'), 'Minimum flex metric should be rendered');
    assert(txt.includes('Runway-Ziel'), 'Runway target smoothing metric should be rendered');
    assert(txt.includes('50% Drawdown-Severity'), 'Runway target smoothing severity should be visible');
    assert(txt.includes('Harte Mindestgrenze'), 'Runway target smoothing hard minimum should be visible');
    assert(txt.includes('Mindest-Flex Rate'), 'Minimum flex required rate should be rendered');
    assert(txt.includes('Mindest-Flex Effekt'), 'Minimum flex effect should be rendered');
    assert(txt.includes('Pflegebucket'), 'Health bucket metric should be rendered');
    assert(txt.includes('Pflegebucket-Zieldeckung'), 'Health bucket target coverage should be rendered');
    assert(txt.includes('keine automatische Freigabe'), 'Health bucket policy should be visible');
    assert(txt.includes('Marktdaten-Provenienz'), 'Persistierte Marktdaten-Provenienz should be rendered');
    assert(txt.includes('VWCE.DE · 2025-12-30'), 'Marktdaten-Provenienz should expose instrument and as-of');
    assert(txt.includes('calendar-year:2025'), 'Marktdaten-Provenienz should expose its exact period');
    assert(txt.includes('Hoch-Scope windowHigh'), 'Diagnosis should not mislabel a manual window high as ATH');
    assert(txt.includes('Engine-Referenz konservative ATH-Untergrenze angewendet'),
        'Diagnosis should expose the conservative engine reference explicitly');
}

{
    const grid = buildKeyParams({
        vpw: {
            enabled: true,
            status: 'active',
            horizonMethod: 'survival_quantile',
            horizonYears: 10,
            survivalQuantile: 0.9,
            vpwRate: 0.085,
            expectedRealReturn: -0.01,
            goGoActive: false,
            goGoMultiplier: 1.0
        }
    });

    const rateCard = findCardByLabel(grid, 'VPW-Rate');
    const horizonCard = findCardByLabel(grid, 'VPW-Horizont');
    const realCard = findCardByLabel(grid, 'ER(real)');
    assert(rateCard?.dataset?.trend === 'down', 'High VPW rate should be marked as warning trend');
    assert(horizonCard?.dataset?.trend === 'down', 'Very short horizon should be marked as warning trend');
    assert(realCard?.dataset?.trend === 'down', 'Negative ER(real) should be marked as warning trend');
    const txt = flattenText(grid);
    assert(txt.includes('Warnsignal'), 'Warning hint text should be visible');
}

{
    const grid = buildKeyParams({
        minimumFlexAnnual: 10000,
        minimumFlexStatus: 'blocked_emergency',
        minimumFlexBlockReason: 'minimum_runway_not_restorable',
        minimumFlexRequiredRate: 50,
        minimumFlexEffectiveBefore: 4000,
        minimumFlexEffectiveAfter: 4000
    });
    const card = findCardByLabel(grid, 'Mindest-Flex p.a.');
    const txt = flattenText(grid);
    assert(card?.dataset?.trend === 'down', 'Blocked minimum flex should be marked as warning trend');
    assert(txt.includes('Mindest-Runway nicht wiederherstellbar'), 'Minimum flex block reason should be visible');
}

{
    const grid = buildKeyParams({
        aktuelleFlexRate: 0,
        safetyCapActive: true,
        safetyCapFlexRatePct: 0,
        safetyCapRawCandidateFlexRatePct: 0,
        safetyCapSource: 'severe_bear_wealth_emergency',
        safetyCapAnchorStage: 'post_total_wealth_drawdown_gate',
        safetyCapApplied: true,
        finalLimitingPolicy: 'safety_cap',
        severeFlexEmergencyActive: true,
        realTotalWealthDrawdownRatio: 0.2501,
        realTotalWealthDrawdownThresholdRatio: 0.25,
        protectedPortfolioWithdrawalRate: 0.035,
        protectedPortfolioWithdrawalRateThreshold: 0.035,
        protectedPortfolioWithdrawalCapacityCritical: true,
        alarmActiveDiagnostic: false,
        minimumFlexAnnual: 30000,
        minimumFlexStatus: 'overridden_by_severe_flex_emergency',
        minimumFlexEffectiveBefore: 12000,
        minimumFlexEffectiveAfter: 30000,
        minimumFlexApplicable: true,
        minimumFlexEffectiveFinal: 0,
        minimumFlexShortfallAnnual: 30000
    });
    const txt = flattenText(grid);
    const minimumCard = findCardByLabel(grid, 'Mindest-Flex p.a.');
    assert(txt.includes('Safety-Flex-Obergrenze'), 'Safety cap should be visible as its own metric');
    assert(txt.includes('Schwere Flex-Notlage'), 'Severe flex emergency should be visible');
    assert(txt.includes('aktiven Gesamtvermögens'), 'Emergency copy should name the total-wealth basis');
    assert(txt.includes('geschützte Portfolioentnahmequote'), 'Emergency copy should name the protected-withdrawal capacity gate');
    assert(txt.includes('Mindest-Flex bewusst überstimmt; Floor bleibt geschützt'), 'Emergency copy should separate flex from floor');
    assert(txt.includes('Alarm-Diagnose'), 'Suppressed alarm should remain a separate diagnostic');
    assert(minimumCard?.dataset?.trend === 'down', 'Overridden minimum flex should be marked as warning trend');
    assert(txt.includes('In schwerer Flex-Notlage bewusst überstimmt'), 'Minimum-flex override status should be human-readable');
}

console.log('✅ Balance diagnosis keyparams tests passed');
