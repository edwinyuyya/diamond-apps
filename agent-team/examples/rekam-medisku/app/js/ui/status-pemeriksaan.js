// Rekam Medisku — komponen bersama status Pemeriksaan Pendamping (t25).
//
// Semua tempat yang menampilkan obat (daftar obat, pengingat hari ini,
// ringkasan dokter, Isi dengan Suara, Pemeriksaan) memakai `penandaPemeriksaan`
// agar status tampil sebagai teks yang dapat dibaca, bukan warna saja.
// Komponen ini murni tampilan: tidak pernah mengubah status.

import { h } from '../dom.js';
import {
  penandaPemeriksaan,
  ringkasPenanda
} from '../suara/penandaPemeriksaan.js';

function kelasBadge(penanda, extraClass) {
  return ['badge', penanda.kelas, extraClass]
    .filter((value) => typeof value === 'string' && value.trim() !== '')
    .join(' ');
}

/**
 * Badge teks status pemeriksaan untuk satu obat.
 *
 * @param {object} item Medication
 * @param {{id?:string, extraClass?:string, judul?:string}} [opsi]
 * @returns {HTMLElement}
 */
export function badgePemeriksaan(item, { id = null, extraClass = '', judul = '' } = {}) {
  const penanda = penandaPemeriksaan(item);
  const props = {
    class: kelasBadge(penanda, extraClass),
    'data-status-pemeriksaan': penanda.status,
    'data-butuh-pemeriksaan': penanda.butuhPemeriksaan ? 'true' : 'false',
    'aria-label': penanda.ariaLabel
  };
  if (id) props.id = id;
  if (judul) props.title = judul;
  return h('span', props, penanda.label);
}

/**
 * Baris status pemeriksaan + tautan tindakan untuk dipakai di daftar.
 * Label selalu berupa teks di dalam badge (termasuk saat sudah diperiksa,
 * yang menyebut nama pemeriksa).
 *
 * @param {object} item Medication
 * @param {{id?:string, kelas?:string, href?:string, tautanLabel?:string}} [opsi]
 * @returns {HTMLElement}
 */
export function barisStatusPemeriksaan(item, {
  id = null,
  kelas = 'pemeriksaan-status',
  href = '#/pemeriksaan',
  tautanLabel = null
} = {}) {
  const penanda = penandaPemeriksaan(item);
  const props = { class: kelas };
  if (id) props.id = id;

  const tautan = href
    ? h('a', {
        href,
        class: 'pemeriksaan-link',
        'data-status-pemeriksaan': penanda.status
      }, tautanLabel || (penanda.butuhPemeriksaan
        ? 'Periksa obat ini'
        : 'Lihat status pemeriksaan'))
    : null;

  return h('p', props, badgePemeriksaan(item), tautan ? ' ' : null, tautan);
}

/** Teks status (tanpa DOM marker) untuk live region atau atribut aria. */
export function teksStatusPemeriksaan(item) {
  return penandaPemeriksaan(item).label;
}

/** aria-label status untuk satu obat. */
export function ariaStatusPemeriksaan(item) {
  return penandaPemeriksaan(item).ariaLabel;
}

/** Ringkasan status untuk live region. */
export function ringkasanStatusPemeriksaan(items) {
  return ringkasPenanda(Array.isArray(items) ? items : []);
}

/** Kelas badge untuk status tertentu, berguna untuk CSS/pengujian. */
export function kelasStatusPemeriksaan(item) {
  return penandaPemeriksaan(item).kelas;
}

export default {
  badgePemeriksaan,
  barisStatusPemeriksaan,
  teksStatusPemeriksaan,
  ariaStatusPemeriksaan,
  ringkasanStatusPemeriksaan,
  kelasStatusPemeriksaan
};
