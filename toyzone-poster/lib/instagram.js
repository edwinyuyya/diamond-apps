// Instagram API (Instagram Login) — posting foto ke akun Business/Creator
import { getSetting, setSetting } from './db';

const API = 'https://graph.instagram.com/v21.0';

async function call(path, { method = 'GET', params = {}, token }) {
  const qs = new URLSearchParams({ ...params, access_token: token });
  const res = await fetch(method === 'GET' ? `${API}${path}?${qs}` : `${API}${path}`, {
    method,
    headers: method === 'GET' ? undefined : { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: method === 'GET' ? undefined : qs,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.error) throw new Error(data.error?.message || `Instagram API error ${res.status}`);
  return data;
}

// Cek token & ambil ID + username akun
export async function verifyToken(token) {
  const me = await call('/me', { params: { fields: 'user_id,username' }, token });
  return { igUserId: me.user_id || me.id, username: me.username };
}

export async function getAccount() {
  return getSetting('instagram'); // { token, igUserId, username, expiresAt, connectedAt }
}

export async function connect(token) {
  const info = await verifyToken(token.trim());
  const acc = {
    token: token.trim(), ...info,
    connectedAt: new Date().toISOString(),
    // token jangka panjang berlaku 60 hari sejak dibuat
    expiresAt: new Date(Date.now() + 60 * 24 * 3600 * 1000).toISOString(),
  };
  await setSetting('instagram', acc);
  return acc;
}

// Perpanjang token kalau sisa < 20 hari (token minimal berumur 24 jam)
export async function refreshIfNeeded() {
  const acc = await getAccount();
  if (!acc?.token) return { refreshed: false, reason: 'belum terhubung' };
  const left = new Date(acc.expiresAt).getTime() - Date.now();
  if (left > 20 * 24 * 3600 * 1000) return { refreshed: false, reason: 'masih lama' };
  const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(acc.token)}`, { cache: 'no-store' });
  const data = await res.json().catch(() => ({}));
  if (!data.access_token) return { refreshed: false, reason: data.error?.message || 'gagal' };
  await setSetting('instagram', { ...acc, token: data.access_token, expiresAt: new Date(Date.now() + data.expires_in * 1000).toISOString() });
  return { refreshed: true };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Posting 1 foto. imageUrl harus bisa diakses publik dan berformat JPEG.
export async function publishPhoto(imageUrl, caption) {
  const acc = await getAccount();
  if (!acc?.token) throw new Error('Akun Instagram belum dihubungkan (menu Pengaturan)');
  const { token, igUserId } = acc;
  const container = await call(`/${igUserId}/media`, { method: 'POST', params: { image_url: imageUrl, caption }, token });
  // tunggu Instagram selesai memproses gambar
  for (let i = 0; i < 10; i++) {
    const st = await call(`/${container.id}`, { params: { fields: 'status_code' }, token });
    if (st.status_code === 'FINISHED') break;
    if (st.status_code === 'ERROR' || st.status_code === 'EXPIRED') throw new Error(`Instagram gagal memproses gambar (${st.status_code})`);
    await sleep(2000);
  }
  const pub = await call(`/${igUserId}/media_publish`, { method: 'POST', params: { creation_id: container.id }, token });
  let permalink = null;
  try { permalink = (await call(`/${pub.id}`, { params: { fields: 'permalink' }, token })).permalink; } catch {}
  return { mediaId: pub.id, permalink };
}
