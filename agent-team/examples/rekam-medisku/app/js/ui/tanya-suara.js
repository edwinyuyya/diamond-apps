// Rekam Medisku — layar Tanya Obat Satu per Satu (t32, CONTRACT.md 9.4.13).
//
// Alur utama obat: pilih nama dulu (daftar/pindai/ketik/ejaan; tidak pernah dari
// ASR bebas), lalu lima pertanyaan tertutup, lalu konfirmasi persis
// PERTANYAAN_KONFIRMASI. Tidak ada penyimpanan sebelum tombol "Ya, benar".
//
// Modul ini hanya memakai DOM helper (tanpa innerHTML untuk data pengguna) dan
// logic murni. Tidak ada audio/transkrip yang disimpan dan tidak ada request
// eksternal; ASR offline berjalan di perangkat setelah izin mikrofon.

import { h, clear, qsa, on } from '../dom.js';
import { fokuskan, umumkan } from '../a11y.js';
import {
  MAKS_GAGAL_PAHAM,
  buatSesiTanya,
  jawabTanya,
  ketikJawaban,
  pertanyaanSaatIni,
  pilihJawabanTombol,
  ringkasSesi,
  selesaikanSesi
} from '../logic/tanyaSatuPerSatu.js';
import {
  PERTANYAAN_KONFIRMASI,
  klasifikasiJawaban
} from '../logic/konfirmasiSuara.js';
import { URUTAN_PERTANYAAN, labelPilihan } from '../logic/kosakataTertutup.js';
import { validasiNamaObat } from '../logic/pemilihNamaObat.js';
import { DISCLAIMERS_SUARA, mesinAktif } from '../suara/mesin.js';
import { kenaliSuara } from '../suara/adaptor.js';
import { hentikanBacaan } from '../suara/tts.js';
import {
  bacakanPertanyaan,
  bacakanTeksTanya,
  teksKonfirmasiTanya
} from '../suara/ttsTanya.js';
import { buatPemilihNamaObat } from './pemilih-nama-obat.js';

const WARNA_WARNING =
  DISCLAIMERS_SUARA
  + ' Whisper base terbatas untuk nama/dosis obat berbahasa Indonesia; '
  + 'alur tanya dan pembacaan ulang dipakai untuk mengurangi kesalahan.';

const PESAN_TIDAK_TERDENGAR =
  'Tidak terdengar dengan jelas. Silakan ulangi, pilih tombol, atau ketik jawaban.';

const PESAN_FOKUS =
  'Silakan pilih tombol atau ketik jawaban.';

const PESAN_MULAI_NAMA =
  'Pilih sumber nama obat terlebih dahulu, lalu jawab pertanyaan nama.';

const TOUCH = Object.freeze({ minHeight: '48px', minWidth: '48px' });
const TOUCH_BESAR = Object.freeze({ minHeight: '56px', minWidth: '48px' });

function isAbort(error) {
  const kode = error && error.code;
  return kode === 'SUARA_GAGAL' && /batal/i.test(String(error.message || ''));
}

function pesanErrorSuara(error) {
  const kode = error && error.code;
  if (
    kode === 'ASR_TIDAK_TERDENGAR'
    || kode === 'ASR_BERULANG'
    || kode === 'SUARA_KOSONG'
    || kode === 'SUARA_TIMEOUT'
    || kode === 'SUARA_GAGAL'
  ) {
    return PESAN_TIDAK_TERDENGAR;
  }
  const pesan = error && error.message ? String(error.message) : '';
  return pesan || PESAN_TIDAK_TERDENGAR;
}

/**
 * Render layar Tanya Obat Satu per Satu.
 *
 * @param {HTMLElement} root
 * @param {object} ctx
 * @returns {() => void} cleanup
 */
export async function render(root, ctx) {
  clear(root);

  let disposed = false;
  let sesiTanya = null;
  let sumberNama = null;
  let pilihanAktif = new Set();
  let konfirmasiGagal = 0;
  let suaraTerkunci = false;
  let faseKonfirmasi = false;
  let abortCtrl = null;
  let mendengarkan = false;
  let menyimpan = false;

  const disposers = [];
  const pasang = (node, event, handler, options) => {
    disposers.push(on(node, event, handler, options));
  };

  // -------------------------------------------------------------------------
  // Kerangka layar
  // -------------------------------------------------------------------------
  const screen = h('section', {
    id: 'screen-tanya-suara',
    class: 'screen tanya-layout',
    'aria-labelledby': 'tanya-judul'
  });

  const btnBatal = h('button', {
    id: 'btn-tanya-batal',
    type: 'button',
    class: 'button button--ghost'
  }, 'Batal dan kembali');
  const btnPengaturan = h('button', {
    id: 'btn-tanya-pengaturan',
    type: 'button',
    class: 'button button--ghost'
  }, 'Pengaturan suara');

  screen.appendChild(h('header', { class: 'screen-header' },
    h('h1', { id: 'tanya-judul' }, 'Tanya Obat Satu per Satu'),
    h('p', { class: 'muted' },
      'Nama obat dipilih dulu, lalu lima pertanyaan tertutup. '
      + 'Obat hanya disimpan setelah Anda menekan "Ya, benar".'),
    h('div', { class: 'actions' }, btnPengaturan, btnBatal)));

  const warningEl = h('p', {
    id: 'tanya-warning',
    class: 'voice-warning',
    role: 'note'
  }, WARNA_WARNING);
  screen.appendChild(warningEl);

  const errorEl = h('p', {
    id: 'tanya-error',
    class: 'error-text',
    role: 'alert',
    tabindex: '-1',
    hidden: true
  });
  const liveEl = h('div', {
    id: 'tanya-live',
    class: 'sr-only',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true'
  });
  screen.appendChild(errorEl);
  screen.appendChild(liveEl);

  const langkahEl = h('p', {
    id: 'tanya-langkah',
    class: 'tanya-progress'
  }, 'Pilih nama obat');
  screen.appendChild(langkahEl);

  // -------------------------------------------------------------------------
  // Pemilih nama
  // -------------------------------------------------------------------------
  const pemilih = buatPemilihNamaObat({
    ctx,
    onNama: (nama, sumber) => mulaiSesi(nama, sumber),
    onStatus: (pesan) => umumkan(pesan),
    onError: (pesan) => tampilkanError(pesan)
  });
  screen.appendChild(pemilih.element);

  // -------------------------------------------------------------------------
  // Panel pertanyaan tertutup
  // -------------------------------------------------------------------------
  const panelPertanyaan = h('section', {
    class: 'card stack tanya-question-panel',
    'aria-label': 'Pertanyaan obat'
  });
  const pertanyaanEl = h('h2', {
    id: 'tanya-pertanyaan',
    class: 'tanya-question',
    tabindex: '-1'
  }, 'Pilih nama obat dari daftar, hasil pindai, ketikan, atau ejaan.');
  const pilihanEl = h('div', {
    id: 'tanya-pilihan',
    class: 'tanya-choices',
    role: 'group',
    'aria-label': 'Pilihan jawaban'
  });
  const btnPilihSelesai = h('button', {
    id: 'btn-tanya-pilih-selesai',
    type: 'button',
    class: 'button button--primary voice-big-button',
    style: TOUCH_BESAR,
    hidden: true
  }, 'Pakai pilihan ini');

  const btnBacakan = h('button', {
    id: 'btn-tanya-bacakan',
    type: 'button',
    class: 'button button--ghost',
    style: TOUCH
  }, 'Bacakan pertanyaan');
  const btnMulai = h('button', {
    id: 'btn-tanya-mulai',
    type: 'button',
    class: 'button button--primary',
    style: TOUCH
  }, 'Mulai bicara');
  const btnBerhenti = h('button', {
    id: 'btn-tanya-berhenti',
    type: 'button',
    class: 'button button--danger',
    style: TOUCH,
    hidden: true
  }, 'Berhenti');

  const mendengarEl = h('p', {
    id: 'tanya-mendengarkan',
    class: 'status-message'
  }, 'Tidak mendengarkan.');
  const transkripEl = h('p', {
    id: 'tanya-transkrip',
    class: 'voice-transcript',
    style: { minHeight: '1.5em' }
  }, 'Belum ada ucapan.');

  const ketikLabel = h('label', { for: 'tanya-ketik' }, 'Ketik atau tempel jawaban');
  const ketikInput = h('input', {
    id: 'tanya-ketik',
    name: 'tanya-ketik',
    type: 'text',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-describedby': 'tanya-ketik-hint'
  });
  const ketikHint = h('p', {
    id: 'tanya-ketik-hint',
    class: 'hint'
  }, 'Jawaban ketikan hanya untuk pendamping; bukan verifikasi.');
  const btnKetik = h('button', {
    id: 'btn-tanya-ketik',
    type: 'button',
    class: 'button button--primary',
    style: TOUCH
  }, 'Kirim jawaban');
  const ketikWrapper = h('div', { class: 'field' },
    ketikLabel, ketikInput, ketikHint, btnKetik);

  panelPertanyaan.appendChild(pertanyaanEl);
  panelPertanyaan.appendChild(pilihanEl);
  panelPertanyaan.appendChild(btnPilihSelesai);
  panelPertanyaan.appendChild(ketikWrapper);
  panelPertanyaan.hidden = true;
  screen.appendChild(panelPertanyaan);

  // Kontrol mikrofon dipakai di fase nama, pertanyaan, dan konfirmasi, jadi
  // berada di luar panel pertanyaan.
  const voiceCard = h('section', {
    class: 'card stack',
    'aria-label': 'Kontrol mikrofon dan bacaan'
  });
  voiceCard.appendChild(h('h2', { class: 'card-title' }, 'Dengarkan atau bacakan'));
  voiceCard.appendChild(h('div', { class: 'tanya-actions' },
    btnBacakan, btnMulai, btnBerhenti));
  voiceCard.appendChild(mendengarEl);
  voiceCard.appendChild(transkripEl);
  screen.appendChild(voiceCard);

  // -------------------------------------------------------------------------
  // Panel konfirmasi
  // -------------------------------------------------------------------------
  const panelKonfirmasi = h('section', {
    class: 'card stack tanya-confirm',
    'aria-label': 'Konfirmasi obat'
  });
  const ringkasanEl = h('p', {
    id: 'tanya-ringkasan',
    class: 'tanya-summary',
    tabindex: '-1'
  });
  const konfirmasiEl = h('p', {
    id: 'tanya-konfirmasi',
    class: 'tanya-confirm__question'
  }, PERTANYAAN_KONFIRMASI);
  const btnKonfirmasiYa = h('button', {
    id: 'btn-tanya-konfirmasi-ya',
    type: 'button',
    class: 'button button--primary voice-big-button tanya-confirm__yes',
    style: TOUCH_BESAR
  }, 'Ya, benar');
  const btnKonfirmasiTidak = h('button', {
    id: 'btn-tanya-konfirmasi-tidak',
    type: 'button',
    class: 'button button--ghost voice-big-button tanya-confirm__no',
    style: TOUCH_BESAR
  }, 'Tidak');
  const btnUlangi = h('button', {
    id: 'btn-tanya-ulangi',
    type: 'button',
    class: 'button button--ghost'
  }, 'Ulangi bacaan konfirmasi');

  panelKonfirmasi.appendChild(h('h2', { class: 'card-title' }, 'Periksa ulang'));
  panelKonfirmasi.appendChild(ringkasanEl);
  panelKonfirmasi.appendChild(konfirmasiEl);
  panelKonfirmasi.appendChild(h('div', { class: 'tanya-actions tanya-actions--confirm' },
    btnKonfirmasiYa, btnKonfirmasiTidak));
  panelKonfirmasi.appendChild(btnUlangi);
  panelKonfirmasi.hidden = true;
  screen.appendChild(panelKonfirmasi);

  root.appendChild(screen);

  // -------------------------------------------------------------------------
  // Umpan balik
  // -------------------------------------------------------------------------
  function umumkanPesan(pesan) {
    if (disposed) return;
    umumkan(pesan, { region: liveEl, politeness: 'polite' });
  }

  function tampilkanError(pesan) {
    if (disposed) return;
    const teks = pesan == null ? '' : String(pesan);
    errorEl.textContent = teks;
    errorEl.hidden = teks === '';
    if (teks !== '') {
      umumkanPesan(teks);
      try {
        errorEl.focus();
      } catch {
        // abaikan
      }
    }
  }

  function bersihkanError() {
    if (disposed) return;
    errorEl.textContent = '';
    errorEl.hidden = true;
  }

  function aturMendengar(nilai) {
    mendengarkan = nilai === true;
    if (disposed) return;
    mendengarEl.textContent = mendengarkan
      ? 'Mendengarkan… Ucapkan sekarang (maksimal 8 detik).'
      : 'Tidak mendengarkan.';
    btnMulai.disabled = mendengarkan || menyimpan || suaraTerkunci;
    btnBerhenti.hidden = !mendengarkan;
  }

  function bacaSettings() {
    try {
      return ctx?.state?.getState()?.settings || {};
    } catch {
      return {};
    }
  }

  // -------------------------------------------------------------------------
  // Bacaan TTS
  // -------------------------------------------------------------------------
  async function bacaTeks(teks, target) {
    if (!teks) return;
    await bacakanTeksTanya(null, teks);
    if (!disposed && target) fokuskan(target);
  }

  function bacaPertanyaanAktif(target = pertanyaanEl) {
    if (!sesiTanya) {
      const targetNama = pemilih.element.querySelector('#tanya-nama-pertanyaan');
      return bacaTeks(pemilih.pertanyaanSaatIni(), targetNama || target);
    }
    if (sesiTanya.langkah === 'konfirmasi') {
      return bacaTeks(teksKonfirmasiTanya(ringkasSesi(sesiTanya)), target || ringkasanEl);
    }
    const q = pertanyaanSaatIni(sesiTanya);
    if (!q) return undefined;
    return bacakanPertanyaan(null, q.id, sesiTanya).then(() => {
      if (!disposed) fokuskan(target);
    });
  }

  // -------------------------------------------------------------------------
  // Fase nama -> sesi tanya
  // -------------------------------------------------------------------------
  function mulaiSesi(nama, sumber) {
    const valid = validasiNamaObat(nama);
    if (!valid.ok) {
      tampilkanError(valid.pesan);
      return;
    }
    const now = typeof ctx?.now === 'function' ? ctx.now() : new Date();
    const profileId = ctx?.profile?.id ?? null;
    const sesi = buatSesiTanya({
      profileId,
      sumberNama: sumber,
      nama: valid.nama,
      now
    });
    if (sesi.error) {
      tampilkanError(sesi.error.pesan);
      return;
    }
    bersihkanError();
    sesiTanya = sesi;
    sumberNama = sumber;
    faseKonfirmasi = false;
    suaraTerkunci = false;
    pemilih.element.hidden = true;
    panelKonfirmasi.hidden = true;
    panelPertanyaan.hidden = false;
    transkripEl.textContent = 'Belum ada ucapan.';
    umumkanPesan(`Nama obat dipilih: ${valid.nama}. Mulai pertanyaan pertama.`);
    renderPertanyaan();
  }

  function kembaliKeNama(pesan) {
    sesiTanya = null;
    sumberNama = null;
    konfirmasiGagal = 0;
    suaraTerkunci = false;
    faseKonfirmasi = false;
    pilihanAktif = new Set();
    panelPertanyaan.hidden = true;
    panelKonfirmasi.hidden = true;
    pemilih.element.hidden = false;
    pemilih.reset();
    langkahEl.textContent = 'Pilih nama obat';
    pertanyaanEl.textContent = 'Pilih nama obat dari daftar, hasil pindai, ketikan, atau ejaan.';
    if (pesan) {
      tampilkanError('');
      umumkanPesan(pesan);
    }
    try {
      pemilih.fokus();
    } catch {
      // abaikan
    }
  }

  // -------------------------------------------------------------------------
  // Pertanyaan tertutup
  // -------------------------------------------------------------------------
  function nomorLangkah(id) {
    const indeks = URUTAN_PERTANYAAN.indexOf(id);
    return indeks < 0 ? 0 : indeks + 1;
  }

  function labelPilihanTampil(id, nilai) {
    return labelPilihan(id, nilai) || String(nilai);
  }

  function renderPertanyaan() {
    if (!sesiTanya) return;
    const q = pertanyaanSaatIni(sesiTanya);
    if (!q) {
      if (sesiTanya.langkah === 'konfirmasi') tampilkanKonfirmasi();
      return;
    }

    panelPertanyaan.hidden = false;
    panelKonfirmasi.hidden = true;
    langkahEl.textContent = `Langkah ${nomorLangkah(q.id)} dari 5`;
    pertanyaanEl.textContent = q.pertanyaan;
    clear(pilihanEl);
    pilihanAktif = new Set();

    const multi = q.id === 'waktu';
    btnPilihSelesai.hidden = !multi;

    for (const nilai of Array.isArray(q.pilihan) ? q.pilihan : []) {
      const tombol = h('button', {
        type: 'button',
        class: 'tanya-choice',
        style: TOUCH,
        'data-nilai': String(nilai)
      }, labelPilihanTampil(q.id, nilai));

      if (multi) {
        tombol.setAttribute('aria-pressed', 'false');
        tombol.addEventListener('click', () => {
          if (disposed) return;
          if (pilihanAktif.has(nilai)) pilihanAktif.delete(nilai);
          else pilihanAktif.add(nilai);
          const aktif = pilihanAktif.has(nilai);
          tombol.setAttribute('aria-pressed', aktif ? 'true' : 'false');
          umumkanPesan(aktif
            ? `${labelPilihanTampil(q.id, nilai)} dipilih.`
            : `${labelPilihanTampil(q.id, nilai)} tidak dipilih.`);
        });
      } else {
        tombol.addEventListener('click', () => jawabTombol(nilai));
      }
      pilihanEl.appendChild(tombol);
    }

    // Setelah dua kegagalan paham, arahkan fokus ke tombol/ketikan.
    const gagal = sesiTanya.gagalPaham && Number.isFinite(sesiTanya.gagalPaham[q.id])
      ? sesiTanya.gagalPaham[q.id]
      : 0;
    if (sesiTanya.modeTombol || gagal >= MAKS_GAGAL_PAHAM) {
      fokusKePilihan(PESAN_FOKUS);
    } else {
      bacaPertanyaanAktif(pertanyaanEl);
    }
  }

  function fokusKePilihan(pesan) {
    if (pesan) umumkanPesan(pesan);
    const pertama = qsa('button', pilihanEl)[0];
    if (pertama) {
      try {
        pertama.focus();
      } catch {
        // abaikan
      }
      return;
    }
    try {
      ketikInput.focus();
    } catch {
      // abaikan
    }
  }

  function terapkanHasil(hasil) {
    if (disposed || !hasil) return;
    if (hasil.sesi) sesiTanya = hasil.sesi;
    if (hasil.error) tampilkanError(hasil.error.pesan || 'Jawaban tidak dikenali.');
    else bersihkanError();

    if (hasil.aksi === 'batal') {
      konfirmasiGagal = 0;
      kembaliKeNama(hasil.ucapan || 'Baik, tidak ada yang disimpan.');
      return;
    }

    if (!sesiTanya) return;

    if (sesiTanya.langkah === 'konfirmasi') {
      if (!faseKonfirmasi) tampilkanKonfirmasi();
      return;
    }

    if (sesiTanya.langkah === 'selesai') {
      return;
    }

    const q = pertanyaanSaatIni(sesiTanya);
    if (!q) return;

    const gagal = sesiTanya.gagalPaham && Number.isFinite(sesiTanya.gagalPaham[q.id])
      ? sesiTanya.gagalPaham[q.id]
      : 0;
    const perluFokus = sesiTanya.modeTombol || gagal >= MAKS_GAGAL_PAHAM;

    renderPertanyaan();
    if (perluFokus) fokusKePilihan(PESAN_FOKUS);
    else if (hasil.ucapan) umumkanPesan(hasil.ucapan);
  }

  function jawabTombol(nilai) {
    if (!sesiTanya || disposed) return;
    bersihkanError();
    terapkanHasil(pilihJawabanTombol(sesiTanya, nilai));
  }

  function kirimKetikan() {
    if (!sesiTanya || disposed) return;
    const teks = ketikInput.value.trim();
    if (teks === '') {
      tampilkanError('Ketikan masih kosong. Silakan ketik jawaban atau pilih tombol.');
      return;
    }
    bersihkanError();
    ketikInput.value = '';

    // Konfirmasi diketik: ya/tidak saja, memakai klasifikasi yang sama
    // dengan jalur suara. Tidak ada penyimpanan sebelum keputusan ini.
    if (sesiTanya.langkah === 'konfirmasi') {
      const klasifikasi = klasifikasiJawaban(teks);
      if (klasifikasi === 'ya') {
        simpanObat().catch((error) => tampilkanError(pesanErrorSuara(error)));
        return;
      }
      if (klasifikasi === 'tidak') {
        tolakKonfirmasi();
        return;
      }
      konfirmasiGagal += 1;
      tampilkanError('Jawaban konfirmasi belum jelas. Silakan jawab ya atau tidak.');
      if (konfirmasiGagal >= 2) {
        umumkanPesan(PESAN_FOKUS);
        try {
          btnKonfirmasiYa.focus();
        } catch {
          // abaikan
        }
      }
      return;
    }

    terapkanHasil(ketikJawaban(sesiTanya, teks));
  }

  // -------------------------------------------------------------------------
  // Konfirmasi akhir
  // -------------------------------------------------------------------------
  function tampilkanKonfirmasi() {
    if (!sesiTanya) return;
    if (!faseKonfirmasi) {
      faseKonfirmasi = true;
      konfirmasiGagal = 0;
      suaraTerkunci = false;
    }
    aturMendengar(false);
    panelPertanyaan.hidden = true;
    panelKonfirmasi.hidden = false;
    langkahEl.textContent = 'Konfirmasi';
    const ringkasan = ringkasSesi(sesiTanya);
    ringkasanEl.textContent = ringkasan;
    konfirmasiEl.textContent = PERTANYAAN_KONFIRMASI;
    umumkanPesan(`Ringkasan: ${ringkasan} ${PERTANYAAN_KONFIRMASI}`);
    bacaTeks(teksKonfirmasiTanya(ringkasan), ringkasanEl);
  }

  async function simpanObat() {
    if (!sesiTanya || menyimpan || disposed) return;
    if (sesiTanya.langkah !== 'konfirmasi') return;

    menyimpan = true;
    btnKonfirmasiYa.disabled = true;
    btnKonfirmasiTidak.disabled = true;
    try {
      const now = typeof ctx?.now === 'function' ? ctx.now() : new Date();
      const hasil = selesaikanSesi(sesiTanya, { simpan: true, now });
      if (hasil.error || !hasil.medication) {
        tampilkanError(
          hasil.error?.pesan
          || 'Data belum lengkap atau melewati pagar kewajaran dosis; tidak disimpan.'
        );
        return;
      }
      await ctx.state.upsert('medications', hasil.medication);
      sesiTanya = hasil.sesi;
      bersihkanError();
      umumkanPesan(`Obat ${hasil.medication.name} sudah dicatat ke daftar obat.`);
      if (typeof ctx.toast === 'function') {
        ctx.toast(`Obat ${hasil.medication.name} sudah dicatat.`, 'success');
      }
      if (typeof ctx.navigate === 'function') ctx.navigate('#/obat');
      else if (typeof location !== 'undefined') location.hash = '#/obat';
    } catch (error) {
      const pesan = error && error.message
        ? `Obat gagal disimpan: ${error.message}`
        : 'Obat gagal disimpan. Silakan coba lagi.';
      tampilkanError(pesan);
    } finally {
      menyimpan = false;
      if (!disposed) {
        btnKonfirmasiYa.disabled = false;
        btnKonfirmasiTidak.disabled = false;
      }
    }
  }

  function tolakKonfirmasi() {
    if (!sesiTanya || disposed) return;
    selesaikanSesi(sesiTanya, { simpan: false });
    konfirmasiGagal = 0;
    kembaliKeNama('Baik, tidak ada yang disimpan. Silakan pilih nama obat lagi.');
  }

  async function jawabKonfirmasiSuara(teks) {
    if (!sesiTanya || sesiTanya.langkah !== 'konfirmasi') return;
    const klasifikasi = klasifikasiJawaban(teks);
    if (klasifikasi === 'ya') {
      await simpanObat();
      return;
    }
    if (klasifikasi === 'tidak') {
      tolakKonfirmasi();
      return;
    }
    konfirmasiGagal += 1;
    tampilkanError('Jawaban konfirmasi belum jelas. Silakan jawab ya atau tidak.');
    if (konfirmasiGagal >= 2) {
      suaraTerkunci = true;
      umumkanPesan(PESAN_FOKUS);
      btnMulai.disabled = true;
      try {
        btnKonfirmasiYa.focus();
      } catch {
        // abaikan
      }
    } else {
      bacaTeks(teksKonfirmasiTanya(ringkasSesi(sesiTanya)), ringkasanEl);
    }
  }

  // -------------------------------------------------------------------------
  // Mikrofon (ASR dengan penjaga, maks. 8 detik)
  // -------------------------------------------------------------------------
  async function mulaiMendengar() {
    if (disposed || mendengarkan || menyimpan) return;
    bersihkanError();

    if (!sesiTanya) {
      if (!pemilih.aktif()) return;
      if (!pemilih.sumber()) {
        tampilkanError(PESAN_MULAI_NAMA);
        return;
      }
      if (!pemilih.bisaSuara()) {
        tampilkanError(
          'Nama obat tidak bisa dari suara bebas. Pilih dari daftar, ketik, atau eja nama obat.'
        );
        return;
      }
    } else if (sesiTanya.langkah === 'konfirmasi' && konfirmasiGagal >= 2) {
      umumkanPesan(PESAN_FOKUS);
      return;
    }

    hentikanBacaan();
    if (abortCtrl) {
      try {
        abortCtrl.abort();
      } catch {
        // abaikan
      }
    }
    const controller = new AbortController();
    abortCtrl = controller;
    aturMendengar(true);
    umumkanPesan('Mendengarkan. Ucapkan sekarang.');
    transkripEl.textContent = 'Mendengarkan…';

    try {
      const settings = bacaSettings();
      const hasil = await kenaliSuara({
        mesin: mesinAktif(settings),
        settings,
        signal: controller.signal,
        maksDurasiMs: 8000,
        timeoutMs: 20000
      });
      if (disposed || controller.signal.aborted) return;

      const teks = String(hasil?.teks || '').trim();
      transkripEl.textContent = teks || 'Tidak ada ucapan yang dikenali.';
      umumkanPesan(`Terdengar: ${teks || 'tidak ada ucapan'}`);

      if (teks === '') {
        tampilkanError(PESAN_TIDAK_TERDENGAR);
        return;
      }

      if (!sesiTanya) {
        const jawab = pemilih.jawabSuara(teks);
        if (jawab && jawab.ok === false && jawab.pesan) tampilkanError(jawab.pesan);
        return;
      }

      if (sesiTanya.langkah === 'konfirmasi') {
        await jawabKonfirmasiSuara(teks);
        return;
      }

      const hasilJawab = jawabTanya(sesiTanya, teks, { sumber: 'suara' });
      if (hasilJawab.aksi === 'ulangi') {
        umumkanPesan(hasilJawab.ucapan || 'Silakan ulangi jawaban.');
        renderPertanyaan();
        return;
      }
      terapkanHasil(hasilJawab);
    } catch (error) {
      if (disposed) return;
      if (controller.signal.aborted || isAbort(error)) {
        umumkanPesan('Pendengaran dihentikan.');
        mendengarEl.textContent = 'Tidak mendengarkan.';
        return;
      }
      tampilkanError(pesanErrorSuara(error));
    } finally {
      if (!disposed) {
        if (abortCtrl === controller) abortCtrl = null;
        aturMendengar(false);
      }
    }
  }

  function berhentiMendengar() {
    if (abortCtrl) {
      try {
        abortCtrl.abort();
      } catch {
        // abaikan
      }
      abortCtrl = null;
    }
    aturMendengar(false);
    umumkanPesan('Pendengaran dihentikan.');
  }

  // -------------------------------------------------------------------------
  // Peristiwa
  // -------------------------------------------------------------------------
  pasang(btnBacakan, 'click', () => {
    if (disposed) return;
    hentikanBacaan();
    const target = sesiTanya && sesiTanya.langkah === 'konfirmasi'
      ? ringkasanEl
      : (sesiTanya ? pertanyaanEl : null);
    bacaPertanyaanAktif(target || pertanyaanEl);
  });

  pasang(btnMulai, 'click', () => {
    mulaiMendengar().catch((error) => tampilkanError(pesanErrorSuara(error)));
  });
  pasang(btnBerhenti, 'click', berhentiMendengar);

  pasang(btnKetik, 'click', kirimKetikan);
  pasang(ketikInput, 'keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      kirimKetikan();
    }
  });

  pasang(btnPilihSelesai, 'click', () => {
    if (!sesiTanya || disposed) return;
    const nilai = Array.from(pilihanAktif);
    if (nilai.length === 0) {
      tampilkanError('Pilih minimal satu waktu, lalu tekan "Pakai pilihan ini".');
      return;
    }
    jawabTombol(nilai);
  });

  pasang(btnKonfirmasiYa, 'click', () => {
    simpanObat().catch((error) => tampilkanError(pesanErrorSuara(error)));
  });
  pasang(btnKonfirmasiTidak, 'click', tolakKonfirmasi);
  pasang(btnUlangi, 'click', () => {
    if (!sesiTanya || disposed) return;
    hentikanBacaan();
    bacaTeks(teksKonfirmasiTanya(ringkasSesi(sesiTanya)), ringkasanEl);
  });

  pasang(btnPengaturan, 'click', () => {
    if (typeof ctx?.navigate === 'function') ctx.navigate('#/suara/pengaturan');
    else if (typeof location !== 'undefined') location.hash = '#/suara/pengaturan';
  });

  pasang(btnBatal, 'click', () => {
    if (disposed) return;
    berhentiMendengar();
    hentikanBacaan();
    sesiTanya = null;
    sumberNama = null;
    pilihanAktif = new Set();
    if (typeof ctx?.navigate === 'function') ctx.navigate('#/suara');
    else if (typeof location !== 'undefined') location.hash = '#/suara';
  });

  // -------------------------------------------------------------------------
  // Awal
  // -------------------------------------------------------------------------
  function renderAwal() {
    langkahEl.textContent = 'Pilih nama obat';
    pertanyaanEl.textContent = PESAN_MULAI_NAMA;
    umumkanPesan('Pilih nama obat dari daftar, hasil pindai, ketikan, atau ejaan.');
  }
  renderAwal();

  return () => {
    if (disposed) return;
    disposed = true;
    if (abortCtrl) {
      try {
        abortCtrl.abort();
      } catch {
        // abaikan
      }
      abortCtrl = null;
    }
    try {
      hentikanBacaan();
    } catch {
      // abaikan
    }
    // `kenaliSuara` selalu memanggil adaptor.berhenti() dan adaptor.terminate()
    // di finally-nya; pembatalan di atas memastikan keduanya berjalan.
    pemilih.destroy();
    while (disposers.length > 0) {
      const lepas = disposers.pop();
      try {
        lepas();
      } catch {
        // abaikan
      }
    }
  };
}

export default { render };
