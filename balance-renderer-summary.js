/**
 * Module: Balance Renderer Summary
 * Purpose: Renders the high-level summary KPIs (Runway, Liquidity Coverage) and Market Status.
 *          Visualizes the "Traffic Light" system for market regimes.
 * Usage: Used by balance-renderer.js to update the top summary section.
 * Dependencies: balance-utils.js, balance-reader.js
 */
"use strict";

import { UIUtils } from './balance-utils.js';

export function formatCurrency(value) {
    return UIUtils.formatCurrency(value);
}

export function calculateTotals(ui = {}) {
    const num = (value) => (typeof value === 'number' && isFinite(value)) ? value : 0;
    return {
        depotwertGesamt: num(ui.depotwertGesamt),
        neuerBedarf: num(ui.neuerBedarf),
        minGold: num(ui.minGold),
        zielLiquiditaet: num(ui.zielLiquiditaet)
    };
}

export function renderSummary(outputs = {}, ui = {}) {
    const totals = calculateTotals(ui);
    if (outputs?.depotwert) outputs.depotwert.textContent = formatCurrency(totals.depotwertGesamt);
    if (outputs?.neuerBedarf) outputs.neuerBedarf.textContent = formatCurrency(totals.neuerBedarf);
    if (outputs?.minGoldDisplay) outputs.minGoldDisplay.textContent = formatCurrency(totals.minGold);
    if (outputs?.zielLiquiditaet) outputs.zielLiquiditaet.textContent = formatCurrency(totals.zielLiquiditaet);
    return totals;
}

/**
 * Renderer für die Kern-KPIs und Zusammenfassungen.
 * Kapselt sämtliche DOM-Zugriffe rund um die Hauptübersicht und validiert Eingaben defensiv.
 */
export class SummaryRenderer {
    /**
     * @param {Object} domRefs - Referenzen auf die benötigten DOM-Knoten.
     * @param {Object} storageManager - Zugriff auf gespeicherte Zustände als Fallback.
     */
    constructor(domRefs, storageManager) {
        this.dom = domRefs;
        this.storageManager = storageManager;
    }

    /**
     * Orchestriert das Rendering der wichtigsten UI-Kacheln.
     *
     * @param {Object} ui - Vorbereitete UI-Daten inklusive Input- und Output-Werten.
     */
    renderOverview(ui = {}) {
        this.renderMiniSummary(ui);

        // Defensiver Zugriff: Jeder Bereich wird nur befüllt, wenn die Daten vorhanden sind.
        if (this.dom?.outputs?.depotwert && typeof ui.depotwertGesamt === 'number') {
            this.dom.outputs.depotwert.textContent = UIUtils.formatCurrency(ui.depotwertGesamt);
        }
        if (this.dom?.outputs?.neuerBedarf && typeof ui.neuerBedarf === 'number') {
            this.dom.outputs.neuerBedarf.textContent = UIUtils.formatCurrency(ui.neuerBedarf);
        }
        if (this.dom?.outputs?.minGoldDisplay && typeof ui.minGold === 'number') {
            this.dom.outputs.minGoldDisplay.textContent = UIUtils.formatCurrency(ui.minGold);
        }
        if (this.dom?.outputs?.zielLiquiditaet && typeof ui.zielLiquiditaet === 'number') {
            this.dom.outputs.zielLiquiditaet.textContent = UIUtils.formatCurrency(ui.zielLiquiditaet);
        }

        // Detail-Abschnitte in eigene Render-Schritte ausgelagert.
        this.renderEntnahme(ui.spending || {});
        this.renderMarktstatus(ui.market || {});
        this.renderLiquidityBar(ui.liquiditaet?.deckungNachher);
    }

    /**
     * Rendert die UI zur Inflationsanpassung der Bedarfe.
     *
     * @param {Object} inputData - Aktuelle Eingabedaten.
     * @param {Object} persistentState - Persistenter Zustand aus dem Storage.
     */
    renderBedarfAnpassungUI(inputData = {}, persistentState = {}) {
        const container = this.dom?.containers?.bedarfAnpassung;
        if (!container) return;

        const currentAge = inputData.aktuellesAlter;
        const lastAdjustedAge = persistentState.ageAdjustedForInflation || 0;
        const inflation = inputData.inflation;

        let content = '';
        if (typeof currentAge === 'number' && typeof inflation === 'number' && currentAge > lastAdjustedAge) {
            // Ein neues Jahr, eine Anpassung steht an
            const formattedInflation = UIUtils.formatPercentValue(inflation, { fractionDigits: 1, invalid: 'N/A' });
            content = `<button type="button" class="btn btn-sm btn-utility btn-apply-inflation">Bedarfe um ${formattedInflation} erhöhen</button>`;
        } else if (typeof currentAge === 'number' && currentAge === lastAdjustedAge && lastAdjustedAge > 0) {
            // Anpassung für dieses Alter ist bereits erfolgt
            content = `<small style="color: var(--success-color);">✓ Bedarfe für Alter ${currentAge} sind aktuell.</small>`;
        }

        container.innerHTML = content;
    }

    /**
     * Erzeugt die kompakte Zusammenfassung inkl. KPI-Badges und Reichweiten.
     *
     * @param {Object} ui - Gesamte UI-Datenstruktur inklusive Input/Action.
     */
    renderMiniSummary(ui = {}) {
        let currentInput = ui.input;
        if (!currentInput) {
            // Defensive Fallbacks: Storage bevorzugt, danach optionaler UIReader (falls vorhanden).
            currentInput = this.storageManager?.loadState?.()?.inputs;
            if (!currentInput && typeof UIReader !== 'undefined' && typeof UIReader.readAllInputs === 'function') {
                currentInput = UIReader.readAllInputs();
            }
        }
        if (!currentInput) {
            console.error("UIRenderer.renderMiniSummary: Konnte keine Input-Daten laden!");
            if (this.dom?.outputs?.miniSummary) {
                this.dom.outputs.miniSummary.textContent = 'Fehler beim Laden der Input-Daten für Mini-Summary.';
            }
            return;
        }

        // Hilfsfunktion für die alten Vergleichs-Items
        const createItem = (label, before, after, unit, formatter) => {
            const item = document.createElement('div');
            item.className = 'summary-item';
            const labelEl = document.createElement('span');
            labelEl.className = 'label';
            labelEl.textContent = label;
            const valueEl = document.createElement('span');
            valueEl.className = 'value';
            const strongEl = document.createElement('strong');
            const formatVal = formatter || (v => (v === Infinity) ? '>20' : (typeof v === 'number' && isFinite(v)) ? v.toFixed(1) : 'N/A');
            strongEl.textContent = `${formatVal(after)}${unit}`;
            valueEl.textContent = `${formatVal(before)}${unit} → `;
            valueEl.appendChild(strongEl);
            item.append(labelEl, valueEl);
            return item;
        };

        // NEUE Hilfsfunktion für den KPI-Badge
        const createKpiBadge = (label, value, unit, status) => {
            const kpi = document.createElement('div');
            // 'status-info' als Fallback, falls kein Status geliefert wird
            kpi.className = `summary-kpi status-${status || 'info'}`;

            const labelEl = document.createElement('span');
            labelEl.className = 'label';
            labelEl.textContent = label;

            const valueEl = document.createElement('span');
            valueEl.className = 'value';
            if (unit.toLowerCase().includes('monat')) {
                valueEl.textContent = UIUtils.formatMonths(value, { fractionDigits: 0, invalid: '∞', suffix: unit });
            } else {
                const formattedValue = (typeof value === 'number' && isFinite(value)) ? value.toFixed(0) : '∞';
                valueEl.textContent = `${formattedValue} ${unit}`;
            }

            kpi.append(labelEl, valueEl);
            return kpi;
        };

        const inflatedBedarf = {
            floor: Math.max(0, currentInput.floorBedarf - (currentInput.renteAktiv ? currentInput.renteMonatlich * 12 : 0)),
            flex: currentInput.flexBedarf
        };
        const liqVorher = currentInput.tagesgeld + currentInput.geldmarktEtf;
        const liqNachher = liqVorher + (ui.action.verwendungen?.liquiditaet || 0);

        const reichweite = {
            floorVorher: inflatedBedarf.floor > 0 ? (liqVorher / inflatedBedarf.floor) : Infinity,
            floorNachher: inflatedBedarf.floor > 0 ? (liqNachher / inflatedBedarf.floor) : Infinity,
        };

        const fragment = document.createDocumentFragment();

        // Füge den neuen Runway-KPI als erstes und wichtigstes Element hinzu
        if (ui.runway && typeof ui.runway.months === 'number') {
            const runwayKpi = createKpiBadge('Runway (Gesamtbedarf)', ui.runway.months, 'Monate', ui.runway.status);
            fragment.appendChild(runwayKpi);
        }

        const formatDeckung = (value) => UIUtils.formatPercentValue(value, { fractionDigits: 1, invalid: 'N/A' });
        fragment.appendChild(createItem('Liquid.-Deckung', ui.liquiditaet.deckungVorher, ui.liquiditaet.deckungNachher, '%', formatDeckung));
        fragment.appendChild(createItem('Reichweite (Floor)', reichweite.floorVorher, reichweite.floorNachher, ' J'));

        if (this.dom?.outputs?.miniSummary) {
            this.dom.outputs.miniSummary.replaceChildren(fragment);
        }
    }

    /**
     * Stellt Entnahme-Informationen dar und blendet optionale Details ein.
     *
     * @param {Object} spending - Daten zur geplanten Entnahme.
     */
    renderEntnahme(spending = {}) {
        if (!this.dom?.outputs?.monatlicheEntnahme) return;

        const monatlicheEntnahme = spending.monatlicheEntnahme;
        if (typeof monatlicheEntnahme === 'number' && isFinite(monatlicheEntnahme)) {
            this.dom.outputs.monatlicheEntnahme.replaceChildren(document.createTextNode(UIUtils.formatCurrency(monatlicheEntnahme)));
        }

        // Ergänzende Erläuterungen werden als Subtext markiert, damit der Einfach-Modus sie ausblenden kann
        // und die rechte Spalte kompakter bleibt.
        const small1 = document.createElement('small');
        small1.className = 'entnahme-subtext';
        small1.style.cssText = 'display:block; font-size:0.85em; opacity:0.8; margin-top: 4px;';
        if (typeof monatlicheEntnahme === 'number' && isFinite(monatlicheEntnahme)) {
            small1.textContent = `(${UIUtils.formatCurrency(monatlicheEntnahme * 12)} / Jahr)`;
        }
        const small2 = document.createElement('small');
        small2.className = 'entnahme-subtext';
        small2.style.cssText = 'display:block; opacity:.8;';
        small2.textContent = (spending.anmerkung || '').trim();
        this.dom.outputs.monatlicheEntnahme.append(small1, small2);
    }

    /**
     * Rendert den Marktstatus als Ampel-Karte.
     *
     * @param {Object} market - Szenario-Informationen des aktuellen Marktregimes.
     */
    renderMarktstatus(market = {}) {
        if (!this.dom?.outputs?.marktstatusText || !market.szenarioText) return;

        // Determine traffic-light status based on scenario.
        // Design decision: We avoid zusätzliche Icons und setzen nur auf den farbigen Rahmen,
        // damit die Kennzahl ruhiger wirkt und sich in die kompakte UI einfügt.
        const scenario = market.szenarioText || '';
        let statusClass = 'status-amber'; // default
        let statusLabel = 'Normal';

        if (scenario.includes('Erholung') && !scenario.includes('Bärenmarkt') ||
            scenario.includes('Stabiler Höchststand')) {
            statusClass = 'status-green';
            statusLabel = 'Gut';
        } else if (scenario.includes('Tiefer Bär')) {
            statusClass = 'status-red';
            statusLabel = 'Vorsicht';
        }

        // Create status indicator with simplified framing
        const statusIndicator = document.createElement('span');
        statusIndicator.className = `status-indicator ${statusClass}`;
        statusIndicator.setAttribute('aria-label', `Marktstatus: ${statusLabel}`);

        const statusText = document.createElement('span');
        statusText.textContent = scenario;

        statusIndicator.appendChild(statusText);

        // Clear and add new content
        this.dom.outputs.marktstatusText.replaceChildren(statusIndicator);

        // Add info icon with tooltip
        const info = document.createElement('span');
        info.style.cssText = 'cursor:help; opacity:0.7; margin-left: 8px;';
        info.title = Array.isArray(market.reasons) ? market.reasons.join(', ') : '';
        info.textContent = 'ⓘ';
        this.dom.outputs.marktstatusText.appendChild(info);
    }

    /**
     * Visualisiert die Liquiditätsdeckung über den Fortschrittsbalken.
     *
     * @param {number} percent - Deckung in Prozent.
     */
    renderLiquidityBar(percent) {
        if (!this.dom?.outputs?.liquiditaetBalken || !this.dom?.outputs?.balkenContainer) return;
        if (typeof percent !== 'number' || !isFinite(percent)) return;

        const pct = Math.min(100, Math.max(0, percent));
        const bar = this.dom.outputs.liquiditaetBalken;
        bar.className = 'progress-bar';
        bar.style.width = pct + '%';
        bar.classList.add(pct >= 100 ? 'bar-ok' : pct >= 70 ? 'bar-warn' : 'bar-bad');
        this.dom.outputs.balkenContainer.setAttribute('aria-valuenow', pct.toFixed(0));
    }
}
