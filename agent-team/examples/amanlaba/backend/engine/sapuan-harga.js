/**
 * Sapuan harga otomatis: 21 titik x 1500 iterasi dengan seed turunan.
 *
 * Modul murni.
 */

import { buatRng } from "./rng.js";
import { ambilTriangular, faktorPermintaanHarga } from "./distribusi.js";
import { persentil } from "./statistik.js";
import { normalisasiOpsi } from "./validasi.js";

export const ITERASI_PER_TITIK = 1500;

function lebihBaikTerbaik(kandidat, terpilih) {
  if (kandidat.labaRataRata !== terpilih.labaRataRata) {
    return kandidat.labaRataRata > terpilih.labaRataRata;
  }
  if (kandidat.peluangRugi !== terpilih.peluangRugi) {
    return kandidat.peluangRugi < terpilih.peluangRugi;
  }
  return kandidat.harga < terpilih.harga;
}

function lebihBaikTeraman(kandidat, terpilih) {
  if (kandidat.peluangRugi !== terpilih.peluangRugi) {
    return kandidat.peluangRugi < terpilih.peluangRugi;
  }
  if (kandidat.labaRataRata !== terpilih.labaRataRata) {
    return kandidat.labaRataRata > terpilih.labaRataRata;
  }
  return kandidat.harga < terpilih.harga;
}

/**
 * Menjalankan sapuan harga.
 *
 * @param {object} skenario
 * @param {object} [opsi] { iterasi, seed, sapuanHarga }
 * @returns {{
 *   sapuan: Array<{harga:number, labaRataRata:number, labaP5:number, labaP50:number, peluangRugi:number}>,
 *   terbaik: object, teraman: object
 * }}
 */
export function sapuanHarga(skenario, opsi = {}) {
  const { seed, sapuanHarga: rentang } = normalisasiOpsi(opsi, skenario);
  const { min, max, langkah } = rentang;

  const titik = new Array(langkah);

  for (let k = 0; k < langkah; k += 1) {
    const harga =
      langkah === 1 ? min : Math.round(min + ((max - min) * k) / (langkah - 1));

    // Seed turunan per titik; RNG simulasi utama tidak dipakai ulang.
    const seedTitik = (seed + 104729 * k) >>> 0;
    const rng = buatRng(seedTitik);
    const faktor = faktorPermintaanHarga(harga, skenario.hargaJual);

    const laba = new Array(ITERASI_PER_TITIK);
    let jumlah = 0;
    let jumlahRugi = 0;

    for (let i = 0; i < ITERASI_PER_TITIK; i += 1) {
      const tetap = ambilTriangular(rng, skenario.biayaTetap);
      const variabel = ambilTriangular(rng, skenario.biayaVariabel);
      const permintaan = ambilTriangular(rng, skenario.permintaan);

      const nilai = (harga - variabel) * permintaan * faktor - tetap;
      laba[i] = nilai;
      jumlah += nilai;
      if (nilai < 0) jumlahRugi += 1;
    }

    const terurut = laba.slice().sort((a, b) => a - b);

    titik[k] = {
      harga,
      labaRataRata: jumlah / ITERASI_PER_TITIK,
      labaP5: persentil(terurut, 0.05),
      labaP50: persentil(terurut, 0.5),
      peluangRugi: jumlahRugi / ITERASI_PER_TITIK,
    };
  }

  let terbaik = titik[0];
  let teraman = titik[0];
  for (let k = 1; k < titik.length; k += 1) {
    if (lebihBaikTerbaik(titik[k], terbaik)) terbaik = titik[k];
    if (lebihBaikTeraman(titik[k], teraman)) teraman = titik[k];
  }

  return {
    sapuan: titik,
    terbaik: {
      ...terbaik,
      alasan: `Laba rata-rata tertinggi dari ${langkah} titik sapuan.`,
    },
    teraman: {
      ...teraman,
      alasan: `Peluang rugi terendah dari ${langkah} titik sapuan.`,
    },
  };
}
