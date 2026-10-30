import { NextResponse } from 'next/server';
import { isCron } from '../../../../lib/session';
import { publishDue } from '../../../../lib/publisher';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

// Posting semua draf yang SUDAH DISETUJUI owner dan sudah waktunya
export async function GET(req) {
  if (!isCron(req)) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const results = await publishDue(new URL(req.url).origin);
  return NextResponse.json({ checkedAt: new Date().toISOString(), results });
}
