// Rekam Medisku — layar Pengaturan (t5).
// Tampilan, penyimpanan, cadangan, kata sandi, dan reset. Tanpa dependency eksternal.

import { h, clear } from '../dom.js';
import { DISCLAIMERS, APP_VERSION } from '../model.js';
import { formatBytes } from '../logic/dates.js';

const KIND_LABELS = {
  indexeddb: 'IndexedDB',
  indexedDB: 'IndexedDB',
  localstorage: 'localStorage',
  localStorage: 'localStorage',
  memory: 'Memori sementara (tidak persisten)',
  none: 'Tidak tersedia'
};

function flatten(children, out = []) {
  for (const child of children) {
    if (Array.isArray(child)) flatten(child, out);
    else if (child !== null && child !== undefined && child !== false) out.push(child);
  }
  return out;
}

function create(tag, attrs = {}, ...children) {
  const props = {};
  let className = '';
  for (const [key, value] of Object.entries(attrs || {})) {
    if (key === 'class' || key === 'className') {
      className = value == null ? '' : String(value);
    } else {
      props[key] = value;
    }
  }
  const node = h(tag, props, ...flatten(children));
  if (className) node.className = className;
  return node;
}

function text(value) {
  return value == null ? '' : String(value);
}

function toast(ctx, message, tone = 'info') {
  if (typeof ctx?.toast === 'function') ctx.toast(message, tone);
}

function field(labelText, control, hint = '') {
  const wrapper = create('div', { class: 'field' });
  wrapper.appendChild(create('label', { for: control.id }, labelText));
  wrapper.appendChild(control);
  if (hint) wrapper.appendChild(create('p', { class: 'hint' }, hint));
  return wrapper;
}

function kindLabel(kind) {
  if (!kind) return 'Tidak diketahui';
  return KIND_LABELS[kind] || String(kind);
}

function bytesLabel(bytes) {
  if (typeof bytes !== 'number' || !Number.isFinite(bytes)) return 'tidak tersedia';
  const formatted = formatBytes(bytes);
  return formatted || `${bytes} B`;
}

function applyDisplaySettings(settings) {
  const root = document.documentElement;
  if (!root) return;
  root.classList.toggle('is-large-text', settings?.fontLarge === true);
  if (root.dataset) {
    root.dataset.contrast = settings?.highContrast === true ? 'high' : 'normal';
  }
}

function setStatus(node, message, tone = 'info') {
  if (!node) return;
  node.textContent = message || '';
  const toneClass = tone === 'error' ? 'error-text' : tone === 'success' ? 'success-text' : 'muted';
  node.className = `status-message ${toneClass}`;
}

function downloadText(filename, content) {
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  document.body.appendChild(link);
  link.click();
  link.remove();
  return url;
}

function currentSettings(ctx) {
  try {
    // Salin agar layar tidak pernah memutasi objek state secara langsung.
    return { ...(ctx.state.getState()?.settings || {}) };
  } catch {
    return {};
  }
}

/**
 * Render layar Pengaturan.
 * @param {HTMLElement} root
 * @param {object} ctx
 */
export async function render(root, ctx) {
  clear(root);
  const state = ctx.state;
  const settings = currentSettings(ctx);
  const timers = new Set();

  const screen = create('section', { id: 'screen-settings', class: 'screen settings' });
  screen.appendChild(create('header', { class: 'screen-header' },
    create('h1', {}, 'Pengaturan'),
    create('p', { class: 'muted' },
      `Rekam Medisku ${APP_VERSION} — data hanya tersimpan di perangkat ini.`)));

  // ---------------------------------------------------------------------
  // Tampilan
  // ---------------------------------------------------------------------
  const settingsForm = create('form', { id: 'settings-form', class: 'card' });
  settingsForm.appendChild(create('h2', {}, 'Tampilan & pengingat'));
  settingsForm.addEventListener('submit', (event) => event.preventDefault());

  const makeToggle = ({ id, label, hint, key }) => {
    const checkbox = create('input', {
      id,
      type: 'checkbox',
      'data-setting': key
    });
    checkbox.checked = settings[key] === true;
    const wrapper = create('div', { class: 'field' });
    const labelNode = create('label', { for: id, class: 'checkbox-field' });
    labelNode.appendChild(checkbox);
    labelNode.appendChild(create('span', {}, label));
    wrapper.appendChild(labelNode);
    if (hint) wrapper.appendChild(create('p', { class: 'hint' }, hint));

    checkbox.addEventListener('change', async () => {
      const nextValue = checkbox.checked;
      checkbox.disabled = true;
      try {
        const next = await state.setSettings({ [key]: nextValue });
        settings[key] = nextValue;
        applyDisplaySettings({ ...settings, ...next });
        toast(ctx, 'Pengaturan disimpan.', 'success');
      } catch (error) {
        checkbox.checked = !nextValue;
        toast(ctx, error?.message || 'Pengaturan gagal disimpan.', 'error');
      } finally {
        checkbox.disabled = false;
      }
    });
    return wrapper;
  };

  settingsForm.appendChild(makeToggle({
    id: 'settings-large-text',
    label: 'Huruf besar',
    hint: 'Memperbesar teks dasar agar lebih mudah dibaca.',
    key: 'fontLarge'
  }));
  settingsForm.appendChild(makeToggle({
    id: 'settings-contrast',
    label: 'Kontras tinggi',
    hint: 'Warna lebih tegas untuk keterbacaan.',
    key: 'highContrast'
  }));
  settingsForm.appendChild(makeToggle({
    id: 'settings-reminders',
    label: 'Sorot dosis yang waktunya tiba',
    hint: 'Pengingat hanya tampil di dalam aplikasi; tidak ada notifikasi latar belakang.',
    key: 'reminders'
  }));
  screen.appendChild(settingsForm);

  // ---------------------------------------------------------------------
  // Penyimpanan
  // ---------------------------------------------------------------------
  const storageCard = create('section', { class: 'card' });
  storageCard.appendChild(create('h2', {}, 'Penyimpanan'));
  const storageInfo = create('div', {
    id: 'storage-info',
    class: 'storage-info',
    'aria-live': 'polite'
  }, 'Memuat informasi penyimpanan…');
  storageCard.appendChild(storageInfo);
  storageCard.appendChild(create('p', { class: 'hint' },
    'Data utama dan foto sumber disimpan terpisah. Foto sumber tidak ikut ekspor cadangan JSON.'));
  screen.appendChild(storageCard);

  async function updateStorageInfo() {
    let info = null;
    let photoCount = null;
    try {
      info = await state.getStorageInfo();
    } catch (error) {
      storageInfo.textContent = `Informasi penyimpanan tidak tersedia: ${error?.message || 'kesalahan tidak diketahui'}`;
      return;
    }
    try {
      const photos = await state.listSourcePhotos();
      photoCount = Array.isArray(photos) ? photos.length : 0;
    } catch {
      photoCount = null;
    }

    storageInfo.textContent = '';
    const rows = [
      ['Data utama', `${kindLabel(info?.kind)} · ${bytesLabel(info?.bytes)}`],
      ['Foto sumber', `${kindLabel(info?.photoKind)} · ${bytesLabel(info?.photoBytes)}`]
    ];
    if (photoCount != null) rows.push(['Jumlah foto sumber', `${photoCount} foto`]);

    const dl = create('dl', { class: 'stack summary-list' });
    for (const [label, value] of rows) {
      dl.appendChild(create('div', { class: 'summary-row row' },
        create('dt', {}, label),
        create('dd', {}, value)));
    }
    storageInfo.appendChild(dl);
    storageInfo.appendChild(create('p', { class: 'hint' }, DISCLAIMERS.photo));
  }

  // ---------------------------------------------------------------------
  // Cadangan
  // ---------------------------------------------------------------------
  const backupForm = create('form', { id: 'backup-form', class: 'card' });
  backupForm.appendChild(create('h2', {}, 'Cadangan & pemulihan'));
  backupForm.appendChild(create('p', { class: 'warning-box' }, DISCLAIMERS.photo));
  backupForm.appendChild(create('p', { class: 'hint' },
    'Cadangan JSON memuat profil, kunjungan, obat, catatan minum, vital, lab, dan lampiran. '
    + 'Foto sumber pindai TIDAK ikut serta; simpan foto asli Anda secara terpisah.'));
  backupForm.addEventListener('submit', (event) => event.preventDefault());

  const exportPassword = create('input', {
    id: 'export-password',
    type: 'password',
    autocomplete: 'new-password',
    placeholder: 'Kosongkan bila tidak dienkripsi'
  });
  const exportButton = create('button', {
    id: 'btn-export',
    type: 'button',
    class: 'button button--primary'
  }, 'Ekspor cadangan');
  const importFile = create('input', {
    id: 'import-file',
    type: 'file',
    accept: '.json,.rawatku.json,application/json'
  });
  const importPassword = create('input', {
    id: 'import-password',
    type: 'password',
    autocomplete: 'current-password',
    placeholder: 'Kata sandi cadangan (bila ada)'
  });
  const importButton = create('button', {
    id: 'btn-import',
    type: 'button',
    class: 'button button--ghost'
  }, 'Impor & ganti data');
  const backupStatus = create('p', {
    id: 'backup-status',
    class: 'status-message muted',
    role: 'status',
    'aria-live': 'polite'
  }, 'Belum ada aktivitas cadangan.');

  backupForm.appendChild(create('h3', {}, 'Ekspor'));
  backupForm.appendChild(field('Kata sandi cadangan (opsional)', exportPassword,
    'Bila diisi, berkas cadangan dienkripsi AES-GCM. Kata sandi cadangan tidak dapat dipulihkan.'));
  backupForm.appendChild(create('div', { class: 'actions' }, exportButton));

  backupForm.appendChild(create('h3', {}, 'Impor'));
  backupForm.appendChild(field('Berkas cadangan', importFile));
  backupForm.appendChild(field('Kata sandi cadangan', importPassword,
    'Hanya diperlukan untuk cadangan terenkripsi.'));
  backupForm.appendChild(create('div', { class: 'actions' }, importButton));
  backupForm.appendChild(backupStatus);
  backupForm.appendChild(create('p', { class: 'warning-box' },
    'Impor mode ganti akan MENGGANTI seluruh data di perangkat ini. Profil, catatan, '
    + 'dan lampiran saat ini akan hilang. Ekspor cadangan terlebih dahulu bila ragu. '
    + 'Foto sumber tidak dipulihkan dari cadangan.'));
  screen.appendChild(backupForm);

  exportButton.addEventListener('click', async () => {
    exportButton.disabled = true;
    setStatus(backupStatus, 'Menyiapkan cadangan…', 'info');
    try {
      const password = exportPassword.value || null;
      const result = await state.exportBackup({ password });
      if (!result || typeof result.text !== 'string') {
        throw new Error('Cadangan tidak dapat dibuat.');
      }
      const filename = result.filename || 'rawatku-cadangan.rawatku.json';
      const url = downloadText(filename, result.text);
      const timer = setTimeout(() => {
        clearTimeout(timer);
        timers.delete(timer);
        try {
          URL.revokeObjectURL(url);
        } catch {
          // abaikan
        }
      }, 2000);
      timers.add(timer);
      const photoCount = Number(result.meta?.photoCount) || 0;
      const photoNote = photoCount > 0
        ? ` ${photoCount} foto sumber TIDAK disertakan.`
        : ' Foto sumber tidak disertakan.';
      setStatus(backupStatus, `Cadangan diunduh: ${filename}.${photoNote}`, 'success');
      toast(ctx, 'Cadangan berhasil diunduh.', 'success');
    } catch (error) {
      const message = error?.message || 'Cadangan gagal diekspor.';
      setStatus(backupStatus, message, 'error');
      toast(ctx, message, 'error');
    } finally {
      exportButton.disabled = false;
    }
  });

  importButton.addEventListener('click', async () => {
    const file = importFile.files && importFile.files[0];
    if (!file) {
      setStatus(backupStatus, 'Pilih berkas cadangan terlebih dahulu.', 'error');
      importFile.focus();
      return;
    }
    const confirmed = ctx.confirm(
      'Impor cadangan akan MENGGANTI seluruh data di perangkat ini, termasuk semua profil, '
      + 'catatan, dan lampiran. Foto sumber tidak ikut dipulihkan. Lanjutkan?'
    );
    if (!confirmed) return;

    importButton.disabled = true;
    setStatus(backupStatus, 'Membaca dan memulihkan cadangan…', 'info');
    try {
      const content = await file.text();
      const result = await state.importBackup(content, { password: importPassword.value || null });
      const profileCount = Number(result?.meta?.profileCount);
      const countText = Number.isFinite(profileCount) ? ` ${profileCount} profil.` : '';
      importFile.value = '';
      importPassword.value = '';
      toast(ctx, 'Cadangan dipulihkan.', 'success');
      setStatus(backupStatus, `Cadangan dipulihkan.${countText}`, 'success');
      await ctx.refresh();
    } catch (error) {
      const code = error?.code ? ` (${error.code})` : '';
      setStatus(
        backupStatus,
        `${error?.message || 'Cadangan gagal diimpor.'}${code}`,
        'error'
      );
      toast(ctx, error?.message || 'Cadangan gagal diimpor.', 'error');
    } finally {
      importButton.disabled = false;
    }
  });

  // ---------------------------------------------------------------------
  // Keamanan / kata sandi
  // ---------------------------------------------------------------------
  const securityForm = create('form', { id: 'security-form', class: 'card' });
  securityForm.appendChild(create('h2', {}, 'Kata sandi & enkripsi'));
  securityForm.appendChild(create('p', { class: 'warning-box', id: 'password-warning' },
    'Lupa kata sandi berarti data TIDAK dapat dipulihkan. Tidak ada akun atau layanan luar '
    + 'yang dapat mereset kata sandi. Bila kata sandi dipasang, vault disimpan sebagai ciphertext. '
    + 'Foto sumber yang sudah ada tidak dienkripsi ulang otomatis; foto baru akan dienkripsi. '
    + 'Menghapus kata sandi dapat membuat foto lama yang terenkripsi tidak dapat dibuka lagi.'));

  const passwordNew = create('input', {
    id: 'password-new',
    type: 'password',
    autocomplete: 'new-password'
  });
  const passwordConfirm = create('input', {
    id: 'password-confirm',
    type: 'password',
    autocomplete: 'new-password'
  });
  securityForm.appendChild(create('div', { class: 'grid' },
    field('Kata sandi baru', passwordNew, 'Disarankan minimal 8 karakter dan mudah Anda ingat.'),
    field('Ulangi kata sandi', passwordConfirm)
  ));

  const securityStatus = create('p', {
    id: 'security-status',
    class: 'status-message muted',
    role: 'status',
    'aria-live': 'polite'
  });
  const savePassword = create('button', {
    id: 'btn-save-password',
    type: 'submit',
    class: 'button button--primary'
  }, 'Pasang / ubah kata sandi');
  const removePassword = create('button', {
    id: 'btn-remove-password',
    type: 'button',
    class: 'button button--ghost'
  }, 'Hapus kata sandi');
  securityForm.appendChild(create('div', { class: 'actions' },
    savePassword,
    removePassword));
  securityForm.appendChild(securityStatus);

  const encrypted = typeof state.isEncrypted === 'function' ? state.isEncrypted() : false;
  removePassword.disabled = !encrypted;
  setStatus(
    securityStatus,
    encrypted
      ? 'Kata sandi aktif. Vault tersimpan terenkripsi di perangkat ini.'
      : 'Kata sandi belum dipasang. Data tersimpan tanpa enkripsi.',
    encrypted ? 'success' : 'info'
  );

  securityForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const value = passwordNew.value;
    const confirmValue = passwordConfirm.value;
    if (!value) {
      setStatus(securityStatus, 'Kata sandi baru wajib diisi.', 'error');
      passwordNew.focus();
      return;
    }
    if (value !== confirmValue) {
      setStatus(securityStatus, 'Konfirmasi kata sandi tidak sama.', 'error');
      passwordConfirm.focus();
      return;
    }

    savePassword.disabled = true;
    removePassword.disabled = true;
    setStatus(securityStatus, 'Menyimpan kata sandi dan mengenkripsi data…', 'info');
    try {
      await state.setPassword(value);
      passwordNew.value = '';
      passwordConfirm.value = '';
      setStatus(
        securityStatus,
        'Kata sandi dipasang. Vault dienkripsi; simpan kata sandi di tempat aman.',
        'success'
      );
      toast(ctx, 'Kata sandi dipasang.', 'success');
      await ctx.refresh();
    } catch (error) {
      const message = error?.code === 'KRIPTO_TIDAK_TERSEDIA'
        ? 'Peramban ini tidak mendukung enkripsi yang dibutuhkan. Data tidak diubah.'
        : (error?.message || 'Kata sandi gagal dipasang.');
      setStatus(securityStatus, message, 'error');
      toast(ctx, message, 'error');
      removePassword.disabled = !(typeof state.isEncrypted === 'function' && state.isEncrypted());
    } finally {
      savePassword.disabled = false;
    }
  });

  removePassword.addEventListener('click', async () => {
    const confirmed = ctx.confirm(
      'Hapus kata sandi? Vault akan disimpan tanpa enkripsi. Foto sumber yang sudah '
      + 'terenkripsi mungkin tidak dapat dibuka lagi setelah kunci dihapus. Lanjutkan?'
    );
    if (!confirmed) return;
    removePassword.disabled = true;
    savePassword.disabled = true;
    setStatus(securityStatus, 'Menghapus kata sandi…', 'info');
    try {
      await state.removePassword();
      setStatus(securityStatus, 'Kata sandi dihapus. Data kini tersimpan tanpa enkripsi.', 'success');
      toast(ctx, 'Kata sandi dihapus.', 'success');
      await ctx.refresh();
    } catch (error) {
      setStatus(securityStatus, error?.message || 'Kata sandi gagal dihapus.', 'error');
      toast(ctx, error?.message || 'Kata sandi gagal dihapus.', 'error');
      removePassword.disabled = false;
      savePassword.disabled = false;
    }
  });

  screen.appendChild(securityForm);

  // ---------------------------------------------------------------------
  // Reset
  // ---------------------------------------------------------------------
  const resetCard = create('section', { class: 'card danger-card' });
  resetCard.appendChild(create('h2', {}, 'Hapus semua data'));
  resetCard.appendChild(create('p', { class: 'hint' },
    'Menghapus seluruh profil, kunjungan, obat, catatan minum, vital, lab, dan foto sumber '
    + 'dari perangkat ini. Ekspor cadangan terlebih dahulu; tindakan ini tidak dapat dibatalkan.'));
  const resetButton = create('button', {
    id: 'btn-reset',
    type: 'button',
    class: 'button button--danger danger'
  }, 'Hapus semua data');
  resetButton.addEventListener('click', async () => {
    const first = ctx.confirm(
      'Hapus SEMUA data di perangkat ini? Semua profil, catatan, dan foto akan hilang. '
      + 'Tindakan ini tidak dapat dibatalkan.'
    );
    if (!first) return;
    const second = ctx.confirm(
      'Konfirmasi terakhir: Anda yakin ingin menghapus seluruh data Rekam Medisku tanpa cadangan?'
    );
    if (!second) return;

    resetButton.disabled = true;
    try {
      await state.resetAll();
      toast(ctx, 'Semua data telah dihapus.', 'success');
      ctx.navigate('#/');
      await ctx.refresh();
    } catch (error) {
      toast(ctx, error?.message || 'Data gagal dihapus.', 'error');
      resetButton.disabled = false;
    }
  });
  resetCard.appendChild(create('div', { class: 'actions' }, resetButton));
  screen.appendChild(resetCard);

  screen.appendChild(create('p', { class: 'hint' }, DISCLAIMERS.app));
  root.appendChild(screen);

  // Informasi penyimpanan dimuat setelah shell tampil agar layar tidak kosong.
  await updateStorageInfo();

  return () => {
    for (const timer of timers) clearTimeout(timer);
    timers.clear();
  };
}

export default render;
