/**
 * Parser frekuensi/aturan makan dan penyusun jadwal resep
 * (murni, tanpa DOM/dependency).
 *
 * Mengikuti CONTRACT.md 7.9.2. Tidak ada dosis yang disimpulkan: pola yang
 * tidak tertulis dikembalikan `null`.
 */

import { addDays, isValidTime, minutesToTime, timeToMinutes, todayISO } from './dates.js';
import {
  normalizeAngka,
  parseBentukSediaan,
  parseRoman,
  satuanDariTokenBentuk
} from './resepSediaan.js';

/** Jadwal bawaan untuk 1–4 kali sehari (CONTRACT.md 7.9.2). */
export const JADWAL_BAWAAN = {
  1: ['07:00'],
  2: ['07:00', '19:00'],
  3: ['07:00', '13:00', '19:00'],
  4: ['07:00', '12:00', '17:00', '21:00']
};

/** Urutan label waktu minum. */
export const WAKTU_LABEL_ORDER = ['pagi', 'siang', 'malam', 'sebelum-tidur'];

/** Jam per posisi pada pola harian `pagi-siang-malam`. */
export const JAM_POLA_HARIAN = ['07:00', '13:00', '19:00'];

/** Jam representatif untuk masing-masing label waktu. */
const JAM_LABEL_WAKTU = {
  pagi: '07:00',
  siang: '13:00',
  malam: '19:00',
  'sebelum-tidur': '21:00'
};

/** Angka pecahan unicode yang mungkin muncul pada takaran. */
const KELAS_ANGKA_TAKARAN = '0-9½¼¾⅓⅔⅕⅖⅗⅘⅙⅚⅛⅜⅝⅞.,';

/** Bulatkan menit ke kelipatan 5 terdekat, lalu jepit ke 0..1439. */
function bulatkanLima(menit) {
  const dibulatkan = Math.round(menit / 5) * 5;
  return Math.min(1439, Math.max(0, dibulatkan));
}

/**
 * Jadwal jam bawaan untuk `kaliSehari`.
 *
 * `1`–`4` memakai tabel kontrak. `n > 4` membagi rentang `mulai`–`selesai`
 * menjadi `n` titik (inklusif), dibulatkan ke 5 menit terdekat, unik dan urut.
 * Nilai tidak valid (null, 0, negatif, bukan integer, 0.5) -> `[]`.
 *
 * @param {number} kaliSehari
 * @param {{mulai?:string, selesai?:string}} [options]
 * @returns {string[]} jam `HH:mm`
 */
export function jadwalBawaan(kaliSehari, { mulai = '07:00', selesai = '21:00' } = {}) {
  if (typeof kaliSehari !== 'number' || !Number.isInteger(kaliSehari) || kaliSehari <= 0) {
    return [];
  }
  if (kaliSehari <= 4) return [...JADWAL_BAWAAN[kaliSehari]];

  let awal = isValidTime(mulai) ? timeToMinutes(mulai) : timeToMinutes('07:00');
  let akhir = isValidTime(selesai) ? timeToMinutes(selesai) : timeToMinutes('21:00');
  if (awal > akhir) [awal, akhir] = [akhir, awal];
  if (awal === akhir) {
    awal = timeToMinutes('07:00');
    akhir = timeToMinutes('21:00');
  }

  const langkah = (akhir - awal) / (kaliSehari - 1);
  const unik = new Set();
  for (let i = 0; i < kaliSehari; i += 1) {
    unik.add(bulatkanLima(awal + langkah * i));
  }
  return [...unik]
    .sort((a, b) => a - b)
    .map((menit) => minutesToTime(menit));
}

/**
 * Label waktu minum dari daftar jam.
 * 05:00–10:59 pagi, 11:00–14:59 siang, 15:00–20:59 malam, 21:00–04:59 sebelum tidur.
 *
 * @param {string[]} times jam `HH:mm`
 * @returns {Array<'pagi'|'siang'|'malam'|'sebelum-tidur'>}
 */
export function waktuMinumDariJam(times) {
  const ditemukan = new Set();
  const daftar = Array.isArray(times) ? times : [];
  for (const waktu of daftar) {
    const menit = timeToMinutes(waktu);
    if (menit === null) continue;
    let label;
    if (menit < 300 || menit >= 1260) label = 'sebelum-tidur';
    else if (menit < 660) label = 'pagi';
    else if (menit < 900) label = 'siang';
    else label = 'malam';
    ditemukan.add(label);
  }
  return WAKTU_LABEL_ORDER.filter((label) => ditemukan.has(label));
}

/**
 * Teks frekuensi tanpa token huruf di ujung yang ternyata bukan bentuk
 * (mis. `3x1 pc` -> `3x1`).
 */
function teksFrekuensi(cocok, token) {
  const mentah = cocok[0].trim();
  if (!token) return mentah;
  if (satuanDariTokenBentuk(token)) return mentah;
  return mentah.slice(0, mentah.length - token.length).trim();
}

/** Susun satu objek hasil `parseFrekuensi`; `catatan` hanya ada bila perlu. */
function hasilFrekuensi({
  kaliSehari,
  takaranPerDosis,
  satuanTakaran,
  polaHarian = null,
  teksAsli,
  catatan = []
}) {
  const hasil = {
    kaliSehari,
    takaranPerDosis,
    satuanTakaran,
    polaHarian,
    teksAsli
  };
  // Catatan bersifat tambahan: non-enumerable agar bentuk objek tetap persis
  // lima bidang kontrak, tetapi pemanggil (resep.js) tetap dapat membacanya.
  if (catatan.length > 0) {
    Object.defineProperty(hasil, 'catatan', {
      value: [...catatan],
      enumerable: false,
      configurable: true
    });
  }
  return hasil;
}

// Urutan prioritas mengikuti CONTRACT.md 7.9.2.
const POLA_HARIAN = /\b(\d{1,3})\s*-\s*(\d{1,3})\s*-\s*(\d{1,3})\b/;
const POLA_S_DD_C = /\bs\s*\.?\s*(\d+)\s*\.?\s*d\.?\s*d\.?\s*([a-z]+)?\s*\.?\s*([ivxlcdm]+|\d+)\b(?!\s*\d*\s*\/\s*\d)(?![½¼¾⅓⅔])/i;
const POLA_S_DD_BENTUK = /\bs\s*\.?\s*(\d+)\s*dd\s*([a-z]+)\s*([ivxlcdm]+|\d+)\b(?!\s*\d*\s*\/\s*\d)(?![½¼¾⅓⅔])/i;
const POLA_KALI_TAKARAN = new RegExp(
  `\\b(\\d+)\\s*x\\s*(\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|[${KELAS_ANGKA_TAKARAN}]+)\\s*([a-z]+)?(?![a-z])`,
  'i'
);
const POLA_DD_TAKARAN = new RegExp(
  `\\b(\\d+)\\s*dd\\s*(\\d+\\s+\\d+\\s*/\\s*\\d+|\\d+\\s*/\\s*\\d+|[${KELAS_ANGKA_TAKARAN}]+)?\\s*([a-z]+)?(?![a-z])`,
  'i'
);
const POLA_KALI_SEHARI = /\b(\d+)\s*kali\s*sehari\b/i;

/**
 * Urai frekuensi minum dari teks resep.
 *
 * Urutan prioritas: pola harian `1-0-1`, `S.2.d.d.C.I`, `S 3 dd tab I`,
 * `3 x 1 tab`, `3 dd 1`, `3 kali sehari`. Bila tidak ada pola -> `null`.
 *
 * @param {string} teks
 * @returns {{kaliSehari:number, takaranPerDosis:number, satuanTakaran:string|null,
 *   polaHarian:number[]|null, teksAsli:string, catatan?:string[]}|null}
 */
export function parseFrekuensi(teks) {
  if (typeof teks !== 'string' || teks.trim() === '') return null;

  // 1. Pola harian pagi-siang-malam.
  const harian = POLA_HARIAN.exec(teks);
  if (harian) {
    const nilai = [Number(harian[1]), Number(harian[2]), Number(harian[3])];
    const masukAkal = nilai.every((n) => n <= 50) && nilai.some((n) => n > 0);
    if (masukAkal) {
      const bentuk = parseBentukSediaan(teks);
      const unik = [...new Set(nilai.filter((n) => n > 0))];
      const catatan = unik.length > 1
        ? [`pola dosis tidak seragam: ${nilai.join('-')}`]
        : [];
      return hasilFrekuensi({
        kaliSehari: nilai.filter((n) => n > 0).length,
        takaranPerDosis: Math.max(...nilai),
        satuanTakaran: bentuk ? bentuk.satuan : 'tablet',
        polaHarian: nilai,
        teksAsli: harian[0].trim(),
        catatan
      });
    }
  }

  // 2. Bentuk ringkas `S.2.d.d.C.I`.
  const sddc = POLA_S_DD_C.exec(teks);
  if (sddc) {
    const kaliSehari = Number(sddc[1]);
    const takaran = parseRoman(sddc[3]);
    if (kaliSehari > 0 && takaran !== null) {
      const bentuk = parseBentukSediaan(teks);
      const satuan = satuanDariTokenBentuk(sddc[2]) || (bentuk ? bentuk.satuan : null);
      return hasilFrekuensi({
        kaliSehari,
        takaranPerDosis: takaran,
        satuanTakaran: satuan,
        teksAsli: sddc[0].trim()
      });
    }
  }

  // 3. `S 3 dd tab I`.
  const sdd = POLA_S_DD_BENTUK.exec(teks);
  if (sdd) {
    const kaliSehari = Number(sdd[1]);
    const takaran = parseRoman(sdd[3]);
    if (kaliSehari > 0 && takaran !== null) {
      const bentuk = parseBentukSediaan(teks);
      return hasilFrekuensi({
        kaliSehari,
        takaranPerDosis: takaran,
        satuanTakaran: satuanDariTokenBentuk(sdd[2]) || (bentuk ? bentuk.satuan : null),
        teksAsli: sdd[0].trim()
      });
    }
  }

  // 4./5. `3 x 1 tab` dan `3x1` (spasi opsional).
  const kaliTakaran = POLA_KALI_TAKARAN.exec(teks);
  if (kaliTakaran) {
    const kaliSehari = Number(kaliTakaran[1]);
    const takaran = normalizeAngka(kaliTakaran[2]);
    const token = (kaliTakaran[3] || '').toLowerCase();
    if (token !== 'hari' && token !== 'minggu' && kaliSehari > 0 && takaran !== null) {
      const bentuk = parseBentukSediaan(teks);
      return hasilFrekuensi({
        kaliSehari,
        takaranPerDosis: takaran,
        satuanTakaran: satuanDariTokenBentuk(token) || (bentuk ? bentuk.satuan : null),
        teksAsli: teksFrekuensi(kaliTakaran, token)
      });
    }
  }

  // 6./7. `3 dd 1` / `3 dd` (takaran default 1, dengan catatan).
  const dd = POLA_DD_TAKARAN.exec(teks);
  if (dd) {
    const kaliSehari = Number(dd[1]);
    const adaTakaran = typeof dd[2] === 'string' && dd[2] !== '';
    const takaran = adaTakaran ? normalizeAngka(dd[2]) : 1;
    if (kaliSehari > 0 && takaran !== null) {
      const token = (dd[3] || '').toLowerCase();
      const bentuk = parseBentukSediaan(teks);
      return hasilFrekuensi({
        kaliSehari,
        takaranPerDosis: takaran,
        satuanTakaran: satuanDariTokenBentuk(token) || (bentuk ? bentuk.satuan : null),
        teksAsli: teksFrekuensi(dd, token),
        catatan: adaTakaran ? [] : ['takaran tidak tertulis; default 1']
      });
    }
  }

  // 8. `3 kali sehari`.
  const kaliSehariSaja = POLA_KALI_SEHARI.exec(teks);
  if (kaliSehariSaja) {
    const kaliSehari = Number(kaliSehariSaja[1]);
    if (kaliSehari > 0) {
      return hasilFrekuensi({
        kaliSehari,
        takaranPerDosis: 1,
        satuanTakaran: null,
        teksAsli: kaliSehariSaja[0].trim()
      });
    }
  }

  return null;
}

/**
 * Aturan makan / waktu minum yang tertulis.
 *
 * Bila ada beberapa aturan makan berbeda, yang paling awal di teks dipakai.
 * Label waktu (pagi/siang/malam/sebelum tidur) digabung dan diurutkan.
 *
 * @param {string} teks
 * @returns {{aturanMakan:'sebelum'|'sesudah'|'saat'|'bila-perlu'|null,
 *   waktuMinum:string[], catatan?:string[]}}
 */
export function parseAturanMakan(teks) {
  const hasil = { aturanMakan: null, waktuMinum: [] };
  if (typeof teks !== 'string' || teks === '') return hasil;

  const aturan = [
    {
      kunci: 'sesudah',
      aturanMakan: 'sesudah',
      waktu: [],
      pola: /\b(?:p\.?\s*c\.?|sesudah\s+makan|setelah\s+makan)(?![a-z]|\.\s*[a-z])/i
    },
    {
      kunci: 'sebelum',
      aturanMakan: 'sebelum',
      waktu: [],
      pola: /\b(?:a\.?\s*c\.?|sebelum\s+makan)(?![a-z]|\.\s*[a-z])/i
    },
    {
      kunci: 'saat',
      aturanMakan: 'saat',
      waktu: [],
      pola: /\b(?:d\.?\s*c\.?|saat\s+makan|bersama\s+makan)(?![a-z]|\.\s*[a-z])/i
    },
    {
      kunci: 'bila-perlu',
      aturanMakan: 'bila-perlu',
      waktu: [],
      pola: /\b(?:prn|k\.?\s*p\.?|bila\s+perlu)(?![a-z]|\.\s*[a-z])/i
    },
    {
      kunci: 'sebelum-tidur',
      aturanMakan: null,
      waktu: ['sebelum-tidur'],
      pola: /\b(?:h\.?\s*s\.?|sebelum\s+tidur)(?![a-z]|\.\s*[a-z])/i
    },
    {
      kunci: 'pagi',
      aturanMakan: null,
      waktu: ['pagi'],
      pola: /\b(?:mane|pagi)(?![a-z]|\.\s*[a-z])/i
    },
    {
      kunci: 'malam',
      aturanMakan: null,
      waktu: ['malam'],
      pola: /\b(?:nocte|malam)(?![a-z]|\.\s*[a-z])/i
    }
  ];

  const ditemukan = [];
  for (let i = 0; i < aturan.length; i += 1) {
    const cocok = aturan[i].pola.exec(teks);
    if (cocok) ditemukan.push({ ...aturan[i], indeks: cocok.index, urutan: i });
  }
  if (ditemukan.length === 0) return hasil;

  ditemukan.sort((a, b) => a.indeks - b.indeks || a.urutan - b.urutan);

  const waktu = new Set();
  const catatan = [];
  for (const item of ditemukan) {
    if (item.aturanMakan) {
      if (hasil.aturanMakan === null) {
        hasil.aturanMakan = item.aturanMakan;
      } else if (hasil.aturanMakan !== item.aturanMakan) {
        catatan.push(`aturan makan ganda: ${hasil.aturanMakan} + ${item.aturanMakan}`);
      }
    }
    for (const label of item.waktu) waktu.add(label);
  }
  hasil.waktuMinum = WAKTU_LABEL_ORDER.filter((label) => waktu.has(label));
  if (catatan.length > 0) {
    Object.defineProperty(hasil, 'catatan', {
      value: [...catatan],
      enumerable: false,
      configurable: true
    });
  }
  return hasil;
}

/**
 * Jam untuk pola harian `[pagi, siang, malam]`; elemen 0 dilewati.
 *
 * @param {number[]} pola
 * @param {{jam?:string[]}} [options]
 * @returns {string[]} jam `HH:mm` urut menaik
 */
export function polaHarian(pola, { jam = JAM_POLA_HARIAN } = {}) {
  if (!Array.isArray(pola)) return [];
  const slot = Array.isArray(jam) && jam.length > 0 ? jam : JAM_POLA_HARIAN;
  const hasil = [];
  for (let i = 0; i < pola.length; i += 1) {
    const nilai = Number(pola[i]);
    if (!Number.isFinite(nilai) || nilai <= 0) continue;
    const waktu = slot[i] || slot[slot.length - 1];
    if (isValidTime(waktu) && !hasil.includes(waktu)) hasil.push(waktu);
  }
  return hasil.sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
}

/**
 * Jadwal jam untuk satu `ObatTerjemahan`.
 * Bila perlu -> `[]`; pola harian dipakai lebih dulu, lalu `kaliSehari`.
 *
 * @param {object} obat
 * @returns {string[]} jam `HH:mm`
 */
export function jadwalUntukObat(obat) {
  if (!obat || typeof obat !== 'object') return [];
  if (obat.aturanMakan === 'bila-perlu') return [];

  if (Array.isArray(obat.polaHarian) && obat.polaHarian.some((n) => Number(n) > 0)) {
    const dariPola = polaHarian(obat.polaHarian);
    if (dariPola.length > 0) return dariPola;
  }

  if (typeof obat.kaliSehari === 'number'
    && Number.isInteger(obat.kaliSehari)
    && obat.kaliSehari > 0) {
    return jadwalBawaan(obat.kaliSehari);
  }

  if (Array.isArray(obat.waktuMinum) && obat.waktuMinum.length > 0) {
    const dariLabel = new Set();
    for (const label of obat.waktuMinum) {
      if (JAM_LABEL_WAKTU[label]) dariLabel.add(JAM_LABEL_WAKTU[label]);
    }
    return [...dariLabel].sort((a, b) => timeToMinutes(a) - timeToMinutes(b));
  }

  return [];
}

/**
 * Ubah `ObatTerjemahan` menjadi draf Medication (belum disimpan).
 * Bentuk persis CONTRACT.md 7.8.2.
 *
 * @param {object} obat
 * @param {{profileId?:string|null, today?:string|null, source?:object|null, now?:Date}} [options]
 * @returns {object}
 */
export function obatKeMedication(obat, {
  profileId = null,
  today = null,
  source = null,
  now = new Date()
} = {}) {
  void profileId; // disimpan oleh state.upsert; draf kontrak tidak memuatnya
  const o = obat && typeof obat === 'object' ? obat : {};

  const startDate = typeof today === 'string' && today !== '' ? today : todayISO(now);
  const durasi = Number.isInteger(o.durasiHari) && o.durasiHari > 0 ? o.durasiHari : null;

  const jadwal = Array.isArray(o.jadwalJam)
    ? o.jadwalJam.filter((waktu) => isValidTime(waktu))
    : jadwalUntukObat(o);
  const times = o.aturanMakan === 'bila-perlu' && !o.polaHarian ? [] : jadwal;

  return {
    name: o.nama || '',
    activeIngredient: '',
    dose: o.kekuatan ? String(o.kekuatan.nilai) : '',
    doseUnit: o.kekuatan ? o.kekuatan.satuan || '' : '',
    instructions: o.teksTerjemahan || '',
    times,
    daysOfWeek: [0, 1, 2, 3, 4, 5, 6],
    startDate,
    endDate: durasi ? addDays(startDate, durasi - 1) : null,
    stock: {
      remaining: o.jumlahTotal ? (o.jumlahTotal.jumlah ?? null) : null,
      unit: (o.bentukSediaan && o.bentukSediaan.satuan) || 'tablet',
      unitsPerDose: o.takaranPerDosis ?? 1
    },
    refillReminderDays: 3,
    active: true,
    notes: `Diterjemahkan dari resep: ${o.teksAsli || ''}`,
    source: source || null
  };
}
