#!/usr/bin/env node
'use strict';

/**
 * Build Script für die Engine
 * Fügt alle Module zu einer einzigen Browser-kompatiblen Datei zusammen
 */

const fs = require('fs');
const path = require('path');

// Module in der richtigen Reihenfolge (Abhängigkeiten zuerst)
const modules = [
    'engine/errors.js',
    'engine/config.js',
    'engine/validators/InputValidator.js',
    'engine/analyzers/MarketAnalyzer.js',
    'engine/planners/SpendingPlanner.js',
    'engine/transactions/TransactionEngine.js',
    'engine/core.js',
    'engine/adapter.js'
];

console.log('Building engine.js...');

let output = `'use strict';

/**
 * ===================================================================
 * RUHESTANDSMODELL ENGINE v31.0 (Modularized & Bundled)
 * ===================================================================
 *
 * Diese Datei wurde automatisch aus mehreren Modulen zusammengebaut.
 * Um den Code zu bearbeiten, ändern Sie die Quelldateien im engine/ Verzeichnis
 * und führen Sie dann 'node build-engine.js' aus.
 *
 * MODULE STRUCTURE:
 * ===================================================================
 *
 * engine/
 * ├── errors.js                    # Fehlerklassen
 * ├── config.js                    # Zentrale Konfiguration
 * ├── validators/
 * │   └── InputValidator.js        # Eingabevalidierung
 * ├── analyzers/
 * │   └── MarketAnalyzer.js        # Marktanalyse
 * ├── planners/
 * │   └── SpendingPlanner.js       # Ausgabenplanung
 * ├── transactions/
 * │   └── TransactionEngine.js     # Transaktionslogik
 * ├── core.js                      # Orchestrierung & EngineAPI
 * └── adapter.js                   # Simulator-V5-Adapter
 *
 * ===================================================================
 */

(function(global) {
    // Simuliere require() für Browser
    const moduleCache = {};
    function require(modulePath) {
        if (moduleCache[modulePath]) {
            return moduleCache[modulePath];
        }
        throw new Error('Module not found: ' + modulePath);
    }

`;

// Jedes Modul lesen und verarbeiten
for (const modulePath of modules) {
    const fullPath = path.join(__dirname, modulePath);
    console.log(`  Reading ${modulePath}...`);

    let content = fs.readFileSync(fullPath, 'utf8');

    // Entferne 'use strict' am Anfang
    content = content.replace(/^'use strict';\s*\n/, '');

    // Entferne require() Aufrufe und ersetze sie durch direkten Zugriff
    content = content.replace(/const \{ ([^}]+) \} = require\('([^']+)'\);?/g, (match, imports, path) => {
        return `// Imported from ${path}: ${imports}`;
    });
    content = content.replace(/const (\w+) = require\('([^']+)'\);?/g, (match, varName, path) => {
        return `// Imported from ${path}: ${varName}`;
    });

    // Entferne module.exports am Ende
    content = content.replace(/\/\/ Exporte[\s\S]*?if \(typeof module !== 'undefined'[\s\S]*?\n\}/g, '');

    // Füge Modul-Export am Ende hinzu
    const moduleName = path.basename(modulePath, '.js');
    content += `\n    // Export für ${modulePath}\n`;
    content += `    moduleCache['${modulePath}'] = `;

    if (modulePath.includes('errors.js')) {
        content += '{ AppError, ValidationError, FinancialCalculationError }';
    } else if (modulePath.includes('config.js')) {
        content += '{ ENGINE_API_VERSION, ENGINE_BUILD_ID, CONFIG }';
    } else if (modulePath.includes('InputValidator.js')) {
        content += 'InputValidator';
    } else if (modulePath.includes('MarketAnalyzer.js')) {
        content += 'MarketAnalyzer';
    } else if (modulePath.includes('SpendingPlanner.js')) {
        content += 'SpendingPlanner';
    } else if (modulePath.includes('TransactionEngine.js')) {
        content += 'TransactionEngine';
    } else if (modulePath.includes('core.js')) {
        content += '{ EngineAPI, _internal_calculateModel }';
    } else if (modulePath.includes('adapter.js')) {
        content += 'Ruhestandsmodell_v30_Adapter';
    }
    content += ';\n\n';

    output += `    // ========================================\n`;
    output += `    // ${modulePath}\n`;
    output += `    // ========================================\n`;
    output += content;
}

// Schließe die IIFE und exportiere die APIs
output += `
    // Globale Exporte
    global.EngineAPI = moduleCache['engine/core.js'].EngineAPI;
    global.Ruhestandsmodell_v30 = moduleCache['engine/adapter.js'];

})(typeof window !== 'undefined' ? window : this);
`;

// Schreibe die gebündelte Datei
fs.writeFileSync(path.join(__dirname, 'engine.js'), output, 'utf8');

console.log('✓ engine.js successfully built!');
console.log('  Size:', Math.round(output.length / 1024), 'KB');
