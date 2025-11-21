"use strict";

/**
 * ============================================================================
 * SIMULATOR-UI-INIT.JS - UI Initialisierung und Event-Handler
 * ============================================================================
 *
 * Dieses Modul enthält die UI-Initialisierungslogik für den Simulator.
 *
 * Exportierte Funktionen:
 * - initSimulatorUI() - Haupt-Initialisierung
 * - initRente2ConfigWithLocalStorage() - Rente-Konfiguration
 * - applyPflegeKostenPreset() - Pflege-Preset anwenden
 * - updatePflegePresetHint() - Pflege-Hint aktualisieren
 * - updatePflegeUIInfo() - Pflege-UI aktualisieren
 * ============================================================================
 */

import { parseRangeInput } from './simulator-utils.js';
import { SUPPORTED_PFLEGE_GRADES, PFLEGE_GRADE_LABELS } from './simulator-data.js';
import { initSweepDefaultsWithLocalStorageFallback } from './simulator-sweep.js';

const CARE_GRADE_FIELD_IDS = SUPPORTED_PFLEGE_GRADES.flatMap(grade => [
    `pflegeStufe${grade}Zusatz`,
    `pflegeStufe${grade}FlexCut`,
    `pflegeStufe${grade}Mortality`
]);

const PFLEGE_COST_PRESETS = Object.freeze({
    custom: {
        label: 'Individuelle Werte',
        description: 'Keine Automatik – du behältst deine individuellen Staffelungen.'
    },
    ambulant: {
        label: 'Ambulant (ab 36 Tsd. €)',
        description: 'Ambulante Leistungen inkl. Haushaltshilfen (PG1 36k → PG5 78k).',
        values: { 1: 36000, 2: 42000, 3: 54000, 4: 66000, 5: 78000 }
    },
    stationaer: {
        label: 'Stationär (Premium)',
        description: 'Pflegeheim mit Unterbringung (PG1 45k → PG5 105k).',
        values: { 1: 45000, 2: 60000, 3: 75000, 4: 90000, 5: 105000 }
    }
});

/**
 * Wendet ein Pflege-Kosten-Preset an
 */
export function applyPflegeKostenPreset(presetKey) {
    const preset = PFLEGE_COST_PRESETS[presetKey];
    if (!preset || !preset.values) return;

    let didChange = false;
    SUPPORTED_PFLEGE_GRADES.forEach(grade => {
        const value = preset.values[grade];
        if (typeof value !== 'number') return;
        const field = document.getElementById(`pflegeStufe${grade}Zusatz`);
        if (field) {
            field.value = value;
            didChange = true;
        }
    });

    if (didChange) {
        console.log(`[PFLEGE] Preset '${presetKey}' angewendet`);
    }
}

/**
 * Aktualisiert den Hint-Text für das Pflege-Preset
 */
export function updatePflegePresetHint(selectEl, hintEl) {
    const preset = PFLEGE_COST_PRESETS[selectEl.value];
    if (preset && hintEl) {
        hintEl.textContent = preset.description || '';
    }
}

/**
 * Aktualisiert die Pflege-UI-Informationen
 */
export function updatePflegeUIInfo() {
    const selectEl = document.getElementById('pflegeKostenPreset');
    const hintEl = document.getElementById('pflegePresetHint');
    if (selectEl && hintEl) {
        updatePflegePresetHint(selectEl, hintEl);
    }
}

/**
 * Initialisiert Legacy-Mortalitäts-Toggle falls vorhanden
 */
function initializeLegacyMortalityToggleIfPresent(checkbox) {
    if (!checkbox) return;

    const invokeSyncIfAvailable = () => {
        if (typeof window.syncMortalityToggle === 'function') {
            window.syncMortalityToggle();
        }
    };

    invokeSyncIfAvailable();
    checkbox.addEventListener('change', invokeSyncIfAvailable);
}

/**
 * Initialisiert Rente-Konfiguration (Person 1 + Partner) mit localStorage
 */
export function initRente2ConfigWithLocalStorage() {
    const defaults = {
        p1StartAlter: 63,
        p1Geschlecht: 'm',
        p1SparerPB: 1000,
        p1KirchensteuerPct: 9,
        p1Monatsrente: 500,
        p1StartInJahren: 5,
        rentAdjMode: 'wage',
        rentAdjPct: 2.0,
        aktiv: false,
        r2Geschlecht: 'w',
        r2StartAlter: 60,
        r2StartInJahren: 0,
        r2Monatsrente: 1500,
        r2SparerPB: 0,
        r2KirchensteuerPct: 0,
        r2Steuerquote: 0
    };

    const keys = {
        p1StartAlter: 'sim_p1StartAlter',
        p1Geschlecht: 'sim_p1Geschlecht',
        p1SparerPB: 'sim_p1SparerPauschbetrag',
        p1KirchensteuerPct: 'sim_p1KirchensteuerPct',
        p1Monatsrente: 'sim_p1Monatsrente',
        p1StartInJahren: 'sim_p1StartInJahren',
        rentAdjMode: 'sim_rentAdjMode',
        rentAdjPct: 'sim_rentAdjPct',
        aktiv: 'sim_partnerAktiv',
        r2Geschlecht: 'sim_r2Geschlecht',
        r2StartAlter: 'sim_r2StartAlter',
        r2StartInJahren: 'sim_r2StartInJahren',
        r2Monatsrente: 'sim_r2Monatsrente',
        r2SparerPB: 'sim_r2SparerPauschbetrag',
        r2KirchensteuerPct: 'sim_r2KirchensteuerPct',
        r2Steuerquote: 'sim_r2Steuerquote',
        r2Brutto_OLD: 'sim_r2Brutto',
        anpassung_OLD: 'sim_r2Anpassung'
    };

    // Person 1 Felder
    const p1StartAlter = document.getElementById('p1StartAlter');
    const p1Geschlecht = document.getElementById('p1Geschlecht');
    const p1SparerPB = document.getElementById('p1SparerPauschbetrag');
    const p1KirchensteuerPct = document.getElementById('p1KirchensteuerPct');
    const p1Monatsrente = document.getElementById('p1Monatsrente');
    const p1StartInJahren = document.getElementById('p1StartInJahren');
    const rentAdjMode = document.getElementById('rentAdjMode');
    const rentAdjPct = document.getElementById('rentAdjPct');

    // Person 2 Felder
    const chkPartnerAktiv = document.getElementById('chkPartnerAktiv');
    const sectionRente2 = document.getElementById('sectionRente2');
    const r2Geschlecht = document.getElementById('r2Geschlecht');
    const r2StartAlter = document.getElementById('r2StartAlter');
    const r2StartInJahren = document.getElementById('r2StartInJahren');
    const r2Monatsrente = document.getElementById('r2Monatsrente');
    const r2SparerPB = document.getElementById('r2SparerPauschbetrag');
    const r2KirchensteuerPct = document.getElementById('r2KirchensteuerPct');
    const r2Steuerquote = document.getElementById('r2Steuerquote');

    // Person 1 Initialisierung
    if (p1StartAlter) {
        const saved = localStorage.getItem(keys.p1StartAlter);
        p1StartAlter.value = saved || defaults.p1StartAlter;
        p1StartAlter.addEventListener('input', () => localStorage.setItem(keys.p1StartAlter, p1StartAlter.value));
    }

    if (p1Geschlecht) {
        const saved = localStorage.getItem(keys.p1Geschlecht);
        p1Geschlecht.value = saved || defaults.p1Geschlecht;
        p1Geschlecht.addEventListener('change', () => localStorage.setItem(keys.p1Geschlecht, p1Geschlecht.value));
    }

    if (p1SparerPB) {
        const saved = localStorage.getItem(keys.p1SparerPB);
        p1SparerPB.value = saved || defaults.p1SparerPB;
        p1SparerPB.addEventListener('input', () => localStorage.setItem(keys.p1SparerPB, p1SparerPB.value));
    }

    if (p1KirchensteuerPct) {
        const saved = localStorage.getItem(keys.p1KirchensteuerPct);
        p1KirchensteuerPct.value = saved || defaults.p1KirchensteuerPct;
        p1KirchensteuerPct.addEventListener('change', () => localStorage.setItem(keys.p1KirchensteuerPct, p1KirchensteuerPct.value));
    }

    if (p1Monatsrente) {
        const saved = localStorage.getItem(keys.p1Monatsrente);
        p1Monatsrente.value = saved || defaults.p1Monatsrente;
        p1Monatsrente.addEventListener('input', () => localStorage.setItem(keys.p1Monatsrente, p1Monatsrente.value));
    }

    if (p1StartInJahren) {
        const saved = localStorage.getItem(keys.p1StartInJahren);
        p1StartInJahren.value = saved || defaults.p1StartInJahren;
        p1StartInJahren.addEventListener('input', () => localStorage.setItem(keys.p1StartInJahren, p1StartInJahren.value));
    }

    if (rentAdjMode) {
        const saved = localStorage.getItem(keys.rentAdjMode);
        rentAdjMode.value = saved || defaults.rentAdjMode;
        rentAdjMode.addEventListener('change', () => localStorage.setItem(keys.rentAdjMode, rentAdjMode.value));
    }

    if (rentAdjPct) {
        let saved = localStorage.getItem(keys.rentAdjPct);
        if (!saved || saved === '') {
            const oldR2Anpassung = localStorage.getItem(keys.anpassung_OLD);
            if (oldR2Anpassung) {
                saved = oldR2Anpassung;
                localStorage.setItem(keys.rentAdjPct, saved);
            }
        }
        rentAdjPct.value = saved || defaults.rentAdjPct;
        rentAdjPct.addEventListener('input', () => localStorage.setItem(keys.rentAdjPct, rentAdjPct.value));
    }

    // Person 2 Initialisierung
    if (!chkPartnerAktiv || !sectionRente2) return;

    const savedAktiv = localStorage.getItem(keys.aktiv);
    chkPartnerAktiv.checked = savedAktiv === '1';
    sectionRente2.style.display = chkPartnerAktiv.checked ? 'block' : 'none';

    if (r2Geschlecht) {
        const saved = localStorage.getItem(keys.r2Geschlecht);
        r2Geschlecht.value = saved || defaults.r2Geschlecht;
        r2Geschlecht.addEventListener('change', () => localStorage.setItem(keys.r2Geschlecht, r2Geschlecht.value));
    }

    if (r2StartAlter) {
        const saved = localStorage.getItem(keys.r2StartAlter);
        r2StartAlter.value = saved || defaults.r2StartAlter;
        r2StartAlter.addEventListener('input', () => localStorage.setItem(keys.r2StartAlter, r2StartAlter.value));
    }

    if (r2StartInJahren) {
        const saved = localStorage.getItem(keys.r2StartInJahren);
        r2StartInJahren.value = saved || defaults.r2StartInJahren;
        r2StartInJahren.addEventListener('input', () => localStorage.setItem(keys.r2StartInJahren, r2StartInJahren.value));
    }

    if (r2Monatsrente) {
        let saved = localStorage.getItem(keys.r2Monatsrente);
        if (!saved || saved === '' || saved === '0') {
            const oldBrutto = localStorage.getItem(keys.r2Brutto_OLD);
            if (oldBrutto && parseFloat(oldBrutto) > 0) {
                saved = String(Math.round(parseFloat(oldBrutto) / 12));
                localStorage.setItem(keys.r2Monatsrente, saved);
            }
        }
        r2Monatsrente.value = saved || defaults.r2Monatsrente;
        r2Monatsrente.addEventListener('input', () => localStorage.setItem(keys.r2Monatsrente, r2Monatsrente.value));
    }

    if (r2SparerPB) {
        const saved = localStorage.getItem(keys.r2SparerPB);
        r2SparerPB.value = saved || defaults.r2SparerPB;
        r2SparerPB.addEventListener('input', () => localStorage.setItem(keys.r2SparerPB, r2SparerPB.value));
    }

    if (r2KirchensteuerPct) {
        const saved = localStorage.getItem(keys.r2KirchensteuerPct);
        r2KirchensteuerPct.value = saved || defaults.r2KirchensteuerPct;
        r2KirchensteuerPct.addEventListener('change', () => localStorage.setItem(keys.r2KirchensteuerPct, r2KirchensteuerPct.value));
    }

    if (r2Steuerquote) {
        const saved = localStorage.getItem(keys.r2Steuerquote);
        r2Steuerquote.value = saved || defaults.r2Steuerquote;
        r2Steuerquote.addEventListener('input', () => localStorage.setItem(keys.r2Steuerquote, r2Steuerquote.value));
    }

    // Sync P1 zu alten Feldern
    const syncP1ToOld = () => {
        const startAlterOld = document.getElementById('startAlter');
        const geschlechtOld = document.getElementById('geschlecht');
        const startSPBOld = document.getElementById('startSPB');
        const kirchensteuerSatzOld = document.getElementById('kirchensteuerSatz');
        const renteMonatlichOld = document.getElementById('renteMonatlich');
        const renteStartOffsetJahreOld = document.getElementById('renteStartOffsetJahre');

        if (startAlterOld && p1StartAlter) startAlterOld.value = p1StartAlter.value;
        if (geschlechtOld && p1Geschlecht) geschlechtOld.value = p1Geschlecht.value;
        if (startSPBOld && p1SparerPB) startSPBOld.value = p1SparerPB.value;
        if (kirchensteuerSatzOld && p1KirchensteuerPct) kirchensteuerSatzOld.value = (parseFloat(p1KirchensteuerPct.value) / 100).toFixed(2);
        if (renteMonatlichOld && p1Monatsrente) renteMonatlichOld.value = p1Monatsrente.value;
        if (renteStartOffsetJahreOld && p1StartInJahren) renteStartOffsetJahreOld.value = p1StartInJahren.value;
    };

    syncP1ToOld();

    [p1StartAlter, p1Geschlecht, p1SparerPB, p1KirchensteuerPct, p1Monatsrente, p1StartInJahren].forEach(el => {
        if (el) el.addEventListener('input', syncP1ToOld);
        if (el) el.addEventListener('change', syncP1ToOld);
    });
}

/**
 * Haupt-Initialisierungsfunktion für die Simulator-UI
 */
export function initSimulatorUI() {
    // Pflege-UI
    const pflegePresetSelect = document.getElementById('pflegeKostenPreset');
    const pflegeHintEl = document.getElementById('pflegePresetHint');

    if (pflegePresetSelect) {
        pflegePresetSelect.addEventListener('change', (e) => {
            applyPflegeKostenPreset(e.target.value);
            updatePflegePresetHint(pflegePresetSelect, pflegeHintEl);
        });
        updatePflegePresetHint(pflegePresetSelect, pflegeHintEl);
    }

    // Partner-Toggle
    const chkPartnerAktiv = document.getElementById('chkPartnerAktiv');
    const sectionRente2 = document.getElementById('sectionRente2');

    if (chkPartnerAktiv && sectionRente2) {
        chkPartnerAktiv.addEventListener('change', () => {
            localStorage.setItem('sim_partnerAktiv', chkPartnerAktiv.checked ? '1' : '0');
            sectionRente2.style.display = chkPartnerAktiv.checked ? 'block' : 'none';
        });
    }

    // Legacy Mortalitäts-Toggle
    const legacyMortalityToggle = document.getElementById('pflegeMortalitaetOverride');
    initializeLegacyMortalityToggleIfPresent(legacyMortalityToggle);

    // Sweep Grid Size Berechnung
    function updateSweepGridSize() {
        let totalSize = 1;
        let hasError = false;

        try {
            const ids = ['sweepRunwayMin', 'sweepRunwayTarget', 'sweepTargetEq', 'sweepRebalBand',
                        'sweepMaxSkimPct', 'sweepMaxBearRefillPct', 'sweepGoldTargetPct'];
            for (const id of ids) {
                const el = document.getElementById(id);
                if (!el) continue;
                const values = parseRangeInput(el.value);
                if (values.length === 0) {
                    hasError = true;
                    break;
                }
                totalSize *= values.length;
            }
        } catch (error) {
            hasError = true;
        }

        const gridSizeEl = document.getElementById('sweepGridSize');
        if (gridSizeEl) {
            if (hasError) {
                gridSizeEl.textContent = 'Grid: ? Kombis';
                gridSizeEl.style.color = '#999';
            } else if (totalSize > 300) {
                gridSizeEl.textContent = `Grid: ${totalSize} Kombis (Max: 300)`;
                gridSizeEl.style.color = '#d32f2f';
            } else {
                gridSizeEl.textContent = `Grid: ${totalSize} Kombis`;
                gridSizeEl.style.color = 'var(--secondary-color)';
            }
        }
    }

    // Sweep Input Listener
    const sweepInputIds = [
        'sweepRunwayMin', 'sweepRunwayTarget', 'sweepTargetEq', 'sweepRebalBand',
        'sweepMaxSkimPct', 'sweepMaxBearRefillPct', 'sweepGoldTargetPct'
    ];

    sweepInputIds.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', updateSweepGridSize);
        }
    });

    updateSweepGridSize();

    // Tab-Switching
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabPanels = document.querySelectorAll('.tab-panel');

    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabPanels.forEach(panel => panel.classList.remove('active'));

            button.classList.add('active');
            const tabId = 'tab-' + button.dataset.tab;
            const targetPanel = document.getElementById(tabId);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });

    // Sweep- und Rente-Defaults
    initSweepDefaultsWithLocalStorageFallback();
    initRente2ConfigWithLocalStorage();
}
