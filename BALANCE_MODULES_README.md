# Balance-App ES6 Module Structure

This document describes the modular structure of the Balance-App, which has been refactored from a monolithic IIFE into ES6 modules (similar to the Simulator app).

## Module Overview

The Balance-App consists of the following ES6 modules:

### 1. **balance-config.js**
Configuration and error classes.

**Exports:**
- `REQUIRED_ENGINE_API_VERSION_PREFIX` - Required engine version
- `CONFIG` - App configuration (version, storage keys)
- `AppError` - Base error class
- `ValidationError` - Validation error class
- `FinancialCalculationError` - Calculation error class
- `StorageError` - Storage error class

**Dependencies:** None

---

### 2. **balance-utils.js**
Pure utility functions for formatting and parsing.

**Exports:**
- `UIUtils` - Utility object with:
  - `EUR_FORMATTER` - Currency formatter (Intl)
  - `NUM_FORMATTER` - Number formatter (Intl)
  - `formatCurrency(val)` - Formats numbers as currency
  - `formatNumber(num)` - Formats numbers
  - `parseCurrency(str)` - Parses currency strings to numbers
  - `getThreshold(path, defaultValue)` - Safe config access

**Dependencies:** None

---

### 3. **balance-storage.js**
Persistence layer for LocalStorage, IndexedDB, and File System API.

**Exports:**
- `initStorageManager(domRefs, state, renderer)` - Initializes storage with dependencies
- `StorageManager` - Persistence object with:
  - `loadState()` - Loads state from LocalStorage
  - `saveState(state)` - Saves state to LocalStorage
  - `resetState()` - Clears all stored data
  - `initSnapshots()` - Initializes File System Access API
  - `renderSnapshots(listEl, statusEl, handle)` - Lists snapshots
  - `createSnapshot(handle)` - Creates backup snapshot
  - `connectFolder()` - Connects to filesystem folder
  - `restoreSnapshot(key, handle)` - Restores from snapshot
  - `deleteSnapshot(key, handle)` - Deletes snapshot

**Dependencies:**
- `balance-config.js` (CONFIG, StorageError)

**Injected Dependencies:**
- `dom` - DOM references
- `appState` - Application state
- `UIRenderer` - For toast notifications

---

### 4. **balance-reader.js**
Input layer for reading and applying UI inputs.

**Exports:**
- `initUIReader(domRefs)` - Initializes reader with DOM references
- `UIReader` - Input reading object with:
  - `readAllInputs()` - Reads all form inputs into structured object
  - `applyStoredInputs(storedInputs)` - Restores inputs from saved state
  - `applySideEffectsFromInputs()` - Manages UI visibility (gold panel, pension)

**Dependencies:**
- `balance-utils.js` (UIUtils)

**Injected Dependencies:**
- `dom` - DOM references

---

### 5. **balance-renderer.js**
Output layer for rendering results and UI updates.

**Exports:**
- `initUIRenderer(domRefs, storageManager)` - Initializes renderer with dependencies
- `UIRenderer` - Rendering object with 21 methods:
  - `render(ui)` - Main rendering orchestration
  - `renderMiniSummary(ui)` - Summary panel with KPIs
  - `renderBedarfAnpassungUI(inputData, persistentState)` - Inflation adjustment UI
  - `renderEntnahme(spending)` - Withdrawal display
  - `buildEntnahmeDetails(details, kuerzungQuelle)` - Withdrawal breakdown
  - `renderMarktstatus(market)` - Market status
  - `determineInternalCashRebalance(input, liqNachTransaktion, jahresentnahme)` - Cash rebalancing logic
  - `buildInternalRebalance(data)` - Rebalance UI element
  - `renderHandlungsanweisung(action, input)` - Action instructions
  - `renderLiquidityBar(percent)` - Liquidity progress bar
  - `updateDepotMetaUI()` - Depot metadata
  - `toast(msg, isSuccess)` - Toast notifications
  - `handleError(error)` - Error display
  - `clearError()` - Clears errors
  - `applyTheme(mode)` - Theme switching
  - `formatDiagnosisPayload(raw)` - Formats diagnosis data
  - `renderDiagnosis(diagnosis)` - Diagnosis rendering
  - `buildChips(d)` - Status chips
  - `buildDecisionTree(treeData)` - Decision tree visualization
  - `buildGuardrails(guardrailData)` - Guardrail cards
  - `buildKeyParams(params)` - Key parameters display

**Dependencies:**
- `balance-utils.js` (UIUtils)
- `balance-config.js` (AppError, ValidationError)

**Injected Dependencies:**
- `dom` - DOM references
- `StorageManager` - For state access

---

### 6. **balance-binder.js**
Event handling layer for user interactions.

**Exports:**
- `initUIBinder(domRefs, state, updateFn, debouncedUpdateFn)` - Initializes binder with dependencies
- `UIBinder` - Event handling object with:
  - `bindUI()` - Binds all event listeners
  - `handleFormInput(e)` - Input change events
  - `handleFormChange()` - Select/checkbox changes
  - `handleTabClick(e)` - Tab navigation
  - `handleThemeToggle()` - Theme cycling
  - `handleReset()` - Reset confirmation
  - `handleBedarfAnpassungClick(e)` - Inflation adjustment
  - `handleNachruecken()` - Year-end rollover
  - `handleUndoNachruecken()` - Undo rollover
  - `handleExport()` - JSON export
  - `handleImport(e)` - JSON import
  - `handleCsvImport(e)` - CSV import with ATH calculation
  - `handleJahresabschluss()` - Year-end snapshot
  - `handleSnapshotActions(e)` - Snapshot restore/delete
  - `handleCopyDiagnosis()` - Copy diagnosis to clipboard
  - `_applyAnnualInflation()` - Private helper for inflation
  - `_generateDiagnosisText(diagnosis)` - Private helper for diagnosis export

**Dependencies:**
- `balance-config.js` (CONFIG, AppError, StorageError)
- `balance-utils.js` (UIUtils)
- `balance-reader.js` (UIReader)
- `balance-renderer.js` (UIRenderer)
- `balance-storage.js` (StorageManager)

**Injected Dependencies:**
- `dom` - DOM references
- `appState` - Application state
- `update` - Main update function
- `debouncedUpdate` - Debounced update function

---

### 7. **balance-main.js**
Main orchestration module and application entry point.

**Exports:** None (application entry point)

**Key Functions:**
- `update()` - Main update loop (reads UI → calls Engine → renders results → saves state)
- `debouncedUpdate()` - Debounced update with 250ms delay
- `initVersionHandshake()` - Validates engine compatibility
- `init()` - Application initialization

**Dependencies:**
- `balance-config.js` (CONFIG, REQUIRED_ENGINE_API_VERSION_PREFIX)
- `balance-storage.js` (StorageManager, initStorageManager)
- `balance-reader.js` (UIReader, initUIReader)
- `balance-renderer.js` (UIRenderer, initUIRenderer)
- `balance-binder.js` (UIBinder, initUIBinder)

**External Dependencies:**
- `window.EngineAPI` - External calculation engine (neu_enginev1.js)

---

## Dependency Graph

```
balance-main.js (Entry Point)
  ↓
  ├── balance-config.js ────────────┐
  ├── balance-utils.js ─────────┐   │
  ├── balance-storage.js ───────┼───┤
  │     ↑ (injected: dom, appState, UIRenderer)
  ├── balance-reader.js ────────┤   │
  │     ↑ (injected: dom)       │   │
  ├── balance-renderer.js ──────┼───┤
  │     ↑ (injected: dom, StorageManager)
  └── balance-binder.js ────────┴───┴── (uses all modules)
        ↑ (injected: dom, appState, update, debouncedUpdate)
```

## Initialization Sequence

1. **DOMContentLoaded** triggers `init()` in `balance-main.js`
2. **Engine Handshake** - `initVersionHandshake()` validates engine compatibility
3. **DOM Caching** - All input/output elements cached in `dom` object
4. **Module Initialization** - All modules initialized with their dependencies:
   - `initUIReader(dom)`
   - `initStorageManager(dom, appState, UIRenderer)`
   - `initUIRenderer(dom, StorageManager)`
   - `initUIBinder(dom, appState, update, debouncedUpdate)`
5. **State Restoration** - `StorageManager.loadState()` → `UIReader.applyStoredInputs()`
6. **Event Binding** - `UIBinder.bindUI()`
7. **Theme Application** - `UIRenderer.applyTheme()`
8. **Snapshot Initialization** - `StorageManager.initSnapshots()`
9. **Initial Update** - `update()` runs first calculation

## Comparison to Monolithic Version

### Before (Monolithic IIFE)
- **1 file:** `js/balance/balance-app.js` (~1,946 lines)
- **Structure:** Single IIFE with all code in one file
- **Testing:** Difficult to test individual components
- **Maintenance:** Hard to navigate and modify
- **Reusability:** Components tightly coupled

### After (ES6 Modules)
- **7 files:** Separated by responsibility
- **Structure:** Clean module boundaries with dependency injection
- **Testing:** Each module can be tested in isolation
- **Maintenance:** Easy to find and modify specific functionality
- **Reusability:** Modules can be reused across apps

## Benefits of Modularization

1. **Single Responsibility** - Each module has one clear purpose
2. **Dependency Injection** - Modules don't create their own dependencies
3. **Easier Testing** - Can test modules independently
4. **Better Code Navigation** - Find code by function type
5. **Hot Module Replacement** - Works with modern dev tools
6. **Bundle Splitting** - Can lazy-load components
7. **Parallel Development** - Multiple developers can work on different modules

## Migration Notes

The refactoring was done in phases:

### Phase 1: Pure Modules (Low Risk)
- Created `balance-config.js` (no dependencies)
- Created `balance-utils.js` (uses config only)

### Phase 2: Data Layers (Medium Risk)
- Created `balance-storage.js` (uses config, utils)

### Phase 3: UI Layers (Higher Risk)
- Created `balance-reader.js` (DOM-dependent)
- Created `balance-renderer.js` (DOM-dependent)

### Phase 4: Event Layer (Highest Risk)
- Created `balance-binder.js` (uses all other modules)

### Phase 5: Main Module
- Created `balance-main.js` (orchestrates everything)

### Phase 6: HTML Update
- Updated `Balance.html` to use `<script type="module" src="balance-main.js">`

## Version History

- **v21.1** - Last monolithic version (IIFE)
- **v22.0** - ES6 Modules refactoring (current)

## Compatibility

- Requires ES6 module support (all modern browsers)
- Requires EngineAPI v31.x
- No polyfills needed for modern browsers (Chrome 61+, Firefox 60+, Safari 11+, Edge 79+)
