import { NextResponse } from 'next/server';
import { listPosts } from '../../../lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req) {
  const sp = new URL(req.url).searchParams;
  const statuses = sp.get('status')?.split(',').filter(Boolean);
  try {
    return NextResponse.json({ posts: await listPosts({ statuses, weekStart: sp.get('week') || undefined }) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
