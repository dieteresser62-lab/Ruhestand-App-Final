
import { TransactionEngine } from './engine/transactions/TransactionEngine.mjs';
import { CONFIG } from './engine/config.mjs';

const mockProfile = {
    isDynamic: true,
    minRunwayMonths: 24,
    runway: {
        hot_neutral: { total: 36 }
    }
};

const mockMarket = {
    sKey: 'hot_neutral',
    seiATH: 1.0
};

const mockInput = {
    floorBedarf: 12000,
    flexBedarf: 6000,
    minCashBufferMonths: 12,
    runwayMinMonths: 24,
    runwayTargetMonths: 36
    // Note: No 'minCashBufferMonths' initially to test default, then with it.
};

const inflatedBedarf = {
    floor: 0, // Pension covers it
    flex: 6000
};

console.log("--- TEST 1: Default Buffer (2 months) ---");
// Simulate missing minCashBufferMonths (defaults to 2)
let result = TransactionEngine.calculateTargetLiquidity(mockProfile, mockMarket, inflatedBedarf, mockInput);
console.log(`Expected (approx): 2 * 1500 = 3000 (or absolute min 10000). Result: ${result}`);

console.log("\n--- TEST 2: User Scenario (12 months) ---");
mockInput.minCashBufferMonths = 12;
result = TransactionEngine.calculateTargetLiquidity(mockProfile, mockMarket, inflatedBedarf, mockInput);
console.log(`Expected: 12 * 1500 = 18000. Result: ${result}`);

console.log("\n--- TEST 3: String Inputs (Simulation of potential UI issue) ---");
mockInput.floorBedarf = "12000";
mockInput.flexBedarf = "6000";
result = TransactionEngine.calculateTargetLiquidity(mockProfile, mockMarket, inflatedBedarf, mockInput);
console.log(`Result with strings: ${result}`);
