// Rekam Medisku — orkestrasi tanya obat satu per satu (t33, CONTRACT.md 8B.15).
//
// Aturan penting yang dijaga modul ini:
// - mikrofon SELALU berhenti sebelum TTS berbunyi, lalu dinyalakan lagi;
// - satu ucapan ASR = satu jawaban; penjaga ASR (8B.11) diperlakukan sebagai
//   kegagalan paham, bukan jawaban;
// - lima jawaban tertutup -> konfirmasi persis 8B.6;
// - hanya keputusan `simpan` yang memanggil `selesaikanSesi` + `state.upsert`;
// - tidak menyimpan audio/transkrip/sesi parsial ke storage dan tidak ada
//   request jaringan.

import {
  buatSesiTanya,
  pertanyaanSaatIni,
  jawabTanya,
  pilihJawabanTombol,
  ketikJawaban,
  lanjutKeKonfirmasi,
  ringkasSesi,
  selesaikanSesi,
  bangunMedicationDariSesi
} from '../logic/tanyaSatuPerSatu.js';
import { validasiNamaObat } from '../logic/pemilihNamaObat.js';
import {
  PERTANYAAN_KONFIRMASI,
  buatSesiKonfirmasi,
  jawabKonfirmasi
} from '../logic/konfirmasiSuara.js';
import { jalankanKonfirmasiSuara } from './konfirmasi.js';
import {
  bacakanPertanyaan,
  bacakanTeksTanya,
  teksKonfirmasiTanya
} from './ttsTanya.js';
import { MAKS_DURASI_REKAM_MS } from './penjagaAsr.js';

// Kontrak 8B.15: implementasi tetap di modul logika; re-export untuk kenyamanan.
export { bangunMedicationDariSesi };

const KODE_ASR_DITOLAK = new Set([
  'ASR_TIDAK_TERDENGAR',
  'ASR_TERLALU_LAMA',
  'ASR_BERULANG',
  'SUARA_KOSONG',
  'SUARA_TIMEOUT'
]);

function panggil(callback, ...args) {
  if (typeof callback !== 'function') return;
  try {
    callback(...args);
  } catch {
    // Callback UI tidak boleh menggagalkan alur.
  }
}

function dipanggil(adaptor, nama) {
  return Boolean(adaptor) && typeof adaptor[nama] === 'function';
}

function bisaSuara(adaptor) {
  return dipanggil(adaptor, 'berhenti')
    && dipanggil(adaptor, 'mulai')
    && dipanggil(adaptor, 'kenali');
}

function teksDariHasil(hasil) {
  if (typeof hasil === 'string') return hasil.trim();
  if (hasil && typeof hasil === 'object' && typeof hasil.teks === 'string') {
    return hasil.teks.trim();
  }
  return '';
}

function normalkanJawabanManual(jawaban) {
  if (jawaban === null || jawaban === undefined) return null;
  if (typeof jawaban === 'string') return { jenis: 'ketik', teks: jawaban };
  if (typeof jawaban === 'object') {
    if (jawaban.jenis === 'tombol') return { jenis: 'tombol', nilai: jawaban.nilai };
    if (Object.prototype.hasOwnProperty.call(jawaban, 'nilai')) {
      return { jenis: 'tombol', nilai: jawaban.nilai };
    }
    return { jenis: 'ketik', teks: String(jawaban.teks ?? jawaban.text ?? '') };
  }
  return { jenis: 'tombol', nilai: jawaban };
}

function teksKonfirmasiDariJawaban(jawaban) {
  if (jawaban === true) return 'ya';
  if (jawaban === false) return 'tidak';
  if (typeof jawaban === 'string') return jawaban;
  if (jawaban && typeof jawaban === 'object') {
    if (jawaban.nilai === true) return 'ya';
    if (jawaban.nilai === false) return 'tidak';
    if (typeof jawaban.teks === 'string') return jawaban.teks;
    if (typeof jawaban.nilai === 'string') return jawaban.nilai;
  }
  return '';
}

function hasil(keputusan, sesi, medication, jawabanTerakhir = null) {
  return { keputusan, sesi: sesi ?? null, medication: medication ?? null, jawabanTerakhir };
}

function batasDurasi(maksDurasiMs) {
  const nilai = Number(maksDurasiMs);
  if (Number.isFinite(nilai) && nilai > 0) return Math.floor(nilai);
  return MAKS_DURASI_REKAM_MS;
}

/** Konfirmasi memakai tombol/ketik saja (tanpa mikrofon). */
async function konfirmasiManual({
  adaptor, tts, ringkasan, mintaJawaban, signal, onTanya
}) {
  let sesiKonfirmasi = buatSesiKonfirmasi({ ringkasan });
  let ucapan = teksKonfirmasiTanya(ringkasan);
  let pertama = true;

  while (sesiKonfirmasi.status === 'menunggu') {
    if (signal && signal.aborted) {
      return { keputusan: 'batal', jawabanTerakhir: sesiKonfirmasi.jawabanTerakhir, sesi: sesiKonfirmasi };
    }
    if (dipanggil(adaptor, 'berhenti')) {
      try {
        await adaptor.berhenti();
      } catch {
        // abaikan
      }
    }
    panggil(onTanya, PERTANYAAN_KONFIRMASI, { sesi: sesiKonfirmasi, pertama });
    await bacakanTeksTanya(tts, ucapan, { signal });
    if (signal && signal.aborted) {
      return { keputusan: 'batal', jawabanTerakhir: sesiKonfirmasi.jawabanTerakhir, sesi: sesiKonfirmasi };
    }

    const jawaban = await mintaJawaban(
      {
        id: 'konfirmasi',
        tipe: 'konfirmasi',
        pertanyaan: PERTANYAAN_KONFIRMASI,
        pilihan: ['ya', 'tidak'],
        label: { ya: 'Ya, benar', tidak: 'Tidak' }
      },
      { sesi: sesiKonfirmasi, konfirmasi: true, pertama }
    );
    pertama = false;
    const hasilKonfirmasi = jawabKonfirmasi(sesiKonfirmasi, teksKonfirmasiDariJawaban(jawaban));
    sesiKonfirmasi = hasilKonfirmasi.sesi;

    if (hasilKonfirmasi.aksi === 'simpan'
        || hasilKonfirmasi.aksi === 'ulangi-entri'
        || hasilKonfirmasi.aksi === 'batal') {
      return {
        keputusan: hasilKonfirmasi.aksi,
        jawabanTerakhir: sesiKonfirmasi.jawabanTerakhir,
        sesi: sesiKonfirmasi
      };
    }
    ucapan = hasilKonfirmasi.ucapan || PERTANYAAN_KONFIRMASI;
  }

  return { keputusan: 'batal', jawabanTerakhir: sesiKonfirmasi.jawabanTerakhir, sesi: sesiKonfirmasi };
}

/**
 * Jalankan alur tanya satu per satu sampai keputusan konfirmasi.
 *
 * @param {{
 *   adaptor: object,
 *   tts?: object|Function|null,
 *   state?: object|null,
 *   profileId?: string|null,
 *   sumberNama?: string,
 *   namaAwal?: string|null,
 *   onPertanyaan?: Function|null,
 *   onHasil?: Function|null,
 *   onStatus?: Function|null,
 *   onTolakAsr?: Function|null,
 *   mintaNama?: Function|null,
 *   mintaJawaban?: Function|null,
 *   signal?: AbortSignal|null,
 *   maksDurasiMs?: number,
 *   now?: Date|string
 * }} [opsi]
 * @returns {Promise<{keputusan:'simpan'|'batal'|'ulangi', sesi:object|null,
 *   medication:object|null, jawabanTerakhir:string|null}>}
 */
export async function jalankanTanyaSatuPerSatu({
  adaptor = null,
  tts = null,
  state = null,
  profileId = null,
  sumberNama = 'daftar',
  namaAwal = null,
  onPertanyaan = null,
  onHasil = null,
  onStatus = null,
  onTolakAsr = null,
  mintaNama = null,
  mintaJawaban = null,
  signal = null,
  maksDurasiMs = MAKS_DURASI_REKAM_MS,
  now = new Date()
} = {}) {
  const abort = () => signal && signal.aborted;
  const laporStatus = (status, sesi) => panggil(onStatus, {
    status,
    langkah: sesi ? sesi.langkah : null,
    sesi: sesi ?? null
  });

  // -------------------------------------------------------------------
  // 1. Nama obat tidak pernah dari ASR bebas (8B.14).
  // -------------------------------------------------------------------
  let nama = typeof namaAwal === 'string' ? namaAwal.trim() : '';
  let sumber = sumberNama;
  if (nama === '' && typeof mintaNama === 'function') {
    let pilihanNama = null;
    try {
      pilihanNama = await mintaNama({ sumberNama });
    } catch {
      pilihanNama = null;
    }
    if (abort()) return hasil('batal', null, null);
    if (pilihanNama && typeof pilihanNama === 'object') {
      nama = String(pilihanNama.nama ?? '').trim();
      sumber = pilihanNama.sumber ?? sumber;
    }
  }

  const namaValid = validasiNamaObat(nama);
  if (!namaValid.ok) {
    laporStatus('batal', null);
    return hasil('batal', null, null);
  }

  let sesi = buatSesiTanya({
    profileId,
    sumberNama: sumber,
    nama: namaValid.nama,
    now
  });

  const batas = batasDurasi(maksDurasiMs);
  const suaraTersedia = bisaSuara(adaptor);
  if (!suaraTersedia && typeof mintaJawaban !== 'function') {
    laporStatus('batal', sesi);
    return hasil('batal', sesi, null);
  }

  const berhentiMikrofon = async () => {
    if (!dipanggil(adaptor, 'berhenti')) return;
    try {
      await adaptor.berhenti();
    } catch {
      // Penghentian mikrofon tidak boleh menggagalkan alur.
    }
  };

  // -------------------------------------------------------------------
  // 2. Lima pertanyaan tertutup.
  // -------------------------------------------------------------------
  for (;;) {
    if (abort()) return hasil('batal', null, null);
    if (!sesi || sesi.langkah === 'konfirmasi' || sesi.langkah === 'selesai') break;

    const pertanyaan = pertanyaanSaatIni(sesi);
    if (!pertanyaan || pertanyaan.id === 'nama') {
      laporStatus('batal', sesi);
      return hasil('batal', sesi, null);
    }

    panggil(onPertanyaan, pertanyaan);
    laporStatus('bertanya', sesi);

    // Wajib: mikrofon berhenti sebelum aplikasi berbicara.
    await berhentiMikrofon();
    if (abort()) return hasil('batal', null, null);

    laporStatus('membacakan', sesi);
    await bacakanPertanyaan(tts, pertanyaan.id, sesi, { signal });
    if (abort()) return hasil('batal', null, null);

    // Setelah dua kegagalan paham: tombol/ketik, bukan ASR tanpa batas.
    if (sesi.modeTombol) {
      await berhentiMikrofon();
      laporStatus('menunggu-tombol', sesi);
      if (typeof mintaJawaban !== 'function') {
        return hasil('batal', sesi, null);
      }
      const jawabanManual = await mintaJawaban(pertanyaan, {
        sesi,
        langkah: sesi.langkah,
        sumber: 'tombol'
      });
      if (abort()) return hasil('batal', null, null);
      if (jawabanManual === null || jawabanManual === undefined) {
        return hasil('batal', sesi, null);
      }

      const data = normalkanJawabanManual(jawabanManual);
      let hasilLangkah;
      try {
        hasilLangkah = data.jenis === 'tombol'
          ? pilihJawabanTombol(sesi, data.nilai)
          : ketikJawaban(sesi, data.teks);
      } catch {
        hasilLangkah = null;
      }
      if (!hasilLangkah) return hasil('batal', sesi, null);
      sesi = hasilLangkah.sesi;
      panggil(onHasil, hasilLangkah);
      laporStatus(hasilLangkah.aksi === 'terima' ? 'terima' : hasilLangkah.aksi, sesi);
      if (hasilLangkah.error && hasilLangkah.aksi === 'tidak-berlaku') {
        return hasil('batal', sesi, null);
      }
      continue;
    }

    // Satu ucapan = satu jawaban. Guard 8B.11 sudah aktif di adaptor.
    laporStatus('mendengarkan', sesi);
    let hasilLangkah = null;
    try {
      await adaptor.mulai();
      const hasilAsr = await adaptor.kenali({ signal, maksDurasiMs: batas });
      if (abort()) return hasil('batal', null, null);
      const teks = teksDariHasil(hasilAsr);
      if (teks === '') {
        panggil(onTolakAsr, 'SUARA_KOSONG', null);
        hasilLangkah = jawabTanya(sesi, '');
      } else {
        hasilLangkah = jawabTanya(sesi, teks);
      }
    } catch (error) {
      if (abort() || error?.name === 'AbortError') {
        return hasil('batal', null, null);
      }
      const kode = typeof error?.code === 'string' ? error.code : 'ASR_TIDAK_TERDENGAR';
      panggil(onTolakAsr, KODE_ASR_DITOLAK.has(kode) ? kode : 'ASR_TIDAK_TERDENGAR', error);
      // Penjaga ASR/error mikrofon dihitung satu kegagalan paham.
      hasilLangkah = jawabTanya(sesi, '');
    }

    if (!hasilLangkah) return hasil('batal', sesi, null);
    sesi = hasilLangkah.sesi;
    panggil(onHasil, hasilLangkah);
    laporStatus(hasilLangkah.aksi, sesi);

    if (hasilLangkah.aksi === 'tolak-nama-dari-suara'
        || hasilLangkah.aksi === 'batal'
        || hasilLangkah.aksi === 'tidak-berlaku') {
      return hasil('batal', sesi, null);
    }
    if (hasilLangkah.aksi === 'tombol') {
      await berhentiMikrofon();
    }
    // 'ulangi' dan 'tombol' kembali ke awal loop; 'terima' lanjut ke langkah
    // berikutnya. Tidak ada pemaksaan pencocokan.
  }

  // -------------------------------------------------------------------
  // 3. Konfirmasi wajib; tidak ada penulisan sebelum ini.
  // -------------------------------------------------------------------
  const lanjut = lanjutKeKonfirmasi(sesi);
  sesi = lanjut.sesi;
  if (lanjut.aksi !== 'konfirmasi' || !sesi || sesi.langkah !== 'konfirmasi') {
    laporStatus('batal', sesi);
    return hasil('batal', sesi, null);
  }

  panggil(onPertanyaan, lanjut.pertanyaan);
  laporStatus('konfirmasi', sesi);
  await berhentiMikrofon();
  if (abort()) return hasil('batal', null, null);

  const ringkasan = ringkasSesi(sesi);
  let keputusanKonfirmasi = 'batal';
  let jawabanTerakhir = null;

  const onTanyaKonfirmasi = (pertanyaan, info) => {
    panggil(onPertanyaan, {
      id: 'konfirmasi',
      tipe: 'konfirmasi',
      pertanyaan,
      pilihan: ['ya', 'tidak']
    });
    laporStatus('konfirmasi', (info && info.sesi) || sesi);
  };

  // Bila UI menyediakan jalur tombol/ketik, pakai itu (tombol besar selalu
  // setara dengan suara). Tanpa itu, konfirmasi memakai mikrofon.
  if (typeof mintaJawaban === 'function') {
    const konfirmasi = await konfirmasiManual({
      adaptor,
      tts,
      ringkasan,
      mintaJawaban,
      signal,
      onTanya: onTanyaKonfirmasi
    });
    keputusanKonfirmasi = konfirmasi.keputusan;
    jawabanTerakhir = konfirmasi.jawabanTerakhir ?? null;
  } else if (suaraTersedia) {
    const konfirmasi = await jalankanKonfirmasiSuara({
      adaptor,
      tts,
      ringkasan,
      signal,
      onTanya: onTanyaKonfirmasi
    });
    keputusanKonfirmasi = konfirmasi.keputusan;
    jawabanTerakhir = konfirmasi.jawabanTerakhir ?? null;
  }

  if (abort()) return hasil('batal', null, null);

  if (keputusanKonfirmasi === 'simpan') {
    // Hanya di sini Medication dibangun dan ditulis.
    const selesai = selesaikanSesi(sesi, { simpan: true, now });
    if (!selesai.medication) {
      laporStatus('batal', selesai.sesi);
      return hasil('batal', selesai.sesi, null, jawabanTerakhir);
    }
    if (state && typeof state.upsert === 'function') {
      await state.upsert('medications', selesai.medication);
    }
    laporStatus('tersimpan', selesai.sesi);
    return hasil('simpan', selesai.sesi, selesai.medication, jawabanTerakhir);
  }

  if (keputusanKonfirmasi === 'ulangi-entri') {
    // Tidak menyimpan dan tidak memanggil selesaikanSesi.
    laporStatus('ulangi', sesi);
    return hasil('ulangi', sesi, null, jawabanTerakhir);
  }

  laporStatus('batal', sesi);
  return hasil('batal', sesi, null, jawabanTerakhir);
}
