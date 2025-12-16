/**
 * ===================================================================
 * ENGINE ENTRY MODULE
 * ===================================================================
 * Zentrale Bündel- und Re-Export-Datei für die Ruhestand-Engine.
 * Sie exportiert die modernen ESM-Schnittstellen und publiziert bei
 * Bedarf die Legacy-Globals (EngineAPI, Ruhestandsmodell_v30) für
 * bestehende Oberflächen.
 * ===================================================================
 */

import { EngineAPI, _internal_calculateModel } from './core.mjs';
import Ruhestandsmodell_v30_Adapter, { Ruhestandsmodell_v30 } from './adapter.mjs';

// ESM-Exporte für moderne Importe
export { EngineAPI, _internal_calculateModel, Ruhestandsmodell_v30 };

// Default-Export behält die Legacy-Adapter-Instanz bei
export default {
    EngineAPI,
    Ruhestandsmodell_v30,
    _internal_calculateModel,
    adapter: Ruhestandsmodell_v30_Adapter
};

// Optional: Legacy-Globals für Direktnutzung ohne Bundle (z. B. in Modul-Skripten)
if (typeof window !== 'undefined' && typeof window.document !== 'undefined') {
    // Defensive Zuweisung, um Überschreibungen nur bei Bedarf vorzunehmen.
    // Headless/Worker-Kontexte ohne DOM erhalten keine automatische Injection,
    // damit Tests bewusst eine fehlende Engine erkennen können.
    window.EngineAPI = window.EngineAPI || EngineAPI;
    window.Ruhestandsmodell_v30 = window.Ruhestandsmodell_v30 || Ruhestandsmodell_v30;
}
