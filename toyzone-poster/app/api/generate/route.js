import { NextResponse } from 'next/server';
import { createWeeklyDrafts } from '../../../lib/planner';
import { nextWeekStart } from '../../../lib/time';

export const maxDuration = 60;

// Buat pengajuan minggu depan secara manual dari dashboard
export async function POST(req) {
  const { force } = await req.json().catch(() => ({}));
  try {
    const r = await createWeeklyDrafts({ weekStart: nextWeekStart(), force: !!force });
    return NextResponse.json({ created: r.created.length, skipped: r.skipped, weekStart: r.weekStart });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
