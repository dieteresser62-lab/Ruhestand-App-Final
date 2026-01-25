"use strict";

import { AppError } from './balance-config.js';
import { UIUtils } from './balance-utils.js';
import { UIReader } from './balance-reader.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';

export function createInflationHandlers({ dom, update, debouncedUpdate }) {
    const applyInflationToBedarfe = () => {
        const inputData = UIReader.readAllInputs();
        const infl = inputData.inflation;
        const currentAge = inputData.aktuellesAlter;

        ['floorBedarf', 'flexBedarf', 'flexBudgetAnnual', 'flexBudgetRecharge'].forEach(id => {
            const el = dom.inputs[id];
            el.value = UIUtils.formatNumber(UIUtils.parseCurrency(el.value) * (1 + infl / 100));
        });

        const state = StorageManager.loadState();
        state.ageAdjustedForInflation = currentAge;
        StorageManager.saveState(state);

        update();
    };

    const applyAnnualInflation = () => {
        const state = StorageManager.loadState();
        if (!state || !state.lastState) return;

        const currentAge = parseInt(dom.inputs.aktuellesAlter.value, 10);
        const lastAppliedAge = state.lastState.lastInflationAppliedAtAge || 0;

        if (currentAge > lastAppliedAge) {
            const infl = UIReader.readAllInputs().inflation;
            const fac = Math.max(0, infl) / 100;
            const oldFactor = state.lastState.cumulativeInflationFactor || 1;
            state.lastState.cumulativeInflationFactor = oldFactor * (1 + fac);
            state.lastState.lastInflationAppliedAtAge = currentAge;
            StorageManager.saveState(state);
            UIRenderer.toast(`Kumulierte Inflation für Alter ${currentAge} fortgeschrieben.`);
        } else if (currentAge <= lastAppliedAge) {
            UIRenderer.toast(`Inflation für Alter ${currentAge} wurde bereits angewendet.`, false);
        }
    };

    const handleFetchInflation = async () => {
        const btn = dom.controls.btnFetchInflation;  // Kann undefined sein (wenn von Jahres-Update aufgerufen)
        const originalText = btn?.innerHTML;

        try {
            if (btn) {
                btn.disabled = true;
                btn.innerHTML = '⏳ Lade...';
            }

            // Berechne das Vorjahr
            const currentYear = new Date().getFullYear();
            const previousYear = currentYear - 1;

            if (btn) {
                UIRenderer.toast(`Versuche Inflationsdaten für ${previousYear} abzurufen...`);
            }

            // Versuche verschiedene APIs nacheinander
            let inflationRate = null;
            let source = '';

            // API 1: ECB Statistical Data Warehouse (HICP - Harmonized Index of Consumer Prices)
            // Deutschland: DEU, HICP All-items, Annual rate of change
            try {
                const ecbUrl = `https://data-api.ecb.europa.eu/service/data/ICP/M.DE.N.000000.4.ANR`;
                const ecbResponse = await fetch(ecbUrl, {
                    headers: { 'Accept': 'application/json' }
                });

                if (ecbResponse.ok) {
                    const ecbData = await ecbResponse.json();

                    // Durchsuche die Zeitreihe nach dem Vorjahr
                    if (ecbData.dataSets && ecbData.dataSets[0] && ecbData.dataSets[0].series) {
                        const series = Object.values(ecbData.dataSets[0].series)[0];
                        if (series && series.observations) {
                            // Finde die neuesten verfügbaren Daten
                            const observations = Object.entries(series.observations);
                            if (observations.length > 0) {
                                // Nimm den neuesten Wert
                                const latestObs = observations[observations.length - 1];
                                inflationRate = parseFloat(latestObs[1][0]);
                                source = 'ECB (HICP)';
                            }
                        }
                    }
                }
            } catch (ecbErr) {
                // ECB API failed, try next
            }

            // API 2: World Bank API (Alternative)
            if (inflationRate === null) {
                try {
                    const wbUrl = `https://api.worldbank.org/v2/country/DE/indicator/FP.CPI.TOTL.ZG?format=json&date=${previousYear}`;
                    const wbResponse = await fetch(wbUrl);

                    if (wbResponse.ok) {
                        const wbData = await wbResponse.json();

                        if (wbData && wbData[1] && wbData[1].length > 0 && wbData[1][0].value !== null) {
                            inflationRate = parseFloat(wbData[1][0].value);
                            source = 'World Bank';
                        }
                    }
                } catch (wbErr) {
                    // World Bank API failed, try next
                }
            }

            // API 3: OECD API (Alternative)
            if (inflationRate === null) {
                try {
                    const oecdUrl = `https://stats.oecd.org/sdmx-json/data/DP_LIVE/.CPI.../OECD?contentType=json&detail=code&separator=.&dimensionAtObservation=allDimensions&startPeriod=${previousYear}&endPeriod=${previousYear}`;
                    const oecdResponse = await fetch(oecdUrl);

                    if (oecdResponse.ok) {
                        const oecdData = await oecdResponse.json();

                        // Suche Deutschland in den Daten
                        if (oecdData.dataSets && oecdData.dataSets[0] && oecdData.dataSets[0].observations) {
                            // OECD Datenstruktur ist komplex, durchsuche nach DEU
                            const observations = oecdData.dataSets[0].observations;
                            for (const [key, value] of Object.entries(observations)) {
                                // Prüfe ob das Deutschland ist
                                const indices = key.split(':');
                                if (oecdData.structure && oecdData.structure.dimensions) {
                                    const locationDim = oecdData.structure.dimensions.observation.find(d => d.id === 'LOCATION');
                                    if (locationDim && locationDim.values[parseInt(indices[0])].id === 'DEU') {
                                        inflationRate = parseFloat(value[0]);
                                        source = 'OECD';
                                        break;
                                    }
                                }
                            }
                        }
                    }
                } catch (oecdErr) {
                    // OECD API failed, try next
                }
            }

            // Ergebnis verarbeiten
            if (inflationRate !== null && !isNaN(inflationRate) && isFinite(inflationRate)) {
                // Setze den Wert im Eingabefeld
                dom.inputs.inflation.value = inflationRate.toFixed(1);
                debouncedUpdate();

                // Automatisch Bedarfe anpassen
                applyInflationToBedarfe();

                if (btn) {
                    const formattedRate = UIUtils.formatPercentValue(inflationRate, { fractionDigits: 1, invalid: 'n/a' });
                    UIRenderer.toast(`✅ Inflation ${previousYear}: ${formattedRate} (Quelle: ${source})\nBedarfe automatisch angepasst`);
                }

                // Rückgabe für Jahres-Update Modal
                return {
                    rate: inflationRate,
                    year: previousYear,
                    source: source
                };
            }

            // Keine Daten gefunden - detailliertes Feedback
            throw new AppError(
                `Keine Inflationsdaten für ${previousYear} gefunden.\n\n` +
                `🔍 Getestete APIs:\n` +
                `• ECB Statistical Data Warehouse\n` +
                `• World Bank Data API\n` +
                `• OECD Statistics API\n\n` +
                `Mögliche Ursachen:\n` +
                `• CORS-Blockierung durch Browser\n` +
                `• Daten für ${previousYear} noch nicht verfügbar\n` +
                `• API-Endpoints haben sich geändert\n\n` +
                `💡 Tipp: Öffne die Browser-Konsole (F12) für Details.`
            );

        } catch (err) {
            console.error('Inflation API Fehler:', err);
            UIRenderer.handleError(new AppError('Inflationsdaten-Abruf fehlgeschlagen.', { originalError: err }));
            throw err; // Re-throw für Jahres-Update
        } finally {
            if (btn) {
                btn.disabled = false;
                btn.innerHTML = originalText;
            }
        }
    };

    return {
        applyInflationToBedarfe,
        applyAnnualInflation,
        handleFetchInflation
    };
}
