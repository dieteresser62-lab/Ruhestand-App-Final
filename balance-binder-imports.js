import { CONFIG, AppError } from './balance-config.js';
import { UIReader } from './balance-reader.js';
import { UIRenderer } from './balance-renderer.js';
import { StorageManager } from './balance-storage.js';

export function createImportExportHandlers({ dom, debouncedUpdate, update }) {
    return {
        handleExport() {
            const dataToExport = { app: CONFIG.APP.NAME, version: CONFIG.APP.VERSION, payload: StorageManager.loadState() };
            const blob = new Blob([JSON.stringify(dataToExport, null, 2)], { type: 'application/json' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = `balancing-export-${new Date().toISOString().slice(0, 10)}.json`;
            a.click();
            URL.revokeObjectURL(a.href);
            UIRenderer.toast('Export erstellt.');
        },

        async handleImport(e) {
            const file = e.target.files?.[0];
            if (!file) return;
            try {
                const json = JSON.parse(await file.text());
                StorageManager.saveState(json.payload ?? json);
                UIReader.applyStoredInputs(StorageManager.loadState().inputs);
                update();
                UIRenderer.toast('Import erfolgreich.');
            } catch (err) {
                UIRenderer.handleError(new AppError('Import fehlgeschlagen.', { originalError: err }));
            } finally {
                e.target.value = '';
            }
        },

        async handleCsvImport(e) {
            const file = e.target.files?.[0];
            if (!file) return;

            try {
                const text = await file.text();

                const parseDate = (dateStr) => {
                    const parts = dateStr.split('.');
                    if (parts.length !== 3) return null;
                    return new Date(parts[2], parseInt(parts[1]) - 1, parts[0]);
                };
                const parseValue = (numStr) => {
                    if (!numStr) return NaN;
                    return parseFloat(numStr.trim().replace(',', '.'));
                };

                const data = text.split(/\r?\n/).slice(1).map(line => {
                    const columns = line.split(';');
                    if (columns.length < 5) return null;
                    return {
                        date: parseDate(columns[0]),
                        high: parseValue(columns[2]),
                        close: parseValue(columns[4])
                    };
                }).filter(d => d && d.date && !isNaN(d.close))
                    .sort((a, b) => a.date - b.date);

                if (data.length === 0) throw new Error('Keine gültigen Daten in der CSV gefunden.');

                const lastEntry = data[data.length - 1];
                const lastDate = lastEntry.date;
                const endeVjValue = lastEntry.close;

                const findClosestPreviousEntry = (targetDate, allData) => {
                    let bestEntry = null;
                    for (let i = allData.length - 1; i >= 0; i--) {
                        if (allData[i].date <= targetDate) {
                            bestEntry = allData[i];
                            break;
                        }
                    }
                    return bestEntry ? bestEntry.close : null;
                };

                const targetDateVJ1 = new Date(lastDate);
                targetDateVJ1.setFullYear(lastDate.getFullYear() - 1);
                const endeVj1Value = findClosestPreviousEntry(targetDateVJ1, data);

                const targetDateVJ2 = new Date(lastDate);
                targetDateVJ2.setFullYear(lastDate.getFullYear() - 2);
                const endeVj2Value = findClosestPreviousEntry(targetDateVJ2, data);

                const targetDateVJ3 = new Date(lastDate);
                targetDateVJ3.setFullYear(lastDate.getFullYear() - 3);
                const endeVj3Value = findClosestPreviousEntry(targetDateVJ3, data);

                let ath = { value: -Infinity, date: null };
                data.forEach(d => {
                    if (d.close > ath.value) {
                        ath.value = d.close;
                        ath.date = d.date;
                    }
                });

                let jahreSeitAth = 0;
                if (ath.value > lastEntry.close + 0.01 && ath.date) {
                    const timeDiff = lastEntry.date.getTime() - ath.date.getTime();
                    const yearsDiff = timeDiff / (1000 * 3600 * 24 * 365.25);
                    jahreSeitAth = Math.floor(yearsDiff); // Ganze Jahre ohne Nachkommastellen
                }

                const updateField = (id, value) => {
                    const el = dom.inputs[id];
                    if (el) {
                        // Runde auf ganze Zahlen, keine Nachkommastellen
                        el.value = (typeof value === 'number' && isFinite(value)) ? Math.round(value).toString() : '';
                    }
                };

                updateField('endeVJ', endeVjValue);
                updateField('endeVJ_1', endeVj1Value);
                updateField('endeVJ_2', endeVj2Value);
                updateField('endeVJ_3', endeVj3Value);
                updateField('ath', ath.value);
                updateField('jahreSeitAth', jahreSeitAth < 0 ? 0 : jahreSeitAth);

                debouncedUpdate();
                UIRenderer.toast(`CSV importiert: Daten relativ zum ${lastDate.toLocaleDateString('de-DE')} übernommen.`);

            } catch (err) {
                UIRenderer.handleError(new AppError('CSV-Import fehlgeschlagen.', { originalError: err }));
            } finally {
                e.target.value = '';
            }
        }
    };
}
