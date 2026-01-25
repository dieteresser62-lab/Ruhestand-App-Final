
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

function parsePercent(str) {
    if (!str) return 0;
    return parseFloat(str.replace('%', '').trim()) / 100;
}

const fileContent = fs.readFileSync('log.txt', 'utf8');
const lines = fileContent.trim().split('\n');
const headers = lines[0].split('\t').map(h => h.trim());

const data = [];
for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const row = {};
    headers.forEach((h, idx) => {
        row[h] = cols[idx];
    });
    data.push(row);
}

const anomalies = [];

for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const year = row['Jahr'];

    // Parse Values
    const handlG = parseCurrency(row['Handl.G']);
    const st = parseCurrency(row['St.']);

    const gldVor = parseCurrency(row['Gld_vorR']); // Use 'vorR' or 'Gold' from prev year?
    // Actually Detail columns are best: 
    // Flow: Gld_nachR (after return) + Buy/Sell = Gld_nachK (End)
    // Buy is negative Handl, Sell is positive Handl.
    // So: Gld_nachR - HandlG? = Gld_nachK.

    const gldNachR = parseCurrency(row['Gld_nachR']);
    const gldNachK = parseCurrency(row['Gld_nachK']);

    const impliedHandl = gldNachR - gldNachK; // If 100 -> 90, Handl is 10 (Sale). If 100 -> 110, Handl is -10 (Buy).

    // Check 1: Handl.G consistency
    if (Math.abs(impliedHandl - handlG) > 5000) { // 5k tolerance for rounding
        // Check if Handl.G matches St. (The Tax Bug)
        let isTaxMirror = false;
        if (st > 0 && Math.abs(handlG - st) < 2000) {
            isTaxMirror = true;
        }

        anomalies.push({
            year,
            type: 'GoldFlow',
            msg: `Gold Flow Mismatch. Asset changed by ${-impliedHandl} (Buy/Sell), but Log Handl.G says ${handlG}.`,
            isTaxMirror,
            handlG,
            st,
            impliedHandl
        });
    }
}

console.log(JSON.stringify(anomalies, null, 2));
