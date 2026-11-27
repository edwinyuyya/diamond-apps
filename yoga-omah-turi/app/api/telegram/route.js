import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { answerCommand, sendTelegram, webhookSecret, hasToken } from '@/lib/telegram';

export const dynamic = 'force-dynamic';
const ok = () => NextResponse.json({ ok: true });

// Webhook Telegram. Hanya menerima panggilan dari Telegram (secret token cocok).
export async function POST(req) {
  if (!hasToken() || req.headers.get('x-telegram-bot-api-secret-token') !== webhookSecret()) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  const update = await req.json().catch(() => ({}));
  const msg = update.message;
  if (!msg?.text) return ok();
  const chatId = String(msg.chat.id);
  const allowed = process.env.TELEGRAM_CHAT_ID;

  // Chat belum terdaftar: balas ID chat-nya (supaya mudah diisi ke TELEGRAM_CHAT_ID), tanpa membuka data apa pun
  if (!allowed || chatId !== String(allowed)) {
    await sendTelegram(`Chat ID chat ini: <b>${chatId}</b>\n\nMasukkan angka itu sebagai <code>TELEGRAM_CHAT_ID</code> di pengaturan Vercel, lalu Redeploy.`, chatId);
    return ok();
  }
  if (!msg.text.startsWith('/')) return ok();
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_SERVICE_ROLE_KEY) return ok();
  await sendTelegram(await answerCommand(msg.text, db()), chatId);
  return ok();
}
