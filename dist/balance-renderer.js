"use strict";

/**
 * ===================================================================================
 * BALANCE-APP UI-RENDERER
 * ===================================================================================
 */

import { UIUtils } from './balance-utils.js';
import { AppError, ValidationError } from './balance-config.js';

/**
 * Mappt technische Schwellenwert-Schlüssel auf sprechende Beschriftungen.
 * DESIGN-HINWEIS: Das Mapping ist modulweit definiert, damit die Struktur nicht
 * bei jedem Aufruf von _formatThresholdLabel neu erstellt werden muss. So
 * bleiben wir performant und zentralisieren zugleich die Pflege der Texte.
 */
const THRESHOLD_LABEL_MAP = Object.freeze({
    targetallocationpct: 'Ziel-Allokation',
    maxallocationpct: 'Max. Allokation',
    maxallocpctofeq: 'Max. Allokation (Eq)',
    rebalancingbandpct: 'Rebalancing-Band',
    minallocationpct: 'Min. Allokation',
    targetgoldvalue: 'Zielwert Gold',
    mingoldreserve: 'Min. Goldreserve',
    maxbearrellicofeq: 'Max. Drawdown Eq',
    blockedamount: 'Blockierter Betrag',
    minrunwaymonate: 'Min. Runway (Monate)',
    targetrunwaymonate: 'Ziel-Runway (Monate)',
    minsoldreserve: 'Min. Reserve'
});

// Module-level references
let dom = null;
let StorageManager = null;
let summaryRenderer = null;
let actionRenderer = null;
let diagnosisRenderer = null;

/**
 * Renderer für die Kern-KPIs und Zusammenfassungen.
 * Kapselt sämtliche DOM-Zugriffe rund um die Hauptübersicht und validiert Eingaben defensiv.
 */
class SummaryRenderer {
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
            content = `<button type="button" class="btn btn-sm btn-utility btn-apply-inflation">Bedarfe um ${inflation.toFixed(1)} % erhöhen</button>`;
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
        const createItem = (label, before, after, unit) => {
            const item = document.createElement('div');
            item.className = 'summary-item';
            const labelEl = document.createElement('span');
            labelEl.className = 'label';
            labelEl.textContent = label;
            const valueEl = document.createElement('span');
            valueEl.className = 'value';
            const strongEl = document.createElement('strong');
            const formatVal = v => (v === Infinity) ? '>20' : (typeof v === 'number' && isFinite(v)) ? v.toFixed(1) : 'N/A';
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
            const formattedValue = (typeof value === 'number' && isFinite(value)) ? value.toFixed(0) : '∞';
            valueEl.textContent = `${formattedValue} ${unit}`;

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

        fragment.appendChild(createItem('Liquid.-Deckung', ui.liquiditaet.deckungVorher, ui.liquiditaet.deckungNachher, '%'));
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

        if (spending.details && this.dom?.outputs?.entnahmeDetailsContent && this.dom?.outputs?.entnahmeBreakdown) {
            // Details gelten als vertiefende Information und werden im Einfach-Modus per CSS ausgeblendet.
            this.dom.outputs.entnahmeBreakdown.classList.add('entnahme-subtext');
            this.dom.outputs.entnahmeDetailsContent.replaceChildren(this.buildEntnahmeDetails(spending.details, spending.kuerzungQuelle));
            this.dom.outputs.entnahmeBreakdown.style.display = 'block';
        } else if (this.dom?.outputs?.entnahmeBreakdown) {
            this.dom.outputs.entnahmeBreakdown.style.display = 'none';
        }
    }

    /**
     * Baut die Detailzeilen zur Entnahme auf.
     *
     * @param {Object} details - Berechnete Kennzahlen zur Entnahme.
     * @param {string} kuerzungQuelle - Begründung für Anpassungen.
     * @returns {DocumentFragment} DOM-Fragment mit den Detailzeilen.
     */
    buildEntnahmeDetails(details, kuerzungQuelle) {
        const fragment = document.createDocumentFragment();
        const createLine = (label, value) => {
            fragment.appendChild(document.createTextNode(`• ${label}: ${value}`));
            fragment.appendChild(document.createElement('br'));
        };
        createLine('Effektive Flex-Rate', `${details.flexRate.toFixed(1)}%`);
        createLine('Entnahmequote (v. Depot)', `${(details.entnahmequoteDepot * 100).toFixed(2)}%`);
        createLine('Realer Drawdown (seit Peak)', `${(details.realerDepotDrawdown * -100).toFixed(1)}%`);

        fragment.appendChild(document.createTextNode(`• Grund für Anpassung: `));
        const strong = document.createElement('strong');
        strong.textContent = kuerzungQuelle;
        fragment.appendChild(strong);

        return fragment;
    }

    /**
     * Rendert den Marktstatus inklusive Tooltip und Ampel-System.
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

/**
 * Renderer für Handlungsempfehlungen und interne Rebalancing-Hinweise.
 * Trägt die Verantwortung für die Aktions-Karte inklusive defensiver Plausibilitätsprüfungen.
 */
class ActionRenderer {
    /**
     * @param {Object} domRefs - DOM-Referenzen für die Aktionskarten.
     */
    constructor(domRefs) {
        this.dom = domRefs;
    }

    /**
     * Rendert die Handlungsempfehlung und optional interne Liquiditäts-Umschichtungen.
     *
     * @param {Object} action - Beschriebene Handlungsempfehlung aus der Engine.
     * @param {Object} input - Ursprüngliche Input-Daten (zur Berechnung von Rebalancing-Vorschlägen).
     * @param {Object} spending - Entnahmeinformationen zur Ableitung der Jahresentnahme.
     * @param {number} [targetLiquidity] - (Optional) Ziel-Liquidität aus der Engine.
     */
    renderAction(action = {}, input = null, spending = {}, targetLiquidity) {
        const container = this.dom?.outputs?.handlungsanweisung;
        if (!container) return;
        [...container.children].filter(n => n.id !== 'copyAction').forEach(n => n.remove());

        // 1. Calculate potential internal cash rebalance
        const internalRebalance = this.determineInternalCashRebalance(
            input,
            action,
            spending,
            targetLiquidity
        );

        // 2. Integrate into main action object (Unified UI)
        const uiAction = this._integrateCashRebalance(action, internalRebalance);

        container.className = uiAction.anweisungKlasse || 'anweisung-grau';

        const content = document.createElement('div');
        content.id = 'handlungContent';

        if (uiAction.type === 'TRANSACTION') {
            // Strukturierter Aufbau der Handlungskarte.
            this._buildTransactionContent(uiAction, content, input, spending, targetLiquidity);
        } else if (uiAction.title) {
            content.textContent = uiAction.title;
        }

        // NOTE: Separate internal rebalance rendering removed as requested by user.

        container.appendChild(content);
    }

    /**
     * Integrates the internal cash rebalance into the standard action object
     * so it renders strictly as part of the transaction card (like ETFs).
     */
    _integrateCashRebalance(originalAction, rebalance) {
        if (!rebalance) return originalAction;

        // Deep clone to avoid mutating the original Engine result
        const action = JSON.parse(JSON.stringify(originalAction));

        // Ensure it looks like a transaction
        action.type = 'TRANSACTION';
        if (!action.title || action.title.includes('Kein Handlungsbedarf')) {
            action.title = 'Liquiditäts-Management';
            action.anweisungKlasse = 'anweisung-gelb'; // Upgrade to action color
        } else {
            action.title += ' & Geldmarkt-Opt.';
        }

        if (!action.quellen) action.quellen = [];
        if (!action.verwendungen) action.verwendungen = {};

        if (rebalance.to === 'Geldmarkt-ETF') {
            // BUY Money Market (Source: Liquidity)
            let liqSource = action.quellen.find(q => q.kind === 'liquiditaet' || q.source === 'Liquidität');
            if (!liqSource) {
                liqSource = { kind: 'liquiditaet', brutto: 0, netto: 0, steuer: 0 };
                action.quellen.unshift(liqSource);
            }
            liqSource.brutto += rebalance.amount;
            liqSource.netto += rebalance.amount; // Assuming cash is tax free

            // Add Use
            action.verwendungen.geldmarkt = (action.verwendungen.geldmarkt || 0) + rebalance.amount;

        } else if (rebalance.from === 'Geldmarkt-ETF') {
            // SELL Money Market (Source: Geldmarkt-ETF, Use: Liquidity)
            // Add Source
            action.quellen.push({
                kind: 'geldmarkt',
                brutto: rebalance.amount,
                netto: rebalance.amount,
                steuer: 0 // Ignoring tax for internal helper for now
            });

            // Add Use (Liquidity Refill)
            action.verwendungen.liquiditaet = (action.verwendungen.liquiditaet || 0) + rebalance.amount;
        }

        // Update Totals
        action.nettoErlös = action.quellen.reduce((sum, q) => sum + (q.netto || 0), 0);

        return action;
    }

    _resolveZielTagesgeld(spending, targetLiquidity) {
        const annualWithdrawal = (typeof spending?.monatlicheEntnahme === 'number' && isFinite(spending.monatlicheEntnahme))
            ? spending.monatlicheEntnahme * 12
            : null;
        const monthlyWithdrawal = (typeof spending?.monatlicheEntnahme === 'number' && isFinite(spending.monatlicheEntnahme))
            ? spending.monatlicheEntnahme
            : null;
        if (typeof annualWithdrawal === 'number' && isFinite(annualWithdrawal)) {
            return annualWithdrawal + ((monthlyWithdrawal || 0) * 2);
        }
        return (typeof targetLiquidity === 'number' && isFinite(targetLiquidity)) ? targetLiquidity : 0;
    }

    _splitLiquiditySource(input, action, spending, targetLiquidity) {
        if (!input || typeof input.tagesgeld !== 'number' || typeof input.geldmarktEtf !== 'number') {
            return null;
        }
        const zielTagesgeld = this._resolveZielTagesgeld(spending, targetLiquidity);
        const liquidityOutflow = (Array.isArray(action?.quellen) ? action.quellen : [])
            .filter(q => q.kind === 'liquiditaet' || q.source === 'Liquidität')
            .reduce((sum, q) => sum + (q.brutto || 0), 0);
        if (!isFinite(liquidityOutflow) || liquidityOutflow <= 0) {
            return null;
        }
        const availableFromTagesgeld = Math.max(0, input.tagesgeld - zielTagesgeld);
        const fromTagesgeld = Math.min(liquidityOutflow, availableFromTagesgeld);
        const fromGeldmarkt = Math.max(0, liquidityOutflow - fromTagesgeld);
        return {
            zielTagesgeld,
            fromTagesgeld,
            fromGeldmarkt,
            totalOutflow: liquidityOutflow
        };
    }

    // Removed determineInternalCashRebalance logic as it was replaced in previous steps? 
    // Wait, the previous tool call modified determineInternalCashRebalance. 
    // I should NOT replace that method here, but I AM replacing renderAction and buildInternalRebalance.
    // I need to be careful with line numbers.


    /**
     * Berechnet interne Cash-Umschichtungen nach einer Transaktion.
     *
     * @param {Object|null} input - Originale Eingabedaten des Nutzers.
     * @param {Object} action - Handlungsempfehlung, insbesondere Verwendungsströme.
     * @param {Object} spending - Entnahmedaten zur Ableitung der Jahresentnahme.
     * @param {number} [targetLiquidity] - (Optional) Ziel-Liquidität aus der Engine.
     * @returns {Object|null} Handlungsvorschlag für ein internes Rebalancing.
     */
    determineInternalCashRebalance(input, action, spending, targetLiquidity) {

        console.log('DEBUG_RENDERER_CASH:', {
            inputTagesgeld: input?.tagesgeld,
            targetLiquidityArg: targetLiquidity,
            spendingMonatlich: spending?.monatlicheEntnahme
        });


        if (!input || typeof input.tagesgeld !== 'number' || typeof input.geldmarktEtf !== 'number') {
            console.warn('ActionRenderer.determineInternalCashRebalance: Input-Daten fehlen oder sind unvollständig.');
            return null;
        }


        const zielTagesgeld = this._resolveZielTagesgeld(spending, targetLiquidity);

        if (!isFinite(zielTagesgeld)) {
            // console.warn('ActionRenderer.determineInternalCashRebalance: Kein Ziel-Tagesgeld ermittelbar.');
            return null;
        }

        const split = this._splitLiquiditySource(input, action, spending, targetLiquidity) || {
            zielTagesgeld,
            fromTagesgeld: 0,
            fromGeldmarkt: 0,
            totalOutflow: 0
        };
        const liqZufluss = (action.verwendungen?.liquiditaet || 0); // Money coming IN from sales

        const tagesgeldAfterOutflow = input.tagesgeld - split.fromTagesgeld;
        const gapToTarget = Math.max(0, zielTagesgeld - tagesgeldAfterOutflow);
        const inflowToTagesgeld = Math.min(liqZufluss, gapToTarget);
        const virtualTagesgeld = tagesgeldAfterOutflow + inflowToTagesgeld;
        const diff = virtualTagesgeld - zielTagesgeld; // positive = excess, negative = need refill

        const schwelle = UIUtils.getThreshold('THRESHOLDS.STRATEGY.cashRebalanceThreshold', 2500);

        if (diff > schwelle) {
            // FIX: Use FLOOR for excess to be safe and NOT drain below target
            const amount = this._quantize(diff, 'floor');
            if (amount > 0) {
                return { from: 'Tagesgeld', to: 'Geldmarkt-ETF', amount: amount };
            }
        } else if (diff < -schwelle) {
            const needed = Math.abs(diff);
            const geldmarktAfterOutflow = input.geldmarktEtf - split.fromGeldmarkt + (liqZufluss - inflowToTagesgeld);
            let canRefill = Math.min(needed, geldmarktAfterOutflow);

            // Only quantize if significantly large (floor to avoid overdraw)
            canRefill = this._quantize(canRefill, 'floor');
            canRefill = Math.min(canRefill, geldmarktAfterOutflow);

            if (canRefill > 0) {
                return { from: 'Geldmarkt-ETF', to: 'Tagesgeld', amount: canRefill };
            }
        }
        return null;
    }
    /**
     * Quantizes an amount based on the Engine's Anti-Pseudo-Accuracy rules.
     * Replicates the logic from TransactionEngine.
     * @param {number} amount 
     * @param {string} [mode='ceil'] - 'ceil' or 'floor'
     * @returns {number} Quantized amount
     */
    _quantize(amount, mode = 'ceil') {
        if (amount < 0) return 0;

        // Fetch config via global API
        const config = (window.EngineAPI && window.EngineAPI.getConfig && window.EngineAPI.getConfig())
            ? window.EngineAPI.getConfig().ANTI_PSEUDO_ACCURACY
            : { ENABLED: true, QUANTIZATION_TIERS: [] }; // Fallback defaults

        if (!config || !config.ENABLED) return Math.floor(amount);

        // Find tier
        const tiers = config.QUANTIZATION_TIERS || [];
        const tier = tiers.find(t => amount < t.limit);
        const step = tier ? tier.step : 25000; // Use 25k as default step for large amounts

        if (mode === 'floor') {
            return Math.floor(amount / step) * step;
        }
        return Math.ceil(amount / step) * step;
    }


    // determineInternalCashRebalance remains here...

    // buildInternalRebalance REMOVED

    /**
     * Baut die Inhaltsstruktur für Transaktions-Empfehlungen auf.
     *
     * @param {Object} action - Handlungsempfehlung mit Quellen und Verwendungen.
     * @param {HTMLElement} content - Container, der befüllt werden soll.
     */
    _buildTransactionContent(action, content, input, spending, targetLiquidity) {
        const title = document.createElement('strong');
        title.style.cssText = 'display: block; font-size: 1.1rem; margin-bottom: 8px; text-align:center;';
        title.textContent = action.title;
        if (action.isPufferSchutzAktiv) {
            const badge = document.createElement('span');
            badge.className = 'strategy-badge';
            badge.textContent = 'PUFFER-SCHUTZ';
            title.append(document.createTextNode(' '), badge);
        }

        const createSection = (titleText, items) => {
            // Detailblöcke bleiben auch im Einfach-Modus sichtbar und liefern die nachvollziehbaren Schritte.
            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 12px;';
            wrapper.classList.add('action-detail-block');
            const head = document.createElement('strong');
            head.style.cssText = 'display:block; border-bottom: 1px solid var(--border-color); padding-bottom: 5px; margin-bottom: 8px;';
            head.textContent = titleText;
            wrapper.appendChild(head);
            items.forEach(item => wrapper.appendChild(item));
            return wrapper;
        };

        const createRow = (label, value) => {
            const row = document.createElement('div');
            row.style.cssText = 'display:flex; justify-content:space-between;';
            const labelSpan = document.createElement('span');
            labelSpan.textContent = label;
            const valueSpan = document.createElement('span');
            valueSpan.textContent = value;
            row.append(labelSpan, valueSpan);
            return row;
        };

        const quellenMap = {
            'gold': 'Gold',
            'aktien_neu': 'Aktien (neu)',
            'aktien_alt': 'Aktien (alt)',
            'liquiditaet': 'Liquidität (Cash)',
            'geldmarkt': 'Geldmarkt-ETF'
        };

        const buildQuelleLabel = (q) => {
            const base = quellenMap[q.kind] || q.kind || 'Quelle';
            const infoParts = [];
            if (q.name) infoParts.push(q.name);
            if (!infoParts.length) return `- ${base}`;
            return `- ${base} - ${infoParts.join(', ')}`;
        };
        const quellenList = Array.isArray(action.quellen) ? action.quellen : [];
        const split = this._splitLiquiditySource(input, action, spending, targetLiquidity);
        const quellenItems = [];
        quellenList.forEach(q => {
            if (q.kind === 'liquiditaet' && split && split.totalOutflow > 0) {
                if (split.fromTagesgeld > 0) {
                    quellenItems.push(createRow('- Tagesgeld', UIUtils.formatCurrency(split.fromTagesgeld)));
                }
                if (split.fromGeldmarkt > 0) {
                    quellenItems.push(createRow('- Geldmarkt-ETF', UIUtils.formatCurrency(split.fromGeldmarkt)));
                }
                return;
            }
            quellenItems.push(createRow(buildQuelleLabel(q), UIUtils.formatCurrency(q.brutto || 0)));
        });
        const steuerRow = createRow('- Steuern (geschätzt)', UIUtils.formatCurrency(action.steuer || 0));
        steuerRow.style.cssText += 'border-top: 1px solid var(--border-color); margin-top: 5px; padding-top: 5px;';
        quellenItems.push(steuerRow);

        const verwendungenItems = [];
        const annualWithdrawal = (typeof action?.spending?.monatlicheEntnahme === 'number' && isFinite(action.spending.monatlicheEntnahme))
            ? action.spending.monatlicheEntnahme * 12
            : null;
        if (annualWithdrawal) {
            const zielTagesgeld = annualWithdrawal + (action.spending.monatlicheEntnahme * 2);
            verwendungenItems.push(createRow('Ziel Tagesgeld (Jahr + 2 Monate):', UIUtils.formatCurrency(zielTagesgeld)));
        }
        const minVisibleUse = 1000;
        if (action.verwendungen?.liquiditaet > minVisibleUse) {
            verwendungenItems.push(createRow('Zufluss Liquidität:', UIUtils.formatCurrency(action.verwendungen.liquiditaet)));
        }
        if (action.verwendungen?.gold > 0) verwendungenItems.push(createRow('Kauf von Gold:', UIUtils.formatCurrency(action.verwendungen.gold)));
        if (action.verwendungen?.aktien > 0) verwendungenItems.push(createRow('Kauf von Aktien:', UIUtils.formatCurrency(action.verwendungen.aktien)));
        if (action.verwendungen?.geldmarkt > 0) verwendungenItems.push(createRow('Kauf von Geldmarkt-ETF:', UIUtils.formatCurrency(action.verwendungen.geldmarkt)));

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'text-align: left; font-size: 1rem; line-height: 1.6;';
        // Titel + strukturierte Blöcke reichen aus; eine zusätzliche Kurz-Zusammenfassung würde die Angaben nur duplizieren.
        wrapper.append(
            title,
            createSection(`A. Quellen (Netto: ${UIUtils.formatCurrency(action.nettoErlös || 0)})`, quellenItems),
            createSection('B. Verwendungen', verwendungenItems)
        );
        content.appendChild(wrapper);
    }
}


/**
 * Renderer für Diagnoseansichten (Chips, Entscheidungsbaum, Kennzahlen).
 * Bündelt alle Diagnose-spezifischen Formatierungen und DOM-Schreiboperationen.
 */
class DiagnosisRenderer {
    /**
     * @param {Object} domRefs - DOM-Referenzen für Diagnosebereiche.
     */
    constructor(domRefs) {
        this.dom = domRefs;
    }

    /**
     * Formatiert die Rohdaten aus der Engine für die Diagnoseansicht.
     *
     * @param {Object|null} raw - Unformatierte Diagnose.
     * @returns {Object|null} Formatierte Diagnose oder null.
     */
    formatPayload(raw) {
        if (!raw) return null;
        const formatted = { ...raw };
        const guardrails = Array.isArray(raw.guardrails) ? raw.guardrails : [];
        formatted.guardrails = guardrails.map(g => {
            const rule = g.rule || 'max';
            let status = 'ok';
            if ((rule === 'max' && g.value > g.threshold) || (rule === 'min' && g.value < g.threshold)) {
                status = 'danger';
            } else if ((rule === 'max' && g.value > g.threshold * 0.90) || (rule === 'min' && g.value < g.threshold * 1.10)) {
                status = 'warn';
            }
            const formatVal = (value, type, opts = {}) => {
                const { invertPositive = false } = opts;
                if (typeof value !== 'number' || !isFinite(value)) {
                    return 'N/A';
                }
                const needsPrefix = invertPositive && value > 0;
                switch (type) {
                    case 'percent':
                        if (needsPrefix) {
                            return `-${(Math.abs(value) * 100).toFixed(1)}%`;
                        }
                        return `${(value * 100).toFixed(1)}%`;
                    case 'months':
                        return `${value.toFixed(0)} Mon.`;
                    case 'currency': {
                        const formattedCurrency = UIUtils.formatCurrency(value);
                        if (!needsPrefix) return formattedCurrency;
                        const sanitized = formattedCurrency.replace(/^[\-–−]/, '').trim();
                        return `-${sanitized}`;
                    }
                    default:
                        if (needsPrefix) {
                            return `-${Math.abs(value).toFixed(1)}`;
                        }
                        return value.toFixed(1);
                }
            };
            const formattedValue = formatVal(g.value, g.type, { invertPositive: g.name.includes('Drawdown') });
            const formattedThreshold = `${rule === 'max' ? '< ' : '> '}${formatVal(g.threshold, g.type)}`;
            return {
                name: g.name,
                value: formattedValue,
                threshold: formattedThreshold,
                status
            };
        });
        const safeKeyParams = { ...(raw.keyParams || {}) };
        const ensureNumberOrNull = (value) => (typeof value === 'number' && isFinite(value)) ? value : null;
        safeKeyParams.aktuelleFlexRate = ensureNumberOrNull(safeKeyParams.aktuelleFlexRate);
        safeKeyParams.kuerzungProzent = ensureNumberOrNull(safeKeyParams.kuerzungProzent);
        safeKeyParams.jahresentnahme = ensureNumberOrNull(safeKeyParams.jahresentnahme);
        formatted.keyParams = safeKeyParams;
        return formatted;
    }

    /**
     * Rendert die Diagnosebereiche in den jeweiligen Containern.
     *
     * @param {Object} diagnosis - Formatierte Diagnose-Daten.
     */
    renderDiagnosis(diagnosis) {
        if (!diagnosis || !this.dom?.diagnosis) return;
        this.dom.diagnosis.chips?.replaceChildren(this.buildChips(diagnosis));
        this.dom.diagnosis.decisionTree?.replaceChildren(this.buildDecisionTree(diagnosis.decisionTree));
        this.dom.diagnosis.guardrails?.replaceChildren(this.buildGuardrails(diagnosis.guardrails));
        if (this.dom.diagnosis.transaction) {
            this.dom.diagnosis.transaction.replaceChildren(
                this.buildTransactionDiagnostics(diagnosis.transactionDiagnostics)
            );
        }
        this.dom.diagnosis.keyParams?.replaceChildren(this.buildKeyParams(diagnosis.keyParams));
    }

    /**
     * Baut Diagnose-Chips basierend auf den Kennzahlen.
     *
     * @param {Object} d - Diagnose-Daten.
     * @returns {DocumentFragment} Fragment mit Chip-Elementen.
     */
    buildChips(d) {
        const { entnahmequoteDepot, realerDepotDrawdown } = d.keyParams;
        const {
            runwayMonate,
            runwayTargetMonate,
            runwayStatus,
            runwayTargetQuelle,
            deckungVorher,
            deckungNachher
        } = d.general;

        const ALARM_withdrawalRate = UIUtils.getThreshold('THRESHOLDS.ALARM.withdrawalRate', 0.055);
        const CAUTION_withdrawalRate = UIUtils.getThreshold('THRESHOLDS.CAUTION.withdrawalRate', 0.045);
        const ALARM_realDrawdown = UIUtils.getThreshold('THRESHOLDS.ALARM.realDrawdown', 0.25);
        const STRATEGY_runwayThinMonths = UIUtils.getThreshold('THRESHOLDS.STRATEGY.runwayThinMonths', 24);

        const qStatus = entnahmequoteDepot > ALARM_withdrawalRate ? 'danger' : entnahmequoteDepot > CAUTION_withdrawalRate ? 'warn' : 'ok';
        const ddStatus = realerDepotDrawdown > ALARM_realDrawdown ? 'danger' : realerDepotDrawdown > 0.15 ? 'warn' : 'ok';
        const safeRunway = (typeof runwayMonate === 'number' && isFinite(runwayMonate)) ? runwayMonate : 0;
        const normalizedRunwayStatus = (status) => {
            if (status === 'bad') return 'danger';
            if (status === 'warn') return 'warn';
            return status === 'ok' ? 'ok' : null;
        };
        const derivedRunwayStatus = normalizedRunwayStatus(runwayStatus);
        const fallbackRunwayStatus = safeRunway > 36 ? 'ok' : safeRunway >= STRATEGY_runwayThinMonths ? 'warn' : 'danger';
        const rStatus = derivedRunwayStatus || fallbackRunwayStatus;
        const formatMonths = (value) => (typeof value === 'number' && isFinite(value))
            ? value.toFixed(0)
            : '∞';
        const runwaySourceInfo = UIUtils.describeRunwayTargetSource(runwayTargetQuelle);
        const runwayChipValue = (typeof runwayTargetMonate === 'number' && isFinite(runwayTargetMonate))
            ? `${formatMonths(runwayMonate)} / ${formatMonths(runwayTargetMonate)} Mon.`
            : `${formatMonths(runwayMonate)} Mon.`;
        const runwayChipTitle = (typeof runwayTargetMonate === 'number' && isFinite(runwayTargetMonate))
            ? `Aktuelle Runway vs. Ziel (${runwayTargetMonate.toFixed(0)} Monate).
Quelle: ${runwaySourceInfo.description}`
            : `Aktuelle Runway basierend auf verfügbaren Barmitteln.
Quelle: ${runwaySourceInfo.description}`;

        const createChip = (status, label, value, title) => {
            const chip = document.createElement('span');
            chip.className = `diag-chip status-${status}`;
            chip.title = title || '';
            const labelEl = document.createElement('span');
            labelEl.className = 'label';
            labelEl.textContent = label;
            chip.append(labelEl, document.createTextNode(value));
            return chip;
        };
        const fragment = document.createDocumentFragment();
        const formatPercentValue = (value) => (typeof value === 'number' && isFinite(value))
            ? `${value.toFixed(0)}%`
            : 'n/a';
        const liquidityChipValue = `${formatPercentValue(deckungVorher)} → ${formatPercentValue(deckungNachher)}`;
        const liquidityChipTitle = 'Liquiditätsdeckung vor und nach der empfohlenen Transaktion relativ zum Zielpuffer.';
        const normalizedCoverage = (typeof deckungNachher === 'number' && isFinite(deckungNachher)) ? deckungNachher : 0;
        const liquidityStatus = normalizedCoverage >= 100 ? 'ok'
            : normalizedCoverage >= UIUtils.getThreshold('THRESHOLDS.STRATEGY.runwayThinPercent', 80) ? 'warn'
                : 'danger';
        fragment.append(
            createChip('info', 'Regime', d.general.marketSzenario),
            createChip(d.general.alarmActive ? 'danger' : 'ok', 'Alarm', d.general.alarmActive ? 'AKTIV' : 'Inaktiv'),
            createChip(qStatus, 'Quote', `${(entnahmequoteDepot * 100).toFixed(1)}%`, 'Entnahmequote = Jährliche Entnahme / Depotwert'),
            createChip(ddStatus, 'Drawdown', `${(realerDepotDrawdown * -100).toFixed(1)}%`, 'Realer Drawdown des Gesamtvermögens seit dem inflationsbereinigten Höchststand'),
            createChip(liquidityStatus, 'Liquidität', liquidityChipValue, liquidityChipTitle),
            createChip(rStatus, 'Runway', runwayChipValue, runwayChipTitle)
        );

        if (runwaySourceInfo?.label) {
            const runwaySourceNote = document.createElement('small');
            runwaySourceNote.className = 'chip-note runway-source-note';
            runwaySourceNote.textContent = `Runway-Ziel basiert auf: ${runwaySourceInfo.label}`;
            fragment.appendChild(runwaySourceNote);
        }
        return fragment;
    }

    /**
     * Erstellt den Entscheidungsbaum für die Diagnose.
     *
     * @param {Array} treeData - Schritte des Entscheidungsbaums.
     * @returns {DocumentFragment} Fragment mit Listenelementen.
     */
    buildDecisionTree(treeData = []) {
        const fragment = document.createDocumentFragment();
        treeData.forEach(item => {
            const li = document.createElement('li');
            let severity = item.severity || 'info';
            if (item.step.toLowerCase().includes('cap wirksam')) {
                severity = 'guardrail';
            }

            li.className = `${item.status} severity-${severity} ${item.status === 'inactive' ? 'decision-inactive' : ''}`;
            li.textContent = item.step + ' ';
            const impact = document.createElement('span');
            impact.className = 'impact';
            impact.textContent = item.impact;
            li.appendChild(impact);
            fragment.appendChild(li);
        });
        return fragment;
    }

    /**
     * Baut die Guardrail-Karten auf Basis der Schwellenwerte.
     *
     * @param {Array} guardrailData - Guardrail-Liste.
     * @returns {DocumentFragment} Fragment mit Karten.
     */
    buildGuardrails(guardrailData = []) {
        const fragment = document.createDocumentFragment();
        guardrailData.forEach(g => {
            const card = document.createElement('div');
            card.className = `guardrail-card status-${g.status} ${g.status === 'ok' ? 'guardrail-ok' : ''}`;
            const name = document.createElement('strong');
            name.textContent = g.name;
            const value = document.createElement('div');
            value.className = 'value';
            value.textContent = g.value;
            const threshold = document.createElement('div');
            threshold.className = 'threshold';
            threshold.textContent = `Schwelle: ${g.threshold}`;
            card.append(name, value, threshold);
            fragment.appendChild(card);
        });
        return fragment;
    }

    /**
     * Baut den Diagnoseabschnitt für Transaktions-Diagnostics auf.
     *
     * @param {Object|null} transactionDiag - Rohdaten aus der Engine, können fehlen.
     * @returns {DocumentFragment} – Fertiger DOM-Baum für das Panel.
     */
    buildTransactionDiagnostics(transactionDiag) {
        const fragment = document.createDocumentFragment();

        if (!transactionDiag || typeof transactionDiag !== 'object') {
            const emptyState = document.createElement('p');
            emptyState.className = 'diag-empty-state';
            emptyState.textContent = 'Keine Transaktionsdiagnostik verfügbar.';
            fragment.appendChild(emptyState);
            return fragment;
        }

        const statusMeta = this._determineTransactionStatus(transactionDiag);
        const summaryRows = [
            { label: 'Ausgelöst?', value: transactionDiag.wasTriggered ? 'Ja' : 'Nein' },
            { label: 'Blockgrund', value: statusMeta.label },
            {
                label: 'Blockierter Betrag',
                value: UIUtils.formatCurrency(transactionDiag.blockedAmount || 0)
            }
        ];

        if (transactionDiag.potentialTrade && typeof transactionDiag.potentialTrade === 'object') {
            const trade = transactionDiag.potentialTrade;
            const descriptor = [trade.direction || trade.kind || 'Unbekannte Aktion'];
            if (typeof trade.netAmount === 'number') {
                descriptor.push(UIUtils.formatCurrency(trade.netAmount));
            } else if (typeof trade.netto === 'number') {
                descriptor.push(UIUtils.formatCurrency(trade.netto));
            }
            summaryRows.push({
                label: 'Geplante Aktion',
                value: descriptor.filter(Boolean).join(' · ')
            });
        }

        fragment.appendChild(this._createTransactionCard({
            title: 'Transaktionsstatus',
            subtitle: statusMeta.subtitle,
            rows: summaryRows
        }, statusMeta.status));

        const thresholdCards = [
            this._describeThresholdGroup('Aktien-Grenzen', transactionDiag.equityThresholds),
            this._describeThresholdGroup('Gold-Grenzen', transactionDiag.goldThresholds)
        ].filter(Boolean);

        thresholdCards.forEach(card => fragment.appendChild(card));

        if (Array.isArray(transactionDiag.selectedTranches) && transactionDiag.selectedTranches.length > 0) {
            const rows = transactionDiag.selectedTranches.map(item => {
                const labelParts = [];
                if (item.name) labelParts.push(item.name);
                labelParts.push(item.kind || 'Tranche');
                const taxPct = (typeof item.taxPerEuro === 'number' && isFinite(item.taxPerEuro))
                    ? `${(item.taxPerEuro * 100).toFixed(2)}%`
                    : '0.00%';
                const taxVal = UIUtils.formatCurrency(item.steuer || 0);
                const bruttoVal = UIUtils.formatCurrency(item.brutto || 0);
                return {
                    label: labelParts.filter(Boolean).join(' / '),
                    value: `Steuer/€ ${taxPct} | Brutto ${bruttoVal} | Steuer ${taxVal}`
                };
            });
            fragment.appendChild(this._createTransactionCard({
                title: 'Tranchenauswahl (Steuerlast)',
                subtitle: 'Geringste Steuerlast zuerst',
                rows
            }, 'info'));
        }

        return fragment;
    }

    /**
     * Bestimmt Statusfarbe und Beschreibung für die Transaktionsdiagnostik.
     *
     * @param {Object} diag - Diagnosewerte aus der Engine.
     * @returns {{status: string, label: string, subtitle: string}} Statusinformationen.
     */
    _determineTransactionStatus(diag) {
        const reasonKey = (diag.blockReason || 'none').toLowerCase();
        const statusMap = {
            none: 'ok',
            min_trade: 'warn',
            liquidity_sufficient: 'info',
            guardrail_block: 'danger',
            cap_active: 'warn',
            gold_floor: 'danger'
        };
        const labelMap = {
            none: 'Keine Blockade',
            min_trade: 'Unter Mindestgröße',
            liquidity_sufficient: 'Liquidität ausreichend',
            guardrail_block: 'Guardrail verhindert Verkauf',
            cap_active: 'Cap begrenzt Trade',
            gold_floor: 'Gold-Floor aktiv'
        };

        const status = statusMap[reasonKey] || (diag.wasTriggered ? 'ok' : 'info');
        const label = labelMap[reasonKey] || reasonKey.replace(/[_-]/g, ' ');
        const subtitle = (diag.blockReason && diag.blockReason !== 'none')
            ? `Grundcode: ${diag.blockReason}`
            : 'Keine Einschränkungen gemeldet';

        return { status, label, subtitle };
    }

    /**
     * Baut eine einheitliche Diagnosekarte mit Status.
     *
     * @param {{title: string, subtitle?: string, rows: Array<{label: string, value: string}>}} config - Anzeigeparameter.
     * @param {string} status - status-ok/status-warn/status-danger etc.
     * @returns {HTMLElement} Fertige Karte.
     */
    _createTransactionCard(config, status = 'info') {
        const card = document.createElement('div');
        card.className = `guardrail-card status-${status}`;
        const title = document.createElement('strong');
        title.textContent = config.title;
        card.appendChild(title);

        if (config.subtitle) {
            const subtitle = document.createElement('div');
            subtitle.className = 'threshold';
            subtitle.textContent = config.subtitle;
            card.appendChild(subtitle);
        }

        config.rows.forEach(row => {
            const rowEl = document.createElement('div');
            rowEl.className = 'value-row';
            const labelEl = document.createElement('span');
            labelEl.className = 'label';
            labelEl.textContent = `${row.label}:`;
            const valueEl = document.createElement('span');
            valueEl.className = 'value';
            valueEl.textContent = row.value || 'n/a';
            rowEl.append(labelEl, valueEl);
            card.appendChild(rowEl);
        });

        return card;
    }

    /**
     * Erstellt Karten für Schwellenwerte einzelner Asset-Klassen.
     *
     * @param {string} label - Titel der Karte.
     * @param {Object} thresholds - Schwellenwerte laut Engine.
     * @returns {HTMLElement|null} Karte oder null, falls keine Daten vorhanden.
     */
    _describeThresholdGroup(label, thresholds) {
        if (!thresholds || typeof thresholds !== 'object' || Object.keys(thresholds).length === 0) {
            return null;
        }

        const entries = Object.entries(thresholds);
        const lower = entries.find(([key]) => /lower|min/i.test(key));
        const upper = entries.find(([key]) => /upper|max/i.test(key));
        const current = entries.find(([key]) => /current|ist|actual/i.test(key));

        const currentValue = (current && typeof current[1] === 'number') ? current[1] : null;
        const lowerValue = (lower && typeof lower[1] === 'number') ? lower[1] : null;
        const upperValue = (upper && typeof upper[1] === 'number') ? upper[1] : null;

        let status = 'info';
        if (currentValue !== null) {
            if ((lowerValue !== null && currentValue < lowerValue) ||
                (upperValue !== null && currentValue > upperValue)) {
                status = 'danger';
            } else if (
                (lowerValue !== null && currentValue < lowerValue * 1.05) ||
                (upperValue !== null && currentValue > upperValue * 0.95)
            ) {
                status = 'warn';
            } else {
                status = 'ok';
            }
        }

        const rows = entries.map(([key, value]) => ({
            label: this._formatThresholdLabel(key),
            value: this._formatThresholdValue(key, value)
        }));

        return this._createTransactionCard({
            title: label,
            rows
        }, status);
    }

    /**
     * Formatiert technische Feldnamen zu sprechenden Beschriftungen.
     *
     * @param {string} key - Originalschlüssel.
     * @returns {string} Lesbare Beschriftung.
     */
    _formatThresholdLabel(key) {
        const normalized = (key || '').toLowerCase().replace(/[^a-z0-9]/g, '');
        return THRESHOLD_LABEL_MAP[normalized] || key || '—';
    }

    /**
     * Formatiert numerische Schwellenwerte abhängig von Typ und Kontext.
     *
     * @param {string} key - Schwellenwertschlüssel.
     * @param {number} value - Zahlenwert.
     * @returns {string} Formatiertes Label.
     */
    _formatThresholdValue(key, value) {
        if (typeof value !== 'number' || !isFinite(value)) {
            return 'n/a';
        }
        if (/pct|percent/i.test(key)) {
            // Heuristik: Werte > 1.5 werden als "bereits Prozent" (0-100) interpretiert,
            // Werte <= 1.5 als Fraction (0-1). Behebt den "6000%" Anzeigefehler.
            if (Math.abs(value) > 1.5) {
                return `${value.toFixed(1)}%`;
            }
            return `${(value * 100).toFixed(1)}%`;
        }
        if (/monate|months|mon/i.test(key)) {
            return `${value.toFixed(0)} Mon.`;
        }
        return UIUtils.formatCurrency(value);
    }

    /**
     * Baut die Sektion mit Schlüsselparametern (Kennzahlen) auf.
     *
     * @param {Object} params - Schlüsselparameter aus der Diagnose.
     * @returns {HTMLElement} Grid mit den Kennzahlen.
     */
    buildKeyParams(params = {}) {
        const metrics = [];

        const formatPercent = (value, { fractionDigits = 1, prefixPlus = false } = {}) => {
            if (typeof value !== 'number' || !isFinite(value)) {
                return null;
            }
            const sign = value > 0 ? '+' : '';
            return `${prefixPlus ? sign : ''}${(value * 100).toFixed(fractionDigits)}%`;
        };
        const formatPercentFromPct = (value, { fractionDigits = 1, prefixPlus = false } = {}) => {
            if (typeof value !== 'number' || !isFinite(value)) {
                return null;
            }
            const sign = value > 0 ? '+' : '';
            return `${prefixPlus ? sign : ''}${value.toFixed(fractionDigits)}%`;
        };

        const formatCurrencySafe = (value) => {
            if (typeof value !== 'number' || !isFinite(value)) {
                return null;
            }
            return UIUtils.formatCurrency(value);
        };

        const pushMetric = ({ label, value, meta = null, trend = 'neutral' }) => {
            if (typeof value !== 'string' || !value.trim()) {
                return;
            }
            metrics.push({ label, value, meta, trend });
        };

        const peakValue = formatCurrencySafe(params.peakRealVermoegen);
        if (peakValue) {
            pushMetric({
                label: 'Peak (real)',
                value: peakValue,
                meta: 'Historischer Höchststand'
            });
        }

        const currentValue = formatCurrencySafe(params.currentRealVermoegen);
        if (currentValue) {
            let deltaMeta = null;
            let trend = 'neutral';
            if (typeof params.peakRealVermoegen === 'number' && isFinite(params.peakRealVermoegen) && params.peakRealVermoegen !== 0) {
                const delta = params.currentRealVermoegen - params.peakRealVermoegen;
                const deltaAbs = Math.abs(delta);
                const deltaPercent = (delta / params.peakRealVermoegen) * 100;
                const sign = delta >= 0 ? '+' : '−';
                const formattedDelta = UIUtils.formatCurrency(deltaAbs).replace(/^[-–−]/, '').trim();
                deltaMeta = `${sign}${formattedDelta} vs. Peak (${deltaPercent >= 0 ? '+' : '−'}${Math.abs(deltaPercent).toFixed(1)}%)`;
                trend = delta > 0 ? 'up' : delta < 0 ? 'down' : 'neutral';
            }
            pushMetric({
                label: 'Aktuell (real)',
                value: currentValue,
                meta: deltaMeta,
                trend
            });
        }

        const inflationPercent = (typeof params.cumulativeInflationFactor === 'number' && isFinite(params.cumulativeInflationFactor))
            ? (params.cumulativeInflationFactor - 1)
            : null;
        const formattedInflation = formatPercent(inflationPercent, { prefixPlus: true });
        if (formattedInflation) {
            pushMetric({
                label: 'Kumulierte Inflation',
                value: formattedInflation,
                meta: 'Seit Modellstart'
            });
        }

        if (typeof params.aktuelleFlexRate === 'number' && isFinite(params.aktuelleFlexRate)) {
            pushMetric({
                label: 'Effektive Flex-Rate',
                value: formatPercentFromPct(params.aktuelleFlexRate, { fractionDigits: 1 }),
                meta: 'Geplante Entnahmedynamik'
            });
        }

        if (typeof params.kuerzungProzent === 'number' && isFinite(params.kuerzungProzent)) {
            const trend = params.kuerzungProzent > 0 ? 'down' : params.kuerzungProzent < 0 ? 'up' : 'neutral';
            pushMetric({
                label: 'Kürzung ggü. Flex-Bedarf',
                value: formatPercentFromPct(params.kuerzungProzent, { fractionDigits: 1 }),
                meta: 'Abweichung zum Soll',
                trend
            });
        }

        if (typeof params.jahresentnahme === 'number' && isFinite(params.jahresentnahme)) {
            pushMetric({
                label: 'Jahresentnahme (brutto)',
                value: formatCurrencySafe(params.jahresentnahme),
                meta: 'Geplante Auszahlung'
            });
        }

        const grid = document.createElement('div');
        grid.className = 'key-param-grid';

        if (!metrics.length) {
            const empty = document.createElement('p');
            empty.textContent = 'Keine Schlüsselparameter vorhanden.';
            empty.style.fontSize = '.85rem';
            empty.style.color = 'var(--secondary-text)';
            grid.append(empty);
            return grid;
        }

        metrics.forEach(metric => {
            const card = document.createElement('div');
            card.className = 'key-param-card';
            card.dataset.trend = metric.trend;

            const label = document.createElement('span');
            label.className = 'label';
            label.textContent = metric.label;

            const value = document.createElement('span');
            value.className = 'value';
            value.textContent = metric.value;

            card.append(label, value);

            if (metric.meta) {
                const meta = document.createElement('span');
                meta.className = 'meta';
                meta.textContent = metric.meta;
                card.append(meta);
            }

            grid.append(card);
        });

        return grid;
    }
}

/**
 * Initialisiert den UIRenderer mit den notwendigen Abhängigkeiten.
 *
 * @param {Object} domRefs - Zentraler DOM-Baum.
 * @param {Object} storageManager - Storage-Adapter für Fallbacks.
 */
export function initUIRenderer(domRefs, storageManager) {
    dom = domRefs;
    StorageManager = storageManager;
    summaryRenderer = new SummaryRenderer(domRefs, storageManager);
    actionRenderer = new ActionRenderer(domRefs);
    diagnosisRenderer = new DiagnosisRenderer(domRefs);
}

/**
 * Fassade für alle UI-Render-Aufgaben. Orchestriert spezialisierte Renderer
 * und kapselt generische Utility-Funktionen (Fehler, Toasts).
 */
export const UIRenderer = {
    /**
     * Orchestriert das Rendering der Gesamtoberfläche.
     *
     * @param {Object} ui - Aufbereitete UI-Daten (inkl. input, action, spending, liquiditaet).
     */
    render(ui) {

        console.log('DEBUG_UI_RENDER:', {
            uiKeys: Object.keys(ui || {}),
            zielLiquiditaet: ui?.zielLiquiditaet,
            inLiquiditaetObj: ui?.liquiditaet,
            actionHasZiel: ui?.action?.zielLiquiditaet
        });

        if (!summaryRenderer || !actionRenderer) {
            console.warn('UIRenderer.render: Renderer nicht initialisiert.');
            return;
        }
        summaryRenderer.renderOverview(ui);
        actionRenderer.renderAction(ui?.action, ui?.input, ui?.spending, ui?.zielLiquiditaet);
    },

    /**
     * Delegiert die UI zur Bedarfsanpassung.
     *
     * @param {Object} inputData - Eingaben des Nutzers.
     * @param {Object} persistentState - Persistenter Zustand.
     */
    renderBedarfAnpassungUI(inputData, persistentState) {
        summaryRenderer?.renderBedarfAnpassungUI(inputData, persistentState);
    },

    /**
     * Reicht formatierte Diagnose-Daten an den DiagnosisRenderer durch.
     *
     * @param {Object} diagnosis - Diagnose-Struktur aus der Engine.
     */
    renderDiagnosis(diagnosis) {
        diagnosisRenderer?.renderDiagnosis(diagnosis);
    },

    /**
     * Formatiert Diagnose-Rohdaten über den DiagnosisRenderer.
     *
     * @param {Object|null} raw - Unformatierte Diagnose.
     * @returns {Object|null} Formatierte Diagnose.
     */
    formatDiagnosisPayload(raw) {
        return diagnosisRenderer?.formatPayload(raw);
    },

    /**
     * Zeigt Nutzerfeedback an.
     *
     * @param {string} msg - Meldungstext.
     * @param {boolean} [isSuccess=true] - Farbe/Typ der Meldung.
     */
    toast(msg, isSuccess = true) {
        const container = dom?.containers?.error;
        if (!container) return;
        container.classList.remove('error-warn');
        container.style.color = isSuccess ? 'var(--success-color)' : 'var(--danger-color)';
        container.textContent = msg;
        setTimeout(() => { container.textContent = ''; }, 3500);
    },

    /**
     * Zentrale Fehlerbehandlung für Validierungs- und Laufzeitfehler.
     *
     * @param {Error} error - Aufgetretener Fehler.
     */
    handleError(error) {
        const container = dom?.containers?.error;
        if (!container) return;
        container.className = 'error-warn';

        if (error instanceof ValidationError) {
            container.textContent = error.message;
            const ul = document.createElement('ul');
            error.errors.forEach(({ fieldId, message }) => {
                const li = document.createElement('li');
                li.textContent = message;
                ul.appendChild(li);
                const inputEl = dom.inputs[fieldId];
                if (inputEl) {
                    inputEl.classList.add('input-error');
                }
            });
            container.appendChild(ul);
        } else if (error instanceof AppError) {
            container.textContent = `Ein interner Fehler ist aufgetreten: ${error.message}`;
        } else {
            container.textContent = `Ein unerwarteter Anwendungsfehler ist aufgetreten: ${error.message || 'Unbekannter Fehler'}`;
        }
    },

    /**
     * Setzt die Fehleranzeige zurück und entfernt Feldmarkierungen.
     */
    clearError() {
        if (!dom?.containers?.error) return;
        dom.containers.error.textContent = '';
        dom.containers.error.className = '';
        Object.values(dom.inputs || {}).forEach(el => el.classList.remove('input-error'));
    }
};
