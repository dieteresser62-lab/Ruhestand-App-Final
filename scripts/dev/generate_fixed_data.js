
import { HISTORICAL_DATA } from '../../app/simulator/simulator-data.js';

// Print the runtime projection. Equity levels come from the generated research
// chain and must not be rounded or copied back as a second source of truth.

console.log('export const HISTORICAL_DATA = {');
for (const year of Object.keys(HISTORICAL_DATA).sort((a, b) => a - b)) {
    const entry = HISTORICAL_DATA[year];
    // Format numeric values to avoid long decimals if possible, but keep precision.
    // JSON.stringify handles it, but we want keys without quotes if they are numbers (or with, strictly for JSON but JS allows shorthand).
    // The existing file uses 1925: { ... }

    // We need to reconstruct the object string.
    const entries = Object.entries(entry).map(([k, v]) => {
        return `${k}: ${v}`;
    }).join(', ');

    console.log(`  ${year}: { ${entries} },`);
}
console.log('};');
