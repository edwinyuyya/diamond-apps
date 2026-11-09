/**
 * Rute statis untuk public/.
 *
 * - Hanya GET/HEAD.
 * - Whitelist ekstensi.
 * - Proteksi path traversal (.., %2e%2e, NUL, backslash).
 * - Tidak menampilkan daftar direktori.
 */

import { promises as fs } from "node:fs";
import path from "node:path";

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".ico": "image/x-icon",
  ".webmanifest": "application/manifest+json",
};

const EKSTENSI_DIIZINKAN = new Set(Object.keys(MIME));

function halamanGalat(status, judul, pesan) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${status} — ${judul} · AmanLaba</title>
</head>
<body style="font-family: ui-sans-serif, system-ui, sans-serif; margin: 0; padding: 48px 24px; background: #F6F7F9; color: #0B1526;">
  <main style="max-width: 640px; margin: 0 auto;">
    <h1 style="font-size: 2rem; line-height: 1.15;">${status} — ${judul}</h1>
    <p style="line-height: 1.6;">${pesan}</p>
    <p><a href="/" style="color: #0F766E;">Kembali ke beranda</a></p>
  </main>
</body>
</html>
`;
}

function kirimHtml(res, status, html, hanyaKepala = false, headerTambahan = {}) {
  const buffer = Buffer.from(html, "utf8");
  res.writeHead(status, {
    "Content-Type": "text/html; charset=utf-8",
    "Cache-Control": "no-store",
    "Content-Length": buffer.length,
    "X-Content-Type-Options": "nosniff",
    ...headerTambahan,
  });
  if (hanyaKepala) res.end();
  else res.end(buffer);
}

function kirim404(res, hanyaKepala) {
  kirimHtml(
    res,
    404,
    halamanGalat(
      404,
      "Halaman tidak ditemukan",
      "Halaman yang Anda cari tidak tersedia.",
    ),
    hanyaKepala,
  );
}

/**
 * Memetakan path URL ke path relatif di direktori publik.
 *
 * @param {string} jalur path URL yang sudah di-decode
 * @returns {string|null} path relatif atau null bila tidak dikenal
 */
function petakanJalur(jalur) {
  if (jalur === "/") return "index.html";
  if (jalur === "/app" || jalur === "/app/") return "app/index.html";
  if (jalur === "/laporan" || jalur === "/laporan/") return "laporan.html";
  if (jalur.startsWith("/assets/")) return jalur.slice(1);
  return null;
}

/**
 * Menangani permintaan statis.
 *
 * @param {import('node:http').IncomingMessage} req
 * @param {import('node:http').ServerResponse} res
 * @param {URL} urlObj
 * @param {string} direktoriPublik
 * @returns {Promise<void>}
 */
export async function tanganiStatis(req, res, urlObj, direktoriPublik) {
  const hanyaKepala = req.method === "HEAD";

  if (req.method !== "GET" && req.method !== "HEAD") {
    kirimHtml(
      res,
      405,
      halamanGalat(
        405,
        "Metode tidak diizinkan",
        "Gunakan GET atau HEAD untuk halaman ini.",
      ),
      hanyaKepala,
      { Allow: "GET, HEAD" },
    );
    return;
  }

  let jalur;
  try {
    jalur = decodeURIComponent(urlObj.pathname);
  } catch {
    kirim404(res, hanyaKepala);
    return;
  }

  // NUL dan backslash tidak pernah valid pada path aset.
  if (jalur.includes("\0") || jalur.includes("\\")) {
    kirim404(res, hanyaKepala);
    return;
  }

  // Tolak segmen traversal setelah decode (%2e%2e menjadi ..).
  if (jalur.split("/").some((segmen) => segmen === "..")) {
    kirim404(res, hanyaKepala);
    return;
  }

  if (jalur === "/favicon.ico") {
    res.writeHead(204, { "Cache-Control": "no-store" });
    res.end();
    return;
  }

  const relatif = petakanJalur(jalur);
  if (relatif === null) {
    kirim404(res, hanyaKepala);
    return;
  }

  const ekstensi = path.extname(relatif).toLowerCase();
  if (!EKSTENSI_DIIZINKAN.has(ekstensi)) {
    kirim404(res, hanyaKepala);
    return;
  }

  const dasar = path.resolve(direktoriPublik);
  const penuh = path.resolve(dasar, relatif);
  const relatifAman = path.relative(dasar, penuh);

  if (
    relatifAman === "" ||
    relatifAman.startsWith("..") ||
    path.isAbsolute(relatifAman)
  ) {
    kirim404(res, hanyaKepala);
    return;
  }

  if (jalur.startsWith("/assets/") && !relatifAman.startsWith(`assets${path.sep}`)) {
    kirim404(res, hanyaKepala);
    return;
  }

  let isi;
  try {
    isi = await fs.readFile(penuh);
  } catch (error) {
    const kode = error && error.code;
    if (kode === "ENOENT" || kode === "EISDIR" || kode === "ENOTDIR") {
      kirim404(res, hanyaKepala);
    } else {
      kirimHtml(
        res,
        500,
        halamanGalat(
          500,
          "Kesalahan server",
          "Terjadi kesalahan saat menyajikan halaman.",
        ),
        hanyaKepala,
      );
    }
    return;
  }

  res.writeHead(200, {
    "Content-Type": MIME[ekstensi],
    "Cache-Control": "no-store",
    "Content-Length": isi.length,
    "X-Content-Type-Options": "nosniff",
  });
  if (hanyaKepala) res.end();
  else res.end(isi);
}
