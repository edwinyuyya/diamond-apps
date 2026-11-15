// Parser hasil laboratorium dari teks bebas (CONTRACT.md 7.10.1).
// Murni, deterministik, tanpa DOM, tanpa dependency jaringan.
// Modul ini hanya menyalin angka yang tertulis; tidak menandai tinggi/rendah
// dan tidak menegakkan diagnosis (itu tugas safety.js setelah data disimpan).

export const SATUAN_LAB_UMUM = [
  'mg/dL', 'g/dL', '%', 'mmol/L', 'µmol/L', 'U/L', 'IU/L',
  'ng/mL', 'pg/mL', 'x10^3/µL', 'x10^6/µL', '/µL'
];

// Kolom header tabel yang harus diabaikan.
const TOKEN_HEADER = new Set([
  'nama', 'hasil', 'satuan', 'rujukan', 'nilai', 'normal', 'ref', 'acuan',
  'unit', 'parameter', 'pemeriksaan', 'keterangan', 'flag', 'batas'
]);

// Label baris non-lab (narasi rekam medis) yang tidak boleh ditafsirkan
// sebagai hasil laboratorium saat seluruh teks dipindai.
const BARIS_NON_LAB = /^\s*(?:keluhan|anamnesis|diagnosa|diagnosis|dx|dokter|dpjp|pasien|nama\s+pasien|umur|usia|alamat|tanggal|tgl|no\.?\s*(?:rm|rekam\s*medis)|nomor\s*(?:rm|rekam\s*medis)|mrn|catatan|terapi|resep|obat|tindakan|kesimpulan|saran|rencana|kunjungan)\b/i;

// Token satuan yang secara bentuk mirip satuan tetapi sebenarnya label.
const BUKAN_SATUAN = new Set([
  'normal', 'rujukan', 'referensi', 'ref', 'acuan', 'hasil', 'nilai',
  'satuan', 'unit', 'tinggi', 'rendah', 'high', 'low', 'positif', 'negatif'
]);

const NOMOR_POLA = '(\\d+(?:[.,]\\d+)?)';
const LABEL_RUJUKAN_POLA = '(?:rujukan|referensi|nilai\\s+normal|normal|ref|acuan)';

function escapeRegex(teks) {
  return String(teks).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function bulatkan2(nilai) {
  return Math.round(nilai * 100) / 100;
}

/**
 * Ubah teks angka laboratorium menjadi number.
 * Menerima desimal titik/koma dan pemisah ribuan (`1.200` -> 1200).
 * `10^3` bukan angka. Kembalikan null bila tidak dapat ditafsirkan.
 *
 * @param {string} teks
 * @returns {number|null}
 */
export function parseAngkaLab(teks) {
  if (typeof teks === 'number') return Number.isFinite(teks) ? teks : null;
  if (typeof teks !== 'string') return null;

  let s = teks.trim().replace(/\s+/g, '');
  if (!s) return null;
  // Hanya angka dan pemisah; `^`, huruf, atau satuan menempel -> bukan angka murni.
  if (/[^0-9.,+\-]/.test(s)) return null;
  if (/^[+\-]?[.,]/.test(s) || /[.,]$/.test(s)) return null;
  if (!/\d/.test(s)) return null;

  let tanda = 1;
  if (s[0] === '+' || s[0] === '-') {
    if (s[0] === '-') tanda = -1;
    s = s.slice(1);
  }
  if (!s) return null;

  const jumlahTitik = (s.match(/\./g) || []).length;
  const jumlahKoma = (s.match(/,/g) || []).length;
  let hasil;

  if (jumlahTitik > 0 && jumlahKoma > 0) {
    // Pemisah desimal = pemisah yang muncul terakhir; lainnya pemisah ribuan.
    const titikTerakhir = s.lastIndexOf('.');
    const komaTerakhir = s.lastIndexOf(',');
    if (komaTerakhir > titikTerakhir) {
      hasil = s.replace(/\./g, '').replace(/,/g, '.');
    } else {
      hasil = s.replace(/,/g, '');
    }
  } else if (jumlahTitik > 0) {
    if (jumlahTitik > 1) {
      if (!/^\d{1,3}(?:\.\d{3})+$/.test(s)) return null;
      hasil = s.replace(/\./g, '');
    } else if (/^\d{1,3}\.\d{3}$/.test(s)) {
      // `1.200` -> 1200 (ribuan), bukan 1.2.
      hasil = s.replace('.', '');
    } else {
      hasil = s;
    }
  } else if (jumlahKoma > 0) {
    if (jumlahKoma > 1) {
      if (!/^\d{1,3}(?:,\d{3})+$/.test(s)) return null;
      hasil = s.replace(/,/g, '');
    } else {
      // Koma tunggal = desimal (konvensi Indonesia): `7,2` -> 7.2.
      hasil = s.replace(',', '.');
    }
  } else {
    hasil = s;
  }

  const angka = Number(hasil);
  return Number.isFinite(angka) ? tanda * angka : null;
}

function buatRujukan(lowTeks, highTeks, teks) {
  let low = parseAngkaLab(lowTeks);
  let high = parseAngkaLab(highTeks);
  if (low === null && high === null) return null;
  // Rentang terbalik (mis. 10-4) dirapikan agar low <= high; tidak menebak nilai.
  if (low !== null && high !== null && low > high) {
    [low, high] = [high, low];
  }
  return { low, high, teks: String(teks).trim() };
}

function buatRujukanSatuSisi(operator, angkaTeks) {
  const angka = parseAngkaLab(angkaTeks);
  if (angka === null) return null;
  const op = String(operator).trim();
  const teks = `${op}${String(angkaTeks).trim()}`;
  if (op === '<' || op === '≤') return { low: null, high: angka, teks };
  if (op === '>' || op === '≥') return { low: angka, high: null, teks };
  return null;
}

/**
 * Ambil rentang acuan dari teks.
 * Mendukung `4.0-10.0`, `Rujukan: 4.0 - 10.0`, `(4.0 - 10.0)`, `<5`, `>2`.
 *
 * @param {string} teks
 * @returns {{low:number|null, high:number|null, teks:string}|null}
 */
export function parseRujukan(teks) {
  if (typeof teks !== 'string') return null;
  const s = teks;
  if (!s.trim()) return null;
  let m;

  // Berlabel + rentang.
  m = new RegExp(
    `\\b${LABEL_RUJUKAN_POLA}\\b\\s*[:=]?\\s*\\(?\\s*${NOMOR_POLA}\\s*[-–]\\s*${NOMOR_POLA}\\s*\\)?`,
    'i'
  ).exec(s);
  if (m) return buatRujukan(m[1], m[2], `${m[1]} - ${m[2]}`);

  // Berlabel + satu sisi.
  m = new RegExp(
    `\\b${LABEL_RUJUKAN_POLA}\\b\\s*[:=]?\\s*\\(?\\s*([<>≤≥])\\s*${NOMOR_POLA}`,
    'i'
  ).exec(s);
  if (m) return buatRujukanSatuSisi(m[1], m[2]);

  // Rentang dalam tanda kurung.
  m = /\(\s*(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*\)/.exec(s);
  if (m) return buatRujukan(m[1], m[2], `${m[1]} - ${m[2]}`);

  // Rentang tanpa label di ujung baris.
  m = /(?:^|[\s;,=])(\d+(?:[.,]\d+)?)\s*[-–]\s*(\d+(?:[.,]\d+)?)\s*$/.exec(s);
  if (m) return buatRujukan(m[1], m[2], `${m[1]} - ${m[2]}`);

  // Satu sisi tanpa label.
  m = /(?:^|[\s;,=])([<>≤≥])\s*(\d+(?:[.,]\d+)?)/.exec(s);
  if (m) return buatRujukanSatuSisi(m[1], m[2]);

  return null;
}

function normalisasiNama(nama) {
  return String(nama)
    .replace(/[\s:;=,]+$/g, '')
    .replace(/^[\s:;=,]+/g, '')
    .trim();
}

function barisHeader(baris) {
  const token = String(baris)
    .toLowerCase()
    .replace(/[()[\]{}:;,\-|]+/g, ' ')
    .split(/\s+/)
    .filter(Boolean);
  if (token.length === 0) return false;
  return token.every((t) => TOKEN_HEADER.has(t));
}

function namaDitolak(nama) {
  if (!nama) return true;
  const lower = nama.toLowerCase().replace(/[.:;,\s]+$/g, '').trim();
  if (!lower) return true;
  if (TOKEN_HEADER.has(lower)) return true;
  if (BUKAN_SATUAN.has(lower)) return true;
  if (BARIS_NON_LAB.test(nama)) return true;
  // Nama yang sebenarnya hanya satuan/pangkat (mis. `10^3/µL`) bukan nama pemeriksaan.
  if (nama.includes('^')) return true;
  if (SATUAN_LAB_UMUM.some((satuan) => satuan.toLowerCase() === lower)) return true;
  return false;
}

function ambilSatuan(sisa) {
  const teks = String(sisa).replace(/^\s+/, '');
  if (!teks) return '';
  if (/^[<>≤≥]/.test(teks) || /^[-–(]/.test(teks) || /^\d/.test(teks)) return '';

  // Satuan dari daftar umum diutamakan (termasuk `/µL` yang diawali garis miring).
  for (const satuan of SATUAN_LAB_UMUM) {
    const pola = new RegExp(`^${escapeRegex(satuan)}(?=$|[\\s(])`, 'i');
    const m = pola.exec(teks);
    if (m) return m[0];
  }

  const m = /^([a-zA-Zµ%][a-zA-Z0-9µ%/^.]{0,15})(?=\s|$|\()/.exec(teks);
  if (!m) return '';
  if (BUKAN_SATUAN.has(m[1].toLowerCase())) return '';
  return m[1];
}

// Cari angka nilai pertama. Tolak angka yang merupakan bagian pangkat (`10^3`),
// tanggal (`01/11`), atau rentang (`4.0 - 5.6`).
const POLA_NILAI = /(^|[\s:;=])([-+]?\d+(?:[.,]\d+)?)(?![\d^/\-])(?!\s*[-–]\s*\d)/g;

/**
 * Parse satu baris hasil laboratorium.
 * Minimal nama + angka. Baris tanpa angka / tanpa nama -> null.
 *
 * @param {string} baris
 * @returns {object|null} HasilLab
 */
export function parseBarisLab(baris) {
  if (typeof baris !== 'string') return null;
  const barisAsli = baris.trim();
  if (!barisAsli) return null;
  if (!/\d/.test(barisAsli)) return null;
  if (barisHeader(barisAsli)) return null;

  const token = barisAsli.split(/\s+/).filter(Boolean);
  if (token.length < 2) return null;

  POLA_NILAI.lastIndex = 0;
  const m = POLA_NILAI.exec(barisAsli);
  if (!m) return null;

  const nama = normalisasiNama(barisAsli.slice(0, m.index));
  if (namaDitolak(nama)) return null;

  const nilaiTeks = m[2];
  const nilai = parseAngkaLab(nilaiTeks);
  if (nilai === null) return null;

  const akhirNilai = m.index + m[1].length + nilaiTeks.length;
  const sisa = barisAsli.slice(akhirNilai);
  const satuan = ambilSatuan(sisa);
  const rujukan = parseRujukan(sisa);

  let kepercayaan;
  if (satuan) kepercayaan = 0.9;
  else if (rujukan) kepercayaan = 0.7;
  else kepercayaan = 0.8;

  const bagianTidakDipahami = [];
  kepercayaan -= 0.1 * bagianTidakDipahami.length;
  kepercayaan = bulatkan2(Math.min(1, Math.max(0, kepercayaan)));

  const hasil = {
    nama,
    nilai,
    nilaiTeks,
    satuan,
    rujukan,
    barisAsli,
    kepercayaan,
    bagianTidakDipahami
  };

  // Alias datar untuk pemanggil yang memakai nama field versi ringkas.
  // Non-enumerable agar bentuk objek tetap persis CONTRACT.md 7.10.1.
  Object.defineProperties(hasil, {
    rujukanBawah: { value: rujukan ? rujukan.low : null, enumerable: false },
    rujukanAtas: { value: rujukan ? rujukan.high : null, enumerable: false },
    rujukanTeks: { value: rujukan ? rujukan.teks : '', enumerable: false }
  });

  return hasil;
}

/**
 * Parse seluruh teks hasil laboratorium, satu hasil per baris.
 * Header tabel dan baris non-lab diabaikan.
 *
 * @param {string} teks
 * @returns {object[]} HasilLab[]
 */
export function parseHasilLab(teks) {
  if (typeof teks !== 'string') return [];
  const hasil = [];

  for (const baris of teks.replace(/\r\n?/g, '\n').split('\n')) {
    const bersih = baris.trim();
    if (!bersih) continue;
    if (!/\d/.test(bersih)) continue;
    if (bersih.split(/\s+/).filter(Boolean).length < 2) continue;
    if (barisHeader(bersih)) continue;
    if (BARIS_NON_LAB.test(bersih)) continue;

    const item = parseBarisLab(bersih);
    if (item) hasil.push(item);
  }

  return hasil;
}
