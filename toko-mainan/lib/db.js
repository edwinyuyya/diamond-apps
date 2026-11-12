// Penyimpanan pesanan ke Supabase (opsional).
// Kalau env SUPABASE belum diisi, pesanan tetap jalan: tersimpan di browser
// pembeli dan detailnya terkirim ke WhatsApp admin.
import { createClient } from '@supabase/supabase-js';

const url = process.env.SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
export const db = url && key ? createClient(url, key, { auth: { persistSession: false } }) : null;

const toRow = (o) => ({
  id: o.id, items: o.items, subtotal: o.subtotal, shipping: o.shipping, unique_code: o.uniqueCode,
  total: o.total, customer: o.customer, status: o.status, created_at: o.createdAt, deadline: o.deadline,
});
const fromRow = (r) => ({
  id: r.id, items: r.items, subtotal: r.subtotal, shipping: r.shipping, uniqueCode: r.unique_code,
  total: r.total, customer: r.customer, status: r.status, createdAt: r.created_at, deadline: r.deadline,
});

export async function insertOrder(o) {
  if (!db) return false;
  const { error } = await db.from('orders').insert(toRow(o));
  if (error) throw error;
  return true;
}

export async function findOrder(id) {
  if (!db) return null;
  const { data, error } = await db.from('orders').select('*').eq('id', id).maybeSingle();
  if (error) throw error;
  return data ? fromRow(data) : null;
}
