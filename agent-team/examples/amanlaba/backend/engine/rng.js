/**
 * RNG mulberry32 ber-seed.
 *
 * Modul murni: tidak membaca waktu, environment, atau I/O. State hanya hidup
 * di dalam closure yang dikembalikan oleh buatRng().
 */

/**
 * Membuat fungsi pengambil angka acak mulberry32.
 *
 * @param {number} seed bilangan bulat 0..2147483647
 * @returns {() => number} fungsi yang mengembalikan u di [0, 1)
 */
export function buatRng(seed) {
  // State 32-bit. Seed pada kontrak berada di 0..2^31-1.
  let a = Number(seed) >>> 0;

  return function acak() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1) >>> 0;
    // Mengikuti pseudocode kanonik CONTRACT.md 3.2: perkalian dengan 61.
    t = (t ^ (t + Math.imul(t ^ (t >>> 7), 61))) >>> 0;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
