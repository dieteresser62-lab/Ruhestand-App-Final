/**
 * =============================================================================
 * BEISPIEL-KONFIGURATION FÜR DETAILLIERTE DEPOT-TRANCHEN
 * =============================================================================
 *
 * Diese Datei zeigt, wie Sie Ihre Depot-Positionen als detaillierte Tranchen
 * konfigurieren können. Kopieren Sie diese Struktur und passen Sie die Werte
 * an Ihre tatsächlichen Positionen an.
 *
 * WICHTIG: Tranchen werden nach Kaufdatum sortiert (FIFO-Prinzip)
 */

export const BEISPIEL_DEPOT_TRANCHEN = [
    // ==========================================================================
    // ALTBESTAND (vor 2018/2019 gekauft)
    // ==========================================================================
    {
        name: "SAP SE",
        isin: "DE0007164600",
        shares: 352,
        purchasePrice: 50, // Beispiel-Schätzwert, bitte anpassen
        purchaseDate: "2000-06-15", // Ungefähres Kaufdatum
        currentPrice: 0, // Wird automatisch aktualisiert oder manuell eingegeben
        category: "equity",
        type: "aktien_alt",
        tqf: 1.0, // 100% steuerfrei (Altbestand vor 2009)
        notes: "Altbestand, steuerfrei durch Spekulationsfrist"
    },
    {
        name: "UBS MSCI World DLAD",
        isin: "LU0340285161",
        shares: 1312,
        purchasePrice: 145.42,
        purchaseDate: "2015-03-01", // Bitte anpassen
        currentPrice: 322.67, // 145.42 * (1 + 1.2188) = 322.67
        category: "equity",
        type: "aktien_alt",
        tqf: 0.30, // 30% Teilfreistellung für Aktienfonds
        notes: "Gewinn seit Kauf: 121,88%"
    },
    {
        name: "Vanguard FTSE All-World U.ETF DLD",
        isin: "IE00B3RBWM25",
        shares: 3304,
        purchasePrice: 72.36,
        purchaseDate: "2016-09-15", // Bitte anpassen
        currentPrice: 145.34, // 72.36 * (1 + 1.0094) = 145.34
        category: "equity",
        type: "aktien_alt",
        tqf: 0.30,
        notes: "Gewinn seit Kauf: 100,94%"
    },
    {
        name: "X(IE)-MSCIACWLDSC 1C",
        isin: "IE00BK1PV551",
        shares: 3000,
        purchasePrice: 19.04,
        purchaseDate: "2017-01-20", // Bitte anpassen
        currentPrice: 45.01, // 19.04 * (1 + 1.3640) = 45.01
        category: "equity",
        type: "aktien_alt",
        tqf: 0.30,
        notes: "Gewinn seit Kauf: 136,40%"
    },

    // ==========================================================================
    // NEUBESTAND (nach 2018 gekauft)
    // ==========================================================================
    {
        name: "Vanguard FTSE All-World DLA",
        isin: "IE00BK5BQT80",
        wkn: "A2PKXG",
        shares: 6270,
        purchasePrice: 135.62,
        purchaseDate: "2023-05-10", // Bitte anpassen
        currentPrice: 148.94, // 135.62 * (1 + 0.0982) = 148.94
        category: "equity",
        type: "aktien_neu",
        tqf: 0.30,
        notes: "Gewinn seit Kauf: 9,82% - Wird als Referenz-Kurs genutzt"
    },

    // ==========================================================================
    // GELDMARKT-ETF (separate Kategorie)
    // ==========================================================================
    {
        name: "XTR.II EUR OV.RATE SW. 1C",
        isin: "LU0290358497",
        shares: 1900,
        purchasePrice: 147.15,
        purchaseDate: "2024-01-15", // Bitte anpassen
        currentPrice: 148.14, // 147.15 * (1 + 0.0067) = 148.14
        category: "money_market",
        type: "geldmarkt",
        tqf: 0.30,
        notes: "Gewinn seit Kauf: 0,67%"
    }
];

/**
 * Hilfsfunktion: Berechnet den Gesamtwert aller Tranchen
 */
export function calculateTotalPortfolioValue(tranches) {
    return tranches.reduce((sum, t) => {
        const marketValue = t.shares * (t.currentPrice || t.purchasePrice);
        return sum + marketValue;
    }, 0);
}

/**
 * Hilfsfunktion: Berechnet die gewichtete durchschnittliche Gewinnquote
 */
export function calculateAverageGainPct(tranches) {
    let totalValue = 0;
    let totalGain = 0;

    tranches.forEach(t => {
        const marketValue = t.shares * (t.currentPrice || t.purchasePrice);
        const costBasis = t.shares * t.purchasePrice;
        const gain = marketValue - costBasis;

        totalValue += marketValue;
        totalGain += gain;
    });

    return totalValue > 0 ? (totalGain / (totalValue - totalGain)) * 100 : 0;
}

/**
 * Hilfsfunktion: Gruppiert Tranchen nach Kategorie
 */
export function groupTranchesByCategory(tranches) {
    return tranches.reduce((groups, t) => {
        const cat = t.category || 'other';
        if (!groups[cat]) groups[cat] = [];
        groups[cat].push(t);
        return groups;
    }, {});
}

/**
 * Beispiel-Output für Debugging
 */
if (typeof window !== 'undefined') {
    window.BEISPIEL_DEPOT_TRANCHEN = BEISPIEL_DEPOT_TRANCHEN;
    window.calculateTotalPortfolioValue = calculateTotalPortfolioValue;
    window.calculateAverageGainPct = calculateAverageGainPct;
    window.groupTranchesByCategory = groupTranchesByCategory;

    console.log('='.repeat(80));
    console.log('DEPOT-TRANCHEN BEISPIEL GELADEN');
    console.log('='.repeat(80));
    console.log('Gesamtwert Portfolio:', calculateTotalPortfolioValue(BEISPIEL_DEPOT_TRANCHEN).toFixed(2), '€');
    console.log('Durchschnittlicher Gewinn:', calculateAverageGainPct(BEISPIEL_DEPOT_TRANCHEN).toFixed(2), '%');
    console.log('Anzahl Tranchen:', BEISPIEL_DEPOT_TRANCHEN.length);
    console.log('='.repeat(80));
}
