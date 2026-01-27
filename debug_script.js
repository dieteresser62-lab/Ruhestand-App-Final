
/**
 * Module: Debug Script
 * Purpose: Parses a log file to verify data integrity (e.g. 2012 Gold values).
 * Usage: Standalone script (node debug_script.js).
 * Dependencies: fs
 */
import fs from 'fs';

function parseCurrency(str) {
    if (!str) return 0;
    let val = str.replace('€', '').trim();
    if (val === '') return 0;
    let factor = 1;
    if (val.endsWith('k')) {
        factor = 1000;
        val = val.slice(0, -1);
    }
    return parseFloat(val) * factor;
}

const fileContent = fs.readFileSync('log.txt', 'utf8');
const lines = fileContent.trim().split('\n');
const headers = lines[0].split('\t').map(h => h.trim());

console.log("Headers detected:", headers);

const data = [];
for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const row = {};
    headers.forEach((h, idx) => {
        row[h] = cols[idx]; // no trim needed as headers already trimmed map
    });
    data.push(row);
}

// Check 2012 specifically
const row2012 = data.find(r => r['Jahr'] === '2012');
if (row2012) {
    console.log("2012 Raw Row:", row2012);
    console.log("2012 Parsed Gold:", parseCurrency(row2012['Gold']));
    console.log("2012 Parsed Gld_nachK:", parseCurrency(row2012['Gld_nachK']));
} else {
    console.log("2012 Row not found!");
}
