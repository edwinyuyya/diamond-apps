// Rekam Medisku — penyimpanan foto sumber (IndexedDB terpisah dari vault).
// Tidak menyentuh DOM saat impor. `fileToSourcePhoto` memakai canvas/FileReader
// hanya saat dipanggil dari layar pindai.

import {
  ALLOWED_SOURCE_PHOTO_MIME,
  MAX_SOURCE_PHOTO_BYTES as MODEL_MAX_SOURCE_PHOTO_BYTES,
  MAX_SOURCE_PHOTO_DIMENSION as MODEL_MAX_SOURCE_PHOTO_DIMENSION
} from './model.js';

export const PHOTO_DB_NAME = 'rawatku-photos';
export const PHOTO_DB_VERSION = 1;
export const PHOTO_STORE = 'photos';
export const MAX_SOURCE_PHOTO_BYTES = MODEL_MAX_SOURCE_PHOTO_BYTES;
export const MAX_SOURCE_PHOTO_DIMENSION = MODEL_MAX_SOURCE_PHOTO_DIMENSION;
export { ALLOWED_SOURCE_PHOTO_MIME };

export class PhotoError extends Error {
  constructor(message, { code = 'FOTO_TIDAK_VALID' } = {}) {
    super(message);
    this.name = 'PhotoError';
    this.code = code;
  }
}

const JPEG_QUALITIES = [0.85, 0.75, 0.65, 0.55, 0.45];
const MAX_COMPRESSION_ATTEMPTS = 6;
const EXTENSION_MIME = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp' };

function decodedBase64Bytes(value) {
  if (typeof value !== 'string') return -1;
  const clean = value.replace(/\s+/g, '');
  if (clean.length === 0) return 0;
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) return -1;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return (clean.length / 4) * 3 - padding;
}

function utf8Bytes(value) {
  try {
    if (typeof TextEncoder === 'function') return new TextEncoder().encode(value).length;
  } catch {
    // fallback di bawah
  }
  return unescape(encodeURIComponent(value)).length;
}

function recordBytes(record) {
  try {
    return utf8Bytes(JSON.stringify(record));
  } catch {
    return null;
  }
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function resolveMime(file) {
  const type = typeof file?.type === 'string' ? file.type.toLowerCase() : '';
  if (type) return type;
  const name = typeof file?.name === 'string' ? file.name : '';
  const ext = name.includes('.') ? name.split('.').pop().toLowerCase() : '';
  return EXTENSION_MIME[ext] || '';
}

function validCryptoEnvelope(crypto) {
  return isPlainObject(crypto)
    && typeof crypto.iv === 'string' && crypto.iv.length > 0
    && typeof crypto.ciphertext === 'string' && crypto.ciphertext.length > 0;
}

/**
 * Validasi bentuk PhotoRecord. Melempar PhotoError bila tidak valid.
 * Menerima record terenkripsi (dataBase64 null + crypto terisi).
 */
export function validatePhotoRecord(photo) {
  if (!isPlainObject(photo)) {
    throw new PhotoError('Foto sumber tidak valid.', { code: 'FOTO_TIDAK_VALID' });
  }
  if (typeof photo.id !== 'string' || photo.id.trim() === '') {
    throw new PhotoError('Foto sumber tidak memiliki id.', { code: 'FOTO_TIDAK_VALID' });
  }
  if (typeof photo.profileId !== 'string' || photo.profileId.trim() === '') {
    throw new PhotoError('Foto sumber tidak memiliki profil.', { code: 'FOTO_TIDAK_VALID' });
  }
  if (!ALLOWED_SOURCE_PHOTO_MIME.includes(photo.mime)) {
    throw new PhotoError('Jenis foto sumber tidak didukung.', { code: 'FOTO_TIDAK_VALID' });
  }
  const bytes = photo.bytes;
  if (typeof bytes !== 'number' || !Number.isFinite(bytes) || bytes < 0) {
    throw new PhotoError('Ukuran foto sumber tidak valid.', { code: 'FOTO_TIDAK_VALID' });
  }
  if (bytes > MAX_SOURCE_PHOTO_BYTES) {
    throw new PhotoError('Ukuran foto sumber melebihi batas 2 MiB.', { code: 'FOTO_TERLALU_BESAR' });
  }

  const hasData = photo.dataBase64 != null;
  const hasCrypto = photo.crypto != null;
  if (hasData === hasCrypto) {
    throw new PhotoError('Foto sumber harus berisi tepat satu dari data atau enkripsi.',
      { code: 'FOTO_TIDAK_VALID' });
  }
  if (hasData) {
    if (typeof photo.dataBase64 !== 'string' || photo.dataBase64.trim() === '') {
      throw new PhotoError('Isi foto sumber tidak valid.', { code: 'FOTO_TIDAK_VALID' });
    }
    if (decodedBase64Bytes(photo.dataBase64) < 0) {
      throw new PhotoError('Isi foto sumber bukan base64 yang valid.', { code: 'FOTO_TIDAK_VALID' });
    }
  }
  if (hasCrypto && !validCryptoEnvelope(photo.crypto)) {
    throw new PhotoError('Enkripsi foto sumber tidak valid.', { code: 'FOTO_TIDAK_VALID' });
  }
  return photo;
}

/** Data URL dari record foto (record terenkripsi harus didekripsi dulu). */
export function photoDataUrl(photo) {
  if (!isPlainObject(photo) || typeof photo.dataBase64 !== 'string') {
    throw new PhotoError('Foto sumber belum tersedia (mungkin terenkripsi).',
      { code: 'FOTO_TIDAK_ADA' });
  }
  const mime = ALLOWED_SOURCE_PHOTO_MIME.includes(photo.mime) ? photo.mime : 'image/jpeg';
  return `data:${mime};base64,${photo.dataBase64}`;
}

/** Perkiraan ukuran byte hasil dekode base64. */
export function photoBytes(photo) {
  if (!isPlainObject(photo)) return 0;
  const decoded = decodedBase64Bytes(photo.dataBase64);
  if (decoded > 0) return decoded;
  const stored = Number(photo.bytes);
  return Number.isFinite(stored) && stored > 0 ? Math.round(stored) : 0;
}

// ---------------------------------------------------------------------------
// PhotoStore
// ---------------------------------------------------------------------------

function requestToPromise(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Permintaan IndexedDB gagal.'));
  });
}

function transactionDone(tx) {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error || new Error('Transaksi IndexedDB gagal.'));
    tx.onabort = () => reject(tx.error || new Error('Transaksi IndexedDB dibatalkan.'));
  });
}

function isQuotaError(error) {
  if (!error) return false;
  if (error.name === 'QuotaExceededError' || error.name === 'NS_ERROR_DOM_QUOTA_REACHED') return true;
  if (error.code === 22 || error.code === 1014) return true;
  return /quota|penuh|space/i.test(String(error.message || ''));
}

/**
 * Membuat penyimpanan foto. IndexedDB `rawatku-photos` v1 store `photos`
 * dengan keyPath `id`; bila tidak tersedia/gagal → memori (tanpa localStorage).
 */
export function createPhotoStore({
  indexedDB: idbFactory = globalThis.indexedDB,
  dbName = PHOTO_DB_NAME,
  storeName = PHOTO_STORE,
  now = () => new Date()
} = {}) {
  let kind = idbFactory ? 'indexeddb' : 'memory';
  let dbPromise = null;
  let unavailable = !idbFactory;
  const memory = new Map();
  void now; // disediakan kontrak; timestamp dibuat pemanggil record

  function fallbackToMemory() {
    kind = 'memory';
    unavailable = true;
    dbPromise = null;
  }

  function openDb() {
    if (unavailable) return Promise.reject(new Error('IndexedDB tidak tersedia.'));
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      let request;
      try {
        request = idbFactory.open(dbName, PHOTO_DB_VERSION);
      } catch (error) {
        reject(error);
        return;
      }
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(storeName)) {
          db.createObjectStore(storeName, { keyPath: 'id' });
        }
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error || new Error('Gagal membuka IndexedDB foto.'));
      request.onblocked = () => reject(new Error('IndexedDB foto diblokir tab lain.'));
    }).catch((error) => {
      fallbackToMemory();
      throw error;
    });
    return dbPromise;
  }

  function memoryList({ profileId = null } = {}) {
    const records = Array.from(memory.values());
    return profileId == null
      ? records
      : records.filter((record) => record.profileId === profileId);
  }

  async function listAll() {
    const db = await openDb();
    const tx = db.transaction(storeName, 'readonly');
    const store = tx.objectStore(storeName);
    let records;
    if (typeof store.getAll === 'function') {
      records = await requestToPromise(store.getAll());
    } else {
      records = await new Promise((resolve, reject) => {
        const items = [];
        const req = store.openCursor();
        req.onsuccess = () => {
          const cursor = req.result;
          if (!cursor) {
            resolve(items);
            return;
          }
          items.push(cursor.value);
          cursor.continue();
        };
        req.onerror = () => reject(req.error || new Error('Gagal membaca foto.'));
      });
    }
    return Array.isArray(records) ? records : [];
  }

  return {
    get kind() {
      return kind;
    },

    async init() {
      if (unavailable) return;
      try {
        await openDb();
      } catch {
        // kind sudah menjadi 'memory'
      }
      return undefined;
    },

    async put(record) {
      validatePhotoRecord(record);
      if (unavailable) {
        memory.set(record.id, record);
        return record;
      }
      try {
        const db = await openDb();
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).put(record);
        await transactionDone(tx);
        return record;
      } catch (error) {
        fallbackToMemory();
        memory.set(record.id, record);
        if (isQuotaError(error)) {
          throw new PhotoError('Penyimpanan foto penuh.', { code: 'PENYIMPANAN_PENUH' });
        }
        // IndexedDB tidak dapat dipakai: simpan di memori agar sesi tetap jalan.
        return record;
      }
    },

    async get(id) {
      if (typeof id !== 'string' || id.length === 0) return null;
      if (unavailable) return memory.get(id) || null;
      try {
        const db = await openDb();
        const tx = db.transaction(storeName, 'readonly');
        const result = await requestToPromise(tx.objectStore(storeName).get(id));
        return result || null;
      } catch {
        fallbackToMemory();
        return memory.get(id) || null;
      }
    },

    async delete(id) {
      if (typeof id !== 'string' || id.length === 0) return false;
      memory.delete(id);
      if (unavailable) return true;
      try {
        const db = await openDb();
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).delete(id);
        await transactionDone(tx);
        return true;
      } catch {
        fallbackToMemory();
        return true;
      }
    },

    async list({ profileId = null } = {}) {
      if (unavailable) return memoryList({ profileId });
      try {
        const records = await listAll();
        return profileId == null
          ? records
          : records.filter((record) => record.profileId === profileId);
      } catch {
        fallbackToMemory();
        return memoryList({ profileId });
      }
    },

    async usage() {
      let records;
      try {
        records = await this.list();
      } catch {
        return { bytes: null };
      }
      let total = 0;
      for (const record of records) {
        const size = recordBytes(record);
        if (size == null) return { bytes: null };
        total += size;
      }
      return { bytes: total };
    },

    async clear() {
      memory.clear();
      if (unavailable) return;
      try {
        const db = await openDb();
        const tx = db.transaction(storeName, 'readwrite');
        tx.objectStore(storeName).clear();
        await transactionDone(tx);
      } catch {
        fallbackToMemory();
      }
    }
  };
}

// ---------------------------------------------------------------------------
// Berkas → foto sumber (DOM: FileReader + canvas)
// ---------------------------------------------------------------------------

function readAsDataUrl(file) {
  if (typeof FileReader === 'undefined') {
    return Promise.reject(new PhotoError('Peramban ini tidak mendukung pembacaan berkas.',
      { code: 'FOTO_TIDAK_VALID' }));
  }
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new PhotoError('Foto tidak dapat dibaca.',
      { code: 'FOTO_TIDAK_VALID' }));
    reader.onabort = () => reject(new PhotoError('Pembacaan foto dibatalkan.',
      { code: 'FOTO_TIDAK_VALID' }));
    reader.readAsDataURL(file);
  });
}

function loadImage(dataUrl) {
  if (typeof Image === 'undefined') {
    return Promise.reject(new PhotoError('Kompresi foto membutuhkan peramban.',
      { code: 'FOTO_TIDAK_VALID' }));
  }
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new PhotoError('Foto tidak dapat dibuka. Coba foto lain.',
      { code: 'FOTO_TIDAK_VALID' }));
    image.src = dataUrl;
  });
}

function encodeJpeg(image, width, height, quality) {
  if (typeof document === 'undefined') {
    throw new PhotoError('Kompresi foto membutuhkan peramban.',
      { code: 'FOTO_TIDAK_VALID' });
  }
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(width));
  canvas.height = Math.max(1, Math.round(height));
  const context = canvas.getContext('2d');
  if (!context) {
    throw new PhotoError('Peramban ini tidak mendukung kompresi foto.',
      { code: 'FOTO_TIDAK_VALID' });
  }
  // Latar putih: transparansi PNG tidak boleh menjadi hitam setelah JPEG.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  return {
    dataUrl: canvas.toDataURL('image/jpeg', quality),
    width: canvas.width,
    height: canvas.height
  };
}

function stripDataUrlPrefix(dataUrl) {
  const comma = dataUrl.indexOf(',');
  return comma >= 0 ? dataUrl.slice(comma + 1) : '';
}

/**
 * Membaca berkas gambar menjadi foto sumber terkompresi (JPEG, ≤ maxBytes,
 * dimensi ≤ maxDimension). Melempar PhotoError dengan kode yang sesuai.
 */
export async function fileToSourcePhoto(file, {
  maxBytes = MAX_SOURCE_PHOTO_BYTES,
  maxDimension = MAX_SOURCE_PHOTO_DIMENSION
} = {}) {
  if (!file || typeof file.size !== 'number') {
    throw new PhotoError('Berkas foto tidak valid.', { code: 'FOTO_TIDAK_VALID' });
  }
  const mime = resolveMime(file);
  if (!ALLOWED_SOURCE_PHOTO_MIME.includes(mime)) {
    throw new PhotoError('Jenis foto tidak didukung. Gunakan JPEG, PNG, atau WebP.',
      { code: 'FOTO_TIDAK_VALID' });
  }
  if (file.size === 0) {
    throw new PhotoError('Berkas foto kosong.', { code: 'FOTO_TIDAK_VALID' });
  }

  const sourceDataUrl = await readAsDataUrl(file);
  const image = await loadImage(sourceDataUrl);
  const naturalWidth = image.naturalWidth || image.width || 1;
  const naturalHeight = image.naturalHeight || image.height || 1;
  const limit = Number.isFinite(maxDimension) && maxDimension > 0
    ? maxDimension
    : MAX_SOURCE_PHOTO_DIMENSION;
  const initialScale = Math.min(1, limit / Math.max(naturalWidth, naturalHeight));

  let width = Math.max(1, Math.round(naturalWidth * initialScale));
  let height = Math.max(1, Math.round(naturalHeight * initialScale));
  let result = null;

  for (let attempt = 0; attempt < MAX_COMPRESSION_ATTEMPTS; attempt += 1) {
    if (attempt === JPEG_QUALITIES.length) {
      // Setelah semua kualitas dicoba, perkecil dimensi 0.8× dan ulangi.
      width = Math.max(1, Math.round(width * 0.8));
      height = Math.max(1, Math.round(height * 0.8));
    }
    const quality = attempt < JPEG_QUALITIES.length ? JPEG_QUALITIES[attempt] : JPEG_QUALITIES[0];
    const encoded = encodeJpeg(image, width, height, quality);
    const dataBase64 = stripDataUrlPrefix(encoded.dataUrl);
    const bytes = decodedBase64Bytes(dataBase64);
    if (bytes > 0 && bytes <= maxBytes) {
      result = {
        mime: 'image/jpeg',
        dataBase64,
        bytes,
        width: encoded.width,
        height: encoded.height,
        name: typeof file.name === 'string' && file.name ? file.name : 'foto.jpg'
      };
      break;
    }
  }

  if (!result) {
    throw new PhotoError('Foto masih terlalu besar setelah dikompres. Pilih foto lain atau perkecil.',
      { code: 'FOTO_TERLALU_BESAR' });
  }
  return result;
}
