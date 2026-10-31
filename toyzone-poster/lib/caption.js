import Anthropic from '@anthropic-ai/sdk';
import { BRAND, CAPTION_STYLES, CLAUDE_MODEL, THEMES } from './config';
import { rupiah } from './products';

const SYSTEM = `Kamu copywriter Instagram untuk ${BRAND.name} (${BRAND.instagram}), toko online action figure, brick set, anime figure, die-cast dan mainan koleksi di Indonesia.

Tulis satu caption feed Instagram dalam Bahasa Indonesia yang natural:
- Kalimat pertama berupa hook yang bikin berhenti scroll.
- 2–4 kalimat isi: keunggulan produk dari data yang diberikan saja, jangan mengarang fitur, ukuran atau harga.
- Sebutkan harga persis seperti data. Kalau ada harga coret, tonjolkan hematnya.
- Ajakan order: klik link di bio atau chat WhatsApp ${BRAND.whatsapp}.
- 2–4 emoji yang relevan, jangan berlebihan.
- Tutup dengan 10–15 hashtag relevan (campuran populer dan spesifik produk), termasuk #toyzone888.
- Maksimal 1.500 karakter.
Tulis caption-nya saja, tanpa pembuka, judul atau tanda kutip.`;

function productBrief(p, theme) {
  const lines = [
    `Produk: ${p.name}`,
    `Kategori: ${p.categoryName}`,
    p.price == null ? 'Harga: belum dicantumkan — JANGAN sebut angka harga, ajak tanya harga via DM/WhatsApp'
      : p.salePrice ? `Harga: ${rupiah(p.salePrice)} (harga normal ${rupiah(p.price)})` : `Harga: ${rupiah(p.price)}`,
    `Rekomendasi umur: ${p.age}+ tahun`,
    p.stock > 0 && p.stock <= 5 ? `Stok tinggal ${p.stock}` : null,
    `Deskripsi: ${p.description}`,
    p.specs && Object.keys(p.specs).length ? `Spesifikasi: ${Object.entries(p.specs).map(([k, v]) => `${k} ${v}`).join(', ')}` : null,
    `Tema postingan: ${THEMES[theme]?.label || theme}`,
  ];
  return lines.filter(Boolean).join('\n');
}

// Cadangan kalau API key belum diisi / API gagal: caption dari template
function templateCaption(p, theme) {
  const hook = {
    baru: `✨ BARU MENDARAT di ${BRAND.name}!`,
    promo: `🔥 PROMO! ${p.name} sekarang lebih hemat!`,
    terlaris: `🏆 Paling banyak dicari minggu ini!`,
    koleksi: `👑 Untuk kolektor sejati.`,
    terbatas: `⏳ Stok tinggal sedikit, siapa cepat dia dapat!`,
  }[theme] || `Kenalan sama ${p.name}!`;
  const price = p.price == null ? 'Tanya harga & stok langsung via DM/WhatsApp ya 💬'
    : p.salePrice ? `Dari ${rupiah(p.price)} jadi ${rupiah(p.salePrice)} 🏷️` : `Harga: ${rupiah(p.price)}`;
  return `${hook}

${p.name}
${p.description}

${price}
Cocok untuk umur ${p.age}+.

Order sekarang lewat link di bio atau chat WhatsApp ${BRAND.whatsapp} 📦

#toyzone888 #toyzone #mainan #actionfigure #toys #toycollector #mainananak #koleksimainan #tokomainan #hobbytoys #${p.categoryName.toLowerCase().replace(/[^a-z0-9]/g, '')} #mainanoriginal`;
}

// Sumber caption: "freellm" (FreeLLMAPI, gratis), "claude" (Anthropic API) atau "template".
// Otomatis: FREELLM_BASE_URL diisi → freellm; ANTHROPIC_API_KEY diisi → claude; selain itu template.
export function captionProvider() {
  const p = process.env.CAPTION_PROVIDER;
  if (p) return p;
  if (process.env.FREELLM_BASE_URL) return 'freellm';
  if (process.env.ANTHROPIC_API_KEY) return 'claude';
  return 'template';
}

async function claudeCaption(prompt) {
  const client = new Anthropic();
  const res = await client.beta.messages.create({
    model: CLAUDE_MODEL,
    max_tokens: 16000,
    output_config: { effort: 'low' },
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
    system: SYSTEM,
    messages: [{ role: 'user', content: prompt }],
  });
  if (res.stop_reason === 'refusal') throw new Error('Model menolak permintaan');
  return res.content.filter((b) => b.type === 'text').map((b) => b.text).join('');
}

// FreeLLMAPI (self-hosted, endpoint kompatibel OpenAI /v1/chat/completions)
async function freellmCaption(prompt) {
  const base = process.env.FREELLM_BASE_URL.replace(/\/$/, '');
  const res = await fetch(`${base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.FREELLM_API_KEY || ''}` },
    body: JSON.stringify({
      model: process.env.FREELLM_MODEL || 'auto',
      max_tokens: 1500,
      messages: [{ role: 'system', content: SYSTEM }, { role: 'user', content: prompt }],
    }),
    signal: AbortSignal.timeout(45000),
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `FreeLLMAPI error ${res.status}`);
  return data.choices?.[0]?.message?.content || '';
}

// Beberapa model gratis menulis "proses berpikir" atau pembuka; dibuang
const clean = (t) => t
  .replace(/<think>[\s\S]*?<\/think>/gi, '')
  .replace(/^\s*(berikut|ini) (adalah )?caption[^\n]*:\s*/i, '')
  .replace(/^["“]|["”]$/g, '')
  .trim();

export async function generateCaption(product, theme, style = 'jualan') {
  const provider = captionProvider();
  if (provider === 'template') return { caption: templateCaption(product, theme), source: 'template' };
  const prompt = `${productBrief(product, theme)}\n\nGaya bahasa: ${CAPTION_STYLES[style] || CAPTION_STYLES.jualan}`;
  try {
    const text = clean(provider === 'freellm' ? await freellmCaption(prompt) : await claudeCaption(prompt));
    if (text.length < 40) throw new Error('Caption kosong/terlalu pendek');
    return { caption: text.slice(0, 2200), source: 'ai' };
  } catch (e) {
    console.error(`Caption ${provider} gagal, pakai template:`, e?.status || '', e?.message);
    return { caption: templateCaption(product, theme), source: 'template', error: e?.message };
  }
}
