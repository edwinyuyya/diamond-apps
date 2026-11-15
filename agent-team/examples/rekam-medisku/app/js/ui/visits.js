// Rekam Medisku — layar Kunjungan (t6).
// Linimasa, form tambah/ubah/hapus, lampiran, dan tautan foto sumber.
// Diagnosis selalu ditampilkan sebagai teks yang ditulis pengguna/dokumen.

import { h, clear } from '../dom.js';
import {
  DISCLAIMERS,
  MAX_ATTACHMENTS_PER_VISIT
} from '../model.js';
import {
  todayISO,
  isValidDateISO,
  formatDateID,
  formatBytes
} from '../logic/dates.js';
import {
  fileToAttachment,
  attachmentDataUrl,
  validateAttachment
} from './attachments.js';

const ALLOWED_FILE_TYPES = 'image/jpeg,image/png,image/webp,image/gif,application/pdf';

function formatDateSafe(dateISO, style = 'long') {
  try {
    return formatDateID(dateISO, style);
  } catch {
    return dateISO || '';
  }
}

function field(labelText, control, { hint = '', required = false } = {}) {
  const wrapper = h('div', { class: 'field' });
  const label = h('label', { for: control.id }, labelText);
  if (required) label.appendChild(document.createTextNode(' *'));
  wrapper.appendChild(label);
  wrapper.appendChild(control);
  if (hint) wrapper.appendChild(h('p', { class: 'hint' }, hint));
  return wrapper;
}

function showElement(node, visible) {
  if (node) node.hidden = !visible;
}

function attachmentPreview(att, { compact = false } = {}) {
  const dataUrl = attachmentDataUrl(att);
  const isImage = typeof att.mime === 'string' && att.mime.startsWith('image/');
  const item = h('li', { class: 'attachment-item' });

  if (isImage && dataUrl) {
    item.appendChild(h('img', {
      class: compact ? 'attachment-thumb attachment-thumb--small' : 'attachment-thumb',
      src: dataUrl,
      alt: `Pratinjau ${att.name || 'lampiran'}`,
      loading: 'lazy'
    }));
  }

  const info = h('div', { class: 'attachment-info' });
  info.appendChild(h('span', { class: 'attachment-name' }, att.name || 'Lampiran'));
  info.appendChild(h('span', { class: 'muted small' },
    `${formatBytes(att.size || 0)}${att.mime === 'application/pdf' ? ' · PDF' : ''}`));
  if (dataUrl) {
    const link = h('a', {
      class: 'attachment-download',
      href: dataUrl,
      download: att.name || 'lampiran'
    }, att.mime === 'application/pdf' ? 'Unduh PDF' : 'Unduh');
    info.appendChild(link);
  }
  item.appendChild(info);
  return item;
}

function buildErrorCard(message) {
  return h('section', { class: 'card', role: 'alert' },
    h('h2', {}, 'Data kunjungan tidak dapat dimuat'),
    h('p', {}, message || 'Coba muat ulang layar ini.'));
}

/**
 * Render layar Kunjungan.
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function render(root, ctx) {
  clear(root);

  const screen = h('section', { id: 'screen-visits', class: 'screen visits' });
  root.appendChild(screen);

  const profile = ctx.profile || null;
  const profileId = profile?.id || null;
  const now = typeof ctx.now === 'function' ? ctx.now() : new Date();

  let visits = [];
  try {
    visits = profileId ? ctx.state.list('visits', { profileId }) : ctx.state.list('visits');
  } catch (error) {
    screen.appendChild(buildErrorCard(error?.message));
    return undefined;
  }
  visits = Array.isArray(visits) ? visits.slice() : [];
  visits.sort((a, b) => (
    String(b.date || '').localeCompare(String(a.date || ''))
    || String(b.createdAt || '').localeCompare(String(a.createdAt || ''))
  ));

  const local = {
    editingId: null,
    attachments: [],
    saving: false
  };

  // ---------------------------------------------------------------------
  // Header
  // ---------------------------------------------------------------------

  const header = h('header', { class: 'screen-header' });
  header.appendChild(h('h1', {}, 'Kunjungan'));
  header.appendChild(h('p', { class: 'muted' },
    'Catatan kontrol, keluhan, dan diagnosis yang Anda tulis sendiri.'));
  const newButton = h('button', {
    id: 'btn-new-visit',
    type: 'button',
    class: 'btn btn-primary'
  }, 'Tambah kunjungan');
  header.appendChild(h('div', { class: 'actions' }, newButton));
  screen.appendChild(header);

  if (!profileId) {
    screen.appendChild(h('p', { class: 'empty-state' },
      'Profil aktif tidak ditemukan. ', h('a', { href: '#/profil' }, 'Buka Profil')));
    return undefined;
  }

  // ---------------------------------------------------------------------
  // Form tambah/ubah
  // ---------------------------------------------------------------------

  const form = h('form', {
    id: 'visit-form',
    class: 'card stack visit-form',
    novalidate: true,
    hidden: true
  });
  const formTitle = h('h2', {}, 'Tambah kunjungan');
  form.appendChild(formTitle);

  const idInput = h('input', { id: 'visit-id', name: 'id', type: 'hidden', value: '' });
  form.appendChild(idInput);

  const dateInput = h('input', {
    id: 'visit-date',
    name: 'date',
    type: 'date',
    required: true
  });
  const doctorInput = h('input', {
    id: 'visit-doctor',
    name: 'doctorName',
    type: 'text',
    maxlength: 160,
    autocomplete: 'off'
  });
  const facilityInput = h('input', {
    id: 'visit-facility',
    name: 'facility',
    type: 'text',
    maxlength: 160,
    autocomplete: 'off'
  });
  const complaintInput = h('textarea', {
    id: 'visit-complaint',
    name: 'complaint',
    rows: 2
  });
  const diagnosisInput = h('textarea', {
    id: 'visit-diagnosis',
    name: 'diagnosis',
    rows: 2
  });
  const notesInput = h('textarea', {
    id: 'visit-notes',
    name: 'notes',
    rows: 2
  });

  form.appendChild(h('div', { class: 'form-grid' },
    field('Tanggal kunjungan', dateInput, { required: true }),
    field('Dokter', doctorInput),
    field('Faskes', facilityInput)
  ));
  form.appendChild(field('Keluhan', complaintInput, {
    hint: 'Tulis keluhan dengan kata-kata Anda sendiri.'
  }));
  form.appendChild(field('Diagnosis (sesuai yang Anda tulis)', diagnosisInput, {
    hint: 'Teks ini berasal dari Anda atau dokumen asli, bukan hasil aplikasi. '
      + 'Aplikasi tidak mendiagnosis.'
  }));
  form.appendChild(field('Catatan', notesInput, {
    hint: 'Mis. anjuran kontrol, hasil pemeriksaan, atau hal yang ingin ditanyakan.'
  }));

  const fileInput = h('input', {
    id: 'visit-file-input',
    name: 'attachments',
    type: 'file',
    accept: ALLOWED_FILE_TYPES,
    multiple: true
  });
  form.appendChild(field('Lampiran', fileInput, {
    hint: `Foto atau PDF kecil, maksimal ${formatBytes(1048576)} per berkas dan `
      + `${MAX_ATTACHMENTS_PER_VISIT} berkas per kunjungan. Gambar besar akan dikompres.`
  }));

  const attachmentList = h('ul', { id: 'visit-attachment-list', class: 'attachment-list' });
  form.appendChild(attachmentList);
  form.appendChild(h('p', { class: 'muted small' }, DISCLAIMERS.photo));

  const formError = h('p', {
    id: 'visit-form-error',
    class: 'error-text',
    role: 'alert',
    hidden: true
  });
  form.appendChild(formError);

  const saveButton = h('button', {
    id: 'btn-save-visit',
    type: 'submit',
    class: 'btn btn-primary'
  }, 'Simpan kunjungan');
  const cancelButton = h('button', {
    id: 'btn-cancel-visit',
    type: 'button',
    class: 'btn btn-secondary'
  }, 'Batal');
  form.appendChild(h('div', { class: 'actions' }, saveButton, cancelButton));
  screen.appendChild(form);

  function showFormError(message) {
    formError.textContent = message || '';
    formError.hidden = !message;
  }

  function renderAttachmentList() {
    clear(attachmentList);
    if (!local.attachments.length) {
      attachmentList.appendChild(h('li', { class: 'empty-state' },
        'Belum ada lampiran.'));
      return;
    }
    local.attachments.forEach((att) => {
      const item = attachmentPreview(att);
      const remove = h('button', {
        type: 'button',
        class: 'btn btn-secondary attachment-remove',
        'data-action': 'remove-attachment',
        'data-attachment-id': att.id || '',
        'aria-label': `Hapus lampiran ${att.name || ''}`
      }, 'Hapus');
      item.appendChild(remove);
      attachmentList.appendChild(item);
    });
  }

  function resetForm() {
    form.reset();
    local.editingId = null;
    idInput.value = '';
    local.attachments = [];
    renderAttachmentList();
    showFormError('');
    formTitle.textContent = 'Tambah kunjungan';
  }

  function openForm(visit = null) {
    resetForm();
    if (visit) {
      local.editingId = visit.id;
      idInput.value = visit.id;
      local.attachments = Array.isArray(visit.attachments)
        ? visit.attachments.map((att) => ({ ...att }))
        : [];
      formTitle.textContent = 'Ubah kunjungan';
      dateInput.value = visit.date || '';
      doctorInput.value = visit.doctorName || '';
      facilityInput.value = visit.facility || '';
      complaintInput.value = visit.complaint || '';
      diagnosisInput.value = visit.diagnosis || '';
      notesInput.value = visit.notes || '';
      renderAttachmentList();
    } else {
      dateInput.value = todayISO(now);
    }
    form.hidden = false;
    if (typeof form.scrollIntoView === 'function') {
      form.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    dateInput.focus();
  }

  function closeForm() {
    resetForm();
    form.hidden = true;
  }

  // ---------------------------------------------------------------------
  // Dialog foto sumber
  // ---------------------------------------------------------------------

  const photoImage = h('img', {
    class: 'source-photo',
    alt: 'Foto sumber dokumen',
    hidden: true
  });
  const photoStatus = h('p', { class: 'muted small', role: 'status' }, '');
  const photoDialog = h('dialog', {
    class: 'source-photo-dialog',
    'aria-labelledby': 'source-photo-title'
  },
  h('div', { class: 'dialog-body' },
    h('div', { class: 'row dialog-heading' },
      h('h2', { id: 'source-photo-title' }, 'Foto sumber'),
      h('button', {
        type: 'button',
        class: 'btn btn-secondary',
        'data-action': 'close-photo-dialog'
      }, 'Tutup')),
    photoStatus,
    photoImage,
    h('p', { class: 'muted small' }, DISCLAIMERS.photo)));
  screen.appendChild(photoDialog);

  function openPhotoDialog() {
    if (typeof photoDialog.showModal === 'function' && !photoDialog.open) {
      try {
        photoDialog.showModal();
        return;
      } catch {
        // fallback di bawah
      }
    }
    photoDialog.setAttribute('open', '');
  }

  async function showSourcePhoto(photoId) {
    photoImage.hidden = true;
    photoImage.removeAttribute('src');
    photoStatus.textContent = 'Memuat foto sumber…';
    openPhotoDialog();
    try {
      const photo = await ctx.state.getSourcePhoto(photoId);
      const dataUrl = attachmentDataUrl(photo);
      if (!photo || !dataUrl) throw new Error('Foto tidak tersedia.');
      photoImage.src = dataUrl;
      photoImage.alt = 'Foto sumber dokumen';
      photoImage.hidden = false;
      photoStatus.textContent = '';
    } catch (error) {
      photoStatus.textContent = error?.code === 'TERKUNCI'
        ? 'Aplikasi terkunci. Buka kunci untuk melihat foto sumber.'
        : error?.code === 'FOTO_TIDAK_ADA'
          ? 'Foto sumber tidak ditemukan. Foto mungkin sudah dihapus.'
          : 'Foto sumber tidak dapat dibuka. '
            + 'Bila kata sandi pernah diubah, foto lama mungkin tidak dapat dibuka.';
    }
  }

  // ---------------------------------------------------------------------
  // Linimasa
  // ---------------------------------------------------------------------

  const countBadge = h('span', { id: 'visit-count', class: 'badge' },
    `${visits.length} kunjungan`);
  const timelineCard = h('section', { class: 'card' });
  timelineCard.appendChild(h('div', { class: 'row' },
    h('h2', {}, 'Linimasa kunjungan'),
    countBadge));
  const timeline = h('ul', { id: 'visit-timeline', class: 'list visit-timeline' });
  timelineCard.appendChild(timeline);
  screen.appendChild(timelineCard);

  function renderTimeline() {
    clear(timeline);
    if (!visits.length) {
      timeline.appendChild(h('li', { class: 'empty-state' },
        'Belum ada kunjungan. Tekan "Tambah kunjungan" untuk mencatat kontrol pertama.'));
      return;
    }

    for (const visit of visits) {
      const item = h('li', { class: 'visit-item', 'data-visit-id': visit.id });
      const heading = h('div', { class: 'visit-heading' });
      heading.appendChild(h('strong', { class: 'visit-date' },
        formatDateSafe(visit.date) || 'Tanggal tidak tercatat'));
      const place = [visit.doctorName, visit.facility].filter(Boolean).join(' · ');
      if (place) heading.appendChild(h('span', { class: 'visit-place' }, place));
      item.appendChild(heading);

      if (visit.complaint) {
        item.appendChild(h('p', { class: 'visit-row' },
          h('strong', {}, 'Keluhan: '), visit.complaint));
      }
      if (visit.diagnosis) {
        item.appendChild(h('p', { class: 'visit-row' },
          h('strong', {}, 'Diagnosis (sesuai yang Anda tulis): '), visit.diagnosis));
      }
      if (visit.notes) {
        item.appendChild(h('p', { class: 'visit-row' }, h('strong', {}, 'Catatan: '), visit.notes));
      }

      if (visit.source?.verifiedByUser) {
        const sourceRow = h('div', { class: 'row visit-source' });
        sourceRow.appendChild(h('span', { class: 'badge badge-verified' },
          'Diverifikasi dari dokumen'));
        if (visit.source.photoId) {
          sourceRow.appendChild(h('button', {
            type: 'button',
            class: 'btn btn-secondary btn-small',
            'data-action': 'view-source-photo',
            'data-photo-id': visit.source.photoId
          }, 'Lihat foto sumber'));
        }
        item.appendChild(sourceRow);
      }

      const attachments = Array.isArray(visit.attachments) ? visit.attachments : [];
      if (attachments.length) {
        const attachmentBox = h('div', { class: 'visit-attachments' });
        attachmentBox.appendChild(h('p', { class: 'muted small' },
          `Lampiran (${attachments.length})`));
        const list = h('ul', { class: 'attachment-list attachment-list--compact' });
        for (const att of attachments) {
          const li = attachmentPreview(att, { compact: true });
          list.appendChild(li);
        }
        attachmentBox.appendChild(list);
        item.appendChild(attachmentBox);
      }

      const actions = h('div', { class: 'actions' },
        h('button', {
          type: 'button',
          class: 'btn btn-secondary',
          'data-action': 'edit-visit',
          'data-visit-id': visit.id
        }, 'Ubah'),
        h('button', {
          type: 'button',
          class: 'btn btn-danger',
          'data-action': 'delete-visit',
          'data-visit-id': visit.id
        }, 'Hapus'));
      item.appendChild(actions);

      timeline.appendChild(item);
    }
  }

  // ---------------------------------------------------------------------
  // Aksi
  // ---------------------------------------------------------------------

  async function saveVisit() {
    if (local.saving) return;
    showFormError('');

    const date = dateInput.value;
    if (!isValidDateISO(date)) {
      showFormError('Tanggal kunjungan wajib diisi dengan tanggal yang valid.');
      dateInput.focus();
      return;
    }
    if (local.attachments.length > MAX_ATTACHMENTS_PER_VISIT) {
      showFormError(`Lampiran maksimal ${MAX_ATTACHMENTS_PER_VISIT} per kunjungan.`);
      return;
    }
    const invalidAttachment = local.attachments.find((att) => !validateAttachment(att));
    if (invalidAttachment) {
      showFormError('Ada lampiran yang tidak valid atau terlalu besar. Hapus lalu pilih ulang.');
      return;
    }

    const base = local.editingId
      ? visits.find((visit) => visit.id === local.editingId) || null
      : null;

    const item = {
      profileId,
      date,
      doctorName: doctorInput.value.trim(),
      facility: facilityInput.value.trim(),
      complaint: complaintInput.value.trim(),
      diagnosis: diagnosisInput.value.trim(),
      notes: notesInput.value.trim(),
      attachments: local.attachments.map((att) => ({ ...att })),
      source: base?.source ?? null
    };
    if (base) {
      item.id = base.id;
      item.createdAt = base.createdAt;
      item.updatedAt = base.updatedAt;
    }

    local.saving = true;
    saveButton.disabled = true;
    try {
      await ctx.state.upsert('visits', item);
      ctx.toast(base ? 'Kunjungan diperbarui.' : 'Kunjungan disimpan.', 'success');
      await ctx.refresh();
    } catch (error) {
      showFormError(error?.message || 'Kunjungan gagal disimpan. Periksa kembali data Anda.');
      local.saving = false;
      saveButton.disabled = false;
    }
  }

  async function handleFiles() {
    const files = Array.from(fileInput.files || []);
    fileInput.value = '';
    if (!files.length) return;
    showFormError('');

    for (const file of files) {
      if (local.attachments.length >= MAX_ATTACHMENTS_PER_VISIT) {
        showFormError(`Lampiran maksimal ${MAX_ATTACHMENTS_PER_VISIT} per kunjungan.`);
        break;
      }
      try {
        const attachment = await fileToAttachment(file);
        if (!validateAttachment(attachment)) {
          throw new Error('Lampiran tidak valid setelah diproses.');
        }
        local.attachments.push(attachment);
      } catch (error) {
        showFormError(error?.message || `Berkas "${file.name}" tidak dapat dilampirkan.`);
      }
    }
    renderAttachmentList();
  }

  async function deleteVisit(visitId) {
    const visit = visits.find((entry) => entry.id === visitId);
    const label = visit ? formatDateSafe(visit.date, 'short') : 'ini';
    if (!ctx.confirm(`Hapus kunjungan ${label}? Tindakan ini tidak dapat dibatalkan.`)) return;
    try {
      await ctx.state.remove('visits', visitId);
      ctx.toast('Kunjungan dihapus.', 'success');
      await ctx.refresh();
    } catch (error) {
      ctx.toast(error?.message || 'Kunjungan gagal dihapus.', 'error');
    }
  }

  const clickHandler = async (event) => {
    const target = event.target && typeof event.target.closest === 'function'
      ? event.target.closest('[data-action]')
      : null;
    if (!target || !screen.contains(target)) return;
    const action = target.dataset.action;

    if (action === 'edit-visit') {
      const visit = visits.find((entry) => entry.id === target.dataset.visitId);
      if (visit) openForm(visit);
      return;
    }
    if (action === 'delete-visit') {
      await deleteVisit(target.dataset.visitId);
      return;
    }
    if (action === 'view-source-photo') {
      await showSourcePhoto(target.dataset.photoId);
      return;
    }
    if (action === 'remove-attachment') {
      const index = local.attachments.findIndex((att) => att.id === target.dataset.attachmentId);
      if (index >= 0) local.attachments.splice(index, 1);
      renderAttachmentList();
      return;
    }
    if (action === 'close-photo-dialog') {
      if (typeof photoDialog.close === 'function') photoDialog.close();
      else photoDialog.removeAttribute('open');
    }
  };

  newButton.addEventListener('click', () => openForm(null));
  cancelButton.addEventListener('click', () => closeForm());
  form.addEventListener('submit', (event) => {
    event.preventDefault();
    saveVisit();
  });
  fileInput.addEventListener('change', () => {
    handleFiles();
  });
  screen.addEventListener('click', clickHandler);

  renderAttachmentList();
  renderTimeline();

  return () => {
    screen.removeEventListener('click', clickHandler);
  };
}

export default render;
