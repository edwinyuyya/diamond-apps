// Logika bersama untuk dashboard posting Instagram Diamond:
// penyimpanan (Netlify Blobs), autentikasi admin, caption AI (Claude), dan Instagram API.
import { getStore } from "@netlify/blobs";
import Anthropic from "@anthropic-ai/sdk";
import { timingSafeEqual, randomUUID } from "node:crypto";

export const SITE = "https://muasolo.com";
const IG_API = process.env.IG_API_BASE || "https://graph.instagram.com";

// Slot posting otomatis: Senin, Rabu, Jumat pukul 19.00 WIB (= 12.00 UTC)
const SLOT_DAYS = [1, 3, 5];
const SLOT_HOUR_UTC = 12;

export const store = () => getStore({ name: "ig-diamond", consistency: "strong" });

export const json = (data, status = 200) =>
    new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });

export function isAdmin(req) {
    const want = process.env.ADMIN_KEY || "";
    const got = req.headers.get("x-admin-key") || "";
    if (!want || got.length !== want.length) return false;
    return timingSafeEqual(Buffer.from(got), Buffer.from(want));
}

// ---------- Posts ----------
export async function listPosts() {
    const s = store();
    const { blobs } = await s.list({ prefix: "post/" });
    const posts = await Promise.all(blobs.map(b => s.get(b.key, { type: "json" })));
    return posts.filter(Boolean).sort((a, b) => (b.created_at || "").localeCompare(a.created_at || ""));
}
export const getPost = id => store().get(`post/${id}`, { type: "json" });
export const savePost = post => store().setJSON(`post/${post.id}`, { ...post, updated_at: new Date().toISOString() });

export async function createPost({ imageBase64, kind, note, caption }) {
    const id = randomUUID().replace(/-/g, "").slice(0, 16);
    const bytes = Buffer.from(imageBase64, "base64");
    if (bytes.length < 1000 || bytes.length > 8_000_000) throw new Error("Ukuran foto tidak valid");
    await store().set(`img/${id}`, bytes, { metadata: { type: "image/jpeg" } });
    const post = {
        id, kind: kind === "promo" ? "promo" : "photo", note: note || "",
        image_url: `${SITE}/m/${id}.jpg`, caption: caption || "",
        status: "review", scheduled_at: null, ig_media_id: null, error: null,
        created_at: new Date().toISOString(),
    };
    if (!post.caption) post.caption = await writeCaption({ imageBase64, kind: post.kind, note: post.note });
    await savePost(post);
    return post;
}

export async function deletePost(id) {
    const s = store();
    await s.delete(`post/${id}`);
    await s.delete(`img/${id}`);
}

// Slot berikutnya yang belum terisi post terjadwal
export async function nextFreeSlot(posts) {
    const taken = new Set(posts.filter(p => p.status === "scheduled" && p.scheduled_at).map(p => p.scheduled_at));
    const d = new Date();
    d.setUTCMinutes(0, 0, 0);
    for (let i = 0; i < 24 * 120; i++) {
        d.setUTCHours(d.getUTCHours() + 1);
        if (d.getUTCHours() !== SLOT_HOUR_UTC || !SLOT_DAYS.includes(d.getUTCDay())) continue;
        if (d.getTime() - Date.now() < 30 * 60 * 1000) continue;
        const iso = d.toISOString();
        if (!taken.has(iso)) return iso;
    }
    throw new Error("Tidak ada slot kosong dalam 4 bulan ke depan");
}

// ---------- Caption AI ----------
const BRAND = `Kamu adalah social media copywriter untuk Diamond Make Up Artist (@diamond.makeupartist), MUA di Solo (Surakarta) yang dipimpin Ing2 bersama tim (Ellyana, Monic, Davina, Risna, dan Clara untuk hair & hijab do).
Layanan: makeup pengantin, lamaran, prewedding, wisuda & party, sweet seventeen, maternity, mature makeup, photoshoot, kids makeup, hairdo & hijab do, serta makeup course privat.
Gaya brand: elegan, hangat, premium tapi tidak kaku. Bahasa Indonesia santai-sopan, sapa pembaca dengan "kak".
Aturan caption:
- Kalimat pertama adalah hook yang membuat orang berhenti scroll.
- 2-4 kalimat isi yang relevan dengan foto atau topik. Jangan mengarang nama klien, harga, atau promo yang tidak disebutkan.
- Ajakan reservasi: WhatsApp 0895 1261 4222 atau muasolo.com.
- Maksimal 3 emoji yang relevan.
- Tutup dengan 12-18 hashtag, wajib berisi #muasolo #muasurakarta #makeupartistsolo #diamondmakeupartist, sisanya sesuai foto.
- Tulis caption saja, tanpa pengantar atau penjelasan.`;

let _client;
const claude = () => (_client ||= new Anthropic());

async function ask({ content, maxTokens = 2000 }) {
    const res = await claude().beta.messages.create({
        model: "claude-opus-5-5",
        max_tokens: maxTokens,
        betas: ["server-side-fallback-2026-07-01"],
        fallbacks: "default",
        output_config: { effort: "low" },
        system: BRAND,
        messages: [{ role: "user", content }],
    });
    if (res.stop_reason === "refusal") throw new Error("AI menolak membuat caption untuk konten ini");
    const text = res.content.filter(b => b.type === "text").map(b => b.text).join("").trim();
    if (!text) throw new Error("Caption AI kosong");
    return text;
}

export async function writeCaption({ imageBase64, kind, note }) {
    const content = [];
    if (imageBase64) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: imageBase64 } });
    content.push({
        type: "text",
        text: kind === "promo"
            ? `Buat caption Instagram untuk postingan promo/info Diamond. Topik: ${note || "(lihat gambar)"}`
            : `Buat caption Instagram untuk foto hasil makeup di atas.${note ? ` Keterangan dari tim: ${note}` : ""}`,
    });
    return ask({ content });
}

export async function writePromoText(topic) {
    const text = await ask({
        maxTokens: 3000,
        content: [{
            type: "text",
            text: `Buat materi postingan promo/info Instagram Diamond dengan topik: "${topic}".
Balas HANYA dalam format JSON tanpa teks lain: {"headline": "...", "subline": "...", "caption": "..."}
- headline: maksimal 5 kata, untuk ditulis besar di gambar
- subline: maksimal 12 kata, penjelas singkat di gambar
- caption: caption Instagram lengkap sesuai aturan`,
        }],
    });
    const m = text.match(/\{[\s\S]*\}/);
    if (!m) throw new Error("Format teks promo dari AI tidak terbaca");
    return JSON.parse(m[0]);
}

// ---------- Instagram ----------
async function getToken() {
    const saved = await store().get("token", { type: "json" });
    if (saved?.token) return saved;
    if (!process.env.IG_ACCESS_TOKEN) return null;
    return { token: process.env.IG_ACCESS_TOKEN, refreshed_at: null };
}

// Token Instagram berlaku 60 hari; diperpanjang otomatis setiap 20 hari
export async function refreshTokenIfDue() {
    const t = await getToken();
    if (!t) return { refreshed: false, reason: "IG_ACCESS_TOKEN belum diisi" };
    const age = t.refreshed_at ? Date.now() - Date.parse(t.refreshed_at) : Infinity;
    if (age < 20 * 24 * 3600 * 1000) return { refreshed: false };
    const last = await store().get("token-attempt", { type: "json" });
    if (last && Date.now() - Date.parse(last.at) < 24 * 3600 * 1000) return { refreshed: false };
    await store().setJSON("token-attempt", { at: new Date().toISOString() });
    const r = await fetch(`${IG_API}/refresh_access_token?grant_type=ig_refresh_token&access_token=${encodeURIComponent(t.token)}`);
    const data = await r.json();
    if (!data.access_token) return { refreshed: false, reason: data.error?.message || "Gagal memperpanjang token" };
    await store().setJSON("token", { token: data.access_token, refreshed_at: new Date().toISOString(), expires_in: data.expires_in });
    return { refreshed: true };
}

async function igCall(path, params, method = "POST") {
    const t = await getToken();
    if (!t) throw new Error("Instagram belum terhubung (IG_ACCESS_TOKEN belum diisi di Netlify)");
    const body = new URLSearchParams({ ...params, access_token: t.token });
    const url = method === "GET" ? `${IG_API}${path}?${body}` : `${IG_API}${path}`;
    const r = await fetch(url, method === "GET" ? {} : { method, body });
    const data = await r.json();
    if (data.error) throw new Error(`Instagram: ${data.error.message}`);
    return data;
}

export async function igAccount() {
    return igCall("/me", { fields: "user_id,username" }, "GET");
}

export async function publishToInstagram(post) {
    const container = await igCall("/me/media", { image_url: post.image_url, caption: post.caption });
    for (let i = 0; i < 10; i++) {
        const st = await igCall(`/${container.id}`, { fields: "status_code" }, "GET");
        if (st.status_code === "FINISHED") break;
        if (st.status_code === "ERROR" || st.status_code === "EXPIRED") throw new Error(`Instagram menolak gambar (${st.status_code})`);
        await new Promise(r => setTimeout(r, 1500));
    }
    const pub = await igCall("/me/media_publish", { creation_id: container.id });
    let permalink = null;
    try { permalink = (await igCall(`/${pub.id}`, { fields: "permalink" }, "GET")).permalink; } catch { /* opsional */ }
    return { id: pub.id, permalink };
}

export async function publishPost(post) {
    try {
        const res = await publishToInstagram(post);
        Object.assign(post, { status: "published", ig_media_id: res.id, permalink: res.permalink, published_at: new Date().toISOString(), error: null });
    } catch (e) {
        Object.assign(post, { status: "failed", error: e.message });
    }
    await savePost(post);
    return post;
}
