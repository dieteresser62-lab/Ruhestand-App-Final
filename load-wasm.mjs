import init, * as wasm from './pkg/rust_engine.js';
import { readFile } from 'fs/promises';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let wasmLoaded = false;

export async function loadWasm() {
    if (wasmLoaded) return wasm;

    try {
        // In Node.js, we must read the file manually because 'fetch' on file:// URLs 
        // is often restricted or broken in the generated bindings.
        const wasmPath = resolve(__dirname, './pkg/rust_engine_bg.wasm'); // Ensure correct path relative to this file
        const bytes = await readFile(wasmPath);

        await init(bytes);
        wasmLoaded = true;
        console.log('[WASM] Module loaded successfully via Node fs.');
    } catch (e) {
        console.error("Failed to load WASM via fs:", e);
        throw e;
    }
    return wasm;
}

export default wasm;
