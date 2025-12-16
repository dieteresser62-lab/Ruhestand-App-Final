# Ruhestands-Planer Testing Infrastructure

## Overview
This directory contains the testing infrastructure for the Ruhestand-App-Final project. The tests are designed to be zero-dependency, using native Node.js ESM and a custom test runner, avoiding the need for heavy frameworks like Jest or Mocha.

## Directory Structure
- `run-tests.mjs`: The custom test runner script.
- `core-engine.test.mjs`: Unit tests for the core financial engine logic (`EngineAPI`).
- `simulation.test.mjs`: Integration tests for the full simulation loop (`simulateOneYear`).
- `portfolio.test.mjs`: Unit tests for portfolio management logic (`simulator-portfolio.js`).
- `*.test.mjs`: Any file matching this pattern is automatically picked up by the runner.

## How to Run Tests
Run the following command from the project root:

```bash
npm test
```

Or directly via Node.js:
```bash
node tests/run-tests.mjs
```

## Writing New Tests
1. Create a new file ending in `.test.mjs` in the `tests/` directory.
2. Import `assert`, `assertEqual`, `assertClose` from the global scope (provided by runner) or define them locally if testing in isolation.
3. Use standard ESM imports to test your modules.
4. **Mocking:** Since the project relies on browser globals (`window`, `document`), you may need to mock these environments in your test file before importing code. See `simulation.test.mjs` for a comprehensive example of mocking `global.window` and constructing input contexts.

## Test Coverage Areas

### 1. Financial Core (Priority 1)
- **`spending-planner.test.mjs`**: Validates 'Fail-Safe' alarm logic, Flex-Rate smoothing algorithms, and Budget Floor protection.
- **`transaction-tax.test.mjs`**: Validates tax logic (Abgeltungssteuer, TQF, Sparer-Pauschbetrag), FIFO cost-basis tracking, and tax-efficient sale optimization.
- **`liquidity-guardrail.test.mjs`**: Validates operational guardrails like Bear Market Refill Caps and Runway Coverage triggers.

### 2. Algorithms & Logic (Priority 2)
- **`monte-carlo-sampling.test.mjs`**: Validates the statistical core: Block-Bootstrap sampling and Market Regime Transition probabilities.
- **`care-meta.test.mjs`**: Validates Care Logic: Probability of care events, Cost ramping (inflation/progression), and Dual-Household Flex budget adjustments.
- **`market-analyzer.test.mjs`**: Validates Market Diagnostics: ATH drawdown detection, CAPE valuation signals, and Scenario classification (Bear/Peak/Recovery).

### 3. Utilities & Validation (Priority 3)
- **`utils.test.mjs`**: Validates core helpers: Currency formatting, Math functions (Mean/StdDev/Quantile), and RNG stability (Seeding/Forking).
- **`core-engine.test.mjs`**: Validates `EngineAPI` integrity and basic output structures.

### 4. Integration & Parity (Priority 4)
- **`parity.test.mjs`**: **Critical Parity Check**. Verifies that the Frontend Logic (`simulateOneYear`) and Worker Logic (`EngineAPI`) produce **identical spending results** across diverse scenarios (Growth, High Inflation, Crash).
- **`scenarios.test.mjs`**: End-to-End verification of complex life paths:
    - **Care Case**: Checks verifying high cost coverage.
    - **Widow/Survivor**: Checks pension reduction logic.
    - **Market Crash**: Checks emergency refill and capital preservation.
- **`simulation.test.mjs`**: Integration verification of the main simulation loop.
- **`portfolio.test.mjs`**: Unit tests for isolated portfolio operations (`buyGold`, `sumDepot`) and DOM-independent initialization.

## Assertions Available
- `assert(condition, message)`
- `assertEqual(actual, expected, message)`
- `assertClose(actual, expected, tolerance, message)`

## Debugging
If tests fail, extensive console logging is printed to stdout. You can isolate tests by modifying `run-tests.mjs` or simply running a specific test file directly: `node tests/my-test.test.mjs`.
