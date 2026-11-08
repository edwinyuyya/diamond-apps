/**
 * Test API HTTP AmanLaba lewat server sungguhan pada port ephemeral (0).
 */

import test, { before, after } from "node:test";
import assert from "node:assert/strict";

import { daftarTemplate, VERSI_MESIN } from "../backend/engine/index.js";
import {
  buatServerUji,
  ambilJson,
  mintaMentah,
} from "./bantuan/server-uji.js";

const SKENARIO = {
  nama: "Warung Makan Bu Sari",
  mataUang: "IDR",
  hargaJual: { min: 12000, mode: 15000, max: 18000 },
  biayaTetap: { min: 3000000, mode: 4000000, max: 5500000 },
  biayaVariabel: { min: 5000, mode: 6500, max: 8000 },
  permintaan: { min: 300, mode: 600, max: 1000 },
};

let uji;

before(async () => {
  uji = await buatServerUji();
});

after(async () => {
  if (uji) await uji.tutup();
});

function posSimulasi(muatan) {
  return ambilJson(uji.dasar, "/api/simulasi", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(muatan),
  });
}

function posHarga(muatan) {
  return ambilJson(uji.dasar, "/api/harga", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(muatan),
  });
}

function hapusMetaVariabel(data) {
  const salinan = structuredClone(data);
  delete salinan.meta.durasiMs;
  delete salinan.meta.dihitungPada;
  return salinan;
}

test("GET /api/health mengembalikan status ok dengan envelope data", async () => {
  const { status, headers, data } = await ambilJson(uji.dasar, "/api/health");

  assert.equal(status, 200);
  assert.equal(headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(headers.get("cache-control"), "no-store");
  assert.ok(data && typeof data === "object");
  assert.equal(data.data.status, "ok");
  assert.equal(data.data.nama, "AmanLaba");
  assert.equal(data.data.versi, "1.0.0");
  assert.ok(!Number.isNaN(Date.parse(data.data.waktu)));
});

test("GET /api/template mengembalikan tepat 4 template sesuai urutan kontrak", async () => {
  const { status, data } = await ambilJson(uji.dasar, "/api/template");

  assert.equal(status, 200);
  const template = data.data;
  assert.ok(Array.isArray(template));
  assert.equal(template.length, 4);
  assert.deepEqual(
    template.map((item) => item.id),
    ["warung-makan", "kafe", "toko-online", "jasa-freelance"],
  );

  for (const item of template) {
    assert.equal(typeof item.nama, "string");
    assert.equal(typeof item.deskripsi, "string");
    assert.equal(typeof item.emoji, "string");
    assert.equal(typeof item.opsi.iterasi, "number");
    assert.equal(typeof item.opsi.seed, "number");
    assert.equal(item.skenario.mataUang, "IDR");
  }

  // Data template harus persis sama dengan modul template mesin.
  assert.deepEqual(template, daftarTemplate());
  assert.deepEqual(template[0].skenario.hargaJual, {
    min: 12000,
    mode: 15000,
    max: 18000,
  });
});

test("POST /api/simulasi valid mengembalikan struktur data lengkap", async () => {
  const { status, headers, data } = await posSimulasi({
    skenario: SKENARIO,
    opsi: { iterasi: 2000, seed: 12345 },
  });

  assert.equal(status, 200);
  assert.equal(headers.get("content-type"), "application/json; charset=utf-8");
  assert.equal(headers.get("cache-control"), "no-store");

  const hasil = data.data;
  assert.ok(hasil && typeof hasil === "object");

  assert.equal(hasil.meta.iterasi, 2000);
  assert.equal(hasil.meta.seed, 12345);
  assert.equal(hasil.meta.versiMesin, VERSI_MESIN);
  assert.equal(hasil.meta.sapuanHarga.langkah, 21);
  assert.ok(hasil.meta.sapuanHarga.max > hasil.meta.sapuanHarga.min);
  assert.equal(typeof hasil.meta.durasiMs, "number");
  assert.ok(!Number.isNaN(Date.parse(hasil.meta.dihitungPada)));

  for (const kunci of [
    "labaRataRata",
    "labaP5",
    "labaP50",
    "labaP95",
    "labaMin",
    "labaMax",
    "standarDeviasi",
    "peluangRugi",
    "peluangUntung",
  ]) {
    assert.equal(typeof hasil.ringkasan[kunci], "number", `ringkasan.${kunci}`);
  }

  assert.equal(typeof hasil.titikImpas.valid, "boolean");
  assert.equal(typeof hasil.titikImpas.unit, "number");

  assert.equal(hasil.histogram.jumlahBin, 30);
  assert.equal(hasil.histogram.bin.length, 30);
  assert.equal(hasil.sensitivitas.length, 4);
  assert.equal(hasil.harga.sapuan.length, 21);
  assert.equal(typeof hasil.harga.terbaik.harga, "number");
  assert.equal(typeof hasil.harga.teraman.harga, "number");
  assert.equal(typeof hasil.harga.terbaik.alasan, "string");
  assert.equal(typeof hasil.harga.teraman.alasan, "string");
});

test("POST /api/simulasi menolak input tidak valid dengan 400 VALIDASI_GAGAL", async () => {
  const { status, data } = await posSimulasi({
    skenario: {
      ...SKENARIO,
      permintaan: { min: 100, mode: 900, max: 800 },
    },
  });

  assert.equal(status, 400);
  assert.equal(data.error.kode, "VALIDASI_GAGAL");
  assert.ok(Array.isArray(data.error.detail));
  assert.ok(
    data.error.detail.some((item) => item.field === "permintaan.max"),
    "detail harus menyebut field permintaan.max",
  );
  assert.ok(data.error.detail.every((item) => typeof item.pesan === "string"));
});

test("POST /api/simulasi menolak opsi di luar batas dengan field opsi.iterasi", async () => {
  const { status, data } = await posSimulasi({
    skenario: SKENARIO,
    opsi: { iterasi: 500, seed: 12345 },
  });

  assert.equal(status, 400);
  assert.equal(data.error.kode, "VALIDASI_GAGAL");
  assert.ok(
    data.error.detail.some((item) => item.field === "opsi.iterasi"),
    "detail harus menyebut field opsi.iterasi",
  );
});

test("body JSON rusak menghasilkan 400 JSON_TIDAK_VALID", async () => {
  const { status, data } = await ambilJson(uji.dasar, "/api/simulasi", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{ ini bukan json",
  });

  assert.equal(status, 400);
  assert.equal(data.error.kode, "JSON_TIDAK_VALID");
  assert.equal(typeof data.error.pesan, "string");
});

test("body lebih dari 128 KB menghasilkan 413 TERLALU_BESAR", async () => {
  const badan = JSON.stringify({
    skenario: SKENARIO,
    lapisan: "x".repeat(140 * 1024),
  });

  const { status, data } = await ambilJson(uji.dasar, "/api/simulasi", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: badan,
  });

  assert.equal(status, 413);
  assert.equal(data.error.kode, "TERLALU_BESAR");
});

test("rute API tidak dikenal menghasilkan 404 TIDAK_DITEMUKAN", async () => {
  const { status, data } = await ambilJson(uji.dasar, "/api/tidak-ada");

  assert.equal(status, 404);
  assert.equal(data.error.kode, "TIDAK_DITEMUKAN");
});

test("method salah menghasilkan 405 METODE_TIDAK_DIIZINKAN dengan header Allow", async () => {
  const { status, headers, data } = await ambilJson(uji.dasar, "/api/template", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: "{}",
  });

  assert.equal(status, 405);
  const allow = headers.get("allow");
  assert.ok(allow && allow.includes("GET"), `header Allow tidak memuat GET: ${allow}`);
  assert.equal(data.error.kode, "METODE_TIDAK_DIIZINKAN");
});

test("POST /api/harga mengembalikan sapuan saja sesuai kontrak", async () => {
  const { status, data } = await posHarga({
    skenario: SKENARIO,
    opsi: {
      seed: 12345,
      sapuanHarga: { min: 9000, max: 25000, langkah: 21 },
    },
  });

  assert.equal(status, 200);
  const hasil = data.data;

  assert.equal(hasil.sapuan.length, 21);
  assert.equal(hasil.sapuan[0].harga, 9000);
  assert.equal(hasil.sapuan[20].harga, 25000);
  assert.equal(hasil.terbaik.harga < 25000, true);
  assert.equal(hasil.teraman.harga < 25000, true);
  assert.equal(typeof hasil.terbaik.alasan, "string");
  assert.equal(typeof hasil.teraman.alasan, "string");

  assert.equal(hasil.meta.iterasi, 1500);
  assert.equal(hasil.meta.seed, 12345);
  assert.equal(hasil.meta.versiMesin, VERSI_MESIN);
  assert.deepEqual(hasil.meta.sapuanHarga, {
    min: 9000,
    max: 25000,
    langkah: 21,
  });

  // Endpoint ini hanya mengembalikan sapuan, bukan ringkasan simulasi utama.
  assert.equal(hasil.ringkasan, undefined);
  assert.equal(hasil.histogram, undefined);
});

test("determinisme lewat HTTP: dua request identik sama kecuali durasiMs/dihitungPada", async () => {
  const muatan = {
    skenario: SKENARIO,
    opsi: { iterasi: 2000, seed: 98765 },
  };

  const pertama = await posSimulasi(muatan);
  const kedua = await posSimulasi(muatan);

  assert.equal(pertama.status, 200);
  assert.equal(kedua.status, 200);
  assert.deepEqual(
    hapusMetaVariabel(pertama.data.data),
    hapusMetaVariabel(kedua.data.data),
  );
});

test("path traversal pada rute statis ditolak dengan 404", async () => {
  for (const jalur of [
    "/../package.json",
    "/%2e%2e/package.json",
    "/assets/../package.json",
    "/assets/%2e%2e/%2e%2e/package.json",
  ]) {
    const hasil = await mintaMentah(uji.port, jalur);
    assert.equal(hasil.status, 404, `jalur traversal harus 404: ${jalur}`);
    assert.ok(
      !hasil.teks.includes('"name": "amanlaba"'),
      "isi package.json tidak boleh bocor",
    );
  }
});
