/**
 * Test rute statis, MIME, kelengkapan DOM wajib, dan larangan aset eksternal.
 */

import test, { before, after } from "node:test";
import assert from "node:assert/strict";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buatServerUji } from "./bantuan/server-uji.js";

const AKAR_TEST = path.dirname(fileURLToPath(import.meta.url));
const AKAR_PROYEK = path.resolve(AKAR_TEST, "..");
const DIREKTORI_PUBLIK = path.join(AKAR_PROYEK, "public");

const ID_LANDING = [
  "nav-utama",
  "tombol-menu",
  "tahun",
  "cara-kerja",
  "fitur",
  "template",
  "harga",
  "faq",
  "notifikasi-paket",
  "cta-utama",
];

const ID_APLIKASI = [
  "form-skenario",
  "nama-skenario",
  "harga-min",
  "harga-mode",
  "harga-max",
  "tetap-min",
  "tetap-mode",
  "tetap-max",
  "variabel-min",
  "variabel-mode",
  "variabel-max",
  "permintaan-min",
  "permintaan-mode",
  "permintaan-max",
  "iterasi",
  "seed",
  "tombol-acak-seed",
  "tombol-hitung",
  "galat",
  "status-hitung",
  "panel-hasil",
  "nilai-peluang-rugi",
  "nilai-peluang-untung",
  "nilai-p5",
  "nilai-p50",
  "nilai-p95",
  "nilai-rata-rata",
  "nilai-min",
  "nilai-maks",
  "nilai-deviasi",
  "nilai-impas-unit",
  "nilai-impas-pendapatan",
  "grafik-histogram",
  "grafik-tornado",
  "grafik-harga",
  "label-harga-terbaik",
  "alasan-harga-terbaik",
  "label-harga-teraman",
  "alasan-harga-teraman",
  "daftar-template",
  "daftar-skenario",
  "tombol-simpan",
  "tautan-laporan",
  "notifikasi",
];

const ID_LAPORAN = [
  "laporan",
  "laporan-galat",
  "laporan-muatan",
  "tombol-cetak",
  "laporan-nama",
  "laporan-tanggal",
  "laporan-seed",
  "laporan-iterasi",
  "laporan-peluang-rugi",
  "laporan-p5",
  "laporan-p50",
  "laporan-p95",
  "laporan-impas",
  "laporan-histogram",
  "laporan-tornado",
  "laporan-harga",
  "laporan-asumsi",
  "laporan-kesimpulan",
  "laporan-disclaimer",
];

let uji;

before(async () => {
  uji = await buatServerUji();
});

after(async () => {
  if (uji) await uji.tutup();
});

async function ambilTeks(jalur) {
  const respons = await fetch(`${uji.dasar}${jalur}`);
  return {
    status: respons.status,
    headers: respons.headers,
    teks: await respons.text(),
  };
}

function idAda(html, id) {
  return new RegExp(`id\\s*=\\s*["']${id}["']`).test(html);
}

function periksaDaftarId(html, daftar, namaHalaman) {
  const hilang = daftar.filter((id) => !idAda(html, id));
  assert.deepEqual(hilang, [], `${namaHalaman} kekurangan ID: ${hilang.join(", ")}`);
}

test("rute halaman /, /app, /laporan (dan trailing slash) mengembalikan HTML 200", async () => {
  for (const jalur of ["/", "/app", "/app/", "/laporan", "/laporan/"]) {
    const { status, headers } = await ambilTeks(jalur);
    assert.equal(status, 200, `status ${jalur}`);
    assert.equal(
      headers.get("content-type"),
      "text/html; charset=utf-8",
      `content-type ${jalur}`,
    );
    assert.equal(headers.get("cache-control"), "no-store", `cache ${jalur}`);
  }
});

test("aset CSS/JS disajikan dengan MIME yang benar", async () => {
  const aset = [
    ["/assets/css/base.css", "text/css; charset=utf-8"],
    ["/assets/css/app.css", "text/css; charset=utf-8"],
    ["/assets/js/app/utama.js", "text/javascript; charset=utf-8"],
    ["/assets/js/app/form.js", "text/javascript; charset=utf-8"],
    ["/assets/js/landing.js", "text/javascript; charset=utf-8"],
    ["/assets/js/laporan.js", "text/javascript; charset=utf-8"],
  ];

  for (const [jalur, mime] of aset) {
    const { status, headers, teks } = await ambilTeks(jalur);
    assert.equal(status, 200, `status ${jalur}`);
    assert.equal(headers.get("content-type"), mime, `MIME ${jalur}`);
    assert.ok(teks.length > 0, `isi ${jalur} kosong`);
  }

  // Query string diabaikan saat mencari file.
  const denganQuery = await ambilTeks("/assets/css/base.css?v=123");
  assert.equal(denganQuery.status, 200);
  assert.equal(denganQuery.headers.get("content-type"), "text/css; charset=utf-8");
});

test("landing memuat H1, CTA, tiga paket harga, dan seluruh ID wajib", async () => {
  const { teks } = await ambilTeks("/");

  assert.ok(
    teks.includes("Jangan tebak harga jual. Simulasikan risikonya."),
    "H1 landing tidak ditemukan",
  );
  assert.ok(teks.includes('id="cta-utama"'));
  assert.ok(
    /id\s*=\s*["']cta-utama["'][^>]*href\s*=\s*["']\/app["']/.test(teks) ||
      /href\s*=\s*["']\/app["'][^>]*id\s*=\s*["']cta-utama["']/.test(teks),
    "CTA utama harus menuju /app",
  );

  for (const teksWajib of ["Gratis", "Pro", "Bisnis", "Rp0", "Rp49.000", "Rp149.000"]) {
    assert.ok(teks.includes(teksWajib), `landing tidak memuat "${teksWajib}"`);
  }

  const tombolDemo = teks.match(/data-demo\s*=\s*["']true["']/g) ?? [];
  assert.ok(tombolDemo.length >= 2, "tombol Pro/Bisnis wajib data-demo=\"true\"");

  periksaDaftarId(teks, ID_LANDING, "landing");
});

test("aplikasi memuat seluruh ID DOM wajib CONTRACT.md §9.4", async () => {
  const { teks } = await ambilTeks("/app");

  periksaDaftarId(teks, ID_APLIKASI, "aplikasi");
  assert.ok(
    /pada harga paling mungkin/i.test(teks),
    "label permintaan wajib menyebut 'pada harga paling mungkin'",
  );
});

test("laporan memuat seluruh ID DOM wajib CONTRACT.md §9.4", async () => {
  const { teks } = await ambilTeks("/laporan");
  periksaDaftarId(teks, ID_LAPORAN, "laporan");
});

test("semua halaman memakai lang=id dan judul unik", async () => {
  const harapan = [
    ["/", "AmanLaba — Simulator Risiko Usaha untuk UMKM"],
    ["/app", "AmanLaba — Simulasi Risiko Usaha"],
    ["/laporan", "Laporan Simulasi — AmanLaba"],
  ];

  for (const [jalur, judul] of harapan) {
    const { teks } = await ambilTeks(jalur);
    assert.ok(/<html[^>]*\slang\s*=\s*["']id["']/i.test(teks), `lang=id ${jalur}`);
    assert.ok(
      new RegExp(`<title>\\s*${judul.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\s*</title>`).test(
        teks,
      ),
      `judul ${jalur} harus "${judul}"`,
    );
  }
});

test("tidak ada aset eksternal di HTML maupun CSS", async () => {
  const polaAtribut = /\b(?:src|href)\s*=\s*["']([^"']+)["']/gi;

  for (const jalur of ["/", "/app", "/laporan"]) {
    const { teks } = await ambilTeks(jalur);
    for (const cocok of teks.matchAll(polaAtribut)) {
      const nilai = cocok[1].trim();
      assert.ok(
        !/^(?:https?:)?\/\//i.test(nilai),
        `aset eksternal ditemukan di ${jalur}: ${nilai}`,
      );
    }
    assert.ok(
      !/@import\s+(?:url\()?["']?(?:https?:)?\/\//i.test(teks),
      `@import eksternal ditemukan di ${jalur}`,
    );
  }

  for (const jalur of ["/assets/css/base.css", "/assets/css/app.css"]) {
    const { teks } = await ambilTeks(jalur);
    for (const cocok of teks.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)/gi)) {
      const nilai = cocok[1].trim();
      assert.ok(
        nilai.startsWith("/") ||
          nilai.startsWith("data:") ||
          nilai.startsWith("#"),
        `url() eksternal ditemukan di ${jalur}: ${nilai}`,
      );
    }
    assert.ok(
      !/@import\s+(?:url\()?["']?(?:https?:)?\/\//i.test(teks),
      `@import eksternal ditemukan di ${jalur}`,
    );
  }
});

test("public/ hanya berisi berkas milik path yang disepakati", async () => {
  const diizinkan =
    /^(?:index\.html|laporan\.html|app\/index\.html|assets\/css\/(?:base|app)\.css|assets\/js\/(?:landing|laporan)\.js|assets\/js\/app\/[^/]+\.js|assets\/img\/[^/]+)$/;

  async function kumpulkan(direktori) {
    const isi = await fs.readdir(direktori, { withFileTypes: true });
    const hasil = [];
    for (const entri of isi) {
      const penuh = path.join(direktori, entri.name);
      if (entri.isDirectory()) {
        hasil.push(...(await kumpulkan(penuh)));
      } else if (entri.isFile()) {
        hasil.push(path.relative(DIREKTORI_PUBLIK, penuh).split(path.sep).join("/"));
      }
    }
    return hasil;
  }

  const berkas = await kumpulkan(DIREKTORI_PUBLIK);
  assert.ok(berkas.length > 0, "public/ tidak boleh kosong");
  const melanggar = berkas.filter((relatif) => !diizinkan.test(relatif));
  assert.deepEqual(melanggar, [], `berkas di luar kepemilikan: ${melanggar.join(", ")}`);
});
