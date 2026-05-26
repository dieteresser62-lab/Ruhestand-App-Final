// @ts-check

const DEFAULT_STATE = Object.freeze({
    schemaVersion: 1,
    records: {},
    metadata: {}
});

function getInvoke(options = {}) {
    if (typeof options.invoke === 'function') return options.invoke;
    const invoke = globalThis.window?.__TAURI__?.core?.invoke
        || globalThis.__TAURI__?.core?.invoke;
    if (typeof invoke !== 'function') {
        throw new Error('Tauri invoke API ist nicht verfuegbar.');
    }
    return invoke;
}

function normalizeState(raw) {
    if (!raw) return { ...DEFAULT_STATE, records: Object.create(null), metadata: Object.create(null) };
    const parsed = JSON.parse(String(raw));
    const records = Object.create(null);
    Object.entries(parsed.records || {}).forEach(([key, value]) => {
        if (value === null || value === undefined) return;
        records[String(key)] = String(value);
    });
    const metadata = Object.create(null);
    Object.entries(parsed.metadata || {}).forEach(([key, value]) => {
        metadata[String(key)] = value;
    });
    return {
        schemaVersion: Number(parsed.schemaVersion) || 1,
        records,
        metadata
    };
}

function serializeState(state) {
    return JSON.stringify({
        schemaVersion: 1,
        savedAt: new Date().toISOString(),
        records: state.records,
        metadata: state.metadata
    }, null, 2);
}

export function createTauriJsonFileAdapter(options = {}) {
    let invoke = null;
    let state = { ...DEFAULT_STATE, records: Object.create(null), metadata: Object.create(null) };
    let opened = false;

    async function persist() {
        await invoke('save_app_state', { content: serializeState(state) });
    }

    return {
        name: 'Tauri JSON File',
        async open() {
            invoke = getInvoke(options);
            const raw = await invoke('load_app_state');
            try {
                state = normalizeState(raw);
            } catch (err) {
                let quarantinePath = '';
                try {
                    quarantinePath = await invoke('quarantine_app_state');
                } catch (quarantineErr) {
                    const wrapped = new Error(`Tauri-Daten konnten nicht gelesen und nicht quarantiniert werden: ${quarantineErr?.message || quarantineErr}`);
                    wrapped.code = 'tauri-state-corrupt';
                    wrapped.cause = err;
                    throw wrapped;
                }
                const wrapped = new Error('Tauri-Daten konnten nicht gelesen werden. Die beschaedigte Datei wurde gesichert.');
                wrapped.code = 'tauri-state-corrupt';
                wrapped.quarantinePath = quarantinePath;
                wrapped.cause = err;
                throw wrapped;
            }
            opened = true;
        },
        async loadAll() {
            return state.records;
        },
        async saveBatch(batch) {
            if (!opened) await this.open();
            batch.deletes.forEach(key => {
                delete state.records[String(key)];
            });
            batch.upserts.forEach(([key, value]) => {
                if (value === null || value === undefined) return;
                state.records[String(key)] = String(value);
            });
            await persist();
        },
        async readMetadata(key) {
            return state.metadata[String(key)] ?? null;
        },
        async writeMetadata(key, value) {
            state.metadata[String(key)] = value;
            await persist();
        },
        async quarantine() {
            if (!invoke) invoke = getInvoke(options);
            return invoke('quarantine_app_state');
        }
    };
}

export default createTauriJsonFileAdapter;
