// @ts-check

function resolveStorage(storageProvider) {
    try {
        return typeof storageProvider === 'function' ? storageProvider() : storageProvider;
    } catch {
        return null;
    }
}

export function createLocalStorageAdapter(storageProvider = () => globalThis.localStorage) {
    const getStorage = () => resolveStorage(storageProvider);

    return {
        name: 'localStorage',

        async open() {
            return true;
        },

        loadAllSync() {
            const storage = getStorage();
            const records = Object.create(null);
            if (!storage || typeof storage.length !== 'number' || typeof storage.key !== 'function') {
                return records;
            }
            for (let i = 0; i < storage.length; i += 1) {
                const key = storage.key(i);
                if (!key) continue;
                const value = storage.getItem(key);
                if (value !== null && value !== undefined) records[key] = String(value);
            }
            return records;
        },

        async loadAll() {
            return this.loadAllSync();
        },

        getItemSync(key) {
            const storage = getStorage();
            return storage?.getItem(String(key)) ?? null;
        },

        setItemSync(key, value) {
            const storage = getStorage();
            storage?.setItem(String(key), String(value));
        },

        removeItemSync(key) {
            const storage = getStorage();
            storage?.removeItem(String(key));
        },

        keysSync() {
            return Object.keys(this.loadAllSync());
        },

        async saveBatch({ upserts = [], deletes = [] } = {}) {
            const storage = getStorage();
            if (!storage) return;
            deletes.forEach(key => storage.removeItem(String(key)));
            upserts.forEach(([key, value]) => storage.setItem(String(key), String(value)));
        },

        async readMetadata(key) {
            return this.getItemSync(`metadata.${key}`);
        },

        async writeMetadata(key, value) {
            this.setItemSync(`metadata.${key}`, JSON.stringify(value));
        }
    };
}

export default createLocalStorageAdapter;
