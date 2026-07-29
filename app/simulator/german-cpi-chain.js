/**
 * GENERATED DATA ARTIFACT - DO NOT EDIT MANUALLY.
 * Build with: npm run build:german-cpi-data
 *
 * JST-derived values are licensed under CC BY-NC-SA 4.0.
 * Destatis values are licensed under Data Licence Germany - attribution - 2.0.
 * See data/historical/german-cpi-chain/LICENSE.md.
 */
"use strict";

function deepFreezeGermanCpiData(value, seen = new WeakSet()) {
    if (value === null || typeof value !== 'object' || seen.has(value)) return value;
    seen.add(value);
    for (const child of Object.values(value)) deepFreezeGermanCpiData(child, seen);
    return Object.freeze(value);
}

export const GERMAN_CPI_RESEARCH_CHAIN = deepFreezeGermanCpiData({
    "schemaVersion": "GermanCpiResearchChainV1",
    "revision": "2026-07-29.3",
    "seriesId": "german_consumer_price_inflation",
    "unit": "percent change from prior-year annual average",
    "period": {
        "startYear": 1925,
        "endYear": 2025
    },
    "base": {
        "year": 1924,
        "syntheticLevel": 100
    },
    "sourceFiles": {
        "jst": {
            "fileName": "JSTdatasetR6.xlsx",
            "sha256": "c1bb91fe56ea50d4f27af5c0fc897d481e89ae38ce41eaecab62134c9354981d",
            "sourceUrl": "https://www.macrohistory.net/app/download/9834512569/JSTdatasetR6.xlsx?t=1763503850",
            "license": "CC BY-NC-SA 4.0",
            "dataAsOf": "JST Macrohistory Database revision R6"
        },
        "destatisLongSeries": {
            "fileName": "destatis-vpi-lange-reihen-2025-06.xlsx",
            "sha256": "8c728e44fa400d762009fa34507a34e1fee3947641d2579484d7d040763b11f4",
            "sourceUrl": "https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Verbraucherpreisindex/Publikationen/Downloads-Verbraucherpreise/statistischer-bericht-verbraucherpreisindex-lange-reihen-5611103.html",
            "license": "Data Licence Germany - attribution - Version 2.0",
            "dataAsOf": "2025-06"
        },
        "destatisCurrent": {
            "fileName": "destatis-vpi-current-2026-07-10.html",
            "sha256": "82ab91a5e53db7cd74cdf4f7b4d85813e586fbd3ae0bbd3d01a6cb231b596743",
            "sourceUrl": "https://www.destatis.de/DE/Themen/Wirtschaft/Preise/Verbraucherpreisindex/Tabellen/Verbraucherpreise-12Kategorien.html",
            "license": "Data Licence Germany - attribution - Version 2.0",
            "dataAsOf": "2026-07-10"
        }
    },
    "rawDataHash": "83841d2c11df3a5e193aa07db3bdfe815cbbeea7f9f81c3526b197702a46bdb4",
    "annualRateHash": "9ec87b5052d5e086517142c34213a4063e2be6ccdd8a5babf6d5722ffb76ae3a",
    "indexLevelHash": "e752e21c52cb6ad9b92e5d58e284e5b76fff495e4fec26bbe4719885af93eddc",
    "selectionRule": "German national consumer-price concept only; Harmonised Index of Consumer Prices (HICP/HVPI) is excluded.",
    "transitionRule": "Every transition-year rate is taken from one internally consistent source series using its prior and current annual-average levels.",
    "validation": {
        "publishedRateVsRoundedLevelTolerancePp": 0.05
    },
    "proxyQualification": {
        "period": {
            "startYear": 1925,
            "endYear": 1949
        },
        "levelQuantization": {
            "normalization": {
                "referenceYear": 1938,
                "referenceLevel": 126,
                "factor": 6.463684989449011
            },
            "exactIntegerLevelPeriod": {
                "startYear": 1925,
                "endYear": 1948
            },
            "nonIntegerSpliceEndpointYear": 1949,
            "normalizedSpliceEndpointLevel": 208.71864710701823,
            "impliedAnnualRateResolutionPp": {
                "min": 0.4791138759572645,
                "max": 0.847457626706938
            },
            "interpretation": "JST source levels for 1925-1948 are integer-quantized; derived annual rates therefore have materially coarser resolution than the 0.1 percentage-point official rates."
        },
        "historicalDiscontinuities": [
            {
                "period": {
                    "startYear": 1936,
                    "endYear": 1948
                },
                "event": "National Socialist price controls and wartime price freeze",
                "interpretation": "Near-zero measured changes are not evidence of an unrestricted market-price process."
            },
            {
                "year": 1949,
                "event": "Post-currency-reform JST splice endpoint",
                "selectedJstRatePct": 7.035203603123863,
                "officialAlternative": {
                    "sourceId": "destatisLongSeries",
                    "territory": "Former West Germany",
                    "populationConcept": "4-Personen-Haushalte von Arbeitern und Angestellten mit mittlerem Einkommen",
                    "priorLevel1948": 28.5,
                    "currentLevel1949": 28.2,
                    "ratePct": -1.0526315789473717
                },
                "differencePp": 8.087835182071235,
                "interpretation": "The selected rate is a proxy splice across the 1948 currency reform, not an official estimate of unrestricted German consumer-price inflation."
            }
        ],
        "monetaryAssetDiscontinuity": {
            "year": 1948,
            "event": "West German currency reform and write-down of major Reichsmark cash and bank/savings balances",
            "balanceConversion": {
                "reichsmark": 100,
                "deutscheMark": 6.5,
                "nominalBalanceLossPct": 93.5,
                "scope": "major holdings of cash and bank/savings balances after the October 1948 Festkontengesetz"
            },
            "cpiProxyComparison": {
                "period": {
                    "startYear": 1936,
                    "endYear": 1948
                },
                "cumulativePriceChangePct": 58.53658549405758,
                "impliedPurchasingPowerLossPct": 36.92307697408539
            },
            "reference": {
                "publisher": "Deutsche Bundesbank",
                "title": "Währungsreform 1948",
                "url": "https://www.bundesbank.de/de/aufgaben/themen/waehrungsreform-1948-614040"
            },
            "interpretation": "The CPI proxy measures observed price-level change, not the nominal write-down of monetary assets. It must not be used as a continuous-currency deflator for Reichsmark cash or bank balances across the reform."
        }
    },
    "segments": [
        {
            "startYear": 1925,
            "endYear": 1949,
            "evidenceClass": "proxy",
            "territory": "Germany",
            "populationConcept": "JST historical German CPI",
            "sourceId": "jst",
            "construction": "Annual percentage change calculated from consecutive JST R6 German CPI levels."
        },
        {
            "startYear": 1950,
            "endYear": 1962,
            "evidenceClass": "official",
            "populationQualifier": "proxy_population",
            "territory": "Former West Germany",
            "populationConcept": "4-Personen-Haushalte von Arbeitern und Angestellten mit mittlerem Einkommen",
            "sourceId": "destatisLongSeries",
            "construction": "Published Destatis annual change; checked against consecutive annual-average levels."
        },
        {
            "startYear": 1963,
            "endYear": 1991,
            "evidenceClass": "official",
            "territory": "Former West Germany",
            "populationConcept": "Alle privaten Haushalte",
            "sourceId": "destatisLongSeries",
            "construction": "Published Destatis annual change; checked against consecutive annual-average levels."
        },
        {
            "startYear": 1992,
            "endYear": 2024,
            "evidenceClass": "official",
            "territory": "Germany",
            "populationConcept": "Verbraucherpreisindex",
            "sourceId": "destatisLongSeries",
            "construction": "Published Destatis annual change; checked against consecutive annual-average levels."
        },
        {
            "startYear": 2025,
            "endYear": 2025,
            "evidenceClass": "official",
            "territory": "Germany",
            "populationConcept": "Verbraucherpreisindex",
            "sourceId": "destatisCurrent",
            "construction": "Published Destatis annual change, checked against the 2024 and 2025 annual-average levels."
        }
    ],
    "annualRates": {
        "1925": 9.374999815190478,
        "1926": 0.7142858382786832,
        "1927": 4.964538966581511,
        "1928": 2.702702694264514,
        "1929": 1.3157895175181844,
        "1930": -3.8961039297869315,
        "1931": -8.108108105529377,
        "1932": -11.02941175231129,
        "1933": -2.479338830192568,
        "1934": 2.542372867915077,
        "1935": 1.6528924831336944,
        "1936": 0.8130082074432776,
        "1937": 0.8064516434209024,
        "1938": 0.7999999345629893,
        "1939": 0,
        "1940": 3.174603225766992,
        "1941": 2.3076923316147635,
        "1942": 3.0075188375392248,
        "1943": 0.7299269741511072,
        "1944": 2.173913020901508,
        "1945": 2.836879428263228,
        "1946": 8.965517175303429,
        "1947": 6.962025327568333,
        "1948": 15.384615426076165,
        "1949": 7.035203603123863,
        "1950": -6.4,
        "1951": 7.6,
        "1952": 2.1,
        "1953": -1.7,
        "1954": 0.4,
        "1955": 1.4,
        "1956": 2.8,
        "1957": 2,
        "1958": 2.3,
        "1959": 0.6,
        "1960": 1.6,
        "1961": 2.5,
        "1962": 2.8,
        "1963": 3,
        "1964": 2.4,
        "1965": 3.2,
        "1966": 3.3,
        "1967": 1.9,
        "1968": 1.6,
        "1969": 1.8,
        "1970": 3.6,
        "1971": 5.2,
        "1972": 5.4,
        "1973": 7.1,
        "1974": 6.9,
        "1975": 6,
        "1976": 4.2,
        "1977": 3.7,
        "1978": 2.7,
        "1979": 4.1,
        "1980": 5.4,
        "1981": 6.3,
        "1982": 5.2,
        "1983": 3.2,
        "1984": 2.5,
        "1985": 2,
        "1986": -0.1,
        "1987": 0.2,
        "1988": 1.2,
        "1989": 2.8,
        "1990": 2.6,
        "1991": 3.7,
        "1992": 5,
        "1993": 4.5,
        "1994": 2.7,
        "1995": 1.9,
        "1996": 1.4,
        "1997": 1.9,
        "1998": 0.8,
        "1999": 0.7,
        "2000": 1.3,
        "2001": 2,
        "2002": 1.4,
        "2003": 1,
        "2004": 1.6,
        "2005": 1.6,
        "2006": 1.6,
        "2007": 2.3,
        "2008": 2.6,
        "2009": 0.3,
        "2010": 1,
        "2011": 2.2,
        "2012": 1.9,
        "2013": 1.5,
        "2014": 1,
        "2015": 0.5,
        "2016": 0.5,
        "2017": 1.5,
        "2018": 1.8,
        "2019": 1.4,
        "2020": 0.5,
        "2021": 3.1,
        "2022": 6.9,
        "2023": 5.9,
        "2024": 2.2,
        "2025": 2.2
    },
    "indexLevels": {
        "1925": 109.37499981519048,
        "1926": 110.15624994948772,
        "1927": 115.62499990235496,
        "1928": 118.74999988995924,
        "1929": 120.31249994056418,
        "1930": 115.62499990235496,
        "1931": 106.24999991325379,
        "1932": 94.53124993599064,
        "1933": 92.18749994966124,
        "1934": 94.53124993599066,
        "1935": 96.09374986039498,
        "1936": 96.87499993360001,
        "1937": 97.65624996262852,
        "1938": 98.43749989842622,
        "1939": 98.43749989842622,
        "1940": 101.56249994556605,
        "1941": 103.90624996860612,
        "1942": 107.03125000979254,
        "1943": 107.81249997438513,
        "1944": 110.15624994948773,
        "1945": 113.28124994325097,
        "1946": 123.43749986331154,
        "1947": 132.03124986751243,
        "1948": 152.34374990187092,
        "1949": 163.06144288410135,
        "1950": 152.62551053951887,
        "1951": 164.2250493405223,
        "1952": 167.67377537667326,
        "1953": 164.8233211952698,
        "1954": 165.4826144800509,
        "1955": 167.79937108277161,
        "1956": 172.49775347308923,
        "1957": 175.94770854255103,
        "1958": 179.99450583902967,
        "1959": 181.07447287406384,
        "1960": 183.97166444004887,
        "1961": 188.57095605105008,
        "1962": 193.85094282047947,
        "1963": 199.66647110509388,
        "1964": 204.45846641161614,
        "1965": 211.00113733678788,
        "1966": 217.96417486890186,
        "1967": 222.10549419141097,
        "1968": 225.65918209847354,
        "1969": 229.72104737624608,
        "1970": 237.99100508179095,
        "1971": 250.36653734604408,
        "1972": 263.88633036273046,
        "1973": 282.62225981848434,
        "1974": 302.1231957459597,
        "1975": 320.2505874907173,
        "1976": 333.70111216532746,
        "1977": 346.0480533154446,
        "1978": 355.39135075496154,
        "1979": 369.96239613591496,
        "1980": 389.94036552725436,
        "1981": 414.50660855547136,
        "1982": 436.06095220035587,
        "1983": 450.0149026707673,
        "1984": 461.26527523753646,
        "1985": 470.4905807422872,
        "1986": 470.0200901615449,
        "1987": 470.96013034186797,
        "1988": 476.6116519059704,
        "1989": 489.9567781593376,
        "1990": 502.6956543914804,
        "1991": 521.2953936039651,
        "1992": 547.3601632841634,
        "1993": 571.9913706319506,
        "1994": 587.4351376390133,
        "1995": 598.5964052541545,
        "1996": 606.9767549277127,
        "1997": 618.5093132713392,
        "1998": 623.45738777751,
        "1999": 627.8215894919525,
        "2000": 635.9832701553479,
        "2001": 648.7029355584549,
        "2002": 657.7847766562733,
        "2003": 664.362624422836,
        "2004": 674.9924264136014,
        "2005": 685.792305236219,
        "2006": 696.7649821199985,
        "2007": 712.7905767087584,
        "2008": 731.3231317031862,
        "2009": 733.5171010982956,
        "2010": 740.8522721092786,
        "2011": 757.1510220956827,
        "2012": 771.5368915155007,
        "2013": 783.1099448882331,
        "2014": 790.9410443371155,
        "2015": 794.895749558801,
        "2016": 798.8702283065949,
        "2017": 810.8532817311938,
        "2018": 825.4486408023553,
        "2019": 837.0049217735883,
        "2020": 841.1899463824561,
        "2021": 867.2668347203122,
        "2022": 927.1082463160137,
        "2023": 981.8076328486585,
        "2024": 1003.407400771329,
        "2025": 1025.4823635882983
    }
});

export const GERMAN_CPI_INFLATION_RATES =
    GERMAN_CPI_RESEARCH_CHAIN.annualRates;

export const GERMAN_CPI_SYNTHETIC_INDEX_LEVELS =
    GERMAN_CPI_RESEARCH_CHAIN.indexLevels;
