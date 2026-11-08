import type { Config } from "@netlify/functions";
import { cekPassword } from "../lib/auth.mts";
import html from "../lib/page.mjs";

export default async (req: Request) => {
  const tolak = cekPassword(req);
  if (tolak) return tolak;
  return new Response(html, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "no-store", "x-robots-tag": "noindex, nofollow" } });
};

export const config: Config = {
  path: "/",
  method: "GET",
  rateLimit: { action: "rate_limit", windowLimit: 60, windowSize: 60, aggregateBy: ["ip", "domain"] },
};
