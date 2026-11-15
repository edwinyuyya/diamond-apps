/**
 * Model Pemeriksaan Pendamping (CONTRACT.md 4.4 & 8B.9).
 *
 * Murni: bebas DOM, tanpa efek samping, deterministik. Objek item tidak pernah
 * dimutasi; setiap fungsi mengembalikan salinan baru.
 *
 * Status hanya boleh naik menjadi 'sudah' lewat `tandaiSudahDiperiksa` dengan
 * nama pemeriksa, waktu valid, dan pernyataan yang persis sama dengan
 * `PERNYATAAN_PEMERIKSAAN`. Tidak ada jalur suara/OCR yang menaikkan status.
 */

import { formatDateTimeID } from './dates.js';

/** Status pemeriksaan yang dikenal. */
export const PEMERIKSAAN_STATUS = ['belum', 'sudah'];

/** Pernyataan wajib, persis, saat menandai 'sudah'. */
export const PERNYATAAN_PEMERIKSAAN =
  'Saya, pendamping/apoteker yang disebutkan, sudah memeriksa obat ini terhadap resep asli dan menyatakan data ini benar.';

/** Label tampil/dibacakan untuk obat yang belum diperiksa. */
export const LABEL_BELUM_DIPERIKSA = 'Belum diperiksa pendamping/apoteker';

const SUMBER = ['belum-diperiksa', 'pendamping', 'apoteker'];
const KODE_TIDAK_VALID = 'PEMERIKSAAN_TIDAK_VALID';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function salinItem(item) {
  return isObject(item) ? { ...item } : {};
}

function kesalahanTidakValid(pesan) {
  const error = new Error(pesan || 'Pemeriksaan tidak valid.');
  error.name = 'PemeriksaanError';
  error.code = KODE_TIDAK_VALID;
  return error;
}

/**
 * Ubah Date/string menjadi ISO UTC yang valid, atau null bila tidak valid.
 * Menerima Date valid (nilai default) dan string yang dapat di-parse.
 */
function keIsoWaktu(nilai) {
  if (nilai instanceof Date) {
    return Number.isFinite(nilai.getTime()) ? nilai.toISOString() : null;
  }
  if (typeof nilai === 'string' && nilai.trim() !== '') {
    const ms = Date.parse(nilai);
    return Number.isFinite(ms) ? new Date(ms).toISOString() : null;
  }
  return null;
}

function sumberValid(nilai, bawaan = 'belum-diperiksa') {
  return SUMBER.includes(nilai) ? nilai : bawaan;
}

function namaItem(item) {
  const nama = isObject(item) && typeof item.name === 'string' ? item.name.trim() : '';
  return nama || 'obat ini';
}

function waktuTampil(iso) {
  const teks = formatDateTimeID(new Date(iso));
  return teks || iso;
}

function teksStatus(nama, pemeriksaan) {
  if (pemeriksaan.status === 'sudah') {
    return `Status obat ${nama}: sudah diperiksa oleh ${pemeriksaan.oleh} pada ${waktuTampil(pemeriksaan.waktu)}.`;
  }
  return `Status obat ${nama}: belum diperiksa pendamping atau apoteker.`;
}

/**
 * Objek pemeriksaan default: belum, tanpa pemeriksa.
 * @returns {{status:'belum', oleh:string, waktu:null, pernyataan:null, sumber:'belum-diperiksa'}}
 */
export function defaultPemeriksaan() {
  return {
    status: 'belum',
    oleh: '',
    waktu: null,
    pernyataan: null,
    sumber: 'belum-diperiksa'
  };
}

/**
 * Normalisasi data pemeriksaan, termasuk data lama yang tidak lengkap.
 *
 * Status selain 'sudah' menjadi 'belum'. Status 'sudah' hanya dipertahankan
 * bila `oleh` terisi, `waktu` ISO valid, dan `pernyataan` persis sama dengan
 * `PERNYATAAN_PEMERIKSAAN`. Status tidak pernah dinaikkan.
 *
 * @param {unknown} nilai
 * @returns {{status:'belum'|'sudah', oleh:string, waktu:string|null, pernyataan:string|null, sumber:string}}
 */
export function normalisasiPemeriksaan(nilai) {
  const data = isObject(nilai) ? nilai : {};

  if (data.status === 'sudah') {
    const oleh = typeof data.oleh === 'string' ? data.oleh.trim() : '';
    const waktu = keIsoWaktu(data.waktu);
    const pernyataanValid = data.pernyataan === PERNYATAAN_PEMERIKSAAN;
    if (oleh && waktu && pernyataanValid) {
      return {
        ...defaultPemeriksaan(),
        ...data,
        status: 'sudah',
        oleh,
        waktu,
        pernyataan: PERNYATAAN_PEMERIKSAAN,
        sumber: sumberValid(data.sumber, 'pendamping')
      };
    }
    // Status 'sudah' tidak lengkap tidak boleh dipertahankan.
    return defaultPemeriksaan();
  }

  // 'belum' atau nilai asing: pertahankan hanya sumber yang dikenal, dan
  // kosongkan jejak pemeriksa agar tidak tampil sebagai sudah diperiksa.
  return {
    ...defaultPemeriksaan(),
    ...data,
    status: 'belum',
    oleh: '',
    waktu: null,
    pernyataan: null,
    sumber: sumberValid(data.sumber, 'belum-diperiksa')
  };
}

/**
 * Salinan item dengan field `pemeriksaanOrangLain` yang selalu lengkap.
 * Item lama tanpa field ini dianggap 'belum'.
 */
export function pastikanPemeriksaan(item) {
  return {
    ...salinItem(item),
    pemeriksaanOrangLain: normalisasiPemeriksaan(
      isObject(item) ? item.pemeriksaanOrangLain : undefined
    )
  };
}

/**
 * Turunkan status menjadi 'belum' dan kosongkan data pemeriksa.
 * `waktu` diterima untuk kompatibilitas pemanggil, tetapi tidak disimpan
 * karena status belum tidak memiliki waktu pemeriksaan.
 */
export function tandaiBelumDiperiksa(item, { sumber = 'belum-diperiksa' } = {}) {
  return {
    ...salinItem(item),
    pemeriksaanOrangLain: {
      ...defaultPemeriksaan(),
      status: 'belum',
      oleh: '',
      waktu: null,
      pernyataan: null,
      sumber: sumberValid(sumber, 'belum-diperiksa')
    }
  };
}

/**
 * Naikkan status menjadi 'sudah'. Satu-satunya jalur transisi ke 'sudah'.
 *
 * @param {object} item Medication
 * @param {{oleh:string, waktu?:Date|string, pernyataan:string, sumber?:string}} opsi
 * @throws {Error} code `PEMERIKSAAN_TIDAK_VALID` bila data tidak sah.
 */
export function tandaiSudahDiperiksa(item, { oleh, waktu = new Date(), pernyataan, sumber } = {}) {
  if (!isObject(item)) {
    throw kesalahanTidakValid('Obat tidak valid.');
  }

  const nama = typeof oleh === 'string' ? oleh.trim() : '';
  if (!nama) {
    throw kesalahanTidakValid('Nama pendamping atau apoteker wajib diisi.');
  }

  const waktuIso = keIsoWaktu(waktu);
  if (!waktuIso) {
    throw kesalahanTidakValid('Waktu pemeriksaan tidak valid.');
  }

  if (pernyataan !== PERNYATAAN_PEMERIKSAAN) {
    throw kesalahanTidakValid('Pernyataan pemeriksaan tidak sesuai.');
  }

  return {
    ...item,
    pemeriksaanOrangLain: {
      ...defaultPemeriksaan(),
      ...(isObject(item.pemeriksaanOrangLain) ? item.pemeriksaanOrangLain : {}),
      status: 'sudah',
      oleh: nama,
      waktu: waktuIso,
      pernyataan: PERNYATAAN_PEMERIKSAAN,
      sumber: sumberValid(sumber, 'pendamping')
    }
  };
}

/**
 * Apakah obat masih menunggu pemeriksaan pendamping/apoteker?
 * Item tanpa field pemeriksaan dianggap menunggu.
 */
export function butuhPemeriksaan(item) {
  if (!isObject(item)) return false;
  return normalisasiPemeriksaan(item.pemeriksaanOrangLain).status !== 'sudah';
}

/**
 * Label tampil/dibacakan untuk satu obat.
 * @returns {string}
 */
export function labelPemeriksaan(item) {
  const pemeriksaan = normalisasiPemeriksaan(
    isObject(item) ? item.pemeriksaanOrangLain : undefined
  );
  if (pemeriksaan.status === 'sudah') {
    return `Sudah diperiksa oleh ${pemeriksaan.oleh} pada ${waktuTampil(pemeriksaan.waktu)}`;
  }
  return LABEL_BELUM_DIPERIKSA;
}

/**
 * Ringkasan status pemeriksaan untuk live region.
 * @returns {{total:number, belum:number, sudah:number, teks:string}}
 */
export function ringkasPemeriksaan(items) {
  const daftar = Array.isArray(items) ? items.filter(isObject) : [];
  let belum = 0;
  let sudah = 0;

  for (const item of daftar) {
    if (normalisasiPemeriksaan(item.pemeriksaanOrangLain).status === 'sudah') {
      sudah += 1;
    } else {
      belum += 1;
    }
  }

  const total = daftar.length;
  const teks = total === 0
    ? 'Tidak ada obat yang menunggu pemeriksaan.'
    : `Pemeriksaan pendamping: ${belum} dari ${total} obat belum diperiksa, ${sudah} sudah diperiksa.`;

  return { total, belum, sudah, teks };
}

/**
 * Teks status pemeriksaan satu obat untuk dibacakan TTS.
 * @returns {string}
 */
export function teksPemeriksaanUntukDibacakan(item) {
  const nama = namaItem(item);
  const pemeriksaan = normalisasiPemeriksaan(
    isObject(item) ? item.pemeriksaanOrangLain : undefined
  );
  return teksStatus(nama, pemeriksaan);
}
