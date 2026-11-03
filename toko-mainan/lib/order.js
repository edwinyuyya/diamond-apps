import { finalPrice, formatRp } from './products';
import { SHIPPING, PAYMENT_DEADLINE_HOURS, STORE, BANKS } from './config';
import { t } from './i18n';

// Hitung ulang total dari data produk (harga dari klien tidak dipercaya)
export function priceItems(items, PRODUCTS) {
  const lines = [];
  for (const it of items || []) {
    const p = PRODUCTS.find((x) => x.id === it.id);
    const qty = Math.max(1, Math.min(99, parseInt(it.qty, 10) || 1));
    if (!p || p.stock <= 0 || p.price == null) continue;
    lines.push({ id: p.id, slug: p.slug, name: p.name, price: finalPrice(p), qty: Math.min(qty, p.stock) });
  }
  const subtotal = lines.reduce((s, l) => s + l.price * l.qty, 0);
  const shipping = subtotal === 0 || subtotal >= SHIPPING.freeAbove ? 0 : SHIPPING.flat;
  return { lines, subtotal, shipping };
}

function makeOrderId(now) {
  const d = now.toISOString().slice(2, 10).replace(/-/g, '');
  const r = (Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2)).slice(0, 6).toUpperCase();
  return `TZ${d}${r}`;
}

export function buildOrder(items, customer, products) {
  const { lines, subtotal, shipping } = priceItems(items, products);
  if (!lines.length) throw new Error('Keranjang kosong');
  const now = new Date();
  // Kode unik 3 digit (1–999) supaya transfer mudah dicocokkan
  const uniqueCode = Math.floor(Math.random() * 999) + 1;
  return {
    id: makeOrderId(now),
    items: lines,
    subtotal,
    shipping,
    uniqueCode,
    total: subtotal + shipping + uniqueCode,
    customer: {
      name: String(customer.name || '').trim().slice(0, 100),
      phone: String(customer.phone || '').trim().slice(0, 20),
      email: String(customer.email || '').trim().slice(0, 100),
      address: String(customer.address || '').trim().slice(0, 500),
      city: String(customer.city || '').trim().slice(0, 100),
      province: String(customer.province || '').trim().slice(0, 100),
      postal: String(customer.postal || '').trim().slice(0, 10),
      note: String(customer.note || '').trim().slice(0, 300),
    },
    status: 'menunggu_pembayaran',
    createdAt: now.toISOString(),
    deadline: new Date(now.getTime() + PAYMENT_DEADLINE_HOURS * 3600 * 1000).toISOString(),
  };
}

export function validateCustomer(c, lang = 'id') {
  const e = {};
  const m = (k) => t(lang, `err.${k}`);
  if (!c.name?.trim()) e.name = m('name');
  const phone = (c.phone || '').replace(/[^0-9]/g, '');
  if (phone.length < 9 || phone.length > 15) e.phone = m('phone');
  if (!c.address?.trim() || c.address.trim().length < 10) e.address = m('address');
  if (!c.city?.trim()) e.city = m('city');
  if (!c.province?.trim()) e.province = m('province');
  if (!/^\d{5}$/.test((c.postal || '').trim())) e.postal = m('postal');
  return e;
}

// Pesan WhatsApp yang otomatis terisi untuk konfirmasi pembayaran (bahasa mengikuti pilihan pembeli)
export function waConfirmUrl(order, lang = 'id') {
  const c = order.customer;
  const lines = order.items.map((l) => `• ${l.name} x${l.qty} = ${formatRp(l.price * l.qty)}`).join('\n');
  const text = t(lang, 'wa.confirm', {
    store: STORE.name, id: order.id, total: formatRp(order.total), lines,
    subtotal: formatRp(order.subtotal), shipping: order.shipping ? formatRp(order.shipping) : t(lang, 'common.free'),
    code: order.uniqueCode, name: c.name, phone: c.phone,
    address: `${c.address}, ${c.city}, ${c.province} ${c.postal}`,
    note: c.note ? t(lang, 'wa.noteLine', { note: c.note }) : '',
  });
  return `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(text)}`;
}

export const waChatUrl = (msg = `Halo ${STORE.name}, saya mau tanya produk`) =>
  `https://wa.me/${STORE.whatsapp}?text=${encodeURIComponent(msg)}`;

export { BANKS };
