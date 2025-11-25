# QUICK REFERENCE: Ruhestand-App Codebase Structure

## At a Glance
- **Total Code:** ~16,000 lines
- **Architecture:** Dual-app system (Balance + Simulator) + shared Engine
- **Status:** Stable, modular structure
- **Main Files:** simulator-main.js (~3,100 lines), engine.js (~2,400 lines auto-generated)

## Critical Files

### LARGE - >2000 lines
1. **simulator-main.js** (~3,100 lines) - Main simulator orchestration
   - Contains: Monte Carlo, sweeps, backtest, exports, UI handling
   - **Status:** Functional, could be split further

2. **engine.js** (~2,400 lines) - Auto-generated Bundle/Modul-Wrapper
   - **Status:** DO NOT EDIT - modify engine/ source files instead
   - **Action:** Run `npm run build:engine` after engine changes

### LARGE - 500-1000 lines (Plan to split)
- **balance-renderer.js** (935 lines) - Split into 5-6 feature renderers
- **simulator-engine.js** (1,039 lines) - Split into 4 logic modules
- **balance-binder.js** (546 lines) - Split into 4 concern modules
- **simulator-results.js** (559 lines) - Split into 3 concern modules

## Directory Organization Issues

### Current Problems
```
Ruhestand-App-Final/
├── Balance.html, Simulator.html (entry points mixed with code)
├── balance-*.js (good structure)
├── simulator-*.js (poor structure - files too large)
├── engine.js (bundle/modul-Wrapper - edit engine/ folder)
└── engine/ (well-organized ES modules)
```

### What's Missing
- `/config` - All configuration scattered
- `/utils` - Utilities split across files
- `/data` - Data in simulator-data.js only
- `/tests` - Tests in root directory
- `/ui` - No clear UI component structure

## Functions Per File

| File | Functions | Status |
|------|-----------|--------|
| simulator-main.js | 50+ | LARGE but organized |
| simulator-engine.js | 20+ | ACCEPTABLE |
| simulator-results.js | 15+ | GOOD |
| balance-renderer.js | ~30+ (methods) | ACCEPTABLE |
| balance-binder.js | 20+ | ACCEPTABLE |
| engine files | 5-20 ea | GOOD |

## Potential Refactoring

### P1 - Would be helpful
1. **Split simulator-main.js** - Could be 4-5 feature modules
2. **Extract utilities** - Create `/utils` directory
3. **Create `/config`** - Centralize all configuration

### P2 - Nice to have
4. **Modularize balance-renderer.js** - 5-6 feature modules
5. **Split simulator-engine.js** - 4 logic modules

## Code Quality Metrics

### What's Good
- ✓ Dual-app design (Balance + Simulator) works well
- ✓ Engine is well-modularized (8 focused modules)
- ✓ Balance app structure is clean (6 modules)
- ✓ Simulator modules well-organized (main, engine, results, heatmap, portfolio, utils, data)
- ✓ No external dependencies (vanilla ES6)
- ✓ Good documentation (README, TECHNICAL.md)
- ✓ Monte Carlo with 30 selectable scenario logs

### What Could Improve
- ○ simulator-main.js is large (~3100 lines) - could be split
- ○ Configuration scattered across files
- ○ Tests in root directory

## Quick Commands

### Build the Engine
After editing files in `engine/`:
```bash
npm run build:engine
```

### Find Large Files
```bash
find . -name "*.js" -not -path "*/node_modules/*" | xargs wc -l | sort -rn | head
```

### Count Functions
```bash
grep -c "^function\|^const.*=.*function\|^export" filename.js
```

## File Navigation Guide

### Entry Points
- `Balance.html` - Balance app (liquiditätsmanagement)
- `Simulator.html` - Simulator app (Monte Carlo)
- `index.html` - Landing page

### Data Flow - Balance App
1. User input → `balance-reader.js`
2. Validation → `balance-main.js`
3. Engine call → `engine.js` (EngineAPI)
4. Render → `balance-renderer.js`
5. Store → `balance-storage.js`

### Data Flow - Simulator App
1. User input → `Simulator.html` form
2. Monte Carlo setup → `simulator-main.js`
3. Year-by-year → `simulator-engine.js`
4. Results aggregation → `simulator-results.js`
5. Sweep visualization → `simulator-heatmap.js`

## File Size Distribution

```
2000+ lines: 2 files (simulator-main.js, engine.js)
1000-2000:  1 file  (simulator-engine.js)
500-1000:   4 files (balance-renderer, balance-binder, simulator-results, simulator-portfolio)
200-500:    6 files (heatmap, utils, data, core, config, adapter)
<200:       15 files (all in good shape)
```

## Common Issues & Solutions

### Issue: Finding where X is implemented
**Solution:** Use Grep to search
```bash
grep -r "functionName" --include="*.js" .
```

### Issue: Understanding simulator-main.js
**Solution:** It's ~3,100 lines organized by feature:
- Monte Carlo simulation
- Parameter sweeps
- Backtest logic
- UI event handling
- Export functions
- Scenario log generation

### Issue: Engine changes not showing
**Solution:** Run `node build-engine.js` after editing `engine/` files

### Issue: Where are configs stored
**Solution:** Currently scattered:
- `balance-config.js`
- `engine/config.js`
- `simulator-data.js`
- Should consolidate to `/config` folder

## Next Steps (Optional Improvements)

1. Create `/config`, `/utils`, `/data` directories
2. Add more JSDoc to large files
3. Consider splitting simulator-main.js into feature modules

## References

- **TECHNICAL.md** - Architecture overview
- **BALANCE_MODULES_README.md** - Balance app details
- **README.md** - Project overview
- **engine/README.md** - Engine build details

---

**Last Updated:** 2025-11-24
