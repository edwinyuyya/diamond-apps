// Rekam Medisku — state aplikasi: orkestrasi vault, profil, koleksi, foto, dan cadangan.
// Semua efek samping penyimpanan lewat storage/photoStore yang dapat diinjeksi.
// Bebas DOM: aman diimpor node:test.

import * as cryptoModule from './crypto.js';
import * as backupApi from './backup.js';
import { createStorage } from './storage.js';
import { createPhotoStore } from './photos.js';
import {
  APP_ID,
  SCHEMA_VERSION,
  ITEM_COLLECTIONS,
  ITEM_PREFIXES,
  SCAN_KINDS,
  ALLOWED_SOURCE_PHOTO_MIME,
  MAX_SOURCE_PHOTO_BYTES,
  SETTINGS_DEFAULTS,
  createEmptyState,
  createProfile,
  createItem,
  createDoseLog,
  validateItem,
  normalizeState,
  activeProfile as modelActiveProfile,
  profileById as modelProfileById,
  newId,
  makeDoseLogId,
  isValidDateISO,
  isValidTime
} from './model.js';

const DEFAULT_ITERATIONS = 310000;

const MESSAGES = {
  TERKUNCI: 'Aplikasi terkunci. Masukkan kata sandi.',
  DATA_RUSAK: 'Data tidak dapat dibaca. Jangan hapus apa pun; coba cadangan terakhir.',
  KATA_SANDI_SALAH: 'Kata sandi salah. Data tidak diubah.',
  KRIPTO_TIDAK_TERSEDIA: 'Peramban ini tidak mendukung enkripsi yang dibutuhkan.',
  DATA_TIDAK_VALID: 'Data belum lengkap atau tidak valid. Periksa kembali.',
  PROFIL_TERAKHIR: 'Minimal satu profil harus tetap ada.',
  PENYIMPANAN_PENUH: 'Penyimpanan perangkat penuh. Ekspor cadangan lalu kosongkan ruang.',
  FOTO_TIDAK_VALID: 'Foto sumber tidak valid.',
  FOTO_TERLALU_BESAR: 'Foto sumber terlalu besar setelah dikompres.',
  FOTO_TIDAK_ADA: 'Foto sumber tidak ditemukan.'
};

function stateError(code, message) {
  const error = new Error(message || MESSAGES[code] || MESSAGES.DATA_RUSAK);
  error.code = code;
  return error;
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function localTodayISO(date) {
  return `${date.getFullYear()}-${pad2(date.getMonth() + 1)}-${pad2(date.getDate())}`;
}

function decodedBase64Bytes(value) {
  if (typeof value !== 'string' || value.length === 0) return -1;
  const clean = value.replace(/\s+/g, '');
  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(clean) || clean.length % 4 !== 0) return -1;
  const padding = clean.endsWith('==') ? 2 : clean.endsWith('=') ? 1 : 0;
  return (clean.length / 4) * 3 - padding;
}

function stripPhotoBytes(record) {
  if (!isPlainObject(record)) return record;
  const copy = { ...record };
  delete copy.dataBase64;
  return copy;
}

function photoTimestamp(record) {
  const value = record?.createdAt;
  return typeof value === 'string' ? value : '';
}

export function createState({
  storage = createStorage(),
  cryptoApi = cryptoModule,
  clock = () => new Date(),
  kdfIterations = DEFAULT_ITERATIONS,
  photoStore = createPhotoStore()
} = {}) {
  const iterationsDefault = Number.isInteger(kdfIterations) && kdfIterations > 0
    ? kdfIterations
    : DEFAULT_ITERATIONS;

  let stateData = null;
  let key = null;
  let salt = null;
  let iterations = iterationsDefault;
  let locked = false;
  let encrypted = false;
  let hasVaultFlag = false;
  let photoKind = typeof photoStore?.kind === 'string' ? photoStore.kind : 'memory';
  let writeTail = Promise.resolve();
  const listeners = new Set();

  // -------------------------------------------------------------------------
  // Utilitas internal
  // -------------------------------------------------------------------------

  function clockDate() {
    const value = typeof clock === 'function' ? clock() : new Date();
    const date = value instanceof Date ? value : new Date(value);
    return Number.isNaN(date.getTime()) ? new Date() : date;
  }

  function clockISO() {
    return clockDate().toISOString();
  }

  function ensureUnlocked() {
    if (locked || !stateData) throw stateError('TERKUNCI');
  }

  function enqueue(task) {
    const run = writeTail.then(task, task);
    writeTail = run.then(() => undefined, () => undefined);
    return run;
  }

  function notify(event) {
    for (const listener of Array.from(listeners)) {
      try {
        listener(event);
      } catch {
        // Error listener diisolasi agar tidak mengganggu alur data.
      }
    }
  }

  function info() {
    return {
      locked,
      encrypted,
      hasVault: hasVaultFlag,
      kind: storage.kind,
      photoKind
    };
  }

  function normalizeVault(data) {
    try {
      return normalizeState(data);
    } catch {
      throw stateError('DATA_RUSAK');
    }
  }

  function findProfileIndex(id) {
    return stateData?.profiles?.findIndex((profile) => profile.id === id) ?? -1;
  }

  async function persistCurrent() {
    if (!stateData) throw stateError('TERKUNCI');
    const iso = clockISO();
    stateData.updatedAt = iso;
    if (encrypted) {
      if (!key) throw stateError('TERKUNCI');
      const sealed = await cryptoApi.sealWithKey(stateData, key);
      await storage.put({
        app: APP_ID,
        schemaVersion: SCHEMA_VERSION,
        encrypted: true,
        updatedAt: iso,
        crypto: {
          alg: cryptoApi.ALG || 'AES-GCM-256',
          kdf: cryptoApi.KDF || 'PBKDF2-SHA256',
          iterations,
          salt: cryptoApi.toBase64(salt),
          iv: sealed.iv,
          ciphertext: sealed.ciphertext
        }
      });
    } else {
      await storage.put({
        app: APP_ID,
        schemaVersion: SCHEMA_VERSION,
        encrypted: false,
        updatedAt: iso,
        data: stateData
      });
    }
    hasVaultFlag = true;
  }

  async function checkSourcePhotoProfile(item, profileId) {
    const photoId = item?.source?.photoId;
    if (!photoId) return;
    let photo;
    try {
      photo = await photoStore.get(photoId);
    } catch {
      // Galat penyimpanan foto tidak boleh menghalangi penyimpanan catatan.
      return;
    }
    if (photo && photo.profileId !== profileId) {
      throw stateError('DATA_TIDAK_VALID', 'Foto sumber milik profil lain.');
    }
  }

  function requireCollection(collection) {
    if (!ITEM_COLLECTIONS.includes(collection)) {
      throw stateError('DATA_TIDAK_VALID', `Koleksi "${collection}" tidak dikenal.`);
    }
  }

  // -------------------------------------------------------------------------
  // Siklus hidup vault
  // -------------------------------------------------------------------------

  async function init() {
    try {
      if (typeof photoStore?.init === 'function') await photoStore.init();
    } catch {
      // Penyinggahan foto gagal tidak boleh memblokir data utama.
    }
    if (typeof photoStore?.kind === 'string') photoKind = photoStore.kind;

    let record;
    try {
      record = await storage.get();
    } catch (error) {
      if (error?.code === 'DATA_RUSAK') throw error;
      throw stateError('DATA_RUSAK');
    }

    if (record === null || record === undefined) {
      stateData = createEmptyState({ now: clockDate() });
      key = null;
      salt = null;
      iterations = iterationsDefault;
      locked = false;
      encrypted = false;
      hasVaultFlag = false;
      return info();
    }

    if (!isPlainObject(record) || record.app !== APP_ID) {
      throw stateError('DATA_RUSAK');
    }
    if (record.schemaVersion !== SCHEMA_VERSION) {
      throw stateError('DATA_RUSAK');
    }

    if (record.encrypted === true) {
      const envelope = record.crypto;
      if (!isPlainObject(envelope)
        || typeof envelope.salt !== 'string'
        || typeof envelope.iv !== 'string'
        || typeof envelope.ciphertext !== 'string') {
        throw stateError('DATA_RUSAK');
      }
      let saltBytes;
      try {
        saltBytes = cryptoApi.fromBase64(envelope.salt);
      } catch {
        throw stateError('DATA_RUSAK');
      }
      const rounds = Number(envelope.iterations);
      stateData = null;
      key = null;
      salt = saltBytes;
      iterations = Number.isInteger(rounds) && rounds > 0 ? rounds : iterationsDefault;
      locked = true;
      encrypted = true;
      hasVaultFlag = true;
      return info();
    }

    if (record.encrypted === false) {
      if (!isPlainObject(record.data)) throw stateError('DATA_RUSAK');
      const normalized = normalizeVault(record.data);
      stateData = normalized;
      key = null;
      salt = null;
      iterations = iterationsDefault;
      locked = false;
      encrypted = false;
      hasVaultFlag = true;
      return info();
    }

    throw stateError('DATA_RUSAK');
  }

  function isLocked() {
    return locked;
  }

  function isEncrypted() {
    return encrypted;
  }

  function hasVault() {
    return hasVaultFlag;
  }

  function getState() {
    ensureUnlocked();
    return stateData;
  }

  function getActiveProfile() {
    ensureUnlocked();
    return modelActiveProfile(stateData);
  }

  function getProfile(id) {
    ensureUnlocked();
    return modelProfileById(stateData, id);
  }

  function list(collection, { profileId } = {}) {
    ensureUnlocked();
    if (collection === 'profiles') {
      if (profileId != null) {
        return stateData.profiles.filter((profile) => profile.id === profileId);
      }
      return stateData.profiles.slice();
    }
    requireCollection(collection);
    const items = Array.isArray(stateData[collection]) ? stateData[collection] : [];
    if (profileId != null) {
      return items.filter((item) => item.profileId === profileId);
    }
    return items.slice();
  }

  async function unlock(password) {
    if (typeof password !== 'string' || password.length === 0) {
      throw stateError('DATA_TIDAK_VALID', 'Kata sandi wajib diisi.');
    }
    return enqueue(async () => {
      if (!encrypted) {
        locked = false;
        return info();
      }
      if (!locked && stateData) return info();

      let record;
      try {
        record = await storage.get();
      } catch (error) {
        if (error?.code === 'DATA_RUSAK') throw error;
        throw stateError('DATA_RUSAK');
      }
      if (!isPlainObject(record) || record.encrypted !== true || !isPlainObject(record.crypto)) {
        throw stateError('DATA_RUSAK');
      }
      const envelope = record.crypto;
      let saltBytes;
      try {
        saltBytes = cryptoApi.fromBase64(envelope.salt);
      } catch {
        throw stateError('DATA_RUSAK');
      }
      const rounds = Number(envelope.iterations);
      const roundsToUse = Number.isInteger(rounds) && rounds > 0 ? rounds : iterationsDefault;

      let derived;
      try {
        derived = await cryptoApi.deriveKey(password, saltBytes, roundsToUse);
      } catch (error) {
        if (error?.code === 'KRIPTO_TIDAK_TERSEDIA') throw error;
        throw stateError('DATA_RUSAK');
      }

      let opened;
      try {
        opened = await cryptoApi.openWithKey(
          { iv: envelope.iv, ciphertext: envelope.ciphertext },
          derived
        );
      } catch (error) {
        if (error?.code === 'KRIPTO_TIDAK_TERSEDIA') throw error;
        throw stateError('KATA_SANDI_SALAH');
      }

      const normalized = normalizeVault(opened);
      stateData = normalized;
      key = derived;
      salt = saltBytes;
      iterations = roundsToUse;
      locked = false;
      encrypted = true;
      hasVaultFlag = true;
      notify({ type: 'unlocked' });
      return info();
    });
  }

  async function lock() {
    if (locked) return;
    if (!encrypted) return; // vault tanpa kata sandi: no-op
    return enqueue(async () => {
      if (locked) return;
      stateData = null;
      key = null;
      salt = null;
      locked = true;
      notify({ type: 'locked' });
    });
  }

  async function setPassword(password) {
    ensureUnlocked();
    if (typeof password !== 'string' || password.length === 0) {
      throw stateError('DATA_TIDAK_VALID', 'Kata sandi wajib diisi.');
    }
    if (typeof cryptoApi.cryptoAvailable === 'function' && !cryptoApi.cryptoAvailable()) {
      throw stateError('KRIPTO_TIDAK_TERSEDIA');
    }
    return enqueue(async () => {
      ensureUnlocked();
      const saltBytes = cryptoApi.randomBytes(16);
      const derived = await cryptoApi.deriveKey(password, saltBytes, iterationsDefault);
      const sealed = await cryptoApi.sealWithKey(stateData, derived);
      const iso = clockISO();
      stateData.updatedAt = iso;
      await storage.put({
        app: APP_ID,
        schemaVersion: SCHEMA_VERSION,
        encrypted: true,
        updatedAt: iso,
        crypto: {
          alg: cryptoApi.ALG || 'AES-GCM-256',
          kdf: cryptoApi.KDF || 'PBKDF2-SHA256',
          iterations: iterationsDefault,
          salt: cryptoApi.toBase64(saltBytes),
          iv: sealed.iv,
          ciphertext: sealed.ciphertext
        }
      });
      key = derived;
      salt = saltBytes;
      iterations = iterationsDefault;
      encrypted = true;
      hasVaultFlag = true;
      notify({ type: 'password-set' });
      return info();
    });
  }

  async function removePassword() {
    ensureUnlocked();
    if (!encrypted) return info();
    return enqueue(async () => {
      ensureUnlocked();
      const iso = clockISO();
      stateData.updatedAt = iso;
      await storage.put({
        app: APP_ID,
        schemaVersion: SCHEMA_VERSION,
        encrypted: false,
        updatedAt: iso,
        data: stateData
      });
      key = null;
      salt = null;
      encrypted = false;
      hasVaultFlag = true;
      notify({ type: 'password-removed' });
      return info();
    });
  }

  // -------------------------------------------------------------------------
  // Profil
  // -------------------------------------------------------------------------

  async function addProfile(input = {}) {
    ensureUnlocked();
    return enqueue(async () => {
      ensureUnlocked();
      const profile = createProfile(input);
      validateItem('profiles', profile);
      stateData.profiles.push(profile);
      if (!stateData.activeProfileId) stateData.activeProfileId = profile.id;
      await persistCurrent();
      notify({ type: 'profile-added', id: profile.id });
      return profile;
    });
  }

  async function updateProfile(id, patch = {}) {
    ensureUnlocked();
    return enqueue(async () => {
      ensureUnlocked();
      const index = findProfileIndex(id);
      if (index < 0) throw stateError('DATA_TIDAK_VALID', 'Profil tidak ditemukan.');
      const existing = stateData.profiles[index];
      const merged = {
        ...existing,
        ...(isPlainObject(patch) ? patch : {}),
        id: existing.id,
        createdAt: existing.createdAt,
        updatedAt: clockISO()
      };
      validateItem('profiles', merged);
      stateData.profiles[index] = merged;
      await persistCurrent();
      notify({ type: 'profile-updated', id: merged.id });
      return merged;
    });
  }

  async function removeProfile(id) {
    ensureUnlocked();
    return enqueue(async () => {
      ensureUnlocked();
      const index = findProfileIndex(id);
      if (index < 0) return false;
      if (stateData.profiles.length <= 1) {
        throw stateError('PROFIL_TERAKHIR');
      }

      stateData.profiles.splice(index, 1);
      for (const collection of ITEM_COLLECTIONS) {
        stateData[collection] = stateData[collection].filter((item) => item.profileId !== id);
      }
      if (stateData.activeProfileId === id) {
        stateData.activeProfileId = stateData.profiles[0]?.id || null;
      }

      // Hapus foto profil (best effort; kegagalan tidak membatalkan cascade data).
      try {
        const photos = await photoStore.list({ profileId: id });
        if (Array.isArray(photos)) {
          for (const photo of photos) {
            try {
              await photoStore.delete(photo.id);
            } catch {
              // abaikan
            }
          }
        }
      } catch {
        // abaikan
      }

      await persistCurrent();
      notify({ type: 'profile-removed', id });
      return true;
    });
  }

  async function setActiveProfile(id) {
    ensureUnlocked();
    return enqueue(async () => {
      ensureUnlocked();
      const profile = modelProfileById(stateData, id);
      if (!profile) throw stateError('DATA_TIDAK_VALID', 'Profil tidak ditemukan.');
      stateData.activeProfileId = profile.id;
      await persistCurrent();
      notify({ type: 'active-profile', id: profile.id });
      return profile;
    });
  }

  // -------------------------------------------------------------------------
  // Koleksi item
  // -------------------------------------------------------------------------

  async function upsert(collection, rawItem) {
    ensureUnlocked();
    requireCollection(collection);
    if (!isPlainObject(rawItem)) {
      throw stateError('DATA_TIDAK_VALID', 'Data yang disimpan tidak valid.');
    }
    return enqueue(async () => {
      ensureUnlocked();
      requireCollection(collection);
      const profileId = rawItem.profileId || stateData.activeProfileId;
      if (!profileId || findProfileIndex(profileId) < 0) {
        throw stateError('DATA_TIDAK_VALID', 'Profil tidak ditemukan.');
      }

      const listItems = stateData[collection];
      const index = listItems.findIndex((item) => item.id === rawItem.id);
      const nowIso = clockISO();
      let merged;

      if (index >= 0) {
        const existing = listItems[index];
        merged = {
          ...existing,
          ...rawItem,
          id: existing.id,
          profileId,
          createdAt: existing.createdAt || rawItem.createdAt || nowIso,
          updatedAt: nowIso
        };
      } else {
        const created = createItem(collection, {
          ...rawItem,
          profileId,
          createdAt: rawItem.createdAt,
          updatedAt: rawItem.updatedAt
        });
        merged = {
          ...created,
          id: rawItem.id || created.id,
          profileId,
          createdAt: created.createdAt,
          updatedAt: nowIso
        };
      }

      validateItem(collection, merged);
      if (['visits', 'medications', 'labs'].includes(collection)) {
        await checkSourcePhotoProfile(merged, profileId);
      }

      if (index >= 0) listItems[index] = merged;
      else listItems.push(merged);

      await persistCurrent();
      notify({
        type: 'change',
        collection,
        id: merged.id,
        action: index >= 0 ? 'update' : 'create'
      });
      return merged;
    });
  }

  async function remove(collection, id) {
    ensureUnlocked();
    requireCollection(collection);
    return enqueue(async () => {
      ensureUnlocked();
      requireCollection(collection);
      const listItems = stateData[collection];
      const index = listItems.findIndex((item) => item.id === id);
      if (index < 0) return false;
      listItems.splice(index, 1);
      await persistCurrent();
      notify({ type: 'change', collection, id, action: 'remove' });
      return true;
    });
  }

  async function logDose({ medicationId, date, time, status = 'taken' } = {}) {
    ensureUnlocked();
    if (typeof medicationId !== 'string' || medicationId.length === 0) {
      throw stateError('DATA_TIDAK_VALID', 'Obat wajib dipilih.');
    }
    if (status !== 'taken' && status !== 'skipped') {
      throw stateError('DATA_TIDAK_VALID', 'Status catatan minum tidak valid.');
    }
    const dateISO = typeof date === 'string' && date ? date : localTodayISO(clockDate());
    const timeValue = typeof time === 'string' && time ? time : '00:00';
    if (!isValidDateISO(dateISO) || !isValidTime(timeValue)) {
      throw stateError('DATA_TIDAK_VALID', 'Tanggal atau jam catatan minum tidak valid.');
    }

    return enqueue(async () => {
      ensureUnlocked();
      const medication = stateData.medications.find((item) => item.id === medicationId);
      const profileId = medication?.profileId || stateData.activeProfileId;
      const id = makeDoseLogId(medicationId, dateISO, timeValue);
      const iso = clockISO();
      const existing = stateData.doseLogs.find((log) => log.id === id);
      let log;
      if (existing) {
        existing.status = status;
        existing.takenAt = iso;
        existing.updatedAt = iso;
        log = existing;
      } else {
        log = createDoseLog({
          id,
          profileId,
          medicationId,
          date: dateISO,
          time: timeValue,
          status,
          takenAt: iso,
          createdAt: iso,
          updatedAt: iso
        });
        stateData.doseLogs.push(log);
      }
      validateItem('doseLogs', log);
      await persistCurrent();
      notify({ type: 'change', collection: 'doseLogs', id, action: 'log' });
      return log;
    });
  }

  async function setSettings(patch = {}) {
    ensureUnlocked();
    if (!isPlainObject(patch)) {
      throw stateError('DATA_TIDAK_VALID', 'Pengaturan tidak valid.');
    }
    return enqueue(async () => {
      ensureUnlocked();
      for (const field of Object.keys(SETTINGS_DEFAULTS)) {
        if (typeof patch[field] === 'boolean') stateData.settings[field] = patch[field];
      }
      await persistCurrent();
      notify({ type: 'settings' });
      return { ...stateData.settings };
    });
  }

  // -------------------------------------------------------------------------
  // Cadangan & reset
  // -------------------------------------------------------------------------

  async function exportBackup({ password = null } = {}) {
    ensureUnlocked();
    return enqueue(async () => {
      ensureUnlocked();
      let photoCount = 0;
      try {
        const photos = await photoStore.list();
        photoCount = Array.isArray(photos) ? photos.length : 0;
      } catch {
        photoCount = 0;
      }
      return backupApi.createBackup(stateData, {
        password,
        now: clockDate(),
        photoCount
      });
    });
  }

  async function importBackup(text, { password = null } = {}) {
    ensureUnlocked();
    return enqueue(async () => {
      ensureUnlocked();
      const result = await backupApi.readBackup(text, { password });
      stateData = result.state;
      await persistCurrent();
      notify({ type: 'imported' });
      return result;
    });
  }

  async function resetAll() {
    ensureUnlocked();
    return enqueue(async () => {
      ensureUnlocked();
      if (typeof photoStore?.clear === 'function') await photoStore.clear();
      stateData = createEmptyState({ now: clockDate() });
      await persistCurrent();
      notify({ type: 'reset' });
      return stateData;
    });
  }

  async function getStorageInfo() {
    let bytes = null;
    let photoBytes = null;
    try {
      const usage = await storage.usage();
      bytes = usage && Number.isFinite(usage.bytes) ? usage.bytes : usage?.bytes ?? null;
    } catch {
      bytes = null;
    }
    try {
      const usage = await photoStore.usage();
      photoBytes = usage && Number.isFinite(usage.bytes) ? usage.bytes : usage?.bytes ?? null;
    } catch {
      photoBytes = null;
    }
    if (typeof photoStore?.kind === 'string') photoKind = photoStore.kind;
    return {
      kind: storage.kind,
      bytes,
      photoKind,
      photoBytes
    };
  }

  // -------------------------------------------------------------------------
  // Foto sumber
  // -------------------------------------------------------------------------

  async function saveSourcePhoto({
    profileId = null,
    kind = 'resep',
    mime,
    dataBase64,
    width = null,
    height = null
  } = {}) {
    ensureUnlocked();
    const activeId = profileId || stateData.activeProfileId;
    if (!activeId || findProfileIndex(activeId) < 0) {
      throw stateError('DATA_TIDAK_VALID', 'Profil wajib ada.');
    }
    if (!SCAN_KINDS.includes(kind)) {
      throw stateError('DATA_TIDAK_VALID', 'Jenis pindaian tidak valid.');
    }
    if (!ALLOWED_SOURCE_PHOTO_MIME.includes(mime)) {
      throw stateError('FOTO_TIDAK_VALID', 'Jenis foto sumber tidak didukung.');
    }
    const bytes = decodedBase64Bytes(dataBase64);
    if (bytes < 0 || bytes === 0) {
      throw stateError('FOTO_TIDAK_VALID', 'Isi foto tidak valid.');
    }
    if (bytes > MAX_SOURCE_PHOTO_BYTES) {
      throw stateError('FOTO_TERLALU_BESAR');
    }

    const iso = clockISO();
    const record = {
      id: newId(ITEM_PREFIXES.photos),
      profileId: activeId,
      kind,
      mime,
      bytes,
      width: typeof width === 'number' && Number.isFinite(width) ? width : null,
      height: typeof height === 'number' && Number.isFinite(height) ? height : null,
      dataBase64: null,
      crypto: null,
      encrypted: false,
      createdAt: iso,
      updatedAt: iso
    };

    if (encrypted) {
      if (!key) throw stateError('TERKUNCI');
      record.crypto = await cryptoApi.sealWithKey({ dataBase64 }, key);
      record.encrypted = true;
    } else {
      record.dataBase64 = dataBase64;
    }

    await photoStore.put(record);
    notify({ type: 'photo-saved', id: record.id });
    return stripPhotoBytes(record);
  }

  async function getSourcePhoto(id) {
    ensureUnlocked();
    if (typeof id !== 'string' || id.length === 0) {
      throw stateError('FOTO_TIDAK_ADA');
    }
    const record = await photoStore.get(id);
    if (!record) throw stateError('FOTO_TIDAK_ADA');

    if (record.encrypted) {
      if (!key) throw stateError('DATA_RUSAK');
      let opened;
      try {
        opened = await cryptoApi.openWithKey(record.crypto, key);
      } catch (error) {
        throw stateError('DATA_RUSAK', error?.message);
      }
      if (!opened || typeof opened.dataBase64 !== 'string') {
        throw stateError('DATA_RUSAK');
      }
      return { ...record, dataBase64: opened.dataBase64 };
    }
    return record;
  }

  async function listSourcePhotos({ profileId = null } = {}) {
    ensureUnlocked();
    const records = await photoStore.list({ profileId });
    const listItems = Array.isArray(records) ? records.slice() : [];
    listItems.sort((a, b) => photoTimestamp(b).localeCompare(photoTimestamp(a)));
    return listItems.map(stripPhotoBytes);
  }

  async function deleteSourcePhoto(id) {
    ensureUnlocked();
    await photoStore.delete(id);
    notify({ type: 'photo-deleted', id });
    return true;
  }

  // -------------------------------------------------------------------------
  // Langganan
  // -------------------------------------------------------------------------

  function subscribe(listener) {
    if (typeof listener !== 'function') {
      throw new TypeError('Listener harus berupa fungsi.');
    }
    listeners.add(listener);
    let active = true;
    return function unsubscribe() {
      if (!active) return;
      active = false;
      listeners.delete(listener);
    };
  }

  return {
    init,
    isLocked,
    isEncrypted,
    hasVault,
    getState,
    getActiveProfile,
    getProfile,
    list,
    unlock,
    lock,
    setPassword,
    removePassword,
    addProfile,
    updateProfile,
    removeProfile,
    setActiveProfile,
    upsert,
    remove,
    logDose,
    saveSourcePhoto,
    getSourcePhoto,
    listSourcePhotos,
    deleteSourcePhoto,
    setSettings,
    exportBackup,
    importBackup,
    getStorageInfo,
    resetAll,
    subscribe
  };
}

export function findActiveMedications(state, profileId, now = new Date()) {
  if (!state || !Array.isArray(state.medications)) return [];
  const today = now instanceof Date ? now : new Date(now);
  const todayISO = localTodayISO(today);
  return state.medications.filter((medication) => {
    if (medication.active === false) return false;
    if (profileId != null && medication.profileId !== profileId) return false;
    if (medication.startDate && medication.startDate > todayISO) return false;
    if (medication.endDate && medication.endDate < todayISO) return false;
    return true;
  });
}

export function getDoseLogMap(doseLogs) {
  const map = new Map();
  if (!Array.isArray(doseLogs)) return map;
  for (const log of doseLogs) {
    if (!log || typeof log.id !== 'string') continue;
    map.set(log.id, log);
  }
  return map;
}
