# Code Quality Analysis - Ruhestand-App Repository

## Executive Summary

This repository shows solid foundational architecture with clear separation between UI and business logic, but exhibits several code quality patterns that could impact maintainability and performance. The codebase has grown organically with some duplication and concerns mixing, particularly in larger files (2000+ lines). Below is a detailed analysis with specific examples.

---

## 1. CODE DUPLICATION

### Issue 1.1: Duplicate `formatCurrency` Implementations

**Severity:** Medium | **Type:** Duplication

Multiple independent implementations of currency formatting exist across the codebase:

- **File:** `/home/user/Ruhestand-App-Final/simulator.js` (lines 4-5)
  ```javascript
  const formatCurrency = (value) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  window.formatCurrency = formatCurrency;
  ```

- **File:** `/home/user/Ruhestand-App-Final/simulator-utils.js` (line 8)
  ```javascript
  export const formatCurrency = (value) => new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }).format(value);
  ```

- **File:** `/home/user/Ruhestand-App-Final/balance-utils.js` (lines 12-21)
  ```javascript
  export const UIUtils = {
      EUR_FORMATTER: new Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' }),
      formatCurrency: val => (typeof val === 'number' && isFinite(val)) ? UIUtils.EUR_FORMATTER.format(val) : 'N/A',
  ```

**Impact:** 
- Three different implementations with varying error handling
- `balance-utils.js` returns 'N/A' for invalid values (safer)
- `simulator.js` and `simulator-utils.js` don't validate inputs
- Maintenance burden when format changes needed

**Recommendation:** Create a single shared utility module or consolidate into existing `balance-utils.js`.

---

### Issue 1.2: Duplicate Text Shortening/Formatting Functions

**Severity:** Low | **Type:** Duplication

Text shortening logic appears in multiple files:

- **File:** `/home/user/Ruhestand-App-Final/simulator.js` (lines 17-46)
  ```javascript
  const shortenText = (text) => { /* mapping logic */ };
  const shortenReasonText = (reason, szenario) => { /* formatting */ };
  ```

- **File:** `/home/user/Ruhestand-App-Final/simulator-utils.js` (lines 27-60)
  ```javascript
  export const shortenText = (text) => { /* identical */ };
  export const shortenReasonText = (reason, szenario) => { /* identical */ };
  ```

**Impact:** 
- Duplication creates synchronization issues if business rules change
- Both files maintain their own copy

**Recommendation:** Use the exported versions from `simulator-utils.js` everywhere.

---

## 2. SEPARATION OF CONCERNS

### Issue 2.1: Mixed UI and Business Logic in `balance-binder.js`

**Severity:** High | **Type:** Separation of Concerns

The `handleCsvImport` function (lines 259-350) mixes CSV parsing, date calculation, and DOM updates:

```javascript
async handleCsvImport(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
        const text = await file.text();
        
        // Parsing logic (business logic)
        const parseDate = (dateStr) => { /* ... */ };
        const parseValue = (numStr) => { /* ... */ };
        const data = text.split(/\r?\n/).slice(1).map(line => {
            const columns = line.split(';');
            if (columns.length < 5) return null;
            return { date: parseDate(columns[0]), /* ... */ };
        });
        
        // ATH calculation (business logic)
        let ath = { value: -Infinity, date: null };
        data.forEach(d => {
            if (d.close > ath.value) {
                ath.value = d.close;
                ath.date = d.date;
            }
        });
        
        // DOM manipulation (UI concerns)
        const updateField = (id, value) => {
            const el = dom.inputs[id];
            if (el) el.value = (typeof value === 'number' && isFinite(value)) ? value.toFixed(2) : '';
        };
        updateField('endeVJ', endeVjValue);
        // ... more field updates
```

**Problems:**
- CSV parsing logic should be in a separate utility module
- Date calculations are mixed with UI handlers
- Hard to test business logic independently
- Difficult to reuse parsing logic elsewhere

**File Location:** `/home/user/Ruhestand-App-Final/balance-binder.js` (lines 259-350)

---

### Issue 2.2: DOM Manipulation Directly in Rendering Functions

**Severity:** Medium | **Type:** Separation of Concerns

The `renderHandlungsanweisung` function (lines 238-327 in `balance-renderer.js`) contains both rendering logic and financial calculations:

```javascript
renderHandlungsanweisung(action, input) {
    const container = dom.outputs.handlungsanweisung;
    // ... DOM manipulation code ...
    
    // Financial calculation mixed in
    let internalRebalance = null;
    if (input) {
        const liqNachTransaktion = (input.tagesgeld + input.geldmarktEtf) + 
                                   (action.verwendungen?.liquiditaet || 0);
        let jahresentnahme = 0;
        try {
            const entnahmeText = dom.outputs.monatlicheEntnahme?.firstChild?.textContent || "0";
            const monatlich = UIUtils.parseCurrency(entnahmeText);
            if (isFinite(monatlich)) {
                jahresentnahme = monatlich * 12;
            }
        } catch (e) {
            console.warn("Fehler beim Lesen der monatlichen Entnahme...");
        }
        // ... more calculation ...
        internalRebalance = this.determineInternalCashRebalance(input, liqNachTransaktion, jahresentnahme);
    }
```

**Problems:**
- Financial calculation (`determineInternalCashRebalance`) should be separate
- Reading DOM values inside rendering function (line 301)
- Mixing data extraction with presentation

**File Location:** `/home/user/Ruhestand-App-Final/balance-renderer.js` (lines 200-327)

---

### Issue 2.3: localStorage Access Scattered Across Multiple Files

**Severity:** Medium | **Type:** Lack of Proper Abstraction

localStorage is accessed directly in multiple places instead of through a single abstraction:

- **File:** `/home/user/Ruhestand-App-Final/balance-binder.js` (line 168)
  ```javascript
  const current = localStorage.getItem('theme') || 'system';
  const next = modes[(modes.indexOf(current) + 1) % modes.length];
  localStorage.setItem('theme', next);
  ```

- **File:** `/home/user/Ruhestand-App-Final/balance-main.js` (line 304)
  ```javascript
  UIRenderer.applyTheme(localStorage.getItem('theme') || 'system');
  ```

- **File:** `/home/user/Ruhestand-App-Final/simulator-results.js` (lines 25-52)
  ```javascript
  export function loadDetailLevel(storageKey, legacyKey = LEGACY_LOG_DETAIL_KEY) {
      const stored = localStorage.getItem(storageKey);
      // ...
  }
  ```

**Impact:**
- Multiple access patterns across the codebase
- Inconsistent storage key naming
- No single point of control for storage logic

**Recommendation:** Consolidate all localStorage access into `StorageManager` module.

---

## 3. FUNCTION COMPLEXITY

### Issue 3.1: Very Long Functions (100+ lines)

**Severity:** High | **Type:** Complexity

#### `runParameterSweep()` in simulator-main.js
- **Lines:** 1278-1400+ (estimated ~600 lines)
- **Problems:** 
  - Multiple responsibilities: parameter validation, Monte Carlo simulation, heatmap rendering
  - Deeply nested loops and conditions
  - Multiple side effects (DOM updates, logging, data aggregation)

**File:** `/home/user/Ruhestand-App-Final/simulator-main.js` (starts at line 1278)

#### `runMonteCarloSimulation()` in simulator-main.js
- **Lines:** 600+ lines estimated
- **Problems:**
  - Orchestrates multiple simulation runs
  - Manages state tracking, worst-run detection, care duration logic
  - Performs heatmap generation
  - Updates multiple UI elements

**File:** `/home/user/Ruhestand-App-Final/simulator-main.js` (starts around line 400)

#### `simulateOneYear()` in simulator-engine.js
- **Lines:** 133+ (extends multiple screens)
- **Problems:**
  - Complex portfolio calculations
  - Mortality checks
  - Care metadata updates
  - Multiple nested conditionals
  - Transaction logic

**File:** `/home/user/Ruhestand-App-Final/simulator-engine.js` (line 133)

---

### Issue 3.2: Deeply Nested Code

**Severity:** High | **Type:** Complexity

**Example 1:** Nested loops and conditionals in simulator-main.js (lines 600-850)
```javascript
for (let i = 0; i < numRuns; i++) {  // Loop 1
    // ... initialization ...
    
    for (let simulationsJahr = 0; simulationsJahr < historicalData.length; simulationsJahr++) {  // Loop 2
        // ... setup ...
        
        if (stressYears > 0 && simulationsJahr < stressYears) {  // Condition 1
            stressPortfolioValues.push(portfolioTotal(simState.portfolio));
            
            if (result.logData.entnahmequote * 100 > 4.5) {  // Condition 2
                stressYearsAbove45++;
                if (stressYears > 0 && simulationsJahr >= stressYears && postStressRecoveryYears === null) {  // Condition 3
                    if (result.logData.entnahmequote * 100 < 3.5) {  // Condition 4
                        postStressRecoveryYears = simulationsJahr - (stressYears - 1);
                    }
                }
            }
        }
    }
}
```

**Cognitive Complexity:** 5+ levels deep makes this very hard to understand and test.

---

### Issue 3.3: Multiple Responsibilities Per Function

**Severity:** Medium | **Type:** Single Responsibility Principle Violation

**Example:** `handleCsvImport()` does:
1. File I/O and reading
2. CSV parsing
3. Date parsing
4. ATH calculation
5. DOM updates
6. Data validation

**File:** `/home/user/Ruhestand-App-Final/balance-binder.js` (lines 259-350)

---

## 4. NAMING AND CONSISTENCY

### Issue 4.1: Inconsistent Naming Conventions

**Severity:** Medium | **Type:** Naming

**Mixed camelCase/snake_case:**
- Variables like `jahreSeitAth` (camelCase) vs `ende_vj` (used in data)
- Database fields use `floor_brutto`, `floor_aus_depot` (snake_case)
- DOM IDs use `floorBedarf`, `goldAktiv` (camelCase)

**File:** Throughout codebase, particularly:
- `/home/user/Ruhestand-App-Final/balance-main.js`
- `/home/user/Ruhestand-App-Final/simulator-main.js`

**Example inconsistency in simulator-engine.js:**
```javascript
const baseFloor = 1000;  // camelCase
const floor_brutto = 1200;  // snake_case (from row data)
const jahresentnahme_real = 1100;  // snake_case
```

---

### Issue 4.2: Unclear Variable Names

**Severity:** Low | **Type:** Naming

**Example 1:** Abbreviated variable names are cryptic
- `vj`, `vj1`, `vj2`, `vj3` (meaning: "Vorjahr" = previous year)
- `tqf` (meaning: "Tax Qualified Fraction")
- `endeVJ` (end of previous year)

**File:** `/home/user/Ruhestand-App-Final/balance-reader.js` (lines 27-63)

**Example 2:** Single letter variables in complex logic
```javascript
const d = { /* date data */ };
const q = currentRunLog[currentRunLog.length - 1]?.QuoteEndPct || 0;
```

**File:** `/home/user/Ruhestand-App-Final/simulator-main.js`

---

### Issue 4.3: Inconsistent Module Patterns

**Severity:** Medium | **Type:** Consistency

Different module export patterns:
- **Module Pattern 1:** Exported object with methods
  ```javascript
  // balance-renderer.js
  export const UIRenderer = { render() { /* ... */ }, renderMarktstatus() { /* ... */ } };
  ```

- **Module Pattern 2:** Named functions
  ```javascript
  // simulator-results.js
  export function loadDetailLevel(storageKey, legacyKey) { /* ... */ }
  export function persistDetailLevel(storageKey, level) { /* ... */ }
  ```

- **Module Pattern 3:** Mixed
  ```javascript
  // simulator-portfolio.js
  export function getCommonInputs() { /* ... */ }
  export const DEFAULT_RISIKOPROFIL = 'sicherheits-dynamisch';
  ```

---

## 5. TECHNICAL DEBT & ADDITIONAL ISSUES

### Issue 5.1: Engine.js - Bundled Single File (2422 lines)

**Severity:** Medium | **Type:** Maintainability

The `/home/user/Ruhestand-App-Final/engine.js` file is auto-generated from modular sources but serves as the distribution bundle. While this is intentional, it makes development harder:

- Can't be directly modified (must rebuild from `/engine/` sources)
- Very difficult to navigate and understand
- 2422 lines makes searching and debugging challenging

**Comment at top (lines 1-10):**
```javascript
/**
 * Diese Datei wurde automatisch aus mehreren Modulen zusammengebaut.
 * Um den Code zu bearbeiten, ändern Sie die Quelldateien im engine/ Verzeichnis
 * und führen Sie dann 'node build-engine.js' aus.
 */
```

**File:** `/home/user/Ruhestand-App-Final/engine.js` (2422 lines)

---

### Issue 5.2: Data Transformation Layering Issues

**Severity:** Medium | **Type:** Architecture

Multiple data transformation layers without clear boundaries:

1. **Raw Input:** `dom.inputs` -> `UIReader.readAllInputs()` 
2. **Parsed Input:** `inputData` object
3. **Engine Input:** Engine-specific format
4. **Internal State:** `lastState` object
5. **UI Output:** Various formatted versions

**Problem:** Each layer may do its own validation and transformation, leading to inconsistent data.

**Files involved:**
- `/home/user/Ruhestand-App-Final/balance-main.js` (lines 105-175)
- `/home/user/Ruhestand-App-Final/balance-reader.js` (lines 22-64)
- `/home/user/Ruhestand-App-Final/simulator-portfolio.js` (line 54+)

---

### Issue 5.3: Magic Numbers and Hardcoded Values

**Severity:** Low | **Type:** Maintainability

Hardcoded threshold values scattered throughout:

**File:** `/home/user/Ruhestand-App-Final/simulator.js`
```javascript
const HEATMAP_META_MIN_TIMESHARE_ABOVE_45 = 0.02;  // 2% threshold
const HEATMAP_RED_SHARE_THRESHOLD = 0.03;           // 3% threshold
const HEATMAP_GREEN_SHARE_MIN = 0.50;               // 50% threshold
```

**Better approach:** Keep in `simulator-data.js` or a dedicated constants module.

---

### Issue 5.4: Error Handling Inconsistency

**Severity:** Medium | **Type:** Error Handling

Different error handling patterns:

**Pattern 1:** Try-catch with console.warn (simulator-engine.js)
```javascript
try {
    const entnahmeText = dom.outputs.monatlicheEntnahme?.firstChild?.textContent || "0";
} catch (e) {
    console.warn("Fehler beim Lesen der monatlichen Entnahme...");
}
```

**Pattern 2:** Throwing custom errors (balance-main.js)
```javascript
if (modelResult.error) {
    throw modelResult.error;
}
```

**Pattern 3:** Silent failures (multiple files)
```javascript
const value = parseFloat(str) || 0;  // Silently returns 0 on parse failure
```

---

## 6. SUMMARY TABLE

| Category | Issue | Severity | Count | Files |
|----------|-------|----------|-------|-------|
| **Duplication** | formatCurrency implementations | Medium | 3 | simulator.js, simulator-utils.js, balance-utils.js |
| **Duplication** | Text shortening functions | Low | 2 | simulator.js, simulator-utils.js |
| **Separation** | CSV parsing mixed with UI | High | 1 | balance-binder.js (259-350) |
| **Separation** | DOM access in render functions | Medium | 1 | balance-renderer.js (200-327) |
| **Separation** | Scattered localStorage access | Medium | 5+ | Multiple files |
| **Complexity** | Functions >100 lines | High | 3+ | simulator-main.js, simulator-engine.js |
| **Complexity** | Deeply nested code (5+ levels) | High | 2+ | simulator-main.js |
| **Complexity** | Multiple responsibilities | Medium | 3+ | balance-binder.js, simulator-main.js |
| **Naming** | Mixed case conventions | Medium | Multiple | Throughout |
| **Naming** | Unclear abbreviations | Low | 5+ | balance-reader.js, simulator-main.js |
| **Naming** | Inconsistent module patterns | Medium | 3+ | balance-renderer.js, simulator-results.js |

---

## 7. RECOMMENDATIONS

### Priority 1 (High Impact, Do First)

1. **Consolidate Utilities:** Create `/shared-utils.js` with:
   - `formatCurrency()` (with validation)
   - `shortenText()`, `shortenReasonText()`
   - Export from single location

2. **Extract CSV Parser:** Move CSV logic from `balance-binder.js` to new `csv-parser.js`
   - Pure business logic, independently testable
   - Reusable across multiple handlers

3. **Refactor Large Functions:** Break down:
   - `runParameterSweep()` → separate validation, simulation, rendering
   - `runMonteCarloSimulation()` → separate core simulation from UI updates
   - `simulateOneYear()` → extract portfolio calculations, mortality checks

### Priority 2 (Medium Impact)

4. **Centralize Storage Access:** Move all localStorage to StorageManager
5. **Standardize Naming:** Choose camelCase throughout, update abbreviations
6. **Extract Financial Calculations:** Move `determineInternalCashRebalance()` from renderer
7. **Consistent Module Exports:** Use either object pattern or named functions, not mixed

### Priority 3 (Technical Debt Reduction)

8. **Add JSDoc:** Document complex functions with parameter types
9. **Create Constants Module:** Centralize all magic numbers
10. **Improve Error Handling:** Standardize try-catch vs custom errors

