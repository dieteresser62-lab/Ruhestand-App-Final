/**
 * ===================================================================
 * ENGINE ENTRY MODULE
 * ===================================================================
 * Zentrale Bündel- und Re-Export-Datei für die Ruhestand-Engine.
 * Sie exportiert die modernen ESM-Schnittstellen und publiziert bei
 * Bedarf die globale EngineAPI für bestehende Oberflächen.
 * ===================================================================
 */

import { EngineAPI, _internal_calculateModel } from './core.mjs';

// ESM-Exporte für moderne Importe
export { EngineAPI, _internal_calculateModel };

// Default-Export bündelt die Kern-APIs, damit bestehende Importe stabil bleiben
export default { EngineAPI, _internal_calculateModel };

// Optional: Global für Direktnutzung ohne Bundle (z. B. in Modul-Skripten)
if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    // Defensive Zuweisung, um Überschreibungen nur bei Bedarf vorzunehmen.
    // Headless/Worker-Kontexte ohne DOM erhalten keine automatische Injection,
    // damit Tests bewusst eine fehlende Engine erkennen können.
    window.EngineAPI = window.EngineAPI || EngineAPI;
}
