// Menyajikan gambar postingan secara publik (Instagram mengambil gambar dari URL ini).
import { store } from "../lib/core.mjs";

export default async (req) => {
    const id = new URL(req.url).pathname.match(/^\/m\/([a-f0-9]{16})\.jpg$/)?.[1];
    if (!id) return new Response("Not found", { status: 404 });
    const img = await store().get(`img/${id}`, { type: "arrayBuffer" });
    if (!img) return new Response("Not found", { status: 404 });
    return new Response(img, { headers: { "content-type": "image/jpeg", "cache-control": "public, max-age=31536000, immutable" } });
};

export const config = { path: "/m/*" };
