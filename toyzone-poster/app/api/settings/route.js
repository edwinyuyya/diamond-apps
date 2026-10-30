import { NextResponse } from 'next/server';
import { connect, getAccount } from '../../../lib/instagram';
import { setSetting } from '../../../lib/db';
import { usingLocalDb } from '../../../lib/db';
import { BRAND, CLAUDE_MODEL, SCHEDULE } from '../../../lib/config';

export const dynamic = 'force-dynamic';

// Info status (token TIDAK pernah dikirim ke browser)
export async function GET() {
  const acc = await getAccount();
  return NextResponse.json({
    instagram: acc?.token ? { username: acc.username, igUserId: acc.igUserId, expiresAt: acc.expiresAt, connectedAt: acc.connectedAt } : null,
    ai: process.env.ANTHROPIC_API_KEY ? CLAUDE_MODEL : null,
    database: usingLocalDb ? 'lokal (uji coba)' : 'Supabase',
    storeUrl: BRAND.storeUrl,
    schedule: SCHEDULE,
    cron: !!process.env.CRON_SECRET,
  });
}

export async function POST(req) {
  const { token } = await req.json().catch(() => ({}));
  if (!token || token.length < 20) return NextResponse.json({ error: 'Token tidak valid' }, { status: 400 });
  try {
    const acc = await connect(token);
    return NextResponse.json({ ok: true, username: acc.username });
  } catch (e) {
    return NextResponse.json({ error: `Token ditolak Instagram: ${e.message}` }, { status: 400 });
  }
}

export async function DELETE() {
  await setSetting('instagram', null);
  return NextResponse.json({ ok: true });
}
