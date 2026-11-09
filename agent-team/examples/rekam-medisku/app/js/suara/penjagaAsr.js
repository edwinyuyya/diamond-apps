// Rekam Medisku — penjaga ASR (CONTRACT.md 8B.11).
//
// Modul MURNI: bebas DOM, bebas timer, bebas dependency, dan deterministik.
// Semua hasil mesin (Whisper offline maupun Web Speech) wajib melewati modul ini
// sebelum di-parse. Modul tidak memperbaiki/menebak kata dan tidak memanggil parser.
//
// Penggunaan tipikal:
//   const cek = periksaHasilAsr({ teks, durasiMs }, { maksDurasiMs: 8000 });
//   if (!cek.ok) -> perlakukan sebagai "tidak terdengar" (ulangi atau tombol).

export const MAKS_DURASI_REKAM_MS = 8000;
export const TOLERANSI_DURASI_MS = 500;
export const MAKS_TOKEN_KELUARAN = 48;
export const MAKS_KARAKTER = 240;
export const RASIO_HURUF_MIN = 0.55;
export const PENGULANGAN_MAKS = 3;

const PESAN_TERLALU_LAMA =
  'Rekaman terlalu lama. Jawab singkat, maksimal delapan detik.';
const PESAN_TIDAK_TERDENGAR =
  'Tidak terdengar dengan jelas. Silakan ulangi atau pilih tombol.';

function rapikan(teks) {
  if (typeof teks !== 'string') return '';
  return teks.normalize('NFKC').replace(/\s+/g, ' ').trim();
}

/** Pesan Indonesia untuk kode penolakan ASR (untuk UI/TTS). */
export function ringkasTolakAsr(kode) {
  if (kode === 'ASR_TERLALU_LAMA') return PESAN_TERLALU_LAMA;
  // ASR_BERULANG, ASR_TIDAK_TERDENGAR, dan kode tak dikenal: ulangi dengan jelas.
  return PESAN_TIDAK_TERDENGAR;
}

/**
 * Memeriksa durasi rekaman.
 * - durasi <= maksMs + 500 -> ok
 * - durasi > maksMs + 500 -> ASR_TERLALU_LAMA
 * - nilai negatif/NaN/tidak valid -> ditolak (ASR_TERLALU_LAMA)
 */
export function periksaDurasi(durasiMs, { maksMs = MAKS_DURASI_REKAM_MS } = {}) {
  const nilai = Number(durasiMs);
  const batas = Number.isFinite(Number(maksMs)) ? Number(maksMs) : MAKS_DURASI_REKAM_MS;

  if (!Number.isFinite(nilai) || nilai < 0) {
    return {
      ok: false,
      kode: 'ASR_TERLALU_LAMA',
      pesan: 'Durasi rekaman tidak valid.'
    };
  }
  if (nilai > batas + TOLERANSI_DURASI_MS) {
    return { ok: false, kode: 'ASR_TERLALU_LAMA', pesan: PESAN_TERLALU_LAMA };
  }
  return { ok: true, kode: null, pesan: '' };
}

function polaBerulang(teks, mulai, panjang, maks) {
  const unit = teks.slice(mulai, mulai + panjang);
  if (!unit) return 0;
  let posisi = mulai;
  let jumlah = 0;
  while (teks.startsWith(unit, posisi)) {
    jumlah += 1;
    posisi += panjang;
    if (jumlah > maks) break;
  }
  return jumlah;
}

/**
 * Mendeteksi pengulangan token yang sama >= (maks+1) kali berturut-turut, atau
 * pola panjang 1–8 karakter berulang >= (maks+1) kali berturut-turut.
 * Contoh wajib ditolak: '2.2.2.2.2.2.2.2', 'bla bla bla bla bla', 'aaaaaaa'.
 * Tidak memutasi input. Deterministik.
 */
export function deteksiPengulangan(teks, { maks = PENGULANGAN_MAKS } = {}) {
  const bersih = rapikan(teks);
  const ambang = Number.isFinite(Number(maks)) && Number(maks) >= 1
    ? Math.floor(Number(maks))
    : PENGULANGAN_MAKS;

  if (!bersih) return { berulang: false, pola: null, jumlah: 0 };

  // (a) token yang sama berulang berturut-turut.
  const token = bersih.toLowerCase().split(' ');
  let tokenSama = 1;
  for (let i = 1; i < token.length; i += 1) {
    tokenSama = token[i] === token[i - 1] ? tokenSama + 1 : 1;
    if (tokenSama > ambang) {
      return {
        berulang: true,
        pola: token[i],
        jumlah: tokenSama
      };
    }
  }

  // (b) pola karakter 1–8 yang berulang berturut-turut (menangkap '2.2.2.2.2...').
  const hurufKecil = bersih.toLowerCase();
  for (let i = 0; i < hurufKecil.length; i += 1) {
    for (let panjang = 1; panjang <= 8; panjang += 1) {
      if (i + panjang * (ambang + 1) > hurufKecil.length) continue;
      const jumlah = polaBerulang(hurufKecil, i, panjang, ambang);
      if (jumlah > ambang) {
        return {
          berulang: true,
          pola: hurufKecil.slice(i, i + panjang),
          jumlah
        };
      }
    }
  }

  return { berulang: false, pola: null, jumlah: 0 };
}

function hitungKelas(teks) {
  let huruf = 0;
  let digit = 0;
  let tanda = 0;
  for (const karakter of teks) {
    if (/\p{L}/u.test(karakter)) huruf += 1;
    else if (/\p{N}/u.test(karakter)) digit += 1;
    else if (/[\p{P}\p{S}]/u.test(karakter)) tanda += 1;
  }
  return { huruf, digit, tanda };
}

/**
 * Memeriksa keluaran ASR (tanpa durasi). Urutan aturan:
 * kosong -> terlalu panjang -> pengulangan -> rasio huruf.
 * -> { ok, kode, alasan, teksBersih }
 * Teks yang lolos dikembalikan apa adanya (setelah NFKC + rapikan spasi).
 */
export function periksaKeluaranAsr(teks, {
  maksToken = MAKS_TOKEN_KELUARAN,
  maksKarakter = MAKS_KARAKTER
} = {}) {
  const teksBersih = rapikan(teks);
  const batasToken = Number.isFinite(Number(maksToken)) ? Number(maksToken) : MAKS_TOKEN_KELUARAN;
  const batasKarakter =
    Number.isFinite(Number(maksKarakter)) ? Number(maksKarakter) : MAKS_KARAKTER;

  if (!teksBersih) {
    return {
      ok: false,
      kode: 'ASR_TIDAK_TERDENGAR',
      alasan: 'kosong',
      teksBersih: ''
    };
  }

  const jumlahToken = teksBersih.split(' ').filter(Boolean).length;
  if (teksBersih.length > batasKarakter || jumlahToken > batasToken) {
    return {
      ok: false,
      kode: 'ASR_TIDAK_TERDENGAR',
      alasan: 'terlalu-panjang',
      teksBersih
    };
  }

  const pengulangan = deteksiPengulangan(teksBersih);
  if (pengulangan.berulang) {
    return {
      ok: false,
      kode: 'ASR_BERULANG',
      alasan: 'berulang',
      teksBersih
    };
  }

  // Jawaban angka pendek (mis. '2', '12') selalu diterima sebagai jawaban.
  const angkaPendek = teksBersih.length <= 3 && /^\p{N}+$/u.test(teksBersih);
  if (!angkaPendek && teksBersih.length >= 8) {
    const { huruf, digit, tanda } = hitungKelas(teksBersih);
    const penyebut = huruf + digit + tanda;
    const rasio = penyebut > 0 ? huruf / penyebut : 0;
    if (rasio < RASIO_HURUF_MIN) {
      return {
        ok: false,
        kode: 'ASR_TIDAK_TERDENGAR',
        alasan: 'bukan-kata',
        teksBersih
      };
    }
  }

  return { ok: true, kode: null, alasan: null, teksBersih };
}

/**
 * Menggabungkan pemeriksaan durasi dan keluaran.
 * -> { ok, kode, alasan, hasil }
 * `hasil: null` saat ditolak. Tidak memutasi objek input.
 * Durasi yang tidak disertakan dianggap 0 (tidak diketahui, bukan terlalu lama).
 */
export function periksaHasilAsr(hasil, {
  maksDurasiMs = MAKS_DURASI_REKAM_MS,
  maksToken = MAKS_TOKEN_KELUARAN
} = {}) {
  const sumber = hasil && typeof hasil === 'object' ? hasil : {};
  const teks = typeof sumber.teks === 'string' ? sumber.teks : '';

  const durasiMasukan =
    sumber.durasiMs === null || sumber.durasiMs === undefined ? 0 : sumber.durasiMs;

  const cekDurasi = periksaDurasi(durasiMasukan, { maksMs: maksDurasiMs });
  if (!cekDurasi.ok) {
    return {
      ok: false,
      kode: cekDurasi.kode,
      alasan: 'durasi',
      hasil: null
    };
  }

  const cekKeluaran = periksaKeluaranAsr(teks, { maksToken });
  if (!cekKeluaran.ok) {
    return {
      ok: false,
      kode: cekKeluaran.kode,
      alasan: cekKeluaran.alasan,
      hasil: null
    };
  }

  return {
    ok: true,
    kode: null,
    alasan: null,
    hasil: { ...sumber, teks: cekKeluaran.teksBersih }
  };
}
