import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const repoRoot = path.resolve(__dirname, '..');
const coverageRoot = path.join(repoRoot, '.coverage');
const v8CoverageDir = path.join(coverageRoot, 'v8');

fs.rmSync(coverageRoot, { recursive: true, force: true });
fs.mkdirSync(v8CoverageDir, { recursive: true });

const testResult = spawnSync(
    process.execPath,
    [path.join(__dirname, 'run-tests.mjs')],
    {
        cwd: repoRoot,
        stdio: 'inherit',
        env: {
            ...process.env,
            NODE_V8_COVERAGE: v8CoverageDir
        }
    }
);

if (testResult.status !== 0) {
    process.exit(testResult.status ?? 1);
}

const reportResult = spawnSync(
    process.execPath,
    [path.join(__dirname, 'coverage-report.mjs')],
    {
        cwd: repoRoot,
        stdio: 'inherit',
        env: process.env
    }
);

process.exit(reportResult.status ?? 1);
