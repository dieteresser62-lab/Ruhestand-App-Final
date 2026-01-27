/**
 * Module: Engine Entry Point
 * Purpose: Central bundle and re-export module for the Retirement Engine.
 *          Exports the modern ESM interfaces (EngineAPI, _internal_calculateModel).
 * Usage: Imported by engine.js (adapter) or directly by modern modules.
 * Dependencies: core.mjs
 */
/**
 * ===================================================================
 * ENGINE ENTRY MODULE
 * ===================================================================
 * Zentrale Bündel- und Re-Export-Datei für die Ruhestand-Engine.
 * Sie exportiert die modernen ESM-Schnittstellen.
 * ===================================================================
 */

import { EngineAPI, _internal_calculateModel } from './core.mjs';

// ESM-Exporte für moderne Importe
export { EngineAPI, _internal_calculateModel };

// Default-Export
export default {
    EngineAPI,
    _internal_calculateModel
};

// Optional: Legacy-Globals für Direktnutzung ohne Bundle (z. B. in Modul-Skripten)
if (typeof window !== 'undefined') {
    // Defensive Zuweisung, um Überschreibungen nur bei Bedarf vorzunehmen
    window.EngineAPI = window.EngineAPI || EngineAPI;
}
