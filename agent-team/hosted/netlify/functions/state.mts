import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { cekPassword } from "../lib/auth.mts";

export default async (req: Request) => {
  const tolak = cekPassword(req);
  if (tolak) return tolak;
  const data = await getStore("agent-state").get("latest", { type: "text", consistency: "strong" });
  const body = data ?? JSON.stringify({ error: "Belum ada data. Jalankan pengirim status dari mesin tempat run berjalan." });
  return new Response(body, { headers: { "content-type": "application/json", "cache-control": "no-store", "x-robots-tag": "noindex" } });
};

export const config: Config = {
  path: "/api/state",
  method: "GET",
  rateLimit: { action: "rate_limit", windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
