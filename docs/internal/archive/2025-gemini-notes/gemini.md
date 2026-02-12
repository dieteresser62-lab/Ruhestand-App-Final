# GEMINI.md

This file provides guidance to Gemini (Google's AI) when working with code in this repository.

## Project Overview

**Ruhestand-App-Final** (Retirement Planning Suite) is a local-first retirement planning tool consisting of two applications:
- **Balance-App** - Annual withdrawal planning, liquidity management, and diagnostics
- **Simulator** - Monte Carlo simulations, parameter sweeps, and long-term care scenarios

Both apps share a common calculation engine and run entirely in the browser without external dependencies. The codebase is in German with extensive technical documentation.

## Key Commands

### Build
```bash
npm run build:engine
```
Bundles the engine modules (`engine/*.mjs`) into `engine.js` using esbuild (or module fallback). Always run after modifying engine code.

### Testing
```bash
npm test                              # Run all tests
node tests/run-single.mjs <file>      # Run single test file
QUICK_TESTS=1 npm test                # Quick test subset only
```

Tests are located in `tests/*.test.mjs` and use a simple assertion framework defined in `tests/run-tests.mjs`.

### Tauri Desktop Build
```bash
npm run tauri:dev                     # Development mode
npm run tauri:build                   # Production build (creates RuhestandSuite.exe)
```

## Architecture

### Three-Layer Structure

1. **Engine Layer** (`engine/*.mjs` → `engine.js`)
   - Modular ES6 calculation engine bundled into single file
   - Validation → Market Analysis → Spending Planning → Transaction Logic
   - Exposed as global `EngineAPI` object (version 31)
   - Build creates deterministic build ID in `engine/config.mjs`

2. **Balance-App** (`Balance.html` + `balance-*.js`)
   - Seven specialized modules for single-year planning
   - Chain: Reader → Engine → Renderer → Storage
   - Local persistence via `localStorage` and File System Access API

3. **Simulator** (`Simulator.html` + `simulator-*.js`)
   - 20+ modules for Monte Carlo simulations and optimization
   - Web Worker parallelization for MC/Sweep/Auto-Optimize
   - Deterministic seeding ensures reproducibility across worker chunks

## Critical Rules

1. **Engine Modification:** Always modify source modules in `engine/`, never edit `engine.js` directly. The bundle is generated and should be version-controlled.
2. **Language:** UI and some business logic are in German. Maintain this for user-facing strings. Technical comments and code structure follow standard English conventions where applicable, but many variables and functions are in German or Denglish (e.g., `depot-tranchen`).
3. **Module Boundaries:** Native ES6 imports only for app code. No bundlers except for the engine.
4. **Determinism:** Ensure all simulation logic remains deterministic (use seeded RNG).

## Code Organization

- `*.mjs` - ES modules for Node.js (engine source, tests, build scripts)
- `*.js` - ES modules for browser (app code)
- `*-runner.js` - DOM-free execution logic (worker-compatible)
- `*-ui.js` - DOM access facades
- `*-utils.js` - Pure utility functions
- `*.test.mjs` - Test files

## Documentation Reference

- `README.md` - User guide and workflows
- `TECHNICAL.md` - Deep dive into architecture and data flows
- `QUICKSTART.md` - Quick start guide for new users
- `BALANCE_MODULES_README.md` - Module breakdown for the Balance app
- `SIMULATOR_MODULES_README.md` - Module breakdown for the Simulator
- `engine/README.md` - Engine details
- `tests/README.md` - Test suite documentation (45 test files)
- `docs/` - Specific feature documentation and design specs
