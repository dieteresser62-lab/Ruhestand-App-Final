const __vite__mapDeps=(i,m=__vite__mapDeps,d=(m.f||(m.f=["../chunks/DhE-M1A1.js","../chunks/CmsKOCeN.js"])))=>i.map(i=>d[i]);
import { s as Ia, n as Wl, d as dt, o as ds, r as nn, q as xr } from "../chunks/CArxwV3n.js";
import { S as Aa, i as Sa, d as u, b as fe, w as l, e as n, f as v, j as a, y as T, z as P, s as de, c as e, g as j, k as Z, A as S, B as F, h as f, o as Ea, l as p, C as hs, x as b, D as le, E as ma, F as Wr, t as zt, a as Ge, n as Zi, q as Wi, u as Yi, v as $i, r as Qi, m as Ki } from "../chunks/DK8bGZiz.js";
import { _ as gs } from "../chunks/CmsKOCeN.js";
import { d as _s, w as an } from "../chunks/CGTK0Dt_.js";
let Os, Us;
let __tla = (async () => {
  function Yr(t) {
    return (t == null ? void 0 : t.length) !== void 0 ? t : Array.from(t);
  }
  let ms, bs, xi, ka, wa, $r, Qr;
  ms = false;
  bs = false;
  Us = Object.freeze(Object.defineProperty({
    __proto__: null,
    prerender: bs,
    ssr: ms
  }, Symbol.toStringTag, {
    value: "Module"
  }));
  xi = an(false);
  ka = an(null);
  wa = an(false);
  $r = an(null);
  Qr = an(null);
  _s([
    wa,
    ka
  ], ([t, i]) => t && !i);
  let Ca = null;
  async function fs() {
    if (!Ca) {
      xi.set(true), ka.set(null);
      try {
        const { initRustEngine: t } = await gs(async () => {
          const { initRustEngine: i } = await import("../chunks/DhE-M1A1.js").then(async (m) => {
            await m.__tla;
            return m;
          });
          return {
            initRustEngine: i
          };
        }, __vite__mapDeps([0,1]), import.meta.url);
        Ca = await t(), wa.set(true);
      } catch (t) {
        console.error("Failed to init Rust engine:", t), ka.set(t instanceof Error ? t.message : "Unknown error");
      } finally {
        xi.set(false);
      }
    }
  }
  function ps() {
    if (!Ca) throw new Error("Engine not initialized. Call initEngine() first.");
    return Ca;
  }
  const vs = [
    [
      1928,
      1.438
    ],
    [
      1929,
      0.916
    ],
    [
      1930,
      0.752
    ],
    [
      1931,
      0.566
    ],
    [
      1932,
      0.918
    ],
    [
      1933,
      1.54
    ],
    [
      1934,
      0.985
    ],
    [
      1935,
      1.477
    ],
    [
      1936,
      1.339
    ],
    [
      1937,
      0.65
    ],
    [
      1938,
      1.311
    ],
    [
      1939,
      0.996
    ],
    [
      1940,
      0.902
    ],
    [
      1941,
      0.884
    ],
    [
      1942,
      1.203
    ],
    [
      1943,
      1.259
    ],
    [
      1944,
      1.197
    ],
    [
      1945,
      1.364
    ],
    [
      1946,
      0.919
    ],
    [
      1947,
      1.057
    ],
    [
      1948,
      1.055
    ],
    [
      1949,
      1.188
    ],
    [
      1950,
      1.317
    ],
    [
      1951,
      1.24
    ],
    [
      1952,
      1.184
    ],
    [
      1953,
      0.99
    ],
    [
      1954,
      1.526
    ],
    [
      1955,
      1.315
    ],
    [
      1956,
      1.066
    ],
    [
      1957,
      0.892
    ],
    [
      1958,
      1.434
    ],
    [
      1959,
      1.12
    ],
    [
      1960,
      1.005
    ],
    [
      1961,
      1.269
    ],
    [
      1962,
      0.913
    ],
    [
      1963,
      1.228
    ],
    [
      1964,
      1.165
    ],
    [
      1965,
      1.125
    ],
    [
      1966,
      0.899
    ],
    [
      1967,
      1.239
    ],
    [
      1968,
      1.111
    ],
    [
      1969,
      0.915
    ],
    [
      1970,
      1.04
    ],
    [
      1971,
      1.143
    ],
    [
      1972,
      1.19
    ],
    [
      1973,
      0.853
    ],
    [
      1974,
      0.735
    ],
    [
      1975,
      1.372
    ],
    [
      1976,
      1.238
    ],
    [
      1977,
      0.928
    ],
    [
      1978,
      1.066
    ],
    [
      1979,
      1.184
    ],
    [
      1980,
      1.325
    ],
    [
      1981,
      0.951
    ],
    [
      1982,
      1.215
    ],
    [
      1983,
      1.226
    ],
    [
      1984,
      1.063
    ],
    [
      1985,
      1.317
    ],
    [
      1986,
      1.187
    ],
    [
      1987,
      1.053
    ],
    [
      1988,
      1.166
    ],
    [
      1989,
      1.317
    ],
    [
      1990,
      0.969
    ],
    [
      1991,
      1.305
    ],
    [
      1992,
      1.076
    ],
    [
      1993,
      1.101
    ],
    [
      1994,
      1.013
    ],
    [
      1995,
      1.376
    ],
    [
      1996,
      1.23
    ],
    [
      1997,
      1.334
    ],
    [
      1998,
      1.286
    ],
    [
      1999,
      1.21
    ],
    [
      2e3,
      0.909
    ],
    [
      2001,
      0.881
    ],
    [
      2002,
      0.779
    ],
    [
      2003,
      1.287
    ],
    [
      2004,
      1.109
    ],
    [
      2005,
      1.049
    ],
    [
      2006,
      1.158
    ],
    [
      2007,
      1.055
    ],
    [
      2008,
      0.63
    ],
    [
      2009,
      1.265
    ],
    [
      2010,
      1.151
    ],
    [
      2011,
      1.021
    ],
    [
      2012,
      1.16
    ],
    [
      2013,
      1.324
    ],
    [
      2014,
      1.137
    ],
    [
      2015,
      1.014
    ],
    [
      2016,
      1.12
    ],
    [
      2017,
      1.218
    ],
    [
      2018,
      0.956
    ],
    [
      2019,
      1.315
    ],
    [
      2020,
      1.184
    ],
    [
      2021,
      1.287
    ],
    [
      2022,
      0.819
    ],
    [
      2023,
      1.263
    ]
  ], cs = [
    [
      1950,
      6.4
    ],
    [
      1951,
      8.4
    ],
    [
      1952,
      1
    ],
    [
      1953,
      -2.1
    ],
    [
      1954,
      -0.4
    ],
    [
      1955,
      1.6
    ],
    [
      1956,
      2.7
    ],
    [
      1957,
      4.4
    ],
    [
      1958,
      2.4
    ],
    [
      1959,
      1.1
    ],
    [
      1960,
      1.4
    ],
    [
      1961,
      2.3
    ],
    [
      1962,
      2.9
    ],
    [
      1963,
      2.9
    ],
    [
      1964,
      2.5
    ],
    [
      1965,
      3.2
    ],
    [
      1966,
      3.5
    ],
    [
      1967,
      1.6
    ],
    [
      1968,
      1.6
    ],
    [
      1969,
      1.8
    ],
    [
      1970,
      3.5
    ],
    [
      1971,
      5.2
    ],
    [
      1972,
      5.4
    ],
    [
      1973,
      7.1
    ],
    [
      1974,
      5.8
    ],
    [
      1975,
      5.9
    ],
    [
      1976,
      4.2
    ],
    [
      1977,
      3.7
    ],
    [
      1978,
      2.5
    ],
    [
      1979,
      4.1
    ],
    [
      1980,
      5.3
    ],
    [
      1981,
      6.3
    ],
    [
      1982,
      5.3
    ],
    [
      1983,
      3.3
    ],
    [
      1984,
      2.4
    ],
    [
      1985,
      2
    ],
    [
      1986,
      -0.1
    ],
    [
      1987,
      0.3
    ],
    [
      1988,
      1.3
    ],
    [
      1989,
      2.8
    ],
    [
      1990,
      2.6
    ],
    [
      1991,
      5.1
    ],
    [
      1992,
      4.6
    ],
    [
      1993,
      4.3
    ],
    [
      1994,
      2.6
    ],
    [
      1995,
      1.7
    ],
    [
      1996,
      1.4
    ],
    [
      1997,
      1.9
    ],
    [
      1998,
      0.9
    ],
    [
      1999,
      0.6
    ],
    [
      2e3,
      1.4
    ],
    [
      2001,
      1.9
    ],
    [
      2002,
      1.4
    ],
    [
      2003,
      1.1
    ],
    [
      2004,
      1.6
    ],
    [
      2005,
      1.5
    ],
    [
      2006,
      1.5
    ],
    [
      2007,
      2.3
    ],
    [
      2008,
      2.6
    ],
    [
      2009,
      0.3
    ],
    [
      2010,
      1.1
    ],
    [
      2011,
      2.1
    ],
    [
      2012,
      2
    ],
    [
      2013,
      1.5
    ],
    [
      2014,
      1
    ],
    [
      2015,
      0.5
    ],
    [
      2016,
      0.5
    ],
    [
      2017,
      1.5
    ],
    [
      2018,
      1.8
    ],
    [
      2019,
      1.4
    ],
    [
      2020,
      0.5
    ],
    [
      2021,
      3.1
    ],
    [
      2022,
      6.9
    ],
    [
      2023,
      5.9
    ]
  ];
  function Es(t = 1950, i = 2023) {
    const s = [], o = [];
    for (const [d, m] of vs) d >= t && d <= i && s.push(m);
    for (const [d, m] of cs) d >= t && d <= i && o.push(m);
    return {
      returns: s,
      inflation: o
    };
  }
  const ba = {
    startKapital: 225e3,
    depotwertAlt: 0,
    depotwertNeu: 0,
    zielLiquiditaet: 18e3,
    startFloorBedarf: 12e3,
    startFlexBedarf: 22e3,
    floorBedarf: 12e3,
    flexBedarf: 22e3,
    capeRatio: 32,
    marketCapeRatio: 32,
    einstandAlt: 0,
    einstandNeu: 0,
    costBasisAlt: 0,
    costBasisNeu: 0,
    aktuelleLiquiditaet: null,
    risikoprofil: "ausgewogen",
    targetEq: 60,
    rebalBand: 25,
    maxSkimPctOfEq: 10,
    maxBearRefillPctOfEq: 5,
    runwayMinMonths: 24,
    runwayTargetMonths: 36,
    goldAllokationAktiv: true,
    goldAktiv: true,
    goldAllokationProzent: 7.5,
    goldZielProzent: 7.5,
    goldFloorProzent: 1,
    goldWert: 0,
    goldCost: 0,
    goldSteuerfrei: true,
    goldRebalancingBand: 25,
    aktuellesAlter: 63,
    p1Geschlecht: "m",
    renteMonatlich: 650,
    renteStartInJahren: 5,
    p1StartInJahren: 5,
    renteAnpassungPct: 2,
    rentAdjMode: "wage",
    rentAdjPct: 2,
    renteSteuerpflichtigPct: 83,
    p1SparerPauschbetrag: 1e3,
    p1KirchensteuerPct: 9,
    partnerAktiv: false,
    p2AktuellesAlter: 60,
    p2Geschlecht: "w",
    p2RenteMonatlich: 0,
    p2RenteStartInJahren: 7,
    p2StartInJahren: 7,
    p2RenteAnpassungPct: 2,
    p2SparerPauschbetrag: 0,
    p2KirchensteuerPct: 0,
    p2Steuerquote: 0,
    widowPensionMode: "percent",
    widowPensionPct: 55,
    widowMarriageOffsetYears: 0,
    widowMinMarriageYears: 1,
    kapitalertragsteuer: 25,
    soli: 5.5,
    ansparphaseAktiv: false,
    ansparphaseDauerJahre: 0,
    ansparrateMonatlich: 0,
    sparrateIndexing: "inflation",
    ansparrateDynamik: 0,
    pflegefallLogikAktiv: true,
    pflegeModellTyp: "chronisch",
    pflegeRampUpJahre: 5,
    pflegeDauerJahre: 10,
    pflegeMinDauer: 5,
    pflegeMaxDauer: 10,
    pflegeStufe1Zusatz: 6e3,
    pflegeStufe1FlexCut: 75,
    pflegeStufe1Mortality: 0,
    pflegeStufe2Zusatz: 12e3,
    pflegeStufe2FlexCut: 25,
    pflegeStufe2Mortality: 0,
    pflegeStufe3Zusatz: 18e3,
    pflegeStufe3FlexCut: 10,
    pflegeStufe3Mortality: 3,
    pflegeStufe4Zusatz: 32e3,
    pflegeStufe4FlexCut: 0,
    pflegeStufe4Mortality: 5,
    pflegeStufe5Zusatz: 6e4,
    pflegeStufe5FlexCut: 0,
    pflegeStufe5Mortality: 5,
    pflegeMaxFloor: 12e4,
    pflegeRegionalZuschlag: 0,
    pflegeKostenDrift: 3.5,
    pflegeKostenStufe1: 6e3,
    pflegeKostenStufe2: 12e3,
    pflegeKostenStufe3: 18e3,
    pflegeKostenStufe4: 32e3,
    pflegeKostenStufe5: 6e4,
    pflegeVersicherungMonatlich: 0,
    mcAnzahl: 1e3,
    mcDauer: 35,
    mcBlockSize: 5,
    mcSeed: 12345,
    mcMethode: "regime_markov",
    useCapeSampling: false,
    stressPreset: "none",
    btStartJahr: 2e3,
    btEndJahr: 2023
  };
  function ks() {
    let t = ba;
    {
      const d = localStorage.getItem("simulationInput_v2");
      if (d) try {
        t = {
          ...ba,
          ...JSON.parse(d)
        };
      } catch (m) {
        console.warn("Failed to parse stored simulation input", m);
      }
    }
    const { subscribe: i, set: s, update: o } = an(t);
    return {
      subscribe: i,
      set: (d) => {
        try {
          localStorage.setItem("simulationInput_v2", JSON.stringify(d));
        } catch (m) {
          console.error("LocalStorage save failed", m);
        }
        s(d);
      },
      update: (d) => {
        o((m) => {
          const g = d(m);
          try {
            localStorage.setItem("simulationInput_v2", JSON.stringify(g));
          } catch (r) {
            console.error("LocalStorage save failed", r);
          }
          return g;
        });
      },
      reset: () => {
        s(ba);
        try {
          localStorage.setItem("simulationInput_v2", JSON.stringify(ba));
        } catch (d) {
          console.error("LocalStorage reset failed", d);
        }
      }
    };
  }
  const J = ks();
  function Cs(t) {
    let i, s, o, d = "Simulationen:", m, g, r, c, _, y = "Jahre:", K, A, B, k, V = t[0] ? "\u23F3 L\xE4uft..." : "\u25B6\uFE0F Simulation Starten", M, z, N, U, H, w = t[6] && Xr(t);
    return {
      c() {
        i = a("div"), s = a("div"), o = a("label"), o.textContent = d, m = p(), g = a("input"), r = p(), c = a("div"), _ = a("label"), _.textContent = y, K = p(), A = a("input"), B = p(), k = a("button"), M = Z(V), z = p(), w && w.c(), N = Ea(), this.h();
      },
      l(L) {
        i = n(L, "DIV", {
          class: true
        });
        var E = v(i);
        s = n(E, "DIV", {
          class: true
        });
        var I = v(s);
        o = n(I, "LABEL", {
          for: true,
          class: true,
          "data-svelte-h": true
        }), P(o) !== "svelte-1qdc9a9" && (o.textContent = d), m = f(I), g = n(I, "INPUT", {
          type: true,
          id: true,
          step: true,
          min: true,
          class: true
        }), I.forEach(u), r = f(E), c = n(E, "DIV", {
          class: true
        });
        var D = v(c);
        _ = n(D, "LABEL", {
          for: true,
          class: true,
          "data-svelte-h": true
        }), P(_) !== "svelte-nqsd8c" && (_.textContent = y), K = f(D), A = n(D, "INPUT", {
          type: true,
          id: true,
          min: true,
          max: true,
          class: true
        }), D.forEach(u), B = f(E), k = n(E, "BUTTON", {
          class: true
        });
        var O = v(k);
        M = j(O, V), O.forEach(u), E.forEach(u), z = f(L), w && w.l(L), N = Ea(), this.h();
      },
      h() {
        l(o, "for", "mcCount"), l(o, "class", "svelte-d1tbzo"), l(g, "type", "number"), l(g, "id", "mcCount"), l(g, "step", "500"), l(g, "min", "1000"), l(g, "class", "mc-input-large svelte-d1tbzo"), l(s, "class", "input-group svelte-d1tbzo"), l(_, "for", "mcYears"), l(_, "class", "svelte-d1tbzo"), l(A, "type", "number"), l(A, "id", "mcYears"), l(A, "min", "10"), l(A, "max", "60"), l(A, "class", "mc-input-small svelte-d1tbzo"), l(c, "class", "input-group svelte-d1tbzo"), k.disabled = t[0], l(k, "class", "start-btn svelte-d1tbzo"), l(i, "class", "controls-bar svelte-d1tbzo");
      },
      m(L, E) {
        fe(L, i, E), e(i, s), e(s, o), e(s, m), e(s, g), S(g, t[2].mcAnzahl), e(i, r), e(i, c), e(c, _), e(c, K), e(c, A), S(A, t[2].mcDauer), e(i, B), e(i, k), e(k, M), fe(L, z, E), w && w.m(L, E), fe(L, N, E), U || (H = [
          F(g, "input", t[9]),
          F(A, "input", t[10]),
          F(k, "click", t[7])
        ], U = true);
      },
      p(L, E) {
        E & 4 && T(g.value) !== L[2].mcAnzahl && S(g, L[2].mcAnzahl), E & 4 && T(A.value) !== L[2].mcDauer && S(A, L[2].mcDauer), E & 1 && V !== (V = L[0] ? "\u23F3 L\xE4uft..." : "\u25B6\uFE0F Simulation Starten") && de(M, V), E & 1 && (k.disabled = L[0]), L[6] ? w ? w.p(L, E) : (w = Xr(L), w.c(), w.m(N.parentNode, N)) : w && (w.d(1), w = null);
      },
      d(L) {
        L && (u(i), u(z), u(N)), w && w.d(L), U = false, nn(H);
      }
    };
  }
  function Is(t) {
    let i, s, o;
    return {
      c() {
        i = a("p"), s = Z("\u274C Fehler: "), o = Z(t[5]), this.h();
      },
      l(d) {
        i = n(d, "P", {
          class: true
        });
        var m = v(i);
        s = j(m, "\u274C Fehler: "), o = j(m, t[5]), m.forEach(u), this.h();
      },
      h() {
        l(i, "class", "error svelte-d1tbzo");
      },
      m(d, m) {
        fe(d, i, m), e(i, s), e(i, o);
      },
      p(d, m) {
        m & 32 && de(o, d[5]);
      },
      d(d) {
        d && u(i);
      }
    };
  }
  function As(t) {
    let i, s = "\u{1F504} Engine wird geladen...";
    return {
      c() {
        i = a("p"), i.textContent = s;
      },
      l(o) {
        i = n(o, "P", {
          "data-svelte-h": true
        }), P(i) !== "svelte-1464nfb" && (i.textContent = s);
      },
      m(o, d) {
        fe(o, i, d);
      },
      p: Wl,
      d(o) {
        o && u(i);
      }
    };
  }
  function Xr(t) {
    let i, s, o, d = t[1].toFixed(0) + "", m, g, r, c, _, y, K = "Erfolgsrate", A, B, k = (t[6].successRate * 100).toFixed(1) + "", V, M, z, N, U, H = "Median Verm\xF6gen", w, L, E, I = t[6].medianFinalWealth.toLocaleString("de-DE", {
      maximumFractionDigits: 0
    }) + "", D, O, R, x, ne = "5% Percentil (Schlecht)", q, G, Q, ee = t[6].percentile5.toLocaleString("de-DE", {
      maximumFractionDigits: 0
    }) + "", me, ge, X, _e, be = "95% Percentil (Gut)", pe, Ee, oe, W = t[6].percentile95.toLocaleString("de-DE", {
      maximumFractionDigits: 0
    }) + "", Le, re, ae, ke, Pe = "Ruinwahrscheinlichkeit", ie, Re, Ce = (t[6].ruinProbability * 100).toFixed(1) + "", ye, Ft, ft, $ = t[6].avgYearsToRuin && es(t);
    return {
      c() {
        i = a("div"), s = a("h4"), o = Z("Ergebnisse ("), m = Z(d), g = Z("ms)"), r = p(), c = a("div"), _ = a("div"), y = a("span"), y.textContent = K, A = p(), B = a("span"), V = Z(k), M = Z("%"), z = p(), N = a("div"), U = a("span"), U.textContent = H, w = p(), L = a("span"), E = Z("\u20AC"), D = Z(I), O = p(), R = a("div"), x = a("span"), x.textContent = ne, q = p(), G = a("span"), Q = Z("\u20AC"), me = Z(ee), ge = p(), X = a("div"), _e = a("span"), _e.textContent = be, pe = p(), Ee = a("span"), oe = Z("\u20AC"), Le = Z(W), re = p(), ae = a("div"), ke = a("span"), ke.textContent = Pe, ie = p(), Re = a("span"), ye = Z(Ce), Ft = Z("%"), ft = p(), $ && $.c(), this.h();
      },
      l(Y) {
        i = n(Y, "DIV", {
          class: true
        });
        var te = v(i);
        s = n(te, "H4", {});
        var ze = v(s);
        o = j(ze, "Ergebnisse ("), m = j(ze, d), g = j(ze, "ms)"), ze.forEach(u), r = f(te), c = n(te, "DIV", {
          class: true
        });
        var De = v(c);
        _ = n(De, "DIV", {
          class: true
        });
        var qt = v(_);
        y = n(qt, "SPAN", {
          class: true,
          "data-svelte-h": true
        }), P(y) !== "svelte-1eedgyz" && (y.textContent = K), A = f(qt), B = n(qt, "SPAN", {
          class: true
        });
        var ve = v(B);
        V = j(ve, k), M = j(ve, "%"), ve.forEach(u), qt.forEach(u), z = f(De), N = n(De, "DIV", {
          class: true
        });
        var ce = v(N);
        U = n(ce, "SPAN", {
          class: true,
          "data-svelte-h": true
        }), P(U) !== "svelte-2gm5b5" && (U.textContent = H), w = f(ce), L = n(ce, "SPAN", {
          class: true
        });
        var pt = v(L);
        E = j(pt, "\u20AC"), D = j(pt, I), pt.forEach(u), ce.forEach(u), O = f(De), R = n(De, "DIV", {
          class: true
        });
        var vt = v(R);
        x = n(vt, "SPAN", {
          class: true,
          "data-svelte-h": true
        }), P(x) !== "svelte-1myxe9a" && (x.textContent = ne), q = f(vt), G = n(vt, "SPAN", {
          class: true
        });
        var vl = v(G);
        Q = j(vl, "\u20AC"), me = j(vl, ee), vl.forEach(u), vt.forEach(u), ge = f(De), X = n(De, "DIV", {
          class: true
        });
        var he = v(X);
        _e = n(he, "SPAN", {
          class: true,
          "data-svelte-h": true
        }), P(_e) !== "svelte-1fw31bd" && (_e.textContent = be), pe = f(he), Ee = n(he, "SPAN", {
          class: true
        });
        var ct = v(Ee);
        oe = j(ct, "\u20AC"), Le = j(ct, W), ct.forEach(u), he.forEach(u), re = f(De), ae = n(De, "DIV", {
          class: true
        });
        var ht = v(ae);
        ke = n(ht, "SPAN", {
          class: true,
          "data-svelte-h": true
        }), P(ke) !== "svelte-cwf5wc" && (ke.textContent = Pe), ie = f(ht), Re = n(ht, "SPAN", {
          class: true
        });
        var cl = v(Re);
        ye = j(cl, Ce), Ft = j(cl, "%"), cl.forEach(u), ht.forEach(u), ft = f(De), $ && $.l(De), De.forEach(u), te.forEach(u), this.h();
      },
      h() {
        l(y, "class", "label svelte-d1tbzo"), l(B, "class", "value svelte-d1tbzo"), l(_, "class", "metric success svelte-d1tbzo"), l(U, "class", "label svelte-d1tbzo"), l(L, "class", "value svelte-d1tbzo"), l(N, "class", "metric svelte-d1tbzo"), l(x, "class", "label svelte-d1tbzo"), l(G, "class", "value svelte-d1tbzo"), l(R, "class", "metric warning svelte-d1tbzo"), l(_e, "class", "label svelte-d1tbzo"), l(Ee, "class", "value svelte-d1tbzo"), l(X, "class", "metric good svelte-d1tbzo"), l(ke, "class", "label svelte-d1tbzo"), l(Re, "class", "value svelte-d1tbzo"), l(ae, "class", "metric danger svelte-d1tbzo"), l(c, "class", "result-grid svelte-d1tbzo"), l(i, "class", "results");
      },
      m(Y, te) {
        fe(Y, i, te), e(i, s), e(s, o), e(s, m), e(s, g), e(i, r), e(i, c), e(c, _), e(_, y), e(_, A), e(_, B), e(B, V), e(B, M), e(c, z), e(c, N), e(N, U), e(N, w), e(N, L), e(L, E), e(L, D), e(c, O), e(c, R), e(R, x), e(R, q), e(R, G), e(G, Q), e(G, me), e(c, ge), e(c, X), e(X, _e), e(X, pe), e(X, Ee), e(Ee, oe), e(Ee, Le), e(c, re), e(c, ae), e(ae, ke), e(ae, ie), e(ae, Re), e(Re, ye), e(Re, Ft), e(c, ft), $ && $.m(c, null);
      },
      p(Y, te) {
        te & 2 && d !== (d = Y[1].toFixed(0) + "") && de(m, d), te & 64 && k !== (k = (Y[6].successRate * 100).toFixed(1) + "") && de(V, k), te & 64 && I !== (I = Y[6].medianFinalWealth.toLocaleString("de-DE", {
          maximumFractionDigits: 0
        }) + "") && de(D, I), te & 64 && ee !== (ee = Y[6].percentile5.toLocaleString("de-DE", {
          maximumFractionDigits: 0
        }) + "") && de(me, ee), te & 64 && W !== (W = Y[6].percentile95.toLocaleString("de-DE", {
          maximumFractionDigits: 0
        }) + "") && de(Le, W), te & 64 && Ce !== (Ce = (Y[6].ruinProbability * 100).toFixed(1) + "") && de(ye, Ce), Y[6].avgYearsToRuin ? $ ? $.p(Y, te) : ($ = es(Y), $.c(), $.m(c, null)) : $ && ($.d(1), $ = null);
      },
      d(Y) {
        Y && u(i), $ && $.d();
      }
    };
  }
  function es(t) {
    let i, s, o = "\xD8 Jahre bis Ruin", d, m, g = t[6].avgYearsToRuin.toFixed(1) + "", r;
    return {
      c() {
        i = a("div"), s = a("span"), s.textContent = o, d = p(), m = a("span"), r = Z(g), this.h();
      },
      l(c) {
        i = n(c, "DIV", {
          class: true
        });
        var _ = v(i);
        s = n(_, "SPAN", {
          class: true,
          "data-svelte-h": true
        }), P(s) !== "svelte-1chrgw1" && (s.textContent = o), d = f(_), m = n(_, "SPAN", {
          class: true
        });
        var y = v(m);
        r = j(y, g), y.forEach(u), _.forEach(u), this.h();
      },
      h() {
        l(s, "class", "label svelte-d1tbzo"), l(m, "class", "value svelte-d1tbzo"), l(i, "class", "metric svelte-d1tbzo");
      },
      m(c, _) {
        fe(c, i, _), e(i, s), e(i, d), e(i, m), e(m, r);
      },
      p(c, _) {
        _ & 64 && g !== (g = c[6].avgYearsToRuin.toFixed(1) + "") && de(r, g);
      },
      d(c) {
        c && u(i);
      }
    };
  }
  function Ss(t) {
    let i;
    function s(m, g) {
      if (m[4]) return As;
      if (m[5]) return Is;
      if (m[3]) return Cs;
    }
    let o = s(t), d = o && o(t);
    return {
      c() {
        i = a("div"), d && d.c(), this.h();
      },
      l(m) {
        i = n(m, "DIV", {
          class: true
        });
        var g = v(i);
        d && d.l(g), g.forEach(u), this.h();
      },
      h() {
        l(i, "class", "monte-carlo-panel svelte-d1tbzo");
      },
      m(m, g) {
        fe(m, i, g), d && d.m(i, null);
      },
      p(m, [g]) {
        o === (o = s(m)) && d ? d.p(m, g) : (d && d.d(1), d = o && o(m), d && (d.c(), d.m(i, null)));
      },
      i: Wl,
      o: Wl,
      d(m) {
        m && u(i), d && d.d();
      }
    };
  }
  function ws(t, i, s) {
    let o, d, m, g, r;
    dt(t, J, (k) => s(2, o = k)), dt(t, wa, (k) => s(3, d = k)), dt(t, xi, (k) => s(4, m = k)), dt(t, ka, (k) => s(5, g = k)), dt(t, $r, (k) => s(6, r = k));
    let { input: c } = i, _ = false, y = 0;
    ds(async () => {
      await fs();
    });
    async function K() {
      if (!d) return;
      s(0, _ = true);
      const k = performance.now();
      try {
        const V = o, { returns: M, inflation: z } = Es(1950, 2023), N = {
          numSimulations: V.mcAnzahl || 5e3,
          yearsToSimulate: V.mcDauer || 30,
          historicalReturns: M,
          historicalInflation: z
        }, H = ps().runMonteCarlo(V, N);
        s(1, y = performance.now() - k), $r.set(H);
      } catch (V) {
        console.error("Monte Carlo failed:", V);
      } finally {
        s(0, _ = false);
      }
    }
    function A() {
      o.mcAnzahl = T(this.value), J.set(o);
    }
    function B() {
      o.mcDauer = T(this.value), J.set(o);
    }
    return t.$$set = (k) => {
      "input" in k && s(8, c = k.input);
    }, [
      _,
      y,
      o,
      d,
      m,
      g,
      r,
      K,
      c,
      A,
      B
    ];
  }
  class Ls extends Aa {
    constructor(i) {
      super(), Sa(this, i, ws, Ss, Ia, {
        input: 8
      });
    }
  }
  function ts(t) {
    let i, s, o, d = "Start:", m, g, r, c, _, y = "Ende:", K, A, B, k, V = t[0] ? "\u23F3 ..." : "\u25B6\uFE0F Backtest starten", M, z, N, U, H, w = t[4] && ls(t);
    return {
      c() {
        i = a("div"), s = a("div"), o = a("label"), o.textContent = d, m = p(), g = a("input"), r = p(), c = a("div"), _ = a("label"), _.textContent = y, K = p(), A = a("input"), B = p(), k = a("button"), M = Z(V), z = p(), w && w.c(), N = Ea(), this.h();
      },
      l(L) {
        i = n(L, "DIV", {
          class: true
        });
        var E = v(i);
        s = n(E, "DIV", {
          class: true
        });
        var I = v(s);
        o = n(I, "LABEL", {
          for: true,
          class: true,
          "data-svelte-h": true
        }), P(o) !== "svelte-9ueunq" && (o.textContent = d), m = f(I), g = n(I, "INPUT", {
          type: true,
          id: true,
          min: true,
          max: true,
          class: true
        }), I.forEach(u), r = f(E), c = n(E, "DIV", {
          class: true
        });
        var D = v(c);
        _ = n(D, "LABEL", {
          for: true,
          class: true,
          "data-svelte-h": true
        }), P(_) !== "svelte-kn93bd" && (_.textContent = y), K = f(D), A = n(D, "INPUT", {
          type: true,
          id: true,
          min: true,
          max: true,
          class: true
        }), D.forEach(u), B = f(E), k = n(E, "BUTTON", {
          class: true
        });
        var O = v(k);
        M = j(O, V), O.forEach(u), E.forEach(u), z = f(L), w && w.l(L), N = Ea(), this.h();
      },
      h() {
        l(o, "for", "btStart"), l(o, "class", "svelte-18vgwlq"), l(g, "type", "number"), l(g, "id", "btStart"), l(g, "min", "1950"), l(g, "max", "2023"), l(g, "class", "year-input svelte-18vgwlq"), l(s, "class", "input-group svelte-18vgwlq"), l(_, "for", "btEnd"), l(_, "class", "svelte-18vgwlq"), l(A, "type", "number"), l(A, "id", "btEnd"), l(A, "min", "1950"), l(A, "max", "2023"), l(A, "class", "year-input svelte-18vgwlq"), l(c, "class", "input-group svelte-18vgwlq"), k.disabled = t[0], l(k, "class", "start-btn svelte-18vgwlq"), l(i, "class", "controls-bar svelte-18vgwlq");
      },
      m(L, E) {
        fe(L, i, E), e(i, s), e(s, o), e(s, m), e(s, g), S(g, t[2].btStartJahr), e(i, r), e(i, c), e(c, _), e(c, K), e(c, A), S(A, t[2].btEndJahr), e(i, B), e(i, k), e(k, M), fe(L, z, E), w && w.m(L, E), fe(L, N, E), U || (H = [
          F(g, "input", t[7]),
          F(A, "input", t[8]),
          F(k, "click", t[5])
        ], U = true);
      },
      p(L, E) {
        E & 4 && T(g.value) !== L[2].btStartJahr && S(g, L[2].btStartJahr), E & 4 && T(A.value) !== L[2].btEndJahr && S(A, L[2].btEndJahr), E & 1 && V !== (V = L[0] ? "\u23F3 ..." : "\u25B6\uFE0F Backtest starten") && de(M, V), E & 1 && (k.disabled = L[0]), L[4] ? w ? w.p(L, E) : (w = ls(L), w.c(), w.m(N.parentNode, N)) : w && (w.d(1), w = null);
      },
      d(L) {
        L && (u(i), u(z), u(N)), w && w.d(L), U = false, nn(H);
      }
    };
  }
  function ls(t) {
    let i, s, o, d = t[1].toFixed(0) + "", m, g, r, c, _, y, K = "Zeitraum:", A, B = t[4].yearsSimulated + "", k, V, M, z, N, U = "Endverm\xF6gen:", H, w = t[4].finalWealth.toLocaleString("de-DE", {
      maximumFractionDigits: 0
    }) + "", L, E, I, D, O = "\xD8 Flex-Rate:", R, x = t[4].avgFlexRate.toFixed(1) + "", ne, q, G, Q, ee, me = "Min/Max:", ge, X = t[4].minWealth.toLocaleString("de-DE", {
      maximumFractionDigits: 0
    }) + "", _e, be, pe = t[4].maxWealth.toLocaleString("de-DE", {
      maximumFractionDigits: 0
    }) + "", Ee;
    return {
      c() {
        i = a("div"), s = a("h4"), o = Z("Ergebnisse ("), m = Z(d), g = Z("ms)"), r = p(), c = a("div"), _ = a("p"), y = a("strong"), y.textContent = K, A = p(), k = Z(B), V = Z(" Jahre"), M = p(), z = a("p"), N = a("strong"), N.textContent = U, H = Z(`\r
                        \u20AC`), L = Z(w), E = p(), I = a("p"), D = a("strong"), D.textContent = O, R = p(), ne = Z(x), q = Z("%"), G = p(), Q = a("p"), ee = a("strong"), ee.textContent = me, ge = Z(`\r
                        \u20AC`), _e = Z(X), be = Z(" / \u20AC"), Ee = Z(pe), this.h();
      },
      l(oe) {
        i = n(oe, "DIV", {
          class: true
        });
        var W = v(i);
        s = n(W, "H4", {});
        var Le = v(s);
        o = j(Le, "Ergebnisse ("), m = j(Le, d), g = j(Le, "ms)"), Le.forEach(u), r = f(W), c = n(W, "DIV", {
          class: true
        });
        var re = v(c);
        _ = n(re, "P", {});
        var ae = v(_);
        y = n(ae, "STRONG", {
          "data-svelte-h": true
        }), P(y) !== "svelte-z3i3cb" && (y.textContent = K), A = f(ae), k = j(ae, B), V = j(ae, " Jahre"), ae.forEach(u), M = f(re), z = n(re, "P", {});
        var ke = v(z);
        N = n(ke, "STRONG", {
          "data-svelte-h": true
        }), P(N) !== "svelte-1w43ulp" && (N.textContent = U), H = j(ke, `\r
                        \u20AC`), L = j(ke, w), ke.forEach(u), E = f(re), I = n(re, "P", {});
        var Pe = v(I);
        D = n(Pe, "STRONG", {
          "data-svelte-h": true
        }), P(D) !== "svelte-6xfuzi" && (D.textContent = O), R = f(Pe), ne = j(Pe, x), q = j(Pe, "%"), Pe.forEach(u), G = f(re), Q = n(re, "P", {});
        var ie = v(Q);
        ee = n(ie, "STRONG", {
          "data-svelte-h": true
        }), P(ee) !== "svelte-abcqpt" && (ee.textContent = me), ge = j(ie, `\r
                        \u20AC`), _e = j(ie, X), be = j(ie, " / \u20AC"), Ee = j(ie, pe), ie.forEach(u), re.forEach(u), W.forEach(u), this.h();
      },
      h() {
        l(c, "class", "summary"), l(i, "class", "results");
      },
      m(oe, W) {
        fe(oe, i, W), e(i, s), e(s, o), e(s, m), e(s, g), e(i, r), e(i, c), e(c, _), e(_, y), e(_, A), e(_, k), e(_, V), e(c, M), e(c, z), e(z, N), e(z, H), e(z, L), e(c, E), e(c, I), e(I, D), e(I, R), e(I, ne), e(I, q), e(c, G), e(c, Q), e(Q, ee), e(Q, ge), e(Q, _e), e(Q, be), e(Q, Ee);
      },
      p(oe, W) {
        W & 2 && d !== (d = oe[1].toFixed(0) + "") && de(m, d), W & 16 && B !== (B = oe[4].yearsSimulated + "") && de(k, B), W & 16 && w !== (w = oe[4].finalWealth.toLocaleString("de-DE", {
          maximumFractionDigits: 0
        }) + "") && de(L, w), W & 16 && x !== (x = oe[4].avgFlexRate.toFixed(1) + "") && de(ne, x), W & 16 && X !== (X = oe[4].minWealth.toLocaleString("de-DE", {
          maximumFractionDigits: 0
        }) + "") && de(_e, X), W & 16 && pe !== (pe = oe[4].maxWealth.toLocaleString("de-DE", {
          maximumFractionDigits: 0
        }) + "") && de(Ee, pe);
      },
      d(oe) {
        oe && u(i);
      }
    };
  }
  function Ds(t) {
    let i, s = t[3] && ts(t);
    return {
      c() {
        i = a("div"), s && s.c(), this.h();
      },
      l(o) {
        i = n(o, "DIV", {
          class: true
        });
        var d = v(i);
        s && s.l(d), d.forEach(u), this.h();
      },
      h() {
        l(i, "class", "backtest-panel svelte-18vgwlq");
      },
      m(o, d) {
        fe(o, i, d), s && s.m(i, null);
      },
      p(o, [d]) {
        o[3] ? s ? s.p(o, d) : (s = ts(o), s.c(), s.m(i, null)) : s && (s.d(1), s = null);
      },
      i: Wl,
      o: Wl,
      d(o) {
        o && u(i), s && s.d();
      }
    };
  }
  function Ps(t, i, s) {
    let o, d, m;
    dt(t, J, (B) => s(2, o = B)), dt(t, wa, (B) => s(3, d = B)), dt(t, Qr, (B) => s(4, m = B));
    let { input: g } = i, r = false, c = 0;
    ds(async () => {
      await fs();
    });
    function _(B, k) {
      const V = [];
      for (let M = B; M <= k; M++) {
        const z = vs.find(([U]) => U === M), N = cs.find(([U]) => U === M);
        if (z && N) {
          const U = M === B ? 100 : V[V.length - 1].marketIndex * z[1];
          V.push({
            year: M,
            marketIndex: U,
            inflation: N[1],
            capeRatio: null,
            goldEurPerf: null
          });
        }
      }
      return V;
    }
    async function y() {
      if (console.log("Backtest Button Clicked!"), console.log("Engine Ready:", d), !d) {
        console.warn("Engine not ready yet.");
        return;
      }
      s(0, r = true);
      const B = performance.now();
      try {
        const k = o;
        console.log("Raw Input:", k);
        const V = k.startKapital || 0, M = k.zielLiquiditaet || 0, z = k.goldAktiv ? V * (k.goldZielProzent / 100) : 0, N = Math.max(0, V - M - z), U = {
          ...k,
          depotwertNeu: Math.max(0, N - (k.depotwertAlt || 0)),
          aktuelleLiquiditaet: M,
          goldWert: z
        };
        console.log("Calculated Engine Input:", U);
        const H = k.btStartJahr || 2e3, w = k.btEndJahr || 2023;
        console.log(`Backtest range: ${H} - ${w}`);
        const L = _(H, w);
        L.length === 0 && console.error("No historical data found for range!");
        const E = {
          startYear: H,
          endYear: w,
          historicalData: L
        }, I = ps();
        console.log("Engine instance:", I);
        const D = I.runBacktest(U, E);
        console.log("Backtest Result:", D), s(1, c = performance.now() - B), Qr.set(D);
      } catch (k) {
        console.error("Backtest failed with error:", k);
      } finally {
        s(0, r = false);
      }
    }
    function K() {
      o.btStartJahr = T(this.value), J.set(o);
    }
    function A() {
      o.btEndJahr = T(this.value), J.set(o);
    }
    return t.$$set = (B) => {
      "input" in B && s(6, g = B.input);
    }, [
      r,
      c,
      o,
      d,
      m,
      y,
      g,
      K,
      A
    ];
  }
  class ys extends Aa {
    constructor(i) {
      super(), Sa(this, i, Ps, Ds, Ia, {
        input: 6
      });
    }
  }
  function ns(t, i, s) {
    const o = t.slice();
    return o[52] = i[s], o[53] = i, o[54] = s, o;
  }
  function as(t) {
    let i, s = "Person 2", o, d, m, g, r = "Alter", c, _, y, K, A, B = "Rente (mtl.)", k, V, M, z, N, U = "Start in ... Jahren", H, w, L, E, I, D = "Steuerpflichtig (%)", O, R, x, ne;
    return {
      c() {
        i = a("h4"), i.textContent = s, o = p(), d = a("div"), m = a("div"), g = a("label"), g.textContent = r, c = p(), _ = a("input"), y = p(), K = a("div"), A = a("label"), A.textContent = B, k = p(), V = a("input"), M = p(), z = a("div"), N = a("label"), N.textContent = U, H = p(), w = a("input"), L = p(), E = a("div"), I = a("label"), I.textContent = D, O = p(), R = a("input"), this.h();
      },
      l(q) {
        i = n(q, "H4", {
          style: true,
          "data-svelte-h": true
        }), P(i) !== "svelte-1cmn8z1" && (i.textContent = s), o = f(q), d = n(q, "DIV", {
          class: true
        });
        var G = v(d);
        m = n(G, "DIV", {
          class: true
        });
        var Q = v(m);
        g = n(Q, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(g) !== "svelte-1mbxkbg" && (g.textContent = r), c = f(Q), _ = n(Q, "INPUT", {
          type: true,
          id: true
        }), Q.forEach(u), y = f(G), K = n(G, "DIV", {
          class: true
        });
        var ee = v(K);
        A = n(ee, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(A) !== "svelte-1k3t9xq" && (A.textContent = B), k = f(ee), V = n(ee, "INPUT", {
          type: true,
          id: true
        }), ee.forEach(u), M = f(G), z = n(G, "DIV", {
          class: true
        });
        var me = v(z);
        N = n(me, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(N) !== "svelte-k80vkr" && (N.textContent = U), H = f(me), w = n(me, "INPUT", {
          type: true,
          id: true
        }), me.forEach(u), L = f(G), E = n(G, "DIV", {
          class: true
        });
        var ge = v(E);
        I = n(ge, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(I) !== "svelte-1rjkb4g" && (I.textContent = D), O = f(ge), R = n(ge, "INPUT", {
          type: true,
          id: true
        }), ge.forEach(u), G.forEach(u), this.h();
      },
      h() {
        b(i, "margin-bottom", "10px"), l(g, "for", "p2Alter"), l(_, "type", "number"), l(_, "id", "p2Alter"), l(m, "class", "form-group"), l(A, "for", "p2Rente"), l(V, "type", "number"), l(V, "id", "p2Rente"), l(K, "class", "form-group"), l(N, "for", "p2Start"), l(w, "type", "number"), l(w, "id", "p2Start"), l(z, "class", "form-group"), l(I, "for", "p2Steuer"), l(R, "type", "number"), l(R, "id", "p2Steuer"), l(E, "class", "form-group"), l(d, "class", "form-grid-four-col");
      },
      m(q, G) {
        fe(q, i, G), fe(q, o, G), fe(q, d, G), e(d, m), e(m, g), e(m, c), e(m, _), S(_, t[3].p2AktuellesAlter), e(d, y), e(d, K), e(K, A), e(K, k), e(K, V), S(V, t[3].p2RenteMonatlich), e(d, M), e(d, z), e(z, N), e(z, H), e(z, w), S(w, t[3].p2StartInJahren), e(d, L), e(d, E), e(E, I), e(E, O), e(E, R), S(R, t[3].p2Steuerquote), x || (ne = [
          F(_, "input", t[36]),
          F(V, "input", t[37]),
          F(w, "input", t[38]),
          F(R, "input", t[39])
        ], x = true);
      },
      p(q, G) {
        G[0] & 8 && T(_.value) !== q[3].p2AktuellesAlter && S(_, q[3].p2AktuellesAlter), G[0] & 8 && T(V.value) !== q[3].p2RenteMonatlich && S(V, q[3].p2RenteMonatlich), G[0] & 8 && T(w.value) !== q[3].p2StartInJahren && S(w, q[3].p2StartInJahren), G[0] & 8 && T(R.value) !== q[3].p2Steuerquote && S(R, q[3].p2Steuerquote);
      },
      d(q) {
        q && (u(i), u(o), u(d)), x = false, nn(ne);
      }
    };
  }
  function is(t) {
    let i, s, o, d, m, g, r, c, _, y, K, A, B, k, V, M, z, N, U, H;
    function w() {
      t[49].call(c, t[52]);
    }
    function L() {
      t[50].call(A, t[52]);
    }
    function E() {
      t[51].call(M, t[52]);
    }
    return {
      c() {
        i = a("div"), s = a("div"), o = a("strong"), d = Z("Pflegegrad "), m = Z(t[52]), g = p(), r = a("div"), c = a("input"), y = p(), K = a("div"), A = a("input"), k = p(), V = a("div"), M = a("input"), N = p(), this.h();
      },
      l(I) {
        i = n(I, "DIV", {
          class: true
        });
        var D = v(i);
        s = n(D, "DIV", {
          class: true
        });
        var O = v(s);
        o = n(O, "STRONG", {});
        var R = v(o);
        d = j(R, "Pflegegrad "), m = j(R, t[52]), R.forEach(u), O.forEach(u), g = f(D), r = n(D, "DIV", {
          class: true,
          style: true
        });
        var x = v(r);
        c = n(x, "INPUT", {
          type: true
        }), x.forEach(u), y = f(D), K = n(D, "DIV", {
          class: true,
          style: true
        });
        var ne = v(K);
        A = n(ne, "INPUT", {
          type: true
        }), ne.forEach(u), k = f(D), V = n(D, "DIV", {
          class: true,
          style: true
        });
        var q = v(V);
        M = n(q, "INPUT", {
          type: true,
          step: true
        }), q.forEach(u), N = f(D), D.forEach(u), this.h();
      },
      h() {
        l(s, "class", "care-grade-label"), l(c, "type", "number"), c.disabled = _ = !t[3].pflegefallLogikAktiv, l(r, "class", "form-group"), b(r, "margin", "0"), l(A, "type", "number"), A.disabled = B = !t[3].pflegefallLogikAktiv, l(K, "class", "form-group"), b(K, "margin", "0"), l(M, "type", "number"), l(M, "step", "0.1"), M.disabled = z = !t[3].pflegefallLogikAktiv, l(V, "class", "form-group"), b(V, "margin", "0"), l(i, "class", "care-grade-row");
      },
      m(I, D) {
        fe(I, i, D), e(i, s), e(s, o), e(o, d), e(o, m), e(i, g), e(i, r), e(r, c), S(c, t[3][`pflegeStufe${t[52]}Zusatz`]), e(i, y), e(i, K), e(K, A), S(A, t[3][`pflegeStufe${t[52]}FlexCut`]), e(i, k), e(i, V), e(V, M), S(M, t[3][`pflegeStufe${t[52]}Mortality`]), e(i, N), U || (H = [
          F(c, "input", w),
          F(A, "input", L),
          F(M, "input", E)
        ], U = true);
      },
      p(I, D) {
        t = I, D[0] & 8 && _ !== (_ = !t[3].pflegefallLogikAktiv) && (c.disabled = _), D[0] & 8 && T(c.value) !== t[3][`pflegeStufe${t[52]}Zusatz`] && S(c, t[3][`pflegeStufe${t[52]}Zusatz`]), D[0] & 8 && B !== (B = !t[3].pflegefallLogikAktiv) && (A.disabled = B), D[0] & 8 && T(A.value) !== t[3][`pflegeStufe${t[52]}FlexCut`] && S(A, t[3][`pflegeStufe${t[52]}FlexCut`]), D[0] & 8 && z !== (z = !t[3].pflegefallLogikAktiv) && (M.disabled = z), D[0] & 8 && T(M.value) !== t[3][`pflegeStufe${t[52]}Mortality`] && S(M, t[3][`pflegeStufe${t[52]}Mortality`]);
      },
      d(I) {
        I && u(i), U = false, nn(H);
      }
    };
  }
  function Ts(t) {
    let i, s, o, d = '<span class="legend-text"><span class="section-icon">\u{1F4B0}</span>Startportfolio &amp; Bedarf</span> <span class="progress-indicator"></span>', m, g, r, c, _, y = "Gesamtverm\xF6gen (\u20AC)", K, A, B, k, V, M = "Depotwert Alt (\u20AC)", z, N, U, H, w, L = "Ziel-Liquidit\xE4t (\u20AC)", E, I, D, O, R, x = "Floor-Bedarf p.a. (\u20AC)", ne, q, G, Q, ee, me = "Flex-Bedarf p.a. (\u20AC)", ge, X, _e, be, pe, Ee = "CAPE (Shiller)", oe, W, Le, re, ae, ke = "Einstand Alt (\u20AC)", Pe, ie, Re, Ce, ye, Ft = "Einstand Neu (\u20AC)", ft, $, Y, te, ze, De = "Finale Start-Allokation", qt, ve, ce, pt = t[5] > 0 ? (t[5] / t[2] * 100).toFixed(0) + "%" : "", vt, vl, he, ct = t[0] > 0 ? (t[0] / t[2] * 100).toFixed(1) + "%" : "", ht, cl, Te, rn = t[1] > 0 ? (t[1] / t[2] * 100).toFixed(1) + "%" : "", pn, La, Fe, Ut, Ot, Xi = "Depot (Aktien)", Da, Yl, sn = t[7](t[5]) + "", vn, Pa, gt, Jt, er = "Depot (Gold)", ya, $l, on = t[7](t[0]) + "", cn, Ta, _t, Ht, tr = "Liquidit\xE4t", Ma, Ql, un = t[7](t[1]) + "", hn, gn, Na, Qe, hl, lr = '<span class="legend-text"><span class="section-icon">\u{1F947}</span>Gold-Strategie</span> <span class="progress-indicator"></span>', Va, Xe, gl, mt, bt, Ba, Ra, Me, Gt, _l, nr = "Ziel-Allokation (%)", za, Ne, _n, Fa, jt, ml, ar = "Gold-Floor (%)", qa, Ve, mn, Ua, Zt, bl, ir = "Rebalancing-Band (\xB1 %)", Oa, qe, bn, Ja, El, Et, je, En, Ha, kn, Ga, et, kl, rr = '<span class="legend-text"><span class="section-icon">\u2696\uFE0F</span>Runway &amp; Rebalancing</span> <span class="progress-indicator"></span>', ja, Kt, Ie, xt, Cl, sr = "Ziel-Aktienquote (%)", Za, Ze, Ka, Wt, Il, or = "Rebalancing-Band (\xB1 %)", xa, Ke, Wa, Yt, Al, ur = "Runway Min (Monate)", Ya, tt, $a, $t, Sl, dr = "Runway Target (Monate)", Qa, lt, Xa, Qt, wl, fr = "Max. Skim (Aktien) (%)", ei, nt, ti, Xt, Ll, pr = "Max. Refill (B\xE4r) (%)", li, at, Cn, ni, it, Dl, vr = '<span class="legend-text"><span class="section-icon">\u{1F464}</span>Personen &amp; Rente</span> <span class="progress-indicator"></span>', ai, se, Pl, cr = "Person 1", ii, Ue, el, yl, hr = "Alter", ri, kt, si, tl, Tl, gr = "Rente (mtl.)", oi, Ct, ui, ll, Ml, _r = "Start in ... Jahren", di, It, fi, nl, Nl, mr = "Steuerpflichtig (%)", pi, At, vi, dn, ci, Vl, St, wt, hi, gi, In, fn, _i, Bl, br = "Hinterbliebenenrente", mi, al, il, Rl, Er = "Modus", bi, xe, Lt, kr = "Rente endet", Dt, Cr = "Witwenrente (%)", Ei, rl, zl, Ir = "Witwenrente (%)", ki, We, An, Sn, Ci, rt, Fl, Ar = '<span class="legend-text"><span class="section-icon">\u{1F4C8}</span>Ansparphase</span> <span class="progress-indicator"></span>', Ii, st, ql, Pt, yt, Ai, Si, Oe, sl, Ul, Sr = "Dauer (Jahre)", wi, Ye, wn, Li, ol, Ol, wr = "Sparrate (mtl.)", Di, $e, Ln, Pi, ul, Jl, Lr = "Indexierung", yi, Be, Tt, Dr = "Keine", Mt, Pr = "Inflation", Nt, yr = "Lohnentwicklung", Dn, Pn, Ti, ot, Hl, Tr = '<span class="legend-text"><span class="section-icon">\u{1F3E5}</span>Pflegefall-Absicherung</span> <span class="progress-indicator"></span>', Mi, ut, Gl, Vt, Bt, Ni, Vi, jl, dl, Zl, Mr = "<h4>Matrix (Kosten &amp; Mortalit\xE4t)</h4>", Bi, Rt, Kl, Nr = "<div>Stufe</div> <div>Zusatz (\u20AC p.a.)</div> <div>Flex-Cut (%)</div> <div>Mortality</div>", Ri, yn, zi, Vr, Ae = t[3].partnerAktiv && as(t), Fi = Yr([
      1,
      2,
      3,
      4,
      5
    ]), Je = [];
    for (let h = 0; h < 5; h += 1) Je[h] = is(ns(t, Fi, h));
    return {
      c() {
        i = a("div"), s = a("fieldset"), o = a("legend"), o.innerHTML = d, m = p(), g = a("div"), r = a("div"), c = a("div"), _ = a("label"), _.textContent = y, K = p(), A = a("input"), B = p(), k = a("div"), V = a("label"), V.textContent = M, z = p(), N = a("input"), U = p(), H = a("div"), w = a("label"), w.textContent = L, E = p(), I = a("input"), D = p(), O = a("div"), R = a("label"), R.textContent = x, ne = p(), q = a("input"), G = p(), Q = a("div"), ee = a("label"), ee.textContent = me, ge = p(), X = a("input"), _e = p(), be = a("div"), pe = a("label"), pe.textContent = Ee, oe = p(), W = a("input"), Le = p(), re = a("div"), ae = a("label"), ae.textContent = ke, Pe = p(), ie = a("input"), Re = p(), Ce = a("div"), ye = a("label"), ye.textContent = Ft, ft = p(), $ = a("input"), Y = p(), te = a("div"), ze = a("h4"), ze.textContent = De, qt = p(), ve = a("div"), ce = a("div"), vt = Z(pt), vl = p(), he = a("div"), ht = Z(ct), cl = p(), Te = a("div"), pn = Z(rn), La = p(), Fe = a("div"), Ut = a("div"), Ot = a("span"), Ot.textContent = Xi, Da = p(), Yl = a("strong"), vn = Z(sn), Pa = p(), gt = a("div"), Jt = a("span"), Jt.textContent = er, ya = p(), $l = a("strong"), cn = Z(on), Ta = p(), _t = a("div"), Ht = a("span"), Ht.textContent = tr, Ma = p(), Ql = a("strong"), hn = Z(un), Na = p(), Qe = a("fieldset"), hl = a("legend"), hl.innerHTML = lr, Va = p(), Xe = a("div"), gl = a("div"), mt = a("label"), bt = a("input"), Ba = Z(`\r
                    Gold-Allokation aktiv`), Ra = p(), Me = a("div"), Gt = a("div"), _l = a("label"), _l.textContent = nr, za = p(), Ne = a("input"), Fa = p(), jt = a("div"), ml = a("label"), ml.textContent = ar, qa = p(), Ve = a("input"), Ua = p(), Zt = a("div"), bl = a("label"), bl.textContent = ir, Oa = p(), qe = a("input"), Ja = p(), El = a("div"), Et = a("label"), je = a("input"), Ha = Z(`\r
                        Gold steuerfrei (>1J)`), Ga = p(), et = a("fieldset"), kl = a("legend"), kl.innerHTML = rr, ja = p(), Kt = a("div"), Ie = a("div"), xt = a("div"), Cl = a("label"), Cl.textContent = sr, Za = p(), Ze = a("input"), Ka = p(), Wt = a("div"), Il = a("label"), Il.textContent = or, xa = p(), Ke = a("input"), Wa = p(), Yt = a("div"), Al = a("label"), Al.textContent = ur, Ya = p(), tt = a("input"), $a = p(), $t = a("div"), Sl = a("label"), Sl.textContent = dr, Qa = p(), lt = a("input"), Xa = p(), Qt = a("div"), wl = a("label"), wl.textContent = fr, ei = p(), nt = a("input"), ti = p(), Xt = a("div"), Ll = a("label"), Ll.textContent = pr, li = p(), at = a("input"), ni = p(), it = a("fieldset"), Dl = a("legend"), Dl.innerHTML = vr, ai = p(), se = a("div"), Pl = a("h4"), Pl.textContent = cr, ii = p(), Ue = a("div"), el = a("div"), yl = a("label"), yl.textContent = hr, ri = p(), kt = a("input"), si = p(), tl = a("div"), Tl = a("label"), Tl.textContent = gr, oi = p(), Ct = a("input"), ui = p(), ll = a("div"), Ml = a("label"), Ml.textContent = _r, di = p(), It = a("input"), fi = p(), nl = a("div"), Nl = a("label"), Nl.textContent = mr, pi = p(), At = a("input"), vi = p(), dn = a("div"), ci = p(), Vl = a("div"), St = a("label"), wt = a("input"), hi = Z(`\r
                    Partner aktivieren (Person 2)`), gi = p(), Ae && Ae.c(), In = p(), fn = a("div"), _i = p(), Bl = a("h4"), Bl.textContent = br, mi = p(), al = a("div"), il = a("div"), Rl = a("label"), Rl.textContent = Er, bi = p(), xe = a("select"), Lt = a("option"), Lt.textContent = kr, Dt = a("option"), Dt.textContent = Cr, Ei = p(), rl = a("div"), zl = a("label"), zl.textContent = Ir, ki = p(), We = a("input"), Ci = p(), rt = a("fieldset"), Fl = a("legend"), Fl.innerHTML = Ar, Ii = p(), st = a("div"), ql = a("div"), Pt = a("label"), yt = a("input"), Ai = Z(`\r
                    Ansparphase aktivieren`), Si = p(), Oe = a("div"), sl = a("div"), Ul = a("label"), Ul.textContent = Sr, wi = p(), Ye = a("input"), Li = p(), ol = a("div"), Ol = a("label"), Ol.textContent = wr, Di = p(), $e = a("input"), Pi = p(), ul = a("div"), Jl = a("label"), Jl.textContent = Lr, yi = p(), Be = a("select"), Tt = a("option"), Tt.textContent = Dr, Mt = a("option"), Mt.textContent = Pr, Nt = a("option"), Nt.textContent = yr, Ti = p(), ot = a("fieldset"), Hl = a("legend"), Hl.innerHTML = Tr, Mi = p(), ut = a("div"), Gl = a("div"), Vt = a("label"), Bt = a("input"), Ni = Z(`\r
                    Pflege-Logik aktivieren`), Vi = p(), jl = a("div"), dl = a("div"), Zl = a("div"), Zl.innerHTML = Mr, Bi = p(), Rt = a("div"), Kl = a("div"), Kl.innerHTML = Nr, Ri = p();
        for (let h = 0; h < 5; h += 1) Je[h].c();
        this.h();
      },
      l(h) {
        i = n(h, "DIV", {
          class: true
        });
        var C = v(i);
        s = n(C, "FIELDSET", {
          class: true
        });
        var ue = v(s);
        o = n(ue, "LEGEND", {
          "data-svelte-h": true
        }), P(o) !== "svelte-1vrr6bu" && (o.innerHTML = d), m = f(ue), g = n(ue, "DIV", {
          class: true
        });
        var xl = v(g);
        r = n(xl, "DIV", {
          class: true
        });
        var Se = v(r);
        c = n(Se, "DIV", {
          class: true
        });
        var Tn = v(c);
        _ = n(Tn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(_) !== "svelte-e707js" && (_.textContent = y), K = f(Tn), A = n(Tn, "INPUT", {
          type: true,
          id: true,
          min: true,
          step: true
        }), Tn.forEach(u), B = f(Se), k = n(Se, "DIV", {
          class: true
        });
        var Mn = v(k);
        V = n(Mn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(V) !== "svelte-2pd4ml" && (V.textContent = M), z = f(Mn), N = n(Mn, "INPUT", {
          type: true,
          id: true,
          min: true,
          step: true
        }), Mn.forEach(u), U = f(Se), H = n(Se, "DIV", {
          class: true
        });
        var Nn = v(H);
        w = n(Nn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(w) !== "svelte-hlxwto" && (w.textContent = L), E = f(Nn), I = n(Nn, "INPUT", {
          type: true,
          id: true,
          min: true,
          step: true
        }), Nn.forEach(u), D = f(Se), O = n(Se, "DIV", {
          class: true
        });
        var Vn = v(O);
        R = n(Vn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(R) !== "svelte-1p7zux" && (R.textContent = x), ne = f(Vn), q = n(Vn, "INPUT", {
          type: true,
          id: true,
          min: true,
          step: true
        }), Vn.forEach(u), G = f(Se), Q = n(Se, "DIV", {
          class: true
        });
        var Bn = v(Q);
        ee = n(Bn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(ee) !== "svelte-1hhuck5" && (ee.textContent = me), ge = f(Bn), X = n(Bn, "INPUT", {
          type: true,
          id: true,
          min: true,
          step: true
        }), Bn.forEach(u), _e = f(Se), be = n(Se, "DIV", {
          class: true
        });
        var Rn = v(be);
        pe = n(Rn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(pe) !== "svelte-1ajp59i" && (pe.textContent = Ee), oe = f(Rn), W = n(Rn, "INPUT", {
          type: true,
          id: true,
          min: true,
          step: true
        }), Rn.forEach(u), Le = f(Se), re = n(Se, "DIV", {
          class: true
        });
        var zn = v(re);
        ae = n(zn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(ae) !== "svelte-10d9j4v" && (ae.textContent = ke), Pe = f(zn), ie = n(zn, "INPUT", {
          type: true,
          id: true,
          min: true,
          step: true
        }), zn.forEach(u), Re = f(Se), Ce = n(Se, "DIV", {
          class: true
        });
        var Fn = v(Ce);
        ye = n(Fn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(ye) !== "svelte-1n8uxr" && (ye.textContent = Ft), ft = f(Fn), $ = n(Fn, "INPUT", {
          type: true,
          id: true,
          min: true,
          step: true
        }), Fn.forEach(u), Se.forEach(u), Y = f(xl), te = n(xl, "DIV", {
          style: true
        });
        var Xl = v(te);
        ze = n(Xl, "H4", {
          style: true,
          "data-svelte-h": true
        }), P(ze) !== "svelte-k9a9om" && (ze.textContent = De), qt = f(Xl), ve = n(Xl, "DIV", {
          style: true
        });
        var en = v(ve);
        ce = n(en, "DIV", {
          style: true
        });
        var Br = v(ce);
        vt = j(Br, pt), Br.forEach(u), vl = f(en), he = n(en, "DIV", {
          style: true
        });
        var Rr = v(he);
        ht = j(Rr, ct), Rr.forEach(u), cl = f(en), Te = n(en, "DIV", {
          style: true
        });
        var zr = v(Te);
        pn = j(zr, rn), zr.forEach(u), en.forEach(u), La = f(Xl), Fe = n(Xl, "DIV", {
          style: true
        });
        var tn = v(Fe);
        Ut = n(tn, "DIV", {
          style: true
        });
        var qn = v(Ut);
        Ot = n(qn, "SPAN", {
          style: true,
          "data-svelte-h": true
        }), P(Ot) !== "svelte-18waqjz" && (Ot.textContent = Xi), Da = f(qn), Yl = n(qn, "STRONG", {
          style: true
        });
        var Fr = v(Yl);
        vn = j(Fr, sn), Fr.forEach(u), qn.forEach(u), Pa = f(tn), gt = n(tn, "DIV", {
          style: true
        });
        var Un = v(gt);
        Jt = n(Un, "SPAN", {
          style: true,
          "data-svelte-h": true
        }), P(Jt) !== "svelte-1gdr3l9" && (Jt.textContent = er), ya = f(Un), $l = n(Un, "STRONG", {
          style: true
        });
        var qr = v($l);
        cn = j(qr, on), qr.forEach(u), Un.forEach(u), Ta = f(tn), _t = n(tn, "DIV", {
          style: true
        });
        var On = v(_t);
        Ht = n(On, "SPAN", {
          style: true,
          "data-svelte-h": true
        }), P(Ht) !== "svelte-1tzw93b" && (Ht.textContent = tr), Ma = f(On), Ql = n(On, "STRONG", {
          style: true
        });
        var Ur = v(Ql);
        hn = j(Ur, un), Ur.forEach(u), On.forEach(u), tn.forEach(u), Xl.forEach(u), xl.forEach(u), ue.forEach(u), Na = f(C), Qe = n(C, "FIELDSET", {
          class: true
        });
        var Jn = v(Qe);
        hl = n(Jn, "LEGEND", {
          "data-svelte-h": true
        }), P(hl) !== "svelte-11hpdj2" && (hl.innerHTML = lr), Va = f(Jn), Xe = n(Jn, "DIV", {
          class: true
        });
        var Hn = v(Xe);
        gl = n(Hn, "DIV", {
          class: true,
          style: true
        });
        var Or = v(gl);
        mt = n(Or, "LABEL", {
          style: true
        });
        var qi = v(mt);
        bt = n(qi, "INPUT", {
          type: true,
          style: true
        }), Ba = j(qi, `\r
                    Gold-Allokation aktiv`), qi.forEach(u), Or.forEach(u), Ra = f(Hn), Me = n(Hn, "DIV", {
          class: true
        });
        var fl = v(Me);
        Gt = n(fl, "DIV", {
          class: true
        });
        var Gn = v(Gt);
        _l = n(Gn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(_l) !== "svelte-wrb0ht" && (_l.textContent = nr), za = f(Gn), Ne = n(Gn, "INPUT", {
          type: true,
          id: true,
          min: true,
          max: true,
          stepping: true
        }), Gn.forEach(u), Fa = f(fl), jt = n(fl, "DIV", {
          class: true
        });
        var jn = v(jt);
        ml = n(jn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(ml) !== "svelte-1edqppf" && (ml.textContent = ar), qa = f(jn), Ve = n(jn, "INPUT", {
          type: true,
          id: true,
          min: true,
          max: true,
          stepping: true
        }), jn.forEach(u), Ua = f(fl), Zt = n(fl, "DIV", {
          class: true
        });
        var Zn = v(Zt);
        bl = n(Zn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(bl) !== "svelte-4nku2p" && (bl.textContent = ir), Oa = f(Zn), qe = n(Zn, "INPUT", {
          type: true,
          id: true,
          min: true,
          max: true
        }), Zn.forEach(u), Ja = f(fl), El = n(fl, "DIV", {
          class: true,
          style: true
        });
        var Jr = v(El);
        Et = n(Jr, "LABEL", {
          style: true
        });
        var Ui = v(Et);
        je = n(Ui, "INPUT", {
          type: true,
          style: true
        }), Ha = j(Ui, `\r
                        Gold steuerfrei (>1J)`), Ui.forEach(u), Jr.forEach(u), fl.forEach(u), Hn.forEach(u), Jn.forEach(u), Ga = f(C), et = n(C, "FIELDSET", {
          class: true
        });
        var Kn = v(et);
        kl = n(Kn, "LEGEND", {
          "data-svelte-h": true
        }), P(kl) !== "svelte-4dgaid" && (kl.innerHTML = rr), ja = f(Kn), Kt = n(Kn, "DIV", {
          class: true
        });
        var Hr = v(Kt);
        Ie = n(Hr, "DIV", {
          class: true
        });
        var He = v(Ie);
        xt = n(He, "DIV", {
          class: true
        });
        var xn = v(xt);
        Cl = n(xn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Cl) !== "svelte-otufvy" && (Cl.textContent = sr), Za = f(xn), Ze = n(xn, "INPUT", {
          type: true,
          id: true,
          min: true,
          max: true
        }), xn.forEach(u), Ka = f(He), Wt = n(He, "DIV", {
          class: true
        });
        var Wn = v(Wt);
        Il = n(Wn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Il) !== "svelte-rfv7o2" && (Il.textContent = or), xa = f(Wn), Ke = n(Wn, "INPUT", {
          type: true,
          id: true,
          min: true,
          max: true
        }), Wn.forEach(u), Wa = f(He), Yt = n(He, "DIV", {
          class: true
        });
        var Yn = v(Yt);
        Al = n(Yn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Al) !== "svelte-oc10er" && (Al.textContent = ur), Ya = f(Yn), tt = n(Yn, "INPUT", {
          type: true,
          id: true,
          min: true
        }), Yn.forEach(u), $a = f(He), $t = n(He, "DIV", {
          class: true
        });
        var $n = v($t);
        Sl = n($n, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Sl) !== "svelte-qkvwr1" && (Sl.textContent = dr), Qa = f($n), lt = n($n, "INPUT", {
          type: true,
          id: true,
          min: true
        }), $n.forEach(u), Xa = f(He), Qt = n(He, "DIV", {
          class: true
        });
        var Qn = v(Qt);
        wl = n(Qn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(wl) !== "svelte-847gg7" && (wl.textContent = fr), ei = f(Qn), nt = n(Qn, "INPUT", {
          type: true,
          id: true,
          min: true
        }), Qn.forEach(u), ti = f(He), Xt = n(He, "DIV", {
          class: true
        });
        var Xn = v(Xt);
        Ll = n(Xn, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Ll) !== "svelte-2msul3" && (Ll.textContent = pr), li = f(Xn), at = n(Xn, "INPUT", {
          type: true,
          id: true,
          min: true
        }), Xn.forEach(u), He.forEach(u), Hr.forEach(u), Kn.forEach(u), ni = f(C), it = n(C, "FIELDSET", {
          class: true
        });
        var ea = v(it);
        Dl = n(ea, "LEGEND", {
          "data-svelte-h": true
        }), P(Dl) !== "svelte-1r2ved" && (Dl.innerHTML = vr), ai = f(ea), se = n(ea, "DIV", {
          class: true
        });
        var we = v(se);
        Pl = n(we, "H4", {
          style: true,
          "data-svelte-h": true
        }), P(Pl) !== "svelte-1swpuju" && (Pl.textContent = cr), ii = f(we), Ue = n(we, "DIV", {
          class: true
        });
        var pl = v(Ue);
        el = n(pl, "DIV", {
          class: true
        });
        var ta = v(el);
        yl = n(ta, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(yl) !== "svelte-er9ww5" && (yl.textContent = hr), ri = f(ta), kt = n(ta, "INPUT", {
          type: true,
          id: true
        }), ta.forEach(u), si = f(pl), tl = n(pl, "DIV", {
          class: true
        });
        var la = v(tl);
        Tl = n(la, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Tl) !== "svelte-a35y2r" && (Tl.textContent = gr), oi = f(la), Ct = n(la, "INPUT", {
          type: true,
          id: true
        }), la.forEach(u), ui = f(pl), ll = n(pl, "DIV", {
          class: true
        });
        var na = v(ll);
        Ml = n(na, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Ml) !== "svelte-qwo8me" && (Ml.textContent = _r), di = f(na), It = n(na, "INPUT", {
          type: true,
          id: true
        }), na.forEach(u), fi = f(pl), nl = n(pl, "DIV", {
          class: true
        });
        var aa = v(nl);
        Nl = n(aa, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Nl) !== "svelte-1s21h15" && (Nl.textContent = mr), pi = f(aa), At = n(aa, "INPUT", {
          type: true,
          id: true
        }), aa.forEach(u), pl.forEach(u), vi = f(we), dn = n(we, "DIV", {
          class: true
        }), v(dn).forEach(u), ci = f(we), Vl = n(we, "DIV", {
          class: true,
          style: true
        });
        var Gr = v(Vl);
        St = n(Gr, "LABEL", {
          style: true
        });
        var Oi = v(St);
        wt = n(Oi, "INPUT", {
          type: true,
          style: true
        }), hi = j(Oi, `\r
                    Partner aktivieren (Person 2)`), Oi.forEach(u), Gr.forEach(u), gi = f(we), Ae && Ae.l(we), In = f(we), fn = n(we, "DIV", {
          class: true
        }), v(fn).forEach(u), _i = f(we), Bl = n(we, "H4", {
          style: true,
          "data-svelte-h": true
        }), P(Bl) !== "svelte-1553w6a" && (Bl.textContent = br), mi = f(we), al = n(we, "DIV", {
          class: true
        });
        var ia = v(al);
        il = n(ia, "DIV", {
          class: true
        });
        var ra = v(il);
        Rl = n(ra, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Rl) !== "svelte-aiz631" && (Rl.textContent = Er), bi = f(ra), xe = n(ra, "SELECT", {
          id: true
        });
        var Ji = v(xe);
        Lt = n(Ji, "OPTION", {
          "data-svelte-h": true
        }), P(Lt) !== "svelte-1je5mlm" && (Lt.textContent = kr), Dt = n(Ji, "OPTION", {
          "data-svelte-h": true
        }), P(Dt) !== "svelte-1sm661h" && (Dt.textContent = Cr), Ji.forEach(u), ra.forEach(u), Ei = f(ia), rl = n(ia, "DIV", {
          class: true
        });
        var sa = v(rl);
        zl = n(sa, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(zl) !== "svelte-16y4y2d" && (zl.textContent = Ir), ki = f(sa), We = n(sa, "INPUT", {
          type: true,
          id: true
        }), sa.forEach(u), ia.forEach(u), we.forEach(u), ea.forEach(u), Ci = f(C), rt = n(C, "FIELDSET", {
          class: true
        });
        var oa = v(rt);
        Fl = n(oa, "LEGEND", {
          "data-svelte-h": true
        }), P(Fl) !== "svelte-1o0lfgm" && (Fl.innerHTML = Ar), Ii = f(oa), st = n(oa, "DIV", {
          class: true
        });
        var ua = v(st);
        ql = n(ua, "DIV", {
          class: true,
          style: true
        });
        var jr = v(ql);
        Pt = n(jr, "LABEL", {
          style: true
        });
        var Hi = v(Pt);
        yt = n(Hi, "INPUT", {
          type: true,
          style: true
        }), Ai = j(Hi, `\r
                    Ansparphase aktivieren`), Hi.forEach(u), jr.forEach(u), Si = f(ua), Oe = n(ua, "DIV", {
          class: true
        });
        var ln = v(Oe);
        sl = n(ln, "DIV", {
          class: true
        });
        var da = v(sl);
        Ul = n(da, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Ul) !== "svelte-132tzqq" && (Ul.textContent = Sr), wi = f(da), Ye = n(da, "INPUT", {
          type: true,
          id: true
        }), da.forEach(u), Li = f(ln), ol = n(ln, "DIV", {
          class: true
        });
        var fa = v(ol);
        Ol = n(fa, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Ol) !== "svelte-5ij6xf" && (Ol.textContent = wr), Di = f(fa), $e = n(fa, "INPUT", {
          type: true,
          id: true
        }), fa.forEach(u), Pi = f(ln), ul = n(ln, "DIV", {
          class: true
        });
        var pa = v(ul);
        Jl = n(pa, "LABEL", {
          for: true,
          "data-svelte-h": true
        }), P(Jl) !== "svelte-ommszh" && (Jl.textContent = Lr), yi = f(pa), Be = n(pa, "SELECT", {
          id: true
        });
        var va = v(Be);
        Tt = n(va, "OPTION", {
          "data-svelte-h": true
        }), P(Tt) !== "svelte-nzi9bk" && (Tt.textContent = Dr), Mt = n(va, "OPTION", {
          "data-svelte-h": true
        }), P(Mt) !== "svelte-1fyoooe" && (Mt.textContent = Pr), Nt = n(va, "OPTION", {
          "data-svelte-h": true
        }), P(Nt) !== "svelte-7tpt12" && (Nt.textContent = yr), va.forEach(u), pa.forEach(u), ln.forEach(u), ua.forEach(u), oa.forEach(u), Ti = f(C), ot = n(C, "FIELDSET", {
          class: true
        });
        var ca = v(ot);
        Hl = n(ca, "LEGEND", {
          "data-svelte-h": true
        }), P(Hl) !== "svelte-rfj5ze" && (Hl.innerHTML = Tr), Mi = f(ca), ut = n(ca, "DIV", {
          class: true
        });
        var ha = v(ut);
        Gl = n(ha, "DIV", {
          class: true,
          style: true
        });
        var Zr = v(Gl);
        Vt = n(Zr, "LABEL", {
          style: true
        });
        var Gi = v(Vt);
        Bt = n(Gi, "INPUT", {
          type: true,
          style: true
        }), Ni = j(Gi, `\r
                    Pflege-Logik aktivieren`), Gi.forEach(u), Zr.forEach(u), Vi = f(ha), jl = n(ha, "DIV", {});
        var Kr = v(jl);
        dl = n(Kr, "DIV", {
          class: true
        });
        var ga = v(dl);
        Zl = n(ga, "DIV", {
          class: true,
          "data-svelte-h": true
        }), P(Zl) !== "svelte-1ybiu27" && (Zl.innerHTML = Mr), Bi = f(ga), Rt = n(ga, "DIV", {
          class: true
        });
        var _a = v(Rt);
        Kl = n(_a, "DIV", {
          class: true,
          "data-svelte-h": true
        }), P(Kl) !== "svelte-ruxvd1" && (Kl.innerHTML = Nr), Ri = f(_a);
        for (let ji = 0; ji < 5; ji += 1) Je[ji].l(_a);
        _a.forEach(u), ga.forEach(u), Kr.forEach(u), ha.forEach(u), ca.forEach(u), C.forEach(u), this.h();
      },
      h() {
        l(_, "for", "startKapital"), l(A, "type", "number"), l(A, "id", "startKapital"), l(A, "min", "0"), l(A, "step", "1000"), l(c, "class", "form-group"), l(V, "for", "depotwertAlt"), l(N, "type", "number"), l(N, "id", "depotwertAlt"), l(N, "min", "0"), l(N, "step", "1000"), l(k, "class", "form-group"), l(w, "for", "zielLiquiditaet"), l(I, "type", "number"), l(I, "id", "zielLiquiditaet"), l(I, "min", "0"), l(I, "step", "1000"), l(H, "class", "form-group"), l(R, "for", "floorBedarf"), l(q, "type", "number"), l(q, "id", "floorBedarf"), l(q, "min", "0"), l(q, "step", "500"), l(O, "class", "form-group"), l(ee, "for", "flexBedarf"), l(X, "type", "number"), l(X, "id", "flexBedarf"), l(X, "min", "0"), l(X, "step", "500"), l(Q, "class", "form-group"), l(pe, "for", "marketCape"), l(W, "type", "number"), l(W, "id", "marketCape"), l(W, "min", "0"), l(W, "step", "0.1"), l(be, "class", "form-group"), l(ae, "for", "einstandAlt"), l(ie, "type", "number"), l(ie, "id", "einstandAlt"), l(ie, "min", "0"), l(ie, "step", "1000"), l(re, "class", "form-group"), l(ye, "for", "einstandNeu"), l($, "type", "number"), l($, "id", "einstandNeu"), l($, "min", "0"), l($, "step", "1000"), l(Ce, "class", "form-group"), l(r, "class", "form-grid-three-col"), b(ze, "text-align", "center"), b(ze, "margin-bottom", "15px"), b(ce, "background-color", "#dbeafe"), b(ce, "width", t[5] / t[2] * 100 + "%"), b(ce, "display", "flex"), b(ce, "align-items", "center"), b(ce, "justify-content", "center"), b(ce, "font-size", "0.8rem"), b(ce, "color", "#1e40af"), b(ce, "font-weight", "bold"), b(he, "background-color", "#fef9c3"), b(he, "width", t[0] / t[2] * 100 + "%"), b(he, "display", "flex"), b(he, "align-items", "center"), b(he, "justify-content", "center"), b(he, "font-size", "0.8rem"), b(he, "color", "#854d0e"), b(he, "font-weight", "bold"), b(Te, "background-color", "#dcfce7"), b(Te, "width", t[1] / t[2] * 100 + "%"), b(Te, "display", "flex"), b(Te, "align-items", "center"), b(Te, "justify-content", "center"), b(Te, "font-size", "0.8rem"), b(Te, "color", "#166534"), b(Te, "font-weight", "bold"), b(ve, "display", "flex"), b(ve, "height", "30px"), b(ve, "width", "100%"), b(ve, "border-radius", "6px"), b(ve, "overflow", "hidden"), b(ve, "margin-bottom", "8px"), b(Ot, "display", "block"), b(Ot, "font-weight", "500"), b(Yl, "color", "#1e40af"), b(Ut, "width", "33%"), b(Jt, "display", "block"), b(Jt, "font-weight", "500"), b($l, "color", "#854d0e"), b(gt, "width", "33%"), b(gt, "text-align", "center"), b(Ht, "display", "block"), b(Ht, "font-weight", "500"), b(Ql, "color", "#166534"), b(_t, "width", "33%"), b(_t, "text-align", "right"), b(Fe, "display", "flex"), b(Fe, "justify-content", "space-between"), b(Fe, "font-size", "0.9rem"), b(Fe, "color", "var(--text-light)"), b(te, "margin-top", "25px"), b(te, "padding-top", "15px"), b(te, "border-top", "1px solid var(--border-color)"), l(g, "class", "fieldset-content"), g.hidden = gn = t[4].rahmendaten, l(s, "class", "collapsible"), le(s, "collapsed", t[4].rahmendaten), l(bt, "type", "checkbox"), b(bt, "width", "auto"), b(bt, "margin-right", "8px"), b(mt, "flex-direction", "row"), b(mt, "align-items", "center"), b(mt, "cursor", "pointer"), l(gl, "class", "form-group"), b(gl, "margin-bottom", "15px"), l(_l, "for", "goldAllo"), l(Ne, "type", "number"), l(Ne, "id", "goldAllo"), l(Ne, "min", "0"), l(Ne, "max", "100"), l(Ne, "stepping", "0.5"), Ne.disabled = _n = !t[3].goldAktiv, l(Gt, "class", "form-group"), l(ml, "for", "goldFloor"), l(Ve, "type", "number"), l(Ve, "id", "goldFloor"), l(Ve, "min", "0"), l(Ve, "max", "100"), l(Ve, "stepping", "0.5"), Ve.disabled = mn = !t[3].goldAktiv, l(jt, "class", "form-group"), l(bl, "for", "goldRebal"), l(qe, "type", "number"), l(qe, "id", "goldRebal"), l(qe, "min", "0"), l(qe, "max", "100"), qe.disabled = bn = !t[3].goldAktiv, l(Zt, "class", "form-group"), l(je, "type", "checkbox"), b(je, "width", "auto"), b(je, "margin-right", "8px"), je.disabled = En = !t[3].goldAktiv, b(Et, "flex-direction", "row"), b(Et, "align-items", "center"), b(Et, "cursor", "pointer"), l(El, "class", "form-group"), b(El, "align-self", "flex-end"), l(Me, "class", "form-grid-three-col"), le(Me, "disabled", !t[3].goldAktiv), l(Xe, "class", "fieldset-content"), Xe.hidden = kn = t[4].gold, l(Qe, "class", "collapsible"), le(Qe, "collapsed", t[4].gold), l(Cl, "for", "targetEq"), l(Ze, "type", "number"), l(Ze, "id", "targetEq"), l(Ze, "min", "0"), l(Ze, "max", "100"), l(xt, "class", "form-group"), l(Il, "for", "rebalBand"), l(Ke, "type", "number"), l(Ke, "id", "rebalBand"), l(Ke, "min", "0"), l(Ke, "max", "100"), l(Wt, "class", "form-group"), l(Al, "for", "runwayMin"), l(tt, "type", "number"), l(tt, "id", "runwayMin"), l(tt, "min", "0"), l(Yt, "class", "form-group"), l(Sl, "for", "runwayTarget"), l(lt, "type", "number"), l(lt, "id", "runwayTarget"), l(lt, "min", "0"), l($t, "class", "form-group"), l(wl, "for", "maxSkim"), l(nt, "type", "number"), l(nt, "id", "maxSkim"), l(nt, "min", "0"), l(Qt, "class", "form-group"), l(Ll, "for", "maxBear"), l(at, "type", "number"), l(at, "id", "maxBear"), l(at, "min", "0"), l(Xt, "class", "form-group"), l(Ie, "class", "form-grid-three-col"), l(Kt, "class", "fieldset-content"), Kt.hidden = Cn = t[4].runway, l(et, "class", "collapsible"), le(et, "collapsed", t[4].runway), b(Pl, "margin-bottom", "10px"), l(yl, "for", "p1Alter"), l(kt, "type", "number"), l(kt, "id", "p1Alter"), l(el, "class", "form-group"), l(Tl, "for", "p1Rente"), l(Ct, "type", "number"), l(Ct, "id", "p1Rente"), l(tl, "class", "form-group"), l(Ml, "for", "p1Start"), l(It, "type", "number"), l(It, "id", "p1Start"), l(ll, "class", "form-group"), l(Nl, "for", "p1Steuer"), l(At, "type", "number"), l(At, "id", "p1Steuer"), l(nl, "class", "form-group"), l(Ue, "class", "form-grid-four-col"), l(dn, "class", "section-divider"), l(wt, "type", "checkbox"), b(wt, "width", "auto"), b(wt, "margin-right", "8px"), b(St, "flex-direction", "row"), b(St, "align-items", "center"), b(St, "cursor", "pointer"), l(Vl, "class", "form-group"), b(Vl, "margin-bottom", "15px"), l(fn, "class", "section-divider"), b(Bl, "margin-bottom", "10px"), l(Rl, "for", "widowMode"), Lt.__value = "stop", S(Lt, Lt.__value), Dt.__value = "percent", S(Dt, Dt.__value), l(xe, "id", "widowMode"), t[3].widowPensionMode === void 0 && xr(() => t[40].call(xe)), l(il, "class", "form-group"), l(zl, "for", "widowPct"), l(We, "type", "number"), l(We, "id", "widowPct"), We.disabled = An = t[3].widowPensionMode !== "percent", l(rl, "class", "form-group"), l(al, "class", "form-grid-four-col"), l(se, "class", "fieldset-content"), se.hidden = Sn = t[4].personen, l(it, "class", "collapsible"), le(it, "collapsed", t[4].personen), l(yt, "type", "checkbox"), b(yt, "width", "auto"), b(yt, "margin-right", "8px"), b(Pt, "flex-direction", "row"), b(Pt, "align-items", "center"), b(Pt, "cursor", "pointer"), l(ql, "class", "form-group"), b(ql, "margin-bottom", "15px"), l(Ul, "for", "ansparDauer"), l(Ye, "type", "number"), l(Ye, "id", "ansparDauer"), Ye.disabled = wn = !t[3].ansparphaseAktiv, l(sl, "class", "form-group"), l(Ol, "for", "ansparRate"), l($e, "type", "number"), l($e, "id", "ansparRate"), $e.disabled = Ln = !t[3].ansparphaseAktiv, l(ol, "class", "form-group"), l(Jl, "for", "ansparIndex"), Tt.__value = "none", S(Tt, Tt.__value), Mt.__value = "inflation", S(Mt, Mt.__value), Nt.__value = "wage", S(Nt, Nt.__value), l(Be, "id", "ansparIndex"), Be.disabled = Dn = !t[3].ansparphaseAktiv, t[3].sparrateIndexing === void 0 && xr(() => t[46].call(Be)), l(ul, "class", "form-group"), l(Oe, "class", "form-grid-three-col"), le(Oe, "disabled", !t[3].ansparphaseAktiv), l(st, "class", "fieldset-content"), st.hidden = Pn = t[4].anspar, l(rt, "class", "collapsible"), le(rt, "collapsed", t[4].anspar), l(Bt, "type", "checkbox"), b(Bt, "width", "auto"), b(Bt, "margin-right", "8px"), b(Vt, "flex-direction", "row"), b(Vt, "align-items", "center"), b(Vt, "cursor", "pointer"), l(Gl, "class", "form-group"), b(Gl, "margin-bottom", "15px"), l(Zl, "class", "care-section-header"), l(Kl, "class", "care-grade-row care-grade-header"), l(Rt, "class", "care-grade-matrix"), l(dl, "class", "care-section"), le(jl, "disabled", !t[3].pflegefallLogikAktiv), l(ut, "class", "fieldset-content"), ut.hidden = yn = t[4].pflege, l(ot, "class", "collapsible"), le(ot, "collapsed", t[4].pflege), l(i, "class", "panel main-panel svelte-qfyrqt");
      },
      m(h, C) {
        fe(h, i, C), e(i, s), e(s, o), e(s, m), e(s, g), e(g, r), e(r, c), e(c, _), e(c, K), e(c, A), S(A, t[3].startKapital), e(r, B), e(r, k), e(k, V), e(k, z), e(k, N), S(N, t[3].depotwertAlt), e(r, U), e(r, H), e(H, w), e(H, E), e(H, I), S(I, t[3].zielLiquiditaet), e(r, D), e(r, O), e(O, R), e(O, ne), e(O, q), S(q, t[3].floorBedarf), e(r, G), e(r, Q), e(Q, ee), e(Q, ge), e(Q, X), S(X, t[3].flexBedarf), e(r, _e), e(r, be), e(be, pe), e(be, oe), e(be, W), S(W, t[3].capeRatio), e(r, Le), e(r, re), e(re, ae), e(re, Pe), e(re, ie), S(ie, t[3].einstandAlt), e(r, Re), e(r, Ce), e(Ce, ye), e(Ce, ft), e(Ce, $), S($, t[3].einstandNeu), e(g, Y), e(g, te), e(te, ze), e(te, qt), e(te, ve), e(ve, ce), e(ce, vt), e(ve, vl), e(ve, he), e(he, ht), e(ve, cl), e(ve, Te), e(Te, pn), e(te, La), e(te, Fe), e(Fe, Ut), e(Ut, Ot), e(Ut, Da), e(Ut, Yl), e(Yl, vn), e(Fe, Pa), e(Fe, gt), e(gt, Jt), e(gt, ya), e(gt, $l), e($l, cn), e(Fe, Ta), e(Fe, _t), e(_t, Ht), e(_t, Ma), e(_t, Ql), e(Ql, hn), e(i, Na), e(i, Qe), e(Qe, hl), e(Qe, Va), e(Qe, Xe), e(Xe, gl), e(gl, mt), e(mt, bt), bt.checked = t[3].goldAktiv, e(mt, Ba), e(Xe, Ra), e(Xe, Me), e(Me, Gt), e(Gt, _l), e(Gt, za), e(Gt, Ne), S(Ne, t[3].goldZielProzent), e(Me, Fa), e(Me, jt), e(jt, ml), e(jt, qa), e(jt, Ve), S(Ve, t[3].goldFloorProzent), e(Me, Ua), e(Me, Zt), e(Zt, bl), e(Zt, Oa), e(Zt, qe), S(qe, t[3].goldRebalancingBand), e(Me, Ja), e(Me, El), e(El, Et), e(Et, je), je.checked = t[3].goldSteuerfrei, e(Et, Ha), e(i, Ga), e(i, et), e(et, kl), e(et, ja), e(et, Kt), e(Kt, Ie), e(Ie, xt), e(xt, Cl), e(xt, Za), e(xt, Ze), S(Ze, t[3].targetEq), e(Ie, Ka), e(Ie, Wt), e(Wt, Il), e(Wt, xa), e(Wt, Ke), S(Ke, t[3].rebalBand), e(Ie, Wa), e(Ie, Yt), e(Yt, Al), e(Yt, Ya), e(Yt, tt), S(tt, t[3].runwayMinMonths), e(Ie, $a), e(Ie, $t), e($t, Sl), e($t, Qa), e($t, lt), S(lt, t[3].runwayTargetMonths), e(Ie, Xa), e(Ie, Qt), e(Qt, wl), e(Qt, ei), e(Qt, nt), S(nt, t[3].maxSkimPctOfEq), e(Ie, ti), e(Ie, Xt), e(Xt, Ll), e(Xt, li), e(Xt, at), S(at, t[3].maxBearRefillPctOfEq), e(i, ni), e(i, it), e(it, Dl), e(it, ai), e(it, se), e(se, Pl), e(se, ii), e(se, Ue), e(Ue, el), e(el, yl), e(el, ri), e(el, kt), S(kt, t[3].aktuellesAlter), e(Ue, si), e(Ue, tl), e(tl, Tl), e(tl, oi), e(tl, Ct), S(Ct, t[3].renteMonatlich), e(Ue, ui), e(Ue, ll), e(ll, Ml), e(ll, di), e(ll, It), S(It, t[3].p1StartInJahren), e(Ue, fi), e(Ue, nl), e(nl, Nl), e(nl, pi), e(nl, At), S(At, t[3].renteSteuerpflichtigPct), e(se, vi), e(se, dn), e(se, ci), e(se, Vl), e(Vl, St), e(St, wt), wt.checked = t[3].partnerAktiv, e(St, hi), e(se, gi), Ae && Ae.m(se, null), e(se, In), e(se, fn), e(se, _i), e(se, Bl), e(se, mi), e(se, al), e(al, il), e(il, Rl), e(il, bi), e(il, xe), e(xe, Lt), e(xe, Dt), ma(xe, t[3].widowPensionMode, true), e(al, Ei), e(al, rl), e(rl, zl), e(rl, ki), e(rl, We), S(We, t[3].widowPensionPct), e(i, Ci), e(i, rt), e(rt, Fl), e(rt, Ii), e(rt, st), e(st, ql), e(ql, Pt), e(Pt, yt), yt.checked = t[3].ansparphaseAktiv, e(Pt, Ai), e(st, Si), e(st, Oe), e(Oe, sl), e(sl, Ul), e(sl, wi), e(sl, Ye), S(Ye, t[3].ansparphaseDauerJahre), e(Oe, Li), e(Oe, ol), e(ol, Ol), e(ol, Di), e(ol, $e), S($e, t[3].ansparrateMonatlich), e(Oe, Pi), e(Oe, ul), e(ul, Jl), e(ul, yi), e(ul, Be), e(Be, Tt), e(Be, Mt), e(Be, Nt), ma(Be, t[3].sparrateIndexing, true), e(i, Ti), e(i, ot), e(ot, Hl), e(ot, Mi), e(ot, ut), e(ut, Gl), e(Gl, Vt), e(Vt, Bt), Bt.checked = t[3].pflegefallLogikAktiv, e(Vt, Ni), e(ut, Vi), e(ut, jl), e(jl, dl), e(dl, Zl), e(dl, Bi), e(dl, Rt), e(Rt, Kl), e(Rt, Ri);
        for (let ue = 0; ue < 5; ue += 1) Je[ue] && Je[ue].m(Rt, null);
        zi || (Vr = [
          F(o, "click", t[8]),
          F(A, "input", t[9]),
          F(N, "input", t[10]),
          F(I, "input", t[11]),
          F(q, "input", t[12]),
          F(X, "input", t[13]),
          F(W, "input", t[14]),
          F(ie, "input", t[15]),
          F($, "input", t[16]),
          F(hl, "click", t[17]),
          F(bt, "change", t[18]),
          F(Ne, "input", t[19]),
          F(Ve, "input", t[20]),
          F(qe, "input", t[21]),
          F(je, "change", t[22]),
          F(kl, "click", t[23]),
          F(Ze, "input", t[24]),
          F(Ke, "input", t[25]),
          F(tt, "input", t[26]),
          F(lt, "input", t[27]),
          F(nt, "input", t[28]),
          F(at, "input", t[29]),
          F(Dl, "click", t[30]),
          F(kt, "input", t[31]),
          F(Ct, "input", t[32]),
          F(It, "input", t[33]),
          F(At, "input", t[34]),
          F(wt, "change", t[35]),
          F(xe, "change", t[40]),
          F(We, "input", t[41]),
          F(Fl, "click", t[42]),
          F(yt, "change", t[43]),
          F(Ye, "input", t[44]),
          F($e, "input", t[45]),
          F(Be, "change", t[46]),
          F(Hl, "click", t[47]),
          F(Bt, "change", t[48])
        ], zi = true);
      },
      p(h, C) {
        if (C[0] & 8 && T(A.value) !== h[3].startKapital && S(A, h[3].startKapital), C[0] & 8 && T(N.value) !== h[3].depotwertAlt && S(N, h[3].depotwertAlt), C[0] & 8 && T(I.value) !== h[3].zielLiquiditaet && S(I, h[3].zielLiquiditaet), C[0] & 8 && T(q.value) !== h[3].floorBedarf && S(q, h[3].floorBedarf), C[0] & 8 && T(X.value) !== h[3].flexBedarf && S(X, h[3].flexBedarf), C[0] & 8 && T(W.value) !== h[3].capeRatio && S(W, h[3].capeRatio), C[0] & 8 && T(ie.value) !== h[3].einstandAlt && S(ie, h[3].einstandAlt), C[0] & 8 && T($.value) !== h[3].einstandNeu && S($, h[3].einstandNeu), C[0] & 36 && pt !== (pt = h[5] > 0 ? (h[5] / h[2] * 100).toFixed(0) + "%" : "") && de(vt, pt), C[0] & 36 && b(ce, "width", h[5] / h[2] * 100 + "%"), C[0] & 5 && ct !== (ct = h[0] > 0 ? (h[0] / h[2] * 100).toFixed(1) + "%" : "") && de(ht, ct), C[0] & 5 && b(he, "width", h[0] / h[2] * 100 + "%"), C[0] & 6 && rn !== (rn = h[1] > 0 ? (h[1] / h[2] * 100).toFixed(1) + "%" : "") && de(pn, rn), C[0] & 6 && b(Te, "width", h[1] / h[2] * 100 + "%"), C[0] & 32 && sn !== (sn = h[7](h[5]) + "") && de(vn, sn), C[0] & 1 && on !== (on = h[7](h[0]) + "") && de(cn, on), C[0] & 2 && un !== (un = h[7](h[1]) + "") && de(hn, un), C[0] & 16 && gn !== (gn = h[4].rahmendaten) && (g.hidden = gn), C[0] & 16 && le(s, "collapsed", h[4].rahmendaten), C[0] & 8 && (bt.checked = h[3].goldAktiv), C[0] & 8 && _n !== (_n = !h[3].goldAktiv) && (Ne.disabled = _n), C[0] & 8 && T(Ne.value) !== h[3].goldZielProzent && S(Ne, h[3].goldZielProzent), C[0] & 8 && mn !== (mn = !h[3].goldAktiv) && (Ve.disabled = mn), C[0] & 8 && T(Ve.value) !== h[3].goldFloorProzent && S(Ve, h[3].goldFloorProzent), C[0] & 8 && bn !== (bn = !h[3].goldAktiv) && (qe.disabled = bn), C[0] & 8 && T(qe.value) !== h[3].goldRebalancingBand && S(qe, h[3].goldRebalancingBand), C[0] & 8 && En !== (En = !h[3].goldAktiv) && (je.disabled = En), C[0] & 8 && (je.checked = h[3].goldSteuerfrei), C[0] & 8 && le(Me, "disabled", !h[3].goldAktiv), C[0] & 16 && kn !== (kn = h[4].gold) && (Xe.hidden = kn), C[0] & 16 && le(Qe, "collapsed", h[4].gold), C[0] & 8 && T(Ze.value) !== h[3].targetEq && S(Ze, h[3].targetEq), C[0] & 8 && T(Ke.value) !== h[3].rebalBand && S(Ke, h[3].rebalBand), C[0] & 8 && T(tt.value) !== h[3].runwayMinMonths && S(tt, h[3].runwayMinMonths), C[0] & 8 && T(lt.value) !== h[3].runwayTargetMonths && S(lt, h[3].runwayTargetMonths), C[0] & 8 && T(nt.value) !== h[3].maxSkimPctOfEq && S(nt, h[3].maxSkimPctOfEq), C[0] & 8 && T(at.value) !== h[3].maxBearRefillPctOfEq && S(at, h[3].maxBearRefillPctOfEq), C[0] & 16 && Cn !== (Cn = h[4].runway) && (Kt.hidden = Cn), C[0] & 16 && le(et, "collapsed", h[4].runway), C[0] & 8 && T(kt.value) !== h[3].aktuellesAlter && S(kt, h[3].aktuellesAlter), C[0] & 8 && T(Ct.value) !== h[3].renteMonatlich && S(Ct, h[3].renteMonatlich), C[0] & 8 && T(It.value) !== h[3].p1StartInJahren && S(It, h[3].p1StartInJahren), C[0] & 8 && T(At.value) !== h[3].renteSteuerpflichtigPct && S(At, h[3].renteSteuerpflichtigPct), C[0] & 8 && (wt.checked = h[3].partnerAktiv), h[3].partnerAktiv ? Ae ? Ae.p(h, C) : (Ae = as(h), Ae.c(), Ae.m(se, In)) : Ae && (Ae.d(1), Ae = null), C[0] & 8 && ma(xe, h[3].widowPensionMode), C[0] & 8 && An !== (An = h[3].widowPensionMode !== "percent") && (We.disabled = An), C[0] & 8 && T(We.value) !== h[3].widowPensionPct && S(We, h[3].widowPensionPct), C[0] & 16 && Sn !== (Sn = h[4].personen) && (se.hidden = Sn), C[0] & 16 && le(it, "collapsed", h[4].personen), C[0] & 8 && (yt.checked = h[3].ansparphaseAktiv), C[0] & 8 && wn !== (wn = !h[3].ansparphaseAktiv) && (Ye.disabled = wn), C[0] & 8 && T(Ye.value) !== h[3].ansparphaseDauerJahre && S(Ye, h[3].ansparphaseDauerJahre), C[0] & 8 && Ln !== (Ln = !h[3].ansparphaseAktiv) && ($e.disabled = Ln), C[0] & 8 && T($e.value) !== h[3].ansparrateMonatlich && S($e, h[3].ansparrateMonatlich), C[0] & 8 && Dn !== (Dn = !h[3].ansparphaseAktiv) && (Be.disabled = Dn), C[0] & 8 && ma(Be, h[3].sparrateIndexing), C[0] & 8 && le(Oe, "disabled", !h[3].ansparphaseAktiv), C[0] & 16 && Pn !== (Pn = h[4].anspar) && (st.hidden = Pn), C[0] & 16 && le(rt, "collapsed", h[4].anspar), C[0] & 8 && (Bt.checked = h[3].pflegefallLogikAktiv), C[0] & 8) {
          Fi = Yr([
            1,
            2,
            3,
            4,
            5
          ]);
          let ue;
          for (ue = 0; ue < 5; ue += 1) {
            const xl = ns(h, Fi, ue);
            Je[ue] ? Je[ue].p(xl, C) : (Je[ue] = is(xl), Je[ue].c(), Je[ue].m(Rt, null));
          }
          for (; ue < 5; ue += 1) Je[ue].d(1);
        }
        C[0] & 8 && le(jl, "disabled", !h[3].pflegefallLogikAktiv), C[0] & 16 && yn !== (yn = h[4].pflege) && (ut.hidden = yn), C[0] & 16 && le(ot, "collapsed", h[4].pflege);
      },
      i: Wl,
      o: Wl,
      d(h) {
        h && u(i), Ae && Ae.d(), hs(Je, h), zi = false, nn(Vr);
      }
    };
  }
  function Ms(t, i, s) {
    let o, d, m, g, r;
    dt(t, J, (Y) => s(3, r = Y));
    let c = {
      rahmendaten: false,
      gold: true,
      runway: true,
      personen: true,
      anspar: true,
      pflege: true
    };
    function _(Y) {
      s(4, c[Y] = !c[Y], c);
    }
    const y = (Y) => new Intl.NumberFormat("de-DE", {
      style: "currency",
      currency: "EUR"
    }).format(Y), K = () => _("rahmendaten");
    function A() {
      r.startKapital = T(this.value), J.set(r);
    }
    function B() {
      r.depotwertAlt = T(this.value), J.set(r);
    }
    function k() {
      r.zielLiquiditaet = T(this.value), J.set(r);
    }
    function V() {
      r.floorBedarf = T(this.value), J.set(r);
    }
    function M() {
      r.flexBedarf = T(this.value), J.set(r);
    }
    function z() {
      r.capeRatio = T(this.value), J.set(r);
    }
    function N() {
      r.einstandAlt = T(this.value), J.set(r);
    }
    function U() {
      r.einstandNeu = T(this.value), J.set(r);
    }
    const H = () => _("gold");
    function w() {
      r.goldAktiv = this.checked, J.set(r);
    }
    function L() {
      r.goldZielProzent = T(this.value), J.set(r);
    }
    function E() {
      r.goldFloorProzent = T(this.value), J.set(r);
    }
    function I() {
      r.goldRebalancingBand = T(this.value), J.set(r);
    }
    function D() {
      r.goldSteuerfrei = this.checked, J.set(r);
    }
    const O = () => _("runway");
    function R() {
      r.targetEq = T(this.value), J.set(r);
    }
    function x() {
      r.rebalBand = T(this.value), J.set(r);
    }
    function ne() {
      r.runwayMinMonths = T(this.value), J.set(r);
    }
    function q() {
      r.runwayTargetMonths = T(this.value), J.set(r);
    }
    function G() {
      r.maxSkimPctOfEq = T(this.value), J.set(r);
    }
    function Q() {
      r.maxBearRefillPctOfEq = T(this.value), J.set(r);
    }
    const ee = () => _("personen");
    function me() {
      r.aktuellesAlter = T(this.value), J.set(r);
    }
    function ge() {
      r.renteMonatlich = T(this.value), J.set(r);
    }
    function X() {
      r.p1StartInJahren = T(this.value), J.set(r);
    }
    function _e() {
      r.renteSteuerpflichtigPct = T(this.value), J.set(r);
    }
    function be() {
      r.partnerAktiv = this.checked, J.set(r);
    }
    function pe() {
      r.p2AktuellesAlter = T(this.value), J.set(r);
    }
    function Ee() {
      r.p2RenteMonatlich = T(this.value), J.set(r);
    }
    function oe() {
      r.p2StartInJahren = T(this.value), J.set(r);
    }
    function W() {
      r.p2Steuerquote = T(this.value), J.set(r);
    }
    function Le() {
      r.widowPensionMode = Wr(this), J.set(r);
    }
    function re() {
      r.widowPensionPct = T(this.value), J.set(r);
    }
    const ae = () => _("anspar");
    function ke() {
      r.ansparphaseAktiv = this.checked, J.set(r);
    }
    function Pe() {
      r.ansparphaseDauerJahre = T(this.value), J.set(r);
    }
    function ie() {
      r.ansparrateMonatlich = T(this.value), J.set(r);
    }
    function Re() {
      r.sparrateIndexing = Wr(this), J.set(r);
    }
    const Ce = () => _("pflege");
    function ye() {
      r.pflegefallLogikAktiv = this.checked, J.set(r);
    }
    function Ft(Y) {
      r[`pflegeStufe${Y}Zusatz`] = T(this.value), J.set(r);
    }
    function ft(Y) {
      r[`pflegeStufe${Y}FlexCut`] = T(this.value), J.set(r);
    }
    function $(Y) {
      r[`pflegeStufe${Y}Mortality`] = T(this.value), J.set(r);
    }
    return t.$$.update = () => {
      t.$$.dirty[0] & 8 && s(2, o = r.startKapital || 0), t.$$.dirty[0] & 8 && s(1, d = r.zielLiquiditaet || 0), t.$$.dirty[0] & 12 && s(0, m = r.goldAktiv ? o * (r.goldZielProzent / 100) : 0), t.$$.dirty[0] & 7 && s(5, g = Math.max(0, o - d - m));
    }, [
      m,
      d,
      o,
      r,
      c,
      g,
      _,
      y,
      K,
      A,
      B,
      k,
      V,
      M,
      z,
      N,
      U,
      H,
      w,
      L,
      E,
      I,
      D,
      O,
      R,
      x,
      ne,
      q,
      G,
      Q,
      ee,
      me,
      ge,
      X,
      _e,
      be,
      pe,
      Ee,
      oe,
      W,
      Le,
      re,
      ae,
      ke,
      Pe,
      ie,
      Re,
      Ce,
      ye,
      Ft,
      ft,
      $
    ];
  }
  class Ns extends Aa {
    constructor(i) {
      super(), Sa(this, i, Ms, Ts, Ia, {}, null, [
        -1,
        -1
      ]);
    }
  }
  function rs(t) {
    let i, s;
    return i = new Ns({}), {
      c() {
        Qi(i.$$.fragment);
      },
      l(o) {
        $i(i.$$.fragment, o);
      },
      m(o, d) {
        Yi(i, o, d), s = true;
      },
      i(o) {
        s || (Ge(i.$$.fragment, o), s = true);
      },
      o(o) {
        zt(i.$$.fragment, o), s = false;
      },
      d(o) {
        Wi(i, o);
      }
    };
  }
  function ss(t) {
    let i, s, o, d = '<h2 class="svelte-1i7k30g">\u{1F52E} Monte Carlo Simulation</h2>', m, g, r;
    return g = new Ls({
      props: {
        input: t[1]
      }
    }), {
      c() {
        i = a("div"), s = a("section"), o = a("header"), o.innerHTML = d, m = p(), Qi(g.$$.fragment), this.h();
      },
      l(c) {
        i = n(c, "DIV", {
          class: true
        });
        var _ = v(i);
        s = n(_, "SECTION", {
          class: true
        });
        var y = v(s);
        o = n(y, "HEADER", {
          class: true,
          "data-svelte-h": true
        }), P(o) !== "svelte-1vjv722" && (o.innerHTML = d), m = f(y), $i(g.$$.fragment, y), y.forEach(u), _.forEach(u), this.h();
      },
      h() {
        l(o, "class", "card-header svelte-1i7k30g"), l(s, "class", "card svelte-1i7k30g"), l(i, "class", "view-container svelte-1i7k30g");
      },
      m(c, _) {
        fe(c, i, _), e(i, s), e(s, o), e(s, m), Yi(g, s, null), r = true;
      },
      p(c, _) {
        const y = {};
        _ & 2 && (y.input = c[1]), g.$set(y);
      },
      i(c) {
        r || (Ge(g.$$.fragment, c), r = true);
      },
      o(c) {
        zt(g.$$.fragment, c), r = false;
      },
      d(c) {
        c && u(i), Wi(g);
      }
    };
  }
  function os(t) {
    let i, s, o, d = '<h2 class="svelte-1i7k30g">\u{1F4DC} Historischer Backtest</h2>', m, g, r;
    return g = new ys({
      props: {
        input: t[1]
      }
    }), {
      c() {
        i = a("div"), s = a("section"), o = a("header"), o.innerHTML = d, m = p(), Qi(g.$$.fragment), this.h();
      },
      l(c) {
        i = n(c, "DIV", {
          class: true
        });
        var _ = v(i);
        s = n(_, "SECTION", {
          class: true
        });
        var y = v(s);
        o = n(y, "HEADER", {
          class: true,
          "data-svelte-h": true
        }), P(o) !== "svelte-1a089fl" && (o.innerHTML = d), m = f(y), $i(g.$$.fragment, y), y.forEach(u), _.forEach(u), this.h();
      },
      h() {
        l(o, "class", "card-header svelte-1i7k30g"), l(s, "class", "card svelte-1i7k30g"), l(i, "class", "view-container svelte-1i7k30g");
      },
      m(c, _) {
        fe(c, i, _), e(i, s), e(s, o), e(s, m), Yi(g, s, null), r = true;
      },
      p(c, _) {
        const y = {};
        _ & 2 && (y.input = c[1]), g.$set(y);
      },
      i(c) {
        r || (Ge(g.$$.fragment, c), r = true);
      },
      o(c) {
        zt(g.$$.fragment, c), r = false;
      },
      d(c) {
        c && u(i), Wi(g);
      }
    };
  }
  function us(t) {
    let i, s = '<div class="card placeholder svelte-1i7k30g"><h2>Parameter Sweep</h2> <p>Diese Funktion ist noch nicht implementiert.</p></div>';
    return {
      c() {
        i = a("div"), i.innerHTML = s, this.h();
      },
      l(o) {
        i = n(o, "DIV", {
          class: true,
          "data-svelte-h": true
        }), P(i) !== "svelte-s9cd1j" && (i.innerHTML = s), this.h();
      },
      h() {
        l(i, "class", "view-container svelte-1i7k30g");
      },
      m(o, d) {
        fe(o, i, d);
      },
      d(o) {
        o && u(i);
      }
    };
  }
  function Vs(t) {
    let i, s, o, d, m = "Rahmendaten", g, r, c = "Monte-Carlo", _, y, K = "Backtesting", A, B, k = "Parameter-Sweep", V, M, z, N, U, H, w, L, E = t[0] === "rahmendaten" && rs(), I = t[0] === "montecarlo" && ss(t), D = t[0] === "backtesting" && os(t), O = t[0] === "sweep" && us();
    return {
      c() {
        i = a("main"), s = a("div"), o = a("nav"), d = a("button"), d.textContent = m, g = p(), r = a("button"), r.textContent = c, _ = p(), y = a("button"), y.textContent = K, A = p(), B = a("button"), B.textContent = k, V = p(), M = a("div"), E && E.c(), z = p(), I && I.c(), N = p(), D && D.c(), U = p(), O && O.c(), this.h();
      },
      l(R) {
        i = n(R, "MAIN", {
          class: true
        });
        var x = v(i);
        s = n(x, "DIV", {
          class: true
        });
        var ne = v(s);
        o = n(ne, "NAV", {
          class: true
        });
        var q = v(o);
        d = n(q, "BUTTON", {
          class: true,
          "data-svelte-h": true
        }), P(d) !== "svelte-rua7m5" && (d.textContent = m), g = f(q), r = n(q, "BUTTON", {
          class: true,
          "data-svelte-h": true
        }), P(r) !== "svelte-1yv67yj" && (r.textContent = c), _ = f(q), y = n(q, "BUTTON", {
          class: true,
          "data-svelte-h": true
        }), P(y) !== "svelte-11iog9d" && (y.textContent = K), A = f(q), B = n(q, "BUTTON", {
          class: true,
          "data-svelte-h": true
        }), P(B) !== "svelte-1agw8x6" && (B.textContent = k), q.forEach(u), V = f(ne), M = n(ne, "DIV", {
          class: true
        });
        var G = v(M);
        E && E.l(G), z = f(G), I && I.l(G), N = f(G), D && D.l(G), U = f(G), O && O.l(G), G.forEach(u), ne.forEach(u), x.forEach(u), this.h();
      },
      h() {
        l(d, "class", "nav-item svelte-1i7k30g"), le(d, "active", t[0] === "rahmendaten"), l(r, "class", "nav-item svelte-1i7k30g"), le(r, "active", t[0] === "montecarlo"), l(y, "class", "nav-item svelte-1i7k30g"), le(y, "active", t[0] === "backtesting"), l(B, "class", "nav-item svelte-1i7k30g"), le(B, "active", t[0] === "sweep"), l(o, "class", "main-nav svelte-1i7k30g"), l(M, "class", "content-area svelte-1i7k30g"), l(s, "class", "app-container svelte-1i7k30g"), l(i, "class", "svelte-1i7k30g");
      },
      m(R, x) {
        fe(R, i, x), e(i, s), e(s, o), e(o, d), e(o, g), e(o, r), e(o, _), e(o, y), e(o, A), e(o, B), e(s, V), e(s, M), E && E.m(M, null), e(M, z), I && I.m(M, null), e(M, N), D && D.m(M, null), e(M, U), O && O.m(M, null), H = true, w || (L = [
          F(d, "click", t[3]),
          F(r, "click", t[4]),
          F(y, "click", t[5]),
          F(B, "click", t[6])
        ], w = true);
      },
      p(R, [x]) {
        (!H || x & 1) && le(d, "active", R[0] === "rahmendaten"), (!H || x & 1) && le(r, "active", R[0] === "montecarlo"), (!H || x & 1) && le(y, "active", R[0] === "backtesting"), (!H || x & 1) && le(B, "active", R[0] === "sweep"), R[0] === "rahmendaten" ? E ? x & 1 && Ge(E, 1) : (E = rs(), E.c(), Ge(E, 1), E.m(M, z)) : E && (Ki(), zt(E, 1, 1, () => {
          E = null;
        }), Zi()), R[0] === "montecarlo" ? I ? (I.p(R, x), x & 1 && Ge(I, 1)) : (I = ss(R), I.c(), Ge(I, 1), I.m(M, N)) : I && (Ki(), zt(I, 1, 1, () => {
          I = null;
        }), Zi()), R[0] === "backtesting" ? D ? (D.p(R, x), x & 1 && Ge(D, 1)) : (D = os(R), D.c(), Ge(D, 1), D.m(M, U)) : D && (Ki(), zt(D, 1, 1, () => {
          D = null;
        }), Zi()), R[0] === "sweep" ? O || (O = us(), O.c(), O.m(M, null)) : O && (O.d(1), O = null);
      },
      i(R) {
        H || (Ge(E), Ge(I), Ge(D), H = true);
      },
      o(R) {
        zt(E), zt(I), zt(D), H = false;
      },
      d(R) {
        R && u(i), E && E.d(), I && I.d(), D && D.d(), O && O.d(), w = false, nn(L);
      }
    };
  }
  function Bs(t, i, s) {
    let o, d;
    dt(t, J, (y) => s(2, d = y));
    let m = "rahmendaten";
    const g = () => s(0, m = "rahmendaten"), r = () => s(0, m = "montecarlo"), c = () => s(0, m = "backtesting"), _ = () => s(0, m = "sweep");
    return t.$$.update = () => {
      t.$$.dirty & 4 && s(1, o = d);
    }, [
      m,
      o,
      d,
      g,
      r,
      c,
      _
    ];
  }
  Os = class extends Aa {
    constructor(i) {
      super(), Sa(this, i, Bs, Vs, Ia, {});
    }
  };
})();
export {
  __tla,
  Os as component,
  Us as universal
};
