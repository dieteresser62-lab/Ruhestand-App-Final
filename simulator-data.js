"use strict";

// --- DATA & CONFIG ---

/**
 * Altersabhängige Eintrittswahrscheinlichkeiten für Pflegegrade 1–5.
 *
 * Quelle: BARMER Pflegereport 2024, Kapitel 2. Die dort veröffentlichten
 * Prävalenzen pro Pflegegrad wurden auf Jahresinzidenzen heruntergebrochen,
 * indem wir eine durchschnittliche Pflegedauer von vier Jahren annehmen und
 * die Werte über 5-Jahres-Altersbuckets glätten. Die Summe der Grade ergibt
 * somit den jährlichen Eintritt in irgendeinen Pflegegrad.
 */
export const SUPPORTED_PFLEGE_GRADES = [1, 2, 3, 4, 5];

export const PFLEGE_GRADE_LABELS = {
    1: 'Pflegegrad 1 – geringe Beeinträchtigung',
    2: 'Pflegegrad 2 – erhebliche Beeinträchtigung',
    3: 'Pflegegrad 3 – schwere Beeinträchtigung',
    4: 'Pflegegrad 4 – schwerste Beeinträchtigung',
    5: 'Pflegegrad 5 – besondere Anforderungen'
};

/**
 * Jährliche Wahrscheinlichkeiten für Verschlechterung des Pflegegrades (Progression).
 *
 * Basierend auf Studien zur Pflegebedürftigkeitsentwicklung:
 * - Niedrigere Grade verschlechtern sich häufiger (mehr "Raum nach oben")
 * - Höhere Grade haben geringere Progressionsraten
 * - Im Durchschnitt dauert es 6-8 Jahre von PG1 bis PG5
 *
 * Beispiel: Bei PG2 beträgt die Wahrscheinlichkeit 12% pro Jahr,
 * im nächsten Jahr zu PG3 zu wechseln.
 */
export const PFLEGE_GRADE_PROGRESSION_PROBABILITIES = {
    1: 0.15,  // PG1 → PG2: 15% pro Jahr
    2: 0.12,  // PG2 → PG3: 12% pro Jahr
    3: 0.10,  // PG3 → PG4: 10% pro Jahr
    4: 0.08,  // PG4 → PG5: 8% pro Jahr
    5: 0.00   // PG5: Keine weitere Verschlechterung möglich
};

export const PFLEGE_GRADE_PROBABILITIES = {
    65: { 1: 0.012, 2: 0.006, 3: 0.003, 4: 0.0015, 5: 0.0005 },
    70: { 1: 0.020, 2: 0.010, 3: 0.005, 4: 0.0025, 5: 0.0010 },
    75: { 1: 0.035, 2: 0.018, 3: 0.009, 4: 0.0045, 5: 0.0020 },
    80: { 1: 0.055, 2: 0.032, 3: 0.016, 4: 0.0075, 5: 0.0035 },
    85: { 1: 0.085, 2: 0.055, 3: 0.032, 4: 0.0150, 5: 0.0070 },
    90: { 1: 0.120, 2: 0.080, 3: 0.050, 4: 0.0280, 5: 0.0120 },
    95: { 1: 0.140, 2: 0.090, 3: 0.060, 4: 0.0350, 5: 0.0150 }
};

/**
 * Historische Marktdaten (1969-2024)
 */
export const HISTORICAL_DATA = {
	1969: { msci_eur: 60.8, inflation_de: 1.9, zinssatz_de:6, lohn_de: 9.8, gold_eur_perf: -8.5},1970: { msci_eur: 60.9, inflation_de: 3.4, zinssatz_de: 7.5, lohn_de: 12.6, gold_eur_perf: 4.3 },1971: { msci_eur: 72.4, inflation_de: 5.3, zinssatz_de: 5, lohn_de: 10.5, gold_eur_perf: 19.8 },1972: { msci_eur: 88.4, inflation_de: 5.5, zinssatz_de: 4, lohn_de: 9.1, gold_eur_perf: 47.2 },1973: { msci_eur: 74.4, inflation_de: 7.1, zinssatz_de: 7, lohn_de: 10.2, gold_eur_perf: 68.5 },1974: { msci_eur: 53.6, inflation_de: 7, zinssatz_de: 6, lohn_de: 10.8, gold_eur_perf: 70.1 },1975: { msci_eur: 71, inflation_de: 6, zinssatz_de: 4.5, lohn_de: 7.2, gold_eur_perf: -25.8 },1976: { msci_eur: 72.6, inflation_de: 4.3, zinssatz_de: 3.5, lohn_de: 7.3, gold_eur_perf: -1.5 },1977: { msci_eur: 67.1, inflation_de: 3.7, zinssatz_de: 3, lohn_de: 7.1, gold_eur_perf: 22.4 },1978: { msci_eur: 77.7, inflation_de: 2.7, zinssatz_de: 3, lohn_de: 5.4, gold_eur_perf: 35.7 },1979: { msci_eur: 79.2, inflation_de: 4.1, zinssatz_de: 5, lohn_de: 6.2, gold_eur_perf: 126.3 },1980: { msci_eur: 97.8, inflation_de: 5.5, zinssatz_de: 8.5, lohn_de: 6.6, gold_eur_perf: -6.2 },1981: { msci_eur: 91.2, inflation_de: 6.3, zinssatz_de: 10.5, lohn_de: 4.8, gold_eur_perf: -20.8 },1982: { msci_eur: 90.7, inflation_de: 5.3, zinssatz_de: 7.5, lohn_de: 4.2, gold_eur_perf: 18.9 },1983: { msci_eur: 110.8, inflation_de: 3.3, zinssatz_de: 5.5, lohn_de: 3.7, gold_eur_perf: -18.9 },1984: { msci_eur: 114.5, inflation_de: 2.4, zinssatz_de: 5.5, lohn_de: 3.4, gold_eur_perf: -15.4 },1985: { msci_eur: 164.3, inflation_de: 2.2, zinssatz_de: 5.5, lohn_de: 3.7, gold_eur_perf: 12.7 },1986: { msci_eur: 206.5, inflation_de: -0.1, zinssatz_de: 4.5, lohn_de: 4.1, gold_eur_perf: 24.1 },1987: { msci_eur: 227.1, inflation_de: 0.2, zinssatz_de: 3.5, lohn_de: 3.2, gold_eur_perf: 1.8 },1988: { msci_eur: 274.6, inflation_de: 1.3, zinssatz_de: 4, lohn_de: 3.8, gold_eur_perf: -12.4 },1989: { msci_eur: 326.8, inflation_de: 2.8, zinssatz_de: 7, lohn_de: 3.9, gold_eur_perf: -2.4 },1990: { msci_eur: 274, inflation_de: 2.7, zinssatz_de: 8, lohn_de: 5.8, gold_eur_perf: -7.8 },1991: { msci_eur: 317.9, inflation_de: 3.5, zinssatz_de: 8.5, lohn_de: 6.7, gold_eur_perf: -6.1 },1992: { msci_eur: 300, inflation_de: 5.1, zinssatz_de: 9.5, lohn_de: 5.7, gold_eur_perf: -5.8 },1993: { msci_eur: 376.1, inflation_de: 4.5, zinssatz_de: 7.25, lohn_de: 3.3, gold_eur_perf: 20.1 },1994: { msci_eur: 382.7, inflation_de: 2.7, zinssatz_de: 5, lohn_de: 2.4, gold_eur_perf: -2.3 },1995: { msci_eur: 450.4, inflation_de: 1.7, zinssatz_de: 4, lohn_de: 3.5, gold_eur_perf: 0.6 },1996: { msci_eur: 505.7, inflation_de: 1.4, zinssatz_de: 3, lohn_de: 2.2, gold_eur_perf: -6.9 },1997: { msci_eur: 590, inflation_de: 1.9, zinssatz_de: 3, lohn_de: 1.9, gold_eur_perf: -20.7 },1998: { msci_eur: 758.3, inflation_de: 0.9, zinssatz_de: 3, lohn_de: 2.8, gold_eur_perf: 0.9 },1999: { msci_eur: 958.4, inflation_de: 0.6, zinssatz_de: 2.5, lohn_de: 2.7, gold_eur_perf: -0.6 },
    2000: { msci_eur: 823.1, inflation_de: 1.4, zinssatz_de: 4.25, lohn_de: 2.5, gold_eur_perf: -2.7 },2001: { msci_eur: 675.2, inflation_de: 2.1, zinssatz_de: 3.75, lohn_de: 1.9, gold_eur_perf: 4.3 },2002: { msci_eur: 462.8, inflation_de: 1.3, zinssatz_de: 2.75, lohn_de: 2.1, gold_eur_perf: 19.4 },2003: { msci_eur: 511, inflation_de: 1, zinssatz_de: 2, lohn_de: 1.2, gold_eur_perf: 11.7 },2004: { msci_eur: 565.6, inflation_de: 1.7, zinssatz_de: 2, lohn_de: 1.1, gold_eur_perf: 2.2 },2005: { msci_eur: 724, inflation_de: 1.5, zinssatz_de: 2.1, lohn_de: 0.8, gold_eur_perf: 22.3 },2006: { msci_eur: 825, inflation_de: 1.8, zinssatz_de: 3, lohn_de: 1.6, gold_eur_perf: 17.3 },2007: { msci_eur: 842.2, inflation_de: 2.3, zinssatz_de: 4, lohn_de: 2.8, gold_eur_perf: 2.1 },2008: { msci_eur: 462.6, inflation_de: 2.8, zinssatz_de: 3.25, lohn_de: 3.4, gold_eur_perf: 2.7 },2009: { msci_eur: 609.4, inflation_de: 0.2, zinssatz_de: 1, lohn_de: 0.8, gold_eur_perf: 17.2 },2010: { msci_eur: 687.9, inflation_de: 1.1, zinssatz_de: 1, lohn_de: 2.3, gold_eur_perf: 34.9 },2011: { msci_eur: 634.3, inflation_de: 2.5, zinssatz_de: 1.25, lohn_de: 3.9, gold_eur_perf: 7.6 },2012: { msci_eur: 726.6, inflation_de: 2.1, zinssatz_de: 0.75, lohn_de: 2.9, gold_eur_perf: 4 },2013: { msci_eur: 898, inflation_de: 1.6, zinssatz_de: 0.25, lohn_de: 2.4, gold_eur_perf: -22.8 },2014: { msci_eur: 1062.5, inflation_de: 0.9, zinssatz_de: 0.05, lohn_de: 2.8, gold_eur_perf: -0.6 },2015: { msci_eur: 1159.2, inflation_de: 0.7, zinssatz_de: 0.05, lohn_de: 2.9, gold_eur_perf: -10 },2016: { msci_eur: 1248, inflation_de: 0.4, zinssatz_de: 0, lohn_de: 2.5, gold_eur_perf: 11.7 },2017: { msci_eur: 1329.8, inflation_de: 1.7, zinssatz_de: 0, lohn_de: 2.6, gold_eur_perf: -0.4 },2018: { msci_eur: 1268.4, inflation_de: 1.9, zinssatz_de: 0, lohn_de: 3.1, gold_eur_perf: -4.3 },2019: { msci_eur: 1619.5, inflation_de: 1.4, zinssatz_de: 0, lohn_de: 2.8, gold_eur_perf: 19.4 },2020: { msci_eur: 1706.7, inflation_de: 0.5, zinssatz_de: -0.5, lohn_de: 1.2, gold_eur_perf: 13.9 },2021: { msci_eur: 2260.4, inflation_de: 3.1, zinssatz_de: -0.5, lohn_de: 3, gold_eur_perf: -5.2 },2022: { msci_eur: 1960.9, inflation_de: 6.9, zinssatz_de: 1.25, lohn_de: 4, gold_eur_perf: 5.7 },2023: { msci_eur: 2318.9, inflation_de: 5.9, zinssatz_de: 3.5, lohn_de: 6, gold_eur_perf: 12.1 },2024: { msci_eur: 2500, inflation_de: 2.5, zinssatz_de: 3.75, lohn_de: 3, gold_eur_perf: 15 }
};

/**
 * Sterbetafeln für Männer und Frauen
 */
export const MORTALITY_TABLE = {
    m:{50:0.003,51:0.003,52:0.004,53:0.004,54:0.004,55:0.005,56:0.005,57:0.006,58:0.006,59:0.007,60:0.007,61:0.008,62:0.009,63:0.009,64:0.010,65:0.010,66:0.011,67:0.012,68:0.013,69:0.014,70:0.016,71:0.017,72:0.019,73:0.021,74:0.023,75:0.026,76:0.029,77:0.032,78:0.036,79:0.040,80:0.045,81:0.051,82:0.057,83:0.065,84:0.073,85:0.083,86:0.094,87:0.107,88:0.121,89:0.137,90:0.155,91:0.175,92:0.197,93:0.221,94:0.247,95:0.275,96:0.305,97:0.337,98:0.370,99:0.400,100:0.430,101:0.46,102:0.49,103:0.52,104:0.55,105:0.6,106:0.65,107:0.7,108:0.8,109:0.9,110:1},
    w:{50:0.002,51:0.002,52:0.002,53:0.003,54:0.003,55:0.003,56:0.004,57:0.004,58:0.004,59:0.005,60:0.005,61:0.006,62:0.006,63:0.007,64:0.007,65:0.007,66:0.008,67:0.008,68:0.009,69:0.010,70:0.011,71:0.012,72:0.013,73:0.015,74:0.016,75:0.018,76:0.021,77:0.023,78:0.026,79:0.030,80:0.034,81:0.039,82:0.044,83:0.050,84:0.057,85:0.066,86:0.076,87:0.087,88:0.100,89:0.115,90:0.131,91:0.149,92:0.169,93:0.191,94:0.215,95:0.241,96:0.269,97:0.298,98:0.329,99:0.360,100:0.390,101:0.42,102:0.45,103:0.48,104:0.51,105:0.55,106:0.6,107:0.65,108:0.75,109:0.85,110:1}
};

/**
 * Stress-Szenarien für die Simulation
 */
export const STRESS_PRESETS = {
  NONE: { label: "Kein Stress", type: "none", years: 0 },

  STAGFLATION_70s: {
    label: "Stagflation (70er-ähnlich)",
    type: "conditional_bootstrap",
    years: 7,
    filter: { inflationMin: 7.0, equityRealMax: -2.0 }
  },

  DOUBLE_BEAR_00s: {
    label: "Doppelbär (Dotcom/GFC-ähnlich)",
    type: "conditional_bootstrap",
    years: 6,
    filter: { equityRealMax: -8.0, minCluster: 2 }
  },

  INFLATION_SPIKE_3Y: {
    label: "Inflationsschock (3 Jahre)",
    type: "parametric",
    years: 3,
    muShiftEq: -0.05,
    volScaleEq: 1.5,
    inflationFloor: 7.0,
    muShiftAu: 0.00
  },

  FORCED_DRAWDOWN_3Y: {
    label: "Erzwungener Drawdown (3 Jahre)",
    type: "parametric_sequence",
    years: 3,
    seqReturnsEq: [-0.25, -0.20, -0.15],
    noiseVol: 0.04,
    reboundClamp: { years: 2, cap: 0.05 }
  }
};

/**
 * Engine-Version und Hash
 */
export const ENGINE_VERSION = '31.0';
export const ENGINE_HASH = '2016807894';

/**
 * Globale Daten für die Simulation
 */
export let annualData = [];
export let REGIME_DATA = { BULL: [], BEAR: [], SIDEWAYS: [], STAGFLATION: [] };
export let REGIME_TRANSITIONS = {};
export const BREAK_ON_RUIN = true;
