import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

console.log('--- Slice-09 D-17 Reconstruction Contract Tests ---');

const reconstructionSource = fs.readFileSync('tests/reconstruct-slice09-d17.mjs', 'utf8');
assert(reconstructionSource.includes("process.env.SystemRoot || 'C:\\\\Windows'"),
    'Slice-09 reconstruction pins the Windows bsdtar path independently from PATH order');
assert(!reconstructionSource.includes("run('tar',"),
    'Slice-09 reconstruction never resolves tar through a Git-Bash-influenced PATH');

const result = spawnSync(process.execPath, ['tests/reconstruct-slice09-d17.mjs'], {
    cwd: process.cwd(),
    encoding: 'utf8',
    windowsHide: true
});

assertEqual(result.status, 0, `Slice-09 reconstruction command must succeed: ${result.stderr || result.stdout}`);
assert(result.stdout.includes('Slice-09 D-17 source reconstruction passed.'),
    'Slice-09 reconstruction command must confirm the independently recomputed fixture');

console.log('✅ Slice-09 D-17 reconstruction contract tests passed');
