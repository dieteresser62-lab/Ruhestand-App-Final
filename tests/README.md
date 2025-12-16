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

## Key Test Files
- **`core-engine.test.mjs`**: Validates `EngineAPI.simulateSingleYear`. Useful for testing pure financial logic without UI overhead.
- **`scenarios.test.mjs`**: Validates specific complex life scenarios (Care Case, Survivor/Widow, Market Crash). Ensures the system behaves robustly under stress.
- **`parity.test.mjs`**: **Critical Parity Check**. Verifies that the Simulator App and the Balance App (via `EngineAPI`) produce **identical** financial results for identical inputs.
- **`simulation.test.mjs`**: Validates `simulateOneYear` from `simulator-engine.js`. This is the most complex test as it integrates the entire simulation loop.
- **`portfolio.test.mjs`**: Validates pure helper functions like `sumDepot` and `buyGold`.

## Assertions Available
- `assert(condition, message)`
- `assertEqual(actual, expected, message)`
- `assertClose(actual, expected, tolerance, message)`

## Debugging
If tests fail, extensive console logging is printed to stdout. You can isolate tests by modifying `run-tests.mjs` or simply running a specific test file directly: `node tests/my-test.test.mjs`.
