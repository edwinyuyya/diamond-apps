'use strict';

/**
 * Test store JSON — CONTRACT.md §3, §4, dan §9.1.
 * Semua file data berada di direktori sementara (fs.mkdtemp), tidak pernah
 * menyentuh data/notes.json milik aplikasi.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createStore } = require('../server/store');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const NOTE_KEYS = ['content', 'createdAt', 'id', 'title', 'updatedAt'];

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** Membuat direktori sementara unik untuk satu test dan membersihkannya di akhir. */
async function setup(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'catatan2-store-'));
  t.after(() => fs.rm(dir, { recursive: true, force: true }));
  return { dir, filePath: path.join(dir, 'notes.json') };
}

test('createStore() menolak filePath yang tidak valid', () => {
  assert.throws(() => createStore(), TypeError);
  assert.throws(() => createStore({}), TypeError);
  assert.throws(() => createStore({ filePath: '' }), TypeError);
  assert.throws(() => createStore({ filePath: 123 }), TypeError);
});

test('list() mengembalikan [] bila file belum ada tanpa membuat file', async (t) => {
  const { filePath } = await setup(t);
  const store = createStore({ filePath });

  assert.deepEqual(await store.list(), []);
  await assert.rejects(fs.stat(filePath), { code: 'ENOENT' });
});

test('create() menghasilkan Note lengkap dan menulis file sesuai §3.2', async (t) => {
  const { filePath } = await setup(t);
  const store = createStore({ filePath });

  const note = await store.create({
    title: '  Belanja mingguan  ',
    content: 'Susu, telur, roti',
  });

  assert.match(note.id, UUID_RE);
  assert.equal(note.title, 'Belanja mingguan', 'title harus di-trim');
  assert.equal(note.content, 'Susu, telur, roti');
  assert.equal(note.createdAt, note.updatedAt, 'createdAt = updatedAt saat create');
  assert.ok(!Number.isNaN(Date.parse(note.createdAt)), 'createdAt harus ISO valid');
  assert.deepEqual(Object.keys(note).sort(), NOTE_KEYS);

  const raw = await fs.readFile(filePath, 'utf8');
  assert.ok(raw.endsWith('\n'), 'file data harus diakhiri newline');

  const parsed = JSON.parse(raw);
  assert.equal(parsed.version, 1);
  assert.deepEqual(parsed.notes, [note]);
  assert.equal(raw, `${JSON.stringify(parsed, null, 2)}\n`, 'format harus pretty-print 2 spasi');
});

test('create() memakai content default "" dan tidak men-trim content', async (t) => {
  const { filePath } = await setup(t);
  const store = createStore({ filePath });

  const tanpaContent = await store.create({ title: 'Tanpa isi' });
  assert.equal(tanpaContent.content, '');

  const denganSpasi = await store.create({
    title: 'Dengan isi',
    content: '  indentasi dipertahankan  ',
  });
  assert.equal(denganSpasi.content, '  indentasi dipertahankan  ');
});

test('get() mengembalikan catatan yang ada dan null untuk id tak dikenal', async (t) => {
  const { filePath } = await setup(t);
  const store = createStore({ filePath });

  const note = await store.create({ title: 'Satu', content: 'isi' });

  assert.deepEqual(await store.get(note.id), note);
  assert.equal(await store.get('id-yang-tidak-ada'), null);
});

test('update() parsial mempertahankan field lain dan memperbarui updatedAt', async (t) => {
  const { filePath } = await setup(t);
  const store = createStore({ filePath });

  const awal = await store.create({ title: 'Awal', content: 'isi awal' });
  await delay(5);

  const diubah = await store.update(awal.id, { title: '  Judul baru  ' });
  assert.equal(diubah.id, awal.id);
  assert.equal(diubah.createdAt, awal.createdAt, 'createdAt tidak berubah');
  assert.equal(diubah.title, 'Judul baru', 'title harus di-trim');
  assert.equal(diubah.content, 'isi awal', 'content tidak dikirim → tidak berubah');
  assert.ok(diubah.updatedAt > awal.updatedAt, 'updatedAt harus lebih baru');

  // Perubahan terlihat oleh instance baru (dibaca dari disk).
  const instanceBaru = createStore({ filePath });
  assert.deepEqual(await instanceBaru.get(awal.id), diubah);

  // Update penuh: kedua field berubah.
  await delay(5);
  const penuh = await store.update(awal.id, { title: 'Penuh', content: 'isi penuh' });
  assert.equal(penuh.title, 'Penuh');
  assert.equal(penuh.content, 'isi penuh');
  assert.ok(penuh.updatedAt > diubah.updatedAt);
});

test('update() dengan id tak dikenal mengembalikan null tanpa mengubah file', async (t) => {
  const { filePath } = await setup(t);
  const store = createStore({ filePath });

  await store.create({ title: 'Tetap' });
  const sebelum = await fs.readFile(filePath, 'utf8');

  assert.equal(await store.update('tidak-ada', { title: 'Baru' }), null);
  assert.equal(await fs.readFile(filePath, 'utf8'), sebelum, 'file tidak boleh berubah');
});

test('remove() menghapus catatan dan mengembalikan false untuk id tak dikenal', async (t) => {
  const { filePath } = await setup(t);
  const store = createStore({ filePath });

  const note = await store.create({ title: 'Akan dihapus' });

  assert.equal(await store.remove('tidak-ada'), false);
  assert.equal(await store.remove(note.id), true);
  assert.equal(await store.get(note.id), null);
  assert.deepEqual(await store.list(), []);

  // Penghapusan juga terlihat oleh instance store baru.
  assert.deepEqual(await createStore({ filePath }).list(), []);
});

test('dua instance store dengan file sama melihat data yang sama', async (t) => {
  const { filePath } = await setup(t);

  const pertama = createStore({ filePath });
  const dibuat = await pertama.create({ title: 'Persisten', content: 'bertahan' });

  const kedua = createStore({ filePath });
  assert.deepEqual(await kedua.list(), [dibuat]);
  assert.deepEqual(await kedua.get(dibuat.id), dibuat);

  const diubah = await kedua.update(dibuat.id, { content: 'diubah instance kedua' });
  assert.equal(diubah.content, 'diubah instance kedua');
  assert.equal((await pertama.get(dibuat.id)).content, 'diubah instance kedua');
});

test('file JSON korup membuat semua method melempar Error dan tidak mereset file', async (t) => {
  const { filePath } = await setup(t);
  const korup = '{"version": 1, "notes": [';
  await fs.writeFile(filePath, korup, 'utf8');

  const store = createStore({ filePath });

  await assert.rejects(store.list(), Error);
  await assert.rejects(store.get('apa-saja'), Error);
  await assert.rejects(store.create({ title: 'Tidak boleh tertulis' }), Error);
  await assert.rejects(store.update('apa-saja', { title: 'X' }), Error);
  await assert.rejects(store.remove('apa-saja'), Error);

  assert.equal(
    await fs.readFile(filePath, 'utf8'),
    korup,
    'file korup tidak boleh ditimpa/direset',
  );
});

test('file dengan bentuk tidak sesuai melempar Error', async (t) => {
  const { filePath } = await setup(t);
  const store = createStore({ filePath });

  const bentukSalah = [
    '[]',
    '"string"',
    'null',
    '{"version":2,"notes":[]}',
    '{"version":1,"notes":{}}',
    '{"version":1,"notes":[{"id":"x"}]}',
  ];

  for (const raw of bentukSalah) {
    await fs.writeFile(filePath, raw, 'utf8');
    await assert.rejects(store.list(), Error, `bentuk harus ditolak: ${raw}`);
  }
});

test('list() mengurutkan updatedAt desc, createdAt desc, lalu id asc', async (t) => {
  const { filePath } = await setup(t);
  const note = (id, createdAt, updatedAt) => ({
    id,
    title: id.toUpperCase(),
    content: '',
    createdAt,
    updatedAt,
  });

  const data = {
    version: 1,
    notes: [
      note('b', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      note('a', '2026-01-01T00:00:00.000Z', '2026-01-01T00:00:00.000Z'),
      note('c', '2026-01-01T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
      note('d', '2026-01-03T00:00:00.000Z', '2026-01-02T00:00:00.000Z'),
    ],
  };
  await fs.writeFile(filePath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');

  const store = createStore({ filePath });
  const hasil = await store.list();
  // updatedAt desc: c & d (2026-01-02), lalu a & b (2026-01-01).
  // c dan d seri → createdAt desc → d; a dan b seri → id asc → a, b.
  assert.deepEqual(hasil.map((n) => n.id), ['d', 'c', 'a', 'b']);
});

test('operasi konkuren dijalankan berurutan tanpa kehilangan update', async (t) => {
  const { filePath } = await setup(t);
  const store = createStore({ filePath });

  await Promise.all(
    Array.from({ length: 25 }, (_, i) => store.create({ title: `Catatan ${i}` })),
  );
  assert.equal((await store.list()).length, 25);
});
