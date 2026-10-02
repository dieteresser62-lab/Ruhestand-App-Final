import { readFileSync } from 'node:fs';

// Unabhängiger Solltext: Änderungen am Ladepfad benötigen einen Vertragsreview.
const expectedWrapper = `// AUTO-GENERATED FALLBACK (kein Bundle, Modul-Import)
import { EngineAPI } from './engine/index.mjs';
if (typeof window !== 'undefined') {
  window.EngineAPI = EngineAPI;
  // Legacy compat: Ruhestandsmodell_v30 is deprecated, use EngineAPI
  window.Ruhestandsmodell_v30 = EngineAPI;
}
export { EngineAPI };
export { EngineAPI as Ruhestandsmodell_v30 }; // Legacy alias
`;

const actualWrapper = readFileSync(new URL('../engine.js', import.meta.url), 'utf8');

assert(
    actualWrapper.replace(/\r\n/g, '\n') === expectedWrapper,
    'engine.js muss dem vollständigen reinen Modul-Wrapper entsprechen (nur CRLF zu LF normalisiert). '
    + 'Eingebettete Engine-Logik und zusätzlicher Code verletzen den Wrappervertrag; '
    + 'ein bewusster Wechsel zu einem Bundle benötigt eine eigene geprüfte Vertragsänderung.'
);
