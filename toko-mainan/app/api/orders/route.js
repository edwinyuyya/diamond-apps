import { NextResponse } from 'next/server';
import { buildOrder, validateCustomer } from '../../../lib/order';
import { insertOrder } from '../../../lib/db';

export async function POST(req) {
  try {
    const { items, customer } = await req.json();
    const errors = validateCustomer(customer || {});
    if (Object.keys(errors).length) return NextResponse.json({ errors }, { status: 400 });
    const order = buildOrder(items, customer);
    let saved = false;
    try { saved = await insertOrder(order); } catch (e) { console.error('Gagal simpan pesanan:', e.message); }
    return NextResponse.json({ order, saved });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 400 });
  }
}
