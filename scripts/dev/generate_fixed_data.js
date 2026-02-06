
import { HISTORICAL_DATA } from './simulator-data.js';

// The IIFE in simulator-data.js *already runs* on import in this environment (Node.js).
// So HISTORICAL_DATA should be normalized.
// We just need to print it out in a format we can copy back into the source code.

console.log('export const HISTORICAL_DATA = {');
for (const year of Object.keys(HISTORICAL_DATA).sort((a, b) => a - b)) {
    const entry = HISTORICAL_DATA[year];
    // Format numeric values to avoid long decimals if possible, but keep precision.
    // JSON.stringify handles it, but we want keys without quotes if they are numbers (or with, strictly for JSON but JS allows shorthand).
    // The existing file uses 1925: { ... }

    // We need to reconstruct the object string.
    const entries = Object.entries(entry).map(([k, v]) => {
        // Round msci_eur to 2 decimals for readability if it was normalized?
        // 1949 was 38.42, becomes 4.68.
        // Let's keep reasonable precision.
        let val = v;
        if (k === 'msci_eur') {
            // Normalized values might have many decimals. 
            // 4.68 / 38.42 is the factor. 
            // Let's stick to 2-4 decimals to be clean, or just stringify.
            val = Number(val.toFixed(4));
            // Actually, the original data has 2 decimals. 
            // Let's use 2 decimals for consistency, as the source data isn't more precise than that.
            val = Number(val.toFixed(2));
        }
        return `${k}: ${val}`;
    }).join(', ');

    console.log(`  ${year}: { ${entries} },`);
}
console.log('};');
