// Rekam Medisku — teks pertanyaan & pembacaan ulang alur tanya (t33).
//
// Semua pertanyaan berasal dari konstanta kontrak 8B.12/8B.15 dan dibacakan
// apa adanya. Modul ini tidak menyimpan apa pun, tidak memakai DOM, dan tidak
// melakukan request jaringan. TTS hanya boleh berbunyi saat mikrofon sudah
// dihentikan oleh orkestrator (`alurTanya.js`) — lihat 8B.15.

import { PERTANYAAN_TANYA, labelPilihan } from '../logic/kosakataTertutup.js';
import { PERTANYAAN_KONFIRMASI } from '../logic/konfirmasiSuara.js';
import { ucapkanAngka } from '../logic/ucapanAngka.js';
import {
  bacakan as bacakanBawaan,
  hentikanBacaan,
  ttsTersedia
} from './tts.js';

/** Pertanyaan persis untuk lima langkah tertutup (8B.15). */
export const PERTANYAAN_TANYA_TEKS = Object.freeze({
  frekuensi: 'Berapa kali sehari?',
  takaran: 'Berapa tablet sekali minum?',
  aturanMakan: 'Sebelum, sesudah, atau saat makan?',
  waktu: 'Pagi, siang, sore, malam, atau sebelum tidur?',
  bilaPerlu: 'Hanya kalau perlu?'
});

function kapitalAwal(teks) {
  const nilai = String(teks ?? '');
  if (nilai === '') return nilai;
  return nilai.charAt(0).toUpperCase() + nilai.slice(1);
}

/**
 * Ubah label kosakata menjadi ucapan ("1 kali" -> "satu kali") agar TTS
 * konsisten dengan `ucapkanAngka` (8B.7.1).
 */
function ucapkanLabel(label) {
  const nilai = String(label ?? '').trim();
  if (nilai === '') return '';
  return nilai.replace(/^(\d+(?:[.,]\d+)?)/, (angka) => {
    const number = Number(angka.replace(',', '.'));
    return Number.isFinite(number) ? ucapkanAngka(number) : angka;
  });
}

/**
 * Teks pertanyaan persis untuk sebuah langkah.
 *
 * @param {string} id
 * @param {object|null} [sesi]
 * @returns {string}
 */
export function teksPertanyaan(id, sesi = null) {
  if (!Object.prototype.hasOwnProperty.call(PERTANYAAN_TANYA_TEKS, id)) return '';
  // `sesi` diterima untuk kompatibilitas; pertanyaan tidak berubah per sesi.
  void sesi;
  return PERTANYAAN_TANYA_TEKS[id];
}

/**
 * Daftar pilihan yang dibacakan setelah pertanyaan, mis.
 * `'Satu kali, dua kali, tiga kali, ...'`.
 *
 * @param {string} id
 * @returns {string}
 */
export function teksPilihan(id) {
  const def = PERTANYAAN_TANYA[id];
  if (!def) return '';
  const label = def.label || {};
  const teks = def.pilihan
    .map((nilai) => {
      const langsung = labelPilihan(id, nilai);
      return ucapkanLabel(langsung || label[nilai] || String(nilai));
    })
    .filter(Boolean)
    .join(', ');
  return kapitalAwal(teks);
}

/**
 * Pertanyaan baca-satu-per-satu untuk nama obat dari daftar/pindai.
 *
 * @param {string} nama
 * @returns {string}
 */
export function teksNamaDariDaftar(nama) {
  return `${String(nama ?? '').trim()}? ya atau tidak`;
}

/**
 * Ejaan dibacakan huruf per huruf, angka sebagai kata.
 * `'BETA'` -> `'B, e, t, a'`; `'12'` -> `'satu dua'`.
 *
 * @param {string} teks
 * @returns {string}
 */
export function teksEjaan(teks) {
  const nilai = String(teks ?? '').trim();
  if (nilai === '') return '';
  const bagianHuruf = [];
  const bagianAngka = [];
  for (const karakter of nilai) {
    if (/[a-zA-Z]/.test(karakter)) {
      bagianHuruf.push(karakter);
    } else if (/[0-9]/.test(karakter)) {
      bagianAngka.push(ucapkanAngka(Number(karakter)));
    }
  }
  if (bagianHuruf.length > 0) {
    return bagianHuruf
      .map((huruf, indeks) => (indeks === 0 ? huruf.toUpperCase() : huruf.toLowerCase()))
      .join(', ');
  }
  return bagianAngka.join(' ');
}

/**
 * Teks konfirmasi: ringkasan lengkap + pertanyaan persis 8B.6.
 *
 * @param {string} ringkasan
 * @returns {string}
 */
export function teksKonfirmasiTanya(ringkasan) {
  const isi = String(ringkasan ?? '').trim();
  return isi === '' ? PERTANYAAN_KONFIRMASI : `${isi} ${PERTANYAAN_KONFIRMASI}`;
}

/** Ambil fungsi pembaca dari modul TTS atau objek/fungsi yang diinjeksi. */
function ambilBacakan(tts) {
  if (typeof tts === 'function') return tts;
  if (tts && typeof tts.bacakan === 'function') {
    return (teks, opsi) => tts.bacakan(teks, opsi);
  }
  if (tts === null || tts === undefined) {
    try {
      return ttsTersedia() ? bacakanBawaan : null;
    } catch {
      return null;
    }
  }
  return null;
}

/**
 * Bacakan teks apa adanya (dipakai alur konfirmasi). Mengembalikan
 * `{ selesai, dibatalkan }`; tidak pernah melempar karena TTS opsional.
 *
 * @param {object|Function|null} tts
 * @param {string} teks
 * @param {{signal?:AbortSignal|null}} [opsi]
 * @returns {Promise<{selesai:boolean, dibatalkan:boolean}>}
 */
export async function bacakanTeksTanya(tts, teks, { signal = null } = {}) {
  const bacakan = ambilBacakan(tts);
  if (!bacakan) return { selesai: false, dibatalkan: false };
  if (signal && signal.aborted) return { selesai: false, dibatalkan: true };

  try {
    hentikanBacaan();
  } catch {
    // Penghentian bacaan sebelumnya tidak boleh menggagalkan pembacaan baru.
  }

  try {
    const hasil = await bacakan(String(teks ?? ''), { signal });
    if (hasil && typeof hasil === 'object' && hasil.dibatalkan) {
      return { selesai: false, dibatalkan: true };
    }
    return { selesai: true, dibatalkan: false };
  } catch (error) {
    if (signal && signal.aborted) return { selesai: false, dibatalkan: true };
    if (error && error.code === 'TTS_TIDAK_TERSEDIA') {
      return { selesai: false, dibatalkan: false };
    }
    return { selesai: false, dibatalkan: false };
  }
}

/**
 * Bacakan pertanyaan aktif (dan pilihan untuk langkah tertutup).
 *
 * @param {object|Function|null} tts
 * @param {string} id
 * @param {object|null} [sesi]
 * @param {{signal?:AbortSignal|null}} [opsi]
 * @returns {Promise<{selesai:boolean, dibatalkan:boolean}>}
 */
export async function bacakanPertanyaan(tts, id, sesi = null, { signal = null } = {}) {
  const pertanyaan = teksPertanyaan(id, sesi);
  if (pertanyaan === '') return { selesai: false, dibatalkan: false };
  const pilihan = teksPilihan(id);
  const teks = pilihan === '' ? pertanyaan : `${pertanyaan} ${pilihan}`;
  return bacakanTeksTanya(tts, teks, { signal });
}
