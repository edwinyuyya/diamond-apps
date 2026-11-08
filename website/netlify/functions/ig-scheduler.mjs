// Berjalan otomatis tiap jam (menit ke-5): memposting post terjadwal yang sudah waktunya
// dan memperpanjang token Instagram sebelum kedaluwarsa.
import { listPosts, publishPost, refreshTokenIfDue } from "../lib/core.mjs";

export default async () => {
    const token = await refreshTokenIfDue().catch(e => ({ refreshed: false, reason: e.message }));
    const due = (await listPosts()).filter(p => p.status === "scheduled" && p.scheduled_at && Date.parse(p.scheduled_at) <= Date.now());
    const results = [];
    for (const post of due) {
        const done = await publishPost(post);
        results.push({ id: done.id, status: done.status, error: done.error });
    }
    console.log(JSON.stringify({ token, published: results }));
};

export const config = { schedule: "5 * * * *" };
