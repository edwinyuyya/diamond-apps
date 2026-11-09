// Rekam Medisku — navigasi suara (CONTRACT.md 8B.8).
//
// Satu ucapan -> satu perintah deterministik (lihat logic/perintahNavigasi.js)
// -> pengumuman (live region) -> navigate(route) atau aksi berhenti.
//
// Aturan penting:
// - Mikrofon SELALU dihentikan sebelum TTS/pengumuman; tidak mendengarkan
//   selama aplikasi berbicara.
// - Tidak ada perintah medis. Ucapan yang ambigu/tidak dikenal dijawab dengan
//   kalimat tetap dan TIDAK memicu navigasi/aksi apa pun.
// - Modul ini tidak menyimpan audio/transkrip dan tidak melakukan request
//   jaringan. Adaptor boleh diinjeksi; tanpa adaptor, adaptor suara standar
//   dimuat malas (same-origin) hanya saat mendengarkan.
// - TTS disuntikkan lewat `tts` (fungsi atau objek `{ bacakan }`). Bila tidak
//   diberikan pada perintah bantuan, `suara/tts.js` dicoba dimuat malas; bila
//   tetap tidak ada, teks bantuan tetap diumumkan/ditampilkan.

import { kenaliPerintah, teksBantuan } from '../logic/perintahNavigasi.js';

/** Jawaban tetap untuk perintah tak dikenal/ambigu (persis kontrak). */
export const PESAN_TIDAK_DIKENALI =
  'Perintah tidak dikenali. Ucapkan bantuan untuk daftar perintah.';

const PESAN_PERINTAH = Object.freeze({
  obat: 'Membuka daftar obat.',
  ringkasan: 'Membuka ringkasan dokter.',
  darurat: 'Membuka kartu darurat.',
  beranda: 'Membuka beranda.',
  'isi-suara': 'Membuka Isi dengan Suara.',
  pemeriksaan: 'Membuka Pemeriksaan Pendamping.',
  'pengaturan-suara': 'Membuka Pengaturan Suara.',
  bantuan: 'Membuka bantuan perintah suara.',
  berhenti: 'Berhenti mendengarkan.'
});

function teksDariHasil(hasil) {
  if (typeof hasil === 'string') return hasil.trim();
  if (!hasil || typeof hasil !== 'object') return '';
  const teks = hasil.teks ?? hasil.text ?? hasil.transkrip ?? '';
  return String(teks ?? '').trim();
}

function pesanKesalahan(error) {
  const code = error && typeof error.code === 'string' ? error.code : '';
  const bawaan = error && typeof error.message === 'string' ? error.message.trim() : '';
  switch (code) {
    case 'MIKROFON_DITOLAK':
      return bawaan || 'Izin mikrofon ditolak. Semua fitur tetap dapat dipakai dengan tombol dan keyboard.';
    case 'SUARA_KOSONG':
      return 'Tidak ada ucapan yang dikenali. Coba lagi dengan suara lebih jelas.';
    case 'SUARA_TIMEOUT':
      return 'Tidak ada suara yang terdengar. Tekan Mulai bicara lalu ucapkan lagi.';
    case 'SUARA_TIDAK_TERSEDIA':
      return bawaan || 'Pengenalan suara tidak tersedia. Gunakan tombol dan isian biasa.';
    case 'PERSETUJUAN_DIPERLUKAN':
      return bawaan || 'Mesin suara bawaan peramban memerlukan persetujuan eksplisit sebelum dipakai.';
    case 'MODEL_TIDAK_TERSEDIA':
      return bawaan || 'Model suara offline belum tersedia. Gunakan tombol dan isian biasa.';
    default:
      return bawaan || 'Suara tidak dapat diproses. Coba lagi atau gunakan isian biasa.';
  }
}

function ambilPemanggilKenali(adaptor) {
  if (!adaptor) return null;
  if (typeof adaptor === 'function') return { fn: adaptor, konteks: null };
  for (const nama of ['kenali', 'kenaliSuara', 'dengarkan', 'dengar']) {
    if (typeof adaptor[nama] === 'function') {
      return { fn: adaptor[nama], konteks: adaptor };
    }
  }
  return null;
}

function ambilPemanggilBerhenti(adaptor) {
  if (!adaptor) return null;
  for (const nama of ['berhenti', 'hentikan', 'stop']) {
    if (typeof adaptor[nama] === 'function') {
      return { fn: adaptor[nama], konteks: adaptor };
    }
  }
  return null;
}

/**
 * Buat sesi navigasi suara satu-ucapan.
 * @param {object} opsi
 * @param {object|Function|null} opsi.adaptor adaptor suara (atau fungsi kenali)
 * @param {Function} opsi.navigate dipanggil dengan hash route
 * @param {Function|object|null} opsi.tts fungsi bacakan / objek { bacakan, hentikanBacaan }
 * @param {Function|null} opsi.umumkan callback live region (teks) -> void/Promise
 */
export function createNavigasiSuara({
  adaptor = null,
  navigate = null,
  tts = null,
  umumkan = null
} = {}) {
  let terminated = false;
  let sibuk = false;

  async function umumkanAman(teks) {
    if (!teks) return;
    if (typeof umumkan !== 'function') return;
    try {
      await umumkan(teks);
    } catch {
      // Callback UI tidak boleh menggagalkan navigasi.
    }
  }

  async function hentikanMikrofon() {
    const pemanggil = ambilPemanggilBerhenti(adaptor);
    if (!pemanggil) return;
    try {
      await pemanggil.fn.call(pemanggil.konteks);
    } catch {
      // Penghentian mikrofon tidak boleh menggagalkan hasil.
    }
  }

  async function dengarkanUcapan() {
    const pemanggil = ambilPemanggilKenali(adaptor);
    if (pemanggil) {
      return pemanggil.fn.call(pemanggil.konteks, {});
    }
    // Tanpa injeksi: adaptor standar dimuat malas (same-origin, tanpa jaringan luar).
    const modul = await import('./adaptor.js');
    return modul.kenaliSuara({});
  }

  async function lakukanNavigasi(route) {
    if (!route || typeof navigate !== 'function') return;
    try {
      await navigate(route);
    } catch {
      // Navigasi gagal tidak boleh memicu aksi lain.
    }
  }

  async function bacakanTeks(teks) {
    if (!teks) return { selesai: false, dibatalkan: false, tersedia: false };
    let fn = null;
    let konteks = null;
    if (typeof tts === 'function') {
      fn = tts;
    } else if (tts && typeof tts.bacakan === 'function') {
      fn = tts.bacakan;
      konteks = tts;
    } else if (tts && typeof tts.speak === 'function') {
      fn = tts.speak;
      konteks = tts;
    }

    if (!fn) {
      // t21 menyediakan suara/tts.js; dimuat malas hanya untuk bantuan.
      try {
        const modul = await import('./tts.js');
        if (modul && typeof modul.bacakan === 'function') fn = modul.bacakan;
      } catch {
        // TTS belum tersedia; teks tetap sudah diumumkan.
      }
    }
    if (!fn) return { selesai: false, dibatalkan: false, tersedia: false };

    try {
      return await fn.call(konteks, teks);
    } catch {
      return { selesai: false, dibatalkan: false, tersedia: false };
    }
  }

  function hasilTidakDikenal(teks, pesan, tambahan = {}) {
    return {
      dikenali: false,
      teks,
      pesan,
      id: null,
      frasa: null,
      route: null,
      action: null,
      skor: 0,
      ...tambahan
    };
  }

  async function dengarkanSekali() {
    if (terminated) {
      return hasilTidakDikenal('', 'Navigasi suara sudah dihentikan.');
    }
    if (sibuk) {
      return hasilTidakDikenal('', 'Sedang mendengarkan. Tunggu sampai selesai.');
    }
    sibuk = true;
    try {
      let hasilUcapan;
      try {
        hasilUcapan = await dengarkanUcapan();
      } catch (error) {
        // Mikrofon berhenti juga saat pengenalan gagal.
        await hentikanMikrofon();
        const pesan = pesanKesalahan(error);
        await umumkanAman(pesan);
        return hasilTidakDikenal('', pesan, {
          error: error && typeof error.code === 'string' ? error.code : null
        });
      }

      const teks = teksDariHasil(hasilUcapan);

      // Wajib: mikrofon berhenti SEBELUM pengumuman/TTS.
      await hentikanMikrofon();

      const perintah = teks ? kenaliPerintah(teks) : null;
      if (!perintah) {
        // Ambigu dan tak dikenal diperlakukan sama: aman, tanpa aksi.
        await umumkanAman(PESAN_TIDAK_DIKENALI);
        return hasilTidakDikenal(teks, PESAN_TIDAK_DIKENALI);
      }

      if (perintah.action === 'berhenti') {
        const pesan = PESAN_PERINTAH.berhenti;
        await umumkanAman(pesan);
        return {
          ...perintah,
          dikenali: true,
          teks,
          pesan
        };
      }

      if (perintah.id === 'bantuan') {
        const teksPerintah = teksBantuan();
        // Tampilkan/umumkan teks lebih dulu, lalu buka layar bantuan, lalu bacakan.
        await umumkanAman(teksPerintah);
        await lakukanNavigasi(perintah.route);
        const bacaan = await bacakanTeks(teksPerintah);
        return {
          ...perintah,
          dikenali: true,
          teks,
          pesan: teksPerintah,
          tts: bacaan
        };
      }

      const pesan = PESAN_PERINTAH[perintah.id] || `Membuka ${perintah.id}.`;
      await umumkanAman(pesan);
      await lakukanNavigasi(perintah.route);
      return {
        ...perintah,
        dikenali: true,
        teks,
        pesan
      };
    } finally {
      sibuk = false;
    }
  }

  async function mulai() {
    if (terminated) return false;
    if (adaptor && typeof adaptor.mulai === 'function') {
      await adaptor.mulai();
      return true;
    }
    return false;
  }

  async function berhenti() {
    await hentikanMikrofon();
    try {
      if (tts && typeof tts.hentikanBacaan === 'function') tts.hentikanBacaan();
    } catch {
      // abaikan
    }
  }

  async function terminate() {
    if (terminated) return;
    terminated = true;
    await berhenti();
    if (adaptor && typeof adaptor.terminate === 'function') {
      try {
        await adaptor.terminate();
      } catch {
        // Pelepasan adaptor tidak boleh menggagalkan pemanggil.
      }
    }
  }

  return { dengarkanSekali, mulai, berhenti, terminate };
}

/**
 * Jalankan satu perintah suara lalu lepas adaptor (one-shot).
 * @returns {Promise<object>} hasil `dengarkanSekali` (tidak melempar untuk
 *   kegagalan pengenalan biasa; kegagalan diumumkan sebagai pesan).
 */
export async function jalankanPerintahSuara({
  adaptor = null,
  navigate = null,
  tts = null,
  umumkan = null
} = {}) {
  const navigasi = createNavigasiSuara({ adaptor, navigate, tts, umumkan });
  try {
    return await navigasi.dengarkanSekali();
  } finally {
    await navigasi.terminate();
  }
}
