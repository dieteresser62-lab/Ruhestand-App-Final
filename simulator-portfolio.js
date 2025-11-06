"use strict";

import { formatCurrency } from './simulator-utils.js';
import { HISTORICAL_DATA, STRESS_PRESETS, annualData, REGIME_DATA, REGIME_TRANSITIONS } from './simulator-data.js';

/**
 * Sammelt alle Eingabewerte aus dem UI
 */
export function getCommonInputs() {
    const goldAktiv = document.getElementById('goldAllokationAktiv').checked;
    const zweiPersonen = document.getElementById('zweiPersonenHaushalt').checked;
    const baseInputs = {
        startVermoegen: parseFloat(document.getElementById('simStartVermoegen').value) || 0,
        depotwertAlt: parseFloat(document.getElementById('depotwertAlt').value) || 0,
        einstandAlt: parseFloat(document.getElementById('einstandAlt').value) || 0,
        zielLiquiditaet: parseFloat(document.getElementById('zielLiquiditaet').value) || 0,
        startFloorBedarf: parseFloat(document.getElementById('startFloorBedarf').value) || 0,
        startFlexBedarf: parseFloat(document.getElementById('startFlexBedarf').value) || 0,
        risikoprofil: document.getElementById('simRisikoprofil').value,
        goldAktiv: goldAktiv,
        goldZielProzent: (goldAktiv ? parseFloat(document.getElementById('goldAllokationProzent').value) : 0),
        goldFloorProzent: (goldAktiv ? parseFloat(document.getElementById('goldFloorProzent').value) : 0),
        rebalancingBand: (goldAktiv ? parseFloat(document.getElementById('rebalancingBand').value) : 25),
        goldSteuerfrei: goldAktiv && document.getElementById('goldSteuerfrei').checked,
        startAlter: parseInt(document.getElementById('startAlter').value) || 65,
        geschlecht: document.getElementById('geschlecht').value || 'w',
        startSPB: parseFloat(document.getElementById('startSPB').value) || 0,
        kirchensteuerSatz: parseFloat(document.getElementById('kirchensteuerSatz').value) || 0,
        round5: document.getElementById('round5').checked,
        renteMonatlich: parseFloat(document.getElementById('renteMonatlich').value) || 0,
        renteStartOffsetJahre: parseInt(document.getElementById('renteStartOffsetJahre').value) || 0,
        renteIndexierungsart: document.getElementById('renteIndexierungsart').value,
        renteFesterSatz: parseFloat(document.getElementById('renteFesterSatz').value) || 0,
        zweiPersonenHaushalt: zweiPersonen,
        partnerStartAlter: zweiPersonen ? (parseInt(document.getElementById('partnerStartAlter').value) || 60) : null,
        partnerGeschlecht: zweiPersonen ? (document.getElementById('partnerGeschlecht').value || 'w') : null,
        partnerStartSPB: zweiPersonen ? (parseFloat(document.getElementById('partnerStartSPB').value) || 0) : 0,
        partnerKirchensteuerSatz: zweiPersonen ? (parseFloat(document.getElementById('partnerKirchensteuerSatz').value) || 0) : 0,
        partnerRenteMonatlich: zweiPersonen ? (parseFloat(document.getElementById('partnerRenteMonatlich').value) || 0) : 0,
        partnerRenteStartOffsetJahre: zweiPersonen ? (parseInt(document.getElementById('partnerRenteStartOffsetJahre').value) || 0) : 0,
        witwenRenteProzent: zweiPersonen ? (parseFloat(document.getElementById('witwenRenteProzent').value) || 55) : 55,
        pflegefallLogikAktivieren: document.getElementById('pflegefallLogikAktivieren').checked,
        pflegeModellTyp: document.getElementById('pflegeModellTyp').value,
        pflegeStufe1Zusatz: parseFloat(document.getElementById('pflegeStufe1Zusatz').value) || 0,
        pflegeStufe1FlexCut: (parseFloat(document.getElementById('pflegeStufe1FlexCut').value) || 100) / 100,
        pflegeMaxFloor: parseFloat(document.getElementById('pflegeMaxFloor').value) || 0,
        pflegeRampUp: parseInt(document.getElementById('pflegeRampUp').value) || 5,
        pflegeMinDauer: parseInt(document.getElementById('pflegeMinDauer').value) || 3,
        pflegeMaxDauer: parseInt(document.getElementById('pflegeMaxDauer').value) || 8,
        pflegeKostenDrift: (parseFloat(document.getElementById('pflegeKostenDrift').value) || 0) / 100,
        pflegebeschleunigtMortalitaetAktivieren: document.getElementById('pflegebeschleunigtMortalitaetAktivieren').checked,
        pflegeTodesrisikoFaktor: parseFloat(document.getElementById('pflegeTodesrisikoFaktor').value) || 1.0,
        decumulation: { mode: document.getElementById('decumulationMode')?.value || 'none' },
        stressPreset: document.getElementById('stressPreset').value || 'NONE'
    };

    const strategyConstants = {
        runwayMinMonths: 24,
        runwayTargetMonths: 36,
        targetEq: 60,
        rebalBand: 5,
        maxSkimPctOfEq: 10,
        maxBearRefillPctOfEq: 5
    };

    // Partner-Objekt für Backtest (wenn Indexierungs-Felder vorhanden)
    const partnerIndexArtEl = document.getElementById('partnerRenteIndexierungsart');
    let partner = null;
    if (zweiPersonen && partnerIndexArtEl) {
        partner = {
            renteMonatlich: parseFloat(document.getElementById('partnerRenteMonatlich').value) || 0,
            renteStartOffsetJahre: parseInt(document.getElementById('partnerRenteStartOffsetJahre').value) || 0,
            renteIndexierungsart: partnerIndexArtEl.value || 'lohn',
            renteFesterSatz: parseFloat(document.getElementById('partnerRenteFesterSatz').value) || 0,
            startSPB: parseFloat(document.getElementById('partnerStartSPB').value) || 0
        };
    }

    return { ...baseInputs, ...strategyConstants, partner };
}

/**
 * Aktualisiert die Anzeige des Start-Portfolios
 */
export function updateStartPortfolioDisplay() {
    const inputs = getCommonInputs();
    const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
    const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - inputs.zielLiquiditaet);
    const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
    const zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
    const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);
    document.getElementById('einstandNeu').value = (depotwertNeu).toFixed(0);
    let breakdownHtml = `
        <div style="text-align:center; font-weight:bold; color: var(--primary-color); margin-bottom:10px;">Finale Start-Allokation</div>
        <div class="form-grid-three-col">
            <div class="form-group"><label>Depot (Aktien)</label><span class="calculated-display" style="background-color: #e0f7fa;">${formatCurrency(inputs.depotwertAlt + depotwertNeu)}</span></div>
            <div class="form-group"><label>Depot (Gold)</label><span class="calculated-display" style="background-color: #fff9c4;">${formatCurrency(zielwertGold)}</span></div>
            <div class="form-group"><label>Liquidität</label><span class="calculated-display" style="background-color: #e8f5e9;">${formatCurrency(inputs.zielLiquiditaet)}</span></div>
        </div>
        <div style="font-size: 0.8rem; text-align: center; margin-top: 10px; color: #555;">Aufteilung: Depot Alt (${formatCurrency(inputs.depotwertAlt)}) + Depot Neu (${formatCurrency(depotwertNeu)})</div>`;
    document.getElementById('displayPortfolioBreakdown').innerHTML = breakdownHtml;
    document.getElementById('goldStrategyPanel').style.display = inputs.goldAktiv ? 'block' : 'none';
}

/**
 * Initialisiert das Portfolio mit Tranchen
 */
export function initializePortfolio(inputs) {
    let depotTranchesAktien = [];
    let depotTranchesGold = [];

    const flexiblesVermoegen = Math.max(0, inputs.startVermoegen - inputs.depotwertAlt);
    const investitionsKapitalNeu = Math.max(0, flexiblesVermoegen - inputs.zielLiquiditaet);
    const investitionsKapitalGesamt = inputs.depotwertAlt + investitionsKapitalNeu;
    const zielwertGold = inputs.goldAktiv ? investitionsKapitalGesamt * (inputs.goldZielProzent / 100) : 0;
    const depotwertNeu = Math.max(0, investitionsKapitalNeu - zielwertGold);

    if (inputs.depotwertAlt > 1) {
        depotTranchesAktien.push({ marketValue: inputs.depotwertAlt, costBasis: inputs.einstandAlt, tqf: 0.30, type: 'aktien_alt' });
    }
    if (depotwertNeu > 1) {
        depotTranchesAktien.push({ marketValue: depotwertNeu, costBasis: depotwertNeu, tqf: 0.30, type: 'aktien_neu' });
    }
    if (zielwertGold > 1) {
        depotTranchesGold.push({ marketValue: zielwertGold, costBasis: zielwertGold, tqf: inputs.goldSteuerfrei ? 1.0 : 0.0, type: 'gold' });
    }

    return {
        depotTranchesAktien: [...depotTranchesAktien],
        depotTranchesGold: [...depotTranchesGold],
        liquiditaet: inputs.zielLiquiditaet
    };
}

/**
 * Bereitet historische Daten auf und berechnet Regime
 */
export function prepareHistoricalData() {
    if (annualData.length > 0) return;
    const years = Object.keys(HISTORICAL_DATA).map(Number).sort((a,b)=>a-b);
    for (let i = 1; i < years.length; i++) {
        const y = years[i], prev = years[i-1];
        const cur = HISTORICAL_DATA[y], vj = HISTORICAL_DATA[prev];
        if (!cur || !vj) continue;

        const m1 = Number(cur.msci_eur);
        const m0 = Number(vj.msci_eur);
        if (!isFinite(m0) || !isFinite(m1)) {
            console.warn(`Ungültige MSCI-Daten für Jahr ${y} oder ${prev} übersprungen.`);
            continue;
        }

        let rendite = (m0 > 0) ? (m1 - m0) / m0 : 0;
        if (!isFinite(rendite)) rendite = 0;

        const dataPoint = {
            jahr: y,
            rendite: rendite,
            inflation: Number(vj.inflation_de) || 0,
            zinssatz: Number(vj.zinssatz_de) || 0,
            lohn: Number(vj.lohn_de) || 0,
            gold_eur_perf: Number(vj.gold_eur_perf) || 0
        };

        annualData.push(dataPoint);
        const realRendite = rendite * 100 - dataPoint.inflation;
        let regime = (dataPoint.inflation > 4 && realRendite < 0) ? 'STAGFLATION' : (rendite > 0.15) ? 'BULL' : (rendite < -0.10) ? 'BEAR' : 'SIDEWAYS';
        dataPoint.regime = regime;
        if (!REGIME_DATA[regime]) REGIME_DATA[regime] = [];
        REGIME_DATA[regime].push(dataPoint);
    }
    const regimes = ['BULL', 'BEAR', 'SIDEWAYS', 'STAGFLATION'];
    regimes.forEach(from => { REGIME_TRANSITIONS[from] = { BULL: 0, BEAR: 0, SIDEWAYS: 0, STAGFLATION: 0, total: 0 }; });
    for (let i = 1; i < annualData.length; i++) {
        const fromRegime = annualData[i-1].regime, toRegime = annualData[i].regime;
        if (fromRegime && toRegime) { REGIME_TRANSITIONS[fromRegime][toRegime]++; REGIME_TRANSITIONS[fromRegime].total++; }
    }
}

/**
 * Berechnet jährliche Rente basierend auf Indexierung
 */
export function computeYearlyPension({ yearIndex, baseMonthly, startOffset, lastAnnualPension, indexierungsArt, inflRate, lohnRate, festerSatz }) {
    if (!baseMonthly || yearIndex < startOffset) return 0;
    let anpassungsSatz = 0;
    switch (indexierungsArt) {
        case 'inflation': anpassungsSatz = inflRate / 100; break;
        case 'lohn': anpassungsSatz = (lohnRate ?? inflRate) / 100; break;
        case 'fest': anpassungsSatz = festerSatz / 100; break;
    }
    if (yearIndex === startOffset) return baseMonthly * 12;
    const last = lastAnnualPension > 0 ? lastAnnualPension : baseMonthly * 12;
    return last * (1 + anpassungsSatz);
}

/**
 * Berechnet kombinierte Renten für Zwei-Personen-Haushalt mit Witwenrente
 * @returns {number} Gesamtrente für das Jahr
 */
export function computeTwoPersonPensions({
    yearIndex, inputs, lastPensions, personStatus, inflRate, lohnRate
}) {
    const { person1Alive, person2Alive } = personStatus;
    const { renteMonatlich, renteStartOffsetJahre, renteIndexierungsart, renteFesterSatz,
            partnerRenteMonatlich, partnerRenteStartOffsetJahre, witwenRenteProzent } = inputs;

    let pension1 = 0;
    let pension2 = 0;

    // Person 1 Rente berechnen
    if (person1Alive) {
        pension1 = computeYearlyPension({
            yearIndex,
            baseMonthly: renteMonatlich,
            startOffset: renteStartOffsetJahre,
            lastAnnualPension: lastPensions.person1,
            indexierungsArt: renteIndexierungsart,
            inflRate,
            lohnRate,
            festerSatz: renteFesterSatz
        });
    } else if (person2Alive && lastPensions.person1 > 0) {
        // Person 1 verstorben, Person 2 bekommt Witwenrente
        const witwenRenteP1 = lastPensions.person1 * (witwenRenteProzent / 100);
        pension1 = witwenRenteP1 * (1 + (renteIndexierungsart === 'inflation' ? inflRate / 100 :
                                         renteIndexierungsart === 'lohn' ? (lohnRate ?? inflRate) / 100 :
                                         renteFesterSatz / 100));
    }

    // Person 2 Rente berechnen
    if (person2Alive) {
        pension2 = computeYearlyPension({
            yearIndex,
            baseMonthly: partnerRenteMonatlich,
            startOffset: partnerRenteStartOffsetJahre,
            lastAnnualPension: lastPensions.person2,
            indexierungsArt: renteIndexierungsart,
            inflRate,
            lohnRate,
            festerSatz: renteFesterSatz
        });
    } else if (person1Alive && lastPensions.person2 > 0) {
        // Person 2 verstorben, Person 1 bekommt Witwenrente
        const witwenRenteP2 = lastPensions.person2 * (witwenRenteProzent / 100);
        pension2 = witwenRenteP2 * (1 + (renteIndexierungsart === 'inflation' ? inflRate / 100 :
                                         renteIndexierungsart === 'lohn' ? (lohnRate ?? inflRate) / 100 :
                                         renteFesterSatz / 100));
    }

    return {
        total: pension1 + pension2,
        person1: pension1,
        person2: pension2
    };
}

/**
 * Bereitet den Kontext für ein Stress-Szenario vor
 */
export function buildStressContext(presetKey, rand) {
    const preset = STRESS_PRESETS[presetKey] || STRESS_PRESETS.NONE;
    if (preset.type === 'none') return null;

    const context = {
        preset: preset,
        remainingYears: preset.years,
        type: preset.type
    };

    if (preset.type === 'conditional_bootstrap') {
        context.pickableIndices = annualData
            .map((d, i) => ({...d, index: i}))
            .filter(d => {
                const realReturnPct = (d.rendite * 100) - d.inflation;
                const passesInflation = preset.filter.inflationMin === undefined || d.inflation >= preset.filter.inflationMin;
                const passesRealReturn = preset.filter.equityRealMax === undefined || realReturnPct <= preset.filter.equityRealMax;
                return passesInflation && passesRealReturn;
            })
            .map(d => d.index);

        if (context.pickableIndices.length === 0) {
            console.warn(`Stress-Szenario "${preset.label}" fand keine passenden historischen Jahre. Fallback auf 'Kein Stress'.`);
            return null;
        }
    }

    if (preset.type === 'parametric_sequence' && preset.reboundClamp) {
        context.reboundYearsRemaining = preset.reboundClamp.years;
    }

    return context;
}

/**
 * Wendet Stress-Überschreibungen auf Jahresdaten an
 */
export function applyStressOverride(yearData, stressCtx, rand) {
    if (!stressCtx || stressCtx.remainingYears <= 0) {
        if (stressCtx?.reboundYearsRemaining > 0 && stressCtx.preset.reboundClamp) {
            yearData.rendite = Math.min(yearData.rendite, stressCtx.preset.reboundClamp.cap);
            stressCtx.reboundYearsRemaining--;
        }
        return yearData;
    }

    const preset = stressCtx.preset;
    const modifiedData = { ...yearData };

    switch (preset.type) {
        case 'parametric':
            modifiedData.rendite += (preset.muShiftEq || 0);
            modifiedData.gold_eur_perf = (modifiedData.gold_eur_perf || 0) + ((preset.muShiftAu || 0) * 100);
            modifiedData.inflation = Math.max(modifiedData.inflation, preset.inflationFloor || 0);
            break;

        case 'parametric_sequence':
            const i = preset.years - stressCtx.remainingYears;
            const baseReturn = preset.seqReturnsEq[i] || 0;
            const noise = (rand() * 2 - 1) * (preset.noiseVol || 0);
            modifiedData.rendite = baseReturn + noise;
            if (preset.inflationFixed !== undefined) {
                modifiedData.inflation = preset.inflationFixed;
            }
            break;
    }

    stressCtx.remainingYears--;
    return modifiedData;
}

/**
 * Wendet Verkaufsergebnis auf Portfolio an
 */
export function applySaleToPortfolio(portfolio, saleResult) {
    if (!saleResult || !saleResult.breakdown) return;
    saleResult.breakdown.forEach(saleItem => {
        const tranches = saleItem.kind.startsWith('aktien') ? portfolio.depotTranchesAktien : portfolio.depotTranchesGold;
        const tranche = tranches.find(t => t.type === saleItem.kind);
        if (tranche) {
            const reduction = Math.min(saleItem.brutto, tranche.marketValue);
            const reductionRatio = tranche.marketValue > 0 ? reduction / tranche.marketValue : 0;
            tranche.costBasis -= tranche.costBasis * reductionRatio;
            tranche.marketValue -= reduction;
        }
    });
}

/**
 * Fasst Verkäufe nach Asset-Typ zusammen
 */
export function summarizeSalesByAsset(saleResult) {
  const sums = { vkAkt: 0, vkGld: 0, stAkt: 0, stGld: 0, vkGes: 0, stGes: 0 };
  if (!saleResult || !Array.isArray(saleResult.breakdown)) return sums;
  for (const item of saleResult.breakdown) {
    const isAktie = String(item.kind || '').startsWith('aktien');
    const brutto = +item.brutto || 0;
    const steuer = (item.steuer != null) ? (+item.steuer) : 0;
    if (isAktie) { sums.vkAkt += brutto; sums.stAkt += steuer; }
    else         { sums.vkGld += brutto; sums.stGld += steuer; }
    sums.vkGes += brutto; sums.stGes += steuer;
  }
  if (sums.stGes === 0 && saleResult.steuerGesamt > 0 && (sums.vkAkt + sums.vkGld) > 0) {
    const tot = sums.vkAkt + sums.vkGld; const ges = saleResult.steuerGesamt;
    sums.stAkt = ges * (sums.vkAkt / tot); sums.stGld = ges * (sums.vkGld / tot); sums.stGes = ges;
  } else if (saleResult.steuerGesamt > 0 && Math.abs(sums.stGes - saleResult.steuerGesamt) > 1e-6) {
    sums.stGes = saleResult.steuerGesamt;
  }
  return sums;
}

/**
 * Konvertiert Portfolio-Status zurück in Input-Kontext
 */
export function buildInputsCtxFromPortfolio(inputs, portfolio, {pensionAnnual, marketData, personStatus = null}) {
  const aktAlt = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_alt') || {marketValue:0, costBasis:0};
  const aktNeu = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_neu') || {marketValue:0, costBasis:0};
  const gTr   = portfolio.depotTranchesGold.find(t => t.type === 'gold')       || {marketValue:0, costBasis:0};

  // Bei Zwei-Personen-Haushalt: SPBs addieren (solange beide leben)
  let totalSPB = inputs.startSPB;
  let totalKirchensteuer = inputs.kirchensteuerSatz;

  if (inputs.zweiPersonenHaushalt && personStatus) {
    const { person1Alive, person2Alive } = personStatus;
    if (person1Alive && person2Alive) {
      // Beide leben: beide SPBs
      totalSPB = inputs.startSPB + inputs.partnerStartSPB;
      // Kirchensteuer: gewichteter Durchschnitt (vereinfacht: höherer Wert)
      totalKirchensteuer = Math.max(inputs.kirchensteuerSatz, inputs.partnerKirchensteuerSatz);
    } else if (person1Alive) {
      totalSPB = inputs.startSPB;
      totalKirchensteuer = inputs.kirchensteuerSatz;
    } else if (person2Alive) {
      totalSPB = inputs.partnerStartSPB;
      totalKirchensteuer = inputs.partnerKirchensteuerSatz;
    }
  }

  return {
    ...inputs,
    tagesgeld: portfolio.liquiditaet, geldmarktEtf: 0,
    depotwertAlt: aktAlt.marketValue,  costBasisAlt: aktAlt.costBasis,  tqfAlt: 0.30,
    depotwertNeu: aktNeu.marketValue,  costBasisNeu: aktNeu.costBasis,  tqfNeu: 0.30,
    goldWert: gTr.marketValue,         goldCost:    gTr.costBasis,
    goldSteuerfrei: inputs.goldSteuerfrei,
    sparerPauschbetrag: totalSPB,
    kirchensteuerSatz: totalKirchensteuer,
    marketData,
    pensionAnnual
  };
}

/**
 * Summiert Depotwert über alle Tranchen
 */
export function sumDepot(portfolio) {
    const sumTr = (arr) => Array.isArray(arr) ? arr.reduce((s, t) => s + (Number(t?.marketValue) || 0), 0) : 0;
    return sumTr(portfolio?.depotTranchesAktien) + sumTr(portfolio?.depotTranchesGold);
}

/**
 * Kauft Gold und fügt es zum Portfolio hinzu
 */
export function buyGold(portfolio, amount) {
    if (amount <= 0) return;
    const goldTranche = portfolio.depotTranchesGold.find(t => t.type === 'gold');
    if (goldTranche) {
        goldTranche.marketValue += amount;
        goldTranche.costBasis += amount;
    } else {
        portfolio.depotTranchesGold.push({ marketValue: amount, costBasis: amount, tqf: 1.0, type: 'gold' });
    }
}

/**
 * Kauft Aktien und fügt sie zum Portfolio hinzu
 */
export function buyStocksNeu(portfolio, amount) {
    if (amount <= 0) return;
    const neuTranche = portfolio.depotTranchesAktien.find(t => t.type === 'aktien_neu');
    if (neuTranche) {
        neuTranche.marketValue += amount;
        neuTranche.costBasis += amount;
    } else {
        portfolio.depotTranchesAktien.push({ marketValue: amount, costBasis: amount, tqf: 0.30, type: 'aktien_neu' });
    }
}
