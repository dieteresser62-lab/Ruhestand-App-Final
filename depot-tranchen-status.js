/**
 * Module: Depot Tranchen Status
 * Purpose: Manages and displays the status of detailed portfolio tranches.
 *          Loads tranches from localStorage, calculates aggregates, and updates UI badges/inputs.
 * Usage: Used by Balance App and Simulator to sync detailed tranche data.
 * Dependencies: shared-formatting.js
 */
"use strict";

import { EUR_NO_DEC_FORMATTER } from './shared-formatting.js';

function resolveTrancheMarketValue(tranche) {
    // Priorität: expliziter MarketValue > Shares * CurrentPrice.
    if (Number.isFinite(mv) && mv > 0) {
        return mv;
    }
    const shares = Number(tranche?.shares);
    const currentPrice = Number(tranche?.currentPrice);
    if (Number.isFinite(shares) && shares > 0 && Number.isFinite(currentPrice) && currentPrice > 0) {
        return shares * currentPrice;
    }
    return 0;
}

function resolveTrancheCostBasis(tranche) {
    // Priorität: expliziter CostBasis > Shares * PurchasePrice.
    const cb = Number(tranche?.costBasis);
    if (Number.isFinite(cb) && cb > 0) {
        return cb;
    }
    const shares = Number(tranche?.shares);
    const purchasePrice = Number(tranche?.purchasePrice);
    if (Number.isFinite(shares) && shares > 0 && Number.isFinite(purchasePrice) && purchasePrice > 0) {
        return shares * purchasePrice;
    }
    return 0;
}

function hasMarketValueInput(tranche) {
    const mv = Number(tranche?.marketValue);
    const shares = Number(tranche?.shares);
    const currentPrice = Number(tranche?.currentPrice);
    return (Number.isFinite(mv) && mv > 0)
        || (Number.isFinite(shares) && shares > 0 && Number.isFinite(currentPrice) && currentPrice > 0);
}

function hasCostBasisInput(tranche) {
    const cb = Number(tranche?.costBasis);
    const shares = Number(tranche?.shares);
    const purchasePrice = Number(tranche?.purchasePrice);
    return (Number.isFinite(cb) && cb > 0)
        || (Number.isFinite(shares) && shares > 0 && Number.isFinite(purchasePrice) && purchasePrice > 0);
}


/**
 * Lädt Tranchen aus localStorage und gibt Statistiken zurück
 */
export function getTranchenStatus() {
    try {
        const override = (typeof window !== 'undefined') ? window.__profilverbundTranchenOverride : null;
        if (Array.isArray(override) && override.length > 0) {
            const tranches = override;
            let missingMarketValueCount = 0;
            let missingCostBasisCount = 0;
            const totalValue = tranches.reduce((sum, t) => {
                if (!hasMarketValueInput(t)) {
                    missingMarketValueCount += 1;
                }
                return sum + resolveTrancheMarketValue(t);
            }, 0);
            const totalCost = tranches.reduce((sum, t) => {
                if (!hasCostBasisInput(t)) {
                    missingCostBasisCount += 1;
                }
                return sum + resolveTrancheCostBasis(t);
            }, 0);
            const totalGain = totalValue - totalCost;
            const gainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;
            return {
                loaded: true,
                count: tranches.length,
                totalValue,
                totalCost,
                totalGain,
                gainPct,
                tranches,
                warnings: {
                    missingMarketValueCount,
                    missingCostBasisCount
                }
            };
        }

        const saved = localStorage.getItem('depot_tranchen');
        if (!saved) {
            return {
                loaded: false,
                count: 0,
                totalValue: 0,
                totalCost: 0,
                totalGain: 0,
                gainPct: 0,
                tranches: [],
                warnings: {
                    missingMarketValueCount: 0,
                    missingCostBasisCount: 0
                }
            };
        }

        const tranches = JSON.parse(saved);
        let missingMarketValueCount = 0;
        let missingCostBasisCount = 0;
        const totalValue = tranches.reduce((sum, t) => {
            if (!hasMarketValueInput(t)) {
                missingMarketValueCount += 1;
            }
            return sum + resolveTrancheMarketValue(t);
        }, 0);
        const totalCost = tranches.reduce((sum, t) => {
            if (!hasCostBasisInput(t)) {
                missingCostBasisCount += 1;
            }
            return sum + resolveTrancheCostBasis(t);
        }, 0);
        const totalGain = totalValue - totalCost;
        const gainPct = totalCost > 0 ? (totalGain / totalCost) * 100 : 0;

        return {
            loaded: true,
            count: tranches.length,
            totalValue,
            totalCost,
            totalGain,
            gainPct,
            tranches,
            warnings: {
                missingMarketValueCount,
                missingCostBasisCount
            }
        };
    } catch (err) {
        console.error('Fehler beim Laden der Tranchen-Status:', err);
        return {
            loaded: false,
            count: 0,
            totalValue: 0,
            totalCost: 0,
            totalGain: 0,
            gainPct: 0,
            tranches: [],
            warnings: {
                missingMarketValueCount: 0,
                missingCostBasisCount: 0
            },
            error: err.message
        };
    }
}

/**
 * Rendert eine Status-Badge, die anzeigt, ob Tranchen geladen sind
 * @param {string} containerId - ID des Container-Elements
 */
export function renderTranchenStatusBadge(containerId) {
    if (typeof document === 'undefined') {
        return;
    }
    const container = document.getElementById(containerId);
    if (!container) {
        console.warn(`Container mit ID "${containerId}" nicht gefunden`);
        return;
    }

    const status = getTranchenStatus();

    if (!status.loaded) {
        container.innerHTML = `
            <div style="
                padding: 10px 15px;
                background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
                border-radius: 8px;
                margin-top: 10px;
                text-align: center;
                font-size: 0.9rem;
                color: #555;
            ">
                ℹ️ <strong>Keine detaillierten Tranchen geladen</strong><br>
                <span style="font-size: 0.85rem;">
                    Nutzen Sie das vereinfachte Alt/Neu-Modell.
                    Tranchenverwaltung erfolgt ueber die Startseite (Index.html).
                </span>
            </div>
        `;
        return;
    }

    const formatCurrency = (val) => EUR_NO_DEC_FORMATTER.format(val);

    container.innerHTML = `
        <div style="
            padding: 12px 15px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            border-radius: 8px;
            margin-top: 10px;
            color: white;
            box-shadow: 0 4px 12px rgba(102, 126, 234, 0.3);
        ">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 8px;">
                <div style="display: flex; align-items: center; gap: 8px;">
                    <span style="font-size: 1.2rem;">✅</span>
                    <strong style="font-size: 1rem;">${status.count} Tranchen geladen (FIFO aktiv)</strong>
                </div>
                <div></div>
            </div>
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; font-size: 0.85rem; opacity: 0.95;">
                <div>
                    <div style="opacity: 0.8;">Gesamtwert</div>
                    <div style="font-weight: 600; font-size: 0.95rem;">${formatCurrency(status.totalValue)}</div>
                </div>
                <div>
                    <div style="opacity: 0.8;">Einstand</div>
                    <div style="font-weight: 600; font-size: 0.95rem;">${formatCurrency(status.totalCost)}</div>
                </div>
                <div>
                    <div style="opacity: 0.8;">Gewinn</div>
                    <div style="font-weight: 600; font-size: 0.95rem;">+${status.gainPct.toFixed(1)}%</div>
                </div>
            </div>

            ${status.warnings && (status.warnings.missingMarketValueCount > 0 || status.warnings.missingCostBasisCount > 0)
            ? `<div class="tranchen-warning">
                    Hinweis: ${status.warnings.missingMarketValueCount} Tranche(n) ohne Marktwert und ${status.warnings.missingCostBasisCount} ohne Einstand.
                   </div>`
            : ''}
        </div>
    `;
}

/**
 * Berechnet aggregierte Werte aus Tranchen für die Eingabefelder
 */
export function calculateAggregatedValues(tranchesOverride = null) {
    const status = Array.isArray(tranchesOverride)
        ? { loaded: tranchesOverride.length > 0, count: tranchesOverride.length, tranches: tranchesOverride }
        : getTranchenStatus();

    if (!status.loaded || status.count === 0) {
        return null;
    }

    // Gruppiere nach Kategorien
    let altbestand = { marketValue: 0, costBasis: 0 };
    let neubestand = { marketValue: 0, costBasis: 0 };
    let geldmarkt = { marketValue: 0, costBasis: 0 };
    let gold = { marketValue: 0, costBasis: 0 };

    status.tranches.forEach(t => {
        const mv = resolveTrancheMarketValue(t);
        const cb = resolveTrancheCostBasis(t);
        const type = t.type || t.kind || '';
        const category = t.category || '';

        if (type === 'gold' || category === 'gold') {
            gold.marketValue += mv;
            gold.costBasis += cb;
            return;
        }

        if (type === 'geldmarkt' || category === 'money_market') {
            geldmarkt.marketValue += mv;
            geldmarkt.costBasis += cb;
            return;
        }

        if (type === 'aktien_alt') {
            altbestand.marketValue += mv;
            altbestand.costBasis += cb;
            return;
        }

        if (type === 'aktien_neu') {
            neubestand.marketValue += mv;
            neubestand.costBasis += cb;
            return;
        }

        if (category === 'equity') {
            const isAltByTax = Number(t.tqf) === 1;
            if (isAltByTax) {
                altbestand.marketValue += mv;
                altbestand.costBasis += cb;
            } else {
                neubestand.marketValue += mv;
                neubestand.costBasis += cb;
            }
        }
    });

    return {
        depotwertAlt: altbestand.marketValue,
        costBasisAlt: altbestand.costBasis,
        depotwertNeu: neubestand.marketValue,
        costBasisNeu: neubestand.costBasis,
        geldmarktEtf: geldmarkt.marketValue,
        goldWert: gold.marketValue,
        goldCost: gold.costBasis
    };
}

/**
 * Synchronisiert die Tranchen-Werte in die Balance-Eingabefelder
 */
export function syncTranchenToInputs(options = {}) {
    const { silent = false } = options;
    const override = (typeof window !== 'undefined') ? window.__profilverbundTranchenOverride : null;
    const preferAggregates = (typeof window !== 'undefined') && window.__profilverbundPreferAggregates;
    if (preferAggregates && !Array.isArray(override)) {
        return false;
    }
    const values = calculateAggregatedValues(override);

    if (!values) {
        if (!silent) {
            alert('Keine Tranchen zum Synchronisieren vorhanden.');
        }
        return false;
    }

    // Formatierungsfunktion für Währung
    const formatNumber = (num) => {
        return Math.round(num).toLocaleString('de-DE');
    };

    const readNumericValue = (element) => {
        if (!element) return 0;
        if (element.type === 'number') {
            const n = Number(element.value);
            return Number.isFinite(n) ? n : 0;
        }
        const raw = String(element.value || '').replace(/\./g, '').replace(/,/g, '.');
        const n = Number(raw);
        return Number.isFinite(n) ? n : 0;
    };

    const computed = {
        simStartVermoegen: (values.depotwertAlt || 0)
            + (values.depotwertNeu || 0)
            + (values.goldWert || 0)
            + (values.geldmarktEtf || 0)
            + (readNumericValue(document.getElementById('tagesgeld')))
    };

    // Setze Werte in die Eingabefelder
    const fields = [
        { id: 'simStartVermoegen', value: computed.simStartVermoegen },
        { id: 'depotwertAlt', value: values.depotwertAlt },
        { id: 'costBasisAlt', value: values.costBasisAlt },
        { id: 'einstandAlt', value: values.costBasisAlt },
        { id: 'depotwertNeu', value: values.depotwertNeu },
        { id: 'costBasisNeu', value: values.costBasisNeu },
        { id: 'einstandNeu', value: values.costBasisNeu },
        { id: 'geldmarktEtf', value: values.geldmarktEtf },
        { id: 'goldWert', value: values.goldWert },
        { id: 'goldCost', value: values.goldCost }
    ];

    const setFieldValue = (element, value) => {
        if (element.type === 'number') {
            element.value = String(Math.round(value));
        } else {
            element.value = formatNumber(value);
        }
    };

    let updated = 0;
    fields.forEach(({ id, value }) => {
        const element = document.getElementById(id);
        if (element && value !== undefined && Number.isFinite(value)) {
            setFieldValue(element, value);
            updated++;
        }
    });

    console.log(`✅ ${updated} Felder aus Tranchen synchronisiert`);

    // Trigger Change-Event, damit Balance neu berechnet
    const event = new Event('input', { bubbles: true });
    document.getElementById('depotwertAlt')?.dispatchEvent(event);

    return true;
}

/**
 * Initialisiert die Status-Anzeige und überwacht Änderungen
 * @param {string} containerId - ID des Container-Elements
 */
export function initTranchenStatus(containerId) {
    // Initial rendern
    renderTranchenStatusBadge(containerId);
    syncTranchenToInputs({ silent: true });

    // Auf localStorage-Änderungen reagieren (z.B. wenn Tranchen-Manager in neuem Tab geöffnet ist)
    window.addEventListener('storage', (e) => {
        if (e.key === 'depot_tranchen') {
            console.log('📊 Depot-Tranchen wurden aktualisiert');
            renderTranchenStatusBadge(containerId);
            syncTranchenToInputs({ silent: true });
        }
    });

    // Periodisch prüfen (alle 5 Sekunden), falls localStorage im selben Tab geändert wurde
    const intervalId = setInterval(() => {
        renderTranchenStatusBadge(containerId);
    }, 5000);
    if (intervalId && typeof intervalId.unref === 'function') {
        intervalId.unref();
    }
    return intervalId;
}

// Browser-Kompatibilität
if (typeof window !== 'undefined') {
    window.DepotTranchenStatus = {
        getStatus: getTranchenStatus,
        renderBadge: renderTranchenStatusBadge,
        init: initTranchenStatus,
        syncToInputs: () => syncTranchenToInputs(),
        calculateAggregated: calculateAggregatedValues
    };
}
