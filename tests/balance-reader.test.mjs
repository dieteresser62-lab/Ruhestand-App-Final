"use strict";

/**
 * Tests für balance-reader.js
 * - UIReader.readAllInputs() mit Mock-DOM
 * - Profile-Overrides aus localStorage
 * - Gold-Modul Defaults
 * - Tranchen-Aggregation
 * - applyStoredInputs() und applySideEffectsFromInputs()
 */

console.log('--- Balance Reader Tests ---');

// Mock für localStorage
class MockLocalStorage {
    constructor() {
        this.store = new Map();
    }
    getItem(key) {
        return this.store.has(key) ? this.store.get(key) : null;
    }
    setItem(key, value) {
        this.store.set(key, String(value));
    }
    removeItem(key) {
        this.store.delete(key);
    }
    clear() {
        this.store.clear();
    }
    key(index) {
        return Array.from(this.store.keys())[index] || null;
    }
    get length() {
        return this.store.size;
    }
}

// Mock-Element für DOM-Simulation
class MockElement {
    constructor(type = 'input', value = '', checked = false) {
        this.type = type;
        this.value = value;
        this.checked = checked;
        this.disabled = false;
        this.style = { display: '' };
        this.classList = {
            _classes: new Set(),
            contains(cls) { return this._classes.has(cls); },
            add(cls) { this._classes.add(cls); },
            remove(cls) { this._classes.delete(cls); }
        };
    }
}

// Mock für document.getElementById
function createDocumentMock(elements = {}) {
    return {
        getElementById: (id) => elements[id] || null,
        createElement: (tag) => new MockElement(tag),
        createDocumentFragment: () => ({ appendChild: () => { } })
    };
}

// UIUtils Mock
const UIUtils = {
    parseCurrency(value) {
        if (value === null || value === undefined || value === '') return 0;
        const raw = String(value).trim().replace(/\s/g, '');
        if (!raw) return 0;
        const lastComma = raw.lastIndexOf(',');
        const lastDot = raw.lastIndexOf('.');
        let normalized = raw.replace(/[^\d,.-]/g, '');
        if (lastComma !== -1 && lastDot !== -1) {
            if (lastComma > lastDot) {
                normalized = normalized.replace(/\./g, '').replace(',', '.');
            } else {
                normalized = normalized.replace(/,/g, '');
            }
        } else if (lastComma !== -1) {
            normalized = normalized.replace(/\./g, '').replace(',', '.');
        } else if (lastDot !== -1) {
            const parts = normalized.split('.');
            const tail = parts[parts.length - 1];
            if (tail.length === 3) {
                normalized = normalized.replace(/\./g, '');
            }
        }
        const parsed = parseFloat(normalized);
        return Number.isFinite(parsed) ? parsed : 0;
    },
    formatNumber(num) {
        return new Intl.NumberFormat('de-DE').format(num);
    }
};

// calculateAggregatedValues Mock
function calculateAggregatedValues() {
    const saved = localStorage.getItem('depot_tranchen');
    if (!saved) return null;
    try {
        const tranchen = JSON.parse(saved);
        if (!Array.isArray(tranchen) || tranchen.length === 0) return null;

        let depotwertAlt = 0, depotwertNeu = 0, geldmarktEtf = 0, goldWert = 0;
        let costBasisAlt = 0, costBasisNeu = 0, goldCost = 0;

        for (const t of tranchen) {
            const wert = t.wert || 0;
            const cost = t.einstand || 0;
            switch (t.type) {
                case 'alt': depotwertAlt += wert; costBasisAlt += cost; break;
                case 'neu': depotwertNeu += wert; costBasisNeu += cost; break;
                case 'geldmarkt': geldmarktEtf += wert; break;
                case 'gold': goldWert += wert; goldCost += cost; break;
            }
        }
        return { depotwertAlt, depotwertNeu, geldmarktEtf, goldWert, costBasisAlt, costBasisNeu, goldCost };
    } catch {
        return null;
    }
}

// Vereinfachter UIReader für Tests (aus balance-reader.js extrahiert)
let dom = null;

function initUIReader(domRefs) {
    dom = domRefs;
}

const UIReader = {
    readAllInputs() {
        const num = (id) => dom.inputs[id] ? UIUtils.parseCurrency(dom.inputs[id].value) : 0;
        const val = (id) => dom.inputs[id] ? dom.inputs[id].value : '';
        const checked = (id) => dom.inputs[id] ? dom.inputs[id].checked : false;

        const readProfileNumber = (key) => {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined || raw === '') return null;
            const n = UIUtils.parseCurrency(raw);
            return Number.isFinite(n) ? n : null;
        };
        const readProfileBool = (key) => {
            const raw = localStorage.getItem(key);
            if (raw === null || raw === undefined || raw === '') return null;
            const normalized = String(raw).toLowerCase();
            if (normalized === 'true') return true;
            if (normalized === 'false') return false;
            return null;
        };

        const profileTagesgeld = readProfileNumber('profile_tagesgeld');
        const profileRenteAktiv = readProfileBool('profile_rente_aktiv');
        const profileRenteMonatlich = readProfileNumber('profile_rente_monatlich');
        const profileSonstigeEinkuenfte = readProfileNumber('profile_sonstige_einkuenfte');
        const profileAlter = readProfileNumber('profile_aktuelles_alter');
        const profileGoldAktiv = readProfileBool('profile_gold_aktiv');
        const profileGoldZiel = readProfileNumber('profile_gold_ziel_pct');
        const profileGoldFloor = readProfileNumber('profile_gold_floor_pct');
        const profileGoldSteuerfrei = readProfileBool('profile_gold_steuerfrei');
        const profileGoldRebalBand = readProfileNumber('profile_gold_rebal_band');

        let detailledTranches = null;
        try {
            const saved = localStorage.getItem('depot_tranchen');
            if (saved) {
                detailledTranches = JSON.parse(saved);
            }
        } catch { }

        const aggregated = (detailledTranches && Array.isArray(detailledTranches) && detailledTranches.length)
            ? calculateAggregatedValues()
            : null;

        const useAggregates = aggregated && (
            aggregated.depotwertAlt > 0 ||
            aggregated.depotwertNeu > 0 ||
            aggregated.geldmarktEtf > 0 ||
            aggregated.goldWert > 0
        );

        const DEFAULT_GOLD_ZIEL = 7.5;
        const DEFAULT_GOLD_FLOOR = 1;
        const DEFAULT_GOLD_BAND = 25;

        let goldAktivFinal = (typeof profileGoldAktiv === 'boolean') ? profileGoldAktiv : checked('goldAktiv');
        let goldZielFinal = Number.isFinite(profileGoldZiel) ? profileGoldZiel : (parseFloat(val('goldZielProzent')) || 0);
        let goldFloorFinal = Number.isFinite(profileGoldFloor) ? profileGoldFloor : (parseFloat(val('goldFloorProzent')) || 0);
        let goldSteuerfreiFinal = (typeof profileGoldSteuerfrei === 'boolean') ? profileGoldSteuerfrei : checked('goldSteuerfrei');
        let rebalancingBandFinal = Number.isFinite(profileGoldRebalBand) ? profileGoldRebalBand : (parseFloat(val('rebalancingBand')) || 0);

        if (!Number.isFinite(goldZielFinal) || goldZielFinal <= 0 || goldZielFinal > 50) {
            goldZielFinal = DEFAULT_GOLD_ZIEL;
        }
        if (!Number.isFinite(goldFloorFinal) || goldFloorFinal < 0 || goldFloorFinal > 50) {
            goldFloorFinal = DEFAULT_GOLD_FLOOR;
        }
        if (goldAktivFinal && rebalancingBandFinal <= 0) {
            rebalancingBandFinal = DEFAULT_GOLD_BAND;
        }

        const hasProfileRenteSum = Number.isFinite(profileRenteMonatlich)
            || Number.isFinite(profileSonstigeEinkuenfte);
        const renteMonatlichFinal = hasProfileRenteSum
            ? (Number.isFinite(profileRenteMonatlich) ? profileRenteMonatlich : 0)
            + (Number.isFinite(profileSonstigeEinkuenfte) ? profileSonstigeEinkuenfte : 0)
            : num('renteMonatlich');
        const renteAktivFinal = hasProfileRenteSum
            ? renteMonatlichFinal > 0
            : ((typeof profileRenteAktiv === 'boolean') ? profileRenteAktiv : val('renteAktiv') === 'ja');

        return {
            aktuellesAlter: Number.isFinite(profileAlter) ? profileAlter : (parseInt(val('aktuellesAlter')) || 0),
            floorBedarf: num('floorBedarf'),
            flexBedarf: num('flexBedarf'),
            inflation: parseFloat(val('inflation')) || 0,
            tagesgeld: Number.isFinite(profileTagesgeld) ? profileTagesgeld : num('tagesgeld'),
            geldmarktEtf: useAggregates ? aggregated.geldmarktEtf : num('geldmarktEtf'),
            depotwertAlt: useAggregates ? aggregated.depotwertAlt : num('depotwertAlt'),
            depotwertNeu: useAggregates ? aggregated.depotwertNeu : num('depotwertNeu'),
            goldWert: useAggregates ? aggregated.goldWert : num('goldWert'),
            endeVJ: parseFloat(val('endeVJ')) || 0,
            ath: parseFloat(val('ath')) || 0,
            jahreSeitAth: parseFloat(val('jahreSeitAth')) || 0,
            renteAktiv: renteAktivFinal,
            renteMonatlich: renteMonatlichFinal,
            goldAktiv: goldAktivFinal,
            goldZielProzent: goldZielFinal,
            goldFloorProzent: goldFloorFinal,
            goldSteuerfrei: goldSteuerfreiFinal,
            rebalancingBand: rebalancingBandFinal,
            costBasisAlt: useAggregates ? aggregated.costBasisAlt : num('costBasisAlt'),
            costBasisNeu: useAggregates ? aggregated.costBasisNeu : num('costBasisNeu'),
            goldCost: useAggregates ? aggregated.goldCost : num('goldCost'),
            kirchensteuerSatz: parseFloat(val('kirchensteuerSatz')) || 0,
            sparerPauschbetrag: num('sparerPauschbetrag'),
            detailledTranches
        };
    },

    applyStoredInputs(storedInputs = {}) {
        Object.keys(dom.inputs).forEach(key => {
            const el = dom.inputs[key];
            if (el && key in storedInputs) {
                if (el.type === 'checkbox') {
                    el.checked = storedInputs[key];
                } else if (el.classList.contains('currency')) {
                    el.value = UIUtils.formatNumber(UIUtils.parseCurrency(storedInputs[key]));
                } else if (key === 'renteAktiv' && typeof storedInputs[key] === 'boolean') {
                    el.value = storedInputs[key] ? 'ja' : 'nein';
                } else {
                    el.value = storedInputs[key];
                }
            }
        });
        this.applySideEffectsFromInputs();
    },

    applySideEffectsFromInputs() {
        const goldAktivInput = dom.inputs.goldAktiv;
        const goldPanel = dom.controls.goldPanel;
        const isGoldActive = goldAktivInput ? goldAktivInput.checked : false;
        if (goldPanel) {
            goldPanel.style.display = isGoldActive ? 'block' : 'none';
        }

        const renteAktivInput = dom.inputs.renteAktiv;
        const renteMonatlichInput = dom.inputs.renteMonatlich;
        if (renteAktivInput && renteMonatlichInput) {
            const isRenteAktiv = renteAktivInput.value === 'ja';
            renteMonatlichInput.disabled = !isRenteAktiv;
            if (!isRenteAktiv) {
                renteMonatlichInput.value = UIUtils.formatNumber(0);
            }
        }
    }
};

// Setup
const mockLocalStorage = new MockLocalStorage();
global.localStorage = mockLocalStorage;

// ===== TESTS =====

// Test 1: readAllInputs - Basis mit DOM-Werten
console.log('Test 1: readAllInputs - Basis mit DOM-Werten');
{
    mockLocalStorage.clear();

    const inputs = {
        aktuellesAlter: new MockElement('input', '67'),
        // Punkt als Tausendertrenner soll korrekt geparst werden.
        floorBedarf: new MockElement('input', '24.000'),
        flexBedarf: new MockElement('input', '12.000'),
        inflation: new MockElement('input', '2.5'),
        tagesgeld: new MockElement('input', '50.000'),
        geldmarktEtf: new MockElement('input', '20.000'),
        depotwertAlt: new MockElement('input', '200.000'),
        depotwertNeu: new MockElement('input', '300.000'),
        goldWert: new MockElement('input', '30.000'),
        endeVJ: new MockElement('input', '150'),
        ath: new MockElement('input', '160'),
        jahreSeitAth: new MockElement('input', '1'),
        renteAktiv: new MockElement('select', 'ja'),
        renteMonatlich: new MockElement('input', '1.500'),
        goldAktiv: new MockElement('checkbox', '', false),
        goldZielProzent: new MockElement('input', '10'),
        goldFloorProzent: new MockElement('input', '2'),
        goldSteuerfrei: new MockElement('checkbox', '', true),
        rebalancingBand: new MockElement('input', '20'),
        costBasisAlt: new MockElement('input', '150.000'),
        costBasisNeu: new MockElement('input', '250.000'),
        goldCost: new MockElement('input', '25.000'),
        kirchensteuerSatz: new MockElement('input', '8'),
        sparerPauschbetrag: new MockElement('input', '1.000')
    };

    initUIReader({ inputs, controls: {} });

    // Ergebnis: numerisch normalisierte Werte aus dem DOM.
    const result = UIReader.readAllInputs();

    assertEqual(result.aktuellesAlter, 67, 'aktuellesAlter sollte 67 sein');
    assertEqual(result.floorBedarf, 24000, 'floorBedarf sollte 24000 sein');
    assertEqual(result.flexBedarf, 12000, 'flexBedarf sollte 12000 sein');
    assertClose(result.inflation, 2.5, 0.01, 'inflation sollte 2.5 sein');
    assertEqual(result.tagesgeld, 50000, 'tagesgeld sollte 50000 sein');
    assertEqual(result.depotwertAlt, 200000, 'depotwertAlt sollte 200000 sein');
    assertEqual(result.renteAktiv, true, 'renteAktiv sollte true sein');
    assertEqual(result.renteMonatlich, 1500, 'renteMonatlich sollte 1500 sein');
    console.log('✓ readAllInputs Basis OK');
}

// Test 2: Profile-Override hat Vorrang vor DOM
console.log('Test 2: Profile-Override hat Vorrang vor DOM');
{
    mockLocalStorage.clear();

    // Setze Profile-Werte (localStorage überschreibt DOM).
    mockLocalStorage.setItem('profile_aktuelles_alter', '70');
    mockLocalStorage.setItem('profile_tagesgeld', '100000');
    mockLocalStorage.setItem('profile_rente_monatlich', '2000');

    const inputs = {
        aktuellesAlter: new MockElement('input', '67'), // DOM sagt 67
        tagesgeld: new MockElement('input', '50.000'), // DOM sagt 50000
        renteMonatlich: new MockElement('input', '1.500'), // DOM sagt 1500
        renteAktiv: new MockElement('select', 'nein')
    };

    initUIReader({ inputs, controls: {} });

    const result = UIReader.readAllInputs();

    assertEqual(result.aktuellesAlter, 70, 'Profile-Alter (70) sollte DOM (67) überschreiben');
    assertEqual(result.tagesgeld, 100000, 'Profile-Tagesgeld (100000) sollte DOM (50000) überschreiben');
    assertEqual(result.renteMonatlich, 2000, 'Profile-Rente (2000) sollte DOM (1500) überschreiben');
    assertEqual(result.renteAktiv, true, 'renteAktiv sollte true sein wenn Profile-Rente > 0');
    console.log('✓ Profile-Override OK');
}

// Test 3: Gold-Modul Defaults
console.log('Test 3: Gold-Modul Defaults');
{
    mockLocalStorage.clear();

    const inputs = {
        goldAktiv: new MockElement('checkbox', '', true), // Aktiv
        goldZielProzent: new MockElement('input', '0'), // Ungültig -> Default
        goldFloorProzent: new MockElement('input', '-5'), // Ungültig -> Default
        rebalancingBand: new MockElement('input', '0') // 0 bei aktivem Gold -> Default
    };

    initUIReader({ inputs, controls: {} });

    const result = UIReader.readAllInputs();

    assertClose(result.goldZielProzent, 7.5, 0.01, 'goldZielProzent sollte Default 7.5 sein');
    assertClose(result.goldFloorProzent, 1, 0.01, 'goldFloorProzent sollte Default 1 sein');
    assertEqual(result.rebalancingBand, 25, 'rebalancingBand sollte Default 25 sein bei aktivem Gold');
    console.log('✓ Gold-Modul Defaults OK');
}

// Test 4: Profile-Gold-Werte überschreiben Defaults
console.log('Test 4: Profile-Gold-Werte überschreiben Defaults');
{
    mockLocalStorage.clear();

    mockLocalStorage.setItem('profile_gold_aktiv', 'true');
    mockLocalStorage.setItem('profile_gold_ziel_pct', '15');
    mockLocalStorage.setItem('profile_gold_floor_pct', '3');
    mockLocalStorage.setItem('profile_gold_rebal_band', '30');

    const inputs = {
        goldAktiv: new MockElement('checkbox', '', false), // DOM sagt inaktiv
        goldZielProzent: new MockElement('input', '5'),
        goldFloorProzent: new MockElement('input', '1'),
        rebalancingBand: new MockElement('input', '20')
    };

    initUIReader({ inputs, controls: {} });

    const result = UIReader.readAllInputs();

    assertEqual(result.goldAktiv, true, 'Profile-goldAktiv sollte DOM überschreiben');
    assertEqual(result.goldZielProzent, 15, 'Profile-goldZiel sollte DOM überschreiben');
    assertEqual(result.goldFloorProzent, 3, 'Profile-goldFloor sollte DOM überschreiben');
    assertEqual(result.rebalancingBand, 30, 'Profile-rebalBand sollte DOM überschreiben');
    console.log('✓ Profile-Gold-Werte OK');
}

// Test 5: Tranchen-Aggregation
console.log('Test 5: Tranchen-Aggregation');
{
    mockLocalStorage.clear();

    const tranchen = [
        { type: 'alt', wert: 100000, einstand: 80000 },
        { type: 'alt', wert: 50000, einstand: 40000 },
        { type: 'neu', wert: 200000, einstand: 180000 },
        { type: 'geldmarkt', wert: 30000, einstand: 30000 },
        { type: 'gold', wert: 25000, einstand: 20000 }
    ];
    mockLocalStorage.setItem('depot_tranchen', JSON.stringify(tranchen));

    const inputs = {
        depotwertAlt: new MockElement('input', '999.999'), // Wird durch Aggregate überschrieben
        depotwertNeu: new MockElement('input', '888.888'),
        geldmarktEtf: new MockElement('input', '777.777'),
        goldWert: new MockElement('input', '666.666'),
        costBasisAlt: new MockElement('input', '555.555'),
        costBasisNeu: new MockElement('input', '444.444'),
        goldCost: new MockElement('input', '333.333')
    };

    initUIReader({ inputs, controls: {} });

    const result = UIReader.readAllInputs();

    assertEqual(result.depotwertAlt, 150000, 'Aggregiertes depotwertAlt sollte 150000 sein');
    assertEqual(result.depotwertNeu, 200000, 'Aggregiertes depotwertNeu sollte 200000 sein');
    assertEqual(result.geldmarktEtf, 30000, 'Aggregiertes geldmarktEtf sollte 30000 sein');
    assertEqual(result.goldWert, 25000, 'Aggregiertes goldWert sollte 25000 sein');
    assertEqual(result.costBasisAlt, 120000, 'Aggregiertes costBasisAlt sollte 120000 sein');
    assertEqual(result.costBasisNeu, 180000, 'Aggregiertes costBasisNeu sollte 180000 sein');
    assertEqual(result.goldCost, 20000, 'Aggregiertes goldCost sollte 20000 sein');
    assert(result.detailledTranches !== null, 'detailledTranches sollte gesetzt sein');
    assertEqual(result.detailledTranches.length, 5, 'detailledTranches sollte 5 Positionen haben');
    console.log('✓ Tranchen-Aggregation OK');
}

// Test 6: Sonstige Einkünfte werden zu Rente addiert
console.log('Test 6: Sonstige Einkünfte werden zu Rente addiert');
{
    mockLocalStorage.clear();

    mockLocalStorage.setItem('profile_rente_monatlich', '1500');
    mockLocalStorage.setItem('profile_sonstige_einkuenfte', '500');

    const inputs = {
        renteAktiv: new MockElement('select', 'nein'),
        renteMonatlich: new MockElement('input', '0')
    };

    initUIReader({ inputs, controls: {} });

    const result = UIReader.readAllInputs();

    assertEqual(result.renteMonatlich, 2000, 'renteMonatlich sollte Summe aus Rente + Sonstige sein');
    assertEqual(result.renteAktiv, true, 'renteAktiv sollte true sein wenn Summe > 0');
    console.log('✓ Sonstige Einkünfte OK');
}

// Test 7: applyStoredInputs - Checkbox
console.log('Test 7: applyStoredInputs - Checkbox');
{
    mockLocalStorage.clear();

    const inputs = {
        goldAktiv: new MockElement('checkbox', '', false),
        goldSteuerfrei: new MockElement('checkbox', '', false)
    };

    initUIReader({ inputs, controls: { goldPanel: new MockElement() } });

    UIReader.applyStoredInputs({
        goldAktiv: true,
        goldSteuerfrei: true
    });

    assertEqual(inputs.goldAktiv.checked, true, 'goldAktiv sollte checked sein');
    assertEqual(inputs.goldSteuerfrei.checked, true, 'goldSteuerfrei sollte checked sein');
    console.log('✓ applyStoredInputs Checkbox OK');
}

// Test 8: applyStoredInputs - Currency-Formatierung
console.log('Test 8: applyStoredInputs - Currency-Formatierung');
{
    mockLocalStorage.clear();

    const currencyInput = new MockElement('input', '0');
    currencyInput.classList.add('currency');

    const inputs = {
        floorBedarf: currencyInput
    };

    initUIReader({ inputs, controls: {} });

    UIReader.applyStoredInputs({
        floorBedarf: 24000
    });

    // Prüfe formatierte Ausgabe (de-DE Format)
    assert(inputs.floorBedarf.value.includes('24'), 'Currency sollte formatiert sein');
    console.log('✓ applyStoredInputs Currency OK');
}

// Test 9: applyStoredInputs - renteAktiv Boolean zu "ja"/"nein"
console.log('Test 9: applyStoredInputs - renteAktiv Boolean');
{
    mockLocalStorage.clear();

    const inputs = {
        renteAktiv: new MockElement('select', 'nein')
    };

    initUIReader({ inputs, controls: {} });

    UIReader.applyStoredInputs({
        renteAktiv: true
    });

    assertEqual(inputs.renteAktiv.value, 'ja', 'renteAktiv boolean true sollte zu "ja" werden');

    UIReader.applyStoredInputs({
        renteAktiv: false
    });

    assertEqual(inputs.renteAktiv.value, 'nein', 'renteAktiv boolean false sollte zu "nein" werden');
    console.log('✓ applyStoredInputs renteAktiv Boolean OK');
}

// Test 10: applySideEffectsFromInputs - Gold-Panel
console.log('Test 10: applySideEffectsFromInputs - Gold-Panel');
{
    mockLocalStorage.clear();

    const goldPanel = new MockElement();
    const inputs = {
        goldAktiv: new MockElement('checkbox', '', true)
    };

    initUIReader({ inputs, controls: { goldPanel } });

    UIReader.applySideEffectsFromInputs();

    assertEqual(goldPanel.style.display, 'block', 'Gold-Panel sollte sichtbar sein wenn goldAktiv');

    inputs.goldAktiv.checked = false;
    UIReader.applySideEffectsFromInputs();

    assertEqual(goldPanel.style.display, 'none', 'Gold-Panel sollte versteckt sein wenn nicht goldAktiv');
    console.log('✓ applySideEffectsFromInputs Gold-Panel OK');
}

// Test 11: applySideEffectsFromInputs - Rente disabled
console.log('Test 11: applySideEffectsFromInputs - Rente disabled');
{
    mockLocalStorage.clear();

    const inputs = {
        renteAktiv: new MockElement('select', 'nein'),
        renteMonatlich: new MockElement('input', '1500')
    };

    initUIReader({ inputs, controls: {} });

    UIReader.applySideEffectsFromInputs();

    assertEqual(inputs.renteMonatlich.disabled, true, 'renteMonatlich sollte disabled sein bei renteAktiv=nein');
    assertEqual(inputs.renteMonatlich.value, '0', 'renteMonatlich sollte auf 0 gesetzt werden bei renteAktiv=nein');

    inputs.renteAktiv.value = 'ja';
    inputs.renteMonatlich.value = '1500';
    UIReader.applySideEffectsFromInputs();

    assertEqual(inputs.renteMonatlich.disabled, false, 'renteMonatlich sollte enabled sein bei renteAktiv=ja');
    console.log('✓ applySideEffectsFromInputs Rente disabled OK');
}

// Test 12: Leere Tranchen werden ignoriert
console.log('Test 12: Leere Tranchen werden ignoriert');
{
    mockLocalStorage.clear();

    mockLocalStorage.setItem('depot_tranchen', JSON.stringify([]));

    const inputs = {
        depotwertAlt: new MockElement('input', '100.000')
    };

    initUIReader({ inputs, controls: {} });

    const result = UIReader.readAllInputs();

    assertEqual(result.depotwertAlt, 100000, 'Bei leeren Tranchen sollte DOM-Wert verwendet werden');
    console.log('✓ Leere Tranchen OK');
}

// Test 13: Ungültige Tranchen-JSON
console.log('Test 13: Ungültige Tranchen-JSON');
{
    mockLocalStorage.clear();

    mockLocalStorage.setItem('depot_tranchen', 'nicht-json{{{');

    const inputs = {
        depotwertAlt: new MockElement('input', '100.000')
    };

    initUIReader({ inputs, controls: {} });

    const result = UIReader.readAllInputs();

    assertEqual(result.depotwertAlt, 100000, 'Bei ungültigem JSON sollte DOM-Wert verwendet werden');
    assertEqual(result.detailledTranches, null, 'detailledTranches sollte null sein bei Parse-Fehler');
    console.log('✓ Ungültige Tranchen-JSON OK');
}

// Cleanup
mockLocalStorage.clear();

console.log('--- Balance Reader Tests Abgeschlossen ---');
