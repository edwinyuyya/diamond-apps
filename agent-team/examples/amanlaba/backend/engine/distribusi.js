/**
 * Distribusi triangular dan faktor respons permintaan terhadap harga.
 *
 * Semua fungsi murni dan deterministik.
 */

/**
 * Mengambil satu sampel triangular. Selalu mengonsumsi tepat satu angka acak,
 * termasuk ketika min === max.
 *
 * @param {() => number} rng
 * @param {{min:number, mode:number, max:number}} distribusi
 * @returns {number}
 */
export function ambilTriangular(rng, distribusi) {
  const u = rng();
  return kuantilTriangular(u, distribusi);
}

/**
 * Kuantil / invers CDF distribusi triangular.
 *
 * @param {number} p probabilitas 0..1
 * @param {{min:number, mode:number, max:number}} distribusi
 * @returns {number}
 */
export function kuantilTriangular(p, distribusi) {
  const { min, mode, max } = distribusi;

  if (max === min) return min;

  const F = (mode - min) / (max - min);

  if (p < F) {
    return min + Math.sqrt(p * (max - min) * (mode - min));
  }
  return max - Math.sqrt((1 - p) * (max - min) * (max - mode));
}

/**
 * Faktor respons permintaan linear terhadap harga.
 *
 * Permintaan pada skenario adalah permintaan pada hargaJual.mode.
 * - 1 pada harga mode
 * - 0,5 pada harga maksimum
 * - 0 pada harga choke (2 * max - mode)
 * - selalu 1 bila max === mode
 *
 * @param {number} harga harga yang diuji
 * @param {{min:number, mode:number, max:number}} hargaJual
 * @returns {number} faktor pada rentang 0..2
 */
export function faktorPermintaanHarga(harga, hargaJual) {
  const { mode, max } = hargaJual;

  if (max === mode) return 1;

  const choke = 2 * max - mode;
  const faktor = (choke - harga) / (2 * (max - mode));

  if (faktor < 0) return 0;
  if (faktor > 2) return 2;
  return faktor;
}
