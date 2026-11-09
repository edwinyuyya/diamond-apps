// t16 QA — platform: model, storage, state, dan server statis (termasuk vendor).

import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';

import {
  createEmptyState,
  createItem,
  createMedication,
  createProfile,
  createVisit,
  cloneState,
  ageFromBirthDate,
  newId,
  normalizeState,
  validateItem
} from '../app/js/model.js';
import { createStorage } from '../app/js/storage.js';
import { createPhotoStore } from '../app/js/photos.js';
import { createState } from '../app/js/state.js';
import { createServer } from '../server.js';

const CLOCK = () => new Date(2026, 10, 9, 7, 0, 0);
const PHOTO_B64 = 'AAECAwQFBgc=';

function memoryPhotoStore() {
  return createPhotoStore({ indexedDB: null });
}

function memoryState(extra = {}) {
  return createState({
    storage: createStorage({}),
    photoStore: memoryPhotoStore(),
    clock: CLOCK,
    kdfIterations: 1000,
    ...extra
  });
}

function rawRequest(port, requestPath, method = 'GET') {
  return new Promise((resolve, reject) => {
    const req = http.request({ host: '127.0.0.1', port, path: requestPath, method }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { body += chunk; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', reject);
    req.end();
  });
}

// ---------------------------------------------------------------------------
// model
// ---------------------------------------------------------------------------

test('model: factories, validasi visit/lampiran, id, normalizeState, clone/age', () => {
  assert.match(newId('med'), /^med_[A-Za-z0-9_-]+$/);
  assert.notEqual(newId('med'), newId('med'));

  const state = createEmptyState({ now: CLOCK() });
  assert.equal(state.app, 'rawatku');
  assert.equal(state.schemaVersion, 1);
  assert.equal(state.profiles.length, 1);
  assert.equal(state.activeProfileId, state.profiles[0].id);
  assert.deepEqual(state.settings, { fontLarge: false, highContrast: false, reminders: true });

  const med = createMedication({ name: 'Amlodipin' });
  assert.equal(med.active, true);
  assert.equal(med.daysOfWeek.length, 7);
  assert.equal(med.refillReminderDays, 3);
  assert.equal(med.stock.unitsPerDose, 1);
  assert.equal(createItem('medications', { name: 'X' }).name, 'X');

  const profile = createProfile({
    name: 'Budi',
    emergencyContacts: [
      { name: 'A', relation: 'x', phone: '1' },
      { name: 'B', relation: 'x', phone: '2' },
      { name: 'C', relation: 'x', phone: '3' },
      { name: 'D', relation: 'x', phone: '4' }
    ]
  });
  assert.equal(profile.emergencyContacts.length, 3);

  assert.throws(
    () => validateItem('visits', createVisit({ profileId: 'prf_1', date: 'bukan-tanggal' })),
    (error) => error.name === 'ValidationError' && error.code === 'DATA_TIDAK_VALID' && error.field === 'date'
  );

  const oversized = {
    id: 'att_1', name: 'besar.jpg', mime: 'image/jpeg', size: 1048577,
    dataBase64: 'A'.repeat(Math.ceil(1048577 * 4 / 3)), addedAt: '2026-11-01T00:00:00.000Z'
  };
  assert.throws(() => validateItem('visits', createVisit({
    profileId: 'prf_1', date: '2026-11-01', attachments: [oversized]
  })), (error) => error.code === 'DATA_TIDAK_VALID');

  const raw = {
    app: 'rawatku',
    schemaVersion: 1,
    createdAt: '2026-11-01T00:00:00.000Z',
    updatedAt: '2026-11-01T00:00:00.000Z',
    settings: { fontLarge: true },
    activeProfileId: 'prf_hilang',
    profiles: [],
    visits: [
      { id: 'vis_old', profileId: 'prf_x', date: '2026-11-01', doctorName: '', facility: '', complaint: '', diagnosis: '', notes: '', attachments: [], createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' },
      { id: 'vis_bad_source', profileId: 'prf_x', date: '2026-11-02', doctorName: '', facility: '', complaint: '', diagnosis: '', notes: '', attachments: [], source: { kind: 'tidak-dikenal' }, createdAt: '2026-11-01T00:00:00.000Z', updatedAt: '2026-11-01T00:00:00.000Z' },
      { id: 'vis_bad_date', profileId: 'prf_x', date: 'nope', attachments: [] }
    ],
    medications: [], doseLogs: [], vitals: [], labs: [], refRanges: [], questions: []
  };
  const normalized = normalizeState(raw);
  assert.equal(normalized.profiles.length, 1);
  assert.equal(normalized.activeProfileId, normalized.profiles[0].id);
  assert.equal(normalized.settings.fontLarge, true);
  assert.deepEqual(normalized.visits.map((v) => v.id), ['vis_old', 'vis_bad_source']);
  assert.equal(normalized.visits[0].source, null);
  assert.equal(normalized.visits[1].source, null);

  assert.throws(() => normalizeState({ app: 'rawatku', schemaVersion: 2 }),
    (error) => error.code === 'VERSI_TIDAK_DIDUKUNG');

  const copy = cloneState(state);
  assert.notStrictEqual(copy, state);
  assert.deepEqual(copy, state);
  assert.equal(ageFromBirthDate('1962-04-17', new Date(2026, 10, 9)), 64);
  assert.equal(ageFromBirthDate('bukan', new Date(2026, 10, 9)), null);
});

// ---------------------------------------------------------------------------
// storage
// ---------------------------------------------------------------------------

test('storage: backend memori dan localStorage, put/get/clear/usage', async () => {
  const memory = createStorage({});
  assert.equal(memory.kind, 'memory');
  assert.equal(await memory.get(), null);
  await memory.put({ app: 'rawatku', nilai: 1 });
  assert.deepEqual(await memory.get(), { app: 'rawatku', nilai: 1 });
  const usage = await memory.usage();
  assert.equal(typeof usage.bytes, 'number');
  assert.ok(usage.bytes > 0);
  await memory.clear();
  assert.equal(await memory.get(), null);

  const backing = new Map();
  const fakeLocalStorage = {
    getItem: (key) => (backing.has(key) ? backing.get(key) : null),
    setItem: (key, value) => { backing.set(key, String(value)); },
    removeItem: (key) => { backing.delete(key); }
  };
  const local = createStorage({ localStorage: fakeLocalStorage });
  assert.equal(local.kind, 'localstorage');
  await local.put({ teks: 'halo' });
  assert.deepEqual(await local.get(), { teks: 'halo' });
  assert.equal(backing.size, 1);
  await local.clear();
  assert.equal(await local.get(), null);
});

// ---------------------------------------------------------------------------
// state
// ---------------------------------------------------------------------------

test('state: init kosong, upsert, reload instance baru, backup, logDose idempoten', async () => {
  const storage = createStorage({});
  const state = createState({
    storage,
    photoStore: memoryPhotoStore(),
    clock: CLOCK,
    kdfIterations: 1000
  });

  const initial = await state.init();
  assert.equal(initial.locked, false);
  assert.equal(initial.encrypted, false);
  assert.equal(state.getActiveProfile().name, 'Saya');

  const profileId = state.getActiveProfile().id;
  const visit = await state.upsert('visits', { date: '2026-11-01', doctorName: 'dr. Sari' });
  assert.match(visit.id, /^vis_/);
  assert.equal(visit.profileId, profileId);

  const med = await state.upsert('medications', { name: 'Amlodipin', times: ['08:00'], startDate: '2026-11-01' });
  assert.match(med.id, /^med_/);

  const first = await state.logDose({ medicationId: med.id, date: '2026-11-09', time: '08:00' });
  const second = await state.logDose({ medicationId: med.id, date: '2026-11-09', time: '08:00', status: 'skipped' });
  assert.equal(first.id, second.id);
  assert.equal(state.list('doseLogs').length, 1);
  assert.equal(second.status, 'skipped');

  const backup = await state.exportBackup();
  assert.equal(backup.meta.profileCount, 1);
  assert.equal(backup.meta.encrypted, false);
  assert.match(backup.filename, /^rawatku-cadangan-20261109-0700\.rawatku\.json$/);

  const reloaded = createState({
    storage,
    photoStore: memoryPhotoStore(),
    clock: CLOCK,
    kdfIterations: 1000
  });
  await reloaded.init();
  assert.equal(reloaded.list('visits').length, 1);
  assert.equal(reloaded.list('medications').length, 1);
  assert.equal(reloaded.list('doseLogs').length, 1);
});

test('state: setPassword lock/unlock, foto sumber, removeProfile cascade', async () => {
  const state = memoryState();
  await state.init();
  const rootId = state.getActiveProfile().id;

  await state.setPassword('sandi-uji');
  assert.equal(state.isEncrypted(), true);
  await state.lock();
  assert.equal(state.isLocked(), true);
  assert.throws(() => state.getState(), (error) => error.code === 'TERKUNCI');
  await state.unlock('sandi-uji');
  assert.equal(state.isLocked(), false);

  const photo = await state.saveSourcePhoto({ kind: 'resep', mime: 'image/jpeg', dataBase64: PHOTO_B64 });
  assert.equal(photo.encrypted, true);
  assert.equal(photo.dataBase64, undefined);
  assert.ok(photo.crypto && photo.crypto.ciphertext);
  const opened = await state.getSourcePhoto(photo.id);
  assert.equal(opened.dataBase64, PHOTO_B64);

  await state.lock();
  await assert.rejects(() => state.getSourcePhoto(photo.id), (error) => error.code === 'TERKUNCI');
  await state.unlock('sandi-uji');

  const child = await state.addProfile({ name: 'Anak' });
  assert.equal(state.getState().profiles.length, 2);
  await state.upsert('visits', { profileId: child.id, date: '2026-11-02', complaint: 'batuk' });
  const childPhoto = await state.saveSourcePhoto({ profileId: child.id, kind: 'rekam-medis', mime: 'image/png', dataBase64: PHOTO_B64 });
  assert.equal(state.list('visits', { profileId: child.id }).length, 1);
  assert.equal((await state.listSourcePhotos({ profileId: child.id })).length, 1);

  assert.equal(await state.removeProfile(child.id), true);
  assert.equal(state.getState().profiles.length, 1);
  assert.equal(state.list('visits', { profileId: child.id }).length, 0);
  assert.equal((await state.listSourcePhotos({ profileId: child.id })).length, 0);
  const missing = await state.getSourcePhoto(childPhoto.id).catch((error) => error);
  assert.equal(missing.code, 'FOTO_TIDAK_ADA');

  assert.equal(state.getActiveProfile().id, rootId);
});

// ---------------------------------------------------------------------------
// server
// ---------------------------------------------------------------------------

test('server: createServer port 0, /health, /, app.js, manifest, 404, 405', async (t) => {
  const server = createServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  const base = `http://127.0.0.1:${port}`;
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const health = await fetch(`${base}/health`);
  assert.equal(health.status, 200);
  assert.match(health.headers.get('content-type'), /application\/json/);
  assert.equal(health.headers.get('cache-control'), 'no-store');
  assert.equal(health.headers.get('x-content-type-options'), 'nosniff');
  const healthBody = await health.json();
  assert.deepEqual(healthBody, { status: 'ok', app: 'rawatku', version: '1.1.0' });

  const home = await fetch(`${base}/`);
  assert.equal(home.status, 200);
  assert.match(home.headers.get('content-type'), /text\/html/);
  assert.match(await home.text(), /Rawatku/);

  const appJs = await fetch(`${base}/js/app.js`);
  assert.equal(appJs.status, 200);
  assert.match(appJs.headers.get('content-type'), /javascript/);

  const manifest = await fetch(`${base}/manifest.webmanifest`);
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get('content-type'), /manifest\+json/);
  assert.match(await manifest.text(), /"name"/);

  const missing = await fetch(`${base}/tidak-ada`);
  assert.equal(missing.status, 404);
  assert.match(await missing.text(), /404 Tidak ditemukan/);

  const method = await fetch(`${base}/health`, { method: 'POST' });
  assert.equal(method.status, 405);
  assert.equal(method.headers.get('allow'), 'GET, HEAD');

  const head = await fetch(`${base}/health`, { method: 'HEAD' });
  assert.equal(head.status, 200);
  assert.equal(head.headers.get('content-length'), String(Buffer.byteLength(JSON.stringify(healthBody))));

  for (const traversal of ['/../server.js', '/%2e%2e%2fserver.js', '/js/%2e%2e/%2e%2e/server.js']) {
    const response = await rawRequest(port, traversal);
    assert.equal(response.status, 404, `traversal root harus 404: ${traversal}`);
    assert.doesNotMatch(response.body, /createServer/);
  }
});

test('server: vendorDir khusus, manifest JSON, dummy .wasm application/wasm, traversal vendor', async (t) => {
  const vendorDir = await mkdtemp(path.join(os.tmpdir(), 'rawatku-vendor-'));
  await writeFile(path.join(vendorDir, 'manifest.json'), JSON.stringify({ entry: { module: '/vendor/x.js' } }));
  await writeFile(path.join(vendorDir, 'dummy.wasm'), Buffer.from([0x00, 0x61, 0x73, 0x6d]));

  const server = createServer({ vendorDir });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  t.after(async () => {
    await new Promise((resolve) => server.close(resolve));
    await rm(vendorDir, { recursive: true, force: true });
  });

  const manifest = await fetch(`http://127.0.0.1:${port}/vendor/manifest.json`);
  assert.equal(manifest.status, 200);
  assert.match(manifest.headers.get('content-type'), /application\/json/);
  assert.match(manifest.headers.get('cache-control'), /immutable/);
  assert.equal((await manifest.json()).entry.module, '/vendor/x.js');

  const wasm = await fetch(`http://127.0.0.1:${port}/vendor/dummy.wasm`);
  assert.equal(wasm.status, 200);
  assert.equal(wasm.headers.get('content-type'), 'application/wasm');
  assert.equal(Buffer.from(await wasm.arrayBuffer()).length, 4);

  for (const traversal of ['/vendor/../server.js', '/vendor/%2e%2e%2fserver.js', '/vendor/%2e%2e%2f%2e%2e%2fetc%2fpasswd']) {
    const response = await rawRequest(port, traversal);
    assert.equal(response.status, 404, `traversal vendor harus 404: ${traversal}`);
    assert.doesNotMatch(response.body, /createServer|root:/);
  }

  const missing = await fetch(`http://127.0.0.1:${port}/vendor/tidak-ada.wasm`);
  assert.equal(missing.status, 404);
});
