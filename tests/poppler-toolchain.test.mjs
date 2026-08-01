import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
    comparePopplerVersions,
    isPopplerVersionCompatible,
    parsePopplerVersion,
    popplerToolCandidates,
    resolvePopplerTool
} from '../scripts/lib/poppler-toolchain.mjs';

console.log('--- Poppler Toolchain Contract Tests ---');

const directory = path.dirname(fileURLToPath(import.meta.url));
const source = fs.readFileSync(
    path.join(directory, '..', 'scripts', 'lib', 'poppler-toolchain.mjs'),
    'utf8'
);

console.log('Test 1: version parsing and compatibility are monotonic');
assertEqual(
    parsePopplerVersion('pdftohtml version 25.07.0\nCopyright', 'pdftohtml'),
    '25.07.0',
    'Poppler version output should be parsed'
);
assertEqual(comparePopplerVersions('25.07.0', '25.07.0'), 0, 'Equal versions should compare equal');
assert(comparePopplerVersions('25.07.1', '25.07.0') > 0, 'Patch upgrade should compare newer');
assert(comparePopplerVersions('25.08.0', '25.07.0') > 0, 'Monthly upgrade should compare newer');
assert(isPopplerVersionCompatible('25.07.1', '25.07.0'), 'Patch upgrade should remain compatible');
assert(isPopplerVersionCompatible('25.08.0', '25.07.0'), 'Newer Poppler should remain compatible');
assert(!isPopplerVersionCompatible('25.06.9', '25.07.0'), 'Older Poppler should fail closed');
console.log('✓ monotonic version contract OK');

console.log('Test 2: resolution uses explicit portable overrides and PATH');
const environment = {
    RUHESTANDSAPP_PDFTOHTML: 'C:\\portable\\pdftohtml.exe',
    RUHESTANDSAPP_POPPLER_BIN: 'C:\\portable\\poppler\\bin'
};
assertEqual(
    JSON.stringify(popplerToolCandidates({ environment, platform: 'win32' })),
    JSON.stringify([
        'C:\\portable\\pdftohtml.exe',
        'C:\\portable\\poppler\\bin\\pdftohtml.exe',
        'pdftohtml'
    ]),
    'Resolution order should prefer explicit overrides before PATH'
);

const probes = new Map([
    ['old-pdftohtml', { status: 0, stdout: '', stderr: 'pdftohtml version 25.06.0' }],
    ['new-pdftohtml', { status: 0, stdout: '', stderr: 'pdftohtml version 25.08.0' }]
]);
const resolved = resolvePopplerTool({
    minimumVersion: '25.07.0',
    candidateExecutables: ['old-pdftohtml', 'new-pdftohtml'],
    spawnSync: executable => probes.get(executable)
});
assertEqual(resolved.executable, 'new-pdftohtml', 'Resolver should skip old Poppler and accept a newer one');
assertEqual(resolved.version, '25.08.0', 'Resolver should report the selected compatible version');
console.log('✓ portable resolution OK');

console.log('Test 3: developer-specific package paths are absent');
assert(!source.includes('oschwartz10612.Poppler_Microsoft.Winget.Source_8wekyb3d8bbwe'), 'Shared resolver must not embed a developer WinGet package directory');
assert(!source.includes('LOCALAPPDATA'), 'Shared resolver must not infer a developer-local installation tree');
console.log('✓ no developer-specific path contract OK');

console.log('✅ Poppler toolchain contract tests passed');
