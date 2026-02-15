# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**Ruhestand-Suite** is a local-first retirement planning tool with two browser apps sharing a common calculation engine. The codebase is in German. No external runtime dependencies — runs entirely in the browser.

- **Balance-App** (`Balance.html`) — Annual withdrawal planning, liquidity management, diagnostics, expenses check
- **Simulator** (`Simulator.html`) — Monte Carlo simulations, parameter sweeps, auto-optimization, historical backtest

## Key Commands

```bash
npm run build:engine                  # Bundle engine/*.mjs → engine.js (ALWAYS after engine changes)
npm test                              # Run all tests (49 files, 835 assertions)
node tests/run-single.mjs <file>      # Run single test file
QUICK_TESTS=1 npm test                # Quick subset only
npm run tauri:dev                     # Tauri desktop dev mode
npm run tauri:build                   # Production build → RuhestandSuite.exe
```

Tests use `assert()`, `assertEqual()`, `assertClose()` globals defined in `tests/run-tests.mjs`.

## Architecture

### Three-Layer Structure

1. **Engine** (`engine/*.mjs` → bundled `engine.js`) — Pure calculation logic, exposed as global `EngineAPI`
2. **Balance-App** (`app/balance/`, 28 modules) — Single-year planning: Reader → Engine → Renderer → Storage
3. **Simulator** (`app/simulator/`, 59 modules) — Multi-year analysis with Web Worker parallelization

**Critical rule:** Always modify source in `engine/`, never edit `engine.js` directly.

### Engine Pipeline (`engine/core.mjs`)

```
Input → InputValidator → MarketAnalyzer (7 regimes) → [Dynamic Flex/VPW override]
      → SpendingPlanner (guardrails, flex rate) → TransactionEngine (liquidity, rebalancing)
      → Result { ui, newState, diagnosis }
```

### Simulator Execution Chain

- `monte-carlo-runner.js` — DOM-free simulation loop (runs in main thread AND workers)
- `simulator-engine-wrapper.js` → `simulator-engine-direct.js` — Engine facade
- `workers/worker-pool.js` + `workers/mc-worker.js` — Parallel execution with deterministic per-run seeding
- `sweep-runner.js` — Parameter sweep (also DOM-free, worker-compatible)
- `simulator-optimizer.js` — 4-stage auto-optimization (LHS → Quick-Filter → Refine → Train/Test)

### Key Design Patterns

- **DOM-free runners:** `*-runner.js` files contain no DOM access — usable in workers
- **UI facades:** `*-ui.js` files isolate DOM access from business logic
- **File extensions:** `.mjs` = Node.js (engine, tests, build); `.js` = browser (app code)
- **Determinism:** Seeded RNG (`simulator-utils.js`), worker chunking must not affect results
- **Native ES6 imports only** — no bundler for app code, engine is the only bundled component

### Dynamic Flex (VPW)

VPW-based dynamic withdrawal calculation in `engine/core.mjs`:
- Formula: `flex = max(0, wealth × vpwRate × goGoMultiplier − floor)`
- Expected real return: CAPE-weighted, EMA-smoothed (alpha=0.35), clamped [0%, 5%]
- Horizon: mortality-table-based (app layer: `simulator-engine-helpers.js`), engine receives only `horizonYears`
- Config: `engine/config.mjs` → `SPENDING_MODEL.DYNAMIC_FLEX`
- Balance-App feature gate: requires `capeRatio > 0`
- MC integration: `computeDynamicFlexHorizonForYear()` in `monte-carlo-runner.js` recalculates per year

## Development Workflow

### Making Engine Changes

1. Modify source in `engine/*.mjs`
2. `npm run build:engine`
3. `npm test`
4. Test in browser (both Balance.html and Simulator.html)

### Adding Simulator Parameters

- Input reading: `simulator-portfolio-inputs.js` (`getCommonInputs()`)
- Sweep-eligible: add to `SWEEP_ALLOWED_KEYS` in `simulator-sweep-utils.js`
- Auto-optimize: add bounds in `auto-optimize-params.js` (`isValidCandidate()`)
- Protect partner fields via blocklist if needed

### Worker Integration

Workers use `Transferable` objects (not `SharedArrayBuffer`) for Tauri compatibility. Chunk size adapts via time budget. Stall detection uses progress timestamps. System falls back to serial on worker failures.

## Documentation Structure

```
README.md, QUICKSTART.md, LICENSE.md              # Root: user-facing
docs/guides/                                       # Step-by-step guides
docs/reference/                                    # Stable references
  ├── ARCHITEKTUR_UND_FACHKONZEPT.md               # Main technical/domain reference
  ├── TECHNICAL.md                                 # Architecture, data flows
  ├── BALANCE_MODULES_README.md                    # Balance module details
  └── SIMULATOR_MODULES_README.md                  # Simulator module details
docs/internal/archive/                             # Completed project artifacts (YYYY-feature/)
engine/README.md                                   # Engine-specific docs
tests/README.md                                    # Test suite docs
```

### After Changes

- Engine changes → update `docs/reference/TECHNICAL.md` and `engine/README.md`
- New modules → update corresponding `*_MODULES_README.md`
- New features → update `README.md` and `docs/reference/ARCHITEKTUR_UND_FACHKONZEPT.md`

## Important Constraints

- **No over-engineering** — don't add features beyond requirements
- **No premature abstractions** — three similar lines beat a premature helper
- **No backwards-compatibility hacks** — delete unused code completely
- Chromium-based browsers and Firefox; File System Access API is Chromium-only
