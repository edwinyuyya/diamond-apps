// API dashboard /admin: upload, caption AI, persetujuan, jadwal, dan posting ke Instagram.
import {
    json, isAdmin, listPosts, getPost, savePost, createPost, deletePost,
    nextFreeSlot, writeCaption, writePromoText, publishPost, igAccount, store,
} from "../lib/core.mjs";

export default async (req) => {
    if (!isAdmin(req)) return json({ error: "Kata sandi admin salah" }, 401);
    const url = new URL(req.url);
    const parts = url.pathname.replace(/^\/api\/ig\/?/, "").split("/").filter(Boolean);
    const [route, id] = parts;
    const body = ["POST", "PATCH"].includes(req.method) ? await req.json().catch(() => ({})) : {};

    try {
        if (route === "status" && req.method === "GET") {
            const env = { ANTHROPIC_API_KEY: !!process.env.ANTHROPIC_API_KEY, IG_ACCESS_TOKEN: !!process.env.IG_ACCESS_TOKEN };
            let ig = null, igError = null;
            if (env.IG_ACCESS_TOKEN) { try { ig = await igAccount(); } catch (e) { igError = e.message; } }
            return json({ env, ig, igError });
        }

        if (route === "posts" && !id && req.method === "GET") return json({ posts: await listPosts() });

        if (route === "posts" && !id && req.method === "POST") {
            if (!body.image) return json({ error: "Foto belum dipilih" }, 400);
            const post = await createPost({ imageBase64: body.image, kind: body.kind, note: body.note, caption: body.caption });
            return json({ post });
        }

        if (route === "posts" && id) {
            const post = await getPost(id);
            if (!post) return json({ error: "Post tidak ditemukan" }, 404);

            if (req.method === "DELETE") { await deletePost(id); return json({ ok: true }); }

            if (req.method === "PATCH") {
                if (typeof body.caption === "string") post.caption = body.caption;
                if (typeof body.note === "string") post.note = body.note;
                if (body.action === "regenerate") {
                    const img = await store().get(`img/${id}`, { type: "arrayBuffer" });
                    post.caption = await writeCaption({ imageBase64: Buffer.from(img).toString("base64"), kind: post.kind, note: post.note });
                }
                if (body.action === "approve") {
                    post.scheduled_at = body.scheduled_at || await nextFreeSlot(await listPosts());
                    post.status = "scheduled"; post.error = null;
                }
                if (body.action === "unschedule") { post.status = "review"; post.scheduled_at = null; }
                await savePost(post);
                if (body.action === "publish_now") return json({ post: await publishPost(post) });
                return json({ post });
            }
        }

        if (route === "promo-text" && req.method === "POST") {
            if (!body.topic) return json({ error: "Topik promo belum diisi" }, 400);
            return json(await writePromoText(body.topic));
        }

        return json({ error: "Tidak ditemukan" }, 404);
    } catch (e) {
        return json({ error: e.message || "Terjadi kesalahan" }, 500);
    }
};

export const config = { path: ["/api/ig", "/api/ig/*"] };
