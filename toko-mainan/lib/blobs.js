// Penyimpanan data & foto Toyzone.
// - Online (Netlify): lewat fungsi netlify/functions/data.mjs, yang memakai Netlify Blobs.
//   (Memanggil Blobs langsung dari Next.js macet di runtime Netlify, jadi tidak dipakai.)
//   Butuh env SITE_URL (alamat situs) dan SESSION_SECRET.
// - Uji coba lokal: folder .data/blobs.
import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';

const LOCAL = path.join(process.cwd(), '.data', 'blobs');
const SITE = (process.env.SITE_URL || process.env.URL || '').replace(/\/$/, '');
const onNetlify = () => !!SITE; // SITE_URL hanya diisi di Netlify

// URL publik untuk foto hasil unggahan
export const mediaUrl = (key) => (onNetlify() ? `/.netlify/functions/data?media=${encodeURIComponent(key)}` : `/img/${key}`);

async function call(method, kind, name, key, body, ms = 8000) {
  const rawFetch = globalThis.fetch._nextOriginalFetch || globalThis.fetch;
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), ms);
  try {
    const qs = new URLSearchParams({ kind, store: name, key });
    const res = await rawFetch(`${SITE}/.netlify/functions/data?${qs}`, {
      method, body, cache: 'no-store', signal: ctrl.signal,
      headers: { 'x-data-secret': process.env.SESSION_SECRET || '', ...(kind === 'json' && body ? { 'Content-Type': 'application/json' } : {}) },
    });
    if (!res.ok) throw new Error(`data ${method} ${name}/${key} → ${res.status}`);
    return res.json();
  } finally {
    clearTimeout(timer);
  }
}

function localPath(name, key) {
  return path.join(LOCAL, name, key.replace(/\.\.+/g, '_'));
}

// null = belum ada; undefined = gagal dibaca
export async function getJSON(name, key) {
  if (onNetlify()) {
    try { return (await call('GET', 'json', name, key)).data; }
    catch (e) { console.error('[blobs]', e?.message); return undefined; }
  }
  try { return JSON.parse(await fs.readFile(localPath(name, key), 'utf8')); } catch { return null; }
}

export async function setJSON(name, key, value) {
  if (onNetlify()) return call('PUT', 'json', name, key, JSON.stringify(value), 10000);
  const p = localPath(name, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(value, null, 2));
}

// Hanya untuk uji coba lokal (online, foto disajikan langsung oleh fungsi data)
export async function getBinary(name, key) {
  try { return await fs.readFile(localPath(name, key)); } catch { return null; }
}

export async function setBinary(name, key, buf) {
  if (onNetlify()) return call('PUT', 'bin', name, key, buf, 15000);
  const p = localPath(name, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, buf);
}

export async function remove(name, key) {
  if (onNetlify()) return call('DELETE', 'bin', name, key);
  await fs.rm(localPath(name, key), { force: true });
}
