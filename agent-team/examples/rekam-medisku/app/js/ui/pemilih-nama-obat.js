// Rekam Medisku — komponen pemilih nama obat (t32, CONTRACT.md 8B.14/9.4.13).
//
// Nama obat HANYA boleh berasal dari empat sumber tertutup: daftar obat
// tersimpan, hasil pindai, ketikan/pasta pendamping, atau ejaan huruf per
// huruf. Transkrip ASR tidak pernah dipakai sebagai nama obat. Mikrofon hanya
// boleh menjawab "ya/tidak" untuk kandidat, atau mengeja satu huruf dari
// alfabet tertutup.
//
// Komponen ini murni UI: semua aturan nama berada di `logic/pemilihNamaObat.js`.
// Tidak ada penyimpanan; nama baru diteruskan lewat `onNama` setelah valid.

import { h, clear, on } from '../dom.js';
import {
  bacaSatuPerSatu,
  cocokkanYaTidak,
  daftarNamaDariObat,
  daftarNamaDariPindai,
  jawabNama,
  ketikNama,
  konfirmasiEjaan,
  mulaiEjaan,
  pilihNama,
  selesaiEjaan,
  tambahHuruf,
  validasiNamaObat,
  buatSesiNama
} from '../logic/pemilihNamaObat.js';
import { bacakanTeksTanya, teksEjaan, teksNamaDariDaftar } from '../suara/ttsTanya.js';
import { getScanDraft } from '../scanSession.js';

const SUMBER = [
  {
    id: 'daftar',
    idElemen: 'tanya-sumber-daftar',
    label: 'Daftar obat tersimpan',
    petunjuk: 'Pilih salah satu obat yang sudah tersimpan.'
  },
  {
    id: 'pindai',
    idElemen: 'tanya-sumber-pindai',
    label: 'Hasil pindai resep',
    petunjuk: 'Pilih nama dari hasil pindai terakhir.'
  },
  {
    id: 'ketik',
    idElemen: 'tanya-sumber-ketik',
    label: 'Ketik nama obat',
    petunjuk: 'Ketik atau tempel nama obat. Mikrofon tidak dipakai untuk nama.'
  },
  {
    id: 'ejaan',
    idElemen: 'tanya-sumber-ejaan',
    label: 'Ejaan huruf per huruf',
    petunjuk: 'Sebutkan atau ketik satu huruf setiap kali.'
  }
];

const PESAN_SUARA_NAMA =
  'Nama obat tidak bisa dari suara bebas. Pilih dari daftar, ketik, atau eja nama obat.';

const TOUCH = Object.freeze({ minHeight: '48px', minWidth: '48px' });

function aman(fn, fallback = null) {
  try {
    return fn();
  } catch {
    return fallback;
  }
}

function bisaBacakan() {
  return true;
}

/**
 * Buat komponen pemilih nama obat.
 *
 * @param {{
 *   ctx: object,
 *   onNama?: (nama:string, sumber:string) => void,
 *   onStatus?: (pesan:string) => void,
 *   onError?: (pesan:string) => void
 * }} opsi
 * @returns {{
 *   element: HTMLElement,
 *   sumber: () => string|null,
 *   aktif: () => boolean,
 *   bisaSuara: () => boolean,
 *   jawabSuara: (teks:string) => {ok:boolean, pesan?:string},
 *   pertanyaanSaatIni: () => string,
 *   reset: () => void,
 *   fokus: () => void,
 *   destroy: () => void
 * }}
 */
export function buatPemilihNamaObat({
  ctx,
  onNama = null,
  onStatus = null,
  onError = null
} = {}) {
  let disposed = false;
  let sesi = buatSesiNama();
  let sumber = null;
  let kandidat = [];
  let daftarObat = [];
  let daftarPindai = [];

  const disposers = [];
  const pasang = (node, event, handler, options) => {
    disposers.push(on(node, event, handler, options));
  };

  function status(pesan) {
    if (disposed) return;
    if (typeof onStatus === 'function') onStatus(String(pesan || ''));
  }

  function galat(pesan) {
    if (disposed) return;
    if (typeof onError === 'function') onError(String(pesan || ''));
  }

  async function baca(teks) {
    if (!bisaBacakan()) return;
    await bacakanTeksTanya(null, teks);
  }

  // -------------------------------------------------------------------------
  // Elemen
  // -------------------------------------------------------------------------
  const element = h('section', {
    id: 'tanya-sumber-nama',
    class: 'card stack tanya-name-sources',
    'aria-label': 'Pilih nama obat'
  });

  element.appendChild(h('h2', { class: 'card-title' }, 'Pilih nama obat dulu'));
  element.appendChild(h('p', { class: 'muted' },
    'Nama obat tidak diambil dari dikte bebas. Pilih dari daftar, hasil pindai, '
    + 'ketikan pendamping, atau ejaan huruf per huruf.'));

  const sumberActions = h('div', { class: 'tanya-name-sources__buttons' });
  const tombolSumber = new Map();

  for (const item of SUMBER) {
    const tombol = h('button', {
      id: item.idElemen,
      type: 'button',
      class: 'tanya-choice',
      style: TOUCH,
      'aria-pressed': 'false',
      'data-sumber': item.id,
      title: item.petunjuk
    }, item.label);
    tombolSumber.set(item.id, tombol);
    sumberActions.appendChild(tombol);
  }
  element.appendChild(sumberActions);

  const infoSumber = h('p', { class: 'hint', id: 'tanya-sumber-info', hidden: true });
  element.appendChild(infoSumber);

  const daftarNama = h('ul', {
    id: 'tanya-daftar-nama',
    class: 'tanya-name-list',
    'aria-label': 'Kandidat nama obat'
  });
  element.appendChild(daftarNama);

  const namaPertanyaan = h('p', {
    id: 'tanya-nama-pertanyaan',
    class: 'tanya-question',
    tabindex: '-1'
  }, 'Pilih sumber nama obat terlebih dahulu.');

  const namaJawab = h('div', { class: 'tanya-actions', hidden: true });
  const btnNamaYa = h('button', {
    id: 'btn-tanya-nama-ya',
    type: 'button',
    class: 'button button--primary voice-big-button',
    style: TOUCH,
    'aria-describedby': 'tanya-nama-pertanyaan'
  }, 'Ya');
  const btnNamaTidak = h('button', {
    id: 'btn-tanya-nama-tidak',
    type: 'button',
    class: 'button button--ghost voice-big-button',
    style: TOUCH,
    'aria-describedby': 'tanya-nama-pertanyaan'
  }, 'Tidak');
  namaJawab.appendChild(btnNamaYa);
  namaJawab.appendChild(btnNamaTidak);

  const ketikField = h('div', { class: 'field', hidden: true });
  const ketikLabel = h('label', { for: 'tanya-nama-ketik' }, 'Ketik atau tempel nama obat');
  const ketikInput = h('input', {
    id: 'tanya-nama-ketik',
    name: 'tanya-nama-ketik',
    type: 'text',
    autocomplete: 'off',
    spellcheck: 'false',
    'aria-describedby': 'tanya-nama-ketik-hint'
  });
  const ketikHint = h('p', {
    id: 'tanya-nama-ketik-hint',
    class: 'hint'
  }, 'Hanya teks yang Anda ketik/tempel; mikrofon tidak dipakai untuk nama.');
  const btnNamaKetik = h('button', {
    id: 'btn-tanya-nama-ketik',
    type: 'button',
    class: 'button button--primary',
    style: TOUCH
  }, 'Pakai nama ini');
  ketikField.appendChild(ketikLabel);
  ketikField.appendChild(ketikInput);
  ketikField.appendChild(ketikHint);
  ketikField.appendChild(btnNamaKetik);

  const ejaanField = h('div', { class: 'field tanya-spell', hidden: true });
  const ejaanLabel = h('label', { for: 'tanya-ejaan' }, 'Ketik satu huruf / nama huruf');
  const ejaanInput = h('input', {
    id: 'tanya-ejaan',
    name: 'tanya-ejaan',
    type: 'text',
    autocomplete: 'off',
    spellcheck: 'false',
    placeholder: 'mis. a, be, ce, atau amoxicillin',
    'aria-describedby': 'tanya-ejaan-hasil'
  });
  const ejaanHasil = h('p', {
    id: 'tanya-ejaan-hasil',
    class: 'tanya-spell__result',
    'aria-live': 'off'
  }, 'Ejaan: (belum ada huruf)');
  const ejaanActions = h('div', { class: 'tanya-actions' });
  const btnEjaanHapus = h('button', {
    id: 'btn-tanya-ejaan-hapus',
    type: 'button',
    class: 'button button--ghost',
    style: TOUCH
  }, 'Hapus huruf');
  const btnEjaanSelesai = h('button', {
    id: 'btn-tanya-ejaan-selesai',
    type: 'button',
    class: 'button button--primary',
    style: TOUCH
  }, 'Selesai mengeja');
  const btnEjaanYa = h('button', {
    id: 'btn-tanya-ejaan-ya',
    type: 'button',
    class: 'button button--primary voice-big-button',
    style: TOUCH,
    hidden: true
  }, 'Ya, benar');
  const btnEjaanTidak = h('button', {
    id: 'btn-tanya-ejaan-tidak',
    type: 'button',
    class: 'button button--ghost voice-big-button',
    style: TOUCH,
    hidden: true
  }, 'Tidak, ulangi');
  ejaanActions.appendChild(btnEjaanHapus);
  ejaanActions.appendChild(btnEjaanSelesai);
  ejaanActions.appendChild(btnEjaanYa);
  ejaanActions.appendChild(btnEjaanTidak);
  ejaanField.appendChild(ejaanLabel);
  ejaanField.appendChild(ejaanInput);
  ejaanField.appendChild(ejaanHasil);
  ejaanField.appendChild(ejaanActions);

  element.appendChild(namaPertanyaan);
  element.appendChild(namaJawab);
  element.appendChild(ketikField);
  element.appendChild(ejaanField);

  // -------------------------------------------------------------------------
  // Baca data sumber (tanpa menulis apa pun)
  // -------------------------------------------------------------------------
  function medicationsTersimpan() {
    const data = aman(() => ctx?.state?.getState?.(), {}) || {};
    return Array.isArray(data.medications) ? data.medications : [];
  }

  function hasilPindaiTerakhir() {
    const draft = aman(() => getScanDraft(), null);
    if (!draft || typeof draft !== 'object') return null;
    if (draft.terjemahan && typeof draft.terjemahan === 'object') return draft.terjemahan;
    if (draft.rekam && typeof draft.rekam === 'object') return draft.rekam;
    return null;
  }

  function muatSumber() {
    daftarObat = daftarNamaDariObat(medicationsTersimpan());
    daftarPindai = daftarNamaDariPindai(hasilPindaiTerakhir());

    const tombolDaftar = tombolSumber.get('daftar');
    const tombolPindai = tombolSumber.get('pindai');
    if (tombolDaftar) {
      tombolDaftar.disabled = daftarObat.length === 0;
      tombolDaftar.title = daftarObat.length === 0
        ? 'Belum ada obat tersimpan.'
        : SUMBER[0].petunjuk;
    }
    if (tombolPindai) {
      tombolPindai.disabled = daftarPindai.length === 0;
      tombolPindai.title = daftarPindai.length === 0
        ? 'Tidak ada nama dari hasil pindai.'
        : SUMBER[1].petunjuk;
    }

    if (daftarObat.length === 0) {
      clear(daftarNama);
      daftarNama.appendChild(h('li', { class: 'muted' }, 'Belum ada obat tersimpan.'));
    } else {
      clear(daftarNama);
    }

    const alasan = [];
    if (daftarObat.length === 0) alasan.push('Belum ada obat tersimpan.');
    if (daftarPindai.length === 0) alasan.push('Tidak ada nama dari hasil pindai.');
    infoSumber.textContent = alasan.join(' ');
    infoSumber.hidden = alasan.length === 0;
  }

  // -------------------------------------------------------------------------
  // Tampilan
  // -------------------------------------------------------------------------
  function perbaruiSumber() {
    for (const [id, tombol] of tombolSumber) {
      tombol.setAttribute('aria-pressed', id === sumber ? 'true' : 'false');
    }
    ketikField.hidden = sumber !== 'ketik';
    ejaanField.hidden = sumber !== 'ejaan';
    namaJawab.hidden = !(sumber === 'daftar' || sumber === 'pindai'
      || sesi.status === 'menunggu-konfirmasi-ejaan');
    perbaruiEjaan();
  }

  function renderKandidat() {
    clear(daftarNama);
    if (!sumber) return;
    if (sumber === 'daftar' && kandidat.length === 0) {
      daftarNama.appendChild(h('li', { class: 'muted' }, 'Belum ada obat tersimpan.'));
      return;
    }
    if (sumber === 'pindai' && kandidat.length === 0) {
      daftarNama.appendChild(h('li', { class: 'muted' },
        'Tidak ada nama dari hasil pindai.'));
      return;
    }
    for (const nama of kandidat) {
      const li = h('li');
      const tombol = h('button', {
        type: 'button',
        class: 'tanya-choice tanya-name-list__item',
        style: TOUCH,
        'data-nama': nama,
        'aria-label': `Pilih nama ${nama}`
      }, nama);
      tombol.addEventListener('click', () => pilihKandidat(nama));
      li.appendChild(tombol);
      daftarNama.appendChild(li);
    }
  }

  function perbaruiPertanyaan(teks) {
    if (typeof teks === 'string' && teks.trim() !== '') {
      namaPertanyaan.textContent = teks;
    }
    perbaruiSumber();
  }

  function perbaruiEjaan() {
    const nilai = sesi && typeof sesi.ejaan === 'string' ? sesi.ejaan : '';
    ejaanHasil.textContent = nilai === ''
      ? 'Ejaan: (belum ada huruf)'
      : `Ejaan: ${nilai}`;
    if (ejaanInput.value !== nilai) ejaanInput.value = nilai;
    btnEjaanHapus.disabled = nilai.length === 0;
    btnEjaanSelesai.disabled = nilai.trim().length === 0;
  }

  function selesaiNama(nama, sumberNama) {
    const valid = validasiNamaObat(nama);
    if (!valid.ok) {
      galat(valid.pesan);
      status(valid.pesan);
      return;
    }
    sesi = pilihNama(sesi, { sumber: sumberNama || sumber, nama: valid.nama });
    status(`Nama obat dipilih: ${valid.nama}.`);
    if (typeof onNama === 'function') onNama(valid.nama, sumberNama || sumber || 'ketik');
  }

  // -------------------------------------------------------------------------
  // Aksi
  // -------------------------------------------------------------------------
  function pilihSumberBaru(id) {
    const item = SUMBER.find((opsi) => opsi.id === id);
    if (!item) return;
    sumber = id;
    kandidat = [];
    clear(daftarNama);

    if (id === 'daftar') {
      if (daftarObat.length === 0) {
        renderKandidat();
        galat('Belum ada obat tersimpan.');
        status('Belum ada obat tersimpan.');
        return;
      }
      sesi = pilihNama(sesi, { sumber: id, medications: medicationsTersimpan() });
      kandidat = Array.isArray(sesi.kandidat) ? sesi.kandidat.slice() : [];
      renderKandidat();
      const pertama = bacaSatuPerSatu(kandidat)[0];
      perbaruiPertanyaan(pertama ? pertama.pertanyaan : item.petunjuk);
      if (pertama) baca(teksNamaDariDaftar(pertama.nama));
      status(pertama ? pertama.pertanyaan : item.petunjuk);
      return;
    }

    if (id === 'pindai') {
      const hasil = hasilPindaiTerakhir();
      if (daftarPindai.length === 0) {
        renderKandidat();
        galat('Tidak ada nama dari hasil pindai.');
        status('Tidak ada nama dari hasil pindai.');
        return;
      }
      sesi = pilihNama(sesi, { sumber: id, hasilPindai: hasil });
      kandidat = Array.isArray(sesi.kandidat) ? sesi.kandidat.slice() : [];
      renderKandidat();
      const pertama = bacaSatuPerSatu(kandidat)[0];
      perbaruiPertanyaan(pertama ? pertama.pertanyaan : item.petunjuk);
      if (pertama) baca(teksNamaDariDaftar(pertama.nama));
      status(pertama ? pertama.pertanyaan : item.petunjuk);
      return;
    }

    if (id === 'ketik') {
      sesi = buatSesiNama({ sumber: 'ketik', kandidat: [] });
      perbaruiPertanyaan('Ketik atau tempel nama obat, lalu tekan "Pakai nama ini".');
      perbaruiSumber();
      try {
        ketikInput.focus();
      } catch {
        // abaikan
      }
      return;
    }

    sesi = mulaiEjaan(sesi);
    perbaruiEjaan();
    perbaruiPertanyaan('Eja nama obat huruf per huruf.');
    perbaruiSumber();
    try {
      ejaanInput.focus();
    } catch {
      // abaikan
    }
  }

  function pilihKandidat(nama) {
    const valid = validasiNamaObat(nama);
    if (!valid.ok) {
      galat(valid.pesan);
      return;
    }
    selesaiNama(valid.nama, sumber === 'pindai' ? 'pindai' : 'daftar');
  }

  function terapkanHasilNama(hasil) {
    if (!hasil) return;
    sesi = hasil.sesi || sesi;
    if (hasil.error) {
      galat(hasil.error.pesan || 'Nama obat tidak valid.');
      status(hasil.error.pesan || 'Nama obat tidak valid.');
    }
    if (hasil.aksi === 'selesai') {
      selesaiNama(sesi.nama, sesi.sumber);
      return;
    }
    if (hasil.aksi === 'batal') {
      kandidat = [];
      clear(daftarNama);
      sumber = 'ketik';
      sesi = buatSesiNama({ sumber: 'ketik', kandidat: [] });
      perbaruiPertanyaan('Nama tidak ditemukan. Ketik atau eja nama obat.');
      perbaruiSumber();
      status(hasil.ucapan || 'Nama tidak ditemukan. Ketik atau eja nama obat.');
      try {
        ketikInput.focus();
      } catch {
        // abaikan
      }
      return;
    }
    if (hasil.aksi === 'tombol') {
      status('Silakan pilih tombol atau ketik nama obat.');
    }
    const pertanyaan = hasil.pertanyaan
      || (sesi.kandidat && sesi.kandidat[sesi.indeks]
        ? `${sesi.kandidat[sesi.indeks]}? ya atau tidak`
        : '');
    perbaruiPertanyaan(pertanyaan || hasil.ucapan || '');
    if (hasil.ucapan) baca(hasil.ucapan);
    else if (pertanyaan) baca(pertanyaan);
    perbaruiSumber();
  }

  function jawabYaTidak(teks) {
    if (!(sumber === 'daftar' || sumber === 'pindai')) {
      status(PESAN_SUARA_NAMA);
      galat(PESAN_SUARA_NAMA);
      return;
    }
    // Hanya ya/tidak/lain; transkrip ASR tidak pernah menjadi nama.
    const klasifikasi = cocokkanYaTidak(teks);
    if (klasifikasi === 'lain') {
      status('Jawaban belum jelas. Silakan jawab ya atau tidak.');
    }
    terapkanHasilNama(jawabNama(sesi, teks));
  }

  function terapkanEjaan(hasilSesi) {
    if (!hasilSesi) return;
    sesi = hasilSesi;
    if (sesi.error) {
      galat(sesi.error.pesan || 'Huruf tidak dikenal.');
      status(sesi.error.pesan || 'Huruf tidak dikenal.');
    }
    perbaruiEjaan();
  }

  function masukkanEjaan(teks) {
    const nilai = String(teks || '').toLowerCase();
    if (sesi.status === 'menunggu-konfirmasi-ejaan') return;
    if (sesi.sumber !== 'ejaan') return;

    const lama = typeof sesi.ejaan === 'string' ? sesi.ejaan : '';
    if (nilai.startsWith(lama)) {
      const delta = nilai.slice(lama.length);
      for (const karakter of delta) terapkanEjaan(tambahHuruf(sesi, karakter));
    } else {
      // Pengguna menghapus/mengganti: bangun ulang ejaan dari awal.
      sesi = mulaiEjaan(sesi);
      for (const karakter of nilai) terapkanEjaan(tambahHuruf(sesi, karakter));
    }
    perbaruiEjaan();
    status(sesi.ejaan ? `Ejaan: ${teksEjaan(sesi.ejaan)}.` : 'Belum ada huruf.');
  }

  function tekanSelesaiEjaan() {
    const hasil = selesaiEjaan(sesi);
    sesi = hasil;
    if (sesi.error) {
      galat(sesi.error.pesan || 'Nama hasil ejaan belum valid.');
      status(sesi.error.pesan || 'Nama hasil ejaan belum valid.');
      perbaruiEjaan();
      return;
    }
    perbaruiPertanyaan(`Apakah nama obatnya ${sesi.nama}?`);
    perbaruiSumber();
    perbaruiEjaan();
    baca(`Apakah nama obatnya ${sesi.nama}?`);
    status(`Apakah nama obatnya ${sesi.nama}?`);
  }

  function jawabKonfirmasiEjaan(teks) {
    terapkanHasilNama(konfirmasiEjaan(sesi, teks));
    perbaruiSumber();
  }

  // -------------------------------------------------------------------------
  // Peristiwa
  // -------------------------------------------------------------------------
  for (const [id, tombol] of tombolSumber) {
    pasang(tombol, 'click', () => pilihSumberBaru(id));
  }
  pasang(btnNamaYa, 'click', () => jawabYaTidak('ya'));
  pasang(btnNamaTidak, 'click', () => jawabYaTidak('tidak'));
  pasang(btnNamaKetik, 'click', () => {
    const hasil = ketikNama(sesi, ketikInput.value);
    if (hasil.error) galat(hasil.error.pesan);
    terapkanHasilNama(hasil);
  });
  pasang(ketikInput, 'keydown', (event) => {
    if (event.key === 'Enter') {
      event.preventDefault();
      btnNamaKetik.click();
    }
  });
  pasang(ejaanInput, 'input', () => masukkanEjaan(ejaanInput.value));
  pasang(btnEjaanHapus, 'click', () => {
    // Hapus satu karakter terakhir lalu sinkronkan input.
    const nilai = String(sesi.ejaan || '');
    masukkanEjaan(nilai.slice(0, -1));
    try {
      ejaanInput.focus();
    } catch {
      // abaikan
    }
  });
  pasang(btnEjaanSelesai, 'click', tekanSelesaiEjaan);
  pasang(btnEjaanYa, 'click', () => jawabKonfirmasiEjaan('ya'));
  pasang(btnEjaanTidak, 'click', () => jawabKonfirmasiEjaan('tidak'));

  muatSumber();
  perbaruiSumber();
  perbaruiEjaan();

  return {
    element,
    sumber: () => sumber,
    aktif: () => !disposed && sesi.status !== 'selesai' && sesi.status !== 'batal',
    bisaSuara: () => {
      if (disposed) return false;
      if (sesi.status === 'menunggu-konfirmasi-ejaan') return true;
      return sumber === 'daftar' || sumber === 'pindai' || sumber === 'ejaan';
    },
    /**
     * Umpan balik ASR untuk fase nama. Hanya jawaban ya/tidak untuk kandidat
     * atau satu huruf ejaan; tidak pernah memperlakukan transkrip sebagai nama.
     */
    jawabSuara: (teks) => {
      if (disposed) return { ok: false, pesan: 'Komponen tidak aktif.' };
      if (sesi.status === 'menunggu-konfirmasi-ejaan') {
        jawabKonfirmasiEjaan(teks);
        return { ok: true };
      }
      if (sumber === 'daftar' || sumber === 'pindai') {
        jawabYaTidak(teks);
        return { ok: true };
      }
      if (sumber === 'ejaan') {
        const hasil = tambahHuruf(sesi, teks);
        sesi = hasil;
        if (sesi.error) {
          galat(sesi.error.pesan || 'Huruf tidak dikenal.');
          status(sesi.error.pesan || 'Huruf tidak dikenal.');
          return { ok: false, pesan: sesi.error.pesan };
        }
        perbaruiEjaan();
        status(sesi.ejaan ? `Ejaan: ${teksEjaan(sesi.ejaan)}.` : 'Belum ada huruf.');
        baca(teksEjaan(sesi.ejaan));
        return { ok: true };
      }
      galat(PESAN_SUARA_NAMA);
      return { ok: false, pesan: PESAN_SUARA_NAMA };
    },
    pertanyaanSaatIni: () => namaPertanyaan.textContent || '',
    reset: () => {
      if (disposed) return;
      sesi = buatSesiNama();
      sumber = null;
      kandidat = [];
      clear(daftarNama);
      namaPertanyaan.textContent = 'Pilih sumber nama obat terlebih dahulu.';
      ketikInput.value = '';
      ejaanInput.value = '';
      perbaruiEjaan();
      muatSumber();
      perbaruiSumber();
    },
    fokus: () => {
      const pertama = tombolSumber.get('daftar');
      if (pertama && !pertama.disabled) {
        try {
          pertama.focus();
          return;
        } catch {
          // jatuh ke input
        }
      }
      try {
        ketikInput.focus();
      } catch {
        // abaikan
      }
    },
    destroy: () => {
      if (disposed) return;
      disposed = true;
      while (disposers.length > 0) {
        const lepas = disposers.pop();
        try {
          lepas();
        } catch {
          // abaikan
        }
      }
    }
  };
}

export default { buatPemilihNamaObat };
