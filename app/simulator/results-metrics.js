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
 * @property {string} [secondaryLabel] - Sichtbare Bezeichnung eines zweiten Exaktwerts.
 * @property {string} [secondaryValue] - Sichtbarer zweiter Exaktwert.
 * @property {string} [statusLine] - Sichtbarer stabiler Grund bei fehlender oder ungueltiger Messung.
 * @property {string} [secondaryStatusLine] - Status des zweiten Exaktwerts.
 * @property {('exact-risk')} [layout] - Layout-Hinweis fuer nicht abzuschneidende Exaktwerte.
 * @property {boolean} [decisionCritical] - Bleibt auch im einfachen Modus sichtbar.
 */

export const WITHDRAWAL_RATE_REPORTING_REFERENCE_NOTICE = 'Die Auswertung bei 4,5 % bezieht sich auf die realisierte Entnahmequote. Sie ist nur eine Berichtsreferenz und keine Alarm- oder Guardrail-Schwelle.';

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
    const outcomeInventory = results?.outcomeInventory;
    const hasOutcomeInventory = outcomeInventory?.schemaVersion === 'MonteCarloOutcomeInventoryV1';
    const floorCoveragePct = hasOutcomeInventory
        ? outcomeInventory.floorCoveragePct
        : safeTotalRuns > 0
            ? ((safeTotalRuns - safeFailCount) / safeTotalRuns) * 100
            : null;
    const requestedRuns = hasOutcomeInventory ? outcomeInventory.requestedRuns : safeTotalRuns;
    const ruinRuns = hasOutcomeInventory ? outcomeInventory.ruin : safeFailCount;
    const allDeadRuns = hasOutcomeInventory ? outcomeInventory.all_dead : 0;
    const horizonRuns = hasOutcomeInventory ? outcomeInventory.horizon_exhausted : Math.max(0, safeTotalRuns - safeFailCount);
    const technicalRuns = hasOutcomeInventory ? outcomeInventory.technical_error : 0;
    const floorEstimate = hasOutcomeInventory ? outcomeInventory.floorCoverageEstimate : null;
    const floorInterval = floorEstimate?.confidenceInterval95;
    const floorValue = floorCoveragePct === null
        ? formatPercentage(null)
        : floorInterval
            ? `${formatPercentage(floorCoveragePct)} (95%-KI ${formatPercentage(floorInterval.lowerPct)}–${formatPercentage(floorInterval.upperPct)})`
            : formatPercentage(floorCoveragePct);
    const floorWarning = floorEstimate?.uncertaintyWarning?.code === 'small_sample'
        ? ` Unsicherheitswarnung: nur ${requestedRuns} Läufe; Schwelle ${floorEstimate.uncertaintyWarning.thresholdRuns}.`
        : '';
    const taxOutcomes = results?.taxOutcomes || {};
    const taxAvailable = directMetricReason(taxOutcomes) === null
        && Number.isFinite(taxOutcomes.p50);
    const finalOutcomes = results?.finalOutcomes || {};
    const finalP50Available = Number.isFinite(finalOutcomes.p50);
    const successfulP50Available = directMetricReason({
        missingness: finalOutcomes.successfulMissingness,
        sampleSize: finalOutcomes.successfulCount
    }) === null && Number.isFinite(finalOutcomes.p50_successful);
    const finalP10Available = Number.isFinite(finalOutcomes.p10);
    const finalP90Available = Number.isFinite(finalOutcomes.p90);

    return [
        {
            title: 'Floor-Deckung im gewählten Horizont',
            value: floorValue,
            description: technicalRuns > 0
                ? `Wegen ${technicalRuns} technischem/technischen Fehler(n) fail-closed nicht ausgewiesen; das Outcome-Inventar bleibt sichtbar.`
                : `Anteil all_dead plus horizon_exhausted an ${requestedRuns} angeforderten Läufen. Das Wilson-95%-Intervall quantifiziert Simulationsfehler, nicht Modellrisiko. Horizontende ist ein zensierter, kein vollständiger Lebenszeitpfad.${floorWarning}`,
            tone: floorCoveragePct === null || floorWarning ? 'warning' : 'success'
        },
        {
            title: 'Terminale Outcomes',
            value: `Ruin ${ruinRuns} · Tod ${allDeadRuns} · Horizont ${horizonRuns} · Technik ${technicalRuns}`,
            description: `Disjunkte Endzustände für ${requestedRuns} angeforderte Läufe; ihre Summe entspricht der Runzahl.`,
            tone: 'default'
        },
        {
            title: 'Median (alle)',
            value: finalP50Available ? formatConservativeCurrency(finalOutcomes.p50, 'benefit') : '—',
            statusLine: finalP50Available ? '' : unavailableStatus(finalOutcomes, 'no_observations'),
            description: 'Typisches Endvermögen über alle finanziell auswertbaren Läufe. Centgenaue Anzeige ohne Tausenderstufen; zusätzliche Nachkommastellen werden als Nutzenwert konservativ abgerundet.',
            tone: 'default',
            layout: 'exact-risk'
        },
        {
            title: 'Median (erfolgreiche)',
            value: successfulP50Available ? formatConservativeCurrency(finalOutcomes.p50_successful, 'benefit') : '—',
            statusLine: successfulP50Available
                ? ''
                : unavailableStatus({
                    missingness: finalOutcomes.successfulMissingness,
                    sampleSize: finalOutcomes.successfulCount
                }, 'no_observations'),
            description: 'Median des Endvermögens aller erfolgreichen Läufe. Centgenaue Anzeige ohne Tausenderstufen; zusätzliche Nachkommastellen werden als Nutzenwert konservativ abgerundet.',
            tone: 'default',
            layout: 'exact-risk'
        },
        {
            title: '10%/90% Perzentil',
            value: finalP10Available && finalP90Available
                ? `${formatConservativeCurrency(finalOutcomes.p10, 'benefit')} / ${formatConservativeCurrency(finalOutcomes.p90, 'benefit')}`
                : '—',
            statusLine: finalP10Available && finalP90Available
                ? ''
                : unavailableStatus(finalOutcomes, 'no_observations'),
            description: 'Spannweite der Endvermögen zwischen konservativem P10 und optimistischem P90. Beide Nutzenwerte werden centgenau ohne Tausenderstufen angezeigt; zusätzliche Nachkommastellen werden konservativ abgerundet.',
            tone: 'default',
            layout: 'exact-risk',
            decisionCritical: true
        },
        {
            title: 'Median Steuern',
            value: taxAvailable ? formatConservativeCurrency(taxOutcomes.p50, 'cost') : '—',
            statusLine: taxAvailable ? '' : unavailableStatus(taxOutcomes, 'no_observations'),
            description: 'Centgenauer Median der kumulierten nominalen Steuerzahlungen. Zusätzliche Nachkommastellen werden als Kostenwert konservativ aufgerundet.',
            tone: 'default',
            layout: 'exact-risk',
            decisionCritical: true
        }
    ];
}

/**
 * Baut die Kern-KPI-Karten inkl. Detail-Sektionen.
 *
 * @param {Object} results - Ergebnisobjekt der Monte-Carlo-Simulation.
 * @returns {{ primary: Array<KpiDescriptor>, detailSections: Array<{title: string, kpis: Array<KpiDescriptor>}> }} Struktur für die KPI-Dashboards.
 */
export function buildKpiDashboard(results, inputs = {}) {
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
            title: 'Ruin oder Aktien/Gold ≤ 100 €',
            value: formatPercentage(deQuote),
            description: 'Anteil der Läufe mit Ruin (`isRuin`) oder einem Aktien-plus-Gold-Endbestand von höchstens 100 €. Freie Liquidität und Pflegebucket zählen nicht zur 100-€-Schwelle.',
            tone: depotTone
        },
        {
            title: 'Anteil Kürzungsjahre (≥ 10 %)',
            value: formatPercentage(results?.cutYearSharePct?.p50),
            description: `Medianer Anteil erfolgreich abgeschlossener Dekumulationsjahre mit Flex-Kürzung von mindestens 10 %; Nenner sind abgeschlossene Dekumulationsjahre mit endlicher Kürzungsentscheidung. Stichprobe: ${Number(results?.cutYearSharePct?.sampleSize) || 0} Läufe.`,
            tone: 'default'
        },
        ...buildDecisionCriticalKpis(results)
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
                title: 'Median-Alter: Ruin oder Aktien/Gold ≤ 100 €',
                value: formatNumberWithUnit(safeAge(results?.alterBeiErschoepfung?.p50), 'Jahre'),
                description: 'Medianes Alter beim ersten Ruin (`isRuin`) oder beim ersten Aktien-plus-Gold-Bestand von höchstens 100 € (nur entsprechend markierte Läufe).',
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

    const tailRiskKpis = buildTailRiskKpis(results, inputs);
    if (tailRiskKpis.length > 0) {
        detailSections.push({
            title: 'Tail-Risk-Overlay',
            kpis: tailRiskKpis
        });
    }

    return {
        primary,
        drawdownKpis: buildDrawdownKpis(results?.maxDrawdowns, results?.realMaxDrawdowns),
        detailSections,
        reportingReferenceNotice: WITHDRAWAL_RATE_REPORTING_REFERENCE_NOTICE
    };
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
    const realWithdrawalP10 = stressKPI.realWithdrawalP10;
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
                title: 'Zeitanteil realisierte Entnahmequote > 4,5 % (Stress)',
                value: formatPercentage(stressKPI.timeShareAbove45?.p50),
                description: 'Medianer Anteil der Stress-Jahre mit realisierter Entnahmequote strikt größer als 4,5 %. Reine Berichtsreferenz; keine Alarm- oder Guardrail-Schwelle.',
                tone: 'warning'
            },
            {
                title: 'Kürzungsjahre >10% (Stress)',
                value: formatNumberWithUnit(stressKPI.cutYears?.p50, 'Jahre'),
                description: 'Anzahl der Jahre mit >10% Flex-Kürzung im Stressfenster (Median).',
                tone: 'warning'
            },
            {
                title: 'Reale Depotentnahme P10 (Stress)',
                value: Number.isFinite(realWithdrawalP10?.realEur)
                    ? formatConservativeCurrency(realWithdrawalP10.realEur, 'benefit')
                    : '—',
                secondaryLabel: 'Median der Run-P10',
                secondaryValue: Number.isFinite(realWithdrawalP10?.p50RealEur)
                    ? formatConservativeCurrency(realWithdrawalP10.p50RealEur, 'benefit')
                    : '—',
                statusLine: Number.isFinite(realWithdrawalP10?.realEur)
                    ? ''
                    : unavailableStatus(realWithdrawalP10, 'no_observations'),
                secondaryStatusLine: Number.isFinite(realWithdrawalP10?.p50RealEur)
                    ? ''
                    : unavailableStatus(realWithdrawalP10, 'no_observations'),
                description: `P10 über die runbasierten P10-Depotentnahmen im festen Stressfenster; nach Ruin werden verbleibende Lebensjahre im Fenster mit 0 Euro aufgefüllt. Stichprobe: ${formatObservationCount(observationCount(realWithdrawalP10))} Läufe. Kein Quantil-Konfidenzintervall geschätzt.`,
                tone: 'danger',
                layout: 'exact-risk',
                decisionCritical: true
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
    const healthBucket = results?.extraKPI?.healthBucket;
    const hasCareMetrics = care && inputs?.pflegefallLogikAktivieren;
    const hasHealthBucketMetrics = healthBucket && (inputs?.healthBucketEnabled || inputs?.healthBucket?.enabled);
    if (!hasCareMetrics && !hasHealthBucketMetrics) {
        return null;
    }

    const cards = [];

    if (hasCareMetrics) {
        const p1 = care.p1 || {};
        cards.push(
            buildCareEntryCard('Pflegefall-Eintrittsquote P1', p1.entryRatePct, `P1-Eintritte: ${p1.entryRateNumerator || 0} von ${p1.entryRateDenominator || 0} angeforderten Läufen.`, '%'),
            buildCareEntryCard('Median Eintrittsalter P1', p1.entryAgeP50, `Bedingt auf beobachtete P1-Eintritte; Stichprobe: ${p1.sampleSize || 0} Läufe.`, 'Jahre'),
            buildCareEntryCard('Median Pflegejahre P1', p1.careYearsP50, `Nur P1-Pflegejahre in Läufen mit P1-Eintritt; Stichprobe: ${p1.sampleSize || 0}.`, 'Jahre'),
            buildCareEntryCard('Realer Pflege-Mehrbedarf P1 (Median)', p1.realCostEurP50, `Modellierter P1-Zusatzbedarf zu Preisen des Simulationsstarts; keine kausale Depot-Cashflow-Zurechnung. Stichprobe: ${p1.sampleSize || 0}.`, null, true, true)
        );
    }

    if (hasCareMetrics && inputs.partner?.aktiv) {
        const p2 = care.p2 || {};
        cards.push(
            buildCareEntryCard('Pflegefall-Eintrittsquote P2', p2.entryRatePct, `P2-Eintritte: ${p2.entryRateNumerator || 0} von ${p2.entryRateDenominator || 0} angeforderten Läufen.`, '%'),
            buildCareEntryCard('Median Eintrittsalter P2', p2.entryAgeP50, `Bedingt auf beobachtete P2-Eintritte; Stichprobe: ${p2.sampleSize || 0} Läufe.`, 'Jahre'),
            buildCareEntryCard('Median Pflegejahre P2', p2.careYearsP50, `Nur P2-Pflegejahre in Läufen mit P2-Eintritt; Stichprobe: ${p2.sampleSize || 0}.`, 'Jahre'),
            buildCareEntryCard('Realer Pflege-Mehrbedarf P2 (Median)', p2.realCostEurP50, `Modellierter P2-Zusatzbedarf zu Preisen des Simulationsstarts; keine kausale Depot-Cashflow-Zurechnung. Stichprobe: ${p2.sampleSize || 0}.`, null, true, true),
            buildCareEntryCard('Median Jahre beide in Pflege', care.household?.careYearsOverlapP50, `Gleichzeitige P1-/P2-Pflegejahre, einschließlich beobachteter 0; Stichprobe: ${care.household?.sampleSize || 0}.`, 'Jahre')
        );
    }

    if (hasCareMetrics) {
        cards.push(
            buildCareEntryCard('Max. jährlicher Pflege-Mehrbedarf (real)', care.household?.maxAnnualAdditionalNeedRealEurP50, 'Median des je Lauf höchsten tatsächlich modellierten jährlichen Haushalts-Zusatzbedarfs (P1 + P2), zu Preisen des Simulationsstarts.', null, true, true),
            buildCareEntryCard('Gesamter Pflege-Mehrbedarf (real)', care.household?.totalAdditionalNeedRealEurP50, 'Median der über Pflegejahre summierten modellierten Haushalts-Zusatzbedarfe, zu Preisen des Simulationsstarts; nicht als depotfinanzierter Betrag interpretieren.', null, true, true),
            buildCareEntryCard('Bedingte Shortfall-Rate', care.household?.shortfallRateWithCarePct, `Anteil der Shortfalls unter Läufen mit Pflegeeintritt; Stichprobe: ${care.household?.sampleSize || 0}.`, '%'),
            buildCareEntryCard('Shortfall-Rate (o. Pflege)', care.household?.shortfallRateWithoutCarePct, `Anteil der Shortfalls unter Läufen ohne Pflegeeintritt; Stichprobe: ${care.household?.noCareSampleSize || 0}.`, '%'),
            buildCareEntryCard('Reales Endvermögen (m. Pflege, Median)', care.household?.endWealthWithCareRealEurP50, 'Gruppenmedian der Läufe mit Pflegeeintritt, zu Preisen des Simulationsstarts.', null, true, true),
            buildCareEntryCard('Reales Endvermögen (o. Pflege, Median)', care.household?.endWealthNoCareRealEurP50, 'Gruppenmedian der Läufe ohne Pflegeeintritt, zu Preisen des Simulationsstarts.', null, true, true),
            buildCareEntryCard('Gruppenmedian-Differenz (nicht kausal)', care.comparison?.endWealthNoCareMinusCareRealEur, 'Nicht gepaarter, nicht kausaler Gruppenvergleich: Median ohne Pflege minus Median mit Pflege, zu Preisen des Simulationsstarts. Unterschiede der Gruppen, etwa Lebensdauer und Pflegeeintritt, sind nicht kontrolliert.', null, true, true)
        );
    }

    if (hasHealthBucketMetrics) {
        cards.push(
            buildCareEntryCard('Pflegebucket genutzt', healthBucket.usedRatePct, 'Anteil der Monte-Carlo-Läufe mit mindestens einer Entnahme aus dem Pflegebucket.', '%'),
            buildCareEntryCard('Pflegebucket erschöpft', healthBucket.depletedRatePct, 'Anteil der Läufe mit aktivem Bucket, in denen die Reserve am Ende aufgebraucht ist.', '%'),
            buildCareEntryCard('Median Bucket-Nutzung', healthBucket.usedMedian, 'Typische Bucket-Entnahme in Läufen mit Nutzung.', null, true, true),
            buildCareEntryCard('P90 Bucket-Nutzung', healthBucket.usedP90, 'Hohe, aber nicht extreme Bucket-Entnahme über die Läufe mit Nutzung.', null, true, true),
            buildCareEntryCard('Median Restbucket', healthBucket.endMedian, 'Typischer verbleibender Pflegebucket am Laufende.', null, true, true),
            buildCareEntryCard('Median Zieldeckung', healthBucket.coverageMedianPct, 'Typische reale Deckung relativ zum inflationsangepassten Bucket-Ziel.', '%'),
            buildCareEntryCard('Median Ziellücke', healthBucket.targetGapMedian, 'Typische Lücke zum inflationsangepassten Bucket-Ziel.', null, true, true)
        );
    }

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
        kpiDashboard: buildKpiDashboard(results, inputs),
        stressMetrics: buildStressMetrics(results?.stressKPI),
        careMetrics: buildCareMetrics(results, inputs),
        heatmapData: {
            heatmap: results?.heatmap,
            bins: results?.bins,
            totalRuns,
            extraKPI: results?.extraKPI
        },
        carThreshold: results?.realWithdrawalP10?.realEur
    };
}

/**
 * Baut die entscheidungskritischen Exaktwert-KPIs.
 * @param {Object} results - Aggregierte Monte-Carlo-Ergebnisse.
 * @returns {Array<KpiDescriptor>} KPI-Liste mit entscheidungskritischen Exaktwerten.
 */
function buildDecisionCriticalKpis(results) {
    const withdrawal = results?.realWithdrawalP10 || {};
    const withdrawalReason = directMetricReason(withdrawal);
    const withdrawalP10Available = withdrawalReason === null && Number.isFinite(withdrawal.realEur);
    const withdrawalMedianAvailable = withdrawalReason === null && Number.isFinite(withdrawal.p50RealEur);
    const lossCarry = results?.extraKPI?.lossCarryTaxSavings || {};
    const lossCarryAvailable = directMetricReason(lossCarry) === null
        && Number.isFinite(lossCarry.perRunMean);

    return [
        {
            title: 'Reale Depotentnahme P10',
            value: withdrawalP10Available ? formatConservativeCurrency(withdrawal.realEur, 'benefit') : '—',
            secondaryLabel: 'Median der Run-P10',
            secondaryValue: withdrawalMedianAvailable ? formatConservativeCurrency(withdrawal.p50RealEur, 'benefit') : '—',
            statusLine: withdrawalP10Available ? '' : unavailableStatus(withdrawal, 'no_observations'),
            secondaryStatusLine: withdrawalMedianAvailable ? '' : unavailableStatus(withdrawal, 'no_observations'),
            description: `Centgenaue reale Eurobeträge zu Preisen des Simulationsstarts; zusätzliche Nachkommastellen werden als Nutzenwerte konservativ abgerundet. P10 über die runbasierten P10-Werte realer Depotentnahmen; das Fenster beginnt mit der ersten Dekumulationsverpflichtung und wird nach Ruin bis Tod oder Horizont mit 0 Euro aufgefüllt. Beobachtete Läufe: ${formatObservationCount(observationCount(withdrawal))}; ausgeschlossen: ${nonNegativeInteger(withdrawal.excludedRuns)}. Kein Quantil-Konfidenzintervall geschätzt.`,
            tone: 'danger',
            layout: 'exact-risk',
            decisionCritical: true
        },
        {
            title: 'Ø Steuerersparnis Verlustvortrag',
            value: lossCarryAvailable ? formatConservativeCurrency(lossCarry.perRunMean, 'benefit') : '—',
            statusLine: lossCarryAvailable ? '' : unavailableStatus(lossCarry, 'no_observations'),
            description: 'Centgenaue durchschnittliche nominale Steuerersparnis pro Lauf durch Verlustvortrag; zusätzliche Nachkommastellen werden als Nutzenwert konservativ abgerundet. Ein beobachteter positiver Kleinstwert bleibt sichtbar.',
            tone: lossCarryAvailable && lossCarry.perRunMean > 0 ? 'success' : 'default',
            layout: 'exact-risk',
            decisionCritical: true
        }
    ];
}

/**
 * Baut nominale und reale Drawdown-KPIs paarweise aus den validierten Aggregaten.
 * Die UI rechnet weder neu noch repariert sie ungueltige Vorzeichen oder Grenzen.
 * @param {Object} nominalDrawdowns - Nominale Aggregation aus Slice 1.
 * @param {Object} realDrawdowns - Reale Aggregation aus Slice 1.
 * @returns {Array<KpiDescriptor>} Vier paarweise angeordnete Drawdown-Karten.
 */
function buildDrawdownKpis(nominalDrawdowns, realDrawdowns) {
    return [
        buildDrawdownCard(nominalDrawdowns, 'p50', 'Max. Drawdown nominal (Median)', 'Nominaler positiver Verlustbetrag vom vorherigen Depot-Hoch; gleicher Laufpfad und Zeitraum wie beim realen Drawdown.', 'warning'),
        buildDrawdownCard(realDrawdowns, 'p50', 'Max. Drawdown real (Median)', 'Kaufkraftbereinigter positiver Verlustbetrag zu Preisen des Simulationsstarts; gleicher Laufpfad und Zeitraum wie beim nominalen Drawdown.', 'warning'),
        buildDrawdownCard(nominalDrawdowns, 'p90', 'Max. Drawdown nominal (P90)', 'Nominaler positiver Verlustbetrag; nur 10 % der beobachteten Läufe hatten einen größeren nominalen Drawdown.', 'danger'),
        buildDrawdownCard(realDrawdowns, 'p90', 'Max. Drawdown real (P90)', 'Kaufkraftbereinigter positiver Verlustbetrag zu Preisen des Simulationsstarts; nur 10 % der beobachteten Läufe hatten einen größeren realen Drawdown.', 'danger')
    ];
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
            description: 'Stichproben-Standardabweichung (N-1) der jährlichen Portfolio-Renditen; die Jahresfrequenz benötigt keine zusätzliche Annualisierung (Median über Läufe).',
            tone: 'default'
        });
    }
    {
        const timeShare = Number.isFinite(results?.extraKPI?.timeShareQuoteAbove45)
            ? (results.extraKPI.timeShareQuoteAbove45 * 100)
            : null;
        kpis.push({
            title: 'Zeitanteil realisierte Entnahmequote > 4,5 %',
            value: formatPercentage(timeShare),
            statusLine: Number.isFinite(timeShare)
                ? ''
                : 'Grund: no_observations · Beobachtungen: unbekannt Jahre',
            description: 'Anteil aller finanziell auswertbaren simulierten Dekumulationsjahre mit realisierter Entnahmequote strikt größer als 4,5 %. Reine Berichtsreferenz; keine Alarm- oder Guardrail-Schwelle.',
            tone: 'warning'
        });
        const safety = results?.extraKPI?.dynamicFlexSafety;
        if (safety && typeof safety === 'object') {
            const stage1Years = isFinite(safety.yearShareStage1plus) ? safety.yearShareStage1plus * 100 : 0;
            const stage2Years = isFinite(safety.yearShareStage2) ? safety.yearShareStage2 * 100 : 0;
            const stage2Runs = isFinite(safety.runShareStage2) ? safety.runShareStage2 * 100 : 0;
            kpis.push({
                title: 'Safety aktiv (Jahre)',
                value: formatPercentage(stage1Years),
                description: 'Anteil aller Simulationsjahre mit aktivem Dynamic-Flex-Sicherheitsmodus (Stufe 1/2).',
                tone: stage1Years > 25 ? 'warning' : 'default'
            });
            kpis.push({
                title: 'Safety Stufe 2 (Jahre)',
                value: formatPercentage(stage2Years),
                description: 'Anteil aller Simulationsjahre mit Fallback auf statischen Flex.',
                tone: stage2Years > 10 ? 'danger' : (stage2Years > 0 ? 'warning' : 'default')
            });
            kpis.push({
                title: 'Läufe mit Stufe 2',
                value: formatPercentage(stage2Runs),
                description: 'Anteil der Läufe, in denen mindestens einmal Stufe 2 erreicht wurde.',
                tone: stage2Runs > 20 ? 'danger' : (stage2Runs > 0 ? 'warning' : 'default')
            });
        }
    }
    return kpis;
}

function buildDrawdownCard(metric, quantileKey, title, description, tone) {
    const value = metric?.[quantileKey];
    const count = drawdownObservationCount(metric);
    const directReason = directMetricReason(metric);
    const valid = directReason === null
        && Number.isFinite(value)
        && value >= 0
        && value <= 100;
    let reason = directReason;
    if (!valid && reason === null) {
        if (value === null || value === undefined) {
            reason = activeMissingnessReason(metric) || 'no_observations';
        } else if (!Number.isFinite(value)) {
            reason = 'invalid_non_finite';
        } else {
            reason = 'invalid_drawdown_domain';
        }
    }
    return {
        title,
        value: valid ? formatConservativePercentagePoints(value) : '—',
        statusLine: valid ? '' : `Grund: ${reason} · Beobachtungen: ${formatObservationCount(count)} Läufe`,
        description: `${description} Prozentpunkte aus dem validierten Aggregat werden mit mindestens zwei Nachkommastellen angezeigt und bei weiterer Präzision als Verlustbetrag konservativ aufgerundet; Beobachtungen: ${formatObservationCount(count)} Läufe. Gültige Domäne: 0 bis 100 %.`,
        tone,
        layout: 'exact-risk',
        decisionCritical: true
    };
}

function directMetricReason(metric) {
    const applicability = metric?.applicability;
    if (typeof applicability === 'string' && applicability.trim()) return applicability.trim();
    if (applicability && typeof applicability === 'object' && applicability.applicable === false) {
        return typeof applicability.reason === 'string' && applicability.reason.trim()
            ? applicability.reason.trim()
            : 'not_applicable';
    }
    return typeof metric?.missingness === 'string' && metric.missingness.trim()
        ? metric.missingness.trim()
        : null;
}

function activeMissingnessReason(metric) {
    const inventories = [metric?.missingness, metric?.distribution?.missingness];
    const countsByReason = new Map();
    for (const inventory of inventories) {
        if (!inventory || typeof inventory !== 'object' || Array.isArray(inventory)) continue;
        for (const [reason, count] of Object.entries(inventory)) {
            if (!Number.isFinite(count) || count <= 0) continue;
            countsByReason.set(reason, Math.max(countsByReason.get(reason) || 0, count));
        }
    }
    return [...countsByReason.entries()]
        .sort(([reasonA, countA], [reasonB, countB]) => countB - countA || reasonA.localeCompare(reasonB))[0]?.[0] || null;
}

function drawdownObservationCount(metric) {
    const candidates = [
        metric?.observationCount?.observedPaths,
        metric?.distribution?.observationCount?.observedPaths,
        metric?.distribution?.sampleSize,
        metric?.sampleSize
    ];
    const count = candidates.find(candidate => Number.isSafeInteger(candidate) && candidate >= 0);
    return count ?? null;
}

function observationCount(metric) {
    const candidates = [
        metric?.observationCount?.observedPaths,
        metric?.distribution?.observationCount?.observedPaths,
        metric?.distribution?.sampleSize,
        metric?.sampleSize
    ];
    const count = candidates.find(candidate => Number.isSafeInteger(candidate) && candidate >= 0);
    return count ?? null;
}

function nonNegativeInteger(value) {
    return Number.isSafeInteger(value) && value >= 0 ? value : 0;
}

function unavailableStatus(metric, fallbackReason) {
    const reason = directMetricReason(metric) || activeMissingnessReason(metric) || fallbackReason;
    return `Grund: ${reason} · Beobachtungen: ${formatObservationCount(observationCount(metric))} Läufe`;
}

function formatObservationCount(value) {
    return Number.isSafeInteger(value) && value >= 0 ? String(value) : 'unbekannt';
}

function stabilizeScaledValue(value, scale) {
    const scaled = value * scale;
    const nearestInteger = Math.round(scaled);
    const tolerance = Number.EPSILON * Math.max(1, Math.abs(scaled)) * 8;
    return Math.abs(scaled - nearestInteger) <= tolerance ? nearestInteger : scaled;
}

function roundConservatively(value, fractionDigits, direction) {
    const scale = 10 ** fractionDigits;
    const scaled = stabilizeScaledValue(value, scale);
    const rounded = direction === 'cost' ? Math.ceil(scaled) : Math.floor(scaled);
    return rounded / scale;
}

function formatConservativeCurrency(value, direction) {
    if (!Number.isFinite(value)) return '—';
    return formatCurrencySafe(roundConservatively(value, 2, direction));
}

function formatConservativePercentagePoints(value) {
    return formatNumberWithUnit(roundConservatively(value, 2, 'cost'), '%', 2);
}

function buildTailRiskKpis(results, inputs = {}) {
    const tailRisk = results?.extraKPI?.tailRisk;
    if (!tailRisk || inputs?.tailRiskEnabled !== true) {
        return [];
    }

    const activeYearsPct = Number.isFinite(tailRisk.activeYearShare)
        ? tailRisk.activeYearShare * 100
        : 0;
    const appliedYearsPct = Number.isFinite(tailRisk.appliedYearShare)
        ? tailRisk.appliedYearShare * 100
        : 0;
    const skipCount = Number(tailRisk.skippedHistoricalCrisisYears) || 0;

    return [
        {
            title: 'Tail-Risk-Läufe aktiv',
            value: formatPercentage(tailRisk.runActiveRatePct),
            description: 'Anteil der Läufe mit mindestens einem geplanten Tail-Risk-Ereignis.',
            tone: tailRisk.runActiveRatePct > 0 ? 'warning' : 'default'
        },
        {
            title: 'Tail-Risk angewandt',
            value: formatPercentage(tailRisk.runAppliedRatePct),
            description: 'Anteil der Läufe, in denen mindestens ein Schock tatsächlich auf ein Nicht-Krisenjahr angewandt wurde.',
            tone: tailRisk.runAppliedRatePct > 0 ? 'danger' : 'default'
        },
        {
            title: 'Aktive Tail-Jahre',
            value: formatPercentage(activeYearsPct),
            description: `${tailRisk.activeYears || 0} von ${tailRisk.evaluatedYears || 0} simulierten Jahren lagen in einem Tail-Risk-Ereignisfenster.`,
            tone: activeYearsPct > 0 ? 'warning' : 'default'
        },
        {
            title: 'Applizierte Tail-Jahre',
            value: formatPercentage(appliedYearsPct),
            description: `${tailRisk.appliedYears || 0} Jahre erhielten den Return-/Inflationsschock.`,
            tone: appliedYearsPct > 0 ? 'danger' : 'default'
        },
        {
            title: 'Historische Krisen-Skips',
            value: formatNumberWithUnit(skipCount),
            description: 'Geplante Tail-Schocks, die wegen historischer Krisenjahre nicht additiv angewandt wurden.',
            tone: skipCount > 0 ? 'warning' : 'default'
        }
    ];
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
