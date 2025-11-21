# RUHESTAND-APP-FINAL: CODEBASE STRUCTURE ANALYSIS

## Executive Summary

**Total Lines of Code: ~18,700+ (excluding node_modules and .git)**
- JavaScript Files: 33 files, ~16,329 lines
- HTML Files: 3 files, ~2,073 lines  
- CSS Files: 2 files, ~843 lines
- Test Files: 2 files (~417 + ~317 lines)

**Architecture:** Dual-app system (Balance + Simulator) sharing a modular Engine, using vanilla ES6 modules running entirely in the browser without build tools.

---

## PART 1: COMPLETE FILE LISTING BY SIZE

### All Files Sorted by Lines of Code

| Rank | File | Lines | Type | Size | Concern |
|------|------|-------|------|------|---------|
| 1 | simulator.js | 2,527 | JS | 130K | UI Layer - Main simulator interface |
| 2 | simulator-main.js | 2,629 | JS | 122K | **CRITICAL - Logic/UI Hybrid** |
| 3 | engine.js | 2,422 | JS | 99K | **CRITICAL - Generated bundle** |
| 4 | Simulator.html | 701 | HTML | 47K | UI Template |
| 5 | simulator-engine.js | 1,039 | JS | 45K | Logic - Monte Carlo engine |
| 6 | balance-renderer.js | 935 | JS | 43K | UI Layer - Rendering logic |
| 7 | simulator-results.js | 559 | JS | 30K | Logic - Result aggregation |
| 8 | simulator-portfolio.js | 509 | JS | 24K | Logic - Portfolio management |
| 9 | balance-binder.js | 546 | JS | 25K | Logic - Event handling |
| 10 | simulator-heatmap.js | 483 | JS | 22K | UI Layer - Heatmap visualization |
| 11 | Balance.html | 255 | HTML | 21K | UI Template |
| 12 | test-dual-care.js | 417 | JS | 14K | Tests - Care logic tests |
| 13 | sim-parity-smoketest.js | 317 | JS | 15K | Tests - Parity validation |
| 14 | simulator-data.js | 194 | JS | 13K | Data - Historical market data |
| 15 | balance-main.js | 331 | JS | 14K | Logic - Main orchestrator |
| 16 | simulator-utils.js | 320 | JS | 11K | Utils - Math/formatting helpers |
| 17 | balance-storage.js | 233 | JS | 9.0K | Logic - Persistence layer |
| 18 | index.html | 274 | HTML | 8.1K | UI - Landing page |
| 19 | engine/core.js | 288 | JS | - | Logic - Engine orchestrator |
| 20 | engine/config.js | 204 | JS | - | Config - Central config |
| 21 | engine/transactions/TransactionEngine.js | 702 | JS | - | Logic - Transaction logic |
| 22 | engine/planners/SpendingPlanner.js | 637 | JS | - | Logic - Spending plans |
| 23 | balance-config.js | 124 | JS | 3.9K | Config - Balance settings |
| 24 | css/balance.css | 596 | CSS | - | Styling - Balance app |
| 25 | engine/adapter.js | 185 | JS | - | Logic - API adapter |
| 26 | engine/analyzers/MarketAnalyzer.js | 160 | JS | - | Logic - Market analysis |
| 27 | engine/validators/InputValidator.js | 137 | JS | - | Logic - Input validation |
| 28 | balance-utils.js | 103 | JS | 4.1K | Utils - UI utilities |
| 29 | build-engine.js | 133 | JS | 4.8K | Build - Engine builder |
| 30 | simulator.css | 247 | CSS | 11K | Styling - Simulator CSS |
| 31 | balance-reader.js | 96 | JS | 3.9K | Utils - DOM input reader |
| 32 | cape-utils.js | 53 | JS | 2.2K | Utils - CAPE ratio helpers |
| 33 | engine/errors.js | 46 | JS | - | Errors - Error classes |

---

## PART 2: CRITICAL FILES REQUIRING ATTENTION (>200 lines)

### Files >500 Lines (Candidates for Splitting)

#### 1. **simulator.js** (2,527 lines) - CRITICAL
- **Purpose:** Main UI rendering and event handling for simulator
- **Functions:** 47 functions defined
- **Concerns:** 
  - Mixes UI rendering, event binding, and logic
  - Contains inline SVG rendering, form handlers, display logic
  - Large monolithic render pipeline
- **Suggested Split:**
  ```
  simulator.js → 
    - simulator-ui-core.js (base DOM/event setup, ~400 lines)
    - simulator-ui-display.js (Monte Carlo results rendering, ~600 lines)
    - simulator-ui-care.js (Care scenario UI, ~400 lines)
    - simulator-ui-controls.js (Form controls and inputs, ~400 lines)
    - simulator-ui-state.js (Local state management, ~300 lines)
  ```

#### 2. **simulator-main.js** (2,629 lines) - CRITICAL
- **Purpose:** Core simulation orchestration and parameter sweeps
- **Functions:** 33 functions defined
- **Concerns:**
  - Contains Monte Carlo orchestration (~500 lines)
  - Contains parameter sweep logic (~300 lines)
  - Contains backtest functionality (~200 lines)
  - Contains care initialization logic (~200 lines)
  - Contains export/import logic (~200 lines)
- **Structure Issues:**
  - Deep nesting of callbacks and closures
  - Multiple concerns mixed (UI binding, simulation, export, testing)
- **Suggested Split:**
  ```
  simulator-main.js →
    - simulator-orchestrator.js (Monte Carlo run coordination, ~600 lines)
    - simulator-sweep-engine.js (Parameter sweep logic, ~400 lines)
    - simulator-backtest.js (Historical backtest, ~350 lines)
    - simulator-care-init.js (Care setup/validation, ~250 lines)
    - simulator-export.js (Data export/import, ~250 lines)
    - simulator-dev-tools.js (Dev mode and self-tests, ~200 lines)
  ```

#### 3. **engine.js** (2,422 lines) - AUTO-GENERATED
- **Purpose:** Bundled Engine module combining 8 source files
- **Status:** Generated file - DO NOT EDIT DIRECTLY
- **Edit Source Files Instead:**
  - engine/errors.js (46 lines)
  - engine/config.js (204 lines)
  - engine/validators/InputValidator.js (137 lines)
  - engine/analyzers/MarketAnalyzer.js (160 lines)
  - engine/planners/SpendingPlanner.js (637 lines)
  - engine/transactions/TransactionEngine.js (702 lines)
  - engine/core.js (288 lines)
  - engine/adapter.js (185 lines)
- **Build Process:** Run `node build-engine.js` after modifying engine source files

#### 4. **simulator-engine.js** (1,039 lines)
- **Purpose:** Monte Carlo year-by-year simulation logic
- **Functions:** 20 exported + internal functions
- **Concerns:**
  - Handles year simulation, portfolio changes, care calculations
  - Contains care/mortality multiplier logic (~300 lines)
  - Contains portfolio operations (~250 lines)
  - Contains year-stepping logic (~300 lines)
- **Suggested Split:**
  ```
  simulator-engine.js →
    - simulator-engine-core.js (Year stepping, state management, ~350 lines)
    - simulator-engine-care.js (Care/mortality calculations, ~250 lines)
    - simulator-engine-portfolio.js (Portfolio operations, ~250 lines)
    - simulator-engine-data.js (Data sampling, ~150 lines)
  ```

#### 5. **balance-renderer.js** (935 lines)
- **Purpose:** Complete UI rendering layer for Balance app
- **Functions:** 1 main export function (UIRenderer object with ~30+ methods)
- **Concerns:**
  - Monolithic object with many render methods
  - Mixes visual rendering, calculation display, form updates
  - ~900 lines in a single object
- **Suggested Split:**
  ```
  balance-renderer.js →
    - balance-render-summary.js (Summary sections, ~150 lines)
    - balance-render-spending.js (Spending display, ~150 lines)
    - balance-render-market.js (Market status display, ~150 lines)
    - balance-render-guardrails.js (Guardrails & thresholds, ~200 lines)
    - balance-render-diagnostics.js (Diagnostic output, ~150 lines)
    - balance-render-toasts.js (Notifications, ~100 lines)
  ```

#### 6. **simulator-results.js** (559 lines)
- **Purpose:** Aggregates Monte Carlo results into KPIs
- **Concerns:**
  - Mixes result aggregation, formatting, and display logic
  - Result generation (~250 lines)
  - UI rendering (~180 lines)
  - Care-specific metrics (~100 lines)
- **Suggested Split:**
  ```
  simulator-results.js →
    - simulator-results-calc.js (KPI calculation, ~250 lines)
    - simulator-results-render.js (Result display, ~200 lines)
    - simulator-results-care.js (Care metrics, ~100 lines)
  ```

#### 7. **simulator-portfolio.js** (509 lines)
- **Purpose:** Portfolio initialization and management
- **Concerns:**
  - Mixes input gathering, portfolio creation, calculations
  - Input collection (~200 lines)
  - Portfolio operations (~200 lines)
  - Pension/widow logic (~110 lines)
- **Suggested Split:**
  ```
  simulator-portfolio.js →
    - simulator-inputs.js (Input gathering & validation, ~200 lines)
    - simulator-portfolio-core.js (Portfolio operations, ~150 lines)
    - simulator-pensions.js (Pension calculations, ~150 lines)
  ```

#### 8. **balance-binder.js** (546 lines)
- **Purpose:** Event binding and user interaction handling
- **Concerns:**
  - Large object with many event handlers
  - Form change handlers (~200 lines)
  - Keyboard shortcuts (~100 lines)
  - Import/Export/Snapshot logic (~150 lines)
  - Debug mode helpers (~90 lines)
- **Suggested Split:**
  ```
  balance-binder.js →
    - balance-event-handlers.js (DOM events, ~200 lines)
    - balance-keyboard.js (Keyboard shortcuts, ~100 lines)
    - balance-io.js (Import/Export/Snapshots, ~150 lines)
    - balance-debug-tools.js (Debug utilities, ~100 lines)
  ```

#### 9. **simulator-heatmap.js** (483 lines)
- **Purpose:** SVG-based heatmap rendering for parameter sweeps
- **Concerns:**
  - SVG generation logic (~200 lines)
  - Scaling/layout calculations (~150 lines)
  - Color mapping (~100 lines)
- **Suggested Split:**
  ```
  simulator-heatmap.js →
    - simulator-heatmap-render.js (SVG rendering, ~250 lines)
    - simulator-heatmap-calc.js (Scaling/layout, ~150 lines)
    - simulator-heatmap-color.js (Color scales, ~80 lines)
  ```

---

## PART 3: DIRECTORY STRUCTURE & ORGANIZATION

### Current Structure

```
Ruhestand-App-Final/
├── ROOT LEVEL - Entry Points & Config
│   ├── Balance.html              (255 lines) - Balance app entry
│   ├── Simulator.html            (701 lines) - Simulator entry
│   ├── index.html                (274 lines) - Landing page
│   ├── .gitignore
│   ├── LICENSE.md
│   ├── README.md
│   ├── TECHNICAL.md
│   └── ACHIEVEMENT_OVERVIEW.md
│
├── BALANCE APP (Jahresabschluss/Liquiditätsmanagement)
│   ├── balance-main.js           (331 lines) - Main orchestrator
│   ├── balance-binder.js         (546 lines) - Event handling
│   ├── balance-reader.js         (96 lines)  - DOM input reader
│   ├── balance-renderer.js       (935 lines) - UI rendering
│   ├── balance-storage.js        (233 lines) - Persistence (localStorage + snapshots)
│   ├── balance-config.js         (124 lines) - Configuration
│   ├── balance-utils.js          (103 lines) - Utilities
│   └── css/balance.css           (596 lines) - Styling
│
├── SIMULATOR APP (Monte Carlo & Sweeps)
│   ├── simulator.js              (2,527 lines) - Main UI ⚠️ CRITICAL
│   ├── simulator-main.js         (2,629 lines) - Orchestration ⚠️ CRITICAL
│   ├── simulator-engine.js       (1,039 lines) - Monte Carlo logic
│   ├── simulator-portfolio.js    (509 lines) - Portfolio management
│   ├── simulator-results.js      (559 lines) - Result aggregation
│   ├── simulator-heatmap.js      (483 lines) - Heatmap rendering
│   ├── simulator-utils.js        (320 lines) - Math utilities
│   ├── simulator-data.js         (194 lines) - Historical data
│   └── simulator.css             (247 lines) - Styling
│
├── SHARED ENGINE (Modular & Built)
│   ├── engine.js                 (2,422 lines) - Generated bundle ⚠️ DO NOT EDIT
│   ├── build-engine.js           (133 lines) - Build script
│   └── engine/                   - Source modules (edit these!)
│       ├── errors.js             (46 lines)
│       ├── config.js             (204 lines)
│       ├── core.js               (288 lines)
│       ├── adapter.js            (185 lines)
│       ├── validators/
│       │   └── InputValidator.js (137 lines)
│       ├── analyzers/
│       │   └── MarketAnalyzer.js (160 lines)
│       ├── planners/
│       │   └── SpendingPlanner.js (637 lines)
│       └── transactions/
│           └── TransactionEngine.js (702 lines)
│
├── UTILITIES & DATA
│   ├── cape-utils.js             (53 lines) - CAPE ratio helpers
│
└── TESTING & VALIDATION
    ├── test-dual-care.js         (417 lines) - Care logic tests
    └── sim-parity-smoketest.js   (317 lines) - Parity validation
```

---

## PART 4: MODULE ORGANIZATION BY CONCERN

### 1. DATA LAYER (Historical Data, Calculations)
- **simulator-data.js** (194 lines) - Historical market data, mortality tables, stress presets
- **cape-utils.js** (53 lines) - CAPE ratio calculations

**Issues:** Data is split across files. No centralized data directory.

**Recommendation:** Create `/data` directory:
```
data/
├── market-data.js (historical prices, CAPE)
├── mortality.js (mortality tables by age/gender)
├── care-data.js (care grades, costs)
└── stress-presets.js (market regimes, stress scenarios)
```

### 2. BUSINESS LOGIC LAYER (Calculations & Rules)
- **simulator-engine.js** (1,039 lines) - Monte Carlo stepping
- **simulator-portfolio.js** (509 lines) - Portfolio calculations
- **engine/transactions/TransactionEngine.js** (702 lines) - Transaction logic
- **engine/planners/SpendingPlanner.js** (637 lines) - Spending decisions
- **engine/analyzers/MarketAnalyzer.js** (160 lines) - Market classification
- **engine/validators/InputValidator.js** (137 lines) - Input validation
- **engine/adapter.js** (185 lines) - API compatibility

**Issues:** 
- Large monolithic files
- Engine modules could be further specialized
- Pensions/widow logic scattered across multiple files

**Recommendation:** Create `/logic` directory:
```
logic/
├── simulation/
│   ├── monte-carlo.js
│   ├── year-stepper.js
│   └── care-calculator.js
├── portfolio/
│   ├── portfolio-manager.js
│   ├── asset-operations.js
│   └── rebalancer.js
├── pensions/
│   ├── pension-calculator.js
│   └── widow-benefits.js
├── transactions/
│   └── transaction-resolver.js
└── rules/
    ├── guardrails.js
    ├── spending-rules.js
    └── market-regimes.js
```

### 3. PRESENTATION LAYER (UI & Rendering)
**Balance App:**
- **balance-main.js** (331 lines) - Orchestrator
- **balance-binder.js** (546 lines) - Event handling
- **balance-reader.js** (96 lines) - Input reading
- **balance-renderer.js** (935 lines) - Output rendering
- **balance-storage.js** (233 lines) - Persistence
- **css/balance.css** (596 lines) - Styling

**Simulator App:**
- **simulator.js** (2,527 lines) - Main UI layer
- **simulator-main.js** (2,629 lines) - Mixed orchestration/UI
- **simulator-results.js** (559 lines) - Result rendering
- **simulator-heatmap.js** (483 lines) - Heatmap visualization
- **simulator.css** (247 lines) - Styling

**Issues:**
- Extreme size disparities (balance-renderer: 935 vs simulator: 2,527)
- Heavy mixing of logic and presentation
- No clear separation of concerns within simulators

**Recommendation:** Create `/ui` directory:
```
ui/
├── balance/
│   ├── components/
│   │   ├── summary-card.js
│   │   ├── guardrail-view.js
│   │   ├── diagnostic-view.js
│   │   └── toast-notifier.js
│   ├── pages/
│   │   ├── update-page.js
│   │   └── settings-page.js
│   ├── balance-app.js (main controller)
│   └── styles.css
└── simulator/
    ├── components/
    │   ├── input-section.js
    │   ├── results-panel.js
    │   ├── heatmap-viewer.js
    │   ├── care-config.js
    │   └── care-dashboard.js
    ├── pages/
    │   ├── simulation-page.js
    │   ├── sweep-page.js
    │   └── backtest-page.js
    ├── simulator-app.js (main controller)
    └── styles.css
```

### 4. UTILITY LAYER (Helpers & Shared Functions)
- **simulator-utils.js** (320 lines) - Math, RNG, parsing, formatting
- **balance-utils.js** (103 lines) - Currency formatting, DOM helpers
- **balance-config.js** (124 lines) - Constants and config
- **engine/config.js** (204 lines) - Central engine config
- **engine/errors.js** (46 lines) - Error classes

**Issues:**
- Utilities spread across multiple files
- Some utilities might be duplicated between balance-utils and simulator-utils

**Recommendation:** Create `/utils` directory:
```
utils/
├── formatters.js (currency, numbers, text)
├── parsers.js (range parsing, etc.)
├── math.js (stats, RNG, quantiles)
├── dom-helpers.js (DOM manipulation)
├── date-helpers.js (date calculations)
└── validators.js (input validation helpers)
```

### 5. CONFIGURATION & CONSTANTS
- **balance-config.js** (124 lines) - Balance configuration
- **engine/config.js** (204 lines) - Engine configuration
- **simulator-data.js** (194 lines) - Data constants

**Issues:**
- Configuration scattered across files
- No single source of truth for app-wide constants

**Recommendation:** Create `/config` directory:
```
config/
├── app-config.js (global constants)
├── balance-config.js (Balance app settings)
├── simulator-config.js (Simulator settings)
├── engine-config.js (Engine tuning)
└── thresholds.js (all guardrail thresholds)
```

### 6. TESTING & VALIDATION
- **test-dual-care.js** (417 lines) - Care logic tests
- **sim-parity-smoketest.js** (317 lines) - Parity checks

**Issues:**
- Tests in root directory
- Mixed integration tests with actual simulation

**Recommendation:** Create `/tests` directory:
```
tests/
├── unit/
│   ├── math-utils.test.js
│   ├── validators.test.js
│   └── formatters.test.js
├── integration/
│   ├── care-pipeline.test.js
│   └── portfolio-operations.test.js
└── e2e/
    ├── balance-app.test.js
    └── simulator-app.test.js
```

---

## PART 5: CODE ORGANIZATION ISSUES

### Critical Issues

1. **Monolithic Simulator (simulator.js: 2,527 lines)**
   - ✗ Single file with 47+ functions
   - ✗ Mixes rendering, event handling, state management
   - ✗ Difficult to test individual components
   - **Impact:** Hard to maintain, impossible to isolate bugs

2. **Bundled Engine (engine.js: 2,422 lines)**
   - ✗ Generated file - any changes require rebuild
   - ✗ Cannot be debugged directly
   - ✓ Source modules are well-organized
   - **Action:** Keep source structure, ensure build process works

3. **Main Orchestrator Too Large (simulator-main.js: 2,629 lines)**
   - ✗ Handles Monte Carlo, sweeps, backtests, exports, initialization, tests
   - ✗ 33 functions doing very different things
   - ✗ Difficult to understand control flow
   - **Impact:** Hard to add new features without side effects

4. **Missing Separation of Concerns**
   - ✗ Logic mixed with UI (simulator-main.js has both)
   - ✗ Data tied to calculations (simulator-data.js embeds logic)
   - ✗ Configuration in multiple places
   - **Impact:** Changes ripple across codebase

5. **No Clear Component Structure**
   - ✗ Balance app components (6 modules) work well
   - ✗ Simulator has no component architecture
   - ✗ UI state management is implicit
   - **Impact:** Difficult to add features without full rewrite

### Moderate Issues

6. **Balance Renderer Size (935 lines)**
   - ✗ Single large object with ~30+ methods
   - ✗ Mixing different rendering concerns
   - ✗ Difficult to unit test
   - **Recommendation:** Split into feature-based sub-modules

7. **Test Files in Root**
   - ✗ No clear test directory structure
   - ✗ Mixed unit/integration tests
   - ✗ Difficult to run tests selectively
   - **Recommendation:** Organize into `/tests` with clear structure

8. **CSS Split Between Files**
   - ✗ balance.css (596 lines) vs simulator.css (247 lines)
   - ✗ No shared style library
   - ✗ Possible style duplication
   - **Recommendation:** Create base theme, component-specific styles

### Minor Issues

9. **Utility Functions Scattered**
   - ✗ Math utilities in simulator-utils.js
   - ✗ DOM utilities in balance-utils.js
   - ✗ Possible duplication
   - **Recommendation:** Consolidate into `/utils` with clear modules

10. **Documentation Gaps**
    - ✓ Good high-level docs (TECHNICAL.md, BALANCE_MODULES_README.md)
    - ✗ No inline architecture documentation
    - ✗ Missing function-level JSDoc in large files
    - **Recommendation:** Add JSDoc to all exported functions

---

## PART 6: REFACTORING ROADMAP

### Phase 1: Immediate (No Breaking Changes)
**Goal:** Understand and document existing code

1. **Add comprehensive JSDoc to large files**
   - simulator.js: document all 47 functions
   - simulator-main.js: document all 33 functions
   - simulator-engine.js: document all 20+ functions

2. **Create directory structure outline**
   - Create /utils, /config, /data directories
   - Move non-breaking files
   - Create index.js files for clean exports

3. **Extract utilities from main files**
   - Math functions from simulator-utils.js → /utils
   - Config constants → /config
   - Market data → /data

**Effort:** 40-60 hours | **Risk:** Low | **Benefit:** Foundation for larger refactors

### Phase 2: Medium Term (Small Breaking Changes)
**Goal:** Separate concerns and improve testability

1. **Split simulator.js into component modules**
   - Create simulator-ui-*.js modules
   - Unified export object
   - 5-10% bundle size increase, better maintainability

2. **Extract logic from simulator-main.js**
   - Separate Monte Carlo orchestration
   - Extract parameter sweep engine
   - Extract backtest logic
   - Extract initialization logic

3. **Modularize balance-renderer.js**
   - Split into feature-based sub-modules
   - Maintain single UIRenderer export
   - No API changes needed

**Effort:** 100-150 hours | **Risk:** Medium | **Benefit:** Significant maintainability improvement

### Phase 3: Long Term (Major Refactoring)
**Goal:** Component-based architecture with clear data flow

1. **Introduce proper state management**
   - Central state store for each app
   - Unidirectional data flow
   - Action/reducer pattern

2. **Create component hierarchy**
   - Balance: Page → Section → Component
   - Simulator: Page → Panel → Widget
   - Shared components library

3. **Build proper test infrastructure**
   - Unit tests for logic modules
   - Integration tests for data flow
   - E2E tests for user flows

**Effort:** 200-300 hours | **Risk:** High (requires rewrites) | **Benefit:** Professional-grade codebase

---

## PART 7: DETAILED RECOMMENDATIONS

### By File Size Category

#### CRITICAL (>1000 lines)
All files >1000 lines should be split into logical sub-modules within the next 2 quarters.

| File | Current | Target | Strategy |
|------|---------|--------|----------|
| simulator.js | 2,527 | 400-500 ea | Extract component sub-modules |
| simulator-main.js | 2,629 | 400-500 ea | Extract feature-based modules |
| engine.js | 2,422 | N/A (generated) | Keep, but monitor source files |
| simulator-engine.js | 1,039 | 300-350 ea | Extract care, portfolio, sampling |

#### LARGE (500-1000 lines)
These should be split into 2-3 modules within the next quarter.

| File | Current | Target | Strategy |
|------|---------|--------|----------|
| balance-renderer.js | 935 | 150-200 ea | Extract feature-specific renderers |
| simulator-results.js | 559 | 150-200 ea | Separate calc from rendering |
| simulator-portfolio.js | 509 | 150-250 ea | Separate inputs, portfolio, pensions |
| balance-binder.js | 546 | 100-200 ea | Separate events, keyboard, IO, debug |

#### MEDIUM (200-500 lines)
These are acceptable but should be monitored as they grow.

| File | Current | Status |
|------|---------|--------|
| simulator-heatmap.js | 483 | Monitor - can grow to 500 before splitting |
| engine/config.js | 204 | Good size, may need expansion points |
| engine/core.js | 288 | Acceptable, watch for creep |
| engine/transactions/TransactionEngine.js | 702 | Consider splitting into sub-concerns |
| engine/planners/SpendingPlanner.js | 637 | Consider splitting into sub-strategies |

#### SMALL (<200 lines)
These are good examples of focused modules. More modules should follow this pattern.

| File | Lines | Status |
|------|-------|--------|
| engine/adapter.js | 185 | Good size |
| simulator-data.js | 194 | Good size (though mixed concerns) |
| simulator-utils.js | 320 | Acceptable (utility module) |
| balance-storage.js | 233 | Good size |
| balance-main.js | 331 | Acceptable (simple orchestrator) |
| cape-utils.js | 53 | Excellent (focused) |
| balance-reader.js | 96 | Excellent (focused) |

---

## PART 8: RECOMMENDED DIRECTORY STRUCTURE (Target)

```
Ruhestand-App-Final/ (v2 - Refactored)
│
├── index.html                     # Landing page
├── Balance.html                   # Balance app entry
├── Simulator.html                 # Simulator app entry
│
├── src/
│   │
│   ├── config/                    # Centralized configuration
│   │   ├── app-config.js
│   │   ├── balance-config.js
│   │   ├── simulator-config.js
│   │   ├── engine-config.js
│   │   └── thresholds.js
│   │
│   ├── data/                      # Static data & constants
│   │   ├── market-data.js
│   │   ├── mortality-tables.js
│   │   ├── care-data.js
│   │   └── stress-presets.js
│   │
│   ├── utils/                     # Utility functions
│   │   ├── formatters.js
│   │   ├── parsers.js
│   │   ├── math.js
│   │   ├── dom-helpers.js
│   │   ├── date-helpers.js
│   │   └── validators.js
│   │
│   ├── logic/                     # Business logic (no UI)
│   │   ├── simulation/
│   │   │   ├── monte-carlo.js
│   │   │   ├── year-stepper.js
│   │   │   └── care-calculator.js
│   │   ├── portfolio/
│   │   │   ├── portfolio-manager.js
│   │   │   ├── asset-operations.js
│   │   │   └── rebalancer.js
│   │   ├── pensions/
│   │   │   ├── pension-calculator.js
│   │   │   └── widow-benefits.js
│   │   ├── transactions/
│   │   │   └── transaction-resolver.js
│   │   └── rules/
│   │       ├── guardrails.js
│   │       ├── spending-rules.js
│   │       └── market-regimes.js
│   │
│   ├── engine/                    # Shared calculation engine
│   │   ├── errors.js
│   │   ├── config.js
│   │   ├── core.js
│   │   ├── adapter.js
│   │   ├── validators/
│   │   │   └── InputValidator.js
│   │   ├── analyzers/
│   │   │   └── MarketAnalyzer.js
│   │   ├── planners/
│   │   │   └── SpendingPlanner.js
│   │   ├── transactions/
│   │   │   └── TransactionEngine.js
│   │   ├── build-engine.js
│   │   └── engine.js (generated)
│   │
│   ├── ui/                        # UI layer (apps)
│   │   │
│   │   ├── balance/
│   │   │   ├── components/
│   │   │   │   ├── summary-card.js
│   │   │   │   ├── guardrail-view.js
│   │   │   │   ├── diagnostic-view.js
│   │   │   │   └── toast-notifier.js
│   │   │   ├── pages/
│   │   │   │   ├── update-page.js
│   │   │   │   └── settings-page.js
│   │   │   ├── balance-app.js
│   │   │   ├── event-handlers.js
│   │   │   ├── input-reader.js
│   │   │   ├── persistence.js
│   │   │   ├── debug-tools.js
│   │   │   └── styles.css
│   │   │
│   │   └── simulator/
│   │       ├── components/
│   │       │   ├── input-section.js
│   │       │   ├── results-panel.js
│   │       │   ├── heatmap-viewer.js
│   │       │   ├── care-config.js
│   │       │   └── care-dashboard.js
│   │       ├── pages/
│   │       │   ├── simulation-page.js
│   │       │   ├── sweep-page.js
│   │       │   └── backtest-page.js
│   │       ├── simulator-app.js
│   │       ├── event-handlers.js
│   │       ├── styles.css
│   │       └── sub-modules/
│   │           ├── monte-carlo-runner.js
│   │           ├── parameter-sweep.js
│   │           ├── backtest-runner.js
│   │           └── export-import.js
│   │
│   └── tests/
│       ├── unit/
│       │   ├── math-utils.test.js
│       │   ├── validators.test.js
│       │   └── formatters.test.js
│       ├── integration/
│       │   ├── care-pipeline.test.js
│       │   └── portfolio-operations.test.js
│       └── e2e/
│           ├── balance-app.test.js
│           └── simulator-app.test.js
│
└── docs/
    ├── ARCHITECTURE.md
    ├── COMPONENT_GUIDE.md
    ├── API_REFERENCE.md
    └── MIGRATION_GUIDE.md
```

---

## SUMMARY TABLE: File Recommendations

| File | Lines | Current Status | Priority | Action | Timeline |
|------|-------|---|----------|--------|----------|
| simulator.js | 2527 | CRITICAL | P0 | Split into 5 modules | Q1 2026 |
| simulator-main.js | 2629 | CRITICAL | P0 | Split into 6 modules | Q1 2026 |
| engine.js | 2422 | Auto-gen | N/A | Edit source in engine/ | Ongoing |
| simulator-engine.js | 1039 | LARGE | P1 | Split into 4 modules | Q1 2026 |
| balance-renderer.js | 935 | LARGE | P1 | Split into 5-6 modules | Q4 2025 |
| simulator-results.js | 559 | MEDIUM | P2 | Split into 3 modules | Q4 2025 |
| simulator-portfolio.js | 509 | MEDIUM | P2 | Split into 2-3 modules | Q4 2025 |
| balance-binder.js | 546 | MEDIUM | P2 | Split into 4 modules | Q4 2025 |
| simulator-heatmap.js | 483 | MEDIUM | P3 | Monitor, split if >600 | On demand |
| All other files | <500 | GOOD | P4 | Monitor, maintain quality | Ongoing |

