import { NextResponse } from 'next/server';
import { isCron } from '../../../../lib/session';
import { createWeeklyDrafts } from '../../../../lib/planner';
import { refreshIfNeeded } from '../../../../lib/instagram';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Tiap Minggu 08.00 WIB: siapkan 5 draf untuk minggu depan + perpanjang token IG
export async function GET(req) {
  if (!isCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const token = await refreshIfNeeded().catch((e) => ({ error: e.message }));
  try {
    const r = await createWeeklyDrafts();
    return NextResponse.json({ created: r.created.length, skipped: r.skipped, weekStart: r.weekStart, token });
  } catch (e) {
    return NextResponse.json({ error: e.message, token }, { status: 500 });
  }
}
