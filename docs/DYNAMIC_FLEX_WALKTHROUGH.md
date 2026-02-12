# Walkthrough: Dynamic Flex Implementation

## Overview
This walkthrough covers the verification of the "Dynamic Flex" (Variable Percentage Withdrawal) implementation across the Simulator and Balance App. The feature allows for dynamic withdrawal rates based on market conditions (CAPE), survival probability, and "Go-Go" years.

## 1. Simulator Implementation (T00-T11)
The core logic resides in the Simulator, where the "Dynamic Flex" mode can be activated.

### Key Features Verified:
- **Dynamic Horizon**: The withdrawal period adjusts annually based on the user's age and survival probability (`survivalQuantile`).
- **CAPE-Based Adjustment**: Withdrawal rates are modulated by the Cyclically Adjusted Price-to-Earnings ratio.
- **Go-Go Years**: Early retirement years can have boosted withdrawals (`goGoMultiplier`).
- **Auto-Optimization**: The generic optimizer now supports finding the best Dynamic Flex parameters (Horizon, Quantile, Multiplier).

### Files to Check:
- `app/simulator/simulator-engine-direct.js`: Orchestrates the Engine calls with dynamic inputs.
- `app/simulator/auto_optimize.js`: Handles optimization loops.
- `app/simulator/auto-optimize-params.js`: Defines safe evaluation limits.

## 2. Balance App Integration (T12-T13)
The Balance App integrates these features in a "Passive" mode.

### Behavior:
- **Read-Only Parameters**: The Balance App reads Dynamic Flex settings (`sim_horizonYears`, `sim_survivalQuantile`, etc.) directly from `localStorage`.
- **No UI Controls**: To avoid UI clutter, there are **no direct input fields** for these parameters in `Balance.html`. Users must configure them in the Simulator first.
- **CAPE Automation**: The App automatically fetches CAPE data (`balance-annual-marketdata.js`) during the Annual Update.

### How to Test:
1. Open **Simulator**, configure "Dynamic Flex" settings, and run a simulation to save settings to `localStorage`.
2. Open **Balance App** and trigger a "Jahres-Update".
3. Verify in the Console or Diagnosis panel that the withdrawal rate reflects the Dynamic Flex logic (if enabled).

## 3. Documentation (T14)
- **TECHNICAL.md**: Updated to describe the internal data flow of Dynamic Flex and CAPE automation.
- **IMPLEMENTATION_TICKETS.md**: All tickets (T00-T14) are marked as DONE.

## Known Limitations
- The Balance App does not display the current "Dynamic Flex" parameters in its UI. It acts as a consumer of the Simulator's configuration.
