// @ts-check

/**
 * Shared JSDoc types for Light-TS (no build step).
 */

/**
 * @typedef {Object} MarketAssumptions
 * @property {number} inflationRate
 * @property {number} equityReturn
 * @property {number} bondReturn
 * @property {number} correlation
 */

/**
 * @typedef {Object} AppSettings
 * @property {number} appVersion
 * @property {string} updatedAt
 * @property {MarketAssumptions} marketAssumptions
 */

/**
 * @typedef {Object} ProfileMeta
 * @property {string} id
 * @property {string} name
 * @property {string} createdAt
 * @property {string} updatedAt
 */

/**
 * @typedef {Object} BalanceState
 * @property {number} aktuellesAlter
 * @property {number} floorBedarf
 * @property {number} flexBedarf
 * @property {number} inflation
 * @property {number} tagesgeld
 * @property {number} geldmarktEtf
 * @property {number} depotwertAlt
 * @property {number} depotwertNeu
 * @property {number} goldWert
 * @property {number} endeVJ
 * @property {number} endeVJ_1
 * @property {number} endeVJ_2
 * @property {number} endeVJ_3
 * @property {number} ath
 * @property {number} jahreSeitAth
 * @property {boolean} renteAktiv
 * @property {number} renteMonatlich
 * @property {string} risikoprofil
 * @property {boolean} goldAktiv
 * @property {number} goldZielProzent
 * @property {number} goldFloorProzent
 * @property {boolean} goldSteuerfrei
 * @property {number} rebalancingBand
 * @property {number} costBasisAlt
 * @property {number} costBasisNeu
 * @property {number} tqfAlt
 * @property {number} tqfNeu
 * @property {number} goldCost
 * @property {number} kirchensteuerSatz
 * @property {number} sparerPauschbetrag
 * @property {number} runwayMinMonths
 * @property {number} runwayTargetMonths
 * @property {number} minCashBufferMonths
 * @property {number} targetEq
 * @property {number} rebalBand
 * @property {number} maxSkimPctOfEq
 * @property {number} maxBearRefillPctOfEq
 * @property {string} profilName
 * @property {Tranche[] | null} detailledTranches
 */

/**
 * @typedef {Object} PflegeGradeConfig
 * @property {number} zusatz
 * @property {number} flexCut
 * @property {number} mortalityFactor
 */

/**
 * @typedef {Object} WidowOptions
 * @property {string} mode
 * @property {number} percent
 * @property {number} marriageOffsetYears
 * @property {number} minMarriageYears
 */

/**
 * @typedef {Object} PartnerConfig
 * @property {boolean} aktiv
 * @property {string} geschlecht
 * @property {number} startAlter
 * @property {number} startInJahren
 * @property {number} monatsrente
 * @property {number} sparerPauschbetrag
 * @property {number} kirchensteuerPct
 * @property {number} steuerquotePct
 * @property {number} brutto
 */

/**
 * @typedef {Object} AccumulationPhase
 * @property {boolean} enabled
 * @property {number} durationYears
 * @property {number} sparrate
 * @property {string} sparrateIndexing
 */

/**
 * @typedef {Object} SimulatorState
 * @property {number} startVermoegen
 * @property {number} depotwertAlt
 * @property {number} tagesgeld
 * @property {number} geldmarktEtf
 * @property {number} einstandAlt
 * @property {number} zielLiquiditaet
 * @property {number} startFloorBedarf
 * @property {number} startFlexBedarf
 * @property {number} marketCapeRatio
 * @property {string} risikoprofil
 * @property {boolean} goldAktiv
 * @property {number} goldZielProzent
 * @property {number} goldFloorProzent
 * @property {number} rebalancingBand
 * @property {boolean} goldSteuerfrei
 * @property {number} startAlter
 * @property {string} geschlecht
 * @property {number} startSPB
 * @property {number} kirchensteuerSatz
 * @property {number} renteMonatlich
 * @property {number} renteStartOffsetJahre
 * @property {string} rentAdjMode
 * @property {number} rentAdjPct
 * @property {string} renteIndexierungsart
 * @property {number} renteFesterSatz
 * @property {boolean} pflegefallLogikAktivieren
 * @property {string} pflegeModellTyp
 * @property {Record<string, PflegeGradeConfig>} pflegeGradeConfigs
 * @property {number} pflegeStufe1Zusatz
 * @property {number} pflegeStufe1FlexCut
 * @property {number} pflegeMaxFloor
 * @property {number} pflegeRampUp
 * @property {number} pflegeMinDauer
 * @property {number} pflegeMaxDauer
 * @property {number} pflegeKostenDrift
 * @property {number} pflegeRegionalZuschlag
 * @property {Object} decumulation
 * @property {string} stressPreset
 * @property {PartnerConfig} partner
 * @property {WidowOptions} widowOptions
 * @property {number} runwayMinMonths
 * @property {number} runwayTargetMonths
 * @property {number} targetEq
 * @property {number} rebalBand
 * @property {number} maxSkimPctOfEq
 * @property {number} maxBearRefillPctOfEq
 * @property {AccumulationPhase} accumulationPhase
 * @property {number} transitionYear
 * @property {number} transitionAge
 * @property {Tranche[] | null} detailledTranches
 */

/**
 * @typedef {Object} Tranche
 * @property {string=} trancheId
 * @property {string=} id
 * @property {string=} name
 * @property {string=} isin
 * @property {string=} ticker
 * @property {number=} shares
 * @property {number=} purchasePrice
 * @property {string=} purchaseDate
 * @property {number=} currentPrice
 * @property {number=} marketValue
 * @property {number=} costBasis
 * @property {number=} tqf
 * @property {string=} type
 * @property {string=} kind
 * @property {string=} category
 * @property {string=} notes
 */

/**
 * @typedef {Object} ProfileData
 * @property {number} profileVersion
 * @property {ProfileMeta} meta
 * @property {BalanceState} balance
 * @property {SimulatorState} simulator
 * @property {Tranche[]} tranchen
 */

/**
 * @typedef {Object} HouseholdView
 * @property {ProfileData[]} profiles
 * @property {BalanceState} combinedBalance
 * @property {Tranche[]} combinedTranchen
 * @property {SimulatorState} combinedSimulatorInput
 * @property {"additive"} aggregationStrategy
 */

export {};
