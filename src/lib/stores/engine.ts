import { writable, derived } from 'svelte/store';
import type { MonteCarloResult, BacktestResult } from '$lib/types/rust-engine';

// Feature Flag
export const useRustEngine = writable<boolean>(true);

// Engine State
export const engineLoading = writable<boolean>(false);
export const engineError = writable<string | null>(null);
export const engineReady = writable<boolean>(false);

// Results
export const monteCarloResult = writable<MonteCarloResult | null>(null);
export const backtestResult = writable<BacktestResult | null>(null);

// Derived
export const isEngineAvailable = derived(
    [engineReady, engineError],
    ([$ready, $error]) => $ready && !$error
);

// Engine Instance (Singleton)
let engineInstance: any = null;

export async function initEngine(): Promise<void> {
    if (engineInstance) return;

    engineLoading.set(true);
    engineError.set(null);

    try {
        const { initRustEngine } = await import('$lib/rust-engine.mjs');
        engineInstance = await initRustEngine();
        engineReady.set(true);
    } catch (e: unknown) {
        console.error('Failed to init Rust engine:', e);
        engineError.set(e instanceof Error ? e.message : 'Unknown error');
        // Fallback to JS engine could be implemented here
    } finally {
        engineLoading.set(false);
    }
}

export function getEngine() {
    if (!engineInstance) {
        throw new Error('Engine not initialized. Call initEngine() first.');
    }
    return engineInstance;
}
