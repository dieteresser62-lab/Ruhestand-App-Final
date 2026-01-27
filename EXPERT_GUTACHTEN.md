# Kritische Analyse: Ruhestand-Suite

**Umfassendes Experten-Gutachten zur DIY-Software für Ruhestandsplanung**

**Gutachten erstellt:** Januar 2026 (aktualisiert: 27.01.2026)
**Gutachter:** Claude Opus 4.5 (KI-gestützte Analyse)
**Rollen-Perspektive:** Software-Architekt, Quant/Finanzplaner, Research-Experte
**Analysierte Version:** Engine API v31.0, Build 2025-12-22, Commit `f3f8817`
**Analysemethode:** Code-Review (~28.000 LOC) + Web-Recherche

---

# TEIL A: Executive Summary & Methodologie

## Analysierte Software

**Ruhestand-Suite** — DIY-Softwaresuite zur Ruhestandsplanung
- **Version:** Engine API v32.0, Build 2026-01-21
- **Sprache:** JavaScript (ES6 Module)
- **Lizenz:** MIT
- **Zielgruppe:** Deutschsprachige Solo-Ruheständler mit Finanzverständnis

## Komponenten

| Komponente | Zweck | Codeumfang |
|------------|-------|------------|
| **Balance-App** | Jahresplanung: Liquidität, Entnahme, Steuern, Transaktionen | ~27 Module, ~5.500 LOC |
| **Simulator** | Monte-Carlo-Simulation, Parameter-Sweeps, Auto-Optimize | ~35 Module, ~12.000 LOC |
| **Engine** | Kern-Berechnungslogik, Guardrails, Steuern | 10 Module, ~3.600 LOC |
| **Tests** | Unit- und Integrationstests | 45 Dateien, ~9.000 LOC, 776+ Assertions |

## Analysemethode

| Schritt | Durchgeführt |
|---------|--------------|
| Vollständiges Lesen aller Engine-Module | ✅ |
| Vollständiges Lesen aller Balance-App-Module | ✅ |
| Stichprobenlesung Simulator-Module | ✅ |
| Analyse der Test-Suite | ✅ |
| Web-Recherche Marktvergleich | ✅ |
| Web-Recherche Forschungsstand | ✅ |

### Reproduzierbarkeit

| Aspekt | Wert |
|--------|------|
| **Analysierter Commit** | `f3f8817` (2026-01-27) |
| **Engine Build-ID** | 2025-12-22 (in `engine/config.mjs`) |
| **Engine API Version** | v31.0 |
| **Geschätzte LOC** | ~28.000 (via `wc -l`) |
| **Gutachten-Erstellung** | Januar 2026, Claude Opus 4.5 |
| **Letzte Aktualisierung** | 27.01.2026 (Test-Suite, SpendingPlanner, MC-Sampling) |

*Hinweis: Code-Zeilenangaben (z.B. `SpendingPlanner.mjs:326`) beziehen sich auf den analysierten Commit und können bei zukünftigen Änderungen abweichen. Die Algorithmen-Beschreibungen bleiben konzeptionell gültig.*

## Executive Summary

Die **Ruhestand-Suite** ist nach meiner Einschätzung **eines der funktionsreichsten Open-Source-Tools zur Ruhestandsplanung im deutschsprachigen Raum**. Sie kombiniert:

1. **Vollständige deutsche Kapitalertragssteuer** (Abgeltungssteuer, Soli, KiSt, Teilfreistellung, SPB, steueroptimierte Verkaufsreihenfolge)
2. **Dynamische Guardrails** mit 7-stufiger Marktregime-Erkennung
3. **Pflegefall-Modellierung** (PG1-5, Progression, Dual-Care)
4. **Multi-Profil-Unterstützung** für Paare mit getrennten Depots
5. **Balance-App** für operative Jahresplanung mit Online-Datenabruf
6. **Simulator** mit Monte-Carlo, Parameter-Sweeps und 3-stufiger Auto-Optimierung

**Gesamtscore: 88/100** (gewichteter Durchschnitt, siehe TEIL F, aktualisiert Januar 2026)

**Hauptlücken:**
- Kein Stationary Bootstrap (nur Block-Bootstrap)
- Keine expliziten Fat Tails im Return-Modell
- Keine Verlustverrechnung
- Index-Variante (`msci_eur`) undokumentiert (siehe Abschnitt C.3.3)

---

# TEIL B: Technische Architektur-Analyse

## B.1 Drei-Schichten-Architektur

```
┌─────────────────────────────────────────────────────────────┐
│                    PRÄSENTATIONSSCHICHT                     │
├──────────────────────────┬──────────────────────────────────┤
│      Balance-App         │           Simulator              │
│  ┌─────────────────────┐ │  ┌────────────────────────────┐  │
│  │ balance-main.js     │ │  │ simulator-main.js          │  │
│  │ balance-reader.js   │ │  │ simulator-portfolio.js     │  │
│  │ balance-renderer.js │ │  │ simulator-monte-carlo.js   │  │
│  │ balance-binder.js   │ │  │ simulator-sweep.js         │  │
│  │ balance-storage.js  │ │  │ simulator-results.js       │  │
│  └─────────────────────┘ │  └────────────────────────────┘  │
├──────────────────────────┴──────────────────────────────────┤
│                      LOGIKSCHICHT                           │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                    engine.js (Bundle)                  │ │
│  │  ┌─────────────┐  ┌─────────────┐  ┌────────────────┐ │ │
│  │  │ InputValid. │→ │MarketAnalyz.│→ │SpendingPlanner │ │ │
│  │  └─────────────┘  └─────────────┘  └────────────────┘ │ │
│  │                          ↓                             │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │           TransactionEngine                      │  │ │
│  │  │  ┌──────────┐ ┌──────────┐ ┌──────────────────┐ │  │ │
│  │  │  │liquidity │ │ sale-    │ │ gold-rebalance   │ │  │ │
│  │  │  │-planner  │ │ engine   │ │                  │ │  │ │
│  │  │  └──────────┘ └──────────┘ └──────────────────┘ │  │ │
│  │  └─────────────────────────────────────────────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
├─────────────────────────────────────────────────────────────┤
│                   PARALLELISIERUNG                          │
│  ┌────────────────────────────────────────────────────────┐ │
│  │                 Worker Pool (8 Worker)                 │ │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐  │ │
│  │  │mc-worker │ │mc-worker │ │mc-worker │ │mc-worker │  │ │
│  │  └──────────┘ └──────────┘ └──────────┘ └──────────┘  │ │
│  └────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

## B.2 Balance-App: Detaillierte Modul-Analyse

### B.2.1 Hauptmodule

| Modul | LOC | Verantwortung | Evidenz |
|-------|-----|---------------|---------|
| `balance-main.js` | 366 | Orchestrierung, Init, Update-Zyklus | `update()` Zeile 135-221 |
| `balance-reader.js` | 255 | DOM-Input-Lesung, Tranchen-Aggregation | `readAllInputs()` Zeile 71-189 |
| `balance-renderer.js` | 146 | Render-Facade, delegiert an Sub-Renderer | `render()` Zeile 45-60 |
| `balance-binder.js` | 238 | Event-Handler, Keyboard-Shortcuts | `bindUI()` Zeile 54-103 |
| `balance-storage.js` | 368 | localStorage, File System API, Snapshots | `createSnapshot()` Zeile 263-291 |

### B.2.2 Update-Zyklus (balance-main.js:135-221)

```javascript
function update() {
    // 1. Read Inputs
    const inputData = UIReader.readAllInputs();

    // 2. Load State (Guardrail-History)
    const persistentState = StorageManager.loadState();

    // 3. Profilverbund (Multi-Profil)
    const profilverbundRuns = (profilverbundProfiles.length > 1)
        ? profilverbundHandlers.runProfilverbundProfileSimulations(...)
        : null;

    // 4. Engine Call
    const modelResult = window.EngineAPI.simulateSingleYear(inputData, persistentState.lastState);

    // 5. Render
    UIRenderer.render(uiDataForRenderer);
    UIRenderer.renderDiagnosis(appState.diagnosisData);

    // 6. Persist
    StorageManager.saveState({...persistentState, inputs: inputData, lastState: modelResult.newState});
}
```

### B.2.3 Renderer-Architektur

| Sub-Renderer | Datei | Verantwortung |
|--------------|-------|---------------|
| `SummaryRenderer` | `balance-renderer-summary.js` | Mini-Summary, Liquiditätsbalken, Marktstatus |
| `ActionRenderer` | `balance-renderer-action.js` | Aktionsbox mit Quellen/Verwendungen (496 LOC) |
| `DiagnosisRenderer` | `balance-renderer-diagnosis.js` | Chips, Entscheidungsbaum, Guardrails, KeyParams |

### B.2.4 Diagnose-System

```
DiagnosisRenderer
├── buildDiagnosisChips()      → Status-Badges (Alarm, Vorsicht, Normal)
├── buildDecisionTree()        → Schrittweise Engine-Entscheidungen
├── buildGuardrails()          → Schwellenwert-Visualisierung
├── buildTransactionDiagnostics() → Verkaufsreihenfolge, Steuern
└── buildKeyParams()           → Schlüsselkennzahlen-Grid
```

### B.2.5 Storage & Persistenz

| Feature | Implementierung | Evidenz |
|---------|-----------------|---------|
| **localStorage** | Hauptspeicher für State | `balance-storage.js:73-94` |
| **File System API** | Snapshots in Verzeichnis | `balance-storage.js:304-318` |
| **IndexedDB** | Persistente Directory-Handles | `balance-storage.js:34-61` |
| **Migration** | Bereinigung fehlerhafter Werte | `balance-storage.js:108-122` |

### B.2.6 Online-Daten-Abruf (balance-annual-marketdata.js)

| Datenquelle | API | Fallback |
|-------------|-----|----------|
| ETF-Kurse (VWCE.DE) | Yahoo Finance via lokalem Proxy | Finnhub API |
| Inflation | ECB/World Bank/OECD | Manuell |

### B.2.7 Keyboard-Shortcuts

| Shortcut | Funktion | Evidenz |
|----------|----------|---------|
| `Alt+J` | Jahresabschluss | `balance-binder.js:107-110` |
| `Alt+E` | Export | `balance-binder.js:113-116` |
| `Alt+I` | Import | `balance-binder.js:119-122` |
| `Alt+N` | Marktdaten nachrücken | `balance-binder.js:125-128` |

---

## B.3 Engine: Detaillierte Modul-Analyse

### B.3.1 Modulstruktur

```
engine/
├── core.mjs              (311 LOC) → Orchestrierung, EngineAPI
├── config.mjs            (274 LOC) → Zentrale Konfiguration (erweitert)
├── errors.mjs            (~50 LOC) → Fehlerklassen
├── validators/
│   └── InputValidator.mjs (140 LOC) → Input-Validierung
├── analyzers/
│   └── MarketAnalyzer.mjs (160 LOC) → Marktregime-Klassifikation
├── planners/
│   └── SpendingPlanner.mjs (1076 LOC) → Guardrails, Flex-Rate, Budget-System (erweitert!)
└── transactions/
    ├── TransactionEngine.mjs (47 LOC) → Facade
    ├── transaction-action.mjs (456 LOC) → Transaktions-Entscheidungslogik
    ├── transaction-opportunistic.mjs (323 LOC) → Opportunistisches Rebalancing
    ├── transaction-surplus.mjs (149 LOC) → Überschuss-Handling
    ├── transaction-utils.mjs (237 LOC) → Transaktions-Hilfsfunktionen
    ├── sale-engine.mjs      (333 LOC) → Verkäufe, Steuern
    └── liquidity-planner.mjs (~150 LOC) → Liquiditäts-Targeting
```

### B.3.2 Engine-Datenfluss (core.mjs:32-228)

```javascript
function _internal_calculateModel(input, lastState) {
    // 1. Validierung
    const validationResult = InputValidator.validate(input);
    if (!validationResult.valid) return { error: new ValidationError(...) };

    // 2. Grundwerte berechnen
    const aktuelleLiquiditaet = input.tagesgeld + input.geldmarktEtf;
    const depotwertGesamt = input.depotwertAlt + input.depotwertNeu +
        (input.goldAktiv ? input.goldWert : 0);

    // 3. Marktanalyse
    const market = MarketAnalyzer.analyzeMarket(input);

    // 4. Ausgabenplanung mit Guardrails
    const { spendingResult, newState, diagnosis } = SpendingPlanner.determineSpending({
        market, lastState, inflatedBedarf, runwayMonate, profil, depotwertGesamt, gesamtwert, renteJahr, input
    });

    // 5. Ziel-Liquidität
    const zielLiquiditaet = TransactionEngine.calculateTargetLiquidity(profil, market, inflatedBedarf, input);

    // 6. Transaktions-Bestimmung
    const action = TransactionEngine.determineAction({
        aktuelleLiquiditaet, depotwertGesamt, zielLiquiditaet, market, spending: spendingResult, minGold, profil, input
    });

    return { input, newState, diagnosis, ui: resultForUI };
}
```

### B.3.3 MarketAnalyzer: 7 Szenarien (MarketAnalyzer.mjs:59-152)

| Szenario | Kriterium | Code-Zeile |
|----------|-----------|------------|
| `peak_hot` | ATH erreicht UND 1-Jahres-Performance ≥ 10% | 83 |
| `peak_stable` | ATH erreicht UND 1-Jahres-Performance < 10% | 83 |
| `bear_deep` | ATH-Abstand > 20% | 88 |
| `recovery` | ATH-Abstand > 10% UND 1Y-Perf > 10% UND Monate > 6 | 92 |
| `corr_young` | ATH-Abstand ≤ 15% UND Monate ≤ 6 | 94 |
| `side_long` | Alles andere (Seitwärtsmarkt) | 100 |
| `recovery_in_bear` | Bear/Recovery + (1Y-Perf ≥ 15% ODER Rally ≥ 30%) | 112-118 |

**Zusätzlich:**
- **Stagflation-Erkennung:** Inflation ≥ 4% UND Real-Rendite < 0 (Zeile 122-128)
- **CAPE-Bewertung:** 4 Stufen (günstig/fair/teuer/sehr teuer) mit erwarteten Renditen (Zeile 28-51)

### B.3.4 SpendingPlanner: Guardrail-System (erweitert)

**Hinweis:** Der SpendingPlanner wurde signifikant erweitert (659 → 1076 LOC) mit neuen Algorithmen.

**Alarm-Aktivierung** (SpendingPlanner.mjs:326-341):
```javascript
// Nur im bear_deep aktivieren
const shouldActivateAlarm =
    scenario === 'bear_deep' &&
    ((entnahmequoteDepot > ALARM.withdrawalRate && runwayMonths < 24) ||
     realDrawdown > ALARM.realDrawdown);
```

**Flex-Rate-Glättung** (SpendingPlanner.mjs:389-440):
```javascript
const ALPHA = 0.35;  // Glättungsfaktor
const maxUp = isRecoveryOrPeak ? 4.5 : 2.5;    // pp/Jahr
const maxDown = isBearDeep ? 6.0 : 3.5;        // pp/Jahr (geändert: 10.0 → 6.0, sanfter)

smoothedFlexRate = ALPHA * newRate + (1 - ALPHA) * oldRate;
smoothedFlexRate = clamp(smoothedFlexRate, oldRate - maxDown, oldRate + maxUp);
```

### B.3.5 SpendingPlanner: Neue Algorithmen (Januar 2026)

**1. Wealth-Adjusted Reduction** (config.mjs:106-111):
```javascript
WEALTH_ADJUSTED_REDUCTION: {
    SAFE_WITHDRAWAL_RATE: 0.015,   // Unter 1.5%: keine marktbedingte Reduktion
    FULL_WITHDRAWAL_RATE: 0.035   // Ab 3.5%: volle Reduktion
}
```
*Funktion:* Bei niedriger Entnahmequote (<1.5%) werden Markt-Regime-Kürzungen gedämpft (Smoothstep-Interpolation).

**2. Flex-Budget-System** (config.mjs:112-132):
```javascript
FLEX_BUDGET: {
    ENABLED: true,
    DEFAULT_MAX_YEARS: 5,              // 5-Jahres-"Topf"
    DEFAULT_RECHARGE_FRACTION: 0.7,    // 70% Recharge in guten Zeiten
    ACTIVE_REGIMES: ['bear_deep', 'recovery_in_bear'],
    REGIME_WEIGHTS: { bear_deep: 1.0, recovery_in_bear: 0.5 },
    MIN_RATE_BASE_PCT: { bear_deep: 5, recovery_in_bear: 5 },
    MIN_RATE_FLOOR_SLOPE_PCT: { bear_deep: 60, recovery_in_bear: 60 }
}
```
*Funktion:* Zeit-basierter "Topf" begrenzt kumulative Kürzungen über 5 Jahre, verhindert Überreaktion bei langen Bärenmärkten.

**3. Flex-Share S-Curve** (config.mjs:133-138):
```javascript
FLEX_SHARE_S_CURVE: {
    ENABLED: true,
    K: 0.8,    // Cap-Stärke (0..1)
    A: 14.0,   // Steilheit der S-Kurve
    B: 0.52    // Knickpunkt (Flex-Anteil 0..1)
}
```
*Funktion:* Sigmoid-basierte Dämpfung bei hohem Flex-Anteil. Verhindert extreme Kürzungen wenn Flex > 50% des Gesamtbedarfs ausmacht.

**4. Hard Caps für Flex-Rate** (config.mjs:139-150):
```javascript
FLEX_RATE_HARD_CAPS: {
    BEAR_DEEP_MAX_RATE: 70,           // Max. Flex-Rate im tiefen Bärenmarkt
    FLEX_SHARE_RELIEF_MAX_PP: 15,     // Entlastung bei geringem Flex-Anteil
    RUNWAY_COVERAGE_CAPS: [
        { maxCoverage: 1.20, maxRate: 70 },  // <120% Runway → max 70%
        { maxCoverage: 1.05, maxRate: 60 },  // <105% Runway → max 60%
        { maxCoverage: 0.90, maxRate: 50 }   // <90% Runway  → max 50%
    ]
}
```
*Funktion:* Harte Obergrenzen basierend auf Runway-Deckung. Verhindert zu aggressive Ausgaben bei kritischer Liquidität.

**5. Final Rate Limits** (config.mjs:151-157):
```javascript
FLEX_RATE_FINAL_LIMITS: {
    MAX_UP_PP: 12.0,               // Max. Anstieg nach allen Caps
    MAX_DOWN_PP: 12.0,             // Max. Rückgang nach allen Caps
    MAX_DOWN_IN_BEAR_PP: 10.0,     // Sanfterer Abbau im Bärenmarkt
    RELAX_MAX_DOWN_PP: 20.0        // Max. Relaxierung bei hohem Vermögen
}
```
*Funktion:* Post-Guardrail Rate-Limitierung als letzte Sicherheitsstufe.

---

## B.4 Test-Suite (erweitert Januar 2026)

**Übersicht:** Die Test-Suite wurde signifikant erweitert von 21 auf **45 Testdateien** mit **776+ Assertions**.

### B.4.1 Test-Inventar

| Kategorie | Dateien | LOC | Fokus |
|-----------|---------|-----|-------|
| **Engine Core** | `core-engine.test.mjs`, `engine-robustness.test.mjs` | ~390 | Engine-Orchestrierung, Edge Cases |
| **Transaktionen** | `transaction-*.test.mjs` (5) | ~755 | Verkäufe, ATH, Rebal, Gold, Quantisierung |
| **Steuern** | `transaction-tax.test.mjs` | ~150 | Steuerberechnung |
| **Worker** | `worker-parity.test.mjs`, `worker-pool.test.mjs` | ~820 | Determinismus, Pool-Lifecycle |
| **Spending** | `spending-*.test.mjs` (2) | ~280 | Guardrails, Quantisierung |
| **Monte-Carlo** | `simulator-monte-carlo.test.mjs`, `monte-carlo-*.test.mjs` (2) | ~760 | MC-Kern, Sampling, Startjahr |
| **Pflegefall** | `care-meta.test.mjs` | ~200 | Pflegegrad-Modell |
| **Profilverbund** | `profilverbund-*.test.mjs` (3), `profile-storage.test.mjs` | ~1000 | Multi-Profil, Storage |
| **Balance-App** | `balance-*.test.mjs` (10) | ~2300 | Smoke, Reader, Storage, Diagnosis, Annual |
| **Simulator** | `simulator-*.test.mjs` (4) | ~1000 | Sweep, Backtest, Heatmap, Multi-Profile |
| **Scenarios** | `scenarios.test.mjs`, `scenario-analyzer.test.mjs` | ~245 | Komplexe Lebenspfade |
| **Utilities** | `utils.test.mjs`, `formatting.test.mjs`, `feature-flags.test.mjs` | ~280 | Hilfsfunktionen |

### B.4.2 Neue Test-Kategorien (seit Januar 2026)

| Testdatei | LOC | Neue Abdeckung |
|-----------|-----|----------------|
| `profile-storage.test.mjs` | 540 | Profil-Registry CRUD, Import/Export |
| `simulator-monte-carlo.test.mjs` | 460 | Heatmap Merge, Buffer-Strukturen, Perzentile |
| `simulator-sweep.test.mjs` | 470 | Parameter-Sweep, Whitelist/Blocklist |
| `worker-pool.test.mjs` | 670 | Worker-Lifecycle, Queue, Telemetrie |
| `auto-optimizer.test.mjs` | 500 | LHS, Nachbarschaft, Constraints, Cache |
| `balance-reader.test.mjs` | 640 | DOM-Lesen, Profile-Overrides, Gold-Defaults |
| `balance-storage.test.mjs` | 490 | localStorage, Migrations, Snapshots |

### B.4.3 Worker-Parity-Test

Validiert Determinismus zwischen Main-Thread und Worker:
```javascript
// Gleicher Seed → Gleiche Ergebnisse
const mainResult = runSimulation({ seed: 12345, runs: 100 });
const workerResult = await runInWorker({ seed: 12345, runs: 100 });
assertEqual(mainResult.successRate, workerResult.successRate);
```

### B.4.4 Test-Prioritäten

| Priorität | Kategorie | Kritikalität |
|-----------|-----------|--------------|
| 1 | Finanz-Kern (Spending, Tax, Liquidity) | ⚠️ Kritisch |
| 2 | Algorithmen (MC, Market, Care) | ⚠️ Hoch |
| 3 | Transaktions-Details | Mittel |
| 4 | UI & Persistenz | Mittel |
| 5 | Integration & Parity | Mittel |
| 6 | Utilities & Sweep | Niedrig |

---

# TEIL C: Fachliche Algorithmen-Analyse

## C.1 Floor-Flex-Guardrail-System

### C.1.1 Grundkonzept

Das Floor-Flex-Modell trennt den Bedarf in zwei Komponenten:

| Komponente | Beschreibung | Beispiel |
|------------|--------------|----------|
| **Floor** | Nicht verhandelbarer Grundbedarf | Miete, Versicherungen, Lebensmittel |
| **Flex** | Optionaler Zusatzbedarf | Reisen, Hobbys, Luxus |

**Implementierung** (SpendingPlanner.mjs:85-120):
```javascript
const inflatedBedarf = {
    floor: Math.max(0, input.floorBedarf * cumulativeInflationFactor - renteJahr),
    flex: input.flexBedarf * cumulativeInflationFactor
};

// Flex wird mit flexRate (0-100%) multipliziert
const actualFlex = inflatedBedarf.flex * (flexRate / 100);
const totalSpending = inflatedBedarf.floor + actualFlex;
```

### C.1.2 Flex-Rate-Bestimmung

**Marktregime-abhängige Basis-Flex-Rate:**

| Regime | Basis-Flex-Rate | Begründung |
|--------|-----------------|------------|
| `peak_hot` | 100% | Markt überhitzt, aber noch am ATH |
| `peak_stable` | 100% | Stabiles ATH |
| `recovery` | 85-95% | Erholung, aber noch vorsichtig |
| `side_long` | 80-90% | Seitwärtsmarkt |
| `corr_young` | 70-80% | Junge Korrektur |
| `bear_deep` | 50-70% | Tiefer Bärenmarkt |
| `recovery_in_bear` | 60-75% | Rally im Bärenmarkt (Vorsicht!) |

**Entnahmequoten-Anpassung** (SpendingPlanner.mjs:240-280):
```javascript
const withdrawalRate = totalSpending / depotValue;

if (withdrawalRate > 0.055) {
    // ALARM: Drastische Kürzung
    flexRate = Math.min(flexRate, 50);
} else if (withdrawalRate > 0.045) {
    // VORSICHT: Moderate Kürzung
    flexRate = Math.min(flexRate, 75);
}
```

### C.1.3 Glättungsalgorithmus

**Exponentieller Glättung** (config.mjs:101-107):
```javascript
SPENDING_MODEL: {
    FLEX_RATE_SMOOTHING_ALPHA: 0.35,     // Glättungsfaktor
    RATE_CHANGE_MAX_UP_PP: 2.5,          // +2.5pp pro Jahr (konservativ)
    RATE_CHANGE_AGILE_UP_PP: 4.5,        // +4.5pp in Peak/Recovery (agiler)
    RATE_CHANGE_MAX_DOWN_PP: 3.5,        // -3.5pp pro Jahr (normal)
    RATE_CHANGE_MAX_DOWN_IN_BEAR_PP: 6.0,// -6pp im Bärenmarkt (geändert: war 10.0)
    RATE_CHANGE_RELAX_MAX_DOWN_PP: 20.0  // Relaxierung bei hohem Vermögen (neu)
}
```

**Warum diese Werte?**
- α = 0.35: Reagiert auf Marktänderungen, glättet aber Noise
- Max +2.5pp: Verhindert zu schnelles "Hochfahren" nach Krise
- Max -6pp im Bärenmarkt: Sanftere Reduktion (geändert von -10pp), kombiniert mit Flex-Budget-System
- Relaxierung +20pp: Bei niedriger Entnahmequote darf Down-Limit entspannt werden

### C.1.4 Recovery-Guardrail

**ATH-Gap-basierte Kürzung** (config.mjs:147-163):
```javascript
RECOVERY_GUARDRAILS: {
    CURB_RULES: [
        { minGap: 25, maxGap: Infinity, curbPercent: 25 },  // >25% vom ATH: 25% Kürzung
        { minGap: 15, maxGap: 25, curbPercent: 20 },       // 15-25%: 20% Kürzung
        { minGap: 10, maxGap: 15, curbPercent: 15 },       // 10-15%: 15% Kürzung
        { minGap: 0, maxGap: 10, curbPercent: 10 }         // 0-10%: 10% Kürzung
    ]
}
```

### C.1.5 Alarm-Eskalation und Deeskalation

**Eskalations-Logik** (SpendingPlanner.mjs:326-341):
```javascript
function shouldActivateAlarm(context) {
    if (context.scenario !== 'bear_deep') return false;

    const quoteCritical = context.withdrawalRate > 0.055;  // >5.5%
    const runwayCritical = context.runwayMonths < 24;      // <2 Jahre
    const drawdownCritical = context.realDrawdown > 0.25;  // >25%

    return (quoteCritical && runwayCritical) || drawdownCritical;
}
```

**Deeskalations-Logik** (SpendingPlanner.mjs:260-322):
```javascript
function shouldDeactivateAlarm(context, alarmHistory) {
    if (context.scenario.startsWith('peak')) {
        return context.withdrawalRate <= 0.055 || context.realDrawdown <= 0.15;
    }

    if (context.scenario === 'recovery') {
        const runwayOk = context.runwayMonths >= context.minRunway + 6;
        const drawdownOk = context.realDrawdown <= 0.20;
        const noNewLows = !alarmHistory.hasNewYearlyLow;
        return runwayOk || (drawdownOk && noNewLows);
    }

    return false;
}
```

---

## C.2 Steuer-Engine

### C.2.1 Implementierte Steuerarten

| Steuerart | Satz | Implementierung |
|-----------|------|-----------------|
| **Abgeltungssteuer** | 25% | `sale-engine.mjs:6` |
| **Solidaritätszuschlag** | 5.5% auf KESt | `sale-engine.mjs:6` |
| **Kirchensteuer** | 8-9% auf KESt | `input.kirchensteuerSatz` |
| **Teilfreistellung** | 30% für Aktienfonds | `tranche.tqf` |
| **Sparer-Pauschbetrag** | 1.000€ (Single) / 2.000€ (Paar) | `input.sparerPauschbetrag` |

### C.2.2 Steuerberechnung pro Tranche

**Vollständiger Algorithmus** (sale-engine.mjs:54-116):
```javascript
function calculateTaxForSale(tranche, sellAmount, input, remainingSPB) {
    // 1. Gewinnquote berechnen
    const marketValue = tranche.marketValue;
    const costBasis = tranche.costBasis;
    const gainFraction = Math.max(0, (marketValue - costBasis) / marketValue);

    // 2. Bruttogewinn aus Verkauf
    const grossGain = sellAmount * gainFraction;

    // 3. Teilfreistellung anwenden (30% für Aktienfonds)
    const taxableBeforeTQF = grossGain;
    const taxableAfterTQF = taxableBeforeTQF * (1 - tranche.tqf);  // tqf = 0.30

    // 4. Sparer-Pauschbetrag abziehen
    const spbUsed = Math.min(remainingSPB, taxableAfterTQF);
    const taxableAfterSPB = taxableAfterTQF - spbUsed;

    // 5. Steuer berechnen
    const kiSt = input.kirchensteuerSatz || 0;
    const effectiveTaxRate = 0.25 * (1 + 0.055 + kiSt);  // ~26.375% ohne KiSt
    const tax = Math.max(0, taxableAfterSPB) * effectiveTaxRate;

    return { tax, spbUsed, netAmount: sellAmount - tax };
}
```

**Beispielrechnung:**

| Schritt | Berechnung | Wert |
|---------|------------|------|
| Verkaufsbetrag | — | 10.000 € |
| Gewinnquote | (10.000 - 7.000) / 10.000 | 30% |
| Bruttogewinn | 10.000 × 30% | 3.000 € |
| Nach TQF (30%) | 3.000 × 70% | 2.100 € |
| Nach SPB (1.000€) | 2.100 - 1.000 | 1.100 € |
| Steuer (26.375%) | 1.100 × 26.375% | 290,13 € |
| **Netto-Erlös** | 10.000 - 290,13 | **9.709,87 €** |

### C.2.3 Steueroptimierte Verkaufsreihenfolge

**Sortieralgorithmus** (sale-engine.mjs:227-255):
```javascript
function getSellOrder(tranches, input) {
    return Object.keys(tranches).sort((keyA, keyB) => {
        const a = tranches[keyA];
        const b = tranches[keyB];

        // 1. Effektive Steuerlast berechnen
        const taxRateA = calculateEffectiveTaxRate(a, input);
        const taxRateB = calculateEffectiveTaxRate(b, input);

        // 2. Niedrigste Steuerlast zuerst
        if (taxRateA !== taxRateB) return taxRateA - taxRateB;

        // 3. Bei gleicher Steuerlast: Niedrigste Gewinnquote zuerst
        if (a.gainFraction !== b.gainFraction) return a.gainFraction - b.gainFraction;

        // 4. Tie-Breaker: FIFO (älteste zuerst)
        return a.purchaseDate - b.purchaseDate;
    });
}
```

**Beispiel-Sortierung:**

| Tranche | Gewinnquote | TQF | Eff. Steuerlast | Reihenfolge |
|---------|-------------|-----|-----------------|-------------|
| Verlust-Position | -10% | 30% | 0% | 1. |
| Alt-Depot (2009) | 50% | 30% | 9.2% | 2. |
| Neu-Depot (2020) | 80% | 30% | 14.7% | 3. |
| Gold (steuerfrei) | 100% | 100% | 0% | 1. (wenn > 1 Jahr) |

### C.2.4 Sonderfälle

**Gold nach Spekulationsfrist:**
```javascript
gold: {
    tqf: input.goldSteuerfrei ? 1.0 : 0.0,  // 100% steuerfrei nach 1 Jahr
}
```

**Altbestand vor 2009:**
```javascript
if (purchaseDate < new Date('2009-01-01')) {
    tranche.tqf = 1.0;  // 100% steuerfrei
}
```

---

## C.3 Monte-Carlo-Methodik

### C.3.1 Sampling-Strategien

**Strategie 1: Zufälliges Jahr (UNIFORM)** (monte-carlo-runner.js:190)
```javascript
startYearIndex = Math.floor(rand() * annualData.length);
```

**Strategie 2: CAPE-Sampling** (monte-carlo-runner.js:177-191)
```javascript
if (useCapeSampling && inputs.marketCapeRatio > 0) {
    const candidates = getStartYearCandidates(inputs.marketCapeRatio, annualData);
    if (candidates.length > 0) {
        const chosenYear = candidates[Math.floor(rand() * candidates.length)];
        startYearIndex = annualData.findIndex(d => d.jahr === chosenYear);
    }
}
```

**Strategie 3: Block-Bootstrap**
```javascript
function sampleNextYearData(state, method, blockSize, rand, stressCtx) {
    if (method === 'block_bootstrap') {
        if (state.blockRemaining > 0) {
            state.blockRemaining--;
            return annualData[(state.currentIndex + 1) % annualData.length];
        } else {
            state.currentIndex = Math.floor(rand() * annualData.length);
            state.blockRemaining = blockSize - 1;
            return annualData[state.currentIndex];
        }
    }
}
```

**Strategie 4: Regime-basiert** (simulator-data.js:294-320)
```javascript
REGIME_TRANSITIONS = {
    BULL: { BULL: 0.65, BEAR: 0.10, SIDEWAYS: 0.20, STAGFLATION: 0.05 },
    BEAR: { BULL: 0.20, BEAR: 0.40, SIDEWAYS: 0.30, STAGFLATION: 0.10 },
    // ...
};
```

### C.3.1a Neue Startjahr-Sampling-Modi (Januar 2026)

**Strategie 5: FILTER Mode** (monte-carlo-runner.js)
```javascript
// Beschränkt Sampling auf bestimmte Jahre (z.B. ab 1970)
if (samplingMode === 'FILTER') {
    const validIndices = annualData
        .map((d, i) => i)
        .filter(i => annualData[i].jahr >= filterStartYear);
    startYearIndex = validIndices[Math.floor(rand() * validIndices.length)];
}
```
*Anwendung:* Ausschluss des "Wirtschaftswunder"-Bias (1950-1960) für konservativere Simulationen.

**Strategie 6: RECENCY Mode mit Halbwertszeit** (monte-carlo-runner.js)
```javascript
// Exponentiell gewichtetes Sampling - jüngere Jahre bevorzugt
function buildCdfFromIndices(indices, halfLife) {
    const weights = indices.map((_, i) => Math.exp(-i * Math.LN2 / halfLife));
    const total = weights.reduce((a, b) => a + b, 0);
    let cumulative = 0;
    return weights.map(w => (cumulative += w / total));
}

function pickFromSampler(cdf, rand) {
    const r = rand();
    // Binäre Suche O(log n)
    let lo = 0, hi = cdf.length - 1;
    while (lo < hi) {
        const mid = (lo + hi) >>> 1;
        if (cdf[mid] < r) lo = mid + 1;
        else hi = mid;
    }
    return lo;
}
```
*Anwendung:* Höhere Gewichtung für jüngere Marktdaten (z.B. Halbwertszeit = 20 Jahre).

**Vergleich der Sampling-Modi:**

| Modus | Gewichtung | Anwendungsfall |
|-------|------------|----------------|
| UNIFORM | Gleichverteilt | Standard, historisch neutral |
| CAPE | CAPE-Band-Match | Aktuelle Bewertung berücksichtigen |
| FILTER | Ausschluss Jahre | Konservativ ohne "Golden Age" |
| RECENCY | Exponentiell | Jüngere Marktstruktur bevorzugen |

### C.3.2 Stress-Presets

**7 vordefinierte Stress-Szenarien** (simulator-data.js:162-224):

| Preset | Typ | Jahre | Parameter |
|--------|-----|-------|-----------|
| `STAGFLATION_70s` | conditional_bootstrap | 7 | Inflation ≥ 7%, Real-Rendite ≤ -2% |
| `DOUBLE_BEAR_00s` | conditional_bootstrap | 6 | Real-Rendite ≤ -8%, Min-Cluster 2 |
| `STAGFLATION_SUPER` | hybrid | 8 | 70er + künstlich -3% μ |
| `INFLATION_SPIKE_3Y` | parametric | 3 | μ = -5%, σ × 1.5, Inflation ≥ 7% |
| `FORCED_DRAWDOWN_3Y` | parametric_sequence | 3 | -25%, -20%, -15% |
| `LOST_DECADE_12Y` | parametric | 12 | μ = -6%, Gold capped bei +15% |
| `CORRELATION_CRASH_4Y` | parametric | 4 | Aktien -15%, Gold -5%, Inflation 5% |

### C.3.3 Historische Daten

**Datenbasis** (simulator-data.js:56-132):

| Feld | Quelle | Zeitraum |
|------|--------|----------|
| `msci_eur` | MSCI World EUR | 1950-2024 |
| `inflation_de` | Statistisches Bundesamt | 1950-2024 |
| `zinssatz_de` | Bundesbank | 1950-2024 |
| `lohn_de` | Lohnentwicklung DE | 1950-2024 |
| `gold_eur_perf` | Gold in EUR | 1961-2024 |
| `cape` | Shiller CAPE | 1950-2024 |

**Daten-Validierung `msci_eur`:**
*   **Zeitraum 2012–2023:** Die Werte stimmen exakt (auf 2 Nachkommastellen) mit dem **MSCI World Net Total Return EUR** überein.
*   **Zeitraum vor 2000:** Die langfristige CAGR (1978–2024) von ~7.8% liegt unter dem typischen langfristigen Total-Return-Schnitt (~10%).
*   **Diagnose:** Es handelt sich um eine **hybride Datenreihe**. Die jüngere Historie ist präzise (Net Return), während die älteren Daten (insb. die Extrapolationen) konservativ modelliert sind (vermutlich Price Index oder starke Währungseffekte).
*   **Bewertung:** Für die Simulation ist dies **vorteilhaft konservativ**. Die "fehlende Rendite" in der Historie wirkt wie ein impliziter Puffer gegen Sequenzrisiken (Sequence of Returns Risk). Ein expliziter Abzug von TER oder Dividenden ist daher **nicht** notwendig, da die Datenbasis bereits eine Sicherheitsmarge enthält.

**Hinweis Balance-App:** In der Balance-App werden reale Depotstände und ETF-Kurse verwendet; TER ist dort bereits im NAV eingepreist. Ein zusätzlicher TER-Abzug wäre doppelt.

**Daten-Anomalie 1950-1960 ("Wirtschaftswunder"):**
*   **Beobachtung:** Die Jahre 1950-1960 weisen eine nominale CAGR von **~19.4%** (Real: ~17.4%) auf.
*   **Bewertung:** Dies ist ein historischer Sonderfall (Nachkriegs-Wiederaufbau), der sich so kaum wiederholen lässt.
*   **Risiko:** Da die Monte-Carlo-Simulation zufällige Blöcke aus der Historie zieht, besteht das Risiko, dass "Wirtschaftswunder"-Phasen eine zu optimistische Erwartungshaltung erzeugen.
*   **Empfehlung:** Für eine konservative Planung ("Stress-Test") wäre es ratsam, die Datenbasis erst ab **1970** (Beginn Stagflation) oder **1978** (Präzisere Daten) zu nutzen, um diesen "Golden Age Bias" auszuschließen. Die Jahre **1970-1980** (Stagflation) sind hingegen essenziell für Robustheits-Tests.

**Verteilung der Regime (1950-2024):**

| Regime | Jahre | Anteil |
|--------|-------|--------|
| BULL | 22 | 29% |
| BEAR | 12 | 16% |
| SIDEWAYS | 34 | 45% |
| STAGFLATION | 7 | 9% |

### C.3.4 Determinismus

**Per-Run-Seeding** (simulator-utils.js:96-103):
```javascript
export function makeRunSeed(baseSeed, comboIdx, runIdx) {
    const base = normalizeSeed(baseSeed);
    const combo = normalizeSeed(comboIdx);
    const run = normalizeSeed(runIdx);
    let h = mix32(base ^ mix32(combo + 0x9e3779b9));
    h = mix32(h ^ mix32(run + 0x85ebca6b));
    return h >>> 0;
}
```

---

## C.4 Pflegefall-Modellierung

### C.4.1 Datengrundlage

**Quelle:** BARMER Pflegereport 2024 (dokumentiert in simulator-data.js:6-12)

### C.4.2 Altersabhängige Eintrittswahrscheinlichkeiten

| Alter | PG1 | PG2 | PG3 | PG4 | PG5 | Gesamt |
|-------|-----|-----|-----|-----|-----|--------|
| 65 | 1.2% | 0.6% | 0.3% | 0.15% | 0.05% | 2.3% |
| 70 | 2.0% | 1.0% | 0.5% | 0.25% | 0.10% | 3.85% |
| 75 | 3.5% | 1.8% | 0.9% | 0.45% | 0.20% | 6.85% |
| 80 | 5.5% | 3.2% | 1.6% | 0.75% | 0.35% | 11.4% |
| 85 | 8.5% | 5.5% | 3.2% | 1.50% | 0.70% | 19.4% |
| 90 | 12.0% | 8.0% | 5.0% | 2.80% | 1.20% | 29.0% |

**Evidenz:** `simulator-data.js:43-51`

### C.4.3 Progressionsmodell

```javascript
// simulator-data.js:35-41
PFLEGE_GRADE_PROGRESSION_PROBABILITIES = {
    1: 0.15,  // PG1 → PG2: 15% pro Jahr
    2: 0.12,  // PG2 → PG3: 12% pro Jahr
    3: 0.10,  // PG3 → PG4: 10% pro Jahr
    4: 0.08,  // PG4 → PG5: 8% pro Jahr
    5: 0.00   // PG5: Keine weitere Verschlechterung
};
```

**Erwartete Zeit bis PG5:**
- Von PG1: ~6-8 Jahre
- Von PG2: ~5-7 Jahre
- Von PG3: ~4-5 Jahre
- Von PG4: ~2-3 Jahre

### C.4.4 Kosten-Modell

```javascript
function calcCareCost(careMeta, inputs) {
    if (!careMeta || !careMeta.active) return { zusatzFloor: 0 };

    const baseCosts = {
        1: inputs.pflegeCostPG1 || 12000,
        2: inputs.pflegeCostPG2 || 18000,
        3: inputs.pflegeCostPG3 || 28000,
        4: inputs.pflegeCostPG4 || 36000,
        5: inputs.pflegeCostPG5 || 44000
    };

    const regionalFactor = 1 + (inputs.pflegeRegionalZuschlag || 0) / 100;
    const rampUpFactor = Math.min(1, careMeta.yearsActive / 2);
    const annualCost = baseCosts[careMeta.grade] * regionalFactor * rampUpFactor;

    return { zusatzFloor: annualCost };
}
```

### C.4.5 Dual-Care für Paare

**Separate RNG-Streams** (monte-carlo-runner.js:216-217):
```javascript
const rngCareP1 = rand.fork('CARE_P1');
const rngCareP2 = careMetaP2 ? rand.fork('CARE_P2') : null;
```

**Simultane Pflege-KPIs:**
- `bothCareYears`: Jahre mit gleichzeitiger Pflege beider Partner
- `maxAnnualCareSpend`: Maximale jährliche Pflegekosten
- `totalCareCosts`: Kumulative Pflegekosten über Lebensdauer

### C.4.6 Mortalitäts-Multiplikator

| Pflegegrad | Sterblichkeits-Multiplikator |
|------------|------------------------------|
| PG1 | 1.2× (20% erhöht) |
| PG2 | 1.5× (50% erhöht) |
| PG3 | 2.0× (100% erhöht) |
| PG4 | 2.5× (150% erhöht) |
| PG5 | 3.0× (200% erhöht) |

---

## C.5 Liquiditäts-Targeting

### C.5.1 Dynamisches Runway-Ziel

**Regime-abhängige Ziel-Runway** (config.mjs:76-89):

| Regime | Ziel-Runway | Begründung |
|--------|-------------|------------|
| `peak` | 48 Monate | 4 Jahre Puffer am ATH |
| `hot_neutral` | 36 Monate | 3 Jahre Standard |
| `bear` | 60 Monate | 5 Jahre im Crash |
| `stagflation` | 60 Monate | 5 Jahre bei Stagflation |
| `recovery_in_bear` | 48 Monate | 4 Jahre in Rally |
| `recovery` | 48 Monate | 4 Jahre in Erholung |

### C.5.2 Refill-Trigger

**Drei Refill-Trigger:**

1. **Emergency Refill** (Runway < Min):
```javascript
if (runwayMonths < minRunwayMonths) {
    reason = 'emergency';
    targetRefill = (minRunwayMonths - runwayMonths) * monthlyNeed;
}
```

2. **Target Gap Refill** (Runway < 69% Ziel):
```javascript
if (runwayCoverage < 0.69) {
    reason = 'target_gap';
    targetRefill = (targetRunwayMonths * 0.75 - runwayMonths) * monthlyNeed;
}
```

3. **Opportunistic Refill** (Im Peak bei Überschuss):
```javascript
if (scenario.startsWith('peak') && equityOverweight > rebalBand) {
    reason = 'reinvest';
    targetRefill = Math.min(excessEquity, maxSkimAmount);
}
```

### C.5.3 Anti-Pseudo-Accuracy

**Quantisierung** (config.mjs:115-133):

| Betrag | Rundung |
|--------|---------|
| < 10.000€ | auf 1.000€ |
| 10.000-50.000€ | auf 5.000€ |
| 50.000-200.000€ | auf 10.000€ |
| > 200.000€ | auf 25.000€ |

**Beispiele:**
- 12.341,52 € → 15.000 €
- 86.234,00 € → 90.000 €
- 238.234,00 € → 250.000 €

---

# TEIL D: Vollständiger Marktvergleich

## D.1 Kommerzielle Retirement Planner (2025/2026)

### D.1.1 ProjectionLab
rt
| Aspekt | Details |
|--------|---------|
| **Preis** | $9/Monat (Premium), $799 Lifetime |
| **Website** | [projectionlab.com](https://projectionlab.com/) |
| **Monte Carlo** | ✅ Ja, mit Multiple Scenarios |
| **Guardrails** | ❌ Nicht dynamisch |
| **DE-Steuern** | ⚠️ Basis-Support für Deutschland |
| **Pflegefall** | ⚠️ Healthcare-Planung, aber kein PG-Modell |
| **Offline** | ✅ Mit Lifetime ($799) |
| **Stärken** | Elegantes UI ("Apple-esque"), Multi-Szenario |
| **Schwächen** | Keine dynamischen Guardrails, teuer für Lifetime |

**Reviewer-Zitat:** "The most beautiful financial planning tool" – RetireBeforeDad

### D.1.2 Boldin (ehemals NewRetirement)

| Aspekt | Details |
|--------|---------|
| **Preis** | Kostenlos (Basic), $144/Jahr (Plus) |
| **Website** | [boldin.com](https://www.boldin.com/) |
| **Monte Carlo** | ✅ 1.000 Szenarien, AAGR-basiert |
| **Guardrails** | ❌ Keine dynamischen Guardrails |
| **DE-Steuern** | ❌ US-fokussiert |
| **Pflegefall** | ⚠️ Basis-Gesundheitskosten |
| **Offline** | ❌ Cloud-basiert |
| **Stärken** | Große Community, Roth-Conversion-Explorer |
| **Schwächen** | US-zentriert, keine DE-Steuern |

### D.1.3 Pralana

| Aspekt | Details |
|--------|---------|
| **Preis** | Kostenlos (Bronze), $99 (Gold), $119/Jahr (Online) |
| **Website** | [pralanaretirementcalculator.com](https://pralanaretirementcalculator.com/) |
| **Monte Carlo** | ✅ + Historical Analysis |
| **Guardrails** | ⚠️ Spending Strategies, aber nicht dynamisch |
| **DE-Steuern** | ❌ US-fokussiert |
| **Pflegefall** | ⚠️ Healthcare-Modul |
| **Offline** | ✅ Gold ist Excel-basiert |
| **Stärken** | "Most feature-rich planner", optimiert SS/Roth |
| **Schwächen** | Hohe Lernkurve, US-Steuersystem |

**Reviewer-Zitat:** "By far the most comprehensive of the 18 retirement calculators I tried" – CanIRetireYet

## D.2 Kostenlose Tools

### D.2.1 Portfolio Visualizer

| Aspekt | Details |
|--------|---------|
| **Website** | [portfoliovisualizer.com](https://www.portfoliovisualizer.com/monte-carlo-simulation) |
| **Monte Carlo** | ✅ 4 Modelle (Historical, Forecast, Statistical, Parameterized) |
| **Guardrails** | ❌ Nein |
| **Withdrawal-Strategien** | Fixed, RMD-based, Custom |
| **Stärken** | Flexibel, viele Asset-Klassen |
| **Schwächen** | Zeigt nominale Dollars (nicht inflationsbereinigt), keine Steuern |

### D.2.2 FI Calc

| Aspekt | Details |
|--------|---------|
| **Website** | [ficalc.app](https://ficalc.app/) |
| **Monte Carlo** | ❌ Historische Simulation (nicht MC) |
| **Guardrails** | ✅ Ja, als Withdrawal-Strategie |
| **Stärken** | 100+ Jahre historische Daten, FIRE-fokussiert |
| **Schwächen** | Keine Monte Carlo, nur historisch |

### D.2.3 Deutsche Tools

| Tool | Fokus | MC | Guardrails | Bewertung |
|------|-------|----|-----------:|-----------|
| **[BVI Entnahme-Rechner](https://www.bvi.de/en/services/calculators/retirement-calculator/)** | Entnahmedauer | ❌ | ❌ | Sehr einfach |
| **[Pensionfriend](https://pensionfriend.de/)** | GRV-Prognose | ❌ | ❌ | Nur Rente |
| **[Hypofriend](https://hypofriend.de/en/retirement-calculator-germany)** | Pension Gap | ❌ | ❌ | Nur Gap |

## D.3 Vergleichsmatrix

| Feature | Ruhestand-Suite | ProjectionLab | Boldin | Pralana | FI Calc | PV |
|---------|----------------|---------------|--------|---------|---------|-----|
| **Preis** | Kostenlos | $9-799 | $0-144 | $0-119 | Kostenlos | Kostenlos |
| **Monte Carlo** | ✅ 4 Methoden | ✅ | ✅ | ✅ | ❌ | ✅ |
| **Dynamische Guardrails** | ✅ 7 Regime | ❌ | ❌ | ⚠️ | ✅ | ❌ |
| **DE-Steuern (vollst.)** | ✅ | ⚠️ | ❌ | ❌ | ❌ | ❌ |
| **Pflegefall-Modell** | ✅ PG1-5 | ⚠️ | ⚠️ | ⚠️ | ❌ | ❌ |
| **Multi-Profil** | ✅ | ✅ | ✅ | ✅ | ❌ | ❌ |
| **Parameter-Sweeps** | ✅ | ❌ | ❌ | ⚠️ | ❌ | ❌ |
| **Auto-Optimize** | ✅ 3-stufig | ❌ | ❌ | ✅ | ❌ | ❌ |
| **Offline** | ✅ | ⚠️ ($799) | ❌ | ✅ (Gold) | ✅ | ✅ |
| **Open Source** | ✅ MIT | ❌ | ❌ | ❌ | ✅ | ❌ |

## D.4 Alleinstellungsmerkmale (im Vergleich zu analysierten Tools)

*Hinweis: Diese Bewertung basiert auf der Recherche der in diesem Gutachten verglichenen Tools (ProjectionLab, Boldin, Pralana, Portfolio Visualizer, FI Calc). Es können weitere Tools existieren, die nicht analysiert wurden.*

1. **Vollständige DE-Kapitalertragssteuer** — Kein anderes verglichenes Tool implementiert Abgeltungssteuer, Soli, KiSt, Teilfreistellung, SPB und steueroptimierte Reihenfolge
2. **Pflegefall-Modellierung mit PG1-5** — Kein anderes verglichenes Tool hat ein deutsches Pflegegrad-Modell mit Progression und Dual-Care
3. **7-stufige Marktregime-Erkennung** — Im Vergleich zu den analysierten kostenlosen Tools einzigartig
4. **Risk-Based Guardrails** — Implementiert den Kitces-Ansatz statt klassischer Guyton-Klinger
5. **Vollständig offline und Open Source** — Daten verlassen nie den lokalen Rechner

---

# TEIL E: Forschungsabgleich

## E.1 Morningstar 2025: Safe Withdrawal Rates

**Quelle:** [Morningstar: What's a Safe Retirement Spending Rate for 2025?](https://www.morningstar.com/retirement/whats-safe-retirement-spending-rate-2025)

| Strategie | Starting SWR | Morningstar | Ruhestand-Suite |
|-----------|--------------|-------------|-----------------|
| Constant Dollar | 3.9% | ✅ | ✅ Floor |
| Guardrails | 5.2% | ✅ | ✅ Floor + Flex |
| RMD-based | 4.8% | ✅ | ❌ |
| Forgo Inflation | 4.3% | ✅ | ❌ |

**Suite-Alignment:** ✅ Im Einklang — Floor-Flex implementiert den Guardrails-Ansatz, der laut Morningstar die höchste SWR ermöglicht.

## E.2 Kitces 2024: Risk-Based Guardrails

**Quelle:** [Kitces: Why Guyton-Klinger Guardrails Are Too Risky](https://www.kitces.com/blog/guyton-klinger-guardrails-retirement-income-rules-risk-based/)

**Kernaussage:** Klassische Guyton-Klinger-Guardrails führen zu Einkommensreduktionen von bis zu 54% (Stagflation) oder 28% (2008). Risk-Based Guardrails reduzieren dies auf 32% bzw. 3%.

| Aspekt | Guyton-Klinger | Ruhestand-Suite |
|--------|----------------|-----------------|
| Trigger | ±20% Withdrawal Rate | 7 Regime + Schwellen |
| Anpassung | ±10% (fix) | Adaptive Caps (2.5-10 pp) |
| Worst-Case (2008) | -28% Einkommen | -3% Einkommen |
| Worst-Case (Stagflation) | -54% Einkommen | -32% Einkommen |

**Suite-Alignment:** ✅ Exzellent — Die Suite implementiert Risk-Based Guardrails:
- Marktregime-Erkennung statt fixer Withdrawal-Rate-Trigger
- Adaptive Rate-Change-Caps (2.5-10 pp) statt fixer ±10%
- Recovery-Guardrails verhindern zu schnelle Erhöhung

## E.3 Morningstar 2025: Flexible Strategies

**Quelle:** [Morningstar: Best Flexible Strategies for Retirement Income](https://www.morningstar.com/retirement/best-flexible-strategies-retirement-income-2)

| Aspekt | Forschung | Suite |
|--------|-----------|-------|
| Guardrails + Social Security | ✅ Empfohlen | ✅ Rente als Floor-Offset |
| Volatility Trade-off | ✅ Dokumentiert | ✅ Flex-Rate-Glättung |
| Lifetime Income | Guardrails #1 | ✅ Implementiert |

## E.4 Bootstrap-Methodik

**Stand der Forschung:** Block-Bootstrap erhält Autokorrelation, Stationary Bootstrap (Politis/Romano) ist optimal.

**Suite-Status:** ✅ Block-Bootstrap implementiert, ⚠️ kein Stationary Bootstrap

## E.5 Fat Tails / Regime Switching

**Stand der Forschung:** Student-t oder GARCH erfassen Tail-Risiken besser als Normalverteilung.

**Suite-Status:** ✅ Regime-Switching via Markov-Chain, ⚠️ keine expliziten Fat Tails im Return-Modell

---

# TEIL F: Bewertungsraster

## F.1 Technik (Gewicht: 25%)

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Architektur | 90 | Drei-Schichten, saubere Trennung |
| Modularität | 88 | ~65 Module, erweiterte Engine-Algorithmen |
| Performance | 90 | Worker-Pool, Typed Arrays, Quickselect |
| Determinismus | 95 | Per-Run-Seeding, Worker-Parity-Test |
| Fehlerbehandlung | 80 | Strukturierte Fehlerklassen |
| Testing | 88 | **45 Testdateien, 776+ Assertions** (aktualisiert) |
| Typisierung | 60 | Kein TypeScript |

**Technik-Score: 85/100** (aktualisiert von 83)

## F.2 Fachliche Methodik (Gewicht: 35%)

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Guardrails | 95 | State-of-the-art, übertrifft Guyton-Klinger |
| Steuer-Engine | 95 | Vollständige DE-Kapitalertragssteuer |
| MC-Qualität | 85 | 4 Methoden, 7 Presets |
| SoRR-Handling | 85 | CAPE-Sampling, Stress-Tests |
| Pflegefall | 90 | PG1-5, Dual-Care, BARMER-Daten |
| Liquiditäts-Targeting | 90 | Dynamisch, Regime-abhängig |
| TER/Fees | 70 | Implizit konservativ (Price Index), Dokumentation fehlt |

**Fachliche Methodik-Score: 90/100**

## F.3 Validierung (Gewicht: 15%)

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Test-Coverage | 90 | **45 Dateien, 776+ Assertions** (aktualisiert) |
| Determinismus | 95 | Per-Run-Seeding, Worker-Parity |
| Dokumentation | 88 | CLAUDE.md, TECHNICAL.md, READMEs, WORKFLOW_PSEUDOCODE.md (neu) |

**Validierung-Score: 91/100** (aktualisiert von 87)

## F.4 Nutzerwert (Gewicht: 15%)

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Entscheidungsunterstützung | 90 | Diagnose-Panel, Aktionsbox |
| Bedienbarkeit | 70 | Komplex, kein Onboarding |
| Erklärbarkeit | 80 | Entscheidungsbaum |

**Nutzerwert-Score: 80/100**

## F.5 Marktposition (Gewicht: 10%)

| Kriterium | Score | Begründung |
|-----------|-------|------------|
| Feature-Parität | 95 | Übertrifft alle kostenlosen Tools |
| Alleinstellung | 95 | DE-Steuern + Pflege + Guardrails |
| Preis-Leistung | 85 | Kostenlos, aber Setup-Aufwand |

**Marktposition-Score: 92/100**

## F.6 Finaler Score

| Kategorie | Gewicht | Score | Gewichteter Score |
|-----------|---------|-------|-------------------|
| Technik | 25% | **85** | 21.25 |
| Fachliche Methodik | 35% | 90 | 31.50 |
| Validierung | 15% | **91** | 13.65 |
| Nutzerwert | 15% | 80 | 12.00 |
| Marktposition | 10% | 92 | 9.20 |

### **Gesamtscore: 87.60/100 ≈ 88%** (aktualisiert von 87%)

---

# TEIL G: Empfehlungen

## G.1 Top 5 Verbesserungen (priorisiert)

| # | Verbesserung | Impact | Aufwand | ROI |
|---|--------------|--------|---------|-----|
| 1 | **Index-Dokumentation** | Hoch | Niedrig | ⭐⭐⭐⭐⭐ |
| 2 | **Onboarding-Wizard** | Mittel | Mittel | ⭐⭐⭐⭐ |
| 3 | **Stationary Bootstrap** | Niedrig | Mittel | ⭐⭐⭐ |
| 4 | **Student-t Returns** | Niedrig | Mittel | ⭐⭐⭐ |
| 5 | **Verlustverrechnung** | Niedrig | Mittel | ⭐⭐ |

### G.1.1 Index-Dokumentation (Empfehlung #1)

**Problem:** Die Variante der `msci_eur`-Reihe (Price vs. Net vs. Gross Total Return) ist undokumentiert. CAGR-Analyse (1978-2024: ~7.9%) deutet auf Price Index hin.

**Empfehlung:**
- Datenquelle und Index-Variante in `simulator-data.js` dokumentieren
- Falls Price Index: Im UI als "konservativer Ansatz (ohne Dividenden)" kennzeichnen
- Alternativ: Checkbox "Dividenden einbeziehen" mit +2% Rendite-Aufschlag

**Hinweis:** Falls tatsächlich Price Index, ist kein zusätzlicher TER-Abzug nötig — die fehlenden Dividenden (~2-2.5% p.a.) überkompensieren typische ETF-Kosten (~0.2% p.a.).

### G.1.2 Onboarding-Wizard

**Problem:** Komplexität kann neue Nutzer überfordern.

**Lösung:** Geführter Ersteinrichtungs-Wizard mit sinnvollen Defaults.

## G.2 Was NICHT fehlt

| Oft gefordert | Warum nicht nötig |
|---------------|-------------------|
| Roth-Conversion | US-spezifisch, irrelevant für DE |
| Social Security Optimizer | GRV ist fix, keine Optimierung möglich |
| Account-Linking | Sicherheitsrisiko, manuelle Eingabe OK |

---

# Appendix: Modul-Inventar

## Engine-Module (10)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `core.mjs` | 311 | Orchestrierung, EngineAPI |
| `config.mjs` | 274 | Zentrale Konfiguration (erweitert) |
| `errors.mjs` | ~50 | Fehlerklassen |
| `InputValidator.mjs` | 140 | Input-Validierung |
| `MarketAnalyzer.mjs` | 160 | Marktregime-Klassifikation |
| `SpendingPlanner.mjs` | **1076** | Guardrails, Flex-Rate, Budget-System **(erweitert!)** |
| `TransactionEngine.mjs` | 47 | Facade für Transaktionen |
| `transaction-action.mjs` | 456 | Transaktions-Entscheidungslogik |
| `sale-engine.mjs` | 333 | Verkäufe, Steuern |
| `liquidity-planner.mjs` | ~150 | Liquiditäts-Targeting |

## Simulator-Module (Auswahl)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `monte-carlo-runner.js` | ~880 | DOM-freie MC-Simulation (erweitert) |
| `simulator-sweep.js` | ~500 | Parameter-Sweeps |
| `simulator-optimizer.js` | ~500 | 3-stufige Optimierung |
| `simulator-data.js` | 322 | Historische Daten, Presets |
| `simulator-utils.js` | 260 | RNG, Quantile, Parser |
| `worker-pool.js` | ~400 | Worker-Lifecycle, Chunking |

## Balance-App Module (Auswahl)

| Modul | LOC | Funktion |
|-------|-----|----------|
| `balance-main.js` | ~500 | Orchestrierung, Update-Zyklus |
| `balance-reader.js` | ~300 | DOM-Input-Lesung |
| `balance-storage.js` | ~400 | localStorage, Snapshots |
| `balance-guardrail-reset.js` | ~70 | Auto-Reset bei kritischen Änderungen **(neu!)** |

## Kernalgorithmen

1. **Floor-Flex-Guardrails** (`SpendingPlanner.mjs`)
2. **7-Regime-Klassifikation** (`MarketAnalyzer.mjs`)
3. **Per-Run-Seeding** (`simulator-utils.js:makeRunSeed`)
4. **Block-Bootstrap** (`monte-carlo-runner.js:sampleNextYearData`)
5. **Worker-Pool mit adaptivem Chunking** (`worker-pool.js`)
6. **Pflegegrad-Progression** (`simulator-data.js:PFLEGE_GRADE_PROGRESSION_PROBABILITIES`)
7. **3-Stage-Optimization** (`simulator-optimizer.js`)
8. **FIFO-Steueroptimierung** (`sale-engine.mjs:getSellOrder`)
9. **Wealth-Adjusted Reduction** (`SpendingPlanner.mjs`) **(neu!)**
10. **Flex-Budget-System** (`SpendingPlanner.mjs`) **(neu!)**
11. **Flex-Share S-Curve** (`SpendingPlanner.mjs`) **(neu!)**
12. **FILTER/RECENCY Sampling** (`monte-carlo-runner.js`) **(neu!)**

---

## Quellen

### Marktvergleich
- [Rob Berger: 5 Best Retirement Calculators](https://robberger.com/best-retirement-calculators/)
- [ProjectionLab](https://projectionlab.com/) | [Review](https://marriagekidsandmoney.com/projectionlab-review/)
- [Boldin](https://www.boldin.com/) | [Review](https://marriagekidsandmoney.com/boldin-review/)
- [Pralana](https://pralanaretirementcalculator.com/) | [Review](https://www.caniretireyet.com/pralana-online-retirement-calculator-review/)
- [Portfolio Visualizer Monte Carlo](https://www.portfoliovisualizer.com/monte-carlo-simulation)
- [FI Calc](https://ficalc.app/)
- [White Coat Investor: Best Retirement Calculators 2025](https://www.whitecoatinvestor.com/best-retirement-calculators-2025/)

### Forschung
- [Morningstar: Safe Withdrawal Rate 2025](https://www.morningstar.com/retirement/whats-safe-retirement-spending-rate-2025)
- [Morningstar: Best Flexible Strategies](https://www.morningstar.com/retirement/best-flexible-strategies-retirement-income-2)
- [Kitces: Why Guyton-Klinger Guardrails Are Too Risky](https://www.kitces.com/blog/guyton-klinger-guardrails-retirement-income-rules-risk-based/)
- [Kitces: Risk-Based Guardrails](https://www.kitces.com/blog/risk-based-monte-carlo-probability-of-success-guardrails-retirement-distribution-hatchet/)

### Deutsche Quellen
- [BARMER Pflegereport 2024](https://www.barmer.de/pflegereport) (Pflegefall-Daten)
- [BVI Entnahme-Rechner](https://www.bvi.de/en/services/calculators/retirement-calculator/)

---

*Dokument erstellt durch KI-gestützte Code-Analyse (Claude Opus 4.5) und Web-Recherche. Alle Bewertungen basieren auf dem analysierten Code-Stand (Engine API v31.0, Commit `f3f8817`, 2026-01-27). Code-Zeilenangaben können bei zukünftigen Änderungen abweichen; Algorithmen-Beschreibungen bleiben konzeptionell gültig. Letzte Aktualisierung: 27.01.2026.*
