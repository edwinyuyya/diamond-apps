import type { Config } from "@netlify/functions";
import { getStore } from "@netlify/blobs";
import { timingSafeEqual } from "node:crypto";

const enc = new TextEncoder();
function sama(a: string, b: string): boolean {
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) { timingSafeEqual(x, x); return false; }
  return timingSafeEqual(x, y);
}

export default async (req: Request) => {
  const token = Netlify.env.get("PUSH_TOKEN");
  const h = req.headers.get("authorization") ?? "";
  if (!token || !h.startsWith("Bearer ") || !sama(h.slice(7), token)) return new Response("Ditolak.", { status: 401 });
  const teks = await req.text();
  if (teks.length > 1_500_000) return new Response("Terlalu besar.", { status: 413 });
  let obj: any;
  try { obj = JSON.parse(teks); } catch { return new Response("JSON tidak valid.", { status: 400 }); }
  if (typeof obj !== "object" || obj === null || !Array.isArray(obj.tasks)) return new Response("Bentuk status tidak dikenal.", { status: 400 });
  obj.pushedAt = Date.now();
  await getStore("agent-state").setJSON("latest", obj);
  return Response.json({ ok: true, bytes: teks.length });
};

export const config: Config = { path: "/api/push", method: "POST" };
