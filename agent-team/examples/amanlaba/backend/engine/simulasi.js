/**
 * Simulasi Monte Carlo utama.
 *
 * Modul murni terhadap argumennya. Hanya meta.durasiMs dan meta.dihitungPada
 * yang boleh berbeda antar pemanggilan.
 */

import { buatRng } from "./rng.js";
import { ambilTriangular, faktorPermintaanHarga } from "./distribusi.js";
import { hitungRingkasan, hitungHistogram } from "./statistik.js";
import {
  validasiSkenario,
  normalisasiOpsi,
  galatValidasi,
} from "./validasi.js";
import { hitungTitikImpas } from "./titik-impas.js";
import { analisisSensitivitas } from "./sensitivitas.js";
import { sapuanHarga } from "./sapuan-harga.js";

export const VERSI_MESIN = "1.0.0";

/**
 * Menjalankan simulasi lengkap.
 *
 * Urutan pengambilan angka acak per iterasi tetap:
 * harga, biaya tetap, biaya variabel, permintaan.
 *
 * @param {object} skenario
 * @param {object} [opsi]
 * @returns {object} data lengkap (meta, ringkasan, titikImpas, histogram, sensitivitas, harga)
 */
export function jalankanSimulasi(skenario, opsi = {}) {
  const pemeriksaan = validasiSkenario(skenario);
  if (!pemeriksaan.valid) throw galatValidasi(pemeriksaan.galat);

  const opsiNormal = normalisasiOpsi(opsi, skenario);
  const mulai = Date.now();

  const rng = buatRng(opsiNormal.seed);
  const jumlahIterasi = opsiNormal.iterasi;
  const laba = new Array(jumlahIterasi);

  for (let i = 0; i < jumlahIterasi; i += 1) {
    const harga = ambilTriangular(rng, skenario.hargaJual);
    const tetap = ambilTriangular(rng, skenario.biayaTetap);
    const variabel = ambilTriangular(rng, skenario.biayaVariabel);
    const permintaan = ambilTriangular(rng, skenario.permintaan);

    const faktor = faktorPermintaanHarga(harga, skenario.hargaJual);
    laba[i] = (harga - variabel) * permintaan * faktor - tetap;
  }

  const ringkasan = hitungRingkasan(laba);
  const histogram = hitungHistogram(laba, ringkasan.labaMin, ringkasan.labaMax);
  const titikImpas = hitungTitikImpas(skenario);
  const sensitivitas = analisisSensitivitas(skenario);
  const hasilHarga = sapuanHarga(skenario, {
    iterasi: opsiNormal.iterasi,
    seed: opsiNormal.seed,
    sapuanHarga: opsiNormal.sapuanHarga,
  });

  const selesai = Date.now();

  return {
    meta: {
      iterasi: opsiNormal.iterasi,
      seed: opsiNormal.seed,
      versiMesin: VERSI_MESIN,
      sapuanHarga: opsiNormal.sapuanHarga,
      durasiMs: selesai - mulai,
      dihitungPada: new Date().toISOString(),
    },
    ringkasan,
    titikImpas,
    histogram,
    sensitivitas,
    harga: hasilHarga,
  };
}
