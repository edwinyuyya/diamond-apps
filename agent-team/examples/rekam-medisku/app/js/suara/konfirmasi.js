/**
 * Integrasi konfirmasi suara: TTS + dengar jawaban (CONTRACT.md 8B.6).
 *
 * Fungsi ini TIDAK menyimpan apa pun. Ia hanya mengembalikan keputusan
 * `'simpan' | 'batal' | 'ulangi-entri'` kepada layar pemanggil.
 *
 * Urutan wajib pada setiap pembacaan:
 *   await adaptor.berhenti()  -> mikrofon tidak mendengar suara aplikasi
 *   await tts.bacakan(...)
 *   await adaptor.mulai()     -> dengarkan jawaban
 */

import {
  PERTANYAAN_KONFIRMASI,
  MAKS_PERTANYAAN_ULANG,
  buatSesiKonfirmasi,
  jawabKonfirmasi
} from '../logic/konfirmasiSuara.js';
import { bacakan as bacakanBawaan } from './tts.js';

export { PERTANYAAN_KONFIRMASI, MAKS_PERTANYAAN_ULANG };

/** Ambil fungsi pembaca dari modul TTS atau objek/fungsi yang diinjeksi. */
function ambilBacakan(tts) {
  if (typeof tts === 'function') return tts;
  if (tts && typeof tts.bacakan === 'function') {
    return (teks, opsi) => tts.bacakan(teks, opsi);
  }
  return bacakanBawaan;
}

function teksDariHasil(hasil) {
  if (typeof hasil === 'string') return hasil;
  if (hasil && typeof hasil === 'object' && typeof hasil.teks === 'string') {
    return hasil.teks;
  }
  return '';
}

function dipanggil(adaptor, nama) {
  return adaptor && typeof adaptor[nama] === 'function';
}

/**
 * Jalankan alur konfirmasi ya/tidak berbasis suara.
 *
 * @param {{
 *   adaptor: object,
 *   tts?: object|Function|null,
 *   ringkasan?: string,
 *   onTanya?: Function|null,
 *   signal?: AbortSignal|null,
 *   maksUlang?: number
 * }} opsi
 * @returns {Promise<{keputusan:'simpan'|'batal'|'ulangi-entri',
 *   jawabanTerakhir:string|null, jumlahTanyaUlang:number, sesi:object}>}
 */
export async function jalankanKonfirmasiSuara({
  adaptor,
  tts,
  ringkasan = '',
  onTanya = null,
  signal = null,
  maksUlang = MAKS_PERTANYAAN_ULANG
} = {}) {
  if (!adaptor || typeof adaptor !== 'object' || !dipanggil(adaptor, 'berhenti')) {
    throw new TypeError(
      'jalankanKonfirmasiSuara memerlukan adaptor dengan metode berhenti().'
    );
  }

  const bacakan = ambilBacakan(tts);
  const ringkasanTeks = typeof ringkasan === 'string' ? ringkasan.trim() : '';

  let sesi = buatSesiKonfirmasi({ ringkasan: ringkasanTeks, maksUlang });
  let pertama = true;
  let ucapan = ringkasanTeks
    ? `${ringkasanTeks} ${PERTANYAAN_KONFIRMASI}`
    : PERTANYAAN_KONFIRMASI;

  const tolak = (keputusan) => ({
    keputusan,
    jawabanTerakhir: sesi.jawabanTerakhir,
    jumlahTanyaUlang: sesi.jumlahTanyaUlang,
    sesi
  });

  while (sesi.status === 'menunggu') {
    if (signal && signal.aborted) return tolak('batal');

    // 1. Mikrofon berhenti SEBELUM suara aplikasi berbunyi.
    try {
      await adaptor.berhenti();
    } catch {
      // Penghentian mikrofon tidak boleh menghalangi pembacaan teks.
    }

    if (typeof onTanya === 'function') {
      try {
        onTanya(PERTANYAAN_KONFIRMASI, { sesi, pertama });
      } catch {
        // Callback tampilan tidak boleh menggagalkan alur.
      }
    }

    // 2. Bacakan ringkasan (pertama kali) + pertanyaan.
    try {
      await bacakan(ucapan, { signal });
    } catch {
      // TTS tidak tersedia: teks tetap ditampilkan oleh onTanya dan konfirmasi
      // tetap wajib. Lanjutkan mendengarkan jawaban.
    }

    if (signal && signal.aborted) return tolak('batal');

    // 3. Nyalakan mikrofon lagi, lalu dengarkan jawaban.
    if (dipanggil(adaptor, 'mulai')) {
      try {
        await adaptor.mulai();
      } catch {
        // Gagal menyalakan mikrofon -> jawaban dianggap tidak jelas.
      }
    }

    let jawaban = '';
    if (dipanggil(adaptor, 'kenali')) {
      try {
        jawaban = teksDariHasil(await adaptor.kenali({ signal }));
      } catch (error) {
        if ((signal && signal.aborted) || error?.name === 'AbortError') {
          return tolak('batal');
        }
        jawaban = '';
      }
    }

    if (signal && signal.aborted) return tolak('batal');

    const hasil = jawabKonfirmasi(sesi, jawaban);
    sesi = hasil.sesi;
    pertama = false;

    if (hasil.aksi === 'simpan') return tolak('simpan');
    if (hasil.aksi === 'ulangi-entri') return tolak('ulangi-entri');
    if (hasil.aksi === 'batal') return tolak('batal');

    ucapan = hasil.ucapan || PERTANYAAN_KONFIRMASI;
  }

  return tolak('batal');
}
