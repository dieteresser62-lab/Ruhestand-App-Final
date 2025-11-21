# QUICK REFERENCE: Ruhestand-App Codebase Structure

## At a Glance
- **Total Code:** ~18,700 lines
- **Architecture:** Dual-app system (Balance + Simulator) + shared Engine
- **Status:** Stable but needs modularization
- **Main Issues:** 2 files >2000 lines, 4 files >500 lines

## Critical Files (Need Refactoring)

### CRITICAL - >2000 lines
1. **simulator.js** (2,527 lines) - Main simulator UI
   - **Issue:** Mixed UI, logic, event handling
   - **Action:** Split into 5 sub-modules
   
2. **simulator-main.js** (2,629 lines) - Orchestration & control
   - **Issue:** Monte Carlo + sweeps + backtest + exports all in one file
   - **Action:** Split into 6 feature-based modules

3. **engine.js** (2,422 lines) - Auto-generated
   - **Status:** DO NOT EDIT - modify engine/ source files instead
   - **Action:** Run `node build-engine.js` after engine changes

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
├── engine.js (bundle - edit engine/ folder)
└── engine/ (well-organized modules)
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
| simulator.js | 47 | TOO MANY |
| simulator-main.js | 33 | TOO MANY |
| simulator-engine.js | 20+ | ACCEPTABLE |
| balance-renderer.js | ~30+ (methods) | TOO MANY |
| balance-binder.js | 20+ | ACCEPTABLE |
| engine files | 5-20 ea | GOOD |

## Top 5 Refactoring Priorities

### P0 - Critical (Do These First)
1. **Document simulator.js** - Add JSDoc to all 47 functions
2. **Extract utilities** - Create `/utils` directory
3. **Create `/config`** - Centralize all configuration

### P1 - Important (Next Quarter)
4. **Split simulator.js** - 5 focused modules
5. **Split simulator-main.js** - 6 feature modules

### P2 - Helpful (After P1)
6. **Modularize balance-renderer.js** - 5-6 feature modules
7. **Split simulator-engine.js** - 4 logic modules
8. **Split balance-binder.js** - 4 concern modules

## Code Quality Metrics

### What's Good
- ✓ Dual-app design (Balance + Simulator) works well
- ✓ Engine is well-modularized (8 focused modules)
- ✓ Balance app structure is clean (6 modules)
- ✓ No external dependencies (vanilla ES6)
- ✓ Decent documentation (README, TECHNICAL.md)

### What Needs Work
- ✗ Simulator has 2 monolithic files (2500+ lines each)
- ✗ UI logic mixed with business logic
- ✗ No clear component architecture
- ✗ Configuration scattered across files
- ✗ Tests in root directory
- ✗ No JSDoc in large files

## Quick Commands

### Build the Engine
After editing files in `engine/`:
```bash
node build-engine.js
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
1. User input → `simulator.html` form
2. Monte Carlo setup → `simulator-main.js`
3. Year-by-year → `simulator-engine.js`
4. Results → `simulator-results.js`
5. Display → `simulator.js`
6. Sweep → `simulator-heatmap.js`

## File Size Distribution

```
2000+ lines: 3 files (simulator.js, simulator-main.js, engine.js)
1000-2000:  1 file  (simulator-engine.js)
500-1000:   4 files (balance-renderer, balance-binder, simulator-results, simulator-portfolio)
200-500:    6 files (heatmap, utils, data, core, config, adapter)
<200:       19 files (all in good shape)
```

## Common Issues & Solutions

### Issue: Finding where X is implemented
**Solution:** Use Grep to search
```bash
grep -r "functionName" --include="*.js" .
```

### Issue: Understanding simulator.js
**Solution:** It's 2,527 lines - break it into concerns:
- UI rendering (600 lines)
- Event handling (400 lines)
- State management (300 lines)
- Care UI (400 lines)
- Results display (400 lines)

### Issue: Engine changes not showing
**Solution:** Run `node build-engine.js` after editing `engine/` files

### Issue: Where are configs stored
**Solution:** Currently scattered:
- `balance-config.js`
- `engine/config.js`
- `simulator-data.js`
- Should consolidate to `/config` folder

## Next Steps

1. **Week 1:** Read CODEBASE_ANALYSIS.md (in project root)
2. **Week 2:** Document large files with JSDoc
3. **Week 3:** Create `/config`, `/utils`, `/data` directories
4. **Week 4:** Start splitting simulator.js (most beneficial)
5. **Week 5+:** Continue modularization per timeline

## References

- **CODEBASE_ANALYSIS.md** - Full analysis (771 lines)
- **TECHNICAL.md** - Architecture overview
- **BALANCE_MODULES_README.md** - Balance app details
- **README.md** - Project overview
- **engine/README.md** - Engine build details (if exists)

---

**Analysis Generated:** 2025-11-21
**Total Analysis Size:** 771 lines in CODEBASE_ANALYSIS.md
