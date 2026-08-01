import { spawnSync as defaultSpawnSync } from 'node:child_process';
import path from 'node:path';
import process from 'node:process';

export const POPPLER_MINIMUM_VERSION = '25.07.0';

function executableFileName(tool, platform = process.platform) {
    return platform === 'win32' ? `${tool}.exe` : tool;
}

export function parsePopplerVersion(output, tool = 'pdftohtml') {
    const escapedTool = String(tool).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = String(output ?? '').match(
        new RegExp(`${escapedTool}\\s+version\\s+([0-9]+(?:\\.[0-9]+){1,3})`, 'i')
    );
    return match?.[1] || null;
}

export function comparePopplerVersions(left, right) {
    const leftParts = String(left).split('.').map(Number);
    const rightParts = String(right).split('.').map(Number);
    const length = Math.max(leftParts.length, rightParts.length);
    for (let index = 0; index < length; index += 1) {
        const leftPart = leftParts[index] ?? 0;
        const rightPart = rightParts[index] ?? 0;
        if (!Number.isInteger(leftPart) || !Number.isInteger(rightPart)) {
            throw new TypeError(`Invalid Poppler version comparison: ${left} vs ${right}`);
        }
        if (leftPart !== rightPart) return leftPart < rightPart ? -1 : 1;
    }
    return 0;
}

export function isPopplerVersionCompatible(
    version,
    minimumVersion = POPPLER_MINIMUM_VERSION
) {
    return Boolean(version)
        && comparePopplerVersions(version, minimumVersion) >= 0;
}

export function popplerToolCandidates({
    tool = 'pdftohtml',
    environmentVariable = 'RUHESTANDSAPP_PDFTOHTML',
    environment = process.env,
    platform = process.platform,
    candidateExecutables
} = {}) {
    if (candidateExecutables) {
        return [...new Set(candidateExecutables.filter(Boolean))];
    }

    const candidates = [];
    if (environment[environmentVariable]) {
        candidates.push(environment[environmentVariable]);
    }
    if (environment.RUHESTANDSAPP_POPPLER_BIN) {
        candidates.push(path.join(
            environment.RUHESTANDSAPP_POPPLER_BIN,
            executableFileName(tool, platform)
        ));
    }
    candidates.push(tool);
    return [...new Set(candidates)];
}

export function resolvePopplerTool({
    tool = 'pdftohtml',
    environmentVariable = 'RUHESTANDSAPP_PDFTOHTML',
    minimumVersion = POPPLER_MINIMUM_VERSION,
    environment = process.env,
    platform = process.platform,
    candidateExecutables,
    spawnSync = defaultSpawnSync
} = {}) {
    const probes = [];
    for (const executable of popplerToolCandidates({
        tool,
        environmentVariable,
        environment,
        platform,
        candidateExecutables
    })) {
        const probe = spawnSync(executable, ['-v'], {
            encoding: 'utf8',
            windowsHide: true
        });
        const output = `${probe.stdout || ''}\n${probe.stderr || ''}`;
        const version = parsePopplerVersion(output, tool);
        const compatible = probe.status === 0
            && isPopplerVersionCompatible(version, minimumVersion);
        probes.push({
            executable,
            status: probe.status,
            errorCode: probe.error?.code || null,
            version,
            compatible
        });
        if (compatible) {
            return Object.freeze({
                executable,
                implementation: 'Poppler',
                tool,
                version,
                minimumVersion
            });
        }
    }

    const error = new Error(
        `Compatible Poppler ${tool} is unavailable. Install Poppler >= ${minimumVersion} `
        + `and expose ${tool} on PATH, set RUHESTANDSAPP_POPPLER_BIN, or set `
        + `${environmentVariable} to the executable.`
    );
    error.code = 'POPPLER_TOOLCHAIN_UNAVAILABLE';
    error.details = Object.freeze({
        tool,
        minimumVersion,
        environmentVariable,
        directoryEnvironmentVariable: 'RUHESTANDSAPP_POPPLER_BIN',
        probes
    });
    throw error;
}

