#!/usr/bin/env node
/**
 * Module: Build Engine
 * Purpose: Builds the Engine bundle (ESM -> IIFE or Module Wrapper).
 *          Uses esbuild if available, otherwise creates a fallback module wrapper.
 * Usage: node build-engine.mjs
 * Dependencies: esbuild (optional), fs, path
 */

import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { writeFile } from 'node:fs/promises';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const entryFile = path.join(__dirname, 'engine', 'index.mjs');
const outputFile = path.join(__dirname, 'engine.js');
const strictBuild = (() => {
    const strictEnv = String(process.env.ENGINE_BUILD_STRICT || '').toLowerCase();
    const ciEnv = String(process.env.CI || '').toLowerCase();
    return strictEnv === '1' || strictEnv === 'true' || ciEnv === '1' || ciEnv === 'true';
})();

/**
 * Erstellt den Bundle-Build mit esbuild.
 * @returns {Promise<boolean>} true, falls der esbuild-Run erfolgreich war.
 */
async function buildWithEsbuild() {
    try {
        const { build } = await import('esbuild');

        await build({
            entryPoints: [entryFile],
            outfile: outputFile,
            format: 'iife',
            bundle: true,
            globalName: 'RuhestandEngineBundle',
            sourcemap: false,
            footer: {
                js: [
                    'const api = RuhestandEngineBundle.EngineAPI;',
                    'if (typeof globalThis !== "undefined") {',
                    '  globalThis.EngineAPI = api;',
                    '  // Legacy compat: Ruhestandsmodell_v30 is deprecated, use EngineAPI',
                    '  globalThis.Ruhestandsmodell_v30 = api;',
                    '}',
                    ''
                ].join('\n')
            }
        });

        console.log('✓ Engine erfolgreich mit esbuild gebündelt.');
        return true;
    } catch (error) {
        // Spezifische Behandlung, falls esbuild fehlt (typisch in Offline-Umgebungen)
        if (error.code === 'ERR_MODULE_NOT_FOUND' || /Cannot find module 'esbuild'/i.test(error.message)) {
            console.warn('⚠️  esbuild nicht verfügbar. Führe Fallback-Build aus.');
            return false;
        }

        console.error('❌ esbuild-Build fehlgeschlagen:', error);
        throw error;
    }
}

/**
 * Schreibt einen einfachen Modul-Fallback, der die Engine-Einstiege exportiert
 * und gleichzeitig Legacy-Globals bereitstellt.
 */
async function writeModuleFallback() {
    const fallbackContent = `// AUTO-GENERATED FALLBACK (kein Bundle, Modul-Import)\n`
        + `import { EngineAPI } from './engine/index.mjs';\n`
        + `if (typeof window !== 'undefined') {\n`
        + `  window.EngineAPI = EngineAPI;\n`
        + `  // Legacy compat: Ruhestandsmodell_v30 is deprecated, use EngineAPI\n`
        + `  window.Ruhestandsmodell_v30 = EngineAPI;\n`
        + `}\n`
        + `export { EngineAPI };\n`
        + `export { EngineAPI as Ruhestandsmodell_v30 }; // Legacy alias\n`;

    await writeFile(outputFile, fallbackContent, 'utf8');
    console.log('ℹ️  Fallback-Build ohne esbuild erstellt (engine.js als Modul-Wrapper).');
}

/**
 * Haupt-Entry: versucht zuerst den regulären Bundler, fällt andernfalls zurück.
 */
async function main() {
    const bundlerAvailable = await buildWithEsbuild();
    if (!bundlerAvailable) {
        if (strictBuild) {
            throw new Error("Strict build active: esbuild fehlt. Installieren Sie 'esbuild' oder deaktivieren Sie ENGINE_BUILD_STRICT.");
        }
        await writeModuleFallback();
    }
}

main().catch((error) => {
    console.error('Build abgebrochen:', error);
    process.exitCode = 1;
});
