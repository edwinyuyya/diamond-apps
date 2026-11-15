// Rekam Medisku — mesin pengenalan suara bawaan peramban (Web Speech API).
// Opsional, hanya dipakai setelah persetujuan eksplisit (lihat persetujuan.js).
// Tidak menyimpan audio maupun transkrip: semua hasil hanya dikembalikan ke pemanggil
// dan dibuang setelah satu ucapan selesai.

export const WEB_SPEECH_LANG = 'id-ID';

const PESAN = {
  SUARA_TIDAK_TERSEDIA:
    'Pengenalan suara bawaan peramban tidak tersedia di peramban ini. Gunakan tombol dan isian biasa.',
  MIKROFON_DITOLAK:
    'Izin mikrofon ditolak. Semua fitur tetap dapat dipakai dengan tombol dan keyboard.',
  SUARA_KOSONG: 'Tidak ada ucapan yang dikenali. Coba lagi dengan suara lebih jelas.',
  SUARA_GAGAL: 'Suara tidak dapat diproses. Coba lagi atau gunakan isian biasa.'
};

const KODE = {
  MIKROFON_DITOLAK: 'MIKROFON_DITOLAK',
  SUARA_KOSONG: 'SUARA_KOSONG',
  SUARA_GAGAL: 'SUARA_GAGAL',
  SUARA_TIDAK_TERSEDIA: 'SUARA_TIDAK_TERSEDIA'
};

function kesalahanSuara(code) {
  const error = new Error(PESAN[code] || PESAN.SUARA_GAGAL);
  error.name = 'SuaraError';
  error.code = code;
  return error;
}

function bacaKonstruktor() {
  try {
    if (typeof globalThis === 'undefined') return null;
    return globalThis.SpeechRecognition || globalThis.webkitSpeechRecognition || null;
  } catch {
    return null;
  }
}

export function webSpeechTersedia() {
  return Boolean(bacaKonstruktor());
}

function kodeDariErrorWebSpeech(nama) {
  if (nama === 'not-allowed' || nama === 'service-not-allowed') {
    return KODE.MIKROFON_DITOLAK;
  }
  if (nama === 'no-speech') return KODE.SUARA_KOSONG;
  return KODE.SUARA_GAGAL;
}

function normalisasiAlternatif(hasil) {
  const alternatif = [];
  let kepercayaan = null;
  if (!hasil || typeof hasil.length !== 'number') return { teks: '', kepercayaan, alternatif };

  for (let i = 0; i < hasil.length && alternatif.length < 3; i += 1) {
    const item = hasil[i] || {};
    const teks = typeof item.transcript === 'string' ? item.transcript.trim() : '';
    if (!teks) continue;
    if (alternatif.length === 0) {
      kepercayaan = typeof item.confidence === 'number' && Number.isFinite(item.confidence)
        ? Math.min(1, Math.max(0, item.confidence))
        : null;
    }
    if (!alternatif.includes(teks)) alternatif.push(teks);
  }

  const teks = alternatif.length > 0 ? alternatif[0] : '';
  return { teks, kepercayaan, alternatif: alternatif.slice(1) };
}

// Engine mengikuti antarmuka 8B.2: { id, lokal, start(), stop(), recognize() }.
// Satu ucapan per recognize(); mikrofon ditangani peramban, bukan kode aplikasi.
export function buatWebSpeechEngine({
  SpeechRecognition = bacaKonstruktor(),
  lang = WEB_SPEECH_LANG
} = {}) {
  if (typeof SpeechRecognition !== 'function') return null;

  let aktif = false;
  let recognition = null;
  let batalkanUcapan = null;

  const engine = {
    id: 'web-speech',
    lokal: false,
    butuhPersetujuan: true,
    bahasa: lang,

    async start() {
      if (typeof SpeechRecognition !== 'function') {
        throw kesalahanSuara(KODE.SUARA_TIDAK_TERSEDIA);
      }
      aktif = true;
      return { mulai: true };
    },

    async stop() {
      aktif = false;
      const sedang = recognition;
      const batal = batalkanUcapan;
      recognition = null;
      batalkanUcapan = null;
      if (sedang) {
        try {
          sedang.abort();
        } catch {
          // Abaikan: ucapan sudah selesai atau belum dimulai.
        }
      }
      if (batal) batal(KODE.SUARA_GAGAL);
    },

    async terminate() {
      await engine.stop();
    },

    recognize({ bahasa = lang, signal = null, onStatus = null } = {}) {
      return new Promise((resolve, reject) => {
        if (!aktif) aktif = true;
        if (signal && signal.aborted) {
          reject(kesalahanSuara(KODE.SUARA_GAGAL));
          return;
        }

        let selesai = false;
        let rec = null;

        const bereskan = () => {
          if (signal && typeof signal.removeEventListener === 'function') {
            signal.removeEventListener('abort', saatDibatalkan);
          }
          if (rec) {
            try {
              rec.onresult = null;
              rec.onerror = null;
              rec.onend = null;
            } catch {
              // Objek recognition tiruan mungkin tidak mendukung penghapusan handler.
            }
          }
          if (recognition === rec) recognition = null;
          if (batalkanUcapan === gagal) batalkanUcapan = null;
        };

        const sukses = (hasil) => {
          if (selesai) return;
          selesai = true;
          bereskan();
          if (onStatus) onStatus({ status: 'selesai', mesin: 'web-speech' });
          resolve(hasil);
        };

        const gagal = (code) => {
          if (selesai) return;
          selesai = true;
          bereskan();
          if (onStatus) onStatus({ status: 'gagal', mesin: 'web-speech' });
          reject(kesalahanSuara(code));
        };

        function saatDibatalkan() {
          if (rec) {
            try {
              rec.abort();
            } catch {
              // Abaikan.
            }
          }
          gagal(KODE.SUARA_GAGAL);
        }

        try {
          rec = new SpeechRecognition();
        } catch {
          gagal(KODE.SUARA_GAGAL);
          return;
        }

        try {
          rec.lang = bahasa || lang;
          rec.interimResults = false;
          rec.maxAlternatives = 3;
          rec.continuous = false;
        } catch {
          gagal(KODE.SUARA_GAGAL);
          return;
        }

        rec.onresult = (event) => {
          const hasil = event && event.results ? event.results[0] : null;
          const { teks, kepercayaan, alternatif } = normalisasiAlternatif(hasil);
          if (!teks) {
            gagal(KODE.SUARA_KOSONG);
            return;
          }
          sukses({ teks, kepercayaan, alternatif });
          try {
            rec.stop();
          } catch {
            // Sudah berhenti.
          }
        };

        rec.onerror = (event) => {
          gagal(kodeDariErrorWebSpeech(event && event.error));
        };

        rec.onend = () => {
          // Tidak ada hasil dan tidak ada error eksplisit: anggap tidak ada ucapan.
          gagal(KODE.SUARA_KOSONG);
        };

        if (signal && typeof signal.addEventListener === 'function') {
          signal.addEventListener('abort', saatDibatalkan, { once: true });
        }

        recognition = rec;
        batalkanUcapan = gagal;
        if (onStatus) onStatus({ status: 'mendengarkan', mesin: 'web-speech' });

        try {
          rec.start();
        } catch {
          gagal(KODE.SUARA_GAGAL);
        }
      });
    }
  };

  return engine;
}
