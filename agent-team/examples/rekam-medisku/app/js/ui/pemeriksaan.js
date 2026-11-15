// Rekam Medisku — layar Pemeriksaan Pendamping (t25, CONTRACT.md 8B.9 & 9.4.11).
//
// Satu-satunya layar yang boleh mengubah `pemeriksaanOrangLain.status` menjadi
// 'sudah'. Perubahan hanya terjadi setelah nama pendamping/apoteker diisi dan
// pernyataan wajib dicentang, lalu `tandaiSudahDiperiksa` + `state.upsert`
// dipanggil. Suara, OCR, dan pencocokan foto tidak pernah menaikkan status.
// Tidak ada klaim medis di layar ini.

import { h, clear, on } from '../dom.js';
import {
  PERNYATAAN_PEMERIKSAAN,
  LABEL_BELUM_DIPERIKSA,
  butuhPemeriksaan,
  labelPemeriksaan,
  normalisasiPemeriksaan,
  tandaiSudahDiperiksa
} from '../logic/pemeriksaan.js';
import { formatSchedule } from '../logic/schedule.js';
import { penandaPemeriksaan, ringkasPenanda } from '../suara/penandaPemeriksaan.js';
import { attachmentDataUrl } from './attachments.js';
import { badgePemeriksaan } from './status-pemeriksaan.js';

const FILTER_VALUES = ['belum', 'sudah', 'semua'];

function namaObat(med) {
  const nama = med && typeof med.name === 'string' ? med.name.trim() : '';
  return nama || 'Obat tanpa nama';
}

function dosisText(med) {
  if (!med) return '';
  return [med.dose, med.doseUnit].filter(Boolean).join(' ').trim();
}

function aturanText(med) {
  if (!med) return '';
  return med.instructions || med.source?.translatedText || '';
}

function sumberText(med) {
  if (!med) return '';
  const dibuat = med.dibuatDengan || 'manual';
  const dikonfirmasi = med.dikonfirmasiDengan || 'manual';
  const adaFoto = Boolean(med.source?.photoId);
  const cocok = Boolean(med.source?.verifiedByUser);
  const fotoTeks = adaFoto
    ? (cocok
        ? 'ada dan pernah dicocokkan pengguna dengan foto (penanda sumber, bukan pemeriksaan pendamping)'
        : 'ada')
    : 'tidak ada';
  return `Sumber data: dibuat dengan ${dibuat}, dikonfirmasi dengan ${dikonfirmasi}. `
    + `Foto resep sumber: ${fotoTeks}. Pencocokan foto bukan pemeriksaan pendamping.`;
}

function terjemahanText(med) {
  if (!med) return 'Belum ada obat dipilih.';
  const bagian = [];
  const terjemahan = aturanText(med);
  if (terjemahan) bagian.push(`Terjemahan resep: ${terjemahan}`);
  else bagian.push('Tidak ada terjemahan resep tersimpan.');
  bagian.push(`Dosis: ${dosisText(med) || 'belum tertulis'}`);
  bagian.push(`Jadwal: ${formatSchedule(med) || 'belum ada jadwal'}`);
  return bagian.join(' · ');
}

function fieldEntries(med) {
  if (!med) {
    return [
      ['Nama', '-'],
      ['Kekuatan', '-'],
      ['Takaran', '-'],
      ['Aturan', '-'],
      ['Jadwal', '-']
    ];
  }
  const takaranUnits = Number.isFinite(med.stock?.unitsPerDose) ? med.stock.unitsPerDose : 1;
  const takaranUnit = med.stock?.unit || '';
  const entries = [
    ['Nama', namaObat(med)],
    ['Kekuatan', dosisText(med) || 'belum tertulis'],
    ['Takaran', `${takaranUnits} ${takaranUnit} per dosis`.trim()],
    ['Aturan', aturanText(med) || 'tidak ada aturan khusus'],
    ['Jadwal', formatSchedule(med) || 'belum ada jadwal']
  ];
  if (med.activeIngredient) entries.push(['Bahan aktif', med.activeIngredient]);
  if (med.notes) entries.push(['Catatan', med.notes]);
  return entries;
}

function buildErrorCard(message) {
  return h('div', { class: 'warning-box', role: 'alert' },
    h('strong', {}, 'Data obat tidak dapat dimuat. '),
    message || 'Muat ulang layar atau periksa kembali data Anda.');
}

// Pilihan dan pesan bertahan sebentar melewati ctx.refresh() agar status baru
// tetap terlihat dan live region tidak langsung kosong setelah penyimpanan.
let pilihanId = null;
let filterAktif = 'belum';
let pesanLive = '';

export async function render(root, ctx) {
  clear(root);

  const screen = h('section', { id: 'screen-pemeriksaan', class: 'screen pemeriksaan' });
  root.appendChild(screen);

  const profile = ctx?.profile || null;
  const profileId = profile?.id || null;
  const state = ctx?.state || null;

  const header = h('header', { class: 'screen-header' },
    h('h1', {}, 'Pemeriksaan Pendamping'),
    h('p', { class: 'muted' },
      'Tampilkan foto resep asli di samping terjemahan, lalu minta pendamping atau apoteker '
      + 'memeriksa dan menandatanganinya. Status hanya berubah di layar ini; suara, OCR, dan '
      + 'pencocokan foto bukan pemeriksaan pendamping.'));
  screen.appendChild(header);

  const live = h('p', {
    id: 'pemeriksaan-live',
    class: 'hint pemeriksaan-live',
    role: 'status',
    'aria-live': 'polite',
    'aria-atomic': 'true'
  }, pesanLive || '');
  screen.appendChild(live);

  if (!state || !profileId) {
    screen.appendChild(h('p', { class: 'empty-state' },
      'Profil aktif tidak ditemukan. ',
      h('a', { href: '#/profil' }, 'Buka Profil')));
    return undefined;
  }

  let medications = [];
  try {
    medications = state.list('medications', { profileId });
  } catch (error) {
    screen.appendChild(buildErrorCard(error?.message));
    return undefined;
  }

  medications = (Array.isArray(medications) ? medications : [])
    .filter((med) => med && med.active !== false)
    .slice()
    .sort((a, b) => namaObat(a).localeCompare(namaObat(b), 'id', { sensitivity: 'base' }));

  const total = medications.length;
  const ringkasan = ringkasPenanda(medications);
  if (!pesanLive) live.textContent = ringkasan.ariaLabel;

  if (!FILTER_VALUES.includes(filterAktif)) filterAktif = 'belum';

  // -----------------------------------------------------------------------
  // Struktur: filter + daftar | detail
  // -----------------------------------------------------------------------
  const layout = h('div', {
    class: 'pemeriksaan-layout',
    style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(290px,1fr));gap:1rem;align-items:start'
  });

  const listCard = h('section', { class: 'card pemeriksaan-list-card' });
  const countEl = h('span', { id: 'pemeriksaan-count', class: 'muted small', role: 'status' }, '');
  listCard.appendChild(h('div', { class: 'row' },
    h('h2', {}, 'Daftar obat'),
    countEl));

  const filterLabel = h('label', { for: 'pemeriksaan-filter' }, 'Tampilkan');
  const filterSelect = h('select', { id: 'pemeriksaan-filter', name: 'pemeriksaan-filter' },
    h('option', { value: 'belum', selected: filterAktif === 'belum' }, 'Belum diperiksa'),
    h('option', { value: 'sudah', selected: filterAktif === 'sudah' }, 'Sudah diperiksa'),
    h('option', { value: 'semua', selected: filterAktif === 'semua' }, 'Semua obat'));
  filterSelect.value = filterAktif;
  listCard.appendChild(h('div', { class: 'form-field' }, filterLabel, filterSelect));

  const empty = h('p', { id: 'pemeriksaan-empty', class: 'empty-state', hidden: true }, '');
  listCard.appendChild(empty);
  const list = h('ul', { id: 'pemeriksaan-list', class: 'list pemeriksaan-list' });
  listCard.appendChild(list);

  const detailCard = h('section', {
    id: 'pemeriksaan-detail',
    class: 'card pemeriksaan-detail',
    'aria-label': 'Detail pemeriksaan obat'
  });

  layout.appendChild(listCard);
  layout.appendChild(detailCard);
  screen.appendChild(layout);
  screen.appendChild(h('p', { class: 'hint' },
    'Tidak ada klaim medis dari aplikasi. Pernyataan di layar ini diisi oleh manusia; '
    + 'aplikasi hanya menyimpan siapa yang memeriksa dan kapan.'));

  // -----------------------------------------------------------------------
  // Detail
  // -----------------------------------------------------------------------
  let detailToken = 0;

  function renderDetail(med) {
    const token = ++detailToken;
    clear(detailCard);

    const status = med ? labelPemeriksaan(med) : LABEL_BELUM_DIPERIKSA;
    const sudah = Boolean(med && normalisasiPemeriksaan(med.pemeriksaanOrangLain).status === 'sudah');

    detailCard.appendChild(h('h2', { id: 'pemeriksaan-obat-nama' },
      med ? namaObat(med) : 'Belum ada obat dipilih'));
    detailCard.appendChild(h('p', { id: 'pemeriksaan-status', class: 'pemeriksaan-status-teks' },
      med ? status : 'Pilih obat dari daftar untuk melihat status pemeriksaan.'));

    const penandaStatus = med
      ? h('p', { class: 'pemeriksaan-status-badge' }, badgePemeriksaan(med))
      : null;
    if (penandaStatus) detailCard.appendChild(penandaStatus);

    detailCard.appendChild(h('p', { id: 'pemeriksaan-sumber', class: 'hint' },
      med ? sumberText(med) : 'Belum ada sumber data.'));

    // Foto resep asli di samping terjemahan/field.
    const foto = h('img', {
      id: 'pemeriksaan-resep-foto',
      class: 'pemeriksaan-resep-foto',
      alt: 'Foto resep asli',
      hidden: true
    });
    const fotoKosong = h('p', {
      id: 'pemeriksaan-resep-kosong',
      class: 'empty-state small',
      hidden: true
    }, 'Tidak ada foto resep sumber. Cocokkan dengan kemasan/resep asli.');
    const sourceFigure = h('figure', { class: 'pemeriksaan-source' },
      h('figcaption', { class: 'source-caption' },
        h('strong', {}, 'Foto resep asli'),
        ' — cocokkan dengan terjemahan dan field di samping.'),
      foto,
      fotoKosong);

    const fields = h('section', { class: 'pemeriksaan-fields' });
    fields.appendChild(h('h3', {}, 'Terjemahan dan data yang akan disimpan'));
    fields.appendChild(h('p', { id: 'pemeriksaan-terjemahan', class: 'pemeriksaan-terjemahan' },
      terjemahanText(med)));

    const daftarField = h('dl', { id: 'pemeriksaan-field-list', class: 'pemeriksaan-field-list' });
    for (const [label, value] of fieldEntries(med)) {
      daftarField.appendChild(h('dt', {}, label));
      daftarField.appendChild(h('dd', {}, value));
    }
    fields.appendChild(daftarField);

    // Form pemeriksaan manual (nama + pernyataan).
    const namaInput = h('input', {
      id: 'pemeriksaan-nama-pendamping',
      name: 'pemeriksaan-nama-pendamping',
      type: 'text',
      required: true,
      autocomplete: 'name',
      disabled: !med || sudah
    });
    const pernyataanCheckbox = h('input', {
      id: 'pemeriksaan-pernyataan',
      name: 'pemeriksaan-pernyataan',
      type: 'checkbox',
      required: true,
      disabled: !med || sudah
    });
    const pernyataanLabel = h('label', {
      id: 'pemeriksaan-pernyataan-label',
      for: 'pemeriksaan-pernyataan',
      class: 'pemeriksaan-pernyataan-label'
    }, PERNYATAAN_PEMERIKSAAN);

    const errorBox = h('p', {
      id: 'pemeriksaan-error',
      class: 'warning-text',
      role: 'alert',
      hidden: true
    }, '');

    const submit = h('button', {
      id: 'btn-pemeriksaan-sahkan',
      type: 'submit',
      class: 'btn btn-primary',
      disabled: true
    }, 'Sahkan pemeriksaan');

    const form = h('form', { class: 'pemeriksaan-form stack', novalidate: true },
      h('div', { class: 'form-field' },
        h('label', { for: 'pemeriksaan-nama-pendamping', class: 'required' },
          'Nama pendamping atau apoteker'),
        namaInput),
      h('div', { class: 'checkbox-field' },
        pernyataanCheckbox,
        pernyataanLabel),
      errorBox,
      h('div', { class: 'actions' }, submit));

    function perbaruiTombol() {
      const nama = namaInput.value.trim();
      const valid = Boolean(med) && !sudah && nama.length > 0 && pernyataanCheckbox.checked;
      submit.disabled = !valid;
      if (med && typeof namaInput.removeAttribute === 'function') {
        namaInput.removeAttribute('aria-invalid');
      }
    }

    on(namaInput, 'input', perbaruiTombol);
    on(pernyataanCheckbox, 'change', perbaruiTombol);

    on(form, 'submit', async (event) => {
      event.preventDefault();
      if (!med) return;

      const oleh = namaInput.value.trim();
      if (!oleh) {
        errorBox.textContent = 'Nama pendamping atau apoteker wajib diisi.';
        errorBox.hidden = false;
        namaInput.setAttribute('aria-invalid', 'true');
        namaInput.focus?.();
        return;
      }
      if (!pernyataanCheckbox.checked) {
        errorBox.textContent = 'Centang pernyataan pemeriksaan sebelum menyimpan.';
        errorBox.hidden = false;
        return;
      }

      submit.disabled = true;
      try {
        const waktu = typeof ctx.now === 'function' ? ctx.now() : new Date();
        const item = tandaiSudahDiperiksa(med, {
          oleh,
          pernyataan: PERNYATAAN_PEMERIKSAAN,
          waktu
        });
        const tersimpan = await state.upsert('medications', item);
        const finalItem = tersimpan && tersimpan.id ? tersimpan : item;

        const index = medications.findIndex((entry) => entry.id === med.id);
        if (index >= 0) medications[index] = finalItem;
        pilihanId = finalItem.id;

        pesanLive = labelPemeriksaan(finalItem);
        live.textContent = pesanLive;
        errorBox.hidden = true;

        if (typeof ctx.toast === 'function') {
          ctx.toast(`Pemeriksaan oleh ${oleh} tersimpan.`, 'success');
        }

        renderList();
        renderDetail(finalItem);

        if (typeof ctx.refresh === 'function') {
          Promise.resolve(ctx.refresh()).catch(() => {});
        }
      } catch (error) {
        submit.disabled = false;
        errorBox.textContent = error?.message || 'Pemeriksaan gagal disimpan.';
        errorBox.hidden = false;
        live.textContent = 'Pemeriksaan gagal disimpan. Silakan periksa kembali data.';
      }
    });

    if (sudah) {
      fields.appendChild(h('p', { class: 'hint' },
        'Obat ini sudah diperiksa. Status tidak berubah otomatis; '
        + 'perubahan hanya dapat dilakukan melalui layar Pemeriksaan Pendamping.'));
    }
    fields.appendChild(form);

    // Foto memuat asinkron; hanya pasang bila pilihan belum berubah.
    const photoId = med?.source?.photoId;
    if (photoId && typeof state.getSourcePhoto === 'function') {
      state.getSourcePhoto(photoId).then((photo) => {
        if (token !== detailToken) return;
        const dataUrl = attachmentDataUrl(photo);
        if (!dataUrl) throw new Error('Foto tidak tersedia.');
        foto.src = dataUrl;
        foto.hidden = false;
        fotoKosong.hidden = true;
      }).catch(() => {
        if (token !== detailToken) return;
        foto.hidden = true;
        fotoKosong.hidden = false;
      });
    } else {
      foto.hidden = true;
      fotoKosong.hidden = false;
    }

    // Susun dua kolom di dalam detail: sumber di kiri, field di kanan.
    detailCard.appendChild(h('div', {
      class: 'pemeriksaan-detail-grid',
      style: 'display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:1rem;align-items:start'
    }, sourceFigure, fields));

    perbaruiTombol();
  }

  // -----------------------------------------------------------------------
  // Daftar + filter
  // -----------------------------------------------------------------------
  function visibleMedications() {
    if (filterAktif === 'sudah') {
      return medications.filter((med) => !butuhPemeriksaan(med));
    }
    if (filterAktif === 'semua') return medications.slice();
    return medications.filter((med) => butuhPemeriksaan(med));
  }

  function updateCount(visible) {
    const ringkasanFilter = ringkasPenanda(medications);
    let teks;
    if (filterAktif === 'belum') {
      teks = `${visible.length} obat menunggu pemeriksaan dari ${total} obat aktif.`;
    } else if (filterAktif === 'sudah') {
      teks = `${visible.length} obat sudah diperiksa dari ${total} obat aktif.`;
    } else {
      teks = `${total} obat aktif: ${ringkasanFilter.belum} belum diperiksa, `
        + `${ringkasanFilter.sudah} sudah diperiksa.`;
    }
    countEl.textContent = teks;
    return teks;
  }

  function renderList() {
    clear(list);
    const visible = visibleMedications();
    updateCount(visible);

    if (visible.length === 0) {
      empty.hidden = false;
      empty.textContent = filterAktif === 'sudah'
        ? 'Belum ada obat yang sudah diperiksa.'
        : (filterAktif === 'semua'
            ? 'Belum ada obat aktif yang tercatat.'
            : 'Tidak ada obat yang menunggu pemeriksaan.');
    } else {
      empty.hidden = true;
    }

    for (const med of visible) {
      const penanda = penandaPemeriksaan(med);
      const terpilih = med.id === pilihanId;
      const button = h('button', {
        type: 'button',
        class: `pemeriksaan-list-item${terpilih ? ' is-selected' : ''}`,
        'data-action': 'pilih-pemeriksaan',
        'data-medication-id': med.id,
        'data-status-pemeriksaan': penanda.status,
        'aria-pressed': terpilih ? 'true' : 'false'
      },
        h('span', { class: 'pemeriksaan-list-nama' }, namaObat(med)),
        h('span', {
          class: `badge ${penanda.kelas} pemeriksaan-list-badge`,
          'data-status-pemeriksaan': penanda.status,
          'aria-label': penanda.ariaLabel
        }, penanda.label)
      );
      button.addEventListener('click', () => {
        pilihanId = med.id;
        pesanLive = '';
        live.textContent = `Dipilih: ${namaObat(med)}. ${penanda.label}.`;
        renderList();
        renderDetail(med);
      });
      list.appendChild(h('li', { class: 'list-item pemeriksaan-list-row' }, button));
    }

    if (!pilihanId && visible.length > 0) {
      pilihanId = visible[0].id;
    }
  }

  on(filterSelect, 'change', () => {
    filterAktif = FILTER_VALUES.includes(filterSelect.value) ? filterSelect.value : 'belum';
    renderList();
    const visible = visibleMedications();
    live.textContent = filterAktif === 'belum'
      ? `${visible.length} obat menunggu pemeriksaan.`
      : (filterAktif === 'sudah'
          ? `${visible.length} obat sudah diperiksa.`
          : `Menampilkan semua ${total} obat aktif.`);
    if (!pilihanId && visible.length > 0) {
      pilihanId = visible[0].id;
      renderDetail(medications.find((med) => med.id === pilihanId));
    }
  });

  renderList();

  if (total > 0) {
    const dipilih = medications.find((med) => med.id === pilihanId) || visibleMedications()[0] || medications[0];
    if (dipilih) {
      pilihanId = dipilih.id;
      renderDetail(dipilih);
    } else {
      renderDetail(null);
    }
  } else {
    renderDetail(null);
  }

  return undefined;
}

export default render;
