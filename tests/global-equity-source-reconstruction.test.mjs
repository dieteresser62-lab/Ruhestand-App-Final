import { createHash } from 'node:crypto';
import fs from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

console.log('--- Global Equity Source Reconstruction Gate ---');

const generatedModuleUrl = new URL('../app/simulator/global-equity-research-chain.js', import.meta.url);
const buildScriptUrl = new URL('../scripts/build-global-equity-research-chain.mjs', import.meta.url);
const projectRootUrl = new URL('..', import.meta.url);

function sha256(bytes) {
    return createHash('sha256').update(bytes).digest('hex');
}

const hashBefore = sha256(fs.readFileSync(generatedModuleUrl));
const result = spawnSync(process.execPath, [fileURLToPath(buildScriptUrl), '--verify-only'], {
    cwd: fileURLToPath(projectRootUrl),
    encoding: 'utf8',
    windowsHide: true
});
const hashAfter = sha256(fs.readFileSync(generatedModuleUrl));

assertEqual(result.status, 0, `Source reconstruction gate should pass: ${result.stderr || result.stdout}`);
assert(
    result.stdout.includes('Verified original-to-filtered reconstruction'),
    'Verification-only mode should confirm the original-to-filtered reconstruction gate'
);
assertEqual(hashAfter, hashBefore, 'Verification-only mode must not rewrite the generated runtime module');

console.log('✅ Global equity source reconstruction gate passed');
