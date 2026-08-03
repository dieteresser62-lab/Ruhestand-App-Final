"use strict";

export const RUNTIME_BUILD_PROVENANCE_SCHEMA_VERSION = 'RuntimeBuildProvenanceV1';
export const RUNTIME_BUILD_PROVENANCE_PATH = './__build-provenance.json';

const SOURCE_COMMIT_PATTERN = /^[0-9a-f]{40}$/;
const SOURCE_TREE_STATUSES = new Set(['clean', 'dirty']);

let loadedProvenance = null;
let loadPromise = null;

function freezeProvenance(value) {
    return Object.freeze({
        schemaVersion: RUNTIME_BUILD_PROVENANCE_SCHEMA_VERSION,
        sourceCommit: value.sourceCommit,
        sourceTreeStatus: value.sourceTreeStatus,
        provider: typeof value.provider === 'string' && value.provider.trim() !== ''
            ? value.provider
            : 'unspecified'
    });
}

export function normalizeRuntimeBuildProvenance(value) {
    if (!value || typeof value !== 'object') return null;
    if (value.schemaVersion !== RUNTIME_BUILD_PROVENANCE_SCHEMA_VERSION) return null;
    const sourceCommit = String(value.sourceCommit || '').trim().toLowerCase();
    const sourceTreeStatus = String(value.sourceTreeStatus || '').trim().toLowerCase();
    if (!SOURCE_COMMIT_PATTERN.test(sourceCommit) || !SOURCE_TREE_STATUSES.has(sourceTreeStatus)) return null;
    return freezeProvenance({ ...value, sourceCommit, sourceTreeStatus });
}

export function getRuntimeBuildProvenance() {
    return loadedProvenance;
}

export async function loadRuntimeBuildProvenance({ force = false } = {}) {
    if (!force && loadedProvenance) return loadedProvenance;
    if (!force && loadPromise) return loadPromise;
    if (typeof window === 'undefined' || typeof globalThis.fetch !== 'function') return null;

    loadedProvenance = null;
    const request = (async () => {
        try {
            const response = await globalThis.fetch(RUNTIME_BUILD_PROVENANCE_PATH, {
                cache: 'no-store',
                credentials: 'same-origin'
            });
            if (!response.ok) return null;
            loadedProvenance = normalizeRuntimeBuildProvenance(await response.json());
            return loadedProvenance;
        } catch {
            return null;
        }
    })();
    loadPromise = request;
    try {
        return await request;
    } finally {
        if (loadPromise === request) loadPromise = null;
    }
}
