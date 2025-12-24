export interface MonteCarloConfig {
    numSimulations: number;
    yearsToSimulate: number;
    historicalReturns: number[];
    historicalInflation: number[];
}

export interface MonteCarloResult {
    successRate: number;
    medianFinalWealth: number;
    percentile5: number;
    percentile25: number;
    percentile75: number;
    percentile95: number;
    ruinProbability: number;
    avgYearsToRuin: number | null;
}

export interface BacktestConfig {
    startYear: number;
    endYear: number;
    historicalData: HistoricalMarketData[];
}

export interface HistoricalMarketData {
    year: number;
    marketIndex: number;
    inflation: number;
    capeRatio: number | null;
    goldEurPerf: number | null;
}

export interface BacktestResult {
    success: boolean;
    finalWealth: number;
    finalAge: number;
    yearsSimulated: number;
    portfolioDepletedAtAge: number | null;
    snapshots: YearlySnapshot[];
    minWealth: number;
    maxWealth: number;
    totalWithdrawals: number;
    avgFlexRate: number;
}

export interface YearlySnapshot {
    year: number;
    age: number;
    totalWealth: number;
    liquidity: number;
    depotValue: number;
    depotAlt: number;
    depotNeu: number;
    goldValue: number;
    flexRate: number;
    alarmActive: boolean;
    runwayMonths: number;
    runwayStatus: string;
    marketScenario: string;
    transactionType: string;
    withdrawal: number;
    refillAmount: number;
}

export interface SimulationInput {
    aktuellesAlter: number;
    risikoprofil: string;
    inflation: number;
    tagesgeld: number;
    geldmarktEtf: number;
    aktuelleLiquiditaet: number | null;
    depotwertAlt: number;
    depotwertNeu: number;
    goldAktiv: boolean;
    goldWert: number;
    goldCost: number;
    goldZielProzent: number;
    goldFloorProzent: number;
    floorBedarf: number;
    flexBedarf: number;
    renteAktiv: boolean;
    renteMonatlich: number;
    costBasisAlt: number;
    costBasisNeu: number;
    sparerPauschbetrag: number;
    endeVJ: number;
    endeVJ_1: number;
    endeVJ_2: number;
    endeVJ_3: number;
    ath: number;
    jahreSeitAth: number;
    capeRatio: number | null;
    runwayMinMonths: number;
    runwayTargetMonths: number;
    targetEq: number;
    rebalBand: number;
    maxSkimPctOfEq: number;
    maxBearRefillPctOfEq: number;
}
