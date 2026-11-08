'use strict';

/**
 * Test HTTP API — CONTRACT.md §5 dan §9.1.
 *
 * Memakai createApp({ store }) dengan store ber-file di direktori sementara,
 * listen(0) untuk port ephemeral, lalu fetch. Tidak menyentuh data/notes.json
 * dan tidak memakai port 3000.
 */

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const os = require('node:os');
const path = require('node:path');

const { createStore } = require('../server/store');
const { createApp } = require('../server/app');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/**
 * Menyalakan app pada port ephemeral dengan file data sementara yang unik.
 * Semua resource dibersihkan lewat t.after().
 */
async function startApp(t) {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'catatan2-api-'));
  const filePath = path.join(dir, 'notes.json');
  const store = createStore({ filePath });
  const app = createApp({ store });

  const server = await new Promise((resolve, reject) => {
    const s = app.listen(0, '127.0.0.1', () => resolve(s));
    s.once('error', reject);
  });

  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await fs.rm(dir, { recursive: true, force: true });
  });

  const { port } = server.address();
  return {
    base: `http://127.0.0.1:${port}`,
    store,
    filePath,
    server,
  };
}

/**
 * Mengirim request dan mengembalikan status, body teks, serta body JSON (jika ada).
 * `opts.raw` mengirim string apa adanya (untuk menguji JSON rusak / body besar).
 */
async function send(base, method, pathname, body, opts = {}) {
  const headers = { ...(opts.headers || {}) };
  const init = { method, headers };

  if (body !== undefined) {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
    init.body = opts.raw ? body : JSON.stringify(body);
  }

  const res = await fetch(`${base}${pathname}`, init);
  const text = await res.text();
  let json;
  if (text.length > 0) {
    try {
      json = JSON.parse(text);
    } catch {
      json = undefined;
    }
  }
  return { status: res.status, headers: res.headers, text, json };
}

async function createNote(base, title, content) {
  const body = content === undefined ? { title } : { title, content };
  const res = await send(base, 'POST', '/api/notes', body);
  assert.equal(res.status, 201, `POST catatan "${title}" harus 201`);
  return res.json;
}

function assertJsonContentType(res) {
  assert.match(
    res.headers.get('content-type') || '',
    /^application\/json; charset=utf-8/i,
    'response API harus application/json; charset=utf-8',
  );
}

function assertValidation(res, expectedDetails) {
  assert.equal(res.status, 400);
  assertJsonContentType(res);
  assert.equal(res.json.error.code, 'VALIDATION_ERROR');
  assert.equal(res.json.error.message, 'Data catatan tidak valid');
  assert.deepEqual(res.json.error.details, expectedDetails);
}

function assertNotFound(res) {
  assert.equal(res.status, 404);
  assertJsonContentType(res);
  assert.deepEqual(res.json, {
    error: { code: 'NOT_FOUND', message: 'Catatan tidak ditemukan' },
  });
}

test('GET /api/health → 200 {"status":"ok"}', async (t) => {
  const { base } = await startApp(t);

  const res = await send(base, 'GET', '/api/health');
  assert.equal(res.status, 200);
  assertJsonContentType(res);
  assert.deepEqual(res.json, { status: 'ok' });
});

test('GET /api/notes pada store kosong → 200 []', async (t) => {
  const { base, filePath } = await startApp(t);

  const res = await send(base, 'GET', '/api/notes');
  assert.equal(res.status, 200);
  assertJsonContentType(res);
  assert.deepEqual(res.json, []);
  // Membaca belum tentu membuat file, tetapi yang pasti data asli tidak tersentuh.
  assert.ok(filePath.includes(os.tmpdir()));
});

test('POST /api/notes sukses → 201 Note lengkap dan tersimpan', async (t) => {
  const { base, store } = await startApp(t);

  const res = await send(base, 'POST', '/api/notes', {
    title: '  Ide proyek  ',
    content: 'Buat aplikasi catatan',
  });

  assert.equal(res.status, 201);
  assertJsonContentType(res);
  const note = res.json;
  assert.match(note.id, UUID_RE);
  assert.equal(note.title, 'Ide proyek', 'title harus di-trim');
  assert.equal(note.content, 'Buat aplikasi catatan');
  assert.equal(note.createdAt, note.updatedAt);
  assert.deepEqual(Object.keys(note).sort(), ['content', 'createdAt', 'id', 'title', 'updatedAt']);

  // Tersimpan di store (bukan hanya di response).
  assert.deepEqual(await store.get(note.id), note);

  const list = await send(base, 'GET', '/api/notes');
  assert.deepEqual(list.json, [note]);
});

test('POST /api/notes tanpa content → content ""', async (t) => {
  const { base } = await startApp(t);

  const note = await createNote(base, 'Tanpa isi');
  assert.equal(note.content, '');
});

test('POST /api/notes memvalidasi title dan content sesuai §5.4', async (t) => {
  const { base, store } = await startApp(t);

  // title tidak ada
  assertValidation(await send(base, 'POST', '/api/notes', { content: 'isi' }), [
    { field: 'title', message: 'Judul wajib diisi' },
  ]);

  // title spasi saja
  assertValidation(await send(base, 'POST', '/api/notes', { title: '   ' }), [
    { field: 'title', message: 'Judul wajib diisi' },
  ]);

  // title bukan string
  assertValidation(await send(base, 'POST', '/api/notes', { title: 123 }), [
    { field: 'title', message: 'Judul harus berupa teks' },
  ]);

  // title > 200 karakter setelah trim
  assertValidation(await send(base, 'POST', '/api/notes', { title: 'x'.repeat(201) }), [
    { field: 'title', message: 'Judul maksimal 200 karakter' },
  ]);

  // content bukan string
  assertValidation(await send(base, 'POST', '/api/notes', { title: 'Valid', content: 42 }), [
    { field: 'content', message: 'Isi harus berupa teks' },
  ]);

  // content > 10.000 karakter
  assertValidation(
    await send(base, 'POST', '/api/notes', { title: 'Valid', content: 'x'.repeat(10001) }),
    [{ field: 'content', message: 'Isi maksimal 10000 karakter' }],
  );

  // body bukan objek JSON (array)
  assertValidation(await send(base, 'POST', '/api/notes', []), [
    { field: 'body', message: 'Body harus berupa objek JSON' },
  ]);

  // beberapa field invalid → details urut title lalu content
  assertValidation(await send(base, 'POST', '/api/notes', { title: '', content: 42 }), [
    { field: 'title', message: 'Judul wajib diisi' },
    { field: 'content', message: 'Isi harus berupa teks' },
  ]);

  // Tidak ada catatan yang tercipta dari request invalid.
  assert.deepEqual(await store.list(), []);
});

test('GET /api/notes/:id → 200 Note dan 404 untuk id tak dikenal', async (t) => {
  const { base } = await startApp(t);
  const note = await createNote(base, 'Satu', 'isi satu');

  const found = await send(base, 'GET', `/api/notes/${note.id}`);
  assert.equal(found.status, 200);
  assertJsonContentType(found);
  assert.deepEqual(found.json, note);

  assertNotFound(await send(base, 'GET', '/api/notes/id-tidak-ada'));
});

test('PUT /api/notes/:id parsial dan penuh → 200, field yang tidak dikirim tetap', async (t) => {
  const { base, store } = await startApp(t);
  const awal = await createNote(base, 'Awal', 'isi awal');

  await delay(5);
  const parsial = await send(base, 'PUT', `/api/notes/${awal.id}`, { title: '  Judul baru  ' });
  assert.equal(parsial.status, 200);
  assertJsonContentType(parsial);
  assert.equal(parsial.json.id, awal.id);
  assert.equal(parsial.json.createdAt, awal.createdAt);
  assert.equal(parsial.json.title, 'Judul baru');
  assert.equal(parsial.json.content, 'isi awal');
  assert.ok(parsial.json.updatedAt > awal.updatedAt);

  await delay(5);
  const penuh = await send(base, 'PUT', `/api/notes/${awal.id}`, {
    title: 'Judul penuh',
    content: 'isi penuh',
  });
  assert.equal(penuh.status, 200);
  assert.equal(penuh.json.title, 'Judul penuh');
  assert.equal(penuh.json.content, 'isi penuh');
  assert.equal(penuh.json.createdAt, awal.createdAt);
  assert.ok(penuh.json.updatedAt > parsial.json.updatedAt);

  // Persistensi di store.
  assert.deepEqual(await store.get(awal.id), penuh.json);
});

test('PUT /api/notes/:id dengan body {} → 400 field body', async (t) => {
  const { base } = await startApp(t);
  const note = await createNote(base, 'Ada');

  assertValidation(await send(base, 'PUT', `/api/notes/${note.id}`, {}), [
    { field: 'body', message: 'Kirim minimal satu field: title atau content' },
  ]);
});

test('PUT /api/notes/:id tidak ditemukan → 404 tanpa membuat catatan', async (t) => {
  const { base, store } = await startApp(t);

  assertNotFound(await send(base, 'PUT', '/api/notes/tidak-ada', { title: 'Baru' }));
  assert.deepEqual(await store.list(), []);
});

test('DELETE /api/notes/:id → 204 tanpa body, lalu 404; id tak dikenal → 404', async (t) => {
  const { base, store } = await startApp(t);
  const note = await createNote(base, 'Akan dihapus');

  const dihapus = await send(base, 'DELETE', `/api/notes/${note.id}`);
  assert.equal(dihapus.status, 204);
  assert.equal(dihapus.text, '', 'response 204 harus tanpa body');
  assert.equal(await store.get(note.id), null);

  assertNotFound(await send(base, 'GET', `/api/notes/${note.id}`));
  assertNotFound(await send(base, 'DELETE', `/api/notes/${note.id}`));
  assertNotFound(await send(base, 'DELETE', '/api/notes/id-tidak-ada'));
});

test('JSON rusak pada POST → 400 INVALID_JSON dan server tetap hidup', async (t) => {
  const { base } = await startApp(t);

  const res = await send(base, 'POST', '/api/notes', '{"title": "rusak"', { raw: true });
  assert.equal(res.status, 400);
  assertJsonContentType(res);
  assert.deepEqual(res.json, {
    error: {
      code: 'INVALID_JSON',
      message: 'Body request bukan JSON yang valid',
    },
  });

  // Server tidak crash dan data tidak berubah.
  const list = await send(base, 'GET', '/api/notes');
  assert.equal(list.status, 200);
  assert.deepEqual(list.json, []);
});

test('body > 100 KB pada POST → 413 PAYLOAD_TOO_LARGE', async (t) => {
  const { base } = await startApp(t);

  const bodyBesar = JSON.stringify({ title: 'Besar', content: 'x'.repeat(110 * 1024) });
  const res = await send(base, 'POST', '/api/notes', bodyBesar, { raw: true });

  assert.equal(res.status, 413);
  assertJsonContentType(res);
  assert.deepEqual(res.json, {
    error: {
      code: 'PAYLOAD_TOO_LARGE',
      message: 'Body request terlalu besar',
    },
  });
});

test('GET /api/notes mengurutkan updatedAt descending', async (t) => {
  const { base } = await startApp(t);

  const a = await createNote(base, 'A');
  await delay(10);
  const b = await createNote(base, 'B');
  await delay(10);
  const c = await createNote(base, 'C');

  // Update A agar menjadi yang paling baru diperbarui.
  await delay(10);
  const updateA = await send(base, 'PUT', `/api/notes/${a.id}`, { content: 'A diubah' });
  assert.equal(updateA.status, 200);

  const list = await send(base, 'GET', '/api/notes');
  assert.equal(list.status, 200);
  assert.deepEqual(
    list.json.map((n) => n.id),
    [a.id, c.id, b.id],
  );

  for (let i = 1; i < list.json.length; i += 1) {
    assert.ok(
      list.json[i - 1].updatedAt >= list.json[i].updatedAt,
      'updatedAt harus descending',
    );
  }
});

test('endpoint API tak dikenal → 404 NOT_FOUND "Endpoint tidak ditemukan"', async (t) => {
  const { base } = await startApp(t);

  const res = await send(base, 'GET', '/api/tidak-dikenal');
  assert.equal(res.status, 404);
  assertJsonContentType(res);
  assert.deepEqual(res.json, {
    error: { code: 'NOT_FOUND', message: 'Endpoint tidak ditemukan' },
  });
});
