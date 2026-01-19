# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

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

### Engine Module Flow

```
Input
  → validators/InputValidator (validation)
  → analyzers/MarketAnalyzer (market regime classification)
  → planners/SpendingPlanner (guardrails & flex rate smoothing)
  → transactions/TransactionEngine (liquidity targets & gap-based rebalancing)
  → core.mjs (orchestration → EngineAPI)
  → Result object
```

**Critical Engine Rule:** Always modify source modules in `engine/`, never edit `engine.js` directly. The bundle is generated and should be version-controlled.

### Simulator Architecture

**Core Execution:**
- `simulator-monte-carlo.js` - UI coordinator
- `monte-carlo-runner.js` - DOM-free simulation loop (used in main thread & workers)
- `simulator-engine-wrapper.js` → `simulator-engine-direct.js` - Engine facade
- `scenario-analyzer.js` - Selects 30 representative scenarios during simulation

**Worker Parallelization:**
- `workers/worker-pool.js` - Worker lifecycle management
- `workers/mc-worker.js` - Hosts DOM-free runners, processes job chunks
- Deterministic per-run seeding prevents result changes from chunking
- Automatic fallback to serial execution on worker failures

**Parameter Sweep & Optimization:**
- `simulator-sweep.js` + `sweep-runner.js` - Parameter space exploration
- `auto_optimize.js` + `simulator-optimizer.js` - 3-stage optimization (8-10x faster than exhaustive)
- Whitelist/blocklist guards prevent modifying protected fields (e.g., second pension)
- Heatmap rendering in `simulator-heatmap.js` with invariant violation badges

### Multi-User/Household (Phase 1)

Recent addition supports household-level analysis by combining multiple profiles:
- `simulator-profile-inputs.js` - Multi-Profil Aggregation für Simulator-Inputs
- `profile-manager.js` + `profile-storage.js` - Profile switching and persistence
- Withdrawal orchestration modes: proportional, tax-first, runway-first
- See `docs/HOUSEHOLD_FEATURES.md` for detailed design decisions

## Code Organization

### Module Boundaries

**Balance-App modules** (see `BALANCE_MODULES_README.md`):
- `balance-config.js` - Configuration & error types
- `balance-utils.js` - Formatting utilities
- `balance-storage.js` - Persistence layer
- `balance-reader.js` - DOM input reading
- `balance-renderer.js` - Result rendering
- `balance-binder.js` - Event hub & keyboard shortcuts
- `balance-main.js` - Orchestrator

**Simulator modules** (see `SIMULATOR_MODULES_README.md`):
- Keep `simulator-main.js` lean (~600 lines) - it's just the UI bootstrap
- DOM-free logic belongs in `*-runner.js` files (usable in workers)
- UI facades in `*-ui.js` prevent DOM leaks into business logic
- Common utilities in `simulator-utils.js`, data/presets in `simulator-data.js`

### File Naming Conventions

- `*.mjs` - ES modules for Node.js (engine source, tests, build scripts)
- `*.js` - ES modules for browser (app code)
- `*-runner.js` - DOM-free execution logic (worker-compatible)
- `*-ui.js` - DOM access facades
- `*-utils.js` - Pure utility functions
- `*.test.mjs` - Test files

## Development Workflow

### Making Engine Changes

1. Modify source in `engine/*.mjs`
2. Run `npm run build:engine`
3. Verify `engine.js` size hasn't grown unexpectedly
4. Run `npm test` to catch regressions
5. Test both Balance.html and Simulator.html in browser

### Adding Simulator Features

**For Monte Carlo features:**
- Business logic → `monte-carlo-runner.js` (DOM-free)
- UI coordination → `simulator-monte-carlo.js`
- UI elements → `monte-carlo-ui.js`

**For new parameters:**
- Input reading → `simulator-portfolio.js` (`getCommonInputs()`)
- If sweep-eligible, add to `SWEEP_ALLOWED_KEYS` in `simulator-sweep-utils.js`
- Protect partner fields via blocklist if needed

**For optimization:**
- Multi-stage logic → `simulator-optimizer.js`
- UI integration → `auto_optimize.js` + `auto_optimize_ui.js`

### Worker Integration

Workers use `Transferable` objects (not `SharedArrayBuffer`) for Tauri compatibility:
- Deterministic seeding: each run gets unique seed
- Chunk size adapts via time budget (smooth filtered)
- Stall detection uses progress timestamps
- Detailed logs only in serial follow-up pass (workers collect aggregates)

### Testing Strategy

- Engine logic: `tests/core-engine.test.mjs`, `tests/*-planner.test.mjs`
- Simulation: `tests/simulation.test.mjs`, `tests/simulator-headless.test.mjs`
- Worker parity: `tests/worker-parity.test.mjs`
- Integration: `tests/balance-smoke.test.mjs`

Use `assert()`, `assertEqual()`, `assertClose()` global helpers.

## Important Constraints

### Code Quality
- **No over-engineering** - Don't add features beyond requirements
- **No premature abstractions** - Three similar lines beat a premature helper
- **No backwards-compatibility hacks** - Delete unused code completely
- **No security vulnerabilities** - Watch for injection attacks, XSS, etc.

### Module Philosophy
- Native ES6 imports only (no bundler for app code)
- Changes to individual modules auto-reload on browser refresh
- Engine is the only bundled component

### Browser Compatibility
- Chromium-based browsers and Firefox
- File System Access API for snapshots (Chromium only)
- For local development, use provided dev server to ensure correct MIME types for `.mjs`

### Determinism
- Monte Carlo uses seeded RNG (`simulator-utils.js`)
- Worker chunking must not affect results
- Legacy-stream mode stays serial (chunking would break RNG state)

## Documentation Structure

- `README.md` - User guide, features overview, step-by-step workflows
- `TECHNICAL.md` - Architecture, data flows, build notes
- `BALANCE_MODULES_README.md` - Balance-app module details
- `SIMULATOR_MODULES_README.md` - Simulator module details
- `engine/README.md` - Engine-specific documentation
- `docs/HOUSEHOLD_FEATURES.md` - Multi-user design decisions
- `MULTI-TRANCHEN-ANLEITUNG.md` - Tranche management guide

### After Changes
Keep documentation synchronized:
- Engine changes → Update `TECHNICAL.md` and `engine/README.md`
- New simulator modules → Update `SIMULATOR_MODULES_README.md`
- New features → Update `README.md` with user-facing instructions

## Debugging

### Worker Telemetry (Dev-Only)
Enable via URL parameter `?telemetry=true` or `localStorage.setItem('enableWorkerTelemetry','true')`:
- Job completion rates, average/min/max times
- Chunk size adaptation metrics
- Per-worker utilization and idle time
- Available via `?dev=true` panel or console output

### Debug Mode
Balance-App has debug mode (keyboard shortcut or localStorage flag) that logs:
- Engine inputs/outputs
- Market regime classifications
- Transaction decisions

### Common Issues

**Engine not loading:**
- Check browser console for MIME type errors
- Use provided dev server (not raw Python SimpleHTTPServer)
- Verify `engine.js` was regenerated after source changes

**Worker failures:**
- Check console for initialization errors
- Verify seed determinism in affected test
- System falls back to serial automatically

**State persistence issues:**
- `localStorage` quota can be exceeded (especially with tranche data)
- Check for quota errors in console
- Consider snapshot export as backup

## Performance Considerations

- **Engine size:** Target <100KB for `engine.js` bundle
- **Worker chunk size:** Adapts dynamically, typically 300-500 runs per chunk
- **MC parallelization:** Default 8 workers with 500ms time budget
- **Sweep optimization:** 3-stage coarse→refinement→verification reduces combinations by ~90%
- **Heatmap rendering:** SVG-based, efficient for typical sweep ranges (10-50 cells)

## Special Features

### Depot-Tranchen (Tranche Management)
- Detailed position tracking with FIFO/tax-optimized selling
- Automatic loading from localStorage
- Shared between Balance and Simulator
- See `depot-tranchen-manager.html` and `depot-tranchen-status.js`

### Online Data Updates
Balance-App can fetch:
- Inflation data (ECB, World Bank, OECD)
- ETF prices (Yahoo Finance/Finnhub for VWCE.DE)
- Update protocol shows data sources and values
- Requires internet connection, otherwise runs fully offline

### Accumulation Phase
Simulator supports pre-retirement accumulation:
- Configurable start age and savings rate
- Automatic transition to withdrawal phase
- See `effectiveTransitionYear` in `monte-carlo-runner.js`

### Long-term Care Scenarios
- 5 care levels (PG 0-5) with cost modeling
- Ambulatory vs. institutional care
- Regional cost adjustments
- Simultaneous care for partners
- KPI tracking per person (entry age, duration, costs)
