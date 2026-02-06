
import fs from 'fs';
import path from 'path';

function parseCurrency(str) {
    if (!str) return 0;
    // Handle "90k €" -> 90000, "986 €", etc.
    let val = str.replace('€', '').trim();
    if (val === '') return 0;
    let factor = 1;
    if (val.endsWith('k')) {
        factor = 1000;
        val = val.slice(0, -1);
    }
    // Remove dots/commas if needed, but assuming JS format float roughly
    // The inputs like "1852k" are clean. "986 €" is clean.
    return parseFloat(val) * factor;
}

function parsePercent(str) {
    if (!str) return 0;
    return parseFloat(str.replace('%', '').trim()) / 100;
}

const resolveLogPath = () => {
    const candidates = [
        path.join(process.cwd(), 'audit', 'logs', 'log.txt'),
        path.join(process.cwd(), 'log.txt')
    ];
    for (const candidate of candidates) {
        if (fs.existsSync(candidate)) return candidate;
    }
    throw new Error('Keine Log-Datei gefunden. Erwartet: audit/logs/log.txt oder log.txt');
};

const fileContent = fs.readFileSync(resolveLogPath(), 'utf8');
const lines = fileContent.trim().split('\n');
const headers = lines[0].split('\t');

const data = [];
for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split('\t');
    const row = {};
    headers.forEach((h, idx) => {
        row[h.trim()] = cols[idx];
    });
    data.push(row);
}

// Map short col names to readable
function getVal(row, col) {
    if (!row) return 0;
    if (['Entn.', 'Floor', 'Rente1', 'Rente2', 'RenteSum', 'FloorDep', 'Flex€', 'Entn_real',
        'Handl.A', 'Handl.G', 'St.', 'Aktien', 'Gold', 'Liq.', 'Liq@rC-', 'Zins€', 'Liq@rC+',
        'ZielLiq', 'NeedLiq', 'GuardG', 'GuardA', 'Akt_vorR', 'Akt_nachR', 'Akt_nachV', 'Akt_nachK',
        'Gld_vorR', 'Gld_nachR', 'Gld_nachV', 'Gld_nachK'].includes(col)) {
        return parseCurrency(row[col]);
    }
    if (['Flex%', 'Adj%', 'Quote%', 'Runway%', 'Pf.Akt%', 'Pf.Gld%', 'Infl.'].includes(col)) {
        return parsePercent(row[col]);
    }
    return row[col];
}

console.log("Analyzing Log...");
console.log("----------------------------------------------------------------");

for (let i = 0; i < data.length; i++) {
    const row = data[i];
    const year = row['Jahr'];
    const prevRow = i > 0 ? data[i - 1] : null;

    const errors = [];
    const notes = [];

    // --- Asset Flows for Gold ---
    const gldVorR = getVal(row, 'Gld_vorR');
    const gldNachR = getVal(row, 'Gld_nachR');
    const gldNachK = getVal(row, 'Gld_nachK');
    const pfGldPct = getVal(row, 'Pf.Gld%');

    // Return Check
    const expectedNachR = gldVorR * (1 + pfGldPct);
    const diffReturnGld = Math.abs(expectedNachR - gldNachR);
    if (diffReturnGld > 2000) {
        errors.push(`Gold Return Math: Start ${gldVorR} * (1+ ${pfGldPct}) = ${expectedNachR.toFixed(0)}, but log says ${gldNachR}. Diff: ${diffReturnGld.toFixed(0)}`);
    }

    // Details Check: Relationship between nachR and nachK vs Handl.G
    const netChangeDetail = gldNachK - gldNachR;
    const handlG = getVal(row, 'Handl.G');
    // Handl.G > 0 => Sale (Money comes IN to Liq, Gold goes OUT). 
    // Handl.G < 0 => Purchase (Money OUT, Gold IN).
    // So ChangeInGold should be approx -(Handl.G). (Ignoring taxes/costs).

    // Anomaly: In 2022, Handl.G is -44k (Buy). Detail Gold +44k. Consistent.
    // Anomaly: In 2012, Handl.G is 70k (Sale). Detail Gold -64k? (70->6). Consistent.

    const impliedChange = -handlG;
    if (Math.abs(netChangeDetail - impliedChange) > 3000) {
        errors.push(`Gold Transaction Consistency (Detail): Detail changed by ${netChangeDetail}, but Handl.G is ${handlG} (implies change ${impliedChange}). Diff ${Math.abs(netChangeDetail - impliedChange)}.`);
    }

    // Summary vs Detail Check (The Phantom Gold)
    const summaryGold = getVal(row, 'Gold');
    if (Math.abs(summaryGold - gldNachK) > 2000) {
        errors.push(`CRITICAL: Gold Summary (${summaryGold}) != Gold Detail (${gldNachK}). Phantom Asset Bug!`);
    }

    // --- Asset Flows for Stocks ---
    const aktVorR = getVal(row, 'Akt_vorR');
    const aktNachR = getVal(row, 'Akt_nachR');
    const aktNachK = getVal(row, 'Akt_nachK');
    const pfAktPct = getVal(row, 'Pf.Akt%');

    // Return
    const expectedAktNachR = aktVorR * (1 + pfAktPct);
    if (Math.abs(expectedAktNachR - aktNachR) > 5000) {
        errors.push(`Stock Return Math: Start ${aktVorR} * ${pfAktPct} = ${expectedAktNachR.toFixed(0)}, log ${aktNachR}.`);
    }

    // Summary vs Detail
    const summaryAkt = getVal(row, 'Aktien');
    if (Math.abs(summaryAkt - aktNachK) > 2000) {
        errors.push(`Stock Summary (${summaryAkt}) != Stock Detail (${aktNachK}).`);
    }

    // --- Liquidity Flow ---
    const liqEnd = getVal(row, 'Liq.');
    let liqStart = 0;
    if (i === 0) {
        liqStart = getVal(row, 'Liq@rC-'); // Approximation for Year 0? Or assume unknown.
        // Actually Liq@rC- is usually Liq_Start.
    } else {
        liqStart = getVal(prevRow, 'Liq.');
    }

    const entn = getVal(row, 'Entn.');
    const zins = getVal(row, 'Zins€');
    const handlA = getVal(row, 'Handl.A');
    const tax = getVal(row, 'St.');
    const rente = getVal(row, 'RenteSum');

    // Model A: Entn is Net. Flow = Start - Entn + Zins + NetHandel - Tax
    const calcLiqA = liqStart - entn + zins + handlA + handlG - tax;

    const diffA = liqEnd - calcLiqA;
    // Check if diff corresponds to anything observable
    if (Math.abs(diffA) > 4000) {
        // Maybe Rente is relevant?
        const calcLiqB = calcLiqA + rente;
        const diffB = liqEnd - calcLiqB;
        if (Math.abs(diffB) > 4000) {
            errors.push(`Liq Flow Mismatch: End=${liqEnd}, Expected=${calcLiqA}. Diff=${diffA}. (With Rente Added: Diff=${diffB})`);
        } else {
            // Consistent with Rente included
            notes.push(`Liq Flow OK (Rente included)`);
        }
    } else {
        notes.push(`Liq Flow OK (Rente excluded/netted)`);
    }

    if (errors.length > 0) {
        console.log(`\nYEAR ${year}:`);
        errors.forEach(e => console.log(`  - ANOMALY: ${e}`));
    }
}
