import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import type { SimulationInput } from '../types/rust-engine';

// Extended Input Interface to cover ALL legacy fields
export interface LegacySimulationInput extends SimulationInput {
    // Portfolio Extended
    startKapital: number;
    zielLiquiditaet: number;
    einstandAlt: number;
    einstandNeu: number;

    // Strategy Extended
    rebalBand: number;
    maxSkimPctOfEq: number;
    maxBearRefillPctOfEq: number;
    marketCapeRatio: number | null; // Legacy for capeRatio

    // Legacy Bedarfs (optional if we switch bindings, but keeping for compatibility)
    startFloorBedarf: number;
    startFlexBedarf: number;

    // Gold Legacy
    goldAllokationAktiv: boolean;
    goldAllokationProzent: number;
    goldSteuerfrei: boolean;
    goldRebalancingBand: number;

    // ... (rest of interface)

    // Person 1 Extended
    p1Geschlecht: 'm' | 'w' | 'd';

    p1StartInJahren: number;
    rentAdjMode: 'fix' | 'wage' | 'cpi';
    rentAdjPct: number;

    // Person 2 Extended
    p2Geschlecht: 'm' | 'w' | 'd';
    p2SparerPauschbetrag: number;
    p2KirchensteuerPct: number;
    p2StartInJahren: number;
    p2Steuerquote: number;

    // Widow
    widowPensionMode: 'stop' | 'percent';
    widowPensionPct: number;
    widowMarriageOffsetYears: number;
    widowMinMarriageYears: number;

    // Accumulation
    ansparphaseAktiv: boolean;
    ansparphaseDauerJahre: number;
    ansparrateMonatlich: number;
    sparrateIndexing: 'none' | 'inflation' | 'wage';

    // Care Detailed Matrix
    pflegeModellTyp: 'chronisch' | 'akut';
    pflegeRampUpJahre: number;
    pflegeMinDauer: number;
    pflegeMaxDauer: number;

    // Care Grades (Matrix)
    pflegeStufe1Zusatz: number;
    pflegeStufe1FlexCut: number;
    pflegeStufe1Mortality: number;

    pflegeStufe2Zusatz: number;
    pflegeStufe2FlexCut: number;
    pflegeStufe2Mortality: number;

    pflegeStufe3Zusatz: number;
    pflegeStufe3FlexCut: number;
    pflegeStufe3Mortality: number;

    pflegeStufe4Zusatz: number;
    pflegeStufe4FlexCut: number;
    pflegeStufe4Mortality: number;

    pflegeStufe5Zusatz: number;
    pflegeStufe5FlexCut: number;
    pflegeStufe5Mortality: number;

    // Monte Carlo Settings
    mcAnzahl: number;
    mcDauer: number;
    mcBlockSize: number;
    mcSeed: number;
    mcMethode: 'regime_markov' | 'regime_iid' | 'block';
    useCapeSampling: boolean;
    stressPreset: string;

    // Backtest Settings
    btStartJahr: number;
    btEndJahr: number;
}

const DEFAULT_LEGACY_INPUT: LegacySimulationInput = {
    // Portfolio
    startKapital: 225000.0,
    depotwertAlt: 0.0,
    depotwertNeu: 0.0, // Ensure this defaults
    zielLiquiditaet: 18000.0,
    startFloorBedarf: 12000.0,
    startFlexBedarf: 22000.0,

    // WASM Fields Mapped
    floorBedarf: 12000.0,
    flexBedarf: 22000.0,
    capeRatio: 32.0,
    marketCapeRatio: 32.0,
    einstandAlt: 0.0,
    einstandNeu: 0.0,
    costBasisAlt: 0.0,
    costBasisNeu: 0.0,
    aktuelleLiquiditaet: null, // Let engine sum it or user override

    // Strategy
    risikoprofil: 'ausgewogen',
    targetEq: 60.0,
    rebalBand: 25.0,
    maxSkimPctOfEq: 10.0,
    maxBearRefillPctOfEq: 5.0,
    runwayMinMonths: 24,
    runwayTargetMonths: 36,

    // Gold
    goldAllokationAktiv: true,
    goldAktiv: true, // WASM
    goldAllokationProzent: 7.5,
    goldZielProzent: 7.5, // WASM
    goldFloorProzent: 1.0,
    goldWert: 0.0,
    goldCost: 0.0,
    goldSteuerfrei: true,
    goldRebalancingBand: 25.0,

    // Person 1
    aktuellesAlter: 63,
    p1Geschlecht: 'm',
    renteMonatlich: 650.0,
    renteStartInJahren: 5,
    p1StartInJahren: 5,
    renteAnpassungPct: 2.0,
    rentAdjMode: 'wage',
    rentAdjPct: 2.0,
    renteSteuerpflichtigPct: 83.0,
    p1SparerPauschbetrag: 1000.0,
    p1KirchensteuerPct: 9.0,

    // Person 2
    partnerAktiv: false,
    p2AktuellesAlter: 60,
    p2Geschlecht: 'w',
    p2RenteMonatlich: 0.0,
    p2RenteStartInJahren: 7,
    p2StartInJahren: 7,
    p2RenteAnpassungPct: 2.0,
    p2SparerPauschbetrag: 0.0,
    p2KirchensteuerPct: 0.0,
    p2Steuerquote: 0.0,

    // Widow
    widowPensionMode: 'percent',
    widowPensionPct: 55.0,
    widowMarriageOffsetYears: 0,
    widowMinMarriageYears: 1,

    // Tax
    kapitalertragsteuer: 25.0,
    soli: 5.5,

    // Accumulation
    ansparphaseAktiv: false,
    ansparphaseDauerJahre: 0,
    ansparrateMonatlich: 0.0,
    sparrateIndexing: 'inflation',
    ansparrateDynamik: 0.0,

    // Care
    pflegefallLogikAktiv: true, // Defaulting to true as per screenshot
    pflegeModellTyp: "chronisch",
    pflegeRampUpJahre: 5,
    pflegeDauerJahre: 10,
    pflegeMinDauer: 5,
    pflegeMaxDauer: 10,

    // Care Matrix Defaults
    pflegeStufe1Zusatz: 6000.0, pflegeStufe1FlexCut: 75.0, pflegeStufe1Mortality: 0.0,
    pflegeStufe2Zusatz: 12000.0, pflegeStufe2FlexCut: 25.0, pflegeStufe2Mortality: 0.0,
    pflegeStufe3Zusatz: 18000.0, pflegeStufe3FlexCut: 10.0, pflegeStufe3Mortality: 3.0,
    pflegeStufe4Zusatz: 32000.0, pflegeStufe4FlexCut: 0.0, pflegeStufe4Mortality: 5.0,
    pflegeStufe5Zusatz: 60000.0, pflegeStufe5FlexCut: 0.0, pflegeStufe5Mortality: 5.0,

    pflegeMaxFloor: 120000.0,
    pflegeRegionalZuschlag: 0.0,
    pflegeKostenDrift: 3.5,

    // Use legacy fields to satisfy type (won't use individually in matrix)
    pflegeKostenStufe1: 6000.0,
    pflegeKostenStufe2: 12000.0,
    pflegeKostenStufe3: 18000.0,
    pflegeKostenStufe4: 32000.0,
    pflegeKostenStufe5: 60000.0,
    pflegeVersicherungMonatlich: 0.0,

    // MC Settings
    mcAnzahl: 1000,
    mcDauer: 35,
    mcBlockSize: 5,
    mcSeed: 12345,
    mcMethode: 'regime_markov',
    useCapeSampling: false,
    stressPreset: 'none',

    // Backtest Settings
    btStartJahr: 2000,
    btEndJahr: 2023
};

function createUserInputStore() {
    let initialValue = DEFAULT_LEGACY_INPUT;

    if (browser) {
        const stored = localStorage.getItem('simulationInput_v2'); // Increment version
        if (stored) {
            try {
                initialValue = { ...DEFAULT_LEGACY_INPUT, ...JSON.parse(stored) };
            } catch (e) {
                console.warn('Failed to parse stored simulation input', e);
            }
        }
    }

    const { subscribe, set, update } = writable<LegacySimulationInput>(initialValue);

    return {
        subscribe,
        set: (value: LegacySimulationInput) => {
            if (browser) {
                try {
                    localStorage.setItem('simulationInput_v2', JSON.stringify(value));
                } catch (e) { console.error('LocalStorage save failed', e); }
            }
            set(value);
        },
        update: (fn: (v: LegacySimulationInput) => LegacySimulationInput) => {
            update(v => {
                const newValue = fn(v);
                if (browser) {
                    try {
                        localStorage.setItem('simulationInput_v2', JSON.stringify(newValue));
                    } catch (e) { console.error('LocalStorage save failed', e); }
                }
                return newValue;
            });
        },
        reset: () => {
            set(DEFAULT_LEGACY_INPUT);
            if (browser) {
                try {
                    localStorage.setItem('simulationInput_v2', JSON.stringify(DEFAULT_LEGACY_INPUT));
                } catch (e) { console.error('LocalStorage reset failed', e); }
            }
        }
    };
}

export const userInput = createUserInputStore();
