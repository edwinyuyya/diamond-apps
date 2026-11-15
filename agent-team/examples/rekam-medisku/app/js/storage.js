// Rekam Medisku — vault penyimpanan tunggal.
// Urutan fallback: IndexedDB -> localStorage -> memori.
// Tidak ada data medis di kunci lain.

export const DB_NAME = 'rawatku';
export const DB_VERSION = 1;
export const STORE_NAME = 'vault';
export const LS_KEY = 'rawatku:vault';

const RECORD_KEY = 'state';

const MESSAGES = {
  PENYIMPANAN_PENUH: 'Penyimpanan perangkat penuh. Ekspor cadangan lalu kosongkan ruang.',
  DATA_RUSAK: 'Data tidak dapat dibaca. Jangan hapus apa pun; coba cadangan terakhir.'
};

function storageError(code, message) {
  const error = new Error(message || MESSAGES[code] || MESSAGES.DATA_RUSAK);
  error.code = code;
  return error;
}

function jsonBytes(value) {
  try {
    const text = JSON.stringify(value);
    if (typeof text !== 'string') return null;
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(text).length;
    return text.length;
  } catch {
    return null;
  }
}

function memoryBackend() {
  let record = null;
  return {
    async get() {
      return record === null ? null : record;
    },
    async put(value) {
      // Simpan salinan JSON agar perilakunya sama dengan backend persisten.
      record = value === undefined ? null : JSON.parse(JSON.stringify(value));
    },
    async clear() {
      record = null;
    },
    async usage() {
      return { bytes: record === null ? 0 : jsonBytes(record) };
    }
  };
}

function localStorageBackend(storage, key) {
  return {
    async get() {
      const raw = storage.getItem(key);
      if (raw === null || raw === undefined) return null;
      try {
        return JSON.parse(raw);
      } catch {
        throw storageError('DATA_RUSAK');
      }
    },
    async put(value) {
      let text;
      try {
        text = JSON.stringify(value);
      } catch {
        throw storageError('DATA_RUSAK');
      }
      try {
        storage.setItem(key, text);
      } catch {
        throw storageError('PENYIMPANAN_PENUH');
      }
    },
    async clear() {
      try {
        storage.removeItem(key);
      } catch {
        // Kunci yang tidak dapat dihapus bukan alasan untuk menjatuhkan aplikasi.
      }
    },
    async usage() {
      let raw;
      try {
        raw = storage.getItem(key);
      } catch {
        return { bytes: null };
      }
      if (raw === null || raw === undefined) return { bytes: 0 };
      if (typeof TextEncoder === 'function') {
        return { bytes: new TextEncoder().encode(String(raw)).length };
      }
      return { bytes: String(raw).length };
    }
  };
}

function indexedDbBackend(indexedDB, dbName, storeName) {
  let dbPromise = null;

  function open() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      let request;
      try {
        request = indexedDB.open(dbName, DB_VERSION);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName);
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('IndexedDB gagal dibuka.'));
      request.onblocked = () => reject(new Error('IndexedDB diblokir.'));
    }).catch((error) => {
      dbPromise = null;
      throw error;
    });
    return dbPromise;
  }

  async function withStore(mode, action) {
    const db = await open();
    return new Promise((resolve, reject) => {
      let tx;
      try {
        tx = db.transaction(storeName, mode);
      } catch (error) {
        reject(error);
        return;
      }
      const store = tx.objectStore(storeName);
      let request;
      try {
        request = action(store);
      } catch (error) {
        reject(error);
        return;
      }
      if (request) {
        request.onsuccess = () => {
          if (mode === 'readonly') resolve(request.result === undefined ? null : request.result);
        };
        request.onerror = () => reject(request.error || new Error('Operasi IndexedDB gagal.'));
      }
      tx.oncomplete = () => {
        if (mode !== 'readonly') resolve(undefined);
      };
      tx.onerror = () => reject(tx.error || new Error('Transaksi IndexedDB gagal.'));
      tx.onabort = () => reject(tx.error || new Error('Transaksi IndexedDB dibatalkan.'));
    });
  }

  return {
    async get() {
      const result = await withStore('readonly', (store) => store.get(RECORD_KEY));
      return result === undefined ? null : result;
    },
    async put(value) {
      await withStore('readwrite', (store) => store.put(value, RECORD_KEY));
    },
    async clear() {
      await withStore('readwrite', (store) => store.delete(RECORD_KEY));
    },
    async usage() {
      const record = await this.get();
      return { bytes: record === null ? 0 : jsonBytes(record) };
    }
  };
}

export function createStorage(options = {}) {
  const {
    indexedDB = typeof globalThis !== 'undefined' ? globalThis.indexedDB : undefined,
    localStorage = typeof globalThis !== 'undefined' ? globalThis.localStorage : undefined,
    dbName = DB_NAME,
    storeName = STORE_NAME,
    lsKey = LS_KEY
  } = options || {};

  const memory = memoryBackend();
  const local = localStorage ? localStorageBackend(localStorage, lsKey) : null;
  const idb = indexedDB ? indexedDbBackend(indexedDB, dbName, storeName) : null;

  let active;
  let kind;
  if (idb) {
    active = idb;
    kind = 'indexeddb';
  } else if (local) {
    active = local;
    kind = 'localstorage';
  } else {
    active = memory;
    kind = 'memory';
  }

  function fallback() {
    if (local) {
      active = local;
      kind = 'localstorage';
    } else {
      active = memory;
      kind = 'memory';
    }
  }

  async function run(action) {
    try {
      return await action();
    } catch (error) {
      if (kind === 'indexeddb') {
        // Error buka/tulis IndexedDB: pindah otomatis ke backend berikutnya.
        fallback();
        return action();
      }
      throw error;
    }
  }

  return {
    get kind() {
      return kind;
    },
    async get() {
      return run(() => active.get());
    },
    async put(record) {
      return run(() => active.put(record));
    },
    async clear() {
      return run(() => active.clear());
    },
    async usage() {
      return run(() => active.usage());
    }
  };
}
