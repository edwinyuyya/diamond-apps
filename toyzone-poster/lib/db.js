// Penyimpanan data: Supabase (produksi) atau file JSON lokal (.data/db.json) untuk uji coba.
import { createClient } from '@supabase/supabase-js';
import { promises as fs } from 'fs';
import path from 'path';

const sb = process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY
  ? createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } })
  : null;

export const usingLocalDb = !sb;

// ── driver file lokal ──
const FILE = path.join(process.cwd(), '.data', 'db.json');
async function load() {
  try { return JSON.parse(await fs.readFile(FILE, 'utf8')); } catch { return { posts: [], settings: {} }; }
}
async function save(d) {
  await fs.mkdir(path.dirname(FILE), { recursive: true });
  await fs.writeFile(FILE, JSON.stringify(d, null, 2));
}
const sortPosts = (a, b) => a.schedule_at.localeCompare(b.schedule_at);

// ── posts ──
export async function listPosts({ statuses, weekStart } = {}) {
  if (sb) {
    let q = sb.from('posts').select('*').order('schedule_at', { ascending: true });
    if (statuses) q = q.in('status', statuses);
    if (weekStart) q = q.eq('week_start', weekStart);
    const { data, error } = await q.limit(500);
    if (error) throw error;
    return data;
  }
  const d = await load();
  return d.posts.filter((p) => (!statuses || statuses.includes(p.status)) && (!weekStart || p.week_start === weekStart)).sort(sortPosts);
}

export async function getPost(id) {
  if (sb) {
    const { data, error } = await sb.from('posts').select('*').eq('id', id).maybeSingle();
    if (error) throw error;
    return data;
  }
  return (await load()).posts.find((p) => p.id === id) || null;
}

export async function insertPosts(rows) {
  const now = new Date().toISOString();
  const full = rows.map((r) => ({ id: crypto.randomUUID(), created_at: now, updated_at: now, ...r }));
  if (sb) {
    const { error } = await sb.from('posts').insert(full);
    if (error) throw error;
    return full;
  }
  const d = await load();
  d.posts.push(...full);
  await save(d);
  return full;
}

// `onlyIfStatus`: update hanya kalau status masih sesuai (mencegah posting dobel)
export async function updatePost(id, patch, onlyIfStatus) {
  const row = { ...patch, updated_at: new Date().toISOString() };
  if (sb) {
    let q = sb.from('posts').update(row).eq('id', id);
    if (onlyIfStatus) q = q.in('status', [].concat(onlyIfStatus));
    const { data, error } = await q.select();
    if (error) throw error;
    return data?.[0] || null;
  }
  const d = await load();
  const p = d.posts.find((x) => x.id === id);
  if (!p || (onlyIfStatus && ![].concat(onlyIfStatus).includes(p.status))) return null;
  Object.assign(p, row);
  await save(d);
  return p;
}

// ── settings (key → value JSON) ──
export async function getSetting(key) {
  if (sb) {
    const { data, error } = await sb.from('settings').select('value').eq('key', key).maybeSingle();
    if (error) throw error;
    return data?.value ?? null;
  }
  return (await load()).settings[key] ?? null;
}

export async function setSetting(key, value) {
  if (sb) {
    const { error } = await sb.from('settings').upsert({ key, value, updated_at: new Date().toISOString() });
    if (error) throw error;
    return;
  }
  const d = await load();
  d.settings[key] = value;
  await save(d);
}
