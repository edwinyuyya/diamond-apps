import { timingSafeEqual } from "node:crypto";

const enc = new TextEncoder();
function sama(a: string, b: string): boolean {
  const x = enc.encode(a), y = enc.encode(b);
  if (x.length !== y.length) { timingSafeEqual(x, x); return false; }
  return timingSafeEqual(x, y);
}

/** Basic auth (nama pengguna bebas, password = DASH_PASSWORD). Null = lolos; selain itu Response penolakan. */
export function cekPassword(req: Request): Response | null {
  const wajib = Netlify.env.get("DASH_PASSWORD");
  if (!wajib) {
    return new Response("Dashboard belum aktif: isi variabel DASH_PASSWORD di pengaturan Netlify, lalu deploy ulang.", { status: 503 });
  }
  const h = req.headers.get("authorization") ?? "";
  if (h.startsWith("Basic ")) {
    try {
      const dec = atob(h.slice(6));
      const pass = dec.slice(dec.indexOf(":") + 1);
      if (sama(pass, wajib)) return null;
    } catch { /* jatuh ke 401 */ }
  }
  return new Response("Perlu password.", { status: 401, headers: { "www-authenticate": 'Basic realm="Kantor Virtual Nexora", charset="UTF-8"', "cache-control": "no-store" } });
}
