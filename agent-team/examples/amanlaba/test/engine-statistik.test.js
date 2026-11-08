/**
 * Test statistik mesin simulasi AmanLaba.
 *
 * Menguji RNG mulberry32, distribusi triangular, kasus analitik yang
 * ditetapkan CONTRACT.md §13.1, determinisme, histogram, sensitivitas,
 * sapuan harga, titik impas, seed 0, dan faktor respons permintaan.
 */

import test from "node:test";
import assert from "node:assert/strict";

import {
  VERSI_MESIN,
  buatRng,
  ambilTriangular,
  kuantilTriangular,
  faktorPermintaanHarga,
  jalankanSimulasi,
  sapuanHarga,
  analisisSensitivitas,
  hitungTitikImpas,
  daftarTemplate,
} from "../backend/engine/index.js";

/** Menghapus field meta yang boleh berbeda antar pemanggilan. */
function tanpaMetaVariabel(data) {
  const salinan = structuredClone(data);
  delete salinan.meta.durasiMs;
  delete salinan.meta.dihitungPada;
  return salinan;
}

/** CDF distribusi triangular (untuk uji invers). */
function cdfTriangular(x, { min, mode, max }) {
  if (x <= min) return 0;
  if (x >= max) return 1;
  if (max === min) return 1;
  if (x < mode) {
    return ((x - min) * (x - min)) / ((max - min) * (mode - min));
  }
  return 1 - ((max - x) * (max - x)) / ((max - min) * (max - mode));
}

const SKENARIO_ANALITIK = {
  hargaJual: { min: 15000, mode: 15000, max: 15000 },
  biayaTetap: { min: 4000000, mode: 4000000, max: 4000000 },
  biayaVariabel: { min: 5000, mode: 5000, max: 5000 },
  permintaan: { min: 200, mode: 400, max: 800 },
};

const SEKITAR = (nilai, target, toleransi) =>
  assert.ok(
    Math.abs(nilai - target) <= toleransi,
    `diharapkan ${nilai} berada dalam ${target} ± ${toleransi}`,
  );

test("RNG mulberry32 seragam: rata-rata 0,5 ± 0,01 dan desil 0,1 ± 0,02", () => {
  const rng = buatRng(12345);
  const jumlahSampel = 100000;
  const hitungDesil = new Array(10).fill(0);
  let total = 0;
  let minimum = Infinity;
  let maksimum = -Infinity;

  for (let i = 0; i < jumlahSampel; i += 1) {
    const u = rng();
    assert.ok(u >= 0 && u < 1, `nilai RNG di luar [0,1): ${u}`);
    total += u;
    if (u < minimum) minimum = u;
    if (u > maksimum) maksimum = u;
    const desil = Math.min(9, Math.floor(u * 10));
    hitungDesil[desil] += 1;
  }

  assert.ok(minimum >= 0 && maksimum < 1);
  SEKITAR(total / jumlahSampel, 0.5, 0.01);

  for (let d = 0; d < 10; d += 1) {
    SEKITAR(hitungDesil[d] / jumlahSampel, 0.1, 0.02);
  }
});

test("RNG dengan seed sama menghasilkan urutan identik, seed berbeda berbeda", () => {
  const a = buatRng(42);
  const b = buatRng(42);
  const c = buatRng(43);
  const urutanA = Array.from({ length: 50 }, () => a());
  const urutanB = Array.from({ length: 50 }, () => b());
  const urutanC = Array.from({ length: 50 }, () => c());
  assert.deepEqual(urutanA, urutanB);
  assert.notDeepEqual(urutanA, urutanC);
});

test("kuantil triangular adalah invers CDF yang benar", () => {
  const distribusi = { min: 10, mode: 30, max: 60 };
  const probabilitas = [0, 0.01, 0.05, 0.1, 0.25, 0.333, 0.5, 0.75, 0.9, 0.99, 1];

  for (const p of probabilitas) {
    const x = kuantilTriangular(p, distribusi);
    assert.ok(x >= distribusi.min && x <= distribusi.max);
    assert.ok(
      Math.abs(cdfTriangular(x, distribusi) - p) <= 1e-9,
      `CDF(kuantil(${p})) = ${cdfTriangular(x, distribusi)}`,
    );
  }

  assert.equal(kuantilTriangular(0, distribusi), 10);
  assert.equal(kuantilTriangular(1, distribusi), 60);
});

test("kuantil triangular menangani kasus batas min=mode, max=mode, min=max", () => {
  // min === mode: F = 0, selalu cabang kedua; p=0 memberi min.
  const minSamaMode = { min: 5, mode: 5, max: 20 };
  assert.equal(kuantilTriangular(0, minSamaMode), 5);
  assert.ok(kuantilTriangular(0.5, minSamaMode) > 5);

  // max === mode: F = 1, selalu cabang pertama; p=1 memberi max.
  const maxSamaMode = { min: 5, mode: 20, max: 20 };
  assert.equal(kuantilTriangular(1, maxSamaMode), 20);
  assert.ok(kuantilTriangular(0.5, maxSamaMode) < 20);

  // min === max: selalu mengembalikan nilai yang sama.
  const konstan = { min: 7, mode: 7, max: 7 };
  for (const p of [0, 0.25, 0.5, 0.99, 1]) {
    assert.equal(kuantilTriangular(p, konstan), 7);
  }
});

test("ambilTriangular selalu mengonsumsi tepat satu angka acak, termasuk min=max", () => {
  let panggilan = 0;
  const rng = () => {
    panggilan += 1;
    return 0.25;
  };

  const nilai = ambilTriangular(rng, { min: 9, mode: 9, max: 9 });
  assert.equal(nilai, 9);
  assert.equal(panggilan, 1);
});

test("sampel triangular 100.000: semua dalam rentang, median membagi 0,5 ± 0,01", () => {
  const distribusi = { min: 10, mode: 30, max: 60 };
  const median = kuantilTriangular(0.5, distribusi);
  const rng = buatRng(777);
  const jumlah = 100000;
  let diBawahMedian = 0;

  for (let i = 0; i < jumlah; i += 1) {
    const x = ambilTriangular(rng, distribusi);
    assert.ok(x >= distribusi.min && x <= distribusi.max);
    if (x < median) diBawahMedian += 1;
  }

  SEKITAR(diBawahMedian / jumlah, 0.5, 0.01);
});

test("kasus analitik sesuai CONTRACT.md §13.1", () => {
  const hasil = jalankanSimulasi(SKENARIO_ANALITIK, {
    iterasi: 20000,
    seed: 12345,
  });

  assert.equal(hasil.meta.iterasi, 20000);
  assert.equal(hasil.meta.seed, 12345);
  assert.equal(hasil.meta.versiMesin, "1.0.0");
  assert.equal(typeof hasil.meta.sapuanHarga.min, "number");
  assert.equal(typeof hasil.meta.sapuanHarga.max, "number");
  assert.equal(typeof hasil.meta.sapuanHarga.langkah, "number");

  // Laba = 10.000 × permintaan − 4.000.000; E[permintaan] = 466,67.
  SEKITAR(hasil.ringkasan.labaRataRata, 666666.67, 666666.67 * 0.02);
  SEKITAR(hasil.ringkasan.peluangRugi, 1 / 3, 0.02);
  assert.ok(
    Math.abs(
      hasil.ringkasan.peluangRugi + hasil.ringkasan.peluangUntung - 1,
    ) <= 1e-12,
  );
  SEKITAR(hasil.ringkasan.labaP5, -1225403, 150000);
  SEKITAR(hasil.ringkasan.labaP50, 535900, 150000);
  SEKITAR(hasil.ringkasan.labaP95, 2904555, 150000);
  assert.ok(Number.isFinite(hasil.ringkasan.standarDeviasi));
  assert.ok(hasil.ringkasan.labaMin <= hasil.ringkasan.labaP5);
  assert.ok(hasil.ringkasan.labaP95 <= hasil.ringkasan.labaMax);

  assert.equal(hasil.titikImpas.valid, true);
  assert.equal(hasil.titikImpas.unit, 400);
  assert.equal(hasil.titikImpas.pendapatan, 6000000);
  assert.equal(hasil.titikImpas.marginPerUnit, 10000);
  assert.equal(hasil.titikImpas.catatan, null);
});

test("determinisme: seed sama identik (kecuali durasiMs/dihitungPada), seed beda berbeda", () => {
  const pertama = jalankanSimulasi(SKENARIO_ANALITIK, {
    iterasi: 5000,
    seed: 2468,
  });
  const kedua = jalankanSimulasi(SKENARIO_ANALITIK, {
    iterasi: 5000,
    seed: 2468,
  });
  const lain = jalankanSimulasi(SKENARIO_ANALITIK, {
    iterasi: 5000,
    seed: 2469,
  });

  assert.deepEqual(tanpaMetaVariabel(pertama), tanpaMetaVariabel(kedua));
  assert.notDeepEqual(tanpaMetaVariabel(pertama), tanpaMetaVariabel(lain));
});

test("histogram: 30 bin, total jumlah = N, total proporsi = 1, bin bersambung", () => {
  const hasil = jalankanSimulasi(SKENARIO_ANALITIK, {
    iterasi: 20000,
    seed: 12345,
  });
  const { histogram } = hasil;

  assert.equal(histogram.jumlahBin, 30);
  assert.equal(histogram.bin.length, 30);
  assert.equal(histogram.batasBawah, hasil.ringkasan.labaMin);
  assert.equal(histogram.batasAtas, hasil.ringkasan.labaMax);

  const totalJumlah = histogram.bin.reduce((jumlah, bin) => jumlah + bin.jumlah, 0);
  const totalProporsi = histogram.bin.reduce(
    (jumlah, bin) => jumlah + bin.proporsi,
    0,
  );
  assert.equal(totalJumlah, 20000);
  assert.ok(Math.abs(totalProporsi - 1) <= 1e-9);

  for (let i = 0; i < histogram.bin.length; i += 1) {
    assert.ok(histogram.bin[i].jumlah >= 0);
    assert.ok(histogram.bin[i].proporsi >= 0 && histogram.bin[i].proporsi <= 1);
    if (i > 0) {
      assert.equal(histogram.bin[i].mulai, histogram.bin[i - 1].akhir);
    }
  }
});

test("sensitivitas: 4 item terurut menurun, dampak = |delta|, permintaan terbesar", () => {
  const hasil = analisisSensitivitas(SKENARIO_ANALITIK);
  const labelWajib = {
    hargaJual: "Harga Jual",
    biayaTetap: "Biaya Tetap",
    biayaVariabel: "Biaya Variabel",
    permintaan: "Permintaan",
  };

  assert.equal(hasil.length, 4);
  const kunci = hasil.map((item) => item.kunci).sort();
  assert.deepEqual(kunci, [
    "biayaTetap",
    "biayaVariabel",
    "hargaJual",
    "permintaan",
  ]);

  for (const item of hasil) {
    assert.equal(item.label, labelWajib[item.kunci]);
    assert.equal(item.dampak, Math.abs(item.delta));
    assert.ok(Number.isFinite(item.nilaiRendah));
    assert.ok(Number.isFinite(item.nilaiTinggi));
  }

  for (let i = 1; i < hasil.length; i += 1) {
    assert.ok(
      hasil[i - 1].dampak >= hasil[i].dampak,
      "sensitivitas harus terurut menurun berdasarkan dampak",
    );
  }

  assert.equal(hasil[0].kunci, "permintaan");
});

test("sapuan harga: panjang = langkah, harga menaik, rekomendasi sesuai aturan", () => {
  const template = daftarTemplate().find((item) => item.id === "warung-makan");
  const hasil = sapuanHarga(template.skenario, template.opsi);

  assert.equal(hasil.sapuan.length, 21);
  const hargaMaksimum = Math.max(...hasil.sapuan.map((titik) => titik.harga));

  for (let i = 0; i < hasil.sapuan.length; i += 1) {
    const titik = hasil.sapuan[i];
    assert.ok(Number.isFinite(titik.harga));
    assert.ok(Number.isFinite(titik.labaRataRata));
    assert.ok(Number.isFinite(titik.labaP5));
    assert.ok(Number.isFinite(titik.labaP50));
    assert.ok(titik.peluangRugi >= 0 && titik.peluangRugi <= 1);
    if (i > 0) {
      assert.ok(
        titik.harga > hasil.sapuan[i - 1].harga,
        "harga sapuan harus menaik",
      );
    }
  }

  const labaRataMaksimum = Math.max(
    ...hasil.sapuan.map((titik) => titik.labaRataRata),
  );
  const peluangRugiMinimum = Math.min(
    ...hasil.sapuan.map((titik) => titik.peluangRugi),
  );
  assert.equal(hasil.terbaik.labaRataRata, labaRataMaksimum);
  assert.equal(hasil.teraman.peluangRugi, peluangRugiMinimum);
  assert.equal(typeof hasil.terbaik.alasan, "string");
  assert.ok(hasil.terbaik.alasan.length > 0);
  assert.equal(typeof hasil.teraman.alasan, "string");
  assert.ok(hasil.teraman.alasan.length > 0);

  // Model respons permintaan harus menghasilkan trade-off: rekomendasi bukan
  // harga maksimum sapuan.
  assert.ok(hasil.terbaik.harga < hargaMaksimum);
  assert.ok(hasil.teraman.harga < hargaMaksimum);
});

test("sapuan harga menghormati rentang dan langkah yang diberikan pengguna", () => {
  const hasil = sapuanHarga(SKENARIO_ANALITIK, {
    seed: 12345,
    sapuanHarga: { min: 10000, max: 20000, langkah: 7 },
  });

  assert.equal(hasil.sapuan.length, 7);
  assert.equal(hasil.sapuan[0].harga, 10000);
  assert.equal(hasil.sapuan[6].harga, 20000);
  assert.ok(hasil.terbaik.harga >= 10000 && hasil.terbaik.harga <= 20000);
});

test("titik impas tidak valid saat biayaVariabel.mode >= hargaJual.mode", () => {
  const impas = hitungTitikImpas({
    hargaJual: { min: 12000, mode: 15000, max: 18000 },
    biayaTetap: { min: 3000000, mode: 4000000, max: 5500000 },
    biayaVariabel: { min: 5000, mode: 15000, max: 20000 },
  });

  assert.equal(impas.valid, false);
  assert.equal(impas.unit, null);
  assert.equal(impas.pendapatan, null);
  assert.equal(impas.marginPerUnit, 0);
  assert.equal(typeof impas.catatan, "string");
  assert.ok(impas.catatan.length > 0);

  const diAtas = hitungTitikImpas({
    hargaJual: { min: 12000, mode: 15000, max: 18000 },
    biayaTetap: { min: 3000000, mode: 4000000, max: 5500000 },
    biayaVariabel: { min: 5000, mode: 16000, max: 20000 },
  });
  assert.equal(diAtas.valid, false);
});

test("seed 0 dapat dijalankan tanpa error dan menghasilkan nilai finite", () => {
  const hasil = jalankanSimulasi(SKENARIO_ANALITIK, { iterasi: 1000, seed: 0 });
  assert.equal(hasil.meta.seed, 0);
  assert.equal(hasil.meta.iterasi, 1000);
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
    assert.ok(
      Number.isFinite(hasil.ringkasan[kunci]),
      `${kunci} harus finite untuk seed 0`,
    );
  }
});

test("faktor respons permintaan: 1 di mode, 0,5 di max, 0 di choke, clamp 0..2", () => {
  const hargaJual = { min: 12000, mode: 15000, max: 18000 };
  const choke = 2 * hargaJual.max - hargaJual.mode;

  assert.equal(faktorPermintaanHarga(hargaJual.mode, hargaJual), 1);
  assert.equal(faktorPermintaanHarga(hargaJual.max, hargaJual), 0.5);
  assert.equal(faktorPermintaanHarga(choke, hargaJual), 0);
  assert.equal(faktorPermintaanHarga(choke + 1000, hargaJual), 0);
  assert.equal(faktorPermintaanHarga(0, hargaJual), 2);
  assert.equal(faktorPermintaanHarga(-5000, hargaJual), 2);

  for (let harga = 0; harga <= 40000; harga += 250) {
    const faktor = faktorPermintaanHarga(harga, hargaJual);
    assert.ok(faktor >= 0 && faktor <= 2, `faktor di luar 0..2: ${faktor}`);
  }

  const tanpaRentang = { min: 8000, mode: 10000, max: 10000 };
  for (const harga of [0, 5000, 10000, 10000.5, 999999]) {
    assert.equal(faktorPermintaanHarga(harga, tanpaRentang), 1);
  }
});

test("versi mesin sesuai kontrak", () => {
  assert.equal(VERSI_MESIN, "1.0.0");
});
