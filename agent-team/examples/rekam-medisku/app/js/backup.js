// Rekam Medisku — cadangan JSON (plain atau terenkripsi).
// Foto sumber TIDAK disertakan pada format v1; hanya SourceMeta di dalam state.

import * as cryptoApi from './crypto.js';
import { APP_ID, SCHEMA_VERSION, normalizeState } from './model.js';

export const BACKUP_FORMAT = 'rawatku-backup';
export const BACKUP_VERSION = 1;

const MESSAGES = {
  BUKAN_CADANGAN_RAWATKU: 'Berkas ini bukan cadangan Rekam Medisku.',
  CADANGAN_TERKUNCI: 'Cadangan ini terkunci. Masukkan kata sandi cadangan.',
  KATA_SANDI_SALAH: 'Kata sandi salah. Data tidak diubah.',
  VERSI_TIDAK_DIDUKUNG: 'Versi berkas tidak didukung aplikasi ini.',
  DATA_RUSAK: 'Data tidak dapat dibaca. Jangan hapus apa pun; coba cadangan terakhir.'
};

export class BackupError extends Error {
  constructor(message, { code = 'DATA_RUSAK' } = {}) {
    super(message || MESSAGES[code] || MESSAGES.DATA_RUSAK);
    this.name = 'BackupError';
    this.code = code;
  }
}

function backupError(code, message) {
  return new BackupError(message, { code });
}

function pad2(value) {
  return String(value).padStart(2, '0');
}

function filenameFor(date) {
  const stamp = [
    date.getFullYear(),
    pad2(date.getMonth() + 1),
    pad2(date.getDate())
  ].join('');
  const clock = `${pad2(date.getHours())}${pad2(date.getMinutes())}`;
  return `rawatku-cadangan-${stamp}-${clock}.rawatku.json`;
}

function asDate(now) {
  const date = now instanceof Date ? now : new Date(now);
  return Number.isNaN(date.getTime()) ? new Date() : date;
}

function profileCountOf(state) {
  return Array.isArray(state?.profiles) ? state.profiles.length : 0;
}

function schemaVersionOf(state) {
  return Number.isInteger(state?.schemaVersion) ? state.schemaVersion : SCHEMA_VERSION;
}

function normalizeOrThrow(data) {
  try {
    return normalizeState(data);
  } catch {
    // Isi cadangan yang tidak dapat dinormalisasi dianggap data rusak; kode
    // VERSI_TIDAK_DIDUKUNG hanya untuk versi berkas (envelope) yang berbeda.
    throw backupError('DATA_RUSAK');
  }
}

export async function createBackup(state, { password = null, now = new Date(), photoCount = 0 } = {}) {
  const createdAt = asDate(now).toISOString();
  const encrypted = typeof password === 'string' ? password.length > 0 : Boolean(password);
  const backup = {
    app: APP_ID,
    format: BACKUP_FORMAT,
    version: BACKUP_VERSION,
    createdAt,
    encrypted,
    data: null
  };

  if (encrypted) {
    try {
      backup.data = await cryptoApi.encryptJSON(state, password);
    } catch (error) {
      if (error?.code === 'DATA_RUSAK') throw backupError('DATA_RUSAK');
      throw backupError('DATA_RUSAK', error?.message);
    }
  } else {
    backup.data = state;
  }

  return {
    filename: filenameFor(asDate(now)),
    text: JSON.stringify(backup, null, 2),
    meta: {
      createdAt,
      encrypted,
      profileCount: profileCountOf(state),
      schemaVersion: schemaVersionOf(state),
      photoCount: Number.isInteger(photoCount) && photoCount > 0 ? photoCount : 0
    }
  };
}

export async function readBackup(text, { password = null } = {}) {
  let backup;
  try {
    backup = JSON.parse(text);
  } catch {
    throw backupError('BUKAN_CADANGAN_RAWATKU');
  }
  if (!backup || typeof backup !== 'object'
    || backup.app !== APP_ID || backup.format !== BACKUP_FORMAT) {
    throw backupError('BUKAN_CADANGAN_RAWATKU');
  }
  if (backup.version !== BACKUP_VERSION) {
    throw backupError('VERSI_TIDAK_DIDUKUNG');
  }

  const createdAt = typeof backup.createdAt === 'string' ? backup.createdAt : null;
  const encrypted = backup.encrypted === true;

  let data;
  if (encrypted) {
    if (password == null || password === '') {
      throw backupError('CADANGAN_TERKUNCI');
    }
    if (!backup.data || typeof backup.data !== 'object') {
      throw backupError('DATA_RUSAK');
    }
    try {
      data = await cryptoApi.decryptJSON(backup.data, password);
    } catch (error) {
      if (error?.code === 'KATA_SANDI_SALAH') {
        throw backupError('KATA_SANDI_SALAH');
      }
      throw backupError('DATA_RUSAK', error?.message);
    }
  } else {
    if (!backup.data || typeof backup.data !== 'object') {
      throw backupError('DATA_RUSAK');
    }
    data = backup.data;
  }

  const state = normalizeOrThrow(data);
  return {
    state,
    meta: {
      createdAt,
      encrypted,
      schemaVersion: state.schemaVersion,
      profileCount: profileCountOf(state),
      photoCount: 0
    }
  };
}
