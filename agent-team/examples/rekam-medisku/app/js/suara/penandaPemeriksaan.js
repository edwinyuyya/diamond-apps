/**
 * Penanda teks/aria status Pemeriksaan Pendamping (CONTRACT.md 8B.9).
 *
 * Murni: bebas DOM, tanpa efek samping, deterministik. Dipakai bersama oleh
 * daftar obat, pengingat hari ini, ringkasan dokter, Isi dengan Suara, dan
 * layar Pemeriksaan agar status selalu tampil sebagai teks (bukan warna saja)
 * dan ikut dibacakan.
 */

import {
  normalisasiPemeriksaan,
  labelPemeriksaan,
  butuhPemeriksaan,
  ringkasPemeriksaan,
  teksPemeriksaanUntukDibacakan
} from '../logic/pemeriksaan.js';

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function namaObat(medication, dose = null) {
  if (isObject(medication) && typeof medication.name === 'string' && medication.name.trim()) {
    return medication.name.trim();
  }
  if (isObject(dose) && typeof dose.medicationName === 'string' && dose.medicationName.trim()) {
    return dose.medicationName.trim();
  }
  return 'obat ini';
}

function ariaStatus(medication, label) {
  const nama = namaObat(medication);
  if (nama === 'obat ini') return `Status pemeriksaan: ${label}`;
  return `Status pemeriksaan ${nama}: ${label}`;
}

/**
 * Penanda tampil untuk satu obat.
 *
 * @param {object} item Medication
 * @returns {{status:'belum'|'sudah', label:string, kelas:string, ariaLabel:string, butuhPemeriksaan:boolean}}
 */
export function penandaPemeriksaan(item) {
  const pemeriksaan = normalisasiPemeriksaan(
    isObject(item) ? item.pemeriksaanOrangLain : undefined
  );
  const status = pemeriksaan.status;
  const label = labelPemeriksaan(item);

  return {
    status,
    label,
    kelas: status === 'sudah' ? 'badge-pemeriksaan-sudah' : 'badge-pemeriksaan-belum',
    ariaLabel: ariaStatus(item, label),
    butuhPemeriksaan: butuhPemeriksaan(item)
  };
}

/**
 * Teks status pemeriksaan untuk satu dosis jadwal, ikut dibacakan TTS.
 * Contoh: `Status obat Captopril: belum diperiksa pendamping atau apoteker.`
 *
 * @param {object} dose DoseLog (dipakai untuk nama cadangan bila ada)
 * @param {object} medication Medication sumber status
 * @returns {string}
 */
export function teksPemeriksaanJadwal(dose, medication) {
  const nama = namaObat(medication, dose);
  const sumber = isObject(medication)
    ? medication
    : { name: nama };
  const teks = teksPemeriksaanUntukDibacakan({ ...sumber, name: nama });
  return teks;
}

/**
 * Ringkasan penanda untuk live region.
 *
 * @param {Array<object>} items Daftar Medication
 * @returns {{total:number, belum:number, sudah:number, teks:string, ariaLabel:string}}
 */
export function ringkasPenanda(items) {
  const ringkasan = ringkasPemeriksaan(items);
  const { total, belum, sudah, teks } = ringkasan;

  const ariaLabel = total === 0
    ? 'Tidak ada obat yang menunggu pemeriksaan.'
    : `Pemeriksaan pendamping: ${belum} dari ${total} obat belum diperiksa, ${sudah} sudah diperiksa.`;

  return { total, belum, sudah, teks, ariaLabel };
}
