(function () {
    const DB_NAME = 'controleGastosDB';
    const DB_VERSION = 1;
    const MONTHS_STORE = 'months';
    const STATE_STORE = 'appState';

    let dbInstance = null;
    let initResultCache = null;

    function monthKeyFromDate(date) {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        return `${year}-${month}`;
    }

    function createEmptyMonthData(monthKey) {
        return {
            monthKey,
            meta: 0,
            recursos: 0,
            ultimaData: new Date().toISOString(),
            gastos: []
        };
    }

    function promisifyRequest(request) {
        return new Promise((resolve, reject) => {
            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async function getDb() {
        if (dbInstance) return dbInstance;

        dbInstance = await new Promise((resolve, reject) => {
            const request = indexedDB.open(DB_NAME, DB_VERSION);

            request.onupgradeneeded = function (event) {
                const db = event.target.result;
                if (!db.objectStoreNames.contains(MONTHS_STORE)) {
                    db.createObjectStore(MONTHS_STORE, { keyPath: 'monthKey' });
                }
                if (!db.objectStoreNames.contains(STATE_STORE)) {
                    db.createObjectStore(STATE_STORE, { keyPath: 'key' });
                }
            };

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });

        return dbInstance;
    }

    async function withStore(storeName, mode, action) {
        const db = await getDb();
        return new Promise((resolve, reject) => {
            const tx = db.transaction(storeName, mode);
            const store = tx.objectStore(storeName);
            let result;

            Promise.resolve(action(store))
                .then((value) => {
                    result = value;
                })
                .catch(reject);

            tx.oncomplete = () => resolve(result);
            tx.onerror = () => reject(tx.error);
            tx.onabort = () => reject(tx.error);
        });
    }

    async function getState(key) {
        return withStore(STATE_STORE, 'readonly', async (store) => {
            const row = await promisifyRequest(store.get(key));
            return row ? row.value : null;
        });
    }

    async function setState(key, value) {
        return withStore(STATE_STORE, 'readwrite', (store) => {
            store.put({ key, value });
        });
    }

    async function getMonthData(monthKey) {
        return withStore(MONTHS_STORE, 'readonly', async (store) => {
            const data = await promisifyRequest(store.get(monthKey));
            return data || null;
        });
    }

    async function saveMonthData(monthData) {
        return withStore(MONTHS_STORE, 'readwrite', (store) => {
            store.put(monthData);
        });
    }

    async function migrateLegacyLocalStorage() {
        const alreadyMigrated = await getState('legacyMigrated');
        if (alreadyMigrated) return;

        const legacyRaw = localStorage.getItem('controlegastos');
        if (!legacyRaw) {
            await setState('legacyMigrated', true);
            return;
        }

        try {
            const legacyData = JSON.parse(legacyRaw) || {};
            const legacyDate = legacyData.ultimaData ? new Date(legacyData.ultimaData) : new Date();
            const legacyMonthKey = monthKeyFromDate(legacyDate);

            const normalized = {
                monthKey: legacyMonthKey,
                meta: Number(legacyData.meta) || 0,
                recursos: Number(legacyData.recursos) || 0,
                ultimaData: legacyData.ultimaData || new Date().toISOString(),
                gastos: Array.isArray(legacyData.gastos) ? legacyData.gastos : []
            };

            const existing = await getMonthData(legacyMonthKey);
            if (!existing) {
                await saveMonthData(normalized);
            }

            await setState('currentMonthKey', legacyMonthKey);
        } catch (error) {
            console.error('Erro na migração do localStorage para IndexedDB:', error);
        } finally {
            await setState('legacyMigrated', true);
        }
    }

    async function ensureMonthExists(monthKey) {
        const existing = await getMonthData(monthKey);
        if (existing) return existing;
        const data = createEmptyMonthData(monthKey);
        await saveMonthData(data);
        return data;
    }

    async function init() {
        if (initResultCache) return initResultCache;

        await getDb();
        await migrateLegacyLocalStorage();

        const currentKey = monthKeyFromDate(new Date());
        let storedCurrentKey = await getState('currentMonthKey');

        if (!storedCurrentKey) {
            storedCurrentKey = currentKey;
            await setState('currentMonthKey', currentKey);
        }

        if (storedCurrentKey !== currentKey) {
            await setState('pendingExportMonthKey', storedCurrentKey);
            await setState('currentMonthKey', currentKey);
            await setState('pendingExportPromptedForMonthKey', null);
        }

        const pendingExportMonthKey = await getState('pendingExportMonthKey');
        const promptedFor = await getState('pendingExportPromptedForMonthKey');
        const shouldPromptExport = Boolean(pendingExportMonthKey) && promptedFor !== currentKey;

        if (shouldPromptExport) {
            await setState('pendingExportPromptedForMonthKey', currentKey);
        }

        const currentData = await ensureMonthExists(currentKey);
        const pendingExportData = pendingExportMonthKey ? await getMonthData(pendingExportMonthKey) : null;

        initResultCache = {
            currentMonthKey: currentKey,
            currentData,
            pendingExportMonthKey,
            pendingExportData,
            shouldPromptExport
        };

        return initResultCache;
    }

    function sanitizeFilenamePart(value) {
        return value.replace(/[^0-9a-zA-Z_-]/g, '_');
    }

    function buildExportFilename(monthKey) {
        const now = new Date();
        const pad = (n) => String(n).padStart(2, '0');
        const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
        return `controle_gastos_${sanitizeFilenamePart(monthKey)}_${stamp}.json`;
    }

    function triggerJsonDownload(payload, filename) {
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }

    async function getCurrentData() {
        const { currentMonthKey } = await init();
        return (await getMonthData(currentMonthKey)) || createEmptyMonthData(currentMonthKey);
    }

    async function saveCurrentData(data) {
        const { currentMonthKey } = await init();
        const normalized = {
            ...data,
            monthKey: currentMonthKey,
            meta: Number(data.meta) || 0,
            recursos: Number(data.recursos) || 0,
            gastos: Array.isArray(data.gastos) ? data.gastos : [],
            ultimaData: data.ultimaData || new Date().toISOString()
        };
        await saveMonthData(normalized);
        return normalized;
    }

    async function exportMonthData(monthKey) {
        const data = await getMonthData(monthKey);
        if (!data) return false;
        const payload = {
            exportedAt: new Date().toISOString(),
            monthKey: data.monthKey,
            meta: data.meta,
            recursos: data.recursos,
            ultimaData: data.ultimaData,
            gastos: data.gastos
        };
        triggerJsonDownload(payload, buildExportFilename(monthKey));
        return true;
    }

    async function getPendingExportInfo() {
        const pendingExportMonthKey = await getState('pendingExportMonthKey');
        if (!pendingExportMonthKey) return null;
        const pendingExportData = await getMonthData(pendingExportMonthKey);
        return { pendingExportMonthKey, pendingExportData };
    }

    async function clearPendingExport() {
        await setState('pendingExportMonthKey', null);
    }

    window.AppDB = {
        ready: init,
        getCurrentData,
        saveCurrentData,
        exportMonthData,
        getPendingExportInfo,
        clearPendingExport
    };
})();
