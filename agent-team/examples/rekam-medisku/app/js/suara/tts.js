/**
 * Pembaca ulang (TTS) bahasa Indonesia — CONTRACT.md 8B.5.
 *
 * - Semua angka diucapkan lewat `ucapkanAngka` agar konsisten.
 * - Tidak menyimpan data dan tidak melakukan request jaringan.
 * - TTS tidak boleh berbunyi saat mikrofon mendengarkan: pemanggil wajib
 *   `await adaptor.berhenti()` sebelum `bacakan()` lalu `adaptor.mulai()` lagi.
 */

import { SuaraError } from './adaptor.js';
import { ucapkanAngka } from '../logic/ucapanAngka.js';
import { VITAL_TYPES } from '../model.js';

/** Bahasa TTS yang dipakai aplikasi. */
export const TTS_LANG = 'id-ID';

const LABEL_BELUM_DIPERIKSA = 'belum diperiksa pendamping atau apoteker';

const BULAN_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'
];

const HARI_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

const ATURAN_MAKAN = {
  sebelum: 'sebelum makan',
  sesudah: 'sesudah makan',
  saat: 'saat makan',
  'bila-perlu': 'bila perlu'
};

const SATUAN_UCAPAN = {
  mmHg: 'milimeter merkuri',
  'mg/dL': 'miligram per desiliter',
  kg: 'kilogram',
  '°C': 'derajat celsius',
  g: 'gram',
  mg: 'miligram',
  mcg: 'mikrogram',
  ml: 'mililiter',
  bpm: 'denyut per menit',
  '%': 'persen'
};

/* ------------------------------------------------------------------ */
/* Deteksi & pemilihan suara                                           */
/* ------------------------------------------------------------------ */

function synth() {
  if (typeof globalThis === 'undefined') return null;
  const s = globalThis.speechSynthesis;
  return s && typeof s.speak === 'function' ? s : null;
}

/**
 * Apakah `speechSynthesis` tersedia di lingkungan ini.
 *
 * @returns {boolean}
 */
export function ttsTersedia() {
  return synth() !== null
    && typeof globalThis.SpeechSynthesisUtterance === 'function';
}

/**
 * Pilih suara Indonesia pertama dari daftar `SpeechSynthesisVoice`.
 * Prioritas: bahasa persis `id-ID`/`id_ID`, lalu awalan `id`.
 *
 * @param {Array} voices
 * @returns {object|null}
 */
export function pilihSuaraIndonesia(voices = []) {
  if (!Array.isArray(voices)) return null;
  const valid = voices.filter(
    (voice) => voice && typeof voice.lang === 'string' && voice.lang.trim() !== ''
  );

  for (const voice of valid) {
    const lang = voice.lang.toLowerCase().replace('_', '-');
    if (lang === 'id-id') return voice;
  }
  for (const voice of valid) {
    if (voice.lang.toLowerCase().startsWith('id')) return voice;
  }
  return null;
}

function daftarSuara() {
  const s = synth();
  if (!s || typeof s.getVoices !== 'function') return [];
  try {
    const voices = s.getVoices();
    return Array.isArray(voices) ? voices : [];
  } catch {
    return [];
  }
}

/* ------------------------------------------------------------------ */
/* Bacakan / hentikan                                                  */
/* ------------------------------------------------------------------ */

/** Bacaan aktif (satu pada satu waktu). */
let aktif = null;

function panggilAman(fn, arg) {
  if (typeof fn !== 'function') return;
  try {
    fn(arg);
  } catch {
    // Callback UI tidak boleh menggagalkan pembacaan.
  }
}

function selesaikan(utterance, hasil) {
  if (!aktif || aktif.utterance !== utterance) return;
  const sesi = aktif;
  aktif = null;
  if (sesi.onAbort && sesi.signal
      && typeof sesi.signal.removeEventListener === 'function') {
    try {
      sesi.signal.removeEventListener('abort', sesi.onAbort);
    } catch {
      // abaikan
    }
  }
  panggilAman(sesi.onEnd, hasil);
  sesi.resolve(hasil);
}

/**
 * Hentikan bacaan yang sedang berjalan.
 * Promise `bacakan` yang tertunda diselesaikan dengan `{selesai:false, dibatalkan:true}`.
 */
export function hentikanBacaan() {
  const s = synth();
  const sesi = aktif;
  aktif = null;

  if (sesi) {
    if (sesi.onAbort && sesi.signal
        && typeof sesi.signal.removeEventListener === 'function') {
      try {
        sesi.signal.removeEventListener('abort', sesi.onAbort);
      } catch {
        // abaikan
      }
    }
    panggilAman(sesi.onEnd, { selesai: false, dibatalkan: true });
    sesi.resolve({ selesai: false, dibatalkan: true });
  }

  if (s && typeof s.cancel === 'function') {
    try {
      s.cancel();
    } catch {
      // Pembatalan di peramban tidak boleh melempar ke UI.
    }
  }
}

/**
 * Bacakan teks dengan TTS.
 *
 * @param {string} teks
 * @param {{lang?:string, rate?:number, pitch?:number, voice?:object|null,
 *   signal?:AbortSignal|null, onStart?:Function|null, onEnd?:Function|null}} [opsi]
 * @returns {Promise<{selesai:boolean, dibatalkan:boolean}>}
 */
export async function bacakan(teks, {
  lang = TTS_LANG,
  rate = 0.9,
  pitch = 1,
  voice = null,
  signal = null,
  onStart = null,
  onEnd = null
} = {}) {
  if (!ttsTersedia()) {
    throw new SuaraError(
      'Pembaca suara tidak tersedia. Bacaan ditampilkan sebagai teks; konfirmasi tetap wajib.',
      { code: 'TTS_TIDAK_TERSEDIA' }
    );
  }

  const isi = teks === null || teks === undefined ? '' : String(teks).trim();
  if (isi === '') return { selesai: true, dibatalkan: false };
  if (signal && signal.aborted) return { selesai: false, dibatalkan: true };

  // Satu bacaan pada satu waktu: hentikan yang sebelumnya.
  hentikanBacaan();

  const s = synth();
  const Utterance = globalThis.SpeechSynthesisUtterance;
  const utterance = new Utterance(isi);
  utterance.lang = typeof lang === 'string' && lang.trim() ? lang.trim() : TTS_LANG;
  if (Number.isFinite(Number(rate))) utterance.rate = Number(rate);
  if (Number.isFinite(Number(pitch))) utterance.pitch = Number(pitch);

  const suara = voice || pilihSuaraIndonesia(daftarSuara());
  if (suara) utterance.voice = suara;

  return new Promise((resolve) => {
    const sesi = {
      utterance,
      resolve,
      signal,
      onAbort: null,
      onEnd
    };

    if (signal && typeof signal.addEventListener === 'function') {
      sesi.onAbort = () => {
        hentikanBacaan();
      };
      try {
        signal.addEventListener('abort', sesi.onAbort, { once: true });
      } catch {
        sesi.onAbort = null;
      }
    }

    utterance.onstart = () => {
      panggilAman(onStart, { teks: isi, lang: utterance.lang, voice: utterance.voice || null });
    };
    utterance.onend = () => {
      selesaikan(utterance, { selesai: true, dibatalkan: false });
    };
    utterance.onerror = (event) => {
      const alasan = event && typeof event.error === 'string' ? event.error : '';
      const dibatalkan = alasan === 'interrupted' || alasan === 'canceled'
        || alasan === 'cancelled';
      selesaikan(utterance, { selesai: false, dibatalkan });
    };

    aktif = sesi;

    try {
      s.speak(utterance);
    } catch {
      selesaikan(utterance, { selesai: false, dibatalkan: false });
    }
  });
}

/* ------------------------------------------------------------------ */
/* Pembantu ucapan                                                     */
/* ------------------------------------------------------------------ */

function teksBersih(nilai) {
  return typeof nilai === 'string' ? nilai.trim() : '';
}

function angka(nilai) {
  if (typeof nilai === 'number') return Number.isFinite(nilai) ? nilai : null;
  if (typeof nilai === 'string') {
    const bersih = nilai.trim().replace(',', '.');
    if (bersih === '') return null;
    const n = Number(bersih);
    return Number.isFinite(n) ? n : null;
  }
  return null;
}

/** Ucapkan angka; pecahan umum memakai kata Indonesia (`0.5` -> `setengah`). */
function ucap(nilai) {
  if (typeof nilai === 'string' && nilai.trim() === '½') return 'setengah';
  const n = angka(nilai);
  if (n === null) return '';
  if (n === 0.5) return 'setengah';
  if (n === 0.25) return 'seperempat';
  return ucapkanAngka(n);
}

function ucapDenganSatuan(nilai, satuan) {
  const teks = ucap(nilai);
  if (!teks) return '';
  const sat = teksBersih(satuan);
  return sat ? `${teks} ${sat}` : teks;
}

function ucapJam(waktu) {
  const cocok = /^(\d{1,2}):(\d{2})$/.exec(teksBersih(waktu));
  if (!cocok) return '';
  const jam = Number(cocok[1]);
  const menit = Number(cocok[2]);
  if (jam > 23 || menit > 59) return '';
  let teks = `pukul ${ucap(jam)}`;
  if (menit > 0) teks += ` lewat ${ucap(menit)}`;
  return teks;
}

function ucapTanggal(iso) {
  const cocok = /^(\d{4})-(\d{2})-(\d{2})/.exec(teksBersih(iso));
  if (!cocok) return '';
  const tahun = Number(cocok[1]);
  const bulan = Number(cocok[2]);
  const hari = Number(cocok[3]);
  if (bulan < 1 || bulan > 12 || hari < 1 || hari > 31) return '';
  return `${ucap(hari)} ${BULAN_ID[bulan - 1]} ${ucap(tahun)}`;
}

function ucapSatuan(satuan) {
  const teks = teksBersih(satuan);
  if (!teks) return '';
  return SATUAN_UCAPAN[teks] || teks;
}

/** Satuan kekuatan/dosis dibacakan penuh (`mg` -> `miligram`). */
function ucapSatuanDosis(satuan) {
  const teks = teksBersih(satuan);
  if (!teks) return '';
  return SATUAN_UCAPAN[teks] || teks;
}

function kapital(teks) {
  return teks ? teks[0].toUpperCase() + teks.slice(1) : teks;
}

function labelStatus(item) {
  if (item === null || item === undefined) return LABEL_BELUM_DIPERIKSA;

  if (typeof item === 'string') {
    const teks = item.trim();
    if (teks === '' || teks === 'belum' || teks === 'belum-diperiksa') {
      return LABEL_BELUM_DIPERIKSA;
    }
    if (teks === 'sudah') return 'sudah diperiksa';
    return teks;
  }

  const sumber = item.pemeriksaanOrangLain
    ?? item.pemeriksaan
    ?? item.medication?.pemeriksaanOrangLain
    ?? item.medication?.pemeriksaan
    ?? null;

  if (sumber === null || sumber === undefined) {
    return typeof item.statusPemeriksaan === 'string' && item.statusPemeriksaan.trim()
      ? labelStatus(item.statusPemeriksaan)
      : LABEL_BELUM_DIPERIKSA;
  }
  if (typeof sumber === 'string') return labelStatus(sumber);

  if (sumber.status === 'sudah') {
    const oleh = teksBersih(sumber.oleh);
    return oleh ? `sudah diperiksa oleh ${oleh}` : 'sudah diperiksa';
  }
  return LABEL_BELUM_DIPERIKSA;
}

/* ------------------------------------------------------------------ */
/* Teks ulang                                                          */
/* ------------------------------------------------------------------ */

function teksKekuatan(obat) {
  const kekuatan = obat.kekuatan;
  if (kekuatan && typeof kekuatan === 'object' && angka(kekuatan.nilai) !== null) {
    return ucapDenganSatuan(kekuatan.nilai, ucapSatuanDosis(kekuatan.satuan));
  }

  const dosis = obat.dose ?? obat.doseText ?? obat.kekuatanTeks;
  if (dosis === null || dosis === undefined || String(dosis).trim() === '') return '';
  const teks = ucap(dosis) || String(dosis).trim();
  const satuan = ucapSatuanDosis(obat.doseUnit ?? obat.satuanKekuatan ?? '');
  return satuan ? `${teks} ${satuan}` : teks;
}

function teksFrekuensi(obat, aturanMakan) {
  if (aturanMakan === 'bila-perlu') return 'bila perlu';

  let kali = angka(obat.kaliSehari);
  if (kali === null && Array.isArray(obat.times)) kali = obat.times.length;
  if (kali === null && Array.isArray(obat.jadwalJam)) kali = obat.jadwalJam.length;
  if (kali === null || kali <= 0) return '';
  return `${ucap(kali)} kali sehari`;
}

function teksTakaran(obat) {
  const takaran = obat.takaranPerDosis
    ?? obat.stock?.unitsPerDose
    ?? obat.unitsPerDose
    ?? null;
  if (takaran === null || takaran === undefined || angka(takaran) === null) return '';
  const satuan = obat.satuanTakaran
    ?? obat.stock?.unit
    ?? obat.bentukSediaan?.satuan
    ?? '';
  return ucapDenganSatuan(takaran, ucapSatuanDosis(satuan));
}

function teksAturanMakan(obat) {
  const aturan = obat.aturanMakan;
  if (typeof aturan === 'string' && ATURAN_MAKAN[aturan]) return ATURAN_MAKAN[aturan];

  const instruksi = teksBersih(obat.instructions ?? obat.instruksi).toLowerCase();
  if (!instruksi) return '';
  if (instruksi.includes('sebelum makan')) return 'sebelum makan';
  if (instruksi.includes('sesudah makan') || instruksi.includes('setelah makan')) {
    return 'sesudah makan';
  }
  if (instruksi.includes('saat makan')) return 'saat makan';
  if (instruksi.includes('bila perlu')) return 'bila perlu';
  return '';
}

function teksJadwal(obat) {
  const daftar = Array.isArray(obat.jadwalJam) && obat.jadwalJam.length > 0
    ? obat.jadwalJam
    : (Array.isArray(obat.times) ? obat.times : []);
  const ucapan = daftar.map(ucapJam).filter(Boolean);
  return ucapan.join(', ');
}

function teksHari(days) {
  if (!Array.isArray(days) || days.length === 0) return '';
  const unik = [...new Set(
    days.filter((d) => Number.isInteger(d) && d >= 0 && d <= 6)
  )].sort((a, b) => a - b);
  if (unik.length === 0) return '';
  if (unik.length === 7) return 'setiap hari';
  return unik.map((d) => HARI_ID[d]).join(', ');
}

function jumlahHariAntara(mulai, selesai) {
  const a = Date.parse(`${teksBersih(mulai)}T00:00:00Z`);
  const b = Date.parse(`${teksBersih(selesai)}T00:00:00Z`);
  if (!Number.isFinite(a) || !Number.isFinite(b) || b < a) return null;
  return Math.round((b - a) / 86400000) + 1;
}

function teksDurasi(obat) {
  const durasi = angka(obat.durasiHari);
  if (durasi !== null && durasi > 0) return `selama ${ucap(durasi)} hari`;
  if (obat.startDate && obat.endDate) {
    const hari = jumlahHariAntara(obat.startDate, obat.endDate);
    if (hari !== null) return `selama ${ucap(hari)} hari`;
  }
  return '';
}

function teksStok(obat) {
  const stok = obat.stock;
  if (!stok || stok.remaining === null || stok.remaining === undefined) return '';
  if (angka(stok.remaining) === null) return '';
  const satuan = teksBersih(stok.unit) || 'tablet';
  return `stok tersisa ${ucap(stok.remaining)} ${satuan}`;
}

/**
 * Bacaan ulang obat — memuat semua yang akan disimpan.
 *
 * @param {object} obat Medication atau ObatTerjemahan
 * @returns {string}
 */
export function teksUlangObat(obat) {
  if (!obat || typeof obat !== 'object') return '';

  const nama = teksBersih(obat.nama ?? obat.name);
  if (!nama) return '';

  const aturan = teksAturanMakan(obat);
  const bagian = [nama];
  const kekuatan = teksKekuatan(obat);
  const frekuensi = teksFrekuensi(obat, aturan === 'bila perlu' ? 'bila-perlu' : obat.aturanMakan);
  const takaran = teksTakaran(obat);

  if (kekuatan) bagian.push(kekuatan);
  if (frekuensi) bagian.push(frekuensi);
  if (takaran) bagian.push(takaran);
  // `bila perlu` sudah diucapkan sebagai frekuensi; jangan diulang.
  if (aturan && aturan !== 'bila perlu') bagian.push(aturan);

  const kalimat = [`${bagian.join(', ')}.`];

  const jadwal = teksJadwal(obat);
  if (jadwal) kalimat.push(`Jadwal minum ${jadwal}.`);

  const hari = teksHari(obat.daysOfWeek);
  if (hari) kalimat.push(`Hari minum: ${hari}.`);

  if (obat.startDate) {
    const mulai = ucapTanggal(obat.startDate);
    if (mulai) kalimat.push(`Mulai ${mulai}.`);
  }
  if (obat.endDate) {
    const selesai = ucapTanggal(obat.endDate);
    if (selesai) kalimat.push(`Selesai ${selesai}.`);
  }

  const durasi = teksDurasi(obat);
  if (durasi) kalimat.push(`Diminum ${durasi}.`);

  const stok = teksStok(obat);
  if (stok) kalimat.push(`${kapital(stok)}.`);

  const catatan = teksBersih(obat.notes ?? obat.catatan);
  if (catatan) kalimat.push(`Catatan: ${catatan}.`);

  kalimat.push(`Status: ${labelStatus(obat)}.`);

  return kalimat.join(' ');
}

/**
 * Bacaan ulang tanda vital.
 *
 * @param {object} vital
 * @returns {string}
 */
export function teksUlangVital(vital) {
  if (!vital || typeof vital !== 'object') return '';

  const tipe = vital.type;
  const konfigurasi = VITAL_TYPES[tipe] || null;
  const label = konfigurasi?.label || teksBersih(tipe) || 'Tanda vital';
  const values = vital.values && typeof vital.values === 'object' ? vital.values : {};

  let nilai = '';
  if (tipe === 'tension') {
    const sistolik = values.systolic ?? vital.systolic;
    const diastolik = values.diastolic ?? vital.diastolic;
    if (angka(sistolik) !== null && angka(diastolik) !== null) {
      nilai = `${ucap(sistolik)} per ${ucap(diastolik)}`;
    }
  } else {
    const tunggal = values.value ?? vital.value;
    if (angka(tunggal) !== null) nilai = ucap(tunggal);
  }

  const satuan = ucapSatuan(vital.unit || konfigurasi?.unit || '');
  const denganSatuan = nilai && satuan ? `${nilai} ${satuan}` : nilai;

  const bagian = [label];
  if (denganSatuan) bagian.push(denganSatuan);

  const tanggal = ucapTanggal(vital.date);
  const jam = ucapJam(vital.time);
  if (tanggal) bagian.push(`pada ${tanggal}${jam ? ` ${jam}` : ''}`);
  else if (jam) bagian.push(jam);

  const catatan = teksBersih(vital.note ?? vital.catatan);
  if (catatan) bagian.push(`catatan: ${catatan}`);

  return `${bagian.join(', ')}.`;
}

function teksDosisDose(dose) {
  const dosis = dose.dose ?? dose.doseText;
  if (dosis !== null && dosis !== undefined && String(dosis).trim() !== '') {
    const teks = ucap(dosis) || String(dosis).trim();
    const satuan = ucapSatuanDosis(dose.doseUnit ?? dose.unit ?? '');
    return satuan ? `${teks} ${satuan}` : teks;
  }

  const units = dose.unitsPerDose ?? dose.takaranPerDosis ?? null;
  if (units !== null && units !== undefined && angka(units) !== null) {
    const satuan = teksBersih(
      dose.stock?.unit || dose.satuanTakaran || dose.unit || 'tablet'
    );
    return `${ucap(units)}${satuan ? ` ${satuan}` : ''}`;
  }
  return '';
}

/**
 * Bacaan ulang satu dosis minum (nama, jam, dosis, status pemeriksaan).
 *
 * @param {object} dose Dosis dari `buildDosesForDate` (boleh membawa
 *   `pemeriksaanOrangLain`/`medication`)
 * @returns {string}
 */
export function teksUlangMinum(dose) {
  if (!dose || typeof dose !== 'object') return '';

  const nama = teksBersih(dose.name ?? dose.nama ?? dose.medicationName ?? dose.medication?.name);
  if (!nama) return '';

  const jam = ucapJam(dose.time ?? dose.jam);
  const dosis = teksDosisDose(dose);

  const bagian = [nama];
  if (jam) bagian.push(jam);
  if (dosis) bagian.push(dosis);

  return `${bagian.join(', ')}. Status obat ${nama}: ${labelStatus(dose)}.`;
}

function statusUntukDosis(dose, statusPemeriksaan) {
  if (statusPemeriksaan === null || statusPemeriksaan === undefined) {
    return labelStatus(dose);
  }
  // Satu status teks berlaku untuk semua dosis.
  if (typeof statusPemeriksaan === 'string') return labelStatus(statusPemeriksaan);

  try {
    if (typeof statusPemeriksaan === 'function') {
      const hasil = statusPemeriksaan(dose);
      return hasil === null || hasil === undefined ? labelStatus(dose) : labelStatus(hasil);
    }
    if (Array.isArray(statusPemeriksaan)) {
      const cocok = statusPemeriksaan.find((item) => item && (
        item.id === dose.medicationId
        || item.medicationId === dose.medicationId
        || item.id === dose.id
        || item.name === dose.name
      ));
      return cocok ? labelStatus(cocok) : labelStatus(dose);
    }
    if (typeof statusPemeriksaan === 'object') {
      const cocok = statusPemeriksaan[dose.medicationId]
        ?? statusPemeriksaan[dose.id]
        ?? null;
      if (cocok !== null) return labelStatus(cocok);
      // Objek Medication tunggal (bukan peta id -> status).
      if (statusPemeriksaan.pemeriksaanOrangLain
          || statusPemeriksaan.statusPemeriksaan) {
        return labelStatus(statusPemeriksaan);
      }
      return labelStatus(dose);
    }
  } catch {
    return labelStatus(dose);
  }
  return labelStatus(dose);
}

/**
 * Bacaan ulang seluruh jadwal hari ini beserta status pemeriksaan tiap obat.
 *
 * @param {Array} doses
 * @param {{statusPemeriksaan?:Function|object|Array|string|null,
 *   statusPemeriksaanObat?:Function|object|Array|string|null}} [opsi]
 * @returns {string}
 */
export function teksUlangJadwal(doses, {
  statusPemeriksaan = null,
  statusPemeriksaanObat = null
} = {}) {
  const daftar = Array.isArray(doses)
    ? doses.filter((dose) => dose && typeof dose === 'object')
    : [];
  if (daftar.length === 0) return 'Tidak ada jadwal obat hari ini.';

  const statusSumber = statusPemeriksaan ?? statusPemeriksaanObat;

  const kalimat = daftar.map((dose) => {
    const nama = teksBersih(dose.name ?? dose.nama ?? dose.medicationName ?? dose.medication?.name) || 'Obat';
    const jam = ucapJam(dose.time ?? dose.jam);
    const dosis = teksDosisDose(dose);

    const bagian = [];
    if (jam) bagian.push(kapital(jam));
    bagian.push(nama);
    if (dosis) bagian.push(dosis);

    return `${bagian.join(', ')}. Status obat ${nama}: ${statusUntukDosis(dose, statusSumber)}.`;
  });

  return kalimat.join(' ');
}
