// Penyimpanan data & foto: Netlify Blobs saat online, folder .data/blobs saat uji coba lokal.
import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';

const LOCAL = path.join(process.cwd(), '.data', 'blobs');
const onNetlify = () => !!(process.env.NETLIFY_BLOBS_CONTEXT || process.env.NETLIFY || process.env.NETLIFY_DEV || globalThis.netlifyBlobsContext);

let storeCache = {};
async function netlifyStore(name) {
  if (!onNetlify()) return null;
  if (storeCache[name]) return storeCache[name];
  const { getStore } = await import('@netlify/blobs');
  try {
    // Pakai fetch asli: fetch versi Next.js mencoba memakai cache Next, yang di Netlify juga
    // tersimpan di Blobs, sehingga permintaan Blobs menunggu dirinya sendiri (macet).
    const rawFetch = globalThis.fetch._nextOriginalFetch || globalThis.fetch;
    return (storeCache[name] = getStore({ name, fetch: (...a) => rawFetch(...a) }));
  } catch (e) {
    console.error('[blobs] getStore gagal:', e?.name, e?.message);
    return null;
  }
}

// Batas waktu supaya halaman tidak menggantung kalau Blobs lambat
function withTimeout(promise, ms, label) {
  return Promise.race([promise, new Promise((_, rej) => setTimeout(() => rej(new Error(`${label} timeout ${ms}ms`)), ms))]);
}

function localPath(name, key) {
  return path.join(LOCAL, name, key.replace(/\.\.+/g, '_'));
}

export async function getJSON(name, key) {
  const s = await netlifyStore(name);
  if (s) {
    try { return await withTimeout(s.get(key, { type: 'json' }), 5000, `get ${name}/${key}`); }
    catch (e) { console.error('[blobs]', e?.message); return undefined; } // undefined = gagal baca (beda dengan null = belum ada)
  }
  try { return JSON.parse(await fs.readFile(localPath(name, key), 'utf8')); } catch { return null; }
}

export async function setJSON(name, key, value) {
  const s = await netlifyStore(name);
  if (s) return withTimeout(s.setJSON(key, value), 10000, `set ${name}/${key}`);
  const p = localPath(name, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(value, null, 2));
}

export async function getBinary(name, key) {
  const s = await netlifyStore(name);
  if (s) {
    try {
      const ab = await withTimeout(s.get(key, { type: 'arrayBuffer' }), 8000, `get ${name}/${key}`);
      return ab ? Buffer.from(ab) : null;
    } catch (e) { console.error('[blobs]', e?.message); return null; }
  }
  try { return await fs.readFile(localPath(name, key)); } catch { return null; }
}

export async function setBinary(name, key, buf) {
  const s = await netlifyStore(name);
  if (s) return withTimeout(s.set(key, buf), 15000, `set ${name}/${key}`);
  const p = localPath(name, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, buf);
}

export async function remove(name, key) {
  const s = await netlifyStore(name);
  if (s) return withTimeout(s.delete(key), 8000, `delete ${name}/${key}`);
  await fs.rm(localPath(name, key), { force: true });
}
