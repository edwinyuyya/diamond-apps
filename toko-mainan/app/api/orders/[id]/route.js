import { NextResponse } from 'next/server';
import { findOrder } from '../../../../lib/db';

export async function GET(_req, { params }) {
  try {
    const order = await findOrder(params.id);
    if (!order) return NextResponse.json({ error: 'Pesanan tidak ditemukan' }, { status: 404 });
    return NextResponse.json({ order });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
