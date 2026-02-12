/**
 * Module: Balance Renderer Action
 * Purpose: Renders the "Action Card" (Handlungsempfehlung).
 *          Visualizes Sources (Funds/Sales) and Uses (Purchases/Liquidity) and handles Profilverbund rendering.
 * Usage: Used by balance-renderer.js to display recommendations.
 * Dependencies: balance-utils.js
 */
"use strict";

import { UIUtils } from './balance-utils.js';

/**
 * Renderer für Handlungsempfehlungen und interne Rebalancing-Hinweise.
 * Trägt die Verantwortung für die Aktions-Karte inklusive defensiver Plausibilitätsprüfungen.
 */
export class ActionRenderer {
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

        const profilverbundActionResults = (typeof window !== 'undefined') ? window.__profilverbundActionResults : null;
        const hasProfilverbundActions = profilverbundActionResults && Array.isArray(profilverbundActionResults) && profilverbundActionResults.length > 0;
        const profilverbundProfiles = (typeof window !== 'undefined') ? window.__profilverbundProfileSummaries : null;
        const hasProfilverbundProfiles = profilverbundProfiles && Array.isArray(profilverbundProfiles) && profilverbundProfiles.length > 0;
        const hasMeaningfulFlow = (entryAction = {}) => {
            const quellenTotal = (Array.isArray(entryAction?.quellen) ? entryAction.quellen : [])
                .reduce((sum, q) => sum + (q?.brutto || 0), 0);
            const uses = entryAction?.verwendungen || {};
            const usesTotal = (uses.liquiditaet || 0) + (uses.gold || 0) + (uses.aktien || 0) + (uses.geldmarkt || 0);
            return quellenTotal > 0 || usesTotal > 0 || (entryAction?.steuer || 0) > 0 || (entryAction?.nettoErlös || 0) > 0;
        };
        const hasProfilverbundMaterialActions = hasProfilverbundActions
            && profilverbundActionResults.some(entry => hasMeaningfulFlow(entry?.action || {}));
        let displayNetto = action.nettoErlös || 0;
        let displayBrutto = 0;
        let displaySteuer = action.steuer || 0;
        if (hasProfilverbundMaterialActions) {
            displayNetto = profilverbundActionResults.reduce((sum, entry) => sum + (entry?.action?.nettoErlös || 0), 0);
            displaySteuer = profilverbundActionResults.reduce((sum, entry) => sum + (entry?.action?.steuer || 0), 0);
            displayBrutto = profilverbundActionResults.reduce((sum, entry) => {
                const list = Array.isArray(entry?.action?.quellen) ? entry.action.quellen : [];
                return sum + list.reduce((inner, q) => inner + (q?.brutto || 0), 0);
            }, 0);
        } else {
            const list = Array.isArray(action.quellen) ? action.quellen : [];
            displayBrutto = list.reduce((sum, q) => sum + (q?.brutto || 0), 0);
        }

        if (hasProfilverbundMaterialActions) {
            quellenItems.length = 0;
            verwendungenItems.length = 0;
            if (annualWithdrawal) {
                const zielTagesgeld = annualWithdrawal + (action.spending.monatlicheEntnahme * 2);
                verwendungenItems.push(createRow('Ziel Tagesgeld (Jahr + 2 Monate):', UIUtils.formatCurrency(zielTagesgeld)));
            }
            profilverbundActionResults.forEach(entry => {
                const entryAction = entry?.action || {};
                const entryInput = entry?.input || input;
                const entrySpending = entry?.spending || spending;
                const entryTarget = entry?.targetLiquidity;
                const entryName = entry?.name || 'Profil';
                const entryQuellen = Array.isArray(entryAction.quellen) ? entryAction.quellen : [];
                const splitEntry = this._splitLiquiditySource(entryInput, entryAction, entrySpending, entryTarget);

                if (entryQuellen.length > 0) {
                    entryQuellen.forEach(q => {
                        if (q.kind === 'liquiditaet' && splitEntry && splitEntry.totalOutflow > 0) {
                            if ((splitEntry.fromTagesgeld || 0) > 0) {
                                quellenItems.push(createRow(`- ${entryName}: Tagesgeld`, UIUtils.formatCurrency(splitEntry.fromTagesgeld)));
                            }
                            if ((splitEntry.fromGeldmarkt || 0) > 0) {
                                quellenItems.push(createRow(`- ${entryName}: Geldmarkt-ETF`, UIUtils.formatCurrency(splitEntry.fromGeldmarkt)));
                            }
                            return;
                        }
                        quellenItems.push(createRow(`- ${entryName}: ${buildQuelleLabel(q).replace(/^-\s*/, '')}`, UIUtils.formatCurrency(q.brutto || 0)));
                    });
                }
                if ((entryAction.steuer || 0) > 0) {
                    quellenItems.push(createRow(`- ${entryName}: Steuern (geschaetzt)`, UIUtils.formatCurrency(entryAction.steuer || 0)));
                }

                const uses = entryAction.verwendungen || {};
                if (uses.gold > 0) verwendungenItems.push(createRow(`- ${entryName}: Kauf von Gold`, UIUtils.formatCurrency(uses.gold)));
                if (uses.aktien > 0) verwendungenItems.push(createRow(`- ${entryName}: Kauf von Aktien`, UIUtils.formatCurrency(uses.aktien)));
                if (uses.geldmarkt > 0) verwendungenItems.push(createRow(`- ${entryName}: Kauf von Geldmarkt-ETF`, UIUtils.formatCurrency(uses.geldmarkt)));
                if (uses.liquiditaet > minVisibleUse) verwendungenItems.push(createRow(`- ${entryName}: Zufluss Liquiditaet`, UIUtils.formatCurrency(uses.liquiditaet)));
            });
        } else if (hasProfilverbundProfiles) {
            const totalProfiles = profilverbundProfiles.length;
            const sourceTotals = new Array(totalProfiles).fill(0);
            const totalAssets = profilverbundProfiles.map(profile => profile.totalAssets || 0);

            const sumWeights = (weights) => weights.reduce((sum, value) => sum + value, 0);
            const distributeAmount = (amount, weights) => {
                const totalWeight = sumWeights(weights);
                if (!amount || !isFinite(amount)) {
                    return weights.map(() => 0);
                }
                if (totalWeight <= 0) {
                    const share = totalProfiles > 0 ? amount / totalProfiles : 0;
                    return weights.map(() => share);
                }
                return weights.map(weight => amount * (weight / totalWeight));
            };

            const buildSourceLabel = (q) => {
                const base = quellenMap[q.kind] || q.kind || 'Quelle';
                const infoParts = [];
                if (q.name) infoParts.push(q.name);
                if (q.isin) infoParts.push(q.isin);
                if (!infoParts.length) return base;
                return `${base} - ${infoParts.join(', ')}`;
            };

            const addRows = (label, allocations) => {
                allocations.forEach((amount, index) => {
                    if (!(amount > 0)) return;
                    const profileName = profilverbundProfiles[index]?.name || `Profil ${index + 1}`;
                    quellenItems.push(createRow(`- ${profileName}: ${label}`, UIUtils.formatCurrency(amount || 0)));
                    sourceTotals[index] += amount || 0;
                });
            };

            quellenItems.length = 0;
            const quellenEntries = Array.isArray(action.quellen) ? action.quellen : [];
            const splitLiquidity = this._splitLiquiditySource(input, action, spending, targetLiquidity);

            if (quellenEntries.length > 0) {
                quellenEntries.forEach(q => {
                    if (!q) return;
                    const kind = q.kind || '';
                    if (kind === 'liquiditaet' || q.source === 'Liquidität') {
                        if (splitLiquidity && splitLiquidity.totalOutflow > 0) {
                            const tagesgeldWeights = profilverbundProfiles.map(profile => profile.tagesgeld || 0);
                            const geldmarktWeights = profilverbundProfiles.map(profile => profile.geldmarkt || 0);
                            addRows('Tagesgeld', distributeAmount(splitLiquidity.fromTagesgeld || 0, tagesgeldWeights));
                            addRows('Geldmarkt-ETF', distributeAmount(splitLiquidity.fromGeldmarkt || 0, geldmarktWeights));
                        } else {
                            const liquidityWeights = profilverbundProfiles.map(profile => (profile.tagesgeld || 0) + (profile.geldmarkt || 0));
                            addRows('Liquiditaet', distributeAmount(q.brutto || 0, liquidityWeights));
                        }
                        return;
                    }

                    let weights = totalAssets;
                    if (kind === 'geldmarkt') {
                        weights = profilverbundProfiles.map(profile => profile.geldmarkt || 0);
                    } else if (kind === 'gold') {
                        weights = profilverbundProfiles.map(profile => profile.gold || 0);
                    } else if (kind === 'aktien_alt') {
                        weights = profilverbundProfiles.map(profile => profile.depotAlt || 0);
                    } else if (kind === 'aktien_neu') {
                        weights = profilverbundProfiles.map(profile => profile.depotNeu || 0);
                    }

                    addRows(buildSourceLabel(q), distributeAmount(q.brutto || 0, weights));
                });
            }

            const taxTotal = action.steuer || 0;
            if (taxTotal > 0) {
                const taxWeights = sourceTotals.some(total => total > 0) ? sourceTotals : totalAssets;
                addRows('Steuern (geschaetzt)', distributeAmount(taxTotal, taxWeights));
            }

            verwendungenItems.length = 0;
            if (annualWithdrawal) {
                const zielTagesgeld = annualWithdrawal + (action.spending.monatlicheEntnahme * 2);
                verwendungenItems.push(createRow('Ziel Tagesgeld (Jahr + 2 Monate):', UIUtils.formatCurrency(zielTagesgeld)));
            }
            const usageTotals = action?.verwendungen || {};
            const usageEntries = [
                { key: 'gold', label: 'Kauf von Gold' },
                { key: 'aktien', label: 'Kauf von Aktien' },
                { key: 'geldmarkt', label: 'Kauf von Geldmarkt-ETF' },
                { key: 'liquiditaet', label: 'Zufluss Liquiditaet' }
            ];
            const usageWeights = sourceTotals.some(total => total > 0) ? sourceTotals : totalAssets;
            usageEntries.forEach(entry => {
                const total = usageTotals[entry.key] || 0;
                if (total <= 0) return;
                distributeAmount(total, usageWeights).forEach((amount, index) => {
                    if (amount <= 0) return;
                    const profileName = profilverbundProfiles[index]?.name || `Profil ${index + 1}`;
                    verwendungenItems.push(createRow(`- ${profileName}: ${entry.label}`, UIUtils.formatCurrency(amount)));
                });
            });
        } else {
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
        }

        const wrapper = document.createElement('div');
        wrapper.style.cssText = 'text-align: left; font-size: 1rem; line-height: 1.6;';
        // Titel + strukturierte Blöcke reichen aus; eine zusätzliche Kurz-Zusammenfassung würde die Angaben nur duplizieren.
        const quellenSummaryRows = [
            createRow('Summe Quellen (Brutto):', UIUtils.formatCurrency(displayBrutto))
        ];
        if (displaySteuer > 0) {
            quellenSummaryRows.push(createRow('Steuern (gesamt):', UIUtils.formatCurrency(displaySteuer)));
        }

        wrapper.append(
            title,
            createSection(`A. Quellen (Netto: ${UIUtils.formatCurrency(displayNetto)})`, [
                ...quellenSummaryRows,
                ...quellenItems
            ]),
            createSection('B. Verwendungen', verwendungenItems)
        );

        content.appendChild(wrapper);
    }
}
