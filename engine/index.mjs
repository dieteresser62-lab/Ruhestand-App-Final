/**
 * ===================================================================
 * ENGINE ENTRY MODULE
 * ===================================================================
 * Zentrale Bündel- und Re-Export-Datei für die Ruhestand-Engine.
 * Sie exportiert die modernen ESM-Schnittstellen und publiziert bei
 * Bedarf die Legacy-Globals (EngineAPI) für
 * bestehende Oberflächen.
 * ===================================================================
 */

import { EngineAPI, _internal_calculateModel } from './core.mjs';

// ESM-Exporte für moderne Importe
export { EngineAPI, _internal_calculateModel };

// Default-Export behält den Engine-Einstieg bei
export default {
    EngineAPI,
    _internal_calculateModel
};

// Optional: Legacy-Globals für Direktnutzung ohne Bundle (z. B. in Modul-Skripten)
if (typeof window !== 'undefined') {
    // Defensive Zuweisung, um Überschreibungen nur bei Bedarf vorzunehmen
    window.EngineAPI = window.EngineAPI || EngineAPI;
}
