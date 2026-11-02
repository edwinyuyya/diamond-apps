// Penyimpanan data & foto: Netlify Blobs saat online, folder .data/blobs saat uji coba lokal.
import 'server-only';
import { promises as fs } from 'fs';
import path from 'path';

const LOCAL = path.join(process.cwd(), '.data', 'blobs');

// Di Netlify (fungsi server) Blobs tersedia; saat build atau lokal tidak, maka pakai folder lokal.
async function netlifyStore(name) {
  if (!process.env.NETLIFY_BLOBS_CONTEXT && !process.env.NETLIFY) return null;
  const { getStore } = await import('@netlify/blobs');
  try {
    return getStore({ name, consistency: 'strong' });
  } catch (e) {
    if (e?.name === 'MissingBlobsEnvironmentError') return null;
    throw e;
  }
}

function localPath(name, key) {
  return path.join(LOCAL, name, key.replace(/\.\.+/g, '_'));
}

export async function getJSON(name, key) {
  const s = await netlifyStore(name);
  if (s) return s.get(key, { type: 'json' });
  try { return JSON.parse(await fs.readFile(localPath(name, key), 'utf8')); } catch { return null; }
}

export async function setJSON(name, key, value) {
  const s = await netlifyStore(name);
  if (s) return s.setJSON(key, value);
  const p = localPath(name, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, JSON.stringify(value, null, 2));
}

export async function getBinary(name, key) {
  const s = await netlifyStore(name);
  if (s) {
    const ab = await s.get(key, { type: 'arrayBuffer' });
    return ab ? Buffer.from(ab) : null;
  }
  try { return await fs.readFile(localPath(name, key)); } catch { return null; }
}

export async function setBinary(name, key, buf) {
  const s = await netlifyStore(name);
  if (s) return s.set(key, buf);
  const p = localPath(name, key);
  await fs.mkdir(path.dirname(p), { recursive: true });
  await fs.writeFile(p, buf);
}

export async function remove(name, key) {
  const s = await netlifyStore(name);
  if (s) return s.delete(key);
  await fs.rm(localPath(name, key), { force: true });
}
