"use strict";

/**
 * ===================================================================================
 * BALANCE-APP UI-RENDERER
 * ===================================================================================
 */

import { UIUtils } from './balance-utils.js';
import { AppError, ValidationError } from './balance-config.js';

// Module-level references
let dom = null;
let StorageManager = null;

/**
 * Initialisiert den UIRenderer mit den notwendigen Abhängigkeiten
 */
export function initUIRenderer(domRefs, storageManager) {
    dom = domRefs;
    StorageManager = storageManager;
}

export const UIRenderer = {
    // DOM-SAFE: Nur textContent/DOM-APIs; kein innerHTML für dynamische Inhalte.
    render(ui) {
        // HINWEIS: 'ui' enthält jetzt auch 'ui.input' dank des Fixes in update()
        this.renderMiniSummary(ui);
        dom.outputs.depotwert.textContent = UIUtils.formatCurrency(ui.depotwertGesamt);
        dom.outputs.neuerBedarf.textContent = UIUtils.formatCurrency(ui.neuerBedarf);
        dom.outputs.minGoldDisplay.textContent = UIUtils.formatCurrency(ui.minGold);
        dom.outputs.zielLiquiditaet.textContent = UIUtils.formatCurrency(ui.zielLiquiditaet);
        this.renderEntnahme(ui.spending);
        this.renderMarktstatus(ui.market);
        // Übergibt ui.action und das notwendige ui.input an renderHandlungsanweisung
        this.renderHandlungsanweisung(ui.action, ui.input);
        this.renderLiquidityBar(ui.liquiditaet.deckungNachher);
    },

    renderBedarfAnpassungUI(inputData, persistentState) {
        const container = dom.containers.bedarfAnpassung;
        const currentAge = inputData.aktuellesAlter;
        const lastAdjustedAge = persistentState.ageAdjustedForInflation || 0;
        const inflation = inputData.inflation;

        let content = '';
        if (currentAge > lastAdjustedAge) {
            // Ein neues Jahr, eine Anpassung steht an
            content = `<button type="button" class="btn btn-sm btn-utility btn-apply-inflation">Bedarfe um ${inflation.toFixed(1)} % erhöhen</button>`;
        } else if (currentAge === lastAdjustedAge && lastAdjustedAge > 0) {
            // Anpassung für dieses Alter ist bereits erfolgt
            content = `<small style="color: var(--success-color);">✓ Bedarfe für Alter ${currentAge} sind aktuell.</small>`;
        }
        // Wenn currentAge < lastAdjustedAge, wird nichts angezeigt (z.B. bei Korrektur des Alters)

        container.innerHTML = content;
    },

    renderMiniSummary(ui) {
        let currentInput = ui.input;
        if (!currentInput) {
            console.warn("UIRenderer.renderMiniSummary: ui.input fehlt, versuche Fallback.");
            currentInput = StorageManager.loadState()?.inputs || UIReader.readAllInputs();
        }
        if (!currentInput) {
            console.error("UIRenderer.renderMiniSummary: Konnte keine Input-Daten laden!");
            dom.outputs.miniSummary.textContent = 'Fehler beim Laden der Input-Daten für Mini-Summary.';
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

        dom.outputs.miniSummary.replaceChildren(fragment);
    },

    renderEntnahme(spending) {
        dom.outputs.monatlicheEntnahme.replaceChildren(document.createTextNode(UIUtils.formatCurrency(spending.monatlicheEntnahme)));
        const small1 = document.createElement('small');
        small1.style.cssText = 'display:block; font-size:0.85em; opacity:0.8; margin-top: 4px;';
        small1.textContent = `(${UIUtils.formatCurrency(spending.monatlicheEntnahme * 12)} / Jahr)`;
        const small2 = document.createElement('small');
        small2.style.cssText = 'display:block; opacity:.8;';
        small2.textContent = spending.anmerkung.trim();
        dom.outputs.monatlicheEntnahme.append(small1, small2);

        if (spending.details) {
            dom.outputs.entnahmeDetailsContent.replaceChildren(this.buildEntnahmeDetails(spending.details, spending.kuerzungQuelle));
            dom.outputs.entnahmeBreakdown.style.display = 'block';
        } else {
            dom.outputs.entnahmeBreakdown.style.display = 'none';
        }
    },

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
    },

    renderMarktstatus(market) {
        dom.outputs.marktstatusText.replaceChildren(document.createTextNode(market.szenarioText + ' '));
        const info = document.createElement('span');
        info.style.cssText = 'cursor:help; opacity:0.7;';
        info.title = market.reasons.join(', ');
        info.textContent = 'ⓘ';
        dom.outputs.marktstatusText.appendChild(info);
    },

	determineInternalCashRebalance(input, liqNachTransaktion, jahresentnahme) {
        // Robustheits-Check: Nur mit validen Zahlen arbeiten
        if (!input || !isFinite(liqNachTransaktion) || !isFinite(jahresentnahme)) {
            return null;
        }

        const zielTagesgeld = jahresentnahme;
        const tagesgeldVorTransaktion = input.tagesgeld;
        const liqZufluss = liqNachTransaktion - (tagesgeldVorTransaktion + input.geldmarktEtf);
        const tagesgeldNachTransaktion = tagesgeldVorTransaktion + liqZufluss;
        const geldmarktNachTransaktion = input.geldmarktEtf;

        const umschichtungsbetrag = tagesgeldNachTransaktion - zielTagesgeld;

        // FEHLERBEHEBUNG: Sicherer Zugriff auf den Schwellenwert via Helper
        const schwelle = UIUtils.getThreshold('THRESHOLDS.STRATEGY.cashRebalanceThreshold', 2500);

        if (umschichtungsbetrag > schwelle) {
            return { from: 'Tagesgeld', to: 'Geldmarkt-ETF', amount: umschichtungsbetrag };
        } else if (umschichtungsbetrag < -schwelle) {
            const benoetigterBetrag = Math.abs(umschichtungsbetrag);
            if (geldmarktNachTransaktion >= benoetigterBetrag) {
                return { from: 'Geldmarkt-ETF', to: 'Tagesgeld', amount: benoetigterBetrag };
            }
        }
        return null;
    },

    buildInternalRebalance(data) {
        const div = document.createElement('div');
        div.style.cssText = 'font-size: 1rem; text-align: center; line-height: 1.5; font-weight: 500;';
        const strong = document.createElement('strong');
        strong.textContent = UIUtils.formatCurrency(data.amount);
        div.append(document.createTextNode(`${data.from} → ${data.to}: `), strong);
        return div;
    },

    // DOM-SAFE: Nur textContent/DOM-APIs; kein innerHTML für dynamische Inhalte.
    renderHandlungsanweisung(action, input) {
        const container = dom.outputs.handlungsanweisung;
        [...container.children].filter(n => n.id !== 'copyAction').forEach(n => n.remove());
        container.className = action.anweisungKlasse || 'anweisung-grau';

        const content = document.createElement('div');
        content.id = 'handlungContent';

        if (action.type === 'TRANSACTION') {
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
                const wrapper = document.createElement('div');
                wrapper.style.cssText = 'border: 1px solid var(--border-color); border-radius: 6px; padding: 10px; margin-bottom: 12px;';
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
            const quellenMap = { 'gold': 'Gold', 'aktien_neu': 'Aktien (neu)', 'aktien_alt': 'Aktien (alt)'};
            const quellenItems = action.quellen.map(q => createRow(`- ${quellenMap[q.kind]}`, UIUtils.formatCurrency(q.brutto)));
            const steuerRow = createRow('- Steuern (geschätzt)', UIUtils.formatCurrency(action.steuer));
            steuerRow.style.cssText += 'border-top: 1px solid var(--border-color); margin-top: 5px; padding-top: 5px;';
            quellenItems.push(steuerRow);

            const verwendungenItems = [];
            if (action.verwendungen.liquiditaet > 0) verwendungenItems.push(createRow('Liquidität auffüllen:', UIUtils.formatCurrency(action.verwendungen.liquiditaet)));
            if (action.verwendungen.gold > 0) verwendungenItems.push(createRow('Kauf von Gold:', UIUtils.formatCurrency(action.verwendungen.gold)));
            if (action.verwendungen.aktien > 0) verwendungenItems.push(createRow('Kauf von Aktien:', UIUtils.formatCurrency(action.verwendungen.aktien)));

            const wrapper = document.createElement('div');
            wrapper.style.cssText = 'text-align: left; font-size: 1rem; line-height: 1.6;';
            wrapper.append(title, createSection(`A. Quellen (Netto: ${UIUtils.formatCurrency(action.nettoErlös)})`, quellenItems), createSection('B. Verwendungen', verwendungenItems));
            content.appendChild(wrapper);
        } else {
            content.textContent = action.title;
        }

        // --- Interne Rebalancing-Logik ---
        let internalRebalance = null;
        if (input) {
            const liqNachTransaktion = (input.tagesgeld + input.geldmarktEtf) + (action.verwendungen?.liquiditaet || 0);
            let jahresentnahme = 0;
            try {
                const entnahmeText = dom.outputs.monatlicheEntnahme?.firstChild?.textContent || "0";
                const monatlich = UIUtils.parseCurrency(entnahmeText);
                if (isFinite(monatlich)) {
                    jahresentnahme = monatlich * 12;
                } else {
                   console.warn("Konnte monatliche Entnahme für internes Rebalancing nicht parsen:", entnahmeText);
                }
            } catch (e) {
                console.warn("Fehler beim Lesen der monatlichen Entnahme für internes Rebalancing:", e);
            }
            if (isFinite(jahresentnahme)) {
                internalRebalance = this.determineInternalCashRebalance(input, liqNachTransaktion, jahresentnahme);
            }
        } else {
            console.warn("UIRenderer.renderHandlungsanweisung: 'input'-Parameter fehlt, internes Rebalancing übersprungen.");
        }

        if (internalRebalance) {
            if (content.childNodes.length > 0) {
                const hr = document.createElement('hr');
                hr.style.cssText = 'margin: 15px -10px; border-color: rgba(127,127,127,0.2);';
                content.appendChild(hr);
            }
            content.appendChild(this.buildInternalRebalance(internalRebalance));
        }
        container.appendChild(content);
    },

    renderLiquidityBar(percent) {
        const pct = Math.min(100, Math.max(0, percent));
        const bar = dom.outputs.liquiditaetBalken;
        bar.className = 'progress-bar';
        bar.style.width = pct + '%';
        bar.classList.add(pct >= 100 ? 'bar-ok' : pct >= 70 ? 'bar-warn' : 'bar-bad');
        dom.outputs.balkenContainer.setAttribute('aria-valuenow', pct.toFixed(0));
    },

    toast(msg, isSuccess = true) {
        const container = dom.containers.error;
        container.classList.remove('error-warn');
        container.style.color = isSuccess ? 'var(--success-color)' : 'var(--danger-color)';
        container.textContent = msg;
        setTimeout(() => { container.textContent = ''; }, 3500);
    },

    handleError(error) {
        const container = dom.containers.error;
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

    clearError() {
        dom.containers.error.textContent = "";
        dom.containers.error.className = "";
        Object.values(dom.inputs).forEach(el => el.classList.remove('input-error'));
    },

    applyTheme(mode) {
        const effectiveTheme = (mode === 'system') ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light') : mode;
        document.documentElement.setAttribute('data-theme', effectiveTheme);
        dom.controls.themeToggle.textContent = (mode === 'dark') ? '☀️' : (mode === 'light') ? '🌙' : '🖥️';
    },

    formatDiagnosisPayload(raw) {
        if(!raw) return null;
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
                switch(type) {
                    case 'percent':
                        if (needsPrefix) {
                            return `-${(Math.abs(value) * 100).toFixed(1)}%`;
                        }
                        return `${(value * 100).toFixed(1)}%`;
                    case 'months':
                        return `${value.toFixed(0)} Mon.`;
                    case 'currency': {
                        const formatted = UIUtils.formatCurrency(value);
                        if (!needsPrefix) return formatted;
                        const sanitized = formatted.replace(/^[\-–−]/, '').trim();
                        return `-${sanitized}`;
                    }
                    default:
                        if (needsPrefix) {
                            return `-${Math.abs(value).toFixed(1)}`;
                        }
                        return value.toFixed(1);
                }
            };
            const formattedValue = formatVal(g.value, g.type, { invertPositive: g.name.includes("Drawdown") });
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
    },

    // DOM-SAFE: Nur textContent/DOM-APIs; kein innerHTML für dynamische Inhalte.
    renderDiagnosis(diagnosis) {
        if (!diagnosis) return;
        dom.diagnosis.chips.replaceChildren(this.buildChips(diagnosis));
        dom.diagnosis.decisionTree.replaceChildren(this.buildDecisionTree(diagnosis.decisionTree));
        dom.diagnosis.guardrails.replaceChildren(this.buildGuardrails(diagnosis.guardrails));
        if (dom.diagnosis.transaction) {
            dom.diagnosis.transaction.replaceChildren(
                this.buildTransactionDiagnostics(diagnosis.transactionDiagnostics)
            );
        }
        dom.diagnosis.keyParams.replaceChildren(this.buildKeyParams(diagnosis.keyParams));
    },

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

        // REFACTORING: Hartkodierte Werte durch sicheren Zugriff auf Engine-Config ersetzen
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
            ? `Aktuelle Runway vs. Ziel (${runwayTargetMonate.toFixed(0)} Monate).\nQuelle: ${runwaySourceInfo.description}`
            : `Aktuelle Runway basierend auf verfügbaren Barmitteln.\nQuelle: ${runwaySourceInfo.description}`;

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
        // Liquiditäts-KPI: zeigt Deckung vor/nach dem Handlungsvorschlag sowie qualitative Einstufung
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
    },

	buildDecisionTree(treeData) {
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
    },

    buildGuardrails(guardrailData) {
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
    },

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

        return fragment;
    },

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
    },

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

        // Design-Entscheidung: Die Value-Rows nutzen bewusst ein flexibles Layout,
        // damit Labels und Werte in den Diagnosekarten unabhängig von der Textlänge
        // sauber zweispaltig bleiben. Dadurch lässt sich die Transaktionsdiagnostik
        // schneller scannen.
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
    },

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
    },

    /**
     * Formatiert technische Feldnamen zu sprechenden Beschriftungen.
     *
     * @param {string} key - Originalschlüssel.
     * @returns {string} Lesbare Beschriftung.
     */
    _formatThresholdLabel(key) {
        if (!key) return 'Wert';

        const normalized = key.toString().trim();
        const lowerKey = normalized.toLowerCase();
        const labelMap = {
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
        };

        if (labelMap[lowerKey]) {
            return labelMap[lowerKey];
        }

        const beautified = normalized
            .replace(/([a-z])([A-Z])/g, '$1 $2')
            .replace(/[_-]+/g, ' ')
            .replace(/pct/gi, '%')
            .replace(/([A-Za-z])(Eq)/g, '$1 Eq')
            .replace(/\s+/g, ' ')
            .trim();

        return beautified.charAt(0).toUpperCase() + beautified.slice(1);
    },

    /**
     * Formatiert Schwellenwerte kontextsensitiv.
     *
     * @param {string} key - Feldname zur Heuristik.
     * @param {*} value - Rohwert.
     * @returns {string} Formatierte Darstellung.
     */
    _formatThresholdValue(key, value) {
        if (typeof value === 'number' && isFinite(value)) {
            if (/pct|percent|quote|rate/i.test(key)) {
                return `${value.toFixed(1)}%`;
            }
            if (/amount|wert|value|eur|euro|betrag|volume|blocked/i.test(key)) {
                return UIUtils.formatCurrency(value);
            }
            if (/month|monate|runway/i.test(key)) {
                return `${value.toFixed(0)} Mon.`;
            }
            return value.toFixed(2);
        }
        return (value ?? 'n/a').toString();
    },

    buildKeyParams(params) {
        const fragment = document.createDocumentFragment();
        const createLine = (label, value) => {
            const code = document.createElement('code');
            code.textContent = value;
            fragment.append(
                document.createTextNode(label),
                code,
                document.createElement('br')
            );
        };
        createLine('Peak (real): ', UIUtils.formatCurrency(params.peakRealVermoegen));
        createLine('Aktuell (real): ', UIUtils.formatCurrency(params.currentRealVermoegen));
        createLine('Kumulierte Inflation: ', `+${((params.cumulativeInflationFactor - 1) * 100).toFixed(1)}%`);
        if (typeof params.aktuelleFlexRate === 'number') {
            createLine('Effektive Flex-Rate: ', `${params.aktuelleFlexRate.toFixed(1)}%`);
        }
        if (typeof params.kuerzungProzent === 'number') {
            createLine('Kürzung ggü. Flex-Bedarf: ', `${params.kuerzungProzent.toFixed(1)}%`);
        }
        if (typeof params.jahresentnahme === 'number') {
            createLine('Jahresentnahme (brutto): ', UIUtils.formatCurrency(params.jahresentnahme));
        }
        return fragment;
    }
};
