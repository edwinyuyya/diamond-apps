/**
 * Statistik deskriptif dan histogram laba.
 *
 * Semua fungsi murni; nilai dikembalikan tanpa pembulatan.
 */

/**
 * Persentil dengan interpolasi linear pada array yang sudah terurut menaik.
 *
 * posisi = p * (N - 1)
 * nilai = arr[bawah] + (posisi - bawah) * (arr[atas] - arr[bawah])
 *
 * @param {number[]} nilaiTerurut
 * @param {number} p 0..1
 * @returns {number}
 */
export function persentil(nilaiTerurut, p) {
  const n = nilaiTerurut.length;
  if (n === 0) return NaN;
  if (n === 1) return nilaiTerurut[0];

  const posisi = p * (n - 1);
  const bawah = Math.floor(posisi);
  const atas = Math.ceil(posisi);
  return nilaiTerurut[bawah] + (posisi - bawah) * (nilaiTerurut[atas] - nilaiTerurut[bawah]);
}

/**
 * Menghitung ringkasan statistik dari daftar laba.
 *
 * @param {number[]} laba
 * @returns {{
 *   labaRataRata:number, labaP5:number, labaP50:number, labaP95:number,
 *   labaMin:number, labaMax:number, standarDeviasi:number,
 *   peluangRugi:number, peluangUntung:number
 * }}
 */
export function hitungRingkasan(laba) {
  const n = laba.length;
  let jumlah = 0;
  let labaMin = Infinity;
  let labaMax = -Infinity;
  let jumlahRugi = 0;

  for (let i = 0; i < n; i += 1) {
    const x = laba[i];
    jumlah += x;
    if (x < labaMin) labaMin = x;
    if (x > labaMax) labaMax = x;
    if (x < 0) jumlahRugi += 1;
  }

  const labaRataRata = n === 0 ? 0 : jumlah / n;

  let jumlahKuadrat = 0;
  for (let i = 0; i < n; i += 1) {
    const selisih = laba[i] - labaRataRata;
    jumlahKuadrat += selisih * selisih;
  }
  const standarDeviasi = n > 1 ? Math.sqrt(jumlahKuadrat / (n - 1)) : 0;

  const terurut = laba.slice().sort((a, b) => a - b);

  return {
    labaRataRata,
    labaP5: persentil(terurut, 0.05),
    labaP50: persentil(terurut, 0.5),
    labaP95: persentil(terurut, 0.95),
    labaMin: n === 0 ? 0 : labaMin,
    labaMax: n === 0 ? 0 : labaMax,
    standarDeviasi,
    peluangRugi: n === 0 ? 0 : jumlahRugi / n,
    peluangUntung: n === 0 ? 0 : (n - jumlahRugi) / n,
  };
}

/**
 * Histogram 30 bin (atau 1 bin bila seluruh laba sama).
 *
 * @param {number[]} laba
 * @param {number} [labaMin]
 * @param {number} [labaMax]
 * @returns {{
 *   jumlahBin:number, lebarBin:number, batasBawah:number, batasAtas:number,
 *   bin:Array<{mulai:number, akhir:number, jumlah:number, proporsi:number}>
 * }}
 */
export function hitungHistogram(laba, labaMin, labaMax) {
  const n = laba.length;

  let min = labaMin;
  let max = labaMax;
  if (min === undefined || max === undefined) {
    min = Infinity;
    max = -Infinity;
    for (let i = 0; i < n; i += 1) {
      if (laba[i] < min) min = laba[i];
      if (laba[i] > max) max = laba[i];
    }
    if (n === 0) {
      min = 0;
      max = 0;
    }
  }

  if (min === max) {
    const bin = [
      {
        mulai: min,
        akhir: max,
        jumlah: n,
        proporsi: n === 0 ? 0 : 1,
      },
    ];
    return {
      jumlahBin: 1,
      lebarBin: 0,
      batasBawah: min,
      batasAtas: max,
      bin,
    };
  }

  const jumlahBin = 30;
  const lebarBin = (max - min) / jumlahBin;
  const jumlah = new Array(jumlahBin).fill(0);

  for (let i = 0; i < n; i += 1) {
    let indeks = Math.floor((laba[i] - min) / lebarBin);
    if (indeks < 0) indeks = 0;
    if (indeks >= jumlahBin) indeks = jumlahBin - 1;
    jumlah[indeks] += 1;
  }

  // Batas dihitung dari rumus yang sama agar bin bersambung persis.
  const batas = new Array(jumlahBin + 1);
  for (let i = 0; i <= jumlahBin; i += 1) {
    batas[i] = min + i * lebarBin;
  }
  batas[jumlahBin] = max;

  const bin = new Array(jumlahBin);
  for (let i = 0; i < jumlahBin; i += 1) {
    bin[i] = {
      mulai: batas[i],
      akhir: batas[i + 1],
      jumlah: jumlah[i],
      proporsi: n === 0 ? 0 : jumlah[i] / n,
    };
  }

  return {
    jumlahBin,
    lebarBin,
    batasBawah: min,
    batasAtas: max,
    bin,
  };
}
