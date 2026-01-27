"use strict";

import { formatCurrencySafe, formatNumberWithUnit, formatPercentage, sanitizeDescription } from './results-formatting.js';
import { formatCurrencyRounded } from './simulator-utils.js';
import { STRESS_PRESETS } from './simulator-data.js';

/**
 * Beschreibt eine KPI-Karte in neutraler Datenform ohne DOM-spezifische Elemente.
 * @typedef {Object} KpiDescriptor
 * @property {string} title - Sichtbarer Titel der Kennzahl.
 * @property {string} value - Formatierter Wert, enthält ggf. Einheit.
 * @property {string} description - Kurzbeschreibung für Tooltips oder unterhalb des Werts.
 * @property {('default'|'success'|'warning'|'danger')} tone - Semantische Einstufung für farbliche Darstellung.
 */

/**
 * Baut die zusammengefassten Hauptkennzahlen (Summary) für die Monte-Carlo-Ergebnisse.
 *
 * @param {Object} params - Rohdaten der Simulation.
 * @param {Object} params.results - Ergebnisobjekt der Monte-Carlo-Simulation.
 * @param {number} params.totalRuns - Anzahl der ausgeführten Läufe.
 * @param {number} params.failCount - Anzahl fehlgeschlagener Läufe.
 * @returns {Array<KpiDescriptor>} Formatierte Summary-Karten.
 */
export function buildSummaryData({ results, totalRuns, failCount }) {
    const safeTotalRuns = Math.max(0, Number(totalRuns) || 0);
    const safeFailCount = Math.max(0, Number(failCount) || 0);
    // Success rate is derived, not directly stored, so guard division by zero.
    const successRate = safeTotalRuns > 0
        ? ((safeTotalRuns - safeFailCount) / safeTotalRuns) * 100
        : 0;

    return [
        {
            title: 'Erfolgsquote',
            value: formatPercentage(successRate),
            description: 'Anteil erfolgreicher Läufe bezogen auf die Gesamtzahl.',
            tone: 'success'
        },
        {
            title: 'Shortfalls',
            value: `${safeFailCount} von ${safeTotalRuns}`,
            description: 'Anzahl der Simulationen, die den Floor nicht halten konnten.',
            tone: 'default'
        },
        {
            title: 'Median (alle)',
            value: formatCurrencyRounded(results?.finalOutcomes?.p50),
            description: 'Typisches Endvermögen über alle Läufe (Median).',
            tone: 'default'
        },
        {
            title: 'Median (erfolgreiche)',
            value: formatCurrencyRounded(results?.finalOutcomes?.p50_successful),
            description: 'Median des Endvermögens aller erfolgreichen Läufe.',
            tone: 'default'
        },
        {
            title: '10%/90% Perzentil',
            value: `${formatCurrencyRounded(results?.finalOutcomes?.p10)} / ${formatCurrencyRounded(results?.finalOutcomes?.p90)}`,
            description: 'Spannweite der Endvermögen zwischen konservativem (P10) und optimistischem (P90) Szenario.',
            tone: 'default'
        },
        {
            title: 'Median Steuern',
            value: formatCurrencyRounded(results?.taxOutcomes?.p50),
            description: 'Median der kumulierten Steuerzahlungen.',
            tone: 'default'
        }
    ];
}

/**
 * Baut die Kern-KPI-Karten inkl. Detail-Sektionen.
 *
 * @param {Object} results - Ergebnisobjekt der Monte-Carlo-Simulation.
 * @returns {{ primary: Array<KpiDescriptor>, detailSections: Array<{title: string, kpis: Array<KpiDescriptor>}> }} Struktur für die KPI-Dashboards.
 */
export function buildKpiDashboard(results) {
    const deQuote = Number(results?.depotErschoepfungsQuote) || 0;
    // Severity thresholds tuned for UI color coding.
    const depotTone = deQuote > 20 ? 'danger' : (deQuote > 5 ? 'warning' : 'success');

    const primary = [
        {
            title: 'Ø Lebensdauer',
            value: formatNumberWithUnit(results?.kpiLebensdauer?.mean, 'Jahre'),
            description: 'Durchschnittliche simulierte Lebensdauer über alle Läufe.',
            tone: 'default'
        },
        {
            title: 'Depot-Erschöpfungs-Quote',
            value: formatPercentage(deQuote),
            description: 'Anteil der Simulationen, in denen das Depot vollständig aufgebraucht wird.',
            tone: depotTone
        },
        {
            title: 'Anteil Kürzungsjahre (>10%)',
            value: formatPercentage(results?.kpiKuerzungsjahre?.p50),
            description: 'Medianer Anteil der Jahre mit Flex-Kürzung über 10%.',
            tone: 'default'
        },
        ...buildDrawdownKpis(results?.maxDrawdowns)
    ];

    const detailSections = [];

    detailSections.push({
        title: 'Operative Details',
        kpis: [
            {
                title: 'Max. Kürzung (Flex)',
                value: formatPercentage(results?.kpiMaxKuerzung?.p50),
                description: 'Im Median maximal aufgetretene Kürzung des Flex-Anteils in einem Jahr.',
                tone: 'default'
            },
            {
                title: 'Median-Alter bei Erschöpfung',
                value: formatNumberWithUnit(safeAge(results?.alterBeiErschoepfung?.p50), 'Jahre'),
                description: 'Alter bei Eintritt der Depot-Erschöpfung (Median, nur erschöpfte Fälle).',
                tone: 'default'
            },
            {
                title: 'Median-Anteil Jahre ohne Flex',
                value: formatPercentage(results?.anteilJahreOhneFlex?.p50),
                description: 'Medianer Anteil der Jahre ohne Flex-Ausschüttung.',
                tone: 'default'
            }
        ]
    });

    const risikoKpis = buildRiskKpis(results);
    if (risikoKpis.length > 0) {
        detailSections.push({
            title: 'Risiko-Details',
            kpis: risikoKpis
        });
    }

    return { primary, detailSections };
}

/**
 * Bereitet die Stress-KPI-Struktur auf.
 *
 * @param {Object|null} stressKPI - Stress-KPI-Objekt aus den Simulationsergebnissen.
 * @returns {Object|null} Struktur mit formatierten KPIs oder null, falls keine Stressdaten vorliegen.
 */
export function buildStressMetrics(stressKPI) {
    if (!stressKPI || !stressKPI.years || stressKPI.presetKey === 'NONE') {
        return null;
    }

    const presetLabel = STRESS_PRESETS[stressKPI.presetKey]?.label || 'Stress-Szenario';
    return {
        presetLabel,
        years: stressKPI.years,
        kpis: [
            {
                title: 'Max. Drawdown (Median, Stress)',
                value: formatPercentage(stressKPI.maxDD?.p50),
                description: `Größter Depot-Verlust während der ${stressKPI.years}-jährigen Stressphase (Median).`,
                tone: 'warning'
            },
            {
                title: 'Max. Drawdown (P90, Stress)',
                value: formatPercentage(stressKPI.maxDD?.p90),
                description: '90% der Läufe hatten einen geringeren Drawdown in der Stressphase.',
                tone: 'danger'
            },
            {
                title: 'Zeit mit Quote >4.5% (Stress)',
                value: formatPercentage(stressKPI.timeShareAbove45?.p50),
                description: 'Medianer Anteil der Stress-Jahre mit kritischer Entnahmerate.',
                tone: 'warning'
            },
            {
                title: 'Kürzungsjahre >10% (Stress)',
                value: formatNumberWithUnit(stressKPI.cutYears?.p50, 'Jahre'),
                description: 'Anzahl der Jahre mit >10% Flex-Kürzung im Stressfenster (Median).',
                tone: 'warning'
            },
            {
                title: 'Consumption-at-Risk P10 (Stress)',
                value: formatCurrencyRounded(stressKPI.consumptionAtRiskP10Real?.p50), // CaR wird auch gerundet
                description: 'Inflationsbereinigte Jahresentnahme im P10 über die Stressjahre (Median).',
                tone: 'danger'
            },
            {
                title: 'Erholung nach Stress (Median)',
                value: formatNumberWithUnit(stressKPI.recoveryYears?.p50, 'Jahre'),
                description: 'Jahre bis die Entnahmerate wieder unter 3,5% fällt (Median).',
                tone: 'default'
            }
        ]
    };
}

/**
 * Bereitet die KPI-Struktur für Pflege-Risiken auf.
 *
 * @param {Object} results - Simulationsergebnisse (inkl. extraKPI.pflege).
 * @param {Object} inputs - Eingabeparameter der Simulation (inkl. Partnerdaten).
 * @returns {Object|null} Formatierte Pflege-KPI-Struktur oder null, wenn nicht aktiv.
 */
export function buildCareMetrics(results, inputs) {
    const care = results?.extraKPI?.pflege;
    if (!care || !inputs?.pflegefallLogikAktivieren) {
        return null;
    }

    const cards = [
        buildCareEntryCard('Pflegefall-Eintrittsquote P1', care.entryRatePct, 'Anteil der Simulationen, in denen Person 1 Pflegefall eintritt.'),
        buildCareEntryCard('Median Eintrittsalter P1', safeAge(care.entryAgeMedian), 'Typisches Alter bei Eintritt des Pflegefalls Person 1.', 'Jahre'),
        buildCareEntryCard('Median Pflegejahre P1', safeAge(care.p1CareYears), 'Typische Anzahl Jahre in Pflege (Person 1).', 'Jahre')
    ];

    if (inputs.partner?.aktiv) {
        cards.push(
            buildCareEntryCard('Pflegefall-Eintrittsquote P2', care.p2EntryRatePct, 'Anteil der Simulationen, in denen Person 2 Pflegefall eintritt.'),
            buildCareEntryCard('Median Eintrittsalter P2', safeAge(care.p2EntryAgeMedian), 'Typisches Alter bei Eintritt des Pflegefalls Person 2.', 'Jahre'),
            buildCareEntryCard('Median Pflegejahre P2', safeAge(care.p2CareYears), 'Typische Anzahl Jahre in Pflege (Person 2).', 'Jahre'),
            buildCareEntryCard('Median Jahre beide in Pflege', safeAge(care.bothCareYears), 'Typische Anzahl Jahre, in denen beide Personen gleichzeitig in Pflege sind.', 'Jahre'),
            buildCareEntryCard('Max. jährl. Pflege-Ausgaben', care.maxAnnualCareSpend, 'Median der maximalen jährlichen Pflege-Gesamtkosten (P1+P2).', null, true, true)
        );
    }

    cards.push(
        buildCareEntryCard('Bedingte Shortfall-Rate', care.shortfallRate_condCare, 'Anteil der Fehlschläge, wenn ein Pflegefall eingetreten ist.', '%'),
        buildCareEntryCard('Shortfall-Rate (o. Pflege)', care.shortfallRate_noCareProxy, 'Geschätzte Fehlschlag-Rate ohne Pflegefall-Eintritt.', '%'),
        buildCareEntryCard('Median Endvermögen (m. Pflege)', care.endwealthWithCare_median, 'Typisches Endvermögen unter Berücksichtigung des Pflegerisikos.', null, true, true),
        buildCareEntryCard('Median Endvermögen (o. Pflege)', care.endwealthNoCare_median, 'Geschätztes typisches Endvermögen ohne die Last des Pflegefalls.', null, true, true),
        buildCareEntryCard('Median Gesamtkosten (Depot)', care.depotCosts_median, 'Typische Summe der aus dem Depot finanzierten Pflege-Mehrkosten (betroffene Läufe).', null, true, true),
        buildCareEntryCard('Median-Vermögensdifferenz', care.shortfallDelta_vs_noCare, 'Unterschied im medianen Endvermögen (ohne Pflege minus mit Pflege).', null, true, true)
    );

    return { cards };
}

/**
 * Erstellt ein Gesamt-View-Model für die Monte-Carlo-Auswertung.
 *
 * @param {Object} params - Rohdaten und UI-Kontext.
 * @param {Object} params.results - Simulationsergebnisse.
 * @param {number} params.totalRuns - Anzahl der Läufe.
 * @param {number} params.failCount - Anzahl fehlgeschlagener Läufe.
 * @param {Object} params.inputs - Eingabeparameter der Simulation.
 * @returns {Object} Dom-neutrales View-Model für Renderer.
 */
export function prepareMonteCarloViewModel({ results, totalRuns, failCount, inputs }) {
    return {
        summaryCards: buildSummaryData({ results, totalRuns, failCount }),
        kpiDashboard: buildKpiDashboard(results),
        stressMetrics: buildStressMetrics(results?.stressKPI),
        careMetrics: buildCareMetrics(results, inputs),
        heatmapData: {
            heatmap: results?.heatmap,
            bins: results?.bins,
            totalRuns,
            extraKPI: results?.extraKPI
        },
        carThreshold: results?.extraKPI?.consumptionAtRiskP10Real
    };
}

/**
 * Baut Drawdown-KPIs nur, wenn Werte vorliegen.
 * @param {Object} drawdowns - Objekt mit p50/p90 Drawdowns.
 * @returns {Array<KpiDescriptor>} KPI-Liste für Drawdowns.
 */
function buildDrawdownKpis(drawdowns) {
    const result = [];
    if (isFinite(drawdowns?.p50)) {
        result.push({
            title: 'Max. Drawdown (Median)',
            value: formatPercentage(drawdowns.p50),
            description: 'Größter Verlust von Peak-zu-Tief im Depot (Median).',
            tone: 'warning'
        });
    }
    if (isFinite(drawdowns?.p90)) {
        result.push({
            title: 'Max. Drawdown (P90)',
            value: formatPercentage(drawdowns.p90),
            description: 'Nur 10% der Läufe hatten einen größeren Drawdown.',
            tone: 'danger'
        });
    }
    return result;
}

/**
 * Baut Risiko-KPIs rund um Volatilität und Entnahmeraten.
 * @param {Object} results - Simulationsergebnisse.
 * @returns {Array<KpiDescriptor>} Risiko-KPIs.
 */
function buildRiskKpis(results) {
    const kpis = [];
    if (isFinite(results?.volatilities?.p50)) {
        kpis.push({
            title: 'Median Portfoliovolatilität',
            value: formatPercentage(results.volatilities.p50),
            description: 'Annualisierte Standardabweichung der Portfolio-Renditen (Median).',
            tone: 'default'
        });
    }
    if (results?.extraKPI) {
        const timeShare = isFinite(results.extraKPI.timeShareQuoteAbove45)
            ? (results.extraKPI.timeShareQuoteAbove45 * 100)
            : null;
        kpis.push({
            title: 'Zeitanteil Quote > 4.5%',
            value: formatPercentage(timeShare),
            description: 'Anteil aller simulierten Jahre mit Entnahmerate über 4.5%.',
            tone: 'warning'
        });
        if (isFinite(results.extraKPI.consumptionAtRiskP10Real)) {
            kpis.push({
                title: 'Reale Entnahme (P10)',
                value: formatCurrencyRounded(results.extraKPI.consumptionAtRiskP10Real),
                description: 'Worst-Case (10%-Quantil) der inflationsbereinigten Jahresentnahmen.',
                tone: 'danger'
            });
        }
    }
    return kpis;
}

/**
 * Sicheres Handling für Alterswerte, damit 0/negativ als fehlend interpretiert wird.
 * @param {number} value - Alterswert.
 * @returns {number|null} Validierter Wert oder null.
 */
function safeAge(value) {
    const numeric = Number(value);
    if (!isFinite(numeric) || numeric <= 0) {
        return null;
    }
    return numeric;
}

/**
 * Hilfsfunktion für Pflege-KPIs.
 * @param {string} title - Titel der Karte.
 * @param {number|null|undefined} value - Rohwert.
 * @param {string} description - Beschreibung der Kennzahl.
 * @param {string|null} unit - Einheit ("%"/"Jahre"), ansonsten null für Währung.
 * @param {boolean} isCurrency - Kennzeichnet Währungsformatierung.
 * @returns {KpiDescriptor} Formatierte Pflege-KPI.
 */
function buildCareEntryCard(title, value, description, unit = null, isCurrency = false, rounded = false) {
    let formattedValue = '—';
    if (isCurrency) {
        formattedValue = rounded ? formatCurrencyRounded(value) : formatCurrencySafe(value);
    } else if (unit) {
        formattedValue = unit === '%'
            ? formatPercentage(value)
            : formatNumberWithUnit(value, unit);
    } else {
        formattedValue = formatNumberWithUnit(value);
    }

    return {
        title,
        value: formattedValue,
        description: sanitizeDescription(description),
        tone: 'default'
    };
}
