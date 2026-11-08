'use strict';

/**
 * JSON file store — satu-satunya lapisan yang membaca/menulis file data.
 *
 * Kontrak: CONTRACT.md §3 dan §4.
 * Hanya memakai modul bawaan Node (fs/promises, path, crypto).
 */

const fs = require('fs/promises');
const path = require('path');
const crypto = require('crypto');

const FILE_VERSION = 1;
const NOTE_FIELDS = ['id', 'title', 'content', 'createdAt', 'updatedAt'];

function emptyData() {
  return { version: FILE_VERSION, notes: [] };
}

function isPlainObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function invalidData(reason) {
  return new Error(`File data catatan tidak valid: ${reason}`);
}

function normalizeTitle(title) {
  if (typeof title !== 'string') {
    throw new TypeError('title harus berupa string');
  }
  return title.trim();
}

/**
 * Validasi bentuk data hasil parse. Bentuk yang tidak sesuai harus melempar
 * Error (tidak boleh diam-diam menganggap data kosong).
 */
function parseData(raw) {
  let data;
  try {
    data = JSON.parse(raw);
  } catch (err) {
    throw invalidData('JSON tidak dapat di-parse');
  }

  if (!isPlainObject(data)) {
    throw invalidData('root harus berupa objek');
  }
  if (data.version !== FILE_VERSION) {
    throw invalidData('version harus 1');
  }
  if (!Array.isArray(data.notes)) {
    throw invalidData('notes harus berupa array');
  }

  const notes = data.notes.map((note, index) => {
    if (!isPlainObject(note)) {
      throw invalidData(`notes[${index}] harus berupa objek`);
    }
    for (const field of NOTE_FIELDS) {
      if (typeof note[field] !== 'string') {
        throw invalidData(`notes[${index}].${field} harus berupa teks`);
      }
    }
    // Kembalikan hanya field Note yang dikenal agar bentuk data tetap konsisten.
    return {
      id: note.id,
      title: note.title,
      content: note.content,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
    };
  });

  return { version: FILE_VERSION, notes };
}

/**
 * Urutan daftar: updatedAt desc, lalu createdAt desc, lalu id asc.
 * Timestamp ISO 8601 UTC dengan panjang tetap, sehingga perbandingan
 * lexicographic setara dengan perbandingan waktu.
 */
function compareNotes(a, b) {
  if (a.updatedAt !== b.updatedAt) {
    return a.updatedAt < b.updatedAt ? 1 : -1;
  }
  if (a.createdAt !== b.createdAt) {
    return a.createdAt < b.createdAt ? 1 : -1;
  }
  if (a.id !== b.id) {
    return a.id < b.id ? -1 : 1;
  }
  return 0;
}

function createStore({ filePath } = {}) {
  if (typeof filePath !== 'string' || filePath.length === 0) {
    throw new TypeError('filePath wajib berupa string non-kosong');
  }

  const tmpPath = `${filePath}.tmp`;
  const dirPath = path.dirname(filePath);

  // Satu antrean internal: setiap operasi (termasuk baca) berjalan berurutan.
  let tail = Promise.resolve();

  function enqueue(task) {
    const result = tail.then(() => task());
    // Jangan biarkan satu kegagalan mematikan antrean berikutnya.
    tail = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  async function readData() {
    let raw;
    try {
      raw = await fs.readFile(filePath, 'utf8');
    } catch (err) {
      if (err && err.code === 'ENOENT') {
        return emptyData();
      }
      throw err;
    }
    return parseData(raw);
  }

  async function writeData(data) {
    const payload = `${JSON.stringify(data, null, 2)}\n`;
    await fs.mkdir(dirPath, { recursive: true });
    // Tulis atomik: file sementara di direktori yang sama, lalu rename.
    await fs.writeFile(tmpPath, payload, 'utf8');
    await fs.rename(tmpPath, filePath);
  }

  /** @returns {Promise<Array<object>>} */
  function list() {
    return enqueue(async () => {
      const data = await readData();
      return data.notes.slice().sort(compareNotes);
    });
  }

  /** @returns {Promise<object|null>} */
  function get(id) {
    return enqueue(async () => {
      const data = await readData();
      const note = data.notes.find((item) => item.id === id);
      return note || null;
    });
  }

  /** @returns {Promise<object>} */
  function create(input) {
    return enqueue(async () => {
      const args = isPlainObject(input) ? input : {};
      // Normalisasi dilakukan sebelum menyentuh disk agar input buruk tidak menulis apa pun.
      const title = normalizeTitle(args.title);
      const content = args.content === undefined ? '' : args.content;

      const data = await readData();
      const timestamp = new Date().toISOString();
      const note = {
        id: crypto.randomUUID(),
        title,
        content,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      data.notes.push(note);
      await writeData(data);
      return note;
    });
  }

  /** @returns {Promise<object|null>} */
  function update(id, patch) {
    return enqueue(async () => {
      const data = await readData();
      const note = data.notes.find((item) => item.id === id);
      if (!note) {
        return null;
      }

      const changes = isPlainObject(patch) ? patch : {};
      if (changes.title !== undefined) {
        note.title = normalizeTitle(changes.title);
      }
      if (changes.content !== undefined) {
        note.content = changes.content;
      }
      note.updatedAt = new Date().toISOString();

      await writeData(data);
      return note;
    });
  }

  /** @returns {Promise<boolean>} */
  function remove(id) {
    return enqueue(async () => {
      const data = await readData();
      const index = data.notes.findIndex((item) => item.id === id);
      if (index === -1) {
        return false;
      }

      data.notes.splice(index, 1);
      await writeData(data);
      return true;
    });
  }

  return { list, get, create, update, remove };
}

module.exports = { createStore };
